/**
 * Coordinate Editing Utilities
 * 
 * This module provides utilities for interactive coordinate editing,
 * including drag operations, validation, and coordinate transformations.
 */

import type { 
  DiagramCoordinates, 
  ImageDimensions,
  CoordinateValidationResult,
  ViewportCoordinates,
  CoordinateTransform
} from '~/shared/types/diagram-detection'

export interface EditingState {
  isEditing: boolean
  isDragging: boolean
  dragHandle: DragHandle | null
  dragStart: { x: number; y: number }
  lastMousePos: { x: number; y: number }
  originalCoordinates: DiagramCoordinates
  currentCoordinates: DiagramCoordinates
}

export type DragHandle = 'tl' | 'tr' | 'bl' | 'br' | 'move' | 'resize'

export interface CanvasState {
  scale: number
  offset: { x: number; y: number }
  width: number
  height: number
}

export interface EditingOptions {
  minSize: number
  maxSize?: number
  snapToGrid?: boolean
  gridSize?: number
  constrainToImage?: boolean
  allowNegativeCoordinates?: boolean
}

/**
 * Coordinate Editor class for managing interactive editing operations
 */
export class CoordinateEditor {
  private editingState: EditingState
  private canvasState: CanvasState
  private options: Required<EditingOptions>
  private imageDimensions: ImageDimensions

  constructor(
    initialCoordinates: DiagramCoordinates,
    imageDimensions: ImageDimensions,
    canvasState: CanvasState,
    options: EditingOptions = {}
  ) {
    this.imageDimensions = imageDimensions
    this.canvasState = canvasState
    this.options = {
      minSize: 10,
      maxSize: Math.max(imageDimensions.width, imageDimensions.height),
      snapToGrid: false,
      gridSize: 10,
      constrainToImage: true,
      allowNegativeCoordinates: false,
      ...options
    }

    this.editingState = {
      isEditing: false,
      isDragging: false,
      dragHandle: null,
      dragStart: { x: 0, y: 0 },
      lastMousePos: { x: 0, y: 0 },
      originalCoordinates: { ...initialCoordinates },
      currentCoordinates: { ...initialCoordinates }
    }
  }

  /**
   * Start editing operation
   */
  startEdit(mousePos: { x: number; y: number }): boolean {
    const handle = this.getHandleAtPosition(mousePos.x, mousePos.y)
    
    if (handle) {
      this.editingState.isEditing = true
      this.editingState.isDragging = true
      this.editingState.dragHandle = handle
      this.editingState.dragStart = { ...mousePos }
      this.editingState.lastMousePos = { ...mousePos }
      return true
    }
    
    return false
  }

  /**
   * Update coordinates during drag operation
   */
  updateEdit(mousePos: { x: number; y: number }): DiagramCoordinates | null {
    if (!this.editingState.isDragging || !this.editingState.dragHandle) {
      return null
    }

    // Calculate movement delta
    const deltaX = mousePos.x - this.editingState.dragStart.x
    const deltaY = mousePos.y - this.editingState.dragStart.y

    // Convert to image coordinates
    const imageDelta = this.canvasToImageDelta(deltaX, deltaY)

    // Update coordinates based on drag handle
    const newCoordinates = this.updateCoordinatesFromDrag(
      this.editingState.dragHandle,
      imageDelta
    )

    // Apply constraints and validation
    const constrainedCoordinates = this.applyConstraints(newCoordinates)

    this.editingState.currentCoordinates = constrainedCoordinates
    this.editingState.dragStart = { ...mousePos }

    return constrainedCoordinates
  }

  /**
   * End editing operation
   */
  endEdit(): DiagramCoordinates {
    this.editingState.isEditing = false
    this.editingState.isDragging = false
    this.editingState.dragHandle = null

    return this.editingState.currentCoordinates
  }

  /**
   * Cancel editing and restore original coordinates
   */
  cancelEdit(): DiagramCoordinates {
    this.editingState.currentCoordinates = { ...this.editingState.originalCoordinates }
    this.endEdit()
    return this.editingState.currentCoordinates
  }

