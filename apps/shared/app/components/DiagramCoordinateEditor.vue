<template>
  <div class="diagram-coordinate-editor">
    <div class="mb-4">
      <h3 class="text-lg font-semibold mb-2">Adjust Diagram Boundaries</h3>
      <p class="text-sm text-muted-foreground">
        Drag the corners to resize or move the entire box to reposition the diagram area.
      </p>
    </div>
    
    <!-- PDF page with interactive overlay -->
    <div class="pdf-canvas-container relative border-2 border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
      <canvas ref="pdfCanvas" class="w-full h-auto"></canvas>
      
      <!-- Draggable bounding box overlay -->
      <div 
        v-if="canvasReady"
        class="bounding-box absolute border-4 border-blue-500 bg-blue-500/10 cursor-move"
        :style="boundingBoxStyle"
        @mousedown="startDrag"
      >
        <!-- Resize handles -->
        <div class="handle top-left" @mousedown.stop="startResize('tl')"></div>
        <div class="handle top-right" @mousedown.stop="startResize('tr')"></div>
        <div class="handle bottom-left" @mousedown.stop="startResize('bl')"></div>
        <div class="handle bottom-right" @mousedown.stop="startResize('br')"></div>
        
        <!-- Label -->
        <div class="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
          {{ localCoordinates.label || 'Diagram' }}
        </div>
      </div>
    </div>
    
    <!-- Coordinate inputs -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <div>
        <Label>X Position</Label>
        <Input 
          v-model.number="localCoordinates.boundingBox.x" 
          type="number" 
          step="0.01" 
          min="0" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
      <div>
        <Label>Y Position</Label>
        <Input 
          v-model.number="localCoordinates.boundingBox.y" 
          type="number" 
          step="0.01" 
          min="0" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
      <div>
        <Label>Width</Label>
        <Input 
          v-model.number="localCoordinates.boundingBox.width" 
          type="number" 
          step="0.01" 
          min="0.1" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
      <div>
        <Label>Height</Label>
        <Input 
          v-model.number="localCoordinates.boundingBox.height" 
          type="number" 
          step="0.01" 
          min="0.1" 
          max="1"
          @input="updateBoundingBox"
        />
      </div>
    </div>
    
    <!-- Preview -->
    <div class="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <h4 class="text-sm font-semibold mb-2">Preview</h4>
      <canvas ref="previewCanvas" class="w-full h-auto max-h-64 object-contain"></canvas>
    </div>
    
    <!-- Actions -->
    <div class="flex gap-2 mt-4">
      <Button variant="outline" @click="resetToOriginal">
        <Icon name="lucide:rotate-ccw" class="h-4 w-4 mr-2" />
        Reset to AI Detection
      </Button>
      <Button @click="saveCoordinates" variant="default">
        <Icon name="lucide:save" class="h-4 w-4 mr-2" />
        Save Coordinates
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { renderDiagramFromPDF, renderPDFPageToCanvas } from '#layers/shared/app/utils/diagramCoordinateUtils'
import type { DiagramCoordinates } from '#layers/shared/app/types/diagram'
import { Button } from '#layers/shared/app/components/ui/button'
import { Input } from '#layers/shared/app/components/ui/input'
import { Label } from '#layers/shared/app/components/ui/label'
import { Icon } from '#components'

const props = defineProps<{
  pdfBuffer: ArrayBuffer
  coordinates: DiagramCoordinates
}>()

const emit = defineEmits<{
  'update:coordinates': [coordinates: DiagramCoordinates]
}>()

const pdfCanvas = ref<HTMLCanvasElement>()
const previewCanvas = ref<HTMLCanvasElement>()
const localCoordinates = ref<DiagramCoordinates>({ ...props.coordinates })
const originalCoordinates = ref<DiagramCoordinates>({ ...props.coordinates })
const canvasReady = ref(false)

const isDragging = ref(false)
const isResizing = ref(false)
const resizeHandle = ref<string>('')
const dragStart = ref({ x: 0, y: 0 })
const initialBox = ref({ x: 0, y: 0, width: 0, height: 0 })

const boundingBoxStyle = computed(() => {
  if (!pdfCanvas.value || !canvasReady.value) return {}
  
  const canvasWidth = pdfCanvas.value.width
  const canvasHeight = pdfCanvas.value.height
  
  return {
    left: `${localCoordinates.value.boundingBox.x * canvasWidth}px`,
    top: `${localCoordinates.value.boundingBox.y * canvasHeight}px`,
    width: `${localCoordinates.value.boundingBox.width * canvasWidth}px`,
    height: `${localCoordinates.value.boundingBox.height * canvasHeight}px`
  }
})

onMounted(async () => {
  await renderPDFPage()
  await updatePreview()
})

watch(() => localCoordinates.value, async () => {
  await updatePreview()
}, { deep: true })

/**
 * Render full PDF page to canvas
 */
const renderPDFPage = async () => {
  if (!pdfCanvas.value) return
  
  try {
    await renderPDFPageToCanvas(
      props.pdfBuffer,
      props.coordinates.pageNumber,
      pdfCanvas.value,
      2
    )
    canvasReady.value = true
  } catch (error) {
    console.error('Error rendering PDF page:', error)
  }
}

/**
 * Update preview with current coordinates
 */
