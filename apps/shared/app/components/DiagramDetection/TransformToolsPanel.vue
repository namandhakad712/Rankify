<template>
  <div class="transform-tools-panel p-4 border rounded-lg">
    <h5 class="font-medium mb-3">Transform Tools</h5>
    
    <!-- Movement controls -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Move</UiLabel>
      <div class="grid grid-cols-3 gap-1 w-fit mx-auto">
        <div></div>
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="move('up')"
        >
          <Icon name="lucide:chevron-up" class="w-4 h-4" />
        </UiButton>
        <div></div>
        
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="move('left')"
        >
          <Icon name="lucide:chevron-left" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="center"
        >
          <Icon name="lucide:move" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="move('right')"
        >
          <Icon name="lucide:chevron-right" class="w-4 h-4" />
        </UiButton>
        
        <div></div>
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="move('down')"
        >
          <Icon name="lucide:chevron-down" class="w-4 h-4" />
        </UiButton>
        <div></div>
      </div>
      
      <div class="flex items-center gap-2 mt-2">
        <UiLabel class="text-xs">Step:</UiLabel>
        <UiSelect v-model="moveStep">
          <UiSelectTrigger class="w-16 h-7">
            <UiSelectValue />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem value="1">1px</UiSelectItem>
            <UiSelectItem value="5">5px</UiSelectItem>
            <UiSelectItem value="10">10px</UiSelectItem>
            <UiSelectItem value="20">20px</UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>
    </div>

    <!-- Resize controls -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Resize</UiLabel>
      <div class="grid grid-cols-2 gap-2">
        <UiButton
          size="sm"
          variant="outline"
          @click="resize('expand')"
        >
          <Icon name="lucide:maximize-2" class="w-4 h-4 mr-1" />
          Expand
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="resize('shrink')"
        >
          <Icon name="lucide:minimize-2" class="w-4 h-4 mr-1" />
          Shrink
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="resize('wider')"
        >
          <Icon name="lucide:move-horizontal" class="w-4 h-4 mr-1" />
          Wider
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="resize('taller')"
        >
          <Icon name="lucide:move-vertical" class="w-4 h-4 mr-1" />
          Taller
        </UiButton>
      </div>
      
      <div class="flex items-center gap-2 mt-2">
        <UiLabel class="text-xs">Amount:</UiLabel>
        <UiSelect v-model="resizeAmount">
          <UiSelectTrigger class="w-16 h-7">
            <UiSelectValue />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem value="5">5px</UiSelectItem>
            <UiSelectItem value="10">10px</UiSelectItem>
            <UiSelectItem value="20">20px</UiSelectItem>
            <UiSelectItem value="50">50px</UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>
    </div>

    <!-- Alignment tools -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Align</UiLabel>
      <div class="grid grid-cols-3 gap-1">
        <UiButton
          size="sm"
          variant="outline"
          @click="align('top-left')"
        >
          <Icon name="lucide:corner-up-left" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="align('top-center')"
        >
          <Icon name="lucide:align-horizontal-justify-center" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="align('top-right')"
        >
          <Icon name="lucide:corner-up-right" class="w-4 h-4" />
        </UiButton>
        
        <UiButton
          size="sm"
          variant="outline"
          @click="align('middle-left')"
        >
          <Icon name="lucide:align-vertical-justify-center" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="align('center')"
        >
          <Icon name="lucide:plus" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="align('middle-right')"
        >
          <Icon name="lucide:align-vertical-justify-center" class="w-4 h-4" />
        </UiButton>
        
        <UiButton
          size="sm"
          variant="outline"
          @click="align('bottom-left')"
        >
          <Icon name="lucide:corner-down-left" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="align('bottom-center')"
        >
          <Icon name="lucide:align-horizontal-justify-center" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="align('bottom-right')"
        >
          <Icon name="lucide:corner-down-right" class="w-4 h-4" />
        </UiButton>
      </div>
    </div>

    <!-- Aspect ratio tools -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Aspect Ratio</UiLabel>
      <div class="grid grid-cols-2 gap-2">
        <UiButton
          size="sm"
          variant="outline"
          @click="setAspectRatio(1)"
        >
          1:1 Square
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="setAspectRatio(1.618)"
        >
          Golden
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="setAspectRatio(16/9)"
        >
          16:9
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="setAspectRatio(4/3)"
        >
          4:3
        </UiButton>
      </div>
    </div>

    <!-- Snap tools -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Snap</UiLabel>
      <div class="grid grid-cols-2 gap-2">
        <UiButton
          size="sm"
          variant="outline"
          @click="snapToGrid"
        >
          <Icon name="lucide:grid-3x3" class="w-4 h-4 mr-1" />
          To Grid
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="snapToEdges"
        >
          <Icon name="lucide:square" class="w-4 h-4 mr-1" />
          To Edges
        </UiButton>
      </div>
      
      <div class="flex items-center gap-2 mt-2">
        <UiLabel class="text-xs">Grid:</UiLabel>
        <UiSelect v-model="gridSize">
          <UiSelectTrigger class="w-16 h-7">
            <UiSelectValue />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem value="5">5px</UiSelectItem>
            <UiSelectItem value="10">10px</UiSelectItem>
            <UiSelectItem value="20">20px</UiSelectItem>
            <UiSelectItem value="50">50px</UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>
    </div>

    <!-- Transform history -->
    <div v-if="transformHistory.length > 0">
      <UiLabel class="text-sm font-medium mb-2 block">History</UiLabel>
      <div class="space-y-1 max-h-20 overflow-y-auto">
        <div
          v-for="(transform, index) in transformHistory.slice(-5)"
          :key="index"
          class="text-xs text-muted-foreground flex items-center justify-between"
        >
          <span>{{ transform.description }}</span>
          <UiButton
            size="sm"
            variant="ghost"
            class="w-5 h-5 p-0"
            @click="undoTransform(index)"
          >
            <Icon name="lucide:undo" class="w-3 h-3" />
          </UiButton>
        </div>
      </div>
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
  transform: [coordinates: DiagramCoordinates, description: string]
}>()

