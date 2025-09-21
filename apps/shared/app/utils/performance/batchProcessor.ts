/**
 * Batch Processing System for Diagram Detection
 * Optimizes performance by batching operations and managing concurrency
 */

export interface BatchConfig {
  batchSize: number;
  maxConcurrency: number;
  delayBetweenBatches: number;
  retryAttempts: number;
  retryDelay: number;
  timeoutPerBatch: number;
  priorityLevels: number;
}

export interface BatchItem<T = any, R = any> {
  id: string;
  data: T;
  priority: number;
  processor: (data: T) => Promise<R>;
  onSuccess?: (result: R) => void;
  onError?: (error: Error) => void;
  timeout?: number;
  retries?: number;
  dependencies?: string[];
}

export interface BatchResult<R = any> {
  id: string;
  success: boolean;
  result?: R;
  error?: Error;
  processingTime: number;
  retryCount: number;
}

export interface BatchStats {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  batchesProcessed: number;
  currentBatchSize: number;
  queueSize: number;
}

export class BatchProcessor<T = any, R = any> {
  private config: BatchConfig;
  private queue: BatchItem<T, R>[] = [];
  private processing: Set<string> = new Set();
  private completed: Map<string, BatchResult<R>> = new Map();
  private stats: BatchStats;
  private isRunning: boolean = false;
  private processingPromise: Promise<void> | null = null;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      batchSize: 10,
      maxConcurrency: 3,
      delayBetweenBatches: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      timeoutPerBatch: 30000,
      priorityLevels: 5,
      ...config
    };

    this.stats = {
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      batchesProcessed: 0,
      currentBatchSize: 0,
      queueSize: 0
    };
  }

  /**
   * Add item to processing queue
   */
  add(item: BatchItem<T, R>): void {
    // Validate dependencies
    if (item.dependencies) {
      for (const depId of item.dependencies) {
        if (!this.completed.has(depId) && !this.queue.find(q => q.id === depId)) {
          throw new Error(`Dependency ${depId} not found for item ${item.id}`);
        }
      }
    }

    // Remove existing item with same ID
    this.queue = this.queue.filter(q => q.id !== item.id);

    // Add to queue
    this.queue.push({
      ...item,
      priority: Math.max(0, Math.min(this.config.priorityLevels - 1, item.priority)),
      retries: 0
    });

    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.stats.totalItems++;
    this.stats.queueSize = this.queue.length;

    // Start processing if not already running
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Add multiple items at once
   */
  addBatch(items: BatchItem<T, R>[]): void {
    items.forEach(item => this.add(item));
  }

  /**
   * Start batch processing
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return this.processingPromise || Promise.resolve();
    }

    this.isRunning = true;
    this.processingPromise = this.processQueue();
    
    try {
      await this.processingPromise;
    } finally {
      this.isRunning = false;
      this.processingPromise = null;
    }
  }

  /**
   * Stop batch processing
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Wait for all items to complete
   */
  async waitForCompletion(): Promise<BatchResult<R>[]> {
    await this.start();
    return Array.from(this.completed.values());
  }

  /**
   * Get processing statistics
   */
  getStats(): BatchStats {
    this.stats.queueSize = this.queue.length;
    return { ...this.stats };
  }

  /**
   * Get result for specific item
   */
  getResult(itemId: string): BatchResult<R> | undefined {
    return this.completed.get(itemId);
  }

  /**
   * Get all results
   */
  getAllResults(): BatchResult<R>[] {
    return Array.from(this.completed.values());
  }

  /**
   * Clear completed results
   */
  clearResults(): void {
    this.completed.clear();
    this.stats.processedItems = 0;
    this.stats.successfulItems = 0;
    this.stats.failedItems = 0;
  }

  /**
   * Remove item from queue
   */
  remove(itemId: string): boolean {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.stats.queueSize = this.queue.length;
      return true;
    }
    return false;
  }

  /**
   * Check if item is in queue or processing
   */
  isQueued(itemId: string): boolean {
    return this.queue.some(item => item.id === itemId) || this.processing.has(itemId);
  }

  /**
   * Check if item is currently processing
   */
  isProcessing(itemId: string): boolean {
    return this.processing.has(itemId);
  }

  /**
   * Check if item is completed
   */
  isCompleted(itemId: string): boolean {
    return this.completed.has(itemId);
  }

  // Private methods

  private async processQueue(): Promise<void> {
    const activeBatches: Promise<void>[] = [];

    while (this.isRunning && (this.queue.length > 0 || activeBatches.length > 0)) {
      // Wait if we've reached max concurrency
      if (activeBatches.length >= this.config.maxConcurrency) {
        await Promise.race(activeBatches);
        // Remove completed batches
        for (let i = activeBatches.length - 1; i >= 0; i--) {
          if (await this.isPromiseResolved(activeBatches[i])) {
            activeBatches.splice(i, 1);
          }
        }
        continue;
      }

      // Get next batch
      const batch = this.getNextBatch();
      if (batch.length === 0) {
        // No items ready to process, wait for dependencies
        if (activeBatches.length > 0) {
          await Promise.race(activeBatches);
          continue;
        } else {
          break; // No items and no active batches
        }
      }

      // Process batch
      const batchPromise = this.processBatch(batch);
      activeBatches.push(batchPromise);

      // Add delay between batches if configured
      if (this.config.delayBetweenBatches > 0) {
        await this.delay(this.config.delayBetweenBatches);
      }
    }

    // Wait for all remaining batches to complete
    await Promise.all(activeBatches);
  }

  private getNextBatch(): BatchItem<T, R>[] {
    const batch: BatchItem<T, R>[] = [];
    const readyItems: BatchItem<T, R>[] = [];

    // Find items that are ready to process (dependencies met)
    for (const item of this.queue) {
      if (this.areDependenciesMet(item)) {
        readyItems.push(item);
      }
    }

    // Take up to batchSize items
    const batchSize = Math.min(this.config.batchSize, readyItems.length);
    for (let i = 0; i < batchSize; i++) {
      const item = readyItems[i];
      batch.push(item);
      
      // Remove from queue
      const queueIndex = this.queue.indexOf(item);
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1);
      }
      
      // Mark as processing
      this.processing.add(item.id);
    }

    this.stats.currentBatchSize = batch.length;
    this.stats.queueSize = this.queue.length;

    return batch;
  }

  private areDependenciesMet(item: BatchItem<T, R>): boolean {
    if (!item.dependencies) return true;

    return item.dependencies.every(depId => {
      const result = this.completed.get(depId);
      return result && result.success;
    });
  }

  private async processBatch(batch: BatchItem<T, R>[]): Promise<void> {
    if (batch.length === 0) return;

    const batchStartTime = performance.now();
    const batchPromises = batch.map(item => this.processItem(item));

    try {
      await Promise.all(batchPromises);
    } catch (error) {
      console.error('Batch processing error:', error);
    }

    const batchEndTime = performance.now();
    const batchProcessingTime = batchEndTime - batchStartTime;

    this.stats.batchesProcessed++;
    this.stats.totalProcessingTime += batchProcessingTime;
    this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.batchesProcessed;

    // Remove from processing set
    batch.forEach(item => this.processing.delete(item.id));
  }

  private async processItem(item: BatchItem<T, R>): Promise<void> {
    const startTime = performance.now();
    let result: BatchResult<R>;

    try {
      // Apply timeout if specified
      const timeout = item.timeout || this.config.timeoutPerBatch;
      const processPromise = item.processor(item.data);
      const timeoutPromise = this.createTimeoutPromise(timeout);

      const processingResult = await Promise.race([processPromise, timeoutPromise]);

      result = {
        id: item.id,
        success: true,
        result: processingResult,
        processingTime: performance.now() - startTime,
        retryCount: item.retries || 0
      };

      this.stats.successfulItems++;
      
      if (item.onSuccess) {
        item.onSuccess(processingResult);
      }

    } catch (error) {
      const shouldRetry = (item.retries || 0) < this.config.retryAttempts;

      if (shouldRetry) {
        // Retry the item
        item.retries = (item.retries || 0) + 1;
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.unshift(item); // Add to front for priority
          this.queue.sort((a, b) => b.priority - a.priority);
        }, this.config.retryDelay);

        return; // Don't mark as completed yet
      }

      result = {
        id: item.id,
        success: false,
        error: error as Error,
        processingTime: performance.now() - startTime,
        retryCount: item.retries || 0
      };

      this.stats.failedItems++;

      if (item.onError) {
        item.onError(error as Error);
      }
    }

    this.completed.set(item.id, result);
    this.stats.processedItems++;
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Processing timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  private async isPromiseResolved(promise: Promise<any>): Promise<boolean> {
    try {
      await Promise.race([
        promise,
        new Promise(resolve => setTimeout(resolve, 0))
      ]);
      return true;
    } catch {
      return true; // Rejected promises are also "resolved"
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all data and reset
   */
  clear(): void {
    this.stop();
    this.queue = [];
    this.processing.clear();
    this.completed.clear();
    
    this.stats = {
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      batchesProcessed: 0,
      currentBatchSize: 0,
      queueSize: 0
    };
  }
}

// Specialized batch processors
export class DiagramDetectionBatchProcessor extends BatchProcessor<any, any> {
  constructor() {
    super({
      batchSize: 5, // Process 5 pages at a time
      maxConcurrency: 2, // Limit concurrent API calls
      delayBetweenBatches: 500, // Respect API rate limits
      retryAttempts: 3,
      retryDelay: 2000,
      timeoutPerBatch: 60000 // 1 minute timeout
    });
  }
}

export class CoordinateValidationBatchProcessor extends BatchProcessor<any, any> {
  constructor() {
    super({
      batchSize: 20, // Validate many coordinates at once
      maxConcurrency: 5, // CPU-bound, can run more concurrently
      delayBetweenBatches: 50,
      retryAttempts: 1, // Validation shouldn't need retries
      timeoutPerBatch: 10000 // 10 seconds timeout
    });
  }
}

export class ImageCompressionBatchProcessor extends BatchProcessor<any, any> {
  constructor() {
    super({
      batchSize: 3, // Compress few images at a time (memory intensive)
      maxConcurrency: 2,
      delayBetweenBatches: 200,
      retryAttempts: 2,
      timeoutPerBatch: 30000 // 30 seconds timeout
    });
  }
}

// Global batch processor instances
export const diagramDetectionBatch = new DiagramDetectionBatchProcessor();
export const coordinateValidationBatch = new CoordinateValidationBatchProcessor();
export const imageCompressionBatch = new ImageCompressionBatchProcessor();