const updatePreview = async () => {
  if (!previewCanvas.value) return
  
  try {
    const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, localCoordinates.value, 2)
    const img = new Image()
    
    img.onload = () => {
      const ctx = previewCanvas.value!.getContext('2d')!
      previewCanvas.value!.width = img.width
      previewCanvas.value!.height = img.height
      ctx.drawImage(img, 0, 0)
    }
    
    img.src = dataUrl
  } catch (error) {
    console.error('Error updating preview:', error)
  }
}

/**
 * Start dragging the bounding box
 */
const startDrag = (e: MouseEvent) => {
  if (!pdfCanvas.value) return
  
  isDragging.value = true
  const rect = pdfCanvas.value.getBoundingClientRect()
  dragStart.value = { 
    x: e.clientX - rect.left, 
    y: e.clientY - rect.top 
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

/**
 * Handle drag movement
 */
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !pdfCanvas.value) return
  
  const rect = pdfCanvas.value.getBoundingClientRect()
  const currentX = e.clientX - rect.left
  const currentY = e.clientY - rect.top
  
  const deltaX = (currentX - dragStart.value.x) / pdfCanvas.value.width
  const deltaY = (currentY - dragStart.value.y) / pdfCanvas.value.height
  
  localCoordinates.value.boundingBox.x += deltaX
  localCoordinates.value.boundingBox.y += deltaY
  
  // Clamp to valid range
  localCoordinates.value.boundingBox.x = Math.max(0, Math.min(1 - localCoordinates.value.boundingBox.width, localCoordinates.value.boundingBox.x))
  localCoordinates.value.boundingBox.y = Math.max(0, Math.min(1 - localCoordinates.value.boundingBox.height, localCoordinates.value.boundingBox.y))
  
  dragStart.value = { x: currentX, y: currentY }
}

/**
 * Stop dragging
 */
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

/**
 * Start resizing from a handle
 */
const startResize = (handle: string) => {
  if (!pdfCanvas.value) return
  
  isResizing.value = true
  resizeHandle.value = handle
  
  // Store initial state
  initialBox.value = { ...localCoordinates.value.boundingBox }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

/**
 * Handle resize movement
 */
const onResize = (e: MouseEvent) => {
  if (!isResizing.value || !pdfCanvas.value) return
  
  const rect = pdfCanvas.value.getBoundingClientRect()
  const mouseX = (e.clientX - rect.left) / pdfCanvas.value.width
  const mouseY = (e.clientY - rect.top) / pdfCanvas.value.height
  
  const box = localCoordinates.value.boundingBox
  
  switch (resizeHandle.value) {
    case 'tl': // Top-left
      box.width = initialBox.value.x + initialBox.value.width - mouseX
      box.height = initialBox.value.y + initialBox.value.height - mouseY
      box.x = mouseX
      box.y = mouseY
      break
    case 'tr': // Top-right
      box.width = mouseX - box.x
      box.height = initialBox.value.y + initialBox.value.height - mouseY
      box.y = mouseY
      break
    case 'bl': // Bottom-left
      box.width = initialBox.value.x + initialBox.value.width - mouseX
      box.height = mouseY - box.y
      box.x = mouseX
      break
    case 'br': // Bottom-right
      box.width = mouseX - box.x
      box.height = mouseY - box.y
      break
  }
  
  // Clamp values
  updateBoundingBox()
}

/**
 * Stop resizing
 */
const stopResize = () => {
  isResizing.value = false
  resizeHandle.value = ''
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

/**
 * Update and clamp bounding box values
 */
const updateBoundingBox = () => {
  // Clamp values to valid range
  localCoordinates.value.boundingBox.x = Math.max(0, Math.min(1, localCoordinates.value.boundingBox.x))
  localCoordinates.value.boundingBox.y = Math.max(0, Math.min(1, localCoordinates.value.boundingBox.y))
  localCoordinates.value.boundingBox.width = Math.max(0.1, Math.min(1, localCoordinates.value.boundingBox.width))
  localCoordinates.value.boundingBox.height = Math.max(0.1, Math.min(1, localCoordinates.value.boundingBox.height))
  
  // Ensure box doesn't exceed bounds
  if (localCoordinates.value.boundingBox.x + localCoordinates.value.boundingBox.width > 1) {
    localCoordinates.value.boundingBox.width = 1 - localCoordinates.value.boundingBox.x
  }
  if (localCoordinates.value.boundingBox.y + localCoordinates.value.boundingBox.height > 1) {
    localCoordinates.value.boundingBox.height = 1 - localCoordinates.value.boundingBox.y
  }
}

/**
 * Reset to original AI-detected coordinates
 */
const resetToOriginal = () => {
  localCoordinates.value = { ...originalCoordinates.value }
}

/**
 * Save updated coordinates
 */
const saveCoordinates = () => {
  localCoordinates.value.detectionMethod = 'adjusted'
  localCoordinates.value.updatedAt = Date.now()
  emit('update:coordinates', localCoordinates.value)
}
</script>

<style scoped>
.pdf-canvas-container {
  position: relative;
  user-select: none;
}

.bounding-box {
  pointer-events: auto;
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
}

.handle.top-left { 
  top: -6px; 
  left: -6px; 
  cursor: nw-resize; 
}

.handle.top-right { 
  top: -6px; 
  right: -6px; 
  cursor: ne-resize; 
}

.handle.bottom-left { 
  bottom: -6px; 
  left: -6px; 
  cursor: sw-resize; 
}

.handle.bottom-right { 
  bottom: -6px; 
  right: -6px; 
  cursor: se-resize; 
}

canvas {
  display: block;
}
</style>
