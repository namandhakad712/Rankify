<template>
  <div class="bg-red-50 border border-red-200 rounded-lg p-6" data-testid="pdf-error">
    <div class="flex items-center gap-3 mb-4">
      <Icon name="lucide:alert-circle" class="h-6 w-6 text-red-600" />
      <h3 class="text-lg font-semibold text-red-800">PDF Processing Error</h3>
    </div>
    
    <div class="space-y-4">
      <p class="text-red-700">{{ errorMessage }}</p>
      
      <!-- Troubleshooting steps -->
      <div class="bg-red-100 rounded-lg p-4">
        <h4 class="font-medium text-red-800 mb-2">Troubleshooting Steps:</h4>
        <ul class="text-sm text-red-700 space-y-1 list-disc list-inside">
          <li v-if="isWasmError">Try refreshing the page and uploading again</li>
          <li v-if="isWasmError">Use Chrome or Firefox browser for better compatibility</li>
          <li v-if="isWasmError">Disable browser extensions that might block WebAssembly</li>
          <li>Try a smaller PDF file (under 10MB)</li>
          <li>Ensure the PDF is not password-protected</li>
          <li>Check your internet connection</li>
          <li v-if="isApiError">Verify your Google Gemini API key is correct</li>
        </ul>
      </div>
      
      <!-- Action buttons -->
      <div class="flex flex-wrap gap-3">
        <button
          @click="$emit('retry')"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          data-testid="retry-button"
        >
          <Icon name="lucide:refresh-cw" class="h-4 w-4 inline mr-2" />
          Try Again
        </button>
        
        <button
          @click="$emit('manual-input')"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Icon name="lucide:edit" class="h-4 w-4 inline mr-2" />
          Manual Input
        </button>
        
        <a
          href="https://github.com/your-repo/issues"
          target="_blank"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Icon name="lucide:bug" class="h-4 w-4 inline mr-2" />
          Report Issue
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  errorMessage: string
}

const props = defineProps<Props>()

defineEmits<{
  retry: []
  'manual-input': []
}>()

// Determine error type for better troubleshooting
const isWasmError = computed(() => {
  return props.errorMessage.toLowerCase().includes('wasm') || 
         props.errorMessage.toLowerCase().includes('webassembly') ||
         props.errorMessage.toLowerCase().includes('browser security')
})

const isApiError = computed(() => {
  return props.errorMessage.toLowerCase().includes('api key') ||
         props.errorMessage.toLowerCase().includes('unauthorized')
})
</script>