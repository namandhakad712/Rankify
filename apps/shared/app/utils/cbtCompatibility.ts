/**
 * CBT Compatibility Layer
 * Ensures backward compatibility between coordinate-based and legacy test interfaces
 */

import type { 
  CoordinateMetadata, 
  EnhancedQuestion, 
  DiagramCoordinates,
  EnhancedTestInterfaceJsonOutput 
} from '~/shared/types/diagram-detection'

export interface CompatibilityOptions {
  enableCoordinateRendering: boolean
  fallbackToLegacy: boolean
  preserveLegacyData: boolean
  validateCompatibility: boolean
}

export interface CompatibilityResult {
  isCompatible: boolean
  hasCoordinateData: boolean
  hasLegacyData: boolean
  migrationRequired: boolean
  warnings: string[]
  errors: string[]
}

export class CBTCompatibilityManager {
  private options: CompatibilityOptions

  constructor(options: Partial<CompatibilityOptions> = {}) {
    this.options = {
      enableCoordinateRendering: true,
      fallbackToLegacy: true,
      preserveLegacyData: true,
      validateCompatibility: true,
      ...options
    }
  }

  /**
   * Check compatibility between coordinate and legacy data
   */
  checkCompatibility(
    legacyData: TestInterfaceJsonOutput,
    coordinateData?: CoordinateMetadata[]
  ): CompatibilityResult {
    const result: CompatibilityResult = {
      isCompatible: true,
      hasCoordinateData: Boolean(coordinateData?.length),
      hasLegacyData: Boolean(legacyData?.testData),
      migrationRequired: false,
      warnings: [],
      errors: []
    }

    // Check if legacy data exists
    if (!legacyData?.testData) {
      result.errors.push('No legacy test data found')
      result.isCompatible = false
      return result
    }

    // Check coordinate data if available
    if (coordinateData?.length) {
      const validationResult = this.validateCoordinateData(coordinateData)
      result.warnings.push(...validationResult.warnings)
      result.errors.push(...validationResult.errors)
      
      if (validationResult.errors.length > 0) {
        result.isCompatible = false
      }
    }

    // Check if migration is needed
    if (result.hasLegacyData && !result.hasCoordinateData) {
      result.migrationRequired = true
      result.warnings.push('Legacy data detected - consider migrating to coordinate-based format')
    }

    // Check for mixed data scenarios
    if (result.hasLegacyData && result.hasCoordinateData) {
      result.warnings.push('Both legacy and coordinate data present - ensure consistency')
    }

    return result
  }

  /**
   * Validate coordinate data integrity
   */
  private validateCoordinateData(coordinateData: CoordinateMetadata[]): {
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []

    for (const coord of coordinateData) {
      // Check required fields
      if (!coord.questionId) {
        errors.push(`Missing questionId in coordinate data`)
        continue
      }

      if (!coord.originalImageDimensions?.width || !coord.originalImageDimensions?.height) {
        errors.push(`Invalid image dimensions for question ${coord.questionId}`)
        continue
      }

      // Validate diagrams
      for (const diagram of coord.diagrams) {
        const { coordinates } = diagram
        const { width, height } = coord.originalImageDimensions

        // Check coordinate bounds
        if (
          coordinates.x1 < 0 || coordinates.x1 >= width ||
          coordinates.y1 < 0 || coordinates.y1 >= height ||
          coordinates.x2 <= coordinates.x1 || coordinates.x2 > width ||
          coordinates.y2 <= coordinates.y1 || coordinates.y2 > height
        ) {
          errors.push(`Invalid coordinates for diagram in question ${coord.questionId}`)
        }

        // Check confidence levels
        if (coordinates.confidence < 0.3) {
          warnings.push(`Low confidence (${Math.round(coordinates.confidence * 100)}%) for diagram in question ${coord.questionId}`)
        }
      }
    }

    return { warnings, errors }
  }

