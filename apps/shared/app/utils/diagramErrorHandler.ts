/**
 * Diagram Error Handler
 * 
 * Centralized error handling for diagram detection and rendering operations.
 * Provides user-friendly error messages and recovery suggestions.
 */

export enum DiagramErrorType {
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  API_INVALID_KEY = 'API_INVALID_KEY',
  API_INVALID_IMAGE = 'API_INVALID_IMAGE',
  PDF_LOAD_ERROR = 'PDF_LOAD_ERROR',
  PDF_RENDER_ERROR = 'PDF_RENDER_ERROR',
  COORDINATE_INVALID = 'COORDINATE_INVALID',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface DiagramError {
  type: DiagramErrorType
  message: string
  userMessage: string
  suggestion: string
  retryable: boolean
  originalError?: Error
}

/**
 * Create a diagram error from an exception
 */
export function createDiagramError(error: any, context?: string): DiagramError {
  // API Quota Exceeded
  if (error?.status === 429 || error?.message?.includes('quota')) {
    return {
      type: DiagramErrorType.API_QUOTA_EXCEEDED,
      message: 'Gemini API quota exceeded',
      userMessage: 'API usage limit reached',
      suggestion: 'Please wait a few minutes and try again, or check your API quota in Google Cloud Console.',
      retryable: true,
      originalError: error
    }
  }
  
  // Network Error
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return {
      type: DiagramErrorType.API_NETWORK_ERROR,
      message: 'Network error while calling Gemini API',
      userMessage: 'Connection failed',
      suggestion: 'Check your internet connection and try again.',
      retryable: true,
      originalError: error
    }
  }
  
  // Invalid API Key
  if (error?.status === 401 || error?.status === 403 || error?.message?.includes('API key')) {
    return {
      type: DiagramErrorType.API_INVALID_KEY,
      message: 'Invalid or missing Gemini API key',
      userMessage: 'API key is invalid',
      suggestion: 'Please check your Gemini API key in settings and ensure it has the correct permissions.',
      retryable: false,
      originalError: error
    }
  }
  
  // Invalid Image
  if (error?.message?.includes('image') && error?.message?.includes('invalid')) {
    return {
      type: DiagramErrorType.API_INVALID_IMAGE,
      message: 'Invalid image data sent to API',
      userMessage: 'PDF page could not be processed',
      suggestion: 'The PDF page may be corrupted or in an unsupported format. Try a different PDF.',
      retryable: false,
      originalError: error
    }
  }
  
  // PDF Load Error
  if (error?.message?.includes('PDF') && error?.message?.includes('load')) {
    return {
      type: DiagramErrorType.PDF_LOAD_ERROR,
      message: 'Failed to load PDF document',
      userMessage: 'Cannot open PDF file',
      suggestion: 'The PDF file may be corrupted or password-protected. Try a different file.',
      retryable: false,
      originalError: error
    }
  }
  
  // PDF Render Error
  if (error?.message?.includes('render') || error?.message?.includes('canvas')) {
    return {
      type: DiagramErrorType.PDF_RENDER_ERROR,
      message: 'Failed to render PDF page',
      userMessage: 'Cannot display PDF page',
      suggestion: 'Try refreshing the page or using a different browser.',
      retryable: true,
      originalError: error
    }
  }
  
  // Coordinate Invalid
  if (error?.message?.includes('coordinate') || error?.message?.includes('bounds')) {
    return {
      type: DiagramErrorType.COORDINATE_INVALID,
      message: 'Invalid diagram coordinates',
      userMessage: 'Diagram position is invalid',
      suggestion: 'The diagram coordinates are out of range. Try adjusting them manually.',
      retryable: false,
      originalError: error
    }
  }
  
  // Storage Error
  if (error?.message?.includes('IndexedDB') || error?.message?.includes('storage')) {
    return {
      type: DiagramErrorType.STORAGE_ERROR,
      message: 'Failed to access local storage',
      userMessage: 'Cannot save data',
      suggestion: 'Check if your browser allows local storage and has enough space available.',
      retryable: true,
      originalError: error
    }
  }
  
  // Unknown Error
  return {
    type: DiagramErrorType.UNKNOWN_ERROR,
    message: error?.message || 'Unknown error occurred',
    userMessage: 'Something went wrong',
    suggestion: 'Please try again. If the problem persists, contact support.',
    retryable: true,
    originalError: error
  }
}

/**
 * Log diagram error with context
 */
export function logDiagramError(error: DiagramError, context?: string) {
  const prefix = context ? `[${context}]` : '[Diagram]'
  console.error(`${prefix} ${error.type}:`, error.message)
  
  if (error.originalError) {
    console.error('Original error:', error.originalError)
  }
}

/**
 * Handle diagram error with user notification
 */
export function handleDiagramError(
  error: any,
  context?: string,
  onNotify?: (message: string, type: 'error' | 'warning') => void
): DiagramError {
  const diagramError = createDiagramError(error, context)
  logDiagramError(diagramError, context)
  
  if (onNotify) {
    onNotify(
      `${diagramError.userMessage}. ${diagramError.suggestion}`,
      diagramError.retryable ? 'warning' : 'error'
    )
  }
  
  return diagramError
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`⏳ Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      return await operation()
    } catch (error) {
      lastError = error
      
      const diagramError = createDiagramError(error)
      
      // Don't retry if error is not retryable
      if (!diagramError.retryable) {
        throw error
      }
      
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries + 1} attempts failed`)
        throw error
      }
    }
  }
  
  throw lastError
}

/**
 * Validate operation prerequisites
 */
export function validatePrerequisites(checks: {
  pdfBuffer?: ArrayBuffer
  apiKey?: string
  coordinates?: any
}): { valid: boolean; error?: DiagramError } {
  if (checks.pdfBuffer && checks.pdfBuffer.byteLength === 0) {
    return {
      valid: false,
      error: {
        type: DiagramErrorType.PDF_LOAD_ERROR,
        message: 'PDF buffer is empty',
        userMessage: 'PDF file is empty',
        suggestion: 'Please upload a valid PDF file.',
        retryable: false
      }
    }
  }
  
  if (checks.apiKey !== undefined && (!checks.apiKey || checks.apiKey.trim() === '')) {
    return {
      valid: false,
      error: {
        type: DiagramErrorType.API_INVALID_KEY,
        message: 'API key is missing',
        userMessage: 'Gemini API key not configured',
        suggestion: 'Please add your Gemini API key in settings.',
        retryable: false
      }
    }
  }
  
  if (checks.coordinates) {
    const coords = checks.coordinates
    if (coords.x < 0 || coords.x > 1 || coords.y < 0 || coords.y > 1) {
      return {
        valid: false,
        error: {
          type: DiagramErrorType.COORDINATE_INVALID,
          message: 'Coordinates out of range',
          userMessage: 'Invalid diagram position',
          suggestion: 'Coordinates must be between 0 and 1.',
          retryable: false
        }
      }
    }
  }
  
  return { valid: true }
}

/**
 * Get user-friendly error message for display
 */
export function getErrorDisplayMessage(error: DiagramError): string {
  return `${error.userMessage}\n\n${error.suggestion}`
}

/**
 * Check if error should trigger a retry
 */
export function shouldRetry(error: DiagramError, attemptNumber: number, maxAttempts: number): boolean {
  return error.retryable && attemptNumber < maxAttempts
}
