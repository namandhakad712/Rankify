/**
 * Unit Tests for Enhanced Gemini Client
 * 
 * This file contains comprehensive tests for the enhanced Gemini API client
 * with coordinate-based diagram detection capabilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { 
  GeminiDiagramResponse,
  DiagramCoordinates,
  EnhancedQuestion
} from '~/shared/types/diagram-detection'
import { EnhancedGeminiClient } from '../enhancedGeminiClient'

// Mock fetch globally
global.fetch = vi.fn()

// Mock canvas and image data
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  putImageData: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({
    width: 800,
    height: 600,
    data: new Uint8ClampedArray(800 * 600 * 4)
  }))
}))

global.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockbase64data')

describe('EnhancedGeminiClient', () => {
  let client: EnhancedGeminiClient
  let mockFetch: any

  beforeEach(() => {
    mockFetch = global.fetch as any
    mockFetch.mockClear()
    
    client = new EnhancedGeminiClient({
      apiKey: 'test-api-key',
      enableCoordinateDetection: true,
      coordinateConfidenceThreshold: 0.7,
      maxDiagramsPerPage: 5,
      fallbackEnabled: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Coordinate Detection', () => {
    it('should detect diagrams with coordinates successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                questions: [
                  {
                    id: 'q1',
                    text: 'What is shown in the graph?',
                    type: 'MCQ',
                    options: ['A) Linear', 'B) Quadratic'],
                    hasDiagram: true,
                    confidence: 0.9
                  }
                ],
                diagrams: [
                  {
                    coordinates: {
                      x1: 100,
                      y1: 150,
                      x2: 300,
                      y2: 250,
                      confidence: 0.95,
                      type: 'graph',
                      description: 'Mathematical graph'
                    },
                    description: 'A linear graph showing relationship between x and y',
                    confidence: 0.95,
                    type: 'graph'
                  }
                ]
              })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const imageData = new ImageData(800, 600)
      const result = await client.detectDiagramsWithCoordinates(imageData)

      expect(result.questions).toHaveLength(1)
      expect(result.diagrams).toHaveLength(1)
      expect(result.diagrams[0].coordinates.type).toBe('graph')
      expect(result.diagrams[0].coordinates.confidence).toBe(0.95)
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({
          error: { message: 'Quota exceeded', code: 'QUOTA_EXCEEDED' }
        })
      })

      const imageData = new ImageData(800, 600)
      const result = await client.detectDiagramsWithCoordinates(imageData)

      // Should return fallback result
      expect(result.questions).toEqual([])
      expect(result.diagrams).toEqual([])
    })

    it('should sanitize invalid coordinates', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                questions: [],
                diagrams: [
                  {
                    coordinates: {
                      x1: -10, // Invalid negative coordinate
                      y1: -5,
                      x2: 1000, // Potentially out of bounds
                      y2: 800,
                      confidence: 0.8,
                      type: 'invalid_type', // Invalid type
                      description: 'Test diagram'
                    },
                    description: 'Test diagram',
                    confidence: 0.8,
                    type: 'invalid_type'
                  }
                ]
              })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const imageData = new ImageData(800, 600)
      const result = await client.detectDiagramsWithCoordinates(imageData)

      expect(result.diagrams).toHaveLength(1)
      const coords = result.diagrams[0].coordinates
      
      // Should sanitize coordinates
      expect(coords.x1).toBeGreaterThanOrEqual(0)
      expect(coords.y1).toBeGreaterThanOrEqual(0)
      expect(coords.x2).toBeGreaterThan(coords.x1)
      expect(coords.y2).toBeGreaterThan(coords.y1)
      expect(coords.type).toBe('other') // Should default to 'other' for invalid type
    })

    it('should filter diagrams below confidence threshold', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                questions: [],
                diagrams: [
                  {
                    coordinates: {
                      x1: 100, y1: 150, x2: 300, y2: 250,
                      confidence: 0.9, type: 'graph', description: 'High confidence'
                    },
                    confidence: 0.9, type: 'graph'
                  },
                  {
                    coordinates: {
                      x1: 400, y1: 150, x2: 600, y2: 250,
                      confidence: 0.5, type: 'graph', description: 'Low confidence'
                    },
                    confidence: 0.5, type: 'graph'
                  }
                ]
              })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const imageData = new ImageData(800, 600)
      const result = await client.detectDiagramsWithCoordinates(imageData)

      // Should only include diagram above threshold (0.7)
      expect(result.diagrams).toHaveLength(1)
      expect(result.diagrams[0].coordinates.confidence).toBe(0.9)
    })

    it('should limit diagrams per page', async () => {
      const diagrams = Array.from({ length: 10 }, (_, i) => ({
        coordinates: {
          x1: i * 50, y1: 100, x2: (i + 1) * 50, y2: 200,
          confidence: 0.8, type: 'graph', description: `Diagram ${i + 1}`
        },
        confidence: 0.8, type: 'graph'
      }))

      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({ questions: [], diagrams })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const imageData = new ImageData(800, 600)
      const result = await client.detectDiagramsWithCoordinates(imageData)

      // Should limit to maxDiagramsPerPage (5)
      expect(result.diagrams).toHaveLength(5)
    })
  })

  describe('Enhanced Question Extraction', () => {
    it('should extract questions with diagram information', async () => {
      // Mock the base extractQuestions method
      const mockBaseResult = {
        questions: [
          {
            id: 1,
            text: 'Analyze the graph shown below',
            type: 'MCQ' as const,
            options: ['A) Linear', 'B) Quadratic'],
            correctAnswer: null,
            subject: 'Mathematics',
            section: 'Graphs',
            pageNumber: 1,
            questionNumber: 1,
            confidence: 4,
            hasDiagram: true,
            extractionMetadata: {
              processingTime: 100,
              geminiModel: 'gemini-1.5-pro',
              apiVersion: 'v1beta'
            }
          }
        ],
        metadata: {
          geminiModel: 'gemini-1.5-pro',
          processingDate: '2024-01-01',
          totalConfidence: 4,
          diagramQuestionsCount: 1,
          manualReviewRequired: true,
          pdfMetadata: {
            fileName: 'test.pdf',
            fileHash: 'hash123',
            pageCount: 1,
            extractedText: 'Sample text'
          }
        },
        confidence: 4,
        processingTime: 1000
      }

      // Mock the parent class method
      vi.spyOn(client, 'extractQuestions').mockResolvedValue(mockBaseResult)

      const pdfBuffer = new ArrayBuffer(1024)
      const result = await client.extractQuestionsWithDiagrams(pdfBuffer, 'test.pdf')

      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].hasDiagram).toBe(true)
      expect(result.questions[0].confidence).toBe(0.8) // Converted from 1-5 to 0-1 scale
      expect(result.processingStats.questionsWithDiagrams).toBe(1)
    })
  })

  describe('Page Analysis', () => {
    it('should analyze single page for diagrams', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                questions: [
                  {
                    id: 'q1',
                    text: 'Question about the diagram',
                    type: 'Diagram',
                    hasDiagram: true,
                    confidence: 0.9
                  }
                ],
                diagrams: [
                  {
                    coordinates: {
                      x1: 100, y1: 150, x2: 300, y2: 250,
                      confidence: 0.85, type: 'scientific', description: 'Biology diagram'
                    },
                    confidence: 0.85, type: 'scientific'
                  }
                ]
              })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const imageData = new ImageData(800, 600)
      const result = await client.analyzePageForDiagrams(imageData, 1)

      expect(result.diagrams).toHaveLength(1)
      expect(result.questions).toHaveLength(1)
      expect(result.confidence).toBe(0.85)
    })

    it('should handle page analysis errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const imageData = new ImageData(800, 600)
      const result = await client.analyzePageForDiagrams(imageData, 1)

      expect(result.diagrams).toEqual([])
      expect(result.questions).toEqual([])
      expect(result.confidence).toBe(0)
    })
  })

  describe('Batch Processing', () => {
    it('should process multiple pages in batches', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                questions: [],
                diagrams: [
                  {
                    coordinates: {
                      x1: 100, y1: 150, x2: 300, y2: 250,
                      confidence: 0.8, type: 'graph', description: 'Test diagram'
                    },
                    confidence: 0.8, type: 'graph'
                  }
                ]
              })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const pages = [
        { pageNumber: 1, imageData: new ImageData(800, 600) },
        { pageNumber: 2, imageData: new ImageData(800, 600) },
        { pageNumber: 3, imageData: new ImageData(800, 600) }
      ]

      const result = await client.batchProcessPages(pages)

      expect(result.size).toBe(3) // Should have results for all 3 pages
      expect(mockFetch).toHaveBeenCalledTimes(3) // One call per page
    })
  })

  describe('Utility Methods', () => {
    it('should validate diagram types correctly', async () => {
      const validTypes = ['graph', 'flowchart', 'scientific', 'geometric', 'table', 'circuit', 'map', 'other']
      
      for (const type of validTypes) {
        const result = (client as any).validateDiagramType(type)
        expect(result).toBe(type)
      }

      // Invalid type should default to 'other'
      const invalidResult = (client as any).validateDiagramType('invalid_type')
      expect(invalidResult).toBe('other')
    })

    it('should convert ImageData to base64', async () => {
      const imageData = new ImageData(100, 100)
      const base64 = (client as any).imageDataToBase64(imageData)
      
      expect(typeof base64).toBe('string')
      expect(base64).toBe('mockbase64data') // From our mock
    })

    it('should create mock image data for testing', async () => {
      const imageData = (client as any).createMockImageData(800, 600)
      
      expect(imageData.width).toBe(800)
      expect(imageData.height).toBe(600)
      expect(imageData.data).toBeInstanceOf(Uint8ClampedArray)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
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

      const imageData = new ImageData(800, 600)
      const result = await client.detectDiagramsWithCoordinates(imageData)

      expect(result.questions).toEqual([])
      expect(result.diagrams).toEqual([])
    })

    it('should handle missing response content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: []
        })
      })

      const imageData = new ImageData(800, 600)
      const result = await client.detectDiagramsWithCoordinates(imageData)

      expect(result.questions).toEqual([])
      expect(result.diagrams).toEqual([])
    })

    it('should classify error codes correctly', async () => {
      const testCases = [
        { status: 429, expected: 'QUOTA_EXCEEDED' },
        { status: 500, expected: 'NETWORK_ERROR' },
        { status: 400, expected: 'UNKNOWN_ERROR' }
      ]

      for (const testCase of testCases) {
        const error = { status: testCase.status, message: 'Test error' }
        const code = (client as any).getErrorCode(error)
        expect(code).toBe(testCase.expected)
      }
    })
  })
})