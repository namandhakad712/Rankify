/**
 * PDF Processing Utilities for AI extraction
 * Handles PDF text extraction and page analysis
 */

export interface PDFProcessingResult {
  text: string
  pageCount: number
  metadata: PDFMetadata
  pages: PDFPageInfo[]
}

export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
  fileSize: number
  version?: string
}

export interface PDFPageInfo {
  pageNumber: number
  text: string
  hasImages: boolean
  hasTables: boolean
  wordCount: number
  confidence: number
}

export interface TextExtractionOptions {
  preserveFormatting?: boolean
  includeMetadata?: boolean
  pageRange?: { start: number; end: number }
  extractImages?: boolean
}

/**
 * PDF Processing utility class
 */
export class PDFProcessor {
  private pdfDoc: any = null

  /**
   * Load PDF from ArrayBuffer
   */
  async loadPDF(pdfBuffer: ArrayBuffer): Promise<void> {
    try {
      // Use mupdf library that's already available in the project
      const { createMuPDF } = await import('mupdf')
      const mupdf = await createMuPDF()
      
      this.pdfDoc = mupdf.load(new Uint8Array(pdfBuffer))
    } catch (error) {
      throw new Error(`Failed to load PDF: ${error.message}`)
    }
  }

  /**
   * Extract text from all pages
   */
  async extractText(options: TextExtractionOptions = {}): Promise<PDFProcessingResult> {
    if (!this.pdfDoc) {
      throw new Error('PDF not loaded. Call loadPDF() first.')
    }

    try {
      const pageCount = this.pdfDoc.countPages()
      const pages: PDFPageInfo[] = []
      let fullText = ''

      const startPage = options.pageRange?.start || 1
      const endPage = options.pageRange?.end || pageCount

      for (let i = startPage; i <= Math.min(endPage, pageCount); i++) {
        const page = this.pdfDoc.loadPage(i - 1) // 0-based indexing
        const pageText = page.toStructuredText('preserve-whitespace').asText()
        
        const pageInfo: PDFPageInfo = {
          pageNumber: i,
          text: pageText,
          hasImages: this.detectImages(page),
          hasTables: this.detectTables(pageText),
          wordCount: this.countWords(pageText),
          confidence: this.calculateTextConfidence(pageText)
        }

        pages.push(pageInfo)
        fullText += pageText + '\n\n'
      }

      const metadata = await this.extractMetadata()

      return {
        text: fullText.trim(),
        pageCount,
        metadata,
        pages
      }
    } catch (error) {
      throw new Error(`Failed to extract text: ${error.message}`)
    }
  }

  /**
   * Extract text from specific page
   */
  async extractPageText(pageNumber: number): Promise<string> {
    if (!this.pdfDoc) {
      throw new Error('PDF not loaded. Call loadPDF() first.')
    }

    try {
      const page = this.pdfDoc.loadPage(pageNumber - 1)
      return page.toStructuredText('preserve-whitespace').asText()
    } catch (error) {
      throw new Error(`Failed to extract text from page ${pageNumber}: ${error.message}`)
    }
  }

  /**
   * Analyze PDF structure for question detection
   */
  async analyzeStructure(): Promise<PDFStructureAnalysis> {
    if (!this.pdfDoc) {
      throw new Error('PDF not loaded. Call loadPDF() first.')
    }

    const result = await this.extractText()
    const analysis: PDFStructureAnalysis = {
      totalPages: result.pageCount,
      hasQuestions: this.detectQuestions(result.text),
      hasMultipleChoice: this.detectMultipleChoice(result.text),
      hasNumerical: this.detectNumerical(result.text),
      hasDiagrams: this.detectDiagramReferences(result.text),
      questionCount: this.estimateQuestionCount(result.text),
      sections: this.identifySections(result.text),
      confidence: this.calculateStructureConfidence(result)
    }

    return analysis
  }

  /**
   * Extract metadata from PDF
   */
  private async extractMetadata(): Promise<PDFMetadata> {
    if (!this.pdfDoc) {
      throw new Error('PDF not loaded')
    }

    try {
      // Basic metadata extraction
      return {
        fileSize: 0, // Will be set by caller
        title: 'Unknown',
        author: 'Unknown',
        subject: 'Unknown'
      }
    } catch (error) {
      console.warn('Failed to extract PDF metadata:', error)
      return {
        fileSize: 0
      }
    }
  }

  /**
   * Detect images in page
   */
  private detectImages(page: any): boolean {
    try {
      // Simple heuristic - check if page has image objects
      const resources = page.getResources()
      return resources && Object.keys(resources).some(key => key.includes('Image'))
    } catch {
      return false
    }
  }

