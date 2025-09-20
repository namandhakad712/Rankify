/**
 * JSON Validator for AI-extracted question data
 * Provides comprehensive schema validation and compatibility checks
 */

export class JSONValidator {
  constructor() {
    this.errors = []
    this.warnings = []
  }

  /**
   * Main validation method for AI-extracted JSON data
   * @param {Object} data - The JSON data to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result with errors, warnings, and isValid flag
   */
  validate(data, options = {}) {
    this.errors = []
    this.warnings = []

    try {
      // Basic structure validation
      this.validateBasicStructure(data)
      
      // Test metadata validation
      this.validateTestMetadata(data)
      
      // Questions validation
      this.validateQuestions(data)
      
      // AI-specific validation
      this.validateAIMetadata(data)
      
      // Legacy compatibility check
      if (options.checkLegacyCompatibility) {
        this.validateLegacyCompatibility(data)
      }
      
      // Schema compliance check
      this.validateSchemaCompliance(data)

    } catch (error) {
      this.errors.push({
        type: 'CRITICAL_ERROR',
        message: `Validation failed: ${error.message}`,
        path: 'root',
        severity: 'error'
      })
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: this.generateValidationSummary()
    }
  }

  /**
   * Validate basic JSON structure
   */
  validateBasicStructure(data) {
    if (!data || typeof data !== 'object') {
      this.addError('INVALID_ROOT', 'Data must be a valid JSON object', 'root')
      return
    }

    // Required top-level properties
    const requiredProps = ['testName', 'testSections', 'questions']
    requiredProps.forEach(prop => {
      if (!data.hasOwnProperty(prop)) {
        this.addError('MISSING_PROPERTY', `Missing required property: ${prop}`, `root.${prop}`)
      }
    })

    // Check for empty data
    if (Object.keys(data).length === 0) {
      this.addError('EMPTY_DATA', 'JSON data is empty', 'root')
    }
  }

  /**
   * Validate test metadata
   */
  validateTestMetadata(data) {
    if (!data.testName || typeof data.testName !== 'string') {
      this.addError('INVALID_TEST_NAME', 'Test name must be a non-empty string', 'testName')
    }

    if (data.testName && data.testName.length > 200) {
      this.addWarning('LONG_TEST_NAME', 'Test name is very long (>200 chars)', 'testName')
    }

    // Validate test duration if present
    if (data.testDuration && typeof data.testDuration !== 'number') {
      this.addError('INVALID_DURATION', 'Test duration must be a number', 'testDuration')
    }

    // Validate test sections
    if (!Array.isArray(data.testSections)) {
      this.addError('INVALID_SECTIONS', 'Test sections must be an array', 'testSections')
    } else if (data.testSections.length === 0) {
      this.addWarning('NO_SECTIONS', 'No test sections defined', 'testSections')
    }

    // Validate each section
    data.testSections?.forEach((section, index) => {
      this.validateSection(section, `testSections[${index}]`)
    })
  }

  /**
   * Validate individual section
   */
  validateSection(section, path) {
    if (!section || typeof section !== 'object') {
      this.addError('INVALID_SECTION', 'Section must be an object', path)
      return
    }

    if (!section.name || typeof section.name !== 'string') {
      this.addError('INVALID_SECTION_NAME', 'Section name must be a string', `${path}.name`)
    }

    if (section.timeLimit && typeof section.timeLimit !== 'number') {
      this.addError('INVALID_TIME_LIMIT', 'Section time limit must be a number', `${path}.timeLimit`)
    }

    if (section.questionCount && typeof section.questionCount !== 'number') {
      this.addWarning('INVALID_QUESTION_COUNT', 'Question count should be a number', `${path}.questionCount`)
    }
  }

  /**
   * Validate questions array and individual questions
   */
  validateQuestions(data) {
    if (!Array.isArray(data.questions)) {
      this.addError('INVALID_QUESTIONS', 'Questions must be an array', 'questions')
      return
    }

    if (data.questions.length === 0) {
      this.addError('NO_QUESTIONS', 'No questions found in data', 'questions')
      return
    }

    // Validate each question
    data.questions.forEach((question, index) => {
      this.validateQuestion(question, `questions[${index}]`)
    })

    // Check for duplicate question IDs
    this.checkDuplicateQuestionIds(data.questions)
  }

