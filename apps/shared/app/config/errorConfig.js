/**
 * Error Handling Configuration
 * Configuration settings for the comprehensive error handling and recovery system
 */

export const errorConfig = {
  // Error Handler Configuration
  errorHandler: {
    // Error reporting configuration
    reporting: {
      enabled: process.env.NODE_ENV === 'production',
      endpoint: process.env.ERROR_REPORTING_ENDPOINT || '/api/errors',
      apiKey: process.env.ERROR_REPORTING_API_KEY,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      includeStackTrace: true,
      includeUserAgent: true,
      includeUrl: true
    },

    // User notification configuration
    notifications: {
      enabled: true,
      maxNotifications: 5,
      defaultDuration: 5000,
      position: 'top-right',
      showTechnicalDetails: process.env.NODE_ENV === 'development'
    },

    // Performance monitoring
    performance: {
      enabled: true,
      slowOperationThreshold: 5000, // 5 seconds
      memoryWarningThreshold: 0.9, // 90% of heap limit
      monitorNetworkRequests: true,
      monitorComponentRenders: true
    },

    // Global error handling
    global: {
      handleUnhandledRejections: true,
      handleJavaScriptErrors: true,
      handleResourceLoadErrors: true,
      preventDefaultErrorHandling: false
    }
  },

  // Recovery Manager Configuration
  recoveryManager: {
    // PDF Processing Recovery
    pdfProcessing: {
      maxRetries: 3,
      retryDelay: 1000,
      fallbackParsers: ['pdf-lib', 'pdfjs-dist', 'pdf2pic'],
      ocrFallback: {
        enabled: true,
        engine: 'tesseract',
        quality: 0.8
      },
      qualityReduction: {
        enabled: true,
        steps: [0.9, 0.7, 0.5],
        minQuality: 0.3
      }
    },

    // Network Recovery
    network: {
      retryPolicy: 'exponential_backoff',
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      timeoutMultiplier: 2,
      offlineMode: {
        enabled: true,
        cacheRequests: true,
        maxCacheSize: 100
      }
    },

    // Storage Recovery
    storage: {
      cleanupPolicy: {
        enabled: true,
        retentionDays: 7,
        maxStorageUsage: 0.8 // 80% of quota
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        threshold: 1024 // 1KB
      },
      fallbackStorage: ['indexeddb', 'localstorage', 'sessionstorage', 'memory']
    },

    // Data Validation Recovery
    validation: {
      autoFix: {
        enabled: true,
        strictMode: false,
        fillMissingFields: true,
        useDefaults: true
      },
      partialData: {
        enabled: true,
        minCompleteness: 0.5 // 50%
      }
    },

    // Worker Recovery
    worker: {
      restartPolicy: {
        maxAttempts: 2,
        restartDelay: 1000
      },
      fallbackToMainThread: {
        enabled: true,
        performanceWarning: true
      }
    }
  },

  // Integration Configuration
  integrations: {
    // PDF Processing Integration
    pdfProcessing: {
      enabled: true,
      validateInput: true,
      validateOutput: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      supportedTypes: ['application/pdf'],
      processingTimeout: 30000 // 30 seconds
    },

    // File Upload Integration
    fileUpload: {
      enabled: true,
      validation: {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['application/pdf'],
        requireFileName: true,
        scanForMalware: false
      },
      upload: {
        chunkSize: 1024 * 1024, // 1MB chunks
        maxConcurrentUploads: 3,
        retryFailedChunks: true
      }
    },

    // AI Processing Integration
    aiProcessing: {
      enabled: true,
      apiConfig: {
        timeout: 30000,
        retries: 2,
        rateLimitHandling: true
      },
      fallbacks: {
        ruleBasedExtraction: true,
        templateMatching: true,
        manualExtraction: true
      },
      validation: {
        validateInput: true,
        validateOutput: true,
        minConfidence: 0.7
      }
    },

    // Storage Integration
    storage: {
      enabled: true,
      encryption: {
        enabled: true,
        algorithm: 'AES-GCM',
        keyRotation: true
      },
      backup: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000, // 24 hours
        maxBackups: 7
      },
      sync: {
        enabled: false,
        endpoint: process.env.STORAGE_SYNC_ENDPOINT,
        interval: 5 * 60 * 1000 // 5 minutes
      }
    },

    // UI Integration
    ui: {
      enabled: true,
      errorBoundaries: {
        enabled: true,
        fallbackComponent: '#layers/shared/app/components/Base/DefaultErrorFallback',
        resetOnPropsChange: true
      },
      notifications: {
        enabled: true,
        position: 'top-right',
        maxVisible: 3,
        autoClose: true,
        closeDelay: 5000
      },
      debugging: {
        showErrorDetails: process.env.NODE_ENV === 'development',
        enableErrorOverlay: process.env.NODE_ENV === 'development'
      }
    },

    // Network Integration
    network: {
      enabled: true,
      timeout: 10000, // 10 seconds
      retries: 2,
      caching: {
        enabled: true,
        maxAge: 5 * 60 * 1000, // 5 minutes
        maxSize: 50 // 50 cached responses
      },
      offline: {
        enabled: true,
        queueRequests: true,
        maxQueueSize: 100
      }
    }
  },

  // Development Configuration
  development: {
    // Enhanced logging in development
    logging: {
      level: 'debug',
      includeStackTrace: true,
      colorOutput: true,
      logToConsole: true,
      logToFile: false
    },

    // Development tools
    tools: {
      errorSimulation: true,
      recoveryTesting: true,
      performanceMonitoring: true,
      errorStatistics: true
    },

    // Debug features
    debug: {
      showErrorBoundaries: true,
      highlightRecoveredErrors: true,
      showRecoveryAttempts: true,
      enableErrorInjection: true
    }
  },

  // Production Configuration
  production: {
    // Minimal logging in production
    logging: {
      level: 'error',
      includeStackTrace: false,
      colorOutput: false,
      logToConsole: false,
      logToFile: true
    },

    // Production optimizations
    optimizations: {
      minifyErrorMessages: true,
      compressErrorData: true,
      batchErrorReports: true,
      limitErrorHistory: 100
    },

    // Security settings
    security: {
      sanitizeErrorMessages: true,
      excludeSensitiveData: true,
      encryptErrorReports: true,
      validateErrorSources: true
    }
  }
}

