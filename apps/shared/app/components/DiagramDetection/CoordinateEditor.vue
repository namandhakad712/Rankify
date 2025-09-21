<template>
  <div class="coordinate-editor" :class="{ 'is-editing': isEditing }">
    <!-- Editor Header -->
    <div class="editor-header">
      <h3 class="editor-title">Edit Diagram Coordinates</h3>
      <div class="editor-controls">
        <button 
          class="btn btn-secondary" 
          @click="resetCoordinates"
          :disabled="!hasChanges"
        >
          Reset
        </button>
        <button 
          class="btn btn-secondary" 
          @click="cancelEdit"
        >
          Cancel
        </button>
        <button 
          class="btn btn-primary" 
          @click="saveCoordinates"
          :disabled="!isValid || !hasChanges"
        >
          Save Changes
        </button>
      </div>
    </div>

    <!-- Canvas Container -->
    <div class="canvas-container" ref="canvasContainer">
      <canvas
        ref="canvas"
        class="editing-canvas"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @wheel="handleWheel"
      />
      
      <!-- Coordinate Info Overlay -->
      <div class="coordinate-info" v-if="currentCoordinates">
        <div class="info-item">
          <label>X1:</label>
          <input 
            type="number" 
            v-model.number="currentCoordinates.x1"
            @input="updateCoordinatesFromInput"
            :min="0"
            :max="imageWidth"
          />
        </div>
        <div class="info-item">
          <label>Y1:</label>
          <input 
            type="number" 
            v-model.number="currentCoordinates.y1"
            @input="updateCoordinatesFromInput"
            :min="0"
            :max="imageHeight"
          />
        </div>
        <div class="info-item">
          <label>X2:</label>
          <input 
            type="number" 
            v-model.number="currentCoordinates.x2"
            @input="updateCoordinatesFromInput"
            :min="currentCoordinates.x1 + 10"
            :max="imageWidth"
          />
        </div>
        <div class="info-item">
          <label>Y2:</label>
          <input 
            type="number" 
            v-model.number="currentCoordinates.y2"
            @input="updateCoordinatesFromInput"
            :min="currentCoordinates.y1 + 10"
            :max="imageHeight"
          />
        </div>
      </div>

      <!-- Validation Messages -->
      <div class="validation-messages" v-if="validationErrors.length > 0">
        <div 
          v-for="error in validationErrors" 
          :key="error"
          class="validation-error"
        >
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Editor Footer -->
    <div class="editor-footer">
      <div class="editor-stats">
        <span class="stat-item">
          Width: {{ coordinateWidth }}px
        </span>
        <span class="stat-item">
          Height: {{ coordinateHeight }}px
        </span>
        <span class="stat-item">
          Area: {{ coordinateArea }}px²
        </span>
      </div>
      
      <div class="editor-actions">
        <button 
          class="btn btn-outline" 
          @click="fitToView"
        >
          Fit to View
        </button>
        <button 
          class="btn btn-outline" 
          @click="zoomToCoordinates"
        >
          Zoom to Selection
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { 
  DiagramCoordinates, 
  ImageDimensions,
  CoordinateValidationResult 
} from '~/shared/types/diagram-detection'
import { CoordinateValidator } from '~/app/utils/coordinateValidator'
import { CoordinateSanitizer } from '~/app/utils/coordinateSanitizer'

// Props
interface Props {
  diagram: DiagramCoordinates
  pageImage: string | Blob
  imageDimensions: ImageDimensions
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

// Emits
const emit = defineEmits<{
  save: [coordinates: DiagramCoordinates]
  cancel: []
  change: [coordinates: DiagramCoordinates]
}>()

// Refs
const canvas = ref<HTMLCanvasElement>()
const canvasContainer = ref<HTMLDivElement>()
const ctx = ref<CanvasRenderingContext2D>()

// State
const isEditing = ref(false)
const currentCoordinates = ref<DiagramCoordinates>({ ...props.diagram })
const originalCoordinates = ref<DiagramCoordinates>({ ...props.diagram })
const validationErrors = ref<string[]>([])

// Canvas state
const canvasScale = ref(1)
const canvasOffset = ref({ x: 0, y: 0 })
const imageLoaded = ref(false)
const pageImageElement = ref<HTMLImageElement>()

// Interaction state
const isDragging = ref(false)
const dragHandle = ref<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null)
const dragStart = ref({ x: 0, y: 0 })
const lastMousePos = ref({ x: 0, y: 0 })

