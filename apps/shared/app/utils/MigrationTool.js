/**
 * Migration Tool for Legacy ZIP to AI JSON Conversion
 * Converts existing ZIP-based test files to AI JSON format with validation and integrity checking
 */

import JSZip from 'jszip'
import { JSONValidator } from './JSONValidator.js'
import { FormatCompatibilityChecker } from './formatCompatibilityChecker.js'

export class MigrationTool {
  constructor() {
    this.validator = new JSONValidator()
    this.compatibilityChecker = new FormatCompatibilityChecker()
    this.migrationHistory = []
    this.supportedFormats = ['zip', 'json', 'csv']
  }

  /**
   * Migrate a single ZIP file to AI JSON format
   * @param {File|ArrayBuffer} zipFile - ZIP file to migrate
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async migrateZipToAIJSON(zipFile, options = {}) {
    const migrationId = this.generateMigrationId()
    const startTime = Date.now()

    try {
      // Parse ZIP file
      const zipData = await this.parseZipFile(zipFile)
      
      // Extract and validate ZIP contents
      const extractedData = await this.extractZipContents(zipData)
      
      // Convert to AI JSON format
      const aiJsonData = await this.convertToAIJSON(extractedData, options)
      
      // Validate converted data
      const validationResult = this.validator.validate(aiJsonData)
      
      // Check compatibility
      const compatibilityResult = this.compatibilityChecker.checkCompatibility(aiJsonData, 'zip')
      
      // Generate migration report
      const migrationResult = {
        migrationId,
        success: true,
        processingTime: Date.now() - startTime,
        originalData: extractedData,
        convertedData: aiJsonData,
        validation: validationResult,
        compatibility: compatibilityResult,
        statistics: this.generateMigrationStatistics(extractedData, aiJsonData),
        warnings: [],
        errors: []
      }

      // Add warnings for any issues
      if (!validationResult.isValid) {
        migrationResult.warnings.push({
          type: 'VALIDATION_ISSUES',
          message: `Converted data has ${validationResult.errors.length} validation errors`,
          details: validationResult.errors
        })
      }

      // Store migration history
      this.migrationHistory.push({
        migrationId,
        timestamp: new Date().toISOString(),
        success: true,
        statistics: migrationResult.statistics
      })

      return migrationResult

    } catch (error) {
      const migrationResult = {
        migrationId,
        success: false,
        processingTime: Date.now() - startTime,
        error: error.message,
        errors: [{
          type: 'MIGRATION_ERROR',
          message: error.message,
          stack: error.stack
        }]
      }

      this.migrationHistory.push({
        migrationId,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      })

      return migrationResult
    }
  }

  /**
   * Parse ZIP file contents
   */
  async parseZipFile(zipFile) {
    const zip = new JSZip()
    
    try {
      const zipData = await zip.loadAsync(zipFile)
      return zipData
    } catch (error) {
      throw new Error(`Failed to parse ZIP file: ${error.message}`)
    }
  }

  /**
   * Extract contents from ZIP file
   */
  async extractZipContents(zipData) {
    const contents = {
      questions: null,
      config: null,
      metadata: null,
      images: [],
      otherFiles: []
    }

    // Extract questions.json
    const questionsFile = zipData.file('questions.json')
    if (questionsFile) {
      try {
        const questionsText = await questionsFile.async('text')
        contents.questions = JSON.parse(questionsText)
      } catch (error) {
        throw new Error(`Failed to parse questions.json: ${error.message}`)
      }
    } else {
      throw new Error('questions.json not found in ZIP file')
    }

    // Extract config.json
    const configFile = zipData.file('config.json')
    if (configFile) {
      try {
        const configText = await configFile.async('text')
        contents.config = JSON.parse(configText)
      } catch (error) {
        console.warn('Failed to parse config.json:', error.message)
        contents.config = {}
      }
    }

    // Extract metadata.json (optional)
    const metadataFile = zipData.file('metadata.json')
    if (metadataFile) {
      try {
        const metadataText = await metadataFile.async('text')
        contents.metadata = JSON.parse(metadataText)
      } catch (error) {
        console.warn('Failed to parse metadata.json:', error.message)
      }
    }

    // Extract images
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg']
    zipData.forEach((relativePath, file) => {
      const extension = relativePath.toLowerCase().substring(relativePath.lastIndexOf('.'))
      if (imageExtensions.includes(extension)) {
        contents.images.push({
          path: relativePath,
          file: file
        })
      } else if (!['questions.json', 'config.json', 'metadata.json'].includes(relativePath)) {
        contents.otherFiles.push({
          path: relativePath,
          file: file
        })
      }
    })

    return contents
  }

