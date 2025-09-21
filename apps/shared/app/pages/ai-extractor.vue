<template>
  <div class="min-h-screen bg-gray-50 overflow-y-auto">
    <Head>
      <Title>AI PDF Extractor - Rankify</Title>
      <Meta name="description" content="Extract questions from PDF using AI-powered analysis" />
    </Head>
    
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-3 mb-4">
          <Icon name="lucide:sparkles" class="h-8 w-8 text-blue-600" />
          <h1 class="text-4xl font-bold text-gray-900">AI PDF Extractor</h1>
          <button 
            @click="showSettings = true"
            class="ml-auto p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            title="Settings"
          >
            <Icon name="lucide:settings" class="h-6 w-6" />
          </button>
        </div>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload your PDF and let Google Gemini AI automatically extract questions with confidence scoring and diagram detection.
        </p>
        <div class="flex items-center justify-center gap-2 mt-2">
          <Icon name="lucide:zap" class="h-4 w-4 text-green-600" />
          <span class="text-sm text-green-700 font-medium">10x faster than manual cropping</span>
        </div>
      </div>

      <!-- API Key Section -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6" v-if="!isApiKeyValid">
        <div class="flex items-center gap-3 mb-4">
          <Icon name="lucide:key" class="h-6 w-6 text-blue-600" />
          <h2 class="text-xl font-semibold text-gray-900">Google Gemini API Key</h2>
        </div>
        
        <div class="space-y-4">
          <div>
            <label for="api-key" class="block text-sm font-medium text-gray-700 mb-2">
              Enter your Google Gemini API Key
            </label>
            <div class="flex gap-3">
              <input
                id="api-key"
                v-model="apiKey"
                type="password"
                placeholder="Enter your API key here..."
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="api-key-input"
                @blur="validateApiKey"
              />
              <button
                @click="validateApiKey"
                :disabled="!apiKey || isValidatingKey"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon v-if="isValidatingKey" name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                <Icon v-else name="lucide:check" class="h-4 w-4" />
              </button>
            </div>
            
            <!-- API Key Status -->
            <div class="mt-2">
              <div v-if="apiKeyStatus === 'valid'" class="flex items-center gap-2 text-green-700" data-testid="api-key-valid">
                <Icon name="lucide:check-circle" class="h-4 w-4" />
                <span class="text-sm">API key is valid</span>
              </div>
              <div v-else-if="apiKeyStatus === 'invalid'" class="flex items-center gap-2 text-red-700" data-testid="api-key-invalid">
                <Icon name="lucide:x-circle" class="h-4 w-4" />
                <span class="text-sm">Invalid API key. Please check and try again.</span>
              </div>
            </div>
          </div>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <Icon name="lucide:info" class="h-5 w-5 text-blue-600 mt-0.5" />
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">Don't have an API key?</p>
                <p class="mb-2">Get a free Google Gemini API key from Google AI Studio:</p>
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
                >
                  <Icon name="lucide:external-link" class="h-4 w-4" />
                  Get API Key
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- File Upload Section -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6" :class="{ 'opacity-50': !isApiKeyValid }">
        <div class="flex items-center gap-3 mb-4">
          <Icon name="lucide:upload" class="h-6 w-6 text-blue-600" />
          <h2 class="text-xl font-semibold text-gray-900">Upload PDF File</h2>
        </div>
        
        <!-- Drop Zone -->
        <div 
          class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
          :class="{ 'border-blue-400 bg-blue-50': isDragging }"
          @drop="handleDrop"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          data-testid="drop-zone"
        >
          <Icon name="lucide:upload-cloud" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div class="space-y-2">
            <p class="text-lg font-medium text-gray-700">
              Drop your PDF file here, or 
              <label class="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                browse
                <input 
                  type="file" 
                  accept=".pdf" 
                  class="hidden" 
                  @change="handleFileSelect"
                  data-testid="file-input"
                />
              </label>
            </p>
            <p class="text-sm text-gray-500">Maximum file size: 50MB</p>
          </div>
        </div>
        
        <!-- Selected File Info -->
        <div v-if="selectedFile" class="mt-4 p-4 bg-gray-50 rounded-lg" data-testid="file-selected">
          <div class="flex items-center gap-3">
            <Icon name="lucide:file-text" class="h-6 w-6 text-blue-600" />
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ selectedFile.name }}</p>
              <p class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <button @click="selectedFile = null" class="text-gray-400 hover:text-gray-600">
              <Icon name="lucide:x" class="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <!-- File Error -->
        <div v-if="fileError" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg" data-testid="file-error">
          <div class="flex items-center gap-2 text-red-700">
            <Icon name="lucide:alert-circle" class="h-5 w-5" />
            <span class="text-sm font-medium">{{ fileError }}</span>
          </div>
        </div>
      </div>

      <!-- Extract Button -->
      <div class="text-center mb-6">
        <button
          @click="extractQuestions"
          :disabled="!canExtract"
          class="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="extract-button"
        >
          <Icon v-if="isProcessing" name="lucide:loader-2" class="h-5 w-5 animate-spin inline mr-2" />
          <Icon v-else name="lucide:sparkles" class="h-5 w-5 inline mr-2" />
          {{ isProcessing ? 'Extracting Questions...' : 'Extract Questions with AI' }}
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="isProcessing" class="mb-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center gap-3 mb-4">
            <Icon name="lucide:brain" class="h-6 w-6 text-blue-600" />
            <h3 class="text-lg font-semibold">AI Processing in Progress</h3>
          </div>
          
          <div class="space-y-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" :style="{ width: progress + '%' }"></div>
            </div>
            <p class="text-sm text-gray-600 text-center" data-testid="progress-text">
              {{ progressText }}
            </p>
          </div>
        </div>
      </div>

      <!-- Results Section -->
      <div v-if="extractedQuestions.length > 0" class="bg-white rounded-lg shadow-md p-6" data-testid="results-section">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <Icon name="lucide:check-circle" class="h-6 w-6 text-green-600" />
            <h2 class="text-xl font-semibold text-gray-900">Extraction Complete!</h2>
          </div>
          <div class="text-sm text-gray-500">
            {{ extractedQuestions.length }} questions extracted
          </div>
        </div>
        
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-600">{{ extractedQuestions.length }}</div>
            <div class="text-sm text-blue-700">Total Questions</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-600">{{ averageConfidence.toFixed(1) }}</div>
            <div class="text-sm text-green-700">Avg Confidence</div>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ lowConfidenceCount }}</div>
            <div class="text-sm text-yellow-700">Need Review</div>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-purple-600">{{ diagramCount }}</div>
            <div class="text-sm text-purple-700">With Diagrams</div>
          </div>
        </div>
        
        <!-- Questions Preview -->
        <div class="space-y-4 mb-6">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">
              All Questions ({{ filteredQuestions.length }}{{ searchQuery ? ` of ${extractedQuestions.length}` : '' }})
            </h3>
            
            <!-- Search and Navigation -->
            <div class="flex items-center gap-4">
              <!-- Search Questions -->
              <div class="flex items-center gap-2">
                <Icon name="lucide:search" class="h-4 w-4 text-gray-500" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search questions..."
                  class="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                />
              </div>
              
              <!-- Go to Question -->
              <div class="flex items-center gap-2">
                <label for="goto-question" class="text-sm text-gray-600">Go to:</label>
                <select 
                  id="goto-question"
                  v-model="selectedQuestionIndex"
                  @change="scrollToQuestion"
                  class="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
                >
                  <option value="">Select Question</option>
                  <option 
                    v-for="(question, index) in filteredQuestions" 
                    :key="question.id" 
                    :value="index"
                  >
                    Q{{ index + 1 }} - {{ question.type }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- All Questions List -->
          <div class="max-h-[600px] overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-4 bg-white">
            <!-- No Results Message -->
            <div v-if="filteredQuestions.length === 0 && searchQuery" class="text-center py-8 text-gray-500">
              <Icon name="lucide:search-x" class="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p class="text-lg font-medium">No questions found</p>
              <p class="text-sm">Try adjusting your search terms</p>
              <button 
                @click="searchQuery = ''"
                class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
              >
                Clear Search
              </button>
            </div>
            
            <!-- Questions -->
            <div 
              v-for="(question, index) in filteredQuestions" 
              :key="question.id"
              :id="`question-${index}`"
              class="border border-gray-200 rounded-lg p-4 scroll-mt-4"
              :class="{ 
                'border-red-300 bg-red-50': question.confidence < 3,
                'border-blue-300 bg-blue-50': selectedQuestionIndex === index
              }"
              data-testid="question-card"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Q{{ index + 1 }}</span>
                  <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{{ question.type }}</span>
                  <span v-if="question.hasDiagram" class="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium" data-testid="diagram-badge" title="This question contains or references visual elements like graphs, diagrams, or images">
                    📊 Has Diagram
                  </span>
                  <span v-if="question.confidence < 3" class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    ⚠️ Low Confidence
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500" />
                  <span class="text-sm font-medium" data-testid="confidence-score">{{ question.confidence.toFixed(1) }}</span>
                </div>
              </div>
              
              <p class="text-gray-900 mb-2 font-medium">{{ question.text }}</p>
              
              <div v-if="question.options && question.options.length > 0" class="mb-2">
                <span class="text-sm font-medium text-gray-700">Options:</span>
                <ul class="mt-1 space-y-1">
                  <li 
                    v-for="(option, optIndex) in question.options" 
                    :key="optIndex"
                    class="text-sm text-gray-600 pl-4"
                    :class="{ 'font-medium text-green-700': option === question.correctAnswer }"
                  >
                    {{ option }}
                    <span v-if="option === question.correctAnswer" class="text-green-600 ml-1">✓</span>
                  </li>
                </ul>
              </div>
              
              <div v-if="question.correctAnswer && (!question.options || question.options.length === 0)" class="text-sm text-green-700">
                <span class="font-medium">Answer:</span> {{ question.correctAnswer }}
              </div>
              
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span v-if="question.subject">Subject: {{ question.subject }}</span>
                <span v-if="question.section">Section: {{ question.section }}</span>
              </div>
            </div>
          </div>
          
          <!-- Question Navigation -->
          <div class="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <div class="flex items-center gap-4">
              <span>📊 Total: {{ extractedQuestions.length }}</span>
              <span class="text-orange-600">🖼️ With Diagrams: {{ extractedQuestions.filter(q => q.hasDiagram).length }}</span>
              <span class="text-green-600">✅ High Confidence: {{ extractedQuestions.filter(q => q.confidence >= 4).length }}</span>
              <span class="text-yellow-600">⚠️ Medium: {{ extractedQuestions.filter(q => q.confidence >= 2.5 && q.confidence < 4).length }}</span>
              <span class="text-red-600">🔍 Low: {{ extractedQuestions.filter(q => q.confidence < 2.5).length }}</span>
            </div>
            <button 
              @click="scrollToTop"
              class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              ↑ Back to Top
            </button>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3 justify-center mt-6">
          <button
            @click="goToReview"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Icon name="lucide:edit-3" class="h-4 w-4" />
            Review & Edit
          </button>
          <button
            @click="exportJSON"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Icon name="lucide:download" class="h-4 w-4" />
            Export JSON
          </button>
          <button
            @click="goToCBT"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Icon name="lucide:play-circle" class="h-4 w-4" />
            Take Test (CBT)
          </button>
        </div>
      </div>

      <!-- Error Section -->
      <PDFProcessingError 
        v-if="errorMessage" 
        :error-message="errorMessage"
        @retry="retryExtraction"
        @manual-input="goToManualInput"
      />
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Settings</h3>
            <button @click="showSettings = false" class="text-gray-400 hover:text-gray-600">
              <Icon name="lucide:x" class="h-6 w-6" />
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label for="settings-api-key" class="block text-sm font-medium text-gray-700 mb-2">
                Google Gemini API Key
              </label>
              <input
                id="settings-api-key"
                v-model="apiKey"
                type="password"
                placeholder="Enter your API key here..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                @click="validateApiKey"
                :disabled="!apiKey || isValidatingKey"
                class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Icon v-if="isValidatingKey" name="lucide:loader-2" class="h-4 w-4 animate-spin inline mr-2" />
                <Icon v-else name="lucide:check" class="h-4 w-4 inline mr-2" />
                Validate Key
              </button>
            </div>
            
            <div>
              <label for="model" class="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                id="model"
                v-model="selectedModel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Best Quality)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Faster)</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fastest)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy)</option>
              </select>
            </div>
            
            <div class="flex items-center">
              <input
                id="enable-diagram-detection"
                v-model="enableDiagramDetection"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="enable-diagram-detection" class="ml-2 block text-sm text-gray-700">
                Enable diagram detection
              </label>
            </div>
            
            <div class="flex items-center">
              <input
                id="enable-cache"
                v-model="enableCache"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="enable-cache" class="ml-2 block text-sm text-gray-700">
                Enable caching
              </label>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button
              @click="showSettings = false"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              @click="saveSettings"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { simpleAIUtils } from '../utils/simpleAIExtractor'

