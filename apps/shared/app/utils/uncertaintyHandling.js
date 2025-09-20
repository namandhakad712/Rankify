/**
 * Uncertainty Handling for AI Extraction
 * Manages uncertainty in AI-extracted content and provides recovery strategies
 */

export class UncertaintyHandler {
  constructor() {
    this.uncertaintyTypes = this.initializeUncertaintyTypes()
    this.recoveryStrategies = this.initializeRecoveryStrategies()
    this.confidenceThresholds = this.initializeConfidenceThresholds()
    this.uncertaintyHistory = []
  }

  /**
   * Initialize uncertainty types
   */
  initializeUncertaintyTypes() {
    return {
      textual: {
        ambiguous_content: {
          description: 'Text content is ambiguous or unclear',
          indicators: ['multiple interpretations', 'unclear references', 'incomplete sentences'],
          severity: 'medium',
          impact: 'comprehension'
        },
        encoding_issues: {
          description: 'Text encoding or character recognition problems',
          indicators: ['special characters', 'garbled text', 'missing characters'],
          severity: 'high',
          impact: 'accuracy'
        },
        incomplete_extraction: {
          description: 'Text appears to be partially extracted',
          indicators: ['truncated sentences', 'missing words', 'fragmented content'],
          severity: 'high',
          impact: 'completeness'
        }
      },

      structural: {
        boundary_detection: {
          description: 'Uncertain question boundaries',
          indicators: ['merged questions', 'split questions', 'unclear separators'],
          severity: 'high',
          impact: 'structure'
        },
        type_classification: {
          description: 'Uncertain question type classification',
          indicators: ['mixed indicators', 'atypical format', 'conflicting signals'],
          severity: 'medium',
          impact: 'classification'
        },
        option_parsing: {
          description: 'Uncertain option extraction',
          indicators: ['unclear options', 'merged options', 'missing options'],
          severity: 'high',
          impact: 'options'
        }
      },

      semantic: {
        context_mismatch: {
          description: 'Content doesn\'t match expected context',
          indicators: ['subject mismatch', 'difficulty inconsistency', 'style variation'],
          severity: 'medium',
          impact: 'relevance'
        },
        logical_inconsistency: {
          description: 'Logical inconsistencies in content',
          indicators: ['contradictions', 'impossible scenarios', 'invalid relationships'],
          severity: 'medium',
          impact: 'validity'
        },
        domain_knowledge: {
          description: 'Uncertain domain-specific content',
          indicators: ['technical terms', 'specialized notation', 'expert knowledge'],
          severity: 'low',
          impact: 'accuracy'
        }
      },

      technical: {
        ocr_confidence: {
          description: 'Low OCR confidence scores',
          indicators: ['poor image quality', 'complex layouts', 'unusual fonts'],
          severity: 'high',
          impact: 'accuracy'
        },
        parsing_errors: {
          description: 'Parsing algorithm uncertainties',
          indicators: ['complex structures', 'nested elements', 'irregular formats'],
          severity: 'medium',
          impact: 'structure'
        },
        model_confidence: {
          description: 'Low AI model confidence',
          indicators: ['edge cases', 'unusual patterns', 'conflicting signals'],
          severity: 'medium',
          impact: 'reliability'
        }
      }
    }
  }

