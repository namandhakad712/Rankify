<template>
  <div class="simple-coordinate-editor">
    <div class="editor-header">
      <h4>Edit Coordinates</h4>
      <div class="coordinate-info">
        {{ Math.round(coordinates.x1) }}, {{ Math.round(coordinates.y1) }} → 
        {{ Math.round(coordinates.x2) }}, {{ Math.round(coordinates.y2) }}
        ({{ Math.round(coordinates.x2 - coordinates.x1) }} × {{ Math.round(coordinates.y2 - coordinates.y1) }})
      </div>
    </div>

    <div class="coordinate-inputs">
      <div class="input-row">
        <div class="input-group">
          <label>X1:</label>
          <input
            type="number"
            v-model.number="localCoordinates.x1"
            @input="updateCoordinates"
            :min="0"
            :max="imageWidth - minSize"
            step="1"
          />
        </div>
        <div class="input-group">
          <label>Y1:</label>
          <input
            type="number"
            v-model.number="localCoordinates.y1"
            @input="updateCoordinates"
            :min="0"
            :max="imageHeight - minSize"
            step="1"
          />
        </div>
      </div>

      <div class="input-row">
        <div class="input-group">
          <label>X2:</label>
          <input
            type="number"
            v-model.number="localCoordinates.x2"
            @input="updateCoordinates"
            :min="localCoordinates.x1 + minSize"
            :max="imageWidth"
            step="1"
          />
        </div>
        <div class="input-group">
          <label>Y2:</label>
          <input
            type="number"
            v-model.number="localCoordinates.y2"
            @input="updateCoordinates"
            :min="localCoordinates.y1 + minSize"
            :max="imageHeight"
            step="1"
          />
        </div>
      </div>
    </div>

    <div class="metadata-inputs" v-if="showMetadata">
      <div class="input-group">
        <label>Type:</label>
        <select v-model="localCoordinates.type" @change="updateCoordinates">
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
      <div class="input-group">
        <label>Description:</label>
        <input
          type="text"
          v-model="localCoordinates.description"
          @input="updateCoordinates"
          placeholder="Brief description"
          maxlength="100"
        />
      </div>
    </div>

    <div class="validation-messages" v-if="validationErrors.length > 0">
      <div class="error" v-for="error in validationErrors" :key="error">
        {{ error }}
      </div>
    </div>

    <div class="editor-actions" v-if="showActions">
      <button @click="resetToOriginal" class="btn btn-secondary">
        Reset
      </button>
      <button @click="$emit('cancel')" class="btn btn-secondary">
        Cancel
      </button>
      <button 
        @click="saveChanges" 
        class="btn btn-primary"
        :disabled="!isValid"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { DiagramCoordinates } from '~/shared/types/diagram-detection'

interface Props {
  coordinates: DiagramCoordinates
  imageWidth: number
  imageHeight: number
  minSize?: number
  showMetadata?: boolean
  showActions?: boolean
  autoValidate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  minSize: 10,
  showMetadata: true,
  showActions: true,
  autoValidate: true
})

const emit = defineEmits<{
  update: [coordinates: DiagramCoordinates]
  save: [coordinates: DiagramCoordinates]
  cancel: []
  validate: [isValid: boolean, errors: string[]]
}>()

// Local state
const localCoordinates = ref<DiagramCoordinates>({ ...props.coordinates })
const originalCoordinates = ref<DiagramCoordinates>({ ...props.coordinates })
const validationErrors = ref<string[]>([])

// Computed properties
const isValid = computed(() => validationErrors.value.length === 0)

// Watch for external coordinate changes
watch(() => props.coordinates, (newCoords) => {
  localCoordinates.value = { ...newCoords }
  originalCoordinates.value = { ...newCoords }
}, { deep: true })

// Watch for local changes and validate
watch(localCoordinates, () => {
  if (props.autoValidate) {
    validateCoordinates()
  }
}, { deep: true })

onMounted(() => {
  validateCoordinates()
})

