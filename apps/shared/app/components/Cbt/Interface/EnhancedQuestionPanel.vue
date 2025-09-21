<template>
  <UiScrollArea
    ref="scrollAreaRef"
    class="grow h-full group"
    type="auto"
    viewport-class="grow h-full w-full [&>div]:flex [&>div]:w-full [&>div]:pl-3 [&>div]:pt-1.5"
    scroll-bar-class="w-3"
  >
    <div
      ref="imageContainerElem"
      class="flex flex-col pb-12 grow"
    >
      <!-- Enhanced Question Images with Coordinate-Based Diagrams -->
      <div
        v-for="(imageData, index) in currentQuestionImages"
        :key="index"
        class="relative mb-4"
      >
        <!-- Original Page Image -->
        <img
          :src="imageData.url"
          draggable="false"
          :style="{
            width: imageData.width + 'px',
            objectFit: 'contain',
          }"
          class="question-page-image"
          @load="(e) => handleImageLoad(e, currentQueId, index)"
        >
        
        <!-- Coordinate-Based Diagram Overlays -->
        <div
          v-if="imageData.diagrams && imageData.diagrams.length > 0"
          class="absolute inset-0 pointer-events-none"
        >
          <div
            v-for="diagram in imageData.diagrams"
            :key="diagram.id"
            :style="getDiagramOverlayStyle(diagram.coordinates, imageData)"
            :class="[
              'absolute border-2 rounded-md transition-all duration-200',
              getDiagramTypeClass(diagram.type),
              {
                'animate-pulse': diagram.confidence < 0.7,
                'border-dashed': diagram.confidence < 0.5
              }
            ]"
          >
            <!-- Diagram Type Indicator -->
            <div
              class="absolute -top-6 left-0 px-2 py-1 text-xs font-medium rounded-t-md"
              :class="getDiagramTypeBadgeClass(diagram.type)"
            >
              {{ formatDiagramType(diagram.type) }}
              <span v-if="diagram.confidence < 0.8" class="ml-1 opacity-75">
                ({{ Math.round(diagram.confidence * 100) }}%)
              </span>
            </div>
            
            <!-- Diagram Description Tooltip -->
            <div
              v-if="diagram.description"
              class="absolute -bottom-6 left-0 px-2 py-1 text-xs bg-gray-800 text-white rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity max-w-xs truncate"
            >
              {{ diagram.description }}
            </div>
          </div>
        </div>
        
        <!-- Dynamic Diagram Rendering (Alternative to overlays) -->
        <div
          v-if="renderingMode === 'dynamic' && imageData.diagrams && imageData.diagrams.length > 0"
          class="mt-4 space-y-4"
        >
          <div
            v-for="diagram in imageData.diagrams"
            :key="`dynamic-${diagram.id}`"
            class="diagram-container"
          >
            <div class="diagram-header flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-700">
                {{ formatDiagramType(diagram.type) }}
                <span v-if="diagram.description" class="text-gray-500 ml-2">
                  - {{ diagram.description }}
                </span>
              </h4>
              <div class="confidence-indicator flex items-center space-x-2">
                <div class="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-300"
                    :class="getConfidenceColor(diagram.confidence)"
                    :style="{ width: `${diagram.confidence * 100}%` }"
                  ></div>
                </div>
                <span class="text-xs text-gray-600">
                  {{ Math.round(diagram.confidence * 100) }}%
                </span>
              </div>
            </div>
            
            <!-- Dynamically Rendered Diagram -->
            <div class="diagram-render-container bg-gray-50 rounded-lg p-4">
              <DynamicDiagramDisplay
                :coordinates="diagram.coordinates"
                :page-image="imageData.url"
                :image-dimensions="imageData.dimensions"
                :quality="diagramRenderQuality"
                class="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Legacy Image Support (Fallback) -->
      <img
        v-for="(url, index) in legacyQuestionImgUrls"
        :key="`legacy-${index}`"
        :src="url"
        draggable="false"
        :style="{
          width: currentQuestionImgWidths?.[index] + 'px',
          objectFit: 'contain',
        }"
        class="legacy-question-image"
        @load="(e) => handleImageLoad(e, currentQueId, index)"
      >
      
      <!-- Answer Options -->
      <CbtInterfaceAnswerOptionsDiv
        v-show="currentQuestionDetails.questionType === 'mcq' || currentQuestionDetails.questionType === 'msq'"
        v-model="currentQuestionMcqOrMsqAnswer"
        :question-type="currentQuestionDetails.questionType"
        :total-options="currentQuestionDetails.answerOptions"
        :answer-options-counter-type="currentQuestionDetails.answerOptionsCounterType"
        class="ml-5 mt-1"
        @update:model-value="logCurrentAnswer"
      />
      
      <CbtInterfaceMsmAnswerOptionsDiv
        v-show="currentQuestionDetails.questionType === 'msm'"
        v-model="currentQuestionMsmAnswer"
        :question-type="currentQuestionDetails.questionType"
        :total-options="currentQuestionDetails.answerOptions"
        :answer-options-counter-type="currentQuestionDetails.answerOptionsCounterType"
        class="ml-5 mt-1"
        @log-current-answer="logCurrentAnswer"
        @answer-changed="currentQuestionMsmAnswer = $event"
      />
      
      <CbtInterfaceAnswerNumericDiv
        v-show="currentQuestionDetails.questionType === 'nat'"
        v-model="currentQuestionNatAnswer"
        :current-que-id="currentQuestionDetails.currentQueId"
        :question-type="currentQuestionDetails.questionType"
        :last-logged-answer="lastLoggedAnswer"
        class="ml-5 mt-2"
        @log-current-answer="logCurrentAnswer"
      />
    </div>
    
    <!-- Scroll Controls -->
    <div
      v-if="uiSettings.mainLayout.showScrollToTopAndBottomBtns"
      class="flex flex-col justify-between shrink-0 w-[2.2rem] mr-3 pb-7"
    >
      <Icon
        name="mdi:arrow-down-circle"
        class="text-blue-600 bg-white hover:cursor-pointer
          hidden! group-has-data-[slot=scroll-area-scrollbar]:block!"
        size="2.2rem"
        @click="handleScrollToBtns('bottom')"
      />
      <Icon
        name="mdi:arrow-up-circle"
        class="text-blue-600 bg-white hover:cursor-pointer
          hidden! group-has-data-[slot=scroll-area-scrollbar]:block!"
        size="2.2rem"
        @click="handleScrollToBtns('top')"
      />
    </div>
  </UiScrollArea>
  
  <!-- Diagram Settings Panel -->
  <div
    v-if="showDiagramSettings"
    class="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 min-w-64"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-800">Diagram Display</h3>
      <button
        @click="showDiagramSettings = false"
        class="text-gray-400 hover:text-gray-600"
      >
        <Icon name="mdi:close" size="1.2rem" />
      </button>
    </div>
    
    <div class="space-y-4">
      <!-- Rendering Mode -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-2">
          Rendering Mode
        </label>
        <select
          v-model="renderingMode"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="overlay">Overlay on Image</option>
          <option value="dynamic">Separate Diagrams</option>
          <option value="both">Both Modes</option>
        </select>
      </div>
      
      <!-- Diagram Quality -->
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-2">
          Diagram Quality
        </label>
        <select
          v-model="diagramRenderQuality"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low (Fast)</option>
          <option value="medium">Medium</option>
          <option value="high">High (Detailed)</option>
        </select>
      </div>
      
      <!-- Show Confidence -->
      <div class="flex items-center">
        <input
          id="show-confidence"
          v-model="showConfidenceIndicators"
          type="checkbox"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        >
        <label for="show-confidence" class="ml-2 text-xs text-gray-700">
          Show confidence indicators
        </label>
      </div>
      
      <!-- Show Descriptions -->
      <div class="flex items-center">
        <input
          id="show-descriptions"
          v-model="showDiagramDescriptions"
          type="checkbox"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        >
        <label for="show-descriptions" class="ml-2 text-xs text-gray-700">
          Show diagram descriptions
        </label>
      </div>
    </div>
  </div>
  
  <!-- Diagram Settings Toggle -->
  <button
    v-if="hasCoordinateBasedDiagrams"
    @click="showDiagramSettings = !showDiagramSettings"
    class="absolute top-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-20"
    title="Diagram Display Settings"
  >
    <Icon name="mdi:cog" size="1.2rem" />
  </button>