  /**
   * Validate individual question
   */
  validateQuestion(question, path) {
    if (!question || typeof question !== 'object') {
      this.addError('INVALID_QUESTION', 'Question must be an object', path)
      return
    }

    // Required question properties
    const requiredProps = ['queId', 'queText', 'queType']
    requiredProps.forEach(prop => {
      if (!question.hasOwnProperty(prop)) {
        this.addError('MISSING_QUESTION_PROPERTY', `Missing required property: ${prop}`, `${path}.${prop}`)
      }
    })

    // Validate question ID
    if (question.queId && typeof question.queId !== 'string') {
      this.addError('INVALID_QUESTION_ID', 'Question ID must be a string', `${path}.queId`)
    }

    // Validate question text
    if (!question.queText || typeof question.queText !== 'string') {
      this.addError('INVALID_QUESTION_TEXT', 'Question text must be a non-empty string', `${path}.queText`)
    } else if (question.queText.length < 10) {
      this.addWarning('SHORT_QUESTION_TEXT', 'Question text is very short (<10 chars)', `${path}.queText`)
    }

    // Validate question type
    const validTypes = ['mcq', 'msq', 'nat', 'msm']
    if (!validTypes.includes(question.queType)) {
      this.addError('INVALID_QUESTION_TYPE', `Invalid question type: ${question.queType}`, `${path}.queType`)
    }

    // Type-specific validation
    this.validateQuestionByType(question, path)

    // Validate marks
    this.validateQuestionMarks(question, path)

    // Validate subject and section
    this.validateQuestionMetadata(question, path)
  }

  /**
   * Validate question based on its type
   */
  validateQuestionByType(question, path) {
    switch (question.queType) {
      case 'mcq':
        this.validateMCQQuestion(question, path)
        break
      case 'msq':
        this.validateMSQQuestion(question, path)
        break
      case 'nat':
        this.validateNATQuestion(question, path)
        break
      case 'msm':
        this.validateMSMQuestion(question, path)
        break
    }
  }

  /**
   * Validate MCQ question
   */
  validateMCQQuestion(question, path) {
    if (!Array.isArray(question.options)) {
      this.addError('INVALID_MCQ_OPTIONS', 'MCQ options must be an array', `${path}.options`)
      return
    }

    if (question.options.length < 2) {
      this.addError('INSUFFICIENT_OPTIONS', 'MCQ must have at least 2 options', `${path}.options`)
    }

    if (question.options.length > 6) {
      this.addWarning('TOO_MANY_OPTIONS', 'MCQ has more than 6 options', `${path}.options`)
    }

    // Validate each option
    question.options.forEach((option, index) => {
      if (!option || typeof option !== 'string') {
        this.addError('INVALID_OPTION', `Option ${index + 1} must be a non-empty string`, `${path}.options[${index}]`)
      }
    })

    // Validate correct answer
    if (question.queAnswer !== undefined) {
      if (typeof question.queAnswer !== 'number' || 
          question.queAnswer < 0 || 
          question.queAnswer >= question.options.length) {
        this.addError('INVALID_MCQ_ANSWER', 'MCQ answer must be a valid option index', `${path}.queAnswer`)
      }
    }
  }

  /**
   * Validate MSQ question
   */
  validateMSQQuestion(question, path) {
    if (!Array.isArray(question.options)) {
      this.addError('INVALID_MSQ_OPTIONS', 'MSQ options must be an array', `${path}.options`)
      return
    }

    if (question.options.length < 3) {
      this.addError('INSUFFICIENT_MSQ_OPTIONS', 'MSQ must have at least 3 options', `${path}.options`)
    }

    // Validate correct answers
    if (question.queAnswer !== undefined) {
      if (!Array.isArray(question.queAnswer)) {
        this.addError('INVALID_MSQ_ANSWER', 'MSQ answer must be an array', `${path}.queAnswer`)
      } else {
        question.queAnswer.forEach((answer, index) => {
          if (typeof answer !== 'number' || answer < 0 || answer >= question.options.length) {
            this.addError('INVALID_MSQ_ANSWER_INDEX', `Invalid answer index at position ${index}`, `${path}.queAnswer[${index}]`)
          }
        })
      }
    }
  }

