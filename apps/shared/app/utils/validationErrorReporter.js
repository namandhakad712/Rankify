/**
 * Validation Error Reporter and Recovery System
 * Provides comprehensive error reporting and automatic recovery mechanisms
 */

export class ValidationErrorReporter {
  constructor() {
    this.errorHistory = []
    this.recoveryStrategies = new Map()
    this.setupRecoveryStrategies()
  }

  /**
   * Setup automatic recovery strategies for common errors
   */
  setupRecoveryStrategies() {
    // Missing question ID recovery
    this.recoveryStrategies.set('MISSING_QUESTION_ID', {
      canAutoFix: true,
      strategy: (question, index) => {
        question.queId = `q_${index + 1}_${Date.now()}`
        return { success: true, message: `Generated question ID: ${question.queId}` }
      }
    })

    // Empty question text recovery
    this.recoveryStrategies.set('EMPTY_QUESTION_TEXT', {
      canAutoFix: false,
      strategy: () => ({ success: false, message: 'Manual intervention required for empty question text' })
    })

    // Invalid question type recovery
    this.recoveryStrategies.set('INVALID_QUESTION_TYPE', {
      canAutoFix: true,
      strategy: (question) => {
        if (question.options && Array.isArray(question.options)) {
          question.queType = question.options.length > 1 ? 'mcq' : 'nat'
          return { success: true, message: `Inferred question type: ${question.queType}` }
        }
        question.queType = 'mcq'
        return { success: true, message: 'Set default question type: mcq' }
      }
    })

    // Missing options recovery
    this.recoveryStrategies.set('MISSING_MCQ_OPTIONS', {
      canAutoFix: true,
      strategy: (question) => {
        question.options = ['Option A', 'Option B', 'Option C', 'Option D']
        return { success: true, message: 'Generated placeholder options' }
      }
    })

    // Insufficient options recovery
    this.recoveryStrategies.set('INSUFFICIENT_OPTIONS', {
      canAutoFix: true,
      strategy: (question) => {
        while (question.options.length < 4) {
          question.options.push(`Option ${String.fromCharCode(65 + question.options.length)}`)
        }
        return { success: true, message: `Added ${4 - question.options.length} placeholder options` }
      }
    })

    // Invalid confidence score recovery
    this.recoveryStrategies.set('INVALID_CONFIDENCE', {
      canAutoFix: true,
      strategy: (question) => {
        question.confidence = 3 // Default medium confidence
        return { success: true, message: 'Set default confidence score: 3' }
      }
    })

    // Duplicate question ID recovery
    this.recoveryStrategies.set('DUPLICATE_QUESTION_ID', {
      canAutoFix: true,
      strategy: (question, index) => {
        question.queId = `${question.queId}_${index + 1}_${Date.now()}`
        return { success: true, message: `Made question ID unique: ${question.queId}` }
      }
    })

    // Invalid marks format recovery
    this.recoveryStrategies.set('INVALID_MARKS_FORMAT', {
      canAutoFix: true,
      strategy: (question) => {
        question.queMarks = { cm: 1, im: 0 }
        return { success: true, message: 'Set default marks: +1/0' }
      }
    })

    // Missing test name recovery
    this.recoveryStrategies.set('MISSING_TEST_NAME', {
      canAutoFix: true,
      strategy: (data) => {
        data.testName = `Test_${new Date().toISOString().split('T')[0]}`
        return { success: true, message: `Generated test name: ${data.testName}` }
      }
    })

    // Missing test sections recovery
    this.recoveryStrategies.set('MISSING_TEST_SECTIONS', {
      canAutoFix: true,
      strategy: (data) => {
        data.testSections = [{ name: 'General', questionCount: data.questions?.length || 0 }]
        return { success: true, message: 'Created default test section' }
      }
    })
  }

  /**
   * Report validation errors with context and recovery options
   * @param {Array} errors - Array of validation errors
   * @param {Object} data - Original data being validated
   * @returns {Object} Comprehensive error report
   */
  reportErrors(errors, data) {
    const report = {
      timestamp: new Date().toISOString(),
      totalErrors: errors.length,
      errorsByType: this.categorizeErrors(errors),
      errorsBySeverity: this.categorizeErrorsBySeverity(errors),
      recoveryOptions: this.analyzeRecoveryOptions(errors),
      detailedErrors: this.enrichErrors(errors, data),
      recommendations: this.generateRecommendations(errors),
      autoFixSummary: this.generateAutoFixSummary(errors)
    }

    // Store in error history
    this.errorHistory.push({
      timestamp: report.timestamp,
      errorCount: errors.length,
      dataSnapshot: this.createDataSnapshot(data),
      report
    })

    return report
  }

