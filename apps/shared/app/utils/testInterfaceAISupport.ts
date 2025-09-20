/**
 * Test Interface AI Support Utilities
 * Handles AI JSON format detection, conversion, and backward compatibility
 */

import type { 
  TestInterfaceJsonOutput, 
  TestInterfaceOrResultJsonOutput,
  TestSessionSectionsData,
  TestSectionListItem 
} from '#layers/shared/shared/types/index.d'
import type { AIExtractionResult, AIExtractedQuestion } from './geminiAPIClient'
import { aiJsonSchemaUtils } from './aiJsonSchemaUtils'

export interface AITestData {
  isAIGenerated: boolean
  originalAIResult?: AIExtractionResult
  confidenceThreshold: number
  mathJaxEnabled: boolean
  pdfData?: ArrayBuffer
}

export interface EnhancedTestQuestion {
  // Standard Rankify question properties
  queId: string
  section: string
  que: string
  queType: QuestionType
  queText: string
  queOptions: any
  queMarks: QuestionMarks
  queAnswer: any
  status: QuestionStatus
  answer: any
  timeSpent: number
  subject: string
  pageNumber: number
  
  // AI-specific properties
  confidence?: number
  hasDiagram?: boolean
  aiMetadata?: {
    extractionModel: string
    processingTime: number
    originalId: number
  }
}

/**
 * AI Test Interface Support Manager
 */
export class AITestInterfaceSupport {
  private aiData: AITestData = {
    isAIGenerated: false,
    confidenceThreshold: 2.5,
    mathJaxEnabled: true
  }

  /**
   * Detect if JSON data is AI-generated
   */
  detectAIFormat(jsonData: any): boolean {
    // Check for AI-specific markers
    if (jsonData.metadata?.geminiModel) return true
    if (jsonData.questions && Array.isArray(jsonData.questions)) return true
    if (jsonData.confidence !== undefined) return true
    
    // Check for AI metadata in questions
    if (jsonData.testData?.testSectionsData) {
      const sections = Object.values(jsonData.testData.testSectionsData) as any[]
      const hasAIMetadata = sections.some(section => 
        Object.values(section).some((question: any) => 
          question.confidence !== undefined || question.aiMetadata
        )
      )
      if (hasAIMetadata) return true
    }

    return false
  }

  /**
   * Load test data with AI support
   */
  async loadTestData(jsonData: TestInterfaceOrResultJsonOutput): Promise<{
    testData: any
    aiData: AITestData
  }> {
    const isAI = this.detectAIFormat(jsonData)
    
    this.aiData = {
      isAIGenerated: isAI,
      confidenceThreshold: 2.5,
      mathJaxEnabled: true,
      originalAIResult: isAI ? this.extractOriginalAIResult(jsonData) : undefined,
      pdfData: undefined // Will be loaded separately if needed
    }

    // If it's AI-generated, enhance the data
    if (isAI) {
      return {
        testData: this.enhanceAITestData(jsonData),
        aiData: this.aiData
      }
    }

    // Return legacy data as-is
    return {
      testData: jsonData,
      aiData: this.aiData
    }
  }

  /**
   * Extract original AI result from Rankify JSON
   */
  private extractOriginalAIResult(jsonData: any): AIExtractionResult | undefined {
    // Try to reconstruct AI result from Rankify format
    if (!jsonData.testData?.testSectionsData) return undefined

    const questions: AIExtractedQuestion[] = []
    const sectionsData = jsonData.testData.testSectionsData

    Object.entries(sectionsData).forEach(([sectionName, sectionQuestions]: [string, any]) => {
      Object.entries(sectionQuestions).forEach(([questionKey, questionData]: [string, any]) => {
        if (questionData.aiMetadata) {
          const aiQuestion: AIExtractedQuestion = {
            id: questionData.aiMetadata.originalId || parseInt(questionKey),
            text: questionData.queText,
            type: this.mapRankifyTypeToAI(questionData.queType),
            options: this.extractOptionsFromRankify(questionData.queOptions, questionData.queType),
            correctAnswer: questionData.queAnswer,
            subject: questionData.subject,
            section: sectionName,
            pageNumber: questionData.pageNumber || 1,
            questionNumber: parseInt(questionKey),
            confidence: questionData.confidence || 3,
            hasDiagram: questionData.hasDiagram || false,
            extractionMetadata: questionData.aiMetadata
          }
          questions.push(aiQuestion)
        }
      })
    })

    if (questions.length === 0) return undefined

    return {
      questions,
      metadata: {
        geminiModel: questions[0]?.extractionMetadata.geminiModel || 'unknown',
        processingDate: new Date().toISOString(),
        totalConfidence: this.calculateAverageConfidence(questions),
        diagramQuestionsCount: questions.filter(q => q.hasDiagram).length,
        manualReviewRequired: questions.some(q => (q.confidence || 0) < 2.5),
        pdfMetadata: {
          fileName: jsonData.testConfig?.testName || 'unknown.pdf',
          fileHash: jsonData.testConfig?.pdfFileHash || '',
          pageCount: Math.max(...questions.map(q => q.pageNumber)),
          extractedText: ''
        }
      },
      confidence: this.calculateAverageConfidence(questions),
      processingTime: 0
    }
  }

