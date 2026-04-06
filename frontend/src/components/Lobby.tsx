import { useState } from "react";

interface LobbyProps {
  onJoin: (roomId: string, username: string) => void;
}

export default function Lobby({ onJoin }: LobbyProps) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = "https://fork-yeah-backend.onrender.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalUsername = username.trim() || "Anonymous";
    const finalRoomId =
      roomId.trim() || "room-" + Math.random().toString(36).slice(2, 8);

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: finalUsername }),
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();

      // ✅ IMPORTANT FIX
      onJoin(finalRoomId, data.displayName);

    } catch (err) {
      console.error(err);
      setError("⚠️ Backend sleeping or error. Try again in 5 sec.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#0f172a] text-white">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-xl">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Join Workspace
        </h1>

        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Username */}
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-blue-500"
              placeholder="Enter your name"
            />
          </div>

          {/* Room ID */}
          <div>
            <label className="block text-sm mb-1">Room ID</label>
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-purple-500"
              placeholder="Leave empty for random"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-semibold disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
}