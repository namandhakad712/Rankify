/**
 * Advanced Confidence Scoring Algorithms
 * Provides sophisticated confidence assessment for AI-extracted questions
 */

export class ConfidenceScorer {
  constructor() {
    this.scoringFactors = this.initializeScoringFactors()
    this.qualityMetrics = this.initializeQualityMetrics()
    this.uncertaintyHandlers = this.initializeUncertaintyHandlers()
    this.calibrationData = new Map()
  }

  /**
   * Initialize scoring factors with weights
   */
  initializeScoringFactors() {
    return {
      textQuality: {
        weight: 0.25,
        factors: {
          length: { min: 20, optimal: 100, max: 500 },
          clarity: { encoding: 0.3, grammar: 0.4, completeness: 0.3 },
          structure: { sentences: 0.4, punctuation: 0.3, formatting: 0.3 }
        }
      },
      
      structuralIntegrity: {
        weight: 0.2,
        factors: {
          questionType: { consistency: 0.4, validity: 0.6 },
          options: { count: 0.3, quality: 0.4, uniqueness: 0.3 },
          answer: { format: 0.5, validity: 0.5 }
        }
      },
      
      extractionQuality: {
        weight: 0.2,
        factors: {
          ocrAccuracy: { artifacts: 0.4, encoding: 0.3, formatting: 0.3 },
          parsing: { structure: 0.5, boundaries: 0.5 },
          completeness: { text: 0.4, options: 0.3, metadata: 0.3 }
        }
      },
      
      contextualRelevance: {
        weight: 0.15,
        factors: {
          subject: { alignment: 0.4, terminology: 0.6 },
          difficulty: { appropriateness: 0.5, consistency: 0.5 },
          coherence: { logical: 0.6, semantic: 0.4 }
        }
      },
      
      technicalAccuracy: {
        weight: 0.1,
        factors: {
          mathematical: { notation: 0.4, symbols: 0.3, equations: 0.3 },
          scientific: { terminology: 0.5, units: 0.3, concepts: 0.2 },
          linguistic: { grammar: 0.4, vocabulary: 0.3, syntax: 0.3 }
        }
      },
      
      metadataConsistency: {
        weight: 0.1,
        factors: {
          alignment: { typeContent: 0.4, subjectContent: 0.3, difficultyContent: 0.3 },
          completeness: { required: 0.6, optional: 0.4 },
          validity: { ranges: 0.5, formats: 0.5 }
        }
      }
    }
  }

