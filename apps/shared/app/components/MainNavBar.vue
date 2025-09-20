<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="container flex h-14 max-w-screen-2xl items-center">
      <NuxtLink to="/" class="mr-6 flex items-center space-x-2">
        <Icon name="lucide:file-text" class="h-6 w-6" />
        <span class="font-bold">Rankify</span>
      </NuxtLink>
      <nav class="flex items-center gap-6 text-sm font-medium xl:gap-10">
        <NuxtLink
          to="/pdf-cropper"
          class="transition-colors hover:text-foreground/80"
          :class="
            route.path === '/pdf-cropper'
              ? 'text-foreground'
              : 'text-foreground/60'
          "
        >
          PDF Cropper
        </NuxtLink>
        <NuxtLink
          to="/cbt/interface"
          class="transition-colors hover:text-foreground/80"
          :class="
            route.path.startsWith('/cbt')
              ? 'text-foreground'
              : 'text-foreground/60'
          "
        >
          CBT Interface
        </NuxtLink>
      </nav>
      <div class="flex flex-1 items-center justify-end space-x-2">
        <nav class="flex items-center">
          <AppThemeToggle />
          <NuxtLink
            to="https://github.com/TheMoonVyy/rankify"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-4 w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
            title="Rankify's github repo"
          >
            <Icon name="lucide:github" class="w-5 h-5" />
            <span class="sr-only">GitHub</span>
          </NuxtLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { navigationMenuTriggerStyle } from '#layers/shared/app/components/ui/navigation-menu'
import { LocalStorageKeys } from '#layers/shared/shared/enums'

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const projectVersion = useRuntimeConfig().public.projectVersion

const themeVariants = {
  blue: 'hsl(217.2 91.2% 59.8%)',
  slate: 'hsl(215.3 19.3% 34.5%)',
  neutral: 'hsl(0 0% 32.2%)',
}

const colorMode = useColorMode<keyof typeof themeVariants>({
  attribute: 'data-theme-variant',
  modes: Object.fromEntries(Object.keys(themeVariants).map(v => [v, v])),
  storageKey: LocalStorageKeys.AppThemeVariant,
  initialValue: 'blue',
})

const pdfCropperItem = {
  title: 'PDF Cropper',
  href: '/pdf-cropper',
  icon: 'material-symbols:crop-rounded',
}

const cbtItems = [
  {
    title: 'Test Interface',
    href: '/cbt/interface',
    icon: 'line-md:computer',
  },
  {
    title: 'Test Results',
    href: '/cbt/results',
    icon: 'material-symbols:bar-chart-4-bars-rounded',
  },
  {
    title: 'Generate Answer Key',
    href: '/cbt/generate-answer-key',
    icon: 'mdi:script-text-key-outline',
  },
]

const menuItems = [
  pdfCropperItem,
  {
    title: 'CBT',
    icon: 'line-md:computer',
    content: cbtItems,
  },
]
</script>
