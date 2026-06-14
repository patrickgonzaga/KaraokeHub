export interface Room {
  id: string;
  code: string;
  name: string;
  host_token: string;
  current_song_id: string | null;
  is_playing: boolean;
  playback_time: number;
  created_at: string;
  updated_at: string;
}

export interface RoomUser {
  id: string;
  room_id: string;
  nickname: string;
  role: "host" | "guest";
  is_online: boolean;
  last_seen_at: string;
  joined_at: string;
}

export interface Song {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  duration: number; // in seconds
  artist: string | null;
  created_at: string;
}

export interface QueueItem {
  id: string;
  room_id: string;
  song_id: string;
  requested_by_nickname: string;
  requested_by_user_id: string;
  queue_position: number;
  status: "pending" | "playing" | "played";
  votes_count: number;
  votes: string[]; // array of userIds
  created_at: string;
  song?: Song; // Joined song relation
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  message: string;
  gif_url?: string;
  created_at: string;
}

export interface RoomNotification {
  id: string;
  room_id: string;
  type: "user_joined" | "song_added" | "score_submitted" | "mic_passed" | "skip_voted" | "encore";
  content: string;
  created_at: string;
}

export interface Reaction {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  emoji: string;
  created_at: string;
}

export interface Score {
  id: string;
  room_id: string;
  queue_item_id: string;
  song_id: string;
  singer_nickname: string;
  voice_score: number;
  presence_score: number;
  energy_score: number;
  impact_score: number;
  choice_score: number;
  total_score: number;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  room_id: string;
  nickname: string;
  metric_type: "top_singer" | "most_songs_added" | "highest_average_score" | "most_reactions";
  score_value: number;
  updated_at: string;
}

export interface PartyEvent {
  id: string;
  room_id: string;
  event_type: "joined" | "added_song" | "scored" | "mic_passed" | "skipped";
  nickname: string;
  details: string;
  created_at: string;
}
