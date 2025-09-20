/**
 * Retry Manager with Exponential Backoff
 * Provides sophisticated retry logic for various operation types
 */

export class RetryManager {
  constructor() {
    this.retryPolicies = this.initializeRetryPolicies()
    this.activeRetries = new Map()
    this.retryHistory = []
    this.circuitBreakers = new Map()
    this.isInitialized = false
  }

  /**
   * Initialize retry policies for different operation types
   */
  initializeRetryPolicies() {
    return {
      network: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_FAILED', 'FETCH_ERROR'],
        circuitBreakerThreshold: 5
      },
      
      api: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 2.5,
        jitter: true,
        retryableErrors: ['API_ERROR', 'RATE_LIMITED', 'SERVER_ERROR', 'QUOTA_EXCEEDED'],
        circuitBreakerThreshold: 3
      },
      
      storage: {
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 10000,
        backoffMultiplier: 1.5,
        jitter: false,
        retryableErrors: ['STORAGE_ERROR', 'QUOTA_EXCEEDED', 'TRANSACTION_FAILED'],
        circuitBreakerThreshold: 10
      },
      
      parsing: {
        maxAttempts: 2,
        baseDelay: 100,
        maxDelay: 2000,
        backoffMultiplier: 2,
        jitter: false,
        retryableErrors: ['PARSE_ERROR', 'ENCODING_ERROR', 'MALFORMED_DATA'],
        circuitBreakerThreshold: 5
      },
      
      ai: {
        maxAttempts: 2,
        baseDelay: 5000,
        maxDelay: 120000,
        backoffMultiplier: 3,
        jitter: true,
        retryableErrors: ['AI_MODEL_ERROR', 'EXTRACTION_FAILED', 'API_UNAVAILABLE'],
        circuitBreakerThreshold: 2
      },
      
