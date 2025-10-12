<template>
  <div class="container mx-auto max-w-7xl space-y-12">
    <!-- Hero Section - Online Mode -->
    <div class="text-center space-y-6">
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full text-blue-700 dark:text-blue-300 text-sm font-semibold">
        <Icon name="lucide:wifi" class="h-4 w-4" />
        <span>Online Mode - AI-Powered</span>
      </div>
      
      <h1 class="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
        AI-Powered PDF to CBT
      </h1>
      
      <p class="text-xl md:text-2xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto">
        Extract questions from PDFs in <strong class="text-blue-600 dark:text-blue-400">seconds</strong> using advanced AI. 
        <span class="text-green-600 dark:text-green-400 font-semibold">10x faster</span> than manual methods.
      </p>

      <!-- Key Benefits -->
      <div class="flex flex-wrap gap-3 justify-center">
        <div class="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800">
          <Icon name="lucide:zap" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span class="text-sm font-medium text-blue-800 dark:text-blue-200">Instant Extraction</span>
        </div>
        <div class="flex items-center gap-2 bg-purple-50 dark:bg-purple-950 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800">
          <Icon name="lucide:brain" class="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span class="text-sm font-medium text-purple-800 dark:text-purple-200">AI-Powered</span>
        </div>
        <div class="flex items-center gap-2 bg-green-50 dark:bg-green-950 px-4 py-2 rounded-full border border-green-200 dark:border-green-800">
          <Icon name="lucide:shield-check" class="h-4 w-4 text-green-600 dark:text-green-400" />
          <span class="text-sm font-medium text-green-800 dark:text-green-200">Confidence Scoring</span>
        </div>
        <div class="flex items-center gap-2 bg-orange-50 dark:bg-orange-950 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800">
          <Icon name="lucide:image" class="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span class="text-sm font-medium text-orange-800 dark:text-orange-200">Diagram Detection</span>
        </div>
      </div>

      <!-- Primary CTA -->
      <div class="flex justify-center items-center pt-4">
        <NuxtLink
          to="/ai-extractor"
          class="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
          <Icon name="lucide:sparkles" class="h-6 w-6 group-hover:rotate-12 transition-transform" />
          <span>Start AI Extraction</span>
          <Icon name="lucide:arrow-right" class="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </NuxtLink>
      </div>
    </div>

    <!-- AI Workflow Steps -->
    <div class="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-3xl p-8 md:p-12 border-2 border-blue-200 dark:border-blue-800">
      <div class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-bold text-blue-900 dark:text-blue-100 mb-3">
          🚀 Complete AI Workflow
        </h2>
        <p class="text-lg text-blue-700 dark:text-blue-300 max-w-2xl mx-auto">
          From PDF upload to test results in 4 simple steps
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Step 1 -->
        <div class="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
          <div class="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            1
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:upload" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3 class="font-bold text-lg text-blue-900 dark:text-blue-100">Upload PDF</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Upload your PDF with questions. AI analyzes structure, detects diagrams, and identifies question types automatically.
            </p>
            <div class="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <Icon name="lucide:clock" class="h-3 w-3" />
              <span>~5 seconds</span>
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
          <div class="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            2
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:sparkles" class="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <h3 class="font-bold text-lg text-purple-900 dark:text-purple-100">AI Extraction</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              AI extracts all questions with confidence scores (1-5). Review high-confidence questions or edit low-confidence ones.
            </p>
            <div class="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-semibold">
              <Icon name="lucide:brain" class="h-3 w-3" />
              <span>Gemini AI</span>
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
          <div class="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            3
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:edit" class="h-6 w-6 text-green-600 dark:text-green-400" />
              <h3 class="font-bold text-lg text-green-900 dark:text-green-100">Review & Edit</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Review extracted questions in the interface. Edit text, adjust options, and configure test settings with auto-save.
            </p>
            <div class="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-semibold">
              <Icon name="lucide:save" class="h-3 w-3" />
              <span>Auto-save</span>
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
          <div class="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            4
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:play" class="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <h3 class="font-bold text-lg text-orange-900 dark:text-orange-100">Take Test</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Launch CBT interface, take your test, and get instant results with detailed analytics and performance insights.
            </p>
            <div class="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-semibold">
              <Icon name="lucide:bar-chart" class="h-3 w-3" />
              <span>Analytics</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Workflow CTA -->
      <div class="text-center mt-10">
        <NuxtLink 
          to="/ai-extractor" 
          class="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Icon name="lucide:rocket" class="h-5 w-5" />
          <span>Start AI Workflow Now</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Feature 1 -->
      <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-2xl p-6 border-2 border-blue-300 dark:border-blue-800 shadow-sm">
        <div class="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:zap" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Lightning Fast</h3>
        <p class="text-blue-700 dark:text-blue-300">
          Extract hundreds of questions in seconds. No more hours of manual work.
        </p>
      </div>

      <!-- Feature 2 -->
      <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-2xl p-6 border-2 border-purple-300 dark:border-purple-800 shadow-sm">
        <div class="w-12 h-12 bg-purple-600 dark:bg-purple-500 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:target" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-purple-900 dark:text-purple-100 mb-2">High Accuracy</h3>
        <p class="text-purple-700 dark:text-purple-300">
          AI detects question types, options, diagrams, and complex layouts automatically.
        </p>
      </div>

      <!-- Feature 3 -->
      <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-2xl p-6 border-2 border-green-300 dark:border-green-800 shadow-sm">
        <div class="w-12 h-12 bg-green-600 dark:bg-green-500 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:shield-check" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-green-900 dark:text-green-100 mb-2">Confidence Scores</h3>
        <p class="text-green-700 dark:text-green-300">
          Every question gets a confidence score (1-5) so you know what needs review.
        </p>
      </div>

      <!-- Feature 4 -->
      <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-2xl p-6 border-2 border-orange-300 dark:border-orange-800 shadow-sm">
        <div class="w-12 h-12 bg-orange-600 dark:bg-orange-500 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:image" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-orange-900 dark:text-orange-100 mb-2">Diagram Detection</h3>
        <p class="text-orange-700 dark:text-orange-300">
          Automatically identifies questions with diagrams, figures, or images.
        </p>
      </div>

      <!-- Feature 5 -->
      <div class="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/30 dark:to-pink-900/30 rounded-2xl p-6 border-2 border-pink-300 dark:border-pink-800 shadow-sm">
        <div class="w-12 h-12 bg-pink-600 dark:bg-pink-500 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:layers" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-pink-900 dark:text-pink-100 mb-2">Multi-Type Support</h3>
        <p class="text-pink-700 dark:text-pink-300">
          Supports MCQ, MSQ, NAT, MSM, and diagram-based questions.
        </p>
      </div>

      <!-- Feature 6 -->
      <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 rounded-2xl p-6 border-2 border-indigo-300 dark:border-indigo-800 shadow-sm">
        <div class="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:save" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">Auto-Save</h3>
        <p class="text-indigo-700 dark:text-indigo-300">
          All progress saved automatically. Resume anytime without losing work.
        </p>
      </div>
    </div>

    <!-- Comparison Table -->
    <div class="bg-card text-card-foreground rounded-3xl p-8 md:p-12 border-2 border-border shadow-xl">
      <h2 class="text-3xl font-bold text-center mb-8">Why Choose Online AI Mode?</h2>
      
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b-2 border-border bg-muted/50">
              <th class="text-left p-4 font-bold text-lg">Feature</th>
              <th class="text-center p-4 font-bold text-lg text-blue-600 dark:text-blue-400">AI Online</th>
              <th class="text-center p-4 font-bold text-lg text-muted-foreground">Manual Offline</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">Extraction Speed</td>
              <td class="p-4 text-center">
                <div class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <Icon name="lucide:zap" class="h-5 w-5" />
                  <span>Seconds</span>
                </div>
              </td>
              <td class="p-4 text-center text-muted-foreground">Minutes to Hours</td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">Accuracy</td>
              <td class="p-4 text-center">
                <div class="flex items-center justify-center gap-1">
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
              </td>
              <td class="p-4 text-center">
                <div class="flex items-center justify-center gap-1">
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Icon name="lucide:star" class="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <Icon name="lucide:star" class="h-4 w-4 text-muted-foreground/30" />
                  <Icon name="lucide:star" class="h-4 w-4 text-muted-foreground/30" />
                </div>
              </td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">Diagram Detection</td>
              <td class="p-4 text-center">
                <Icon name="lucide:check-circle" class="h-6 w-6 text-green-600 dark:text-green-400 mx-auto" />
              </td>
              <td class="p-4 text-center">
                <Icon name="lucide:x-circle" class="h-6 w-6 text-red-400 dark:text-red-500 mx-auto" />
              </td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">Confidence Scoring</td>
              <td class="p-4 text-center">
                <Icon name="lucide:check-circle" class="h-6 w-6 text-green-600 dark:text-green-400 mx-auto" />
              </td>
              <td class="p-4 text-center">
                <Icon name="lucide:x-circle" class="h-6 w-6 text-red-400 dark:text-red-500 mx-auto" />
              </td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">Internet Required</td>
              <td class="p-4 text-center">
                <Icon name="lucide:check-circle" class="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto" />
              </td>
              <td class="p-4 text-center">
                <Icon name="lucide:x-circle" class="h-6 w-6 text-green-600 dark:text-green-400 mx-auto" />
              </td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">User Effort</td>
              <td class="p-4 text-center text-green-600 dark:text-green-400 font-semibold">Minimal</td>
              <td class="p-4 text-center text-muted-foreground">High</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Final CTA -->
    <div class="bg-gradient-to-r from-blue-600/90 via-purple-600/90 to-blue-600/90 dark:from-blue-700/90 dark:via-purple-700/90 dark:to-blue-700/90 rounded-3xl p-12 text-center text-white shadow-2xl border border-white/10"
         style="box-shadow:
           0 8px 32px 0 rgba(0, 0, 0, 0.37),
           0 2px 6px 0 rgba(0, 0, 0, 0.1),
           inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
           inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">
        Ready to Transform Your PDFs?
      </h2>
      <p class="text-xl text-blue-100 dark:text-blue-200 mb-8 max-w-2xl mx-auto">
        Join thousands of users who've saved countless hours with AI-powered extraction
      </p>
      <NuxtLink 
        to="/ai-extractor" 
        class="inline-flex items-center gap-2 px-10 py-5 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all shadow-2xl hover:scale-105"
      >
        <Icon name="lucide:sparkles" class="h-6 w-6" />
        <span>Get Started Free</span>
        <Icon name="lucide:arrow-right" class="h-6 w-6" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component logic
</script>

<style scoped>
@keyframes gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}
</style>
