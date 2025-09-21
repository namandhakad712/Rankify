<template>
  <div class="simple-test-configuration">
    <!-- Header -->
    <div class="config-header">
      <h2>Test Configuration</h2>
      <p>Configure your test settings and generate the final test.</p>
      
      <!-- Progress Bar -->
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progress.percentage}%` }"
        ></div>
      </div>
      <p class="progress-text">
        Step {{ currentStep + 1 }} of {{ steps.length }}: {{ currentStepInfo?.name }}
      </p>
    </div>

    <!-- Step Content -->
    <div class="config-content">
      <!-- Step 1: Review Questions -->
      <div v-if="currentStepInfo?.id === 'review'" class="step-section">
        <h3>Review Questions</h3>
        <div v-if="questionsSummary" class="questions-summary">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Total Questions:</span>
              <span class="summary-value">{{ questionsSummary.total }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">With Diagrams:</span>
              <span class="summary-value">{{ questionsSummary.withDiagrams }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Subjects:</span>
              <span class="summary-value">{{ questionsSummary.subjectCount }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Avg Confidence:</span>
              <span class="summary-value">{{ Math.round(questionsSummary.averageConfidence * 100) }}%</span>
            </div>
          </div>
          
          <div class="subjects-list">
            <h4>Detected Subjects:</h4>
            <div class="subject-tags">
              <span 
                v-for="subject in questionsSummary.subjects"
                :key="subject"
                class="subject-tag"
              >
                {{ subject }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Select Configuration -->
      <div v-else-if="currentStepInfo?.id === 'preset'" class="step-section">
        <h3>Select Configuration</h3>
        
        <!-- Preset Options -->
        <div class="preset-options">
          <div 
            v-for="preset in availablePresets"
            :key="preset.id"
            @click="handlePresetSelect(preset.id)"
            :class="['preset-card', { 
              'selected': selectedPreset?.id === preset.id,
              'incompatible': getValidationResult(preset.id) && !getValidationResult(preset.id)?.isCompatible
            }]"
          >
            <div class="preset-header">
              <h4>{{ preset.name }}</h4>
              <span class="preset-type">{{ preset.examType }}</span>
            </div>
            
            <div class="preset-details">
              <div class="detail-item">
                <Icon name="clock" />
                <span>{{ preset.timeLimit }} min</span>
              </div>
              <div class="detail-item">
                <Icon name="file-text" />
                <span>{{ preset.questionDistribution.totalQuestions }} questions</span>
              </div>
              <div class="detail-item">
                <Icon name="layers" />
                <span>{{ preset.sections.length }} sections</span>
              </div>
            </div>

            <!-- Validation Status -->
            <div v-if="getValidationResult(preset.id)" class="validation-status">
              <div :class="['status-badge', getValidationResult(preset.id)?.isCompatible ? 'compatible' : 'incompatible']">
                <Icon :name="getValidationResult(preset.id)?.isCompatible ? 'check' : 'alert-triangle'" />
                <span>{{ getValidationResult(preset.id)?.isCompatible ? 'Compatible' : 'Issues' }}</span>
              </div>
            </div>
          </div>

          <!-- Custom Configuration Option -->
          <div 
            @click="showCustomConfig = true"
            :class="['preset-card', 'custom-card', { 'selected': showCustomConfig }]"
          >
            <div class="preset-header">
              <h4>Custom Configuration</h4>
              <span class="preset-type custom">CUSTOM</span>
            </div>
            
            <div class="preset-details">
              <div class="detail-item">
                <Icon name="settings" />
                <span>Manual setup</span>
              </div>
              <div class="detail-item">
                <Icon name="edit" />
                <span>Full control</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Validation Details -->
        <div v-if="selectedPreset && getValidationResult(selectedPreset.id)" class="validation-details">
          <h4>Compatibility Check</h4>
          <div class="validation-content">
            <div v-if="getValidationResult(selectedPreset.id)?.warnings.length" class="validation-section warnings">
              <h5>Warnings:</h5>
              <ul>
                <li v-for="warning in getValidationResult(selectedPreset.id)?.warnings" :key="warning">
                  {{ warning }}
                </li>
              </ul>
            </div>
            
            <div v-if="getValidationResult(selectedPreset.id)?.requiredAdjustments.length" class="validation-section errors">
              <h5>Required Adjustments:</h5>
              <ul>
                <li v-for="adjustment in getValidationResult(selectedPreset.id)?.requiredAdjustments" :key="adjustment">
                  {{ adjustment }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Custom Configuration -->
      <div v-else-if="currentStepInfo?.id === 'customize' || showCustomConfig" class="step-section">
        <h3>Custom Configuration</h3>
        
        <div class="custom-form">
          <div class="form-section">
            <h4>Basic Settings</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Test Name:</label>
                <input 
                  type="text" 
                  v-model="customConfig.testName"
                  placeholder="Enter test name"
                />
              </div>
              
              <div class="form-group">
                <label>Duration (minutes):</label>
                <input 
                  type="number" 
                  v-model.number="customConfig.timeLimit"
                  min="1"
                  max="600"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Marking Scheme</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Correct:</label>
                <input 
                  type="number" 
                  v-model.number="customConfig.markingScheme.correct"
                  step="0.5"
                />
              </div>
              
              <div class="form-group">
                <label>Incorrect:</label>
                <input 
                  type="number" 
                  v-model.number="customConfig.markingScheme.incorrect"
                  step="0.5"
                />
              </div>
              
              <div class="form-group">
                <label>Unattempted:</label>
                <input 
                  type="number" 
                  v-model.number="customConfig.markingScheme.unattempted"
                  step="0.5"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Generate Test -->
      <div v-else-if="currentStepInfo?.id === 'generate'" class="step-section">
        <h3>Generate Test</h3>
        
        <div class="generation-summary">
          <h4>Configuration Summary</h4>
          <div class="summary-content">
            <div class="summary-row">
              <span class="label">Configuration:</span>
              <span class="value">{{ selectedPreset?.name || 'Custom Configuration' }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Questions:</span>
              <span class="value">{{ questionsSummary?.total || 0 }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Duration:</span>
              <span class="value">{{ selectedPreset?.timeLimit || customConfig.timeLimit }} minutes</span>
            </div>
          </div>
        </div>

        <div class="test-name-input">
          <label>Final Test Name:</label>
          <input 
            type="text" 
            v-model="finalTestName"
            placeholder="Enter final test name"
          />
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="config-actions">
      <button 
        v-if="currentStep > 0"
        @click="previousStep"
        class="btn btn-secondary"
        :disabled="isLoading"
      >
        <Icon name="arrow-left" />
        Previous
      </button>

      <div class="actions-right">
        <button 
          v-if="currentStepInfo?.id !== 'generate'"
          @click="handleNext"
          class="btn btn-primary"
          :disabled="!canProceedToNext || isLoading"
        >
          Next
          <Icon name="arrow-right" />
        </button>

        <button 
          v-else
          @click="handleGenerate"
          class="btn btn-success"
          :disabled="isLoading"
        >
          <Icon name="check" />
          {{ isLoading ? 'Generating...' : 'Generate Test' }}
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      <Icon name="alert-triangle" />
      <span>{{ error }}</span>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <Icon name="loader" class="animate-spin" />
      <span>Processing...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { EnhancedQuestion, ConfiguredTest } from '~/shared/types/diagram-detection'
import { useTestConfiguration } from '~/app/composables/useTestConfiguration'

interface Props {
  questions: EnhancedQuestion[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  complete: [configuredTest: ConfiguredTest]
  cancel: []
}>()

// Test configuration composable
const {
  currentStep,
  steps,
  currentStepInfo,
  selectedPreset,
  availablePresets,
  validationResults,
  isLoading,
  error,
  progress,
  canProceedToNext,
  questionsSummary,
  initializeWorkflow,
  selectPreset,
  createCustomConfiguration,
  nextStep,
  previousStep,
  generateTest
} = useTestConfiguration({
  enableWebScraping: true,
  autoValidation: true
})

// Local state
const showCustomConfig = ref(false)
const finalTestName = ref('')
const customConfig = ref({
  testName: 'Custom Test',
  examType: 'CUSTOM',
  timeLimit: 180,
  markingScheme: {
    correct: 4,
    incorrect: -1,
    unattempted: 0
  }
})

// Computed
const getValidationResult = computed(() => {
  return (presetId: string) => validationResults.value[presetId] || null
})

// Lifecycle
onMounted(async () => {
  await initializeWorkflow(props.questions)
})

// Methods
async function handlePresetSelect(presetId: string) {
  showCustomConfig.value = false
  await selectPreset(presetId)
}

function handleNext() {
  if (showCustomConfig.value) {
    // Apply custom configuration
    createCustomConfiguration(customConfig.value)
    showCustomConfig.value = false
  }
  nextStep()
}

async function handleGenerate() {
  const testName = finalTestName.value || 
    (selectedPreset.value ? `${selectedPreset.value.name} Test` : 'Custom Test')
  
  const result = await generateTest(testName)
  
  if (result.success && result.configuredTest) {
    emit('complete', result.configuredTest)
  }
}
</script>

<style scoped>
.simple-test-configuration {
  @apply max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 relative;
}

.config-header {
  @apply mb-6 pb-4 border-b border-gray-200;
}

.config-header h2 {
  @apply text-2xl font-bold text-gray-900 mb-2;
}

.config-header p {
  @apply text-gray-600 mb-4;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-2 mb-2;
}

.progress-fill {
  @apply bg-blue-600 h-2 rounded-full transition-all duration-300;
}

.progress-text {
  @apply text-sm text-gray-600;
}

.config-content {
  @apply mb-6;
}

.step-section h3 {
  @apply text-xl font-semibold text-gray-900 mb-4;
}

.questions-summary {
  @apply bg-gray-50 rounded-lg p-4;
}

.summary-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4 mb-4;
}

.summary-item {
  @apply flex flex-col;
}

.summary-label {
  @apply text-sm text-gray-600;
}

.summary-value {
  @apply text-lg font-semibold text-gray-900;
}

.subjects-list h4 {
  @apply font-medium text-gray-900 mb-2;
}

.subject-tags {
  @apply flex flex-wrap gap-2;
}

.subject-tag {
  @apply px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm;
}

.preset-options {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6;
}

.preset-card {
  @apply border border-gray-200 rounded-lg p-4 cursor-pointer transition-all
         hover:border-blue-300 hover:shadow-md;
}

.preset-card.selected {
  @apply border-blue-500 bg-blue-50 shadow-md;
}

.preset-card.incompatible {
  @apply border-red-300 bg-red-50;
}

.preset-card.custom-card {
  @apply border-dashed border-2;
}

.preset-header {
  @apply flex justify-between items-start mb-3;
}

.preset-header h4 {
  @apply font-semibold text-gray-900;
}

.preset-type {
  @apply px-2 py-1 text-xs font-medium rounded;
}

.preset-type:not(.custom) {
  @apply bg-gray-100 text-gray-800;
}

.preset-type.custom {
  @apply bg-purple-100 text-purple-800;
}

.preset-details {
  @apply space-y-2 mb-3;
}

.detail-item {
  @apply flex items-center gap-2 text-sm text-gray-600;
}

.validation-status {
  @apply pt-3 border-t border-gray-200;
}

.status-badge {
  @apply flex items-center gap-2 text-sm;
}

.status-badge.compatible {
  @apply text-green-600;
}

.status-badge.incompatible {
  @apply text-red-600;
}

.validation-details {
  @apply mt-6 bg-gray-50 rounded-lg p-4;
}

.validation-details h4 {
  @apply font-medium text-gray-900 mb-3;
}

.validation-section {
  @apply mb-3;
}

.validation-section h5 {
  @apply font-medium mb-2;
}

.validation-section.warnings {
  @apply text-yellow-700;
}

.validation-section.errors {
  @apply text-red-700;
}

.validation-section ul {
  @apply list-disc list-inside space-y-1 text-sm;
}

.custom-form {
  @apply space-y-6;
}

.form-section {
  @apply bg-gray-50 rounded-lg p-4;
}

.form-section h4 {
  @apply font-medium text-gray-900 mb-3;
}

.form-row {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.form-group {
  @apply flex flex-col;
}

.form-group label {
  @apply text-sm font-medium text-gray-700 mb-1;
}

.form-group input {
  @apply px-3 py-2 border border-gray-300 rounded-md
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.generation-summary {
  @apply bg-gray-50 rounded-lg p-4 mb-4;
}

.generation-summary h4 {
  @apply font-medium text-gray-900 mb-3;
}

.summary-content {
  @apply space-y-2;
}

.summary-row {
  @apply flex justify-between;
}

.summary-row .label {
  @apply font-medium text-gray-700;
}

.summary-row .value {
  @apply text-gray-900;
}

.test-name-input {
  @apply flex flex-col;
}

.test-name-input label {
  @apply text-sm font-medium text-gray-700 mb-1;
}

.test-name-input input {
  @apply px-3 py-2 border border-gray-300 rounded-md
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.config-actions {
  @apply flex justify-between items-center pt-4 border-t border-gray-200;
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

.error-message {
  @apply flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md mt-4;
}

.loading-overlay {
  @apply absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center rounded-lg;
}

.loading-overlay span {
  @apply mt-2 text-gray-600;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>