<template>
  <div
    class="absolute border-2 transition-all duration-200 cursor-pointer group"
    :class="overlayClasses"
    :style="overlayStyle"
    @click="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Resize handles (only visible when editing) -->
    <template v-if="isEditing">
      <div
        v-for="handle in resizeHandles"
        :key="handle.position"
        class="absolute w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-pointer opacity-80 hover:opacity-100"
        :class="handle.cursorClass"
        :style="handle.style"
        @mousedown.stop="startResize(handle.position, $event)"
      />
    </template>

    <!-- Diagram info overlay -->
    <div
      v-if="isHovered || isSelected"
      class="absolute -top-8 left-0 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10"
    >
      {{ diagram.type }} ({{ Math.round(diagram.confidence * 100) }}%)
    </div>

    <!-- Action buttons -->
    <div
      v-if="isHovered || isSelected"
      class="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <UiButton
        size="sm"
        variant="secondary"
        class="w-6 h-6 p-0"
        @click.stop="startEdit"
      >
        <Icon name="lucide:edit-2" class="w-3 h-3" />
      </UiButton>
      <UiButton
        size="sm"
        variant="destructive"
        class="w-6 h-6 p-0"
        @click.stop="handleDelete"
      >
        <Icon name="lucide:trash-2" class="w-3 h-3" />
      </UiButton>
    </div>

    <!-- Confidence indicator -->
    <div
      class="absolute bottom-0 left-0 h-1 bg-gradient-to-r transition-all"
      :class="confidenceBarClass"
      :style="{ width: `${diagram.confidence * 100}%` }"
    />
  </div>
</template>

<script setup lang="ts">
import type { DiagramCoordinates } from '~/shared/types/diagram-detection'

interface Props {
  diagram: DiagramCoordinates & { id: string; questionId: string }
  imageDimensions: { width: number; height: number }
  scale: number
  isSelected?: boolean
  isEditing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isEditing: false
})

const emit = defineEmits<{
  select: [diagramId: string]
  edit: [diagramId: string]
  delete: [diagramId: string]
  update: [diagramId: string, updates: Partial<DiagramCoordinates>]
}>()

// Reactive state
const isHovered = ref(false)
const isResizing = ref(false)
const resizeHandle = ref<string | null>(null)
const resizeStartCoords = ref({ x: 0, y: 0 })
const originalCoords = ref<DiagramCoordinates | null>(null)

// Computed properties
const overlayStyle = computed(() => ({
  left: `${props.diagram.x1 * props.scale}px`,
  top: `${props.diagram.y1 * props.scale}px`,
  width: `${(props.diagram.x2 - props.diagram.x1) * props.scale}px`,
  height: `${(props.diagram.y2 - props.diagram.y1) * props.scale}px`
}))

const overlayClasses = computed(() => [
  // Base classes
  'diagram-overlay',
  
  // State-based classes
  {
    'border-blue-500 bg-blue-100 bg-opacity-20': props.isSelected && !props.isEditing,
    'border-green-500 bg-green-100 bg-opacity-20': props.isEditing,
    'border-gray-400 bg-gray-100 bg-opacity-10': !props.isSelected && !props.isEditing,
    'border-dashed': props.isEditing,
    'shadow-lg': props.isSelected || isHovered.value,
    'ring-2 ring-blue-300 ring-opacity-50': props.isEditing
  },
  
  // Type-based classes
  getTypeClass(props.diagram.type)
])

const confidenceBarClass = computed(() => {
  const confidence = props.diagram.confidence
  if (confidence >= 0.8) return 'from-green-400 to-green-600'
  if (confidence >= 0.6) return 'from-yellow-400 to-yellow-600'
  return 'from-red-400 to-red-600'
})

