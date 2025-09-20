/**
 * IndexedDB Storage Layer for AI-generated test data
 * Extends existing database with AI-specific storage capabilities
 */

import type { AIExtractionResult, AIExtractedQuestion, ExtractionMetadata } from './geminiAPIClient'

export interface AIGeneratedTestData {
  id?: number
  fileName: string
  fileHash: string
  extractionResult: AIExtractionResult
  reviewStatus: 'pending' | 'in_progress' | 'completed'
  editedQuestions?: AIExtractedQuestion[]
  createdAt: Date
  updatedAt: Date
  version: string
}

export interface AITestSession {
  id?: number
  testDataId: number
  sessionConfig: AITestSessionConfig
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed'
  progress: AITestProgress
}

export interface AITestSessionConfig {
  confidenceThreshold: number
  showDiagramQuestions: boolean
  enableMathJax: boolean
  filterBySubject?: string
  filterBySection?: string
}

export interface AITestProgress {
  currentQuestionIndex: number
  answeredQuestions: number[]
  totalQuestions: number
  timeSpent: number
  answers: Record<number, any>
}

export interface AIStorageStats {
  totalExtractions: number
  totalQuestions: number
  averageConfidence: number
  diagramQuestionsCount: number
  storageUsed: number
  lastExtraction?: Date
}

/**
 * AI Storage Manager class
 */
export class AIStorageManager {
  private dbName = 'RankifyAI'
  private version = 1
  private db: IDBDatabase | null = null

