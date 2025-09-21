/**
 * Advanced Cache Manager for Diagram Detection System
 * Provides intelligent caching with LRU eviction, compression, and persistence
 */

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxItems: number; // Maximum number of items
  ttl: number; // Time to live in milliseconds
  compressionThreshold: number; // Compress items larger than this size
  persistToDisk: boolean; // Persist cache to localStorage/IndexedDB
  enableMetrics: boolean; // Track cache performance metrics
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  size: number; // Size in bytes
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  compressed: boolean;
  ttl?: number; // Override global TTL
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  compressions: number;
  totalSize: number;
  itemCount: number;
  hitRate: number;
  averageAccessTime: number;
}

export class CacheManager<T = any> {
  private config: CacheConfig;
  private cache: Map<string, CacheItem<T>> = new Map();
  private accessOrder: string[] = []; // For LRU tracking
  private metrics: CacheMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxItems: 1000,
      ttl: 30 * 60 * 1000, // 30 minutes
      compressionThreshold: 1024, // 1KB
      persistToDisk: true,
      enableMetrics: true,
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressions: 0,
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      averageAccessTime: 0
    };

    this.initializeCleanup();
    this.loadFromPersistence();
  }

  /**
   * Set an item in the cache
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = performance.now();

    try {
      // Calculate item size
      const serialized = JSON.stringify(value);
      let size = new Blob([serialized]).size;
      let compressed = false;
      let finalValue = value;

      // Compress if above threshold
      if (size > this.config.compressionThreshold) {
        try {
          const compressedData = await this.compress(serialized);
          if (compressedData.length < serialized.length) {
            finalValue = compressedData as T;
            size = compressedData.length;
            compressed = true;
            this.metrics.compressions++;
          }
        } catch (error) {
          console.warn('Compression failed, storing uncompressed:', error);
        }
      }

      const item: CacheItem<T> = {
        key,
        value: finalValue,
        size,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        compressed,
        ttl: ttl || this.config.ttl
      };

      // Remove existing item if present
      if (this.cache.has(key)) {
        this.remove(key);
      }

      // Ensure we have space
      await this.ensureSpace(size);

      // Add to cache
      this.cache.set(key, item);
      this.updateAccessOrder(key);
      this.updateMetrics();

      // Persist if enabled
      if (this.config.persistToDisk) {
        this.persistItem(key, item);
      }

    } finally {
      if (this.config.enableMetrics) {
        const duration = performance.now() - startTime;
        this.updateAverageAccessTime(duration);
      }
    }
  }

  /**
   * Get an item from the cache
   */
  async get(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      const item = this.cache.get(key);

      if (!item) {
        this.metrics.misses++;
        return null;
      }

      // Check TTL
      if (this.isExpired(item)) {
        this.remove(key);
        this.metrics.misses++;
        return null;
      }

      // Update access tracking
      item.accessCount++;
      item.lastAccessed = Date.now();
      this.updateAccessOrder(key);
      this.metrics.hits++;

      // Decompress if needed
      let value = item.value;
      if (item.compressed) {
        try {
          const decompressed = await this.decompress(value as any);
          value = JSON.parse(decompressed);
        } catch (error) {
          console.error('Decompression failed:', error);
          this.remove(key);
          return null;
        }
      }

      return value;

    } finally {
      if (this.config.enableMetrics) {
        const duration = performance.now() - startTime;
        this.updateAverageAccessTime(duration);
        this.updateHitRate();
      }
    }
  }

  /**
   * Check if an item exists in cache
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (this.isExpired(item)) {
      this.remove(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove an item from cache
   */
  remove(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    this.cache.delete(key);
    this.removeFromAccessOrder(key);
    this.metrics.totalSize -= item.size;
    this.metrics.itemCount--;

    if (this.config.persistToDisk) {
      this.removePersistentItem(key);
    }

    return true;
  }

  /**
   * Clear all items from cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.metrics.totalSize = 0;
    this.metrics.itemCount = 0;

    if (this.config.persistToDisk) {
      this.clearPersistence();
    }
  }

  /**
   * Get multiple items at once
   */
  async getMultiple(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    // Use Promise.all for concurrent access
    const promises = keys.map(async (key) => {
      const value = await this.get(key);
      return { key, value };
    });

    const resolved = await Promise.all(promises);
    resolved.forEach(({ key, value }) => {
      results.set(key, value);
    });

    return results;
  }

  /**
   * Set multiple items at once
   */
  async setMultiple(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    // Use Promise.all for concurrent setting
    const promises = items.map(({ key, value, ttl }) => this.set(key, value, ttl));
    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics {
    this.updateHitRate();
    return { ...this.metrics };
  }

  /**
   * Get cache size information
   */
  getSizeInfo(): {
    totalSize: number;
    maxSize: number;
    utilization: number;
    itemCount: number;
    maxItems: number;
    averageItemSize: number;
  } {
    const averageItemSize = this.metrics.itemCount > 0 
      ? this.metrics.totalSize / this.metrics.itemCount 
      : 0;

    return {
      totalSize: this.metrics.totalSize,
      maxSize: this.config.maxSize,
      utilization: (this.metrics.totalSize / this.config.maxSize) * 100,
      itemCount: this.metrics.itemCount,
      maxItems: this.config.maxItems,
      averageItemSize: Math.round(averageItemSize)
    };
  }

  /**
   * Cleanup expired items
   */
  cleanup(): number {
    let removedCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.remove(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Prefetch items based on access patterns
   */
  async prefetch(keys: string[], loader: (key: string) => Promise<T>): Promise<void> {
    const missingKeys = keys.filter(key => !this.has(key));
    
    if (missingKeys.length === 0) return;

    // Load missing items concurrently
    const loadPromises = missingKeys.map(async (key) => {
      try {
        const value = await loader(key);
        await this.set(key, value);
      } catch (error) {
        console.warn(`Failed to prefetch ${key}:`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  // Private methods

  private isExpired(item: CacheItem<T>): boolean {
    const ttl = item.ttl || this.config.ttl;
    return Date.now() - item.timestamp > ttl;
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check size limit
    while (this.metrics.totalSize + requiredSize > this.config.maxSize) {
      if (!this.evictLRU()) break;
    }

    // Check item count limit
    while (this.metrics.itemCount >= this.config.maxItems) {
      if (!this.evictLRU()) break;
    }
  }

  private evictLRU(): boolean {
    if (this.accessOrder.length === 0) return false;

    const lruKey = this.accessOrder[0];
    this.remove(lruKey);
    this.metrics.evictions++;
    
    return true;
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private updateMetrics(): void {
    this.metrics.itemCount = this.cache.size;
    this.metrics.totalSize = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.size, 0);
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  private updateAverageAccessTime(duration: number): void {
    const totalAccesses = this.metrics.hits + this.metrics.misses;
    if (totalAccesses === 1) {
      this.metrics.averageAccessTime = duration;
    } else {
      this.metrics.averageAccessTime = 
        (this.metrics.averageAccessTime * (totalAccesses - 1) + duration) / totalAccesses;
    }
  }

  private async compress(data: string): Promise<string> {
    // Simple compression using built-in compression
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new TextEncoder().encode(data));
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      return btoa(String.fromCharCode(...compressed));
    }
    
    // Fallback: no compression
    return data;
  }

  private async decompress(compressedData: string): Promise<string> {
    // Simple decompression
    if (typeof DecompressionStream !== 'undefined') {
      const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(compressed);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      return new TextDecoder().decode(decompressed);
    }
    
    // Fallback: no decompression
    return compressedData;
  }

  private initializeCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private async loadFromPersistence(): Promise<void> {
    if (!this.config.persistToDisk || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const cacheData = localStorage.getItem(`cache_${this.constructor.name}`);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        for (const [key, item] of Object.entries(parsed)) {
          if (!this.isExpired(item as CacheItem<T>)) {
            this.cache.set(key, item as CacheItem<T>);
            this.updateAccessOrder(key);
          }
        }
        this.updateMetrics();
      }
    } catch (error) {
      console.warn('Failed to load cache from persistence:', error);
    }
  }

  private persistItem(key: string, item: CacheItem<T>): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const cacheKey = `cache_${this.constructor.name}`;
      const existing = localStorage.getItem(cacheKey);
      const cacheData = existing ? JSON.parse(existing) : {};
      
      cacheData[key] = item;
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to persist cache item:', error);
    }
  }

  private removePersistentItem(key: string): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const cacheKey = `cache_${this.constructor.name}`;
      const existing = localStorage.getItem(cacheKey);
      if (existing) {
        const cacheData = JSON.parse(existing);
        delete cacheData[key];
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.warn('Failed to remove persistent cache item:', error);
    }
  }

  private clearPersistence(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.removeItem(`cache_${this.constructor.name}`);
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Specialized cache managers
export class ImageCache extends CacheManager<HTMLImageElement> {
  constructor() {
    super({
      maxSize: 100 * 1024 * 1024, // 100MB for images
      maxItems: 500,
      ttl: 60 * 60 * 1000, // 1 hour
      compressionThreshold: Infinity, // Don't compress images
      persistToDisk: false // Don't persist images to disk
    });
  }
}

export class CoordinateCache extends CacheManager<any> {
  constructor() {
    super({
      maxSize: 10 * 1024 * 1024, // 10MB for coordinates
      maxItems: 2000,
      ttl: 2 * 60 * 60 * 1000, // 2 hours
      compressionThreshold: 512, // Compress coordinate data
      persistToDisk: true
    });
  }
}

export class DiagramCache extends CacheManager<any> {
  constructor() {
    super({
      maxSize: 50 * 1024 * 1024, // 50MB for rendered diagrams
      maxItems: 1000,
      ttl: 30 * 60 * 1000, // 30 minutes
      compressionThreshold: 1024,
      persistToDisk: false // Don't persist rendered diagrams
    });
  }
}

// Global cache instances
export const imageCache = new ImageCache();
export const coordinateCache = new CoordinateCache();
export const diagramCache = new DiagramCache();