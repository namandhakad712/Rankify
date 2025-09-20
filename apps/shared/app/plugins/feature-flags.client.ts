/**
 * Feature Flags Plugin
 * Initializes feature flags on the client side
 */

import { initializeFeatureFlags } from '#layers/shared/app/composables/useFeatureFlags'

export default defineNuxtPlugin(async () => {
  // Initialize feature flags with environment-specific configuration
  const config = useRuntimeConfig()
  
  const featureFlags = initializeFeatureFlags({
    environment: process.env.NODE_ENV || 'development',
    version: config.public.projectVersion || '1.0.0',
    userId: generateUserId() // Generate or retrieve user ID for rollout
  })
  
  // Log enabled features in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Enabled AI features:', featureFlags.getEnabledFlags())
  }
  
  // Make feature flags available globally
  return {
    provide: {
      featureFlags
    }
  }
})

/**
 * Generate or retrieve user ID for feature rollout
 */
function generateUserId(): string {
  if (typeof window === 'undefined') return 'server'
  
  let userId = localStorage.getItem('rankify_user_id')
  
  if (!userId) {
    // Generate a simple user ID based on browser fingerprint
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('Rankify', 0, 0)
    const fingerprint = canvas.toDataURL()
    
    userId = btoa(fingerprint).slice(0, 16)
    localStorage.setItem('rankify_user_id', userId)
  }
  
  return userId
}