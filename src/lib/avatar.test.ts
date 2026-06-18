import { describe, it, expect } from 'vitest';
import { getAvatarData } from './avatar';

describe('getAvatarData', () => {
  it('should return an object with emoji, gradient, and initials', () => {
    const result = getAvatarData('John');
    
    expect(result).toHaveProperty('emoji');
    expect(result).toHaveProperty('gradient');
    expect(result).toHaveProperty('initials');
    expect(typeof result.emoji).toBe('string');
    expect(typeof result.gradient).toBe('string');
    expect(typeof result.initials).toBe('string');
  });

  it('should be deterministic for the same nickname', () => {
    const result1 = getAvatarData('Alice');
    const result2 = getAvatarData('Alice');
    
    expect(result1).toEqual(result2);
  });

  it('should derive uppercase initials correctly from a normal nickname', () => {
    const result = getAvatarData('bob');
    expect(result.initials).toBe('BO');
  });

  it('should handle nicknames with spaces and special characters', () => {
    // Spaces should be stripped when generating initials
    const resultWithSpace = getAvatarData('A B');
    expect(resultWithSpace.initials).toBe('AB');

    // Special characters should be stripped
    const resultWithSpecial = getAvatarData('!@#Hi$%^');
    expect(resultWithSpecial.initials).toBe('HI');
  });

  it('should fallback to 🎤 when no alphanumeric characters are present in the nickname', () => {
    const resultOnlySpecial = getAvatarData('!!!');
    expect(resultOnlySpecial.initials).toBe('🎤');
  });
});
