"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRoom } from "../../hooks/useRoom";
import { MessageSquare, Flame, History, Send, Smile, Info, Radio } from "lucide-react";
import { useRoomStore } from "../../store/useRoomStore";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarRightProps {
  roomData: ReturnType<typeof useRoom>;
  activeTab?: "chat" | "feed"; // For mobile split views
}

export default function SidebarRight({ roomData, activeTab }: SidebarRightProps) {
  const { messages, sendChatMessage, sendReaction, partyEvents, sendTypingState } = roomData;
  const { nickname, typingUsers } = useRoomStore();

  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Send chat
    sendChatMessage(chatInput.trim());
    setChatInput("");

    // Clear typing state
    sendTypingState(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);

    // Trigger typing state
    sendTypingState(true);

    // Reset typing state after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingState(false);
    }, 2000);
  };

  // Reactions list
  const emojis = ["🔥", "👏", "😂", "🎤", "🎉", "❤️", "🤘"];

  // Determine active render mode
  const showChat = !activeTab || activeTab === "chat";
  const showFeed = !activeTab || activeTab === "feed";

  // Build the list of typing users (excluding ourselves)
  const otherTypingUsers = Object.keys(typingUsers).filter((user) => user !== nickname);

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-hidden select-none">
      {/* 1. REACTIONS ROW (Desktop or Chat active) */}
      {showChat && (
        <section className="glass-panel p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-widest mb-2.5">
            <Flame className="w-4 h-4 text-pink-500" />
            <span>Spam Reactions</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-9 h-9 text-lg flex items-center justify-center bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-900 hover:border-purple-500 hover:scale-110 active:scale-95 rounded-xl transition cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 2. LIVE CHAT SYSTEM */}
      {showChat && (
        <section className={`glass-panel p-4 rounded-xl flex flex-col overflow-hidden ${showFeed ? "flex-1" : "h-[calc(100vh-230px)]"}`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-zinc-900 pb-2.5 mb-3">
            <MessageSquare className="w-4 h-4" />
            <span>Live Chat</span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 select-text">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                <Info className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-xs italic">
                  No chat messages yet. Spark a conversation!
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="text-xs break-words">
                  <span className="font-bold text-purple-400 mr-1.5 hover:underline cursor-pointer">
                    {msg.nickname}:
                  </span>
                  <span className="text-zinc-200">{msg.message}</span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Typing Indicator */}
          {otherTypingUsers.length > 0 && (
            <div className="text-[10px] text-zinc-500 italic py-1 px-0.5 animate-pulse">
              {otherTypingUsers.join(", ")} {otherTypingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="flex gap-1.5 mt-2">
            <input
              type="text"
              required
              maxLength={150}
              placeholder="Type message..."
              value={chatInput}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-950/60 border border-zinc-900 focus:border-purple-500/60 focus:outline-none rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 transition"
            />
            <button
              type="submit"
              className="p-2.5 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white rounded-xl active:scale-95 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>
      )}

      {/* 3. LIVE PARTY FEED & ACTIVITY */}
      {showFeed && (
        <section className={`glass-panel p-4 rounded-xl flex flex-col overflow-hidden ${showChat ? "h-64" : "h-[calc(100vh-120px)]"}`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-zinc-900 pb-2.5 mb-3">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Party Activity Feed</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
            {partyEvents.length === 0 ? (
              <p className="text-zinc-600 text-xs italic text-center py-4">
                No activity logged. Let's make some noise!
              </p>
            ) : (
              partyEvents.map((evt) => (
                <div key={evt.id} className="text-[11px] leading-relaxed border-l-2 border-zinc-800 pl-2">
                  <span className="font-bold text-zinc-300">{evt.nickname}</span>{" "}
                  <span className="text-zinc-400">{evt.details}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
