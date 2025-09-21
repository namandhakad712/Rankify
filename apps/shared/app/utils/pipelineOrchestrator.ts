/**
 * Pipeline Orchestrator
 * 
 * This module orchestrates the complete PDF processing workflow,
 * managing state, progress tracking, and error recovery.
 */

import type { 
  PipelineResult,
  PipelineConfig
} from './enhancedPdfProcessingPipeline'
import type { 
  DiagramDetectionError,
  ProcessingStats
} from '~/shared/types/diagram-detection'
import { EnhancedPDFProcessingPipeline } from './enhancedPdfProcessingPipeline'
import { DatabaseMigrationManager } from './databaseMigration'

export interface OrchestrationConfig extends PipelineConfig {
  enableProgressTracking?: boolean
  enableErrorRecovery?: boolean
  enableStatePersistence?: boolean
  maxRetries?: number
  retryDelay?: number
}

export interface ProcessingSession {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: {
    currentStep: string
    completedSteps: number
    totalSteps: number
    percentage: number
  }
  startTime: Date
  endTime?: Date
  files: Array<{
    name: string
    size: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    result?: PipelineResult
    error?: string
  }>
  errors: DiagramDetectionError[]
  warnings: string[]
}

export interface OrchestrationResult {
  sessionId: string
  success: boolean
  results: PipelineResult[]
  summary: {
    totalFiles: number
    successfulFiles: number
    failedFiles: number
    totalQuestions: number
    questionsWithDiagrams: number
    averageQuality: number
    totalProcessingTime: number
  }
  errors: DiagramDetectionError[]
  warnings: string[]
}

export class PipelineOrchestrator {
  private config: Required<OrchestrationConfig>
  private pipeline: EnhancedPDFProcessingPipeline
  private migrationManager: DatabaseMigrationManager
  private activeSessions = new Map<string, ProcessingSession>()
  private progressCallbacks = new Map<string, (session: ProcessingSession) => void>()

  constructor(config: OrchestrationConfig) {
    this.config = {
      enableProgressTracking: true,
      enableErrorRecovery: true,
      enableStatePersistence: true,
      maxRetries: 3,
      retryDelay: 2000,
      enableDiagramDetection: true,
      enableCoordinateValidation: true,
      enableDatabaseStorage: true,
      batchSize: 3,
      qualityThreshold: 0.7,
      maxFileSize: 50,
      supportedFormats: ['application/pdf'],
      ...config
    }

    this.pipeline = new EnhancedPDFProcessingPipeline(this.config)
    this.migrationManager = new DatabaseMigrationManager()
  }

  /**
   * Start processing session with multiple files
   */
  async startProcessingSession(
    files: File[],
    options?: {
      sessionId?: string
      onProgress?: (session: ProcessingSession) => void
    }
  ): Promise<string> {
    const sessionId = options?.sessionId || this.generateSessionId()
    
    // Create processing session
    const session: ProcessingSession = {
      id: sessionId,
      status: 'pending',
      progress: {
        currentStep: 'Initializing',
        completedSteps: 0,
        totalSteps: this.calculateTotalSteps(files.length),
        percentage: 0
      },
      startTime: new Date(),
      files: files.map(file => ({
        name: file.name,
        size: file.size,
        status: 'pending'
      })),
      errors: [],
      warnings: []
    }

    this.activeSessions.set(sessionId, session)
    
    if (options?.onProgress) {
      this.progressCallbacks.set(sessionId, options.onProgress)
    }

    // Start processing asynchronously
    this.processSessionAsync(sessionId, files).catch(error => {
      console.error('Session processing failed:', error)
      this.updateSessionStatus(sessionId, 'failed')
    })

    return sessionId
  }

  /**
   * Get processing session status
   */
  getSessionStatus(sessionId: string): ProcessingSession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * Cancel processing session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.status = 'cancelled'
    session.endTime = new Date()
    
