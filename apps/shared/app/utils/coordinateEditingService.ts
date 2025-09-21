/**
 * Coordinate Editing Service
 * 
 * This service provides advanced coordinate editing functionality including
 * batch operations, history management, and precision tools.
 */

import type { 
  DiagramCoordinates,
  DiagramEditSession,
  DiagramEditEvent,
  ImageDimensions,
  CoordinateValidationResult
} from '~/shared/types/diagram-detection'
import { CoordinateValidator } from './coordinateValidator'
import { CoordinateSanitizer } from './coordinateSanitizer'

export interface EditingHistory {
  id: string
  timestamp: Date
  action: 'create' | 'move' | 'resize' | 'delete' | 'batch'
  coordinates: DiagramCoordinates
  previousCoordinates?: DiagramCoordinates
  description: string
}

export interface BatchEditOperation {
  type: 'move' | 'resize' | 'align' | 'distribute' | 'scale'
  diagramIds: string[]
  parameters: Record<string, any>
}

export interface AlignmentOptions {
  type: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical'
  reference?: 'first' | 'last' | 'largest' | 'smallest' | 'page-center'
}

export interface DistributionOptions {
  type: 'horizontal' | 'vertical'
  spacing: 'equal' | 'fixed'
  fixedSpacing?: number
}

export interface ScalingOptions {
  factor: number
  origin: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  maintainAspectRatio: boolean
}

export class CoordinateEditingService {
  private validator: CoordinateValidator
  private sanitizer: CoordinateSanitizer
  private editingHistory: Map<string, EditingHistory[]> = new Map()
  private activeSessions: Map<string, DiagramEditSession> = new Map()
  private eventListeners: Array<(event: DiagramEditEvent) => void> = []

  constructor() {
    this.validator = new CoordinateValidator()
    this.sanitizer = new CoordinateSanitizer()
  }

  /**
   * Start an editing session for a diagram
   */
  startEditingSession(
    questionId: string,
    diagramId: string,
    coordinates: DiagramCoordinates
  ): DiagramEditSession {
    const session: DiagramEditSession = {
      questionId,
      diagramId,
      originalCoordinates: { ...coordinates },
      currentCoordinates: { ...coordinates },
      isModified: false,
      startTime: new Date()
    }

    this.activeSessions.set(`${questionId}_${diagramId}`, session)
    return session
  }

  /**
   * Update coordinates in an active editing session
   */
  updateCoordinates(
    questionId: string,
    diagramId: string,
    coordinates: DiagramCoordinates,
    imageDimensions: ImageDimensions
  ): CoordinateValidationResult {
    const sessionKey = `${questionId}_${diagramId}`
    const session = this.activeSessions.get(sessionKey)

    if (!session) {
      throw new Error('No active editing session found')
    }

    // Validate coordinates
    const validation = this.validator.validateCoordinates(coordinates, imageDimensions)
    
    if (validation.isValid) {
      // Sanitize coordinates
      const sanitized = this.sanitizer.sanitizeForStorage(coordinates, imageDimensions)
      
      if (sanitized.sanitized) {
        session.currentCoordinates = sanitized.sanitized
        session.isModified = !this.coordinatesEqual(
          session.originalCoordinates,
          session.currentCoordinates
        )

        // Emit update event
        this.emitEvent({
          type: 'COORDINATE_CHANGED',
          questionId,
          diagramId,
          coordinates: session.currentCoordinates,
          timestamp: new Date()
        })

        return { isValid: true, errors: [], sanitizedCoordinates: sanitized.sanitized }
      }
    }

    return validation
  }

  /**
   * Save coordinates and end editing session
   */
  saveCoordinates(
    questionId: string,
    diagramId: string,
    description?: string
  ): DiagramCoordinates | null {
    const sessionKey = `${questionId}_${diagramId}`
    const session = this.activeSessions.get(sessionKey)

    if (!session) {
      throw new Error('No active editing session found')
    }

    if (session.isModified) {
      // Add to history
      this.addToHistory(questionId, {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        action: 'resize',
        coordinates: session.currentCoordinates,
        previousCoordinates: session.originalCoordinates,
        description: description || 'Manual coordinate adjustment'
      })

      // Clean up session
      this.activeSessions.delete(sessionKey)

      return session.currentCoordinates
    }

    // Clean up session without saving
    this.activeSessions.delete(sessionKey)
    return null
  }

