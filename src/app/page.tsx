"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoomStore } from "../store/useRoomStore";
import { supabase } from "../hooks/useSupabase";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Plus, LogIn, Sparkles, Tv, HelpCircle, Users } from "lucide-react";
import { safeUUID } from "../lib/uuid";

// Check if we are running in local offline demo mode
const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-url");

export default function Home() {
  const router = useRouter();
  const { userId, initializeClient, setNickname, setHostToken, setTVMode, setPendingRoomName } = useRoomStore();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [roomName, setRoomName] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize local user ID on load
  useEffect(() => {
    initializeClient();
  }, [initializeClient]);

  // Pre-generate stable particle data to avoid hydration mismatch
  // (Math.random() on server vs client would cause different values)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      width: Math.random() * 8 + 4,
      height: Math.random() * 8 + 4,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 6 + 4,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only compute once on mount

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !nicknameInput.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const generatedCode = generateRoomCode();
    const generatedHostToken = safeUUID();

    // Store user choices locally
    setNickname(nicknameInput.trim());
    setHostToken(generatedHostToken);
    setPendingRoomName(roomName.trim());
    setTVMode(false); // Default to controller on redirect, users can toggle TV Mode on the room screen

    if (isDemoMode) {
      setTimeout(() => {
        setIsLoading(false);
        router.push(`/room/${generatedCode}`);
      }, 1000);
      return;
    }

    try {
      // Create room record in Supabase
      const { data: newRoom, error: roomErr } = await supabase
        .from("rooms")
        .insert({
          code: generatedCode,
          name: roomName.trim(),
          host_token: generatedHostToken,
          is_playing: false,
          playback_time: 0,
        })
        .select("id")
        .single();

      if (roomErr || !newRoom) {
        throw new Error(roomErr?.message || "Failed to create room.");
      }

      // Add current user as host
      const { error: userErr } = await supabase.from("room_users").insert({
        id: userId || undefined,
        room_id: newRoom.id,
        nickname: nicknameInput.trim(),
        role: "host",
        is_online: true,
      });

      if (userErr) throw userErr;

      // Add Initial Feed event
      await supabase.from("party_events").insert({
        room_id: newRoom.id,
        event_type: "joined",
        nickname: nicknameInput.trim(),
        details: "created the room and joined as Host",
      });

      router.push(`/room/${generatedCode}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to initialize room. Please try again.");
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !nicknameInput.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const targetCode = roomCode.trim().toUpperCase();

    // Store user choices locally
    setNickname(nicknameInput.trim());
    setTVMode(false);

    if (isDemoMode) {
      setTimeout(() => {
        setIsLoading(false);
        router.push(`/room/${targetCode}`);
      }, 1000);
      return;
    }

    try {
      // Verify room exists
      const { data: dbRoom, error: roomErr } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("code", targetCode)
        .single();

      if (roomErr || !dbRoom) {
        throw new Error("Room not found. Please check the code and try again.");
      }

      // Add user to the room
      const { error: userErr } = await supabase.from("room_users").insert({
        id: userId || undefined,
        room_id: dbRoom.id,
        nickname: nicknameInput.trim(),
        role: "guest",
        is_online: true,
      });

      // It's fine if they've already joined before, we will handle that in room page
      if (userErr && !userErr.message.includes("duplicate")) {
        throw userErr;
      }

      router.push(`/room/${targetCode}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to join room. Please check the code.");
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 md:px-8">
      {/* Decorative neon ambient blobs */}
      <div className="ambient-glow-wrapper top-1/4 left-1/4 w-80 h-80 bg-emerald-950/30 rounded-full"></div>
      <div className="ambient-glow-wrapper bottom-1/4 right-1/4 w-96 h-96 bg-teal-950/20 rounded-full"></div>

      {/* Floating particles background effect - only render client-side to avoid hydration mismatch */}
      {isMounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-emerald-500/40"
              style={{
                width: p.width,
                height: p.height,
                left: `${p.left}%`,
                top: `${p.top}%`,
              }}
              animate={{
                y: ["0px", "-100px"],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-md z-10 flex flex-col items-center">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="relative mb-3 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <Music className="w-8 h-8 animate-float" />
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-emerald-300 animate-pulse" />
          </div>
          <h1 className="font-heading text-4xl md:text-5xl tracking-wide uppercase">
            <span className="gradient-text font-bold">Karaoke</span>
            <span className="text-white">Hub</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-2 tracking-wide font-medium">
            Turn Any Screen Into Karaoke Night.
          </p>
        </motion.div>

        {/* Tab Controls */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full glass-panel p-1 rounded-xl flex mb-6 border border-zinc-800"
        >
          <button
            onClick={() => {
              setActiveTab("create");
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "create"
                ? "bg-gradient-to-r from-emerald-650 to-teal-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
          <button
            onClick={() => {
              setActiveTab("join");
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "join"
                ? "bg-gradient-to-r from-emerald-650 to-teal-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LogIn className="w-4 h-4" />
            Join Room
          </button>
        </motion.div>

        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full glass-panel p-6 md:p-8 rounded-2xl border border-zinc-800/80 shadow-2xl relative overflow-hidden"
        >
          {/* Neon side accents */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>

          <AnimatePresence mode="wait">
            {activeTab === "create" ? (
              <motion.form
                key="create"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleCreateRoom}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="room-name" className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2">
                    Room Name
                  </label>
                  <input
                    id="room-name"
                    type="text"
                    required
                    placeholder="e.g., Friday Night Karaoke"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="create-nickname" className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2">
                    Your Nickname
                  </label>
                  <input
                    id="create-nickname"
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g., Patrick"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                {errorMsg && (
                  <div className="text-rose-400 text-xs font-medium p-3 rounded-lg bg-rose-950/30 border border-rose-900/50">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold tracking-wider rounded-xl py-4 hover:opacity-90 active:scale-[0.98] transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Tv className="w-5 h-5" />
                      CREATE ROOM
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="join"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleJoinRoom}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="room-code" className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2">
                    Room Code
                  </label>
                  <input
                    id="room-code"
                    type="text"
                    required
                    autoComplete="off"
                    maxLength={6}
                    placeholder="e.g., ABC123"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-center uppercase tracking-widest font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="join-nickname" className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2">
                    Your Nickname
                  </label>
                  <input
                    id="join-nickname"
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g., Sarah"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                {errorMsg && (
                  <div className="text-rose-400 text-xs font-medium p-3 rounded-lg bg-rose-950/30 border border-rose-900/50">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold tracking-wider rounded-xl py-4 hover:opacity-90 active:scale-[0.98] transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      JOIN ROOM
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Fast Instructions Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex gap-6 text-zinc-500 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>No Signup Required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5" />
            <span>TV Display Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Mobile Controller</span>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
