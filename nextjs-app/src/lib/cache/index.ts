/**
 * Simple in-memory LRU cache with TTL
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class MemoryCache {
  private store: Map<string, CacheEntry<any>>
  private maxSize: number
  private defaultTTL: number // ms

  constructor(maxSize = 1000, defaultTTL = 60_000) {
    this.store = new Map()
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    // LRU: move to end
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.value as T
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next()
      if (!oldest.done) this.store.delete(oldest.value)
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
    })
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}

export const marketCache = new MemoryCache(500, 30_000)   // 30s TTL for market data
export const klineCache = new MemoryCache(200, 60_000)    // 60s TTL for K-line data
