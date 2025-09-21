/**
 * Integration Tests for PDF Processing Pipeline
 * 
 * This file contains integration tests that verify the complete workflow
 * from PDF input to diagram coordinate output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { 
  OrchestrationConfig,
  ProcessingSession
} from '../pipelineOrchestrator'
import { PipelineOrchestrator } from '../pipelineOrchestrator'

// Mock file system operations
global.File = class MockFile {
  name: string
  size: number
  type: string
  content: Uint8Array

  constructor(content: BlobPart[], name: string, options?: FilePropertyBag) {
    this.name = name
    this.type = options?.type || ''
    this.content = content[0] as Uint8Array
    this.size = this.content.length
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.content.buffer
  }
} as any

describe('Pipeline Integration Tests', () => {
  let orchestrator: PipelineOrchestrator
  let config: OrchestrationConfig
  let mockPdfFiles: File[]

  beforeEach(() => {
    config = {
      geminiApiKey: 'test-api-key',
      enableDiagramDetection: true,
      enableCoordinateValidation: true,
      enableDatabaseStorage: false, // Disable for testing
      enableProgressTracking: true,
      enableErrorRecovery: true,
      enableStatePersistence: false, // Disable for testing
      batchSize: 2,
      maxRetries: 2,
      retryDelay: 100,
      qualityThreshold: 0.7,
      maxFileSize: 10,
      supportedFormats: ['application/pdf']
    }

    orchestrator = new PipelineOrchestrator(config)

    // Create mock PDF files
    const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]) // %PDF-
    mockPdfFiles = [
      new File([pdfHeader], 'test1.pdf', { type: 'application/pdf' }),
      new File([pdfHeader], 'test2.pdf', { type: 'application/pdf' }),
      new File([pdfHeader], 'test3.pdf', { type: 'application/pdf' })
    ]
  })

  afterEach(async () => {
    await orchestrator.cleanup()
    vi.clearAllMocks()
  })

  describe('Complete Workflow', () => {
    it('should process multiple files through complete pipeline', async () => {
      const sessionId = await orchestrator.startProcessingSession(mockPdfFiles)

      expect(sessionId).toBeDefined()
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      const session = orchestrator.getSessionStatus(sessionId)
      expect(session).toBeDefined()
      expect(session!.files).toHaveLength(3)
    })

    it('should track progress throughout processing', async () => {
      const progressUpdates: ProcessingSession[] = []
      
      const sessionId = await orchestrator.startProcessingSession(mockPdfFiles, {
        onProgress: (session) => {
          progressUpdates.push({ ...session })
        }
      })

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[0].progress.percentage).toBe(0)
      
      const finalUpdate = progressUpdates[progressUpdates.length - 1]
      expect(finalUpdate.status).toMatch(/completed|failed/)
    })

    it('should handle mixed file types gracefully', async () => {
      const mixedFiles = [
        ...mockPdfFiles,
        new File([new Uint8Array([0x00, 0x00])], 'invalid.txt', { type: 'text/plain' })
      ]

      const sessionId = await orchestrator.startProcessingSession(mixedFiles)
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      const session = orchestrator.getSessionStatus(sessionId)
      expect(session).toBeDefined()
      
      // Should have processed valid PDFs and failed on invalid file
      const validFiles = session!.files.filter(f => f.status === 'completed')
      const failedFiles = session!.files.filter(f => f.status === 'failed')
      
      expect(validFiles.length).toBe(3) // 3 valid PDFs
      expect(failedFiles.length).toBe(1) // 1 invalid file
    })
  })

  describe('Error Recovery', () => {
    it('should retry failed operations', async () => {
      // Mock a service that fails first time but succeeds on retry
      let attemptCount = 0
      const mockFailingService = {
        processPDFWithDiagramDetection: vi.fn(() => {
          attemptCount++
          if (attemptCount === 1) {
            throw new Error('Temporary failure')
          }
          return {
            success: true,
            questions: [],
            diagramCoordinates: new Map(),
            processingStats: {
              totalQuestions: 0,
              questionsWithDiagrams: 0,
              averageConfidence: 0,
              processingTime: 100,
              apiCalls: 1,
              errors: 0
            },
            errors: [],
            warnings: []
          }
        }),
        cleanup: vi.fn()
      }

      // Override the pipeline's diagram service
      const pipeline = (orchestrator as any).pipeline
      pipeline.diagramService = mockFailingService

      const sessionId = await orchestrator.startProcessingSession([mockPdfFiles[0]])
      
      // Wait for processing with retries
      await new Promise(resolve => setTimeout(resolve, 3000))

      expect(attemptCount).toBeGreaterThan(1) // Should have retried
    })

    it('should fail after max retries exceeded', async () => {
      // Mock a service that always fails
      const mockAlwaysFailingService = {
        processPDFWithDiagramDetection: vi.fn(() => {
          throw new Error('Persistent failure')
        }),
        cleanup: vi.fn()
      }

      const pipeline = (orchestrator as any).pipeline
      pipeline.diagramService = mockAlwaysFailingService

      const sessionId = await orchestrator.startProcessingSession([mockPdfFiles[0]])
      
      // Wait for processing to fail
      await new Promise(resolve => setTimeout(resolve, 3000))

      const session = orchestrator.getSessionStatus(sessionId)
      expect(session!.files[0].status).toBe('failed')
      expect(session!.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Session Management', () => {
    it('should allow session cancellation', async () => {
      const sessionId = await orchestrator.startProcessingSession(mockPdfFiles)
      
      // Cancel immediately
      const cancelled = await orchestrator.cancelSession(sessionId)
      expect(cancelled).toBe(true)

      const session = orchestrator.getSessionStatus(sessionId)
      expect(session!.status).toBe('cancelled')
    })

    it('should return null for non-existent sessions', async () => {
      const session = orchestrator.getSessionStatus('non-existent-session')
      expect(session).toBeNull()
    })

    it('should clean up old sessions', async () => {
      const sessionId = await orchestrator.startProcessingSession([mockPdfFiles[0]])
      
      // Manually set old end time
      const session = orchestrator.getSessionStatus(sessionId)!
      session.endTime = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      
      orchestrator.cleanupSessions(24) // Clean sessions older than 24 hours
      
      const cleanedSession = orchestrator.getSessionStatus(sessionId)
      expect(cleanedSession).toBeNull()
    })
  })

  describe('Results Generation', () => {
    it('should generate comprehensive orchestration results', async () => {
      const sessionId = await orchestrator.startProcessingSession(mockPdfFiles)
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mark session as completed for testing
      const session = orchestrator.getSessionStatus(sessionId)!
      session.status = 'completed'
      
      // Add mock results
      session.files.forEach(file => {
        file.status = 'completed'
        file.result = {
          success: true,
          testId: `test_${file.name}`,
          questions: [
            {
              id: 'q1',
              text: 'Sample question',
              type: 'MCQ',
              options: [],
              hasDiagram: true,
              diagrams: [],
              pageNumber: 1,
              confidence: 0.8,
              pdfData: []
            }
          ],
          pageImages: [],
          diagramCoordinates: new Map(),
          processingStats: {
            totalQuestions: 1,
            questionsWithDiagrams: 1,
            averageConfidence: 0.8,
            processingTime: 1000,
            apiCalls: 1,
            errors: 0
          },
          errors: [],
          warnings: [],
          metadata: {
            originalFileName: file.name,
            fileSize: file.size,
            pageCount: 1,
            processingTime: 1000,
            qualityScore: 0.8
          }
        }
      })

      const results = await orchestrator.getOrchestrationResults(sessionId)
      
      expect(results).toBeDefined()
      expect(results!.success).toBe(true)
      expect(results!.results).toHaveLength(3)
      expect(results!.summary.totalFiles).toBe(3)
      expect(results!.summary.successfulFiles).toBe(3)
      expect(results!.summary.totalQuestions).toBe(3)
    })

    it('should return null for incomplete sessions', async () => {
      const sessionId = await orchestrator.startProcessingSession([mockPdfFiles[0]])
      
      // Don't wait for completion
      const results = await orchestrator.getOrchestrationResults(sessionId)
      expect(results).toBeNull()
    })
  })

  describe('Batch Processing', () => {
    it('should respect batch size limits', async () => {
      const largeBatch = Array.from({ length: 10 }, (_, i) => 
        new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])], `test${i}.pdf`, { type: 'application/pdf' })
      )

      const sessionId = await orchestrator.startProcessingSession(largeBatch)
      
      // With batch size 2, should process in 5 batches
      const session = orchestrator.getSessionStatus(sessionId)
      expect(session!.files).toHaveLength(10)
      expect(session!.progress.totalSteps).toBeGreaterThan(5) // At least 5 batch steps + overhead
    })

    it('should handle empty file arrays', async () => {
      const sessionId = await orchestrator.startProcessingSession([])
      
      const session = orchestrator.getSessionStatus(sessionId)
      expect(session!.files).toHaveLength(0)
      expect(session!.status).toBe('pending')
    })
  })

  describe('Configuration Impact', () => {
    it('should respect quality threshold settings', async () => {
      const highQualityConfig: OrchestrationConfig = {
        ...config,
        qualityThreshold: 0.95
      }

      const highQualityOrchestrator = new PipelineOrchestrator(highQualityConfig)
      
      const sessionId = await highQualityOrchestrator.startProcessingSession([mockPdfFiles[0]])
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500))

      const session = highQualityOrchestrator.getSessionStatus(sessionId)
      expect(session).toBeDefined()
      
      await highQualityOrchestrator.cleanup()
    })

    it('should handle disabled features gracefully', async () => {
      const minimalConfig: OrchestrationConfig = {
        ...config,
        enableDiagramDetection: false,
        enableCoordinateValidation: false,
        enableProgressTracking: false
      }

      const minimalOrchestrator = new PipelineOrchestrator(minimalConfig)
      
      const sessionId = await minimalOrchestrator.startProcessingSession([mockPdfFiles[0]])
      
      const session = minimalOrchestrator.getSessionStatus(sessionId)
      expect(session).toBeDefined()
      
      await minimalOrchestrator.cleanup()
    })
  })

  describe('Performance', () => {
    it('should process files within reasonable time limits', async () => {
      const startTime = Date.now()
      
      const sessionId = await orchestrator.startProcessingSession([mockPdfFiles[0]])
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000))

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Should complete within 5 seconds for a single small file
      expect(totalTime).toBeLessThan(5000)
    })

    it('should handle concurrent sessions', async () => {
      const session1 = await orchestrator.startProcessingSession([mockPdfFiles[0]])
      const session2 = await orchestrator.startProcessingSession([mockPdfFiles[1]])
      
      expect(session1).not.toBe(session2)
      
      const status1 = orchestrator.getSessionStatus(session1)
      const status2 = orchestrator.getSessionStatus(session2)
      
      expect(status1).toBeDefined()
      expect(status2).toBeDefined()
      expect(status1!.id).not.toBe(status2!.id)
    })
  })
})