/**
 * PDF.js plugin for client-side PDF processing fallback
 */

export default defineNuxtPlugin({
  name: 'pdfjs',
  async setup() {
    // Only load on client side
    if (process.server) return

    try {
      // Load PDF.js from CDN as fallback
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'
      script.async = true
      
      const loadPromise = new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
        setTimeout(reject, 10000) // 10 second timeout
      })
      
      document.head.appendChild(script)
      await loadPromise
      
      // Configure PDF.js worker
      if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
      }
      
      console.log('PDF.js loaded successfully as fallback')
    } catch (error) {
      console.warn('Failed to load PDF.js fallback:', error)
      // Continue without PDF.js - the fallback processor will handle this
    }
  }
})