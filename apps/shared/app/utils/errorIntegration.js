/**
 * Error Integration Module
 * Integrates error handling system with existing PDF processing components
 */

import { getErrorHandler, initializeErrorHandler } from './errorHandler.js'
import { getRecoveryManager, initializeRecoveryManager } from './recoveryManager.js'

export class ErrorIntegration {
  constructor() {
    this.errorHandler = null
    this.recoveryManager = null
    this.integrations = new Map()
    this.isInitialized = false
  }

  /**
   * Initialize error integration system
   */
  async initialize(config = {}) {
    try {
      // Initialize error handler
      this.errorHandler = await initializeErrorHandler(config.errorHandler)
      
      // Initialize recovery manager
      this.recoveryManager = await initializeRecoveryManager()
      
      // Setup integrations
      await this.setupIntegrations(config.integrations)
      
      this.isInitialized = true
      console.log('Error integration system initialized successfully')
      
      return true
    } catch (error) {
      console.error('Failed to initialize error integration system:', error)
      return false
    }
  }

  /**
   * Setup integrations with existing components
   */
  async setupIntegrations(integrationConfig = {}) {
    // PDF Processing Integration
    this.integrations.set('pdf_processing', {
      wrapPDFProcessor: this.wrapPDFProcessor.bind(this),
      handlePDFError: this.handlePDFError.bind(this),
      recoverPDFProcessing: this.recoverPDFProcessing.bind(this)
    })

    // File Upload Integration
    this.integrations.set('file_upload', {
      wrapFileUpload: this.wrapFileUpload.bind(this),
      handleFileError: this.handleFileError.bind(this),
      validateFile: this.validateFile.bind(this)
    })

    // AI Processing Integration
    this.integrations.set('ai_processing', {
      wrapAIProcessor: this.wrapAIProcessor.bind(this),
      handleAIError: this.handleAIError.bind(this),
      recoverAIProcessing: this.recoverAIProcessing.bind(this)
    })

    // Storage Integration
    this.integrations.set('storage', {
      wrapStorageOperations: this.wrapStorageOperations.bind(this),
      handleStorageError: this.handleStorageError.bind(this),
      recoverStorage: this.recoverStorage.bind(this)
    })

    // UI Integration
    this.integrations.set('ui', {
      wrapUIComponents: this.wrapUIComponents.bind(this),
      handleUIError: this.handleUIError.bind(this),
      showErrorNotification: this.showErrorNotification.bind(this)
    })

    // Network Integration
    this.integrations.set('network', {
      wrapNetworkRequests: this.wrapNetworkRequests.bind(this),
      handleNetworkError: this.handleNetworkError.bind(this),
      recoverNetworkConnection: this.recoverNetworkConnection.bind(this)
    })
  }

  /**
   * PDF Processing Integration Methods
   */
  wrapPDFProcessor(processor) {
    return this.errorHandler.wrapAsync(async (file, options = {}) => {
      try {
        // Validate file before processing
        await this.validateFile(file, { type: 'pdf' })
        
        // Process PDF with error handling
        const result = await processor(file, options)
        
        // Validate result
        if (!result || !result.questions || result.questions.length === 0) {
          throw new Error('PDF processing returned no questions')
        }
        
        return result
      } catch (error) {
        // Handle PDF-specific errors
        return await this.handlePDFError(error, { file, options, processor })
      }
    }, 'pdf_processing')
  }

  async handlePDFError(error, context) {
    const errorInfo = {
      type: this.classifyPDFError(error),
      error: error,
      context: 'pdf_processing',
      metadata: {
        fileName: context.file?.name,
        fileSize: context.file?.size,
        fileType: context.file?.type,
        processingOptions: context.options
      }
    }

    const result = await this.errorHandler.handleError(errorInfo)
    
    // Attempt PDF-specific recovery
    if (result.recovery.finalStatus === 'failed') {
      const recoveryResult = await this.recoverPDFProcessing(error, context)
      if (recoveryResult.success) {
        result.recovery = recoveryResult
        result.data = recoveryResult.data
      }
    }
    
    return result
  }

  async recoverPDFProcessing(error, context) {
    return await this.recoveryManager.executeRecovery('pdf_processing', error, {
      file: context.file,
      options: context.options,
      originalProcessor: context.processor
    })
  }