  /**
   * Validate NAT question
   */
  validateNATQuestion(question, path) {
    // NAT questions shouldn't have options
    if (question.options && question.options.length > 0) {
      this.addWarning('NAT_HAS_OPTIONS', 'NAT question should not have options', `${path}.options`)
    }

    // Validate answer if present
    if (question.queAnswer !== undefined) {
      if (typeof question.queAnswer !== 'number' && typeof question.queAnswer !== 'string') {
        this.addError('INVALID_NAT_ANSWER', 'NAT answer must be a number or string', `${path}.queAnswer`)
      }
    }

    // Check for answer range if specified
    if (question.answerRange) {
      if (!question.answerRange.min || !question.answerRange.max) {
        this.addWarning('INCOMPLETE_ANSWER_RANGE', 'Answer range should have min and max values', `${path}.answerRange`)
      }
    }
  }

  /**
   * Validate MSM question
   */
  validateMSMQuestion(question, path) {
    // MSM questions need special validation for matching pairs
    if (!question.leftColumn || !Array.isArray(question.leftColumn)) {
      this.addError('INVALID_MSM_LEFT', 'MSM left column must be an array', `${path}.leftColumn`)
    }

    if (!question.rightColumn || !Array.isArray(question.rightColumn)) {
      this.addError('INVALID_MSM_RIGHT', 'MSM right column must be an array', `${path}.rightColumn`)
    }

    if (question.leftColumn && question.rightColumn) {
      if (question.leftColumn.length !== question.rightColumn.length) {
        this.addWarning('MSM_COLUMN_MISMATCH', 'MSM columns should have equal number of items', path)
      }
    }
  }

  /**
   * Validate question marks
   */
  validateQuestionMarks(question, path) {
    if (question.queMarks) {
      if (typeof question.queMarks !== 'object') {
        this.addError('INVALID_MARKS_FORMAT', 'Question marks must be an object', `${path}.queMarks`)
        return
      }

      // Validate correct marks
      if (question.queMarks.cm !== undefined && typeof question.queMarks.cm !== 'number') {
        this.addError('INVALID_CORRECT_MARKS', 'Correct marks must be a number', `${path}.queMarks.cm`)
      }

      // Validate incorrect marks
      if (question.queMarks.im !== undefined && typeof question.queMarks.im !== 'number') {
        this.addError('INVALID_INCORRECT_MARKS', 'Incorrect marks must be a number', `${path}.queMarks.im`)
      }

      // Logical validation
      if (question.queMarks.cm && question.queMarks.im && question.queMarks.cm <= question.queMarks.im) {
        this.addWarning('ILLOGICAL_MARKS', 'Correct marks should be greater than incorrect marks', `${path}.queMarks`)
      }
    }
  }

  /**
   * Validate question metadata
   */
  validateQuestionMetadata(question, path) {
    if (question.subject && typeof question.subject !== 'string') {
      this.addError('INVALID_SUBJECT', 'Subject must be a string', `${path}.subject`)
    }

    if (question.section && typeof question.section !== 'string') {
      this.addError('INVALID_SECTION', 'Section must be a string', `${path}.section`)
    }

    if (question.difficulty && !['easy', 'medium', 'hard'].includes(question.difficulty.toLowerCase())) {
      this.addWarning('INVALID_DIFFICULTY', 'Difficulty should be easy, medium, or hard', `${path}.difficulty`)
    }

    if (question.pageNumber && typeof question.pageNumber !== 'number') {
      this.addWarning('INVALID_PAGE_NUMBER', 'Page number should be a number', `${path}.pageNumber`)
    }
  }

