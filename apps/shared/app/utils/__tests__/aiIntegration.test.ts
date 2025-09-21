/**
 * Integration tests for AI Extraction components
 * Tests the complete workflow from extraction to JSON conversion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { aiJsonSchemaUtils } from '../aiJsonSchemaUtils'
import type { AIExtractionResult } from '../geminiAPIClient'

describe('AI Integration Tests', () => {
  let mockAIResult: AIExtractionResult

  beforeEach(() => {
    mockAIResult = {
      questions: [
        {
          id: 1,
          text: 'What is the capital of France?',
          type: 'MCQ',
          options: ['Paris', 'London', 'Berlin', 'Madrid'],
          correctAnswer: null,
          subject: 'Geography',
          section: 'Europe',
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
          text: 'Calculate the area of a circle with radius 5cm.',
          type: 'NAT',
          options: [],
          correctAnswer: null,
          subject: 'Mathematics',
          section: 'Geometry',
          pageNumber: 1,
          questionNumber: 2,
          confidence: 3.8,
          hasDiagram: true,
          extractionMetadata: {
            processingTime: 200,
            geminiModel: 'gemini-1.5-flash',
            apiVersion: 'v1beta'
          }
        }
      ],
      metadata: {
        geminiModel: 'gemini-1.5-flash',
        processingDate: new Date().toISOString(),
        totalConfidence: 4.15,
        diagramQuestionsCount: 1,
        manualReviewRequired: false,
        pdfMetadata: {
          fileName: 'test-questions.pdf',
          fileHash: 'abc123def456',
          pageCount: 2,
          extractedText: 'Sample extracted text...'
        }
      },
      confidence: 4.15,
      processingTime: 2500
    }
  })

  describe('AI to Rankify JSON Conversion', () => {
    it('should convert AI result to valid Rankify format', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult, {
        includeAnswerKey: false,
        generateTestConfig: true
      })

      expect(conversion.success).toBe(true)
      expect(conversion.data).toBeDefined()
      expect(conversion.errors).toHaveLength(0)

      const rankifyJson = conversion.data!
      
      // Check basic structure
      expect(rankifyJson.appVersion).toBe('1.25.0')
      expect(rankifyJson.generatedBy).toBe('testInterfacePage')
      expect(rankifyJson.testConfig).toBeDefined()
      expect(rankifyJson.testData).toBeDefined()
      expect(rankifyJson.testSummary).toBeDefined()
    })

    it('should properly structure test sections data', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult)
      
      expect(conversion.success).toBe(true)
      const testData = conversion.data!.testData

      // Check sections are created
      expect(testData.testSectionsData).toBeDefined()
      expect(Object.keys(testData.testSectionsData)).toContain('Europe')
      expect(Object.keys(testData.testSectionsData)).toContain('Geometry')

      // Check question structure
      const europeSection = testData.testSectionsData['Europe']
      expect(europeSection['1']).toBeDefined()
      expect(europeSection['1'].queText).toBe('What is the capital of France?')
      expect(europeSection['1'].queType).toBe('mcq')
      expect(europeSection['1'].hasDiagram).toBe(false)
    })

    it('should generate proper test sections list', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult)
      
      expect(conversion.success).toBe(true)
      const sectionsList = conversion.data!.testData.testSectionsList

      expect(sectionsList).toHaveLength(2)
      expect(sectionsList.find(s => s.name === 'Europe')).toBeDefined()
      expect(sectionsList.find(s => s.name === 'Geometry')).toBeDefined()

      const europeSection = sectionsList.find(s => s.name === 'Europe')!
      expect(europeSection.totalQuestions).toBe(1)
      expect(europeSection.subject).toBe('Geography')
    })

    it('should handle question type mapping correctly', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult)
      
      expect(conversion.success).toBe(true)
      const sectionsData = conversion.data!.testData.testSectionsData

      // MCQ question
      const mcqQuestion = sectionsData['Europe']['1']
      expect(mcqQuestion.queType).toBe('mcq')
      expect(mcqQuestion.queOptions).toBe(4) // Number of options

      // NAT question
      const natQuestion = sectionsData['Geometry']['2']
      expect(natQuestion.queType).toBe('nat')
      expect(natQuestion.queOptions).toBe(null) // No options for NAT
    })

    it('should preserve AI metadata', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult)
      
      expect(conversion.success).toBe(true)
      const sectionsData = conversion.data!.testData.testSectionsData

      const question = sectionsData['Europe']['1']
      expect(question.confidence).toBe(4.5)
      expect(question.aiMetadata).toBeDefined()
      expect(question.aiMetadata.extractionModel).toBe('gemini-2.5-flash')
      expect(question.aiMetadata.originalId).toBe(1)
    })

    it('should generate test summary correctly', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult)
      
      expect(conversion.success).toBe(true)
      const summary = conversion.data!.testSummary

      expect(summary).toHaveLength(2) // One for each question type
      
      const geographyMCQ = summary.find(s => s.subject === 'Geography' && s.questionType === 'mcq')
      expect(geographyMCQ).toBeDefined()
      expect(geographyMCQ!.count).toBe(1)

      const mathNAT = summary.find(s => s.subject === 'Mathematics' && s.questionType === 'nat')
      expect(mathNAT).toBeDefined()
      expect(mathNAT!.count).toBe(1)
    })

    it('should include answer key when requested', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult, {
        includeAnswerKey: true
      })
      
      expect(conversion.success).toBe(true)
      expect(conversion.data!.testAnswerKey).toBeDefined()

      const answerKey = conversion.data!.testAnswerKey
      expect(answerKey['Geography']).toBeDefined()
      expect(answerKey['Geography']['Europe']).toBeDefined()
      expect(answerKey['Geography']['Europe']['1']).toBeDefined()
    })

    it('should validate converted JSON structure', () => {
      const conversion = aiJsonSchemaUtils.convertAIToRankify(mockAIResult)
      
      expect(conversion.success).toBe(true)
      
      const converter = aiJsonSchemaUtils.createConverter()
      const validation = converter.validateRankifyJson(conversion.data!)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    it('should estimate test duration correctly', () => {
      const duration = aiJsonSchemaUtils.estimateTestDuration(mockAIResult.questions)
      
      // MCQ: 90s, NAT: 150s, plus 30s for low confidence (none in this case)
      expect(duration).toBe(240) // 90 + 150
    })

    it('should generate meaningful test names', () => {
      const testName = aiJsonSchemaUtils.generateTestName(mockAIResult)
      
      expect(testName).toContain('test-questions')
      expect(testName).toContain('2 Questions')
      expect(testName).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/) // Date pattern
    })

    it('should extract subjects and sections correctly', () => {
      const extracted = aiJsonSchemaUtils.extractSubjectsAndSections(mockAIResult.questions)
      
      expect(extracted.subjects).toContain('Geography')
      expect(extracted.subjects).toContain('Mathematics')
      expect(extracted.sections).toContain('Europe')
      expect(extracted.sections).toContain('Geometry')
      
      expect(extracted.subjectSectionMap['Geography']).toContain('Europe')
      expect(extracted.subjectSectionMap['Mathematics']).toContain('Geometry')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty questions array', () => {
      const emptyResult = { ...mockAIResult, questions: [] }
      const conversion = aiJsonSchemaUtils.convertAIToRankify(emptyResult)
      
      expect(conversion.success).toBe(false)
      expect(conversion.errors).toContain('No questions found in AI extraction result')
    })

    it('should handle invalid question types', () => {
      const invalidResult = {
        ...mockAIResult,
        questions: [{
          ...mockAIResult.questions[0],
          type: 'INVALID_TYPE' as any
        }]
      }
      
      const conversion = aiJsonSchemaUtils.convertAIToRankify(invalidResult)
      
      expect(conversion.success).toBe(false)
      expect(conversion.errors.some(e => e.includes('Invalid question type'))).toBe(true)
    })

    it('should handle missing required fields', () => {
      const invalidResult = {
        ...mockAIResult,
        questions: [{
          ...mockAIResult.questions[0],
          text: '' // Empty text
        }]
      }
      
      const conversion = aiJsonSchemaUtils.convertAIToRankify(invalidResult)
      
      expect(conversion.success).toBe(false)
      expect(conversion.errors.some(e => e.includes('Missing question text'))).toBe(true)
    })
  })
})