export class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();
  private defaultTtlMs: number;

  constructor(defaultTtlSeconds: number = 60) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null; // Expired
    }

    return item.data;
  }

  set(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Global instances for reuse across function invocations
export const zonesCache = new MemoryCache<any[]>(60); // 60 seconds
export const servicesCache = new MemoryCache<any>(60); // 60 seconds
