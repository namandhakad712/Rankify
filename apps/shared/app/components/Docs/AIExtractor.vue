<template>
  <div class="min-h-screen bg-background">
    <!-- Header Section -->
    <div class="border border-blue-500 rounded-2xl p-4 text-center text-foreground bg-background mb-6">
      <h1 class="text-xl font-semibold text-blue-500">
        AI-Powered PDF Question Extraction
      </h1>
      <h2 class="text-lg font-semibold my-4">
        Upload your PDF and let AI automatically extract questions with confidence scoring
      </h2>
      
      <!-- Info Accordion -->
      <UiAccordion
        type="multiple"
        :default-value="['info']"
        :unmount-on-hide="false"
        class="w-full"
      >
        <UiAccordionItem value="info">
          <UiAccordionTrigger>
            About AI Extraction
          </UiAccordionTrigger>
          <UiAccordionContent>
            <div class="flex flex-col gap-4 text-left leading-[2rem]">
              <div>
                <strong>How it works:</strong>
                <ul class="list-disc ml-6">
                  <li>Upload a PDF containing questions</li>
                  <li>AI analyzes the content and extracts questions automatically</li>
                  <li>Each question gets a confidence score (1-5 scale)</li>
                  <li>Review and edit extracted questions before finalizing</li>
                </ul>
              </div>
              <div>
                <strong>Supported Question Types:</strong>
                <ul class="list-disc ml-6">
                  <li><strong>MCQ:</strong> Multiple Choice (single answer)</li>
                  <li><strong>MSQ:</strong> Multiple Select (multiple answers)</li>
                  <li><strong>NAT:</strong> Numerical Answer Type</li>
                  <li><strong>Diagram:</strong> Questions with visual elements</li>
                </ul>
              </div>
              <div>
                <strong>Requirements:</strong>
                <ul class="list-disc ml-6">
                  <li>Valid Gemini API key</li>
                  <li>PDF file (max 10MB)</li>
                  <li>Clear, readable text in PDF</li>
                </ul>
              </div>
            </div>
          </UiAccordionContent>
        </UiAccordionItem>
      </UiAccordion>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Panel - Configuration -->
      <div class="lg:col-span-1">
        <UiCard class="p-6">
          <h3 class="text-lg font-semibold mb-4">Configuration</h3>
          
          <!-- API Key Input -->
          <div class="space-y-4">
            <div>
              <UiLabel for="api-key">Gemini API Key</UiLabel>
              <UiInput
                id="api-key"
                v-model="config.apiKey"
                type="password"
                placeholder="AIzaSy..."
                :disabled="isProcessing"
                class="mt-1"
              />
              <p class="text-sm text-muted-foreground mt-1">
                Get your API key from 
                <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-blue-500 underline">
                  Google AI Studio
                </a>
              </p>
            </div>

            <!-- Model Selection -->
            <div>
              <UiLabel for="model">AI Model</UiLabel>
              <UiSelect v-model="config.model" :disabled="isProcessing">
                <UiSelectTrigger>
                  <UiSelectValue placeholder="Select model" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Best Quality)</UiSelectItem>
                  <UiSelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Faster)</UiSelectItem>
                  <UiSelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fastest)</UiSelectItem>
                  <UiSelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</UiSelectItem>
                  <UiSelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</UiSelectItem>
                  <UiSelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy)</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>

            <!-- Confidence Threshold -->
            <div>
              <UiLabel for="threshold">Confidence Threshold</UiLabel>
              <div class="flex items-center space-x-2 mt-1">
                <span class="text-sm">1</span>
                <input
                  id="threshold"
                  v-model="config.confidenceThreshold"
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  class="flex-1"
                  :disabled="isProcessing"
                />
                <span class="text-sm">5</span>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                Current: {{ config.confidenceThreshold }} - {{ getConfidenceDescription(config.confidenceThreshold) }}
              </p>
            </div>

            <!-- Options -->
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <UiCheckbox
                  id="diagram-detection"
                  v-model:checked="config.enableDiagramDetection"
                  :disabled="isProcessing"
                />
                <UiLabel for="diagram-detection">Enable diagram detection</UiLabel>
              </div>
              <div class="flex items-center space-x-2">
                <UiCheckbox
                  id="enable-cache"
                  v-model:checked="config.enableCache"
                  :disabled="isProcessing"
                />
                <UiLabel for="enable-cache">Enable caching</UiLabel>
              </div>
            </div>
          </div>

          <!-- File Upload -->
          <div class="mt-6">
            <UiLabel>PDF File</UiLabel>
            <div class="mt-2">
              <SimpleFileUpload
                accept="application/pdf"
                label="Select PDF"
                :disabled="isProcessing || !isConfigValid"
                variant="default"
                class="w-full"
                @upload="handleFileUpload"
              />
            </div>
            <p v-if="selectedFile" class="text-sm text-muted-foreground mt-2">
              Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
            </p>
          </div>

          <!-- Extract Button -->
          <UiButton
            :disabled="!canStartExtraction"
            :loading="isProcessing"
            class="w-full mt-6"
            @click="startExtraction"
          >
            <Icon name="line-md:uploading-loop" v-if="isProcessing" class="mr-2" />
            <Icon name="line-md:document-add" v-else class="mr-2" />
            {{ isProcessing ? 'Extracting...' : 'Extract Questions' }}
          </UiButton>
        </UiCard>

        <!-- Statistics Card -->
        <UiCard v-if="extractionStats" class="p-4 mt-4">
          <h4 class="font-semibold mb-2">Extraction Statistics</h4>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Total Extractions:</span>
              <span>{{ extractionStats.totalExtractions }}</span>
            </div>
            <div class="flex justify-between">
              <span>Total Questions:</span>
              <span>{{ extractionStats.totalQuestions }}</span>
            </div>
            <div class="flex justify-between">
              <span>Avg Confidence:</span>
              <span>{{ extractionStats.averageConfidence.toFixed(1) }}/5</span>
            </div>
            <div class="flex justify-between">
              <span>Storage Used:</span>
              <span>{{ formatFileSize(extractionStats.storageUsed) }}</span>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Right Panel - Results -->
      <div class="lg:col-span-2">
        <!-- Progress Section -->
        <UiCard v-if="isProcessing || extractionProgress" class="p-6 mb-6">
          <h3 class="text-lg font-semibold mb-4">Extraction Progress</h3>
          
          <div v-if="extractionProgress" class="space-y-4">
            <!-- Progress Bar -->
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="capitalize">{{ extractionProgress.stage.replace('_', ' ') }}</span>
                <span>{{ extractionProgress.progress }}%</span>
              </div>
              <UiProgress :value="extractionProgress.progress" class="w-full" />
            </div>

            <!-- Current Message -->
            <p class="text-sm text-muted-foreground">
              {{ extractionProgress.message }}
            </p>

            <!-- Stage Indicators -->
            <div class="flex items-center space-x-2 text-xs">
              <div
                v-for="stage in progressStages"
                :key="stage.key"
                :class="[
                  'px-2 py-1 rounded-full',
                  getStageStatus(stage.key) === 'completed' ? 'bg-green-100 text-green-800' :
                  getStageStatus(stage.key) === 'current' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-600'
                ]"
              >
                {{ stage.label }}
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Results Section -->
        <UiCard v-if="extractionResult" class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Extraction Results</h3>
            <div class="flex space-x-2">
              <UiDropdownMenu>
                <UiDropdownMenuTrigger as-child>
                  <UiButton variant="outline" size="sm">
                    <Icon name="line-md:download-outline" class="mr-2" />
                    Export
                    <Icon name="line-md:chevron-down" class="ml-2" />
                  </UiButton>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent>
                  <UiDropdownMenuItem @click="exportResults('rankify')">
                    <Icon name="line-md:document" class="mr-2" />
                    Rankify Format (Recommended)
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem @click="exportResults('ai')">
                    <Icon name="line-md:code" class="mr-2" />
                    Raw AI Format
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
              <UiButton
                variant="outline"
                size="sm"
                @click="openReviewInterface"
              >
                <Icon name="line-md:edit" class="mr-2" />
                Review & Edit
              </UiButton>
            </div>
          </div>

          <!-- Summary Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="text-center p-3 bg-muted rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{{ extractionResult.questions.length }}</div>
              <div class="text-sm text-muted-foreground">Questions</div>
            </div>
            <div class="text-center p-3 bg-muted rounded-lg">
              <div class="text-2xl font-bold" :style="{ color: getConfidenceColor(extractionResult.confidence) }">
                {{ extractionResult.confidence }}/5
              </div>
              <div class="text-sm text-muted-foreground">Confidence</div>
            </div>
            <div class="text-center p-3 bg-muted rounded-lg">
              <div class="text-2xl font-bold text-orange-600">
                {{ extractionResult.questions.filter(q => q.hasDiagram).length }}
              </div>
              <div class="text-sm text-muted-foreground">Diagrams</div>
            </div>
            <div class="text-center p-3 bg-muted rounded-lg">
              <div class="text-2xl font-bold text-red-600">
                {{ extractionResult.questions.filter(q => requiresManualReview(q)).length }}
              </div>
              <div class="text-sm text-muted-foreground">Need Review</div>
            </div>
          </div>

          <!-- Confidence Distribution -->
          <div class="mb-6">
            <h4 class="font-semibold mb-2">Confidence Distribution</h4>
            <div class="space-y-2">
              <div v-for="level in confidenceLevels" :key="level.range" class="flex items-center">
                <div class="w-24 text-sm">{{ level.range }}</div>
                <div class="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                  <div
                    :class="level.color"
                    class="h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${level.percentage}%` }"
                  />
                </div>
                <div class="w-12 text-sm text-right">{{ level.count }}</div>
              </div>
            </div>
          </div>

          <!-- Questions Preview -->
          <div>
            <h4 class="font-semibold mb-4">Questions Preview</h4>
            <div class="space-y-3 max-h-96 overflow-y-auto">
              <div
                v-for="(question, index) in extractionResult.questions.slice(0, 10)"
                :key="question.id"
                class="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <UiBadge :variant="getQuestionTypeVariant(question.type)">
                        {{ question.type }}
                      </UiBadge>
                      <UiBadge
                        v-if="question.hasDiagram"
                        variant="outline"
                        class="text-orange-600 border-orange-600"
                      >
                        <Icon name="line-md:image" class="mr-1" />
                        Diagram
                      </UiBadge>
                      <div class="text-xs text-muted-foreground">
                        {{ question.subject }} • {{ question.section }} • Q{{ question.questionNumber }}
                      </div>
                    </div>
                    <p class="text-sm line-clamp-2">{{ question.text }}</p>
                    <div v-if="question.options.length > 0" class="mt-2">
                      <div class="text-xs text-muted-foreground mb-1">Options:</div>
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-for="(option, optIndex) in question.options.slice(0, 4)"
                          :key="optIndex"
                          class="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {{ String.fromCharCode(65 + optIndex) }}) {{ option.substring(0, 20) }}{{ option.length > 20 ? '...' : '' }}
                        </span>
                        <span v-if="question.options.length > 4" class="text-xs text-muted-foreground">
                          +{{ question.options.length - 4 }} more
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="ml-4 text-right">
                    <div
                      class="text-sm font-semibold"
                      :style="{ color: getConfidenceColor(question.confidence) }"
                    >
                      {{ question.confidence }}/5
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ getConfidenceDescription(question.confidence) }}
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-if="extractionResult.questions.length > 10" class="text-center py-2">
                <UiButton variant="outline" size="sm" @click="showAllQuestions = !showAllQuestions">
                  {{ showAllQuestions ? 'Show Less' : `Show All ${extractionResult.questions.length} Questions` }}
                </UiButton>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Error Section -->
        <UiCard v-if="extractionError" class="p-6 border-red-200">
          <div class="flex items-center space-x-2 mb-4">
            <Icon name="line-md:alert" class="text-red-500" />
            <h3 class="text-lg font-semibold text-red-700">Extraction Failed</h3>
          </div>
          <p class="text-red-600 mb-4">{{ extractionError }}</p>
          <div class="flex space-x-2">
            <UiButton variant="outline" @click="retryExtraction">
              <Icon name="line-md:refresh" class="mr-2" />
              Retry
            </UiButton>
            <UiButton variant="outline" @click="clearError">
              Clear Error
            </UiButton>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AIExtractionEngine, { aiExtractionUtils, type AIExtractionProgress } from '#layers/shared/app/utils/aiExtractionUtils'
