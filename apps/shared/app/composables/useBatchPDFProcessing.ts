/**
 * Batch PDF Processing System
 * Handles multiple PDF files simultaneously for efficient processing
 * Based on design document requirements for batch operations
 */

import { ref, reactive, computed } from 'vue'
import { useAIExtraction } from './useAIExtraction'
import { usePerformanceMonitoring } from './usePerformanceMonitoring'
import { useSecurityPrivacyManager } from './useSecurityPrivacyManager'

export interface BatchProcessingJob {
  id: string
  name: string
  files: BatchFile[]
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startTime: number
  endTime?: number
  results: BatchProcessingResult[]
  errors: BatchError[]
  configuration: BatchProcessingConfig
}

export interface BatchFile {
  id: string
  file: File
  name: string
  size: number
  hash: string
  status: 'waiting' | 'processing' | 'completed' | 'failed'
  progress: number
  processingTime?: number
  result?: any
  error?: string
}

export interface BatchProcessingResult {
  fileId: string
  fileName: string
  questionsExtracted: number
  averageConfidence: number
  processingTime: number
  success: boolean
  extractionData?: any
}

export interface BatchError {
  fileId: string
  fileName: string
  error: string
  timestamp: number
  recoverable: boolean
}

export interface BatchProcessingConfig {
  maxConcurrentFiles: number
  processingMethod: 'ai-extraction' | 'traditional' | 'hybrid'
  aiModel: 'gemini-1.5-flash' | 'gemini-1.5-pro'
  confidenceThreshold: number
  enableCaching: boolean
  retryAttempts: number
  timeoutPerFile: number
  priorityOrder: 'fifo' | 'size-asc' | 'size-desc' | 'name'
}

export interface BatchProcessingMetrics {
  totalJobs: number
  completedJobs: number
  totalFiles: number
  successfulFiles: number
  failedFiles: number
  averageProcessingTime: number
  totalProcessingTime: number
  throughputPerMinute: number
  errorRate: number
}

export interface BatchQueue {
  jobs: BatchProcessingJob[]
  activeJobs: number
  maxConcurrentJobs: number
  isPaused: boolean
}

