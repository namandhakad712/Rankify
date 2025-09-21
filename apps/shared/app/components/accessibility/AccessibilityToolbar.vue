<template>
  <div class="accessibility-toolbar" :class="{ 'toolbar-expanded': isExpanded }">
    <!-- Toolbar Toggle -->
    <button
      @click="toggleToolbar"
      class="toolbar-toggle"
      :aria-expanded="isExpanded"
      aria-label="Toggle accessibility options"
      title="Accessibility Options"
    >
      <Icon name="mdi:universal-access" size="1.5rem" />
      <span class="sr-only">Accessibility Options</span>
    </button>

    <!-- Toolbar Content -->
    <div v-if="isExpanded" class="toolbar-content" role="region" aria-label="Accessibility controls">
      <div class="toolbar-header">
        <h3>Accessibility Options</h3>
        <button
          @click="closeToolbar"
          class="close-button"
          aria-label="Close accessibility options"
        >
          <Icon name="mdi:close" size="1.2rem" />
        </button>
      </div>

      <div class="toolbar-sections">
        <!-- Visual Settings -->
        <div class="toolbar-section">
          <h4>Visual Settings</h4>
          
          <div class="setting-group">
            <label for="font-size-select" class="setting-label">Font Size</label>
            <select
              id="font-size-select"
              v-model="settings.fontSize"
              class="setting-select"
              @change="updateFontSize"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>

          <div class="setting-group">
            <label for="color-scheme-select" class="setting-label">Color Scheme</label>
            <select
              id="color-scheme-select"
              v-model="settings.colorScheme"
              class="setting-select"
              @change="updateColorScheme"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="high-contrast">High Contrast</option>
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="settings.enableHighContrast"
                type="checkbox"
                @change="toggleHighContrast"
              >
              <span class="checkmark"></span>
              Enable High Contrast
            </label>
          </div>

          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="settings.enableReducedMotion"
                type="checkbox"
                @change="toggleReducedMotion"
              >
              <span class="checkmark"></span>
              Reduce Motion
            </label>
          </div>
        </div>

        <!-- Navigation Settings -->
        <div class="toolbar-section">
          <h4>Navigation Settings</h4>
          
          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="settings.enableKeyboardNavigation"
                type="checkbox"
                @change="toggleKeyboardNavigation"
              >
              <span class="checkmark"></span>
              Enhanced Keyboard Navigation
            </label>
          </div>

          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="settings.enableFocusManagement"
                type="checkbox"
                @change="toggleFocusManagement"
              >
              <span class="checkmark"></span>
              Focus Management
            </label>
          </div>

          <div class="setting-group">
            <button
              @click="showKeyboardShortcuts"
              class="setting-button"
              type="button"
            >
              <Icon name="mdi:keyboard" size="1rem" />
              View Keyboard Shortcuts
            </button>
          </div>
        </div>

        <!-- Screen Reader Settings -->
        <div class="toolbar-section">
          <h4>Screen Reader Settings</h4>
          
          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="settings.enableScreenReader"
                type="checkbox"
                @change="toggleScreenReader"
              >
              <span class="checkmark"></span>
              Enhanced Screen Reader Support
            </label>
          </div>

          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="settings.announceChanges"
                type="checkbox"
                @change="toggleAnnouncements"
              >
              <span class="checkmark"></span>
              Announce Changes
            </label>
          </div>

          <div class="setting-group">
            <button
              @click="testScreenReader"
              class="setting-button"
              type="button"
            >
              <Icon name="mdi:volume-high" size="1rem" />
              Test Screen Reader
            </button>
          </div>
        </div>

        <!-- Diagram Settings -->
        <div class="toolbar-section">
          <h4>Diagram Settings</h4>
          
          <div class="setting-group">
            <label for="diagram-contrast" class="setting-label">Diagram Contrast</label>
            <input
              id="diagram-contrast"
              v-model="diagramSettings.contrast"
              type="range"
              min="50"
              max="200"
              step="10"
              class="setting-range"
              @input="updateDiagramContrast"
              aria-describedby="contrast-value"
            >
            <span id="contrast-value" class="range-value">{{ diagramSettings.contrast }}%</span>
          </div>

          <div class="setting-group">
            <label for="diagram-size" class="setting-label">Diagram Size</label>
            <input
              id="diagram-size"
              v-model="diagramSettings.size"
              type="range"
              min="75"
              max="150"
              step="5"
              class="setting-range"
              @input="updateDiagramSize"
              aria-describedby="size-value"
            >
            <span id="size-value" class="range-value">{{ diagramSettings.size }}%</span>
          </div>

          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="diagramSettings.showDescriptions"
                type="checkbox"
                @change="toggleDiagramDescriptions"
              >
              <span class="checkmark"></span>
              Show Diagram Descriptions
            </label>
          </div>

          <div class="setting-group">
            <label class="setting-checkbox">
              <input
                v-model="diagramSettings.showConfidence"
                type="checkbox"
                @change="toggleConfidenceIndicators"
              >
              <span class="checkmark"></span>
              Show Confidence Indicators
            </label>
          </div>
        </div>
      </div>

      <!-- Reset Button -->
      <div class="toolbar-footer">
        <button
          @click="resetSettings"
          class="reset-button"
          type="button"
        >
          <Icon name="mdi:refresh" size="1rem" />
          Reset to Defaults
        </button>
      </div>
    </div>

    <!-- Keyboard Shortcuts Modal -->
    <div
      v-if="showShortcuts"
      class="shortcuts-modal"
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-modal="true"
      @click="closeShortcuts"
    >
      <div class="shortcuts-content" @click.stop>
        <div class="shortcuts-header">
          <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
          <button
            @click="closeShortcuts"
            class="close-button"
            aria-label="Close keyboard shortcuts"
          >
            <Icon name="mdi:close" size="1.2rem" />
          </button>
        </div>
        
        <div class="shortcuts-body">
          <div class="shortcut-category">
            <h4>Navigation</h4>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <kbd>Alt + 1</kbd>
                <span>Focus main content</span>
              </div>
              <div class="shortcut-item">
                <kbd>Alt + 2</kbd>
                <span>Focus navigation</span>
              </div>
              <div class="shortcut-item">
                <kbd>Tab</kbd>
                <span>Next focusable element</span>
              </div>
              <div class="shortcut-item">
                <kbd>Shift + Tab</kbd>
                <span>Previous focusable element</span>
              </div>
            </div>
          </div>
          
          <div class="shortcut-category">
            <h4>Diagrams</h4>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <kbd>Arrow Keys</kbd>
                <span>Navigate between diagrams</span>
              </div>
              <div class="shortcut-item">
                <kbd>Enter</kbd>
                <span>Activate focused diagram</span>
              </div>
              <div class="shortcut-item">
                <kbd>Space</kbd>
                <span>Toggle diagram selection</span>
              </div>
            </div>
          </div>
          
          <div class="shortcut-category">
            <h4>General</h4>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <kbd>Escape</kbd>
                <span>Close dialogs/modals</span>
              </div>
              <div class="shortcut-item">
                <kbd>Ctrl + /</kbd>
                <span>Show this help</span>
              </div>
              <div class="shortcut-item">
                <kbd>F6</kbd>
                <span>Cycle focus groups</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { accessibilityManager } from '~/utils/accessibility/accessibilityManager'

