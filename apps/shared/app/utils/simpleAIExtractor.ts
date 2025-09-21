/**
 * Simplified AI Extractor - Working implementation
 * Focuses on core functionality without complex dependencies
 */

export interface SimpleExtractionConfig {
  geminiApiKey: string
  geminiModel?: string
  maxFileSizeMB?: number
}

export interface SimpleExtractionResult {
  questions: SimpleQuestion[]
  confidence: number
  processingTime: number
}

export interface SimpleQuestion {
  id: number
  text: string
  type: 'MCQ' | 'MSQ' | 'NAT' | 'Diagram'
  options: string[]
  correctAnswer?: string | string[]
  confidence: number
  hasDiagram: boolean
  subject?: string
  section?: string
}

export interface SimpleProgress {
  stage: string
  progress: number
  message: string
}

/**
 * Simple AI Extraction Engine
 */
export class SimpleAIExtractor {
  private config: Required<SimpleExtractionConfig>

  constructor(config: SimpleExtractionConfig) {
    this.config = {
      geminiModel: 'gemini-2.5-flash',
      maxFileSizeMB: 50,
      ...config
    }
  }

  /**
   * Extract questions from PDF
   */
  async extractFromPDF(
    pdfFile: File,
    fileName: string,
    options: {
      onProgress?: (progress: SimpleProgress) => void
    } = {}
  ): Promise<SimpleExtractionResult> {
    const { onProgress } = options

    try {
      // Validate API key
      if (!this.validateApiKey(this.config.geminiApiKey)) {
        throw new Error('Invalid Google Gemini API key. Please check your API key.')
      }

      // Validate file
      onProgress?.({ stage: 'validating', progress: 10, message: 'Validating PDF file...' })
      
      if (pdfFile.type !== 'application/pdf') {
        throw new Error('Please select a PDF file.')
      }

      if (pdfFile.size > this.config.maxFileSizeMB * 1024 * 1024) {
        throw new Error(`File too large. Maximum size: ${this.config.maxFileSizeMB}MB`)
      }

      // Convert to base64 for API
      onProgress?.({ stage: 'processing', progress: 30, message: 'Processing PDF file...' })
      
      const base64Data = await this.fileToBase64(pdfFile)

      // Call Gemini API
      onProgress?.({ stage: 'extracting', progress: 60, message: 'Extracting questions with AI...' })
      
      const result = await this.callGeminiAPI(base64Data, fileName)

      onProgress?.({ stage: 'completed', progress: 100, message: 'Extraction completed!' })

      return result

    } catch (error) {
      throw new Error(`Extraction failed: ${error.message}`)
    }
  }

