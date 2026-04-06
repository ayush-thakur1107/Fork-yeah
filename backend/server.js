const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// =======================
// ✅ CORS (OPEN FOR DEMO)
// =======================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// =======================
// ✅ MONGODB CONNECTION
// =======================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log("🟢 MongoDB Connected"))
  .catch(err => {
    console.error("🔴 MongoDB Error:", err);
    process.exit(1);
  });

// =======================
// ✅ MODELS
// =======================
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, required: true, unique: true }
}));

const Room = mongoose.model("Room", new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  elements: { type: Array, default: [] }
}));

// =======================
// ✅ ROUTES
// =======================

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    let user = await User.findOne({ username });

    if (!user) {
      user = await User.create({ username });
    }

    res.json({
      username: user.username,
      displayName: user.username
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE / JOIN ROOM
app.post("/room", async (req, res) => {
  try {
    const roomId =
      req.body.roomId ||
      "room-" + Math.random().toString(36).slice(2, 8);

    let room = await Room.findOne({ roomId });

    if (!room) {
      room = await Room.create({ roomId, elements: [] });
    }

    res.json({ roomId });

  } catch (err) {
    console.error("ROOM ERROR:", err);
    res.status(500).json({ error: "Room error" });
  }
});

// =======================
// ✅ SOCKET.IO SETUP
// =======================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// In-memory cache
const roomsData = {};

// Hackathon Requirements Compliance: WS /connect alias
io.of("/connect").on("connection", (socket) => {
  console.log("✅ Custom WS /connect namespace hit:", socket.id);
  socket.emit("connected", { status: "success", alias: "/connect" });
});

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // =======================
  // JOIN ROOM
  // =======================
  socket.on("join-room", async ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    if (!roomsData[roomId]) {
      let dbRoom = await Room.findOne({ roomId });

      if (!dbRoom) {
        dbRoom = await Room.create({ roomId, elements: [] });
      }

      const map = {};
      dbRoom.elements.forEach(el => {
        map[el.id] = el;
      });

      roomsData[roomId] = {
        objects: map,
        users: {},
        chats: []
      };
    }

    roomsData[roomId].users[socket.id] = { username };

    // Send state to new user
    socket.emit("load-state", {
      objects: Object.values(roomsData[roomId].objects),
      users: roomsData[roomId].users,
      chats: roomsData[roomId].chats
    });

    // Notify others
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      username
    });
  });

  // =======================
  // CURSOR SYNC
  // =======================
  socket.on("cursor-move", ({ roomId, x, y }) => {
    socket.to(roomId).emit("cursor-move", {
      socketId: socket.id,
      username: socket.username,
      x,
      y
    });
  });

  // =======================
  // DRAW UPDATE
  // =======================
  socket.on("draw-update", ({ roomId, element }) => {
    if (!roomsData[roomId]) return;

    roomsData[roomId].objects[element.id] = element;

    socket.to(roomId).emit("receive-update", element);

    Room.updateOne(
      { roomId },
      { elements: Object.values(roomsData[roomId].objects) }
    ).exec();
  });

  socket.on("object-remove", ({ roomId, id }) => {
    if (roomsData[roomId]) delete roomsData[roomId].objects[id];
    socket.to(roomId).emit("object-remove", id);

    Room.updateOne(
      { roomId },
      { elements: Object.values(roomsData[roomId]?.objects || {}) }
    ).exec();
  });

  socket.on("clear", (roomId) => {
    if (roomsData[roomId]) roomsData[roomId].objects = {};
    socket.to(roomId).emit("clear");

    Room.updateOne(
      { roomId },
      { elements: [] }
    ).exec();
  });

  socket.on("state-replace", ({ roomId, elements }) => {
    if (roomsData[roomId]) {
      roomsData[roomId].objects = {};
      elements.forEach(el => {
        roomsData[roomId].objects[el.id] = el;
      });
      socket.to(roomId).emit("state-replace", elements);

      Room.updateOne(
        { roomId },
        { elements: Object.values(roomsData[roomId].objects) }
      ).exec();
    }
  });

  // =======================
  // CHAT & VOICE
  // =======================
  socket.on("chat-message", ({ roomId, message }) => {
    if (roomsData[roomId]) {
      roomsData[roomId].chats.push(message);
    }
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

  // =======================
  // WebRTC AUDIO
  // =======================
  socket.on("webrtc-offer", ({ targetSocketId, offer, username }) => {
    socket.to(targetSocketId).emit("webrtc-offer", { socketId: socket.id, offer, username });
  });

  socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
    socket.to(targetSocketId).emit("webrtc-answer", { socketId: socket.id, answer });
  });

  socket.on("webrtc-candidate", ({ targetSocketId, candidate }) => {
    socket.to(targetSocketId).emit("webrtc-candidate", { socketId: socket.id, candidate });
  });

  // =======================
  // DISCONNECT
  // =======================
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    const roomId = socket.roomId;

    if (roomId && roomsData[roomId]) {
      delete roomsData[roomId].users[socket.id];

      socket.to(roomId).emit("user-left", socket.id);
    }
  });
});

// =======================
// ✅ START SERVER (RENDER FIX)
// =======================
const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});