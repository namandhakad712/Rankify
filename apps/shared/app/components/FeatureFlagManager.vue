<template>
  <div class="feature-flag-manager">
    <div class="mb-6">
      <h2 class="text-2xl font-bold mb-2">Feature Flag Manager</h2>
      <p class="text-muted-foreground">
        Manage AI feature rollout and configuration. Changes are saved locally.
      </p>
    </div>

    <!-- Environment Info -->
    <div class="mb-6 p-4 bg-muted rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span class="font-medium">Environment:</span>
          <span class="ml-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
            {{ config.environment }}
          </span>
        </div>
        <div>
          <span class="font-medium">Version:</span>
          <span class="ml-2">{{ config.version }}</span>
        </div>
        <div>
          <span class="font-medium">User ID:</span>
          <span class="ml-2 font-mono text-xs">{{ config.userId }}</span>
        </div>
      </div>
    </div>

    <!-- Feature Flags -->
    <div class="space-y-4">
      <div
        v-for="flag in allFlags"
        :key="flag.key"
        class="border rounded-lg p-4"
        :class="{
          'border-green-200 bg-green-50': flag.enabled,
          'border-gray-200 bg-gray-50': !flag.enabled
        }"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold">{{ flag.name }}</h3>
              
              <!-- Status Badge -->
              <UiBadge
                :variant="flag.enabled ? 'default' : 'secondary'"
                class="text-xs"
              >
                {{ flag.enabled ? 'Enabled' : 'Disabled' }}
              </UiBadge>
              
              <!-- Rollout Percentage -->
              <UiBadge
                v-if="flag.rolloutPercentage < 100"
                variant="outline"
                class="text-xs"
              >
                {{ flag.rolloutPercentage }}% rollout
              </UiBadge>
              
              <!-- Environment Badge -->
              <UiBadge
                v-if="flag.environment && flag.environment.length < 3"
                variant="outline"
                class="text-xs"
              >
                {{ flag.environment.join(', ') }}
              </UiBadge>
            </div>
            
            <p class="text-sm text-muted-foreground mb-3">
              {{ flag.description }}
            </p>
            
            <!-- Dependencies -->
            <div v-if="flag.dependencies && flag.dependencies.length > 0" class="mb-3">
              <span class="text-xs font-medium text-muted-foreground">Dependencies:</span>
              <div class="flex gap-1 mt-1">
                <UiBadge
                  v-for="dep in flag.dependencies"
                  :key="dep"
                  variant="outline"
                  class="text-xs"
                  :class="{
                    'border-green-500 text-green-700': isEnabled(dep),
                    'border-red-500 text-red-700': !isEnabled(dep)
                  }"
                >
                  {{ dep }}
                </UiBadge>
              </div>
            </div>
            
            <!-- Rollout Progress -->
            <div v-if="flag.rolloutPercentage < 100" class="mb-3">
              <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Rollout Progress</span>
                <span>{{ flag.rolloutPercentage }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: flag.rolloutPercentage + '%' }"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- Toggle Switch -->
          <div class="ml-4">
            <UiSwitch
              :checked="flag.enabled"
              @update:checked="toggleFlag(flag.key)"
              :disabled="!canToggleFlag(flag)"
            />
          </div>
        </div>
        
        <!-- Warning for disabled dependencies -->
        <div
          v-if="flag.dependencies && flag.dependencies.some(dep => !isEnabled(dep))"
          class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800"
        >
          <Icon name="lucide:alert-triangle" class="inline h-4 w-4 mr-1" />
          Some dependencies are disabled: 
          {{ flag.dependencies.filter(dep => !isEnabled(dep)).join(', ') }}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-8 flex gap-4">
      <UiButton @click="resetToDefaults" variant="outline">
        <Icon name="lucide:refresh-cw" class="h-4 w-4 mr-2" />
        Reset to Defaults
      </UiButton>
      
      <UiButton @click="exportConfig" variant="outline">
        <Icon name="lucide:download" class="h-4 w-4 mr-2" />
        Export Config
      </UiButton>
      
      <UiButton @click="showImportDialog = true" variant="outline">
        <Icon name="lucide:upload" class="h-4 w-4 mr-2" />
        Import Config
      </UiButton>
    </div>

    <!-- Import Dialog -->
    <UiDialog v-model:open="showImportDialog">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Import Feature Flag Configuration</UiDialogTitle>
          <UiDialogDescription>
            Paste a feature flag configuration JSON to import settings.
          </UiDialogDescription>
        </UiDialogHeader>
        
        <div class="space-y-4">
          <UiTextarea
            v-model="importText"
            placeholder="Paste configuration JSON here..."
            rows="10"
            class="font-mono text-sm"
          />
        </div>
        
        <UiDialogFooter>
          <UiButton variant="outline" @click="showImportDialog = false">
            Cancel
          </UiButton>
          <UiButton @click="importConfig" :disabled="!importText.trim()">
            Import
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getFeatureFlags } from '#layers/shared/app/composables/useFeatureFlags'

// Feature flags instance
const featureFlags = getFeatureFlags()

// State
const showImportDialog = ref(false)
const importText = ref('')

// Computed
const allFlags = computed(() => featureFlags.getAllFlags())
const config = computed(() => featureFlags.config.value)

// Methods
const isEnabled = (flagKey: string) => featureFlags.isEnabled(flagKey)

const toggleFlag = (flagKey: string) => {
  featureFlags.toggle(flagKey)
}

const canToggleFlag = (flag: any) => {
  // Can't toggle if environment doesn't match
  if (flag.environment && !flag.environment.includes(config.value.environment)) {
    return false
  }
  
  return true
}

const resetToDefaults = () => {
  if (confirm('Are you sure you want to reset all feature flags to their default values?')) {
    featureFlags.resetToDefaults()
  }
}

const exportConfig = () => {
  const configData = featureFlags.exportConfig()
  const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `feature-flags-${config.value.environment}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const importConfig = () => {
  try {
    const configData = JSON.parse(importText.value)
    featureFlags.importConfig(configData)
    showImportDialog.value = false
    importText.value = ''
    
    // Show success message
    const { $toast } = useNuxtApp()
    $toast.success('Configuration imported successfully!')
  } catch (error) {
    console.error('Failed to import configuration:', error)
    
    // Show error message
    const { $toast } = useNuxtApp()
    $toast.error('Failed to import configuration. Please check the JSON format.')
  }
}
</script>

<style scoped>
.feature-flag-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
</style>