  /**
   * Convert extracted ZIP data to AI JSON format
   */
  async convertToAIJSON(extractedData, options = {}) {
    const { questions, config, metadata } = extractedData
    
    if (!questions) {
      throw new Error('No questions data found in ZIP file')
    }

    // Create AI JSON structure
    const aiJsonData = {
      schemaVersion: '2.0',
      testName: this.extractTestName(config, metadata, options),
      testSections: this.convertTestSections(config, questions),
      questions: await this.convertQuestions(questions, extractedData, options),
      extractionMetadata: this.generateExtractionMetadata(extractedData, options),
      migrationMetadata: this.generateMigrationMetadata(extractedData, options)
    }

    // Add optional fields
    if (config?.testDuration) {
      aiJsonData.testDuration = config.testDuration
    }

    if (config?.instructions) {
      aiJsonData.instructions = config.instructions
    }

    if (metadata?.subject) {
      aiJsonData.subject = metadata.subject
    }

    if (metadata?.difficulty) {
      aiJsonData.difficulty = metadata.difficulty
    }

    return aiJsonData
  }

  /**
   * Extract test name from various sources
   */
  extractTestName(config, metadata, options) {
    // Priority order: options > config > metadata > default
    if (options.testName) {
      return options.testName
    }

    if (config?.testName) {
      return config.testName
    }

    if (config?.name) {
      return config.name
    }

    if (metadata?.testName) {
      return metadata.testName
    }

    if (metadata?.title) {
      return metadata.title
    }

    // Generate default name
    return `Migrated Test ${new Date().toISOString().split('T')[0]}`
  }

  /**
   * Convert test sections from legacy format
   */
  convertTestSections(config, questions) {
    const sections = []

    // If config has sections, use them
    if (config?.sections && Array.isArray(config.sections)) {
      config.sections.forEach(section => {
        sections.push({
          name: section.name || section.title || 'Unnamed Section',
          questionCount: section.questionCount || 0,
          timeLimit: section.timeLimit,
          instructions: section.instructions
        })
      })
    } else {
      // Create default section based on questions
      const questionCount = Array.isArray(questions) ? questions.length : 
                           (questions.questions ? questions.questions.length : 0)
      
      sections.push({
        name: 'General',
        questionCount: questionCount,
        timeLimit: config?.testDuration
      })
    }

    return sections
  }

  /**
   * Convert questions from legacy format to AI JSON format
   */
  async convertQuestions(questionsData, extractedData, options) {
    let questionsList = []

    // Handle different question data structures
    if (Array.isArray(questionsData)) {
      questionsList = questionsData
    } else if (questionsData.questions && Array.isArray(questionsData.questions)) {
      questionsList = questionsData.questions
    } else if (typeof questionsData === 'object') {
      // Handle object with question keys
      questionsList = Object.values(questionsData)
    } else {
      throw new Error('Invalid questions data structure')
    }

    const convertedQuestions = []

    for (let i = 0; i < questionsList.length; i++) {
      const question = questionsList[i]
      const convertedQuestion = await this.convertSingleQuestion(question, i, extractedData, options)
      convertedQuestions.push(convertedQuestion)
    }

    return convertedQuestions
  }

