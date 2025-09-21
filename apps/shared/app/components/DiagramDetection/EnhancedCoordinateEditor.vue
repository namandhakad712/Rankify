<template>
  <div class="enhanced-coordinate-editor">
    <!-- Header with tools -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h4 class="font-semibold">Enhanced Coordinate Editor</h4>
        <UiBadge v-if="editor.hasChanges" variant="secondary">
          Modified
        </UiBadge>
        <UiBadge v-if="!editor.isValid" variant="destructive">
          Invalid
        </UiBadge>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- History controls -->
        <UiButton
          size="sm"
          variant="outline"
          :disabled="!editor.state.canUndo"
          @click="editor.undoLastEdit()"
        >
          <Icon name="lucide:undo" class="w-4 h-4" />
        </UiButton>
        
        <!-- Precision tools -->
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton size="sm" variant="outline">
              <Icon name="lucide:settings" class="w-4 h-4 mr-1" />
              Tools
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent>
            <UiDropdownMenuItem @click="snapToGrid">
              <Icon name="lucide:grid-3x3" class="w-4 h-4 mr-2" />
              Snap to Grid
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="centerDiagram">
              <Icon name="lucide:move" class="w-4 h-4 mr-2" />
              Center Diagram
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="makeSquare">
              <Icon name="lucide:square" class="w-4 h-4 mr-2" />
              Make Square
            </UiDropdownMenuItem>
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem @click="resetToOriginal">
              <Icon name="lucide:rotate-ccw" class="w-4 h-4 mr-2" />
              Reset to Original
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>
    </div>

    <!-- Interactive Canvas -->
    <div class="relative mb-4 border rounded-lg overflow-hidden bg-gray-50">
      <canvas
        ref="canvasRef"
        class="block cursor-crosshair"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="startDragging"
        @mousemove="handleMouseMove"
        @mouseup="stopDragging"
        @mouseleave="stopDragging"
        @wheel="handleWheel"
      />
      
      <!-- Coordinate display overlay -->
      <div
        v-if="showCoordinates && mouseCoords"
        class="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded"
      >
        {{ Math.round(mouseCoords.x) }}, {{ Math.round(mouseCoords.y) }}
      </div>

      <!-- Zoom controls -->
      <div class="absolute top-2 right-2 flex flex-col gap-1">
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="zoomIn"
        >
          <Icon name="lucide:plus" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="zoomOut"
        >
          <Icon name="lucide:minus" class="w-4 h-4" />
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          class="w-8 h-8 p-0"
          @click="resetZoom"
        >
          <Icon name="lucide:maximize" class="w-4 h-4" />
        </UiButton>
      </div>
    </div>

    <!-- Coordinate Inputs with Enhanced Controls -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <!-- Coordinate inputs -->
      <div class="space-y-3">
        <div>
          <UiLabel class="text-sm font-medium">Top-Left Corner</UiLabel>
          <div class="flex gap-2 mt-1">
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">X</UiLabel>
              <UiInput
                v-model.number="editableCoords.x1"
                type="number"
                :min="0"
                :max="imageDimensions.width - 10"
                class="text-sm"
                @input="validateAndUpdate"
              />
            </div>
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">Y</UiLabel>
              <UiInput
                v-model.number="editableCoords.y1"
                type="number"
                :min="0"
                :max="imageDimensions.height - 10"
                class="text-sm"
                @input="validateAndUpdate"
              />
            </div>
          </div>
        </div>

        <div>
          <UiLabel class="text-sm font-medium">Bottom-Right Corner</UiLabel>
          <div class="flex gap-2 mt-1">
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">X</UiLabel>
              <UiInput
                v-model.number="editableCoords.x2"
                type="number"
                :min="editableCoords.x1 + 10"
                :max="imageDimensions.width"
                class="text-sm"
                @input="validateAndUpdate"
              />
            </div>
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">Y</UiLabel>
              <UiInput
                v-model.number="editableCoords.y2"
                type="number"
                :min="editableCoords.y1 + 10"
                :max="imageDimensions.height"
                class="text-sm"
                @input="validateAndUpdate"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced controls -->
      <div class="space-y-3">
        <!-- Size controls -->
        <div>
          <UiLabel class="text-sm font-medium">Size Controls</UiLabel>
          <div class="flex gap-2 mt-1">
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">Width</UiLabel>
              <UiInput
                v-model.number="width"
                type="number"
                :min="10"
                class="text-sm"
                @input="updateFromSize"
              />
            </div>
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">Height</UiLabel>
              <UiInput
                v-model.number="height"
                type="number"
                :min="10"
                class="text-sm"
                @input="updateFromSize"
              />
            </div>
          </div>
        </div>

        <!-- Position controls -->
        <div>
          <UiLabel class="text-sm font-medium">Center Position</UiLabel>
          <div class="flex gap-2 mt-1">
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">Center X</UiLabel>
              <UiInput
                v-model.number="centerX"
                type="number"
                :min="width / 2"
                :max="imageDimensions.width - width / 2"
                class="text-sm"
                @input="updateFromCenter"
              />
            </div>
            <div class="flex-1">
              <UiLabel class="text-xs text-muted-foreground">Center Y</UiLabel>
              <UiInput
                v-model.number="centerY"
                type="number"
                :min="height / 2"
                :max="imageDimensions.height - height / 2"
                class="text-sm"
                @input="updateFromCenter"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Adjustments -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Quick Adjustments</UiLabel>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <UiButton
          size="sm"
          variant="outline"
          @click="expandBy(10)"
        >
          <Icon name="lucide:maximize-2" class="w-4 h-4 mr-1" />
          Expand +10px
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="shrinkBy(10)"
        >
          <Icon name="lucide:minimize-2" class="w-4 h-4 mr-1" />
          Shrink -10px
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="moveBy(-10, 0)"
        >
          <Icon name="lucide:arrow-left" class="w-4 h-4 mr-1" />
          Left 10px
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="moveBy(10, 0)"
        >
          <Icon name="lucide:arrow-right" class="w-4 h-4 mr-1" />
          Right 10px
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="moveBy(0, -10)"
        >
          <Icon name="lucide:arrow-up" class="w-4 h-4 mr-1" />
          Up 10px
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="moveBy(0, 10)"
        >
          <Icon name="lucide:arrow-down" class="w-4 h-4 mr-1" />
          Down 10px
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="centerDiagram"
        >
          <Icon name="lucide:move" class="w-4 h-4 mr-1" />
          Center
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          @click="makeSquare"
        >
          <Icon name="lucide:square" class="w-4 h-4 mr-1" />
          Make Square
        </UiButton>
      </div>
    </div>

    <!-- Precision Controls -->
    <div class="mb-4">
      <UiLabel class="text-sm font-medium mb-2 block">Precision Controls</UiLabel>
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <UiLabel class="text-xs">Grid Size:</UiLabel>
          <UiSelect v-model="gridSize">
            <UiSelectTrigger class="w-20 h-8">
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
        <div class="flex items-center gap-2">
          <UiCheckbox
            id="show-grid"
            v-model="showGrid"
          />
          <UiLabel for="show-grid" class="text-xs">Show Grid</UiLabel>
        </div>
        <div class="flex items-center gap-2">
          <UiCheckbox
            id="show-coords"
            v-model="showCoordinates"
          />
          <UiLabel for="show-coords" class="text-xs">Show Coordinates</UiLabel>
        </div>
        <div class="flex items-center gap-2">
          <UiCheckbox
            id="snap-to-grid"
            v-model="snapToGridEnabled"
          />
          <UiLabel for="snap-to-grid" class="text-xs">Snap to Grid</UiLabel>
        </div>
      </div>
    </div>

    <!-- Validation Messages -->
    <div v-if="editor.state.validationErrors.length > 0" class="mb-4">
      <div class="text-sm text-red-600 space-y-1">
        <div
          v-for="error in editor.state.validationErrors"
          :key="error"
          class="flex items-center gap-2"
        >
          <Icon name="lucide:alert-circle" class="w-4 h-4" />
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Statistics and Info -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
      <div>
        <div class="font-medium">Dimensions</div>
        <div>{{ Math.round(width) }} × {{ Math.round(height) }}px</div>
      </div>
      <div>
        <div class="font-medium">Area</div>
        <div>{{ Math.round(width * height).toLocaleString() }}px²</div>
      </div>
      <div>
        <div class="font-medium">Aspect Ratio</div>
        <div>{{ aspectRatio }}</div>
      </div>
      <div>
        <div class="font-medium">Position</div>
        <div>{{ Math.round(editableCoords.x1) }}, {{ Math.round(editableCoords.y1) }}</div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex justify-end gap-2 mt-6">
      <UiButton
        variant="outline"
        @click="$emit('cancel')"
      >
        Cancel
      </UiButton>
      <UiButton
        :disabled="!editor.isValid || !editor.hasChanges"
        @click="saveChanges"
      >
        Save Changes
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiagramCoordinates } from '~/shared/types/diagram-detection'
import { useCoordinateEditor, useCoordinateEditorKeyboard } from '~/app/composables/useCoordinateEditor'

interface Props {
  diagram: DiagramCoordinates
  imageDimensions: { width: number; height: number }
  questionId: string
  pageImage?: string
}

const props = defineProps<Props>()

co