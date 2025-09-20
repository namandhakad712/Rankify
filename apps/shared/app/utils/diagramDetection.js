/**
 * Advanced Diagram Detection Algorithms
 * Uses multiple detection strategies to identify diagram references in questions
 */

export class DiagramDetector {
  constructor() {
    this.diagramKeywords = this.initializeDiagramKeywords()
    this.visualIndicators = this.initializeVisualIndicators()
    this.contextPatterns = this.initializeContextPatterns()
    this.detectionStrategies = this.initializeDetectionStrategies()
  }

  /**
   * Initialize diagram-related keywords
   */
  initializeDiagramKeywords() {
    return {
      direct: [
        'figure', 'diagram', 'chart', 'graph', 'image', 'picture', 'illustration',
        'drawing', 'sketch', 'plot', 'map', 'table', 'flowchart', 'schematic',
        'blueprint', 'layout', 'design', 'model', 'structure', 'pattern'
      ],
      
      references: [
        'shown above', 'shown below', 'given above', 'given below',
        'refer to', 'see figure', 'see diagram', 'see chart', 'see table',
        'as shown', 'as illustrated', 'as depicted', 'as displayed',
        'according to', 'based on', 'from the', 'in the', 'using the'
      ],
      
      spatial: [
        'above', 'below', 'left', 'right', 'top', 'bottom', 'center',
        'adjacent', 'opposite', 'beside', 'next to', 'following',
        'preceding', 'corresponding', 'respective'
      ],
      
      mathematical: [
        'coordinate', 'axis', 'plot', 'curve', 'line', 'point', 'vertex',
        'angle', 'triangle', 'circle', 'rectangle', 'polygon', 'shape',
        'geometry', 'geometric', 'algebraic', 'function', 'equation'
      ],
      
      scientific: [
        'specimen', 'sample', 'experiment', 'observation', 'data',
        'measurement', 'reading', 'scale', 'instrument', 'apparatus',
        'setup', 'configuration', 'arrangement', 'circuit', 'component'
      ]
    }
  }

  /**
   * Initialize visual indicators
   */
  initializeVisualIndicators() {
    return {
      numbering: [
        /fig\s*\.?\s*\d+/gi,
        /figure\s+\d+/gi,
        /diagram\s+\d+/gi,
        /chart\s+\d+/gi,
        /table\s+\d+/gi,
        /image\s+\d+/gi
      ],
      
      labeling: [
        /\([a-z]\)/gi,
        /\([0-9]+\)/gi,
        /[a-z]\)/gi,
        /[0-9]+\)/gi,
        /label[s]?\s*[a-z0-9]/gi
      ],
      
