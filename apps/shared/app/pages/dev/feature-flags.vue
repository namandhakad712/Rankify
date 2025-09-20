<template>
  <div>
    <Head>
      <Title>Feature Flags - Development - Rankify</Title>
      <Meta name="description" content="Manage AI feature flags and rollout configuration" />
    </Head>
    
    <FeatureFlagManager />
  </div>
</template>

<script setup lang="ts">
// Development page for managing feature flags
definePageMeta({
  title: 'Feature Flags',
  description: 'Manage AI feature flags and rollout configuration',
  layout: 'default'
})

// Only allow access in development environment
if (process.env.NODE_ENV === 'production') {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}
</script>