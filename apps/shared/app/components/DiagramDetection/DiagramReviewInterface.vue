<template>
  <div class="diagram-review-interface h-full flex flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 border-b bg-background p-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">Diagram Review</h2>
          <p class="text-muted-foreground">
            Review and edit detected diagrams for {{ questions.length }} questions
          </p>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-sm text-muted-foreground">
            Page {{ currentPage }} of {{ totalPages }}
          </div>
          <div class="flex gap-2">
            <UiButton
              variant="outline"
              size="sm"
              :disabled="currentPage <= 1"
              @click="previousPage"
            >
              <Icon name="lucide:chevron-left" class="w-4 h-4" />
              Previous
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              :disabled="currentPage >= totalPages"
              @click="nextPage"
            >
              Next
              <Icon name="lucide:chevron-right" class="w-4 h-4" />
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Page Viewer -->
      <div class="flex-1 relative overflow-auto bg-gray-50">
        <div class="p-4">
          <div class="relative inline-block">
            <!-- Page Image -->
            <img
              ref="pageImageRef"
              :src="currentPageImage?.url"
              :alt="`Page ${currentPage}`"
              class="max-w-full h-auto border shadow-lg"
              @load="onImageLoad"
            />
            
            <!-- Diagram Overlays -->
            <DiagramOverlay
              v-for="(diagram, index) in currentPageDiagrams"
              :key="`diagram-${index}`"
              :diagram="diagram"
              :image-dimensions="imageDimensions"
              :scale="imageScale"
              :is-selected="selectedDiagramId === diagram.id"
              :is-editing="editingDiagramId === diagram.id"
              @select="selectDiagram"
              @edit="startEditingDiagram"
              @delete="deleteDiagram"
              @update="updateDiagram"
            />
            
            <!-- Add New Diagram Overlay -->
            <div
              v-if="isAddingDiagram"
              class="absolute inset-0 cursor-crosshair"
              @mousedown="startDrawingDiagram"
              @mousemove="updateDrawingDiagram"
              @mouseup="finishDrawingDiagram"
            >
              <div
                v-if="newDiagramCoords"
                class="absolute border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-30"
                :style="getOverlayStyle(newDiagramCoords)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="w-80 border-l bg-background flex flex-col">
        <!-- Question List -->
        <div class="flex-1 overflow-auto">
          <div class="p-4">
            <h3 class="font-semibold mb-3">Questions on this page</h3>
            <div class="space-y-2">
              <div
                v-for="question in currentPageQuestions"
                :key="question.id"
                class="p-3 border rounded-lg cursor-pointer transition-colors"
                :class="{
                  'border-blue-500 bg-blue-50': selectedQuestionId === question.id,
                  'border-orange-500 bg-orange-50': question.hasDiagram && question.diagrams.length === 0,
                  'border-green-500 bg-green-50': question.hasDiagram && question.diagrams.length > 0
                }"
                @click="selectQuestion(question.id)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-medium">Q{{ question.questionNumber || 'N/A' }}</span>
                      <UiBadge
                        v-if="question.hasDiagram"
                        :variant="question.diagrams.length > 0 ? 'default' : 'destructive'"
                        class="text-xs"
                      >
                        {{ question.diagrams.length }} diagram{{ question.diagrams.length !== 1 ? 's' : '' }}
                      </UiBadge>
                    </div>
                    <p class="text-sm text-muted-foreground line-clamp-2">
                      {{ question.text || 'No text available' }}
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <UiBadge variant="outline" class="text-xs">
                        {{ question.type }}
                      </UiBadge>
                      <span class="text-xs text-muted-foreground">
                        Confidence: {{ Math.round(question.confidence * 100) }}%
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-col gap-1">
                    <Icon
                      v-if="question.hasDiagram && question.diagrams.length === 0"
                      name="lucide:alert-triangle"
                      class="w-4 h-4 text-orange-500"
                    />
                    <Icon
                      v-else-if="question.hasDiagram && question.diagrams.length > 0"
                      name="lucide:check-circle"
                      class="w-4 h-4 text-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Diagram Details Panel -->
        <div v-if="selectedDiagram" class="border-t p-4">
          <DiagramDetailsPanel
            :diagram="selectedDiagram"
            :is-editing="editingDiagramId === selectedDiagram.id"
            @update="updateDiagram"
            @cancel-edit="cancelEditingDiagram"
            @save-edit="saveEditingDiagram"
          />
        </div>

        <!-- Action Buttons -->
        <div class="border-t p-4 space-y-2">
          <UiButton
            class="w-full"
            :disabled="isAddingDiagram"
            @click="startAddingDiagram"
          >
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            Add Diagram
          </UiButton>
          
          <UiButton
            variant="outline"
            class="w-full"
            :disabled="!hasChanges"
            @click="saveChanges"
          >
            <Icon name="lucide:save" class="w-4 h-4 mr-2" />
            Save Changes
          </UiButton>
          
          <UiButton
            variant="outline"
            class="w-full"
            @click="proceedToTestConfiguration"
          >
            <Icon name="lucide:arrow-right" class="w-4 h-4 mr-2" />
            Continue to Test Setup
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="flex-shrink-0 border-t bg-background p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Review Progress</span>
        <span class="text-sm text-muted-foreground">
          {{ reviewedQuestions }} / {{ totalQuestions }} questions reviewed
        </span>
      </div>
      <UiProgress :value="reviewProgress" class="w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { 
  EnhancedQuestion, 
  DiagramCoordinates, 
  PageImageData 
} from '~/shared/types/diagram-detection'

