/**
 * Enhanced Gemini API Client for Advanced Diagram Detection
 * 
 * This enhanced client extends the existing Gemini API functionality with
 * coordinate-based diagram detection and bounding box extraction capabilities.
 */

import type { 
  GeminiDiagramRequest,
  GeminiDiagramResponse,
  GeminiAPIError,
  DiagramCoordinates,
  DiagramType,
  EnhancedQuestion
} from '~/shared/types/diagram-detection'
import { GeminiAPIClient, type GeminiAPIConfig } from './geminiAPIClient'
import { GeminiErrorHandler } from './geminiErrorHandler'

export interface EnhancedGeminiConfig extends GeminiAPIConfig {
  enableCoordinateDetection?: boolean
  coordinateConfidenceThreshold?: number
  maxDiagramsPerPage?: number
  fallbackEnabled?: boolean
}

export class EnhancedGeminiClient extends GeminiAPIClient {
  private errorHandler: GeminiErrorHandler
  private enhancedConfig: Required<EnhancedGeminiConfig>

  constructor(config: EnhancedGeminiConfig) {
    super(config)
    
    this.enhancedConfig = {
      enableCoordinateDetection: true,
      coordinateConfidenceThreshold: 0.7,
      maxDiagramsPerPage: 10,
      fallbackEnabled: true,
      ...config,
      model: config.model || 'gemini-1.5-pro',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000
    }

    this.errorHandler = new GeminiErrorHandler({
      retryAttempts: this.enhancedConfig.maxRetries,
      retryDelay: this.enhancedConfig.retryDelay,
      fallbackEnabled: this.enhancedConfig.fallbackEnabled
    })
  }

  /**
   * Detect diagrams with precise coordinate boundaries
   */
  async detectDiagramsWithCoordinates(pageImage: ImageData): Promise<GeminiDiagramResponse> {
    if (!this.enhancedConfig.enableCoordinateDetection) {
      return { diagrams: [], questions: [] }
    }

    const base64Image = this.imageDataToBase64(pageImage)
    const prompt = this.createCoordinateDetectionPrompt()

    const request: GeminiDiagramRequest = {
      image: base64Image,
      prompt,
      model: this.enhancedConfig.model as 'gemini-1.5-pro' | 'gemini-1.5-flash'
    }

    try {
      const response = await this.makeCoordinateDetectionRequest(request)
      return this.parseCoordinateResponse(response)
    } catch (error) {
      const geminiError: GeminiAPIError = {
        code: this.getErrorCode(error),
        message: error.message,
        image: base64Image,
        request
      }
      
      const fallbackCoordinates = await this.errorHandler.handleAPIError(geminiError)
      return {
        diagrams: fallbackCoordinates.map(coord => ({
          coordinates: coord,
          description: 'Fallback detection',
          confidence: 0.5,
          type: coord.type
        })),
        questions: []
      }
    }
  }

  /**
   * Enhanced question extraction with diagram coordinate detection
   */
  async extractQuestionsWithDiagrams(
    pdfBuffer: ArrayBuffer, 
    fileName: string
  ): Promise<{
    questions: EnhancedQuestion[]
    diagramCoordinates: Map<number, DiagramCoordinates[]>
    processingStats: {
      totalPages: number
      questionsWithDiagrams: number
      averageConfidence: number
      processingTime: number
    }
  }> {
    const startTime = performance.now()
    
    // First, extract questions using the base client
    const baseResult = await this.extractQuestions(pdfBuffer, fileName)
    
    // Convert to enhanced questions
    const enhancedQuestions: EnhancedQuestion[] = baseResult.questions.map(q => ({
      ...q,
      id: `enhanced_${q.id}`,
      text: q.text,
      diagrams: [],
      pageNumber: q.pageNumber,
      confidence: q.confidence / 5, // Convert from 1-5 to 0-1 scale
      pdfData: [] // Will be populated if needed
    }))

    // Extract diagram coordinates for questions that have diagrams
    const diagramCoordinates = new Map<number, DiagramCoordinates[]>()
    let questionsWithDiagrams = 0

    for (const question of enhancedQuestions) {
      if (question.hasDiagram) {
        try {
          // For now, we'll use text-based diagram detection
          // In a full implementation, we'd process the actual page image
          const mockImageData = this.createMockImageData(800, 600)
          const diagramResponse = await this.detectDiagramsWithCoordinates(mockImageData)
          
          if (diagramResponse.diagrams.length > 0) {
            const coordinates = diagramResponse.diagrams.map(d => d.coordinates)
            diagramCoordinates.set(question.pageNumber, coordinates)
            question.diagrams = coordinates
            questionsWithDiagrams++
          }
        } catch (error) {
          console.warn(`Failed to detect coordinates for question ${question.id}:`, error)
        }
      }
    }

    const processingTime = performance.now() - startTime
    const averageConfidence = enhancedQuestions.reduce((sum, q) => sum + q.confidence, 0) / enhancedQuestions.length

    return {
      questions: enhancedQuestions,
      diagramCoordinates,
      processingStats: {
        totalPages: baseResult.metadata.pdfMetadata.pageCount,
        questionsWithDiagrams,
        averageConfidence,
        processingTime
      }
    }
  }

