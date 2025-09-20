<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="max-w-2xl">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center">
          <Icon name="line-md:confirm" class="mr-2" />
          Submit AI-Enhanced Test
        </UiDialogTitle>
        <UiDialogDescription>
          Review your test completion status and AI analytics before submitting.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-6">
        <!-- Test Completion Overview -->
        <div class="bg-muted rounded-lg p-4">
          <h4 class="font-medium mb-3 flex items-center">
            <Icon name="line-md:chart" class="mr-2" />
            Test Completion Overview
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600">{{ answeredQuestions }}</div>
              <div class="text-sm text-muted-foreground">Questions Answered</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-gray-600">{{ totalQuestions }}</div>
              <div class="text-sm text-muted-foreground">Total Questions</div>
            </div>
          </div>
          <div class="mt-3">
            <UiProgress :value="completionPercentage" class="h-2" />
            <div class="text-center text-sm text-muted-foreground mt-1">
              {{ completionPercentage.toFixed(1) }}% Complete
            </div>
          </div>
        </div>

        <!-- AI Analytics Summary -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border">
          <h4 class="font-medium mb-3 flex items-center">
            <Icon name="line-md:star-filled" class="mr-2 text-yellow-500" />
            AI Analytics Summary
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Average Confidence -->
            <div class="text-center bg-white rounded-lg p-3">
              <div 
                class="text-2xl font-bold mb-1"
                :style="{ color: getConfidenceColor(aiConfidence) }"
              >
                {{ aiConfidence.toFixed(1) }}/5
              </div>
              <div class="text-sm text-muted-foreground">Avg AI Confidence</div>
              <div class="text-xs mt-1" :class="getConfidenceTextClass(aiConfidence)">
                {{ getConfidenceLabel(aiConfidence) }}
              </div>
            </div>

            <!-- Questions Needing Review -->
            <div class="text-center bg-white rounded-lg p-3">
              <div class="text-2xl font-bold text-orange-600 mb-1">{{ questionsNeedingReview }}</div>
              <div class="text-sm text-muted-foreground">Need Review</div>
              <div class="text-xs text-orange-600 mt-1">Low Confidence</div>
            </div>

            <!-- Issues Reported -->
            <div class="text-center bg-white rounded-lg p-3">
              <div class="text-2xl font-bold text-red-600 mb-1">{{ issuesReported }}</div>
              <div class="text-sm text-muted-foreground">Issues Reported</div>
              <div class="text-xs text-red-600 mt-1">Extraction Problems</div>
            </div>
          </div>
        </div>

        <!-- Warnings and Recommendations -->
        <div v-if="hasWarnings" class="space-y-3">
          <!-- Unanswered Questions Warning -->
          <div v-if="unansweredQuestions > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <Icon name="line-md:alert" class="text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 class="font-medium text-yellow-800">Unanswered Questions</h5>
                <p class="text-sm text-yellow-700 mt-1">
                  You have {{ unansweredQuestions }} unanswered questions. 
                  These will be marked as incorrect in your final score.
                </p>
              </div>
            </div>
          </div>

          <!-- Low Confidence Warning -->
          <div v-if="questionsNeedingReview > 0" class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <Icon name="line-md:lightbulb" class="text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 class="font-medium text-orange-800">Low AI Confidence Questions</h5>
                <p class="text-sm text-orange-700 mt-1">
                  {{ questionsNeedingReview }} questions have low AI confidence scores. 
                  You may want to review these questions for potential extraction errors.
                </p>
              </div>
            </div>
          </div>

          <!-- Issues Reported Warning -->
          <div v-if="issuesReported > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <Icon name="line-md:alert" class="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 class="font-medium text-red-800">Reported Issues</h5>
                <p class="text-sm text-red-700 mt-1">
                  You reported {{ issuesReported }} issues with question extraction. 
                  These will be reviewed and may affect your final score calculation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Recommendations -->
        <div v-if="aiRecommendations.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 class="font-medium text-blue-800 mb-2 flex items-center">
            <Icon name="line-md:lightbulb" class="mr-2" />
            AI Recommendations
          </h5>
          <ul class="space-y-1">
            <li 
              v-for="recommendation in aiRecommendations" 
              :key="recommendation.id"
              class="text-sm text-blue-700 flex items-start space-x-2"
            >
              <Icon name="line-md:arrow-right" class="mt-0.5 flex-shrink-0" />
              <span>{{ recommendation.message }}</span>
            </li>
          </ul>
        </div>

        <!-- Submission Confirmation -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center space-x-3">
            <UiCheckbox 
              id="confirm-submission" 
              v-model:checked="confirmSubmission"
            />
            <UiLabel for="confirm-submission" class="text-sm">
              I understand that once submitted, I cannot make changes to my answers. 
              I have reviewed the AI analytics and am ready to submit my test.
            </UiLabel>
          </div>
        </div>
      </div>

      <UiDialogFooter class="flex justify-between">
        <div class="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="line-md:clock" />
          <span>Time remaining: {{ timeRemaining }}</span>
        </div>
        <div class="flex space-x-2">
          <UiButton variant="outline" @click="closeDialog">
            Cancel
          </UiButton>
          <UiButton 
            :disabled="!confirmSubmission"
            @click="handleSubmit"
            class="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <Icon name="line-md:confirm" class="mr-2" />
            Submit Test
          </UiButton>
        </div>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { confidenceUtils } from '#layers/shared/app/utils/confidenceScoringUtils'

