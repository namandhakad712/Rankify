/**
 * Unit Tests for Coordinate Sanitizer
 * 
 * This file contains comprehensive tests for the coordinate sanitization
 * utilities with different use cases and scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { 
  DiagramCoordinates, 
  ImageDimensions
} from '~/shared/types/diagram-detection'
import { CoordinateSanitizer } from '../coordinateSanitizer'

describe('CoordinateSanitizer', () => {
  let sanitizer: CoordinateSanitizer
  let imageDimensions: ImageDimensions

  beforeEach(() => {
    sanitizer = new CoordinateSanitizer()
    imageDimensions = { width: 800, height: 600 }
  })

  describe('Basic Sanitization', () => {
    it('should sanitize coordinates with default options', () => {
      const coords: DiagramCoordinates = {
        x1: -10,
        y1: -5,
        x2: 900,
        y2: 700,
        confidence: 1.2,
        type: 'graph',
        description: 'Test diagram'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions)
      
      expect(result.sanitized.x1).toBeGreaterThanOrEqual(0)
      expect(result.sanitized.y1).toBeGreaterThanOrEqual(0)
      expect(result.sanitized.x2).toBeLessThanOrEqual(imageDimensions.width)
      expect(result.sanitized.y2).toBeLessThanOrEqual(imageDimensions.height)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].type).toBe('bounds')
    })

    it('should track all changes made during sanitization', () => {
      const coords: DiagramCoordinates = {
        x1: -10,
        y1: -5,
        x2: 15, // Too small width
        y2: 10, // Too small height
        confidence: 0.5,
        type: 'graph',
        description: 'Test diagram'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        minSize: { width: 50, height: 50 },
        snapToGrid: 10,
        confidenceAdjustment: 'boost'
      })
      
      expect(result.changes.length).toBeGreaterThan(1)
      expect(result.changes.some(c => c.type === 'bounds')).toBe(true)
      expect(result.changes.some(c => c.type === 'size')).toBe(true)
      expect(result.changes.some(c => c.type === 'grid')).toBe(true)
      expect(result.changes.some(c => c.type === 'confidence')).toBe(true)
    })

    it('should provide warnings for significant changes', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 100,
        x2: 700, // Very wide
        y2: 500, // Very tall
        confidence: 0.9,
        type: 'graph',
        description: 'Large diagram'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        maxSize: { width: 300, height: 200 }
      })
      
      expect(result.warnings).toContain('Diagram was larger than maximum allowed size')
    })
  })

  describe('Manual Edit Sanitization', () => {
    it('should sanitize coordinates for manual editing', () => {
      const coords: DiagramCoordinates = {
        x1: 103.7,
        y1: 157.2,
        x2: 298.9,
        y2: 243.1,
        confidence: 0.7,
        type: 'graph',
        description: 'Manually edited'
      }

      const result = sanitizer.sanitizeForManualEdit(coords, imageDimensions)
      
      // Should snap to 5px grid
      expect(result.sanitized.x1 % 5).toBe(0)
      expect(result.sanitized.y1 % 5).toBe(0)
      expect(result.sanitized.x2 % 5).toBe(0)
      expect(result.sanitized.y2 % 5).toBe(0)
      
      // Should boost confidence for manual edits
      expect(result.sanitized.confidence).toBeGreaterThan(coords.confidence)
    })

    it('should enforce minimum size for manual edits', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 100,
        x2: 110, // Only 10px wide
        y2: 110, // Only 10px tall
        confidence: 0.9,
        type: 'graph',
        description: 'Too small'
      }

      const result = sanitizer.sanitizeForManualEdit(coords, imageDimensions)
      
      const width = result.sanitized.x2 - result.sanitized.x1
      const height = result.sanitized.y2 - result.sanitized.y1
      
      expect(width).toBeGreaterThanOrEqual(20)
      expect(height).toBeGreaterThanOrEqual(20)
    })
  })

  describe('API Response Sanitization', () => {
    it('should sanitize coordinates from API responses', () => {
      const coords: DiagramCoordinates = {
        x1: 100.5,
        y1: 150.7,
        x2: 300.2,
        y2: 250.9,
        confidence: 0.85,
        type: 'scientific',
        description: 'API detected diagram'
      }

      const result = sanitizer.sanitizeForAPIResponse(coords, imageDimensions)
      
      // Should preserve aspect ratio
      const originalRatio = (coords.x2 - coords.x1) / (coords.y2 - coords.y1)
      const sanitizedRatio = (result.sanitized.x2 - result.sanitized.x1) / (result.sanitized.y2 - result.sanitized.y1)
      
      expect(Math.abs(originalRatio - sanitizedRatio)).toBeLessThan(0.1)
      
      // Should apply type-specific rules
      expect(result.changes.some(c => c.type === 'type')).toBe(true)
    })

    it('should enforce maximum size limits for API responses', () => {
      const coords: DiagramCoordinates = {
        x1: 50,
        y1: 50,
        x2: 750, // 700px wide (87.5% of image width)
        y2: 550, // 500px tall (83.3% of image height)
        confidence: 0.9,
        type: 'table',
        description: 'Large table'
      }

      const result = sanitizer.sanitizeForAPIResponse(coords, imageDimensions)
      
      const width = result.sanitized.x2 - result.sanitized.x1
      const height = result.sanitized.y2 - result.sanitized.y1
      
      // Should be limited to 80% of image dimensions
      expect(width).toBeLessThanOrEqual(imageDimensions.width * 0.8)
      expect(height).toBeLessThanOrEqual(imageDimensions.height * 0.8)
    })
  })

  describe('Storage Sanitization', () => {
    it('should sanitize coordinates for storage with precise grid', () => {
      const coords: DiagramCoordinates = {
        x1: 100.7,
        y1: 150.3,
        x2: 300.9,
        y2: 250.1,
        confidence: 0.85,
        type: 'graph',
        description: 'For storage'
      }

      const result = sanitizer.sanitizeForStorage(coords, imageDimensions)
      
      // Should snap to 1px grid (precise storage)
      expect(result.sanitized.x1).toBe(Math.round(coords.x1))
      expect(result.sanitized.y1).toBe(Math.round(coords.y1))
      expect(result.sanitized.x2).toBe(Math.round(coords.x2))
      expect(result.sanitized.y2).toBe(Math.round(coords.y2))
    })

    it('should enforce minimum size for storage', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 100,
        x2: 105, // Only 5px wide
        y2: 105, // Only 5px tall
        confidence: 0.9,
        type: 'geometric',
        description: 'Tiny diagram'
      }

      const result = sanitizer.sanitizeForStorage(coords, imageDimensions)
      
      const width = result.sanitized.x2 - result.sanitized.x1
      const height = result.sanitized.y2 - result.sanitized.y1
      
      expect(width).toBeGreaterThanOrEqual(10)
      expect(height).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Type-Specific Rules', () => {
    it('should adjust table proportions', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 100,
        x2: 200, // 100px wide
        y2: 200, // 100px tall (1:1 ratio, too square for table)
        confidence: 0.9,
        type: 'table',
        description: 'Square table'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        typeSpecificRules: true
      })
      
      const aspectRatio = (result.sanitized.x2 - result.sanitized.x1) / (result.sanitized.y2 - result.sanitized.y1)
      expect(aspectRatio).toBeGreaterThan(1.2) // Tables should be wider
      expect(result.warnings).toContain('Adjusted table to have appropriate width-to-height ratio')
    })

    it('should adjust graph proportions', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 100,
        x2: 150, // 50px wide
        y2: 300, // 200px tall (very tall and narrow)
        confidence: 0.9,
        type: 'graph',
        description: 'Narrow graph'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        typeSpecificRules: true
      })
      
      const aspectRatio = (result.sanitized.x2 - result.sanitized.x1) / (result.sanitized.y2 - result.sanitized.y1)
      expect(aspectRatio).toBeGreaterThan(0.5)
      expect(aspectRatio).toBeLessThan(2.5)
      expect(result.warnings).toContain('Adjusted graph proportions for better readability')
    })

    it('should make geometric figures more square', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 100,
        x2: 300, // 200px wide
        y2: 150, // 50px tall (4:1 ratio, too wide for geometric)
        confidence: 0.9,
        type: 'geometric',
        description: 'Wide rectangle'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        typeSpecificRules: true
      })
      
      const aspectRatio = (result.sanitized.x2 - result.sanitized.x1) / (result.sanitized.y2 - result.sanitized.y1)
      expect(Math.abs(aspectRatio - 1.0)).toBeLessThan(0.3) // Should be closer to square
      expect(result.warnings).toContain('Made geometric figure more square')
    })
  })

  describe('Batch Sanitization', () => {
    it('should sanitize multiple coordinates', () => {
      const coordinates: DiagramCoordinates[] = [
        {
          x1: -10, y1: -5, x2: 100, y2: 150,
          confidence: 0.9, type: 'graph', description: 'Graph 1'
        },
        {
          x1: 200.7, y1: 300.3, x2: 400.9, y2: 450.1,
          confidence: 0.8, type: 'table', description: 'Table 1'
        },
        {
          x1: 500, y1: 100, x2: 505, y2: 105, // Too small
          confidence: 0.7, type: 'geometric', description: 'Small shape'
        }
      ]

      const results = sanitizer.batchSanitize(coordinates, imageDimensions, {
        minSize: { width: 50, height: 50 },
        snapToGrid: 5
      })
      
      expect(results).toHaveLength(3)
      
      // First coordinate should have bounds correction
      expect(results[0].changes.some(c => c.type === 'bounds')).toBe(true)
      
      // Second coordinate should have grid snapping
      expect(results[1].changes.some(c => c.type === 'grid')).toBe(true)
      
      // Third coordinate should have size correction
      expect(results[2].changes.some(c => c.type === 'size')).toBe(true)
    })
  })

  describe('Aspect Ratio Preservation', () => {
    it('should preserve original aspect ratio when requested', () => {
      const coords: DiagramCoordinates = {
        x1: 100,
        y1: 100,
        x2: 300, // 200px wide
        y2: 200, // 100px tall (2:1 ratio)
        confidence: 0.9,
        type: 'graph',
        description: 'Original ratio'
      }

      // Modify coordinates to break aspect ratio
      const modifiedCoords = { ...coords, x2: 250 } // Now 150px wide (1.5:1 ratio)

      const result = sanitizer.sanitizeCoordinates(modifiedCoords, imageDimensions, {
        preserveAspectRatio: true
      })
      
      const originalRatio = (coords.x2 - coords.x1) / (coords.y2 - coords.y1)
      const resultRatio = (result.sanitized.x2 - result.sanitized.x1) / (result.sanitized.y2 - result.sanitized.y1)
      
      expect(Math.abs(originalRatio - resultRatio)).toBeLessThan(0.1)
      expect(result.changes.some(c => c.type === 'aspect')).toBe(true)
    })
  })

  describe('Confidence Adjustment', () => {
    it('should boost confidence when requested', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 300, y2: 200,
        confidence: 0.7, type: 'graph', description: 'Test'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        confidenceAdjustment: 'boost'
      })
      
      expect(result.sanitized.confidence).toBeGreaterThan(coords.confidence)
      expect(result.changes.some(c => c.type === 'confidence')).toBe(true)
    })

    it('should penalize confidence based on number of changes', () => {
      const coords: DiagramCoordinates = {
        x1: -10, // Will need bounds correction
        y1: -5,  // Will need bounds correction
        x2: 15,  // Will need size correction
        y2: 10,  // Will need size correction
        confidence: 0.9,
        type: 'graph',
        description: 'Many issues'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        minSize: { width: 50, height: 50 },
        confidenceAdjustment: 'penalize'
      })
      
      expect(result.sanitized.confidence).toBeLessThan(coords.confidence)
      expect(result.changes.some(c => c.type === 'confidence')).toBe(true)
    })
  })

  describe('Grid Snapping', () => {
    it('should snap coordinates to specified grid', () => {
      const coords: DiagramCoordinates = {
        x1: 103, y1: 157, x2: 298, y2: 243,
        confidence: 0.9, type: 'graph', description: 'Unaligned'
      }

      const result = sanitizer.sanitizeCoordinates(coords, imageDimensions, {
        snapToGrid: 10
      })
      
      expect(result.sanitized.x1 % 10).toBe(0)
      expect(result.sanitized.y1 % 10).toBe(0)
      expect(result.sanitized.x2 % 10).toBe(0)
      expect(result.sanitized.y2 % 10).toBe(0)
      expect(result.changes.some(c => c.type === 'grid')).toBe(true)
    })
  })
})