/**
 * Examination Schema Fetcher
 * 
 * This module provides web scraping capabilities to fetch current
 * examination schemas and patterns from official sources.
 */

import type { ExamSchema, CBTMarkingScheme } from '~/shared/types/diagram-detection'

export interface SchemaFetcherConfig {
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  userAgent?: string
  enableCaching?: boolean
  cacheTimeout?: number
}

export interface SchemaSource {
  name: string
  url: string
  examType: string
  parser: (html: string) => ExamSchema | null
  lastUpdated?: Date
  isActive: boolean
}

/**
 * Examination Schema Fetcher Class
 * Handles fetching and parsing examination schemas from web sources
 */
export class ExamSchemaFetcher {
  private config: Required<SchemaFetcherConfig>
  private sources: Map<string, SchemaSource> = new Map()
  private cache: Map<string, { schema: ExamSchema; timestamp: number }> = new Map()

  constructor(config: SchemaFetcherConfig = {}) {
    this.config = {
      timeout: 10000, // 10 seconds
      retryAttempts: 3,
      retryDelay: 2000, // 2 seconds
      userAgent: 'Mozilla/5.0 (compatible; ExamSchemaFetcher/1.0)',
      enableCaching: true,
      cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    }

    this.initializeDefaultSources()
  }

  /**
   * Fetch examination schema by exam type
   */
  async fetchSchema(examType: string): Promise<ExamSchema | null> {
    const cacheKey = examType.toUpperCase()
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
        return cached.schema
      }
    }

    // Find active sources for this exam type
    const sources = Array.from(this.sources.values()).filter(
      source => source.examType.toUpperCase() === examType.toUpperCase() && source.isActive
    )

    if (sources.length === 0) {
      console.warn(`No active sources found for exam type: ${examType}`)
      return null
    }

    // Try each source until one succeeds
    for (const source of sources) {
      try {
        const schema = await this.fetchFromSource(source)
        if (schema) {
          // Cache the result
          if (this.config.enableCaching) {
            this.cache.set(cacheKey, { schema, timestamp: Date.now() })
          }
          return schema
        }
      } catch (error) {
        console.warn(`Failed to fetch from source ${source.name}:`, error)
      }
    }

    return null
  }

  /**
   * Add custom schema source
   */
  addSource(source: SchemaSource): void {
    this.sources.set(source.name, source)
  }

  /**
   * Remove schema source
   */
  removeSource(sourceName: string): void {
    this.sources.delete(sourceName)
  }

  /**
   * Get all available sources
   */
  getSources(): SchemaSource[] {
    return Array.from(this.sources.values())
  }

  /**
   * Get sources by exam type
   */
  getSourcesByExamType(examType: string): SchemaSource[] {
    return Array.from(this.sources.values()).filter(
      source => source.examType.toUpperCase() === examType.toUpperCase()
    )
  }

  /**
   * Test source connectivity
   */
  async testSource(sourceName: string): Promise<boolean> {
    const source = this.sources.get(sourceName)
    if (!source) return false

    try {
      const response = await this.fetchWithTimeout(source.url)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }

  // Private methods

  private async fetchFromSource(source: SchemaSource): Promise<ExamSchema | null> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(source.url)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const html = await response.text()
        const schema = source.parser(html)

        if (schema) {
          // Update source last updated time
          source.lastUpdated = new Date()
          return schema
        } else {
          throw new Error('Parser returned null schema')
        }
      } catch (error) {
        lastError = error as Error
        console.warn(`Attempt ${attempt} failed for ${source.name}:`, error)

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt)
        }
      }
    }

    throw lastError || new Error('All retry attempts failed')
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache'
        }
      })

      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private initializeDefaultSources(): void {
    // JEE Main Source
    this.sources.set('JEE_MAIN_NTA', {
      name: 'JEE Main NTA',
      url: 'https://jeemain.nta.nic.in/',
      examType: 'JEE',
      parser: this.parseJEEMainSchema.bind(this),
      isActive: true
    })

    // JEE Advanced Source
    this.sources.set('JEE_ADVANCED_IIT', {
      name: 'JEE Advanced IIT',
      url: 'https://jeeadv.ac.in/',
      examType: 'JEE',
      parser: this.parseJEEAdvancedSchema.bind(this),
      isActive: true
    })

    // NEET Source
    this.sources.set('NEET_NTA', {
      name: 'NEET NTA',
      url: 'https://neet.nta.nic.in/',
      examType: 'NEET',
      parser: this.parseNEETSchema.bind(this),
      isActive: true
    })

    // Mock sources for testing (these would be replaced with real parsers)
    this.sources.set('MOCK_JEE', {
      name: 'Mock JEE Source',
      url: 'https://example.com/jee',
      examType: 'JEE',
      parser: this.parseMockJEESchema.bind(this),
      isActive: false // Disabled by default
    })

    this.sources.set('MOCK_NEET', {
      name: 'Mock NEET Source',
      url: 'https://example.com/neet',
      examType: 'NEET',
      parser: this.parseMockNEETSchema.bind(this),
      isActive: false // Disabled by default
    })
  }

  // Schema parsers (these would be implemented based on actual website structures)

  private parseJEEMainSchema(html: string): ExamSchema | null {
    // This is a simplified mock implementation
    // In reality, you would parse the actual HTML structure
    
    try {
      // Look for specific patterns in the HTML
      if (html.includes('JEE') || html.includes('Main')) {
        return {
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
        }
      }
    } catch (error) {
      console.error('Error parsing JEE Main schema:', error)
    }

    return null
  }

  private parseJEEAdvancedSchema(html: string): ExamSchema | null {
    try {
      if (html.includes('JEE') || html.includes('Advanced')) {
        return {
          examType: 'JEE Advanced',
          totalQuestions: 54,
          totalDuration: 180,
          sections: [
            { name: 'Physics', subjects: ['Physics'], questionCount: 18, timeAllocation: 60 },
            { name: 'Chemistry', subjects: ['Chemistry'], questionCount: 18, timeAllocation: 60 },
            { name: 'Mathematics', subjects: ['Mathematics'], questionCount: 18, timeAllocation: 60 }
          ],
          markingScheme: {
            correct: 3,
            incorrect: -1,
            unattempted: 0,
            partialCredit: 1
          },
          lastUpdated: new Date(),
          source: 'https://jeeadv.ac.in/'
        }
      }
    } catch (error) {
      console.error('Error parsing JEE Advanced schema:', error)
    }

    return null
  }

  private parseNEETSchema(html: string): ExamSchema | null {
    try {
      if (html.includes('NEET') || html.includes('Medical')) {
        return {
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
    } catch (error) {
      console.error('Error parsing NEET schema:', error)
    }

    return null
  }

  // Mock parsers for testing

  private parseMockJEESchema(html: string): ExamSchema | null {
    return {
      examType: 'JEE Main (Mock)',
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
      source: 'Mock Source'
    }
  }

  private parseMockNEETSchema(html: string): ExamSchema | null {
    return {
      examType: 'NEET (Mock)',
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
      source: 'Mock Source'
    }
  }
}

/**
 * Factory function to create exam schema fetcher
 */
export function createExamSchemaFetcher(config?: SchemaFetcherConfig): ExamSchemaFetcher {
  return new ExamSchemaFetcher(config)
}

/**
 * Utility function to validate exam schema
 */
export function validateExamSchema(schema: ExamSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!schema.examType) errors.push('Exam type is required')
  if (!schema.totalQuestions || schema.totalQuestions <= 0) errors.push('Total questions must be positive')
  if (!schema.totalDuration || schema.totalDuration <= 0) errors.push('Total duration must be positive')
  if (!schema.sections || schema.sections.length === 0) errors.push('At least one section is required')

  // Validate sections
  let totalSectionQuestions = 0
  let totalSectionTime = 0

  for (const section of schema.sections) {
    if (!section.name) errors.push('Section name is required')
    if (!section.subjects || section.subjects.length === 0) errors.push(`Section ${section.name} must have subjects`)
    if (!section.questionCount || section.questionCount <= 0) errors.push(`Section ${section.name} must have positive question count`)
    if (!section.timeAllocation || section.timeAllocation <= 0) errors.push(`Section ${section.name} must have positive time allocation`)

    totalSectionQuestions += section.questionCount
    totalSectionTime += section.timeAllocation
  }

  // Check if section totals match schema totals
  if (totalSectionQuestions !== schema.totalQuestions) {
    errors.push(`Section question counts (${totalSectionQuestions}) don't match total (${schema.totalQuestions})`)
  }

  if (totalSectionTime !== schema.totalDuration) {
    errors.push(`Section time allocations (${totalSectionTime}) don't match total duration (${schema.totalDuration})`)
  }

  // Validate marking scheme
  if (!schema.markingScheme) {
    errors.push('Marking scheme is required')
  } else {
    if (typeof schema.markingScheme.correct !== 'number') errors.push('Correct marks must be a number')
    if (typeof schema.markingScheme.incorrect !== 'number') errors.push('Incorrect marks must be a number')
    if (typeof schema.markingScheme.unattempted !== 'number') errors.push('Unattempted marks must be a number')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export default ExamSchemaFetcher