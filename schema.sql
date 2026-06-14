-- KaraokeHub Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- Short room code e.g. ABC123
    name VARCHAR(255) NOT NULL,
    host_token VARCHAR(255) NOT NULL, -- Token stored in host's localStorage to verify ownership
    current_song_id UUID, -- References queue_items.id
    is_playing BOOLEAN DEFAULT false,
    playback_time NUMERIC DEFAULT 0, -- Current video timestamp in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ROOM USERS TABLE
CREATE TABLE IF NOT EXISTS room_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'guest' NOT NULL, -- 'host' or 'guest'
    is_online BOOLEAN DEFAULT true NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SONGS CACHE TABLE
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER NOT NULL, -- in seconds
    artist VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. QUEUE ITEMS TABLE
CREATE TABLE IF NOT EXISTS queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
    requested_by_nickname VARCHAR(50) NOT NULL,
    requested_by_user_id UUID NOT NULL, -- Maps to a room_users.id locally
    queue_position INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'playing', 'played'
    votes_count INTEGER DEFAULT 0 NOT NULL,
    votes JSONB DEFAULT '[]'::jsonb NOT NULL, -- Array of room_user_ids who voted to prevent duplication
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES room_users(id) ON DELETE CASCADE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    gif_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'user_joined', 'song_added', 'score_submitted', 'mic_passed', 'skip_voted'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. REACTIONS TABLE
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES room_users(id) ON DELETE CASCADE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. SCORES TABLE
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    queue_item_id UUID REFERENCES queue_items(id) ON DELETE CASCADE NOT NULL,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
    singer_nickname VARCHAR(50) NOT NULL,
    voice_score INTEGER CHECK (voice_score BETWEEN 1 AND 10) NOT NULL,
    presence_score INTEGER CHECK (presence_score BETWEEN 1 AND 10) NOT NULL,
    energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 10) NOT NULL,
    impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 10) NOT NULL,
    choice_score INTEGER CHECK (choice_score BETWEEN 1 AND 10) NOT NULL,
    total_score INTEGER NOT NULL, -- Weighted overall score out of 100
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. LEADERBOARD TABLE
CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'top_singer', 'most_songs_added', 'highest_average_score', 'most_reactions'
    score_value NUMERIC NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. PARTY EVENTS TABLE (Live feed audit trail)
CREATE TABLE IF NOT EXISTS party_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'joined', 'added_song', 'scored', 'mic_passed'
    nickname VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_room_users_room ON room_users(room_id);
CREATE INDEX IF NOT EXISTS idx_queue_items_room ON queue_items(room_id);
CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_room ON notifications(room_id);
CREATE INDEX IF NOT EXISTS idx_scores_room ON scores(room_id);

-- ----------------------------------------------------
-- RELATIONSHIP & TRIGGER UTILITIES
-- ----------------------------------------------------

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rooms_modtime
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------
-- For public/no-login rooms, we enable RLS and allow anonymous public access
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_events ENABLE ROW LEVEL SECURITY;

-- Rooms Policy
CREATE POLICY "Allow public read on rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on rooms" ON rooms FOR UPDATE USING (true);

-- Room Users Policy
CREATE POLICY "Allow public read on room_users" ON room_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on room_users" ON room_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on room_users" ON room_users FOR UPDATE USING (true);

-- Songs Policy
CREATE POLICY "Allow public read on songs" ON songs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on songs" ON songs FOR INSERT WITH CHECK (true);

-- Queue Items Policy
CREATE POLICY "Allow public read on queue_items" ON queue_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert on queue_items" ON queue_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on queue_items" ON queue_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on queue_items" ON queue_items FOR DELETE USING (true);

-- Chat Messages Policy
CREATE POLICY "Allow public read on chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- Notifications Policy
CREATE POLICY "Allow public read on notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public insert on notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Reactions Policy
CREATE POLICY "Allow public read on reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on reactions" ON reactions FOR INSERT WITH CHECK (true);

-- Scores Policy
CREATE POLICY "Allow public read on scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on scores" ON scores FOR INSERT WITH CHECK (true);

-- Leaderboards Policy
CREATE POLICY "Allow public read on leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "Allow public write on leaderboards" ON leaderboards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on leaderboards" ON leaderboards FOR UPDATE USING (true);

-- Party Events Policy
CREATE POLICY "Allow public read on party_events" ON party_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert on party_events" ON party_events FOR INSERT WITH CHECK (true);
