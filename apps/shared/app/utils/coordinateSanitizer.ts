/**
 * Coordinate Sanitizer
 * 
 * This module provides specialized sanitization utilities for different
 * coordinate use cases and validation scenarios.
 */

import type { 
  DiagramCoordinates, 
  ImageDimensions,
  DiagramType
} from '~/shared/types/diagram-detection'
import { CoordinateValidator } from './coordinateValidator'

export interface SanitizationOptions {
  strictBounds?: boolean
  preserveAspectRatio?: boolean
  snapToGrid?: number
  minSize?: { width: number; height: number }
  maxSize?: { width: number; height: number }
  confidenceAdjustment?: 'boost' | 'penalize' | 'none'
  typeSpecificRules?: boolean
}

export interface SanitizationResult {
  sanitized: DiagramCoordinates
  changes: Array<{
    type: 'bounds' | 'size' | 'aspect' | 'grid' | 'confidence' | 'type'
    description: string
    before: any
    after: any
  }>
  warnings: string[]
}

export class CoordinateSanitizer {
  private validator: CoordinateValidator

  constructor() {
    this.validator = new CoordinateValidator()
  }

  /**
   * Comprehensive coordinate sanitization with detailed tracking
   */
  sanitizeCoordinates(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions,
    options: SanitizationOptions = {}
  ): SanitizationResult {
    const changes: SanitizationResult['changes'] = []
    const warnings: string[] = []
    let sanitized = { ...coords }

    // Track original values
    const original = { ...coords }

    // 1. Basic bounds sanitization
    if (options.strictBounds !== false) {
      const boundsResult = this.sanitizeBounds(sanitized, imageDimensions)
      if (boundsResult.changed) {
        sanitized = boundsResult.coordinates
        changes.push({
          type: 'bounds',
          description: 'Clamped coordinates to image boundaries',
          before: { x1: original.x1, y1: original.y1, x2: original.x2, y2: original.y2 },
          after: { x1: sanitized.x1, y1: sanitized.y1, x2: sanitized.x2, y2: sanitized.y2 }
        })
      }
    }

    // 2. Size constraints
    const sizeResult = this.sanitizeSize(sanitized, imageDimensions, options)
    if (sizeResult.changed) {
      sanitized = sizeResult.coordinates
      changes.push({
        type: 'size',
        description: sizeResult.description,
        before: { width: original.x2 - original.x1, height: original.y2 - original.y1 },
        after: { width: sanitized.x2 - sanitized.x1, height: sanitized.y2 - sanitized.y1 }
      })
      warnings.push(...sizeResult.warnings)
    }

    // 3. Aspect ratio preservation
    if (options.preserveAspectRatio) {
      const aspectResult = this.preserveAspectRatio(sanitized, original, imageDimensions)
      if (aspectResult.changed) {
        sanitized = aspectResult.coordinates
        changes.push({
          type: 'aspect',
          description: 'Preserved original aspect ratio',
          before: (original.x2 - original.x1) / (original.y2 - original.y1),
          after: (sanitized.x2 - sanitized.x1) / (sanitized.y2 - sanitized.y1)
        })
      }
    }

    // 4. Grid snapping
    if (options.snapToGrid && options.snapToGrid > 0) {
      const gridResult = this.snapToGrid(sanitized, options.snapToGrid)
      if (gridResult.changed) {
        sanitized = gridResult.coordinates
        changes.push({
          type: 'grid',
          description: `Snapped to ${options.snapToGrid}px grid`,
          before: { x1: original.x1, y1: original.y1, x2: original.x2, y2: original.y2 },
          after: { x1: sanitized.x1, y1: sanitized.y1, x2: sanitized.x2, y2: sanitized.y2 }
        })
      }
    }

    // 5. Confidence adjustment
    if (options.confidenceAdjustment && options.confidenceAdjustment !== 'none') {
      const confidenceResult = this.adjustConfidence(sanitized, changes.length, options.confidenceAdjustment)
      if (confidenceResult.changed) {
        sanitized = confidenceResult.coordinates
        changes.push({
          type: 'confidence',
          description: confidenceResult.description,
          before: original.confidence,
          after: sanitized.confidence
        })
      }
    }

    // 6. Type-specific rules
    if (options.typeSpecificRules) {
      const typeResult = this.applyTypeSpecificRules(sanitized, imageDimensions)
      if (typeResult.changed) {
        sanitized = typeResult.coordinates
        changes.push({
          type: 'type',
          description: `Applied ${sanitized.type}-specific rules`,
          before: typeResult.before,
          after: typeResult.after
        })
        warnings.push(...typeResult.warnings)
      }
    }

    return {
      sanitized,
      changes,
      warnings
    }
  }

