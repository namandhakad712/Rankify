import tailwindVitePlugin from '@tailwindcss/vite'
import packageJson from './package.json'

const enableSeoModules = import.meta.env.DISABLE_SEO_MODULES === 'true' ? false : true

export default defineNuxtConfig({
  extends: ['../shared'],
  modules: ['@nuxtjs/robots', '@nuxtjs/sitemap', 'nuxt-og-image'],
  $meta: {
    name: 'web',
  },
  css: ['./app/assets/css/main.css'],
  site: {
    url: 'https://rankify.vercel.app',
  },
  runtimeConfig: {
    public: {
      isBackupWebsite: '',
      isBuildForWebsite: '',
      projectVersion: packageJson.version,
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-03-17',
  vite: {
    define: {
      'import.meta.env.PROJECT_VERSION': `"${packageJson.version}"`,
    },
    plugins: [tailwindVitePlugin()],
    build: {
      assetsInclude: ['**/*.wasm'],
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
  components: [
    '~/components',
    '../shared/app/components'
  ],
  icon: {
    // Specify the icon collections to be used
    serverBundle: {
      collections: ['lucide', 'line-md']
    },
    // Optimize client bundle by scanning for used icons
    clientBundle: {
      scan: {
        globInclude: ['../shared/**/*.vue', '../web/**/*.vue'],
        globExclude: ['../*/node_modules/**', '../*/dist*/**'],
      },
      // Include frequently used icons
      icons: [
        'lucide:sun',
        'lucide:moon',
        'lucide:file-text',
        'lucide:sparkles',
        'lucide:chevron-down',
        'lucide:file-plus',
        'lucide:edit-3',
        'lucide:zap',
        'lucide:target',
        'lucide:crop',
        'lucide:monitor',
        'lucide:play-circle',
        'lucide:bar-chart-3',
        'lucide:key',
        'lucide:github',
        'lucide:alert-circle',
        'lucide:refresh-cw',
        'line-md:sparkles',
        'line-md:settings',
        'line-md:zap',
        'line-md:key',
        'line-md:check',
        'line-md:info',
        'line-md:upload-cloud',
        'line-md:loader-2',
        'line-md:brain',
        'line-md:x',
        'line-md:file-text',
        'line-md:check-circle',
        'line-md:x-circle',
        'line-md:external-link',
        'line-md:upload',
        'line-md:alert-circle',
        'line-md:edit-3',
        'line-md:download-outline',
        'line-md:play-circle'
      ]
    },
  },
  ogImage: {
    enabled: enableSeoModules,
  },
  robots: {
    enabled: enableSeoModules,
  },
  sitemap: {
    enabled: enableSeoModules,
  },
})
