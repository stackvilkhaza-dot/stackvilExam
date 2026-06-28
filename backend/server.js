import './polyfill.js';
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

// Strip Vercel route prefix if present
app.use((req, res, next) => {
    if (req.url.startsWith('/_/backend')) {
        req.url = req.url.replace('/_/backend', '');
    }
    next();
});

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/exam', examRoutes);

// Serve Frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
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

const handleSocketConnection = (socket) => {
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
      // Broadcast to both namespaces if necessary, but io.to works across namespaces if we track socket IDs correctly?
      // Actually, io.to(socketId) works globally if we use the same server instance, but namespaces isolate rooms.
      // We will just use io.emit for simplicity if needed, or io.of('/').to(adminId)
      io.to(adminId).emit('candidate-online', candidates[socket.id]);
      io.of('/_/backend').to(adminId).emit('candidate-online', candidates[socket.id]);
    });
  });

  // WebRTC Signaling
  socket.on('tab-switched', (info) => {
    admins.forEach(adminId => {
      io.to(adminId).emit('candidate-tab-switched', info);
      io.of('/_/backend').to(adminId).emit('candidate-tab-switched', info);
    });
  });

  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
    io.of('/_/backend').to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
    io.of('/_/backend').to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
    io.of('/_/backend').to(targetSocketId).emit('webrtc-ice-candidate', {
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
        io.of('/_/backend').to(adminId).emit('candidate-offline', socket.id);
      });
    }
  });
};

io.on('connection', handleSocketConnection);
io.of('/_/backend').on('connection', handleSocketConnection);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