  /**
   * Sanitize coordinates for manual editing
   */
  sanitizeForManualEdit(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions
  ): SanitizationResult {
    return this.sanitizeCoordinates(coords, imageDimensions, {
      strictBounds: true,
      snapToGrid: 5,
      minSize: { width: 20, height: 20 },
      confidenceAdjustment: 'boost', // User edits should have high confidence
      typeSpecificRules: false // Don't enforce type rules for manual edits
    })
  }

  /**
   * Sanitize coordinates for API responses
   */
  sanitizeForAPIResponse(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions
  ): SanitizationResult {
    return this.sanitizeCoordinates(coords, imageDimensions, {
      strictBounds: true,
      preserveAspectRatio: true,
      minSize: { width: 30, height: 30 },
      maxSize: { 
        width: imageDimensions.width * 0.8, 
        height: imageDimensions.height * 0.8 
      },
      confidenceAdjustment: 'none', // Keep original API confidence
      typeSpecificRules: true
    })
  }

  /**
   * Sanitize coordinates for storage
   */
  sanitizeForStorage(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions
  ): SanitizationResult {
    return this.sanitizeCoordinates(coords, imageDimensions, {
      strictBounds: true,
      snapToGrid: 1, // Precise storage
      minSize: { width: 10, height: 10 },
      confidenceAdjustment: 'none',
      typeSpecificRules: true
    })
  }

  /**
   * Batch sanitize multiple coordinates
   */
  batchSanitize(
    coordinatesArray: DiagramCoordinates[],
    imageDimensions: ImageDimensions,
    options: SanitizationOptions = {}
  ): Array<SanitizationResult> {
    return coordinatesArray.map(coords => 
      this.sanitizeCoordinates(coords, imageDimensions, options)
    )
  }

  // Private helper methods

  private sanitizeBounds(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions
  ): { coordinates: DiagramCoordinates; changed: boolean } {
    const original = { ...coords }
    
    // Clamp coordinates to image boundaries
    coords.x1 = Math.max(0, Math.min(coords.x1, imageDimensions.width - 1))
    coords.y1 = Math.max(0, Math.min(coords.y1, imageDimensions.height - 1))
    coords.x2 = Math.max(coords.x1 + 1, Math.min(coords.x2, imageDimensions.width))
    coords.y2 = Math.max(coords.y1 + 1, Math.min(coords.y2, imageDimensions.height))

    // Ensure proper ordering
    if (coords.x2 <= coords.x1) coords.x2 = coords.x1 + 1
    if (coords.y2 <= coords.y1) coords.y2 = coords.y1 + 1

    const changed = (
      original.x1 !== coords.x1 || original.y1 !== coords.y1 ||
      original.x2 !== coords.x2 || original.y2 !== coords.y2
    )

    return { coordinates: coords, changed }
  }

