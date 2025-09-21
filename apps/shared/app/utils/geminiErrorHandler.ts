/**
 * Gemini API Error Handler
 * 
 * This module provides comprehensive error handling for Google Gemini API
 * interactions, including fallback mechanisms and retry logic.
 */

import type { 
  GeminiAPIError, 
  DiagramCoordinates, 
  DiagramDetectionError,
  GeminiDiagramRequest 
} from '~/shared/types/diagram-detection'

export class GeminiErrorHandler {
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second
  private fallbackEnabled = true;

  constructor(options?: {
    retryAttempts?: number;
    retryDelay?: number;
    fallbackEnabled?: boolean;
  }) {
    if (options) {
      this.retryAttempts = options.retryAttempts ?? this.retryAttempts;
      this.retryDelay = options.retryDelay ?? this.retryDelay;
      this.fallbackEnabled = options.fallbackEnabled ?? this.fallbackEnabled;
    }
  }

  /**
   * Handle API errors with appropriate fallback strategies
   */
  async handleAPIError(error: GeminiAPIError): Promise<DiagramCoordinates[]> {
    console.warn('Gemini API Error:', error);

    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        return await this.handleQuotaExceeded(error);
      
      case 'INVALID_IMAGE':
        return await this.handleInvalidImage(error);
      
      case 'NETWORK_ERROR':
        return await this.handleNetworkError(error);
      
      default:
        return await this.handleUnknownError(error);
    }
  }

  /**
   * Handle quota exceeded errors
   */
  private async handleQuotaExceeded(error: GeminiAPIError): Promise<DiagramCoordinates[]> {
    if (this.fallbackEnabled) {
      console.log('API quota exceeded, falling back to local detection');
      return await this.fallbackToLocalDetection(error.image);
    }
    
    throw new DiagramDetectionError({
      type: 'API_ERROR',
      message: 'Gemini API quota exceeded and no fallback available',
      originalError: new Error(error.message),
      timestamp: new Date()
    });
  }

  /**
   * Handle invalid image errors
   */
  private async handleInvalidImage(error: GeminiAPIError): Promise<DiagramCoordinates[]> {
    if (error.image) {
      console.log('Invalid image format, attempting preprocessing');
      const preprocessedImage = await this.preprocessImage(error.image);
      
      if (preprocessedImage && error.request) {
        return await this.retryWithPreprocessedImage({
          ...error.request,
          image: preprocessedImage
        });
      }
    }
    
    return [];
  }

  /**
   * Handle network errors with retry logic
   */
  private async handleNetworkError(error: GeminiAPIError): Promise<DiagramCoordinates[]> {
    if (error.request) {
      console.log('Network error, queuing for retry');
      return await this.queueForRetry(error.request);
    }
    
    return [];
  }

  /**
   * Handle unknown errors
   */
  private async handleUnknownError(error: GeminiAPIError): Promise<DiagramCoordinates[]> {
    console.error('Unknown Gemini API error:', error);
    
    if (this.fallbackEnabled && error.image) {
      return await this.fallbackToLocalDetection(error.image);
    }
    
    return [];
  }

  /**
   * Fallback to local diagram detection when API is unavailable
   */
  private async fallbackToLocalDetection(imageData?: string): Promise<DiagramCoordinates[]> {
    if (!imageData) {
      return [];
    }

    try {
      // Implement basic local diagram detection
      // This is a simplified fallback that looks for common diagram patterns
      const localDetector = new LocalDiagramDetector();
      return await localDetector.detectDiagrams(imageData);
    } catch (error) {
      console.warn('Local diagram detection failed:', error);
      return [];
    }
  }

  /**
   * Preprocess image to fix common format issues
   */
  private async preprocessImage(imageData: string): Promise<string | null> {
    try {
      // Convert image to a standard format
      const img = new Image();
      img.src = `data:image/png;base64,${imageData}`;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Create canvas and redraw image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(img, 0, 0);
      
      // Convert back to base64
      return canvas.toDataURL('image/png').split(',')[1];
    } catch (error) {
      console.warn('Image preprocessing failed:', error);
      return null;
    }
  }

  /**
   * Retry API request with exponential backoff
   */
  private async queueForRetry(request: GeminiDiagramRequest): Promise<DiagramCoordinates[]> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`Retry attempt ${attempt}/${this.retryAttempts}`);
        
        // Wait with exponential backoff
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
        
        // Attempt to recreate the API call
        // This would need to be implemented with the actual Gemini client
        // For now, we'll return empty array
        console.log('Retry logic not fully implemented');
        return [];
        
      } catch (error) {
        console.warn(`Retry attempt ${attempt} failed:`, error);
        
        if (attempt === this.retryAttempts) {
          // Last attempt failed, try fallback
          if (this.fallbackEnabled) {
            return await this.fallbackToLocalDetection(request.image);
          }
          throw error;
        }
      }
    }
    
    return [];
  }

  /**
   * Retry with preprocessed image
   */
  private async retryWithPreprocessedImage(request: GeminiDiagramRequest): Promise<DiagramCoordinates[]> {
    try {
      // This would need to be implemented with the actual Gemini client
      console.log('Retrying with preprocessed image');
      return [];
    } catch (error) {
      console.warn('Retry with preprocessed image failed:', error);
      return [];
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Local Diagram Detector
 * 
 * Provides basic diagram detection capabilities when Gemini API is unavailable
 */
class LocalDiagramDetector {
  /**
   * Basic local diagram detection using image analysis
   */
  async detectDiagrams(imageData: string): Promise<DiagramCoordinates[]> {
    try {
      // Load image
      const img = await this.loadImage(imageData);
      
      // Create canvas for analysis
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];
      
      ctx.drawImage(img, 0, 0);
      
      // Get image data for analysis
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Perform basic diagram detection
      return this.analyzeImageForDiagrams(imgData);
      
    } catch (error) {
      console.warn('Local diagram detection failed:', error);
      return [];
    }
  }

  /**
   * Load image from base64 data
   */
  private loadImage(imageData: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `data:image/png;base64,${imageData}`;
    });
  }

  /**
   * Analyze image data for potential diagrams
   */
  private analyzeImageForDiagrams(imageData: ImageData): DiagramCoordinates[] {
    const diagrams: DiagramCoordinates[] = [];
    
    // Simple edge detection to find potential diagram boundaries
    const edges = this.detectEdges(imageData);
    const regions = this.findRegions(edges);
    
    // Convert regions to diagram coordinates
    for (const region of regions) {
      if (this.isLikelyDiagram(region, imageData)) {
        diagrams.push({
          x1: region.x,
          y1: region.y,
          x2: region.x + region.width,
          y2: region.y + region.height,
          confidence: 0.5, // Lower confidence for local detection
          type: 'other',
          description: 'Detected by local analysis'
        });
      }
    }
    
    return diagrams;
  }

  /**
   * Simple edge detection algorithm
   */
  private detectEdges(imageData: ImageData): boolean[][] {
    const { width, height, data } = imageData;
    const edges: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
    
    // Simple Sobel edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Convert to grayscale
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Calculate gradients
        const gx = this.getGradientX(data, x, y, width);
        const gy = this.getGradientY(data, x, y, width);
        
        // Edge magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        
        edges[y][x] = magnitude > 50; // Threshold for edge detection
      }
    }
    
    return edges;
  }

  /**
   * Calculate horizontal gradient
   */
  private getGradientX(data: Uint8ClampedArray, x: number, y: number, width: number): number {
    const getGray = (px: number, py: number) => {
      const idx = (py * width + px) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };
    
    return getGray(x + 1, y) - getGray(x - 1, y);
  }

  /**
   * Calculate vertical gradient
   */
  private getGradientY(data: Uint8ClampedArray, x: number, y: number, width: number): number {
    const getGray = (px: number, py: number) => {
      const idx = (py * width + px) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };
    
    return getGray(x, y + 1) - getGray(x, y - 1);
  }

  /**
   * Find connected regions in edge map
   */
  private findRegions(edges: boolean[][]): Array<{x: number, y: number, width: number, height: number}> {
    const regions: Array<{x: number, y: number, width: number, height: number}> = [];
    const visited: boolean[][] = Array(edges.length).fill(null).map(() => Array(edges[0].length).fill(false));
    
    for (let y = 0; y < edges.length; y++) {
      for (let x = 0; x < edges[0].length; x++) {
        if (edges[y][x] && !visited[y][x]) {
          const region = this.floodFill(edges, visited, x, y);
          if (region.width > 20 && region.height > 20) { // Minimum size filter
            regions.push(region);
          }
        }
      }
    }
    
    return regions;
  }

  /**
   * Flood fill algorithm to find connected regions
   */
  private floodFill(
    edges: boolean[][], 
    visited: boolean[][], 
    startX: number, 
    startY: number
  ): {x: number, y: number, width: number, height: number} {
    const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    
    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      
      if (x < 0 || x >= edges[0].length || y < 0 || y >= edges.length || 
          visited[y][x] || !edges[y][x]) {
        continue;
      }
      
      visited[y][x] = true;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Add neighbors
      stack.push({x: x + 1, y}, {x: x - 1, y}, {x, y: y + 1}, {x, y: y - 1});
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }

  /**
   * Determine if a region is likely to be a diagram
   */
  private isLikelyDiagram(
    region: {x: number, y: number, width: number, height: number}, 
    imageData: ImageData
  ): boolean {
    // Simple heuristics for diagram detection
    const aspectRatio = region.width / region.height;
    const area = region.width * region.height;
    const imageArea = imageData.width * imageData.height;
    const areaRatio = area / imageArea;
    
    // Diagrams typically have reasonable aspect ratios and take up a significant portion of the image
    return aspectRatio > 0.3 && aspectRatio < 3.0 && areaRatio > 0.05 && areaRatio < 0.8;
  }
}

export default GeminiErrorHandler;