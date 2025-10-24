/**
 * Diagram Type Definitions for Coordinate-Based Diagram System
 * 
 * This module defines TypeScript interfaces for storing and managing diagrams
 * using normalized coordinates (0-1) instead of cropped images, achieving
 * 99.99% storage reduction while maintaining full quality and flexibility.
 */

/**
 * Diagram coordinate system uses normalized values (0-1)
 * This makes coordinates resolution-independent and allows rendering
 * at any scale without quality loss
 */
export interface DiagramBoundingBox {
  /** Horizontal position (0 = left edge, 1 = right edge) */
  x: number
  
  /** Vertical position (0 = top edge, 1 = bottom edge) */
  y: number
  
  /** Width as fraction of page width (0-1) */
  width: number
  
  /** Height as fraction of page height (0-1) */
  height: number
}

/**
 * Complete diagram coordinate data with metadata
 * Stores only ~100 bytes per diagram vs ~1MB for cropped images
 */
export interface DiagramCoordinates {
  /** Associated question ID */
  questionId: number
  
  /** Which PDF page the diagram is on (1-indexed) */
  pageNumber: number
  
  /** Normalized bounding box coordinates */
  boundingBox: DiagramBoundingBox
  
  /** AI confidence score (1-5 scale) */
  confidence: number
  
  /** Diagram label if visible (e.g., "Figure 2.3", "Circuit A") */
  label?: string
  
  /** How the diagram was detected/created */
  detectionMethod: 'ai' | 'manual' | 'adjusted'
  
  /** Timestamp when diagram was detected */
  createdAt: number
  
  /** Timestamp of last modification (for adjusted diagrams) */
  updatedAt?: number
  
  /** Optional question number detected near the diagram */
  nearbyQuestionNumber?: number
}

/**
 * Additional diagram metadata for classification and description
 */
export interface DiagramMetadata {
  /** Diagram category */
  type?: 'circuit' | 'graph' | 'flowchart' | 'table' | 'image' | 'other'
  
  /** AI-generated description of diagram content */
  description?: string
  
  /** Whether diagram contains text elements */
  hasText: boolean
  
  /** Complexity assessment for rendering optimization */
  complexity: 'simple' | 'medium' | 'complex'
}

/**
 * Enhanced question interface with diagram coordinate support
 * Extends the base AIExtractedQuestion with diagram arrays
 */
export interface AIExtractedQuestionWithDiagrams {
  id: number
  text: string
  type: 'MCQ' | 'MSQ' | 'NAT' | 'MSM'
  options: string[]
  correctAnswer: string | string[] | null
  subject: string
  section: string
  pageNumber: number
  questionNumber: number
  confidence: number
  hasDiagram: boolean
  
  /** Array of diagram coordinates (empty if hasDiagram is false) */
  diagrams?: DiagramCoordinates[]
  
  /** Additional diagram metadata for each diagram */
  diagramMetadata?: DiagramMetadata[]
  
  extractionMetadata: {
    processingTime: number
    geminiModel: string
    apiVersion: string
  }
}

/**
 * Gemini API response for diagram detection
 */
export interface GeminiDiagramDetectionResponse {
  pageNumber: number
  boundingBox: DiagramBoundingBox
  confidence: number
  label?: string
  type?: string
  description?: string
  nearbyQuestionNumber?: number
}

/**
 * Options for diagram coordinate detection
 */
export interface DiagramDetectionOptions {
  /** Page range to process (optional, defaults to all pages) */
  pageRange?: {
    start: number
    end: number
  }
  
  /** Gemini model to use */
  model?: string
  
  /** Scale factor for rendering pages to images */
  renderScale?: number
}

/**
 * Result of diagram coordinate validation
 */
export interface CoordinateValidationResult {
  /** Whether coordinates are valid */
  isValid: boolean
  
  /** Validation error messages */
  errors: string[]
  
  /** Sanitized coordinates (if invalid) */
  sanitized?: DiagramBoundingBox
}

/**
 * Diagram rendering options
 */
export interface DiagramRenderOptions {
  /** Scale factor (1=thumbnail, 2=preview, 3=full) */
  scale: number
  
  /** Output format */
  format?: 'png' | 'jpeg' | 'webp'
  
  /** Quality for lossy formats (0-1) */
  quality?: number
}

/**
 * Storage interface for PDF and diagram data
 */
export interface StoredPDF {
  /** Unique PDF identifier */
  id: string
  
  /** Original filename */
  fileName: string
  
  /** PDF file as ArrayBuffer */
  buffer: ArrayBuffer
  
  /** Upload timestamp */
  uploadDate: number
  
  /** File size in bytes */
  fileSize: number
}

/**
 * Storage interface for questions with diagram coordinates
 */
export interface StoredQuestion {
  /** Question ID */
  id: number
  
  /** Associated PDF ID */
  pdfId: string
  
  /** Complete question data */
  questionData: AIExtractedQuestionWithDiagrams
  
  /** Diagram coordinates array */
  diagrams: DiagramCoordinates[]
}