  /**
   * Categorize errors by type
   */
  categorizeErrors(errors) {
    const categories = {}
    
    errors.forEach(error => {
      const category = this.getErrorCategory(error.type)
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(error)
    })

    return categories
  }

  /**
   * Categorize errors by severity
   */
  categorizeErrorsBySeverity(errors) {
    const severities = { critical: [], high: [], medium: [], low: [] }
    
    errors.forEach(error => {
      const severity = error.severity || 'medium'
      if (severities[severity]) {
        severities[severity].push(error)
      }
    })

    return severities
  }

  /**
   * Get error category for grouping
   */
  getErrorCategory(errorType) {
    const categoryMap = {
      'MISSING_QUESTION_ID': 'Structure',
      'INVALID_QUESTION_TEXT': 'Content',
      'INVALID_QUESTION_TYPE': 'Format',
      'MISSING_MCQ_OPTIONS': 'Options',
      'INSUFFICIENT_OPTIONS': 'Options',
      'INVALID_CONFIDENCE': 'AI Metadata',
      'DUPLICATE_QUESTION_ID': 'Structure',
      'INVALID_MARKS_FORMAT': 'Scoring',
      'MISSING_TEST_NAME': 'Metadata',
      'SCHEMA_VIOLATION': 'Schema',
      'ENCODING_ISSUES': 'Content',
      'OCR_ARTIFACTS': 'Content'
    }

    return categoryMap[errorType] || 'Other'
  }

  /**
   * Analyze recovery options for errors
   */
  analyzeRecoveryOptions(errors) {
    const recoveryOptions = {
      autoFixable: [],
      manualRequired: [],
      partiallyFixable: []
    }

    errors.forEach(error => {
      const strategy = this.recoveryStrategies.get(error.type)
      
      if (strategy) {
        if (strategy.canAutoFix) {
          recoveryOptions.autoFixable.push({
            error,
            strategy: strategy.strategy,
            description: this.getRecoveryDescription(error.type)
          })
        } else {
          recoveryOptions.manualRequired.push({
            error,
            reason: 'Requires human judgment',
            suggestions: this.getManualRecoverySuggestions(error.type)
          })
        }
      } else {
        recoveryOptions.manualRequired.push({
          error,
          reason: 'No automatic recovery strategy available',
          suggestions: ['Review error manually', 'Consult documentation', 'Contact support']
        })
      }
    })

    return recoveryOptions
  }

  /**
   * Enrich errors with additional context
   */
  enrichErrors(errors, data) {
    return errors.map(error => {
      const enriched = { ...error }
      
      // Add context information
      enriched.context = this.getErrorContext(error, data)
      
      // Add impact assessment
      enriched.impact = this.assessErrorImpact(error, data)
      
      // Add recovery information
      enriched.recovery = this.getRecoveryInfo(error.type)
      
      // Add related errors
      enriched.relatedErrors = this.findRelatedErrors(error, errors)
      
      return enriched
    })
  }

  /**
   * Get error context information
   */
  getErrorContext(error, data) {
    const context = {
      location: error.path,
      dataType: typeof data,
      timestamp: new Date().toISOString()
    }

    // Add question-specific context
    if (error.path && error.path.includes('questions[')) {
      const match = error.path.match(/questions\[(\d+)\]/)
      if (match) {
        const questionIndex = parseInt(match[1])
        const question = data.questions?.[questionIndex]
        if (question) {
          context.questionInfo = {
            index: questionIndex,
            type: question.queType,
            hasOptions: question.options?.length || 0,
            confidence: question.confidence
          }
        }
      }
    }

    return context
  }

