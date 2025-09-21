<template>
  <div class="test-configuration-workflow">
    <!-- Workflow Header -->
    <div class="workflow-header">
      <div class="progress-indicator">
        <div 
          v-for="(step, index) in workflowSteps"
          :key="step.id"
          :class="['progress-step', {
            'completed': index < currentStepIndex,
            'active': index === currentStepIndex,
            'disabled': index > currentStepIndex
          }]"
        >
          <div class="step-icon">
            <Icon v-if="index < currentStepIndex" name="check" />
            <Icon v-else-if="index === currentStepIndex" :name="step.icon" />
            <Icon v-else :name="step.icon" />
          </div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="workflow-content">
      <!-- Step 1: Review Summary -->
      <div v-if="currentStep === 'review'" class="step-content">
        <h2>Review Summary</h2>
        <p class="step-description">
          Review the processed questions and diagrams before configuring your test.
        </p>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon">
              <Icon name="file-text" />
            </div>
            <div class="card-content">
              <h3>{{ questions.length }}</h3>
              <p>Total Questions</p>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">
              <Icon name="image" />
            </div>
            <div class="card-content">
              <h3>{{ questionsWithDiagrams }}</h3>
              <p>Questions with Diagrams</p>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">
              <Icon name="layers" />
            </div>
            <div class="card-content">
              <h3>{{ subjectCount }}</h3>
              <p>Subjects Detected</p>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">
              <Icon name="zap" />
            </div>
            <div class="card-content">
              <h3>{{ Math.round(averageConfidence * 100) }}%</h3>
              <p>Average Confidence</p>
            </div>
          </div>
        </div>

        <div class="questions-preview">
          <h3>Questions Preview</h3>
          <div class="preview-list">
            <div 
              v-for="question in questions.slice(0, 5)"
              :key="question.id"
              class="preview-item"
            >
              <div class="question-info">
                <span class="question-id">Q{{ questions.indexOf(question) + 1 }}</span>
                <span class="question-subject">{{ question.subject || 'Unknown' }}</span>
                <span class="question-type">{{ question.type }}</span>
                <span v-if="question.hasDiagram" class="has-diagram">
                  <Icon name="image" />
                  {{ question.diagrams.length }} diagram(s)
                </span>
              </div>
              <div class="question-text">
                {{ question.text.substring(0, 100) }}...
              </div>
            </div>
          </div>
          <p v-if="questions.length > 5" class="preview-note">
            Showing 5 of {{ questions.length }} questions
          </p>
        </div>
      </div>

      <!-- Step 2: Preset Selection -->
      <div v-else-if="currentStep === 'preset'" class="step-content">
        <h2>Choose Test Configuration</h2>
        <p class="step-description">
          Select a preset configuration or create a custom test setup.
        </p>

        <div class="configuration-options">
          <div class="preset-section">
            <h3>Examination Presets</h3>
            <div class="preset-grid">
              <div
                v-for="preset in availablePresets"
                :key="preset.id"
                @click="selectPreset(preset)"
                :class="['preset-option', { 
                  'selected': selectedPreset?.id === preset.id,
                  'incompatible': presetCompatibility[preset.id] && !presetCompatibility[preset.id].isCompatible
                }]"
              >
                <div class="preset-header">
                  <h4>{{ preset.name }}</h4>
                  <div class="preset-badge">{{ preset.examType }}</div>
                </div>
                
                <div class="preset-details">
                  <div class="detail-row">
                    <Icon name="clock" />
                    <span>{{ preset.timeLimit }} minutes</span>
                  </div>
                  <div class="detail-row">
                    <Icon name="file-text" />
                    <span>{{ preset.questionDistribution.totalQuestions }} questions</span>
                  </div>
                  <div class="detail-row">
                    <Icon name="layers" />
                    <span>{{ preset.sections.length }} sections</span>
                  </div>
                </div>

                <div class="preset-sections">
                  <div 
                    v-for="section in preset.sections"
                    :key="section.name"
                    class="section-chip"
                  >
                    {{ section.name }} ({{ section.questionCount }})
                  </div>
                </div>

                <!-- Compatibility Status -->
                <div v-if="presetCompatibility[preset.id]" class="compatibility-status">
                  <div 
                    :class="['status-indicator', {
                      'compatible': presetCompatibility[preset.id].isCompatible,
                      'incompatible': !presetCompatibility[preset.id].isCompatible
                    }]"
                  >
                    <Icon :name="presetCompatibility[preset.id].isCompatible ? 'check-circle' : 'alert-triangle'" />
                    <span>
                      {{ presetCompatibility[preset.id].isCompatible ? 'Compatible' : 'Issues Found' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Custom Configuration Option -->
              <div
                @click="selectCustomConfiguration"
                :class="['preset-option', 'custom-option', { 
                  'selected': selectedPreset === null && useCustomConfig
                }]"
              >
                <div class="preset-header">
                  <h4>Custom Configuration</h4>
                  <div class="preset-badge custom">CUSTOM</div>
                </div>
                
                <div class="preset-details">
                  <div class="detail-row">
                    <Icon name="settings" />
                    <span>Flexible setup</span>
                  </div>
                  <div class="detail-row">
                    <Icon name="edit" />
                    <span>Manual configuration</span>
                  </div>
                  <div class="detail-row">
                    <Icon name="check" />
                    <span>Full control</span>
                  </div>
                </div>

                <p class="custom-description">
                  Create a custom test configuration with your own settings for timing, 
                  marking scheme, and question distribution.
                </p>
              </div>
            </div>
          </div>

          <!-- Compatibility Details -->
          <div v-if="selectedPreset && presetCompatibility[selectedPreset.id]" class="compatibility-details">
            <h3>Compatibility Check</h3>
            <div class="compatibility-content">
              <div 
                :class="['compatibility-header', {
                  'compatible': presetCompatibility[selectedPreset.id].isCompatible,
                  'incompatible': !presetCompatibility[selectedPreset.id].isCompatible
                }]"
              >
                <Icon :name="presetCompatibility[selectedPreset.id].isCompatible ? 'check-circle' : 'alert-triangle'" />
                <span>
                  {{ presetCompatibility[selectedPreset.id].isCompatible ? 'Configuration Compatible' : 'Compatibility Issues' }}
                </span>
              </div>

              <div v-if="presetCompatibility[selectedPreset.id].warnings.length > 0" class="compatibility-section warnings">
                <h4><Icon name="alert-circle" /> Warnings</h4>
                <ul>
                  <li v-for="warning in presetCompatibility[selectedPreset.id].warnings" :key="warning">
                    {{ warning }}
                  </li>
                </ul>
              </div>

              <div v-if="presetCompatibility[selectedPreset.id].suggestions.length > 0" class="compatibility-section suggestions">
                <h4><Icon name="lightbulb" /> Suggestions</h4>
                <ul>
                  <li v-for="suggestion in presetCompatibility[selectedPreset.id].suggestions" :key="suggestion">
                    {{ suggestion }}
                  </li>
                </ul>
              </div>

              <div v-if="presetCompatibility[selectedPreset.id].requiredAdjustments.length > 0" class="compatibility-section errors">
                <h4><Icon name="x-circle" /> Required Adjustments</h4>
                <ul>
                  <li v-for="adjustment in presetCompatibility[selectedPreset.id].requiredAdjustments" :key="adjustment">
                    {{ adjustment }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Custom Configuration -->
      <div v-else-if="currentStep === 'custom'" class="step-content">
        <h2>Custom Test Configuration</h2>
        <p class="step-description">
          Configure your test settings manually.
        </p>

        <div class="custom-config-form">
          <div class="config-section">
            <h3>Basic Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Test Name</label>
                <input
                  type="text"
                  v-model="customConfig.testName"
                  placeholder="Enter test name"
                />
              </div>
              
              <div class="form-group">
                <label>Total Duration (minutes)</label>
                <input
                  type="number"
                  v-model.number="customConfig.timeLimit"
                  min="1"
                  max="600"
                />
              </div>

              <div class="form-group">
                <label>Exam Type</label>
                <select v-model="customConfig.examType">
                  <option value="CUSTOM">Custom</option>
                  <option value="JEE">JEE Style</option>
                  <option value="NEET">NEET Style</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
            </div>
          </div>

          <div class="config-section">
            <h3>Marking Scheme</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Correct Answer</label>
                <input
                  type="number"
                  v-model.number="customConfig.markingScheme.correct"
                  step="0.5"
                />
              </div>
              
              <div class="form-group">
                <label>Incorrect Answer</label>
                <input
                  type="number"
                  v-model.number="customConfig.markingScheme.incorrect"
                  step="0.5"
                />
              </div>

              <div class="form-group">
                <label>Unattempted</label>
                <input
                  type="number"
                  v-model.number="customConfig.markingScheme.unattempted"
                  step="0.5"
                />
              </div>

              <div class="form-group">
                <label>
                  <input
                    type="checkbox"
                    v-model="enablePartialCredit"
                  />
                  Enable Partial Credit
                </label>
                <input
                  v-if="enablePartialCredit"
                  type="number"
                  v-model.number="customConfig.markingScheme.partialCredit"
                  step="0.5"
                  placeholder="Partial credit marks"
                />
              </div>
            </div>
          </div>

          <div class="config-section">
            <h3>Question Distribution</h3>
            <div class="sections-config">
              <div 
                v-for="(section, index) in customConfig.sections"
                :key="index"
                class="section-config"
              >
                <div class="section-header">
                  <h4>Section {{ index + 1 }}</h4>
                  <button 
                    v-if="customConfig.sections.length > 1"
                    @click="removeSection(index)"
                    class="btn btn-sm btn-danger"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                
                <div class="form-grid">
                  <div class="form-group">
                    <label>Section Name</label>
                    <input
                      type="text"
                      v-model="section.name"
                      placeholder="e.g., Physics"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label>Question Count</label>
                    <input
                      type="number"
                      v-model.number="section.questionCount"
                      min="1"
                      :max="questions.length"
                    />
                  </div>

                  <div class="form-group">
                    <label>Time Allocation (minutes)</label>
                    <input
                      type="number"
                      v-model.number="section.timeAllocation"
                      min="1"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label>Subjects</label>
                  <div class="subjects-input">
                    <input
                      type="text"
                      v-model="newSubject[index]"
                      @keyup.enter="addSubject(index)"
                      placeholder="Add subject and press Enter"
                    />
                    <div class="subjects-list">
                      <span 
                        v-for="subject in section.subjects"
                        :key="subject"
                        class="subject-tag"
                      >
                        {{ subject }}
                        <button @click="removeSubject(index, subject)">
                          <Icon name="x" />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button @click="addSection" class="btn btn-secondary">
                <Icon name="plus" />
                Add Section
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Final Review -->
      <div v-else-if="currentStep === 'review-final'" class="step-content">
        <h2>Final Review</h2>
        <p class="step-description">
          Review your test configuration before generating the final test.
        </p>

        <div class="final-review-content">
          <div class="config-summary">
            <h3>Test Configuration Summary</h3>
            
            <div class="summary-section">
              <h4>Basic Information</h4>
              <div class="info-grid">
                <div class="info-item">
                  <label>Test Name:</label>
                  <span>{{ finalConfig.testName }}</span>
                </div>
                <div class="info-item">
                  <label>Exam Type:</label>
                  <span>{{ finalConfig.examType }}</span>
                </div>
                <div class="info-item">
                  <label>Total Duration:</label>
                  <span>{{ finalConfig.timeLimit }} minutes</span>
                </div>
                <div class="info-item">
                  <label>Total Questions:</label>
                  <span>{{ finalConfig.questionDistribution.totalQuestions }}</span>
                </div>
              </div>
            </div>

            <div class="summary-section">
              <h4>Marking Scheme</h4>
              <div class="marking-display">
                <span class="marking-item correct">+{{ finalConfig.markingScheme.correct }}</span>
                <span class="marking-item incorrect">{{ finalConfig.markingScheme.incorrect }}</span>
                <span class="marking-item unattempted">{{ finalConfig.markingScheme.unattempted }}</span>
                <span v-if="finalConfig.markingScheme.partialCredit" class="marking-item partial">
                  +{{ finalConfig.markingScheme.partialCredit }} (partial)
                </span>
              </div>
            </div>

            <div class="summary-section">
              <h4>Sections</h4>
              <div class="sections-summary">
                <div 
                  v-for="section in finalConfig.sections"
                  :key="section.name"
                  class="section-summary"
                >
                  <div class="section-info">
                    <h5>{{ section.name }}</h5>
                    <div class="section-details">
                      <span>{{ section.questionCount }} questions</span>
                      <span>{{ section.timeAllocation }} minutes</span>
                      <span>{{ section.subjects.join(', ') }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="questions-assignment">
            <h3>Question Assignment Preview</h3>
            <div class="assignment-preview">
              <div 
                v-for="section in finalConfig.sections"
                :key="section.name"
                class="section-assignment"
              >
                <h4>{{ section.name }}</h4>
                <div class="assigned-questions">
                  <div 
                    v-for="question in getAssignedQuestions(section)"
                    :key="question.id"
                    class="assigned-question"
                  >
                    <span class="question-number">Q{{ questions.indexOf(question) + 1 }}</span>
                    <span class="question-subject">{{ question.subject }}</span>
                    <span class="question-type">{{ question.type }}</span>
                    <span v-if="question.hasDiagram" class="has-diagram">
                      <Icon name="image" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Workflow Actions -->
    <div class="workflow-actions">
      <button 
        v-if="currentStepIndex > 0"
        @click="previousStep"
        class="btn btn-secondary"
      >
        <Icon name="arrow-left" />
        Previous
      </button>

      <div class="actions-right">
        <button 
          v-if="currentStep !== 'review-final'"
          @click="nextStep"
          class="btn btn-primary"
          :disabled="!canProceed"
        >
          Next
          <Icon name="arrow-right" />
        </button>

        <button 
          v-else
          @click="generateTest"
          class="btn btn-success"
          :disabled="isGenerating"
        >
          <Icon name="check" />
          {{ isGenerating ? 'Generating...' : 'Generate Test' }}
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <Icon name="loader" class="animate-spin" />
        <p>{{ loadingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { 
  EnhancedQuestion,
  CBTPreset,
  ConfiguredTest,
  PresetValidationResult
} from '~/shared/types/diagram-detection'
import { useCBTPresets } from '~/app/composables/useCBTPresets'

interface Props {
  questions: EnhancedQuestion[]
  onComplete?: (configuredTest: ConfiguredTest) => void
}

const props = defineProps<Props>()

const emit = defineEmits<{
  complete: [configuredTest: ConfiguredTest]
  cancel: []
  stepChange: [step: string, index: number]
}>()

// Workflow steps
const workflowSteps = [
  { id: 'review', label: 'Review', icon: 'eye' },
  { id: 'preset', label: 'Configuration', icon: 'settings' },
  { id: 'custom', label: 'Customize', icon: 'edit' },
  { id: 'review-final', label: 'Final Review', icon: 'check' }
]

// State
const currentStepIndex = ref(0)
const selectedPreset = ref<CBTPreset | null>(null)
const useCustomConfig = ref(false)
const isLoading = ref(false)
const isGenerating = ref(false)
const loadingMessage = ref('')
const enablePartialCredit = ref(false)
const newSubject = ref<Record<number, string>>({})

// CBT Presets composable
const {
  presets: availablePresets,
  loadPresets,
  selectPreset: selectCBTPreset,
  validatePreset,
  applyPreset,
  createCustomPreset
} = useCBTPresets({
  enableWebScraping: true,
  autoValidate: true
})

const presetCompatibility = ref<Record<string, PresetValidationResult>>({})

// Custom configuration
const customConfig = ref({
  testName: 'Custom Test',
  examType: 'CUSTOM',
  timeLimit: 180,
  markingScheme: {
    correct: 4,
    incorrect: -1,
    unattempted: 0,
    partialCredit: undefined as number | undefined
  },
  sections: [
    {
      name: 'General',
      subjects: ['General'],
      questionCount: props.questions.length,
      timeAllocation: 180
    }
  ]
})

// Computed properties
const currentStep = computed(() => workflowSteps[currentStepIndex.value].id)

const questionsWithDiagrams = computed(() => 
  props.questions.filter(q => q.hasDiagram).length
)

const subjectCount = computed(() => {
  const subjects = new Set(props.questions.map(q => q.subject).filter(Boolean))
  return subjects.size
})

const averageConfidence = computed(() => {
  if (props.questions.length === 0) return 0
  const total = props.questions.reduce((sum, q) => sum + q.confidence, 0)
  return total / props.questions.length
})

const finalConfig = computed(() => {
  if (selectedPreset.value) {
    return {
      testName: `${selectedPreset.value.name} Test`,
      examType: selectedPreset.value.examType,
      timeLimit: selectedPreset.value.timeLimit,
      markingScheme: selectedPreset.value.markingScheme,
      sections: selectedPreset.value.sections,
      questionDistribution: selectedPreset.value.questionDistribution
    }
  } else {
    return {
      testName: customConfig.value.testName,
      examType: customConfig.value.examType,
      timeLimit: customConfig.value.timeLimit,
      markingScheme: customConfig.value.markingScheme,
      sections: customConfig.value.sections,
      questionDistribution: {
        totalQuestions: customConfig.value.sections.reduce((sum, s) => sum + s.questionCount, 0),
        sections: customConfig.value.sections.map(s => ({
          name: s.name,
          subjects: s.subjects,
          questionCount: s.questionCount,
          timeAllocation: s.timeAllocation
        }))
      }
    }
  }
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 'review':
      return props.questions.length > 0
    case 'preset':
      return selectedPreset.value !== null || useCustomConfig.value
    case 'custom':
      return useCustomConfig.value && customConfig.value.testName.trim() !== ''
    case 'review-final':
      return true
    default:
      return false
  }
})

// Lifecycle
onMounted(async () => {
  await loadPresets()
  await checkPresetCompatibility()
})

// Watch for preset changes
watch(availablePresets, async () => {
  await checkPresetCompatibility()
})

// Methods
async function checkPresetCompatibility() {
  for (const preset of availablePresets.value) {
    try {
      await selectCBTPreset(preset.id)
      const result = await validatePreset(props.questions)
      if (result) {
        presetCompatibility.value[preset.id] = result
      }
    } catch (error) {
      console.warn(`Failed to validate preset ${preset.id}:`, error)
    }
  }
}

function selectPreset(preset: CBTPreset) {
  selectedPreset.value = preset
  useCustomConfig.value = false
}

function selectCustomConfiguration() {
  selectedPreset.value = null
  useCustomConfig.value = true
}

function nextStep() {
  if (currentStepIndex.value < workflowSteps.length - 1) {
    // Skip custom step if using preset
    if (currentStep.value === 'preset' && selectedPreset.value) {
      currentStepIndex.value += 2 // Skip custom step
    } else {
      currentStepIndex.value++
    }
    
    emit('stepChange', currentStep.value, currentStepIndex.value)
  }
}

function previousStep() {
  if (currentStepIndex.value > 0) {
    // Skip custom step if using preset
    if (currentStep.value === 'review-final' && selectedPreset.value) {
      currentStepIndex.value -= 2 // Skip custom step
    } else {
      currentStepIndex.value--
    }
    
    emit('stepChange', currentStep.value, currentStepIndex.value)
  }
}

function addSection() {
  customConfig.value.sections.push({
    name: `Section ${customConfig.value.sections.length + 1}`,
    subjects: [],
    questionCount: 1,
    timeAllocation: 30
  })
}

function removeSection(index: number) {
  if (customConfig.value.sections.length > 1) {
    customConfig.value.sections.splice(index, 1)
  }
}

function addSubject(sectionIndex: number) {
  const subject = newSubject.value[sectionIndex]?.trim()
  if (subject && !customConfig.value.sections[sectionIndex].subjects.includes(subject)) {
    customConfig.value.sections[sectionIndex].subjects.push(subject)
    newSubject.value[sectionIndex] = ''
  }
}

function removeSubject(sectionIndex: number, subject: string) {
  const subjects = customConfig.value.sections[sectionIndex].subjects
  const index = subjects.indexOf(subject)
  if (index > -1) {
    subjects.splice(index, 1)
  }
}

function getAssignedQuestions(section: any) {
  // Simple assignment logic - in real implementation, this would be more sophisticated
  const sectionQuestions = props.questions.filter(q => 
    section.subjects.some((subject: string) => 
      q.subject?.toLowerCase().includes(subject.toLowerCase())
    )
  )
  return sectionQuestions.slice(0, section.questionCount)
}

async function generateTest() {
  isGenerating.value = true
  loadingMessage.value = 'Generating test configuration...'

  try {
    let configuredTest: ConfiguredTest

    if (selectedPreset.value) {
      // Apply preset configuration
      configuredTest = await applyPreset(props.questions, finalConfig.value.testName)
    } else {
      // Create custom configuration
      const customPreset = createCustomPreset(
        props.questions,
        customConfig.value.testName,
        customConfig.value.examType
      )
      
      configuredTest = await applyPreset(props.questions, customConfig.value.testName)
    }

    emit('complete', configuredTest)
    
    if (props.onComplete) {
      props.onComplete(configuredTest)
    }
  } catch (error) {
    console.error('Failed to generate test:', error)
    // Handle error (show notification, etc.)
  } finally {
    isGenerating.value = false
  }
}

// Expose methods for parent components
defineExpose({
  nextStep,
  previousStep,
  generateTest,
  getCurrentStep: () => currentStep.value,
  getCurrentStepIndex: () => currentStepIndex.value
})
</script>

<style scoped>
.test-configuration-workflow {
  @apply max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden;
}

.workflow-header {
  @apply bg-gray-50 border-b border-gray-200 p-6;
}

.progress-indicator {
  @apply flex justify-between items-center;
}

.progress-step {
  @apply flex flex-col items-center gap-2 flex-1;
}

.progress-step:not(:last-child)::after {
  content: '';
  @apply absolute top-6 left-1/2 w-full h-0.5 bg-gray-300 -z-10;
}

.progress-step.completed::after {
  @apply bg-green-500;
}

.step-icon {
  @apply w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors;
}

.progress-step.completed .step-icon {
  @apply bg-green-500 border-green-500 text-white;
}

.progress-step.active .step-icon {
  @apply bg-blue-500 border-blue-500 text-white;
}

.progress-step.disabled .step-icon {
  @apply bg-gray-200 border-gray-300 text-gray-500;
}

.step-label {
  @apply text-sm font-medium text-gray-700;
}

.progress-step.completed .step-label {
  @apply text-green-600;
}

.progress-step.active .step-label {
  @apply text-blue-600;
}

.workflow-content {
  @apply p-6;
}

.step-content h2 {
  @apply text-2xl font-bold text-gray-900 mb-2;
}

.step-description {
  @apply text-gray-600 mb-6;
}

.summary-cards {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6;
}

.summary-card {
  @apply bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3;
}

.card-icon {
  @apply w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600;
}

.card-content h3 {
  @apply text-2xl font-bold text-gray-900;
}

.card-content p {
  @apply text-sm text-gray-600;
}

.questions-preview {
  @apply bg-gray-50 rounded-lg p-4;
}

.questions-preview h3 {
  @apply text-lg font-semibold text-gray-900 mb-3;
}

.preview-list {
  @apply space-y-3;
}

.preview-item {
  @apply bg-white rounded-lg p-3 border border-gray-200;
}

.question-info {
  @apply flex items-center gap-2 mb-2;
}

.question-id {
  @apply px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium;
}

.question-subject {
  @apply px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs;
}

.question-type {
  @apply px-2 py-1 bg-green-100 text-green-800 rounded text-xs;
}

.has-diagram {
  @apply px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs flex items-center gap-1;
}

.question-text {
  @apply text-sm text-gray-700;
}

.preview-note {
  @apply text-sm text-gray-500 mt-3;
}

.preset-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.preset-option {
  @apply border border-gray-200 rounded-lg p-4 cursor-pointer transition-all
         hover:border-blue-300 hover:shadow-md;
}

.preset-option.selected {
  @apply border-blue-500 bg-blue-50 shadow-md;
}

.preset-option.incompatible {
  @apply border-red-300 bg-red-50;
}

.preset-option.custom-option {
  @apply border-dashed border-2 border-gray-300 hover:border-blue-400;
}

.preset-header {
  @apply flex justify-between items-start mb-3;
}

.preset-header h4 {
  @apply text-lg font-semibold text-gray-900;
}

.preset-badge {
  @apply px-2 py-1 text-xs font-medium rounded;
}

.preset-badge:not(.custom) {
  @apply bg-gray-100 text-gray-800;
}

.preset-badge.custom {
  @apply bg-purple-100 text-purple-800;
}

.preset-details {
  @apply space-y-2 mb-3;
}

.detail-row {
  @apply flex items-center gap-2 text-sm text-gray-600;
}

.preset-sections {
  @apply flex flex-wrap gap-2 mb-3;
}

.section-chip {
  @apply px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs;
}

.compatibility-status {
  @apply mt-3 pt-3 border-t border-gray-200;
}

.status-indicator {
  @apply flex items-center gap-2 text-sm;
}

.status-indicator.compatible {
  @apply text-green-600;
}

.status-indicator.incompatible {
  @apply text-red-600;
}

.custom-description {
  @apply text-sm text-gray-600 mt-3;
}

.compatibility-details {
  @applystyle>; }
}
</e(360deg)tat roform:transto { g); }
  otate(0densform: rtram { rospin {
  frames 

@keyfinfinite;
}n 1s linear ation: spiin {
  animnimate-sp

.a
}600;text-gray-ply mt-2 @ap
  ent p {ding-cont
}

.loaxt-center;  @apply te-content {
ng
.loadi}
center;
stify-nter jutems-ce75 flex iity-acop bg-g-white0 bute inset-y absoly {
  @applng-overla
.loadi}
;
y-1 text-sm px-2 p {
  @applybtn-sm
.700;
}
bg-red-ite hover:-600 text-whly bg-reder {
  @appdang
.btn-owed;
}
rsor-not-all disabled:cupacity-50led:o700 disaben-over:bg-grete hext-whi tg-green-600ly b
  @app {btn-success0;
}

.y-30g-grar:by-800 hovext-gra-200 tey bg-graypply {
  @asecondarn-
}

.btd;-alloweursor-not0 disabled:ccity-5disabled:opablue-700 hover:bg-te xt-whi teg-blue-600
  @apply b-primary {tn
.b
}
olors;ransition-cnter gap-2 tce flex items-dium font-meded-md2 roun py-apply px-4{
  @

.btn p-3;
}ply flex ga
  @apright {ctions-
.ay-200;
}
rder-graorder-t bobg-gray-50 b p-6 tems-centern i-betweefy justilex
  @apply fons {w-actirkflo
.wo
;
}xsnded text-reen-800 rouxt-gn-100 te-1 bg-greepx-2 pyply   @aptype {
.question-xs;
}

t-unded tex800 rot-gray-tex00 gray-1y-1 bg-ly px-2 p{
  @appbject tion-su.quesdium;
}

-xs font-metext0 rounded text-blue-80-100 lue bg-by-1 py px-2pl
  @aper {estion-numb.qu;
}

xt-sm gap-2 teer items-centy flexpl @aption {
 quesgned-assi2;
}

.ap-ols-2 gid-c md:grid-cols-1gry grid applons {
  @d-questine.assig
3;
}
900 mb-m text-gray-iufont-medply   @aph4 {
gnment ssiion-a

.sectd-lg p-4;
}y-50 roundegra  @apply bg- {
n-assignmentsectioy-4;
}

.space-pply 
  @a {nt-previewassignmeb-4;
}

.y-900 mxt-gra tesemiboldxt-lg font-apply teh3 {
  @ment gn-assistionsque
}

.space-y-4;
  @apply gnment {ions-assiest.qu
}

ay-600;xt-gr text-sm tep-3ex gay flppl {
  @ailsn-deta
.sectiob-2;
}
 mext-gray-900ium ty font-med  @appl h5 {
ection-info}

.s0;
20y-ra-g borderder3 borp-ded-lg -white rounapply bgry {
  @ion-summa.sect-3;
}

 space-ypplyry {
  @a-summasections
}

.blue-800;100 text- bg-blue-  @apply
em.partial {marking-it

.
}y-800;graxt-gray-100 te  @apply bg-ted {
ttemp-item.unarking
}

.maed-800;t-rtex bg-red-100 @apply   {
incorrectrking-item.}

.ma
reen-800;ext-gn-100 t bg-gree
  @applycorrect {g-item..markin
}

medium;ext-sm font- rounded t3 py-1apply px--item {
  @
.marking}
-3;
x gapy fle  @appllay {
ing-disp
.mark700;
}
-gray-xtt-medium teply fon  @apel {
em labito-inf

.
}between;tify-lex juspply fm {
  @a-itefo
.in;
}
gap-3cols-2  md:grid-ols-1d-c grid gri  @applyo-grid {
nf
.i3;
}
ray-900 mb-dium text-gfont-me  @apply ion h4 {
ummary-sect

.s;
}-4ed-lg pay-50 roundply bg-gr @apection {
 ry-smma
.su mb-4;
}
900d text-gray-ibol-semfonttext-lg ly 
  @appmary h3 {ig-sumnf;
}

.cospace-y-4ly ppy {
  @ammarfig-su.con

6;
}gap--2 g:grid-colsrid-cols-1 l grid @apply g
 t {iew-contenal-rev}

.fin-800;
xt-blue hover:te600 text-blue-
  @applyon {ect-tag buttbj.su
}

nter gap-1;ems-cem flex it-sounded text-800 rluee-100 text-b-1 bg-blupypx-2  @apply 
 g {tat-
.subjec2;
}
rap gap-lex flex-w @apply fs-list {
 

.subject
}-2;pply space-y {
  @autinpbjects-
.su
}
gray-900;um text-font-meditext-lg 
  @apply der h4 {tion-hea.sec

er mb-3;
}ems-centeen it-betw justify @apply flex{
 ion-header 

.sect200;
}er-gray-order b-4 bord ped-lgundhite ro-wbgly 
  @appn-config {
.sectioce-y-4;
}
ply spa@apig {
  ctions-conf.seent;
}

er-transpar focus:bordue-500us:ring-bling-2 foccus:r-none foocus:outline        founded-md
 -300 rborder-grayborder y-2 ply px-3 p  @ap select {
up
.form-group input,-gro
.formmb-1;
}
t-gray-700 texedium font-mply text-sm  @ap
 p label {orm-grou;
}

.flex-colpply flex f
  @ap {oum-gr.forp-4;
}

s-3 galg:grid-col-cols-2 ridmd:g1 ols-id grid-c grpplyd {
  @arm-gri
.fo-4;
}
mbt-gray-900 bold texemint-st-lg fo@apply texh3 {
  section g-onfi4;
}

.ced-lg p-ay-50 roundy bg-grplon {
  @apnfig-secti}

.coe-y-6;
pply spac@a
  m {config-fortom-
}

.cus-1 text-sm;ce-y spaideist-ins-disc llist{
  @apply -section ul atibility

.comped-700;
}text-r @apply rors {
 tion.ertibility-seccompa

.0;
}text-blue-70  @apply stions {
ggetion.suy-secibilitpat

.com
};yellow-700ply text-ngs {
  @apwarnisection.mpatibility-co
}

.ium mb-2;ont-med gap-2 fms-centerflex ite
  @apply {n h4 tiobility-sec
.compati
}
-4;
  @apply mb {tionsecibility-atmp
}

.co-red-600;pply texte {
  @apatibl.incomty-headercompatibili
.
}
green-600;ly text-
  @appmpatible {ader.coty-heompatibilium;
}

.c-4 font-medir gap-2 mbs-centelex itemply fap @der {
 ty-heatibili.compa3;
}

900 mb--gray-mibold textg font-seply text-l3 {
  @ap hilsetay-dpatibilit

.com-4;
}-lg py-50 rounded mt-6 bg-gra