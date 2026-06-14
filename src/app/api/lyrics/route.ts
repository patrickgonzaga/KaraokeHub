import { NextRequest, NextResponse } from "next/server";

// Hardcoded timed lyrics fallback for popular catalog items to ensure instant reliability
const LOCAL_LYRICS_DB: Record<string, string> = {
  // Bohemian Rhapsody
  "fJ9rUzIMcZQ": `
[00:00.00] (Instrumental Intro)
[00:05.00] Is this the real life? Is this just fantasy?
[00:13.00] Caught in a landslide, no escape from reality
[00:20.00] Open your eyes, look up to the skies and see
[00:29.00] I'm just a poor boy, I need no sympathy
[00:35.00] Because I'm easy come, easy go, little high, little low
[00:43.00] Any way the wind blows doesn't really matter to me, to me
[00:54.00] Mama, just killed a man
[00:59.00] Put a gun against his head, pulled my trigger, now he's dead
[01:07.00] Mama, life had just begun
[01:13.00] But now I've gone and thrown it all away
[01:19.00] Mama, ooh, didn't mean to make you cry
[01:27.00] If I'm not back again this time tomorrow
[01:31.00] Carry on, carry on as if nothing really matters
[01:42.00] Too late, my time has come
[01:47.00] Sends shivers down my spine, body's aching all the time
[01:55.00] Goodbye, everybody, I've got to go
[02:01.00] Gotta leave you all behind and face the truth
[02:07.00] Mama, ooh, (any way the wind blows)
[02:15.00] I don't wanna die
[02:18.00] I sometimes wish I'd never been born at all
[02:24.00] (Guitar Solo Instrumental)
[02:50.00] I see a little silhouetto of a man
[02:53.00] Scaramouche, Scaramouche, will you do the Fandango?
[02:56.00] Thunderbolt and lightning, very, very frightening me
[03:00.00] (Galileo) Galileo, (Galileo) Galileo, Galileo Figaro, magnifico
[03:07.00] I'm just a poor boy, nobody loves me
[03:10.00] He's just a poor boy from a poor family
[03:13.00] Spare him his life from this monstrosity
[03:16.00] Easy come, easy go, will you let me go?
[03:19.00] Bismillah! No, we will not let you go
[03:22.00] (Let him go!) Bismillah! We will not let you go
[03:25.00] (Let him go!) Bismillah! We will not let you go
[03:27.00] (Let me go!) Will not let you go
[03:29.00] (Let me go!) Will not let you go
[03:31.00] (Let me go!) Ah, no, no, no, no, no, no, no
[03:34.00] (Oh, mamma mia, mamma mia) Mamma mia, let me go
[03:37.00] Beelzebub has a devil put aside for me, for me, for me!
[03:45.00] (Rock Guitar Breakout)
[04:08.00] So you think you can stone me and spit in my eye?
[04:13.00] So you think you can love me and leave me to die?
[04:18.00] Oh, baby, can't do this to me, baby!
[04:23.00] Just gotta get out, just gotta get right outta here!
[04:29.00] (Guitar Outro Theme)
[04:55.00] Nothing really matters, anyone can see
[05:05.00] Nothing really matters
[05:10.00] Nothing really matters to me
[05:18.00] Any way the wind blows...
  `,
  // Don't Stop Believin'
  "1k8craCGtmo": `
[00:00.00] (Instrumental Keyboard Intro)
[00:16.00] Just a small-town girl, living in a lonely world
[00:24.00] She took the midnight train going anywhere
[00:32.00] Just a city boy, born and raised in South Detroit
[00:40.00] He took the midnight train going anywhere
[00:48.00] (Instrumental Guitar Accent)
[00:56.00] A singer in a smoky room, the smell of wine and cheap perfume
[01:04.00] For a smile they can share the night, it goes on and on and on and on
[01:12.00] Strangers, waiting, up and down the boulevard
[01:20.00] Their shadows, searching in the night
[01:28.00] Streetlights, people, living just to find emotion
[01:36.00] Hiding somewhere in the night
[01:43.00] (Guitar Solo Break)
[01:52.00] Working hard to get my fill, everybody wants a thrill
[02:00.00] Paying anything to roll the dice, just one more time
[02:08.00] Some will win, some will lose, some were born to sing the blues
[02:16.00] Oh, the movie never ends, it goes on and on and on and on
[02:24.00] Strangers, waiting, up and down the boulevard
[02:32.00] Their shadows, searching in the night
[02:40.00] Streetlights, people, living just to find emotion
[02:48.00] Hiding somewhere in the night
[02:56.00] (Guitar Bridge Outro)
[03:19.00] Don't stop believin', hold on to that feelin'
[03:28.00] Streetlights, people
[03:32.00] Don't stop believin', hold on
[03:39.00] Streetlights, people
[03:43.00] Don't stop believin', hold on to that feelin'
[03:52.00] Streetlights, people
  `,
  // Let It Go
  "L0MK7qz13bU": `
[00:00.00] (Intro piano theme)
[00:08.00] The snow glows white on the mountain tonight, not a footprint to be seen
[00:15.00] A kingdom of isolation, and it looks like I'm the queen
[00:22.00] The wind is howling like this swirling storm inside
[00:29.00] Couldn't keep it in, heaven knows I tried
[00:36.00] Don't let them in, don't let them see, be the good girl you always have to be
[00:43.00] Conceal, don't feel, don't let them know... Well, now they know!
[00:51.00] Let it go, let it go! Can't hold it back anymore
[00:58.00] Let it go, let it go! Turn away and slam the door!
[01:05.00] I don't care what they're going to say
[01:11.00] Let the storm rage on, the cold never bothered me anyway
[01:19.00] It's funny how some distance makes everything seem small
[01:26.00] And the fears that once controlled me can't get to me at all
[01:33.00] It's time to see what I can do, to test the limits and break through
[01:40.00] No right, no wrong, no rules for me... I'm free!
[01:47.00] Let it go, let it go! I am one with the wind and sky
[01:54.00] Let it go, let it go! You'll never see me cry!
[02:01.00] Here I stand and here I'll stay
[02:07.00] Let the storm rage on...
[02:11.00] (Instrumental Bridge)
[02:23.00] My power flurries through the air into the ground
[02:26.00] My soul is spiraling in frozen fractals all around
[02:30.00] And one thought crystallizes like an icy blast
[02:34.00] I'm never going back, the past is in the past!
[02:40.00] Let it go, let it go! And I'll rise like the break of dawn
[02:47.00] Let it go, let it go! That perfect girl is gone!
[02:55.00] Here I stand in the light of day
[03:02.00] Let the storm rage on, the cold never bothered me anyway!
  `
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const track = searchParams.get("track") || "";
    const artist = searchParams.get("artist") || "";
    const youtubeId = searchParams.get("youtubeId") || "";

    // Check local database first if we have a match
    if (youtubeId && LOCAL_LYRICS_DB[youtubeId]) {
      return NextResponse.json({
        synced: true,
        lyrics: LOCAL_LYRICS_DB[youtubeId],
        source: "local"
      });
    }

    // Try keying off titles if there's no direct ID match but we know the title
    if (track) {
      const trackLower = track.toLowerCase();
      if (trackLower.includes("bohemian rhapsody")) {
        return NextResponse.json({ synced: true, lyrics: LOCAL_LYRICS_DB["fJ9rUzIMcZQ"], source: "local" });
      }
      if (trackLower.includes("don't stop believin")) {
        return NextResponse.json({ synced: true, lyrics: LOCAL_LYRICS_DB["1k8craCGtmo"], source: "local" });
      }
      if (trackLower.includes("let it go")) {
        return NextResponse.json({ synced: true, lyrics: LOCAL_LYRICS_DB["L0MK7qz13bU"], source: "local" });
      }
    }

    if (!track.trim()) {
      return NextResponse.json({ synced: false, lyrics: "Lyrics not found.", source: "none" });
    }

    // Call LRCLIB Search API
    // Strip "karaoke" from track name if it was appended, to get better matches
    const cleanTrack = track.replace(/\((?:karaoke|acoustic|lyrics|version|cover)\)/gi, "").trim();
    const query = `${cleanTrack} ${artist}`.trim();
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "KaraokeHub Client (github.com/patrickgonzaga/KaraokeHub)"
      }
    });

    if (!response.ok) {
      throw new Error(`LRCLIB Search error: ${response.statusText}`);
    }

    const results = await response.json();
    if (results.length === 0) {
      return NextResponse.json({ synced: false, lyrics: "Lyrics not found. Time to freestyle!", source: "api_empty" });
    }

    // Find the first result containing synced lyrics, otherwise plain lyrics
    const bestMatch = results.find((r: any) => r.syncedLyrics) || results[0];

    if (bestMatch.syncedLyrics) {
      return NextResponse.json({
        synced: true,
        lyrics: bestMatch.syncedLyrics,
        source: "lrclib"
      });
    }

    if (bestMatch.plainLyrics) {
      return NextResponse.json({
        synced: false,
        lyrics: bestMatch.plainLyrics,
        source: "lrclib"
      });
    }

    return NextResponse.json({ synced: false, lyrics: "Lyrics not found.", source: "api_none" });
  } catch (error: any) {
    console.error("Lyrics retrieval error:", error);
    return NextResponse.json({
      synced: false,
      lyrics: "Lyrics could not be loaded due to a network connection error.",
      source: "error"
    });
  }
}
