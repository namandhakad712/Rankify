<template>
  <div class="canvas-coordinate-editor">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <div class="toolbar-section">
        <button 
          class="tool-btn"
          :class="{ active: currentTool === 'select' }"
          @click="setTool('select')"
          title="Select and move diagrams"
        >
          ↖
        </button>
        <button 
          class="tool-btn"
          :class="{ active: currentTool === 'draw' }"
          @click="setTool('draw')"
          title="Draw new diagram area"
        >
          ⬛
        </button>
        <button 
          class="tool-btn"
          :class="{ active: currentTool === 'pan' }"
          @click="setTool('pan')"
          title="Pan and zoom"
        >
          ✋
        </button>
      </div>

      <div class="toolbar-section">
        <button 
          class="tool-btn"
          @click="zoomIn"
          :disabled="zoomLevel >= maxZoom"
          title="Zoom in"
        >
          🔍+
        </button>
        <span class="zoom-display">{{ Math.round(zoomLevel * 100) }}%</span>
        <button 
          class="tool-btn"
          @click="zoomOut"
          :disabled="zoomLevel <= minZoom"
          title="Zoom out"
        >
          🔍-
        </button>
        <button 
          class="tool-btn"
          @click="resetZoom"
          title="Reset zoom"
        >
          🎯
        </button>
      </div>

      <div class="toolbar-section">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="showGrid"
            @change="redrawCanvas"
          />
          Grid
        </label>
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="snapToGrid"
          />
          Snap
        </label>
        <select v-model="gridSize" @change="redrawCanvas" class="grid-size-select">
          <option value="5">5px</option>
          <option value="10">10px</option>
          <option value="20">20px</option>
          <option value="50">50px</option>
        </select>
      </div>

      <div class="toolbar-section">
        <button 
          class="tool-btn"
          @click="undo"
          :disabled="!canUndo"
          title="Undo"
        >
          ↶
        </button>
        <button 
          class="tool-btn"
          @click="redo"
          :disabled="!canRedo"
          title="Redo"
        >
          ↷
        </button>
      </div>
    </div>

    <!-- Canvas Container -->
    <div class="canvas-container" ref="canvasContainer">
      <canvas
        ref="mainCanvas"
        class="main-canvas"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @wheel="handleWheel"
        @contextmenu.prevent
      />
      
      <!-- Overlay for UI elements -->
      <div class="canvas-overlay">
        <!-- Selection info -->
        <div 
          v-if="selectedDiagram"
          class="selection-info"
          :style="getSelectionInfoStyle()"
        >
          <div class="info-content">
            <div class="info-row">
              <span>{{ selectedDiagram.type }}</span>
              <span class="confidence">{{ Math.round(selectedDiagram.confidence * 100) }}%</span>
            </div>
            <div class="info-row">
              <span>{{ Math.round(selectedDiagram.x2 - selectedDiagram.x1) }}×{{ Math.round(selectedDiagram.y2 - selectedDiagram.y1) }}</span>
            </div>
          </div>
        </div>

        <!-- Drawing preview -->
        <div 
          v-if="isDrawing && drawingRect"
          class="drawing-preview"
          :style="getDrawingPreviewStyle()"
        />
      </div>
    </div>

    <!-- Properties Panel -->
    <div class="properties-panel" v-if="selectedDiagram">
      <h4>Diagram Properties</h4>
      
      <div class="property-group">
        <label>Type</label>
        <select v-model="selectedDiagram.type" @change="updateDiagram">
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

      <div class="property-group">
        <label>Description</label>
        <textarea 
          v-model="selectedDiagram.description"
          @input="updateDiagram"
          rows="3"
          placeholder="Describe this diagram..."
        />
      </div>

      <div class="property-group">
        <label>Confidence</label>
        <input 
          type="range"
          v-model.number="selectedDiagram.confidence"
          @input="updateDiagram"
          min="0"
          max="1"
          step="0.01"
        />
        <span class="confidence-value">{{ Math.round(selectedDiagram.confidence * 100) }}%</span>
      </div>

      <div class="property-group">
        <label>Coordinates</label>
        <div class="coordinate-inputs">
          <div class="input-row">
            <label>X1:</label>
            <input 
              type="number"
              v-model.number="selectedDiagram.x1"
              @input="updateDiagram"
              :min="0"
              :max="imageWidth"
            />
            <label>Y1:</label>
            <input 
              type="number"
              v-model.number="selectedDiagram.y1"
              @input="updateDiagram"
              :min="0"
              :max="imageHeight"
            />
          </div>
          <div class="input-row">
            <label>X2:</label>
            <input 
              type="number"
              v-model.number="selectedDiagram.x2"
              @input="updateDiagram"
              :min="selectedDiagram.x1 + 10"
              :max="imageWidth"
            />
            <label>Y2:</label>
            <input 
              type="number"
              v-model.number="selectedDiagram.y2"
              @input="updateDiagram"
              :min="selectedDiagram.y1 + 10"
              :max="imageHeight"
            />
          </div>
        </div>
      </div>

      <div class="property-actions">
        <button class="btn btn-danger" @click="deleteDiagram">
          Delete
        </button>
        <button class="btn btn-secondary" @click="duplicateDiagram">
          Duplicate
        </button>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <span>{{ diagrams.length }} diagram(s)</span>
      <span v-if="mousePosition">
        {{ Math.round(mousePosition.x) }}, {{ Math.round(mousePosition.y) }}
      </span>
      <span v-if="selectedDiagram">
        Selected: {{ selectedDiagram.type }}
      </span>
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
import { 
  CoordinateEditingManager,
  createCoordinateEditingManager,
  type DragType,
  type HandleInfo
} from '~/app/utils/coordinateEditingUtils'

