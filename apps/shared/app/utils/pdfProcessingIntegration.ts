/**
 * PDF Processing Integration
 * 
 * This module provides integration between the enhanced PDF processing pipeline
 * and the existing Rankify application workflow.
 */

import type { 
  EnhancedQuestion,
  DiagramCoordinates,
  ProcessingStats,
  DiagramDetectionError
} from '~/shared/types/diagram-detection'
import type { PipelineResult, PipelineConfig } from './enhancedPdfProcessingPipeline'
import { EnhancedPDFProcessingPipeline } from './enhancedPdfProcessingPipeline'
import { PipelineOrchestrator, type OrchestrationConfig } from './pipelineOrchestrator'

export interface ProcessingIntegrationConfig {
  geminiApiKey: string
  enableDiagramDetection?: boolean
  enableProgressTracking?: boolean
  enableErrorRecovery?: boolean
  batchSize?: number
  qualityThreshold?: number
  maxFileSize?: number
}

export interface IntegrationResult {
  success: boolean
  testId: string
  questions: EnhancedQuestion[]
  processingStats: ProcessingStats
  errors: DiagramDetectionError[]
  warnings: string[]
  metadata: {
    originalFileName: string
    fileSize: number
    pageCount: number
    processingTime: number
    qualityScore: number
  }
}

/**
 * Main integration class that orchestrates PDF processing with diagram detection
 */
export class PDFProcessingIntegration {
  private pipeline: EnhancedPDFProcessingPipeline
  private orchestrator: PipelineOrchestrator
  private config: Required<ProcessingIntegrationConfig>

  constructor(config: ProcessingIntegrationConfig) {
    this.config = {
      enableDiagramDetection: true,
      enableProgressTracking: true,
      enableErrorRecovery: true,
      batchSize: 3,
      qualityThreshold: 0.7,
      maxFileSize: 50,
      ...config
    }

    // Initialize pipeline
    const pipelineConfig: PipelineConfig = {
      geminiApiKey: this.config.geminiApiKey,
      enableDiagramDetection: this.config.enableDiagramDetection,
      enableCoordinateValidation: true,
      enableDatabaseStorage: true,
      batchSize: this.config.batchSize,
      qualityThreshold: this.config.qualityThreshold,
      maxFileSize: this.config.maxFileSize,
      supportedFormats: ['application/pdf']
    }

    this.pipeline = new EnhancedPDFProcessingPipeline(pipelineConfig)

    // Initialize orchestrator
    const orchestrationConfig: OrchestrationConfig = {
      ...pipelineConfig,
      enableProgressTracking: this.config.enableProgressTracking,
      enableErrorRecovery: this.config.enableErrorRecovery,
      enableStatePersistence: true,
      maxRetries: 3,
      retryDelay: 2000
    }

    this.orchestrator = new PipelineOrchestrator(orchestrationConfig)
  }

  /**
   * Process a single PDF file with diagram detection
   */
  async processPDFFile(
    pdfFile: File,
    options?: {
      onProgress?: (progress: { percentage: number; currentStep: string }) => void
      enableManualReview?: boolean
    }
  ): Promise<IntegrationResult> {
    try {
      // Process through the enhanced pipeline
      const pipelineResult = await this.pipeline.processPDF(pdfFile)

      // Convert to integration result format
      return this.convertPipelineResult(pipelineResult)
    } catch (error) {
      return {
        success: false,
        testId: 'failed',
        questions: [],
        processingStats: {
          totalQuestions: 0,
          questionsWithDiagrams: 0,
          averageConfidence: 0,
          processingTime: 0,
          apiCalls: 0,
          errors: 1
        },
        errors: [{
          type: 'PROCESSING_ERROR',
          message: `PDF processing failed: ${error.message}`,
          originalError: error,
          timestamp: new Date()
        }],
        warnings: [],
        metadata: {
          originalFileName: pdfFile.name,
          fileSize: pdfFile.size,
          pageCount: 0,
          processingTime: 0,
          qualityScore: 0
        }
      }
    }
  }

