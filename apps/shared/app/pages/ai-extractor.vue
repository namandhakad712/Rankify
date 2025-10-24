<template>
  <div class="min-h-screen bg-background">
    <Head>
      <Title>AI PDF Extractor - Rankify</Title>
      <Meta name="description" content="Extract questions from PDF using AI-powered analysis with confidence scoring" />
    </Head>

    <!-- Custom Header for AI Extractor -->
    <header class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <!-- Left Side: Logo and Title -->
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Icon name="lucide:file-text" class="h-6 w-6" />
            <span class="font-bold text-lg">Rankify</span>
          </NuxtLink>
          
          <div class="h-6 w-px bg-border"></div>
          
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full">
              <Icon name="lucide:wifi" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span class="text-sm font-semibold text-blue-700 dark:text-blue-300">Online Mode</span>
            </div>
            <h1 class="text-lg font-semibold hidden sm:block">AI PDF Extractor</h1>
          </div>
        </div>

        <!-- Right Side: Settings and Theme Toggle -->
        <div class="flex items-center gap-2">
          <div v-if="apiKeyStatus" class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" :class="apiKeyStatus === 'verified' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'">
            <Icon :name="apiKeyStatus === 'verified' ? 'lucide:check-circle' : 'lucide:alert-circle'" class="h-3 w-3" />
            <span>{{ apiKeyStatus === 'verified' ? 'API Connected' : 'API Not Set' }}</span>
          </div>
          
          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 border border-slate-300 dark:border-slate-600 relative group"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Icon v-if="isDark" name="lucide:sun" class="h-5 w-5 text-yellow-500 transition-transform group-hover:rotate-45" />
            <Icon v-else name="lucide:moon" class="h-5 w-5 text-slate-700 dark:text-slate-300 transition-transform group-hover:-rotate-12" />
            
            <!-- Tooltip -->
            <span class="absolute -bottom-10 right-0 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {{ isDark ? 'Light mode' : 'Dark mode' }}
            </span>
          </button>
          
          <UiButton variant="outline" size="sm" @click="showSettings = true">
            <Icon name="lucide:settings" class="h-4 w-4 mr-2" />
            <span class="hidden sm:inline">Settings</span>
          </UiButton>
        </div>
      </div>
    </header>

    <!-- Main Content Area with Proper Scrolling -->
    <div class="container mx-auto px-4 py-6 pb-20">
      <!-- Upload Section -->
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- Quick Info Banner -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <Icon name="lucide:sparkles" class="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="flex-1">
              <h2 class="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                AI-Powered Question Extraction
              </h2>
              <p class="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Upload your PDF and let AI automatically extract questions with confidence scoring. Supports MCQ, MSQ, NAT, and diagram detection.
              </p>
              <div class="flex flex-wrap gap-2">
                <div class="flex items-center gap-1 text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  <Icon name="lucide:zap" class="h-3 w-3 text-blue-600" />
                  <span>Fast Extraction</span>
                </div>
                <div class="flex items-center gap-1 text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  <Icon name="lucide:shield-check" class="h-3 w-3 text-green-600" />
                  <span>Confidence Scores</span>
                </div>
                <div class="flex items-center gap-1 text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  <Icon name="lucide:image" class="h-3 w-3 text-orange-600" />
                  <span>Diagram Detection</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Upload Card -->
        <UiCard class="p-8 border-2 border-slate-200 dark:border-slate-800 shadow-lg">
          <div class="text-center space-y-6">
            <div class="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Icon name="lucide:upload" class="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            
            <div>
              <h3 class="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Upload Your PDF</h3>
              <p class="text-slate-600 dark:text-slate-400">
                Select a PDF file containing questions (max 10MB)
              </p>
            </div>

            <div class="max-w-md mx-auto">
              <input
                ref="fileInput"
                type="file"
                accept="application/pdf"
                class="hidden"
                @change="handleFileSelect"
              />
              
              <UiButton
                size="lg"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                :disabled="!isConfigured || isProcessing || isUploading"
                @click="$refs.fileInput?.click()"
              >
                <Icon name="lucide:file-plus" class="h-5 w-5 mr-2" />
                {{ selectedFile ? 'Change PDF' : 'Select PDF File' }}
              </UiButton>

              <div v-if="!isConfigured" class="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-300 dark:border-orange-800 rounded-lg p-4 mt-3">
                <div class="flex items-start gap-3">
                  <Icon name="lucide:alert-circle" class="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                      API Key Required
                    </p>
                    <p class="text-xs text-orange-700 dark:text-orange-300 mb-2">
                      Please configure and verify your Gemini API key in Settings to start extracting questions.
                    </p>
                    <UiButton variant="outline" size="sm" class="border-orange-400 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-950" @click="showSettings = true">
                      <Icon name="lucide:settings" class="h-3 w-3 mr-2" />
                      Open Settings
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Upload Progress -->
            <div v-if="isUploading" class="max-w-md mx-auto">
              <div class="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800 rounded-lg p-4">
                <div class="flex items-center gap-3 mb-3">
                  <Icon name="line-md:uploading-loop" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span class="text-sm font-semibold text-blue-900 dark:text-blue-100">Uploading PDF...</span>
                </div>
                
                <div class="space-y-2">
                  <div class="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                    <span>Progress</span>
                    <span class="font-bold">{{ uploadProgress }}%</span>
                  </div>
                  <div class="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2.5 overflow-hidden">
                    <div
                      class="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      :style="{ width: `${uploadProgress}%` }"
                    >
                      <div class="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <p class="text-xs text-blue-600 dark:text-blue-400 text-center">
                    Please wait while we process your file...
                  </p>
                </div>
              </div>
            </div>

            <!-- Selected File Display -->
            <div v-if="selectedFile && !isUploading" class="bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-lg p-4 max-w-md mx-auto">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Icon name="lucide:file-text" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div class="text-left">
                    <p class="font-medium text-sm text-slate-900 dark:text-slate-100">{{ selectedFile.name }}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400">{{ formatFileSize(selectedFile.size) }}</p>
                  </div>
                </div>
                <UiButton
                  variant="ghost"
                  size="sm"
                  class="hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                  @click="clearFile"
                >
                  <Icon name="lucide:x" class="h-4 w-4" />
                </UiButton>
              </div>
            </div>

            <!-- Start Extraction Button -->
            <UiButton
              v-if="selectedFile && !isUploading"
              size="lg"
              class="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
              :disabled="isProcessing"
              @click="startExtraction"
            >
              <Icon v-if="isProcessing" name="line-md:uploading-loop" class="h-5 w-5 mr-2" />
              <Icon v-else name="lucide:sparkles" class="h-5 w-5 mr-2" />
              {{ isProcessing ? 'Extracting...' : 'Start AI Extraction' }}
            </UiButton>
          </div>
        </UiCard>

        <!-- Progress Section -->
        <UiCard v-if="isProcessing && extractionProgress" class="p-6">
          <h3 class="text-lg font-semibold mb-4">Extraction Progress</h3>
          
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="capitalize">{{ extractionProgress.stage.replace('_', ' ') }}</span>
                <span class="font-semibold">{{ extractionProgress.progress }}%</span>
              </div>
              <div class="w-full bg-muted rounded-full h-2">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${extractionProgress.progress}%` }"
                />
              </div>
            </div>
            
            <p class="text-sm text-muted-foreground">
              {{ extractionProgress.message }}
            </p>
          </div>
        </UiCard>

        <!-- Results Section -->
        <UiCard v-if="extractionResult" class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold">Extraction Results</h3>
            <div class="flex gap-2">
              <UiButton variant="outline" size="sm" @click="exportResults">
                <Icon name="lucide:download" class="h-4 w-4 mr-2" />
                Export
              </UiButton>
              <UiButton size="sm" @click="proceedToReview">
                <Icon name="lucide:arrow-right" class="h-4 w-4 mr-2" />
                Review Questions
              </UiButton>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-800">
              <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {{ extractionResult.questions.length }}
              </div>
              <div class="text-sm text-muted-foreground mt-1">Questions</div>
            </div>
            <div class="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
              <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                {{ extractionResult.confidence.toFixed(1) }}
              </div>
              <div class="text-sm text-muted-foreground mt-1">Confidence</div>
            </div>
            <div class="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 text-center border border-orange-200 dark:border-orange-800">
              <div class="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {{ extractionResult.questions.filter(q => q.hasDiagram).length }}
              </div>
              <div class="text-sm text-muted-foreground mt-1">Diagrams</div>
            </div>
            <div class="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 text-center border border-purple-200 dark:border-purple-800">
              <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {{ Math.round(extractionResult.processingTime / 1000) }}s
              </div>
              <div class="text-sm text-muted-foreground mt-1">Time Taken</div>
            </div>
          </div>

          <!-- Questions Preview -->
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="(question, idx) in extractionResult.questions.slice(0, 5)"
              :key="idx"
              class="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex gap-2">
                  <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                    {{ question.type }}
                  </span>
                  <span v-if="question.hasDiagram" class="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded">
                    Diagram
                  </span>
                </div>
                <div class="text-sm font-semibold" :class="getConfidenceColor(question.confidence)">
                  {{ question.confidence }}/5
                </div>
              </div>
              <p class="text-sm line-clamp-2">{{ question.text }}</p>
            </div>
            
            <p v-if="extractionResult.questions.length > 5" class="text-center text-sm text-muted-foreground py-2">
              +{{ extractionResult.questions.length - 5 }} more questions
            </p>
          </div>
        </UiCard>

        <!-- Error Section -->
        <UiCard v-if="extractionError" class="p-6 border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <div class="flex items-start gap-3">
            <Icon name="lucide:alert-circle" class="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
              <h3 class="font-bold text-lg text-red-900 dark:text-red-100 mb-2">Extraction Failed</h3>
              <p class="text-sm text-red-700 dark:text-red-300 mb-3">{{ extractionError }}</p>
              
              <!-- Helpful Tips -->
              <div class="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
                <p class="text-xs font-semibold text-red-900 dark:text-red-100 mb-2">💡 Troubleshooting Tips:</p>
                <ul class="text-xs text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                  <li>Ensure your PDF contains readable text (not scanned images)</li>
                  <li>Check that the file size is under 10MB</li>
                  <li>Verify your API key is correct and has quota remaining</li>
                  <li>Try refreshing the page and uploading again</li>
                  <li>If the issue persists, try a different PDF file</li>
                </ul>
              </div>
              
              <div class="flex gap-2">
                <UiButton variant="outline" size="sm" class="border-red-400 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30" @click="retryExtraction">
                  <Icon name="lucide:refresh-cw" class="h-4 w-4 mr-2" />
                  Retry Extraction
                </UiButton>
                <UiButton variant="outline" size="sm" class="border-red-400 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30" @click="clearFile">
                  <Icon name="lucide:x" class="h-4 w-4 mr-2" />
                  Clear & Start Over
                </UiButton>
              </div>
            </div>
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Settings Dialog -->
    <UiDialog v-model:open="showSettings">
      <UiDialogContent class="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700">
        <UiDialogHeader class="border-b-2 border-slate-200 dark:border-slate-700 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Icon name="lucide:settings" class="h-5 w-5 text-white" />
            </div>
            <div>
              <UiDialogTitle class="text-xl">AI Extraction Settings</UiDialogTitle>
              <UiDialogDescription class="text-sm">
                Configure your API key and extraction preferences
              </UiDialogDescription>
            </div>
          </div>
        </UiDialogHeader>

        <div class="space-y-6 py-6">
          <!-- API Key -->
          <div class="space-y-2">
            <UiLabel for="api-key" class="text-slate-900 dark:text-slate-100 font-semibold">Gemini API Key *</UiLabel>
            <div class="flex gap-2">
              <UiInput
                id="api-key"
                v-model="config.apiKey"
                type="password"
                placeholder="AIzaSy..."
                class="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
              />
              <UiButton
                variant="outline"
                size="sm"
                :disabled="isVerifyingApi || !config.apiKey"
                @click="verifyApiKey"
              >
                <Icon v-if="isVerifyingApi" name="line-md:loading-loop" class="h-4 w-4 mr-2" />
                <Icon v-else name="lucide:check" class="h-4 w-4 mr-2" />
                {{ isVerifyingApi ? 'Verifying...' : 'Verify' }}
              </UiButton>
            </div>
            
            <!-- API Status -->
            <div v-if="apiKeyStatus" class="flex items-center gap-2 text-sm">
              <Icon
                :name="apiKeyStatus === 'verified' ? 'lucide:check-circle' : 'lucide:alert-circle'"
                class="h-4 w-4"
                :class="apiKeyStatus === 'verified' ? 'text-green-600' : 'text-orange-600'"
              />
              <span :class="apiKeyStatus === 'verified' ? 'text-green-600' : 'text-orange-600'">
                {{ apiKeyStatus === 'verified' ? 'API Key Verified ✓' : 'API Key Not Verified' }}
              </span>
            </div>
            
            <p class="text-xs text-muted-foreground">
              Get your free API key from
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                class="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <!-- Model Selection -->
          <div class="space-y-2">
            <UiLabel for="model" class="text-slate-900 dark:text-slate-100 font-semibold">AI Model</UiLabel>
            <select
              id="model"
              v-model="config.model"
              class="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              :disabled="availableModels.length === 0"
            >
              <optgroup label="Gemini 2.5 (Latest)" class="bg-background text-foreground">
                <option value="gemini-2.5-pro" class="bg-background text-foreground">
                  Gemini 2.5 Pro - Best Quality & Reasoning
                </option>
                <option value="gemini-2.5-flash" class="bg-background text-foreground">
                  Gemini 2.5 Flash - Balanced Speed & Quality
                </option>
                <option value="gemini-2.5-flash-lite" class="bg-background text-foreground">
                  Gemini 2.5 Flash Lite - Ultra Fast
                </option>
              </optgroup>
              
              <optgroup label="Gemini 2.0" class="bg-background text-foreground">
                <option value="gemini-2.0-flash" class="bg-background text-foreground">
                  Gemini 2.0 Flash - Fast & Efficient
                </option>
              </optgroup>
              
              <optgroup label="Gemini 1.5 (Legacy)" class="bg-background text-foreground">
                <option value="gemini-1.5-pro" class="bg-background text-foreground">
                  Gemini 1.5 Pro - High Quality
                </option>
                <option value="gemini-1.5-flash" class="bg-background text-foreground">
                  Gemini 1.5 Flash - Fast Processing
                </option>
              </optgroup>
            </select>
            
            <div v-if="availableModels.length > 0" class="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:check-circle" class="h-4 w-4 text-green-600 dark:text-green-400" />
                <span class="text-xs font-medium text-green-700 dark:text-green-300">
                  {{ availableModels.length }} models available with your API key
                </span>
              </div>
            </div>
            
            <div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p class="text-xs text-blue-700 dark:text-blue-300">
                <strong>Recommendation:</strong> Use Gemini 2.5 Flash for best balance of speed and accuracy.
              </p>
            </div>
          </div>

          <!-- Confidence Threshold -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <UiLabel class="text-slate-900 dark:text-slate-100 font-semibold">Confidence Threshold</UiLabel>
              <span class="text-sm font-semibold px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                {{ config.confidenceThreshold }}
              </span>
            </div>
            <input
              v-model="config.confidenceThreshold"
              type="range"
              min="1"
              max="5"
              step="0.5"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>1 (Low)</span>
              <span>3 (Medium)</span>
              <span>5 (High)</span>
            </div>
            <div class="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <p class="text-xs text-purple-700 dark:text-purple-300">
                Questions below this threshold will be flagged for manual review
              </p>
            </div>
          </div>

          <!-- Options -->
          <div class="space-y-3">
            <div class="bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
              <div class="flex items-start space-x-3">
                <input
                  id="diagram-detection"
                  v-model="config.enableDiagramDetection"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="flex-1">
                  <UiLabel for="diagram-detection" class="cursor-pointer font-medium text-slate-900 dark:text-slate-100">
                    Enable diagram detection
                  </UiLabel>
                  <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Automatically identify questions with images, graphs, or diagrams
                  </p>
                </div>
              </div>
              
              <div class="flex items-start space-x-3">
                <input
                  id="enable-cache"
                  v-model="config.enableCache"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="flex-1">
                  <UiLabel for="enable-cache" class="cursor-pointer font-medium text-slate-900 dark:text-slate-100">
                    Enable caching
                  </UiLabel>
                  <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Cache results for faster repeated extractions from similar PDFs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <UiDialogFooter class="border-t border-border pt-4 flex gap-2">
          <UiButton variant="outline" @click="showSettings = false" class="flex-1">
            <Icon name="lucide:x" class="h-4 w-4 mr-2" />
            Cancel
          </UiButton>
          <UiButton @click="saveSettings" class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Icon name="lucide:save" class="h-4 w-4 mr-2" />
            Save Settings
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getFeatureFlags } from '#layers/shared/app/composables/useFeatureFlags'
import { aiExtractionUtils, type AIExtractionProgress } from '#layers/shared/app/utils/aiExtractionUtils'
import type { AIExtractionResult } from '#layers/shared/app/utils/geminiAPIClient'

definePageMeta({
  title: 'AI PDF Extractor',
  description: 'Extract questions from PDF using AI-powered analysis',
  layout: false
})

// State
const showSettings = ref(false)
const selectedFile = ref<File | null>(null)
const isProcessing = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const extractionProgress = ref<AIExtractionProgress | null>(null)
const extractionResult = ref<AIExtractionResult | null>(null)
const extractionError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const apiKeyStatus = ref<'verified' | 'not-set' | null>(null)
const isVerifyingApi = ref(false)
const availableModels = ref<string[]>([])
const isDark = ref(false)

const config = ref({
  apiKey: '',
  model: 'gemini-2.5-flash',
  confidenceThreshold: 2.5,
  enableDiagramDetection: true,
  enableCache: true
})

// Computed
const isConfigured = computed(() => config.value.apiKey.length > 0 && apiKeyStatus.value === 'verified')

// Methods
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please select a smaller file.')
      return
    }
    
    // Start upload simulation
    isUploading.value = true
    uploadProgress.value = 0
    extractionResult.value = null
    extractionError.value = null
    
    // Simulate upload progress
    const fileSize = file.size
    const chunkSize = fileSize / 20 // 20 steps
    let loaded = 0
    
    const uploadInterval = setInterval(() => {
      loaded += chunkSize
      uploadProgress.value = Math.min(Math.round((loaded / fileSize) * 100), 100)
      
      if (uploadProgress.value >= 100) {
        clearInterval(uploadInterval)
        setTimeout(() => {
          selectedFile.value = file
          isUploading.value = false
          uploadProgress.value = 0
        }, 300)
      }
    }, 50) // Update every 50ms for smooth animation
  }
}

const clearFile = () => {
  selectedFile.value = null
  extractionResult.value = null
  extractionError.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getConfidenceColor = (score: number): string => {
  if (score >= 4.5) return 'text-green-600 dark:text-green-400'
  if (score >= 3.5) return 'text-blue-600 dark:text-blue-400'
  if (score >= 2.5) return 'text-yellow-600 dark:text-yellow-400'
  if (score >= 1.5) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

const startExtraction = async () => {
  if (!selectedFile.value || !isConfigured.value) return

  isProcessing.value = true
  extractionError.value = null
  extractionProgress.value = null

  try {
    const engine = aiExtractionUtils.createEngine(config.value.apiKey, {
      geminiModel: config.value.model,
      confidenceThreshold: config.value.confidenceThreshold,
      enableDiagramDetection: config.value.enableDiagramDetection,
      maxFileSizeMB: 10
    })

    const result = await engine.extractFromPDF(selectedFile.value, selectedFile.value.name, {
      enableCache: config.value.enableCache,
      onProgress: (progress) => {
        extractionProgress.value = progress
      }
    })

    extractionResult.value = result
  } catch (error: any) {
    extractionError.value = error.message || 'An unknown error occurred'
    console.error('Extraction failed:', error)
  } finally {
    isProcessing.value = false
  }
}

const retryExtraction = () => {
  extractionError.value = null
  startExtraction()
}

const exportResults = () => {
  if (!extractionResult.value) return
  
  const jsonString = JSON.stringify(extractionResult.value, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-extraction-${selectedFile.value?.name?.replace('.pdf', '') || 'result'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const proceedToReview = async () => {
  if (!extractionResult.value) return
  
  try {
    const reviewData = {
      questions: extractionResult.value.questions,
      fileName: selectedFile.value?.name || 'Unknown PDF',
      extractionMetadata: {
        confidence: extractionResult.value.confidence,
        processingTime: extractionResult.value.processingTime,
        totalQuestions: extractionResult.value.questions.length,
        timestamp: Date.now()
      }
    }
    
    localStorage.setItem('rankify-review-data', JSON.stringify(reviewData))
    await navigateTo('/review-interface')
  } catch (error) {
    console.error('Failed to proceed to review:', error)
  }
}

const verifyApiKey = async () => {
  if (!config.value.apiKey || config.value.apiKey.length < 10) {
    apiKeyStatus.value = 'not-set'
    return false
  }

  isVerifyingApi.value = true
  
  try {
    // Call Gemini API to list models - this verifies the API key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${config.value.apiKey}`
    )
    
    if (response.ok) {
      const data = await response.json()
      
      // Extract model names
      if (data.models && Array.isArray(data.models)) {
        availableModels.value = data.models
          .filter((m: any) => m.name.includes('gemini'))
          .map((m: any) => m.name.replace('models/', ''))
        
        console.log('✅ API Key verified! Available models:', availableModels.value)
      }
      
      apiKeyStatus.value = 'verified'
      return true
    } else {
      const error = await response.json()
      console.error('❌ API Key verification failed:', error)
      apiKeyStatus.value = 'not-set'
      return false
    }
  } catch (error) {
    console.error('❌ API Key verification error:', error)
    apiKeyStatus.value = 'not-set'
    return false
  } finally {
    isVerifyingApi.value = false
  }
}