  /**
   * Cancel editing session
   */
  cancelEditing(questionId: string, diagramId: string): void {
    const sessionKey = `${questionId}_${diagramId}`
    this.activeSessions.delete(sessionKey)
  }

  /**
   * Get active editing session
   */
  getEditingSession(questionId: string, diagramId: string): DiagramEditSession | null {
    const sessionKey = `${questionId}_${diagramId}`
    return this.activeSessions.get(sessionKey) || null
  }

  /**
   * Perform batch edit operation on multiple diagrams
   */
  performBatchEdit(
    operation: BatchEditOperation,
    diagrams: Map<string, DiagramCoordinates>,
    imageDimensions: ImageDimensions
  ): Map<string, DiagramCoordinates> {
    const results = new Map<string, DiagramCoordinates>()

    switch (operation.type) {
      case 'align':
        return this.alignDiagrams(
          operation.diagramIds,
          diagrams,
          operation.parameters as AlignmentOptions,
          imageDimensions
        )
      
      case 'distribute':
        return this.distributeDiagrams(
          operation.diagramIds,
          diagrams,
          operation.parameters as DistributionOptions,
          imageDimensions
        )
      
      case 'scale':
        return this.scaleDiagrams(
          operation.diagramIds,
          diagrams,
          operation.parameters as ScalingOptions,
          imageDimensions
        )
      
      case 'move':
        return this.moveDiagrams(
          operation.diagramIds,
          diagrams,
          operation.parameters as { deltaX: number; deltaY: number },
          imageDimensions
        )
      
      default:
        return results
    }
  }

  /**
   * Align multiple diagrams
   */
  private alignDiagrams(
    diagramIds: string[],
    diagrams: Map<string, DiagramCoordinates>,
    options: AlignmentOptions,
    imageDimensions: ImageDimensions
  ): Map<string, DiagramCoordinates> {
    const results = new Map<string, DiagramCoordinates>()
    const targetDiagrams = diagramIds.map(id => ({ id, coords: diagrams.get(id)! }))
      .filter(d => d.coords)

    if (targetDiagrams.length < 2) return results

    // Calculate reference position
    let referenceValue: number
    
    switch (options.type) {
      case 'left':
        referenceValue = this.getReferenceValue(targetDiagrams, options.reference, 'x1')
        targetDiagrams.forEach(({ id, coords }) => {
          const width = coords.x2 - coords.x1
          const newCoords = {
            ...coords,
            x1: referenceValue,
            x2: referenceValue + width
          }
          results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
        })
        break

      case 'right':
        referenceValue = this.getReferenceValue(targetDiagrams, options.reference, 'x2')
        targetDiagrams.forEach(({ id, coords }) => {
          const width = coords.x2 - coords.x1
          const newCoords = {
            ...coords,
            x1: referenceValue - width,
            x2: referenceValue
          }
          results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
        })
        break

      case 'top':
        referenceValue = this.getReferenceValue(targetDiagrams, options.reference, 'y1')
        targetDiagrams.forEach(({ id, coords }) => {
          const height = coords.y2 - coords.y1
          const newCoords = {
            ...coords,
            y1: referenceValue,
            y2: referenceValue + height
          }
          results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
        })
        break

      case 'bottom':
        referenceValue = this.getReferenceValue(targetDiagrams, options.reference, 'y2')
        targetDiagrams.forEach(({ id, coords }) => {
          const height = coords.y2 - coords.y1
          const newCoords = {
            ...coords,
            y1: referenceValue - height,
            y2: referenceValue
          }
          results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
        })
        break

      case 'center-horizontal':
        referenceValue = options.reference === 'page-center' 
          ? imageDimensions.width / 2
          : this.getReferenceValue(targetDiagrams, options.reference, 'centerX')
        
        targetDiagrams.forEach(({ id, coords }) => {
          const width = coords.x2 - coords.x1
          const newCoords = {
            ...coords,
            x1: referenceValue - width / 2,
            x2: referenceValue + width / 2
          }
          results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
        })
        break

      case 'center-vertical':
        referenceValue = options.reference === 'page-center' 
          ? imageDimensions.height / 2
          : this.getReferenceValue(targetDiagrams, options.reference, 'centerY')
        
        targetDiagrams.forEach(({ id, coords }) => {
          const height = coords.y2 - coords.y1
          const newCoords = {
            ...coords,
            y1: referenceValue - height / 2,
            y2: referenceValue + height / 2
          }
          results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
        })
        break
    }

    return results
  }

