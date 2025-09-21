/**
 * Diagram Detection Composable
 * Provides reactive access to diagram detection functionality
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { DiagramCoordinates, EnhancedQuestion } from '~/types/diagram'

export interface DiagramDetectionState {
  isProcessing: boolean
  progress: number
  currentPage: number
  totalPages: number
  detectedDiagrams: DiagramCoordinates[]
  questions: EnhancedQuestion[]
  errors: string[]
}

export interface DiagramDetectionConfig {
  geminiApiKey?: string
  enableAutoDetection: boolean
  confidenceThreshold: number
  maxRetries: number
  batchSize: number
}

export const useDiagramDetection = (config?: Partial<DiagramDetectionConfig>) => {
  // Reactive state
  const state = ref<DiagramDetectionState>({
    isProcessing: false,
    progress: 0,
    currentPage: 0,
    totalPages: 0,
    detectedDiagrams: [],
    questions: [],
    errors: []
  })

  const defaultConfig: DiagramDetectionConfig = {
    enableAutoDetection: true,
    confidenceThreshold: 0.7,
    maxRetries: 3,
    batchSize: 5,
    ...config
  }

  // Computed properties
  const hasErrors = computed(() => state.value.errors.length > 0)
  const isComplete = computed(() => 
    !state.value.isProcessing && state.value.progress === 100
  )
  const diagramCount = computed(() => state.value.detectedDiagrams.length)
  const questionCount = computed(() => state.value.questions.length)

  // Methods
  const processPDF = async (file: File): Promise<EnhancedQuestion[]> => {
    try {
      state.value.isProcessing = true
      state.value.progress = 0
      state.value.errors = []

      // Import PDF processor dynamically
      const { AdvancedPDFProcessor } = await import('~/utils/enhancedPdfProcessingPipeline')
      const processor = new AdvancedPDFProcessor()

      // Process with progress tracking
      const questions = await processor.processWithDiagramDetection(file, {
        onProgress: (progress: number, currentPage: number, totalPages: number) => {
          state.value.progress = progress
          state.value.currentPage = currentPage
          state.value.totalPages = totalPages
        },
        confidenceThreshold: defaultConfig.confidenceThreshold,
        maxRetries: defaultConfig.maxRetries,
        batchSize: defaultConfig.batchSize
      })

      state.value.questions = questions
      state.value.detectedDiagrams = questions.flatMap(q => q.diagrams)
      state.value.progress = 100

      return questions
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      state.value.errors.push(errorMessage)
      throw error
    } finally {
      state.value.isProcessing = false
    }
  }

  const retryProcessing = async (file: File): Promise<EnhancedQuestion[]> => {
    state.value.errors = []
    return processPDF(file)
  }

  const updateDiagramCoordinates = async (
    questionId: string, 
    diagramId: string, 
    coordinates: DiagramCoordinates
  ): Promise<void> => {
    try {
      // Import database utilities
      const { RankifyDatabase } = await import('~/utils/database/coordinateStorage')
      const db = new RankifyDatabase()

      // Update coordinates in database
      await db.diagramCoordinates.update(questionId, {
        diagrams: state.value.questions
          .find(q => q.id === questionId)
          ?.diagrams.map(d => d.id === diagramId ? coordinates : d) || []
      })

      // Update local state
      const questionIndex = state.value.questions.findIndex(q => q.id === questionId)
      if (questionIndex !== -1) {
        const diagramIndex = state.value.questions[questionIndex].diagrams
          .findIndex(d => d.id === diagramId)
        if (diagramIndex !== -1) {
          state.value.questions[questionIndex].diagrams[diagramIndex] = coordinates
        }
      }

      // Update detected diagrams array
      const detectedIndex = state.value.detectedDiagrams.findIndex(d => d.id === diagramId)
      if (detectedIndex !== -1) {
        state.value.detectedDiagrams[detectedIndex] = coordinates
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update coordinates'
      state.value.errors.push(errorMessage)
      throw error
    }
  }

  const deleteDiagram = async (questionId: string, diagramId: string): Promise<void> => {
    try {
      // Import database utilities
      const { RankifyDatabase } = await import('~/utils/database/coordinateStorage')
      const db = new RankifyDatabase()

      // Remove diagram from database
      const question = state.value.questions.find(q => q.id === questionId)
      if (question) {
        const updatedDiagrams = question.diagrams.filter(d => d.id !== diagramId)
        await db.diagramCoordinates.update(questionId, {
          diagrams: updatedDiagrams
        })

        // Update local state
        const questionIndex = state.value.questions.findIndex(q => q.id === questionId)
        if (questionIndex !== -1) {
          state.value.questions[questionIndex].diagrams = updatedDiagrams
          state.value.questions[questionIndex].hasDiagram = updatedDiagrams.length > 0
        }
      }

      // Remove from detected diagrams array
      state.value.detectedDiagrams = state.value.detectedDiagrams
        .filter(d => d.id !== diagramId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete diagram'
      state.value.errors.push(errorMessage)
      throw error
    }
  }

  const exportData = async (): Promise<Blob> => {
    try {
      const exportData = {
        questions: state.value.questions,
        diagrams: state.value.detectedDiagrams,
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          totalQuestions: state.value.questions.length,
          totalDiagrams: state.value.detectedDiagrams.length
        }
      }

      const jsonString = JSON.stringify(exportData, null, 2)
      return new Blob([jsonString], { type: 'application/json' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export data'
      state.value.errors.push(errorMessage)
      throw error
    }
  }

  const importData = async (file: File): Promise<void> => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid import file format')
      }

      state.value.questions = data.questions
      state.value.detectedDiagrams = data.diagrams || []
      state.value.errors = []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import data'
      state.value.errors.push(errorMessage)
      throw error
    }
  }

  const clearErrors = (): void => {
    state.value.errors = []
  }

  const reset = (): void => {
    state.value.isProcessing = false
    state.value.progress = 0
    state.value.currentPage = 0
    state.value.totalPages = 0
    state.value.detectedDiagrams = []
    state.value.questions = []
    state.value.errors = []
  }

  // Lifecycle hooks
  onMounted(() => {
    // Initialize any required resources
  })

  onUnmounted(() => {
    // Cleanup resources
    reset()
  })

  return {
    // State
    state: readonly(state),
    
    // Computed
    hasErrors,
    isComplete,
    diagramCount,
    questionCount,
    
    // Methods
    processPDF,
    retryProcessing,
    updateDiagramCoordinates,
    deleteDiagram,
    exportData,
    importData,
    clearErrors,
    reset,
    
    // Config
    config: defaultConfig
  }
}