  /**
   * Validate AI-specific metadata
   */
  validateAIMetadata(data) {
    // Check for AI extraction metadata
    if (data.extractionMetadata) {
      this.validateExtractionMetadata(data.extractionMetadata, 'extractionMetadata')
    }

    // Validate confidence scores in questions
    data.questions?.forEach((question, index) => {
      if (question.confidence !== undefined) {
        if (typeof question.confidence !== 'number' || question.confidence < 1 || question.confidence > 5) {
          this.addError('INVALID_CONFIDENCE', 'Confidence score must be between 1 and 5', `questions[${index}].confidence`)
        }
      }

      if (question.hasDiagram !== undefined && typeof question.hasDiagram !== 'boolean') {
        this.addError('INVALID_DIAGRAM_FLAG', 'hasDiagram must be a boolean', `questions[${index}].hasDiagram`)
      }

      if (question.extractionMetadata) {
        this.validateQuestionExtractionMetadata(question.extractionMetadata, `questions[${index}].extractionMetadata`)
      }
    })
  }

  /**
   * Validate extraction metadata
   */
  validateExtractionMetadata(metadata, path) {
    if (typeof metadata !== 'object') {
      this.addError('INVALID_EXTRACTION_METADATA', 'Extraction metadata must be an object', path)
      return
    }

    if (metadata.geminiModel && typeof metadata.geminiModel !== 'string') {
      this.addWarning('INVALID_GEMINI_MODEL', 'Gemini model should be a string', `${path}.geminiModel`)
    }

    if (metadata.processingTime && typeof metadata.processingTime !== 'number') {
      this.addWarning('INVALID_PROCESSING_TIME', 'Processing time should be a number', `${path}.processingTime`)
    }

    if (metadata.extractionDate && !this.isValidDate(metadata.extractionDate)) {
      this.addWarning('INVALID_EXTRACTION_DATE', 'Extraction date should be a valid date string', `${path}.extractionDate`)
    }
  }

  /**
   * Validate question-level extraction metadata
   */
  validateQuestionExtractionMetadata(metadata, path) {
    if (metadata.textClarity && (typeof metadata.textClarity !== 'number' || metadata.textClarity < 1 || metadata.textClarity > 5)) {
      this.addWarning('INVALID_TEXT_CLARITY', 'Text clarity should be between 1 and 5', `${path}.textClarity`)
    }

    if (metadata.structureRecognition && (typeof metadata.structureRecognition !== 'number' || metadata.structureRecognition < 1 || metadata.structureRecognition > 5)) {
      this.addWarning('INVALID_STRUCTURE_RECOGNITION', 'Structure recognition should be between 1 and 5', `${path}.structureRecognition`)
    }
  }

  /**
   * Check for duplicate question IDs
   */
  checkDuplicateQuestionIds(questions) {
    const ids = new Set()
    const duplicates = new Set()

    questions.forEach((question, index) => {
      if (question.queId) {
        if (ids.has(question.queId)) {
          duplicates.add(question.queId)
          this.addError('DUPLICATE_QUESTION_ID', `Duplicate question ID: ${question.queId}`, `questions[${index}].queId`)
        } else {
          ids.add(question.queId)
        }
      }
    })
  }

  /**
   * Validate legacy compatibility
   */
  validateLegacyCompatibility(data) {
    // Check if data can be converted to legacy ZIP format
    const legacyRequiredFields = ['testName', 'questions']
    
    legacyRequiredFields.forEach(field => {
      if (!data[field]) {
        this.addWarning('LEGACY_INCOMPATIBLE', `Missing field required for legacy compatibility: ${field}`, field)
      }
    })

    // Check question format compatibility
    data.questions?.forEach((question, index) => {
      if (!question.queId || !question.queText || !question.queType) {
        this.addWarning('LEGACY_QUESTION_INCOMPATIBLE', 'Question missing fields required for legacy compatibility', `questions[${index}]`)
      }
    })
  }

  /**
   * Validate schema compliance
   */
  validateSchemaCompliance(data) {
    // Check against predefined schema patterns
    const schemaVersion = data.schemaVersion || '1.0'
    
    if (!this.isValidSchemaVersion(schemaVersion)) {
      this.addWarning('INVALID_SCHEMA_VERSION', `Unknown schema version: ${schemaVersion}`, 'schemaVersion')
    }

    // Validate required schema fields based on version
    this.validateSchemaFields(data, schemaVersion)
  }

