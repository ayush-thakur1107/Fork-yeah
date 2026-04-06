const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();

// ✅ MIDDLEWARE & CORS
app.use(express.json());
app.use(cors({
  origin: ["https://fork-yeah-three.vercel.app", "http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ====================================================================
// ✅ MONGODB CONNECTION
// ====================================================================
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/livecollab";
mongoose.connect(MONGO_URI)
  .then(() => console.log("🟢 Successfully connected to MongoDB!"))
  .catch((err) => console.error("🔴 MongoDB Connection Error:", err));

// Database Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});
const User = mongoose.model("User", userSchema);

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  elements: { type: Array, default: [] }
});
const Room = mongoose.model("Room", roomSchema);

// ====================================================================
// ✅ CUSTOM AUTH / LOGIN ROUTE
// ====================================================================

app.post("/api/login", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    // Check if user exists, if not, create them!
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username });
    }
    
    // Send the user back to the frontend
    res.json({ displayName: user.username, ...user.toObject() });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Fallback user route
app.get("/user", (req, res) => {
  res.json(null);
});

// ====================================================================
// ✅ ROOM CREATION ROUTE
// ====================================================================

app.post("/room", async (req, res) => {
  try {
    // Generate a new roomId if not provided
    const roomId = req.body.roomId || 'room-' + Math.random().toString(36).substring(2, 10);
    
    let roomDoc = await Room.findOne({ roomId });
    if (!roomDoc) {
      roomDoc = await Room.create({ roomId, elements: [] });
    }
    
    res.json({ roomId: roomDoc.roomId });
  } catch (err) {
    console.error("Create Room Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================================================================
// ✅ PERSISTENT SOCKET.IO LOGIC
// ====================================================================

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://fork-yeah-three.vercel.app", "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// We keep a fast in-memory copy, but save it to MongoDB in the background!
const roomsData = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", async ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    // 1. If we don't have the room in memory, check the Database!
    if (!roomsData[roomId]) {
      let dbRoom = await Room.findOne({ roomId });
      
      // 2. If it doesn't exist in the DB either, create a blank one.
      if (!dbRoom) {
        dbRoom = await Room.create({ roomId, elements: [] });
      }

      // 3. Load DB data into our fast memory cache
      const objectsMap = {};
      dbRoom.elements.forEach(el => objectsMap[el.id] = el);
      roomsData[roomId] = { objects: objectsMap, chats: [], users: {} };
    }

    roomsData[roomId].users[socket.id] = {
      username: username || "Anonymous"
    };

    // Send the loaded state to the user who just joined
    socket.emit("load-state", {
      objects: Object.values(roomsData[roomId].objects),
      chats: roomsData[roomId].chats,
      users: roomsData[roomId].users
    });

    socket.to(roomId).emit("user-joined", { socketId: socket.id, username });
  });

  socket.on("request-board-state", (roomId) => {
    if (roomsData[roomId]) {
      socket.emit("load-state", {
        objects: Object.values(roomsData[roomId].objects),
        chats: roomsData[roomId].chats,
        users: roomsData[roomId].users
      });
    }
  });

  socket.on("draw-update", ({ roomId, element }) => {
    if (roomsData[roomId]) {
      roomsData[roomId].objects[element.id] = element;
      socket.to(roomId).emit("receive-update", element);
      
      // Save backup to MongoDB in the background
      Room.updateOne({ roomId }, { elements: Object.values(roomsData[roomId].objects) }).exec();
    }
  });

  socket.on("object-remove", ({ roomId, id }) => {
    if (roomsData[roomId]) {
      delete roomsData[roomId].objects[id];
      socket.to(roomId).emit("object-remove", id);
      
      Room.updateOne({ roomId }, { elements: Object.values(roomsData[roomId].objects) }).exec();
    }
  });

  socket.on("clear", (roomId) => {
    if (roomsData[roomId]) {
      roomsData[roomId].objects = {};
      socket.to(roomId).emit("clear");
      
      Room.updateOne({ roomId }, { elements: [] }).exec();
    }
  });

  socket.on("state-replace", ({ roomId, elements }) => {
    if (roomsData[roomId]) {
      roomsData[roomId].objects = {};
      elements.forEach(el => {
        roomsData[roomId].objects[el.id] = el;
      });
      socket.to(roomId).emit("state-replace", elements);
      
      Room.updateOne({ roomId }, { elements: elements }).exec();
    }
  });

  socket.on("chat-message", ({ roomId, message }) => {
    if (roomsData[roomId]) roomsData[roomId].chats.push(message);
    socket.to(roomId).emit("chat-message", message);
  });

  socket.on("voice-status", ({ roomId, isSpeaking }) => {
    socket.to(roomId).emit("voice-status", {
      socketId: socket.id,
      isSpeaking,
      username: socket.username
    });
  });

  socket.on("voice-cc", ({ roomId, text }) => {
    socket.to(roomId).emit("voice-cc", {
      socketId: socket.id,
      username: socket.username,
      text
    });
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
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});