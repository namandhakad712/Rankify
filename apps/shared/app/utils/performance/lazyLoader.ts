/**
 * Lazy Loading System for Advanced Diagram Detection
 * Provides efficient loading of page images and coordinate data
 */

export interface LazyLoadConfig {
  rootMargin: string;
  threshold: number;
  preloadDistance: number; // Number of items to preload ahead
  maxConcurrentLoads: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface LazyLoadItem {
  id: string;
  type: 'image' | 'coordinate' | 'diagram';
  priority: 'high' | 'medium' | 'low';
  loader: () => Promise<any>;
  onLoad?: (data: any) => void;
  onError?: (error: Error) => void;
  dependencies?: string[]; // Other items this depends on
}

export interface LazyLoadState {
  loading: Set<string>;
  loaded: Set<string>;
  failed: Set<string>;
  queue: LazyLoadItem[];
  cache: Map<string, any>;
}

export class LazyLoader {
  private config: LazyLoadConfig;
  private state: LazyLoadState;
  private observer: IntersectionObserver | null = null;
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<LazyLoadConfig> = {}) {
    this.config = {
      rootMargin: '50px',
      threshold: 0.1,
      preloadDistance: 2,
      maxConcurrentLoads: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.state = {
      loading: new Set(),
      loaded: new Set(),
      failed: new Set(),
      queue: [],
      cache: new Map()
    };

    this.initializeObserver();
  }

  /**
   * Initialize intersection observer for viewport-based loading
   */
  private initializeObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const itemId = entry.target.getAttribute('data-lazy-id');
            if (itemId) {
              this.loadItem(itemId);
            }
          }
        });
      },
      {
        rootMargin: this.config.rootMargin,
        threshold: this.config.threshold
      }
    );
  }

  /**
   * Register an item for lazy loading
   */
  registerItem(item: LazyLoadItem): void {
    // Check if item already exists
    const existingIndex = this.state.queue.findIndex(q => q.id === item.id);
    if (existingIndex !== -1) {
      this.state.queue[existingIndex] = item;
    } else {
      this.state.queue.push(item);
    }

    // Sort queue by priority
    this.state.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Observe an element for lazy loading
   */
  observe(element: Element, itemId: string): void {
    if (!this.observer) return;

    element.setAttribute('data-lazy-id', itemId);
    this.observer.observe(element);
  }

  /**
   * Unobserve an element
   */
  unobserve(element: Element): void {
    if (!this.observer) return;
    this.observer.unobserve(element);
  }

  /**
   * Load a specific item
   */
  async loadItem(itemId: string): Promise<any> {
    // Return cached result if available
    if (this.state.cache.has(itemId)) {
      return this.state.cache.get(itemId);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(itemId)) {
      return this.loadingPromises.get(itemId);
    }

    // Check if already loaded or failed
    if (this.state.loaded.has(itemId) || this.state.failed.has(itemId)) {
      return null;
    }

    const item = this.state.queue.find(q => q.id === itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found in queue`);
    }

    // Check dependencies
    if (item.dependencies) {
      for (const depId of item.dependencies) {
        if (!this.state.loaded.has(depId)) {
          await this.loadItem(depId);
        }
      }
    }

    // Respect concurrent loading limit
    while (this.state.loading.size >= this.config.maxConcurrentLoads) {
      await this.waitForSlot();
    }

    const loadPromise = this.executeLoad(item);
    this.loadingPromises.set(itemId, loadPromise);

    return loadPromise;
  }

  /**
   * Execute the actual loading with retry logic
   */
  private async executeLoad(item: LazyLoadItem, attempt: number = 1): Promise<any> {
    this.state.loading.add(item.id);

    try {
      const result = await item.loader();
      
      // Success
      this.state.loading.delete(item.id);
      this.state.loaded.add(item.id);
      this.state.cache.set(item.id, result);
      this.loadingPromises.delete(item.id);

      if (item.onLoad) {
        item.onLoad(result);
      }

      // Preload nearby items
      this.preloadNearbyItems(item.id);

      return result;

    } catch (error) {
      this.state.loading.delete(item.id);

      if (attempt < this.config.retryAttempts) {
        // Retry with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(async () => {
            this.retryTimeouts.delete(item.id);
            try {
              const result = await this.executeLoad(item, attempt + 1);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);
          
          this.retryTimeouts.set(item.id, timeout);
        });
      } else {
        // Max retries reached
        this.state.failed.add(item.id);
        this.loadingPromises.delete(item.id);

        if (item.onError) {
          item.onError(error as Error);
        }

        throw error;
      }
    }
  }

  /**
   * Wait for a loading slot to become available
   */
  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.state.loading.size < this.config.maxConcurrentLoads) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  /**
   * Preload nearby items based on current item
   */
  private preloadNearbyItems(currentItemId: string): void {
    const currentIndex = this.state.queue.findIndex(q => q.id === currentItemId);
    if (currentIndex === -1) return;

    // Preload items within preloadDistance
    const start = Math.max(0, currentIndex - this.config.preloadDistance);
    const end = Math.min(this.state.queue.length, currentIndex + this.config.preloadDistance + 1);

    for (let i = start; i < end; i++) {
      const item = this.state.queue[i];
      if (!this.state.loaded.has(item.id) && !this.state.loading.has(item.id) && !this.state.failed.has(item.id)) {
        // Load with lower priority to avoid blocking current requests
        setTimeout(() => this.loadItem(item.id), 100);
      }
    }
  }

  /**
   * Preload high priority items
   */
  async preloadHighPriority(): Promise<void> {
    const highPriorityItems = this.state.queue.filter(
      item => item.priority === 'high' && 
               !this.state.loaded.has(item.id) && 
               !this.state.loading.has(item.id) && 
               !this.state.failed.has(item.id)
    );

    const loadPromises = highPriorityItems.slice(0, this.config.maxConcurrentLoads).map(
      item => this.loadItem(item.id).catch(() => null) // Ignore errors for preloading
    );

    await Promise.all(loadPromises);
  }

  /**
   * Clear cache and reset state
   */
  clear(): void {
    this.state.cache.clear();
    this.state.loading.clear();
    this.state.loaded.clear();
    this.state.failed.clear();
    this.loadingPromises.clear();
    
    // Clear retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    total: number;
    loaded: number;
    loading: number;
    failed: number;
    cached: number;
    hitRate: number;
  } {
    const total = this.state.queue.length;
    const loaded = this.state.loaded.size;
    const loading = this.state.loading.size;
    const failed = this.state.failed.size;
    const cached = this.state.cache.size;
    const hitRate = total > 0 ? (loaded / total) * 100 : 0;

    return {
      total,
      loaded,
      loading,
      failed,
      cached,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Remove item from cache
   */
  evictFromCache(itemId: string): void {
    this.state.cache.delete(itemId);
  }

  /**
   * Get cached item
   */
  getCached(itemId: string): any {
    return this.state.cache.get(itemId);
  }

  /**
   * Check if item is loaded
   */
  isLoaded(itemId: string): boolean {
    return this.state.loaded.has(itemId);
  }

  /**
   * Check if item is loading
   */
  isLoading(itemId: string): boolean {
    return this.state.loading.has(itemId);
  }

  /**
   * Check if item failed to load
   */
  hasFailed(itemId: string): boolean {
    return this.state.failed.has(itemId);
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    const failedItems = Array.from(this.state.failed);
    this.state.failed.clear();

    const retryPromises = failedItems.map(itemId => 
      this.loadItem(itemId).catch(() => null)
    );

    await Promise.all(retryPromises);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.clear();
    this.state.queue = [];
  }
}

// Specialized loaders for different content types
export class ImageLazyLoader extends LazyLoader {
  constructor(config?: Partial<LazyLoadConfig>) {
    super({
      ...config,
      maxConcurrentLoads: 2, // Limit concurrent image loads
      preloadDistance: 1
    });
  }

  /**
   * Register image for lazy loading
   */
  registerImage(
    imageId: string,
    imageUrl: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.registerItem({
      id: imageId,
      type: 'image',
      priority,
      loader: () => this.loadImage(imageUrl),
      onLoad: (img) => {
        // Image loaded successfully
        console.log(`Image ${imageId} loaded: ${img.width}x${img.height}`);
      },
      onError: (error) => {
        console.error(`Failed to load image ${imageId}:`, error);
      }
    });
  }

  /**
   * Load image with proper error handling
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      // Set crossOrigin if needed
      if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
        img.crossOrigin = 'anonymous';
      }
      
      img.src = url;
    });
  }
}

export class CoordinateLazyLoader extends LazyLoader {
  constructor(config?: Partial<LazyLoadConfig>) {
    super({
      ...config,
      maxConcurrentLoads: 5, // Allow more concurrent coordinate loads
      preloadDistance: 3
    });
  }

  /**
   * Register coordinate data for lazy loading
   */
  registerCoordinateData(
    questionId: string,
    loader: () => Promise<any>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.registerItem({
      id: questionId,
      type: 'coordinate',
      priority,
      loader,
      onLoad: (data) => {
        console.log(`Coordinate data loaded for ${questionId}: ${data?.diagrams?.length || 0} diagrams`);
      },
      onError: (error) => {
        console.error(`Failed to load coordinate data for ${questionId}:`, error);
      }
    });
  }
}

// Global lazy loader instances
export const imageLazyLoader = new ImageLazyLoader();
export const coordinateLazyLoader = new CoordinateLazyLoader();