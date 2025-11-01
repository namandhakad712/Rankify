<template>
  <div class="diagram-coordinate-editor">
    <div class="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
      <h3 class="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
        <Icon name="lucide:crop" class="inline h-5 w-5 mr-2" />
        Crop Diagram Area
      </h3>
      <div class="space-y-1 text-sm text-blue-800 dark:text-blue-200">
        <p class="flex items-start gap-2">
          <Icon name="lucide:move" class="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span><strong>Drag the blue box</strong> to move the selection</span>
        </p>
        <p class="flex items-start gap-2">
          <Icon name="lucide:maximize-2" class="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span><strong>Drag the corner circles</strong> to resize the selection</span>
        </p>
        <p class="flex items-start gap-2">
          <Icon name="lucide:eye" class="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span><strong>Preview updates</strong> automatically as you adjust</span>
        </p>
      </div>
    </div>
    
    <!-- PDF page with interactive overlay -->
    <div class="pdf-canvas-container relative border-2 border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
      <canvas ref="pdfCanvas" class="w-full h-auto max-w-full" style="display: block;"></canvas>
      
      <!-- Draggable bounding box overlay -->
      <div 
        v-if="canvasReady"
        class="bounding-box absolute border-4 border-blue-500 bg-blue-500/10 cursor-move"
        :class="{ 'animate-pulse-border': !isDragging && !isResizing }"
        :style="boundingBoxStyle"
        @mousedown="startDrag"
      >
        <!-- Resize handles -->
        <div class="handle top-left animate-bounce-subtle" @mousedown.stop="startResize('tl')"></div>
        <div class="handle top-right animate-bounce-subtle" @mousedown.stop="startResize('tr')"></div>
        <div class="handle bottom-left animate-bounce-subtle" @mousedown.stop="startResize('bl')"></div>
        <div class="handle bottom-right animate-bounce-subtle" @mousedown.stop="startResize('br')"></div>
        
        <!-- Label -->
        <div class="absolute -top-8 left-0 bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold shadow-lg flex items-center gap-1">
          <Icon name="lucide:move" class="h-3 w-3" />
          {{ localCoordinates.label || 'Drag to Move' }}
        </div>
        
        <!-- Center drag hint -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="bg-blue-500/80 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
            <Icon name="lucide:hand" class="inline h-4 w-4 mr-1" />
            Drag to Move
          </div>
        </div>
      </div>
    </div>
    
    <!-- Advanced Coordinate inputs (collapsible) -->
    <details class="mt-4">
      <summary class="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2">
        <Icon name="lucide:settings-2" class="h-4 w-4" />
        Advanced: Manual Coordinate Input
      </summary>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div>
          <UiLabel>X Position</UiLabel>
          <UiInput 
            v-model.number="localCoordinates.boundingBox.x" 
            type="number" 
            step="0.01" 
            min="0" 
            max="1"
            @input="updateBoundingBox"
          />
        </div>
        <div>
          <UiLabel>Y Position</UiLabel>
          <UiInput 
            v-model.number="localCoordinates.boundingBox.y" 
            type="number" 
            step="0.01" 
            min="0" 
            max="1"
            @input="updateBoundingBox"
          />
        </div>
        <div>
          <UiLabel>Width</UiLabel>
          <UiInput 
            v-model.number="localCoordinates.boundingBox.width" 
            type="number" 
            step="0.01" 
            min="0.1" 
            max="1"
            @input="updateBoundingBox"
          />
        </div>
        <div>
          <UiLabel>Height</UiLabel>
          <UiInput 
            v-model.number="localCoordinates.boundingBox.height" 
            type="number" 
            step="0.01" 
            min="0.1" 
            max="1"
            @input="updateBoundingBox"
          />
        </div>
      </div>
    </details>
    
    <!-- Preview -->
    <div class="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <h4 class="text-sm font-semibold mb-2">Cropped Diagram Preview</h4>
      <div class="flex items-center justify-center bg-white dark:bg-slate-900 rounded p-4">
        <canvas ref="previewCanvas" class="max-w-full h-auto max-h-64" style="display: block; image-rendering: crisp-edges;"></canvas>
      </div>
      <p class="text-xs text-slate-600 dark:text-slate-400 mt-2">
        Aspect Ratio: {{ aspectRatio }} ({{ aspectRatioQuality }})
      </p>
    </div>
    
    <!-- Actions -->
    <div class="flex gap-2 mt-4">
      <UiButton variant="outline" @click="resetToOriginal">
        <Icon name="lucide:rotate-ccw" class="h-4 w-4 mr-2" />
        Reset to AI Detection
      </UiButton>
      <UiButton @click="saveCoordinates" variant="default">
        <Icon name="lucide:save" class="h-4 w-4 mr-2" />
        Save Coordinates
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { renderDiagramFromPDF, renderPDFPageToCanvas } from '#layers/shared/app/utils/diagramCoordinateUtils'
import type { DiagramCoordinates } from '#layers/shared/app/types/diagram'

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
  if (!pdfCanvas.value || !canvasReady.value) {
    console.log('⚠️ boundingBoxStyle: Not ready', { canvas: !!pdfCanvas.value, ready: canvasReady.value })
    return {}
  }
  
  const canvasWidth = pdfCanvas.value.width
  const canvasHeight = pdfCanvas.value.height
  
  const style = {
    left: `${localCoordinates.value.boundingBox.x * canvasWidth}px`,
    top: `${localCoordinates.value.boundingBox.y * canvasHeight}px`,
    width: `${localCoordinates.value.boundingBox.width * canvasWidth}px`,
    height: `${localCoordinates.value.boundingBox.height * canvasHeight}px`
  }
  
  console.log('📐 boundingBoxStyle calculated:', {
    canvasWidth,
    canvasHeight,
    coords: localCoordinates.value.boundingBox,
    style
  })
  
  return style
})

