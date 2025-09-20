/**
 * AI Extraction Usage Examples
 * Demonstrates how to use the AI extraction utilities
 */

import AIExtractionEngine, { aiExtractionUtils } from '../aiExtractionUtils'
import type { AIExtractionProgress } from '../aiExtractionUtils'

/**
 * Example 1: Basic PDF extraction
 */
export async function basicExtractionExample() {
  // Validate API key first
  const apiKey = 'AIzaSyYourGeminiAPIKeyHere'
  
  if (!aiExtractionUtils.validateApiKey(apiKey)) {
    throw new Error('Invalid Gemini API key format')
  }

  // Create extraction engine
  const engine = aiExtractionUtils.createEngine(apiKey, {
    confidenceThreshold: aiExtractionUtils.getRecommendedThreshold('balanced'),
    maxFileSizeMB: 10,
    enableDiagramDetection: true
  })

  // Progress tracking
  const onProgress = (progress: AIExtractionProgress) => {
    console.log(`${progress.stage}: ${progress.progress}% - ${progress.message}`)
  }

  try {
    // Simulate PDF file (in real usage, this would come from file input)
    const pdfFile = new File([], 'sample-questions.pdf', { type: 'application/pdf' })
    
    // Extract questions
    const result = await engine.extractFromPDF(pdfFile, 'sample-questions.pdf', {
      enableCache: true,
      onProgress
    })

    // Display summary
    console.log(aiExtractionUtils.formatExtractionSummary(result))

    return result
  } catch (error) {
    console.error('Extraction failed:', error.message)
    throw error
  }
}

/**
 * Example 2: Advanced extraction with custom validation
 */
export async function advancedExtractionExample() {
  const apiKey = 'AIzaSyYourGeminiAPIKeyHere'
  
  const engine = new AIExtractionEngine({
    geminiApiKey: apiKey,
    geminiModel: 'gemini-1.5-flash',
    confidenceThreshold: 3.0,
    maxRetries: 5,
    enableDiagramDetection: true
  })

  // Custom progress handler with detailed logging
  const onProgress = (progress: AIExtractionProgress) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${progress.stage.toUpperCase()}: ${progress.message}`)
    
    if (progress.currentStep && progress.totalSteps) {
      console.log(`  Step ${progress.currentStep}/${progress.totalSteps}`)
    }
  }

  try {
    const pdfBuffer = new ArrayBuffer(0) // Mock PDF data
    
    const result = await engine.extractFromPDF(pdfBuffer, 'advanced-test.pdf', {
      skipValidation: false,
      skipStorage: false,
      enableCache: true,
      onProgress
    })

    // Validate questions manually
    const validations = await engine.validateQuestions(result.questions)
    
    console.log('Validation Results:')
    validations.forEach((validation, index) => {
      console.log(`Question ${index + 1}:`, {
        valid: validation.isValid,
        confidence: validation.confidence,
        errors: validation.errors.length,
        warnings: validation.warnings.length
      })
    })

    // Reprocess confidence if needed
    if (result.confidence < 3) {
      console.log('Low confidence detected, reprocessing...')
      result.questions = await engine.reprocessConfidence(result.questions)
    }

    return result
  } catch (error) {
    console.error('Advanced extraction failed:', error)
    throw error
  }
}

/**
 * Example 3: Batch processing multiple PDFs
 */
export async function batchProcessingExample() {
  const apiKey = 'AIzaSyYourGeminiAPIKeyHere'
  const engine = aiExtractionUtils.createEngine(apiKey)

  const pdfFiles = [
    { name: 'math-questions.pdf', buffer: new ArrayBuffer(0) },
    { name: 'physics-questions.pdf', buffer: new ArrayBuffer(0) },
    { name: 'chemistry-questions.pdf', buffer: new ArrayBuffer(0) }
  ]

  const results = []

  for (const [index, file] of pdfFiles.entries()) {
    console.log(`Processing ${index + 1}/${pdfFiles.length}: ${file.name}`)
    
    try {
      const result = await engine.extractFromPDF(file.buffer, file.name, {
        onProgress: (progress) => {
          console.log(`  ${file.name}: ${progress.progress}% - ${progress.message}`)
        }
      })
      
      results.push({
        fileName: file.name,
        success: true,
        questionCount: result.questions.length,
        confidence: result.confidence,
        processingTime: result.processingTime
      })
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error.message)
      results.push({
        fileName: file.name,
        success: false,
        error: error.message
      })
    }
  }

  // Summary report
  console.log('\nBatch Processing Summary:')
  console.log(`Total files: ${pdfFiles.length}`)
  console.log(`Successful: ${results.filter(r => r.success).length}`)
  console.log(`Failed: ${results.filter(r => !r.success).length}`)
  
  const successful = results.filter(r => r.success)
  if (successful.length > 0) {
    const totalQuestions = successful.reduce((sum, r) => sum + (r.questionCount || 0), 0)
    const avgConfidence = successful.reduce((sum, r) => sum + (r.confidence || 0), 0) / successful.length
    
    console.log(`Total questions extracted: ${totalQuestions}`)
    console.log(`Average confidence: ${avgConfidence.toFixed(2)}/5`)
  }

  return results
}

/**
 * Example 4: Working with storage and caching
 */
export async function storageExample() {
  const apiKey = 'AIzaSyYourGeminiAPIKeyHere'
  const engine = aiExtractionUtils.createEngine(apiKey)

  try {
    // Get extraction statistics
    const stats = await engine.getExtractionStats()
    console.log('Current Storage Stats:', stats)

    // Clean up old cache (older than 12 hours)
    await engine.cleanupCache(12)
    console.log('Cache cleanup completed')

    // Example extraction with caching
    const pdfBuffer = new ArrayBuffer(0)
    
    console.log('First extraction (will be cached):')
    const result1 = await engine.extractFromPDF(pdfBuffer, 'cached-test.pdf', {
      enableCache: true
    })

    console.log('Second extraction (should use cache):')
    const result2 = await engine.extractFromPDF(pdfBuffer, 'cached-test.pdf', {
      enableCache: true
    })

    console.log('Cache hit:', result1.processingTime > result2.processingTime)

    return { result1, result2, stats }
  } catch (error) {
    console.error('Storage example failed:', error)
    throw error
  }
}

/**
 * Example 5: Error handling and recovery
 */
export async function errorHandlingExample() {
  const apiKey = 'AIzaSyYourGeminiAPIKeyHere'
  const engine = aiExtractionUtils.createEngine(apiKey, {
    maxRetries: 3,
    confidenceThreshold: 2.0
  })

  const testCases = [
    { name: 'valid-pdf.pdf', buffer: new ArrayBuffer(1024) },
    { name: 'invalid-file.txt', buffer: new ArrayBuffer(100) },
    { name: 'too-large.pdf', buffer: new ArrayBuffer(20 * 1024 * 1024) }, // 20MB
    { name: 'empty-file.pdf', buffer: new ArrayBuffer(0) }
  ]

  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`)
    
    try {
      const result = await engine.extractFromPDF(testCase.buffer, testCase.name, {
        onProgress: (progress) => {
          if (progress.stage === 'error') {
            console.log(`  Error: ${progress.message}`)
          }
        }
      })
      
      console.log(`  Success: ${result.questions.length} questions extracted`)
    } catch (error) {
      console.log(`  Failed: ${error.message}`)
      
      // Handle specific error types
      if (error.message.includes('Invalid PDF')) {
        console.log('  → File format issue detected')
      } else if (error.message.includes('too large')) {
        console.log('  → File size limit exceeded')
      } else if (error.message.includes('API')) {
        console.log('  → Gemini API issue, check API key and quota')
      } else {
        console.log('  → Unknown error, check logs for details')
      }
    }
  }
}