      coordinates: [
        /\(\s*[+-]?\d*\.?\d+\s*,\s*[+-]?\d*\.?\d+\s*\)/g,
        /x\s*=\s*[+-]?\d*\.?\d+/gi,
        /y\s*=\s*[+-]?\d*\.?\d+/gi,
        /point\s*[a-z]\s*\(/gi
      ],
      
      measurements: [
        /\d+\s*(cm|mm|m|km|inch|ft|yard)/gi,
        /\d+\s*°/g,
        /\d+\s*(degrees?|radians?)/gi,
        /scale\s*[:=]\s*\d+/gi
      ]
    }
  }

  /**
   * Initialize context patterns
   */
  initializeContextPatterns() {
    return {
      questionStarters: [
        /^(from|using|based on|according to|in|with reference to)\s+the\s+(figure|diagram|chart|graph|table|image)/i,
        /^(observe|examine|study|analyze|consider)\s+the\s+(figure|diagram|chart|graph|table|image)/i,
        /^(refer to|see|look at|view)\s+the\s+(figure|diagram|chart|graph|table|image)/i
      ],
      
      questionEnders: [
        /(shown|given|displayed|illustrated|depicted)\s+(above|below|in the figure|in the diagram)\.?$/i,
        /(as shown|as illustrated|as depicted)\s+in\s+the\s+(figure|diagram|chart|graph|table)\.?$/i
      ],
      
      midSentence: [
        /,\s*as\s+(shown|illustrated|depicted)\s+in\s+(figure|diagram|chart|graph|table)/i,
        /\(\s*(see|refer to|cf\.?)\s+(figure|diagram|chart|graph|table)/i,
        /\[\s*(see|refer to|cf\.?)\s+(figure|diagram|chart|graph|table)/i
      ]
    }
  }

  /**
   * Initialize detection strategies
   */
  initializeDetectionStrategies() {
    return [
      { name: 'keyword', weight: 0.3, method: this.detectByKeywords.bind(this) },
      { name: 'visual', weight: 0.25, method: this.detectByVisualIndicators.bind(this) },
      { name: 'context', weight: 0.2, method: this.detectByContext.bind(this) },
      { name: 'structure', weight: 0.15, method: this.detectByStructure.bind(this) },
      { name: 'semantic', weight: 0.1, method: this.detectBySemantic.bind(this) }
    ]
  }

  /**
   * Main diagram detection method
   * @param {Object} question - Question object with text and metadata
   * @param {Object} options - Detection options
   * @returns {Object} Detection result with confidence and details
   */
  detectDiagram(question, options = {}) {
    const text = this.extractQuestionText(question)
    const detectionResult = {
      hasDiagram: false,
      confidence: 0,
      strategies: {},
      indicators: [],
      reasoning: [],
      metadata: {
        textLength: text.length,
        detectionTime: Date.now()
      }
    }

    // Apply all detection strategies
    let totalScore = 0
    let totalWeight = 0

    this.detectionStrategies.forEach(strategy => {
      const result = strategy.method(text, question, options)
      detectionResult.strategies[strategy.name] = result
      
      const weightedScore = result.score * strategy.weight
      totalScore += weightedScore
      totalWeight += strategy.weight
      
      if (result.indicators.length > 0) {
        detectionResult.indicators.push(...result.indicators)
        detectionResult.reasoning.push(...result.reasoning)
      }
    })

    // Calculate final confidence
    detectionResult.confidence = totalWeight > 0 ? totalScore / totalWeight : 0
    detectionResult.hasDiagram = detectionResult.confidence > (options.threshold || 0.3)

    // Apply post-processing adjustments
    this.applyPostProcessingAdjustments(detectionResult, question, options)

    return detectionResult
  }

  /**
   * Extract question text from various formats
   */
  extractQuestionText(question) {
    if (typeof question === 'string') {
      return question
    }
    
    return question.queText || 
           question.text || 
           question.question || 
           question.content || 
           ''
  }

  /**
   * Detect diagrams by keywords
   */
  detectByKeywords(text, question, options) {
    const result = {
      score: 0,
      indicators: [],
      reasoning: [],
      details: {
        directMatches: 0,
        referenceMatches: 0,
        spatialMatches: 0,
        domainMatches: 0
      }
    }

    const lowerText = text.toLowerCase()

    // Check direct diagram keywords
    this.diagramKeywords.direct.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = text.match(regex)
      if (matches) {
        result.details.directMatches += matches.length
        result.indicators.push(`Direct keyword: "${keyword}" (${matches.length} times)`)
        result.score += 0.3 * matches.length
      }
    })

    // Check reference phrases
    this.diagramKeywords.references.forEach(phrase => {
      if (lowerText.includes(phrase.toLowerCase())) {
        result.details.referenceMatches++
        result.indicators.push(`Reference phrase: "${phrase}"`)
        result.score += 0.25
      }
    })

    // Check spatial indicators
    this.diagramKeywords.spatial.forEach(spatial => {
      const regex = new RegExp(`\\b${spatial}\\b`, 'gi')
      if (regex.test(text)) {
        result.details.spatialMatches++
        result.indicators.push(`Spatial indicator: "${spatial}"`)
        result.score += 0.1
      }
    })

    // Check domain-specific keywords
    const subject = question.subject || options.subject || ''
    if (subject.toLowerCase().includes('math') || subject.toLowerCase().includes('geometry')) {
      this.diagramKeywords.mathematical.forEach(keyword => {
        if (lowerText.includes(keyword.toLowerCase())) {
          result.details.domainMatches++
          result.indicators.push(`Mathematical term: "${keyword}"`)
          result.score += 0.15
        }
      })
    }

    if (subject.toLowerCase().includes('science') || subject.toLowerCase().includes('physics') || subject.toLowerCase().includes('chemistry')) {
      this.diagramKeywords.scientific.forEach(keyword => {
        if (lowerText.includes(keyword.toLowerCase())) {
          result.details.domainMatches++
          result.indicators.push(`Scientific term: "${keyword}"`)
          result.score += 0.15
        }
      })
    }

    // Generate reasoning
    if (result.details.directMatches > 0) {
      result.reasoning.push(`Found ${result.details.directMatches} direct diagram keyword(s)`)
    }
    if (result.details.referenceMatches > 0) {
      result.reasoning.push(`Found ${result.details.referenceMatches} reference phrase(s)`)
    }

    // Normalize score
    result.score = Math.min(1, result.score)

    return result
  }

  /**
   * Detect diagrams by visual indicators
   */
  detectByVisualIndicators(text, question, options) {
    const result = {
      score: 0,
      indicators: [],
      reasoning: [],
      details: {
        numbering: 0,
        labeling: 0,
        coordinates: 0,
        measurements: 0
      }
    }

    // Check for figure/diagram numbering
    this.visualIndicators.numbering.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        result.details.numbering += matches.length
        result.indicators.push(`Numbering pattern: ${matches.join(', ')}`)
        result.score += 0.4 * matches.length
      }
    })

    // Check for labeling patterns
    this.visualIndicators.labeling.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches && matches.length > 2) { // Multiple labels suggest diagram
        result.details.labeling += matches.length
        result.indicators.push(`Label pattern: ${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}`)
        result.score += 0.2
      }
    })

    // Check for coordinate patterns
    this.visualIndicators.coordinates.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        result.details.coordinates += matches.length
        result.indicators.push(`Coordinate pattern: ${matches.join(', ')}`)
        result.score += 0.3 * matches.length
      }
    })

    // Check for measurement patterns
    this.visualIndicators.measurements.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        result.details.measurements += matches.length
        result.indicators.push(`Measurement pattern: ${matches.join(', ')}`)
        result.score += 0.2 * matches.length
      }
    })

    // Generate reasoning
    if (result.details.numbering > 0) {
      result.reasoning.push(`Contains figure/diagram numbering (${result.details.numbering} instances)`)
    }
    if (result.details.coordinates > 0) {
      result.reasoning.push(`Contains coordinate references (${result.details.coordinates} instances)`)
    }
    if (result.details.measurements > 0) {
      result.reasoning.push(`Contains measurements (${result.details.measurements} instances)`)
    }

    // Normalize score
    result.score = Math.min(1, result.score)

    return result
  }

  /**
   * Detect diagrams by context patterns
   */
  detectByContext(text, question, options) {
    const result = {
      score: 0,
      indicators: [],
      reasoning: [],
      details: {
        questionStarters: 0,
        questionEnders: 0,
        midSentence: 0
      }
    }

    // Check question starters
    this.contextPatterns.questionStarters.forEach(pattern => {
      if (pattern.test(text)) {
        result.details.questionStarters++
        result.indicators.push(`Question starts with diagram reference`)
        result.score += 0.5
      }
    })

    // Check question enders
    this.contextPatterns.questionEnders.forEach(pattern => {
      if (pattern.test(text)) {
        result.details.questionEnders++
        result.indicators.push(`Question ends with diagram reference`)
        result.score += 0.4
      }
    })

    // Check mid-sentence references
    this.contextPatterns.midSentence.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        result.details.midSentence += matches.length
        result.indicators.push(`Mid-sentence diagram reference: ${matches[0]}`)
        result.score += 0.3 * matches.length
      }
    })

    // Generate reasoning
    if (result.details.questionStarters > 0) {
      result.reasoning.push('Question begins with diagram reference')
    }
    if (result.details.questionEnders > 0) {
      result.reasoning.push('Question ends with diagram reference')
    }
    if (result.details.midSentence > 0) {
      result.reasoning.push('Contains mid-sentence diagram references')
    }

    // Normalize score
    result.score = Math.min(1, result.score)

    return result
  }

  /**
   * Detect diagrams by text structure
   */
  detectByStructure(text, question, options) {
    const result = {
      score: 0,
      indicators: [],
      reasoning: [],
      details: {
        shortSentences: 0,
        imperativeVerbs: 0,
        questionStructure: 0
      }
    }

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Check for short, directive sentences (common with diagram questions)
    const shortSentences = sentences.filter(s => s.trim().length < 50 && s.trim().length > 10)
    if (shortSentences.length > 0) {
      result.details.shortSentences = shortSentences.length
      result.indicators.push(`${shortSentences.length} short directive sentence(s)`)
      result.score += 0.1 * shortSentences.length
    }

    // Check for imperative verbs common in diagram questions
    const imperativeVerbs = ['observe', 'examine', 'study', 'analyze', 'identify', 'determine', 'find', 'calculate', 'measure']
    imperativeVerbs.forEach(verb => {
      const regex = new RegExp(`\\b${verb}\\b`, 'gi')
      if (regex.test(text)) {
        result.details.imperativeVerbs++
        result.indicators.push(`Imperative verb: "${verb}"`)
        result.score += 0.15
      }
    })

    // Check overall question structure
    if (text.length > 100 && sentences.length > 2) {
      // Complex questions are more likely to reference diagrams
      result.details.questionStructure = 1
      result.score += 0.1
    }

    // Generate reasoning
    if (result.details.imperativeVerbs > 0) {
      result.reasoning.push(`Contains ${result.details.imperativeVerbs} imperative verb(s) suggesting visual analysis`)
    }

    // Normalize score
    result.score = Math.min(1, result.score)

    return result
  }

  /**
   * Detect diagrams by semantic analysis
   */
  detectBySemantic(text, question, options) {
    const result = {
      score: 0,
      indicators: [],
      reasoning: [],
      details: {
        visualVerbs: 0,
        spatialPrepositions: 0,
        comparativeLanguage: 0
      }
    }

    const lowerText = text.toLowerCase()

    // Check for visual verbs
    const visualVerbs = ['see', 'look', 'view', 'observe', 'watch', 'notice', 'spot', 'identify', 'recognize']
    visualVerbs.forEach(verb => {
      const regex = new RegExp(`\\b${verb}\\b`, 'gi')
      const matches = text.match(regex)
      if (matches) {
        result.details.visualVerbs += matches.length
        result.indicators.push(`Visual verb: "${verb}" (${matches.length} times)`)
        result.score += 0.1 * matches.length
      }
    })

    // Check for spatial prepositions
    const spatialPrepositions = ['above', 'below', 'beside', 'between', 'among', 'within', 'outside', 'inside']
    spatialPrepositions.forEach(prep => {
      if (lowerText.includes(prep)) {
        result.details.spatialPrepositions++
        result.indicators.push(`Spatial preposition: "${prep}"`)
        result.score += 0.05
      }
    })

    // Check for comparative language (common in diagram analysis)
    const comparativeWords = ['larger', 'smaller', 'higher', 'lower', 'greater', 'less', 'more', 'fewer', 'compare', 'contrast']
    comparativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        result.details.comparativeLanguage++
        result.indicators.push(`Comparative language: "${word}"`)
        result.score += 0.05
      }
    })

    // Generate reasoning
    if (result.details.visualVerbs > 0) {
      result.reasoning.push(`Contains visual verbs suggesting observation tasks`)
    }
    if (result.details.spatialPrepositions > 0) {
      result.reasoning.push(`Uses spatial language indicating visual relationships`)
    }

    // Normalize score
    result.score = Math.min(1, result.score)

    return result
  }

  /**
   * Apply post-processing adjustments
   */
  applyPostProcessingAdjustments(result, question, options) {
    // Boost confidence for certain subjects
    const subject = (question.subject || '').toLowerCase()
    if (subject.includes('geometry') || subject.includes('physics') || subject.includes('chemistry')) {
      result.confidence *= 1.2
      result.reasoning.push(`Subject "${question.subject}" commonly uses diagrams`)
    }

    // Reduce confidence for very short questions
    if (result.metadata.textLength < 30) {
      result.confidence *= 0.7
      result.reasoning.push('Short question text reduces diagram likelihood')
    }

    // Boost confidence if multiple strategies agree
    const positiveStrategies = Object.values(result.strategies).filter(s => s.score > 0.3).length
    if (positiveStrategies >= 3) {
      result.confidence *= 1.3
      result.reasoning.push(`${positiveStrategies} detection strategies indicate diagram presence`)
    }

    // Apply manual overrides if provided
    if (options.forceDetection) {
      result.hasDiagram = true
      result.confidence = Math.max(result.confidence, 0.8)
      result.reasoning.push('Manual override: forced diagram detection')
    }

    if (options.suppressDetection) {
      result.hasDiagram = false
      result.confidence = Math.min(result.confidence, 0.2)
      result.reasoning.push('Manual override: suppressed diagram detection')
    }

    // Clamp confidence to valid range
    result.confidence = Math.max(0, Math.min(1, result.confidence))
  }

  /**
   * Batch diagram detection for multiple questions
   */
  detectBatch(questions, options = {}) {
    const results = []
    const batchStats = {
      totalQuestions: questions.length,
      diagramQuestions: 0,
      averageConfidence: 0,
      detectionStrategies: {},
      processingTime: Date.now()
    }

    let totalConfidence = 0

    questions.forEach((question, index) => {
      const result = this.detectDiagram(question, options)
      result.questionIndex = index
      result.questionId = question.queId || `q_${index}`
      
      results.push(result)
      
      if (result.hasDiagram) {
        batchStats.diagramQuestions++
      }
      
      totalConfidence += result.confidence

      // Aggregate strategy statistics
      Object.entries(result.strategies).forEach(([strategy, data]) => {
        if (!batchStats.detectionStrategies[strategy]) {
          batchStats.detectionStrategies[strategy] = {
            totalScore: 0,
            positiveDetections: 0,
            averageScore: 0
          }
        }
        
        batchStats.detectionStrategies[strategy].totalScore += data.score
        if (data.score > 0.3) {
          batchStats.detectionStrategies[strategy].positiveDetections++
        }
      })
    })

    // Calculate final statistics
    batchStats.averageConfidence = questions.length > 0 ? totalConfidence / questions.length : 0
    batchStats.processingTime = Date.now() - batchStats.processingTime

    // Calculate strategy averages
    Object.keys(batchStats.detectionStrategies).forEach(strategy => {
      const stats = batchStats.detectionStrategies[strategy]
      stats.averageScore = stats.totalScore / questions.length
    })

    return {
      results,
      statistics: batchStats
    }
  }

  /**
   * Calibrate detection thresholds based on sample data
   */
  calibrateThresholds(sampleQuestions, knownResults) {
    const calibrationData = []
    
    sampleQuestions.forEach((question, index) => {
      const detection = this.detectDiagram(question, { threshold: 0 })
      const known = knownResults[index]
      
      calibrationData.push({
        confidence: detection.confidence,
        actualHasDiagram: known.hasDiagram,
        strategies: detection.strategies
      })
    })

    // Find optimal threshold using ROC analysis
    const thresholds = []
    for (let t = 0; t <= 1; t += 0.05) {
      let truePositives = 0
      let falsePositives = 0
      let trueNegatives = 0
      let falseNegatives = 0

      calibrationData.forEach(data => {
        const predicted = data.confidence > t
        const actual = data.actualHasDiagram

        if (predicted && actual) truePositives++
        else if (predicted && !actual) falsePositives++
        else if (!predicted && !actual) trueNegatives++
        else if (!predicted && actual) falseNegatives++
      })

      const precision = truePositives / (truePositives + falsePositives) || 0
      const recall = truePositives / (truePositives + falseNegatives) || 0
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0

      thresholds.push({
        threshold: t,
        precision,
        recall,
        f1Score,
        accuracy: (truePositives + trueNegatives) / calibrationData.length
      })
    }

    // Find threshold with best F1 score
    const bestThreshold = thresholds.reduce((best, current) => 
      current.f1Score > best.f1Score ? current : best
    )

    return {
      optimalThreshold: bestThreshold.threshold,
      performance: bestThreshold,
      allThresholds: thresholds,
      calibrationData
    }
  }

  /**
   * Export detection model for reuse
   */
  exportModel() {
    return {
      version: '1.0',
      keywords: this.diagramKeywords,
      visualIndicators: this.visualIndicators,
      contextPatterns: this.contextPatterns,
      strategies: this.detectionStrategies.map(s => ({
        name: s.name,
        weight: s.weight
      }))
    }
  }

  /**
   * Import detection model
   */
  importModel(model) {
    if (model.keywords) this.diagramKeywords = model.keywords
    if (model.visualIndicators) this.visualIndicators = model.visualIndicators
    if (model.contextPatterns) this.contextPatterns = model.contextPatterns
    
    if (model.strategies) {
      model.strategies.forEach(strategy => {
        const existing = this.detectionStrategies.find(s => s.name === strategy.name)
        if (existing) {
          existing.weight = strategy.weight
        }
      })
    }
  }
}

/**
 * Convenience functions
 */
export function detectDiagramInQuestion(question, options = {}) {
  const detector = new DiagramDetector()
  return detector.detectDiagram(question, options)
}

export function detectDiagramsInBatch(questions, options = {}) {
  const detector = new DiagramDetector()
  return detector.detectBatch(questions, options)
}

export default DiagramDetector