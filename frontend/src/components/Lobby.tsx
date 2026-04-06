import { useState, useEffect } from 'react';
import { Layers, Users, PenTool } from 'lucide-react';

interface LobbyProps {
  onJoin: (roomId: string, username: string) => void;
  defaultUsername?: string;
}

export default function Lobby({ onJoin, defaultUsername = '' }: LobbyProps) {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState(defaultUsername);

  useEffect(() => {
    if (defaultUsername) {
      setUsername(defaultUsername);
    }
  }, [defaultUsername]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomId = roomId.trim() || 'random-' + Math.random().toString(36).substring(2, 8);
    const finalUsername = username.trim() || 'Anonymous';
    
    setIsLoading(true);
    setErrorMsg("");

    try {
      // Allow API URL to use local during development
      const API_URL = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://fork-yeah-backend.onrender.com";

      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: finalUsername })
      });

      if (!response.ok) {
        throw new Error("Could not authenticate");
      }

      const data = await response.json();
      onJoin(finalRoomId, data.username);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to connect to server. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0f172a] bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] flex text-slate-100 overflow-hidden relative">
      
      {/* Animated Neon Glowing Entities */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 z-0">
         <div className="absolute top-[30%] left-[-20%] w-[150%] h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[4px] glow-float-1 rotate-12"></div>
         <div className="absolute top-[70%] left-[-10%] w-[120%] h-[4px] bg-gradient-to-r from-transparent via-[#4f46e5] to-transparent blur-[5px] glow-float-2 -rotate-[8deg]"></div>
         <div className="absolute top-[80%] left-[-30%] w-[140%] h-[3px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent blur-[4px] glow-float-3 rotate-[24deg]"></div>
      </div>
      <style>{`
        @keyframes flowRight {
          0% { transform: translateY(0) rotate(12deg) scaleX(1); opacity: 0.3; }
          50% { transform: translateY(-30px) rotate(14deg) scaleX(1.1); opacity: 0.8; }
          100% { transform: translateY(0) rotate(12deg) scaleX(1); opacity: 0.3; }
        }
        @keyframes flowLeft {
          0% { transform: translateY(0) rotate(-8deg) translateX(-50px); opacity: 0.2; }
          50% { transform: translateY(40px) rotate(-10deg) translateX(50px); opacity: 0.6; }
          100% { transform: translateY(0) rotate(-8deg) translateX(-50px); opacity: 0.2; }
        }
        @keyframes floatDiag {
          0% { transform: translateY(0) rotate(24deg) scale(0.9); opacity: 0.2; }
          50% { transform: translateY(-50px) rotate(22deg) scale(1.05); opacity: 0.7; }
          100% { transform: translateY(0) rotate(24deg) scale(0.9); opacity: 0.2; }
        }
        .glow-float-1 { animation: flowRight 6s ease-in-out infinite; }
        .glow-float-2 { animation: flowLeft 8s ease-in-out infinite; }
        .glow-float-3 { animation: floatDiag 7s ease-in-out infinite; }
      `}</style>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center px-6 py-12 lg:py-20 lg:px-12 gap-12 lg:gap-24 relative z-10">
        
        {/* Left Side: Hero Text & Features */}
        <div className="flex-1 w-full max-w-xl self-center pt-8 lg:pt-0">
          <div className="flex items-center gap-2 text-[#4f46e5] font-bold text-2xl mb-8">
            <div className="w-10 h-10 bg-[#4f46e5] rounded-xl flex items-center justify-center text-white">
              <Layers size={22} fill="currentColor" />
            </div>
            LiveCollab
          </div>

          <h1 className="text-5xl lg:text-6xl font-[800] leading-[1.1] tracking-tight text-white mb-6">
            Where ideas find <br />
            <span className="text-cyan-400">their perfect form.</span>
          </h1>

          <p className="text-slate-300 text-lg lg:text-xl font-medium leading-relaxed mb-12 max-w-md">
            A premium, real-time collaborative whiteboard built purely for our hackathon project. No fluff, just creation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-slate-700/50 hover:shadow-[0_8px_30px_rgba(34,211,238,0.1)] transition-all">
              <Users size={24} className="text-cyan-400 mb-4" />
              <h3 className="font-bold text-white mb-3 text-[1.05rem]">Real-time Presence</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                See every stroke, every thought, every collaborator instantly.
              </p>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-slate-700/50 hover:shadow-[0_8px_30px_rgba(79,70,229,0.1)] transition-all">
              <PenTool size={24} className="text-[#4f46e5] mb-4" />
              <h3 className="font-bold text-white mb-3 text-[1.05rem]">Infinite Canvas</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                Unbounded space for your biggest ideas and wildest sketches.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Join Box */}
        <div className="w-full max-w-[460px] pb-24 lg:pb-0">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-700/50 relative">
            <h2 className="text-2xl font-bold text-white mb-2">Join your workspace</h2>
            <p className="text-slate-400 text-sm font-medium mb-6">Ready to build? Please enter your username.</p>

            {errorMsg && (
              <div className="bg-red-500/20 text-red-300 border border-red-500/50 rounded-lg p-3 mb-6 text-sm font-semibold text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[0.8rem] font-bold text-slate-300 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 focus:border-cyan-400/50 focus:bg-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-cyan-400/10 transition-all font-medium text-[0.95rem]"
                  placeholder="e.g. Alex"
                />
              </div>
              
              <div>
                <label className="block text-[0.8rem] font-bold text-slate-300 mb-2">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 focus:border-[#4f46e5]/50 focus:bg-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[#4f46e5]/10 transition-all font-medium text-[0.95rem]"
                  placeholder="e.g. hackathon-alpha (leave empty for random)"
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-[0_8px_20px_rgba(79,70,229,0.25)] hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] text-[0.95rem] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Authenticating..." : "Join Room"}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Footer / Bottom Elements */}
      <div className="absolute bottom-6 left-0 right-0 max-w-7xl mx-auto px-12 flex justify-center items-center z-10 pointer-events-none">
        <div className="hidden lg:flex gap-8 text-[0.7rem] font-bold tracking-widest text-slate-500 pointer-events-auto">
          <div className="uppercase">Hackathon Project Demo</div>
        </div>
      </div>
    </div>
  );
}