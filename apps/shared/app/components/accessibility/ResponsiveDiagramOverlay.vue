<template>
  <div
    ref="overlayRef"
    class="responsive-diagram-overlay"
    :class="overlayClasses"
    :style="overlayStyles"
    :tabindex="isAccessible ? 0 : -1"
    :role="isAccessible ? 'img' : undefined"
    :aria-label="accessibleLabel"
    :aria-describedby="isAccessible ? `diagram-${coordinates.id}-desc` : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
    @focus="handleFocus"
    @blur="handleBlur"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Diagram Controls -->
    <div
      v-if="showControls"
      class="diagram-controls"
      :class="{ 'mobile-controls': isMobile }"
    >
      <button
        v-if="editable"
        @click.stop="$emit('edit', coordinates)"
        class="control-button edit-button"
        :aria-label="`Edit ${diagramType} diagram`"
      >
        <span class="control-icon">✏️</span>
        <span v-if="!isMobile" class="control-text">Edit</span>
      </button>
      
      <button
        v-if="deletable"
        @click.stop="$emit('delete', coordinates)"
        class="control-button delete-button"
        :aria-label="`Delete ${diagramType} diagram`"
      >
        <span class="control-icon">🗑️</span>
        <span v-if="!isMobile" class="control-text">Delete</span>
      </button>
      
      <button
        v-if="zoomable"
        @click.stop="$emit('zoom', coordinates)"
        class="control-button zoom-button"
        :aria-label="`Zoom ${diagramType} diagram`"
      >
        <span class="control-icon">🔍</span>
        <span v-if="!isMobile" class="control-text">Zoom</span>
      </button>
    </div>

    <!-- Diagram Type Indicator -->
    <div
      v-if="showTypeIndicator"
      class="diagram-type-indicator"
      :class="`type-${diagramType}`"
    >
      {{ diagramType.toUpperCase() }}
    </div>

    <!-- Confidence Indicator -->
    <div
      v-if="showConfidence && coordinates.confidence"
      class="confidence-indicator"
      :class="confidenceClass"
      :title="`Confidence: ${Math.round(coordinates.confidence * 100)}%`"
    >
      <div
        class="confidence-bar"
        :style="{ width: `${coordinates.confidence * 100}%` }"
      ></div>
    </div>

    <!-- Screen Reader Description -->
    <div
      v-if="isAccessible"
      :id="`diagram-${coordinates.id}-desc`"
      class="sr-only"
    >
      {{ detailedDescription }}
    </div>

    <!-- Touch Feedback -->
    <div
      v-if="showTouchFeedback"
      class="touch-feedback"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { responsiveDesignManager } from '~/utils/accessibility/responsiveDesign'
import type { DiagramCoordinates } from '~/types/diagram'

// Props
interface Props {
  coordinates: DiagramCoordinates
  pageWidth: number
  pageHeight: number
  containerWidth?: number
  containerHeight?: number
  editable?: boolean
  deletable?: boolean
  zoomable?: boolean
  showControls?: boolean
  showTypeIndicator?: boolean
  showConfidence?: boolean
  isAccessible?: boolean
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  containerWidth: 800,
  containerHeight: 600,
  editable: true,
  deletable: true,
  zoomable: true,
  showControls: true,
  showTypeIndicator: true,
  showConfidence: true,
  isAccessible: true,
  description: ''
})

// Emits
const emit = defineEmits<{
  click: [coordinates: DiagramCoordinates]
  edit: [coordinates: DiagramCoordinates]
  delete: [coordinates: DiagramCoordinates]
  zoom: [coordinates: DiagramCoordinates]
  focus: [coordinates: DiagramCoordinates]
  blur: [coordinates: DiagramCoordinates]
  activate: [coordinates: DiagramCoordinates]
}>()

// Reactive state
const overlayRef = ref<HTMLElement>()
const isFocused = ref(false)
const isPressed = ref(false)
const showTouchFeedback = ref(false)
const touchStartTime = ref(0)

// Computed properties
const isMobile = computed(() => responsiveDesignManager.isMobile())
const isTablet = computed(() => responsiveDesignManager.isTablet())
const currentBreakpoint = computed(() => responsiveDesignManager.getCurrentBreakpoint())

const diagramType = computed(() => props.coordinates.type || 'diagram')

const accessibleLabel = computed(() => {
  if (props.description) {
    return `${diagramType.value}: ${props.description}`
  }
  return `${diagramType.value} diagram with ${Math.round((props.coordinates.confidence || 0) * 100)}% confidence`
})

const detailedDescription = computed(() => {
  const type = diagramType.value
  const confidence = Math.round((props.coordinates.confidence || 0) * 100)
  const position = `located at coordinates ${props.coordinates.x1}, ${props.coordinates.y1} to ${props.coordinates.x2}, ${props.coordinates.y2}`
  const description = props.description || props.coordinates.description || 'No description available'
  
  return `${type} diagram: ${description}. Confidence: ${confidence}%. Position: ${position}. Press Enter or Space to interact with this diagram.`
})

