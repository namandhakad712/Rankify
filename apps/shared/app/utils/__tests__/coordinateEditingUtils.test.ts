/**
 * Unit Tests for Coordinate Editing Utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CoordinateEditor, CoordinateEditingUtils } from '../coordinateEditingUtils'
import type { DiagramCoordinates, ImageDimensions } from '~/shared/types/diagram-detection'

describe('CoordinateEditor', () => {
  let editor: CoordinateEditor
  let mockCoordinates: DiagramCoordinates
  let mockImageDimensions: ImageDimensions
  let mockCanvasState: any

  beforeEach(() => {
    mockCoordinates = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test diagram'
    }

    mockImageDimensions = {
      width: 800,
      height: 600
    }

    mockCanvasState = {
      scale: 1.0,
      offset: { x: 0, y: 0 },
      width: 800,
      height: 600
    }

    editor = new CoordinateEditor(
      mockCoordinates,
      mockImageDimensions,
      mockCanvasState,
      { minSize: 10 }
    )
  })

  describe('initialization', () => {
    it('should initialize with correct coordinates', () => {
      const state = editor.getEditingState()
      expect(state.currentCoordinates).toEqual(mockCoordinates)
      expect(state.originalCoordinates).toEqual(mockCoordinates)
      expect(state.isEditing).toBe(false)
      expect(state.isDragging).toBe(false)
    })
  })

  describe('handle detection', () => {
    it('should detect top-left handle', () => {
      const handle = editor.getHandleAtPosition(100, 150)
      expect(handle).toBe('tl')
    })

    it('should detect top-right handle', () => {
      const handle = editor.getHandleAtPosition(300, 150)
      expect(handle).toBe('tr')
    })

    it('should detect bottom-left handle', () => {
      const handle = editor.getHandleAtPosition(100, 250)
      expect(handle).toBe('bl')
    })

    it('should detect bottom-right handle', () => {
      const handle = editor.getHandleAtPosition(300, 250)
      expect(handle).toBe('br')
    })

    it('should detect move handle inside selection', () => {
      const handle = editor.getHandleAtPosition(200, 200)
      expect(handle).toBe('move')
    })

    it('should return null for positions outside selection', () => {
      const handle = editor.getHandleAtPosition(50, 50)
      expect(handle).toBe(null)
    })
  })

  describe('cursor styles', () => {
    it('should return correct cursor for each handle', () => {
      expect(editor.getCursorForHandle('tl')).toBe('nw-resize')
      expect(editor.getCursorForHandle('tr')).toBe('ne-resize')
      expect(editor.getCursorForHandle('bl')).toBe('sw-resize')
      expect(editor.getCursorForHandle('br')).toBe('se-resize')
      expect(editor.getCursorForHandle('move')).toBe('move')
      expect(editor.getCursorForHandle(null)).toBe('default')
    })
  })

  describe('editing operations', () => {
    it('should start editing when clicking on a handle', () => {
      const started = editor.startEdit({ x: 100, y: 150 })
      expect(started).toBe(true)
      
      const state = editor.getEditingState()
      expect(state.isEditing).toBe(true)
      expect(state.isDragging).toBe(true)
      expect(state.dragHandle).toBe('tl')
    })

    it('should not start editing when clicking outside selection', () => {
      const started = editor.startEdit({ x: 50, y: 50 })
      expect(started).toBe(false)
      
      const state = editor.getEditingState()
      expect(state.isEditing).toBe(false)
      expect(state.isDragging).toBe(false)
    })

    it('should update coordinates during drag operation', () => {
      editor.startEdit({ x: 100, y: 150 })
      const newCoords = editor.updateEdit({ x: 110, y: 160 })
      
      expect(newCoords).toBeTruthy()
      expect(newCoords!.x1).toBe(110)
      expect(newCoords!.y1).toBe(160)
      expect(newCoords!.x2).toBe(300)
      expect(newCoords!.y2).toBe(250)
    })

    it('should end editing and return final coordinates', () => {
      editor.startEdit({ x: 100, y: 150 })
      editor.updateEdit({ x: 110, y: 160 })
      const finalCoords = editor.endEdit()
      
      expect(finalCoords.x1).toBe(110)
      expect(finalCoords.y1).toBe(160)
      
      const state = editor.getEditingState()
      expect(state.isEditing).toBe(false)
      expect(state.isDragging).toBe(false)
    })

    it('should cancel editing and restore original coordinates', () => {
      editor.startEdit({ x: 100, y: 150 })
      editor.updateEdit({ x: 110, y: 160 })
      const restoredCoords = editor.cancelEdit()
      
      expect(restoredCoords).toEqual(mockCoordinates)
      
      const state = editor.getEditingState()
      expect(state.isEditing).toBe(false)
      expect(state.isDragging).toBe(false)
    })
  })

  describe('coordinate validation', () => {
    it('should validate correct coordinates', () => {
      const result = editor.validateCoordinates()
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect out-of-bounds coordinates', () => {
      editor.updateCoordinatesFromInput({ x1: -10, y1: -10 })
      const result = editor.validateCoordinates()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('X1 coordinate is out of image bounds')
      expect(result.errors).toContain('Y1 coordinate is out of image bounds')
    })

    it('should detect invalid coordinate order', () => {
      editor.updateCoordinatesFromInput({ x2: 50, y2: 100 })
      const result = editor.validateCoordinates()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('X2 must be greater than X1')
      expect(result.errors).toContain('Y2 must be greater than Y1')
    })

    it('should detect coordinates below minimum size', () => {
      editor.updateCoordinatesFromInput({ x2: 105, y2: 155 })
      const result = editor.validateCoordinates()
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Width must be at least 10 pixels')
      expect(result.errors).toContain('Height must be at least 10 pixels')
    })
  })

  describe('coordinate constraints', () => {
    it('should enforce minimum size when dragging', () => {
      editor.startEdit({ x: 300, y: 250 }) // Bottom-right handle
      const newCoords = editor.updateEdit({ x: 105, y: 155 }) // Try to make it too small
      
      expect(newCoords).toBeTruthy()
      expect(newCoords!.x2 - newCoords!.x1).toBeGreaterThanOrEqual(10)
      expect(newCoords!.y2 - newCoords!.y1).toBeGreaterThanOrEqual(10)
    })

    it('should constrain coordinates to image bounds', () => {
      editor.startEdit({ x: 100, y: 150 }) // Top-left handle
      const newCoords = editor.updateEdit({ x: -50, y: -50 }) // Try to go outside bounds
      
      expect(newCoords).toBeTruthy()
      expect(newCoords!.x1).toBeGreaterThanOrEqual(0)
      expect(newCoords!.y1).toBeGreaterThanOrEqual(0)
    })
  })

  describe('manual coordinate updates', () => {
    it('should update coordinates from manual input', () => {
      const newCoords = editor.updateCoordinatesFromInput({ x1: 120, y1: 170 })
      
      expect(newCoords.x1).toBe(120)
      expect(newCoords.y1).toBe(170)
      expect(newCoords.x2).toBe(300)
      expect(newCoords.y2).toBe(250)
    })

    it('should apply constraints to manual input', () => {
      const newCoords = editor.updateCoordinatesFromInput({ x1: -10, y1: -10 })
      
      expect(newCoords.x1).toBeGreaterThanOrEqual(0)
      expect(newCoords.y1).toBeGreaterThanOrEqual(0)
    })
  })

  describe('coordinate reset', () => {
    it('should reset to original coordinates', () => {
      editor.updateCoordinatesFromInput({ x1: 120, y1: 170 })
      const resetCoords = editor.resetCoordinates()
      
      expect(resetCoords).toEqual(mockCoordinates)
    })
  })
})

describe('CoordinateEditingUtils', () => {
  describe('distance calculation', () => {
    it('should calculate correct distance between points', () => {
      const p1 = { x: 0, y: 0 }
      const p2 = { x: 3, y: 4 }
      const distance = CoordinateEditingUtils.distance(p1, p2)
      
      expect(distance).toBe(5)
    })
  })

  describe('point in rectangle check', () => {
    it('should detect point inside rectangle', () => {
      const point = { x: 150, y: 200 }
      const rect = { x: 100, y: 150, width: 200, height: 100 }
      const isInside = CoordinateEditingUtils.isPointInRect(point, rect)
      
      expect(isInside).toBe(true)
    })

    it('should detect point outside rectangle', () => {
      const point = { x: 50, y: 50 }
      const rect = { x: 100, y: 150, width: 200, height: 100 }
      const isInside = CoordinateEditingUtils.isPointInRect(point, rect)
      
      expect(isInside).toBe(false)
    })
  })

  describe('coordinate transformations', () => {
    it('should convert to viewport coordinates', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.9, type: 'graph', description: 'test'
      }
      const transform = { scaleX: 2, scaleY: 2, offsetX: 10, offsetY: 20 }
      
      const viewport = CoordinateEditingUtils.toViewportCoordinates(coords, transform)
      
      expect(viewport.x).toBe(210) // 100 * 2 + 10
      expect(viewport.y).toBe(320) // 150 * 2 + 20
      expect(viewport.width).toBe(400) // (300 - 100) * 2
      expect(viewport.height).toBe(200) // (250 - 150) * 2
    })

    it('should convert from viewport coordinates', () => {
      const viewport = { x: 210, y: 320, width: 400, height: 200 }
      const transform = { scaleX: 2, scaleY: 2, offsetX: 10, offsetY: 20 }
      
      const coords = CoordinateEditingUtils.fromViewportCoordinates(viewport, transform)
      
      expect(coords.x1).toBe(100) // (210 - 10) / 2
      expect(coords.y1).toBe(150) // (320 - 20) / 2
      expect(coords.x2).toBe(300) // 100 + 400 / 2
      expect(coords.y2).toBe(250) // 150 + 200 / 2
    })
  })

  describe('area calculation', () => {
    it('should calculate correct area', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.9, type: 'graph', description: 'test'
      }
      const area = CoordinateEditingUtils.calculateArea(coords)
      
      expect(area).toBe(20000) // 200 * 100
    })
  })

  describe('center calculation', () => {
    it('should calculate correct center point', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.9, type: 'graph', description: 'test'
      }
      const center = CoordinateEditingUtils.calculateCenter(coords)
      
      expect(center.x).toBe(200) // (100 + 300) / 2
      expect(center.y).toBe(200) // (150 + 250) / 2
    })
  })

  describe('coordinate expansion', () => {
    it('should expand coordinates by specified amount', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.9, type: 'graph', description: 'test'
      }
      const expanded = CoordinateEditingUtils.expandCoordinates(coords, 10)
      
      expect(expanded.x1).toBe(90)
      expect(expanded.y1).toBe(140)
      expect(expanded.x2).toBe(310)
      expect(expanded.y2).toBe(260)
    })
  })

  describe('coordinate normalization', () => {
    it('should normalize coordinates with wrong order', () => {
      const coords: DiagramCoordinates = {
        x1: 300, y1: 250, x2: 100, y2: 150, // Wrong order
        confidence: 0.9, type: 'graph', description: 'test'
      }
      const normalized = CoordinateEditingUtils.normalizeCoordinates(coords)
      
      expect(normalized.x1).toBe(100)
      expect(normalized.y1).toBe(150)
      expect(normalized.x2).toBe(300)
      expect(normalized.y2).toBe(250)
    })

    it('should keep correctly ordered coordinates unchanged', () => {
      const coords: DiagramCoordinates = {
        x1: 100, y1: 150, x2: 300, y2: 250,
        confidence: 0.9, type: 'graph', description: 'test'
      }
      const normalized = CoordinateEditingUtils.normalizeCoordinates(coords)
      
      expect(normalized).toEqual(coords)
    })
  })
})

describe('CoordinateEditor with grid snapping', () => {
  let editor: CoordinateEditor
  let mockCoordinates: DiagramCoordinates
  let mockImageDimensions: ImageDimensions
  let mockCanvasState: any

  beforeEach(() => {
    mockCoordinates = {
      x1: 103,
      y1: 157,
      x2: 297,
      y2: 243,
      confidence: 0.9,
      type: 'graph',
      description: 'Test diagram'
    }

    mockImageDimensions = {
      width: 800,
      height: 600
    }

    mockCanvasState = {
      scale: 1.0,
      offset: { x: 0, y: 0 },
      width: 800,
      height: 600
    }

    editor = new CoordinateEditor(
      mockCoordinates,
      mockImageDimensions,
      mockCanvasState,
      { 
        minSize: 10,
        snapToGrid: true,
        gridSize: 10
      }
    )
  })

  it('should snap coordinates to grid when dragging', () => {
    editor.startEdit({ x: 103, y: 157 })
    const newCoords = editor.updateEdit({ x: 108, y: 162 })
    
    expect(newCoords).toBeTruthy()
    expect(newCoords!.x1).toBe(110) // Snapped to nearest 10
    expect(newCoords!.y1).toBe(160) // Snapped to nearest 10
  })

  it('should snap coordinates to grid when updating from input', () => {
    const newCoords = editor.updateCoordinatesFromInput({ x1: 103, y1: 157 })
    
    expect(newCoords.x1).toBe(100) // Snapped to nearest 10
    expect(newCoords.y1).toBe(160) // Snapped to nearest 10
  })
})