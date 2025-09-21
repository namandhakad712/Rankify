/**
 * Unit Tests for Coordinate Validator
 * 
 * This file contains comprehensive tests for coordinate validation,
 * sanitization, and transformation utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { 
  DiagramCoordinates, 
  ImageDimensions,
  CoordinateTransform,
  ViewportCoordinates
} from '~/shared/types/diagram-detection'
import { CoordinateValidator, coordinateUtils } from '../coordinateValidator'

describe('CoordinateValidator', () => {
  let validator: CoordinateValidator
  let imageDimensions: ImageDimensions

  beforeEach(() => {
    validator = new CoordinateValidator()
    imageDimensions = { width: 800, height: 600 }
  })

  describe('Basic Validation', () => {
    it('should validate correct coordinates', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 150,
        x2: 300,
        y2: 250,
        confidence: 0.95,
        type: 'graph',
        description: 'Test diagram'
      }

      const result = validator.validateCoordinates(coords, imageDimensions)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedCoordinates).toBeDefined()
    })

    it('should reject coordinates with invalid numbers', () => {
      const coords: DiagramCoordinates = {
        x1: NaN,
        y1: 150,
        x2: 300,
        y2: 250,
        confidence: 0.95,
        type: 'graph',
        description: 'Test diagram'
      }

      const result = validator.validateCoordinates(coords, imageDimensions)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Coordinates must be valid numbers')
    })

    it('should reject coordinates with wrong order', () => {
      const coords: DiagramCoordinates = {
        x1: 300,
        y1: 250,
        x2: 100, // x2 < x1
        y2: 150, // y2 < y1
        confidence: 0.95,
        type: 'graph',
        description: 'Test diagram'
      }

      const result = validator.validateCoordinates(coords, imageDimensions)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('x2 must be greater than x1')
      expect(result.errors).toContain('y2 must be greater than y1')
    })

    it('should reject coordinates outside image boundaries', () => {
      const coords: DiagramCoordinates = {
        x1: -10,
        y1: -5,
        x2: 900, // Beyond image width
        y2: 700, // Beyond image height
        confidence: 0.95,
        type: 'graph',
        description: 'Test diagram'
      }

      const result = validator.validateCoordinates(coords, imageDimensions)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Coordinates are outside image boundaries')
    })

    it('should reject coordinates that are too small', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 150,
        x2: 105, // Only 5px wide
        y2: 155, // Only 5px tall
        confidence: 0.95,
        type: 'graph',
        description: 'Test diagram'
      }

      const result = validator.validateCoordinates(coords, imageDimensions)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Diagram must be at least 10px in width and height')
    })

    it('should reject invalid confidence values', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 150,
        x2: 300,
        y2: 250,
        confidence: 1.5, // > 1.0
        type: 'graph',
        description: 'Test diagram'
      }

      const result = validator.validateCoordinates(coords, imageDimensions)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Confidence must be between 0 and 1')
    })
  })

  describe('Bounds Validation', () => {
    it('should validate coordinates within bounds', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const isValid = validator.validateBounds(coords, imageDimensions)
      expect(isValid).toBe(true)
    })

    it('should reject coordinates outside bounds', () => {
      const coords: DiagramCoordinates = {
        x1: 700, y1: 500, x2: 900, y2: 700, // Beyond boundaries
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const isValid = validator.validateBounds(coords, imageDimensions)
      expect(isValid).toBe(false)
    })

    it('should reject negative coordinates', () => {
      const coords: DiagramCoordinates = {
        x1: -10, y1: -5, x2: 100, y2: 150,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const isValid = validator.validateBounds(coords, imageDimensions)
      expect(isValid).toBe(false)
    })
  })

  describe('Coordinate Sanitization', () => {
    it('should sanitize coordinates by rounding and clamping', () => {
      const coords: DiagramCoordinates = {
        x1: 99.7,
        y1: 149.3,
        x2: 300.8,
        y2: 250.2,
        confidence: 1.2, // > 1.0
        type: 'graph',
        description: 'Test diagram'
      }

      const sanitized = validator.sanitizeCoordinates(coords, imageDimensions)
      
      expect(sanitized.x1).toBe(99) // Floored
      expect(sanitized.y1).toBe(149) // Floored
      expect(sanitized.x2).toBe(301) // Ceiled
      expect(sanitized.y2).toBe(251) // Ceiled
      expect(sanitized.confidence).toBe(1.0) // Clamped to 1.0
    })

    it('should clamp coordinates to image boundaries', () => {
      const coords: DiagramCoordinates = {
        x1: -10,
        y1: -5,
        x2: 900,
        y2: 700,
        confidence: 0.95,
        type: 'graph',
        description: 'Test diagram'
      }

      const sanitized = validator.sanitizeCoordinates(coords, imageDimensions)
      
      expect(sanitized.x1).toBe(0) // Clamped to 0
      expect(sanitized.y1).toBe(0) // Clamped to 0
      expect(sanitized.x2).toBe(800) // Clamped to width
      expect(sanitized.y2).toBe(600) // Clamped to height
    })

    it('should ensure proper coordinate ordering', () => {
      const coords: DiagramCoordinates = {
        x1: 300,
        y1: 250,
        x2: 100, // Wrong order
        y2: 150, // Wrong order
        confidence: 0.95,
        type: 'graph',
        description: 'Test diagram'
      }

      const sanitized = validator.sanitizeCoordinates(coords)
      
      expect(sanitized.x2).toBeGreaterThan(sanitized.x1)
      expect(sanitized.y2).toBeGreaterThan(sanitized.y1)
    })
  })

  describe('Coordinate Transformations', () => {
    it('should transform coordinates with scale and offset', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const transform: CoordinateTransform = {
        scaleX: 2.0,
        scaleY: 1.5,
        offsetX: 50,
        offsetY: 25
      }

      const transformed = validator.transformCoordinates(coords, transform)
      
      expect(transformed.x1).toBe(250) // (100 * 2.0) + 50
      expect(transformed.y1).toBe(250) // (150 * 1.5) + 25
      expect(transformed.x2).toBe(650) // (300 * 2.0) + 50
      expect(transformed.y2).toBe(400) // (250 * 1.5) + 25
    })

    it('should convert to viewport coordinates', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const viewport = validator.toViewportCoordinates(coords)
      
      expect(viewport.x).toBe(100)
      expect(viewport.y).toBe(150)
      expect(viewport.width).toBe(200) // 300 - 100
      expect(viewport.height).toBe(100) // 250 - 150
    })

    it('should convert from viewport coordinates', () => {
      const viewport: ViewportCoordinates = {
        x: 100,
        y: 150,
        width: 200,
        height: 100
      }

      const originalCoords: DiagramCoordinates = {
        x1: 0, y1: 0, x2: 0, y2: 0,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const coords = validator.fromViewportCoordinates(viewport, originalCoords)
      
      expect(coords.x1).toBe(100)
      expect(coords.y1).toBe(150)
      expect(coords.x2).toBe(300) // 100 + 200
      expect(coords.y2).toBe(250) // 150 + 100
    })
  })

  describe('Coordinate Analysis', () => {
    it('should calculate area correctly', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const area = validator.calculateArea(coords)
      expect(area).toBe(20000) // (300-100) * (250-150) = 200 * 100
    })

    it('should detect overlapping coordinates', () => {
      const coords1: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test 1'
      }

      const coords2: DiagramCoordinates = {
        x1: 200, y1: 200, x2: 400, y2: 350,
        confidence: 0.95, type: 'graph', description: 'Test 2'
      }

      const overlaps = validator.doCoordinatesOverlap(coords1, coords2)
      expect(overlaps).toBe(true)
    })

    it('should detect non-overlapping coordinates', () => {
      const coords1: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 200, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test 1'
      }

      const coords2: DiagramCoordinates = {
        x1: 300, y1: 350, x2: 400, y2: 450,
        confidence: 0.95, type: 'graph', description: 'Test 2'
      }

      const overlaps = validator.doCoordinatesOverlap(coords1, coords2)
      expect(overlaps).toBe(false)
    })

    it('should calculate overlap percentage', () => {
      const coords1: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 200, y2: 200, // 100x100 = 10000
        confidence: 0.95, type: 'graph', description: 'Test 1'
      }

      const coords2: DiagramCoordinates = {
        x1: 150, y1: 150, x2: 250, y2: 250, // 100x100 = 10000
        confidence: 0.95, type: 'graph', description: 'Test 2'
      }

      // Overlap area: 50x50 = 2500
      // Union area: 10000 + 10000 - 2500 = 17500
      // Percentage: (2500 / 17500) * 100 = ~14.29%

      const percentage = validator.calculateOverlapPercentage(coords1, coords2)
      expect(percentage).toBeCloseTo(14.29, 1)
    })

    it('should merge overlapping coordinates', () => {
      const coords1: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.8, type: 'graph', description: 'Test 1'
      }

      const coords2: DiagramCoordinates = {
        x1: 200, y1: 200, x2: 400, y2: 350,
        confidence: 0.9, type: 'flowchart', description: 'Test 2'
      }

      const merged = validator.mergeOverlappingCoordinates(coords1, coords2)
      
      expect(merged.x1).toBe(100) // Min x1
      expect(merged.y1).toBe(150) // Min y1
      expect(merged.x2).toBe(400) // Max x2
      expect(merged.y2).toBe(350) // Max y2
      expect(merged.confidence).toBe(0.9) // Max confidence
    })
  })

  describe('Scaling Operations', () => {
    it('should scale coordinates proportionally', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const scaled = validator.scaleCoordinates(coords, 2.0)
      
      expect(scaled.x1).toBe(200)
      expect(scaled.y1).toBe(300)
      expect(scaled.x2).toBe(600)
      expect(scaled.y2).toBe(500)
    })

    it('should create scale transform for different image sizes', () => {
      const original: ImageDimensions = { width: 800, height: 600 }
      const target: ImageDimensions = { width: 1600, height: 900 }

      const transform = validator.createScaleTransform(original, target)
      
      expect(transform.scaleX).toBe(2.0) // 1600 / 800
      expect(transform.scaleY).toBe(1.5) // 900 / 600
      expect(transform.offsetX).toBe(0)
      expect(transform.offsetY).toBe(0)
    })
  })

  describe('Array Validation', () => {
    it('should validate array of coordinates', () => {
      const coordinates: DiagramCoordinates[] = [
        {
          x1: 100, y1: 150, x2: 300, y2: 250,
          confidence: 0.95, type: 'graph', description: 'Test 1'
        },
        {
          x1: 400, y1: 350, x2: 600, y2: 450,
          confidence: 0.85, type: 'flowchart', description: 'Test 2'
        }
      ]

      const result = validator.validateCoordinateArray(coordinates, imageDimensions, true)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect overlaps when not allowed', () => {
      const coordinates: DiagramCoordinates[] = [
        {
          x1: 100, y1: 150, x2: 300, y2: 250,
          confidence: 0.95, type: 'graph', description: 'Test 1'
        },
        {
          x1: 200, y1: 200, x2: 400, y2: 350, // Overlaps with first
          confidence: 0.85, type: 'flowchart', description: 'Test 2'
        }
      ]

      const result = validator.validateCoordinateArray(coordinates, imageDimensions, false)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('overlap'))).toBe(true)
    })

    it('should handle invalid coordinates in array', () => {
      const coordinates: DiagramCoordinates[] = [
        {
          x1: 100, y1: 150, x2: 300, y2: 250,
          confidence: 0.95, type: 'graph', description: 'Valid'
        },
        {
          x1: -10, y1: -5, x2: 900, y2: 700, // Invalid bounds
          confidence: 1.5, type: 'graph', description: 'Invalid'
        }
      ]

      const result = validator.validateCoordinateArray(coordinates, imageDimensions)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('coordinateUtils', () => {
  describe('Utility Functions', () => {
    it('should generate unique coordinate IDs', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const id1 = coordinateUtils.generateCoordinateId(coords)
      const id2 = coordinateUtils.generateCoordinateId(coords)
      
      expect(id1).toMatch(/^coord_100_150_300_250_\d+$/)
      expect(id2).toMatch(/^coord_100_150_300_250_\d+$/)
      expect(id1).not.toBe(id2) // Should be unique due to timestamp
    })

    it('should create default coordinates', () => {
      const imageDimensions: ImageDimensions = { width: 800, height: 600 }
      const coords = coordinateUtils.createDefaultCoordinates(imageDimensions)
      
      expect(coords.x1).toBeGreaterThanOrEqual(0)
      expect(coords.y1).toBeGreaterThanOrEqual(0)
      expect(coords.x2).toBeLessThanOrEqual(imageDimensions.width)
      expect(coords.y2).toBeLessThanOrEqual(imageDimensions.height)
      expect(coords.x2).toBeGreaterThan(coords.x1)
      expect(coords.y2).toBeGreaterThan(coords.y1)
      expect(coords.confidence).toBe(1.0)
      expect(coords.type).toBe('other')
    })

    it('should check reasonable diagram size', () => {
      const imageDimensions: ImageDimensions = { width: 800, height: 600 }
      
      // Reasonable size (10% of image area)
      const reasonableCoords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 300, y2: 200, // 200x100 = 20000 (~4.2% of 480000)
        confidence: 0.95, type: 'graph', description: 'Test'
      }
      
      expect(coordinateUtils.isReasonableSize(reasonableCoords, imageDimensions)).toBe(true)
      
      // Too small (0.1% of image area)
      const tooSmallCoords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 110, y2: 110, // 10x10 = 100 (~0.02% of 480000)
        confidence: 0.95, type: 'graph', description: 'Test'
      }
      
      expect(coordinateUtils.isReasonableSize(tooSmallCoords, imageDimensions)).toBe(false)
      
      // Too large (90% of image area)
      const tooLargeCoords: DiagramCoordinates = {
        x1: 10, y1: 10, x2: 790, y2: 590, // 780x580 = 452400 (~94% of 480000)
        confidence: 0.95, type: 'graph', description: 'Test'
      }
      
      expect(coordinateUtils.isReasonableSize(tooLargeCoords, imageDimensions)).toBe(false)
    })

    it('should snap coordinates to grid', () => {
      const coords: DiagramCoordinates = {
        x1: 103, y1: 157, x2: 298, y2: 243,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const snapped = coordinateUtils.snapToGrid(coords, 10)
      
      expect(snapped.x1).toBe(100) // Snapped to nearest 10
      expect(snapped.y1).toBe(160) // Snapped to nearest 10
      expect(snapped.x2).toBe(300) // Snapped to nearest 10
      expect(snapped.y2).toBe(240) // Snapped to nearest 10
    })

    it('should snap coordinates to default grid size', () => {
      const coords: DiagramCoordinates = {
        x1: 103, y1: 157, x2: 298, y2: 243,
        confidence: 0.95, type: 'graph', description: 'Test'
      }

      const snapped = coordinateUtils.snapToGrid(coords) // Default grid size 5
      
      expect(snapped.x1).toBe(105) // Snapped to nearest 5
      expect(snapped.y1).toBe(155) // Snapped to nearest 5
      expect(snapped.x2).toBe(300) // Snapped to nearest 5
      expect(snapped.y2).toBe(245) // Snapped to nearest 5
    })
  })
})