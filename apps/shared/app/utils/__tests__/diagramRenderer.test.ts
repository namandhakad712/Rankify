/**
 * Unit Tests for Diagram Renderer
 * 
 * Tests all diagram rendering functionality including single/multiple rendering,
 * caching, responsive rendering, and performance optimization.
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  DiagramRenderer,
  BatchDiagramRenderer,
  createDiagramRenderer,
  createBatchDiagramRenderer,
  type DiagramRenderOptions,
  type RenderedDiagram
} from '../diagramRenderer'
import type { DiagramCoordinates, ImageDimensions } from '~/shared/types/diagram-detection'

// Mock HTML elements
class MockHTMLImageElement {
  src = ''
  naturalWidth = 800
  naturalHeight = 600
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(src?: string) {
    if (src) this.src = src
    // Simulate async loading
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 10)
  }
}

class MockHTMLCanvasElement {
  width = 0
  height = 0
  private mockContext: MockCanvasRenderingContext2D

  constructor() {
    this.mockContext = new MockCanvasRenderingContext2D()
  }

  getContext(type: string) {
    return type === '2d' ? this.mockContext : null
  }

  toDataURL(format?: string, quality?: number) {
    return `data:image/${format || 'png'};base64,mockImageData`
  }
}

class MockCanvasRenderingContext2D {
  imageSmoothingEnabled = true
  imageSmoothingQuality = 'high'
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 0
  canvas = new MockHTMLCanvasElement()

  clearRect = vi.fn()
  fillRect = vi.fn()
  strokeRect = vi.fn()
  drawImage = vi.fn()
}

// Mock DOM
global.HTMLImageElement = MockHTMLImageElement as any
global.HTMLCanvasElement = MockHTMLCanvasElement as any
global.document = {
  createElement: (tagName: string) => {
    if (tagName === 'canvas') return new MockHTMLCanvasElement()
    if (tagName === 'div') return { style: {}, className: '', setAttribute: vi.fn() }
    return {}
  }
} as any

describe('DiagramRenderer', () => {
  let renderer: DiagramRenderer
  let mockImage: MockHTMLImageElement
  let testCoordinates: DiagramCoordinates

  beforeEach(() => {
    renderer = new DiagramRenderer(true, 10) // Enable caching, max 10 items
    mockImage = new MockHTMLImageElement('test-image.png')
    testCoordinates = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test graph'
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Single Diagram Rendering', () => {
    test('should render diagram with default options', async () => {
      const result = await renderer.renderDiagram(mockImage, testCoordinates)

      expect(result).toBeDefined()
      expect(result.coordinates).toEqual(testCoordinates)
      expect(result.imageData).toContain('data:image/png;base64')
      expect(result.dimensions.width).toBeGreaterThan(0)
      expect(result.dimensions.height).toBeGreaterThan(0)
      expect(result.scale).toBeGreaterThan(0)
      expect(result.renderTime).toBeGreaterThan(0)
    })

    test('should render diagram with custom options', async () => {
      const options: DiagramRenderOptions = {
        quality: 0.8,
        format: 'jpeg',
        backgroundColor: '#ffffff',
        padding: 10,
        maxWidth: 200,
        maxHeight: 150,
        maintainAspectRatio: true
      }

      const result = await renderer.renderDiagram(mockImage, testCoordinates, options)

      expect(result.imageData).toContain('data:image/jpeg;base64')
      expect(result.dimensions.width).toBeLessThanOrEqual(200)
      expect(result.dimensions.height).toBeLessThanOrEqual(150)
    })

    test('should handle string image URLs', async () => {
      const imageUrl = 'https://example.com/test-image.png'
      
      const result = await renderer.renderDiagram(imageUrl, testCoordinates)

      expect(result).toBeDefined()
      expect(result.coordinates).toEqual(testCoordinates)
    })

    test('should validate coordinates', async () => {
      const invalidCoordinates: DiagramCoordinates = {
        ...testCoordinates,
        x1: -10, // Invalid negative coordinate
        y1: -5
      }

      await expect(
        renderer.renderDiagram(mockImage, invalidCoordinates)
      ).rejects.toThrow('Coordinates cannot be negative')
    })

    test('should validate coordinate bounds', async () => {
      const outOfBoundsCoordinates: DiagramCoordinates = {
        ...testCoordinates,
        x2: 1000, // Exceeds image width
        y2: 800   // Exceeds image height
      }

      await expect(
        renderer.renderDiagram(mockImage, outOfBoundsCoordinates)
      ).rejects.toThrow('Coordinates exceed image dimensions')
    })

    test('should validate coordinate order', async () => {
      const invalidOrderCoordinates: DiagramCoordinates = {
        ...testCoordinates,
        x2: 50, // Less than x1
        y2: 100 // Less than y1
      }

      await expect(
        renderer.renderDiagram(mockImage, invalidOrderCoordinates)
      ).rejects.toThrow('Invalid coordinate order')
    })
  })

  describe('Multiple Diagram Rendering', () => {
    test('should render multiple diagrams from same page', async () => {
      const diagramsData = [
        { id: 'diagram1', coordinates: testCoordinates },
        { id: 'diagram2', coordinates: { ...testCoordinates, x1: 400, x2: 600 } },
        { id: 'diagram3', coordinates: { ...testCoordinates, y1: 300, y2: 400 } }
      ]

      const results = await renderer.renderMultipleDiagrams(mockImage, diagramsData)

      expect(results).toHaveLength(3)
      expect(results[0].id).toBe('diagram1')
      expect(results[1].id).toBe('diagram2')
      expect(results[2].id).toBe('diagram3')

      results.forEach(result => {
        expect(result.imageData).toContain('data:image/png;base64')
        expect(result.dimensions.width).toBeGreaterThan(0)
        expect(result.dimensions.height).toBeGreaterThan(0)
      })
    })

    test('should handle empty diagrams array', async () => {
      const results = await renderer.renderMultipleDiagrams(mockImage, [])

      expect(results).toHaveLength(0)
    })

    test('should continue rendering even if one diagram fails', async () => {
      const diagramsData = [
        { id: 'valid1', coordinates: testCoordinates },
        { id: 'invalid', coordinates: { ...testCoordinates, x1: -10 } }, // Invalid
        { id: 'valid2', coordinates: { ...testCoordinates, x1: 400, x2: 600 } }
      ]

      const results = await renderer.renderMultipleDiagrams(mockImage, diagramsData)

      // Should have 2 valid results (invalid one should be skipped)
      expect(results.length).toBeLessThanOrEqual(3)
      expect(results.some(r => r.id === 'valid1')).toBe(true)
      expect(results.some(r => r.id === 'valid2')).toBe(true)
    })
  })

  describe('Responsive Rendering', () => {
    test('should create responsive diagram that fits container', async () => {
      const containerWidth = 400
      const containerHeight = 300

      const result = await renderer.createResponsiveDiagram(
        mockImage,
        testCoordinates,
        containerWidth,
        containerHeight
      )

      expect(result.dimensions.width).toBeLessThanOrEqual(containerWidth)
      expect(result.dimensions.height).toBeLessThanOrEqual(containerHeight)
    })

    test('should maintain aspect ratio in responsive mode', async () => {
      const containerWidth = 200
      const containerHeight = 200

      const result = await renderer.createResponsiveDiagram(
        mockImage,
        testCoordinates,
        containerWidth,
        containerHeight,
        { maintainAspectRatio: true }
      )

      const originalAspectRatio = (testCoordinates.x2 - testCoordinates.x1) / 
                                 (testCoordinates.y2 - testCoordinates.y1)
      const resultAspectRatio = result.dimensions.width / result.dimensions.height

      expect(Math.abs(resultAspectRatio - originalAspectRatio)).toBeLessThan(0.1)
    })
  })

  describe('Caching', () => {
    test('should cache rendered diagrams', async () => {
      // First render
      const result1 = await renderer.renderDiagram(mockImage, testCoordinates)
      
      // Second render with same parameters should use cache
      const result2 = await renderer.renderDiagram(mockImage, testCoordinates)

      expect(result1.imageData).toBe(result2.imageData)
      
      const stats = renderer.getStats()
      expect(stats.cacheHits).toBeGreaterThan(0)
    })

    test('should not cache when caching is disabled', async () => {
      const noCacheRenderer = new DiagramRenderer(false)
      
      await noCacheRenderer.renderDiagram(mockImage, testCoordinates)
      await noCacheRenderer.renderDiagram(mockImage, testCoordinates)

      const stats = noCacheRenderer.getStats()
      expect(stats.cacheHits).toBe(0)
    })

    test('should clear cache', async () => {
      await renderer.renderDiagram(mockImage, testCoordinates)
      
      let stats = renderer.getStats()
      expect(stats.cacheMisses).toBeGreaterThan(0)

      renderer.clearCache()
      
      // Render again should be cache miss
      await renderer.renderDiagram(mockImage, testCoordinates)
      
      stats = renderer.getStats()
      expect(stats.cacheMisses).toBeGreaterThan(1)
    })

    test('should respect max cache size', async () => {
      const smallCacheRenderer = new DiagramRenderer(true, 2) // Max 2 items
      
      // Render 3 different diagrams
      await smallCacheRenderer.renderDiagram(mockImage, testCoordinates)
      await smallCacheRenderer.renderDiagram(mockImage, { ...testCoordinates, x1: 200 })
      await smallCacheRenderer.renderDiagram(mockImage, { ...testCoordinates, x1: 300 })

      // Cache should only have 2 items (LRU eviction)
      const stats = smallCacheRenderer.getStats()
      expect(stats.cacheMisses).toBe(3) // All were misses initially
    })
  })

  describe('Overlay Creation', () => {
    test('should create overlay element', () => {
      const containerDimensions: ImageDimensions = { width: 800, height: 600 }
      
      const overlay = renderer.createOverlay(testCoordinates, containerDimensions)

      expect(overlay).toBeDefined()
      expect(overlay.className).toBe('diagram-overlay')
      expect(overlay.style.position).toBe('absolute')
      expect(overlay.getAttribute('data-diagram-type')).toBe(testCoordinates.type)
      expect(overlay.getAttribute('data-confidence')).toBe(testCoordinates.confidence.toString())
    })

    test('should calculate correct overlay position', () => {
      const containerDimensions: ImageDimensions = { width: 800, height: 600 }
      
      const overlay = renderer.createOverlay(testCoordinates, containerDimensions)

      // Calculate expected percentages
      const expectedLeft = (testCoordinates.x1 / containerDimensions.width) * 100
      const expectedTop = (testCoordinates.y1 / containerDimensions.height) * 100
      const expectedWidth = ((testCoordinates.x2 - testCoordinates.x1) / containerDimensions.width) * 100
      const expectedHeight = ((testCoordinates.y2 - testCoordinates.y1) / containerDimensions.height) * 100

      expect(overlay.style.left).toBe(`${expectedLeft}%`)
      expect(overlay.style.top).toBe(`${expectedTop}%`)
      expect(overlay.style.width).toBe(`${expectedWidth}%`)
      expect(overlay.style.height).toBe(`${expectedHeight}%`)
    })
  })

  describe('Statistics', () => {
    test('should track rendering statistics', async () => {
      await renderer.renderDiagram(mockImage, testCoordinates)
      await renderer.renderDiagram(mockImage, { ...testCoordinates, x1: 200 })

      const stats = renderer.getStats()

      expect(stats.totalDiagrams).toBe(2)
      expect(stats.successfulRenders).toBe(2)
      expect(stats.failedRenders).toBe(0)
      expect(stats.averageRenderTime).toBeGreaterThan(0)
      expect(stats.totalRenderTime).toBeGreaterThan(0)
    })

    test('should track failed renders', async () => {
      try {
        await renderer.renderDiagram(mockImage, { ...testCoordinates, x1: -10 })
      } catch {
        // Expected to fail
      }

      const stats = renderer.getStats()

      expect(stats.totalDiagrams).toBe(1)
      expect(stats.failedRenders).toBe(1)
      expect(stats.successfulRenders).toBe(0)
    })

    test('should reset statistics', async () => {
      await renderer.renderDiagram(mockImage, testCoordinates)
      
      let stats = renderer.getStats()
      expect(stats.totalDiagrams).toBe(1)

      renderer.resetStats()
      
      stats = renderer.getStats()
      expect(stats.totalDiagrams).toBe(0)
      expect(stats.successfulRenders).toBe(0)
      expect(stats.failedRenders).toBe(0)
      expect(stats.averageRenderTime).toBe(0)
      expect(stats.totalRenderTime).toBe(0)
    })
  })
})

describe('BatchDiagramRenderer', () => {
  let batchRenderer: BatchDiagramRenderer
  let mockImage: MockHTMLImageElement
  let testCoordinates: DiagramCoordinates

  beforeEach(() => {
    batchRenderer = new BatchDiagramRenderer(true, 10)
    mockImage = new MockHTMLImageElement('test-image.png')
    testCoordinates = {
      x1: 100,
      y1: 150,
      x2: 300,
      y2: 250,
      confidence: 0.9,
      type: 'graph',
      description: 'Test graph'
    }
  })

  describe('Batch Processing', () => {
    test('should queue and process diagrams in batches', async () => {
      const promises = [
        batchRenderer.queueDiagram(mockImage, testCoordinates),
        batchRenderer.queueDiagram(mockImage, { ...testCoordinates, x1: 200 }),
        batchRenderer.queueDiagram(mockImage, { ...testCoordinates, x1: 300 })
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.imageData).toContain('data:image/png;base64')
      })
    })

    test('should group diagrams by page image for efficiency', async () => {
      const image1 = new MockHTMLImageElement('image1.png')
      const image2 = new MockHTMLImageElement('image2.png')

      const promises = [
        batchRenderer.queueDiagram(image1, testCoordinates),
        batchRenderer.queueDiagram(image2, testCoordinates),
        batchRenderer.queueDiagram(image1, { ...testCoordinates, x1: 200 })
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      // All should render successfully despite being from different images
      results.forEach(result => {
        expect(result.imageData).toContain('data:image/png;base64')
      })
    })
  })
})

describe('Factory Functions', () => {
  test('should create diagram renderer with default options', () => {
    const renderer = createDiagramRenderer()
    
    expect(renderer).toBeInstanceOf(DiagramRenderer)
  })

  test('should create diagram renderer with custom options', () => {
    const renderer = createDiagramRenderer(false, 50)
    
    expect(renderer).toBeInstanceOf(DiagramRenderer)
  })

  test('should create batch diagram renderer', () => {
    const renderer = createBatchDiagramRenderer()
    
    expect(renderer).toBeInstanceOf(BatchDiagramRenderer)
  })

  test('should create batch diagram renderer with custom options', () => {
    const renderer = createBatchDiagramRenderer(true, 25)
    
    expect(renderer).toBeInstanceOf(BatchDiagramRenderer)
  })
})

describe('Integration Tests', () => {
  test('should handle complete rendering workflow', async () => {
    const renderer = createDiagramRenderer(true, 100)
    const mockImage = new MockHTMLImageElement('workflow-test.png')
    
    // Test single rendering
    const singleResult = await renderer.renderDiagram(mockImage, testCoordinates)
    expect(singleResult).toBeDefined()

    // Test multiple rendering
    const multipleData = [
      { id: 'diagram1', coordinates: testCoordinates },
      { id: 'diagram2', coordinates: { ...testCoordinates, x1: 400, x2: 600 } }
    ]
    const multipleResults = await renderer.renderMultipleDiagrams(mockImage, multipleData)
    expect(multipleResults).toHaveLength(2)

    // Test responsive rendering
    const responsiveResult = await renderer.createResponsiveDiagram(
      mockImage,
      testCoordinates,
      300,
      200
    )
    expect(responsiveResult.dimensions.width).toBeLessThanOrEqual(300)
    expect(responsiveResult.dimensions.height).toBeLessThanOrEqual(200)

    // Test overlay creation
    const overlay = renderer.createOverlay(testCoordinates, { width: 800, height: 600 })
    expect(overlay.className).toBe('diagram-overlay')

    // Test statistics
    const stats = renderer.getStats()
    expect(stats.totalDiagrams).toBeGreaterThan(0)
    expect(stats.successfulRenders).toBeGreaterThan(0)
  })

  test('should handle error scenarios gracefully', async () => {
    const renderer = createDiagramRenderer()
    const mockImage = new MockHTMLImageElement('error-test.png')

    // Test invalid coordinates
    const invalidCoords: DiagramCoordinates = {
      ...testCoordinates,
      x1: -10,
      y1: -5
    }

    await expect(
      renderer.renderDiagram(mockImage, invalidCoords)
    ).rejects.toThrow()

    // Statistics should reflect the error
    const stats = renderer.getStats()
    expect(stats.failedRenders).toBeGreaterThan(0)
  })
})