</template>

<script setup lang="ts">
import type { DiagramCoordinates, EnhancedQuestion, CoordinateMetadata } from '~/shared/types/diagram-detection'
import { DynamicDiagramDisplay } from '#components'

type QuestionsImgWidths = {
  [questionNum: string | number]: {
    [imageIndex: number | string]: number
  }
}

interface EnhancedImageData {
  url: string;
  width: number;
  dimensions: { width: number; height: number };
  diagrams?: Array<{
    id: string;
    coordinates: DiagramCoordinates;
    type: string;
    description: string;
    confidence: number;
  }>;
}

const props = defineProps<{
  isQuestionPalleteCollapsed: boolean
  cropperSectionsData: CropperSectionsData
  coordinateData?: CoordinateMetadata[]
  enableCoordinateRendering?: boolean
}>()

// Template refs
const scrollAreaRef = useTemplateRef('scrollAreaRef')
const imageContainerElem = useTemplateRef('imageContainerElem')

// Composables
const { width: containerWidth } = useElementSize(imageContainerElem)
const { testQuestionsData, currentTestState, testQuestionsUrls, lastLoggedAnswer } = useCbtTestData()
const { uiSettings } = useCbtSettings()

// Reactive state
const questionsImgWidths = reactive<QuestionsImgWidths>({})
const renderingMode = ref<'overlay' | 'dynamic' | 'both'>('overlay')
const diagramRenderQuality = ref<'low' | 'medium' | 'high'>('medium')
const showDiagramSettings = ref(false)
const showConfidenceIndicators = ref(true)
const showDiagramDescriptions = ref(true)

