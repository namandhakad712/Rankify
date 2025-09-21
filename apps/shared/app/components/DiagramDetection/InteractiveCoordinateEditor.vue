<template>
  <div class="interactive-coordinate-editor">
    <!-- Editor Header -->
    <div class="editor-header">
      <h3 class="editor-title">Edit Diagram Coordinates</h3>
      <div class="editor-info">
        <span class="diagram-type">{{ diagram.type }}</span>
        <span class="confidence-score">Confidence: {{ Math.round(diagram.confidence * 100) }}%</span>
      </div>
    </div>

    <!-- Canvas Container -->
    <div class="canvas-container" ref="canvasContainer">
      <canvas
        ref="editorCanvas"
        class="coordinate-canvas"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @wheel="handleWheel"
        :style="{ cursor: currentCursor }"
      />
      
      <!-- Coordinate Display -->
      <div class="coordinate-display" v-if="showCoordinates">
        <div class="coord-info">
          <span>X1: {{ Math.round(currentCoordinates.x1) }}</span>
          <span>Y1: {{ Math.round(currentCoordinates.y1) }}</span>
          <span>X2: {{ Math.round(currentCoordinates.x2) }}</span>
          <span>Y2: {{ Math.round(currentCoordinates.y2) }}</span>
        </div>
        <div class="dimensions">
          <span>Width: {{ Math.round(currentCoordinates.x2 - currentCoordinates.x1) }}px</span>
          <span>Height: {{ Math.round(currentCoordinates.y2 - currentCoordinates.y1) }}px</span>
        </div>
      </div>

      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <button @click="zoomIn" class="zoom-btn" :disabled="zoomLevel >= maxZoom">
          <Icon name="plus" />
        </button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button @click="zoomOut" class="zoom-btn" :disabled="zoomLevel <= minZoom">
          <Icon name="minus" />
        </button>
        <button @click="resetZoom" class="zoom-btn">
          <Icon name="refresh" />
        </button>
      </div>
    </div>

    <!-- Editor Controls -->
    <div class="editor-controls">
      <div class="coordinate-inputs">
        <div class="input-group">
          <label>X1:</label>
          <input
            type="number"
            v-model.number="manualCoordinates.x1"
            @input="updateFromManualInput"
            :min="0"
            :max="imageWidth"
          />
        </div>
        <div class="input-group">
          <label>Y1:</label>
          <input
            type="number"
            v-model.number="manualCoordinates.y1"
            @input="updateFromManualInput"
            :min="0"
            :max="imageHeight"
          />
        </div>
        <div class="input-group">
          <label>X2:</label>
          <input
            type="number"
            v-model.number="manualCoordinates.x2"
            @input="updateFromManualInput"
            :min="0"
            :max="imageWidth"
          />
        </div>
        <div class="input-group">
          <label>Y2:</label>
          <input
            type="number"
            v-model.number="manualCoordinates.y2"
            @input="updateFromManualInput"
            :min="0"
            :max="imageHeight"
          />
        </div>
      </div>

      <div class="diagram-metadata">
        <div class="input-group">
          <label>Type:</label>
          <select v-model="currentDiagram.type" @change="updateDiagramType">
            <option value="graph">Graph</option>
            <option value="flowchart">Flowchart</option>
            <option value="scientific">Scientific</option>
            <option value="geometric">Geometric</option>
            <option value="table">Table</option>
            <option value="circuit">Circuit</option>
            <option value="map">Map</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="input-group">
          <label>Description:</label>
          <input
            type="text"
            v-model="currentDiagram.description"
            @input="updateDescription"
            placeholder="Brief description of the diagram"
            maxlength="200"
          />
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="editor-actions">
      <button @click="resetCoordinates" class="btn btn-secondary">
        <Icon name="undo" />
        Reset
      </button>
      <button @click="validateAndPreview" class="btn btn-info">
        <Icon name="eye" />
        Preview
      </button>
      <button @click="cancelEdit" class="btn btn-secondary">
        <Icon name="x" />
        Cancel
      </button>
      <button 
        @click="saveCoordinates" 
        class="btn btn-primary"
        :disabled="!isValidCoordinates"
      >
        <Icon name="check" />
        Save Changes
      </button>
    </div>

    <!-- Validation Messages -->
    <div class="validation-messages" v-if="validationErrors.length > 0">
      <div class="error-message" v-for="error in validationErrors" :key="error">
        <Icon name="alert-triangle" />
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { 
  DiagramCoordinates, 
  ImageDimensions,
  DiagramType 
} from '~/shared/types/diagram-detection'

