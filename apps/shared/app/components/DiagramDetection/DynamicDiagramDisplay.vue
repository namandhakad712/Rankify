<template>
  <div class="dynamic-diagram-display">
    <!-- Single Diagram Display -->
    <div 
      v-if="!multiple && renderedDiagram"
      class="single-diagram-container"
      :class="{ 'loading': isLoading, 'error': hasError }"
    >
      <div class="diagram-wrapper" :style="wrapperStyle">
        <img
          :src="renderedDiagram.imageData"
          :alt="diagramAlt"
          class="diagram-image"
          :style="imageStyle"
          @load="onImageLoad"
          @error="onImageError"
        />
        
        <!-- Diagram Info Overlay -->
        <div v-if="showInfo" class="diagram-info">
          <div class="info-item">
            <Icon name="tag" />
            <span>{{ coordinates.type }}</span>
          </div>
          <div class="info-item">
            <Icon name="zap" />
            <span>{{ Math.round(coordinates.confidence * 100) }}%</span>
          </div>
          <div v-if="coordinates.description" class="info-item">
            <Icon name="info" />
            <span>{{ coordinates.description }}</span>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-overlay">
          <Icon name="loader" class="animate-spin" />
          <span>Rendering diagram...</span>
        </div>

        <!-- Error State -->
        <div v-if="hasError" class="error-overlay">
          <Icon name="alert-triangle" />
          <span>{{ errorMessage }}</span>
          <button @click="retryRender" class="retry-btn">
            <Icon name="refresh-cw" />
            Retry
          </button>
        </div>
      </div>
    </div>

    <!-- Multiple Diagrams Display -->
    <div 
      v-else-if="multiple && renderedDiagrams.length > 0"
      class="multiple-diagrams-container"
    >
      <div 
        v-for="(diagram, index) in renderedDiagrams"
        :key="diagram.id || index"
        class="diagram-item"
        :class="{ 'active': activeIndex === index }"
        @click="setActiveDiagram(index)"
      >
        <div class="diagram-thumbnail">
          <img
            :src="diagram.imageData"
            :alt="`Diagram ${index + 1}`"
            class="thumbnail-image"
          />
          <div class="diagram-badge">{{ index + 1 }}</div>
        </div>
        
        <div class="diagram-meta">
          <span class="diagram-type">{{ diagramsList[index].type }}</span>
          <span class="diagram-confidence">
            {{ Math.round(diagramsList[index].confidence * 100) }}%
          </span>
        </div>
      </div>

      <!-- Active Diagram Display -->
      <div v-if="activeDiagram" class="active-diagram-display">
        <img
          :src="activeDiagram.imageData"
          :alt="`Active diagram ${activeIndex + 1}`"
          class="active-diagram-image"
        />
        
        <div class="active-diagram-info">
          <h4>{{ diagramsList[activeIndex].type }} Diagram</h4>
          <p v-if="diagramsList[activeIndex].description">
            {{ diagramsList[activeIndex].description }}
          </p>
          <div class="diagram-stats">
            <span>Confidence: {{ Math.round(diagramsList[activeIndex].confidence * 100) }}%</span>
            <span>Size: {{ activeDiagram.dimensions.width }}×{{ activeDiagram.dimensions.height }}</span>
            <span>Scale: {{ Math.round(activeDiagram.scale * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No Diagrams State -->
    <div v-else-if="!isLoading && !hasError" class="no-diagrams">
      <Icon name="image" />
      <p>No diagrams to display</p>
    </div>

    <!-- Controls -->
    <div v-if="showControls" class="diagram-controls">
      <div class="control-group">
        <label>Quality:</label>
        <input
          type="range"
          v-model.number="renderOptions.quality"
          min="0.1"
          max="1"
          step="0.1"
          @change="onOptionsChange"
        />
        <span>{{ Math.round(renderOptions.quality * 100) }}%</span>
      </div>

      <div class="control-group">
        <label>Format:</label>
        <select v-model="renderOptions.format" @change="onOptionsChange">
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </div>

      <div class="control-group">
        <label>
          <input
            type="checkbox"
            v-model="renderOptions.maintainAspectRatio"
            @change="onOptionsChange"
          />
          Maintain Aspect Ratio
        </label>
      </div>

      <div class="control-group">
        <button @click="downloadDiagram" class="btn btn-secondary">
          <Icon name="download" />
          Download
        </button>
        
        <button @click="copyToClipboard" class="btn btn-secondary">
          <Icon name="copy" />
          Copy
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { 
  DiagramCoordinates, 
  ImageDimensions 
} from '~/shared/types/diagram-detection'
import { 
  DiagramRenderer, 
  BatchDiagramRenderer,
  createDiagramRenderer,
  createBatchDiagramRenderer,
  type DiagramRenderOptions,
  type RenderedDiagram
} from '~/app/utils/diagramRenderer'

interface Props {
  pageImage: string | HTMLImageElement
  coordinates?: DiagramCoordinates
  diagramsList?: DiagramCoordinates[]
  multiple?: boolean
  responsive?: boolean
  containerWidth?: number
  containerHeight?: number
  showInfo?: boolean
  showControls?: boolean
  enableCaching?: boolean
  batchRendering?: boolean
  renderOptions?: Partial<DiagramRenderOptions>
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  responsive: true,
  showInfo: true,
  showControls: false,
  enableCaching: true,
  batchRendering: false,
  renderOptions: () => ({
    quality: 0.9,
    format: 'png',
    maintainAspectRatio: true,
    enableSmoothing: true
  })
})

const emit = defineEmits<{
  rendered: [diagrams: RenderedDiagram[]]
  error: [error: Error]
  diagramSelected: [index: number, diagram: RenderedDiagram]
}>()

// State
const renderer = ref<DiagramRenderer | BatchDiagramRenderer>()
const renderedDiagram = ref<RenderedDiagram | null>(null)
const renderedDiagrams = ref<RenderedDiagram[]>([])
const activeIndex = ref(0)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const renderOptions = ref<DiagramRenderOptions>({
  quality: 0.9,
  format: 'png',
  maintainAspectRatio: true,
  enableSmoothing: true,
  ...props.renderOptions
})

// Computed
const activeDiagram = computed(() => {
  return renderedDiagrams.value[activeIndex.value] || null
})

const diagramAlt = computed(() => {
  if (!props.coordinates) return 'Diagram'
  return `${props.coordinates.type} diagram (${Math.round(props.coordinates.confidence * 100)}% confidence)`
})

const wrapperStyle = computed(() => {
  if (!props.responsive || !renderedDiagram.value) return {}
  
  const maxWidth = props.containerWidth || 400
  const maxHeight = props.containerHeight || 300
  
  return {
    maxWidth: `${maxWidth}px`,
    maxHeight: `${maxHeight}px`
  }
})

const imageStyle = computed(() => {
  if (!props.responsive) return {}
  
  return {
    width: '100%',
    height: 'auto',
    objectFit: 'contain'
  }
})

// Lifecycle
onMounted(async () => {
  await initializeRenderer()
  await renderDiagrams()
})

onUnmounted(() => {
  cleanup()
})

// Watch for prop changes
watch([() => props.pageImage, () => props.coordinates, () => props.diagramsList], async () => {
  await renderDiagrams()
}, { deep: true })

watch(() => props.renderOptions, (newOptions) => {
  renderOptions.value = { ...renderOptions.value, ...newOptions }
}, { deep: true })

// Methods
async function initializeRenderer() {
  if (props.batchRendering) {
    renderer.value = createBatchDiagramRenderer(props.enableCaching)
  } else {
    renderer.value = createDiagramRenderer(props.enableCaching)
  }
}

async function renderDiagrams() {
  if (!renderer.value || !props.pageImage) return

  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''

  try {
    if (props.multiple && props.diagramsList) {
      await renderMultipleDiagrams()
    } else if (props.coordinates) {
      await renderSingleDiagram()
    }
  } catch (error) {
    handleRenderError(error)
  } finally {
    isLoading.value = false
  }
}

async function renderSingleDiagram() {
  if (!renderer.value || !props.coordinates) return

  const options = props.responsive && props.containerWidth && props.containerHeight ?
    await createResponsiveOptions() : renderOptions.value

  if (props.responsive && props.containerWidth && props.containerHeight) {
    renderedDiagram.value = await (renderer.value as DiagramRenderer).createResponsiveDiagram(
      props.pageImage,
      props.coordinates,
      props.containerWidth,
      props.containerHeight,
      options
    )
  } else {
    renderedDiagram.value = await renderer.value.renderDiagram(
      props.pageImage,
      props.coordinates,
      options
    )
  }

  emit('rendered', [renderedDiagram.value])
}

async function renderMultipleDiagrams() {
  if (!renderer.value || !props.diagramsList) return

  const diagramsData = props.diagramsList.map((coords, index) => ({
    id: `diagram_${index}`,
    coordinates: coords
  }))

  renderedDiagrams.value = await renderer.value.renderMultipleDiagrams(
    props.pageImage,
    diagramsData,
    renderOptions.value
  )

  emit('rendered', renderedDiagrams.value)
}

async function createResponsiveOptions(): Promise<DiagramRenderOptions> {
  return {
    ...renderOptions.value,
    maxWidth: props.containerWidth,
    maxHeight: props.containerHeight,
    maintainAspectRatio: true
  }
}

function setActiveDiagram(index: number) {
  if (index >= 0 && index < renderedDiagrams.value.length) {
    activeIndex.value = index
    emit('diagramSelected', index, renderedDiagrams.value[index])
  }
}

async function retryRender() {
  hasError.value = false
  errorMessage.value = ''
  await renderDiagrams()
}

async function onOptionsChange() {
  await nextTick()
  await renderDiagrams()
}

function onImageLoad() {
  // Image loaded successfully
}

function onImageError() {
  handleRenderError(new Error('Failed to load rendered diagram'))
}

function handleRenderError(error: any) {
  hasError.value = true
  errorMessage.value = error.message || 'Failed to render diagram'
  emit('error', error)
}

async function downloadDiagram() {
  const diagram = props.multiple ? activeDiagram.value : renderedDiagram.value
  if (!diagram) return

  try {
    // Create download link
    const link = document.createElement('a')
    link.href = diagram.imageData
    link.download = `diagram_${Date.now()}.${renderOptions.value.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Failed to download diagram:', error)
  }
}

async function copyToClipboard() {
  const diagram = props.multiple ? activeDiagram.value : renderedDiagram.value
  if (!diagram) return

  try {
    // Convert data URL to blob
    const response = await fetch(diagram.imageData)
    const blob = await response.blob()
    
    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ])
  } catch (error) {
    console.error('Failed to copy diagram to clipboard:', error)
  }
}

function cleanup() {
  if (renderer.value) {
    renderer.value.clearCache()
  }
}

// Expose methods for parent components
defineExpose({
  renderDiagrams,
  setActiveDiagram,
  downloadDiagram,
  copyToClipboard,
  getStats: () => renderer.value?.getStats(),
  clearCache: () => renderer.value?.clearCache()
})
</script>

<style scoped>
.dynamic-diagram-display {
  @apply w-full;
}

.single-diagram-container {
  @apply relative;
}

.diagram-wrapper {
  @apply relative inline-block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden;
}

.diagram-image {
  @apply block max-w-full h-auto;
}

.diagram-info {
  @apply absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs rounded px-2 py-1 space-y-1;
}

.info-item {
  @apply flex items-center gap-1;
}

.loading-overlay,
.error-overlay {
  @apply absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center;
}

.error-overlay {
  @apply text-red-600;
}

.retry-btn {
  @apply mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1;
}

.multiple-diagrams-container {
  @apply space-y-4;
}

.diagram-item {
  @apply flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer
         hover:border-blue-300 hover:bg-blue-50 transition-colors;
}

.diagram-item.active {
  @apply border-blue-500 bg-blue-50;
}

.diagram-thumbnail {
  @apply relative flex-shrink-0;
}

.thumbnail-image {
  @apply w-16 h-16 object-cover rounded border;
}

.diagram-badge {
  @apply absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full
         flex items-center justify-center;
}

.diagram-meta {
  @apply flex flex-col gap-1;
}

.diagram-type {
  @apply font-medium text-gray-900 capitalize;
}

.diagram-confidence {
  @apply text-sm text-gray-600;
}

.active-diagram-display {
  @apply mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50;
}

.active-diagram-image {
  @apply w-full max-w-md mx-auto block rounded;
}

.active-diagram-info {
  @apply mt-3 text-center;
}

.active-diagram-info h4 {
  @apply text-lg font-semibold text-gray-900 mb-2;
}

.active-diagram-info p {
  @apply text-gray-700 mb-3;
}

.diagram-stats {
  @apply flex justify-center gap-4 text-sm text-gray-600;
}

.no-diagrams {
  @apply text-center py-8 text-gray-500;
}

.diagram-controls {
  @apply mt-4 p-4 bg-gray-50 rounded-lg space-y-3;
}

.control-group {
  @apply flex items-center gap-3;
}

.control-group label {
  @apply text-sm font-medium text-gray-700 min-w-0 flex-shrink-0;
}

.control-group input[type="range"] {
  @apply flex-1;
}

.control-group select {
  @apply px-2 py-1 border border-gray-300 rounded text-sm;
}

.control-group input[type="checkbox"] {
  @apply mr-2;
}

.btn {
  @apply px-3 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
}

.loading {
  @apply opacity-75;
}

.error {
  @apply border-red-300 bg-red-50;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>