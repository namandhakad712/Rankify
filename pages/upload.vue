<template>
  <DiagramDetectionProvider>
    <div class="upload-page">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <h1>Upload PDF for Processing</h1>
          <p>Upload your educational PDF to start the AI-powered diagram detection process</p>
        </div>

        <!-- Upload Section -->
        <div class="upload-section" v-if="!isProcessing && !isComplete">
          <div class="upload-area" 
               :class="{ 'drag-over': isDragOver }"
               @drop="handleDrop"
               @dragover.prevent="isDragOver = true"
               @dragleave="isDragOver = false"
               @click="triggerFileInput">
            <input 
              ref="fileInput"
              type="file"
              accept=".pdf"
              @change="handleFileSelect"
              style="display: none"
            />
            
            <div class="upload-icon">📄</div>
            <h3>Drop your PDF here or click to browse</h3>
            <p>Supports PDF files up to 50MB</p>
            
            <div class="upload-requirements">
              <h4>Requirements:</h4>
              <ul>
                <li>✓ PDF format only</li>
                <li>✓ Contains educational content with diagrams</li>
                <li>✓ Clear, high-quality images</li>
                <li>✓ Maximum file size: 50MB</li>
              </ul>
            </div>
          </div>

          <!-- Configuration Panel -->
          <div class="config-panel" v-if="selectedFile">
            <h3>Processing Configuration</h3>
            
            <div class="config-group">
              <label for="confidence-threshold">Confidence Threshold:</label>
              <input 
                id="confidence-threshold"
                v-model.number="processingConfig.confidenceThreshold"
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                class="range-input"
              />
              <span class="range-value">{{ processingConfig.confidenceThreshold }}</span>
            </div>

            <div class="config-group">
              <label for="batch-size">Batch Size:</label>
              <input 
                id="batch-size"
                v-model.number="processingConfig.batchSize"
                type="number"
                min="1"
                max="10"
                class="number-input"
              />
            </div>

            <div class="config-group">
              <label>
                <input 
                  v-model="processingConfig.enableAutoDetection"
                  type="checkbox"
                />
                Enable Auto Detection
              </label>
            </div>

            <div class="config-group">
              <label>
                <input 
                  v-model="processingConfig.enableFallbackDetection"
                  type="checkbox"
                />
                Enable Fallback Detection
              </label>
            </div>

            <button @click="startProcessing" class="btn btn-primary btn-large">
              Start Processing
            </button>
          </div>
        </div>

        <!-- Processing Section -->
        <div class="processing-section" v-if="isProcessing">
          <div class="processing-card">
            <div class="processing-header">
              <h2>Processing PDF...</h2>
              <p>AI is analyzing your PDF and detecting diagrams</p>
            </div>

            <!-- Progress Bar -->
            <div class="progress-container">
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  :style="{ width: `${state.progress}%` }"
                ></div>
              </div>
              <div class="progress-text">
                {{ state.progress }}% Complete
              </div>
            </div>

            <!-- Current Status -->
            <div class="status-info">
              <div class="status-item">
                <span class="status-label">Current Page:</span>
                <span class="status-value">{{ state.currentPage }} / {{ state.totalPages }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Detected Diagrams:</span>
                <span class="status-value">{{ state.detectedDiagrams.length }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Questions Found:</span>
                <span class="status-value">{{ state.questions.length }}</span>
              </div>
            </div>

            <!-- Processing Steps -->
            <div class="processing-steps">
              <div class="step" :class="{ active: state.progress > 0 }">
                <div class="step-icon">📄</div>
                <span>Extracting Pages</span>
              </div>
              <div class="step" :class="{ active: state.progress > 25 }">
                <div class="step-icon">🤖</div>
                <span>AI Analysis</span>
              </div>
              <div class="step" :class="{ active: state.progress > 50 }">
                <div class="step-icon">🎯</div>
                <span>Detecting Diagrams</span>
              </div>
              <div class="step" :class="{ active: state.progress > 75 }">
                <div class="step-icon">✅</div>
                <span>Validation</span>
              </div>
            </div>

            <!-- Cancel Button -->
            <button @click="cancelProcessing" class="btn btn-secondary">
              Cancel Processing
            </button>
          </div>
        </div>

        <!-- Results Section -->
        <div class="results-section" v-if="isComplete">
          <div class="results-header">
            <h2>Processing Complete!</h2>
            <p>Your PDF has been successfully processed</p>
          </div>

          <!-- Summary Stats -->
          <div class="summary-stats">
            <div class="stat-card">
              <div class="stat-number">{{ state.questions.length }}</div>
              <div class="stat-label">Questions Found</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ state.detectedDiagrams.length }}</div>
              <div class="stat-label">Diagrams Detected</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ averageConfidence }}%</div>
              <div class="stat-label">Avg Confidence</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ state.totalPages }}</div>
              <div class="stat-label">Pages Processed</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="results-actions">
            <NuxtLink 
              :to="`/review?data=${encodeURIComponent(JSON.stringify(state.questions))}`"
              class="btn btn-primary btn-large"
            >
              Review & Edit Diagrams
            </NuxtLink>
            <button @click="exportResults" class="btn btn-secondary btn-large">
              Export Results
            </button>
            <button @click="startOver" class="btn btn-outline btn-large">
              Process Another PDF
            </button>
          </div>

          <!-- Quick Preview -->
          <div class="quick-preview" v-if="state.questions.length > 0">
            <h3>Quick Preview</h3>
            <div class="preview-grid">
              <div 
                v-for="(question, index) in state.questions.slice(0, 6)" 
                :key="question.id"
                class="preview-card"
              >
                <div class="preview-header">
                  <span class="question-number">Q{{ index + 1 }}</span>
                  <span class="question-type">{{ question.type }}</span>
                </div>
                <div class="preview-content">
                  <p class="question-text">{{ truncateText(question.text, 100) }}</p>
                  <div v-if="question.hasDiagram" class="diagram-indicator">
                    <span class="diagram-count">{{ question.diagrams.length }} diagram(s)</span>
                    <span class="confidence-badge">
                      {{ Math.round(question.confidence * 100) }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Section -->
        <div class="error-section" v-if="hasErrors">
          <div class="error-card">
            <div class="error-header">
              <h3>⚠️ Processing Errors</h3>
              <p>Some issues occurred during processing</p>
            </div>
            <div class="error-list">
              <div 
                v-for="(error, index) in state.errors" 
                :key="index"
                class="error-item"
              >
                {{ error }}
              </div>
            </div>
            <div class="error-actions">
              <button @click="retryProcessing" class="btn btn-primary">
                Retry Processing
              </button>
              <button @click="clearErrors" class="btn btn-secondary">
                Clear Errors
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DiagramDetectionProvider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDiagramDetection } from '~/composables/useDiagramDetection'