// Props
interface Props {
  diagram: DiagramCoordinates
  pageImage: string
  pageWidth: number
  pageHeight: number
  showCoordinates?: boolean
  enableZoom?: boolean
  enableManualInput?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCoordinates: true,
  enableZoom: true,
  enableManualInput: true
})

// Emits
const emit = defineEmits<{
  save: [coordinates: DiagramCoordinates]
  cancel: []
  change: [coordinates: DiagramCoordinates]
  validate: [isValid: boolean, errors: string[]]
}>()

// Reactive state
const canvasContainer = ref<HTMLDivElement>()
const editorCanvas = ref<HTMLCanvasElement>()
const ctx = ref<CanvasRenderingContext2D | null>(null)
const pageImageElement = ref<HTMLImageElement>()

// Coordinate state
const currentCoordinates = ref<DiagramCoordinates>({ ...props.diagram })
const originalCoordinates = ref<DiagramCoordinates>({ ...props.diagram })
const manualCoordinates = ref<DiagramCoordinates>({ ...props.diagram })
const currentDiagram = ref<DiagramCoordinates>({ ...props.diagram })

// Interaction state
const isDragging = ref(false)
const dragHandle = ref<'tl' | 'tr' | 'bl' | 'br' | 'move' | null>(null)
const dragStartPos = ref({ x: 0, y: 0 })
const dragStartCoords = ref<DiagramCoordinates>({ ...props.diagram })

// Zoom and pan state
const zoomLevel = ref(1)
const panOffset = ref({ x: 0, y: 0 })
const minZoom = 0.25
const maxZoom = 4

// Validation state
const validationErrors = ref<string[]>([])
const isValidCoordinates = ref(true)

// Computed properties
const imageWidth = computed(() => props.pageWidth)
const imageHeight = computed(() => props.pageHeight)

const currentCursor = computed(() => {
  if (isDragging.value) return 'grabbing'
  
  switch (dragHandle.value) {
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
})

const canvasWidth = computed(() => imageWidth.value * zoomLevel.value)
const canvasHeight = computed(() => imageHeight.value * zoomLevel.value)

// Canvas setup and image loading
onMounted(async () => {
  await setupCanvas()
  await loadPageImage()
  drawCanvas()
  
  // Watch for coordinate changes
  watch(currentCoordinates, (newCoords) => {
    manualCoordinates.value = { ...newCoords }
    validateCoordinates()
    drawCanvas()
    emit('change', newCoords)
  }, { deep: true })
})

onUnmounted(() => {
  cleanup()
})

// Canvas setup
async function setupCanvas() {
  if (!editorCanvas.value) return
  
  ctx.value = editorCanvas.value.getContext('2d')
  if (!ctx.value) return
  
  // Set canvas size
  editorCanvas.value.width = canvasWidth.value
  editorCanvas.value.height = canvasHeight.value
  
  // Configure context
  ctx.value.imageSmoothingEnabled = true
  ctx.value.imageSmoothingQuality = 'high'
}

// Load page image
async function loadPageImage() {
  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      pageImageElement.value = img
      resolve()
    }
    img.onerror = reject
    img.src = props.pageImage
  })
}

// Drawing functions
function drawCanvas() {
  if (!ctx.value || !pageImageElement.value) return
  
  const canvas = editorCanvas.value!
  ctx.value.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw page image
  ctx.value.drawImage(
    pageImageElement.value,
    panOffset.value.x,
    panOffset.value.y,
    imageWidth.value * zoomLevel.value,
    imageHeight.value * zoomLevel.value
  )
  
  // Draw coordinate overlay
  drawCoordinateOverlay()
  
  // Draw handles
  drawResizeHandles()
}