  /**
   * Validate API key format
   */
  private validateApiKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && 
           apiKey.length > 20 && 
           (apiKey.startsWith('AIza') || apiKey.includes('API'))
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Call Gemini API for question extraction
   */
  private async callGeminiAPI(base64Data: string, fileName: string): Promise<SimpleExtractionResult> {
    const startTime = Date.now()

    const prompt = `
You are an expert at extracting questions from PDF documents. Analyze this PDF and extract all questions with their options and answers.

IMPORTANT: Return ONLY a valid JSON object, no other text or explanations.

For each question, provide:
1. Question text
2. Question type (MCQ, MSQ, NAT, or Diagram)
3. Options (if multiple choice)
4. Correct answer (if available)
5. Confidence score (1-5)
6. Diagram detection with detailed analysis

DIAGRAM DETECTION INSTRUCTIONS:
Look carefully for these visual elements:
- Mathematical graphs, charts, plots, or coordinate systems
- Scientific diagrams (biology, chemistry, physics illustrations)
- Flowcharts, process diagrams, or decision trees
- Geometric figures, shapes, or technical drawings
- Tables, data visualizations, or statistical charts
- Maps, circuit diagrams, or schematics
- Any visual element that the question refers to or requires for answering

Set "hasDiagram" to true if:
- The question contains or refers to any visual element
- Text mentions "refer to figure", "see diagram", "shown above", "in the graph"
- Question cannot be fully understood without visual context
- There are mathematical plots, scientific illustrations, or technical drawings

Return EXACTLY this JSON structure with no additional text:

{
  "questions": [
    {
      "id": 1,
      "text": "Question text here",
      "type": "MCQ",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "confidence": 4.5,
      "hasDiagram": false,
      "subject": "Subject name",
      "section": "Section name"
    }
  ]
}

If no questions are found, return: {"questions": []}

Focus on accuracy and provide confidence scores based on text clarity and question structure.
Pay special attention to visual elements and diagram detection.
`

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      }
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.geminiModel}:generateContent?key=${this.config.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('No response from AI model')
      }

      const aiResponse = data.candidates[0].content.parts[0].text
      
      // Try multiple approaches to extract JSON
      let parsedResult: any = null
      
      // Method 1: Look for JSON block with ```json
      const jsonBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonBlockMatch) {
        try {
          parsedResult = JSON.parse(jsonBlockMatch[1])
        } catch (e) {
          console.warn('Failed to parse JSON block:', e)
        }
      }
      
      // Method 2: Look for any JSON object
      if (!parsedResult) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0])
          } catch (e) {
            console.warn('Failed to parse JSON match:', e)
          }
        }
      }
      
      // Method 3: Try to clean and parse the entire response
      if (!parsedResult) {
        try {
          // Remove markdown formatting and extra text
          const cleaned = aiResponse
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/^[^{]*/, '') // Remove text before first {
            .replace(/[^}]*$/, '') // Remove text after last }
            .trim()
          
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            parsedResult = JSON.parse(cleaned)
          }
        } catch (e) {
          console.warn('Failed to parse cleaned response:', e)
        }
      }
      
      // If all parsing failed, provide helpful error with the actual response
      if (!parsedResult) {
        console.error('Full AI Response that failed to parse:', aiResponse)
        
        // Try to give a more helpful error message
        if (aiResponse.includes('I cannot') || aiResponse.includes('unable to')) {
          throw new Error('AI could not process the PDF. The file might be corrupted, password-protected, or contain only images without text.')
        }
        
        if (aiResponse.includes('no questions') || aiResponse.includes('No questions')) {
          throw new Error('No questions found in the PDF. Please ensure the PDF contains clear question text.')
        }
        
        throw new Error(`Could not parse AI response as JSON. The AI returned: "${aiResponse.substring(0, 300)}...". Please try again or use a different PDF.`)
      }
      
      if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
        throw new Error('Invalid response format from AI - missing questions array')
      }
      
      if (parsedResult.questions.length === 0) {
        throw new Error('No questions found in the PDF. Please ensure the PDF contains clear question text and try again.')
      }

      // Calculate overall confidence
      const avgConfidence = parsedResult.questions.length > 0 
        ? parsedResult.questions.reduce((sum: number, q: any) => sum + (q.confidence || 3), 0) / parsedResult.questions.length
        : 3

      // Validate and clean the questions
      const cleanedQuestions = parsedResult.questions.map((q: any, index: number) => {
        // Ensure required fields exist
        if (!q.text || typeof q.text !== 'string') {
          console.warn(`Question ${index + 1} missing or invalid text:`, q)
          return null
        }
        
        return {
          id: index + 1,
          text: q.text.trim(),
          type: ['MCQ', 'MSQ', 'NAT', 'Diagram'].includes(q.type) ? q.type : 'MCQ',
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer || null,
          confidence: typeof q.confidence === 'number' ? Math.max(1, Math.min(5, q.confidence)) : 3,
          hasDiagram: Boolean(q.hasDiagram),
          subject: typeof q.subject === 'string' ? q.subject : 'Unknown',
          section: typeof q.section === 'string' ? q.section : 'General'
        }
      }).filter(Boolean) // Remove null entries
      
      if (cleanedQuestions.length === 0) {
        throw new Error('No valid questions could be extracted from the PDF. Please check that the PDF contains clear, readable question text.')
      }

      return {
        questions: cleanedQuestions,
        confidence: avgConfidence,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key. Please check your Google Gemini API key.')
      }
      if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('API quota exceeded. Please try again later.')
      }
      throw error
    }
  }
}

/**
 * Simple utility functions
 */
export const simpleAIUtils = {
  /**
   * Create extractor instance
   */
  createExtractor(apiKey: string, options?: Partial<SimpleExtractionConfig>): SimpleAIExtractor {
    return new SimpleAIExtractor({
      geminiApiKey: apiKey,
      ...options
    })
  },

  /**
   * Validate API key
   */
  validateApiKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && 
           apiKey.length > 20 && 
           (apiKey.startsWith('AIza') || apiKey.includes('API'))
  }
}