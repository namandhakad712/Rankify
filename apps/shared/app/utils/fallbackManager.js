/**
 * Fallback Manager for Alternative Processing Methods
 * Provides fallback strategies when primary methods fail
 */

export class FallbackManager {
  constructor() {
    this.fallbackStrategies = this.initializeFallbackStrategies()
    this.fallbackHistory = []
    this.availabilityCache = new Map()
    this.performanceMetrics = new Map()
    this.isInitialized = false
  }

  /**
   * Initialize fallback strategies for different operations
   */
  initializeFallbackStrategies() {
    return {
      pdfExtraction: {
        primary: 'gemini-vision-api',
        fallbacks: [
          {
            method: 'pdf-parse-library',
            description: 'Use PDF parsing library for text extraction',
            availability: this.checkPDFParseAvailability.bind(this),
            implementation: this.extractWithPDFParse.bind(this),
            confidence: 0.8,
            speed: 'fast'
          },
          {
            method: 'canvas-ocr',
            description: 'Convert PDF to canvas and use OCR',
            availability: this.checkCanvasOCRAvailability.bind(this),
            implementation: this.extractWithCanvasOCR.bind(this),
            confidence: 0.6,
            speed: 'medium'
          },
          {
            method: 'rule-based-extraction',
            description: 'Use pattern matching and rules',
            availability: () => Promise.resolve(true),
            implementation: this.extractWithRules.bind(this),
            confidence: 0.4,
            speed: 'fast'
          },
          {
            method: 'manual-extraction',
            description: 'Request manual user input',
            availability: () => Promise.resolve(true),
            implementation: this.requestManualExtraction.bind(this),
            confidence: 1.0,
            speed: 'slow'
          }
        ]
      },

      aiProcessing: {
        primary: 'gemini-pro',
        fallbacks: [
          {
            method: 'gemini-flash',
            description: 'Use faster Gemini model with lower accuracy',
            availability: this.checkGeminiFlashAvailability.bind(this),
            implementation: this.processWithGeminiFlash.bind(this),
            confidence: 0.7,
            speed: 'fast'
          },
          {
            method: 'local-nlp',
            description: 'Use local NLP processing',
            availability: this.checkLocalNLPAvailability.bind(this),
            implementation: this.processWithLocalNLP.bind(this),
            confidence: 0.5,
            speed: 'medium'
          },
          {
            method: 'template-matching',
            description: 'Use predefined templates and patterns',
            availability: () => Promise.resolve(true),
            implementation: this.processWithTemplates.bind(this),
            confidence: 0.3,
            speed: 'fast'
          }
        ]
      },

      storage: {
        primary: 'indexeddb',
        fallbacks: [
          {
            method: 'localstorage',
            description: 'Use localStorage for data persistence',
            availability: this.checkLocalStorageAvailability.bind(this),
            implementation: this.storeInLocalStorage.bind(this),
            confidence: 0.8,
            speed: 'fast'
          },
          {
            method: 'sessionstorage',
            description: 'Use sessionStorage for temporary storage',
            availability: this.checkSessionStorageAvailability.bind(this),
            implementation: this.storeInSessionStorage.bind(this),
            confidence: 0.6,
            speed: 'fast'
          },
          {
            method: 'memory-storage',
            description: 'Use in-memory storage (temporary)',
            availability: () => Promise.resolve(true),
            implementation: this.storeInMemory.bind(this),
            confidence: 0.4,
            speed: 'fast'
          }
        ]
      },

      network: {
        primary: 'fetch-api',
        fallbacks: [
          {
            method: 'xhr',
            description: 'Use XMLHttpRequest for network calls',
            availability: this.checkXHRAvailability.bind(this),
            implementation: this.requestWithXHR.bind(this),
            confidence: 0.9,
            speed: 'medium'
          },
          {
            method: 'jsonp',
            description: 'Use JSONP for cross-origin requests',
            availability: this.checkJSONPAvailability.bind(this),
            implementation: this.requestWithJSONP.bind(this),
            confidence: 0.5,
            speed: 'slow'
          },
          {
            method: 'offline-mode',
            description: 'Switch to offline processing',
            availability: () => Promise.resolve(true),
            implementation: this.switchToOfflineMode.bind(this),
            confidence: 0.7,
            speed: 'fast'
          }
        ]
      },

      validation: {
        primary: 'comprehensive-validation',
        fallbacks: [
          {
            method: 'basic-validation',
            description: 'Use basic validation rules',
            availability: () => Promise.resolve(true),
            implementation: this.validateBasic.bind(this),
            confidence: 0.6,
            speed: 'fast'
          },
          {
            method: 'schema-validation',
            description: 'Use JSON schema validation only',
            availability: this.checkSchemaValidationAvailability.bind(this),
            implementation: this.validateSchema.bind(this),
            confidence: 0.8,
            speed: 'medium'
          },
          {
            method: 'no-validation',
            description: 'Skip validation (not recommended)',
            availability: () => Promise.resolve(true),
            implementation: this.skipValidation.bind(this),
            confidence: 0.1,
            speed: 'fast'
          }
        ]
      }
    }
  }

