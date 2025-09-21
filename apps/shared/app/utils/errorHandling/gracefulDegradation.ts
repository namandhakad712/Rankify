/**
 * Graceful Degradation System
 * Provides fallback mechanisms when services are unavailable
 */

export interface ServiceStatus {
  name: string;
  available: boolean;
  lastCheck: Date;
  errorCount: number;
  responseTime?: number;
}

export interface FallbackStrategy {
  name: string;
  priority: number;
  condition: () => boolean;
  execute: () => Promise<any>;
  description: string;
}

export interface DegradationConfig {
  serviceName: string;
  healthCheckUrl?: string;
  healthCheckInterval: number; // milliseconds
  failureThreshold: number;
  recoveryThreshold: number;
  fallbackStrategies: FallbackStrategy[];
}

export class GracefulDegradation {
  private services: Map<string, ServiceStatus> = new Map();
  private configs: Map<string, DegradationConfig> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private fallbackResults: Map<string, any> = new Map();

  /**
   * Register a service for degradation monitoring
   */
  registerService(config: DegradationConfig): void {
    this.configs.set(config.serviceName, config);
    
    // Initialize service status
    this.services.set(config.serviceName, {
      name: config.serviceName,
      available: true,
      lastCheck: new Date(),
      errorCount: 0
    });

    // Start health checking if URL provided
    if (config.healthCheckUrl) {
      this.startHealthCheck(config.serviceName);
    }
  }

  /**
   * Execute operation with graceful degradation
   */
  async executeWithDegradation<T>(
    serviceName: string,
    primaryOperation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    const service = this.services.get(serviceName);
    const config = this.configs.get(serviceName);

    if (!service || !config) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    // Try primary operation if service is available
    if (service.available) {
      try {
        const startTime = Date.now();
        const result = await primaryOperation();
        
        // Update service status on success
        service.responseTime = Date.now() - startTime;
        service.errorCount = Math.max(0, service.errorCount - 1);
        
        return result;
      } catch (error) {
        // Mark service as potentially failing
        service.errorCount++;
        service.lastCheck = new Date();

        // Check if service should be marked as unavailable
        if (service.errorCount >= config.failureThreshold) {
          service.available = false;
          console.warn(`Service ${serviceName} marked as unavailable after ${service.errorCount} failures`);
        }

        // Continue to fallback strategies
      }
    }

    // Execute fallback strategies
    return await this.executeFallbackStrategies(serviceName, context);
  }

  /**
   * Execute fallback strategies in priority order
   */
  private async executeFallbackStrategies<T>(serviceName: string, context?: any): Promise<T> {
    const config = this.configs.get(serviceName);
    if (!config) {
      throw new Error(`No fallback strategies configured for ${serviceName}`);
    }

    // Sort strategies by priority (highest first)
    const strategies = [...config.fallbackStrategies].sort((a, b) => b.priority - a.priority);

    for (const strategy of strategies) {
      try {
        // Check if strategy condition is met
        if (strategy.condition()) {
          console.log(`Executing fallback strategy: ${strategy.name} for service: ${serviceName}`);
          
          const result = await strategy.execute();
          
          // Cache successful fallback result
          this.fallbackResults.set(`${serviceName}_${strategy.name}`, {
            result,
            timestamp: new Date(),
            context
          });

          return result;
        }
      } catch (error) {
        console.warn(`Fallback strategy ${strategy.name} failed:`, error);
        continue;
      }
    }

    throw new Error(`All fallback strategies failed for service: ${serviceName}`);
  }

