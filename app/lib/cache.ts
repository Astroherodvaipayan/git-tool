/**
 * Simple in-memory cache for GitHub API responses
 * 
 * This helps reduce API calls and avoid rate limits
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries in the cache
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // 100 entries
};

class ApiCache {
  private cache: Map<string, CacheEntry<any>>;
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get an item from the cache
   * @param key Cache key
   * @returns The cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Remove expired entry
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set an item in the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Optional custom TTL for this entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.options.ttl);

    // Check if we need to clean up the cache
    if (this.cache.size >= this.options.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Check if the cache has a valid (non-expired) entry
   * @param key Cache key
   * @returns true if the cache has a valid entry
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Remove expired entry
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove an item from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries and ensure the cache stays within size limits
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // First remove expired entries
    entries.forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });

    // If still too big, remove oldest entries
    if (this.cache.size >= this.options.maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove the oldest 20% of entries
      const removeCount = Math.ceil(this.options.maxSize * 0.2);
      sortedEntries.slice(0, removeCount).forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;

    this.cache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
    });

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      validEntries: this.cache.size - expiredCount,
    };
  }
}

// Create global cache instances
export const repoCache = new ApiCache({ ttl: 10 * 60 * 1000 }); // 10 minutes for repo data
export const contentCache = new ApiCache({ ttl: 30 * 60 * 1000 }); // 30 minutes for content
export const rateLimitCache = new ApiCache({ ttl: 30 * 1000 }); // 30 seconds for rate limit 