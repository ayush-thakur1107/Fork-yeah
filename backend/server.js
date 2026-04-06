const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// ✅ FIXED CORS (OPEN FOR HACKATHON)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// =======================
// ✅ MongoDB
// =======================
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/livecollab";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🟢 MongoDB Connected"))
  .catch(err => console.error("🔴 MongoDB Error:", err));

// =======================
// ✅ Schemas
// =======================
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, required: true, unique: true }
}));

const Room = mongoose.model("Room", new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  elements: { type: Array, default: [] }
}));

// =======================
// ✅ LOGIN ROUTE
// =======================
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

    return res.json({
      username: user.username,
      displayName: user.username
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =======================
// ✅ ROOM ROUTE
// =======================
app.post("/room", async (req, res) => {
  try {
    const roomId = req.body.roomId || "room-" + Math.random().toString(36).slice(2, 8);

    let room = await Room.findOne({ roomId });

    if (!room) {
      room = await Room.create({ roomId, elements: [] });
    }

    res.json({ roomId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Room error" });
  }
});

// =======================
// ✅ SOCKET.IO
// =======================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const roomsData = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", async ({ roomId, username }) => {
    socket.join(roomId);

    if (!roomsData[roomId]) {
      let dbRoom = await Room.findOne({ roomId });

      if (!dbRoom) {
        dbRoom = await Room.create({ roomId, elements: [] });
      }

      const map = {};
      dbRoom.elements.forEach(el => map[el.id] = el);

      roomsData[roomId] = {
        objects: map,
        users: {},
        chats: []
      };
    }

    roomsData[roomId].users[socket.id] = { username };

    socket.emit("load-state", {
      objects: Object.values(roomsData[roomId].objects),
      users: roomsData[roomId].users,
      chats: roomsData[roomId].chats
    });

    socket.to(roomId).emit("user-joined", { socketId: socket.id, username });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// =======================
// ✅ SERVER START (FIXED FOR RENDER)
// =======================
const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});