// Page for AI-powered PDF extraction
definePageMeta({
  title: 'AI PDF Extractor',
  description: 'Extract questions from PDF using AI-powered analysis'
  // middleware: 'ai-features' // Temporarily disabled
})

// Reactive state
const apiKey = ref('')
const apiKeyStatus = ref('') // 'valid', 'invalid', ''
const isValidatingKey = ref(false)
const selectedFile = ref<File | null>(null)
const fileError = ref('')
const isDragging = ref(false)
const isProcessing = ref(false)
const progress = ref(0)
const progressText = ref('')
const extractedQuestions = ref<any[]>([])
const errorMessage = ref('')
const showSettings = ref(false)
const selectedModel = ref('gemini-2.5-flash')
const enableDiagramDetection = ref(true)
const enableCache = ref(true)
const selectedQuestionIndex = ref<number | string>('')
const searchQuery = ref('')

// Computed properties
const isApiKeyValid = computed(() => apiKeyStatus.value === 'valid')
const canExtract = computed(() => isApiKeyValid.value && selectedFile.value && !isProcessing.value)

const averageConfidence = computed(() => {
  if (extractedQuestions.value.length === 0) return 0
  const total = extractedQuestions.value.reduce((sum, q) => sum + (q.confidence || 0), 0)
  return total / extractedQuestions.value.length
})

