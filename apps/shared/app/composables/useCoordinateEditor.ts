/**
 * Coordinate Editor Composable
 * 
 * Provides reactive coordinate editing functionality that can be used
 * across different Vue components.
 */

import { ref, computed, watch, type Ref } from 'vue'
import type { 
  DiagramCoordinates, 
  ImageDimensions,
  CoordinateValidationResult
} from '~/shared/types/diagram-detection'
import { 
  CoordinateEditingLogic, 
  createCoordinateEditingLogic,
  type DragState,
  type EditorState
} from '~/app/utils/coordinateEditingLogic'

export interface UseCoordinateEditorOptions {
  imageSize: ImageDimensions
  minSize?: number
  snapToGrid?: boolean
  gridSize?: number
  autoValidate?: boolean
  constrainToBounds?: boolean
}

export interface CoordinateEditorState {
  coordinates: Ref<DiagramCoordinates>
  originalCoordinates: Ref<DiagramCoordinates>
  isValid: Ref<boolean>
  validationErrors: Ref<string[]>
  isDragging: Ref<boolean>
  dragHandle: Ref<string | null>
  hasChanges: Ref<boolean>
}

export interface CoordinateEditorActions {
  updateCoordinates: (coords: Partial<DiagramCoordinates>) => void
  setCoordinates: (coords: DiagramCoordinates) => void
  resetCoordinates: () => void
  validateCoordinates: () => CoordinateValidationResult
  sanitizeCoordinates: () => DiagramCoordinates
  startDrag: (position: { x: number; y: number }, editorState: EditorState) => void
  updateDrag: (position: { x: number; y: number }, editorState: EditorState) => void
  endDrag: () => void
  getHandleAtPosition: (position: { x: number; y: number }, editorState: EditorState) => string | null
  getCursorStyle: (position: { x: number; y: number }, editorState: EditorState) => string
}

export function useCoordinateEditor(
  initialCoordinates: DiagramCoordinates,
  options: UseCoordinateEditorOptions
) {
  // Initialize editing logic
  const editingLogic = createCoordinateEditingLogic(options.imageSize, {
    minSize: options.minSize,
    snapToGrid: options.snapToGrid,
    gridSize: options.gridSize
  })

  // Reactive state
  const coordinates = ref<DiagramCoordinates>({ ...initialCoordinates })
  const originalCoordinates = ref<DiagramCoordinates>({ ...initialCoordinates })
  const validationErrors = ref<string[]>([])
  const dragState = ref<DragState | null>(null)

  // Computed properties
  const isValid = computed(() => validationErrors.value.length === 0)
  const isDragging = computed(() => dragState.value?.isDragging ?? false)
  const dragHandle = computed(() => dragState.value?.handle ?? null)
  const hasChanges = computed(() => {
    const current = coordinates.value
    const original = originalCoordinates.value
    
    return (
      current.x1 !== original.x1 ||
      current.y1 !== original.y1 ||
      current.x2 !== original.x2 ||
      current.y2 !== original.y2 ||
      current.type !== original.type ||
      current.description !== original.description
    )
  })

  // Watch for coordinate changes and auto-validate
  watch(coordinates, () => {
    if (options.autoValidate !== false) {
      validateCoordinates()
    }
  }, { deep: true })

  // Actions
  function updateCoordinates(updates: Partial<DiagramCoordinates>) {
    const newCoords = { ...coordinates.value, ...updates }
    
    if (options.constrainToBounds !== false) {
      const sanitized = editingLogic.sanitizeCoordinates(newCoords)
      coordinates.value = sanitized
    } else {
      coordinates.value = newCoords
    }
  }

  function setCoordinates(coords: DiagramCoordinates) {
    coordinates.value = { ...coords }
    if (options.autoValidate !== false) {
      validateCoordinates()
    }
  }

  function resetCoordinates() {
    coordinates.value = { ...originalCoordinates.value }
    validationErrors.value = []
  }

  function validateCoordinates(): CoordinateValidationResult {
    const result = editingLogic.validateCoordinates(coordinates.value)
    validationErrors.value = result.errors
    return result
  }

  function sanitizeCoordinates(): DiagramCoordinates {
    const sanitized = editingLogic.sanitizeCoordinates(coordinates.value)
    coordinates.value = sanitized
    return sanitized
  }

  function startDrag(position: { x: number; y: number }, editorState: EditorState) {
    dragState.value = editingLogic.startDrag(position, coordinates.value, editorState)
  }

  function updateDrag(position: { x: number; y: number }, editorState: EditorState) {
    if (dragState.value) {
      const newCoords = editingLogic.updateDrag(position, dragState.value, editorState)
      coordinates.value = newCoords
    }
  }

  function endDrag() {
    if (dragState.value) {
      const finalCoords = editingLogic.endDrag(dragState.value)
      coordinates.value = finalCoords
      dragState.value = null
    }
  }

  function getHandleAtPosition(position: { x: number; y: number }, editorState: EditorState): string | null {
    return editingLogic.getHandleAtPosition(position, coordinates.value, editorState)
  }

  function getCursorStyle(position: { x: number; y: number }, editorState: EditorState): string {
    return editingLogic.getCursorStyle(position, coordinates.value, editorState, isDragging.value)
  }

  // Initialize validation
  if (options.autoValidate !== false) {
    validateCoordinates()
  }

  // Return state and actions
  const state: CoordinateEditorState = {
    coordinates,
    originalCoordinates,
    isValid,
    validationErrors,
    isDragging,
    dragHandle,
    hasChanges
  }

  const actions: CoordinateEditorActions = {
    updateCoordinates,
    setCoordinates,
    resetCoordinates,
    validateCoordinates,
    sanitizeCoordinates,
    startDrag,
    updateDrag,
    endDrag,
    getHandleAtPosition,
    getCursorStyle
  }

  return {
    ...state,
    ...actions
  }
}

