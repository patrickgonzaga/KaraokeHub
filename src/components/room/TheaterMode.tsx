"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRoom } from "../../hooks/useRoom";
import { useRoomStore } from "../../store/useRoomStore";
import { parseLRC, LyricLine } from "../../lib/lyrics-parser";
import { Play, Pause, SkipForward, Volume2, VolumeX, Flame, Music, Disc, Sparkles, MessageSquare, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import PassTheMic from "./PassTheMic";

interface TheaterModeProps {
  roomData: ReturnType<typeof useRoom>;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

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

// Safe global script loader for YouTube Iframe API to prevent double script tag injection
let ytApiPromise: Promise<void> | null = null;
function loadYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) previousReady();
      resolve();
    };
    
    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });

  return ytApiPromise;
}

export default function TheaterMode({ roomData }: TheaterModeProps) {
  const {
    room,
    queue,
    messages,
    updatePlaybackTime,
    pauseSong,
    resumeSong,
    skipSong,
    submitScore,
    completeSongWithAIScore,
    clearAIScore,
    startManualScoring,
    endManualScoring,
  } = roomData;

  const {
    isTVMode,
    floatingReactions,
    setScoringQueueItemId,
    setScoringModalVisible,
    nickname,
    autoScoringEnabled,
    showFreestylePrompt,
    hostToken,
    activeAIScore,
    setPassTheMicVisible,
  } = useRoomStore();

  const [showIntroCard, setShowIntroCard] = useState(false);

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIdx, setCurrentLyricIdx] = useState(-1);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Client-side playback time interpolation to keep lyrics scrolling butter-smooth
  const [localTime, setLocalTime] = useState(0);

  const playerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lyricContainerRef = useRef<HTMLDivElement>(null);

  // Find currently playing song in queue
  const currentItem = queue.find((q) => q.status === "playing" || q.id === room?.current_song_id);

  // Sorted list of pending songs for the queue overlay
  const pendingSongs = queue
    .filter((item) => item.status === "pending")
    .sort((a, b) => b.votes_count - a.votes_count || a.queue_position - b.queue_position);

  // Monitor song changes to display intro card & reset errors
  useEffect(() => {
    setPlaybackError(null);
    if (currentItem?.id) {
      setShowIntroCard(true);
      const timer = setTimeout(() => {
        setShowIntroCard(false);
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setShowIntroCard(false);
    }
  }, [currentItem?.id]);

  // 1. Fetch and Parse Lyrics
  useEffect(() => {
    if (!currentItem?.song) {
      setLyrics([]);
      setCurrentLyricIdx(-1);
      return;
    }

    const fetchLyrics = async () => {
      setLyricsLoading(true);
      try {
        const title = encodeURIComponent(currentItem.song?.title || "");
        const artist = encodeURIComponent(currentItem.song?.artist || "");
        const ytId = currentItem.song?.youtube_id || "";
        
        const res = await fetch(`/api/lyrics?track=${title}&artist=${artist}&youtubeId=${ytId}`);
        const data = await res.json();
        
        if (data.lyrics) {
          const parsed = parseLRC(data.lyrics);
          setLyrics(parsed);
        } else {
          setLyrics([]);
        }
      } catch (err) {
        console.error("Failed to load lyrics:", err);
        setLyrics([]);
      } finally {
        setLyricsLoading(false);
      }
    };

    fetchLyrics();
  }, [currentItem?.song?.id]);

  // 2. Unified playback time tracking
  // Uses a single interval to avoid conflicting setLocalTime calls.
  // Reads from the YouTube player when available (accurate), falls back to JS interpolation.
  // Stores isTVMode in a ref so the interval closure doesn't go stale without re-registering.
  const isTVModeRef = useRef(isTVMode);
  useEffect(() => { isTVModeRef.current = isTVMode; }, [isTVMode]);

  const updatePlaybackTimeRef = useRef(updatePlaybackTime);
  useEffect(() => { updatePlaybackTimeRef.current = updatePlaybackTime; }, [updatePlaybackTime]);

  useEffect(() => {
    if (!room?.is_playing) return;

    // Capture start time for JS interpolation fallback
    let interpolatedStart = Date.now() - localTime * 1000;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        // Ground truth from actual YouTube player
        try {
          const playerTime = playerRef.current.getCurrentTime();
          if (typeof playerTime === "number" && playerTime >= 0) {
            setLocalTime(playerTime);
            // DB sync only from TV Mode to avoid hammering
            if (isTVModeRef.current) {
              updatePlaybackTimeRef.current(playerTime);
            }
            return;
          }
        } catch (_) {}
      }
      // Fallback: JS interpolation when player not ready
      const elapsed = (Date.now() - interpolatedStart) / 1000;
      setLocalTime(elapsed);
    }, 200);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.is_playing]); // Intentionally only re-register when play state changes

  // Snap local clock if it drifts >2s from database master time
  useEffect(() => {
    if (room && Math.abs(localTime - room.playback_time) > 2) {
      setLocalTime(room.playback_time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.playback_time]); // Only check when DB time updates


  // Find active lyric line index based on localTime
  useEffect(() => {
    if (lyrics.length === 0) return;
    
    // Find last line that has time <= localTime
    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= localTime) {
        activeIdx = i;
      } else {
        break;
      }
    }
    
    setCurrentLyricIdx(activeIdx);
  }, [localTime, lyrics]);

  // Smooth scroll active lyric to center of list
  useEffect(() => {
    if (currentLyricIdx >= 0 && lyricContainerRef.current) {
      const activeEl = lyricContainerRef.current.children[currentLyricIdx] as HTMLElement;
      if (activeEl) {
        const containerHeight = lyricContainerRef.current.clientHeight;
        const elemTop = activeEl.offsetTop;
        const elemHeight = activeEl.clientHeight;
        
        lyricContainerRef.current.scrollTo({
          top: elemTop - containerHeight / 2 + elemHeight / 2,
          behavior: "smooth",
        });
      }
    }
  }, [currentLyricIdx]);

  // 3. YouTube Player Setup (works in BOTH TV Mode and controller mode)
  useEffect(() => {
    let mounted = true;

    if (!currentItem?.song?.youtube_id) {
      // Clear player refs if no song
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
      }
      return;
    }

    const initPlayer = () => {
      if (!mounted) return;
      if (!window.YT || !window.YT.Player) return;

      // Destroy old player instance if exists
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
      }

      const targetIframeId = isTVMode ? "youtube-player-tv" : "youtube-player-ctrl";
      const container = document.getElementById(targetIframeId);
      
      // Retry in the next tick if target container is not yet mounted in DOM
      if (!container) {
        setTimeout(() => {
          if (mounted) initPlayer();
        }, 50);
        return;
      }

      playerRef.current = new window.YT.Player(targetIframeId, {
        videoId: currentItem.song?.youtube_id,
        playerVars: {
          autoplay: room?.is_playing ? 1 : 0,
          controls: isTVMode ? 0 : 1,
          disablekb: isTVMode ? 1 : 0,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: (event: any) => {
            if (!mounted) return;
            if (room?.is_playing) {
              event.target.playVideo();
            }
            if (isMuted) {
              event.target.mute();
            }
          },
          onStateChange: (event: any) => {
            if (!mounted) return;
            // YT.PlayerState.ENDED = 0
            if (event.data === 0) {
              handleSongFinished();
            }
          },
          onError: (event: any) => {
            if (!mounted) return;
            const code = event.data;
            let msg = "Video playback error.";
            if (code === 101 || code === 150) {
              msg = "This video is not embeddable outside YouTube.";
            } else if (code === 100) {
              msg = "This video is unavailable or deleted.";
            } else if (code === 2) {
              msg = "Invalid video ID.";
            }
            setPlaybackError(`${msg} Skipping in 3 seconds...`);

            // Only the master screen (TV or Host) should trigger the skip
            const isMaster = isTVMode || (room?.host_token === hostToken);
            if (isMaster) {
              setTimeout(() => {
                if (mounted) {
                  skipSong();
                }
              }, 3000);
            }
          },
        },
      });
    };

    loadYoutubeApi().then(() => {
      initPlayer();
    });

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTVMode, currentItem?.song?.youtube_id]);

  // Synergized Youtube Player commands (Pause, Play) matching Room model updates
  useEffect(() => {
    if (playerRef.current && playerRef.current.getPlayerState) {
      const state = playerRef.current.getPlayerState();
      if (room?.is_playing && state !== 1) {
        playerRef.current.playVideo();
      } else if (!room?.is_playing && state === 1) {
        playerRef.current.pauseVideo();
      }
    }
  }, [room?.is_playing]);




  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  // Trigger confetti when activeAIScore is received (e.g. on TV and controllers)
  useEffect(() => {
    if (activeAIScore) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#06b6d4", "#f472b6", "#a78bfa", "#fbbf24"],
      });
    }
  }, [activeAIScore]);

  const handleSongFinished = () => {
    if (!currentItem) return;

    // Only one master screen triggers the score to prevent duplication
    const isMaster = isTVMode || (room?.host_token === hostToken);
    if (!isMaster) return;

    if (autoScoringEnabled) {
      const randomScore = Math.floor(Math.random() * 31) + 69; // 69 to 99%
      const aiComments = [
        "Pitch perfect! Whitney Houston would be proud.",
        "Incredible energy! The neighbors are calling the police... to join the party!",
        "Nice vocals! A bit pitchy in the bridge, but you recovered like a pro.",
        "Vocal cords of steel! You belong on a stadium tour.",
        "Great choice of song. Your stage presence was highly charismatic!",
        "A solid performance! Room for improvement, but definitely playlist-worthy.",
        "You hit the high notes with confidence! Amazing work.",
        "What a showstopper! The crowd is going absolutely wild."
      ];
      const randomComment = aiComments[Math.floor(Math.random() * aiComments.length)];

      completeSongWithAIScore(
        randomScore,
        randomComment,
        currentItem.requested_by_nickname,
        currentItem.song?.title || "Unknown Track"
      );

      // Auto clear score and skip after 10 seconds
      setTimeout(() => {
        clearAIScore();
        skipSong();
      }, 10000);
    } else {
      // Manual scoring
      if (typeof startManualScoring === "function") {
        startManualScoring(currentItem.id);
      } else {
        setScoringQueueItemId(currentItem.id);
        setScoringModalVisible(true);
      }

      // Auto close/skip after 15 seconds
      setTimeout(() => {
        if (typeof endManualScoring === "function") {
          endManualScoring();
        } else {
          setScoringModalVisible(false);
          setScoringQueueItemId(null);
        }
        skipSong();
      }, 15000);
    }
  };

  // Format seconds helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ---------------------------------------------------------------------------
  // CONTROLLER / NON-TV MODE DISPLAY
  // ---------------------------------------------------------------------------
  if (!isTVMode) {
    return (
      <div className="relative w-full rounded-xl bg-zinc-950/80 border border-zinc-900 overflow-hidden shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/10 via-zinc-950 to-teal-950/10 z-0 pointer-events-none" />

        {currentItem ? (
          <>
            {/* Actual YouTube Player (with controls visible so user can interact) */}
            <div className="relative w-full aspect-video">
              <div id="youtube-player-ctrl" className="absolute inset-0 w-full h-full" />

              {/* Playback Error Overlay */}
              {playbackError && (
                <div className="absolute inset-0 z-40 bg-zinc-950/95 flex flex-col items-center justify-center p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse mb-2" />
                  <p className="text-zinc-200 text-[10px] font-extrabold uppercase tracking-wider">Playback Error</p>
                  <p className="text-zinc-450 text-[9px] mt-1 max-w-[220px] font-semibold">{playbackError}</p>
                </div>
              )}

              {/* Lyrics overlay strip at bottom of player */}
              <div className="absolute inset-x-0 bottom-0 z-20 px-4 py-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none select-none flex flex-col items-center">
                {lyrics.length > 0 && currentLyricIdx >= 0 ? (
                  <div className="bg-black/70 backdrop-blur-sm px-4 py-1.5 rounded-xl border border-white/10 text-center max-w-full">
                    <p className="text-white text-sm font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
                      {lyrics[currentLyricIdx].text}
                    </p>
                    {currentLyricIdx + 1 < lyrics.length && (
                      <p className="text-zinc-400 text-[10px] font-semibold opacity-70 truncate">
                        Next: {lyrics[currentLyricIdx + 1].text}
                      </p>
                    )}
                  </div>
                ) : lyricsLoading ? (
                  <p className="text-zinc-500 text-[10px] italic animate-pulse">Loading lyrics...</p>
                ) : showFreestylePrompt ? (
                  <div className="bg-black/70 backdrop-blur-sm px-4 py-1.5 rounded-xl border border-white/10 text-center max-w-full">
                    <p className="text-zinc-400 text-[10px] font-bold tracking-wide">
                      Lyrics not found, time to freestyle! 🎤
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Song info badge top-left */}
              <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-zinc-950/85 backdrop-blur-md py-1.5 px-3 rounded-lg border border-zinc-800 shadow pointer-events-none">
                <Disc className={`w-3.5 h-3.5 text-purple-400 ${room?.is_playing ? "animate-spin-slow" : ""}`} />
                <span className="text-[10px] font-bold text-white truncate max-w-[160px]">
                  {currentItem.song?.title}
                </span>
                <span className="text-[9px] text-purple-400 font-bold border-l border-zinc-800 pl-2 uppercase">
                  {currentItem.requested_by_nickname}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* No song playing - show placeholder */
          <div className="w-full aspect-video flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-3 flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800">
              <Music className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-xs font-semibold tracking-widest uppercase">
              STAGE READY
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">
              Search for a song, add it to the queue, then press the <span className="text-purple-400 font-bold">▶ Play</span> button next to it!
            </p>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // FULL TV SCREEN MODE DISPLAY
  // ---------------------------------------------------------------------------
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Cinematic Backdrops Copy (Ambient glow behind player iframe) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-transparent to-[#020205] z-10 pointer-events-none"></div>

      {/* Synchronized Floating Reactions */}
      <div className="absolute inset-x-0 bottom-16 h-[70vh] pointer-events-none z-20 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map((react) => (
            <motion.div
              key={react.id}
              initial={{ y: "80vh", x: `${react.offset}vw`, scale: 0.6, opacity: 0 }}
              animate={{ y: "-10vh", opacity: [0, 1, 1, 0], scale: 1.3, rotate: react.twist }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
              className="absolute text-4xl"
            >
              {react.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Live Chat Overlay (TV Mode) */}
      <div className="absolute bottom-6 left-6 z-30 w-80 max-h-[300px] flex flex-col justify-end gap-2 overflow-hidden pointer-events-none">
        {messages.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-purple-400 uppercase tracking-widest px-2.5 mb-1 bg-black/60 backdrop-blur-md self-start py-1.5 rounded-lg border border-zinc-800/40">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span>Live Chat</span>
          </div>
        )}
        <div className="flex flex-col gap-2 overflow-y-auto pr-2 scrollbar-none">
          <AnimatePresence>
            {messages.slice(-5).map((msg) => {
              const avatar = getAvatarData(msg.nickname);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 155, damping: 18 }}
                  className="flex items-start gap-2.5 bg-black/70 backdrop-blur-md border border-zinc-900/60 p-2.5 rounded-2xl shadow-xl max-w-full"
                >
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${avatar.gradient} flex-shrink-0 flex items-center justify-center text-[10px] font-extrabold text-white shadow-inner relative`}>
                    <span>{avatar.initials}</span>
                    <span className="absolute -top-1 -right-1 text-[9px]">{avatar.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-purple-400 text-[11px] block leading-tight">
                      {msg.nickname}
                    </span>
                    <span className="text-zinc-200 text-xs break-words font-semibold mt-0.5 block leading-normal">
                      {msg.message}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Canvas Player Layer */}
      <div className="relative w-full max-w-[1200px] aspect-video rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-zinc-900/60 z-10 flex bg-zinc-950">
        {/* AI Scoring Display Overlay */}
        <AnimatePresence>
          {activeAIScore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.85, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 20 }}
                transition={{ type: "spring", stiffness: 120, damping: 15 }}
                className="space-y-6 max-w-lg"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-extrabold uppercase tracking-widest animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Performance Rating</span>
                </div>
                
                <div className="space-y-1">
                  <h2 className="font-heading text-4xl text-white uppercase tracking-wider">
                    {activeAIScore.singer}
                  </h2>
                  <p className="text-zinc-500 text-xs italic truncate">
                    "{activeAIScore.songTitle}"
                  </p>
                </div>

                {/* Rating circle */}
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center rounded-full border-4 border-purple-500/20 shadow-[0_0_30px_rgba(124,58,237,0.15)] bg-zinc-950">
                  <div className="text-center">
                    <span className="font-heading text-5xl font-extrabold text-white">
                      {activeAIScore.score}
                    </span>
                    <span className="text-zinc-400 text-lg font-bold">%</span>
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-zinc-300 text-sm font-semibold italic leading-relaxed">
                    "{activeAIScore.comment}"
                  </p>
                </div>

                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest animate-pulse">
                  Skipping to next track...
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Playback Error Overlay */}
        <AnimatePresence>
          {playbackError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.85, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 20 }}
                transition={{ type: "spring", stiffness: 120, damping: 15 }}
                className="space-y-4 max-w-md"
              >
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-rose-500/20 text-rose-500 border border-rose-500/20">
                  <AlertTriangle className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="font-heading text-xl text-white uppercase tracking-wider">
                  Playback Error
                </h3>
                <p className="text-zinc-300 text-sm font-semibold">
                  {playbackError}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentItem ? (
          <>
            {/* The Real YouTube Embedded Iframe */}
            <div className="absolute inset-0 w-full h-full">
              <div id="youtube-player-tv" className="w-full h-full" />
            </div>

            {/* In-Frame Lyrics Overlay - Cinematic overlay style */}
            {(lyrics.length > 0 || lyricsLoading || showFreestylePrompt) && (
              <div className="absolute inset-x-0 bottom-6 z-20 px-6 pointer-events-none select-none flex flex-col items-center">
                <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center max-w-2xl shadow-xl flex flex-col gap-2">
                  {lyrics.length > 0 && currentLyricIdx >= 0 ? (
                    <>
                      <p className="text-white text-base md:text-xl font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-heading">
                        {lyrics[currentLyricIdx].text}
                      </p>
                      {currentLyricIdx + 1 < lyrics.length && (
                        <p className="text-zinc-550 text-xs md:text-sm font-semibold opacity-70 tracking-wider">
                          Next: {lyrics[currentLyricIdx + 1].text}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-zinc-400 text-xs md:text-sm italic">
                      {lyricsLoading ? "Fetching timed lyrics..." : "Lyrics not found, time to freestyle! 🎤"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* In-Frame Mini Stats Overlay */}
            {!showIntroCard && (
              <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-none select-none">
                <div className="bg-zinc-950/80 backdrop-blur-md py-2 px-3.5 rounded-xl border border-zinc-800 shadow-xl flex items-center gap-2.5 text-xs">
                  <Disc className="w-4 h-4 text-purple-400 animate-spin-slow" />
                  <div>
                    <span className="font-bold text-white block max-w-[200px] truncate">
                      {currentItem.song?.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                      Added by: <span className="text-purple-400 font-bold uppercase">{currentItem.requested_by_nickname}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Song Intro Card Overlay (TV Mode only) */}
            <AnimatePresence>
              {showIntroCard && currentItem && !activeAIScore && (
                <motion.div
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-50%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="absolute left-6 top-6 z-40 bg-zinc-950/85 backdrop-blur-md px-6 py-5 rounded-2xl border border-purple-500/20 shadow-2xl flex items-center gap-4 max-w-md select-none"
                >
                  {(() => {
                    const requesterNickname = currentItem.requested_by_nickname || "Guest";
                    const avatar = getAvatarData(requesterNickname);
                    return (
                      <>
                        {/* Requester Avatar */}
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-lg font-bold text-white relative shadow-md flex-shrink-0`}>
                          <span>{avatar.initials}</span>
                          <span className="absolute -bottom-1 -right-1 text-xs bg-black/60 rounded-full px-0.5">{avatar.emoji}</span>
                        </div>
                        {/* Song Metadata */}
                        <div className="flex-1 min-w-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/15 text-[8px] font-extrabold uppercase tracking-widest mb-1.5 animate-pulse">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>UP NEXT</span>
                          </span>
                          <h3 className="font-heading text-lg font-extrabold text-white truncate leading-tight drop-shadow-md">
                            {currentItem.song?.title}
                          </h3>
                          {currentItem.song?.artist && (
                            <p className="text-zinc-400 text-xs font-semibold mt-0.5 truncate uppercase tracking-wider">
                              {currentItem.song?.artist}
                            </p>
                          )}
                          <p className="text-[10px] text-zinc-500 mt-2 font-medium">
                            Singing: <span className="text-purple-400 font-bold uppercase">{requesterNickname}</span>
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* TV Player Controls (Bottom strip, only shows on hover) */}
            <div className="absolute bottom-0 inset-x-0 z-30 py-3 px-6 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-between pointer-events-auto opacity-0 hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-4">
                <button
                  onClick={room?.is_playing ? pauseSong : resumeSong}
                  className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition cursor-pointer"
                >
                  {room?.is_playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={skipSong}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleMute}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-[11px] text-zinc-400 font-bold">
                {formatTime(localTime)} / {formatTime(currentItem.song?.duration || 0)}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-zinc-500">
            <Music className="w-12 h-12 text-zinc-700 animate-pulse mb-3" />
            <h2 className="font-heading text-xl text-zinc-400 uppercase tracking-widest">
              Stage Empty
            </h2>
            <p className="text-xs text-zinc-650 mt-1 max-w-xs">
              Go to your controller and add a song to the queue!
            </p>
          </div>
        )}
      </div>

      {/* Persistent DJ controls at the bottom of the TV screen */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-zinc-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-zinc-900/50 shadow-2xl flex items-center gap-4">
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-900/80">
          <Disc className={`w-4 h-4 text-purple-400 ${room?.is_playing ? "animate-spin-slow" : ""}`} />
          <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">
            DJ PLAY CONTROLS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={room?.is_playing ? pauseSong : resumeSong}
            className="p-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition active:scale-95 cursor-pointer shadow-md shadow-purple-500/10"
            title={room?.is_playing ? "Pause" : "Play"}
          >
            {room?.is_playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={skipSong}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-850 rounded-xl transition active:scale-95 cursor-pointer"
            title="Skip"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMute}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-850 rounded-xl transition active:scale-95 cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setPassTheMicVisible(true)}
            className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-[10px] font-extrabold tracking-widest rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-500/10"
            title="Pass The Mic"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>PASS MIC</span>
          </button>
        </div>
        {currentItem && (
          <div className="text-[11px] text-zinc-400 font-bold pl-3 border-l border-zinc-900/80">
            {formatTime(localTime)} / {formatTime(currentItem.song?.duration || 0)}
          </div>
        )}
      </div>

      {/* Queued Songs Overlay (TV Mode) */}
      <div className="absolute bottom-6 right-6 z-30 w-80 max-h-[300px] flex flex-col justify-end gap-2 overflow-hidden pointer-events-none">
        {pendingSongs.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-purple-400 uppercase tracking-widest px-2.5 mb-1 bg-black/60 backdrop-blur-md self-end py-1.5 rounded-lg border border-zinc-800/40 pointer-events-auto">
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>Up Next ({pendingSongs.length})</span>
          </div>
        )}
        <div className="flex flex-col gap-2 overflow-y-auto pr-2 scrollbar-none">
          <AnimatePresence>
            {pendingSongs.slice(0, 4).map((item, index) => {
              const avatar = getAvatarData(item.requested_by_nickname);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 155, damping: 18 }}
                  className="flex items-center gap-2.5 bg-black/70 backdrop-blur-md border border-zinc-900/60 p-2.5 rounded-2xl shadow-xl max-w-full pointer-events-auto"
                >
                  <div className="text-[10px] font-bold text-zinc-500 w-4 text-center">
                    #{index + 1}
                  </div>
                  <img
                    src={item.song?.thumbnail_url}
                    alt={item.song?.title}
                    className="w-10 h-7 object-cover rounded bg-zinc-900 border border-zinc-900/40 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-zinc-200 text-xs block truncate leading-tight">
                      {item.song?.title}
                    </span>
                    <span className="text-zinc-400 text-[10px] truncate mt-0.5 block">
                      Singer: <span className="text-purple-400 font-bold uppercase">{item.requested_by_nickname}</span>
                    </span>
                  </div>
                  {item.votes_count > 1 && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                      ▲ {item.votes_count}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Pass The Mic Modal Overlay */}
      <PassTheMic roomData={roomData} />
    </div>
  );
}