// Reactive state
const isExpanded = ref(false)
const showShortcuts = ref(false)

const settings = reactive({
  fontSize: 'medium' as 'small' | 'medium' | 'large' | 'extra-large',
  colorScheme: 'light' as 'light' | 'dark' | 'high-contrast',
  enableHighContrast: false,
  enableReducedMotion: false,
  enableKeyboardNavigation: true,
  enableFocusManagement: true,
  enableScreenReader: true,
  announceChanges: true
})

const diagramSettings = reactive({
  contrast: 100,
  size: 100,
  showDescriptions: true,
  showConfidence: true
})

// Methods
const toggleToolbar = () => {
  isExpanded.value = !isExpanded.value
  
  if (isExpanded.value) {
    accessibilityManager.announce('Accessibility toolbar opened')
    // Focus first interactive element
    nextTick(() => {
      const firstInput = document.querySelector('.toolbar-content input, .toolbar-content select, .toolbar-content button')
      if (firstInput) {
        (firstInput as HTMLElement).focus()
      }
    })
  } else {
    accessibilityManager.announce('Accessibility toolbar closed')
  }
}

const closeToolbar = () => {
  isExpanded.value = false
  accessibilityManager.announce('Accessibility toolbar closed')
}

const updateFontSize = () => {
  accessibilityManager.updateConfig({ fontSize: settings.fontSize })
  accessibilityManager.announce(`Font size changed to ${settings.fontSize}`)
  saveSettings()
}

const updateColorScheme = () => {
  accessibilityManager.updateConfig({ colorScheme: settings.colorScheme })
  accessibilityManager.announce(`Color scheme changed to ${settings.colorScheme}`)
  saveSettings()
}

const toggleHighContrast = () => {
  accessibilityManager.updateConfig({ enableHighContrast: settings.enableHighContrast })
  accessibilityManager.announce(`High contrast ${settings.enableHighContrast ? 'enabled' : 'disabled'}`)
  saveSettings()
}

