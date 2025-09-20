/**
 * Feature Flags Composable
 * Manages feature flags for gradual rollout of AI capabilities
 */

import { ref, computed } from 'vue'

export interface FeatureFlag {
  key: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  dependencies?: string[]
  environment?: string[]
}

export interface FeatureFlagConfig {
  flags: FeatureFlag[]
  userId?: string
  environment: string
  version: string
}

const defaultFlags: FeatureFlag[] = [
  {
    key: 'ai_extraction',
    name: 'AI-Powered PDF Extraction',
    description: 'Enable AI-powered question extraction from PDFs using Google Gemini',
    enabled: true,
    rolloutPercentage: 100,
    dependencies: ['gemini_api'],
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'review_interface',
    name: 'AI Review Interface',
    description: 'Enable the review interface for editing AI-extracted questions',
    enabled: true,
    rolloutPercentage: 100,
    dependencies: ['ai_extraction'],
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'confidence_scoring',
    name: 'Confidence Scoring',
    description: 'Show confidence scores for AI-extracted questions',
    enabled: true,
    rolloutPercentage: 100,
    dependencies: ['ai_extraction'],
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'diagram_detection',
    name: 'Diagram Detection',
    description: 'Automatically detect questions with diagrams',
    enabled: true,
    rolloutPercentage: 90,
    dependencies: ['ai_extraction'],
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'batch_processing',
    name: 'Batch PDF Processing',
    description: 'Process multiple PDFs simultaneously',
    enabled: false,
    rolloutPercentage: 25,
    dependencies: ['ai_extraction'],
    environment: ['development', 'staging']
  },
  {
    key: 'advanced_ai_models',
    name: 'Advanced AI Models',
    description: 'Use advanced Gemini models for better accuracy',
    enabled: false,
    rolloutPercentage: 10,
    dependencies: ['ai_extraction'],
    environment: ['development']
  },
  {
    key: 'offline_processing',
    name: 'Offline Processing',
    description: 'Process PDFs without internet connection',
    enabled: false,
    rolloutPercentage: 0,
    dependencies: ['ai_extraction'],
    environment: ['development']
  },
  {
    key: 'migration_tool',
    name: 'Legacy Migration Tool',
    description: 'Convert legacy ZIP files to AI JSON format',
    enabled: true,
    rolloutPercentage: 80,
    dependencies: ['ai_extraction'],
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'performance_monitoring',
    name: 'Performance Monitoring',
    description: 'Monitor AI processing performance and memory usage',
    enabled: true,
    rolloutPercentage: 100,
    dependencies: [],
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'error_recovery',
    name: 'Advanced Error Recovery',
    description: 'Automatic error recovery and fallback strategies',
    enabled: true,
    rolloutPercentage: 100,
    dependencies: ['ai_extraction'],
    environment: ['development', 'staging', 'production']
  }
]

// Global state
const featureFlags = ref<FeatureFlag[]>([...defaultFlags])
const config = ref<FeatureFlagConfig>({
  flags: featureFlags.value,
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0'
})

