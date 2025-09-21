/**
 * Global Middleware for Diagram Detection
 * Ensures proper initialization and configuration
 */

export default defineNuxtRouteMiddleware((to) => {
  // Only run on client-side
  if (process.server) return

  // Check for required browser features
  if (typeof window !== 'undefined') {
    const missingFeatures: string[] = []

    // Check IndexedDB support
    if (!('indexedDB' in window)) {
      missingFeatures.push('IndexedDB')
    }

    // Check Canvas support
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        missingFeatures.push('Canvas 2D')
      }
    } catch (e) {
      missingFeatures.push('Canvas 2D')
    }

    // Check File API support
    if (!('File' in window) || !('FileReader' in window)) {
      missingFeatures.push('File API')
    }

    // Check Fetch API support
    if (!('fetch' in window)) {
      missingFeatures.push('Fetch API')
    }

    // If critical features are missing, show warning
    if (missingFeatures.length > 0) {
      console.warn('⚠️ Missing browser features for diagram detection:', missingFeatures)
      
      // You could redirect to a compatibility page or show a warning
      // For now, we'll just log the warning
    }

    // Initialize global error handling for diagram detection
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('diagram') || 
          event.reason?.message?.includes('coordinate')) {
        console.error('🔴 Unhandled diagram detection error:', event.reason)
        
        // You could send this to an error reporting service
        // or show a user-friendly error message
      }
    })

    // Add performance monitoring
    if ('performance' in window && 'mark' in window.performance) {
      window.performance.mark('diagram-detection-middleware-start')
    }
  }

  // Check if we're on a diagram detection related route
  const diagramRoutes = [
    '/pdf-processing',
    '/manual-review',
    '/test-configuration',
    '/diagram-editor'
  ]

  const isDiagramRoute = diagramRoutes.some(route => 
    to.path.startsWith(route)
  )

  if (isDiagramRoute) {
    // Ensure Gemini API key is configured for diagram detection routes
    const runtimeConfig = useRuntimeConfig()
    
    if (!runtimeConfig.public.geminiApiKey && process.client) {
      // Check localStorage for API key
      const storedApiKey = localStorage.getItem('gemini-api-key')
      
      if (!storedApiKey) {
        console.warn('⚠️ Gemini API key not configured for diagram detection')
        
        // You could redirect to a configuration page
        // return navigateTo('/configure-api-key')
      }
    }
  }
})