  /**
   * Process multiple PDF files with orchestration
   */
  async processPDFBatch(
    pdfFiles: File[],
    options?: {
      onProgress?: (sessionId: string, progress: any) => void
      enableManualReview?: boolean
    }
  ): Promise<{
    sessionId: string
    results: IntegrationResult[]
    summary: {
      totalFiles: number
      successfulFiles: number
      failedFiles: number
      totalQuestions: number
      questionsWithDiagrams: number
      averageQuality: number
      totalProcessingTime: number
    }
  }> {
    // Start orchestrated processing session
    const sessionId = await this.orchestrator.startProcessingSession(pdfFiles, {
      onProgress: options?.onProgress ? (session) => {
        options.onProgress!(sessionId, {
          percentage: session.progress.percentage,
          currentStep: session.progress.currentStep,
          completedFiles: session.files.filter(f => f.status === 'completed').length,
          totalFiles: session.files.length
        })
      } : undefined
    })

    // Wait for completion
    let session = this.orchestrator.getSessionStatus(sessionId)
    while (session && session.status === 'processing') {
      await this.delay(1000)
      session = this.orchestrator.getSessionStatus(sessionId)
    }

    // Get final results
    const orchestrationResult = await this.orchestrator.getOrchestrationResults(sessionId)
    
    if (!orchestrationResult) {
      throw new Error('Failed to get orchestration results')
    }

    // Convert pipeline results to integration results
    const integrationResults = orchestrationResult.results.map(result => 
      this.convertPipelineResult(result)
    )

    return {
      sessionId,
      results: integrationResults,
      summary: orchestrationResult.summary
    }
  }

  /**
   * Resume processing from a previous session
   */
  async resumeProcessing(sessionId: string): Promise<IntegrationResult | null> {
    const resumed = await this.orchestrator.resumeSession(sessionId)
    if (!resumed) return null

    const orchestrationResult = await this.orchestrator.getOrchestrationResults(sessionId)
    if (!orchestrationResult || orchestrationResult.results.length === 0) {
      return null
    }

    // Return the first result (assuming single file resume)
    return this.convertPipelineResult(orchestrationResult.results[0])
  }

  /**
   * Get processing session status
   */
  getSessionStatus(sessionId: string) {
    return this.orchestrator.getSessionStatus(sessionId)
  }

  /**
   * Cancel processing session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    return await this.orchestrator.cancelSession(sessionId)
  }

  /**
   * Validate PDF file before processing
   */
  validatePDFFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' }
    }

    // Check file size
    const maxSize = this.config.maxFileSize * 1024 * 1024
    if (file.size > maxSize) {
      return { valid: false, error: `File size exceeds ${this.config.maxFileSize}MB limit` }
    }

    // Check file name
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: 'File must have .pdf extension' }
    }

    return { valid: true }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): ProcessingStats {
    // This would aggregate stats from the pipeline
    // For now, return empty stats
    return {
      totalQuestions: 0,
      questionsWithDiagrams: 0,
      averageConfidence: 0,
      processingTime: 0,
      apiCalls: 0,
      errors: 0
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.pipeline.cleanup()
    await this.orchestrator.cleanup()
  }

  // Private helper methods

  private convertPipelineResult(pipelineResult: PipelineResult): IntegrationResult {
    return {
      success: pipelineResult.success,
      testId: pipelineResult.testId,
      questions: pipelineResult.questions,
      processingStats: pipelineResult.processingStats,
      errors: pipelineResult.errors,
      warnings: pipelineResult.warnings,
      metadata: pipelineResult.metadata
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Factory function to create PDF processing integration
 */
export function createPDFProcessingIntegration(config: ProcessingIntegrationConfig): PDFProcessingIntegration {
  return new PDFProcessingIntegration(config)
}

/**
 * Utility function to estimate processing time for a PDF file
 */
export function estimateProcessingTime(file: File, enableDiagramDetection: boolean = true): number {
  // Base time: 2 seconds per MB
  let estimatedTime = (file.size / (1024 * 1024)) * 2000

  // Add time for diagram detection if enabled
  if (enableDiagramDetection) {
    estimatedTime *= 1.5 // 50% more time for AI processing
  }

  return Math.max(5000, estimatedTime) // Minimum 5 seconds
}

/**
 * Utility function to check if Gemini API key is configured
 */
export function isGeminiConfigured(apiKey?: string): boolean {
  return !!(apiKey && apiKey.length > 10)
}

export default PDFProcessingIntegration