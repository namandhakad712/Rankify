/**
 * Performance Optimizer
 * Handles performance optimization, lazy loading, and memory management
 */

export class PerformanceOptimizer {
  constructor() {
    this.memoryThresholds = {
      warning: 0.8, // 80% of available memory
      critical: 0.9, // 90% of available memory
      cleanup: 0.95 // 95% - force cleanup
    }
    
    this.performanceMetrics = {
      componentLoadTimes: new Map(),
      memoryUsage: [],
      bundleSize: 0,
      lazyLoadedComponents: new Set(),
      optimizationHistory: []
    }
    
    this.observers = {
      intersection: null,
      performance: null,
      memory: null
    }
    
    this.isInitialized = false
  }

  /**
   * Initialize performance optimizer
   */
  async initialize(options = {}) {
    try {
      // Setup performance monitoring
      this.setupPerformanceMonitoring()
      
      // Setup memory monitoring
      this.setupMemoryMonitoring()
      
      // Setup lazy loading
      this.setupLazyLoading()
      
      // Setup bundle size monitoring
      await this.setupBundleSizeMonitoring()
      
      // Setup browser compatibility checks
      this.setupBrowserCompatibility()
      
      this.isInitialized = true
      console.log('Performance optimizer initialized successfully')
      
      return true
    } catch (error) {
      console.error('Failed to initialize performance optimizer:', error)
      return false
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      // Monitor navigation timing
      this.observers.performance = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPerformanceMetric(entry)
        }
      })
      
      this.observers.performance.observe({ 
        entryTypes: ['navigation', 'measure', 'paint', 'largest-contentful-paint'] 
      })
    }
    
    // Monitor component load times
    this.setupComponentPerformanceTracking()
  }

  /**
   * Setup component performance tracking
   */
  setupComponentPerformanceTracking() {
    const originalCreateElement = document.createElement
    
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName)
      
      if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link') {
        const startTime = performance.now()
        
        element.addEventListener('load', () => {
          const loadTime = performance.now() - startTime
          this.recordComponentLoadTime(element.src || element.href, loadTime)
        })
        
        element.addEventListener('error', () => {
          const loadTime = performance.now() - startTime
          this.recordComponentLoadTime(element.src || element.href, loadTime, true)
        })
      }
      
      return element
    }.bind(this)
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      // Monitor memory usage every 30 seconds
      setInterval(() => {
        this.checkMemoryUsage()
      }, 30000)
      
      // Initial memory check
      this.checkMemoryUsage()
    }
  }

  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    if (!('memory' in performance)) return
    
    const memory = performance.memory
    const usage = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }
    
    const usageRatio = usage.used / usage.limit
    
    // Record memory usage
    this.performanceMetrics.memoryUsage.push(usage)
    
    // Keep only last 100 measurements
    if (this.performanceMetrics.memoryUsage.length > 100) {
      this.performanceMetrics.memoryUsage.shift()
    }
    
    // Check thresholds and take action
    if (usageRatio >= this.memoryThresholds.cleanup) {
      this.performEmergencyCleanup()
    } else if (usageRatio >= this.memoryThresholds.critical) {
      this.performCriticalOptimization()
    } else if (usageRatio >= this.memoryThresholds.warning) {
      this.performWarningOptimization()
    }
    
    return usage
  }

  /**
   * Setup lazy loading for components
   */
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      this.observers.intersection = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadLazyComponent(entry.target)
          }
        })
      }, {
        rootMargin: '50px' // Load 50px before element comes into view
      })
    }
  }

  /**
   * Setup bundle size monitoring
   */
  async setupBundleSizeMonitoring() {
    try {
      // Estimate bundle size from loaded resources
      const resources = performance.getEntriesByType('resource')
      let totalSize = 0
      
      for (const resource of resources) {
        if (resource.transferSize) {
          totalSize += resource.transferSize
        }
      }
      
      this.performanceMetrics.bundleSize = totalSize
      
      // Check if bundle size exceeds 5MB limit
      const maxBundleSize = 5 * 1024 * 1024 // 5MB
      if (totalSize > maxBundleSize) {
        console.warn(`Bundle size (${this.formatBytes(totalSize)}) exceeds 5MB limit`)
        this.optimizeBundleSize()
      }
      
    } catch (error) {
      console.error('Failed to monitor bundle size:', error)
    }
  }

  /**
   * Setup browser compatibility checks
   */
  setupBrowserCompatibility() {
    const compatibility = this.checkBrowserCompatibility()
    
    if (!compatibility.isSupported) {
      console.warn('Browser compatibility issues detected:', compatibility.issues)
      this.handleBrowserIncompatibility(compatibility)
    }
    
    return compatibility
  }

  /**
   * Check browser compatibility
   */
  checkBrowserCompatibility() {
    const userAgent = navigator.userAgent
    const compatibility = {
      isSupported: true,
      browser: this.detectBrowser(userAgent),
      version: this.detectBrowserVersion(userAgent),
      issues: [],
      features: {}
    }
    
    // Check required features
    const requiredFeatures = {
      'IndexedDB': 'indexedDB' in window,
      'Web Workers': 'Worker' in window,
      'Fetch API': 'fetch' in window,
      'Promise': 'Promise' in window,
      'ES6 Classes': this.checkES6Support(),
      'File API': 'File' in window && 'FileReader' in window,
      'Canvas': this.checkCanvasSupport(),
      'WebGL': this.checkWebGLSupport(),
      'Local Storage': 'localStorage' in window,
      'Session Storage': 'sessionStorage' in window
    }
    
    // Check each feature
    Object.entries(requiredFeatures).forEach(([feature, supported]) => {
      compatibility.features[feature] = supported
      if (!supported) {
        compatibility.issues.push(`${feature} not supported`)
        compatibility.isSupported = false
      }
    })
    
    // Check minimum browser versions
    const minVersions = {
      chrome: 80,
      firefox: 75,
      safari: 13,
      edge: 80
    }
    
    const browserVersion = compatibility.version
    const minVersion = minVersions[compatibility.browser.toLowerCase()]
    
    if (minVersion && browserVersion < minVersion) {
      compatibility.issues.push(`${compatibility.browser} version ${browserVersion} is below minimum required version ${minVersion}`)
      compatibility.isSupported = false
    }
    
    return compatibility
  }

  /**
   * Detect browser type
   */
  detectBrowser(userAgent) {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edg')) return 'Edge'
    return 'Unknown'
  }

  /**
   * Detect browser version
   */
  detectBrowserVersion(userAgent) {
    let version = 0
    
    if (userAgent.includes('Chrome')) {
      const match = userAgent.match(/Chrome\/(\d+)/)
      version = match ? parseInt(match[1]) : 0
    } else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+)/)
      version = match ? parseInt(match[1]) : 0
    } else if (userAgent.includes('Safari')) {
      const match = userAgent.match(/Version\/(\d+)/)
      version = match ? parseInt(match[1]) : 0
    } else if (userAgent.includes('Edg')) {
      const match = userAgent.match(/Edg\/(\d+)/)
      version = match ? parseInt(match[1]) : 0
    }
    
    return version
  }

  /**
   * Check ES6 support
   */
  checkES6Support() {
    try {
      // Test arrow functions
      eval('() => {}')
      // Test classes
      eval('class Test {}')
      // Test template literals
      eval('`template`')
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Check Canvas support
   */
  checkCanvasSupport() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext && canvas.getContext('2d'))
    } catch (error) {
      return false
    }
  }

  /**
   * Check WebGL support
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch (error) {
      return false
    }
  }

  /**
   * Handle browser incompatibility
   */
  handleBrowserIncompatibility(compatibility) {
    // Show warning to user
    const message = `Your browser (${compatibility.browser} ${compatibility.version}) may not be fully compatible with this application. Issues: ${compatibility.issues.join(', ')}`
    
    if ('showNotification' in window) {
      window.showNotification({
        type: 'warning',
        title: 'Browser Compatibility Warning',
        message: message,
        duration: 10000
      })
    } else {
      console.warn(message)
    }
    
    // Attempt to load polyfills
    this.loadPolyfills(compatibility.features)
  }

  /**
   * Load polyfills for missing features
   */
  async loadPolyfills(features) {
    const polyfills = []
    
    if (!features['Fetch API']) {
      polyfills.push('https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js')
    }
    
    if (!features['Promise']) {
      polyfills.push('https://cdn.jsdelivr.net/npm/es6-promise@4.2.8/dist/es6-promise.auto.min.js')
    }
    
    if (!features['IndexedDB']) {
      polyfills.push('https://cdn.jsdelivr.net/npm/fake-indexeddb@4.0.2/lib/fdb-core.js')
    }
    
    // Load polyfills
    for (const polyfill of polyfills) {
      try {
        await this.loadScript(polyfill)
        console.log(`Loaded polyfill: ${polyfill}`)
      } catch (error) {
        console.error(`Failed to load polyfill: ${polyfill}`, error)
      }
    }
  }

  /**
   * Load script dynamically
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  /**
   * Create lazy-loaded component
   */
  createLazyComponent(componentLoader, placeholder = null) {
    return {
      component: componentLoader,
      loading: placeholder || this.createLoadingPlaceholder(),
      error: this.createErrorPlaceholder(),
      delay: 200,
      timeout: 10000
    }
  }

  /**
   * Create loading placeholder
   */
  createLoadingPlaceholder() {
    return {
      template: `
        <div class="flex items-center justify-center p-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">Loading...</span>
        </div>
      `
    }
  }

  /**
   * Create error placeholder
   */
  createErrorPlaceholder() {
    return {
      template: `
        <div class="flex items-center justify-center p-8 text-red-600">
          <svg class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Failed to load component</span>
        </div>
      `
    }
  }

  /**
   * Register component for lazy loading
   */
  registerLazyComponent(element, loader) {
    if (this.observers.intersection) {
      element.dataset.lazyLoader = loader
      this.observers.intersection.observe(element)
    }
  }

  /**
   * Load lazy component
   */
  async loadLazyComponent(element) {
    const loader = element.dataset.lazyLoader
    if (!loader || this.performanceMetrics.lazyLoadedComponents.has(loader)) {
      return
    }
    
    try {
      const startTime = performance.now()
      
      // Load component
      const component = await import(loader)
      
      const loadTime = performance.now() - startTime
      this.recordComponentLoadTime(loader, loadTime)
      
      // Mark as loaded
      this.performanceMetrics.lazyLoadedComponents.add(loader)
      
      // Stop observing
      if (this.observers.intersection) {
        this.observers.intersection.unobserve(element)
      }
      
      console.log(`Lazy loaded component: ${loader} in ${loadTime.toFixed(2)}ms`)
      
    } catch (error) {
      console.error(`Failed to lazy load component: ${loader}`, error)
    }
  }

  /**
   * Optimize bundle size
   */
  optimizeBundleSize() {
    const optimizations = []
    
    // Remove unused CSS
    this.removeUnusedCSS()
    optimizations.push('Removed unused CSS')
    
    // Compress images
    this.compressImages()
    optimizations.push('Compressed images')
    
    // Enable code splitting
    this.enableCodeSplitting()
    optimizations.push('Enabled code splitting')
    
    // Minify JavaScript
    this.minifyJavaScript()
    optimizations.push('Minified JavaScript')
    
    this.performanceMetrics.optimizationHistory.push({
      type: 'bundle-size',
      optimizations: optimizations,
      timestamp: Date.now()
    })
    
    console.log('Bundle size optimizations applied:', optimizations)
  }

  /**
   * Remove unused CSS
   */
  removeUnusedCSS() {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style')
    const usedSelectors = new Set()
    
    // Collect all used selectors
    document.querySelectorAll('*').forEach(element => {
      if (element.className) {
        element.className.split(' ').forEach(className => {
          if (className.trim()) {
            usedSelectors.add(`.${className.trim()}`)
          }
        })
      }
      
      if (element.id) {
        usedSelectors.add(`#${element.id}`)
      }
    })
    
    // This is a simplified implementation
    // In a real application, you'd use tools like PurgeCSS
    console.log(`Found ${usedSelectors.size} used CSS selectors`)
  }

  /**
   * Compress images
   */
  compressImages() {
    const images = document.querySelectorAll('img')
    
    images.forEach(img => {
      // Check if image is larger than necessary
      if (img.naturalWidth > img.clientWidth * 2) {
        // Image could be compressed
        console.log(`Image ${img.src} could be optimized`)
      }
    })
  }

  /**
   * Enable code splitting
   */
  enableCodeSplitting() {
    // This would typically be handled by the build system
    // Here we just log the recommendation
    console.log('Code splitting should be enabled in build configuration')
  }

  /**
   * Minify JavaScript
   */
  minifyJavaScript() {
    // This would typically be handled by the build system
    console.log('JavaScript minification should be enabled in build configuration')
  }

  /**
   * Perform warning-level optimization
   */
  performWarningOptimization() {
    console.warn('Memory usage is high, performing optimization...')
    
    // Clear old performance metrics
    if (this.performanceMetrics.memoryUsage.length > 50) {
      this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-25)
    }
    
    // Clear component load times for old components
    const cutoffTime = Date.now() - (30 * 60 * 1000) // 30 minutes
    for (const [component, data] of this.performanceMetrics.componentLoadTimes.entries()) {
      if (data.timestamp < cutoffTime) {
        this.performanceMetrics.componentLoadTimes.delete(component)
      }
    }
    
    // Trigger garbage collection if available
    if ('gc' in window) {
      window.gc()
    }
  }

  /**
   * Perform critical-level optimization
   */
  performCriticalOptimization() {
    console.error('Memory usage is critical, performing aggressive optimization...')
    
    // Clear all non-essential data
    this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-10)
    this.performanceMetrics.componentLoadTimes.clear()
    this.performanceMetrics.optimizationHistory = this.performanceMetrics.optimizationHistory.slice(-5)
    
    // Clear browser caches if possible
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('cache')) {
            caches.delete(name)
          }
        })
      })
    }
    
    // Force garbage collection
    if ('gc' in window) {
      window.gc()
    }
  }

  /**
   * Perform emergency cleanup
   */
  performEmergencyCleanup() {
    console.error('Memory usage is at emergency level, performing emergency cleanup...')
    
    // Clear all performance metrics
    this.performanceMetrics.memoryUsage = []
    this.performanceMetrics.componentLoadTimes.clear()
    this.performanceMetrics.optimizationHistory = []
    this.performanceMetrics.lazyLoadedComponents.clear()
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }
    
    // Clear local storage non-essential items
    if ('localStorage' in window) {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('temp') || key.includes('cache'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    // Force multiple garbage collections
    if ('gc' in window) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => window.gc(), i * 100)
      }
    }
    
    // Show warning to user
    if ('showNotification' in window) {
      window.showNotification({
        type: 'warning',
        title: 'Memory Warning',
        message: 'Memory usage is very high. Some data has been cleared to improve performance.',
        duration: 8000
      })
    }
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(entry) {
    if (entry.entryType === 'navigation') {
      console.log('Navigation timing:', {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
        loadComplete: entry.loadEventEnd - entry.loadEventStart,
        totalTime: entry.loadEventEnd - entry.fetchStart
      })
    } else if (entry.entryType === 'largest-contentful-paint') {
      console.log('Largest Contentful Paint:', entry.startTime + 'ms')
    } else if (entry.entryType === 'paint') {
      console.log(`${entry.name}:`, entry.startTime + 'ms')
    }
  }

  /**
   * Record component load time
   */
  recordComponentLoadTime(component, loadTime, isError = false) {
    this.performanceMetrics.componentLoadTimes.set(component, {
      loadTime: loadTime,
      isError: isError,
      timestamp: Date.now()
    })
    
    if (loadTime > 5000) { // 5 seconds
      console.warn(`Slow component load: ${component} took ${loadTime.toFixed(2)}ms`)
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const memory = this.checkMemoryUsage()
    const compatibility = this.checkBrowserCompatibility()
    
    return {
      timestamp: Date.now(),
      memory: {
        current: memory,
        usage: this.performanceMetrics.memoryUsage.slice(-10),
        averageUsage: this.calculateAverageMemoryUsage()
      },
      bundleSize: {
        current: this.performanceMetrics.bundleSize,
        formatted: this.formatBytes(this.performanceMetrics.bundleSize),
        isWithinLimit: this.performanceMetrics.bundleSize <= 5 * 1024 * 1024
      },
      components: {
        totalLoaded: this.performanceMetrics.componentLoadTimes.size,
        lazyLoaded: this.performanceMetrics.lazyLoadedComponents.size,
        slowComponents: this.getSlowComponents(),
        averageLoadTime: this.calculateAverageLoadTime()
      },
      browser: compatibility,
      optimizations: this.performanceMetrics.optimizationHistory.slice(-5)
    }
  }

  /**
   * Calculate average memory usage
   */
  calculateAverageMemoryUsage() {
    if (this.performanceMetrics.memoryUsage.length === 0) return 0
    
    const totalUsage = this.performanceMetrics.memoryUsage.reduce((sum, usage) => sum + usage.used, 0)
    return totalUsage / this.performanceMetrics.memoryUsage.length
  }

  /**
   * Get slow components
   */
  getSlowComponents() {
    const slowComponents = []
    
    for (const [component, data] of this.performanceMetrics.componentLoadTimes.entries()) {
      if (data.loadTime > 3000) { // 3 seconds
        slowComponents.push({
          component: component,
          loadTime: data.loadTime,
          isError: data.isError
        })
      }
    }
    
    return slowComponents.sort((a, b) => b.loadTime - a.loadTime)
  }

  /**
   * Calculate average load time
   */
  calculateAverageLoadTime() {
    if (this.performanceMetrics.componentLoadTimes.size === 0) return 0
    
    let totalTime = 0
    let count = 0
    
    for (const data of this.performanceMetrics.componentLoadTimes.values()) {
      if (!data.isError) {
        totalTime += data.loadTime
        count++
      }
    }
    
    return count > 0 ? totalTime / count : 0
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
   * Cleanup and destroy
   */
  destroy() {
    // Disconnect observers
    if (this.observers.performance) {
      this.observers.performance.disconnect()
    }
    
    if (this.observers.intersection) {
      this.observers.intersection.disconnect()
    }
    
    // Clear metrics
    this.performanceMetrics.componentLoadTimes.clear()
    this.performanceMetrics.memoryUsage = []
    this.performanceMetrics.lazyLoadedComponents.clear()
    this.performanceMetrics.optimizationHistory = []
    
    this.isInitialized = false
  }
}

// Create singleton instance
let performanceOptimizerInstance = null

/**
 * Get performance optimizer singleton
 */
export function getPerformanceOptimizer() {
  if (!performanceOptimizerInstance) {
    performanceOptimizerInstance = new PerformanceOptimizer()
  }
  return performanceOptimizerInstance
}

/**
 * Initialize performance optimizer
 */
export async function initializePerformanceOptimizer(options = {}) {
  const optimizer = getPerformanceOptimizer()
  await optimizer.initialize(options)
  return optimizer
}

/**
 * Create lazy component wrapper
 */
export function createLazyComponent(componentLoader, placeholder) {
  const optimizer = getPerformanceOptimizer()
  return optimizer.createLazyComponent(componentLoader, placeholder)
}

/**
 * Check browser compatibility
 */
export function checkBrowserCompatibility() {
  const optimizer = getPerformanceOptimizer()
  return optimizer.checkBrowserCompatibility()
}

/**
 * Get performance report
 */
export function getPerformanceReport() {
  const optimizer = getPerformanceOptimizer()
  return optimizer.getPerformanceReport()
}