  private sanitizeSize(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions,
    options: SanitizationOptions
  ): { coordinates: DiagramCoordinates; changed: boolean; description: string; warnings: string[] } {
    const warnings: string[] = []
    let changed = false
    let description = ''

    const width = coords.x2 - coords.x1
    const height = coords.y2 - coords.y1

    // Apply minimum size constraints
    if (options.minSize) {
      if (width < options.minSize.width || height < options.minSize.height) {
        const centerX = (coords.x1 + coords.x2) / 2
        const centerY = (coords.y1 + coords.y2) / 2
        
        const newWidth = Math.max(width, options.minSize.width)
        const newHeight = Math.max(height, options.minSize.height)
        
        coords.x1 = Math.max(0, centerX - newWidth / 2)
        coords.x2 = Math.min(imageDimensions.width, centerX + newWidth / 2)
        coords.y1 = Math.max(0, centerY - newHeight / 2)
        coords.y2 = Math.min(imageDimensions.height, centerY + newHeight / 2)
        
        changed = true
        description = `Enforced minimum size ${options.minSize.width}x${options.minSize.height}`
      }
    }

    // Apply maximum size constraints
    if (options.maxSize) {
      const currentWidth = coords.x2 - coords.x1
      const currentHeight = coords.y2 - coords.y1
      
      if (currentWidth > options.maxSize.width || currentHeight > options.maxSize.height) {
        const centerX = (coords.x1 + coords.x2) / 2
        const centerY = (coords.y1 + coords.y2) / 2
        
        const newWidth = Math.min(currentWidth, options.maxSize.width)
        const newHeight = Math.min(currentHeight, options.maxSize.height)
        
        coords.x1 = Math.max(0, centerX - newWidth / 2)
        coords.x2 = Math.min(imageDimensions.width, centerX + newWidth / 2)
        coords.y1 = Math.max(0, centerY - newHeight / 2)
        coords.y2 = Math.min(imageDimensions.height, centerY + newHeight / 2)
        
        changed = true
        description += (description ? '; ' : '') + `Enforced maximum size ${options.maxSize.width}x${options.maxSize.height}`
        warnings.push('Diagram was larger than maximum allowed size')
      }
    }

    return { coordinates: coords, changed, description, warnings }
  }

  private preserveAspectRatio(
    coords: DiagramCoordinates,
    original: DiagramCoordinates,
    imageDimensions: ImageDimensions
  ): { coordinates: DiagramCoordinates; changed: boolean } {
    const originalRatio = (original.x2 - original.x1) / (original.y2 - original.y1)
    const currentRatio = (coords.x2 - coords.x1) / (coords.y2 - coords.y1)
    
    if (Math.abs(originalRatio - currentRatio) < 0.01) {
      return { coordinates: coords, changed: false }
    }

    const centerX = (coords.x1 + coords.x2) / 2
    const centerY = (coords.y1 + coords.y2) / 2
    const currentHeight = coords.y2 - coords.y1
    const newWidth = currentHeight * originalRatio

    // Adjust width to preserve aspect ratio
    coords.x1 = Math.max(0, centerX - newWidth / 2)
    coords.x2 = Math.min(imageDimensions.width, centerX + newWidth / 2)

    // If width adjustment hits boundaries, adjust height instead
    if (coords.x1 === 0 || coords.x2 === imageDimensions.width) {
      const actualWidth = coords.x2 - coords.x1
      const newHeight = actualWidth / originalRatio
      
      coords.y1 = Math.max(0, centerY - newHeight / 2)
      coords.y2 = Math.min(imageDimensions.height, centerY + newHeight / 2)
    }

    return { coordinates: coords, changed: true }
  }

  private snapToGrid(
    coords: DiagramCoordinates,
    gridSize: number
  ): { coordinates: DiagramCoordinates; changed: boolean } {
    const original = { ...coords }
    
    coords.x1 = Math.round(coords.x1 / gridSize) * gridSize
    coords.y1 = Math.round(coords.y1 / gridSize) * gridSize
    coords.x2 = Math.round(coords.x2 / gridSize) * gridSize
    coords.y2 = Math.round(coords.y2 / gridSize) * gridSize

    const changed = (
      original.x1 !== coords.x1 || original.y1 !== coords.y1 ||
      original.x2 !== coords.x2 || original.y2 !== coords.y2
    )

    return { coordinates: coords, changed }
  }