  /**
   * Map Rankify question type to AI type
   */
  private mapRankifyTypeToAI(rankifyType: string): string {
    const typeMap: Record<string, string> = {
      'mcq': 'MCQ',
      'msq': 'MSQ',
      'nat': 'NAT',
      'msm': 'MSM'
    }
    return typeMap[rankifyType] || 'MCQ'
  }

  /**
   * Extract options from Rankify format
   */
  private extractOptionsFromRankify(queOptions: any, queType: string): string[] {
    if (queType === 'nat') return []
    
    if (typeof queOptions === 'number') {
      // Generate placeholder options
      return Array.from({ length: queOptions }, (_, i) => 
        `Option ${String.fromCharCode(65 + i)}`
      )
    }
    
    if (Array.isArray(queOptions)) {
      return queOptions
    }
    
    if (queOptions && typeof queOptions === 'object' && queOptions.options) {
      return queOptions.options
    }
    
    return []
  }

  /**
   * Calculate average confidence
   */
  private calculateAverageConfidence(questions: AIExtractedQuestion[]): number {
    if (questions.length === 0) return 0
    const total = questions.reduce((sum, q) => sum + (q.confidence || 0), 0)
    return Math.round((total / questions.length) * 10) / 10
  }

  /**
   * Enhance AI test data with additional features
   */
  private enhanceAITestData(jsonData: any): any {
    const enhanced = { ...jsonData }
    
    // Add AI-specific enhancements to test sections data
    if (enhanced.testData?.testSectionsData) {
      Object.values(enhanced.testData.testSectionsData).forEach((section: any) => {
        Object.values(section).forEach((question: any) => {
          // Ensure AI properties are preserved
          if (!question.confidence) question.confidence = 3
          if (question.hasDiagram === undefined) question.hasDiagram = false
          
          // Add enhanced question text processing
          question.processedQueText = this.processQuestionText(question.queText)
          
          // Add MathJax detection
          question.hasMath = this.detectMathContent(question.queText)
        })
      })
    }

    return enhanced
  }

  /**
   * Process question text for enhanced display
   */
  private processQuestionText(text: string): string {
    if (!text) return ''
    
    // Clean up common OCR artifacts
    let processed = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Fix sentence spacing
      .trim()
    
    // Enhance mathematical expressions
    processed = this.enhanceMathExpressions(processed)
    
    return processed
  }

