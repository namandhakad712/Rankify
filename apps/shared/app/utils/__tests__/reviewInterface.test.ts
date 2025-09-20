/**
 * Tests for Review Interface functionality
 * Tests the review interface composable and validation logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReviewInterface } from '#layers/shared/app/composables/useReviewInterface'
import type { AIExtractedQuestion } from '#layers/shared/app/utils/geminiAPIClient'

describe('Review Interface', () => {
  let mockQuestions: AIExtractedQuestion[]

  beforeEach(() => {
    mockQuestions = [
      {
        id: 1,
        text: 'What is the capital of France?',
        type: 'MCQ',
        options: ['Paris', 'London', 'Berlin', 'Madrid'],
        correctAnswer: null,
        subject: 'Geography',
        section: 'Europe',
        pageNumber: 1,
        questionNumber: 1,
        confidence: 4.5,
        hasDiagram: false,
        extractionMetadata: {
          processingTime: 150,
          geminiModel: 'gemini-1.5-flash',
          apiVersion: 'v1beta'
        }
      },
      {
        id: 2,
        text: 'Calculate the area of a circle with radius 5cm.',
        type: 'NAT',
        options: [],
        correctAnswer: null,
        subject: 'Mathematics',
        section: 'Geometry',
        pageNumber: 1,
        questionNumber: 2,
        confidence: 3.8,
        hasDiagram: true,
        extractionMetadata: {
          processingTime: 200,
          geminiModel: 'gemini-1.5-flash',
          apiVersion: 'v1beta'
        }
      },
      {
        id: 3,
        text: '', // Invalid - empty text
        type: 'MCQ',
        options: ['A'], // Invalid - too few options
        correctAnswer: null,
        subject: 'Test',
        section: 'Invalid',
        pageNumber: 2,
        questionNumber: 3,
        confidence: 1.5, // Low confidence
        hasDiagram: false,
        extractionMetadata: {
          processingTime: 100,
          geminiModel: 'gemini-1.5-flash',
          apiVersion: 'v1beta'
        }
      }
    ]
  })

  describe('Initialization', () => {
    it('should initialize with provided questions', () => {
      const { questions, reviewStats } = useReviewInterface(mockQuestions)
      
      expect(questions.value).toHaveLength(3)
      expect(reviewStats.value.totalQuestions).toBe(3)
    })

    it('should select first question by default', () => {
      const { selectedQuestion } = useReviewInterface(mockQuestions)
      
      expect(selectedQuestion.value?.id).toBe(1)
    })

    it('should calculate correct review stats', () => {
      const { reviewStats } = useReviewInterface(mockQuestions)
      
      expect(reviewStats.value.totalQuestions).toBe(3)
      expect(reviewStats.value.questionsWithDiagrams).toBe(1)
      expect(reviewStats.value.questionsNeedingReview).toBeGreaterThan(0)
    })
  })

  describe('Question Selection', () => {
    it('should select question by ID', () => {
      const { selectQuestion, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(2)
      expect(selectedQuestion.value?.id).toBe(2)
    })

    it('should navigate to next question', () => {
      const { selectQuestion, selectNextQuestion, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(1)
      selectNextQuestion()
      expect(selectedQuestion.value?.id).toBe(2)
    })

    it('should navigate to previous question', () => {
      const { selectQuestion, selectPreviousQuestion, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(2)
      selectPreviousQuestion()
      expect(selectedQuestion.value?.id).toBe(1)
    })

    it('should not navigate beyond bounds', () => {
      const { selectQuestion, selectNextQuestion, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(3) // Last question
      selectNextQuestion()
      expect(selectedQuestion.value?.id).toBe(3) // Should stay at last
    })
  })

  describe('Question Editing', () => {
    it('should update question properties', () => {
      const { updateQuestion, questions } = useReviewInterface(mockQuestions)
      
      updateQuestion(1, { text: 'Updated question text' })
      
      const updatedQuestion = questions.value.find(q => q.id === 1)
      expect(updatedQuestion?.text).toBe('Updated question text')
    })

    it('should mark question as changed when updated', () => {
      const { updateQuestion, state } = useReviewInterface(mockQuestions)
      
      updateQuestion(1, { text: 'Updated text' })
      
      expect(state.hasChanges).toBe(true)
      expect(state.changedQuestions.has(1)).toBe(true)
    })

    it('should update selected question', () => {
      const { selectQuestion, updateSelectedQuestion, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(1)
      updateSelectedQuestion({ text: 'New text' })
      
      expect(selectedQuestion.value?.text).toBe('New text')
    })
  })

  describe('Options Management', () => {
    it('should add option to question', () => {
      const { selectQuestion, addOption, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(1)
      const initialOptionsCount = selectedQuestion.value?.options.length || 0
      
      addOption()
      
      expect(selectedQuestion.value?.options.length).toBe(initialOptionsCount + 1)
    })

    it('should remove option from question', () => {
      const { selectQuestion, removeOption, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(1)
      const initialOptionsCount = selectedQuestion.value?.options.length || 0
      
      removeOption(0)
      
      expect(selectedQuestion.value?.options.length).toBe(initialOptionsCount - 1)
    })

    it('should not remove option if minimum count reached', () => {
      const { selectQuestion, removeOption, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(3) // Question with only 1 option
      const initialOptionsCount = selectedQuestion.value?.options.length || 0
      
      removeOption(0)
      
      expect(selectedQuestion.value?.options.length).toBe(initialOptionsCount) // Should not change
    })

    it('should update specific option', () => {
      const { selectQuestion, updateOption, selectedQuestion } = useReviewInterface(mockQuestions)
      
      selectQuestion(1)
      updateOption(0, 'Updated option')
      
      expect(selectedQuestion.value?.options[0]).toBe('Updated option')
    })
  })

  describe('Question Management', () => {
    it('should duplicate question', () => {
      const { duplicateQuestion, questions } = useReviewInterface(mockQuestions)
      
      const initialCount = questions.value.length
      const newId = duplicateQuestion(1)
      
      expect(questions.value.length).toBe(initialCount + 1)
      expect(newId).toBeDefined()
      
      const duplicated = questions.value.find(q => q.id === newId)
      expect(duplicated?.text).toBe(mockQuestions[0].text)
    })

    it('should delete question', () => {
      const { deleteQuestion, questions } = useReviewInterface(mockQuestions)
      
      const initialCount = questions.value.length
      deleteQuestion(2)
      
      expect(questions.value.length).toBe(initialCount - 1)
      expect(questions.value.find(q => q.id === 2)).toBeUndefined()
    })

    it('should reset question to original state', () => {
      const { updateQuestion, resetQuestion, questions } = useReviewInterface(mockQuestions)
      
      // Modify question
      updateQuestion(1, { text: 'Modified text' })
      expect(questions.value.find(q => q.id === 1)?.text).toBe('Modified text')
      
      // Reset question
      resetQuestion(1)
      expect(questions.value.find(q => q.id === 1)?.text).toBe(mockQuestions[0].text)
    })

    it('should reset all changes', () => {
      const { updateQuestion, resetAllChanges, questions, state } = useReviewInterface(mockQuestions)
      
      // Make changes
      updateQuestion(1, { text: 'Modified 1' })
      updateQuestion(2, { text: 'Modified 2' })
      
      expect(state.hasChanges).toBe(true)
      
      // Reset all
      resetAllChanges()
      
      expect(state.hasChanges).toBe(false)
      expect(questions.value.find(q => q.id === 1)?.text).toBe(mockQuestions[0].text)
      expect(questions.value.find(q => q.id === 2)?.text).toBe(mockQuestions[1].text)
    })
  })

  describe('Filtering', () => {
    it('should filter by confidence level', () => {
      const { setConfidenceFilter, filteredQuestions } = useReviewInterface(mockQuestions)
      
      setConfidenceFilter('low')
      
      const lowConfidenceQuestions = filteredQuestions.value.filter(q => q.confidence <= 2.5)
      expect(filteredQuestions.value.length).toBe(lowConfidenceQuestions.length)
    })

    it('should filter by question type', () => {
      const { setTypeFilter, filteredQuestions } = useReviewInterface(mockQuestions)
      
      setTypeFilter('MCQ')
      
      const mcqQuestions = filteredQuestions.value.filter(q => q.type === 'MCQ')
      expect(filteredQuestions.value.length).toBe(mcqQuestions.length)
    })

    it('should filter by diagram presence', () => {
      const { toggleDiagramFilter, filteredQuestions } = useReviewInterface(mockQuestions)
      
      toggleDiagramFilter()
      
      const diagramQuestions = filteredQuestions.value.filter(q => q.hasDiagram)
      expect(filteredQuestions.value.length).toBe(diagramQuestions.length)
    })

    it('should clear all filters', () => {
      const { setConfidenceFilter, setTypeFilter, toggleDiagramFilter, clearFilters, filteredQuestions, state } = useReviewInterface(mockQuestions)
      
      // Apply filters
      setConfidenceFilter('low')
      setTypeFilter('MCQ')
      toggleDiagramFilter()
      
      // Clear filters
      clearFilters()
      
      expect(state.filters.confidence).toBe('all')
      expect(state.filters.type).toBe('all')
      expect(state.filters.showDiagramsOnly).toBe(false)
      expect(filteredQuestions.value.length).toBe(mockQuestions.length)
    })
  })

  describe('Validation', () => {
    it('should validate individual question', () => {
      const { validateQuestion } = useReviewInterface(mockQuestions)
      
      const result = validateQuestion(3) // Invalid question
      
      expect(result).toBeDefined()
      expect(result?.isValid).toBe(false)
      expect(result?.errors.length).toBeGreaterThan(0)
    })

    it('should validate all questions', () => {
      const { validateAllQuestions, state } = useReviewInterface(mockQuestions)
      
      validateAllQuestions()
      
      expect(state.validationResults.size).toBe(mockQuestions.length)
    })

    it('should store validation results', () => {
      const { validateQuestion, state } = useReviewInterface(mockQuestions)
      
      validateQuestion(1)
      
      expect(state.validationResults.has(1)).toBe(true)
    })
  })

  describe('Data Management', () => {
    it('should save changes and reset change tracking', () => {
      const { updateQuestion, saveChanges, state } = useReviewInterface(mockQuestions)
      
      updateQuestion(1, { text: 'Modified' })
      expect(state.hasChanges).toBe(true)
      
      const saved = saveChanges()
      
      expect(state.hasChanges).toBe(false)
      expect(state.changedQuestions.size).toBe(0)
      expect(saved).toHaveLength(mockQuestions.length)
    })

    it('should export changes with metadata', () => {
      const { updateQuestion, exportChanges } = useReviewInterface(mockQuestions)
      
      updateQuestion(1, { text: 'Modified' })
      updateQuestion(2, { confidence: 5 })
      
      const exported = exportChanges()
      
      expect(exported.allQuestions).toHaveLength(mockQuestions.length)
      expect(exported.changedQuestions).toHaveLength(2)
      expect(exported.stats).toBeDefined()
    })

    it('should import new questions', () => {
      const { importQuestions, questions, state } = useReviewInterface(mockQuestions)
      
      const newQuestions = [mockQuestions[0]] // Only first question
      
      importQuestions(newQuestions)
      
      expect(questions.value).toHaveLength(1)
      expect(state.hasChanges).toBe(false)
      expect(state.changedQuestions.size).toBe(0)
    })
  })

  describe('Utility Functions', () => {
    it('should determine if question type should show options', () => {
      const { shouldShowOptions } = useReviewInterface(mockQuestions)
      
      expect(shouldShowOptions('MCQ')).toBe(true)
      expect(shouldShowOptions('MSQ')).toBe(true)
      expect(shouldShowOptions('MSM')).toBe(true)
      expect(shouldShowOptions('NAT')).toBe(false)
    })

    it('should provide option requirements text', () => {
      const { getOptionRequirements } = useReviewInterface(mockQuestions)
      
      expect(getOptionRequirements('MCQ')).toContain('4-5 options')
      expect(getOptionRequirements('MSQ')).toContain('at least 3')
      expect(getOptionRequirements('MSM')).toContain('at least 4')
    })

    it('should get question type variants', () => {
      const { getQuestionTypeVariant } = useReviewInterface(mockQuestions)
      
      expect(getQuestionTypeVariant('MCQ')).toBe('default')
      expect(getQuestionTypeVariant('MSQ')).toBe('secondary')
      expect(getQuestionTypeVariant('NAT')).toBe('outline')
    })

    it('should get confidence colors and descriptions', () => {
      const { getConfidenceColor, getConfidenceDescription } = useReviewInterface(mockQuestions)
      
      expect(getConfidenceColor(5)).toBe('#22c55e') // Green for high confidence
      expect(getConfidenceDescription(5)).toBe('Excellent')
      expect(getConfidenceDescription(1)).toBe('Very Poor')
    })

    it('should identify questions requiring manual review', () => {
      const { requiresManualReview } = useReviewInterface(mockQuestions)
      
      expect(requiresManualReview(mockQuestions[0])).toBe(false) // High confidence, no diagram
      expect(requiresManualReview(mockQuestions[1])).toBe(true) // Has diagram
      expect(requiresManualReview(mockQuestions[2])).toBe(true) // Low confidence
    })
  })
})