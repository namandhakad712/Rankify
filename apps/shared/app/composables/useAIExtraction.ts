/**
 * Composable for AI Extraction functionality
 * Manages state and operations for AI-powered PDF question extraction
 */

import { ref, computed, reactive } from 'vue'
import AIExtractionEngine, { aiExtractionUtils, type AIExtractionProgress } from '#layers/shared/app/utils/aiExtractionUtils'
import { confidenceUtils } from '#layers/shared/app/utils/confidenceScoringUtils'
import type { AIExtractionResult, AIExtractedQuestion } from '#layers/shared/app/utils/geminiAPIClient'
import type { AIGeneratedTestData } from '#layers/shared/app/utils/aiStorageUtils'

export interface AIExtractionConfig {
  apiKey: string
  model: 'gemini-1.5-flash' | 'gemini-1.5-pro'
  confidenceThreshold: number
  enableDiagramDetection: boolean
  enableCache: boolean
  maxFileSizeMB: number
}

export interface AIExtractionState {
  isProcessing: boolean
  progress: AIExtractionProgress | null
  result: AIExtractionResult | null
  error: string | null
  selectedFile: File | null
  stats: any | null
}

export function useAIExtraction() {
  // Reactive state
  const state = reactive<AIExtractionState>({
    isProcessing: false,
    progress: null,
    result: null,
    error: null,
    selectedFile: null,
    stats: null
  })

  const config = ref<AIExtractionConfig>({
    apiKey: '',
    model: 'gemini-1.5-flash',
    confidenceThreshold: 2.5,
    enableDiagramDetection: true,
    enableCache: true,
    maxFileSizeMB: 10
  })

  // Computed properties
  const isConfigValid = computed(() => {
    return aiExtractionUtils.validateApiKey(config.value.apiKey)
  })

  const canStartExtraction = computed(() => {
    return isConfigValid.value && state.selectedFile && !state.isProcessing
  })

  const extractionSummary = computed(() => {
    if (!state.result) return null

    const questions = state.result.questions
    const total = questions.length
    
    return {
      totalQuestions: total,
      highConfidence: questions.filter(q => q.confidence >= 4).length,
      mediumConfidence: questions.filter(q => q.confidence >= 2.5 && q.confidence < 4).length,
      lowConfidence: questions.filter(q => q.confidence < 2.5).length,
      diagramQuestions: questions.filter(q => q.hasDiagram).length,
      needsReview: questions.filter(q => confidenceUtils.requiresManualReview(q)).length,
      overallConfidence: state.result.confidence,
      processingTime: state.result.processingTime
    }
  })

  const confidenceDistribution = computed(() => {
    if (!state.result) return []
    
    const questions = state.result.questions
    const total = questions.length
    
    const levels = [
      { range: '4.5-5.0', min: 4.5, max: 5.0, color: 'bg-green-500', label: 'Excellent' },
      { range: '3.5-4.4', min: 3.5, max: 4.4, color: 'bg-blue-500', label: 'Good' },
      { range: '2.5-3.4', min: 2.5, max: 3.4, color: 'bg-yellow-500', label: 'Fair' },
      { range: '1.5-2.4', min: 1.5, max: 2.4, color: 'bg-orange-500', label: 'Poor' },
      { range: '1.0-1.4', min: 1.0, max: 1.4, color: 'bg-red-500', label: 'Very Poor' }
    ]
    
    return levels.map(level => {
      const count = questions.filter(q => q.confidence >= level.min && q.confidence <= level.max).length
      const percentage = total > 0 ? (count / total) * 100 : 0
      return { ...level, count, percentage }
    })
  })

  const questionsByType = computed(() => {
    if (!state.result) return {}
    
    const questions = state.result.questions
    const types = ['MCQ', 'MSQ', 'NAT', 'MSM', 'Diagram']
    
    return types.reduce((acc, type) => {
      acc[type] = questions.filter(q => q.type === type).length
      return acc
    }, {} as Record<string, number>)
  })

  // Methods
  const setFile = (file: File | null) => {
    state.selectedFile = file
    state.result = null
    state.error = null
    state.progress = null
  }

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Please select a PDF file' }
    }

    // Check file size
    const maxSize = config.value.maxFileSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      return { valid: false, error: `File size must be less than ${config.value.maxFileSizeMB}MB` }
    }

    // Check if file is empty
    if (file.size === 0) {
      return { valid: false, error: 'File appears to be empty' }
    }

    return { valid: true }
  }

  const startExtraction = async (): Promise<boolean> => {
    if (!canStartExtraction.value) {
      throw new Error('Cannot start extraction: invalid configuration or no file selected')
    }

    // Validate file
    const validation = validateFile(state.selectedFile!)
    if (!validation.valid) {
      state.error = validation.error!
      return false
    }

    state.isProcessing = true
    state.error = null
    state.progress = null

    try {
      const engine = aiExtractionUtils.createEngine(config.value.apiKey, {
        geminiModel: config.value.model,
        confidenceThreshold: config.value.confidenceThreshold,
        enableDiagramDetection: config.value.enableDiagramDetection,
        maxFileSizeMB: config.value.maxFileSizeMB
      })

      const result = await engine.extractFromPDF(
        state.selectedFile!,
        state.selectedFile!.name,
        {
          enableCache: config.value.enableCache,
          onProgress: (progress) => {
            state.progress = progress
          }
        }
      )

      state.result = result
      
      // Update stats
      await loadStats()
      
      return true

    } catch (error: any) {
      state.error = error.message || 'An unknown error occurred during extraction'
      console.error('AI extraction failed:', error)
      return false
    } finally {
      state.isProcessing = false
    }
  }

  const retryExtraction = async (): Promise<boolean> => {
    state.error = null
    return startExtraction()
  }

  const clearError = () => {
    state.error = null
  }

  const clearResults = () => {
    state.result = null
    state.progress = null
    state.error = null
  }

  const loadStats = async () => {
    try {
      if (isConfigValid.value) {
        const engine = aiExtractionUtils.createEngine(config.value.apiKey)
        state.stats = await engine.getExtractionStats()
      }
    } catch (error) {
      console.warn('Failed to load extraction stats:', error)
    }
  }

  const exportResults = (format: 'json' | 'csv' = 'json'): string | null => {
    if (!state.result) return null

    if (format === 'json') {
      return aiExtractionUtils.exportToJSON(state.result)
    }

    // CSV export
    if (format === 'csv') {
      const headers = ['ID', 'Text', 'Type', 'Subject', 'Section', 'Question Number', 'Confidence', 'Has Diagram', 'Options Count']
      const rows = state.result.questions.map(q => [
        q.id,
        `"${q.text.replace(/"/g, '""')}"`, // Escape quotes
        q.type,
        q.subject,
        q.section,
        q.questionNumber,
        q.confidence,
        q.hasDiagram,
        q.options.length
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return null
  }

  const downloadResults = (format: 'json' | 'csv' = 'json') => {
    const content = exportResults(format)
    if (!content || !state.selectedFile) return

    const mimeType = format === 'json' ? 'application/json' : 'text/csv'
    const extension = format === 'json' ? 'json' : 'csv'
    
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-extraction-${state.selectedFile.name.replace('.pdf', '')}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getQuestionsByConfidence = (minConfidence: number = 0, maxConfidence: number = 5): AIExtractedQuestion[] => {
    if (!state.result) return []
    
    return state.result.questions.filter(q => 
      q.confidence >= minConfidence && q.confidence <= maxConfidence
    )
  }

  const getQuestionsByType = (type: string): AIExtractedQuestion[] => {
    if (!state.result) return []
    
    return state.result.questions.filter(q => q.type === type)
  }

  const getDiagramQuestions = (): AIExtractedQuestion[] => {
    if (!state.result) return []
    
    return state.result.questions.filter(q => q.hasDiagram)
  }

  const getQuestionsNeedingReview = (): AIExtractedQuestion[] => {
    if (!state.result) return []
    
    return state.result.questions.filter(q => confidenceUtils.requiresManualReview(q))
  }

  const updateQuestionConfidence = (questionId: number, newConfidence: number) => {
    if (!state.result) return

    const question = state.result.questions.find(q => q.id === questionId)
    if (question) {
      question.confidence = Math.max(1, Math.min(5, newConfidence))
      
      // Recalculate overall confidence
      const totalConfidence = state.result.questions.reduce((sum, q) => sum + q.confidence, 0)
      state.result.confidence = Math.round(totalConfidence / state.result.questions.length)
    }
  }

  const removeQuestion = (questionId: number) => {
    if (!state.result) return

    const index = state.result.questions.findIndex(q => q.id === questionId)
    if (index !== -1) {
      state.result.questions.splice(index, 1)
      
      // Recalculate overall confidence if questions remain
      if (state.result.questions.length > 0) {
        const totalConfidence = state.result.questions.reduce((sum, q) => sum + q.confidence, 0)
        state.result.confidence = Math.round(totalConfidence / state.result.questions.length)
      } else {
        state.result.confidence = 0
      }
    }
  }

  const addQuestion = (question: Omit<AIExtractedQuestion, 'id'>) => {
    if (!state.result) return

    const newId = Math.max(...state.result.questions.map(q => q.id), 0) + 1
    const newQuestion: AIExtractedQuestion = {
      ...question,
      id: newId
    }

    state.result.questions.push(newQuestion)
    
    // Recalculate overall confidence
    const totalConfidence = state.result.questions.reduce((sum, q) => sum + q.confidence, 0)
    state.result.confidence = Math.round(totalConfidence / state.result.questions.length)
  }

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getConfidenceDescription = (score: number): string => {
    return confidenceUtils.getConfidenceDescription(score)
  }

  const getConfidenceColor = (score: number): string => {
    return confidenceUtils.getConfidenceColor(score)
  }

  const requiresManualReview = (question: AIExtractedQuestion): boolean => {
    return confidenceUtils.requiresManualReview(question)
  }

  // Return the composable interface
  return {
    // State
    state: readonly(state),
    config,
    
    // Computed
    isConfigValid,
    canStartExtraction,
    extractionSummary,
    confidenceDistribution,
    questionsByType,
    
    // Methods
    setFile,
    validateFile,
    startExtraction,
    retryExtraction,
    clearError,
    clearResults,
    loadStats,
    exportResults,
    downloadResults,
    
    // Question management
    getQuestionsByConfidence,
    getQuestionsByType,
    getDiagramQuestions,
    getQuestionsNeedingReview,
    updateQuestionConfidence,
    removeQuestion,
    addQuestion,
    
    // Utilities
    formatFileSize,
    getConfidenceDescription,
    getConfidenceColor,
    requiresManualReview
  }
}