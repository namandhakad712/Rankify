<template>
  <div class="p-4">
    <div class="grid grid-cols-5 gap-2">
      <div
        v-for="(question, index) in questions"
        :key="question.queId"
        class="relative"
      >
        <!-- Question Button -->
        <button
          :class="[
            'w-full h-10 rounded-lg border-2 text-sm font-medium transition-all duration-200',
            'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            getQuestionButtonClass(question, index)
          ]"
          @click="$emit('question-selected', index)"
        >
          {{ index + 1 }}
        </button>

        <!-- AI Indicators -->
        <div v-if="showAIIndicators" class="absolute -top-1 -right-1 flex space-x-1">
          <!-- Low Confidence Indicator -->
          <div
            v-if="question.confidence && question.confidence < 2.5"
            class="w-3 h-3 rounded-full bg-red-500 border border-white"
            :title="`Low AI Confidence: ${question.confidence}/5`"
          />
          
          <!-- Diagram Indicator -->
          <div
            v-if="question.hasDiagram"
            class="w-3 h-3 rounded-full bg-orange-500 border border-white flex items-center justify-center"
            title="Contains Diagram"
          >
            <Icon name="line-md:image" class="w-2 h-2 text-white" />
          </div>
          
          <!-- High Confidence Indicator -->
          <div
            v-if="question.confidence && question.confidence >= 4.5"
            class="w-3 h-3 rounded-full bg-green-500 border border-white"
            :title="`High AI Confidence: ${question.confidence}/5`"
          />
        </div>

        <!-- Question Status Overlay -->
        <div
          v-if="question.status === 'markedForReview'"
          class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 border-2 border-white flex items-center justify-center"
          title="Marked for Review"
        >
          <Icon name="line-md:star" class="w-2 h-2 text-white" />
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="showAIIndicators" class="mt-4 pt-4 border-t">
      <h4 class="text-sm font-medium mb-2">AI Indicators</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Low Confidence</span>
        </div>
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
          <span>High Confidence</span>
        </div>
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
            <Icon name="line-md:image" class="w-2 h-2 text-white" />
          </div>
          <span>Has Diagram</span>
        </div>
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center">
            <Icon name="line-md:star" class="w-2 h-2 text-white" />
          </div>
          <span>Marked Review</span>
        </div>
      </div>
    </div>

    <!-- AI Summary Stats -->
    <div v-if="showAIIndicators" class="mt-4 pt-4 border-t">
      <h4 class="text-sm font-medium mb-2">Section Summary</h4>
      <div class="space-y-1 text-xs text-muted-foreground">
        <div class="flex justify-between">
          <span>Questions:</span>
          <span class="font-medium">{{ questions.length }}</span>
        </div>
        <div class="flex justify-between">
          <span>Answered:</span>
          <span class="font-medium">{{ answeredCount }}</span>
        </div>
        <div class="flex justify-between">
          <span>Avg Confidence:</span>
          <span class="font-medium" :style="{ color: getConfidenceColor(averageConfidence) }">
            {{ averageConfidence.toFixed(1) }}/5
          </span>
        </div>
        <div class="flex justify-between">
          <span>Need Review:</span>
          <span class="font-medium text-orange-600">{{ lowConfidenceCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { confidenceUtils } from '#layers/shared/app/utils/confidenceScoringUtils'

// Props
const props = defineProps<{
  questions: any[]
  currentQuestion: number
  showAIIndicators?: boolean
}>()

// Emits
defineEmits<{
  'question-selected': [index: number]
}>()

// Computed properties
const answeredCount = computed(() => {
  return props.questions.filter(q => 
    q.answer !== null && q.answer !== undefined && q.answer !== ''
  ).length
})

const averageConfidence = computed(() => {
  const questionsWithConfidence = props.questions.filter(q => q.confidence)
  if (questionsWithConfidence.length === 0) return 0
  
  const total = questionsWithConfidence.reduce((sum, q) => sum + q.confidence, 0)
  return total / questionsWithConfidence.length
})

const lowConfidenceCount = computed(() => {
  return props.questions.filter(q => q.confidence && q.confidence < 2.5).length
})

// Methods
const getQuestionButtonClass = (question: any, index: number) => {
  const isCurrentQuestion = index === props.currentQuestion
  const isAnswered = question.answer !== null && question.answer !== undefined && question.answer !== ''
  const isMarkedForReview = question.status === 'markedForReview'
  
  if (isCurrentQuestion) {
    return 'bg-blue-500 text-white border-blue-500 shadow-lg'
  }
  
  if (isAnswered) {
    if (isMarkedForReview) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
    }
    return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
  }
  
  if (question.status === 'notVisited') {
    return 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
  }
  
  // Not answered but visited
  return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
}

const getConfidenceColor = (score: number): string => {
  return confidenceUtils.getConfidenceColor(score)
}
</script>