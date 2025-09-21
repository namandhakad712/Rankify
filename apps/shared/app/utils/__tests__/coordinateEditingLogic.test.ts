/**
 * Unit Tests for Coordinate Editing Logic
 * 
 * Tests all coordinate manipulation, validation, and interaction logic
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { 
  CoordinateEditingLogic, 
  CoordinateEditorRenderer,
  createCoordinateEditingLogic,
  type DragState,
  type EditorState
} from '../coordinateEditingLogic'
import type { DiagramCoordinates, ImageDimensions } from '~/shared/types/diagram-detection'

describe('CoordinateEditingLogic', () => {
  let logic: CoordinateEditingLogic
  let imageSize: ImageDimensions
  let editorState: EditorState
  let testCoordinates: DiagramCoordinates

  beforeEach(() => {
    imageSize = { width: 800, height: 600 }
    logic = new CoordinateEditingLogic(imageSize, 10, false, 10)
    
    editorState = {
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
      canvasSize: { width: 800, height: 600 },
      imageSize
    }

    testCoordinates = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test diagram'
    }
  })

  describe('Coordinate Validation', () => {
    test('should validate correct coordinates', () => {
      const result = logic.validateCoordinates(testCoordinates)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedCoordinates).toEqual(testCoordinates)
    })

    test('should detect out-of-bounds coordinates', () => {
      const invalidCoords: DiagramCoordinates = {
        ...testCoordinates,
        x2: 900, // Exceeds image width
        y2: 700  // Exceeds image height
      }

      const result = logic.validateCoordinates(invalidCoords)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('X2 coordinate exceeds image width')
      expect(result.errors).toContain('Y2 coordinate exceeds image height')
    })

    test('should detect negative coordinates', () => {
      const invalidCoords: DiagramCoordinates = {
        ...testCoordinates,
        x1: -10,
        y1: -5
      }

      const result = logic.validateCoordinates(invalidCoords)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('X1 coordinate cannot be negative')
      expect(result.errors).toContain('Y1 coordinate cannot be negative')
    })

    test('should detect invalid coordinate order', () => {
      const invalidCoords: DiagramCoordinates = {
        ...testCoordinates,
        x2: 50, // Less than x1
        y2: 100 // Less than y1
      }

      const result = logic.validateCoordinates(invalidCoords)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('X2 must be greater than X1')
      expect(result.errors).toContain('Y2 must be greater than Y1')
    })

    test('should detect too small diagrams', () => {
      const smallCoords: DiagramCoordinates = {
        ...testCoordinates,
        x2: testCoordinates.x1 + 5, // Width = 5, less than minimum 10
        y2: testCoordinates.y1 + 5  // Height = 5, less than minimum 10
      }

      const result = logic.validateCoordinates(smallCoords)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Diagram width must be at least 10 pixels')
      expect(result.errors).toContain('Diagram height must be at least 10 pixels')
    })
  })

  describe('Coordinate Sanitization', () => {
    test('should sanitize out-of-bounds coordinates', () => {
      const invalidCoords: DiagramCoordinates = {
        ...testCoordinates,
        x1: -10,
        y1: -5,
        x2: 900,
        y2: 700
      }

      const sanitized = logic.sanitizeCoordinates(invalidCoords)
      
      expect(sanitized.x1).toBe(0)
      expect(sanitized.y1).toBe(0)
      expect(sanitized.x2).toBe(800)
      expect(sanitized.y2).toBe(600)
    })

    test('should ensure minimum size when sanitizing', () => {
      const tinyCoords: DiagramCoordinates = {
        ...testCoordinates,
        x1: 100,
        y1: 150,
        x2: 102, // Width = 2
        y2: 152  // Height = 2
      }

      const sanitized = logic.sanitizeCoordinates(tinyCoords)
      
      expect(sanitized.x2 - sanitized.x1).toBeGreaterThanOrEqual(10)
      expect(sanitized.y2 - sanitized.y1).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Handle Detection', () => {
    test('should detect top-left handle', () => {
      const position = { x: 100, y: 150 } // Exact top-left corner
      const handle = logic.getHandleAtPosition(position, testCoordinates, editorState)
      
      expect(handle).toBe('tl')
    })

    test('should detect top-right handle', () => {
      const position = { x: 300, y: 150 } // Exact top-right corner
      const handle = logic.getHandleAtPosition(position, testCoordinates, editorState)
      
      expect(handle).toBe('tr')
    })

    test('should detect bottom-left handle', () => {
      const position = { x: 100, y: 250 } // Exact bottom-left corner
      const handle = logic.getHandleAtPosition(position, testCoordinates, editorState)
      
      expect(handle).toBe('bl')
    })

    test('should detect bottom-right handle', () => {
      const position = { x: 300, y: 250 } // Exact bottom-right corner
      const handle = logic.getHandleAtPosition(position, testCoordinates, editorState)
      
      expect(handle).toBe('br')
    })

    test('should detect move handle inside selection', () => {
      const position = { x: 200, y: 200 } // Center of selection
      const handle = logic.getHandleAtPosition(position, testCoordinates, editorState)
      
      expect(handle).toBe('move')
    })

    test('should return null for position outside selection', () => {
      const position = { x: 50, y: 50 } // Outside selection
      const handle = logic.getHandleAtPosition(position, testCoordinates, editorState)
      
      expect(handle).toBeNull()
    })
  })

  describe('Drag Operations', () => {
    test('should start drag operation correctly', () => {
      const mousePosition = { x: 100, y: 150 }
      const dragState = logic.startDrag(mousePosition, testCoordinates, editorState)
      
      expect(dragState.isDragging).toBe(true)
      expect(dragState.handle).toBe('tl')
      expect(dragState.startPosition).toEqual(mousePosition)
      expect(dragState.startCoordinates).toEqual(testCoordinates)
    })

    test('should update coordinates during top-left handle drag', () => {
      const dragState: DragState = {
        isDragging: true,
        handle: 'tl',
        startPosition: { x: 100, y: 150 },
        startCoordinates: { ...testCoordinates },
        currentCoordinates: { ...testCoordinates }
      }

      const newMousePosition = { x: 120, y: 170 } // Move 20 pixels right and down
      const updatedCoords = logic.updateDrag(newMousePosition, dragState, editorState)
      
      expect(updatedCoords.x1).toBe(120) // x1 moved right
      expect(updatedCoords.y1).toBe(170) // y1 moved down
      expect(updatedCoords.x2).toBe(300) // x2 unchanged
      expect(updatedCoords.y2).toBe(250) // y2 unchanged
    })

    test('should update coordinates during move operation', () => {
      const dragState: DragState = {
        isDragging: true,
        handle: 'move',
        startPosition: { x: 200, y: 200 },
        startCoordinates: { ...testCoordinates },
        currentCoordinates: { ...testCoordinates }
      }

      const newMousePosition = { x: 220, y: 220 } // Move 20 pixels right and down
      const updatedCoords = logic.updateDrag(newMousePosition, dragState, editorState)
      
      expect(updatedCoords.x1).toBe(120) // Moved 20 pixels right
      expect(updatedCoords.y1).toBe(170) // Moved 20 pixels down
      expect(updatedCoords.x2).toBe(320) // Moved 20 pixels right
      expect(updatedCoords.y2).toBe(270) // Moved 20 pixels down
    })

    test('should constrain coordinates during drag', () => {
      const dragState: DragState = {
        isDragging: true,
        handle: 'tl',
        startPosition: { x: 100, y: 150 },
        startCoordinates: { ...testCoordinates },
        currentCoordinates: { ...testCoordinates }
      }

      // Try to drag beyond image bounds
      const newMousePosition = { x: -50, y: -50 }
      const updatedCoords = logic.updateDrag(newMousePosition, dragState, editorState)
      
      expect(updatedCoords.x1).toBeGreaterThanOrEqual(0)
      expect(updatedCoords.y1).toBeGreaterThanOrEqual(0)
    })

    test('should end drag operation', () => {
      const dragState: DragState = {
        isDragging: true,
        handle: 'tl',
        startPosition: { x: 100, y: 150 },
        startCoordinates: { ...testCoordinates },
        currentCoordinates: { ...testCoordinates }
      }

      const finalCoords = logic.endDrag(dragState)
      
      expect(dragState.isDragging).toBe(false)
      expect(dragState.handle).toBeNull()
      expect(finalCoords).toEqual(dragState.currentCoordinates)
    })
  })

  describe('Coordinate Transformations', () => {
    test('should scale coordinates to canvas correctly', () => {
      const zoomedState: EditorState = {
        ...editorState,
        zoomLevel: 2,
        panOffset: { x: 10, y: 20 }
      }

      const scaledCoords = logic.scaleCoordinatesToCanvas(testCoordinates, zoomedState)
      
      expect(scaledCoords.x1).toBe(210) // (100 * 2) + 10
      expect(scaledCoords.y1).toBe(320) // (150 * 2) + 20
      expect(scaledCoords.x2).toBe(610) // (300 * 2) + 10
      expect(scaledCoords.y2).toBe(520) // (250 * 2) + 20
    })

    test('should scale coordinates to image correctly', () => {
      const canvasCoords: DiagramCoordinates = {
        ...testCoordinates,
        x1: 210,
        y1: 320,
        x2: 610,
        y2: 520
      }

      const zoomedState: EditorState = {
        ...editorState,
        zoomLevel: 2,
        panOffset: { x: 10, y: 20 }
      }

      const imageCoords = logic.scaleCoordinatesToImage(canvasCoords, zoomedState)
      
      expect(imageCoords.x1).toBe(100) // (210 - 10) / 2
      expect(imageCoords.y1).toBe(150) // (320 - 20) / 2
      expect(imageCoords.x2).toBe(300) // (610 - 10) / 2
      expect(imageCoords.y2).toBe(250) // (520 - 20) / 2
    })
  })

  describe('Cursor Styles', () => {
    test('should return correct cursor for handles', () => {
      expect(logic.getCursorStyle({ x: 100, y: 150 }, testCoordinates, editorState)).toBe('nw-resize') // tl
      expect(logic.getCursorStyle({ x: 300, y: 150 }, testCoordinates, editorState)).toBe('ne-resize') // tr
      expect(logic.getCursorStyle({ x: 100, y: 250 }, testCoordinates, editorState)).toBe('ne-resize') // bl
      expect(logic.getCursorStyle({ x: 300, y: 250 }, testCoordinates, editorState)).toBe('nw-resize') // br
    })

    test('should return move cursor for inside selection', () => {
      const cursor = logic.getCursorStyle({ x: 200, y: 200 }, testCoordinates, editorState)
      expect(cursor).toBe('move')
    })

    test('should return crosshair cursor for outside selection', () => {
      const cursor = logic.getCursorStyle({ x: 50, y: 50 }, testCoordinates, editorState)
      expect(cursor).toBe('crosshair')
    })

    test('should return grabbing cursor when dragging', () => {
      const cursor = logic.getCursorStyle({ x: 100, y: 150 }, testCoordinates, editorState, true)
      expect(cursor).toBe('grabbing')
    })
  })

  describe('Aspect Ratio', () => {
    test('should calculate aspect ratio correctly', () => {
      const ratio = logic.calculateAspectRatio(testCoordinates)
      const expectedRatio = (300 - 100) / (250 - 150) // 200 / 100 = 2
      
      expect(ratio).toBe(expectedRatio)
    })

    test('should maintain aspect ratio during resize', () => {
      const originalRatio = logic.calculateAspectRatio(testCoordinates)
      
      const resizedCoords: DiagramCoordinates = {
        ...testCoordinates,
        x2: 400, // Changed width
        y2: 250  // Keep height same
      }

      const maintainedCoords = logic.maintainAspectRatio(resizedCoords, originalRatio, 'br')
      const newRatio = logic.calculateAspectRatio(maintainedCoords)
      
      expect(Math.abs(newRatio - originalRatio)).toBeLessThan(0.01)
    })
  })
})

describe('CoordinateEditorRenderer', () => {
  let canvas: HTMLCanvasElement
  let renderer: CoordinateEditorRenderer
  let mockImage: HTMLImageElement
  let editorState: EditorState
  let testCoordinates: DiagramCoordinates

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    // Mock getContext to return a mock 2D context
    const mockCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      canvas: canvas,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      font: ''
    }
    
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as any)
    
    renderer = new CoordinateEditorRenderer(canvas)
    
    // Mock image
    mockImage = new Image()
    Object.defineProperty(mockImage, 'width', { value: 800 })
    Object.defineProperty(mockImage, 'height', { value: 600 })

    editorState = {
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
      canvasSize: { width: 800, height: 600 },
      imageSize: { width: 800, height: 600 }
    }

    testCoordinates = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test diagram'
    }
  })

  test('should clear canvas', () => {
    const ctx = canvas.getContext('2d') as any
    renderer.clear()
    
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
  })

  test('should draw page image', () => {
    const ctx = canvas.getContext('2d') as any
    renderer.drawPageImage(mockImage, editorState)
    
    expect(ctx.drawImage).toHaveBeenCalledWith(
      mockImage,
      0, 0, // panOffset
      800, 600 // scaled size
    )
  })

  test('should draw coordinate overlay', () => {
    const ctx = canvas.getContext('2d') as any
    renderer.drawCoordinateOverlay(testCoordinates, editorState)
    
    expect(ctx.strokeRect).toHaveBeenCalled()
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5])
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })

  test('should draw resize handles', () => {
    const ctx = canvas.getContext('2d') as any
    renderer.drawResizeHandles(testCoordinates, editorState, 8)
    
    // Should draw 4 handles (fill + stroke for each)
    expect(ctx.fillRect).toHaveBeenCalledTimes(4)
    expect(ctx.strokeRect).toHaveBeenCalledTimes(4)
  })

  test('should draw grid', () => {
    const ctx = canvas.getContext('2d') as any
    renderer.drawGrid(editorState, 20)
    
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.setLineDash).toHaveBeenCalledWith([1, 1])
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })

  test('should draw coordinate info', () => {
    const ctx = canvas.getContext('2d') as any
    renderer.drawCoordinateInfo(testCoordinates, { x: 10, y: 10 })
    
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 10, 200, 40)
    expect(ctx.fillText).toHaveBeenCalledTimes(2) // Coordinates and size
  })
})

describe('Factory Functions', () => {
  test('should create coordinate editing logic with default options', () => {
    const imageSize = { width: 800, height: 600 }
    const logic = createCoordinateEditingLogic(imageSize)
    
    expect(logic).toBeInstanceOf(CoordinateEditingLogic)
  })

  test('should create coordinate editing logic with custom options', () => {
    const imageSize = { width: 800, height: 600 }
    const options = {
      minSize: 20,
      snapToGrid: true,
      gridSize: 25
    }
    
    const logic = createCoordinateEditingLogic(imageSize, options)
    
    expect(logic).toBeInstanceOf(CoordinateEditingLogic)
  })
})