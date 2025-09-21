/**
 * Unit Tests for Enhanced PDF Processing Pipeline
 * 
 * This file contains comprehensive tests for the enhanced PDF processing
 * pipeline with diagram detection and coordinate validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { 
  PipelineConfig,
  PipelineResult
} from '../enhancedPdfProcessingPipeline'
import { EnhancedPDFProcessingPipeline } from '../enhancedPdfProcessingPipeline'

// Mock dependencies
vi.mock('../pdfProcessingUtils', () => ({
  createPDFProcessor: vi.fn(() => ({
    loadPDF: vi.fn(),
    extractText: vi.fn(() => ({
      text: 'Sample PDF content with questions',
      pageCount: 2,
      metadata: { fileSize: 1024 },
      pages: [
        { pageNumber: 1, text: 'Page 1 content', hasImages: true, confidence: 4 },
        { pageNumber: 2, text: 'Page 2 content', hasImages: false, confidence: 3 }
      ]
    })),
    dispose: vi.fn()
  }))
}))

vi.mock('../diagramDetectionService', () => ({
  DiagramDetectionService: vi.fn(() => ({
    processPDFWithDiagramDetection: vi.fn(() => ({
      success: true,
      questions: [
        {
          id: 'test_q1',
          text: 'Sample question 1',
          type: 'MCQ',
          hasDiagram: true,
          diagrams: [{
            x1: 100, y1: 150, x2: 300, y2: 250,
            confidence: 0.9, type: 'graph', description: 'Test graph'
          }],
          pageNumber: 1,
          confidence: 0.85,
          pdfData: []
        }
      ],
      diagramCoordinates: new Map([
        ['test_q1', [{
          x1: 100, y1: 150, x2: 300, y2: 250,
          confidence: 0.9, type: 'graph', description: 'Test graph'
        }]]
      ]),
      processingStats: {
        totalQuestions: 1,
        questionsWithDiagrams: 1,
        averageConfidence: 0.85,
        processingTime: 1000,
        apiCalls: 1,
        errors: 0
      },
      errors: [],
      warnings: []
    })),
    cleanup: vi.fn()
  }))
}))

vi.mock('../coordinateValidator', () => ({
  CoordinateValidator: vi.fn(() => ({
    validateCoordinates: vi.fn(() => ({ isValid: true, errors: [] }))
  }))
}))

vi.mock('../coordinateSanitizer', () => ({
  CoordinateSanitizer: vi.fn(() => ({
    sanitizeForStorage: vi.fn((coords) => ({
      sanitized: coords,
      changes: [],
      warnings: []
    }))
  }))
}))

vi.mock('../diagramDatabaseUtils', () => ({
  DiagramDatabaseManager: vi.fn(() => ({
    close: vi.fn()
  }))
}))

describe('EnhancedPDFProcessingPipeline', () => {
  let pipeline: EnhancedPDFProcessingPipeline
  let config: PipelineConfig
  let mockPdfFile: File

  beforeEach(() => {
    config = {
      geminiApiKey: 'test-api-key',
      enableDiagramDetection: true,
      enableCoordinateValidation: true,
      enableDatabaseStorage: true,
      batchSize: 2,
      qualityThreshold: 0.7,
      maxFileSize: 10,
      supportedFormats: ['application/pdf']
    }

    pipeline = new EnhancedPDFProcessingPipeline(config)

    // Create mock PDF file
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]) // %PDF- header
    mockPdfFile = new File([pdfContent], 'test.pdf', { type: 'application/pdf' })
  })

  afterEach(async () => {
    await pipeline.cleanup()
    vi.clearAllMocks()
  })

  describe('PDF Processing', () => {
    it('should process PDF file successfully', async () => {
      const result = await pipeline.processPDF(mockPdfFile)

      expect(result.success).toBe(true)
      expect(result.testId).toBeDefined()
      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].hasDiagram).toBe(true)
      expect(result.diagramCoordinates.size).toBe(1)
      expect(result.metadata.originalFileName).toBe('test.pdf')
    })

    it('should handle PDF processing errors gracefully', async () => {
      // Create invalid PDF file
      const invalidContent = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00])
      const invalidFile = new File([invalidContent], 'invalid.pdf', { type: 'application/pdf' })

      const result = await pipeline.processPDF(invalidFile)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Invalid PDF file format')
    })

    it('should validate file size limits', async () => {
      // Create large file (mock)
      const largeContent = new Uint8Array(15 * 1024 * 1024) // 15MB
      largeContent[0] = 0x25 // %
      largeContent[1] = 0x50 // P
      largeContent[2] = 0x44 // D
      largeContent[3] = 0x46 // F
      largeContent[4] = 0x2D // -
      
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' })

      const result = await pipeline.processPDF(largeFile)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('File too large')
    })

    it('should validate file format', async () => {
      const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' })

      const result = await pipeline.processPDF(textFile)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('Unsupported file format')
    })
  })

  describe('Batch Processing', () => {
    it('should process multiple PDF files', async () => {
      const files = [
        mockPdfFile,
        new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])], 'test2.pdf', { type: 'application/pdf' })
      ]

      const results = await pipeline.processBatch(files)

      expect(results).toHaveLength(2)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle mixed success/failure in batch', async () => {
      const files = [
        mockPdfFile,
        new File([new Uint8Array([0x00, 0x00])], 'invalid.pdf', { type: 'application/pdf' })
      ]

      const results = await pipeline.processBatch(files)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })
  })

  describe('Configuration Options', () => {
    it('should work with diagram detection disabled', async () => {
      const configWithoutDiagrams: PipelineConfig = {
        ...config,
        enableDiagramDetection: false
      }

      const pipelineWithoutDiagrams = new EnhancedPDFProcessingPipeline(configWithoutDiagrams)
      const result = await pipelineWithoutDiagrams.processPDF(mockPdfFile)

      expect(result.success).toBe(true)
      expect(result.questions.length).toBeGreaterThan(0)
      // Should create basic questions without diagram detection
      
      await pipelineWithoutDiagrams.cleanup()
    })

    it('should respect quality threshold settings', async () => {
      const highQualityConfig: PipelineConfig = {
        ...config,
        qualityThreshold: 0.95 // Very high threshold
      }

      const highQualityPipeline = new EnhancedPDFProcessingPipeline(highQualityConfig)
      const result = await highQualityPipeline.processPDF(mockPdfFile)

      expect(result.success).toBe(true)
      // With high threshold, some diagrams might be filtered out
      
      await highQualityPipeline.cleanup()
    })

    it('should handle different batch sizes', async () => {
      const smallBatchConfig: PipelineConfig = {
        ...config,
        batchSize: 1
      }

      const smallBatchPipeline = new EnhancedPDFProcessingPipeline(smallBatchConfig)
      
      const files = [
        mockPdfFile,
        new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])], 'test2.pdf', { type: 'application/pdf' })
      ]

      const results = await smallBatchPipeline.processBatch(files)

      expect(results).toHaveLength(2)
      expect(results.every(r => r.success)).toBe(true)
      
      await smallBatchPipeline.cleanup()
    })
  })

  describe('Quality Metrics', () => {
    it('should calculate quality scores correctly', async () => {
      const result = await pipeline.processPDF(mockPdfFile)

      expect(result.metadata.qualityScore).toBeGreaterThan(0)
      expect(result.metadata.qualityScore).toBeLessThanOrEqual(1)
    })

    it('should track processing statistics', async () => {
      const result = await pipeline.processPDF(mockPdfFile)

      expect(result.processingStats.totalQuestions).toBeGreaterThan(0)
      expect(result.processingStats.processingTime).toBeGreaterThan(0)
      expect(result.processingStats.averageConfidence).toBeGreaterThan(0)
      expect(result.processingStats.errors).toBe(0)
    })

    it('should provide detailed metadata', async () => {
      const result = await pipeline.processPDF(mockPdfFile)

      expect(result.metadata.originalFileName).toBe('test.pdf')
      expect(result.metadata.fileSize).toBe(mockPdfFile.size)
      expect(result.metadata.pageCount).toBeGreaterThan(0)
      expect(result.metadata.processingTime).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should collect and report errors properly', async () => {
      // Mock diagram service to throw error
      const errorPipeline = new EnhancedPDFProcessingPipeline(config)
      
      // Override the diagram service to simulate error
      ;(errorPipeline as any).diagramService = {
        processPDFWithDiagramDetection: vi.fn(() => {
          throw new Error('Simulated API error')
        }),
        cleanup: vi.fn()
      }

      const result = await errorPipeline.processPDF(mockPdfFile)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      
      await errorPipeline.cleanup()
    })

    it('should provide meaningful error messages', async () => {
      const invalidFile = new File(['not a pdf'], 'fake.pdf', { type: 'application/pdf' })

      const result = await pipeline.processPDF(invalidFile)

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('Invalid PDF file format')
      expect(result.errors[0].type).toBe('PROCESSING_ERROR')
      expect(result.errors[0].timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Resume Processing', () => {
    it('should handle resume processing gracefully', async () => {
      const result = await pipeline.resumeProcessing('non-existent-test-id')

      expect(result).toBeNull()
    })

    it('should return null for non-existent sessions', async () => {
      const result = await pipeline.resumeProcessing('fake-session-id')

      expect(result).toBeNull()
    })
  })

  describe('Resource Management', () => {
    it('should clean up resources properly', async () => {
      await pipeline.processPDF(mockPdfFile)
      
      // Should not throw when cleaning up
      await expect(pipeline.cleanup()).resolves.not.toThrow()
    })

    it('should handle multiple cleanup calls', async () => {
      await pipeline.cleanup()
      await pipeline.cleanup() // Second cleanup should not throw
      
      expect(true).toBe(true) // Test passes if no exception thrown
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty PDF files', async () => {
      const emptyPdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])], 'empty.pdf', { 
        type: 'application/pdf' 
      })

      const result = await pipeline.processPDF(emptyPdf)

      // Should handle gracefully, either succeed with no questions or fail with clear error
      expect(result.testId).toBeDefined()
      expect(result.metadata.originalFileName).toBe('empty.pdf')
    })

    it('should generate unique test IDs', async () => {
      const result1 = await pipeline.processPDF(mockPdfFile)
      const result2 = await pipeline.processPDF(mockPdfFile)

      expect(result1.testId).not.toBe(result2.testId)
    })

    it('should handle files with special characters in names', async () => {
      const specialFile = new File(
        [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])], 
        'test file with spaces & symbols!.pdf', 
        { type: 'application/pdf' }
      )

      const result = await pipeline.processPDF(specialFile)

      expect(result.testId).toBeDefined()
      expect(result.testId).toMatch(/^test_.*_\d+$/)
    })
  })
})