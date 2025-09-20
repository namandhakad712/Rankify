/**
 * Data Mapping Utilities
 * Handles mapping between legacy ZIP format and AI JSON format
 */

export class DataMapper {
  constructor() {
    this.legacyFieldMappings = this.initializeLegacyMappings()
    this.aiFieldMappings = this.initializeAIMappings()
    this.typeConversions = this.initializeTypeConversions()
  }

  /**
   * Initialize legacy field mappings
   */
  initializeLegacyMappings() {
    return {
      // Question field mappings
      question: {
        'queId': ['queId', 'id', 'questionId', 'question_id'],
        'queText': ['queText', 'text', 'question', 'questionText', 'question_text'],
        'queType': ['queType', 'type', 'questionType', 'question_type'],
        'options': ['options', 'choices', 'answers', 'alternatives'],
        'queAnswer': ['queAnswer', 'answer', 'correctAnswer', 'correct_answer'],
        'queMarks': ['queMarks', 'marks', 'points', 'score'],
        'subject': ['subject', 'topic', 'category'],
        'section': ['section', 'part', 'chapter'],
        'difficulty': ['difficulty', 'level', 'complexity'],
        'timeLimit': ['timeLimit', 'time_limit', 'duration'],
        'tags': ['tags', 'keywords', 'labels']
      },
      
      // Test configuration mappings
      config: {
        'testName': ['testName', 'name', 'title', 'test_name'],
        'testDuration': ['testDuration', 'duration', 'timeLimit', 'test_duration'],
        'instructions': ['instructions', 'description', 'notes'],
        'sections': ['sections', 'parts', 'chapters'],
        'totalMarks': ['totalMarks', 'total_marks', 'maxScore', 'max_score']
      },
      
      // Metadata mappings
      metadata: {
        'subject': ['subject', 'course', 'topic'],
        'difficulty': ['difficulty', 'level'],
        'author': ['author', 'creator', 'teacher'],
        'createdDate': ['createdDate', 'created_date', 'date_created'],
        'version': ['version', 'revision']
      }
    }
  }

  /**
   * Initialize AI field mappings
   */
  initializeAIMappings() {
    return {
      // AI-specific fields that don't exist in legacy format
      aiSpecific: [
        'confidence',
        'hasDiagram',
        'extractionMetadata',
        'migrationMetadata',
        'schemaVersion'
      ],
      
      // Fields that need special handling
      specialHandling: {
        'confidence': 'estimateFromLegacyData',
        'hasDiagram': 'detectFromText',
        'extractionMetadata': 'generateFromMigration',
        'schemaVersion': 'setDefault'
      }
    }
  }

  /**
   * Initialize type conversions
   */
  initializeTypeConversions() {
    return {
      questionTypes: {
        // Legacy -> AI JSON
        'multiple-choice': 'mcq',
        'single-choice': 'mcq',
        'multi-choice': 'mcq',
        'multiple-select': 'msq',
        'multi-select': 'msq',
        'checkbox': 'msq',
        'numerical': 'nat',
        'numeric': 'nat',
        'number': 'nat',
        'fill-blank': 'nat',
        'matching': 'msm',
        'match': 'msm',
        'true-false': 'mcq',
        'boolean': 'mcq'
      },
      
      answerFormats: {
        mcq: 'singleIndex',
        msq: 'multipleIndices',
        nat: 'numericValue',
        msm: 'matchingPairs'
      },
      
      markingSchemes: {
        // Common marking scheme patterns
        'positive': { cm: 1, im: 0 },
        'negative': { cm: 1, im: -0.25 },
        'partial': { cm: 1, im: -0.33 },
        'binary': { cm: 1, im: 0 }
      }
    }
  }

  /**
   * Map legacy question data to AI JSON format
   */
  mapLegacyQuestion(legacyQuestion, index = 0, options = {}) {
    const mapped = {}

    // Map basic fields
    Object.entries(this.legacyFieldMappings.question).forEach(([aiField, legacyFields]) => {
      const value = this.findFieldValue(legacyQuestion, legacyFields)
      if (value !== undefined) {
        mapped[aiField] = this.convertFieldValue(aiField, value, legacyQuestion)
      }
    })

    // Generate missing required fields
    if (!mapped.queId) {
      mapped.queId = this.generateQuestionId(legacyQuestion, index)
    }

    if (!mapped.queText) {
      mapped.queText = this.extractQuestionText(legacyQuestion)
    }

    if (!mapped.queType) {
      mapped.queType = this.inferQuestionType(legacyQuestion)
    }

    // Handle special conversions
    this.applySpecialConversions(mapped, legacyQuestion, options)

    // Add AI-specific fields
    this.addAIFields(mapped, legacyQuestion, options)

    return mapped
  }

