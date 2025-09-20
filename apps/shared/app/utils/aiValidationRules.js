/**
 * AI-specific validation rules for extracted question data
 * Provides specialized validation for AI extraction quality and accuracy
 */

export class AIValidationRules {
  constructor() {
    this.confidenceThresholds = {
      excellent: 4.5,
      good: 3.5,
      fair: 2.5,
      poor: 1.5
    }
  }

  /**
   * Validate AI extraction quality
   * @param {Object} question - Question object with AI metadata
   * @returns {Object} Validation result with quality assessment
   */
  validateExtractionQuality(question) {
    const issues = []
    const recommendations = []
    let qualityScore = 5

    // Confidence score validation
    if (question.confidence) {
      if (question.confidence < this.confidenceThresholds.poor) {
        issues.push({
          type: 'LOW_CONFIDENCE',
          severity: 'error',
          message: 'Very low AI confidence score indicates potential extraction errors',
          suggestion: 'Manual review required'
        })
        qualityScore -= 2
      } else if (question.confidence < this.confidenceThresholds.fair) {
        issues.push({
          type: 'MEDIUM_CONFIDENCE',
          severity: 'warning',
          message: 'Medium confidence score suggests possible inaccuracies',
          suggestion: 'Review question text and options'
        })
        qualityScore -= 1
      }
    } else {
      issues.push({
        type: 'MISSING_CONFIDENCE',
        severity: 'warning',
        message: 'No confidence score available',
        suggestion: 'Add confidence scoring to AI extraction'
      })
    }

    // Text quality validation
    this.validateTextQuality(question, issues, recommendations)

    // Options quality validation
    if (['mcq', 'msq'].includes(question.queType)) {
      this.validateOptionsQuality(question, issues, recommendations)
    }

    // Diagram detection validation
    this.validateDiagramDetection(question, issues, recommendations)

    // Structure validation
    this.validateQuestionStructure(question, issues, recommendations)

    return {
      qualityScore: Math.max(1, qualityScore),
      issues,
      recommendations,
      needsReview: issues.some(i => i.severity === 'error') || qualityScore < 3
    }
  }

  /**
   * Validate text quality
   */
  validateTextQuality(question, issues, recommendations) {
    const text = question.queText

    // Length validation
    if (text.length < 20) {
      issues.push({
        type: 'SHORT_QUESTION_TEXT',
        severity: 'warning',
        message: 'Question text is very short',
        suggestion: 'Verify complete question was extracted'
      })
    }

    if (text.length > 1000) {
      issues.push({
        type: 'LONG_QUESTION_TEXT',
        severity: 'warning',
        message: 'Question text is very long',
        suggestion: 'Check for merged questions or extra content'
      })
    }

    // Character encoding issues
    if (this.hasEncodingIssues(text)) {
      issues.push({
        type: 'ENCODING_ISSUES',
        severity: 'error',
        message: 'Text contains encoding issues or special characters',
        suggestion: 'Clean up text encoding'
      })
    }

    // Incomplete sentences
    if (this.hasIncompleteSentences(text)) {
      issues.push({
        type: 'INCOMPLETE_SENTENCES',
        severity: 'warning',
        message: 'Question text may contain incomplete sentences',
        suggestion: 'Review for missing text'
      })
    }

    // Mathematical notation
    if (this.containsMathNotation(text)) {
      recommendations.push({
        type: 'MATH_NOTATION',
        message: 'Question contains mathematical notation',
        suggestion: 'Ensure MathJax rendering is enabled'
      })
    }

    // OCR artifacts
    if (this.hasOCRArtifacts(text)) {
      issues.push({
        type: 'OCR_ARTIFACTS',
        severity: 'warning',
        message: 'Text may contain OCR artifacts',
        suggestion: 'Review for scanning errors'
      })
    }
  }

