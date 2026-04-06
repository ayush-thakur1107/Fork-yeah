const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ✅ NEW IMPORTS (TOP)
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");

const app = express();

// ✅ FIX CORS (important for login)
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// ✅ SESSION
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// ✅ PASSPORT
app.use(passport.initialize());
app.use(passport.session());

// ✅ GOOGLE STRATEGY
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/callback"
},
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ✅ AUTH ROUTES (VERY IMPORTANT)
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:5173",
    failureRedirect: "/"
  })
);

// ✅ USER ROUTE
app.get("/user", (req, res) => {
  res.send(req.user || null);
});

// ================= SOCKET.IO =================

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

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

    roomsData[roomId].users[socket.id] = {
      username: username || "Anonymous"
    };

    socket.emit("load-state", {
      objects: Object.values(roomsData[roomId].objects),
      chats: roomsData[roomId].chats,
      users: roomsData[roomId].users
    });

    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      username
    });
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


app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});