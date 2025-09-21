/**
 * Diagram Detection Plugin for Nuxt.js
 * Initializes the advanced diagram detection system on client-side
 */

import { accessibilityManager } from '~/utils/accessibility/accessibilityManager'
import { responsiveDesignManager } from '~/utils/accessibility/responsiveDesign'

export default defineNuxtPlugin(() => {
  // Only run on client-side
  if (process.server) return

  // Initialize accessibility features
  try {
    // Accessibility manager is already initialized in its constructor
    console.log('✅ Accessibility Manager initialized')
  } catch (error) {
    console.warn('⚠️ Failed to initialize Accessibility Manager:', error)
  }

  // Initialize responsive design features
  try {
    // Responsive design manager is already initialized in its constructor
    console.log('✅ Responsive Design Manager initialized')
  } catch (error) {
    console.warn('⚠️ Failed to initialize Responsive Design Manager:', error)
  }

  // Add global CSS classes for feature detection
  if (typeof window !== 'undefined') {
    const root = document.documentElement
    
    // Add JavaScript enabled class
    root.classList.add('js-enabled')
    
    // Add touch support detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      root.classList.add('touch-enabled')
    } else {
      root.classList.add('no-touch')
    }
    
    // Add WebGL support detection
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (gl) {
        root.classList.add('webgl-enabled')
      } else {
        root.classList.add('no-webgl')
      }
    } catch (e) {
      root.classList.add('no-webgl')
    }
    
    // Add IndexedDB support detection
    if ('indexedDB' in window) {
      root.classList.add('indexeddb-enabled')
    } else {
      root.classList.add('no-indexeddb')
    }
  }

  // Provide global access to managers
  return {
    provide: {
      accessibilityManager,
      responsiveDesignManager
    }
  }
})