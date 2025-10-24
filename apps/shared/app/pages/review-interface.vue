<template>
  <div>
    <Head>
      <Title>Review AI Extracted Questions - Rankify</Title>
      <Meta name="description" content="Review and edit AI-extracted questions with confidence scoring and validation" />
    </Head>
    
    <ClientOnly>
      <DocsReviewInterface
        :questions="questions"
        :file-name="fileName"
        @questions-updated="handleQuestionsUpdated"
        @save="handleSave"
      />
      <template #fallback>
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-slate-600 dark:text-slate-400">Loading review interface...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
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
  // Only run on client side
  if (typeof window === 'undefined') {
    console.warn('⚠️ Running on server, skipping data load')
    return
  }
  
  console.log('🔍 Review Interface: Loading questions...')
  console.log('🌐 Current URL:', window.location.href)
  
  // Priority 0: Check navigation state (most reliable)
  const router = useRouter()
  const currentRoute = router.currentRoute.value
  if (currentRoute.state && currentRoute.state.reviewData) {
    const reviewData = currentRoute.state.reviewData as any
    console.log('✅ Loaded from navigation state:', {
      questionsCount: reviewData.questions?.length || 0,
      fileName: reviewData.fileName
    })
    
    if (reviewData.questions && Array.isArray(reviewData.questions)) {
      questions.value = reviewData.questions
      fileName.value = reviewData.fileName || 'AI Extracted Questions.pdf'
      console.log(`📊 Loaded ${questions.value.length} questions from navigation state`)
      return
    }
  }
  
  // Priority 1: Load from localStorage (AI extraction data)
  try {
    const storedData = localStorage.getItem('rankify-review-data')
    console.log('📦 localStorage data:', storedData ? 'Found' : 'Not found')
    
    if (storedData) {
      const reviewData = JSON.parse(storedData)
      console.log('✅ Loaded AI extracted questions from localStorage:', {
        questionsCount: reviewData.questions?.length || 0,
        fileName: reviewData.fileName,
        metadata: reviewData.extractionMetadata
      })
      
      if (reviewData.questions && Array.isArray(reviewData.questions)) {
        questions.value = reviewData.questions
        fileName.value = reviewData.fileName || 'AI Extracted Questions.pdf'
        
        console.log(`📊 Loaded ${questions.value.length} questions from AI extraction`)
        console.log('📝 First question preview:', questions.value[0])
        return // Exit early, we found real data
      } else {
        console.warn('⚠️ localStorage data exists but questions array is invalid')
      }
    } else {
      console.warn('⚠️ No data found in localStorage key: rankify-review-data')
      console.log('🔍 All localStorage keys:', Object.keys(localStorage))
    }
  } catch (error) {
    console.error('❌ Failed to load from localStorage:', error)
  }
  
  // Priority 2: Check route query params
  const route = useRoute()
  if (route.query.questions) {
    try {
      const parsedQuestions = JSON.parse(route.query.questions as string)
      questions.value = parsedQuestions
      console.log('✅ Loaded questions from route query')
      
      if (route.query.fileName) {
        fileName.value = route.query.fileName as string
      }
      return // Exit early
    } catch (error) {
      console.error('❌ Failed to parse questions from route:', error)
    }
  }
  
  // Priority 3: Fallback to mock data (only for testing)
  console.warn('⚠️ No AI extracted data found, using mock data for demo')
  console.warn('⚠️ This means either:')
  console.warn('   1. You navigated directly to /review-interface')
  console.warn('   2. localStorage is disabled/blocked')
  console.warn('   3. Data was not saved properly from AI extractor')
  questions.value = mockQuestions
  fileName.value = 'sample-questions.pdf (DEMO DATA)'
})
</script>