// Props
interface Props {
  diagrams: DiagramCoordinates[]
  pageImage: string | Blob
  imageDimensions: ImageDimensions
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

// Emits
const emit = defineEmits<{
  update: [diagrams: DiagramCoordinates[]]
  select: [diagram: DiagramCoordinates | null]
  add: [diagram: DiagramCoordinates]
  delete: [diagram: DiagramCoordinates]
  change: [diagram: DiagramCoordinates]
}>()

// Refs
const canvasContainer = ref<HTMLDivElement>()
const mainCanvas = ref<HTMLCanvasElement>()

// State
const currentTool = ref<'select' | 'draw' | 'pan'>('select')
const zoomLevel = ref(1)
const panOffset = ref({ x: 0, y: 0 })
const showGrid = ref(true)
const snapToGrid = ref(false)
const gridSize = ref(10)

const selectedDiagram = ref<DiagramCoordinates | null>(null)
const hoveredDiagram = ref<DiagramCoordinates | null>(null)

const isDrawing = ref(false)
const drawingStart = ref<{ x: number; y: number } | null>(null)
const drawingRect = ref<{ x: number; y: number; width: number; height: number } | null>(null)

const mousePosition = ref<{ x: number; y: number } | null>(null)
const isDragging = ref(false)
const dragStart = ref<{ x: number; y: number } | null>(null)

// History for undo/redo
const history = ref<DiagramCoordinates[][]>([])
const historyIndex = ref(-1)

// Constants
const minZoom = 0.1
const maxZoom = 5
const handleSize = 8

// Editing manager
let editingManager: CoordinateEditingManager

// Computed
const imageWidth = computed(() => props.imageDimensions.width)
const imageHeight = computed(() => props.imageDimensions.height)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// Methods
const setTool = (tool: 'select' | 'draw' | 'pan') => {
  currentTool.value = tool
  selectedDiagram.value = null
  
  if (mainCanvas.value) {
    const cursor = tool === 'draw' ? 'crosshair' : tool === 'pan' ? 'grab' : 'default'
    mainCanvas.value.style.cursor = cursor
  }
}

const zoomIn = () => {
  zoomLevel.value = Math.min(maxZoom, zoomLevel.value * 1.2)
  redrawCanvas()
}

const zoomOut = () => {
  zoomLevel.value = Math.max(minZoom, zoomLevel.value / 1.2)
  redrawCanvas()
}

const resetZoom = () => {
  zoomLevel.value = 1
  panOffset.value = { x: 0, y: 0 }
  redrawCanvas()
}

const handleMouseDown = (event: MouseEvent) => {
  if (props.readonly) return

  const rect = mainCanvas.value!.getBoundingClientRect()
  const canvasX = event.clientX - rect.left
  const canvasY = event.clientY - rect.top
  
  // Convert to image coordinates
  const imageX = (canvasX - panOffset.value.x) / zoomLevel.value
  const imageY = (canvasY - panOffset.value.y) / zoomLevel.value

  mousePosition.value = { x: imageX, y: imageY }

  if (currentTool.value === 'draw') {
    startDrawing(imageX, imageY)
  } else if (currentTool.value === 'select') {
    handleSelectMouseDown(imageX, imageY, event)
  } else if (currentTool.value === 'pan') {
    startPanning(canvasX, canvasY)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const rect = mainCanvas.value!.getBoundingClientRect()
  const canvasX = event.clientX - rect.left
  const canvasY = event.clientY - rect.top
  
  const imageX = (canvasX - panOffset.value.x) / zoomLevel.value
  const imageY = (canvasY - panOffset.value.y) / zoomLevel.value

  mousePosition.value = { x: imageX, y: imageY }

  if (isDrawing.value && drawingStart.value) {
    updateDrawing(imageX, imageY)
  } else if (isDragging.value && currentTool.value === 'pan') {
    updatePanning(canvasX, canvasY)
  } else if (editingManager.isDragging()) {
    updateDragOperation(imageX, imageY)
  } else if (currentTool.value === 'select') {
    updateHover(imageX, imageY)
  }
}

const handleMouseUp = (event: MouseEvent) => {
  if (isDrawing.value) {
    finishDrawing()
  } else if (isDragging.value) {
    finishPanning()
  } else if (editingManager.isDragging()) {
    finishDragOperation()
  }
}

const handleMouseLeave = () => {
  mousePosition.value = null
  hoveredDiagram.value = null
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel.value * delta))
  
