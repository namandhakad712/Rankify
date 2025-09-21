<template>
  <div class="coordinate-input-panel p-4 border rounded-lg">
    <h5 class="font-medium mb-3">Coordinate Input</h5>
    
    <!-- Coordinate mode selector -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Input Mode</UiLabel>
      <UiTabs v-model="inputMode" class="w-full">
        <UiTabsList class="grid w-full grid-cols-3">
          <UiTabsTrigger value="corners">Corners</UiTabsTrigger>
          <UiTabsTrigger value="center">Center</UiTabsTrigger>
          <UiTabsTrigger value="dimensions">Size</UiTabsTrigger>
        </UiTabsList>
      </UiTabs>
    </div>

    <!-- Corner-based input -->
    <div v-if="inputMode === 'corners'" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <UiLabel class="text-xs text-muted-foreground">Top-Left</UiLabel>
          <div class="flex gap-1">
            <UiInput
              v-model.number="cornerCoords.x1"
              type="number"
              placeholder="X"
              class="text-sm"
              :min="0"
              :max="imageDimensions.width"
              @input="updateFromCorners"
            />
            <UiInput
              v-model.number="cornerCoords.y1"
              type="number"
              placeholder="Y"
              class="text-sm"
              :min="0"
              :max="imageDimensions.height"
              @input="updateFromCorners"
            />
          </div>
        </div>
        <div>
          <UiLabel class="text-xs text-muted-foreground">Bottom-Right</UiLabel>
          <div class="flex gap-1">
            <UiInput
              v-model.number="cornerCoords.x2"
              type="number"
              placeholder="X"
              class="text-sm"
              :min="cornerCoords.x1 + 1"
              :max="imageDimensions.width"
              @input="updateFromCorners"
            />
            <UiInput
              v-model.number="cornerCoords.y2"
              type="number"
              placeholder="Y"
              class="text-sm"
              :min="cornerCoords.y1 + 1"
              :max="imageDimensions.height"
              @input="updateFromCorners"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Center-based input -->
    <div v-else-if="inputMode === 'center'" class="space-y-3">
      <div>
        <UiLabel class="text-xs text-muted-foreground">Center Point</UiLabel>
        <div class="flex gap-1">
          <UiInput
            v-model.number="centerCoords.centerX"
            type="number"
            placeholder="Center X"
            class="text-sm"
            @input="updateFromCenter"
          />
          <UiInput
            v-model.number="centerCoords.centerY"
            type="number"
            placeholder="Center Y"
            class="text-sm"
            @input="updateFromCenter"
          />
        </div>
      </div>
      <div>
        <UiLabel class="text-xs text-muted-foreground">Dimensions</UiLabel>
        <div class="flex gap-1">
          <UiInput
            v-model.number="centerCoords.width"
            type="number"
            placeholder="Width"
            class="text-sm"
            :min="10"
            @input="updateFromCenter"
          />
          <UiInput
            v-model.number="centerCoords.height"
            type="number"
            placeholder="Height"
            class="text-sm"
            :min="10"
            @input="updateFromCenter"
          />
        </div>
      </div>
    </div>

    <!-- Dimension-based input -->
    <div v-else-if="inputMode === 'dimensions'" class="space-y-3">
      <div>
        <UiLabel class="text-xs text-muted-foreground">Position</UiLabel>
        <div class="flex gap-1">
          <UiInput
            v-model.number="dimensionCoords.x"
            type="number"
            placeholder="Left"
            class="text-sm"
            :min="0"
            :max="imageDimensions.width - dimensionCoords.width"
            @input="updateFromDimensions"
          />
          <UiInput
            v-model.number="dimensionCoords.y"
            type="number"
            placeholder="Top"
            class="text-sm"
            :min="0"
            :max="imageDimensions.height - dimensionCoords.height"
            @input="updateFromDimensions"
          />
        </div>
      </div>
      <div>
        <UiLabel class="text-xs text-muted-foreground">Size</UiLabel>
        <div class="flex gap-1">
          <UiInput
            v-model.number="dimensionCoords.width"
            type="number"
            placeholder="Width"
            class="text-sm"
            :min="10"
            :max="imageDimensions.width - dimensionCoords.x"
            @input="updateFromDimensions"
          />
          <UiInput
            v-model.number="dimensionCoords.height"
            type="number"
            placeholder="Height"
            class="text-sm"
            :min="10"
            :max="imageDimensions.height - dimensionCoords.y"
            @input="updateFromDimensions"
          />
        </div>
      </div>
    </div>

    <!-- Quick presets -->
    <div class="mt-4">
      <UiLabel class="text-sm font-medium mb-2 block">Quick Presets</UiLabel>
      <div class="grid grid-cols-2 gap-2">
        <UiButton
          size="sm"
          variant="outline"
          @click="applyPreset('center')"
        >
          Center
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="applyPreset('fullWidth')"
        >
          Full Width
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="applyPreset('square')"
        >
          Square
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="applyPreset('golden')"
        >
          Golden Ratio
        </UiButton>
      </div>
    </div>

    <!-- Validation messages -->
    <div v-if="validationErrors.length > 0" class="mt-3">
      <div class="text-sm text-red-600 space-y-1">
        <div
          v-for="error in validationErrors"
          :key="error"
          class="flex items-center gap-2"
        >
          <Icon name="lucide:alert-circle" class="w-3 h-3" />
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Current values display -->
    <div class="mt-4 text-xs text-muted-foreground space-y-1">
      <div>Current: ({{ Math.round(coordinates.x1) }}, {{ Math.round(coordinates.y1) }}) → ({{ Math.round(coordinates.x2) }}, {{ Math.round(coordinates.y2) }})</div>
      <div>Size: {{ Math.round(coordinates.x2 - coordinates.x1) }} × {{ Math.round(coordinates.y2 - coordinates.y1) }}px</div>
      <div>Area: {{ Math.round((coordinates.x2 - coordinates.x1) * (coordinates.y2 - coordinates.y1)).toLocaleString() }}px²</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiagramCoordinates } from '~/shared/types/diagram-detection'

