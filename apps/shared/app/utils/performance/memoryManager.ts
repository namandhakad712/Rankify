/**
 * Memory Management System for Diagram Detection
 * Monitors and optimizes memory usage across the application
 */

export interface MemoryConfig {
  maxHeapSize: number; // Maximum heap size in bytes
  gcThreshold: number; // Trigger GC when usage exceeds this percentage
  monitoringInterval: number; // Memory monitoring interval in ms
  enableAutoCleanup: boolean; // Automatically cleanup unused resources
  warningThreshold: number; // Show warning when usage exceeds this percentage
  criticalThreshold: number; // Take emergency action when usage exceeds this
}

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  isNearLimit: boolean;
  isCritical: boolean;
  timestamp: number;
}

export interface MemoryPressureEvent {
  type: 'warning' | 'critical' | 'emergency';
  stats: MemoryStats;
  timestamp: number;
  suggestedActions: string[];
}

export type MemoryPressureCallback = (event: MemoryPressureEvent) => void;

export class MemoryManager {
  private config: MemoryConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private pressureCallbacks: Set<MemoryPressureCallback> = new Set();
  private lastStats: MemoryStats | null = null;
  private cleanupTasks: Map<string, () => void> = new Map();
  private isMonitoring: boolean = false;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxHeapSize: 512 * 1024 * 1024, // 512MB default
      gcThreshold: 80, // 80%
      monitoringInterval: 5000, // 5 seconds
      enableAutoCleanup: true,
      warningThreshold: 70, // 70%
      criticalThreshold: 90, // 90%
      ...config
    };
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoringInterval);

    // Initial check
    this.checkMemoryUsage();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const performance = (window as any).performance;
    
    if (performance && performance.memory) {
      const memory = performance.memory;
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage,
        isNearLimit: usagePercentage > this.config.warningThreshold,
        isCritical: usagePercentage > this.config.criticalThreshold,
        timestamp: Date.now()
      };
    }

    // Fallback for browsers without performance.memory
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: this.config.maxHeapSize,
      usagePercentage: 0,
      isNearLimit: false,
      isCritical: false,
      timestamp: Date.now()
    };
  }

  /**
   * Register a callback for memory pressure events
   */
  onMemoryPressure(callback: MemoryPressureCallback): () => void {
    this.pressureCallbacks.add(callback);
    return () => this.pressureCallbacks.delete(callback);
  }

  /**
   * Register a cleanup task
   */
  registerCleanupTask(id: string, task: () => void): void {
    this.cleanupTasks.set(id, task);
  }

  /**
   * Unregister a cleanup task
   */
  unregisterCleanupTask(id: string): void {
    this.cleanupTasks.delete(id);
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if ((window as any).gc) {
      (window as any).gc();
    } else if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }

  /**
   * Manually trigger cleanup
   */
  cleanup(): void {
    // Run all registered cleanup tasks
    for (const [id, task] of this.cleanupTasks.entries()) {
      try {
        task();
      } catch (error) {
        console.warn(`Cleanup task ${id} failed:`, error);
      }
    }

    // Force garbage collection
    this.forceGC();
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' | 'unknown' {
    if (!this.lastStats) return 'unknown';

    const currentStats = this.getMemoryStats();
    const diff = currentStats.usedJSHeapSize - this.lastStats.usedJSHeapSize;
    const threshold = this.lastStats.usedJSHeapSize * 0.05; // 5% threshold

    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Estimate available memory
   */
  getAvailableMemory(): number {
    const stats = this.getMemoryStats();
    return Math.max(0, stats.jsHeapSizeLimit - stats.usedJSHeapSize);
  }

  /**
   * Check if there's enough memory for an operation
   */
  hasEnoughMemory(requiredBytes: number): boolean {
    const available = this.getAvailableMemory();
    const buffer = this.config.maxHeapSize * 0.1; // 10% buffer
    return available > (requiredBytes + buffer);
  }

  /**
   * Wait for memory to become available
   */
  async waitForMemory(requiredBytes: number, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.hasEnoughMemory(requiredBytes)) {
        return true;
      }

      // Trigger cleanup
      this.cleanup();

      // Wait before checking again
      await this.delay(1000);
    }

    return false;
  }

  /**
   * Create a memory-aware operation wrapper
   */
  createMemoryAwareOperation<T>(
    operation: () => Promise<T>,
    estimatedMemoryUsage: number
  ): () => Promise<T> {
    return async () => {
      // Check if we have enough memory
      if (!this.hasEnoughMemory(estimatedMemoryUsage)) {
        // Try to free up memory
        this.cleanup();
        
        // Wait for memory to become available
        const hasMemory = await this.waitForMemory(estimatedMemoryUsage, 10000);
        if (!hasMemory) {
          throw new Error('Insufficient memory for operation');
        }
      }

      return await operation();
    };
  }

  // Private methods

  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    this.lastStats = stats;

    // Check for memory pressure
    if (stats.isCritical) {
      this.handleMemoryPressure('critical', stats);
    } else if (stats.isNearLimit) {
      this.handleMemoryPressure('warning', stats);
    }

    // Auto cleanup if enabled
    if (this.config.enableAutoCleanup && stats.usagePercentage > this.config.gcThreshold) {
      this.cleanup();
    }
  }

  private handleMemoryPressure(type: 'warning' | 'critical', stats: MemoryStats): void {
    const suggestedActions: string[] = [];

    if (type === 'warning') {
      suggestedActions.push('Clear unused caches');
      suggestedActions.push('Reduce image quality');
      suggestedActions.push('Limit concurrent operations');
    } else if (type === 'critical') {
      suggestedActions.push('Emergency cleanup');
      suggestedActions.push('Cancel non-essential operations');
      suggestedActions.push('Reduce batch sizes');
      suggestedActions.push('Force garbage collection');
    }

    const event: MemoryPressureEvent = {
      type,
      stats,
      timestamp: Date.now(),
      suggestedActions
    };

    // Notify all callbacks
    this.pressureCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Memory pressure callback error:', error);
      }
    });

    // Take automatic action for critical situations
    if (type === 'critical' && this.config.enableAutoCleanup) {
      this.emergencyCleanup();
    }
  }

  private emergencyCleanup(): void {
    console.warn('Emergency memory cleanup triggered');
    
    // Run all cleanup tasks
    this.cleanup();
    
    // Additional emergency measures
    this.clearLargeCaches();
    this.reduceImageQuality();
    this.limitConcurrentOperations();
  }

  private clearLargeCaches(): void {
    // Clear large caches (this would integrate with your cache managers)
    if (typeof window !== 'undefined') {
      // Clear browser caches if possible
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    }
  }

  private reduceImageQuality(): void {
    // Reduce image quality settings
    // This would integrate with your image processing settings
    console.log('Reducing image quality to save memory');
  }

  private limitConcurrentOperations(): void {
    // Reduce concurrent operation limits
    // This would integrate with your batch processors
    console.log('Limiting concurrent operations to save memory');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.pressureCallbacks.clear();
    this.cleanupTasks.clear();
  }
}

