// Simple in-memory rate limiter for auth endpoints
// Key: IP + endpoint, Value: timestamp[] of recent requests

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10; // max requests per window

const store = new Map<string, number[]>();

export function rateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const window = store.get(key) || [];

  // Filter to only requests within the window
  const recent = window.filter((t) => now - t < WINDOW_MS);
  store.set(key, recent);

  if (recent.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  store.set(key, recent);
  return { allowed: true, remaining: MAX_REQUESTS - recent.length };
}
