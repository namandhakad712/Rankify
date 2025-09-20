<template>
  <div
    :class="[
      'p-3 rounded-lg cursor-pointer transition-all border',
      isSelected
        ? 'bg-primary/10 border-primary'
        : 'bg-background hover:bg-muted border-border',
      highlightClass
    ]"
    @click="$emit('select')"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <!-- Question Header -->
        <div class="flex items-center space-x-2 mb-1">
          <UiBadge :variant="getQuestionTypeVariant(question.type)" class="text-xs">
            {{ question.type }}
          </UiBadge>
          <UiBadge
            v-if="question.hasDiagram"
            variant="outline"
            class="text-xs text-orange-600 border-orange-600"
          >
            <Icon name="line-md:image" class="mr-1 h-3 w-3" />
            Diagram
          </UiBadge>
          <UiBadge
            v-if="hasValidationErrors"
            variant="destructive"
            class="text-xs"
          >
            <Icon name="line-md:alert" class="mr-1 h-3 w-3" />
            Error
          </UiBadge>
          <UiBadge
            v-else-if="hasValidationWarnings"
            variant="warning"
            class="text-xs"
          >
            <Icon name="line-md:alert" class="mr-1 h-3 w-3" />
            Warning
          </UiBadge>
          <span class="text-xs text-muted-foreground">
            Q{{ question.questionNumber }}
          </span>
        </div>

        <!-- Question Text -->
        <p class="text-sm font-medium line-clamp-2 mb-1">
          {{ question.text }}
        </p>

        <!-- Question Options Preview -->
        <div v-if="question.options.length > 0" class="mb-2">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(option, index) in question.options.slice(0, 2)"
              :key="index"
              class="text-xs bg-gray-100 px-1 py-0.5 rounded"
            >
              {{ String.fromCharCode(65 + index) }}) {{ truncateText(option, 15) }}
            </span>
            <span v-if="question.options.length > 2" class="text-xs text-muted-foreground">
              +{{ question.options.length - 2 }} more
            </span>
          </div>
        </div>

        <!-- Question Metadata -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground">
            {{ question.subject }} • {{ question.section }}
          </span>
          <div class="flex items-center space-x-2">
            <!-- Confidence Score -->
            <div class="flex items-center space-x-1">
              <div
                class="w-2 h-2 rounded-full"
                :style="{ backgroundColor: getConfidenceColor(question.confidence) }"
              />
              <span class="text-xs font-medium">{{ question.confidence }}</span>
            </div>
            
            <!-- Change Indicator -->
            <Icon
              v-if="hasChanges"
              name="line-md:edit"
              class="h-3 w-3 text-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { confidenceUtils } from '#layers/shared/app/utils/confidenceScoringUtils'
import type { AIExtractedQuestion } from '#layers/shared/app/utils/geminiAPIClient'
import type { ValidationResult } from '#layers/shared/app/utils/confidenceScoringUtils'

// Props
const props = defineProps<{
  question: AIExtractedQuestion
  isSelected?: boolean
  hasChanges?: boolean
  validationResult?: ValidationResult | null
}>()

// Emits
defineEmits<{
  select: []
}>()

// Computed properties
const hasValidationErrors = computed(() => {
  return props.validationResult && !props.validationResult.isValid
})

const hasValidationWarnings = computed(() => {
  return props.validationResult && props.validationResult.warnings.length > 0
})

const highlightClass = computed(() => {
  if (hasValidationErrors.value) {
    return 'border-l-4 border-l-red-500'
  }
  if (confidenceUtils.requiresManualReview(props.question)) {
    return 'border-l-4 border-l-yellow-500'
  }
  if (props.question.hasDiagram) {
    return 'border-l-4 border-l-orange-500'
  }
  return ''
})

// Methods
const getQuestionTypeVariant = (type: string) => {
  const variants = {
    'MCQ': 'default',
    'MSQ': 'secondary',
    'NAT': 'outline',
    'MSM': 'destructive',
    'Diagram': 'warning'
  }
  return variants[type] || 'default'
}

const getConfidenceColor = (score: number): string => {
  return confidenceUtils.getConfidenceColor(score)
}

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>