  /**
   * Convert a single question to AI JSON format
   */
  async convertSingleQuestion(question, index, extractedData, options) {
    const converted = {
      queId: this.generateQuestionId(question, index),
      queText: this.cleanQuestionText(question.queText || question.text || question.question),
      queType: this.normalizeQuestionType(question.queType || question.type),
      subject: question.subject || options.defaultSubject || 'General',
      section: question.section || 'General',
      pageNumber: question.pageNumber || index + 1
    }

    // Convert options based on question type
    if (['mcq', 'msq'].includes(converted.queType)) {
      converted.options = this.convertQuestionOptions(question)
    }

    // Convert answer
    if (question.queAnswer !== undefined || question.answer !== undefined) {
      converted.queAnswer = this.convertQuestionAnswer(
        question.queAnswer || question.answer, 
        converted.queType
      )
    }

    // Convert marks
    if (question.queMarks || question.marks) {
      converted.queMarks = this.convertQuestionMarks(question.queMarks || question.marks)
    } else {
      // Set default marks
      converted.queMarks = { cm: 1, im: 0 }
    }

    // Add AI-specific fields with default values
    converted.confidence = this.estimateConfidence(question, options)
    converted.hasDiagram = this.detectDiagram(question, extractedData)

    // Add extraction metadata
    converted.extractionMetadata = {
      migrationSource: 'legacy_zip',
      originalFormat: this.detectOriginalFormat(question),
      migrationTimestamp: new Date().toISOString(),
      dataQuality: this.assessDataQuality(question)
    }

    // Add optional fields
    if (question.difficulty) {
      converted.difficulty = question.difficulty
    }

    if (question.tags) {
      converted.tags = Array.isArray(question.tags) ? question.tags : [question.tags]
    }

    if (question.timeLimit) {
      converted.timeLimit = question.timeLimit
    }

    return converted
  }

  /**
   * Generate question ID
   */
  generateQuestionId(question, index) {
    if (question.queId) {
      return question.queId
    }

    if (question.id) {
      return question.id
    }

    if (question.questionId) {
      return question.questionId
    }

    // Generate ID based on index
    return `q_${index + 1}_${Date.now()}`
  }

