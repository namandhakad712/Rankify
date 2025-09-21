/**
 * Diagram Detection Service
 * 
 * This service provides a high-level interface for diagram detection operations,
 * combining Gemini API integration, coordinate validation, and database storage.
 */

import type { 
  DiagramCoordinates,
  EnhancedQuestion,
  CoordinateMetadata,
  ProcessingStats,
  DiagramDetectionError,
  GeminiAPIError
} from '~/shared/types/diagram-detection'
import { EnhancedGeminiClient, type EnhancedGeminiConfig } from './enhancedGeminiClient'
import { CoordinateValidator } from './coordinateValidator'
import { DiagramDatabaseManager } from './diagramDatabaseUtils'
import { GeminiErrorHandler } from './geminiErrorHandler'

export interface DiagramDetectionConfig {
  geminiConfig: EnhancedGeminiConfig
  validationEnabled?: boolean
  storageEnabled?: boolean
  cacheEnabled?: boolean
  batchSize?: number
}

export interface DetectionResult {
  success: boolean
  questions: EnhancedQuestion[]
  diagramCoordinates: Map<string, DiagramCoordinates[]>
  processingStats: ProcessingStats
  errors: DiagramDetectionError[]
  warnings: string[]
}

export class DiagramDetectionService {
  private geminiClient: EnhancedGeminiClient
  private validator: CoordinateValidator
  private dbManager: DiagramDatabaseManager
  private errorHandler: GeminiErrorHandler
  private config: Required<DiagramDetectionConfig>

  constructor(config: DiagramDetectionConfig) {
    this.config = {
      validationEnabled: true,
      storageEnabled: true,
      cacheEnabled: true,
      batchSize: 3,
      ...config
    }

    this.geminiClient = new EnhancedGeminiClient(config.geminiConfig)
    this.validator = new CoordinateValidator()
    this.dbManager = new DiagramDatabaseManager()
    this.errorHandler = new GeminiErrorHandler({
      retryAttempts: config.geminiConfig.maxRetries || 3,
      retryDelay: config.geminiConfig.retryDelay || 1000,
      fallbackEnabled: config.geminiConfig.fallbackEnabled !== false
    })
  }

  /**
   * Process PDF with comprehensive diagram detection
   */
  async processPDFWithDiagramDetection(
    pdfFile: File,
    options?: {
      testId?: string
      storeResults?: boolean
      validateCoordinates?: boolean
    }
  ): Promise<DetectionResult> {
    const startTime = performance.now()
    const errors: DiagramDetectionError[] = []
    const warnings: string[] = []

    try {
      // Convert PDF to ArrayBuffer
      const pdfBuffer = await this.fileToArrayBuffer(pdfFile)
      
      // Extract questions with diagram detection
      const extractionResult = await this.geminiClient.extractQuestionsWithDiagrams(
        pdfBuffer,
        pdfFile.name
      )

      // Validate coordinates if enabled
      if (this.config.validationEnabled && options?.validateCoordinates !== false) {
        await this.validateAllCoordinates(extractionResult.diagramCoordinates, warnings)
      }

      // Store results if enabled
      if (this.config.storageEnabled && options?.storeResults !== false) {
        await this.storeDetectionResults(
          extractionResult.questions,
          extractionResult.diagramCoordinates,
          options?.testId || this.generateTestId(pdfFile.name)
        )
      }

      // Create processing stats
      const processingStats: ProcessingStats = {
        totalQuestions: extractionResult.questions.length,
        questionsWithDiagrams: extractionResult.questionsWithDiagrams,
        averageConfidence: extractionResult.processingStats.averageConfidence,
        processingTime: performance.now() - startTime,
        apiCalls: 1, // Base extraction call
        errors: errors.length
      }

      // Convert diagram coordinates map
      const coordinatesMap = new Map<string, DiagramCoordinates[]>()
      for (const question of extractionResult.questions) {
        if (question.diagrams.length > 0) {
          coordinatesMap.set(question.id, question.diagrams)
        }
      }

      return {
        success: errors.length === 0,
        questions: extractionResult.questions,
        diagramCoordinates: coordinatesMap,
        processingStats,
        errors,
        warnings
      }

    } catch (error) {
      const detectionError: DiagramDetectionError = {
        type: 'PROCESSING_ERROR',
        message: `PDF processing failed: ${error.message}`,
        originalError: error,
        timestamp: new Date()
      }
      errors.push(detectionError)

      return {
        success: false,
        questions: [],
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
        warnings
      }
    }
  }

