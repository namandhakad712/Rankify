<template>
  <div class="container mx-auto max-w-7xl space-y-12">
    <!-- Hero Section - Offline Mode -->
    <div class="text-center space-y-6">
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full text-green-700 dark:text-green-300 text-sm font-semibold">
        <Icon name="lucide:wifi-off" class="h-4 w-4" />
        <span>Offline Mode - Privacy First</span>
      </div>
      
      <h1 class="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent animate-gradient">
        Complete Privacy & Control
      </h1>
      
      <p class="text-xl md:text-2xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto">
        Process PDFs <strong class="text-green-600 dark:text-green-400">100% locally</strong> with no internet required. 
        <span class="text-blue-600 dark:text-blue-400 font-semibold">Perfect for sensitive documents</span>.
      </p>

      <!-- Key Benefits -->
      <div class="flex flex-wrap gap-3 justify-center">
        <div class="flex items-center gap-2 bg-green-50 dark:bg-green-950 px-4 py-2 rounded-full border border-green-200 dark:border-green-800">
          <Icon name="lucide:shield" class="h-4 w-4 text-green-600 dark:text-green-400" />
          <span class="text-sm font-medium text-green-800 dark:text-green-200">100% Private</span>
        </div>
        <div class="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800">
          <Icon name="lucide:wifi-off" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span class="text-sm font-medium text-blue-800 dark:text-blue-200">No Internet Needed</span>
        </div>
        <div class="flex items-center gap-2 bg-purple-50 dark:bg-purple-950 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800">
          <Icon name="lucide:hard-drive" class="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span class="text-sm font-medium text-purple-800 dark:text-purple-200">Local Processing</span>
        </div>
        <div class="flex items-center gap-2 bg-orange-50 dark:bg-orange-950 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800">
          <Icon name="lucide:lock" class="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span class="text-sm font-medium text-orange-800 dark:text-orange-200">For Complex PDF</span>
        </div>
      </div>

      <!-- Primary CTA -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
        <NuxtLink 
          to="/pdf-cropper" 
          class="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
          <Icon name="lucide:crop" class="h-6 w-6 group-hover:rotate-12 transition-transform" />
          <span>Start Manual Cropping</span>
          <Icon name="lucide:arrow-right" class="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </NuxtLink>
        
        <a 
          href="https://github.com/namandhakad712/rankify/releases/latest" 
          target="_blank"
          class="inline-flex items-center gap-2 px-6 py-4 bg-background border-2 border-border rounded-xl font-semibold text-foreground hover:bg-muted transition-all"
        >
          <Icon name="lucide:download" class="h-5 w-5" />
          <span>Download Offline Version</span>
        </a>
      </div>
    </div>

    <!-- Offline Workflow Steps -->
    <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-3xl p-8 md:p-12 border-2 border-green-200 dark:border-green-800">
      <div class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-bold text-green-900 dark:text-green-100 mb-3">
          🔒 Offline Workflow
        </h2>
        <p class="text-lg text-green-700 dark:text-green-300 max-w-2xl mx-auto">
          Complete control over your data with manual precision
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Step 1 -->
        <div class="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
          <div class="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            1
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:upload" class="h-6 w-6 text-green-600 dark:text-green-400" />
              <h3 class="font-bold text-lg text-green-900 dark:text-green-100">Load PDF</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Upload your PDF file. All processing happens in your browser - no data leaves your device.
            </p>
            <div class="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-semibold">
              <Icon name="lucide:shield" class="h-3 w-3" />
              <span>100% Local</span>
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
          <div class="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            2
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:crop" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h3 class="font-bold text-lg text-blue-900 dark:text-blue-100">Crop Questions</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Draw boxes or lines around questions. Define question types, marks, and options manually.
            </p>
            <div class="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <Icon name="lucide:mouse-pointer" class="h-3 w-3" />
              <span>Precision Control</span>
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
          <div class="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            3
          </div>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:package" class="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <h3 class="font-bold text-lg text-purple-900 dark:text-purple-100">Generate Output</h3>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Export as ZIP (with images) or JSON. Pre-generate images for faster test loading.
            </p>
            <div class="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-semibold">
              <Icon name="lucide:download" class="h-3 w-3" />
              <span>Export Options</span>
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
              Load your test data in CBT interface. Everything works offline with full functionality.
            </p>
            <div class="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-semibold">
              <Icon name="lucide:wifi-off" class="h-3 w-3" />
              <span>Offline Ready</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Workflow CTA -->
      <div class="text-center mt-10">
        <NuxtLink 
          to="/pdf-cropper" 
          class="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Icon name="lucide:crop" class="h-5 w-5" />
          <span>Start Offline Workflow</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Feature 1 -->
      <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
        <div class="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:shield" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-green-900 mb-2">Complete Privacy</h3>
        <p class="text-green-700">
          No data sent to any server. Everything processed locally in your browser.
        </p>
      </div>

      <!-- Feature 2 -->
      <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
        <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:wifi-off" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-blue-900 mb-2">Works Offline</h3>
        <p class="text-blue-700">
          No internet connection required. Perfect for secure environments.
        </p>
      </div>

      <!-- Feature 3 -->
      <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
        <div class="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:mouse-pointer" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-purple-900 mb-2">Precision Control</h3>
        <p class="text-purple-700">
          Manually crop exactly what you need with pixel-perfect accuracy.
        </p>
      </div>

      <!-- Feature 4 -->
      <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
        <div class="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:package" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-orange-900 mb-2">Flexible Export</h3>
        <p class="text-orange-700">
          Export as ZIP with images or JSON only. Choose what works for you.
        </p>
      </div>

      <!-- Feature 5 -->
      <div class="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200">
        <div class="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:hard-drive" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-pink-900 mb-2">Local Storage</h3>
        <p class="text-pink-700">
          All data stored in your browser. Access anytime without uploads.
        </p>
      </div>

      <!-- Feature 6 -->
      <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200">
        <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:layers" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-indigo-900 mb-2">All Question Types</h3>
        <p class="text-indigo-700">
          Supports MCQ, MSQ, NAT, MSM with custom marking schemes.
        </p>
      </div>
    </div>

    <!-- Download Offline Version -->
    <div class="bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-8 md:p-12 border-2 border-slate-200">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 class="text-3xl font-bold text-slate-900 mb-4">
            📦 Download Offline Version
          </h2>
          <p class="text-lg text-slate-700 mb-6">
            For maximum privacy and offline use, download the standalone version. 
            Run it locally with a simple HTTP server.
          </p>
          
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="lucide:check" class="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 class="font-semibold text-slate-900">No Installation Required</h4>
                <p class="text-sm text-slate-600">Just download, extract, and run</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="lucide:check" class="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 class="font-semibold text-slate-900">Works Completely Offline</h4>
                <p class="text-sm text-slate-600">No internet connection needed</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="lucide:check" class="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 class="font-semibold text-slate-900">Same Features</h4>
                <p class="text-sm text-slate-600">Full functionality, just offline</p>
              </div>
            </div>
          </div>

          <div class="mt-8">
            <a 
              href="https://github.com/namandhakad712/rankify/releases/latest" 
              target="_blank"
              class="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
            >
              <Icon name="lucide:download" class="h-5 w-5" />
              <span>Download from GitHub</span>
              <Icon name="lucide:external-link" class="h-4 w-4" />
            </a>
          </div>
        </div>

        <div class="bg-slate-900 rounded-2xl p-6 text-green-400 font-mono text-sm">
          <div class="mb-4 text-slate-400"># Quick Start Guide</div>
          <div class="space-y-2">
            <div><span class="text-blue-400">$</span> wget rankify.zip</div>
            <div><span class="text-blue-400">$</span> unzip rankify.zip</div>
            <div><span class="text-blue-400">$</span> cd rankify</div>
            <div><span class="text-blue-400">$</span> npx serve -l 2025</div>
            <div class="text-slate-500"># or</div>
            <div><span class="text-blue-400">$</span> python -m http.server 2025</div>
            <div class="mt-4 text-slate-400"># Open http://localhost:2025</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison Table -->
    <div class="bg-card text-card-foreground rounded-3xl p-8 md:p-12 border-2 border-border shadow-xl">
      <h2 class="text-3xl font-bold text-center mb-8">Why Choose Offline Mode?</h2>
      
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b-2 border-border bg-muted/50">
              <th class="text-left p-4 font-bold text-lg">Feature</th>
              <th class="text-center p-4 font-bold text-lg text-green-600 dark:text-green-400">Offline Mode</th>
              <th class="text-center p-4 font-bold text-lg text-muted-foreground">Online AI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">Privacy</td>
              <td class="p-4 text-center">
                <div class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <Icon name="lucide:shield" class="h-5 w-5" />
                  <span>100% Private</span>
                </div>
              </td>
              <td class="p-4 text-center text-muted-foreground">API Processing</td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium">Internet Required</td>
              <td class="p-4 text-center">
                <Icon name="lucide:x-circle" class="h-6 w-6 text-green-600 dark:text-green-400 mx-auto" />
              </td>
              <td class="p-4 text-center">
                <Icon name="lucide:check-circle" class="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto" />
              </td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium text-foreground">Data Control</td>
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
              <td class="p-4 font-medium text-foreground">Setup Time</td>
              <td class="p-4 text-center text-green-600 dark:text-green-400 font-semibold">Instant (Web) / 5 min (Download)</td>
              <td class="p-4 text-center text-muted-foreground">Instant</td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium text-foreground">Sensitive Documents</td>
              <td class="p-4 text-center">
                <Icon name="lucide:check-circle" class="h-6 w-6 text-green-600 dark:text-green-400 mx-auto" />
              </td>
              <td class="p-4 text-center">
                <Icon name="lucide:alert-triangle" class="h-6 w-6 text-yellow-500 dark:text-yellow-400 mx-auto" />
              </td>
            </tr>
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="p-4 font-medium text-foreground">Extraction Speed</td>
              <td class="p-4 text-center text-muted-foreground">Manual (Slower)</td>
              <td class="p-4 text-center text-green-600 dark:text-green-400 font-semibold">Automatic (Faster)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Use Cases -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200">
        <div class="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:building" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-2xl font-bold text-green-900 mb-3">Perfect For Organizations</h3>
        <ul class="space-y-2 text-green-700">
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Government agencies with strict data policies</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Educational institutions with privacy requirements</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Companies handling confidential exam materials</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Environments with restricted internet access</span>
          </li>
        </ul>
      </div>

      <div class="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-8 border-2 border-blue-200">
        <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <Icon name="lucide:user" class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-2xl font-bold text-blue-900 mb-3">Perfect For Individuals</h3>
        <ul class="space-y-2 text-blue-700">
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Students who value privacy</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Teachers creating private practice tests</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Users in areas with poor internet</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:check" class="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Anyone who prefers complete control</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Final CTA -->
    <div class="relative bg-gradient-to-r from-green-600/90 via-emerald-600/90 to-green-600/90 rounded-3xl p-12 text-center text-white border border-white/10 backdrop-blur-md"
         style="box-shadow:
           0 8px 32px 0 rgba(0, 0, 0, 0.37),
           0 2px 6px 0 rgba(0, 0, 0, 0.1),
           inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
           inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
           backdrop-filter: blur(16px) saturate(180%);">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">
        Ready for Complete Privacy?
      </h2>
      <p class="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
        Start processing PDFs offline with full control over your data
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink
          to="/pdf-cropper"
          class="inline-flex items-center gap-2 px-10 py-5 bg-white text-green-600 rounded-xl font-bold text-xl hover:bg-green-50 transition-all shadow-2xl hover:scale-105"
        >
          <Icon name="lucide:crop" class="h-6 w-6" />
          <span>Start Offline Cropper</span>
        </NuxtLink>
        <a
          href="https://github.com/namandhakad712/rankify/releases/latest"
          target="_blank"
          class="inline-flex items-center gap-2 px-10 py-5 bg-green-700 text-white rounded-xl font-bold text-xl hover:bg-green-800 transition-all shadow-2xl"
        >
          <Icon name="lucide:download" class="h-6 w-6" />
          <span>Download Offline</span>
        </a>
      </div>
    </div>

    <!-- Attribution -->
    <div class="text-center mt-8 text-xs text-slate-500 dark:text-slate-400">
      Inspired and contributed by <a href="https://github.com/TheMoonVyy/" target="_blank" rel="noopener noreferrer" class="hover:text-slate-700 dark:hover:text-slate-300 underline">TheMoonVyy</a> for offline portion of this project. 🤝
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
