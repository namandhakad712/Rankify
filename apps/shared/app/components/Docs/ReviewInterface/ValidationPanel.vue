<template>
  <div class="w-80 border-l bg-card flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Validation Results</h3>
        <UiButton
          variant="ghost"
          size="sm"
          @click="$emit('close')"
        >
          <Icon name="line-md:close" />
        </UiButton>
      </div>
      <p class="text-sm text-muted-foreground">
        Real-time validation feedback
      </p>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="validationResult" class="space-y-4">
        <!-- Overall Status -->
        <div 
          class="p-3 rounded-lg border" 
          :class="validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
        >
          <div class="flex items-center space-x-2">
            <Icon
              :name="validationResult.isValid ? 'line-md:confirm' : 'line-md:alert'"
              :class="validationResult.isValid ? 'text-green-600' : 'text-red-600'"
            />
            <span 
              class="font-medium" 
              :class="validationResult.isValid ? 'text-green-800' : 'text-red-800'"
            >
              {{ validationResult.isValid ? 'All Valid' : 'Issues Found' }}
            </span>
          </div>
          <div class="mt-2 text-sm" :class="validationResult.isValid ? 'text-green-700' : 'text-red-700'">
            Confidence: {{ validationResult.confidence.toFixed(1) }}/5
          </div>
        </div>

        <!-- Errors -->
        <div v-if="validationResult.errors.length > 0">
          <h4 class="font-medium text-red-700 mb-2 flex items-center">
            <Icon name="line-md:alert" class="mr-2" />
            Errors ({{ validationResult.errors.length }})
          </h4>
          <div class="space-y-2">
            <div
              v-for="error in validationResult.errors"
              :key="error.code"
              class="p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div class="flex items-start space-x-2">
                <Icon name="line-md:close-circle" class="text-red-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-medium text-red-800 text-sm">{{ error.field }}</div>
                  <div class="text-red-600 text-sm">{{ error.message }}</div>
                  <div class="text-red-500 text-xs mt-1">Code: {{ error.code }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Warnings -->
        <div v-if="validationResult.warnings.length > 0">
          <h4 class="font-medium text-yellow-700 mb-2 flex items-center">
            <Icon name="line-md:alert" class="mr-2" />
            Warnings ({{ validationResult.warnings.length }})
          </h4>
          <div class="space-y-2">
            <div
              v-for="warning in validationResult.warnings"
              :key="warning.code"
              class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div class="flex items-start space-x-2">
                <Icon name="line-md:alert-circle" class="text-yellow-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-medium text-yellow-800 text-sm">{{ warning.field }}</div>
                  <div class="text-yellow-600 text-sm">{{ warning.message }}</div>
                  <div class="text-yellow-500 text-xs mt-1">{{ warning.suggestion }}</div>
                  <div class="text-yellow-400 text-xs">Code: {{ warning.code }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Success State -->
        <div v-if="validationResult.isValid && validationResult.warnings.length === 0" class="text-center py-8">
          <Icon name="line-md:confirm-circle" class="h-12 w-12 mx-auto mb-3 text-green-500" />
          <h4 class="font-medium text-green-800 mb-1">Perfect!</h4>
          <p class="text-sm text-green-600">No validation issues found</p>
        </div>

        <!-- Validation Tips -->
        <div class="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 class="font-medium text-blue-800 mb-2 flex items-center">
            <Icon name="line-md:lightbulb" class="mr-2" />
            Validation Tips
          </h4>
          <ul class="text-sm text-blue-700 space-y-1">
            <li>• Ensure question text is clear and complete</li>
            <li>• MCQ questions need 2-5 options</li>
            <li>• MSQ questions need at least 3 options</li>
            <li>• NAT questions should not have options</li>
            <li>• Check confidence scores below 2.5</li>
          </ul>
        </div>
      </div>

      <!-- No Validation Result -->
      <div v-else class="text-center py-8">
        <Icon name="line-md:document-list" class="h-12 w-12 mx-auto mb-3 opacity-50" />
        <h4 class="font-medium text-muted-foreground mb-1">No Question Selected</h4>
        <p class="text-sm text-muted-foreground">Select a question to see validation results</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-4 border-t bg-muted/50">
      <div class="flex space-x-2">
        <UiButton
          variant="outline"
          size="sm"
          class="flex-1"
          @click="$emit('validate-all')"
        >
          <Icon name="line-md:check-list-3" class="mr-2" />
          Validate All
        </UiButton>
        <UiButton
          variant="outline"
          size="sm"
          @click="$emit('export-report')"
        >
          <Icon name="line-md:download-outline" class="mr-2" />
          Export
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ValidationResult } from '#layers/shared/app/utils/confidenceScoringUtils'

// Props
defineProps<{
  validationResult?: ValidationResult | null
}>()

// Emits
defineEmits<{
  close: []
  'validate-all': []
  'export-report': []
}>()
</script>