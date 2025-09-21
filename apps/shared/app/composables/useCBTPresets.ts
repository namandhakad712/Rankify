/**
 * CBT Presets Composable
 * 
 * Provides reactive CBT preset management functionality for Vue components.
 */

import { ref, computed, watch, type Ref } from 'vue'
import type { 
  CBTPreset, 
  EnhancedQuestion,
  ConfiguredTest,
  PresetValidationResult,
  ExamSchema
} from '~/shared/types/diagram-detection'
import { 
  CBTPresetEngine, 
  createCBTPresetEngine,
  type CBTPresetEngineConfig
} from '~/app/utils/cbtPresetEngine'

export interface UseCBTPresetsOptions {
  enableWebScraping?: boolean
  cacheTimeout?: number
  autoValidate?: boolean
  autoRefresh?: boolean
}

export interface CBTPresetsState {
  presets: Ref<CBTPreset[]>
  selectedPreset: Ref<CBTPreset | null>
  validationResult: Ref<PresetValidationResult | null>
  isLoading: Ref<boolean>
  isRefreshing: Ref<boolean>
  error: Ref<string | null>
}

export interface CBTPresetsActions {
  loadPresets: () => Promise<void>
  refreshPresets: () => Promise<void>
  selectPreset: (presetId: string) => Promise<void>
  validatePreset: (questions: EnhancedQuestion[]) => Promise<PresetValidationResult | null>
  applyPreset: (questions: EnhancedQuestion[], testName?: string) => Promise<ConfiguredTest | null>
  createCustomPreset: (questions: EnhancedQuestion[], name: string, examType?: string) => CBTPreset
  addCustomPreset: (preset: CBTPreset) => void
  getPresetsByType: (examType: string) => CBTPreset[]
  clearSelection: () => void
}