  /**
   * Check service health manually
   */
  async checkServiceHealth(serviceName: string): Promise<boolean> {
    const config = this.configs.get(serviceName);
    const service = this.services.get(serviceName);

    if (!config || !service) {
      return false;
    }

    if (!config.healthCheckUrl) {
      return service.available;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(config.healthCheckUrl, {
        method: 'HEAD',
        timeout: 5000
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      // Update service status
      service.lastCheck = new Date();
      service.responseTime = responseTime;

      if (isHealthy) {
        service.errorCount = Math.max(0, service.errorCount - 1);
        
        // Mark as available if error count is below recovery threshold
        if (service.errorCount <= config.recoveryThreshold) {
          service.available = true;
        }
      } else {
        service.errorCount++;
        
        // Mark as unavailable if error count exceeds failure threshold
        if (service.errorCount >= config.failureThreshold) {
          service.available = false;
        }
      }

      return isHealthy;
    } catch (error) {
      service.errorCount++;
      service.lastCheck = new Date();
      
      if (service.errorCount >= config.failureThreshold) {
        service.available = false;
      }

      return false;
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceName: string): ServiceStatus | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  /**
   * Force service status update
   */
  setServiceStatus(serviceName: string, available: boolean): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.available = available;
      service.lastCheck = new Date();
      
      if (available) {
        service.errorCount = 0;
      }
    }
  }

  /**
   * Get cached fallback result
   */
  getCachedFallbackResult(serviceName: string, strategyName: string): any {
    const key = `${serviceName}_${strategyName}`;
    const cached = this.fallbackResults.get(key);
    
    if (cached) {
      // Check if cache is still valid (e.g., within 5 minutes)
      const age = Date.now() - cached.timestamp.getTime();
      if (age < 300000) { // 5 minutes
        return cached.result;
      } else {
        this.fallbackResults.delete(key);
      }
    }
    
    return null;
  }

  /**
   * Start automatic health checking
   */
  private startHealthCheck(serviceName: string): void {
    const config = this.configs.get(serviceName);
    if (!config) return;

    // Clear existing interval
    const existingInterval = this.healthCheckIntervals.get(serviceName);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new health check interval
    const interval = setInterval(async () => {
      await this.checkServiceHealth(serviceName);
    }, config.healthCheckInterval);

    this.healthCheckIntervals.set(serviceName, interval);
  }

  /**
   * Stop health checking for a service
   */
  stopHealthCheck(serviceName: string): void {
    const interval = this.healthCheckIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serviceName);
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    
    // Clear caches
    this.fallbackResults.clear();
  }
}

// Predefined degradation configurations
export const degradationConfigs = {
  geminiAPI: {
    serviceName: 'gemini-api',
    healthCheckInterval: 60000, // 1 minute
    failureThreshold: 3,
    recoveryThreshold: 1,
    fallbackStrategies: [
      {
        name: 'local-diagram-detection',
        priority: 3,
        condition: () => true,
        execute: async () => {
          // Implement local diagram detection
          return { diagrams: [], confidence: 0.5, source: 'local' };
        },
        description: 'Use local image processing for diagram detection'
      },
      {
        name: 'cached-results',
        priority: 2,
        condition: () => true,
        execute: async () => {
          // Return cached results if available
          return { diagrams: [], confidence: 0.3, source: 'cache' };
        },
        description: 'Use previously cached diagram detection results'
      },
      {
        name: 'manual-mode',
        priority: 1,
        condition: () => true,
        execute: async () => {
          // Skip automatic detection, require manual input
          return { diagrams: [], confidence: 0, source: 'manual', requiresManualInput: true };
        },
        description: 'Skip automatic detection and require manual diagram marking'
      }
    ]
  },

  databaseService: {
    serviceName: 'database',
    healthCheckInterval: 30000, // 30 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    fallbackStrategies: [
      {
        name: 'local-storage',
        priority: 3,
        condition: () => typeof localStorage !== 'undefined',
        execute: async () => {
          // Use localStorage as fallback
          return { storage: 'localStorage', persistent: false };
        },
        description: 'Use browser localStorage for temporary data storage'
      },
      {
        name: 'memory-storage',
        priority: 2,
        condition: () => true,
        execute: async () => {
          // Use in-memory storage
          return { storage: 'memory', persistent: false };
        },
        description: 'Use in-memory storage (data will be lost on refresh)'
      }
    ]
  },

  networkService: {
    serviceName: 'network',
    healthCheckUrl: '/api/health',
    healthCheckInterval: 45000, // 45 seconds
    failureThreshold: 2,
    recoveryThreshold: 1,
    fallbackStrategies: [
      {
        name: 'offline-mode',
        priority: 3,
        condition: () => !navigator.onLine,
        execute: async () => {
          // Enable offline mode
          return { mode: 'offline', features: ['local-processing', 'cached-data'] };
        },
        description: 'Enable offline mode with limited functionality'
      },
      {
        name: 'reduced-functionality',
        priority: 2,
        condition: () => true,
        execute: async () => {
          // Reduce functionality to essential features only
          return { mode: 'reduced', features: ['basic-processing'] };
        },
        description: 'Reduce functionality to essential features only'
      }
    ]
  }
};

// Global graceful degradation instance
export const gracefulDegradation = new GracefulDegradation();