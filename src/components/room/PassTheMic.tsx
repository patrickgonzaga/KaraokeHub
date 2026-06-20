"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRoom } from "../../hooks/useRoom";
import { useRoomStore } from "../../store/useRoomStore";
import { Mic, Disc, Play, Star, Sparkles, UserPlus, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { getAvatarData } from "../../lib/avatar";

interface PassTheMicProps {
  roomData: ReturnType<typeof useRoom>;
}

// Helper to extract a solid color from avatar gradient classes for SVG rendering
function getSolidColorForGradient(gradientClass: string) {
  if (gradientClass.includes("purple")) return "#8b5cf6"; // purple-500
  if (gradientClass.includes("blue")) return "#3b82f6"; // blue-500
  if (gradientClass.includes("pink")) return "#ec4899"; // pink-500
  if (gradientClass.includes("emerald")) return "#10b981"; // emerald-500
  if (gradientClass.includes("amber")) return "#f59e0b"; // amber-500
  if (gradientClass.includes("red")) return "#ef4444"; // red-500
  return "#71717a"; // zinc-500 fallback
}

export default function PassTheMic({ roomData }: PassTheMicProps) {
  const { users } = roomData;
  const { passTheMicVisible, setPassTheMicVisible } = useRoomStore();

  const [candidates, setCandidates] = useState<string[]>([]);
  const [includeOffline, setIncludeOffline] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  // Reset roulette wheel state variables to initial state when the modal opens
  useEffect(() => {
    if (passTheMicVisible) {
      setSpinning(false);
      setRotation(0);
      setWinner(null);
    }
  }, [passTheMicVisible]);

  // Initialize candidates list snapshot when modal opens or includeOffline toggles
  // Guard with !spinning && !winner to lock the candidates list during spin
  useEffect(() => {
    if (passTheMicVisible && !spinning && !winner) {
      const onlineNames = users.filter((u) => u.is_online).map((u) => u.nickname);
      let newList = [...onlineNames];
      
      if (includeOffline) {
        const offlineNames = users.filter((u) => !u.is_online).map((u) => u.nickname);
        newList = [...newList, ...offlineNames];
      }
      setCandidates(newList);
    }
  }, [passTheMicVisible, users, includeOffline, spinning, winner]);

  if (!passTheMicVisible || candidates.length === 0) return null;

  const handleVolunteer = (name: string) => {
    if (spinning || winner) return;
    if (candidates.includes(name)) {
      setCandidates(candidates.filter((c) => c !== name));
    } else {
      setCandidates([...candidates, name]);
    }
  };

  const spinWheel = () => {
    if (spinning || candidates.length === 0) return;

    setSpinning(true);
    setWinner(null);

    // Pick a random winner from candidates
    const winnerIdx = Math.floor(Math.random() * candidates.length);
    const selectedWinner = candidates[winnerIdx];

    // Calculate rotation: 5 full spins (1800deg) + slice alignment
    const sliceAngle = 360 / candidates.length;
    const centerAngle = winnerIdx * sliceAngle + sliceAngle / 2;
    // Align center of slice to 270 degrees (top pointer arrow)
    let targetAngle = 270 - centerAngle;
    if (targetAngle < 0) targetAngle += 360;

    // Accumulate rotation so it always spins forward from the current rotation
    const currentRotation = rotation;
    const currentAngle = currentRotation % 360;
    let angleDiff = targetAngle - currentAngle;
    if (angleDiff <= 0) {
      angleDiff += 360;
    }
    const extraSpins = 5;
    const finalRotation = currentRotation + angleDiff + (extraSpins * 360);

    setRotation(finalRotation);

    setTimeout(() => {
      setSpinning(false);
      setWinner(selectedWinner);

      // Trigger Confetti Celebration!
      confetti({
        particleCount: 80,
        spread: 60,
        colors: ["#a78bfa", "#3b82f6", "#ec4899"],
      });
    }, 4500); // Animation duration matches transition
  };

  // Colors fallback is handled via user avatar color theme dynamically

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md glass-panel p-6 md:p-8 rounded-2xl border border-purple-500/25 relative overflow-hidden flex flex-col items-center"
      >
        {/* Top styling band */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-600 to-indigo-600"></div>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-heading text-xl uppercase tracking-wider text-white flex items-center justify-center gap-2">
            <Mic className="w-5 h-5 text-purple-400 animate-pulse" />
            Pass The Mic
          </h3>
          <p className="text-zinc-500 text-xs mt-1">
            Spin the roulette to select the next singer!
          </p>
        </div>

        {/* The SVG Wheel */}
        <div className="relative w-64 h-64 mb-6 flex items-center justify-center wheel-container select-none">
          {/* Top Pointer Arrow */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 20 L2 4 A2 2 0 0 1 4 1 L16 1 A2 2 0 0 1 18 4 Z" fill="#eab308" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          <motion.svg
            className="w-full h-full drop-shadow-2xl"
            viewBox="0 0 100 100"
            animate={{ rotate: rotation }}
            transition={{
              duration: 4.5,
              ease: [0.25, 0.1, 0.25, 1], // Cubic bezier for slowing down naturally
            }}
          >
            <defs>
              {/* Define gradients for matching avatar themes in SVG */}
              <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="grad-pink" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
              <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              
              {/* SVG filter for purple neon glow */}
              <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {candidates.map((candidate, idx) => {
              const numSlices = candidates.length;
              const angle = 360 / numSlices;
              const startAngle = idx * angle;
              const endAngle = (idx + 1) * angle;

              // Convert degrees to radians for drawing SVG arcs
              const rad = Math.PI / 180;
              const x1 = 50 + 45 * Math.cos(startAngle * rad);
              const y1 = 50 + 45 * Math.sin(startAngle * rad);
              const x2 = 50 + 45 * Math.cos(endAngle * rad);
              const y2 = 50 + 45 * Math.sin(endAngle * rad);

              const largeArcFlag = angle > 180 ? 1 : 0;

              // Redesign: alternating deep premium colors from the reference image
              const color = idx % 2 === 0 ? "#3b0764" : "#082f49";

              const avatar = getAvatarData(candidate);

              // Rotation for labels/icons in the middle of slice
              const textAngle = startAngle + angle / 2;

              // Position for circular avatar icon (Radially placed, kept upright)
              const avatarRad = 28;
              const avatarX = 50 + avatarRad * Math.cos(textAngle * rad);
              const avatarY = 50 + avatarRad * Math.sin(textAngle * rad);

              // Position for name label (Radially placed below avatar, kept upright)
              const nameRad = 16;
              const nameX = 50 + nameRad * Math.cos(textAngle * rad);
              const nameY = 50 + nameRad * Math.sin(textAngle * rad);

              // Determine gradient for avatar
              const getSvgGradientId = (gradientClass: string) => {
                if (gradientClass.includes("purple")) return "grad-purple";
                if (gradientClass.includes("blue")) return "grad-blue";
                if (gradientClass.includes("pink")) return "grad-pink";
                if (gradientClass.includes("emerald")) return "grad-emerald";
                if (gradientClass.includes("amber")) return "grad-amber";
                if (gradientClass.includes("red")) return "grad-red";
                return "grad-purple";
              };

              return (
                <g key={idx}>
                  {/* Wheel Slice */}
                  <path
                    d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={color}
                    stroke="#09090b"
                    strokeWidth="0.8"
                  />
                  
                  {/* Small Circular Avatar Icon (Kept upright - no rotation!) */}
                  <circle
                    cx={avatarX}
                    cy={avatarY}
                    r="4.5"
                    fill={`url(#${getSvgGradientId(avatar.gradient)})`}
                    stroke="#ffffff"
                    strokeWidth="0.5"
                    className="drop-shadow-md"
                  />
                  <text
                    x={avatarX}
                    y={avatarY}
                    fill="#ffffff"
                    fontSize="3"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="select-none pointer-events-none font-sans"
                  >
                    {avatar.emoji}
                  </text>

                  {/* Candidate Name Label (Kept upright - no rotation!) */}
                  <text
                    x={nameX}
                    y={nameY}
                    fill="#ffffff"
                    fontSize={candidates.length > 8 ? "2" : candidates.length > 5 ? "2.4" : "3"}
                    fontWeight="extrabold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="select-none font-sans pointer-events-none"
                    style={{
                      filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.95))",
                    }}
                  >
                    {candidate.slice(0, 7)}
                  </text>
                </g>
              );
            })}

            {/* Glowing Outer Rings */}
            <circle cx="50" cy="50" r="47" fill="none" stroke="#a855f7" strokeWidth="2" filter="url(#glow-purple)" opacity="0.6" className="pointer-events-none" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e1b4b" strokeWidth="1" className="pointer-events-none" />

            {/* Center Circle Pin */}
            <circle cx="50" cy="50" r="9" fill="#09090b" stroke="#a855f7" strokeWidth="1.2" />
            
            {/* Microphone Icon in Center */}
            <g transform="translate(47.4, 47.2) scale(0.22)" stroke="#d8b4fe" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="2" width="8" height="12" rx="4" fill="#a855f7" stroke="#d8b4fe" strokeWidth="2" />
              <path d="M 4 9 A 8 8 0 0 0 20 9" strokeWidth="2" />
              <line x1="12" y1="17" x2="12" y2="21" strokeWidth="2" />
              <line x1="8" y1="21" x2="16" y2="21" strokeWidth="2" />
            </g>
          </motion.svg>
        </div>

        {/* Candidates Selection list */}
        <div className="w-full mt-2 mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Draw Candidates ({candidates.length})
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-purple-400 select-none">
              <input
                type="checkbox"
                checked={includeOffline}
                disabled={spinning || !!winner}
                onChange={(e) => setIncludeOffline(e.target.checked)}
                className="rounded border-zinc-800 text-purple-500 focus:ring-0 focus:ring-offset-0 bg-zinc-950 w-3.5 h-3.5"
              />
              <span>Include Offline</span>
            </label>
          </div>
          
          <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {(() => {
              const onlineNames = users.filter((u) => u.is_online).map((u) => u.nickname);
              const offlineNames = users.filter((u) => !u.is_online).map((u) => u.nickname);
              const pool = Array.from(new Set([...onlineNames, ...offlineNames]));
              
              return pool.map((name) => {
                const inDraw = candidates.includes(name);
                const user = users.find((u) => u.nickname === name);
                const isOnline = user ? user.is_online : false;
                const avatar = getAvatarData(name);
                return (
                  <button
                    key={name}
                    disabled={spinning || !!winner}
                    onClick={() => handleVolunteer(name)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all min-w-[70px] cursor-pointer ${
                      inDraw
                        ? "bg-purple-950/20 border-purple-500/40 text-white"
                        : "bg-zinc-950/20 border-zinc-900 text-zinc-550 opacity-45 hover:opacity-75"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-xs font-bold text-white relative shadow ${!isOnline ? "grayscale opacity-60" : ""}`}>
                      <span>{avatar.initials}</span>
                      <span className="absolute -bottom-1 -right-1 text-[9px] bg-black/75 rounded-full px-0.5">{avatar.emoji}</span>
                    </div>
                    <span className="text-[9px] font-semibold truncate max-w-[56px]">{name}</span>
                    {!isOnline && <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider scale-90">Offline</span>}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* Results / Control Buttons */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {winner ? (
              <motion.div
                key="winner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center w-full space-y-4"
              >
                <div className="bg-zinc-950/60 border border-zinc-900 px-6 py-4 rounded-xl shadow-inner max-w-[280px] mx-auto relative">
                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-purple-400 animate-bounce" />
                  <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">
                    Selected Singer
                  </span>
                  {(() => {
                    const avatar = getAvatarData(winner);
                    return (
                      <div className="flex flex-col items-center gap-3 mt-1">
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-xl font-bold text-white relative shadow-lg shadow-purple-500/20 animate-bounce`}>
                          <span>{avatar.initials}</span>
                          <span className="absolute -bottom-1 -right-1 text-xs bg-black/70 rounded-full p-0.5">{avatar.emoji}</span>
                        </div>
                        <span className="font-heading text-2xl font-extrabold text-purple-400 uppercase tracking-wide">
                          🎤 {winner}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex gap-2 w-full pt-2">
                  <button
                    onClick={() => {
                      setWinner(null);
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs py-3 rounded-xl transition cursor-pointer"
                  >
                    SPIN AGAIN
                  </button>
                  <button
                    onClick={() => setPassTheMicVisible(false)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer"
                  >
                    START SINGING
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="controls" className="w-full text-center space-y-4">
                <button
                  disabled={spinning || candidates.length === 0}
                  onClick={spinWheel}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold tracking-widest rounded-xl py-3.5 shadow-lg shadow-purple-500/10 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {spinning ? "SPINNING ROULETTE..." : "SPIN WHEEL"}
                </button>

                <button
                  onClick={() => setPassTheMicVisible(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold underline transition cursor-pointer"
                >
                  Close Panel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
