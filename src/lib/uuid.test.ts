import { vi, describe, it, expect, afterEach } from 'vitest';

describe('safeUUID', () => {
  afterEach(() => {
    // Reset module cache so that the module-level native reference is re-evaluated
    vi.resetModules();
  });

  it('should use crypto.randomUUID when available', async () => {
    const mockUUID = '12345678-1234-1234-1234-123456789abc';
    const randomUUIDFn = vi.fn().mockReturnValue(mockUUID);
    
    vi.stubGlobal('crypto', { randomUUID: randomUUIDFn });
    
    const { safeUUID } = await import('./uuid');
    const result = safeUUID();
    
    expect(randomUUIDFn).toHaveBeenCalled();
    expect(result).toBe(mockUUID);
    vi.unstubAllGlobals();
  });

  it('should fallback to Math.random-based generator when crypto or randomUUID is undefined', async () => {
    vi.stubGlobal('crypto', undefined);
    
    const { safeUUID } = await import('./uuid');
    const result = safeUUID();
    
    // Validate UUID v4 format
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    vi.unstubAllGlobals();
  });
});