  if (newZoom !== zoomLevel.value) {
    // Zoom towards mouse position
    const rect = mainCanvas.value!.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    const zoomRatio = newZoom / zoomLevel.value
    
    panOffset.value.x = mouseX - (mouseX - panOffset.value.x) * zoomRatio
    panOffset.value.y = mouseY - (mouseY - panOffset.value.y) * zoomRatio
    
    zoomLevel.value = newZoom
    redrawCanvas()
  }
}

const startDrawing = (x: number, y: number) => {
  isDrawing.value = true
  drawingStart.value = { x, y }
  drawingRect.value = { x, y, width: 0, height: 0 }
}

const updateDrawing = (x: number, y: number) => {
  if (!drawingStart.value) return
  
  const startX = Math.min(drawingStart.value.x, x)
  const startY = Math.min(drawingStart.value.y, y)
  const endX = Math.max(drawingStart.value.x, x)
  const endY = Math.max(drawingStart.value.y, y)
  
  drawingRect.value = {
    x: startX,
    y: startY,
    width: endX - startX,
    height: endY - startY
  }
}

const finishDrawing = () => {
  if (!drawingRect.value || drawingRect.value.width < 10 || drawingRect.value.height < 10) {
    isDrawing.value = false
    drawingStart.value = null
    drawingRect.value = null
    return
  }
  
  const newDiagram: DiagramCoordinates = {
    x1: drawingRect.value.x,
    y1: drawingRect.value.y,
    x2: drawingRect.value.x + drawingRect.value.width,
    y2: drawingRect.value.y + drawingRect.value.height,
    confidence: 0.8,
    type: 'other',
    description: 'New diagram'
  }
  
  addToHistory()
  emit('add', newDiagram)
  selectedDiagram.value = newDiagram
  
  isDrawing.value = false
  drawingStart.value = null
  drawingRect.value = null
  
  redrawCanvas()
}

