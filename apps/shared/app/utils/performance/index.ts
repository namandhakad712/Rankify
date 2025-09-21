/**
 * Performance Optimization System Integration
 * Combines all performance optimization components for the diagram detection system
 */

import { LazyLoader, ImageLazyLoader, CoordinateLazyLoader, imageLazyLoader, coordinateLazyLoader } from './lazyLoader'
import { CacheManager, ImageCache, CoordinateCache, DiagramCache, imageCache, coordinateCache, diagramCache } from './cacheManager'
import { BatchProcessor, DiagramDetectionBatchProcessor, CoordinateValidationBatchProcessor, ImageCompressionBatchProcessor, diagramDetectionBatch, coordinateValidationBatch, imageCompressionBatch } from './batchProcessor'
import { MemoryManager, ResourceManager, memoryManager } from './memoryManager'
import { PerformanceMonitor, performanceMonitor, measurePerformance, measureSync } from './performanceMonitor'

export interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableCaching: boolean;
  enableBatchProcessing: boolean;
  enableMemoryManagement: boolean;
  enablePerformanceMonitoring: boolean;
  maxConcurrentOperations: number;
  cacheSize: number;
  batchSize: number;
  memoryThreshold: number;
}

export interface PerformanceStats {
  lazyLoading: {
    totalItems: number;
    loadedItems: number;
    hitRate: number;
  };
  caching: {
    imageCache: any;
    coordinateCache: any;
    diagramCache: any;
  };
  batchProcessing: {
    diagramDetection: any;
    coordinateValidation: any;
    imageCompression: any;
  };
  memory: {
    usagePercentage: number;
    availableMemory: number;
    isNearLimit: boolean;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    totalMetrics: number;
  };
}

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private resourceManager: ResourceManager;
  private isInitialized: boolean = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableLazyLoading: true,
      enableCaching: true,
      enableBatchProcessing: true,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: true,
      maxConcurrentOperations: 3,
      cacheSize: 100 * 1024 * 1024, // 100MB
      batchSize: 10,
      memoryThreshold: 80, // 80%
      ...config
    };

    this.resourceManager = new ResourceManager(memoryManager);
  }

  /**
   * Initialize the performance optimization system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize memory management
      if (this.config.enableMemoryManagement) {
        memoryManager.startMonitoring();
        this.setupMemoryPressureHandling();
      }

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        performanceMonitor.startMonitoring();
      }

      // Setup cache cleanup tasks
      if (this.config.enableCaching) {
        this.setupCacheCleanup();
      }

      // Setup batch processing optimization
      if (this.config.enableBatchProcessing) {
        this.optimizeBatchProcessors();
      }

      this.isInitialized = true;
      console.log('Performance optimization system initialized');

    } catch (error) {
      console.error('Failed to initialize performance optimization system:', error);
      throw error;
    }
  }

  /**
   * Optimize PDF processing with all performance enhancements
   */
  async optimizePdfProcessing(
    pdfFile: File,
    options: {
      enableDiagramDetection?: boolean;
      batchSize?: number;
      quality?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<any> {
    const startTime = performance.now();

    try {
      // Check memory availability
      const estimatedMemoryUsage = pdfFile.size * 3; // Rough estimate
      if (!memoryManager.hasEnoughMemory(estimatedMemoryUsage)) {
        await this.freeMemory();
      }

      // Process with performance monitoring
      return await performanceMonitor.measure('pdf_processing_optimized', async () => {
        // Use batch processing for large PDFs
        if (pdfFile.size > 10 * 1024 * 1024) { // 10MB
          return await this.processPdfInBatches(pdfFile, options);
        } else {
          return await this.processPdfDirect(pdfFile, options);
        }
      });

    } finally {
      const duration = performance.now() - startTime;
      performanceMonitor.recordTiming('pdf_processing_total', duration);
    }
  }

  /**
   * Optimize image loading with lazy loading and caching
   */
  async optimizeImageLoading(
    imageUrls: string[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<HTMLImageElement[]> {
    if (!this.config.enableLazyLoading) {
      // Fallback to direct loading
      return await this.loadImagesDirectly(imageUrls);
    }

    const images: HTMLImageElement[] = [];

    // Register images for lazy loading
    for (let i = 0; i < imageUrls.length; i++) {
      const imageId = `image_${i}_${Date.now()}`;
      const url = imageUrls[i];

      // Check cache first
      if (this.config.enableCaching) {
        const cached = await imageCache.get(url);
        if (cached) {
          images.push(cached);
          continue;
        }
      }

      // Register for lazy loading
      imageLazyLoader.registerImage(imageId, url, priority);
      
      // Load image
      const image = await imageLazyLoader.loadItem(imageId);
      if (image) {
        images.push(image);
        
        // Cache the loaded image
        if (this.config.enableCaching) {
          await imageCache.set(url, image);
        }
      }
    }

    return images;
  }

  /**
   * Optimize coordinate data loading
   */
  async optimizeCoordinateLoading(
    questionIds: string[],
    loader: (questionId: string) => Promise<any>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    if (!this.config.enableLazyLoading) {
      // Direct loading
      for (const questionId of questionIds) {
        try {
          const data = await loader(questionId);
          results.set(questionId, data);
        } catch (error) {
          console.error(`Failed to load coordinates for ${questionId}:`, error);
        }
      }
      return results;
    }

    // Register for lazy loading
    for (const questionId of questionIds) {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = await coordinateCache.get(questionId);
        if (cached) {
          results.set(questionId, cached);
          continue;
        }
      }

      // Register for lazy loading
      coordinateLazyLoader.registerCoordinateData(questionId, () => loader(questionId));
    }

    // Load all coordinates
    for (const questionId of questionIds) {
      if (!results.has(questionId)) {
        try {
          const data = await coordinateLazyLoader.loadItem(questionId);
          if (data) {
            results.set(questionId, data);
            
            // Cache the loaded data
            if (this.config.enableCaching) {
              await coordinateCache.set(questionId, data);
            }
          }
        } catch (error) {
          console.error(`Failed to load coordinates for ${questionId}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Optimize batch operations
   */
  async optimizeBatchOperation<T, R>(
    items: Array<{ id: string; data: T }>,
    processor: (data: T) => Promise<R>,
    type: 'diagram-detection' | 'coordinate-validation' | 'image-compression' = 'coordinate-validation'
  ): Promise<Map<string, R>> {
    const results = new Map<string, R>();

    if (!this.config.enableBatchProcessing) {
      // Process directly
      for (const item of items) {
        try {
          const result = await processor(item.data);
          results.set(item.id, result);
        } catch (error) {
          console.error(`Failed to process item ${item.id}:`, error);
        }
      }
      return results;
    }

    // Select appropriate batch processor
    let batchProcessor: BatchProcessor<T, R>;
    switch (type) {
      case 'diagram-detection':
        batchProcessor = diagramDetectionBatch as BatchProcessor<T, R>;
        break;
      case 'coordinate-validation':
        batchProcessor = coordinateValidationBatch as BatchProcessor<T, R>;
        break;
      case 'image-compression':
        batchProcessor = imageCompressionBatch as BatchProcessor<T, R>;
        break;
    }

    // Add items to batch processor
    for (const item of items) {
      batchProcessor.add({
        id: item.id,
        data: item.data,
        priority: 2, // Medium priority
        processor,
        onSuccess: (result) => {
          results.set(item.id, result);
        },
        onError: (error) => {
          console.error(`Batch processing failed for ${item.id}:`, error);
        }
      });
    }

    // Wait for completion
    await batchProcessor.waitForCompletion();

    return results;
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    return {
      lazyLoading: {
        totalItems: imageLazyLoader.getStats().total + coordinateLazyLoader.getStats().total,
        loadedItems: imageLazyLoader.getStats().loaded + coordinateLazyLoader.getStats().loaded,
        hitRate: (imageLazyLoader.getStats().hitRate + coordinateLazyLoader.getStats().hitRate) / 2
      },
      caching: {
        imageCache: imageCache.getMetrics(),
        coordinateCache: coordinateCache.getMetrics(),
        diagramCache: diagramCache.getMetrics()
      },
      batchProcessing: {
        diagramDetection: diagramDetectionBatch.getStats(),
        coordinateValidation: coordinateValidationBatch.getStats(),
        imageCompression: imageCompressionBatch.getStats()
      },
      memory: {
        usagePercentage: memoryManager.getMemoryStats().usagePercentage,
        availableMemory: memoryManager.getAvailableMemory(),
        isNearLimit: memoryManager.getMemoryStats().isNearLimit
      },
      performance: {
        averageResponseTime: performanceMonitor.getSummary().summary.averageResponseTime,
        errorRate: performanceMonitor.getSummary().summary.errorRate,
        totalMetrics: performanceMonitor.getSummary().summary.totalMetrics
      }
    };
  }

  /**
   * Optimize system performance based on current conditions
   */
  async optimizeSystem(): Promise<void> {
    const stats = this.getPerformanceStats();

    // Memory optimization
    if (stats.memory.usagePercentage > this.config.memoryThreshold) {
      await this.freeMemory();
    }

    // Cache optimization
    if (stats.caching.imageCache.hitRate < 50) {
      await this.optimizeCaches();
    }

    // Batch processing optimization
    if (stats.performance.averageResponseTime > 3000) {
      this.optimizeBatchSizes();
    }
  }

  // Private methods

  private setupMemoryPressureHandling(): void {
    memoryManager.onMemoryPressure((event) => {
      console.warn(`Memory pressure detected: ${event.type}`, event.stats);

      if (event.type === 'critical') {
        this.emergencyCleanup();
      } else if (event.type === 'warning') {
        this.freeMemory();
      }
    });

    // Register cleanup tasks
    memoryManager.registerCleanupTask('clear-image-cache', () => {
      imageCache.clear();
    });

    memoryManager.registerCleanupTask('clear-diagram-cache', () => {
      diagramCache.clear();
    });

    memoryManager.registerCleanupTask('clear-lazy-loaders', () => {
      imageLazyLoader.clear();
      coordinateLazyLoader.clear();
    });
  }

  private setupCacheCleanup(): void {
    // Periodic cache cleanup
    setInterval(() => {
      imageCache.cleanup();
      coordinateCache.cleanup();
      diagramCache.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private optimizeBatchProcessors(): void {
    // Adjust batch sizes based on system performance
    const memoryStats = memoryManager.getMemoryStats();
    
    if (memoryStats.usagePercentage > 70) {
      // Reduce batch sizes to save memory
      this.config.batchSize = Math.max(3, Math.floor(this.config.batchSize * 0.7));
    } else if (memoryStats.usagePercentage < 30) {
      // Increase batch sizes for better performance
      this.config.batchSize = Math.min(20, Math.floor(this.config.batchSize * 1.3));
    }
  }

  private async processPdfInBatches(pdfFile: File, options: any): Promise<any> {
    // Implementation would depend on your PDF processing logic
    console.log('Processing PDF in batches for optimal performance');
    return null; // Placeholder
  }

  private async processPdfDirect(pdfFile: File, options: any): Promise<any> {
    // Implementation would depend on your PDF processing logic
    console.log('Processing PDF directly');
    return null; // Placeholder
  }

  private async loadImagesDirectly(imageUrls: string[]): Promise<HTMLImageElement[]> {
    const promises = imageUrls.map(url => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    });

    return await Promise.all(promises);
  }

  private async freeMemory(): Promise<void> {
    // Clear least recently used cache items
    const imageCacheSize = imageCache.getSizeInfo();
    if (imageCacheSize.utilization > 80) {
      // Clear 30% of image cache
      const metrics = imageCache.getMetrics();
      const itemsToRemove = Math.floor(metrics.itemCount * 0.3);
      // Implementation would clear LRU items
    }

    // Force garbage collection
    memoryManager.forceGC();
  }

  private async optimizeCaches(): Promise<void> {
    // Prefetch frequently accessed items
    // Implementation would analyze access patterns and prefetch
    console.log('Optimizing cache performance');
  }

  private optimizeBatchSizes(): void {
    // Reduce batch sizes to improve response time
    this.config.batchSize = Math.max(3, Math.floor(this.config.batchSize * 0.8));
    this.optimizeBatchProcessors();
  }

  private emergencyCleanup(): void {
    console.warn('Emergency cleanup triggered');
    
    // Clear all caches
    imageCache.clear();
    coordinateCache.clear();
    diagramCache.clear();
    
    // Clear lazy loaders
    imageLazyLoader.clear();
    coordinateLazyLoader.clear();
    
    // Force garbage collection
    memoryManager.forceGC();
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    memoryManager.destroy();
    performanceMonitor.destroy();
    imageLazyLoader.destroy();
    coordinateLazyLoader.destroy();
    imageCache.destroy();
    coordinateCache.destroy();
    diagramCache.destroy();
  }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  performanceOptimizer.initialize().catch(console.error);
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    performanceOptimizer.destroy();
  });
}

// Export all performance optimization components
export {
  LazyLoader,
  ImageLazyLoader,
  CoordinateLazyLoader,
  imageLazyLoader,
  coordinateLazyLoader,
  CacheManager,
  ImageCache,
  CoordinateCache,
  DiagramCache,
  imageCache,
  coordinateCache,
  diagramCache,
  BatchProcessor,
  DiagramDetectionBatchProcessor,
  CoordinateValidationBatchProcessor,
  ImageCompressionBatchProcessor,
  diagramDetectionBatch,
  coordinateValidationBatch,
  imageCompressionBatch,
  MemoryManager,
  ResourceManager,
  memoryManager,
  PerformanceMonitor,
  performanceMonitor,
  measurePerformance,
  measureSync
};

// Utility functions for easy integration
export async function optimizeImageLoading(urls: string[]): Promise<HTMLImageElement[]> {
  return await performanceOptimizer.optimizeImageLoading(urls);
}

export async function optimizeCoordinateLoading(
  questionIds: string[],
  loader: (id: string) => Promise<any>
): Promise<Map<string, any>> {
  return await performanceOptimizer.optimizeCoordinateLoading(questionIds, loader);
}

export function getPerformanceStats(): PerformanceStats {
  return performanceOptimizer.getPerformanceStats();
}

export async function optimizeSystem(): Promise<void> {
  return await performanceOptimizer.optimizeSystem();
}