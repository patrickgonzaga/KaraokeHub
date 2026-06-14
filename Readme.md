# 🎤 KaraokeHub

> **Turn Any Screen Into Karaoke Night.**

KaraokeHub is a production-quality, real-time karaoke party platform built with Next.js, Supabase, and Framer Motion. It decouples the **stage display** (TV/projector) from the **guest controller** (mobile phone), so everyone can search songs, queue tracks, spam reactions, and rate performances — all without audio conflicts.

---

## ✨ Features

### 🎬 TV Theater Mode
- Full-screen YouTube embed with ambient background effects
- **Synchronized scrolling lyrics** powered by [LRCLIB](https://lrclib.net), with automatic fallback to a local LRC database
- Floating emoji reaction particles that drift up the screen in real time
- Hover-reveal transport controls (play/pause/skip/mute) for the host
- **AI Vocal Scorer overlay**: after each song, a cinematic score card with an animated percentage and custom AI commentary appears, then auto-advances to the next track

### 📱 Mobile Controller Mode
- YouTube song search (Google Data API with a curated static fallback catalog)
- Song queue management — add songs, upvote to move songs up, play instantly as host
- Real-time "Playing Now" and "Up Next" queue views
- **Duplicate song detection**: if a song is already queued, prompts the user to upvote instead of creating a duplicate
- Host DJ Controls: Play/Pause, Skip, Pass the Mic roulette

### 🎯 Scoring Systems (Toggleable)
| Mode | Description |
|---|---|
| **AI Auto-Scoring** | After each song completes, a random percentage (69–99%) and an AI judge comment are generated, logged to the database, and broadcast to all devices in real time |
| **Manual Scoring** | The audience rates the singer across 5 categories: Voice, Stage Presence, Energy, Crowd Impact, and Song Choice |

Both modes trigger a canvas confetti burst and can be toggled on/off independently by the host.

### 💬 Real-Time Communication
- **Live Chat** — Discord-style message feed with typing indicators
- **Spam Reactions** — 7 emoji buttons that instantly broadcast floating particles to the TV screen
- **Party Activity Feed** — an audit log of room events ("Sarah added a song", "John scored 87%")

### 🎡 Pass the Mic
- SVG-based roulette wheel that spins and randomly lands on an active room participant
- Animated reveal with dramatic timing and confetti
- Host-only trigger, broadcast to all devices

### 📊 Leaderboard & Room Info
- QR code auto-generated client-side for easy room invites
- Live online users list
- Room leaderboard tracking: Top Singer, Most Songs Added, Highest Average Score, Most Reactions

### 🌐 Offline / Demo Mode
- If Supabase credentials are not configured, the app automatically activates an in-memory local demo mode
- Pre-loaded with mock songs, timed lyrics, and all features functional — no backend required for evaluation

---

## 🏗️ Architecture

KaraokeHub uses a **decoupled display and controller** architecture:

```
┌─────────────────────────────┐     Supabase Realtime      ┌────────────────────────────┐
│      TV / Theater Mode      │ ◄──────────────────────── ► │   Mobile Controller Mode   │
│  - Full-screen YouTube      │     + Broadcast Channel     │  - Search & Queue songs    │
│  - Synchronized lyrics      │                             │  - Vote / Score / Reactions│
│  - Floating reactions       │                             │  - Host playback controls  │
│  - AI Score overlay         │                             │  - Pass the Mic trigger    │
└─────────────────────────────┘                             └────────────────────────────┘
```

**Key design decisions:**
- The **TV is the source of truth** for playback position. It writes to `rooms.playback_time` every second; controllers read and interpolate locally for butter-smooth lyric scrolling.
- **Only the master device** (TV, or the host if no TV is open) triggers `completeSongWithAIScore` when a song ends, preventing duplicate database entries.
- Reactions bypass the database entirely via **Supabase Broadcast** for zero-latency floating emoji.
- `localStorage` is used to persist user session, host token, and feature toggle preferences across page refreshes.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Animation** | Framer Motion |
| **State Management** | Zustand |
| **Backend / DB** | Supabase (PostgreSQL + Realtime) |
| **Icons** | Lucide React |
| **QR Codes** | `qrcode` (client-side SVG) |
| **Confetti** | `canvas-confetti` |
| **Lyrics** | LRCLIB API |
| **Video** | YouTube IFrame Player API |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx                # Global fonts (Poppins), SEO metadata
│   ├── page.tsx                  # Home page — Create Room / Join Room
│   ├── room/[code]/
│   │   └── page.tsx              # Room page — routes to TV or Controller layout
│   └── api/
│       ├── youtube/route.ts      # YouTube Data API proxy + static fallback catalog
│       └── lyrics/route.ts       # LRCLIB lyrics proxy + local LRC fallbacks
│
├── components/room/
│   ├── RoomLayout.tsx            # Responsive 3-column desktop / tabbed mobile layout
│   ├── TheaterMode.tsx           # YouTube player, lyrics, AI score overlay, reactions
│   ├── ControlPanel.tsx          # Search, queue, host controls, settings toggles
│   ├── SidebarLeft.tsx           # QR code, online users, leaderboard
│   ├── SidebarRight.tsx          # Live chat, emoji reactions, party feed
│   ├── ScoringModal.tsx          # Manual rating sliders + AI score card display
│   └── PassTheMic.tsx            # SVG roulette wheel spinner
│
├── hooks/
│   ├── useSupabase.ts            # Supabase client singleton
│   └── useRoom.ts                # All real-time subscriptions, DB mutations, demo mode
│
├── store/
│   └── useRoomStore.ts           # Zustand global state (session, toggles, UI state)
│
├── lib/
│   ├── utils.ts                  # `cn()` Tailwind class merger
│   └── lyrics-parser.ts          # LRC format parser → `{ time, text }[]`
│
└── types/
    └── index.ts                  # Shared TypeScript interfaces
```

---

## 🗄️ Database Schema

The Supabase PostgreSQL schema (see [`schema.sql`](./schema.sql)) includes 10 tables:

| Table | Purpose |
|---|---|
| `rooms` | Room code, name, host token, playback state |
| `room_users` | Guests with nickname, role, online status |
| `songs` | YouTube video metadata cache |
| `queue_items` | Song queue with position, status, vote counts |
| `chat_messages` | Live chat log |
| `notifications` | System event notifications |
| `reactions` | Emoji reaction log |
| `scores` | Per-song ratings (voice, presence, energy, impact, choice) |
| `leaderboards` | Aggregated ranking metrics per room |
| `party_events` | Audit feed (joined, added song, scored, mic passed) |

All tables have Row-Level Security (RLS) enabled with permissive public policies for anonymous room access. Performance indexes are applied to all foreign-key and filter columns.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) account (free tier works) — **optional**, app runs in demo mode without it
- A [Google Cloud](https://console.cloud.google.com) YouTube Data API v3 key — **optional**, static catalog is used as fallback

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd projects/karaokehub
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase (optional — app runs in demo mode without these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# YouTube Data API v3 (optional — uses static catalog without this)
YOUTUBE_API_KEY=your-youtube-api-key
```

### 3. Set Up Database (Supabase only)

If using Supabase, open your project's **SQL Editor** and run the contents of [`schema.sql`](./schema.sql).

> **Important:** After running the schema, go to your Supabase dashboard → **Database → Replication** and enable Realtime on the following tables: `rooms`, `room_users`, `queue_items`, `chat_messages`, `scores`, `party_events`, `leaderboards`.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🎮 How to Use

### As a Host (Creating a Room)

1. Go to the home page and fill in a **Room Name** and your **Nickname**.
2. Click **CREATE ROOM** — you'll be taken to your room controller.
3. Open the room URL on a TV/projector and click **"Switch to TV Mode"** on that device.
4. Share the room code or scan the QR code so guests can join from their phones.
5. Search for songs in the **Search** tab, add them to the queue.
6. Hit the **▶ Play** button next to any queued song to start it.
7. Use **Host DJ Controls** (Queue tab) to pause, skip, or spin the **Pass the Mic** roulette.

### As a Guest (Joining a Room)

1. Enter the 6-character room code and your nickname.
2. Click **JOIN ROOM**.
3. Search for songs and add them to the queue — the host can play them.
4. React with emojis — they'll float up on the TV screen in real time.
5. Rate the current singer using the scoring panel after each song.

---

## ⚙️ Host Settings (Toggleable)

Found in the **Queue** tab → Host DJ Controls section:

| Toggle | Default | Description |
|---|---|---|
| **AI Auto-Scoring** | On | Automatically generates a fun random score and judge comment after each song. Disabling this activates the manual audience-rating sliders instead. |
| **Freestyle Prompts** | On | Shows a "Lyrics not found, time to freestyle! 🎤" message on the player when lyrics are unavailable. Disable to keep the player clean. |

---

## 🌐 Deploying to Vercel

1. Push the project to a GitHub repository.
2. Import the repo in your [Vercel Dashboard](https://vercel.com/dashboard).
3. Set the **Root Directory** to `projects/karaokehub` (if inside a monorepo).
4. Add the following **Environment Variables** in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `YOUTUBE_API_KEY`
5. Deploy. Vercel will automatically detect Next.js and configure the build.

---

## 🔧 API Routes

### `GET /api/youtube?q={query}`

Searches YouTube for karaoke tracks. Returns an array of video objects:

```json
[
  {
    "youtubeId": "fJ9rUzIMcZQ",
    "title": "Bohemian Rhapsody - Karaoke Version",
    "channelTitle": "KaraFun Karaoke",
    "thumbnailUrl": "https://i.ytimg.com/vi/fJ9rUzIMcZQ/mqdefault.jpg",
    "duration": 367,
    "artist": "Queen"
  }
]
```

Falls back to a curated static library of popular karaoke tracks if `YOUTUBE_API_KEY` is not set.

---

### `GET /api/lyrics?track={title}&artist={artist}&youtubeId={id}`

Fetches synchronized LRC lyrics from LRCLIB. Returns:

```json
{
  "lyrics": "[00:12.30] Is this the real life?\n[00:15.50] Is this just fantasy?"
}
```

Falls back to a local pre-timed LRC database for popular songs. Returns `{ "lyrics": null }` if no lyrics are found.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request.

---

## 📄 License

This project is private and part of the **PatCommandCenter** monorepo.

---

*Built with ❤️ for karaoke nights that actually slap.*
