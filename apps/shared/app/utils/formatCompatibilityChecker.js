/**
 * Format Compatibility Checker
 * Validates compatibility between AI JSON format and legacy ZIP formats
 */

export class FormatCompatibilityChecker {
  constructor() {
    this.legacyFormats = {
      'zip': {
        requiredFiles: ['questions.json', 'config.json'],
        optionalFiles: ['images/', 'metadata.json'],
        questionFields: ['queId', 'queText', 'queType', 'options', 'queAnswer']
      },
      'csv': {
        requiredColumns: ['Question ID', 'Question Text', 'Question Type', 'Options', 'Correct Answer'],
        optionalColumns: ['Subject', 'Marks', 'Difficulty']
      }
    }
  }

  /**
   * Check compatibility between AI JSON and legacy formats
   * @param {Object} aiData - AI-extracted JSON data
   * @param {string} targetFormat - Target legacy format ('zip', 'csv', etc.)
   * @returns {Object} Compatibility analysis
   */
  checkCompatibility(aiData, targetFormat = 'zip') {
    const compatibility = {
      isCompatible: true,
      compatibilityScore: 100,
      issues: [],
      warnings: [],
      requiredTransformations: [],
      dataLoss: [],
      recommendations: []
    }

    try {
      // Basic structure validation
      this.validateBasicStructure(aiData, compatibility)
      
      // Format-specific validation
      switch (targetFormat.toLowerCase()) {
        case 'zip':
          this.validateZipCompatibility(aiData, compatibility)
          break
        case 'csv':
          this.validateCSVCompatibility(aiData, compatibility)
          break
        default:
          compatibility.warnings.push({
            type: 'UNKNOWN_FORMAT',
            message: `Unknown target format: ${targetFormat}`,
            impact: 'medium'
          })
      }

      // AI-specific field analysis
      this.analyzeAIFields(aiData, compatibility)
      
      // Data transformation requirements
      this.analyzeTransformationNeeds(aiData, targetFormat, compatibility)
      
      // Calculate final compatibility score
      this.calculateCompatibilityScore(compatibility)

    } catch (error) {
      compatibility.isCompatible = false
      compatibility.compatibilityScore = 0
      compatibility.issues.push({
        type: 'VALIDATION_ERROR',
        message: `Compatibility check failed: ${error.message}`,
        severity: 'critical'
      })
    }

    return compatibility
  }

