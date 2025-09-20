/**
 * Confidence Scoring Algorithms and Validation Utilities
 * Provides comprehensive confidence assessment for AI-extracted questions
 */

import type { AIExtractedQuestion, AIExtractionResult } from './geminiAPIClient'

export interface ConfidenceMetrics {
  textClarity: number // 1-5: OCR text quality
  structureRecognition: number // 1-5: Question format detection
  optionsParsing: number // 1-5: Answer options extraction
  diagramDetection: number // 1-5: Diagram presence confidence
  overall: number // Weighted average of above
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  confidence: number
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion: string
  code: string
}

export interface ConfidenceWeights {
  textClarity: number
  structureRecognition: number
  optionsParsing: number
  diagramDetection: number
}

/**
 * Confidence Scoring Engine
 */
export class ConfidenceScorer {
  private weights: ConfidenceWeights = {
    textClarity: 0.3,
    structureRecognition: 0.3,
    optionsParsing: 0.25,
    diagramDetection: 0.15
  }

  /**
   * Calculate confidence metrics for a single question
   */
  calculateQuestionConfidence(question: AIExtractedQuestion): ConfidenceMetrics {
    const textClarity = this.assessTextClarity(question.text)
    const structureRecognition = this.assessStructureRecognition(question)
    const optionsParsing = this.assessOptionsParsing(question.options, question.type)
    const diagramDetection = this.assessDiagramDetection(question)

    const overall = this.calculateWeightedScore({
      textClarity,
      structureRecognition,
      optionsParsing,
      diagramDetection
    })

    return {
      textClarity,
      structureRecognition,
      optionsParsing,
      diagramDetection,
      overall: Math.round(overall * 10) / 10 // Round to 1 decimal
    }
  }

  /**
   * Calculate overall confidence for extraction result
   */
  calculateExtractionConfidence(result: AIExtractionResult): number {
    if (result.questions.length === 0) return 1

    const questionConfidences = result.questions.map(q => 
      this.calculateQuestionConfidence(q).overall
    )

    const averageConfidence = questionConfidences.reduce((sum, conf) => sum + conf, 0) / questionConfidences.length
    
    // Apply penalties for extraction-level issues
    let adjustedConfidence = averageConfidence
    
    // Penalty for low question count
    if (result.questions.length < 5) {
      adjustedConfidence *= 0.9
    }
    
    // Penalty for high diagram question ratio
    const diagramRatio = result.questions.filter(q => q.hasDiagram).length / result.questions.length
    if (diagramRatio > 0.5) {
      adjustedConfidence *= 0.95
    }
    
    // Bonus for consistent confidence across questions
    const confidenceVariance = this.calculateVariance(questionConfidences)
    if (confidenceVariance < 0.5) {
      adjustedConfidence *= 1.05
    }

    return Math.max(1, Math.min(5, Math.round(adjustedConfidence)))
  }

  /**
   * Assess text clarity based on various factors
   */
  private assessTextClarity(text: string): number {
    let score = 3 // Base score

    // Length check
    if (text.length < 10) score -= 2
    else if (text.length < 20) score -= 1
    else if (text.length > 50) score += 0.5

    // Character quality
    const alphaRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length
    if (alphaRatio > 0.7) score += 1
    else if (alphaRatio < 0.3) score -= 1

    // Special characters that indicate OCR issues
    if (text.includes('�')) score -= 2
    if (text.includes('|||')) score -= 1
    if (/[^\x00-\x7F]/.test(text) && !/[àáâãäåæçèéêëìíîïñòóôõöøùúûüý]/.test(text)) score -= 0.5

    // Proper sentence structure
    if (/^[A-Z]/.test(text.trim())) score += 0.3
    if (/[.!?]$/.test(text.trim())) score += 0.3
    if (/\b(what|how|why|when|where|which|calculate|find|determine)\b/i.test(text)) score += 0.5

    // Mathematical expressions
    if (/\$.*\$/.test(text) || /\\[a-zA-Z]+/.test(text)) score += 0.3

    return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
  }

