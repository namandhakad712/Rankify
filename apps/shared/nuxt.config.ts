export default defineNuxtConfig({
  modules: [
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxt/eslint',
    '@nuxt/fonts',
    'nuxt-echarts',
    'shadcn-nuxt',
    'nuxt-color-picker',
    'vue-sonner/nuxt',
  ],
  $meta: {
    name: 'shared',
  },
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: {
        'class': 'dark',
        'data-theme-variant': 'blue',
        'lang': 'en',
      },
      title: 'Rankify - Turn PDF of Questions into CBT (Computer Based Test)',
      meta: [
        {
          name: 'description',
          content: 'Turn PDF of Questions into CBT (Computer Based Test).',
        },
      ],
    },
  },
  css: ['vue-sonner/style.css'],
  runtimeConfig: {
    public: {
      isBackupWebsite: '',
      isBuildForWebsite: '',
      projectVersion: '',
    },
  },
  routeRules: {
    '/cbt': { redirect: { to: '/cbt/interface', statusCode: 301 } },
  },
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-03-17',
  vite: {
    esbuild: {
      legalComments: 'none',
    },
    build: {
      assetsInclude: ['**/*.wasm'],
      terserOptions: {
        format: { comments: false },
      },
      cssMinify: 'lightningcss',
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.wasm')) {
              return 'assets/[name].[hash][extname]';
            }
            return 'assets/[name].[hash].[ext]';
          }
        }
      }
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      },
      mimeTypes: {
        'application/wasm': ['wasm']
      },
      fs: {
        allow: ['..', '../..']
      }
    },
    optimizeDeps: {
      exclude: ['mupdf'],
      include: ['comlink']
    }
  },
  echarts: {
    charts: ['LineChart', 'PieChart'],
    components: [
      'LegendComponent',
      'TitleComponent',
      'GridComponent',
      'TooltipComponent',
      'DataZoomSliderComponent',
      'DataZoomInsideComponent',
    ],
  },
  eslint: {
    config: { stylistic: true },
  },
  icon: {
    customCollections: [
      {
        prefix: 'my-icon',
        dir: '../shared/app/assets/icons/IconBundle',
        normalizeIconName: false,
      },
    ],
    // Use default provider for better compatibility
    serverBundle: {
      collections: ['lucide', 'line-md']
    },
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
      collections: ['lucide', 'line-md']
    }
  },
  shadcn: {
    componentDir: '../shared/app/components/ui',
  },
})