/**
 * Example 6: Export and import functionality
 */
export async function exportImportExample() {
  const apiKey = 'AIzaSyYourGeminiAPIKeyHere'
  const engine = aiExtractionUtils.createEngine(apiKey)

  try {
    // Mock extraction result
    const mockResult = {
      questions: [
        {
          id: 1,
          text: 'What is 2 + 2?',
          type: 'MCQ',
          options: ['3', '4', '5', '6'],
          correctAnswer: null,
          subject: 'Mathematics',
          section: 'Arithmetic',
          pageNumber: 1,
          questionNumber: 1,
          confidence: 4.5,
          hasDiagram: false,
          extractionMetadata: {
            processingTime: 150,
            geminiModel: 'gemini-1.5-flash',
            apiVersion: 'v1beta'
          }
        }
      ],
      metadata: {
        geminiModel: 'gemini-1.5-flash',
        processingDate: new Date().toISOString(),
        totalConfidence: 4.5,
        diagramQuestionsCount: 0,
        manualReviewRequired: false,
        pdfMetadata: {
          fileName: 'test.pdf',
          fileHash: 'abc123',
          pageCount: 1,
          extractedText: 'Sample text...'
        }
      },
      confidence: 4.5,
      processingTime: 1500
    }

    // Export to JSON
    const exportedJSON = aiExtractionUtils.exportToJSON(mockResult)
    console.log('Exported JSON length:', exportedJSON.length)

    // Import from JSON
    const importedResult = aiExtractionUtils.importFromJSON(exportedJSON)
    console.log('Import successful:', importedResult.questions.length === mockResult.questions.length)

    // Test invalid import
    try {
      aiExtractionUtils.importFromJSON('invalid json')
    } catch (error) {
      console.log('Invalid JSON handling works:', error.message.includes('Failed to import'))
    }

    return { exported: exportedJSON, imported: importedResult }
  } catch (error) {
    console.error('Export/import example failed:', error)
    throw error
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('=== AI Extraction Examples ===\n')

  const examples = [
    { name: 'Basic Extraction', fn: basicExtractionExample },
    { name: 'Advanced Extraction', fn: advancedExtractionExample },
    { name: 'Batch Processing', fn: batchProcessingExample },
    { name: 'Storage Management', fn: storageExample },
    { name: 'Error Handling', fn: errorHandlingExample },
    { name: 'Export/Import', fn: exportImportExample }
  ]

  for (const example of examples) {
    console.log(`\n--- ${example.name} ---`)
    try {
      await example.fn()
      console.log(`✅ ${example.name} completed successfully`)
    } catch (error) {
      console.log(`❌ ${example.name} failed:`, error.message)
    }
  }

  console.log('\n=== Examples Complete ===')
}