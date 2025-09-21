/**
 * CBT Preset Engine
 * 
 * This module provides predefined CBT configurations for common examinations
 * like JEE and NEET, with web scraping capabilities to fetch current schemas.
 */

import type { 
  CBTPreset, 
  CBTSection, 
  CBTMarkingScheme, 
  QuestionDistribution,
  ExamSchema,
  EnhancedQuestion
} from '~/shared/types/diagram-detection'

export interface CBTPresetEngineConfig {
  enableWebScraping?: boolean
  cacheTimeout?: number // in milliseconds
  fallbackToCache?: boolean
  customPresets?: CBTPreset[]
}

export interface ConfiguredTest {
  testId: string
  testName: string
  examType: string
  preset: CBTPreset
  questions: EnhancedQuestion[]
  sections: CBTSection[]
  totalQuestions: number
  totalDuration: number
  createdAt: Date
}

export interface PresetValidationResult {
  isCompatible: boolean
  warnings: string[]
  suggestions: string[]
  requiredAdjustments: string[]
}

/**
 * CBT Preset Engine Class
 * Manages examination presets and configurations
 */
export class CBTPresetEngine {
  private presets = new Map<string, CBTPreset>()
  private schemaCache = new Map<string, { schema: ExamSchema; timestamp: number }>()
  private config: Required<CBTPresetEngineConfig>

  constructor(config: CBTPresetEngineConfig = {}) {
    this.config = {
      enableWebScraping: true,
      cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
      fallbackToCache: true,
      customPresets: [],
      ...config
    }

    this.initializeDefaultPresets()
    this.loadCustomPresets()
  }

  /**
   * Load a preset by exam type
   */
  async loadPreset(examType: string): Promise<CBTPreset | null> {
    const preset = this.presets.get(examType.toUpperCase())
    if (!preset) return null

    // Try to update with latest schema if web scraping is enabled
    if (this.config.enableWebScraping) {
      try {
        const latestSchema = await this.fetchLatestExamSchema(examType)
        if (latestSchema) {
          return this.updatePresetWithSchema(preset, latestSchema)
        }
      } catch (error) {
        console.warn(`Failed to fetch latest schema for ${examType}:`, error)
      }
    }

    return preset
  }

  /**
   * Get all available presets
   */
  getAllPresets(): CBTPreset[] {
    return Array.from(this.presets.values())
  }

  /**
   * Get presets by exam type
   */
  getPresetsByType(examType: string): CBTPreset[] {
    return Array.from(this.presets.values()).filter(
      preset => preset.examType === examType.toUpperCase()
    )
  }

  /**
   * Add custom preset
   */
  addCustomPreset(preset: CBTPreset): void {
    this.presets.set(preset.id, preset)
  }