  /**
   * Detect diagrams on a single page image
   */
  async detectDiagramsOnPage(
    pageImage: ImageData,
    pageNumber: number,
    options?: {
      questionId?: string
      storeResults?: boolean
    }
  ): Promise<{
    diagrams: DiagramCoordinates[]
    confidence: number
    errors: DiagramDetectionError[]
  }> {
    const errors: DiagramDetectionError[] = []

    try {
      const analysis = await this.geminiClient.analyzePageForDiagrams(pageImage, pageNumber)
      
      // Validate coordinates
      if (this.config.validationEnabled) {
        const imageDimensions = { width: pageImage.width, height: pageImage.height }
        const validatedDiagrams: DiagramCoordinates[] = []

        for (const diagram of analysis.diagrams) {
          const validation = this.validator.validateCoordinates(diagram, imageDimensions)
          if (validation.isValid && validation.sanitizedCoordinates) {
            validatedDiagrams.push(validation.sanitizedCoordinates)
          } else {
            errors.push({
              type: 'VALIDATION_ERROR',
              message: `Invalid coordinates: ${validation.errors.join(', ')}`,
              pageNumber,
              timestamp: new Date()
            })
          }
        }

        analysis.diagrams = validatedDiagrams
      }

      // Store results if enabled
      if (this.config.storageEnabled && options?.storeResults && options.questionId) {
        await this.dbManager.storeQuestionDiagrams(
          options.questionId,
          pageNumber,
          analysis.diagrams,
          { width: pageImage.width, height: pageImage.height }
        )
      }

      return {
        diagrams: analysis.diagrams,
        confidence: analysis.confidence,
        errors
      }

    } catch (error) {
      const detectionError: DiagramDetectionError = {
        type: 'API_ERROR',
        message: `Page analysis failed: ${error.message}`,
        pageNumber,
        originalError: error,
        timestamp: new Date()
      }
      errors.push(detectionError)

      return {
        diagrams: [],
        confidence: 0,
        errors
      }
    }
  }