  /**
   * Assess error impact
   */
  assessErrorImpact(error, data) {
    const impactLevels = {
      'MISSING_QUESTION_ID': 'high',
      'INVALID_QUESTION_TEXT': 'critical',
      'INVALID_QUESTION_TYPE': 'high',
      'MISSING_MCQ_OPTIONS': 'high',
      'INVALID_CONFIDENCE': 'low',
      'DUPLICATE_QUESTION_ID': 'medium',
      'SCHEMA_VIOLATION': 'high'
    }

    const impact = impactLevels[error.type] || 'medium'
    
    return {
      level: impact,
      description: this.getImpactDescription(error.type, impact),
      affectedFeatures: this.getAffectedFeatures(error.type)
    }
  }

  /**
   * Get recovery information
   */
  getRecoveryInfo(errorType) {
    const strategy = this.recoveryStrategies.get(errorType)
    
    return {
      canAutoFix: strategy?.canAutoFix || false,
      difficulty: this.getRecoveryDifficulty(errorType),
      estimatedTime: this.getEstimatedRecoveryTime(errorType),
      requirements: this.getRecoveryRequirements(errorType)
    }
  }

  /**
   * Find related errors
   */
  findRelatedErrors(targetError, allErrors) {
    return allErrors.filter(error => 
      error !== targetError && 
      (error.path === targetError.path || 
       this.areErrorsRelated(targetError.type, error.type))
    )
  }

  /**
   * Check if errors are related
   */
  areErrorsRelated(type1, type2) {
    const relatedGroups = [
      ['MISSING_QUESTION_ID', 'DUPLICATE_QUESTION_ID'],
      ['MISSING_MCQ_OPTIONS', 'INSUFFICIENT_OPTIONS'],
      ['INVALID_QUESTION_TYPE', 'MISSING_MCQ_OPTIONS'],
      ['ENCODING_ISSUES', 'OCR_ARTIFACTS']
    ]

    return relatedGroups.some(group => 
      group.includes(type1) && group.includes(type2)
    )
  }