// Computed properties
const questionImgMaxSize = computed(() => {
  if (props.isQuestionPalleteCollapsed) {
    return uiSettings.value.questionPanel.questionImgMaxWidth.maxWidthWhenQuestionPaletteClosed
  }
  else {
    return uiSettings.value.questionPanel.questionImgMaxWidth.maxWidthWhenQuestionPaletteOpened
  }
})

const currentQueId = computed(() => currentTestState.value.queId)

const currentQuestionCoordinates = computed(() => {
  if (!props.coordinateData || !props.enableCoordinateRendering) {
    return null
  }
  
  return props.coordinateData.find(coord => coord.questionId === currentQueId.value)
})

const hasCoordinateBasedDiagrams = computed(() => {
  return currentQuestionCoordinates.value?.diagrams?.length > 0
})

const currentQuestionImages = computed((): EnhancedImageData[] => {
  const questionImgs = testQuestionsUrls.value?.[currentQueId.value] || []
  const coordinates = currentQuestionCoordinates.value
  
  return questionImgs.map((url, index) => {
    const width = currentQuestionImgWidths.value[index] || 0
    const imageDimensions = coordinates?.originalImageDimensions || { width: 800, height: 600 }
    
    // Get diagrams for this specific image/page
    const diagrams = coordinates?.diagrams?.map(diagram => ({
      id: diagram.id,
      coordinates: diagram.coordinates,
      type: diagram.type,
      description: diagram.description,
      confidence: diagram.confidence
    })) || []
    
    return {
      url,
      width,
      dimensions: imageDimensions,
      diagrams: diagrams.length > 0 ? diagrams : undefined
    }
  })
})

// Legacy support for non-coordinate questions
const legacyQuestionImgUrls = computed(() => {
  if (hasCoordinateBasedDiagrams.value && props.enableCoordinateRendering) {
    return []
  }
  return testQuestionsUrls.value?.[currentQueId.value] || []
})

