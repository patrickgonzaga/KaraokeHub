"use client";

import React, { useState, useEffect } from "react";
import { useRoom } from "../../hooks/useRoom";
import { useRoomStore } from "../../store/useRoomStore";
import { Star, Award, CheckCircle, Volume2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface ScoringModalProps {
  roomData: ReturnType<typeof useRoom>;
}

export default function ScoringModal({ roomData }: ScoringModalProps) {
  const { queue, submitScore } = roomData;
  const { scoringQueueItemId, setScoringQueueItemId, scoringModalVisible, setScoringModalVisible, nickname } = useRoomStore();

  const [voice, setVoice] = useState(5);
  const [presence, setPresence] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [impact, setImpact] = useState(5);
  const [choice, setChoice] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [aiTimeLeft, setAiTimeLeft] = useState(10);

  // Find queue item being scored
  const scoredItem = queue.find((q) => q.id === scoringQueueItemId);
  const activeAIScore = useRoomStore((state) => state.activeAIScore);
  const setActiveAIScore = useRoomStore((state) => state.setActiveAIScore);

  // Clear submission status when target item changes
  useEffect(() => {
    setSubmitted(false);
  }, [scoringQueueItemId]);

  // Timer for Manual Scoring Modal
  useEffect(() => {
    if (!scoringModalVisible || submitted) return;
    
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [scoringModalVisible, submitted]);

  // Timer for AI Scoring Overlay
  useEffect(() => {
    if (!activeAIScore) return;
    
    setAiTimeLeft(10);
    const interval = setInterval(() => {
      setAiTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeAIScore]);
  // If AI Scorer overlay is active, show the AI results screen to guests/hosts
  if (activeAIScore) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm glass-panel p-6 rounded-2xl border border-purple-500/20 text-center space-y-5 relative overflow-hidden"
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500"></div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-extrabold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Vocal Scorer</span>
          </div>

          <div className="space-y-1">
            <h3 className="font-heading text-xl text-white uppercase tracking-wider">
              {activeAIScore.singer}
            </h3>
            <p className="text-zinc-550 text-[10px] italic truncate">
              "{activeAIScore.songTitle}"
            </p>
          </div>

          <div className="w-24 h-24 mx-auto flex items-center justify-center rounded-full border-4 border-purple-500/20 bg-zinc-950 shadow-[0_0_20px_rgba(124,58,237,0.15)]">
            <span className="font-heading text-3xl font-extrabold text-white">
              {activeAIScore.score}%
            </span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <p className="text-zinc-300 text-xs font-medium italic leading-relaxed">
              "{activeAIScore.comment}"
            </p>
          </div>

          {/* AI Scorer Countdown Timer */}
          <div className="space-y-2 pt-1">
            <div className="w-full bg-zinc-900/40 h-1.5 rounded-full overflow-hidden border border-zinc-850">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: `${(aiTimeLeft / 10) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
                className="bg-purple-500 h-full"
              />
            </div>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
              Closing in {aiTimeLeft} seconds
            </p>
          </div>

          <button
            onClick={() => setActiveAIScore(null)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer"
          >
            COOL!
          </button>
        </motion.div>
      </div>
    );
  }

  if (!scoringModalVisible || !scoredItem) return null;

  const totalCalculatedScore = Math.round((voice + presence + energy + impact + choice) * 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitScore(voice, presence, energy, impact, choice);
    setSubmitted(true);

    // If score is premium/high (>= 80), celebrate with confetti!
    if (totalCalculatedScore >= 80) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#a78bfa", "#3b82f6", "#f472b6", "#22c55e"],
      });
    }

    // Auto close after 2.5 seconds
    setTimeout(() => {
      setScoringModalVisible(false);
      setScoringQueueItemId(null);
    }, 2800);
  };

  const sliders = [
    { label: "Voice / Pitch", val: voice, set: setVoice },
    { label: "Stage Presence", val: presence, set: setPresence },
    { label: "Energy / Hype", val: energy, set: setEnergy },
    { label: "Crowd Impact", val: impact, set: setImpact },
    { label: "Song Choice", val: choice, set: setChoice },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="w-full max-w-md glass-panel p-6 md:p-8 rounded-2xl border border-purple-500/20 relative overflow-hidden"
      >
        {/* Glow header banner */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500"></div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20 mb-3">
                  <Award className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-heading text-xl uppercase tracking-wider text-white">
                  Score Performance
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Rate <span className="text-purple-400 font-bold">{scoredItem.requested_by_nickname}</span>'s performance of:
                </p>
                <p className="text-white text-xs font-semibold mt-1 truncate italic">
                  "{scoredItem.song?.title}"
                </p>
              </div>

              {/* Slider Slates */}
              <div className="space-y-4 pt-2">
                {sliders.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-400">{s.label}</span>
                      <span className="text-purple-400 font-bold">{s.val} / 10</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={s.val}
                      onChange={(e) => s.set(parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-950 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                ))}
              </div>

              {/* Computed Score Display */}
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Total Crowd Score
                </span>
                <span className="font-heading text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400">
                  {totalCalculatedScore} / 100
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold tracking-wider rounded-xl py-3.5 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-purple-500/10"
              >
                <Star className="w-4.5 h-4.5" />
                SUBMIT RATING
              </button>

              {/* Manual scoring countdown progress bar */}
              <div className="space-y-2 pt-1 select-none">
                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeLeft / 15) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="bg-purple-500 h-full"
                  />
                </div>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center">
                  Closing in {timeLeft} seconds
                </p>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 space-y-4"
            >
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 mb-2">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="font-heading text-2xl uppercase tracking-wider text-emerald-400">
                Score Submitted!
              </h3>
              <div className="bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl max-w-xs mx-auto">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                  Overall Rating
                </span>
                <span className="font-heading text-4xl font-extrabold text-white">
                  {totalCalculatedScore}
                </span>
                <span className="block text-[10px] text-purple-400 font-bold mt-2">
                  {totalCalculatedScore >= 90
                    ? "🌟 legendary showstopper!"
                    : totalCalculatedScore >= 80
                    ? "🔥 absolute banger!"
                    : totalCalculatedScore >= 60
                    ? "🎤 respectable effort!"
                    : "👏 keep practicing!"}
                </span>
              </div>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider animate-pulse pt-2">
                Calculating room leaderboard averages...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
