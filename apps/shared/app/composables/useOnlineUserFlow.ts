/**
 * Online User Flow Management Composable
 * Manages the complete user journey through Rankify's AI-powered and traditional workflows
 * Based on the comprehensive design document requirements
 */

import { ref, computed, reactive, watch } from 'vue'
import { getFeatureFlags } from './useFeatureFlags'
import { useAIExtraction } from './useAIExtraction'

// Mock router for testing environments
const mockRouter = {
  push: async (path: string) => {
    console.log(`Navigation to: ${path}`)
    return Promise.resolve()
  }
}

const useRouter = () => {
  if (typeof window !== 'undefined' && (window as any).useRouter) {
    return (window as any).useRouter()
  }
  return mockRouter
}

export interface UserFlowState {
  currentPhase: UserFlowPhase
  selectedWorkflow: 'ai-powered' | 'traditional' | null
  progress: UserFlowProgress
  sessionData: UserSessionData
  errorState: UserFlowError | null
  capabilities: SystemCapabilities
}

export interface UserFlowProgress {
  phase1: boolean // System Access and Feature Detection
  phase2: boolean // AI-Powered Extraction OR Traditional Workflow
  phase3: boolean // Review and Refinement
  phase4: boolean // Test Configuration
  phase5: boolean // Interactive Test Taking
  phase6: boolean // Results Analysis
}

export interface UserSessionData {
  startTime: number
  lastActivity: number
  workflowChoice: string | null
  featuresUsed: string[]
  filesProcessed: number
  testsCompleted: number
  errorRecoveryAttempts: number
}

export interface SystemCapabilities {
  aiExtractionAvailable: boolean
  geminiApiConnected: boolean
  indexedDbSupported: boolean
  pdfProcessingSupported: boolean
  offlineModeSupported: boolean
  browserCompatible: boolean
}

export interface UserFlowError {
  phase: UserFlowPhase
  type: string
  message: string
  recoverable: boolean
  retryCount: number
  timestamp: number
}

export type UserFlowPhase = 
  | 'initialization'
  | 'feature-detection' 
  | 'workflow-selection'
  | 'ai-extraction'
  | 'traditional-extraction'
  | 'review-interface'
  | 'test-configuration'
  | 'test-execution'
  | 'results-analysis'
  | 'completed'
  | 'error-recovery'