  classifyPDFError(error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('corrupted') || message.includes('invalid pdf')) {
      return 'CORRUPTED_FILE'
    }
    if (message.includes('password') || message.includes('encrypted')) {
      return 'ENCRYPTED_PDF'
    }
    if (message.includes('memory') || message.includes('heap')) {
      return 'INSUFFICIENT_MEMORY'
    }
    if (message.includes('timeout')) {
      return 'PROCESSING_TIMEOUT'
    }
    if (message.includes('parse') || message.includes('read')) {
      return 'PDF_PARSE_ERROR'
    }
    
    return 'PDF_PROCESSING_ERROR'
  }

  /**
   * File Upload Integration Methods
   */
  wrapFileUpload(uploadHandler) {
    return this.errorHandler.createSafeEventHandler(async (event) => {
      const files = event.target.files || event.dataTransfer?.files
      
      if (!files || files.length === 0) {
        throw new Error('No files selected')
      }
      
      const file = files[0]
      
      try {
        // Validate file
        await this.validateFile(file)
        
        // Process upload
        return await uploadHandler(file, event)
      } catch (error) {
        return await this.handleFileError(error, { file, event })
      }
    }, 'file_upload')
  }

  async validateFile(file, options = {}) {
    const validations = []
    
    // Check file existence
    if (!file) {
      throw new Error('FILE_NOT_FOUND')
    }
    
    // Check file type
    if (options.type === 'pdf' && file.type !== 'application/pdf') {
      throw new Error('INVALID_FILE_TYPE')
    }
    
    // Check file size (default 50MB limit)
    const maxSize = options.maxSize || 50 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('FILE_TOO_LARGE')
    }
    
    // Check file name
    if (!file.name || file.name.trim() === '') {
      throw new Error('INVALID_FILE_NAME')
    }
    
    // Additional validations can be added here
    
    return { valid: true, validations }
  }

  async handleFileError(error, context) {
    const errorInfo = {
      type: this.classifyFileError(error),
      error: error,
      context: 'file_upload',
      metadata: {
        fileName: context.file?.name,
        fileSize: context.file?.size,
        fileType: context.file?.type
      }
    }

    return await this.errorHandler.handleError(errorInfo)
  }

  classifyFileError(error) {
    const message = error.message
    
    if (message.includes('FILE_NOT_FOUND')) return 'FILE_NOT_FOUND'
    if (message.includes('INVALID_FILE_TYPE')) return 'INVALID_FILE_TYPE'
    if (message.includes('FILE_TOO_LARGE')) return 'FILE_TOO_LARGE'
    if (message.includes('INVALID_FILE_NAME')) return 'INVALID_FILE_NAME'
    
    return 'FILE_UPLOAD_ERROR'
  }

  /**
   * AI Processing Integration Methods
   */
  wrapAIProcessor(aiProcessor) {
    return this.errorHandler.wrapAsync(async (text, options = {}) => {
      try {
        // Validate input
        if (!text || text.trim() === '') {
          throw new Error('Empty text provided for AI processing')
        }
        
        // Process with AI
        const result = await aiProcessor(text, options)
        
        // Validate AI result
        if (!result) {
          throw new Error('AI processing returned no result')
        }
        
        return result
      } catch (error) {
        return await this.handleAIError(error, { text, options, aiProcessor })
      }
    }, 'ai_processing')
  }

  async handleAIError(error, context) {
    const errorInfo = {
      type: this.classifyAIError(error),
      error: error,
      context: 'ai_processing',
      metadata: {
        textLength: context.text?.length,
        processingOptions: context.options
      }
    }

    const result = await this.errorHandler.handleError(errorInfo)
    
    // Attempt AI-specific recovery
    if (result.recovery.finalStatus === 'failed') {
      const recoveryResult = await this.recoverAIProcessing(error, context)
      if (recoveryResult.success) {
        result.recovery = recoveryResult
        result.data = recoveryResult.data
      }
    }
    
    return result
  }

  async recoverAIProcessing(error, context) {
    return await this.recoveryManager.executeRecovery('processing', error, {
      text: context.text,
      options: context.options,
      originalProcessor: context.aiProcessor
    })
  }

  classifyAIError(error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('api key') || message.includes('unauthorized')) {
      return 'API_KEY_INVALID'
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'API_RATE_LIMIT'
    }
    if (message.includes('timeout')) {
      return 'PROCESSING_TIMEOUT'
    }
    if (message.includes('extraction')) {
      return 'EXTRACTION_FAILED'
    }
    
    return 'AI_PROCESSING_ERROR'
  }

  /**
   * Storage Integration Methods
   */
  wrapStorageOperations(storageManager) {
    const wrappedOperations = {}
    
    // Wrap each storage operation
    const operations = ['save', 'load', 'delete', 'list', 'clear']
    
    operations.forEach(operation => {
      if (typeof storageManager[operation] === 'function') {
        wrappedOperations[operation] = this.errorHandler.wrapAsync(
          storageManager[operation].bind(storageManager),
          `storage_${operation}`
        )
      }
    })
    
    return wrappedOperations
  }

  async handleStorageError(error, context) {
    const errorInfo = {
      type: this.classifyStorageError(error),
      error: error,
      context: 'storage',
      metadata: {
        operation: context.operation,
        key: context.key,
        dataSize: context.data ? JSON.stringify(context.data).length : 0
      }
    }

    const result = await this.errorHandler.handleError(errorInfo)
    
    // Attempt storage-specific recovery
    if (result.recovery.finalStatus === 'failed') {
      const recoveryResult = await this.recoverStorage(error, context)
      if (recoveryResult.success) {
        result.recovery = recoveryResult
        result.data = recoveryResult.data
      }
    }
    
    return result
  }

  async recoverStorage(error, context) {
    return await this.recoveryManager.executeRecovery('storage', error, {
      operation: context.operation,
      key: context.key,
      data: context.data
    })
  }

  classifyStorageError(error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('quota') || message.includes('storage full')) {
      return 'STORAGE_QUOTA_EXCEEDED'
    }
    if (message.includes('not found') || message.includes('missing')) {
      return 'STORAGE_KEY_NOT_FOUND'
    }
    if (message.includes('permission') || message.includes('access')) {
      return 'STORAGE_ACCESS_DENIED'
    }
    if (message.includes('encryption') || message.includes('decrypt')) {
      return 'ENCRYPTION_FAILED'
    }
    
    return 'STORAGE_ERROR'
  }

  /**
   * UI Integration Methods
   */
  wrapUIComponents(componentMap) {
    const wrappedComponents = {}
    
    Object.entries(componentMap).forEach(([name, component]) => {
      wrappedComponents[name] = this.errorHandler.createErrorBoundary(
        component,
        this.createErrorFallback(name)
      )
    })
    
    return wrappedComponents
  }

  createErrorFallback(componentName) {
    return (error, errorInfo) => {
      // Log the error
      this.handleUIError(error, { componentName, errorInfo })
      
      // Return fallback UI
      return {
        type: 'div',
        props: {
          className: 'error-fallback',
          children: [
            {
              type: 'h3',
              props: { children: 'Something went wrong' }
            },
            {
              type: 'p',
              props: { children: 'Please refresh the page and try again.' }
            },
            {
              type: 'button',
              props: {
                onClick: () => window.location.reload(),
                children: 'Refresh Page'
              }
            }
          ]
        }
      }
    }
  }

  async handleUIError(error, context) {
    const errorInfo = {
      type: 'COMPONENT_ERROR',
      error: error,
      context: 'ui_component',
      metadata: {
        componentName: context.componentName,
        componentStack: context.errorInfo?.componentStack
      }
    }

    const result = await this.errorHandler.handleError(errorInfo)
    
    // Show user notification
    this.showErrorNotification({
      title: 'Component Error',
      message: 'A component encountered an error and has been reset.',
      type: 'warning',
      duration: 5000
    })
    
    return result
  }

  showErrorNotification(notification) {
    // This would integrate with the UI notification system
    console.log('Error Notification:', notification)
    
    // Example integration with a notification system
    if (window.showNotification) {
      window.showNotification(notification)
    }
  }

  /**
   * Network Integration Methods
   */
  wrapNetworkRequests(networkManager) {
    const wrappedMethods = {}
    
    // Wrap common HTTP methods
    const methods = ['get', 'post', 'put', 'delete', 'patch']
    
    methods.forEach(method => {
      if (typeof networkManager[method] === 'function') {
        wrappedMethods[method] = this.errorHandler.wrapAsync(
          networkManager[method].bind(networkManager),
          `network_${method}`
        )
      }
    })
    
    return wrappedMethods
  }

  async handleNetworkError(error, context) {
    const errorInfo = {
      type: this.classifyNetworkError(error),
      error: error,
      context: 'network_request',
      metadata: {
        url: context.url,
        method: context.method,
        status: context.response?.status,
        statusText: context.response?.statusText
      }
    }

    const result = await this.errorHandler.handleError(errorInfo)
    
    // Attempt network-specific recovery
    if (result.recovery.finalStatus === 'failed') {
      const recoveryResult = await this.recoverNetworkConnection(error, context)
      if (recoveryResult.success) {
        result.recovery = recoveryResult
        result.data = recoveryResult.data
      }
    }
    
    return result
  }

  async recoverNetworkConnection(error, context) {
    return await this.recoveryManager.executeRecovery('network', error, {
      url: context.url,
      method: context.method,
      originalRequest: context.originalRequest
    })
  }

  classifyNetworkError(error) {
    const message = error.message.toLowerCase()
    const status = error.status || error.response?.status
    
    if (!navigator.onLine) {
      return 'CONNECTION_FAILED'
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT'
    }
    if (status === 429) {
      return 'API_RATE_LIMIT'
    }
    if (status >= 500) {
      return 'SERVER_ERROR'
    }
    if (status === 401 || status === 403) {
      return 'UNAUTHORIZED_ACCESS'
    }
    
    return 'NETWORK_ERROR'
  }

  /**
   * Get integration for specific component
   */
  getIntegration(name) {
    return this.integrations.get(name)
  }

  /**
   * Get all available integrations
   */
  getAvailableIntegrations() {
    return Array.from(this.integrations.keys())
  }

  /**
   * Get error statistics across all integrations
   */
  getIntegrationStatistics() {
    const errorStats = this.errorHandler.getErrorStatistics()
    const recoveryStats = this.recoveryManager.getRecoveryStatistics()
    
    return {
      errors: errorStats,
      recoveries: recoveryStats,
      integrations: {
        total: this.integrations.size,
        active: Array.from(this.integrations.keys())
      }
    }
  }

  /**
   * Health check for all integrations
   */
  async performHealthCheck() {
    const health = {
      timestamp: Date.now(),
      overall: 'healthy',
      components: {},
      issues: []
    }

    // Check error handler health
    try {
      const systemHealth = await this.errorHandler.checkSystemHealth()
      health.components.errorHandler = {
        status: 'healthy',
        details: systemHealth
      }
    } catch (error) {
      health.components.errorHandler = {
        status: 'unhealthy',
        error: error.message
      }
      health.issues.push('Error handler health check failed')
    }

    // Check recovery manager health
    try {
      const recoveryStats = this.recoveryManager.getRecoveryStatistics()
      health.components.recoveryManager = {
        status: 'healthy',
        details: recoveryStats
      }
    } catch (error) {
      health.components.recoveryManager = {
        status: 'unhealthy',
        error: error.message
      }
      health.issues.push('Recovery manager health check failed')
    }

    // Check integration health
    health.components.integrations = {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      count: this.integrations.size,
      active: Array.from(this.integrations.keys())
    }

    // Determine overall health
    const unhealthyComponents = Object.values(health.components)
      .filter(component => component.status === 'unhealthy')
    
    if (unhealthyComponents.length > 0) {
      health.overall = 'degraded'
    }
    
    if (unhealthyComponents.length === Object.keys(health.components).length) {
      health.overall = 'unhealthy'
    }

    return health
  }
}

// Create singleton instance
let errorIntegrationInstance = null

/**
 * Get error integration singleton
 */
export function getErrorIntegration() {
  if (!errorIntegrationInstance) {
    errorIntegrationInstance = new ErrorIntegration()
  }
  return errorIntegrationInstance
}

/**
 * Initialize error integration system
 */
export async function initializeErrorIntegration(config = {}) {
  const integration = getErrorIntegration()
  await integration.initialize(config)
  return integration
}

/**
 * Quick integration helpers
 */
export function withErrorHandling(component, type = 'general') {
  const integration = getErrorIntegration()
  
  switch (type) {
    case 'pdf':
      return integration.getIntegration('pdf_processing')?.wrapPDFProcessor(component)
    case 'upload':
      return integration.getIntegration('file_upload')?.wrapFileUpload(component)
    case 'ai':
      return integration.getIntegration('ai_processing')?.wrapAIProcessor(component)
    case 'storage':
      return integration.getIntegration('storage')?.wrapStorageOperations(component)
    case 'network':
      return integration.getIntegration('network')?.wrapNetworkRequests(component)
    case 'ui':
      return integration.getIntegration('ui')?.wrapUIComponents(component)
    default:
      return getErrorHandler().wrapAsync(component, type)
  }
}