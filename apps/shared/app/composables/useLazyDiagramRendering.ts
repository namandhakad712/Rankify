/**
 * Lazy Diagram Rendering Composable
 * 
 * Provides lazy loading functionality for diagram rendering using Intersection Observer.
 * Only renders diagrams when they become visible in the viewport, improving performance
 * for pages with many diagrams.
 * 
 * Features:
 * - Automatic rendering when canvas enters viewport
 * - Caching of rendered diagrams
 * - Memory management with cache clearing
 * - Configurable intersection thresholds
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { renderDiagramFromPDF } from '#layers/shared/app/utils/diagramCoordinateUtils'
import type { DiagramCoordinates } from '#layers/shared/app/types/diagram'

interface DiagramCache {
  dataUrl: string
  timestamp: number
}

// Global cache for rendered diagrams
const diagramCache = new Map<string, DiagramCache>()
const MAX_CACHE_SIZE = 50 // Maximum number of cached diagrams
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate cache key for a diagram
 */
function getCacheKey(diagram: DiagramCoordinates, scale: number): string {
  return `${diagram.questionId}_${diagram.pageNumber}_${diagram.boundingBox.x}_${diagram.boundingBox.y}_${scale}`
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now()
  for (const [key, value] of diagramCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY_MS) {
      diagramCache.delete(key)
    }
  }
}

/**
 * Limit cache size by removing oldest entries
 */
function limitCacheSize() {
  if (diagramCache.size > MAX_CACHE_SIZE) {
    // Sort by timestamp and remove oldest
    const entries = Array.from(diagramCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    const toRemove = entries.slice(0, diagramCache.size - MAX_CACHE_SIZE)
    toRemove.forEach(([key]) => diagramCache.delete(key))
  }
}

/**
 * Composable for lazy diagram rendering
 */
export function useLazyDiagramRendering(
  pdfBuffer: ArrayBuffer,
  diagram: DiagramCoordinates,
  scale: number = 2,
  options: {
    rootMargin?: string
    threshold?: number
  } = {}
) {
  const canvas = ref<HTMLCanvasElement>()
  const isRendered = ref(false)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  
  let observer: IntersectionObserver | null = null
  
  /**
   * Render diagram to canvas
   */
  const renderDiagram = async () => {
    if (!canvas.value || isRendered.value || isLoading.value) return
    
    try {
      isLoading.value = true
      error.value = null
      
      // Check cache first
      const cacheKey = getCacheKey(diagram, scale)
      const cached = diagramCache.get(cacheKey)
      
      let dataUrl: string
      
      if (cached) {
        // Use cached version
        dataUrl = cached.dataUrl
        console.log(`📦 Using cached diagram: ${diagram.label || 'Diagram'}`)
      } else {
        // Render from PDF
        console.log(`🎨 Rendering diagram: ${diagram.label || 'Diagram'}`)
        dataUrl = await renderDiagramFromPDF(pdfBuffer, diagram, scale)
        
        // Cache the result
        diagramCache.set(cacheKey, {
          dataUrl,
          timestamp: Date.now()
        })
        
        // Manage cache size
        limitCacheSize()
      }
      
      // Draw to canvas
      const img = new Image()
      img.onload = () => {
        const ctx = canvas.value!.getContext('2d')!
        canvas.value!.width = img.width
        canvas.value!.height = img.height
        ctx.drawImage(img, 0, 0)
        
        isRendered.value = true
        isLoading.value = false
      }
      
      img.onerror = () => {
        error.value = new Error('Failed to load diagram image')
        isLoading.value = false
      }
      
      img.src = dataUrl
      
    } catch (err) {
      error.value = err as Error
      isLoading.value = false
      console.error('Error rendering diagram:', err)
    }
  }
  
  /**
   * Setup intersection observer
   */
  const setupObserver = () => {
    if (!canvas.value) return
    
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && !isRendered.value) {
            // Canvas is visible, render diagram
            await renderDiagram()
            
            // Unobserve after rendering
            if (observer && canvas.value) {
              observer.unobserve(canvas.value)
            }
          }
        })
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1
      }
    )
    
    observer.observe(canvas.value)
  }
  
  /**
   * Cleanup observer
   */
  const cleanup = () => {
    if (observer && canvas.value) {
      observer.unobserve(canvas.value)
      observer.disconnect()
      observer = null
    }
  }
  
  onMounted(() => {
    setupObserver()
  })
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    canvas,
    isRendered,
    isLoading,
    error,
    renderDiagram, // Expose for manual rendering
    setupObserver
  }
}

/**
 * Clear all cached diagrams
 */
export function clearDiagramCache() {
  diagramCache.clear()
  console.log('🗑️ Diagram cache cleared')
}

/**
 * Get cache statistics
 */
export function getDiagramCacheStats() {
  clearExpiredCache()
  
  return {
    size: diagramCache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(diagramCache.keys())
  }
}

/**
 * Preload diagrams for a list of coordinates
 * Useful for preloading diagrams for upcoming questions
 */
export async function preloadDiagrams(
  pdfBuffer: ArrayBuffer,
  diagrams: DiagramCoordinates[],
  scale: number = 2
): Promise<void> {
  console.log(`⏳ Preloading ${diagrams.length} diagrams...`)
  
  const promises = diagrams.map(async (diagram) => {
    const cacheKey = getCacheKey(diagram, scale)
    
    // Skip if already cached
    if (diagramCache.has(cacheKey)) {
      return
    }
    
    try {
      const dataUrl = await renderDiagramFromPDF(pdfBuffer, diagram, scale)
      diagramCache.set(cacheKey, {
        dataUrl,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error(`Failed to preload diagram ${diagram.label}:`, error)
    }
  })
  
  await Promise.all(promises)
  limitCacheSize()
  
  console.log(`✅ Preloaded ${diagrams.length} diagrams`)
}
