<template>
  <div class="flex flex-col h-full">
    <!-- AI Enhancement Controls -->
    <div v-if="isAIGenerated" class="flex items-center justify-between p-3 bg-blue-50 border-b">
      <div class="flex items-center space-x-3">
        <UiBadge variant="secondary" class="bg-blue-100 text-blue-800">
          <Icon name="line-md:lightbulb" class="mr-1" />
          AI Generated
        </UiBadge>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-muted-foreground">Confidence:</span>
          <UiBadge
            :style="{ backgroundColor: getConfidenceColor(currentQuestion?.confidence || 0) }"
            class="text-white text-xs"
          >
            {{ currentQuestion?.confidence || 0 }}/5
          </UiBadge>
        </div>
        <UiBadge
          v-if="currentQuestion?.hasDiagram"
          variant="outline"
          class="text-orange-600 border-orange-600"
        >
          <Icon name="line-md:image" class="mr-1" />
          Diagram
        </UiBadge>
      </div>
      
      <!-- Confidence Filter -->
      <div class="flex items-center space-x-2">
        <UiLabel class="text-sm">Min Confidence:</UiLabel>
        <input
          v-model="confidenceFilter"
          type="range"
          min="1"
          max="5"
          step="0.5"
          class="w-20"
          @input="applyConfidenceFilter"
        />
        <span class="text-sm w-8">{{ confidenceFilter }}</span>
      </div>
    </div>

    <!-- Question Content -->
    <div class="flex-1 overflow-hidden">
      <!-- MathJax Enhanced Question Text -->
      <div class="p-4 border-b">
        <div class="flex items-start justify-between mb-3">
          <h2 class="text-lg font-semibold">
            Question {{ currentQuestionNumber }}
          </h2>
          <div v-if="isAIGenerated" class="flex items-center space-x-2">
            <UiButton
              v-if="currentQuestion?.hasDiagram"
              variant="outline"
              size="sm"
              @click="showPDFOverlay = true"
            >
              <Icon name="line-md:document" class="mr-2" />
              View PDF
            </UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              @click="toggleMathJax"
            >
              <Icon name="line-md:text-box" class="mr-2" />
              {{ mathJaxEnabled ? 'Disable' : 'Enable' }} Math
            </UiButton>
          </div>
        </div>
        
        <!-- Enhanced Question Text with MathJax Support -->
        <div
          ref="questionTextRef"
          class="prose max-w-none"
          :class="{ 'mathjax-enabled': mathJaxEnabled }"
          v-html="processedQuestionText"
        />
      </div>

      <!-- Answer Options -->
      <div class="flex-1 p-4">
        <CbtInterfaceAnswerOptionsDiv
          v-if="currentQuestion?.queType === 'mcq' || currentQuestion?.queType === 'msq'"
          :question="currentQuestion"
          :ui-settings="uiSettings"
          @answer-changed="handleAnswerChanged"
        />
        
        <CbtInterfaceAnswerNumericDiv
          v-else-if="currentQuestion?.queType === 'nat'"
          :question="currentQuestion"
          :ui-settings="uiSettings"
          @answer-changed="handleAnswerChanged"
        />
        
        <CbtInterfaceMsmAnswerOptionsDiv
          v-else-if="currentQuestion?.queType === 'msm'"
          :question="currentQuestion"
          :ui-settings="uiSettings"
          @answer-changed="handleAnswerChanged"
        />
      </div>
    </div>

    <!-- PDF Overlay for Diagram Questions -->
    <UiDialog v-model:open="showPDFOverlay">
      <UiDialogContent class="max-w-4xl max-h-[90vh]">
        <UiDialogHeader>
          <UiDialogTitle>Question PDF - Page {{ currentQuestion?.pageNumber || 1 }}</UiDialogTitle>
          <UiDialogDescription>
            View the original PDF page containing this question
          </UiDialogDescription>
        </UiDialogHeader>
        
        <div class="flex flex-col space-y-4">
          <!-- PDF Navigation -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <UiButton
                variant="outline"
                size="sm"
                :disabled="currentPDFPage <= 1"
                @click="currentPDFPage--"
              >
                <Icon name="line-md:chevron-left" />
                Previous
              </UiButton>
              <span class="text-sm">
                Page {{ currentPDFPage }} of {{ totalPDFPages }}
              </span>
              <UiButton
                variant="outline"
                size="sm"
                :disabled="currentPDFPage >= totalPDFPages"
                @click="currentPDFPage++"
              >
                Next
                <Icon name="line-md:chevron-right" />
              </UiButton>
            </div>
            
            <div class="flex items-center space-x-2">
              <UiLabel>Zoom:</UiLabel>
              <UiSelect v-model="pdfZoom">
                <UiSelectTrigger class="w-24">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="0.5">50%</UiSelectItem>
                  <UiSelectItem value="0.75">75%</UiSelectItem>
                  <UiSelectItem value="1">100%</UiSelectItem>
                  <UiSelectItem value="1.25">125%</UiSelectItem>
                  <UiSelectItem value="1.5">150%</UiSelectItem>
                  <UiSelectItem value="2">200%</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
          </div>
          
          <!-- PDF Viewer -->
          <div class="border rounded-lg overflow-auto max-h-96">
            <PDFViewer
              v-if="pdfData"
              :pdf-data="pdfData"
              :page="currentPDFPage"
              :zoom="parseFloat(pdfZoom)"
              class="w-full"
            />
            <div v-else class="flex items-center justify-center h-48 text-muted-foreground">
              <Icon name="line-md:document" class="mr-2" />
              PDF not available
            </div>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { confidenceUtils } from '#layers/shared/app/utils/confidenceScoringUtils'