  /**
   * Assess structure recognition quality
   */
  private assessStructureRecognition(question: AIExtractedQuestion): number {
    let score = 3 // Base score

    // Question type validation
    const validTypes = ['MCQ', 'MSQ', 'NAT', 'MSM', 'Diagram']
    if (validTypes.includes(question.type)) score += 1
    else score -= 2

    // Question numbering
    if (question.questionNumber > 0) score += 0.5
    if (question.pageNumber > 0) score += 0.3

    // Subject and section identification
    if (question.subject && question.subject !== 'Unknown') score += 0.5
    if (question.section && question.section !== 'Unknown') score += 0.5

    // Type-specific validation
    switch (question.type) {
      case 'MCQ':
        if (question.options.length >= 3 && question.options.length <= 5) score += 0.5
        else score -= 1
        break
      case 'MSQ':
        if (question.options.length >= 3) score += 0.5
        else score -= 1
        break
      case 'NAT':
        if (question.options.length === 0) score += 0.5
        else score -= 0.5
        break
      case 'MSM':
        if (question.options.length >= 4) score += 0.5
        else score -= 1
        break
    }

    return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
  }

  /**
   * Assess options parsing quality
   */
  private assessOptionsParsing(options: string[], questionType: string): number {
    let score = 3 // Base score

    if (questionType === 'NAT') {
      // Numerical questions shouldn't have options
      return options.length === 0 ? 5 : 2
    }

    // Option count validation
    if (options.length === 0) return 1
    if (options.length < 2) score -= 2
    else if (options.length >= 3 && options.length <= 5) score += 1

    // Option quality assessment
    const avgOptionLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length
    if (avgOptionLength > 5 && avgOptionLength < 100) score += 0.5
    else if (avgOptionLength <= 2) score -= 1

    // Check for proper option formatting
    const hasProperLabels = options.some(opt => /^[A-D]\)/.test(opt) || /^\([A-D]\)/.test(opt))
    if (hasProperLabels) score += 0.5

    // Check for duplicate options
    const uniqueOptions = new Set(options.map(opt => opt.toLowerCase().trim()))
    if (uniqueOptions.size < options.length) score -= 1

    // Check for empty or invalid options
    const validOptions = options.filter(opt => opt.trim().length > 0)
    if (validOptions.length < options.length) score -= 0.5

    return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
  }

  /**
   * Assess diagram detection confidence
   */
  private assessDiagramDetection(question: AIExtractedQuestion): number {
    let score = 3 // Base score

    const text = question.text.toLowerCase()
    
    // Strong diagram indicators
    const strongIndicators = [
      'figure', 'diagram', 'graph', 'chart', 'image', 'picture',
      'shown above', 'shown below', 'refer to', 'see the'
    ]
    
    const strongMatches = strongIndicators.filter(indicator => text.includes(indicator))
    score += strongMatches.length * 0.5

    // Weak diagram indicators
    const weakIndicators = ['above', 'below', 'following', 'given']
    const weakMatches = weakIndicators.filter(indicator => text.includes(indicator))
    score += weakMatches.length * 0.2

    // Mathematical expressions might indicate diagrams
    if (/\$.*\$/.test(question.text) || /\\[a-zA-Z]+/.test(question.text)) {
      score += 0.3
    }

    // Question type consideration
    if (question.type === 'Diagram') score += 1
    
    // Consistency check
    const hasIndicators = strongMatches.length > 0 || weakMatches.length > 0
    if (question.hasDiagram && !hasIndicators) score -= 1
    if (!question.hasDiagram && strongMatches.length > 0) score -= 0.5

    return Math.max(1, Math.min(5, Math.round(score * 10) / 10))
  }

  /**
   * Calculate weighted confidence score
   */
  private calculateWeightedScore(metrics: Omit<ConfidenceMetrics, 'overall'>): number {
    return (
      metrics.textClarity * this.weights.textClarity +
      metrics.structureRecognition * this.weights.structureRecognition +
      metrics.optionsParsing * this.weights.optionsParsing +
      metrics.diagramDetection * this.weights.diagramDetection
    )
  }

  /**
   * Calculate variance of confidence scores
   */
  private calculateVariance(scores: number[]): number {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length
  }

  /**
   * Update confidence weights
   */
  updateWeights(newWeights: Partial<ConfidenceWeights>): void {
    this.weights = { ...this.weights, ...newWeights }
    
    // Normalize weights to sum to 1
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0)
    Object.keys(this.weights).forEach(key => {
      this.weights[key as keyof ConfidenceWeights] /= total
    })
  }
}

