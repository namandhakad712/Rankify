<template>
  <div class="pdf-viewer-container">
    <canvas
      ref="canvasRef"
      class="pdf-canvas"
      :style="{ transform: `scale(${zoom})` }"
    />
    <div v-if="loading" class="loading-overlay">
      <Icon name="line-md:loading-loop" class="animate-spin" />
      <span>Loading PDF...</span>
    </div>
    <div v-if="error" class="error-overlay">
      <Icon name="line-md:alert" class="text-red-500" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps<{
  pdfData: ArrayBuffer
  page?: number
  zoom?: number
}>()

// Emits
const emit = defineEmits<{
  pageLoaded: [pageNumber: number]
  totalPages: [count: number]
  error: [error: string]
}>()

// State
const canvasRef = ref<HTMLCanvasElement>()
const loading = ref(false)
const error = ref<string | null>(null)
const pdfDoc = ref<any>(null)
const currentPageNum = ref(1)
const zoomLevel = ref(1)

// Methods
const loadPDF = async () => {
  if (!props.pdfData) return

  loading.value = true
  error.value = null

  try {
    // Use mupdf library that's already available in the project
    const { createMuPDF } = await import('mupdf')
    const mupdf = await createMuPDF()
    
    pdfDoc.value = mupdf.load(new Uint8Array(props.pdfData))
    const pageCount = pdfDoc.value.countPages()
    
    emit('totalPages', pageCount)
    
    // Load the first page
    await renderPage(props.page || 1)
    
  } catch (err: any) {
    error.value = `Failed to load PDF: ${err.message}`
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

const renderPage = async (pageNumber: number) => {
  if (!pdfDoc.value || !canvasRef.value) return

  try {
    loading.value = true
    
    const page = pdfDoc.value.loadPage(pageNumber - 1) // 0-based indexing
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }

    // Get page dimensions
    const bounds = page.getBounds()
    const viewport = {
      width: bounds[2] - bounds[0],
      height: bounds[3] - bounds[1]
    }

    // Set canvas size
    const scale = (props.zoom || 1) * (window.devicePixelRatio || 1)
    canvas.width = viewport.width * scale
    canvas.height = viewport.height * scale
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`

    // Scale context for high DPI displays
    ctx.scale(scale, scale)

    // Clear canvas
    ctx.clearRect(0, 0, viewport.width, viewport.height)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, viewport.width, viewport.height)

    // Render page to canvas
    const pixmap = page.toPixmap([scale, 0, 0, scale, 0, 0], 'rgb', false)
    const imageData = new ImageData(
      new Uint8ClampedArray(pixmap.getPixels()),
      pixmap.getWidth(),
      pixmap.getHeight()
    )
    
    ctx.putImageData(imageData, 0, 0)
    
    currentPageNum.value = pageNumber
    emit('pageLoaded', pageNumber)
    
  } catch (err: any) {
    error.value = `Failed to render page: ${err.message}`
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

// Watchers
watch(() => props.pdfData, loadPDF, { immediate: true })

watch(() => props.page, (newPage) => {
  if (newPage && newPage !== currentPageNum.value) {
    renderPage(newPage)
  }
})

watch(() => props.zoom, (newZoom) => {
  if (newZoom && newZoom !== zoomLevel.value) {
    zoomLevel.value = newZoom
    renderPage(currentPageNum.value)
  }
})

// Lifecycle
onMounted(() => {
  if (props.pdfData) {
    loadPDF()
  }
})

onUnmounted(() => {
  // Clean up PDF document
  if (pdfDoc.value) {
    pdfDoc.value = null
  }
})
</script>

<style scoped>
.pdf-viewer-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background-color: #f5f5f5;
}

.pdf-canvas {
  max-width: 100%;
  max-height: 100%;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background: white;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.loading-overlay {
  color: #3b82f6;
}

.error-overlay {
  color: #ef4444;
}
</style>