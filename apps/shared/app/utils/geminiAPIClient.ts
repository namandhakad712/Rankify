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
      model: 'gemini-1.5-flash',
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
      console.log('🔍 Starting AI extraction...')
      console.log('  - File:', fileName)
      console.log('  - Buffer size:', (pdfBuffer.byteLength / 1024).toFixed(2), 'KB')
      console.log('  - Model:', this.config.model)
      
      // Check if buffer is detached
      if (pdfBuffer.byteLength === 0) {
        throw new Error('PDF buffer is detached. This usually happens when the buffer was transferred to a worker.')
      }
      
      // Clone the buffer to prevent detachment issues
      const safeBuffer = pdfBuffer.slice(0)
      console.log('✅ Buffer cloned successfully')
      
      // Convert PDF to base64 for API
      console.log('📝 Converting PDF to base64...')
      const base64Data = this.arrayBufferToBase64(safeBuffer)
      console.log('✅ Base64 conversion complete:', (base64Data.length / 1024).toFixed(2), 'KB')
      
      // Send PDF directly to Gemini for question extraction (ONE API CALL)
      console.log('🤖 Sending PDF directly to Gemini AI for question extraction...')
      const questions = await this.extractQuestionsDirectlyFromPDF(base64Data, fileName)
      console.log('✅ Questions extracted:', questions.length)
      
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
          fileHash: await this.generateFileHash(safeBuffer),
          pageCount: Math.ceil(questions.length / 5), // Estimate: ~5 questions per page
          extractedText: `Extracted ${questions.length} questions from PDF` // Summary instead of full text
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
   * Extract questions DIRECTLY from PDF using Gemini Vision (ONE API CALL)
   * Gemini can handle: text PDFs, scanned PDFs, images, diagrams - EVERYTHING!
   */
  private async extractQuestionsDirectlyFromPDF(base64Data: string, fileName: string): Promise<AIExtractedQuestion[]> {
    const prompt = `
You are an expert at extracting questions from educational PDFs using your vision capabilities.

IMPORTANT: This PDF may be:
- Text-based (normal PDF with selectable text)
- Scanned/Image-based (requires OCR - use your vision to read it)
- Mixed content (text + images/diagrams)

Use your VISION capabilities to read and extract ALL questions from this PDF, regardless of format.

For each question, provide:
- id: sequential number
- text: the complete question text (extract using OCR if needed)
- type: MCQ (single answer), MSQ (multiple answers), NAT (numerical), or MSM (match)
- options: array of answer choices (empty for NAT)
- correctAnswer: the correct answer(s) if provided in the PDF
  * For MCQ: single option (e.g., "A" or "Paris")
  * For MSQ: array of correct options (e.g., ["A", "C"] or ["2", "3", "5"])
  * For NAT: numerical value (e.g., "78.54")
  * If answer is NOT provided in PDF, set to null
- subject: subject name (e.g., "Physics", "Mathematics")
- section: section name if mentioned
- questionNumber: original question number from PDF
- marks: marks allocated (default 1 if not specified)
- negativeMarks: negative marking (default 0)
- confidence: your confidence in extraction accuracy (1-5 scale, 5 being highest)
- hasDiagram: true if question has or references figures, diagrams, graphs, images
- diagrams: if hasDiagram is true, provide array of diagram objects with their locations:
  [{
    "pageNumber": <which page the diagram is on>,
    "boundingBox": {
      "x": <0-1, horizontal position from left edge>,
      "y": <0-1, vertical position from top edge>,
      "width": <0-1, diagram width as fraction of page width>,
      "height": <0-1, diagram height as fraction of page height>
    },
    "confidence": <1-5, your confidence in diagram location accuracy>,
    "label": "<Figure X.X or diagram title if visible, e.g., 'Figure 2.3', 'Circuit A'>",
    "type": "<circuit|graph|flowchart|table|image|other>"
  }]
  * Use normalized coordinates (0-1) for resolution independence
  * x=0 is left edge, x=1 is right edge
  * y=0 is top edge, y=1 is bottom edge
  * Estimate diagram position as accurately as possible
  * If multiple diagrams for one question, include all of them

IMPORTANT NOTES:
- Look for answer keys, solutions, or marked correct answers in the PDF
- If answers are on a separate page or section, extract them too
- If no answer is provided, set correctAnswer to null
- Be careful to match answers to the correct questions

Return a JSON array of question objects. If no questions found, return empty array [].

IMPORTANT: Return ONLY the JSON array, no other text.
    `

    const response = await this.makeAPIRequest('generateContent', {
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
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192
      }
    })

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error('No JSON array found in response:', response.substring(0, 500))
        throw new Error('No valid JSON array found in Gemini response')
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
      console.error('Response was:', response.substring(0, 1000))
      return []
    }
  }

  /**
   * Extract text content from PDF using Gemini Vision (OLD METHOD - NOT USED)
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
    // Build the actual URL with the FULL API key
    const url = `${this.baseURL}/models/${this.config.model}:${endpoint}?key=${this.config.apiKey}`
    
    // Log URL with truncated key for security
    const logUrl = `${this.baseURL}/models/${this.config.model}:${endpoint}?key=${this.config.apiKey.substring(0, 10)}...`
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`📡 API Request (attempt ${attempt + 1}/${this.config.maxRetries + 1}):`, endpoint)
        console.log(`📡 URL:`, logUrl)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        console.log('📥 API Response status:', response.status, response.statusText)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ API Error:', errorData)
          throw this.createAPIError(response.status, errorData)
        }

        const data = await response.json()
        console.log('✅ API Response received')
        
        // Extract text from Gemini response structure
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const responseText = data.candidates[0].content.parts[0].text
          console.log('📝 Response text length:', responseText.length)
          return responseText
        }
        
        console.error('❌ Invalid response structure:', data)
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
    
    // This should never be reached, but TypeScript needs it
    throw new Error('Max retries exceeded')
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
    
    const totalConfidence = questions.reduce((sum, q) => sum + (q.confidence || 0), 0)
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