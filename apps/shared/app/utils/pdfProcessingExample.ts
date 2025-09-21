/**
 * PDF Processing Example
 * 
 * This file demonstrates how to use the enhanced PDF processing pipeline
 * with diagram detection in the Rankify application.
 */

import type { 
  EnhancedQuestion,
  ProcessingStats,
  DiagramDetectionError
} from '~/shared/types/diagram-detection'
import { 
  PDFProcessingIntegration, 
  createPDFProcessingIntegration,
  estimateProcessingTime,
  isGeminiConfigured
} from './pdfProcessingIntegration'

/**
 * Example: Process a single PDF file with diagram detection
 */
export async function processPDFWithDiagrams(
  pdfFile: File,
  geminiApiKey: string,
  onProgress?: (progress: { percentage: number; currentStep: string }) => void
): Promise<{
  success: boolean
  questions: EnhancedQuestion[]
  stats: ProcessingStats
  errors: DiagramDetectionError[]
}> {
  // Validate inputs
  if (!isGeminiConfigured(geminiApiKey)) {
    throw new Error('Gemini API key is required for diagram detection')
  }

  // Create processing integration
  const integration = createPDFProcessingIntegration({
    geminiApiKey,
    enableDiagramDetection: true,
    enableProgressTracking: true,
    enableErrorRecovery: true,
    batchSize: 3,
    qualityThreshold: 0.7,
    maxFileSize: 50
  })

  try {
    // Validate PDF file
    const validation = integration.validatePDFFile(pdfFile)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Estimate processing time
    const estimatedTime = estimateProcessingTime(pdfFile, true)
    console.log(`Estimated processing time: ${(estimatedTime / 1000).toFixed(1)} seconds`)

    // Process the PDF
    const result = await integration.processPDFFile(pdfFile, {
      onProgress,
      enableManualReview: true
    })

    return {
      success: result.success,
      questions: result.questions,
      stats: result.processingStats,
      errors: result.errors
    }
  } finally {
    // Clean up resources
    await integration.cleanup()
  }
}

/**
 * Example: Process multiple PDF files in batch
 */
export async function processPDFBatch(
  pdfFiles: File[],
  geminiApiKey: string,
  onProgress?: (sessionId: string, progress: any) => void
): Promise<{
  sessionId: string
  allQuestions: EnhancedQuestion[]
  totalStats: ProcessingStats
  allErrors: DiagramDetectionError[]
  summary: any
}> {
  // Create processing integration
  const integration = createPDFProcessingIntegration({
    geminiApiKey,
    enableDiagramDetection: true,
    enableProgressTracking: true,
    enableErrorRecovery: true,
    batchSize: 2, // Process 2 files at a time
    qualityThreshold: 0.7,
    maxFileSize: 50
  })

  try {
    // Validate all files first
    for (const file of pdfFiles) {
      const validation = integration.validatePDFFile(file)
      if (!validation.valid) {
        throw new Error(`Invalid file ${file.name}: ${validation.error}`)
      }
    }

    // Process batch
    const batchResult = await integration.processPDFBatch(pdfFiles, {
      onProgress,
      enableManualReview: true
    })

    // Aggregate results
    const allQuestions = batchResult.results.flatMap(result => result.questions)
    const allErrors = batchResult.results.flatMap(result => result.errors)
    
    const totalStats: ProcessingStats = {
      totalQuestions: allQuestions.length,
      questionsWithDiagrams: allQuestions.filter(q => q.hasDiagram).length,
      averageConfidence: allQuestions.length > 0 ? 
        allQuestions.reduce((sum, q) => sum + q.confidence, 0) / allQuestions.length : 0,
      processingTime: batchResult.results.reduce((sum, r) => sum + r.processingStats.processingTime, 0),
      apiCalls: batchResult.results.reduce((sum, r) => sum + r.processingStats.apiCalls, 0),
      errors: allErrors.length
    }

    return {
      sessionId: batchResult.sessionId,
      allQuestions,
      totalStats,
      allErrors,
      summary: batchResult.summary
    }
  } finally {
    // Clean up resources
    await integration.cleanup()
  }
}

/**
 * Example: Resume processing from a previous session
 */
