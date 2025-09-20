# Comprehensive Error Handling and Recovery System

This guide explains how to use the comprehensive error handling and recovery system implemented for the AI-powered PDF extraction application.

## Overview

The error handling system consists of three main components:

1. **ErrorHandler** - Core error handling, classification, and user notification
2. **RecoveryManager** - Automated recovery strategies for different types of failures
3. **ErrorIntegration** - Integration layer that connects error handling with existing components

## Quick Start

### Basic Setup

```javascript
import { initializeErrorIntegration } from './utils/errorIntegration.js'
import { getCurrentConfig } from './config/errorConfig.js'

// Initialize the error handling system
const config = getCurrentConfig()
const errorIntegration = await initializeErrorIntegration(config)
```

### Wrapping Components with Error Handling

```javascript
import { withErrorHandling } from './utils/errorIntegration.js'

// Wrap a PDF processor
const safePDFProcessor = withErrorHandling(originalPDFProcessor, 'pdf')

// Wrap a file upload handler
const safeFileUpload = withErrorHandling(originalUploadHandler, 'upload')

// Wrap an AI processor
const safeAIProcessor = withErrorHandling(originalAIProcessor, 'ai')
```

## Detailed Usage

### 1. Error Handler

The ErrorHandler provides comprehensive error classification, recovery attempts, and user notifications.

#### Basic Error Handling

```javascript
import { handleError } from './utils/errorHandler.js'

try {
  // Your code here
  const result = await processFile(file)
} catch (error) {
  const errorResult = await handleError(error, 'file_processing')
  
  if (errorResult.recovery.finalStatus === 'recovered') {
    // Use recovered data
    return errorResult.data
  } else {
    // Handle unrecoverable error
    showUserError(errorResult.error.userMessage)
  }
}
```

#### Advanced Error Handling

```javascript
import { getErrorHandler } from './utils/errorHandler.js'

const errorHandler = getErrorHandler()

// Handle specific error with context
const errorResult = await errorHandler.handleError({
  type: 'PDF_PARSE_ERROR',
  error: originalError,
  context: 'pdf_processing',
  metadata: {
    fileName: file.name,
    fileSize: file.size,
    processingOptions: options
  }
})
```

#### Error Statistics

```javascript
const stats = errorHandler.getErrorStatistics()
console.log('Total errors:', stats.totalErrors)
console.log('Recovery rate:', stats.recoveryRate + '%')
console.log('Common errors:', stats.commonErrors)
```

### 2. Recovery Manager

The RecoveryManager handles automated recovery strategies for different types of failures.

#### PDF Processing Recovery

```javascript
import { getRecoveryManager } from './utils/recoveryManager.js'

const recoveryManager = getRecoveryManager()

// Attempt PDF processing recovery
const recoveryResult = await recoveryManager.executeRecovery('pdf_processing', error, {
  file: pdfFile,
  options: processingOptions
})

if (recoveryResult.success) {
  console.log('Recovery successful:', recoveryResult.finalMethod)
  return recoveryResult.data
}
```

#### Network Recovery

```javascript
// Attempt network recovery
const recoveryResult = await recoveryManager.executeRecovery('network', error, {
  url: requestUrl,
  method: 'POST',
  originalRequest: requestData
})
```

#### Storage Recovery

```javascript
// Attempt storage recovery
const recoveryResult = await recoveryManager.executeRecovery('storage', error, {
  operation: 'save',
  key: storageKey,
  data: dataToStore
})
```

### 3. Error Integration

The ErrorIntegration provides seamless integration with existing components.

#### PDF Processing Integration

```javascript
import { getErrorIntegration } from './utils/errorIntegration.js'

const integration = getErrorIntegration()
const pdfIntegration = integration.getIntegration('pdf_processing')

// Wrap PDF processor with comprehensive error handling
const safePDFProcessor = pdfIntegration.wrapPDFProcessor(async (file, options) => {
  // Your PDF processing logic
  return await processPDF(file, options)
})

// Use the wrapped processor
try {
  const result = await safePDFProcessor(file, { quality: 0.8 })
  console.log('Questions extracted:', result.questions)
} catch (error) {
  // Error has been handled automatically
  console.log('PDF processing failed:', error.message)
}
```

#### File Upload Integration