interface Props {
  questions: EnhancedQuestion[]
  pageImages: PageImageData[]
  initialPage?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialPage: 1
})

const emit = defineEmits<{
  'update:questions': [questions: EnhancedQuestion[]]
  'save-changes': [questions: EnhancedQuestion[]]
  'proceed-to-test': [questions: EnhancedQuestion[]]
}>()

// Reactive state
const currentPage = ref(props.initialPage)
const selectedQuestionId = ref<string | null>(null)
const selectedDiagramId = ref<string | null>(null)
const editingDiagramId = ref<string | null>(null)
const isAddingDiagram = ref(false)
const newDiagramCoords = ref<DiagramCoordinates | null>(null)
const imageScale = ref(1)
const imageDimensions = ref({ width: 0, height: 0 })
const hasChanges = ref(false)

// Template refs
const pageImageRef = ref<HTMLImageElement>()

// Computed properties
const totalPages = computed(() => props.pageImages.length)

const currentPageImage = computed(() => 
  props.pageImages.find(img => img.pageNumber === currentPage.value)
)

const currentPageQuestions = computed(() =>
  props.questions.filter(q => q.pageNumber === currentPage.value)
)

const currentPageDiagrams = computed(() => {
  const diagrams: Array<DiagramCoordinates & { id: string; questionId: string }> = []
  
  currentPageQuestions.value.forEach(question => {
    question.diagrams.forEach((diagram, index) => {
      diagrams.push({
        ...diagram,
        id: `${question.id}_diagram_${index}`,
        questionId: question.id
      })
    })
  })
  
  return diagrams
})

const selectedDiagram = computed(() =>
  currentPageDiagrams.value.find(d => d.id === selectedDiagramId.value)
)

const totalQuestions = computed(() => props.questions.length)

const reviewedQuestions = computed(() =>
  props.questions.filter(q => !q.hasDiagram || q.diagrams.length > 0).length
)

const reviewProgress = computed(() =>
  totalQuestions.value > 0 ? (reviewedQuestions.value / totalQuestions.value) * 100 : 0
)

// Methods
const onImageLoad = () => {
  if (pageImageRef.value) {
    imageDimensions.value = {
      width: pageImageRef.value.naturalWidth,
      height: pageImageRef.value.naturalHeight
    }
    imageScale.value = pageImageRef.value.width / pageImageRef.value.naturalWidth
  }
}

const getOverlayStyle = (coords: DiagramCoordinates) => {
  return {
    left: `${coords.x1 * imageScale.value}px`,
    top: `${coords.y1 * imageScale.value}px`,
    width: `${(coords.x2 - coords.x1) * imageScale.value}px`,
    height: `${(coords.y2 - coords.y1) * imageScale.value}px`
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    selectedQuestionId.value = null
    selectedDiagramId.value = null
    cancelEditingDiagram()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    selectedQuestionId.value = null
    selectedDiagramId.value = null
    cancelEditingDiagram()
  }
}