// Meta tags
useHead({
  title: 'Upload PDF - Advanced Diagram Detection',
  meta: [
    {
      name: 'description',
      content: 'Upload your educational PDF to start AI-powered diagram detection and processing'
    }
  ]
})

// Composables
const { 
  state, 
  processPDF, 
  retryProcessing: retry, 
  exportData, 
  clearErrors: clear, 
  reset,
  hasErrors,
  isComplete
} = useDiagramDetection()

// Reactive state
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const isProcessing = ref(false)

const processingConfig = ref({
  confidenceThreshold: 0.7,
  batchSize: 5,
  enableAutoDetection: true,
  enableFallbackDetection: true
})

// Computed properties
const averageConfidence = computed(() => {
  if (state.value.questions.length === 0) return 0
  const total = state.value.questions.reduce((sum, q) => sum + q.confidence, 0)
  return Math.round((total / state.value.questions.length) * 100)
})

// Methods
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    validateAndSetFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const file = event.dataTransfer?.files[0]
  if (file) {
    validateAndSetFile(file)
  }
}

const validateAndSetFile = (file: File) => {
  // Validate file type
  if (file.type !== 'application/pdf') {
    alert('Please select a PDF file')
    return
  }
  
  // Validate file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    alert('File size must be less than 50MB')
    return
  }
  
  selectedFile.value = file
}

