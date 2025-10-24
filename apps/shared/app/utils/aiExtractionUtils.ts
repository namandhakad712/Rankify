/**
 * AI Extraction Utilities - Main orchestrator
 * Combines all AI extraction components into a cohesive API
 */

import { GeminiAPIClient, createGeminiClient, type GeminiAPIConfig, type AIExtractionResult } from './geminiAPIClient'
import { PDFProcessor, createPDFProcessor, pdfUtils, type PDFProcessingResult } from './pdfProcessingUtils'
import { getAIStorage, aiStorageUtils, type AIGeneratedTestData } from './aiStorageUtils'
import { 
  ConfidenceScorer, 
  QuestionValidator, 
  createConfidenceScorer, 
  createQuestionValidator,
  confidenceUtils,
  type ValidationResult 
} from './confidenceScoringUtils'

export interface AIExtractionConfig {
  geminiApiKey: string
  geminiModel?: string
  maxRetries?: number
  confidenceThreshold?: number
  enableDiagramDetection?: boolean
  maxFileSizeMB?: number
}

export interface AIExtractionProgress {
  stage: 'initializing' | 'processing_pdf' | 'extracting_questions' | 'validating' | 'storing' | 'completed' | 'error'
  progress: number // 0-100
  message: string
  currentStep?: string
  totalSteps?: number
}

export interface AIExtractionOptions {
  skipValidation?: boolean
  skipStorage?: boolean
  enableCache?: boolean
  onProgress?: (progress: AIExtractionProgress) => void
}

/**
 * Main AI Extraction Engine
 */
export class AIExtractionEngine {
  private geminiClient: GeminiAPIClient
  private pdfProcessor: PDFProcessor
  private confidenceScorer: ConfidenceScorer
  private validator: QuestionValidator
  private config: Required<AIExtractionConfig>

  constructor(config: AIExtractionConfig) {
    this.config = {
      geminiModel: 'gemini-1.5-flash',
      maxRetries: 3,
      confidenceThreshold: 2.5,
      enableDiagramDetection: true,
      maxFileSizeMB: 10,
      ...config
    }

    this.geminiClient = createGeminiClient({
      apiKey: this.config.geminiApiKey,
      model: this.config.geminiModel,
      maxRetries: this.config.maxRetries
    })

    this.pdfProcessor = createPDFProcessor()
    this.confidenceScorer = createConfidenceScorer()
    this.validator = createQuestionValidator()
  }