const selectQuestion = (questionId: string) => {
  selectedQuestionId.value = questionId
  selectedDiagramId.value = null
  cancelEditingDiagram()
}

const selectDiagram = (diagramId: string) => {
  selectedDiagramId.value = diagramId
  cancelEditingDiagram()
}

const startEditingDiagram = (diagramId: string) => {
  editingDiagramId.value = diagramId
  selectedDiagramId.value = diagramId
}

const cancelEditingDiagram = () => {
  editingDiagramId.value = null
  isAddingDiagram.value = false
  newDiagramCoords.value = null
}

const saveEditingDiagram = () => {
  editingDiagramId.value = null
  hasChanges.value = true
}

const updateDiagram = (diagramId: string, updates: Partial<DiagramCoordinates>) => {
  const [questionId, diagramIndex] = diagramId.split('_diagram_')
  const question = props.questions.find(q => q.id === questionId)
  
  if (question && question.diagrams[parseInt(diagramIndex)]) {
    Object.assign(question.diagrams[parseInt(diagramIndex)], updates)
    hasChanges.value = true
    emit('update:questions', props.questions)
  }
}

const deleteDiagram = (diagramId: string) => {
  const [questionId, diagramIndex] = diagramId.split('_diagram_')
  const question = props.questions.find(q => q.id === questionId)
  
  if (question) {
    question.diagrams.splice(parseInt(diagramIndex), 1)
    question.hasDiagram = question.diagrams.length > 0
    hasChanges.value = true
    selectedDiagramId.value = null
    emit('update:questions', props.questions)
  }
}

const startAddingDiagram = () => {
  isAddingDiagram.value = true
  cancelEditingDiagram()
}

const startDrawingDiagram = (event: MouseEvent) => {
  if (!isAddingDiagram.value || !pageImageRef.value) return
  
  const rect = pageImageRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) / imageScale.value
  const y = (event.clientY - rect.top) / imageScale.value
  
  newDiagramCoords.value = {
    x1: x,
    y1: y,
    x2: x,
    y2: y,
    confidence: 1.0,
    type: 'other',
    description: 'Manual selection'
  }
}

const updateDrawingDiagram = (event: MouseEvent) => {
  if (!isAddingDiagram.value || !newDiagramCoords.value || !pageImageRef.value) return
  
  const rect = pageImageRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) / imageScale.value
  const y = (event.clientY - rect.top) / imageScale.value
  
  newDiagramCoords.value.x2 = x
  newDiagramCoords.value.y2 = y
}

const finishDrawingDiagram = () => {
  if (!isAddingDiagram.value || !newDiagramCoords.value || !selectedQuestionId.value) return
  
  const question = props.questions.find(q => q.id === selectedQuestionId.value)
  if (question) {
    // Ensure proper coordinate ordering
    const coords = newDiagramCoords.value
    const finalCoords: DiagramCoordinates = {
      x1: Math.min(coords.x1, coords.x2),
      y1: Math.min(coords.y1, coords.y2),
      x2: Math.max(coords.x1, coords.x2),
      y2: Math.max(coords.y1, coords.y2),
      confidence: coords.confidence,
      type: coords.type,
      description: coords.description
    }
    
    // Only add if the diagram has reasonable size
    if ((finalCoords.x2 - finalCoords.x1) > 10 && (finalCoords.y2 - finalCoords.y1) > 10) {
      question.diagrams.push(finalCoords)
      question.hasDiagram = true
      hasChanges.value = true
      emit('update:questions', props.questions)
    }
  }
  
  isAddingDiagram.value = false
  newDiagramCoords.value = null
}

const saveChanges = () => {
  emit('save-changes', props.questions)
  hasChanges.value = false
}

const proceedToTestConfiguration = () => {
  if (hasChanges.value) {
    saveChanges()
  }
  emit('proceed-to-test', props.questions)
}

// Auto-select first question on page change
watch(currentPage, () => {
  const firstQuestion = currentPageQuestions.value[0]
  if (firstQuestion) {
    selectedQuestionId.value = firstQuestion.id
  }
}, { immediate: true })
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>