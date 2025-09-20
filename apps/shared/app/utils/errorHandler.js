/**
 * Comprehensive Error Handler and Recovery System
 * Provides robust error handling, recovery strategies, and user-friendly error reporting
 */

export class ErrorHandler {
  constructor() {
    this.errorCategories = this.initializeErrorCategories()
    this.recoveryStrategies = this.initializeRecoveryStrategies()
    this.errorLog = []
    this.retryPolicies = this.initializeRetryPolicies()
    this.fallbackMethods = this.initializeFallbackMethods()
    this.userNotifications = new Map()
    this.isInitialized = false
  }

  /**
   * Initialize error categories
   */
  initializeErrorCategories() {
    return {
      network: {
        codes: ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_FAILED', 'API_UNAVAILABLE'],
        severity: 'medium',
        recoverable: true,
        userFriendly: 'Network connection issue'
      },
      
      file: {
        codes: ['FILE_NOT_FOUND', 'FILE_CORRUPTED', 'INVALID_FORMAT', 'FILE_TOO_LARGE'],
        severity: 'high',
        recoverable: true,
        userFriendly: 'File processing issue'
      },
      
      parsing: {
        codes: ['PARSE_ERROR', 'INVALID_JSON', 'MALFORMED_DATA', 'ENCODING_ERROR'],
        severity: 'medium',
        recoverable: true,
        userFriendly: 'Data parsing issue'
      },
      
      ai: {
        codes: ['AI_MODEL_ERROR', 'EXTRACTION_FAILED', 'LOW_CONFIDENCE', 'API_QUOTA_EXCEEDED'],
        severity: 'medium',
        recoverable: true,
        userFriendly: 'AI processing issue'
      },
      
      storage: {
        codes: ['STORAGE_FULL', 'PERMISSION_DENIED', 'QUOTA_EXCEEDED', 'CORRUPTION'],
        severity: 'high',
        recoverable: true,
        userFriendly: 'Storage issue'
      },
      
      validation: {
        codes: ['VALIDATION_ERROR', 'SCHEMA_VIOLATION', 'CONSTRAINT_VIOLATION', 'TYPE_MISMATCH'],
        severity: 'medium',
        recoverable: true,
        userFriendly: 'Data validation issue'
      },
      
      security: {
        codes: ['UNAUTHORIZED', 'FORBIDDEN', 'ENCRYPTION_ERROR', 'KEY_INVALID'],
        severity: 'critical',
        recoverable: false,
        userFriendly: 'Security issue'
      },
      
      system: {
        codes: ['OUT_OF_MEMORY', 'BROWSER_UNSUPPORTED', 'FEATURE_UNAVAILABLE', 'CRITICAL_ERROR'],
        severity: 'critical',
        recoverable: false,
        userFriendly: 'System issue'
      }
    }
  }

  /**
   * Initialize recovery strategies
   */
  initializeRecoveryStrategies() {
    return {
      retry: {
        description: 'Retry the operation with exponential backoff',
        applicable: ['network', 'ai', 'storage'],
        implementation: this.retryWithBackoff.bind(this)
      },
      
      fallback: {
        description: 'Use alternative method or service',
        applicable: ['network', 'ai', 'parsing'],
        implementation: this.useFallbackMethod.bind(this)
      },
      
      gracefulDegradation: {
        description: 'Continue with reduced functionality',
        applicable: ['ai', 'network', 'storage'],
        implementation: this.gracefulDegradation.bind(this)
      },
      
      userIntervention: {
        description: 'Request user action to resolve the issue',
        applicable: ['file', 'validation', 'security'],
        implementation: this.requestUserIntervention.bind(this)
      },
      
      dataRecovery: {
        description: 'Attempt to recover corrupted or lost data',
        applicable: ['storage', 'parsing', 'file'],
        implementation: this.attemptDataRecovery.bind(this)
      },
      
      systemReset: {
        description: 'Reset system state to recover from critical errors',
        applicable: ['system', 'security'],
        implementation: this.performSystemReset.bind(this)
      }
    }
  }

