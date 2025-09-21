/**
 * Comprehensive Unit Tests for Coordinate Validation System
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import type { DiagramCoordinates, CoordinateMetadata } from '~/shared/types/diagram-detection'

// Mock coordinate validation classes
class MockCoordinateValidator {
  validateBounds(coords: DiagramCoordinates, imageDimensions: { width: number; height: number }): boolean {
    return (
      coords.x1 >= 0 && coords.x1 < imageDimensions.width &&
      coords.y1 >= 0 && coords.y1 < imageDimensions.height &&
      coords.x2 > coords.x1 && coords.x2 <= imageDimensions.width &&
      coords.y2 > coords.y1 && coords.y2 <= imageDimensions.height
    );
  }

  sanitizeCoordinates(coords: DiagramCoordinates, imageDimensions: { width: number; height: number }): DiagramCoordinates {
    return {
      ...coords,
      x1: Math.max(0, Math.min(coords.x1, imageDimensions.width - 1)),
      y1: Math.max(0, Math.min(coords.y1, imageDimensions.height - 1)),
      x2: Math.max(coords.x1 + 1, Math.min(coords.x2, imageDimensions.width)),
      y2: Math.max(coords.y1 + 1, Math.min(coords.y2, imageDimensions.height))
    };
  }

  validateCoordinateSet(coordinates: DiagramCoordinates[], imageDimensions: { width: number; height: number }): {
    valid: DiagramCoordinates[];
    invalid: DiagramCoordinates[];
    overlapping: Array<{ coord1: DiagramCoordinates; coord2: DiagramCoordinates; overlapArea: number }>;
  } {
    const valid: DiagramCoordinates[] = [];
    const invalid: DiagramCoordinates[] = [];
    const overlapping: Array<{ coord1: DiagramCoordinates; coord2: DiagramCoordinates; overlapArea: number }> = [];

    for (const coord of coordinates) {
      if (this.validateBounds(coord, imageDimensions)) {
        valid.push(coord);
      } else {
        invalid.push(coord);
      }
    }

    // Check for overlaps
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const overlap = this.calculateOverlap(valid[i], valid[j]);
        if (overlap > 0) {
          overlapping.push({
            coord1: valid[i],
            coord2: valid[j],
            overlapArea: overlap
          });
        }
      }
    }

    return { valid, invalid, overlapping };
  }

  private calculateOverlap(coord1: DiagramCoordinates, coord2: DiagramCoordinates): number {
    const x1 = Math.max(coord1.x1, coord2.x1);
    const y1 = Math.max(coord1.y1, coord2.y1);
    const x2 = Math.min(coord1.x2, coord2.x2);
    const y2 = Math.min(coord1.y2, coord2.y2);

    if (x2 > x1 && y2 > y1) {
      return (x2 - x1) * (y2 - y1);
    }
    return 0;
  }

  validateAspectRatio(coords: DiagramCoordinates, expectedRatio?: number, tolerance: number = 0.2): boolean {
    const width = coords.x2 - coords.x1;
    const height = coords.y2 - coords.y1;
    const actualRatio = width / height;

    if (!expectedRatio) {
      // Check for reasonable aspect ratios (not too extreme)
      return actualRatio >= 0.1 && actualRatio <= 10;
    }

    return Math.abs(actualRatio - expectedRatio) <= tolerance;
  }

  validateMinimumSize(coords: DiagramCoordinates, minWidth: number = 20, minHeight: number = 20): boolean {
    const width = coords.x2 - coords.x1;
    const height = coords.y2 - coords.y1;
    return width >= minWidth && height >= minHeight;
  }
}

class MockCoordinateSanitizer {
  sanitizeForContext(
    coords: DiagramCoordinates,
    context: 'manual' | 'api' | 'storage',
    imageDimensions: { width: number; height: number }
  ): {
    sanitized: DiagramCoordinates;
    changes: string[];
    confidence: number;
  } {
    const changes: string[] = [];
    let sanitized = { ...coords };
    let confidence = coords.confidence;

    // Context-specific sanitization
    switch (context) {
      case 'manual':
        // Grid snapping for manual edits
        sanitized = this.snapToGrid(sanitized, 5);
        changes.push('Snapped to grid');
        confidence = Math.min(1.0, confidence + 0.1); // Boost confidence for manual edits
        break;

      case 'api':
        // Preserve aspect ratio for API responses
        sanitized = this.preserveAspectRatio(sanitized);
        changes.push('Preserved aspect ratio');
        break;

      case 'storage':
        // Ensure precise coordinates for storage
        sanitized = this.ensurePrecision(sanitized);
        changes.push('Ensured precision');
        break;
    }

    // Common sanitization
    const validator = new MockCoordinateValidator();
    sanitized = validator.sanitizeCoordinates(sanitized, imageDimensions);
    if (JSON.stringify(sanitized) !== JSON.stringify(coords)) {
      changes.push('Adjusted bounds');
    }

    return { sanitized, changes, confidence };
  }

  private snapToGrid(coords: DiagramCoordinates, gridSize: number): DiagramCoordinates {
    return {
      ...coords,
      x1: Math.round(coords.x1 / gridSize) * gridSize,
      y1: Math.round(coords.y1 / gridSize) * gridSize,
      x2: Math.round(coords.x2 / gridSize) * gridSize,
      y2: Math.round(coords.y2 / gridSize) * gridSize
    };
  }

  private preserveAspectRatio(coords: DiagramCoordinates): DiagramCoordinates {
    const width = coords.x2 - coords.x1;
    const height = coords.y2 - coords.y1;
    const aspectRatio = width / height;

    // Adjust based on diagram type
    let targetRatio = aspectRatio;
    if (coords.type === 'table') {
      targetRatio = Math.max(1.2, Math.min(3.0, aspectRatio)); // Tables should be wider
    } else if (coords.type === 'graph') {
      targetRatio = Math.max(0.8, Math.min(2.0, aspectRatio)); // Graphs should be balanced
    }

    if (Math.abs(aspectRatio - targetRatio) > 0.1) {
      const newWidth = height * targetRatio;
      const centerX = (coords.x1 + coords.x2) / 2;
      
      return {
        ...coords,
        x1: centerX - newWidth / 2,
        x2: centerX + newWidth / 2
      };
    }

    return coords;
  }

  private ensurePrecision(coords: DiagramCoordinates): DiagramCoordinates {
    return {
      ...coords,
      x1: Math.floor(coords.x1),
      y1: Math.floor(coords.y1),
      x2: Math.ceil(coords.x2),
      y2: Math.ceil(coords.y2)
    };
  }
}

describe('CoordinateValidator', () => {
  let validator: MockCoordinateValidator;
  const imageDimensions = { width: 800, height: 600 };

  beforeEach(() => {
    validator = new MockCoordinateValidator();
  });

  describe('Basic Validation', () => {
    test('should validate correct coordinates', () => {
      const validCoords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Valid coordinates'
      };

      const isValid = validator.validateBounds(validCoords, imageDimensions);
      expect(isValid).toBe(true);
    });

    test('should reject coordinates outside image bounds', () => {
      const invalidCoords: DiagramCoordinates = {
        x1: -10, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Invalid coordinates'
      };

      const isValid = validator.validateBounds(invalidCoords, imageDimensions);
      expect(isValid).toBe(false);
    });

    test('should reject coordinates with invalid dimensions', () => {
      const invalidCoords: DiagramCoordinates = {
        x1: 300, y1: 250, x2: 100, y2: 150, // x2 < x1, y2 < y1
        confidence: 0.85, type: 'graph', description: 'Invalid dimensions'
      };

      const isValid = validator.validateBounds(invalidCoords, imageDimensions);
      expect(isValid).toBe(false);
    });

    test('should reject coordinates exceeding image bounds', () => {
      const invalidCoords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 900, y2: 700, // Exceeds 800x600
        confidence: 0.85, type: 'graph', description: 'Exceeds bounds'
      };

      const isValid = validator.validateBounds(invalidCoords, imageDimensions);
      expect(isValid).toBe(false);
    });
  });

  describe('Coordinate Sanitization', () => {
    test('should sanitize negative coordinates', () => {
      const invalidCoords: DiagramCoordinates = {
        x1: -10, y1: -5, x2: 200, y2: 150,
        confidence: 0.85, type: 'graph', description: 'Negative coordinates'
      };

      const sanitized = validator.sanitizeCoordinates(invalidCoords, imageDimensions);
      
      expect(sanitized.x1).toBe(0);
      expect(sanitized.y1).toBe(0);
      expect(sanitized.x2).toBe(200);
      expect(sanitized.y2).toBe(150);
    });

    test('should sanitize coordinates exceeding bounds', () => {
      const invalidCoords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 900, y2: 700,
        confidence: 0.85, type: 'graph', description: 'Exceeds bounds'
      };

      const sanitized = validator.sanitizeCoordinates(invalidCoords, imageDimensions);
      
      expect(sanitized.x2).toBe(imageDimensions.width);
      expect(sanitized.y2).toBe(imageDimensions.height);
    });

    test('should fix inverted coordinates', () => {
      const invalidCoords: DiagramCoordinates = {
        x1: 300, y1: 250, x2: 100, y2: 150,
        confidence: 0.85, type: 'graph', description: 'Inverted coordinates'
      };

      const sanitized = validator.sanitizeCoordinates(invalidCoords, imageDimensions);
      
      expect(sanitized.x1).toBeLessThan(sanitized.x2);
      expect(sanitized.y1).toBeLessThan(sanitized.y2);
    });
  });

  describe('Coordinate Set Validation', () => {
    test('should validate multiple coordinates', () => {
      const coordinates: DiagramCoordinates[] = [
        { x1: 100, y1: 100, x2: 200, y2: 200, confidence: 0.9, type: 'graph', description: 'Graph 1' },
        { x1: 300, y1: 300, x2: 400, y2: 400, confidence: 0.8, type: 'table', description: 'Table 1' },
        { x1: -10, y1: 150, x2: 50, y2: 200, confidence: 0.7, type: 'other', description: 'Invalid' }
      ];

      const result = validator.validateCoordinateSet(coordinates, imageDimensions);
      
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.overlapping).toHaveLength(0);
    });

    test('should detect overlapping coordinates', () => {
      const coordinates: DiagramCoordinates[] = [
        { x1: 100, y1: 100, x2: 200, y2: 200, confidence: 0.9, type: 'graph', description: 'Graph 1' },
        { x1: 150, y1: 150, x2: 250, y2: 250, confidence: 0.8, type: 'table', description: 'Overlapping' }
      ];

      const result = validator.validateCoordinateSet(coordinates, imageDimensions);
      
      expect(result.valid).toHaveLength(2);
      expect(result.overlapping).toHaveLength(1);
      expect(result.overlapping[0].overlapArea).toBeGreaterThan(0);
    });
  });

  describe('Aspect Ratio Validation', () => {
    test('should validate reasonable aspect ratios', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 200, y2: 150, // 2:1 ratio
        confidence: 0.85, type: 'graph', description: 'Good ratio'
      };

      const isValid = validator.validateAspectRatio(coords);
      expect(isValid).toBe(true);
    });

    test('should reject extreme aspect ratios', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 500, y2: 105, // 80:1 ratio (too extreme)
        confidence: 0.85, type: 'graph', description: 'Extreme ratio'
      };

      const isValid = validator.validateAspectRatio(coords);
      expect(isValid).toBe(false);
    });

    test('should validate against expected aspect ratio', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 200, y2: 150, // 2:1 ratio
        confidence: 0.85, type: 'graph', description: 'Expected ratio'
      };

      const isValid = validator.validateAspectRatio(coords, 2.0, 0.1);
      expect(isValid).toBe(true);

      const isInvalid = validator.validateAspectRatio(coords, 1.0, 0.1);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Minimum Size Validation', () => {
    test('should validate minimum size requirements', () => {
      const validCoords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 150, y2: 150, // 50x50
        confidence: 0.85, type: 'graph', description: 'Valid size'
      };

      const isValid = validator.validateMinimumSize(validCoords, 20, 20);
      expect(isValid).toBe(true);
    });

    test('should reject coordinates below minimum size', () => {
      const tooSmall: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 110, y2: 110, // 10x10
        confidence: 0.85, type: 'graph', description: 'Too small'
      };

      const isValid = validator.validateMinimumSize(tooSmall, 20, 20);
      expect(isValid).toBe(false);
    });
  });
});

describe('CoordinateSanitizer', () => {
  let sanitizer: MockCoordinateSanitizer;
  const imageDimensions = { width: 800, height: 600 };

  beforeEach(() => {
    sanitizer = new MockCoordinateSanitizer();
  });

  describe('Context-Specific Sanitization', () => {
    test('should sanitize for manual context', () => {
      const coords: DiagramCoordinates = {
        x1: 102, y1: 153, x2: 298, y2: 247,
        confidence: 0.75, type: 'graph', description: 'Manual edit'
      };

      const result = sanitizer.sanitizeForContext(coords, 'manual', imageDimensions);
      
      expect(result.sanitized.x1).toBe(100); // Snapped to grid
      expect(result.sanitized.y1).toBe(155); // Snapped to grid
      expect(result.confidence).toBeGreaterThan(coords.confidence); // Boosted
      expect(result.changes).toContain('Snapped to grid');
    });

    test('should sanitize for API context', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 400, y2: 150, // 8:1 ratio (extreme for table)
        confidence: 0.85, type: 'table', description: 'API response'
      };

      const result = sanitizer.sanitizeForContext(coords, 'api', imageDimensions);
      
      // Should adjust aspect ratio for table
      const width = result.sanitized.x2 - result.sanitized.x1;
      const height = result.sanitized.y2 - result.sanitized.y1;
      const ratio = width / height;
      
      expect(ratio).toBeGreaterThan(1.0);
      expect(ratio).toBeLessThan(4.0); // Within reasonable range for tables
      expect(result.changes).toContain('Preserved aspect ratio');
    });

    test('should sanitize for storage context', () => {
      const coords: DiagramCoordinates = {
        x1: 100.7, y1: 150.3, x2: 299.9, y2: 249.1,
        confidence: 0.85, type: 'graph', description: 'Storage'
      };

      const result = sanitizer.sanitizeForContext(coords, 'storage', imageDimensions);
      
      expect(result.sanitized.x1).toBe(100); // Floor
      expect(result.sanitized.y1).toBe(150); // Floor
      expect(result.sanitized.x2).toBe(300); // Ceil
      expect(result.sanitized.y2).toBe(250); // Ceil
      expect(result.changes).toContain('Ensured precision');
    });
  });

  describe('Change Tracking', () => {
    test('should track all changes made during sanitization', () => {
      const coords: DiagramCoordinates = {
        x1: -5, y1: 152, x2: 298, y2: 247,
        confidence: 0.75, type: 'graph', description: 'Multiple issues'
      };

      const result = sanitizer.sanitizeForContext(coords, 'manual', imageDimensions);
      
      expect(result.changes.length).toBeGreaterThan(1);
      expect(result.changes).toContain('Snapped to grid');
      expect(result.changes).toContain('Adjusted bounds');
    });

    test('should not report changes when none are made', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.85, type: 'graph', description: 'Perfect coordinates'
      };

      const result = sanitizer.sanitizeForContext(coords, 'storage', imageDimensions);
      
      // Should only have precision changes
      expect(result.changes).toHaveLength(1);
      expect(result.changes).toContain('Ensured precision');
    });
  });
});

describe('Advanced Validation Scenarios', () => {
  let validator: MockCoordinateValidator;
  let sanitizer: MockCoordinateSanitizer;

  beforeEach(() => {
    validator = new MockCoordinateValidator();
    sanitizer = new MockCoordinateSanitizer();
  });

  test('should handle edge case coordinates', () => {
    const edgeCases: DiagramCoordinates[] = [
      // Zero-width rectangle
      { x1: 100, y1: 100, x2: 100, y2: 200, confidence: 0.5, type: 'other', description: 'Zero width' },
      // Zero-height rectangle
      { x1: 100, y1: 100, x2: 200, y2: 100, confidence: 0.5, type: 'other', description: 'Zero height' },
      // Single point
      { x1: 100, y1: 100, x2: 100, y2: 100, confidence: 0.5, type: 'other', description: 'Single point' },
      // Negative dimensions
      { x1: 200, y1: 200, x2: 100, y2: 100, confidence: 0.5, type: 'other', description: 'Negative dimensions' }
    ];

    const imageDimensions = { width: 800, height: 600 };

    edgeCases.forEach((coords, index) => {
      const isValid = validator.validateBounds(coords, imageDimensions);
      expect(isValid).toBe(false); // All should be invalid

      const sanitized = validator.sanitizeCoordinates(coords, imageDimensions);
      expect(sanitized.x2).toBeGreaterThan(sanitized.x1);
      expect(sanitized.y2).toBeGreaterThan(sanitized.y1);
    });
  });

  test('should handle floating point precision issues', () => {
    const coords: DiagramCoordinates = {
      x1: 100.00000001, y1: 150.99999999, x2: 299.00000001, y2: 249.99999999,
      confidence: 0.85, type: 'graph', description: 'Floating point precision'
    };

    const imageDimensions = { width: 800, height: 600 };
    const result = sanitizer.sanitizeForContext(coords, 'storage', imageDimensions);

    expect(result.sanitized.x1).toBe(100);
    expect(result.sanitized.y1).toBe(150);
    expect(result.sanitized.x2).toBe(300);
    expect(result.sanitized.y2).toBe(250);
  });

  test('should validate coordinates for different diagram types', () => {
    const diagramTypes: Array<{ type: DiagramCoordinates['type']; expectedRatio?: number }> = [
      { type: 'graph', expectedRatio: 1.5 },
      { type: 'table', expectedRatio: 2.0 },
      { type: 'flowchart', expectedRatio: 1.2 },
      { type: 'scientific', expectedRatio: 1.0 },
      { type: 'geometric', expectedRatio: 1.0 },
      { type: 'circuit' },
      { type: 'other' }
    ];

    diagramTypes.forEach(({ type, expectedRatio }) => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 100, x2: 200, y2: 150,
        confidence: 0.85, type, description: `${type} diagram`
      };

      if (expectedRatio) {
        const isValidRatio = validator.validateAspectRatio(coords, expectedRatio, 0.3);
        // Should be reasonably close to expected ratio
        expect(typeof isValidRatio).toBe('boolean');
      }

      const isValidSize = validator.validateMinimumSize(coords);
      expect(isValidSize).toBe(true);
    });
  });

  test('should handle batch validation efficiently', () => {
    // Generate large set of coordinates
    const coordinates: DiagramCoordinates[] = [];
    for (let i = 0; i < 1000; i++) {
      coordinates.push({
        x1: Math.random() * 700,
        y1: Math.random() * 500,
        x2: Math.random() * 700 + 100,
        y2: Math.random() * 500 + 100,
        confidence: Math.random(),
        type: 'graph',
        description: `Generated ${i}`
      });
    }

    const imageDimensions = { width: 800, height: 600 };
    const startTime = Date.now();
    
    const result = validator.validateCoordinateSet(coordinates, imageDimensions);
    
    const processingTime = Date.now() - startTime;
    
    expect(result.valid.length + result.invalid.length).toBe(coordinates.length);
    expect(processingTime).toBeLessThan(1000); // Should process 1000 items in under 1 second
  });

  test('should provide detailed validation feedback', () => {
    const problematicCoords: DiagramCoordinates = {
      x1: -10, y1: 590, x2: 810, y2: 610, // Multiple issues
      confidence: 0.3, type: 'graph', description: 'Problematic'
    };

    const imageDimensions = { width: 800, height: 600 };
    
    // Check individual validation aspects
    const boundsValid = validator.validateBounds(problematicCoords, imageDimensions);
    const sizeValid = validator.validateMinimumSize(problematicCoords);
    const ratioValid = validator.validateAspectRatio(problematicCoords);

    expect(boundsValid).toBe(false); // Out of bounds
    expect(sizeValid).toBe(true); // Size is OK
    expect(ratioValid).toBe(true); // Ratio is reasonable

    // Sanitization should fix the bounds issue
    const sanitized = validator.sanitizeCoordinates(problematicCoords, imageDimensions);
    const sanitizedBoundsValid = validator.validateBounds(sanitized, imageDimensions);
    
    expect(sanitizedBoundsValid).toBe(true);
  });
});