function drawCoordinateOverlay() {
  if (!ctx.value) return
  
  const coords = currentCoordinates.value
  const x1 = (coords.x1 * zoomLevel.value) + panOffset.value.x
  const y1 = (coords.y1 * zoomLevel.value) + panOffset.value.y
  const x2 = (coords.x2 * zoomLevel.value) + panOffset.value.x
  const y2 = (coords.y2 * zoomLevel.value) + panOffset.value.y
  
  // Draw selection rectangle
  ctx.value.strokeStyle = '#007bff'
  ctx.value.lineWidth = 2
  ctx.value.setLineDash([5, 5])
  ctx.value.strokeRect(x1, y1, x2 - x1, y2 - y1)
  
  // Draw semi-transparent overlay
  ctx.value.fillStyle = 'rgba(0, 123, 255, 0.1)'
  ctx.value.fillRect(x1, y1, x2 - x1, y2 - y1)
  
  // Reset line dash
  ctx.value.setLineDash([])
}

function drawResizeHandles() {
  if (!ctx.value) return
  
  const coords = currentCoordinates.value
  const handleSize = 8
  const x1 = (coords.x1 * zoomLevel.value) + panOffset.value.x
  const y1 = (coords.y1 * zoomLevel.value) + panOffset.value.y
  const x2 = (coords.x2 * zoomLevel.value) + panOffset.value.x
  const y2 = (coords.y2 * zoomLevel.value) + panOffset.value.y
  
  const handles = [
    { x: x1, y: y1, type: 'tl' }, // Top-left
    { x: x2, y: y1, type: 'tr' }, // Top-right
    { x: x1, y: y2, type: 'bl' }, // Bottom-left
    { x: x2, y: y2, type: 'br' }  // Bottom-right
  ]
  
  // Draw handles
  ctx.value.fillStyle = '#007bff'
  ctx.value.strokeStyle = '#ffffff'
  ctx.value.lineWidth = 1
  
  handles.forEach(handle => {
    ctx.value!.fillRect(
      handle.x - handleSize / 2,
      handle.y - handleSize / 2,
      handleSize,
      handleSize
    )
    ctx.value!.strokeRect(
      handle.x - handleSize / 2,
      handle.y - handleSize / 2,
      handleSize,
      handleSize
    )
  })
}

// Mouse event handlers
function handleMouseDown(event: MouseEvent) {
  if (!editorCanvas.value) return
  
  const rect = editorCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Check if clicking on a handle
  const handle = getHandleAtPosition(x, y)
  
  if (handle) {
    isDragging.value = true
    dragHandle.value = handle
    dragStartPos.value = { x, y }
    dragStartCoords.value = { ...currentCoordinates.value }
  } else if (isInsideSelection(x, y)) {
    // Start moving the entire selection
    isDragging.value = true
    dragHandle.value = 'move'
    dragStartPos.value = { x, y }
    dragStartCoords.value = { ...currentCoordinates.value }
  }
}

function handleMouseMove(event: MouseEvent) {
  if (!editorCanvas.value) return
  
  const rect = editorCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  if (isDragging.value && dragHandle.value) {
    const deltaX = (x - dragStartPos.value.x) / zoomLevel.value
    const deltaY = (y - dragStartPos.value.y) / zoomLevel.value
    
    updateCoordinatesFromDrag(deltaX, deltaY)
  } else {
    // Update cursor based on hover position
    const handle = getHandleAtPosition(x, y)
    dragHandle.value = handle || (isInsideSelection(x, y) ? 'move' : null)
  }
}

function handleMouseUp() {
  isDragging.value = false
  dragHandle.value = null
}

function handleMouseLeave() {
  isDragging.value = false
  dragHandle.value = null
}

function handleWheel(event: WheelEvent) {
  if (!props.enableZoom) return
  
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel.value + delta))
  
  if (newZoom !== zoomLevel.value) {
    zoomLevel.value = newZoom
    updateCanvasSize()
    drawCanvas()
  }
}

// Helper functions
function getHandleAtPosition(x: number, y: number): 'tl' | 'tr' | 'bl' | 'br' | null {
  const coords = currentCoordinates.value
  const handleSize = 8
  const x1 = (coords.x1 * zoomLevel.value) + panOffset.value.x
  const y1 = (coords.y1 * zoomLevel.value) + panOffset.value.y
  const x2 = (coords.x2 * zoomLevel.value) + panOffset.value.x
  const y2 = (coords.y2 * zoomLevel.value) + panOffset.value.y
  
  const handles = [
    { x: x1, y: y1, type: 'tl' as const },
    { x: x2, y: y1, type: 'tr' as const },
    { x: x1, y: y2, type: 'bl' as const },
    { x: x2, y: y2, type: 'br' as const }
  ]
  
  for (const handle of handles) {
    if (
      x >= handle.x - handleSize / 2 &&
      x <= handle.x + handleSize / 2 &&
      y >= handle.y - handleSize / 2 &&
      y <= handle.y + handleSize / 2
    ) {
      return handle.type
    }
  }
  
  return null
}