  /**
   * Initialize quality metrics
   */
  initializeQualityMetrics() {
    return {
      textPatterns: {
        encoding: [
          /â€™/g, /â€œ/g, /â€/g, /Ã¡/g, /Ã©/g, /\uFFFD/g
        ],
        ocrArtifacts: [
          /[Il1|]{3,}/g, /[O0]{4,}/g, /\s{4,}/g, /[^\w\s.,!?;:()\-'"]/g
        ],
        incomplete: [
          /\.\.\./g, /\[.*?\]/g, /\{.*?\}/g, /__+/g
        ]
      },
      
      structuralPatterns: {
        questionMarkers: [
          /^\s*\d+[\.)]\s*/,
          /^\s*[A-Z][\.)]\s*/,
          /^\s*Q\d*[\.):]?\s*/i
        ],
        optionMarkers: [
          /^\s*[A-Z][\.)]\s*/,
          /^\s*\d+[\.)]\s*/,
          /^\s*[ivx]+[\.)]\s*/i
        ]
      },
      
      contentQuality: {
        grammarPatterns: [
          /\b(is|are|was|were)\s+(is|are|was|were)\b/gi,
          /\b(the)\s+(the)\b/gi,
          /\b(a)\s+(a)\b/gi
        ],
        clarityIndicators: [
          /\b(clearly|obviously|evidently|apparently)\b/gi,
          /\b(therefore|thus|hence|consequently)\b/gi
        ]
      }
    }
  }

  /**
   * Initialize uncertainty handlers
   */
  initializeUncertaintyHandlers() {
    return {
      ambiguousText: {
        threshold: 0.3,
        handler: this.handleAmbiguousText.bind(this)
      },
      incompleteExtraction: {
        threshold: 0.4,
        handler: this.handleIncompleteExtraction.bind(this)
      },
      structuralInconsistency: {
        threshold: 0.35,
        handler: this.handleStructuralInconsistency.bind(this)
      },
      contextualMismatch: {
        threshold: 0.25,
        handler: this.handleContextualMismatch.bind(this)
      }
    }
  }

  /**
   * Calculate comprehensive confidence score
   * @param {Object} question - Question object to score
   * @param {Object} extractionContext - Context from extraction process
   * @param {Object} options - Scoring options
   * @returns {Object} Detailed confidence assessment
   */
  calculateConfidence(question, extractionContext = {}, options = {}) {
    const assessment = {
      overallConfidence: 0,
      factorScores: {},
      qualityMetrics: {},
      uncertainties: [],
      recommendations: [],
      metadata: {
        scoringTime: Date.now(),
        version: '1.0'
      }
    }

    // Calculate scores for each factor
    Object.entries(this.scoringFactors).forEach(([factorName, factorConfig]) => {
      const factorScore = this.calculateFactorScore(question, factorName, factorConfig, extractionContext, options)
      assessment.factorScores[factorName] = factorScore
    })

    // Calculate weighted overall confidence
    let totalWeightedScore = 0
    let totalWeight = 0

    Object.entries(assessment.factorScores).forEach(([factorName, score]) => {
      const weight = this.scoringFactors[factorName].weight
      totalWeightedScore += score.score * weight
      totalWeight += weight
    })

    assessment.overallConfidence = totalWeight > 0 ? totalWeightedScore / totalWeight : 0

    // Apply uncertainty handling
    this.applyUncertaintyHandling(assessment, question, extractionContext, options)

    // Generate quality metrics
    assessment.qualityMetrics = this.generateQualityMetrics(question, assessment)

    // Generate recommendations
    assessment.recommendations = this.generateRecommendations(assessment, question, options)

    // Apply calibration if available
    this.applyCalibration(assessment, question, extractionContext)

    // Clamp confidence to valid range
    assessment.overallConfidence = Math.max(1, Math.min(5, assessment.overallConfidence * 5))

    return assessment
  } 
 /**
   * Calculate score for a specific factor
   */
  calculateFactorScore(question, factorName, factorConfig, extractionContext, options) {
    const factorScore = {
      score: 0,
      subScores: {},
      issues: [],
      strengths: []
    }

    switch (factorName) {
      case 'textQuality':
        factorScore.score = this.assessTextQuality(question, factorScore, extractionContext)
        break
      case 'structuralIntegrity':
        factorScore.score = this.assessStructuralIntegrity(question, factorScore, extractionContext)
        break
      case 'extractionQuality':
        factorScore.score = this.assessExtractionQuality(question, factorScore, extractionContext)
        break
      case 'contextualRelevance':
        factorScore.score = this.assessContextualRelevance(question, factorScore, extractionContext)
        break
      case 'technicalAccuracy':
        factorScore.score = this.assessTechnicalAccuracy(question, factorScore, extractionContext)
        break
      case 'metadataConsistency':
        factorScore.score = this.assessMetadataConsistency(question, factorScore, extractionContext)
        break
    }

    return factorScore
  }

  /**
   * Assess text quality
   */
  assessTextQuality(question, factorScore, extractionContext) {
    let score = 1.0
    const text = question.queText || ''

    // Length assessment
    const lengthScore = this.assessTextLength(text)
    factorScore.subScores.length = lengthScore
    score *= lengthScore

    if (lengthScore < 0.5) {
      factorScore.issues.push('Question text is too short or too long')
    } else if (lengthScore > 0.8) {
      factorScore.strengths.push('Question text has appropriate length')
    }

    // Clarity assessment
    const clarityScore = this.assessTextClarity(text)
    factorScore.subScores.clarity = clarityScore
    score *= clarityScore

    if (clarityScore < 0.6) {
      factorScore.issues.push('Text clarity issues detected')
    }

    // Structure assessment
    const structureScore = this.assessTextStructure(text)
    factorScore.subScores.structure = structureScore
    score *= structureScore

    if (structureScore < 0.7) {
      factorScore.issues.push('Text structure issues detected')
    }

    return Math.pow(score, 1/3) // Geometric mean
  }

  /**
   * Assess text length appropriateness
   */
  assessTextLength(text) {
    const length = text.length
    const { min, optimal, max } = this.scoringFactors.textQuality.factors.length

    if (length < min) {
      return Math.max(0.1, length / min)
    } else if (length <= optimal) {
      return 0.8 + 0.2 * (length - min) / (optimal - min)
    } else if (length <= max) {
      return 1.0 - 0.3 * (length - optimal) / (max - optimal)
    } else {
      return Math.max(0.3, 1.0 - 0.5 * (length - max) / max)
    }
  }

  /**
   * Assess text clarity
   */
  assessTextClarity(text) {
    let score = 1.0

    // Check for encoding issues
    const encodingIssues = this.qualityMetrics.textPatterns.encoding.reduce((count, pattern) => {
      const matches = text.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)

    if (encodingIssues > 0) {
      score *= Math.max(0.3, 1 - encodingIssues * 0.1)
    }

    // Check for OCR artifacts
    const ocrArtifacts = this.qualityMetrics.textPatterns.ocrArtifacts.reduce((count, pattern) => {
      const matches = text.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)

    if (ocrArtifacts > 0) {
      score *= Math.max(0.4, 1 - ocrArtifacts * 0.05)
    }

    // Check for incomplete text
    const incompleteMarkers = this.qualityMetrics.textPatterns.incomplete.reduce((count, pattern) => {
      const matches = text.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)

    if (incompleteMarkers > 0) {
      score *= Math.max(0.2, 1 - incompleteMarkers * 0.15)
    }

    return score
  }

  /**
   * Assess text structure
   */
  assessTextStructure(text) {
    let score = 1.0

    // Check sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length === 0) {
      score *= 0.1
    } else if (sentences.length === 1 && text.length > 100) {
      score *= 0.7 // Long single sentence
    }

    // Check punctuation appropriateness
    const punctuationRatio = (text.match(/[.!?,:;]/g) || []).length / text.length
    if (punctuationRatio < 0.01 || punctuationRatio > 0.1) {
      score *= 0.8
    }

    // Check for proper capitalization
    const capitalizedSentences = sentences.filter(s => /^[A-Z]/.test(s.trim())).length
    if (capitalizedSentences < sentences.length * 0.8) {
      score *= 0.9
    }

    return score
  }

  /**
   * Assess structural integrity
   */
  assessStructuralIntegrity(question, factorScore, extractionContext) {
    let score = 1.0

    // Question type consistency
    const typeScore = this.assessQuestionTypeConsistency(question)
    factorScore.subScores.questionType = typeScore
    score *= typeScore

    // Options quality (for MCQ/MSQ)
    if (['mcq', 'msq'].includes(question.queType)) {
      const optionsScore = this.assessOptionsQuality(question)
      factorScore.subScores.options = optionsScore
      score *= optionsScore

      if (optionsScore < 0.6) {
        factorScore.issues.push('Options quality issues detected')
      }
    }

    // Answer format validity
    const answerScore = this.assessAnswerFormat(question)
    factorScore.subScores.answer = answerScore
    score *= answerScore

    if (answerScore < 0.7) {
      factorScore.issues.push('Answer format issues detected')
    }

    return Math.pow(score, 1/3)
  }

  /**
   * Assess question type consistency
   */
  assessQuestionTypeConsistency(question) {
    const type = question.queType
    const text = question.queText || ''
    const options = question.options || []

    let score = 1.0

    // Check type-content alignment
    switch (type) {
      case 'mcq':
        if (options.length < 2) score *= 0.3
        else if (options.length < 3) score *= 0.7
        if (text.toLowerCase().includes('select all') || text.toLowerCase().includes('choose all')) {
          score *= 0.6 // Suggests MSQ
        }
        break

      case 'msq':
        if (options.length < 3) score *= 0.4
        if (!text.toLowerCase().includes('select all') && !text.toLowerCase().includes('choose all')) {
          score *= 0.8 // Missing MSQ indicators
        }
        break

      case 'nat':
        if (options.length > 0) score *= 0.5 // NAT shouldn't have options
        if (!text.toLowerCase().match(/\b(calculate|find|determine|value|number)\b/)) {
          score *= 0.8 // Missing numerical indicators
        }
        break

      case 'msm':
        if (!question.leftColumn || !question.rightColumn) {
          score *= 0.2 // Missing matching columns
        }
        break
    }

    return score
  }

  /**
   * Assess options quality
   */
  assessOptionsQuality(question) {
    const options = question.options || []
    let score = 1.0

    if (options.length === 0) return 0.1

    // Check for empty options
    const emptyOptions = options.filter(opt => !opt || opt.trim().length === 0).length
    if (emptyOptions > 0) {
      score *= Math.max(0.3, 1 - emptyOptions * 0.2)
    }

    // Check for very short options
    const shortOptions = options.filter(opt => opt && opt.trim().length < 3).length
    if (shortOptions > 0) {
      score *= Math.max(0.6, 1 - shortOptions * 0.1)
    }

    // Check for duplicate options
    const uniqueOptions = new Set(options.map(opt => opt.toLowerCase().trim()))
    if (uniqueOptions.size < options.length) {
      score *= 0.5
    }

    // Check for similar options (potential OCR issues)
    const similarityThreshold = 0.8
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const similarity = this.calculateStringSimilarity(options[i], options[j])
        if (similarity > similarityThreshold) {
          score *= 0.7
          break
        }
      }
    }

    return score
  }

  /**
   * Assess answer format
   */
  assessAnswerFormat(question) {
    const answer = question.queAnswer
    const type = question.queType
    let score = 1.0

    if (answer === undefined || answer === null) {
      return 0.5 // Missing answer reduces confidence but doesn't invalidate
    }

    switch (type) {
      case 'mcq':
        if (typeof answer !== 'number' || answer < 0 || answer >= (question.options?.length || 0)) {
          score *= 0.3
        }
        break

      case 'msq':
        if (!Array.isArray(answer)) {
          score *= 0.4
        } else {
          const invalidIndices = answer.filter(idx => 
            typeof idx !== 'number' || idx < 0 || idx >= (question.options?.length || 0)
          ).length
          if (invalidIndices > 0) {
            score *= Math.max(0.3, 1 - invalidIndices * 0.2)
          }
        }
        break

      case 'nat':
        if (typeof answer !== 'number' && typeof answer !== 'string') {
          score *= 0.4
        } else if (typeof answer === 'string' && isNaN(parseFloat(answer))) {
          score *= 0.6 // Non-numeric string
        }
        break
    }

    return score
  } 
 /**
   * Assess extraction quality
   */
  assessExtractionQuality(question, factorScore, extractionContext) {
    let score = 1.0

    // OCR accuracy assessment
    const ocrScore = this.assessOCRAccuracy(question, extractionContext)
    factorScore.subScores.ocrAccuracy = ocrScore
    score *= ocrScore

    // Parsing quality assessment
    const parsingScore = this.assessParsingQuality(question, extractionContext)
    factorScore.subScores.parsing = parsingScore
    score *= parsingScore

    // Completeness assessment
    const completenessScore = this.assessExtractionCompleteness(question, extractionContext)
    factorScore.subScores.completeness = completenessScore
    score *= completenessScore

    return Math.pow(score, 1/3)
  }

  /**
   * Assess OCR accuracy
   */
  assessOCRAccuracy(question, extractionContext) {
    let score = 1.0
    const text = question.queText || ''

    // Use extraction context if available
    if (extractionContext.ocrConfidence) {
      score *= extractionContext.ocrConfidence
    }

    // Check for common OCR errors
    const ocrErrorPatterns = [
      /\b[Il1|]{2,}\b/g, // Confused I, l, 1, |
      /\b[O0]{2,}\b/g,   // Confused O, 0
      /[^\w\s.,!?;:()\-'"]/g // Unusual characters
    ]

    ocrErrorPatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        score *= Math.max(0.5, 1 - matches.length * 0.05)
      }
    })

    return score
  }

  /**
   * Assess parsing quality
   */
  assessParsingQuality(question, extractionContext) {
    let score = 1.0

    // Check if question boundaries were properly detected
    if (extractionContext.boundaryConfidence) {
      score *= extractionContext.boundaryConfidence
    }

    // Check for structural parsing issues
    const text = question.queText || ''
    
    // Multiple question markers suggest parsing issues
    const questionMarkers = this.qualityMetrics.structuralPatterns.questionMarkers.reduce((count, pattern) => {
      const matches = text.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)

    if (questionMarkers > 1) {
      score *= Math.max(0.4, 1 - (questionMarkers - 1) * 0.2)
    }

    return score
  }

  /**
   * Assess extraction completeness
   */
  assessExtractionCompleteness(question, extractionContext) {
    let score = 1.0

    // Check for required fields
    const requiredFields = ['queId', 'queText', 'queType']
    const missingFields = requiredFields.filter(field => !question[field]).length
    if (missingFields > 0) {
      score *= Math.max(0.3, 1 - missingFields * 0.2)
    }

    // Check for type-specific completeness
    if (['mcq', 'msq'].includes(question.queType) && (!question.options || question.options.length === 0)) {
      score *= 0.4
    }

    // Check for metadata completeness
    const optionalFields = ['subject', 'difficulty', 'marks']
    const presentOptional = optionalFields.filter(field => question[field]).length
    score *= 0.8 + 0.2 * (presentOptional / optionalFields.length)

    return score
  }

  /**
   * Assess contextual relevance
   */
  assessContextualRelevance(question, factorScore, extractionContext) {
    let score = 1.0

    // Subject alignment
    const subjectScore = this.assessSubjectAlignment(question, extractionContext)
    factorScore.subScores.subject = subjectScore
    score *= subjectScore

    // Difficulty appropriateness
    const difficultyScore = this.assessDifficultyAppropriate(question, extractionContext)
    factorScore.subScores.difficulty = difficultyScore
    score *= difficultyScore

    // Logical coherence
    const coherenceScore = this.assessLogicalCoherence(question)
    factorScore.subScores.coherence = coherenceScore
    score *= coherenceScore

    return Math.pow(score, 1/3)
  }

  /**
   * Assess subject alignment
   */
  assessSubjectAlignment(question, extractionContext) {
    let score = 1.0
    const subject = question.subject || extractionContext.expectedSubject || ''
    const text = (question.queText || '').toLowerCase()

    if (!subject) return 0.7 // No subject info available

    // Define subject-specific terminology
    const subjectTerminology = {
      mathematics: ['equation', 'function', 'variable', 'calculate', 'solve', 'graph', 'formula'],
      physics: ['force', 'energy', 'velocity', 'acceleration', 'mass', 'momentum', 'wave'],
      chemistry: ['molecule', 'atom', 'reaction', 'compound', 'element', 'bond', 'solution'],
      biology: ['cell', 'organism', 'gene', 'protein', 'evolution', 'species', 'tissue'],
      history: ['century', 'war', 'empire', 'revolution', 'civilization', 'culture', 'period'],
      geography: ['continent', 'climate', 'population', 'country', 'region', 'mountain', 'river']
    }

    const subjectKey = subject.toLowerCase()
    const expectedTerms = subjectTerminology[subjectKey] || []

    if (expectedTerms.length > 0) {
      const foundTerms = expectedTerms.filter(term => text.includes(term)).length
      const terminologyScore = foundTerms / expectedTerms.length
      score *= 0.7 + 0.3 * terminologyScore
    }

    return score
  }

  /**
   * Assess difficulty appropriateness
   */
  assessDifficultyAppropriate(question, extractionContext) {
    let score = 1.0
    const difficulty = question.difficulty || extractionContext.expectedDifficulty
    const text = question.queText || ''

    if (!difficulty) return 0.8

    // Assess text complexity indicators
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    const complexWords = text.split(/\s+/).filter(word => word.length > 8).length

    let complexityScore = 0.5
    if (avgSentenceLength > 80) complexityScore += 0.2
    if (complexWords > 3) complexityScore += 0.2
    if (text.includes('analyze') || text.includes('evaluate') || text.includes('synthesize')) {
      complexityScore += 0.1
    }

    // Compare with expected difficulty
    const difficultyMap = { easy: 0.3, medium: 0.6, hard: 0.9 }
    const expectedComplexity = difficultyMap[difficulty.toLowerCase()] || 0.5
    const difference = Math.abs(complexityScore - expectedComplexity)
    
    score *= Math.max(0.5, 1 - difference)

    return score
  }

  /**
   * Assess logical coherence
   */
  assessLogicalCoherence(question) {
    let score = 1.0
    const text = question.queText || ''

    // Check for logical flow
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Check for contradictions
    const contradictionPatterns = [
      /\b(not|never|no)\b.*\b(always|all|every)\b/gi,
      /\b(increase|rise|grow)\b.*\b(decrease|fall|shrink)\b/gi
    ]

    contradictionPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        score *= 0.7
      }
    })

    // Check for incomplete logical structure
    if (text.includes('because') && !text.includes('therefore') && !text.includes('thus')) {
      // Has reasoning but no conclusion
      score *= 0.9
    }

    return score
  }

  /**
   * Assess technical accuracy
   */
  assessTechnicalAccuracy(question, factorScore, extractionContext) {
    let score = 1.0

    // Mathematical notation assessment
    const mathScore = this.assessMathematicalNotation(question)
    factorScore.subScores.mathematical = mathScore
    score *= mathScore

    // Scientific terminology assessment
    const scienceScore = this.assessScientificTerminology(question)
    factorScore.subScores.scientific = scienceScore
    score *= scienceScore

    // Linguistic accuracy assessment
    const linguisticScore = this.assessLinguisticAccuracy(question)
    factorScore.subScores.linguistic = linguisticScore
    score *= linguisticScore

    return Math.pow(score, 1/3)
  }

  /**
   * Assess mathematical notation
   */
  assessMathematicalNotation(question) {
    let score = 1.0
    const text = question.queText || ''

    // Check for mathematical symbols and notation
    const mathPatterns = [
      /\$.*?\$/g, // LaTeX math
      /\\[a-zA-Z]+/g, // LaTeX commands
      /[∑∏∫√π∞≤≥≠±]/g, // Math symbols
      /\b\d+\/\d+\b/g, // Fractions
      /\b[a-z]\^[0-9]+\b/g // Exponents
    ]

    let mathContent = false
    mathPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        mathContent = true
      }
    })

    if (mathContent) {
      // Check for common math notation errors
      const mathErrors = [
        /\^\s*\{[^}]*$/g, // Unclosed exponent braces
        /\$[^$]*$/g, // Unclosed math delimiters
        /\\[a-zA-Z]+\s*\{[^}]*$/g // Unclosed LaTeX commands
      ]

      mathErrors.forEach(pattern => {
        if (pattern.test(text)) {
          score *= 0.6
        }
      })
    }

    return score
  }

  /**
   * Assess scientific terminology
   */
  assessScientificTerminology(question) {
    let score = 1.0
    const text = question.queText || ''

    // Check for scientific units and notation
    const scientificPatterns = [
      /\b\d+\s*(m|kg|s|A|K|mol|cd)\b/g, // SI units
      /\b\d+\s*(mm|cm|km|g|mg|kg|ml|l)\b/g, // Common units
      /\b\d+\s*°[CF]?\b/g, // Temperature
      /\b\d+\s*(Hz|V|W|J|N|Pa)\b/g // Derived units
    ]

    let scientificContent = false
    scientificPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        scientificContent = true
      }
    })

    if (scientificContent) {
      // Check for unit consistency and proper notation
      const unitErrors = [
        /\b\d+\s*[a-zA-Z]{3,}\b/g, // Potentially incorrect units
        /\b\d+[a-zA-Z]+\b/g // Units without space
      ]

      unitErrors.forEach(pattern => {
        const matches = text.match(pattern)
        if (matches) {
          score *= Math.max(0.7, 1 - matches.length * 0.1)
        }
      })
    }

    return score
  }

  /**
   * Assess linguistic accuracy
   */
  assessLinguisticAccuracy(question) {
    let score = 1.0
    const text = question.queText || ''

    // Check for grammar issues
    const grammarErrors = this.qualityMetrics.contentQuality.grammarPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)

    if (grammarErrors > 0) {
      score *= Math.max(0.6, 1 - grammarErrors * 0.1)
    }

    // Check sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = sentences.reduce((sum, s) => {
      return sum + s.split(/\s+/).length
    }, 0) / sentences.length

    // Very short or very long sentences may indicate issues
    if (avgWordsPerSentence < 5 || avgWordsPerSentence > 40) {
      score *= 0.8
    }

    return score
  }

  /**
   * Assess metadata consistency
   */
  assessMetadataConsistency(question, factorScore, extractionContext) {
    let score = 1.0

    // Type-content alignment
    const alignmentScore = this.assessTypeContentAlignment(question)
    factorScore.subScores.alignment = alignmentScore
    score *= alignmentScore

    // Metadata completeness
    const completenessScore = this.assessMetadataCompleteness(question)
    factorScore.subScores.completeness = completenessScore
    score *= completenessScore

    // Value validity
    const validityScore = this.assessMetadataValidity(question)
    factorScore.subScores.validity = validityScore
    score *= validityScore

    return Math.pow(score, 1/3)
  }

  /**
   * Assess type-content alignment
   */
  assessTypeContentAlignment(question) {
    // This is partially covered in structural integrity
    // but we can add metadata-specific checks here
    return 1.0 // Placeholder for now
  }

  /**
   * Assess metadata completeness
   */
  assessMetadataCompleteness(question) {
    const requiredFields = ['queId', 'queText', 'queType']
    const optionalFields = ['subject', 'difficulty', 'marks', 'section']
    
    const requiredPresent = requiredFields.filter(field => question[field]).length
    const optionalPresent = optionalFields.filter(field => question[field]).length
    
    const requiredScore = requiredPresent / requiredFields.length
    const optionalScore = optionalPresent / optionalFields.length
    
    return 0.7 * requiredScore + 0.3 * optionalScore
  }

  /**
   * Assess metadata validity
   */
  assessMetadataValidity(question) {
    let score = 1.0

    // Check marks format
    if (question.marks) {
      if (typeof question.marks === 'object') {
        if (question.marks.correct && question.marks.correct <= 0) {
          score *= 0.7
        }
      }
    }

    // Check difficulty values
    if (question.difficulty) {
      const validDifficulties = ['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced']
      if (!validDifficulties.includes(question.difficulty.toLowerCase())) {
        score *= 0.8
      }
    }

    return score
  }  /**

   * Apply uncertainty handling
   */
  applyUncertaintyHandling(assessment, question, extractionContext, options) {
    Object.entries(this.uncertaintyHandlers).forEach(([uncertaintyType, handler]) => {
      if (assessment.overallConfidence < handler.threshold) {
        const uncertainty = handler.handler(assessment, question, extractionContext, options)
        if (uncertainty) {
          assessment.uncertainties.push(uncertainty)
        }
      }
    })
  }

  /**
   * Handle ambiguous text uncertainty
   */
  handleAmbiguousText(assessment, question, extractionContext, options) {
    const textScore = assessment.factorScores.textQuality?.score || 0
    if (textScore < 0.5) {
      return {
        type: 'ambiguous_text',
        severity: 'high',
        description: 'Question text appears ambiguous or unclear',
        recommendation: 'Manual review recommended for text clarity',
        confidence_impact: -0.3
      }
    }
    return null
  }

  /**
   * Handle incomplete extraction uncertainty
   */
  handleIncompleteExtraction(assessment, question, extractionContext, options) {
    const extractionScore = assessment.factorScores.extractionQuality?.score || 0
    if (extractionScore < 0.4) {
      return {
        type: 'incomplete_extraction',
        severity: 'high',
        description: 'Extraction appears incomplete or corrupted',
        recommendation: 'Re-extraction or manual completion required',
        confidence_impact: -0.4
      }
    }
    return null
  }

  /**
   * Handle structural inconsistency uncertainty
   */
  handleStructuralInconsistency(assessment, question, extractionContext, options) {
    const structuralScore = assessment.factorScores.structuralIntegrity?.score || 0
    if (structuralScore < 0.35) {
      return {
        type: 'structural_inconsistency',
        severity: 'medium',
        description: 'Question structure appears inconsistent',
        recommendation: 'Verify question type and format',
        confidence_impact: -0.2
      }
    }
    return null
  }

  /**
   * Handle contextual mismatch uncertainty
   */
  handleContextualMismatch(assessment, question, extractionContext, options) {
    const contextScore = assessment.factorScores.contextualRelevance?.score || 0
    if (contextScore < 0.25) {
      return {
        type: 'contextual_mismatch',
        severity: 'medium',
        description: 'Question content may not match expected context',
        recommendation: 'Verify subject and difficulty alignment',
        confidence_impact: -0.15
      }
    }
    return null
  }

  /**
   * Generate quality metrics
   */
  generateQualityMetrics(question, assessment) {
    return {
      overallGrade: this.getConfidenceGrade(assessment.overallConfidence),
      strengths: this.extractStrengths(assessment),
      weaknesses: this.extractWeaknesses(assessment),
      riskLevel: this.assessRiskLevel(assessment),
      reviewPriority: this.calculateReviewPriority(assessment)
    }
  }

  /**
   * Get confidence grade
   */
  getConfidenceGrade(confidence) {
    if (confidence >= 4.5) return 'A'
    if (confidence >= 3.5) return 'B'
    if (confidence >= 2.5) return 'C'
    if (confidence >= 1.5) return 'D'
    return 'F'
  }

  /**
   * Extract strengths from assessment
   */
  extractStrengths(assessment) {
    const strengths = []
    
    Object.entries(assessment.factorScores).forEach(([factor, score]) => {
      if (score.score > 0.8) {
        strengths.push(`Strong ${factor.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
      }
      if (score.strengths) {
        strengths.push(...score.strengths)
      }
    })

    return strengths
  }

  /**
   * Extract weaknesses from assessment
   */
  extractWeaknesses(assessment) {
    const weaknesses = []
    
    Object.entries(assessment.factorScores).forEach(([factor, score]) => {
      if (score.score < 0.5) {
        weaknesses.push(`Weak ${factor.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
      }
      if (score.issues) {
        weaknesses.push(...score.issues)
      }
    })

    return weaknesses
  }

  /**
   * Assess risk level
   */
  assessRiskLevel(assessment) {
    if (assessment.overallConfidence < 2) return 'high'
    if (assessment.overallConfidence < 3) return 'medium'
    if (assessment.uncertainties.length > 2) return 'medium'
    return 'low'
  }

  /**
   * Calculate review priority
   */
  calculateReviewPriority(assessment) {
    let priority = 0
    
    // Base priority on confidence
    priority += (5 - assessment.overallConfidence) * 20
    
    // Add uncertainty penalties
    assessment.uncertainties.forEach(uncertainty => {
      if (uncertainty.severity === 'high') priority += 30
      else if (uncertainty.severity === 'medium') priority += 15
      else priority += 5
    })
    
    // Add factor-specific penalties
    Object.entries(assessment.factorScores).forEach(([factor, score]) => {
      if (score.score < 0.3) priority += 25
      else if (score.score < 0.5) priority += 10
    })
    
    return Math.min(100, priority)
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(assessment, question, options) {
    const recommendations = []

    // Confidence-based recommendations
    if (assessment.overallConfidence < 2) {
      recommendations.push({
        type: 'critical',
        message: 'Question requires immediate manual review',
        action: 'manual_review'
      })
    } else if (assessment.overallConfidence < 3) {
      recommendations.push({
        type: 'warning',
        message: 'Question should be reviewed before use',
        action: 'review_recommended'
      })
    }

    // Factor-specific recommendations
    Object.entries(assessment.factorScores).forEach(([factor, score]) => {
      if (score.score < 0.5) {
        recommendations.push({
          type: 'improvement',
          message: `Improve ${factor.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          action: `fix_${factor}`
        })
      }
    })

    // Uncertainty-based recommendations
    assessment.uncertainties.forEach(uncertainty => {
      recommendations.push({
        type: 'uncertainty',
        message: uncertainty.recommendation,
        action: 'address_uncertainty'
      })
    })

    return recommendations
  }

  /**
   * Apply calibration
   */
  applyCalibration(assessment, question, extractionContext) {
    // Apply any stored calibration data
    const calibrationKey = this.getCalibrationKey(question, extractionContext)
    if (this.calibrationData.has(calibrationKey)) {
      const calibration = this.calibrationData.get(calibrationKey)
      assessment.overallConfidence *= calibration.factor
      assessment.metadata.calibrationApplied = true
    }
  }

  /**
   * Get calibration key
   */
  getCalibrationKey(question, extractionContext) {
    return `${question.queType}_${question.subject || 'general'}_${extractionContext.source || 'unknown'}`
  }

  /**
   * Calculate string similarity
   */
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  /**
   * Calculate Levenshtein distance
   */
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

  /**
   * Batch confidence scoring
   */
  scoreBatch(questions, extractionContext = {}, options = {}) {
    const results = []
    const batchStats = {
      totalQuestions: questions.length,
      averageConfidence: 0,
      confidenceDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      riskDistribution: { low: 0, medium: 0, high: 0 },
      processingTime: Date.now()
    }

    let totalConfidence = 0

    questions.forEach((question, index) => {
      const assessment = this.calculateConfidence(question, extractionContext, options)
      assessment.questionIndex = index
      assessment.questionId = question.queId || `q_${index}`
      
      results.push(assessment)
      
      totalConfidence += assessment.overallConfidence
      
      // Update distributions
      const confidenceLevel = Math.ceil(assessment.overallConfidence)
      batchStats.confidenceDistribution[confidenceLevel]++
      
      const riskLevel = assessment.qualityMetrics.riskLevel
      batchStats.riskDistribution[riskLevel]++
    })

    batchStats.averageConfidence = questions.length > 0 ? totalConfidence / questions.length : 0
    batchStats.processingTime = Date.now() - batchStats.processingTime

    return {
      results,
      statistics: batchStats
    }
  }

  /**
   * Store calibration data
   */
  storeCalibration(questions, actualPerformance) {
    questions.forEach((question, index) => {
      const key = this.getCalibrationKey(question, {})
      const predicted = this.calculateConfidence(question).overallConfidence
      const actual = actualPerformance[index]
      
      if (!this.calibrationData.has(key)) {
        this.calibrationData.set(key, { predictions: [], actuals: [] })
      }
      
      const data = this.calibrationData.get(key)
      data.predictions.push(predicted)
      data.actuals.push(actual)
      
      // Calculate calibration factor
      const avgPredicted = data.predictions.reduce((a, b) => a + b, 0) / data.predictions.length
      const avgActual = data.actuals.reduce((a, b) => a + b, 0) / data.actuals.length
      data.factor = avgActual / avgPredicted
    })
  }
}

/**
 * Convenience functions
 */
export function calculateQuestionConfidence(question, extractionContext = {}, options = {}) {
  const scorer = new ConfidenceScorer()
  return scorer.calculateConfidence(question, extractionContext, options)
}

export function scoreQuestionBatch(questions, extractionContext = {}, options = {}) {
  const scorer = new ConfidenceScorer()
  return scorer.scoreBatch(questions, extractionContext, options)
}

export default ConfidenceScorer