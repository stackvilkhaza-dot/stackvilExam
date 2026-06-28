import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import api from '../../services/api';
import { io } from 'socket.io-client';

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

const SecureImage = ({ src, alt, className, onClick, title }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!src) return;
    let isMounted = true;
    let url = null;
    
    axios.get(src, { 
      responseType: 'blob',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
      .then(res => {
        if (isMounted) {
          url = URL.createObjectURL(res.data);
          setObjectUrl(url);
        }
      })
      .catch(err => console.error('Error fetching image', err));
      
    return () => {
      isMounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  if (!objectUrl) return <div className="w-full h-40 bg-gray-800 animate-pulse flex items-center justify-center border border-gray-700 rounded text-gray-500 text-xs mb-4">Loading reference...</div>;

  return <img src={objectUrl} alt={alt} className={className} onClick={onClick} title={title} />;
};

const CodingRound = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOutput, setPreviewOutput] = useState('');
  const [uiuxAnalysis, setUiuxAnalysis] = useState('');
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);
  const [socket, setSocket] = useState(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const peerConnection = useRef(null);

  const candidateInfo = JSON.parse(localStorage.getItem('candidateInfo'));

  useEffect(() => {
    if (!candidateInfo) return;

    let isMounted = true;
    let localStream = null;
    let newSocket = null;

    const setupCameraAndSocket = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!isMounted) {
          localStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(localStream);

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
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

      } catch (err) {
        setCameraError('Camera access is required. Please allow camera permissions.');
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
  }, [candidateInfo?.email, candidateInfo?.name]);

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

  useEffect(() => {
    if (!candidateInfo) {
      navigate('/');
      return;
    }

    const fetchChallenges = async () => {
      try {
        const res = await api.get(`/exam/my-challenges?email=${candidateInfo.email}`);
        setChallenges(res.data);
      } catch (err) {
        toast.error('Failed to load coding challenges');
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [navigate]);

  const currentChallenge = challenges[currentIndex];

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear your code?")) {
      setHtmlCode('');
      setCssCode('');
      setUiuxAnalysis('');
      setPreviewOutput('');
    }
  };

  const handleRun = () => {
    const srcDoc = `
      <html>
        <head>
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode}
        </body>
      </html>
    `;
    setPreviewOutput(srcDoc);
    toast.success('Preview updated');
  };

  const handleSubmit = async (isForced = false) => {
    if (!currentChallenge) return;
    if (isForced !== true && !window.confirm("Submit this challenge? You cannot modify it later.")) return;

    setIsSubmitting(true);
    try {
      await api.post('/exam/submit-challenge', {
        candidateEmail: candidateInfo.email,
        challengeId: currentChallenge._id,
        uiuxAnalysis: currentChallenge.challengeType === 'UIUXRedesign' ? uiuxAnalysis : '',
        submittedHtml: htmlCode,
        submittedCss: cssCode
      });
      
      toast.success('Challenge submitted!');
      
      if (currentIndex + 1 < challenges.length) {
        setCurrentIndex(currentIndex + 1);
        setHtmlCode('');
        setCssCode('');
        setUiuxAnalysis('');
        setPreviewOutput('');
        setActiveTab('html');
      } else {
        toast.success('All Web Design challenges completed!');
        navigate('/submitted');
      }
    } catch (err) {
      toast.error('Failed to submit challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Global Timer Setup
  useEffect(() => {
    if (challenges.length === 0) return;

    let endTime = parseInt(localStorage.getItem('examEndTime'));
    if (!endTime || isNaN(endTime)) {
      endTime = Date.now() + 3 * 60 * 60 * 1000;
      localStorage.setItem('examEndTime', endTime.toString());
    }

    let timerInterval;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        toast.error('Time is up! Auto-submitting exam...', { duration: 5000 });
        document.getElementById('auto-submit-btn')?.click();
      }
    };

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [challenges.length]);

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading challenges...</div>;

  if (cameraError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-center text-red-400 max-w-md p-6 border border-red-500 bg-gray-800 rounded-xl">
          <h2 className="text-2xl font-bold mb-4">Camera Required</h2>
          <p className="text-lg">{cameraError}</p>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-200">Initializing Camera...</h2>
          <p className="text-gray-400">Please click "Allow" on the camera permission prompt to start your coding round.</p>
          <div className="mt-8 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl mb-4">No Web Design challenges assigned to you.</h2>
        <button onClick={() => navigate('/submitted')} className="bg-blue-600 px-4 py-2 rounded">Finish Exam</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col relative">
      {/* Local Video Feed */}
      <div className="fixed bottom-6 left-6 w-48 h-32 bg-black rounded-lg shadow-2xl border-2 border-gray-700 overflow-hidden z-50">
        <VideoPlayer stream={stream} />
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 px-2 py-1 rounded text-white text-xs font-bold">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span>REC</span>
        </div>
      </div>
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-bold">Round 3: Web Designer Challenge {currentIndex + 1} of {challenges.length}</h1>
          <p className="text-sm text-gray-400">Candidate: {candidateInfo?.name}</p>
        </div>
        <div className="flex items-center space-x-6">
          <div className={`font-mono text-xl font-bold flex items-center space-x-2 bg-black/30 px-4 py-1.5 rounded-lg ${timeLeft !== null && timeLeft < 300 ? 'text-red-400 animate-pulse' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>{formatTime(timeLeft)}</span>
          </div>
          <div className="flex space-x-4">
            <button onClick={handleRun} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold shadow-md transition-colors">Run / Update Preview</button>
            <button onClick={handleReset} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium">Reset</button>
            <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-bold disabled:opacity-50 shadow-md">
              {isSubmitting ? 'Submitting...' : 'Submit Final Code'}
            </button>
            <button id="auto-submit-btn" onClick={() => handleSubmit(true)} className="hidden" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: Info & Reference */}
        <div className="w-1/3 flex flex-col border-r border-gray-700 bg-gray-800 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-blue-400">{currentChallenge.title}</h2>
              <span className="bg-blue-900 px-3 py-1 rounded-full text-xs font-bold">{currentChallenge.marks} Marks</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Requirements</h3>
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{currentChallenge.description}</p>
            </div>

            {currentChallenge.referenceImage && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                  {currentChallenge.challengeType === 'UIUXRedesign' ? 'Poor UI Design' : 'Reference Design'}
                </h3>
                <SecureImage 
                  src={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000'}${currentChallenge.referenceImage}`} 
                  alt="Reference Design" 
                  className="w-full h-auto rounded shadow-lg border border-gray-600 mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsFullscreenImage(true)}
                  title="Click to view full screen"
                />
              </div>
            )}

            {currentChallenge.challengeType === 'UIUXRedesign' && (
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-2">Section 1: UI/UX Analysis</h3>
                <p className="text-xs text-gray-400 mb-2">List all UI/UX issues you found in the design. Consider alignment, spacing, typography, contrast, hierarchy, and responsiveness.</p>
                <textarea
                  value={uiuxAnalysis}
                  onChange={(e) => setUiuxAnalysis(e.target.value)}
                  placeholder="List all UI/UX issues you found in the design..."
                  className="w-full h-48 bg-gray-900 text-gray-200 border border-gray-600 rounded p-3 focus:outline-none focus:border-blue-500"
                ></textarea>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mt-6 mb-2">Section 2: Redesign</h3>
                <p className="text-xs text-gray-400">Use the HTML and CSS editors to redesign the interface.</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle Pane: Editor */}
        <div className="w-1/3 flex flex-col border-r border-gray-700">
          <div className="flex bg-gray-800 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('html')}
              className={`flex-1 py-3 text-sm font-bold tracking-wider transition-colors ${
                activeTab === 'html' ? 'bg-gray-700 text-blue-400 border-t-2 border-blue-400' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              HTML
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`flex-1 py-3 text-sm font-bold tracking-wider transition-colors border-l border-gray-700 ${
                activeTab === 'css' ? 'bg-gray-700 text-pink-400 border-t-2 border-pink-400' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              CSS
            </button>
          </div>
          
          <div className="flex-1">
            <Editor
              height="100%"
              theme="vs-dark"
              language={activeTab}
              value={activeTab === 'html' ? htmlCode : cssCode}
              onChange={val => activeTab === 'html' ? setHtmlCode(val) : setCssCode(val)}
              options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
            />
          </div>
        </div>

        {/* Right Pane: Live Preview */}
        <div className="w-1/3 flex flex-col bg-white">
          <div className="bg-gray-200 px-4 py-2 border-b border-gray-300 flex justify-between items-center shadow-sm z-10">
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Live Output
            </span>
          </div>
          <div className="flex-1 relative">
            {previewOutput ? (
              <iframe
                srcDoc={previewOutput}
                title="Live Preview"
                sandbox="allow-scripts"
                className="w-full h-full border-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 flex-col">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p>Click "Run / Update Preview" to see your design</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Full Screen Image Modal */}
      {isFullscreenImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 cursor-pointer p-4"
          onClick={() => setIsFullscreenImage(false)}
        >
          <SecureImage 
            src={`${import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000'}${currentChallenge.referenceImage}`} 
            alt="Full Screen Reference" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded"
          />
          <button 
            className="absolute top-6 right-8 text-white hover:text-gray-300 text-4xl font-bold"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreenImage(false);
            }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default CodingRound;