```javascript
const fileIntegration = integration.getIntegration('file_upload')

// Wrap file upload handler
const safeFileUpload = fileIntegration.wrapFileUpload(async (file, event) => {
  // Your file upload logic
  return await uploadFile(file)
})

// Use in event handler
document.getElementById('file-input').addEventListener('change', safeFileUpload)
```

#### AI Processing Integration

```javascript
const aiIntegration = integration.getIntegration('ai_processing')

// Wrap AI processor
const safeAIProcessor = aiIntegration.wrapAIProcessor(async (text, options) => {
  // Your AI processing logic
  return await extractQuestions(text, options)
})

// Use the wrapped processor
const questions = await safeAIProcessor(pdfText, { model: 'gemini-pro' })
```

## Error Types and Classifications

### Network Errors
- `CONNECTION_FAILED` - Network connection issues
- `TIMEOUT` - Request timeout
- `API_RATE_LIMIT` - API rate limiting
- `SERVER_ERROR` - Server-side errors
- `UNAUTHORIZED_ACCESS` - Authentication/authorization failures

### File Errors
- `FILE_NOT_FOUND` - File doesn't exist
- `FILE_TOO_LARGE` - File exceeds size limit
- `INVALID_FILE_TYPE` - Unsupported file type
- `CORRUPTED_FILE` - File is damaged or corrupted

### Processing Errors
- `PDF_PARSE_ERROR` - PDF parsing failures
- `EXTRACTION_FAILED` - AI extraction failures
- `INSUFFICIENT_MEMORY` - Memory limitations
- `PROCESSING_TIMEOUT` - Processing takes too long

### Validation Errors
- `INVALID_JSON` - JSON format issues
- `SCHEMA_VIOLATION` - Data doesn't match schema
- `MISSING_REQUIRED_FIELDS` - Required data missing

### Security Errors
- `ENCRYPTION_FAILED` - Encryption/decryption issues
- `API_KEY_INVALID` - Invalid API credentials

### System Errors
- `BROWSER_NOT_SUPPORTED` - Browser compatibility issues
- `STORAGE_QUOTA_EXCEEDED` - Storage space full
- `WORKER_FAILED` - Web Worker crashes

## Recovery Strategies

### Automatic Recovery
The system automatically attempts recovery using various strategies:

1. **Retry with Backoff** - Retry failed operations with increasing delays
2. **Fallback Methods** - Use alternative processing methods
3. **Quality Reduction** - Reduce processing quality to save resources
4. **Offline Mode** - Switch to offline processing when network fails
5. **Data Cleanup** - Free storage space when quota exceeded
6. **Auto-fix Data** - Automatically fix common data format issues

### Manual Recovery
Some errors require user intervention:

1. **File Selection** - Prompt user to select a different file
2. **API Key Update** - Request new API credentials
3. **Manual Extraction** - Guide user through manual question extraction

## Configuration

### Basic Configuration

```javascript
import { errorConfig } from './config/errorConfig.js'

// Customize error handling behavior
const customConfig = {
  ...errorConfig,
  errorHandler: {
    ...errorConfig.errorHandler,
    notifications: {
      enabled: true,
      maxNotifications: 3,
      defaultDuration: 3000
    }
  }
}
```

### Environment-Specific Configuration

```javascript
import { getErrorConfig } from './config/errorConfig.js'

// Get configuration for current environment
const config = getErrorConfig() // Uses NODE_ENV

// Get configuration for specific environment
const prodConfig = getErrorConfig('production')
const devConfig = getErrorConfig('development')
```

### Component-Specific Configuration

```javascript
import { createComponentConfig } from './config/errorConfig.js'

// Create configuration for PDF processor
const pdfConfig = createComponentConfig('pdf-processor', {
  maxRetries: 5,
  processingTimeout: 60000
})

// Create configuration for file uploader
const uploadConfig = createComponentConfig('file-uploader', {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ['application/pdf', 'image/pdf']
})
```

## Best Practices

### 1. Wrap All External Operations

```javascript
// Always wrap operations that can fail
const safeOperation = withErrorHandling(riskyOperation, 'operation_type')
```

### 2. Provide Context

```javascript
// Include relevant context when handling errors
await handleError(error, 'pdf_processing', {
  fileName: file.name,
  fileSize: file.size,
  userAction: 'upload'
})
```

### 3. Handle Recovery Results

