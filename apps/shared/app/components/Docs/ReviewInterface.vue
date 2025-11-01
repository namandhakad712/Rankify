<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="border-b bg-white dark:bg-slate-800 shadow-sm p-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Review AI Extracted Questions
          </h1>
          <p class="text-slate-600 dark:text-slate-300">
            Review and edit {{ totalQuestions }} questions extracted from {{ fileNameRef }}
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <UiBadge
            :variant="getOverallConfidenceVariant()"
            class="text-sm"
          >
            Overall Confidence: {{ overallConfidence }}/5
          </UiBadge>
          <UiButton
            variant="outline"
            @click="showValidationPanel = !showValidationPanel"
          >
            <Icon
              name="line-md:check-list-3"
              class="mr-2"
            />
            Validation
          </UiButton>
          <UiButton
            :disabled="!hasChanges"
            @click="saveChanges"
          >
            <Icon
              name="line-md:confirm"
              class="mr-2"
            />
            Save Changes
          </UiButton>
          <UiButton
            variant="outline"
            @click="saveTestForLater"
          >
            <Icon
              name="line-md:download"
              class="mr-2"
            />
            Save Test
          </UiButton>
        </div>
      </div>
    </div>

    <div class="flex h-[calc(100vh-80px)]">
      <!-- Left Sidebar - Question List -->
      <div class="w-80 border-r bg-white dark:bg-slate-800 flex flex-col shadow-sm">
        <!-- Filters -->
        <div class="p-4 border-b space-y-3">
          <div>
            <UiLabel class="text-sm font-medium">
              Filter by Confidence
            </UiLabel>
            <UiSelect v-model="confidenceFilter">
              <UiSelectTrigger class="mt-1">
                <UiSelectValue placeholder="All questions" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="all">
                  All Questions
                </UiSelectItem>
                <UiSelectItem value="low">
                  Low Confidence (≤2.5)
                </UiSelectItem>
                <UiSelectItem value="medium">
                  Medium Confidence (2.5-4)
                </UiSelectItem>
                <UiSelectItem value="high">
                  High Confidence (≥4)
                </UiSelectItem>
                <UiSelectItem value="needs-review">
                  Needs Review
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>

          <div>
            <UiLabel class="text-sm font-medium">
              Filter by Type
            </UiLabel>
            <UiSelect v-model="typeFilter">
              <UiSelectTrigger class="mt-1">
                <UiSelectValue placeholder="All types" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="all">
                  All Types
                </UiSelectItem>
                <UiSelectItem value="MCQ">
                  MCQ
                </UiSelectItem>
                <UiSelectItem value="MSQ">
                  MSQ
                </UiSelectItem>
                <UiSelectItem value="NAT">
                  NAT
                </UiSelectItem>
                <UiSelectItem value="MSM">
                  MSM
                </UiSelectItem>
                <UiSelectItem value="Diagram">
                  Diagram
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>

          <div class="flex items-center space-x-2">
            <UiCheckbox
              id="show-diagrams"
              v-model:checked="showDiagramsOnly"
            />
            <UiLabel
              for="show-diagrams"
              class="text-sm"
            >
              Show diagrams only
            </UiLabel>
          </div>
        </div>

        <!-- Question List -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-2 space-y-1">
            <div
              v-for="question in filteredQuestions"
              :key="question.id"
              :class="[
                'p-3 rounded-lg cursor-pointer transition-all border',
                selectedQuestionId === question.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-md'
                  : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600',
                getQuestionHighlightClass(question),
              ]"
              @click="selectQuestion(question.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2 mb-1">
                    <UiBadge
                      :variant="getQuestionTypeVariant(question.type)"
                      class="text-xs"
                    >
                      {{ question.type }}
                    </UiBadge>
                    <UiBadge
                      v-if="question.hasDiagram"
                      variant="outline"
                      class="text-xs text-orange-600 border-orange-600"
                    >
                      <Icon
                        name="line-md:image"
                        class="mr-1 h-3 w-3"
                      />
                      Diagram
                    </UiBadge>
                    <span class="text-xs text-muted-foreground">
                      Q{{ question.questionNumber }}
                    </span>
                  </div>
                  <p class="text-sm font-medium line-clamp-2 mb-1 text-slate-800 dark:text-slate-200">
                    {{ question.text }}
                  </p>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-600 dark:text-slate-400">
                      {{ question.subject }} • {{ question.section }}
                    </span>
                    <div class="flex items-center space-x-1">
                      <div
                        class="w-2 h-2 rounded-full"
                        :style="{ backgroundColor: getConfidenceColor(question.confidence) }"
                      />
                      <span class="text-xs font-medium">{{ question.confidence }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="p-4 border-t bg-slate-100 dark:bg-slate-700/50">
          <div class="text-sm space-y-1 text-slate-700 dark:text-slate-300">
            <div class="flex justify-between">
              <span>Total Questions:</span>
              <span class="font-medium text-slate-900 dark:text-slate-100">{{ filteredQuestions.length }}</span>
            </div>
            <div class="flex justify-between">
              <span>Needs Review:</span>
              <span class="font-medium text-red-600 dark:text-red-400">{{ questionsNeedingReview }}</span>
            </div>
            <div class="flex justify-between">
              <span>Has Diagrams:</span>
              <span class="font-medium text-orange-600 dark:text-orange-400">{{ questionsWithDiagrams }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex">
        <!-- Question Editor -->
        <div class="flex-1 flex flex-col">
          <div
            v-if="selectedQuestion"
            class="flex-1 overflow-y-auto"
          >
            <!-- Question Header -->
            <div class="p-6 border-b bg-white dark:bg-slate-800 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Question {{ selectedQuestion.questionNumber }}
                </h2>
                <div class="flex items-center space-x-2">
                  <UiBadge :variant="getQuestionTypeVariant(selectedQuestion.type)">
                    {{ selectedQuestion.type }}
                  </UiBadge>
                  <div class="flex items-center space-x-1">
                    <span class="text-sm text-muted-foreground">Confidence:</span>
                    <UiBadge
                      :style="{ backgroundColor: getConfidenceColor(selectedQuestion.confidence) }"
                      class="text-white"
                    >
                      {{ selectedQuestion.confidence }}/5
                    </UiBadge>
                  </div>
                </div>
              </div>

              <!-- Confidence Adjustment -->
              <div class="mb-4">
                <UiLabel class="text-sm font-medium mb-2 block">
                  Adjust Confidence Score
                </UiLabel>
                <div class="flex items-center space-x-4">
                  <input
                    v-model="selectedQuestion.confidence"
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    class="flex-1"
                    @input="markAsChanged"
                  >
                  <span class="text-sm font-medium w-12">{{ selectedQuestion.confidence }}</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {{ getConfidenceDescription(selectedQuestion.confidence) }}
                </p>
              </div>
            </div>

            <!-- Question Content Editor -->
            <div class="p-6 space-y-6 bg-white dark:bg-slate-800">
              <!-- Basic Information -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <UiLabel for="subject">
                    Subject
                  </UiLabel>
                  <UiInput
                    id="subject"
                    v-model="selectedQuestion.subject"
                    placeholder="Enter subject"
                    @input="markAsChanged"
                  />
                </div>
                <div>
                  <UiLabel for="section">
                    Section
                  </UiLabel>
                  <UiInput
                    id="section"
                    v-model="selectedQuestion.section"
                    placeholder="Enter section"
                    @input="markAsChanged"
                  />
                </div>
                <div>
                  <UiLabel for="question-number">
                    Question Number
                  </UiLabel>
                  <UiInput
                    id="question-number"
                    v-model.number="selectedQuestion.questionNumber"
                    type="number"
                    min="1"
                    @input="markAsChanged"
                  />
                </div>
              </div>

              <!-- Question Type and Diagram Toggle -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <UiLabel for="question-type">
                    Question Type
                  </UiLabel>
                  <UiSelect
                    v-model="selectedQuestion.type"
                    @update:model-value="markAsChanged"
                  >
                    <UiSelectTrigger>
                      <UiSelectValue />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem value="MCQ">
                        MCQ - Multiple Choice
                      </UiSelectItem>
                      <UiSelectItem value="MSQ">
                        MSQ - Multiple Select
                      </UiSelectItem>
                      <UiSelectItem value="NAT">
                        NAT - Numerical Answer
                      </UiSelectItem>
                      <UiSelectItem value="MSM">
                        MSM - Matrix Match
                      </UiSelectItem>
                      <UiSelectItem value="Diagram">
                        Diagram Question
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                </div>
                <div class="flex items-end">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center space-x-2">
                      <UiSwitch
                        id="has-diagram"
                        v-model:checked="selectedQuestion.hasDiagram"
                        @update:checked="handleDiagramToggle"
                      />
                      <UiLabel
                        for="has-diagram"
                        class="flex items-center cursor-pointer"
                      >
                        <Icon
                          name="line-md:image"
                          class="mr-2"
                        />
                        Has Diagram
                      </UiLabel>
                    </div>
                    <p v-if="!selectedQuestion.hasDiagram" class="text-xs text-slate-500 dark:text-slate-400 ml-11">
                      Toggle ON to manually crop diagram
                    </p>
                  </div>
                </div>
              </div>

              <!-- Diagrams Section (Moved above question text) -->
              <div v-if="selectedQuestion.hasDiagram" class="border-t pt-6">
                <div class="flex items-center justify-between mb-4">
                  <UiLabel class="text-base font-semibold">Diagrams</UiLabel>
                  <div class="flex items-center gap-2">
                    <UiBadge variant="outline" class="text-orange-600 border-orange-600">
                      <Icon name="lucide:image" class="h-3 w-3 mr-1" />
                      {{ selectedQuestion.diagrams?.length || 0 }} diagram(s)
                    </UiBadge>
                    <UiButton
                      size="sm"
                      variant="outline"
                      @click="openDiagramCropper"
                      :disabled="!pdfBuffer"
                    >
                      <Icon name="lucide:crop" class="h-4 w-4 mr-2" />
                      {{ selectedQuestion.diagrams?.length ? 'Add/Edit Diagram' : 'Crop Diagram' }}
                    </UiButton>
                    <span v-if="!pdfBuffer" class="text-xs text-slate-500">
                      (Loading PDF...)
                    </span>
                  </div>
                </div>
                
                <div v-if="selectedQuestion.diagrams && selectedQuestion.diagrams.length > 0" class="space-y-4">
                  <div 
                    v-for="(diagram, idx) in selectedQuestion.diagrams" 
                    :key="idx"
                    class="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {{ diagram.label || `Diagram ${idx + 1}` }}
                      </span>
                      <UiBadge variant="outline" class="text-xs">
                        Page {{ diagram.pageNumber }}
                      </UiBadge>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-400 mb-3">
                      Coordinates: ({{ diagram.boundingBox.x.toFixed(2) }}, {{ diagram.boundingBox.y.toFixed(2) }}) 
                      • Size: {{ (diagram.boundingBox.width * 100).toFixed(0) }}% × {{ (diagram.boundingBox.height * 100).toFixed(0) }}%
                      • Confidence: {{ diagram.confidence }}/5
                    </p>
                    
                    <!-- Rendered Diagram Image -->
                    <div v-if="getDiagramImage(selectedQuestion.id, diagram.pageNumber)" class="rounded overflow-hidden border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                      <img 
                        :src="getDiagramImage(selectedQuestion.id, diagram.pageNumber)!" 
                        :alt="diagram.label || `Diagram ${idx + 1}`"
                        class="w-full h-auto object-contain max-h-96"
                        style="image-rendering: crisp-edges;"
                      />
                    </div>
                    
                    <!-- Loading/Placeholder -->
                    <div v-else class="bg-slate-200 dark:bg-slate-600 rounded p-8 text-center text-slate-500 dark:text-slate-400">
                      <Icon name="lucide:image" class="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p class="text-sm">{{ pdfBuffer ? 'Rendering diagram...' : 'Loading PDF buffer...' }}</p>
                      <p class="text-xs mt-1">{{ pdfBuffer ? 'Please wait' : 'Diagram will appear once loaded' }}</p>
                    </div>
                  </div>
                </div>
                
                <div v-else class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div class="flex items-start gap-3">
                    <Icon name="lucide:alert-circle" class="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p class="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Diagram detected but coordinates not available
                      </p>
                      <p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        This question has a diagram, but coordinate detection was not run during extraction.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Question Text -->
              <div>
                <UiLabel for="question-text">
                  Question Text
                </UiLabel>
                <UiTextarea
                  id="question-text"
                  v-model="selectedQuestion.text"
                  placeholder="Enter the question text..."
                  rows="4"
                  class="mt-1"
                  @input="markAsChanged"
                />
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Characters: {{ selectedQuestion.text.length }}
                </p>
              </div>

              <!-- Options Editor (for MCQ, MSQ, MSM) -->
              <div v-if="shouldShowOptions(selectedQuestion.type)">
                <div class="flex items-center justify-between mb-3">
                  <UiLabel>Answer Options</UiLabel>
                  <UiButton
                    variant="outline"
                    size="sm"
                    @click="addOption"
                  >
                    <Icon
                      name="line-md:plus"
                      class="mr-2"
                    />
                    Add Option
                  </UiButton>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(option, index) in selectedQuestion.options"
                    :key="index"
                    class="flex items-center space-x-2"
                  >
                    <span class="text-sm font-medium w-8">{{ String.fromCharCode(65 + index) }})</span>
                    <UiInput
                      v-model="selectedQuestion.options[index]"
                      :placeholder="`Option ${String.fromCharCode(65 + index)}`"
                      class="flex-1"
                      @input="markAsChanged"
                    />
                    <UiButton
                      variant="ghost"
                      size="sm"
                      :disabled="selectedQuestion.options.length <= 2"
                      @click="removeOption(index)"
                    >
                      <Icon name="line-md:close" />
                    </UiButton>
                  </div>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {{ getOptionRequirements(selectedQuestion.type) }}
                </p>
              </div>

              <!-- Page Information -->
              <div>
                <UiLabel for="page-number">
                  Page Number
                </UiLabel>
                <UiInput
                  id="page-number"
                  v-model.number="selectedQuestion.pageNumber"
                  type="number"
                  min="1"
                  @input="markAsChanged"
                />
              </div>
            </div>
          </div>

          <!-- No Question Selected -->
          <div
            v-else
            class="flex-1 flex items-center justify-center bg-white dark:bg-slate-800"
          >
            <div class="text-center text-slate-500 dark:text-slate-400">
              <Icon
                name="line-md:document-list"
                class="h-16 w-16 mx-auto mb-4 opacity-50"
              />
              <h3 class="text-lg font-medium mb-2">
                No Question Selected
              </h3>
              <p>Select a question from the list to start editing</p>
            </div>
          </div>
        </div>

        <!-- Validation Panel -->
        <div
          v-if="showValidationPanel"
          class="w-80 border-l bg-white dark:bg-slate-800 flex flex-col shadow-sm"
        >
          <div class="p-4 border-b bg-slate-50 dark:bg-slate-700/50">
            <h3 class="font-semibold text-slate-900 dark:text-slate-100">
              Validation Results
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Real-time validation feedback
            </p>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div
              v-if="validationResults"
              class="space-y-4"
            >
              <!-- Overall Status -->
              <div
                class="p-3 rounded-lg border"
                :class="validationResults.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
              >
                <div class="flex items-center space-x-2">
                  <Icon
                    :name="validationResults.isValid ? 'line-md:confirm' : 'line-md:alert'"
                    :class="validationResults.isValid ? 'text-green-600' : 'text-red-600'"
                  />
                  <span
                    class="font-medium"
                    :class="validationResults.isValid ? 'text-green-800' : 'text-red-800'"
                  >
                    {{ validationResults.isValid ? 'All Valid' : 'Issues Found' }}
                  </span>
                </div>
              </div>

              <!-- Errors -->
              <div v-if="validationResults.errors.length > 0">
                <h4 class="font-medium text-red-700 mb-2">
                  Errors
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="error in validationResults.errors"
                    :key="error.code"
                    class="p-2 bg-red-50 border border-red-200 rounded text-sm"
                  >
                    <div class="font-medium text-red-800">
                      {{ error.field }}
                    </div>
                    <div class="text-red-600">
                      {{ error.message }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Warnings -->
              <div v-if="validationResults.warnings.length > 0">
                <h4 class="font-medium text-yellow-700 mb-2">
                  Warnings
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="warning in validationResults.warnings"
                    :key="warning.code"
                    class="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                  >
                    <div class="font-medium text-yellow-800">
                      {{ warning.field }}
                    </div>
                    <div class="text-yellow-600">
                      {{ warning.message }}
                    </div>
                    <div class="text-yellow-500 text-xs mt-1">
                      {{ warning.suggestion }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Issues -->
              <div
                v-if="validationResults.isValid"
                class="text-center text-green-600"
              >
                <Icon
                  name="line-md:confirm-circle"
                  class="h-8 w-8 mx-auto mb-2"
                />
                <p class="text-sm">
                  No validation issues found
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Confirmation Dialog -->
    <UiDialog v-model:open="showSaveDialog">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Save Changes</UiDialogTitle>
          <UiDialogDescription>
            You have made changes to {{ changedQuestions.length }} question(s).
            Do you want to save these changes?
          </UiDialogDescription>
        </UiDialogHeader>
        <UiDialogFooter>
          <UiButton
            variant="outline"
            @click="showSaveDialog = false"
          >
            Cancel
          </UiButton>
          <UiButton @click="confirmSave">
            Save Changes
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>

    <!-- Diagram Cropper Modal -->
    <ClientOnly>
      <UiDialog v-model:open="showDiagramCropper" :modal="true">
        <UiDialogContent class="max-w-6xl max-h-[90vh] overflow-hidden" style="z-index: 9999 !important;">
          <UiDialogHeader>
            <UiDialogTitle>Crop Diagram for Question {{ selectedQuestion?.questionNumber }}</UiDialogTitle>
            <UiDialogDescription>
              Select the diagram area from the PDF page. You can drag and resize the selection box.
            </UiDialogDescription>
          </UiDialogHeader>
          
          <!-- Debug Info -->
          <div class="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded text-sm mb-3 font-mono">
            <p><strong>Debug Info:</strong></p>
            <p>PDF Buffer: {{ pdfBuffer ? '✅ Loaded (' + (pdfBuffer.byteLength / 1024 / 1024).toFixed(2) + 'MB)' : '❌ Not loaded' }}</p>
            <p>Selected Question: {{ selectedQuestion ? '✅ Q' + selectedQuestion.questionNumber : '❌ None' }}</p>
            <p>Coordinates: {{ currentDiagramCoordinates ? '✅ Ready' : '❌ Not set' }}</p>
            <p>All conditions met: {{ !!(pdfBuffer && selectedQuestion && currentDiagramCoordinates) }}</p>
          </div>
        
        <div v-if="currentDiagramCoordinates" class="overflow-y-auto max-h-[70vh]">
          <p class="text-green-600 mb-2">✅ Rendering DiagramCoordinateEditor...</p>
          <DiagramCoordinateEditor
            v-if="pdfBuffer"
            :pdf-buffer="pdfBuffer.slice(0)"
            :coordinates="currentDiagramCoordinates"
            @update:coordinates="handleDiagramCropped"
          />
          <p v-else class="text-red-600">❌ PDF Buffer missing!</p>
        </div>
        
        <!-- Loading/Error State -->
        <div v-else class="p-8 text-center bg-red-50 dark:bg-red-900/20 rounded">
          <Icon name="lucide:alert-circle" class="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p class="text-slate-900 dark:text-slate-100 mb-2 font-bold">
            {{ !pdfBuffer ? 'Loading PDF buffer...' : !currentDiagramCoordinates ? 'Coordinates not set!' : 'Loading editor...' }}
          </p>
          <p class="text-xs text-slate-600 dark:text-slate-400">
            Buffer: {{ !!pdfBuffer }} | Question: {{ !!selectedQuestion }} | Coords: {{ !!currentDiagramCoordinates }}
          </p>
          <pre class="text-left text-xs mt-2 p-2 bg-white dark:bg-slate-800 rounded overflow-auto">{{ currentDiagramCoordinates }}</pre>
        </div>
        
        <UiDialogFooter>
          <UiButton
            variant="outline"
            @click="showDiagramCropper = false"
          >
            Cancel
          </UiButton>
          <UiButton @click="saveCroppedDiagram">
            <Icon name="lucide:check" class="h-4 w-4 mr-2" />
            Save Diagram
          </UiButton>
        </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { confidenceUtils, createQuestionValidator } from '#layers/shared/app/utils/confidenceScoringUtils'
import type { AIExtractedQuestion } from '#layers/shared/app/utils/geminiAPIClient'
import type { ValidationResult } from '#layers/shared/app/utils/confidenceScoringUtils'

// Props
const props = defineProps<{
  questions: AIExtractedQuestion[]
  fileName?: string
}>()

// Add fileName as a reactive reference for the template
const fileNameRef = ref<string>('Unknown PDF')

// PDF buffer for diagram rendering
const pdfBuffer = ref<ArrayBuffer | null>(null)
const diagramImages = ref<Map<string, string>>(new Map()) // Cache rendered diagrams

// Diagram cropper state
const showDiagramCropper = ref(false)
const currentDiagramCoordinates = ref<any>(null)
const tempCroppedDiagram = ref<any>(null)

// Emits
const emit = defineEmits<{
  questionsUpdated: [questions: AIExtractedQuestion[]]
  save: [questions: AIExtractedQuestion[]]
}>()

// Reactive state
const selectedQuestionId = ref<number | null>(null)
const confidenceFilter = ref('all')
const typeFilter = ref('all')
const showDiagramsOnly = ref(false)
const showValidationPanel = ref(false)
const showSaveDialog = ref(false)
const hasChanges = ref(false)
const changedQuestions = ref<Set<number>>(new Set())

// Local copy of questions for editing
const editableQuestions = ref<AIExtractedQuestion[]>([])

// Validation
const validator = createQuestionValidator()
const validationResults = ref<ValidationResult | null>(null)

// Computed properties
const selectedQuestion = computed(() => {
  return editableQuestions.value.find(q => q.id === selectedQuestionId.value) || null
})

const totalQuestions = computed(() => editableQuestions.value.length)

const overallConfidence = computed(() => {
  if (editableQuestions.value.length === 0) return 0
  const total = editableQuestions.value.reduce((sum, q) => sum + q.confidence, 0)
  return Math.round((total / editableQuestions.value.length) * 10) / 10
})

const filteredQuestions = computed(() => {
  let filtered = [...editableQuestions.value]

  // Confidence filter
  if (confidenceFilter.value !== 'all') {
    switch (confidenceFilter.value) {
      case 'low':
        filtered = filtered.filter(q => q.confidence <= 2.5)
        break
      case 'medium':
        filtered = filtered.filter(q => q.confidence > 2.5 && q.confidence < 4)
        break
      case 'high':
        filtered = filtered.filter(q => q.confidence >= 4)
        break
      case 'needs-review':
        filtered = filtered.filter(q => confidenceUtils.requiresManualReview(q))
        break
    }
  }

  // Type filter
  if (typeFilter.value !== 'all') {
    filtered = filtered.filter(q => q.type === typeFilter.value)
  }

  // Diagram filter
  if (showDiagramsOnly.value) {
    filtered = filtered.filter(q => q.hasDiagram)
  }

  return filtered
})

const questionsNeedingReview = computed(() => {
  return editableQuestions.value.filter(q => confidenceUtils.requiresManualReview(q)).length
})

const questionsWithDiagrams = computed(() => {
  return editableQuestions.value.filter(q => q.hasDiagram).length
})

// Methods
const selectQuestion = (questionId: number) => {
  selectedQuestionId.value = questionId
  validateCurrentQuestion()
}

const markAsChanged = () => {
  if (selectedQuestionId.value) {
    changedQuestions.value.add(selectedQuestionId.value)
    hasChanges.value = true
    validateCurrentQuestion()
  }
}

const validateCurrentQuestion = () => {
  if (selectedQuestion.value) {
    validationResults.value = validator.validateQuestion(selectedQuestion.value)
  }
}

const shouldShowOptions = (type: string): boolean => {
  return ['MCQ', 'MSQ', 'MSM'].includes(type)
}

const addOption = () => {
  if (selectedQuestion.value) {
    selectedQuestion.value.options.push('')
    markAsChanged()
  }
}

const removeOption = (index: number) => {
  if (selectedQuestion.value && selectedQuestion.value.options.length > 2) {
    selectedQuestion.value.options.splice(index, 1)
    markAsChanged()
  }
}

const getOptionRequirements = (type: string): string => {
  switch (type) {
    case 'MCQ':
      return 'MCQ questions typically have 4-5 options'
    case 'MSQ':
      return 'MSQ questions need at least 3 options'
    case 'MSM':
      return 'MSM questions need at least 4 options for matching'
    default:
      return ''
  }
}

const getQuestionTypeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warn' | 'info' => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warn' | 'info'> = {
    MCQ: 'default',
    MSQ: 'secondary',
    NAT: 'outline',
    MSM: 'destructive',
    Diagram: 'warn',
  }
  return variants[type] || 'default'
}

const getConfidenceColor = (score: number): string => {
  return confidenceUtils.getConfidenceColor(score)
}

const getConfidenceDescription = (score: number): string => {
  return confidenceUtils.getConfidenceDescription(score)
}

const getOverallConfidenceVariant = () => {
  if (overallConfidence.value >= 4) return 'default'
  if (overallConfidence.value >= 2.5) return 'secondary'
  return 'destructive'
}

const getQuestionHighlightClass = (question: AIExtractedQuestion): string => {
  if (confidenceUtils.requiresManualReview(question)) {
    return 'border-l-4 border-l-red-500'
  }
  if (question.hasDiagram) {
    return 'border-l-4 border-l-orange-500'
  }
  return ''
}

const saveChanges = () => {
  if (hasChanges.value) {
    showSaveDialog.value = true
  }
}

const confirmSave = () => {
  emit('questionsUpdated', [...editableQuestions.value])
  emit('save', [...editableQuestions.value])
  hasChanges.value = false
  changedQuestions.value.clear()
  showSaveDialog.value = false
}

const saveTestForLater = async () => {
  try {
    // Prepare test data for saving
    const testData = {
      questions: editableQuestions.value,
      metadata: {
        fileName: props.fileName || fileNameRef.value || 'Unknown Test',
        totalQuestions: editableQuestions.value.length,
        savedAt: Date.now(),
        savedBy: 'ai-review-interface',
        overallConfidence: overallConfidence.value,
        questionsNeedingReview: questionsNeedingReview.value,
        questionsWithDiagrams: questionsWithDiagrams.value,
        hasUnsavedChanges: hasChanges.value,
      },
      version: '1.0',
    }

    // Generate a unique test ID
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Save to localStorage (and eventually to IndexedDB)
    const savedTests = JSON.parse(localStorage.getItem('rankify-saved-tests') || '[]')
    savedTests.push({
      id: testId,
      data: testData,
      lastModified: Date.now(),
    })

    // Keep only last 50 saved tests to prevent storage overflow
    if (savedTests.length > 50) {
      savedTests.splice(0, savedTests.length - 50)
    }

    localStorage.setItem('rankify-saved-tests', JSON.stringify(savedTests))

    // Show success message
    console.log(`Test saved successfully with ID: ${testId}`)

    // Optional: Show toast notification
    // toast.success('Test saved successfully! You can load it later from the main page.')

    // Clear any existing draft since we've saved the final version
    clearDraftFromStorage()
  }
  catch (error) {
    console.error('Failed to save test:', error)
    // toast.error('Failed to save test. Please try again.')
  }
}

// Auto-save functionality
let autoSaveTimer: NodeJS.Timeout | null = null

const _scheduleAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }

  autoSaveTimer = setTimeout(() => {
    if (hasChanges.value) {
      saveDraftToStorage()
    }
  }, 2000) // Auto-save after 2 seconds of inactivity
}