// Memory-aware resource manager
export class ResourceManager {
  private memoryManager: MemoryManager;
  private resources: Map<string, any> = new Map();
  private resourceSizes: Map<string, number> = new Map();

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
  }

  /**
   * Allocate a resource with memory tracking
   */
  async allocate<T>(id: string, factory: () => Promise<T>, estimatedSize: number): Promise<T> {
    // Check if resource already exists
    if (this.resources.has(id)) {
      return this.resources.get(id);
    }

    // Check memory availability
    if (!this.memoryManager.hasEnoughMemory(estimatedSize)) {
      throw new Error(`Insufficient memory to allocate resource ${id}`);
    }

    // Create resource
    const resource = await factory();
    
    // Store resource and size
    this.resources.set(id, resource);
    this.resourceSizes.set(id, estimatedSize);

    return resource;
  }

  /**
   * Deallocate a resource
   */
  deallocate(id: string): void {
    this.resources.delete(id);
    this.resourceSizes.delete(id);
  }

  /**
   * Get total allocated memory
   */
  getTotalAllocated(): number {
    return Array.from(this.resourceSizes.values()).reduce((sum, size) => sum + size, 0);
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources.clear();
    this.resourceSizes.clear();
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  memoryManager.startMonitoring();
  
  // Register default cleanup tasks
  memoryManager.registerCleanupTask('clear-console', () => {
    if (console.clear) console.clear();
  });
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    memoryManager.destroy();
  });
}