  /**
   * Clean question text
   */
  cleanQuestionText(text) {
    if (!text || typeof text !== 'string') {
      return 'Question text not available'
    }

    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim()

    // Remove question numbering if present
    cleaned = cleaned.replace(/^\s*\d+[\.)]\s*/, '')
    cleaned = cleaned.replace(/^\s*[A-Z][\.)]\s*/, '')

    // Remove common prefixes
    cleaned = cleaned.replace(/^(Question|Q):\s*/i, '')

    return cleaned
  }

  /**
   * Normalize question type
   */
  normalizeQuestionType(type) {
    if (!type) return 'mcq'

    const typeMap = {
      'multiple-choice': 'mcq',
      'single-choice': 'mcq',
      'multi-choice': 'mcq',
      'multiple-select': 'msq',
      'multi-select': 'msq',
      'numerical': 'nat',
      'numeric': 'nat',
      'number': 'nat',
      'matching': 'msm',
      'match': 'msm'
    }

    const normalized = type.toLowerCase().replace(/[_-]/g, '')
    return typeMap[normalized] || type.toLowerCase()
  }

  /**
   * Convert question options
   */
  convertQuestionOptions(question) {
    let options = []

    // Handle different option formats
    if (question.options && Array.isArray(question.options)) {
      options = question.options
    } else if (question.choices && Array.isArray(question.choices)) {
      options = question.choices
    } else if (question.answers && Array.isArray(question.answers)) {
      options = question.answers
    } else if (typeof question.options === 'object') {
      // Handle object format like {A: "Option A", B: "Option B"}
      options = Object.values(question.options)
    } else {
      // Generate default options
      options = ['Option A', 'Option B', 'Option C', 'Option D']
    }

    // Clean and validate options
    return options.map((option, index) => {
      if (typeof option === 'string') {
        return option.trim()
      } else if (typeof option === 'object' && option.text) {
        return option.text.trim()
      } else {
        return `Option ${String.fromCharCode(65 + index)}`
      }
    }).filter(option => option.length > 0)
  }

  /**
   * Convert question answer
   */
  convertQuestionAnswer(answer, questionType) {
    if (answer === null || answer === undefined) {
      return null
    }

    switch (questionType) {
      case 'mcq':
        // Convert to zero-based index
        if (typeof answer === 'number') {
          return answer
        } else if (typeof answer === 'string') {
          // Handle letter answers (A, B, C, D)
          const letterMatch = answer.match(/^[A-Z]$/i)
          if (letterMatch) {
            return letterMatch[0].toUpperCase().charCodeAt(0) - 65
          }
          // Handle numeric strings
          const numMatch = answer.match(/^\d+$/)
          if (numMatch) {
            return parseInt(answer) - 1 // Convert to zero-based
          }
        }
        return 0 // Default to first option

      case 'msq':
        if (Array.isArray(answer)) {
          return answer.map(a => {
            if (typeof a === 'number') return a
            if (typeof a === 'string' && a.match(/^[A-Z]$/i)) {
              return a.toUpperCase().charCodeAt(0) - 65
            }
            return 0
          })
        } else if (typeof answer === 'string') {
          // Handle comma-separated answers like "A,C,D"
          return answer.split(',').map(a => {
            const trimmed = a.trim()
            if (trimmed.match(/^[A-Z]$/i)) {
              return trimmed.toUpperCase().charCodeAt(0) - 65
            }
            return 0
          })
        }
        return [0] // Default array

      case 'nat':
        if (typeof answer === 'number') {
          return answer
        } else if (typeof answer === 'string') {
          const parsed = parseFloat(answer)
          return isNaN(parsed) ? answer : parsed
        }
        return answer

      default:
        return answer
    }
  }

  /**
   * Convert question marks
   */
  convertQuestionMarks(marks) {
    if (typeof marks === 'number') {
      return { cm: marks, im: 0 }
    }

    if (typeof marks === 'object') {
      return {
        cm: marks.correct || marks.cm || marks.positive || 1,
        im: marks.incorrect || marks.im || marks.negative || 0
      }
    }

    if (typeof marks === 'string') {
      // Handle formats like "+4/-1" or "4/1"
      const match = marks.match(/([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)/)
      if (match) {
        return {
          cm: parseFloat(match[1]),
          im: parseFloat(match[2])
        }
      }
    }

    return { cm: 1, im: 0 }
  }

  /**
   * Estimate confidence score for migrated questions
   */
  estimateConfidence(question, options) {
    let confidence = 3.0 // Default medium confidence

    // Increase confidence for well-structured questions
    if (question.queText && question.queText.length > 20) {
      confidence += 0.5
    }

    if (question.options && Array.isArray(question.options) && question.options.length >= 3) {
      confidence += 0.3
    }

    if (question.queAnswer !== undefined) {
      confidence += 0.2
    }

    // Decrease confidence for potential issues
    if (!question.queText || question.queText.length < 10) {
      confidence -= 1.0
    }

    if (question.queText && this.hasEncodingIssues(question.queText)) {
      confidence -= 0.5
    }

    // Apply user-specified confidence if provided
    if (options.defaultConfidence) {
      confidence = options.defaultConfidence
    }

    return Math.max(1, Math.min(5, confidence))
  }

  /**
   * Detect if question has diagram
   */
  detectDiagram(question, extractedData) {
    // Check question text for diagram references
    if (question.queText) {
      const diagramKeywords = [
        'figure', 'diagram', 'chart', 'graph', 'image', 'picture',
        'shown above', 'shown below', 'refer to', 'see figure',
        'as shown', 'illustration', 'drawing'
      ]
      
      const lowerText = question.queText.toLowerCase()
      if (diagramKeywords.some(keyword => lowerText.includes(keyword))) {
        return true
      }
    }

    // Check if there are images in the ZIP
    if (extractedData.images && extractedData.images.length > 0) {
      // Simple heuristic: if there are images and question mentions visual elements
      if (question.queText && /\b(see|look|observe|shown|display)\b/i.test(question.queText)) {
        return true
      }
    }

    return false
  }

  /**
   * Detect original format
   */
  detectOriginalFormat(question) {
    if (question.queId && question.queText && question.queType) {
      return 'structured_json'
    } else if (question.text || question.question) {
      return 'simple_json'
    } else {
      return 'unknown'
    }
  }

  /**
   * Assess data quality
   */
  assessDataQuality(question) {
    let score = 5

    if (!question.queText || question.queText.length < 10) score -= 2
    if (!question.queType) score -= 1
    if (['mcq', 'msq'].includes(question.queType) && (!question.options || question.options.length < 2)) score -= 2
    if (question.queAnswer === undefined) score -= 1

    return Math.max(1, score)
  }

  /**
   * Generate extraction metadata
   */
  generateExtractionMetadata(extractedData, options) {
    return {
      extractionMethod: 'legacy_migration',
      migrationTool: 'MigrationTool v1.0',
      migrationTimestamp: new Date().toISOString(),
      sourceFormat: 'zip',
      originalFileCount: this.countOriginalFiles(extractedData),
      migrationOptions: {
        preserveOriginalIds: options.preserveOriginalIds !== false,
        estimateConfidence: options.estimateConfidence !== false,
        detectDiagrams: options.detectDiagrams !== false
      }
    }
  }

  /**
   * Generate migration metadata
   */
  generateMigrationMetadata(extractedData, options) {
    return {
      migrationId: this.generateMigrationId(),
      migrationDate: new Date().toISOString(),
      sourceFiles: {
        questionsJson: !!extractedData.questions,
        configJson: !!extractedData.config,
        metadataJson: !!extractedData.metadata,
        imageCount: extractedData.images?.length || 0,
        otherFileCount: extractedData.otherFiles?.length || 0
      },
      migrationSettings: options,
      dataTransformations: this.getAppliedTransformations(extractedData, options)
    }
  }

  /**
   * Count original files
   */
  countOriginalFiles(extractedData) {
    let count = 0
    if (extractedData.questions) count++
    if (extractedData.config) count++
    if (extractedData.metadata) count++
    count += extractedData.images?.length || 0
    count += extractedData.otherFiles?.length || 0
    return count
  }

  /**
   * Get applied transformations
   */
  getAppliedTransformations(extractedData, options) {
    const transformations = []

    transformations.push('question_id_generation')
    transformations.push('question_text_cleaning')
    transformations.push('question_type_normalization')
    transformations.push('answer_format_conversion')
    transformations.push('confidence_estimation')
    transformations.push('diagram_detection')

    if (options.cleanText !== false) {
      transformations.push('text_cleaning')
    }

    if (options.normalizeTypes !== false) {
      transformations.push('type_normalization')
    }

    return transformations
  }

  /**
   * Generate migration statistics
   */
  generateMigrationStatistics(originalData, convertedData) {
    const stats = {
      originalQuestionCount: 0,
      convertedQuestionCount: convertedData.questions?.length || 0,
      questionTypes: {},
      averageConfidence: 0,
      diagramQuestions: 0,
      dataQualityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }

    // Count original questions
    if (Array.isArray(originalData.questions)) {
      stats.originalQuestionCount = originalData.questions.length
    } else if (originalData.questions?.questions) {
      stats.originalQuestionCount = originalData.questions.questions.length
    }

    // Analyze converted questions
    if (convertedData.questions) {
      let totalConfidence = 0
      
      convertedData.questions.forEach(question => {
        // Count question types
        const type = question.queType
        stats.questionTypes[type] = (stats.questionTypes[type] || 0) + 1

        // Sum confidence scores
        if (question.confidence) {
          totalConfidence += question.confidence
        }

        // Count diagram questions
        if (question.hasDiagram) {
          stats.diagramQuestions++
        }

        // Count data quality distribution
        const quality = question.extractionMetadata?.dataQuality || 3
        stats.dataQualityDistribution[quality]++
      })

      stats.averageConfidence = convertedData.questions.length > 0 ? 
        totalConfidence / convertedData.questions.length : 0
    }

    return stats
  }

  /**
   * Batch migration for multiple ZIP files
   */
  async migrateBatch(zipFiles, options = {}) {
    const batchId = this.generateMigrationId()
    const results = []
    const startTime = Date.now()

    for (let i = 0; i < zipFiles.length; i++) {
      const file = zipFiles[i]
      const fileOptions = { ...options, batchIndex: i, batchId }

      try {
        const result = await this.migrateZipToAIJSON(file, fileOptions)
        results.push({
          fileName: file.name || `file_${i}`,
          success: true,
          result
        })
      } catch (error) {
        results.push({
          fileName: file.name || `file_${i}`,
          success: false,
          error: error.message
        })
      }

      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          completed: i + 1,
          total: zipFiles.length,
          percentage: ((i + 1) / zipFiles.length) * 100
        })
      }
    }

    const batchResult = {
      batchId,
      totalFiles: zipFiles.length,
      successfulMigrations: results.filter(r => r.success).length,
      failedMigrations: results.filter(r => !r.success).length,
      processingTime: Date.now() - startTime,
      results,
      summary: this.generateBatchSummary(results)
    }

    return batchResult
  }

  /**
   * Generate batch summary
   */
  generateBatchSummary(results) {
    const summary = {
      totalQuestions: 0,
      averageConfidence: 0,
      questionTypeDistribution: {},
      commonIssues: [],
      recommendations: []
    }

    const successfulResults = results.filter(r => r.success)
    let totalConfidence = 0
    let totalQuestionCount = 0

    successfulResults.forEach(result => {
      const stats = result.result.statistics
      summary.totalQuestions += stats.convertedQuestionCount
      totalQuestionCount += stats.convertedQuestionCount
      totalConfidence += stats.averageConfidence * stats.convertedQuestionCount

      // Merge question type distributions
      Object.entries(stats.questionTypes).forEach(([type, count]) => {
        summary.questionTypeDistribution[type] = (summary.questionTypeDistribution[type] || 0) + count
      })
    })

    summary.averageConfidence = totalQuestionCount > 0 ? totalConfidence / totalQuestionCount : 0

    // Generate recommendations
    if (results.some(r => !r.success)) {
      summary.recommendations.push('Review failed migrations and address common issues')
    }

    if (summary.averageConfidence < 3) {
      summary.recommendations.push('Consider manual review of migrated questions due to low confidence scores')
    }

    return summary
  }

  /**
   * Validate migration integrity
   */
  validateMigrationIntegrity(originalData, convertedData) {
    const integrity = {
      isValid: true,
      issues: [],
      warnings: [],
      score: 100
    }

    // Check question count
    const originalCount = this.getOriginalQuestionCount(originalData)
    const convertedCount = convertedData.questions?.length || 0

    if (originalCount !== convertedCount) {
      integrity.issues.push({
        type: 'QUESTION_COUNT_MISMATCH',
        message: `Original: ${originalCount}, Converted: ${convertedCount}`,
        severity: 'high'
      })
      integrity.score -= 20
    }

    // Check for missing essential data
    if (!convertedData.testName) {
      integrity.warnings.push({
        type: 'MISSING_TEST_NAME',
        message: 'Test name was generated automatically'
      })
      integrity.score -= 5
    }

    // Check question quality
    if (convertedData.questions) {
      convertedData.questions.forEach((question, index) => {
        if (!question.queText || question.queText.length < 5) {
          integrity.issues.push({
            type: 'POOR_QUESTION_TEXT',
            message: `Question ${index + 1} has poor or missing text`,
            severity: 'medium'
          })
          integrity.score -= 5
        }

        if (question.confidence && question.confidence < 2) {
          integrity.warnings.push({
            type: 'LOW_CONFIDENCE',
            message: `Question ${index + 1} has low confidence score: ${question.confidence}`,
            severity: 'low'
          })
          integrity.score -= 2
        }
      })
    }

    integrity.isValid = integrity.score >= 70
    return integrity
  }

  /**
   * Get original question count
   */
  getOriginalQuestionCount(originalData) {
    if (Array.isArray(originalData.questions)) {
      return originalData.questions.length
    } else if (originalData.questions?.questions) {
      return originalData.questions.questions.length
    } else if (typeof originalData.questions === 'object') {
      return Object.keys(originalData.questions).length
    }
    return 0
  }

  /**
   * Helper methods
   */
  generateMigrationId() {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  hasEncodingIssues(text) {
    const encodingPatterns = [
      /â€™/g, /â€œ/g, /â€/g, /Ã¡/g, /Ã©/g, /\uFFFD/g
    ]
    return encodingPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Export migration history
   */
  exportMigrationHistory() {
    return {
      history: this.migrationHistory,
      summary: {
        totalMigrations: this.migrationHistory.length,
        successfulMigrations: this.migrationHistory.filter(m => m.success).length,
        failedMigrations: this.migrationHistory.filter(m => !m.success).length
      }
    }
  }

  /**
   * Clear migration history
   */
  clearMigrationHistory() {
    this.migrationHistory = []
  }
}

/**
 * Convenience functions
 */
export async function migrateZipFile(zipFile, options = {}) {
  const migrationTool = new MigrationTool()
  return await migrationTool.migrateZipToAIJSON(zipFile, options)
}

export async function migrateBatchFiles(zipFiles, options = {}) {
  const migrationTool = new MigrationTool()
  return await migrationTool.migrateBatch(zipFiles, options)
}

export default MigrationTool