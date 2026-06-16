"use client";

import { useEffect, useRef } from "react";
import { useRoom } from "../../hooks/useRoom";
import QRCode from "qrcode";
import { Users, Award, BarChart3, QrCode, Sparkles, Star, Flame, Plus } from "lucide-react";
import { motion } from "framer-motion";

// Deterministic avatar generator based on nickname
function getAvatarData(nickname: string) {
  const emojis = ["🎤", "🎵", "🎸", "🎧", "🎹", "🎶", "🌟", "🔥", "🦄", "🐼", "🦊", "🐱", "🦁", "🐨"];
  const gradients = [
    "from-purple-500 to-indigo-500",
    "from-blue-500 to-cyan-500",
    "from-pink-500 to-rose-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-red-500 to-pink-500",
  ];
  
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  
  const emoji = emojis[hash % emojis.length];
  const gradient = gradients[hash % gradients.length];
  const initials = nickname.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "🎤";
  
  return { emoji, gradient, initials };
}

interface SidebarLeftProps {
  roomData: ReturnType<typeof useRoom>;
  showStatsOnly?: boolean;
}

export default function SidebarLeft({ roomData, showStatsOnly = false }: SidebarLeftProps) {
  const { room, users, queue, leaderboard, partyEvents } = roomData;
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR Code on canvas
  useEffect(() => {
    if (qrCanvasRef.current && room?.code && typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/room/${room.code}`;
      QRCode.toCanvas(
        qrCanvasRef.current,
        shareUrl,
        {
          width: 130,
          margin: 1.5,
          color: {
            dark: "#09090b", // zinc-950
            light: "#ffffff", // white background for high contrast scanning
          },
          errorCorrectionLevel: "M",
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, [room?.code]);

  // Aggregate stats
  const totalSongsPlayed = queue.filter((s) => s.status === "played").length;
  const totalSongsQueued = queue.filter((s) => s.status === "pending").length;
  const onlineCount = users.filter((u) => u.is_online).length;

  // Render separate metric leaderboards
  const singerLeaderboard = leaderboard.filter((entry) => entry.metric_type === "highest_average_score");
  const songsLeaderboard = leaderboard.filter((entry) => entry.metric_type === "most_songs_added");
  const reactionLeaderboard = leaderboard.filter((entry) => entry.metric_type === "most_reactions");

  return (
    <div className="flex flex-col gap-6 p-4 h-full">
      {/* 1. ROOM CODE & QR SECTION (Hidden if showStatsOnly) */}
      {!showStatsOnly && (
        <section className="glass-panel p-4 rounded-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">
            <QrCode className="w-4 h-4" />
            <span>Scan to Join</span>
          </div>

          <div className="bg-white p-2.5 rounded-xl mb-3 border border-zinc-850 shadow-inner">
            <canvas ref={qrCanvasRef} className="w-28 h-28" />
          </div>

          <h3 className="text-zinc-400 text-xs font-semibold">ROOM CODE</h3>
          <p className="font-heading text-2xl tracking-widest text-white font-bold select-all mt-0.5">
            {room?.code}
          </p>
        </section>
      )}

      {/* 2. ONLINE USERS */}
      <section className="glass-panel p-4 rounded-xl flex-1 flex flex-col min-h-[160px] overflow-hidden">
        <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-zinc-900 pb-2.5 mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>Online Users</span>
          </div>
          <span className="bg-purple-950/40 text-purple-400 border border-purple-900/50 px-2 py-0.5 rounded-md text-[10px] font-bold">
            {onlineCount}/{users.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
          {users.map((user) => {
            const avatar = getAvatarData(user.nickname);
            return (
              <motion.div
                layout
                key={user.id}
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-zinc-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                      <span>{avatar.initials}</span>
                    </div>
                    {/* Status Dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-zinc-950 ${
                        user.is_online
                          ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                          : "bg-zinc-700"
                      }`}
                    />
                  </div>
                  <span className="font-medium text-zinc-200">{user.nickname}</span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                  {user.role}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. LEADERBOARDS */}
      <section className="glass-panel p-4 rounded-xl flex-1 flex flex-col min-h-[200px] overflow-hidden">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-zinc-900 pb-2.5 mb-3">
          <Award className="w-4 h-4" />
          <span>Party Leaderboard</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Top Singers */}
          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Highest Average Score
            </h4>
            {singerLeaderboard.length === 0 ? (
              <p className="text-zinc-600 text-xs italic pl-4">No scores submitted yet</p>
            ) : (
              <div className="space-y-1.5">
                {singerLeaderboard.slice(0, 3).map((entry, idx) => (
                  <div key={entry.id} className="flex justify-between items-center text-xs pl-3">
                    <span className="text-zinc-300 font-medium">
                      {idx === 0 && "🥇 "}
                      {idx === 1 && "🥈 "}
                      {idx === 2 && "🥉 "}
                      {entry.nickname}
                    </span>
                    <span className="text-amber-400 font-bold">{entry.score_value} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Active Singers */}
          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              Most Songs Added
            </h4>
            {songsLeaderboard.length === 0 ? (
              <p className="text-zinc-600 text-xs italic pl-4">No songs added yet</p>
            ) : (
              <div className="space-y-1.5">
                {songsLeaderboard.slice(0, 3).map((entry, idx) => (
                  <div key={entry.id} className="flex justify-between items-center text-xs pl-3">
                    <span className="text-zinc-300 font-medium">{entry.nickname}</span>
                    <span className="text-purple-400 font-bold">{entry.score_value} tracks</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reaction Stars */}
          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
              Most Reactions Sent
            </h4>
            {reactionLeaderboard.length === 0 ? (
              <p className="text-zinc-600 text-xs italic pl-4">No reactions sent yet</p>
            ) : (
              <div className="space-y-1.5">
                {reactionLeaderboard.slice(0, 3).map((entry, idx) => (
                  <div key={entry.id} className="flex justify-between items-center text-xs pl-3">
                    <span className="text-zinc-300 font-medium">{entry.nickname}</span>
                    <span className="text-pink-500 font-bold">🔥 {entry.score_value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. PARTY STATS */}
      <section className="glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-zinc-900 pb-2.5 mb-3">
          <BarChart3 className="w-4 h-4" />
          <span>Party Stats</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-lg">
            <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              Queued
            </span>
            <span className="font-heading text-lg font-bold text-white">
              {totalSongsQueued}
            </span>
          </div>
          <div className="bg-zinc-950/40 p-2.5 border border-zinc-900 rounded-lg">
            <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
              Singing History
            </span>
            <span className="font-heading text-lg font-bold text-white">
              {totalSongsPlayed}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