const startProcessing = async () => {
  if (!selectedFile.value) return
  
  try {
    isProcessing.value = true
    await processPDF(selectedFile.value)
  } catch (error) {
    console.error('Processing failed:', error)
  } finally {
    isProcessing.value = false
  }
}

const cancelProcessing = () => {
  isProcessing.value = false
  reset()
}

const retryProcessing = async () => {
  if (!selectedFile.value) return
  
  try {
    isProcessing.value = true
    await retry(selectedFile.value)
  } catch (error) {
    console.error('Retry failed:', error)
  } finally {
    isProcessing.value = false
  }
}

const exportResults = async () => {
  try {
    const blob = await exportData()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagram-detection-results-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export failed:', error)
    alert('Failed to export results')
  }
}

const clearErrors = () => {
  clear()
}

const startOver = () => {
  selectedFile.value = null
  reset()
}

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.upload-page {
  min-height: 100vh;
  padding: 40px 0;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 15px;
}

.page-header p {
  font-size: 1.2rem;
  color: #666;
}

/* Upload Section */
.upload-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 40px;
  margin-bottom: 60px;
}

.upload-area {
  background: white;
  border: 3px dashed #ddd;
  border-radius: 12px;
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #667eea;
  background: #f8f9ff;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.upload-area h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.upload-area p {
  color: #666;
  margin-bottom: 30px;
}

.upload-requirements {
  text-align: left;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
}

.upload-requirements h4 {
  margin-bottom: 15px;
  color: #333;
}

.upload-requirements ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.upload-requirements li {
  padding: 5px 0;
  color: #4caf50;
}

/* Config Panel */
.config-panel {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.config-panel h3 {
  margin-bottom: 25px;
  color: #333;
}

.config-group {
  margin-bottom: 20px;
}

.config-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.range-input {
  width: 100%;
  margin-right: 10px;
}

.range-value {
  font-weight: bold;
  color: #667eea;
}

.number-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

/* Processing Section */
.processing-section {
  display: flex;
  justify-content: center;
  margin-bottom: 60px;
}

.processing-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.processing-header h2 {
  color: #333;
  margin-bottom: 10px;
}

.processing-header p {
  color: #666;
  margin-bottom: 30px;
}

.progress-container {
  margin-bottom: 30px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.progress-text {
  font-weight: 600;
  color: #667eea;
}

.status-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.status-item {
  text-align: center;
}

.status-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
}

.status-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.processing-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.step span {
  font-size: 0.9rem;
  color: #666;
}

/* Results Section */
.results-section {
  text-align: center;
}

.results-header h2 {
  color: #4caf50;
  margin-bottom: 10px;
}

.results-header p {
  color: #666;
  margin-bottom: 40px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  padding: 30px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 10px;
}

.stat-label {
  color: #666;
  font-weight: 500;
}

.results-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 60px;
}

/* Quick Preview */
.quick-preview {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: left;
}

.quick-preview h3 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.preview-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: #f9f9f9;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.question-number {
  font-weight: bold;
  color: #667eea;
}

.question-type {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.question-text {
  color: #333;
  margin-bottom: 15px;
  line-height: 1.5;
}

.diagram-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diagram-count {
  color: #4caf50;
  font-size: 0.9rem;
}

.confidence-badge {
  background: #4caf50;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

/* Error Section */
.error-section {
  margin-bottom: 60px;
}

.error-card {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
}

.error-header h3 {
  color: #e53e3e;
  margin-bottom: 10px;
}

.error-header p {
  color: #666;
  margin-bottom: 20px;
}

.error-list {
  text-align: left;
  margin-bottom: 20px;
}

.error-item {
  background: white;
  border: 1px solid #fed7d7;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
  color: #e53e3e;
}

.error-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  cursor: pointer;
}

.btn-large {
  padding: 16px 32px;
  font-size: 1.1rem;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd8;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border-color: #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

/* Responsive Design */
@media (max-width: 768px) {
  .upload-section {
    grid-template-columns: 1fr;
  }
  
  .upload-area {
    padding: 40px 20px;
  }
  
  .processing-steps {
    flex-direction: column;
    gap: 20px;
  }
  
  .results-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .preview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-header h1 {
    font-size: 2rem;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .error-actions {
    flex-direction: column;
  }
}
</style>