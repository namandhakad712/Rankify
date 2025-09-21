/**
 * Advanced PDF Processor with Diagram Detection
 * 
 * This class extends the existing PDF processing capabilities with coordinate-based
 * diagram detection using Google Gemini API.
 */

import type { 
  EnhancedQuestion, 
  DiagramCoordinates, 
  GeminiDiagramResponse,
  ProcessingStats,
  DiagramDetectionError
} from '~/shared/types/diagram-detection'
import type { CropperQuestionData } from '~/shared/types/pdf-cropper'

export class AdvancedPDFProcessor {
  private geminiDetector: GeminiDiagramDetector | null = null;
  private processingStats: ProcessingStats = {
    totalQuestions: 0,
    questionsWithDiagrams: 0,
    averageConfidence: 0,
    processingTime: 0,
    apiCalls: 0,
    errors: 0
  };

  constructor(geminiApiKey?: string) {
    if (geminiApiKey) {
      this.geminiDetector = new GeminiDiagramDetector(geminiApiKey);
    }
  }

  /**
   * Process PDF with enhanced diagram detection capabilities
   */
  async processWithDiagramDetection(pdfFile: File): Promise<EnhancedQuestion[]> {
    const startTime = performance.now();
    
    try {
      // Convert PDF to images (using existing MuPDF integration)
      const pageImages = await this.convertPdfToImages(pdfFile);
      
      // Process each page for diagram detection
      const enhancedQuestions: EnhancedQuestion[] = [];
      
      for (let pageNum = 0; pageNum < pageImages.length; pageNum++) {
        const pageImage = pageImages[pageNum];
        
        // Detect diagrams using Gemini API
        const diagramResponse = await this.detectDiagramsOnPage(pageImage, pageNum + 1);
        
        // Convert to enhanced questions
        const pageQuestions = this.convertToEnhancedQuestions(diagramResponse, pageNum + 1);
        enhancedQuestions.push(...pageQuestions);
      }
      
      // Update processing stats
      this.updateProcessingStats(enhancedQuestions, performance.now() - startTime);
      
      return enhancedQuestions;
    } catch (error) {
      this.processingStats.errors++;
      throw new DiagramDetectionError({
        type: 'PROCESSING_ERROR',
        message: `Failed to process PDF with diagram detection: ${error.message}`,
        originalError: error,
        timestamp: new Date()
      });
    }
  }

  /**
   * Enhance existing questions with diagram detection
   */
  async enhanceExistingQuestions(questions: CropperQuestionData[]): Promise<EnhancedQuestion[]> {
    const enhancedQuestions: EnhancedQuestion[] = [];
    
    for (const question of questions) {
      const enhanced = await this.enhanceSingleQuestion(question);
      enhancedQuestions.push(enhanced);
    }
    
    return enhancedQuestions;
  }

  /**
   * Detect diagrams on a single page
   */
  async detectDiagramCoordinates(pageImage: ImageData): Promise<DiagramCoordinates[]> {
    if (!this.geminiDetector) {
      throw new Error('Gemini detector not initialized. Please provide API key.');
    }
    
    try {
      const response = await this.geminiDetector.detectDiagrams(pageImage);
      this.processingStats.apiCalls++;
      
      return response.diagrams.map(d => d.coordinates);
    } catch (error) {
      this.processingStats.errors++;
      throw error;
    }
  }

  /**
   * Get current processing statistics
   */
  getProcessingStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Reset processing statistics
   */
  resetProcessingStats(): void {
    this.processingStats = {
      totalQuestions: 0,
      questionsWithDiagrams: 0,
      averageConfidence: 0,
      processingTime: 0,
      apiCalls: 0,
      errors: 0
    };
  }

  // Private helper methods
  private async convertPdfToImages(pdfFile: File): Promise<ImageData[]> {
    // Implementation will use existing MuPDF integration
    // This is a placeholder for the actual implementation
    throw new Error('PDF to image conversion not implemented yet');
  }

  private async detectDiagramsOnPage(pageImage: ImageData, pageNumber: number): Promise<GeminiDiagramResponse> {
    if (!this.geminiDetector) {
      return { diagrams: [], questions: [] };
    }
    
    return await this.geminiDetector.detectDiagrams(pageImage);
  }

  private convertToEnhancedQuestions(response: GeminiDiagramResponse, pageNumber: number): EnhancedQuestion[] {
    return response.questions.map((question, index) => ({
      ...question,
      id: `page_${pageNumber}_q_${index + 1}`,
      pageNumber,
      diagrams: response.diagrams.map(d => d.coordinates),
      hasDiagram: response.diagrams.length > 0,
      pdfData: [] // Will be populated from existing cropping data if available
    }));
  }