// Methods
function updateCoordinates() {
  // Ensure coordinate constraints
  constrainCoordinates()
  
  // Validate
  if (props.autoValidate) {
    validateCoordinates()
  }
  
  // Emit update
  emit('update', { ...localCoordinates.value })
}

function constrainCoordinates() {
  const coords = localCoordinates.value
  
  // Ensure bounds
  coords.x1 = Math.max(0, Math.min(props.imageWidth - props.minSize, coords.x1))
  coords.y1 = Math.max(0, Math.min(props.imageHeight - props.minSize, coords.y1))
  coords.x2 = Math.min(props.imageWidth, Math.max(coords.x1 + props.minSize, coords.x2))
  coords.y2 = Math.min(props.imageHeight, Math.max(coords.y1 + props.minSize, coords.y2))
  
  // Ensure minimum size
  if (coords.x2 - coords.x1 < props.minSize) {
    coords.x2 = coords.x1 + props.minSize
  }
  if (coords.y2 - coords.y1 < props.minSize) {
    coords.y2 = coords.y1 + props.minSize
  }
}

function validateCoordinates() {
  const coords = localCoordinates.value
  const errors: string[] = []
  
  // Check bounds
  if (coords.x1 < 0) errors.push('X1 cannot be negative')
  if (coords.y1 < 0) errors.push('Y1 cannot be negative')
  if (coords.x2 > props.imageWidth) errors.push('X2 exceeds image width')
  if (coords.y2 > props.imageHeight) errors.push('Y2 exceeds image height')
  
  // Check order
  if (coords.x2 <= coords.x1) errors.push('X2 must be greater than X1')
  if (coords.y2 <= coords.y1) errors.push('Y2 must be greater than Y1')
  
  // Check minimum size
  if (coords.x2 - coords.x1 < props.minSize) {
    errors.push(`Width must be at least ${props.minSize} pixels`)
  }
  if (coords.y2 - coords.y1 < props.minSize) {
    errors.push(`Height must be at least ${props.minSize} pixels`)
  }
  
  validationErrors.value = errors
  emit('validate', errors.length === 0, errors)
}

function resetToOriginal() {
  localCoordinates.value = { ...originalCoordinates.value }
  updateCoordinates()
}

function saveChanges() {
  if (isValid.value) {
    emit('save', { ...localCoordinates.value })
  }
}

// Utility methods for external use
function setCoordinates(coords: DiagramCoordinates) {
  localCoordinates.value = { ...coords }
  updateCoordinates()
}

function getCoordinates(): DiagramCoordinates {
  return { ...localCoordinates.value }
}

function isValidCoordinates(): boolean {
  return isValid.value
}

// Expose methods for parent components
defineExpose({
  setCoordinates,
  getCoordinates,
  isValidCoordinates,
  validateCoordinates,
  resetToOriginal
})
</script>

<style scoped>
.simple-coordinate-editor {
  @apply bg-white border border-gray-200 rounded-lg p-4 space-y-4;
}

.editor-header {
  @apply flex justify-between items-center pb-2 border-b border-gray-200;
}

.editor-header h4 {
  @apply text-lg font-medium text-gray-900;
}

.coordinate-info {
  @apply text-sm text-gray-600 font-mono;
}

.coordinate-inputs {
  @apply space-y-3;
}

.input-row {
  @apply grid grid-cols-2 gap-4;
}

.input-group {
  @apply flex flex-col;
}

.input-group label {
  @apply text-sm font-medium text-gray-700 mb-1;
}

.input-group input,
.input-group select {
  @apply px-3 py-2 border border-gray-300 rounded-md text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.metadata-inputs {
  @apply grid grid-cols-1 gap-3 pt-2 border-t border-gray-200;
}

.validation-messages {
  @apply space-y-1;
}

.error {
  @apply text-sm text-red-600 bg-red-50 px-2 py-1 rounded;
}

.editor-actions {
  @apply flex justify-end gap-2 pt-2 border-t border-gray-200;
}

.btn {
  @apply px-3 py-2 text-sm font-medium rounded-md transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
}
</style>