interface Props {
  coordinates: DiagramCoordinates
  imageDimensions: { width: number; height: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [coordinates: Partial<DiagramCoordinates>]
}>()

// Reactive state
const inputMode = ref<'corners' | 'center' | 'dimensions'>('corners')
const validationErrors = ref<string[]>([])

// Coordinate representations
const cornerCoords = ref({
  x1: props.coordinates.x1,
  y1: props.coordinates.y1,
  x2: props.coordinates.x2,
  y2: props.coordinates.y2
})

const centerCoords = ref({
  centerX: (props.coordinates.x1 + props.coordinates.x2) / 2,
  centerY: (props.coordinates.y1 + props.coordinates.y2) / 2,
  width: props.coordinates.x2 - props.coordinates.x1,
  height: props.coordinates.y2 - props.coordinates.y1
})

const dimensionCoords = ref({
  x: props.coordinates.x1,
  y: props.coordinates.y1,
  width: props.coordinates.x2 - props.coordinates.x1,
  height: props.coordinates.y2 - props.coordinates.y1
})

// Methods
const updateFromCorners = () => {
  const errors = validateCornerCoords()
  if (errors.length === 0) {
    emit('update', {
      x1: cornerCoords.value.x1,
      y1: cornerCoords.value.y1,
      x2: cornerCoords.value.x2,
      y2: cornerCoords.value.y2
    })
    syncOtherModes()
  }
  validationErrors.value = errors
}

const updateFromCenter = () => {
  const errors = validateCenterCoords()
  if (errors.length === 0) {
    const halfWidth = centerCoords.value.width / 2
    const halfHeight = centerCoords.value.height / 2
    
    emit('update', {
      x1: centerCoords.value.centerX - halfWidth,
      y1: centerCoords.value.centerY - halfHeight,
      x2: centerCoords.value.centerX + halfWidth,
      y2: centerCoords.value.centerY + halfHeight
    })
    syncOtherModes()
  }
  validationErrors.value = errors
}

const updateFromDimensions = () => {
  const errors = validateDimensionCoords()
  if (errors.length === 0) {
    emit('update', {
      x1: dimensionCoords.value.x,
      y1: dimensionCoords.value.y,
      x2: dimensionCoords.value.x + dimensionCoords.value.width,
      y2: dimensionCoords.value.y + dimensionCoords.value.height
    })
    syncOtherModes()
  }
  validationErrors.value = errors
}

const validateCornerCoords = (): string[] => {
  const errors: string[] = []
  const coords = cornerCoords.value
  
  if (coords.x2 <= coords.x1) errors.push('Right edge must be greater than left edge')
  if (coords.y2 <= coords.y1) errors.push('Bottom edge must be greater than top edge')
  if (coords.x1 < 0 || coords.x2 > props.imageDimensions.width) errors.push('X coordinates out of bounds')
  if (coords.y1 < 0 || coords.y2 > props.imageDimensions.height) errors.push('Y coordinates out of bounds')
  if (coords.x2 - coords.x1 < 10) errors.push('Width must be at least 10px')
  if (coords.y2 - coords.y1 < 10) errors.push('Height must be at least 10px')
  
  return errors
}

const validateCenterCoords = (): string[] => {
  const errors: string[] = []
  const coords = centerCoords.value
  const halfWidth = coords.width / 2
  const halfHeight = coords.height / 2
  
  if (coords.width < 10) errors.push('Width must be at least 10px')
  if (coords.height < 10) errors.push('Height must be at least 10px')
  if (coords.centerX - halfWidth < 0) errors.push('Diagram extends beyond left edge')
  if (coords.centerX + halfWidth > props.imageDimensions.width) errors.push('Diagram extends beyond right edge')
  if (coords.centerY - halfHeight < 0) errors.push('Diagram extends beyond top edge')
  if (coords.centerY + halfHeight > props.imageDimensions.height) errors.push('Diagram extends beyond bottom edge')
  
  return errors
}

const validateDimensionCoords = (): string[] => {
  const errors: string[] = []
  const coords = dimensionCoords.value
  
  if (coords.width < 10) errors.push('Width must be at least 10px')
  if (coords.height < 10) errors.push('Height must be at least 10px')
  if (coords.x < 0) errors.push('Left position cannot be negative')
  if (coords.y < 0) errors.push('Top position cannot be negative')
  if (coords.x + coords.width > props.imageDimensions.width) errors.push('Diagram extends beyond right edge')
  if (coords.y + coords.height > props.imageDimensions.height) errors.push('Diagram extends beyond bottom edge')
  
  return errors
}

const syncOtherModes = () => {
  const current = props.coordinates
  
  // Update corner coords
  cornerCoords.value = {
    x1: current.x1,
    y1: current.y1,
    x2: current.x2,
    y2: current.y2
  }
  
  // Update center coords
  centerCoords.value = {
    centerX: (current.x1 + current.x2) / 2,
    centerY: (current.y1 + current.y2) / 2,
    width: current.x2 - current.x1,
    height: current.y2 - current.y1
  }
  
  // Update dimension coords
  dimensionCoords.value = {
    x: current.x1,
    y: current.y1,
    width: current.x2 - current.x1,
    height: current.y2 - current.y1
  }
}

const applyPreset = (preset: string) => {
  const { width: imgWidth, height: imgHeight } = props.imageDimensions
  
  switch (preset) {
    case 'center':
      {
        const size = Math.min(imgWidth, imgHeight) * 0.5
        const centerX = imgWidth / 2
        const centerY = imgHeight / 2
        emit('update', {
          x1: centerX - size / 2,
          y1: centerY - size / 2,
          x2: centerX + size / 2,
          y2: centerY + size / 2
        })
      }
      break
      
    case 'fullWidth':
      {
        const margin = imgWidth * 0.1
        const height = imgHeight * 0.3
        const centerY = imgHeight / 2
        emit('update', {
          x1: margin,
          y1: centerY - height / 2,
          x2: imgWidth - margin,
          y2: centerY + height / 2
        })
      }
      break
      
    case 'square':
      {
        const size = Math.min(imgWidth, imgHeight) * 0.4
        const centerX = imgWidth / 2
        const centerY = imgHeight / 2
        emit('update', {
          x1: centerX - size / 2,
          y1: centerY - size / 2,
          x2: centerX + size / 2,
          y2: centerY + size / 2
        })
      }
      break
      
    case 'golden':
      {
        const width = imgWidth * 0.6
        const height = width / 1.618 // Golden ratio
        const centerX = imgWidth / 2
        const centerY = imgHeight / 2
        emit('update', {
          x1: centerX - width / 2,
          y1: centerY - height / 2,
          x2: centerX + width / 2,
          y2: centerY + height / 2
        })
      }
      break
  }
  
  syncOtherModes()
}

// Watch for external coordinate changes
watch(() => props.coordinates, syncOtherModes, { deep: true })
</script>