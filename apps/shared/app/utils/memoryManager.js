/**
 * Memory Manager
 * Handles memory management for large PDF processing and AI operations
 */

export class MemoryManager {
  constructor() {
    this.memoryPools = new Map()
    this.activeAllocations = new Map()
    this.memoryThresholds = {
      warning: 0.7,    // 70% of available memory
      critical: 0.85,  // 85% of available memory
      emergency: 0.95  // 95% of available memory
    }
    this.cleanupCallbacks = new Set()
    this.isMonitoring = false
    this.monitoringInterval = null
  }

  /**
   * Initialize memory manager
   */
  initialize(options = {}) {
    this.memoryThresholds = { ...this.memoryThresholds, ...options.thresholds }
    
    // Start memory monitoring
    this.startMonitoring(options.monitoringInterval || 10000) // 10 seconds
    
    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })
    
    console.log('Memory manager initialized')
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(interval = 10000) {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage()
    }, interval)
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
  }

  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    if (!('memory' in performance)) {
      return null
    }

    const memory = performance.memory
    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit
    
    const status = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usageRatio: usageRatio,
      level: this.getMemoryLevel(usageRatio),
      timestamp: Date.now()
    }

    // Take action based on memory level
    if (usageRatio >= this.memoryThresholds.emergency) {
      this.handleEmergencyMemory(status)
    } else if (usageRatio >= this.memoryThresholds.critical) {
      this.handleCriticalMemory(status)
    } else if (usageRatio >= this.memoryThresholds.warning) {
      this.handleWarningMemory(status)
    }

    return status
  }

  /**
   * Get memory level based on usage ratio
   */
  getMemoryLevel(usageRatio) {
    if (usageRatio >= this.memoryThresholds.emergency) return 'emergency'
    if (usageRatio >= this.memoryThresholds.critical) return 'critical'
    if (usageRatio >= this.memoryThresholds.warning) return 'warning'
    return 'normal'
  }

  /**
   * Handle warning level memory usage
   */
  handleWarningMemory(status) {
    console.warn('Memory usage is high:', this.formatBytes(status.used))
    
    // Perform light cleanup
    this.performLightCleanup()
    
    // Notify listeners
    this.notifyMemoryLevel('warning', status)
  }

  /**
   * Handle critical level memory usage
   */
  handleCriticalMemory(status) {
    console.error('Memory usage is critical:', this.formatBytes(status.used))
    
    // Perform aggressive cleanup
    this.performAggressiveCleanup()
    
    // Notify listeners
    this.notifyMemoryLevel('critical', status)
  }

  /**
   * Handle emergency level memory usage
   */
  handleEmergencyMemory(status) {
    console.error('Memory usage is at emergency level:', this.formatBytes(status.used))
    
    // Perform emergency cleanup
    this.performEmergencyCleanup()
    
    // Notify listeners
    this.notifyMemoryLevel('emergency', status)
  }

  /**
   * Perform light cleanup
   */
  performLightCleanup() {
    // Clear old allocations
    const cutoffTime = Date.now() - (5 * 60 * 1000) // 5 minutes
    
    for (const [id, allocation] of this.activeAllocations.entries()) {
      if (allocation.timestamp < cutoffTime && allocation.canCleanup) {
        this.releaseAllocation(id)
      }
    }
    
    // Run cleanup callbacks
    this.runCleanupCallbacks('light')
  }

  /**
   * Perform aggressive cleanup
   */
  performAggressiveCleanup() {
    // Clear all cleanable allocations
    const toRelease = []
    
    for (const [id, allocation] of this.activeAllocations.entries()) {
      if (allocation.canCleanup) {
        toRelease.push(id)
      }
    }
    
    toRelease.forEach(id => this.releaseAllocation(id))
    
    // Clear memory pools
    this.clearMemoryPools()
    
    // Run cleanup callbacks
    this.runCleanupCallbacks('aggressive')
    
    // Force garbage collection if available
    this.forceGarbageCollection()
  }

  /**
   * Perform emergency cleanup
   */
  performEmergencyCleanup() {
    // Release all allocations
    const allIds = Array.from(this.activeAllocations.keys())
    allIds.forEach(id => this.releaseAllocation(id))
    
    // Clear all memory pools
    this.clearMemoryPools()
    
    // Run all cleanup callbacks
    this.runCleanupCallbacks('emergency')
    
    // Clear browser caches
    this.clearBrowserCaches()
    
    // Force multiple garbage collections
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.forceGarbageCollection(), i * 100)
    }
  }

  /**
   * Allocate memory for large operations
   */
  allocateMemory(size, options = {}) {
    const id = this.generateAllocationId()
    const allocation = {
      id: id,
      size: size,
      timestamp: Date.now(),
      canCleanup: options.canCleanup !== false,
      type: options.type || 'general',
      data: null,
      metadata: options.metadata || {}
    }

    // Check if allocation would exceed memory limits
    const currentMemory = this.checkMemoryUsage()
    if (currentMemory && currentMemory.usageRatio > this.memoryThresholds.warning) {
      // Try to free up memory first
      this.performLightCleanup()
      
      // Check again
      const newMemory = this.checkMemoryUsage()
      if (newMemory && newMemory.usageRatio > this.memoryThresholds.critical) {
        throw new Error('Insufficient memory for allocation')
      }
    }

    this.activeAllocations.set(id, allocation)
    
    console.log(`Allocated memory: ${this.formatBytes(size)} (ID: ${id})`)
    
    return id
  }

  /**
   * Release memory allocation
   */
  releaseAllocation(id) {
    const allocation = this.activeAllocations.get(id)
    if (!allocation) {
      console.warn(`Allocation ${id} not found`)
      return false
    }

    // Clear data if it exists
    if (allocation.data) {
      if (Array.isArray(allocation.data)) {
        allocation.data.length = 0
      } else if (typeof allocation.data === 'object') {
        Object.keys(allocation.data).forEach(key => {
          delete allocation.data[key]
        })
      }
      allocation.data = null
    }

    this.activeAllocations.delete(id)
    
    console.log(`Released memory allocation: ${id}`)
    
    return true
  }

  /**
   * Create memory pool for reusable buffers
   */
  createMemoryPool(name, bufferSize, poolSize = 10) {
    const pool = {
      name: name,
      bufferSize: bufferSize,
      poolSize: poolSize,
      available: [],
      inUse: new Set(),
      created: 0
    }

    // Pre-allocate buffers
    for (let i = 0; i < poolSize; i++) {
      const buffer = new ArrayBuffer(bufferSize)
      pool.available.push(buffer)
      pool.created++
    }

    this.memoryPools.set(name, pool)
    
    console.log(`Created memory pool: ${name} (${poolSize} buffers of ${this.formatBytes(bufferSize)})`)
    
    return pool
  }

  /**
   * Get buffer from memory pool
   */
  getPoolBuffer(poolName) {
    const pool = this.memoryPools.get(poolName)
    if (!pool) {
      throw new Error(`Memory pool ${poolName} not found`)
    }

    let buffer = pool.available.pop()
    
    if (!buffer) {
      // Create new buffer if pool is empty
      if (pool.created < pool.poolSize * 2) { // Allow up to 2x pool size
        buffer = new ArrayBuffer(pool.bufferSize)
        pool.created++
        console.log(`Created additional buffer for pool: ${poolName}`)
      } else {
        throw new Error(`Memory pool ${poolName} exhausted`)
      }
    }

    pool.inUse.add(buffer)
    return buffer
  }

  /**
   * Return buffer to memory pool
   */
  returnPoolBuffer(poolName, buffer) {
    const pool = this.memoryPools.get(poolName)
    if (!pool) {
      console.warn(`Memory pool ${poolName} not found`)
      return false
    }

    if (!pool.inUse.has(buffer)) {
      console.warn(`Buffer not from pool ${poolName}`)
      return false
    }

    pool.inUse.delete(buffer)
    
    // Clear buffer data
    const view = new Uint8Array(buffer)
    view.fill(0)
    
    pool.available.push(buffer)
    
    return true
  }

  /**
   * Clear memory pools
   */
  clearMemoryPools() {
    for (const [name, pool] of this.memoryPools.entries()) {
      pool.available.length = 0
      pool.inUse.clear()
      pool.created = 0
      console.log(`Cleared memory pool: ${name}`)
    }
  }

  /**
   * Process large PDF with memory management
   */
  async processLargePDF(pdfData, options = {}) {
    const chunkSize = options.chunkSize || 1024 * 1024 // 1MB chunks
    const maxConcurrent = options.maxConcurrent || 2
    
    // Allocate memory for processing
    const allocationId = this.allocateMemory(pdfData.byteLength, {
      type: 'pdf_processing',
      canCleanup: true,
      metadata: { originalSize: pdfData.byteLength }
    })

    try {
      // Create memory pool for chunks
      const poolName = `pdf_chunks_${Date.now()}`
      this.createMemoryPool(poolName, chunkSize, maxConcurrent * 2)

      const chunks = []
      const totalChunks = Math.ceil(pdfData.byteLength / chunkSize)
      
      // Process chunks with memory management
      for (let i = 0; i < totalChunks; i += maxConcurrent) {
        const chunkPromises = []
        
        for (let j = 0; j < maxConcurrent && (i + j) < totalChunks; j++) {
          const chunkIndex = i + j
          const start = chunkIndex * chunkSize
          const end = Math.min(start + chunkSize, pdfData.byteLength)
          
          chunkPromises.push(this.processChunk(pdfData.slice(start, end), poolName))
        }
        
        const chunkResults = await Promise.all(chunkPromises)
        chunks.push(...chunkResults)
        
        // Check memory usage after each batch
        const memoryStatus = this.checkMemoryUsage()
        if (memoryStatus && memoryStatus.level !== 'normal') {
          console.warn(`Memory level: ${memoryStatus.level} during PDF processing`)
          
          if (memoryStatus.level === 'critical' || memoryStatus.level === 'emergency') {
            // Pause processing to allow cleanup
            await this.waitForMemoryRecovery()
          }
        }
      }

      // Cleanup memory pool
      this.memoryPools.delete(poolName)
      
      return chunks

    } finally {
      // Always release allocation
      this.releaseAllocation(allocationId)
    }
  }

  /**
   * Process individual chunk
   */
  async processChunk(chunkData, poolName) {
    const buffer = this.getPoolBuffer(poolName)
    
    try {
      // Copy chunk data to pool buffer
      const chunkView = new Uint8Array(chunkData)
      const bufferView = new Uint8Array(buffer, 0, chunkData.byteLength)
      bufferView.set(chunkView)
      
      // Process the chunk (placeholder for actual processing)
      const result = await this.performChunkProcessing(bufferView)
      
      return result

    } finally {
      // Always return buffer to pool
      this.returnPoolBuffer(poolName, buffer)
    }
  }

  /**
   * Perform chunk processing (placeholder)
   */
  async performChunkProcessing(chunkView) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Return processed result
    return {
      size: chunkView.length,
      checksum: this.calculateChecksum(chunkView)
    }
  }

  /**
   * Calculate simple checksum
   */
  calculateChecksum(data) {
    let checksum = 0
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data[i]) % 256
    }
    return checksum
  }

  /**
   * Wait for memory recovery
   */
  async waitForMemoryRecovery(maxWaitTime = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      const memoryStatus = this.checkMemoryUsage()
      
      if (!memoryStatus || memoryStatus.level === 'normal' || memoryStatus.level === 'warning') {
        console.log('Memory recovered, resuming processing')
        return true
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.warn('Memory did not recover within timeout')
    return false
  }

  /**
   * Register cleanup callback
   */
  registerCleanupCallback(callback, priority = 'normal') {
    this.cleanupCallbacks.add({ callback, priority })
  }

  /**
   * Unregister cleanup callback
   */
  unregisterCleanupCallback(callback) {
    for (const item of this.cleanupCallbacks) {
      if (item.callback === callback) {
        this.cleanupCallbacks.delete(item)
        break
      }
    }
  }

  /**
   * Run cleanup callbacks
   */
  runCleanupCallbacks(level) {
    const callbacks = Array.from(this.cleanupCallbacks)
    
    // Sort by priority
    callbacks.sort((a, b) => {
      const priorities = { emergency: 3, aggressive: 2, light: 1, normal: 0 }
      return priorities[b.priority] - priorities[a.priority]
    })
    
    callbacks.forEach(({ callback, priority }) => {
      try {
        if (priority === level || level === 'emergency') {
          callback(level)
        }
      } catch (error) {
        console.error('Cleanup callback error:', error)
      }
    })
  }

  /**
   * Notify memory level change
   */
  notifyMemoryLevel(level, status) {
    const event = new CustomEvent('memoryLevelChange', {
      detail: { level, status }
    })
    window.dispatchEvent(event)
  }

  /**
   * Force garbage collection
   */
  forceGarbageCollection() {
    if ('gc' in window) {
      window.gc()
      console.log('Forced garbage collection')
    } else {
      // Fallback: create and release large objects to trigger GC
      const largeArray = new Array(1000000).fill(0)
      largeArray.length = 0
    }
  }

  /**
   * Clear browser caches
   */
  async clearBrowserCaches() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('Cleared browser caches')
      } catch (error) {
        console.error('Failed to clear browser caches:', error)
      }
    }
  }

  /**
   * Generate allocation ID
   */
  generateAllocationId() {
    return `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
   * Get memory statistics
   */
  getMemoryStatistics() {
    const currentMemory = this.checkMemoryUsage()
    
    return {
      current: currentMemory,
      allocations: {
        active: this.activeAllocations.size,
        totalSize: Array.from(this.activeAllocations.values())
          .reduce((sum, alloc) => sum + alloc.size, 0)
      },
      pools: Array.from(this.memoryPools.entries()).map(([name, pool]) => ({
        name: name,
        bufferSize: pool.bufferSize,
        available: pool.available.length,
        inUse: pool.inUse.size,
        created: pool.created
      })),
      thresholds: this.memoryThresholds,
      isMonitoring: this.isMonitoring
    }
  }

  /**
   * Cleanup and destroy
   */
  cleanup() {
    // Stop monitoring
    this.stopMonitoring()
    
    // Release all allocations
    const allIds = Array.from(this.activeAllocations.keys())
    allIds.forEach(id => this.releaseAllocation(id))
    
    // Clear memory pools
    this.clearMemoryPools()
    
    // Clear cleanup callbacks
    this.cleanupCallbacks.clear()
    
    console.log('Memory manager cleaned up')
  }
}

// Create singleton instance
let memoryManagerInstance = null

/**
 * Get memory manager singleton
 */
export function getMemoryManager() {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager()
  }
  return memoryManagerInstance
}

/**
 * Initialize memory manager
 */
export function initializeMemoryManager(options = {}) {
  const manager = getMemoryManager()
  manager.initialize(options)
  return manager
}

/**
 * Process large PDF with memory management
 */
export async function processLargePDFWithMemoryManagement(pdfData, options = {}) {
  const manager = getMemoryManager()
  return await manager.processLargePDF(pdfData, options)
}

/**
 * Check current memory usage
 */
export function checkMemoryUsage() {
  const manager = getMemoryManager()
  return manager.checkMemoryUsage()
}

/**
 * Get memory statistics
 */
export function getMemoryStatistics() {
  const manager = getMemoryManager()
  return manager.getMemoryStatistics()
}