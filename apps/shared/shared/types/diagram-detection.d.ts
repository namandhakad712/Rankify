/**
 * Advanced Diagram Detection Types
 * 
 * This file contains type definitions for the coordinate-based diagram detection system
 * using Google Gemini API for bounding box detection and manual review capabilities.
 */

// Core diagram coordinate types
export interface DiagramCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  type: DiagramType;
  description: string;
}

export type DiagramType = 
  | 'graph' 
  | 'flowchart' 
  | 'scientific' 
  | 'geometric' 
  | 'table' 
  | 'circuit' 
  | 'map'
  | 'other';

// Enhanced question data with diagram coordinates
export interface EnhancedQuestion extends Omit<CropperQuestionData, 'pdfData'> {
  id: string;
  text: string;
  hasDiagram: boolean;
  diagrams: DiagramCoordinates[];
  pageNumber: number;
  pageImage?: string; // Base64 or blob URL
  confidence: number;
  subject?: string;
  section?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  timeAllocation?: number;
  
  // Keep original pdfData for backward compatibility
  pdfData: PdfCropperCoords[];
}

// Coordinate metadata storage
export interface CoordinateMetadata {
  questionId: string;
  pageNumber: number;
  originalImageDimensions: {
    width: number;
    height: number;
  };
  diagrams: Array<{
    id: string;
    coordinates: DiagramCoordinates;
    type: DiagramType;
    description: string;
    confidence: number;
    lastModified: Date;
    modifiedBy: 'ai' | 'user';
  }>;
}

// Gemini API integration types
export interface GeminiDiagramRequest {
  image: string; // Base64 encoded
  prompt: string;
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash';
}

export interface GeminiDiagramResponse {
  diagrams: Array<{
    coordinates: DiagramCoordinates;
    description: string;
    confidence: number;
    type: DiagramType;
  }>;
  questions: EnhancedQuestion[];
}

export interface GeminiAPIError {
  code: 'QUOTA_EXCEEDED' | 'INVALID_IMAGE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  image?: string;
  request?: GeminiDiagramRequest;
}

// CBT Preset types
export interface CBTPreset {
  id: string;
  name: string;
  examType: 'JEE' | 'NEET' | 'CUSTOM';
  sections: CBTSection[];
  timeLimit: number;
  markingScheme: CBTMarkingScheme;
  questionDistribution: QuestionDistribution;
  createdAt: Date;
  updatedAt: Date;
}

export interface CBTSection {
  name: string;
  subjects: string[];
  questionCount: number;
  timeAllocation: number;
  markingScheme?: CBTMarkingScheme; // Override global marking scheme if needed
}

export interface CBTMarkingScheme {
  correct: number;
  incorrect: number;
  unattempted: number;
  partialCredit?: number;
}

export interface QuestionDistribution {
  totalQuestions: number;
  sections: Array<{
    name: string;
    subjects: string[];
    questionCount: number;
    timeAllocation: number;
  }>;
}

export interface ExamSchema {
  examType: string;
  totalQuestions: number;
  totalDuration: number;
  sections: Array<{
    name: string;
    subjects: string[];
    questionCount: number;
    timeAllocation: number;
  }>;
  markingScheme: CBTMarkingScheme;
  lastUpdated: Date;
  source: string; // URL or source of the schema
}

// Enhanced test configuration
export interface EnhancedTestConfig extends TestInterfaceJsonOutput['testConfig'] {
  diagramDetectionEnabled: boolean;
  coordinateBasedRendering: boolean;
  presetUsed?: string;
  examType?: 'JEE' | 'NEET' | 'CUSTOM';
}

// Page image storage
export interface PageImageData {
  id: string;
  pageNumber: number;
  testId: string;
  imageData: Blob;
  dimensions: {
    width: number;
    height: number;
  };
  scale: number;
  createdAt: Date;
}

// Manual review interface types
export interface DiagramEditSession {
  questionId: string;
  diagramId: string;
  originalCoordinates: DiagramCoordinates;
  currentCoordinates: DiagramCoordinates;
  isModified: boolean;
  startTime: Date;
}

export interface ReviewInterfaceState {
  currentPage: number;
  totalPages: number;
  questionsReviewed: number;
  totalQuestions: number;
  flaggedQuestions: string[];
  editingSessions: DiagramEditSession[];
  presetSelected?: string;
}

// Coordinate validation types
export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CoordinateValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedCoordinates?: DiagramCoordinates;
}

// Performance and caching types
export interface DiagramCache {
  questionId: string;
  coordinates: DiagramCoordinates[];
  renderedAt: Date;
  cacheKey: string;
}

export interface ProcessingStats {
  totalQuestions: number;
  questionsWithDiagrams: number;
  averageConfidence: number;
  processingTime: number;
  apiCalls: number;
  errors: number;
}

// Database extension types for IndexedDB
export interface EnhancedRankifyDB extends IRankifyDB {
  // New tables for coordinate-based diagrams
  diagramCoordinates: {
    add(data: CoordinateMetadata): Promise<string>;
    get(questionId: string): Promise<CoordinateMetadata | undefined>;
    update(questionId: string, data: Partial<CoordinateMetadata>): Promise<void>;
    delete(questionId: string): Promise<void>;
    getByPage(pageNumber: number): Promise<CoordinateMetadata[]>;
  };
  
  pageImages: {
    add(data: PageImageData): Promise<string>;
    get(id: string): Promise<PageImageData | undefined>;
    getByTestId(testId: string): Promise<PageImageData[]>;
    delete(id: string): Promise<void>;
  };
  
  cbtPresets: {
    add(data: CBTPreset): Promise<string>;
    get(id: string): Promise<CBTPreset | undefined>;
    getByExamType(examType: string): Promise<CBTPreset[]>;
    update(id: string, data: Partial<CBTPreset>): Promise<void>;
    delete(id: string): Promise<void>;
  };
  
  diagramCache: {
    add(data: DiagramCache): Promise<string>;
    get(cacheKey: string): Promise<DiagramCache | undefined>;
    cleanup(olderThan: Date): Promise<void>;
  };
}

// Enhanced JSON output types
export interface EnhancedPdfCropperJsonOutput extends Omit<PdfCropperJsonOutput, 'pdfCropperData'> {
  pdfCropperData: CropperOutputData;
  diagramCoordinates?: CoordinateMetadata[];
  processingStats?: ProcessingStats;
  aiEnhanced: boolean;
}

export interface EnhancedTestInterfaceJsonOutput extends Omit<TestInterfaceJsonOutput, 'testData' | 'testConfig'> {
  testData: {
    [subject: string]: {
      [section: string]: {
        [question: number | string]: TestInterfaceQuestionData & {
          diagrams?: DiagramCoordinates[];
          hasDiagram?: boolean;
        };
      };
    };
  };
  testConfig: EnhancedTestConfig;
  diagramCoordinates?: CoordinateMetadata[];
}

// Utility types for coordinate transformations
export interface CoordinateTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface ViewportCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Error handling types
export interface DiagramDetectionError {
  type: 'API_ERROR' | 'VALIDATION_ERROR' | 'PROCESSING_ERROR' | 'STORAGE_ERROR';
  message: string;
  questionId?: string;
  pageNumber?: number;
  originalError?: Error;
  timestamp: Date;
}

// Event types for diagram editing
export interface DiagramEditEvent {
  type: 'COORDINATE_CHANGED' | 'DIAGRAM_ADDED' | 'DIAGRAM_REMOVED' | 'VALIDATION_FAILED';
  questionId: string;
  diagramId?: string;
  coordinates?: DiagramCoordinates;
  timestamp: Date;
}