const saveSettings = async () => {
  // Verify API key before saving
  const isValid = await verifyApiKey()
  
  if (isValid) {
    localStorage.setItem('rankify-ai-config', JSON.stringify(config.value))
    showSettings.value = false
  } else {
    // Show error in the dialog
    alert('Invalid API key. Please check your API key and try again.')
  }
}

// Theme management
const applyTheme = (dark: boolean) => {
  if (typeof document !== 'undefined') {
    const html = document.documentElement
    
    if (dark) {
      html.classList.add('dark')
      html.setAttribute('data-theme-variant', 'blue')
    } else {
      html.classList.remove('dark')
      html.setAttribute('data-theme-variant', 'blue')
    }
  }
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  console.log('🎨 Theme toggled to:', isDark.value ? 'dark' : 'light')
  applyTheme(isDark.value)
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('rankify_theme', isDark.value ? 'dark' : 'light')
    console.log('💾 Theme saved to localStorage')
  }
}

// Load saved config
onMounted(async () => {
  // Initialize theme
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('rankify_theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    
    console.log('🎨 Initializing theme...')
    console.log('  - Saved theme:', savedTheme)
    console.log('  - System prefers dark:', prefersDark)
    console.log('  - Final theme:', shouldBeDark ? 'dark' : 'light')
    
    isDark.value = shouldBeDark
    applyTheme(shouldBeDark)
  }
  
  // Load API config
  const saved = localStorage.getItem('rankify-ai-config')
  if (saved) {
    try {
      config.value = { ...config.value, ...JSON.parse(saved) }
      // Verify the saved API key
      await verifyApiKey()
    } catch (e) {
      console.error('Failed to load saved config')
    }
  } else {
    apiKeyStatus.value = 'not-set'
  }
})

console.log('🚀 AI Extractor page loaded')
</script>

<style scoped>
/* Ensure proper scrolling */
html, body {
  overflow-y: auto !important;
  height: auto !important;
}

/* Shimmer animation for upload progress */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
</style>