  /**
   * Initialize recovery strategies
   */
  initializeRecoveryStrategies() {
    return {
      textual: {
        ambiguous_content: [
          { strategy: 'context_analysis', description: 'Analyze surrounding context for clarification' },
          { strategy: 'multiple_interpretations', description: 'Provide multiple possible interpretations' },
          { strategy: 'human_review', description: 'Flag for human review and clarification' }
        ],
        encoding_issues: [
          { strategy: 'character_correction', description: 'Apply character correction algorithms' },
          { strategy: 'encoding_detection', description: 'Detect and correct encoding issues' },
          { strategy: 'manual_correction', description: 'Manual text correction required' }
        ],
        incomplete_extraction: [
          { strategy: 're_extraction', description: 'Re-run extraction with different parameters' },
          { strategy: 'source_review', description: 'Review original source material' },
          { strategy: 'completion_assistance', description: 'Provide completion assistance tools' }
        ]
      },

      structural: {
        boundary_detection: [
          { strategy: 'boundary_refinement', description: 'Apply refined boundary detection' },
          { strategy: 'manual_segmentation', description: 'Manual question segmentation' },
          { strategy: 'pattern_matching', description: 'Use pattern matching for boundaries' }
        ],
        type_classification: [
          { strategy: 'multi_classifier', description: 'Use multiple classification approaches' },
          { strategy: 'feature_analysis', description: 'Analyze question features for type hints' },
          { strategy: 'default_assignment', description: 'Assign most likely default type' }
        ],
        option_parsing: [
          { strategy: 'option_reconstruction', description: 'Reconstruct options from context' },
          { strategy: 'pattern_recognition', description: 'Use pattern recognition for options' },
          { strategy: 'manual_entry', description: 'Manual option entry required' }
        ]
      },

      semantic: {
        context_mismatch: [
          { strategy: 'context_verification', description: 'Verify against expected context' },
          { strategy: 'metadata_correction', description: 'Correct metadata based on content' },
          { strategy: 'content_flagging', description: 'Flag for content review' }
        ],
        logical_inconsistency: [
          { strategy: 'consistency_check', description: 'Run logical consistency checks' },
          { strategy: 'contradiction_resolution', description: 'Resolve logical contradictions' },
          { strategy: 'expert_review', description: 'Require expert domain review' }
        ],
        domain_knowledge: [
          { strategy: 'domain_validation', description: 'Validate against domain knowledge' },
          { strategy: 'expert_consultation', description: 'Consult domain experts' },
          { strategy: 'reference_checking', description: 'Check against reference materials' }
        ]
      },

      technical: {
        ocr_confidence: [
          { strategy: 'image_enhancement', description: 'Enhance source image quality' },
          { strategy: 'alternative_ocr', description: 'Try alternative OCR engines' },
          { strategy: 'manual_transcription', description: 'Manual transcription required' }
        ],
        parsing_errors: [
          { strategy: 'parser_tuning', description: 'Tune parsing parameters' },
          { strategy: 'alternative_parser', description: 'Use alternative parsing approach' },
          { strategy: 'structured_input', description: 'Provide more structured input' }
        ],
        model_confidence: [
          { strategy: 'ensemble_methods', description: 'Use ensemble of models' },
          { strategy: 'confidence_calibration', description: 'Calibrate confidence scores' },
          { strategy: 'human_validation', description: 'Human validation for low confidence' }
        ]
      }
    }
  }

  /**
   * Initialize confidence thresholds
   */
  initializeConfidenceThresholds() {
    return {
      critical: 0.3,  // Below this requires immediate attention
      low: 0.5,       // Below this requires review
      medium: 0.7,    // Below this may need attention
      high: 0.85      // Above this is considered reliable
    }
  }

  /**
   * Analyze uncertainty in extracted content
   * @param {Object} question - Extracted question data
   * @param {Object} extractionContext - Context from extraction process
   * @param {Object} options - Analysis options
   * @returns {Object} Uncertainty analysis result
   */
  analyzeUncertainty(question, extractionContext = {}, options = {}) {
    const analysis = {
      overallUncertainty: 0,
      uncertaintyFactors: {},
      detectedUncertainties: [],
      recommendedActions: [],
      riskAssessment: {
        level: 'low',
        factors: [],
        mitigation: []
      },
      metadata: {
        analysisTime: Date.now(),
        version: '1.0'
      }
    }

    // Analyze each uncertainty category
    Object.entries(this.uncertaintyTypes).forEach(([category, types]) => {
      const categoryAnalysis = this.analyzeCategoryUncertainty(question, category, types, extractionContext, options)
      analysis.uncertaintyFactors[category] = categoryAnalysis
      
      // Aggregate detected uncertainties
      analysis.detectedUncertainties.push(...categoryAnalysis.detectedUncertainties)
    })

    // Calculate overall uncertainty
    analysis.overallUncertainty = this.calculateOverallUncertainty(analysis.uncertaintyFactors)

    // Generate risk assessment
    analysis.riskAssessment = this.assessRisk(analysis)

    // Generate recommended actions
    analysis.recommendedActions = this.generateRecommendedActions(analysis)

    // Store in history
    this.uncertaintyHistory.push({
      questionId: question.queId || 'unknown',
      timestamp: new Date().toISOString(),
      overallUncertainty: analysis.overallUncertainty,
      detectedCount: analysis.detectedUncertainties.length
    })

    return analysis
  }

