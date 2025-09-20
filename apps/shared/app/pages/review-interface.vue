<template>
  <div>
    <Head>
      <Title>Review AI Extracted Questions - Rankify</Title>
      <Meta name="description" content="Review and edit AI-extracted questions with confidence scoring and validation" />
    </Head>
    
    <DocsReviewInterface
      :questions="questions"
      :file-name="fileName"
      @questions-updated="handleQuestionsUpdated"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { AIExtractedQuestion } from '#layers/shared/app/utils/geminiAPIClient'

// Page for reviewing AI-extracted questions
definePageMeta({
  title: 'Review Interface',
  description: 'Review and edit AI-extracted questions',
  middleware: 'ai-features'
})

// State
const questions = ref<AIExtractedQuestion[]>([])
const fileName = ref<string>('')

// Mock data for development/testing
const mockQuestions: AIExtractedQuestion[] = [
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
    text: 'Calculate the area of a circle with radius 5cm. Use π = 3.14159.',
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
    text: 'Which of the following are prime numbers?',
    type: 'MSQ',
    options: ['2', '3', '4', '5', '6', '7'],
    correctAnswer: null,
    subject: 'Mathematics',
    section: 'Number Theory',
    pageNumber: 2,
    questionNumber: 3,
    confidence: 2.1,
    hasDiagram: false,
    extractionMetadata: {
      processingTime: 180,
      geminiModel: 'gemini-1.5-flash',
      apiVersion: 'v1beta'
    }
  },
  {
    id: 4,
    text: 'Match the following chemical elements with their symbols:',
    type: 'MSM',
    options: ['Hydrogen', 'Helium', 'Lithium', 'H', 'He', 'Li'],
    correctAnswer: null,
    subject: 'Chemistry',
    section: 'Periodic Table',
    pageNumber: 2,
    questionNumber: 4,
    confidence: 3.2,
    hasDiagram: false,
    extractionMetadata: {
      processingTime: 220,
      geminiModel: 'gemini-1.5-flash',
      apiVersion: 'v1beta'
    }
  },
  {
    id: 5,
    text: 'Analyze the diagram below and identify the type of chemical bond shown.',
    type: 'Diagram',
    options: ['Ionic bond', 'Covalent bond', 'Metallic bond', 'Hydrogen bond'],
    correctAnswer: null,
    subject: 'Chemistry',
    section: 'Chemical Bonding',
    pageNumber: 3,
    questionNumber: 5,
    confidence: 1.8,
    hasDiagram: true,
    extractionMetadata: {
      processingTime: 300,
      geminiModel: 'gemini-1.5-flash',
      apiVersion: 'v1beta'
    }
  }
]

// Methods
const handleQuestionsUpdated = (updatedQuestions: AIExtractedQuestion[]) => {
  questions.value = updatedQuestions
  console.log('Questions updated:', updatedQuestions)
}

const handleSave = (savedQuestions: AIExtractedQuestion[]) => {
  questions.value = savedQuestions
  console.log('Questions saved:', savedQuestions)
  
  // Here you would typically save to backend or storage
  // For now, we'll just show a success message
  const { $toast } = useNuxtApp()
  $toast.success('Questions saved successfully!', {
    description: `Saved ${savedQuestions.length} questions`
  })
}

// Load questions on mount
onMounted(() => {
  // In a real app, you would load questions from route params, storage, or API
  // For demo purposes, we'll use mock data
  questions.value = mockQuestions
  fileName.value = 'sample-questions.pdf'
  
  // Check if questions were passed via route state
  const route = useRoute()
  if (route.query.questions) {
    try {
      const parsedQuestions = JSON.parse(route.query.questions as string)
      questions.value = parsedQuestions
    } catch (error) {
      console.error('Failed to parse questions from route:', error)
    }
  }
  
  if (route.query.fileName) {
    fileName.value = route.query.fileName as string
  }
})
</script>