// Utilities
const validator = new CoordinateValidator()
const sanitizer = new CoordinateSanitizer()

// Computed properties
const imageWidth = computed(() => props.imageDimensions.width)
const imageHeight = computed(() => props.imageDimensions.height)

const hasChanges = computed(() => {
  const current = currentCoordinates.value
  const original = originalCoordinates.value
  return (
    current.x1 !== original.x1 ||
    current.y1 !== original.y1 ||
    current.x2 !== original.x2 ||
    current.y2 !== original.y2
  )
})

const isValid = computed(() => {
  return validationErrors.value.length === 0
})

const coordinateWidth = computed(() => {
  return Math.abs(currentCoordinates.value.x2 - currentCoordinates.value.x1)
})

const coordinateHeight = computed(() => {
  return Math.abs(currentCoordinates.value.y2 - currentCoordinates.value.y1)
})

const coordinateArea = computed(() => {
  return coordinateWidth.value * coordinateHeight.value
})

// Methods
const initializeCanvas = async () => {
  if (!canvas.value || !canvasContainer.value) return

  const canvasEl = canvas.value
  const container = canvasContainer.value
  
  // Set canvas size to container size
  const rect = container.getBoundingClientRect()
  canvasEl.width = rect.width
  canvasEl.height = rect.height
  
  ctx.value = canvasEl.getContext('2d')!
  
  // Load page image
  await loadPageImage()
  
  // Initial render
  renderCanvas()
}

const loadPageImage = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      pageImageElement.value = img
      imageLoaded.value = true
      
      // Calculate initial scale to fit image in canvas
      const canvasEl = canvas.value!
      const scaleX = canvasEl.width / img.width
      const scaleY = canvasEl.height / img.height
      canvasScale.value = Math.min(scaleX, scaleY, 1) // Don't scale up
      
      // Center the image
      canvasOffset.value = {
        x: (canvasEl.width - img.width * canvasScale.value) / 2,
        y: (canvasEl.height - img.height * canvasScale.value) / 2
      }
      
      resolve()
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load page image'))
    }
    
    if (typeof props.pageImage === 'string') {
      img.src = props.pageImage
    } else {
      const url = URL.createObjectURL(props.pageImage)
      img.src = url
    }
  })
}

const renderCanvas = () => {
  if (!ctx.value || !canvas.value || !pageImageElement.value || !imageLoaded.value) return

  const canvasEl = canvas.value
  const context = ctx.value
  const img = pageImageElement.value
  
  // Clear canvas
  context.clearRect(0, 0, canvasEl.width, canvasEl.height)
  
  // Draw page image
  context.drawImage(
    img,
    canvasOffset.value.x,
    canvasOffset.value.y,
    img.width * canvasScale.value,
    img.height * canvasScale.value
  )
  
  // Draw coordinate overlay
  drawCoordinateOverlay()
}

const drawCoordinateOverlay = () => {
  if (!ctx.value || !currentCoordinates.value) return

  const context = ctx.value
  const coords = currentCoordinates.value
  
  // Convert image coordinates to canvas coordinates
  const canvasCoords = imageToCanvasCoordinates(coords)
  
  // Draw selection rectangle
  context.strokeStyle = '#007bff'
  context.lineWidth = 2
  context.setLineDash([])
  context.strokeRect(
    canvasCoords.x1,
    canvasCoords.y1,
    canvasCoords.x2 - canvasCoords.x1,
    canvasCoords.y2 - canvasCoords.y1
  )
  
  // Draw selection overlay
  context.fillStyle = 'rgba(0, 123, 255, 0.1)'
  context.fillRect(
    canvasCoords.x1,
    canvasCoords.y1,
    canvasCoords.x2 - canvasCoords.x1,
    canvasCoords.y2 - canvasCoords.y1
  )
  
  if (!props.readonly) {
    // Draw resize handles
    drawResizeHandles(canvasCoords)
  }
}

