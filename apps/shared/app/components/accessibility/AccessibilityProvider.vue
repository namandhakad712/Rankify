<template>
  <div 
    class="accessibility-provider"
    :class="accessibilityClasses"
    :data-font-size="config.fontSize"
    :data-color-scheme="config.colorScheme"
  >
    <!-- Skip Links -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    </div>

    <!-- Live Region for Announcements -->
    <div
      ref="announcer"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ currentAnnouncement }}
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div
      v-if="showKeyboardShortcuts"
      class="keyboard-shortcuts"
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-modal="true"
    >
      <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
      <ul>
        <li>
          <span>Skip to main content</span>
          <span class="shortcut">Alt + 1</span>
        </li>
        <li>
          <span>Skip to navigation</span>
          <span class="shortcut">Alt + 2</span>
        </li>
        <li>
          <span>Skip to search</span>
          <span class="shortcut">Alt + 3</span>
        </li>
        <li>
          <span>Close dialog</span>
          <span class="shortcut">Escape</span>
        </li>
        <li>
          <span>Cycle focus groups</span>
          <span class="shortcut">F6</span>
        </li>
        <li>
          <span>Show this help</span>
          <span class="shortcut">Ctrl + /</span>
        </li>
      </ul>
      <button @click="hideKeyboardShortcuts" class="close-button">
        Close
      </button>
    </div>

    <!-- Main Content Slot -->
    <slot />

    <!-- Accessibility Settings Panel -->
    <div
      v-if="showSettings"
      class="accessibility-settings"
      role="dialog"
      aria-labelledby="settings-title"
      aria-modal="true"
    >
      <h3 id="settings-title">Accessibility Settings</h3>
      
      <div class="setting-group">
        <label for="font-size-select">Font Size:</label>
        <select
          id="font-size-select"
          v-model="config.fontSize"
          @change="updateConfig"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra Large</option>
        </select>
      </div>

      <div class="setting-group">
        <label for="color-scheme-select">Color Scheme:</label>
        <select
          id="color-scheme-select"
          v-model="config.colorScheme"
          @change="updateConfig"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="high-contrast">High Contrast</option>
        </select>
      </div>

      <div class="setting-group">
        <label>
          <input
            type="checkbox"
            v-model="config.enableReducedMotion"
            @change="updateConfig"
          />
          Reduce Motion
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input
            type="checkbox"
            v-model="config.enableScreenReader"
            @change="updateConfig"
          />
          Screen Reader Support
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input
            type="checkbox"
            v-model="config.enableKeyboardNavigation"
            @change="updateConfig"
          />
          Keyboard Navigation
        </label>
      </div>

      <div class="setting-group">
        <label>
          <input
            type="checkbox"
            v-model="config.announceChanges"
            @change="updateConfig"
          />
          Announce Changes
        </label>
      </div>

      <div class="settings-actions">
        <button @click="resetSettings" class="reset-button">
          Reset to Defaults
        </button>
        <button @click="hideSettings" class="close-button">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { accessibilityManager, type AccessibilityConfig } from '~/utils/accessibility/accessibilityManager'

// Props
interface Props {
  initialConfig?: Partial<AccessibilityConfig>
}

const props = withDefaults(defineProps<Props>(), {
  initialConfig: () => ({})
})

// Reactive state
const config = ref<AccessibilityConfig>({
  enableScreenReader: true,
  enableKeyboardNavigation: true,
  enableHighContrast: false,
  enableReducedMotion: false,
  enableFocusManagement: true,
  announceChanges: true,
  fontSize: 'medium',
  colorScheme: 'light',
  ...props.initialConfig
})

const currentAnnouncement = ref('')
const showKeyboardShortcuts = ref(false)
const showSettings = ref(false)
const announcer = ref<HTMLElement>()

// Computed properties
const accessibilityClasses = computed(() => ({
  'high-contrast': config.value.enableHighContrast,
  'reduce-motion': config.value.enableReducedMotion,
  'keyboard-user': accessibilityManager.getState().isKeyboardUser,
  'screen-reader-active': accessibilityManager.getState().isScreenReaderActive
}))

// Methods
const updateConfig = () => {
  accessibilityManager.updateConfig(config.value)
  announce('Settings updated')
}

const resetSettings = () => {
  config.value = {
    enableScreenReader: true,
    enableKeyboardNavigation: true,
    enableHighContrast: false,
    enableReducedMotion: false,
    enableFocusManagement: true,
    announceChanges: true,
    fontSize: 'medium',
    colorScheme: 'light'
  }
  updateConfig()
  announce('Settings reset to defaults')
}

const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  if (!config.value.announceChanges) return
  
  currentAnnouncement.value = message
  accessibilityManager.announce(message, priority)
  
  // Clear announcement after delay
  setTimeout(() => {
    currentAnnouncement.value = ''
  }, 1000)
}

const showKeyboardShortcutsHelp = () => {
  showKeyboardShortcuts.value = true
  announce('Keyboard shortcuts help opened')
}

const hideKeyboardShortcuts = () => {
  showKeyboardShortcuts.value = false
  announce('Keyboard shortcuts help closed')
}

const showAccessibilitySettings = () => {
  showSettings.value = true
  announce('Accessibility settings opened')
}

const hideSettings = () => {
  showSettings.value = false
  announce('Accessibility settings closed')
}

