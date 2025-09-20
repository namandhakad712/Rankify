/**
 * Gemini API Client Test Suite
 * Comprehensive tests for AI-powered PDF question extraction
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { GeminiAPIClient } from '../geminiAPIClient.js'

// Mock global objects
global.fetch = vi.fn()
global.FileReader = vi.fn(() => ({
  readAsArrayBuffer: vi.fn(),
  result: new ArrayBuffer(1024),
  onload: null,
  onerror: null
}))

describe('GeminiAPIClient', () => {
  let client
  let mockApiKey
  
  beforeEach(() => {
    mockApiKey = 'test-api-key-12345'
    client = new GeminiAPIClient(mockApiKey)
    
    // Reset fetch mock
    global.fetch.mockReset()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    test('should initialize with API key', () => {
      expect(client.apiKey).toBe(mockApiKey)
      expect(client.baseURL).toBe('https://generativelanguage.googleapis.com/v1beta')
      expect(client.model).toBe('gemini-1.5-flash')
    })

    test('should throw error without API key', () => {
      expect(() => new GeminiAPIClient()).toThrow('API key is required')
    })

    test('should initialize with custom configuration', () => {
      const customClient = new GeminiAPIClient(mockApiKey, {
        model: 'gemini-1.5-pro',
        maxRetries: 5,
        timeout: 60000
      })
      
      expect(customClient.model).toBe('gemini-1.5-pro')
      expect(customClient.maxRetries).toBe(5)
      expect(customClient.timeout).toBe(60000)
    })
  })

  describe('PDF Processing', () => {
    test('should extract questions from PDF buffer', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                questions: [
                  {
                    id: 1,
                    text: 'What is the capital of France?',
                    type: 'MCQ',
                    options: ['Paris', 'London', 'Berlin', 'Madrid'],
                    subject: 'Geography',
                    section: 'Europe',
                    confidence: 4.5,
                    hasDiagram: false
                  }
                ]
              })
            }]
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await client.extractQuestions(mockPDFBuffer)
      
      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].text).toBe('What is the capital of France?')
      expect(result.questions[0].type).toBe('MCQ')
      expect(result.questions[0].confidence).toBe(4.5)
      expect(result.metadata).toBeDefined()
      expect(result.metadata.processingTime).toBeGreaterThan(0)
    })

    test('should handle PDF processing errors', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.extractQuestions(mockPDFBuffer)).rejects.toThrow('Network error')
    })

    test('should retry on API failures', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      // First call fails, second succeeds
      global.fetch
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({ questions: [] })
                }]
              }
            }]
          })
        })

      const result = await client.extractQuestions(mockPDFBuffer)
      
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result.questions).toEqual([])
    })

    test('should handle malformed API responses', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: 'Invalid JSON response'
              }]
            }
          }]
        })
      })

      await expect(client.extractQuestions(mockPDFBuffer)).rejects.toThrow()
    })
  })

  describe('Question Validation', () => {
    test('should validate question structure', () => {
      const validQuestion = {
        id: 1,
        text: 'Sample question?',
        type: 'MCQ',
        options: ['A', 'B', 'C', 'D'],
        subject: 'Math',
        section: 'Algebra'
      }

      const isValid = client.validateQuestion(validQuestion)
      expect(isValid).toBe(true)
    })

    test('should reject invalid question types', () => {
      const invalidQuestion = {
        id: 1,
        text: 'Sample question?',
        type: 'INVALID_TYPE',
        options: ['A', 'B'],
        subject: 'Math',
        section: 'Algebra'
      }

      const isValid = client.validateQuestion(invalidQuestion)
      expect(isValid).toBe(false)
    })

    test('should reject questions without required fields', () => {
      const incompleteQuestion = {
        id: 1,
        text: 'Sample question?',
        // Missing type, options, subject, section
      }

      const isValid = client.validateQuestion(incompleteQuestion)
      expect(isValid).toBe(false)
    })

    test('should validate MCQ options count', () => {
      const mcqWithTwoOptions = {
        id: 1,
        text: 'Sample question?',
        type: 'MCQ',
        options: ['A', 'B'], // Too few options
        subject: 'Math',
        section: 'Algebra'
      }

      const isValid = client.validateQuestion(mcqWithTwoOptions)
      expect(isValid).toBe(false)
    })
  })

  describe('Confidence Scoring', () => {
    test('should calculate confidence scores', () => {
      const questionData = {
        text: 'What is 2 + 2?',
        textClarity: 5,
        structureRecognition: 4,
        optionsParsing: 5,
        diagramDetection: 3
      }

      const confidence = client.calculateConfidence(questionData)
      
      expect(confidence).toBeGreaterThan(0)
      expect(confidence).toBeLessThanOrEqual(5)
    })

    test('should handle missing confidence metrics', () => {
      const questionData = {
        text: 'Incomplete question data'
        // Missing confidence metrics
      }

      const confidence = client.calculateConfidence(questionData)
      
      expect(confidence).toBeGreaterThan(0)
      expect(confidence).toBeLessThanOrEqual(5)
    })

    test('should penalize low-quality extractions', () => {
      const lowQualityData = {
        text: 'unclear text',
        textClarity: 1,
        structureRecognition: 1,
        optionsParsing: 1,
        diagramDetection: 1
      }

      const highQualityData = {
        text: 'Clear, well-structured question with proper formatting',
        textClarity: 5,
        structureRecognition: 5,
        optionsParsing: 5,
        diagramDetection: 5
      }

      const lowConfidence = client.calculateConfidence(lowQualityData)
      const highConfidence = client.calculateConfidence(highQualityData)
      
      expect(lowConfidence).toBeLessThan(highConfidence)
    })
  })

  describe('Diagram Detection', () => {
    test('should detect diagrams in question text', async () => {
      const questionText = 'Refer to the diagram below and calculate the area of the triangle.'
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({ hasDiagram: true, confidence: 0.9 })
              }]
            }
          }]
        })
      })

      const result = await client.detectDiagram(questionText)
      
      expect(result.hasDiagram).toBe(true)
      expect(result.confidence).toBe(0.9)
    })

    test('should handle diagram detection errors', async () => {
      const questionText = 'Simple text question without diagrams'
      
      global.fetch.mockRejectedValueOnce(new Error('API error'))

      const result = await client.detectDiagram(questionText)
      
      // Should default to false on error
      expect(result.hasDiagram).toBe(false)
      expect(result.confidence).toBe(0)
    })

    test('should identify diagram keywords', () => {
      const diagramKeywords = [
        'diagram', 'figure', 'graph', 'chart', 'image',
        'illustration', 'picture', 'drawing', 'sketch'
      ]

      diagramKeywords.forEach(keyword => {
        const text = `Look at the ${keyword} and answer the question.`
        const hasDiagram = client.containsDiagramKeywords(text)
        expect(hasDiagram).toBe(true)
      })
    })

    test('should not flag non-diagram text', () => {
      const normalText = 'What is the capital of France? Choose the correct answer.'
      const hasDiagram = client.containsDiagramKeywords(normalText)
      expect(hasDiagram).toBe(false)
    })
  })

  describe('Error Handling', () => {
    test('should handle rate limiting', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(client.extractQuestions(mockPDFBuffer)).rejects.toThrow('Rate limited')
    })

    test('should handle authentication errors', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(client.extractQuestions(mockPDFBuffer)).rejects.toThrow('Invalid API key')
    })

    test('should handle server errors', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(client.extractQuestions(mockPDFBuffer)).rejects.toThrow('Server error')
    })

    test('should timeout long requests', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      const shortTimeoutClient = new GeminiAPIClient(mockApiKey, { timeout: 100 })
      
      // Mock a slow response
      global.fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      )

      await expect(shortTimeoutClient.extractQuestions(mockPDFBuffer)).rejects.toThrow('timeout')
    })
  })

  describe('Data Sanitization', () => {
    test('should sanitize extracted text', () => {
      const unsafeText = '<script>alert("xss")</script>What is 2+2?'
      const sanitized = client.sanitizeText(unsafeText)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('What is 2+2?')
    })

    test('should preserve mathematical expressions', () => {
      const mathText = 'Calculate ∫(x²)dx from 0 to 1'
      const sanitized = client.sanitizeText(mathText)
      
      expect(sanitized).toBe(mathText)
    })

    test('should remove potentially harmful content', () => {
      const harmfulContent = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'onload=alert(1)'
      ]

      harmfulContent.forEach(content => {
        const sanitized = client.sanitizeText(content)
        expect(sanitized).not.toContain(content)
      })
    })
  })

  describe('Performance', () => {
    test('should process small PDFs quickly', async () => {
      const smallPDFBuffer = new ArrayBuffer(1024) // 1KB
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({ questions: [] })
              }]
            }
          }]
        })
      })

      const startTime = Date.now()
      await client.extractQuestions(smallPDFBuffer)
      const processingTime = Date.now() - startTime
      
      expect(processingTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    test('should handle memory efficiently', async () => {
      const largePDFBuffer = new ArrayBuffer(10 * 1024 * 1024) // 10MB
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({ questions: [] })
              }]
            }
          }]
        })
      })

      // Should not throw memory errors
      await expect(client.extractQuestions(largePDFBuffer)).resolves.toBeDefined()
    })
  })

  describe('Batch Processing', () => {
    test('should process multiple questions in batch', async () => {
      const mockQuestions = [
        { text: 'Question 1', type: 'MCQ' },
        { text: 'Question 2', type: 'MSQ' },
        { text: 'Question 3', type: 'NAT' }
      ]

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  questions: mockQuestions.map((q, i) => ({
                    id: i + 1,
                    ...q,
                    options: q.type === 'NAT' ? [] : ['A', 'B', 'C', 'D'],
                    subject: 'Test',
                    section: 'Batch',
                    confidence: 4.0,
                    hasDiagram: false
                  }))
                })
              }]
            }
          }]
        })
      })

      const result = await client.processBatch(mockQuestions)
      
      expect(result.questions).toHaveLength(3)
      expect(result.questions[0].type).toBe('MCQ')
      expect(result.questions[1].type).toBe('MSQ')
      expect(result.questions[2].type).toBe('NAT')
    })

    test('should handle batch processing errors gracefully', async () => {
      const mockQuestions = [
        { text: 'Question 1', type: 'MCQ' },
        { text: 'Question 2', type: 'INVALID' } // Invalid type
      ]

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  questions: [
                    {
                      id: 1,
                      text: 'Question 1',
                      type: 'MCQ',
                      options: ['A', 'B', 'C', 'D'],
                      subject: 'Test',
                      section: 'Batch',
                      confidence: 4.0,
                      hasDiagram: false
                    }
                    // Question 2 filtered out due to invalid type
                  ]
                })
              }]
            }
          }]
        })
      })

      const result = await client.processBatch(mockQuestions)
      
      expect(result.questions).toHaveLength(1) // Only valid question processed
      expect(result.errors).toHaveLength(1) // One error recorded
    })
  })
})