  /**
   * Distribute diagrams evenly
   */
  private distributeDiagrams(
    diagramIds: string[],
    diagrams: Map<string, DiagramCoordinates>,
    options: DistributionOptions,
    imageDimensions: ImageDimensions
  ): Map<string, DiagramCoordinates> {
    const results = new Map<string, DiagramCoordinates>()
    const targetDiagrams = diagramIds.map(id => ({ id, coords: diagrams.get(id)! }))
      .filter(d => d.coords)

    if (targetDiagrams.length < 3) return results

    // Sort diagrams by position
    if (options.type === 'horizontal') {
      targetDiagrams.sort((a, b) => a.coords.x1 - b.coords.x1)
    } else {
      targetDiagrams.sort((a, b) => a.coords.y1 - b.coords.y1)
    }

    const first = targetDiagrams[0]
    const last = targetDiagrams[targetDiagrams.length - 1]

    if (options.spacing === 'equal') {
      // Distribute with equal spacing between centers
      const totalDistance = options.type === 'horizontal'
        ? (last.coords.x1 + last.coords.x2) / 2 - (first.coords.x1 + first.coords.x2) / 2
        : (last.coords.y1 + last.coords.y2) / 2 - (first.coords.y1 + first.coords.y2) / 2

      const spacing = totalDistance / (targetDiagrams.length - 1)

      targetDiagrams.forEach(({ id, coords }, index) => {
        if (index === 0 || index === targetDiagrams.length - 1) {
          results.set(id, coords) // Keep first and last in place
          return
        }

        const newCoords = { ...coords }
        
        if (options.type === 'horizontal') {
          const targetCenterX = (first.coords.x1 + first.coords.x2) / 2 + spacing * index
          const width = coords.x2 - coords.x1
          newCoords.x1 = targetCenterX - width / 2
          newCoords.x2 = targetCenterX + width / 2
        } else {
          const targetCenterY = (first.coords.y1 + first.coords.y2) / 2 + spacing * index
          const height = coords.y2 - coords.y1
          newCoords.y1 = targetCenterY - height / 2
          newCoords.y2 = targetCenterY + height / 2
        }

        results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
      })
    }

    return results
  }

  /**
   * Scale diagrams
   */
  private scaleDiagrams(
    diagramIds: string[],
    diagrams: Map<string, DiagramCoordinates>,
    options: ScalingOptions,
    imageDimensions: ImageDimensions
  ): Map<string, DiagramCoordinates> {
    const results = new Map<string, DiagramCoordinates>()

    diagramIds.forEach(id => {
      const coords = diagrams.get(id)
      if (!coords) return

      const newCoords = this.scaleCoordinates(coords, options)
      results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
    })

    return results
  }

  /**
   * Move diagrams by delta
   */
  private moveDiagrams(
    diagramIds: string[],
    diagrams: Map<string, DiagramCoordinates>,
    delta: { deltaX: number; deltaY: number },
    imageDimensions: ImageDimensions
  ): Map<string, DiagramCoordinates> {
    const results = new Map<string, DiagramCoordinates>()

    diagramIds.forEach(id => {
      const coords = diagrams.get(id)
      if (!coords) return

      const newCoords = {
        ...coords,
        x1: coords.x1 + delta.deltaX,
        x2: coords.x2 + delta.deltaX,
        y1: coords.y1 + delta.deltaY,
        y2: coords.y2 + delta.deltaY
      }

      results.set(id, this.sanitizer.sanitizeForStorage(newCoords, imageDimensions).sanitized!)
    })

    return results
  }

  /**
   * Get editing history for a question
   */
  getEditingHistory(questionId: string): EditingHistory[] {
    return this.editingHistory.get(questionId) || []
  }

  /**
   * Undo last edit operation
   */
  undoLastEdit(questionId: string): DiagramCoordinates | null {
    const history = this.editingHistory.get(questionId)
    if (!history || history.length === 0) return null

    const lastEdit = history.pop()!
    return lastEdit.previousCoordinates || null
  }