const currentQuestionImgWidths = computed(() => {
  const queId = currentQueId.value
  const containerW = containerWidth.value
  const maxPercent = questionImgMaxSize.value
  const queImgsWidths = questionsImgWidths[queId]

  if (!queImgsWidths || containerW === 0) {
    return {}
  }
  
  const maxOriginalWidth = Math.max(...Object.values(queImgsWidths))
  const maxAllowedWidth = (containerW * maxPercent) / 100
  const globalScale = maxAllowedWidth / maxOriginalWidth

  const scaled: QuestionsImgWidths[string] = {}

  for (const [index, w] of Object.entries(queImgsWidths)) {
    scaled[index] = Math.floor(w * globalScale)
  }

  return scaled
})

const currentQuestionDetails = computed(() => {
  const currentQueId = currentTestState.value.queId
  const currentQuestion = testQuestionsData.value.get(currentQueId)!
  const questionType = currentQuestion.type
  const answerOptions = currentQuestion.answerOptions || '4'
  const { answerOptionsCounterType } = props.cropperSectionsData[currentQuestion.section]?.[currentQuestion.que] ?? {}

  return {
    questionType,
    answerOptions,
    currentQueId,
    answerOptionsCounterType,
  }
})

// Answer handling (same as original)
const currentQuestionMsmAnswer = computed({
  get: () => {
    if (currentQuestionDetails.value.questionType === 'msm') {
      const buffAnswer = currentTestState.value.currentAnswerBuffer
      if (buffAnswer)
        return buffAnswer as QuestionMsmAnswerType

      return getNewMsmAnswerObject(currentQuestionDetails.value.answerOptions)
    }
    return {} as QuestionMsmAnswerType
  },
  set: (newVal) => {
    const isNoneSelected = Object.values(newVal).every(arr => arr.length === 0)
    currentTestState.value.currentAnswerBuffer = isNoneSelected ? null : newVal
  },
})

const currentQuestionNatAnswer = computed({
  get: (): string => {
    if (currentQuestionDetails.value.questionType === 'nat') {
      return (currentTestState.value.currentAnswerBuffer ?? '') as string
    }
    return ''
  },
  set: (newValue) => {
    currentTestState.value.currentAnswerBuffer = newValue === '' ? null : newValue
  },
})

const currentQuestionMcqOrMsqAnswer = computed({
  get: () => {
    const questionType = currentQuestionDetails.value.questionType

    if (questionType === 'mcq') {
      return currentTestState.value.currentAnswerBuffer ?? ''
    }
    else if (questionType === 'msq') {
      return currentTestState.value.currentAnswerBuffer ?? []
    }

    return ''
  },
  set: (value) => {
    const questionType = currentQuestionDetails.value.questionType

    if (questionType === 'msq') {
      if (Array.isArray(value) && value.length > 0) {
        currentTestState.value.currentAnswerBuffer = value
      }
      else {
        currentTestState.value.currentAnswerBuffer = null
      }
    }
    else {
      currentTestState.value.currentAnswerBuffer = value === '' ? null : value
    }
  },
})

// Methods
const handleImageLoad = (e: Event, queId: string | number, imgindex: number) => {
  const w = questionsImgWidths?.[queId]?.[imgindex]

  if (typeof w === 'number' && w > 0) {
    return
  }

  questionsImgWidths[queId] ??= {}

  const img = e.target as HTMLImageElement | null
  if (img) {
    questionsImgWidths[queId]![imgindex] = img.naturalWidth || 0
  }
}

