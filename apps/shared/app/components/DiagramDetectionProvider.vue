<template>
  <div class="diagram-detection-provider">
    <!-- Configuration Panel -->
    <div
      v-if="showConfigPanel"
      class="config-panel"
      role="dialog"
      aria-labelledby="config-title"
      aria-modal="true"
    >
      <div class="config-content">
        <h3 id="config-title">Diagram Detection Configuration</h3>
        
        <!-- API Configuration -->
        <div class="config-section">
          <h4>API Settings</h4>
          
          <div class="form-group">
            <label for="api-key">Gemini API Key:</label>
            <input
              id="api-key"
              v-model="localConfig.geminiApiKey"
              type="password"
              placeholder="Enter your Gemini API key"
              class="form-control"
              @input="updateConfig"
            />
            <small class="help-text">
              Required for diagram detection. Your key is stored securely in local storage.
            </small>
          </div>

          <div class="form-group">
            <label for="gemini-model">Model:</label>
            <select
              id="gemini-model"
              v-model="localConfig.geminiModel"
              class="form-control"
              @change="updateConfig"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Faster)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (More Accurate)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="confidence-threshold">Confidence Threshold:</label>
            <input
              id="confidence-threshold"
              v-model.number="localConfig.confidenceThreshold"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              class="form-range"
              @input="updateConfig"
            />
            <span class="range-value">{{ localConfig.confidenceThreshold }}</span>
          </div>
        </div>

        <!-- Processing Configuration -->
        <div class="config-section">
          <h4>Processing Settings</h4>
          
          <div class="form-group">
            <label>
              <input
                v-model="localConfig.enableAutoDetection"
                type="checkbox"
                @change="updateConfig"
              />
              Enable Auto Detection
            </label>
          </div>

          <div class="form-group">
            <label>
              <input
                v-model="localConfig.enableFallbackDetection"
                type="checkbox"
                @change="updateConfig"
              />
              Enable Fallback Detection
            </label>
          </div>

          <div class="form-group">
            <label for="batch-size">Batch Size:</label>
            <input
              id="batch-size"
              v-model.number="localConfig.batchSize"
              type="number"
              min="1"
              max="20"
              class="form-control"
              @input="updateConfig"
            />
          </div>
        </div>

        <!-- Performance Configuration -->
        <div class="config-section">
          <h4>Performance Settings</h4>
          
          <div class="form-group">
            <label>
              <input
                v-model="localConfig.enableLazyLoading"
                type="checkbox"
                @change="updateConfig"
              />
              Enable Lazy Loading
            </label>
          </div>

          <div class="form-group">
            <label>
              <input
                v-model="localConfig.enableImageCompression"
                type="checkbox"
                @change="updateConfig"
              />
              Enable Image Compression
            </label>
          </div>

          <div class="form-group">
            <label for="compression-quality">Compression Quality:</label>
            <input
              id="compression-quality"
              v-model.number="localConfig.compressionQuality"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              class="form-range"
              @input="updateConfig"
            />
            <span class="range-value">{{ localConfig.compressionQuality }}</span>
          </div>
        </div>

        <!-- Debug Configuration -->
        <div class="config-section">
          <h4>Debug Settings</h4>
          
          <div class="form-group">
            <label>
              <input
                v-model="localConfig.enableDebugMode"
                type="checkbox"
                @change="updateConfig"
              />
              Enable Debug Mode
            </label>
          </div>

          <div class="form-group">
            <label>
              <input
                v-model="localConfig.enablePerformanceMonitoring"
                type="checkbox"
                @change="updateConfig"
              />
              Enable Performance Monitoring
            </label>
          </div>

          <div class="form-group">
            <label for="log-level">Log Level:</label>
            <select
              id="log-level"
              v-model="localConfig.logLevel"
              class="form-control"
              @change="updateConfig"
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
        </div>

        <!-- Actions -->
        <div class="config-actions">
          <button @click="resetConfig" class="btn btn-secondary">
            Reset to Defaults
          </button>
          <button @click="exportConfig" class="btn btn-secondary">
            Export Config
          </button>
          <button @click="importConfig" class="btn btn-secondary">
            Import Config
          </button>
          <button @click="hideConfigPanel" class="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div v-if="showStatusBar" class="status-bar">
      <div class="status-item">
        <span class="status-label">API:</span>
        <span :class="['status-value', apiStatus.class]">
          {{ apiStatus.text }}
        </span>
      </div>
      
      <div class="status-item">
        <span class="status-label">Storage:</span>
        <span :class="['status-value', storageStatus.class]">
          {{ storageStatus.text }}
        </span>
      </div>
      
      <div class="status-item">
        <span class="status-label">Performance:</span>
        <span :class="['status-value', performanceStatus.class]">
          {{ performanceStatus.text }}
        </span>
      </div>

      <button
        @click="showConfigPanel = true"
        class="config-button"
        title="Open Configuration"
      >
        ⚙️
      </button>
    </div>

    <!-- Main Content -->
    <slot />

    <!-- Hidden file input for config import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleConfigImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { diagramDetectionConfig, type DiagramDetectionConfig } from '~/utils/config/diagramDetectionConfig'

// Props
interface Props {
  showStatusBar?: boolean
  showConfigOnMount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStatusBar: true,
  showConfigOnMount: false
})