  /**
   * Map legacy test configuration to AI JSON format
   */
  mapLegacyConfig(legacyConfig, options = {}) {
    const mapped = {}

    // Map basic config fields
    Object.entries(this.legacyFieldMappings.config).forEach(([aiField, legacyFields]) => {
      const value = this.findFieldValue(legacyConfig, legacyFields)
      if (value !== undefined) {
        mapped[aiField] = this.convertFieldValue(aiField, value, legacyConfig)
      }
    })

    // Generate default test name if missing
    if (!mapped.testName) {
      mapped.testName = options.defaultTestName || `Migrated Test ${new Date().toISOString().split('T')[0]}`
    }

    // Convert sections format
    if (mapped.sections) {
      mapped.testSections = this.convertSections(mapped.sections)
      delete mapped.sections
    }

    return mapped
  }

  /**
   * Map legacy metadata to AI JSON format
   */
  mapLegacyMetadata(legacyMetadata, options = {}) {
    const mapped = {}

    if (!legacyMetadata) return mapped

    // Map metadata fields
    Object.entries(this.legacyFieldMappings.metadata).forEach(([aiField, legacyFields]) => {
      const value = this.findFieldValue(legacyMetadata, legacyFields)
      if (value !== undefined) {
        mapped[aiField] = this.convertFieldValue(aiField, value, legacyMetadata)
      }
    })

    return mapped
  }

  /**
   * Find field value from multiple possible field names
   */
  findFieldValue(object, possibleFields) {
    for (const field of possibleFields) {
      if (object && object.hasOwnProperty(field) && object[field] !== undefined) {
        return object[field]
      }
    }
    return undefined
  }

  /**
   * Convert field value based on field type and context
   */
  convertFieldValue(fieldName, value, context) {
    switch (fieldName) {
      case 'queType':
        return this.convertQuestionType(value)
      
      case 'queAnswer':
        return this.convertAnswer(value, context.queType || this.inferQuestionType(context))
      
      case 'queMarks':
        return this.convertMarks(value)
      
      case 'options':
        return this.convertOptions(value)
      
      case 'queText':
        return this.cleanQuestionText(value)
      
      case 'testDuration':
        return this.convertDuration(value)
      
      default:
        return value
    }
  }

  /**
   * Convert question type from legacy to AI format
   */
  convertQuestionType(legacyType) {
    if (!legacyType) return 'mcq'
    
    const normalized = legacyType.toLowerCase().replace(/[_-]/g, '')
    return this.typeConversions.questionTypes[normalized] || legacyType.toLowerCase()
  }

  /**
   * Convert answer format based on question type
   */
  convertAnswer(answer, questionType) {
    if (answer === null || answer === undefined) return null

    const normalizedType = this.convertQuestionType(questionType)

    switch (normalizedType) {
      case 'mcq':
        return this.convertMCQAnswer(answer)
      
      case 'msq':
        return this.convertMSQAnswer(answer)
      
      case 'nat':
        return this.convertNATAnswer(answer)
      
      case 'msm':
        return this.convertMSMAnswer(answer)
      
      default:
        return answer
    }
  }

  /**
   * Convert MCQ answer to zero-based index
   */
  convertMCQAnswer(answer) {
    if (typeof answer === 'number') {
      return Math.max(0, answer - 1) // Convert 1-based to 0-based
    }
    
    if (typeof answer === 'string') {
      // Handle letter answers (A, B, C, D)
      const letterMatch = answer.match(/^[A-Z]$/i)
      if (letterMatch) {
        return letterMatch[0].toUpperCase().charCodeAt(0) - 65
      }
      
      // Handle numeric strings
      const numMatch = answer.match(/^\d+$/)
      if (numMatch) {
        return Math.max(0, parseInt(answer) - 1)
      }
      
      // Handle descriptive answers
      if (answer.toLowerCase().includes('option')) {
        const optionMatch = answer.match(/option\s*([a-d])/i)
        if (optionMatch) {
          return optionMatch[1].toUpperCase().charCodeAt(0) - 65
        }
      }
    }
    
    return 0 // Default to first option
  }

