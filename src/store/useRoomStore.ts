import { create } from "zustand";

export interface FloatingReaction {
  id: string;
  emoji: string;
  twist: number; // degrees of rotation
  offset: number; // horizontal offset percentage
}

interface RoomState {
  // Client details
  userId: string | null;
  nickname: string | null;
  hostToken: string | null;
  pendingRoomName: string | null; // Room name set when creating a room (before navigating)
  isTVMode: boolean;
  activeTab: "search" | "queue" | "chat" | "feed" | "leaderboard";
  
  // Room Settings (persistent & synchronized)
  autoScoringEnabled: boolean;
  showFreestylePrompt: boolean;
  activeAIScore: { score: number; comment: string; singer: string; songTitle: string } | null;

  // Realtime temporary states
  floatingReactions: FloatingReaction[];
  typingUsers: Record<string, boolean>;
  scoringQueueItemId: string | null;
  scoringModalVisible: boolean;
  passTheMicVisible: boolean;
  
  // Actions
  initializeClient: () => void;
  setNickname: (nickname: string) => void;
  setHostToken: (token: string) => void;
  setPendingRoomName: (name: string) => void;
  setTVMode: (isTV: boolean) => void;
  setActiveTab: (tab: "search" | "queue" | "chat" | "feed" | "leaderboard") => void;
  setAutoScoringEnabled: (enabled: boolean) => void;
  setShowFreestylePrompt: (show: boolean) => void;
  setActiveAIScore: (score: { score: number; comment: string; singer: string; songTitle: string } | null) => void;
  triggerFloatingReaction: (emoji: string) => void;
  clearFloatingReactions: () => void;
  setTypingUser: (nickname: string, isTyping: boolean) => void;
  setScoringQueueItemId: (id: string | null) => void;
  setScoringModalVisible: (visible: boolean) => void;
  setPassTheMicVisible: (visible: boolean) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  userId: null,
  nickname: null,
  hostToken: null,
  pendingRoomName: null,
  isTVMode: false,
  activeTab: "search",
  autoScoringEnabled: true,
  showFreestylePrompt: true,
  activeAIScore: null,
  floatingReactions: [],
  typingUsers: {},
  scoringQueueItemId: null,
  scoringModalVisible: false,
  passTheMicVisible: false,

  initializeClient: () => {
    if (typeof window === "undefined") return;

    let savedUserId = localStorage.getItem("karaokehub_user_id");
    if (!savedUserId) {
      savedUserId = crypto.randomUUID();
      localStorage.setItem("karaokehub_user_id", savedUserId);
    }

    const savedNickname = localStorage.getItem("karaokehub_nickname") || null;
    const savedHostToken = localStorage.getItem("karaokehub_host_token") || null;
    const savedTVMode = localStorage.getItem("karaokehub_tv_mode") === "true";
    const savedPendingRoomName = localStorage.getItem("karaokehub_pending_room_name") || null;
    const savedAutoScoring = localStorage.getItem("karaokehub_auto_scoring") !== "false";
    const savedShowFreestyle = localStorage.getItem("karaokehub_show_freestyle") !== "false";

    set({
      userId: savedUserId,
      nickname: savedNickname,
      hostToken: savedHostToken,
      isTVMode: savedTVMode,
      pendingRoomName: savedPendingRoomName,
      autoScoringEnabled: savedAutoScoring,
      showFreestylePrompt: savedShowFreestyle,
    });
  },

  setNickname: (nickname) => {
    localStorage.setItem("karaokehub_nickname", nickname);
    set({ nickname });
  },

  setHostToken: (token) => {
    localStorage.setItem("karaokehub_host_token", token);
    set({ hostToken: token });
  },

  setPendingRoomName: (name) => {
    localStorage.setItem("karaokehub_pending_room_name", name);
    set({ pendingRoomName: name });
  },

  setTVMode: (isTV) => {
    localStorage.setItem("karaokehub_tv_mode", isTV ? "true" : "false");
    set({ isTVMode: isTV });
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  setAutoScoringEnabled: (enabled) => {
    localStorage.setItem("karaokehub_auto_scoring", enabled ? "true" : "false");
    set({ autoScoringEnabled: enabled });
  },

  setShowFreestylePrompt: (show) => {
    localStorage.setItem("karaokehub_show_freestyle", show ? "true" : "false");
    set({ showFreestylePrompt: show });
  },

  setActiveAIScore: (activeAIScore) => set({ activeAIScore }),

  triggerFloatingReaction: (emoji) => {
    const newReaction: FloatingReaction = {
      id: crypto.randomUUID(),
      emoji,
      twist: Math.floor(Math.random() * 40) - 20, // -20deg to 20deg
      offset: Math.floor(Math.random() * 60) + 20, // 20% to 80% horizontal offset
    };
    set((state) => ({
      floatingReactions: [...state.floatingReactions.slice(-40), newReaction], // Keep max 40 floating
    }));

    // Auto-remove reaction from state after animation completes (2.5 seconds)
    setTimeout(() => {
      set((state) => ({
        floatingReactions: state.floatingReactions.filter((r) => r.id !== newReaction.id),
      }));
    }, 2500);
  },

  clearFloatingReactions: () => set({ floatingReactions: [] }),

  setTypingUser: (nickname, isTyping) =>
    set((state) => {
      const typingUsers = { ...state.typingUsers };
      if (isTyping) {
        typingUsers[nickname] = true;
      } else {
        delete typingUsers[nickname];
      }
      return { typingUsers };
    }),

  setScoringQueueItemId: (scoringQueueItemId) => set({ scoringQueueItemId }),
  setScoringModalVisible: (scoringModalVisible) => set({ scoringModalVisible }),
  setPassTheMicVisible: (passTheMicVisible) => set({ passTheMicVisible }),
}));