const handleSelectMouseDown = (x: number, y: number, event: MouseEvent) => {
  // Check if clicking on a handle
  if (selectedDiagram.value) {
    const handle = editingManager.getHandleAtPosition({ x, y }, selectedDiagram.value, 10)
    if (handle) {
      editingManager.startDrag(handle.type, { x, y }, selectedDiagram.value)
      return
    }
  }
  
  // Check if clicking on a diagram
  const clickedDiagram = getDiagramAtPosition(x, y)
  if (clickedDiagram) {
    selectedDiagram.value = clickedDiagram
    emit('select', clickedDiagram)
    
    // Start move operation if not clicking on handle
    editingManager.startDrag('move', { x, y }, clickedDiagram)
  } else {
    selectedDiagram.value = null
    emit('select', null)
  }
  
  redrawCanvas()
}

const updateDragOperation = (x: number, y: number) => {
  const updatedCoordinates = editingManager.updateDrag({ x, y })
  if (updatedCoordinates && selectedDiagram.value) {
    Object.assign(selectedDiagram.value, updatedCoordinates)
    emit('change', selectedDiagram.value)
    redrawCanvas()
  }
}

const finishDragOperation = () => {
  const finalCoordinates = editingManager.endDrag()
  if (finalCoordinates && selectedDiagram.value) {
    Object.assign(selectedDiagram.value, finalCoordinates)
    addToHistory()
    emit('change', selectedDiagram.value)
    redrawCanvas()
  }
}

const startPanning = (x: number, y: number) => {
  isDragging.value = true
  dragStart.value = { x, y }
  
  if (mainCanvas.value) {
    mainCanvas.value.style.cursor = 'grabbing'
  }
}

const updatePanning = (x: number, y: number) => {
  if (!dragStart.value) return
  
  const deltaX = x - dragStart.value.x
  const deltaY = y - dragStart.value.y
  
  panOffset.value.x += deltaX
  panOffset.value.y += deltaY
  
  dragStart.value = { x, y }
  redrawCanvas()
}

const finishPanning = () => {
  isDragging.value = false
  dragStart.value = null
  
  if (mainCanvas.value) {
    mainCanvas.value.style.cursor = 'grab'
  }
}

const updateHover = (x: number, y: number) => {
  const diagram = getDiagramAtPosition(x, y)
  if (diagram !== hoveredDiagram.value) {
    hoveredDiagram.value = diagram
    redrawCanvas()
  }
}

const getDiagramAtPosition = (x: number, y: number): DiagramCoordinates | null => {
  // Check in reverse order (top to bottom)
  for (let i = props.diagrams.length - 1; i >= 0; i--) {
    const diagram = props.diagrams[i]
    if (x >= diagram.x1 && x <= diagram.x2 && y >= diagram.y1 && y <= diagram.y2) {
      return diagram
    }
  }
  return null
}

const updateDiagram = () => {
  if (selectedDiagram.value) {
    emit('change', selectedDiagram.value)
    redrawCanvas()
  }
}

const deleteDiagram = () => {
  if (selectedDiagram.value) {
    addToHistory()
    emit('delete', selectedDiagram.value)
    selectedDiagram.value = null
    redrawCanvas()
  }
}

const duplicateDiagram = () => {
  if (selectedDiagram.value) {
    const duplicate: DiagramCoordinates = {
      ...selectedDiagram.value,
      x1: selectedDiagram.value.x1 + 20,
      y1: selectedDiagram.value.y1 + 20,
      x2: selectedDiagram.value.x2 + 20,
      y2: selectedDiagram.value.y2 + 20,
      description: selectedDiagram.value.description + ' (copy)'
    }
    
    addToHistory()
    emit('add', duplicate)
    selectedDiagram.value = duplicate
    redrawCanvas()
  }
}

const addToHistory = () => {
  // Remove any future history if we're not at the end
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  
  // Add current state to history
  history.value.push([...props.diagrams])
  historyIndex.value = history.value.length - 1
  
  // Limit history size
  if (history.value.length > 50) {
    history.value.shift()
    historyIndex.value--
  }
}

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--
    const previousState = history.value[historyIndex.value]
    emit('update', [...previousState])
    redrawCanvas()
  }
}

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++
    const nextState = history.value[historyIndex.value]
    emit('update', [...nextState])
    redrawCanvas()
  }
}