  /**
   * Initialize retry policies
   */
  initializeRetryPolicies() {
    return {
      network: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true
      },
      
      ai: {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 15000,
        backoffMultiplier: 2.5,
        jitter: true
      },
      
      storage: {
        maxAttempts: 3,
        baseDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        jitter: false
      },
      
      parsing: {
        maxAttempts: 2,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false
      }
    }
  }

  /**
   * Initialize fallback methods
   */
  initializeFallbackMethods() {
    return {
      aiExtraction: {
        primary: 'gemini-api',
        fallbacks: ['rule-based-extraction', 'template-matching', 'manual-extraction']
      },
      
      pdfProcessing: {
        primary: 'pdf-lib',
        fallbacks: ['pdf-parse', 'canvas-extraction', 'ocr-fallback']
      },
      
      storage: {
        primary: 'indexeddb',
        fallbacks: ['localstorage', 'sessionstorage', 'memory-storage']
      },
      
      network: {
        primary: 'fetch-api',
        fallbacks: ['xhr', 'jsonp', 'offline-mode']
      }
    }
  }

  /**
   * Initialize error handler
   */
  async initialize(options = {}) {
    try {
      // Setup global error handlers
      this.setupGlobalErrorHandlers()
      
      // Initialize error reporting
      this.initializeErrorReporting(options)
      
      // Setup recovery mechanisms
      this.setupRecoveryMechanisms()
      
      // Initialize user notification system
      this.initializeNotificationSystem()
      
      this.isInitialized = true
      this.logError('INFO', 'ERROR_HANDLER_INITIALIZED', 'Error handler system initialized successfully')
      
      return true
    } catch (error) {
      console.error('Failed to initialize ErrorHandler:', error)
      return false
    }
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled_promise_rejection',
        source: 'global'
      })
      event.preventDefault()
    })

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'javascript_error',
        source: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(new Error(`Resource failed to load: ${event.target.src || event.target.href}`), {
          type: 'resource_error',
          source: 'global',
          element: event.target.tagName
        })
      }
    }, true)
  }

  /**
   * Main error handling method
   * @param {Error|string} error - Error object or error message
   * @param {Object} context - Additional context about the error
   * @returns {Promise<Object>} Recovery result
   */
  async handleError(error, context = {}) {
    try {
      // Normalize error
      const normalizedError = this.normalizeError(error, context)
      
      // Categorize error
      const category = this.categorizeError(normalizedError)
      
      // Log error
      this.logError('ERROR', normalizedError.code, normalizedError.message, {
        category: category,
        context: context,
        stack: normalizedError.stack
      })

      // Determine recovery strategy
      const recoveryStrategy = this.determineRecoveryStrategy(category, normalizedError)
      
      // Attempt recovery
      const recoveryResult = await this.attemptRecovery(normalizedError, recoveryStrategy, context)
      
      // Notify user if necessary
      await this.notifyUserIfNecessary(normalizedError, category, recoveryResult)
      
      return {
        error: normalizedError,
        category: category,
        recoveryStrategy: recoveryStrategy,
        recoveryResult: recoveryResult,
        timestamp: Date.now()
      }
    } catch (handlingError) {
      // Error in error handling - log and return basic result
      console.error('Error in error handling:', handlingError)
      return {
        error: this.normalizeError(error, context),
        category: 'system',
        recoveryStrategy: 'none',
        recoveryResult: { success: false, error: handlingError.message },
        timestamp: Date.now()
      }
    }
  }

  /**
   * Normalize error to standard format
   */
  normalizeError(error, context = {}) {
    if (error instanceof Error) {
      return {
        code: error.name || 'UNKNOWN_ERROR',
        message: error.message,
        stack: error.stack,
        originalError: error
      }
    }

    if (typeof error === 'string') {
      return {
        code: context.code || 'STRING_ERROR',
        message: error,
        stack: new Error().stack,
        originalError: error
      }
    }

    if (typeof error === 'object' && error !== null) {
      return {
        code: error.code || error.name || 'OBJECT_ERROR',
        message: error.message || JSON.stringify(error),
        stack: error.stack || new Error().stack,
        originalError: error
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
      stack: new Error().stack,
      originalError: error
    }
  }

  /**
   * Categorize error based on error code and context
   */
  categorizeError(error) {
    const errorCode = error.code.toUpperCase()
    
    for (const [category, config] of Object.entries(this.errorCategories)) {
      if (config.codes.some(code => errorCode.includes(code))) {
        return category
      }
    }

    // Default categorization based on error patterns
    if (errorCode.includes('NETWORK') || errorCode.includes('FETCH') || errorCode.includes('TIMEOUT')) {
      return 'network'
    }
    
    if (errorCode.includes('FILE') || errorCode.includes('BLOB') || errorCode.includes('UPLOAD')) {
      return 'file'
    }
    
    if (errorCode.includes('PARSE') || errorCode.includes('JSON') || errorCode.includes('SYNTAX')) {
      return 'parsing'
    }
    
    if (errorCode.includes('STORAGE') || errorCode.includes('QUOTA') || errorCode.includes('INDEXEDDB')) {
      return 'storage'
    }

    return 'system' // Default category
  }

  /**
   * Determine recovery strategy
   */
  determineRecoveryStrategy(category, error) {
    const categoryConfig = this.errorCategories[category]
    
    if (!categoryConfig || !categoryConfig.recoverable) {
      return 'userIntervention'
    }

    // Priority order for recovery strategies
    const strategies = ['retry', 'fallback', 'gracefulDegradation', 'dataRecovery', 'userIntervention']
    
    for (const strategy of strategies) {
      const strategyConfig = this.recoveryStrategies[strategy]
      if (strategyConfig.applicable.includes(category)) {
        return strategy
      }
    }

    return 'userIntervention'
  }

  /**
   * Attempt recovery using the determined strategy
   */
  async attemptRecovery(error, strategy, context) {
    const strategyConfig = this.recoveryStrategies[strategy]
    
    if (!strategyConfig) {
      return { success: false, error: 'Unknown recovery strategy' }
    }

    try {
      this.logError('INFO', 'RECOVERY_ATTEMPT', `Attempting recovery using strategy: ${strategy}`)
      
      const result = await strategyConfig.implementation(error, context)
      
      this.logError('INFO', 'RECOVERY_RESULT', `Recovery ${result.success ? 'successful' : 'failed'}`, result)
      
      return result
    } catch (recoveryError) {
      this.logError('ERROR', 'RECOVERY_ERROR', 'Recovery attempt failed', { 
        strategy: strategy, 
        error: recoveryError.message 
      })
      
      return { 
        success: false, 
        error: recoveryError.message,
        fallbackNeeded: true
      }
    }
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(error, context) {
    const category = this.categorizeError(error)
    const retryPolicy = this.retryPolicies[category] || this.retryPolicies.network
    
    const operation = context.operation
    if (!operation) {
      return { success: false, error: 'No operation provided for retry' }
    }

    let lastError = error
    
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        // Calculate delay with exponential backoff
        let delay = Math.min(
          retryPolicy.baseDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
          retryPolicy.maxDelay
        )
        
        // Add jitter if enabled
        if (retryPolicy.jitter) {
          delay += Math.random() * 1000
        }
        
        // Wait before retry (except first attempt)
        if (attempt > 1) {
          await this.sleep(delay)
        }
        
        this.logError('INFO', 'RETRY_ATTEMPT', `Retry attempt ${attempt}/${retryPolicy.maxAttempts}`)
        
        // Execute operation
        const result = await operation()
        
        return { 
          success: true, 
          result: result,
          attempts: attempt,
          strategy: 'retry'
        }
      } catch (retryError) {
        lastError = retryError
        this.logError('WARN', 'RETRY_FAILED', `Retry attempt ${attempt} failed: ${retryError.message}`)
      }
    }

    return { 
      success: false, 
      error: lastError.message,
      attempts: retryPolicy.maxAttempts,
      strategy: 'retry'
    }
  }

  /**
   * Use fallback method
   */
  async useFallbackMethod(error, context) {
    const operationType = context.operationType
    const fallbackConfig = this.fallbackMethods[operationType]
    
    if (!fallbackConfig) {
      return { success: false, error: 'No fallback methods available' }
    }

    const operation = context.operation
    if (!operation) {
      return { success: false, error: 'No operation provided for fallback' }
    }

    // Try each fallback method
    for (const fallbackMethod of fallbackConfig.fallbacks) {
      try {
        this.logError('INFO', 'FALLBACK_ATTEMPT', `Trying fallback method: ${fallbackMethod}`)
        
        const result = await operation(fallbackMethod)
        
        return { 
          success: true, 
          result: result,
          method: fallbackMethod,
          strategy: 'fallback'
        }
      } catch (fallbackError) {
        this.logError('WARN', 'FALLBACK_FAILED', `Fallback method ${fallbackMethod} failed: ${fallbackError.message}`)
      }
    }

    return { 
      success: false, 
      error: 'All fallback methods failed',
      strategy: 'fallback'
    }
  }

  /**
   * Graceful degradation
   */
  async gracefulDegradation(error, context) {
    const feature = context.feature
    
    if (!feature) {
      return { success: false, error: 'No feature specified for degradation' }
    }

    try {
      // Disable the problematic feature
      await this.disableFeature(feature)
      
      // Enable alternative functionality
      const alternatives = await this.enableAlternatives(feature)
      
      return {
        success: true,
        disabledFeature: feature,
        alternatives: alternatives,
        strategy: 'gracefulDegradation'
      }
    } catch (degradationError) {
      return {
        success: false,
        error: degradationError.message,
        strategy: 'gracefulDegradation'
      }
    }
  }

  /**
   * Request user intervention
   */
  async requestUserIntervention(error, context) {
    const category = this.categorizeError(error)
    const categoryConfig = this.errorCategories[category]
    
    const interventionRequest = {
      error: error,
      category: category,
      userFriendlyMessage: categoryConfig.userFriendly,
      suggestedActions: this.getSuggestedActions(category, error),
      canRetry: categoryConfig.recoverable,
      timestamp: Date.now()
    }

    // Store intervention request for UI to display
    this.userNotifications.set(error.code, interventionRequest)
    
    // Trigger user notification
    this.triggerUserNotification(interventionRequest)
    
    return {
      success: true,
      interventionRequested: true,
      interventionId: error.code,
      strategy: 'userIntervention'
    }
  }

  /**
   * Attempt data recovery
   */
  async attemptDataRecovery(error, context) {
    const dataType = context.dataType
    const recoveryMethods = ['backup', 'cache', 'reconstruction']
    
    for (const method of recoveryMethods) {
      try {
        this.logError('INFO', 'DATA_RECOVERY_ATTEMPT', `Attempting data recovery using: ${method}`)
        
        const recoveredData = await this.recoverData(dataType, method)
        
        if (recoveredData) {
          return {
            success: true,
            recoveredData: recoveredData,
            method: method,
            strategy: 'dataRecovery'
          }
        }
      } catch (recoveryError) {
        this.logError('WARN', 'DATA_RECOVERY_FAILED', `Data recovery method ${method} failed: ${recoveryError.message}`)
      }
    }

    return {
      success: false,
      error: 'All data recovery methods failed',
      strategy: 'dataRecovery'
    }
  }

  /**
   * Perform system reset
   */
  async performSystemReset(error, context) {
    try {
      this.logError('WARN', 'SYSTEM_RESET', 'Performing system reset due to critical error')
      
      // Clear caches
      await this.clearCaches()
      
      // Reset application state
      await this.resetApplicationState()
      
      // Reinitialize critical systems
      await this.reinitializeSystems()
      
      return {
        success: true,
        resetPerformed: true,
        strategy: 'systemReset'
      }
    } catch (resetError) {
      return {
        success: false,
        error: resetError.message,
        strategy: 'systemReset'
      }
    }
  }

  /**
   * Get suggested actions for user intervention
   */
  getSuggestedActions(category, error) {
    const suggestions = {
      network: [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable VPN or proxy if enabled',
        'Try again in a few minutes'
      ],
      file: [
        'Check if the file is corrupted',
        'Try a different file format',
        'Ensure the file size is within limits',
        'Verify file permissions'
      ],
      storage: [
        'Clear browser cache and data',
        'Free up storage space',
        'Try using a different browser',
        'Check browser storage permissions'
      ],
      ai: [
        'Try again with a different PDF',
        'Check if the PDF contains readable text',
        'Verify API key is valid',
        'Try using offline mode'
      ],
      security: [
        'Check your permissions',
        'Verify your credentials',
        'Contact system administrator',
        'Try logging out and back in'
      ],
      system: [
        'Refresh the page',
        'Try using a different browser',
        'Clear browser cache',
        'Contact technical support'
      ]
    }

    return suggestions[category] || suggestions.system
  }

  /**
   * Notify user if necessary
   */
  async notifyUserIfNecessary(error, category, recoveryResult) {
    const categoryConfig = this.errorCategories[category]
    
    // Always notify for critical errors
    if (categoryConfig.severity === 'critical') {
      await this.showUserNotification(error, category, recoveryResult)
      return
    }

    // Notify if recovery failed
    if (!recoveryResult.success) {
      await this.showUserNotification(error, category, recoveryResult)
      return
    }

    // Notify for high severity errors even if recovered
    if (categoryConfig.severity === 'high') {
      await this.showUserNotification(error, category, recoveryResult)
    }
  }

  /**
   * Show user notification
   */
  async showUserNotification(error, category, recoveryResult) {
    const categoryConfig = this.errorCategories[category]
    
    const notification = {
      type: categoryConfig.severity,
      title: categoryConfig.userFriendly,
      message: this.generateUserFriendlyMessage(error, recoveryResult),
      actions: this.getSuggestedActions(category, error),
      canRetry: categoryConfig.recoverable && !recoveryResult.success,
      timestamp: Date.now()
    }

    // Store notification
    this.userNotifications.set(`notification_${Date.now()}`, notification)
    
    // Trigger notification display
    this.triggerUserNotification(notification)
  }

  /**
   * Generate user-friendly error message
   */
  generateUserFriendlyMessage(error, recoveryResult) {
    if (recoveryResult.success) {
      return `The issue has been resolved automatically. ${recoveryResult.strategy === 'retry' ? 'The operation was retried successfully.' : 'An alternative method was used.'}`
    }

    return `We encountered an issue: ${error.message}. Please try the suggested actions below.`
  }

  /**
   * Log error with structured format
   */
  logError(level, code, message, details = {}) {
    const logEntry = {
      level: level,
      code: code,
      message: message,
      details: details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    this.errorLog.push(logEntry)
    
    // Limit log size
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500)
    }

    // Console logging
    const consoleMethod = level.toLowerCase() === 'error' ? 'error' : 
                         level.toLowerCase() === 'warn' ? 'warn' : 'log'
    console[consoleMethod](`[${level}] ${code}: ${message}`, details)
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    const stats = {
      totalErrors: this.errorLog.length,
      errorsByLevel: {},
      errorsByCategory: {},
      recentErrors: this.errorLog.slice(-10),
      topErrors: {}
    }

    // Count by level
    this.errorLog.forEach(entry => {
      stats.errorsByLevel[entry.level] = (stats.errorsByLevel[entry.level] || 0) + 1
    })

    // Count by category (if available in details)
    this.errorLog.forEach(entry => {
      if (entry.details.category) {
        stats.errorsByCategory[entry.details.category] = (stats.errorsByCategory[entry.details.category] || 0) + 1
      }
    })

    // Count top error codes
    this.errorLog.forEach(entry => {
      stats.topErrors[entry.code] = (stats.topErrors[entry.code] || 0) + 1
    })

    return stats
  }

  /**
   * Export error log
   */
  exportErrorLog() {
    return {
      errors: this.errorLog,
      statistics: this.getErrorStatistics(),
      exportTime: Date.now()
    }
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = []
    this.logError('INFO', 'ERROR_LOG_CLEARED', 'Error log has been cleared')
  }

  /**
   * Utility methods
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Placeholder methods for system operations
  async disableFeature(feature) { /* Implementation */ }
  async enableAlternatives(feature) { return [] }
  async recoverData(dataType, method) { return null }
  async clearCaches() { /* Implementation */ }
  async resetApplicationState() { /* Implementation */ }
  async reinitializeSystems() { /* Implementation */ }
  
  // Placeholder methods for notifications
  initializeErrorReporting(options) { /* Implementation */ }
  setupRecoveryMechanisms() { /* Implementation */ }
  initializeNotificationSystem() { /* Implementation */ }
  triggerUserNotification(notification) { 
    console.log('User notification:', notification)
  }
}

