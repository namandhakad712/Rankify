<template>
  <div class="diagram-details-panel">
    <div class="flex items-center justify-between mb-4">
      <h4 class="font-semibold">Diagram Details</h4>
      <div class="flex gap-2">
        <UiButton
          v-if="!isEditing"
          size="sm"
          variant="outline"
          @click="startEditing"
        >
          <Icon name="lucide:edit-2" class="w-4 h-4 mr-1" />
          Edit
        </UiButton>
        <template v-else>
          <UiButton
            size="sm"
            variant="outline"
            @click="cancelEditing"
          >
            Cancel
          </UiButton>
          <UiButton
            size="sm"
            @click="saveChanges"
          >
            Save
          </UiButton>
        </template>
      </div>
    </div>

    <div class="space-y-4">
      <!-- Diagram Type -->
      <div>
        <UiLabel class="text-sm font-medium">Type</UiLabel>
        <UiSelect
          v-if="isEditing"
          v-model="editedDiagram.type"
          class="mt-1"
        >
          <UiSelectTrigger>
            <UiSelectValue />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem
              v-for="type in diagramTypes"
              :key="type.value"
              :value="type.value"
            >
              <div class="flex items-center gap-2">
                <Icon :name="type.icon" class="w-4 h-4" />
                {{ type.label }}
              </div>
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
        <div v-else class="mt-1 flex items-center gap-2">
          <Icon :name="getTypeIcon(diagram.type)" class="w-4 h-4" />
          <span class="capitalize">{{ diagram.type }}</span>
        </div>
      </div>

      <!-- Description -->
      <div>
        <UiLabel class="text-sm font-medium">Description</UiLabel>
        <UiTextarea
          v-if="isEditing"
          v-model="editedDiagram.description"
          class="mt-1"
          rows="3"
          placeholder="Describe what this diagram shows..."
        />
        <p v-else class="mt-1 text-sm text-muted-foreground">
          {{ diagram.description || 'No description provided' }}
        </p>
      </div>

      <!-- Confidence -->
      <div>
        <UiLabel class="text-sm font-medium">Confidence</UiLabel>
        <div class="mt-1 flex items-center gap-3">
          <UiSlider
            v-if="isEditing"
            v-model="editedDiagram.confidence"
            :min="0"
            :max="1"
            :step="0.01"
            class="flex-1"
          />
          <div v-else class="flex items-center gap-2">
            <UiProgress :value="diagram.confidence * 100" class="flex-1" />
          </div>
          <span class="text-sm font-mono min-w-[3rem]">
            {{ Math.round((isEditing ? editedDiagram.confidence : diagram.confidence) * 100) }}%
          </span>
        </div>
      </div>

      <!-- Coordinates -->
      <div>
        <UiLabel class="text-sm font-medium">Coordinates</UiLabel>
        <div class="mt-1 grid grid-cols-2 gap-2">
          <div>
            <UiLabel class="text-xs text-muted-foreground">Top-Left</UiLabel>
            <div class="flex gap-1">
              <UiInput
                v-if="isEditing"
                v-model.number="editedDiagram.x1"
                type="number"
                class="text-xs"
                :min="0"
                :max="imageDimensions.width"
              />
              <span v-else class="text-xs font-mono">{{ Math.round(diagram.x1) }}</span>
              <span class="text-xs text-muted-foreground">,</span>
              <UiInput
                v-if="isEditing"
                v-model.number="editedDiagram.y1"
                type="number"
                class="text-xs"
                :min="0"
                :max="imageDimensions.height"
              />
              <span v-else class="text-xs font-mono">{{ Math.round(diagram.y1) }}</span>
            </div>
          </div>
          <div>
            <UiLabel class="text-xs text-muted-foreground">Bottom-Right</UiLabel>
            <div class="flex gap-1">
              <UiInput
                v-if="isEditing"
                v-model.number="editedDiagram.x2"
                type="number"
                class="text-xs"
                :min="editedDiagram.x1 + 10"
                :max="imageDimensions.width"
              />
              <span v-else class="text-xs font-mono">{{ Math.round(diagram.x2) }}</span>
              <span class="text-xs text-muted-foreground">,</span>
              <UiInput
                v-if="isEditing"
                v-model.number="editedDiagram.y2"
                type="number"
                class="text-xs"
                :min="editedDiagram.y1 + 10"
                :max="imageDimensions.height"
              />
              <span v-else class="text-xs font-mono">{{ Math.round(diagram.y2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Dimensions -->
      <div>
        <UiLabel class="text-sm font-medium">Dimensions</UiLabel>
        <div class="mt-1 text-sm text-muted-foreground">
          {{ Math.round(width) }} × {{ Math.round(height) }} pixels
          <span class="text-xs">({{ aspectRatio }})</span>
        </div>
      </div>

      <!-- Quality Indicators -->
      <div>
        <UiLabel class="text-sm font-medium">Quality Indicators</UiLabel>
        <div class="mt-1 space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span>Size</span>
            <UiBadge :variant="sizeQuality.variant" class="text-xs">
              {{ sizeQuality.label }}
            </UiBadge>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>Aspect Ratio</span>
            <UiBadge :variant="aspectQuality.variant" class="text-xs">
              {{ aspectQuality.label }}
            </UiBadge>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>Position</span>
            <UiBadge :variant="positionQuality.variant" class="text-xs">
              {{ positionQuality.label }}
            </UiBadge>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!isEditing" class="pt-2 border-t">
        <div class="flex gap-2">
          <UiButton
            size="sm"
            variant="outline"
            class="flex-1"
            @click="duplicateDiagram"
          >
            <Icon name="lucide:copy" class="w-4 h-4 mr-1" />
            Duplicate
          </UiButton>
          <UiButton
            size="sm"
            variant="destructive"
            class="flex-1"
            @click="deleteDiagram"
          >
            <Icon name="lucide:trash-2" class="w-4 h-4 mr-1" />
            Delete
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiagramCoordinates, DiagramType } from '~/shared/types/diagram-detection'

interface Props {
  diagram: DiagramCoordinates & { id: string; questionId: string }
  isEditing?: boolean
  imageDimensions?: { width: number; height: number }
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  imageDimensions: () => ({ width: 800, height: 600 })
})

const emit = defineEmits<{
  update: [diagramId: string, updates: Partial<DiagramCoordinates>]
  'cancel-edit': []
  'save-edit': []
  duplicate: [diagramId: string]
  delete: [diagramId: string]
}>()

// Reactive state
const editedDiagram = ref<DiagramCoordinates>({ ...props.diagram })

// Diagram types configuration
const diagramTypes = [
  { value: 'graph', label: 'Graph', icon: 'lucide:trending-up' },
  { value: 'table', label: 'Table', icon: 'lucide:table' },
  { value: 'flowchart', label: 'Flowchart', icon: 'lucide:git-branch' },
  { value: 'scientific', label: 'Scientific', icon: 'lucide:microscope' },
  { value: 'geometric', label: 'Geometric', icon: 'lucide:shapes' },
  { value: 'circuit', label: 'Circuit', icon: 'lucide:zap' },
  { value: 'map', label: 'Map', icon: 'lucide:map' },
  { value: 'other', label: 'Other', icon: 'lucide:image' }
]

// Computed properties
const width = computed(() => 
  (props.isEditing ? editedDiagram.value.x2 - editedDiagram.value.x1 : props.diagram.x2 - props.diagram.x1)
)

const height = computed(() => 
  (props.isEditing ? editedDiagram.value.y2 - editedDiagram.value.y1 : props.diagram.y2 - props.diagram.y1)
)

const aspectRatio = computed(() => {
  const ratio = width.value / height.value
  return `${ratio.toFixed(2)}:1`
})

const sizeQuality = computed(() => {
  const area = width.value * height.value
  const imageArea = props.imageDimensions.width * props.imageDimensions.height
  const areaRatio = area / imageArea
  
  if (areaRatio > 0.5) return { variant: 'destructive', label: 'Too Large' }
  if (areaRatio < 0.01) return { variant: 'destructive', label: 'Too Small' }
  if (areaRatio < 0.05) return { variant: 'secondary', label: 'Small' }
  if (areaRatio > 0.3) return { variant: 'secondary', label: 'Large' }
  return { variant: 'default', label: 'Good' }
})

const aspectQuality = computed(() => {
  const ratio = width.value / height.value
  const currentDiagram = props.isEditing ? editedDiagram.value : props.diagram
  
  // Type-specific aspect ratio validation
  switch (currentDiagram.type) {
    case 'table':
      if (ratio < 1.2) return { variant: 'secondary', label: 'Too Square' }
      if (ratio > 5) return { variant: 'secondary', label: 'Too Wide' }
      return { variant: 'default', label: 'Good' }
    
    case 'geometric':
      if (Math.abs(ratio - 1) > 0.5) return { variant: 'secondary', label: 'Not Square' }
      return { variant: 'default', label: 'Good' }
    
    default:
      if (ratio < 0.3 || ratio > 4) return { variant: 'secondary', label: 'Unusual' }
      return { variant: 'default', label: 'Good' }
  }
})

const positionQuality = computed(() => {
  const currentDiagram = props.isEditing ? editedDiagram.value : props.diagram
  const centerX = (currentDiagram.x1 + currentDiagram.x2) / 2
  const centerY = (currentDiagram.y1 + currentDiagram.y2) / 2
  const imageCenterX = props.imageDimensions.width / 2
  const imageCenterY = props.imageDimensions.height / 2
  
  const distanceFromCenter = Math.sqrt(
    Math.pow(centerX - imageCenterX, 2) + Math.pow(centerY - imageCenterY, 2)
  )
  const maxDistance = Math.sqrt(
    Math.pow(imageCenterX, 2) + Math.pow(imageCenterY, 2)
  )
  const relativeDistance = distanceFromCenter / maxDistance
  
  if (relativeDistance > 0.8) return { variant: 'secondary', label: 'Edge' }
  if (relativeDistance < 0.2) return { variant: 'default', label: 'Centered' }
  return { variant: 'default', label: 'Good' }
})

// Methods
const getTypeIcon = (type: DiagramType) => {
  const typeConfig = diagramTypes.find(t => t.value === type)
  return typeConfig?.icon || 'lucide:image'
}

const startEditing = () => {
  editedDiagram.value = { ...props.diagram }
  // Note: The parent component should handle the isEditing state
}

const cancelEditing = () => {
  editedDiagram.value = { ...props.diagram }
  emit('cancel-edit')
}

const saveChanges = () => {
  // Validate coordinates
  if (editedDiagram.value.x2 <= editedDiagram.value.x1) {
    editedDiagram.value.x2 = editedDiagram.value.x1 + 20
  }
  if (editedDiagram.value.y2 <= editedDiagram.value.y1) {
    editedDiagram.value.y2 = editedDiagram.value.y1 + 20
  }
  
  // Clamp to image boundaries
  editedDiagram.value.x1 = Math.max(0, Math.min(editedDiagram.value.x1, props.imageDimensions.width - 20))
  editedDiagram.value.y1 = Math.max(0, Math.min(editedDiagram.value.y1, props.imageDimensions.height - 20))
  editedDiagram.value.x2 = Math.max(editedDiagram.value.x1 + 20, Math.min(editedDiagram.value.x2, props.imageDimensions.width))
  editedDiagram.value.y2 = Math.max(editedDiagram.value.y1 + 20, Math.min(editedDiagram.value.y2, props.imageDimensions.height))
  
  // Clamp confidence
  editedDiagram.value.confidence = Math.max(0, Math.min(1, editedDiagram.value.confidence))
  
  emit('update', props.diagram.id, editedDiagram.value)
  emit('save-edit')
}

const duplicateDiagram = () => {
  emit('duplicate', props.diagram.id)
}

const deleteDiagram = () => {
  if (confirm('Are you sure you want to delete this diagram?')) {
    emit('delete', props.diagram.id)
  }
}

// Watch for prop changes to update edited diagram
watch(() => props.diagram, (newDiagram) => {
  if (!props.isEditing) {
    editedDiagram.value = { ...newDiagram }
  }
}, { deep: true })

// Watch for coordinate changes during editing
watch(() => [editedDiagram.value.x1, editedDiagram.value.y1, editedDiagram.value.x2, editedDiagram.value.y2], () => {
  if (props.isEditing) {
    emit('update', props.diagram.id, {
      x1: editedDiagram.value.x1,
      y1: editedDiagram.value.y1,
      x2: editedDiagram.value.x2,
      y2: editedDiagram.value.y2
    })
  }
}, { deep: true })
</script>

<style scoped>
.diagram-details-panel {
  max-height: 600px;
  overflow-y: auto;
}
</style>