  /**
   * Validate basic structure requirements
   */
  validateBasicStructure(aiData, compatibility) {
    if (!aiData || typeof aiData !== 'object') {
      compatibility.issues.push({
        type: 'INVALID_DATA',
        message: 'Data is not a valid object',
        severity: 'critical'
      })
      compatibility.isCompatible = false
      return
    }

    // Check for required top-level properties
    const requiredProps = ['testName', 'questions']
    requiredProps.forEach(prop => {
      if (!aiData[prop]) {
        compatibility.issues.push({
          type: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${prop}`,
          severity: 'high',
          field: prop
        })
        compatibility.compatibilityScore -= 20
      }
    })

    // Validate questions array
    if (!Array.isArray(aiData.questions)) {
      compatibility.issues.push({
        type: 'INVALID_QUESTIONS_FORMAT',
        message: 'Questions must be an array',
        severity: 'critical'
      })
      compatibility.isCompatible = false
    } else if (aiData.questions.length === 0) {
      compatibility.issues.push({
        type: 'NO_QUESTIONS',
        message: 'No questions found in data',
        severity: 'high'
      })
      compatibility.compatibilityScore -= 30
    }
  }

  /**
   * Validate ZIP format compatibility
   */
  validateZipCompatibility(aiData, compatibility) {
    const zipRequirements = this.legacyFormats.zip

    // Check each question for required fields
    aiData.questions?.forEach((question, index) => {
      zipRequirements.questionFields.forEach(field => {
        if (!question.hasOwnProperty(field)) {
          compatibility.issues.push({
            type: 'MISSING_QUESTION_FIELD',
            message: `Question ${index + 1} missing required field: ${field}`,
            severity: 'high',
            questionIndex: index,
            field: field
          })
          compatibility.compatibilityScore -= 5
        }
      })

      // Validate question type compatibility
      this.validateQuestionTypeCompatibility(question, index, compatibility)
      
      // Check for unsupported features
      this.checkUnsupportedFeatures(question, index, compatibility)
    })

    // Check for metadata compatibility
    this.validateMetadataCompatibility(aiData, compatibility)
  }

  /**
   * Validate CSV format compatibility
   */
  validateCSVCompatibility(aiData, compatibility) {
    const csvRequirements = this.legacyFormats.csv

    // CSV has more limitations than ZIP format
    aiData.questions?.forEach((question, index) => {
      // CSV cannot handle complex question types well
      if (['msm', 'comprehension'].includes(question.queType)) {
        compatibility.issues.push({
          type: 'UNSUPPORTED_QUESTION_TYPE',
          message: `Question ${index + 1} type '${question.queType}' not suitable for CSV format`,
          severity: 'high',
          questionIndex: index
        })
        compatibility.compatibilityScore -= 10
      }

      // CSV has limited option handling
      if (question.options && question.options.length > 6) {
        compatibility.warnings.push({
          type: 'TOO_MANY_OPTIONS',
          message: `Question ${index + 1} has ${question.options.length} options, CSV format may have display issues`,
          impact: 'medium',
          questionIndex: index
        })
        compatibility.compatibilityScore -= 2
      }

      // Check for complex formatting
      if (this.hasComplexFormatting(question.queText)) {
        compatibility.warnings.push({
          type: 'COMPLEX_FORMATTING',
          message: `Question ${index + 1} has complex formatting that may not render well in CSV`,
          impact: 'medium',
          questionIndex: index
        })
      }
    })
  }

  /**
   * Validate question type compatibility
   */
  validateQuestionTypeCompatibility(question, index, compatibility) {
    const supportedTypes = ['mcq', 'msq', 'nat']
    
    if (!supportedTypes.includes(question.queType)) {
      compatibility.issues.push({
        type: 'UNSUPPORTED_QUESTION_TYPE',
        message: `Question ${index + 1} type '${question.queType}' not supported in legacy format`,
        severity: 'high',
        questionIndex: index,
        suggestion: 'Convert to supported type or handle separately'
      })
      compatibility.compatibilityScore -= 15
    }

    // Type-specific validation
    switch (question.queType) {
      case 'mcq':
        this.validateMCQCompatibility(question, index, compatibility)
        break
      case 'msq':
        this.validateMSQCompatibility(question, index, compatibility)
        break
      case 'nat':
        this.validateNATCompatibility(question, index, compatibility)
        break
    }
  }

  /**
   * Validate MCQ compatibility
   */
  validateMCQCompatibility(question, index, compatibility) {
    if (!question.options || !Array.isArray(question.options)) {
      compatibility.issues.push({
        type: 'MISSING_MCQ_OPTIONS',
        message: `MCQ question ${index + 1} missing options array`,
        severity: 'high',
        questionIndex: index
      })
      compatibility.compatibilityScore -= 10
    } else {
      if (question.options.length < 2) {
        compatibility.issues.push({
          type: 'INSUFFICIENT_OPTIONS',
          message: `MCQ question ${index + 1} has insufficient options`,
          severity: 'high',
          questionIndex: index
        })
        compatibility.compatibilityScore -= 8
      }

      if (question.options.length > 6) {
        compatibility.warnings.push({
          type: 'TOO_MANY_OPTIONS',
          message: `MCQ question ${index + 1} has many options, may cause display issues`,
          impact: 'low',
          questionIndex: index
        })
      }
    }

    // Validate answer format
    if (question.queAnswer !== undefined) {
      if (typeof question.queAnswer !== 'number' || 
          question.queAnswer < 0 || 
          question.queAnswer >= (question.options?.length || 0)) {
        compatibility.issues.push({
          type: 'INVALID_MCQ_ANSWER',
          message: `MCQ question ${index + 1} has invalid answer format`,
          severity: 'medium',
          questionIndex: index
        })
        compatibility.compatibilityScore -= 5
      }
    }
  }

  /**
   * Validate MSQ compatibility
   */
  validateMSQCompatibility(question, index, compatibility) {
    if (!question.options || !Array.isArray(question.options)) {
      compatibility.issues.push({
        type: 'MISSING_MSQ_OPTIONS',
        message: `MSQ question ${index + 1} missing options array`,
        severity: 'high',
        questionIndex: index
      })
      compatibility.compatibilityScore -= 10
    }

    // MSQ answer validation
    if (question.queAnswer !== undefined) {
      if (!Array.isArray(question.queAnswer)) {
        compatibility.issues.push({
          type: 'INVALID_MSQ_ANSWER_FORMAT',
          message: `MSQ question ${index + 1} answer must be an array`,
          severity: 'medium',
          questionIndex: index
        })
        compatibility.compatibilityScore -= 5
      }
    }
  }

  /**
   * Validate NAT compatibility
   */
  validateNATCompatibility(question, index, compatibility) {
    // NAT questions should not have options in legacy format
    if (question.options && question.options.length > 0) {
      compatibility.warnings.push({
        type: 'NAT_HAS_OPTIONS',
        message: `NAT question ${index + 1} has options, will be ignored in legacy format`,
        impact: 'low',
        questionIndex: index
      })
      compatibility.requiredTransformations.push({
        type: 'REMOVE_NAT_OPTIONS',
        questionIndex: index,
        description: 'Remove options from NAT question'
      })
    }

    // Validate answer format
    if (question.queAnswer !== undefined) {
      if (typeof question.queAnswer !== 'number' && typeof question.queAnswer !== 'string') {
        compatibility.warnings.push({
          type: 'NAT_ANSWER_FORMAT',
          message: `NAT question ${index + 1} answer format may need conversion`,
          impact: 'low',
          questionIndex: index
        })
      }
    }
  }

  /**
   * Check for unsupported features
   */
  checkUnsupportedFeatures(question, index, compatibility) {
    const unsupportedFeatures = []

    // AI-specific features
    if (question.confidence) {
      unsupportedFeatures.push('confidence scoring')
      compatibility.dataLoss.push({
        type: 'CONFIDENCE_SCORE',
        questionIndex: index,
        description: 'AI confidence score will be lost'
      })
    }

    if (question.hasDiagram) {
      unsupportedFeatures.push('diagram detection')
      compatibility.dataLoss.push({
        type: 'DIAGRAM_FLAG',
        questionIndex: index,
        description: 'Diagram detection flag will be lost'
      })
    }

    if (question.extractionMetadata) {
      unsupportedFeatures.push('extraction metadata')
      compatibility.dataLoss.push({
        type: 'EXTRACTION_METADATA',
        questionIndex: index,
        description: 'AI extraction metadata will be lost'
      })
    }

    // Advanced features
    if (question.tags && question.tags.length > 0) {
      unsupportedFeatures.push('question tags')
      compatibility.dataLoss.push({
        type: 'QUESTION_TAGS',
        questionIndex: index,
        description: 'Question tags will be lost'
      })
    }

    if (question.difficulty) {
      compatibility.dataLoss.push({
        type: 'DIFFICULTY_LEVEL',
        questionIndex: index,
        description: 'Difficulty level may be lost'
      })
    }

    if (unsupportedFeatures.length > 0) {
      compatibility.warnings.push({
        type: 'UNSUPPORTED_FEATURES',
        message: `Question ${index + 1} has unsupported features: ${unsupportedFeatures.join(', ')}`,
        impact: 'medium',
        questionIndex: index
      })
    }
  }

  /**
   * Validate metadata compatibility
   */
  validateMetadataCompatibility(aiData, compatibility) {
    // Check for AI-specific metadata
    if (aiData.extractionMetadata) {
      compatibility.dataLoss.push({
        type: 'EXTRACTION_METADATA',
        description: 'AI extraction metadata will be lost in legacy format'
      })
    }

    if (aiData.schemaVersion) {
      compatibility.dataLoss.push({
        type: 'SCHEMA_VERSION',
        description: 'Schema version information will be lost'
      })
    }

    // Check for unsupported test-level features
    if (aiData.aiAnalytics) {
      compatibility.dataLoss.push({
        type: 'AI_ANALYTICS',
        description: 'AI analytics data will be lost'
      })
    }
  }

  /**
   * Analyze transformation needs
   */
  analyzeTransformationNeeds(aiData, targetFormat, compatibility) {
    const transformations = []

    // Question ID transformation
    aiData.questions?.forEach((question, index) => {
      if (!question.queId || typeof question.queId !== 'string') {
        transformations.push({
          type: 'GENERATE_QUESTION_ID',
          questionIndex: index,
          description: 'Generate valid question ID'
        })
      }
    })

    // Answer format transformation
    aiData.questions?.forEach((question, index) => {
      if (question.queType === 'msq' && question.queAnswer && !Array.isArray(question.queAnswer)) {
        transformations.push({
          type: 'CONVERT_MSQ_ANSWER',
          questionIndex: index,
          description: 'Convert MSQ answer to array format'
        })
      }
    })

    // Remove AI-specific fields
    if (this.hasAIFields(aiData)) {
      transformations.push({
        type: 'REMOVE_AI_FIELDS',
        description: 'Remove AI-specific fields for legacy compatibility'
      })
    }

    compatibility.requiredTransformations.push(...transformations)
  }

  /**
   * Calculate final compatibility score
   */
  calculateCompatibilityScore(compatibility) {
    let score = compatibility.compatibilityScore

    // Deduct points for issues
    compatibility.issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 30
          break
        case 'high':
          score -= 15
          break
        case 'medium':
          score -= 8
          break
        case 'low':
          score -= 3
          break
      }
    })

    // Deduct points for warnings
    compatibility.warnings.forEach(warning => {
      switch (warning.impact) {
        case 'high':
          score -= 10
          break
        case 'medium':
          score -= 5
          break
        case 'low':
          score -= 2
          break
      }
    })

    // Deduct points for data loss
    score -= compatibility.dataLoss.length * 2

    // Deduct points for required transformations
    score -= compatibility.requiredTransformations.length * 1

    compatibility.compatibilityScore = Math.max(0, Math.min(100, score))
    
    // Set compatibility flag based on score
    if (compatibility.compatibilityScore < 50) {
      compatibility.isCompatible = false
    }

    // Generate recommendations
    this.generateRecommendations(compatibility)
  }

  /**
   * Generate recommendations based on compatibility analysis
   */
  generateRecommendations(compatibility) {
    const recommendations = []

    if (compatibility.compatibilityScore < 70) {
      recommendations.push({
        type: 'IMPROVE_COMPATIBILITY',
        priority: 'high',
        message: 'Consider addressing critical issues before conversion',
        actions: ['Fix missing required fields', 'Validate question formats', 'Review unsupported features']
      })
    }

    if (compatibility.dataLoss.length > 0) {
      recommendations.push({
        type: 'DATA_LOSS_WARNING',
        priority: 'medium',
        message: 'Some data will be lost during conversion',
        actions: ['Export AI metadata separately', 'Document lost features', 'Consider hybrid approach']
      })
    }

    if (compatibility.requiredTransformations.length > 5) {
      recommendations.push({
        type: 'COMPLEX_TRANSFORMATION',
        priority: 'medium',
        message: 'Conversion requires significant data transformation',
        actions: ['Review transformation requirements', 'Test conversion process', 'Validate converted data']
      })
    }

    if (compatibility.issues.some(i => i.severity === 'critical')) {
      recommendations.push({
        type: 'CRITICAL_ISSUES',
        priority: 'critical',
        message: 'Critical issues must be resolved before conversion',
        actions: ['Fix data structure issues', 'Validate required fields', 'Test basic functionality']
      })
    }

    compatibility.recommendations = recommendations
  }

  /**
   * Helper methods
   */
  hasComplexFormatting(text) {
    // Check for complex formatting that may not work in simple formats
    const complexPatterns = [
      /<[^>]+>/g, // HTML tags
      /\$[^$]+\$/g, // LaTeX math
      /\\[a-zA-Z]+/g, // LaTeX commands
      /\n{2,}/g, // Multiple line breaks
      /\t/g // Tabs
    ]
    
    return complexPatterns.some(pattern => pattern.test(text))
  }

  hasAIFields(data) {
    // Check if data contains AI-specific fields
    const aiFields = ['confidence', 'hasDiagram', 'extractionMetadata', 'aiAnalytics']
    
    if (aiFields.some(field => data[field])) {
      return true
    }

    // Check questions for AI fields
    return data.questions?.some(question => 
      aiFields.some(field => question[field])
    ) || false
  }

  /**
   * Generate conversion preview
   */
  generateConversionPreview(aiData, targetFormat) {
    const compatibility = this.checkCompatibility(aiData, targetFormat)
    
    return {
      compatibility,
      previewData: this.createPreviewData(aiData, targetFormat, compatibility),
      conversionSteps: this.generateConversionSteps(compatibility),
      estimatedDataLoss: this.calculateDataLoss(compatibility)
    }
  }

  createPreviewData(aiData, targetFormat, compatibility) {
    // Create a preview of what the converted data would look like
    const preview = {
      format: targetFormat,
      testName: aiData.testName,
      questionCount: aiData.questions?.length || 0,
      supportedQuestions: 0,
      unsupportedQuestions: 0
    }

    aiData.questions?.forEach(question => {
      const supportedTypes = ['mcq', 'msq', 'nat']
      if (supportedTypes.includes(question.queType)) {
        preview.supportedQuestions++
      } else {
        preview.unsupportedQuestions++
      }
    })

    return preview
  }

  generateConversionSteps(compatibility) {
    const steps = []

    if (compatibility.requiredTransformations.length > 0) {
      steps.push({
        step: 1,
        title: 'Data Transformation',
        description: 'Apply required data transformations',
        transformations: compatibility.requiredTransformations
      })
    }

    steps.push({
      step: steps.length + 1,
      title: 'Format Conversion',
      description: 'Convert to target format'
    })

    if (compatibility.dataLoss.length > 0) {
      steps.push({
        step: steps.length + 1,
        title: 'Data Loss Handling',
        description: 'Handle data that cannot be converted',
        lostData: compatibility.dataLoss
      })
    }

    steps.push({
      step: steps.length + 1,
      title: 'Validation',
      description: 'Validate converted data'
    })

    return steps
  }

  calculateDataLoss(compatibility) {
    return {
      totalItems: compatibility.dataLoss.length,
      categories: this.categorizeDataLoss(compatibility.dataLoss),
      impact: this.assessDataLossImpact(compatibility.dataLoss)
    }
  }

  categorizeDataLoss(dataLoss) {
    const categories = {}
    
    dataLoss.forEach(item => {
      if (!categories[item.type]) {
        categories[item.type] = 0
      }
      categories[item.type]++
    })
    
    return categories
  }

  assessDataLossImpact(dataLoss) {
    const criticalLoss = ['EXTRACTION_METADATA', 'CONFIDENCE_SCORE']
    const hasCriticalLoss = dataLoss.some(item => criticalLoss.includes(item.type))
    
    if (hasCriticalLoss) {
      return 'high'
    } else if (dataLoss.length > 5) {
      return 'medium'
    } else {
      return 'low'
    }
  }
}

/**
 * Quick compatibility check function
 */
export function checkFormatCompatibility(aiData, targetFormat = 'zip') {
  const checker = new FormatCompatibilityChecker()
  return checker.checkCompatibility(aiData, targetFormat)
}

/**
 * Generate conversion report
 */
export function generateConversionReport(aiData, targetFormat = 'zip') {
  const checker = new FormatCompatibilityChecker()
  return checker.generateConversionPreview(aiData, targetFormat)
}

export default FormatCompatibilityChecker