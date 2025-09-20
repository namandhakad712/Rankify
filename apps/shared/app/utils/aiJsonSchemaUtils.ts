/**
 * AI JSON Schema Utilities
 * Converts AI extraction results to match existing Rankify JSON schema
 */

import type { AIExtractionResult, AIExtractedQuestion } from './geminiAPIClient'
import type { 
  TestInterfaceJsonOutput, 
  QuestionAnswer, 
  TestAnswerKeyData,
  GenericSubjectsTree 
} from '#layers/shared/shared/types/index.d'

export interface AIToRankifyConversionOptions {
  includeAnswerKey?: boolean
  generateTestConfig?: boolean
  estimatedDuration?: number // in seconds
  zipUrl?: string
  pdfFileHash?: string
}

export interface ConversionResult {
  success: boolean
  data?: TestInterfaceJsonOutput
  errors: string[]
  warnings: string[]
}

/**
 * AI JSON Schema Converter
 */
export class AIJsonSchemaConverter {
  /**
   * Convert AI extraction result to Rankify JSON format
   */
  convertToRankifyFormat(
    aiResult: AIExtractionResult,
    options: AIToRankifyConversionOptions = {}
  ): ConversionResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate input
      const validation = this.validateAIResult(aiResult)
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        }
      }

      // Convert questions to structured format
      const structuredData = this.convertQuestionsToStructuredFormat(aiResult.questions)
      
      // Generate test sections list
      const testSectionsList = this.generateTestSectionsList(structuredData)
      
      // Generate test summary
      const testSummary = this.generateTestSummary(structuredData)
      
      // Generate test config
      const testConfig = this.generateTestConfig(aiResult, options)
      
      // Generate test result overview
      const testResultOverview = this.generateTestResultOverview(aiResult, testConfig)

      // Create the final JSON structure
      const rankifyJson: TestInterfaceJsonOutput = {
        appVersion: '1.25.0', // Current app version
        generatedBy: 'testInterfacePage',
        testConfig,
        testSummary,
        testData: {
          testSectionsList,
          testSectionsData: structuredData
        },
        testLogs: [], // Empty for AI-generated data
        testResultOverview,
        testNotes: {} // Empty initially
      }

      // Add answer key if requested
      if (options.includeAnswerKey) {
        rankifyJson.testAnswerKey = this.generateAnswerKey(aiResult.questions)
      }

      return {
        success: true,
        data: rankifyJson,
        errors,
        warnings
      }

    } catch (error) {
      errors.push(`Conversion failed: ${error.message}`)
      return {
        success: false,
        errors,
        warnings
      }
    }
  }

  /**
   * Validate AI extraction result
   */
  private validateAIResult(aiResult: AIExtractionResult): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!aiResult.questions || aiResult.questions.length === 0) {
      errors.push('No questions found in AI extraction result')
    }

    if (!aiResult.metadata) {
      warnings.push('Missing metadata in AI extraction result')
    }

    // Validate individual questions
    aiResult.questions.forEach((question, index) => {
      if (!question.text || question.text.trim().length === 0) {
        errors.push(`Question ${index + 1}: Missing question text`)
      }

      if (!question.type || !['MCQ', 'MSQ', 'NAT', 'MSM', 'Diagram'].includes(question.type)) {
        errors.push(`Question ${index + 1}: Invalid question type: ${question.type}`)
      }

      if (!question.subject || question.subject.trim().length === 0) {
        warnings.push(`Question ${index + 1}: Missing subject`)
      }

      if (!question.section || question.section.trim().length === 0) {
        warnings.push(`Question ${index + 1}: Missing section`)
      }

      if (question.confidence < 1 || question.confidence > 5) {
        warnings.push(`Question ${index + 1}: Invalid confidence score: ${question.confidence}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Convert questions to structured format expected by Rankify
   */
  private convertQuestionsToStructuredFormat(questions: AIExtractedQuestion[]): TestSessionSectionsData {
    const structuredData: TestSessionSectionsData = {}

    questions.forEach((question) => {
      const subject = question.subject || 'Unknown Subject'
      const section = question.section || 'Unknown Section'
      const questionKey = question.questionNumber.toString()

      // Initialize nested structure if needed
      if (!structuredData[section]) {
        structuredData[section] = {}
      }

      // Convert AI question to Rankify format
      const rankifyQuestion: TestSessionQuestionData = {
        queId: `${section}_${questionKey}`,
        section: section,
        que: questionKey,
        queType: this.mapQuestionType(question.type),
        queText: question.text,
        queOptions: this.formatQuestionOptions(question.options, question.type),
        queMarks: this.generateDefaultMarks(question.type),
        queAnswer: null, // Will be set during answer key generation
        status: 'notVisited',
        answer: null,
        timeSpent: 0,
        subject: subject,
        pageNumber: question.pageNumber,
        hasDiagram: question.hasDiagram,
        confidence: question.confidence,
        aiMetadata: {
          extractionModel: question.extractionMetadata.geminiModel,
          processingTime: question.extractionMetadata.processingTime,
          originalId: question.id
        }
      }

      structuredData[section][questionKey] = rankifyQuestion
    })

    return structuredData
  }

  /**
   * Map AI question types to Rankify question types
   */
  private mapQuestionType(aiType: string): QuestionType {
    const typeMap: Record<string, QuestionType> = {
      'MCQ': 'mcq',
      'MSQ': 'msq',
      'NAT': 'nat',
      'MSM': 'msm',
      'Diagram': 'mcq' // Default diagram questions to MCQ
    }

    return typeMap[aiType] || 'mcq'
  }

  /**
   * Format question options for Rankify format
   */
  private formatQuestionOptions(options: string[], questionType: string): any {
    if (questionType === 'NAT') {
      return null // NAT questions don't have options
    }

    if (questionType === 'MSM') {
      // For MSM, we need to determine rows and columns
      // Default to 4x4 if we can't determine from options
      const optionCount = options.length
      const size = Math.ceil(Math.sqrt(optionCount))
      return {
        rows: size,
        cols: size,
        options: options
      }
    }

    // For MCQ and MSQ, return options count
    return options.length
  }

  /**
   * Generate default marking scheme
   */
  private generateDefaultMarks(questionType: string): QuestionMarks {
    const defaultMarks: Record<string, QuestionMarks> = {
      'MCQ': { cm: 4, im: -1 },
      'MSQ': { cm: 4, im: -2, pm: 1 },
      'NAT': { cm: 4, im: 0 },
      'MSM': { cm: 1, im: -1 }, // Per row
      'Diagram': { cm: 4, im: -1 }
    }

    return defaultMarks[questionType] || { cm: 4, im: -1 }
  }

  /**
   * Generate test sections list
   */
  private generateTestSectionsList(structuredData: TestSessionSectionsData): TestSectionListItem[] {
    const sections: TestSectionListItem[] = []
    let sectionIndex = 0

    Object.keys(structuredData).forEach((sectionName) => {
      const questions = Object.values(structuredData[sectionName])
      const subjects = [...new Set(questions.map(q => q.subject))]
      
      sections.push({
        id: sectionIndex++,
        name: sectionName,
        subject: subjects.join(', '),
        totalQuestions: questions.length,
        timeLimit: this.estimateSectionTimeLimit(questions.length),
        isOptional: false,
        optionalQuestions: 0
      })
    })

    return sections
  }

  /**
   * Estimate time limit for section based on question count
   */
  private estimateSectionTimeLimit(questionCount: number): number {
    // Estimate 2 minutes per question on average
    return questionCount * 120 // seconds
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(structuredData: TestSessionSectionsData): TestSummaryDataTableRow[] {
    const summary: TestSummaryDataTableRow[] = []
    
    Object.entries(structuredData).forEach(([sectionName, questions]) => {
      const questionList = Object.values(questions)
      const subjects = [...new Set(questionList.map(q => q.subject))]
      
      subjects.forEach(subject => {
        const subjectQuestions = questionList.filter(q => q.subject === subject)
        const typeGroups = this.groupQuestionsByType(subjectQuestions)
        
        Object.entries(typeGroups).forEach(([type, count]) => {
          summary.push({
            subject,
            section: sectionName,
            questionType: type as QuestionType,
            count,
            marks: this.calculateTotalMarks(subjectQuestions.filter(q => q.queType === type))
          })
        })
      })
    })

    return summary
  }

  /**
   * Group questions by type
   */
  private groupQuestionsByType(questions: TestSessionQuestionData[]): Record<string, number> {
    return questions.reduce((acc, question) => {
      acc[question.queType] = (acc[question.queType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Calculate total marks for questions
   */
  private calculateTotalMarks(questions: TestSessionQuestionData[]): number {
    return questions.reduce((total, question) => {
      return total + (question.queMarks.cm || 0)
    }, 0)
  }

  /**
   * Generate test configuration
   */
  private generateTestConfig(aiResult: AIExtractionResult, options: AIToRankifyConversionOptions): TestInterfaceJsonOutput['testConfig'] {
    const totalQuestions = aiResult.questions.length
    const estimatedDuration = options.estimatedDuration || totalQuestions * 120 // 2 minutes per question

    return {
      testName: `AI Extracted Test - ${aiResult.metadata.pdfMetadata.fileName}`,
      testDurationInSeconds: estimatedDuration,
      pdfFileHash: options.pdfFileHash || aiResult.metadata.pdfMetadata.fileHash,
      zipOriginalUrl: options.zipUrl,
      zipConvertedUrl: options.zipUrl
    }
  }

  /**
   * Generate test result overview
   */
  private generateTestResultOverview(aiResult: AIExtractionResult, testConfig: any): TestResultOverview {
    const now = new Date()
    
    return {
      testName: testConfig.testName,
      testStartTime: now.toISOString(),
      testEndTime: new Date(now.getTime() + testConfig.testDurationInSeconds * 1000).toISOString(),
      totalQuestions: aiResult.questions.length,
      totalMarks: this.calculateTotalPossibleMarks(aiResult.questions),
      confidence: aiResult.confidence,
      aiGenerated: true,
      extractionDate: aiResult.metadata.processingDate
    }
  }

  /**
   * Calculate total possible marks
   */
  private calculateTotalPossibleMarks(questions: AIExtractedQuestion[]): number {
    return questions.reduce((total, question) => {
      const marks = this.generateDefaultMarks(question.type)
      return total + (marks.cm || 0)
    }, 0)
  }

  /**
   * Generate answer key (placeholder - actual answers would need to be provided)
   */
  private generateAnswerKey(questions: AIExtractedQuestion[]): TestAnswerKeyData {
    const answerKey: TestAnswerKeyData = {}

    questions.forEach((question) => {
      const subject = question.subject || 'Unknown Subject'
      const section = question.section || 'Unknown Section'
      const questionKey = question.questionNumber.toString()

      if (!answerKey[subject]) {
        answerKey[subject] = {}
      }
      if (!answerKey[subject][section]) {
        answerKey[subject][section] = {}
      }

      // Placeholder answer - in real implementation, this would come from manual input
      let answer: QuestionAnswer = null
      
      switch (question.type) {
        case 'MCQ':
          answer = 0 // First option (A)
          break
        case 'MSQ':
          answer = [0] // First option selected
          break
        case 'NAT':
          answer = '0' // Placeholder numerical answer
          break
        case 'MSM':
          answer = { '0': [0] } // Placeholder matrix answer
          break
        default:
          answer = null
      }

      answerKey[subject][section][questionKey] = answer
    })

    return answerKey
  }

  /**
   * Validate converted Rankify JSON
   */
  validateRankifyJson(json: TestInterfaceJsonOutput): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic structure validation
    if (!json.testConfig) {
      errors.push('Missing testConfig')
    }

    if (!json.testData) {
      errors.push('Missing testData')
    }

    if (!json.testSummary) {
      errors.push('Missing testSummary')
    }

    // Validate test data structure
    if (json.testData) {
      if (!json.testData.testSectionsList || !Array.isArray(json.testData.testSectionsList)) {
        errors.push('Invalid testSectionsList')
      }

      if (!json.testData.testSectionsData || typeof json.testData.testSectionsData !== 'object') {
        errors.push('Invalid testSectionsData')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Utility functions
 */
export const aiJsonSchemaUtils = {
  /**
   * Create converter instance
   */
  createConverter(): AIJsonSchemaConverter {
    return new AIJsonSchemaConverter()
  },

  /**
   * Quick conversion function
   */
  convertAIToRankify(
    aiResult: AIExtractionResult,
    options: AIToRankifyConversionOptions = {}
  ): ConversionResult {
    const converter = new AIJsonSchemaConverter()
    return converter.convertToRankifyFormat(aiResult, options)
  },

  /**
   * Estimate test duration based on questions
   */
  estimateTestDuration(questions: AIExtractedQuestion[]): number {
    let totalSeconds = 0

    questions.forEach(question => {
      switch (question.type) {
        case 'MCQ':
          totalSeconds += 90 // 1.5 minutes
          break
        case 'MSQ':
          totalSeconds += 120 // 2 minutes
          break
        case 'NAT':
          totalSeconds += 150 // 2.5 minutes
          break
        case 'MSM':
          totalSeconds += 180 // 3 minutes
          break
        case 'Diagram':
          totalSeconds += 180 // 3 minutes for diagram questions
          break
        default:
          totalSeconds += 120 // 2 minutes default
      }

      // Add extra time for low confidence questions
      if (question.confidence < 3) {
        totalSeconds += 30 // Extra 30 seconds for review
      }
    })

    return totalSeconds
  },

  /**
   * Generate test name from AI metadata
   */
  generateTestName(aiResult: AIExtractionResult): string {
    const fileName = aiResult.metadata.pdfMetadata.fileName.replace('.pdf', '')
    const date = new Date().toLocaleDateString()
    const questionCount = aiResult.questions.length
    
    return `${fileName} - ${questionCount} Questions (${date})`
  },

  /**
   * Extract subjects and sections from questions
   */
  extractSubjectsAndSections(questions: AIExtractedQuestion[]): {
    subjects: string[]
    sections: string[]
    subjectSectionMap: Record<string, string[]>
  } {
    const subjects = new Set<string>()
    const sections = new Set<string>()
    const subjectSectionMap: Record<string, Set<string>> = {}

    questions.forEach(question => {
      const subject = question.subject || 'Unknown Subject'
      const section = question.section || 'Unknown Section'

      subjects.add(subject)
      sections.add(section)

      if (!subjectSectionMap[subject]) {
        subjectSectionMap[subject] = new Set()
      }
      subjectSectionMap[subject].add(section)
    })

    // Convert sets to arrays
    const result = {
      subjects: Array.from(subjects),
      sections: Array.from(sections),
      subjectSectionMap: Object.fromEntries(
        Object.entries(subjectSectionMap).map(([subject, sectionSet]) => [
          subject,
          Array.from(sectionSet)
        ])
      )
    }

    return result
  }
}

/**
 * Default export
 */
export default AIJsonSchemaConverter