  /**
   * Convert MSQ answer to array of indices
   */
  convertMSQAnswer(answer) {
    if (Array.isArray(answer)) {
      return answer.map(a => this.convertMCQAnswer(a))
    }
    
    if (typeof answer === 'string') {
      // Handle comma-separated answers
      const parts = answer.split(/[,;|]/).map(part => part.trim())
      return parts.map(part => this.convertMCQAnswer(part))
    }
    
    // Single answer converted to array
    return [this.convertMCQAnswer(answer)]
  }

  /**
   * Convert NAT answer to appropriate numeric format
   */
  convertNATAnswer(answer) {
    if (typeof answer === 'number') {
      return answer
    }
    
    if (typeof answer === 'string') {
      // Try to parse as number
      const parsed = parseFloat(answer.replace(/[^\d.-]/g, ''))
      if (!isNaN(parsed)) {
        return parsed
      }
      
      // Return as string if not numeric
      return answer.trim()
    }
    
    return answer
  }

  /**
   * Convert MSM answer to matching pairs format
   */
  convertMSMAnswer(answer) {
    if (Array.isArray(answer)) {
      return answer
    }
    
    if (typeof answer === 'object') {
      // Convert object to array of pairs
      return Object.entries(answer).map(([left, right]) => ({ left, right }))
    }
    
    return answer
  }

  /**
   * Convert marks to standard format
   */
  convertMarks(marks) {
    if (typeof marks === 'number') {
      return { cm: marks, im: 0 }
    }
    
    if (typeof marks === 'object' && marks !== null) {
      return {
        cm: marks.correct || marks.cm || marks.positive || marks.right || 1,
        im: marks.incorrect || marks.im || marks.negative || marks.wrong || 0
      }
    }
    
    if (typeof marks === 'string') {
      // Handle formats like "+4/-1", "4/1", "1,0"
      const patterns = [
        /([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)/,  // +4/-1 or 4/1
        /([+-]?\d+(?:\.\d+)?),\s*([+-]?\d+(?:\.\d+)?)/,  // 4,0 or 1,-0.25
        /([+-]?\d+(?:\.\d+)?)\s*[:|]\s*([+-]?\d+(?:\.\d+)?)/  // 4:0 or 1:-0.25
      ]
      
      for (const pattern of patterns) {
        const match = marks.match(pattern)
        if (match) {
          return {
            cm: parseFloat(match[1]),
            im: parseFloat(match[2])
          }
        }
      }
      
      // Single number
      const singleNum = parseFloat(marks)
      if (!isNaN(singleNum)) {
        return { cm: singleNum, im: 0 }
      }
    }
    
    return { cm: 1, im: 0 } // Default
  }

  /**
   * Convert options to standard array format
   */
  convertOptions(options) {
    if (Array.isArray(options)) {
      return options.map(option => this.cleanOptionText(option))
    }
    
    if (typeof options === 'object' && options !== null) {
      // Handle object format like {A: "Option A", B: "Option B"}
      return Object.values(options).map(option => this.cleanOptionText(option))
    }
    
    if (typeof options === 'string') {
      // Handle delimited string format
      const delimiters = ['\n', '|', ';', '::']
      for (const delimiter of delimiters) {
        if (options.includes(delimiter)) {
          return options.split(delimiter).map(option => this.cleanOptionText(option))
        }
      }
      
      // Single option
      return [this.cleanOptionText(options)]
    }
    
    return []
  }

  /**
   * Clean option text
   */
  cleanOptionText(option) {
    if (typeof option !== 'string') {
      return String(option || '')
    }
    
    let cleaned = option.trim()
    
    // Remove option prefixes like "A)", "1.", etc.
    cleaned = cleaned.replace(/^[A-Z]\)\s*/i, '')
    cleaned = cleaned.replace(/^\d+\.\s*/, '')
    cleaned = cleaned.replace(/^[A-Z]:\s*/i, '')
    
    return cleaned
  }

