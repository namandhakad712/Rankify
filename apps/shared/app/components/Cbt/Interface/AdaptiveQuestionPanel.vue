<template>
  <div class="adaptive-question-panel relative">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-sm text-gray-600">Loading question data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center h-64">
      <div class="text-center">
        <Icon name="mdi:alert-circle" class="text-red-500 mx-auto mb-4" size="2rem" />
        <p class="text-sm text-red-600 mb-4">{{ error }}</p>
        <button
          @click="retryLoad"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Enhanced Question Panel (Coordinate-based) -->
    <EnhancedQuestionPanel
      v-else-if="shouldUseCoordinateRendering"
      :is-question-pallete-collapsed="isQuestionPalleteCollapsed"
      :cropper-sections-data="cropperSectionsData"
      :coordinate-data="coordinateData"
      :enable-coordinate-rendering="true"
      @rendering-error="handleRenderingError"
    />

    <!-- Legacy Question Panel (Fallback) -->
    <QuestionPanel
      v-else
      :is-question-pallete-collapsed="isQuestionPalleteCollapsed"
      :cropper-sections-data="cropperSectionsData"
    />

    <!-- Rendering Mode Indicator -->
    <div
      v-if="showModeIndicator"
      class="absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-medium z-10"
      :class="modeIndicatorClass"
    >
      {{ currentModeLabel }}
    </div>

    <!-- Compatibility Warning -->
    <div
      v-if="compatibilityWarning"
      class="absolute top-2 right-2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-md text-xs z-10"
    >
      <div class="flex items-center space-x-2">
        <Icon name="mdi:alert" size="1rem" />
        <span>{{ compatibilityWarning }}</span>
        <button
          @click="dismissWarning"
          class="ml-2 text-yellow-600 hover:text-yellow-800"
        >
          <Icon name="mdi:close" size="0.8rem" />
        </button>
      </div>
    </div>

    <!-- Debug Panel (Development only) -->
    <div
      v-if="showDebugInfo && isDevelopment"
      class="absolute bottom-2 left-2 bg-gray-800 text-white p-3 rounded-md text-xs z-10 max-w-sm"
    >
      <div class="font-semibold mb-2">Debug Info</div>
      <div class="space-y-1">
        <div>Mode: {{ currentMode }}</div>
        <div>Question ID: {{ currentQuestionId }}</div>
        <div>Has Coordinates: {{ hasCoordinateData }}</div>
        <div>Has Legacy Data: {{ hasLegacyData }}</div>
        <div>Compatibility: {{ compatibilityStatus }}</div>
        <div v-if="renderingStats">
          Diagrams: {{ renderingStats.diagramCount }}
        </div>
      </div>
      <button
        @click="showDebugInfo = false"
        class="mt-2 text-gray-400 hover:text-white"
      >
        Hide Debug
      </button>
    </div>

    <!-- Debug Toggle (Development only) -->
    <button
      v-if="isDevelopment && !showDebugInfo"
      @click="showDebugInfo = true"
      class="absolute bottom-2 left-2 bg-gray-600 text-white p-2 rounded-full z-10 opacity-50 hover:opacity-100"
      title="Show Debug Info"
    >
      <Icon name="mdi:bug" size="1rem" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CoordinateMetadata } from '~/shared/types/diagram-detection'
import { createCompatibilityManager, shouldUseCoordinateRendering } from '~/utils/cbtCompatibility'
import { EnhancedQuestionPanel, QuestionPanel } from '#components'

interface Props {
  isQuestionPalleteCollapsed: boolean
  cropperSectionsData: CropperSectionsData
  forceMode?: 'coordinate' | 'legacy' | 'auto'
  showModeIndicator?: boolean
  enableFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceMode: 'auto',
  showModeIndicator: false,
  enableFallback: true
})

// Composables
const { state: coordinateState, loadCoordinateData, getQuestionCoordinates } = useCbtCoordinateIntegration()
const { currentTestState } = useCbtTestData()

// Reactive state
const isLoading = ref(false)
const error = ref<string | null>(null)
const compatibilityWarning = ref<string | null>(null)
const showDebugInfo = ref(false)
const renderingError = ref<string | null>(null)

// Compatibility manager
const compatibilityManager = createCompatibilityManager({
  enableCoordinateRendering: true,
  fallbackToLegacy: props.enableFallback,
  preserveLegacyData: true,
  validateCompatibility: true
})

// Environment detection
const isDevelopment = computed(() => process.env.NODE_ENV === 'development')

// Current question tracking
const currentQuestionId = computed(() => currentTestState.value.queId)

// Coordinate data for current question
const coordinateData = computed(() => {
  if (!coordinateState.coordinateData.length) return []
  return coordinateState.coordinateData.filter(coord => 
    coord.questionId === currentQuestionId.value
  )
})

// Data availability checks
const hasCoordinateData = computed(() => coordinateData.value.length > 0)
const hasLegacyData = computed(() => {
  // Check if legacy image URLs exist for current question
  // This would need to be implemented based on your existing system
  return true // Placeholder
})

