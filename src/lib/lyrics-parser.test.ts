import { describe, it, expect } from 'vitest';
import { parseLRC } from './lyrics-parser';

describe('parseLRC', () => {
  it('should return an empty array if input is empty or null', () => {
    expect(parseLRC('')).toEqual([]);
    // @ts-expect-error testing runtime robustness
    expect(parseLRC(null)).toEqual([]);
  });

  it('should parse standard LRC format lines with timestamps', () => {
    const lrc = `
[00:12.30] Is this the real life?
[00:15.500] Is this just fantasy?
    `;
    const result = parseLRC(lrc);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ time: 12.3, text: 'Is this the real life?' });
    expect(result[1]).toEqual({ time: 15.5, text: 'Is this just fantasy?' });
  });

  it('should ignore metadata tags starting with brackets and containing colons', () => {
    const lrc = `
[ar: Queen]
[ti: Bohemian Rhapsody]
[00:05.00] Mama, just killed a man
    `;
    const result = parseLRC(lrc);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ time: 5, text: 'Mama, just killed a man' });
  });

  it('should parse static text lines without timestamp tags with a time of -1', () => {
    const lrc = `
Intro instrumental
[00:10.00] First sung line
End of song
    `;
    const result = parseLRC(lrc);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ time: -1, text: 'Intro instrumental' });
    expect(result[1]).toEqual({ time: -1, text: 'End of song' });
    expect(result[2]).toEqual({ time: 10, text: 'First sung line' });
  });

  it('should sort the resulting lyric lines in ascending order of time', () => {
    const lrc = `
[00:20.00] Line 3
[00:05.00] Line 1
[00:12.50] Line 2
    `;
    const result = parseLRC(lrc);

    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('Line 1');
    expect(result[1].text).toBe('Line 2');
    expect(result[2].text).toBe('Line 3');
    expect(result[0].time).toBe(5);
    expect(result[1].time).toBe(12.5);
    expect(result[2].time).toBe(20);
  });
});