```javascript
const result = await handleError(error, context)

if (result.recovery.finalStatus === 'recovered') {
  // Use recovered data
  return result.data
} else if (result.recovery.finalStatus === 'failed') {
  // Show user-friendly error message
  showError(result.error.userMessage)
} else {
  // Handle partial recovery or user input required
  handlePartialRecovery(result)
}
```

### 4. Monitor Error Statistics

```javascript
// Regularly check error statistics
const stats = errorHandler.getErrorStatistics()

if (stats.recoveryRate < 70) {
  console.warn('Low recovery rate detected:', stats.recoveryRate + '%')
}

// Log common errors for analysis
stats.commonErrors.forEach(({ type, count }) => {
  console.log(`Common error: ${type} (${count} occurrences)`)
})
```

### 5. Test Error Scenarios

```javascript
// In development, test error scenarios
if (process.env.NODE_ENV === 'development') {
  // Simulate network errors
  if (Math.random() < 0.1) {
    throw new Error('Simulated network error')
  }
}
```

## Testing

### Unit Tests

```javascript
import { describe, test, expect } from 'vitest'
import { ErrorHandler } from './utils/errorHandler.js'

describe('Error Handling', () => {
  test('should classify PDF errors correctly', async () => {
    const errorHandler = new ErrorHandler()
    await errorHandler.initialize()
    
    const result = await errorHandler.handleError({
      type: 'PDF_PARSE_ERROR',
      message: 'Failed to parse PDF',
      context: 'pdf_processing'
    })
    
    expect(result.error.category).toBe('processing')
    expect(result.error.recoverable).toBe(true)
  })
})
```

### Integration Tests

```javascript
test('should recover from PDF processing errors', async () => {
  const integration = await initializeErrorIntegration()
  const pdfProcessor = integration.getIntegration('pdf_processing')
  
  const mockProcessor = vi.fn().mockRejectedValue(new Error('PDF parse failed'))
  const wrappedProcessor = pdfProcessor.wrapPDFProcessor(mockProcessor)
  
  const result = await wrappedProcessor(mockFile)
  
  expect(result.recovery).toBeDefined()
  expect(result.recovery.attempted.length).toBeGreaterThan(0)
})
```

## Monitoring and Debugging

### Health Checks

```javascript
// Perform system health check
const health = await errorIntegration.performHealthCheck()

console.log('System health:', health.overall)
console.log('Issues:', health.issues)
```

### Error Export/Import

```javascript
// Export error data for analysis
const errorData = errorHandler.exportErrorData()
console.log('Error history:', errorData.errorHistory)

// Import error data (for testing)
errorHandler.importErrorData(testErrorData)
```

### Performance Monitoring

```javascript
// Monitor system performance
errorHandler.monitorPerformance()

// Check system health regularly
setInterval(async () => {
  const health = await errorHandler.checkSystemHealth()
  
  if (health.memory.usagePercentage > 90) {
    console.warn('High memory usage detected')
  }
}, 60000) // Check every minute
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Enable data cleanup in recovery manager
   - Reduce error history retention
   - Use data compression

2. **Low Recovery Rate**
   - Review recovery strategies
   - Add more fallback methods
   - Improve error classification

3. **Too Many Notifications**
   - Reduce notification duration
   - Limit maximum notifications
   - Group similar errors

4. **Performance Impact**
   - Disable performance monitoring in production
   - Reduce error reporting frequency
   - Use async error handling

### Debug Mode

```javascript
// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  const config = {
    ...errorConfig,
    debug: {
      showErrorBoundaries: true,
      highlightRecoveredErrors: true,
      enableErrorInjection: true
    }
  }
}
```

## API Reference

### ErrorHandler Methods

- `initialize(options)` - Initialize error handler
- `handleError(errorInfo)` - Handle and classify error
- `getErrorStatistics()` - Get error statistics
- `clearErrorHistory()` - Clear error history
- `exportErrorData()` - Export error data
- `checkSystemHealth()` - Check system health

### RecoveryManager Methods

- `initialize()` - Initialize recovery manager
- `executeRecovery(category, error, options)` - Execute recovery
- `getRecoveryStatistics()` - Get recovery statistics

### ErrorIntegration Methods

- `initialize(config)` - Initialize integration system
- `getIntegration(name)` - Get specific integration
- `performHealthCheck()` - Check system health
- `getIntegrationStatistics()` - Get integration statistics

This comprehensive error handling system provides robust error management, automatic recovery, and seamless integration with your existing PDF processing application.