  /**
   * Get the drag handle at the specified position
   */
  getHandleAtPosition(x: number, y: number): DragHandle | null {
    const canvasCoords = this.imageToCanvasCoordinates(this.editingState.currentCoordinates)
    const handleSize = 8
    const tolerance = handleSize / 2

    // Check corner handles
    if (this.isPointNearHandle(x, y, canvasCoords.x1, canvasCoords.y1, tolerance)) {
      return 'tl'
    }
    if (this.isPointNearHandle(x, y, canvasCoords.x2, canvasCoords.y1, tolerance)) {
      return 'tr'
    }
    if (this.isPointNearHandle(x, y, canvasCoords.x1, canvasCoords.y2, tolerance)) {
      return 'bl'
    }
    if (this.isPointNearHandle(x, y, canvasCoords.x2, canvasCoords.y2, tolerance)) {
      return 'br'
    }

    // Check if inside selection area (for moving)
    if (this.isPointInsideSelection(x, y, canvasCoords)) {
      return 'move'
    }

    return null
  }

  /**
   * Get cursor style for the specified handle
   */
  getCursorForHandle(handle: DragHandle | null): string {
    const cursors = {
      'tl': 'nw-resize',
      'tr': 'ne-resize',
      'bl': 'sw-resize',
      'br': 'se-resize',
      'move': 'move',
      'resize': 'se-resize'
    }

    return handle ? cursors[handle] || 'default' : 'default'
  }