const saveDraftToStorage = () => {
  try {
    const draftData = {
      questions: editableQuestions.value,
      lastSaved: Date.now(),
      hasUnsavedChanges: hasChanges.value,
    }
    localStorage.setItem('rankify-review-draft', JSON.stringify(draftData))
  }
  catch (error) {
    console.warn('Failed to save draft:', error)
  }
}

const loadDraftFromStorage = () => {
  try {
    const draftData = localStorage.getItem('rankify-review-draft')
    if (draftData) {
      const draft = JSON.parse(draftData)
      if (draft.questions && draft.questions.length > 0) {
        // Check if draft is newer than current data
        if ((!props.questions || !props.questions.length) || draft.lastSaved > Date.now() - 300000) { // 5 minutes
          editableQuestions.value = draft.questions
          hasChanges.value = draft.hasUnsavedChanges || false
        }
      }
    }
  }
  catch (error) {
    console.warn('Failed to load draft:', error)
  }
}

const clearDraftFromStorage = () => {
  try {
    localStorage.removeItem('rankify-review-draft')
  }
  catch (error) {
    console.warn('Failed to clear draft:', error)
  }
}

// Note: Auto-save is handled directly in markAsChanged via scheduleAutoSave()

// Load PDF buffer from IndexedDB
const loadPDFBuffer = async () => {
  try {
    const { listAllPDFs, getPDFBuffer } = await import('#layers/shared/app/utils/diagramStorage')
    
    // Get all stored PDFs
    const pdfs = await listAllPDFs()
    console.log('📦 Found stored PDFs:', pdfs.length)
    
    if (pdfs.length > 0) {
      // Get the most recent PDF (or match by filename)
      const targetPdf = pdfs.find(pdf => pdf.fileName === props.fileName) || pdfs[pdfs.length - 1]
      console.log('📄 Loading PDF:', targetPdf.fileName)
      
      const buffer = await getPDFBuffer(targetPdf.id)
      if (buffer) {
        pdfBuffer.value = buffer
        console.log('✅ PDF buffer loaded:', (buffer.byteLength / 1024 / 1024).toFixed(2), 'MB')
        
        // Render diagrams for questions with diagrams
        await renderDiagrams()
      }
    } else {
      console.warn('⚠️ No PDF buffers found in storage')
    }
  } catch (error) {
    console.error('❌ Failed to load PDF buffer:', error)
  }
}