  /**
   * Extract questions from PDF file
   */
  async extractFromPDF(
    pdfFile: File | ArrayBuffer,
    fileName?: string,
    options: AIExtractionOptions = {}
  ): Promise<AIExtractionResult> {
    const actualFileName = fileName || (pdfFile instanceof File ? pdfFile.name : 'unknown.pdf')
    const pdfBuffer = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile

    // Progress tracking
    const reportProgress = (stage: AIExtractionProgress['stage'], progress: number, message: string) => {
      if (options.onProgress) {
        options.onProgress({ stage, progress, message })
      }
    }

    try {
      reportProgress('initializing', 0, 'Initializing extraction process...')

      // Validate PDF
      if (!pdfUtils.validatePDF(pdfBuffer)) {
        throw new Error('Invalid PDF file format')
      }

      if (!pdfUtils.isFileSizeValid(pdfBuffer, this.config.maxFileSizeMB)) {
        throw new Error(`PDF file too large. Maximum size: ${this.config.maxFileSizeMB}MB`)
      }

      // Check cache if enabled
      if (options.enableCache) {
        const fileHash = await aiStorageUtils.generateFileHash(pdfBuffer)
        const storage = await getAIStorage()
        const cached = await storage.getCachedExtraction(fileHash)

        if (cached) {
          reportProgress('completed', 100, 'Using cached extraction result')
          return cached
        }
      }

      reportProgress('processing_pdf', 20, 'Processing PDF and extracting text...')

      // Process PDF with retry logic for WASM issues
      let pdfResult: any = null
      let retryCount = 0
      const maxRetries = 1 // Reduced retries since PDF.js is more reliable

      while (retryCount <= maxRetries) {
        try {
          console.log(`📄 Loading PDF (attempt ${retryCount + 1}/${maxRetries + 1})...`)
          await this.pdfProcessor.loadPDF(pdfBuffer)
          
          console.log('📝 Extracting text from PDF...')
          pdfResult = await this.pdfProcessor.extractText()
          
          console.log(`✅ PDF processed successfully: ${pdfResult.pageCount} pages, ${pdfResult.text.length} characters`)
          break // Success, exit retry loop
        } catch (error: any) {
          console.error(`❌ PDF processing attempt ${retryCount + 1} failed:`, error)

          if (retryCount < maxRetries) {
            retryCount++
            reportProgress('processing_pdf', 15 + (retryCount * 5), `Retrying PDF processing (${retryCount}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, 500))
            continue
          } else {
            // All retries failed
            throw new Error(`Failed to process PDF: ${error?.message || 'Unknown error'}. Please ensure the PDF is not corrupted and try again.`)
          }
        }
      }

      if (!pdfResult) {
        throw new Error('Failed to process PDF after all retry attempts')
      }
      
      // Validate extracted text
      if (!pdfResult.text || pdfResult.text.trim().length < 50) {
        throw new Error('PDF appears to be empty or contains no readable text. Please ensure the PDF contains text-based content.')
      }

      reportProgress('extracting_questions', 50, 'Extracting questions using AI...')

      // Extract questions using Gemini
      const extractionResult = await this.geminiClient.extractQuestions(pdfBuffer, actualFileName)

      reportProgress('validating', 80, 'Validating extraction results...')

      // Validate results if not skipped
      if (!options.skipValidation) {
        const validation = this.validator.validateExtractionResult(extractionResult)

        if (!validation.isValid) {
          console.warn('Validation errors found:', validation.errors)
          // Continue with warnings, but log them
        }

        // Update confidence scores
        extractionResult.questions = extractionResult.questions.map(question => {
          const metrics = this.confidenceScorer.calculateQuestionConfidence(question)
          return {
            ...question,
            confidence: metrics.overall
          }
        })

        // Recalculate overall confidence
        extractionResult.confidence = this.confidenceScorer.calculateExtractionConfidence(extractionResult)
      }

      reportProgress('storing', 90, 'Storing extraction results...')

      // Store results if not skipped
      if (!options.skipStorage) {
        const storage = await getAIStorage()
        const fileHash = await aiStorageUtils.generateFileHash(pdfBuffer)

        await storage.storeExtractionResult(actualFileName, fileHash, extractionResult)

        // Cache for future use
        if (options.enableCache) {
          await storage.cacheExtraction(fileHash, extractionResult)
        }
      }

      reportProgress('completed', 100, 'Extraction completed successfully')

      return extractionResult

    } catch (error: any) {
      reportProgress('error', 0, `Extraction failed: ${error?.message || 'Unknown error'}`)
      throw error
    } finally {
      // Clean up PDF processor
      this.pdfProcessor.dispose()
    }
  }

  /**
   * Re-process questions with updated confidence scoring
   */
  async reprocessConfidence(questions: any[]): Promise<any[]> {
    return questions.map(question => {
      const metrics = this.confidenceScorer.calculateQuestionConfidence(question)
      return {
        ...question,
        confidence: metrics.overall,
        confidenceMetrics: metrics
      }
    })
  }

  /**
   * Validate questions manually
   */
  async validateQuestions(questions: any[]): Promise<ValidationResult[]> {
    return questions.map(question => this.validator.validateQuestion(question))
  }

  /**
   * Get extraction statistics
   */
  async getExtractionStats(): Promise<any> {
    const storage = await getAIStorage()
    return storage.getStorageStats()
  }

  /**
   * Clean up old cached data
   */
  async cleanupCache(maxAgeHours: number = 24): Promise<void> {
    const storage = await getAIStorage()
    await storage.cleanupOldCache(maxAgeHours)
  }
}

/**
 * Utility functions for AI extraction
 */
export const aiExtractionUtils = {
  /**
   * Create extraction engine with default config
   */
  createEngine(apiKey: string, options?: Partial<AIExtractionConfig>): AIExtractionEngine {
    return new AIExtractionEngine({
      geminiApiKey: apiKey,
      ...options
    })
  },

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && apiKey.length > 10 && apiKey.startsWith('AIza')
  },

  /**
   * Get recommended confidence threshold based on use case
   */
  getRecommendedThreshold(useCase: 'strict' | 'balanced' | 'permissive'): number {
    switch (useCase) {
      case 'strict': return 4.0
      case 'balanced': return 2.5
      case 'permissive': return 1.5
      default: return 2.5
    }
  },

  /**
   * Format extraction results for display
   */
  formatExtractionSummary(result: AIExtractionResult): string {
    const totalQuestions = result.questions.length
    const highConfidence = result.questions.filter(q => q.confidence >= 4).length
    const mediumConfidence = result.questions.filter(q => q.confidence >= 2.5 && q.confidence < 4).length
    const lowConfidence = result.questions.filter(q => q.confidence < 2.5).length
    const diagramQuestions = result.questions.filter(q => q.hasDiagram).length

    return `
Extraction Summary:
- Total Questions: ${totalQuestions}
- High Confidence (≥4): ${highConfidence}
- Medium Confidence (2.5-4): ${mediumConfidence}
- Low Confidence (<2.5): ${lowConfidence}
- Diagram Questions: ${diagramQuestions}
- Overall Confidence: ${result.confidence}/5
- Processing Time: ${result.processingTime}ms
    `.trim()
  },

  /**
   * Export extraction result to JSON
   */
  exportToJSON(result: AIExtractionResult): string {
    return JSON.stringify(result, null, 2)
  },

  /**
   * Import extraction result from JSON
   */
  importFromJSON(jsonString: string): AIExtractionResult {
    try {
      const result = JSON.parse(jsonString)
      
      // Basic validation
      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error('Invalid extraction result format')
      }
      
      return result
    } catch (error) {
      throw new Error(`Failed to import extraction result: ${error.message}`)
    }
  }
}

/**
 * Export all utilities and classes
 */
export {
  GeminiAPIClient,
  PDFProcessor,
  ConfidenceScorer,
  QuestionValidator,
  confidenceUtils,
  pdfUtils,
  aiStorageUtils
}

/**
 * Default export for convenience
 */
export default AIExtractionEngine