// Rendering mode determination
const currentMode = computed(() => {
  if (props.forceMode !== 'auto') {
    return props.forceMode
  }

  if (renderingError.value && props.enableFallback) {
    return 'legacy'
  }

  if (shouldUseCoordinateRendering(
    null, // question data not needed for this check
    coordinateData.value[0],
    { enableCoordinateRendering: coordinateState.enableCoordinateRendering }
  )) {
    return 'coordinate'
  }

  return 'legacy'
})

const shouldUseCoordinateRendering = computed(() => {
  return currentMode.value === 'coordinate' && hasCoordinateData.value
})

// UI state
const currentModeLabel = computed(() => {
  const labels = {
    coordinate: 'Enhanced Diagrams',
    legacy: 'Standard View',
    auto: 'Auto Mode'
  }
  return labels[currentMode.value] || 'Unknown'
})

const modeIndicatorClass = computed(() => {
  const classes = {
    coordinate: 'bg-green-100 text-green-800 border border-green-200',
    legacy: 'bg-blue-100 text-blue-800 border border-blue-200',
    auto: 'bg-gray-100 text-gray-800 border border-gray-200'
  }
  return classes[currentMode.value] || classes.auto
})

// Compatibility status
const compatibilityStatus = computed(() => {
  if (!hasCoordinateData.value && !hasLegacyData.value) {
    return 'no-data'
  }
  if (hasCoordinateData.value && hasLegacyData.value) {
    return 'compatible'
  }
  if (hasCoordinateData.value) {
    return 'coordinate-only'
  }
  return 'legacy-only'
})

// Rendering statistics
const renderingStats = computed(() => {
  if (!hasCoordinateData.value) return null
  
  const totalDiagrams = coordinateData.value.reduce(
    (sum, coord) => sum + coord.diagrams.length, 
    0
  )
  
  return {
    diagramCount: totalDiagrams,
    averageConfidence: coordinateData.value.reduce((sum, coord) => {
      const coordConfidence = coord.diagrams.reduce(
        (diagSum, diag) => diagSum + diag.confidence, 
        0
      ) / coord.diagrams.length
      return sum + (coordConfidence || 0)
    }, 0) / coordinateData.value.length
  }
})

// Methods
const retryLoad = async () => {
  error.value = null
  renderingError.value = null
  isLoading.value = true
  
  try {
    await loadCoordinateData()
  } catch (err) {
    error.value = 'Failed to load question data'
    console.error('Failed to retry load:', err)
  } finally {
    isLoading.value = false
  }
}

const handleRenderingError = (errorMessage: string) => {
  console.warn('Coordinate rendering error:', errorMessage)
  renderingError.value = errorMessage
  
  if (props.enableFallback) {
    compatibilityWarning.value = 'Switched to standard view due to rendering issue'
  }
}

const dismissWarning = () => {
  compatibilityWarning.value = null
}

// Compatibility checking
const checkCompatibility = () => {
  if (!hasCoordinateData.value) return

  const currentCoord = coordinateData.value[0]
  if (!currentCoord) return

  // Check for low confidence diagrams
  const lowConfidenceDiagrams = currentCoord.diagrams.filter(
    diagram => diagram.confidence < 0.5
  )

  if (lowConfidenceDiagrams.length > 0) {
    compatibilityWarning.value = `${lowConfidenceDiagrams.length} diagram(s) have low confidence`
  }

  // Check for coordinate validation issues
  for (const diagram of currentCoord.diagrams) {
    const coords = diagram.coordinates
    if (coords.x2 <= coords.x1 || coords.y2 <= coords.y1) {
      compatibilityWarning.value = 'Some diagrams have invalid coordinates'
      break
    }
  }
}

// Watchers
watch(currentQuestionId, async () => {
  // Reset state when question changes
  renderingError.value = null
  compatibilityWarning.value = null
  
  // Check compatibility for new question
  await nextTick()
  checkCompatibility()
})

watch(coordinateData, () => {
  checkCompatibility()
}, { deep: true })

// Lifecycle
onMounted(async () => {
  isLoading.value = true
  
  try {
    // Load coordinate data if not already loaded
    if (!coordinateState.coordinateData.length) {
      await loadCoordinateData()
    }
    
    // Initial compatibility check
    await nextTick()
    checkCompatibility()
  } catch (err) {
    error.value = 'Failed to initialize question panel'
    console.error('Failed to initialize adaptive question panel:', err)
  } finally {
    isLoading.value = false
  }
})

// Provide debug information for development
if (isDevelopment) {
  // Make debug info available globally for testing
  ;(window as any).__adaptiveQuestionPanelDebug = {
    currentMode,
    hasCoordinateData,
    hasLegacyData,
    compatibilityStatus,
    coordinateData,
    renderingStats
  }
}
</script>

<style scoped>
.adaptive-question-panel {
  @apply relative w-full h-full;
}

/* Smooth transitions between modes */
.adaptive-question-panel > * {
  @apply transition-opacity duration-300;
}

/* Debug panel styling */
.debug-panel {
  @apply font-mono text-xs;
}

/* Mode indicator animations */
.mode-indicator {
  @apply transition-all duration-200;
}

.mode-indicator:hover {
  @apply scale-105;
}

/* Compatibility warning styling */
.compatibility-warning {
  @apply animate-pulse;
}

/* Loading spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>