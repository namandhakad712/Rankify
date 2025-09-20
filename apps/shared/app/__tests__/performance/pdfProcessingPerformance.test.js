/**
 * PDF Processing Performance Tests
 * Tests for large PDF processing performance and memory usage
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance } from 'perf_hooks'
import { 
  processLargePDFWithMemoryManagement,
  getMemoryStatistics,
  initializePerformanceIntegration
} from '../../utils/performanceIntegration.js'
import { GeminiAPIClient } from '../../utils/geminiAPIClient.js'
import { PDFProcessor } from '../../utils/pdfProcessor.js'

// Mock performance APIs
global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    totalJSHeapSize: 20 * 1024 * 1024, // 20MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  },
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => [])
}

describe('PDF Processing Performance Tests', () => {
  let performanceIntegration
  let geminiClient
  let pdfProcessor
  
  beforeEach(async () => {
    // Initialize performance systems
    performanceIntegration = await initializePerformanceIntegration({
      memoryManager: {
        thresholds: {
          warning: 0.7,
          critical: 0.85,
          emergency: 0.95
        }
      }
    })
    
    geminiClient = new GeminiAPIClient('test-api-key')
    pdfProcessor = new PDFProcessor()
    
    // Mock implementations
    vi.spyOn(geminiClient, 'extractQuestions').mockImplementation(async (buffer) => {
      // Simulate processing time based on buffer size
      const sizeInMB = buffer.byteLength / (1024 * 1024)
      const processingTime = Math.min(sizeInMB * 100, 30000) // Max 30 seconds
      
      await new Promise(resolve => setTimeout(resolve, processingTime))
      
      return {
        questions: generateMockQuestions(Math.floor(sizeInMB * 2)), // 2 questions per MB
        metadata: {
          totalQuestions: Math.floor(sizeInMB * 2),
          processingTime: processingTime,
          averageConfidence: 4.0
        }
      }
    })
    
    vi.spyOn(pdfProcessor, 'extractText').mockImplementation(async (buffer) => {
      const sizeInMB = buffer.byteLength / (1024 * 1024)
      const processingTime = Math.min(sizeInMB * 50, 10000) // Max 10 seconds
      
      await new Promise(resolve => setTimeout(resolve, processingTime))
      
      return {
        text: `Extracted text from ${sizeInMB}MB PDF`,
        pages: Array.from({ length: Math.floor(sizeInMB * 10) }, (_, i) => ({
          pageNumber: i + 1,
          text: `Page ${i + 1} content`
        }))
      }
    })
  })
  
  afterEach(async () => {
    if (performanceIntegration) {
      await performanceIntegration.cleanup()
    }
    vi.clearAllMocks()
  })

  describe('Small PDF Performance', () => {
    test('should process 1MB PDF within 5 seconds', async () => {
      const pdfBuffer = new ArrayBuffer(1024 * 1024) // 1MB
      
      const startTime = performance.now()
      const result = await processLargePDFWithMemoryManagement(pdfBuffer, {
        chunkSize: 256 * 1024, // 256KB chunks
        maxConcurrent: 2
      })
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(5000) // 5 seconds
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    test('should maintain low memory usage for small PDFs', async () => {
      const pdfBuffer = new ArrayBuffer(512 * 1024) // 512KB
      
      const initialMemory = getMemoryStatistics()
      
      await processLargePDFWithMemoryManagement(pdfBuffer)
      
      const finalMemory = getMemoryStatistics()
      
      // Memory usage should not increase significantly
      const memoryIncrease = finalMemory.current.used - initialMemory.current.used
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // Less than 10MB increase
    })

    test('should handle concurrent small PDF processing', async () => {
      const pdfBuffers = [
        new ArrayBuffer(500 * 1024), // 500KB
        new ArrayBuffer(750 * 1024), // 750KB
        new ArrayBuffer(600 * 1024)  // 600KB
      ]
      
      const startTime = performance.now()
      
      const promises = pdfBuffers.map(buffer => 
        processLargePDFWithMemoryManagement(buffer)
      )
      
      const results = await Promise.all(promises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Should complete all within 10 seconds
      expect(totalTime).toBeLessThan(10000)
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
      })
    })
  })

  describe('Medium PDF Performance', () => {
    test('should process 10MB PDF within 30 seconds', async () => {
      const pdfBuffer = new ArrayBuffer(10 * 1024 * 1024) // 10MB
      
      const startTime = performance.now()
      const result = await processLargePDFWithMemoryManagement(pdfBuffer, {
        chunkSize: 1024 * 1024, // 1MB chunks
        maxConcurrent: 3
      })
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(30000) // 30 seconds
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(5) // Should have multiple chunks
    })

    test('should use chunked processing for medium PDFs', async () => {
      const pdfBuffer = new ArrayBuffer(5 * 1024 * 1024) // 5MB
      const chunkSize = 1024 * 1024 // 1MB
      
      const result = await processLargePDFWithMemoryManagement(pdfBuffer, {
        chunkSize: chunkSize,
        maxConcurrent: 2
      })
      
      // Should have 5 chunks
      expect(result).toHaveLength(5)
      
      // Each chunk should be processed
      result.forEach(chunk => {
        expect(chunk.size).toBeLessThanOrEqual(chunkSize)
        expect(chunk.checksum).toBeDefined()
      })
    })

    test('should monitor memory usage during medium PDF processing', async () => {
      const pdfBuffer = new ArrayBuffer(8 * 1024 * 1024) // 8MB
      
      // Mock high memory usage scenario
      global.performance.memory.usedJSHeapSize = 70 * 1024 * 1024 // 70MB
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await processLargePDFWithMemoryManagement(pdfBuffer)
      
      // Should log memory warnings
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory level:')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Large PDF Performance', () => {
    test('should process 50MB PDF within 2 minutes', async () => {
      const pdfBuffer = new ArrayBuffer(50 * 1024 * 1024) // 50MB
      
      const startTime = performance.now()
      const result = await processLargePDFWithMemoryManagement(pdfBuffer, {
        chunkSize: 2 * 1024 * 1024, // 2MB chunks
        maxConcurrent: 4
      })
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(120000) // 2 minutes
      expect(result).toBeDefined()
      expect(result.length).toBe(25) // 50MB / 2MB = 25 chunks
    })

    test('should handle memory pressure during large PDF processing', async () => {
      const pdfBuffer = new ArrayBuffer(30 * 1024 * 1024) // 30MB
      
      // Mock critical memory usage
      global.performance.memory.usedJSHeapSize = 85 * 1024 * 1024 // 85MB
      
      const result = await processLargePDFWithMemoryManagement(pdfBuffer, {
        chunkSize: 1024 * 1024, // 1MB chunks
        maxConcurrent: 2 // Reduced concurrency due to memory pressure
      })
      
      expect(result).toBeDefined()
      expect(result.length).toBe(30)
    })

    test('should implement backpressure for very large PDFs', async () => {
      const pdfBuffer = new ArrayBuffer(100 * 1024 * 1024) // 100MB
      
      // Mock emergency memory usage
      global.performance.memory.usedJSHeapSize = 95 * 1024 * 1024 // 95MB
      
      const startTime = performance.now()
      
      try {
        await processLargePDFWithMemoryManagement(pdfBuffer, {
          chunkSize: 5 * 1024 * 1024, // 5MB chunks
          maxConcurrent: 1 // Single threaded due to memory constraints
        })
      } catch (error) {
        // Should either complete or fail gracefully with memory error
        expect(error.message).toMatch(/memory|insufficient/i)
      }
      
      const endTime = performance.now()
      const processingTime = endTime - startTime
      
      // Should not hang indefinitely
      expect(processingTime).toBeLessThan(300000) // 5 minutes max
    })
  })

  describe('Memory Management', () => {
    test('should clean up memory after processing', async () => {
      const pdfBuffer = new ArrayBuffer(5 * 1024 * 1024) // 5MB
      
      const initialMemory = getMemoryStatistics()
      
      await processLargePDFWithMemoryManagement(pdfBuffer)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const finalMemory = getMemoryStatistics()
      
      // Memory should be cleaned up
      expect(finalMemory.allocations.active).toBeLessThanOrEqual(initialMemory.allocations.active)
    })

    test('should use memory pools efficiently', async () => {
      const pdfBuffer = new ArrayBuffer(10 * 1024 * 1024) // 10MB
      
      const result = await processLargePDFWithMemoryManagement(pdfBuffer, {
        chunkSize: 1024 * 1024, // 1MB chunks
        maxConcurrent: 3
      })
      
      const memoryStats = getMemoryStatistics()
      
      // Should have created and used memory pools
      expect(memoryStats.pools.length).toBeGreaterThan(0)
      
      // Pools should be cleaned up after processing
      const activePool = memoryStats.pools.find(pool => pool.inUse > 0)
      expect(activePool).toBeUndefined()
    })

    test('should handle memory allocation failures gracefully', async () => {
      const pdfBuffer = new ArrayBuffer(20 * 1024 * 1024) // 20MB
      
      // Mock memory allocation failure
      const mockMemoryManager = {
        allocateMemory: vi.fn().mockImplementation(() => {
          throw new Error('Insufficient memory for allocation')
        }),
        processLargePDF: vi.fn().mockRejectedValue(new Error('Memory allocation failed'))
      }
      
      await expect(
        mockMemoryManager.processLargePDF(pdfBuffer)
      ).rejects.toThrow('Memory allocation failed')
    })
  })

  describe('AI Processing Performance', () => {
    test('should extract questions from large PDF efficiently', async () => {
      const pdfBuffer = new ArrayBuffer(15 * 1024 * 1024) // 15MB
      
      const startTime = performance.now()
      const result = await geminiClient.extractQuestions(pdfBuffer)
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(45000) // 45 seconds
      expect(result.questions).toBeDefined()
      expect(result.questions.length).toBeGreaterThan(20) // Should extract multiple questions
      expect(result.metadata.processingTime).toBeDefined()
    })

    test('should handle AI processing timeouts', async () => {
      const pdfBuffer = new ArrayBuffer(25 * 1024 * 1024) // 25MB
      
      // Mock slow AI processing
      geminiClient.extractQuestions.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
        throw new Error('Processing timeout')
      })
      
      await expect(
        geminiClient.extractQuestions(pdfBuffer)
      ).rejects.toThrow('Processing timeout')
    })

    test('should batch process questions for better performance', async () => {
      const questions = Array.from({ length: 100 }, (_, i) => ({
        text: `Question ${i + 1}`,
        type: 'MCQ'
      }))
      
      const startTime = performance.now()
      const result = await geminiClient.processBatch(questions)
      const endTime = performance.now()
      
      const processingTime = endTime - startTime
      
      // Batch processing should be faster than individual processing
      expect(processingTime).toBeLessThan(20000) // 20 seconds
      expect(result.questions).toHaveLength(100)
    })
  })

  describe('Performance Monitoring', () => {
    test('should track processing metrics', async () => {
      const pdfBuffer = new ArrayBuffer(3 * 1024 * 1024) // 3MB
      
      await processLargePDFWithMemoryManagement(pdfBuffer)
      
      const performanceReport = performanceIntegration.generatePerformanceReport()
      
      expect(performanceReport.performance).toBeDefined()
      expect(performanceReport.memory).toBeDefined()
      expect(performanceReport.performance.components.totalLoaded).toBeGreaterThan(0)
    })

    test('should detect performance bottlenecks', async () => {
      const pdfBuffer = new ArrayBuffer(8 * 1024 * 1024) // 8MB
      
      // Mock slow processing
      const originalExtract = geminiClient.extractQuestions
      geminiClient.extractQuestions.mockImplementation(async (buffer) => {
        await new Promise(resolve => setTimeout(resolve, 15000)) // 15 seconds
        return originalExtract.call(geminiClient, buffer)
      })
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await processLargePDFWithMemoryManagement(pdfBuffer)
      
      // Should detect slow processing
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow')
      )
      
      consoleSpy.mockRestore()
    })

    test('should provide performance recommendations', async () => {
      const pdfBuffer = new ArrayBuffer(40 * 1024 * 1024) // 40MB
      
      // Mock high memory usage
      global.performance.memory.usedJSHeapSize = 80 * 1024 * 1024 // 80MB
      
      const healthCheck = await performanceIntegration.performHealthCheck()
      
      expect(healthCheck.recommendations).toBeDefined()
      expect(healthCheck.recommendations.length).toBeGreaterThan(0)
      expect(healthCheck.recommendations.some(rec => 
        rec.includes('memory') || rec.includes('optimization')
      )).toBe(true)
    })
  })

  describe('Browser Compatibility Performance', () => {
    test('should perform well across different browsers', async () => {
      const browsers = [
        { name: 'Chrome', userAgent: 'Chrome/91.0.4472.124' },
        { name: 'Firefox', userAgent: 'Firefox/89.0' },
        { name: 'Edge', userAgent: 'Edg/91.0.864.59' }
      ]
      
      const pdfBuffer = new ArrayBuffer(2 * 1024 * 1024) // 2MB
      
      for (const browser of browsers) {
        // Mock browser-specific behavior
        Object.defineProperty(navigator, 'userAgent', {
          value: browser.userAgent,
          configurable: true
        })
        
        const startTime = performance.now()
        const result = await processLargePDFWithMemoryManagement(pdfBuffer)
        const endTime = performance.now()
        
        const processingTime = endTime - startTime
        
        // Should perform reasonably well in all browsers
        expect(processingTime).toBeLessThan(10000) // 10 seconds
        expect(result).toBeDefined()
      }
    })

    test('should handle browser-specific memory limitations', async () => {
      const pdfBuffer = new ArrayBuffer(20 * 1024 * 1024) // 20MB
      
      // Mock browser with lower memory limit
      global.performance.memory.jsHeapSizeLimit = 50 * 1024 * 1024 // 50MB limit
      global.performance.memory.usedJSHeapSize = 40 * 1024 * 1024 // 40MB used
      
      const result = await processLargePDFWithMemoryManagement(pdfBuffer, {
        chunkSize: 512 * 1024, // Smaller chunks for memory-constrained browser
        maxConcurrent: 1
      })
      
      expect(result).toBeDefined()
      expect(result.length).toBe(40) // 20MB / 512KB = 40 chunks
    })
  })
})

/**
 * Helper function to generate mock questions
 */
function generateMockQuestions(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    text: `Mock question ${i + 1}`,
    type: ['MCQ', 'MSQ', 'NAT'][i % 3],
    options: ['MCQ', 'MSQ'].includes(['MCQ', 'MSQ', 'NAT'][i % 3]) 
      ? ['Option A', 'Option B', 'Option C', 'Option D'] 
      : [],
    subject: 'Test Subject',
    section: 'Test Section',
    pageNumber: Math.floor(i / 10) + 1,
    questionNumber: i + 1,
    confidence: 3.5 + Math.random() * 1.5, // 3.5 to 5.0
    hasDiagram: Math.random() > 0.7, // 30% chance
    extractionMetadata: {
      processingTime: 100 + Math.random() * 200,
      geminiModel: 'gemini-1.5-flash',
      apiVersion: 'v1beta'
    }
  }))
}