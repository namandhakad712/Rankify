/**
 * Composable for Review Interface functionality
 * Manages state and operations for reviewing and editing AI-extracted questions
 */

import { ref, computed, reactive, watch, readonly } from 'vue'
import { createQuestionValidator, confidenceUtils } from '#layers/shared/app/utils/confidenceScoringUtils'
import type { AIExtractedQuestion } from '#layers/shared/app/utils/geminiAPIClient'
import type { ValidationResult, ValidationError, ValidationWarning } from '#layers/shared/app/utils/confidenceScoringUtils'

export interface ReviewState {
  selectedQuestionId: number | null
  hasChanges: boolean
  changedQuestions: Set<number>
  validationResults: Map<number, ValidationResult>
  filters: {
    confidence: 'all' | 'low' | 'medium' | 'high' | 'needs-review'
    type: 'all' | 'MCQ' | 'MSQ' | 'NAT' | 'MSM' | 'Diagram'
    showDiagramsOnly: boolean
  }
  ui: {
    showValidationPanel: boolean
    showSaveDialog: boolean
    autoValidate: boolean
  }
}

export interface ReviewStats {
  totalQuestions: number
  questionsNeedingReview: number
  questionsWithDiagrams: number
  questionsWithErrors: number
  questionsWithWarnings: number
  overallConfidence: number
  confidenceDistribution: {
    excellent: number
    good: number
    fair: number
    poor: number
    veryPoor: number
  }
}

