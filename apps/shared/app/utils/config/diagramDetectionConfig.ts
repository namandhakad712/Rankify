/**
 * Diagram Detection Configuration Management
 * Handles API keys, settings, and environment configuration
 */

export interface DiagramDetectionConfig {
  // API Configuration
  geminiApiKey?: string
  geminiModel: 'gemini-1.5-pro' | 'gemini-1.5-flash'
  apiTimeout: number
  maxRetries: number
  
  // Processing Configuration
  confidenceThreshold: number
  batchSize: number
  enableAutoDetection: boolean
  enableFallbackDetection: boolean
  
  // Storage Configuration
  enableIndexedDB: boolean
  cacheExpiration: number
  maxCacheSize: number
  
  // UI Configuration
  enableAccessibility: boolean
  enableResponsiveDesign: boolean
  defaultFontSize: 'small' | 'medium' | 'large' | 'extra-large'
  defaultColorScheme: 'light' | 'dark' | 'high-contrast'
  
  // Performance Configuration
  enableLazyLoading: boolean
  enableImageCompression: boolean
  maxImageSize: number
  compressionQuality: number
  
  // Debug Configuration
  enableDebugMode: boolean
  enablePerformanceMonitoring: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

const DEFAULT_CONFIG: DiagramDetectionConfig = {
  // API Configuration
  geminiModel: 'gemini-1.5-flash',
  apiTimeout: 30000, // 30 seconds
  maxRetries: 3,
  
  // Processing Configuration
  confidenceThreshold: 0.7,
  batchSize: 5,
  enableAutoDetection: true,
  enableFallbackDetection: true,
  
  // Storage Configuration
  enableIndexedDB: true,
  cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  
  // UI Configuration
  enableAccessibility: true,
  enableResponsiveDesign: true,
  defaultFontSize: 'medium',
  defaultColorScheme: 'light',
  
  // Performance Configuration
  enableLazyLoading: true,
  enableImageCompression: true,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  compressionQuality: 0.8,
  
  // Debug Configuration
  enableDebugMode: false,
  enablePerformanceMonitoring: false,
  logLevel: 'warn'
}

class DiagramDetectionConfigManager {
  private config: DiagramDetectionConfig
  private listeners: Set<(config: DiagramDetectionConfig) => void> = new Set()

  constructor(initialConfig?: Partial<DiagramDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig }
    this.loadFromStorage()
  }

  /**
   * Get current configuration
   */
  getConfig(): DiagramDetectionConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DiagramDetectionConfig>): void {
    const oldConfig = { ...this.config }
    this.config = { ...this.config, ...updates }
    
    // Save to storage
    this.saveToStorage()
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.config)
      } catch (error) {
        console.error('Error in config listener:', error)
      }
    })

    // Log configuration changes in debug mode
    if (this.config.enableDebugMode) {
      console.log('📝 Configuration updated:', {
        old: oldConfig,
        new: this.config,
        changes: updates
      })
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.updateConfig(DEFAULT_CONFIG)
  }

  /**
   * Get API key with fallback options
   */
  getApiKey(): string | undefined {
    // Priority order:
    // 1. Explicitly set API key
    // 2. Environment variable
    // 3. Runtime config
    // 4. Local storage

    if (this.config.geminiApiKey) {
      return this.config.geminiApiKey
    }

    if (typeof window !== 'undefined') {
      // Check localStorage
      const storedKey = localStorage.getItem('gemini-api-key')
      if (storedKey) {
        return storedKey
      }
    }

    // Check runtime config (Nuxt)
    try {
      const runtimeConfig = useRuntimeConfig()
      if (runtimeConfig.public.geminiApiKey) {
        return runtimeConfig.public.geminiApiKey
      }
    } catch (error) {
      // Runtime config not available
    }

    // Check environment variable
    if (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY
    }

    return undefined
  }

  /**
   * Set API key securely
   */
  setApiKey(apiKey: string, persist: boolean = true): void {
    this.config.geminiApiKey = apiKey

    if (persist && typeof window !== 'undefined') {
      localStorage.setItem('gemini-api-key', apiKey)
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.config)
      } catch (error) {
        console.error('Error in config listener:', error)
      }
    })
  }

  /**
   * Clear API key
   */
  clearApiKey(): void {
    this.config.geminiApiKey = undefined

    if (typeof window !== 'undefined') {
      localStorage.removeItem('gemini-api-key')
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.config)
      } catch (error) {
        console.error('Error in config listener:', error)
      }
    })
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate API configuration
    if (!this.getApiKey()) {
      errors.push('Gemini API key is required')
    }

    if (this.config.apiTimeout < 1000) {
      errors.push('API timeout must be at least 1000ms')
    }

    if (this.config.maxRetries < 0 || this.config.maxRetries > 10) {
      errors.push('Max retries must be between 0 and 10')
    }

    // Validate processing configuration
    if (this.config.confidenceThreshold < 0 || this.config.confidenceThreshold > 1) {
      errors.push('Confidence threshold must be between 0 and 1')
    }

    if (this.config.batchSize < 1 || this.config.batchSize > 20) {
      errors.push('Batch size must be between 1 and 20')
    }

    // Validate storage configuration
    if (this.config.cacheExpiration < 0) {
      errors.push('Cache expiration must be positive')
    }

    if (this.config.maxCacheSize < 1024 * 1024) {
      errors.push('Max cache size must be at least 1MB')
    }

    // Validate performance configuration
    if (this.config.maxImageSize < 1024 * 1024) {
      errors.push('Max image size must be at least 1MB')
    }

    if (this.config.compressionQuality < 0.1 || this.config.compressionQuality > 1) {
      errors.push('Compression quality must be between 0.1 and 1')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: (config: DiagramDetectionConfig) => void): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Load configuration from storage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('diagram-detection-config')
      if (stored) {
        const parsedConfig = JSON.parse(stored)
        this.config = { ...DEFAULT_CONFIG, ...parsedConfig }
      }
    } catch (error) {
      console.warn('Failed to load configuration from storage:', error)
    }
  }

  /**
   * Save configuration to storage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      // Don't save sensitive data like API keys
      const configToSave = { ...this.config }
      delete configToSave.geminiApiKey

      localStorage.setItem('diagram-detection-config', JSON.stringify(configToSave))
    } catch (error) {
      console.warn('Failed to save configuration to storage:', error)
    }
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    const exportData = {
      config: this.config,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): void {
    try {
      const importData = JSON.parse(configJson)
      
      if (importData.config) {
        this.updateConfig(importData.config)
      } else {
        throw new Error('Invalid configuration format')
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`)
    }
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): Partial<DiagramDetectionConfig> {
    const env = process.env.NODE_ENV || 'development'
    
    switch (env) {
      case 'development':
        return {
          enableDebugMode: true,
          enablePerformanceMonitoring: true,
          logLevel: 'debug'
        }
      
      case 'production':
        return {
          enableDebugMode: false,
          enablePerformanceMonitoring: false,
          logLevel: 'error'
        }
      
      case 'test':
        return {
          enableDebugMode: false,
          enablePerformanceMonitoring: false,
          logLevel: 'warn',
          enableIndexedDB: false // Use memory storage for tests
        }
      
      default:
        return {}
    }
  }
}

// Global configuration manager instance
export const diagramDetectionConfig = new DiagramDetectionConfigManager()

// Initialize with environment-specific configuration
if (typeof window !== 'undefined') {
  diagramDetectionConfig.updateConfig(
    diagramDetectionConfig.getEnvironmentConfig()
  )
}

// Export for use in composables and components
export { DiagramDetectionConfigManager }