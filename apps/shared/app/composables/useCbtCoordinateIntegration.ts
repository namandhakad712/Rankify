/**
 * CBT Coordinate Integration Composable
 * Manages the integration between coordinate-based diagrams and the existing CBT interface
 */

import type { 
  CoordinateMetadata, 
  EnhancedQuestion, 
  DiagramCoordinates,
  EnhancedTestInterfaceJsonOutput 
} from '~/shared/types/diagram-detection'

export interface CBTCoordinateState {
  coordinateData: CoordinateMetadata[]
  enableCoordinateRendering: boolean
  renderingMode: 'overlay' | 'dynamic' | 'both'
  diagramQuality: 'low' | 'medium' | 'high'
  showConfidenceIndicators: boolean
  isLoading: boolean
  error: string | null
}

export interface CBTCoordinateConfig {
  autoLoadCoordinates: boolean
  fallbackToLegacy: boolean
  cacheCoordinates: boolean
  validateCoordinates: boolean
}

export function useCbtCoordinateIntegration(config: Partial<CBTCoordinateConfig> = {}) {
  // Default configuration
  const defaultConfig: CBTCoordinateConfig = {
    autoLoadCoordinates: true,
    fallbackToLegacy: true,
    cacheCoordinates: true,
    validateCoordinates: true,
    ...config
  }

  // Reactive state
  const state = reactive<CBTCoordinateState>({
    coordinateData: [],
    enableCoordinateRendering: false,
    renderingMode: 'overlay',
    diagramQuality: 'medium',
    showConfidenceIndicators: true,
    isLoading: false,
    error: null
  })

  // Database instance
  const db = useRankifyDB()

  // Error handling
  const { showError, showWarning, showSuccess } = useErrorHandling()

  /**
   * Load coordinate data for the current test
   */
  const loadCoordinateData = async (testId?: string): Promise<void> => {
    if (!defaultConfig.autoLoadCoordinates) return

    state.isLoading = true
    state.error = null

    try {
      // Get coordinate data from database
      const coordinates = await db.diagramCoordinates.getAll()
      
      if (testId) {
        // Filter coordinates for specific test
        state.coordinateData = coordinates.filter(coord => 
          coord.questionId.startsWith(testId)
        )
      } else {
        state.coordinateData = coordinates
      }

      // Validate coordinates if enabled
      if (defaultConfig.validateCoordinates) {
        await validateCoordinateData()
      }

      // Enable coordinate rendering if we have valid data
      state.enableCoordinateRendering = state.coordinateData.length > 0

      console.log(`Loaded ${state.coordinateData.length} coordinate records`)

    } catch (error) {
      console.error('Failed to load coordinate data:', error)
      state.error = 'Failed to load diagram coordinates'
      
      if (defaultConfig.fallbackToLegacy) {
        state.enableCoordinateRendering = false
        showWarning('Diagram Coordinates', 'Using legacy image display due to loading error')
      } else {
        showError('Loading Error', 'Failed to load diagram coordinates')
      }
    } finally {
      state.isLoading = false
    }
  }

  /**
   * Get coordinate data for a specific question
   */
  const getQuestionCoordinates = (questionId: string): CoordinateMetadata | undefined => {
    return state.coordinateData.find(coord => coord.questionId === questionId)
  }

  /**
   * Check if a question has coordinate-based diagrams
   */
  const hasCoordinateDiagrams = (questionId: string): boolean => {
    const coordinates = getQuestionCoordinates(questionId)
    return coordinates?.diagrams?.length > 0
  }

  /**
   * Get diagrams for a specific question
   */
  const getQuestionDiagrams = (questionId: string): DiagramCoordinates[] => {
    const coordinates = getQuestionCoordinates(questionId)
    return coordinates?.diagrams?.map(d => d.coordinates) || []
  }

  /**
   * Update coordinate data for a question
   */
  const updateQuestionCoordinates = async (
    questionId: string, 
    coordinates: Partial<CoordinateMetadata>
  ): Promise<void> => {
    try {
      await db.diagramCoordinates.update(questionId, coordinates)
      
      // Update local state
      const index = state.coordinateData.findIndex(coord => coord.questionId === questionId)
      if (index !== -1) {
        state.coordinateData[index] = { ...state.coordinateData[index], ...coordinates }
      }

      showSuccess('Updated', 'Diagram coordinates updated successfully')
    } catch (error) {
      console.error('Failed to update coordinates:', error)
      showError('Update Failed', 'Failed to update diagram coordinates')
    }
  }

  /**
   * Validate coordinate data integrity
   */
  const validateCoordinateData = async (): Promise<void> => {
    const invalidCoordinates: string[] = []

    for (const coord of state.coordinateData) {
      // Check if coordinates are within valid bounds
      for (const diagram of coord.diagrams) {
        const { coordinates } = diagram
        const { width, height } = coord.originalImageDimensions

        if (
          coordinates.x1 < 0 || coordinates.x1 >= width ||
          coordinates.y1 < 0 || coordinates.y1 >= height ||
          coordinates.x2 <= coordinates.x1 || coordinates.x2 > width ||
          coordinates.y2 <= coordinates.y1 || coordinates.y2 > height
        ) {
          invalidCoordinates.push(coord.questionId)
          break
        }
      }
    }

    if (invalidCoordinates.length > 0) {
      console.warn(`Found ${invalidCoordinates.length} questions with invalid coordinates:`, invalidCoordinates)
      
      if (defaultConfig.fallbackToLegacy) {
        // Remove invalid coordinates from rendering
        state.coordinateData = state.coordinateData.filter(
          coord => !invalidCoordinates.includes(coord.questionId)
        )
        showWarning('Validation Warning', `${invalidCoordinates.length} questions have invalid coordinates and will use legacy display`)
      }
    }
  }

  /**
   * Convert legacy test data to enhanced format
   */
  const enhanceTestData = (
    legacyData: TestInterfaceJsonOutput
  ): EnhancedTestInterfaceJsonOutput => {
    const enhancedTestData: EnhancedTestInterfaceJsonOutput['testData'] = {}

    // Process each subject/section/question
    for (const [subject, sections] of Object.entries(legacyData.testData)) {
      enhancedTestData[subject] = {}
      
      for (const [section, questions] of Object.entries(sections)) {
        enhancedTestData[subject][section] = {}
        
        for (const [questionNum, questionData] of Object.entries(questions)) {
          const questionId = `${subject}_${section}_${questionNum}`
          const coordinates = getQuestionCoordinates(questionId)
          
          enhancedTestData[subject][section][questionNum] = {
            ...questionData,
            diagrams: coordinates?.diagrams?.map(d => d.coordinates) || [],
            hasDiagram: coordinates?.diagrams?.length > 0
          }
        }
      }
    }

    return {
      ...legacyData,
      testData: enhancedTestData,
      testConfig: {
        ...legacyData.testConfig,
        diagramDetectionEnabled: state.enableCoordinateRendering,
        coordinateBasedRendering: state.enableCoordinateRendering
      },
      diagramCoordinates: state.coordinateData
    }
  }

  /**
   * Export test data with coordinates
   */
  const exportEnhancedTestData = async (): Promise<EnhancedTestInterfaceJsonOutput | null> => {
    try {
      // Get current test data (this would need to be implemented based on your existing system)
      const legacyData = await getCurrentTestData() // You'll need to implement this
      
      if (!legacyData) {
        throw new Error('No test data available')
      }

      return enhanceTestData(legacyData)
    } catch (error) {
      console.error('Failed to export enhanced test data:', error)
      showError('Export Failed', 'Failed to export test data with coordinates')
      return null
    }
  }

  /**
   * Import enhanced test data
   */
  const importEnhancedTestData = async (data: EnhancedTestInterfaceJsonOutput): Promise<void> => {
    try {
      state.isLoading = true

      // Import coordinate data if available
      if (data.diagramCoordinates) {
        for (const coord of data.diagramCoordinates) {
          await db.diagramCoordinates.add(coord)
        }
        state.coordinateData = data.diagramCoordinates
      }

      // Update rendering settings
      if (data.testConfig.coordinateBasedRendering) {
        state.enableCoordinateRendering = true
      }

      showSuccess('Import Complete', 'Enhanced test data imported successfully')
    } catch (error) {
      console.error('Failed to import enhanced test data:', error)
      showError('Import Failed', 'Failed to import enhanced test data')
    } finally {
      state.isLoading = false
    }
  }

  /**
   * Toggle coordinate rendering
   */
  const toggleCoordinateRendering = (): void => {
    state.enableCoordinateRendering = !state.enableCoordinateRendering
    
    // Save preference
    localStorage.setItem('cbt-coordinate-rendering', state.enableCoordinateRendering.toString())
  }

  /**
   * Update rendering settings
   */
  const updateRenderingSettings = (settings: Partial<Pick<CBTCoordinateState, 'renderingMode' | 'diagramQuality' | 'showConfidenceIndicators'>>): void => {
    Object.assign(state, settings)
    
    // Save settings
    const savedSettings = {
      renderingMode: state.renderingMode,
      diagramQuality: state.diagramQuality,
      showConfidenceIndicators: state.showConfidenceIndicators
    }
    localStorage.setItem('cbt-coordinate-settings', JSON.stringify(savedSettings))
  }

  /**
   * Get rendering statistics
   */
  const getRenderingStats = () => {
    const totalQuestions = state.coordinateData.length
    const questionsWithDiagrams = state.coordinateData.filter(coord => coord.diagrams.length > 0).length
    const totalDiagrams = state.coordinateData.reduce((sum, coord) => sum + coord.diagrams.length, 0)
    const averageConfidence = state.coordinateData.reduce((sum, coord) => {
      const coordConfidence = coord.diagrams.reduce((diagSum, diag) => diagSum + diag.confidence, 0) / coord.diagrams.length
      return sum + (coordConfidence || 0)
    }, 0) / totalQuestions

    return {
      totalQuestions,
      questionsWithDiagrams,
      totalDiagrams,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      renderingEnabled: state.enableCoordinateRendering
    }
  }

  /**
   * Clear coordinate data
   */
  const clearCoordinateData = async (): Promise<void> => {
    try {
      state.coordinateData = []
      state.enableCoordinateRendering = false
      
      // Clear from database
      await db.diagramCoordinates.clear()
      
      showSuccess('Cleared', 'All coordinate data cleared')
    } catch (error) {
      console.error('Failed to clear coordinate data:', error)
      showError('Clear Failed', 'Failed to clear coordinate data')
    }
  }

  // Load settings on initialization
  onMounted(() => {
    // Load coordinate rendering preference
    const renderingEnabled = localStorage.getItem('cbt-coordinate-rendering')
    if (renderingEnabled !== null) {
      state.enableCoordinateRendering = renderingEnabled === 'true'
    }

    // Load rendering settings
    const savedSettings = localStorage.getItem('cbt-coordinate-settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        state.renderingMode = settings.renderingMode || 'overlay'
        state.diagramQuality = settings.diagramQuality || 'medium'
        state.showConfidenceIndicators = settings.showConfidenceIndicators ?? true
      } catch (error) {
        console.warn('Failed to load coordinate settings:', error)
      }
    }

    // Auto-load coordinates if enabled
    if (defaultConfig.autoLoadCoordinates) {
      loadCoordinateData()
    }
  })

  return {
    // State
    state: readonly(state),
    
    // Methods
    loadCoordinateData,
    getQuestionCoordinates,
    hasCoordinateDiagrams,
    getQuestionDiagrams,
    updateQuestionCoordinates,
    validateCoordinateData,
    enhanceTestData,
    exportEnhancedTestData,
    importEnhancedTestData,
    toggleCoordinateRendering,
    updateRenderingSettings,
    getRenderingStats,
    clearCoordinateData,
    
    // Computed
    isCoordinateRenderingEnabled: computed(() => state.enableCoordinateRendering),
    hasCoordinateData: computed(() => state.coordinateData.length > 0),
    coordinateCount: computed(() => state.coordinateData.length),
    diagramCount: computed(() => state.coordinateData.reduce((sum, coord) => sum + coord.diagrams.length, 0))
  }
}

// Helper function to get current test data (needs to be implemented based on your system)
async function getCurrentTestData(): Promise<TestInterfaceJsonOutput | null> {
  // This should be implemented to get the current test data from your system
  // For now, returning null as a placeholder
  console.warn('getCurrentTestData not implemented - please implement based on your system')
  return null
}