  /**
   * Batch process multiple pages
   */
  async batchProcessPages(
    pages: Array<{ pageNumber: number; imageData: ImageData; questionIds?: string[] }>,
    testId: string
  ): Promise<DetectionResult> {
    const startTime = performance.now()
    const errors: DiagramDetectionError[] = []
    const warnings: string[] = []
    const allQuestions: EnhancedQuestion[] = []
    const diagramCoordinates = new Map<string, DiagramCoordinates[]>()

    try {
      // Process pages in batches
      const batches = this.createBatches(pages, this.config.batchSize)
      let apiCalls = 0

      for (const batch of batches) {
        const batchPromises = batch.map(async page => {
          try {
            const result = await this.detectDiagramsOnPage(
              page.imageData,
              page.pageNumber,
              { storeResults: false } // We'll store in bulk later
            )
            
            apiCalls++
            errors.push(...result.errors)

            // Create enhanced questions for this page
            const pageQuestions: EnhancedQuestion[] = result.diagrams.map((diagram, index) => ({
              id: `${testId}_page_${page.pageNumber}_q_${index + 1}`,
              text: `Question ${index + 1} on page ${page.pageNumber}`,
              type: 'Diagram' as const,
              options: [],
              hasDiagram: true,
              diagrams: [diagram],
              pageNumber: page.pageNumber,
              confidence: diagram.confidence,
              pdfData: []
            }))

            return { pageNumber: page.pageNumber, questions: pageQuestions, diagrams: result.diagrams }
          } catch (error) {
            errors.push({
              type: 'PROCESSING_ERROR',
              message: `Failed to process page ${page.pageNumber}: ${error.message}`,
              pageNumber: page.pageNumber,
              originalError: error,
              timestamp: new Date()
            })
            return { pageNumber: page.pageNumber, questions: [], diagrams: [] }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        
        // Collect results
        for (const result of batchResults) {
          allQuestions.push(...result.questions)
          
          for (const question of result.questions) {
            if (question.diagrams.length > 0) {
              diagramCoordinates.set(question.id, question.diagrams)
            }
          }
        }

        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(1000)
        }
      }

      // Store results in bulk if enabled
      if (this.config.storageEnabled) {
        await this.bulkStoreResults(allQuestions, diagramCoordinates, testId)
      }

      const questionsWithDiagrams = allQuestions.filter(q => q.hasDiagram).length
      const averageConfidence = allQuestions.length > 0 ? 
        allQuestions.reduce((sum, q) => sum + q.confidence, 0) / allQuestions.length : 0

      const processingStats: ProcessingStats = {
        totalQuestions: allQuestions.length,
        questionsWithDiagrams,
        averageConfidence,
        processingTime: performance.now() - startTime,
        apiCalls,
        errors: errors.length
      }

      return {
        success: errors.length === 0,
        questions: allQuestions,
        diagramCoordinates,
        processingStats,
        errors,
        warnings
      }

    } catch (error) {
      errors.push({
        type: 'PROCESSING_ERROR',
        message: `Batch processing failed: ${error.message}`,
        originalError: error,
        timestamp: new Date()
      })

      return {
        success: false,
        questions: allQuestions,
        diagramCoordinates,
        processingStats: {
          totalQuestions: allQuestions.length,
          questionsWithDiagrams: 0,
          averageConfidence: 0,
          processingTime: performance.now() - startTime,
          apiCalls: 0,
          errors: errors.length
        },
        errors,
        warnings
      }
    }
  }

  /**
   * Get cached diagram data
   */
  async getCachedDiagrams(questionId: string): Promise<DiagramCoordinates[] | null> {
    if (!this.config.cacheEnabled) {
      return null
    }

    try {
      return await this.dbManager.getQuestionDiagrams(questionId)
    } catch (error) {
      console.warn('Failed to get cached diagrams:', error)
      return null
    }
  }

  /**
   * Update diagram coordinates after manual editing
   */
  async updateDiagramCoordinates(
    questionId: string,
    diagramId: string,
    newCoordinates: DiagramCoordinates,
    imageDimensions: { width: number; height: number }
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Validate new coordinates
      if (this.config.validationEnabled) {
        const validation = this.validator.validateCoordinates(newCoordinates, imageDimensions)
        if (!validation.isValid) {
          errors.push(...validation.errors)
          return { success: false, errors }
        }
        newCoordinates = validation.sanitizedCoordinates!
      }

      // Update in database
      await this.dbManager.updateDiagramCoordinates(questionId, diagramId, newCoordinates)

      return { success: true, errors }
    } catch (error) {
      errors.push(`Failed to update coordinates: ${error.message}`)
      return { success: false, errors }
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStatistics(): Promise<{
    totalQuestions: number
    questionsWithDiagrams: number
    averageConfidence: number
    pagesCovered: number
  }> {
    return await this.dbManager.getDiagramStatistics()
  }

  // Private helper methods

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  private async validateAllCoordinates(
    coordinatesMap: Map<number, DiagramCoordinates[]>,
    warnings: string[]
  ): Promise<void> {
    for (const [pageNumber, coordinates] of coordinatesMap) {
      for (const coord of coordinates) {
        // Assume standard page dimensions for validation
        const imageDimensions = { width: 800, height: 600 }
        const validation = this.validator.validateCoordinates(coord, imageDimensions)
        
        if (!validation.isValid) {
          warnings.push(`Page ${pageNumber}: ${validation.errors.join(', ')}`)
        }
      }
    }
  }

  private async storeDetectionResults(
    questions: EnhancedQuestion[],
    coordinatesMap: Map<number, DiagramCoordinates[]>,
    testId: string
  ): Promise<void> {
    const questionsData = questions
      .filter(q => q.hasDiagram && q.diagrams.length > 0)
      .map(q => ({
        questionId: q.id,
        pageNumber: q.pageNumber,
        diagrams: q.diagrams,
        imageDimensions: { width: 800, height: 600 } // Default dimensions
      }))

    if (questionsData.length > 0) {
      await this.dbManager.bulkStoreQuestionDiagrams(questionsData)
    }
  }

  private async bulkStoreResults(
    questions: EnhancedQuestion[],
    coordinatesMap: Map<string, DiagramCoordinates[]>,
    testId: string
  ): Promise<void> {
    const questionsData = questions
      .filter(q => q.hasDiagram && q.diagrams.length > 0)
      .map(q => ({
        questionId: q.id,
        pageNumber: q.pageNumber,
        diagrams: q.diagrams,
        imageDimensions: { width: 800, height: 600 }
      }))

    if (questionsData.length > 0) {
      await this.dbManager.bulkStoreQuestionDiagrams(questionsData)
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private generateTestId(fileName: string): string {
    const timestamp = Date.now()
    const cleanName = fileName.replace(/[^a-zA-Z0-9]/g, '_')
    return `test_${cleanName}_${timestamp}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.dbManager.close()
  }
}

// Export singleton instance
export const diagramDetectionService = new DiagramDetectionService({
  geminiConfig: {
    apiKey: '', // Will be set by user
    enableCoordinateDetection: true,
    coordinateConfidenceThreshold: 0.7,
    maxDiagramsPerPage: 10,
    fallbackEnabled: true
  }
})

export default DiagramDetectionService