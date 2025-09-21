/**
 * Performance Optimization System Tests
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { LazyLoader, ImageLazyLoader } from '../lazyLoader'
import { CacheManager, ImageCache } from '../cacheManager'
import { BatchProcessor } from '../batchProcessor'
import { MemoryManager } from '../memoryManager'
import { PerformanceMonitor } from '../performanceMonitor'
import { PerformanceOptimizer } from '../index'

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  }
} as any;

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
})) as any;

describe('LazyLoader', () => {
  let lazyLoader: LazyLoader;

  beforeEach(() => {
    lazyLoader = new LazyLoader({
      maxConcurrentLoads: 2,
      preloadDistance: 1,
      retryAttempts: 2
    });
  });

  afterEach(() => {
    lazyLoader.destroy();
  });

  test('should register and load items', async () => {
    const mockLoader = vi.fn().mockResolvedValue('test-data');
    
    lazyLoader.registerItem({
      id: 'test-item',
      type: 'image',
      priority: 'high',
      loader: mockLoader
    });

    const result = await lazyLoader.loadItem('test-item');
    
    expect(result).toBe('test-data');
    expect(mockLoader).toHaveBeenCalledTimes(1);
    expect(lazyLoader.isLoaded('test-item')).toBe(true);
  });

  test('should handle loading failures with retry', async () => {
    const mockLoader = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success-after-retry');
    
    lazyLoader.registerItem({
      id: 'retry-item',
      type: 'image',
      priority: 'medium',
      loader: mockLoader
    });

    const result = await lazyLoader.loadItem('retry-item');
    
    expect(result).toBe('success-after-retry');
    expect(mockLoader).toHaveBeenCalledTimes(2);
  });

  test('should respect concurrent loading limits', async () => {
    const loadingPromises: Promise<any>[] = [];
    let concurrentLoads = 0;
    let maxConcurrentLoads = 0;

    const mockLoader = vi.fn().mockImplementation(() => {
      concurrentLoads++;
      maxConcurrentLoads = Math.max(maxConcurrentLoads, concurrentLoads);
      
      return new Promise(resolve => {
        setTimeout(() => {
          concurrentLoads--;
          resolve('loaded');
        }, 100);
      });
    });

    // Register 5 items
    for (let i = 0; i < 5; i++) {
      lazyLoader.registerItem({
        id: `item-${i}`,
        type: 'image',
        priority: 'medium',
        loader: mockLoader
      });
    }

    // Load all items concurrently
    for (let i = 0; i < 5; i++) {
      loadingPromises.push(lazyLoader.loadItem(`item-${i}`));
    }

    await Promise.all(loadingPromises);
    
    expect(maxConcurrentLoads).toBeLessThanOrEqual(2); // Should respect limit
  });

  test('should handle dependencies correctly', async () => {
    const loadOrder: string[] = [];
    
    const createLoader = (id: string) => vi.fn().mockImplementation(() => {
      loadOrder.push(id);
      return Promise.resolve(`data-${id}`);
    });

    lazyLoader.registerItem({
      id: 'dependency',
      type: 'image',
      priority: 'high',
      loader: createLoader('dependency')
    });

    lazyLoader.registerItem({
      id: 'dependent',
      type: 'image',
      priority: 'high',
      loader: createLoader('dependent'),
      dependencies: ['dependency']
    });

    await lazyLoader.loadItem('dependent');
    
    expect(loadOrder).toEqual(['dependency', 'dependent']);
  });

  test('should provide accurate statistics', () => {
    lazyLoader.registerItem({
      id: 'stats-item',
      type: 'image',
      priority: 'medium',
      loader: () => Promise.resolve('data')
    });

    const initialStats = lazyLoader.getStats();
    expect(initialStats.total).toBe(1);
    expect(initialStats.loaded).toBe(0);
  });
});

describe('ImageLazyLoader', () => {
  let imageLazyLoader: ImageLazyLoader;

  beforeEach(() => {
    imageLazyLoader = new ImageLazyLoader();
  });

  afterEach(() => {
    imageLazyLoader.destroy();
  });

  test('should register and load images', async () => {
    // Mock Image constructor
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      src: '',
      width: 100,
      height: 100
    };

    global.Image = vi.fn(() => {
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 10);
      return mockImage;
    }) as any;

    imageLazyLoader.registerImage('test-image', 'http://example.com/image.jpg');
    const result = await imageLazyLoader.loadItem('test-image');
    
    expect(result).toBe(mockImage);
    expect(mockImage.src).toBe('http://example.com/image.jpg');
  });
});

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager({
      maxSize: 1024,
      maxItems: 10,
      ttl: 1000
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  test('should store and retrieve items', async () => {
    await cache.set('key1', 'value1');
    const result = await cache.get('key1');
    
    expect(result).toBe('value1');
  });

  test('should handle TTL expiration', async () => {
    await cache.set('expiring-key', 'value', 100); // 100ms TTL
    
    // Should be available immediately
    expect(await cache.get('expiring-key')).toBe('value');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should be expired
    expect(await cache.get('expiring-key')).toBeNull();
  });

  test('should evict LRU items when full', async () => {
    // Fill cache to capacity
    for (let i = 0; i < 10; i++) {
      await cache.set(`key${i}`, `value${i}`);
    }

    // Add one more item (should evict LRU)
    await cache.set('key10', 'value10');
    
    // First item should be evicted
    expect(await cache.get('key0')).toBeNull();
    expect(await cache.get('key10')).toBe('value10');
  });

  test('should handle multiple operations concurrently', async () => {
    const promises = [];
    
    // Set multiple items concurrently
    for (let i = 0; i < 5; i++) {
      promises.push(cache.set(`concurrent-${i}`, `value-${i}`));
    }
    
    await Promise.all(promises);
    
    // Verify all items are stored
    for (let i = 0; i < 5; i++) {
      expect(await cache.get(`concurrent-${i}`)).toBe(`value-${i}`);
    }
  });

  test('should provide accurate metrics', async () => {
    await cache.set('metrics-key', 'value');
    await cache.get('metrics-key'); // Hit
    await cache.get('non-existent'); // Miss
    
    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
    expect(metrics.hitRate).toBe(50);
  });
});

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor<number, number>;

  beforeEach(() => {
    batchProcessor = new BatchProcessor({
      batchSize: 3,
      maxConcurrency: 2,
      delayBetweenBatches: 10
    });
  });

  test('should process items in batches', async () => {
    const processedItems: number[] = [];
    const processor = vi.fn().mockImplementation((data: number) => {
      processedItems.push(data);
      return Promise.resolve(data * 2);
    });

    // Add 5 items
    for (let i = 1; i <= 5; i++) {
      batchProcessor.add({
        id: `item-${i}`,
        data: i,
        priority: 1,
        processor
      });
    }

    const results = await batchProcessor.waitForCompletion();
    
    expect(results).toHaveLength(5);
    expect(processedItems).toHaveLength(5);
    expect(processor).toHaveBeenCalledTimes(5);
  });

  test('should handle processing errors with retry', async () => {
    let attempts = 0;
    const processor = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Processing failed'));
      }
      return Promise.resolve('success');
    });

    batchProcessor.add({
      id: 'retry-item',
      data: 'test',
      priority: 1,
      processor
    });

    const results = await batchProcessor.waitForCompletion();
    const result = results.find(r => r.id === 'retry-item');
    
    expect(result?.success).toBe(true);
    expect(result?.result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should respect priority ordering', async () => {
    const processOrder: string[] = [];
    const processor = vi.fn().mockImplementation((data: string) => {
      processOrder.push(data);
      return Promise.resolve(data);
    });

    // Add items with different priorities
    batchProcessor.add({
      id: 'low',
      data: 'low-priority',
      priority: 0,
      processor
    });

    batchProcessor.add({
      id: 'high',
      data: 'high-priority',
      priority: 4,
      processor
    });

    batchProcessor.add({
      id: 'medium',
      data: 'medium-priority',
      priority: 2,
      processor
    });

    await batchProcessor.waitForCompletion();
    
    // High priority should be processed first
    expect(processOrder[0]).toBe('high-priority');
  });

  test('should provide accurate statistics', async () => {
    const processor = vi.fn().mockResolvedValue('result');

    batchProcessor.add({
      id: 'stats-item',
      data: 'test',
      priority: 1,
      processor
    });

    await batchProcessor.waitForCompletion();
    
    const stats = batchProcessor.getStats();
    expect(stats.totalItems).toBe(1);
    expect(stats.processedItems).toBe(1);
    expect(stats.successfulItems).toBe(1);
    expect(stats.failedItems).toBe(0);
  });
});

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager({
      maxHeapSize: 100 * 1024 * 1024,
      warningThreshold: 70,
      criticalThreshold: 90
    });
  });

  afterEach(() => {
    memoryManager.destroy();
  });

  test('should get memory statistics', () => {
    const stats = memoryManager.getMemoryStats();
    
    expect(stats).toHaveProperty('usedJSHeapSize');
    expect(stats).toHaveProperty('totalJSHeapSize');
    expect(stats).toHaveProperty('jsHeapSizeLimit');
    expect(stats).toHaveProperty('usagePercentage');
  });

  test('should register and execute cleanup tasks', () => {
    const cleanupTask = vi.fn();
    memoryManager.registerCleanupTask('test-cleanup', cleanupTask);
    
    memoryManager.cleanup();
    
    expect(cleanupTask).toHaveBeenCalledTimes(1);
  });

  test('should check memory availability', () => {
    const hasMemory = memoryManager.hasEnoughMemory(1024);
    expect(typeof hasMemory).toBe('boolean');
  });

  test('should handle memory pressure callbacks', () => {
    const pressureCallback = vi.fn();
    const unsubscribe = memoryManager.onMemoryPressure(pressureCallback);
    
    // Simulate memory pressure (this would normally be triggered by monitoring)
    // For testing, we'll call the callback directly
    expect(typeof unsubscribe).toBe('function');
    
    unsubscribe();
  });
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
  });

  afterEach(() => {
    performanceMonitor.destroy();
  });

  test('should record timing metrics', () => {
    performanceMonitor.recordTiming('test-operation', 100);
    
    const metrics = performanceMonitor.getMetrics('timing');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test-operation');
    expect(metrics[0].value).toBe(100);
    expect(metrics[0].unit).toBe('ms');
  });

  test('should record memory metrics', () => {
    performanceMonitor.recordMemory('heap-usage', 1024 * 1024);
    
    const metrics = performanceMonitor.getMetrics('memory');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('heap-usage');
    expect(metrics[0].value).toBe(1024 * 1024);
    expect(metrics[0].unit).toBe('bytes');
  });

  test('should measure async operations', async () => {
    const asyncOperation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('result'), 50))
    );

    const result = await performanceMonitor.measure('async-test', asyncOperation);
    
    expect(result).toBe('result');
    expect(asyncOperation).toHaveBeenCalledTimes(1);
    
    const metrics = performanceMonitor.getMetrics('timing');
    const metric = metrics.find(m => m.name === 'async-test');
    expect(metric).toBeDefined();
    expect(metric!.value).toBeGreaterThan(40); // Should be around 50ms
  });

  test('should handle timer operations', () => {
    performanceMonitor.startTimer('timer-test');
    
    // Simulate some work
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Busy wait
    }
    
    const duration = performanceMonitor.endTimer('timer-test');
    
    expect(duration).toBeGreaterThan(0);
    
    const metrics = performanceMonitor.getMetrics('timing');
    const metric = metrics.find(m => m.name === 'timer-test');
    expect(metric).toBeDefined();
  });

  test('should generate performance summary', () => {
    performanceMonitor.recordTiming('operation-1', 100);
    performanceMonitor.recordTiming('operation-2', 200);
    performanceMonitor.recordMemory('memory-usage', 1024);
    
    const summary = performanceMonitor.getSummary();
    
    expect(summary.summary.totalMetrics).toBe(3);
    expect(summary.summary.averageResponseTime).toBe(150); // (100 + 200) / 2
    expect(summary.metrics).toHaveLength(3);
  });

  test('should set and check thresholds', () => {
    performanceMonitor.setThreshold('slow-operation', 100, 200, 'ms');
    
    // This should trigger a warning (but not fail the test)
    performanceMonitor.recordTiming('slow-operation', 150);
    
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.some(m => m.name === 'slow-operation')).toBe(true);
  });
});

describe('PerformanceOptimizer Integration', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(async () => {
    optimizer = new PerformanceOptimizer({
      enableLazyLoading: true,
      enableCaching: true,
      enableBatchProcessing: true,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: true
    });
    
    await optimizer.initialize();
  });

  afterEach(() => {
    optimizer.destroy();
  });

  test('should initialize successfully', async () => {
    // Optimizer should be initialized in beforeEach
    const stats = optimizer.getPerformanceStats();
    
    expect(stats).toHaveProperty('lazyLoading');
    expect(stats).toHaveProperty('caching');
    expect(stats).toHaveProperty('batchProcessing');
    expect(stats).toHaveProperty('memory');
    expect(stats).toHaveProperty('performance');
  });

  test('should optimize image loading', async () => {
    // Mock Image constructor
    global.Image = vi.fn(() => ({
      onload: null,
      onerror: null,
      src: '',
      width: 100,
      height: 100
    })) as any;

    const imageUrls = [
      'http://example.com/image1.jpg',
      'http://example.com/image2.jpg'
    ];

    // This would normally load images, but we'll mock it
    const images = await optimizer.optimizeImageLoading(imageUrls, 'medium');
    
    // In a real scenario, this would return loaded images
    expect(Array.isArray(images)).toBe(true);
  });

  test('should provide comprehensive performance statistics', () => {
    const stats = optimizer.getPerformanceStats();
    
    // Check structure
    expect(stats.lazyLoading).toHaveProperty('totalItems');
    expect(stats.lazyLoading).toHaveProperty('loadedItems');
    expect(stats.lazyLoading).toHaveProperty('hitRate');
    
    expect(stats.memory).toHaveProperty('usagePercentage');
    expect(stats.memory).toHaveProperty('availableMemory');
    expect(stats.memory).toHaveProperty('isNearLimit');
    
    expect(stats.performance).toHaveProperty('averageResponseTime');
    expect(stats.performance).toHaveProperty('errorRate');
    expect(stats.performance).toHaveProperty('totalMetrics');
  });

  test('should handle system optimization', async () => {
    // This should run without errors
    await optimizer.optimizeSystem();
    
    // Verify that optimization was attempted
    const stats = optimizer.getPerformanceStats();
    expect(stats).toBeDefined();
  });
});

describe('Performance Edge Cases', () => {
  test('should handle concurrent cache operations', async () => {
    const cache = new CacheManager({ maxItems: 100 });
    
    // Perform many concurrent operations
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(cache.set(`key-${i}`, `value-${i}`));
    }
    
    await Promise.all(promises);
    
    // Verify all items were stored
    for (let i = 0; i < 50; i++) {
      const value = await cache.get(`key-${i}`);
      expect(value).toBe(`value-${i}`);
    }
    
    cache.destroy();
  });

  test('should handle memory pressure scenarios', () => {
    const memoryManager = new MemoryManager({
      warningThreshold: 50,
      criticalThreshold: 80
    });
    
    const pressureEvents: any[] = [];
    memoryManager.onMemoryPressure((event) => {
      pressureEvents.push(event);
    });
    
    // Simulate memory pressure by checking stats
    const stats = memoryManager.getMemoryStats();
    expect(stats).toBeDefined();
    
    memoryManager.destroy();
  });

  test('should handle batch processing with failures', async () => {
    const batchProcessor = new BatchProcessor({
      batchSize: 2,
      retryAttempts: 1
    });
    
    let callCount = 0;
    const flakyProcessor = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 0) {
        return Promise.reject(new Error('Simulated failure'));
      }
      return Promise.resolve('success');
    });
    
    // Add multiple items
    for (let i = 0; i < 4; i++) {
      batchProcessor.add({
        id: `item-${i}`,
        data: i,
        priority: 1,
        processor: flakyProcessor
      });
    }
    
    const results = await batchProcessor.waitForCompletion();
    
    // Some should succeed, some should fail
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    expect(successful.length).toBeGreaterThan(0);
    expect(failed.length).toBeGreaterThan(0);
  });
});