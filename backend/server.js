const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Store room state: { actions: [], chats: [], users: { socketId: { username } } }
const roomsData = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a collaborative room
  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId; // save on socket for disconnect
    socket.username = username;
    
    // Initialize room if it doesn't exist
    if (!roomsData[roomId]) {
      roomsData[roomId] = { actions: [], chats: [], users: {} };
    }
    
    // Add user
    roomsData[roomId].users[socket.id] = { username: username || "Anonymous" };
    
    // Send existing state to the new user
    socket.emit("load-state", {
      actions: roomsData[roomId].actions,
      chats: roomsData[roomId].chats,
      users: roomsData[roomId].users
    });
    
    // Broadcast to room that someone joined
    socket.to(roomId).emit("user-joined", { socketId: socket.id, username });
  });

  // Action events (Drawings, Text, Shapes, Undo/Redo rewrites)
  socket.on("canvas-action", ({ roomId, action }) => {
    if (roomsData[roomId]) {
      if (action.type === 'clear') {
        roomsData[roomId].actions = [];
      } else if (action.type === 'undo-rewrite') {
        // Full array replacement on undo
        roomsData[roomId].actions = action.actions;
      } else {
        roomsData[roomId].actions.push(action);
      }
    }
    // Broadcast to everyone else
    socket.to(roomId).emit("canvas-action", action);
  });

  // Team Chat
  socket.on("chat-message", ({ roomId, message }) => {
    if (roomsData[roomId]) {
      roomsData[roomId].chats.push(message);
    }
    socket.to(roomId).emit("chat-message", message);
  });

  // ========== WebRTC Signaling for Voice Chat ==========
  socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
    socket.to(targetSocketId).emit("webrtc-offer", { senderId: socket.id, offer });
  });

  socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
    socket.to(targetSocketId).emit("webrtc-answer", { senderId: socket.id, answer });
  });

  socket.on("webrtc-ice-candidate", ({ targetSocketId, candidate }) => {
    socket.to(targetSocketId).emit("webrtc-ice-candidate", { senderId: socket.id, candidate });
  });

  socket.on("voice-status", ({ roomId, isSpeaking }) => {
    socket.to(roomId).emit("voice-status", { socketId: socket.id, isSpeaking });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = socket.roomId;
    if (roomId && roomsData[roomId]) {
      delete roomsData[roomId].users[socket.id];
      socket.to(roomId).emit("user-left", socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
app.get("/", (req, res) => res.send("LiveCollab Server is running."));

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