const resizeHandles = computed(() => [
  {
    position: 'nw',
    style: { top: '-6px', left: '-6px' },
    cursorClass: 'cursor-nw-resize'
  },
  {
    position: 'ne',
    style: { top: '-6px', right: '-6px' },
    cursorClass: 'cursor-ne-resize'
  },
  {
    position: 'sw',
    style: { bottom: '-6px', left: '-6px' },
    cursorClass: 'cursor-sw-resize'
  },
  {
    position: 'se',
    style: { bottom: '-6px', right: '-6px' },
    cursorClass: 'cursor-se-resize'
  },
  {
    position: 'n',
    style: { top: '-6px', left: '50%', transform: 'translateX(-50%)' },
    cursorClass: 'cursor-n-resize'
  },
  {
    position: 's',
    style: { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' },
    cursorClass: 'cursor-s-resize'
  },
  {
    position: 'w',
    style: { top: '50%', left: '-6px', transform: 'translateY(-50%)' },
    cursorClass: 'cursor-w-resize'
  },
  {
    position: 'e',
    style: { top: '50%', right: '-6px', transform: 'translateY(-50%)' },
    cursorClass: 'cursor-e-resize'
  }
])

// Methods
const getTypeClass = (type: string) => {
  const typeClasses = {
    graph: 'border-blue-500',
    table: 'border-green-500',
    flowchart: 'border-purple-500',
    scientific: 'border-orange-500',
    geometric: 'border-pink-500',
    circuit: 'border-indigo-500',
    map: 'border-teal-500',
    other: 'border-gray-500'
  }
  return typeClasses[type as keyof typeof typeClasses] || typeClasses.other
}

const handleClick = () => {
  if (!props.isEditing) {
    emit('select', props.diagram.id)
  }
}

const startEdit = () => {
  emit('edit', props.diagram.id)
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this diagram?')) {
    emit('delete', props.diagram.id)
  }
}

const startResize = (handle: string, event: MouseEvent) => {
  if (!props.isEditing) return
  
  isResizing.value = true
  resizeHandle.value = handle
  resizeStartCoords.value = { x: event.clientX, y: event.clientY }
  originalCoords.value = { ...props.diagram }
  
  // Add global event listeners
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  
  event.preventDefault()
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value || !resizeHandle.value || !originalCoords.value) return
  
  const deltaX = (event.clientX - resizeStartCoords.value.x) / props.scale
  const deltaY = (event.clientY - resizeStartCoords.value.y) / props.scale
  
  const newCoords = { ...originalCoords.value }
  
  // Apply resize based on handle position
  switch (resizeHandle.value) {
    case 'nw':
      newCoords.x1 = Math.max(0, originalCoords.value.x1 + deltaX)
      newCoords.y1 = Math.max(0, originalCoords.value.y1 + deltaY)
      break
    case 'ne':
      newCoords.x2 = Math.min(props.imageDimensions.width, originalCoords.value.x2 + deltaX)
      newCoords.y1 = Math.max(0, originalCoords.value.y1 + deltaY)
      break
    case 'sw':
      newCoords.x1 = Math.max(0, originalCoords.value.x1 + deltaX)
      newCoords.y2 = Math.min(props.imageDimensions.height, originalCoords.value.y2 + deltaY)
      break
    case 'se':
      newCoords.x2 = Math.min(props.imageDimensions.width, originalCoords.value.x2 + deltaX)
      newCoords.y2 = Math.min(props.imageDimensions.height, originalCoords.value.y2 + deltaY)
      break
    case 'n':
      newCoords.y1 = Math.max(0, originalCoords.value.y1 + deltaY)
      break
    case 's':
      newCoords.y2 = Math.min(props.imageDimensions.height, originalCoords.value.y2 + deltaY)
      break
    case 'w':
      newCoords.x1 = Math.max(0, originalCoords.value.x1 + deltaX)
      break
    case 'e':
      newCoords.x2 = Math.min(props.imageDimensions.width, originalCoords.value.x2 + deltaX)
      break
  }
  
  // Ensure minimum size and proper ordering
  if (newCoords.x2 - newCoords.x1 < 20) {
    if (resizeHandle.value.includes('w')) {
      newCoords.x1 = newCoords.x2 - 20
    } else if (resizeHandle.value.includes('e')) {
      newCoords.x2 = newCoords.x1 + 20
    }
  }
  
  if (newCoords.y2 - newCoords.y1 < 20) {
    if (resizeHandle.value.includes('n')) {
      newCoords.y1 = newCoords.y2 - 20
    } else if (resizeHandle.value.includes('s')) {
      newCoords.y2 = newCoords.y1 + 20
    }
  }
  
  // Emit update
  emit('update', props.diagram.id, {
    x1: newCoords.x1,
    y1: newCoords.y1,
    x2: newCoords.x2,
    y2: newCoords.y2
  })
}

const stopResize = () => {
  isResizing.value = false
  resizeHandle.value = null
  originalCoords.value = null
  
  // Remove global event listeners
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// Cleanup on unmount
onUnmounted(() => {
  if (isResizing.value) {
    stopResize()
  }
})
</script>

<style scoped>
.diagram-overlay {
  min-width: 20px;
  min-height: 20px;
}

.diagram-overlay:hover {
  z-index: 10;
}

.diagram-overlay.border-dashed {
  border-style: dashed;
}
</style>