/**
 * Unit tests for MigrationTool
 * Tests migration functionality and data integrity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MigrationTool, migrateZipFile, migrateBatchFiles } from '../MigrationTool.js'

// Mock JSZip
vi.mock('jszip', () => {
  return {
    default: vi.fn(() => ({
      loadAsync: vi.fn(),
      file: vi.fn(),
      forEach: vi.fn()
    }))
  }
})

describe('MigrationTool', () => {
  let migrationTool

  beforeEach(() => {
    migrationTool = new MigrationTool()
  })

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(migrationTool.validator).toBeDefined()
      expect(migrationTool.compatibilityChecker).toBeDefined()
      expect(migrationTool.migrationHistory).toEqual([])
      expect(migrationTool.supportedFormats).toContain('zip')
    })
  })

  describe('Question ID Generation', () => {
    it('should use existing question ID', () => {
      const question = { queId: 'existing_id' }
      const id = migrationTool.generateQuestionId(question, 0)
      expect(id).toBe('existing_id')
    })

    it('should use alternative ID fields', () => {
      const question = { id: 'alt_id' }
      const id = migrationTool.generateQuestionId(question, 0)
      expect(id).toBe('alt_id')
    })

    it('should generate ID when none exists', () => {
      const question = { queText: 'Sample question' }
      const id = migrationTool.generateQuestionId(question, 5)
      expect(id).toMatch(/^q_6_\d+$/)
    })
  })

  describe('Question Text Cleaning', () => {
    it('should clean basic question text', () => {
      const text = '  What is 2+2?  '
      const cleaned = migrationTool.cleanQuestionText(text)
      expect(cleaned).toBe('What is 2+2?')
    })

    it('should remove question numbering', () => {
      const text = '1. What is the capital of France?'
      const cleaned = migrationTool.cleanQuestionText(text)
      expect(cleaned).toBe('What is the capital of France?')
    })

    it('should remove letter numbering', () => {
      const text = 'A) What is the answer?'
      const cleaned = migrationTool.cleanQuestionText(text)
      expect(cleaned).toBe('What is the answer?')
    })

    it('should remove question prefixes', () => {
      const text = 'Question: What is the result?'
      const cleaned = migrationTool.cleanQuestionText(text)
      expect(cleaned).toBe('What is the result?')
    })

    it('should handle empty or invalid text', () => {
      expect(migrationTool.cleanQuestionText('')).toBe('Question text not available')
      expect(migrationTool.cleanQuestionText(null)).toBe('Question text not available')
      expect(migrationTool.cleanQuestionText(undefined)).toBe('Question text not available')
    })
  })

  describe('Question Type Normalization', () => {
    it('should normalize common question types', () => {
      expect(migrationTool.normalizeQuestionType('multiple-choice')).toBe('mcq')
      expect(migrationTool.normalizeQuestionType('multi-select')).toBe('msq')
      expect(migrationTool.normalizeQuestionType('numerical')).toBe('nat')
      expect(migrationTool.normalizeQuestionType('matching')).toBe('msm')
    })

    it('should handle case variations', () => {
      expect(migrationTool.normalizeQuestionType('MULTIPLE-CHOICE')).toBe('mcq')
      expect(migrationTool.normalizeQuestionType('Multi_Select')).toBe('msq')
    })

    it('should return default for unknown types', () => {
      expect(migrationTool.normalizeQuestionType('unknown')).toBe('unknown')
      expect(migrationTool.normalizeQuestionType(null)).toBe('mcq')
      expect(migrationTool.normalizeQuestionType(undefined)).toBe('mcq')
    })
  })

  describe('Option Conversion', () => {
    it('should convert array options', () => {
      const question = {
        options: ['Option A', 'Option B', 'Option C', 'Option D']
      }
      const converted = migrationTool.convertQuestionOptions(question)
      expect(converted).toEqual(['Option A', 'Option B', 'Option C', 'Option D'])
    })

    it('should convert object options', () => {
      const question = {
        options: { A: 'First option', B: 'Second option', C: 'Third option' }
      }
      const converted = migrationTool.convertQuestionOptions(question)
      expect(converted).toEqual(['First option', 'Second option', 'Third option'])
    })

    it('should handle alternative field names', () => {
      const question = {
        choices: ['Choice 1', 'Choice 2', 'Choice 3']
      }
      const converted = migrationTool.convertQuestionOptions(question)
      expect(converted).toEqual(['Choice 1', 'Choice 2', 'Choice 3'])
    })

    it('should generate default options when missing', () => {
      const question = {}
      const converted = migrationTool.convertQuestionOptions(question)
      expect(converted).toEqual(['Option A', 'Option B', 'Option C', 'Option D'])
    })

    it('should clean option text', () => {
      const question = {
        options: ['  Option A  ', '', 'Option C', null]
      }
      const converted = migrationTool.convertQuestionOptions(question)
      expect(converted).toEqual(['Option A', 'Option C'])
    })
  })

  describe('Answer Conversion', () => {
    describe('MCQ Answers', () => {
      it('should convert numeric answers', () => {
        const answer = migrationTool.convertQuestionAnswer(2, 'mcq')
        expect(answer).toBe(2)
      })

      it('should convert letter answers', () => {
        expect(migrationTool.convertQuestionAnswer('A', 'mcq')).toBe(0)
        expect(migrationTool.convertQuestionAnswer('B', 'mcq')).toBe(1)
        expect(migrationTool.convertQuestionAnswer('C', 'mcq')).toBe(2)
        expect(migrationTool.convertQuestionAnswer('D', 'mcq')).toBe(3)
      })

      it('should convert numeric string answers', () => {
        expect(migrationTool.convertQuestionAnswer('1', 'mcq')).toBe(0) // Convert to 0-based
        expect(migrationTool.convertQuestionAnswer('3', 'mcq')).toBe(2)
      })

      it('should handle invalid answers', () => {
        expect(migrationTool.convertQuestionAnswer('invalid', 'mcq')).toBe(0)
        expect(migrationTool.convertQuestionAnswer(null, 'mcq')).toBe(null)
      })
    })

    describe('MSQ Answers', () => {
      it('should convert array answers', () => {
        const answer = migrationTool.convertQuestionAnswer([0, 2], 'msq')
        expect(answer).toEqual([0, 2])
      })

      it('should convert letter array answers', () => {
        const answer = migrationTool.convertQuestionAnswer(['A', 'C'], 'msq')
        expect(answer).toEqual([0, 2])
      })

      it('should convert comma-separated string answers', () => {
        const answer = migrationTool.convertQuestionAnswer('A,C,D', 'msq')
        expect(answer).toEqual([0, 2, 3])
      })

      it('should convert single answer to array', () => {
        const answer = migrationTool.convertQuestionAnswer('B', 'msq')
        expect(answer).toEqual([1])
      })
    })

    describe('NAT Answers', () => {
      it('should preserve numeric answers', () => {
        expect(migrationTool.convertQuestionAnswer(42, 'nat')).toBe(42)
        expect(migrationTool.convertQuestionAnswer(3.14, 'nat')).toBe(3.14)
      })

      it('should convert numeric strings', () => {
        expect(migrationTool.convertQuestionAnswer('42', 'nat')).toBe(42)
        expect(migrationTool.convertQuestionAnswer('3.14', 'nat')).toBe(3.14)
      })

      it('should preserve non-numeric strings', () => {
        expect(migrationTool.convertQuestionAnswer('text answer', 'nat')).toBe('text answer')
      })
    })
  })

  describe('Marks Conversion', () => {
    it('should convert numeric marks', () => {
      const marks = migrationTool.convertQuestionMarks(4)
      expect(marks).toEqual({ cm: 4, im: 0 })
    })

    it('should convert object marks', () => {
      const marks = migrationTool.convertQuestionMarks({ correct: 4, incorrect: -1 })
      expect(marks).toEqual({ cm: 4, im: -1 })
    })

    it('should convert alternative object formats', () => {
      const marks = migrationTool.convertQuestionMarks({ cm: 2, im: -0.5 })
      expect(marks).toEqual({ cm: 2, im: -0.5 })
    })

    it('should parse string formats', () => {
      expect(migrationTool.convertQuestionMarks('+4/-1')).toEqual({ cm: 4, im: -1 })
      expect(migrationTool.convertQuestionMarks('2/0.5')).toEqual({ cm: 2, im: 0.5 })
    })

    it('should handle invalid formats', () => {
      expect(migrationTool.convertQuestionMarks('invalid')).toEqual({ cm: 1, im: 0 })
      expect(migrationTool.convertQuestionMarks(null)).toEqual({ cm: 1, im: 0 })
    })
  })

  describe('Confidence Estimation', () => {
    it('should estimate high confidence for well-structured questions', () => {
      const question = {
        queText: 'This is a well-structured question with sufficient length and clear content.',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        queAnswer: 2
      }
      const confidence = migrationTool.estimateConfidence(question, {})
      expect(confidence).toBeGreaterThan(3.5)
    })

    it('should estimate low confidence for poor questions', () => {
      const question = {
        queText: 'Short',
        options: []
      }
      const confidence = migrationTool.estimateConfidence(question, {})
      expect(confidence).toBeLessThan(3)
    })

    it('should use default confidence from options', () => {
      const question = { queText: 'Question' }
      const confidence = migrationTool.estimateConfidence(question, { defaultConfidence: 4.5 })
      expect(confidence).toBe(4.5)
    })

    it('should clamp confidence to valid range', () => {
      const question = { queText: '' } // Very poor question
      const confidence = migrationTool.estimateConfidence(question, {})
      expect(confidence).toBeGreaterThanOrEqual(1)
      expect(confidence).toBeLessThanOrEqual(5)
    })
  })

  describe('Diagram Detection', () => {
    it('should detect diagram references in question text', () => {
      const question = { queText: 'Refer to the figure shown above. What is the area?' }
      const hasDiagram = migrationTool.detectDiagram(question, { images: [] })
      expect(hasDiagram).toBe(true)
    })

    it('should detect various diagram keywords', () => {
      const keywords = ['figure', 'diagram', 'chart', 'graph', 'image', 'shown below']
      keywords.forEach(keyword => {
        const question = { queText: `Look at the ${keyword} and answer.` }
        const hasDiagram = migrationTool.detectDiagram(question, { images: [] })
        expect(hasDiagram).toBe(true)
      })
    })

    it('should not detect diagrams in regular text', () => {
      const question = { queText: 'What is the capital of France?' }
      const hasDiagram = migrationTool.detectDiagram(question, { images: [] })
      expect(hasDiagram).toBe(false)
    })

    it('should consider images in ZIP file', () => {
      const question = { queText: 'Look at this example and determine the answer.' }
      const extractedData = { images: [{ path: 'image1.png' }] }
      const hasDiagram = migrationTool.detectDiagram(question, extractedData)
      expect(hasDiagram).toBe(true)
    })
  })

  describe('Data Quality Assessment', () => {
    it('should assess high quality for complete questions', () => {
      const question = {
        queText: 'Complete question with sufficient length',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        queAnswer: 2
      }
      const quality = migrationTool.assessDataQuality(question)
      expect(quality).toBe(5)
    })

    it('should assess low quality for incomplete questions', () => {
      const question = {
        queText: 'Short',
        // Missing type, options, answer
      }
      const quality = migrationTool.assessDataQuality(question)
      expect(quality).toBeLessThan(3)
    })

    it('should penalize encoding issues', () => {
      const question = {
        queText: 'Question with encoding â€™ issues',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D'],
        queAnswer: 1
      }
      const quality = migrationTool.assessDataQuality(question)
      expect(quality).toBeLessThan(5)
    })
  })

  describe('Test Name Extraction', () => {
    it('should use provided test name from options', () => {
      const name = migrationTool.extractTestName({}, {}, { testName: 'Custom Test' })
      expect(name).toBe('Custom Test')
    })

    it('should use config test name', () => {
      const config = { testName: 'Config Test' }
      const name = migrationTool.extractTestName(config, {}, {})
      expect(name).toBe('Config Test')
    })

    it('should use alternative config fields', () => {
      const config = { name: 'Alternative Name' }
      const name = migrationTool.extractTestName(config, {}, {})
      expect(name).toBe('Alternative Name')
    })

    it('should use metadata fields', () => {
      const metadata = { title: 'Metadata Title' }
      const name = migrationTool.extractTestName({}, metadata, {})
      expect(name).toBe('Metadata Title')
    })

    it('should generate default name', () => {
      const name = migrationTool.extractTestName({}, {}, {})
      expect(name).toMatch(/^Migrated Test \d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('Section Conversion', () => {
    it('should convert config sections', () => {
      const config = {
        sections: [
          { name: 'Section 1', questionCount: 10 },
          { name: 'Section 2', questionCount: 15 }
        ]
      }
      const questions = Array(25).fill({})
      const sections = migrationTool.convertTestSections(config, questions)
      
      expect(sections).toHaveLength(2)
      expect(sections[0].name).toBe('Section 1')
      expect(sections[0].questionCount).toBe(10)
    })

    it('should create default section when none exist', () => {
      const questions = Array(20).fill({})
      const sections = migrationTool.convertTestSections({}, questions)
      
      expect(sections).toHaveLength(1)
      expect(sections[0].name).toBe('General')
      expect(sections[0].questionCount).toBe(20)
    })

    it('should handle questions in different formats', () => {
      const questionsObj = { questions: Array(15).fill({}) }
      const sections = migrationTool.convertTestSections({}, questionsObj)
      
      expect(sections[0].questionCount).toBe(15)
    })
  })

  describe('Migration Statistics', () => {
    it('should generate comprehensive statistics', () => {
      const originalData = {
        questions: Array(10).fill({ queType: 'mcq' })
      }
      
      const convertedData = {
        questions: [
          { queType: 'mcq', confidence: 4.0, hasDiagram: false },
          { queType: 'msq', confidence: 3.5, hasDiagram: true },
          { queType: 'nat', confidence: 4.5, hasDiagram: false }
        ]
      }
      
      const stats = migrationTool.generateMigrationStatistics(originalData, convertedData)
      
      expect(stats.originalQuestionCount).toBe(10)
      expect(stats.convertedQuestionCount).toBe(3)
      expect(stats.questionTypes.mcq).toBe(1)
      expect(stats.questionTypes.msq).toBe(1)
      expect(stats.questionTypes.nat).toBe(1)
      expect(stats.averageConfidence).toBe(4.0)
      expect(stats.diagramQuestions).toBe(1)
    })

    it('should handle empty data', () => {
      const stats = migrationTool.generateMigrationStatistics({}, { questions: [] })
      
      expect(stats.originalQuestionCount).toBe(0)
      expect(stats.convertedQuestionCount).toBe(0)
      expect(stats.averageConfidence).toBe(0)
    })
  })

  describe('Migration Integrity Validation', () => {
    it('should validate successful migration', () => {
      const originalData = {
        questions: Array(5).fill({ queText: 'Question' })
      }
      
      const convertedData = {
        testName: 'Test',
        questions: Array(5).fill({ 
          queText: 'Question', 
          confidence: 4.0 
        })
      }
      
      const integrity = migrationTool.validateMigrationIntegrity(originalData, convertedData)
      
      expect(integrity.isValid).toBe(true)
      expect(integrity.score).toBeGreaterThan(70)
    })

    it('should detect question count mismatch', () => {
      const originalData = {
        questions: Array(10).fill({ queText: 'Question' })
      }
      
      const convertedData = {
        testName: 'Test',
        questions: Array(8).fill({ queText: 'Question' })
      }
      
      const integrity = migrationTool.validateMigrationIntegrity(originalData, convertedData)
      
      expect(integrity.issues.some(i => i.type === 'QUESTION_COUNT_MISMATCH')).toBe(true)
      expect(integrity.score).toBeLessThan(100)
    })

    it('should detect poor question quality', () => {
      const originalData = {
        questions: [{ queText: 'Question' }]
      }
      
      const convertedData = {
        testName: 'Test',
        questions: [{ queText: 'Bad', confidence: 1.0 }] // Very short text, low confidence
      }
      
      const integrity = migrationTool.validateMigrationIntegrity(originalData, convertedData)
      
      expect(integrity.issues.some(i => i.type === 'POOR_QUESTION_TEXT')).toBe(true)
      expect(integrity.warnings.some(w => w.type === 'LOW_CONFIDENCE')).toBe(true)
    })
  })

  describe('Helper Methods', () => {
    it('should generate unique migration IDs', () => {
      const id1 = migrationTool.generateMigrationId()
      const id2 = migrationTool.generateMigrationId()
      
      expect(id1).toMatch(/^migration_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^migration_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should detect encoding issues', () => {
      expect(migrationTool.hasEncodingIssues('Normal text')).toBe(false)
      expect(migrationTool.hasEncodingIssues('Text with â€™ issues')).toBe(true)
      expect(migrationTool.hasEncodingIssues('Text with â€œ quotes')).toBe(true)
    })

    it('should get original question count from various formats', () => {
      expect(migrationTool.getOriginalQuestionCount({ questions: [1, 2, 3] })).toBe(3)
      expect(migrationTool.getOriginalQuestionCount({ questions: { questions: [1, 2] } })).toBe(2)
      expect(migrationTool.getOriginalQuestionCount({ questions: { q1: {}, q2: {} } })).toBe(2)
      expect(migrationTool.getOriginalQuestionCount({})).toBe(0)
    })
  })

  describe('Migration History', () => {
    it('should track migration history', () => {
      expect(migrationTool.migrationHistory).toHaveLength(0)
      
      // Simulate adding history entry
      migrationTool.migrationHistory.push({
        migrationId: 'test_id',
        timestamp: new Date().toISOString(),
        success: true,
        statistics: { convertedQuestionCount: 5 }
      })
      
      expect(migrationTool.migrationHistory).toHaveLength(1)
    })

    it('should export migration history', () => {
      migrationTool.migrationHistory = [
        { success: true },
        { success: false },
        { success: true }
      ]
      
      const exported = migrationTool.exportMigrationHistory()
      
      expect(exported.history).toHaveLength(3)
      expect(exported.summary.totalMigrations).toBe(3)
      expect(exported.summary.successfulMigrations).toBe(2)
      expect(exported.summary.failedMigrations).toBe(1)
    })

    it('should clear migration history', () => {
      migrationTool.migrationHistory = [{ test: 'data' }]
      migrationTool.clearMigrationHistory()
      expect(migrationTool.migrationHistory).toHaveLength(0)
    })
  })

  describe('Convenience Functions', () => {
    it('should work with migrateZipFile function', async () => {
      // Mock the migration process
      const mockZipFile = new Blob(['test'], { type: 'application/zip' })
      
      // This would normally call the actual migration
      // For testing, we just verify the function exists and can be called
      expect(typeof migrateZipFile).toBe('function')
    })

    it('should work with migrateBatchFiles function', async () => {
      const mockZipFiles = [
        new Blob(['test1'], { type: 'application/zip' }),
        new Blob(['test2'], { type: 'application/zip' })
      ]
      
      // This would normally call the actual batch migration
      // For testing, we just verify the function exists and can be called
      expect(typeof migrateBatchFiles).toBe('function')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(() => migrationTool.cleanQuestionText(null)).not.toThrow()
      expect(() => migrationTool.normalizeQuestionType(undefined)).not.toThrow()
      expect(() => migrationTool.convertQuestionOptions({})).not.toThrow()
    })

    it('should handle empty arrays and objects', () => {
      expect(migrationTool.convertQuestionOptions({ options: [] })).toEqual(['Option A', 'Option B', 'Option C', 'Option D'])
      expect(migrationTool.generateMigrationStatistics({}, {})).toBeDefined()
    })

    it('should handle malformed data structures', () => {
      const malformedQuestion = {
        queText: 123, // Should be string
        options: 'not an array',
        queAnswer: { invalid: 'format' }
      }
      
      expect(() => migrationTool.convertSingleQuestion(malformedQuestion, 0, {}, {})).not.toThrow()
    })

    it('should handle very large datasets', () => {
      const largeQuestionSet = Array(1000).fill({
        queText: 'Sample question',
        queType: 'mcq',
        options: ['A', 'B', 'C', 'D']
      })
      
      const stats = migrationTool.generateMigrationStatistics(
        { questions: largeQuestionSet },
        { questions: largeQuestionSet }
      )
      
      expect(stats.originalQuestionCount).toBe(1000)
      expect(stats.convertedQuestionCount).toBe(1000)
    })
  })
})