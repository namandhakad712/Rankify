/**
 * Data Migration Composable
 * 
 * Provides reactive data migration functionality for Vue components.
 */

import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import type { 
  EnhancedQuestion,
  PageImageData
} from '~/shared/types/diagram-detection'
import { 
  DataMigrationManager,
  LegacyDataAnalyzer,
  createDataMigrationManager,
  createLegacyDataAnalyzer,
  type LegacyQuestionData,
  type MigrationOptions,
  type MigrationResult,
  type MigrationProgress,
  type BackupData
} from '~/app/utils/dataMigrationManager'

export interface UseDataMigrationOptions extends MigrationOptions {
  autoAnalyze?: boolean
  enableBackup?: boolean
  showProgress?: boolean
}

export interface DataMigrationState {
  manager: Ref<DataMigrationManager | null>
  analyzer: Ref<LegacyDataAnalyzer | null>
  isAnalyzing: Ref<boolean>
  isMigrating: Ref<boolean>
  progress: Ref<MigrationProgress | null>
  result: Ref<MigrationResult | null>
  analysis: Ref<any | null>
  error: Ref<string | null>
  backupId: Ref<string | null>
}

export interface DataMigrationActions {
  initializeMigration: () => Promise<void>
  analyzeLegacyData: (data: any[]) => Promise<any>
  migrateLegacyData: (
    legacyQuestions: LegacyQuestionData[],
    pageImages: Map<number, HTMLImageElement | string>
  ) => Promise<MigrationResult>
  convertLegacyFormat: (
    data: ArrayBuffer | Blob,
    format: 'zip' | 'json'
  ) => Promise<{ questions: EnhancedQuestion[]; pageImages: PageImageData[] }>
  validateMigration: (
    originalData: LegacyQuestionData[],
    migratedData: EnhancedQuestion[]
  ) => Promise<{ valid: boolean; issues: string[] }>
  createBackup: (data: any[]) => Promise<string>
  rollbackMigration: (backupId: string) => Promise<{ success: boolean; data?: any[] }>
  detectDataFormat: (data: ArrayBuffer | Blob | string) => string
  reset: () => void
}

export function useDataMigration(
  options: UseDataMigrationOptions = {}
) {
  // Configuration
  const config = {
    preserveLegacyData: true,
    validateCoordinates: true,
    generateThumbnails: false,
    batchSize: 10,
    enableProgressTracking: true,
    autoAnalyze: true,
    enableBackup: true,
    showProgress: true,
    ...options
  }

  // Reactive state
  const manager = ref<DataMigrationManager | null>(null)
  const analyzer = ref<LegacyDataAnalyzer | null>(null)
  const isAnalyzing = ref(false)
  const isMigrating = ref(false)
  const progress = ref<MigrationProgress | null>(null)
  const result = ref<MigrationResult | null>(null)
  const analysis = ref<any | null>(null)
  const error = ref<string | null>(null)
  const backupId = ref<string | null>(null)

  // Computed properties
  const isReady = computed(() => manager.value !== null && analyzer.value !== null)
  const isProcessing = computed(() => isAnalyzing.value || isMigrating.value)
  const hasResult = computed(() => result.value !== null)
  const hasAnalysis = computed(() => analysis.value !== null)
  const migrationStats = computed(() => {
    if (!manager.value) return null
    return manager.value.getMigrationStats()
  })

  // Initialize migration tools
  async function initializeMigration() {
    try {
      manager.value = createDataMigrationManager(config)
      analyzer.value = createLegacyDataAnalyzer()
      error.value = null
    } catch (err) {
      error.value = `Failed to initialize migration: ${err.message}`
      throw err
    }
  }

  // Analyze legacy data
  async function analyzeLegacyData(data: any[]) {
    if (!analyzer.value) {
      await initializeMigration()
    }

    isAnalyzing.value = true
    error.value = null

    try {
      analysis.value = analyzer.value!.analyzeLegacyData(data)
      return analysis.value
    } catch (err) {
      error.value = `Failed to analyze data: ${err.message}`
      throw err
    } finally {
      isAnalyzing.value = false
    }
  }

  // Migrate legacy data
  async function migrateLegacyData(
    legacyQuestions: LegacyQuestionData[],
    pageImages: Map<number, HTMLImageElement | string>
  ): Promise<MigrationResult> {
    if (!manager.value) {
      await initializeMigration()
    }

    isMigrating.value = true
    error.value = null
    progress.value = null

    try {
      // Create backup if enabled
      if (config.enableBackup) {
        backupId.value = await manager.value!.createRollbackPoint(legacyQuestions)
      }

      // Perform migration with progress tracking
      const migrationResult = await manager.value!.migrateLegacyData(
        legacyQuestions,
        pageImages,
        config.showProgress ? (progressData) => {
          progress.value = progressData
        } : undefined
      )

      result.value = migrationResult
      return migrationResult
    } catch (err) {
      error.value = `Migration failed: ${err.message}`
      throw err
    } finally {
      isMigrating.value = false
    }
  }

  // Convert legacy format
  async function convertLegacyFormat(
    data: ArrayBuffer | Blob,
    format: 'zip' | 'json'
  ): Promise<{ questions: EnhancedQuestion[]; pageImages: PageImageData[] }> {
    if (!manager.value) {
      await initializeMigration()
    }

    try {
      return await manager.value!.convertLegacyFormat(data, format)
    } catch (err) {
      error.value = `Format conversion failed: ${err.message}`
      throw err
    }
  }

  // Validate migration
  async function validateMigration(
    originalData: LegacyQuestionData[],
    migratedData: EnhancedQuestion[]
  ): Promise<{ valid: boolean; issues: string[] }> {
    if (!manager.value) {
      await initializeMigration()
    }

    try {
      return await manager.value!.validateMigratedData(originalData, migratedData)
    } catch (err) {
      error.value = `Validation failed: ${err.message}`
      throw err
    }
  }

  // Create backup
  async function createBackup(data: any[]): Promise<string> {
    if (!manager.value) {
      await initializeMigration()
    }

    try {
      const id = await manager.value!.createRollbackPoint(data)
      backupId.value = id
      return id
    } catch (err) {
      error.value = `Backup creation failed: ${err.message}`
      throw err
    }
  }

  // Rollback migration
  async function rollbackMigration(rollbackId: string): Promise<{ success: boolean; data?: any[] }> {
    if (!manager.value) {
      await initializeMigration()
    }

    try {
      const rollbackResult = await manager.value!.rollbackMigration(rollbackId)
      if (rollbackResult.success) {
        // Reset state after successful rollback
        result.value = null
        progress.value = null
        error.value = null
      }
      return rollbackResult
    } catch (err) {
      error.value = `Rollback failed: ${err.message}`
      throw err
    }
  }

  // Detect data format
  function detectDataFormat(data: ArrayBuffer | Blob | string): string {
    if (!analyzer.value) {
      return 'unknown'
    }
    return analyzer.value.detectDataFormat(data)
  }

  // Reset state
  function reset() {
    result.value = null
    progress.value = null
    analysis.value = null
    error.value = null
    backupId.value = null
    isAnalyzing.value = false
    isMigrating.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    reset()
  })

  // Return state and actions
  const state: DataMigrationState = {
    manager,
    analyzer,
    isAnalyzing,
    isMigrating,
    progress,
    result,
    analysis,
    error,
    backupId
  }

  const actions: DataMigrationActions = {
    initializeMigration,
    analyzeLegacyData,
    migrateLegacyData,
    convertLegacyFormat,
    validateMigration,
    createBackup,
    rollbackMigration,
    detectDataFormat,
    reset
  }

  return {
    ...state,
    ...actions,
    isReady,
    isProcessing,
    hasResult,
    hasAnalysis,
    migrationStats
  }
}

