/**
 * Gemini API Client for AI-powered PDF extraction
 * Handles client-side communication with Google Gemini API
 */

export interface GeminiAPIConfig {
  apiKey: string
  model?: string
  maxRetries?: number
  retryDelay?: number
}

export interface AIExtractionResult {
  questions: AIExtractedQuestion[]
  metadata: ExtractionMetadata
  confidence: number
  processingTime: number
}

export interface AIExtractedQuestion {
  id: number
  text: string
  type: 'MCQ' | 'MSQ' | 'NAT' | 'MSM' | 'Diagram'
  options: string[]
  correctAnswer: string | string[] | null
  subject: string
  section: string
  pageNumber: number
  questionNumber: number
  confidence: number // 1-5 scale
  hasDiagram: boolean
  extractionMetadata: {
    processingTime: number
    geminiModel: string
    apiVersion: string
  }
}

export interface ExtractionMetadata {
  geminiModel: string
  processingDate: string
  totalConfidence: number
  diagramQuestionsCount: number
  manualReviewRequired: boolean
  pdfMetadata: {
    fileName: string
    fileHash: string
    pageCount: number
    extractedText: string
  }
}

export interface GeminiAPIError extends Error {
  code: string
  status?: number
  retryable: boolean
}

export class GeminiAPIClient {
  private config: Required<GeminiAPIConfig>
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(config: GeminiAPIConfig) {
    this.config = {
      model: 'gemini-2.5-flash',
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    }
  }

  /**
   * Extract questions from PDF buffer using Gemini API
   */
  async extractQuestions(pdfBuffer: ArrayBuffer, fileName: string): Promise<AIExtractionResult> {
    const startTime = Date.now()
    
    try {
      // Convert PDF to base64 for API
      const base64Data = this.arrayBufferToBase64(pdfBuffer)
      
      // Extract text and analyze structure
      const extractedText = await this.extractTextFromPDF(base64Data)
      const questions = await this.parseQuestionsFromText(extractedText, fileName)
      
      const processingTime = Date.now() - startTime
      const totalConfidence = this.calculateOverallConfidence(questions)
      const diagramQuestionsCount = questions.filter(q => q.hasDiagram).length
      
      const metadata: ExtractionMetadata = {
        geminiModel: this.config.model,
        processingDate: new Date().toISOString(),
        totalConfidence,
        diagramQuestionsCount,
        manualReviewRequired: totalConfidence < 3 || diagramQuestionsCount > 0,
        pdfMetadata: {
          fileName,
          fileHash: await this.generateFileHash(pdfBuffer),
          pageCount: await this.estimatePageCount(extractedText),
          extractedText: extractedText.substring(0, 1000) // Store first 1000 chars for reference
        }
      }

      return {
        questions,
        metadata,
        confidence: totalConfidence,
        processingTime
      }
    } catch (error) {
      throw this.handleAPIError(error)
    }
  }