const aspectRatio = computed(() => {
  const width = localCoordinates.value.boundingBox.width
  const height = localCoordinates.value.boundingBox.height
  if (height === 0) return '0:0'
  const ratio = width / height
  return `${ratio.toFixed(2)}:1`
})

const aspectRatioQuality = computed(() => {
  const width = localCoordinates.value.boundingBox.width
  const height = localCoordinates.value.boundingBox.height
  const ratio = width / height
  
  if (ratio >= 0.5 && ratio <= 2.0) return '✅ Good'
  if (ratio >= 0.3 && ratio <= 3.0) return '⚠️ Acceptable'
  return '❌ Too stretched'
})

onMounted(async () => {
  console.log('🎨 DiagramCoordinateEditor mounted')
  console.log('  - pdfCanvas ref:', !!pdfCanvas.value)
  console.log('  - previewCanvas ref:', !!previewCanvas.value)
  console.log('  - pdfBuffer size:', props.pdfBuffer.byteLength)
  console.log('  - coordinates:', props.coordinates)
  
  await nextTick()
  console.log('  - After nextTick, pdfCanvas:', !!pdfCanvas.value)
  
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
  console.log('📄 renderPDFPage called')
  console.log('  - pdfCanvas.value:', !!pdfCanvas.value)
  
  if (!pdfCanvas.value) {
    console.error('❌ pdfCanvas ref is null!')
    return
  }
  
  try {
    console.log('  - Calling renderPDFPageToCanvas...')
    await renderPDFPageToCanvas(
      props.pdfBuffer,
      props.coordinates.pageNumber,
      pdfCanvas.value,
      2
    )
    console.log('✅ PDF page rendered successfully')
    canvasReady.value = true
    console.log('  - canvasReady set to true')
  } catch (error) {
    console.error('❌ Error rendering PDF page:', error)
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
  max-width: 100%;
}

.bounding-box {
  pointer-events: auto;
  transition: box-shadow 0.2s;
}

.bounding-box:hover {
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
}

@keyframes pulse-border {
  0%, 100% {
    border-color: rgb(59, 130, 246);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    border-color: rgb(96, 165, 250);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
}

.animate-pulse-border {
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes bounce-subtle {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.animate-bounce-subtle {
  animation: bounce-subtle 2s ease-in-out infinite;
}

.handle {
  position: absolute;
  width: 16px;
  height: 16px;
  background: white;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, background-color 0.2s;
}

.handle:hover {
  transform: scale(1.3);
  background-color: #3b82f6;
}

.handle.top-left { 
  top: -8px; 
  left: -8px; 
  cursor: nw-resize; 
}

.handle.top-right { 
  top: -8px; 
  right: -8px; 
  cursor: ne-resize; 
}

.handle.bottom-left { 
  bottom: -8px; 
  left: -8px; 
  cursor: sw-resize; 
}

.handle.bottom-right { 
  bottom: -8px; 
  right: -8px; 
  cursor: se-resize; 
}

canvas {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