// Reactive state
const moveStep = ref('10')
const resizeAmount = ref('10')
const gridSize = ref('10')
const transformHistory = ref<Array<{ coordinates: DiagramCoordinates; description: string }>>([])

// Methods
const move = (direction: 'up' | 'down' | 'left' | 'right') => {
  const step = parseInt(moveStep.value)
  const newCoords = { ...props.coordinates }
  
  switch (direction) {
    case 'up':
      newCoords.y1 = Math.max(0, newCoords.y1 - step)
      newCoords.y2 = Math.max(step, newCoords.y2 - step)
      break
    case 'down':
      newCoords.y1 = Math.min(props.imageDimensions.height - (newCoords.y2 - newCoords.y1), newCoords.y1 + step)
      newCoords.y2 = Math.min(props.imageDimensions.height, newCoords.y2 + step)
      break
    case 'left':
      newCoords.x1 = Math.max(0, newCoords.x1 - step)
      newCoords.x2 = Math.max(step, newCoords.x2 - step)
      break
    case 'right':
      newCoords.x1 = Math.min(props.imageDimensions.width - (newCoords.x2 - newCoords.x1), newCoords.x1 + step)
      newCoords.x2 = Math.min(props.imageDimensions.width, newCoords.x2 + step)
      break
  }
  
  applyTransform(newCoords, `Move ${direction} ${step}px`)
}

const center = () => {
  const width = props.coordinates.x2 - props.coordinates.x1
  const height = props.coordinates.y2 - props.coordinates.y1
  const centerX = props.imageDimensions.width / 2
  const centerY = props.imageDimensions.height / 2
  
  const newCoords = {
    ...props.coordinates,
    x1: centerX - width / 2,
    y1: centerY - height / 2,
    x2: centerX + width / 2,
    y2: centerY + height / 2
  }
  
  applyTransform(newCoords, 'Center diagram')
}

const resize = (type: 'expand' | 'shrink' | 'wider' | 'taller') => {
  const amount = parseInt(resizeAmount.value)
  const newCoords = { ...props.coordinates }
  const centerX = (newCoords.x1 + newCoords.x2) / 2
  const centerY = (newCoords.y1 + newCoords.y2) / 2
  
  switch (type) {
    case 'expand':
      newCoords.x1 = Math.max(0, newCoords.x1 - amount)
      newCoords.y1 = Math.max(0, newCoords.y1 - amount)
      newCoords.x2 = Math.min(props.imageDimensions.width, newCoords.x2 + amount)
      newCoords.y2 = Math.min(props.imageDimensions.height, newCoords.y2 + amount)
      break
    case 'shrink':
      const newWidth = Math.max(20, (newCoords.x2 - newCoords.x1) - amount * 2)
      const newHeight = Math.max(20, (newCoords.y2 - newCoords.y1) - amount * 2)
      newCoords.x1 = centerX - newWidth / 2
      newCoords.x2 = centerX + newWidth / 2
      newCoords.y1 = centerY - newHeight / 2
      newCoords.y2 = centerY + newHeight / 2
      break
    case 'wider':
      newCoords.x1 = Math.max(0, newCoords.x1 - amount)
      newCoords.x2 = Math.min(props.imageDimensions.width, newCoords.x2 + amount)
      break
    case 'taller':
      newCoords.y1 = Math.max(0, newCoords.y1 - amount)
      newCoords.y2 = Math.min(props.imageDimensions.height, newCoords.y2 + amount)
      break
  }
  
  applyTransform(newCoords, `Resize ${type} ${amount}px`)
}