  /**
   * Clean question text
   */
  cleanQuestionText(text) {
    if (typeof text !== 'string') {
      return String(text || 'Question text not available')
    }
    
    let cleaned = text.trim()
    
    // Remove question numbering
    cleaned = cleaned.replace(/^\s*\d+[\.)]\s*/, '')
    cleaned = cleaned.replace(/^\s*[A-Z][\.)]\s*/, '')
    cleaned = cleaned.replace(/^\s*Q\d*[\.):]?\s*/i, '')
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^(Question|Q):\s*/i, '')
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ')
    
    return cleaned
  }

  /**
   * Convert duration to seconds
   */
  convertDuration(duration) {
    if (typeof duration === 'number') {
      return duration
    }
    
    if (typeof duration === 'string') {
      // Handle formats like "90 minutes", "1.5 hours", "5400 seconds"
      const timePatterns = [
        { pattern: /(\d+(?:\.\d+)?)\s*h(?:ours?)?/i, multiplier: 3600 },
        { pattern: /(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/i, multiplier: 60 },
        { pattern: /(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?/i, multiplier: 1 }
      ]
      
      for (const { pattern, multiplier } of timePatterns) {
        const match = duration.match(pattern)
        if (match) {
          return Math.round(parseFloat(match[1]) * multiplier)
        }
      }
      
      // Try parsing as plain number
      const parsed = parseFloat(duration)
      if (!isNaN(parsed)) {
        return parsed
      }
    }
    
    return 3600 // Default 1 hour
  }

  /**
   * Convert sections to AI JSON format
   */
  convertSections(sections) {
    if (!Array.isArray(sections)) {
      return [{ name: 'General', questionCount: 0 }]
    }
    
    return sections.map(section => {
      if (typeof section === 'string') {
        return { name: section, questionCount: 0 }
      }
      
      return {
        name: section.name || section.title || 'Unnamed Section',
        questionCount: section.questionCount || section.questions || 0,
        timeLimit: this.convertDuration(section.timeLimit || section.duration),
        instructions: section.instructions || section.description
      }
    })
  }

  /**
   * Apply special conversions
   */
  applySpecialConversions(mapped, legacyQuestion, options) {
    // Ensure options exist for MCQ/MSQ questions
    if (['mcq', 'msq'].includes(mapped.queType) && !mapped.options) {
      mapped.options = this.generateDefaultOptions(mapped.queType)
    }
    
    // Ensure answer is in correct format
    if (mapped.queAnswer !== undefined && mapped.queType) {
      mapped.queAnswer = this.convertAnswer(mapped.queAnswer, mapped.queType)
    }
    
    // Set default marks if missing
    if (!mapped.queMarks) {
      mapped.queMarks = { cm: 1, im: 0 }
    }
    
    // Set default subject and section
    if (!mapped.subject) {
      mapped.subject = options.defaultSubject || 'General'
    }
    
    if (!mapped.section) {
      mapped.section = options.defaultSection || 'General'
    }
  }

  /**
   * Add AI-specific fields
   */
  addAIFields(mapped, legacyQuestion, options) {
    // Estimate confidence score
    mapped.confidence = this.estimateConfidence(legacyQuestion, options)
    
    // Detect diagram references
    mapped.hasDiagram = this.detectDiagram(legacyQuestion)
    
    // Add extraction metadata
    mapped.extractionMetadata = {
      migrationSource: 'legacy_zip',
      originalFormat: this.detectOriginalFormat(legacyQuestion),
      migrationTimestamp: new Date().toISOString(),
      dataQuality: this.assessDataQuality(legacyQuestion)
    }
  }

  /**
   * Generate question ID
   */
  generateQuestionId(question, index) {
    // Try to extract from existing fields
    const possibleIds = ['queId', 'id', 'questionId', 'question_id', 'qid']
    for (const field of possibleIds) {
      if (question[field]) {
        return String(question[field])
      }
    }
    
    // Generate based on content hash or index
    const content = question.queText || question.text || question.question || ''
    const hash = this.simpleHash(content)
    return `q_${index + 1}_${hash}`
  }

  /**
   * Extract question text from various formats
   */
  extractQuestionText(question) {
    const possibleFields = ['queText', 'text', 'question', 'questionText', 'question_text', 'prompt']
    
    for (const field of possibleFields) {
      if (question[field] && typeof question[field] === 'string') {
        return this.cleanQuestionText(question[field])
      }
    }
    
    return 'Question text not available'
  }

  /**
   * Infer question type from question data
   */
  inferQuestionType(question) {
    // Check explicit type field
    const typeFields = ['queType', 'type', 'questionType', 'question_type']
    for (const field of typeFields) {
      if (question[field]) {
        return this.convertQuestionType(question[field])
      }
    }
    
    // Infer from structure
    if (question.options || question.choices) {
      const optionCount = (question.options || question.choices).length
      return optionCount > 4 ? 'msq' : 'mcq'
    }
    
    if (question.leftColumn && question.rightColumn) {
      return 'msm'
    }
    
    // Check question text for clues
    const text = question.queText || question.text || question.question || ''
    if (/select all|choose all|multiple/i.test(text)) {
      return 'msq'
    }
    
    if (/numerical|number|calculate|value/i.test(text)) {
      return 'nat'
    }
    
    return 'mcq' // Default
  }

  /**
   * Generate default options
   */
  generateDefaultOptions(questionType) {
    switch (questionType) {
      case 'mcq':
      case 'msq':
        return ['Option A', 'Option B', 'Option C', 'Option D']
      default:
        return []
    }
  }

  /**
   * Estimate confidence score
   */
  estimateConfidence(question, options) {
    let confidence = 3.0 // Base confidence
    
    // Increase for well-structured data
    if (question.queText && question.queText.length > 20) confidence += 0.5
    if (question.options && Array.isArray(question.options) && question.options.length >= 3) confidence += 0.3
    if (question.queAnswer !== undefined) confidence += 0.2
    if (question.queMarks) confidence += 0.1
    
    // Decrease for potential issues
    if (!question.queText || question.queText.length < 10) confidence -= 1.0
    if (this.hasEncodingIssues(question.queText)) confidence -= 0.5
    if (!question.queType) confidence -= 0.3
    
    return Math.max(1, Math.min(5, confidence))
  }

  /**
   * Detect diagram references
   */
  detectDiagram(question) {
    const text = question.queText || question.text || question.question || ''
    const diagramKeywords = [
      'figure', 'diagram', 'chart', 'graph', 'image', 'picture',
      'shown above', 'shown below', 'refer to', 'see figure',
      'as shown', 'illustration', 'drawing', 'table'
    ]
    
    return diagramKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    )
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
    if (['mcq', 'msq'].includes(this.inferQuestionType(question)) && 
        (!question.options || question.options.length < 2)) score -= 2
    if (question.queAnswer === undefined) score -= 1
    if (this.hasEncodingIssues(question.queText)) score -= 1
    
    return Math.max(1, score)
  }

  /**
   * Check for encoding issues
   */
  hasEncodingIssues(text) {
    if (!text || typeof text !== 'string') return false
    
    const encodingPatterns = [
      /â€™/g, /â€œ/g, /â€/g, /Ã¡/g, /Ã©/g, /\uFFFD/g
    ]
    
    return encodingPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Reverse mapping: AI JSON to Legacy format
   */
  mapAIToLegacy(aiQuestion) {
    const legacy = {}
    
    // Direct mappings
    legacy.queId = aiQuestion.queId
    legacy.queText = aiQuestion.queText
    legacy.queType = aiQuestion.queType
    legacy.options = aiQuestion.options
    legacy.queAnswer = aiQuestion.queAnswer
    legacy.queMarks = aiQuestion.queMarks
    legacy.subject = aiQuestion.subject
    legacy.section = aiQuestion.section
    
    // Skip AI-specific fields
    // confidence, hasDiagram, extractionMetadata are not included
    
    return legacy
  }

  /**
   * Validate mapping result
   */
  validateMapping(original, mapped) {
    const validation = {
      isValid: true,
      issues: [],
      warnings: []
    }
    
    // Check required fields
    if (!mapped.queId) {
      validation.issues.push('Missing question ID')
      validation.isValid = false
    }
    
    if (!mapped.queText) {
      validation.issues.push('Missing question text')
      validation.isValid = false
    }
    
    if (!mapped.queType) {
      validation.issues.push('Missing question type')
      validation.isValid = false
    }
    
    // Check type-specific requirements
    if (['mcq', 'msq'].includes(mapped.queType) && (!mapped.options || mapped.options.length < 2)) {
      validation.warnings.push('MCQ/MSQ question has insufficient options')
    }
    
    return validation
  }
}

/**
 * Convenience functions
 */
export function mapLegacyToAI(legacyData, options = {}) {
  const mapper = new DataMapper()
  
  if (Array.isArray(legacyData)) {
    return legacyData.map((question, index) => 
      mapper.mapLegacyQuestion(question, index, options)
    )
  } else {
    return mapper.mapLegacyQuestion(legacyData, 0, options)
  }
}

export function mapAIToLegacy(aiData) {
  const mapper = new DataMapper()
  
  if (Array.isArray(aiData)) {
    return aiData.map(question => mapper.mapAIToLegacy(question))
  } else {
    return mapper.mapAIToLegacy(aiData)
  }
}

export default DataMapper