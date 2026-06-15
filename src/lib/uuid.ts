/**
 * Safely generates a UUID v4.
 * Captures the native crypto.randomUUID reference once at module load time
 * to avoid infinite recursion from any global patching.
 * Falls back to a Math.random-based generator in insecure contexts
 * (e.g., HTTP on local network IPs where crypto.randomUUID is unavailable).
 */

// Capture the native reference ONCE at module load — before any polyfill can replace it.
const _nativeRandomUUID: (() => `${string}-${string}-${string}-${string}-${string}`) | undefined =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as typeof globalThis & { crypto?: Crypto }).crypto?.randomUUID === "function"
    ? (globalThis as typeof globalThis & { crypto: Crypto }).crypto.randomUUID.bind(
        (globalThis as typeof globalThis & { crypto: Crypto }).crypto
      )
    : undefined;

/** UUID v4 fallback using Math.random (safe in non-secure HTTP contexts). */
function mathRandomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a UUID v4. Uses the native crypto.randomUUID when available,
 * otherwise falls back to a Math.random-based implementation.
 */
export function safeUUID(): string {
  return _nativeRandomUUID ? _nativeRandomUUID() : mathRandomUUID();
}
