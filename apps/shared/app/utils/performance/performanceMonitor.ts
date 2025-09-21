/**
 * Performance Monitoring System
 * Tracks and optimizes performance across the diagram detection system
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  category: 'timing' | 'memory' | 'network' | 'user' | 'system';
  tags?: Record<string, string>;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface PerformanceReport {
  summary: {
    totalMetrics: number;
    timeRange: { start: number; end: number };
    averageResponseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
  metrics: PerformanceMetric[];
  violations: Array<{
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }>;
  recommendations: string[];
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private isMonitoring: boolean = false;
  private maxMetrics: number = 10000;

  constructor() {
    this.setupDefaultThresholds();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.startResourceMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  /**
   * Record a timing metric
   */
  recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'timing',
      tags
    });

    this.checkThreshold(name, duration);
  }

  /**
   * Record a memory metric
   */
  recordMemory(name: string, bytes: number, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      value: bytes,
      unit: 'bytes',
      timestamp: Date.now(),
      category: 'memory',
      tags
    });

    this.checkThreshold(name, bytes);
  }

  /**
   * Record a counter metric
   */
  recordCount(name: string, count: number = 1, tags?: Record<string, string>): void {
    const currentCount = this.counters.get(name) || 0;
    const newCount = currentCount + count;
    this.counters.set(name, newCount);

    this.addMetric({
      name,
      value: newCount,
      unit: 'count',
      timestamp: Date.now(),
      category: 'system',
      tags
    });
  }

  /**
   * Start a timer
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End a timer and record the duration
   */
  endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.recordTiming(name, duration, tags);
    
    return duration;
  }

  /**
   * Measure the performance of an async operation
   */
  async measure<T>(name: string, operation: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    this.startTimer(name);
    
    try {
      const result = await operation();
      this.endTimer(name, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, status: 'error' });
      this.recordCount(`${name}_errors`, 1, tags);
      throw error;
    }
  }

  /**
   * Measure the performance of a sync operation
   */
  measureSync<T>(name: string, operation: () => T, tags?: Record<string, string>): T {
    this.startTimer(name);
    
    try {
      const result = operation();
      this.endTimer(name, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, status: 'error' });
      this.recordCount(`${name}_errors`, 1, tags);
      throw error;
    }
  }

  /**
   * Set performance threshold
   */
  setThreshold(metric: string, warning: number, critical: number, unit: string): void {
    this.thresholds.set(metric, { metric, warning, critical, unit });
  }

  /**
   * Get performance metrics
   */
  getMetrics(category?: string, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (category) {
      filtered = filtered.filter(m => m.category === category);
    }

    if (timeRange) {
      filtered = filtered.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filtered;
  }

  /**
   * Get performance summary
   */
  getSummary(timeRange?: { start: number; end: number }): PerformanceReport {
    const metrics = this.getMetrics(undefined, timeRange);
    const timingMetrics = metrics.filter(m => m.category === 'timing');
    const memoryMetrics = metrics.filter(m => m.category === 'memory');
    const errorMetrics = metrics.filter(m => m.name.includes('error'));

    const averageResponseTime = timingMetrics.length > 0
      ? timingMetrics.reduce((sum, m) => sum + m.value, 0) / timingMetrics.length
      : 0;

    const memoryUsage = memoryMetrics.length > 0
      ? Math.max(...memoryMetrics.map(m => m.value))
      : 0;

    const errorRate = metrics.length > 0
      ? (errorMetrics.length / metrics.length) * 100
      : 0;

    const violations = this.findThresholdViolations(metrics);
    const recommendations = this.generateRecommendations(violations, metrics);

    return {
      summary: {
        totalMetrics: metrics.length,
        timeRange: timeRange || { 
          start: Math.min(...metrics.map(m => m.timestamp)), 
          end: Math.max(...metrics.map(m => m.timestamp)) 
        },
        averageResponseTime,
        memoryUsage,
        errorRate
      },
      metrics,
      violations,
      recommendations
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.counters.clear();
    this.timers.clear();
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      thresholds: Array.from(this.thresholds.entries()),
      counters: Array.from(this.counters.entries()),
      timestamp: Date.now()
    }, null, 2);
  }

  // Private methods

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Limit metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private checkThreshold(name: string, value: number): void {
    const threshold = this.thresholds.get(name);
    if (!threshold) return;

    if (value >= threshold.critical) {
      console.error(`Critical performance threshold exceeded for ${name}: ${value}${threshold.unit} >= ${threshold.critical}${threshold.unit}`);
    } else if (value >= threshold.warning) {
      console.warn(`Warning performance threshold exceeded for ${name}: ${value}${threshold.unit} >= ${threshold.warning}${threshold.unit}`);
    }
  }

  private setupDefaultThresholds(): void {
    // Timing thresholds
    this.setThreshold('pdf_processing', 5000, 10000, 'ms');
    this.setThreshold('diagram_detection', 3000, 6000, 'ms');
    this.setThreshold('coordinate_validation', 100, 500, 'ms');
    this.setThreshold('image_rendering', 1000, 3000, 'ms');
    this.setThreshold('database_operation', 500, 2000, 'ms');

    // Memory thresholds (in bytes)
    this.setThreshold('heap_usage', 100 * 1024 * 1024, 200 * 1024 * 1024, 'bytes');
    this.setThreshold('image_cache_size', 50 * 1024 * 1024, 100 * 1024 * 1024, 'bytes');
    this.setThreshold('coordinate_cache_size', 10 * 1024 * 1024, 20 * 1024 * 1024, 'bytes');
  }

  private setupPerformanceObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordTiming('page_load', navEntry.loadEventEnd - navEntry.navigationStart);
            this.recordTiming('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.navigationStart);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);
    } catch (error) {
      console.warn('Navigation timing observer not supported:', error);
    }

    // Resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordTiming(`resource_${resourceEntry.initiatorType}`, resourceEntry.duration, {
              name: resourceEntry.name,
              size: resourceEntry.transferSize?.toString() || '0'
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (error) {
      console.warn('Resource timing observer not supported:', error);
    }

    // Long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.recordTiming('long_task', entry.duration, {
              startTime: entry.startTime.toString()
            });
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (error) {
      console.warn('Long task observer not supported:', error);
    }
  }

  private startResourceMonitoring(): void {
    // Monitor memory usage periodically
    setInterval(() => {
      if (!this.isMonitoring) return;

      const performance = (window as any).performance;
      if (performance && performance.memory) {
        this.recordMemory('heap_used', performance.memory.usedJSHeapSize);
        this.recordMemory('heap_total', performance.memory.totalJSHeapSize);
        this.recordMemory('heap_limit', performance.memory.jsHeapSizeLimit);
      }
    }, 5000); // Every 5 seconds
  }

  private findThresholdViolations(metrics: PerformanceMetric[]): Array<{
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }> {
    const violations: Array<{
      metric: string;
      value: number;
      threshold: number;
      severity: 'warning' | 'critical';
    }> = [];

    for (const metric of metrics) {
      const threshold = this.thresholds.get(metric.name);
      if (!threshold) continue;

      if (metric.value >= threshold.critical) {
        violations.push({
          metric: metric.name,
          value: metric.value,
          threshold: threshold.critical,
          severity: 'critical'
        });
      } else if (metric.value >= threshold.warning) {
        violations.push({
          metric: metric.name,
          value: metric.value,
          threshold: threshold.warning,
          severity: 'warning'
        });
      }
    }

    return violations;
  }

  private generateRecommendations(
    violations: Array<{ metric: string; value: number; threshold: number; severity: string }>,
    metrics: PerformanceMetric[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze violations
    for (const violation of violations) {
      switch (violation.metric) {
        case 'pdf_processing':
          recommendations.push('Consider reducing PDF processing batch size or implementing progressive loading');
          break;
        case 'diagram_detection':
          recommendations.push('Optimize diagram detection by reducing image resolution or using local fallbacks');
          break;
        case 'heap_usage':
          recommendations.push('Implement memory cleanup and reduce cache sizes');
          break;
        case 'image_rendering':
          recommendations.push('Optimize image rendering by reducing quality or implementing lazy loading');
          break;
      }
    }

    // Analyze patterns
    const timingMetrics = metrics.filter(m => m.category === 'timing');
    const slowOperations = timingMetrics.filter(m => m.value > 1000);
    
    if (slowOperations.length > timingMetrics.length * 0.3) {
      recommendations.push('High number of slow operations detected - consider performance optimization');
    }

    const memoryMetrics = metrics.filter(m => m.category === 'memory');
    const highMemoryUsage = memoryMetrics.filter(m => m.value > 50 * 1024 * 1024);
    
    if (highMemoryUsage.length > 0) {
      recommendations.push('High memory usage detected - implement memory management strategies');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.clearMetrics();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  performanceMonitor.startMonitoring();
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.destroy();
  });
}

// Performance decorators for easy method instrumentation
export function measurePerformance(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return await performanceMonitor.measure(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export function measureSync(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureSync(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}