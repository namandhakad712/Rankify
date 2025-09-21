/**
 * Coordinate Editing Logic
 * 
 * This module provides the core logic for interactive coordinate editing,
 * including drag operations, validation, and coordinate transformations.
 */

import type { 
  DiagramCoordinates, 
  ImageDimensions,
  CoordinateValidationResult,
  ViewportCoordinates,
  CoordinateTransform
} from '~/shared/types/diagram-detection'

export type DragHandle = 'tl' | 'tr' | 'bl' | 'br' | 'move' | null

export interface DragState {
  isDragging: boolean
  handle: DragHandle
  startPosition: { x: number; y: number }
  startCoordinates: DiagramCoordinates
  currentCoordinates: DiagramCoordinates
}

export interface EditorState {
  zoomLevel: number
  panOffset: { x: number; y: number }
  canvasSize: { width: number; height: number }
  imageSize: ImageDimensions
}

/**
 * Coordinate Editor Logic Class
 * Handles all coordinate manipulation and validation logic
 */
export class CoordinateEditingLogic {
  private minDiagramSize = 10
  private handleSize = 8
  private snapThreshold = 5

  constructor(
    private imageSize: ImageDimensions,
    private minSize: number = 10,
    private snapToGrid: boolean = false,
    private gridSize: number = 10
  ) {
    this.minDiagramSize = minSize
  }

  /**
   * Initialize drag operation
   */
  startDrag(
    mousePosition: { x: number; y: number },
    coordinates: DiagramCoordinates,
    editorState: EditorState
  ): DragState {
    const handle = this.getHandleAtPosition(mousePosition, coordinates, editorState)
    
    return {
      isDragging: true,
      handle,
      startPosition: mousePosition,
      startCoordinates: { ...coordinates },
      currentCoordinates: { ...coordinates }
    }
  }

  /**
   * Update coordinates during drag operation
   */
  updateDrag(
    currentMousePosition: { x: number; y: number },
    dragState: DragState,
    editorState: EditorState
  ): DiagramCoordinates {
    if (!dragState.isDragging || !dragState.handle) {
      return dragState.currentCoordinates
    }

    const deltaX = (currentMousePosition.x - dragState.startPosition.x) / editorState.zoomLevel
    const deltaY = (currentMousePosition.y - dragState.startPosition.y) / editorState.zoomLevel

    let newCoordinates = this.calculateNewCoordinates(
      dragState.startCoordinates,
      dragState.handle,
      deltaX,
      deltaY
    )

    // Apply constraints
    newCoordinates = this.constrainCoordinates(newCoordinates)

    // Apply snapping if enabled
    if (this.snapToGrid) {
      newCoordinates = this.snapCoordinatesToGrid(newCoordinates)
    }

    dragState.currentCoordinates = newCoordinates
    return newCoordinates
  }

  /**
   * End drag operation
   */
  endDrag(dragState: DragState): DiagramCoordinates {
    dragState.isDragging = false
    dragState.handle = null
    return dragState.currentCoordinates
  }

