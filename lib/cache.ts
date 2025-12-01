interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private duration: number;

  constructor(durationMs: number = 60 * 60 * 1000) {
    this.duration = durationMs;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.duration) {
      return cached.data;
    }

    this.cache.delete(key);
    return null;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export default Cache;
