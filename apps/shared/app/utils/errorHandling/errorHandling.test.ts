/**
 * Comprehensive Error Handling System Tests
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SystemErrorHandler, type SystemError } from './systemErrorHandler'
import { ProgressTracker, type ProgressStep } from './progressTracker'
import { RetryMechanism } from './retryMechanism'
import { GracefulDegradation } from './gracefulDegradation'
import { executeWithErrorHandling, errorPatterns } from './index'

// Mock fetch for testing
global.fetch = vi.fn()

describe('SystemErrorHandler', () => {
  let errorHandler: SystemErrorHandler

  beforeEach(() => {
    errorHandler = new SystemErrorHandler()
  })

  test('should create error with correct properties', () => {
    const error = errorHandler.createError(
      'API_ERROR',
      'Test error message',
      { component: 'TestComponent', operation: 'testOp' },
      { detail: 'test' },
      'HIGH'
    )

    expect(error.type).toBe('API_ERROR')
    expect(error.message).toBe('Test error message')
    expect(error.severity).toBe('HIGH')
    expect(error.context?.component).toBe('TestComponent')
    expect(error.recoverable).toBe(true)
  })

  test('should handle recoverable errors', async () => {
    const error = errorHandler.createError('API_ERROR', 'Recoverable error')
    const feedbackSpy = vi.fn()
    
    errorHandler.onUserFeedback(feedbackSpy)
    
    const result = await errorHandler.handleError(error)
    
    expect(feedbackSpy).toHaveBeenCalled()
    expect(result).toBe(false) // No recovery strategies set up in test
  })

  test('should show user feedback for errors', async () => {
    const error = errorHandler.createError('VALIDATION_ERROR', 'Invalid input')
    const feedbackSpy = vi.fn()
    
    errorHandler.onUserFeedback(feedbackSpy)
    await errorHandler.handleError(error)
    
    expect(feedbackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WARNING',
        title: 'Data Validation Issue'
      })
    )
  })

  test('should track error statistics', () => {
    const error1 = errorHandler.createError('API_ERROR', 'Error 1')
    const error2 = errorHandler.createError('VALIDATION_ERROR', 'Error 2')
    
    errorHandler.handleError(error1)
    errorHandler.handleError(error2)
    
    const stats = errorHandler.getErrorStatistics()
    
    expect(stats.totalErrors).toBe(2)
    expect(stats.errorsByType['API_ERROR']).toBe(1)
    expect(stats.errorsByType['VALIDATION_ERROR']).toBe(1)
  })
})

describe('ProgressTracker', () => {
  let progressTracker: ProgressTracker

  beforeEach(() => {
    progressTracker = new ProgressTracker()
  })

  test('should start operation tracking', () => {
    const steps: ProgressStep[] = [
      {
        id: 'step1',
        name: 'Step 1',
        description: 'First step',
        weight: 1,
        status: 'pending'
      },
      {
        id: 'step2',
        name: 'Step 2',
        description: 'Second step',
        weight: 1,
        status: 'pending'
      }
    ]

    progressTracker.startOperation('test-op', 'Test Operation', steps)
    
    const state = progressTracker.getOperationState('test-op')
    
    expect(state).toBeDefined()
    expect(state?.operationName).toBe('Test Operation')
    expect(state?.totalSteps).toBe(2)
    expect(state?.status).toBe('running')
  })

  test('should update step progress', () => {
    const steps: ProgressStep[] = [
      {
        id: 'step1',
        name: 'Step 1',
        description: 'First step',
        weight: 1,
        status: 'pending'
      }
    ]

    progressTracker.startOperation('test-op', 'Test Operation', steps)
    progressTracker.updateStep('test-op', 'step1', 'completed')
    
    const state = progressTracker.getOperationState('test-op')
    
    expect(state?.completedSteps).toBe(1)
    expect(state?.overallProgress).toBe(100)
  })

  test('should handle progress callbacks', () => {
    const progressSpy = vi.fn()
    const stepCompleteSpy = vi.fn()

    const steps: ProgressStep[] = [
      {
        id: 'step1',
        name: 'Step 1',
        description: 'First step',
        weight: 1,
        status: 'pending'
      }
    ]

    progressTracker.onProgress('test-op', {
      onProgress: progressSpy,
      onStepComplete: stepCompleteSpy
    })

    progressTracker.startOperation('test-op', 'Test Operation', steps)
    progressTracker.updateStep('test-op', 'step1', 'completed')

    expect(progressSpy).toHaveBeenCalled()
    expect(stepCompleteSpy).toHaveBeenCalled()
  })
})

describe('RetryMechanism', () => {
  let retryMechanism: RetryMechanism

  beforeEach(() => {
    retryMechanism = new RetryMechanism()
  })

  test('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success')
    
    const result = await retryMechanism.executeWithRetry(operation)
    
    expect(result.success).toBe(true)
    expect(result.result).toBe('success')
    expect(result.attempts).toBe(1)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('should retry on failure and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success')
    
    const result = await retryMechanism.executeWithRetry(operation, {
      maxRetries: 3,
      baseDelay: 10
    })
    
    expect(result.success).toBe(true)
    expect(result.result).toBe('success')
    expect(result.attempts).toBe(3)
    expect(operation).toHaveBeenCalledTimes(3)
  })

  test('should fail after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'))
    
    const result = await retryMechanism.executeWithRetry(operation, {
      maxRetries: 2,
      baseDelay: 10
    })
    
    expect(result.success).toBe(false)
    expect(result.error.message).toBe('Persistent failure')
    expect(result.attempts).toBe(3) // Initial attempt + 2 retries
    expect(operation).toHaveBeenCalledTimes(3)
  })

  test('should respect retry condition', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Non-retryable error'))
    
    const result = await retryMechanism.executeWithRetry(operation, {
      maxRetries: 3,
      baseDelay: 10,
      retryCondition: () => false // Never retry
    })
    
    expect(result.success).toBe(false)
    expect(result.attempts).toBe(1)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('should call retry callback', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success')
    
    const retrySpy = vi.fn()
    
    await retryMechanism.executeWithRetry(operation, {
      maxRetries: 2,
      baseDelay: 10,
      onRetry: retrySpy
    })
    
    expect(retrySpy).toHaveBeenCalledWith(1, expect.any(Error))
  })
})

describe('GracefulDegradation', () => {
  let gracefulDegradation: GracefulDegradation

  beforeEach(() => {
    gracefulDegradation = new GracefulDegradation()
  })

  afterEach(() => {
    gracefulDegradation.cleanup()
  })

  test('should register service', () => {
    gracefulDegradation.registerService({
      serviceName: 'test-service',
      healthCheckInterval: 60000,
      failureThreshold: 3,
      recoveryThreshold: 1,
      fallbackStrategies: []
    })

    const status = gracefulDegradation.getServiceStatus('test-service')
    
    expect(status).toBeDefined()
    expect(status?.name).toBe('test-service')
    expect(status?.available).toBe(true)
  })

  test('should execute primary operation when service is available', async () => {
    const primaryOperation = vi.fn().mockResolvedValue('primary result')
    
    gracefulDegradation.registerService({
      serviceName: 'test-service',
      healthCheckInterval: 60000,
      failureThreshold: 3,
      recoveryThreshold: 1,
      fallbackStrategies: []
    })

    const result = await gracefulDegradation.executeWithDegradation(
      'test-service',
      primaryOperation
    )

    expect(result).toBe('primary result')
    expect(primaryOperation).toHaveBeenCalledTimes(1)
  })

  test('should execute fallback when primary fails', async () => {
    const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'))
    const fallbackOperation = vi.fn().mockResolvedValue('fallback result')
    
    gracefulDegradation.registerService({
      serviceName: 'test-service',
      healthCheckInterval: 60000,
      failureThreshold: 1, // Fail after 1 error
      recoveryThreshold: 1,
      fallbackStrategies: [
        {
          name: 'fallback',
          priority: 1,
          condition: () => true,
          execute: fallbackOperation,
          description: 'Fallback strategy'
        }
      ]
    })

    const result = await gracefulDegradation.executeWithDegradation(
      'test-service',
      primaryOperation
    )

    expect(result).toBe('fallback result')
    expect(primaryOperation).toHaveBeenCalledTimes(1)
    expect(fallbackOperation).toHaveBeenCalledTimes(1)
  })

  test('should mark service as unavailable after threshold failures', async () => {
    const primaryOperation = vi.fn().mockRejectedValue(new Error('Primary failed'))
    
    gracefulDegradation.registerService({
      serviceName: 'test-service',
      healthCheckInterval: 60000,
      failureThreshold: 2,
      recoveryThreshold: 1,
      fallbackStrategies: [
        {
          name: 'fallback',
          priority: 1,
          condition: () => true,
          execute: async () => 'fallback',
          description: 'Fallback strategy'
        }
      ]
    })

    // First failure
    await gracefulDegradation.executeWithDegradation('test-service', primaryOperation)
    let status = gracefulDegradation.getServiceStatus('test-service')
    expect(status?.available).toBe(true)

    // Second failure - should mark as unavailable
    await gracefulDegradation.executeWithDegradation('test-service', primaryOperation)
    status = gracefulDegradation.getServiceStatus('test-service')
    expect(status?.available).toBe(false)
  })
})

describe('Integration Tests', () => {
  test('should handle complete error workflow', async () => {
    const failingOperation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success')

    const result = await executeWithErrorHandling(failingOperation, {
      component: 'TestComponent',
      operation: 'testOperation',
      retryConfig: { maxRetries: 2, baseDelay: 10 }
    })

    expect(result).toBe('success')
    expect(failingOperation).toHaveBeenCalledTimes(2)
  })

  test('should handle PDF processing pattern', async () => {
    const pdfOperation = vi.fn().mockResolvedValue('pdf processed')

    const result = await errorPatterns.handlePDFProcessing(pdfOperation)

    expect(result).toBe('pdf processed')
    expect(pdfOperation).toHaveBeenCalledTimes(1)
  })

  test('should handle Gemini API pattern', async () => {
    const geminiOperation = vi.fn().mockResolvedValue({ diagrams: [] })

    const result = await errorPatterns.handleGeminiAPI(geminiOperation)

    expect(result).toEqual({ diagrams: [] })
    expect(geminiOperation).toHaveBeenCalledTimes(1)
  })

  test('should handle database pattern', async () => {
    const dbOperation = vi.fn().mockResolvedValue('data stored')

    const result = await errorPatterns.handleDatabase(dbOperation)

    expect(result).toBe('data stored')
    expect(dbOperation).toHaveBeenCalledTimes(1)
  })

  test('should handle validation pattern', async () => {
    const validationOperation = vi.fn().mockResolvedValue(true)

    const result = await errorPatterns.handleValidation(validationOperation)

    expect(result).toBe(true)
    expect(validationOperation).toHaveBeenCalledTimes(1)
  })
})

describe('Error Recovery Scenarios', () => {
  test('should recover from API quota exceeded', async () => {
    const quotaError = new Error('Quota exceeded')
    quotaError.name = 'QuotaError'
    
    const operation = vi.fn()
      .mockRejectedValueOnce(quotaError)
      .mockResolvedValue('success after quota reset')

    const result = await executeWithErrorHandling(operation, {
      component: 'APIClient',
      operation: 'apiCall',
      serviceName: 'gemini-api',
      retryConfig: { maxRetries: 1, baseDelay: 100 }
    })

    expect(result).toBe('success after quota reset')
  })

  test('should handle network connectivity issues', async () => {
    const networkError = new Error('Network error')
    networkError.name = 'NetworkError'
    
    const operation = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success after reconnect')

    const result = await executeWithErrorHandling(operation, {
      component: 'NetworkClient',
      operation: 'networkCall',
      serviceName: 'network',
      retryConfig: { maxRetries: 1, baseDelay: 100 }
    })

    expect(result).toBe('success after reconnect')
  })

  test('should handle storage failures', async () => {
    const storageError = new Error('Storage full')
    storageError.name = 'StorageError'
    
    const operation = vi.fn()
      .mockRejectedValueOnce(storageError)
      .mockResolvedValue('success after cleanup')

    const result = await executeWithErrorHandling(operation, {
      component: 'StorageClient',
      operation: 'storeData',
      serviceName: 'database',
      retryConfig: { maxRetries: 1, baseDelay: 100 }
    })

    expect(result).toBe('success after cleanup')
  })
})

describe('User Feedback Scenarios', () => {
  test('should show appropriate feedback for different error types', () => {
    const errorHandler = new SystemErrorHandler()
    const feedbackSpy = vi.fn()
    
    errorHandler.onUserFeedback(feedbackSpy)

    // Test API error feedback
    const apiError = errorHandler.createError('API_ERROR', 'API unavailable')
    errorHandler.handleError(apiError)
    
    expect(feedbackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WARNING',
        title: 'Service Temporarily Unavailable'
      })
    )

    // Test validation error feedback
    const validationError = errorHandler.createError('VALIDATION_ERROR', 'Invalid data')
    errorHandler.handleError(validationError)
    
    expect(feedbackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WARNING',
        title: 'Data Validation Issue'
      })
    )
  })

  test('should provide recovery actions in feedback', () => {
    const errorHandler = new SystemErrorHandler()
    const feedbackSpy = vi.fn()
    
    errorHandler.onUserFeedback(feedbackSpy)

    const networkError = errorHandler.createError('NETWORK_ERROR', 'Connection failed')
    errorHandler.handleError(networkError)
    
    const feedback = feedbackSpy.mock.calls[0][0]
    expect(feedback.actions).toBeDefined()
    expect(feedback.actions.length).toBeGreaterThan(0)
    expect(feedback.actions[0].label).toBe('Retry')
  })
})