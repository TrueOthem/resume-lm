// utils/rateLimiter.ts

// Simple in-memory rate limiter stub for development (not for production)
const memoryStore = new Map<string, { count: number; last: number }>();
const LIMIT = 10000; // max requests
const WINDOW = 60 * 100000; // 1 minute

export async function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now - entry.last > WINDOW) {
    memoryStore.set(key, { count: 1, last: now });
    return;
  }
  if (entry.count >= LIMIT) {
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((WINDOW - (now - entry.last)) / 1000)} seconds.`);
  }
  entry.count++;
  memoryStore.set(key, entry);
}
