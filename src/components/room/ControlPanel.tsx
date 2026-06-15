"use client";

import React, { useState, useEffect } from "react";
import { useRoom } from "../../hooks/useRoom";
import { useRoomStore } from "../../store/useRoomStore";
import { Search, Plus, ThumbsUp, Trash2, Play, Pause, SkipForward, AlertCircle, Sparkles, Mic, Disc, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScoringModal from "./ScoringModal";
import PassTheMic from "./PassTheMic";

interface ControlPanelProps {
  roomData: ReturnType<typeof useRoom>;
  activeTab?: "search" | "queue";
}

export default function ControlPanel({ roomData, activeTab }: ControlPanelProps) {
  const {
    room,
    queue,
    addSongToQueue,
    voteSong,
    playSong,
    pauseSong,
    resumeSong,
    skipSong,
    updateRoomSettings,
  } = roomData;

  const {
    nickname,
    hostToken,
    setPassTheMicVisible,
    autoScoringEnabled,
    showFreestylePrompt,
  } = useRoomStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [duplicateSong, setDuplicateSong] = useState<any | null>(null);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Search trigger
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Youtube search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSong = async (song: any) => {
    const res = await addSongToQueue({
      youtubeId: song.youtubeId,
      title: song.title,
      thumbnailUrl: song.thumbnailUrl,
      duration: song.duration,
      artist: song.artist,
    });

    if (res?.duplicate) {
      // Find matching duplicate item in queue
      const existing = queue.find((q) => q.song?.youtube_id === song.youtubeId);
      setDuplicateSong(existing);
      setDuplicateModalVisible(true);
    } else if (res?.success) {
      setNotificationMsg(`🎵 Queued: ${song.title.slice(0, 30)}...`);
      setTimeout(() => setNotificationMsg(null), 2500);
    }
  };

  const handleResolveDuplicate = (action: "upvote" | "cancel") => {
    if (action === "upvote" && duplicateSong) {
      voteSong(duplicateSong.id);
    }
    setDuplicateModalVisible(false);
    setDuplicateSong(null);
  };

  // Check if current user has host rights (hash comparison or simple local hash match)
  const isHost = room?.host_token === hostToken || isDemoModeHost();

  function isDemoModeHost() {
    return room?.host_token === "demo-host-token" && hostToken === "demo-host-token";
  }

  // Split queue items
  const playingSong = queue.find((item) => item.status === "playing");
  const pendingSongs = queue
    .filter((item) => item.status === "pending")
    .sort((a, b) => b.votes_count - a.votes_count || a.queue_position - b.queue_position);
  const recentlyPlayed = queue.filter((item) => item.status === "played").slice(-5);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Determine active view mode
  const showSearch = activeTab === "search";
  const showQueue = activeTab === "queue";

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 relative">
      {/* Dynamic inline notification toast */}
      <AnimatePresence>
        {notificationMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold text-xs py-3 px-6 rounded-xl border border-emerald-500 shadow-lg"
          >
            {notificationMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Overlays */}
      <ScoringModal roomData={roomData} />
      <PassTheMic roomData={roomData} />

      {/* 1. DUPLICATE SONG MODAL */}
      <AnimatePresence>
        {duplicateModalVisible && duplicateSong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-panel p-6 rounded-2xl border border-emerald-500/25 relative text-center space-y-4"
            >
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/20">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-heading text-lg text-white uppercase tracking-wider">
                Already Queued
              </h3>
              <p className="text-zinc-400 text-xs">
                "<span className="text-white font-medium">{duplicateSong.song?.title}</span>" is already in the queue.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleResolveDuplicate("upvote")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  MOVE EXISTING SONG UP
                </button>
                <button
                  onClick={() => handleResolveDuplicate("cancel")}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs py-3 rounded-xl transition cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SEARCH INTERFACE */}
      {(showSearch || !activeTab) && (
        <section className="flex-1 flex flex-col min-h-0 bg-zinc-950/20 rounded-xl">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-650" />
              <input
                type="text"
                required
                placeholder="Search songs or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/60 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-650 transition"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl active:scale-95 transition cursor-pointer flex items-center justify-center disabled:opacity-50 shadow-md shadow-purple-500/5"
            >
              {searchLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "SEARCH"
              )}
            </button>
          </form>

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
            {searchResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-16 text-zinc-600 text-center">
                <Music className="w-8 h-8 text-zinc-700 animate-pulse mb-2" />
                <p className="text-xs font-semibold uppercase tracking-wider">Search Youtube</p>
                <p className="text-[10px] text-zinc-650 mt-1 max-w-[200px]">
                  Find official karaoke backtracks and sing live!
                </p>
              </div>
            ) : (
              searchResults.map((song) => (
                <div
                  key={song.youtubeId}
                  className="flex items-center gap-3 bg-zinc-950/40 p-2 border border-zinc-900 rounded-xl hover:border-emerald-500/25 transition-all duration-200"
                >
                  <img
                    src={song.thumbnailUrl}
                    alt={song.title}
                    className="w-16 h-12 object-cover rounded-lg bg-zinc-900 border border-zinc-900"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] font-bold text-zinc-200 truncate leading-tight">
                      {song.title}
                    </h4>
                    <p className="text-[9px] text-zinc-550 font-semibold uppercase tracking-wider mt-1 truncate">
                      {song.artist || song.channelTitle} • {formatDuration(song.duration)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddSong(song)}
                    className="p-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 hover:border-purple-500 hover:scale-105 active:scale-95 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 3. QUEUE LIST INTERFACE */}
      {(showQueue || !activeTab) && (
        <section className="flex-1 flex flex-col min-h-0 bg-zinc-950/20 rounded-xl gap-4">
          {/* Host Quick Controller */}
          {isHost && (
            <div className="glass-panel p-4 rounded-xl flex flex-col gap-3.5 border border-purple-500/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">
                    Host DJ Controls
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={room?.is_playing ? pauseSong : resumeSong}
                    className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    {room?.is_playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={skipSong}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPassTheMicVisible(true)}
                    className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg px-3.5 transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-500/10"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    Pass Mic
                  </button>
                </div>
              </div>

              {/* Settings Toggles */}
              <div className="border-t border-zinc-900/60 pt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px]">
                <label className="switch-label text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoScoringEnabled}
                    onChange={(e) => updateRoomSettings({ autoScoringEnabled: e.target.checked })}
                    className="switch-input"
                  />
                  <div className="switch-track">
                    <div className="switch-thumb" />
                  </div>
                  <span>AI Auto-Scoring</span>
                </label>
                <label className="switch-label text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showFreestylePrompt}
                    onChange={(e) => updateRoomSettings({ showFreestylePrompt: e.target.checked })}
                    className="switch-input"
                  />
                  <div className="switch-track">
                    <div className="switch-thumb" />
                  </div>
                  <span>Freestyle Prompts</span>
                </label>
              </div>
            </div>
          )}

          {/* Queue Stack */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
            {/* Playing Now */}
            <div>
              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border-b border-zinc-900 pb-1 mb-2.5 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                <span>Playing Now</span>
              </h4>
              {playingSong ? (
                <div className="flex items-center gap-3 bg-emerald-600/10 p-2.5 border border-emerald-500/15 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-xl pointer-events-none rounded-full"></div>
                  <img
                    src={playingSong.song?.thumbnail_url}
                    alt={playingSong.song?.title}
                    className="w-16 h-12 object-cover rounded-lg bg-zinc-900 border border-emerald-500/15"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] font-extrabold text-white truncate leading-tight">
                      {playingSong.song?.title}
                    </h4>
                    <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-1 truncate">
                      Singer: {playingSong.requested_by_nickname} • {formatDuration(playingSong.song?.duration || 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-650 text-xs italic pl-4 py-2">No song playing currently</p>
              )}
            </div>

            {/* Up Next List */}
            <div>
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-1 mb-2.5">
                Up Next ({pendingSongs.length})
              </h4>
              {pendingSongs.length === 0 ? (
                <p className="text-zinc-600 text-xs italic pl-4 py-4">Queue is empty. Find some tracks!</p>
              ) : (
                <div className="space-y-2">
                  {pendingSongs.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-zinc-950/40 p-2 border border-zinc-900/60 hover:border-emerald-500/25 rounded-xl transition"
                    >
                      <div className="text-[11px] font-heading font-bold text-zinc-600 w-4 text-center">
                        #{index + 1}
                      </div>
                      <img
                        src={item.song?.thumbnail_url}
                        alt={item.song?.title}
                        className="w-12 h-9 object-cover rounded-md bg-zinc-900 border border-zinc-900"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-bold text-zinc-200 truncate leading-tight">
                          {item.song?.title}
                        </h4>
                        <p className="text-[8px] text-zinc-550 font-semibold uppercase mt-0.5 truncate">
                          Req: {item.requested_by_nickname} • {formatDuration(item.song?.duration || 0)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Vote Button */}
                        <button
                          onClick={() => voteSong(item.id)}
                          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition"
                        >
                          <ThumbsUp className="w-3 h-3 text-emerald-400" />
                          <span>{item.votes_count}</span>
                        </button>

                        {/* Direct Play button for Host */}
                        {isHost && (
                          <button
                            onClick={() => playSong(item.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg active:scale-95 transition cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-zinc-900 pb-1 mb-2.5">
                  Recently Sang
                </h4>
                <div className="space-y-1.5 opacity-60">
                  {recentlyPlayed.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center text-[10px] pl-3 py-1 border-l border-zinc-850"
                    >
                      <span className="text-zinc-300 truncate max-w-[200px]">
                        {item.song?.title}
                      </span>
                      <span className="text-zinc-500 font-bold uppercase tracking-wider">
                        {item.requested_by_nickname}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
