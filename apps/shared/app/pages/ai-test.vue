<template>
  <div class="min-h-screen bg-background p-8">
    <h1 class="text-4xl font-bold mb-4">AI Extractor Test Page</h1>
    <p class="text-xl mb-4">If you can see this, routing is working!</p>
    
    <div class="space-y-4">
      <div class="p-4 bg-green-100 dark:bg-green-900 rounded">
        <p class="font-semibold">✅ Page loaded successfully</p>
      </div>
      
      <div class="p-4 bg-blue-100 dark:bg-blue-900 rounded">
        <p class="font-semibold">Feature Flags Status:</p>
        <pre class="mt-2 text-sm">{{ flagsStatus }}</pre>
      </div>
      
      <NuxtLink 
        to="/" 
        class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Back to Home
      </NuxtLink>
      
      <NuxtLink 
        to="/ai-extractor" 
        class="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 ml-4"
      >
        Try AI Extractor
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getFeatureFlags } from '#layers/shared/app/composables/useFeatureFlags'

definePageMeta({
  layout: false
})

const featureFlags = getFeatureFlags()

const flagsStatus = {
  aiExtraction: featureFlags.aiExtractionEnabled.value,
  reviewInterface: featureFlags.reviewInterfaceEnabled.value,
  allEnabled: featureFlags.getEnabledFlags()
}

console.log('Test page loaded with flags:', flagsStatus)
</script>
