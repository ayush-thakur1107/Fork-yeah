const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const roomsData = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    
    if (!roomsData[roomId]) {
      roomsData[roomId] = { objects: {}, chats: [], users: {} };
    }
    roomsData[roomId].users[socket.id] = { username: username || "Anonymous" };
    
    socket.emit("load-state", {
      objects: Object.values(roomsData[roomId].objects),
      chats: roomsData[roomId].chats,
      users: roomsData[roomId].users
    });
    
    socket.to(roomId).emit("user-joined", { socketId: socket.id, username });
  });

  socket.on("object-add", ({ roomId, obj }) => {
    if (roomsData[roomId]) roomsData[roomId].objects[obj.id] = obj;
    socket.to(roomId).emit("object-add", obj);
  });
  
  socket.on("object-modify", ({ roomId, obj }) => {
    if (roomsData[roomId]) roomsData[roomId].objects[obj.id] = obj;
    socket.to(roomId).emit("object-modify", obj);
  });
  
  socket.on("object-remove", ({ roomId, id }) => {
    if (roomsData[roomId]) delete roomsData[roomId].objects[id];
    socket.to(roomId).emit("object-remove", id);
  });

  socket.on("clear", (roomId) => {
    if (roomsData[roomId]) roomsData[roomId].objects = {};
    socket.to(roomId).emit("clear");
  });

  socket.on("chat-message", ({ roomId, message }) => {
    if (roomsData[roomId]) roomsData[roomId].chats.push(message);
    socket.to(roomId).emit("chat-message", message);
  });

  socket.on("voice-status", ({ roomId, isSpeaking }) => {
    socket.to(roomId).emit("voice-status", { socketId: socket.id, isSpeaking, username: socket.username });
  });

  socket.on("voice-cc", ({ roomId, text }) => {
    socket.to(roomId).emit("voice-cc", { socketId: socket.id, username: socket.username, text });
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
server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
