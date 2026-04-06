# 🚀 LiveCollab

LiveCollab is a powerful, real-time collaborative whiteboard application designed for teams. It allows multiple users to join a shared room and draw simultaneously on an infinite canvas, drop in dynamic interactive widgets, communicate over voice with live closed captions, and synchronize everything across all connected clients in real-time.

## ✨ Features

- **Real-Time Synchronized Canvas:** Draw on a shared whiteboard using `react-konva` for a declarative, robust, and lag-free multiplayer experience.
- **Dynamic Widgets:** 
  - 📊 **Graphs**: Drag and drop real-time Bar and Pie charts, editing data points on the fly!
  - 📝 **Polls**: Spawn live polls where the entire room can vote and see results instantly.
- **Live Voice Chat & Captions:** Talk to your team seamlessly without external tools. Includes an accessibility-first Speech-to-Text engine generating live closed captions (CC) for spoken words right on the whiteboard!
- **Rich Toolkit:** Select, Move, Freehand Draw, Highlighter, Eraser, and automatic Shapes (Rectangles, Circles, Triangles, Polygons).
- **Advanced Palette:** Manage Outline (Stroke) and Fill colors independently. Easily adjust thickness and dash styling (Solid, Dashed, Dotted).
- **Team Chat:** A sleek, built-in text chat overlay allows users to drop quick messages.
- **Google OAuth Login:** Secure authentication backed by Passport.js and Express Sessions.
- **Canvas State Persistence:** Late-joiners instantly receive the entire board layout, chat history, and active widgets.

## 🛠️ Tech Stack

**Frontend:**
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) for gorgeous UI styling
- [React-Konva](https://konvajs.org/docs/react/index.html) for highly performant HTML5 canvas logic
- [Recharts](https://recharts.org/) & [React-Rnd](https://github.com/bokuweb/react-rnd) for draggable floating widgets
- [Socket.IO Client](https://socket.io/) for WebSockets

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/) for bi-directional state synchronization
- [Passport.js](https://www.passportjs.org/) (Google Strategy) for seamless OAuth

## 📦 Project Structure

```text
Fork-yeah/
├── backend/       # Express + Socket.IO server and OAuth logic
│   ├── server.js  # Main server entry point
│   └── .env       # (Requires your Google OAuth credentials and Session Secret)
├── frontend/      # React + Vite UI application
│   ├── src/
│   │   └── components/
│   │       ├── Whiteboard.tsx  # Core Konva canvas and socket event dispatcher
│   │       ├── PollWidget.tsx  # Draggable Voting Widget
│   │       ├── GraphWidget.tsx # Draggable Recharts Box 
│   │       └── ...
│   └── package.json
└── README.md
```

## 🚀 Getting Started

Follow these instructions to get a local copy of LiveCollab up and running.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Google Cloud Console project (to generate OAuth client ID and secret)

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Fork-yeah
```

### 2. Configure Environment Variables
Inside the `backend` folder, create a `.env` file with the following keys:
```env
PORT=3001
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=a_random_secure_string_here
```

### 3. Setup the Backend Server
Open a terminal and navigate to the `backend` directory:
```bash
cd backend
npm install
node server.js
```
The backend server runs locally on `http://localhost:3001`.

### 4. Setup the Frontend Client
Open a **new** terminal window and navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start on `http://localhost:5173`. Open this URL in your web browser, log in with Google, and start collaborating!

## 👥 Use Cases

- **Hackathons & Sprints:** Visually plot out architecture diagrams mapping ideas onto interactive graphs.
- **Remote Brainstorming:** Keep teams aligned with instantly synchronizing toolsets, live text chats, and integrated polling.
- **Accessibility & Auditing:** Leverage the built-in CC Speech-to-Text engine to allow team members to track complex technical discussions visually.

## 📝 License

This project is open-source and available under the ISC License.
