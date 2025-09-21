/**
 * Fallback Diagram Detector
 * 
 * This module provides local diagram detection capabilities when the Gemini API
 * is unavailable, using client-side image analysis techniques.
 */

import type { 
  DiagramCoordinates,
  DiagramType,
  ImageDimensions
} from '~/shared/types/diagram-detection'

export interface FallbackDetectionOptions {
  edgeThreshold?: number
  minRegionSize?: number
  maxRegions?: number
  confidenceMultiplier?: number
}

export class FallbackDiagramDetector {
  private options: Required<FallbackDetectionOptions>

  constructor(options: FallbackDetectionOptions = {}) {
    this.options = {
      edgeThreshold: 50,
      minRegionSize: 400, // Minimum area in pixels
      maxRegions: 5,
      confidenceMultiplier: 0.6, // Lower confidence for fallback detection
      ...options
    }
  }

  /**
   * Detect diagrams using local image analysis
   */
  async detectDiagrams(imageData: string): Promise<DiagramCoordinates[]> {
    try {
      const img = await this.loadImageFromBase64(imageData)
      const canvas = this.createCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')!
      
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      return this.analyzeImageForDiagrams(imgData)
    } catch (error) {
      console.warn('Fallback diagram detection failed:', error)
      return []
    }
  }

  /**
   * Analyze image data for potential diagrams
   */
  private analyzeImageForDiagrams(imageData: ImageData): DiagramCoordinates[] {
    const diagrams: DiagramCoordinates[] = []
    
    // Step 1: Edge detection
    const edges = this.detectEdges(imageData)
    
    // Step 2: Find connected regions
    const regions = this.findConnectedRegions(edges)
    
    // Step 3: Filter and classify regions
    const validRegions = this.filterValidRegions(regions, imageData)
    
    // Step 4: Convert to diagram coordinates
    for (const region of validRegions.slice(0, this.options.maxRegions)) {
      const coordinates = this.regionToCoordinates(region, imageData)
      if (coordinates) {
        diagrams.push(coordinates)
      }
    }
    
    return diagrams
  }