// Reactive state
const showConfigPanel = ref(props.showConfigOnMount)
const localConfig = ref<DiagramDetectionConfig>(diagramDetectionConfig.getConfig())
const fileInput = ref<HTMLInputElement>()

// Computed properties
const apiStatus = computed(() => {
  const hasApiKey = !!diagramDetectionConfig.getApiKey()
  return {
    text: hasApiKey ? 'Connected' : 'Not Configured',
    class: hasApiKey ? 'status-success' : 'status-error'
  }
})

const storageStatus = computed(() => {
  const hasIndexedDB = 'indexedDB' in window
  return {
    text: hasIndexedDB ? 'Available' : 'Not Available',
    class: hasIndexedDB ? 'status-success' : 'status-warning'
  }
})

const performanceStatus = computed(() => {
  const isOptimized = localConfig.value.enableLazyLoading && 
                     localConfig.value.enableImageCompression
  return {
    text: isOptimized ? 'Optimized' : 'Basic',
    class: isOptimized ? 'status-success' : 'status-info'
  }
})

// Methods
const updateConfig = () => {
  diagramDetectionConfig.updateConfig(localConfig.value)
}

const resetConfig = () => {
  diagramDetectionConfig.resetConfig()
  localConfig.value = diagramDetectionConfig.getConfig()
}

const exportConfig = () => {
  try {
    const configJson = diagramDetectionConfig.exportConfig()
    const blob = new Blob([configJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `diagram-detection-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export configuration:', error)
    alert('Failed to export configuration. Please try again.')
  }
}

const importConfig = () => {
  fileInput.value?.click()
}

const handleConfigImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  try {
    const text = await file.text()
    diagramDetectionConfig.importConfig(text)
    localConfig.value = diagramDetectionConfig.getConfig()
    alert('Configuration imported successfully!')
  } catch (error) {
    console.error('Failed to import configuration:', error)
    alert('Failed to import configuration. Please check the file format.')
  }

  // Reset file input
  target.value = ''
}

const hideConfigPanel = () => {
  showConfigPanel.value = false
}

const validateConfiguration = () => {
  const validation = diagramDetectionConfig.validateConfig()
  
  if (!validation.isValid) {
    console.warn('Configuration validation failed:', validation.errors)
    return false
  }
  
  return true
}

// Lifecycle hooks
let unsubscribe: (() => void) | null = null

onMounted(() => {
  // Subscribe to configuration changes
  unsubscribe = diagramDetectionConfig.subscribe((config) => {
    localConfig.value = config
  })

  // Validate initial configuration
  validateConfiguration()

  // Show config panel if API key is missing
  if (!diagramDetectionConfig.getApiKey()) {
    showConfigPanel.value = true
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// Expose methods for parent components
defineExpose({
  showConfigPanel: () => { showConfigPanel.value = true },
  hideConfigPanel,
  validateConfiguration,
  getConfig: () => localConfig.value,
  updateConfig
})
</script>

<style scoped>
.diagram-detection-provider {
  position: relative;
  width: 100%;
  height: 100%;
}

.config-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.config-content {
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #000000);
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.config-content h3 {
  margin-top: 0;
  margin-bottom: 24px;
  font-size: 1.5rem;
  color: var(--text-primary, #000000);
}

.config-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.config-section:last-of-type {
  border-bottom: none;
}

.config-section h4 {
  margin-bottom: 16px;
  font-size: 1.2rem;
  color: var(--text-primary, #000000);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: var(--text-primary, #000000);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #000000);
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: var(--focus-color, #0066cc);
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
}

.form-range {
  width: 100%;
  margin-right: 8px;
}

.range-value {
  font-weight: bold;
  color: var(--focus-color, #0066cc);
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary, #666666);
}

.config-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.btn {
  padding: 10px 20px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #000000);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn:hover,
.btn:focus {
  background: var(--focus-color, #0066cc);
  color: white;
  border-color: var(--focus-color, #0066cc);
}

.btn-primary {
  background: var(--focus-color, #0066cc);
  color: white;
  border-color: var(--focus-color, #0066cc);
}

.btn-primary:hover,
.btn-primary:focus {
  background: #0052a3;
  border-color: #0052a3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-secondary:hover,
.btn-secondary:focus {
  background: #5a6268;
  border-color: #5a6268;
}

.status-bar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.status-label {
  color: var(--text-secondary, #666666);
  font-weight: 500;
}

.status-value {
  font-weight: bold;
}

.status-success {
  color: #28a745;
}

.status-warning {
  color: #ffc107;
}

.status-error {
  color: #dc3545;
}

.status-info {
  color: #17a2b8;
}

.config-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.config-button:hover,
.config-button:focus {
  background: var(--border-color, #e0e0e0);
}

/* Mobile responsive adjustments */
@media (max-width: 767px) {
  .config-content {
    max-width: 90vw;
    padding: 16px;
  }
  
  .config-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .status-bar {
    bottom: 10px;
    right: 10px;
    left: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* High contrast mode */
.high-contrast .config-panel {
  background: rgba(0, 0, 0, 0.8);
}

.high-contrast .config-content {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
}

.high-contrast .form-control {
  background: #000000;
  color: #ffffff;
  border-color: #ffffff;
}

.high-contrast .btn {
  background: #000000;
  color: #ffffff;
  border-color: #ffffff;
}

.high-contrast .btn:hover,
.high-contrast .btn:focus {
  background: #ffffff;
  color: #000000;
}
</style>