const toggleReducedMotion = () => {
  accessibilityManager.updateConfig({ enableReducedMotion: settings.enableReducedMotion })
  accessibilityManager.announce(`Reduced motion ${settings.enableReducedMotion ? 'enabled' : 'disabled'}`)
  saveSettings()
}

const toggleKeyboardNavigation = () => {
  accessibilityManager.updateConfig({ enableKeyboardNavigation: settings.enableKeyboardNavigation })
  accessibilityManager.announce(`Keyboard navigation ${settings.enableKeyboardNavigation ? 'enabled' : 'disabled'}`)
  saveSettings()
}

const toggleFocusManagement = () => {
  accessibilityManager.updateConfig({ enableFocusManagement: settings.enableFocusManagement })
  accessibilityManager.announce(`Focus management ${settings.enableFocusManagement ? 'enabled' : 'disabled'}`)
  saveSettings()
}

const toggleScreenReader = () => {
  accessibilityManager.updateConfig({ enableScreenReader: settings.enableScreenReader })
  accessibilityManager.announce(`Screen reader support ${settings.enableScreenReader ? 'enabled' : 'disabled'}`)
  saveSettings()
}

const toggleAnnouncements = () => {
  accessibilityManager.updateConfig({ announceChanges: settings.announceChanges })
  accessibilityManager.announce(`Change announcements ${settings.announceChanges ? 'enabled' : 'disabled'}`)
  saveSettings()
}

const updateDiagramContrast = () => {
  const root = document.documentElement
  root.style.setProperty('--diagram-contrast', `${diagramSettings.contrast}%`)
  accessibilityManager.announce(`Diagram contrast set to ${diagramSettings.contrast}%`)
  saveDiagramSettings()
}

const updateDiagramSize = () => {
  const root = document.documentElement
  root.style.setProperty('--diagram-size-scale', `${diagramSettings.size / 100}`)
  accessibilityManager.announce(`Diagram size set to ${diagramSettings.size}%`)
  saveDiagramSettings()
}

const toggleDiagramDescriptions = () => {
  const diagrams = document.querySelectorAll('.diagram-overlay')
  diagrams.forEach(diagram => {
    if (diagramSettings.showDescriptions) {
      diagram.classList.add('show-descriptions')
    } else {
      diagram.classList.remove('show-descriptions')
    }
  })
  accessibilityManager.announce(`Diagram descriptions ${diagramSettings.showDescriptions ? 'shown' : 'hidden'}`)
  saveDiagramSettings()
}

const toggleConfidenceIndicators = () => {
  const diagrams = document.querySelectorAll('.diagram-overlay')
  diagrams.forEach(diagram => {
    if (diagramSettings.showConfidence) {
      diagram.classList.add('show-confidence')
    } else {
      diagram.classList.remove('show-confidence')
    }
  })
  accessibilityManager.announce(`Confidence indicators ${diagramSettings.showConfidence ? 'shown' : 'hidden'}`)
  saveDiagramSettings()
}

const showKeyboardShortcuts = () => {
  showShortcuts.value = true
  accessibilityManager.announce('Keyboard shortcuts dialog opened')
  
  // Focus the modal
  nextTick(() => {
    const modal = document.querySelector('.shortcuts-modal')
    if (modal) {
      (modal as HTMLElement).focus()
    }
  })
}

const closeShortcuts = () => {
  showShortcuts.value = false
  accessibilityManager.announce('Keyboard shortcuts dialog closed')
}

const testScreenReader = () => {
  accessibilityManager.announce('Screen reader test: This is a test announcement to verify screen reader functionality is working correctly.', 'assertive')
}

const resetSettings = () => {
  settings.fontSize = 'medium'
  settings.colorScheme = 'light'
  settings.enableHighContrast = false
  settings.enableReducedMotion = false
  settings.enableKeyboardNavigation = true
  settings.enableFocusManagement = true
  settings.enableScreenReader = true
  settings.announceChanges = true

  diagramSettings.contrast = 100
  diagramSettings.size = 100
  diagramSettings.showDescriptions = true
  diagramSettings.showConfidence = true

  // Apply all settings
  updateFontSize()
  updateColorScheme()
  toggleHighContrast()
  toggleReducedMotion()
  updateDiagramContrast()
  updateDiagramSize()
  toggleDiagramDescriptions()
  toggleConfidenceIndicators()

  accessibilityManager.announce('All accessibility settings reset to defaults')
  
  // Clear saved settings
  localStorage.removeItem('accessibility-settings')
  localStorage.removeItem('diagram-accessibility-settings')
}

const saveSettings = () => {
  localStorage.setItem('accessibility-settings', JSON.stringify(settings))
}

const saveDiagramSettings = () => {
  localStorage.setItem('diagram-accessibility-settings', JSON.stringify(diagramSettings))
}

