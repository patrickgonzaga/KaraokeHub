import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./useSupabase";
import { useRoomStore } from "../store/useRoomStore";
import {
  Room,
  RoomUser,
  QueueItem,
  ChatMessage,
  RoomNotification,
  LeaderboardEntry,
  PartyEvent,
  Song,
} from "../types";

// Check if Supabase is actually configured or running placeholder
const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-url");

export function useRoom(roomCode: string, initialRoomName?: string) {
  const {
    userId,
    nickname,
    hostToken,
    isTVMode,
    setNickname,
    setHostToken,
    triggerFloatingReaction,
    setTypingUser,
  } = useRoomStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<RoomNotification[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [partyEvents, setPartyEvents] = useState<PartyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // References for active real-time channel
  const channelRef = useRef<any>(null);

  // ---------------------------------------------------------------------------
  // OFFLINE / DEMO MODE MOCK STATE & ACTIONS
  // ---------------------------------------------------------------------------
  const demoStateRef = useRef<{
    room: Room | null;
    users: RoomUser[];
    queue: QueueItem[];
    messages: ChatMessage[];
    notifications: RoomNotification[];
    leaderboard: LeaderboardEntry[];
    partyEvents: PartyEvent[];
  }>({
    room: null,
    users: [],
    queue: [],
    messages: [],
    notifications: [],
    leaderboard: [],
    partyEvents: [],
  });

  const updateDemoState = useCallback(() => {
    setRoom(demoStateRef.current.room ? { ...demoStateRef.current.room } : null);
    setUsers([...demoStateRef.current.users]);
    setQueue([...demoStateRef.current.queue]);
    setMessages([...demoStateRef.current.messages]);
    setNotifications([...demoStateRef.current.notifications]);
    setLeaderboard([...demoStateRef.current.leaderboard]);
    setPartyEvents([...demoStateRef.current.partyEvents]);
  }, []);

  const loadDemoRoom = useCallback(() => {
    // Generate mock details for offline room
    // Use the actual hostToken from the store so isHost check works
    const activeHostToken = hostToken || "demo-host-token";
    const mockRoom: Room = {
      id: "demo-room-uuid",
      code: roomCode,
      name: initialRoomName || "Local Jam Room",
      host_token: activeHostToken,
      current_song_id: null,
      is_playing: false,
      playback_time: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockHost: RoomUser = {
      id: "demo-host-user-uuid",
      room_id: "demo-room-uuid",
      nickname: "DJ Host",
      role: "host",
      is_online: true,
      last_seen_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    };

    const mockSong: Song = {
      id: "demo-song-1",
      youtube_id: "fJ9rUzIMcZQ",
      title: "Bohemian Rhapsody - Queen (Karaoke)",
      thumbnail_url: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
      duration: 355,
      artist: "Queen",
      created_at: new Date().toISOString(),
    };

    const mockQueue: QueueItem = {
      id: "demo-queue-1",
      room_id: "demo-room-uuid",
      song_id: "demo-song-1",
      requested_by_nickname: "DJ Host",
      requested_by_user_id: "demo-host-user-uuid",
      queue_position: 1,
      status: "pending",
      votes_count: 1,
      votes: ["demo-host-user-uuid"],
      created_at: new Date().toISOString(),
      song: mockSong,
    };

    demoStateRef.current = {
      room: mockRoom,
      users: [mockHost],
      queue: [mockQueue],
      messages: [
        {
          id: "msg-1",
          room_id: "demo-room-uuid",
          user_id: "demo-host-user-uuid",
          nickname: "DJ Host",
          message: "Welcome to KaraokeHub offline mode! 🎤 Add songs and start singing!",
          created_at: new Date().toISOString(),
        },
      ],
      notifications: [
        {
          id: "notif-1",
          room_id: "demo-room-uuid",
          type: "user_joined",
          content: "DJ Host joined the room",
          created_at: new Date().toISOString(),
        },
      ],
      leaderboard: [
        {
          id: "lb-1",
          room_id: "demo-room-uuid",
          nickname: "DJ Host",
          metric_type: "most_songs_added",
          score_value: 1,
          updated_at: new Date().toISOString(),
        },
      ],
      partyEvents: [
        {
          id: "evt-1",
          room_id: "demo-room-uuid",
          event_type: "joined",
          nickname: "DJ Host",
          details: "joined the room as Host",
          created_at: new Date().toISOString(),
        },
      ],
    };

    updateDemoState();
    setLoading(false);
  }, [roomCode, hostToken, initialRoomName, updateDemoState]);

  // ---------------------------------------------------------------------------
  // SYNC & REALTIME SUBSCRIPTIONS (DATABASE DRIVEN)
  // ---------------------------------------------------------------------------

  const fetchRoomData = useCallback(async (isBackground = false) => {
    if (isDemoMode) {
      loadDemoRoom();
      return;
    }

    try {
      if (!isBackground) setLoading(true);
      setError(null);

      // 1. Fetch Room details
      const { data: dbRoom, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", roomCode)
        .maybeSingle();

      if (roomErr || !dbRoom) {
        throw new Error("Room not found in database. Code may be invalid.");
      }

      setRoom(dbRoom);

      // 2. Fetch Users
      const { data: dbUsers } = await supabase
        .from("room_users")
        .select("*")
        .eq("room_id", dbRoom.id)
        .order("joined_at", { ascending: true });
      setUsers(dbUsers || []);

      // 3. Fetch Queue (joining songs relation)
      const { data: dbQueue } = await supabase
        .from("queue_items")
        .select("*, song:songs(*)")
        .eq("room_id", dbRoom.id)
        .order("status", { ascending: true }) // showing playing and pending first
        .order("votes_count", { ascending: false }) // higher votes first
        .order("queue_position", { ascending: true });
      setQueue(dbQueue || []);

      // 4. Fetch Messages
      const { data: dbMsgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", dbRoom.id)
        .order("created_at", { ascending: true })
        .limit(60);
      setMessages(dbMsgs || []);

      // 5. Fetch Notifications
      const { data: dbNotifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("room_id", dbRoom.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(dbNotifs || []);

      // 6. Fetch Leaderboards
      const { data: dbLb } = await supabase
        .from("leaderboards")
        .select("*")
        .eq("room_id", dbRoom.id)
        .order("score_value", { ascending: false });
      setLeaderboard(dbLb || []);

      // 7. Fetch Party Events
      const { data: dbEvts } = await supabase
        .from("party_events")
        .select("*")
        .eq("room_id", dbRoom.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPartyEvents(dbEvts || []);

      if (!isBackground) setLoading(false);
    } catch (err: any) {
      setError(err.message);
      if (!isBackground) setLoading(false);
    }
  }, [roomCode, loadDemoRoom]);

  // Add dummy triggers in offline mode to keep the screen looking alive
  useEffect(() => {
    if (!isDemoMode || loading) return;

    // Simulate other users sending reactions every 8-15 seconds
    const interval = setInterval(() => {
      const reactions = ["🔥", "👏", "😂", "🎤", "🎉", "❤️", "🤘"];
      const randEmoji = reactions[Math.floor(Math.random() * reactions.length)];
      triggerFloatingReaction(randEmoji);
    }, 9000);

    return () => clearInterval(interval);
  }, [loading, triggerFloatingReaction]);

  // ---------------------------------------------------------------------------
  // MUTATION ACTIONS (DATABASE & DEMO DUAL COMPATIBLE)
  // ---------------------------------------------------------------------------

  const joinRoom = useCallback(
    async (joinNickname: string) => {
      if (!userId) return;

      const displayNickname = joinNickname.trim();
      setNickname(displayNickname);

      if (isDemoMode) {
        const existingUser = demoStateRef.current.users.find((u) => u.nickname === displayNickname);
        if (existingUser) {
          existingUser.is_online = true;
        } else {
          const newUser: RoomUser = {
            id: userId,
            room_id: "demo-room-uuid",
            nickname: displayNickname,
            role: "guest",
            is_online: true,
            last_seen_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
          };
          demoStateRef.current.users.push(newUser);
        }

        const newNotif: RoomNotification = {
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          type: "user_joined",
          content: `${displayNickname} joined the room`,
          created_at: new Date().toISOString(),
        };

        const newEvent: PartyEvent = {
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          event_type: "joined",
          nickname: displayNickname,
          details: "joined the room",
          created_at: new Date().toISOString(),
        };

        demoStateRef.current.notifications.push(newNotif);
        demoStateRef.current.partyEvents.push(newEvent);
        updateDemoState();
        return;
      }

      try {
        // Find if room exists
        const { data: dbRoom, error: roomErr } = await supabase
          .from("rooms")
          .select("id")
          .eq("code", roomCode)
          .maybeSingle();

        if (roomErr || !dbRoom) throw new Error("Room not found");

        // Check if user already joined
        const { data: existingUser } = await supabase
          .from("room_users")
          .select("id")
          .eq("room_id", dbRoom.id)
          .eq("nickname", displayNickname)
          .maybeSingle();

        if (!existingUser) {
          // Add user
          await supabase.from("room_users").insert({
            room_id: dbRoom.id,
            nickname: displayNickname,
            role: "guest",
            is_online: true,
          });

          // Add notification
          await supabase.from("notifications").insert({
            room_id: dbRoom.id,
            type: "user_joined",
            content: `${displayNickname} joined the room`,
          });

          // Add party event
          await supabase.from("party_events").insert({
            room_id: dbRoom.id,
            event_type: "joined",
            nickname: displayNickname,
            details: "joined the room",
          });
        } else {
          // Set user to online
          await supabase
            .from("room_users")
            .update({ is_online: true, last_seen_at: new Date().toISOString() })
            .eq("id", existingUser.id);
        }

        // Fetch room data in background to reflect joined user immediately
        fetchRoomData(true);
      } catch (err: any) {
        console.error("Join Room error:", err);
      }
    },
    [roomCode, userId, setNickname, updateDemoState, fetchRoomData]
  );

  const addSongToQueue = useCallback(
    async (songData: {
      youtubeId: string;
      title: string;
      thumbnailUrl: string;
      duration: number;
      artist: string;
    }) => {
      const activeNickname = nickname || "Anonymous Singer";
      const activeUserId = userId || "anonymous-uuid";

      // 1. Duplicate Check
      const isDuplicate = queue.some(
        (item) => item.status === "pending" && item.song?.youtube_id === songData.youtubeId
      );

      if (isDuplicate) {
        return { duplicate: true };
      }

      if (isDemoMode) {
        // Cache song details
        const mockSongId = `song-${songData.youtubeId}`;
        const mockSong: Song = {
          id: mockSongId,
          youtube_id: songData.youtubeId,
          title: songData.title,
          thumbnail_url: songData.thumbnailUrl,
          duration: songData.duration,
          artist: songData.artist || null,
          created_at: new Date().toISOString(),
        };

        const maxPos = demoStateRef.current.queue.reduce(
          (max, item) => (item.queue_position > max ? item.queue_position : max),
          0
        );

        const newQueueItem: QueueItem = {
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          song_id: mockSongId,
          requested_by_nickname: activeNickname,
          requested_by_user_id: activeUserId,
          queue_position: maxPos + 1,
          status: "pending",
          votes_count: 1,
          votes: [activeUserId],
          created_at: new Date().toISOString(),
          song: mockSong,
        };

        demoStateRef.current.queue.push(newQueueItem);

        // Add Notification & Feed
        demoStateRef.current.notifications.push({
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          type: "song_added",
          content: `${activeNickname} added ${songData.title}`,
          created_at: new Date().toISOString(),
        });

        demoStateRef.current.partyEvents.push({
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          event_type: "added_song",
          nickname: activeNickname,
          details: `added song "${songData.title}"`,
          created_at: new Date().toISOString(),
        });

        // Update leaderboard
        const userLb = demoStateRef.current.leaderboard.find(
          (entry) =>
            entry.nickname === activeNickname && entry.metric_type === "most_songs_added"
        );
        if (userLb) {
          userLb.score_value = Number(userLb.score_value) + 1;
        } else {
          demoStateRef.current.leaderboard.push({
            id: crypto.randomUUID(),
            room_id: "demo-room-uuid",
            nickname: activeNickname,
            metric_type: "most_songs_added",
            score_value: 1,
            updated_at: new Date().toISOString(),
          });
        }

        updateDemoState();
        return { success: true };
      }

      try {
        if (!room) return { error: "Room not loaded" };

        // 1. Get or Insert Song Metadata
        let { data: dbSong } = await supabase
          .from("songs")
          .select("id")
          .eq("youtube_id", songData.youtubeId)
          .maybeSingle();

        if (!dbSong) {
          const { data: newSong, error: insertSongErr } = await supabase
            .from("songs")
            .insert({
              youtube_id: songData.youtubeId,
              title: songData.title,
              thumbnail_url: songData.thumbnailUrl,
              duration: songData.duration,
              artist: songData.artist || null,
            })
            .select("id")
            .maybeSingle();

          if (insertSongErr || !newSong) throw insertSongErr || new Error("Failed to insert song");
          dbSong = newSong;
        }

        // 2. Fetch max queue position
        const { data: qItems } = await supabase
          .from("queue_items")
          .select("queue_position")
          .eq("room_id", room.id);

        const maxPos = (qItems || []).reduce(
          (max, item) => (item.queue_position > max ? item.queue_position : max),
          0
        );

        // 3. Insert Queue Item
        await supabase.from("queue_items").insert({
          room_id: room.id,
          song_id: dbSong.id,
          requested_by_nickname: activeNickname,
          requested_by_user_id: activeUserId,
          queue_position: maxPos + 1,
          votes_count: 1,
          votes: [activeUserId],
        });

        // 4. Notifications & Feed
        await supabase.from("notifications").insert({
          room_id: room.id,
          type: "song_added",
          content: `${activeNickname} added ${songData.title}`,
        });

        await supabase.from("party_events").insert({
          room_id: room.id,
          event_type: "added_song",
          nickname: activeNickname,
          details: `added song "${songData.title}"`,
        });

        // 5. Update leaderboard counter
        const { data: existingLb } = await supabase
          .from("leaderboards")
          .select("id, score_value")
          .eq("room_id", room.id)
          .eq("nickname", activeNickname)
          .eq("metric_type", "most_songs_added")
          .maybeSingle();

        if (existingLb) {
          await supabase
            .from("leaderboards")
            .update({ score_value: Number(existingLb.score_value) + 1, updated_at: new Date().toISOString() })
            .eq("id", existingLb.id);
        } else {
          await supabase.from("leaderboards").insert({
            room_id: room.id,
            nickname: activeNickname,
            metric_type: "most_songs_added",
            score_value: 1,
          });
        }

        // Background refresh to reflect queued song immediately
        fetchRoomData(true);
        return { success: true };
      } catch (err: any) {
        console.error("Add Song Error:", err);
        return { error: err.message };
      }
    },
    [room, nickname, userId, queue, updateDemoState, fetchRoomData]
  );

  const voteSong = useCallback(
    async (itemId: string) => {
      const activeUserId = userId || "anonymous-uuid";
      const activeNickname = nickname || "Anonymous Singer";

      if (isDemoMode) {
        const item = demoStateRef.current.queue.find((q) => q.id === itemId);
        if (item && !item.votes.includes(activeUserId)) {
          item.votes.push(activeUserId);
          item.votes_count = item.votes.length;

          // Push feed
          demoStateRef.current.partyEvents.push({
            id: crypto.randomUUID(),
            room_id: "demo-room-uuid",
            event_type: "added_song",
            nickname: activeNickname,
            details: `upvoted "${item.song?.title}"`,
            created_at: new Date().toISOString(),
          });

          // Sort queue by votes count desc, then queue position asc for pending songs
          updateDemoState();
        }
        return;
      }

      try {
        const { data: item } = await supabase
          .from("queue_items")
          .select("votes, votes_count, song(title)")
          .eq("id", itemId)
          .maybeSingle();

        if (item) {
          const currentVotes = (item.votes as string[]) || [];
          if (!currentVotes.includes(activeUserId)) {
            const updatedVotes = [...currentVotes, activeUserId];
            await supabase
              .from("queue_items")
              .update({
                votes: updatedVotes,
                votes_count: updatedVotes.length,
              })
              .eq("id", itemId);

            // Add Event log
            await supabase.from("party_events").insert({
              room_id: room?.id,
              event_type: "added_song",
              nickname: activeNickname,
              details: `upvoted "${(item.song as any)?.title}"`,
            });
          }
        }

        // Background refresh to reflect vote immediately
        fetchRoomData(true);
      } catch (err) {
        console.error("Voting error:", err);
      }
    },
    [room, nickname, userId, updateDemoState, fetchRoomData]
  );

  const playSong = useCallback(
    async (itemId: string) => {
      if (isDemoMode) {
        if (demoStateRef.current.room) {
          demoStateRef.current.room.current_song_id = itemId;
          demoStateRef.current.room.is_playing = true;
          demoStateRef.current.room.playback_time = 0;

          // Set active playing song state in queue
          demoStateRef.current.queue.forEach((q) => {
            if (q.id === itemId) q.status = "playing";
            else if (q.status === "playing") q.status = "played";
          });

          const currentItem = demoStateRef.current.queue.find((q) => q.id === itemId);
          if (currentItem) {
            demoStateRef.current.notifications.push({
              id: crypto.randomUUID(),
              room_id: "demo-room-uuid",
              type: "mic_passed",
              content: `🎤 ${currentItem.requested_by_nickname} is now singing "${currentItem.song?.title}"`,
              created_at: new Date().toISOString(),
            });
          }

          updateDemoState();
        }
        return;
      }

      try {
        if (!room) return;

        // Update room details
        await supabase
          .from("rooms")
          .update({
            current_song_id: itemId,
            is_playing: true,
            playback_time: 0,
          })
          .eq("id", room.id);

        // Update queue item status
        await supabase.from("queue_items").update({ status: "playing" }).eq("id", itemId);

        // Mark previously playing items as played
        await supabase
          .from("queue_items")
          .update({ status: "played" })
          .eq("room_id", room.id)
          .eq("status", "playing")
          .not("id", "eq", itemId);

        const currentItem = queue.find((q) => q.id === itemId);
        if (currentItem) {
          await supabase.from("notifications").insert({
            room_id: room.id,
            type: "mic_passed",
            content: `🎤 ${currentItem.requested_by_nickname} is now singing "${currentItem.song?.title}"`,
          });
        }

        // Background refresh to reflect playing song immediately
        fetchRoomData(true);
      } catch (err) {
        console.error("Play song error:", err);
      }
    },
    [room, queue, updateDemoState, fetchRoomData]
  );

  const pauseSong = useCallback(async () => {
    if (isDemoMode) {
      if (demoStateRef.current.room) {
        demoStateRef.current.room.is_playing = false;
        updateDemoState();
      }
      return;
    }

    try {
      if (!room) return;
      await supabase.from("rooms").update({ is_playing: false }).eq("id", room.id);
      fetchRoomData(true);
    } catch (err) {
      console.error("Pause song error:", err);
    }
  }, [room, updateDemoState, fetchRoomData]);

  const resumeSong = useCallback(async () => {
    if (isDemoMode) {
      if (demoStateRef.current.room) {
        demoStateRef.current.room.is_playing = true;
        updateDemoState();
      }
      return;
    }

    try {
      if (!room) return;
      await supabase.from("rooms").update({ is_playing: true }).eq("id", room.id);
      fetchRoomData(true);
    } catch (err) {
      console.error("Resume song error:", err);
    }
  }, [room, updateDemoState, fetchRoomData]);

  const updatePlaybackTime = useCallback(
    async (time: number) => {
      // Avoid database hammering - only update if isTVMode
      if (!isTVMode) return;

      if (isDemoMode) {
        if (demoStateRef.current.room) {
          demoStateRef.current.room.playback_time = time;
          // Note: we don't update state to avoid massive React re-renders on every second
        }
        return;
      }

      try {
        if (!room) return;
        await supabase.from("rooms").update({ playback_time: time }).eq("id", room.id);
      } catch (err) {
        // Fail silently to prevent console pollution
      }
    },
    [room, isTVMode]
  );

  const skipSong = useCallback(async () => {
    const activeNickname = nickname || "Anonymous Singer";

    if (isDemoMode) {
      if (demoStateRef.current.room?.current_song_id) {
        const curId = demoStateRef.current.room.current_song_id;
        const curItem = demoStateRef.current.queue.find((q) => q.id === curId);
        if (curItem) curItem.status = "played";

        // Find next item in pending status
        const nextItem = demoStateRef.current.queue
          .filter((q) => q.status === "pending")
          .sort((a, b) => b.votes_count - a.votes_count || a.queue_position - b.queue_position)[0];

        demoStateRef.current.room.current_song_id = nextItem ? nextItem.id : null;
        demoStateRef.current.room.is_playing = !!nextItem;
        demoStateRef.current.room.playback_time = 0;

        if (nextItem) nextItem.status = "playing";

        demoStateRef.current.partyEvents.push({
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          event_type: "skipped",
          nickname: activeNickname,
          details: "skipped the current song",
          created_at: new Date().toISOString(),
        });

        updateDemoState();
      }
      return;
    }

    try {
      if (!room || !room.current_song_id) return;

      // Mark current as played
      await supabase
        .from("queue_items")
        .update({ status: "played" })
        .eq("id", room.current_song_id);

      // Find next item
      const nextItem = queue
        .filter((q) => q.status === "pending" && q.id !== room.current_song_id)
        .sort((a, b) => b.votes_count - a.votes_count || a.queue_position - b.queue_position)[0];

      await supabase
        .from("rooms")
        .update({
          current_song_id: nextItem ? nextItem.id : null,
          is_playing: !!nextItem,
          playback_time: 0,
        })
        .eq("id", room.id);

      if (nextItem) {
        await supabase.from("queue_items").update({ status: "playing" }).eq("id", nextItem.id);
      }

      await supabase.from("party_events").insert({
        room_id: room.id,
        event_type: "skipped",
        nickname: activeNickname,
        details: "skipped the current song",
      });

      // Background refresh to reflect skipped song immediately
      fetchRoomData(true);
    } catch (err) {
      console.error("Skip error:", err);
    }
  }, [room, queue, nickname, updateDemoState, fetchRoomData]);

  const sendChatMessage = useCallback(
    async (messageText: string, gifUrl?: string) => {
      const activeNickname = nickname || "Anonymous Singer";
      const activeUserId = userId || "anonymous-uuid";

      if (isDemoMode) {
        const newMsg: ChatMessage = {
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          user_id: activeUserId,
          nickname: activeNickname,
          message: messageText,
          gif_url: gifUrl,
          created_at: new Date().toISOString(),
        };
        demoStateRef.current.messages.push(newMsg);
        updateDemoState();
        return;
      }

      try {
        if (!room) return;

        // Fetch local user row
        const { data: dbUser } = await supabase
          .from("room_users")
          .select("id")
          .eq("room_id", room.id)
          .eq("nickname", activeNickname)
          .maybeSingle();

        if (dbUser) {
          await supabase.from("chat_messages").insert({
            room_id: room.id,
            user_id: dbUser.id,
            nickname: activeNickname,
            message: messageText,
            gif_url: gifUrl || null,
          });
        }

        // Background refresh to reflect sent message immediately
        fetchRoomData(true);
      } catch (err) {
        console.error("Send message error:", err);
      }
    },
    [room, nickname, userId, updateDemoState, fetchRoomData]
  );

  const sendReaction = useCallback(
    async (emoji: string) => {
      const activeNickname = nickname || "Guest";

      // 1. Trigger reaction on this screen instantly
      triggerFloatingReaction(emoji);

      // 2. Dispatch Broadcast to room peers
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "reaction",
          payload: { emoji, nickname: activeNickname },
        });
      }

      // 3. Save to database or updates leaderboard periodically
      if (isDemoMode) {
        // Update mock leaderboard reaction count
        const entry = demoStateRef.current.leaderboard.find(
          (lb) => lb.nickname === activeNickname && lb.metric_type === "most_reactions"
        );
        if (entry) {
          entry.score_value = Number(entry.score_value) + 1;
        } else {
          demoStateRef.current.leaderboard.push({
            id: crypto.randomUUID(),
            room_id: "demo-room-uuid",
            nickname: activeNickname,
            metric_type: "most_reactions",
            score_value: 1,
            updated_at: new Date().toISOString(),
          });
        }
        updateDemoState();
        return;
      }

      try {
        if (!room) return;
        
        // Find user record
        const { data: dbUser } = await supabase
          .from("room_users")
          .select("id")
          .eq("room_id", room.id)
          .eq("nickname", activeNickname)
          .maybeSingle();

        if (dbUser) {
          await supabase.from("reactions").insert({
            room_id: room.id,
            user_id: dbUser.id,
            nickname: activeNickname,
            emoji,
          });

          // Update metrics
          const { data: existingLb } = await supabase
            .from("leaderboards")
            .select("id, score_value")
            .eq("room_id", room.id)
            .eq("nickname", activeNickname)
            .eq("metric_type", "most_reactions")
            .maybeSingle();

          if (existingLb) {
            await supabase
              .from("leaderboards")
              .update({ score_value: Number(existingLb.score_value) + 1, updated_at: new Date().toISOString() })
              .eq("id", existingLb.id);
          } else {
            await supabase.from("leaderboards").insert({
              room_id: room.id,
              nickname: activeNickname,
              metric_type: "most_reactions",
              score_value: 1,
            });
          }
        }

        // Background refresh to reflect reaction immediately
        fetchRoomData(true);
      } catch (err) {
        // Fail silently
      }
    },
    [room, nickname, triggerFloatingReaction, updateDemoState, fetchRoomData]
  );

  const submitScore = useCallback(
    async (
      voice: number,
      presence: number,
      energy: number,
      impact: number,
      choice: number
    ) => {
      const activeNickname = nickname || "Anonymous Singer";
      const currentPlayingSong = queue.find((q) => q.id === room?.current_song_id);
      if (!room || !currentPlayingSong) return;

      const singer = currentPlayingSong.requested_by_nickname;
      const total = Math.round((voice + presence + energy + impact + choice) * 2); // score out of 100

      if (isDemoMode) {
        // Push Score to local database
        const newNotif: RoomNotification = {
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          type: "score_submitted",
          content: `⭐ ${activeNickname} rated ${singer}'s performance: ${total}/100!`,
          created_at: new Date().toISOString(),
        };

        const newEvent: PartyEvent = {
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          event_type: "scored",
          nickname: singer,
          details: `scored ${total}/100 for singing "${currentPlayingSong.song?.title}"`,
          created_at: new Date().toISOString(),
        };

        demoStateRef.current.notifications.push(newNotif);
        demoStateRef.current.partyEvents.push(newEvent);

        // Update leaderboard scores
        const entry = demoStateRef.current.leaderboard.find(
          (lb) => lb.nickname === singer && lb.metric_type === "highest_average_score"
        );
        if (entry) {
          entry.score_value = Math.round((Number(entry.score_value) + total) / 2);
        } else {
          demoStateRef.current.leaderboard.push({
            id: crypto.randomUUID(),
            room_id: "demo-room-uuid",
            nickname: singer,
            metric_type: "highest_average_score",
            score_value: total,
            updated_at: new Date().toISOString(),
          });
        }

        updateDemoState();
        return;
      }

      try {
        await supabase.from("scores").insert({
          room_id: room.id,
          queue_item_id: currentPlayingSong.id,
          song_id: currentPlayingSong.song_id,
          singer_nickname: singer,
          voice_score: voice,
          presence_score: presence,
          energy_score: energy,
          impact_score: impact,
          choice_score: choice,
          total_score: total,
        });

        await supabase.from("notifications").insert({
          room_id: room.id,
          type: "score_submitted",
          content: `⭐ ${activeNickname} rated ${singer}'s performance: ${total}/100!`,
        });

        await supabase.from("party_events").insert({
          room_id: room.id,
          event_type: "scored",
          nickname: singer,
          details: `scored ${total}/100 for singing "${currentPlayingSong.song?.title}"`,
        });

        // Update leaderboard average
        const { data: scoresList } = await supabase
          .from("scores")
          .select("total_score")
          .eq("room_id", room.id)
          .eq("singer_nickname", singer);

        const average = scoresList
          ? Math.round(scoresList.reduce((sum, s) => sum + s.total_score, 0) / scoresList.length)
          : total;

        const { data: existingLb } = await supabase
          .from("leaderboards")
          .select("id")
          .eq("room_id", room.id)
          .eq("nickname", singer)
          .eq("metric_type", "highest_average_score")
          .maybeSingle();

        if (existingLb) {
          await supabase
            .from("leaderboards")
            .update({ score_value: average, updated_at: new Date().toISOString() })
            .eq("id", existingLb.id);
        } else {
          await supabase.from("leaderboards").insert({
            room_id: room.id,
            nickname: singer,
            metric_type: "highest_average_score",
            score_value: average,
          });
        }

        // Background refresh to reflect score immediately
        fetchRoomData(true);
      } catch (err) {
        console.error("Submit score error:", err);
      }
    },
    [room, queue, nickname, updateDemoState, fetchRoomData]
  );

  // ---------------------------------------------------------------------------
  // REALTIME SUBSCRIPTIONS & EVENT HANDLERS
  // ---------------------------------------------------------------------------

  // Hook subscription loop
  useEffect(() => {
    fetchRoomData();

    if (isDemoMode) return;

    // We need room.id to build the channel subscription, so we wait until room is loaded
  }, [fetchRoomData]);

  // Realtime subscription setup once room.id is resolved
  useEffect(() => {
    if (isDemoMode || !room?.id) return;

    const roomId = room.id;

    // Create a Supabase Realtime channel
    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        presence: {
          key: nickname || "Anonymous",
        },
      },
    });

    channelRef.current = channel;

    // 1. Subscribe to Database Changes
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload: any) => {
          if (payload.new) {
            setRoom((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_users", filter: `room_id=eq.${roomId}` },
        () => {
          supabase
            .from("room_users")
            .select("*")
            .eq("room_id", roomId)
            .order("joined_at", { ascending: true })
            .then(({ data }) => {
              if (data) setUsers(data);
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_items", filter: `room_id=eq.${roomId}` },
        () => {
          supabase
            .from("queue_items")
            .select("*, song:songs(*)")
            .eq("room_id", roomId)
            .order("status", { ascending: true })
            .order("votes_count", { ascending: false })
            .order("queue_position", { ascending: true })
            .then(({ data }) => {
              if (data) setQueue(data);
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as RoomNotification, ...prev.slice(0, 9)]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboards", filter: `room_id=eq.${roomId}` },
        () => {
          supabase
            .from("leaderboards")
            .select("*")
            .eq("room_id", roomId)
            .order("score_value", { ascending: false })
            .then(({ data }) => {
              if (data) setLeaderboard(data);
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "party_events", filter: `room_id=eq.${roomId}` },
        (payload) => {
          setPartyEvents((prev) => [payload.new as PartyEvent, ...prev.slice(0, 19)]);
        }
      );

    // 2. Subscribe to Ephemeral Broadcasts (reactions, typing, settings & scoring)
    channel.on("broadcast", { event: "reaction" }, (payload) => {
      const { emoji } = payload.payload;
      triggerFloatingReaction(emoji);
    });

    channel.on("broadcast", { event: "typing" }, (payload) => {
      const { user, isTyping } = payload.payload;
      setTypingUser(user, isTyping);
    });

    channel.on("broadcast", { event: "settings_update" }, (payload) => {
      const { autoScoringEnabled, showFreestylePrompt } = payload.payload;
      const { setAutoScoringEnabled, setShowFreestylePrompt } = useRoomStore.getState();
      if (autoScoringEnabled !== undefined) {
        setAutoScoringEnabled(autoScoringEnabled);
      }
      if (showFreestylePrompt !== undefined) {
        setShowFreestylePrompt(showFreestylePrompt);
      }
    });

    channel.on("broadcast", { event: "song_completed" }, (payload) => {
      const { score, comment, singer, songTitle } = payload.payload;
      const { setActiveAIScore } = useRoomStore.getState();
      setActiveAIScore({ score, comment, singer, songTitle });
    });

    channel.on("broadcast", { event: "clear_ai_score" }, () => {
      const { setActiveAIScore } = useRoomStore.getState();
      setActiveAIScore(null);
    });

    // 3. Track Presence (Who is online right now)
    channel
      .on("presence", { event: "sync" }, () => {
        // Sync online list
        const state = channel.presenceState();
        // Since key is the nickname, we check presence
        const activeUsersList = Object.keys(state);
        
        setUsers((prev) =>
          prev.map((user) => ({
            ...user,
            is_online: activeUsersList.includes(user.nickname),
          }))
        );
      })
      .on("presence", { event: "join" }, ({ key }) => {
        // User joined presence
        setUsers((prev) =>
          prev.map((user) => (user.nickname === key ? { ...user, is_online: true } : user))
        );
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        // User left presence
        setUsers((prev) =>
          prev.map((user) => (user.nickname === key ? { ...user, is_online: false } : user))
        );
      });

    // Connect channel
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && nickname) {
        channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [room?.id, roomCode, nickname, triggerFloatingReaction, setTypingUser]);

  // Dispatch typing indicators to peers
  const sendTypingState = useCallback(
    (isTyping: boolean) => {
      if (isDemoMode || !nickname || !channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user: nickname, isTyping },
      });
    },
    [nickname]
  );

  const updateRoomSettings = useCallback(
    (settings: { autoScoringEnabled?: boolean; showFreestylePrompt?: boolean }) => {
      const { setAutoScoringEnabled, setShowFreestylePrompt } = useRoomStore.getState();
      if (settings.autoScoringEnabled !== undefined) {
        setAutoScoringEnabled(settings.autoScoringEnabled);
      }
      if (settings.showFreestylePrompt !== undefined) {
        setShowFreestylePrompt(settings.showFreestylePrompt);
      }

      // Broadcast changes to other screens in the room
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "settings_update",
          payload: settings,
        });
      }
    },
    []
  );

  const completeSongWithAIScore = useCallback(
    async (score: number, comment: string, singer: string, songTitle: string) => {
      // 1. Set local store state
      const { setActiveAIScore } = useRoomStore.getState();
      setActiveAIScore({ score, comment, singer, songTitle });

      // 2. Broadcast event to room peers
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "song_completed",
          payload: { score, comment, singer, songTitle },
        });
      }

      // 3. Record score in DB in the background
      if (isDemoMode) {
        // Mock demo database logging
        const total = score;
        demoStateRef.current.notifications.push({
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          type: "score_submitted",
          content: `⭐ AI Scorer rated ${singer}'s performance: ${total}/100!`,
          created_at: new Date().toISOString(),
        });
        demoStateRef.current.partyEvents.push({
          id: crypto.randomUUID(),
          room_id: "demo-room-uuid",
          event_type: "scored",
          nickname: singer,
          details: `scored ${total}/100 for singing "${songTitle}" (AI Rating)`,
          created_at: new Date().toISOString(),
        });

        // Update leaderboard average
        const entry = demoStateRef.current.leaderboard.find(
          (lb) => lb.nickname === singer && lb.metric_type === "highest_average_score"
        );
        if (entry) {
          entry.score_value = Math.round((Number(entry.score_value) + total) / 2);
        } else {
          demoStateRef.current.leaderboard.push({
            id: crypto.randomUUID(),
            room_id: "demo-room-uuid",
            nickname: singer,
            metric_type: "highest_average_score",
            score_value: total,
            updated_at: new Date().toISOString(),
          });
        }
        updateDemoState();
        return;
      }

      try {
        if (!room || !room.current_song_id) return;

        // Fetch queue item
        const currentPlayingSong = queue.find((q) => q.status === "playing" || q.id === room.current_song_id);
        if (!currentPlayingSong) return;

        const val = Math.round(score / 2); // fits 1-10
        const portion = Math.floor(val / 5);
        const remainder = val % 5;
        const voice = portion + (remainder >= 1 ? 1 : 0);
        const presence = portion + (remainder >= 2 ? 1 : 0);
        const energy = portion + (remainder >= 3 ? 1 : 0);
        const impact = portion + (remainder >= 4 ? 1 : 0);
        const choice = portion;

        await supabase.from("scores").insert({
          room_id: room.id,
          queue_item_id: currentPlayingSong.id,
          song_id: currentPlayingSong.song_id,
          singer_nickname: singer,
          voice_score: voice,
          presence_score: presence,
          energy_score: energy,
          impact_score: impact,
          choice_score: choice,
          total_score: score,
        });

        await supabase.from("notifications").insert({
          room_id: room.id,
          type: "score_submitted",
          content: `⭐ AI Scorer rated ${singer}'s performance: ${score}/100!`,
        });

        await supabase.from("party_events").insert({
          room_id: room.id,
          event_type: "scored",
          nickname: singer,
          details: `scored ${score}/100 for singing "${songTitle}" (AI Rating)`,
        });

        // Update leaderboard average
        const { data: scoresList } = await supabase
          .from("scores")
          .select("total_score")
          .eq("room_id", room.id)
          .eq("singer_nickname", singer);

        const average = scoresList
          ? Math.round(scoresList.reduce((sum, s) => sum + s.total_score, 0) / scoresList.length)
          : score;

        const { data: existingLb } = await supabase
          .from("leaderboards")
          .select("id")
          .eq("room_id", room.id)
          .eq("nickname", singer)
          .eq("metric_type", "highest_average_score")
          .maybeSingle();

        if (existingLb) {
          await supabase
            .from("leaderboards")
            .update({ score_value: average, updated_at: new Date().toISOString() })
            .eq("id", existingLb.id);
        } else {
          await supabase.from("leaderboards").insert({
            room_id: room.id,
            nickname: singer,
            metric_type: "highest_average_score",
            score_value: average,
          });
        }

        // Background refresh to update UI immediately
        fetchRoomData(true);
      } catch (err) {
        console.error("AI score database insert error:", err);
      }
    },
    [room, queue, fetchRoomData]
  );

  const clearAIScore = useCallback(() => {
    const { setActiveAIScore } = useRoomStore.getState();
    setActiveAIScore(null);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "clear_ai_score",
        payload: {},
      });
    }
  }, []);

  return {
    room,
    users,
    queue,
    messages,
    notifications,
    leaderboard,
    partyEvents,
    loading,
    error,
    refresh: fetchRoomData,
    joinRoom,
    addSongToQueue,
    voteSong,
    playSong,
    pauseSong,
    resumeSong,
    updatePlaybackTime,
    skipSong,
    sendChatMessage,
    sendReaction,
    submitScore,
    sendTypingState,
    updateRoomSettings,
    completeSongWithAIScore,
    clearAIScore,
  };
}
