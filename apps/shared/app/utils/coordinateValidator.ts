/**
 * Coordinate Validation and Sanitization Utilities
 * 
 * This module provides utilities for validating, sanitizing, and transforming
 * diagram coordinates for the advanced diagram detection system.
 */

import type { 
  DiagramCoordinates, 
  ImageDimensions, 
  CoordinateValidationResult,
  CoordinateTransform,
  ViewportCoordinates
} from '~/shared/types/diagram-detection'

export class CoordinateValidator {
  /**
   * Validate diagram coordinates against image boundaries
   */
  validateBounds(coords: DiagramCoordinates, imageDimensions: ImageDimensions): boolean {
    return (
      coords.x1 >= 0 && 
      coords.x1 < imageDimensions.width &&
      coords.y1 >= 0 && 
      coords.y1 < imageDimensions.height &&
      coords.x2 > coords.x1 && 
      coords.x2 <= imageDimensions.width &&
      coords.y2 > coords.y1 && 
      coords.y2 <= imageDimensions.height
    );
  }

  /**
   * Comprehensive validation of diagram coordinates
   */
  validateCoordinates(coords: DiagramCoordinates, imageDimensions: ImageDimensions): CoordinateValidationResult {
    const errors: string[] = [];

    // Check if coordinates are numbers
    if (!this.isValidNumber(coords.x1) || !this.isValidNumber(coords.y1) ||
        !this.isValidNumber(coords.x2) || !this.isValidNumber(coords.y2)) {
      errors.push('Coordinates must be valid numbers');
    }

    // Check coordinate order
    if (coords.x2 <= coords.x1) {
      errors.push('x2 must be greater than x1');
    }
    if (coords.y2 <= coords.y1) {
      errors.push('y2 must be greater than y1');
    }

    // Check bounds
    if (!this.validateBounds(coords, imageDimensions)) {
      errors.push('Coordinates are outside image boundaries');
    }

    // Check minimum size
    const minSize = 10; // Minimum 10px width/height
    if ((coords.x2 - coords.x1) < minSize || (coords.y2 - coords.y1) < minSize) {
      errors.push(`Diagram must be at least ${minSize}px in width and height`);
    }

    // Check confidence
    if (coords.confidence < 0 || coords.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    const isValid = errors.length === 0;
    const result: CoordinateValidationResult = {
      isValid,
      errors
    };

    if (isValid) {
      result.sanitizedCoordinates = this.sanitizeCoordinates(coords);
    }

    return result;
  }

  /**
   * Sanitize coordinates by rounding and clamping to valid ranges
   */
  sanitizeCoordinates(coords: DiagramCoordinates, imageDimensions?: ImageDimensions): DiagramCoordinates {
    let sanitized = {
      ...coords,
      x1: Math.max(0, Math.floor(coords.x1)),
      y1: Math.max(0, Math.floor(coords.y1)),
      x2: Math.ceil(coords.x2),
      y2: Math.ceil(coords.y2),
      confidence: Math.max(0, Math.min(1, coords.confidence))
    };

    if (imageDimensions) {
      sanitized.x1 = Math.min(sanitized.x1, imageDimensions.width - 1);
      sanitized.y1 = Math.min(sanitized.y1, imageDimensions.height - 1);
      sanitized.x2 = Math.min(sanitized.x2, imageDimensions.width);
      sanitized.y2 = Math.min(sanitized.y2, imageDimensions.height);
    }

    // Ensure proper ordering
    if (sanitized.x2 <= sanitized.x1) {
      sanitized.x2 = sanitized.x1 + 1;
    }
    if (sanitized.y2 <= sanitized.y1) {
      sanitized.y2 = sanitized.y1 + 1;
    }

    return sanitized;
  }

  /**
   * Transform coordinates from one coordinate system to another
   */
  transformCoordinates(coords: DiagramCoordinates, transform: CoordinateTransform): DiagramCoordinates {
    return {
      ...coords,
      x1: (coords.x1 * transform.scaleX) + transform.offsetX,
      y1: (coords.y1 * transform.scaleY) + transform.offsetY,
      x2: (coords.x2 * transform.scaleX) + transform.offsetX,
      y2: (coords.y2 * transform.scaleY) + transform.offsetY
    };
  }

  /**
   * Convert coordinates to viewport coordinates (for CSS positioning)
   */
  toViewportCoordinates(coords: DiagramCoordinates): ViewportCoordinates {
    return {
      x: coords.x1,
      y: coords.y1,
      width: coords.x2 - coords.x1,
      height: coords.y2 - coords.y1
    };
  }

  /**
   * Convert viewport coordinates back to diagram coordinates
   */
  fromViewportCoordinates(viewport: ViewportCoordinates, originalCoords: DiagramCoordinates): DiagramCoordinates {
    return {
      ...originalCoords,
      x1: viewport.x,
      y1: viewport.y,
      x2: viewport.x + viewport.width,
      y2: viewport.y + viewport.height
    };
  }

  /**
   * Calculate the area of a diagram
   */
  calculateArea(coords: DiagramCoordinates): number {
    return (coords.x2 - coords.x1) * (coords.y2 - coords.y1);
  }

  /**
   * Check if two coordinate sets overlap
   */
  doCoordinatesOverlap(coords1: DiagramCoordinates, coords2: DiagramCoordinates): boolean {
    return !(
      coords1.x2 <= coords2.x1 ||
      coords2.x2 <= coords1.x1 ||
      coords1.y2 <= coords2.y1 ||
      coords2.y2 <= coords1.y1
    );
  }

  /**
   * Calculate overlap percentage between two coordinate sets
   */
  calculateOverlapPercentage(coords1: DiagramCoordinates, coords2: DiagramCoordinates): number {
    if (!this.doCoordinatesOverlap(coords1, coords2)) {
      return 0;
    }

    const overlapX1 = Math.max(coords1.x1, coords2.x1);
    const overlapY1 = Math.max(coords1.y1, coords2.y1);
    const overlapX2 = Math.min(coords1.x2, coords2.x2);
    const overlapY2 = Math.min(coords1.y2, coords2.y2);

    const overlapArea = (overlapX2 - overlapX1) * (overlapY2 - overlapY1);
    const area1 = this.calculateArea(coords1);
    const area2 = this.calculateArea(coords2);
    const unionArea = area1 + area2 - overlapArea;

    return unionArea > 0 ? (overlapArea / unionArea) * 100 : 0;
  }

  /**
   * Merge overlapping coordinates
   */
  mergeOverlappingCoordinates(coords1: DiagramCoordinates, coords2: DiagramCoordinates): DiagramCoordinates {
    return {
      ...coords1, // Keep metadata from first coordinate set
      x1: Math.min(coords1.x1, coords2.x1),
      y1: Math.min(coords1.y1, coords2.y1),
      x2: Math.max(coords1.x2, coords2.x2),
      y2: Math.max(coords1.y2, coords2.y2),
      confidence: Math.max(coords1.confidence, coords2.confidence)
    };
  }

  /**
   * Scale coordinates proportionally
   */
  scaleCoordinates(coords: DiagramCoordinates, scaleFactor: number): DiagramCoordinates {
    return {
      ...coords,
      x1: coords.x1 * scaleFactor,
      y1: coords.y1 * scaleFactor,
      x2: coords.x2 * scaleFactor,
      y2: coords.y2 * scaleFactor
    };
  }

  /**
   * Create coordinate transform for scaling between different image sizes
   */
  createScaleTransform(
    originalDimensions: ImageDimensions, 
    targetDimensions: ImageDimensions
  ): CoordinateTransform {
    return {
      scaleX: targetDimensions.width / originalDimensions.width,
      scaleY: targetDimensions.height / originalDimensions.height,
      offsetX: 0,
      offsetY: 0
    };
  }

  /**
   * Validate array of coordinates for conflicts and overlaps
   */
  validateCoordinateArray(
    coordinatesArray: DiagramCoordinates[], 
    imageDimensions: ImageDimensions,
    allowOverlaps = false
  ): CoordinateValidationResult {
    const errors: string[] = [];
    const validCoordinates: DiagramCoordinates[] = [];

    // Validate each coordinate individually
    for (let i = 0; i < coordinatesArray.length; i++) {
      const coords = coordinatesArray[i];
      const validation = this.validateCoordinates(coords, imageDimensions);
      
      if (!validation.isValid) {
        errors.push(`Coordinate ${i + 1}: ${validation.errors.join(', ')}`);
      } else if (validation.sanitizedCoordinates) {
        validCoordinates.push(validation.sanitizedCoordinates);
      }
    }

    // Check for overlaps if not allowed
    if (!allowOverlaps && validCoordinates.length > 1) {
      for (let i = 0; i < validCoordinates.length; i++) {
        for (let j = i + 1; j < validCoordinates.length; j++) {
          const overlapPercentage = this.calculateOverlapPercentage(
            validCoordinates[i], 
            validCoordinates[j]
          );
          
          if (overlapPercentage > 10) { // Allow up to 10% overlap
            errors.push(`Coordinates ${i + 1} and ${j + 1} overlap by ${overlapPercentage.toFixed(1)}%`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedCoordinates: errors.length === 0 ? validCoordinates[0] : undefined
    };
  }

  private isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * Advanced validation with custom rules
   */
  validateWithCustomRules(
    coords: DiagramCoordinates, 
    imageDimensions: ImageDimensions,
    rules?: {
      minSize?: { width: number; height: number }
      maxSize?: { width: number; height: number }
      aspectRatioRange?: { min: number; max: number }
      allowedTypes?: DiagramType[]
      minConfidence?: number
    }
  ): CoordinateValidationResult {
    const errors: string[] = []
    
    // Run basic validation first
    const basicValidation = this.validateCoordinates(coords, imageDimensions)
    if (!basicValidation.isValid) {
      return basicValidation
    }

    // Apply custom rules if provided
    if (rules) {
      // Size constraints
      if (rules.minSize) {
        const width = coords.x2 - coords.x1
        const height = coords.y2 - coords.y1
        if (width < rules.minSize.width || height < rules.minSize.height) {
          errors.push(`Diagram must be at least ${rules.minSize.width}x${rules.minSize.height}px`)
        }
      }

      if (rules.maxSize) {
        const width = coords.x2 - coords.x1
        const height = coords.y2 - coords.y1
        if (width > rules.maxSize.width || height > rules.maxSize.height) {
          errors.push(`Diagram must not exceed ${rules.maxSize.width}x${rules.maxSize.height}px`)
        }
      }

      // Aspect ratio constraints
      if (rules.aspectRatioRange) {
        const aspectRatio = (coords.x2 - coords.x1) / (coords.y2 - coords.y1)
        if (aspectRatio < rules.aspectRatioRange.min || aspectRatio > rules.aspectRatioRange.max) {
          errors.push(`Aspect ratio must be between ${rules.aspectRatioRange.min} and ${rules.aspectRatioRange.max}`)
        }
      }

      // Type constraints
      if (rules.allowedTypes && !rules.allowedTypes.includes(coords.type)) {
        errors.push(`Diagram type '${coords.type}' is not allowed`)
      }

      // Confidence constraints
      if (rules.minConfidence && coords.confidence < rules.minConfidence) {
        errors.push(`Confidence ${coords.confidence} is below minimum ${rules.minConfidence}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedCoordinates: errors.length === 0 ? basicValidation.sanitizedCoordinates : undefined
    }
  }

  /**
   * Validate coordinates for specific diagram types
   */
  validateForDiagramType(
    coords: DiagramCoordinates, 
    imageDimensions: ImageDimensions
  ): CoordinateValidationResult {
    const typeSpecificRules = this.getTypeSpecificRules(coords.type)
    return this.validateWithCustomRules(coords, imageDimensions, typeSpecificRules)
  }

  /**
   * Get validation rules specific to diagram types
   */
  private getTypeSpecificRules(type: DiagramType): {
    minSize?: { width: number; height: number }
    maxSize?: { width: number; height: number }
    aspectRatioRange?: { min: number; max: number }
    minConfidence?: number
  } {
    switch (type) {
      case 'graph':
        return {
          minSize: { width: 100, height: 80 },
          aspectRatioRange: { min: 0.5, max: 3.0 },
          minConfidence: 0.6
        }
      
      case 'table':
        return {
          minSize: { width: 150, height: 60 },
          aspectRatioRange: { min: 1.5, max: 8.0 },
          minConfidence: 0.7
        }
      
      case 'flowchart':
        return {
          minSize: { width: 80, height: 100 },
          aspectRatioRange: { min: 0.3, max: 2.0 },
          minConfidence: 0.5
        }
      
      case 'scientific':
        return {
          minSize: { width: 120, height: 120 },
          aspectRatioRange: { min: 0.5, max: 2.0 },
          minConfidence: 0.6
        }
      
      case 'geometric':
        return {
          minSize: { width: 60, height: 60 },
          aspectRatioRange: { min: 0.5, max: 2.0 },
          minConfidence: 0.7
        }
      
      case 'circuit':
        return {
          minSize: { width: 100, height: 80 },
          aspectRatioRange: { min: 0.8, max: 3.0 },
          minConfidence: 0.6
        }
      
      case 'map':
        return {
          minSize: { width: 150, height: 100 },
          aspectRatioRange: { min: 0.7, max: 2.5 },
          minConfidence: 0.5
        }
      
      default:
        return {
          minSize: { width: 50, height: 50 },
          aspectRatioRange: { min: 0.2, max: 5.0 },
          minConfidence: 0.4
        }
    }
  }

  /**
   * Batch validate multiple coordinates with performance optimization
   */
  batchValidateCoordinates(
    coordinatesArray: DiagramCoordinates[],
    imageDimensions: ImageDimensions,
    options?: {
      allowOverlaps?: boolean
      maxOverlapPercentage?: number
      validateTypes?: boolean
      parallelProcessing?: boolean
    }
  ): {
    results: Array<{ index: number; result: CoordinateValidationResult }>
    summary: {
      totalValid: number
      totalInvalid: number
      commonErrors: string[]
    }
  } {
    const opts = {
      allowOverlaps: false,
      maxOverlapPercentage: 10,
      validateTypes: true,
      parallelProcessing: false,
      ...options
    }

    const results: Array<{ index: number; result: CoordinateValidationResult }> = []
    const allErrors: string[] = []

    // Validate each coordinate
    for (let i = 0; i < coordinatesArray.length; i++) {
      const coords = coordinatesArray[i]
      
      let result: CoordinateValidationResult
      if (opts.validateTypes) {
        result = this.validateForDiagramType(coords, imageDimensions)
      } else {
        result = this.validateCoordinates(coords, imageDimensions)
      }

      results.push({ index: i, result })
      allErrors.push(...result.errors)
    }

    // Check for overlaps if not allowed
    if (!opts.allowOverlaps) {
      const validCoordinates = results
        .filter(r => r.result.isValid)
        .map(r => ({ index: r.index, coords: coordinatesArray[r.index] }))

      for (let i = 0; i < validCoordinates.length; i++) {
        for (let j = i + 1; j < validCoordinates.length; j++) {
          const overlap = this.calculateOverlapPercentage(
            validCoordinates[i].coords,
            validCoordinates[j].coords
          )
          
          if (overlap > opts.maxOverlapPercentage) {
            const errorMsg = `Coordinates ${validCoordinates[i].index + 1} and ${validCoordinates[j].index + 1} overlap by ${overlap.toFixed(1)}%`
            
            // Add error to both coordinates
            results[validCoordinates[i].index].result.errors.push(errorMsg)
            results[validCoordinates[j].index].result.errors.push(errorMsg)
            results[validCoordinates[i].index].result.isValid = false
            results[validCoordinates[j].index].result.isValid = false
            
            allErrors.push(errorMsg)
          }
        }
      }
    }

    // Generate summary
    const totalValid = results.filter(r => r.result.isValid).length
    const totalInvalid = results.length - totalValid
    
    // Find common errors
    const errorCounts = new Map<string, number>()
    allErrors.forEach(error => {
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
    })
    
    const commonErrors = Array.from(errorCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, _]) => error)

    return {
      results,
      summary: {
        totalValid,
        totalInvalid,
        commonErrors
      }
    }
  }

  /**
   * Auto-correct common coordinate issues
   */
  autoCorrectCoordinates(
    coords: DiagramCoordinates,
    imageDimensions: ImageDimensions,
    options?: {
      snapToGrid?: number
      enforceMinSize?: boolean
      adjustAspectRatio?: boolean
      targetAspectRatio?: number
    }
  ): {
    corrected: DiagramCoordinates
    corrections: string[]
  } {
    const corrections: string[] = []
    let corrected = { ...coords }

    // Sanitize first
    corrected = this.sanitizeCoordinates(corrected, imageDimensions)
    corrections.push('Applied basic sanitization')

    // Snap to grid if requested
    if (options?.snapToGrid) {
      const snapped = coordinateUtils.snapToGrid(corrected, options.snapToGrid)
      if (snapped.x1 !== corrected.x1 || snapped.y1 !== corrected.y1 || 
          snapped.x2 !== corrected.x2 || snapped.y2 !== corrected.y2) {
        corrected = snapped
        corrections.push(`Snapped to ${options.snapToGrid}px grid`)
      }
    }

    // Enforce minimum size
    if (options?.enforceMinSize) {
      const minSize = 50
      const width = corrected.x2 - corrected.x1
      const height = corrected.y2 - corrected.y1

      if (width < minSize || height < minSize) {
        const centerX = (corrected.x1 + corrected.x2) / 2
        const centerY = (corrected.y1 + corrected.y2) / 2
        
        corrected.x1 = Math.max(0, centerX - minSize / 2)
        corrected.y1 = Math.max(0, centerY - minSize / 2)
        corrected.x2 = Math.min(imageDimensions.width, centerX + minSize / 2)
        corrected.y2 = Math.min(imageDimensions.height, centerY + minSize / 2)
        
        corrections.push(`Enforced minimum size of ${minSize}px`)
      }
    }

    // Adjust aspect ratio
    if (options?.adjustAspectRatio && options?.targetAspectRatio) {
      const currentRatio = (corrected.x2 - corrected.x1) / (corrected.y2 - corrected.y1)
      const targetRatio = options.targetAspectRatio

      if (Math.abs(currentRatio - targetRatio) > 0.1) {
        const centerX = (corrected.x1 + corrected.x2) / 2
        const centerY = (corrected.y1 + corrected.y2) / 2
        const currentHeight = corrected.y2 - corrected.y1
        const newWidth = currentHeight * targetRatio

        corrected.x1 = Math.max(0, centerX - newWidth / 2)
        corrected.x2 = Math.min(imageDimensions.width, centerX + newWidth / 2)
        
        corrections.push(`Adjusted aspect ratio to ${targetRatio.toFixed(2)}`)
      }
    }

    return { corrected, corrections }
  }
}

/**
 * Utility functions for coordinate operations
 */
export const coordinateUtils = {
  /**
   * Generate a unique ID for coordinate sets
   */
  generateCoordinateId(coords: DiagramCoordinates): string {
    return `coord_${coords.x1}_${coords.y1}_${coords.x2}_${coords.y2}_${Date.now()}`;
  },

  /**
   * Create default coordinates for a given image size
   */
  createDefaultCoordinates(imageDimensions: ImageDimensions): DiagramCoordinates {
    const centerX = imageDimensions.width / 2;
    const centerY = imageDimensions.height / 2;
    const defaultSize = Math.min(imageDimensions.width, imageDimensions.height) * 0.3;

    return {
      x1: centerX - defaultSize / 2,
      y1: centerY - defaultSize / 2,
      x2: centerX + defaultSize / 2,
      y2: centerY + defaultSize / 2,
      confidence: 1.0,
      type: 'other',
      description: 'Manual selection'
    };
  },

  /**
   * Check if coordinates represent a reasonable diagram size
   */
  isReasonableSize(coords: DiagramCoordinates, imageDimensions: ImageDimensions): boolean {
    const area = (coords.x2 - coords.x1) * (coords.y2 - coords.y1);
    const imageArea = imageDimensions.width * imageDimensions.height;
    const areaPercentage = (area / imageArea) * 100;

    // Diagram should be between 1% and 80% of image area
    return areaPercentage >= 1 && areaPercentage <= 80;
  },

  /**
   * Snap coordinates to a grid for better alignment
   */
  snapToGrid(coords: DiagramCoordinates, gridSize = 5): DiagramCoordinates {
    const snapValue = (value: number) => Math.round(value / gridSize) * gridSize;

    return {
      ...coords,
      x1: snapValue(coords.x1),
      y1: snapValue(coords.y1),
      x2: snapValue(coords.x2),
      y2: snapValue(coords.y2)
    };
  }
};

export default CoordinateValidator;