const lowConfidenceCount = computed(() => {
  return extractedQuestions.value.filter(q => (q.confidence || 0) < 3).length
})

const diagramCount = computed(() => {
  return extractedQuestions.value.filter(q => q.hasDiagram).length
})

const filteredQuestions = computed(() => {
  if (!searchQuery.value.trim()) {
    return extractedQuestions.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return extractedQuestions.value.filter(question => 
    question.text.toLowerCase().includes(query) ||
    question.type.toLowerCase().includes(query) ||
    (question.subject && question.subject.toLowerCase().includes(query)) ||
    (question.section && question.section.toLowerCase().includes(query)) ||
    (question.options && question.options.some((opt: string) => opt.toLowerCase().includes(query)))
  )
})

// Methods
const validateApiKey = async () => {
  if (!apiKey.value.trim()) {
    apiKeyStatus.value = ''
    return
  }
  
  isValidatingKey.value = true
  
  try {
    // Use the simple validator
    if (simpleAIUtils.validateApiKey(apiKey.value)) {
      apiKeyStatus.value = 'valid'
      // Store securely in localStorage (in production, use proper encryption)
      localStorage.setItem('gemini_api_key', apiKey.value)
    } else {
      apiKeyStatus.value = 'invalid'
    }
  } catch (error) {
    console.error('API key validation error:', error)
    apiKeyStatus.value = 'invalid'
  } finally {
    isValidatingKey.value = false
  }
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
  isDragging.value = false
  
  const file = event.dataTransfer?.files[0]
  if (file) {
    validateAndSetFile(file)
  }
}

const validateAndSetFile = (file: File) => {
  fileError.value = ''
  
  // Validate file type
  if (file.type !== 'application/pdf') {
    fileError.value = 'Please select a PDF file only.'
    return
  }
  
  // Validate file size (50MB limit)
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    fileError.value = 'File size must be less than 50MB.'
    return
  }
  
  selectedFile.value = file
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const saveSettings = () => {
  // Save settings to localStorage
  localStorage.setItem('gemini_api_key', apiKey.value)
  localStorage.setItem('gemini_model', selectedModel.value)
  localStorage.setItem('enable_diagram_detection', enableDiagramDetection.value.toString())
  localStorage.setItem('enable_cache', enableCache.value.toString())
  
  // Close the settings modal
  showSettings.value = false
  
  // Revalidate API key if it changed
  if (apiKey.value) {
    validateApiKey()
  }
}

const extractQuestions = async () => {
  if (!canExtract.value) return
  
  isProcessing.value = true
  progress.value = 0
  progressText.value = 'Preparing PDF for processing...'
  errorMessage.value = ''
  
  try {
    // Create the extraction engine with current settings
    const extractor = simpleAIUtils.createExtractor(apiKey.value, {
      geminiModel: selectedModel.value,
      maxFileSizeMB: 50
    })
    
    // Process with progress updates
    const result = await extractor.extractFromPDF(selectedFile.value!, selectedFile.value!.name, {
      onProgress: (progressData) => {
        progress.value = progressData.progress
        progressText.value = progressData.message
      }
    })
    
    // Set the extracted questions
    extractedQuestions.value = result.questions
    
  } catch (error: any) {
    console.error('Extraction error:', error)
    
    // Provide more helpful error messages
    let userMessage = error.message || 'Failed to extract questions.'
    
    if (error.message?.includes('WASM') || error.message?.includes('WebAssembly')) {
      userMessage = 'PDF processing engine failed to load. This may be due to browser security restrictions. Please try refreshing the page, using a different browser (Chrome/Firefox recommended), or try a smaller PDF file.'
    } else if (error.message?.includes('timeout')) {
      userMessage = 'PDF processing took too long. Please try a smaller PDF file or check your internet connection.'
    } else if (error.message?.includes('API key')) {
      userMessage = 'Invalid API key. Please check your Google Gemini API key and try again.'
    }
    
    errorMessage.value = userMessage
  } finally {
    isProcessing.value = false
  }
}

const retryExtraction = () => {
  errorMessage.value = ''
  extractQuestions()
}

const goToManualInput = () => {
  // Navigate to manual question input page
  navigateTo('/manual-input')
}

const scrollToQuestion = () => {
  if (selectedQuestionIndex.value !== '') {
    const element = document.getElementById(`question-${selectedQuestionIndex.value}`)
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
      // Briefly highlight the selected question
      setTimeout(() => {
        selectedQuestionIndex.value = ''
      }, 2000)
    }
  }
}

