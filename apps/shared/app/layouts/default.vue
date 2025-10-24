<template>
  <div
    id="main-layout"
    class="max-h-dvh min-h-dvh w-full flex flex-col"
  >
    <!-- Only show MainNavBar on non-homepage routes -->
    <MainNavBar v-if="!isHomePage" />
    <slot />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

// Check if current route is homepage
const isHomePage = computed(() => route.path === '/')
</script>
