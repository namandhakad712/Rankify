/**
 * Diagram Detection Composable
 * Provides reactive access to diagram detection functionality
 */

import { ref, computed } from 'vue'

export interface DiagramCoordinates {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
  type: 'graph' | 'flowchart' | 'scientific' | 'geometric' | 'table' | 'circuit' | 'other'
  description: string
}

export interface EnhancedQuestion {
  id: string
  text: string
  type: 'MCQ' | 'MSQ' | 'NAT' | 'Diagram'
  options?: string[]
  hasDiagram: boolean
  diagrams: DiagramCoordinates[]
  pageNumber: number
  confidence: number
}

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

      console.log('🚀 Starting REAL PDF processing:', file.name)

      // Step 1: Load PDF.js
      state.value.progress = 10
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

      // Step 2: Load PDF document
      state.value.progress = 20
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      state.value.totalPages = pdf.numPages
      console.log(`📄 PDF loaded: ${pdf.numPages} pages`)

      const allQuestions: EnhancedQuestion[] = []
      const allDiagrams: DiagramCoordinates[] = []

      // Step 3: Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        state.value.currentPage = pageNum
        state.value.progress = 20 + (pageNum / pdf.numPages) * 60

        console.log(`🔍 Processing page ${pageNum}/${pdf.numPages}`)

        // Get page
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2.0 })

        // Create canvas for page rendering
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        canvas.height = viewport.height
        canvas.width = viewport.width

        // Render page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise

        // Convert canvas to base64 image
        const imageDataUrl = canvas.toDataURL('image/png')
        const base64Image = imageDataUrl.split(',')[1]

        // Extract text content
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')

        console.log(`📝 Page ${pageNum} text extracted: ${pageText.substring(0, 100)}...`)

        // Step 4: Call Gemini API for diagram detection
        const geminiApiKey = useRuntimeConfig().public.geminiApiKey || 
                           localStorage.getItem('gemini-api-key') ||
                           defaultConfig.geminiApiKey

        if (!geminiApiKey) {
          throw new Error('Gemini API key is required. Please configure it in settings.')
        }

        try {
          const geminiResponse = await callGeminiAPI(base64Image, pageText, geminiApiKey)
          
          // Process Gemini response
          if (geminiResponse.questions && geminiResponse.questions.length > 0) {
            geminiResponse.questions.forEach((q: any, index: number) => {
              const question: EnhancedQuestion = {
                id: `page-${pageNum}-q-${index + 1}`,
                text: q.text || 'Question text not detected',
                type: q.type || 'MCQ',
                options: q.options || [],
                hasDiagram: q.diagrams && q.diagrams.length > 0,
                diagrams: q.diagrams?.map((d: any, dIndex: number) => ({
                  id: `page-${pageNum}-diagram-${dIndex + 1}`,
                  x1: Math.max(0, d.coordinates?.x1 || 0),
                  y1: Math.max(0, d.coordinates?.y1 || 0),
                  x2: Math.min(viewport.width, d.coordinates?.x2 || 100),
                  y2: Math.min(viewport.height, d.coordinates?.y2 || 100),
                  confidence: d.confidence || 0.5,
                  type: d.type || 'other',
                  description: d.description || 'Diagram detected'
                })) || [],
                pageNumber: pageNum,
                confidence: q.confidence || 0.5
              }
              
              allQuestions.push(question)
              if (question.diagrams) {
                allDiagrams.push(...question.diagrams)
              }
            })
          } else {
            // Fallback: Create question from page text if no questions detected
            if (pageText.trim().length > 50) {
              const fallbackQuestion: EnhancedQuestion = {
                id: `page-${pageNum}-fallback`,
                text: pageText.substring(0, 200) + (pageText.length > 200 ? '...' : ''),
                type: 'MCQ',
                options: [],
                hasDiagram: false,
                diagrams: [],
                pageNumber: pageNum,
                confidence: 0.3
              }
              allQuestions.push(fallbackQuestion)
            }
          }

        } catch (apiError) {
          console.error(`❌ Gemini API error for page ${pageNum}:`, apiError)
          state.value.errors.push(`Page ${pageNum}: ${apiError instanceof Error ? apiError.message : 'API call failed'}`)
          
          // Fallback processing without AI
          if (pageText.trim().length > 20) {
            const fallbackQuestion: EnhancedQuestion = {
              id: `page-${pageNum}-fallback`,
              text: pageText.substring(0, 200) + (pageText.length > 200 ? '...' : ''),
              type: 'MCQ',
              options: [],
              hasDiagram: false,
              diagrams: [],
              pageNumber: pageNum,
              confidence: 0.2
            }
            allQuestions.push(fallbackQuestion)
          }
        }

        // Clean up canvas
        canvas.remove()
      }

      // Step 5: Final processing
      state.value.progress = 90
      state.value.questions = allQuestions
      state.value.detectedDiagrams = allDiagrams
      state.value.progress = 100

      console.log(`✅ Processing complete: ${allQuestions.length} questions, ${allDiagrams.length} diagrams`)
      
      return allQuestions

    } catch (error) {
      console.error('❌ PDF processing failed:', error)
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
      // Remove diagram from question
      const question = state.value.questions.find(q => q.id === questionId)
      if (question) {
        const updatedDiagrams = question.diagrams.filter(d => d.id !== diagramId)
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