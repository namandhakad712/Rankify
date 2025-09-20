/**
 * Performance Integration Module
 * Integrates performance optimization, memory management, and browser compatibility
 */

import { initializePerformanceOptimizer, getPerformanceOptimizer } from './performanceOptimizer.js'
import { initializeMemoryManager, getMemoryManager } from './memoryManager.js'
import { initializeBrowserCompatibility, getBrowserCompatibility } from './browserCompatibility.js'
import { initializeErrorIntegration, getErrorIntegration } from './errorIntegration.js'

export class PerformanceIntegration {
  constructor() {
    this.performanceOptimizer = null
    this.memoryManager = null
    this.browserCompatibility = null
    this.errorIntegration = null
    this.isInitialized = false
    this.config = null
    this.monitoringInterval = null
    this.healthCheckInterval = null
  }

  /**
   * Initialize all performance systems
   */
  async initialize(config = {}) {
    try {
      this.config = this.mergeConfig(this.getDefaultConfig(), config)
      
      console.log('Initializing performance integration system...')
      
      // Initialize browser compatibility first
      console.log('Checking browser compatibility...')
      this.browserCompatibility = await initializeBrowserCompatibility(this.config.browserCompatibility)
      
      const compatibilityReport = this.browserCompatibility.getCompatibilityReport()
      if (!compatibilityReport.overall.isSupported) {
        console.warn('Browser compatibility issues detected, some features may not work correctly')
      }
      
      // Initialize error integration
      console.log('Initializing error handling...')
      this.errorIntegration = await initializeErrorIntegration(this.config.errorIntegration)
      
      // Initialize memory manager
      console.log('Initializing memory management...')
      this.memoryManager = initializeMemoryManager(this.config.memoryManager)
      
      // Initialize performance optimizer
      console.log('Initializing performance optimizer...')
      this.performanceOptimizer = await initializePerformanceOptimizer(this.config.performanceOptimizer)
      
      // Setup integrations
      this.setupIntegrations()
      
      // Start monitoring
      this.startMonitoring()
      
      this.isInitialized = true
      console.log('Performance integration system initialized successfully')
      
      return {
        success: true,
        browserCompatibility: compatibilityReport,
        warnings: compatibilityReport.overall.warnings,
        issues: compatibilityReport.overall.issues
      }
      
    } catch (error) {
      console.error('Failed to initialize performance integration system:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      performanceOptimizer: {
        monitoringInterval: 30000, // 30 seconds
        bundleSizeLimit: 5 * 1024 * 1024, // 5MB
        componentLoadTimeThreshold: 3000, // 3 seconds
        enableLazyLoading: true,
        enableCodeSplitting: true
      },
      
      memoryManager: {
        thresholds: {
          warning: 0.7,
          critical: 0.85,
          emergency: 0.95
        },
        monitoringInterval: 10000, // 10 seconds
        enableMemoryPools: true,
        maxPoolSize: 10
      },
      
      browserCompatibility: {
        loadPolyfills: true,
        applyCSSFallbacks: true,
        showWarning: true,
        autoLoad: true
      },
      
      errorIntegration: {
        errorHandler: {
          reporting: { enabled: false },
          notifications: { enabled: true }
        }
      },
      
      monitoring: {
        healthCheckInterval: 60000, // 1 minute
        performanceReportInterval: 300000, // 5 minutes
        enableDetailedLogging: process.env.NODE_ENV === 'development'
      }
    }
  }