// Render diagrams from PDF buffer
const renderDiagrams = async () => {
  if (!pdfBuffer.value) return
  
  try {
    const { renderDiagramFromPDF } = await import('#layers/shared/app/utils/diagramCoordinateUtils')
    
    // Render diagrams for all questions
    for (const question of editableQuestions.value) {
      if (question.hasDiagram && question.diagrams && question.diagrams.length > 0) {
        for (const diagram of question.diagrams) {
          const key = `${question.id}-${diagram.pageNumber}`
          
          try {
            // Pass the ArrayBuffer, not the PDF document object
            const imageData = await renderDiagramFromPDF(
              pdfBuffer.value,
              diagram,
              2 // scale
            )
            diagramImages.value.set(key, imageData)
            console.log(`✅ Rendered diagram for Q${question.id}`)
          } catch (error) {
            console.error(`❌ Failed to render diagram for Q${question.id}:`, error)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to render diagrams:', error)
  }
}

// Get rendered diagram image
const getDiagramImage = (questionId: number, pageNumber: number): string | null => {
  const key = `${questionId}-${pageNumber}`
  return diagramImages.value.get(key) || null
}

// Handle diagram toggle
const handleDiagramToggle = (checked: boolean) => {
  markAsChanged()
  
  // If toggled ON and no diagrams exist, open cropper
  if (checked && (!selectedQuestion.value?.diagrams || selectedQuestion.value.diagrams.length === 0)) {
    if (pdfBuffer.value) {
      console.log('📸 Opening diagram cropper for manual selection...')
      // Small delay to let the UI update
      setTimeout(() => {
        openDiagramCropper()
      }, 100)
    } else {
      console.warn('⚠️ PDF buffer not loaded yet')
      alert('PDF is still loading. Please wait a moment and try again.')
      // Revert the toggle
      if (selectedQuestion.value) {
        selectedQuestion.value.hasDiagram = false
      }
    }
  }
  
  // If toggled OFF, clear diagrams
  if (!checked && selectedQuestion.value) {
    selectedQuestion.value.diagrams = []
    console.log('🗑️ Cleared diagrams for question', selectedQuestion.value.questionNumber)
  }
}

// Open diagram cropper
const openDiagramCropper = async () => {
  console.log('🎨 Opening diagram cropper...')
  console.log('  - Selected question:', selectedQuestion.value?.questionNumber)
  console.log('  - PDF buffer available:', !!pdfBuffer.value)
  console.log('  - PDF buffer size:', pdfBuffer.value ? (pdfBuffer.value.byteLength / 1024 / 1024).toFixed(2) + 'MB' : 'N/A')
  console.log('  - showDiagramCropper before:', showDiagramCropper.value)
  
  if (!selectedQuestion.value) {
    console.error('❌ No question selected')
    return
  }
  
  if (!pdfBuffer.value) {
    console.error('❌ No PDF buffer available')
    alert('PDF buffer not loaded yet. Please wait a moment and try again.')
    return
  }
  
  // If question already has a diagram, use its coordinates
  if (selectedQuestion.value.diagrams && selectedQuestion.value.diagrams.length > 0) {
    currentDiagramCoordinates.value = selectedQuestion.value.diagrams[0]
    console.log('✅ Using existing diagram coordinates')
  } else {
    // Create default coordinates (center of page)
    currentDiagramCoordinates.value = {
      pageNumber: selectedQuestion.value.pageNumber,
      boundingBox: {
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.6
      },
      confidence: 5,
      label: `Diagram for Q${selectedQuestion.value.questionNumber}`,
      type: 'other',
      description: 'Manually cropped diagram'
    }
    console.log('✅ Created default diagram coordinates')
  }
  
  console.log('  - Coordinates:', currentDiagramCoordinates.value)
  console.log('  - Coordinates type:', typeof currentDiagramCoordinates.value)
  console.log('  - Coordinates keys:', currentDiagramCoordinates.value ? Object.keys(currentDiagramCoordinates.value) : 'null')
  
  showDiagramCropper.value = true
  console.log('✅ Modal opened:', showDiagramCropper.value)
  
  // Force a nextTick to ensure reactivity
  await nextTick()
  console.log('After nextTick - currentDiagramCoordinates still set:', !!currentDiagramCoordinates.value)
}

// Handle diagram cropped
const handleDiagramCropped = (coordinates: any) => {
  tempCroppedDiagram.value = coordinates
}

// Save cropped diagram
const saveCroppedDiagram = async () => {
  if (!selectedQuestion.value || !tempCroppedDiagram.value) return
  
  // Initialize diagrams array if it doesn't exist
  if (!selectedQuestion.value.diagrams) {
    selectedQuestion.value.diagrams = []
  }
  
  // Add or update the diagram
  if (selectedQuestion.value.diagrams.length > 0) {
    selectedQuestion.value.diagrams[0] = tempCroppedDiagram.value
  } else {
    selectedQuestion.value.diagrams.push(tempCroppedDiagram.value)
  }
  
  // Mark as changed
  markAsChanged()
  
  // Re-render the diagram
  await renderSingleDiagram(selectedQuestion.value.id, tempCroppedDiagram.value)
  
  // Close the cropper
  showDiagramCropper.value = false
  tempCroppedDiagram.value = null
  
  console.log('✅ Diagram saved for question', selectedQuestion.value.questionNumber)
}

// Render a single diagram
const renderSingleDiagram = async (questionId: number, diagram: any) => {
  if (!pdfBuffer.value) return
  
  try {
    const { renderDiagramFromPDF } = await import('#layers/shared/app/utils/diagramCoordinateUtils')
    
    const key = `${questionId}-${diagram.pageNumber}`
    
    // Pass the ArrayBuffer and the full diagram coordinates object
    const imageData = await renderDiagramFromPDF(
      pdfBuffer.value,
      diagram,
      2 // scale
    )
    
    diagramImages.value.set(key, imageData)
    console.log(`✅ Rendered diagram for Q${questionId}`)
  } catch (error) {
    console.error(`❌ Failed to render diagram:`, error)
  }
}

// Initialize
onMounted(async () => {
  // Try to load from props first, then from localStorage
  if (props.questions && props.questions.length > 0) {
    editableQuestions.value = JSON.parse(JSON.stringify(props.questions))
  }
  else {
    // Try to load from AI extractor data
    const reviewData = localStorage.getItem('rankify-review-data')
    if (reviewData) {
      try {
        const data = JSON.parse(reviewData)
        editableQuestions.value = data.questions || []
        // Clean up the stored data after loading
        localStorage.removeItem('rankify-review-data')
      }
      catch (error) {
        console.warn('Failed to load review data:', error)
      }
    }

    // Load draft as fallback
    if (editableQuestions.value.length === 0) {
      loadDraftFromStorage()
    }
  }

  if (editableQuestions.value.length > 0) {
    selectedQuestionId.value = editableQuestions.value[0].id
    validateCurrentQuestion()
  }
  
  // Load PDF buffer for diagram rendering
  await loadPDFBuffer()
})

// Watch for prop changes
watch(() => props.questions, (newQuestions) => {
  if (!hasChanges.value) {
    editableQuestions.value = JSON.parse(JSON.stringify(newQuestions))
  }
}, { deep: true })
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
