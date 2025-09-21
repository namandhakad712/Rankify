/**
 * Enhanced PDF Processing Pipeline
 * 
 * This module provides a comprehensive PDF processing pipeline that integrates
 * diagram detection, coordinate validation, and database storage capabilities.
 */

import type { 
  EnhancedQuestion,
  DiagramCoordinates,
  ProcessingStats,
  DiagramDetectionError,
  CoordinateMetadata,
  PageImageData
} from '~/shared/types/diagram-detection'
import type { PDFProcessingResult, PDFPageInfo } from './pdfProcessingUtils'
import { PDFProcessor, createPDFProcessor } from './pdfProcessingUtils'
import { DiagramDetectionService } from './diagramDetectionService'
import { CoordinateValidator } from './coordinateValidator'
import { CoordinateSanitizer } from './coordinateSanitizer'
import { DiagramDatabaseManager } from './diagramDatabaseUtils'

export interface PipelineConfig {
  geminiApiKey: string
  enableDiagramDetection?: boolean
  enableCoordinateValidation?: boolean
  enableDatabaseStorage?: boolean
  batchSize?: number
  qualityThreshold?: number
  maxFileSize?: number // MB
  supportedFormats?: string[]
}

export interface PipelineResult {
  success: boolean
  testId: string
  questions: EnhancedQuestion[]
  pageImages: PageImageData[]
  diagramCoordinates: Map<string, DiagramCoordinates[]>
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

export class EnhancedPDFProcessingPipeline {
  private config: Required<PipelineConfig>
  private pdfProcessor: PDFProcessor | null = null
  private diagramService: DiagramDetectionService | null = null
  private validator: CoordinateValidator
  private sanitizer: CoordinateSanitizer
  private dbManager: DiagramDatabaseManager

  constructor(config: PipelineConfig) {
    this.config = {
      enableDiagramDetection: true,
      enableCoordinateValidation: true,
      enableDatabaseStorage: true,
      batchSize: 3,
      qualityThreshold: 0.7,
      maxFileSize: 50, // 50MB default
      supportedFormats: ['application/pdf'],
      ...config
    }

    this.validator = new CoordinateValidator()
    this.sanitizer = new CoordinateSanitizer()
    this.dbManager = new DiagramDatabaseManager()

    if (this.config.enableDiagramDetection) {
      this.diagramService = new DiagramDetectionService({
        geminiConfig: {
          apiKey: this.config.geminiApiKey,
          enableCoordinateDetection: true,
          coordinateConfidenceThreshold: this.config.qualityThreshold,
          maxDiagramsPerPage: 10,
          fallbackEnabled: true
        },
        validationEnabled: this.config.enableCoordinateValidation,
        storageEnabled: this.config.enableDatabaseStorage,
        batchSize: this.config.batchSize
      })
    }
  }

  /**
   * Process PDF file through the complete pipeline
   */
  async processPDF(pdfFile: File): Promise<PipelineResult> {
    const startTime = performance.now()
    const testId = this.generateTestId(pdfFile.name)
    const errors: DiagramDetectionError[] = []
    const warnings: string[] = []

    try {
      // Step 1: Validate input file
      await this.validateInputFile(pdfFile)

      // Step 2: Initialize PDF processor
      await this.initializePDFProcessor()

      // Step 3: Extract basic PDF content
      const pdfResult = await this.extractPDFContent(pdfFile)
      
      // Step 4: Convert PDF pages to images
      const pageImages = await this.convertPagesToImages(pdfFile, pdfResult.pageCount)

      // Step 5: Process with diagram detection (if enabled)
      let questions: EnhancedQuestion[] = []
      let diagramCoordinates = new Map<string, DiagramCoordinates[]>()
      
      if (this.config.enableDiagramDetection && this.diagramService) {
        const detectionResult = await this.diagramService.processPDFWithDiagramDetection(pdfFile, {
          testId,
          storeResults: this.config.enableDatabaseStorage,
          validateCoordinates: this.config.enableCoordinateValidation
        })
        
        questions = detectionResult.questions
        diagramCoordinates = detectionResult.diagramCoordinates
        errors.push(...detectionResult.errors)
        warnings.push(...detectionResult.warnings)
      } else {
        // Fallback: Create basic questions from PDF content
        questions = await this.createBasicQuestions(pdfResult, testId)
      }

      // Step 6: Post-process and validate results
      const processedQuestions = await this.postProcessQuestions(questions, pageImages)

      // Step 7: Calculate quality metrics
      const qualityScore = this.calculateQualityScore(processedQuestions, errors.length)

      // Step 8: Generate processing statistics
      const processingStats: ProcessingStats = {
        totalQuestions: processedQuestions.length,
        questionsWithDiagrams: processedQuestions.filter(q => q.hasDiagram).length,
        averageConfidence: this.calculateAverageConfidence(processedQuestions),
        processingTime: performance.now() - startTime,
        apiCalls: this.diagramService ? 1 : 0, // Simplified for now
        errors: errors.length
      }

      return {
        success: errors.length === 0,
        testId,
        questions: processedQuestions,
        pageImages,
        diagramCoordinates,
        processingStats,
        errors,
        warnings,
        metadata: {
          originalFileName: pdfFile.name,
          fileSize: pdfFile.size,
          pageCount: pdfResult.pageCount,
          processingTime: processingStats.processingTime,
          qualityScore
        }
      }

    } catch (error) {
      const processingError: DiagramDetectionError = {
        type: 'PROCESSING_ERROR',
        message: `Pipeline processing failed: ${error.message}`,
        originalError: error,
        timestamp: new Date()
      }
      errors.push(processingError)

      return {
        success: false,
        testId,
        questions: [],
        pageImages: [],
        diagramCoordinates: new Map(),
        processingStats: {
          totalQuestions: 0,
          questionsWithDiagrams: 0,
          averageConfidence: 0,
          processingTime: performance.now() - startTime,
          apiCalls: 0,
          errors: errors.length
        },
        errors,
        warnings,
        metadata: {
          originalFileName: pdfFile.name,
          fileSize: pdfFile.size,
          pageCount: 0,
          processingTime: performance.now() - startTime,
          qualityScore: 0
        }
      }
    }
  }