  /**
   * Validate schema fields based on version
   */
  validateSchemaFields(data, version) {
    const requiredFields = this.getRequiredFieldsForVersion(version)
    
    requiredFields.forEach(field => {
      if (!this.hasNestedProperty(data, field)) {
        this.addError('SCHEMA_VIOLATION', `Missing required schema field: ${field}`, field)
      }
    })
  }

  /**
   * Get required fields for schema version
   */
  getRequiredFieldsForVersion(version) {
    const fieldMap = {
      '1.0': ['testName', 'questions', 'testSections'],
      '1.1': ['testName', 'questions', 'testSections', 'extractionMetadata'],
      '2.0': ['testName', 'questions', 'testSections', 'extractionMetadata', 'schemaVersion']
    }
    
    return fieldMap[version] || fieldMap['1.0']
  }

  /**
   * Helper methods
   */
  addError(type, message, path) {
    this.errors.push({
      type,
      message,
      path,
      severity: 'error'
    })
  }

  addWarning(type, message, path) {
    this.warnings.push({
      type,
      message,
      path,
      severity: 'warning'
    })
  }

  isValidDate(dateString) {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date)
  }

  isValidSchemaVersion(version) {
    const validVersions = ['1.0', '1.1', '2.0']
    return validVersions.includes(version)
  }

  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj) !== undefined
  }

  generateValidationSummary() {
    return {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      criticalErrors: this.errors.filter(e => e.type.includes('CRITICAL')).length,
      schemaViolations: this.errors.filter(e => e.type.includes('SCHEMA')).length,
      aiValidationIssues: [...this.errors, ...this.warnings].filter(i => 
        i.type.includes('CONFIDENCE') || i.type.includes('DIAGRAM') || i.type.includes('EXTRACTION')
      ).length
    }
  }

  /**
   * Get validation report as formatted text
   */
  getFormattedReport() {
    let report = '=== JSON Validation Report ===\n\n'
    
    const summary = this.generateValidationSummary()
    report += `Summary:\n`
    report += `- Total Errors: ${summary.totalErrors}\n`
    report += `- Total Warnings: ${summary.totalWarnings}\n`
    report += `- Critical Errors: ${summary.criticalErrors}\n`
    report += `- Schema Violations: ${summary.schemaViolations}\n`
    report += `- AI Validation Issues: ${summary.aiValidationIssues}\n\n`

    if (this.errors.length > 0) {
      report += 'ERRORS:\n'
      this.errors.forEach((error, index) => {
        report += `${index + 1}. [${error.type}] ${error.message} (Path: ${error.path})\n`
      })
      report += '\n'
    }

    if (this.warnings.length > 0) {
      report += 'WARNINGS:\n'
      this.warnings.forEach((warning, index) => {
        report += `${index + 1}. [${warning.type}] ${warning.message} (Path: ${warning.path})\n`
      })
    }

    return report
  }
}

/**
 * Convenience function for quick validation
 */
export function validateAIExtractedJSON(data, options = {}) {
  const validator = new JSONValidator()
  return validator.validate(data, options)
}

/**
 * Validate and fix common issues
 */
export function validateAndFix(data, options = {}) {
  const validator = new JSONValidator()
  const result = validator.validate(data, options)
  
  // Auto-fix some common issues
  const fixedData = { ...data }
  
  // Fix missing question IDs
  if (fixedData.questions) {
    fixedData.questions.forEach((question, index) => {
      if (!question.queId) {
        question.queId = `q_${index + 1}_${Date.now()}`
      }
    })
  }
  
  // Fix missing test sections
  if (!fixedData.testSections || fixedData.testSections.length === 0) {
    fixedData.testSections = [{ name: 'General', questionCount: fixedData.questions?.length || 0 }]
  }
  
  return {
    ...result,
    fixedData,
    autoFixApplied: true
  }
}

export default JSONValidator