  /**
   * Validate options quality
   */
  validateOptionsQuality(question, issues, recommendations) {
    if (!question.options || !Array.isArray(question.options)) {
      issues.push({
        type: 'MISSING_OPTIONS',
        severity: 'error',
        message: 'Question options are missing or invalid',
        suggestion: 'Extract options from source material'
      })
      return
    }

    const options = question.options

    // Option count validation
    if (options.length < 2) {
      issues.push({
        type: 'INSUFFICIENT_OPTIONS',
        severity: 'error',
        message: 'Not enough answer options',
        suggestion: 'Add missing options'
      })
    }

    if (options.length > 6) {
      issues.push({
        type: 'TOO_MANY_OPTIONS',
        severity: 'warning',
        message: 'Unusually high number of options',
        suggestion: 'Verify all options are valid'
      })
    }

    // Option quality validation
    options.forEach((option, index) => {
      if (!option || option.trim().length === 0) {
        issues.push({
          type: 'EMPTY_OPTION',
          severity: 'error',
          message: `Option ${index + 1} is empty`,
          suggestion: 'Add content to empty option'
        })
      }

      if (option.length < 2) {
        issues.push({
          type: 'SHORT_OPTION',
          severity: 'warning',
          message: `Option ${index + 1} is very short`,
          suggestion: 'Verify option completeness'
        })
      }

      if (this.hasEncodingIssues(option)) {
        issues.push({
          type: 'OPTION_ENCODING_ISSUES',
          severity: 'error',
          message: `Option ${index + 1} has encoding issues`,
          suggestion: 'Fix text encoding'
        })
      }
    })

    // Duplicate options
    const duplicates = this.findDuplicateOptions(options)
    if (duplicates.length > 0) {
      issues.push({
        type: 'DUPLICATE_OPTIONS',
        severity: 'error',
        message: 'Duplicate answer options found',
        suggestion: 'Remove or modify duplicate options'
      })
    }

    // Option similarity
    const similarOptions = this.findSimilarOptions(options)
    if (similarOptions.length > 0) {
      issues.push({
        type: 'SIMILAR_OPTIONS',
        severity: 'warning',
        message: 'Very similar answer options found',
        suggestion: 'Review for potential duplicates'
      })
    }
  }

  /**
   * Validate diagram detection
   */
  validateDiagramDetection(question, issues, recommendations) {
    if (question.hasDiagram === true) {
      recommendations.push({
        type: 'DIAGRAM_PRESENT',
        message: 'Question references a diagram',
        suggestion: 'Ensure diagram is available for display'
      })

      // Check if question text references diagram
      if (!this.textReferencesDiagram(question.queText)) {
        issues.push({
          type: 'DIAGRAM_FLAG_MISMATCH',
          severity: 'warning',
          message: 'Diagram flag set but no diagram reference in text',
          suggestion: 'Verify diagram detection accuracy'
        })
      }
    } else if (this.textReferencesDiagram(question.queText)) {
      issues.push({
        type: 'MISSED_DIAGRAM',
        severity: 'warning',
        message: 'Text references diagram but flag not set',
        suggestion: 'Review diagram detection'
      })
    }
  }

  /**
   * Validate question structure
   */
  validateQuestionStructure(question, issues, recommendations) {
    // Question numbering
    if (this.hasQuestionNumbering(question.queText)) {
      recommendations.push({
        type: 'QUESTION_NUMBERING',
        message: 'Question text contains numbering',
        suggestion: 'Consider removing question numbers from text'
      })
    }

    // Multiple questions in one
    if (this.containsMultipleQuestions(question.queText)) {
      issues.push({
        type: 'MULTIPLE_QUESTIONS',
        severity: 'error',
        message: 'Text appears to contain multiple questions',
        suggestion: 'Split into separate questions'
      })
    }

    // Answer key in question
    if (this.containsAnswerKey(question.queText)) {
      issues.push({
        type: 'ANSWER_IN_QUESTION',
        severity: 'error',
        message: 'Question text contains answer information',
        suggestion: 'Remove answer from question text'
      })
    }

    // Formatting issues
    if (this.hasFormattingIssues(question.queText)) {
      issues.push({
        type: 'FORMATTING_ISSUES',
        severity: 'warning',
        message: 'Question has formatting issues',
        suggestion: 'Clean up text formatting'
      })
    }
  }

  /**
   * Validate compatibility with legacy formats
   */
  validateLegacyCompatibility(question) {
    const issues = []
    const compatibility = {
      canConvert: true,
      requiredChanges: []
    }

    // Check required fields for legacy format
    const requiredFields = ['queId', 'queText', 'queType']
    requiredFields.forEach(field => {
      if (!question[field]) {
        issues.push({
          type: 'MISSING_LEGACY_FIELD',
          severity: 'error',
          message: `Missing required field for legacy compatibility: ${field}`,
          suggestion: `Add ${field} field`
        })
        compatibility.canConvert = false
      }
    })

    // Check question type compatibility
    const legacyTypes = ['mcq', 'msq', 'nat']
    if (!legacyTypes.includes(question.queType)) {
      issues.push({
        type: 'INCOMPATIBLE_QUESTION_TYPE',
        severity: 'warning',
        message: `Question type ${question.queType} not supported in legacy format`,
        suggestion: 'Convert to supported type or handle separately'
      })
      compatibility.requiredChanges.push('question_type_conversion')
    }

    // Check for AI-specific fields that won't transfer
    const aiFields = ['confidence', 'hasDiagram', 'extractionMetadata']
    aiFields.forEach(field => {
      if (question[field]) {
        compatibility.requiredChanges.push(`remove_${field}`)
      }
    })

    return {
      issues,
      compatibility,
      isCompatible: compatibility.canConvert
    }
  }

