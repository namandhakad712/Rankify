/**
 * Retry Mechanism with Exponential Backoff
 * Provides intelligent retry logic for failed operations
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add random jitter to prevent thundering herd
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

export class RetryMechanism {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error) => this.isRetryableError(error)
  };

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (attempt === finalConfig.maxRetries || 
            (finalConfig.retryCondition && !finalConfig.retryCondition(error))) {
          break;
        }

        // Call retry callback
        if (finalConfig.onRetry) {
          finalConfig.onRetry(attempt + 1, error);
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, finalConfig);
        await this.delay(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxRetries + 1,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Create a retryable version of an async function
   */
  createRetryableFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    config?: Partial<RetryConfig>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.executeWithRetry(() => fn(...args), config);
      
      if (result.success) {
        return result.result!;
      } else {
        throw result.error;
      }
    };
  }

  /**
   * Batch retry operations with concurrency control
   */
  async batchRetry<T>(
    operations: Array<() => Promise<T>>,
    config?: Partial<RetryConfig> & { concurrency?: number }
  ): Promise<Array<RetryResult<T>>> {
    const concurrency = config?.concurrency || 3;
    const results: Array<RetryResult<T>> = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchPromises = batch.map(op => this.executeWithRetry(op, config));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Circuit breaker pattern for failing services
   */
  createCircuitBreaker<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    }
  ): (...args: T) => Promise<R> {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (...args: T): Promise<R> => {
      const now = Date.now();

      // Reset circuit breaker if monitoring period has passed
      if (now - lastFailureTime > options.monitoringPeriod) {
        failures = 0;
        state = 'CLOSED';
      }

      // Check circuit breaker state
      if (state === 'OPEN') {
        if (now - lastFailureTime < options.resetTimeout) {
          throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
        } else {
          state = 'HALF_OPEN';
        }
      }

      try {
        const result = await fn(...args);
        
        // Success - reset circuit breaker
        if (state === 'HALF_OPEN') {
          failures = 0;
          state = 'CLOSED';
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (failures >= options.failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }

  // Private methods

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return true;
    }

    // HTTP status codes that are retryable
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }

    // API quota errors (temporary)
    if (error.code === 'QUOTA_EXCEEDED' || error.message?.includes('quota')) {
      return true;
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return true;
    }

    // Connection errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return true;
    }

    return false;
  }
}

// Specialized retry configurations for different operations
export const retryConfigs = {
  // API calls with moderate retry
  apiCall: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },

  // Network operations with aggressive retry
  networkOperation: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 15000,
    backoffMultiplier: 1.5,
    jitter: true
  },

  // Database operations with quick retry
  databaseOperation: {
    maxRetries: 2,
    baseDelay: 200,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: false
  },

  // File operations with minimal retry
  fileOperation: {
    maxRetries: 1,
    baseDelay: 500,
    maxDelay: 1000,
    backoffMultiplier: 1,
    jitter: false
  },

  // Critical operations with extensive retry
  criticalOperation: {
    maxRetries: 10,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
    jitter: true
  }
};

// Global retry mechanism instance
export const retryMechanism = new RetryMechanism();