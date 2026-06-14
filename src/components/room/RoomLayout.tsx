"use client";

import { useRoomStore } from "../../store/useRoomStore";
import SidebarLeft from "./SidebarLeft";
import SidebarRight from "./SidebarRight";
import TheaterMode from "./TheaterMode";
import ControlPanel from "./ControlPanel";
import { useRoom } from "../../hooks/useRoom";
import { motion } from "framer-motion";
import { Tv, Phone, LogOut, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface RoomLayoutProps {
  roomData: ReturnType<typeof useRoom>;
}

export default function RoomLayout({ roomData }: RoomLayoutProps) {
  const { isTVMode, setTVMode, activeTab, setActiveTab, nickname } = useRoomStore();
  const { room, users, queue } = roomData;
  const [showShareToast, setShowShareToast] = useState(false);

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/room/${room?.code}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${room?.name} - KaraokeHub`,
        text: `Join my karaoke party "${room?.name}" on KaraokeHub!`,
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  // 1. TV MODE / CINEMATIC FULLSCREEN DISPLAY
  if (isTVMode) {
    return (
      <div className="relative min-h-screen bg-[#020205] overflow-hidden flex flex-col">
        {/* Ambient glow backgrounds */}
        <div className="ambient-glow-wrapper top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full"></div>
        <div className="ambient-glow-wrapper bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full"></div>
        
        {/* Always-visible exit button — top-right corner */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
          {/* Room name pill */}
          <div className="hidden md:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="font-heading text-sm uppercase tracking-wider text-purple-400">
              {room?.name}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30 uppercase tracking-wider">
              TV
            </span>
          </div>
          {/* Exit button — always visible */}
          <button
            onClick={() => setTVMode(false)}
            className="flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 text-white font-bold text-xs tracking-wider px-4 py-2.5 rounded-xl border border-zinc-700 hover:border-purple-500/60 transition cursor-pointer backdrop-blur-md shadow-lg"
          >
            <Phone className="w-4 h-4 text-purple-400" />
            <span>EXIT TV</span>
          </button>
        </div>

        {/* Fullscreen Theater Mode */}
        <div className="flex-1 w-full h-full flex flex-col justify-center items-center">
          <TheaterMode roomData={roomData} />
        </div>
      </div>
    );
  }

  // 2. CONTROLLER / ALL-IN-ONE LAYOUT (Desktop 3-columns, Mobile multi-tabs)
  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-[#f8fafc]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 glass-panel border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-heading text-lg tracking-wide uppercase text-white flex items-center gap-1.5 hover:opacity-90">
            <span className="gradient-text font-bold">Karaoke</span>Hub
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 hidden md:block" />
          <div className="hidden md:flex flex-col">
            <span className="text-zinc-200 text-sm font-semibold">{room?.name}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Code: {room?.code}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-zinc-800 transition cursor-pointer relative"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Share</span>
            
            {showShareToast && (
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-purple-600 text-[10px] font-bold text-white uppercase whitespace-nowrap shadow-md shadow-purple-500/20 z-50">
                Copied Link!
              </span>
            )}
          </button>

          <button
            onClick={() => setTVMode(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs tracking-wider px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <Tv className="w-4 h-4" />
            <span>ACTIVATE TV</span>
          </button>
        </div>
      </header>

      {/* Main Section */}
      <div className="flex-1 w-full max-w-[1700px] mx-auto flex flex-col lg:flex-row overflow-hidden relative">
        {/* DESKTOP SIDEBARS */}
        <aside className="w-80 border-r border-zinc-900 overflow-y-auto hidden lg:block bg-zinc-950/20">
          <SidebarLeft roomData={roomData} />
        </aside>

        {/* CENTER STAGE (Theater mode on top, controls on bottom) */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0 border-r border-zinc-900">
          {/* Top Stage Mini-player / Status */}
          <div className="p-4 bg-zinc-950/30 border-b border-zinc-900/60">
            <TheaterMode roomData={roomData} />
          </div>

          {/* Bottom Controls Stage */}
          <div className="flex-1 flex flex-col">
            {/* Desktop Center Actions header */}
            <div className="border-b border-zinc-900/60 bg-zinc-950/40 p-1 flex items-center lg:hidden">
              {/* Mobile Tab Selectors */}
              <div className="grid grid-cols-5 w-full">
                {(["search", "queue", "chat", "feed", "leaderboard"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      activeTab === tab
                        ? "text-purple-400 border-b-2 border-purple-500 font-bold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Render tab content or grid depending on screen width */}
            <div className="flex-1 flex flex-col p-4 bg-zinc-950/10">
              <div className="lg:block hidden flex-1">
                {/* Desktop: control panel handles search & queue directly */}
                <ControlPanel roomData={roomData} />
              </div>
              <div className="lg:hidden block flex-1">
                {/* Mobile Tab Container */}
                {activeTab === "search" && <ControlPanel roomData={roomData} activeTab="search" />}
                {activeTab === "queue" && <ControlPanel roomData={roomData} activeTab="queue" />}
                {activeTab === "chat" && <SidebarRight roomData={roomData} activeTab="chat" />}
                {activeTab === "feed" && <SidebarRight roomData={roomData} activeTab="feed" />}
                {activeTab === "leaderboard" && <SidebarLeft roomData={roomData} showStatsOnly={false} />}
              </div>
            </div>
          </div>
        </main>

        {/* DESKTOP RIGHT SIDEBAR */}
        <aside className="w-80 overflow-y-auto hidden lg:block bg-zinc-950/20">
          <SidebarRight roomData={roomData} />
        </aside>
      </div>
    </div>
  );
}