  /**
   * Validate current coordinates
   */
  validateCoordinates(): CoordinateValidationResult {
    const coords = this.editingState.currentCoordinates
    const errors: string[] = []

    // Check bounds
    if (this.options.constrainToImage) {
      if (coords.x1 < 0 || coords.x1 >= this.imageDimensions.width) {
        errors.push('X1 coordinate is out of image bounds')
      }
      if (coords.y1 < 0 || coords.y1 >= this.imageDimensions.height) {
        errors.push('Y1 coordinate is out of image bounds')
      }
      if (coords.x2 < 0 || coords.x2 >= this.imageDimensions.width) {
        errors.push('X2 coordinate is out of image bounds')
      }
      if (coords.y2 < 0 || coords.y2 >= this.imageDimensions.height) {
        errors.push('Y2 coordinate is out of image bounds')
      }
    }

    // Check coordinate order
    if (coords.x2 <= coords.x1) {
      errors.push('X2 must be greater than X1')
    }
    if (coords.y2 <= coords.y1) {
      errors.push('Y2 must be greater than Y1')
    }

    // Check minimum size
    const width = coords.x2 - coords.x1
    const height = coords.y2 - coords.y1
    if (width < this.options.minSize) {
      errors.push(`Width must be at least ${this.options.minSize} pixels`)
    }
    if (height < this.options.minSize) {
      errors.push(`Height must be at least ${this.options.minSize} pixels`)
    }

    // Check maximum size
    if (this.options.maxSize) {
      if (width > this.options.maxSize) {
        errors.push(`Width cannot exceed ${this.options.maxSize} pixels`)
      }
      if (height > this.options.maxSize) {
        errors.push(`Height cannot exceed ${this.options.maxSize} pixels`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedCoordinates: errors.length === 0 ? coords : undefined
    }
  }

  /**
   * Update coordinates from manual input
   */
  updateCoordinatesFromInput(newCoordinates: Partial<DiagramCoordinates>): DiagramCoordinates {
    this.editingState.currentCoordinates = {
      ...this.editingState.currentCoordinates,
      ...newCoordinates
    }

    return this.applyConstraints(this.editingState.currentCoordinates)
  }

  /**
   * Get current editing state
   */
  getEditingState(): Readonly<EditingState> {
    return { ...this.editingState }
  }

  /**
   * Get current coordinates
   */
  getCurrentCoordinates(): DiagramCoordinates {
    return { ...this.editingState.currentCoordinates }
  }

  /**
   * Reset to original coordinates
   */
  resetCoordinates(): DiagramCoordinates {
    this.editingState.currentCoordinates = { ...this.editingState.originalCoordinates }
    return this.editingState.currentCoordinates
  }

  /**
   * Update canvas state (for zoom/pan operations)
   */
  updateCanvasState(newState: Partial<CanvasState>): void {
    this.canvasState = { ...this.canvasState, ...newState }
  }

  // Private helper methods

  private isPointNearHandle(x: number, y: number, handleX: number, handleY: number, tolerance: number): boolean {
    return Math.abs(x - handleX) <= tolerance && Math.abs(y - handleY) <= tolerance
  }

  private isPointInsideSelection(x: number, y: number, canvasCoords: DiagramCoordinates): boolean {
    return x >= canvasCoords.x1 && x <= canvasCoords.x2 && 
           y >= canvasCoords.y1 && y <= canvasCoords.y2
  }

  private imageToCanvasCoordinates(coords: DiagramCoordinates): DiagramCoordinates {
    return {
      x1: coords.x1 * this.canvasState.scale + this.canvasState.offset.x,
      y1: coords.y1 * this.canvasState.scale + this.canvasState.offset.y,
      x2: coords.x2 * this.canvasState.scale + this.canvasState.offset.x,
      y2: coords.y2 * this.canvasState.scale + this.canvasState.offset.y,
      confidence: coords.confidence,
      type: coords.type,
      description: coords.description
    }
  }

  private canvasToImageDelta(deltaX: number, deltaY: number): { x: number; y: number } {
    return {
      x: deltaX / this.canvasState.scale,
      y: deltaY / this.canvasState.scale
    }
  }

  private updateCoordinatesFromDrag(handle: DragHandle, delta: { x: number; y: number }): DiagramCoordinates {
    const coords = { ...this.editingState.currentCoordinates }

    switch (handle) {
      case 'tl':
        coords.x1 += delta.x
        coords.y1 += delta.y
        break
      case 'tr':
        coords.x2 += delta.x
        coords.y1 += delta.y
        break
      case 'bl':
        coords.x1 += delta.x
        coords.y2 += delta.y
        break
      case 'br':
        coords.x2 += delta.x
        coords.y2 += delta.y
        break
      case 'move':
        coords.x1 += delta.x
        coords.y1 += delta.y
        coords.x2 += delta.x
        coords.y2 += delta.y
        break
      case 'resize':
        // Resize from bottom-right corner
        coords.x2 += delta.x
        coords.y2 += delta.y
        break
    }

    return coords
  }

  private applyConstraints(coords: DiagramCoordinates): DiagramCoordinates {
    let constrained = { ...coords }

    // Apply grid snapping
    if (this.options.snapToGrid) {
      constrained = this.snapToGrid(constrained)
    }

    // Constrain to image bounds
    if (this.options.constrainToImage) {
      constrained = this.constrainToImageBounds(constrained)
    }

    // Ensure minimum size
    constrained = this.enforceMinimumSize(constrained)

    // Ensure coordinate order
    constrained = this.enforceCoordinateOrder(constrained)

    return constrained
  }

  private snapToGrid(coords: DiagramCoordinates): DiagramCoordinates {
    const gridSize = this.options.gridSize
    return {
      ...coords,
      x1: Math.round(coords.x1 / gridSize) * gridSize,
      y1: Math.round(coords.y1 / gridSize) * gridSize,
      x2: Math.round(coords.x2 / gridSize) * gridSize,
      y2: Math.round(coords.y2 / gridSize) * gridSize
    }
  }

  private constrainToImageBounds(coords: DiagramCoordinates): DiagramCoordinates {
    const minX = this.options.allowNegativeCoordinates ? -this.imageDimensions.width : 0
    const minY = this.options.allowNegativeCoordinates ? -this.imageDimensions.height : 0
    const maxX = this.imageDimensions.width
    const maxY = this.imageDimensions.height

    return {
      ...coords,
      x1: Math.max(minX, Math.min(coords.x1, maxX)),
      y1: Math.max(minY, Math.min(coords.y1, maxY)),
      x2: Math.max(minX, Math.min(coords.x2, maxX)),
      y2: Math.max(minY, Math.min(coords.y2, maxY))
    }
  }

  private enforceMinimumSize(coords: DiagramCoordinates): DiagramCoordinates {
    const minSize = this.options.minSize
    let result = { ...coords }

    // Ensure minimum width
    if (result.x2 - result.x1 < minSize) {
      const center = (result.x1 + result.x2) / 2
      result.x1 = center - minSize / 2
      result.x2 = center + minSize / 2
    }

    // Ensure minimum height
    if (result.y2 - result.y1 < minSize) {
      const center = (result.y1 + result.y2) / 2
      result.y1 = center - minSize / 2
      result.y2 = center + minSize / 2
    }

    return result
  }

  private enforceCoordinateOrder(coords: DiagramCoordinates): DiagramCoordinates {
    return {
      ...coords,
      x1: Math.min(coords.x1, coords.x2 - 1),
      y1: Math.min(coords.y1, coords.y2 - 1),
      x2: Math.max(coords.x2, coords.x1 + 1),
      y2: Math.max(coords.y2, coords.y1 + 1)
    }
  }
}

/**
 * Utility functions for coordinate editing
 */
export const CoordinateEditingUtils = {
  /**
   * Calculate the distance between two points
   */
  distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  },

  /**
   * Check if a point is inside a rectangle
   */
  isPointInRect(
    point: { x: number; y: number }, 
    rect: { x: number; y: number; width: number; height: number }
  ): boolean {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width && 
           point.y >= rect.y && 
           point.y <= rect.y + rect.height
  },

  /**
   * Convert coordinates to viewport coordinates
   */
  toViewportCoordinates(
    coords: DiagramCoordinates, 
    transform: CoordinateTransform
  ): ViewportCoordinates {
    return {
      x: coords.x1 * transform.scaleX + transform.offsetX,
      y: coords.y1 * transform.scaleY + transform.offsetY,
      width: (coords.x2 - coords.x1) * transform.scaleX,
      height: (coords.y2 - coords.y1) * transform.scaleY
    }
  },

  /**
   * Convert viewport coordinates to image coordinates
   */
  fromViewportCoordinates(
    viewport: ViewportCoordinates, 
    transform: CoordinateTransform
  ): DiagramCoordinates {
    const x1 = (viewport.x - transform.offsetX) / transform.scaleX
    const y1 = (viewport.y - transform.offsetY) / transform.scaleY
    const x2 = x1 + viewport.width / transform.scaleX
    const y2 = y1 + viewport.height / transform.scaleY

    return {
      x1,
      y1,
      x2,
      y2,
      confidence: 1.0,
      type: 'other',
      description: 'User edited'
    }
  },

  /**
   * Calculate the area of coordinates
   */
  calculateArea(coords: DiagramCoordinates): number {
    return Math.abs((coords.x2 - coords.x1) * (coords.y2 - coords.y1))
  },

  /**
   * Calculate the center point of coordinates
   */
  calculateCenter(coords: DiagramCoordinates): { x: number; y: number } {
    return {
      x: (coords.x1 + coords.x2) / 2,
      y: (coords.y1 + coords.y2) / 2
    }
  },

  /**
   * Expand coordinates by a specified amount
   */
  expandCoordinates(coords: DiagramCoordinates, amount: number): DiagramCoordinates {
    return {
      ...coords,
      x1: coords.x1 - amount,
      y1: coords.y1 - amount,
      x2: coords.x2 + amount,
      y2: coords.y2 + amount
    }
  },

  /**
   * Normalize coordinates to ensure proper order
   */
  normalizeCoordinates(coords: DiagramCoordinates): DiagramCoordinates {
    return {
      ...coords,
      x1: Math.min(coords.x1, coords.x2),
      y1: Math.min(coords.y1, coords.y2),
      x2: Math.max(coords.x1, coords.x2),
      y2: Math.max(coords.y1, coords.y2)
    }
  }
}

export default CoordinateEditor