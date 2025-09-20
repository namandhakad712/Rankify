/**
 * Unit tests for AI Validation Rules
 * Tests AI-specific validation scenarios and quality assessment
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AIValidationRules, validateAIQuestionBatch } from '../aiValidationRules.js'

describe('AIValidationRules', () => {
  let validator

  beforeEach(() => {
    validator = new AIValidationRules()
  })

  describe('Extraction Quality Validation', () => {
    it('should validate high-quality extraction', () => {
      const question = {
        queId: 'q1',
        queText: 'What is the capital of France? This is a well-formed question with clear text.',
        queType: 'mcq',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        confidence: 4.5,
        hasDiagram: false
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.qualityScore).toBeGreaterThan(4)
      expect(result.needsReview).toBe(false)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect low confidence issues', () => {
      const question = {
        queId: 'q1',
        queText: 'Question text',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 1.2 // Very low confidence
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.qualityScore).toBeLessThan(4)
      expect(result.needsReview).toBe(true)
      expect(result.issues.some(i => i.type === 'LOW_CONFIDENCE')).toBe(true)
    })

    it('should detect medium confidence warnings', () => {
      const question = {
        queId: 'q1',
        queText: 'Question text',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 2.8 // Medium confidence
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'MEDIUM_CONFIDENCE')).toBe(true)
    })

    it('should handle missing confidence score', () => {
      const question = {
        queId: 'q1',
        queText: 'Question text',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D']
        // No confidence score
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'MISSING_CONFIDENCE')).toBe(true)
    })
  })

  describe('Text Quality Validation', () => {
    it('should detect short question text', () => {
      const question = {
        queId: 'q1',
        queText: 'Short?', // Very short
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'SHORT_QUESTION_TEXT')).toBe(true)
    })

    it('should detect very long question text', () => {
      const question = {
        queId: 'q1',
        queText: 'A'.repeat(1200), // Very long
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'LONG_QUESTION_TEXT')).toBe(true)
    })

    it('should detect encoding issues', () => {
      const question = {
        queId: 'q1',
        queText: 'Question with encoding issues â€™ and â€œ characters',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'ENCODING_ISSUES')).toBe(true)
    })

    it('should detect incomplete sentences', () => {
      const question = {
        queId: 'q1',
        queText: 'This is a complete sentence. But this is not',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'INCOMPLETE_SENTENCES')).toBe(true)
    })

    it('should detect mathematical notation', () => {
      const question = {
        queId: 'q1',
        queText: 'Calculate the integral ∫x²dx from 0 to 1',
        queType: 'mcq',
        options: ['1/3', '1/2', '1', '2'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.recommendations.some(r => r.type === 'MATH_NOTATION')).toBe(true)
    })

    it('should detect OCR artifacts', () => {
      const question = {
        queId: 'q1',
        queText: 'Question with OCR artifacts like Il1| and O0O patterns',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'OCR_ARTIFACTS')).toBe(true)
    })
  })

  describe('Options Quality Validation', () => {
    it('should detect missing options', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question without options',
        queType: 'mcq',
        confidence: 4
        // Missing options
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'MISSING_OPTIONS')).toBe(true)
    })

    it('should detect insufficient options', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question',
        queType: 'mcq',
        options: ['Only one option'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'INSUFFICIENT_OPTIONS')).toBe(true)
    })

    it('should detect too many options', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], // 8 options
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'TOO_MANY_OPTIONS')).toBe(true)
    })

    it('should detect empty options', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question',
        queType: 'mcq',
        options: ['Valid option', '', 'Another valid option'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'EMPTY_OPTION')).toBe(true)
    })

    it('should detect short options', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'], // Very short options
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.filter(i => i.type === 'SHORT_OPTION')).toHaveLength(4)
    })

    it('should detect duplicate options', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question',
        queType: 'mcq',
        options: ['Option A', 'Option B', 'Option A', 'Option C'], // Duplicate
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'DUPLICATE_OPTIONS')).toBe(true)
    })

    it('should detect similar options', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question',
        queType: 'mcq',
        options: ['The answer is A', 'The answer is B', 'The answer is C', 'The answer is D'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'SIMILAR_OPTIONS')).toBe(true)
    })

    it('should detect option encoding issues', () => {
      const question = {
        queId: 'q1',
        queText: 'MCQ question',
        queType: 'mcq',
        options: ['Valid option', 'Option with â€™ encoding issue', 'Another valid option'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'OPTION_ENCODING_ISSUES')).toBe(true)
    })
  })

  describe('Diagram Detection Validation', () => {
    it('should validate correct diagram detection', () => {
      const question = {
        queId: 'q1',
        queText: 'Refer to the figure shown above. What is the area?',
        queType: 'mcq',
        options: ['10', '20', '30', '40'],
        hasDiagram: true,
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.recommendations.some(r => r.type === 'DIAGRAM_PRESENT')).toBe(true)
    })

    it('should detect diagram flag mismatch', () => {
      const question = {
        queId: 'q1',
        queText: 'Simple question without diagram reference',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        hasDiagram: true, // Flag set but no diagram reference
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'DIAGRAM_FLAG_MISMATCH')).toBe(true)
    })

    it('should detect missed diagram', () => {
      const question = {
        queId: 'q1',
        queText: 'Look at the chart below and determine the trend',
        queType: 'mcq',
        options: ['Increasing', 'Decreasing', 'Constant', 'Variable'],
        hasDiagram: false, // Should be true
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'MISSED_DIAGRAM')).toBe(true)
    })
  })

  describe('Question Structure Validation', () => {
    it('should detect question numbering', () => {
      const question = {
        queId: 'q1',
        queText: '1. What is the capital of France?',
        queType: 'mcq',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.recommendations.some(r => r.type === 'QUESTION_NUMBERING')).toBe(true)
    })

    it('should detect multiple questions', () => {
      const question = {
        queId: 'q1',
        queText: 'What is 2+2? Also, what is 3+3?',
        queType: 'mcq',
        options: ['4 and 6', '5 and 7', '3 and 5', '2 and 4'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'MULTIPLE_QUESTIONS')).toBe(true)
    })

    it('should detect answer in question', () => {
      const question = {
        queId: 'q1',
        queText: 'What is the capital of France? Answer: Paris',
        queType: 'mcq',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'ANSWER_IN_QUESTION')).toBe(true)
    })

    it('should detect formatting issues', () => {
      const question = {
        queId: 'q1',
        queText: 'Question   with    multiple     spaces\n\n\nand line breaks',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'FORMATTING_ISSUES')).toBe(true)
    })
  })

  describe('Legacy Compatibility Validation', () => {
    it('should validate legacy compatibility', () => {
      const question = {
        queId: 'q1',
        queText: 'Question text',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateLegacyCompatibility(question)
      expect(result.isCompatible).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect missing legacy fields', () => {
      const question = {
        // Missing queId
        queText: 'Question text',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4
      }

      const result = validator.validateLegacyCompatibility(question)
      expect(result.isCompatible).toBe(false)
      expect(result.issues.some(i => i.type === 'MISSING_LEGACY_FIELD')).toBe(true)
    })

    it('should detect incompatible question types', () => {
      const question = {
        queId: 'q1',
        queText: 'Question text',
        queType: 'comprehension', // Not supported in legacy
        confidence: 4
      }

      const result = validator.validateLegacyCompatibility(question)
      expect(result.issues.some(i => i.type === 'INCOMPATIBLE_QUESTION_TYPE')).toBe(true)
    })

    it('should detect AI-specific fields', () => {
      const question = {
        queId: 'q1',
        queText: 'Question text',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        confidence: 4, // AI-specific field
        hasDiagram: true, // AI-specific field
        extractionMetadata: {} // AI-specific field
      }

      const result = validator.validateLegacyCompatibility(question)
      expect(result.compatibility.requiredChanges).toContain('remove_confidence')
      expect(result.compatibility.requiredChanges).toContain('remove_hasDiagram')
      expect(result.compatibility.requiredChanges).toContain('remove_extractionMetadata')
    })
  })

  describe('Helper Methods', () => {
    it('should detect encoding issues correctly', () => {
      expect(validator.hasEncodingIssues('Normal text')).toBe(false)
      expect(validator.hasEncodingIssues('Text with â€™ issues')).toBe(true)
      expect(validator.hasEncodingIssues('Text with â€œ quotes')).toBe(true)
    })

    it('should detect incomplete sentences correctly', () => {
      expect(validator.hasIncompleteSentences('Complete sentence.')).toBe(false)
      expect(validator.hasIncompleteSentences('Complete sentence. But this')).toBe(true)
    })

    it('should detect math notation correctly', () => {
      expect(validator.containsMathNotation('Regular text')).toBe(false)
      expect(validator.containsMathNotation('Calculate $x^2$')).toBe(true)
      expect(validator.containsMathNotation('Find ∫x dx')).toBe(true)
    })

    it('should detect OCR artifacts correctly', () => {
      expect(validator.hasOCRArtifacts('Clean text')).toBe(false)
      expect(validator.hasOCRArtifacts('Text with Il1| confusion')).toBe(true)
      expect(validator.hasOCRArtifacts('Text with O0O confusion')).toBe(true)
    })

    it('should find duplicate options correctly', () => {
      const options = ['A', 'B', 'A', 'C']
      const duplicates = validator.findDuplicateOptions(options)
      expect(duplicates).toContain('A')
    })

    it('should find similar options correctly', () => {
      const options = ['The answer is A', 'The answer is B', 'Different option', 'Another different option']
      const similar = validator.findSimilarOptions(options)
      expect(similar.length).toBeGreaterThan(0)
    })

    it('should calculate similarity correctly', () => {
      expect(validator.calculateSimilarity('hello', 'hello')).toBe(1.0)
      expect(validator.calculateSimilarity('hello', 'world')).toBeLessThan(0.5)
      expect(validator.calculateSimilarity('hello', 'hallo')).toBeGreaterThan(0.7)
    })

    it('should detect diagram references correctly', () => {
      expect(validator.textReferencesDiagram('Regular question text')).toBe(false)
      expect(validator.textReferencesDiagram('Refer to the figure above')).toBe(true)
      expect(validator.textReferencesDiagram('See the diagram below')).toBe(true)
      expect(validator.textReferencesDiagram('As shown in the chart')).toBe(true)
    })

    it('should detect question numbering correctly', () => {
      expect(validator.hasQuestionNumbering('Regular question')).toBe(false)
      expect(validator.hasQuestionNumbering('1. Question text')).toBe(true)
      expect(validator.hasQuestionNumbering('A) Question text')).toBe(true)
      expect(validator.hasQuestionNumbering('i) Question text')).toBe(true)
    })

    it('should detect multiple questions correctly', () => {
      expect(validator.containsMultipleQuestions('Single question?')).toBe(false)
      expect(validator.containsMultipleQuestions('First question? Second question?')).toBe(true)
      expect(validator.containsMultipleQuestions('Question with a) sub-question')).toBe(true)
    })

    it('should detect answer keys correctly', () => {
      expect(validator.containsAnswerKey('Regular question')).toBe(false)
      expect(validator.containsAnswerKey('Question text. Answer: A')).toBe(true)
      expect(validator.containsAnswerKey('Question text. Correct = B')).toBe(true)
      expect(validator.containsAnswerKey('Question text. A is correct')).toBe(true)
    })

    it('should detect formatting issues correctly', () => {
      expect(validator.hasFormattingIssues('Clean text')).toBe(false)
      expect(validator.hasFormattingIssues('Text  with   multiple    spaces')).toBe(true)
      expect(validator.hasFormattingIssues('Text\n\n\nwith multiple line breaks')).toBe(true)
    })
  })

  describe('Batch Validation', () => {
    it('should validate multiple questions', () => {
      const questions = [
        {
          queId: 'q1',
          queText: 'Good quality question with sufficient length',
          queType: 'mcq',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          confidence: 4.5
        },
        {
          queId: 'q2',
          queText: 'Short?',
          queType: 'mcq',
          options: ['A', 'B'],
          confidence: 2.0
        },
        {
          queId: 'q3',
          queText: 'Question with encoding â€™ issues',
          queType: 'mcq',
          options: ['Option A', '', 'Option C'],
          confidence: 1.5
        }
      ]

      const result = validateAIQuestionBatch(questions)
      
      expect(result.results).toHaveLength(3)
      expect(result.summary.totalQuestions).toBe(3)
      expect(result.summary.questionsNeedingReview).toBeGreaterThan(0)
      expect(result.summary.averageQualityScore).toBeLessThan(5)
      expect(result.summary.totalIssues).toBeGreaterThan(0)
      expect(result.summary.criticalIssues).toBeGreaterThan(0)
    })

    it('should handle empty question array', () => {
      const result = validateAIQuestionBatch([])
      
      expect(result.results).toHaveLength(0)
      expect(result.summary.totalQuestions).toBe(0)
      expect(result.summary.questionsNeedingReview).toBe(0)
      expect(result.summary.averageQualityScore).toBe(0)
    })

    it('should calculate correct summary statistics', () => {
      const questions = [
        {
          queId: 'q1',
          queText: 'High quality question',
          queType: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          confidence: 5.0
        },
        {
          queId: 'q2',
          queText: 'Medium quality question',
          queType: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          confidence: 3.0
        }
      ]

      const result = validateAIQuestionBatch(questions)
      
      expect(result.summary.averageQualityScore).toBe(4.5) // (5 + 4) / 2
      expect(result.summary.questionsNeedingReview).toBe(1) // Only the medium quality one
    })
  })

  describe('Edge Cases', () => {
    it('should handle questions without options for non-MCQ types', () => {
      const question = {
        queId: 'q1',
        queText: 'What is the numerical answer?',
        queType: 'nat',
        confidence: 4
        // No options - this is correct for NAT
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.issues.some(i => i.type === 'MISSING_OPTIONS')).toBe(false)
    })

    it('should handle questions with very high confidence', () => {
      const question = {
        queId: 'q1',
        queText: 'Perfect question with excellent extraction',
        queType: 'mcq',
        options: ['Perfect A', 'Perfect B', 'Perfect C', 'Perfect D'],
        confidence: 5.0
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.qualityScore).toBe(5)
      expect(result.needsReview).toBe(false)
    })

    it('should handle questions with special characters', () => {
      const question = {
        queId: 'q1',
        queText: 'Question with special chars: α, β, γ, δ and symbols ∑, ∏, ∫',
        queType: 'mcq',
        options: ['α option', 'β option', 'γ option', 'δ option'],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      expect(result.recommendations.some(r => r.type === 'MATH_NOTATION')).toBe(true)
    })

    it('should handle very long option text', () => {
      const question = {
        queId: 'q1',
        queText: 'Question with very long options',
        queType: 'mcq',
        options: [
          'This is a very long option that contains a lot of text and might be problematic for display purposes',
          'Another very long option with extensive text that could cause layout issues in the interface',
          'Short option',
          'Normal length option text'
        ],
        confidence: 4
      }

      const result = validator.validateExtractionQuality(question)
      // Should not flag long options as errors, just validate them normally
      expect(result.qualityScore).toBeGreaterThan(3)
    })
  })
})