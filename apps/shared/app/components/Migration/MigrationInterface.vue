<template>
  <div class="max-w-6xl mx-auto p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Legacy ZIP to AI JSON Migration
      </h1>
      <p class="text-gray-600">
        Convert your existing ZIP-based test files to the new AI JSON format with validation and integrity checking.
      </p>
    </div>

    <!-- Migration Steps -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div 
          v-for="(step, index) in migrationSteps" 
          :key="step.id"
          class="flex items-center"
          :class="{ 'flex-1': index < migrationSteps.length - 1 }"
        >
          <div class="flex items-center">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              :class="getStepClass(step, index)"
            >
              <Icon 
                v-if="step.status === 'completed'" 
                name="line-md:confirm" 
                class="w-5 h-5" 
              />
              <Icon 
                v-else-if="step.status === 'error'" 
                name="line-md:close" 
                class="w-5 h-5" 
              />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="ml-2 text-sm font-medium" :class="getStepTextClass(step)">
              {{ step.title }}
            </span>
          </div>
          <div 
            v-if="index < migrationSteps.length - 1"
            class="flex-1 h-0.5 mx-4"
            :class="step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'"
          />
        </div>
      </div>
    </div>

    <!-- File Upload Section -->
    <div v-if="currentStep === 'upload'" class="mb-8">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="flex items-center">
            <Icon name="line-md:upload-outline" class="mr-2" />
            Upload ZIP Files
          </UiCardTitle>
          <UiCardDescription>
            Select one or more ZIP files containing your test data to migrate.
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <!-- Drag and Drop Area -->
          <div
            class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
            :class="isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleFileDrop"
          >
            <Icon name="line-md:cloud-upload-outline" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p class="text-lg font-medium text-gray-900 mb-2">
              Drop ZIP files here or click to browse
            </p>
            <p class="text-gray-500 mb-4">
              Supports multiple file selection for batch migration
            </p>
            <UiButton @click="$refs.fileInput.click()">
              <Icon name="line-md:folder-open" class="mr-2" />
              Browse Files
            </UiButton>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".zip"
              class="hidden"
              @change="handleFileSelect"
            />
          </div>

          <!-- Selected Files -->
          <div v-if="selectedFiles.length > 0" class="mt-6">
            <h4 class="font-medium text-gray-900 mb-3">Selected Files ({{ selectedFiles.length }})</h4>
            <div class="space-y-2">
              <div 
                v-for="(file, index) in selectedFiles" 
                :key="index"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center">
                  <Icon name="line-md:document-code" class="mr-3 text-blue-500" />
                  <div>
                    <p class="font-medium text-gray-900">{{ file.name }}</p>
                    <p class="text-sm text-gray-500">{{ formatFileSize(file.size) }}</p>
                  </div>
                </div>
                <UiButton
                  variant="ghost"
                  size="sm"
                  @click="removeFile(index)"
                >
                  <Icon name="line-md:close" />
                </UiButton>
              </div>
            </div>
          </div>

          <!-- Migration Options -->
          <div v-if="selectedFiles.length > 0" class="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-3">Migration Options</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex items-center space-x-2">
                <UiCheckbox 
                  id="preserve-ids" 
                  v-model:checked="migrationOptions.preserveOriginalIds"
                />
                <UiLabel for="preserve-ids" class="text-sm">
                  Preserve original question IDs
                </UiLabel>
              </div>
              <div class="flex items-center space-x-2">
                <UiCheckbox 
                  id="estimate-confidence" 
                  v-model:checked="migrationOptions.estimateConfidence"
                />
                <UiLabel for="estimate-confidence" class="text-sm">
                  Estimate AI confidence scores
                </UiLabel>
              </div>
              <div class="flex items-center space-x-2">
                <UiCheckbox 
                  id="detect-diagrams" 
                  v-model:checked="migrationOptions.detectDiagrams"
                />
                <UiLabel for="detect-diagrams" class="text-sm">
                  Auto-detect diagram references
                </UiLabel>
              </div>
              <div class="flex items-center space-x-2">
                <UiCheckbox 
                  id="clean-text" 
                  v-model:checked="migrationOptions.cleanText"
                />
                <UiLabel for="clean-text" class="text-sm">
                  Clean and normalize text
                </UiLabel>
              </div>
            </div>
            
            <div class="mt-4">
              <UiLabel for="default-subject" class="text-sm font-medium">
                Default Subject (optional)
              </UiLabel>
              <UiInput
                id="default-subject"
                v-model="migrationOptions.defaultSubject"
                placeholder="e.g., Mathematics, Physics, etc."
                class="mt-1"
              />
            </div>
          </div>

          <!-- Start Migration Button -->
          <div v-if="selectedFiles.length > 0" class="mt-6 flex justify-end">
            <UiButton 
              @click="startMigration"
              :disabled="isMigrating"
              class="bg-blue-600 hover:bg-blue-700"
            >
              <Icon name="line-md:play" class="mr-2" />
              Start Migration
            </UiButton>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Migration Progress -->
    <div v-if="currentStep === 'processing'" class="mb-8">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="flex items-center">
            <Icon name="line-md:loading-loop" class="mr-2" />
            Migration in Progress
          </UiCardTitle>
          <UiCardDescription>
            Processing {{ selectedFiles.length }} file(s)...
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <!-- Overall Progress -->
          <div class="mb-6">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{{ migrationProgress.completed }}/{{ migrationProgress.total }} files</span>
            </div>
            <UiProgress :value="migrationProgress.percentage" class="h-2" />
          </div>

          <!-- Current File Progress -->
          <div v-if="currentFileProgress" class="mb-6">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>Current File: {{ currentFileProgress.fileName }}</span>
              <span>{{ currentFileProgress.status }}</span>
            </div>
            <div class="bg-gray-100 rounded-lg p-3">
              <div class="flex items-center space-x-2 text-sm">
                <Icon 
                  :name="currentFileProgress.status === 'completed' ? 'line-md:confirm' : 'line-md:loading-loop'" 
                  :class="currentFileProgress.status === 'completed' ? 'text-green-500' : 'text-blue-500'"
                />
                <span>{{ currentFileProgress.message }}</span>
              </div>
            </div>
          </div>

          <!-- Migration Log -->
          <div class="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div class="space-y-1">
              <div 
                v-for="(log, index) in migrationLogs" 
                :key="index"
                class="text-sm font-mono"
                :class="getLogClass(log.type)"
              >
                <span class="text-gray-400">[{{ formatTime(log.timestamp) }}]</span>
                {{ log.message }}
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Migration Results -->
    <div v-if="currentStep === 'results'" class="mb-8">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="flex items-center">
            <Icon 
              :name="migrationResults.successfulMigrations === migrationResults.totalFiles ? 'line-md:confirm' : 'line-md:alert'" 
              class="mr-2"
              :class="migrationResults.successfulMigrations === migrationResults.totalFiles ? 'text-green-500' : 'text-yellow-500'"
            />
            Migration Complete
          </UiCardTitle>
          <UiCardDescription>
            {{ migrationResults.successfulMigrations }}/{{ migrationResults.totalFiles }} files migrated successfully
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <!-- Summary Statistics -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-green-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-green-600">{{ migrationResults.successfulMigrations }}</div>
              <div class="text-sm text-green-700">Successful</div>
            </div>
            <div class="bg-red-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-red-600">{{ migrationResults.failedMigrations }}</div>
              <div class="text-sm text-red-700">Failed</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-blue-600">{{ migrationResults.summary?.totalQuestions || 0 }}</div>
              <div class="text-sm text-blue-700">Total Questions</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-purple-600">{{ formatTime(migrationResults.processingTime) }}</div>
              <div class="text-sm text-purple-700">Processing Time</div>
            </div>
          </div>

          <!-- Detailed Results -->
          <div class="space-y-4">
            <div 
              v-for="(result, index) in migrationResults.results" 
              :key="index"
              class="border rounded-lg p-4"
              :class="result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center">
                  <Icon 
                    :name="result.success ? 'line-md:confirm' : 'line-md:close'" 
                    :class="result.success ? 'text-green-500' : 'text-red-500'"
                    class="mr-2"
                  />
                  <span class="font-medium">{{ result.fileName }}</span>
                </div>
                <div class="flex space-x-2">
                  <UiButton
                    v-if="result.success"
                    variant="outline"
                    size="sm"
                    @click="downloadResult(result)"
                  >
                    <Icon name="line-md:download-outline" class="mr-1" />
                    Download
                  </UiButton>
                  <UiButton
                    variant="outline"
                    size="sm"
                    @click="viewDetails(result)"
                  >
                    <Icon name="line-md:document-list" class="mr-1" />
                    Details
                  </UiButton>
                </div>
              </div>

              <div v-if="result.success" class="text-sm text-gray-600">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>Questions: {{ result.result.statistics.convertedQuestionCount }}</div>
                  <div>Avg Confidence: {{ result.result.statistics.averageConfidence.toFixed(1) }}</div>
                  <div>Diagrams: {{ result.result.statistics.diagramQuestions }}</div>
                  <div>Validation: {{ result.result.validation.isValid ? 'Passed' : 'Issues' }}</div>
                </div>
              </div>

              <div v-else class="text-sm text-red-600">
                Error: {{ result.error }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex justify-between">
            <UiButton variant="outline" @click="resetMigration">
              <Icon name="line-md:refresh" class="mr-2" />
              Start New Migration
            </UiButton>
            <div class="space-x-2">
              <UiButton
                variant="outline"
                @click="downloadBatchReport"
              >
                <Icon name="line-md:download-outline" class="mr-2" />
                Download Report
              </UiButton>
              <UiButton
                v-if="migrationResults.successfulMigrations > 0"
                @click="downloadAllResults"
                class="bg-green-600 hover:bg-green-700"
              >
                <Icon name="line-md:download-outline" class="mr-2" />
                Download All Results
              </UiButton>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Result Details Dialog -->
    <UiDialog v-model:open="showDetailsDialog">
      <UiDialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
        <UiDialogHeader>
          <UiDialogTitle>Migration Details: {{ selectedResult?.fileName }}</UiDialogTitle>
        </UiDialogHeader>
        
        <div v-if="selectedResult" class="space-y-6">
          <!-- Statistics -->
          <div>
            <h4 class="font-medium mb-3">Migration Statistics</h4>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div class="bg-gray-50 rounded p-3">
                <div class="text-sm text-gray-600">Questions Converted</div>
                <div class="text-lg font-semibold">{{ selectedResult.result?.statistics.convertedQuestionCount || 0 }}</div>
              </div>
              <div class="bg-gray-50 rounded p-3">
                <div class="text-sm text-gray-600">Average Confidence</div>
                <div class="text-lg font-semibold">{{ selectedResult.result?.statistics.averageConfidence.toFixed(1) || 'N/A' }}</div>
              </div>
              <div class="bg-gray-50 rounded p-3">
                <div class="text-sm text-gray-600">Processing Time</div>
                <div class="text-lg font-semibold">{{ formatTime(selectedResult.result?.processingTime) }}</div>
              </div>
            </div>
          </div>

          <!-- Question Types -->
          <div v-if="selectedResult.result?.statistics.questionTypes">
            <h4 class="font-medium mb-3">Question Type Distribution</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div 
                v-for="(count, type) in selectedResult.result.statistics.questionTypes" 
                :key="type"
                class="bg-blue-50 rounded p-2 text-center"
              >
                <div class="text-sm text-blue-600 uppercase">{{ type }}</div>
                <div class="text-lg font-semibold text-blue-800">{{ count }}</div>
              </div>
            </div>
          </div>

          <!-- Validation Results -->
          <div v-if="selectedResult.result?.validation">
            <h4 class="font-medium mb-3">Validation Results</h4>
            <div class="bg-gray-50 rounded p-4">
              <div class="flex items-center mb-2">
                <Icon 
                  :name="selectedResult.result.validation.isValid ? 'line-md:confirm' : 'line-md:alert'" 
                  :class="selectedResult.result.validation.isValid ? 'text-green-500' : 'text-yellow-500'"
                  class="mr-2"
                />
                <span class="font-medium">
                  {{ selectedResult.result.validation.isValid ? 'Validation Passed' : 'Validation Issues Found' }}
                </span>
              </div>
              <div class="text-sm text-gray-600">
                Errors: {{ selectedResult.result.validation.errors.length }}, 
                Warnings: {{ selectedResult.result.validation.warnings.length }}
              </div>
            </div>
          </div>

          <!-- Errors and Warnings -->
          <div v-if="selectedResult.result?.validation.errors.length > 0">
            <h4 class="font-medium mb-3 text-red-600">Validation Errors</h4>
            <div class="space-y-2 max-h-40 overflow-y-auto">
              <div 
                v-for="(error, index) in selectedResult.result.validation.errors" 
                :key="index"
                class="bg-red-50 border border-red-200 rounded p-2 text-sm"
              >
                <div class="font-medium text-red-800">{{ error.type }}</div>
                <div class="text-red-700">{{ error.message }}</div>
                <div class="text-red-600 text-xs">Path: {{ error.path }}</div>
              </div>
            </div>
          </div>

          <div v-if="selectedResult.result?.validation.warnings.length > 0">
            <h4 class="font-medium mb-3 text-yellow-600">Validation Warnings</h4>
            <div class="space-y-2 max-h-40 overflow-y-auto">
              <div 
                v-for="(warning, index) in selectedResult.result.validation.warnings" 
                :key="index"
                class="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm"
              >
                <div class="font-medium text-yellow-800">{{ warning.type }}</div>
                <div class="text-yellow-700">{{ warning.message }}</div>
                <div class="text-yellow-600 text-xs">Path: {{ warning.path }}</div>
              </div>
            </div>
          </div>
        </div>

        <UiDialogFooter>
          <UiButton variant="outline" @click="showDetailsDialog = false">
            Close
          </UiButton>
          <UiButton 
            v-if="selectedResult?.success"
            @click="downloadResult(selectedResult)"
          >
            <Icon name="line-md:download-outline" class="mr-2" />
            Download Result
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MigrationTool } from '#layers/shared/app/utils/MigrationTool.js'