  /**
   * Apply preset to questions and create configured test
   */
  async applyPresetToQuestions(
    questions: EnhancedQuestion[], 
    presetId: string,
    testName?: string
  ): Promise<ConfiguredTest> {
    const preset = await this.loadPreset(presetId)
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`)
    }

    // Validate compatibility
    const validation = this.validatePresetCompatibility(questions, preset)
    if (!validation.isCompatible) {
      throw new Error(`Preset incompatible: ${validation.requiredAdjustments.join(', ')}`)
    }

    // Organize questions by sections
    const organizedQuestions = this.organizeQuestionsBySection(questions, preset)

    // Create configured test
    const configuredTest: ConfiguredTest = {
      testId: this.generateTestId(),
      testName: testName || `${preset.name} Test`,
      examType: preset.examType,
      preset,
      questions: organizedQuestions,
      sections: preset.sections,
      totalQuestions: organizedQuestions.length,
      totalDuration: preset.timeLimit,
      createdAt: new Date()
    }

    return configuredTest
  }

  /**
   * Fetch latest examination schema from web sources
   */
  async fetchLatestExamSchema(examType: string): Promise<ExamSchema | null> {
    const cacheKey = examType.toUpperCase()
    const cached = this.schemaCache.get(cacheKey)
    
    // Return cached if still valid
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.schema
    }

    try {
      const schema = await this.scrapeExamSchema(examType)
      if (schema) {
        this.schemaCache.set(cacheKey, { schema, timestamp: Date.now() })
        return schema
      }
    } catch (error) {
      console.warn(`Failed to scrape schema for ${examType}:`, error)
    }

    // Fallback to cache if enabled
    if (this.config.fallbackToCache && cached) {
      return cached.schema
    }

    return null
  }

  /**
   * Validate preset compatibility with questions
   */
  validatePresetCompatibility(
    questions: EnhancedQuestion[], 
    preset: CBTPreset
  ): PresetValidationResult {
    const warnings: string[] = []
    const suggestions: string[] = []
    const requiredAdjustments: string[] = []

    // Check question count
    const totalExpected = preset.questionDistribution.totalQuestions
    if (questions.length < totalExpected) {
      warnings.push(`Expected ${totalExpected} questions, but only ${questions.length} available`)
      suggestions.push('Consider reducing question count in preset or adding more questions')
    } else if (questions.length > totalExpected) {
      warnings.push(`More questions available (${questions.length}) than expected (${totalExpected})`)
      suggestions.push('Extra questions will be randomly selected')
    }

    // Check subject distribution
    const subjectCounts = this.countQuestionsBySubject(questions)
    for (const section of preset.sections) {
      for (const subject of section.subjects) {
        const available = subjectCounts[subject] || 0
        const required = Math.floor(section.questionCount / section.subjects.length)
        
        if (available < required) {
          requiredAdjustments.push(
            `Need ${required} ${subject} questions, but only ${available} available`
          )
        }
      }
    }

    // Check question types
    const typeCounts = this.countQuestionsByType(questions)
    if (preset.examType === 'JEE' && typeCounts.NAT === 0) {
      warnings.push('JEE typically includes Numerical Answer Type questions')
      suggestions.push('Consider adding NAT questions for better authenticity')
    }

    const isCompatible = requiredAdjustments.length === 0

    return {
      isCompatible,
      warnings,
      suggestions,
      requiredAdjustments
    }
  }

  /**
   * Create custom preset from questions
   */
  createCustomPreset(
    questions: EnhancedQuestion[],
    presetName: string,
    examType: string = 'CUSTOM'
  ): CBTPreset {
    const subjectCounts = this.countQuestionsBySubject(questions)
    const subjects = Object.keys(subjectCounts)

    // Create sections based on subjects
    const sections: CBTSection[] = subjects.map(subject => ({
      name: subject,
      subjects: [subject],
      questionCount: subjectCounts[subject],
      timeAllocation: Math.round((subjectCounts[subject] / questions.length) * 180) // 3 hours default
    }))

    // Default marking scheme
    const markingScheme: CBTMarkingScheme = {
      correct: 4,
      incorrect: -1,
      unattempted: 0
    }

    const preset: CBTPreset = {
      id: `custom_${Date.now()}`,
      name: presetName,
      examType: examType as any,
      sections,
      timeLimit: 180, // 3 hours default
      markingScheme,
      questionDistribution: {
        totalQuestions: questions.length,
        sections: sections.map(s => ({
          name: s.name,
          subjects: s.subjects,
          questionCount: s.questionCount,
          timeAllocation: s.timeAllocation
        }))
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.addCustomPreset(preset)
    return preset
  }

  // Private helper methods

  private initializeDefaultPresets(): void {
    // JEE Main Preset
    const jeeMainPreset: CBTPreset = {
      id: 'JEE_MAIN',
      name: 'JEE Main',
      examType: 'JEE',
      sections: [
        {
          name: 'Physics',
          subjects: ['Physics'],
          questionCount: 25,
          timeAllocation: 60 // 1 hour
        },
        {
          name: 'Chemistry',
          subjects: ['Chemistry'],
          questionCount: 25,
          timeAllocation: 60 // 1 hour
        },
        {
          name: 'Mathematics',
          subjects: ['Mathematics'],
          questionCount: 25,
          timeAllocation: 60 // 1 hour
        }
      ],
      timeLimit: 180, // 3 hours
      markingScheme: {
        correct: 4,
        incorrect: -1,
        unattempted: 0
      },
      questionDistribution: {
        totalQuestions: 75,
        sections: [
          { name: 'Physics', subjects: ['Physics'], questionCount: 25, timeAllocation: 60 },
          { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 25, timeAllocation: 60 },
          { name: 'Mathematics', subjects: ['Mathematics'], questionCount: 25, timeAllocation: 60 }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // JEE Advanced Preset
    const jeeAdvancedPreset: CBTPreset = {
      id: 'JEE_ADVANCED',
      name: 'JEE Advanced',
      examType: 'JEE',
      sections: [
        {
          name: 'Physics',
          subjects: ['Physics'],
          questionCount: 18,
          timeAllocation: 60
        },
        {
          name: 'Chemistry',
          subjects: ['Chemistry'],
          questionCount: 18,
          timeAllocation: 60
        },
        {
          name: 'Mathematics',
          subjects: ['Mathematics'],
          questionCount: 18,
          timeAllocation: 60
        }
      ],
      timeLimit: 180,
      markingScheme: {
        correct: 3,
        incorrect: -1,
        unattempted: 0,
        partialCredit: 1
      },
      questionDistribution: {
        totalQuestions: 54,
        sections: [
          { name: 'Physics', subjects: ['Physics'], questionCount: 18, timeAllocation: 60 },
          { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 18, timeAllocation: 60 },
          { name: 'Mathematics', subjects: ['Mathematics'], questionCount: 18, timeAllocation: 60 }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // NEET Preset
    const neetPreset: CBTPreset = {
      id: 'NEET',
      name: 'NEET',
      examType: 'NEET',
      sections: [
        {
          name: 'Physics',
          subjects: ['Physics'],
          questionCount: 45,
          timeAllocation: 60
        },
        {
          name: 'Chemistry',
          subjects: ['Chemistry'],
          questionCount: 45,
          timeAllocation: 60
        },
        {
          name: 'Biology',
          subjects: ['Biology', 'Botany', 'Zoology'],
          questionCount: 90,
          timeAllocation: 60
        }
      ],
      timeLimit: 180,
      markingScheme: {
        correct: 4,
        incorrect: -1,
        unattempted: 0
      },
      questionDistribution: {
        totalQuestions: 180,
        sections: [
          { name: 'Physics', subjects: ['Physics'], questionCount: 45, timeAllocation: 60 },
          { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 45, timeAllocation: 60 },
          { name: 'Biology', subjects: ['Biology', 'Botany', 'Zoology'], questionCount: 90, timeAllocation: 60 }
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Add presets to map
    this.presets.set('JEE_MAIN', jeeMainPreset)
    this.presets.set('JEE_ADVANCED', jeeAdvancedPreset)
    this.presets.set('NEET', neetPreset)
  }

  private loadCustomPresets(): void {
    // Load custom presets from config
    this.config.customPresets.forEach(preset => {
      this.presets.set(preset.id, preset)
    })
  }

  private async scrapeExamSchema(examType: string): Promise<ExamSchema | null> {
    // This is a simplified implementation
    // In a real application, you would implement actual web scraping
    
    const mockSchemas: Record<string, ExamSchema> = {
      'JEE': {
        examType: 'JEE Main',
        totalQuestions: 75,
        totalDuration: 180,
        sections: [
          { name: 'Physics', subjects: ['Physics'], questionCount: 25, timeAllocation: 60 },
          { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 25, timeAllocation: 60 },
          { name: 'Mathematics', subjects: ['Mathematics'], questionCount: 25, timeAllocation: 60 }
        ],
        markingScheme: {
          correct: 4,
          incorrect: -1,
          unattempted: 0
        },
        lastUpdated: new Date(),
        source: 'https://jeemain.nta.nic.in/'
      },
      'NEET': {
        examType: 'NEET',
        totalQuestions: 180,
        totalDuration: 180,
        sections: [
          { name: 'Physics', subjects: ['Physics'], questionCount: 45, timeAllocation: 60 },
          { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 45, timeAllocation: 60 },
          { name: 'Biology', subjects: ['Biology', 'Botany', 'Zoology'], questionCount: 90, timeAllocation: 60 }
        ],
        markingScheme: {
          correct: 4,
          incorrect: -1,
          unattempted: 0
        },
        lastUpdated: new Date(),
        source: 'https://neet.nta.nic.in/'
      }
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return mockSchemas[examType.toUpperCase()] || null
  }

  private updatePresetWithSchema(preset: CBTPreset, schema: ExamSchema): CBTPreset {
    // Update preset with latest schema information
    const updatedPreset: CBTPreset = {
      ...preset,
      sections: schema.sections.map(section => ({
        name: section.name,
        subjects: section.subjects,
        questionCount: section.questionCount,
        timeAllocation: section.timeAllocation
      })),
      timeLimit: schema.totalDuration,
      markingScheme: schema.markingScheme,
      questionDistribution: {
        totalQuestions: schema.totalQuestions,
        sections: schema.sections
      },
      updatedAt: new Date()
    }

    this.presets.set(preset.id, updatedPreset)
    return updatedPreset
  }

  private organizeQuestionsBySection(
    questions: EnhancedQuestion[], 
    preset: CBTPreset
  ): EnhancedQuestion[] {
    const organizedQuestions: EnhancedQuestion[] = []
    
    for (const section of preset.sections) {
      // Filter questions by section subjects
      const sectionQuestions = questions.filter(q => 
        section.subjects.some(subject => 
          q.subject?.toLowerCase().includes(subject.toLowerCase())
        )
      )

      // Take required number of questions for this section
      const requiredCount = section.questionCount
      const selectedQuestions = sectionQuestions.slice(0, requiredCount)

      // Add section and time allocation metadata
      selectedQuestions.forEach(q => {
        q.section = section.name
        q.timeAllocation = Math.round(section.timeAllocation / section.questionCount)
      })

      organizedQuestions.push(...selectedQuestions)
    }

    return organizedQuestions
  }

  private countQuestionsBySubject(questions: EnhancedQuestion[]): Record<string, number> {
    const counts: Record<string, number> = {}
    
    questions.forEach(q => {
      const subject = q.subject || 'Unknown'
      counts[subject] = (counts[subject] || 0) + 1
    })

    return counts
  }

  private countQuestionsByType(questions: EnhancedQuestion[]): Record<string, number> {
    const counts: Record<string, number> = {}
    
    questions.forEach(q => {
      const type = q.type || 'Unknown'
      counts[type] = (counts[type] || 0) + 1
    })

    return counts
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Factory function to create CBT preset engine
 */
export function createCBTPresetEngine(config?: CBTPresetEngineConfig): CBTPresetEngine {
  return new CBTPresetEngine(config)
}

export default CBTPresetEngine