  /**
   * Initialize the AI storage database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error('Failed to open AI storage database'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // AI Test Data store
        if (!db.objectStoreNames.contains('aiTestData')) {
          const testDataStore = db.createObjectStore('aiTestData', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          testDataStore.createIndex('fileHash', 'fileHash', { unique: true })
          testDataStore.createIndex('fileName', 'fileName', { unique: false })
          testDataStore.createIndex('createdAt', 'createdAt', { unique: false })
          testDataStore.createIndex('reviewStatus', 'reviewStatus', { unique: false })
        }

        // AI Test Sessions store
        if (!db.objectStoreNames.contains('aiTestSessions')) {
          const sessionsStore = db.createObjectStore('aiTestSessions', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          sessionsStore.createIndex('testDataId', 'testDataId', { unique: false })
          sessionsStore.createIndex('status', 'status', { unique: false })
          sessionsStore.createIndex('startTime', 'startTime', { unique: false })
        }

        // AI Extraction Cache store (for temporary storage during processing)
        if (!db.objectStoreNames.contains('aiExtractionCache')) {
          const cacheStore = db.createObjectStore('aiExtractionCache', { 
            keyPath: 'fileHash' 
          })
          cacheStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  /**
   * Store AI extraction result
   */
  async storeExtractionResult(
    fileName: string, 
    fileHash: string, 
    extractionResult: AIExtractionResult
  ): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const testData: AIGeneratedTestData = {
      fileName,
      fileHash,
      extractionResult,
      reviewStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readwrite')
      const store = transaction.objectStore('aiTestData')
      const request = store.add(testData)

      request.onsuccess = () => {
        resolve(request.result as number)
      }

      request.onerror = () => {
        reject(new Error('Failed to store extraction result'))
      }
    })
  }

  /**
   * Get AI test data by ID
   */
  async getTestData(id: number): Promise<AIGeneratedTestData | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readonly')
      const store = transaction.objectStore('aiTestData')
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(new Error('Failed to get test data'))
      }
    })
  }

  /**
   * Get AI test data by file hash
   */
  async getTestDataByHash(fileHash: string): Promise<AIGeneratedTestData | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readonly')
      const store = transaction.objectStore('aiTestData')
      const index = store.index('fileHash')
      const request = index.get(fileHash)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(new Error('Failed to get test data by hash'))
      }
    })
  }

  /**
   * Update edited questions
   */
  async updateEditedQuestions(id: number, editedQuestions: AIExtractedQuestion[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readwrite')
      const store = transaction.objectStore('aiTestData')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const testData = getRequest.result
        if (!testData) {
          reject(new Error('Test data not found'))
          return
        }

        testData.editedQuestions = editedQuestions
        testData.updatedAt = new Date()
        testData.reviewStatus = 'in_progress'

        const updateRequest = store.put(testData)
        updateRequest.onsuccess = () => resolve()
        updateRequest.onerror = () => reject(new Error('Failed to update questions'))
      }

      getRequest.onerror = () => {
        reject(new Error('Failed to get test data for update'))
      }
    })
  }

  /**
   * Mark review as completed
   */
  async markReviewCompleted(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readwrite')
      const store = transaction.objectStore('aiTestData')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const testData = getRequest.result
        if (!testData) {
          reject(new Error('Test data not found'))
          return
        }

        testData.reviewStatus = 'completed'
        testData.updatedAt = new Date()

        const updateRequest = store.put(testData)
        updateRequest.onsuccess = () => resolve()
        updateRequest.onerror = () => reject(new Error('Failed to mark review completed'))
      }

      getRequest.onerror = () => {
        reject(new Error('Failed to get test data for update'))
      }
    })
  }

  /**
   * List all AI test data with filtering
   */
  async listTestData(filter?: {
    reviewStatus?: 'pending' | 'in_progress' | 'completed'
    limit?: number
    offset?: number
  }): Promise<AIGeneratedTestData[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readonly')
      const store = transaction.objectStore('aiTestData')
      
      let request: IDBRequest
      
      if (filter?.reviewStatus) {
        const index = store.index('reviewStatus')
        request = index.getAll(filter.reviewStatus)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => {
        let results = request.result as AIGeneratedTestData[]
        
        // Apply pagination if specified
        if (filter?.offset || filter?.limit) {
          const start = filter.offset || 0
          const end = filter.limit ? start + filter.limit : undefined
          results = results.slice(start, end)
        }
        
        resolve(results)
      }

      request.onerror = () => {
        reject(new Error('Failed to list test data'))
      }
    })
  }

  /**
   * Delete AI test data
   */
  async deleteTestData(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readwrite')
      const store = transaction.objectStore('aiTestData')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to delete test data'))
    })
  }

  /**
   * Store extraction in cache (temporary storage during processing)
   */
  async cacheExtraction(fileHash: string, partialResult: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const cacheData = {
      fileHash,
      partialResult,
      createdAt: new Date()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiExtractionCache'], 'readwrite')
      const store = transaction.objectStore('aiExtractionCache')
      const request = store.put(cacheData)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to cache extraction'))
    })
  }

  /**
   * Get cached extraction
   */
  async getCachedExtraction(fileHash: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiExtractionCache'], 'readonly')
      const store = transaction.objectStore('aiExtractionCache')
      const request = store.get(fileHash)

      request.onsuccess = () => {
        resolve(request.result?.partialResult || null)
      }

      request.onerror = () => {
        reject(new Error('Failed to get cached extraction'))
      }
    })
  }

  /**
   * Clear extraction cache
   */
  async clearCache(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiExtractionCache'], 'readwrite')
      const store = transaction.objectStore('aiExtractionCache')
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear cache'))
    })
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<AIStorageStats> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiTestData'], 'readonly')
      const store = transaction.objectStore('aiTestData')
      const request = store.getAll()

      request.onsuccess = () => {
        const testDataList = request.result as AIGeneratedTestData[]
        
        let totalQuestions = 0
        let totalConfidence = 0
        let diagramQuestionsCount = 0
        let lastExtraction: Date | undefined

        testDataList.forEach(testData => {
          const questions = testData.editedQuestions || testData.extractionResult.questions
          totalQuestions += questions.length
          totalConfidence += testData.extractionResult.confidence
          diagramQuestionsCount += questions.filter(q => q.hasDiagram).length
          
          if (!lastExtraction || testData.createdAt > lastExtraction) {
            lastExtraction = testData.createdAt
          }
        })

        const stats: AIStorageStats = {
          totalExtractions: testDataList.length,
          totalQuestions,
          averageConfidence: testDataList.length > 0 ? totalConfidence / testDataList.length : 0,
          diagramQuestionsCount,
          storageUsed: this.estimateStorageSize(testDataList),
          lastExtraction
        }

        resolve(stats)
      }

      request.onerror = () => {
        reject(new Error('Failed to get storage stats'))
      }
    })
  }

  /**
   * Estimate storage size in bytes
   */
  private estimateStorageSize(testDataList: AIGeneratedTestData[]): number {
    return testDataList.reduce((total, testData) => {
      return total + JSON.stringify(testData).length * 2 // Rough estimate
    }, 0)
  }

  /**
   * Clean up old cache entries
   */
  async cleanupOldCache(maxAgeHours: number = 24): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['aiExtractionCache'], 'readwrite')
      const store = transaction.objectStore('aiExtractionCache')
      const index = store.index('createdAt')
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate))

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to cleanup old cache'))
      }
    })
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

/**
 * Singleton instance for AI storage
 */
let aiStorageInstance: AIStorageManager | null = null

/**
 * Get AI storage manager instance
 */
export async function getAIStorage(): Promise<AIStorageManager> {
  if (!aiStorageInstance) {
    aiStorageInstance = new AIStorageManager()
    await aiStorageInstance.initialize()
  }
  return aiStorageInstance
}

/**
 * Utility functions for AI storage
 */
export const aiStorageUtils = {
  /**
   * Generate file hash from ArrayBuffer
   */
  async generateFileHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  },

  /**
   * Validate AI test data structure
   */
  validateTestData(data: any): data is AIGeneratedTestData {
    return (
      data &&
      typeof data.fileName === 'string' &&
      typeof data.fileHash === 'string' &&
      data.extractionResult &&
      Array.isArray(data.extractionResult.questions) &&
      ['pending', 'in_progress', 'completed'].includes(data.reviewStatus)
    )
  },

  /**
   * Convert legacy test data to AI format
   */
  convertLegacyToAI(legacyData: any): Partial<AIGeneratedTestData> {
    // Implementation for converting existing test data to AI format
    return {
      fileName: legacyData.testConfig?.testName || 'Unknown',
      fileHash: legacyData.testConfig?.pdfFileHash || '',
      reviewStatus: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0'
    }
  }
}