/**
 * Data Migration Manager
 * 
 * This module provides utilities for migrating existing cropped image data
 * to the new coordinate-based diagram system while maintaining backward compatibility.
 */

import type { 
  DiagramCoordinates,
  EnhancedQuestion,
  CoordinateMetadata,
  PageImageData
} from '~/shared/types/diagram-detection'

export interface LegacyQuestionData {
  id: string
  text: string
  type: string
  options?: string[]
  correctAnswer?: string | string[]
  pdfData: Array<{
    page: number
    x: number
    y: number
    width: number
    height: number
    imageData?: string // Base64 cropped image
  }>
  subject?: string
  section?: string
}

export interface MigrationOptions {
  preserveLegacyData?: boolean
  validateCoordinates?: boolean
  generateThumbnails?: boolean
  batchSize?: number
  enableProgressTracking?: boolean
}

export interface MigrationResult {
  success: boolean
  migratedQuestions: number
  failedQuestions: number
  generatedCoordinates: number
  errors: string[]
  warnings: string[]
  migrationTime: number
}

export interface MigrationProgress {
  currentItem: number
  totalItems: number
  percentage: number
  currentPhase: string
  estimatedTimeRemaining: number
}

export interface BackupData {
  timestamp: Date
  version: string
  originalData: any[]
  metadata: {
    totalQuestions: number
    dataFormat: string
    migrationVersion: string
  }
}

/**
 * Data Migration Manager Class
 * Handles migration from legacy cropped images to coordinate-based system
 */
export class DataMigrationManager {
  private options: Required<MigrationOptions>
  private progressCallback?: (progress: MigrationProgress) => void
  private migrationStats = {
    startTime: 0,
    processedItems: 0,
    totalItems: 0,
    errors: 0,
    warnings: 0
  }

  constructor(options: MigrationOptions = {}) {
    this.options = {
      preserveLegacyData: true,
      validateCoordinates: true,
      generateThumbnails: false,
      batchSize: 10,
      enableProgressTracking: true,
      ...options
    }
  }