export function useOnlineUserFlow() {
  const router = useRouter()
  const featureFlags = getFeatureFlags()
  const aiExtraction = useAIExtraction()

  // Reactive state management
  const state = reactive<UserFlowState>({
    currentPhase: 'initialization',
    selectedWorkflow: null,
    progress: {
      phase1: false,
      phase2: false,
      phase3: false,
      phase4: false,
      phase5: false,
      phase6: false
    },
    sessionData: {
      startTime: Date.now(),
      lastActivity: Date.now(),
      workflowChoice: null,
      featuresUsed: [],
      filesProcessed: 0,
      testsCompleted: 0,
      errorRecoveryAttempts: 0
    },
    errorState: null,
    capabilities: {
      aiExtractionAvailable: false,
      geminiApiConnected: false,
      indexedDbSupported: false,
      pdfProcessingSupported: false,
      offlineModeSupported: false,
      browserCompatible: false
    }
  })

  // Computed properties
  const isAIWorkflowAvailable = computed(() => 
    state.capabilities.aiExtractionAvailable && 
    state.capabilities.geminiApiConnected &&
    featureFlags.aiExtractionEnabled.value
  )

  const currentPhaseDescription = computed(() => {
    const descriptions = {
      'initialization': 'Setting up Rankify platform...',
      'feature-detection': 'Checking available features and capabilities...',
      'workflow-selection': 'Choose your extraction method',
      'ai-extraction': 'AI is processing your PDF...',
      'traditional-extraction': 'Manual PDF cropping in progress...',
      'review-interface': 'Review and refine extracted questions',
      'test-configuration': 'Configure your test settings',
      'test-execution': 'Taking the interactive test',
      'results-analysis': 'Analyzing your performance',
      'completed': 'Workflow completed successfully',
      'error-recovery': 'Recovering from error...'
    }
    return descriptions[state.currentPhase]
  })

  const overallProgress = computed(() => {
    const completedPhases = Object.values(state.progress).filter(Boolean).length
    return Math.round((completedPhases / 6) * 100)
  })

  const userJourney = computed(() => {
    return {
      totalTime: Date.now() - state.sessionData.startTime,
      phaseTransitions: getPhaseTransitionHistory(),
      featuresUsed: state.sessionData.featuresUsed,
      efficiency: calculateWorkflowEfficiency()
    }
  })

  // Phase 1: System Access and Feature Detection
  const initializeSystem = async (): Promise<boolean> => {
    try {
      state.currentPhase = 'initialization'
      
      // Detect system capabilities
      await detectSystemCapabilities()
      
      // Initialize feature flags
      featureFlags.initialize()
      
      // Check API connectivity if AI features are enabled
      if (featureFlags.aiExtractionEnabled.value) {
        await validateAIServices()
      }
      
      state.currentPhase = 'feature-detection'
      state.progress.phase1 = true
      
      // Track feature usage
      trackFeatureUsage('system_initialization')
      
      return true
    } catch (error) {
      handleError('initialization', error as Error)
      return false
    }
  }

  // Phase 2: Workflow Selection and Processing
  const selectWorkflow = async (workflow: 'ai-powered' | 'traditional'): Promise<boolean> => {
    try {
      state.selectedWorkflow = workflow
      state.sessionData.workflowChoice = workflow
      state.currentPhase = 'workflow-selection'
      
      trackFeatureUsage(`workflow_selection_${workflow}`)
      
      // Route to appropriate interface
      if (workflow === 'ai-powered') {
        await router.push('/ai-extractor')
        state.currentPhase = 'ai-extraction'
      } else {
        await router.push('/pdf-cropper')
        state.currentPhase = 'traditional-extraction'
      }
      
      state.progress.phase2 = true
      return true
    } catch (error) {
      handleError('workflow-selection', error as Error)
      return false
    }
  }

  // Phase 3: Review and Refinement Interface
  const proceedToReview = async (extractionResult: any): Promise<boolean> => {
    try {
      state.currentPhase = 'review-interface'
      
      // Store extraction results for review
      await storeExtractionResults(extractionResult)
      
      // Navigate to review interface
      await router.push('/review-interface')
      
      state.progress.phase3 = true
      trackFeatureUsage('review_interface_access')
      
      return true
    } catch (error) {
      handleError('review-interface', error as Error)
      return false
    }
  }

  // Phase 4: Test Configuration and Preparation
  const configureTest = async (testConfig: any): Promise<boolean> => {
    try {
      state.currentPhase = 'test-configuration'
      
      // Validate test configuration
      const isValid = await validateTestConfiguration(testConfig)
      if (!isValid) {
        throw new Error('Invalid test configuration')
      }
      
      // Process question images and URLs
      await prepareTestInterface(testConfig)
      
      state.progress.phase4 = true
      trackFeatureUsage('test_configuration')
      
      return true
    } catch (error) {
      handleError('test-configuration', error as Error)
      return false
    }
  }

  // Phase 5: Interactive Test Taking Experience
  const startTestExecution = async (): Promise<boolean> => {
    try {
      state.currentPhase = 'test-execution'
      
      // Initialize test environment
      await initializeTestEnvironment()
      
      // Navigate to CBT interface
      await router.push('/cbt/interface')
      
      state.progress.phase5 = true
      trackFeatureUsage('test_execution_start')
      
      return true
    } catch (error) {
      handleError('test-execution', error as Error)
      return false
    }
  }

  // Phase 6: Results Analysis and Performance Insights
  const proceedToResults = async (testResults: any): Promise<boolean> => {
    try {
      state.currentPhase = 'results-analysis'
      
      // Store test results
      await storeTestResults(testResults)
      
      // Generate analytics
      await generatePerformanceAnalytics(testResults)
      
      // Navigate to results
      await router.push('/cbt/results')
      
      state.progress.phase6 = true
      state.sessionData.testsCompleted++
      trackFeatureUsage('results_analysis')
      
      return true
    } catch (error) {
      handleError('results-analysis', error as Error)
      return false
    }
  }

  // Error Handling and Recovery
  const handleError = (phase: UserFlowPhase, error: Error): void => {
    state.errorState = {
      phase,
      type: error.name || 'UnknownError',
      message: error.message,
      recoverable: isErrorRecoverable(error),
      retryCount: 0,
      timestamp: Date.now()
    }
    
    state.currentPhase = 'error-recovery'
    state.sessionData.errorRecoveryAttempts++
    
    console.error(`User flow error in ${phase}:`, error)
  }

  const retryCurrentOperation = async (): Promise<boolean> => {
    if (!state.errorState) return false
    
    state.errorState.retryCount++
    
    try {
      // Reset to previous phase and retry
      const previousPhase = state.errorState.phase
      state.errorState = null
      
      // Implement retry logic based on phase
      switch (previousPhase) {
        case 'initialization':
          return await initializeSystem()
        case 'ai-extraction':
          return await aiExtraction.retryExtraction()
        default:
          return false
      }
    } catch (error) {
      handleError(state.errorState.phase, error as Error)
      return false
    }
  }

  // Utility functions
  const detectSystemCapabilities = async (): Promise<void> => {
    // Check browser compatibility
    state.capabilities.browserCompatible = checkBrowserCompatibility()
    
    // Check IndexedDB support
    state.capabilities.indexedDbSupported = 'indexedDB' in window
    
    // Check PDF processing support
    state.capabilities.pdfProcessingSupported = await checkPDFProcessingSupport()
    
    // Check AI extraction availability
    state.capabilities.aiExtractionAvailable = featureFlags.aiExtractionEnabled.value
    
    // Check offline mode support
    state.capabilities.offlineModeSupported = 'serviceWorker' in navigator
  }

  const validateAIServices = async (): Promise<void> => {
    try {
      // This would validate API connectivity
      state.capabilities.geminiApiConnected = aiExtraction.isConfigValid.value
    } catch {
      state.capabilities.geminiApiConnected = false
    }
  }

  const trackFeatureUsage = (feature: string): void => {
    if (!state.sessionData.featuresUsed.includes(feature)) {
      state.sessionData.featuresUsed.push(feature)
    }
    state.sessionData.lastActivity = Date.now()
  }

  const storeExtractionResults = async (result: any): Promise<void> => {
    // Store in IndexedDB for persistence
    try {
      const db = await import('#layers/shared/db')
      // Store extraction results
      state.sessionData.filesProcessed++
    } catch (error) {
      console.warn('Failed to store extraction results:', error)
    }
  }

  const validateTestConfiguration = async (config: any): Promise<boolean> => {
    // Validate test configuration parameters
    return !!(config && config.testName && config.duration)
  }

  const prepareTestInterface = async (config: any): Promise<void> => {
    // Prepare test interface with configuration
    trackFeatureUsage('test_preparation')
  }

  const initializeTestEnvironment = async (): Promise<void> => {
    // Initialize test environment
    trackFeatureUsage('test_environment_init')
  }

  const storeTestResults = async (results: any): Promise<void> => {
    // Store test results in database
    try {
      const db = await import('#layers/shared/db')
      // Store results
    } catch (error) {
      console.warn('Failed to store test results:', error)
    }
  }

  const generatePerformanceAnalytics = async (results: any): Promise<void> => {
    // Generate comprehensive analytics
    trackFeatureUsage('analytics_generation')
  }

  const checkBrowserCompatibility = (): boolean => {
    // Check for modern browser features
    return !!(
      window.fetch &&
      window.Promise &&
      window.URLSearchParams &&
      window.FormData
    )
  }

  const checkPDFProcessingSupport = async (): Promise<boolean> => {
    // Check if PDF processing libraries are available
    try {
      // This would check for PDF.js or similar
      return true
    } catch {
      return false
    }
  }

  const isErrorRecoverable = (error: Error): boolean => {
    // Determine if error is recoverable
    const recoverableErrors = ['NetworkError', 'TimeoutError', 'RetryableError']
    return recoverableErrors.some(type => error.name.includes(type))
  }

  const getPhaseTransitionHistory = (): Array<{phase: UserFlowPhase, timestamp: number}> => {
    // This would track phase transitions
    return []
  }

  const calculateWorkflowEfficiency = (): number => {
    // Calculate workflow efficiency based on time and errors
    const totalTime = Date.now() - state.sessionData.startTime
    const errorPenalty = state.sessionData.errorRecoveryAttempts * 0.1
    return Math.max(0, 1 - errorPenalty) * 100
  }

  // Reset workflow
  const resetWorkflow = (): void => {
    state.currentPhase = 'initialization'
    state.selectedWorkflow = null
    state.progress = {
      phase1: false,
      phase2: false,
      phase3: false,
      phase4: false,
      phase5: false,
      phase6: false
    }
    state.errorState = null
    state.sessionData.startTime = Date.now()
    state.sessionData.workflowChoice = null
  }

  // Complete workflow
  const completeWorkflow = (): void => {
    state.currentPhase = 'completed'
    trackFeatureUsage('workflow_completion')
    
    // Analytics tracking
    const completionTime = Date.now() - state.sessionData.startTime
    console.log(`Workflow completed in ${completionTime}ms`)
  }

  // Watch for activity to update last activity time
  watch(
    () => state.currentPhase,
    () => {
      state.sessionData.lastActivity = Date.now()
    }
  )

  return {
    // State
    state: readonly(state),
    
    // Computed
    isAIWorkflowAvailable,
    currentPhaseDescription,
    overallProgress,
    userJourney,
    
    // Phase management
    initializeSystem,
    selectWorkflow,
    proceedToReview,
    configureTest,
    startTestExecution,
    proceedToResults,
    
    // Error handling
    handleError,
    retryCurrentOperation,
    
    // Utilities
    resetWorkflow,
    completeWorkflow,
    trackFeatureUsage
  }
}