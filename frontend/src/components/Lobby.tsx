import { useState } from 'react';
import { Layers, Users, PenTool } from 'lucide-react';

interface LobbyProps {
  onJoin: (roomId: string, username: string) => void;
}

export default function Lobby({ onJoin }: LobbyProps) {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomId = roomId.trim() || `room-${Math.random().toString(36).substring(2, 9)}`;
    const finalUsername = username.trim() || 'Anonymous';
    
    onJoin(finalRoomId, finalUsername);
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
            <p className="text-slate-400 text-sm font-medium mb-8">Ready to build? Please enter your details.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[0.8rem] font-bold text-slate-300 mb-2">Your Name</label>
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
                className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-[0_8px_20px_rgba(79,70,229,0.25)] hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] text-[0.95rem]"
              >
                Join Room
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center space-x-4">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-xs font-bold text-slate-300 tracking-wider">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            <div className="mt-6 flex gap-4">
              <button className="flex-1 bg-[#f8f9fc] hover:bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 text-[0.95rem]">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.09-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button className="flex-1 bg-[#f8f9fc] hover:bg-slate-100 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 text-[0.95rem]">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
              </button>
            </div>
            
            <p className="text-center text-sm font-semibold text-slate-500 mt-8">
              New to LiveCollab? <a href="#" className="text-[#4f46e5] hover:underline">Create an account</a>
            </p>
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