const align = (position: string) => {
  const width = props.coordinates.x2 - props.coordinates.x1
  const height = props.coordinates.y2 - props.coordinates.y1
  const newCoords = { ...props.coordinates }
  
  switch (position) {
    case 'top-left':
      newCoords.x1 = 0
      newCoords.y1 = 0
      newCoords.x2 = width
      newCoords.y2 = height
      break
    case 'top-center':
      newCoords.x1 = (props.imageDimensions.width - width) / 2
      newCoords.y1 = 0
      newCoords.x2 = newCoords.x1 + width
      newCoords.y2 = height
      break
    case 'top-right':
      newCoords.x1 = props.imageDimensions.width - width
      newCoords.y1 = 0
      newCoords.x2 = props.imageDimensions.width
      newCoords.y2 = height
      break
    case 'middle-left':
      newCoords.x1 = 0
      newCoords.y1 = (props.imageDimensions.height - height) / 2
      newCoords.x2 = width
      newCoords.y2 = newCoords.y1 + height
      break
    case 'center':
      newCoords.x1 = (props.imageDimensions.width - width) / 2
      newCoords.y1 = (props.imageDimensions.height - height) / 2
      newCoords.x2 = newCoords.x1 + width
      newCoords.y2 = newCoords.y1 + height
      break
    case 'middle-right':
      newCoords.x1 = props.imageDimensions.width - width
      newCoords.y1 = (props.imageDimensions.height - height) / 2
      newCoords.x2 = props.imageDimensions.width
      newCoords.y2 = newCoords.y1 + height
      break
    case 'bottom-left':
      newCoords.x1 = 0
      newCoords.y1 = props.imageDimensions.height - height
      newCoords.x2 = width
      newCoords.y2 = props.imageDimensions.height
      break
    case 'bottom-center':
      newCoords.x1 = (props.imageDimensions.width - width) / 2
      newCoords.y1 = props.imageDimensions.height - height
      newCoords.x2 = newCoords.x1 + width
      newCoords.y2 = props.imageDimensions.height
      break
    case 'bottom-right':
      newCoords.x1 = props.imageDimensions.width - width
      newCoords.y1 = props.imageDimensions.height - height
      newCoords.x2 = props.imageDimensions.width
      newCoords.y2 = props.imageDimensions.height
      break
  }
  
  applyTransform(newCoords, `Align ${position}`)
}

const setAspectRatio = (ratio: number) => {
  const currentWidth = props.coordinates.x2 - props.coordinates.x1
  const currentHeight = props.coordinates.y2 - props.coordinates.y1
  const centerX = (props.coordinates.x1 + props.coordinates.x2) / 2
  const centerY = (props.coordinates.y1 + props.coordinates.y2) / 2
  
  let newWidth, newHeight
  
  if (currentWidth / currentHeight > ratio) {
    // Current is wider than target ratio, adjust width
    newHeight = currentHeight
    newWidth = newHeight * ratio
  } else {
    // Current is taller than target ratio, adjust height
    newWidth = currentWidth
    newHeight = newWidth / ratio
  }
  
  const newCoords = {
    ...props.coordinates,
    x1: centerX - newWidth / 2,
    y1: centerY - newHeight / 2,
    x2: centerX + newWidth / 2,
    y2: centerY + newHeight / 2
  }
  
  applyTransform(newCoords, `Set aspect ratio ${ratio.toFixed(2)}:1`)
}

const snapToGrid = () => {
  const grid = parseInt(gridSize.value)
  const newCoords = {
    ...props.coordinates,
    x1: Math.round(props.coordinates.x1 / grid) * grid,
    y1: Math.round(props.coordinates.y1 / grid) * grid,
    x2: Math.round(props.coordinates.x2 / grid) * grid,
    y2: Math.round(props.coordinates.y2 / grid) * grid
  }
  
  applyTransform(newCoords, `Snap to ${grid}px grid`)
}

const snapToEdges = () => {
  const threshold = 20
  const newCoords = { ...props.coordinates }
  
  // Snap to left edge
  if (newCoords.x1 < threshold) {
    const offset = newCoords.x1
    newCoords.x1 = 0
    newCoords.x2 -= offset
  }
  
  // Snap to top edge
  if (newCoords.y1 < threshold) {
    const offset = newCoords.y1
    newCoords.y1 = 0
    newCoords.y2 -= offset
  }
  
  // Snap to right edge
  if (props.imageDimensions.width - newCoords.x2 < threshold) {
    const offset = props.imageDimensions.width - newCoords.x2
    newCoords.x2 = props.imageDimensions.width
    newCoords.x1 += offset
  }
  
  // Snap to bottom edge
  if (props.imageDimensions.height - newCoords.y2 < threshold) {
    const offset = props.imageDimensions.height - newCoords.y2
    newCoords.y2 = props.imageDimensions.height
    newCoords.y1 += offset
  }
  
  applyTransform(newCoords, 'Snap to edges')
}

const applyTransform = (newCoords: DiagramCoordinates, description: string) => {
  // Add to history
  transformHistory.value.push({
    coordinates: { ...props.coordinates },
    description
  })
  
  // Keep only last 10 transforms
  if (transformHistory.value.length > 10) {
    transformHistory.value.shift()
  }
  
  emit('transform', newCoords, description)
}

const undoTransform = (index: number) => {
  const historyItem = transformHistory.value[index]
  if (historyItem) {
    emit('transform', historyItem.coordinates, `Undo: ${historyItem.description}`)
    transformHistory.value.splice(index, 1)
  }
}
</script>