  /**
   * Analyze single page for diagram coordinates
   */
  async analyzePageForDiagrams(
    pageImage: ImageData,
    pageNumber: number
  ): Promise<{
    diagrams: DiagramCoordinates[]
    questions: EnhancedQuestion[]
    confidence: number
  }> {
    try {
      const response = await this.detectDiagramsWithCoordinates(pageImage)
      
      const confidence = response.diagrams.length > 0 ? 
        response.diagrams.reduce((sum, d) => sum + d.confidence, 0) / response.diagrams.length : 0

      return {
        diagrams: response.diagrams.map(d => d.coordinates),
        questions: response.questions,
        confidence
      }
    } catch (error) {
      console.error(`Failed to analyze page ${pageNumber}:`, error)
      return {
        diagrams: [],
        questions: [],
        confidence: 0
      }
    }
  }

  /**
   * Batch process multiple pages for diagram detection
   */
  async batchProcessPages(
    pages: Array<{ pageNumber: number; imageData: ImageData }>
  ): Promise<Map<number, DiagramCoordinates[]>> {
    const results = new Map<number, DiagramCoordinates[]>()
    
    // Process pages in batches to avoid rate limiting
    const batchSize = 3
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async page => {
        try {
          const analysis = await this.analyzePageForDiagrams(page.imageData, page.pageNumber)
          return { pageNumber: page.pageNumber, diagrams: analysis.diagrams }
        } catch (error) {
          console.warn(`Failed to process page ${page.pageNumber}:`, error)
          return { pageNumber: page.pageNumber, diagrams: [] }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      
      for (const result of batchResults) {
        if (result.diagrams.length > 0) {
          results.set(result.pageNumber, result.diagrams)
        }
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < pages.length) {
        await this.delay(1000)
      }
    }

    return results
  }

  /**
   * Create enhanced prompt for coordinate detection
   */
  private createCoordinateDetectionPrompt(): string {
    return `
You are an expert at analyzing educational PDF documents and detecting diagrams with precise coordinates.

Analyze this page image and:

1. Identify all questions and their text content
2. For each question, detect if it contains any diagrams, charts, graphs, or visual elements
3. For detected diagrams, provide exact bounding box coordinates in pixels

For DIAGRAM DETECTION, look for:
- Mathematical graphs, charts, or plots
- Scientific diagrams (biology, chemistry, physics)
- Flowcharts, process diagrams, or decision trees
- Geometric figures or technical drawings
- Tables, charts, or data visualizations
- Maps, circuit diagrams, or schematics

CRITICAL: Return a JSON response with this EXACT structure:
{
  "questions": [
    {
      "id": "q1",
      "text": "Question text here",
      "type": "MCQ|MSQ|NAT|Diagram",
      "options": ["A) option1", "B) option2", ...],
      "hasDiagram": true/false,
      "confidence": 0.0-1.0
    }
  ],
  "diagrams": [
    {
      "coordinates": {
        "x1": 150,
        "y1": 300, 
        "x2": 450,
        "y2": 600,
        "confidence": 0.95,
        "type": "graph|flowchart|scientific|geometric|table|circuit|map|other",
        "description": "Brief description of the diagram"
      },
      "description": "Detailed description of what the diagram shows",
      "confidence": 0.95,
      "type": "graph"
    }
  ]
}

COORDINATE REQUIREMENTS:
- Coordinates must be in pixels relative to the image
- x1,y1 is top-left corner, x2,y2 is bottom-right corner
- Ensure x2 > x1 and y2 > y1
- Confidence should reflect detection accuracy (0.0-1.0)
- Only include diagrams that are clearly visible and relevant to questions
- Maximum ${this.enhancedConfig.maxDiagramsPerPage} diagrams per page
- Minimum confidence threshold: ${this.enhancedConfig.coordinateConfidenceThreshold}

Return ONLY the JSON response, no additional text.
`
  }

  /**
   * Make coordinate detection API request
   */
  private async makeCoordinateDetectionRequest(request: GeminiDiagramRequest): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${this.enhancedConfig.apiKey}`
    
    const payload = {
      contents: [{
        parts: [
          { text: request.prompt },
          {
            inline_data: {
              mime_type: 'image/png',
              data: request.image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Parse coordinate detection response
   */
  private parseCoordinateResponse(response: any): GeminiDiagramResponse {
    try {
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!content) {
        throw new Error('No content in response')
      }

      // Try to parse as JSON
      let parsed: any
      try {
        parsed = JSON.parse(content)
      } catch {
        // If direct parsing fails, try to extract JSON from text
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }
        parsed = JSON.parse(jsonMatch[0])
      }

      // Validate and sanitize the response
      const questions: EnhancedQuestion[] = (parsed.questions || []).map((q: any, index: number) => ({
        id: `page_q_${index + 1}`,
        text: q.text || '',
        type: q.type || 'MCQ',
        options: q.options || [],
        hasDiagram: q.hasDiagram || false,
        diagrams: [],
        pageNumber: 1, // Will be set by caller
        confidence: Math.max(0, Math.min(1, q.confidence || 0.5)),
        pdfData: []
      }))

      const diagrams = (parsed.diagrams || [])
        .filter((d: any) => d.coordinates && d.coordinates.confidence >= this.enhancedConfig.coordinateConfidenceThreshold)
        .slice(0, this.enhancedConfig.maxDiagramsPerPage)
        .map((d: any) => ({
          coordinates: this.sanitizeCoordinates(d.coordinates),
          description: d.description || 'Detected diagram',
          confidence: Math.max(0, Math.min(1, d.confidence || 0.5)),
          type: d.type || 'other'
        }))

      return { questions, diagrams }
    } catch (error) {
      console.error('Failed to parse coordinate response:', error)
      return { questions: [], diagrams: [] }
    }
  }

  /**
   * Sanitize and validate coordinates
   */
  private sanitizeCoordinates(coords: any): DiagramCoordinates {
    return {
      x1: Math.max(0, Math.floor(coords.x1 || 0)),
      y1: Math.max(0, Math.floor(coords.y1 || 0)),
      x2: Math.max(coords.x1 + 1, Math.ceil(coords.x2 || coords.x1 + 100)),
      y2: Math.max(coords.y1 + 1, Math.ceil(coords.y2 || coords.y1 + 100)),
      confidence: Math.max(0, Math.min(1, coords.confidence || 0.5)),
      type: this.validateDiagramType(coords.type),
      description: coords.description || 'Detected diagram'
    }
  }

  /**
   * Validate diagram type
   */
  private validateDiagramType(type: string): DiagramType {
    const validTypes: DiagramType[] = ['graph', 'flowchart', 'scientific', 'geometric', 'table', 'circuit', 'map', 'other']
    return validTypes.includes(type as DiagramType) ? type as DiagramType : 'other'
  }

  /**
   * Convert ImageData to base64
   */
  private imageDataToBase64(imageData: ImageData): string {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')
    ctx!.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  }

  /**
   * Create mock image data for testing
   */
  private createMockImageData(width: number, height: number): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    
    // Create a simple test pattern
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#000000'
    ctx.fillRect(100, 100, 200, 150)
    
    return ctx.getImageData(0, 0, width, height)
  }

  /**
   * Get error code from exception
   */
  private getErrorCode(error: any): GeminiAPIError['code'] {
    if (error.status === 429) return 'QUOTA_EXCEEDED'
    if (error.status >= 500) return 'NETWORK_ERROR'
    if (error.message?.includes('image')) return 'INVALID_IMAGE'
    return 'UNKNOWN_ERROR'
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Factory function to create enhanced Gemini client
 */
export function createEnhancedGeminiClient(config: EnhancedGeminiConfig): EnhancedGeminiClient {
  return new EnhancedGeminiClient(config)
}

export default EnhancedGeminiClient