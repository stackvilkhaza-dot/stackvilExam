import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

import adminRoutes from './routes/adminRoutes.js';
import examRoutes from './routes/examRoutes.js';

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/exam', examRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

import http from 'http';
import { Server } from 'socket.io';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let admins = [];
let candidates = {}; // map socketId to candidate info

io.on('connection', (socket) => {
  // Admin connects
  socket.on('join-admin', () => {
    if (!admins.includes(socket.id)) {
      admins.push(socket.id);
    }
    // Send currently online candidates to the newly joined admin
    socket.emit('current-candidates', Object.values(candidates));
  });

  // Candidate connects and camera is ready
  socket.on('candidate-ready', (candidateInfo) => {
    candidates[socket.id] = { ...candidateInfo, socketId: socket.id };
    // Notify all admins that a candidate is ready
    admins.forEach(adminId => {
      io.to(adminId).emit('candidate-online', candidates[socket.id]);
    });
  });

  // WebRTC Signaling
  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  socket.on('disconnect', () => {
    admins = admins.filter(id => id !== socket.id);
    if (candidates[socket.id]) {
      const email = candidates[socket.id].email;
      delete candidates[socket.id];
      admins.forEach(adminId => {
        io.to(adminId).emit('candidate-offline', socket.id);
      });
    }
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
