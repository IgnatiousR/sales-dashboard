import { CacheItem, CacheConfig } from "@/types";

class Cache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private duration: number;

  constructor(config: CacheConfig = {}) {
    this.duration = config.durationMs ?? 60 * 60 * 1000;
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
