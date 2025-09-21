<template>
  <div class="error-fallback p-6 bg-red-50 border border-red-200 rounded-lg text-center">
    <h3 class="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
    <p class="text-red-600 mb-4">A component encountered an error and has been reset.</p>
    <button 
      @click="handleRefresh"
      class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
    >
      Refresh Page
    </button>
  </div>
</template>

<script setup lang="ts">
function handleRefresh() {
  window.location.reload()
}
</script>