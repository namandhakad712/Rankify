# AI-Powered PDF Extraction Utilities

This module provides comprehensive AI-powered PDF extraction capabilities using Google's Gemini API. It includes utilities for PDF processing, question extraction, confidence scoring, and data storage.

## 🚀 Quick Start

```typescript
import AIExtractionEngine, { aiExtractionUtils } from './aiExtractionUtils'

// Initialize with your Gemini API key
const engine = aiExtractionUtils.createEngine('AIzaSyYourGeminiAPIKeyHere')

// Extract questions from PDF
const result = await engine.extractFromPDF(pdfFile, 'questions.pdf', {
  enableCache: true,
  onProgress: (progress) => console.log(progress.message)
})

console.log(`Extracted ${result.questions.length} questions`)
```

## 📦 Components

### 1. Gemini API Client (`geminiAPIClient.ts`)
Handles communication with Google's Gemini API for AI-powered text extraction and question parsing.

**Features:**
- Retry logic with exponential backoff
- Error handling and recovery
- PDF to base64 conversion
- Structured question parsing
- Diagram detection

**Usage:**
```typescript
import { createGeminiClient } from './geminiAPIClient'

const client = createGeminiClient({
  apiKey: 'your-api-key',
  model: 'gemini-1.5-flash',
  maxRetries: 3
})

const result = await client.extractQuestions(pdfBuffer, 'filename.pdf')
```

### 2. PDF Processing (`pdfProcessingUtils.ts`)
Handles PDF text extraction and structural analysis using MuPDF.

**Features:**
- Text extraction with formatting preservation
- Page-by-page analysis
- Image and table detection
- Structure analysis for question detection
- Metadata extraction

**Usage:**
```typescript
import { createPDFProcessor } from './pdfProcessingUtils'

const processor = createPDFProcessor()
await processor.loadPDF(pdfBuffer)
const result = await processor.extractText()
```

### 3. AI Storage (`aiStorageUtils.ts`)
IndexedDB-based storage layer for AI-generated test data with caching capabilities.

**Features:**
- Persistent storage of extraction results
- Caching for performance
- Review status tracking
- Storage statistics
- Data validation

**Usage:**
```typescript
import { getAIStorage } from './aiStorageUtils'

const storage = await getAIStorage()
const id = await storage.storeExtractionResult(fileName, fileHash, result)
```

### 4. Confidence Scoring (`confidenceScoringUtils.ts`)
Advanced confidence assessment and validation for extracted questions.

**Features:**
- Multi-dimensional confidence scoring
- Question validation
- Error and warning detection
- Confidence trend analysis
- Manual review recommendations

**Usage:**
```typescript
import { createConfidenceScorer, createQuestionValidator } from './confidenceScoringUtils'

const scorer = createConfidenceScorer()
const validator = createQuestionValidator()

const metrics = scorer.calculateQuestionConfidence(question)
const validation = validator.validateQuestion(question)
```

### 5. Main Integration (`aiExtractionUtils.ts`)
Orchestrates all components into a cohesive extraction engine.

**Features:**
- Complete extraction workflow
- Progress tracking
- Error handling
- Statistics and reporting
- Export/import functionality

## 🔧 Configuration

### API Key Setup
Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey):

```typescript
const config = {
  geminiApiKey: 'AIzaSyYourGeminiAPIKeyHere',
  geminiModel: 'gemini-1.5-flash', // or 'gemini-1.5-pro'
  maxRetries: 3,
  confidenceThreshold: 2.5,
  enableDiagramDetection: true,
  maxFileSizeMB: 10
}
```

### Confidence Thresholds
- **Strict (4.0)**: Only high-quality extractions
- **Balanced (2.5)**: Good balance of quality and coverage
- **Permissive (1.5)**: Accept lower quality for maximum coverage

## 📊 Question Types Supported

| Type | Description | Example |
|------|-------------|---------|
| MCQ  | Multiple Choice (single answer) | What is 2+2? A) 3 B) 4 C) 5 |
| MSQ  | Multiple Select (multiple answers) | Which are prime? A) 2 B) 3 C) 4 |
| NAT  | Numerical Answer Type | Calculate: 5×6 = ___ |
| MSM  | Matrix Match | Match items in columns |
| Diagram | Questions with visual elements | Refer to Figure 1... |

## 🎯 Confidence Scoring

The system uses a 5-point confidence scale:

