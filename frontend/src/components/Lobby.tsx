import { useState, useEffect } from 'react';
import { Layers, Users, PenTool, Zap, ArrowRight } from 'lucide-react';

interface LobbyProps {
  onJoin: (roomId: string, username: string) => void;
  defaultUsername?: string;
}

export default function Lobby({ onJoin, defaultUsername = '' }: LobbyProps) {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState(defaultUsername);

  // Sync if defaultUsername loads after component mounts (OAuth redirect case)
  useEffect(() => {
    if (defaultUsername) {
      setUsername(defaultUsername);
    }
  }, [defaultUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomId = roomId.trim() || `room-${Math.random().toString(36).substring(2, 9)}`;
    const finalUsername = username.trim() || 'Anonymous';
    onJoin(finalRoomId, finalUsername);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#060910] flex text-slate-100 overflow-hidden relative">

      {/* Background grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] z-0" />
      <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[100px] z-0" />
      <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] rounded-full bg-violet-600/6 blur-[80px] z-0" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .lobby-font { font-family: 'Syne', sans-serif; }
        .body-font { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .anim-1 { animation: fadeUp 0.6s ease forwards; opacity: 0; }
        .anim-2 { animation: fadeUp 0.6s 0.1s ease forwards; opacity: 0; }
        .anim-3 { animation: fadeUp 0.6s 0.2s ease forwards; opacity: 0; }
        .anim-4 { animation: fadeUp 0.6s 0.3s ease forwards; opacity: 0; }
        .anim-5 { animation: fadeUp 0.6s 0.4s ease forwards; opacity: 0; }
        .anim-6 { animation: fadeIn 0.8s 0.5s ease forwards; opacity: 0; }

        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent);
          animation: scanline 8s linear infinite;
          pointer-events: none;
          z-index: 1;
        }

        .card-hover {
          transition: all 0.3s ease;
        }
        .card-hover:hover {
          border-color: rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.06);
          transform: translateY(-2px);
        }

        .input-field {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s ease;
        }
        .input-field:focus {
          background: rgba(99,102,241,0.06);
          border-color: rgba(99,102,241,0.5);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
          outline: none;
        }

        .join-btn {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .join-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .join-btn:hover::after { opacity: 1; }
        .join-btn:hover {
          box-shadow: 0 8px 30px rgba(99,102,241,0.4);
          transform: translateY(-1px);
        }
        .join-btn:active { transform: translateY(0); }

        .oauth-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s ease;
        }
        .oauth-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.15);
        }

        .tag {
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          color: #818cf8;
        }

        .prefilled {
          border-color: rgba(34,197,94,0.4) !important;
          background: rgba(34,197,94,0.04) !important;
        }
      `}</style>

      <div className="scan-line" />

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center px-6 py-12 lg:py-0 gap-16 lg:gap-32 relative z-10 lobby-font">

        {/* Left — Hero */}
        <div className="flex-1 w-full max-w-lg">
          <div className="anim-1 flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              <Layers size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">LiveCollab</span>
            <span className="tag text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase ml-1">Beta</span>
          </div>

          <h1 className="anim-2 text-5xl lg:text-[3.6rem] font-[800] leading-[1.05] tracking-tight text-white mb-6">
            Where ideas find<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              their perfect form.
            </span>
          </h1>

          <p className="anim-3 body-font text-slate-400 text-base leading-relaxed mb-12 max-w-sm font-light">
            Real-time collaborative whiteboard for teams who build fast. Join a room, start drawing.
          </p>

          <div className="anim-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Users, label: 'Live Presence', desc: 'See collaborators in real time' },
              { icon: PenTool, label: 'Infinite Canvas', desc: 'Unbounded creative space' },
              { icon: Zap, label: 'Instant Sync', desc: 'Zero-lag drawing updates' },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="card-hover rounded-2xl p-4 border border-white/[0.06] bg-white/[0.02] cursor-default"
              >
                <Icon size={18} className="text-indigo-400 mb-3" />
                <div className="text-white font-semibold text-sm mb-1">{label}</div>
                <div className="body-font text-slate-500 text-xs leading-relaxed font-light">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Join Box */}
        <div className="w-full max-w-[420px] anim-5">
          <div
            className="rounded-[28px] p-8 relative"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-[28px] overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-500/10 to-transparent" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Join your workspace</h2>
            <p className="body-font text-slate-500 text-sm mb-7 font-light">Enter your details to start collaborating.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Your Name</label>
                  {defaultUsername && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                      Auto-filled
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`input-field w-full rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm body-font ${defaultUsername ? 'prefilled' : ''}`}
                  placeholder="e.g. Alex"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="input-field w-full rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm body-font"
                  placeholder="Leave empty for a random room"
                />
              </div>

              <button
                type="submit"
                className="join-btn w-full text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm mt-2"
              >
                Join Room
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">or continue with</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.location.href = "https://fork-yeah-backend.onrender.com/auth/google"}
                className="oauth-btn flex-1 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-300 body-font"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.09-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => window.location.href = "https://fork-yeah-backend.onrender.com/auth/github"}
                className="oauth-btn flex-1 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-300 body-font"
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
              </button>
            </div>

            <p className="body-font text-center text-xs text-slate-600 mt-6 font-light">
              By joining, you agree to our{' '}
              <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Privacy Policy</a>
            </p>
          </div>

          <p className="anim-6 body-font text-center text-xs text-slate-700 mt-5 font-light">
            Hackathon Project Demo · Built with ❤️
          </p>
        </div>
      </div>
    </div>
  );
}