// Props
const props = defineProps<{
  currentQuestion: any
  currentQuestionNumber: number
  uiSettings: any
  isAIGenerated?: boolean
  pdfData?: ArrayBuffer | null
}>()

// Emits
const emit = defineEmits<{
  answerChanged: [answer: any]
}>()

// State
const showPDFOverlay = ref(false)
const mathJaxEnabled = ref(true)
const confidenceFilter = ref(1)
const currentPDFPage = ref(1)
const totalPDFPages = ref(1)
const pdfZoom = ref('1')
const questionTextRef = ref<HTMLElement>()

// Computed
const processedQuestionText = computed(() => {
  if (!props.currentQuestion?.queText) return ''
  
  let text = props.currentQuestion.queText
  
  if (mathJaxEnabled.value) {
    // Process LaTeX/MathJax expressions
    text = processMathJax(text)
  }
  
  return text
})

// Methods
const processMathJax = (text: string): string => {
  // Convert common LaTeX patterns to MathJax format
  let processed = text
  
  // Inline math: \( ... \) or $ ... $
  processed = processed.replace(/\\\((.*?)\\\)/g, '\\($1\\)')
  processed = processed.replace(/\$([^$]+)\$/g, '\\($1\\)')
  
  // Display math: \[ ... \] or $$ ... $$
  processed = processed.replace(/\\\[(.*?)\\\]/g, '\\[$1\\]')
  processed = processed.replace(/\$\$(.*?)\$\$/g, '\\[$1\\]')
  
  return processed
}

const toggleMathJax = async () => {
  mathJaxEnabled.value = !mathJaxEnabled.value
  
  // Re-render MathJax if enabled
  if (mathJaxEnabled.value) {
    await nextTick()
    renderMathJax()
  }
}

const renderMathJax = () => {
  // Check if MathJax is available
  if (typeof window !== 'undefined' && (window as any).MathJax) {
    (window as any).MathJax.typesetPromise([questionTextRef.value])
      .catch((err: any) => console.warn('MathJax rendering error:', err))
  }
}

const getConfidenceColor = (score: number): string => {
  return confidenceUtils.getConfidenceColor(score)
}

const applyConfidenceFilter = () => {
  // Emit filter change event
  emit('answerChanged', { type: 'confidence-filter', value: confidenceFilter.value })
}

const handleAnswerChanged = (answer: any) => {
  emit('answerChanged', answer)
}

// Initialize PDF page info
watch(() => props.currentQuestion, (newQuestion) => {
  if (newQuestion?.pageNumber) {
    currentPDFPage.value = newQuestion.pageNumber
  }
}, { immediate: true })

// Initialize MathJax when component mounts
onMounted(() => {
  // Load MathJax if not already loaded
  if (typeof window !== 'undefined' && !(window as any).MathJax) {
    loadMathJax()
  }
})

const loadMathJax = () => {
  // Configure MathJax
  (window as any).MathJax = {
    tex: {
      inlineMath: [['\\(', '\\)'], ['$', '$']],
      displayMath: [['\\[', '\\]'], ['$$', '$$']],
      processEscapes: true,
      processEnvironments: true
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
    }
  }
  
  // Load MathJax script
  const script = document.createElement('script')
  script.src = 'https://polyfill.io/v3/polyfill.min.js?features=es6'
  script.onload = () => {
    const mathJaxScript = document.createElement('script')
    mathJaxScript.id = 'MathJax-script'
    mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
    mathJaxScript.async = true
    document.head.appendChild(mathJaxScript)
  }
  document.head.appendChild(script)
}

// Watch for question text changes and re-render MathJax
watch(() => processedQuestionText.value, async () => {
  if (mathJaxEnabled.value) {
    await nextTick()
    renderMathJax()
  }
})
</script>

<style scoped>
.mathjax-enabled {
  /* Ensure MathJax content is properly styled */
}

.prose {
  /* Override prose styles for better question display */
  line-height: 1.6;
}

.prose p {
  margin-bottom: 1rem;
}

.prose ul, .prose ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
</style>