const redrawCanvas = async () => {
  await nextTick()
  
  if (!mainCanvas.value) return
  
  const canvas = mainCanvas.value
  const ctx = canvas.getContext('2d')!
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Save context
  ctx.save()
  
  // Apply transform
  ctx.translate(panOffset.value.x, panOffset.value.y)
  ctx.scale(zoomLevel.value, zoomLevel.value)
  
  // Draw background image
  await drawBackgroundImage(ctx)
  
  // Draw grid
  if (showGrid.value) {
    drawGrid(ctx)
  }
  
  // Draw diagrams
  drawDiagrams(ctx)
  
  // Restore context
  ctx.restore()
}

const drawBackgroundImage = async (ctx: CanvasRenderingContext2D) => {
  try {
    let imageUrl: string
    
    if (typeof props.pageImage === 'string') {
      imageUrl = props.pageImage
    } else {
      imageUrl = URL.createObjectURL(props.pageImage)
    }
    
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = imageUrl
    })
    
    ctx.drawImage(img, 0, 0, imageWidth.value, imageHeight.value)
    
    if (typeof props.pageImage !== 'string') {
      URL.revokeObjectURL(imageUrl)
    }
  } catch (error) {
    console.error('Failed to draw background image:', error)
  }
}

const drawGrid = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.lineWidth = 1 / zoomLevel.value
  
  const step = gridSize.value
  
  // Vertical lines
  for (let x = 0; x <= imageWidth.value; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, imageHeight.value)
    ctx.stroke()
  }
  
  // Horizontal lines
  for (let y = 0; y <= imageHeight.value; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(imageWidth.value, y)
    ctx.stroke()
  }
}

const drawDiagrams = (ctx: CanvasRenderingContext2D) => {
  for (const diagram of props.diagrams) {
    const isSelected = diagram === selectedDiagram.value
    const isHovered = diagram === hoveredDiagram.value
    
    // Draw diagram rectangle
    ctx.strokeStyle = isSelected ? '#2563eb' : isHovered ? '#3b82f6' : '#6b7280'
    ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 0.1)' : 'rgba(107, 114, 128, 0.05)'
    ctx.lineWidth = (isSelected ? 2 : 1) / zoomLevel.value
    
    ctx.fillRect(diagram.x1, diagram.y1, diagram.x2 - diagram.x1, diagram.y2 - diagram.y1)
    ctx.strokeRect(diagram.x1, diagram.y1, diagram.x2 - diagram.x1, diagram.y2 - diagram.y1)
    
    // Draw handles for selected diagram
    if (isSelected) {
      drawHandles(ctx, diagram)
    }
    
    // Draw label
    if (zoomLevel.value > 0.5) {
      drawDiagramLabel(ctx, diagram)
    }
  }
}

const drawHandles = (ctx: CanvasRenderingContext2D, diagram: DiagramCoordinates) => {
  const handles = editingManager.getHandles(diagram)
  
  ctx.fillStyle = '#2563eb'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1 / zoomLevel.value
  
  for (const handle of handles) {
    if (handle.type === 'move') {
      // Draw move handle as circle
      const centerX = (diagram.x1 + diagram.x2) / 2
      const centerY = (diagram.y1 + diagram.y2) / 2
      const radius = 6 / zoomLevel.value
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    } else {
      // Draw resize handles as squares
      const size = handleSize / zoomLevel.value
      let x, y
      
      switch (handle.type) {
        case 'top-left':
          x = diagram.x1 - size/2
          y = diagram.y1 - size/2
          break
        case 'top-right':
          x = diagram.x2 - size/2
          y = diagram.y1 - size/2
          break
        case 'bottom-left':
          x = diagram.x1 - size/2
          y = diagram.y2 - size/2
          break
        case 'bottom-right':
          x = diagram.x2 - size/2
          y = diagram.y2 - size/2
          break
        case 'top':
          x = (diagram.x1 + diagram.x2) / 2 - size/2
          y = diagram.y1 - size/2
          break
        case 'right':
          x = diagram.x2 - size/2
          y = (diagram.y1 + diagram.y2) / 2 - size/2
          break
        case 'bottom':
          x = (diagram.x1 + diagram.x2) / 2 - size/2
          y = diagram.y2 - size/2
          break
        case 'left':
          x = diagram.x1 - size/2
          y = (diagram.y1 + diagram.y2) / 2 - size/2
          break
        default:
          continue
      }
      
      ctx.fillRect(x, y, size, size)
      ctx.strokeRect(x, y, size, size)
    }
  }
}

