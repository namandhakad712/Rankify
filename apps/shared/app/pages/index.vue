<template>
  <div
    class="flex flex-col grow min-h-0 py-8 overflow-auto border-t-2"
  >
    <h1 class="text-2xl font-bold text-center text-green-500">
      Turn PDF of Questions into interactive CBT (Computer Based Test)
    </h1>

    <div class="flex flex-col w-full items-center gap-6 mt-10 px-4 max-w-4xl mx-auto text-center">
      <div class="w-full border border-green-500 rounded-2xl p-4">
        <p class="text-lg font-semibold text-left">
          <Icon
            name="material-symbols:rocket-launch"
            size="1.4rem"
            class="text-green-400"
          />
          Features of this project/website:
        </p>
        <ul class="list-disc list-outside mt-2 text-left ml-8">
          <li class="mt-2">
            Turn PDF of Questions into interactive real exam-like CBT and view detailed analysis of your test.
          </li>
          <li class="mt-2" v-if="aiExtractionEnabled">
            <strong>🆕 NEW: AI-Powered Question Extraction!</strong><br>
            Now featuring Google Gemini AI integration for automatic question extraction with confidence scoring and diagram detection. 
            Extract questions in minutes instead of hours!
          </li>
          <li class="mt-2">
            <strong>100% free with no ads, no login, no email/phone number needed.</strong><br>
            You just need a PDF with questions and a modern browser (Chrome 80+, Firefox 75+, Edge 80+)<br>
            For AI features, you'll need a Google Gemini API key (free tier available).
          </li>
          <li class="mt-2">
            <strong>Privacy-first approach</strong>. All data processing happens in your browser.<br>
            AI processing uses Google Gemini API but no data is stored on external servers.<br>
            All your test data is stored locally using browser's IndexedDB API.<br>
            You are free to use fully offline version by following the instructions on project's
            <NuxtLink
                to="https://github.com/namandhakad712/rankify"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
              Github Repo
            </NuxtLink>.
          </li>
          <li class="mt-2">
            <strong>Smart features:</strong> Auto-save, confidence scoring, diagram detection, MathJax support, 
            performance optimization, and comprehensive error recovery.
          </li>
        </ul>
      </div>
      <div class="w-full border border-blue-500 rounded-2xl p-4" v-if="aiExtractionEnabled">
        <div class="flex items-center gap-2 mb-3">
          <Icon name="lucide:sparkles" class="h-6 w-6 text-blue-600" />
          <span class="text-lg font-semibold text-blue-800">🚀 Quick Start with AI (Recommended)</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div class="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
            <Icon name="lucide:upload" class="h-8 w-8 text-blue-600 mb-2" />
            <span class="font-semibold">1. Upload PDF</span>
            <span class="text-center text-blue-700">Use AI Extractor</span>
          </div>
          <div class="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
            <Icon name="lucide:edit-3" class="h-8 w-8 text-blue-600 mb-2" />
            <span class="font-semibold">2. Review</span>
            <span class="text-center text-blue-700">Edit if needed</span>
          </div>
          <div class="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
            <Icon name="lucide:play-circle" class="h-8 w-8 text-blue-600 mb-2" />
            <span class="font-semibold">3. Take Test</span>
            <span class="text-center text-blue-700">Enhanced CBT</span>
          </div>
          <div class="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
            <Icon name="lucide:bar-chart-3" class="h-8 w-8 text-blue-600 mb-2" />
            <span class="font-semibold">4. View Results</span>
            <span class="text-center text-blue-700">AI Analytics</span>
          </div>
        </div>
        <div class="mt-3 text-center">
          <NuxtLink
            to="/ai-extractor"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icon name="lucide:zap" class="h-4 w-4" />
            Start with AI Extractor
          </NuxtLink>
        </div>
      </div>
      
      <p class="text-lg font-semibold">
        Detailed step-by-step instructions:
      </p>
      <!-- Step 1 -->
      <div class="w-full border border-green-500 rounded-2xl p-4">
        <span class="text-xl font-semibold text-green-500">
          1. Extract Questions from PDF
        </span>
        
        <!-- AI Extraction Option (Feature Flag Controlled) -->
        <div v-if="aiExtractionEnabled" class="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div class="flex items-center gap-2 mb-3">
            <Icon name="lucide:sparkles" class="h-6 w-6 text-blue-600" />
            <span class="font-semibold text-blue-800 text-lg">🆕 AI-Powered Extraction (Recommended)</span>
            <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">FAST & ACCURATE</span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 class="font-semibold text-blue-800 mb-2">✨ What it does:</h4>
              <ul class="text-sm text-blue-700 space-y-1">
                <li>• Automatically extracts questions from PDF</li>
                <li>• Detects question types (MCQ, MSQ, NAT, MSM)</li>
                <li>• Identifies diagrams and mathematical expressions</li>
                <li>• Provides confidence scores (1-5 scale)</li>
                <li>• Extracts subjects, sections, and metadata</li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold text-blue-800 mb-2">⚡ Benefits:</h4>
              <ul class="text-sm text-blue-700 space-y-1">
                <li>• <strong>10x faster</strong> than manual cropping</li>
                <li>• <strong>Higher accuracy</strong> with AI validation</li>
                <li>• <strong>Smart review</strong> highlights low confidence</li>
                <li>• <strong>MathJax support</strong> for equations</li>
                <li>• <strong>Diagram detection</strong> with PDF overlay</li>
              </ul>
            </div>
          </div>
          
          <div class="bg-white p-3 rounded-lg border border-blue-100 mb-3">
            <h4 class="font-semibold text-blue-800 mb-2">📋 Requirements:</h4>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• Google Gemini API key (free tier available at <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline hover:text-blue-800">Google AI Studio</a>)</li>
              <li>• PDF file with questions (up to 50MB)</li>
              <li>• Modern browser (Chrome 80+, Firefox 75+, Edge 80+)</li>
            </ul>
          </div>
          
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              to="/ai-extractor"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
            >
              <Icon name="lucide:zap" class="h-4 w-4" />
              Start AI Extraction
            </NuxtLink>
            <NuxtLink
              v-if="reviewInterfaceEnabled"
              to="/review-interface"
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors font-medium"
            >
              <Icon name="lucide:edit-3" class="h-4 w-4" />
              Review Interface
            </NuxtLink>
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors font-medium"
            >
              <Icon name="lucide:key" class="h-4 w-4" />
              Get API Key
            </a>
          </div>
        </div>
        
        <!-- Traditional Method -->
        <div class="mt-3" :class="{ 'p-3 bg-gray-50 border border-gray-200 rounded-lg': aiExtractionEnabled }">
          <div v-if="aiExtractionEnabled" class="flex items-center gap-2 mb-2">
            <Icon name="lucide:crop" class="h-5 w-5 text-gray-600" />
            <span class="font-semibold text-gray-800">Traditional Manual Method</span>
          </div>
          <p class="text-left" :class="{ 'text-sm text-gray-700': aiExtractionEnabled }">
            Use the
            <NuxtLink
              to="/pdf-cropper"
              class="underline text-green-400"
              target="_blank"
            >
              PDF Cropper
            </NuxtLink>
            to upload your PDF containing questions and manually mark each question area along with its details like subject name, section name, and question type (MCQ, MSQ, NAT) etc.<br>
            Instructions/Docs for that are on PDF Cropper page itself.
          </p>
          <p class="mt-2 text-left" :class="{ 'text-sm text-gray-700': aiExtractionEnabled }">
            The Output data of PDF Cropper is essential for the
            <NuxtLink
              to="/cbt/interface"
              class="underline text-green-400"
              target="_blank"
            >
              Test Interface
            </NuxtLink>
            to display and manage the questions accurately.
          </p>
        </div>
      </div>
      
      <!-- AI Workflow Steps (Feature Flag Controlled) -->
      <div v-if="aiExtractionEnabled" class="w-full border border-blue-500 rounded-2xl p-4">
        <div class="flex items-center gap-2 mb-4">
          <Icon name="lucide:sparkles" class="h-6 w-6 text-blue-600" />
          <span class="text-xl font-semibold text-blue-600">🤖 AI-Powered Workflow (Recommended)</span>
        </div>
        
        <div class="space-y-4">
          <!-- Step 1: AI Extraction -->
          <div class="flex gap-4 p-3 bg-blue-50 rounded-lg">
            <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
            <div class="flex-1">
              <h3 class="font-semibold text-blue-800 mb-1">AI Extraction</h3>
              <p class="text-sm text-blue-700 mb-2">Upload your PDF to the AI Extractor and let Google Gemini automatically extract questions with confidence scoring.</p>
              <ul class="text-xs text-blue-600 space-y-1">
                <li>• Automatic question type detection (MCQ, MSQ, NAT, MSM)</li>
                <li>• Diagram detection with visual indicators</li>
                <li>• Confidence scoring (1-5 scale) for quality assessment</li>
                <li>• Subject and section extraction</li>
              </ul>
            </div>
          </div>
          
          <!-- Step 2: Review & Edit -->
          <div class="flex gap-4 p-3 bg-indigo-50 rounded-lg">
            <div class="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
            <div class="flex-1">
              <h3 class="font-semibold text-indigo-800 mb-1">Review & Edit (Optional)</h3>
              <p class="text-sm text-indigo-700 mb-2">Use the Review Interface to edit AI-extracted questions, especially those with low confidence scores.</p>
              <ul class="text-xs text-indigo-600 space-y-1">
                <li>• Low-confidence questions highlighted in red</li>
                <li>• Inline editing for text, options, and metadata</li>
                <li>• Diagram flag toggle with visual badges</li>
                <li>• Real-time validation with error feedback</li>
                <li>• Bulk editing and undo/redo functionality</li>
              </ul>
            </div>
          </div>
          
          <!-- Step 3: Enhanced Test -->
          <div class="flex gap-4 p-3 bg-green-50 rounded-lg">
            <div class="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
            <div class="flex-1">
              <h3 class="font-semibold text-green-800 mb-1">Enhanced CBT Test</h3>
              <p class="text-sm text-green-700 mb-2">Take your test with AI-enhanced features for a better testing experience.</p>
              <ul class="text-xs text-green-600 space-y-1">
                <li>• Confidence-based question filtering</li>
                <li>• MathJax rendering for mathematical expressions</li>
                <li>• PDF overlay viewer for diagram questions</li>
                <li>• AI metadata and enhanced analytics</li>
              </ul>
            </div>
          </div>
          
          <!-- Step 4: AI Analytics -->
          <div class="flex gap-4 p-3 bg-purple-50 rounded-lg">
            <div class="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
            <div class="flex-1">
              <h3 class="font-semibold text-purple-800 mb-1">AI-Enhanced Results</h3>
              <p class="text-sm text-purple-700 mb-2">View detailed analytics with AI insights and confidence-based performance metrics.</p>
              <ul class="text-xs text-purple-600 space-y-1">
                <li>• Confidence score analysis and trends</li>
                <li>• Diagram question performance breakdown</li>
                <li>• AI extraction metadata and processing insights</li>
                <li>• Enhanced reporting with quality indicators</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="mt-4 p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="lucide:clock" class="h-5 w-5 text-blue-600" />
            <span class="font-semibold text-blue-800">Time Comparison:</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="text-blue-700">
              <strong>Traditional Method:</strong> 2-4 hours for 50 questions
            </div>
            <div class="text-green-700">
              <strong>AI Method:</strong> 5-10 minutes for 50 questions ⚡
            </div>
          </div>
        </div>
      </div>
      
      <!-- After Step 1 -->
      <div class="w-full border border-yellow-400 rounded-2xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <Icon name="lucide:info" class="h-5 w-5 text-yellow-600" />
          <span class="font-semibold text-yellow-800">About Answer Keys</span>
        </div>
        <p class="text-left text-yellow-700">
          <strong>For AI Workflow:</strong> Questions are extracted automatically, but you still need to provide correct answers for evaluation.
        </p>
        <p class="mt-2 text-left text-yellow-700">
          <strong>For Traditional Workflow:</strong> The PDF cropper defines questions and their cropped images, but correct answers are needed for evaluation.
        </p>
        <p class="mt-2 text-left">
          That's where the
          <NuxtLink
            to="/cbt/generate-answer-key"
            class="underline text-green-400 font-medium"
            target="_blank"
          >
            Generate Answer Key
          </NuxtLink>
          page comes in. It lets you enter the correct answers, which are later used to evaluate your test.
        </p>
      </div>

      <!-- Step 2 -->
      <div class="w-full border border-green-500 rounded-2xl p-4">
        <span class="text-xl font-semibold text-green-500">
          2. Generate Answer Key Data and then take the Test or vice versa
        </span>
        <p class="mt-2 text-left">
          Now, thanks to the flexibility of Rankify, you've got two paths you can choose:
        </p>
        <ul class="list-disc list-inside mt-2 text-left ml-4">
          <li>
            Generate the answer key data <strong>before</strong> taking the test (here's a video if needed:
            <NuxtLink
              to="https://www.youtube.com/watch?v=cC1qvaBqgk0"
              class="underline text-green-400"
              target="_blank"
            >
              📺Generate Answer key before taking the test
            </NuxtLink>
            ):
            <ul class="list-decimal list-outside mt-2 text-left ml-10">
              <li>
                For this path, you will require the file downloaded from
                <NuxtLink
                  to="/pdf-cropper"
                  class="underline text-green-400"
                  target="_blank"
                >
                  PDF Cropper
                </NuxtLink>.
              </li>
              <li class="mt-1">
                Go to <NuxtLink
                  to="/cbt/generate-answer-key"
                  class="underline text-green-400"
                  target="_blank"
                >
                  Generate Answer Key
                </NuxtLink>
                and upload the zip/json file.
                After this the rest of the steps is common with the path 2 as well, so it is mentioned below.
              </li>
            </ul>
          </li>
          <li class="mt-2">
            Or, take the test <strong>first</strong>, then generate the answer key later (here's a video if needed:
            <NuxtLink
              to="https://www.youtube.com/watch?v=OQrqFVrpb0k"
              class="underline text-green-400"
              target="_blank"
            >
              📺Generate Answer key after taking the test
            </NuxtLink>
            ):
            <ul class="list-decimal list-outside mt-2 text-left ml-10">
              <li>
                First take the test, the process for that is mentioned in "Taking the Test" step. After submitting the test you should be on results page.
                As you have not generated answer key data, page will let you know you need to generate it.
              </li>
              <li class="mt-1">
                Go to <NuxtLink
                  to="/cbt/generate-answer-key"
                  class="underline text-green-400"
                  target="_blank"
                >
                  Generate Answer Key
                </NuxtLink>
                and page will inform you that it has found a test which doesn't have answer key data in it.
                Click on the test card (the card with details of test with green border)
                and then click on "Load Selected Test".
              </li>
            </ul>
          </li>
        </ul>

        <p class="mt-4 text-left">
          The rest of the steps are common to both paths, instructions/docs is on <NuxtLink
            to="/cbt/generate-answer-key"
            class="underline text-green-400"
            target="_blank"
          >Generate Answer Key</NuxtLink> page itself.
        </p>
      </div>

      <!-- Step 3 -->
      <div class="w-full border border-green-500 rounded-2xl p-4">
        <span class="text-xl font-semibold text-green-500">
          3. Take the Test
        </span>
        <p class="mt-2 text-left">
          Now here comes the real star of the project,
          <NuxtLink
            to="/cbt/interface"
            class="underline text-green-400"
            target="_blank"
          >
            CBT Interface
          </NuxtLink>
          . (here's a video of this:
          <NuxtLink
            to="https://www.youtube.com/watch?v=_pLhi6fh6bA"
            class="underline text-green-400"
            target="_blank"
          >
            📺Video of CBT Interface
          </NuxtLink>
          ):
        </p>
        <ul class="list-disc list-outside mt-2 text-left ml-8">
          <li class="mt-2">
            <strong>For AI Workflow:</strong> Test Interface can directly load AI-generated JSON data from the AI Extractor or Review Interface.<br>
            <strong>For Traditional Workflow:</strong> Test Interface requires the zip file (or pdf & json file) of PDF Cropper.<br>
            If you had generated answer key data, and chose "zip" or "json (merged)" as the format, then you can upload this file instead.
          </li>
          <li class="mt-2" v-if="aiExtractionEnabled">
            <strong>🆕 AI-Enhanced Features:</strong> When using AI-generated data, you get additional features like confidence filtering, 
            MathJax rendering for equations, PDF overlay for diagram questions, and enhanced analytics.
          </li>
          <li class="mt-2">
            Do set the settings like time duration of test, test name etc under the "Test Settings" section.
          </li>
          <li class="mt-2">
            Load that zip file (or pdf & json file) in the test interface.
          </li>
          <li class="mt-2">
            After loading file(s), you will have <strong>Sort Sections Order</strong> & <strong>Questions Numbering Order</strong>:<br>
            <ul class="list-disc list-outside mt-2 text-left ml-10">
              <li class="mt-2">
                <strong>Sort Sections Order:</strong> As it speaks for itself, it allows you to sort the order of how the sections appear.
                This is useful if your pdf didn't have subject/sections in the order of how it is given in the real exam.
                For Example, JEE mains has Maths, Physics, Chemistry as the order of subjects, so if your pdf had subjects in PCM order then you can change it to MPC order.
              </li>
              <li class="mt-2">
                <strong>Questions Numbering Order:</strong> Now if you changed the order of sections or you may have questions in your pdf which has a different numbering order as it is in the real exam.
                So for example, your pdf has PCM where each has numbering like 1-25, 1-25, 1-25, now JEE Mains has numbering order of 1-75, yes they are continuing the numbering.<br><br>
                Using this, you can redefine how the question numbers appear as follows:
                <ul class="list-disc list-outside mt-2 text-left ml-10">
                  <li>
                    <strong>Original:</strong> Just uses the original numbering as it is in the uploaded file (cropper data).
                  </li>
                  <li>
                    <strong>Cumulative:</strong> Numbering is started with 1, and keeps continuing across sections.<br>
                    For Example: If you have 75 questions, then numbering will start with 1 and end with 75 (1-75).
                    This is what JEE mains uses.
                  </li>
                  <li>
                    <strong>Section-wise:</strong> Numbering resets to 1 in each section.
                    For Example: If you have 3 sections having 25 questions each, then numbering of questions in each section will be 1-25, 1-25, 1-25.
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li class="mt-2">
            (OPTIONAL) You can optionally customize the UI of Test Interface (here's a video on this
            <NuxtLink
              to="https://www.youtube.com/watch?v=k9is0TJBkgQ"
              class="underline text-green-400"
              target="_blank"
            >
              📺 Customize UI of CBT Interface
            </NuxtLink>
            ).<br>
            This is especially helpful if you are phone, as you can make space for question panel by resizing other parts of UI.<br>
            If you are on phone, take a look at "Customize UI" -> "Main Layout" -> "Main Layout Size", you can change the value to resize the whole layout to fit to your screen.
          </li>
          <li class="mt-2">
            After that click on Prepare Test, this will start preparing question images from the pdf and cropper data.
            After it is done, you can start the test.
          </li>
          <li class="mt-2">
            You can submit the test (if you chose submit btn to be enabled), or the test will automatically be submitted when test time is up.
          </li>
          <li class="mt-2">
            After Test is submitted you should be on the
            <NuxtLink
              to="/cbt/results"
              class="underline text-green-400"
              target="_blank"
            >
              CBT Results
            </NuxtLink>
            page.
          </li>
          <li class="mt-2">
            Now depending on your path:<br>
            <ul class="list-disc list-outside mt-2 text-left ml-10">
              <li class="mt-2">
                If <strong>answer key data is in the file</strong> you uploaded on Test Interface, then results will be generated and shown to you right away!<br>
              </li>
              <li class="mt-1">
                If <strong>answer key data is not in the file</strong>, then results page will let you know that you need answer key data to evaluate your test.
                You can follow what it says, and generate the answer key data. Once you have the answer key data, you can come back to results page to load the data and results will be generated for your test!
              </li>
            </ul>
          </li>
        </ul>
        <p class="mt-3 text-left">
          <strong>NOTE:</strong><br>
          The Profile details part of the Test Interface (the one at top-right corner with profile pic and username) also acts as a secret button, which can also be accessed while you are in the test:<br>
        </p>
        <ul class="list-disc list-outside mt-2 text-left ml-8">
          <li class="mt-2">
            <strong>Click/Tap on it:</strong> Will toggle fullscreen mode.
          </li>
          <li class="mt-2">
            <strong>Long Click/Tap:</strong> Will open up UI Settings which you use to change question images size if they appear big or small to you.
          </li>
        </ul>
      </div>

      <!-- Step 4 -->
      <div class="w-full border border-green-500 rounded-2xl p-4">
        <span class="text-xl font-semibold text-green-500">
          4. See Results
        </span>
        <p class="mt-2 text-left">
          Just straight up take a look at
          <NuxtLink
            to="/cbt/results"
            class="underline text-green-400"
            target="_blank"
          >
            Test Results
          </NuxtLink>
          page.
        </p>
        <p class="text-left mt-2">
          These are the sections the results page has and their features:
        </p>
        <ul class="list-disc list-outside mt-2 text-left ml-8">
          <li class="mt-2">
            <strong>Test Results:</strong> Shows results for your currently selected test. This further has:
            <ul class="list-disc list-outside mt-2 text-left ml-8">
              <li class="mt-2">
                <strong>Summary:</strong> Contains summaries of your test, and interactive charts.
              </li>
              <li class="mt-2">
                <strong>Detailed:</strong> You can view detailed result on your test, this part has questions and summaries in tabular format which you can be filtered, sorted by time spent, colored by result (correct, incorrect, etc) or question status (answered, not answered, etc)
              </li>
            </ul>
          </li>
          <li class="mt-2">
            <strong>My Tests:</strong> Shows all your tests, you can view them again whenever you want. You can also export and import your tests if you need a backup.
          </li>
        </ul>
      </div>
      
      <!-- Workflow Comparison -->
      <div v-if="aiExtractionEnabled" class="w-full border border-gray-300 rounded-2xl p-4">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 text-center">🤔 Which Workflow Should You Choose?</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- AI Workflow -->
          <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <Icon name="lucide:sparkles" class="h-6 w-6 text-blue-600" />
              <h3 class="font-bold text-blue-800">AI-Powered Workflow</h3>
              <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">RECOMMENDED</span>
            </div>
            
            <div class="space-y-3">
              <div>
                <h4 class="font-semibold text-green-700 text-sm">✅ Best for:</h4>
                <ul class="text-xs text-gray-700 ml-4 space-y-1">
                  <li>• New users wanting quick results</li>
                  <li>• Large PDFs with many questions</li>
                  <li>• Users who want accuracy and speed</li>
                  <li>• PDFs with mathematical expressions</li>
                </ul>
              </div>
              
              <div>
                <h4 class="font-semibold text-blue-700 text-sm">⚡ Advantages:</h4>
                <ul class="text-xs text-gray-700 ml-4 space-y-1">
                  <li>• 10x faster than manual cropping</li>
                  <li>• Higher accuracy with AI validation</li>
                  <li>• Automatic diagram detection</li>
                  <li>• Confidence scoring for quality</li>
                  <li>• MathJax support for equations</li>
                  <li>• Smart review interface</li>
                </ul>
              </div>
              
              <div>
                <h4 class="font-semibold text-orange-700 text-sm">⚠️ Requirements:</h4>
                <ul class="text-xs text-gray-700 ml-4 space-y-1">
                  <li>• Google Gemini API key (free tier)</li>
                  <li>• Internet connection for AI processing</li>
                  <li>• Modern browser (Chrome 80+, Firefox 75+)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <!-- Traditional Workflow -->
          <div class="p-4 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <Icon name="lucide:crop" class="h-6 w-6 text-gray-600" />
              <h3 class="font-bold text-gray-800">Traditional Manual Workflow</h3>
            </div>
            
            <div class="space-y-3">
              <div>
                <h4 class="font-semibold text-green-700 text-sm">✅ Best for:</h4>
                <ul class="text-xs text-gray-700 ml-4 space-y-1">
                  <li>• Users who prefer full manual control</li>
                  <li>• Complex layouts requiring precise cropping</li>
                  <li>• Offline-only usage</li>
                  <li>• Users without API access</li>
                </ul>
              </div>
              
              <div>
                <h4 class="font-semibold text-blue-700 text-sm">⚡ Advantages:</h4>
                <ul class="text-xs text-gray-700 ml-4 space-y-1">
                  <li>• Complete manual control</li>
                  <li>• Works fully offline</li>
                  <li>• No API key required</li>
                  <li>• Precise question boundaries</li>
                  <li>• Handles any PDF layout</li>
                </ul>
              </div>
              
              <div>
                <h4 class="font-semibold text-red-700 text-sm">⏱️ Considerations:</h4>
                <ul class="text-xs text-gray-700 ml-4 space-y-1">
                  <li>• Time-intensive (2-4 hours for 50 questions)</li>
                  <li>• Manual effort for each question</li>
                  <li>• No automatic validation</li>
                  <li>• Prone to human errors</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 text-center">
          <div class="inline-flex items-center gap-4 p-3 bg-blue-100 rounded-lg">
            <Icon name="lucide:lightbulb" class="h-5 w-5 text-blue-600" />
            <span class="text-sm text-blue-800">
              <strong>Pro Tip:</strong> Start with AI extraction, then use the Review Interface to fine-tune results. 
              You get the best of both worlds - speed and accuracy!
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// For now, let's enable AI features by default since they're implemented
// In production, this would be controlled by proper feature flags
const aiExtractionEnabled = ref(true)
const reviewInterfaceEnabled = ref(true)

useHead({
  title: 'Rankify - Turn PDF of Questions into CBT (Computer Based Test)',
})
</script>
