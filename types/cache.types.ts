export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export interface CacheConfig {
  durationMs?: number;
}