  /**
   * Analyze uncertainty for a specific category
   */
  analyzeCategoryUncertainty(question, category, types, extractionContext, options) {
    const categoryAnalysis = {
      categoryScore: 0,
      detectedUncertainties: [],
      indicators: [],
      confidence: 1.0
    }

    Object.entries(types).forEach(([typeName, typeConfig]) => {
      const typeAnalysis = this.analyzeUncertaintyType(question, category, typeName, typeConfig, extractionContext, options)
      
      if (typeAnalysis.detected) {
        categoryAnalysis.detectedUncertainties.push({
          category,
          type: typeName,
          ...typeAnalysis
        })
        
        categoryAnalysis.indicators.push(...typeAnalysis.indicators)
        categoryAnalysis.confidence *= (1 - typeAnalysis.severity)
      }
    })

    categoryAnalysis.categoryScore = 1 - categoryAnalysis.confidence

    return categoryAnalysis
  }

  /**
   * Analyze specific uncertainty type
   */
  analyzeUncertaintyType(question, category, typeName, typeConfig, extractionContext, options) {
    const analysis = {
      detected: false,
      severity: 0,
      confidence: 1.0,
      indicators: [],
      evidence: []
    }

    // Apply category-specific analysis
    switch (category) {
      case 'textual':
        this.analyzeTextualUncertainty(question, typeName, typeConfig, analysis, extractionContext)
        break
      case 'structural':
        this.analyzeStructuralUncertainty(question, typeName, typeConfig, analysis, extractionContext)
        break
      case 'semantic':
        this.analyzeSemanticUncertainty(question, typeName, typeConfig, analysis, extractionContext)
        break
      case 'technical':
        this.analyzeTechnicalUncertainty(question, typeName, typeConfig, analysis, extractionContext)
        break
    }

    return analysis
  }

  /**
   * Analyze textual uncertainties
   */
  analyzeTextualUncertainty(question, typeName, typeConfig, analysis, extractionContext) {
    const text = question.queText || ''

    switch (typeName) {
      case 'ambiguous_content':
        // Check for ambiguous language patterns
        const ambiguousPatterns = [
          /\b(this|that|it|they)\b/gi,
          /\b(some|many|few|several)\b/gi,
          /\b(might|could|may|possibly)\b/gi
        ]
        
        let ambiguityScore = 0
        ambiguousPatterns.forEach(pattern => {
          const matches = text.match(pattern)
          if (matches) {
            ambiguityScore += matches.length * 0.1
            analysis.indicators.push(`Ambiguous language: ${matches[0]}`)
          }
        })
        
        if (ambiguityScore > 0.3) {
          analysis.detected = true
          analysis.severity = Math.min(1, ambiguityScore)
        }
        break

      case 'encoding_issues':
        // Check for encoding problems
        const encodingPatterns = [
          /â€™/g, /â€œ/g, /â€/g, /Ã¡/g, /Ã©/g, /\uFFFD/g
        ]
        
        let encodingIssues = 0
        encodingPatterns.forEach(pattern => {
          const matches = text.match(pattern)
          if (matches) {
            encodingIssues += matches.length
            analysis.indicators.push(`Encoding issue: ${matches[0]}`)
          }
        })
        
        if (encodingIssues > 0) {
          analysis.detected = true
          analysis.severity = Math.min(1, encodingIssues * 0.2)
        }
        break

      case 'incomplete_extraction':
        // Check for incomplete text indicators
        const incompletePatterns = [
          /\.\.\./g, /\[.*?\]/g, /\{.*?\}/g, /__+/g, /^\s*[.,:;]/
        ]
        
        let incompleteMarkers = 0
        incompletePatterns.forEach(pattern => {
          const matches = text.match(pattern)
          if (matches) {
            incompleteMarkers += matches.length
            analysis.indicators.push(`Incomplete marker: ${matches[0]}`)
          }
        })
        
        // Check for very short text
        if (text.length < 20) {
          incompleteMarkers += 1
          analysis.indicators.push('Text too short')
        }
        
        if (incompleteMarkers > 0) {
          analysis.detected = true
          analysis.severity = Math.min(1, incompleteMarkers * 0.3)
        }
        break
    }
  }