      file: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 15000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['FILE_READ_ERROR', 'CORRUPTION_ERROR', 'ACCESS_DENIED'],
        circuitBreakerThreshold: 5
      }
    }
  }

  /**
   * Initialize retry manager
   */
  async initialize(options = {}) {
    try {
      // Merge custom policies if provided
      if (options.customPolicies) {
        this.retryPolicies = { ...this.retryPolicies, ...options.customPolicies }
      }
      
      // Initialize circuit breakers
      this.initializeCircuitBreakers()
      
      // Setup cleanup intervals
      this.setupCleanupIntervals()
      
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize RetryManager:', error)
      return false
    }
  }

  /**
   * Initialize circuit breakers for each operation type
   */
  initializeCircuitBreakers() {
    Object.keys(this.retryPolicies).forEach(operationType => {
      this.circuitBreakers.set(operationType, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        threshold: this.retryPolicies[operationType].circuitBreakerThreshold,
        timeout: 60000 // 1 minute timeout for OPEN state
      })
    })
  }

  /**
   * Setup cleanup intervals
   */
  setupCleanupIntervals() {
    // Clean up completed retries every 5 minutes
    setInterval(() => {
      this.cleanupCompletedRetries()
    }, 5 * 60 * 1000)

    // Check circuit breaker states every minute
    setInterval(() => {
      this.updateCircuitBreakerStates()
    }, 60 * 1000)
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - The operation to execute
   * @param {string} operationType - Type of operation (network, api, storage, etc.)
   * @param {Object} options - Additional options
   * @returns {Promise<any>} Operation result
   */
  async executeWithRetry(operation, operationType = 'network', options = {}) {
    if (!this.isInitialized) {
      throw new Error('RetryManager not initialized')
    }

    const retryId = this.generateRetryId()
    const policy = this.retryPolicies[operationType] || this.retryPolicies.network
    const circuitBreaker = this.circuitBreakers.get(operationType)

    // Check circuit breaker state
    if (circuitBreaker.state === 'OPEN') {
      if (Date.now() < circuitBreaker.nextAttemptTime) {
        throw new Error(`Circuit breaker is OPEN for ${operationType}. Next attempt allowed at ${new Date(circuitBreaker.nextAttemptTime)}`)
      } else {
        // Transition to HALF_OPEN
        circuitBreaker.state = 'HALF_OPEN'
      }
    }

    const retryContext = {
      id: retryId,
      operationType: operationType,
      policy: policy,
      startTime: Date.now(),
      attempts: 0,
      errors: [],
      options: options
    }

    this.activeRetries.set(retryId, retryContext)

    try {
      const result = await this.performRetryLoop(operation, retryContext)
      
      // Success - reset circuit breaker if it was HALF_OPEN
      if (circuitBreaker.state === 'HALF_OPEN') {
        circuitBreaker.state = 'CLOSED'
        circuitBreaker.failureCount = 0
      }

      this.recordRetrySuccess(retryContext, result)
      return result
    } catch (error) {
      this.recordRetryFailure(retryContext, error)
      this.updateCircuitBreaker(operationType, error)
      throw error
    } finally {
      this.activeRetries.delete(retryId)
    }
  }

  /**
   * Perform the retry loop
   */
  async performRetryLoop(operation, retryContext) {
    const { policy, options } = retryContext
    let lastError = null

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      retryContext.attempts = attempt

      try {
        // Add attempt info to operation context if supported
        const operationOptions = {
          ...options,
          attempt: attempt,
          maxAttempts: policy.maxAttempts,
          retryId: retryContext.id
        }

        const result = await operation(operationOptions)
        
        // Success
        retryContext.success = true
        retryContext.result = result
        return result
      } catch (error) {
        lastError = error
        retryContext.errors.push({
          attempt: attempt,
          error: error.message,
          timestamp: Date.now()
        })

        // Check if error is retryable
        if (!this.isRetryableError(error, policy)) {
          throw error
        }

        // Don't wait after the last attempt
        if (attempt < policy.maxAttempts) {
          const delay = this.calculateDelay(attempt, policy)
          await this.sleep(delay)
        }
      }
    }

    // All attempts failed
    throw lastError
  }

  /**
   * Check if error is retryable based on policy
   */
  isRetryableError(error, policy) {
    const errorCode = error.code || error.name || 'UNKNOWN_ERROR'
    
    // Check if error code is in retryable list
    return policy.retryableErrors.some(retryableCode => 
      errorCode.toUpperCase().includes(retryableCode.toUpperCase())
    )
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt, policy) {
    // Calculate base delay with exponential backoff
    let delay = Math.min(
      policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt - 1),
      policy.maxDelay
    )

    // Add jitter if enabled
    if (policy.jitter) {
      // Add random jitter up to 25% of the delay
      const jitterAmount = delay * 0.25
      delay += Math.random() * jitterAmount
    }

    return Math.floor(delay)
  }

  /**
   * Update circuit breaker state based on error
   */
  updateCircuitBreaker(operationType, error) {
    const circuitBreaker = this.circuitBreakers.get(operationType)
    if (!circuitBreaker) return

    circuitBreaker.failureCount++
    circuitBreaker.lastFailureTime = Date.now()

    // Open circuit breaker if threshold exceeded
    if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
      circuitBreaker.state = 'OPEN'
      circuitBreaker.nextAttemptTime = Date.now() + circuitBreaker.timeout
    }
  }

  /**
   * Update circuit breaker states periodically
   */
  updateCircuitBreakerStates() {
    this.circuitBreakers.forEach((breaker, operationType) => {
      if (breaker.state === 'OPEN' && Date.now() >= breaker.nextAttemptTime) {
        breaker.state = 'HALF_OPEN'
      }
    })
  }

  /**
   * Record successful retry
   */
  recordRetrySuccess(retryContext, result) {
    const record = {
      id: retryContext.id,
      operationType: retryContext.operationType,
      success: true,
      attempts: retryContext.attempts,
      totalTime: Date.now() - retryContext.startTime,
      timestamp: Date.now()
    }

    this.retryHistory.push(record)
    this.limitHistorySize()
  }

  /**
   * Record failed retry
   */
  recordRetryFailure(retryContext, finalError) {
    const record = {
      id: retryContext.id,
      operationType: retryContext.operationType,
      success: false,
      attempts: retryContext.attempts,
      errors: retryContext.errors,
      finalError: finalError.message,
      totalTime: Date.now() - retryContext.startTime,
      timestamp: Date.now()
    }

    this.retryHistory.push(record)
    this.limitHistorySize()
  }

  /**
   * Limit history size to prevent memory issues
   */
  limitHistorySize() {
    if (this.retryHistory.length > 1000) {
      this.retryHistory = this.retryHistory.slice(-500)
    }
  }

  /**
   * Clean up completed retries
   */
  cleanupCompletedRetries() {
    const cutoffTime = Date.now() - (10 * 60 * 1000) // 10 minutes ago
    
    this.activeRetries.forEach((context, id) => {
      if (context.startTime < cutoffTime) {
        this.activeRetries.delete(id)
      }
    })
  }

  /**
   * Execute operation with custom retry policy
   */
  async executeWithCustomPolicy(operation, customPolicy, options = {}) {
    const retryId = this.generateRetryId()
    
    const retryContext = {
      id: retryId,
      operationType: 'custom',
      policy: customPolicy,
      startTime: Date.now(),
      attempts: 0,
      errors: [],
      options: options
    }

    this.activeRetries.set(retryId, retryContext)

    try {
      const result = await this.performRetryLoop(operation, retryContext)
      this.recordRetrySuccess(retryContext, result)
      return result
    } catch (error) {
      this.recordRetryFailure(retryContext, error)
      throw error
    } finally {
      this.activeRetries.delete(retryId)
    }
  }

  /**
   * Execute multiple operations with retry in parallel
   */
  async executeParallelWithRetry(operations, operationType = 'network', options = {}) {
    const promises = operations.map((operation, index) => 
      this.executeWithRetry(operation, operationType, { 
        ...options, 
        operationIndex: index 
      })
    )

    return await Promise.allSettled(promises)
  }

  /**
   * Execute operations with retry in sequence
   */
  async executeSequentialWithRetry(operations, operationType = 'network', options = {}) {
    const results = []
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await this.executeWithRetry(operations[i], operationType, {
          ...options,
          operationIndex: i
        })
        results.push({ status: 'fulfilled', value: result })
      } catch (error) {
        results.push({ status: 'rejected', reason: error })
        
        // Stop on first failure if specified
        if (options.stopOnFirstFailure) {
          break
        }
      }
    }

    return results
  }

  /**
   * Get retry statistics
   */
  getRetryStatistics() {
    const stats = {
      totalRetries: this.retryHistory.length,
      successfulRetries: this.retryHistory.filter(r => r.success).length,
      failedRetries: this.retryHistory.filter(r => !r.success).length,
      averageAttempts: 0,
      averageTime: 0,
      operationTypeStats: {},
      circuitBreakerStates: {},
      activeRetries: this.activeRetries.size
    }

    // Calculate averages
    if (this.retryHistory.length > 0) {
      stats.averageAttempts = this.retryHistory.reduce((sum, r) => sum + r.attempts, 0) / this.retryHistory.length
      stats.averageTime = this.retryHistory.reduce((sum, r) => sum + r.totalTime, 0) / this.retryHistory.length
    }

    // Stats by operation type
    this.retryHistory.forEach(record => {
      const type = record.operationType
      if (!stats.operationTypeStats[type]) {
        stats.operationTypeStats[type] = {
          total: 0,
          successful: 0,
          failed: 0,
          averageAttempts: 0
        }
      }
      
      stats.operationTypeStats[type].total++
      if (record.success) {
        stats.operationTypeStats[type].successful++
      } else {
        stats.operationTypeStats[type].failed++
      }
    })

    // Calculate averages for each operation type
    Object.keys(stats.operationTypeStats).forEach(type => {
      const typeRecords = this.retryHistory.filter(r => r.operationType === type)
      if (typeRecords.length > 0) {
        stats.operationTypeStats[type].averageAttempts = 
          typeRecords.reduce((sum, r) => sum + r.attempts, 0) / typeRecords.length
      }
    })

    // Circuit breaker states
    this.circuitBreakers.forEach((breaker, type) => {
      stats.circuitBreakerStates[type] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime,
        nextAttemptTime: breaker.nextAttemptTime
      }
    })

    return stats
  }

  /**
   * Get active retries information
   */
  getActiveRetries() {
    const active = []
    
    this.activeRetries.forEach((context, id) => {
      active.push({
        id: id,
        operationType: context.operationType,
        attempts: context.attempts,
        maxAttempts: context.policy.maxAttempts,
        startTime: context.startTime,
        duration: Date.now() - context.startTime,
        errors: context.errors
      })
    })

    return active
  }

  /**
   * Cancel active retry
   */
  cancelRetry(retryId) {
    const context = this.activeRetries.get(retryId)
    if (context) {
      context.cancelled = true
      this.activeRetries.delete(retryId)
      return true
    }
    return false
  }

  /**
   * Cancel all active retries
   */
  cancelAllRetries() {
    const cancelledCount = this.activeRetries.size
    this.activeRetries.clear()
    return cancelledCount
  }

  /**
   * Reset circuit breaker for operation type
   */
  resetCircuitBreaker(operationType) {
    const breaker = this.circuitBreakers.get(operationType)
    if (breaker) {
      breaker.state = 'CLOSED'
      breaker.failureCount = 0
      breaker.lastFailureTime = null
      breaker.nextAttemptTime = null
      return true
    }
    return false
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers() {
    this.circuitBreakers.forEach(breaker => {
      breaker.state = 'CLOSED'
      breaker.failureCount = 0
      breaker.lastFailureTime = null
      breaker.nextAttemptTime = null
    })
  }

  /**
   * Update retry policy for operation type
   */
  updateRetryPolicy(operationType, newPolicy) {
    this.retryPolicies[operationType] = { ...this.retryPolicies[operationType], ...newPolicy }
    
    // Update circuit breaker threshold if changed
    const breaker = this.circuitBreakers.get(operationType)
    if (breaker && newPolicy.circuitBreakerThreshold) {
      breaker.threshold = newPolicy.circuitBreakerThreshold
    }
  }

  /**
   * Export retry history
   */
  exportRetryHistory() {
    return {
      history: this.retryHistory,
      statistics: this.getRetryStatistics(),
      exportTime: Date.now()
    }
  }

  /**
   * Clear retry history
   */
  clearRetryHistory() {
    this.retryHistory = []
  }

  /**
   * Utility methods
   */
  generateRetryId() {
    return 'retry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Singleton instance
 */
let retryManagerInstance = null

/**
 * Get retry manager instance
 */
export function getRetryManager() {
  if (!retryManagerInstance) {
    retryManagerInstance = new RetryManager()
  }
  return retryManagerInstance
}

/**
 * Initialize retry manager
 */
export async function initializeRetryManager(options = {}) {
  const manager = getRetryManager()
  return await manager.initialize(options)
}

/**
 * Execute operation with retry
 */
export async function executeWithRetry(operation, operationType = 'network', options = {}) {
  const manager = getRetryManager()
  return await manager.executeWithRetry(operation, operationType, options)
}

export default RetryManager