export function useFeatureFlags() {
  /**
   * Initialize feature flags
   */
  const initialize = (userConfig?: Partial<FeatureFlagConfig>) => {
    if (userConfig) {
      config.value = {
        ...config.value,
        ...userConfig
      }
    }
    
    // Load flags from localStorage if available
    loadFromStorage()
    
    // Apply environment-specific overrides
    applyEnvironmentOverrides()
    
    // Apply user-specific rollout
    applyUserRollout()
    
    console.log('Feature flags initialized:', getEnabledFlags())
  }

  /**
   * Check if a feature is enabled
   */
  const isEnabled = (flagKey: string): boolean => {
    const flag = featureFlags.value.find(f => f.key === flagKey)
    if (!flag) {
      console.warn(`Feature flag '${flagKey}' not found`)
      return false
    }
    
    // Check environment
    if (flag.environment && !flag.environment.includes(config.value.environment)) {
      return false
    }
    
    // Check dependencies
    if (flag.dependencies) {
      const dependenciesMet = flag.dependencies.every(dep => isEnabled(dep))
      if (!dependenciesMet) {
        return false
      }
    }
    
    return flag.enabled
  }

  /**
   * Enable a feature flag
   */
  const enable = (flagKey: string) => {
    const flag = featureFlags.value.find(f => f.key === flagKey)
    if (flag) {
      flag.enabled = true
      saveToStorage()
      console.log(`Feature flag '${flagKey}' enabled`)
    }
  }

  /**
   * Disable a feature flag
   */
  const disable = (flagKey: string) => {
    const flag = featureFlags.value.find(f => f.key === flagKey)
    if (flag) {
      flag.enabled = false
      saveToStorage()
      console.log(`Feature flag '${flagKey}' disabled`)
    }
  }

  /**
   * Toggle a feature flag
   */
  const toggle = (flagKey: string) => {
    const flag = featureFlags.value.find(f => f.key === flagKey)
    if (flag) {
      flag.enabled = !flag.enabled
      saveToStorage()
      console.log(`Feature flag '${flagKey}' ${flag.enabled ? 'enabled' : 'disabled'}`)
    }
  }

  /**
   * Get all enabled flags
   */
  const getEnabledFlags = (): string[] => {
    return featureFlags.value
      .filter(flag => isEnabled(flag.key))
      .map(flag => flag.key)
  }

  /**
   * Get all flags with their status
   */
  const getAllFlags = (): FeatureFlag[] => {
    return featureFlags.value.map(flag => ({
      ...flag,
      enabled: isEnabled(flag.key)
    }))
  }

  /**
   * Get flag details
   */
  const getFlag = (flagKey: string): FeatureFlag | undefined => {
    return featureFlags.value.find(f => f.key === flagKey)
  }

  /**
   * Apply environment-specific overrides
   */
  const applyEnvironmentOverrides = () => {
    const environment = config.value.environment
    
    // Disable certain features in production
    if (environment === 'production') {
      const productionDisabled = ['advanced_ai_models', 'offline_processing']
      productionDisabled.forEach(flagKey => {
        const flag = featureFlags.value.find(f => f.key === flagKey)
        if (flag) {
          flag.enabled = false
        }
      })
    }
    
    // Enable all features in development
    if (environment === 'development') {
      // Development can override any flag
    }
  }

  /**
   * Apply user-specific rollout based on percentage
   */
  const applyUserRollout = () => {
    const userId = config.value.userId || 'anonymous'
    
    featureFlags.value.forEach(flag => {
      if (flag.rolloutPercentage < 100) {
        // Simple hash-based rollout
        const hash = hashString(userId + flag.key)
        const userPercentage = hash % 100
        
        if (userPercentage >= flag.rolloutPercentage) {
          flag.enabled = false
        }
      }
    })
  }

  /**
   * Simple string hash function
   */
  const hashString = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Save flags to localStorage
   */
  const saveToStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        const flagStates = featureFlags.value.reduce((acc, flag) => {
          acc[flag.key] = flag.enabled
          return acc
        }, {} as Record<string, boolean>)
        
        localStorage.setItem('rankify_feature_flags', JSON.stringify(flagStates))
      } catch (error) {
        console.warn('Failed to save feature flags to localStorage:', error)
      }
    }
  }

  /**
   * Load flags from localStorage
   */
  const loadFromStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rankify_feature_flags')
        if (stored) {
          const flagStates = JSON.parse(stored) as Record<string, boolean>
          
          featureFlags.value.forEach(flag => {
            if (flagStates.hasOwnProperty(flag.key)) {
              flag.enabled = flagStates[flag.key]
            }
          })
        }
      } catch (error) {
        console.warn('Failed to load feature flags from localStorage:', error)
      }
    }
  }

  /**
   * Reset all flags to defaults
   */
  const resetToDefaults = () => {
    featureFlags.value = [...defaultFlags]
    saveToStorage()
    console.log('Feature flags reset to defaults')
  }

  /**
   * Export flags configuration
   */
  const exportConfig = (): FeatureFlagConfig => {
    return {
      ...config.value,
      flags: [...featureFlags.value]
    }
  }

  /**
   * Import flags configuration
   */
  const importConfig = (importedConfig: FeatureFlagConfig) => {
    config.value = importedConfig
    featureFlags.value = [...importedConfig.flags]
    saveToStorage()
    console.log('Feature flags imported')
  }

  // Computed properties
  const aiExtractionEnabled = computed(() => isEnabled('ai_extraction'))
  const reviewInterfaceEnabled = computed(() => isEnabled('review_interface'))
  const confidenceScoringEnabled = computed(() => isEnabled('confidence_scoring'))
  const diagramDetectionEnabled = computed(() => isEnabled('diagram_detection'))
  const batchProcessingEnabled = computed(() => isEnabled('batch_processing'))
  const migrationToolEnabled = computed(() => isEnabled('migration_tool'))
  const performanceMonitoringEnabled = computed(() => isEnabled('performance_monitoring'))
  const errorRecoveryEnabled = computed(() => isEnabled('error_recovery'))

  return {
    // State
    featureFlags: readonly(featureFlags),
    config: readonly(config),
    
    // Methods
    initialize,
    isEnabled,
    enable,
    disable,
    toggle,
    getEnabledFlags,
    getAllFlags,
    getFlag,
    resetToDefaults,
    exportConfig,
    importConfig,
    
    // Computed flags
    aiExtractionEnabled,
    reviewInterfaceEnabled,
    confidenceScoringEnabled,
    diagramDetectionEnabled,
    batchProcessingEnabled,
    migrationToolEnabled,
    performanceMonitoringEnabled,
    errorRecoveryEnabled
  }
}

// Global composable instance
let globalFeatureFlags: ReturnType<typeof useFeatureFlags> | null = null

/**
 * Get global feature flags instance
 */
export function getFeatureFlags() {
  if (!globalFeatureFlags) {
    globalFeatureFlags = useFeatureFlags()
    globalFeatureFlags.initialize()
  }
  return globalFeatureFlags
}

/**
 * Initialize feature flags globally
 */
export function initializeFeatureFlags(config?: Partial<FeatureFlagConfig>) {
  const flags = getFeatureFlags()
  flags.initialize(config)
  return flags
}