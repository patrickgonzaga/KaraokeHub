import { NextRequest, NextResponse } from "next/server";

// Fallback search results when YouTube API key is missing or quota is exceeded.
// Contains high quality popular karaoke videos.
const FALLBACK_KARAOKE_SONGS = [
  {
    youtubeId: "fJ9rUzIMcZQ",
    title: "Bohemian Rhapsody - Queen (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
    duration: 355, // 5:55
    artist: "Queen",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "1k8craCGtmo",
    title: "Don't Stop Believin' - Journey (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/1k8craCGtmo/hqdefault.jpg",
    duration: 250, // 4:10
    artist: "Journey",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "L0MK7qz13bU",
    title: "Let It Go - Frozen (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/L0MK7qz13bU/hqdefault.jpg",
    duration: 223, // 3:43
    artist: "Idina Menzel",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "3vV84Xp6P-Q",
    title: "Dancing Queen - ABBA (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/3vV84Xp6P-Q/hqdefault.jpg",
    duration: 232, // 3:52
    artist: "ABBA",
    channelTitle: "Karaoke Version",
  },
  {
    youtubeId: "qDafP9-1sX8",
    title: "My Way - Frank Sinatra (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/qDafP9-1sX8/hqdefault.jpg",
    duration: 280, // 4:40
    artist: "Frank Sinatra",
    channelTitle: "Karaoke Academy",
  },
  {
    youtubeId: "hLQl3WQQoQ0",
    title: "Someone Like You - Adele (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/hLQl3WQQoQ0/hqdefault.jpg",
    duration: 287, // 4:47
    artist: "Adele",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "1Z6CHa7FjU0",
    title: "Sweet Caroline - Neil Diamond (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/1Z6CHa7FjU0/hqdefault.jpg",
    duration: 212, // 3:32
    artist: "Neil Diamond",
    channelTitle: "Karaoke Planet",
  },
  {
    youtubeId: "7X_WME3LwX0",
    title: "I Want It That Way - Backstreet Boys (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/7X_WME3LwX0/hqdefault.jpg",
    duration: 218, // 3:38
    artist: "Backstreet Boys",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "Jmx_H6y9w8o",
    title: "I Will Survive - Gloria Gaynor (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/Jmx_H6y9w8o/hqdefault.jpg",
    duration: 198, // 3:18
    artist: "Gloria Gaynor",
    channelTitle: "Karaoke Version",
  },
  {
    youtubeId: "F1k6p0h4_B8",
    title: "Hotel California - Eagles (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/F1k6p0h4_B8/hqdefault.jpg",
    duration: 400, // 6:40
    artist: "Eagles",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "kffacxfcolQ",
    title: "Uptown Funk - Mark Ronson ft. Bruno Mars (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/kffacxfcolQ/hqdefault.jpg",
    duration: 270, // 4:30
    artist: "Bruno Mars",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "MhG1yS2Zqks",
    title: "All Of Me - John Legend (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/MhG1yS2Zqks/hqdefault.jpg",
    duration: 305, // 5:05
    artist: "John Legend",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "WcM14g2xG0w",
    title: "Creep - Radiohead (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/WcM14g2xG0w/hqdefault.jpg",
    duration: 242, // 4:02
    artist: "Radiohead",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "Y26c_W1gG6A",
    title: "Rolling in the Deep - Adele (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/Y26c_W1gG6A/hqdefault.jpg",
    duration: 234, // 3:54
    artist: "Adele",
    channelTitle: "Sing King",
  },
  {
    youtubeId: "P_w2fPqE9O0",
    title: "Fly Me To The Moon - Frank Sinatra (Karaoke Version)",
    thumbnailUrl: "https://i.ytimg.com/vi/P_w2fPqE9O0/hqdefault.jpg",
    duration: 154, // 2:34
    artist: "Frank Sinatra",
    channelTitle: "Sing King",
  },
];

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // Fallback if API Key is not set or query is basic
    if (!apiKey) {
      const lowerQuery = query.toLowerCase();
      const filtered = FALLBACK_KARAOKE_SONGS.filter(
        (song) =>
          song.title.toLowerCase().includes(lowerQuery) ||
          song.artist.toLowerCase().includes(lowerQuery)
      );
      
      // If we didn't find specific hits in fallback database, return them all so the screen has options
      return NextResponse.json(filtered.length > 0 ? filtered : FALLBACK_KARAOKE_SONGS);
    }

    // Official Youtube Search API Call
    // Append "karaoke" to query to prioritize karaoke versions
    const searchQuery = query.toLowerCase().includes("karaoke") ? query : `${query} karaoke`;
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(
      searchQuery
    )}&type=video&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`YouTube API Search error: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    const items = searchData.items || [];
    
    if (items.length === 0) {
      return NextResponse.json([]);
    }

    const videoIds = items.map((item: any) => item.id.videoId).join(",");

    // Get durations for search results
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) {
      throw new Error(`YouTube API Details error: ${detailsResponse.statusText}`);
    }

    const detailsData = await detailsResponse.json();
    const videoDetails = detailsData.items || [];

    const results = videoDetails.map((video: any) => {
      const durationSeconds = parseISO8601Duration(video.contentDetails?.duration || "PT0S");
      const title = video.snippet?.title || "";
      
      // Parse artist out of title "Artist - Song (Karaoke)" or similar if possible
      let artist = video.snippet?.channelTitle || "";
      const splitDash = title.split("-");
      if (splitDash.length > 1) {
        artist = splitDash[0].trim();
      }

      return {
        youtubeId: video.id,
        title: title,
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url,
        duration: durationSeconds,
        artist: artist,
        channelTitle: video.snippet?.channelTitle,
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("YouTube search error:", error);
    // Graceful fallback to static list if API request fails (e.g. invalid key)
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const lowerQuery = query.toLowerCase();
    const filtered = FALLBACK_KARAOKE_SONGS.filter(
      (song) =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery)
    );
    return NextResponse.json(filtered.length > 0 ? filtered : FALLBACK_KARAOKE_SONGS);
  }
}