  /**
   * Simple edge detection using Sobel operator
   */
  private detectEdges(imageData: ImageData): boolean[][] {
    const { width, height, data } = imageData
    const edges: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false))
    
    // Sobel kernels
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0
        
        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
            
            gx += gray * sobelX[ky + 1][kx + 1]
            gy += gray * sobelY[ky + 1][kx + 1]
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        edges[y][x] = magnitude > this.options.edgeThreshold
      }
    }
    
    return edges
  }

  /**
   * Find connected regions using flood fill
   */
  private findConnectedRegions(edges: boolean[][]): Array<{
    x: number
    y: number
    width: number
    height: number
    area: number
  }> {
    const height = edges.length
    const width = edges[0].length
    const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false))
    const regions: Array<{x: number, y: number, width: number, height: number, area: number}> = []
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y][x] && !visited[y][x]) {
          const region = this.floodFill(edges, visited, x, y)
          if (region.area >= this.options.minRegionSize) {
            regions.push(region)
          }
        }
      }
    }
    
    return regions.sort((a, b) => b.area - a.area) // Sort by area, largest first
  }

  /**
   * Flood fill algorithm to find connected edge pixels
   */
  private floodFill(
    edges: boolean[][],
    visited: boolean[][],
    startX: number,
    startY: number
  ): {x: number, y: number, width: number, height: number, area: number} {
    const height = edges.length
    const width = edges[0].length
    const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}]
    
    let minX = startX, maxX = startX, minY = startY, maxY = startY
    let area = 0
    
    while (stack.length > 0) {
      const {x, y} = stack.pop()!
      
      if (x < 0 || x >= width || y < 0 || y >= height || 
          visited[y][x] || !edges[y][x]) {
        continue
      }
      
      visited[y][x] = true
      area++
      
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      
      // Add 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx !== 0 || dy !== 0) {
            stack.push({x: x + dx, y: y + dy})
          }
        }
      }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      area
    }
  }

  /**
   * Filter regions to identify likely diagrams
   */
  private filterValidRegions(
    regions: Array<{x: number, y: number, width: number, height: number, area: number}>,
    imageData: ImageData
  ): Array<{x: number, y: number, width: number, height: number, area: number}> {
    const imageArea = imageData.width * imageData.height
    
    return regions.filter(region => {
      // Filter by aspect ratio (diagrams usually have reasonable proportions)
      const aspectRatio = region.width / region.height
      if (aspectRatio < 0.2 || aspectRatio > 5.0) return false
      
      // Filter by relative size (diagrams should be significant but not too large)
      const relativeArea = region.area / imageArea
      if (relativeArea < 0.01 || relativeArea > 0.8) return false
      
      // Filter by absolute size
      if (region.width < 50 || region.height < 50) return false
      if (region.width > imageData.width * 0.9 || region.height > imageData.height * 0.9) return false
      
      return true
    })
  }

  /**
   * Convert region to diagram coordinates
   */
  private regionToCoordinates(
    region: {x: number, y: number, width: number, height: number, area: number},
    imageData: ImageData
  ): DiagramCoordinates | null {
    // Add some padding around the detected region
    const padding = 10
    const x1 = Math.max(0, region.x - padding)
    const y1 = Math.max(0, region.y - padding)
    const x2 = Math.min(imageData.width, region.x + region.width + padding)
    const y2 = Math.min(imageData.height, region.y + region.height + padding)
    
    // Determine diagram type based on region characteristics
    const type = this.classifyDiagramType(region, imageData)
    
    // Calculate confidence based on region properties
    const confidence = this.calculateConfidence(region, imageData)
    
    return {
      x1,
      y1,
      x2,
      y2,
      confidence,
      type,
      description: `Fallback detected ${type} (${region.width}x${region.height})`
    }
  }

  /**
   * Classify diagram type based on region characteristics
   */
  private classifyDiagramType(
    region: {x: number, y: number, width: number, height: number, area: number},
    imageData: ImageData
  ): DiagramType {
    const aspectRatio = region.width / region.height
    
    // Simple heuristics for diagram classification
    if (aspectRatio > 2.0) {
      return 'table' // Wide regions might be tables
    } else if (aspectRatio < 0.5) {
      return 'flowchart' // Tall regions might be flowcharts
    } else if (aspectRatio > 1.2 && aspectRatio < 1.8) {
      return 'graph' // Square-ish regions might be graphs
    } else {
      return 'other' // Default classification
    }
  }

  /**
   * Calculate confidence score for detected region
   */
  private calculateConfidence(
    region: {x: number, y: number, width: number, height: number, area: number},
    imageData: ImageData
  ): number {
    let confidence = 0.3 // Base confidence for fallback detection
    
    // Boost confidence for well-proportioned regions
    const aspectRatio = region.width / region.height
    if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
      confidence += 0.2
    }
    
    // Boost confidence for appropriately sized regions
    const imageArea = imageData.width * imageData.height
    const relativeArea = region.area / imageArea
    if (relativeArea >= 0.05 && relativeArea <= 0.4) {
      confidence += 0.2
    }
    
    // Boost confidence for regions with good edge density
    const edgeDensity = region.area / (region.width * region.height)
    if (edgeDensity >= 0.1) {
      confidence += 0.1
    }
    
    return Math.min(1.0, confidence * this.options.confidenceMultiplier)
  }

  /**
   * Load image from base64 data
   */
  private loadImageFromBase64(base64Data: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = `data:image/png;base64,${base64Data}`
    })
  }

  /**
   * Create canvas element
   */
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  /**
   * Detect text regions (potential diagram labels)
   */
  private detectTextRegions(imageData: ImageData): Array<{x: number, y: number, width: number, height: number}> {
    // Simple text detection based on horizontal line patterns
    const { width, height, data } = imageData
    const textRegions: Array<{x: number, y: number, width: number, height: number}> = []
    
    // Look for horizontal patterns that might indicate text
    for (let y = 0; y < height - 20; y += 5) {
      let lineStart = -1
      let lineLength = 0
      
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        if (gray < 128) { // Dark pixel (potential text)
          if (lineStart === -1) lineStart = x
          lineLength = x - lineStart + 1
        } else {
          if (lineLength > 50) { // Potential text line
            textRegions.push({
              x: lineStart,
              y: y - 5,
              width: lineLength,
              height: 15
            })
          }
          lineStart = -1
          lineLength = 0
        }
      }
    }
    
    return textRegions
  }

  /**
   * Enhance detection with text region analysis
   */
  async detectDiagramsWithTextAnalysis(imageData: string): Promise<DiagramCoordinates[]> {
    try {
      const img = await this.loadImageFromBase64(imageData)
      const canvas = this.createCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')!
      
      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Get basic diagram regions
      const diagrams = this.analyzeImageForDiagrams(imgData)
      
      // Detect text regions
      const textRegions = this.detectTextRegions(imgData)
      
      // Enhance diagrams with text information
      return this.enhanceDiagramsWithText(diagrams, textRegions)
    } catch (error) {
      console.warn('Enhanced fallback detection failed:', error)
      return this.detectDiagrams(imageData)
    }
  }

  /**
   * Enhance diagram detection with text region information
   */
  private enhanceDiagramsWithText(
    diagrams: DiagramCoordinates[],
    textRegions: Array<{x: number, y: number, width: number, height: number}>
  ): DiagramCoordinates[] {
    return diagrams.map(diagram => {
      // Check if there are text regions near this diagram
      const nearbyText = textRegions.filter(text => 
        this.isNearby(diagram, text, 50) // Within 50 pixels
      )
      
      // Boost confidence if there's nearby text (likely labels)
      if (nearbyText.length > 0) {
        diagram.confidence = Math.min(1.0, diagram.confidence + 0.1)
        diagram.description += ` (with ${nearbyText.length} text labels)`
      }
      
      return diagram
    })
  }

  /**
   * Check if text region is nearby a diagram
   */
  private isNearby(
    diagram: DiagramCoordinates,
    textRegion: {x: number, y: number, width: number, height: number},
    threshold: number
  ): boolean {
    const diagramCenterX = (diagram.x1 + diagram.x2) / 2
    const diagramCenterY = (diagram.y1 + diagram.y2) / 2
    const textCenterX = textRegion.x + textRegion.width / 2
    const textCenterY = textRegion.y + textRegion.height / 2
    
    const distance = Math.sqrt(
      Math.pow(diagramCenterX - textCenterX, 2) + 
      Math.pow(diagramCenterY - textCenterY, 2)
    )
    
    return distance <= threshold
  }
}

export default FallbackDiagramDetector