export async function resumePDFProcessing(
  sessionId: string,
  geminiApiKey: string
): Promise<{
  success: boolean
  questions: EnhancedQuestion[]
  stats: ProcessingStats
} | null> {
  const integration = createPDFProcessingIntegration({
    geminiApiKey,
    enableDiagramDetection: true,
    enableProgressTracking: true,
    enableErrorRecovery: true
  })

  try {
    const result = await integration.resumeProcessing(sessionId)
    
    if (!result) {
      return null
    }

    return {
      success: result.success,
      questions: result.questions,
      stats: result.processingStats
    }
  } finally {
    await integration.cleanup()
  }
}

/**
 * Example: Process PDF with custom configuration
 */
export async function processPDFWithCustomConfig(
  pdfFile: File,
  config: {
    geminiApiKey: string
    enableDiagramDetection?: boolean
    qualityThreshold?: number
    maxFileSize?: number
    batchSize?: number
  },
  callbacks?: {
    onProgress?: (progress: { percentage: number; currentStep: string }) => void
    onError?: (error: DiagramDetectionError) => void
    onWarning?: (warning: string) => void
  }
): Promise<EnhancedQuestion[]> {
  const integration = createPDFProcessingIntegration({
    enableDiagramDetection: true,
    enableProgressTracking: true,
    enableErrorRecovery: true,
    batchSize: 3,
    qualityThreshold: 0.7,
    maxFileSize: 50,
    ...config
  })

  try {
    const result = await integration.processPDFFile(pdfFile, {
      onProgress: callbacks?.onProgress,
      enableManualReview: true
    })

    // Handle errors and warnings
    if (callbacks?.onError) {
      result.errors.forEach(callbacks.onError)
    }
    
    if (callbacks?.onWarning) {
      result.warnings.forEach(callbacks.onWarning)
    }

    return result.questions
  } finally {
    await integration.cleanup()
  }
}

/**
 * Example: Check processing status
 */
export function checkProcessingStatus(
  sessionId: string,
  geminiApiKey: string
): {
  status: string
  progress: number
  currentStep: string
  completedFiles: number
  totalFiles: number
} | null {
  const integration = createPDFProcessingIntegration({
    geminiApiKey,
    enableDiagramDetection: true
  })

  const session = integration.getSessionStatus(sessionId)
  
  if (!session) {
    return null
  }

  return {
    status: session.status,
    progress: session.progress.percentage,
    currentStep: session.progress.currentStep,
    completedFiles: session.files.filter(f => f.status === 'completed').length,
    totalFiles: session.files.length
  }
}

/**
 * Example: Cancel processing session
 */
export async function cancelPDFProcessing(
  sessionId: string,
  geminiApiKey: string
): Promise<boolean> {
  const integration = createPDFProcessingIntegration({
    geminiApiKey,
    enableDiagramDetection: true
  })

  try {
    return await integration.cancelSession(sessionId)
  } finally {
    await integration.cleanup()
  }
}

/**
 * Utility: Get processing recommendations based on file characteristics
 */
export function getProcessingRecommendations(pdfFile: File): {
  recommendedBatchSize: number
  estimatedTime: number
  memoryUsage: 'low' | 'medium' | 'high'
  suggestions: string[]
} {
  const fileSizeMB = pdfFile.size / (1024 * 1024)
  const suggestions: string[] = []
  
  let recommendedBatchSize = 3
  let memoryUsage: 'low' | 'medium' | 'high' = 'low'
  
  if (fileSizeMB > 20) {
    recommendedBatchSize = 1
    memoryUsage = 'high'
    suggestions.push('Large file detected. Processing will be slower but more reliable.')
    suggestions.push('Consider splitting the PDF into smaller files for faster processing.')
  } else if (fileSizeMB > 10) {
    recommendedBatchSize = 2
    memoryUsage = 'medium'
    suggestions.push('Medium-sized file. Processing should complete in reasonable time.')
  } else {
    suggestions.push('Small file. Processing should be fast and efficient.')
  }

  const estimatedTime = estimateProcessingTime(pdfFile, true)

  return {
    recommendedBatchSize,
    estimatedTime,
    memoryUsage,
    suggestions
  }
}

export default {
  processPDFWithDiagrams,
  processPDFBatch,
  resumePDFProcessing,
  processPDFWithCustomConfig,
  checkProcessingStatus,
  cancelPDFProcessing,
  getProcessingRecommendations
}