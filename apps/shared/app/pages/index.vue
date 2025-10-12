<template>
  <div class="relative flex flex-col grow min-h-0 overflow-auto">
    <!-- Custom Header with Mode Toggle and Theme Toggle -->
    <div class="sticky top-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-white/20 shadow-lg shadow-black/5 dark:shadow-black/20 rounded-bl-3xl rounded-br-3xl mx-4 mt-4"
         style="box-shadow:
           0 1px 3px 0 rgba(0, 0, 0, 0.1),
           0 1px 2px -1px rgba(0, 0, 0, 0.1),
           inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
           inset 0 -1px 0 0 rgba(0, 0, 0, 0.1);
           max-width: calc(100vw - 2rem);">
      <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Rankify - AI-Powered PDF to CBT Transformation Platform">
          <Icon name="lucide:sparkles" class="h-6 w-6 text-primary" aria-hidden="true" />
          <span class="font-bold text-lg">Rankify</span>
        </NuxtLink>
        
        <!-- Right Side: Mode Toggle + Theme Toggle -->
        <div class="flex items-center gap-4">
          <!-- Mode Toggle Switch -->
          <div class="flex items-center gap-0 bg-slate-200 dark:bg-slate-800 rounded-full p-1 shadow-inner">
            <button
              @click="currentMode = 'online'"
              :class="[
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full transition-all duration-300 font-semibold text-xs sm:text-sm whitespace-nowrap',
                currentMode === 'online'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
            >
              <Icon name="lucide:wifi" class="h-4 w-4" />
              <span class="hidden sm:inline">Online</span>
            </button>
            <button
              @click="currentMode = 'offline'"
              :class="[
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full transition-all duration-300 font-semibold text-xs sm:text-sm whitespace-nowrap',
                currentMode === 'offline'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
            >
              <Icon name="lucide:wifi-off" class="h-4 w-4" />
              <span class="hidden sm:inline">Offline</span>
            </button>
          </div>

          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-600"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Icon v-if="isDark" name="lucide:sun" class="h-5 w-5 text-yellow-500" aria-hidden="true" />
            <Icon v-else name="lucide:moon" class="h-5 w-5 text-slate-700" aria-hidden="true" />
          </button>

          <!-- GitHub Link -->
          <a
            href="https://github.com/namandhakad712/rankify"
            target="_blank"
            rel="noopener noreferrer"
            class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-600"
            title="View source code on GitHub"
            aria-label="View Rankify source code on GitHub"
          >
            <Icon name="lucide:github" class="h-5 w-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>

    <!-- Content Area with Smooth Transition -->
    <div class="flex-1">
      <Transition name="fade-slide" mode="out-in">
        <!-- ONLINE MODE -->
        <div v-if="currentMode === 'online'" key="online" class="py-8 px-4">
          <OnlineModeContent />
        </div>

        <!-- OFFLINE MODE -->
        <div v-else key="offline" class="py-8 px-4">
          <OfflineModeContent />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
// Feature flags
const featureFlags = getFeatureFlags()
featureFlags.initialize()

// Mode state
const currentMode = ref<'online' | 'offline'>('online')

// Theme management - Manual implementation
const isDark = ref(false)

const applyTheme = (dark: boolean) => {
  if (typeof document !== 'undefined') {
    const html = document.documentElement
    
    console.log('Applying theme:', dark ? 'dark' : 'light')
    console.log('HTML element before:', html.classList.toString())
    
    if (dark) {
      html.classList.add('dark')
      html.setAttribute('data-theme-variant', 'blue')
    } else {
      html.classList.remove('dark')
      html.setAttribute('data-theme-variant', 'blue')
    }
    
    console.log('HTML element after:', html.classList.toString())
  }
}

const toggleTheme = () => {
  console.log('Toggle clicked! Current isDark:', isDark.value)
  isDark.value = !isDark.value
  console.log('New isDark value:', isDark.value)
  
  applyTheme(isDark.value)
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('rankify_theme', isDark.value ? 'dark' : 'light')
    console.log('Saved to localStorage:', isDark.value ? 'dark' : 'light')
  }
}