  private async enhanceSingleQuestion(question: CropperQuestionData): Promise<EnhancedQuestion> {
    // Convert existing question to enhanced format
    const enhanced: EnhancedQuestion = {
      ...question,
      id: `enhanced_${question.que}`,
      text: '', // Will be extracted from PDF or provided by user
      hasDiagram: false,
      diagrams: [],
      pageNumber: question.pdfData[0]?.page || 1,
      confidence: 1.0 // Default confidence for manually created questions
    };

    // Try to detect diagrams if Gemini is available
    if (this.geminiDetector && question.pdfData.length > 0) {
      try {
        // Get page image for the question's coordinates
        const pageImage = await this.getPageImageForCoordinates(question.pdfData[0]);
        const diagrams = await this.detectDiagramCoordinates(pageImage);
        
        enhanced.diagrams = diagrams;
        enhanced.hasDiagram = diagrams.length > 0;
        enhanced.confidence = diagrams.length > 0 ? 
          diagrams.reduce((sum, d) => sum + d.confidence, 0) / diagrams.length : 1.0;
      } catch (error) {
        console.warn('Failed to detect diagrams for existing question:', error);
      }
    }

    return enhanced;
  }

  private async getPageImageForCoordinates(coords: PdfCropperCoords): Promise<ImageData> {
    // Implementation will extract image data from the specified page and coordinates
    // This is a placeholder for the actual implementation
    throw new Error('Page image extraction not implemented yet');
  }

  private updateProcessingStats(questions: EnhancedQuestion[], processingTime: number): void {
    this.processingStats.totalQuestions = questions.length;
    this.processingStats.questionsWithDiagrams = questions.filter(q => q.hasDiagram).length;
    this.processingStats.processingTime = processingTime;
    
    const confidenceSum = questions.reduce((sum, q) => sum + q.confidence, 0);
    this.processingStats.averageConfidence = questions.length > 0 ? 
      confidenceSum / questions.length : 0;
  }
}

/**
 * Gemini Diagram Detector Class
 * Handles communication with Google Gemini API for diagram detection
 */
export class GeminiDiagramDetector {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Detect diagrams in the provided image using Gemini API
   */
  async detectDiagrams(pageImage: ImageData): Promise<GeminiDiagramResponse> {
    const prompt = this.createEnhancedPrompt();
    const base64Image = this.imageDataToBase64(pageImage);

    const request: GeminiDiagramRequest = {
      image: base64Image,
      prompt,
      model: 'gemini-1.5-pro'
    };

    try {
      const response = await this.callGeminiAPI(request);
      return this.parseGeminiResponse(response);
    } catch (error) {
      throw new DiagramDetectionError({
        type: 'API_ERROR',
        message: `Gemini API call failed: ${error.message}`,
        originalError: error,
        timestamp: new Date()
      });
    }
  }

  /**
   * Create enhanced prompt for diagram detection with coordinates
   */
  private createEnhancedPrompt(): string {
    return `
You are an expert at analyzing educational PDF documents and detecting diagrams with precise coordinates.

Analyze this page image and:

1. Identify all questions and their text content
2. For each question, detect if it contains any diagrams, charts, graphs, or visual elements
3. For detected diagrams, provide exact bounding box coordinates in pixels

For DIAGRAM DETECTION, look for:
- Mathematical graphs, charts, or plots
- Scientific diagrams (biology, chemistry, physics)
- Flowcharts, process diagrams, or decision trees
- Geometric figures or technical drawings
- Tables, charts, or data visualizations
- Maps, circuit diagrams, or schematics

Return a JSON response with this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "text": "Question text here",
      "type": "MCQ|MSQ|NAT|Diagram",
      "options": ["A) option1", "B) option2", ...] (if applicable),
      "hasDiagram": true/false,
      "confidence": 0.0-1.0
    }
  ],
  "diagrams": [
    {
      "coordinates": {
        "x1": 150,
        "y1": 300, 
        "x2": 450,
        "y2": 600,
        "confidence": 0.95,
        "type": "graph|flowchart|scientific|geometric|table|circuit|map|other",
        "description": "Brief description of the diagram"
      },
      "description": "Detailed description",
      "confidence": 0.95,
      "type": "graph"
    }
  ]
}

IMPORTANT: 
- Coordinates must be in pixels relative to the image
- x1,y1 is top-left corner, x2,y2 is bottom-right corner
- Ensure x2 > x1 and y2 > y1
- Confidence should reflect detection accuracy (0.0-1.0)
- Only include diagrams that are clearly visible and relevant to questions
`;
  }

  private imageDataToBase64(imageData: ImageData): string {
    // Convert ImageData to base64 string
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx!.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  }

  private async callGeminiAPI(request: GeminiDiagramRequest): Promise<any> {
    const url = `${this.baseUrl}/${request.model}:generateContent?key=${this.apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: request.prompt },
          {
            inline_data: {
              mime_type: 'image/png',
              data: request.image
            }
          }
        ]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private parseGeminiResponse(response: any): GeminiDiagramResponse {
    try {
      const content = response.candidates[0].content.parts[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize the response
      return {
        questions: parsed.questions || [],
        diagrams: parsed.diagrams || []
      };
    } catch (error) {
      throw new Error(`Failed to parse Gemini response: ${error.message}`);
    }
  }
}