- **5 - Excellent**: Perfect extraction, no review needed
- **4 - Good**: High quality, minimal review needed
- **3 - Fair**: Acceptable quality, some review recommended
- **2 - Poor**: Low quality, manual review required
- **1 - Very Poor**: Extraction failed, complete manual review needed

### Scoring Factors
- **Text Clarity (30%)**: OCR quality and readability
- **Structure Recognition (30%)**: Question format detection
- **Options Parsing (25%)**: Answer choices extraction
- **Diagram Detection (15%)**: Visual element identification

## 🔍 Validation Rules

### Required Fields
- Question text (non-empty)
- Question type (MCQ, MSQ, NAT, MSM, Diagram)
- Confidence score (1-5)

### Type-Specific Rules
- **MCQ**: 2-5 options required
- **MSQ**: 3+ options required
- **NAT**: No options expected
- **MSM**: 4+ options for matching

### Warnings
- Low confidence scores (<2.5)
- Diagram inconsistencies
- Unusual option counts
- Missing metadata

## 📈 Performance Optimization

### Caching Strategy
```typescript
// Enable caching for repeated extractions
const result = await engine.extractFromPDF(pdfFile, fileName, {
  enableCache: true
})

// Clean up old cache entries
await engine.cleanupCache(24) // 24 hours
```

### Batch Processing
```typescript
const results = []
for (const file of pdfFiles) {
  try {
    const result = await engine.extractFromPDF(file)
    results.push({ success: true, result })
  } catch (error) {
    results.push({ success: false, error: error.message })
  }
}
```

## 🚨 Error Handling

### Common Errors
- **Invalid PDF**: File format validation failed
- **File Too Large**: Exceeds size limit (default 10MB)
- **API Quota**: Gemini API rate limits exceeded
- **Network Error**: Connection issues with Gemini API
- **Storage Full**: IndexedDB storage quota exceeded

### Error Recovery
```typescript
try {
  const result = await engine.extractFromPDF(pdfFile)
} catch (error) {
  if (error.message.includes('API quota')) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 60000))
    return engine.extractFromPDF(pdfFile)
  }
  throw error
}
```

## 🧪 Testing

Run the test suite:
```bash
npm run test -- apps/shared/app/utils/__tests__/aiExtractionUtils.test.ts
```

### Test Coverage
- ✅ Confidence scoring algorithms
- ✅ Question validation rules
- ✅ PDF utility functions
- ✅ Storage validation
- ✅ API key validation
- ✅ Export/import functionality

## 📝 Examples

See `examples/aiExtractionExample.ts` for comprehensive usage examples:
- Basic extraction
- Advanced configuration
- Batch processing
- Error handling
- Storage management
- Export/import

## 🔒 Security Considerations

- **API Key**: Store securely, never commit to version control
- **File Validation**: Always validate PDF files before processing
- **Size Limits**: Enforce reasonable file size limits
- **Rate Limiting**: Respect Gemini API quotas
- **Data Privacy**: Consider data retention policies

## 🛠️ Troubleshooting

### Common Issues

1. **"Invalid PDF file format"**
   - Ensure file is a valid PDF
   - Check file isn't corrupted

2. **"Gemini API request failed"**
   - Verify API key is correct
   - Check internet connection
   - Verify API quota isn't exceeded

3. **"Database not initialized"**
   - Ensure `getAIStorage()` is called before use
   - Check IndexedDB is supported in browser

4. **Low extraction quality**
   - Try different confidence thresholds
   - Enable diagram detection
   - Use higher quality PDF scans

### Debug Mode
```typescript
const engine = aiExtractionUtils.createEngine(apiKey, {
  confidenceThreshold: 1.0, // Accept all extractions
  enableDiagramDetection: true
})
```

## 📚 API Reference

### Main Classes
- `AIExtractionEngine`: Main orchestrator
- `GeminiAPIClient`: Gemini API interface
- `PDFProcessor`: PDF text extraction
- `AIStorageManager`: Data persistence
- `ConfidenceScorer`: Quality assessment
- `QuestionValidator`: Data validation

### Utility Functions
- `aiExtractionUtils.*`: Main utilities
- `confidenceUtils.*`: Confidence helpers
- `pdfUtils.*`: PDF validation
- `aiStorageUtils.*`: Storage helpers

## 🤝 Contributing

When adding new features:
1. Add comprehensive tests
2. Update type definitions
3. Document new functionality
4. Follow existing code patterns
5. Ensure backward compatibility

## 📄 License

This project is licensed under AGPL-3.0-or-later.