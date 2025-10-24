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
    server: {
      hmr: {
        overlay: true,
      },
      watch: {
        // Ignore node_modules to speed up HMR
        ignored: ['**/node_modules/**', '**/.nuxt/**', '**/dist/**'],
      },
    },
    optimizeDeps: {
      // Pre-bundle heavy dependencies
      include: ['vue', 'vue-router'],
      // Exclude PDF.js from optimization (we don't use it anymore)
      exclude: ['pdfjs-dist'],
    },
  },
  icon: {
    clientBundle: {
      scan: {
        globInclude: ['../shared/**/*.vue', '../web/**/*.vue'],
        globExclude: ['../*/node_modules/**', '../*/dist*/**'],
      },
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
