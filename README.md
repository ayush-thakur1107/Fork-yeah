# 🚀 LiveCollab — Real-Time Collaborative Whiteboard

LiveCollab is a powerful, real-time collaborative whiteboard designed for teams, students, and creators. It allows multiple users to join shared rooms, draw simultaneously, interact with dynamic widgets, and communicate seamlessly — all in sync.

---

## 🌐 Live Demo

👉 https://your-live-url.com  

No installation required. Just open the link, log in, and start collaborating instantly.

---

## ✨ Features

### 🎨 Real-Time Collaboration
- Multi-user synchronized whiteboard
- Instant updates across all connected clients
- Smooth drawing powered by react-konva

### 🧰 Drawing Toolkit
- Freehand drawing & highlighter  
- Shapes: Rectangle, Circle, Triangle, Polygon  
- Eraser tool  
- Select & move elements  

### 🎨 Advanced Styling
- Separate stroke & fill color control  
- Adjustable thickness  
- Stroke styles: Solid, Dashed, Dotted  

### 📊 Interactive Widgets
- **Graphs**
  - Bar & Pie charts
  - Real-time editable data
- **Polls**
  - Live voting system
  - Instant result updates  

### 🎙️ Voice Chat + Live Captions
- Built-in voice communication  
- Real-time speech-to-text captions  
- Accessibility-first design  

### 💬 Team Chat
- Lightweight chat overlay  
- Instant messaging within rooms  

### 🔐 Authentication
- Google OAuth login (Passport.js)  
- Secure session handling  

### 💾 State Persistence
- Late joiners automatically receive:
  - Canvas state  
  - Widgets  
  - Chat history  

---

## 🛠️ Tech Stack

### Frontend
- React + Vite  
- TypeScript  
- Tailwind CSS  
- React-Konva  
- Recharts  
- React-Rnd  
- Socket.IO Client  

### Backend
- Node.js + Express  
- Socket.IO  
- Passport.js (Google OAuth)  

---

## 📂 Project Structure


Fork-yeah/
├── backend/ # Express + Socket.IO server
│ ├── server.js # Entry point
│ └── .env # Environment variables
│
├── frontend/ # React + Vite client
│ ├── src/components/
│ │ ├── Whiteboard.tsx # Core canvas logic
│ │ ├── PollWidget.tsx # Voting widget
│ │ ├── GraphWidget.tsx # Charts widget
│ │ └── ...
│ └── package.json
│
└── README.md


---

## 💡 Use Cases

### 🧠 Brainstorming Sessions
Collaborate visually with drawing tools, polls, and charts.

### 🏗️ System Design
Sketch architecture diagrams and workflows in real time.

### 🏆 Hackathons
Coordinate with teammates using:
- Shared whiteboard  
- Voice chat  
- Live widgets  

### 📚 Education
- Teachers explain visually  
- Students collaborate live  
- Captions improve accessibility  

### ♿ Accessibility & Documentation
Speech-to-text captions help track discussions visually.

---

## 👨‍💻 Local Development Setup

### Prerequisites
- Node.js (v18+ recommended)  
- Google Cloud Project (OAuth credentials)  

---

### 1. Clone the repository
```bash
git clone https://github.com/ayush-thakur1107/Fork-yeah.git
cd Fork-yeah
2. Configure Environment Variables

Create a .env file inside the backend folder:

PORT=3001
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_secure_random_string
3. Run Backend
cd backend
npm install
node server.js

Backend runs on: http://localhost:3001

4. Run Frontend
cd frontend
npm install
npm run dev

Frontend runs on: http://localhost:5173

🔮 Future Improvements
Persistent database storage
Video calling integration
Export board as image/PDF
AI-assisted diagram generation
📜 License

This project is licensed under the ISC License.


---

### ⚡ What you should do next
- Replace `https://your-live-url.com` with your actual deployed link  
- Push this as `README.md`  

---

If you want next level:
I can turn this into a **🔥 hackathon-winning README (with badges, GIF demo, screenshots, and animations)** which *seriously impresses judges*.
