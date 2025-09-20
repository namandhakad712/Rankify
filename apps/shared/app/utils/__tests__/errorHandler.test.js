/**
 * Error Handler Test Suite
 * Comprehensive tests for error handling and recovery systems
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { ErrorHandler, getErrorHandler, initializeErrorHandler, handleError } from '../errorHandler.js'
import { RecoveryManager, getRecoveryManager } from '../recoveryManager.js'

// Mock global objects
global.window = {
  addEventListener: vi.fn(),
  location: { href: 'http://localhost:3000' }
}

global.navigator = {
  userAgent: 'Test Browser',
  onLine: true,
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  }
}

global.performance = {
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
}

describe('ErrorHandler', () => {
  let errorHandler
  
  beforeEach(async () => {
    errorHandler = new ErrorHandler()
    await errorHandler.initialize()
  })
  
  afterEach(() => {
    errorHandler.clearErrorHistory()
  })

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const handler = new ErrorHandler()
      const result = await handler.initialize()
      
      expect(result).toBe(true)
      expect(handler.isInitialized).toBe(true)
    })

    test('should setup error types correctly', () => {
      expect(errorHandler.errorTypes).toBeDefined()
      expect(errorHandler.errorTypes.network).toBeDefined()
      expect(errorHandler.errorTypes.file).toBeDefined()
      expect(errorHandler.errorTypes.processing).toBeDefined()
      expect(errorHandler.errorTypes.validation).toBeDefined()
      expect(errorHandler.errorTypes.security).toBeDefined()
      expect(errorHandler.errorTypes.system).toBeDefined()
    })

    test('should setup recovery strategies correctly', () => {
      expect(errorHandler.recoveryStrategies).toBeDefined()
      expect(errorHandler.recoveryStrategies.network).toBeDefined()
      expect(errorHandler.recoveryStrategies.file).toBeDefined()
      expect(errorHandler.recoveryStrategies.processing).toBeDefined()
    })
  })

  describe('Error Processing', () => {
    test('should process basic error correctly', async () => {
      const errorInfo = {
        type: 'CONNECTION_FAILED',
        message: 'Network connection failed',
        context: 'api_call'
      }

      const result = await errorHandler.handleError(errorInfo)
      
      expect(result.error.id).toBeDefined()
      expect(result.error.type).toBe('CONNECTION_FAILED')
      expect(result.error.message).toBe('Network connection failed')
      expect(result.error.context).toBe('api_call')
      expect(result.error.category).toBe('network')
    })

    test('should classify network errors correctly', () => {
      const classification = errorHandler.classifyError('CONNECTION_FAILED', 'Network failed')
      
      expect(classification.category).toBe('network')
      expect(classification.severity).toBe('high')
      expect(classification.recoverable).toBe(true)
    })

    test('should classify file errors correctly', () => {
      const classification = errorHandler.classifyError('FILE_NOT_FOUND', 'File not found')
      
      expect(classification.category).toBe('file')
      expect(classification.severity).toBe('high')
      expect(classification.recoverable).toBe(false)
    })

    test('should classify by message patterns', () => {
      const networkClassification = errorHandler.classifyByMessage('network timeout occurred')
      expect(networkClassification.category).toBe('network')
      
      const fileClassification = errorHandler.classifyByMessage('file upload failed')
      expect(fileClassification.category).toBe('file')
      
      const memoryClassification = errorHandler.classifyByMessage('out of memory error')
      expect(memoryClassification.category).toBe('memory')
    })
  })

  describe('Error Recovery', () => {
    test('should attempt recovery for recoverable errors', async () => {
      const errorInfo = {
        type: 'CONNECTION_FAILED',
        message: 'Network connection failed',
        context: 'api_call'
      }

      const result = await errorHandler.handleError(errorInfo)
      
      expect(result.recovery).toBeDefined()
      expect(result.recovery.attempted).toBeDefined()
      expect(Array.isArray(result.recovery.attempted)).toBe(true)
    })

    test('should not attempt recovery for non-recoverable errors', async () => {
      const errorInfo = {
        type: 'FILE_NOT_FOUND',
        message: 'File not found',
        context: 'file_access'
      }

      const result = await errorHandler.handleError(errorInfo)
      
      expect(result.recovery.finalStatus).toBe('no_recovery_available')
    })

    test('should get correct recovery strategies', () => {
      const error = {
        category: 'network',
        type: 'CONNECTION_FAILED'
      }

      const strategies = errorHandler.getRecoveryStrategies(error)
      
      expect(Array.isArray(strategies)).toBe(true)
      expect(strategies.length).toBeGreaterThan(0)
      expect(strategies[0].strategy).toBe('retry_with_backoff')
    })
  })

  describe('JSON Auto-Fix', () => {
    test('should fix trailing commas', () => {
      const badJSON = '{"name": "test", "value": 123,}'
      const fixed = errorHandler.fixJSONErrors(badJSON)
      
      expect(fixed).toEqual({ name: 'test', value: 123 })
    })

    test('should fix unquoted keys', () => {
      const badJSON = '{name: "test", value: 123}'
      const fixed = errorHandler.fixJSONErrors(badJSON)
      
      expect(fixed).toEqual({ name: 'test', value: 123 })
    })

    test('should fix single quotes', () => {
      const badJSON = '{"name": \'test\', "value": 123}'
      const fixed = errorHandler.fixJSONErrors(badJSON)
      
      expect(fixed).toEqual({ name: 'test', value: 123 })
    })

    test('should return null for unfixable JSON', () => {
      const badJSON = '{"name": "test" "value": 123}'
      const fixed = errorHandler.fixJSONErrors(badJSON)
      
      expect(fixed).toBeNull()
    })
  })

  describe('Error Statistics', () => {
    test('should calculate error statistics correctly', async () => {
      // Add some test errors
      await errorHandler.handleError({
        type: 'CONNECTION_FAILED',
        message: 'Network failed',
        context: 'test'
      })
      
      await errorHandler.handleError({
        type: 'FILE_NOT_FOUND',
        message: 'File not found',
        context: 'test'
      })

      const stats = errorHandler.getErrorStatistics()
      
      expect(stats.totalErrors).toBe(2)
      expect(stats.errorsByCategory.network).toBe(1)
      expect(stats.errorsByCategory.file).toBe(1)
      expect(stats.recentErrors).toHaveLength(2)
    })

    test('should calculate recovery rate correctly', async () => {
      // Mock some recovered errors
      errorHandler.errorHistory = [
        { recoverable: true, recovered: true },
        { recoverable: true, recovered: false },
        { recoverable: false, recovered: false }
      ]

      const stats = errorHandler.getErrorStatistics()
      
      expect(stats.recoveryRate).toBe(50) // 1 out of 2 recoverable errors recovered
    })
  })

  describe('Utility Functions', () => {
    test('should generate unique error IDs', () => {
      const id1 = errorHandler.generateErrorId()
      const id2 = errorHandler.generateErrorId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^error_\d+_[a-z0-9]+$/)
    })

    test('should create error boundary wrapper', () => {
      const Component = () => 'Test Component'
      const FallbackComponent = () => 'Error Fallback'
      
      const boundary = errorHandler.createErrorBoundary(Component, FallbackComponent)
      
      expect(boundary.component).toBe(Component)
      expect(boundary.fallback).toBe(FallbackComponent)
      expect(typeof boundary.onError).toBe('function')
    })

    test('should wrap async functions with error handling', async () => {
      const asyncFunction = vi.fn().mockRejectedValue(new Error('Test error'))
      const wrappedFunction = errorHandler.wrapAsync(asyncFunction, 'test_context')
      
      const result = await wrappedFunction('arg1', 'arg2')
      
      expect(asyncFunction).toHaveBeenCalledWith('arg1', 'arg2')
      expect(result.error).toBeDefined()
      expect(result.recovery).toBeDefined()
    })

    test('should create safe event handlers', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error')
      })
      
      const safeHandler = errorHandler.createSafeEventHandler(handler, 'test_event')
      const mockEvent = { type: 'click', target: { tagName: 'BUTTON' } }
      
      // Should not throw
      expect(() => safeHandler(mockEvent)).not.toThrow()
      expect(handler).toHaveBeenCalledWith(mockEvent)
    })
  })

  describe('System Health Monitoring', () => {
    test('should check system health', async () => {
      const health = await errorHandler.checkSystemHealth()
      
      expect(health.timestamp).toBeDefined()
      expect(health.memory).toBeDefined()
      expect(health.storage).toBeDefined()
      expect(health.network).toBeDefined()
      expect(health.errors).toBeDefined()
    })

    test('should get memory information', () => {
      const memInfo = errorHandler.getMemoryInfo()
      
      expect(memInfo.usedJSHeapSize).toBeDefined()
      expect(memInfo.totalJSHeapSize).toBeDefined()
      expect(memInfo.jsHeapSizeLimit).toBeDefined()
    })

    test('should get network information', async () => {
      const netInfo = await errorHandler.getNetworkInfo()
      
      expect(netInfo.online).toBe(true)
      expect(netInfo.connection).toBeDefined()
      expect(netInfo.connection.effectiveType).toBe('4g')
    })
  })

  describe('Data Export/Import', () => {
    test('should export error data', async () => {
      await errorHandler.handleError({
        type: 'TEST_ERROR',
        message: 'Test error',
        context: 'test'
      })

      const exportedData = errorHandler.exportErrorData()
      
      expect(exportedData.errorHistory).toBeDefined()
      expect(exportedData.statistics).toBeDefined()
      expect(exportedData.configuration).toBeDefined()
      expect(exportedData.systemInfo).toBeDefined()
      expect(exportedData.errorHistory.length).toBe(1)
    })

    test('should import error data', () => {
      const testData = {
        errorHistory: [
          { id: 'test1', type: 'TEST_ERROR', message: 'Test 1' },
          { id: 'test2', type: 'TEST_ERROR', message: 'Test 2' }
        ]
      }

      errorHandler.importErrorData(testData)
      
      expect(errorHandler.errorHistory).toHaveLength(2)
      expect(errorHandler.errorHistory[0].id).toBe('test1')
      expect(errorHandler.errorHistory[1].id).toBe('test2')
    })
  })
})

describe('RecoveryManager', () => {
  let recoveryManager
  
  beforeEach(async () => {
    recoveryManager = new RecoveryManager()
    await recoveryManager.initialize()
  })

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const manager = new RecoveryManager()
      await manager.initialize()
      
      expect(manager.isInitialized).toBe(true)
      expect(manager.recoveryOperations.size).toBeGreaterThan(0)
      expect(manager.fallbackChains.size).toBeGreaterThan(0)
    })

    test('should setup recovery operations', () => {
      expect(recoveryManager.recoveryOperations.has('pdf_processing')).toBe(true)
      expect(recoveryManager.recoveryOperations.has('network')).toBe(true)
      expect(recoveryManager.recoveryOperations.has('storage')).toBe(true)
      expect(recoveryManager.recoveryOperations.has('validation')).toBe(true)
      expect(recoveryManager.recoveryOperations.has('worker')).toBe(true)
    })

    test('should setup fallback chains', () => {
      expect(recoveryManager.fallbackChains.has('pdf_parsers')).toBe(true)
      expect(recoveryManager.fallbackChains.has('storage')).toBe(true)
      expect(recoveryManager.fallbackChains.has('network')).toBe(true)
    })
  })

  describe('Recovery Execution', () => {
    test('should execute recovery for valid category', async () => {
      const error = { type: 'CONNECTION_FAILED', message: 'Network failed' }
      const options = { timeout: 5000 }
      
      const result = await recoveryManager.executeRecovery('network', error, options)
      
      expect(result.category).toBe('network')
      expect(result.startTime).toBeDefined()
      expect(result.attempts).toBeDefined()
      expect(Array.isArray(result.attempts)).toBe(true)
      expect(result.duration).toBeDefined()
    })

    test('should throw error for invalid category', async () => {
      const error = { type: 'UNKNOWN_ERROR', message: 'Unknown error' }
      
      await expect(
        recoveryManager.executeRecovery('invalid_category', error)
      ).rejects.toThrow('No recovery operation found for category: invalid_category')
    })

    test('should record recovery attempts', async () => {
      const error = { type: 'VALIDATION_ERROR', message: 'Validation failed' }
      
      const result = await recoveryManager.executeRecovery('validation', error)
      
      expect(result.attempts.length).toBeGreaterThan(0)
      expect(result.attempts[0].method).toBe('primary')
      expect(result.attempts[0].success).toBeDefined()
    })
  })

  describe('JSON Fixing', () => {
    test('should fix common JSON issues', () => {
      const badJSON = '{"name": "test", "value": 123,}'
      const fixed = recoveryManager.fixCommonJSONIssues(badJSON)
      
      expect(fixed).toBe('{"name": "test", "value": 123}')
    })

    test('should quote unquoted keys', () => {
      const badJSON = '{name: "test", value: 123}'
      const fixed = recoveryManager.fixCommonJSONIssues(badJSON)
      
      expect(fixed).toBe('{"name": "test", "value": 123}')
    })

    test('should replace single quotes', () => {
      const badJSON = '{"name": \'test\', "value": 123}'
      const fixed = recoveryManager.fixCommonJSONIssues(badJSON)
      
      expect(fixed).toBe('{"name": "test", "value": 123}')
    })
  })

  describe('Default Values', () => {
    test('should return schema default value', () => {
      const fieldSchema = { type: 'string', default: 'default_value' }
      const defaultValue = recoveryManager.getDefaultValue('test_field', fieldSchema)
      
      expect(defaultValue).toBe('default_value')
    })

    test('should return type-based default values', () => {
      expect(recoveryManager.getDefaultValue('test', { type: 'string' })).toBe('')
      expect(recoveryManager.getDefaultValue('test', { type: 'number' })).toBe(0)
      expect(recoveryManager.getDefaultValue('test', { type: 'boolean' })).toBe(false)
      expect(recoveryManager.getDefaultValue('test', { type: 'array' })).toEqual([])
      expect(recoveryManager.getDefaultValue('test', { type: 'object' })).toEqual({})
      expect(recoveryManager.getDefaultValue('test', { type: 'unknown' })).toBeNull()
    })
  })

  describe('Completeness Calculation', () => {
    test('should calculate 100% for no required fields', () => {
      const data = { name: 'test', value: 123 }
      const schema = { properties: { name: {}, value: {} } }
      
      const completeness = recoveryManager.calculateCompleteness(data, schema)
      
      expect(completeness).toBe(100)
    })

    test('should calculate correct completeness percentage', () => {
      const data = { name: 'test', value: 123 }
      const schema = { 
        required: ['name', 'value', 'missing'],
        properties: { name: {}, value: {}, missing: {} }
      }
      
      const completeness = recoveryManager.calculateCompleteness(data, schema)
      
      expect(completeness).toBeCloseTo(66.67, 1) // 2 out of 3 fields present
    })

    test('should handle empty data', () => {
      const data = {}
      const schema = { 
        required: ['name', 'value'],
        properties: { name: {}, value: {} }
      }
      
      const completeness = recoveryManager.calculateCompleteness(data, schema)
      
      expect(completeness).toBe(0)
    })
  })

  describe('Recovery Statistics', () => {
    test('should calculate recovery statistics', async () => {
      // Add some test recoveries
      recoveryManager.recoveryHistory = [
        { 
          category: 'network', 
          success: true, 
          duration: 1000, 
          finalMethod: 'retry' 
        },
        { 
          category: 'network', 
          success: false, 
          duration: 2000, 
          finalMethod: null 
        },
        { 
          category: 'storage', 
          success: true, 
          duration: 500, 
          finalMethod: 'cleanup' 
        }
      ]

      const stats = recoveryManager.getRecoveryStatistics()
      
      expect(stats.totalRecoveries).toBe(3)
      expect(stats.successRate).toBeCloseTo(66.67, 1)
      expect(stats.averageRecoveryTime).toBe(1166.67)
      expect(stats.recoveriesByCategory.network).toBe(2)
      expect(stats.recoveriesByCategory.storage).toBe(1)
      expect(stats.recoveriesByMethod.retry).toBe(1)
      expect(stats.recoveriesByMethod.cleanup).toBe(1)
    })

    test('should handle empty recovery history', () => {
      const stats = recoveryManager.getRecoveryStatistics()
      
      expect(stats.totalRecoveries).toBe(0)
      expect(stats.successRate).toBe(0)
      expect(stats.averageRecoveryTime).toBe(0)
      expect(Object.keys(stats.recoveriesByCategory)).toHaveLength(0)
      expect(Object.keys(stats.recoveriesByMethod)).toHaveLength(0)
    })
  })
})

describe('Integration Tests', () => {
  test('should integrate error handler with recovery manager', async () => {
    const errorHandler = getErrorHandler()
    const recoveryManager = getRecoveryManager()
    
    await errorHandler.initialize()
    await recoveryManager.initialize()
    
    expect(errorHandler.isInitialized).toBe(true)
    expect(recoveryManager.isInitialized).toBe(true)
  })

  test('should handle error with recovery attempt', async () => {
    const result = await handleError(new Error('Test error'), 'integration_test')
    
    expect(result.error).toBeDefined()
    expect(result.recovery).toBeDefined()
    expect(result.errorId).toBeDefined()
    expect(result.timestamp).toBeDefined()
  })

  test('should maintain singleton instances', () => {
    const handler1 = getErrorHandler()
    const handler2 = getErrorHandler()
    const manager1 = getRecoveryManager()
    const manager2 = getRecoveryManager()
    
    expect(handler1).toBe(handler2)
    expect(manager1).toBe(manager2)
  })
})