  /**
   * Merge configuration objects
   */
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig }
    
    Object.keys(userConfig).forEach(key => {
      if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        merged[key] = this.mergeConfig(merged[key] || {}, userConfig[key])
      } else {
        merged[key] = userConfig[key]
      }
    })
    
    return merged
  }

  /**
   * Setup integrations between systems
   */
  setupIntegrations() {
    // Memory manager cleanup callbacks
    this.memoryManager.registerCleanupCallback((level) => {
      if (level === 'critical' || level === 'emergency') {
        // Clear performance optimizer caches
        this.performanceOptimizer.performCriticalOptimization()
      }
    }, 'critical')
    
    // Performance optimizer memory monitoring
    this.performanceOptimizer.setupMemoryMonitoring = () => {
      // Use memory manager for monitoring
      return this.memoryManager.checkMemoryUsage()
    }
    
    // Error integration with performance systems
    this.errorIntegration.registerCleanupCallback = (callback) => {
      this.memoryManager.registerCleanupCallback(callback)
    }
    
    // Browser compatibility warnings
    const compatibilityReport = this.browserCompatibility.getCompatibilityReport()
    if (compatibilityReport && !compatibilityReport.overall.isSupported) {
      this.performanceOptimizer.enableCompatibilityMode()
    }
  }

  /**
   * Start monitoring systems
   */
  startMonitoring() {
    if (this.config.monitoring.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck()
      }, this.config.monitoring.healthCheckInterval)
    }
    
    if (this.config.monitoring.performanceReportInterval > 0) {
      this.monitoringInterval = setInterval(() => {
        this.generatePerformanceReport()
      }, this.config.monitoring.performanceReportInterval)
    }
  }

  /**
   * Stop monitoring systems
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const health = {
      timestamp: Date.now(),
      overall: 'healthy',
      systems: {},
      issues: [],
      recommendations: []
    }
    
    try {
      // Check memory manager health
      const memoryStats = this.memoryManager.getMemoryStatistics()
      health.systems.memory = {
        status: memoryStats.current?.level || 'unknown',
        usage: memoryStats.current?.usageRatio || 0,
        allocations: memoryStats.allocations.active,
        pools: memoryStats.pools.length
      }
      
      if (memoryStats.current?.level === 'critical' || memoryStats.current?.level === 'emergency') {
        health.overall = 'critical'
        health.issues.push('Memory usage is critically high')
        health.recommendations.push('Consider reducing memory usage or clearing caches')
      }
      
      // Check performance optimizer health
      const performanceReport = this.performanceOptimizer.getPerformanceReport()
      health.systems.performance = {
        status: 'healthy',
        bundleSize: performanceReport.bundleSize.current,
        componentsLoaded: performanceReport.components.totalLoaded,
        averageLoadTime: performanceReport.components.averageLoadTime
      }
      
      if (!performanceReport.bundleSize.isWithinLimit) {
        health.overall = health.overall === 'critical' ? 'critical' : 'warning'
        health.issues.push('Bundle size exceeds 5MB limit')
        health.recommendations.push('Enable code splitting and optimize bundle size')
      }
      
      if (performanceReport.components.averageLoadTime > 3000) {
        health.overall = health.overall === 'critical' ? 'critical' : 'warning'
        health.issues.push('Average component load time is high')
        health.recommendations.push('Optimize slow-loading components')
      }
      
      // Check browser compatibility
      const compatibilityReport = this.browserCompatibility.getCompatibilityReport()
      health.systems.browser = {
        status: compatibilityReport.overall.isSupported ? 'supported' : 'unsupported',
        browser: `${compatibilityReport.browser.name} ${compatibilityReport.browser.version}`,
        issues: compatibilityReport.overall.issues.length,
        warnings: compatibilityReport.overall.warnings.length
      }
      
      if (!compatibilityReport.overall.isSupported) {
        health.overall = 'warning'
        health.issues.push('Browser compatibility issues detected')
        health.recommendations.push('Update browser or use a supported browser')
      }
      
      // Check error integration health
      const errorStats = this.errorIntegration.getIntegrationStatistics()
      health.systems.errors = {
        status: 'healthy',
        totalErrors: errorStats.errors.totalErrors,
        recoveryRate: errorStats.recoveries.successRate,
        integrations: errorStats.integrations.total
      }
      
      if (errorStats.recoveries.successRate < 70) {
        health.overall = health.overall === 'critical' ? 'critical' : 'warning'
        health.issues.push('Low error recovery rate')
        health.recommendations.push('Review error handling strategies')
      }
      
    } catch (error) {
      health.overall = 'error'
      health.issues.push(`Health check failed: ${error.message}`)
    }
    
    // Log health status
    if (this.config.monitoring.enableDetailedLogging) {
      console.log('System health check:', health)
    } else if (health.overall !== 'healthy') {
      console.warn('System health issues detected:', health.issues)
    }
    
    // Emit health check event
    this.emitHealthCheckEvent(health)
    
    return health
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      performance: this.performanceOptimizer.getPerformanceReport(),
      memory: this.memoryManager.getMemoryStatistics(),
      browser: this.browserCompatibility.getCompatibilityReport(),
      errors: this.errorIntegration.getIntegrationStatistics()
    }
    
    if (this.config.monitoring.enableDetailedLogging) {
      console.log('Performance report:', report)
    }
    
    // Emit performance report event
    this.emitPerformanceReportEvent(report)
    
    return report
  }

  /**
   * Optimize for large PDF processing
   */
  async optimizeForPDFProcessing(pdfSize) {
    console.log(`Optimizing for PDF processing (${this.formatBytes(pdfSize)})...`)
    
    // Check memory availability
    const memoryStatus = this.memoryManager.checkMemoryUsage()
    if (memoryStatus && memoryStatus.level !== 'normal') {
      console.warn('Memory usage is high, performing cleanup before PDF processing')
      this.memoryManager.performLightCleanup()
    }
    
    // Create memory pool for PDF processing
    const chunkSize = Math.min(1024 * 1024, pdfSize / 10) // 1MB or 1/10th of file size
    const poolSize = Math.min(10, Math.ceil(pdfSize / chunkSize))
    
    this.memoryManager.createMemoryPool('pdf_processing', chunkSize, poolSize)
    
    // Enable performance monitoring for PDF processing
    this.performanceOptimizer.enablePDFProcessingMode()
    
    return {
      chunkSize: chunkSize,
      poolSize: poolSize,
      memoryStatus: memoryStatus
    }
  }

  /**
   * Process large PDF with integrated optimization
   */
  async processLargePDF(pdfData, options = {}) {
    const optimization = await this.optimizeForPDFProcessing(pdfData.byteLength)
    
    const processingOptions = {
      chunkSize: optimization.chunkSize,
      maxConcurrent: options.maxConcurrent || 2,
      ...options
    }
    
    try {
      const result = await this.memoryManager.processLargePDF(pdfData, processingOptions)
      
      console.log(`PDF processing completed successfully (${result.length} chunks)`)
      
      return result
      
    } catch (error) {
      console.error('PDF processing failed:', error)
      
      // Attempt recovery
      const errorResult = await this.errorIntegration.handleError(error, 'pdf_processing')
      
      if (errorResult.recovery.finalStatus === 'recovered') {
        console.log('PDF processing recovered successfully')
        return errorResult.data
      }
      
      throw error
      
    } finally {
      // Cleanup PDF processing resources
      this.memoryManager.memoryPools.delete('pdf_processing')
      this.performanceOptimizer.disablePDFProcessingMode()
    }
  }

  /**
   * Create optimized lazy component
   */
  createOptimizedLazyComponent(componentLoader, options = {}) {
    // Check browser compatibility
    const compatibility = this.browserCompatibility.getCompatibilityReport()
    
    if (!compatibility.overall.isSupported) {
      // Return simplified component for unsupported browsers
      return this.createFallbackComponent(componentLoader, options)
    }
    
    // Create lazy component with performance monitoring
    const lazyComponent = this.performanceOptimizer.createLazyComponent(componentLoader, options.placeholder)
    
    // Add memory management
    const originalComponent = lazyComponent.component
    lazyComponent.component = async () => {
      const memoryStatus = this.memoryManager.checkMemoryUsage()
      
      if (memoryStatus && memoryStatus.level === 'critical') {
        console.warn('Memory usage is critical, deferring component load')
        await this.memoryManager.waitForMemoryRecovery()
      }
      
      return await originalComponent()
    }
    
    return lazyComponent
  }

  /**
   * Create fallback component for unsupported browsers
   */
  createFallbackComponent(componentLoader, options = {}) {
    return {
      component: componentLoader,
      loading: options.placeholder || {
        template: '<div class="loading">Loading...</div>'
      },
      error: {
        template: '<div class="error">Component failed to load</div>'
      }
    }
  }

  /**
   * Emit health check event
   */
  emitHealthCheckEvent(health) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('performanceHealthCheck', {
        detail: health
      })
      window.dispatchEvent(event)
    }
  }

  /**
   * Emit performance report event
   */
  emitPerformanceReportEvent(report) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('performanceReport', {
        detail: report
      })
      window.dispatchEvent(event)
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' }
    }
    
    return {
      status: 'initialized',
      systems: {
        performanceOptimizer: this.performanceOptimizer?.isInitialized || false,
        memoryManager: this.memoryManager?.isMonitoring || false,
        browserCompatibility: !!this.browserCompatibility?.getCompatibilityReport(),
        errorIntegration: this.errorIntegration?.isInitialized || false
      },
      monitoring: {
        healthCheck: !!this.healthCheckInterval,
        performanceReport: !!this.monitoringInterval
      }
    }
  }

  /**
   * Cleanup and destroy all systems
   */
  async cleanup() {
    console.log('Cleaning up performance integration system...')
    
    // Stop monitoring
    this.stopMonitoring()
    
    // Cleanup individual systems
    if (this.performanceOptimizer) {
      this.performanceOptimizer.destroy()
    }
    
    if (this.memoryManager) {
      this.memoryManager.cleanup()
    }
    
    // Reset state
    this.performanceOptimizer = null
    this.memoryManager = null
    this.browserCompatibility = null
    this.errorIntegration = null
    this.isInitialized = false
    
    console.log('Performance integration system cleaned up')
  }
}