// Props
const props = defineProps<{
  open: boolean
  answeredQuestions: number
  totalQuestions: number
  aiConfidence: number
  questionsNeedingReview?: number
  issuesReported?: number
  timeRemaining?: string
}>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

// Reactive state
const confirmSubmission = ref(false)

// Computed properties
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const unansweredQuestions = computed(() => {
  return props.totalQuestions - props.answeredQuestions
})

const completionPercentage = computed(() => {
  return (props.answeredQuestions / props.totalQuestions) * 100
})

const hasWarnings = computed(() => {
  return unansweredQuestions.value > 0 || 
         (props.questionsNeedingReview && props.questionsNeedingReview > 0) ||
         (props.issuesReported && props.issuesReported > 0)
})

const aiRecommendations = computed(() => {
  const recommendations = []
  
  if (unansweredQuestions.value > 0) {
    recommendations.push({
      id: 'unanswered',
      message: `Consider reviewing and answering the ${unansweredQuestions.value} unanswered questions.`
    })
  }
  
  if (props.questionsNeedingReview && props.questionsNeedingReview > 0) {
    recommendations.push({
      id: 'low-confidence',
      message: `Review ${props.questionsNeedingReview} questions with low AI confidence for potential errors.`
    })
  }
  
  if (props.aiConfidence < 3) {
    recommendations.push({
      id: 'overall-confidence',
      message: 'Overall AI confidence is low. Consider reviewing your answers carefully.'
    })
  }
  
  if (completionPercentage.value < 80) {
    recommendations.push({
      id: 'completion',
      message: 'Test is less than 80% complete. Consider answering more questions.'
    })
  }
  
  return recommendations
})

// Methods
const getConfidenceColor = (score: number): string => {
  return confidenceUtils.getConfidenceColor(score)
}

const getConfidenceLabel = (score: number): string => {
  if (score >= 4.5) return 'Excellent'
  if (score >= 3.5) return 'Good'
  if (score >= 2.5) return 'Fair'
  if (score >= 1.5) return 'Poor'
  return 'Very Poor'
}

const getConfidenceTextClass = (score: number): string => {
  if (score >= 4) return 'text-green-600'
  if (score >= 2.5) return 'text-yellow-600'
  return 'text-red-600'
}

const closeDialog = () => {
  confirmSubmission.value = false
  emit('update:open', false)
}

const handleSubmit = () => {
  if (confirmSubmission.value) {
    emit('confirm')
    closeDialog()
  }
}
</script>