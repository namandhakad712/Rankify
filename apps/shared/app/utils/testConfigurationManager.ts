/**
 * Test Configuration Manager
 * 
 * This module manages the complete test configuration workflow,
 * from manual review to final test generation.
 */

import type { 
  EnhancedQuestion,
  CBTPreset,
  ConfiguredTest,
  PresetValidationResult
} from '~/shared/types/diagram-detection'
import { CBTPresetEngine, createCBTPresetEngine } from './cbtPresetEngine'

export interface TestConfigurationOptions {
  enableWebScraping?: boolean
  autoValidation?: boolean
  defaultPreset?: string
}

export interface WorkflowStep {
  id: string
  name: string
  description: string
  completed: boolean
  canSkip: boolean
}

export interface TestConfigurationState {
  currentStep: number
  steps: WorkflowStep[]
  selectedPreset: CBTPreset | null
  customConfiguration: any
  validationResults: Record<string, PresetValidationResult>
  isComplete: boolean
}

export interface TestGenerationResult {
  success: boolean
  configuredTest?: ConfiguredTest
  errors: string[]
  warnings: string[]
}

/**
 * Test Configuration Manager Class
 * Orchestrates the complete test configuration workflow
 */
export class TestConfigurationManager {
  private presetEngine: CBTPresetEngine
  private state: TestConfigurationState
  private questions: EnhancedQuestion[] = []

  constructor(options: TestConfigurationOptions = {}) {
    this.presetEngine = createCBTPresetEngine({
      enableWebScraping: options.enableWebScraping ?? true,
      fallbackToCache: true
    })

    this.state = {
      currentStep: 0,
      steps: [
        {
          id: 'review',
          name: 'Review Questions',
          description: 'Review processed questions and diagrams',
          completed: false,
          canSkip: false
        },
        {
          id: 'preset',
          name: 'Select Configuration',
          description: 'Choose preset or custom configuration',
          completed: false,
          canSkip: false
        },
        {
          id: 'customize',
          name: 'Customize Settings',
          description: 'Adjust configuration settings',
          completed: false,
          canSkip: true
        },
        {
          id: 'generate',
          name: 'Generate Test',
          description: 'Create final test configuration',
          completed: false,
          canSkip: false
        }
      ],
      selectedPreset: null,
      customConfiguration: null,
      validationResults: {},
      isComplete: false
    }
  }

  /**
   * Initialize the workflow with questions
   */
  async initializeWorkflow(questions: EnhancedQuestion[]): Promise<void> {
    this.questions = questions
    
    // Validate all available presets
    await this.validateAllPresets()
    
    // Mark review step as ready
    this.state.steps[0].completed = true
  }

  /**
   * Get current workflow state
   */
  getState(): TestConfigurationState {
    return { ...this.state }
  }

  /**
   * Get available presets
   */
  getAvailablePresets(): CBTPreset[] {
    return this.presetEngine.getAllPresets()
  }

  /**
   * Get preset validation results
   */
  getPresetValidation(presetId: string): PresetValidationResult | null {
    return this.state.validationResults[presetId] || null
  }

  /**
   * Select a preset configuration
   */
  async selectPreset(presetId: string): Promise<boolean> {
    try {
      const preset = await this.presetEngine.loadPreset(presetId)
      if (!preset) return false

      this.state.selectedPreset = preset
      this.state.customConfiguration = null
      
      // Mark preset step as completed
      this.state.steps[1].completed = true
      
      // Skip customize step if preset is compatible
      const validation = this.state.validationResults[presetId]
      if (validation && validation.isCompatible) {
        this.state.steps[2].completed = true
        this.state.currentStep = 3 // Move to generate step
      } else {
        this.state.currentStep = 2 // Move to customize step
      }

      return true
    } catch (error) {
      console.error('Failed to select preset:', error)
      return false
    }
  }

  /**
   * Create custom configuration
   */
  createCustomConfiguration(config: any): boolean {
    try {
      this.state.selectedPreset = null
      this.state.customConfiguration = config
      
      // Mark preset and customize steps as completed
      this.state.steps[1].completed = true
      this.state.steps[2].completed = true
      this.state.currentStep = 3 // Move to generate step

      return true
    } catch (error) {
      console.error('Failed to create custom configuration:', error)
      return false
    }
  }

  /**
   * Move to next step
   */
  nextStep(): boolean {
    if (this.state.currentStep < this.state.steps.length - 1) {
      this.state.currentStep++
      return true
    }
    return false
  }

  /**
   * Move to previous step
   */
  previousStep(): boolean {
    if (this.state.currentStep > 0) {
      this.state.currentStep--
      return true
    }
    return false
  }

  /**
   * Skip current step (if allowed)
   */
  skipStep(): boolean {
    const currentStep = this.state.steps[this.state.currentStep]
    if (currentStep.canSkip) {
      currentStep.completed = true
      return this.nextStep()
    }
    return false
  }

