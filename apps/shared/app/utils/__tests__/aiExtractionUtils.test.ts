/**
 * Tests for AI Extraction Utils
 * Basic unit tests to verify core functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  ConfidenceScorer, 
  QuestionValidator, 
  confidenceUtils,
  createConfidenceScorer,
  createQuestionValidator
} from '../confidenceScoringUtils'
import { pdfUtils } from '../pdfProcessingUtils'
import { aiStorageUtils } from '../aiStorageUtils'
import { aiExtractionUtils } from '../aiExtractionUtils'

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer

  beforeEach(() => {
    scorer = createConfidenceScorer()
  })

  it('should calculate confidence for a well-formed question', () => {
    const question = {
      id: 1,
      text: 'What is the capital of France?',
      type: 'MCQ' as const,
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correctAnswer: null,
      subject: 'Geography',
      section: 'Europe',
      pageNumber: 1,
      questionNumber: 1,
      confidence: 4,
      hasDiagram: false,
      extractionMetadata: {
        processingTime: 100,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    }

    const metrics = scorer.calculateQuestionConfidence(question)
    
    expect(metrics.overall).toBeGreaterThan(3)
    expect(metrics.textClarity).toBeGreaterThan(3)
    expect(metrics.structureRecognition).toBeGreaterThan(3)
    expect(metrics.optionsParsing).toBeGreaterThan(3)
  })

  it('should penalize questions with poor text quality', () => {
    const question = {
      id: 1,
      text: '�?',
      type: 'MCQ' as const,
      options: ['A', 'B'],
      correctAnswer: null,
      subject: 'Unknown',
      section: 'Unknown',
      pageNumber: 0,
      questionNumber: 0,
      confidence: 1,
      hasDiagram: false,
      extractionMetadata: {
        processingTime: 100,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    }

    const metrics = scorer.calculateQuestionConfidence(question)
    
    expect(metrics.overall).toBeLessThan(3)
    expect(metrics.textClarity).toBeLessThan(3)
  })
})

describe('QuestionValidator', () => {
  let validator: QuestionValidator

  beforeEach(() => {
    validator = createQuestionValidator()
  })

  it('should validate a correct MCQ question', () => {
    const question = {
      id: 1,
      text: 'What is 2 + 2?',
      type: 'MCQ' as const,
      options: ['3', '4', '5', '6'],
      correctAnswer: null,
      subject: 'Math',
      section: 'Arithmetic',
      pageNumber: 1,
      questionNumber: 1,
      confidence: 4,
      hasDiagram: false,
      extractionMetadata: {
        processingTime: 100,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    }

    const result = validator.validateQuestion(question)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should detect missing required fields', () => {
    const question = {
      id: 1,
      text: '',
      type: '' as any,
      options: [],
      correctAnswer: null,
      subject: 'Math',
      section: 'Arithmetic',
      pageNumber: 1,
      questionNumber: 1,
      confidence: 4,
      hasDiagram: false,
      extractionMetadata: {
        processingTime: 100,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    }

    const result = validator.validateQuestion(question)
    
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.code === 'MISSING_TEXT')).toBe(true)
  })

  it('should warn about low confidence scores', () => {
    const question = {
      id: 1,
      text: 'What is 2 + 2?',
      type: 'MCQ' as const,
      options: ['3', '4', '5', '6'],
      correctAnswer: null,
      subject: 'Math',
      section: 'Arithmetic',
      pageNumber: 1,
      questionNumber: 1,
      confidence: 1,
      hasDiagram: false,
      extractionMetadata: {
        processingTime: 100,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    }

    const result = validator.validateQuestion(question)
    
    expect(result.warnings.some(w => w.code === 'LOW_CONFIDENCE')).toBe(true)
  })
})

describe('confidenceUtils', () => {
  it('should return correct confidence descriptions', () => {
    expect(confidenceUtils.getConfidenceDescription(5)).toBe('Excellent')
    expect(confidenceUtils.getConfidenceDescription(4)).toBe('Good')
    expect(confidenceUtils.getConfidenceDescription(3)).toBe('Fair')
    expect(confidenceUtils.getConfidenceDescription(2)).toBe('Poor')
    expect(confidenceUtils.getConfidenceDescription(1)).toBe('Very Poor')
  })

  it('should determine manual review requirements correctly', () => {
    const highConfidenceQuestion = {
      confidence: 4,
      hasDiagram: false
    } as any

    const lowConfidenceQuestion = {
      confidence: 2,
      hasDiagram: false
    } as any

    const diagramQuestion = {
      confidence: 4,
      hasDiagram: true
    } as any

    expect(confidenceUtils.requiresManualReview(highConfidenceQuestion)).toBe(false)
    expect(confidenceUtils.requiresManualReview(lowConfidenceQuestion)).toBe(true)
    expect(confidenceUtils.requiresManualReview(diagramQuestion)).toBe(true)
  })
})

describe('pdfUtils', () => {
  it('should validate PDF signatures correctly', () => {
    // Create a mock PDF buffer with correct signature
    const validPDF = new ArrayBuffer(10)
    const view = new Uint8Array(validPDF)
    view[0] = 0x25 // %
    view[1] = 0x50 // P
    view[2] = 0x44 // D
    view[3] = 0x46 // F
    view[4] = 0x2D // -

    expect(pdfUtils.validatePDF(validPDF)).toBe(true)

    // Create invalid buffer
    const invalidPDF = new ArrayBuffer(10)
    expect(pdfUtils.validatePDF(invalidPDF)).toBe(false)
  })

  it('should calculate file sizes correctly', () => {
    const buffer = new ArrayBuffer(1024 * 1024) // 1MB
    expect(pdfUtils.getFileSizeMB(buffer)).toBe(1)
  })

  it('should validate file size limits', () => {
    const smallBuffer = new ArrayBuffer(1024) // 1KB
    const largeBuffer = new ArrayBuffer(15 * 1024 * 1024) // 15MB

    expect(pdfUtils.isFileSizeValid(smallBuffer, 10)).toBe(true)
    expect(pdfUtils.isFileSizeValid(largeBuffer, 10)).toBe(false)
  })
})

describe('aiStorageUtils', () => {
  it('should validate test data structure correctly', () => {
    const validData = {
      fileName: 'test.pdf',
      fileHash: 'abc123',
      extractionResult: {
        questions: [],
        metadata: {},
        confidence: 3,
        processingTime: 1000
      },
      reviewStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    }

    expect(aiStorageUtils.validateTestData(validData)).toBe(true)

    const invalidData = {
      fileName: 'test.pdf'
      // Missing required fields
    }

    expect(aiStorageUtils.validateTestData(invalidData)).toBe(false)
  })
})

describe('aiExtractionUtils', () => {
  it('should validate API keys correctly', () => {
    expect(aiExtractionUtils.validateApiKey('AIzaSyABC123')).toBe(true)
    expect(aiExtractionUtils.validateApiKey('invalid-key')).toBe(false)
    expect(aiExtractionUtils.validateApiKey('')).toBe(false)
  })

  it('should return correct confidence thresholds', () => {
    expect(aiExtractionUtils.getRecommendedThreshold('strict')).toBe(4.0)
    expect(aiExtractionUtils.getRecommendedThreshold('balanced')).toBe(2.5)
    expect(aiExtractionUtils.getRecommendedThreshold('permissive')).toBe(1.5)
  })

  it('should format extraction summaries correctly', () => {
    const mockResult = {
      questions: [
        { confidence: 5, hasDiagram: false },
        { confidence: 3, hasDiagram: true },
        { confidence: 2, hasDiagram: false }
      ],
      confidence: 3.3,
      processingTime: 5000,
      metadata: {}
    } as any

    const summary = aiExtractionUtils.formatExtractionSummary(mockResult)
    
    expect(summary).toContain('Total Questions: 3')
    expect(summary).toContain('High Confidence (≥4): 1')
    expect(summary).toContain('Diagram Questions: 1')
    expect(summary).toContain('Overall Confidence: 3.3/5')
  })
})