  /**
   * Generate recommendations based on errors
   */
  generateRecommendations(errors) {
    const recommendations = []

    // High-level recommendations
    const criticalErrors = errors.filter(e => e.severity === 'critical')
    if (criticalErrors.length > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Address Critical Errors First',
        description: 'Fix critical errors before proceeding with validation',
        actions: ['Review critical errors', 'Apply fixes', 'Re-validate data']
      })
    }

    // Auto-fix recommendations
    const autoFixableErrors = errors.filter(e => 
      this.recoveryStrategies.get(e.type)?.canAutoFix
    )
    if (autoFixableErrors.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Apply Automatic Fixes',
        description: `${autoFixableErrors.length} errors can be automatically fixed`,
        actions: ['Run auto-fix process', 'Review applied fixes', 'Validate results']
      })
    }

    // Pattern-based recommendations
    const errorTypes = [...new Set(errors.map(e => e.type))]
    if (errorTypes.includes('ENCODING_ISSUES') || errorTypes.includes('OCR_ARTIFACTS')) {
      recommendations.push({
        priority: 'medium',
        title: 'Improve Source Quality',
        description: 'Multiple text quality issues detected',
        actions: ['Check PDF quality', 'Review OCR settings', 'Consider manual review']
      })
    }

    if (errorTypes.filter(t => t.includes('CONFIDENCE')).length > 0) {
      recommendations.push({
        priority: 'low',
        title: 'Review AI Extraction Settings',
        description: 'AI confidence issues detected',
        actions: ['Adjust AI parameters', 'Review extraction quality', 'Consider re-extraction']
      })
    }

    return recommendations
  }

  /**
   * Generate auto-fix summary
   */
  generateAutoFixSummary(errors) {
    const autoFixable = errors.filter(e => 
      this.recoveryStrategies.get(e.type)?.canAutoFix
    )

    return {
      totalAutoFixable: autoFixable.length,
      byCategory: this.categorizeErrors(autoFixable),
      estimatedTime: this.calculateAutoFixTime(autoFixable),
      riskLevel: this.assessAutoFixRisk(autoFixable)
    }
  }

  /**
   * Attempt automatic recovery for fixable errors
   * @param {Array} errors - Array of validation errors
   * @param {Object} data - Data to fix
   * @returns {Object} Recovery results
   */
  attemptAutoRecovery(errors, data) {
    const results = {
      attempted: 0,
      successful: 0,
      failed: 0,
      fixes: [],
      remainingErrors: [],
      modifiedData: JSON.parse(JSON.stringify(data)) // Deep copy
    }

    errors.forEach((error, index) => {
      const strategy = this.recoveryStrategies.get(error.type)
      
      if (strategy && strategy.canAutoFix) {
        results.attempted++
        
        try {
          let targetData = results.modifiedData
          
          // Navigate to the error location
          if (error.path && error.path.includes('questions[')) {
            const match = error.path.match(/questions\[(\d+)\]/)
            if (match) {
              const questionIndex = parseInt(match[1])
              targetData = results.modifiedData.questions[questionIndex]
            }
          }

          const fixResult = strategy.strategy(targetData, index)
          
          if (fixResult.success) {
            results.successful++
            results.fixes.push({
              errorType: error.type,
              errorPath: error.path,
              fix: fixResult.message,
              timestamp: new Date().toISOString()
            })
          } else {
            results.failed++
            results.remainingErrors.push({
              ...error,
              autoFixAttempted: true,
              autoFixResult: fixResult.message
            })
          }
        } catch (fixError) {
          results.failed++
          results.remainingErrors.push({
            ...error,
            autoFixAttempted: true,
            autoFixError: fixError.message
          })
        }
      } else {
        results.remainingErrors.push(error)
      }
    })

    return results
  }

  /**
   * Generate detailed recovery report
   */
  generateRecoveryReport(recoveryResults) {
    return {
      summary: {
        totalErrors: recoveryResults.attempted + recoveryResults.remainingErrors.length,
        fixedErrors: recoveryResults.successful,
        remainingErrors: recoveryResults.remainingErrors.length,
        successRate: recoveryResults.attempted > 0 ? 
          (recoveryResults.successful / recoveryResults.attempted * 100).toFixed(1) + '%' : '0%'
      },
      appliedFixes: recoveryResults.fixes,
      remainingIssues: recoveryResults.remainingErrors,
      recommendations: this.generatePostRecoveryRecommendations(recoveryResults),
      nextSteps: this.generateNextSteps(recoveryResults)
    }
  }

  /**
   * Generate post-recovery recommendations
   */
  generatePostRecoveryRecommendations(recoveryResults) {
    const recommendations = []

    if (recoveryResults.remainingErrors.length > 0) {
      recommendations.push({
        type: 'MANUAL_REVIEW',
        priority: 'high',
        message: `${recoveryResults.remainingErrors.length} errors require manual attention`,
        actions: ['Review remaining errors', 'Apply manual fixes', 'Re-validate data']
      })
    }

    if (recoveryResults.successful > 0) {
      recommendations.push({
        type: 'VALIDATE_FIXES',
        priority: 'medium',
        message: 'Validate automatically applied fixes',
        actions: ['Review applied fixes', 'Test functionality', 'Verify data integrity']
      })
    }

    return recommendations
  }

  /**
   * Generate next steps
   */
  generateNextSteps(recoveryResults) {
    const steps = []

    if (recoveryResults.successful > 0) {
      steps.push({
        step: 1,
        title: 'Validate Applied Fixes',
        description: 'Review and test the automatically applied fixes',
        estimated_time: '5-10 minutes'
      })
    }

    if (recoveryResults.remainingErrors.length > 0) {
      steps.push({
        step: steps.length + 1,
        title: 'Address Remaining Errors',
        description: 'Manually fix errors that could not be automatically resolved',
        estimated_time: `${recoveryResults.remainingErrors.length * 2}-${recoveryResults.remainingErrors.length * 5} minutes`
      })
    }

    steps.push({
      step: steps.length + 1,
      title: 'Re-run Validation',
      description: 'Validate the corrected data to ensure all issues are resolved',
      estimated_time: '2-3 minutes'
    })

    return steps
  }

  /**
   * Helper methods
   */
  getRecoveryDescription(errorType) {
    const descriptions = {
      'MISSING_QUESTION_ID': 'Generate unique question identifier',
      'INVALID_QUESTION_TYPE': 'Infer question type from content',
      'MISSING_MCQ_OPTIONS': 'Create placeholder answer options',
      'INSUFFICIENT_OPTIONS': 'Add additional placeholder options',
      'INVALID_CONFIDENCE': 'Set default confidence score',
      'DUPLICATE_QUESTION_ID': 'Make question ID unique',
      'INVALID_MARKS_FORMAT': 'Set default marking scheme'
    }
    
    return descriptions[errorType] || 'Apply standard fix'
  }

  getManualRecoverySuggestions(errorType) {
    const suggestions = {
      'EMPTY_QUESTION_TEXT': [
        'Review source material for missing content',
        'Check if question was properly extracted',
        'Consider removing empty question'
      ],
      'ENCODING_ISSUES': [
        'Check source PDF encoding',
        'Review OCR quality settings',
        'Manually correct text encoding'
      ]
    }
    
    return suggestions[errorType] || ['Review error manually', 'Consult documentation']
  }

  getImpactDescription(errorType, level) {
    const descriptions = {
      'critical': 'Prevents system functionality',
      'high': 'Significantly affects user experience',
      'medium': 'May cause minor issues',
      'low': 'Minimal impact on functionality'
    }
    
    return descriptions[level] || 'Unknown impact'
  }

  getAffectedFeatures(errorType) {
    const featureMap = {
      'MISSING_QUESTION_ID': ['Question navigation', 'Answer tracking'],
      'INVALID_QUESTION_TEXT': ['Question display', 'Content rendering'],
      'INVALID_QUESTION_TYPE': ['Answer input', 'Scoring'],
      'MISSING_MCQ_OPTIONS': ['Answer selection', 'Option display'],
      'INVALID_CONFIDENCE': ['AI analytics', 'Quality indicators']
    }
    
    return featureMap[errorType] || ['Unknown features']
  }

  getRecoveryDifficulty(errorType) {
    const difficultyMap = {
      'MISSING_QUESTION_ID': 'easy',
      'INVALID_QUESTION_TYPE': 'medium',
      'EMPTY_QUESTION_TEXT': 'hard',
      'ENCODING_ISSUES': 'hard'
    }
    
    return difficultyMap[errorType] || 'medium'
  }

  getEstimatedRecoveryTime(errorType) {
    const timeMap = {
      'MISSING_QUESTION_ID': '< 1 minute',
      'INVALID_QUESTION_TYPE': '2-3 minutes',
      'EMPTY_QUESTION_TEXT': '5-10 minutes',
      'ENCODING_ISSUES': '10-15 minutes'
    }
    
    return timeMap[errorType] || '2-5 minutes'
  }

  getRecoveryRequirements(errorType) {
    const requirementMap = {
      'MISSING_QUESTION_ID': ['None'],
      'INVALID_QUESTION_TYPE': ['Question content analysis'],
      'EMPTY_QUESTION_TEXT': ['Source material access', 'Manual review'],
      'ENCODING_ISSUES': ['Text editing tools', 'Encoding knowledge']
    }
    
    return requirementMap[errorType] || ['Manual review']
  }

  calculateAutoFixTime(errors) {
    return `${errors.length * 0.5}-${errors.length * 1} minutes`
  }

  assessAutoFixRisk(errors) {
    const highRiskTypes = ['INVALID_QUESTION_TYPE', 'MISSING_MCQ_OPTIONS']
    const hasHighRisk = errors.some(e => highRiskTypes.includes(e.type))
    
    if (hasHighRisk) return 'medium'
    if (errors.length > 10) return 'medium'
    return 'low'
  }

  createDataSnapshot(data) {
    return {
      testName: data.testName,
      questionCount: data.questions?.length || 0,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Export error history
   */
  exportErrorHistory() {
    return {
      history: this.errorHistory,
      summary: {
        totalSessions: this.errorHistory.length,
        totalErrors: this.errorHistory.reduce((sum, session) => sum + session.errorCount, 0),
        averageErrorsPerSession: this.errorHistory.length > 0 ? 
          this.errorHistory.reduce((sum, session) => sum + session.errorCount, 0) / this.errorHistory.length : 0
      }
    }
  }
}

/**
 * Convenience functions
 */
export function reportValidationErrors(errors, data) {
  const reporter = new ValidationErrorReporter()
  return reporter.reportErrors(errors, data)
}

export function attemptErrorRecovery(errors, data) {
  const reporter = new ValidationErrorReporter()
  return reporter.attemptAutoRecovery(errors, data)
}

export default ValidationErrorReporter