// Create singleton instance
let performanceIntegrationInstance = null

/**
 * Get performance integration singleton
 */
export function getPerformanceIntegration() {
  if (!performanceIntegrationInstance) {
    performanceIntegrationInstance = new PerformanceIntegration()
  }
  return performanceIntegrationInstance
}

/**
 * Initialize performance integration system
 */
export async function initializePerformanceIntegration(config = {}) {
  const integration = getPerformanceIntegration()
  return await integration.initialize(config)
}

/**
 * Process large PDF with integrated optimization
 */
export async function processLargePDFOptimized(pdfData, options = {}) {
  const integration = getPerformanceIntegration()
  return await integration.processLargePDF(pdfData, options)
}

/**
 * Create optimized lazy component
 */
export function createOptimizedLazyComponent(componentLoader, options = {}) {
  const integration = getPerformanceIntegration()
  return integration.createOptimizedLazyComponent(componentLoader, options)
}

/**
 * Perform system health check
 */
export async function performSystemHealthCheck() {
  const integration = getPerformanceIntegration()
  return await integration.performHealthCheck()
}

/**
 * Get system status
 */
export function getSystemStatus() {
  const integration = getPerformanceIntegration()
  return integration.getSystemStatus()
}

/**
 * Cleanup performance integration system
 */
export async function cleanupPerformanceIntegration() {
  const integration = getPerformanceIntegration()
  await integration.cleanup()
}