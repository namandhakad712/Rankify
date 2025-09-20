/**
 * AI Features Middleware
 * Controls access to AI-powered features based on feature flags
 */

import { getFeatureFlags } from '#layers/shared/app/composables/useFeatureFlags'

export default defineNuxtRouteMiddleware((to) => {
  const featureFlags = getFeatureFlags()
  
  // Check AI extraction routes
  if (to.path === '/ai-extractor') {
    if (!featureFlags.isEnabled('ai_extraction')) {
      console.warn('AI extraction feature is disabled')
      throw createError({
        statusCode: 404,
        statusMessage: 'AI extraction feature is not available'
      })
    }
  }
  
  // Check review interface routes
  if (to.path === '/review-interface') {
    if (!featureFlags.isEnabled('review_interface')) {
      console.warn('Review interface feature is disabled')
      throw createError({
        statusCode: 404,
        statusMessage: 'Review interface feature is not available'
      })
    }
  }
  
  // Check batch processing routes (if they exist)
  if (to.path.includes('/batch-processing')) {
    if (!featureFlags.isEnabled('batch_processing')) {
      console.warn('Batch processing feature is disabled')
      throw createError({
        statusCode: 404,
        statusMessage: 'Batch processing feature is not available'
      })
    }
  }
  
  // Check migration tool routes (if they exist)
  if (to.path.includes('/migration')) {
    if (!featureFlags.isEnabled('migration_tool')) {
      console.warn('Migration tool feature is disabled')
      throw createError({
        statusCode: 404,
        statusMessage: 'Migration tool feature is not available'
      })
    }
  }
})