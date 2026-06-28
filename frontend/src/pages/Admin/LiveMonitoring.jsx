import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const CandidateVideo = ({ candidate, socket }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    let pc;
    const initWebRTC = async () => {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnection.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            targetSocketId: candidate.socketId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
          targetSocketId: candidate.socketId,
          offer
        });
      } catch (e) {
        toast.error(`Failed to connect to ${candidate.name}`);
        console.error(e);
      }
    };

    initWebRTC();

    const handleAnswer = async ({ senderSocketId, answer }) => {
      if (senderSocketId === candidate.socketId && peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error("Error setting remote description", e);
        }
      }
    };

    const handleIceCandidate = async ({ senderSocketId, candidate: iceCandidate }) => {
      if (senderSocketId === candidate.socketId && peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(iceCandidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    };

    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      if (pc) {
        pc.close();
      }
      peerConnection.current = null;
    };
  }, [candidate, socket]);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700 flex flex-col group h-64">
      <div className="absolute top-0 left-0 w-full p-3 bg-gradient-to-b from-black/90 to-transparent z-10 flex justify-between items-start">
        <div>
          <p className="text-white font-semibold text-sm drop-shadow-md">{candidate.name}</p>
          <p className="text-gray-300 text-xs drop-shadow-md">{candidate.email}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-1.5 bg-black/40 px-2 py-0.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-white font-medium uppercase tracking-wider">Live</span>
          </div>
          <button 
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 bg-black/50 hover:bg-black/80 rounded p-1.5 transition-all opacity-0 group-hover:opacity-100"
            title="Toggle Fullscreen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
          </button>
        </div>
      </div>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="w-full h-full object-cover cursor-pointer"
        onClick={toggleFullscreen}
      />
    </div>
  );
};

const LiveMonitoring = () => {
  const [candidates, setCandidates] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketUrl = import.meta.env.MODE === 'production' ? '/' : 'http://localhost:5000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-admin');
    });

    newSocket.on('current-candidates', (onlineCandidates) => {
      setCandidates(onlineCandidates);
    });

    newSocket.on('candidate-online', (candidate) => {
      setCandidates(prev => {
        const exists = prev.find(c => c.socketId === candidate.socketId);
        if (exists) return prev;
        toast.success(`${candidate.name} is online with camera.`);
        return [...prev, candidate];
      });
    });

    newSocket.on('candidate-offline', (socketId) => {
      setCandidates(prev => {
        const candidate = prev.find(c => c.socketId === socketId);
        if (candidate) toast.error(`${candidate.name} disconnected.`);
        return prev.filter(c => c.socketId !== socketId);
      });
    });

    newSocket.on('candidate-tab-switched', (info) => {
      toast.error(`⚠️ ALERT: ${info.name} (${info.email}) switched tabs at ${info.time}!`, { duration: 8000 });
    });

    return () => newSocket.close();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Camera Monitoring</h1>
        <p className="text-gray-600">Monitor all online candidates simultaneously. Click on any video feed to view it in full screen.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800 flex items-center">
             Online Candidates
             <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
               {candidates.length}
             </span>
          </h2>
        </div>
        
        <div className="p-6 bg-gray-50/50 min-h-[400px]">
          {!socket ? (
             <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <p className="text-lg font-medium text-gray-500">No active candidates</p>
              <p className="text-sm">Candidates will appear here automatically when they start the exam.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {candidates.map(candidate => (
                <CandidateVideo 
                  key={candidate.socketId} 
                  candidate={candidate} 
                  socket={socket} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
