/**
 * Review Interface Component Tests
 * Tests for the AI question review and editing component
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ReviewInterface from '../ReviewInterface.vue'

// Mock dependencies
vi.mock('#layers/shared/app/utils/jsonValidator', () => ({
  JSONValidator: vi.fn().mockImplementation(() => ({
    validate: vi.fn(),
    sanitize: vi.fn()
  }))
}))

vi.mock('#layers/shared/app/utils/storageManager', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    save: vi.fn(),
    load: vi.fn()
  }))
}))

describe('ReviewInterface Component', () => {
  let wrapper
  let mockValidator
  let mockStorage
  
  const mockQuestions = [
    {
      id: 1,
      text: 'What is the capital of France?',
      type: 'MCQ',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: null,
      subject: 'Geography',
      section: 'Europe',
      pageNumber: 1,
      questionNumber: 1,
      confidence: 4.8,
      hasDiagram: false,
      extractionMetadata: {
        processingTime: 120,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    },
    {
      id: 2,
      text: 'Calculate the area of the triangle shown in the diagram.',
      type: 'NAT',
      options: [],
      correctAnswer: null,
      subject: 'Mathematics',
      section: 'Geometry',
      pageNumber: 2,
      questionNumber: 2,
      confidence: 2.1,
      hasDiagram: true,
      extractionMetadata: {
        processingTime: 200,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    },
    {
      id: 3,
      text: 'Which of the following are prime numbers?',
      type: 'MSQ',
      options: ['2', '3', '4', '5', '6', '7'],
      correctAnswer: null,
      subject: 'Mathematics',
      section: 'Number Theory',
      pageNumber: 3,
      questionNumber: 3,
      confidence: 3.5,
      hasDiagram: false,
      extractionMetadata: {
        processingTime: 180,
        geminiModel: 'gemini-1.5-flash',
        apiVersion: 'v1beta'
      }
    }
  ]
  
  beforeEach(() => {
    mockValidator = {
      validate: vi.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] }),
      sanitize: vi.fn().mockImplementation(data => data)
    }
    
    mockStorage = {
      save: vi.fn().mockResolvedValue({ success: true, id: 'test-123' }),
      load: vi.fn().mockResolvedValue(null)
    }
    
    wrapper = mount(ReviewInterface, {
      props: {
        questions: mockQuestions,
        fileName: 'test-questions.pdf'
      },
      global: {
        stubs: {
          'UiButton': true,
          'UiInput': true,
          'UiTextarea': true,
          'UiSelect': true,
          'UiCard': true,
          'UiBadge': true,
          'UiSwitch': true,
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
    test('should render correctly with questions', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="review-interface"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-testid="question-editor"]')).toHaveLength(3)
    })

    test('should display file name', () => {
      expect(wrapper.find('[data-testid="file-name"]').text()).toContain('test-questions.pdf')
    })

    test('should show question statistics', () => {
      const stats = wrapper.find('[data-testid="question-stats"]')
      expect(stats.text()).toContain('3 questions')
      expect(stats.text()).toContain('1 low confidence')
      expect(stats.text()).toContain('1 with diagram')
    })

    test('should calculate average confidence', () => {
      const avgConfidence = wrapper.find('[data-testid="avg-confidence"]')
      expect(avgConfidence.text()).toContain('3.5') // (4.8 + 2.1 + 3.5) / 3
    })
  })

  describe('Question Display', () => {
    test('should highlight low confidence questions', () => {
      const questionEditors = wrapper.findAll('[data-testid="question-editor"]')
      
      // First question (confidence 4.8) - should not be highlighted
      expect(questionEditors[0].classes()).not.toContain('low-confidence')
      
      // Second question (confidence 2.1) - should be highlighted
      expect(questionEditors[1].classes()).toContain('low-confidence')
      
      // Third question (confidence 3.5) - should not be highlighted
      expect(questionEditors[2].classes()).not.toContain('low-confidence')
    })

    test('should show diagram badges', () => {
      const questionEditors = wrapper.findAll('[data-testid="question-editor"]')
      
      // First question - no diagram
      expect(questionEditors[0].find('[data-testid="diagram-badge"]').exists()).toBe(false)
      
      // Second question - has diagram
      expect(questionEditors[1].find('[data-testid="diagram-badge"]').exists()).toBe(true)
      
      // Third question - no diagram
      expect(questionEditors[2].find('[data-testid="diagram-badge"]').exists()).toBe(false)
    })

    test('should display confidence scores', () => {
      const questionEditors = wrapper.findAll('[data-testid="question-editor"]')
      
      expect(questionEditors[0].find('[data-testid="confidence-score"]').text()).toContain('4.8')
      expect(questionEditors[1].find('[data-testid="confidence-score"]').text()).toContain('2.1')
      expect(questionEditors[2].find('[data-testid="confidence-score"]').text()).toContain('3.5')
    })

    test('should show question types correctly', () => {
      const questionEditors = wrapper.findAll('[data-testid="question-editor"]')
      
      expect(questionEditors[0].find('[data-testid="question-type"]').text()).toBe('MCQ')
      expect(questionEditors[1].find('[data-testid="question-type"]').text()).toBe('NAT')
      expect(questionEditors[2].find('[data-testid="question-type"]').text()).toBe('MSQ')
    })
  })

  describe('Question Editing', () => {
    test('should allow editing question text', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const textInput = firstEditor.find('[data-testid="question-text-input"]')
      
      const newText = 'What is the capital of Germany?'
      await textInput.setValue(newText)
      
      expect(wrapper.vm.editedQuestions[0].text).toBe(newText)
    })

    test('should allow editing options', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const optionInputs = firstEditor.findAll('[data-testid="option-input"]')
      
      const newOption = 'Rome'
      await optionInputs[0].setValue(newOption)
      
      expect(wrapper.vm.editedQuestions[0].options[0]).toBe(newOption)
    })

    test('should allow changing question type', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const typeSelect = firstEditor.find('[data-testid="type-select"]')
      
      await typeSelect.setValue('MSQ')
      
      expect(wrapper.vm.editedQuestions[0].type).toBe('MSQ')
    })

    test('should update options when changing to NAT type', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const typeSelect = firstEditor.find('[data-testid="type-select"]')
      
      await typeSelect.setValue('NAT')
      await nextTick()
      
      expect(wrapper.vm.editedQuestions[0].options).toEqual([])
      expect(firstEditor.findAll('[data-testid="option-input"]')).toHaveLength(0)
    })

    test('should allow editing subject and section', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const subjectInput = firstEditor.find('[data-testid="subject-input"]')
      const sectionInput = firstEditor.find('[data-testid="section-input"]')
      
      await subjectInput.setValue('History')
      await sectionInput.setValue('World Capitals')
      
      expect(wrapper.vm.editedQuestions[0].subject).toBe('History')
      expect(wrapper.vm.editedQuestions[0].section).toBe('World Capitals')
    })

    test('should toggle diagram flag', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const diagramToggle = firstEditor.find('[data-testid="diagram-toggle"]')
      
      await diagramToggle.trigger('click')
      
      expect(wrapper.vm.editedQuestions[0].hasDiagram).toBe(true)
    })
  })

  describe('Validation', () => {
    test('should validate questions in real-time', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const textInput = firstEditor.find('[data-testid="question-text-input"]')
      
      // Clear the question text to trigger validation error
      await textInput.setValue('')
      await nextTick()
      
      expect(mockValidator.validate).toHaveBeenCalled()
    })

    test('should show validation errors', async () => {
      mockValidator.validate.mockReturnValue({
        isValid: false,
        errors: ['Question text is required'],
        warnings: []
      })
      
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const textInput = firstEditor.find('[data-testid="question-text-input"]')
      
      await textInput.setValue('')
      await nextTick()
      
      expect(firstEditor.find('[data-testid="validation-error"]').exists()).toBe(true)
      expect(firstEditor.find('[data-testid="validation-error"]').text()).toContain('Question text is required')
    })

    test('should show validation warnings', async () => {
      mockValidator.validate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['Question confidence is low']
      })
      
      await wrapper.vm.validateQuestion(0)
      await nextTick()
      
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      expect(firstEditor.find('[data-testid="validation-warning"]').exists()).toBe(true)
    })

    test('should validate MCQ has at least 2 options', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      
      // Remove options to trigger validation
      wrapper.vm.editedQuestions[0].options = ['Only one option']
      await wrapper.vm.validateQuestion(0)
      await nextTick()
      
      expect(mockValidator.validate).toHaveBeenCalledWith(
        expect.objectContaining({
          options: ['Only one option']
        })
      )
    })

    test('should validate MSQ has at least 3 options', async () => {
      const thirdEditor = wrapper.findAll('[data-testid="question-editor"]')[2]
      
      // Set only 2 options for MSQ
      wrapper.vm.editedQuestions[2].options = ['Option 1', 'Option 2']
      await wrapper.vm.validateQuestion(2)
      await nextTick()
      
      expect(mockValidator.validate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MSQ',
          options: ['Option 1', 'Option 2']
        })
      )
    })
  })

  describe('Filtering and Sorting', () => {
    test('should filter by confidence level', async () => {
      const confidenceFilter = wrapper.find('[data-testid="confidence-filter"]')
      
      // Filter to show only high confidence questions (>= 4.0)
      await confidenceFilter.setValue('4.0')
      await nextTick()
      
      const visibleQuestions = wrapper.findAll('[data-testid="question-editor"]:not(.hidden)')
      expect(visibleQuestions).toHaveLength(1) // Only the first question (4.8)
    })

    test('should filter by diagram presence', async () => {
      const diagramFilter = wrapper.find('[data-testid="diagram-filter"]')
      
      await diagramFilter.setValue('with-diagram')
      await nextTick()
      
      const visibleQuestions = wrapper.findAll('[data-testid="question-editor"]:not(.hidden)')
      expect(visibleQuestions).toHaveLength(1) // Only the second question
    })

    test('should filter by question type', async () => {
      const typeFilter = wrapper.find('[data-testid="type-filter"]')
      
      await typeFilter.setValue('MCQ')
      await nextTick()
      
      const visibleQuestions = wrapper.findAll('[data-testid="question-editor"]:not(.hidden)')
      expect(visibleQuestions).toHaveLength(1) // Only MCQ questions
    })

    test('should sort by confidence score', async () => {
      const sortSelect = wrapper.find('[data-testid="sort-select"]')
      
      await sortSelect.setValue('confidence-asc')
      await nextTick()
      
      // Questions should be sorted by confidence (ascending)
      const questionEditors = wrapper.findAll('[data-testid="question-editor"]')
      const confidenceScores = questionEditors.map(editor => 
        parseFloat(editor.find('[data-testid="confidence-score"]').text())
      )
      
      expect(confidenceScores).toEqual([2.1, 3.5, 4.8])
    })

    test('should sort by question number', async () => {
      const sortSelect = wrapper.find('[data-testid="sort-select"]')
      
      await sortSelect.setValue('question-number')
      await nextTick()
      
      // Should maintain original order (1, 2, 3)
      const questionNumbers = wrapper.findAll('[data-testid="question-number"]')
        .map(el => parseInt(el.text()))
      
      expect(questionNumbers).toEqual([1, 2, 3])
    })
  })

  describe('Bulk Operations', () => {
    test('should select all questions', async () => {
      const selectAllCheckbox = wrapper.find('[data-testid="select-all"]')
      
      await selectAllCheckbox.setChecked(true)
      
      expect(wrapper.vm.selectedQuestions).toHaveLength(3)
      expect(wrapper.vm.selectedQuestions).toEqual([0, 1, 2])
    })

    test('should bulk edit selected questions', async () => {
      // Select first two questions
      wrapper.vm.selectedQuestions = [0, 1]
      
      const bulkEditButton = wrapper.find('[data-testid="bulk-edit-button"]')
      await bulkEditButton.trigger('click')
      
      expect(wrapper.find('[data-testid="bulk-edit-dialog"]').exists()).toBe(true)
    })

    test('should bulk update subject', async () => {
      wrapper.vm.selectedQuestions = [0, 1]
      
      await wrapper.vm.bulkUpdateField('subject', 'Physics')
      
      expect(wrapper.vm.editedQuestions[0].subject).toBe('Physics')
      expect(wrapper.vm.editedQuestions[1].subject).toBe('Physics')
      expect(wrapper.vm.editedQuestions[2].subject).toBe('Mathematics') // Unchanged
    })

    test('should bulk update diagram flag', async () => {
      wrapper.vm.selectedQuestions = [0, 2]
      
      await wrapper.vm.bulkUpdateField('hasDiagram', true)
      
      expect(wrapper.vm.editedQuestions[0].hasDiagram).toBe(true)
      expect(wrapper.vm.editedQuestions[1].hasDiagram).toBe(true) // Unchanged
      expect(wrapper.vm.editedQuestions[2].hasDiagram).toBe(true)
    })

    test('should delete selected questions', async () => {
      wrapper.vm.selectedQuestions = [1] // Delete second question
      
      const deleteButton = wrapper.find('[data-testid="delete-selected"]')
      await deleteButton.trigger('click')
      
      // Confirm deletion
      const confirmButton = wrapper.find('[data-testid="confirm-delete"]')
      await confirmButton.trigger('click')
      
      expect(wrapper.vm.editedQuestions).toHaveLength(2)
      expect(wrapper.vm.editedQuestions.find(q => q.id === 2)).toBeUndefined()
    })
  })

  describe('Save and Export', () => {
    test('should save changes', async () => {
      // Make some changes
      wrapper.vm.editedQuestions[0].text = 'Modified question'
      
      const saveButton = wrapper.find('[data-testid="save-button"]')
      await saveButton.trigger('click')
      
      expect(mockStorage.save).toHaveBeenCalledWith(
        'reviewed-questions',
        expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({
              text: 'Modified question'
            })
          ])
        })
      )
    })

    test('should emit save event', async () => {
      const saveButton = wrapper.find('[data-testid="save-button"]')
      await saveButton.trigger('click')
      
      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save')[0][0]).toEqual(wrapper.vm.editedQuestions)
    })

    test('should export as JSON', async () => {
      const exportButton = wrapper.find('[data-testid="export-json"]')
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()
      
      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      
      await exportButton.trigger('click')
      
      expect(mockLink.download).toContain('.json')
      expect(mockLink.click).toHaveBeenCalled()
    })

    test('should export as CSV', async () => {
      const exportButton = wrapper.find('[data-testid="export-csv"]')
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      
      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      
      await exportButton.trigger('click')
      
      expect(mockLink.download).toContain('.csv')
      expect(mockLink.click).toHaveBeenCalled()
    })
  })

  describe('Undo/Redo', () => {
    test('should track changes for undo', async () => {
      const originalText = wrapper.vm.editedQuestions[0].text
      
      // Make a change
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const textInput = firstEditor.find('[data-testid="question-text-input"]')
      await textInput.setValue('Modified text')
      
      expect(wrapper.vm.undoStack).toHaveLength(1)
      expect(wrapper.vm.canUndo).toBe(true)
    })

    test('should undo changes', async () => {
      const originalText = wrapper.vm.editedQuestions[0].text
      
      // Make a change
      wrapper.vm.editedQuestions[0].text = 'Modified text'
      wrapper.vm.pushToUndoStack()
      
      // Undo the change
      const undoButton = wrapper.find('[data-testid="undo-button"]')
      await undoButton.trigger('click')
      
      expect(wrapper.vm.editedQuestions[0].text).toBe(originalText)
    })

    test('should redo changes', async () => {
      const originalText = wrapper.vm.editedQuestions[0].text
      const modifiedText = 'Modified text'
      
      // Make a change and undo it
      wrapper.vm.editedQuestions[0].text = modifiedText
      wrapper.vm.pushToUndoStack()
      await wrapper.vm.undo()
      
      // Redo the change
      const redoButton = wrapper.find('[data-testid="redo-button"]')
      await redoButton.trigger('click')
      
      expect(wrapper.vm.editedQuestions[0].text).toBe(modifiedText)
    })

    test('should limit undo stack size', async () => {
      // Make many changes
      for (let i = 0; i < 25; i++) {
        wrapper.vm.editedQuestions[0].text = `Change ${i}`
        wrapper.vm.pushToUndoStack()
      }
      
      // Should not exceed maximum stack size (20)
      expect(wrapper.vm.undoStack.length).toBeLessThanOrEqual(20)
    })
  })

  describe('Keyboard Shortcuts', () => {
    test('should save with Ctrl+S', async () => {
      await wrapper.trigger('keydown', { key: 's', ctrlKey: true })
      
      expect(mockStorage.save).toHaveBeenCalled()
    })

    test('should undo with Ctrl+Z', async () => {
      // Make a change first
      wrapper.vm.editedQuestions[0].text = 'Modified'
      wrapper.vm.pushToUndoStack()
      
      await wrapper.trigger('keydown', { key: 'z', ctrlKey: true })
      
      expect(wrapper.vm.editedQuestions[0].text).not.toBe('Modified')
    })

    test('should redo with Ctrl+Y', async () => {
      const modifiedText = 'Modified'
      
      // Make a change, undo it
      wrapper.vm.editedQuestions[0].text = modifiedText
      wrapper.vm.pushToUndoStack()
      await wrapper.vm.undo()
      
      // Redo with keyboard shortcut
      await wrapper.trigger('keydown', { key: 'y', ctrlKey: true })
      
      expect(wrapper.vm.editedQuestions[0].text).toBe(modifiedText)
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      const questionEditors = wrapper.findAll('[data-testid="question-editor"]')
      
      questionEditors.forEach((editor, index) => {
        expect(editor.attributes('aria-label')).toContain(`Question ${index + 1}`)
      })
    })

    test('should support screen reader announcements', async () => {
      const saveButton = wrapper.find('[data-testid="save-button"]')
      await saveButton.trigger('click')
      
      expect(wrapper.find('[aria-live="polite"]').text()).toContain('saved')
    })

    test('should have keyboard navigation', async () => {
      const firstEditor = wrapper.findAll('[data-testid="question-editor"]')[0]
      const textInput = firstEditor.find('[data-testid="question-text-input"]')
      
      await textInput.trigger('keydown.tab')
      
      // Should move focus to next input
      const nextInput = firstEditor.find('[data-testid="option-input"]')
      expect(document.activeElement).toBe(nextInput.element)
    })
  })
})