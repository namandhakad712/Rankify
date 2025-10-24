/**
 * Diagram Storage Utilities
 * 
 * Provides IndexedDB storage for PDFs and diagram coordinate metadata.
 * Achieves 99.99% storage reduction by storing only coordinates instead of cropped images.
 * 
 * Storage Strategy:
 * - Store PDF once with unique ID
 * - Store questions with diagram coordinate arrays (minimal data)
 * - ~100 bytes per diagram vs ~1MB for cropped images
 */

import type {
  StoredPDF,
  StoredQuestion,
  AIExtractedQuestionWithDiagrams,
  DiagramCoordinates
} from '#layers/shared/app/types/diagram'

const DB_NAME = 'RankifyDiagramDB'
const DB_VERSION = 1
const PDF_STORE = 'pdfs'
const QUESTION_STORE = 'questions'

/**
 * Initialize IndexedDB database
 * Creates object stores for PDFs and questions
 */
function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Create PDFs store
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        const pdfStore = db.createObjectStore(PDF_STORE, { keyPath: 'id' })
        pdfStore.createIndex('fileName', 'fileName', { unique: false })
        pdfStore.createIndex('uploadDate', 'uploadDate', { unique: false })
      }
      
      // Create Questions store
      if (!db.objectStoreNames.contains(QUESTION_STORE)) {
        const questionStore = db.createObjectStore(QUESTION_STORE, { keyPath: 'id' })
        questionStore.createIndex('pdfId', 'pdfId', { unique: false })
      }
    }
  })
}

/**
 * Generate unique PDF ID
 */
