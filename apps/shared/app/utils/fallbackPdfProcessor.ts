/**
 * Fallback PDF processor that doesn't rely on WASM
 * Uses browser's built-in PDF capabilities where possible
 */

import type { PDFProcessingResult, PDFMetadata, PDFPageInfo, TextExtractionOptions } from './pdfProcessingUtils'

export class FallbackPDFProcessor {
  private pdfData: ArrayBuffer | null = null
  private fileName: string = ''

  /**
   * Load PDF from ArrayBuffer
   */
  async loadPDF(pdfBuffer: ArrayBuffer, fileName: string = 'document.pdf'): Promise<void> {
    this.pdfData = pdfBuffer
    this.fileName = fileName
  }

  /**
   * Extract text using fallback methods
   */
  async extractText(options: TextExtractionOptions = {}): Promise<PDFProcessingResult> {
    if (!this.pdfData) {
      throw new Error('PDF not loaded. Call loadPDF() first.')
    }

    try {
      // Try to use PDF.js if available
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        return await this.extractWithPDFJS(options)
      }

      // Fallback to basic text extraction
      return await this.extractBasicText(options)
    } catch (error) {
      console.error('Fallback PDF extraction failed:', error)
      throw new Error('Unable to extract text from PDF. The file may be corrupted or password-protected.')
    }
  }

  /**
   * Extract using PDF.js if available
   */
  private async extractWithPDFJS(options: TextExtractionOptions): Promise<PDFProcessingResult> {
    const pdfjsLib = (window as any).pdfjsLib
    
    const loadingTask = pdfjsLib.getDocument({
      data: this.pdfData,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    })
    
    const pdf = await loadingTask.promise
    const pageCount = pdf.numPages
    const pages: PDFPageInfo[] = []
    let fullText = ''

    const startPage = options.pageRange?.start || 1
    const endPage = options.pageRange?.end || pageCount

    for (let i = startPage; i <= Math.min(endPage, pageCount); i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      const pageInfo: PDFPageInfo = {
        pageNumber: i,
        text: pageText,
        hasImages: false, // PDF.js doesn't easily detect images
        hasTables: this.detectTables(pageText),
        wordCount: this.countWords(pageText),
        confidence: this.calculateTextConfidence(pageText)
      }

      pages.push(pageInfo)
      fullText += pageText + '\n\n'
    }

    const metadata: PDFMetadata = {
      fileSize: this.pdfData!.byteLength,
      title: this.fileName,
      author: 'Unknown',
      subject: 'Unknown'
    }

    return {
      text: fullText.trim(),
      pageCount,
      metadata,
      pages
    }
  }

  /**
   * Basic text extraction fallback
   */
  private async extractBasicText(options: TextExtractionOptions): Promise<PDFProcessingResult> {
    // This is a very basic fallback that just provides structure
    // In a real implementation, you might use a server-side service
    
    const mockText = `This PDF could not be processed due to technical limitations.
    
Please try one of the following:
1. Refresh the page and try again
2. Use a different browser (Chrome or Firefox recommended)
3. Check that JavaScript is enabled
4. Try a smaller PDF file (under 10MB)

If the problem persists, you can manually enter your questions using the manual input feature.`

    const pageInfo: PDFPageInfo = {
      pageNumber: 1,
      text: mockText,
      hasImages: false,
      hasTables: false,
      wordCount: this.countWords(mockText),
      confidence: 1 // Low confidence for fallback
    }

    const metadata: PDFMetadata = {
      fileSize: this.pdfData!.byteLength,
      title: this.fileName,
      author: 'Unknown',
      subject: 'PDF Processing Failed'
    }

    return {
      text: mockText,
      pageCount: 1,
      metadata,
      pages: [pageInfo]
    }
  }

  /**
   * Detect tables in text
   */
  private detectTables(text: string): boolean {
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
   * Clean up resources
   */
  dispose(): void {
    this.pdfData = null
    this.fileName = ''
  }
}

/**
 * Factory function to create fallback PDF processor
 */
export function createFallbackPDFProcessor(): FallbackPDFProcessor {
  return new FallbackPDFProcessor()
}