const drawResizeHandles = (canvasCoords: DiagramCoordinates) => {
  if (!ctx.value) return

  const context = ctx.value
  const handleSize = 8
  
  context.fillStyle = '#007bff'
  context.strokeStyle = '#ffffff'
  context.lineWidth = 1
  context.setLineDash([])
  
  // Top-left handle
  context.fillRect(canvasCoords.x1 - handleSize/2, canvasCoords.y1 - handleSize/2, handleSize, handleSize)
  context.strokeRect(canvasCoords.x1 - handleSize/2, canvasCoords.y1 - handleSize/2, handleSize, handleSize)
  
  // Top-right handle
  context.fillRect(canvasCoords.x2 - handleSize/2, canvasCoords.y1 - handleSize/2, handleSize, handleSize)
  context.strokeRect(canvasCoords.x2 - handleSize/2, canvasCoords.y1 - handleSize/2, handleSize, handleSize)
  
  // Bottom-left handle
  context.fillRect(canvasCoords.x1 - handleSize/2, canvasCoords.y2 - handleSize/2, handleSize, handleSize)
  context.strokeRect(canvasCoords.x1 - handleSize/2, canvasCoords.y2 - handleSize/2, handleSize, handleSize)
  
  // Bottom-right handle
  context.fillRect(canvasCoords.x2 - handleSize/2, canvasCoords.y2 - handleSize/2, handleSize, handleSize)
  context.strokeRect(canvasCoords.x2 - handleSize/2, canvasCoords.y2 - handleSize/2, handleSize, handleSize)
}

const imageToCanvasCoordinates = (coords: DiagramCoordinates): DiagramCoordinates => {
  return {
    x1: coords.x1 * canvasScale.value + canvasOffset.value.x,
    y1: coords.y1 * canvasScale.value + canvasOffset.value.y,
    x2: coords.x2 * canvasScale.value + canvasOffset.value.x,
    y2: coords.y2 * canvasScale.value + canvasOffset.value.y,
    confidence: coords.confidence,
    type: coords.type,
    description: coords.description
  }
}

const canvasToImageCoordinates = (canvasX: number, canvasY: number): { x: number, y: number } => {
  return {
    x: (canvasX - canvasOffset.value.x) / canvasScale.value,
    y: (canvasY - canvasOffset.value.y) / canvasScale.value
  }
}