function isInsideSelection(x: number, y: number): boolean {
  const coords = currentCoordinates.value
  const x1 = (coords.x1 * zoomLevel.value) + panOffset.value.x
  const y1 = (coords.y1 * zoomLevel.value) + panOffset.value.y
  const x2 = (coords.x2 * zoomLevel.value) + panOffset.value.x
  const y2 = (coords.y2 * zoomLevel.value) + panOffset.value.y
  
  return x >= x1 && x <= x2 && y >= y1 && y <= y2
}

function updateCoordinatesFromDrag(deltaX: number, deltaY: number) {
  const startCoords = dragStartCoords.value
  let newCoords = { ...currentCoordinates.value }
  
  switch (dragHandle.value) {
    case 'tl':
      newCoords.x1 = Math.max(0, Math.min(startCoords.x2 - 10, startCoords.x1 + deltaX))
      newCoords.y1 = Math.max(0, Math.min(startCoords.y2 - 10, startCoords.y1 + deltaY))
      break
    case 'tr':
      newCoords.x2 = Math.min(imageWidth.value, Math.max(startCoords.x1 + 10, startCoords.x2 + deltaX))
      newCoords.y1 = Math.max(0, Math.min(startCoords.y2 - 10, startCoords.y1 + deltaY))
      break
    case 'bl':
      newCoords.x1 = Math.max(0, Math.min(startCoords.x2 - 10, startCoords.x1 + deltaX))
      newCoords.y2 = Math.min(imageHeight.value, Math.max(startCoords.y1 + 10, startCoords.y2 + deltaY))
      break
    case 'br':
      newCoords.x2 = Math.min(imageWidth.value, Math.max(startCoords.x1 + 10, startCoords.x2 + deltaX))
      newCoords.y2 = Math.min(imageHeight.value, Math.max(startCoords.y1 + 10, startCoords.y2 + deltaY))
      break
    case 'move':
      const width = startCoords.x2 - startCoords.x1
      const height = startCoords.y2 - startCoords.y1
      
      newCoords.x1 = Math.max(0, Math.min(imageWidth.value - width, startCoords.x1 + deltaX))
      newCoords.y1 = Math.max(0, Math.min(imageHeight.value - height, startCoords.y1 + deltaY))
      newCoords.x2 = newCoords.x1 + width
      newCoords.y2 = newCoords.y1 + height
      break
  }
  
  currentCoordinates.value = newCoords
}

// Manual input handlers
function updateFromManualInput() {
  const coords = manualCoordinates.value
  
  // Validate and constrain values
  coords.x1 = Math.max(0, Math.min(imageWidth.value, coords.x1))
  coords.y1 = Math.max(0, Math.min(imageHeight.value, coords.y1))
  coords.x2 = Math.max(coords.x1 + 10, Math.min(imageWidth.value, coords.x2))
  coords.y2 = Math.max(coords.y1 + 10, Math.min(imageHeight.value, coords.y2))
  
  currentCoordinates.value = { ...coords }
}

function updateDiagramType() {
  currentDiagram.value.type = currentDiagram.value.type
  emit('change', currentCoordinates.value)
}

function updateDescription() {
  currentDiagram.value.description = currentDiagram.value.description
  emit('change', currentCoordinates.value)
}

// Zoom controls
function zoomIn() {
  if (zoomLevel.value < maxZoom) {
    zoomLevel.value = Math.min(maxZoom, zoomLevel.value + 0.25)
    updateCanvasSize()
    drawCanvas()
  }
}

function zoomOut() {
  if (zoomLevel.value > minZoom) {
    zoomLevel.value = Math.max(minZoom, zoomLevel.value - 0.25)
    updateCanvasSize()
    drawCanvas()
  }
}

function resetZoom() {
  zoomLevel.value = 1
  panOffset.value = { x: 0, y: 0 }
  updateCanvasSize()
  drawCanvas()
}

