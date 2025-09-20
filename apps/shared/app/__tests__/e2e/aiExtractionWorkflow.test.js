/**
 * End-to-End AI Extraction Workflow Tests
 * Tests the complete user journey from PDF upload to test creation
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'

// Import components
import AIExtractor from '../../components/AIExtractor.vue'
import ReviewInterface from '../../components/ReviewInterface.vue'
import CBTInterface from '../../components/Cbt/Interface/CBTInterface.vue'

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/ai-extractor', component: AIExtractor },
    { path: '/review-interface', component: ReviewInterface },
    { path: '/cbt/interface', component: CBTInterface }
  ]
})

// Mock global dependencies
vi.mock('#layers/shared/app/utils/geminiAPIClient')
vi.mock('#layers/shared/app/utils/storageManager')
vi.mock('#layers/shared/app/utils/performanceIntegration')

describe('AI Extraction Workflow E2E', () => {
  let mockGeminiClient
  let mockStorage
  let mockPerformance
  
  beforeEach(() => {
    // Setup comprehensive mocks
    mockGeminiClient = {
      extractQuestions: vi.fn(),
      validateApiKey: vi.fn().mockResolvedValue(true),
      detectDiagram: vi.fn(),
      calculateConfidence: vi.fn()
    }
    
    mockStorage = {
      save: vi.fn().mockResolvedValue({ success: true, id: 'test-123' }),
      load: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue([])
    }
    
    mockPerformance = {
      processLargePDFOptimized: vi.fn(),
      performSystemHealthCheck: vi.fn().mockResolvedValue({ overall: 'healthy' }),
      getSystemStatus: vi.fn().mockReturnValue({ status: 'initialized' })
    }
    
    // Mock global objects
    global.FileReader = vi.fn(() => ({
      readAsArrayBuffer: vi.fn(),
      result: new ArrayBuffer(1024),
      onload: null,
      onerror: null
    }))
    
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn()
    }
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete User Journey', () => {
    test('should complete full workflow: PDF upload → AI extraction → Review → CBT test', async () => {
      // Step 1: Start with AI Extractor
      const extractorWrapper = mount(AIExtractor, {
        global: {
          plugins: [router],
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
      
      // Mock successful extraction
      const mockExtractedQuestions = [
        {
          id: 1,
          text: 'What is the capital of France?',
          type: 'MCQ',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          subject: 'Geography',
          section: 'Europe',
          confidence: 4.8,
          hasDiagram: false,
          pageNumber: 1,
          questionNumber: 1
        },
        {
          id: 2,
          text: 'Calculate the area of the triangle in the diagram.',
          type: 'NAT',
          options: [],
          subject: 'Mathematics',
          section: 'Geometry',
          confidence: 2.3,
          hasDiagram: true,
          pageNumber: 2,
          questionNumber: 2
        }
      ]
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: mockExtractedQuestions,
        metadata: {
          totalQuestions: 2,
          processingTime: 1500,
          averageConfidence: 3.55,
          diagramQuestionsCount: 1
        }
      })
      
      // User enters API key
      const apiKeyInput = extractorWrapper.find('[data-testid="api-key-input"]')
      await apiKeyInput.setValue('test-api-key-123')
      await apiKeyInput.trigger('blur')
      await nextTick()
      
      // User uploads PDF file
      const mockFile = new File(['mock pdf content'], 'test-questions.pdf', { type: 'application/pdf' })
      const fileInput = extractorWrapper.find('[data-testid="file-input"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockFile],
        writable: false
      })
      
      await fileInput.trigger('change')
      await nextTick()
      
      // User clicks extract button
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      // Verify extraction was called
      expect(mockGeminiClient.extractQuestions).toHaveBeenCalled()
      
      // Verify results are displayed
      expect(extractorWrapper.find('[data-testid="results-section"]').exists()).toBe(true)
      expect(extractorWrapper.findAll('[data-testid="question-card"]')).toHaveLength(2)
      
      // User clicks "Review Questions" button
      const reviewButton = extractorWrapper.find('[data-testid="review-button"]')
      await reviewButton.trigger('click')
      
      // Step 2: Review Interface
      const reviewWrapper = mount(ReviewInterface, {
        props: {
          questions: mockExtractedQuestions,
          fileName: 'test-questions.pdf'
        },
        global: {
          plugins: [router],
          stubs: {
            'UiButton': true,
            'UiInput': true,
            'UiTextarea': true,
            'UiSelect': true,
            'UiCard': true,
            'UiBadge': true,
            'UiSwitch': true,
            'Icon': true
          }
        }
      })
      
      // Verify questions are loaded
      expect(reviewWrapper.findAll('[data-testid="question-editor"]')).toHaveLength(2)
      
      // User edits low confidence question
      const lowConfidenceEditor = reviewWrapper.findAll('[data-testid="question-editor"]')[1]
      const textInput = lowConfidenceEditor.find('[data-testid="question-text-input"]')
      
      const improvedText = 'Calculate the area of the right triangle with base 6cm and height 8cm.'
      await textInput.setValue(improvedText)
      
      // User confirms diagram flag
      const diagramToggle = lowConfidenceEditor.find('[data-testid="diagram-toggle"]')
      expect(diagramToggle.element.checked).toBe(true) // Should already be true
      
      // User saves changes
      const saveButton = reviewWrapper.find('[data-testid="save-button"]')
      await saveButton.trigger('click')
      
      // Verify save was called
      expect(mockStorage.save).toHaveBeenCalledWith(
        'reviewed-questions',
        expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({
              text: improvedText
            })
          ])
        })
      )
      
      // User proceeds to CBT interface
      const proceedButton = reviewWrapper.find('[data-testid="proceed-to-test"]')
      await proceedButton.trigger('click')
      
      // Step 3: CBT Interface (simplified test)
      const cbtWrapper = mount(CBTInterface, {
        props: {
          testData: {
            questions: reviewWrapper.vm.editedQuestions,
            metadata: {
              generatedBy: 'aiExtractorPage',
              aiMetadata: {
                totalConfidence: 3.55,
                diagramQuestionsCount: 1
              }
            }
          }
        },
        global: {
          plugins: [router],
          stubs: {
            'UiButton': true,
            'UiCard': true,
            'UiProgress': true,
            'Icon': true
          }
        }
      })
      
      // Verify test interface loads with AI data
      expect(cbtWrapper.find('[data-testid="ai-generated-badge"]').exists()).toBe(true)
      expect(cbtWrapper.find('[data-testid="confidence-filter"]').exists()).toBe(true)
      
      // Cleanup
      extractorWrapper.unmount()
      reviewWrapper.unmount()
      cbtWrapper.unmount()
    })

    test('should handle errors gracefully throughout workflow', async () => {
      const extractorWrapper = mount(AIExtractor, {
        global: {
          stubs: {
            'UiButton': true,
            'UiInput': true,
            'UiAlert': true,
            'Icon': true
          }
        }
      })
      
      // Mock API failure
      mockGeminiClient.extractQuestions.mockRejectedValue(new Error('API rate limit exceeded'))
      
      // User attempts extraction
      await extractorWrapper.vm.setApiKey('test-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = mockFile
      
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      // Verify error is displayed
      expect(extractorWrapper.find('[data-testid="error-message"]').exists()).toBe(true)
      expect(extractorWrapper.find('[data-testid="retry-button"]').exists()).toBe(true)
      
      // User clicks retry
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: [],
        metadata: { totalQuestions: 0, processingTime: 100 }
      })
      
      const retryButton = extractorWrapper.find('[data-testid="retry-button"]')
      await retryButton.trigger('click')
      await nextTick()
      
      // Verify retry worked
      expect(mockGeminiClient.extractQuestions).toHaveBeenCalledTimes(2)
      
      extractorWrapper.unmount()
    })

    test('should preserve data across navigation', async () => {
      // Start with extraction
      const extractorWrapper = mount(AIExtractor, {
        global: {
          plugins: [router],
          stubs: { 'UiButton': true, 'UiInput': true, 'UiCard': true, 'Icon': true }
        }
      })
      
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
      
      // Complete extraction
      await extractorWrapper.vm.setApiKey('test-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = mockFile
      
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      // Navigate to review interface
      const reviewButton = extractorWrapper.find('[data-testid="review-button"]')
      await reviewButton.trigger('click')
      
      // Verify data was passed correctly
      expect(router.currentRoute.value.query.questions).toBeDefined()
      expect(router.currentRoute.value.query.fileName).toBe('test.pdf')
      
      extractorWrapper.unmount()
    })
  })

  describe('Performance and Memory Management', () => {
    test('should handle large PDF files efficiently', async () => {
      const extractorWrapper = mount(AIExtractor, {
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'UiAlert': true, 'Icon': true }
        }
      })
      
      // Mock large file processing
      const largePDFBuffer = new ArrayBuffer(50 * 1024 * 1024) // 50MB
      
      mockPerformance.processLargePDFOptimized.mockResolvedValue([
        { size: 1024, checksum: 123 },
        { size: 1024, checksum: 456 }
      ])
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          text: `Question ${i + 1}`,
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          confidence: 4.0,
          hasDiagram: false
        })),
        metadata: {
          totalQuestions: 100,
          processingTime: 5000,
          memoryUsage: '45MB'
        }
      })
      
      await extractorWrapper.vm.setApiKey('test-key')
      const largeFile = new File([new ArrayBuffer(50 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = largeFile
      
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      // Verify performance optimization was used
      expect(mockPerformance.processLargePDFOptimized).toHaveBeenCalled()
      
      // Verify memory warning is shown if needed
      if (extractorWrapper.vm.memoryUsage > 80) {
        expect(extractorWrapper.find('[data-testid="memory-warning"]').exists()).toBe(true)
      }
      
      extractorWrapper.unmount()
    })

    test('should monitor system health during processing', async () => {
      const extractorWrapper = mount(AIExtractor, {
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'Icon': true }
        }
      })
      
      // Mock health check
      mockPerformance.performSystemHealthCheck.mockResolvedValue({
        overall: 'warning',
        systems: {
          memory: { status: 'warning', usage: 0.85 },
          performance: { status: 'healthy' }
        },
        issues: ['High memory usage detected']
      })
      
      await extractorWrapper.vm.setApiKey('test-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = mockFile
      
      // Start processing
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      
      // Verify health check was performed
      expect(mockPerformance.performSystemHealthCheck).toHaveBeenCalled()
      
      extractorWrapper.unmount()
    })
  })

  describe('Accessibility and User Experience', () => {
    test('should provide proper keyboard navigation', async () => {
      const extractorWrapper = mount(AIExtractor, {
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'Icon': true }
        }
      })
      
      // Test tab navigation
      const apiKeyInput = extractorWrapper.find('[data-testid="api-key-input"]')
      await apiKeyInput.trigger('keydown.tab')
      
      const fileInput = extractorWrapper.find('[data-testid="file-input"]')
      expect(document.activeElement).toBe(fileInput.element)
      
      // Test Enter key activation
      await extractorWrapper.vm.setApiKey('test-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = mockFile
      
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('keydown.enter')
      
      // Should trigger extraction
      expect(extractorWrapper.vm.isProcessing).toBe(true)
      
      extractorWrapper.unmount()
    })

    test('should announce status changes to screen readers', async () => {
      const extractorWrapper = mount(AIExtractor, {
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'Icon': true }
        }
      })
      
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: [{ id: 1, text: 'Test', type: 'MCQ', options: ['A', 'B'], confidence: 4.0 }],
        metadata: { totalQuestions: 1, processingTime: 500 }
      })
      
      await extractorWrapper.vm.setApiKey('test-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = mockFile
      
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      // Verify ARIA live region updates
      const liveRegion = extractorWrapper.find('[aria-live="polite"]')
      expect(liveRegion.exists()).toBe(true)
      expect(liveRegion.text()).toContain('Processing complete')
      
      extractorWrapper.unmount()
    })

    test('should provide helpful error messages and recovery options', async () => {
      const extractorWrapper = mount(AIExtractor, {
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'UiAlert': true, 'Icon': true }
        }
      })
      
      // Test different error scenarios
      const errorScenarios = [
        {
          error: new Error('Invalid API key'),
          expectedMessage: 'API key is invalid',
          expectedAction: 'update-api-key'
        },
        {
          error: new Error('Rate limit exceeded'),
          expectedMessage: 'too many requests',
          expectedAction: 'retry-later'
        },
        {
          error: new Error('PDF is corrupted'),
          expectedMessage: 'file appears to be corrupted',
          expectedAction: 'try-different-file'
        }
      ]
      
      for (const scenario of errorScenarios) {
        mockGeminiClient.extractQuestions.mockRejectedValue(scenario.error)
        
        await extractorWrapper.vm.setApiKey('test-key')
        const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
        extractorWrapper.vm.selectedFile = mockFile
        
        const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
        await extractButton.trigger('click')
        await nextTick()
        
        // Verify appropriate error message and action
        const errorMessage = extractorWrapper.find('[data-testid="error-message"]')
        expect(errorMessage.text().toLowerCase()).toContain(scenario.expectedMessage.toLowerCase())
        
        const actionButton = extractorWrapper.find(`[data-testid="${scenario.expectedAction}"]`)
        expect(actionButton.exists()).toBe(true)
      }
      
      extractorWrapper.unmount()
    })
  })

  describe('Data Integrity and Validation', () => {
    test('should maintain data consistency across workflow steps', async () => {
      const originalQuestions = [
        {
          id: 1,
          text: 'Original question text',
          type: 'MCQ',
          options: ['A', 'B', 'C', 'D'],
          subject: 'Math',
          section: 'Algebra',
          confidence: 4.5,
          hasDiagram: false,
          pageNumber: 1,
          questionNumber: 1,
          extractionMetadata: {
            processingTime: 150,
            geminiModel: 'gemini-1.5-flash'
          }
        }
      ]
      
      // Step 1: Extraction
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: originalQuestions,
        metadata: { totalQuestions: 1, processingTime: 150 }
      })
      
      const extractorWrapper = mount(AIExtractor, {
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'UiCard': true, 'Icon': true }
        }
      })
      
      await extractorWrapper.vm.setApiKey('test-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = mockFile
      
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      // Verify extraction preserves all data
      expect(extractorWrapper.vm.extractedQuestions[0]).toEqual(originalQuestions[0])
      
      // Step 2: Review with modifications
      const reviewWrapper = mount(ReviewInterface, {
        props: {
          questions: extractorWrapper.vm.extractedQuestions,
          fileName: 'test.pdf'
        },
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'UiTextarea': true, 'UiSelect': true, 'Icon': true }
        }
      })
      
      // Modify question
      const modifiedText = 'Modified question text'
      reviewWrapper.vm.editedQuestions[0].text = modifiedText
      
      // Save changes
      const saveButton = reviewWrapper.find('[data-testid="save-button"]')
      await saveButton.trigger('click')
      
      // Verify modifications are preserved
      expect(reviewWrapper.vm.editedQuestions[0].text).toBe(modifiedText)
      expect(reviewWrapper.vm.editedQuestions[0].id).toBe(originalQuestions[0].id)
      expect(reviewWrapper.vm.editedQuestions[0].extractionMetadata).toEqual(originalQuestions[0].extractionMetadata)
      
      // Verify save was called with correct data
      expect(mockStorage.save).toHaveBeenCalledWith(
        'reviewed-questions',
        expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({
              text: modifiedText,
              id: originalQuestions[0].id
            })
          ])
        })
      )
      
      extractorWrapper.unmount()
      reviewWrapper.unmount()
    })

    test('should validate data at each step', async () => {
      const invalidQuestions = [
        {
          id: 1,
          text: '', // Invalid: empty text
          type: 'MCQ',
          options: ['A'], // Invalid: too few options
          subject: 'Math',
          confidence: 4.0
        }
      ]
      
      const reviewWrapper = mount(ReviewInterface, {
        props: {
          questions: invalidQuestions,
          fileName: 'test.pdf'
        },
        global: {
          stubs: { 'UiButton': true, 'UiInput': true, 'UiAlert': true, 'Icon': true }
        }
      })
      
      // Trigger validation
      await reviewWrapper.vm.validateAllQuestions()
      await nextTick()
      
      // Verify validation errors are shown
      expect(reviewWrapper.find('[data-testid="validation-error"]').exists()).toBe(true)
      
      // Verify save is disabled with invalid data
      const saveButton = reviewWrapper.find('[data-testid="save-button"]')
      expect(saveButton.attributes('disabled')).toBeDefined()
      
      reviewWrapper.unmount()
    })
  })

  describe('Feature Flag Integration', () => {
    test('should respect feature flags throughout workflow', async () => {
      // Mock feature flags
      const mockFeatureFlags = {
        isEnabled: vi.fn((flag) => {
          const enabledFlags = ['ai_extraction', 'review_interface', 'confidence_scoring']
          return enabledFlags.includes(flag)
        }),
        aiExtractionEnabled: { value: true },
        reviewInterfaceEnabled: { value: true },
        confidenceScoringEnabled: { value: true },
        diagramDetectionEnabled: { value: false } // Disabled
      }
      
      const extractorWrapper = mount(AIExtractor, {
        global: {
          provide: {
            featureFlags: mockFeatureFlags
          },
          stubs: { 'UiButton': true, 'UiInput': true, 'UiCard': true, 'Icon': true }
        }
      })
      
      // Verify diagram detection is hidden when disabled
      expect(extractorWrapper.find('[data-testid="diagram-detection-info"]').exists()).toBe(false)
      
      // Verify confidence scoring is shown when enabled
      mockGeminiClient.extractQuestions.mockResolvedValue({
        questions: [{ id: 1, text: 'Test', type: 'MCQ', options: ['A', 'B'], confidence: 4.0 }],
        metadata: { totalQuestions: 1 }
      })
      
      await extractorWrapper.vm.setApiKey('test-key')
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      extractorWrapper.vm.selectedFile = mockFile
      
      const extractButton = extractorWrapper.find('[data-testid="extract-button"]')
      await extractButton.trigger('click')
      await nextTick()
      
      // Verify confidence scores are displayed
      expect(extractorWrapper.find('[data-testid="confidence-score"]').exists()).toBe(true)
      
      extractorWrapper.unmount()
    })
  })
})