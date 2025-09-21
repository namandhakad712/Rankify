/**
 * Comprehensive Test Suite Configuration
 * Configures and orchestrates all test types for the advanced diagram detection system
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./testSetup.ts'],
    
    // Test file patterns
    include: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'app/**/*.ts',
        'app/**/*.vue',
        'shared/**/*.ts',
        'utils/**/*.ts'
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/.nuxt/**',
        '**/dist/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Specific thresholds for critical components
        'utils/performance/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'utils/errorHandling/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },

    // Test execution configuration
    testTimeout: 30000, // 30 seconds for complex integration tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    teardownTimeout: 5000,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1
      }
    },

    // Reporter configuration
    reporter: [
      'default',
      'json',
      'html',
      ['junit', { outputFile: './test-results/junit.xml' }]
    ],

    // Mock configuration
    deps: {
      inline: ['@nuxt/test-utils']
    },

    // Test categorization
    sequence: {
      hooks: 'parallel',
      setupFiles: 'list'
    }
  },

  // Resolve configuration
  resolve: {
    alias: {
      '~': path.resolve(__dirname, '../'),
      '@': path.resolve(__dirname, '../'),
      '~~': path.resolve(__dirname, '../../../'),
      '@@': path.resolve(__dirname, '../../../')
    }
  },

  // Define test categories
  define: {
    __TEST_CATEGORIES__: {
      UNIT: 'unit',
      INTEGRATION: 'integration',
      E2E: 'e2e',
      VISUAL: 'visual',
      PERFORMANCE: 'performance'
    }
  }
})

// Test suite categories and their configurations
export const testCategories = {
  unit: {
    name: 'Unit Tests',
    pattern: '**/__tests__/unit/**/*.test.ts',
    timeout: 5000,
    parallel: true,
    coverage: true,
    description: 'Fast, isolated tests for individual components and functions'
  },
  
  integration: {
    name: 'Integration Tests',
    pattern: '**/__tests__/integration/**/*.test.ts',
    timeout: 15000,
    parallel: true,
    coverage: true,
    description: 'Tests for component interactions and workflow integration'
  },
  
  e2e: {
    name: 'End-to-End Tests',
    pattern: '**/__tests__/e2e/**/*.test.ts',
    timeout: 30000,
    parallel: false,
    coverage: false,
    description: 'Complete user journey tests from start to finish'
  },
  
  visual: {
    name: 'Visual Regression Tests',
    pattern: '**/__tests__/visual/**/*.test.ts',
    timeout: 10000,
    parallel: true,
    coverage: false,
    description: 'Tests for visual accuracy and rendering consistency'
  },
  
  performance: {
    name: 'Performance Tests',
    pattern: '**/__tests__/performance/**/*.test.ts',
    timeout: 60000,
    parallel: false,
    coverage: false,
    description: 'Tests for performance benchmarks and optimization validation'
  }
}

// Test execution strategies
export const executionStrategies = {
  // Quick feedback during development
  development: {
    categories: ['unit'],
    watch: true,
    coverage: false,
    parallel: true
  },
  
  // Pre-commit validation
  preCommit: {
    categories: ['unit', 'integration'],
    watch: false,
    coverage: true,
    parallel: true
  },
  
  // Full test suite for CI/CD
  ci: {
    categories: ['unit', 'integration', 'visual', 'e2e'],
    watch: false,
    coverage: true,
    parallel: true
  },
  
  // Performance validation
  performance: {
    categories: ['performance'],
    watch: false,
    coverage: false,
    parallel: false
  },
  
  // Complete validation including performance
  complete: {
    categories: ['unit', 'integration', 'visual', 'e2e', 'performance'],
    watch: false,
    coverage: true,
    parallel: true
  }
}

// Quality gates and thresholds
export const qualityGates = {
  coverage: {
    minimum: 80,
    target: 90,
    critical: 95
  },
  
  performance: {
    maxExecutionTime: {
      unit: 100, // ms per test
      integration: 1000, // ms per test
      e2e: 10000 // ms per test
    },
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxCpuUsage: 80 // percentage
  },
  
  reliability: {
    maxFlakiness: 0.01, // 1% flaky test rate
    minPassRate: 0.99 // 99% pass rate
  }
}

// Test data and fixtures configuration
export const testDataConfig = {
  fixtures: {
    path: path.resolve(__dirname, './fixtures'),
    mockPdfs: ['sample-jee.pdf', 'sample-neet.pdf', 'complex-diagrams.pdf'],
    mockImages: ['graph-sample.png', 'table-sample.png', 'circuit-sample.png'],
    mockCoordinates: ['coordinates-set-1.json', 'coordinates-set-2.json']
  },
  
  mocks: {
    apis: {
      gemini: true,
      database: true,
      storage: true
    },
    browser: {
      localStorage: true,
      indexedDB: true,
      canvas: true,
      intersectionObserver: true
    }
  }
}

// Reporting configuration
export const reportingConfig = {
  outputs: {
    console: true,
    html: './test-results/html-report',
    json: './test-results/results.json',
    junit: './test-results/junit.xml',
    coverage: './coverage'
  },
  
  notifications: {
    slack: process.env.SLACK_WEBHOOK_URL,
    email: process.env.TEST_NOTIFICATION_EMAIL
  },
  
  artifacts: {
    screenshots: './test-results/screenshots',
    videos: './test-results/videos',
    logs: './test-results/logs'
  }
}