function updateCanvasSize() {
  if (!editorCanvas.value) return
  
  editorCanvas.value.width = canvasWidth.value
  editorCanvas.value.height = canvasHeight.value
  
  // Re-setup context after size change
  if (ctx.value) {
    ctx.value.imageSmoothingEnabled = true
    ctx.value.imageSmoothingQuality = 'high'
  }
}

// Validation
function validateCoordinates() {
  const coords = currentCoordinates.value
  const errors: string[] = []
  
  // Check bounds
  if (coords.x1 < 0 || coords.x1 >= imageWidth.value) {
    errors.push('X1 coordinate is out of bounds')
  }
  if (coords.y1 < 0 || coords.y1 >= imageHeight.value) {
    errors.push('Y1 coordinate is out of bounds')
  }
  if (coords.x2 <= coords.x1 || coords.x2 > imageWidth.value) {
    errors.push('X2 coordinate must be greater than X1 and within bounds')
  }
  if (coords.y2 <= coords.y1 || coords.y2 > imageHeight.value) {
    errors.push('Y2 coordinate must be greater than Y1 and within bounds')
  }
  
  // Check minimum size
  const minSize = 10
  if (coords.x2 - coords.x1 < minSize) {
    errors.push(`Diagram width must be at least ${minSize} pixels`)
  }
  if (coords.y2 - coords.y1 < minSize) {
    errors.push(`Diagram height must be at least ${minSize} pixels`)
  }
  
  validationErrors.value = errors
  isValidCoordinates.value = errors.length === 0
  
  emit('validate', isValidCoordinates.value, errors)
}

// Action handlers
function resetCoordinates() {
  currentCoordinates.value = { ...originalCoordinates.value }
  manualCoordinates.value = { ...originalCoordinates.value }
  currentDiagram.value = { ...originalCoordinates.value }
}

function validateAndPreview() {
  validateCoordinates()
  if (isValidCoordinates.value) {
    // Could emit a preview event or show a preview modal
    console.log('Preview coordinates:', currentCoordinates.value)
  }
}

function cancelEdit() {
  emit('cancel')
}

function saveCoordinates() {
  validateCoordinates()
  
  if (isValidCoordinates.value) {
    const finalCoordinates: DiagramCoordinates = {
      ...currentCoordinates.value,
      type: currentDiagram.value.type,
      description: currentDiagram.value.description,
      confidence: currentDiagram.value.confidence
    }
    
    emit('save', finalCoordinates)
  }
}

function cleanup() {
  // Clean up any resources if needed
}
</script>

<style scoped>
.interactive-coordinate-editor {
  @apply flex flex-col bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto;
}

.editor-header {
  @apply flex justify-between items-center mb-4 pb-4 border-b;
}

.editor-title {
  @apply text-xl font-semibold text-gray-800;
}

.editor-info {
  @apply flex gap-4 text-sm;
}

.diagram-type {
  @apply px-2 py-1 bg-blue-100 text-blue-800 rounded;
}

.confidence-score {
  @apply px-2 py-1 bg-green-100 text-green-800 rounded;
}

.canvas-container {
  @apply relative border border-gray-300 rounded-lg overflow-hidden mb-4;
  min-height: 400px;
}

.coordinate-canvas {
  @apply block max-w-full max-h-full;
}

.coordinate-display {
  @apply absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs;
}

.coord-info {
  @apply flex gap-2 mb-1;
}

.dimensions {
  @apply flex gap-2;
}

.zoom-controls {
  @apply absolute top-4 right-4 flex items-center gap-2 bg-white rounded shadow-md p-2;
}

.zoom-btn {
  @apply w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed;
}

.zoom-level {
  @apply text-sm font-medium px-2;
}

.editor-controls {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6;
}

.coordinate-inputs {
  @apply grid grid-cols-2 gap-4;
}

.input-group {
  @apply flex flex-col;
}

.input-group label {
  @apply text-sm font-medium text-gray-700 mb-1;
}

.input-group input,
.input-group select {
  @apply px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.diagram-metadata {
  @apply space-y-4;
}

.editor-actions {
  @apply flex justify-end gap-3 pt-4 border-t;
}

.btn {
  @apply px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
}

.btn-info {
  @apply bg-cyan-600 text-white hover:bg-cyan-700;
}

.validation-messages {
  @apply mt-4 space-y-2;
}

.error-message {
  @apply flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded;
}
</style>