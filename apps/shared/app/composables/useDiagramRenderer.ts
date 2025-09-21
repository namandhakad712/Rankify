/**
 * Diagram Renderer Composable
 * 
 * Provides reactive diagram rendering functionality for Vue components.
 */

import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import type { 
  DiagramCoordinates, 
  ImageDimensions 
} from '~/shared/types/diagram-detection'
import { 
  DiagramRenderer,
  BatchDiagramRenderer,
  createDiagramRenderer,
  createBatchDiagramRenderer,
  type DiagramRenderOptions,
  type RenderedDiagram,
  type RenderingStats
} from '~/app/utils/diagramRenderer'

export interface UseDiagramRendererOptions {
  enableCaching?: boolean
  maxCacheSize?: number
  batchRendering?: boolean
  defaultRenderOptions?: DiagramRenderOptions
  autoRender?: boolean
  responsive?: boolean
}

export interface DiagramRendererState {
  renderer: Ref<DiagramRenderer | BatchDiagramRenderer | null>
  renderedDiagrams: Ref<RenderedDiagram[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  stats: Ref<RenderingStats | null>
}

export interface DiagramRendererActions {
  initializeRenderer: () => Promise<void>
  renderSingle: (
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    options?: DiagramRenderOptions
  ) => Promise<RenderedDiagram>
  renderMultiple: (
    pageImage: HTMLImageElement | string,
    diagramsData: Array<{ id: string; coordinates: DiagramCoordinates }>,
    options?: DiagramRenderOptions
  ) => Promise<RenderedDiagram[]>
  renderResponsive: (
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    containerWidth: number,
    containerHeight: number,
    options?: DiagramRenderOptions
  ) => Promise<RenderedDiagram>
  createOverlay: (
    coordinates: DiagramCoordinates,
    containerDimensions: ImageDimensions
  ) => HTMLDivElement
  clearCache: () => void
  resetStats: () => void
  updateStats: () => void
}

export function useDiagramRenderer(
  options: UseDiagramRendererOptions = {}
) {
  // Configuration
  const config = {
    enableCaching: true,
    maxCacheSize: 100,
    batchRendering: false,
    autoRender: true,
    responsive: true,
    defaultRenderOptions: {
      quality: 0.9,
      format: 'png' as const,
      maintainAspectRatio: true,
      enableSmoothing: true
    },
    ...options
  }

  // Reactive state
  const renderer = ref<DiagramRenderer | BatchDiagramRenderer | null>(null)
  const renderedDiagrams = ref<RenderedDiagram[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const stats = ref<RenderingStats | null>(null)

  // Computed properties
  const hasRenderer = computed(() => renderer.value !== null)
  const hasRenderedDiagrams = computed(() => renderedDiagrams.value.length > 0)
  const isReady = computed(() => hasRenderer.value && !isLoading.value)

  // Initialize renderer
  async function initializeRenderer() {
    try {
      if (config.batchRendering) {
        renderer.value = createBatchDiagramRenderer(
          config.enableCaching,
          config.maxCacheSize
        )
      } else {
        renderer.value = createDiagramRenderer(
          config.enableCaching,
          config.maxCacheSize
        )
      }
      
      updateStats()
    } catch (err) {
      error.value = `Failed to initialize renderer: ${err.message}`
      throw err
    }
  }

  // Render single diagram
  async function renderSingle(
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    options: DiagramRenderOptions = {}
  ): Promise<RenderedDiagram> {
    if (!renderer.value) {
      await initializeRenderer()
    }

    isLoading.value = true
    error.value = null

    try {
      const renderOptions = { ...config.defaultRenderOptions, ...options }
      const result = await renderer.value!.renderDiagram(pageImage, coordinates, renderOptions)
      
      // Update rendered diagrams array
      const existingIndex = renderedDiagrams.value.findIndex(d => d.id === result.id)
      if (existingIndex >= 0) {
        renderedDiagrams.value[existingIndex] = result
      } else {
        renderedDiagrams.value.push(result)
      }

      updateStats()
      return result
    } catch (err) {
      error.value = `Failed to render diagram: ${err.message}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Render multiple diagrams
  async function renderMultiple(
    pageImage: HTMLImageElement | string,
    diagramsData: Array<{ id: string; coordinates: DiagramCoordinates }>,
    options: DiagramRenderOptions = {}
  ): Promise<RenderedDiagram[]> {
    if (!renderer.value) {
      await initializeRenderer()
    }

    isLoading.value = true
    error.value = null

    try {
      const renderOptions = { ...config.defaultRenderOptions, ...options }
      const results = await renderer.value!.renderMultipleDiagrams(
        pageImage,
        diagramsData,
        renderOptions
      )

      // Update rendered diagrams array
      renderedDiagrams.value = results

      updateStats()
      return results
    } catch (err) {
      error.value = `Failed to render multiple diagrams: ${err.message}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Render responsive diagram
  async function renderResponsive(
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    containerWidth: number,
    containerHeight: number,
    options: DiagramRenderOptions = {}
  ): Promise<RenderedDiagram> {
    if (!renderer.value) {
      await initializeRenderer()
    }

    if (!(renderer.value instanceof DiagramRenderer)) {
      throw new Error('Responsive rendering requires DiagramRenderer, not BatchDiagramRenderer')
    }

    isLoading.value = true
    error.value = null

    try {
      const renderOptions = { ...config.defaultRenderOptions, ...options }
      const result = await renderer.value.createResponsiveDiagram(
        pageImage,
        coordinates,
        containerWidth,
        containerHeight,
        renderOptions
      )

      // Update rendered diagrams array
      const existingIndex = renderedDiagrams.value.findIndex(d => d.id === result.id)
      if (existingIndex >= 0) {
        renderedDiagrams.value[existingIndex] = result
      } else {
        renderedDiagrams.value.push(result)
      }

      updateStats()
      return result
    } catch (err) {
      error.value = `Failed to render responsive diagram: ${err.message}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Create overlay element
  function createOverlay(
    coordinates: DiagramCoordinates,
    containerDimensions: ImageDimensions
  ): HTMLDivElement {
    if (!renderer.value) {
      throw new Error('Renderer not initialized')
    }

    return renderer.value.createOverlay(coordinates, containerDimensions)
  }

  // Clear cache
  function clearCache() {
    if (renderer.value) {
      renderer.value.clearCache()
      updateStats()
    }
  }

  // Reset statistics
  function resetStats() {
    if (renderer.value) {
      renderer.value.resetStats()
      updateStats()
    }
  }

  // Update statistics
  function updateStats() {
    if (renderer.value) {
      stats.value = renderer.value.getStats()
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    clearCache()
  })

  // Return state and actions
  const state: DiagramRendererState = {
    renderer,
    renderedDiagrams,
    isLoading,
    error,
    stats
  }

  const actions: DiagramRendererActions = {
    initializeRenderer,
    renderSingle,
    renderMultiple,
    renderResponsive,
    createOverlay,
    clearCache,
    resetStats,
    updateStats
  }

  return {
    ...state,
    ...actions,
    hasRenderer,
    hasRenderedDiagrams,
    isReady
  }
}

/**
 * Composable for managing diagram display in questions
 */
export function useQuestionDiagrams(
  questions: Ref<Array<{ id: string; diagrams: DiagramCoordinates[]; pageImage?: string }>>,
  options: UseDiagramRendererOptions = {}
) {
  const renderer = useDiagramRenderer(options)
  const questionDiagrams = ref<Map<string, RenderedDiagram[]>>(new Map())
  const currentQuestionId = ref<string | null>(null)

  // Computed properties
  const currentDiagrams = computed(() => {
    if (!currentQuestionId.value) return []
    return questionDiagrams.value.get(currentQuestionId.value) || []
  })

  const questionsWithDiagrams = computed(() => {
    return questions.value.filter(q => q.diagrams && q.diagrams.length > 0)
  })

  // Render diagrams for a specific question
  async function renderQuestionDiagrams(questionId: string) {
    const question = questions.value.find(q => q.id === questionId)
    if (!question || !question.diagrams || !question.pageImage) return

    try {
      const diagramsData = question.diagrams.map((coords, index) => ({
        id: `${questionId}_diagram_${index}`,
        coordinates: coords
      }))

      const results = await renderer.renderMultiple(
        question.pageImage,
        diagramsData
      )

      questionDiagrams.value.set(questionId, results)
      return results
    } catch (error) {
      console.error(`Failed to render diagrams for question ${questionId}:`, error)
      return []
    }
  }

  // Render diagrams for all questions
  async function renderAllQuestionDiagrams() {
    const renderPromises = questionsWithDiagrams.value.map(question =>
      renderQuestionDiagrams(question.id)
    )

    await Promise.allSettled(renderPromises)
  }

  // Set current question
  function setCurrentQuestion(questionId: string) {
    currentQuestionId.value = questionId
    
    // Auto-render if not already rendered
    if (!questionDiagrams.value.has(questionId)) {
      renderQuestionDiagrams(questionId)
    }
  }

  // Get diagrams for a specific question
  function getQuestionDiagrams(questionId: string): RenderedDiagram[] {
    return questionDiagrams.value.get(questionId) || []
  }

  // Clear diagrams for a specific question
  function clearQuestionDiagrams(questionId: string) {
    questionDiagrams.value.delete(questionId)
  }

  // Clear all diagrams
  function clearAllDiagrams() {
    questionDiagrams.value.clear()
  }

  // Watch for questions changes
  watch(questions, () => {
    // Clear diagrams for questions that no longer exist
    const questionIds = new Set(questions.value.map(q => q.id))
    for (const [id] of questionDiagrams.value) {
      if (!questionIds.has(id)) {
        questionDiagrams.value.delete(id)
      }
    }
  }, { deep: true })

  return {
    ...renderer,
    questionDiagrams,
    currentQuestionId,
    currentDiagrams,
    questionsWithDiagrams,
    renderQuestionDiagrams,
    renderAllQuestionDiagrams,
    setCurrentQuestion,
    getQuestionDiagrams,
    clearQuestionDiagrams,
    clearAllDiagrams
  }
}

/**
 * Composable for diagram performance monitoring
 */
export function useDiagramPerformance() {
  const performanceMetrics = ref<{
    renderTimes: number[]
    cacheHitRate: number
    memoryUsage: number
    averageRenderTime: number
    totalRendered: number
  }>({
    renderTimes: [],
    cacheHitRate: 0,
    memoryUsage: 0,
    averageRenderTime: 0,
    totalRendered: 0
  })

  // Track render performance
  function trackRenderPerformance(renderTime: number, cacheHit: boolean) {
    performanceMetrics.value.renderTimes.push(renderTime)
    performanceMetrics.value.totalRendered++
    
    // Keep only last 100 render times
    if (performanceMetrics.value.renderTimes.length > 100) {
      performanceMetrics.value.renderTimes.shift()
    }
    
    // Calculate average
    performanceMetrics.value.averageRenderTime = 
      performanceMetrics.value.renderTimes.reduce((sum, time) => sum + time, 0) / 
      performanceMetrics.value.renderTimes.length
    
    // Update cache hit rate (simplified)
    if (cacheHit) {
      performanceMetrics.value.cacheHitRate = 
        (performanceMetrics.value.cacheHitRate * 0.9) + (1 * 0.1)
    } else {
      performanceMetrics.value.cacheHitRate = 
        (performanceMetrics.value.cacheHitRate * 0.9) + (0 * 0.1)
    }
  }

  // Get performance recommendations
  const performanceRecommendations = computed(() => {
    const recommendations: string[] = []
    
    if (performanceMetrics.value.averageRenderTime > 1000) {
      recommendations.push('Consider reducing image quality or size for better performance')
    }
    
    if (performanceMetrics.value.cacheHitRate < 0.5) {
      recommendations.push('Enable caching to improve performance')
    }
    
    if (performanceMetrics.value.renderTimes.length > 50) {
      recommendations.push('Consider using batch rendering for multiple diagrams')
    }
    
    return recommendations
  })

  return {
    performanceMetrics,
    performanceRecommendations,
    trackRenderPerformance
  }
}

export default useDiagramRenderer