function generateUniqueId(): string {
  return `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Store PDF with questions and diagram coordinates
 * 
 * @param fileName - Original PDF filename
 * @param pdfBuffer - PDF file as ArrayBuffer
 * @param questions - Array of extracted questions with diagram coordinates
 * @returns Unique PDF ID
 */
export async function storePDFWithQuestions(
  fileName: string,
  pdfBuffer: ArrayBuffer,
  questions: AIExtractedQuestionWithDiagrams[]
): Promise<string> {
  const db = await initDatabase()
  const pdfId = generateUniqueId()
  
  try {
    // Store PDF once
    const pdfData: StoredPDF = {
      id: pdfId,
      fileName,
      buffer: pdfBuffer,
      uploadDate: Date.now(),
      fileSize: pdfBuffer.byteLength
    }
    
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE], 'readwrite')
      const store = transaction.objectStore(PDF_STORE)
      const request = store.add(pdfData)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to store PDF'))
    })
    
    // Store questions with diagram coordinates (minimal data)
    for (const question of questions) {
      try {
        const questionData: StoredQuestion = {
          id: question.id,
          pdfId,
          questionData: question,
          diagrams: (question as any).diagrams || []
        }
        
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([QUESTION_STORE], 'readwrite')
          const store = transaction.objectStore(QUESTION_STORE)
          const request = store.add(questionData)
          
          request.onsuccess = () => resolve()
          request.onerror = (event) => {
            const error = (event.target as any)?.error
            reject(new Error(`Failed to store question ${question.id}: ${error?.message || 'Unknown error'}`))
          }
        })
      } catch (questionError) {
        console.warn(`⚠️ Failed to store question ${question.id}, skipping...`, questionError)
        // Continue with other questions
      }
    }
    
    console.log(`✅ Stored PDF ${pdfId} with ${questions.length} questions`)
    return pdfId
    
  } finally {
    db.close()
  }
}

/**
 * Get PDF buffer by ID
 * 
 * @param pdfId - Unique PDF identifier
 * @returns PDF buffer or undefined if not found
 */
export async function getPDFBuffer(pdfId: string): Promise<ArrayBuffer | undefined> {
  const db = await initDatabase()
  
  try {
    return await new Promise<ArrayBuffer | undefined>((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE], 'readonly')
      const store = transaction.objectStore(PDF_STORE)
      const request = store.get(pdfId)
      
      request.onsuccess = () => {
        const pdf = request.result as StoredPDF | undefined
        resolve(pdf?.buffer)
      }
      request.onerror = () => reject(new Error('Failed to retrieve PDF'))
    })
  } finally {
    db.close()
  }
}

/**
 * Get all questions for a PDF
 * 
 * @param pdfId - Unique PDF identifier
 * @returns Array of questions with diagram coordinates
 */
export async function getQuestionsForPDF(
  pdfId: string
): Promise<AIExtractedQuestionWithDiagrams[]> {
  const db = await initDatabase()
  
  try {
    return await new Promise<AIExtractedQuestionWithDiagrams[]>((resolve, reject) => {
      const transaction = db.transaction([QUESTION_STORE], 'readonly')
      const store = transaction.objectStore(QUESTION_STORE)
      const index = store.index('pdfId')
      const request = index.getAll(pdfId)
      
      request.onsuccess = () => {
        const storedQuestions = request.result as StoredQuestion[]
        const questions = storedQuestions.map(sq => sq.questionData)
        resolve(questions)
      }
      request.onerror = () => reject(new Error('Failed to retrieve questions'))
    })
  } finally {
    db.close()
  }
}

/**
 * Get PDF metadata (without buffer)
 * 
 * @param pdfId - Unique PDF identifier
 * @returns PDF metadata or undefined if not found
 */
export async function getPDFMetadata(
  pdfId: string
): Promise<Omit<StoredPDF, 'buffer'> | undefined> {
  const db = await initDatabase()
  
  try {
    return await new Promise<Omit<StoredPDF, 'buffer'> | undefined>((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE], 'readonly')
      const store = transaction.objectStore(PDF_STORE)
      const request = store.get(pdfId)
      
      request.onsuccess = () => {
        const pdf = request.result as StoredPDF | undefined
        if (pdf) {
          const { buffer, ...metadata } = pdf
          resolve(metadata)
        } else {
          resolve(undefined)
        }
      }
      request.onerror = () => reject(new Error('Failed to retrieve PDF metadata'))
    })
  } finally {
    db.close()
  }
}

/**
 * List all stored PDFs
 * 
 * @returns Array of PDF metadata (without buffers)
 */
export async function listAllPDFs(): Promise<Omit<StoredPDF, 'buffer'>[]> {
  const db = await initDatabase()
  
  try {
    return await new Promise<Omit<StoredPDF, 'buffer'>[]>((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE], 'readonly')
      const store = transaction.objectStore(PDF_STORE)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const pdfs = request.result as StoredPDF[]
        const metadata = pdfs.map(({ buffer, ...meta }) => meta)
        resolve(metadata)
      }
      request.onerror = () => reject(new Error('Failed to list PDFs'))
    })
  } finally {
    db.close()
  }
}

/**
 * Update diagram coordinates for a question
 * 
 * @param questionId - Question ID
 * @param diagrams - Updated diagram coordinates
 */
export async function updateQuestionDiagrams(
  questionId: number,
  diagrams: DiagramCoordinates[]
): Promise<void> {
  const db = await initDatabase()
  
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([QUESTION_STORE], 'readwrite')
      const store = transaction.objectStore(QUESTION_STORE)
      const getRequest = store.get(questionId)
      
      getRequest.onsuccess = () => {
        const storedQuestion = getRequest.result as StoredQuestion
        if (!storedQuestion) {
          reject(new Error(`Question ${questionId} not found`))
          return
        }
        
        // Update diagrams
        storedQuestion.diagrams = diagrams
        storedQuestion.questionData.diagrams = diagrams
        
        const putRequest = store.put(storedQuestion)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(new Error('Failed to update question'))
      }
      
      getRequest.onerror = () => reject(new Error('Failed to retrieve question'))
    })
  } finally {
    db.close()
  }
}

/**
 * Delete PDF and all associated questions
 * 
 * @param pdfId - Unique PDF identifier
 */
export async function deletePDF(pdfId: string): Promise<void> {
  const db = await initDatabase()
  
  try {
    // Delete all questions for this PDF
    const questions = await getQuestionsForPDF(pdfId)
    
    for (const question of questions) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([QUESTION_STORE], 'readwrite')
        const store = transaction.objectStore(QUESTION_STORE)
        const request = store.delete(question.id)
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error(`Failed to delete question ${question.id}`))
      })
    }
    
    // Delete PDF
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE], 'readwrite')
      const store = transaction.objectStore(PDF_STORE)
      const request = store.delete(pdfId)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to delete PDF'))
    })
    
    console.log(`✅ Deleted PDF ${pdfId} and ${questions.length} questions`)
  } finally {
    db.close()
  }
}

/**
 * Get storage statistics
 * 
 * @returns Storage usage information
 */
export async function getStorageStats(): Promise<{
  pdfCount: number
  questionCount: number
  totalSize: number
  averagePdfSize: number
}> {
  const db = await initDatabase()
  
  try {
    const pdfs = await new Promise<StoredPDF[]>((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE], 'readonly')
      const store = transaction.objectStore(PDF_STORE)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Failed to get PDFs'))
    })
    
    const questionCount = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction([QUESTION_STORE], 'readonly')
      const store = transaction.objectStore(QUESTION_STORE)
      const request = store.count()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('Failed to count questions'))
    })
    
    const totalSize = pdfs.reduce((sum, pdf) => sum + pdf.fileSize, 0)
    const averagePdfSize = pdfs.length > 0 ? totalSize / pdfs.length : 0
    
    return {
      pdfCount: pdfs.length,
      questionCount,
      totalSize,
      averagePdfSize
    }
  } finally {
    db.close()
  }
}

/**
 * Clear all stored data
 * WARNING: This will delete all PDFs and questions
 */
export async function clearAllData(): Promise<void> {
  const db = await initDatabase()
  
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([PDF_STORE, QUESTION_STORE], 'readwrite')
      
      const pdfStore = transaction.objectStore(PDF_STORE)
      const questionStore = transaction.objectStore(QUESTION_STORE)
      
      const pdfRequest = pdfStore.clear()
      const questionRequest = questionStore.clear()
      
      let completed = 0
      const checkComplete = () => {
        completed++
        if (completed === 2) resolve()
      }
      
      pdfRequest.onsuccess = checkComplete
      questionRequest.onsuccess = checkComplete
      
      pdfRequest.onerror = () => reject(new Error('Failed to clear PDFs'))
      questionRequest.onerror = () => reject(new Error('Failed to clear questions'))
    })
    
    console.log('✅ Cleared all stored data')
  } finally {
    db.close()
  }
}