  /**
   * Initialize fallback manager
   */
  async initialize(options = {}) {
    try {
      // Check availability of all fallback methods
      await this.checkAllAvailability()
      
      // Initialize performance tracking
      this.initializePerformanceTracking()
      
      // Setup periodic availability checks
      this.setupPeriodicChecks()
      
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize FallbackManager:', error)
      return false
    }
  }

  /**
   * Execute operation with fallback support
   * @param {string} operationType - Type of operation
   * @param {Function} primaryOperation - Primary operation to try
   * @param {Object} context - Operation context
   * @param {Object} options - Fallback options
   * @returns {Promise<Object>} Operation result with fallback info
   */
  async executeWithFallback(operationType, primaryOperation, context = {}, options = {}) {
    if (!this.isInitialized) {
      throw new Error('FallbackManager not initialized')
    }

    const strategy = this.fallbackStrategies[operationType]
    if (!strategy) {
      throw new Error(`No fallback strategy defined for operation type: ${operationType}`)
    }

    const executionId = this.generateExecutionId()
    const startTime = Date.now()
    
    const executionContext = {
      id: executionId,
      operationType: operationType,
      startTime: startTime,
      attempts: [],
      context: context,
      options: options
    }

    try {
      // Try primary method first
      const primaryResult = await this.tryPrimaryMethod(
        primaryOperation, 
        strategy.primary, 
        executionContext
      )
      
      this.recordSuccess(executionContext, strategy.primary, primaryResult)
      return {
        success: true,
        result: primaryResult,
        method: strategy.primary,
        fallbackUsed: false,
        executionTime: Date.now() - startTime
      }
    } catch (primaryError) {
      this.recordFailure(executionContext, strategy.primary, primaryError)
      
      // Try fallback methods
      return await this.tryFallbackMethods(executionContext, strategy, primaryError)
    }
  }

  /**
   * Try primary method
   */
  async tryPrimaryMethod(operation, methodName, executionContext) {
    const startTime = Date.now()
    
    try {
      const result = await operation(executionContext.context)
      
      executionContext.attempts.push({
        method: methodName,
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      })
      
      return result
    } catch (error) {
      executionContext.attempts.push({
        method: methodName,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      })
      
      throw error
    }
  }

  /**
   * Try fallback methods in order
   */
  async tryFallbackMethods(executionContext, strategy, primaryError) {
    const availableFallbacks = await this.getAvailableFallbacks(strategy.fallbacks)
    
    if (availableFallbacks.length === 0) {
      throw new Error(`Primary method failed and no fallbacks available: ${primaryError.message}`)
    }

    // Sort fallbacks by confidence and speed
    const sortedFallbacks = this.sortFallbacksByPriority(availableFallbacks, executionContext.options)
    
    let lastError = primaryError
    
    for (const fallback of sortedFallbacks) {
      try {
        const fallbackResult = await this.tryFallbackMethod(fallback, executionContext)
        
        this.recordSuccess(executionContext, fallback.method, fallbackResult)
        
        return {
          success: true,
          result: fallbackResult,
          method: fallback.method,
          fallbackUsed: true,
          primaryError: primaryError.message,
          executionTime: Date.now() - executionContext.startTime,
          confidence: fallback.confidence
        }
      } catch (fallbackError) {
        this.recordFailure(executionContext, fallback.method, fallbackError)
        lastError = fallbackError
        
        // Continue to next fallback
        continue
      }
    }

    // All methods failed
    throw new Error(`All methods failed. Last error: ${lastError.message}`)
  }

  /**
   * Try individual fallback method
   */
  async tryFallbackMethod(fallback, executionContext) {
    const startTime = Date.now()
    
    try {
      const result = await fallback.implementation(executionContext.context, executionContext.options)
      
      executionContext.attempts.push({
        method: fallback.method,
        success: true,
        duration: Date.now() - startTime,
        confidence: fallback.confidence,
        timestamp: Date.now()
      })
      
      return result
    } catch (error) {
      executionContext.attempts.push({
        method: fallback.method,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      })
      
      throw error
    }
  }

  /**
   * Get available fallback methods
   */
  async getAvailableFallbacks(fallbacks) {
    const available = []
    
    for (const fallback of fallbacks) {
      try {
        const isAvailable = await this.checkMethodAvailability(fallback)
        if (isAvailable) {
          available.push(fallback)
        }
      } catch (error) {
        console.warn(`Failed to check availability for ${fallback.method}:`, error)
      }
    }
    
    return available
  }