  /**
   * Extract text content from PDF using Gemini Vision
   */
  private async extractTextFromPDF(base64Data: string): Promise<string> {
    const prompt = `
      Extract all text content from this PDF document. 
      Focus on identifying questions, answer options, and any mathematical expressions.
      Preserve the structure and formatting as much as possible.
      Return only the extracted text content.
    `

    return this.makeAPIRequest('generateContent', {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: base64Data
            }
          }
        ]
      }]
    })
  }

  /**
   * Parse questions from extracted text using structured prompting
   */
  private async parseQuestionsFromText(text: string, fileName: string): Promise<AIExtractedQuestion[]> {
    const prompt = `
      Analyze the following text extracted from a PDF and identify all questions with their answer options.
      
      For each question found, provide a JSON object with the following structure:
      {
        "id": <sequential_number>,
        "text": "<question_text>",
        "type": "<MCQ|MSQ|NAT|MSM|Diagram>",
        "options": ["<option1>", "<option2>", ...],
        "correctAnswer": null,
        "subject": "<inferred_subject>",
        "section": "<inferred_section>",
        "pageNumber": <estimated_page>,
        "questionNumber": <question_number>,
        "confidence": <1-5_confidence_score>,
        "hasDiagram": <true_if_likely_contains_diagram>,
        "extractionMetadata": {
          "processingTime": 0,
          "geminiModel": "${this.config.model}",
          "apiVersion": "v1beta"
        }
      }
      
      Guidelines:
      - MCQ: Single correct answer
      - MSQ: Multiple correct answers
      - NAT: Numerical answer type
      - MSM: Matrix match type
      - Diagram: Questions that reference figures, graphs, or images
      - Confidence: 1=very uncertain, 5=very confident
      - hasDiagram: true if question mentions "figure", "diagram", "graph", "image", or similar
      
      Return a JSON array of question objects. If no questions found, return empty array.
      
      Text to analyze:
      ${text}
    `

    const response = await this.makeAPIRequest('generateContent', {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
      }
    })

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in response')
      }
      
      const questions = JSON.parse(jsonMatch[0]) as AIExtractedQuestion[]
      
      // Post-process questions
      return questions.map((q, index) => ({
        ...q,
        id: index + 1,
        extractionMetadata: {
          ...q.extractionMetadata,
          processingTime: Date.now()
        }
      }))
    } catch (parseError) {
      console.error('Failed to parse questions from Gemini response:', parseError)
      return []
    }
  }

  /**
   * Detect if a question contains diagrams using Gemini analysis
   */
  async detectDiagrams(questionText: string, context: string = ''): Promise<boolean> {
    const prompt = `
      Analyze this question text and determine if it likely references a diagram, figure, graph, image, or visual element.
      
      Question: "${questionText}"
      Context: "${context}"
      
      Look for keywords like: figure, diagram, graph, chart, image, shown, above, below, following, etc.
      Also consider if the question structure suggests visual elements are needed.
      
      Respond with only "true" or "false".
    `

    try {
      const response = await this.makeAPIRequest('generateContent', {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10
        }
      })

      return response.toLowerCase().trim() === 'true'
    } catch (error) {
      console.warn('Diagram detection failed, defaulting to true for safety:', error)
      return true // Default to true for safety
    }
  }

  /**
   * Calculate confidence score for extraction quality
   */
  calculateConfidence(extraction: any): number {
    // Implement confidence scoring based on text clarity, structure recognition, etc.
    let score = 3 // Base score

    // Adjust based on text quality indicators
    if (extraction.text && extraction.text.length > 10) score += 0.5
    if (extraction.options && extraction.options.length >= 2) score += 0.5
    if (extraction.type && ['MCQ', 'MSQ', 'NAT'].includes(extraction.type)) score += 0.5
    
    // Penalize for uncertainty indicators
    if (extraction.text.includes('unclear') || extraction.text.includes('?')) score -= 1
    
    return Math.max(1, Math.min(5, Math.round(score)))
  }

  /**
   * Make API request with retry logic and error handling
   */
  private async makeAPIRequest(endpoint: string, payload: any): Promise<string> {
    const url = `${this.baseURL}/models/${this.config.model}:${endpoint}?key=${this.config.apiKey}`
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw this.createAPIError(response.status, errorData)
        }

        const data = await response.json()
        
        // Extract text from Gemini response structure
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          return data.candidates[0].content.parts[0].text
        }
        
        throw new Error('Invalid response structure from Gemini API')
        
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          throw error
        }
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt))
          continue
        }
        
        throw error
      }
    }
  }

  /**
   * Create structured API error
   */
  private createAPIError(status: number, errorData: any): GeminiAPIError {
    const error = new Error(errorData.error?.message || 'Gemini API request failed') as GeminiAPIError
    error.code = errorData.error?.code || 'UNKNOWN_ERROR'
    error.status = status
    error.retryable = this.isRetryableStatus(status)
    return error
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error.status) {
      return this.isRetryableStatus(error.status)
    }
    
    // Network errors are generally retryable
    return error.name === 'TypeError' || error.message.includes('fetch')
  }

  /**
   * Check if HTTP status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408
  }

  /**
   * Handle and transform API errors
   */
  private handleAPIError(error: any): GeminiAPIError {
    if (error instanceof Error && 'code' in error) {
      return error as GeminiAPIError
    }
    
    const apiError = new Error(error.message || 'Unknown Gemini API error') as GeminiAPIError
    apiError.code = 'UNKNOWN_ERROR'
    apiError.retryable = false
    return apiError
  }

  /**
   * Utility methods
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private async generateFileHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async estimatePageCount(text: string): Promise<number> {
    // Simple estimation based on text length and common patterns
    const avgCharsPerPage = 2000
    return Math.max(1, Math.ceil(text.length / avgCharsPerPage))
  }

  private calculateOverallConfidence(questions: AIExtractedQuestion[]): number {
    if (questions.length === 0) return 1
    
    const totalConfidence = questions.reduce((sum, q) => sum + q.confidence, 0)
    return Math.round(totalConfidence / questions.length)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Factory function to create Gemini API client
 */
export function createGeminiClient(config: GeminiAPIConfig): GeminiAPIClient {
  return new GeminiAPIClient(config)
}