  /**
   * Generate final test configuration
   */
  async generateTest(testName?: string): Promise<TestGenerationResult> {
    try {
      let configuredTest: ConfiguredTest

      if (this.state.selectedPreset) {
        // Use preset configuration
        configuredTest = await this.presetEngine.applyPresetToQuestions(
          this.questions,
          this.state.selectedPreset.id,
          testName || `${this.state.selectedPreset.name} Test`
        )
      } else if (this.state.customConfiguration) {
        // Use custom configuration
        const customPreset = this.presetEngine.createCustomPreset(
          this.questions,
          testName || 'Custom Test',
          this.state.customConfiguration.examType || 'CUSTOM'
        )
        
        configuredTest = await this.presetEngine.applyPresetToQuestions(
          this.questions,
          customPreset.id,
          testName || 'Custom Test'
        )
      } else {
        throw new Error('No configuration selected')
      }

      // Mark workflow as complete
      this.state.steps[3].completed = true
      this.state.isComplete = true

      return {
        success: true,
        configuredTest,
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
        warnings: []
      }
    }
  }

  /**
   * Get workflow progress
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    const completed = this.state.steps.filter(step => step.completed).length
    const total = this.state.steps.length
    const percentage = Math.round((completed / total) * 100)

    return { completed, total, percentage }
  }

  /**
   * Get current step information
   */
  getCurrentStep(): WorkflowStep {
    return this.state.steps[this.state.currentStep]
  }

  /**
   * Check if workflow can proceed
   */
  canProceed(): boolean {
    const currentStep = this.getCurrentStep()
    return currentStep.completed || currentStep.canSkip
  }

  /**
   * Reset workflow
   */
  reset(): void {
    this.state.currentStep = 0
    this.state.steps.forEach(step => {
      step.completed = false
    })
    this.state.selectedPreset = null
    this.state.customConfiguration = null
    this.state.validationResults = {}
    this.state.isComplete = false
    this.questions = []
  }

  /**
   * Get summary of questions
   */
  getQuestionsSummary() {
    const total = this.questions.length
    const withDiagrams = this.questions.filter(q => q.hasDiagram).length
    const subjects = new Set(this.questions.map(q => q.subject).filter(Boolean))
    const averageConfidence = total > 0 ? 
      this.questions.reduce((sum, q) => sum + q.confidence, 0) / total : 0

    return {
      total,
      withDiagrams,
      subjects: Array.from(subjects),
      subjectCount: subjects.size,
      averageConfidence,
      types: this.getQuestionTypes()
    }
  }

  /**
   * Get question type distribution
   */
  private getQuestionTypes(): Record<string, number> {
    const types: Record<string, number> = {}
    this.questions.forEach(q => {
      types[q.type] = (types[q.type] || 0) + 1
    })
    return types
  }

  /**
   * Validate all available presets
   */
  private async validateAllPresets(): Promise<void> {
    const presets = this.presetEngine.getAllPresets()
    
    for (const preset of presets) {
      try {
        const validation = this.presetEngine.validatePresetCompatibility(
          this.questions,
          preset
        )
        this.state.validationResults[preset.id] = validation
      } catch (error) {
        console.warn(`Failed to validate preset ${preset.id}:`, error)
      }
    }
  }
}

/**
 * Factory function to create test configuration manager
 */
export function createTestConfigurationManager(
  options?: TestConfigurationOptions
): TestConfigurationManager {
  return new TestConfigurationManager(options)
}

/**
 * Utility function to validate test configuration
 */
export function validateTestConfiguration(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.testName || config.testName.trim() === '') {
    errors.push('Test name is required')
  }

  if (!config.timeLimit || config.timeLimit <= 0) {
    errors.push('Valid time limit is required')
  }

  if (!config.sections || config.sections.length === 0) {
    errors.push('At least one section is required')
  }

  if (config.sections) {
    config.sections.forEach((section: any, index: number) => {
      if (!section.name || section.name.trim() === '') {
        errors.push(`Section ${index + 1} name is required`)
      }
      
      if (!section.questionCount || section.questionCount <= 0) {
        errors.push(`Section ${index + 1} must have at least one question`)
      }
      
      if (!section.timeAllocation || section.timeAllocation <= 0) {
        errors.push(`Section ${index + 1} must have valid time allocation`)
      }
    })
  }

  if (!config.markingScheme) {
    errors.push('Marking scheme is required')
  } else {
    if (typeof config.markingScheme.correct !== 'number') {
      errors.push('Correct answer marks must be a number')
    }
    if (typeof config.markingScheme.incorrect !== 'number') {
      errors.push('Incorrect answer marks must be a number')
    }
    if (typeof config.markingScheme.unattempted !== 'number') {
      errors.push('Unattempted marks must be a number')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export default TestConfigurationManager