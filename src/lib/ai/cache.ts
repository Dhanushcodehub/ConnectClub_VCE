import { createHash } from "node:crypto";
import { AI_CONFIG } from "./config";

interface CacheEntry {
  value: string;
  provider: string;
  expiresAt: number;
}

class LRUCache {
  private entries = new Map<string, CacheEntry>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number
  ) {}

  get(key: string): CacheEntry | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) this.entries.delete(oldestKey);
    }
    this.entries.set(key, entry);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

const cache = new LRUCache(AI_CONFIG.cache.maxEntries, AI_CONFIG.cache.ttlMs);

export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashQuery(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

export function getCachedResponse(rawQuery: string): {
  content: string;
  provider: string;
  cached: boolean;
} | null {
  const key = hashQuery(normalizeQuery(rawQuery));
  const entry = cache.get(key);
  if (!entry) return null;
  return { content: entry.value, provider: entry.provider, cached: true };
}

export function setCachedResponse(rawQuery: string, content: string, provider: string): void {
  const key = hashQuery(normalizeQuery(rawQuery));
  cache.set(key, {
    value: content,
    provider,
    expiresAt: Date.now() + AI_CONFIG.cache.ttlMs,
  });
}

export function clearAiCache(): void {
  cache.clear();
}
