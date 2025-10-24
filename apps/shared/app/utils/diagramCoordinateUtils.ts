/**
 * Diagram Coordinate Utilities
 * 
 * Provides functions for rendering diagrams from PDFs using normalized coordinates,
 * matching diagrams to questions, and validating coordinate data.
 * 
 * Key Features:
 * - On-demand diagram rendering from PDF using canvas transforms
 * - Normalized coordinates (0-1) for resolution independence
 * - Multi-scale rendering (thumbnail, preview, full view)
 * - Intelligent diagram-to-question matching
 */

import * as pdfjsLib from 'pdfjs-dist'
import type {
  DiagramCoordinates,
  DiagramBoundingBox,
  AIExtractedQuestionWithDiagrams,
  CoordinateValidationResult,
  DiagramRenderOptions
} from '#layers/shared/app/types/diagram'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  // Use the worker from node_modules instead of CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
}

/**
 * Render a PDF page to base64 image for Gemini Vision API
 * 
 * @param pdf - PDF.js document object
 * @param pageNumber - Page number (1-indexed)
 * @param scale - Rendering scale factor (default: 2 for quality)
 * @returns Base64-encoded PNG image (without data URL prefix)
 */
export async function renderPDFPageToBase64(
  pdf: any,
  pageNumber: number,
  scale: number = 2
): Promise<string> {
  try {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('Failed to get canvas 2D context')
    }
    
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
    
    // Convert to base64 (remove data:image/png;base64, prefix)
    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl.split(',')[1]
  } catch (error) {
    console.error(`Error rendering page ${pageNumber} to base64:`, error)
    throw error
  }
}

/**
 * Render a specific diagram region from PDF using coordinates
 * 
 * This function extracts a diagram from a PDF page by:
 * 1. Loading the specified page
 * 2. Converting normalized coordinates to pixel coordinates
 * 3. Using canvas transforms to crop the diagram area
 * 4. Returning the cropped image as a data URL
 * 
 * @param pdfBuffer - PDF file as ArrayBuffer
 * @param coordinates - Diagram bounding box coordinates
 * @param scale - Rendering scale (1=thumbnail, 2=preview, 3=full)
 * @returns Data URL of cropped diagram image
 */
export async function renderDiagramFromPDF(
  pdfBuffer: ArrayBuffer,
  coordinates: DiagramCoordinates,
  scale: number = 2
): Promise<string> {
  try {
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    const page = await pdf.getPage(coordinates.pageNumber)
    const viewport = page.getViewport({ scale })
    
    // Convert normalized coordinates (0-1) to pixel coordinates
    const x = coordinates.boundingBox.x * viewport.width
    const y = coordinates.boundingBox.y * viewport.height
    const width = coordinates.boundingBox.width * viewport.width
    const height = coordinates.boundingBox.height * viewport.height
    
    // Create canvas sized to diagram dimensions
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('Failed to get canvas 2D context')
    }
    
    canvas.width = width
    canvas.height = height
    
    // Render page with transform to crop diagram area
    // The transform [1, 0, 0, 1, -x, -y] translates the page so that
    // the diagram area appears at the origin of our canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      transform: [1, 0, 0, 1, -x, -y]
    }).promise
    
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error rendering diagram from PDF:', error)
    throw error
  }
}

/**
 * Render a full PDF page to canvas
 * Used for the coordinate editor to show the full page with overlay
 * 
 * @param pdfBuffer - PDF file as ArrayBuffer
 * @param pageNumber - Page number (1-indexed)
 * @param canvas - Target canvas element
 * @param scale - Rendering scale factor
 */
export async function renderPDFPageToCanvas(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 2
): Promise<void> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get canvas 2D context')
    }
    
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
  } catch (error) {
    console.error(`Error rendering page ${pageNumber} to canvas:`, error)
    throw error
  }
}

/**
 * Match detected diagrams to questions using multiple heuristics
 * 
 * Matching strategies (in priority order):
 * 1. Same page match - diagram on same page as question
 * 2. Label reference - diagram label mentioned in question text
 * 3. Question number match - nearbyQuestionNumber matches question
 * 4. Adjacent page - diagram within 1 page of question
 * 
 * @param questions - Array of extracted questions
 * @param detectedDiagrams - Array of detected diagram coordinates
 * @returns Questions with matched diagrams attached
 */
export function matchDiagramsToQuestions(
  questions: AIExtractedQuestionWithDiagrams[],
  detectedDiagrams: DiagramCoordinates[]
): AIExtractedQuestionWithDiagrams[] {
  return questions.map(question => {
    // Skip if question doesn't have diagrams
    if (!question.hasDiagram) {
      return question
    }
    
    // Find diagrams that match this question
    const matchingDiagrams = detectedDiagrams.filter(diagram => {
      // Priority 1: Same page match
      const onSamePage = diagram.pageNumber === question.pageNumber
      if (onSamePage) return true
      
      // Priority 2: Label reference in question text
      const labelMatch = diagram.label && 
        question.text.toLowerCase().includes(diagram.label.toLowerCase())
      if (labelMatch) return true
      
      // Priority 3: Question number match
      const questionMatch = diagram.nearbyQuestionNumber === question.questionNumber
      if (questionMatch) return true
      
      // Priority 4: Adjacent page match
      const onNearbyPage = Math.abs(diagram.pageNumber - question.pageNumber) <= 1
      return onNearbyPage
    })
    
    // Sort by relevance (same page first, then by distance)
    matchingDiagrams.sort((a, b) => {
      const aOnSamePage = a.pageNumber === question.pageNumber
      const bOnSamePage = b.pageNumber === question.pageNumber
      
      if (aOnSamePage && !bOnSamePage) return -1
      if (!aOnSamePage && bOnSamePage) return 1
      
      // If both on same page or both on different pages, sort by distance
      const aDistance = Math.abs(a.pageNumber - question.pageNumber)
      const bDistance = Math.abs(b.pageNumber - question.pageNumber)
      return aDistance - bDistance
    })
    
    return {
      ...question,
      diagrams: matchingDiagrams.length > 0 ? matchingDiagrams : undefined
    }
  })
}