  /**
   * Enhance mathematical expressions for better display
   */
  private enhanceMathExpressions(text: string): string {
    let enhanced = text
    
    // Convert common math patterns
    enhanced = enhanced.replace(/\b(\d+)\s*\*\s*(\d+)\b/g, '$1 × $2')
    enhanced = enhanced.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, '$1 ÷ $2')
    enhanced = enhanced.replace(/\b(\d+)\s*\^\s*(\d+)\b/g, '$1^$2')
    enhanced = enhanced.replace(/sqrt\(([^)]+)\)/g, '√($1)')
    enhanced = enhanced.replace(/pi\b/gi, 'π')
    enhanced = enhanced.replace(/alpha\b/gi, 'α')
    enhanced = enhanced.replace(/beta\b/gi, 'β')
    enhanced = enhanced.replace(/gamma\b/gi, 'γ')
    enhanced = enhanced.replace(/delta\b/gi, 'δ')
    enhanced = enhanced.replace(/theta\b/gi, 'θ')
    
    return enhanced
  }

  /**
   * Detect mathematical content in text
   */
  private detectMathContent(text: string): boolean {
    const mathPatterns = [
      /\$.*\$/,  // LaTeX inline math
      /\\\(.*\\\)/,  // LaTeX inline math
      /\\\[.*\\\]/,  // LaTeX display math
      /\b\d+\s*[+\-*/^]\s*\d+\b/,  // Basic arithmetic
      /\b(sin|cos|tan|log|ln|sqrt|pi|alpha|beta|gamma|delta|theta)\b/i,  // Math functions/symbols
      /\b\d+\s*[×÷]\s*\d+\b/,  // Enhanced arithmetic symbols
      /[∑∏∫∂∇]/  // Advanced math symbols
    ]
    
    return mathPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Filter questions by confidence
   */
  filterByConfidence(
    testSectionsData: TestSessionSectionsData, 
    minConfidence: number
  ): TestSessionSectionsData {
    const filtered: TestSessionSectionsData = {}
    
    Object.entries(testSectionsData).forEach(([sectionName, questions]) => {
      const filteredQuestions: any = {}
      
      Object.entries(questions).forEach(([questionKey, questionData]) => {
        const confidence = (questionData as any).confidence || 5 // Default high confidence for legacy
        if (confidence >= minConfidence) {
          filteredQuestions[questionKey] = questionData
        }
      })
      
      if (Object.keys(filteredQuestions).length > 0) {
        filtered[sectionName] = filteredQuestions
      }
    })
    
    return filtered
  }

  /**
   * Get questions that need review
   */
  getQuestionsNeedingReview(testSectionsData: TestSessionSectionsData): EnhancedTestQuestion[] {
    const needsReview: EnhancedTestQuestion[] = []
    
    Object.values(testSectionsData).forEach(section => {
      Object.values(section).forEach(question => {
        const enhancedQuestion = question as EnhancedTestQuestion
        if (enhancedQuestion.confidence && enhancedQuestion.confidence < 2.5) {
          needsReview.push(enhancedQuestion)
        }
        if (enhancedQuestion.hasDiagram) {
          needsReview.push(enhancedQuestion)
        }
      })
    })
    
    return needsReview
  }

  /**
   * Get AI data
   */
  getAIData(): AITestData {
    return { ...this.aiData }
  }

  /**
   * Update AI settings
   */
  updateAISettings(updates: Partial<AITestData>): void {
    this.aiData = { ...this.aiData, ...updates }
  }

  /**
   * Check backward compatibility
   */
  checkBackwardCompatibility(jsonData: any): {
    compatible: boolean
    issues: string[]
    warnings: string[]
  } {
    const issues: string[] = []
    const warnings: string[] = []

    // Check required fields for legacy compatibility
    if (!jsonData.testConfig) {
      issues.push('Missing testConfig - required for backward compatibility')
    }

    if (!jsonData.testData) {
      issues.push('Missing testData - required for backward compatibility')
    }

    if (!jsonData.testSummary) {
      warnings.push('Missing testSummary - may affect results display')
    }

    // Check test data structure
    if (jsonData.testData) {
      if (!jsonData.testData.testSectionsList) {
        issues.push('Missing testSectionsList in testData')
      }

      if (!jsonData.testData.testSectionsData) {
        issues.push('Missing testSectionsData in testData')
      }
    }

    // Check for AI-specific fields that might cause issues
    if (this.detectAIFormat(jsonData)) {
      warnings.push('AI-generated data detected - ensure all components support AI features')
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings
    }
  }

  /**
   * Convert AI format to legacy-compatible format
   */
  convertToLegacyCompatible(aiResult: AIExtractionResult): TestInterfaceJsonOutput {
    const conversion = aiJsonSchemaUtils.convertAIToRankify(aiResult, {
      includeAnswerKey: false,
      generateTestConfig: true,
      estimatedDuration: aiJsonSchemaUtils.estimateTestDuration(aiResult.questions)
    })

    if (!conversion.success || !conversion.data) {
      throw new Error(`Failed to convert AI data: ${conversion.errors.join(', ')}`)
    }

    return conversion.data
  }

  /**
   * Merge AI enhancements with legacy data
   */
  mergeAIEnhancements(
    legacyData: TestInterfaceJsonOutput, 
    aiEnhancements: Partial<AITestData>
  ): TestInterfaceJsonOutput {
    const enhanced = { ...legacyData }
    
    // Add AI metadata to test config
    if (enhanced.testConfig && aiEnhancements.originalAIResult) {
      enhanced.testConfig.aiGenerated = true
      enhanced.testConfig.aiModel = aiEnhancements.originalAIResult.metadata.geminiModel
      enhanced.testConfig.aiConfidence = aiEnhancements.originalAIResult.confidence
    }

    return enhanced
  }
}

