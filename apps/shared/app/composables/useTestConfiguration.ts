/**
 * Test Configuration Composable
 * 
 * Provides reactive test configuration workflow functionality for Vue components.
 */

import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import type { 
  EnhancedQuestion,
  CBTPreset,
  ConfiguredTest,
  PresetValidationResult
} from '~/shared/types/diagram-detection'
import { 
  TestConfigurationManager,
  createTestConfigurationManager,
  validateTestConfiguration,
  type TestConfigurationOptions,
  type WorkflowStep,
  type TestGenerationResult
} from '~/app/utils/testConfigurationManager'

export interface UseTestConfigurationOptions extends TestConfigurationOptions {
  autoProgress?: boolean
  enableValidation?: boolean
}

export interface TestConfigurationState {
  manager: Ref<TestConfigurationManager | null>
  currentStep: Ref<number>
  steps: Ref<WorkflowStep[]>
  selectedPreset: Ref<CBTPreset | null>
  availablePresets: Ref<CBTPreset[]>
  validationResults: Ref<Record<string, PresetValidationResult>>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  isComplete: Ref<boolean>
}

export interface TestConfigurationActions {
  initializeWorkflow: (questions: EnhancedQuestion[]) => Promise<void>
  selectPreset: (presetId: string) => Promise<boolean>
  createCustomConfiguration: (config: any) => boolean
  nextStep: () => boolean
  previousStep: () => boolean
  skipStep: () => boolean
  generateTest: (testName?: string) => Promise<TestGenerationResult>
  reset: () => void
  getQuestionsSummary: () => any
  canProceed: () => boolean
}