  /**
   * Merge legacy and coordinate data
   */
  mergeTestData(
    legacyData: TestInterfaceJsonOutput,
    coordinateData?: CoordinateMetadata[]
  ): EnhancedTestInterfaceJsonOutput {
    const enhancedTestData: EnhancedTestInterfaceJsonOutput['testData'] = {}

    // Process each subject/section/question
    for (const [subject, sections] of Object.entries(legacyData.testData)) {
      enhancedTestData[subject] = {}
      
      for (const [section, questions] of Object.entries(sections)) {
        enhancedTestData[subject][section] = {}
        
        for (const [questionNum, questionData] of Object.entries(questions)) {
          const questionId = `${subject}_${section}_${questionNum}`
          const coordinates = coordinateData?.find(coord => coord.questionId === questionId)
          
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
        diagramDetectionEnabled: Boolean(coordinateData?.length),
        coordinateBasedRendering: this.options.enableCoordinateRendering && Boolean(coordinateData?.length)
      },
      diagramCoordinates: coordinateData || []
    }
  }

  /**
   * Extract legacy data from enhanced format
   */
  extractLegacyData(enhancedData: EnhancedTestInterfaceJsonOutput): TestInterfaceJsonOutput {
    const legacyTestData: TestInterfaceJsonOutput['testData'] = {}

    // Remove coordinate-specific fields
    for (const [subject, sections] of Object.entries(enhancedData.testData)) {
      legacyTestData[subject] = {}
      
      for (const [section, questions] of Object.entries(sections)) {
        legacyTestData[subject][section] = {}
        
        for (const [questionNum, questionData] of Object.entries(questions)) {
          const { diagrams, hasDiagram, ...legacyQuestionData } = questionData
          legacyTestData[subject][section][questionNum] = legacyQuestionData
        }
      }
    }

    // Remove coordinate-specific config
    const { diagramDetectionEnabled, coordinateBasedRendering, ...legacyConfig } = enhancedData.testConfig

    return {
      ...enhancedData,
      testData: legacyTestData,
      testConfig: legacyConfig
    }
  }

  /**
   * Create fallback question display data
   */
  createFallbackQuestionData(
    questionData: TestInterfaceQuestionData,
    coordinates?: CoordinateMetadata
  ): TestInterfaceQuestionData & { fallbackMode: boolean } {
    if (!coordinates?.diagrams?.length || !this.options.fallbackToLegacy) {
      return {
        ...questionData,
        fallbackMode: false
      }
    }

    // If coordinates exist but rendering fails, provide fallback
    return {
      ...questionData,
      fallbackMode: true
    }
  }

  /**
   * Validate question compatibility
   */
  validateQuestionCompatibility(
    questionId: string,
    legacyData: TestInterfaceQuestionData,
    coordinateData?: CoordinateMetadata
  ): {
    isCompatible: boolean
    canRenderCoordinates: boolean
    shouldFallback: boolean
    issues: string[]
  } {
    const issues: string[] = []
    let isCompatible = true
    let canRenderCoordinates = false
    let shouldFallback = false

    // Check if coordinate data exists and is valid
    if (coordinateData?.diagrams?.length) {
      canRenderCoordinates = true

      // Validate coordinate integrity
      for (const diagram of coordinateData.diagrams) {
        if (diagram.confidence < 0.3) {
          issues.push(`Low confidence diagram detected (${Math.round(diagram.confidence * 100)}%)`)
          shouldFallback = true
        }

        const coords = diagram.coordinates
        if (coords.x2 <= coords.x1 || coords.y2 <= coords.y1) {
          issues.push('Invalid coordinate dimensions')
          isCompatible = false
          shouldFallback = true
        }
      }
    }

    // Check legacy data availability for fallback
    if (!legacyData.imgUrls?.length && !canRenderCoordinates) {
      issues.push('No image data available for question display')
      isCompatible = false
    }

    return {
      isCompatible,
      canRenderCoordinates,
      shouldFallback: shouldFallback && this.options.fallbackToLegacy,
      issues
    }
  }

  /**
   * Generate compatibility report
   */
  generateCompatibilityReport(
    legacyData: TestInterfaceJsonOutput,
    coordinateData?: CoordinateMetadata[]
  ): {
    summary: {
      totalQuestions: number
      coordinateQuestions: number
      legacyQuestions: number
      compatibleQuestions: number
      issueQuestions: number
    }
    details: Array<{
      questionId: string
      status: 'compatible' | 'coordinate-only' | 'legacy-only' | 'issues'
      issues: string[]
      recommendations: string[]
    }>
    recommendations: string[]
  } {
    const details: any[] = []
    const summary = {
      totalQuestions: 0,
      coordinateQuestions: 0,
      legacyQuestions: 0,
      compatibleQuestions: 0,
      issueQuestions: 0
    }

    // Analyze each question
    for (const [subject, sections] of Object.entries(legacyData.testData)) {
      for (const [section, questions] of Object.entries(sections)) {
        for (const [questionNum, questionData] of Object.entries(questions)) {
          const questionId = `${subject}_${section}_${questionNum}`
          const coordinates = coordinateData?.find(coord => coord.questionId === questionId)
          
          summary.totalQuestions++

          const validation = this.validateQuestionCompatibility(questionId, questionData, coordinates)
          
          let status: 'compatible' | 'coordinate-only' | 'legacy-only' | 'issues' = 'compatible'
          const recommendations: string[] = []

          if (coordinates?.diagrams?.length) {
            summary.coordinateQuestions++
            if (questionData.imgUrls?.length) {
              status = 'compatible'
              summary.compatibleQuestions++
            } else {
              status = 'coordinate-only'
              recommendations.push('Consider adding legacy image fallback')
            }
          } else if (questionData.imgUrls?.length) {
            summary.legacyQuestions++
            status = 'legacy-only'
            recommendations.push('Consider adding coordinate-based diagrams')
          }

          if (validation.issues.length > 0) {
            status = 'issues'
            summary.issueQuestions++
            recommendations.push('Review and fix identified issues')
          }

          details.push({
            questionId,
            status,
            issues: validation.issues,
            recommendations
          })
        }
      }
    }

    // Generate overall recommendations
    const overallRecommendations: string[] = []
    
    if (summary.coordinateQuestions === 0) {
      overallRecommendations.push('Consider implementing coordinate-based diagram detection')
    }
    
    if (summary.issueQuestions > 0) {
      overallRecommendations.push(`Fix ${summary.issueQuestions} questions with compatibility issues`)
    }
    
    if (summary.coordinateQuestions > 0 && summary.legacyQuestions > 0) {
      overallRecommendations.push('Ensure consistent data format across all questions')
    }

    return {
      summary,
      details,
      recommendations: overallRecommendations
    }
  }

  /**
   * Auto-fix common compatibility issues
   */
  autoFixCompatibilityIssues(
    coordinateData: CoordinateMetadata[]
  ): {
    fixed: CoordinateMetadata[]
    issues: Array<{
      questionId: string
      issue: string
      fixed: boolean
      action: string
    }>
  } {
    const fixed: CoordinateMetadata[] = []
    const issues: any[] = []

    for (const coord of coordinateData) {
      const fixedCoord = { ...coord }
      let hasChanges = false

      // Fix invalid coordinates
      for (let i = 0; i < fixedCoord.diagrams.length; i++) {
        const diagram = fixedCoord.diagrams[i]
        const coords = diagram.coordinates
        const { width, height } = coord.originalImageDimensions

        // Fix coordinates that are out of bounds
        if (coords.x1 < 0) {
          coords.x1 = 0
          hasChanges = true
          issues.push({
            questionId: coord.questionId,
            issue: 'x1 coordinate was negative',
            fixed: true,
            action: 'Set x1 to 0'
          })
        }

        if (coords.y1 < 0) {
          coords.y1 = 0
          hasChanges = true
          issues.push({
            questionId: coord.questionId,
            issue: 'y1 coordinate was negative',
            fixed: true,
            action: 'Set y1 to 0'
          })
        }

        if (coords.x2 > width) {
          coords.x2 = width
          hasChanges = true
          issues.push({
            questionId: coord.questionId,
            issue: 'x2 coordinate exceeded image width',
            fixed: true,
            action: `Set x2 to ${width}`
          })
        }

        if (coords.y2 > height) {
          coords.y2 = height
          hasChanges = true
          issues.push({
            questionId: coord.questionId,
            issue: 'y2 coordinate exceeded image height',
            fixed: true,
            action: `Set y2 to ${height}`
          })
        }

        // Fix inverted coordinates
        if (coords.x2 <= coords.x1) {
          const temp = coords.x1
          coords.x1 = coords.x2
          coords.x2 = temp
          hasChanges = true
          issues.push({
            questionId: coord.questionId,
            issue: 'x coordinates were inverted',
            fixed: true,
            action: 'Swapped x1 and x2'
          })
        }

        if (coords.y2 <= coords.y1) {
          const temp = coords.y1
          coords.y1 = coords.y2
          coords.y2 = temp
          hasChanges = true
          issues.push({
            questionId: coord.questionId,
            issue: 'y coordinates were inverted',
            fixed: true,
            action: 'Swapped y1 and y2'
          })
        }
      }

      fixed.push(hasChanges ? fixedCoord : coord)
    }

    return { fixed, issues }
  }
}

// Export utility functions
export function createCompatibilityManager(options?: Partial<CompatibilityOptions>): CBTCompatibilityManager {
  return new CBTCompatibilityManager(options)
}

export function isEnhancedTestData(data: any): data is EnhancedTestInterfaceJsonOutput {
  return data && 
         typeof data === 'object' && 
         'testData' in data && 
         'testConfig' in data &&
         ('diagramCoordinates' in data || data.testConfig?.coordinateBasedRendering)
}

export function hasCoordinateSupport(questionData: any): boolean {
  return questionData && 
         (Array.isArray(questionData.diagrams) || questionData.hasDiagram === true)
}

export function shouldUseCoordinateRendering(
  questionData: any,
  coordinateData?: CoordinateMetadata,
  options: Partial<CompatibilityOptions> = {}
): boolean {
  if (!options.enableCoordinateRendering) return false
  if (!coordinateData?.diagrams?.length) return false
  
  // Check if coordinates are valid
  for (const diagram of coordinateData.diagrams) {
    if (diagram.confidence < 0.3) {
      return options.fallbackToLegacy ? false : true
    }
  }
  
  return true
}