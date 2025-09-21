<template>
  <div class="data-migration-interface">
    <!-- Header -->
    <div class="migration-header">
      <h2>Data Migration</h2>
      <p>Migrate existing cropped image data to the new coordinate-based system.</p>
    </div>

    <!-- Migration Steps -->
    <div class="migration-steps">
      <div :class="['step', { 'active': currentStep === 1, 'completed': currentStep > 1 }]">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Analyze Data</h3>
          <p>Analyze existing data structure and migration requirements</p>
        </div>
      </div>

      <div :class="['step', { 'active': currentStep === 2, 'completed': currentStep > 2 }]">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Configure Migration</h3>
          <p>Set migration options and create backup</p>
        </div>
      </div>

      <div :class="['step', { 'active': currentStep === 3, 'completed': currentStep > 3 }]">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Migrate Data</h3>
          <p>Convert legacy data to coordinate-based format</p>
        </div>
      </div>

      <div :class="['step', { 'active': currentStep === 4 }]">
        <div class="step-number">4</div>
        <div class="step-content">
          <h3>Validate Results</h3>
          <p>Verify migration integrity and completeness</p>
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="step-content-area">
      <!-- Step 1: Data Analysis -->
      <div v-if="currentStep === 1" class="step-section">
        <h3>Data Analysis</h3>
        
        <div class="file-upload">
          <div class="upload-area" @drop="handleFileDrop" @dragover.prevent @dragenter.prevent>
            <input 
              type="file" 
              ref="fileInput" 
              @change="handleFileSelect" 
              accept=".json,.zip"
              multiple
            />
            <div class="upload-content">
              <Icon name="upload" />
              <p>Drop files here or click to select</p>
              <p class="upload-hint">Supports JSON and ZIP formats</p>
            </div>
          </div>
        </div>

        <div v-if="selectedFiles.length > 0" class="selected-files">
          <h4>Selected Files</h4>
          <div class="file-list">
            <div 
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="file-item"
            >
              <Icon name="file" />
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <span class="file-format">{{ detectDataFormat(file) }}</span>
              <button @click="removeFile(index)" class="remove-btn">
                <Icon name="x" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="hasAnalysis" class="analysis-results">
          <h4>Analysis Results</h4>
          <div class="analysis-grid">
            <div class="analysis-card">
              <div class="card-header">
                <Icon name="file-text" />
                <h5>Data Format</h5>
              </div>
              <div class="card-value">{{ analysis.format }}</div>
            </div>

            <div class="analysis-card">
              <div class="card-header">
                <Icon name="hash" />
                <h5>Total Questions</h5>
              </div>
              <div class="card-value">{{ analysis.totalQuestions }}</div>
            </div>

            <div class="analysis-card">
              <div class="card-header">
                <Icon name="image" />
                <h5>With Images</h5>
              </div>
              <div class="card-value">{{ analysis.questionsWithImages }}</div>
            </div>

            <div class="analysis-card">
              <div class="card-header">
                <Icon name="clock" />
                <h5>Est. Time</h5>
              </div>
              <div class="card-value">{{ formatTime(analysis.estimatedMigrationTime) }}</div>
            </div>
          </div>

          <div v-if="analysis.recommendations.length > 0" class="recommendations">
            <h5>Recommendations</h5>
            <ul>
              <li v-for="recommendation in analysis.recommendations" :key="recommendation">
                {{ recommendation }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Step 2: Migration Configuration -->
      <div v-else-if="currentStep === 2" class="step-section">
        <h3>Migration Configuration</h3>
        
        <div class="config-form">
          <div class="config-section">
            <h4>Migration Options</h4>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="migrationConfig.preserveLegacyData" />
                Preserve legacy data (create backup)
              </label>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="migrationConfig.validateCoordinates" />
                Validate generated coordinates
              </label>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="migrationConfig.generateThumbnails" />
                Generate diagram thumbnails
              </label>
            </div>
          </div>

          <div class="config-section">
            <h4>Performance Settings</h4>
            <div class="form-group">
              <label>Batch Size:</label>
              <input 
                type="number" 
                v-model.number="migrationConfig.batchSize"
                min="1"
                max="100"
              />
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="migrationConfig.enableProgressTracking" />
                Enable progress tracking
              </label>
            </div>
          </div>
        </div>

        <div v-if="backupId" class="backup-info">
          <div class="backup-card">
            <Icon name="shield" />
            <div class="backup-details">
              <h5>Backup Created</h5>
              <p>Backup ID: {{ backupId }}</p>
              <p>You can rollback to this point if needed.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Migration Progress -->
      <div v-else-if="currentStep === 3" class="step-section">
        <h3>Migration Progress</h3>
        
        <div v-if="isMigrating" class="migration-progress">
          <div class="progress-header">
            <h4>{{ progress?.currentPhase || 'Migrating data...' }}</h4>
            <span class="progress-percentage">{{ progress?.percentage || 0 }}%</span>
          </div>
          
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${progress?.percentage || 0}%` }"
            ></div>
          </div>
          
          <div class="progress-details">
            <div class="detail-item">
              <span>Items:</span>
              <span>{{ progress?.currentItem || 0 }} / {{ progress?.totalItems || 0 }}</span>
            </div>
            <div class="detail-item">
              <span>Time Remaining:</span>
              <span>{{ formatTime(progress?.estimatedTimeRemaining || 0) }}</span>
            </div>
          </div>
        </div>

        <div v-if="hasResult" class="migration-results">
          <div class="results-header">
            <Icon :name="result.success ? 'check-circle' : 'alert-triangle'" />
            <h4>{{ result.success ? 'Migration Completed' : 'Migration Failed' }}</h4>
          </div>

          <div class="results-grid">
            <div class="result-card success">
              <h5>Migrated</h5>
              <div class="result-value">{{ result.migratedQuestions }}</div>
            </div>
            
            <div class="result-card error">
              <h5>Failed</h5>
              <div class="result-value">{{ result.failedQuestions }}</div>
            </div>
            
            <div class="result-card info">
              <h5>Coordinates</h5>
              <div class="result-value">{{ result.generatedCoordinates }}</div>
            </div>
            
            <div class="result-card">
              <h5>Time</h5>
              <div class="result-value">{{ formatTime(result.migrationTime) }}</div>
            </div>
          </div>

          <div v-if="result.errors.length > 0" class="error-list">
            <h5>Errors</h5>
            <ul>
              <li v-for="error in result.errors" :key="error" class="error-item">
                {{ error }}
              </li>
            </ul>
          </div>

          <div v-if="result.warnings.length > 0" class="warning-list">
            <h5>Warnings</h5>
            <ul>
              <li v-for="warning in result.warnings" :key="warning" class="warning-item">
                {{ warning }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Step 4: Validation -->
      <div v-else-if="currentStep === 4" class="step-section">
        <h3>Migration Validation</h3>
        
        <div class="validation-section">
          <button 
            @click="validateMigration"
            class="btn btn-primary"
            :disabled="isValidating"
          >
            <Icon name="check" />
            {{ isValidating ? 'Validating...' : 'Validate Migration' }}
          </button>
        </div>

        <div v-if="validationResult" class="validation-results">
          <div class="validation-header">
            <Icon :name="validationResult.valid ? 'check-circle' : 'alert-triangle'" />
            <h4>{{ validationResult.valid ? 'Validation Passed' : 'Validation Issues Found' }}</h4>
          </div>

          <div v-if="validationResult.issues.length > 0" class="issues-list">
            <h5>Issues Found</h5>
            <ul>
              <li v-for="issue in validationResult.issues" :key="issue" class="issue-item">
                {{ issue }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="migration-actions">
      <button 
        v-if="currentStep > 1"
        @click="previousStep"
        class="btn btn-secondary"
        :disabled="isProcessing"
      >
        <Icon name="arrow-left" />
        Previous
      </button>

      <div class="actions-right">
        <button 
          v-if="backupId && currentStep > 2"
          @click="rollback"
          class="btn btn-warning"
          :disabled="isProcessing"
        >
          <Icon name="rotate-ccw" />
          Rollback
        </button>

        <button 
          v-if="currentStep < 4"
          @click="nextStep"
          class="btn btn-primary"
          :disabled="!canProceed || isProcessing"
        >
          {{ getNextButtonText() }}
          <Icon name="arrow-right" />
        </button>

        <button 
          v-else
          @click="completeMigration"
          class="btn btn-success"
          :disabled="!validationResult?.valid"
        >
          <Icon name="check" />
          Complete Migration
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      <Icon name="alert-triangle" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDataMigration } from '~/app/composables/useDataMigration'
import type { LegacyQuestionData } from '~/app/utils/dataMigrationManager'

const emit = defineEmits<{
  complete: [result: any]
  cancel: []
}>()

// Data migration composable
const {
  isAnalyzing,
  isMigrating,
  progress,
  result,
  analysis,
  error,
  backupId,
  hasResult,
  hasAnalysis,
  initializeMigration,
  analyzeLegacyData,
  migrateLegacyData,
  validateMigration: validateMigrationData,
  createBackup,
  rollbackMigration,
  detectDataFormat
} = useDataMigration({
  preserveLegacyData: true,
  validateCoordinates: true,
  batchSize: 10,
  enableProgressTracking: true
})

// Local state
const currentStep = ref(1)
const selectedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()
const legacyData = ref<LegacyQuestionData[]>([])
const validationResult = ref<{ valid: boolean; issues: string[] } | null>(null)
const isValidating = ref(false)

const migrationConfig = ref({
  preserveLegacyData: true,
  validateCoordinates: true,
  generateThumbnails: false,
  batchSize: 10,
  enableProgressTracking: true
})

// Computed
const isProcessing = computed(() => isAnalyzing.value || isMigrating.value || isValidating.value)

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return hasAnalysis.value && analysis.value?.format !== 'unknown'
    case 2:
      return true
    case 3:
      return hasResult.value
    case 4:
      return validationResult.value?.valid || false
    default:
      return false
  }
})

// Lifecycle
onMounted(async () => {
  await initializeMigration()
})

// Methods
function handleFileDrop(event: DragEvent) {
  event.preventDefault()
  const files = Array.from(event.dataTransfer?.files || [])
  addFiles(files)
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  addFiles(files)
}

function addFiles(files: File[]) {
  const validFiles = files.filter(file => 
    file.type === 'application/json' || 
    file.type === 'application/zip' ||
    file.name.endsWith('.json') ||
    file.name.endsWith('.zip')
  )
  
  selectedFiles.value.push(...validFiles)
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

async function analyzeData() {
  if (selectedFiles.value.length === 0) return

  try {
    // Read and parse files
    const allData: any[] = []
    
    for (const file of selectedFiles.value) {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (Array.isArray(data)) {
        allData.push(...data)
      } else if (data.questions && Array.isArray(data.questions)) {
        allData.push(...data.questions)
      }
    }

    legacyData.value = allData
    await analyzeLegacyData(allData)
  } catch (err) {
    console.error('Failed to analyze data:', err)
  }
}

async function performMigration() {
  if (legacyData.value.length === 0) return

  try {
    // Create backup if enabled
    if (migrationConfig.value.preserveLegacyData) {
      await createBackup(legacyData.value)
    }

    // Create mock page images map (in real implementation, this would be provided)
    const pageImages = new Map<number, HTMLImageElement | string>()

    // Perform migration
    await migrateLegacyData(legacyData.value, pageImages)
  } catch (err) {
    console.error('Migration failed:', err)
  }
}

async function validateMigration() {
  if (!hasResult.value || legacyData.value.length === 0) return

  isValidating.value = true
  
  try {
    // Create mock migrated data for validation
    const migratedData = legacyData.value.map(q => ({
      ...q,
      hasDiagram: q.pdfData?.some((pd: any) => pd.imageData) || false,
      diagrams: [],
      confidence: 1.0
    }))

    validationResult.value = await validateMigrationData(legacyData.value, migratedData)
  } catch (err) {
    console.error('Validation failed:', err)
  } finally {
    isValidating.value = false
  }
}

async function rollback() {
  if (!backupId.value) return

  try {
    await rollbackMigration(backupId.value)
    currentStep.value = 1
  } catch (err) {
    console.error('Rollback failed:', err)
  }
}

function nextStep() {
  if (currentStep.value === 1 && selectedFiles.value.length > 0) {
    analyzeData()
  } else if (currentStep.value === 3) {
    performMigration()
  }
  
  if (canProceed.value && currentStep.value < 4) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function completeMigration() {
  emit('complete', {
    result: result.value,
    validation: validationResult.value,
    backupId: backupId.value
  })
}

function getNextButtonText(): string {
  switch (currentStep.value) {
    case 1:
      return 'Analyze Data'
    case 2:
      return 'Start Migration'
    case 3:
      return 'Validate Results'
    default:
      return 'Next'
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}
</script>

<style scoped>
.data-migration-interface {
  @apply max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6;
}

.migration-header {
  @apply mb-6 text-center;
}

.migration-header h2 {
  @apply text-2xl font-bold text-gray-900 mb-2;
}

.migration-header p {
  @apply text-gray-600;
}

.migration-steps {
  @apply flex justify-between mb-8 relative;
}

.migration-steps::before {
  content: '';
  @apply absolute top-6 left-0 right-0 h-0.5 bg-gray-300 -z-10;
}

.step {
  @apply flex flex-col items-center text-center flex-1;
}

.step-number {
  @apply w-12 h-12 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center font-semibold text-gray-500 mb-2;
}

.step.active .step-number {
  @apply border-blue-500 bg-blue-500 text-white;
}

.step.completed .step-number {
  @apply border-green-500 bg-green-500 text-white;
}

.step-content h3 {
  @apply font-semibold text-gray-900 mb-1;
}

.step-content p {
  @apply text-sm text-gray-600;
}

.step-content-area {
  @apply mb-6;
}

.step-section h3 {
  @apply text-xl font-semibold text-gray-900 mb-4;
}

.file-upload {
  @apply mb-6;
}

.upload-area {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer
         hover:border-blue-400 hover:bg-blue-50 transition-colors;
}

.upload-area input {
  @apply hidden;
}

.upload-content {
  @apply space-y-2;
}

.upload-hint {
  @apply text-sm text-gray-500;
}

.selected-files {
  @apply mb-6;
}

.selected-files h4 {
  @apply font-medium text-gray-900 mb-3;
}

.file-list {
  @apply space-y-2;
}

.file-item {
  @apply flex items-center gap-3 p-3 bg-gray-50 rounded-lg;
}

.file-name {
  @apply flex-1 font-medium text-gray-900;
}

.file-size {
  @apply text-sm text-gray-600;
}

.file-format {
  @apply px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium;
}

.remove-btn {
  @apply text-red-600 hover:text-red-800;
}

.analysis-results {
  @apply bg-gray-50 rounded-lg p-4;
}

.analysis-results h4 {
  @apply font-medium text-gray-900 mb-4;
}

.analysis-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4;
}

.analysis-card {
  @apply bg-white rounded-lg p-4 border border-gray-200;
}

.card-header {
  @apply flex items-center gap-2 mb-2;
}

.card-header h5 {
  @apply font-medium text-gray-700;
}

.card-value {
  @apply text-2xl font-bold text-gray-900;
}

.recommendations {
  @apply mt-4;
}

.recommendations h5 {
  @apply font-medium text-gray-900 mb-2;
}

.recommendations ul {
  @apply list-disc list-inside space-y-1 text-sm text-gray-700;
}

.config-form {
  @apply space-y-6;
}

.config-section {
  @apply bg-gray-50 rounded-lg p-4;
}

.config-section h4 {
  @apply font-medium text-gray-900 mb-3;
}

.form-group {
  @apply mb-3;
}

.form-group label {
  @apply flex items-center gap-2 text-sm font-medium text-gray-700;
}

.form-group input[type="number"] {
  @apply ml-auto px-3 py-1 border border-gray-300 rounded-md w-20;
}

.backup-info {
  @apply mt-6;
}

.backup-card {
  @apply flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg;
}

.backup-details h5 {
  @apply font-medium text-green-900 mb-1;
}

.backup-details p {
  @apply text-sm text-green-700;
}

.migration-progress {
  @apply bg-gray-50 rounded-lg p-6;
}

.progress-header {
  @apply flex justify-between items-center mb-4;
}

.progress-header h4 {
  @apply font-medium text-gray-900;
}

.progress-percentage {
  @apply text-2xl font-bold text-blue-600;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-3 mb-4;
}

.progress-fill {
  @apply bg-blue-600 h-3 rounded-full transition-all duration-300;
}

.progress-details {
  @apply grid grid-cols-2 gap-4 text-sm;
}

.detail-item {
  @apply flex justify-between;
}

.migration-results {
  @apply bg-gray-50 rounded-lg p-6;
}

.results-header {
  @apply flex items-center gap-3 mb-4;
}

.results-header h4 {
  @apply font-medium text-gray-900;
}

.results-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4 mb-4;
}

.result-card {
  @apply bg-white rounded-lg p-4 text-center;
}

.result-card h5 {
  @apply font-medium text-gray-700 mb-2;
}

.result-value {
  @apply text-2xl font-bold;
}

.result-card.success .result-value {
  @apply text-green-600;
}

.result-card.error .result-value {
  @apply text-red-600;
}

.result-card.info .result-value {
  @apply text-blue-600;
}

.error-list,
.warning-list {
  @apply mt-4;
}

.error-list h5,
.warning-list h5 {
  @apply font-medium mb-2;
}

.error-list h5 {
  @apply text-red-900;
}

.warning-list h5 {
  @apply text-yellow-900;
}

.error-list ul,
.warning-list ul {
  @apply space-y-1;
}

.error-item {
  @apply text-sm text-red-700 bg-red-50 p-2 rounded;
}

.warning-item {
  @apply text-sm text-yellow-700 bg-yellow-50 p-2 rounded;
}

.validation-section {
  @apply mb-6;
}

.validation-results {
  @apply bg-gray-50 rounded-lg p-6;
}

.validation-header {
  @apply flex items-center gap-3 mb-4;
}

.validation-header h4 {
  @apply font-medium text-gray-900;
}

.issues-list {
  @apply mt-4;
}

.issues-list h5 {
  @apply font-medium text-red-900 mb-2;
}

.issues-list ul {
  @apply space-y-1;
}

.issue-item {
  @apply text-sm text-red-700 bg-red-50 p-2 rounded;
}

.migration-actions {
  @apply flex justify-between items-center pt-6 border-t border-gray-200;
}

.actions-right {
  @apply flex gap-3;
}

.btn {
  @apply px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-warning {
  @apply bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed;
}

.error-message {
  @apply flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md mt-4;
}
</style>