/**
 * Composable for batch data migration
 */
export function useBatchDataMigration(
  options: UseDataMigrationOptions = {}
) {
  const migration = useDataMigration({ ...options, batchSize: 50 })
  const batchQueue = ref<Array<{ data: LegacyQuestionData[]; pageImages: Map<number, HTMLImageElement | string> }>>([])
  const currentBatch = ref(0)
  const totalBatches = computed(() => batchQueue.value.length)
  const batchProgress = computed(() => {
    if (totalBatches.value === 0) return 0
    return Math.round((currentBatch.value / totalBatches.value) * 100)
  })

  // Add batch to queue
  function addBatch(data: LegacyQuestionData[], pageImages: Map<number, HTMLImageElement | string>) {
    batchQueue.value.push({ data, pageImages })
  }

  // Process all batches
  async function processBatches(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = []
    currentBatch.value = 0

    for (const batch of batchQueue.value) {
      try {
        const result = await migration.migrateLegacyData(batch.data, batch.pageImages)
        results.push(result)
        currentBatch.value++
      } catch (error) {
        results.push({
          success: false,
          migratedQuestions: 0,
          failedQuestions: batch.data.length,
          generatedCoordinates: 0,
          errors: [error.message],
          warnings: [],
          migrationTime: 0
        })
      }
    }

    return results
  }

  // Clear batch queue
  function clearBatches() {
    batchQueue.value = []
    currentBatch.value = 0
  }

  return {
    ...migration,
    batchQueue,
    currentBatch,
    totalBatches,
    batchProgress,
    addBatch,
    processBatches,
    clearBatches
  }
}

/**
 * Composable for migration validation
 */
export function useMigrationValidation() {
  const validationResults = ref<Array<{ valid: boolean; issues: string[] }>>([])
  const isValidating = ref(false)
  const overallValid = computed(() => 
    validationResults.value.length > 0 && validationResults.value.every(r => r.valid)
  )
  const totalIssues = computed(() => 
    validationResults.value.reduce((sum, r) => sum + r.issues.length, 0)
  )

  // Validate multiple migrations
  async function validateMultipleMigrations(
    migrations: Array<{
      original: LegacyQuestionData[]
      migrated: EnhancedQuestion[]
    }>
  ) {
    isValidating.value = true
    validationResults.value = []

    try {
      const migration = useDataMigration()
      await migration.initializeMigration()

      for (const { original, migrated } of migrations) {
        const result = await migration.validateMigration(original, migrated)
        validationResults.value.push(result)
      }
    } finally {
      isValidating.value = false
    }
  }

  // Clear validation results
  function clearValidation() {
    validationResults.value = []
  }

  return {
    validationResults,
    isValidating,
    overallValid,
    totalIssues,
    validateMultipleMigrations,
    clearValidation
  }
}

export default useDataMigration