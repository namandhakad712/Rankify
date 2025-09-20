/**
 * AI Extraction Integration
 * Complete integration example showing how all components work together
 */

import AIExtractionEngine, { aiExtractionUtils } from './aiExtractionUtils'
import { getAIStorage } from './aiStorageUtils'
import { confidenceUtils } from './confidenceScoringUtils'

/**
 * Complete AI extraction workflow
 */
export class AIExtractionWorkflow {
  private engine: AIExtractionEngine
  private storage: any

  constructor(apiKey: string) {
    if (!aiExtractionUtils.validateApiKey(apiKey)) {
      throw new Error('Invalid Gemini API key')
    }

    this.engine = aiExtractionUtils.createEngine(apiKey, {
      confidenceThreshold: 2.5,
      maxFileSizeMB: 10,
      enableDiagramDetection: true
    })
  }

  /**
   * Initialize storage
   */
  async initialize() {
    this.storage = await getAIStorage()
  }

  /**
   * Process PDF and extract questions
   */
  async processPDF(pdfFile: File): Promise<{
    success: boolean
    result?: any
    error?: string
    summary: string
  }> {
    try {
      console.log(`Processing PDF: ${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(2)} MB)`)

      // Extract questions with progress tracking
      const result = await this.engine.extractFromPDF(pdfFile, pdfFile.name, {
        enableCache: true,
        onProgress: (progress) => {
          console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`)
        }
      })

      // Generate summary
      const summary = this.generateSummary(result)
      
      return {
        success: true,
        result,
        summary
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        summary: `Failed to process ${pdfFile.name}: ${error.message}`
      }
    }
  }

  /**
   * Generate extraction summary
   */
  private generateSummary(result: any): string {
    const stats = {
      totalQuestions: result.questions.length,
      highConfidence: result.questions.filter(q => q.confidence >= 4).length,
      mediumConfidence: result.questions.filter(q => q.confidence >= 2.5 && q.confidence < 4).length,
      lowConfidence: result.questions.filter(q => q.confidence < 2.5).length,
      diagramQuestions: result.questions.filter(q => q.hasDiagram).length,
      needsReview: result.questions.filter(q => confidenceUtils.requiresManualReview(q)).length
    }

    return `
📊 Extraction Summary:
• Total Questions: ${stats.totalQuestions}
• High Confidence (≥4.0): ${stats.highConfidence} (${((stats.highConfidence/stats.totalQuestions)*100).toFixed(1)}%)
• Medium Confidence (2.5-4.0): ${stats.mediumConfidence} (${((stats.mediumConfidence/stats.totalQuestions)*100).toFixed(1)}%)
• Low Confidence (<2.5): ${stats.lowConfidence} (${((stats.lowConfidence/stats.totalQuestions)*100).toFixed(1)}%)
• Diagram Questions: ${stats.diagramQuestions}
• Needs Manual Review: ${stats.needsReview}
• Overall Confidence: ${result.confidence}/5 (${confidenceUtils.getConfidenceDescription(result.confidence)})
• Processing Time: ${(result.processingTime/1000).toFixed(2)}s
    `.trim()
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    return this.engine.getExtractionStats()
  }

  /**
   * Clean up old data
   */
  async cleanup() {
    await this.engine.cleanupCache(24) // 24 hours
  }
}

/**
 * Demo function to show complete workflow
 */
export async function demonstrateAIExtraction() {
  console.log('🚀 AI Extraction Demo Starting...\n')

  // Note: In real usage, get API key from environment or user input
  const apiKey = 'AIzaSyYourGeminiAPIKeyHere' // Replace with actual key
  
  try {
    // Initialize workflow
    const workflow = new AIExtractionWorkflow(apiKey)
    await workflow.initialize()

    console.log('✅ Workflow initialized successfully\n')

    // Get current stats
    const initialStats = await workflow.getStats()
    console.log('📈 Current Storage Stats:')
    console.log(`• Total Extractions: ${initialStats.totalExtractions}`)
    console.log(`• Total Questions: ${initialStats.totalQuestions}`)
    console.log(`• Average Confidence: ${initialStats.averageConfidence.toFixed(2)}/5`)
    console.log(`• Storage Used: ${(initialStats.storageUsed / 1024).toFixed(2)} KB\n`)

    // Simulate PDF processing (in real usage, this would be actual PDF files)
    const mockPDFs = [
      { name: 'math-questions.pdf', size: 1024 * 1024 * 2 }, // 2MB
      { name: 'physics-test.pdf', size: 1024 * 1024 * 5 },   // 5MB
    ]

    for (const pdfInfo of mockPDFs) {
      console.log(`📄 Processing: ${pdfInfo.name}`)
      
      // Create mock file
      const mockFile = new File([new ArrayBuffer(pdfInfo.size)], pdfInfo.name, {
        type: 'application/pdf'
      })

      // Process PDF
      const result = await workflow.processPDF(mockFile)
      
      if (result.success) {
        console.log('✅ Processing successful!')
        console.log(result.summary)
      } else {
        console.log('❌ Processing failed!')
        console.log(`Error: ${result.error}`)
      }
      
      console.log('') // Empty line for readability
    }

    // Clean up old data
    console.log('🧹 Cleaning up old cache data...')
    await workflow.cleanup()
    console.log('✅ Cleanup completed\n')

    // Final stats
    const finalStats = await workflow.getStats()
    console.log('📊 Final Storage Stats:')
    console.log(`• Total Extractions: ${finalStats.totalExtractions}`)
    console.log(`• Total Questions: ${finalStats.totalQuestions}`)
    console.log(`• Average Confidence: ${finalStats.averageConfidence.toFixed(2)}/5`)
    console.log(`• Storage Used: ${(finalStats.storageUsed / 1024).toFixed(2)} KB`)

    console.log('\n🎉 Demo completed successfully!')

  } catch (error) {
    console.error('❌ Demo failed:', error.message)
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Tip: Make sure to set a valid Gemini API key')
      console.log('   Get one at: https://makersuite.google.com/app/apikey')
    }
  }
}

/**
 * Utility to validate the complete setup
 */
export function validateSetup(): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check if required dependencies are available
  try {
    // Test crypto API
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      issues.push('Web Crypto API not available')
    }

    // Test IndexedDB
    if (typeof indexedDB === 'undefined') {
      issues.push('IndexedDB not available')
    }

    // Test fetch API
    if (typeof fetch === 'undefined') {
      issues.push('Fetch API not available')
    }

    // Test ArrayBuffer support
    if (typeof ArrayBuffer === 'undefined') {
      issues.push('ArrayBuffer not supported')
    }

  } catch (error) {
    issues.push(`Setup validation error: ${error.message}`)
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Export for easy usage
 */
export default AIExtractionWorkflow