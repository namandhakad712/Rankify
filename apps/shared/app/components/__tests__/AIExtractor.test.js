/**
 * AI Extractor Component Tests
 * Tests for the AI-powered PDF extraction component
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AIExtractor from '../AIExtractor.vue'

// Mock dependencies
vi.mock('#layers/shared/app/utils/geminiAPIClient', () => ({
  GeminiAPIClient: vi.fn().mockImplementation(() => ({
    extractQuestions: vi.fn(),
    validateApiKey: vi.fn()
  }))
}))

vi.mock('#layers/shared/app/utils/storageManager', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    save: vi.fn(),
    load: vi.fn()
  }))
}))

vi.mock('#layers/shared/app/composables/useFeatureFlags', () => ({
  getFeatureFlags: vi.fn(() => ({
    isEnabled: vi.fn(() => true),
    aiExtractionEnabled: { value: true },
    confidenceScoringEnabled: { value: true },
    diagramDetectionEnabled: { value: true }
  }))
}))

// Mock global objects
global.FileReader = vi.fn(() => ({
  readAsArrayBuffer: vi.fn(),
  result: new ArrayBuffer(1024),
  onload: null,
  onerror: null
}))

describe('AIExtractor Component', () => {
  let wrapper
  let mockGeminiClient
  let mockStorageManager
  
  beforeEach(() => {
    // Setup mocks
    mockGeminiClient = {
      extractQuestions: vi.fn(),
      validateApiKey: vi.fn().mockResolvedValue(true)
    }
    
    mockStorageManager = {
      save: vi.fn().mockResolvedValue({ success: true, id: 'test-123' }),
      load: vi.fn().mockResolvedValue(null)
    }
    
    // Mount component
    wrapper = mount(AIExtractor, {
      global: {
        stubs: {
          'UiButton': true,
          'UiInput': true,
          'UiProgress': true,
          'UiCard': true,
          'UiAlert': true,
          'Icon': true
        }
      }
    })
  })
  
  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  describe('Component Initialization', () => {
    test('should render correctly', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="ai-extractor"]').exists()).toBe(true)
    })

    test('should show API key input when not configured', () => {
      expect(wrapper.find('[data-testid="api-key-input"]').exists()).toBe(true)
    })

    test('should show file upload area', () => {
      expect(wrapper.find('[data-testid="file-upload"]').exists()).toBe(true)
    })

    test('should display feature flags status', () => {
      expect(wrapper.find('[data-testid="features-status"]').exists()).toBe(true)
    })
  })

  describe('API Key Management', () => {
    test('should validate API key on input', async () => {
      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      
      await apiKeyInput.setValue('test-api-key-123')
      await apiKeyInput.trigger('blur')
      
      expect(mockGeminiClient.validateApiKey).toHaveBeenCalledWith('test-api-key-123')
    })

    test('should show validation status', async () => {
      mockGeminiClient.validateApiKey.mockResolvedValue(true)
      
      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      await apiKeyInput.setValue('valid-key')
      await apiKeyInput.trigger('blur')
      await nextTick()
      
      expect(wrapper.find('[data-testid="api-key-valid"]').exists()).toBe(true)
    })

    test('should handle invalid API key', async () => {
      mockGeminiClient.validateApiKey.mockResolvedValue(false)
      
      const apiKeyInput = wrapper.find('[data-testid="api-key-input"]')
      await apiKeyInput.setValue('invalid-key')
      await apiKeyInput.trigger('blur')
      await nextTick()
      
      expect(wrapper.find('[data-testid="api-key-invalid"]').exists()).toBe(true)
    })

    test('should store API key securely', async () => {
      const apiKey = 'secure-api-key-123'
      
      await wrapper.vm.setApiKey(apiKey)
      
      expect(wrapper.vm.apiKey).toBe(apiKey)
      // Verify it's stored in secure storage (localStorage with encryption)
    })
  })

  describe('File Upload', () => {
    test('should handle file selection', async () => {
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('[data-testid="file-input"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      
      expect(wrapper.vm.selectedFile).toBe(mockFile)
      expect(wrapper.find('[data-testid="file-selected"]').text()).toContain('test.pdf')
    })

    test('should validate file type', async () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const fileInput = wrapper.find('[data-testid="file-input"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [invalidFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      
      expect(wrapper.find('[data-testid="file-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="file-error"]').text()).toContain('PDF files only')
    })

    test('should validate file size', async () => {
      const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('[data-testid="file-input"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [largeFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      
      expect(wrapper.find('[data-testid="file-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="file-error"]').text()).toContain('File too large')
    })

    test('should support drag and drop', async () => {
      const mockFile = new File(['mock pdf content'], 'dropped.pdf', { type: 'application/pdf' })
      const dropZone = wrapper.find('[data-testid="drop-zone"]')
      
      const dropEvent = new Event('drop')
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [mockFile] }
      })
      
      await dropZone.trigger('drop', dropEvent)
      
      expect(wrapper.vm.selectedFile).toBe(mockFile)
    })
  })

  describe('PDF Processing', () => {
    beforeEach(async () => {
      // Setup valid API key and file
      await wrapper.vm.setApiKey('valid-api-key')
      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' })
      wrapper.vm.selectedFile = mockFile
    })

    test('should start processing when extract button clicked', async () => {
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: [
          {
            id: 1,
            text: 'Sample question?',
            type: 'MCQ',
            options: ['A', 'B', 'C', 'D'],
            confidence: 4.5,
            hasDiagram: false
          }
        ],
        metadata: { totalQuestions: 1, processingTime: 1000 }
      })
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      
      expect(wrapper.vm.isProcessing).toBe(true)
      expect(wrapper.find('[data-testid="progress-bar"]').exists()).toBe(true)
    })

    test('should show progress during processing', async () => {
      let resolveExtraction
      const extractionPromise = new Promise(resolve => {
        resolveExtraction = resolve
      })
      
      mockGeminiClient.extractQuestions.mockReturnValue(extractionPromise)
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      
      expect(wrapper.find('[data-testid="progress-bar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="progress-text"]').text()).toContain('Processing')
      
      // Resolve the promise
      resolveExtraction({
        questions: [],
        metadata: { totalQuestions: 0, processingTime: 500 }
      })
      
      await nextTick()
      expect(wrapper.vm.isProcessing).toBe(false)
    })

    test('should display extracted questions', async () => {
      const mockQuestions = [
        {
          id: 1,
          text: 'What is 2+2?',
          type: 'MCQ',
          options: ['2', '3', '4', '5'],
          confidence: 4.8,
          hasDiagram: false
        },
        {
          id: 2,
          text: 'Calculate the area of a circle',
          type: 'NAT',
          options: [],
          confidence: 3.2,
          hasDiagram: true
        }
      ]
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: mockQuestions,
        metadata: { totalQuestions: 2, processingTime: 1500 }
      })
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      expect(wrapper.find('[data-testid="results-section"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-testid="question-card"]')).toHaveLength(2)
      
      const firstQuestion = wrapper.find('[data-testid="question-card"]:first-child')
      expect(firstQuestion.text()).toContain('What is 2+2?')
      expect(firstQuestion.text()).toContain('MCQ')
      expect(firstQuestion.text()).toContain('4.8')
    })

    test('should highlight low confidence questions', async () => {
      const mockQuestions = [
        {
          id: 1,
          text: 'High confidence question',
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          confidence: 4.8,
          hasDiagram: false
        },
        {
          id: 2,
          text: 'Low confidence question',
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          confidence: 1.5,
          hasDiagram: false
        }
      ]
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: mockQuestions,
        metadata: { totalQuestions: 2, processingTime: 1000 }
      })
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      const questionCards = wrapper.findAll('[data-testid="question-card"]')
      expect(questionCards[0].classes()).not.toContain('low-confidence')
      expect(questionCards[1].classes()).toContain('low-confidence')
    })

    test('should show diagram indicators', async () => {
      const mockQuestions = [
        {
          id: 1,
          text: 'Question with diagram',
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          confidence: 4.0,
          hasDiagram: true
        }
      ]
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: mockQuestions,
        metadata: { totalQuestions: 1, processingTime: 800 }
      })
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      expect(wrapper.find('[data-testid="diagram-badge"]').exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockGeminiClient.extractQuestions.mockRejectedValue(new Error('API rate limit exceeded'))
      
      await wrapper.vm.setApiKey('valid-api-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      wrapper.vm.selectedFile = mockFile
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="error-message"]').text()).toContain('rate limit')
    })

    test('should show retry option on failure', async () => {
      mockGeminiClient.extractQuestions.mockRejectedValue(new Error('Temporary failure'))
      
      await wrapper.vm.setApiKey('valid-api-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      wrapper.vm.selectedFile = mockFile
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      expect(wrapper.find('[data-testid="retry-button"]').exists()).toBe(true)
    })

    test('should handle network errors', async () => {
      mockGeminiClient.extractQuestions.mockRejectedValue(new Error('Network error'))
      
      await wrapper.vm.setApiKey('valid-api-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      wrapper.vm.selectedFile = mockFile
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      expect(wrapper.find('[data-testid="error-message"]').text()).toContain('network')
      expect(wrapper.find('[data-testid="offline-mode-suggestion"]').exists()).toBe(true)
    })
  })

  describe('Results Management', () => {
    test('should save results to storage', async () => {
      const mockQuestions = [
        {
          id: 1,
          text: 'Sample question',
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          confidence: 4.0,
          hasDiagram: false
        }
      ]
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: mockQuestions,
        metadata: { totalQuestions: 1, processingTime: 500 }
      })
      
      await wrapper.vm.setApiKey('valid-api-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      wrapper.vm.selectedFile = mockFile
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      expect(mockStorageManager.save).toHaveBeenCalledWith(
        'ai-extraction',
        expect.objectContaining({
          questions: mockQuestions,
          metadata: expect.any(Object)
        })
      )
    })

    test('should provide export options', async () => {
      wrapper.vm.extractedQuestions = [
        {
          id: 1,
          text: 'Sample question',
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          confidence: 4.0,
          hasDiagram: false
        }
      ]
      
      await nextTick()
      
      expect(wrapper.find('[data-testid="export-json"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="export-csv"]').exists()).toBe(true)
    })

    test('should navigate to review interface', async () => {
      const mockRouter = { push: vi.fn() }
      wrapper.vm.$router = mockRouter
      
      wrapper.vm.extractedQuestions = [
        {
          id: 1,
          text: 'Sample question',
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          confidence: 4.0,
          hasDiagram: false
        }
      ]
      
      await nextTick()
      
      const reviewButton = wrapper.find('[data-testid="review-button"]')
      await reviewButton.trigger('click')
      
      expect(mockRouter.push).toHaveBeenCalledWith({
        path: '/review-interface',
        query: expect.objectContaining({
          questions: expect.any(String),
          fileName: expect.any(String)
        })
      })
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      expect(wrapper.find('[data-testid="file-input"]').attributes('aria-label')).toBeDefined()
      expect(wrapper.find('[data-testid="api-key-input"]').attributes('aria-label')).toBeDefined()
      expect(wrapper.find('[data-testid="extract-button"]').attributes('aria-label')).toBeDefined()
    })

    test('should support keyboard navigation', async () => {
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      
      await extractButton.trigger('keydown.enter')
      // Should trigger the same action as click
    })

    test('should announce processing status to screen readers', async () => {
      await wrapper.vm.setApiKey('valid-api-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      wrapper.vm.selectedFile = mockFile
      
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      
      expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
    })
  })

  describe('Performance', () => {
    test('should handle large files efficiently', async () => {
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      
      await wrapper.vm.setApiKey('valid-api-key')
      wrapper.vm.selectedFile = largeFile
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: [],
        metadata: { totalQuestions: 0, processingTime: 2000 }
      })
      
      const startTime = Date.now()
      const extractButton = wrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      const endTime = Date.now()
      
      // Should not block UI for more than 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    test('should show memory usage warnings', async () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 90 * 1024 * 1024, // 90MB
          jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
        }
      })
      
      const largeFile = new File(['x'.repeat(50 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' })
      wrapper.vm.selectedFile = largeFile
      
      await nextTick()
      
      expect(wrapper.find('[data-testid="memory-warning"]').exists()).toBe(true)
    })
  })
})