// Initialize theme on mount - SINGLE onMounted
onMounted(() => {
  if (typeof window !== 'undefined') {
    console.log('Initializing theme...')
    
    // Check localStorage first
    const savedTheme = localStorage.getItem('rankify_theme')
    console.log('Saved theme from localStorage:', savedTheme)
    
    // Check system preference if no saved theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    console.log('System prefers dark:', prefersDark)
    
    // Determine initial theme
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    isDark.value = shouldBeDark
    
    console.log('Initial isDark value:', shouldBeDark)
    
    // Apply theme
    applyTheme(shouldBeDark)
    
    // Also load mode preference
    const savedMode = localStorage.getItem('rankify_preferred_mode')
    if (savedMode === 'online' || savedMode === 'offline') {
      currentMode.value = savedMode
    }
  }
})

// Save mode preference to localStorage
watch(currentMode, (newMode) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rankify_preferred_mode', newMode)
  }
})

// Define page meta to hide the default navbar
definePageMeta({
  layout: false
})

useHead({
  title: 'Rankify - AI Mock Test Generator for JEE NEET | PDF to Online Test Converter',
  titleTemplate: '%s',
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    // Primary Meta Tags
    {
      name: 'title',
      content: 'Rankify - AI Mock Test Generator for JEE NEET | PDF to Online Test Converter'
    },
    {
      name: 'description',
      content: 'Create AI-powered mock tests from PDF for JEE Main, NEET, and other competitive exams. Convert question papers to online tests instantly. Practice with NTA-style mock tests, previous year papers, and AI-generated questions. Perfect for JEE aspirants and medical entrance exam preparation.'
    },
    {
      name: 'keywords',
      content: 'JEE mock test, NEET mock test, NTA mock test, JEE Main mock test, NEET practice test, AI mock test generator, PDF to mock test, JEE question paper converter, NEET PDF converter, online mock test platform, JEE Main practice, NEET practice questions, AI learning platform, JEE Mains mock test, NEET mock exam, competitive exam preparation, JEE Advanced mock test, NEET previous papers, mock question generator, AI test creator, JEE NEET AI tutor, exam preparation app, online test series, JEE Main online test, NEET online mock test, AI-powered learning, smart exam preparation, JEE Main 2025 mock test, NEET 2025 preparation, NTA JEE mock test, AI exam generator, PDF question extractor, automatic test creation, JEE Main chapter wise test, NEET subject wise mock test, AI question bank, intelligent tutoring system, JEE Main full mock test, NEET grand mock test, AI-powered exam preparation, smart mock test platform, JEE Main simulator, NEET exam simulator, AI learning companion, personalized mock tests, JEE Main practice platform, NEET preparation tool, AI exam coach, mock test automation, JEE Main test series, NEET test series, AI-powered assessment, exam readiness checker, JEE Main performance analyzer, NEET progress tracker, AI study planner, mock test analytics, JEE Main doubt solver, NEET concept clarifier, AI-powered doubt resolution, exam strategy planner, JEE Main time management, NEET speed improvement, AI performance optimizer, mock test customizer, JEE Main difficulty level, NEET adaptive testing, AI-powered personalization, exam pattern analyzer, JEE Main success predictor, NEET rank predictor, AI study recommendations, mock test scheduler, JEE Main revision planner, NEET weak areas identifier, AI-powered improvement suggestions, exam confidence builder, JEE Main stress reducer, NEET anxiety management, AI motivation coach, mock test community, JEE Main peer comparison, NEET benchmark tool, AI progress monitor, exam preparation tracker, JEE Main goal setter, NEET milestone tracker, AI-powered study guide, mock test library, JEE Main topic wise test, NEET chapter wise mock, AI question generator, exam content creator, JEE Main pattern matcher, NEET standard maintainer, AI quality assurer, mock test validator, JEE Main authenticity checker, NEET accuracy maintainer, AI-powered validation, exam standard maintainer, JEE Main format preserver, NEET structure maintainer, AI-powered formatting, mock test beautifier, JEE Main presentation enhancer, NEET visual improver, AI-powered design, exam interface optimizer, JEE Main user experience, NEET interaction designer, AI-powered UX, mock test accessibility, JEE Main inclusivity, NEET diversity supporter, AI-powered accessibility, exam equality promoter'
    },
    {
      name: 'author',
      content: 'Rankify'
    },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    },
    {
      name: 'language',
      content: 'English'
    },
    {
      name: 'geo.region',
      content: 'IN'
    },
    {
      name: 'geo.country',
      content: 'India'
    },
    {
      name: 'geo.placename',
      content: 'India'
    },
    {
      name: 'revisit-after',
      content: '3 days'
    },
    {
      name: 'category',
      content: 'Educational Technology, Exam Preparation, Competitive Exams'
    },
    {
      name: 'classification',
      content: 'Education, JEE Preparation, NEET Preparation, Mock Tests'
    },
    {
      name: 'rating',
      content: 'General'
    },
    {
      name: 'distribution',
      content: 'Global'
    },
    {
      name: 'coverage',
      content: 'Worldwide'
    },
    {
      name: 'target',
      content: 'JEE aspirants, NEET students, competitive exam candidates'
    },

    // Additional SEO Meta Tags
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0'
    },
    {
      name: 'format-detection',
      content: 'telephone=no'
    },
    {
      name: 'theme-color',
      content: '#2563eb'
    },
    {
      name: 'msapplication-TileColor',
      content: '#2563eb'
    },
    {
      name: 'msapplication-config',
      content: '/browserconfig.xml'
    },

    // Educational Meta Tags
    {
      name: 'education:subject',
      content: 'JEE Main, NEET, Physics, Chemistry, Mathematics, Biology'
    },
    {
      name: 'education:level',
      content: 'Higher Education, Entrance Exam Preparation'
    },
    {
      name: 'education:type',
      content: 'Mock Tests, Practice Questions, Online Learning'
    },
    {
      name: 'education:course',
      content: 'JEE Main Preparation, NEET Preparation, Engineering Entrance, Medical Entrance'
    },

    // Article Meta Tags
    {
      name: 'article:author',
      content: 'Rankify Team'
    },
    {
      name: 'article:publisher',
      content: 'https://rankify.app'
    },
    {
      name: 'article:section',
      content: 'JEE NEET Preparation'
    },
    {
      name: 'article:tag',
      content: 'JEE Mock Test'
    },
    {
      name: 'article:tag',
      content: 'NEET Mock Test'
    },
    {
      name: 'article:tag',
      content: 'NTA Mock Test'
    },
    {
      name: 'article:tag',
      content: 'AI Learning'
    },
    {
      name: 'article:tag',
      content: 'Mock Question Generator'
    },

    // Product Meta Tags
    {
      name: 'product:price:amount',
      content: '0'
    },
    {
      name: 'product:price:currency',
      content: 'INR'
    },
    {
      name: 'product:availability',
      content: 'in stock'
    },
    {
      name: 'product:condition',
      content: 'new'
    },
    {
      name: 'product:retailer',
      content: 'Rankify'
    },
    {
      name: 'product:brand',
      content: 'Rankify'
    },
    {
      name: 'product:model',
      content: 'AI Mock Test Generator'
    },
    {
      name: 'product:category',
      content: 'Educational Software'
    }
  ],
  link: [
    // Canonical URL
    {
      rel: 'canonical',
      href: 'https://rankify.app/'
    },

    // Favicon and Icons
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png'
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png'
    },
    {
      rel: 'manifest',
      href: '/site.webmanifest'
    },

    // Preconnect to external domains
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com'
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: ''
    },

    // Alternate language versions (if applicable)
    {
      rel: 'alternate',
      hreflang: 'en',
      href: 'https://rankify.app/'
    }
  ],
  script: [
    // Structured Data (JSON-LD) - Educational Focus
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'EducationalApplication',
        'name': 'Rankify - AI Mock Test Generator',
        'description': 'AI-powered mock test generator for JEE Main, NEET, and other competitive exams. Convert PDF question papers to online mock tests instantly.',
        'url': 'https://rankify.app',
        'applicationCategory': 'EducationalApplication',
        'operatingSystem': 'Web Browser, Desktop',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'INR',
          'availability': 'https://schema.org/InStock'
        },
        'creator': {
          '@type': 'Organization',
          'name': 'Rankify',
          'url': 'https://rankify.app'
        },
        'featureList': [
          'JEE Main mock tests',
          'NEET mock tests',
          'NTA-style question papers',
          'AI-powered question extraction',
          'PDF to mock test conversion',
          'Chapter-wise practice tests',
          'Full-length mock exams',
          'Performance analytics',
          'AI-powered doubt resolution',
          'Adaptive learning paths',
          'Progress tracking',
          'Rank prediction',
          'Time management tools',
          'Exam strategy planner'
        ],
        'screenshot': 'https://rankify.app/screenshot.png',
        'softwareVersion': '1.0.0',
        'fileSize': '0',
        'downloadUrl': 'https://github.com/namandhakad712/rankify/releases/latest',
        'installUrl': 'https://rankify.app',
        'audience': {
          '@type': 'EducationalAudience',
          'educationalRole': 'student',
          'audienceType': 'JEE aspirants, NEET students, competitive exam candidates'
        },
        'teaches': [
          'JEE Main Physics',
          'JEE Main Chemistry',
          'JEE Main Mathematics',
          'NEET Physics',
          'NEET Chemistry',
          'NEET Biology'
        ],
        'about': [
          {
            '@type': 'Thing',
            'name': 'JEE Main'
          },
          {
            '@type': 'Thing',
            'name': 'NEET'
          },
          {
            '@type': 'Thing',
            'name': 'NTA'
          },
          {
            '@type': 'Thing',
            'name': 'Mock Tests'
          }
        ],
        'sameAs': [
          'https://github.com/namandhakad712/rankify'
        ]
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'Rankify - AI Mock Test Generator for JEE NEET',
        'url': 'https://rankify.app',
        'description': 'Create AI-powered mock tests for JEE Main, NEET, and competitive exams. Convert PDF question papers to online tests with AI technology.',
        'inLanguage': 'en-IN',
        'copyrightHolder': {
          '@type': 'Organization',
          'name': 'Rankify'
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': 'https://rankify.app/search?q={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Course',
        'name': 'JEE Main Mock Test Series',
        'description': 'Comprehensive JEE Main mock test series with AI-powered question extraction and performance analysis',
        'provider': {
          '@type': 'Organization',
          'name': 'Rankify',
          'url': 'https://rankify.app'
        },
        'courseCode': 'JEE-MAIN-MOCK-2025',
        'coursePrerequisites': 'Basic knowledge of Physics, Chemistry, Mathematics',
        'hasCourseInstance': {
          '@type': 'CourseInstance',
          'courseMode': 'online',
          'instructor': {
            '@type': 'Organization',
            'name': 'Rankify AI'
          }
        }
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Course',
        'name': 'NEET Mock Test Series',
        'description': 'Complete NEET mock test series with AI-powered learning and performance tracking',
        'provider': {
          '@type': 'Organization',
          'name': 'Rankify',
          'url': 'https://rankify.app'
        },
        'courseCode': 'NEET-MOCK-2025',
        'coursePrerequisites': 'Basic knowledge of Physics, Chemistry, Biology',
        'hasCourseInstance': {
          '@type': 'CourseInstance',
          'courseMode': 'online',
          'instructor': {
            '@type': 'Organization',
            'name': 'Rankify AI'
          }
        }
      })
    }
  ]
})
</script>

<style scoped>
/* Smooth transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