/**
 * Composable for managing multiple coordinate editors
 */
export function useMultipleCoordinateEditors(
  initialCoordinatesList: DiagramCoordinates[],
  options: UseCoordinateEditorOptions
) {
  const editors = ref<ReturnType<typeof useCoordinateEditor>[]>([])
  const activeEditorIndex = ref<number | null>(null)

  // Initialize editors
  function initializeEditors() {
    editors.value = initialCoordinatesList.map(coords => 
      useCoordinateEditor(coords, options)
    )
  }

  // Add new editor
  function addEditor(coordinates: DiagramCoordinates) {
    const editor = useCoordinateEditor(coordinates, options)
    editors.value.push(editor)
    return editors.value.length - 1
  }

  // Remove editor
  function removeEditor(index: number) {
    if (index >= 0 && index < editors.value.length) {
      editors.value.splice(index, 1)
      
      // Adjust active editor index
      if (activeEditorIndex.value === index) {
        activeEditorIndex.value = null
      } else if (activeEditorIndex.value !== null && activeEditorIndex.value > index) {
        activeEditorIndex.value--
      }
    }
  }

  // Get active editor
  const activeEditor = computed(() => {
    if (activeEditorIndex.value !== null && activeEditorIndex.value < editors.value.length) {
      return editors.value[activeEditorIndex.value]
    }
    return null
  })

  // Get all coordinates
  const allCoordinates = computed(() => {
    return editors.value.map(editor => editor.coordinates.value)
  })

  // Check if any editor has changes
  const hasAnyChanges = computed(() => {
    return editors.value.some(editor => editor.hasChanges.value)
  })

  // Check if all editors are valid
  const allValid = computed(() => {
    return editors.value.every(editor => editor.isValid.value)
  })

  // Validate all editors
  function validateAllEditors() {
    return editors.value.map(editor => editor.validateCoordinates())
  }

  // Reset all editors
  function resetAllEditors() {
    editors.value.forEach(editor => editor.resetCoordinates())
  }

  // Set active editor
  function setActiveEditor(index: number | null) {
    if (index === null || (index >= 0 && index < editors.value.length)) {
      activeEditorIndex.value = index
    }
  }

  // Initialize
  initializeEditors()

  return {
    editors,
    activeEditor,
    activeEditorIndex,
    allCoordinates,
    hasAnyChanges,
    allValid,
    addEditor,
    removeEditor,
    setActiveEditor,
    validateAllEditors,
    resetAllEditors
  }
}

/**
 * Composable for coordinate editor keyboard shortcuts
 */
export function useCoordinateEditorKeyboard(
  editor: ReturnType<typeof useCoordinateEditor>,
  options: {
    moveStep?: number
    resizeStep?: number
    enabled?: Ref<boolean>
  } = {}
) {
  const moveStep = options.moveStep ?? 1
  const resizeStep = options.resizeStep ?? 1
  const enabled = options.enabled ?? ref(true)

  function handleKeydown(event: KeyboardEvent) {
    if (!enabled.value) return

    const coords = editor.coordinates.value
    let newCoords = { ...coords }
    let handled = false

    // Movement with arrow keys
    if (event.key === 'ArrowLeft') {
      newCoords.x1 = Math.max(0, coords.x1 - moveStep)
      newCoords.x2 = coords.x2 - moveStep
      handled = true
    } else if (event.key === 'ArrowRight') {
      newCoords.x1 = coords.x1 + moveStep
      newCoords.x2 = coords.x2 + moveStep
      handled = true
    } else if (event.key === 'ArrowUp') {
      newCoords.y1 = Math.max(0, coords.y1 - moveStep)
      newCoords.y2 = coords.y2 - moveStep
      handled = true
    } else if (event.key === 'ArrowDown') {
      newCoords.y1 = coords.y1 + moveStep
      newCoords.y2 = coords.y2 + moveStep
      handled = true
    }

    // Resizing with Shift + arrow keys
    if (event.shiftKey) {
      if (event.key === 'ArrowLeft') {
        newCoords.x2 = Math.max(coords.x1 + 10, coords.x2 - resizeStep)
        handled = true
      } else if (event.key === 'ArrowRight') {
        newCoords.x2 = coords.x2 + resizeStep
        handled = true
      } else if (event.key === 'ArrowUp') {
        newCoords.y2 = Math.max(coords.y1 + 10, coords.y2 - resizeStep)
        handled = true
      } else if (event.key === 'ArrowDown') {
        newCoords.y2 = coords.y2 + resizeStep
        handled = true
      }
    }

    // Reset with Escape
    if (event.key === 'Escape') {
      editor.resetCoordinates()
      handled = true
    }

    if (handled) {
      event.preventDefault()
      editor.setCoordinates(newCoords)
    }
  }

  return {
    handleKeydown
  }
}

export default useCoordinateEditor