<template>
  <button @click="toggleDark()" class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground" title="Toggle theme">
    <ClientOnly>
      <Icon name="lucide:sun" v-if="!isDark" class="w-5 h-5" />
      <Icon name="lucide:moon" v-else class="w-5 h-5" />
      <template #fallback>
        <Icon name="lucide:sun" class="w-5 h-5" />
      </template>
    </ClientOnly>
    <span class="sr-only">Toggle theme</span>
  </button>
</template>

<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>