export function useCBTPresets(
  options: UseCBTPresetsOptions = {}
) {
  // Configuration
  const config: CBTPresetEngineConfig = {
    enableWebScraping: options.enableWebScraping ?? true,
    cacheTimeout: options.cacheTimeout ?? 24 * 60 * 60 * 1000, // 24 hours
    fallbackToCache: true
  }

  // Engine instance
  const engine = ref<CBTPresetEngine>()

  // Reactive state
  const presets = ref<CBTPreset[]>([])
  const selectedPreset = ref<CBTPreset | null>(null)
  const validationResult = ref<PresetValidationResult | null>(null)
  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const availableExamTypes = computed(() => {
    const types = new Set<string>()
    presets.value.forEach(preset => types.add(preset.examType))
    return Array.from(types)
  })

  const presetsByType = computed(() => {
    const grouped: Record<string, CBTPreset[]> = {}
    presets.value.forEach(preset => {
      if (!grouped[preset.examType]) {
        grouped[preset.examType] = []
      }
      grouped[preset.examType].push(preset)
    })
    return grouped
  })

  const hasValidSelection = computed(() => {
    return selectedPreset.value && 
           validationResult.value && 
           validationResult.value.isCompatible
  })

  // Initialize engine
  async function initializeEngine() {
    if (!engine.value) {
      engine.value = createCBTPresetEngine(config)
    }
  }

  // Load all available presets
  async function loadPresets() {
    await initializeEngine()
    if (!engine.value) return

    isLoading.value = true
    error.value = null

    try {
      presets.value = engine.value.getAllPresets()
    } catch (err) {
      error.value = `Failed to load presets: ${err.message}`
      console.error('Failed to load presets:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Refresh presets with latest data from web sources
  async function refreshPresets() {
    await initializeEngine()
    if (!engine.value) return

    isRefreshing.value = true
    error.value = null

    try {
      // Fetch latest schemas for known exam types
      const examTypes = ['JEE', 'NEET']
      
      for (const examType of examTypes) {
        try {
          await engine.value.fetchLatestExamSchema(examType)
        } catch (err) {
          console.warn(`Failed to refresh ${examType} schema:`, err)
        }
      }

      // Reload presets
      presets.value = engine.value.getAllPresets()
    } catch (err) {
      error.value = `Failed to refresh presets: ${err.message}`
      console.error('Failed to refresh presets:', err)
    } finally {
      isRefreshing.value = false
    }
  }

  // Select a preset by ID
  async function selectPreset(presetId: string) {
    await initializeEngine()
    if (!engine.value) return

    try {
      const preset = await engine.value.loadPreset(presetId)
      selectedPreset.value = preset
      validationResult.value = null
      error.value = null
    } catch (err) {
      error.value = `Failed to select preset: ${err.message}`
      console.error('Failed to select preset:', err)
    }
  }

  // Validate selected preset against questions
  async function validatePreset(questions: EnhancedQuestion[]): Promise<PresetValidationResult | null> {
    if (!engine.value || !selectedPreset.value) return null

    try {
      const result = engine.value.validatePresetCompatibility(questions, selectedPreset.value)
      validationResult.value = result
      return result
    } catch (err) {
      error.value = `Failed to validate preset: ${err.message}`
      console.error('Failed to validate preset:', err)
      return null
    }
  }

  // Apply selected preset to questions
  async function applyPreset(
    questions: EnhancedQuestion[], 
    testName?: string
  ): Promise<ConfiguredTest | null> {
    if (!engine.value || !selectedPreset.value) return null

    isLoading.value = true
    error.value = null

    try {
      const configuredTest = await engine.value.applyPresetToQuestions(
        questions,
        selectedPreset.value.id,
        testName
      )
      return configuredTest
    } catch (err) {
      error.value = `Failed to apply preset: ${err.message}`
      console.error('Failed to apply preset:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Create custom preset from questions
  function createCustomPreset(
    questions: EnhancedQuestion[], 
    name: string, 
    examType: string = 'CUSTOM'
  ): CBTPreset {
    if (!engine.value) {
      throw new Error('Engine not initialized')
    }

    const preset = engine.value.createCustomPreset(questions, name, examType)
    presets.value.push(preset)
    return preset
  }

  // Add custom preset
  function addCustomPreset(preset: CBTPreset) {
    if (!engine.value) return

    engine.value.addCustomPreset(preset)
    presets.value.push(preset)
  }

  // Get presets by exam type
  function getPresetsByType(examType: string): CBTPreset[] {
    return presets.value.filter(preset => preset.examType === examType)
  }

  // Clear current selection
  function clearSelection() {
    selectedPreset.value = null
    validationResult.value = null
    error.value = null
  }

  // Auto-validate when preset or questions change
  function setupAutoValidation(questions: Ref<EnhancedQuestion[]>) {
    if (!options.autoValidate) return

    watch([selectedPreset, questions], async ([preset, questionList]) => {
      if (preset && questionList && questionList.length > 0) {
        await validatePreset(questionList)
      }
    }, { deep: true })
  }

  // Auto-refresh presets periodically
  function setupAutoRefresh() {
    if (!options.autoRefresh) return

    const refreshInterval = setInterval(async () => {
      if (!isRefreshing.value && !isLoading.value) {
        await refreshPresets()
      }
    }, config.cacheTimeout || 24 * 60 * 60 * 1000) // 24 hours

    // Cleanup on unmount
    return () => clearInterval(refreshInterval)
  }

  // Return state and actions
  const state: CBTPresetsState = {
    presets,
    selectedPreset,
    validationResult,
    isLoading,
    isRefreshing,
    error
  }

  const actions: CBTPresetsActions = {
    loadPresets,
    refreshPresets,
    selectPreset,
    validatePreset,
    applyPreset,
    createCustomPreset,
    addCustomPreset,
    getPresetsByType,
    clearSelection
  }

  return {
    ...state,
    ...actions,
    availableExamTypes,
    presetsByType,
    hasValidSelection,
    setupAutoValidation,
    setupAutoRefresh
  }
}

/**
 * Composable for managing multiple preset configurations
 */
export function useMultipleCBTPresets(
  options: UseCBTPresetsOptions = {}
) {
  const configurations = ref<Map<string, ReturnType<typeof useCBTPresets>>>(new Map())
  const activeConfigurationId = ref<string | null>(null)

  // Create new configuration
  function createConfiguration(id: string, configOptions?: UseCBTPresetsOptions) {
    const config = useCBTPresets({ ...options, ...configOptions })
    configurations.value.set(id, config)
    return config
  }

  // Get configuration by ID
  function getConfiguration(id: string) {
    return configurations.value.get(id)
  }

  // Set active configuration
  function setActiveConfiguration(id: string) {
    if (configurations.value.has(id)) {
      activeConfigurationId.value = id
    }
  }

  // Get active configuration
  const activeConfiguration = computed(() => {
    if (activeConfigurationId.value) {
      return configurations.value.get(activeConfigurationId.value)
    }
    return null
  })

  // Remove configuration
  function removeConfiguration(id: string) {
    configurations.value.delete(id)
    if (activeConfigurationId.value === id) {
      activeConfigurationId.value = null
    }
  }

  // Get all configuration IDs
  const configurationIds = computed(() => {
    return Array.from(configurations.value.keys())
  })

  return {
    configurations,
    activeConfiguration,
    activeConfigurationId,
    configurationIds,
    createConfiguration,
    getConfiguration,
    setActiveConfiguration,
    removeConfiguration
  }
}

/**
 * Composable for CBT preset comparison
 */
export function useCBTPresetComparison() {
  const comparisonPresets = ref<CBTPreset[]>([])

  // Add preset to comparison
  function addToComparison(preset: CBTPreset) {
    if (!comparisonPresets.value.find(p => p.id === preset.id)) {
      comparisonPresets.value.push(preset)
    }
  }

  // Remove preset from comparison
  function removeFromComparison(presetId: string) {
    const index = comparisonPresets.value.findIndex(p => p.id === presetId)
    if (index > -1) {
      comparisonPresets.value.splice(index, 1)
    }
  }

  // Clear comparison
  function clearComparison() {
    comparisonPresets.value = []
  }

  // Compare presets
  const comparison = computed(() => {
    if (comparisonPresets.value.length < 2) return null

    const fields = [
      'examType',
      'timeLimit',
      'totalQuestions',
      'sections',
      'markingScheme'
    ]

    const comparisonData: Record<string, any[]> = {}
    
    fields.forEach(field => {
      comparisonData[field] = comparisonPresets.value.map(preset => {
        switch (field) {
          case 'totalQuestions':
            return preset.questionDistribution.totalQuestions
          case 'sections':
            return preset.sections.length
          case 'markingScheme':
            return `+${preset.markingScheme.correct}/${preset.markingScheme.incorrect}`
          default:
            return preset[field as keyof CBTPreset]
        }
      })
    })

    return comparisonData
  })

  return {
    comparisonPresets,
    comparison,
    addToComparison,
    removeFromComparison,
    clearComparison
  }
}

export default useCBTPresets