const scrollToTop = () => {
  window.scrollTo({ 
    top: 0, 
    behavior: 'smooth' 
  })
}

const goToReview = () => {
  // Navigate to review interface with extracted questions
  const questionsData = JSON.stringify(extractedQuestions.value)
  const fileName = selectedFile.value?.name || 'extracted-questions.pdf'
  
  navigateTo({
    path: '/review-interface',
    query: {
      questions: questionsData,
      fileName: fileName
    }
  })
}

const exportJSON = () => {
  const data = {
    questions: extractedQuestions.value,
    metadata: {
      fileName: selectedFile.value?.name,
      extractedAt: new Date().toISOString(),
      totalQuestions: extractedQuestions.value.length,
      averageConfidence: averageConfidence.value,
      lowConfidenceCount: lowConfidenceCount.value,
      diagramCount: diagramCount.value,
      generatedBy: 'aiExtractorPage',
      version: '1.0.0'
    }
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedFile.value?.name?.replace('.pdf', '') || 'questions'}-ai-extracted.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const goToCBT = () => {
  // Navigate to CBT interface with extracted questions
  const testData = {
    questions: extractedQuestions.value,
    metadata: {
      generatedBy: 'aiExtractorPage',
      aiMetadata: {
        totalConfidence: averageConfidence.value,
        lowConfidenceCount: lowConfidenceCount.value,
        diagramQuestionsCount: diagramCount.value
      }
    }
  }
  
  // Store in localStorage for CBT interface to pick up
  localStorage.setItem('cbt_test_data', JSON.stringify(testData))
  
  navigateTo('/cbt/interface')
}

// Load saved API key and settings on mount
onMounted(() => {
  const savedApiKey = localStorage.getItem('gemini_api_key')
  if (savedApiKey) {
    apiKey.value = savedApiKey
    apiKeyStatus.value = 'valid'
  }
  
  const savedModel = localStorage.getItem('gemini_model')
  if (savedModel) {
    selectedModel.value = savedModel
  }
  
  const savedDiagramDetection = localStorage.getItem('enable_diagram_detection')
  if (savedDiagramDetection) {
    enableDiagramDetection.value = savedDiagramDetection === 'true'
  }
  
  const savedCache = localStorage.getItem('enable_cache')
  if (savedCache) {
    enableCache.value = savedCache === 'true'
  }
})
</script>