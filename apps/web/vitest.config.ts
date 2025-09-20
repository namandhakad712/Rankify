import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    root: resolve(__dirname, '../..'),
  },
  resolve: {
    alias: {
      '#layers/shared': resolve(__dirname, '../shared'),
    },
  },
})