const getMousePosition = (event: MouseEvent): { x: number, y: number } => {
  const rect = canvas.value!.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

const getHandleAtPosition = (x: number, y: number): 'tl' | 'tr' | 'bl' | 'br' | 'move' | null => {
  const canvasCoords = imageToCanvasCoordinates(currentCoordinates.value)
  const handleSize = 8
  const tolerance = handleSize / 2
  
  // Check corner handles
  if (Math.abs(x - canvasCoords.x1) <= tolerance && Math.abs(y - canvasCoords.y1) <= tolerance) {
    return 'tl'
  }
  if (Math.abs(x - canvasCoords.x2) <= tolerance && Math.abs(y - canvasCoords.y1) <= tolerance) {
    return 'tr'
  }
  if (Math.abs(x - canvasCoords.x1) <= tolerance && Math.abs(y - canvasCoords.y2) <= tolerance) {
    return 'bl'
  }
  if (Math.abs(x - canvasCoords.x2) <= tolerance && Math.abs(y - canvasCoords.y2) <= tolerance) {
    return 'br'
  }
  
  // Check if inside selection area (for moving)
  if (x >= canvasCoords.x1 && x <= canvasCoords.x2 && 
      y >= canvasCoords.y1 && y <= canvasCoords.y2) {
    return 'move'
  }
  
  return null
}

// Event handlers
const handleMouseDown = (event: MouseEvent) => {
  if (props.readonly) return

  const mousePos = getMousePosition(event)
  const handle = getHandleAtPosition(mousePos.x, mousePos.y)
  
  if (handle) {
    isDragging.value = true
    dragHandle.value = handle
    dragStart.value = mousePos
    lastMousePos.value = mousePos
    isEditing.value = true
    
    // Change cursor
    updateCursor(handle)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const mousePos = getMousePosition(event)
  lastMousePos.value = mousePos
  
  if (!isDragging.value) {
    // Update cursor based on hover position
    const handle = getHandleAtPosition(mousePos.x, mousePos.y)
    updateCursor(handle)
    return
  }
  
  if (!dragHandle.value) return
  
  // Calculate movement delta
  const deltaX = mousePos.x - dragStart.value.x
  const deltaY = mousePos.y - dragStart.value.y
  
  // Convert to image coordinates
  const imageDelta = {
    x: deltaX / canvasScale.value,
    y: deltaY / canvasScale.value
  }
  
  // Update coordinates based on drag handle
  updateCoordinatesFromDrag(dragHandle.value, imageDelta)
  
  // Update drag start for next movement
  dragStart.value = mousePos
}

const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    dragHandle.value = null
    isEditing.value = false
    
    // Validate and emit change
    validateCoordinates()
    emit('change', currentCoordinates.value)
  }
  
  updateCursor(null)
}

const handleMouseLeave = () => {
  handleMouseUp()
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const mousePos = getMousePosition(event)
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(5, canvasScale.value * zoomFactor))
  
  // Zoom towards mouse position
  const scaleChange = newScale / canvasScale.value
  canvasOffset.value.x = mousePos.x - (mousePos.x - canvasOffset.value.x) * scaleChange
  canvasOffset.value.y = mousePos.y - (mousePos.y - canvasOffset.value.y) * scaleChange
  
  canvasScale.value = newScale
  renderCanvas()
}

const updateCoordinatesFromDrag = (handle: string, delta: { x: number, y: number }) => {
  const coords = { ...currentCoordinates.value }
  
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
  }
  
  // Ensure coordinates are within bounds and properly ordered
  coords.x1 = Math.max(0, Math.min(coords.x1, imageWidth.value))
  coords.y1 = Math.max(0, Math.min(coords.y1, imageHeight.value))
  coords.x2 = Math.max(0, Math.min(coords.x2, imageWidth.value))
  coords.y2 = Math.max(0, Math.min(coords.y2, imageHeight.value))
  
  // Ensure x2 > x1 and y2 > y1
  if (coords.x2 <= coords.x1) {
    if (handle.includes('l')) coords.x1 = coords.x2 - 10
    else coords.x2 = coords.x1 + 10
  }
  if (coords.y2 <= coords.y1) {
    if (handle.includes('t')) coords.y1 = coords.y2 - 10
    else coords.y2 = coords.y1 + 10
  }
  
  currentCoordinates.value = coords
  renderCanvas()
}

const updateCoordinatesFromInput = () => {
  validateCoordinates()
  renderCanvas()
  emit('change', currentCoordinates.value)
}

const updateCursor = (handle: string | null) => {
  if (!canvas.value) return
  
  const cursors = {
    'tl': 'nw-resize',
    'tr': 'ne-resize',
    'bl': 'sw-resize',
    'br': 'se-resize',
    'move': 'move'
  }
  
  canvas.value.style.cursor = handle ? cursors[handle] || 'default' : 'default'
}

const validateCoordinates = () => {
  const result = validator.validateBounds(currentCoordinates.value, props.imageDimensions)
  validationErrors.value = result.errors
}

