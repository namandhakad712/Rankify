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
  description: 'Review and edit AI-extracted questions'
  // middleware: 'ai-features' // Temporarily disabled
})

// State
const questions = ref<AIExtractedQuestion[]>([])
const fileName = ref<string>('')

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
  // Check if questions were passed via route state
  const route = useRoute()
  if (route.query.questions) {
    try {
      const parsedQuestions = JSON.parse(route.query.questions as string)
      questions.value = parsedQuestions
      fileName.value = route.query.fileName as string || 'questions.pdf'
    } catch (error) {
      console.error('Failed to parse questions from route:', error)
      // Redirect to AI extractor if no questions provided
      navigateTo('/ai-extractor')
    }
  } else {
    // Check if questions are in session storage (from AI extractor)
    const storedQuestions = sessionStorage.getItem('aiExtractedQuestions')
    const storedFileName = sessionStorage.getItem('aiExtractedFileName')
    
    if (storedQuestions) {
      try {
        questions.value = JSON.parse(storedQuestions)
        fileName.value = storedFileName || 'questions.pdf'
      } catch (error) {
        console.error('Failed to parse questions from storage:', error)
        // Redirect to AI extractor if no questions provided
        navigateTo('/ai-extractor')
      }
    } else {
      // Redirect to AI extractor if no questions provided
      navigateTo('/ai-extractor')
    }
  }
})
</script>