export interface LyricLine {
  time: number; // Time in seconds
  text: string;
}

/**
 * Parses LRC formatted string into structured timestamped array.
 * Example of LRC:
 * [00:12.30] Is this the real life?
 * [00:15.50] Is this just fantasy?
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  
  // Pattern to match [mm:ss.xx] or [mm:ss.xxx]
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    // Reset regex index
    timeRegex.lastIndex = 0;
    
    const timeMatch = timeRegex.exec(line);
    if (!timeMatch) {
      // If it's just metadata (e.g. [ar: Queen]), skip it
      if (line.startsWith("[") && line.includes(":")) {
        continue;
      }
      
      // If line is non-empty text, add it as static text
      const cleanText = line.trim();
      if (cleanText) {
        result.push({ time: -1, text: cleanText });
      }
      continue;
    }

    // Capture time values
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);
    const msStr = timeMatch[3] || "0";
    // Convert ms string to numeric fraction (e.g. "30" -> 0.3, "300" -> 0.3)
    const msFraction = msStr.length === 2 
      ? parseInt(msStr, 10) / 100 
      : parseInt(msStr, 10) / 1000;

    const totalSeconds = minutes * 60 + seconds + msFraction;
    
    // The lyrics text is whatever is after the timestamp tags
    const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, "").trim();

    // Sometimes LRC has multiple timestamps on a single line. 
    // In standard cases we just push the line.
    result.push({
      time: totalSeconds,
      text: text,
    });
  }

  // Sort by time ascending
  return result
    .filter((line) => line.time >= 0 || line.text.length > 0)
    .sort((a, b) => a.time - b.time);
}