// Keyboard event handlers
const handleKeydown = (event: KeyboardEvent) => {
  // Handle global keyboard shortcuts
  if (event.altKey && event.key === '1') {
    event.preventDefault()
    focusMainContent()
  } else if (event.altKey && event.key === '2') {
    event.preventDefault()
    focusNavigation()
  } else if (event.altKey && event.key === '3') {
    event.preventDefault()
    focusSearch()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    handleEscape()
  } else if (event.key === 'F6') {
    event.preventDefault()
    cycleFocusGroups()
  } else if (event.ctrlKey && event.key === '/') {
    event.preventDefault()
    showKeyboardShortcutsHelp()
  } else if (event.ctrlKey && event.shiftKey && event.key === 'A') {
    event.preventDefault()
    showAccessibilitySettings()
  }
}

const focusMainContent = () => {
  const main = document.querySelector('main, [role="main"], #main-content') as HTMLElement
  if (main) {
    main.focus()
    announce('Focused on main content')
  }
}

const focusNavigation = () => {
  const nav = document.querySelector('nav, [role="navigation"], #navigation') as HTMLElement
  if (nav) {
    nav.focus()
    announce('Focused on navigation')
  }
}

const focusSearch = () => {
  const search = document.querySelector('input[type="search"], [role="search"] input, #search') as HTMLElement
  if (search) {
    search.focus()
    announce('Focused on search')
  }
}

const handleEscape = () => {
  if (showKeyboardShortcuts.value) {
    hideKeyboardShortcuts()
  } else if (showSettings.value) {
    hideSettings()
  } else {
    // Close any open modals or dialogs
    const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])') as HTMLElement
    if (modal) {
      const closeButton = modal.querySelector('[aria-label*="close"], .close-button') as HTMLElement
      if (closeButton) {
        closeButton.click()
      }
    }
  }
}

const cycleFocusGroups = () => {
  announce('Cycling through focus groups')
  // This would be implemented based on registered focus groups
}

// Lifecycle hooks
onMounted(() => {
  // Initialize accessibility manager with config
  accessibilityManager.updateConfig(config.value)
  
  // Add global keyboard listeners
  document.addEventListener('keydown', handleKeydown)
  
  // Listen for accessibility state changes
  const handleStateChange = () => {
    const state = accessibilityManager.getState()
    // Update reactive state if needed
  }
  
  // Set up periodic state checking (since we don't have events from the manager)
  const stateCheckInterval = setInterval(handleStateChange, 1000)
  
  // Cleanup function
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    clearInterval(stateCheckInterval)
  })
})

// Watch for config changes
watch(config, (newConfig) => {
  accessibilityManager.updateConfig(newConfig)
}, { deep: true })

// Expose methods for parent components
defineExpose({
  announce,
  showKeyboardShortcutsHelp,
  showAccessibilitySettings,
  updateConfig,
  resetSettings,
  getConfig: () => config.value,
  getState: () => accessibilityManager.getState()
})
</script>

<style scoped>
.accessibility-provider {
  position: relative;
  width: 100%;
  height: 100%;
}

.skip-links {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10000;
}

.keyboard-shortcuts,
.accessibility-settings {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #000000);
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 10000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.keyboard-shortcuts h3,
.accessibility-settings h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: var(--font-size-lg, 1.25rem);
}

.keyboard-shortcuts ul {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
}

.keyboard-shortcuts li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.keyboard-shortcuts li:last-child {
  border-bottom: none;
}

.shortcut {
  font-family: 'Courier New', monospace;
  background: var(--border-color, #e0e0e0);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: bold;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.setting-group select,
.setting-group input[type="checkbox"] {
  margin-right: 8px;
}

.setting-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #000000);
  font-size: var(--font-size-base, 1rem);
}

.setting-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.settings-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.close-button,
.reset-button {
  padding: 10px 20px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #000000);
  cursor: pointer;
  font-size: var(--font-size-base, 1rem);
  transition: all 0.2s ease;
}

.close-button:hover,
.close-button:focus,
.reset-button:hover,
.reset-button:focus {
  background: var(--focus-color, #0066cc);
  color: white;
  border-color: var(--focus-color, #0066cc);
}

.reset-button {
  background: #f44336;
  color: white;
  border-color: #f44336;
}

.reset-button:hover,
.reset-button:focus {
  background: #d32f2f;
  border-color: #d32f2f;
}

/* High contrast mode adjustments */
.high-contrast .keyboard-shortcuts,
.high-contrast .accessibility-settings {
  background: #000000;
  color: #ffffff;
  border-color: #ffffff;
}

.high-contrast .shortcut {
  background: #ffffff;
  color: #000000;
}

.high-contrast .setting-group select {
  background: #000000;
  color: #ffffff;
  border-color: #ffffff;
}

/* Reduced motion adjustments */
.reduce-motion .keyboard-shortcuts,
.reduce-motion .accessibility-settings {
  transition: none;
}

.reduce-motion .close-button,
.reduce-motion .reset-button {
  transition: none;
}

/* Mobile responsive adjustments */
@media (max-width: 767px) {
  .keyboard-shortcuts,
  .accessibility-settings {
    max-width: 90vw;
    padding: 16px;
  }
  
  .settings-actions {
    flex-direction: column;
  }
  
  .close-button,
  .reset-button {
    width: 100%;
  }
}
</style>