  /**
   * Check method availability with caching
   */
  async checkMethodAvailability(fallback) {
    const cacheKey = fallback.method
    const cached = this.availabilityCache.get(cacheKey)
    
    // Use cached result if recent (5 minutes)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.available
    }
    
    try {
      const available = await fallback.availability()
      this.availabilityCache.set(cacheKey, {
        available: available,
        timestamp: Date.now()
      })
      return available
    } catch (error) {
      this.availabilityCache.set(cacheKey, {
        available: false,
        timestamp: Date.now()
      })
      return false
    }
  }

  /**
   * Sort fallbacks by priority (confidence and speed)
   */
  sortFallbacksByPriority(fallbacks, options = {}) {
    const prioritizeSpeed = options.prioritizeSpeed || false
    const prioritizeConfidence = options.prioritizeConfidence || true
    
    return fallbacks.sort((a, b) => {
      if (prioritizeConfidence && !prioritizeSpeed) {
        return b.confidence - a.confidence
      }
      
      if (prioritizeSpeed && !prioritizeConfidence) {
        const speedOrder = { 'fast': 3, 'medium': 2, 'slow': 1 }
        return speedOrder[b.speed] - speedOrder[a.speed]
      }
      
      // Balance confidence and speed
      const aScore = a.confidence * 0.7 + (speedOrder[a.speed] / 3) * 0.3
      const bScore = b.confidence * 0.7 + (speedOrder[b.speed] / 3) * 0.3
      return bScore - aScore
    })
  }

  /**
   * Check availability of all methods
   */
  async checkAllAvailability() {
    for (const [operationType, strategy] of Object.entries(this.fallbackStrategies)) {
      for (const fallback of strategy.fallbacks) {
        await this.checkMethodAvailability(fallback)
      }
    }
  }

  /**
   * Setup periodic availability checks
   */
  setupPeriodicChecks() {
    // Check availability every 10 minutes
    setInterval(async () => {
      await this.checkAllAvailability()
    }, 10 * 60 * 1000)
  }

  /**
   * Initialize performance tracking
   */
  initializePerformanceTracking() {
    // Track performance metrics for each method
    Object.keys(this.fallbackStrategies).forEach(operationType => {
      this.performanceMetrics.set(operationType, {
        primarySuccess: 0,
        primaryFailure: 0,
        fallbackUsage: {},
        averageExecutionTime: {}
      })
    })
  }

  /**
   * Record successful execution
   */
  recordSuccess(executionContext, method, result) {
    const record = {
      id: executionContext.id,
      operationType: executionContext.operationType,
      method: method,
      success: true,
      executionTime: Date.now() - executionContext.startTime,
      attempts: executionContext.attempts,
      timestamp: Date.now()
    }

    this.fallbackHistory.push(record)
    this.updatePerformanceMetrics(executionContext.operationType, method, true, record.executionTime)
    this.limitHistorySize()
  }

  /**
   * Record failed execution
   */
  recordFailure(executionContext, method, error) {
    const record = {
      id: executionContext.id,
      operationType: executionContext.operationType,
      method: method,
      success: false,
      error: error.message,
      executionTime: Date.now() - executionContext.startTime,
      attempts: executionContext.attempts,
      timestamp: Date.now()
    }

    this.fallbackHistory.push(record)
    this.updatePerformanceMetrics(executionContext.operationType, method, false, record.executionTime)
    this.limitHistorySize()
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(operationType, method, success, executionTime) {
    const metrics = this.performanceMetrics.get(operationType)
    if (!metrics) return

    if (method === this.fallbackStrategies[operationType].primary) {
      if (success) {
        metrics.primarySuccess++
      } else {
        metrics.primaryFailure++
      }
    } else {
      if (!metrics.fallbackUsage[method]) {
        metrics.fallbackUsage[method] = { success: 0, failure: 0 }
      }
      
      if (success) {
        metrics.fallbackUsage[method].success++
      } else {
        metrics.fallbackUsage[method].failure++
      }
    }

    // Update average execution time
    if (!metrics.averageExecutionTime[method]) {
      metrics.averageExecutionTime[method] = { total: 0, count: 0, average: 0 }
    }
    
    const timeMetric = metrics.averageExecutionTime[method]
    timeMetric.total += executionTime
    timeMetric.count++
    timeMetric.average = timeMetric.total / timeMetric.count
  }

  /**
   * Limit history size
   */
  limitHistorySize() {
    if (this.fallbackHistory.length > 1000) {
      this.fallbackHistory = this.fallbackHistory.slice(-500)
    }
  }

  /**
   * Get fallback statistics
   */
  getFallbackStatistics() {
    const stats = {
      totalExecutions: this.fallbackHistory.length,
      successfulExecutions: this.fallbackHistory.filter(r => r.success).length,
      fallbackUsageRate: 0,
      operationTypeStats: {},
      methodPerformance: {},
      availabilityStatus: {}
    }

    // Calculate fallback usage rate
    const fallbackExecutions = this.fallbackHistory.filter(r => 
      r.method !== this.fallbackStrategies[r.operationType]?.primary
    ).length
    
    stats.fallbackUsageRate = this.fallbackHistory.length > 0 ? 
      (fallbackExecutions / this.fallbackHistory.length) * 100 : 0

    // Stats by operation type
    Object.keys(this.fallbackStrategies).forEach(operationType => {
      const typeRecords = this.fallbackHistory.filter(r => r.operationType === operationType)
      const metrics = this.performanceMetrics.get(operationType)
      
      stats.operationTypeStats[operationType] = {
        totalExecutions: typeRecords.length,
        successfulExecutions: typeRecords.filter(r => r.success).length,
        primarySuccessRate: metrics ? 
          (metrics.primarySuccess / (metrics.primarySuccess + metrics.primaryFailure)) * 100 : 0,
        fallbackUsage: metrics ? metrics.fallbackUsage : {}
      }
    })

    // Method performance
    this.performanceMetrics.forEach((metrics, operationType) => {
      stats.methodPerformance[operationType] = metrics.averageExecutionTime
    })

    // Availability status
    this.availabilityCache.forEach((status, method) => {
      stats.availabilityStatus[method] = {
        available: status.available,
        lastChecked: status.timestamp
      }
    })

    return stats
  }

  /**
   * Generate execution ID
   */
  generateExecutionId() {
    return 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // Availability check methods
  async checkPDFParseAvailability() {
    return typeof window !== 'undefined' && 'FileReader' in window
  }

  async checkCanvasOCRAvailability() {
    return typeof window !== 'undefined' && 'HTMLCanvasElement' in window
  }

  async checkGeminiFlashAvailability() {
    // Check if API key is available and service is accessible
    return true // Placeholder
  }

  async checkLocalNLPAvailability() {
    return typeof window !== 'undefined' && 'Worker' in window
  }

  async checkLocalStorageAvailability() {
    try {
      const test = 'test'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch (e) {
      return false
    }
  }

  async checkSessionStorageAvailability() {
    try {
      const test = 'test'
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      return true
    } catch (e) {
      return false
    }
  }

  async checkXHRAvailability() {
    return typeof XMLHttpRequest !== 'undefined'
  }

  async checkJSONPAvailability() {
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  }

  async checkSchemaValidationAvailability() {
    return true // Always available
  }

  // Implementation methods (placeholders)
  async extractWithPDFParse(context, options) {
    throw new Error('PDF Parse implementation not available')
  }

  async extractWithCanvasOCR(context, options) {
    throw new Error('Canvas OCR implementation not available')
  }

  async extractWithRules(context, options) {
    throw new Error('Rule-based extraction implementation not available')
  }

  async requestManualExtraction(context, options) {
    throw new Error('Manual extraction implementation not available')
  }

  async processWithGeminiFlash(context, options) {
    throw new Error('Gemini Flash implementation not available')
  }

  async processWithLocalNLP(context, options) {
    throw new Error('Local NLP implementation not available')
  }

  async processWithTemplates(context, options) {
    throw new Error('Template processing implementation not available')
  }

  async storeInLocalStorage(context, options) {
    throw new Error('LocalStorage implementation not available')
  }

  async storeInSessionStorage(context, options) {
    throw new Error('SessionStorage implementation not available')
  }

  async storeInMemory(context, options) {
    throw new Error('Memory storage implementation not available')
  }

  async requestWithXHR(context, options) {
    throw new Error('XHR implementation not available')
  }

  async requestWithJSONP(context, options) {
    throw new Error('JSONP implementation not available')
  }

  async switchToOfflineMode(context, options) {
    throw new Error('Offline mode implementation not available')
  }

  async validateBasic(context, options) {
    throw new Error('Basic validation implementation not available')
  }

  async validateSchema(context, options) {
    throw new Error('Schema validation implementation not available')
  }

  async skipValidation(context, options) {
    return { valid: true, skipped: true }
  }
}

/**
 * Singleton instance
 */
let fallbackManagerInstance = null

/**
 * Get fallback manager instance
 */
export function getFallbackManager() {
  if (!fallbackManagerInstance) {
    fallbackManagerInstance = new FallbackManager()
  }
  return fallbackManagerInstance
}

/**
 * Initialize fallback manager
 */
export async function initializeFallbackManager(options = {}) {
  const manager = getFallbackManager()
  return await manager.initialize(options)
}

/**
 * Execute operation with fallback
 */
export async function executeWithFallback(operationType, primaryOperation, context = {}, options = {}) {
  const manager = getFallbackManager()
  return await manager.executeWithFallback(operationType, primaryOperation, context, options)
}

export default FallbackManager