const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('accessibility-settings')
    if (savedSettings) {
      Object.assign(settings, JSON.parse(savedSettings))
    }

    const savedDiagramSettings = localStorage.getItem('diagram-accessibility-settings')
    if (savedDiagramSettings) {
      Object.assign(diagramSettings, JSON.parse(savedDiagramSettings))
    }
  } catch (error) {
    console.warn('Failed to load accessibility settings:', error)
  }
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  // Toggle toolbar with Ctrl+Alt+A
  if (event.ctrlKey && event.altKey && event.key === 'a') {
    event.preventDefault()
    toggleToolbar()
  }
  
  // Close toolbar with Escape
  if (event.key === 'Escape' && isExpanded.value) {
    event.preventDefault()
    closeToolbar()
  }
  
  // Close shortcuts modal with Escape
  if (event.key === 'Escape' && showShortcuts.value) {
    event.preventDefault()
    closeShortcuts()
  }
}

// Lifecycle
onMounted(() => {
  loadSettings()
  
  // Apply loaded settings
  updateFontSize()
  updateColorScheme()
  updateDiagramContrast()
  updateDiagramSize()
  
  // Setup keyboard shortcuts
  document.addEventListener('keydown', handleKeydown)
  
  // Detect system preferences
  detectSystemPreferences()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const detectSystemPreferences = () => {
  // Detect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    settings.enableReducedMotion = true
    toggleReducedMotion()
  }
  
  // Detect high contrast preference
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    settings.enableHighContrast = true
    toggleHighContrast()
  }
  
  // Detect dark mode preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    settings.colorScheme = 'dark'
    updateColorScheme()
  }
}
</script>

<style scoped>
.accessibility-toolbar {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  font-family: system-ui, -apple-system, sans-serif;
}

.toolbar-toggle {
  background: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast);
}

.toolbar-toggle:hover {
  background: var(--color-primary-hover);
  transform: scale(1.05);
}

.toolbar-toggle:focus {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.toolbar-content {
  position: absolute;
  top: 60px;
  right: 0;
  width: 320px;
  max-height: 80vh;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  overflow-y: auto;
  animation: slideIn var(--transition-normal) ease-out;
}

.toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-primary);
}

.toolbar-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.close-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.toolbar-sections {
  padding: var(--space-md);
  max-height: 60vh;
  overflow-y: auto;
}

.toolbar-section {
  margin-bottom: var(--space-lg);
}

.toolbar-section h4 {
  margin: 0 0 var(--space-md) 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-secondary);
  padding-bottom: var(--space-xs);
}

.setting-group {
  margin-bottom: var(--space-md);
}

.setting-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.setting-select {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.setting-select:focus {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.setting-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.setting-checkbox input {
  margin-right: var(--space-sm);
  width: 16px;
  height: 16px;
}

.setting-range {
  width: 100%;
  margin: var(--space-xs) 0;
}

.range-value {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.setting-button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.setting-button:hover {
  background: var(--bg-tertiary);
}

.setting-button:focus {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.toolbar-footer {
  padding: var(--space-md);
  border-top: 1px solid var(--border-primary);
}

.reset-button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm);
  background: var(--color-error);
  color: var(--text-inverse);
  border: none;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reset-button:hover {
  background: #dc2626;
}

.shortcuts-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn var(--transition-fast) ease-out;
}

.shortcuts-content {
  background: var(--bg-primary);
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: slideIn var(--transition-normal) ease-out;
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-primary);
}

.shortcuts-header h3 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
}

.shortcuts-body {
  padding: var(--space-lg);
  max-height: 60vh;
  overflow-y: auto;
}

.shortcut-category {
  margin-bottom: var(--space-xl);
}

.shortcut-category h4 {
  margin: 0 0 var(--space-md) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

.shortcut-list {
  display: grid;
  gap: var(--space-sm);
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm);
  background: var(--bg-secondary);
  border-radius: 4px;
}

.shortcut-item kbd {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs);
  font-family: monospace;
  color: var(--text-primary);
}

.shortcut-item span {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .accessibility-toolbar {
    right: 10px;
    top: 10px;
  }
  
  .toolbar-content {
    width: calc(100vw - 40px);
    max-width: 320px;
  }
  
  .shortcuts-content {
    margin: 20px;
    max-width: calc(100vw - 40px);
  }
}

/* High contrast adjustments */
.high-contrast .toolbar-toggle {
  border: 2px solid var(--text-primary);
}

.high-contrast .setting-select,
.high-contrast .setting-button {
  border-width: 2px;
}

/* Reduced motion adjustments */
.reduce-motion .toolbar-content,
.reduce-motion .shortcuts-modal,
.reduce-motion .shortcuts-content {
  animation: none;
}

.reduce-motion .toolbar-toggle:hover {
  transform: none;
}
</style>