export function useBatchPDFProcessing() {
  const aiExtraction = useAIExtraction()
  const performanceMonitoring = usePerformanceMonitoring()
  const securityManager = useSecurityPrivacyManager()

  // State management
  const batchQueue = reactive<BatchQueue>({
    jobs: [],
    activeJobs: 0,
    maxConcurrentJobs: 2,
    isPaused: false
  })

  const defaultConfig = reactive<BatchProcessingConfig>({
    maxConcurrentFiles: 3,
    processingMethod: 'ai-extraction',
    aiModel: 'gemini-1.5-flash',
    confidenceThreshold: 2.5,
    enableCaching: true,
    retryAttempts: 2,
    timeoutPerFile: 300000, // 5 minutes
    priorityOrder: 'fifo'
  })

  const processingMetrics = reactive<BatchProcessingMetrics>({
    totalJobs: 0,
    completedJobs: 0,
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0,
    throughputPerMinute: 0,
    errorRate: 0
  })

  // Computed properties
  const activeJobs = computed(() => 
    batchQueue.jobs.filter(job => job.status === 'processing')
  )

  const queuedJobs = computed(() => 
    batchQueue.jobs.filter(job => job.status === 'pending')
  )

  const completedJobs = computed(() => 
    batchQueue.jobs.filter(job => job.status === 'completed')
  )

  const canStartNewJob = computed(() => 
    !batchQueue.isPaused && 
    batchQueue.activeJobs < batchQueue.maxConcurrentJobs &&
    queuedJobs.value.length > 0
  )

  const overallProgress = computed(() => {
    if (batchQueue.jobs.length === 0) return 0
    const totalProgress = batchQueue.jobs.reduce((sum, job) => sum + job.progress, 0)
    return Math.round(totalProgress / batchQueue.jobs.length)
  })

  // Create batch processing job
  const createBatchJob = async (
    files: File[], 
    jobName: string = `Batch Job ${Date.now()}`,
    config: Partial<BatchProcessingConfig> = {}
  ): Promise<string> => {
    const jobId = generateJobId()
    const jobConfig = { ...defaultConfig, ...config }

    // Validate files
    const validationResults = await validateFiles(files)
    if (validationResults.hasErrors) {
      throw new Error(`File validation failed: ${validationResults.errors.join(', ')}`)
    }

    // Create batch files with hashes
    const batchFiles: BatchFile[] = await Promise.all(
      files.map(async (file, index) => ({
        id: `file_${jobId}_${index}`,
        file,
        name: file.name,
        size: file.size,
        hash: await generateFileHash(file),
        status: 'waiting' as const,
        progress: 0
      }))
    )

    // Sort files based on priority order
    const sortedFiles = sortFilesByPriority(batchFiles, jobConfig.priorityOrder)

    const batchJob: BatchProcessingJob = {
      id: jobId,
      name: jobName,
      files: sortedFiles,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
      results: [],
      errors: [],
      configuration: jobConfig
    }

    batchQueue.jobs.push(batchJob)
    processingMetrics.totalJobs++
    processingMetrics.totalFiles += files.length

    // Track batch job creation
    performanceMonitoring.trackUserInteraction('batch_job_created', {
      jobId,
      fileCount: files.length,
      processingMethod: jobConfig.processingMethod
    })

    // Store job metadata securely
    await securityManager.secureSetItem(`batch_job_${jobId}`, {
      jobId,
      name: jobName,
      fileCount: files.length,
      timestamp: Date.now()
    })

    // Start processing if queue allows
    if (canStartNewJob.value) {
      processNextJob()
    }

    return jobId
  }

  // Process next job in queue
  const processNextJob = async (): Promise<void> => {
    if (!canStartNewJob.value) return

    const nextJob = queuedJobs.value[0]
    if (!nextJob) return

    batchQueue.activeJobs++
    nextJob.status = 'processing'

    try {
      await processBatchJob(nextJob)
    } catch (error) {
      console.error(`Batch job ${nextJob.id} failed:`, error)
      nextJob.status = 'failed'
      nextJob.errors.push({
        fileId: 'job',
        fileName: nextJob.name,
        error: error.message,
        timestamp: Date.now(),
        recoverable: false
      })
    } finally {
      batchQueue.activeJobs--
      
      // Process next job if available
      if (canStartNewJob.value) {
        setTimeout(processNextJob, 100) // Small delay to prevent overwhelming
      }
    }
  }

  // Process individual batch job
  const processBatchJob = async (job: BatchProcessingJob): Promise<void> => {
    const startTime = Date.now()
    let processedFiles = 0
    let successfulFiles = 0

    // Process files with concurrency limit
    const semaphore = createSemaphore(job.configuration.maxConcurrentFiles)
    
    const processingPromises = job.files.map(async (file) => {
      return semaphore.acquire(async () => {
        try {
          file.status = 'processing'
          updateJobProgress(job)

          const result = await processIndividualFile(file, job.configuration)
          
          file.status = 'completed'
          file.result = result
          file.processingTime = Date.now() - startTime

          job.results.push({
            fileId: file.id,
            fileName: file.name,
            questionsExtracted: result.questions?.length || 0,
            averageConfidence: result.confidence || 0,
            processingTime: file.processingTime,
            success: true,
            extractionData: result
          })

          successfulFiles++
          processingMetrics.successfulFiles++

        } catch (error) {
          file.status = 'failed'
          file.error = error.message

          job.errors.push({
            fileId: file.id,
            fileName: file.name,
            error: error.message,
            timestamp: Date.now(),
            recoverable: shouldRetryError(error)
          })

          processingMetrics.failedFiles++

          // Track error for performance monitoring
          performanceMonitoring.trackError('batch-processing', 'medium', error)
        }

        processedFiles++
        updateJobProgress(job)

        // Track individual file processing
        performanceMonitoring.trackUserInteraction('batch_file_processed', {
          jobId: job.id,
          fileId: file.id,
          success: file.status === 'completed',
          processingTime: file.processingTime
        })
      })
    })

    // Wait for all files to complete
    await Promise.all(processingPromises)

    // Finalize job
    job.endTime = Date.now()
    job.progress = 100
    job.status = successfulFiles > 0 ? 'completed' : 'failed'

    // Update metrics
    processingMetrics.completedJobs++
    const jobProcessingTime = job.endTime - job.startTime
    processingMetrics.totalProcessingTime += jobProcessingTime
    processingMetrics.averageProcessingTime = 
      processingMetrics.totalProcessingTime / processingMetrics.completedJobs

    // Calculate throughput
    const processingTimeMinutes = jobProcessingTime / (1000 * 60)
    processingMetrics.throughputPerMinute = 
      processingMetrics.successfulFiles / processingTimeMinutes

    // Calculate error rate
    processingMetrics.errorRate = 
      processingMetrics.failedFiles / processingMetrics.totalFiles

    // Track job completion
    performanceMonitoring.trackUserInteraction('batch_job_completed', {
      jobId: job.id,
      success: job.status === 'completed',
      fileCount: job.files.length,
      successfulFiles,
      processingTime: jobProcessingTime
    })

    // Store results securely
    await securityManager.secureSetItem(`batch_results_${job.id}`, {
      jobId: job.id,
      results: job.results,
      metrics: {
        totalFiles: job.files.length,
        successfulFiles,
        failedFiles: job.files.length - successfulFiles,
        processingTime: jobProcessingTime
      },
      timestamp: Date.now()
    })
  }

  // Process individual file
  const processIndividualFile = async (
    file: BatchFile, 
    config: BatchProcessingConfig
  ): Promise<any> => {
    const fileStartTime = Date.now()

    // Check cache first if enabled
    if (config.enableCaching) {
      const cachedResult = await getCachedResult(file.hash)
      if (cachedResult) {
        performanceMonitoring.trackUserInteraction('batch_cache_hit', {
          fileId: file.id,
          hash: file.hash
        })
        return cachedResult
      }
    }

    let result: any
    let attempts = 0
    const maxAttempts = config.retryAttempts + 1

    while (attempts < maxAttempts) {
      try {
        attempts++

        switch (config.processingMethod) {
          case 'ai-extraction':
            result = await processWithAI(file, config)
            break
          case 'traditional':
            result = await processTraditional(file, config)
            break
          case 'hybrid':
            result = await processHybrid(file, config)
            break
          default:
            throw new Error(`Unknown processing method: ${config.processingMethod}`)
        }

        // Cache successful result
        if (config.enableCaching && result) {
          await cacheResult(file.hash, result)
        }

        break // Success, exit retry loop

      } catch (error) {
        if (attempts >= maxAttempts) {
          throw error
        }

        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempts - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    const processingTime = Date.now() - fileStartTime
    
    // Track processing time
    performanceMonitoring.trackAIExtraction(
      processingTime,
      result?.confidence || 0,
      !!result
    )

    return result
  }

  // AI processing method
  const processWithAI = async (file: BatchFile, config: BatchProcessingConfig): Promise<any> => {
    // Configure AI extraction
    aiExtraction.config.value.model = config.aiModel
    aiExtraction.config.value.confidenceThreshold = config.confidenceThreshold

    // Set file for processing
    aiExtraction.setFile(file.file)

    // Start extraction
    const success = await aiExtraction.startExtraction()
    if (!success) {
      throw new Error(aiExtraction.state.error || 'AI extraction failed')
    }

    return aiExtraction.state.result
  }

  // Traditional processing method
  const processTraditional = async (file: BatchFile, config: BatchProcessingConfig): Promise<any> => {
    // For traditional processing, we would typically use rule-based extraction
    // This is a simplified implementation
    return {
      questions: [],
      confidence: 3.0,
      processingTime: Date.now(),
      method: 'traditional'
    }
  }

  // Hybrid processing method
  const processHybrid = async (file: BatchFile, config: BatchProcessingConfig): Promise<any> => {
    try {
      // Try AI first
      return await processWithAI(file, config)
    } catch (aiError) {
      // Fallback to traditional
      console.warn(`AI processing failed for ${file.name}, falling back to traditional:`, aiError)
      return await processTraditional(file, config)
    }
  }

  // Utility functions
  const validateFiles = async (files: File[]): Promise<{hasErrors: boolean, errors: string[]}> => {
    const errors: string[] = []

    for (const file of files) {
      // Check file type
      if (file.type !== 'application/pdf') {
        errors.push(`${file.name}: Invalid file type (must be PDF)`)
      }

      // Check file size (max 50MB per file)
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 50MB)`)
      }

      // Check for empty files
      if (file.size === 0) {
        errors.push(`${file.name}: File is empty`)
      }
    }

    // Check total batch size (max 500MB)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > 500 * 1024 * 1024) {
      errors.push('Total batch size exceeds 500MB limit')
    }

    // Check file count limit
    if (files.length > 50) {
      errors.push('Maximum 50 files per batch')
    }

    return {
      hasErrors: errors.length > 0,
      errors
    }
  }

  const generateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const sortFilesByPriority = (files: BatchFile[], order: string): BatchFile[] => {
    switch (order) {
      case 'size-asc':
        return [...files].sort((a, b) => a.size - b.size)
      case 'size-desc':
        return [...files].sort((a, b) => b.size - a.size)
      case 'name':
        return [...files].sort((a, b) => a.name.localeCompare(b.name))
      case 'fifo':
      default:
        return files
    }
  }

  const updateJobProgress = (job: BatchProcessingJob): void => {
    const totalFiles = job.files.length
    const completedFiles = job.files.filter(f => 
      f.status === 'completed' || f.status === 'failed'
    ).length
    
    job.progress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0
  }

  const shouldRetryError = (error: any): boolean => {
    // Define which errors are retryable
    const retryableErrors = ['NetworkError', 'TimeoutError', 'RateLimitError']
    return retryableErrors.some(type => error.name?.includes(type))
  }

  const createSemaphore = (maxConcurrent: number) => {
    let current = 0
    const queue: Array<() => void> = []

    return {
      acquire: async <T>(fn: () => Promise<T>): Promise<T> => {
        return new Promise((resolve, reject) => {
          const execute = async () => {
            current++
            try {
              const result = await fn()
              resolve(result)
            } catch (error) {
              reject(error)
            } finally {
              current--
              if (queue.length > 0) {
                const next = queue.shift()!
                next()
              }
            }
          }

          if (current < maxConcurrent) {
            execute()
          } else {
            queue.push(execute)
          }
        })
      }
    }
  }

  const getCachedResult = async (fileHash: string): Promise<any> => {
    try {
      return await securityManager.secureGetItem(`cache_${fileHash}`)
    } catch {
      return null
    }
  }

  const cacheResult = async (fileHash: string, result: any): Promise<void> => {
    try {
      await securityManager.secureSetItem(`cache_${fileHash}`, {
        ...result,
        cachedAt: Date.now()
      })
    } catch (error) {
      console.warn('Failed to cache result:', error)
    }
  }

  const generateJobId = (): string => {
    return 'batch_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }

  // Job management functions
  const pauseQueue = (): void => {
    batchQueue.isPaused = true
    performanceMonitoring.trackUserInteraction('batch_queue_paused')
  }

  const resumeQueue = (): void => {
    batchQueue.isPaused = false
    performanceMonitoring.trackUserInteraction('batch_queue_resumed')
    
    // Start processing if jobs are queued
    if (queuedJobs.value.length > 0) {
      processNextJob()
    }
  }

  const cancelJob = async (jobId: string): Promise<boolean> => {
    const job = batchQueue.jobs.find(j => j.id === jobId)
    if (!job) return false

    if (job.status === 'processing') {
      // Mark files as cancelled, but let current processing complete
      job.files.forEach(file => {
        if (file.status === 'waiting') {
          file.status = 'failed'
          file.error = 'Job cancelled by user'
        }
      })
    }

    job.status = 'cancelled'
    job.endTime = Date.now()

    performanceMonitoring.trackUserInteraction('batch_job_cancelled', { jobId })
    
    return true
  }

  const getJobDetails = (jobId: string): BatchProcessingJob | null => {
    return batchQueue.jobs.find(j => j.id === jobId) || null
  }

  const exportJobResults = async (jobId: string): Promise<string | null> => {
    const job = getJobDetails(jobId)
    if (!job) return null

    const exportData = {
      jobId: job.id,
      jobName: job.name,
      status: job.status,
      progress: job.progress,
      startTime: job.startTime,
      endTime: job.endTime,
      configuration: job.configuration,
      results: job.results,
      errors: job.errors,
      metrics: {
        totalFiles: job.files.length,
        successfulFiles: job.results.length,
        failedFiles: job.errors.length,
        averageConfidence: job.results.reduce((sum, r) => sum + r.averageConfidence, 0) / job.results.length || 0,
        totalProcessingTime: job.endTime ? job.endTime - job.startTime : 0
      }
    }

    return JSON.stringify(exportData, null, 2)
  }

  const clearCompletedJobs = (): void => {
    const completedJobIds = completedJobs.value.map(j => j.id)
    batchQueue.jobs = batchQueue.jobs.filter(j => j.status !== 'completed')
    
    // Clean up cached data for completed jobs
    completedJobIds.forEach(async jobId => {
      try {
        await securityManager.secureRemoveItem(`batch_job_${jobId}`)
        await securityManager.secureRemoveItem(`batch_results_${jobId}`)
      } catch (error) {
        console.warn(`Failed to clean up data for job ${jobId}:`, error)
      }
    })

    performanceMonitoring.trackUserInteraction('batch_jobs_cleared', { 
      count: completedJobIds.length 
    })
  }

  return {
    // State
    batchQueue: readonly(batchQueue),
    defaultConfig: readonly(defaultConfig),
    processingMetrics: readonly(processingMetrics),

    // Computed
    activeJobs,
    queuedJobs,
    completedJobs,
    canStartNewJob,
    overallProgress,

    // Job management
    createBatchJob,
    pauseQueue,
    resumeQueue,
    cancelJob,
    getJobDetails,
    exportJobResults,
    clearCompletedJobs,

    // Utilities
    validateFiles,
    generateFileHash
  }
}