  private adjustConfidence(
    coords: DiagramCoordinates,
    changesCount: number,
    adjustment: 'boost' | 'penalize'
  ): { coordinates: DiagramCoordinates; changed: boolean; description: string } {
    const originalConfidence = coords.confidence
    
    if (adjustment === 'boost') {
      // Boost confidence for manual edits or successful sanitization
      coords.confidence = Math.min(1.0, coords.confidence + 0.1)
    } else if (adjustment === 'penalize') {
      // Penalize confidence based on number of changes needed
      const penalty = Math.min(0.3, changesCount * 0.05)
      coords.confidence = Math.max(0.1, coords.confidence - penalty)
    }

    const changed = originalConfidence !== coords.confidence
    const description = adjustment === 'boost' 
      ? 'Boosted confidence for sanitized coordinates'
      : `Penalized confidence due to ${changesCount} corrections`

    return { coordinates: coords, changed, description }
  }

  private applyTypeSpecificRules(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions
  ): { 
    coordinates: DiagramCoordinates; 
    changed: boolean; 
    before: any; 
    after: any; 
    warnings: string[] 
  } {
    const warnings: string[] = []
    const before = {
      width: coords.x2 - coords.x1,
      height: coords.y2 - coords.y1,
      aspectRatio: (coords.x2 - coords.x1) / (coords.y2 - coords.y1)
    }

    let changed = false

    // Apply type-specific constraints
    switch (coords.type) {
      case 'table':
        // Tables should be wider than they are tall
        if (before.aspectRatio < 1.2) {
          const centerX = (coords.x1 + coords.x2) / 2
          const newWidth = before.height * 1.5
          coords.x1 = Math.max(0, centerX - newWidth / 2)
          coords.x2 = Math.min(imageDimensions.width, centerX + newWidth / 2)
          changed = true
          warnings.push('Adjusted table to have appropriate width-to-height ratio')
        }
        break

      case 'graph':
        // Graphs should have reasonable proportions
        if (before.aspectRatio < 0.5 || before.aspectRatio > 2.5) {
          const centerX = (coords.x1 + coords.x2) / 2
          const centerY = (coords.y1 + coords.y2) / 2
          const size = Math.min(before.width, before.height)
          const newWidth = size * 1.2
          const newHeight = size

          coords.x1 = Math.max(0, centerX - newWidth / 2)
          coords.x2 = Math.min(imageDimensions.width, centerX + newWidth / 2)
          coords.y1 = Math.max(0, centerY - newHeight / 2)
          coords.y2 = Math.min(imageDimensions.height, centerY + newHeight / 2)
          
          changed = true
          warnings.push('Adjusted graph proportions for better readability')
        }
        break

      case 'geometric':
        // Geometric figures should be more square
        if (Math.abs(before.aspectRatio - 1.0) > 0.3) {
          const centerX = (coords.x1 + coords.x2) / 2
          const centerY = (coords.y1 + coords.y2) / 2
          const size = Math.min(before.width, before.height)

          coords.x1 = Math.max(0, centerX - size / 2)
          coords.x2 = Math.min(imageDimensions.width, centerX + size / 2)
          coords.y1 = Math.max(0, centerY - size / 2)
          coords.y2 = Math.min(imageDimensions.height, centerY + size / 2)
          
          changed = true
          warnings.push('Made geometric figure more square')
        }
        break
    }

    const after = {
      width: coords.x2 - coords.x1,
      height: coords.y2 - coords.y1,
      aspectRatio: (coords.x2 - coords.x1) / (coords.y2 - coords.y1)
    }

    return { coordinates: coords, changed, before, after, warnings }
  }
}

export default CoordinateSanitizer