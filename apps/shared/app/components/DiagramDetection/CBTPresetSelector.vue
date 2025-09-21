<template>
  <div class="cbt-preset-selector">
    <!-- Header -->
    <div class="selector-header">
      <h3 class="title">Configure CBT Test</h3>
      <p class="description">
        Choose a preset configuration or create a custom test setup
      </p>
    </div>

    <!-- Preset Options -->
    <div class="preset-options">
      <div class="preset-tabs">
        <button
          v-for="category in presetCategories"
          :key="category"
          @click="selectedCategory = category"
          :class="['tab-button', { active: selectedCategory === category }]"
        >
          {{ category }}
        </button>
      </div>

      <!-- Preset Cards -->
      <div class="preset-cards" v-if="filteredPresets.length > 0">
        <div
          v-for="preset in filteredPresets"
          :key="preset.id"
          @click="selectPreset(preset)"
          :class="['preset-card', { selected: selectedPreset?.id === preset.id }]"
        >
          <div class="preset-header">
            <h4 class="preset-name">{{ preset.name }}</h4>
            <div class="preset-badge">{{ preset.examType }}</div>
          </div>

          <div class="preset-details">
            <div class="detail-item">
              <Icon name="clock" />
              <span>{{ preset.timeLimit }} minutes</span>
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

          <div class="preset-sections">
            <div
              v-for="section in preset.sections"
              :key="section.name"
              class="section-summary"
            >
              <span class="section-name">{{ section.name }}</span>
              <span class="section-count">{{ section.questionCount }}Q</span>
            </div>
          </div>

          <div class="preset-marking" v-if="preset.markingScheme">
            <span class="marking-label">Marking:</span>
            <span class="marking-scheme">
              +{{ preset.markingScheme.correct }}
              <template v-if="preset.markingScheme.incorrect !== 0">
                / {{ preset.markingScheme.incorrect }}
              </template>
            </span>
          </div>

          <div class="preset-updated" v-if="preset.updatedAt">
            <Icon name="refresh-cw" />
            <span>Updated {{ formatDate(preset.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- No Presets Message -->
      <div v-else class="no-presets">
        <Icon name="inbox" />
        <p>No presets available for {{ selectedCategory }}</p>
        <button @click="createCustomPreset" class="btn btn-primary">
          Create Custom Preset
        </button>
      </div>
    </div>

    <!-- Selected Preset Details -->
    <div v-if="selectedPreset" class="selected-preset-details">
      <h4>{{ selectedPreset.name }} Configuration</h4>
      
      <div class="configuration-grid">
        <div class="config-section">
          <h5>Test Structure</h5>
          <div class="config-items">
            <div class="config-item">
              <label>Total Questions:</label>
              <span>{{ selectedPreset.questionDistribution.totalQuestions }}</span>
            </div>
            <div class="config-item">
              <label>Total Duration:</label>
              <span>{{ selectedPreset.timeLimit }} minutes</span>
            </div>
            <div class="config-item">
              <label>Sections:</label>
              <span>{{ selectedPreset.sections.length }}</span>
            </div>
          </div>
        </div>

        <div class="config-section">
          <h5>Marking Scheme</h5>
          <div class="config-items">
            <div class="config-item">
              <label>Correct Answer:</label>
              <span>+{{ selectedPreset.markingScheme.correct }} marks</span>
            </div>
            <div class="config-item">
              <label>Incorrect Answer:</label>
              <span>{{ selectedPreset.markingScheme.incorrect }} marks</span>
            </div>
            <div class="config-item">
              <label>Unattempted:</label>
              <span>{{ selectedPreset.markingScheme.unattempted }} marks</span>
            </div>
            <div v-if="selectedPreset.markingScheme.partialCredit" class="config-item">
              <label>Partial Credit:</label>
              <span>+{{ selectedPreset.markingScheme.partialCredit }} marks</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-breakdown">
        <h5>Section Breakdown</h5>
        <div class="sections-table">
          <div class="table-header">
            <span>Section</span>
            <span>Subjects</span>
            <span>Questions</span>
            <span>Time (min)</span>
          </div>
          <div
            v-for="section in selectedPreset.sections"
            :key="section.name"
            class="table-row"
          >
            <span class="section-name">{{ section.name }}</span>
            <span class="section-subjects">{{ section.subjects.join(', ') }}</span>
            <span class="section-questions">{{ section.questionCount }}</span>
            <span class="section-time">{{ section.timeAllocation }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Compatibility Check -->
    <div v-if="selectedPreset && compatibilityResult" class="compatibility-check">
      <div :class="['compatibility-status', compatibilityResult.isCompatible ? 'compatible' : 'incompatible']">
        <Icon :name="compatibilityResult.isCompatible ? 'check-circle' : 'alert-triangle'" />
        <span>
          {{ compatibilityResult.isCompatible ? 'Compatible' : 'Compatibility Issues' }}
        </span>
      </div>

      <div v-if="compatibilityResult.warnings.length > 0" class="compatibility-warnings">
        <h6>Warnings:</h6>
        <ul>
          <li v-for="warning in compatibilityResult.warnings" :key="warning">
            {{ warning }}
          </li>
        </ul>
      </div>

      <div v-if="compatibilityResult.suggestions.length > 0" class="compatibility-suggestions">
        <h6>Suggestions:</h6>
        <ul>
          <li v-for="suggestion in compatibilityResult.suggestions" :key="suggestion">
            {{ suggestion }}
          </li>
        </ul>
      </div>

      <div v-if="compatibilityResult.requiredAdjustments.length > 0" class="compatibility-errors">
        <h6>Required Adjustments:</h6>
        <ul>
          <li v-for="adjustment in compatibilityResult.requiredAdjustments" :key="adjustment">
            {{ adjustment }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Actions -->
    <div class="selector-actions">
      <button @click="refreshPresets" class="btn btn-secondary" :disabled="isRefreshing">
        <Icon name="refresh-cw" :class="{ 'animate-spin': isRefreshing }" />
        {{ isRefreshing ? 'Refreshing...' : 'Refresh Presets' }}
      </button>

      <button @click="createCustomPreset" class="btn btn-secondary">
        <Icon name="plus" />
        Create Custom
      </button>

      <button @click="$emit('cancel')" class="btn btn-secondary">
        Cancel
      </button>

      <button
        @click="applyPreset"
        class="btn btn-primary"
        :disabled="!selectedPreset || (compatibilityResult && !compatibilityResult.isCompatible)"
      >
        <Icon name="check" />
        Apply Configuration
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <Icon name="loader" class="animate-spin" />
        <p>{{ loadingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { 
  CBTPreset, 
  EnhancedQuestion,
  PresetValidationResult,
  ConfiguredTest
} from '~/shared/types/diagram-detection'
import { CBTPresetEngine, createCBTPresetEngine } from '~/app/utils/cbtPresetEngine'

interface Props {
  questions: EnhancedQuestion[]
  initialPreset?: string
  enableWebScraping?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enableWebScraping: true
})

const emit = defineEmits<{
  presetSelected: [preset: CBTPreset]
  configurationApplied: [config: ConfiguredTest]
  customPresetRequested: []
  cancel: []
}>()

// State
const presetEngine = ref<CBTPresetEngine>()
const availablePresets = ref<CBTPreset[]>([])
const selectedPreset = ref<CBTPreset | null>(null)
const selectedCategory = ref<string>('All')
const compatibilityResult = ref<PresetValidationResult | null>(null)
const isLoading = ref(false)
const isRefreshing = ref(false)
const loadingMessage = ref('')

// Computed
const presetCategories = computed(() => {
  const categories = new Set(['All'])
  availablePresets.value.forEach(preset => {
    categories.add(preset.examType)
  })
  return Array.from(categories)
})

const filteredPresets = computed(() => {
  if (selectedCategory.value === 'All') {
    return availablePresets.value
  }
  return availablePresets.value.filter(preset => preset.examType === selectedCategory.value)
})

// Lifecycle
onMounted(async () => {
  await initializePresetEngine()
  await loadPresets()
  
  // Select initial preset if provided
  if (props.initialPreset) {
    const preset = availablePresets.value.find(p => p.id === props.initialPreset)
    if (preset) {
      selectPreset(preset)
    }
  }
})

// Watch for preset selection changes
watch(selectedPreset, async (newPreset) => {
  if (newPreset) {
    await checkCompatibility(newPreset)
    emit('presetSelected', newPreset)
  }
})

// Methods
async function initializePresetEngine() {
  presetEngine.value = createCBTPresetEngine({
    enableWebScraping: props.enableWebScraping,
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
    fallbackToCache: true
  })
}

async function loadPresets() {
  if (!presetEngine.value) return

  isLoading.value = true
  loadingMessage.value = 'Loading presets...'

  try {
    availablePresets.value = presetEngine.value.getAllPresets()
  } catch (error) {
    console.error('Failed to load presets:', error)
  } finally {
    isLoading.value = false
  }
}

async function refreshPresets() {
  if (!presetEngine.value) return

  isRefreshing.value = true
  
  try {
    // Clear cache and reload presets with fresh data
    const examTypes = ['JEE', 'NEET']
    
    for (const examType of examTypes) {
      try {
        await presetEngine.value.fetchLatestExamSchema(examType)
      } catch (error) {
        console.warn(`Failed to refresh ${examType} schema:`, error)
      }
    }
    
    await loadPresets()
  } finally {
    isRefreshing.value = false
  }
}

function selectPreset(preset: CBTPreset) {
  selectedPreset.value = preset
}

async function checkCompatibility(preset: CBTPreset) {
  if (!presetEngine.value) return

  try {
    compatibilityResult.value = presetEngine.value.validatePresetCompatibility(
      props.questions,
      preset
    )
  } catch (error) {
    console.error('Failed to check compatibility:', error)
    compatibilityResult.value = {
      isCompatible: false,
      warnings: [],
      suggestions: [],
      requiredAdjustments: ['Failed to validate compatibility']
    }
  }
}

async function applyPreset() {
  if (!selectedPreset.value || !presetEngine.value) return

  isLoading.value = true
  loadingMessage.value = 'Applying configuration...'

  try {
    const configuredTest = await presetEngine.value.applyPresetToQuestions(
      props.questions,
      selectedPreset.value.id,
      `${selectedPreset.value.name} Test`
    )

    emit('configurationApplied', configuredTest)
  } catch (error) {
    console.error('Failed to apply preset:', error)
    // Handle error (show notification, etc.)
  } finally {
    isLoading.value = false
  }
}

function createCustomPreset() {
  emit('customPresetRequested')
}

function formatDate(date: Date): string {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    'day'
  )
}
</script>

<style scoped>
.cbt-preset-selector {
  @apply bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto relative;
}

.selector-header {
  @apply mb-6 text-center;
}

.title {
  @apply text-2xl font-bold text-gray-900 mb-2;
}

.description {
  @apply text-gray-600;
}

.preset-options {
  @apply mb-6;
}

.preset-tabs {
  @apply flex gap-2 mb-4 border-b border-gray-200;
}

.tab-button {
  @apply px-4 py-2 text-sm font-medium text-gray-600 border-b-2 border-transparent
         hover:text-gray-900 hover:border-gray-300 transition-colors;
}

.tab-button.active {
  @apply text-blue-600 border-blue-600;
}

.preset-cards {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.preset-card {
  @apply border border-gray-200 rounded-lg p-4 cursor-pointer transition-all
         hover:border-blue-300 hover:shadow-md;
}

.preset-card.selected {
  @apply border-blue-500 bg-blue-50 shadow-md;
}

.preset-header {
  @apply flex justify-between items-start mb-3;
}

.preset-name {
  @apply text-lg font-semibold text-gray-900;
}

.preset-badge {
  @apply px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded;
}

.preset-details {
  @apply space-y-2 mb-3;
}

.detail-item {
  @apply flex items-center gap-2 text-sm text-gray-600;
}

.preset-sections {
  @apply flex flex-wrap gap-2 mb-3;
}

.section-summary {
  @apply flex items-center justify-between px-2 py-1 bg-gray-100 rounded text-xs;
}

.section-name {
  @apply font-medium;
}

.section-count {
  @apply text-gray-600 ml-2;
}

.preset-marking {
  @apply flex items-center gap-2 text-sm text-gray-600 mb-2;
}

.marking-label {
  @apply font-medium;
}

.marking-scheme {
  @apply font-mono;
}

.preset-updated {
  @apply flex items-center gap-1 text-xs text-gray-500;
}

.no-presets {
  @apply text-center py-8 text-gray-500;
}

.selected-preset-details {
  @apply border-t border-gray-200 pt-6 mb-6;
}

.configuration-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6 mb-6;
}

.config-section h5 {
  @apply text-lg font-semibold text-gray-900 mb-3;
}

.config-items {
  @apply space-y-2;
}

.config-item {
  @apply flex justify-between items-center;
}

.config-item label {
  @apply text-sm font-medium text-gray-700;
}

.config-item span {
  @apply text-sm text-gray-900;
}

.section-breakdown h5 {
  @apply text-lg font-semibold text-gray-900 mb-3;
}

.sections-table {
  @apply border border-gray-200 rounded-lg overflow-hidden;
}

.table-header {
  @apply grid grid-cols-4 gap-4 p-3 bg-gray-50 font-medium text-sm text-gray-700;
}

.table-row {
  @apply grid grid-cols-4 gap-4 p-3 border-t border-gray-200 text-sm;
}

.compatibility-check {
  @apply border border-gray-200 rounded-lg p-4 mb-6;
}

.compatibility-status {
  @apply flex items-center gap-2 mb-3;
}

.compatibility-status.compatible {
  @apply text-green-600;
}

.compatibility-status.incompatible {
  @apply text-red-600;
}

.compatibility-warnings,
.compatibility-suggestions,
.compatibility-errors {
  @apply mb-3;
}

.compatibility-warnings h6,
.compatibility-suggestions h6,
.compatibility-errors h6 {
  @apply font-semibold text-sm mb-2;
}

.compatibility-warnings {
  @apply text-yellow-700;
}

.compatibility-suggestions {
  @apply text-blue-700;
}

.compatibility-errors {
  @apply text-red-700;
}

.compatibility-warnings ul,
.compatibility-suggestions ul,
.compatibility-errors ul {
  @apply list-disc list-inside space-y-1 text-sm;
}

.selector-actions {
  @apply flex justify-end gap-3;
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

.loading-overlay {
  @apply absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg;
}

.loading-spinner {
  @apply text-center;
}

.loading-spinner p {
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