const resetCoordinates = () => {
  currentCoordinates.value = { ...originalCoordinates.value }
  validateCoordinates()
  renderCanvas()
}

const cancelEdit = () => {
  resetCoordinates()
  emit('cancel')
}

const saveCoordinates = () => {
  if (!isValid.value) return
  
  // Sanitize coordinates before saving
  const sanitized = sanitizer.sanitizeForStorage(currentCoordinates.value, props.imageDimensions)
  if (sanitized.sanitized) {
    originalCoordinates.value = { ...sanitized.sanitized }
    emit('save', sanitized.sanitized)
  }
}

const fitToView = () => {
  if (!pageImageElement.value || !canvas.value) return
  
  const img = pageImageElement.value
  const canvasEl = canvas.value
  
  const scaleX = canvasEl.width / img.width
  const scaleY = canvasEl.height / img.height
  canvasScale.value = Math.min(scaleX, scaleY, 1)
  
  canvasOffset.value = {
    x: (canvasEl.width - img.width * canvasScale.value) / 2,
    y: (canvasEl.height - img.height * canvasScale.value) / 2
  }
  
  renderCanvas()
}

const zoomToCoordinates = () => {
  if (!canvas.value) return
  
  const coords = currentCoordinates.value
  const canvasEl = canvas.value
  
  // Calculate scale to fit coordinates with some padding
  const padding = 50
  const coordWidth = coords.x2 - coords.x1
  const coordHeight = coords.y2 - coords.y1
  
  const scaleX = (canvasEl.width - padding * 2) / coordWidth
  const scaleY = (canvasEl.height - padding * 2) / coordHeight
  canvasScale.value = Math.min(scaleX, scaleY, 3) // Max 3x zoom
  
  // Center on coordinates
  const centerX = (coords.x1 + coords.x2) / 2
  const centerY = (coords.y1 + coords.y2) / 2
  
  canvasOffset.value = {
    x: canvasEl.width / 2 - centerX * canvasScale.value,
    y: canvasEl.height / 2 - centerY * canvasScale.value
  }
  
  renderCanvas()
}

// Watchers
watch(() => props.diagram, (newDiagram) => {
  currentCoordinates.value = { ...newDiagram }
  originalCoordinates.value = { ...newDiagram }
  validateCoordinates()
  renderCanvas()
}, { deep: true })

watch(() => props.pageImage, () => {
  loadPageImage().then(() => renderCanvas())
})

// Lifecycle
onMounted(async () => {
  await nextTick()
  await initializeCanvas()
  
  // Handle window resize
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  // Clean up blob URL if needed
  if (typeof props.pageImage !== 'string' && pageImageElement.value?.src) {
    URL.revokeObjectURL(pageImageElement.value.src)
  }
})

const handleResize = () => {
  nextTick(() => {
    initializeCanvas()
  })
}
</script>

<style scoped>
.coordinate-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
}

.editor-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #495057;
}

.editor-controls {
  display: flex;
  gap: 0.5rem;
}

.canvas-container {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #ffffff;
}

.editing-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.coordinate-info {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  min-width: 200px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-item label {
  font-weight: 500;
  min-width: 24px;
  color: #495057;
}

.info-item input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
}

.validation-messages {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
}

.validation-error {
  background: #f8d7da;
  color: #721c24;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #ffffff;
  border-top: 1px solid #e9ecef;
}

.editor-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  font-size: 0.875rem;
  color: #6c757d;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
  border-color: #545b62;
}

.btn-outline {
  background: transparent;
  color: #007bff;
  border-color: #007bff;
}

.btn-outline:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.is-editing .editing-canvas {
  cursor: crosshair;
}

/* Responsive design */
@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .editor-controls {
    justify-content: center;
  }
  
  .coordinate-info {
    position: static;
    margin: 1rem;
    grid-template-columns: 1fr;
  }
  
  .editor-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .editor-stats {
    justify-content: center;
  }
  
  .editor-actions {
    justify-content: center;
  }
}
</style>