import { confidenceUtils } from '#layers/shared/app/utils/confidenceScoringUtils'
import { aiJsonSchemaUtils } from '#layers/shared/app/utils/aiJsonSchemaUtils'
import type { AIExtractionResult, AIExtractedQuestion } from '#layers/shared/app/utils/geminiAPIClient'

// Reactive state
const config = ref({
  apiKey: '',
  model: 'gemini-2.5-flash',
  confidenceThreshold: 2.5,
  enableDiagramDetection: true,
  enableCache: true
})

const selectedFile = ref<File | null>(null)
const isProcessing = ref(false)
const extractionProgress = ref<AIExtractionProgress | null>(null)
const extractionResult = ref<AIExtractionResult | null>(null)
const extractionError = ref<string | null>(null)
const extractionStats = ref<any>(null)
const showAllQuestions = ref(false)

// Progress stages for UI
const progressStages = [
  { key: 'initializing', label: 'Initializing' },
  { key: 'processing_pdf', label: 'Processing PDF' },
  { key: 'extracting_questions', label: 'AI Extraction' },
  { key: 'validating', label: 'Validating' },
  { key: 'storing', label: 'Storing' },
  { key: 'completed', label: 'Complete' }
]

// Computed properties
const isConfigValid = computed(() => {
  return aiExtractionUtils.validateApiKey(config.value.apiKey)
})

