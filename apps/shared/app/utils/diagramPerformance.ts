/**
 * Diagram Performance Utilities
 * 
 * Provides performance monitoring and optimization utilities for diagram operations.
 * Tracks rendering times, memory usage, and provides optimization recommendations.
 */

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

interface MemoryStats {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  percentage: number
}

// Performance metrics storage
const performanceMetrics: PerformanceMetric[] = []
const MAX_METRICS = 100

/**
 * Measure operation performance
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - startTime
    
    recordMetric({
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    })
    
    console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`)
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    console.error(`❌ ${operation} failed after ${duration.toFixed(2)}ms`)
    throw error
  }
}

/**
 * Record a performance metric
 */
function recordMetric(metric: PerformanceMetric) {
  performanceMetrics.push(metric)
  
  // Keep only last MAX_METRICS
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift()
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(operation?: string) {
  const metrics = operation
    ? performanceMetrics.filter(m => m.operation === operation)
    : performanceMetrics
  
  if (metrics.length === 0) {
    return null
  }
  
  const durations = metrics.map(m => m.duration)
  const sum = durations.reduce((a, b) => a + b, 0)
  const avg = sum / durations.length
  const min = Math.min(...durations)
  const max = Math.max(...durations)
  
  // Calculate median
  const sorted = [...durations].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  
  return {
    count: metrics.length,
    average: avg,
    median,
    min,
    max,
    total: sum
  }
}

/**
 * Get memory usage statistics
 */
export function getMemoryStats(): MemoryStats | null {
  if (!performance.memory) {
    return null
  }
  
  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory
  
  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    percentage: (usedJSHeapSize / jsHeapSizeLimit) * 100
  }
}

/**
 * Check if memory usage is high
 */
export function isMemoryHigh(threshold: number = 80): boolean {
  const stats = getMemoryStats()
  return stats ? stats.percentage > threshold : false
}

/**
 * Optimize memory by clearing caches if usage is high
 */
export function optimizeMemory() {
  const stats = getMemoryStats()
  
  if (!stats) {
    console.warn('Memory API not available')
    return
  }
  
  console.log(`💾 Memory usage: ${stats.percentage.toFixed(1)}%`)
  
  if (stats.percentage > 80) {
    console.warn('⚠️ High memory usage detected, clearing caches...')
    
    // Clear diagram cache
    if (typeof window !== 'undefined') {
      // Trigger garbage collection hint
      if (window.gc) {
        window.gc()
      }
    }
    
    return true
  }
  
  return false
}

/**
 * Batch process diagrams with performance monitoring
 */
export async function batchProcessDiagrams<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void>,
  options: {
    batchSize?: number
    delayBetweenBatches?: number
    onProgress?: (processed: number, total: number) => void
  } = {}
): Promise<void> {
  const batchSize = options.batchSize || 5
  const delay = options.delayBetweenBatches || 100
  
  console.log(`🔄 Processing ${items.length} items in batches of ${batchSize}`)
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length))
    
    await Promise.all(
      batch.map((item, batchIndex) => processor(item, i + batchIndex))
    )
    
    if (options.onProgress) {
      options.onProgress(Math.min(i + batchSize, items.length), items.length)
    }
    
    // Check memory and optimize if needed
    if (isMemoryHigh()) {
      optimizeMemory()
    }
    
    // Delay between batches to prevent blocking
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  console.log(`✅ Completed processing ${items.length} items`)
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Create a performance report
 */
export function generatePerformanceReport(): string {
  const operations = [...new Set(performanceMetrics.map(m => m.operation))]
  
  let report = '📊 Diagram Performance Report\n'
  report += '================================\n\n'
  
  for (const operation of operations) {
    const stats = getPerformanceStats(operation)
    if (stats) {
      report += `${operation}:\n`
      report += `  Count: ${stats.count}\n`
      report += `  Average: ${stats.average.toFixed(2)}ms\n`
      report += `  Median: ${stats.median.toFixed(2)}ms\n`
      report += `  Min: ${stats.min.toFixed(2)}ms\n`
      report += `  Max: ${stats.max.toFixed(2)}ms\n`
      report += `  Total: ${stats.total.toFixed(2)}ms\n\n`
    }
  }
  
  const memStats = getMemoryStats()
  if (memStats) {
    report += 'Memory Usage:\n'
    report += `  Used: ${(memStats.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`
    report += `  Total: ${(memStats.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`
    report += `  Limit: ${(memStats.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB\n`
    report += `  Percentage: ${memStats.percentage.toFixed(1)}%\n`
  }
  
  return report
}

/**
 * Clear all performance metrics
 */
export function clearPerformanceMetrics() {
  performanceMetrics.length = 0
  console.log('🗑️ Performance metrics cleared')
}

/**
 * Get optimization recommendations
 */
export function getOptimizationRecommendations(): string[] {
  const recommendations: string[] = []
  
  // Check rendering performance
  const renderStats = getPerformanceStats('renderDiagram')
  if (renderStats && renderStats.average > 500) {
    recommendations.push('Consider reducing diagram rendering scale or implementing more aggressive caching')
  }
  
  // Check memory usage
  const memStats = getMemoryStats()
  if (memStats && memStats.percentage > 70) {
    recommendations.push('High memory usage detected. Consider clearing diagram cache more frequently')
  }
  
  // Check batch processing
  const detectionStats = getPerformanceStats('detectDiagrams')
  if (detectionStats && detectionStats.count > 10 && detectionStats.average > 2000) {
    recommendations.push('Diagram detection is slow. Consider processing fewer pages at once or using a faster model')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Performance is optimal. No recommendations at this time.')
  }
  
  return recommendations
}

/**
 * Monitor performance and log warnings
 */
export function startPerformanceMonitoring(interval: number = 30000) {
  return setInterval(() => {
    const memStats = getMemoryStats()
    
    if (memStats && memStats.percentage > 80) {
      console.warn(`⚠️ High memory usage: ${memStats.percentage.toFixed(1)}%`)
      optimizeMemory()
    }
    
    const recommendations = getOptimizationRecommendations()
    if (recommendations.length > 1 || !recommendations[0].includes('optimal')) {
      console.log('💡 Performance recommendations:', recommendations)
    }
  }, interval)
}