  /**
   * Get the handle at a specific position
   */
  getHandleAtPosition(
    position: { x: number; y: number },
    coordinates: DiagramCoordinates,
    editorState: EditorState
  ): DragHandle {
    const scaledCoords = this.scaleCoordinatesToCanvas(coordinates, editorState)
    
    const handles = [
      { x: scaledCoords.x1, y: scaledCoords.y1, type: 'tl' as const },
      { x: scaledCoords.x2, y: scaledCoords.y1, type: 'tr' as const },
      { x: scaledCoords.x1, y: scaledCoords.y2, type: 'bl' as const },
      { x: scaledCoords.x2, y: scaledCoords.y2, type: 'br' as const }
    ]

    // Check handles first
    for (const handle of handles) {
      if (this.isPositionInHandle(position, handle)) {
        return handle.type
      }
    }

    // Check if inside selection for move operation
    if (this.isPositionInsideSelection(position, scaledCoords)) {
      return 'move'
    }

    return null
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(coordinates: DiagramCoordinates): CoordinateValidationResult {
    const errors: string[] = []

    // Check bounds
    if (coordinates.x1 < 0) errors.push('X1 coordinate cannot be negative')
    if (coordinates.y1 < 0) errors.push('Y1 coordinate cannot be negative')
    if (coordinates.x2 > this.imageSize.width) errors.push('X2 coordinate exceeds image width')
    if (coordinates.y2 > this.imageSize.height) errors.push('Y2 coordinate exceeds image height')

    // Check coordinate order
    if (coordinates.x2 <= coordinates.x1) errors.push('X2 must be greater than X1')
    if (coordinates.y2 <= coordinates.y1) errors.push('Y2 must be greater than Y1')

    // Check minimum size
    const width = coordinates.x2 - coordinates.x1
    const height = coordinates.y2 - coordinates.y1
    
    if (width < this.minDiagramSize) {
      errors.push(`Diagram width must be at least ${this.minDiagramSize} pixels`)
    }
    if (height < this.minDiagramSize) {
      errors.push(`Diagram height must be at least ${this.minDiagramSize} pixels`)
    }

    const isValid = errors.length === 0
    const sanitizedCoordinates = isValid ? coordinates : this.sanitizeCoordinates(coordinates)

    return {
      isValid,
      errors,
      sanitizedCoordinates
    }
  }

  /**
   * Sanitize coordinates to valid values
   */
  sanitizeCoordinates(coordinates: DiagramCoordinates): DiagramCoordinates {
    let sanitized = { ...coordinates }

    // Constrain to image bounds
    sanitized.x1 = Math.max(0, Math.min(this.imageSize.width - this.minDiagramSize, sanitized.x1))
    sanitized.y1 = Math.max(0, Math.min(this.imageSize.height - this.minDiagramSize, sanitized.y1))
    sanitized.x2 = Math.min(this.imageSize.width, Math.max(sanitized.x1 + this.minDiagramSize, sanitized.x2))
    sanitized.y2 = Math.min(this.imageSize.height, Math.max(sanitized.y1 + this.minDiagramSize, sanitized.y2))

    // Ensure minimum size
    if (sanitized.x2 - sanitized.x1 < this.minDiagramSize) {
      sanitized.x2 = sanitized.x1 + this.minDiagramSize
    }
    if (sanitized.y2 - sanitized.y1 < this.minDiagramSize) {
      sanitized.y2 = sanitized.y1 + this.minDiagramSize
    }

    return sanitized
  }

  /**
   * Convert image coordinates to canvas coordinates
   */
  scaleCoordinatesToCanvas(
    coordinates: DiagramCoordinates,
    editorState: EditorState
  ): DiagramCoordinates {
    return {
      ...coordinates,
      x1: (coordinates.x1 * editorState.zoomLevel) + editorState.panOffset.x,
      y1: (coordinates.y1 * editorState.zoomLevel) + editorState.panOffset.y,
      x2: (coordinates.x2 * editorState.zoomLevel) + editorState.panOffset.x,
      y2: (coordinates.y2 * editorState.zoomLevel) + editorState.panOffset.y
    }
  }

  /**
   * Convert canvas coordinates to image coordinates
   */
  scaleCoordinatesToImage(
    coordinates: DiagramCoordinates,
    editorState: EditorState
  ): DiagramCoordinates {
    return {
      ...coordinates,
      x1: (coordinates.x1 - editorState.panOffset.x) / editorState.zoomLevel,
      y1: (coordinates.y1 - editorState.panOffset.y) / editorState.zoomLevel,
      x2: (coordinates.x2 - editorState.panOffset.x) / editorState.zoomLevel,
      y2: (coordinates.y2 - editorState.panOffset.y) / editorState.zoomLevel
    }
  }

  /**
   * Get cursor style for current position
   */
  getCursorStyle(
    position: { x: number; y: number },
    coordinates: DiagramCoordinates,
    editorState: EditorState,
    isDragging: boolean = false
  ): string {
    if (isDragging) return 'grabbing'

    const handle = this.getHandleAtPosition(position, coordinates, editorState)
    
    switch (handle) {
      case 'tl':
      case 'br':
        return 'nw-resize'
      case 'tr':
      case 'bl':
        return 'ne-resize'
      case 'move':
        return 'move'
      default:
        return 'crosshair'
    }
  }

  /**
   * Calculate aspect ratio
   */
  calculateAspectRatio(coordinates: DiagramCoordinates): number {
    const width = coordinates.x2 - coordinates.x1
    const height = coordinates.y2 - coordinates.y1
    return width / height
  }

  /**
   * Maintain aspect ratio during resize
   */
  maintainAspectRatio(
    coordinates: DiagramCoordinates,
    originalAspectRatio: number,
    handle: DragHandle
  ): DiagramCoordinates {
    if (handle === 'move') return coordinates

    let adjusted = { ...coordinates }
    const width = adjusted.x2 - adjusted.x1
    const height = adjusted.y2 - adjusted.y1
    const currentRatio = width / height

    if (Math.abs(currentRatio - originalAspectRatio) > 0.01) {
      // Adjust based on which dimension changed more
      const targetWidth = height * originalAspectRatio
      const targetHeight = width / originalAspectRatio

      if (Math.abs(width - targetWidth) < Math.abs(height - targetHeight)) {
        // Adjust width
        switch (handle) {
          case 'tl':
          case 'bl':
            adjusted.x1 = adjusted.x2 - targetWidth
            break
          case 'tr':
          case 'br':
            adjusted.x2 = adjusted.x1 + targetWidth
            break
        }
      } else {
        // Adjust height
        switch (handle) {
          case 'tl':
          case 'tr':
            adjusted.y1 = adjusted.y2 - targetHeight
            break
          case 'bl':
          case 'br':
            adjusted.y2 = adjusted.y1 + targetHeight
            break
        }
      }
    }

    return this.constrainCoordinates(adjusted)
  }

  // Private helper methods

  private calculateNewCoordinates(
    startCoords: DiagramCoordinates,
    handle: DragHandle,
    deltaX: number,
    deltaY: number
  ): DiagramCoordinates {
    let newCoords = { ...startCoords }

    switch (handle) {
      case 'tl':
        newCoords.x1 = startCoords.x1 + deltaX
        newCoords.y1 = startCoords.y1 + deltaY
        break
      case 'tr':
        newCoords.x2 = startCoords.x2 + deltaX
        newCoords.y1 = startCoords.y1 + deltaY
        break
      case 'bl':
        newCoords.x1 = startCoords.x1 + deltaX
        newCoords.y2 = startCoords.y2 + deltaY
        break
      case 'br':
        newCoords.x2 = startCoords.x2 + deltaX
        newCoords.y2 = startCoords.y2 + deltaY
        break
      case 'move':
        newCoords.x1 = startCoords.x1 + deltaX
        newCoords.y1 = startCoords.y1 + deltaY
        newCoords.x2 = startCoords.x2 + deltaX
        newCoords.y2 = startCoords.y2 + deltaY
        break
    }

    return newCoords
  }

  private constrainCoordinates(coordinates: DiagramCoordinates): DiagramCoordinates {
    let constrained = { ...coordinates }

    // Ensure coordinates are within image bounds
    constrained.x1 = Math.max(0, constrained.x1)
    constrained.y1 = Math.max(0, constrained.y1)
    constrained.x2 = Math.min(this.imageSize.width, constrained.x2)
    constrained.y2 = Math.min(this.imageSize.height, constrained.y2)

    // Ensure minimum size
    if (constrained.x2 - constrained.x1 < this.minDiagramSize) {
      if (constrained.x1 + this.minDiagramSize <= this.imageSize.width) {
        constrained.x2 = constrained.x1 + this.minDiagramSize
      } else {
        constrained.x1 = constrained.x2 - this.minDiagramSize
      }
    }

    if (constrained.y2 - constrained.y1 < this.minDiagramSize) {
      if (constrained.y1 + this.minDiagramSize <= this.imageSize.height) {
        constrained.y2 = constrained.y1 + this.minDiagramSize
      } else {
        constrained.y1 = constrained.y2 - this.minDiagramSize
      }
    }

    return constrained
  }

  private snapCoordinatesToGrid(coordinates: DiagramCoordinates): DiagramCoordinates {
    return {
      ...coordinates,
      x1: Math.round(coordinates.x1 / this.gridSize) * this.gridSize,
      y1: Math.round(coordinates.y1 / this.gridSize) * this.gridSize,
      x2: Math.round(coordinates.x2 / this.gridSize) * this.gridSize,
      y2: Math.round(coordinates.y2 / this.gridSize) * this.gridSize
    }
  }

  private isPositionInHandle(
    position: { x: number; y: number },
    handle: { x: number; y: number }
  ): boolean {
    const halfSize = this.handleSize / 2
    return (
      position.x >= handle.x - halfSize &&
      position.x <= handle.x + halfSize &&
      position.y >= handle.y - halfSize &&
      position.y <= handle.y + halfSize
    )
  }

  private isPositionInsideSelection(
    position: { x: number; y: number },
    coordinates: DiagramCoordinates
  ): boolean {
    return (
      position.x >= coordinates.x1 &&
      position.x <= coordinates.x2 &&
      position.y >= coordinates.y1 &&
      position.y <= coordinates.y2
    )
  }
}

/**
 * Coordinate Editor Canvas Renderer
 * Handles all canvas drawing operations for the coordinate editor
 */
export class CoordinateEditorRenderer {
  private ctx: CanvasRenderingContext2D
  private selectionColor = '#007bff'
  private handleColor = '#007bff'
  private handleBorderColor = '#ffffff'
  private overlayColor = 'rgba(0, 123, 255, 0.1)'

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not get 2D context from canvas')
    }
    this.ctx = context
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
  }

  /**
   * Draw the page image
   */
  drawPageImage(
    image: HTMLImageElement,
    editorState: EditorState
  ): void {
    this.ctx.drawImage(
      image,
      editorState.panOffset.x,
      editorState.panOffset.y,
      editorState.imageSize.width * editorState.zoomLevel,
      editorState.imageSize.height * editorState.zoomLevel
    )
  }

  /**
   * Draw coordinate selection overlay
   */
  drawCoordinateOverlay(
    coordinates: DiagramCoordinates,
    editorState: EditorState
  ): void {
    const scaledCoords = this.scaleCoordinates(coordinates, editorState)
    const width = scaledCoords.x2 - scaledCoords.x1
    const height = scaledCoords.y2 - scaledCoords.y1

    // Draw selection rectangle
    this.ctx.strokeStyle = this.selectionColor
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([5, 5])
    this.ctx.strokeRect(scaledCoords.x1, scaledCoords.y1, width, height)

    // Draw semi-transparent overlay
    this.ctx.fillStyle = this.overlayColor
    this.ctx.fillRect(scaledCoords.x1, scaledCoords.y1, width, height)

    // Reset line dash
    this.ctx.setLineDash([])
  }

  /**
   * Draw resize handles
   */
  drawResizeHandles(
    coordinates: DiagramCoordinates,
    editorState: EditorState,
    handleSize: number = 8
  ): void {
    const scaledCoords = this.scaleCoordinates(coordinates, editorState)
    
    const handles = [
      { x: scaledCoords.x1, y: scaledCoords.y1 }, // Top-left
      { x: scaledCoords.x2, y: scaledCoords.y1 }, // Top-right
      { x: scaledCoords.x1, y: scaledCoords.y2 }, // Bottom-left
      { x: scaledCoords.x2, y: scaledCoords.y2 }  // Bottom-right
    ]

    this.ctx.fillStyle = this.handleColor
    this.ctx.strokeStyle = this.handleBorderColor
    this.ctx.lineWidth = 1

    handles.forEach(handle => {
      const halfSize = handleSize / 2
      
      // Fill handle
      this.ctx.fillRect(
        handle.x - halfSize,
        handle.y - halfSize,
        handleSize,
        handleSize
      )
      
      // Stroke handle border
      this.ctx.strokeRect(
        handle.x - halfSize,
        handle.y - halfSize,
        handleSize,
        handleSize
      )
    })
  }

  /**
   * Draw grid (if enabled)
   */
  drawGrid(editorState: EditorState, gridSize: number): void {
    const { width, height } = this.ctx.canvas
    
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([1, 1])

    const scaledGridSize = gridSize * editorState.zoomLevel

    // Draw vertical lines
    for (let x = editorState.panOffset.x % scaledGridSize; x < width; x += scaledGridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, height)
      this.ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = editorState.panOffset.y % scaledGridSize; y < height; y += scaledGridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(width, y)
      this.ctx.stroke()
    }

    this.ctx.setLineDash([])
  }

  /**
   * Draw coordinate information
   */
  drawCoordinateInfo(
    coordinates: DiagramCoordinates,
    position: { x: number; y: number }
  ): void {
    const text = `(${Math.round(coordinates.x1)}, ${Math.round(coordinates.y1)}) - (${Math.round(coordinates.x2)}, ${Math.round(coordinates.y2)})`
    const width = coordinates.x2 - coordinates.x1
    const height = coordinates.y2 - coordinates.y1
    const sizeText = `${Math.round(width)} × ${Math.round(height)}`

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(position.x, position.y, 200, 40)

    this.ctx.fillStyle = 'white'
    this.ctx.font = '12px monospace'
    this.ctx.fillText(text, position.x + 5, position.y + 15)
    this.ctx.fillText(sizeText, position.x + 5, position.y + 30)
  }

  private scaleCoordinates(
    coordinates: DiagramCoordinates,
    editorState: EditorState
  ): DiagramCoordinates {
    return {
      ...coordinates,
      x1: (coordinates.x1 * editorState.zoomLevel) + editorState.panOffset.x,
      y1: (coordinates.y1 * editorState.zoomLevel) + editorState.panOffset.y,
      x2: (coordinates.x2 * editorState.zoomLevel) + editorState.panOffset.x,
      y2: (coordinates.y2 * editorState.zoomLevel) + editorState.panOffset.y
    }
  }
}

/**
 * Factory function to create coordinate editing logic
 */
export function createCoordinateEditingLogic(
  imageSize: ImageDimensions,
  options: {
    minSize?: number
    snapToGrid?: boolean
    gridSize?: number
  } = {}
): CoordinateEditingLogic {
  return new CoordinateEditingLogic(
    imageSize,
    options.minSize,
    options.snapToGrid,
    options.gridSize
  )
}

export default CoordinateEditingLogic