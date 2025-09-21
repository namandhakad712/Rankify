/**
 * Dynamic Diagram Renderer
 * 
 * This module provides coordinate-based diagram rendering capabilities,
 * dynamically cropping and displaying diagrams from original page images.
 */

import type { 
  DiagramCoordinates, 
  ImageDimensions,
  ViewportCoordinates,
  CoordinateTransform
} from '~/shared/types/diagram-detection'

export interface DiagramRenderOptions {
  quality?: number // 0.1 to 1.0
  format?: 'png' | 'jpeg' | 'webp'
  backgroundColor?: string
  padding?: number
  maxWidth?: number
  maxHeight?: number
  maintainAspectRatio?: boolean
  enableSmoothing?: boolean
}

export interface RenderedDiagram {
  id: string
  coordinates: DiagramCoordinates
  imageData: string // Base64 data URL
  dimensions: ImageDimensions
  scale: number
  renderTime: number
}

export interface RenderingStats {
  totalDiagrams: number
  successfulRenders: number
  failedRenders: number
  averageRenderTime: number
  totalRenderTime: number
  cacheHits: number
  cacheMisses: number
}

/**
 * Diagram Renderer Class
 * Handles coordinate-based diagram rendering and cropping
 */
export class DiagramRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private renderCache = new Map<string, RenderedDiagram>()
  private stats: RenderingStats = {
    totalDiagrams: 0,
    successfulRenders: 0,
    failedRenders: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  }

  constructor(
    private enableCaching: boolean = true,
    private maxCacheSize: number = 100
  ) {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not get 2D context from canvas')
    }
    this.ctx = context
  }

  /**
   * Render a single diagram from coordinates
   */
  async renderDiagram(
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    options: DiagramRenderOptions = {}
  ): Promise<RenderedDiagram> {
    const startTime = performance.now()
    this.stats.totalDiagrams++

    // Generate cache key
    const cacheKey = this.generateCacheKey(pageImage, coordinates, options)
    
    // Check cache first
    if (this.enableCaching && this.renderCache.has(cacheKey)) {
      this.stats.cacheHits++
      return this.renderCache.get(cacheKey)!
    }

    this.stats.cacheMisses++

    try {
      // Load image if it's a string URL
      const image = typeof pageImage === 'string' ? 
        await this.loadImage(pageImage) : pageImage

      // Validate coordinates
      this.validateCoordinates(coordinates, {
        width: image.naturalWidth,
        height: image.naturalHeight
      })

      // Calculate render dimensions
      const renderDimensions = this.calculateRenderDimensions(coordinates, options)

      // Setup canvas
      this.setupCanvas(renderDimensions, options)

      // Render diagram
      const renderedDiagram = await this.performRender(
        image,
        coordinates,
        renderDimensions,
        options,
        startTime
      )

      // Cache result
      if (this.enableCaching) {
        this.cacheResult(cacheKey, renderedDiagram)
      }

      this.stats.successfulRenders++
      this.updateStats(performance.now() - startTime)

      return renderedDiagram
    } catch (error) {
      this.stats.failedRenders++
      throw new Error(`Failed to render diagram: ${error.message}`)
    }
  }

  /**
   * Render multiple diagrams from the same page
   */
  async renderMultipleDiagrams(
    pageImage: HTMLImageElement | string,
    diagramsData: Array<{ id: string; coordinates: DiagramCoordinates }>,
    options: DiagramRenderOptions = {}
  ): Promise<RenderedDiagram[]> {
    const results: RenderedDiagram[] = []
    
    // Load image once for all diagrams
    const image = typeof pageImage === 'string' ? 
      await this.loadImage(pageImage) : pageImage

    // Render each diagram
    for (const diagramData of diagramsData) {
      try {
        const rendered = await this.renderDiagram(image, diagramData.coordinates, options)
        rendered.id = diagramData.id
        results.push(rendered)
      } catch (error) {
        console.warn(`Failed to render diagram ${diagramData.id}:`, error)
      }
    }

    return results
  }

  /**
   * Create responsive diagram that scales with container
   */
  createResponsiveDiagram(
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    containerWidth: number,
    containerHeight: number,
    options: DiagramRenderOptions = {}
  ): Promise<RenderedDiagram> {
    // Calculate scale to fit container
    const diagramWidth = coordinates.x2 - coordinates.x1
    const diagramHeight = coordinates.y2 - coordinates.y1
    
    const scaleX = containerWidth / diagramWidth
    const scaleY = containerHeight / diagramHeight
    const scale = Math.min(scaleX, scaleY)

    const responsiveOptions: DiagramRenderOptions = {
      ...options,
      maxWidth: Math.floor(diagramWidth * scale),
      maxHeight: Math.floor(diagramHeight * scale),
      maintainAspectRatio: true
    }

    return this.renderDiagram(pageImage, coordinates, responsiveOptions)
  }

  /**
   * Create diagram overlay for preview purposes
   */
  createOverlay(
    coordinates: DiagramCoordinates,
    containerDimensions: ImageDimensions,
    transform?: CoordinateTransform
  ): HTMLDivElement {
    const overlay = document.createElement('div')
    
    // Apply transform if provided
    let displayCoords = coordinates
    if (transform) {
      displayCoords = this.transformCoordinates(coordinates, transform)
    }

    // Calculate position and size
    const left = (displayCoords.x1 / containerDimensions.width) * 100
    const top = (displayCoords.y1 / containerDimensions.height) * 100
    const width = ((displayCoords.x2 - displayCoords.x1) / containerDimensions.width) * 100
    const height = ((displayCoords.y2 - displayCoords.y1) / containerDimensions.height) * 100

    // Style overlay
    overlay.style.cssText = `
      position: absolute;
      left: ${left}%;
      top: ${top}%;
      width: ${width}%;
      height: ${height}%;
      border: 2px solid #007bff;
      border-radius: 4px;
      background: rgba(0, 123, 255, 0.1);
      pointer-events: none;
      z-index: 10;
    `

    overlay.className = 'diagram-overlay'
    overlay.setAttribute('data-diagram-type', coordinates.type)
    overlay.setAttribute('data-confidence', coordinates.confidence.toString())

    return overlay
  }

  /**
   * Get rendering statistics
   */
  getStats(): RenderingStats {
    return { ...this.stats }
  }

  /**
   * Clear render cache
   */
  clearCache(): void {
    this.renderCache.clear()
    this.stats.cacheHits = 0
    this.stats.cacheMisses = 0
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalDiagrams: 0,
      successfulRenders: 0,
      failedRenders: 0,
      averageRenderTime: 0,
      totalRenderTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  }

  // Private helper methods

  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      img.src = src
    })
  }

  private validateCoordinates(coordinates: DiagramCoordinates, imageDimensions: ImageDimensions): void {
    if (coordinates.x1 < 0 || coordinates.y1 < 0) {
      throw new Error('Coordinates cannot be negative')
    }
    
    if (coordinates.x2 > imageDimensions.width || coordinates.y2 > imageDimensions.height) {
      throw new Error('Coordinates exceed image dimensions')
    }
    
    if (coordinates.x2 <= coordinates.x1 || coordinates.y2 <= coordinates.y1) {
      throw new Error('Invalid coordinate order')
    }
  }

  private calculateRenderDimensions(
    coordinates: DiagramCoordinates,
    options: DiagramRenderOptions
  ): ImageDimensions {
    let width = coordinates.x2 - coordinates.x1
    let height = coordinates.y2 - coordinates.y1

    // Apply padding
    if (options.padding) {
      width += options.padding * 2
      height += options.padding * 2
    }

    // Apply max dimensions
    if (options.maxWidth && width > options.maxWidth) {
      if (options.maintainAspectRatio) {
        const scale = options.maxWidth / width
        width = options.maxWidth
        height = height * scale
      } else {
        width = options.maxWidth
      }
    }

    if (options.maxHeight && height > options.maxHeight) {
      if (options.maintainAspectRatio) {
        const scale = options.maxHeight / height
        height = options.maxHeight
        width = width * scale
      } else {
        height = options.maxHeight
      }
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  private setupCanvas(dimensions: ImageDimensions, options: DiagramRenderOptions): void {
    this.canvas.width = dimensions.width
    this.canvas.height = dimensions.height

    // Configure context
    this.ctx.imageSmoothingEnabled = options.enableSmoothing !== false
    this.ctx.imageSmoothingQuality = 'high'

    // Clear canvas
    this.ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Fill background if specified
    if (options.backgroundColor) {
      this.ctx.fillStyle = options.backgroundColor
      this.ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    }
  }

  private async performRender(
    image: HTMLImageElement,
    coordinates: DiagramCoordinates,
    renderDimensions: ImageDimensions,
    options: DiagramRenderOptions,
    startTime: number
  ): Promise<RenderedDiagram> {
    // Calculate source coordinates (with padding if specified)
    const padding = options.padding || 0
    const sourceX = Math.max(0, coordinates.x1 - padding)
    const sourceY = Math.max(0, coordinates.y1 - padding)
    const sourceWidth = Math.min(
      image.naturalWidth - sourceX,
      (coordinates.x2 - coordinates.x1) + (padding * 2)
    )
    const sourceHeight = Math.min(
      image.naturalHeight - sourceY,
      (coordinates.y2 - coordinates.y1) + (padding * 2)
    )

    // Draw cropped image to canvas
    this.ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, renderDimensions.width, renderDimensions.height
    )

    // Generate image data
    const format = options.format || 'png'
    const quality = options.quality || 0.9
    const imageData = this.canvas.toDataURL(`image/${format}`, quality)

    // Calculate scale
    const originalWidth = coordinates.x2 - coordinates.x1
    const scale = renderDimensions.width / originalWidth

    return {
      id: '', // Will be set by caller
      coordinates,
      imageData,
      dimensions: renderDimensions,
      scale,
      renderTime: performance.now() - startTime
    }
  }

  private generateCacheKey(
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    options: DiagramRenderOptions
  ): string {
    const imageSrc = typeof pageImage === 'string' ? pageImage : pageImage.src
    const coordsKey = `${coordinates.x1},${coordinates.y1},${coordinates.x2},${coordinates.y2}`
    const optionsKey = JSON.stringify(options)
    
    return `${imageSrc}:${coordsKey}:${optionsKey}`
  }

  private cacheResult(key: string, result: RenderedDiagram): void {
    // Implement LRU cache behavior
    if (this.renderCache.size >= this.maxCacheSize) {
      const firstKey = this.renderCache.keys().next().value
      this.renderCache.delete(firstKey)
    }
    
    this.renderCache.set(key, result)
  }

  private transformCoordinates(
    coordinates: DiagramCoordinates,
    transform: CoordinateTransform
  ): DiagramCoordinates {
    return {
      ...coordinates,
      x1: (coordinates.x1 * transform.scaleX) + transform.offsetX,
      y1: (coordinates.y1 * transform.scaleY) + transform.offsetY,
      x2: (coordinates.x2 * transform.scaleX) + transform.offsetX,
      y2: (coordinates.y2 * transform.scaleY) + transform.offsetY
    }
  }

  private updateStats(renderTime: number): void {
    this.stats.totalRenderTime += renderTime
    this.stats.averageRenderTime = this.stats.totalRenderTime / this.stats.successfulRenders
  }
}

