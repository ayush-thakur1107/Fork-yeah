# 🚀 LiveCollab

LiveCollab is a lightweight, real-time collaborative whiteboard application designed for teams. It allows multiple users to join a shared room and draw simultaneously on a canvas, with all changes synchronized in real-time across all connected clients.

## ✨ Features

- **Real-time Synchronized Drawing:** Draw on a shared whiteboard with minimal latency.
- **Collaborative Sessions:** Multiple users can join and interact in the same room utilizing room-based connections.
- **Object Manipulation:** Select, move, modify, or delete drawn objects dynamically.
- **Team Chat:** Built-in chat feature allows users in the same room to communicate without leaving the board.
- **Canvas State Persistence:** The server maintains the room's current state (drawings and chat) in memory so late-joiners instantly see the current board.
- **Modern UI:** Built with React, Tailwind CSS, and Lucide icons for a sleek, visually appealing aesthetic.

## 🛠️ Tech Stack

**Frontend:**
- [React](https://react.dev/) (bootstrapped with [Vite](https://vitejs.dev/))
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Fabric.js](http://fabricjs.com/) for powerful HTML5 Canvas manipulation
- [Socket.IO Client](https://socket.io/) for WebSockets

**Backend:**
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/) for real-time, bi-directional communication
- [CORS](https://expressjs.com/en/resources/middleware/cors.html)

## 📦 Project Structure

```text
Fork-yeah/
├── backend/       # Node.js + Socket.IO server
│   ├── server.js  # Main server entry point handling WebSocket logic
│   └── package.json
├── frontend/      # React + Vite application
│   ├── src/       # Source code (components, hooks, etc.)
│   ├── public/    # Static assets
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── webDev-1.md    # Original project specification documentation
```

## 🚀 Getting Started

Follow these instructions to get a local copy of LiveCollab up and running.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (comes with Node.js)

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Fork-yeah
```

### 2. Setup the Backend Server

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
npm install
node server.js
```

The backend server should now be running locally on `http://localhost:3001` (by default).

### 3. Setup the Frontend Client

Open a **new** terminal window and navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will start. Open the provided default URL (typically `http://localhost:5173`) in your web browser to enter the application.

## 👥 Use Cases

- **Remote Team Brainstorming:** Sketch ideas and architecture diagrams collaboratively.
- **Technical Discussions:** Quickly prototype workflows with engineering teams.
- **Online Tutoring:** Interactive educational whiteboard to explain concepts visually.

## 📝 License

This project is open-source and available under the ISC License.