  /**
   * Helper methods for text analysis
   */
  hasEncodingIssues(text) {
    // Check for common encoding issues
    const encodingPatterns = [
      /â€™/g, // Smart quote issues
      /â€œ/g, // Smart quote issues
      /â€/g,  // Smart quote issues
      /Ã¡/g,  // Accented character issues
      /Ã©/g,  // Accented character issues
      /\uFFFD/g // Replacement character
    ]
    
    return encodingPatterns.some(pattern => pattern.test(text))
  }

  hasIncompleteSentences(text) {
    // Check for sentences that don't end properly
    const sentences = text.split(/[.!?]+/)
    return sentences.some(sentence => {
      const trimmed = sentence.trim()
      return trimmed.length > 0 && trimmed.length < 10 && !trimmed.match(/^\d+[a-z]?$/)
    })
  }

  containsMathNotation(text) {
    // Check for mathematical notation patterns
    const mathPatterns = [
      /\$.*?\$/g, // LaTeX math
      /\\[a-zA-Z]+/g, // LaTeX commands
      /\b\d+\/\d+\b/g, // Fractions
      /[∑∏∫√π∞≤≥≠±]/g, // Math symbols
      /\b[a-z]\^[0-9]+\b/g // Exponents
    ]
    
    return mathPatterns.some(pattern => pattern.test(text))
  }

  hasOCRArtifacts(text) {
    // Check for common OCR artifacts
    const ocrPatterns = [
      /[Il1|]{2,}/g, // Confused characters
      /[O0]{3,}/g, // Confused zeros/Os
      /\s{3,}/g, // Excessive whitespace
      /[^\w\s.,!?;:()\-'"]/g // Unusual characters
    ]
    
    return ocrPatterns.some(pattern => pattern.test(text))
  }

  findDuplicateOptions(options) {
    const seen = new Set()
    const duplicates = []
    
    options.forEach(option => {
      const normalized = option.toLowerCase().trim()
      if (seen.has(normalized)) {
        duplicates.push(option)
      } else {
        seen.add(normalized)
      }
    })
    
    return duplicates
  }

  findSimilarOptions(options) {
    const similar = []
    
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const similarity = this.calculateSimilarity(options[i], options[j])
        if (similarity > 0.8) {
          similar.push([options[i], options[j]])
        }
      }
    }
    
    return similar
  }

  calculateSimilarity(str1, str2) {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  levenshteinDistance(str1, str2) {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  textReferencesDiagram(text) {
    const diagramKeywords = [
      'figure', 'diagram', 'chart', 'graph', 'image', 'picture',
      'shown above', 'shown below', 'refer to', 'see figure',
      'as shown', 'illustration', 'drawing'
    ]
    
    const lowerText = text.toLowerCase()
    return diagramKeywords.some(keyword => lowerText.includes(keyword))
  }

  hasQuestionNumbering(text) {
    // Check for question numbering patterns
    const numberingPatterns = [
      /^\s*\d+[\.)]\s*/,
      /^\s*[A-Z][\.)]\s*/,
      /^\s*[ivx]+[\.)]\s*/i
    ]
    
    return numberingPatterns.some(pattern => pattern.test(text))
  }

  containsMultipleQuestions(text) {
    // Check for multiple question indicators
    const questionIndicators = text.match(/\?/g)
    if (questionIndicators && questionIndicators.length > 1) {
      return true
    }
    
    // Check for numbered sub-questions
    const subQuestionPattern = /\b[a-z]\)\s*[A-Z]/g
    return subQuestionPattern.test(text)
  }

  containsAnswerKey(text) {
    // Check for answer key patterns
    const answerPatterns = [
      /answer\s*[:=]\s*[a-d]/i,
      /correct\s*[:=]\s*[a-d]/i,
      /solution\s*[:=]/i,
      /\b[a-d]\s*is\s*correct/i
    ]
    
    return answerPatterns.some(pattern => pattern.test(text))
  }

  hasFormattingIssues(text) {
    // Check for formatting issues
    const formattingIssues = [
      /\s{2,}/g, // Multiple spaces
      /\n{3,}/g, // Multiple line breaks
      /[^\w\s.,!?;:()\-'"]/g // Unusual characters
    ]
    
    return formattingIssues.some(pattern => pattern.test(text))
  }
}

/**
 * Batch validation for multiple questions
 */
export function validateAIQuestionBatch(questions) {
  const validator = new AIValidationRules()
  const results = []
  
  questions.forEach((question, index) => {
    const result = validator.validateExtractionQuality(question)
    results.push({
      questionIndex: index,
      questionId: question.queId,
      ...result
    })
  })
  
  return {
    results,
    summary: {
      totalQuestions: questions.length,
      questionsNeedingReview: results.filter(r => r.needsReview).length,
      averageQualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
      totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
      criticalIssues: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0)
    }
  }
}

export default AIValidationRules