  /**
   * Clear editing history for a question
   */
  clearHistory(questionId: string): void {
    this.editingHistory.delete(questionId)
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: DiagramEditEvent) => void): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: DiagramEditEvent) => void): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  // Private helper methods

  private coordinatesEqual(a: DiagramCoordinates, b: DiagramCoordinates): boolean {
    return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2
  }

  private addToHistory(questionId: string, entry: EditingHistory): void {
    if (!this.editingHistory.has(questionId)) {
      this.editingHistory.set(questionId, [])
    }

    const history = this.editingHistory.get(questionId)!
    history.push(entry)

    // Limit history to 50 entries
    if (history.length > 50) {
      history.shift()
    }
  }

  private emitEvent(event: DiagramEditEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in diagram edit event listener:', error)
      }
    })
  }

  private getReferenceValue(
    diagrams: Array<{ id: string; coords: DiagramCoordinates }>,
    reference: AlignmentOptions['reference'],
    property: 'x1' | 'x2' | 'y1' | 'y2' | 'centerX' | 'centerY'
  ): number {
    const getValue = (coords: DiagramCoordinates, prop: typeof property): number => {
      switch (prop) {
        case 'centerX': return (coords.x1 + coords.x2) / 2
        case 'centerY': return (coords.y1 + coords.y2) / 2
        default: return coords[prop]
      }
    }

    switch (reference) {
      case 'first':
        return getValue(diagrams[0].coords, property)
      case 'last':
        return getValue(diagrams[diagrams.length - 1].coords, property)
      case 'largest':
        const largest = diagrams.reduce((max, current) => {
          const maxArea = (max.coords.x2 - max.coords.x1) * (max.coords.y2 - max.coords.y1)
          const currentArea = (current.coords.x2 - current.coords.x1) * (current.coords.y2 - current.coords.y1)
          return currentArea > maxArea ? current : max
        })
        return getValue(largest.coords, property)
      case 'smallest':
        const smallest = diagrams.reduce((min, current) => {
          const minArea = (min.coords.x2 - min.coords.x1) * (min.coords.y2 - min.coords.y1)
          const currentArea = (current.coords.x2 - current.coords.x1) * (current.coords.y2 - current.coords.y1)
          return currentArea < minArea ? current : min
        })
        return getValue(smallest.coords, property)
      default:
        // Average of all diagrams
        const sum = diagrams.reduce((total, diagram) => total + getValue(diagram.coords, property), 0)
        return sum / diagrams.length
    }
  }

  private scaleCoordinates(coords: DiagramCoordinates, options: ScalingOptions): DiagramCoordinates {
    const width = coords.x2 - coords.x1
    const height = coords.y2 - coords.y1
    
    let originX: number, originY: number

    switch (options.origin) {
      case 'center':
        originX = coords.x1 + width / 2
        originY = coords.y1 + height / 2
        break
      case 'top-left':
        originX = coords.x1
        originY = coords.y1
        break
      case 'top-right':
        originX = coords.x2
        originY = coords.y1
        break
      case 'bottom-left':
        originX = coords.x1
        originY = coords.y2
        break
      case 'bottom-right':
        originX = coords.x2
        originY = coords.y2
        break
    }

    let newWidth = width * options.factor
    let newHeight = height * options.factor

    if (options.maintainAspectRatio) {
      const aspectRatio = width / height
      if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio
      } else {
        newHeight = newWidth / aspectRatio
      }
    }

    // Calculate new coordinates based on origin
    const newCoords = { ...coords }

    switch (options.origin) {
      case 'center':
        newCoords.x1 = originX - newWidth / 2
        newCoords.x2 = originX + newWidth / 2
        newCoords.y1 = originY - newHeight / 2
        newCoords.y2 = originY + newHeight / 2
        break
      case 'top-left':
        newCoords.x1 = originX
        newCoords.x2 = originX + newWidth
        newCoords.y1 = originY
        newCoords.y2 = originY + newHeight
        break
      case 'top-right':
        newCoords.x1 = originX - newWidth
        newCoords.x2 = originX
        newCoords.y1 = originY
        newCoords.y2 = originY + newHeight
        break
      case 'bottom-left':
        newCoords.x1 = originX
        newCoords.x2 = originX + newWidth
        newCoords.y1 = originY - newHeight
        newCoords.y2 = originY
        break
      case 'bottom-right':
        newCoords.x1 = originX - newWidth
        newCoords.x2 = originX
        newCoords.y1 = originY - newHeight
        newCoords.y2 = originY
        break
    }

    return newCoords
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.activeSessions.clear()
    this.editingHistory.clear()
    this.eventListeners.length = 0
  }
}

export default CoordinateEditingService