/**
 * Singleton instance
 */
let errorHandlerInstance = null

/**
 * Get error handler instance
 */
export function getErrorHandler() {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler()
  }
  return errorHandlerInstance
}

/**
 * Initialize error handling system
 */
export async function initializeErrorHandling(options = {}) {
  const handler = getErrorHandler()
  return await handler.initialize(options)
}

/**
 * Handle error with recovery
 */
export async function handleErrorWithRecovery(error, context = {}) {
  const handler = getErrorHandler()
  return await handler.handleError(error, context)
}

export default ErrorHandler
  /**
 
  * Helper methods
   */

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log error with appropriate level
   */
  logError(level, error) {
    const timestamp = new Date().toISOString()
    const logMessage = typeof error === 'string' ? error : JSON.stringify(error, null, 2)
    
    switch (level) {
      case 'ERROR':
        console.error(`[${timestamp}] ERROR:`, logMessage)
        break
      case 'WARN':
        console.warn(`[${timestamp}] WARN:`, logMessage)
        break
      case 'INFO':
        console.info(`[${timestamp}] INFO:`, logMessage)
        break
      default:
        console.log(`[${timestamp}] ${level}:`, logMessage)
    }
  }

  /**
   * Setup error reporting (placeholder for external services)
   */
  setupErrorReporting(config) {
    if (config?.enabled) {
      this.errorReporting = {
        enabled: true,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        batchSize: config.batchSize || 10,
        flushInterval: config.flushInterval || 30000
      }
    }
  }

  /**
   * Setup user notification system
   */
  setupUserNotifications() {
    // This would integrate with the UI notification system
    this.notificationQueue = []
    this.maxNotifications = 5
  }

  /**
   * Initialize recovery systems
   */
  async initializeRecoverySystems() {
    // Initialize any recovery-related systems
    this.recoveryCache = new Map()
    this.recoveryMetrics = {
      totalAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    }
  }

  /**
   * Report error to external service (placeholder)
   */
  async reportError(error, recoveryResult) {
    if (!this.errorReporting?.enabled) {
      return
    }

    try {
      const report = {
        error: {
          id: error.id,
          type: error.type,
          message: error.message,
          category: error.category,
          severity: error.severity,
          timestamp: error.timestamp
        },
        recovery: {
          attempted: recoveryResult.attempted.length,
          successful: recoveryResult.successful.length,
          finalStatus: recoveryResult.finalStatus,
          recoveryTime: recoveryResult.recoveryTime
        },
        context: error.metadata
      }

      // This would send to external error reporting service
      console.log('Error report:', report)
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  /**
   * Retry original operation (placeholder)
   */
  async retryOriginalOperation(error) {
    // This would retry the operation that caused the error
    // Implementation depends on the specific operation
    console.log('Retrying operation for error:', error.type)
    return Math.random() > 0.5 // Simulate success/failure
  }

  /**
   * Use fallback parser (placeholder)
   */
  async useFallbackParser(parserType) {
    // This would use an alternative PDF parser
    console.log('Using fallback parser:', parserType)
    return Math.random() > 0.3 // Simulate success/failure
  }

  /**
   * Fix JSON errors
   */
  fixJSONErrors(rawData) {
    if (!rawData || typeof rawData !== 'string') {
      return null
    }

    try {
      // Try to parse as-is first
      return JSON.parse(rawData)
    } catch (error) {
      // Common JSON fixes
      let fixed = rawData
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
        .replace(/\n|\r/g, '') // Remove newlines
        .trim()

      try {
        return JSON.parse(fixed)
      } catch (secondError) {
        console.error('Could not auto-fix JSON:', secondError)
        return null
      }
    }
  }

  /**
   * Perform data cleanup (placeholder)
   */
  async performDataCleanup(cutoffTime) {
    // This would integrate with storage systems to cleanup old data
    console.log('Performing data cleanup for data older than:', new Date(cutoffTime))
    return Math.floor(Math.random() * 100) // Simulate cleaned up items
  }

  /**
   * Attempt worker restart (placeholder)
   */
  async attemptWorkerRestart(workerType) {
    // This would restart the specified worker
    console.log('Attempting to restart worker:', workerType)
    return Math.random() > 0.2 // Simulate success/failure
  }

  /**
   * Prompt file selection (placeholder)
   */
  promptFileSelection() {
    // This would trigger file selection dialog
    console.log('Prompting user for file selection')
  }

  /**
   * Report issue (placeholder)
   */
  reportIssue(error) {
    // This would open issue reporting interface
    console.log('Opening issue report for error:', error.type)
  }

  /**
   * Create error boundary wrapper
   */
  createErrorBoundary(component, fallbackComponent) {
    return {
      component,
      fallback: fallbackComponent,
      onError: (error, errorInfo) => {
        this.handleError({
          type: 'COMPONENT_ERROR',
          error: error,
          context: 'react_component',
          metadata: {
            componentStack: errorInfo.componentStack,
            errorBoundary: true
          }
        })
      }
    }
  }

  /**
   * Wrap async function with error handling
   */
  wrapAsync(asyncFunction, context = 'async_operation') {
    return async (...args) => {
      try {
        return await asyncFunction(...args)
      } catch (error) {
        const result = await this.handleError({
          type: 'ASYNC_OPERATION_ERROR',
          error: error,
          context: context,
          metadata: {
            functionName: asyncFunction.name,
            arguments: args
          }
        })

        // Re-throw if recovery failed
        if (result.recovery.finalStatus === 'failed') {
          throw error
        }

        return result
      }
    }
  }

  /**
   * Create safe event handler
   */
  createSafeEventHandler(handler, context = 'event_handler') {
    return (event) => {
      try {
        return handler(event)
      } catch (error) {
        this.handleError({
          type: 'EVENT_HANDLER_ERROR',
          error: error,
          context: context,
          metadata: {
            eventType: event?.type,
            target: event?.target?.tagName
          }
        })
      }
    }
  }

  /**
   * Monitor performance and detect issues
   */
  monitorPerformance() {
    if ('performance' in window && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 5000) { // 5 second threshold
            this.handleError({
              type: 'PERFORMANCE_ISSUE',
              message: `Slow operation detected: ${entry.name}`,
              context: 'performance_monitoring',
              metadata: {
                duration: entry.duration,
                entryType: entry.entryType,
                name: entry.name
              }
            })
          }
        }
      })

      observer.observe({ entryTypes: ['measure', 'navigation'] })
    }
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    const health = {
      timestamp: Date.now(),
      memory: this.getMemoryInfo(),
      storage: await this.getStorageInfo(),
      network: await this.getNetworkInfo(),
      errors: {
        recent: this.errorHistory.slice(-5),
        total: this.errorHistory.length,
        recoveryRate: this.getErrorStatistics().recoveryRate
      }
    }

    // Check for critical issues
    if (health.memory.usedJSHeapSize > health.memory.jsHeapSizeLimit * 0.9) {
      this.handleError({
        type: 'MEMORY_WARNING',
        message: 'Memory usage is critically high',
        context: 'system_health',
        metadata: health.memory
      })
    }

    return health
  }

  /**
   * Get memory information
   */
  getMemoryInfo() {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      }
    }
    return { available: false }
  }

  /**
   * Get storage information
   */
  async getStorageInfo() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
          usagePercentage: (estimate.usage / estimate.quota) * 100
        }
      }
    } catch (error) {
      console.warn('Could not get storage info:', error)
    }
    return { available: false }
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    const info = {
      online: navigator.onLine,
      connection: null
    }

    if ('connection' in navigator) {
      info.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      }
    }

    return info
  }

  /**
   * Export error data for debugging
   */
  exportErrorData() {
    return {
      errorHistory: this.errorHistory,
      statistics: this.getErrorStatistics(),
      configuration: {
        errorTypes: Object.keys(this.errorTypes),
        recoveryStrategies: Object.keys(this.recoveryStrategies)
      },
      systemInfo: {
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        url: window.location.href
      }
    }
  }

  /**
   * Import error data (for testing/debugging)
   */
  importErrorData(data) {
    if (data.errorHistory && Array.isArray(data.errorHistory)) {
      this.errorHistory = data.errorHistory
    }
  }
}

// Create singleton instance
let errorHandlerInstance = null

/**
 * Get error handler singleton
 */
export function getErrorHandler() {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler()
  }
  return errorHandlerInstance
}

/**
 * Initialize error handler with configuration
 */
export async function initializeErrorHandler(config = {}) {
  const handler = getErrorHandler()
  await handler.initialize(config)
  return handler
}

/**
 * Quick error handling function
 */
export async function handleError(error, context = 'unknown') {
  const handler = getErrorHandler()
  return await handler.handleError({
    error: error,
    context: context,
    timestamp: Date.now()
  })
}

/**
 * Create error boundary HOC for React components
 */
export function withErrorBoundary(Component, FallbackComponent) {
  const handler = getErrorHandler()
  return handler.createErrorBoundary(Component, FallbackComponent)
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling(asyncFunction, context) {
  const handler = getErrorHandler()
  return handler.wrapAsync(asyncFunction, context)
}

/**
 * Create safe event handler
 */
export function createSafeHandler(handler, context) {
  const errorHandler = getErrorHandler()
  return errorHandler.createSafeEventHandler(handler, context)
}