export function useReviewInterface(initialQuestions: AIExtractedQuestion[] = []) {
  // Reactive state
  const state = reactive<ReviewState>({
    selectedQuestionId: null,
    hasChanges: false,
    changedQuestions: new Set(),
    validationResults: new Map(),
    filters: {
      confidence: 'all',
      type: 'all',
      showDiagramsOnly: false
    },
    ui: {
      showValidationPanel: false,
      showSaveDialog: false,
      autoValidate: true
    }
  })

  // Questions data
  const questions = ref<AIExtractedQuestion[]>([...initialQuestions])
  const originalQuestions = ref<AIExtractedQuestion[]>([...initialQuestions])

  // Validator instance
  const validator = createQuestionValidator()

  // Computed properties
  const selectedQuestion = computed(() => {
    return questions.value.find(q => q.id === state.selectedQuestionId) || null
  })

  const filteredQuestions = computed(() => {
    let filtered = [...questions.value]

    // Confidence filter
    if (state.filters.confidence !== 'all') {
      switch (state.filters.confidence) {
        case 'low':
          filtered = filtered.filter(q => q.confidence <= 2.5)
          break
        case 'medium':
          filtered = filtered.filter(q => q.confidence > 2.5 && q.confidence < 4)
          break
        case 'high':
          filtered = filtered.filter(q => q.confidence >= 4)
          break
        case 'needs-review':
          filtered = filtered.filter(q => confidenceUtils.requiresManualReview(q))
          break
      }
    }

    // Type filter
    if (state.filters.type !== 'all') {
      filtered = filtered.filter(q => q.type === state.filters.type)
    }

    // Diagram filter
    if (state.filters.showDiagramsOnly) {
      filtered = filtered.filter(q => q.hasDiagram)
    }

    return filtered
  })

  const reviewStats = computed((): ReviewStats => {
    const total = questions.value.length
    const needsReview = questions.value.filter(q => confidenceUtils.requiresManualReview(q)).length
    const withDiagrams = questions.value.filter(q => q.hasDiagram).length
    const withErrors = Array.from(state.validationResults.values()).filter(v => !v.isValid).length
    const withWarnings = Array.from(state.validationResults.values()).filter(v => v.warnings.length > 0).length

    const totalConfidence = questions.value.reduce((sum, q) => sum + q.confidence, 0)
    const overallConfidence = total > 0 ? Math.round((totalConfidence / total) * 10) / 10 : 0

    // Confidence distribution
    const distribution = {
      excellent: questions.value.filter(q => q.confidence >= 4.5).length,
      good: questions.value.filter(q => q.confidence >= 3.5 && q.confidence < 4.5).length,
      fair: questions.value.filter(q => q.confidence >= 2.5 && q.confidence < 3.5).length,
      poor: questions.value.filter(q => q.confidence >= 1.5 && q.confidence < 2.5).length,
      veryPoor: questions.value.filter(q => q.confidence < 1.5).length
    }

    return {
      totalQuestions: total,
      questionsNeedingReview: needsReview,
      questionsWithDiagrams: withDiagrams,
      questionsWithErrors: withErrors,
      questionsWithWarnings: withWarnings,
      overallConfidence,
      confidenceDistribution: distribution
    }
  })

  const hasUnsavedChanges = computed(() => {
    return state.hasChanges && state.changedQuestions.size > 0
  })

  const currentValidation = computed(() => {
    if (state.selectedQuestionId) {
      return state.validationResults.get(state.selectedQuestionId) || null
    }
    return null
  })

  // Methods
  const selectQuestion = (questionId: number) => {
    state.selectedQuestionId = questionId
    if (state.ui.autoValidate) {
      validateQuestion(questionId)
    }
  }

  const selectNextQuestion = () => {
    const currentIndex = questions.value.findIndex(q => q.id === state.selectedQuestionId)
    if (currentIndex < questions.value.length - 1) {
      selectQuestion(questions.value[currentIndex + 1].id)
    }
  }

  const selectPreviousQuestion = () => {
    const currentIndex = questions.value.findIndex(q => q.id === state.selectedQuestionId)
    if (currentIndex > 0) {
      selectQuestion(questions.value[currentIndex - 1].id)
    }
  }

  const markAsChanged = (questionId?: number) => {
    const id = questionId || state.selectedQuestionId
    if (id) {
      state.changedQuestions.add(id)
      state.hasChanges = true
      
      if (state.ui.autoValidate) {
        validateQuestion(id)
      }
    }
  }

  const validateQuestion = (questionId: number) => {
    const question = questions.value.find(q => q.id === questionId)
    if (question) {
      const result = validator.validateQuestion(question)
      state.validationResults.set(questionId, result)
      return result
    }
    return null
  }

  const validateAllQuestions = () => {
    questions.value.forEach(question => {
      validateQuestion(question.id)
    })
  }

  const updateQuestion = (questionId: number, updates: Partial<AIExtractedQuestion>) => {
    const questionIndex = questions.value.findIndex(q => q.id === questionId)
    if (questionIndex !== -1) {
      questions.value[questionIndex] = { ...questions.value[questionIndex], ...updates }
      markAsChanged(questionId)
    }
  }

  const updateSelectedQuestion = (updates: Partial<AIExtractedQuestion>) => {
    if (state.selectedQuestionId) {
      updateQuestion(state.selectedQuestionId, updates)
    }
  }

  const addOption = (questionId?: number) => {
    const id = questionId || state.selectedQuestionId
    const question = questions.value.find(q => q.id === id)
    if (question && shouldShowOptions(question.type)) {
      question.options.push('')
      markAsChanged(id)
    }
  }

  const removeOption = (optionIndex: number, questionId?: number) => {
    const id = questionId || state.selectedQuestionId
    const question = questions.value.find(q => q.id === id)
    if (question && question.options.length > 2) {
      question.options.splice(optionIndex, 1)
      markAsChanged(id)
    }
  }

  const updateOption = (optionIndex: number, value: string, questionId?: number) => {
    const id = questionId || state.selectedQuestionId
    const question = questions.value.find(q => q.id === id)
    if (question && question.options[optionIndex] !== undefined) {
      question.options[optionIndex] = value
      markAsChanged(id)
    }
  }

  const duplicateQuestion = (questionId: number) => {
    const question = questions.value.find(q => q.id === questionId)
    if (question) {
      const newId = Math.max(...questions.value.map(q => q.id)) + 1
      const duplicated: AIExtractedQuestion = {
        ...JSON.parse(JSON.stringify(question)),
        id: newId,
        questionNumber: question.questionNumber + 0.1 // Slight increment
      }
      questions.value.push(duplicated)
      markAsChanged(newId)
      return newId
    }
    return null
  }

  const deleteQuestion = (questionId: number) => {
    const index = questions.value.findIndex(q => q.id === questionId)
    if (index !== -1) {
      questions.value.splice(index, 1)
      state.changedQuestions.delete(questionId)
      state.validationResults.delete(questionId)
      
      // Select next question if current was deleted
      if (state.selectedQuestionId === questionId) {
        if (questions.value.length > 0) {
          const newIndex = Math.min(index, questions.value.length - 1)
          selectQuestion(questions.value[newIndex].id)
        } else {
          state.selectedQuestionId = null
        }
      }
      
      state.hasChanges = true
    }
  }

  const reorderQuestions = (fromIndex: number, toIndex: number) => {
    const question = questions.value.splice(fromIndex, 1)[0]
    questions.value.splice(toIndex, 0, question)
    state.hasChanges = true
  }

  const resetQuestion = (questionId: number) => {
    const originalQuestion = originalQuestions.value.find(q => q.id === questionId)
    if (originalQuestion) {
      const index = questions.value.findIndex(q => q.id === questionId)
      if (index !== -1) {
        questions.value[index] = JSON.parse(JSON.stringify(originalQuestion))
        state.changedQuestions.delete(questionId)
        state.validationResults.delete(questionId)
        
        if (state.ui.autoValidate) {
          validateQuestion(questionId)
        }
      }
    }
  }

  const resetAllChanges = () => {
    questions.value = JSON.parse(JSON.stringify(originalQuestions.value))
    state.changedQuestions.clear()
    state.validationResults.clear()
    state.hasChanges = false
    
    if (state.ui.autoValidate) {
      validateAllQuestions()
    }
  }

  const saveChanges = () => {
    originalQuestions.value = JSON.parse(JSON.stringify(questions.value))
    state.changedQuestions.clear()
    state.hasChanges = false
    return [...questions.value]
  }

  const exportChanges = () => {
    const changedQuestionsList = Array.from(state.changedQuestions)
      .map(id => questions.value.find(q => q.id === id))
      .filter(Boolean) as AIExtractedQuestion[]

    return {
      allQuestions: [...questions.value],
      changedQuestions: changedQuestionsList,
      validationResults: Object.fromEntries(state.validationResults),
      stats: reviewStats.value
    }
  }

  const importQuestions = (newQuestions: AIExtractedQuestion[]) => {
    questions.value = [...newQuestions]
    originalQuestions.value = JSON.parse(JSON.stringify(newQuestions))
    state.changedQuestions.clear()
    state.validationResults.clear()
    state.hasChanges = false
    
    if (newQuestions.length > 0 && !state.selectedQuestionId) {
      selectQuestion(newQuestions[0].id)
    }
    
    if (state.ui.autoValidate) {
      validateAllQuestions()
    }
  }

  // Filter methods
  const setConfidenceFilter = (filter: ReviewState['filters']['confidence']) => {
    state.filters.confidence = filter
  }

  const setTypeFilter = (filter: ReviewState['filters']['type']) => {
    state.filters.type = filter
  }

  const toggleDiagramFilter = () => {
    state.filters.showDiagramsOnly = !state.filters.showDiagramsOnly
  }

  const clearFilters = () => {
    state.filters.confidence = 'all'
    state.filters.type = 'all'
    state.filters.showDiagramsOnly = false
  }

  // Utility methods
  const shouldShowOptions = (type: string): boolean => {
    return ['MCQ', 'MSQ', 'MSM'].includes(type)
  }

  const getOptionRequirements = (type: string): string => {
    switch (type) {
      case 'MCQ':
        return 'MCQ questions typically have 4-5 options'
      case 'MSQ':
        return 'MSQ questions need at least 3 options'
      case 'MSM':
        return 'MSM questions need at least 4 options for matching'
      default:
        return ''
    }
  }

  const getQuestionTypeVariant = (type: string) => {
    const variants = {
      'MCQ': 'default',
      'MSQ': 'secondary',
      'NAT': 'outline',
      'MSM': 'destructive',
      'Diagram': 'warning'
    }
    return variants[type] || 'default'
  }

  const getConfidenceColor = (score: number): string => {
    return confidenceUtils.getConfidenceColor(score)
  }

  const getConfidenceDescription = (score: number): string => {
    return confidenceUtils.getConfidenceDescription(score)
  }

  const requiresManualReview = (question: AIExtractedQuestion): boolean => {
    return confidenceUtils.requiresManualReview(question)
  }

  // Auto-validation watcher
  watch(
    () => state.ui.autoValidate,
    (enabled) => {
      if (enabled) {
        validateAllQuestions()
      }
    }
  )

  // Initialize validation if auto-validate is enabled
  if (state.ui.autoValidate && questions.value.length > 0) {
    validateAllQuestions()
  }

  // Select first question if none selected
  if (questions.value.length > 0 && !state.selectedQuestionId) {
    selectQuestion(questions.value[0].id)
  }

  return {
    // State
    state: readonly(state),
    questions: readonly(questions),
    
    // Computed
    selectedQuestion,
    filteredQuestions,
    reviewStats,
    hasUnsavedChanges,
    currentValidation,
    
    // Question management
    selectQuestion,
    selectNextQuestion,
    selectPreviousQuestion,
    updateQuestion,
    updateSelectedQuestion,
    duplicateQuestion,
    deleteQuestion,
    reorderQuestions,
    resetQuestion,
    resetAllChanges,
    
    // Options management
    addOption,
    removeOption,
    updateOption,
    
    // Validation
    validateQuestion,
    validateAllQuestions,
    markAsChanged,
    
    // Data management
    saveChanges,
    exportChanges,
    importQuestions,
    
    // Filters
    setConfidenceFilter,
    setTypeFilter,
    toggleDiagramFilter,
    clearFilters,
    
    // Utilities
    shouldShowOptions,
    getOptionRequirements,
    getQuestionTypeVariant,
    getConfidenceColor,
    getConfidenceDescription,
    requiresManualReview
  }
}