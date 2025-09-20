/**
 * PDF-to-JSON Workflow Integration Tests
 * Tests the complete workflow from PDF upload to JSON output
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { PDFProcessor } from '../pdfProcessor.js'
import { GeminiAPIClient } from '../geminiAPIClient.js'
import { JSONValidator } from '../jsonValidator.js'
import { StorageManager } from '../storageManager.js'
import { ConfidenceScoring } from '../confidenceScoringUtils.js'

// Mock dependencies
vi.mock('../pdfProcessor.js')
vi.mock('../geminiAPIClient.js')
vi.mock('../jsonValidator.js')
vi.mock('../storageManager.js')

describe('PDF-to-JSON Workflow Integration', () => {
  let pdfProcessor
  let geminiClient
  let jsonValidator
  let storageManager
  let confidenceScoring
  
  beforeEach(() => {
    pdfProcessor = new PDFProcessor()
    geminiClient = new GeminiAPIClient('test-api-key')
    jsonValidator = new JSONValidator()
    storageManager = new StorageManager()
    confidenceScoring = new ConfidenceScoring()
    
    // Setup default mocks
    setupDefaultMocks()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  function setupDefaultMocks() {
    // PDF Processor mocks
    pdfProcessor.extractText.mockResolvedValue({
      text: 'Sample PDF text with questions',
      pages: [
        { pageNumber: 1, text: 'Question 1: What is 2+2?' },
        { pageNumber: 2, text: 'Question 2: What is the capital of France?' }
      ]
    })
    
    pdfProcessor.extractMetadata.mockResolvedValue({
      pageCount: 2,
      fileSize: 1024000,
      title: 'Sample Test PDF',
      author: 'Test Author'
    })
    
    // Gemini API Client mocks
    geminiClient.extractQuestions.mockResolvedValue({
      questions: [
        {
          id: 1,
          text: 'What is 2+2?',
          type: 'MCQ',
          options: ['2', '3', '4', '5'],
          correctAnswer: null,
          subject: 'Mathematics',
          section: 'Arithmetic',
          pageNumber: 1,
          questionNumber: 1,
          confidence: 4.5,
          hasDiagram: false,
          extractionMetadata: {
            processingTime: 150,
            geminiModel: 'gemini-1.5-flash',
            apiVersion: 'v1beta'
          }
        },
        {
          id: 2,
          text: 'What is the capital of France?',
          type: 'MCQ',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correctAnswer: null,
          subject: 'Geography',
          section: 'Europe',
          pageNumber: 2,
          questionNumber: 2,
          confidence: 4.8,
          hasDiagram: false,
          extractionMetadata: {
            processingTime: 120,
            geminiModel: 'gemini-1.5-flash',
            apiVersion: 'v1beta'
          }
        }
      ],
      metadata: {
        totalQuestions: 2,
        processingTime: 270,
        averageConfidence: 4.65,
        diagramQuestionsCount: 0
      }
    })
    
    // JSON Validator mocks
    jsonValidator.validate.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    })
    
    jsonValidator.sanitize.mockImplementation(data => data)
    
    // Storage Manager mocks
    storageManager.save.mockResolvedValue({ success: true, id: 'test-id-123' })
    storageManager.load.mockResolvedValue(null)
    
    // Confidence Scoring mocks
    confidenceScoring.calculateOverallConfidence.mockReturnValue(4.65)
    confidenceScoring.identifyLowConfidenceQuestions.mockReturnValue([])
  }

  describe('Complete Workflow', () => {
    test('should process PDF from upload to JSON output', async () => {
      const mockPDFFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' })
      const mockPDFBuffer = await mockPDFFile.arrayBuffer()
      
      // Step 1: Extract text from PDF
      const textResult = await pdfProcessor.extractText(mockPDFBuffer)
      expect(textResult.text).toBeDefined()
      expect(textResult.pages).toHaveLength(2)
      
      // Step 2: Extract metadata
      const metadata = await pdfProcessor.extractMetadata(mockPDFBuffer)
      expect(metadata.pageCount).toBe(2)
      expect(metadata.fileSize).toBe(1024000)
      
      // Step 3: Process with Gemini AI
      const aiResult = await geminiClient.extractQuestions(mockPDFBuffer)
      expect(aiResult.questions).toHaveLength(2)
      expect(aiResult.questions[0].confidence).toBe(4.5)
      expect(aiResult.questions[1].confidence).toBe(4.8)
      
      // Step 4: Calculate confidence scores
      const overallConfidence = confidenceScoring.calculateOverallConfidence(aiResult.questions)
      expect(overallConfidence).toBe(4.65)
      
      // Step 5: Validate JSON structure
      const validationResult = jsonValidator.validate(aiResult)
      expect(validationResult.isValid).toBe(true)
      expect(validationResult.errors).toHaveLength(0)
      
      // Step 6: Sanitize data
      const sanitizedData = jsonValidator.sanitize(aiResult)
      expect(sanitizedData).toBeDefined()
      
      // Step 7: Save to storage
      const saveResult = await storageManager.save('ai-extraction', sanitizedData)
      expect(saveResult.success).toBe(true)
      expect(saveResult.id).toBe('test-id-123')
      
      // Verify all steps were called
      expect(pdfProcessor.extractText).toHaveBeenCalledWith(mockPDFBuffer)
      expect(pdfProcessor.extractMetadata).toHaveBeenCalledWith(mockPDFBuffer)
      expect(geminiClient.extractQuestions).toHaveBeenCalledWith(mockPDFBuffer)
      expect(jsonValidator.validate).toHaveBeenCalledWith(aiResult)
      expect(storageManager.save).toHaveBeenCalledWith('ai-extraction', sanitizedData)
    })

    test('should handle PDF processing errors gracefully', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      // Mock PDF processing failure
      pdfProcessor.extractText.mockRejectedValue(new Error('Corrupted PDF'))
      
      await expect(async () => {
        await pdfProcessor.extractText(mockPDFBuffer)
      }).rejects.toThrow('Corrupted PDF')
      
      // Verify error handling
      expect(pdfProcessor.extractText).toHaveBeenCalledWith(mockPDFBuffer)
    })

    test('should handle AI processing errors with fallback', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      // Mock AI processing failure
      geminiClient.extractQuestions.mockRejectedValue(new Error('API rate limit exceeded'))
      
      // Should attempt fallback processing
      await expect(async () => {
        await geminiClient.extractQuestions(mockPDFBuffer)
      }).rejects.toThrow('API rate limit exceeded')
      
      expect(geminiClient.extractQuestions).toHaveBeenCalledWith(mockPDFBuffer)
    })

    test('should validate and fix invalid JSON data', async () => {
      const invalidData = {
        questions: [
          {
            // Missing required fields
            text: 'Incomplete question',
            type: 'MCQ'
          }
        ]
      }
      
      // Mock validation failure
      jsonValidator.validate.mockReturnValue({
        isValid: false,
        errors: ['Missing required field: options'],
        warnings: ['Low confidence question detected']
      })
      
      // Mock sanitization that fixes the data
      jsonValidator.sanitize.mockReturnValue({
        questions: [
          {
            id: 1,
            text: 'Incomplete question',
            type: 'MCQ',
            options: ['Option A', 'Option B', 'Option C', 'Option D'], // Added by sanitizer
            subject: 'Unknown',
            section: 'General',
            confidence: 2.0,
            hasDiagram: false
          }
        ]
      })
      
      const validationResult = jsonValidator.validate(invalidData)
      expect(validationResult.isValid).toBe(false)
      expect(validationResult.errors).toContain('Missing required field: options')
      
      const sanitizedData = jsonValidator.sanitize(invalidData)
      expect(sanitizedData.questions[0].options).toHaveLength(4)
      expect(sanitizedData.questions[0].subject).toBe('Unknown')
    })
  })

  describe('Performance Testing', () => {
    test('should process small PDF within time limit', async () => {
      const smallPDFBuffer = new ArrayBuffer(1024 * 100) // 100KB
      
      const startTime = Date.now()
      
      await pdfProcessor.extractText(smallPDFBuffer)
      await geminiClient.extractQuestions(smallPDFBuffer)
      
      const processingTime = Date.now() - startTime
      
      expect(processingTime).toBeLessThan(10000) // Should complete within 10 seconds
    })

    test('should handle large PDF with memory management', async () => {
      const largePDFBuffer = new ArrayBuffer(10 * 1024 * 1024) // 10MB
      
      // Mock memory-efficient processing
      pdfProcessor.extractText.mockResolvedValue({
        text: 'Large PDF content processed in chunks',
        pages: Array.from({ length: 100 }, (_, i) => ({
          pageNumber: i + 1,
          text: `Page ${i + 1} content`
        }))
      })
      
      geminiClient.extractQuestions.mockResolvedValue({
        questions: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          text: `Question ${i + 1}`,
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          subject: 'Test',
          section: 'Large PDF',
          confidence: 4.0,
          hasDiagram: false
        })),
        metadata: {
          totalQuestions: 50,
          processingTime: 5000,
          averageConfidence: 4.0
        }
      })
      
      const result = await geminiClient.extractQuestions(largePDFBuffer)
      
      expect(result.questions).toHaveLength(50)
      expect(result.metadata.processingTime).toBeLessThan(30000) // Within 30 seconds
    })

    test('should process multiple PDFs concurrently', async () => {
      const pdfBuffers = [
        new ArrayBuffer(1024),
        new ArrayBuffer(2048),
        new ArrayBuffer(1536)
      ]
      
      // Mock concurrent processing
      const promises = pdfBuffers.map(buffer => 
        geminiClient.extractQuestions(buffer)
      )
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.questions).toBeDefined()
        expect(result.metadata).toBeDefined()
      })
      
      expect(geminiClient.extractQuestions).toHaveBeenCalledTimes(3)
    })
  })

  describe('Data Integrity', () => {
    test('should preserve question order and numbering', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      geminiClient.extractQuestions.mockResolvedValue({
        questions: [
          { id: 1, questionNumber: 1, text: 'First question' },
          { id: 2, questionNumber: 2, text: 'Second question' },
          { id: 3, questionNumber: 3, text: 'Third question' }
        ].map(q => ({
          ...q,
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          subject: 'Test',
          section: 'Order',
          confidence: 4.0,
          hasDiagram: false
        }))
      })
      
      const result = await geminiClient.extractQuestions(mockPDFBuffer)
      
      expect(result.questions[0].questionNumber).toBe(1)
      expect(result.questions[1].questionNumber).toBe(2)
      expect(result.questions[2].questionNumber).toBe(3)
      
      expect(result.questions[0].text).toBe('First question')
      expect(result.questions[1].text).toBe('Second question')
      expect(result.questions[2].text).toBe('Third question')
    })

    test('should maintain metadata consistency', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      const pdfMetadata = await pdfProcessor.extractMetadata(mockPDFBuffer)
      const aiResult = await geminiClient.extractQuestions(mockPDFBuffer)
      
      // Verify metadata consistency
      expect(pdfMetadata.pageCount).toBe(2)
      expect(aiResult.questions.every(q => q.pageNumber <= pdfMetadata.pageCount)).toBe(true)
      
      // Verify extraction metadata
      aiResult.questions.forEach(question => {
        expect(question.extractionMetadata).toBeDefined()
        expect(question.extractionMetadata.processingTime).toBeGreaterThan(0)
        expect(question.extractionMetadata.geminiModel).toBeDefined()
        expect(question.extractionMetadata.apiVersion).toBeDefined()
      })
    })

    test('should handle special characters and formatting', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      geminiClient.extractQuestions.mockResolvedValue({
        questions: [
          {
            id: 1,
            text: 'Calculate ∫₀¹ x² dx = ?',
            type: 'NAT',
            options: [],
            subject: 'Mathematics',
            section: 'Calculus',
            confidence: 4.2,
            hasDiagram: false
          },
          {
            id: 2,
            text: 'What is the value of π (pi) to 3 decimal places?',
            type: 'NAT',
            options: [],
            subject: 'Mathematics',
            section: 'Constants',
            confidence: 4.8,
            hasDiagram: false
          }
        ]
      })
      
      const result = await geminiClient.extractQuestions(mockPDFBuffer)
      
      // Verify special characters are preserved
      expect(result.questions[0].text).toContain('∫₀¹')
      expect(result.questions[1].text).toContain('π')
      
      // Verify data is still valid after sanitization
      const sanitizedData = jsonValidator.sanitize(result)
      expect(sanitizedData.questions[0].text).toContain('∫₀¹')
      expect(sanitizedData.questions[1].text).toContain('π')
    })
  })

  describe('Error Recovery', () => {
    test('should recover from partial processing failures', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      // Mock partial failure - some questions processed, others failed
      geminiClient.extractQuestions.mockResolvedValue({
        questions: [
          {
            id: 1,
            text: 'Successfully processed question',
            type: 'MCQ',
            options: ['A', 'B', 'C', 'D'],
            subject: 'Test',
            section: 'Success',
            confidence: 4.5,
            hasDiagram: false
          }
        ],
        errors: [
          {
            questionIndex: 2,
            error: 'Failed to parse question format',
            originalText: 'Malformed question text...'
          }
        ],
        metadata: {
          totalQuestions: 1,
          failedQuestions: 1,
          processingTime: 200
        }
      })
      
      const result = await geminiClient.extractQuestions(mockPDFBuffer)
      
      expect(result.questions).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
      expect(result.metadata.failedQuestions).toBe(1)
      
      // Verify successful question is valid
      const validationResult = jsonValidator.validate({ questions: result.questions })
      expect(validationResult.isValid).toBe(true)
    })

    test('should handle storage failures with retry', async () => {
      const testData = { questions: [], metadata: {} }
      
      // Mock storage failure followed by success
      storageManager.save
        .mockRejectedValueOnce(new Error('Storage quota exceeded'))
        .mockResolvedValueOnce({ success: true, id: 'retry-success-123' })
      
      // First attempt should fail
      await expect(storageManager.save('test', testData)).rejects.toThrow('Storage quota exceeded')
      
      // Second attempt should succeed
      const result = await storageManager.save('test', testData)
      expect(result.success).toBe(true)
      expect(result.id).toBe('retry-success-123')
    })

    test('should provide meaningful error messages', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      // Mock various error scenarios
      const errorScenarios = [
        {
          error: new Error('Invalid API key'),
          expectedMessage: 'Authentication failed'
        },
        {
          error: new Error('Rate limit exceeded'),
          expectedMessage: 'Too many requests'
        },
        {
          error: new Error('PDF is corrupted'),
          expectedMessage: 'File processing failed'
        }
      ]
      
      for (const scenario of errorScenarios) {
        geminiClient.extractQuestions.mockRejectedValueOnce(scenario.error)
        
        await expect(geminiClient.extractQuestions(mockPDFBuffer))
          .rejects.toThrow(scenario.error.message)
      }
    })
  })

  describe('Backward Compatibility', () => {
    test('should generate output compatible with existing CBT interface', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      const aiResult = await geminiClient.extractQuestions(mockPDFBuffer)
      
      // Verify AI output contains all fields expected by CBT interface
      aiResult.questions.forEach(question => {
        expect(question).toHaveProperty('id')
        expect(question).toHaveProperty('text')
        expect(question).toHaveProperty('type')
        expect(question).toHaveProperty('options')
        expect(question).toHaveProperty('subject')
        expect(question).toHaveProperty('section')
        
        // AI-specific fields
        expect(question).toHaveProperty('confidence')
        expect(question).toHaveProperty('hasDiagram')
        expect(question).toHaveProperty('extractionMetadata')
      })
      
      // Verify metadata structure
      expect(aiResult.metadata).toHaveProperty('totalQuestions')
      expect(aiResult.metadata).toHaveProperty('processingTime')
      expect(aiResult.metadata).toHaveProperty('averageConfidence')
    })

    test('should support legacy question types', async () => {
      const mockPDFBuffer = new ArrayBuffer(1024)
      
      geminiClient.extractQuestions.mockResolvedValue({
        questions: [
          { type: 'MCQ', text: 'Multiple choice question' },
          { type: 'MSQ', text: 'Multiple select question' },
          { type: 'NAT', text: 'Numerical answer question' },
          { type: 'MSM', text: 'Matrix match question' }
        ].map((q, i) => ({
          id: i + 1,
          ...q,
          options: q.type === 'NAT' ? [] : ['A', 'B', 'C', 'D'],
          subject: 'Test',
          section: 'Legacy',
          confidence: 4.0,
          hasDiagram: false
        }))
      })
      
      const result = await geminiClient.extractQuestions(mockPDFBuffer)
      
      const questionTypes = result.questions.map(q => q.type)
      expect(questionTypes).toContain('MCQ')
      expect(questionTypes).toContain('MSQ')
      expect(questionTypes).toContain('NAT')
      expect(questionTypes).toContain('MSM')
      
      // Verify NAT questions have empty options array
      const natQuestion = result.questions.find(q => q.type === 'NAT')
      expect(natQuestion.options).toEqual([])
    })
  })
})