  /**
   * Analyze structural uncertainties
   */
  analyzeStructuralUncertainty(question, typeName, typeConfig, analysis, extractionContext) {
    switch (typeName) {
      case 'boundary_detection':
        // Check for boundary detection issues
        if (extractionContext.boundaryConfidence && extractionContext.boundaryConfidence < 0.7) {
          analysis.detected = true
          analysis.severity = 1 - extractionContext.boundaryConfidence
          analysis.indicators.push(`Low boundary confidence: ${extractionContext.boundaryConfidence}`)
        }
        
        // Check for multiple question markers in text
        const questionMarkers = (question.queText || '').match(/^\s*\d+[\.)]/gm)
        if (questionMarkers && questionMarkers.length > 1) {
          analysis.detected = true
          analysis.severity = Math.min(1, questionMarkers.length * 0.2)
          analysis.indicators.push(`Multiple question markers: ${questionMarkers.length}`)
        }
        break

      case 'type_classification':
        // Check for type classification uncertainty
        if (extractionContext.typeConfidence && extractionContext.typeConfidence < 0.8) {
          analysis.detected = true
          analysis.severity = 1 - extractionContext.typeConfidence
          analysis.indicators.push(`Low type confidence: ${extractionContext.typeConfidence}`)
        }
        
        // Check for conflicting type indicators
        const text = (question.queText || '').toLowerCase()
        const mcqIndicators = ['choose one', 'select one', 'which of the following']
        const msqIndicators = ['choose all', 'select all', 'which of these']
        
        const hasMCQ = mcqIndicators.some(indicator => text.includes(indicator))
        const hasMSQ = msqIndicators.some(indicator => text.includes(indicator))
        
        if (hasMCQ && hasMSQ) {
          analysis.detected = true
          analysis.severity = 0.6
          analysis.indicators.push('Conflicting question type indicators')
        }
        break

      case 'option_parsing':
        // Check for option parsing issues
        if (['mcq', 'msq'].includes(question.queType)) {
          const options = question.options || []
          
          if (options.length === 0) {
            analysis.detected = true
            analysis.severity = 1.0
            analysis.indicators.push('No options extracted for MCQ/MSQ')
          } else {
            // Check for malformed options
            const emptyOptions = options.filter(opt => !opt || opt.trim().length === 0).length
            if (emptyOptions > 0) {
              analysis.detected = true
              analysis.severity = emptyOptions / options.length
              analysis.indicators.push(`${emptyOptions} empty options`)
            }
            
            // Check for very short options
            const shortOptions = options.filter(opt => opt && opt.trim().length < 3).length
            if (shortOptions > options.length * 0.5) {
              analysis.detected = true
              analysis.severity = 0.4
              analysis.indicators.push('Many very short options')
            }
          }
        }
        break
    }
  }

  /**
   * Analyze semantic uncertainties
   */
  analyzeSemanticUncertainty(question, typeName, typeConfig, analysis, extractionContext) {
    switch (typeName) {
      case 'context_mismatch':
        // Check for subject mismatch
        if (question.subject && extractionContext.expectedSubject) {
          if (question.subject.toLowerCase() !== extractionContext.expectedSubject.toLowerCase()) {
            analysis.detected = true
            analysis.severity = 0.5
            analysis.indicators.push(`Subject mismatch: ${question.subject} vs ${extractionContext.expectedSubject}`)
          }
        }
        
        // Check for difficulty inconsistency
        if (question.difficulty && extractionContext.expectedDifficulty) {
          const difficultyOrder = ['easy', 'medium', 'hard']
          const questionDiff = difficultyOrder.indexOf(question.difficulty.toLowerCase())
          const expectedDiff = difficultyOrder.indexOf(extractionContext.expectedDifficulty.toLowerCase())
          
          if (Math.abs(questionDiff - expectedDiff) > 1) {
            analysis.detected = true
            analysis.severity = 0.3
            analysis.indicators.push(`Difficulty mismatch: ${question.difficulty} vs ${extractionContext.expectedDifficulty}`)
          }
        }
        break

      case 'logical_inconsistency':
        // Check for logical contradictions
        const text = (question.queText || '').toLowerCase()
        const contradictionPatterns = [
          /\b(not|never|no)\b.*\b(always|all|every)\b/gi,
          /\b(increase|rise|grow)\b.*\b(decrease|fall|shrink)\b/gi,
          /\b(true)\b.*\b(false)\b/gi
        ]
        
        contradictionPatterns.forEach(pattern => {
          if (pattern.test(text)) {
            analysis.detected = true
            analysis.severity = 0.4
            analysis.indicators.push('Potential logical contradiction detected')
          }
        })
        break

      case 'domain_knowledge':
        // Check for complex domain-specific content
        const text = question.queText || ''
        const complexPatterns = [
          /\$.*?\$/g, // LaTeX math
          /\\[a-zA-Z]+/g, // LaTeX commands
          /[∑∏∫√π∞≤≥≠±]/g, // Math symbols
          /\b[A-Z]{2,}\b/g // Acronyms
        ]
        
        let complexityScore = 0
        complexPatterns.forEach(pattern => {
          const matches = text.match(pattern)
          if (matches) {
            complexityScore += matches.length * 0.1
          }
        })
        
        if (complexityScore > 0.5) {
          analysis.detected = true
          analysis.severity = Math.min(1, complexityScore)
          analysis.indicators.push('High domain complexity detected')
        }
        break
    }
  }

  /**
   * Analyze technical uncertainties
   */
  analyzeTechnicalUncertainty(question, typeName, typeConfig, analysis, extractionContext) {
    switch (typeName) {
      case 'ocr_confidence':
        if (extractionContext.ocrConfidence && extractionContext.ocrConfidence < 0.8) {
          analysis.detected = true
          analysis.severity = 1 - extractionContext.ocrConfidence
          analysis.indicators.push(`Low OCR confidence: ${extractionContext.ocrConfidence}`)
        }
        break

      case 'parsing_errors':
        if (extractionContext.parsingErrors && extractionContext.parsingErrors.length > 0) {
          analysis.detected = true
          analysis.severity = Math.min(1, extractionContext.parsingErrors.length * 0.2)
          analysis.indicators.push(`${extractionContext.parsingErrors.length} parsing errors`)
        }
        break

      case 'model_confidence':
        if (extractionContext.modelConfidence && extractionContext.modelConfidence < 0.7) {
          analysis.detected = true
          analysis.severity = 1 - extractionContext.modelConfidence
          analysis.indicators.push(`Low model confidence: ${extractionContext.modelConfidence}`)
        }
        break
    }
  }

  /**
   * Calculate overall uncertainty
   */
  calculateOverallUncertainty(uncertaintyFactors) {
    let totalUncertainty = 0
    let totalWeight = 0
    
    const categoryWeights = {
      textual: 0.3,
      structural: 0.3,
      semantic: 0.2,
      technical: 0.2
    }

    Object.entries(uncertaintyFactors).forEach(([category, analysis]) => {
      const weight = categoryWeights[category] || 0.25
      totalUncertainty += analysis.categoryScore * weight
      totalWeight += weight
    })

    return totalWeight > 0 ? totalUncertainty / totalWeight : 0
  }

  /**
   * Assess risk based on uncertainty analysis
   */
  assessRisk(analysis) {
    const riskAssessment = {
      level: 'low',
      factors: [],
      mitigation: []
    }

    // Determine risk level
    if (analysis.overallUncertainty > 0.7) {
      riskAssessment.level = 'high'
    } else if (analysis.overallUncertainty > 0.4) {
      riskAssessment.level = 'medium'
    }

    // Identify risk factors
    analysis.detectedUncertainties.forEach(uncertainty => {
      if (uncertainty.severity > 0.5) {
        riskAssessment.factors.push({
          type: uncertainty.type,
          category: uncertainty.category,
          severity: uncertainty.severity,
          description: this.uncertaintyTypes[uncertainty.category][uncertainty.type].description
        })
      }
    })

    // Generate mitigation strategies
    riskAssessment.mitigation = this.generateMitigationStrategies(analysis)

    return riskAssessment
  }

  /**
   * Generate recommended actions
   */
  generateRecommendedActions(analysis) {
    const actions = []

    // High uncertainty actions
    if (analysis.overallUncertainty > 0.7) {
      actions.push({
        priority: 'critical',
        action: 'immediate_review',
        description: 'Immediate manual review required due to high uncertainty'
      })
    } else if (analysis.overallUncertainty > 0.4) {
      actions.push({
        priority: 'high',
        action: 'review_recommended',
        description: 'Review recommended due to moderate uncertainty'
      })
    }

    // Specific uncertainty actions
    analysis.detectedUncertainties.forEach(uncertainty => {
      const strategies = this.recoveryStrategies[uncertainty.category]?.[uncertainty.type] || []
      strategies.forEach(strategy => {
        actions.push({
          priority: uncertainty.severity > 0.6 ? 'high' : 'medium',
          action: strategy.strategy,
          description: strategy.description,
          uncertaintyType: uncertainty.type
        })
      })
    })

    return actions
  }

  /**
   * Generate mitigation strategies
   */
  generateMitigationStrategies(analysis) {
    const strategies = []

    analysis.detectedUncertainties.forEach(uncertainty => {
      const recoveryOptions = this.recoveryStrategies[uncertainty.category]?.[uncertainty.type] || []
      recoveryOptions.forEach(option => {
        strategies.push({
          strategy: option.strategy,
          description: option.description,
          applicableFor: uncertainty.type,
          effectiveness: this.estimateEffectiveness(option.strategy, uncertainty)
        })
      })
    })

    // Sort by effectiveness
    return strategies.sort((a, b) => b.effectiveness - a.effectiveness)
  }

  /**
   * Estimate strategy effectiveness
   */
  estimateEffectiveness(strategy, uncertainty) {
    // Simple heuristic for strategy effectiveness
    const effectivenessMap = {
      're_extraction': 0.8,
      'manual_correction': 0.9,
      'human_review': 0.85,
      'context_analysis': 0.7,
      'pattern_matching': 0.6,
      'default_assignment': 0.4
    }

    return effectivenessMap[strategy] || 0.5
  }

  /**
   * Batch uncertainty analysis
   */
  analyzeBatch(questions, extractionContext = {}, options = {}) {
    const results = []
    const batchStats = {
      totalQuestions: questions.length,
      averageUncertainty: 0,
      uncertaintyDistribution: { low: 0, medium: 0, high: 0 },
      commonUncertainties: {},
      processingTime: Date.now()
    }

    let totalUncertainty = 0

    questions.forEach((question, index) => {
      const analysis = this.analyzeUncertainty(question, extractionContext, options)
      analysis.questionIndex = index
      analysis.questionId = question.queId || `q_${index}`
      
      results.push(analysis)
      
      totalUncertainty += analysis.overallUncertainty
      
      // Update distributions
      const riskLevel = analysis.riskAssessment.level
      batchStats.uncertaintyDistribution[riskLevel]++
      
      // Track common uncertainties
      analysis.detectedUncertainties.forEach(uncertainty => {
        const key = `${uncertainty.category}_${uncertainty.type}`
        batchStats.commonUncertainties[key] = (batchStats.commonUncertainties[key] || 0) + 1
      })
    })

    batchStats.averageUncertainty = questions.length > 0 ? totalUncertainty / questions.length : 0
    batchStats.processingTime = Date.now() - batchStats.processingTime

    return {
      results,
      statistics: batchStats
    }
  }

  /**
   * Export uncertainty history
   */
  exportHistory() {
    return {
      history: this.uncertaintyHistory,
      summary: {
        totalAnalyses: this.uncertaintyHistory.length,
        averageUncertainty: this.uncertaintyHistory.reduce((sum, h) => sum + h.overallUncertainty, 0) / this.uncertaintyHistory.length,
        commonPatterns: this.identifyCommonPatterns()
      }
    }
  }

  /**
   * Identify common uncertainty patterns
   */
  identifyCommonPatterns() {
    // Analyze history to identify common uncertainty patterns
    const patterns = {}
    
    this.uncertaintyHistory.forEach(entry => {
      // Simple pattern identification based on uncertainty levels
      const level = entry.overallUncertainty > 0.7 ? 'high' : 
                   entry.overallUncertainty > 0.4 ? 'medium' : 'low'
      patterns[level] = (patterns[level] || 0) + 1
    })
    
    return patterns
  }
}

/**
 * Convenience functions
 */
export function analyzeQuestionUncertainty(question, extractionContext = {}, options = {}) {
  const handler = new UncertaintyHandler()
  return handler.analyzeUncertainty(question, extractionContext, options)
}

export function analyzeUncertaintyBatch(questions, extractionContext = {}, options = {}) {
  const handler = new UncertaintyHandler()
  return handler.analyzeBatch(questions, extractionContext, options)
}

export default UncertaintyHandler