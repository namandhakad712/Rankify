/**
 * Coordinate Integration Tests
 * Tests for the integration between coordinate-based diagrams and existing CBT interface
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createCompatibilityManager, shouldUseCoordinateRendering } from '~/utils/cbtCompatibility'
import type { CoordinateMetadata, EnhancedTestInterfaceJsonOutput } from '~/shared/types/diagram-detection'

// Mock data
const mockLegacyTestData: TestInterfaceJsonOutput = {
  testData: {
    'Physics': {
      'Mechanics': {
        '1': {
          type: 'mcq',
          answerOptions: '4',
          imgUrls: ['physics_1_image.jpg'],
          correctAnswer: 'A'
        },
        '2': {
          type: 'nat',
          answerOptions: '1',
          imgUrls: ['physics_2_image.jpg'],
          correctAnswer: '42'
        }
      }
    },
    'Chemistry': {
      'Organic': {
        '1': {
          type: 'msq',
          answerOptions: '4',
          imgUrls: ['chemistry_1_image.jpg'],
          correctAnswer: ['A', 'C']
        }
      }
    }
  },
  testConfig: {
    testName: 'Sample Test',
    timeLimit: 180,
    sections: ['Physics', 'Chemistry']
  }
}

const mockCoordinateData: CoordinateMetadata[] = [
  {
    questionId: 'Physics_Mechanics_1',
    pageNumber: 1,
    originalImageDimensions: { width: 800, height: 600 },
    diagrams: [
      {
        id: 'diagram_1',
        coordinates: {
          x1: 100,
          y1: 150,
          x2: 300,
          y2: 250,
          confidence: 0.85,
          type: 'graph',
          description: 'Velocity-time graph'
        },
        type: 'graph',
        description: 'Velocity-time graph',
        confidence: 0.85,
        lastModified: new Date(),
        modifiedBy: 'ai'
      }
    ]
  },
  {
    questionId: 'Chemistry_Organic_1',
    pageNumber: 2,
    originalImageDimensions: { width: 800, height: 600 },
    diagrams: [
      {
        id: 'diagram_2',
        coordinates: {
          x1: 50,
          y1: 100,
          x2: 400,
          y2: 300,
          confidence: 0.92,
          type: 'scientific',
          description: 'Molecular structure'
        },
        type: 'scientific',
        description: 'Molecular structure',
        confidence: 0.92,
        lastModified: new Date(),
        modifiedBy: 'ai'
      }
    ]
  }
]

describe('CBTCompatibilityManager', () => {
  let compatibilityManager: ReturnType<typeof createCompatibilityManager>

  beforeEach(() => {
    compatibilityManager = createCompatibilityManager({
      enableCoordinateRendering: true,
      fallbackToLegacy: true,
      preserveLegacyData: true,
      validateCompatibility: true
    })
  })

  test('should check compatibility correctly', () => {
    const result = compatibilityManager.checkCompatibility(mockLegacyTestData, mockCoordinateData)

    expect(result.isCompatible).toBe(true)
    expect(result.hasCoordinateData).toBe(true)
    expect(result.hasLegacyData).toBe(true)
    expect(result.migrationRequired).toBe(false)
    expect(result.warnings).toHaveLength(1) // Mixed data warning
  })

  test('should detect missing legacy data', () => {
    const emptyLegacyData = { testData: {}, testConfig: {} } as TestInterfaceJsonOutput
    const result = compatibilityManager.checkCompatibility(emptyLegacyData, mockCoordinateData)

    expect(result.isCompatible).toBe(false)
    expect(result.errors).toContain('No legacy test data found')
  })

  test('should merge legacy and coordinate data correctly', () => {
    const enhanced = compatibilityManager.mergeTestData(mockLegacyTestData, mockCoordinateData)

    expect(enhanced.testData.Physics.Mechanics['1'].hasDiagram).toBe(true)
    expect(enhanced.testData.Physics.Mechanics['1'].diagrams).toHaveLength(1)
    expect(enhanced.testData.Physics.Mechanics['2'].hasDiagram).toBe(false)
    expect(enhanced.testConfig.coordinateBasedRendering).toBe(true)
    expect(enhanced.diagramCoordinates).toEqual(mockCoordinateData)
  })

  test('should extract legacy data from enhanced format', () => {
    const enhanced = compatibilityManager.mergeTestData(mockLegacyTestData, mockCoordinateData)
    const extracted = compatibilityManager.extractLegacyData(enhanced)

    expect(extracted.testData.Physics.Mechanics['1']).not.toHaveProperty('diagrams')
    expect(extracted.testData.Physics.Mechanics['1']).not.toHaveProperty('hasDiagram')
    expect(extracted.testConfig).not.toHaveProperty('coordinateBasedRendering')
  })

  test('should validate question compatibility', () => {
    const questionData = mockLegacyTestData.testData.Physics.Mechanics['1']
    const coordinateData = mockCoordinateData[0]

    const validation = compatibilityManager.validateQuestionCompatibility(
      'Physics_Mechanics_1',
      questionData,
      coordinateData
    )

    expect(validation.isCompatible).toBe(true)
    expect(validation.canRenderCoordinates).toBe(true)
    expect(validation.shouldFallback).toBe(false)
    expect(validation.issues).toHaveLength(0)
  })

  test('should detect low confidence diagrams', () => {
    const lowConfidenceCoordinate: CoordinateMetadata = {
      ...mockCoordinateData[0],
      diagrams: [{
        ...mockCoordinateData[0].diagrams[0],
        confidence: 0.2,
        coordinates: {
          ...mockCoordinateData[0].diagrams[0].coordinates,
          confidence: 0.2
        }
      }]
    }

    const questionData = mockLegacyTestData.testData.Physics.Mechanics['1']
    const validation = compatibilityManager.validateQuestionCompatibility(
      'Physics_Mechanics_1',
      questionData,
      lowConfidenceCoordinate
    )

    expect(validation.shouldFallback).toBe(true)
    expect(validation.issues).toContain('Low confidence diagram detected (20%)')
  })

  test('should generate comprehensive compatibility report', () => {
    const report = compatibilityManager.generateCompatibilityReport(mockLegacyTestData, mockCoordinateData)

    expect(report.summary.totalQuestions).toBe(3)
    expect(report.summary.coordinateQuestions).toBe(2)
    expect(report.summary.compatibleQuestions).toBe(2)
    expect(report.details).toHaveLength(3)
    
    const physicsQuestion = report.details.find(d => d.questionId === 'Physics_Mechanics_1')
    expect(physicsQuestion?.status).toBe('compatible')
  })

  test('should auto-fix coordinate issues', () => {
    const invalidCoordinateData: CoordinateMetadata[] = [{
      questionId: 'test_question',
      pageNumber: 1,
      originalImageDimensions: { width: 800, height: 600 },
      diagrams: [{
        id: 'invalid_diagram',
        coordinates: {
          x1: -10, // Invalid: negative
          y1: -5,  // Invalid: negative
          x2: 900, // Invalid: exceeds width
          y2: 700, // Invalid: exceeds height
          confidence: 0.8,
          type: 'graph',
          description: 'Invalid coordinates'
        },
        type: 'graph',
        description: 'Invalid coordinates',
        confidence: 0.8,
        lastModified: new Date(),
        modifiedBy: 'ai'
      }]
    }]

    const { fixed, issues } = compatibilityManager.autoFixCompatibilityIssues(invalidCoordinateData)

    expect(fixed[0].diagrams[0].coordinates.x1).toBe(0)
    expect(fixed[0].diagrams[0].coordinates.y1).toBe(0)
    expect(fixed[0].diagrams[0].coordinates.x2).toBe(800)
    expect(fixed[0].diagrams[0].coordinates.y2).toBe(600)
    expect(issues).toHaveLength(4) // Four fixes applied
  })
})

describe('Coordinate Rendering Decision', () => {
  test('should use coordinate rendering for valid data', () => {
    const shouldRender = shouldUseCoordinateRendering(
      null,
      mockCoordinateData[0],
      { enableCoordinateRendering: true }
    )

    expect(shouldRender).toBe(true)
  })

  test('should fallback to legacy for low confidence', () => {
    const lowConfidenceData = {
      ...mockCoordinateData[0],
      diagrams: [{
        ...mockCoordinateData[0].diagrams[0],
        confidence: 0.2
      }]
    }

    const shouldRender = shouldUseCoordinateRendering(
      null,
      lowConfidenceData,
      { enableCoordinateRendering: true, fallbackToLegacy: true }
    )

    expect(shouldRender).toBe(false)
  })

  test('should respect disabled coordinate rendering', () => {
    const shouldRender = shouldUseCoordinateRendering(
      null,
      mockCoordinateData[0],
      { enableCoordinateRendering: false }
    )

    expect(shouldRender).toBe(false)
  })
})

describe('Enhanced Test Data Integration', () => {
  test('should create enhanced test data structure', () => {
    const compatibilityManager = createCompatibilityManager()
    const enhanced = compatibilityManager.mergeTestData(mockLegacyTestData, mockCoordinateData)

    // Check structure
    expect(enhanced).toHaveProperty('testData')
    expect(enhanced).toHaveProperty('testConfig')
    expect(enhanced).toHaveProperty('diagramCoordinates')

    // Check enhanced question data
    const physicsQuestion = enhanced.testData.Physics.Mechanics['1']
    expect(physicsQuestion).toHaveProperty('diagrams')
    expect(physicsQuestion).toHaveProperty('hasDiagram')
    expect(physicsQuestion.hasDiagram).toBe(true)
    expect(physicsQuestion.diagrams).toHaveLength(1)

    // Check enhanced config
    expect(enhanced.testConfig.coordinateBasedRendering).toBe(true)
    expect(enhanced.testConfig.diagramDetectionEnabled).toBe(true)
  })

  test('should handle questions without coordinates', () => {
    const compatibilityManager = createCompatibilityManager()
    const enhanced = compatibilityManager.mergeTestData(mockLegacyTestData, mockCoordinateData)

    const questionWithoutCoords = enhanced.testData.Physics.Mechanics['2']
    expect(questionWithoutCoords.hasDiagram).toBe(false)
    expect(questionWithoutCoords.diagrams).toHaveLength(0)
  })

  test('should preserve all legacy data', () => {
    const compatibilityManager = createCompatibilityManager()
    const enhanced = compatibilityManager.mergeTestData(mockLegacyTestData, mockCoordinateData)

    // Check that all original properties are preserved
    const originalQuestion = mockLegacyTestData.testData.Physics.Mechanics['1']
    const enhancedQuestion = enhanced.testData.Physics.Mechanics['1']

    expect(enhancedQuestion.type).toBe(originalQuestion.type)
    expect(enhancedQuestion.answerOptions).toBe(originalQuestion.answerOptions)
    expect(enhancedQuestion.imgUrls).toEqual(originalQuestion.imgUrls)
    expect(enhancedQuestion.correctAnswer).toBe(originalQuestion.correctAnswer)
  })
})

describe('Error Handling and Fallbacks', () => {
  test('should handle missing coordinate data gracefully', () => {
    const compatibilityManager = createCompatibilityManager({
      fallbackToLegacy: true
    })

    const result = compatibilityManager.checkCompatibility(mockLegacyTestData, [])
    expect(result.isCompatible).toBe(true)
    expect(result.migrationRequired).toBe(true)
  })

  test('should handle corrupted coordinate data', () => {
    const corruptedData: CoordinateMetadata[] = [{
      questionId: 'corrupt_question',
      pageNumber: 1,
      originalImageDimensions: { width: 0, height: 0 }, // Invalid dimensions
      diagrams: []
    }]

    const compatibilityManager = createCompatibilityManager()
    const result = compatibilityManager.checkCompatibility(mockLegacyTestData, corruptedData)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.isCompatible).toBe(false)
  })

  test('should provide fallback question data', () => {
    const compatibilityManager = createCompatibilityManager({
      fallbackToLegacy: true
    })

    const questionData = mockLegacyTestData.testData.Physics.Mechanics['1']
    const fallbackData = compatibilityManager.createFallbackQuestionData(questionData)

    expect(fallbackData).toHaveProperty('fallbackMode')
    expect(fallbackData.fallbackMode).toBe(false)
  })
})

describe('Performance and Caching', () => {
  test('should handle large datasets efficiently', () => {
    // Create a large dataset
    const largeCoordinateData: CoordinateMetadata[] = []
    for (let i = 0; i < 1000; i++) {
      largeCoordinateData.push({
        questionId: `question_${i}`,
        pageNumber: i,
        originalImageDimensions: { width: 800, height: 600 },
        diagrams: [{
          id: `diagram_${i}`,
          coordinates: {
            x1: 100,
            y1: 100,
            x2: 200,
            y2: 200,
            confidence: 0.8,
            type: 'graph',
            description: `Diagram ${i}`
          },
          type: 'graph',
          description: `Diagram ${i}`,
          confidence: 0.8,
          lastModified: new Date(),
          modifiedBy: 'ai'
        }]
      })
    }

    const compatibilityManager = createCompatibilityManager()
    const startTime = performance.now()
    
    const { fixed } = compatibilityManager.autoFixCompatibilityIssues(largeCoordinateData)
    
    const endTime = performance.now()
    const processingTime = endTime - startTime

    expect(fixed).toHaveLength(1000)
    expect(processingTime).toBeLessThan(1000) // Should process in under 1 second
  })

  test('should validate coordinates efficiently', () => {
    const compatibilityManager = createCompatibilityManager()
    
    const startTime = performance.now()
    const result = compatibilityManager.checkCompatibility(mockLegacyTestData, mockCoordinateData)
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(100) // Should validate quickly
    expect(result.isCompatible).toBe(true)
  })
})

describe('Integration Edge Cases', () => {
  test('should handle mixed question types', () => {
    const mixedTestData = {
      ...mockLegacyTestData,
      testData: {
        ...mockLegacyTestData.testData,
        'Mixed': {
          'Section1': {
            '1': { type: 'mcq', answerOptions: '4', imgUrls: ['img1.jpg'] },
            '2': { type: 'nat', answerOptions: '1', imgUrls: [] }, // No images
            '3': { type: 'msq', answerOptions: '4' } // No imgUrls property
          }
        }
      }
    }

    const compatibilityManager = createCompatibilityManager()
    const enhanced = compatibilityManager.mergeTestData(mixedTestData, mockCoordinateData)

    expect(enhanced.testData.Mixed.Section1['1']).toBeDefined()
    expect(enhanced.testData.Mixed.Section1['2']).toBeDefined()
    expect(enhanced.testData.Mixed.Section1['3']).toBeDefined()
  })

  test('should handle empty test data', () => {
    const emptyTestData: TestInterfaceJsonOutput = {
      testData: {},
      testConfig: { testName: 'Empty Test', timeLimit: 0, sections: [] }
    }

    const compatibilityManager = createCompatibilityManager()
    const result = compatibilityManager.checkCompatibility(emptyTestData, [])

    expect(result.isCompatible).toBe(false)
    expect(result.errors).toContain('No legacy test data found')
  })

  test('should handle coordinate data without corresponding questions', () => {
    const orphanCoordinateData: CoordinateMetadata[] = [{
      questionId: 'nonexistent_question',
      pageNumber: 1,
      originalImageDimensions: { width: 800, height: 600 },
      diagrams: [{
        id: 'orphan_diagram',
        coordinates: {
          x1: 100, y1: 100, x2: 200, y2: 200,
          confidence: 0.8, type: 'graph', description: 'Orphan diagram'
        },
        type: 'graph',
        description: 'Orphan diagram',
        confidence: 0.8,
        lastModified: new Date(),
        modifiedBy: 'ai'
      }]
    }]

    const compatibilityManager = createCompatibilityManager()
    const enhanced = compatibilityManager.mergeTestData(mockLegacyTestData, orphanCoordinateData)

    // Should not crash and should include orphan data
    expect(enhanced.diagramCoordinates).toEqual(orphanCoordinateData)
  })
})