// Reactive state
const currentStep = ref('upload')
const selectedFiles = ref<File[]>([])
const isDragOver = ref(false)
const isMigrating = ref(false)
const migrationProgress = ref({ completed: 0, total: 0, percentage: 0 })
const currentFileProgress = ref(null)
const migrationLogs = ref<any[]>([])
const migrationResults = ref<any>(null)
const showDetailsDialog = ref(false)
const selectedResult = ref<any>(null)

// Migration options
const migrationOptions = ref({
  preserveOriginalIds: true,
  estimateConfidence: true,
  detectDiagrams: true,
  cleanText: true,
  defaultSubject: ''
})

// Migration steps
const migrationSteps = ref([
  { id: 'upload', title: 'Upload Files', status: 'current' },
  { id: 'processing', title: 'Processing', status: 'pending' },
  { id: 'results', title: 'Results', status: 'pending' }
])

// Migration tool instance
const migrationTool = new MigrationTool()

// Computed properties
const currentStepIndex = computed(() => {
  return migrationSteps.value.findIndex(step => step.id === currentStep.value)
})

// Methods
const handleFileDrop = (event: DragEvent) => {
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  addFiles(files.filter(file => file.name.endsWith('.zip')))
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  addFiles(files)
}

const addFiles = (files: File[]) => {
  files.forEach(file => {
    if (!selectedFiles.value.some(f => f.name === file.name)) {
      selectedFiles.value.push(file)
    }
  })
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

const getStepClass = (step: any, index: number) => {
  if (step.status === 'completed') {
    return 'bg-green-500 text-white'
  } else if (step.status === 'error') {
    return 'bg-red-500 text-white'
  } else if (step.status === 'current') {
    return 'bg-blue-500 text-white'
  } else {
    return 'bg-gray-200 text-gray-600'
  }
}

const getStepTextClass = (step: any) => {
  if (step.status === 'completed') {
    return 'text-green-600'
  } else if (step.status === 'error') {
    return 'text-red-600'
  } else if (step.status === 'current') {
    return 'text-blue-600'
  } else {
    return 'text-gray-500'
  }
}

const getLogClass = (type: string) => {
  switch (type) {
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
    case 'success':
      return 'text-green-400'
    default:
      return 'text-gray-300'
  }
}

const addLog = (message: string, type: string = 'info') => {
  migrationLogs.value.push({
    timestamp: new Date(),
    message,
    type
  })
}

const updateStep = (stepId: string, status: string) => {
  const step = migrationSteps.value.find(s => s.id === stepId)
  if (step) {
    step.status = status
  }
}

const startMigration = async () => {
  if (selectedFiles.value.length === 0) return

  isMigrating.value = true
  currentStep.value = 'processing'
  updateStep('upload', 'completed')
  updateStep('processing', 'current')

  migrationProgress.value = {
    completed: 0,
    total: selectedFiles.value.length,
    percentage: 0
  }

  migrationLogs.value = []
  addLog('Starting migration process...', 'info')

  try {
    const options = {
      ...migrationOptions.value,
      onProgress: (progress: any) => {
        migrationProgress.value = progress
        currentFileProgress.value = {
          fileName: selectedFiles.value[progress.completed - 1]?.name || 'Unknown',
          status: 'processing',
          message: `Processing file ${progress.completed} of ${progress.total}`
        }
      }
    }

    const results = await migrationTool.migrateBatch(selectedFiles.value, options)
    
    migrationResults.value = results
    currentStep.value = 'results'
    updateStep('processing', 'completed')
    updateStep('results', 'current')

    addLog(`Migration completed: ${results.successfulMigrations}/${results.totalFiles} files successful`, 'success')

    if (results.failedMigrations > 0) {
      addLog(`${results.failedMigrations} files failed to migrate`, 'warning')
    }

  } catch (error) {
    addLog(`Migration failed: ${error.message}`, 'error')
    updateStep('processing', 'error')
  } finally {
    isMigrating.value = false
    currentFileProgress.value = null
  }
}

const resetMigration = () => {
  currentStep.value = 'upload'
  selectedFiles.value = []
  migrationResults.value = null
  migrationLogs.value = []
  migrationProgress.value = { completed: 0, total: 0, percentage: 0 }
  
  // Reset step statuses
  migrationSteps.value.forEach((step, index) => {
    if (index === 0) {
      step.status = 'current'
    } else {
      step.status = 'pending'
    }
  })
}

const viewDetails = (result: any) => {
  selectedResult.value = result
  showDetailsDialog.value = true
}

const downloadResult = (result: any) => {
  if (!result.success) return

  const data = JSON.stringify(result.result.convertedData, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.fileName.replace('.zip', '')}_migrated.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const downloadBatchReport = () => {
  if (!migrationResults.value) return

  const report = {
    migrationSummary: migrationResults.value,
    timestamp: new Date().toISOString(),
    migrationOptions: migrationOptions.value
  }

  const data = JSON.stringify(report, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `migration_report_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const downloadAllResults = () => {
  if (!migrationResults.value) return

  const successfulResults = migrationResults.value.results.filter((r: any) => r.success)
  
  successfulResults.forEach((result: any) => {
    setTimeout(() => downloadResult(result), 100)
  })
}

// Page metadata
definePageMeta({
  title: 'Migration Tool',
  description: 'Convert legacy ZIP files to AI JSON format'
})
</script>

<style scoped>
.migration-step {
  transition: all 0.3s ease;
}

.migration-log {
  font-family: 'Courier New', monospace;
}
</style>