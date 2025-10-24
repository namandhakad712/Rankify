<template>
  <div class="diagram-viewer">
    <!-- Thumbnail view -->
    <div 
      v-if="!fullView"
      class="diagram-thumbnail cursor-pointer hover:opacity-80 transition-opacity"
      @click="openFullView"
    >
      <canvas 
        ref="thumbnailCanvas" 
        class="w-full h-auto rounded-lg border-2 border-slate-300 dark:border-slate-700"
      ></canvas>
      <div class="mt-2 text-xs text-center text-slate-600 dark:text-slate-400">
        <Icon name="lucide:image" class="inline h-3 w-3 mr-1" />
        {{ diagram.label || 'Diagram' }}
        <span class="ml-2 text-orange-600">Click to view</span>
      </div>
    </div>
    
    <!-- Full view modal -->
    <Dialog v-model:open="fullView">
      <DialogContent class="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{{ diagram.label || 'Diagram' }}</DialogTitle>
          <DialogDescription>
            Page {{ diagram.pageNumber }} • Confidence: {{ diagram.confidence }}/5
          </DialogDescription>
        </DialogHeader>
        
        <div class="diagram-full-view relative overflow-auto max-h-[60vh]">
          <canvas 
            ref="fullCanvas" 
            class="w-full h-auto object-contain"
            :style="{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }"
          ></canvas>
          
          <!-- Zoom controls -->
          <div class="absolute bottom-4 right-4 flex gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2">
            <Button size="sm" variant="outline" @click="zoomOut" :disabled="zoomLevel <= 0.5">
              <Icon name="lucide:zoom-out" class="h-4 w-4" />
            </Button>
            <span class="px-2 py-1 text-sm font-medium">{{ Math.round(zoomLevel * 100) }}%</span>
            <Button size="sm" variant="outline" @click="zoomIn" :disabled="zoomLevel >= 3">
              <Icon name="lucide:zoom-in" class="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" @click="resetZoom">
              <Icon name="lucide:maximize" class="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="downloadDiagram">
            <Icon name="lucide:download" class="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button @click="fullView = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { renderDiagramFromPDF } from '#layers/shared/app/utils/diagramCoordinateUtils'
import type { DiagramCoordinates } from '#layers/shared/app/types/diagram'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '#layers/shared/app/components/ui/dialog'
import { Button } from '#layers/shared/app/components/ui/button'
import { Icon } from '#components'

const props = defineProps<{
  pdfBuffer: ArrayBuffer
  diagram: DiagramCoordinates
}>()

const thumbnailCanvas = ref<HTMLCanvasElement>()
const fullCanvas = ref<HTMLCanvasElement>()
const fullView = ref(false)
const zoomLevel = ref(1)
const isLoading = ref(false)

onMounted(async () => {
  await renderThumbnail()
})

/**
 * Render low-resolution thumbnail for preview
 */
const renderThumbnail = async () => {
  if (!thumbnailCanvas.value) return
  
  try {
    isLoading.value = true
    
    // Render at scale=1 for fast, low-res preview
    const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 1)
    const img = new Image()
    
    img.onload = () => {
      const ctx = thumbnailCanvas.value!.getContext('2d')!
      thumbnailCanvas.value!.width = img.width
      thumbnailCanvas.value!.height = img.height
      ctx.drawImage(img, 0, 0)
      isLoading.value = false
    }
    
    img.onerror = () => {
      console.error('Failed to load thumbnail image')
      isLoading.value = false
    }
    
    img.src = dataUrl
  } catch (error) {
    console.error('Error rendering thumbnail:', error)
    isLoading.value = false
  }
}

/**
 * Open full view modal and render high-resolution diagram
 */
const openFullView = async () => {
  fullView.value = true
  
  // Wait for next tick to ensure canvas is mounted
  await nextTick()
  
  if (!fullCanvas.value) return
  
  try {
    isLoading.value = true
    
    // Render at scale=3 for high-resolution full view
    const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 3)
    const img = new Image()
    
    img.onload = () => {
      const ctx = fullCanvas.value!.getContext('2d')!
      fullCanvas.value!.width = img.width
      fullCanvas.value!.height = img.height
      ctx.drawImage(img, 0, 0)
      isLoading.value = false
    }
    
    img.onerror = () => {
      console.error('Failed to load full view image')
      isLoading.value = false
    }
    
    img.src = dataUrl
  } catch (error) {
    console.error('Error rendering full view:', error)
    isLoading.value = false
  }
}

/**
 * Zoom in (increase by 25%)
 */
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3)
}

/**
 * Zoom out (decrease by 25%)
 */
const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5)
}

/**
 * Reset zoom to 100%
 */
const resetZoom = () => {
  zoomLevel.value = 1
}

/**
 * Download diagram as PNG file
 */
const downloadDiagram = async () => {
  try {
    const dataUrl = await renderDiagramFromPDF(props.pdfBuffer, props.diagram, 3)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${props.diagram.label || 'diagram'}.png`
    link.click()
  } catch (error) {
    console.error('Error downloading diagram:', error)
  }
}
</script>

<style scoped>
.diagram-thumbnail {
  position: relative;
}

.diagram-full-view {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

canvas {
  max-width: 100%;
  height: auto;
}
</style>