/**
 * Validate coordinate bounds
 * 
 * Checks that:
 * - All coordinates are in valid range (0-1)
 * - Width and height are positive
 * - Bounding box doesn't exceed page bounds
 * 
 * @param coords - Bounding box coordinates to validate
 * @returns Validation result with errors if invalid
 */
export function validateCoordinates(
  coords: DiagramBoundingBox
): CoordinateValidationResult {
  const errors: string[] = []
  
  // Check x coordinate
  if (coords.x < 0 || coords.x > 1) {
    errors.push(`X coordinate ${coords.x} is out of range (must be 0-1)`)
  }
  
  // Check y coordinate
  if (coords.y < 0 || coords.y > 1) {
    errors.push(`Y coordinate ${coords.y} is out of range (must be 0-1)`)
  }
  
  // Check width
  if (coords.width <= 0 || coords.width > 1) {
    errors.push(`Width ${coords.width} is invalid (must be 0.1-1)`)
  }
  
  // Check height
  if (coords.height <= 0 || coords.height > 1) {
    errors.push(`Height ${coords.height} is invalid (must be 0.1-1)`)
  }
  
  // Check that box doesn't exceed bounds
  if (coords.x + coords.width > 1) {
    errors.push(`Bounding box exceeds right edge (x + width = ${coords.x + coords.width})`)
  }
  
  if (coords.y + coords.height > 1) {
    errors.push(`Bounding box exceeds bottom edge (y + height = ${coords.y + coords.height})`)
  }
  
  const isValid = errors.length === 0
  
  return {
    isValid,
    errors,
    sanitized: isValid ? undefined : sanitizeCoordinates(coords)
  }
}

/**
 * Sanitize coordinates to valid range
 * 
 * Clamps all values to valid ranges:
 * - x, y: 0-1
 * - width, height: 0.1-1 (minimum 10% to ensure visibility)
 * 
 * @param coords - Coordinates to sanitize
 * @returns Sanitized coordinates within valid ranges
 */
export function sanitizeCoordinates(coords: DiagramBoundingBox): DiagramBoundingBox {
  return {
    x: Math.max(0, Math.min(1, coords.x)),
    y: Math.max(0, Math.min(1, coords.y)),
    width: Math.max(0.1, Math.min(1, coords.width)),
    height: Math.max(0.1, Math.min(1, coords.height))
  }
}

/**
 * Convert pixel coordinates to normalized coordinates
 * 
 * @param pixelCoords - Coordinates in pixels
 * @param pageWidth - Page width in pixels
 * @param pageHeight - Page height in pixels
 * @returns Normalized coordinates (0-1)
 */
export function pixelToNormalized(
  pixelCoords: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number
): DiagramBoundingBox {
  return {
    x: pixelCoords.x / pageWidth,
    y: pixelCoords.y / pageHeight,
    width: pixelCoords.width / pageWidth,
    height: pixelCoords.height / pageHeight
  }
}

/**
 * Convert normalized coordinates to pixel coordinates
 * 
 * @param normalizedCoords - Normalized coordinates (0-1)
 * @param pageWidth - Page width in pixels
 * @param pageHeight - Page height in pixels
 * @returns Coordinates in pixels
 */
export function normalizedToPixel(
  normalizedCoords: DiagramBoundingBox,
  pageWidth: number,
  pageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: normalizedCoords.x * pageWidth,
    y: normalizedCoords.y * pageHeight,
    width: normalizedCoords.width * pageWidth,
    height: normalizedCoords.height * pageHeight
  }
}

/**
 * Get PDF page count
 * 
 * @param pdfBuffer - PDF file as ArrayBuffer
 * @returns Number of pages in PDF
 */
export async function getPDFPageCount(pdfBuffer: ArrayBuffer): Promise<number> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    return pdf.numPages
  } catch (error) {
    console.error('Error getting PDF page count:', error)
    throw error
  }
}

/**
 * Get PDF page dimensions
 * 
 * @param pdfBuffer - PDF file as ArrayBuffer
 * @param pageNumber - Page number (1-indexed)
 * @param scale - Scale factor for dimensions
 * @returns Page width and height in pixels
 */
export async function getPDFPageDimensions(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  scale: number = 1
): Promise<{ width: number; height: number }> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    
    return {
      width: viewport.width,
      height: viewport.height
    }
  } catch (error) {
    console.error(`Error getting page ${pageNumber} dimensions:`, error)
    throw error
  }
}
