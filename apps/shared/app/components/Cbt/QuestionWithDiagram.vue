<template>
  <div class="question-with-diagram">
    <!-- Question text -->
    <div class="question-text mb-6">
      <h3 class="text-lg font-semibold mb-2">Question {{ question.questionNumber }}</h3>
      <p class="text-base leading-relaxed whitespace-pre-wrap">{{ question.text }}</p>
    </div>
    
    <!-- Diagram(s) if present -->
    <div v-if="question.diagrams && question.diagrams.length > 0" class="diagrams-container mb-6">
      <div 
        v-for="(diagram, idx) in question.diagrams" 
        :key="idx"
        class="diagram-wrapper mb-4"
      >
        <div class="diagram-label text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          {{ diagram.label || `Diagram ${idx + 1}` }}
        </div>
        <canvas 
          :ref="el => setDiagramCanvas(idx, el)"
          class="diagram-canvas w-full max-w-2xl mx-auto border-2 border-slate-300 dark:border-slate-700 rounded-lg shadow-md"
        ></canvas>
      </div>
    </div>
    
    <!-- Options -->
    <div class="options-container">
      <div 
        v-for="(option, idx) in question.options" 
        :key="idx"
        class="option-item p-4 mb-2 border-2 rounded-lg cursor-pointer transition-all"
        :class="getOptionClass(idx)"
        @click="selectOption(idx)"
      >
        <span class="option-label font-semibold mr-3">{{ String.fromCharCode(65 + idx) }}.</span>
        <span class="option-text">{{ option }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLazyDiagramRendering } from '#layers/shared/app/composables/useLazyDiagramRendering'
import type { AIExtractedQuestionWithDiagrams } from '#layers/shared/app/types/diagram'

const props = defineProps<{
  question: AIExtractedQuestionWithDiagrams
  pdfBuffer: ArrayBuffer
  selectedAnswer?: number | number[]
  useLazyLoading?: boolean // Enable/disable lazy loading
}>()

const emit = defineEmits<{
  'select-answer': [answerIndex: number]
}>()

const diagramCanvases = ref<Map<number, HTMLCanvasElement>>(new Map())
const diagramObservers = ref<Map<number, any>>(new Map())

/**
 * Set canvas reference for a diagram
 */
const setDiagramCanvas = (index: number, el: any) => {
  if (el) {
    diagramCanvases.value.set(index, el as HTMLCanvasElement)
  }
}

onMounted(async () => {
  // Setup lazy loading for all diagrams
  if (props.question.diagrams && props.useLazyLoading !== false) {
    for (let i = 0; i < props.question.diagrams.length; i++) {
      setupLazyDiagram(i)
    }
  } else if (props.question.diagrams) {
    // Render immediately if lazy loading is disabled
    for (let i = 0; i < props.question.diagrams.length; i++) {
      await renderDiagramImmediately(i)
    }
  }
})

/**
 * Setup lazy loading for a diagram
 */
const setupLazyDiagram = (index: number) => {
  const canvas = diagramCanvases.value.get(index)
  if (!canvas || !props.question.diagrams) return
  
  const diagram = props.question.diagrams[index]
  
  const observer = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          await renderDiagramImmediately(index)
          observer.unobserve(canvas)
        }
      }
    },
    {
      rootMargin: '50px',
      threshold: 0.1
    }
  )
  
  observer.observe(canvas)
  diagramObservers.value.set(index, observer)
}

/**
 * Render a diagram immediately (used for non-lazy loading or when visible)
 */
const renderDiagramImmediately = async (index: number) => {
  const canvas = diagramCanvases.value.get(index)
  if (!canvas || !props.question.diagrams) return
  
  try {
    const diagram = props.question.diagrams[index]
    
    // Use the lazy rendering composable for caching benefits
    const { renderDiagram } = useLazyDiagramRendering(props.pdfBuffer, diagram, 2)
    
    // Temporarily set canvas ref
    const tempCanvas = ref(canvas)
    await renderDiagram()
    
  } catch (error) {
    console.error(`Error rendering diagram ${index}:`, error)
  }
}

/**
 * Handle option selection
 */
const selectOption = (index: number) => {
  emit('select-answer', index)
}

/**
 * Get CSS class for option based on selection state
 */
const getOptionClass = (index: number) => {
  const isSelected = Array.isArray(props.selectedAnswer)
    ? props.selectedAnswer.includes(index)
    : props.selectedAnswer === index
  
  if (isSelected) {
    return 'border-blue-500 bg-blue-50 dark:bg-blue-950'
  }
  return 'border-slate-300 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
}
</script>

<style scoped>
.question-with-diagram {
  max-width: 100%;
}

.question-text {
  line-height: 1.6;
}

.diagrams-container {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 0.5rem;
}

.dark .diagrams-container {
  background: #1e293b;
}

.diagram-canvas {
  display: block;
  max-height: 500px;
  object-fit: contain;
}

.option-item {
  display: flex;
  align-items: flex-start;
}

.option-label {
  flex-shrink: 0;
}

.option-text {
  flex: 1;
}
</style>