/**
 * Utility functions for test interface AI support
 */
export const testInterfaceAIUtils = {
  /**
   * Create AI support manager
   */
  createAISupport(): AITestInterfaceSupport {
    return new AITestInterfaceSupport()
  },

  /**
   * Quick AI format detection
   */
  isAIGenerated(jsonData: any): boolean {
    const support = new AITestInterfaceSupport()
    return support.detectAIFormat(jsonData)
  },

  /**
   * Get confidence statistics from test data
   */
  getConfidenceStats(testSectionsData: TestSessionSectionsData): {
    averageConfidence: number
    lowConfidenceCount: number
    highConfidenceCount: number
    diagramCount: number
  } {
    let totalConfidence = 0
    let questionCount = 0
    let lowConfidenceCount = 0
    let highConfidenceCount = 0
    let diagramCount = 0

    Object.values(testSectionsData).forEach(section => {
      Object.values(section).forEach(question => {
        const enhancedQuestion = question as EnhancedTestQuestion
        const confidence = enhancedQuestion.confidence || 5 // Default for legacy
        
        totalConfidence += confidence
        questionCount++
        
        if (confidence < 2.5) lowConfidenceCount++
        if (confidence >= 4) highConfidenceCount++
        if (enhancedQuestion.hasDiagram) diagramCount++
      })
    })

    return {
      averageConfidence: questionCount > 0 ? totalConfidence / questionCount : 0,
      lowConfidenceCount,
      highConfidenceCount,
      diagramCount
    }
  },

  /**
   * Load MathJax dynamically
   */
  async loadMathJax(): Promise<void> {
    if (typeof window === 'undefined') return
    
    // Check if MathJax is already loaded
    if ((window as any).MathJax) return

    return new Promise((resolve, reject) => {
      // Configure MathJax
      (window as any).MathJax = {
        tex: {
          inlineMath: [['\\(', '\\)'], ['$', '$']],
          displayMath: [['\\[', '\\]'], ['$$', '$$']],
          processEscapes: true,
          processEnvironments: true,
          packages: ['base', 'ams', 'noerrors', 'noundefined']
        },
        options: {
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
          ignoreHtmlClass: 'tex2jax_ignore',
          processHtmlClass: 'tex2jax_process'
        },
        startup: {
          ready: () => {
            (window as any).MathJax.startup.defaultReady()
            resolve()
          }
        }
      }

      // Load MathJax script
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
      script.async = true
      script.onload = () => {
        // MathJax will call the ready function when loaded
      }
      script.onerror = () => {
        reject(new Error('Failed to load MathJax'))
      }
      
      document.head.appendChild(script)
    })
  },

  /**
   * Render MathJax in element
   */
  async renderMathJax(element?: HTMLElement): Promise<void> {
    if (typeof window === 'undefined' || !(window as any).MathJax) return

    try {
      if (element) {
        await (window as any).MathJax.typesetPromise([element])
      } else {
        await (window as any).MathJax.typesetPromise()
      }
    } catch (error) {
      console.warn('MathJax rendering error:', error)
    }
  },

  /**
   * Validate test data compatibility
   */
  validateCompatibility(jsonData: any): {
    valid: boolean
    errors: string[]
    warnings: string[]
    aiSupported: boolean
  } {
    const support = new AITestInterfaceSupport()
    const compatibility = support.checkBackwardCompatibility(jsonData)
    const isAI = support.detectAIFormat(jsonData)

    return {
      valid: compatibility.compatible,
      errors: compatibility.issues,
      warnings: compatibility.warnings,
      aiSupported: isAI
    }
  },

  /**
   * Create enhanced question from legacy question
   */
  enhanceQuestion(legacyQuestion: any): EnhancedTestQuestion {
    return {
      ...legacyQuestion,
      confidence: legacyQuestion.confidence || 5,
      hasDiagram: legacyQuestion.hasDiagram || false,
      aiMetadata: legacyQuestion.aiMetadata || null
    }
  }
}

/**
 * Default export
 */
export default AITestInterfaceSupport