  /**
   * Detect tables in text
   */
  private detectTables(text: string): boolean {
    // Look for table-like patterns
    const tablePatterns = [
      /\|.*\|.*\|/,  // Pipe-separated
      /\t.*\t.*\t/,  // Tab-separated
      /\s{3,}\w+\s{3,}\w+/  // Multiple spaces
    ]
    
    return tablePatterns.some(pattern => pattern.test(text))
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Calculate text extraction confidence
   */
  private calculateTextConfidence(text: string): number {
    let confidence = 3 // Base confidence

    // Check for good indicators
    if (text.length > 100) confidence += 0.5
    if (/[A-Za-z]/.test(text)) confidence += 0.5
    if (/\d/.test(text)) confidence += 0.3
    if (/[.!?]/.test(text)) confidence += 0.2

    // Check for bad indicators
    if (text.includes('�')) confidence -= 1 // Encoding issues
    if (text.length < 10) confidence -= 2
    if (!/[A-Za-z]/.test(text)) confidence -= 1 // No letters

    return Math.max(1, Math.min(5, Math.round(confidence)))
  }

  /**
   * Detect questions in text
   */
  private detectQuestions(text: string): boolean {
    const questionPatterns = [
      /\d+\.\s*[A-Z]/,  // Numbered questions
      /Q\d+[:\.]?\s*/i,  // Q1:, Q1., etc.
      /Question\s*\d+/i,  // Question 1
      /\?\s*$/m,  // Lines ending with ?
      /\b(what|how|why|when|where|which)\b/i  // Question words
    ]
    
    return questionPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Detect multiple choice patterns
   */
  private detectMultipleChoice(text: string): boolean {
    const mcqPatterns = [
      /\b[A-D]\)\s*\w+/g,  // A) option
      /\b[A-D]\.\s*\w+/g,  // A. option
      /\([A-D]\)\s*\w+/g,  // (A) option
      /\b[1-4]\)\s*\w+/g   // 1) option
    ]
    
    return mcqPatterns.some(pattern => {
      const matches = text.match(pattern)
      return matches && matches.length >= 2 // At least 2 options
    })
  }

  /**
   * Detect numerical answer types
   */
  private detectNumerical(text: string): boolean {
    const numericalPatterns = [
      /answer.*\d+/i,
      /result.*\d+/i,
      /value.*\d+/i,
      /calculate/i,
      /find.*value/i
    ]
    
    return numericalPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Detect diagram references
   */
  private detectDiagramReferences(text: string): boolean {
    const diagramPatterns = [
      /figure\s*\d+/i,
      /diagram\s*\d+/i,
      /graph\s*\d+/i,
      /chart\s*\d+/i,
      /image\s*\d+/i,
      /shown\s*(above|below|in)/i,
      /refer.*figure/i,
      /see.*diagram/i
    ]
    
    return diagramPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Estimate question count
   */
  private estimateQuestionCount(text: string): number {
    const questionMarkers = [
      /\d+\.\s*[A-Z]/g,  // Numbered questions
      /Q\d+/gi,  // Q1, Q2, etc.
      /Question\s*\d+/gi  // Question 1, etc.
    ]
    
    let maxCount = 0
    
    questionMarkers.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        maxCount = Math.max(maxCount, matches.length)
      }
    })
    
    return maxCount
  }

  /**
   * Identify sections in text
   */
  private identifySections(text: string): string[] {
    const sectionPatterns = [
      /section\s*[A-Z\d]+/gi,
      /part\s*[A-Z\d]+/gi,
      /chapter\s*\d+/gi,
      /unit\s*\d+/gi
    ]
    
    const sections: Set<string> = new Set()
    
    sectionPatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach(match => sections.add(match.toLowerCase()))
      }
    })
    
    return Array.from(sections)
  }

  /**
   * Calculate overall structure confidence
   */
  private calculateStructureConfidence(result: PDFProcessingResult): number {
    let confidence = 3 // Base confidence
    
    // Positive indicators
    if (result.text.length > 1000) confidence += 0.5
    if (result.pages.length > 0) confidence += 0.3
    if (result.pages.some(p => p.confidence >= 4)) confidence += 0.5
    
    // Negative indicators
    if (result.text.length < 100) confidence -= 2
    if (result.pages.every(p => p.confidence <= 2)) confidence -= 1
    
    return Math.max(1, Math.min(5, Math.round(confidence)))
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.pdfDoc) {
      this.pdfDoc = null
    }
  }
}

export interface PDFStructureAnalysis {
  totalPages: number
  hasQuestions: boolean
  hasMultipleChoice: boolean
  hasNumerical: boolean
  hasDiagrams: boolean
  questionCount: number
  sections: string[]
  confidence: number
}

/**
 * Utility functions for PDF processing
 */
export const pdfUtils = {
  /**
   * Validate PDF buffer
   */
  validatePDF(buffer: ArrayBuffer): boolean {
    const header = new Uint8Array(buffer.slice(0, 5))
    const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2D] // %PDF-
    
    return header.every((byte, index) => byte === pdfSignature[index])
  },

  /**
   * Get PDF file size in MB
   */
  getFileSizeMB(buffer: ArrayBuffer): number {
    return buffer.byteLength / (1024 * 1024)
  },

  /**
   * Check if PDF is too large for processing
   */
  isFileSizeValid(buffer: ArrayBuffer, maxSizeMB: number = 10): boolean {
    return this.getFileSizeMB(buffer) <= maxSizeMB
  }
}

/**
 * Factory function to create PDF processor
 */
export function createPDFProcessor(): PDFProcessor {
  return new PDFProcessor()
}