const canStartExtraction = computed(() => {
  return isConfigValid.value && selectedFile.value && !isProcessing.value
})

const confidenceLevels = computed(() => {
  if (!extractionResult.value) return []
  
  const questions = extractionResult.value.questions
  const total = questions.length
  
  const levels = [
    { range: '4.5-5.0', min: 4.5, max: 5.0, color: 'bg-green-500' },
    { range: '3.5-4.4', min: 3.5, max: 4.4, color: 'bg-blue-500' },
    { range: '2.5-3.4', min: 2.5, max: 3.4, color: 'bg-yellow-500' },
    { range: '1.5-2.4', min: 1.5, max: 2.4, color: 'bg-orange-500' },
    { range: '1.0-1.4', min: 1.0, max: 1.4, color: 'bg-red-500' }
  ]
  
  return levels.map(level => {
    const count = questions.filter(q => q.confidence >= level.min && q.confidence <= level.max).length
    const percentage = total > 0 ? (count / total) * 100 : 0
    return { ...level, count, percentage }
  })
})

// Methods
const handleFileUpload = (file: File) => {
  selectedFile.value = file
  extractionResult.value = null
  extractionError.value = null
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getConfidenceDescription = (score: number): string => {
  return confidenceUtils.getConfidenceDescription(score)
}

const getConfidenceColor = (score: number): string => {
  return confidenceUtils.getConfidenceColor(score)
}

const requiresManualReview = (question: AIExtractedQuestion): boolean => {
  return confidenceUtils.requiresManualReview(question)
}

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

const getStageStatus = (stageKey: string): 'completed' | 'current' | 'pending' => {
  if (!extractionProgress.value) return 'pending'
  
  const currentStageIndex = progressStages.findIndex(s => s.key === extractionProgress.value?.stage)
  const stageIndex = progressStages.findIndex(s => s.key === stageKey)
  
  if (stageIndex < currentStageIndex) return 'completed'
  if (stageIndex === currentStageIndex) return 'current'
  return 'pending'
}

const startExtraction = async () => {
  if (!canStartExtraction.value) return
  
  isProcessing.value = true
  extractionError.value = null
  extractionProgress.value = null
  
  try {
    const engine = aiExtractionUtils.createEngine(config.value.apiKey, {
      geminiModel: config.value.model,
      confidenceThreshold: config.value.confidenceThreshold,
      enableDiagramDetection: config.value.enableDiagramDetection,
      maxFileSizeMB: 10
    })
    
    const result = await engine.extractFromPDF(selectedFile.value!, selectedFile.value!.name, {
      enableCache: config.value.enableCache,
      onProgress: (progress) => {
        extractionProgress.value = progress
      }
    })
    
    extractionResult.value = result
    
    // Load updated stats
    await loadExtractionStats()
    
  } catch (error: any) {
    extractionError.value = error.message || 'An unknown error occurred'
    console.error('Extraction failed:', error)
  } finally {
    isProcessing.value = false
  }
}

const retryExtraction = () => {
  extractionError.value = null
  startExtraction()
}

const clearError = () => {
  extractionError.value = null
}

const exportResults = (format: 'ai' | 'rankify' = 'rankify') => {
  if (!extractionResult.value) return
  
  let jsonString: string
  let filename: string
  
  if (format === 'rankify') {
    // Convert to Rankify format
    const conversion = aiJsonSchemaUtils.convertAIToRankify(extractionResult.value, {
      includeAnswerKey: false,
      generateTestConfig: true,
      estimatedDuration: aiJsonSchemaUtils.estimateTestDuration(extractionResult.value.questions),
      pdfFileHash: extractionResult.value.metadata.pdfMetadata.fileHash
    })
    
    if (conversion.success && conversion.data) {
      jsonString = JSON.stringify(conversion.data, null, 2)
      filename = `rankify-test-${selectedFile.value?.name?.replace('.pdf', '') || 'result'}.json`
    } else {
      console.error('Conversion failed:', conversion.errors)
      return
    }
  } else {
    // Export raw AI format
    jsonString = aiExtractionUtils.exportToJSON(extractionResult.value)
    filename = `ai-extraction-${selectedFile.value?.name?.replace('.pdf', '') || 'result'}.json`
  }
  
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const openReviewInterface = async () => {
  if (!extractionResult.value) return
  
  // Store the extracted questions in session storage
  sessionStorage.setItem('aiExtractedQuestions', JSON.stringify(extractionResult.value.questions))
  sessionStorage.setItem('aiExtractedFileName', selectedFile.value?.name || 'extracted-questions.pdf')
  
  // Navigate to the review interface
  const router = useRouter()
  await router.push('/review-interface')
}

const loadExtractionStats = async () => {
  try {
    if (isConfigValid.value) {
      const engine = aiExtractionUtils.createEngine(config.value.apiKey)
      extractionStats.value = await engine.getExtractionStats()
    }
  } catch (error) {
    console.warn('Failed to load extraction stats:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadExtractionStats()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>