/**
 * Question Validator
 */
export class QuestionValidator {
  /**
   * Validate a single question
   */
  validateQuestion(question: AIExtractedQuestion): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Required field validation
    if (!question.text || question.text.trim().length === 0) {
      errors.push({
        field: 'text',
        message: 'Question text is required',
        severity: 'error',
        code: 'MISSING_TEXT'
      })
    }

    if (!question.type) {
      errors.push({
        field: 'type',
        message: 'Question type is required',
        severity: 'error',
        code: 'MISSING_TYPE'
      })
    }

    // Type-specific validation
    if (question.type) {
      const typeValidation = this.validateQuestionType(question)
      errors.push(...typeValidation.errors)
      warnings.push(...typeValidation.warnings)
    }

    // Confidence validation
    if (question.confidence < 1 || question.confidence > 5) {
      errors.push({
        field: 'confidence',
        message: 'Confidence must be between 1 and 5',
        severity: 'error',
        code: 'INVALID_CONFIDENCE'
      })
    }

    // Low confidence warning
    if (question.confidence <= 2) {
      warnings.push({
        field: 'confidence',
        message: 'Low confidence score detected',
        suggestion: 'Consider manual review of this question',
        code: 'LOW_CONFIDENCE'
      })
    }

    // Diagram consistency check
    if (question.hasDiagram && !this.hasdiagramIndicators(question.text)) {
      warnings.push({
        field: 'hasDiagram',
        message: 'Question marked as having diagram but no indicators found',
        suggestion: 'Verify diagram flag is correct',
        code: 'DIAGRAM_INCONSISTENCY'
      })
    }

