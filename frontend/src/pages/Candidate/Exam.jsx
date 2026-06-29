import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { io } from 'socket.io-client';

const shuffleArray = (array) => {
  let newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};
const VideoPlayer = ({ stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      onLoadedMetadata={(e) => e.target.play().catch(console.error)}
      style={{ transform: 'scaleX(-1)' }}
      className="w-full h-full object-cover"
    />
  );
};

const Exam = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitingForExam, setWaitingForExam] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasCoding, setHasCoding] = useState(false);

  // Camera state
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [socket, setSocket] = useState(null);
  const videoRef = useRef(null);
  const peerConnection = useRef(null);

  // Load candidate info
  const candidateInfo = JSON.parse(localStorage.getItem('candidateInfo'));

  const handleSubmit = useCallback(async (isForced = false) => {
    if (isSubmitting) return;

    if (isForced !== true) {
      const unansweredIndex = questions.findIndex(q => !answers[q._id]);
      if (unansweredIndex !== -1) {
        toast.error(`Please answer all questions before submitting.`);
        return;
      }
    }

    setIsSubmitting(true);

    const formattedAnswers = Object.keys(answers).map(questionId => ({
      questionId,
      selectedAnswer: answers[questionId]
    }));

    try {
      await api.post('/exam/submit', {
        candidateName: candidateInfo.name,
        candidateEmail: candidateInfo.email,
        answers: formattedAnswers
      });
      
      localStorage.removeItem('examProgress');
      // Keep candidateInfo for coding round
      
      // Exit fullscreen (Optional: might want to stay in fullscreen for coding round)
      // Since coding round is still part of the exam, we shouldn't exit fullscreen yet.
      
      if (hasCoding) {
        navigate('/coding-round');
      } else {
        localStorage.removeItem('examEndTime');
        localStorage.removeItem('candidateInfo');
        navigate('/submitted');
      }
    } catch (error) {
      toast.error('Failed to submit exam. Please try again.');
      setIsSubmitting(false);
    }
  }, [answers, candidateInfo, isSubmitting, navigate, questions, hasCoding]);

  useEffect(() => {
    if (!candidateInfo) {
      navigate('/');
      return;
    }

    const fetchQuestions = async () => {
      try {
        const { data } = await api.get(`/exam/questions?email=${encodeURIComponent(candidateInfo.email)}`);
        // Try to load saved progress
        const savedProgress = localStorage.getItem('examProgress');
        if (savedProgress) {
          const { savedAnswers, savedTime, savedQuestions, savedRound } = JSON.parse(savedProgress);
          
          // Check if cached questions are invalid (empty options, old string format, or missing round field)
          const isInvalidCache = !savedQuestions || savedQuestions.length === 0 || 
                                 !savedQuestions[0].options || savedQuestions[0].options.length === 0 || 
                                 typeof savedQuestions[0].options[0] !== 'object' ||
                                 savedQuestions[0].round === undefined;
          
          if (!isInvalidCache) {
            setAnswers(savedAnswers || {});
            setQuestions(savedQuestions);
            setCurrentRound(savedRound || 1);
            setLoading(false);
            setWaitingForExam(false);

            // Check coding challenges even for cache hit
            try {
              const checkRes = await api.get(`/exam/my-challenges?email=${encodeURIComponent(candidateInfo.email)}`);
              if (checkRes.data && checkRes.data.length > 0) {
                setHasCoding(true);
              }
            } catch (e) {}
            return;
          } else if (isInvalidCache) {
            localStorage.removeItem('examProgress');
          }
        }
        
        const randomizedQuestions = shuffleArray(data).map(q => ({
          ...q,
          options: shuffleArray(q.options)
        }));
        
        setQuestions(randomizedQuestions);
        setLoading(false);
        setWaitingForExam(false);

        // Fetch coding challenges to check if candidate has Round 3
        try {
          const checkRes = await api.get(`/exam/my-challenges?email=${encodeURIComponent(candidateInfo.email)}`);
          if (checkRes.data && checkRes.data.length > 0) {
            setHasCoding(true);
          }
        } catch (e) {}
      } catch (error) {
        if (error.response && error.response.status === 403) {
           if (error.response.data.message === 'NO EXAM IS CURRENTLY ASSIGNED.') {
               try {
                 const checkRes = await api.get(`/exam/my-challenges?email=${encodeURIComponent(candidateInfo.email)}`);
                 if (checkRes.data && checkRes.data.length > 0) {
                   navigate('/coding-round');
                   return;
                 }
               } catch (e) {
                 // proceed to show error
               }
           }
           setServerMessage(error.response.data.message);
           setWaitingForExam(true);
           setLoading(false);
        } else {
           toast.error('Failed to load questions.');
           setLoading(false);
        }
      }
    };

    fetchQuestions();
    
    // Set up polling
    const interval = setInterval(() => {
      if (waitingForExam || questions.length === 0) {
        fetchQuestions();
      }
    }, 5000);

    // Enter fullscreen only when exam starts
    if (!waitingForExam && questions.length > 0) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => console.log(err));
      }
    }

    return () => clearInterval(interval);
  }, [navigate, waitingForExam, questions.length]);

  // Save progress
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem('examProgress', JSON.stringify({
        savedAnswers: answers,
        savedQuestions: questions,
        savedRound: currentRound
      }));
    }
  }, [answers, questions.length, currentRound]);

  // Anti-cheat: visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        toast.error('Warning: Tab switching is not allowed!', { duration: 5000 });
        if (socket && candidateInfo) {
          socket.emit('tab-switched', {
            name: candidateInfo.name,
            email: candidateInfo.email,
            time: new Date().toLocaleTimeString()
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [socket, candidateInfo]);

  // Anti-cheat: prevent copy/paste/context menu
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('paste', preventDefault);
    };
  }, []);

  // Anti-cheat: warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Global Timer Setup
  useEffect(() => {
    if (waitingForExam || questions.length === 0) return;

    let endTime = parseInt(localStorage.getItem('examEndTime'));
    if (!endTime || isNaN(endTime)) {
      endTime = Date.now() + 3 * 60 * 60 * 1000; // 3 hours from now
      localStorage.setItem('examEndTime', endTime.toString());
    }

    let timerInterval;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        toast.error('Time is up! Auto-submitting exam...', { duration: 5000 });
        handleSubmit(true);
      }
    };

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [waitingForExam, questions.length, handleSubmit]);

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Camera & WebRTC Setup

  useEffect(() => {
    if (!candidateInfo || waitingForExam) return;

    let isMounted = true;
    let localStream = null;
    let newSocket = null;

    const setupCameraAndSocket = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!isMounted) {
          // If component unmounted while waiting for camera
          localStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(localStream);

        const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        newSocket = io(socketUrl, { extraHeaders: { 'ngrok-skip-browser-warning': 'true' } });
        setSocket(newSocket);

        const sendReady = () => {
          newSocket.emit('candidate-ready', {
            name: candidateInfo.name,
            email: candidateInfo.email
          });
        };

        newSocket.on('connect', sendReady);
        if (newSocket.connected) {
          sendReady();
        }

        newSocket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          peerConnection.current = pc;

          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              newSocket.emit('webrtc-ice-candidate', {
                targetSocketId: senderSocketId,
                candidate: event.candidate
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          newSocket.emit('webrtc-answer', {
            targetSocketId: senderSocketId,
            answer
          });
        });

        newSocket.on('webrtc-ice-candidate', async ({ candidate }) => {
          if (peerConnection.current) {
            try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error("Error adding ice candidate", e);
            }
          }
        });

        newSocket.on('force-logout', () => {
          localStorage.removeItem('candidateInfo');
          localStorage.removeItem('examEndTime');
          localStorage.removeItem('examProgress');
          if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
          }
          newSocket.close();
          toast.error('You have been logged out by the Administrator.', { duration: 10000 });
          navigate('/');
        });

      } catch (err) {
        setCameraError('Camera access is required to start the exam. Please allow camera permissions in your browser.');
        toast.error('Camera access denied.');
      }
    };

    setupCameraAndSocket();

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (newSocket) newSocket.close();
      if (peerConnection.current) peerConnection.current.close();
    };
  }, [candidateInfo?.email, candidateInfo?.name, waitingForExam]);





  const handleOptionSelect = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };


  const handleNextRound = () => {
    const currentQuestions = questions.filter(q => q.round === currentRound);
    const unansweredIndex = currentQuestions.findIndex(q => !answers[q._id]);
    
    if (unansweredIndex !== -1) {
      toast.error(`Please answer Question ${unansweredIndex + 1} before proceeding.`);
      const element = document.getElementById(`question-${currentQuestions[unansweredIndex]._id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    if (currentRound === 1) {
      const hasRound2 = questions.some(q => q.round === 2);
      if (hasRound2) {
        if (window.confirm("Ready to proceed to Round 2 (Technical)? You cannot return to change your Round 1 answers.")) {
          setCurrentRound(2);
          window.scrollTo(0, 0);
        }
      } else {
        if (window.confirm("Ready to proceed to Round 3 (Coding)? You cannot return to change your answers.")) {
          handleSubmit(false);
        }
      }
    } else {
      if (window.confirm("Ready to proceed to Round 3 (Coding)? You cannot return to change your answers.")) {
        handleSubmit(false);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (waitingForExam) {
    const isCompleted = serverMessage.toLowerCase().includes('submitted');
    return (
      <div className="flex justify-center items-center min-h-screen bg-white p-4">
        <div className="text-center max-w-lg">
          {isCompleted ? (
            <div className="bg-blue-50 text-blue-800 p-8 rounded-xl border border-blue-200">
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h2 className="text-2xl font-bold mb-2">Exam Submitted</h2>
              <p className="text-lg">{serverMessage}</p>
              <button 
                onClick={() => {
                  localStorage.removeItem('candidateInfo');
                  navigate('/');
                }}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-semibold text-gray-800 mb-4">{serverMessage || 'Exam is not scheduled yet'}</h2>
              <div className="mt-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="flex justify-center items-center min-h-screen text-xl bg-white">No active exam or questions available.</div>;
  }

  if (cameraError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="text-center text-red-600 max-w-md p-6 border border-red-200 bg-red-50 rounded-xl">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <h2 className="text-2xl font-bold mb-4">Camera Required</h2>
          <p className="text-lg">{cameraError}</p>
        </div>
      </div>
    );
  }

  if (!stream && !waitingForExam) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Initializing Camera...</h2>
          <p className="text-gray-600">Please click "Allow" on the camera permission prompt to start your exam.</p>
          <div className="mt-8 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall progress based on answered questions
  const currentQuestions = questions.filter(q => q.round === currentRound);
  const answeredCount = currentQuestions.filter(q => answers[q._id]).length;
  const progressPercentage = (answeredCount / currentQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 p-4 select-none pb-20 relative">
      {/* Local Video Feed */}
      <div className="fixed bottom-6 right-6 w-56 h-40 bg-black rounded-lg shadow-2xl border-4 border-gray-800 overflow-hidden z-50">
        <VideoPlayer stream={stream} />
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 px-2 py-1 rounded text-white text-xs font-bold">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span>REC</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600 p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow-md">
          <h1 className="text-xl font-bold">Stack Exam Portal - Round {currentRound}</h1>
          <div className="flex items-center space-x-6">
            <div className={`font-mono text-xl font-bold flex items-center space-x-2 bg-black/20 px-4 py-1.5 rounded-lg ${timeLeft !== null && timeLeft < 300 ? 'text-red-300 animate-pulse' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>{formatTime(timeLeft)}</span>
            </div>
            <span className="text-sm font-medium bg-black/20 px-3 py-1 rounded">Answered: {answeredCount}/{currentQuestions.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 h-2 sticky top-[68px] z-10">
          <div 
            className="bg-green-500 h-2 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Question List */}
        <div className="p-8 space-y-12">
          {currentQuestions.map((currentQuestion, idx) => (
            <div key={currentQuestion._id} id={`question-${currentQuestion._id}`} className="border-b pb-12 last:border-b-0 last:pb-0">
              <div className="mb-4 flex justify-between items-center text-gray-500 text-sm font-medium">
                <span>Question {idx + 1} of {currentQuestions.length}</span>
                <span>Marks: {currentQuestion?.marks || 1}</span>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                {currentQuestion?.question}
              </h2>

              <div className="space-y-3">
                {currentQuestion?.options.map((option, optIdx) => (
                  <label 
                    key={optIdx}
                    className={`flex items-center p-5 border rounded-xl cursor-pointer transition-all duration-200 ${
                      answers[currentQuestion._id] === option.label 
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion._id}`}
                      value={option.label}
                      checked={answers[currentQuestion._id] === option.label}
                      onChange={() => handleOptionSelect(currentQuestion._id, option.label)}
                      className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-4 text-gray-700 text-lg font-medium">
                      {option.label}.
                    </span>
                    <span className="ml-2 text-gray-700 text-lg">
                      {option.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Controls */}
        <div className="p-6 bg-gray-50 border-t flex justify-end items-center sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <button
            onClick={handleNextRound}
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-lg shadow-sm flex items-center space-x-2"
          >
            <span>{isSubmitting ? 'Saving...' : (currentRound === 1 && questions.some(q => q.round === 2) ? 'Next (Round 2)' : 'Submit & Proceed to Coding')}</span>
            {!isSubmitting && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Exam;
