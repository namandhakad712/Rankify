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
        <!-- AI-Powered PDF Extraction (Feature Flag Controlled) -->
        <div v-if="aiExtractionEnabled" class="relative group">
          <button
            class="flex items-center gap-1 transition-colors hover:text-foreground/80"
            :class="
              route.path.startsWith('/ai-') || route.path === '/review-interface'
                ? 'text-foreground'
                : 'text-foreground/60'
            "
          >
            <Icon name="lucide:sparkles" class="h-4 w-4" />
            AI Extraction
            <Icon name="lucide:chevron-down" class="h-3 w-3" />
          </button>
          
          <!-- Dropdown Menu -->
          <div class="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div class="p-1">
              <NuxtLink
                to="/ai-extractor"
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                :class="route.path === '/ai-extractor' ? 'bg-accent text-accent-foreground' : ''"
              >
                <Icon name="lucide:file-plus" class="h-4 w-4" />
                <div>
                  <div class="font-medium">AI Extractor</div>
                  <div class="text-xs text-muted-foreground">Extract questions from PDF</div>
                </div>
              </NuxtLink>
              
              <NuxtLink
                v-if="reviewInterfaceEnabled"
                to="/review-interface"
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                :class="route.path === '/review-interface' ? 'bg-accent text-accent-foreground' : ''"
              >
                <Icon name="lucide:edit-3" class="h-4 w-4" />
                <div>
                  <div class="font-medium">Review Interface</div>
                  <div class="text-xs text-muted-foreground">Edit AI-extracted questions</div>
                </div>
              </NuxtLink>
              
              <div class="h-px bg-border my-1"></div>
              
              <div class="px-3 py-2">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="lucide:zap" class="h-3 w-3" />
                  <span>Powered by Google Gemini</span>
                </div>
                <div v-if="confidenceScoringEnabled" class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Icon name="lucide:target" class="h-3 w-3" />
                  <span>With confidence scoring</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Traditional PDF Cropper -->
        <NuxtLink
          to="/pdf-cropper"
          class="flex items-center gap-1 transition-colors hover:text-foreground/80"
          :class="
            route.path === '/pdf-cropper'
              ? 'text-foreground'
              : 'text-foreground/60'
          "
        >
          <Icon name="lucide:crop" class="h-4 w-4" />
          PDF Cropper
        </NuxtLink>

        <!-- CBT Interface -->
        <div class="relative group">
          <button
            class="flex items-center gap-1 transition-colors hover:text-foreground/80"
            :class="
              route.path.startsWith('/cbt')
                ? 'text-foreground'
                : 'text-foreground/60'
            "
          >
            <Icon name="lucide:monitor" class="h-4 w-4" />
            CBT Interface
            <Icon name="lucide:chevron-down" class="h-3 w-3" />
          </button>
          
          <!-- Dropdown Menu -->
          <div class="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div class="p-1">
              <NuxtLink
                to="/cbt/interface"
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                :class="route.path === '/cbt/interface' ? 'bg-accent text-accent-foreground' : ''"
              >
                <Icon name="lucide:play-circle" class="h-4 w-4" />
                <div>
                  <div class="font-medium">Test Interface</div>
                  <div class="text-xs text-muted-foreground">Take practice tests</div>
                </div>
              </NuxtLink>
              
              <NuxtLink
                to="/cbt/results"
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                :class="route.path === '/cbt/results' ? 'bg-accent text-accent-foreground' : ''"
              >
                <Icon name="lucide:bar-chart-3" class="h-4 w-4" />
                <div>
                  <div class="font-medium">Test Results</div>
                  <div class="text-xs text-muted-foreground">View performance analytics</div>
                </div>
              </NuxtLink>
              
              <NuxtLink
                to="/cbt/generate-answer-key"
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                :class="route.path === '/cbt/generate-answer-key' ? 'bg-accent text-accent-foreground' : ''"
              >
                <Icon name="lucide:key" class="h-4 w-4" />
                <div>
                  <div class="font-medium">Answer Key</div>
                  <div class="text-xs text-muted-foreground">Generate answer sheets</div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </nav>
      <div class="flex flex-1 items-center justify-end space-x-2">
        <nav class="flex items-center">
          <NuxtLink
            to="https://github.com/namandhakad712/rankify"
            target="_blank"
            rel="noopener noreferrer"
            class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
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
import { getFeatureFlags } from '#layers/shared/app/composables/useFeatureFlags'

const route = useRoute()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
const projectVersion = useRuntimeConfig().public.projectVersion

// Feature flags
const featureFlags = getFeatureFlags()
const {
  aiExtractionEnabled,
  reviewInterfaceEnabled,
  confidenceScoringEnabled
} = featureFlags

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
