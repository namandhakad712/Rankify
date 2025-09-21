/**
 * Unit Tests for Diagram Database Operations
 * 
 * This file contains comprehensive tests for the diagram detection database
 * functionality including coordinate storage, validation, and CRUD operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { 
  CoordinateMetadata, 
  DiagramCoordinates, 
  CBTPreset,
  PageImageData
} from '~/shared/types/diagram-detection'
import { DiagramDatabaseManager } from '../diagramDatabaseUtils'

// Mock the database
vi.mock('~/db', () => ({
  RankifyDB: vi.fn().mockImplementation(() => ({
    addDiagramCoordinates: vi.fn(),
    getDiagramCoordinates: vi.fn(),
    updateDiagramCoordinates: vi.fn(),
    deleteDiagramCoordinates: vi.fn(),
    getDiagramCoordinatesByPage: vi.fn(),
    bulkAddDiagramCoordinates: vi.fn(),
    addPageImage: vi.fn(),
    getPageImage: vi.fn(),
    getPageImagesByTestId: vi.fn(),
    deletePageImage: vi.fn(),
    deletePageImagesByTestId: vi.fn(),
    addCBTPreset: vi.fn(),
    getCBTPreset: vi.fn(),
    getCBTPresetsByExamType: vi.fn(),
    getAllCBTPresets: vi.fn(),
    updateCBTPreset: vi.fn(),
    deleteCBTPreset: vi.fn(),
    addDiagramCache: vi.fn(),
    getDiagramCache: vi.fn(),
    cleanupDiagramCache: vi.fn(),
    clearDiagramCache: vi.fn(),
    diagramCoordinates: {
      toArray: vi.fn(),
      where: vi.fn().mockReturnValue({
        startsWith: vi.fn().mockReturnValue({
          delete: vi.fn()
        })
      })
    },
    diagramCache: {
      where: vi.fn().mockReturnValue({
        startsWith: vi.fn().mockReturnValue({
          delete: vi.fn()
        })
      })
    },
    close: vi.fn()
  }))
}))

describe('DiagramDatabaseManager', () => {
  let dbManager: DiagramDatabaseManager
  let mockDb: any

  beforeEach(() => {
    dbManager = new DiagramDatabaseManager()
    mockDb = (dbManager as any).db
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Coordinate Storage', () => {
    it('should store diagram coordinates for a question', async () => {
      const questionId = 'test-question-1'
      const pageNumber = 1
      const diagrams: DiagramCoordinates[] = [
        {
          x1: 100,
          y1: 150,
          x2: 300,
          y2: 250,
          confidence: 0.95,
          type: 'graph',
          description: 'Mathematical graph'
        }
      ]
      const imageDimensions = { width: 800, height: 600 }

      mockDb.addDiagramCoordinates.mockResolvedValue(questionId)

      await dbManager.storeQuestionDiagrams(questionId, pageNumber, diagrams, imageDimensions)

      expect(mockDb.addDiagramCoordinates).toHaveBeenCalledWith(
        expect.objectContaining({
          questionId,
          pageNumber,
          originalImageDimensions: imageDimensions,
          diagrams: expect.arrayContaining([
            expect.objectContaining({
              coordinates: diagrams[0],
              type: 'graph',
              description: 'Mathematical graph',
              confidence: 0.95,
              modifiedBy: 'ai'
            })
          ])
        })
      )
    })

    it('should retrieve diagram coordinates for a question', async () => {
      const questionId = 'test-question-1'
      const mockMetadata: CoordinateMetadata = {
        questionId,
        pageNumber: 1,
        originalImageDimensions: { width: 800, height: 600 },
        diagrams: [
          {
            id: 'diagram-1',
            coordinates: {
              x1: 100,
              y1: 150,
              x2: 300,
              y2: 250,
              confidence: 0.95,
              type: 'graph',
              description: 'Test diagram'
            },
            type: 'graph',
            description: 'Test diagram',
            confidence: 0.95,
            lastModified: new Date(),
            modifiedBy: 'ai'
          }
        ]
      }

      mockDb.getDiagramCoordinates.mockResolvedValue(mockMetadata)

      const result = await dbManager.getQuestionDiagrams(questionId)

      expect(mockDb.getDiagramCoordinates).toHaveBeenCalledWith(questionId)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockMetadata.diagrams[0].coordinates)
    })

    it('should return empty array for question with no diagrams', async () => {
      const questionId = 'test-question-no-diagrams'
      mockDb.getDiagramCoordinates.mockResolvedValue(undefined)

      const result = await dbManager.getQuestionDiagrams(questionId)

      expect(result).toEqual([])
    })

    it('should update diagram coordinates after manual editing', async () => {
      const questionId = 'test-question-1'
      const diagramId = 'diagram-1'
      const newCoordinates: DiagramCoordinates = {
        x1: 120,
        y1: 170,
        x2: 320,
        y2: 270,
        confidence: 0.98,
        type: 'graph',
        description: 'Updated diagram'
      }

      const existingMetadata: CoordinateMetadata = {
        questionId,
        pageNumber: 1,
        originalImageDimensions: { width: 800, height: 600 },
        diagrams: [
          {
            id: diagramId,
            coordinates: {
              x1: 100,
              y1: 150,
              x2: 300,
              y2: 250,
              confidence: 0.95,
              type: 'graph',
              description: 'Original diagram'
            },
            type: 'graph',
            description: 'Original diagram',
            confidence: 0.95,
            lastModified: new Date(),
            modifiedBy: 'ai'
          }
        ]
      }

      mockDb.getDiagramCoordinates.mockResolvedValue(existingMetadata)
      mockDb.updateDiagramCoordinates.mockResolvedValue(undefined)

      await dbManager.updateDiagramCoordinates(questionId, diagramId, newCoordinates)

      expect(mockDb.updateDiagramCoordinates).toHaveBeenCalledWith(
        questionId,
        expect.objectContaining({
          diagrams: expect.arrayContaining([
            expect.objectContaining({
              id: diagramId,
              coordinates: newCoordinates,
              modifiedBy: 'user'
            })
          ])
        })
      )
    })

    it('should throw error when updating non-existent diagram', async () => {
      const questionId = 'test-question-1'
      const diagramId = 'non-existent-diagram'
      const newCoordinates: DiagramCoordinates = {
        x1: 120,
        y1: 170,
        x2: 320,
        y2: 270,
        confidence: 0.98,
        type: 'graph',
        description: 'Updated diagram'
      }

      mockDb.getDiagramCoordinates.mockResolvedValue(undefined)

      await expect(
        dbManager.updateDiagramCoordinates(questionId, diagramId, newCoordinates)
      ).rejects.toThrow('No diagram coordinates found for question test-question-1')
    })
  })

  describe('Page Image Storage', () => {
    it('should store page image with metadata', async () => {
      const testId = 'test-1'
      const pageNumber = 1
      const imageBlob = new Blob(['test image data'], { type: 'image/png' })
      const dimensions = { width: 800, height: 600 }
      const scale = 1.0

      const expectedId = `${testId}_page_${pageNumber}`
      mockDb.addPageImage.mockResolvedValue(expectedId)

      const result = await dbManager.storePageImage(testId, pageNumber, imageBlob, dimensions, scale)

      expect(mockDb.addPageImage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expectedId,
          pageNumber,
          testId,
          imageData: imageBlob,
          dimensions,
          scale,
          createdAt: expect.any(Date)
        })
      )
      expect(result).toBe(expectedId)
    })

    it('should retrieve page image for rendering', async () => {
      const testId = 'test-1'
      const pageNumber = 1
      const expectedId = `${testId}_page_${pageNumber}`
      
      const mockPageImage: PageImageData = {
        id: expectedId,
        pageNumber,
        testId,
        imageData: new Blob(['test image data'], { type: 'image/png' }),
        dimensions: { width: 800, height: 600 },
        scale: 1.0,
        createdAt: new Date()
      }

      mockDb.getPageImage.mockResolvedValue(mockPageImage)

      const result = await dbManager.getPageImage(testId, pageNumber)

      expect(mockDb.getPageImage).toHaveBeenCalledWith(expectedId)
      expect(result).toEqual(mockPageImage)
    })

    it('should return null for non-existent page image', async () => {
      const testId = 'test-1'
      const pageNumber = 999
      
      mockDb.getPageImage.mockResolvedValue(undefined)

      const result = await dbManager.getPageImage(testId, pageNumber)

      expect(result).toBeNull()
    })
  })

  describe('CBT Presets', () => {
    it('should store CBT preset', async () => {
      const preset: CBTPreset = {
        id: 'jee-test',
        name: 'JEE Test Preset',
        examType: 'JEE',
        sections: [
          {
            name: 'Physics',
            subjects: ['Physics'],
            questionCount: 30,
            timeAllocation: 3600
          }
        ],
        timeLimit: 10800,
        markingScheme: {
          correct: 4,
          incorrect: -1,
          unattempted: 0
        },
        questionDistribution: {
          totalQuestions: 30,
          sections: [
            { name: 'Physics', subjects: ['Physics'], questionCount: 30, timeAllocation: 3600 }
          ]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.addCBTPreset.mockResolvedValue(preset.id)

      const result = await dbManager.storeCBTPreset(preset)

      expect(mockDb.addCBTPreset).toHaveBeenCalledWith(preset)
      expect(result).toBe(preset.id)
    })

    it('should retrieve CBT presets by exam type', async () => {
      const examType = 'JEE'
      const mockPresets: CBTPreset[] = [
        {
          id: 'jee-1',
          name: 'JEE Main',
          examType: 'JEE',
          sections: [],
          timeLimit: 10800,
          markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
          questionDistribution: { totalQuestions: 90, sections: [] },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getCBTPresetsByExamType.mockResolvedValue(mockPresets)

      const result = await dbManager.getCBTPresets(examType)

      expect(mockDb.getCBTPresetsByExamType).toHaveBeenCalledWith(examType)
      expect(result).toEqual(mockPresets)
    })

    it('should retrieve all CBT presets when no exam type specified', async () => {
      const mockPresets: CBTPreset[] = [
        {
          id: 'jee-1',
          name: 'JEE Main',
          examType: 'JEE',
          sections: [],
          timeLimit: 10800,
          markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
          questionDistribution: { totalQuestions: 90, sections: [] },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'neet-1',
          name: 'NEET',
          examType: 'NEET',
          sections: [],
          timeLimit: 10800,
          markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
          questionDistribution: { totalQuestions: 200, sections: [] },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockDb.getAllCBTPresets.mockResolvedValue(mockPresets)

      const result = await dbManager.getCBTPresets()

      expect(mockDb.getAllCBTPresets).toHaveBeenCalled()
      expect(result).toEqual(mockPresets)
    })
  })

  describe('Bulk Operations', () => {
    it('should perform bulk storage of question diagrams', async () => {
      const questionsData = [
        {
          questionId: 'q1',
          pageNumber: 1,
          diagrams: [
            {
              x1: 100,
              y1: 150,
              x2: 300,
              y2: 250,
              confidence: 0.95,
              type: 'graph' as const,
              description: 'Graph 1'
            }
          ],
          imageDimensions: { width: 800, height: 600 }
        },
        {
          questionId: 'q2',
          pageNumber: 1,
          diagrams: [
            {
              x1: 400,
              y1: 150,
              x2: 600,
              y2: 250,
              confidence: 0.90,
              type: 'flowchart' as const,
              description: 'Flowchart 1'
            }
          ],
          imageDimensions: { width: 800, height: 600 }
        }
      ]

      mockDb.bulkAddDiagramCoordinates.mockResolvedValue(['q1', 'q2'])

      await dbManager.bulkStoreQuestionDiagrams(questionsData)

      expect(mockDb.bulkAddDiagramCoordinates).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            questionId: 'q1',
            pageNumber: 1
          }),
          expect.objectContaining({
            questionId: 'q2',
            pageNumber: 1
          })
        ])
      )
    })
  })

  describe('Statistics and Validation', () => {
    it('should calculate diagram statistics', async () => {
      const mockCoordinates: CoordinateMetadata[] = [
        {
          questionId: 'q1',
          pageNumber: 1,
          originalImageDimensions: { width: 800, height: 600 },
          diagrams: [
            {
              id: 'd1',
              coordinates: {
                x1: 100, y1: 150, x2: 300, y2: 250,
                confidence: 0.95, type: 'graph', description: 'Graph'
              },
              type: 'graph',
              description: 'Graph',
              confidence: 0.95,
              lastModified: new Date(),
              modifiedBy: 'ai'
            }
          ]
        },
        {
          questionId: 'q2',
          pageNumber: 2,
          originalImageDimensions: { width: 800, height: 600 },
          diagrams: [
            {
              id: 'd2',
              coordinates: {
                x1: 400, y1: 150, x2: 600, y2: 250,
                confidence: 0.85, type: 'flowchart', description: 'Flowchart'
              },
              type: 'flowchart',
              description: 'Flowchart',
              confidence: 0.85,
              lastModified: new Date(),
              modifiedBy: 'ai'
            }
          ]
        }
      ]

      mockDb.diagramCoordinates.toArray.mockResolvedValue(mockCoordinates)

      const stats = await dbManager.getDiagramStatistics()

      expect(stats).toEqual({
        totalQuestions: 2,
        questionsWithDiagrams: 2,
        totalDiagrams: 2,
        averageConfidence: 0.9,
        pagesCovered: 2
      })
    })

    it('should validate database integrity', async () => {
      const mockCoordinates: CoordinateMetadata[] = [
        {
          questionId: 'q1',
          pageNumber: 1,
          originalImageDimensions: { width: 800, height: 600 },
          diagrams: [
            {
              id: 'd1',
              coordinates: {
                x1: 100, y1: 150, x2: 300, y2: 250,
                confidence: 0.95, type: 'graph', description: 'Graph'
              },
              type: 'graph',
              description: 'Graph',
              confidence: 0.95,
              lastModified: new Date(),
              modifiedBy: 'ai'
            }
          ]
        }
      ]

      mockDb.diagramCoordinates.toArray.mockResolvedValue(mockCoordinates)
      mockDb.diagramCache.toArray = vi.fn().mockResolvedValue([])

      const validation = await dbManager.validateDatabaseIntegrity()

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Cache Management', () => {
    it('should cache diagram rendering data', async () => {
      const questionId = 'test-question'
      const coordinates: DiagramCoordinates[] = [
        {
          x1: 100, y1: 150, x2: 300, y2: 250,
          confidence: 0.95, type: 'graph', description: 'Test graph'
        }
      ]

      mockDb.addDiagramCache.mockResolvedValue('cache-key')

      await dbManager.cacheDiagramRendering(questionId, coordinates)

      expect(mockDb.addDiagramCache).toHaveBeenCalledWith(
        expect.objectContaining({
          questionId,
          coordinates,
          renderedAt: expect.any(Date),
          cacheKey: expect.any(String)
        })
      )
    })

    it('should clean up old cache entries', async () => {
      const daysOld = 7
      mockDb.cleanupDiagramCache.mockResolvedValue(undefined)

      await dbManager.cleanupOldCache(daysOld)

      expect(mockDb.cleanupDiagramCache).toHaveBeenCalledWith(expect.any(Date))
    })
  })
})