// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-09-21',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },
  
  // CSS Configuration
  css: [
    // Temporarily disabled to fix module resolution
    // '~/assets/css/accessibility.css',
    // '~/assets/css/responsive.css'
  ],

  // Runtime Configuration
  runtimeConfig: {
    // Private keys (only available on server-side)
    geminiApiKey: process.env.GEMINI_API_KEY,
    
    // Public keys (exposed to client-side)
    public: {
      geminiApiKey: process.env.NUXT_PUBLIC_GEMINI_API_KEY,
      enableDiagramDetection: process.env.NUXT_PUBLIC_ENABLE_DIAGRAM_DETECTION !== 'false',
      enableAccessibility: process.env.NUXT_PUBLIC_ENABLE_ACCESSIBILITY !== 'false',
      enableResponsiveDesign: process.env.NUXT_PUBLIC_ENABLE_RESPONSIVE_DESIGN !== 'false',
      enableDebugMode: process.env.NODE_ENV === 'development',
      apiTimeout: parseInt(process.env.NUXT_PUBLIC_API_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.NUXT_PUBLIC_MAX_RETRIES || '3'),
      confidenceThreshold: parseFloat(process.env.NUXT_PUBLIC_CONFIDENCE_THRESHOLD || '0.7'),
      batchSize: parseInt(process.env.NUXT_PUBLIC_BATCH_SIZE || '5')
    }
  },

  // App Configuration
  app: {
    head: {
      title: 'Advanced Diagram Detection System',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Advanced PDF processing with AI-powered diagram detection and coordinate-based rendering' },
        { name: 'theme-color', content: '#0066cc' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ]
    }
  },

  // TypeScript Configuration
  typescript: {
    strict: true,
    typeCheck: false // Disable for now to avoid build issues
  },

  // Build Configuration
  build: {
    transpile: ['@vue/test-utils']
  },

  // Vite Configuration
  vite: {
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    },
    optimizeDeps: {
      include: ['dexie', 'pdfjs-dist']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'pdf-processing': ['pdfjs-dist'],
            'database': ['dexie'],
            'accessibility': [
              '~/utils/accessibility/accessibilityManager',
              '~/utils/accessibility/responsiveDesign'
            ]
          }
        }
      }
    },
    // Temporarily disable problematic plugins
    plugins: []
  },

  // Nitro Configuration
  nitro: {
    preset: 'node-server',
    experimental: {
      wasm: true
    }
  },

  // Modules
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],

  // Pinia Configuration
  pinia: {
    autoImports: ['defineStore', 'storeToRefs']
  },

  // Tailwind Configuration
  tailwindcss: {
    configPath: '~/tailwind.config.js'
  },

  // Server-Side Rendering
  ssr: true,

  // Experimental Features
  experimental: {
    payloadExtraction: false,
    inlineSSRStyles: false
  },

  // Hooks
  hooks: {
    'build:before': () => {
      console.log('🚀 Building Advanced Diagram Detection System...')
    },
    'build:done': () => {
      console.log('✅ Build completed successfully!')
    }
  },

  // Development Configuration
  devServer: {
    port: 3002,
    host: '127.0.0.1'
  }
})