/**
 * Performance Optimizer Test Suite
 * Tests for performance optimization, memory management, and browser compatibility
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  PerformanceOptimizer, 
  getPerformanceOptimizer, 
  initializePerformanceOptimizer,
  createLazyComponent,
  checkBrowserCompatibility,
  getPerformanceReport
} from '../performanceOptimizer.js'
import { 
  MemoryManager, 
  getMemoryManager, 
  initializeMemoryManager,
  processLargePDFWithMemoryManagement,
  checkMemoryUsage,
  getMemoryStatistics
} from '../memoryManager.js'
import { 
  BrowserCompatibility,
  getBrowserCompatibility,
  initializeBrowserCompatibility,
  loadPolyfills,
  isFeatureSupported
} from '../browserCompatibility.js'

// Mock global objects
global.window = {
  addEventListener: vi.fn(),
  location: { href: 'http://localhost:3000' },
  performance: {
    memory: {
      usedJSHeapSize: 10000000,
      totalJSHeapSize: 20000000,
      jsHeapSizeLimit: 40000000
    },
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn(() => [])
  },
  PerformanceObserver: vi.fn(),
  IntersectionObserver: vi.fn(),
  navigator: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    onLine: true
  },
  document: {
    createElement: vi.fn(() => ({
      addEventListener: vi.fn(),
      appendChild: vi.fn(),
      getContext: vi.fn(() => ({}))
    })),
    head: { appendChild: vi.fn() },
    body: { insertBefore: vi.fn() },
    querySelectorAll: vi.fn(() => [])
  },
  CSS: {
    supports: vi.fn(() => true)
  }
}

global.navigator = global.window.navigator
global.performance = global.window.performance
global.document = global.window.document

describe('PerformanceOptimizer', () => {
  let optimizer
  
  beforeEach(async () => {
    optimizer = new PerformanceOptimizer()
    await optimizer.initialize()
  })
  
  afterEach(() => {
    if (optimizer) {
      optimizer.destroy()
    }
  })

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const newOptimizer = new PerformanceOptimizer()
      const result = await newOptimizer.initialize()
      
      expect(result).toBe(true)
      expect(newOptimizer.isInitialized).toBe(true)
      
      newOptimizer.destroy()
    })

    test('should setup performance monitoring', () => {
      expect(optimizer.observers).toBeDefined()
      expect(optimizer.performanceMetrics).toBeDefined()
    })

    test('should setup memory thresholds', () => {
      expect(optimizer.memoryThresholds.warning).toBe(0.8)
      expect(optimizer.memoryThresholds.critical).toBe(0.9)
      expect(optimizer.memoryThresholds.cleanup).toBe(0.95)
    })
  })

  describe('Browser Compatibility', () => {
    test('should detect browser correctly', () => {
      const compatibility = optimizer.checkBrowserCompatibility()
      
      expect(compatibility.browser).toBe('Chrome')
      expect(compatibility.version).toBeGreaterThan(0)
      expect(compatibility.isSupported).toBe(true)
    })

    test('should check required features', () => {
      const compatibility = optimizer.checkBrowserCompatibility()
      
      expect(compatibility.features).toBeDefined()
      expect(Object.keys(compatibility.features).length).toBeGreaterThan(0)
    })

    test('should handle unsupported browser', () => {
      // Mock old browser
      global.navigator.userAgent = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1)'
      
      const compatibility = optimizer.checkBrowserCompatibility()
      
      expect(compatibility.isSupported).toBe(false)
      expect(compatibility.issues.length).toBeGreaterThan(0)
    })
  })

  describe('Memory Management', () => {
    test('should check memory usage', () => {
      const memoryInfo = optimizer.checkMemoryUsage()
      
      if (memoryInfo) {
        expect(memoryInfo.used).toBeDefined()
        expect(memoryInfo.total).toBeDefined()
        expect(memoryInfo.limit).toBeDefined()
        expect(memoryInfo.usagePercentage).toBeDefined()
      }
    })

    test('should handle high memory usage', () => {
      // Mock high memory usage
      global.performance.memory.usedJSHeapSize = 38000000 // 95% of limit
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      optimizer.checkMemoryUsage()
      
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Bundle Size Monitoring', () => {
    test('should monitor bundle size', async () => {
      await optimizer.setupBundleSizeMonitoring()
      
      expect(optimizer.performanceMetrics.bundleSize).toBeDefined()
      expect(optimizer.performanceMetrics.bundleSize).toBeGreaterThanOrEqual(0)
    })

    test('should warn about large bundle size', async () => {
      // Mock large bundle size
      global.performance.getEntriesByType = vi.fn(() => [
        { transferSize: 6 * 1024 * 1024 } // 6MB
      ])
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await optimizer.setupBundleSizeMonitoring()
      
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Lazy Loading', () => {
    test('should create lazy component', () => {
      const componentLoader = () => import('./TestComponent.vue')
      const lazyComponent = optimizer.createLazyComponent(componentLoader)
      
      expect(lazyComponent.component).toBe(componentLoader)
      expect(lazyComponent.loading).toBeDefined()
      expect(lazyComponent.error).toBeDefined()
      expect(lazyComponent.delay).toBe(200)
      expect(lazyComponent.timeout).toBe(10000)
    })

    test('should register lazy component', () => {
      const element = { dataset: {} }
      const loader = './TestComponent.vue'
      
      optimizer.registerLazyComponent(element, loader)
      
      expect(element.dataset.lazyLoader).toBe(loader)
    })
  })

  describe('Performance Metrics', () => {
    test('should record component load time', () => {
      const component = 'TestComponent.vue'
      const loadTime = 1500
      
      optimizer.recordComponentLoadTime(component, loadTime)
      
      expect(optimizer.performanceMetrics.componentLoadTimes.has(component)).toBe(true)
      
      const recorded = optimizer.performanceMetrics.componentLoadTimes.get(component)
      expect(recorded.loadTime).toBe(loadTime)
      expect(recorded.isError).toBe(false)
    })

    test('should warn about slow components', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      optimizer.recordComponentLoadTime('SlowComponent.vue', 6000) // 6 seconds
      
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('should generate performance report', () => {
      optimizer.recordComponentLoadTime('Component1.vue', 1000)
      optimizer.recordComponentLoadTime('Component2.vue', 2000)
      
      const report = optimizer.getPerformanceReport()
      
      expect(report.timestamp).toBeDefined()
      expect(report.bundleSize).toBeDefined()
      expect(report.components).toBeDefined()
      expect(report.browser).toBeDefined()
      expect(report.components.totalLoaded).toBe(2)
    })
  })

  describe('Optimization Strategies', () => {
    test('should optimize bundle size', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      optimizer.optimizeBundleSize()
      
      expect(optimizer.performanceMetrics.optimizationHistory.length).toBeGreaterThan(0)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('should perform warning optimization', () => {
      // Add some old metrics
      for (let i = 0; i < 60; i++) {
        optimizer.performanceMetrics.memoryUsage.push({
          used: 1000000,
          timestamp: Date.now() - (i * 60000)
        })
      }
      
      const initialLength = optimizer.performanceMetrics.memoryUsage.length
      
      optimizer.performWarningOptimization()
      
      expect(optimizer.performanceMetrics.memoryUsage.length).toBeLessThan(initialLength)
    })
  })

  describe('Utility Functions', () => {
    test('should format bytes correctly', () => {
      expect(optimizer.formatBytes(0)).toBe('0 Bytes')
      expect(optimizer.formatBytes(1024)).toBe('1 KB')
      expect(optimizer.formatBytes(1024 * 1024)).toBe('1 MB')
      expect(optimizer.formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
    })

    test('should calculate average memory usage', () => {
      optimizer.performanceMetrics.memoryUsage = [
        { used: 1000000 },
        { used: 2000000 },
        { used: 3000000 }
      ]
      
      const average = optimizer.calculateAverageMemoryUsage()
      expect(average).toBe(2000000)
    })

    test('should get slow components', () => {
      optimizer.recordComponentLoadTime('FastComponent.vue', 1000)
      optimizer.recordComponentLoadTime('SlowComponent.vue', 5000)
      
      const slowComponents = optimizer.getSlowComponents()
      
      expect(slowComponents.length).toBe(1)
      expect(slowComponents[0].component).toBe('SlowComponent.vue')
      expect(slowComponents[0].loadTime).toBe(5000)
    })
  })
})

describe('MemoryManager', () => {
  let memoryManager
  
  beforeEach(() => {
    memoryManager = new MemoryManager()
    memoryManager.initialize()
  })
  
  afterEach(() => {
    memoryManager.cleanup()
  })

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      const manager = new MemoryManager()
      manager.initialize()
      
      expect(manager.isMonitoring).toBe(true)
      expect(manager.memoryThresholds).toBeDefined()
      
      manager.cleanup()
    })

    test('should start monitoring', () => {
      expect(memoryManager.isMonitoring).toBe(true)
      expect(memoryManager.monitoringInterval).toBeDefined()
    })
  })

  describe('Memory Allocation', () => {
    test('should allocate memory', () => {
      const size = 1024 * 1024 // 1MB
      const id = memoryManager.allocateMemory(size, { type: 'test' })
      
      expect(id).toBeDefined()
      expect(memoryManager.activeAllocations.has(id)).toBe(true)
      
      const allocation = memoryManager.activeAllocations.get(id)
      expect(allocation.size).toBe(size)
      expect(allocation.type).toBe('test')
    })

    test('should release memory allocation', () => {
      const size = 1024 * 1024
      const id = memoryManager.allocateMemory(size)
      
      const released = memoryManager.releaseAllocation(id)
      
      expect(released).toBe(true)
      expect(memoryManager.activeAllocations.has(id)).toBe(false)
    })

    test('should handle allocation failure', () => {
      // Mock critical memory usage
      global.performance.memory.usedJSHeapSize = 39000000 // 97.5% of limit
      
      expect(() => {
        memoryManager.allocateMemory(10 * 1024 * 1024) // 10MB
      }).toThrow('Insufficient memory for allocation')
    })
  })

  describe('Memory Pools', () => {
    test('should create memory pool', () => {
      const poolName = 'testPool'
      const bufferSize = 1024
      const poolSize = 5
      
      const pool = memoryManager.createMemoryPool(poolName, bufferSize, poolSize)
      
      expect(pool.name).toBe(poolName)
      expect(pool.bufferSize).toBe(bufferSize)
      expect(pool.available.length).toBe(poolSize)
      expect(memoryManager.memoryPools.has(poolName)).toBe(true)
    })

    test('should get buffer from pool', () => {
      const poolName = 'testPool'
      memoryManager.createMemoryPool(poolName, 1024, 3)
      
      const buffer = memoryManager.getPoolBuffer(poolName)
      
      expect(buffer).toBeInstanceOf(ArrayBuffer)
      expect(buffer.byteLength).toBe(1024)
      
      const pool = memoryManager.memoryPools.get(poolName)
      expect(pool.available.length).toBe(2)
      expect(pool.inUse.size).toBe(1)
    })

    test('should return buffer to pool', () => {
      const poolName = 'testPool'
      memoryManager.createMemoryPool(poolName, 1024, 3)
      
      const buffer = memoryManager.getPoolBuffer(poolName)
      const returned = memoryManager.returnPoolBuffer(poolName, buffer)
      
      expect(returned).toBe(true)
      
      const pool = memoryManager.memoryPools.get(poolName)
      expect(pool.available.length).toBe(3)
      expect(pool.inUse.size).toBe(0)
    })
  })

  describe('Large PDF Processing', () => {
    test('should process large PDF with memory management', async () => {
      const pdfData = new ArrayBuffer(5 * 1024 * 1024) // 5MB
      
      const result = await memoryManager.processLargePDF(pdfData, {
        chunkSize: 1024 * 1024, // 1MB chunks
        maxConcurrent: 2
      })
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(5) // 5 chunks
    })

    test('should handle memory pressure during processing', async () => {
      // Mock high memory usage
      global.performance.memory.usedJSHeapSize = 36000000 // 90% of limit
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const pdfData = new ArrayBuffer(2 * 1024 * 1024) // 2MB
      const result = await memoryManager.processLargePDF(pdfData)
      
      expect(result).toBeDefined()
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('Memory Monitoring', () => {
    test('should check memory usage', () => {
      const status = memoryManager.checkMemoryUsage()
      
      if (status) {
        expect(status.used).toBeDefined()
        expect(status.total).toBeDefined()
        expect(status.limit).toBeDefined()
        expect(status.usageRatio).toBeDefined()
        expect(status.level).toBeDefined()
      }
    })

    test('should get memory level', () => {
      expect(memoryManager.getMemoryLevel(0.5)).toBe('normal')
      expect(memoryManager.getMemoryLevel(0.8)).toBe('warning')
      expect(memoryManager.getMemoryLevel(0.9)).toBe('critical')
      expect(memoryManager.getMemoryLevel(0.98)).toBe('emergency')
    })
  })

  describe('Cleanup Operations', () => {
    test('should perform light cleanup', () => {
      // Add old allocations
      const oldId = memoryManager.allocateMemory(1024, { canCleanup: true })
      const allocation = memoryManager.activeAllocations.get(oldId)
      allocation.timestamp = Date.now() - (10 * 60 * 1000) // 10 minutes ago
      
      const initialCount = memoryManager.activeAllocations.size
      
      memoryManager.performLightCleanup()
      
      expect(memoryManager.activeAllocations.size).toBeLessThan(initialCount)
    })

    test('should perform aggressive cleanup', () => {
      // Add cleanable allocations
      memoryManager.allocateMemory(1024, { canCleanup: true })
      memoryManager.allocateMemory(2048, { canCleanup: true })
      
      memoryManager.performAggressiveCleanup()
      
      expect(memoryManager.activeAllocations.size).toBe(0)
    })

    test('should register cleanup callback', () => {
      const callback = vi.fn()
      
      memoryManager.registerCleanupCallback(callback, 'light')
      
      expect(memoryManager.cleanupCallbacks.size).toBe(1)
      
      memoryManager.runCleanupCallbacks('light')
      
      expect(callback).toHaveBeenCalledWith('light')
    })
  })

  describe('Statistics', () => {
    test('should get memory statistics', () => {
      memoryManager.allocateMemory(1024)
      memoryManager.createMemoryPool('testPool', 512, 3)
      
      const stats = memoryManager.getMemoryStatistics()
      
      expect(stats.current).toBeDefined()
      expect(stats.allocations.active).toBe(1)
      expect(stats.pools.length).toBe(1)
      expect(stats.thresholds).toBeDefined()
      expect(stats.isMonitoring).toBe(true)
    })

    test('should format bytes correctly', () => {
      expect(memoryManager.formatBytes(0)).toBe('0 Bytes')
      expect(memoryManager.formatBytes(1024)).toBe('1 KB')
      expect(memoryManager.formatBytes(1048576)).toBe('1 MB')
    })
  })
})

describe('BrowserCompatibility', () => {
  let compatibility
  
  beforeEach(() => {
    compatibility = new BrowserCompatibility()
  })

  describe('Browser Detection', () => {
    test('should detect Chrome correctly', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      
      const browser = compatibility.detectBrowser()
      
      expect(browser.name).toBe('Chrome')
      expect(browser.version).toBe(91)
      expect(browser.key).toBe('chrome')
    })

    test('should detect Firefox correctly', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
      
      const browser = compatibility.detectBrowser()
      
      expect(browser.name).toBe('Firefox')
      expect(browser.version).toBe(89)
      expect(browser.key).toBe('firefox')
    })

    test('should detect Edge correctly', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
      
      const browser = compatibility.detectBrowser()
      
      expect(browser.name).toBe('Edge')
      expect(browser.version).toBe(91)
      expect(browser.key).toBe('edge')
    })
  })

  describe('Feature Support', () => {
    test('should check ES6 features', () => {
      expect(compatibility.checkES6Classes()).toBe(true)
      expect(compatibility.checkArrowFunctions()).toBe(true)
      expect(compatibility.checkTemplateLiterals()).toBe(true)
      expect(compatibility.checkDestructuring()).toBe(true)
      expect(compatibility.checkAsyncAwait()).toBe(true)
    })

    test('should check Canvas support', () => {
      const canvasSupport = compatibility.checkCanvasSupport()
      expect(typeof canvasSupport).toBe('boolean')
    })

    test('should check CSS support', () => {
      expect(compatibility.checkCSSGrid()).toBe(true)
      expect(compatibility.checkCSSFlexbox()).toBe(true)
      expect(compatibility.checkCSSCustomProperties()).toBe(true)
    })
  })

  describe('Compatibility Checking', () => {
    test('should check overall compatibility', async () => {
      const report = await compatibility.checkCompatibility()
      
      expect(report.timestamp).toBeDefined()
      expect(report.browser).toBeDefined()
      expect(report.features).toBeDefined()
      expect(report.css).toBeDefined()
      expect(report.overall).toBeDefined()
      expect(report.overall.isSupported).toBeDefined()
    })

    test('should identify unsupported browser', async () => {
      global.navigator.userAgent = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)'
      
      const report = await compatibility.checkCompatibility()
      
      expect(report.overall.isSupported).toBe(false)
      expect(report.overall.issues.length).toBeGreaterThan(0)
    })
  })

  describe('Polyfill Loading', () => {
    test('should identify polyfills needed', async () => {
      // Mock missing features
      compatibility.compatibilityReport = {
        features: {
          'Fetch API': false,
          'Promises': false,
          'IndexedDB': true
        }
      }
      
      const result = await compatibility.loadPolyfills()
      
      expect(result.loaded).toBeDefined()
      expect(result.failed).toBeDefined()
    })

    test('should load individual polyfill', async () => {
      const feature = 'Test Feature'
      const url = 'https://example.com/polyfill.js'
      
      // Mock successful script loading
      global.document.createElement = vi.fn(() => ({
        addEventListener: vi.fn(),
        set src(value) {
          // Simulate successful load
          setTimeout(() => this.onload(), 0)
        },
        onload: null,
        onerror: null
      }))
      
      const result = await compatibility.loadPolyfill(feature, url)
      expect(result).toBe(feature)
    })
  })

  describe('CSS Fallbacks', () => {
    test('should apply CSS fallbacks', () => {
      const mockStyle = { textContent: '' }
      global.document.createElement = vi.fn(() => mockStyle)
      
      compatibility.applyCSSFallbacks()
      
      // Should create style element
      expect(global.document.createElement).toHaveBeenCalledWith('style')
    })
  })

  describe('User Warnings', () => {
    test('should show compatibility warning for unsupported browser', () => {
      const mockDiv = {
        style: { cssText: '' },
        innerHTML: '',
        id: ''
      }
      
      global.document.createElement = vi.fn(() => mockDiv)
      global.document.body = { insertBefore: vi.fn() }
      
      const report = {
        browser: { name: 'IE', version: 8 },
        overall: {
          isSupported: false,
          issues: ['Browser too old'],
          warnings: []
        }
      }
      
      compatibility.showCompatibilityWarning(report)
      
      expect(global.document.createElement).toHaveBeenCalledWith('div')
      expect(global.document.body.insertBefore).toHaveBeenCalled()
    })
  })

  describe('Recommendations', () => {
    test('should provide browser recommendations', () => {
      compatibility.compatibilityReport = {
        browser: { name: 'Chrome', version: 70, key: 'chrome' },
        features: {
          'Fetch API': false,
          'Promises': true,
          'IndexedDB': true
        }
      }
      
      const recommendations = compatibility.getBrowserRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].type).toBe('update')
      expect(recommendations[0].priority).toBe('high')
    })
  })
})

describe('Integration Tests', () => {
  test('should integrate performance optimizer with memory manager', async () => {
    const optimizer = await initializePerformanceOptimizer()
    const memoryManager = initializeMemoryManager()
    
    expect(optimizer.isInitialized).toBe(true)
    expect(memoryManager.isMonitoring).toBe(true)
    
    optimizer.destroy()
    memoryManager.cleanup()
  })

  test('should integrate browser compatibility with performance optimizer', async () => {
    const compatibility = await initializeBrowserCompatibility()
    const optimizer = await initializePerformanceOptimizer()
    
    expect(compatibility.browser).toBeDefined()
    expect(optimizer.isInitialized).toBe(true)
    
    optimizer.destroy()
  })

  test('should handle large PDF processing with all systems', async () => {
    const optimizer = await initializePerformanceOptimizer()
    const memoryManager = initializeMemoryManager()
    
    const pdfData = new ArrayBuffer(1024 * 1024) // 1MB
    
    const result = await processLargePDFWithMemoryManagement(pdfData, {
      chunkSize: 256 * 1024, // 256KB chunks
      maxConcurrent: 2
    })
    
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    
    optimizer.destroy()
    memoryManager.cleanup()
  })

  test('should maintain singleton instances', () => {
    const optimizer1 = getPerformanceOptimizer()
    const optimizer2 = getPerformanceOptimizer()
    const memoryManager1 = getMemoryManager()
    const memoryManager2 = getMemoryManager()
    const compatibility1 = getBrowserCompatibility()
    const compatibility2 = getBrowserCompatibility()
    
    expect(optimizer1).toBe(optimizer2)
    expect(memoryManager1).toBe(memoryManager2)
    expect(compatibility1).toBe(compatibility2)
  })
})