  /**
   * Process multiple PDF files in batch
   */
  async processBatch(pdfFiles: File[]): Promise<PipelineResult[]> {
    const results: PipelineResult[] = []
    
    // Process files in batches to manage memory and API limits
    for (let i = 0; i < pdfFiles.length; i += this.config.batchSize) {
      const batch = pdfFiles.slice(i, i + this.config.batchSize)
      
      const batchPromises = batch.map(file => this.processPDF(file))
      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          // Create error result for failed processing
          results.push({
            success: false,
            testId: 'failed',
            questions: [],
            pageImages: [],
            diagramCoordinates: new Map(),
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
              message: `Batch processing failed: ${result.reason}`,
              timestamp: new Date()
            }],
            warnings: [],
            metadata: {
              originalFileName: 'unknown',
              fileSize: 0,
              pageCount: 0,
              processingTime: 0,
              qualityScore: 0
            }
          })
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i + this.config.batchSize < pdfFiles.length) {
        await this.delay(2000)
      }
    }
    
    return results
  }

  /**
   * Resume processing from a previous session
   */
  async resumeProcessing(testId: string): Promise<PipelineResult | null> {
    try {
      // Try to load existing data from database
      const existingQuestions = await this.loadExistingQuestions(testId)
      const existingImages = await this.loadExistingImages(testId)
      
      if (existingQuestions.length === 0) {
        return null // No existing data found
      }

      // Reconstruct coordinate map
      const diagramCoordinates = new Map<string, DiagramCoordinates[]>()
      for (const question of existingQuestions) {
        if (question.diagrams.length > 0) {
          diagramCoordinates.set(question.id, question.diagrams)
        }
      }

      return {
        success: true,
        testId,
        questions: existingQuestions,
        pageImages: existingImages,
        diagramCoordinates,
        processingStats: {
          totalQuestions: existingQuestions.length,
          questionsWithDiagrams: existingQuestions.filter(q => q.hasDiagram).length,
          averageConfidence: this.calculateAverageConfidence(existingQuestions),
          processingTime: 0, // Not tracked for resumed sessions
          apiCalls: 0,
          errors: 0
        },
        errors: [],
        warnings: ['Resumed from previous session'],
        metadata: {
          originalFileName: 'resumed',
          fileSize: 0,
          pageCount: existingImages.length,
          processingTime: 0,
          qualityScore: this.calculateQualityScore(existingQuestions, 0)
        }
      }
    } catch (error) {
      console.error('Failed to resume processing:', error)
      return null
    }
  }

  // Private helper methods

  private async validateInputFile(file: File): Promise<void> {
    // Check file type
    if (!this.config.supportedFormats.includes(file.type)) {
      throw new Error(`Unsupported file format: ${file.type}`)
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > this.config.maxFileSize) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB (max: ${this.config.maxFileSize}MB)`)
    }

    // Basic PDF validation
    const buffer = await file.arrayBuffer()
    const header = new Uint8Array(buffer.slice(0, 5))
    const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2D] // %PDF-
    
    if (!header.every((byte, index) => byte === pdfSignature[index])) {
      throw new Error('Invalid PDF file format')
    }
  }

  private async initializePDFProcessor(): Promise<void> {
    if (!this.pdfProcessor) {
      this.pdfProcessor = await createPDFProcessor()
    }
  }

  private async extractPDFContent(pdfFile: File): Promise<PDFProcessingResult> {
    if (!this.pdfProcessor) {
      throw new Error('PDF processor not initialized')
    }

    const buffer = await pdfFile.arrayBuffer()
    await this.pdfProcessor.loadPDF(buffer)
    
    return await this.pdfProcessor.extractText({
      preserveFormatting: true,
      includeMetadata: true,
      extractImages: true
    })
  }

  private async convertPagesToImages(pdfFile: File, pageCount: number): Promise<PageImageData[]> {
    const pageImages: PageImageData[] = []
    
    // This is a simplified implementation
    // In a real implementation, you would use MuPDF or similar to convert PDF pages to images
    for (let i = 1; i <= pageCount; i++) {
      const mockImageData = this.createMockPageImage(i)
      pageImages.push(mockImageData)
    }
    
    return pageImages
  }

  private createMockPageImage(pageNumber: number): PageImageData {
    // Create a mock page image for testing
    // In real implementation, this would be actual PDF page conversion
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 800, 600)
    ctx.fillStyle = '#000000'
    ctx.font = '16px Arial'
    ctx.fillText(`Page ${pageNumber}`, 50, 50)
    
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png')
    }).then(blob => ({
      id: `page_${pageNumber}`,
      pageNumber,
      testId: 'mock',
      imageData: blob,
      dimensions: { width: 800, height: 600 },
      scale: 1.0,
      createdAt: new Date()
    })) as any // Simplified for now
  }

  private async createBasicQuestions(pdfResult: PDFProcessingResult, testId: string): Promise<EnhancedQuestion[]> {
    const questions: EnhancedQuestion[] = []
    
    // Create basic questions from PDF content without diagram detection
    for (let i = 0; i < pdfResult.pages.length; i++) {
      const page = pdfResult.pages[i]
      
      if (page.text.trim().length > 50) { // Only create questions for pages with substantial content
        questions.push({
          id: `${testId}_basic_q_${i + 1}`,
          text: page.text.substring(0, 200) + '...', // Truncate for preview
          type: 'MCQ',
          options: [],
          hasDiagram: page.hasImages,
          diagrams: [],
          pageNumber: page.pageNumber,
          confidence: page.confidence / 5, // Convert from 1-5 to 0-1 scale
          pdfData: []
        })
      }
    }
    
    return questions
  }

  private async postProcessQuestions(
    questions: EnhancedQuestion[], 
    pageImages: PageImageData[]
  ): Promise<EnhancedQuestion[]> {
    const processedQuestions: EnhancedQuestion[] = []
    
    for (const question of questions) {
      let processed = { ...question }
      
      // Validate and sanitize coordinates if present
      if (this.config.enableCoordinateValidation && processed.diagrams.length > 0) {
        const pageImage = pageImages.find(img => img.pageNumber === processed.pageNumber)
        if (pageImage) {
          const validatedDiagrams: DiagramCoordinates[] = []
          
          for (const diagram of processed.diagrams) {
            const sanitizationResult = this.sanitizer.sanitizeForStorage(
              diagram, 
              pageImage.dimensions
            )
            
            if (sanitizationResult.sanitized) {
              validatedDiagrams.push(sanitizationResult.sanitized)
            }
          }
          
          processed.diagrams = validatedDiagrams
          processed.hasDiagram = validatedDiagrams.length > 0
        }
      }
      
      processedQuestions.push(processed)
    }
    
    return processedQuestions
  }

  private calculateQualityScore(questions: EnhancedQuestion[], errorCount: number): number {
    if (questions.length === 0) return 0
    
    let score = 0.5 // Base score
    
    // Boost for questions with high confidence
    const avgConfidence = this.calculateAverageConfidence(questions)
    score += avgConfidence * 0.3
    
    // Boost for questions with diagrams
    const diagramRatio = questions.filter(q => q.hasDiagram).length / questions.length
    score += diagramRatio * 0.1
    
    // Penalize for errors
    const errorPenalty = Math.min(0.3, errorCount * 0.05)
    score -= errorPenalty
    
    return Math.max(0, Math.min(1, score))
  }

  private calculateAverageConfidence(questions: EnhancedQuestion[]): number {
    if (questions.length === 0) return 0
    
    const totalConfidence = questions.reduce((sum, q) => sum + q.confidence, 0)
    return totalConfidence / questions.length
  }

  private async loadExistingQuestions(testId: string): Promise<EnhancedQuestion[]> {
    // Implementation would load from database
    // For now, return empty array
    return []
  }

  private async loadExistingImages(testId: string): Promise<PageImageData[]> {
    // Implementation would load from database
    // For now, return empty array
    return []
  }

  private generateTestId(fileName: string): string {
    const timestamp = Date.now()
    const cleanName = fileName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
    return `test_${cleanName}_${timestamp}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.pdfProcessor) {
      this.pdfProcessor.dispose()
      this.pdfProcessor = null
    }
    
    if (this.diagramService) {
      await this.diagramService.cleanup()
      this.diagramService = null
    }
    
    await this.dbManager.close()
  }
}

// Export factory function
export function createEnhancedPDFPipeline(config: PipelineConfig): EnhancedPDFProcessingPipeline {
  return new EnhancedPDFProcessingPipeline(config)
}

export default EnhancedPDFProcessingPipeline