const confidenceClass = computed(() => {
  const confidence = props.coordinates.confidence || 0
  if (confidence >= 0.8) return 'confidence-high'
  if (confidence >= 0.6) return 'confidence-medium'
  return 'confidence-low'
})

const overlayClasses = computed(() => ({
  'focused': isFocused.value,
  'pressed': isPressed.value,
  'mobile': isMobile.value,
  'tablet': isTablet.value,
  'desktop': !isMobile.value && !isTablet.value,
  'editable': props.editable,
  'high-confidence': (props.coordinates.confidence || 0) >= 0.8,
  'medium-confidence': (props.coordinates.confidence || 0) >= 0.6 && (props.coordinates.confidence || 0) < 0.8,
  'low-confidence': (props.coordinates.confidence || 0) < 0.6,
  [`type-${diagramType.value}`]: true,
  [`bp-${currentBreakpoint.value.name}`]: true
}))

const overlayStyles = computed(() => {
  // Calculate responsive position and size
  const scaleX = (props.containerWidth || props.pageWidth) / props.pageWidth
  const scaleY = (props.containerHeight || props.pageHeight) / props.pageHeight
  const scale = Math.min(scaleX, scaleY)

  const left = props.coordinates.x1 * scale
  const top = props.coordinates.y1 * scale
  const width = (props.coordinates.x2 - props.coordinates.x1) * scale
  const height = (props.coordinates.y2 - props.coordinates.y1) * scale

  // Ensure minimum touch target size on mobile
  const minSize = isMobile.value ? 44 : 24
  const adjustedWidth = Math.max(width, minSize)
  const adjustedHeight = Math.max(height, minSize)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${adjustedWidth}px`,
    height: `${adjustedHeight}px`,
    '--scale-factor': scale.toString(),
    '--original-width': `${props.coordinates.x2 - props.coordinates.x1}px`,
    '--original-height': `${props.coordinates.y2 - props.coordinates.y1}px`
  }
})

// Methods
const handleClick = (event: MouseEvent) => {
  event.preventDefault()
  emit('click', props.coordinates)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('activate', props.coordinates)
  } else if (event.key === 'Delete' && props.deletable) {
    event.preventDefault()
    emit('delete', props.coordinates)
  } else if (event.key === 'e' && props.editable) {
    event.preventDefault()
    emit('edit', props.coordinates)
  } else if (event.key === 'z' && props.zoomable) {
    event.preventDefault()
    emit('zoom', props.coordinates)
  }
}

const handleFocus = () => {
  isFocused.value = true
  emit('focus', props.coordinates)
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur', props.coordinates)
}

const handleTouchStart = (event: TouchEvent) => {
  touchStartTime.value = Date.now()
  isPressed.value = true
  showTouchFeedback.value = true
  
  // Prevent default to avoid mouse events
  event.preventDefault()
}

const handleTouchEnd = (event: TouchEvent) => {
  const touchDuration = Date.now() - touchStartTime.value
  isPressed.value = false
  
  // Hide touch feedback after delay
  setTimeout(() => {
    showTouchFeedback.value = false
  }, 150)
  
  // Handle tap vs long press
  if (touchDuration < 500) {
    // Short tap - activate
    emit('activate', props.coordinates)
  } else {
    // Long press - show context menu or edit
    if (props.editable) {
      emit('edit', props.coordinates)
    }
  }
  
  event.preventDefault()
}

// Lifecycle hooks
onMounted(() => {
  // Set up resize observer for responsive updates
  if (overlayRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      // Trigger reactive updates when container resizes
      // The computed properties will automatically recalculate
    })
    
    const container = overlayRef.value.closest('.diagram-container')
    if (container) {
      resizeObserver.observe(container)
    }
    
    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }
})
</script>

<style scoped>
.responsive-diagram-overlay {
  position: absolute;
  border: 2px solid var(--diagram-overlay-border, #cccccc);
  background-color: var(--diagram-overlay-bg, rgba(0, 0, 0, 0.1));
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.responsive-diagram-overlay:hover {
  border-color: var(--focus-color, #0066cc);
  background-color: var(--diagram-overlay-bg, rgba(0, 100, 204, 0.1));
  transform: scale(1.02);
}

.responsive-diagram-overlay:focus,
.responsive-diagram-overlay.focused {
  border-color: var(--focus-color, #0066cc);
  background-color: var(--diagram-overlay-bg, rgba(0, 100, 204, 0.2));
  box-shadow: 0 0 0 2px var(--focus-color, #0066cc);
  outline: none;
  z-index: 10;
}

.responsive-diagram-overlay.pressed {
  transform: scale(0.98);
  background-color: var(--diagram-overlay-bg, rgba(0, 100, 204, 0.3));
}

/* Mobile-specific styles */
.responsive-diagram-overlay.mobile {
  min-width: 44px;
  min-height: 44px;
  border-width: 3px;
}

.responsive-diagram-overlay.mobile:hover {
  transform: none; /* Disable hover transform on mobile */
}

/* Tablet-specific styles */
.responsive-diagram-overlay.tablet {
  min-width: 36px;
  min-height: 36px;
}

/* Desktop-specific styles */
.responsive-diagram-overlay.desktop {
  min-width: 24px;
  min-height: 24px;
}

/* Diagram Controls */
.diagram-controls {
  position: absolute;
  top: -40px;
  right: 0;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 11;
}

.responsive-diagram-overlay:hover .diagram-controls,
.responsive-diagram-overlay:focus .diagram-controls,
.responsive-diagram-overlay.focused .diagram-controls {
  opacity: 1;
}

.diagram-controls.mobile-controls {
  top: -50px;
  gap: 8px;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #000000);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-button:hover,
.control-button:focus {
  background: var(--focus-color, #0066cc);
  color: white;
  border-color: var(--focus-color, #0066cc);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.mobile-controls .control-button {
  min-width: 44px;
  min-height: 44px;
  padding: 10px;
  font-size: 14px;
}

.control-icon {
  font-size: 14px;
}

.mobile-controls .control-icon {
  font-size: 18px;
}

.control-text {
  font-size: 11px;
  font-weight: 500;
}

/* Button-specific styles */
.edit-button:hover,
.edit-button:focus {
  background: #4caf50;
  border-color: #4caf50;
}

.delete-button:hover,
.delete-button:focus {
  background: #f44336;
  border-color: #f44336;
}

.zoom-button:hover,
.zoom-button:focus {
  background: #ff9800;
  border-color: #ff9800;
}

/* Diagram Type Indicator */
.diagram-type-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 3px;
  pointer-events: none;
  z-index: 12;
}

.mobile .diagram-type-indicator {
  font-size: 12px;
  padding: 4px 8px;
}

/* Type-specific colors */
.type-graph .diagram-type-indicator {
  background: rgba(76, 175, 80, 0.9);
}

.type-flowchart .diagram-type-indicator {
  background: rgba(33, 150, 243, 0.9);
}

.type-scientific .diagram-type-indicator {
  background: rgba(156, 39, 176, 0.9);
}

.type-geometric .diagram-type-indicator {
  background: rgba(255, 152, 0, 0.9);
}

.type-table .diagram-type-indicator {
  background: rgba(96, 125, 139, 0.9);
}

.type-circuit .diagram-type-indicator {
  background: rgba(244, 67, 54, 0.9);
}

/* Confidence Indicator */
.confidence-indicator {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
  pointer-events: none;
  z-index: 12;
}

.confidence-bar {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.confidence-medium .confidence-bar {
  background: #ff9800;
}

.confidence-low .confidence-bar {
  background: #f44336;
}

/* Touch Feedback */
.touch-feedback {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: var(--focus-color, #0066cc);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0.6;
  pointer-events: none;
  animation: touch-ripple 0.3s ease-out;
  z-index: 13;
}

@keyframes touch-ripple {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* Confidence-based styling */
.high-confidence {
  border-color: #4caf50;
}

.medium-confidence {
  border-color: #ff9800;
}

.low-confidence {
  border-color: #f44336;
  border-style: dashed;
}

/* Breakpoint-specific adjustments */
.bp-xs .diagram-controls {
  top: -60px;
  flex-direction: column;
  align-items: flex-end;
}

.bp-sm .diagram-controls {
  top: -50px;
}

/* High contrast mode */
.high-contrast .responsive-diagram-overlay {
  border-width: 3px;
  border-color: #ffffff;
  background-color: rgba(255, 255, 255, 0.2);
}

.high-contrast .control-button {
  background: #000000;
  color: #ffffff;
  border-color: #ffffff;
  border-width: 2px;
}

.high-contrast .control-button:hover,
.high-contrast .control-button:focus {
  background: #ffffff;
  color: #000000;
}

/* Reduced motion */
.reduce-motion .responsive-diagram-overlay {
  transition: none;
}

.reduce-motion .responsive-diagram-overlay:hover {
  transform: none;
}

.reduce-motion .control-button {
  transition: none;
}

.reduce-motion .control-button:hover {
  transform: none;
}

.reduce-motion .touch-feedback {
  animation: none;
}

/* Print styles */
@media print {
  .diagram-controls {
    display: none !important;
  }
  
  .responsive-diagram-overlay {
    border: 2px solid #000000 !important;
    background: transparent !important;
  }
  
  .diagram-type-indicator,
  .confidence-indicator {
    display: none !important;
  }
}
</style>