const drawDiagramLabel = (ctx: CanvasRenderingContext2D, diagram: DiagramCoordinates) => {
  const fontSize = Math.max(10, 12 / zoomLevel.value)
  ctx.font = `${fontSize}px Arial`
  ctx.fillStyle = '#374151'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  
  const label = `${diagram.type} (${Math.round(diagram.confidence * 100)}%)`
  const padding = 4 / zoomLevel.value
  
  ctx.fillText(label, diagram.x1 + padding, diagram.y1 + padding)
}

const getSelectionInfoStyle = () => {
  if (!selectedDiagram.value) return {}
  
  const x = selectedDiagram.value.x1 * zoomLevel.value + panOffset.value.x
  const y = selectedDiagram.value.y1 * zoomLevel.value + panOffset.value.y - 60
  
  return {
    left: `${x}px`,
    top: `${Math.max(10, y)}px`
  }
}

const getDrawingPreviewStyle = () => {
  if (!drawingRect.value) return {}
  
  const x = drawingRect.value.x * zoomLevel.value + panOffset.value.x
  const y = drawingRect.value.y * zoomLevel.value + panOffset.value.y
  const width = drawingRect.value.width * zoomLevel.value
  const height = drawingRect.value.height * zoomLevel.value
  
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`
  }
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  
  if (mainCanvas.value && canvasContainer.value) {
    const container = canvasContainer.value
    mainCanvas.value.width = container.clientWidth
    mainCanvas.value.height = container.clientHeight
    
    // Initialize editing manager
    editingManager = createCoordinateEditingManager(props.imageDimensions, {
      snapToGrid: snapToGrid.value,
      gridSize: gridSize.value
    })
    
    // Initial draw
    await redrawCanvas()
    
    // Add initial state to history
    history.value.push([...props.diagrams])
    historyIndex.value = 0
  }
})

onUnmounted(() => {
  // Cleanup
})

// Watchers
watch(() => props.diagrams, () => {
  redrawCanvas()
}, { deep: true })

watch([snapToGrid, gridSize], () => {
  if (editingManager) {
    editingManager.updateConstraints({
      snapToGrid: snapToGrid.value,
      gridSize: gridSize.value
    })
  }
})
</script>

<style scoped>
.canvas-coordinate-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f9fafb;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.tool-btn.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-display {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  min-width: 50px;
  text-align: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.grid-size-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.main-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.selection-info {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 10;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.confidence {
  color: #10b981;
}

.drawing-preview {
  position: absolute;
  border: 2px dashed #2563eb;
  background: rgba(37, 99, 235, 0.1);
  pointer-events: none;
}

.properties-panel {
  width: 300px;
  background: white;
  border-left: 1px solid #e5e7eb;
  padding: 1rem;
  overflow-y: auto;
}

.properties-panel h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.property-group {
  margin-bottom: 1rem;
}

.property-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
}

.property-group select,
.property-group textarea,
.property-group input[type="range"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.property-group textarea {
  resize: vertical;
  min-height: 60px;
}

.confidence-value {
  font-size: 0.875rem;
  color: #6b7280;
  margin-left: 0.5rem;
}

.coordinate-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-row {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 0.5rem;
  align-items: center;
}

.input-row label {
  font-size: 0.75rem;
  margin: 0;
}

.input-row input {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
}

.property-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #6b7280;
}
</style>