const getDiagramOverlayStyle = (coordinates: DiagramCoordinates, imageData: EnhancedImageData) => {
  const scaleX = imageData.width / imageData.dimensions.width
  const scaleY = imageData.width / imageData.dimensions.height // Maintain aspect ratio
  
  const x = coordinates.x1 * scaleX
  const y = coordinates.y1 * scaleY
  const width = (coordinates.x2 - coordinates.x1) * scaleX
  const height = (coordinates.y2 - coordinates.y1) * scaleY
  
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`
  }
}

const getDiagramTypeClass = (type: string) => {
  const typeClasses = {
    'graph': 'border-blue-500 bg-blue-100/20',
    'flowchart': 'border-green-500 bg-green-100/20',
    'scientific': 'border-purple-500 bg-purple-100/20',
    'geometric': 'border-orange-500 bg-orange-100/20',
    'table': 'border-red-500 bg-red-100/20',
    'circuit': 'border-yellow-500 bg-yellow-100/20',
    'map': 'border-indigo-500 bg-indigo-100/20',
    'other': 'border-gray-500 bg-gray-100/20'
  }
  return typeClasses[type as keyof typeof typeClasses] || typeClasses.other
}

const getDiagramTypeBadgeClass = (type: string) => {
  const badgeClasses = {
    'graph': 'bg-blue-500 text-white',
    'flowchart': 'bg-green-500 text-white',
    'scientific': 'bg-purple-500 text-white',
    'geometric': 'bg-orange-500 text-white',
    'table': 'bg-red-500 text-white',
    'circuit': 'bg-yellow-500 text-black',
    'map': 'bg-indigo-500 text-white',
    'other': 'bg-gray-500 text-white'
  }
  return badgeClasses[type as keyof typeof badgeClasses] || badgeClasses.other
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'bg-green-500'
  if (confidence >= 0.6) return 'bg-yellow-500'
  return 'bg-red-500'
}

const formatDiagramType = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')
}

const testLogger = useCbtLogger()

const logCurrentAnswer = () => {
  const currentAnswer = currentTestState.value.currentAnswerBuffer
  testLogger.currentAnswer(currentAnswer)
}

function getNewMsmAnswerObject(answerOption: string) {
  const rows = parseInt(answerOption || '4')
  const answerObj: QuestionMsmAnswerType = {}
  utilRange(1, rows + 1).forEach(r => answerObj[r] = [])
  return answerObj
}

const handleScrollToBtns = (dir: 'top' | 'bottom') => {
  scrollAreaRef.value?.viewport?.scrollTo({
    top: dir === 'bottom'
      ? scrollAreaRef.value.viewport.scrollHeight
      : 0,
    behavior: 'smooth',
  })
}

// Reset scroll position to top when question changes
watch(
  () => currentTestState.value.queId,
  () => scrollAreaRef.value?.viewport?.scrollTo({ top: 0, behavior: 'instant' }),
)

// Save diagram settings to localStorage
watch([renderingMode, diagramRenderQuality, showConfidenceIndicators, showDiagramDescriptions], () => {
  const settings = {
    renderingMode: renderingMode.value,
    diagramRenderQuality: diagramRenderQuality.value,
    showConfidenceIndicators: showConfidenceIndicators.value,
    showDiagramDescriptions: showDiagramDescriptions.value
  }
  localStorage.setItem('cbt-diagram-settings', JSON.stringify(settings))
})

// Load diagram settings from localStorage
onMounted(() => {
  const savedSettings = localStorage.getItem('cbt-diagram-settings')
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      renderingMode.value = settings.renderingMode || 'overlay'
      diagramRenderQuality.value = settings.diagramRenderQuality || 'medium'
      showConfidenceIndicators.value = settings.showConfidenceIndicators ?? true
      showDiagramDescriptions.value = settings.showDiagramDescriptions ?? true
    } catch (error) {
      console.warn('Failed to load diagram settings:', error)
    }
  }
})
</script>

<style scoped>
.question-page-image {
  @apply transition-all duration-200;
}

.diagram-container {
  @apply border border-gray-200 rounded-lg p-4 bg-white shadow-sm;
}

.diagram-header {
  @apply border-b border-gray-100 pb-2;
}

.diagram-render-container {
  @apply relative overflow-hidden;
}

.legacy-question-image {
  @apply opacity-90;
}

.confidence-indicator {
  @apply text-xs;
}

/* Hover effects for diagram overlays */
.absolute.border-2:hover {
  @apply shadow-lg z-10;
}

/* Animation for low confidence diagrams */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>