export function useTestConfiguration(
  options: UseTestConfigurationOptions = {}
) {
  // Configuration
  const config = {
    enableWebScraping: true,
    autoValidation: true,
    autoProgress: false,
    enableValidation: true,
    ...options
  }

  // Reactive state
  const manager = ref<TestConfigurationManager | null>(null)
  const currentStep = ref(0)
  const steps = ref<WorkflowStep[]>([])
  const selectedPreset = ref<CBTPreset | null>(null)
  const availablePresets = ref<CBTPreset[]>([])
  const validationResults = ref<Record<string, PresetValidationResult>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isComplete = ref(false)

  // Computed properties
  const currentStepInfo = computed(() => {
    if (!manager.value) return null
    return manager.value.getCurrentStep()
  })

  const progress = computed(() => {
    if (!manager.value) return { completed: 0, total: 0, percentage: 0 }
    return manager.value.getProgress()
  })

  const canProceedToNext = computed(() => {
    if (!manager.value) return false
    return manager.value.canProceed()
  })

  const questionsSummary = computed(() => {
    if (!manager.value) return null
    return manager.value.getQuestionsSummary()
  })

  // Initialize manager
  async function initializeManager() {
    if (!manager.value) {
      manager.value = createTestConfigurationManager(config)
    }
  }

  // Initialize workflow with questions
  async function initializeWorkflow(questions: EnhancedQuestion[]) {
    await initializeManager()
    if (!manager.value) return

    isLoading.value = true
    error.value = null

    try {
      await manager.value.initializeWorkflow(questions)
      updateState()
    } catch (err) {
      error.value = `Failed to initialize workflow: ${err.message}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Select preset configuration
  async function selectPreset(presetId: string): Promise<boolean> {
    if (!manager.value) return false

    isLoading.value = true
    error.value = null

    try {
      const success = await manager.value.selectPreset(presetId)
      if (success) {
        updateState()
        
        // Auto-progress if enabled
        if (config.autoProgress && canProceedToNext.value) {
          nextStep()
        }
      }
      return success
    } catch (err) {
      error.value = `Failed to select preset: ${err.message}`
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Create custom configuration
  function createCustomConfiguration(customConfig: any): boolean {
    if (!manager.value) return false

    error.value = null

    try {
      // Validate configuration if enabled
      if (config.enableValidation) {
        const validation = validateTestConfiguration(customConfig)
        if (!validation.valid) {
          error.value = `Invalid configuration: ${validation.errors.join(', ')}`
          return false
        }
      }

      const success = manager.value.createCustomConfiguration(customConfig)
      if (success) {
        updateState()
        
        // Auto-progress if enabled
        if (config.autoProgress && canProceedToNext.value) {
          nextStep()
        }
      }
      return success
    } catch (err) {
      error.value = `Failed to create custom configuration: ${err.message}`
      return false
    }
  }

  // Move to next step
  function nextStep(): boolean {
    if (!manager.value) return false

    const success = manager.value.nextStep()
    if (success) {
      updateState()
    }
    return success
  }

  // Move to previous step
  function previousStep(): boolean {
    if (!manager.value) return false

    const success = manager.value.previousStep()
    if (success) {
      updateState()
    }
    return success
  }

  // Skip current step
  function skipStep(): boolean {
    if (!manager.value) return false

    const success = manager.value.skipStep()
    if (success) {
      updateState()
    }
    return success
  }

  // Generate final test
  async function generateTest(testName?: string): Promise<TestGenerationResult> {
    if (!manager.value) {
      return {
        success: false,
        errors: ['Manager not initialized'],
        warnings: []
      }
    }

    isLoading.value = true
    error.value = null

    try {
      const result = await manager.value.generateTest(testName)
      
      if (result.success) {
        updateState()
      } else {
        error.value = result.errors.join(', ')
      }

      return result
    } catch (err) {
      const errorResult = {
        success: false,
        errors: [err.message],
        warnings: []
      }
      error.value = err.message
      return errorResult
    } finally {
      isLoading.value = false
    }
  }

  // Reset workflow
  function reset() {
    if (manager.value) {
      manager.value.reset()
      updateState()
    }
    error.value = null
  }

  // Get questions summary
  function getQuestionsSummary() {
    if (!manager.value) return null
    return manager.value.getQuestionsSummary()
  }

  // Check if can proceed
  function canProceed(): boolean {
    if (!manager.value) return false
    return manager.value.canProceed()
  }

  // Update reactive state from manager
  function updateState() {
    if (!manager.value) return

    const state = manager.value.getState()
    currentStep.value = state.currentStep
    steps.value = [...state.steps]
    selectedPreset.value = state.selectedPreset
    validationResults.value = { ...state.validationResults }
    isComplete.value = state.isComplete
    availablePresets.value = manager.value.getAvailablePresets()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    // Cleanup if needed
  })

  // Return state and actions
  const state: TestConfigurationState = {
    manager,
    currentStep,
    steps,
    selectedPreset,
    availablePresets,
    validationResults,
    isLoading,
    error,
    isComplete
  }

  const actions: TestConfigurationActions = {
    initializeWorkflow,
    selectPreset,
    createCustomConfiguration,
    nextStep,
    previousStep,
    skipStep,
    generateTest,
    reset,
    getQuestionsSummary,
    canProceed
  }

  return {
    ...state,
    ...actions,
    currentStepInfo,
    progress,
    canProceedToNext,
    questionsSummary
  }
}

/**
 * Composable for managing test configuration UI state
 */
export function useTestConfigurationUI() {
  const showPresetDetails = ref(false)
  const showCustomForm = ref(false)
  const showValidationDetails = ref(false)
  const activePresetId = ref<string | null>(null)
  const customFormData = ref<any>({
    testName: '',
    examType: 'CUSTOM',
    timeLimit: 180,
    markingScheme: {
      correct: 4,
      incorrect: -1,
      unattempted: 0
    },
    sections: []
  })

  // Toggle preset details
  function togglePresetDetails(presetId?: string) {
    if (presetId) {
      activePresetId.value = presetId
      showPresetDetails.value = true
    } else {
      showPresetDetails.value = !showPresetDetails.value
    }
  }

  // Toggle custom form
  function toggleCustomForm() {
    showCustomForm.value = !showCustomForm.value
    if (showCustomForm.value) {
      showPresetDetails.value = false
    }
  }

  // Toggle validation details
  function toggleValidationDetails() {
    showValidationDetails.value = !showValidationDetails.value
  }

  // Reset form data
  function resetCustomForm() {
    customFormData.value = {
      testName: '',
      examType: 'CUSTOM',
      timeLimit: 180,
      markingScheme: {
        correct: 4,
        incorrect: -1,
        unattempted: 0
      },
      sections: []
    }
  }

  // Add section to custom form
  function addSection() {
    customFormData.value.sections.push({
      name: `Section ${customFormData.value.sections.length + 1}`,
      subjects: [],
      questionCount: 1,
      timeAllocation: 30
    })
  }

  // Remove section from custom form
  function removeSection(index: number) {
    if (customFormData.value.sections.length > 1) {
      customFormData.value.sections.splice(index, 1)
    }
  }

  return {
    showPresetDetails,
    showCustomForm,
    showValidationDetails,
    activePresetId,
    customFormData,
    togglePresetDetails,
    toggleCustomForm,
    toggleValidationDetails,
    resetCustomForm,
    addSection,
    removeSection
  }
}

/**
 * Composable for test configuration validation
 */
export function useTestConfigurationValidation() {
  const validationErrors = ref<string[]>([])
  const validationWarnings = ref<string[]>([])
  const isValid = ref(true)

  // Validate configuration
  function validateConfiguration(config: any): boolean {
    const result = validateTestConfiguration(config)
    
    validationErrors.value = result.errors
    isValid.value = result.valid

    return result.valid
  }

  // Clear validation
  function clearValidation() {
    validationErrors.value = []
    validationWarnings.value = []
    isValid.value = true
  }

  // Add custom validation error
  function addValidationError(error: string) {
    if (!validationErrors.value.includes(error)) {
      validationErrors.value.push(error)
      isValid.value = false
    }
  }

  // Add custom validation warning
  function addValidationWarning(warning: string) {
    if (!validationWarnings.value.includes(warning)) {
      validationWarnings.value.push(warning)
    }
  }

  return {
    validationErrors,
    validationWarnings,
    isValid,
    validateConfiguration,
    clearValidation,
    addValidationError,
    addValidationWarning
  }
}

export default useTestConfiguration