/**
 * Batch Diagram Renderer
 * Optimized for rendering multiple diagrams efficiently
 */
export class BatchDiagramRenderer extends DiagramRenderer {
  private batchQueue: Array<{
    pageImage: HTMLImageElement | string
    coordinates: DiagramCoordinates
    options: DiagramRenderOptions
    resolve: (result: RenderedDiagram) => void
    reject: (error: Error) => void
  }> = []

  private isProcessing = false
  private batchSize = 5
  private batchDelay = 100 // ms

  /**
   * Add diagram to batch queue
   */
  async queueDiagram(
    pageImage: HTMLImageElement | string,
    coordinates: DiagramCoordinates,
    options: DiagramRenderOptions = {}
  ): Promise<RenderedDiagram> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        pageImage,
        coordinates,
        options,
        resolve,
        reject
      })

      this.processBatchQueue()
    })
  }

  /**
   * Process batch queue
   */
  private async processBatchQueue(): Promise<void> {
    if (this.isProcessing || this.batchQueue.length === 0) return

    this.isProcessing = true

    while (this.batchQueue.length > 0) {
      const batch = this.batchQueue.splice(0, this.batchSize)
      
      // Group by page image for efficiency
      const groupedBatch = this.groupByPageImage(batch)

      // Process each group
      for (const [pageImage, items] of groupedBatch) {
        try {
          const image = typeof pageImage === 'string' ? 
            await this.loadImage(pageImage) : pageImage

          // Process items in parallel
          const promises = items.map(async item => {
            try {
              const result = await this.renderDiagram(image, item.coordinates, item.options)
              item.resolve(result)
            } catch (error) {
              item.reject(error)
            }
          })

          await Promise.all(promises)
        } catch (error) {
          // Reject all items in this group
          items.forEach(item => item.reject(error))
        }
      }

      // Small delay between batches to prevent blocking
      if (this.batchQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay))
      }
    }

    this.isProcessing = false
  }

  private groupByPageImage(
    batch: Array<{
      pageImage: HTMLImageElement | string
      coordinates: DiagramCoordinates
      options: DiagramRenderOptions
      resolve: (result: RenderedDiagram) => void
      reject: (error: Error) => void
    }>
  ): Map<HTMLImageElement | string, typeof batch> {
    const groups = new Map()

    batch.forEach(item => {
      const key = typeof item.pageImage === 'string' ? item.pageImage : item.pageImage.src
      if (!groups.has(key)) {
        groups.set(item.pageImage, [])
      }
      groups.get(key).push(item)
    })

    return groups
  }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      img.src = src
    })
  }
}

/**
 * Factory functions
 */
export function createDiagramRenderer(
  enableCaching: boolean = true,
  maxCacheSize: number = 100
): DiagramRenderer {
  return new DiagramRenderer(enableCaching, maxCacheSize)
}

export function createBatchDiagramRenderer(
  enableCaching: boolean = true,
  maxCacheSize: number = 100
): BatchDiagramRenderer {
  return new BatchDiagramRenderer(enableCaching, maxCacheSize)
}

export default DiagramRenderer