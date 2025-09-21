/**
 * Global Test Setup and Configuration
 * Sets up the testing environment for all test suites
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'

// Global test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  verbose: process.env.NODE_ENV === 'development'
}

// Mock browser APIs
const mockBrowserAPIs = () => {
  // Mock localStorage
  const localStorageMock = {
    data: new Map<string, string>(),
    getItem: vi.fn((key: string) => localStorageMock.data.get(key) || null),
    setItem: vi.fn((key: string, value: string) => localStorageMock.data.set(key, value)),
    removeItem: vi.fn((key: string) => localStorageMock.data.delete(key)),
    clear: vi.fn(() => localStorageMock.data.clear()),
    get length() { return localStorageMock.data.size },
    key: vi.fn((index: number) => Array.from(localStorageMock.data.keys())[index] || null)
  }

  // Mock sessionStorage
  const sessionStorageMock = {
    data: new Map<string, string>(),
    getItem: vi.fn((key: string) => sessionStorageMock.data.get(key) || null),
    setItem: vi.fn((key: string, value: string) => sessionStorageMock.data.set(key, value)),
    removeItem: vi.fn((key: string) => sessionStorageMock.data.delete(key)),
    clear: vi.fn(() => sessionStorageMock.data.clear()),
    get length() { return sessionStorageMock.data.size },
    key: vi.fn((index: number) => Array.from(sessionStorageMock.data.keys())[index] || null)
  }

  // Mock IndexedDB
  const indexedDBMock = {
    databases: new Map<string, Map<string, any>>(),
    open: vi.fn((dbName: string, version?: number) => {
      if (!indexedDBMock.databases.has(dbName)) {
        indexedDBMock.databases.set(dbName, new Map())
      }
      
      return Promise.resolve({
        result: {
          name: dbName,
          version: version || 1,
          objectStoreNames: ['diagramCoordinates', 'pageImages', 'cbtPresets'],
          transaction: vi.fn((storeNames: string[], mode: string) => ({
            objectStore: vi.fn((storeName: string) => ({
              add: vi.fn((data: any, key?: any) => Promise.resolve(key || `${storeName}_${Date.now()}`)),
              get: vi.fn((key: any) => Promise.resolve(indexedDBMock.databases.get(dbName)?.get(key))),
              getAll: vi.fn(() => Promise.resolve(Array.from(indexedDBMock.databases.get(dbName)?.values() || []))),
              put: vi.fn((data: any, key?: any) => Promise.resolve(key || `${storeName}_updated`)),
              delete: vi.fn((key: any) => Promise.resolve(undefined)),
              clear: vi.fn(() => Promise.resolve(undefined)),
              count: vi.fn(() => Promise.resolve(indexedDBMock.databases.get(dbName)?.size || 0)),
              index: vi.fn((indexName: string) => ({
                get: vi.fn((key: any) => Promise.resolve(null)),
                getAll: vi.fn(() => Promise.resolve([]))
              }))
            }))
          })),
          close: vi.fn(),
          deleteObjectStore: vi.fn(),
          createObjectStore: vi.fn((name: string, options?: any) => ({
            name,
            keyPath: options?.keyPath,
            autoIncrement: options?.autoIncrement || false,
            createIndex: vi.fn()
          }))
        }
      })
    }),
    deleteDatabase: vi.fn((name: string) => {
      indexedDBMock.databases.delete(name)
      return Promise.resolve()
    })
  }

  // Mock Canvas API
  const canvasMock = {
    getContext: vi.fn((type: string) => {
      if (type === '2d') {
        return {
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          font: '10px sans-serif',
          textAlign: 'start',
          textBaseline: 'alphabetic',
          globalAlpha: 1,
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          clearRect: vi.fn(),
          fillText: vi.fn(),
          strokeText: vi.fn(),
          drawImage: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          rect: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          measureText: vi.fn(() => ({ width: 100 })),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(4),
            width: 1,
            height: 1
          })),
          putImageData: vi.fn(),
          createImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(4),
            width: 1,
            height: 1
          }))
        }
      }
      return null
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data'),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
      callback(new Blob(['mock-canvas-blob'], { type: 'image/png' }))
    }),
    width: 800,
    height: 600
  }

  // Mock Image
  const imageMock = vi.fn(() => ({
    src: '',
    width: 0,
    height: 0,
    onload: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))

  // Mock File and FileReader
  const fileReaderMock = vi.fn(() => ({
    readAsText: vi.fn(function(this: any, file: Blob) {
      setTimeout(() => {
        this.result = 'mock file content'
        if (this.onload) this.onload({ target: this })
      }, 10)
    }),
    readAsDataURL: vi.fn(function(this: any, file: Blob) {
      setTimeout(() => {
        this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ='
        if (this.onload) this.onload({ target: this })
      }, 10)
    }),
    readAsArrayBuffer: vi.fn(function(this: any, file: Blob) {
      setTimeout(() => {
        this.result = new ArrayBuffer(8)
        if (this.onload) this.onload({ target: this })
      }, 10)
    }),
    onload: null,
    onerror: null,
    result: null
  }))

  // Mock IntersectionObserver
  const intersectionObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [0]
  }))

  // Mock ResizeObserver
  const resizeObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // Mock MutationObserver
  const mutationObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
  }))

  // Mock Performance API
  const performanceMock = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024
    }
  }

  // Mock fetch
  const fetchMock = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  }))

  // Apply mocks to global scope
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true })
  Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true })
  Object.defineProperty(global, 'indexedDB', { value: indexedDBMock, writable: true })
  Object.defineProperty(global, 'HTMLCanvasElement', { value: function() { return canvasMock }, writable: true })
  Object.defineProperty(global, 'Image', { value: imageMock, writable: true })
  Object.defineProperty(global, 'FileReader', { value: fileReaderMock, writable: true })
  Object.defineProperty(global, 'IntersectionObserver', { value: intersectionObserverMock, writable: true })
  Object.defineProperty(global, 'ResizeObserver', { value: resizeObserverMock, writable: true })
  Object.defineProperty(global, 'MutationObserver', { value: mutationObserverMock, writable: true })
  Object.defineProperty(global, 'performance', { value: performanceMock, writable: true })
  Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true })

  // Mock URL and URLSearchParams
  Object.defineProperty(global, 'URL', {
    value: class MockURL {
      constructor(public href: string, base?: string) {}
      toString() { return this.href }
    },
    writable: true
  })

  Object.defineProperty(global, 'URLSearchParams', {
    value: class MockURLSearchParams {
      private params = new Map<string, string>()
      
      constructor(init?: string | string[][] | Record<string, string>) {
        if (typeof init === 'string') {
          // Parse query string
          init.split('&').forEach(pair => {
            const [key, value] = pair.split('=')
            if (key) this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''))
          })
        }
      }
      
      get(name: string) { return this.params.get(name) }
      set(name: string, value: string) { this.params.set(name, value) }
      has(name: string) { return this.params.has(name) }
      delete(name: string) { this.params.delete(name) }
      toString() {
        return Array.from(this.params.entries())
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&')
      }
    },
    writable: true
  })

  return {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    indexedDB: indexedDBMock,
    canvas: canvasMock,
    performance: performanceMock,
    fetch: fetchMock
  }
}

// Mock console methods for cleaner test output
const mockConsole = () => {
  const originalConsole = { ...console }
  
  // Only mock in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log = vi.fn()
    console.info = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
    console.debug = vi.fn()
  }
  
  return originalConsole
}

// Test utilities
export const testUtils = {
  // Create mock file
  createMockFile: (name: string, content: string, type: string = 'text/plain'): File => {
    const blob = new Blob([content], { type })
    return new File([blob], name, { type })
  },

  // Create mock image
  createMockImage: (width: number = 800, height: number = 600): HTMLImageElement => {
    const img = new Image()
    Object.defineProperty(img, 'width', { value: width, writable: true })
    Object.defineProperty(img, 'height', { value: height, writable: true })
    return img
  },

  // Wait for async operations
  waitFor: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock async operation
  mockAsyncOperation: <T>(result: T, delay: number = 100): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(result), delay))
  },

  // Generate test data
  generateTestCoordinates: (count: number = 1) => {
    return Array.from({ length: count }, (_, i) => ({
      x1: Math.random() * 700,
      y1: Math.random() * 500,
      x2: Math.random() * 700 + 100,
      y2: Math.random() * 500 + 100,
      confidence: 0.5 + Math.random() * 0.5,
      type: ['graph', 'table', 'flowchart', 'scientific'][Math.floor(Math.random() * 4)],
      description: `Test diagram ${i + 1}`
    }))
  },

  // Performance measurement
  measurePerformance: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now()
    const result = await operation()
    const duration = performance.now() - start
    return { result, duration }
  }
}

// Global setup
let browserAPIs: ReturnType<typeof mockBrowserAPIs>
let originalConsole: typeof console

beforeAll(() => {
  // Setup JSDOM environment
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
  })

  // Set global window and document
  global.window = dom.window as any
  global.document = dom.window.document
  global.navigator = dom.window.navigator

  // Mock browser APIs
  browserAPIs = mockBrowserAPIs()
  originalConsole = mockConsole()

  // Set test timeout
  vi.setConfig({ testTimeout: TEST_CONFIG.timeout })
})

afterAll(() => {
  // Restore console
  if (originalConsole) {
    Object.assign(console, originalConsole)
  }

  // Cleanup global mocks
  vi.clearAllMocks()
  vi.resetAllMocks()
})

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  
  // Reset browser API states
  if (browserAPIs) {
    browserAPIs.localStorage.data.clear()
    browserAPIs.sessionStorage.data.clear()
    browserAPIs.indexedDB.databases.clear()
  }
})

afterEach(() => {
  // Cleanup after each test
  vi.clearAllTimers()
  vi.unstubAllGlobals()
})

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Export test configuration
export { TEST_CONFIG, testUtils }

// Make test utilities available globally
declare global {
  var testUtils: typeof testUtils
}

global.testUtils = testUtils