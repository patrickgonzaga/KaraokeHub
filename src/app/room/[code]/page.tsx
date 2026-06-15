"use client";

import { use, useEffect, useState } from "react";
import { useRoomStore } from "../../../store/useRoomStore";
import { useRoom } from "../../../hooks/useRoom";
import RoomLayout from "../../../components/room/RoomLayout";
import { motion } from "framer-motion";
import { Music, AlertTriangle, UserPlus, LogIn } from "lucide-react";
import Link from "next/link";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { userId, nickname, initializeClient, setNickname, pendingRoomName, setTVMode } = useRoomStore();

  const [nicknameInput, setNicknameInput] = useState("");
  const [hasPrompted, setHasPrompted] = useState(false);

  // Initialize Zustand client details & check for TV URL param
  useEffect(() => {
    initializeClient();
    
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tv") === "true" || urlParams.get("mode") === "tv") {
        setNickname("TV Display");
        setTVMode(true);
      }
    }
    
    setHasPrompted(true);
  }, [initializeClient, setNickname, setTVMode]);

  // Load the active Room connection
  const roomData = useRoom(code, pendingRoomName || undefined);
  const { joinRoom, loading, error, room, users } = roomData;

  // Auto-join if nickname is already set but user is not in room_users
  useEffect(() => {
    if (room && nickname && !loading && users) {
      const alreadyJoined = users.some((u) => u.nickname === nickname);
      if (!alreadyJoined) {
        joinRoom(nickname);
      }
    }
  }, [room, nickname, loading, users, joinRoom]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;

    // Join room in hook and update local nick state
    joinRoom(nicknameInput.trim());
  };

  // 1. Loading client session details
  if (!hasPrompted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Prompt for Nickname if missing from store/session
  if (!nickname) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Neon blur backgrounds */}
        <div className="ambient-glow-wrapper top-1/3 left-1/3 w-72 h-72 bg-purple-600/30 rounded-full"></div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-panel p-8 rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden"
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500"></div>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <UserPlus className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="font-heading text-2xl text-white tracking-wide uppercase">Join the Room</h2>
            <p className="text-zinc-400 text-xs mt-1">
              Enter your nickname to join Room <span className="text-purple-400 font-bold tracking-widest">{code}</span>
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label htmlFor="join-page-nickname" className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2">
                Your Nickname
              </label>
              <input
                id="join-page-nickname"
                type="text"
                required
                maxLength={15}
                placeholder="e.g., Patrick"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold tracking-wider rounded-xl py-3.5 hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4.5 h-4.5" />
              JOIN PARTY
            </button>
          </form>
        </motion.div>
      </main>
    );
  }

  // 3. Database Sync Loading States
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] space-y-4">
        <div className="relative flex items-center justify-center w-14 h-14 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
          <Music className="w-7 h-7 animate-spin" />
        </div>
        <p className="text-zinc-400 text-sm tracking-widest font-medium animate-pulse">
          CONNECTING TO PARTY ROOM...
        </p>
      </div>
    );
  }

  // 4. Invalid Room Errors
  if (error || !room) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-panel p-8 rounded-2xl border border-rose-900/40 text-center"
        >
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-950/50 text-rose-500 border border-rose-900/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-xl text-white uppercase tracking-wider mb-2">Room Error</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {error || "We could not find this room. It may have expired or the code is incorrect."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold tracking-wider text-sm transition"
          >
            Go Back Home
          </Link>
        </motion.div>
      </main>
    );
  }

  // 5. Render Main Room Panel UI
  return <RoomLayout roomData={roomData} />;
}