    const confidence = new ConfidenceScorer().calculateQuestionConfidence(question).overall

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    }
  }

  /**
   * Validate question type-specific requirements
   */
  private validateQuestionType(question: AIExtractedQuestion): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    switch (question.type) {
      case 'MCQ':
        if (question.options.length < 2) {
          errors.push({
            field: 'options',
            message: 'MCQ questions must have at least 2 options',
            severity: 'error',
            code: 'INSUFFICIENT_OPTIONS'
          })
        }
        if (question.options.length > 5) {
          warnings.push({
            field: 'options',
            message: 'MCQ questions typically have 4-5 options',
            suggestion: 'Consider if all options are necessary',
            code: 'TOO_MANY_OPTIONS'
          })
        }
        break

      case 'MSQ':
        if (question.options.length < 3) {
          errors.push({
            field: 'options',
            message: 'MSQ questions must have at least 3 options',
            severity: 'error',
            code: 'INSUFFICIENT_OPTIONS'
          })
        }
        break

      case 'NAT':
        if (question.options.length > 0) {
          warnings.push({
            field: 'options',
            message: 'NAT questions typically do not have options',
            suggestion: 'Consider if this should be a different question type',
            code: 'UNEXPECTED_OPTIONS'
          })
        }
        break

      case 'MSM':
        if (question.options.length < 4) {
          errors.push({
            field: 'options',
            message: 'MSM questions must have at least 4 options for matching',
            severity: 'error',
            code: 'INSUFFICIENT_OPTIONS'
          })
        }
        break
    }

    return { errors, warnings }
  }

  /**
   * Check for diagram indicators in text
   */
  private hasdiagramIndicators(text: string): boolean {
    const indicators = [
      'figure', 'diagram', 'graph', 'chart', 'image', 'picture',
      'shown', 'above', 'below', 'refer', 'see the', 'following'
    ]
    
    const lowerText = text.toLowerCase()
    return indicators.some(indicator => lowerText.includes(indicator))
  }

  /**
   * Validate entire extraction result
   */
  validateExtractionResult(result: AIExtractionResult): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check if any questions were extracted
    if (result.questions.length === 0) {
      errors.push({
        field: 'questions',
        message: 'No questions were extracted from the PDF',
        severity: 'error',
        code: 'NO_QUESTIONS'
      })
    }

    // Validate each question
    let totalConfidence = 0
    let validQuestions = 0

    result.questions.forEach((question, index) => {
      const validation = this.validateQuestion(question)
      
      if (validation.isValid) {
        validQuestions++
        totalConfidence += validation.confidence
      }

      // Add question-specific errors with context
      validation.errors.forEach(error => {
        errors.push({
          ...error,
          field: `questions[${index}].${error.field}`,
          message: `Question ${index + 1}: ${error.message}`
        })
      })

      validation.warnings.forEach(warning => {
        warnings.push({
          ...warning,
          field: `questions[${index}].${warning.field}`,
          message: `Question ${index + 1}: ${warning.message}`
        })
      })
    })

    // Overall confidence check
    const averageConfidence = validQuestions > 0 ? totalConfidence / validQuestions : 0
    
    if (averageConfidence < 2.5) {
      warnings.push({
        field: 'overall',
        message: 'Low overall confidence in extraction quality',
        suggestion: 'Consider manual review of all questions',
        code: 'LOW_OVERALL_CONFIDENCE'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: averageConfidence
    }
  }
}

/**
 * Utility functions for confidence scoring
 */
export const confidenceUtils = {
  /**
   * Get confidence level description
   */
  getConfidenceDescription(score: number): string {
    if (score >= 4.5) return 'Excellent'
    if (score >= 3.5) return 'Good'
    if (score >= 2.5) return 'Fair'
    if (score >= 1.5) return 'Poor'
    return 'Very Poor'
  },

  /**
   * Get confidence color for UI
   */
  getConfidenceColor(score: number): string {
    if (score >= 4) return '#22c55e' // green
    if (score >= 3) return '#eab308' // yellow
    if (score >= 2) return '#f97316' // orange
    return '#ef4444' // red
  },

  /**
   * Determine if manual review is required
   */
  requiresManualReview(question: AIExtractedQuestion): boolean {
    return question.confidence <= 2 || question.hasDiagram
  },

  /**
   * Calculate confidence trend
   */
  calculateConfidenceTrend(questions: AIExtractedQuestion[]): 'improving' | 'declining' | 'stable' {
    if (questions.length < 3) return 'stable'

    const firstHalf = questions.slice(0, Math.floor(questions.length / 2))
    const secondHalf = questions.slice(Math.floor(questions.length / 2))

    const firstAvg = firstHalf.reduce((sum, q) => sum + q.confidence, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, q) => sum + q.confidence, 0) / secondHalf.length

    const difference = secondAvg - firstAvg

    if (difference > 0.3) return 'improving'
    if (difference < -0.3) return 'declining'
    return 'stable'
  }
}

/**
 * Factory functions
 */
export function createConfidenceScorer(weights?: Partial<ConfidenceWeights>): ConfidenceScorer {
  const scorer = new ConfidenceScorer()
  if (weights) {
    scorer.updateWeights(weights)
  }
  return scorer
}

export function createQuestionValidator(): QuestionValidator {
  return new QuestionValidator()
}