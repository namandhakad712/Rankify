/**
 * Type definitions for the Advanced Diagram Detection System
 */

export interface DiagramCoordinates {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
  type: 'graph' | 'flowchart' | 'scientific' | 'geometric' | 'table' | 'circuit' | 'other'
  description: string
}

export interface EnhancedQuestion {
  id: string
  text: string
  type: 'MCQ' | 'MSQ' | 'NAT' | 'Diagram'
  options?: string[]
  hasDiagram: boolean
  diagrams: DiagramCoordinates[]
  pageNumber: number
  confidence: number
}

export interface DiagramDetectionState {
  isProcessing: boolean
  progress: number
  currentPage: number
  totalPages: number
  detectedDiagrams: DiagramCoordinates[]
  questions: EnhancedQuestion[]
  errors: string[]
}

export interface DiagramDetectionConfig {
  geminiApiKey?: string
  enableAutoDetection: boolean
  confidenceThreshold: number
  maxRetries: number
  batchSize: number
}