    this.notifyProgress(sessionId)
    return true
  }

  /**
   * Get orchestration results for completed session
   */
  async getOrchestrationResults(sessionId: string): Promise<OrchestrationResult | null> {
    const session = this.activeSessions.get(sessionId)
    if (!session || session.status !== 'completed') {
      return null
    }

    const results = session.files
      .filter(file => file.result)
      .map(file => file.result!)

    const summary = this.calculateSummary(results)

    return {
      sessionId,
      success: session.status === 'completed' && session.errors.length === 0,
      results,
      summary,
      errors: session.errors,
      warnings: session.warnings
    }
  }

  /**
   * Resume processing from a previous session
   */
  async resumeSession(sessionId: string): Promise<boolean> {
    try {
      // Try to load session state from persistence
      const savedSession = await this.loadSessionState(sessionId)
      if (!savedSession) return false

      // Resume processing from where it left off
      const incompleteFiles = savedSession.files
        .filter(file => file.status === 'pending' || file.status === 'processing')
        .map(file => new File([], file.name)) // Simplified - would need actual file data

      if (incompleteFiles.length > 0) {
        await this.processSessionAsync(sessionId, incompleteFiles)
      }

      return true
    } catch (error) {
      console.error('Failed to resume session:', error)
      return false
    }
  }

  /**
   * Clean up completed sessions
   */
  cleanupSessions(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.endTime && session.endTime < cutoffTime) {
        this.activeSessions.delete(sessionId)
        this.progressCallbacks.delete(sessionId)
      }
    }
  }

  // Private methods

  private async processSessionAsync(sessionId: string, files: File[]): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    try {
      // Step 1: Initialize system
      await this.initializeSystem(sessionId)

      // Step 2: Validate files
      await this.validateFiles(sessionId, files)

      // Step 3: Process files
      await this.processFiles(sessionId, files)

      // Step 4: Finalize results
      await this.finalizeResults(sessionId)

      this.updateSessionStatus(sessionId, 'completed')
    } catch (error) {
      session.errors.push({
        type: 'PROCESSING_ERROR',
        message: `Session processing failed: ${error.message}`,
        originalError: error,
        timestamp: new Date()
      })
      this.updateSessionStatus(sessionId, 'failed')
    }
  }

  private async initializeSystem(sessionId: string): Promise<void> {
    this.updateProgress(sessionId, 'Initializing system', 1)

    // Check database migration status
    const migrationStatus = await this.migrationManager.checkMigrationStatus()
    if (migrationStatus.needsMigration) {
      this.updateProgress(sessionId, 'Updating database', 2)
      await this.migrationManager.performFullMigration()
    }

    // Initialize pipeline components
    // (Pipeline is already initialized in constructor)
  }

  private async validateFiles(sessionId: string, files: File[]): Promise<void> {
    this.updateProgress(sessionId, 'Validating files', 3)

    const session = this.activeSessions.get(sessionId)
    if (!session) return

    for (const file of files) {
      try {
        // Basic validation
        if (!this.config.supportedFormats.includes(file.type)) {
          throw new Error(`Unsupported format: ${file.type}`)
        }

        const fileSizeMB = file.size / (1024 * 1024)
        if (fileSizeMB > this.config.maxFileSize) {
          throw new Error(`File too large: ${fileSizeMB.toFixed(1)}MB`)
        }
      } catch (error) {
        const fileEntry = session.files.find(f => f.name === file.name)
        if (fileEntry) {
          fileEntry.status = 'failed'
          fileEntry.error = error.message
        }
      }
    }
  }

  private async processFiles(sessionId: string, files: File[]): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const validFiles = files.filter(file => {
      const fileEntry = session.files.find(f => f.name === file.name)
      return fileEntry && fileEntry.status !== 'failed'
    })

    // Process files in batches
    for (let i = 0; i < validFiles.length; i += this.config.batchSize) {
      if (session.status === 'cancelled') break

      const batch = validFiles.slice(i, i + this.config.batchSize)
      this.updateProgress(sessionId, `Processing batch ${Math.floor(i / this.config.batchSize) + 1}`, 4 + i)

      await this.processBatch(sessionId, batch)
    }
  }

  private async processBatch(sessionId: string, files: File[]): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const batchPromises = files.map(async file => {
      const fileEntry = session.files.find(f => f.name === file.name)
      if (!fileEntry) return

      fileEntry.status = 'processing'
      this.notifyProgress(sessionId)

      try {
        let result: PipelineResult
        let retryCount = 0

        // Retry logic
        while (retryCount <= this.config.maxRetries) {
          try {
            result = await this.pipeline.processPDF(file)
            break
          } catch (error) {
            retryCount++
            if (retryCount > this.config.maxRetries) {
              throw error
            }
            
            session.warnings.push(`Retry ${retryCount} for ${file.name}: ${error.message}`)
            await this.delay(this.config.retryDelay * retryCount)
          }
        }

        fileEntry.result = result!
        fileEntry.status = result!.success ? 'completed' : 'failed'
        
        if (!result!.success) {
          session.errors.push(...result!.errors)
        }
        
        session.warnings.push(...result!.warnings)
      } catch (error) {
        fileEntry.status = 'failed'
        fileEntry.error = error.message
        
        session.errors.push({
          type: 'PROCESSING_ERROR',
          message: `Failed to process ${file.name}: ${error.message}`,
          originalError: error,
          timestamp: new Date()
        })
      }

      this.notifyProgress(sessionId)
    })

    await Promise.all(batchPromises)
  }

  private async finalizeResults(sessionId: string): Promise<void> {
    this.updateProgress(sessionId, 'Finalizing results', this.calculateTotalSteps(1) - 1)

    const session = this.activeSessions.get(sessionId)
    if (!session) return

    // Save session state if persistence is enabled
    if (this.config.enableStatePersistence) {
      await this.saveSessionState(session)
    }

    // Clean up temporary resources
    // (Implementation would clean up any temporary files or resources)
  }

  private updateProgress(sessionId: string, currentStep: string, completedSteps: number): void {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    session.progress.currentStep = currentStep
    session.progress.completedSteps = completedSteps
    session.progress.percentage = Math.round((completedSteps / session.progress.totalSteps) * 100)

    this.notifyProgress(sessionId)
  }

  private updateSessionStatus(sessionId: string, status: ProcessingSession['status']): void {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    session.status = status
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      session.endTime = new Date()
    }

    this.notifyProgress(sessionId)
  }

  private notifyProgress(sessionId: string): void {
    const session = this.activeSessions.get(sessionId)
    const callback = this.progressCallbacks.get(sessionId)
    
    if (session && callback) {
      callback(session)
    }
  }

  private calculateTotalSteps(fileCount: number): number {
    // Base steps: initialize, validate, finalize
    let steps = 3
    
    // Add steps for file processing (batched)
    const batches = Math.ceil(fileCount / this.config.batchSize)
    steps += batches

    return steps
  }

  private calculateSummary(results: PipelineResult[]): OrchestrationResult['summary'] {
    const totalFiles = results.length
    const successfulFiles = results.filter(r => r.success).length
    const failedFiles = totalFiles - successfulFiles
    
    const totalQuestions = results.reduce((sum, r) => sum + r.questions.length, 0)
    const questionsWithDiagrams = results.reduce((sum, r) => 
      sum + r.questions.filter(q => q.hasDiagram).length, 0)
    
    const averageQuality = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.metadata.qualityScore, 0) / results.length : 0
    
    const totalProcessingTime = results.reduce((sum, r) => sum + r.metadata.processingTime, 0)

    return {
      totalFiles,
      successfulFiles,
      failedFiles,
      totalQuestions,
      questionsWithDiagrams,
      averageQuality,
      totalProcessingTime
    }
  }

  private async saveSessionState(session: ProcessingSession): Promise<void> {
    // Implementation would save session state to persistent storage
    // For now, just log
    console.log('Saving session state:', session.id)
  }

  private async loadSessionState(sessionId: string): Promise<ProcessingSession | null> {
    // Implementation would load session state from persistent storage
    // For now, return null
    return null
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.pipeline.cleanup()
    this.activeSessions.clear()
    this.progressCallbacks.clear()
  }
}

// Export factory function
export function createPipelineOrchestrator(config: OrchestrationConfig): PipelineOrchestrator {
  return new PipelineOrchestrator(config)
}

export default PipelineOrchestrator