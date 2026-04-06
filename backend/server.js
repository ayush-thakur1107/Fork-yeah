const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ✅ NEW IMPORTS
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const session = require("express-session");

const app = express();

console.log("=== STARTUP KEY CHECK ===");
console.log("Google ID exists?", !!process.env.GOOGLE_CLIENT_ID);
console.log("GitHub ID exists?", !!process.env.GITHUB_CLIENT_ID);
console.log("=========================");

// ✅ FIX CORS (Updated to your live Vercel URL)
app.use(cors({
  origin: "https://fork-yeah-three.vercel.app",
  credentials: true
}));

// ✅ SESSION
app.use(session({
  secret: process.env.SESSION_SECRET || "super_secret_hackathon_fallback_key",
  resave: false,
  saveUninitialized: false
}));

// ✅ PASSPORT INITIALIZATION
app.use(passport.initialize());
app.use(passport.session());

// ✅ GOOGLE STRATEGY
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://fork-yeah-backend.onrender.com/auth/google/callback"
},
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

// ✅ GITHUB STRATEGY
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "https://fork-yeah-backend.onrender.com/auth/github/callback"
},
  (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));


// ====================================================================
// ✅ AUTH ROUTES (Redirecting back to Vercel upon success)
// ====================================================================

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "https://fork-yeah-three.vercel.app",
    failureRedirect: "https://fork-yeah-three.vercel.app"
  })
);

app.get("/auth/github",
  passport.authenticate("github", { scope: ['user:email'] })
);

app.get("/auth/github/callback",
  passport.authenticate("github", {
    successRedirect: "https://fork-yeah-three.vercel.app",
    failureRedirect: "https://fork-yeah-three.vercel.app"
  })
);

app.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect("https://fork-yeah-three.vercel.app");
  });
});

// ✅ USER ROUTE (For the frontend to check if someone is logged in)
app.get("/user", (req, res) => {
  res.send(req.user || null);
});


// ====================================================================
// ================= SOCKET.IO MULTIPLAYER LOGIC ======================
// ====================================================================

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://fork-yeah-three.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
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
    }
    socket.to(roomId).emit("receive-update", element);
  });

  socket.on("object-remove", ({ roomId, id }) => {
    if (roomsData[roomId]) delete roomsData[roomId].objects[id];
    socket.to(roomId).emit("object-remove", id);
  });

  socket.on("clear", (roomId) => {
    if (roomsData[roomId]) roomsData[roomId].objects = {};
    socket.to(roomId).emit("clear");
  });

  socket.on("state-replace", ({ roomId, elements }) => {
    if (roomsData[roomId]) {
      roomsData[roomId].objects = {};
      elements.forEach(el => {
        roomsData[roomId].objects[el.id] = el;
      });
      socket.to(roomId).emit("state-replace", elements);
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