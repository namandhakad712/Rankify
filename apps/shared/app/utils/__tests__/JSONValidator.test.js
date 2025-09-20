/**
 * Unit tests for JSONValidator
 * Tests all validation scenarios and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { JSONValidator, validateAIExtractedJSON, validateAndFix } from '../JSONValidator.js'

describe('JSONValidator', () => {
  let validator

  beforeEach(() => {
    validator = new JSONValidator()
  })

  describe('Basic Structure Validation', () => {
    it('should validate valid JSON structure', () => {
      const validData = {
        testName: 'Sample Test',
        testSections: [{ name: 'Section 1' }],
        questions: [
          {
            queId: 'q1',
            queText: 'What is 2+2?',
            queType: 'mcq',
            options: ['2', '3', '4', '5'],
            queAnswer: 2
          }
        ]
      }

      const result = validator.validate(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject null or undefined data', () => {
      const result1 = validator.validate(null)
      const result2 = validator.validate(undefined)

      expect(result1.isValid).toBe(false)
      expect(result2.isValid).toBe(false)
      expect(result1.errors[0].type).toBe('INVALID_ROOT')
      expect(result2.errors[0].type).toBe('INVALID_ROOT')
    })

    it('should reject non-object data', () => {
      const result1 = validator.validate('string')
      const result2 = validator.validate(123)
      const result3 = validator.validate([])

      expect(result1.isValid).toBe(false)
      expect(result2.isValid).toBe(false)
      expect(result3.isValid).toBe(false)
    })

    it('should detect missing required properties', () => {
      const incompleteData = {
        testName: 'Test'
        // Missing testSections and questions
      }

      const result = validator.validate(incompleteData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'MISSING_PROPERTY')).toBe(true)
    })

    it('should detect empty data', () => {
      const result = validator.validate({})
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'EMPTY_DATA')).toBe(true)
    })
  })

  describe('Test Metadata Validation', () => {
    it('should validate test name', () => {
      const data = {
        testName: '',
        testSections: [],
        questions: []
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_TEST_NAME')).toBe(true)
    })

    it('should warn about very long test names', () => {
      const data = {
        testName: 'A'.repeat(250),
        testSections: [],
        questions: []
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'LONG_TEST_NAME')).toBe(true)
    })

    it('should validate test duration', () => {
      const data = {
        testName: 'Test',
        testDuration: 'invalid',
        testSections: [],
        questions: []
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_DURATION')).toBe(true)
    })

    it('should validate test sections array', () => {
      const data = {
        testName: 'Test',
        testSections: 'not an array',
        questions: []
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_SECTIONS')).toBe(true)
    })

    it('should warn about empty sections', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: []
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'NO_SECTIONS')).toBe(true)
    })
  })

  describe('Question Validation', () => {
    it('should validate questions array', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: 'not an array'
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_QUESTIONS')).toBe(true)
    })

    it('should detect empty questions array', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: []
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'NO_QUESTIONS')).toBe(true)
    })

    it('should validate individual question structure', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          null,
          'not an object',
          {}
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.filter(e => e.type === 'INVALID_QUESTION')).toHaveLength(2)
      expect(result.errors.filter(e => e.type === 'MISSING_QUESTION_PROPERTY')).toHaveLength(3) // 3 missing props for empty object
    })

    it('should validate required question properties', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            // Missing queId, queText, queType
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.filter(e => e.type === 'MISSING_QUESTION_PROPERTY')).toHaveLength(3)
    })

    it('should validate question ID format', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 123, // Should be string
            queText: 'Question',
            queType: 'mcq'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_QUESTION_ID')).toBe(true)
    })

    it('should validate question text', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: '', // Empty text
            queType: 'mcq'
          },
          {
            queId: 'q2',
            queText: 'Short', // Very short text
            queType: 'mcq'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_QUESTION_TEXT')).toBe(true)
      expect(result.warnings.some(w => w.type === 'SHORT_QUESTION_TEXT')).toBe(true)
    })

    it('should validate question type', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'invalid_type'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_QUESTION_TYPE')).toBe(true)
    })

    it('should detect duplicate question IDs', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question 1',
            queType: 'mcq'
          },
          {
            queId: 'q1', // Duplicate ID
            queText: 'Question 2',
            queType: 'mcq'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'DUPLICATE_QUESTION_ID')).toBe(true)
    })
  })

  describe('MCQ Question Validation', () => {
    it('should validate MCQ options', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MCQ Question',
            queType: 'mcq',
            options: 'not an array'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_MCQ_OPTIONS')).toBe(true)
    })

    it('should detect insufficient options', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MCQ Question',
            queType: 'mcq',
            options: ['Only one option']
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INSUFFICIENT_OPTIONS')).toBe(true)
    })

    it('should warn about too many options', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MCQ Question',
            queType: 'mcq',
            options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] // 8 options
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'TOO_MANY_OPTIONS')).toBe(true)
    })

    it('should validate individual options', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MCQ Question',
            queType: 'mcq',
            options: ['Valid option', '', null, 123]
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.filter(e => e.type === 'INVALID_OPTION')).toHaveLength(3)
    })

    it('should validate MCQ answer format', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MCQ Question',
            queType: 'mcq',
            options: ['A', 'B', 'C', 'D'],
            queAnswer: 'invalid' // Should be number
          },
          {
            queId: 'q2',
            queText: 'MCQ Question 2',
            queType: 'mcq',
            options: ['A', 'B'],
            queAnswer: 5 // Out of range
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.filter(e => e.type === 'INVALID_MCQ_ANSWER')).toHaveLength(2)
    })
  })

  describe('MSQ Question Validation', () => {
    it('should validate MSQ options', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MSQ Question',
            queType: 'msq',
            options: ['A', 'B'] // Insufficient for MSQ
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INSUFFICIENT_MSQ_OPTIONS')).toBe(true)
    })

    it('should validate MSQ answer format', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MSQ Question',
            queType: 'msq',
            options: ['A', 'B', 'C', 'D'],
            queAnswer: 'not an array'
          },
          {
            queId: 'q2',
            queText: 'MSQ Question 2',
            queType: 'msq',
            options: ['A', 'B', 'C'],
            queAnswer: [0, 5] // Index 5 out of range
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_MSQ_ANSWER')).toBe(true)
      expect(result.errors.some(e => e.type === 'INVALID_MSQ_ANSWER_INDEX')).toBe(true)
    })
  })

  describe('NAT Question Validation', () => {
    it('should warn about NAT questions with options', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'NAT Question',
            queType: 'nat',
            options: ['Should not have options']
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'NAT_HAS_OPTIONS')).toBe(true)
    })

    it('should validate NAT answer format', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'NAT Question',
            queType: 'nat',
            queAnswer: {} // Should be number or string
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_NAT_ANSWER')).toBe(true)
    })

    it('should validate answer range', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'NAT Question',
            queType: 'nat',
            answerRange: { min: 1 } // Missing max
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'INCOMPLETE_ANSWER_RANGE')).toBe(true)
    })
  })

  describe('MSM Question Validation', () => {
    it('should validate MSM columns', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MSM Question',
            queType: 'msm',
            leftColumn: 'not an array',
            rightColumn: ['B1', 'B2']
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_MSM_LEFT')).toBe(true)
    })

    it('should warn about column length mismatch', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'MSM Question',
            queType: 'msm',
            leftColumn: ['A1', 'A2'],
            rightColumn: ['B1', 'B2', 'B3'] // Different length
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'MSM_COLUMN_MISMATCH')).toBe(true)
    })
  })

  describe('Question Marks Validation', () => {
    it('should validate marks format', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'mcq',
            queMarks: 'not an object'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_MARKS_FORMAT')).toBe(true)
    })

    it('should validate correct and incorrect marks', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'mcq',
            queMarks: {
              cm: 'not a number',
              im: 'also not a number'
            }
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_CORRECT_MARKS')).toBe(true)
      expect(result.errors.some(e => e.type === 'INVALID_INCORRECT_MARKS')).toBe(true)
    })

    it('should warn about illogical marks', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'mcq',
            queMarks: {
              cm: 1,
              im: 2 // Incorrect marks higher than correct
            }
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'ILLOGICAL_MARKS')).toBe(true)
    })
  })

  describe('AI Metadata Validation', () => {
    it('should validate confidence scores', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'mcq',
            confidence: 6 // Out of range (1-5)
          },
          {
            queId: 'q2',
            queText: 'Question 2',
            queType: 'mcq',
            confidence: 'invalid'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.filter(e => e.type === 'INVALID_CONFIDENCE')).toHaveLength(2)
    })

    it('should validate diagram flags', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'mcq',
            hasDiagram: 'not a boolean'
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_DIAGRAM_FLAG')).toBe(true)
    })

    it('should validate extraction metadata', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [],
        extractionMetadata: 'not an object'
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'INVALID_EXTRACTION_METADATA')).toBe(true)
    })

    it('should validate extraction metadata fields', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [],
        extractionMetadata: {
          geminiModel: 123,
          processingTime: 'not a number',
          extractionDate: 'invalid date'
        }
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'INVALID_GEMINI_MODEL')).toBe(true)
      expect(result.warnings.some(w => w.type === 'INVALID_PROCESSING_TIME')).toBe(true)
      expect(result.warnings.some(w => w.type === 'INVALID_EXTRACTION_DATE')).toBe(true)
    })
  })

  describe('Legacy Compatibility Validation', () => {
    it('should check legacy compatibility', () => {
      const data = {
        // Missing testName
        testSections: [],
        questions: [
          {
            // Missing required fields for legacy
            queText: 'Question'
          }
        ]
      }

      const result = validator.validate(data, { checkLegacyCompatibility: true })
      expect(result.warnings.some(w => w.type === 'LEGACY_INCOMPATIBLE')).toBe(true)
      expect(result.warnings.some(w => w.type === 'LEGACY_QUESTION_INCOMPATIBLE')).toBe(true)
    })
  })

  describe('Schema Compliance Validation', () => {
    it('should validate schema version', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [],
        schemaVersion: '999.0' // Invalid version
      }

      const result = validator.validate(data)
      expect(result.warnings.some(w => w.type === 'INVALID_SCHEMA_VERSION')).toBe(true)
    })

    it('should validate required schema fields', () => {
      const data = {
        testName: 'Test',
        // Missing testSections and questions for schema
        schemaVersion: '1.0'
      }

      const result = validator.validate(data)
      expect(result.errors.some(e => e.type === 'SCHEMA_VIOLATION')).toBe(true)
    })
  })

  describe('Validation Summary', () => {
    it('should generate comprehensive validation summary', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'invalid_type',
            confidence: 6
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.summary).toBeDefined()
      expect(result.summary.totalErrors).toBeGreaterThan(0)
      expect(result.summary.totalWarnings).toBeGreaterThan(0)
    })

    it('should generate formatted report', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: []
      }

      const result = validator.validate(data)
      const report = validator.getFormattedReport()
      
      expect(report).toContain('JSON Validation Report')
      expect(report).toContain('Summary:')
      expect(report).toContain('Total Errors:')
    })
  })

  describe('Convenience Functions', () => {
    it('should work with validateAIExtractedJSON function', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: []
      }

      const result = validateAIExtractedJSON(data)
      expect(result).toBeDefined()
      expect(result.isValid).toBeDefined()
    })

    it('should work with validateAndFix function', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            // Missing queId
            queText: 'Question',
            queType: 'mcq'
          }
        ]
      }

      const result = validateAndFix(data)
      expect(result).toBeDefined()
      expect(result.fixedData).toBeDefined()
      expect(result.autoFixApplied).toBe(true)
      expect(result.fixedData.questions[0].queId).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle circular references gracefully', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: []
      }
      
      // Create circular reference
      data.self = data

      expect(() => {
        validator.validate(data)
      }).not.toThrow()
    })

    it('should handle very large datasets', () => {
      const data = {
        testName: 'Large Test',
        testSections: [],
        questions: Array.from({ length: 1000 }, (_, i) => ({
          queId: `q${i}`,
          queText: `Question ${i}`,
          queType: 'mcq',
          options: ['A', 'B', 'C', 'D']
        }))
      }

      const result = validator.validate(data)
      expect(result).toBeDefined()
      expect(result.isValid).toBe(true)
    })

    it('should handle deeply nested structures', () => {
      const data = {
        testName: 'Test',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question',
            queType: 'mcq',
            metadata: {
              level1: {
                level2: {
                  level3: {
                    deepValue: 'test'
                  }
                }
              }
            }
          }
        ]
      }

      expect(() => {
        validator.validate(data)
      }).not.toThrow()
    })

    it('should handle special characters and unicode', () => {
      const data = {
        testName: 'Test with émojis 🚀 and spëcial chars',
        testSections: [],
        questions: [
          {
            queId: 'q1',
            queText: 'Question with unicode: ∑∏∫√π∞≤≥≠±',
            queType: 'mcq',
            options: ['Opción A', 'Opção B', 'Вариант C', '选项 D']
          }
        ]
      }

      const result = validator.validate(data)
      expect(result.isValid).toBe(true)
    })
  })
})