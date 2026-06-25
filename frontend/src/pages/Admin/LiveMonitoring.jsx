import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const LiveMonitoring = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [socket, setSocket] = useState(null);
  
  const peerConnection = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
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
        toast.success(`${candidate.name} has started the exam and camera is on!`);
        return [...prev, candidate];
      });
    });

    newSocket.on('candidate-offline', (socketId) => {
      setCandidates(prev => prev.filter(c => c.socketId !== socketId));
      if (selectedCandidate?.socketId === socketId) {
        toast.error('Candidate disconnected.');
        setSelectedCandidate(null);
        if (videoRef.current) videoRef.current.srcObject = null;
        if (peerConnection.current) {
          peerConnection.current.close();
          peerConnection.current = null;
        }
      }
    });

    newSocket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      if (peerConnection.current && selectedCandidate?.socketId === senderSocketId) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error("Error setting remote description", e);
        }
      }
    });

    newSocket.on('webrtc-ice-candidate', async ({ senderSocketId, candidate }) => {
      if (peerConnection.current && selectedCandidate?.socketId === senderSocketId) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    });

    return () => newSocket.close();
  }, [selectedCandidate]);

  const monitorCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const pc = new RTCPeerConnection({
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
        videoRef.current.play().catch(e => console.error("Error playing admin video:", e));
      }
    };

    // Add a transceiver to receive video (since we only receive, not send)
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
      toast.error('Failed to establish connection');
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Live Camera Monitoring</h1>
      <p className="text-gray-600">Monitor candidates who are currently taking the exam.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden col-span-1">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-800">Online Candidates ({candidates.length})</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="p-6 text-gray-500 text-center text-sm">No candidates are currently taking the exam with camera on.</p>
            ) : (
              candidates.map(candidate => (
                <div 
                  key={candidate.socketId} 
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${selectedCandidate?.socketId === candidate.socketId ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => monitorCandidate(candidate)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{candidate.name}</p>
                    <p className="text-xs text-gray-500">{candidate.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-medium text-green-600">Live</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Video Player */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden col-span-2">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">
              {selectedCandidate ? `Monitoring: ${selectedCandidate.name}` : 'Select a candidate to monitor'}
            </h2>
          </div>
          <div className="p-6 flex flex-col items-center justify-center bg-gray-900 min-h-[400px] relative">
            {!selectedCandidate ? (
              <div className="text-gray-400 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <p>Select a candidate from the list to view their live camera feed.</p>
              </div>
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full max-w-2xl rounded-lg shadow-lg border border-gray-700 bg-black"
                style={{ maxHeight: '500px' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