  /**
   * Migrate legacy question data to coordinate-based format
   */
  async migrateLegacyData(
    legacyQuestions: LegacyQuestionData[],
    pageImages: Map<number, HTMLImageElement | string>,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    this.progressCallback = onProgress
    this.migrationStats.startTime = performance.now()
    this.migrationStats.totalItems = legacyQuestions.length
    this.migrationStats.processedItems = 0
    this.migrationStats.errors = 0
    this.migrationStats.warnings = 0

    const result: MigrationResult = {
      success: true,
      migratedQuestions: 0,
      failedQuestions: 0,
      generatedCoordinates: 0,
      errors: [],
      warnings: [],
      migrationTime: 0
    }

    try {
      // Create backup if preserving legacy data
      if (this.options.preserveLegacyData) {
        await this.createBackup(legacyQuestions)
      }

      // Process questions in batches
      const batches = this.createBatches(legacyQuestions, this.options.batchSize)
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        
        this.updateProgress('Processing batch', batchIndex * this.options.batchSize)
        
        const batchResults = await Promise.allSettled(
          batch.map(question => this.migrateQuestion(question, pageImages))
        )

        // Process batch results
        batchResults.forEach((batchResult, index) => {
          this.migrationStats.processedItems++
          
          if (batchResult.status === 'fulfilled') {
            const migrationData = batchResult.value
            if (migrationData.success) {
              result.migratedQuestions++
              result.generatedCoordinates += migrationData.coordinatesGenerated
            } else {
              result.failedQuestions++
              result.errors.push(...migrationData.errors)
            }
            result.warnings.push(...migrationData.warnings)
          } else {
            result.failedQuestions++
            result.errors.push(`Failed to migrate question: ${batchResult.reason}`)
            this.migrationStats.errors++
          }
        })

        // Small delay between batches to prevent blocking
        if (batchIndex < batches.length - 1) {
          await this.delay(100)
        }
      }

      result.migrationTime = performance.now() - this.migrationStats.startTime
      result.success = result.errors.length === 0

      this.updateProgress('Migration complete', this.migrationStats.totalItems)

      return result
    } catch (error) {
      result.success = false
      result.errors.push(`Migration failed: ${error.message}`)
      result.migrationTime = performance.now() - this.migrationStats.startTime
      return result
    }
  }

  /**
   * Convert legacy ZIP/JSON format to enhanced format
   */
  async convertLegacyFormat(
    zipData: ArrayBuffer | Blob,
    format: 'zip' | 'json'
  ): Promise<{ questions: EnhancedQuestion[]; pageImages: PageImageData[] }> {
    if (format === 'zip') {
      return await this.convertFromZip(zipData)
    } else {
      return await this.convertFromJSON(zipData)
    }
  }

  /**
   * Validate migrated data integrity
   */
  async validateMigratedData(
    originalData: LegacyQuestionData[],
    migratedData: EnhancedQuestion[]
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = []

    // Check question count
    if (originalData.length !== migratedData.length) {
      issues.push(`Question count mismatch: ${originalData.length} original vs ${migratedData.length} migrated`)
    }

    // Validate each question
    for (let i = 0; i < Math.min(originalData.length, migratedData.length); i++) {
      const original = originalData[i]
      const migrated = migratedData[i]

      // Check basic properties
      if (original.text !== migrated.text) {
        issues.push(`Question ${i + 1}: Text mismatch`)
      }

      if (original.type !== migrated.type) {
        issues.push(`Question ${i + 1}: Type mismatch`)
      }

      // Check diagram data
      const originalHasDiagrams = original.pdfData.some(data => data.imageData)
      if (originalHasDiagrams !== migrated.hasDiagram) {
        issues.push(`Question ${i + 1}: Diagram presence mismatch`)
      }

      // Validate coordinates if present
      if (migrated.hasDiagram && this.options.validateCoordinates) {
        for (const diagram of migrated.diagrams) {
          if (!this.isValidCoordinate(diagram)) {
            issues.push(`Question ${i + 1}: Invalid diagram coordinates`)
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * Create rollback point for migration
   */
  async createRollbackPoint(data: any[]): Promise<string> {
    const rollbackId = `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const backup: BackupData = {
      timestamp: new Date(),
      version: '1.0.0',
      originalData: data,
      metadata: {
        totalQuestions: data.length,
        dataFormat: 'legacy',
        migrationVersion: '1.0.0'
      }
    }

    // Store backup (in real implementation, this would use IndexedDB or similar)
    localStorage.setItem(`migration_backup_${rollbackId}`, JSON.stringify(backup))
    
    return rollbackId
  }

  /**
   * Rollback migration using backup
   */
  async rollbackMigration(rollbackId: string): Promise<{ success: boolean; data?: any[] }> {
    try {
      const backupData = localStorage.getItem(`migration_backup_${rollbackId}`)
      if (!backupData) {
        return { success: false }
      }

      const backup: BackupData = JSON.parse(backupData)
      return { success: true, data: backup.originalData }
    } catch (error) {
      return { success: false }
    }
  }

  /**
   * Get migration statistics
   */
  getMigrationStats() {
    return {
      ...this.migrationStats,
      elapsedTime: performance.now() - this.migrationStats.startTime,
      successRate: this.migrationStats.totalItems > 0 ? 
        ((this.migrationStats.processedItems - this.migrationStats.errors) / this.migrationStats.totalItems) * 100 : 0
    }
  }

  // Private helper methods

  private async migrateQuestion(
    legacyQuestion: LegacyQuestionData,
    pageImages: Map<number, HTMLImageElement | string>
  ): Promise<{
    success: boolean
    coordinatesGenerated: number
    errors: string[]
    warnings: string[]
  }> {
    const result = {
      success: true,
      coordinatesGenerated: 0,
      errors: [],
      warnings: []
    }

    try {
      // Convert PDF data to coordinates
      const diagrams: DiagramCoordinates[] = []
      
      for (const pdfData of legacyQuestion.pdfData) {
        if (pdfData.imageData) {
          // Convert cropped image coordinates to diagram coordinates
          const coordinates = await this.convertCroppedImageToCoordinates(
            pdfData,
            pageImages.get(pdfData.page)
          )
          
          if (coordinates) {
            diagrams.push(coordinates)
            result.coordinatesGenerated++
          } else {
            result.warnings.push(`Failed to convert coordinates for question ${legacyQuestion.id}`)
          }
        }
      }

      return result
    } catch (error) {
      result.success = false
      result.errors.push(`Migration failed for question ${legacyQuestion.id}: ${error.message}`)
      return result
    }
  }

  private async convertCroppedImageToCoordinates(
    pdfData: any,
    pageImage?: HTMLImageElement | string
  ): Promise<DiagramCoordinates | null> {
    try {
      // Convert legacy coordinates to new format
      const coordinates: DiagramCoordinates = {
        x1: pdfData.x,
        y1: pdfData.y,
        x2: pdfData.x + pdfData.width,
        y2: pdfData.y + pdfData.height,
        confidence: 0.8, // Default confidence for migrated data
        type: 'other', // Default type, could be enhanced with AI detection
        description: 'Migrated from legacy cropped image'
      }

      // Validate coordinates if option is enabled
      if (this.options.validateCoordinates && !this.isValidCoordinate(coordinates)) {
        return null
      }

      return coordinates
    } catch (error) {
      console.warn('Failed to convert cropped image to coordinates:', error)
      return null
    }
  }

  private async convertFromZip(zipData: ArrayBuffer | Blob): Promise<{
    questions: EnhancedQuestion[]
    pageImages: PageImageData[]
  }> {
    // Simplified ZIP conversion - in real implementation would use JSZip or similar
    throw new Error('ZIP conversion not implemented in this example')
  }

  private async convertFromJSON(jsonData: ArrayBuffer | Blob): Promise<{
    questions: EnhancedQuestion[]
    pageImages: PageImageData[]
  }> {
    try {
      const text = await this.blobToText(jsonData)
      const data = JSON.parse(text)
      
      // Convert JSON data to enhanced format
      const questions: EnhancedQuestion[] = data.questions?.map((q: any) => ({
        ...q,
        hasDiagram: q.pdfData?.some((pd: any) => pd.imageData) || false,
        diagrams: [], // Would be populated by migration process
        confidence: 1.0
      })) || []

      const pageImages: PageImageData[] = [] // Would be extracted from JSON

      return { questions, pageImages }
    } catch (error) {
      throw new Error(`Failed to convert JSON data: ${error.message}`)
    }
  }

  private async createBackup(data: LegacyQuestionData[]): Promise<void> {
    const backupId = await this.createRollbackPoint(data)
    console.log(`Backup created with ID: ${backupId}`)
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private updateProgress(phase: string, currentItem: number): void {
    if (!this.options.enableProgressTracking || !this.progressCallback) return

    const percentage = Math.round((currentItem / this.migrationStats.totalItems) * 100)
    const elapsedTime = performance.now() - this.migrationStats.startTime
    const estimatedTotalTime = elapsedTime / (currentItem / this.migrationStats.totalItems)
    const estimatedTimeRemaining = estimatedTotalTime - elapsedTime

    const progress: MigrationProgress = {
      currentItem,
      totalItems: this.migrationStats.totalItems,
      percentage,
      currentPhase: phase,
      estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining)
    }

    this.progressCallback(progress)
  }

  private isValidCoordinate(coords: DiagramCoordinates): boolean {
    return (
      coords.x1 >= 0 &&
      coords.y1 >= 0 &&
      coords.x2 > coords.x1 &&
      coords.y2 > coords.y1 &&
      coords.confidence >= 0 &&
      coords.confidence <= 1
    )
  }

  private async blobToText(blob: ArrayBuffer | Blob): Promise<string> {
    if (blob instanceof ArrayBuffer) {
      return new TextDecoder().decode(blob)
    } else {
      return await blob.text()
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Legacy Data Analyzer
 * Analyzes existing data to determine migration requirements
 */
export class LegacyDataAnalyzer {
  /**
   * Analyze legacy data structure
   */
  analyzeLegacyData(data: any[]): {
    format: 'legacy' | 'enhanced' | 'mixed'
    totalQuestions: number
    questionsWithImages: number
    estimatedMigrationTime: number
    recommendations: string[]
  } {
    const analysis = {
      format: 'legacy' as const,
      totalQuestions: data.length,
      questionsWithImages: 0,
      estimatedMigrationTime: 0,
      recommendations: []
    }

    // Analyze data structure
    let hasLegacyFormat = false
    let hasEnhancedFormat = false

    for (const item of data) {
      // Check for legacy format indicators
      if (item.pdfData && Array.isArray(item.pdfData)) {
        hasLegacyFormat = true
        if (item.pdfData.some((pd: any) => pd.imageData)) {
          analysis.questionsWithImages++
        }
      }

      // Check for enhanced format indicators
      if (item.diagrams && Array.isArray(item.diagrams)) {
        hasEnhancedFormat = true
      }
    }

    // Determine format
    if (hasLegacyFormat && hasEnhancedFormat) {
      analysis.format = 'mixed'
    } else if (hasEnhancedFormat) {
      analysis.format = 'enhanced'
    }

    // Estimate migration time (rough calculation)
    analysis.estimatedMigrationTime = analysis.questionsWithImages * 100 // 100ms per question with images

    // Generate recommendations
    if (analysis.format === 'legacy') {
      analysis.recommendations.push('Full migration to coordinate-based system recommended')
      if (analysis.questionsWithImages > 100) {
        analysis.recommendations.push('Consider batch processing for large datasets')
      }
    } else if (analysis.format === 'mixed') {
      analysis.recommendations.push('Partial migration needed for legacy questions')
      analysis.recommendations.push('Validate data consistency after migration')
    } else {
      analysis.recommendations.push('Data already in enhanced format')
    }

    return analysis
  }

  /**
   * Detect data format from file
   */
  detectDataFormat(data: ArrayBuffer | Blob | string): 'zip' | 'json' | 'unknown' {
    if (data instanceof ArrayBuffer) {
      // Check ZIP signature
      const view = new Uint8Array(data.slice(0, 4))
      if (view[0] === 0x50 && view[1] === 0x4B) {
        return 'zip'
      }
    } else if (typeof data === 'string') {
      try {
        JSON.parse(data)
        return 'json'
      } catch {
        return 'unknown'
      }
    }

    return 'unknown'
  }
}

/**
 * Factory functions
 */
export function createDataMigrationManager(options?: MigrationOptions): DataMigrationManager {
  return new DataMigrationManager(options)
}

export function createLegacyDataAnalyzer(): LegacyDataAnalyzer {
  return new LegacyDataAnalyzer()
}

export default DataMigrationManager