/**
 * Get configuration based on environment
 */
export function getErrorConfig(environment = process.env.NODE_ENV) {
  const baseConfig = { ...errorConfig }
  
  // Apply environment-specific overrides
  if (environment === 'development') {
    return mergeConfig(baseConfig, errorConfig.development)
  } else if (environment === 'production') {
    return mergeConfig(baseConfig, errorConfig.production)
  }
  
  return baseConfig
}

/**
 * Merge configuration objects
 */
function mergeConfig(base, override) {
  const merged = { ...base }
  
  Object.keys(override).forEach(key => {
    if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
      merged[key] = mergeConfig(merged[key] || {}, override[key])
    } else {
      merged[key] = override[key]
    }
  })
  
  return merged
}

/**
 * Validate configuration
 */
export function validateErrorConfig(config) {
  const errors = []
  
  // Validate required fields
  if (!config.errorHandler) {
    errors.push('errorHandler configuration is required')
  }
  
  if (!config.recoveryManager) {
    errors.push('recoveryManager configuration is required')
  }
  
  if (!config.integrations) {
    errors.push('integrations configuration is required')
  }
  
  // Validate error reporting
  if (config.errorHandler?.reporting?.enabled) {
    if (!config.errorHandler.reporting.endpoint) {
      errors.push('Error reporting endpoint is required when reporting is enabled')
    }
  }
  
  // Validate file size limits
  const maxFileSize = config.integrations?.fileUpload?.validation?.maxSize
  if (maxFileSize && maxFileSize > 100 * 1024 * 1024) {
    errors.push('Maximum file size should not exceed 100MB')
  }
  
  // Validate timeout values
  const timeouts = [
    config.integrations?.pdfProcessing?.processingTimeout,
    config.integrations?.aiProcessing?.apiConfig?.timeout,
    config.integrations?.network?.timeout
  ]
  
  timeouts.forEach((timeout, index) => {
    if (timeout && (timeout < 1000 || timeout > 300000)) {
      errors.push(`Timeout value ${index + 1} should be between 1 second and 5 minutes`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors: errors
  }
}

/**
 * Create configuration for specific component
 */
export function createComponentConfig(componentType, overrides = {}) {
  const baseConfig = getErrorConfig()
  
  switch (componentType) {
    case 'pdf-processor':
      return {
        errorHandler: baseConfig.errorHandler,
        recovery: baseConfig.recoveryManager.pdfProcessing,
        integration: baseConfig.integrations.pdfProcessing,
        ...overrides
      }
    
    case 'file-uploader':
      return {
        errorHandler: baseConfig.errorHandler,
        recovery: baseConfig.recoveryManager.network,
        integration: baseConfig.integrations.fileUpload,
        ...overrides
      }
    
    case 'ai-processor':
      return {
        errorHandler: baseConfig.errorHandler,
        recovery: baseConfig.recoveryManager.network,
        integration: baseConfig.integrations.aiProcessing,
        ...overrides
      }
    
    case 'storage-manager':
      return {
        errorHandler: baseConfig.errorHandler,
        recovery: baseConfig.recoveryManager.storage,
        integration: baseConfig.integrations.storage,
        ...overrides
      }
    
    default:
      return {
        errorHandler: baseConfig.errorHandler,
        ...overrides
      }
  }
}

/**
 * Environment-specific configurations
 */
export const environmentConfigs = {
  development: {
    errorHandler: {
      reporting: { enabled: false },
      notifications: { showTechnicalDetails: true }
    },
    logging: { level: 'debug' },
    debug: { enableErrorInjection: true }
  },
  
  test: {
    errorHandler: {
      reporting: { enabled: false },
      notifications: { enabled: false }
    },
    logging: { level: 'warn' },
    integrations: {
      pdfProcessing: { processingTimeout: 5000 },
      aiProcessing: { apiConfig: { timeout: 5000 } }
    }
  },
  
  staging: {
    errorHandler: {
      reporting: { enabled: true, batchSize: 5 }
    },
    logging: { level: 'info' },
    optimizations: { limitErrorHistory: 50 }
  },
  
  production: {
    errorHandler: {
      reporting: { enabled: true }
    },
    logging: { level: 'error' },
    security: { sanitizeErrorMessages: true },
    optimizations: { 
      minifyErrorMessages: true,
      limitErrorHistory: 100 
    }
  }
}

/**
 * Get configuration for current environment
 */
export function getCurrentConfig() {
  const environment = process.env.NODE_ENV || 'development'
  return getErrorConfig(environment)
}

export default errorConfig