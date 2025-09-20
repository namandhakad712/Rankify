/**
 * Routes Composable
 * Provides route management functionality with feature flag integration
 */

import { computed } from 'vue'
import { 
  routes, 
  getEnabledRoutes, 
  getNavigationMenu, 
  getBreadcrumb,
  getRouteRecommendations,
  isAIRoute,
  isHybridRoute,
  type RouteConfig 
} from '#layers/shared/app/config/routes'
import { getFeatureFlags } from '#layers/shared/app/composables/useFeatureFlags'

export function useRoutes() {
  const route = useRoute()
  const featureFlags = getFeatureFlags()
  
  // Computed properties
  const currentPath = computed(() => route.path)
  
  const enabledRoutes = computed(() => 
    getEnabledRoutes(featureFlags.isEnabled)
  )
  
  const navigationMenu = computed(() => 
    getNavigationMenu(featureFlags.isEnabled)
  )
  
  const breadcrumb = computed(() => 
    getBreadcrumb(currentPath.value)
  )
  
  const recommendations = computed(() => 
    getRouteRecommendations(currentPath.value, featureFlags.isEnabled)
  )
  
  const isCurrentRouteAI = computed(() => 
    isAIRoute(currentPath.value)
  )
  
  const isCurrentRouteHybrid = computed(() => 
    isHybridRoute(currentPath.value)
  )
  
  // Methods
  const navigateToRoute = (path: string) => {
    return navigateTo(path)
  }
  
  const navigateToAIExtractor = () => {
    if (featureFlags.isEnabled('ai_extraction')) {
      return navigateTo('/ai-extractor')
    } else {
      console.warn('AI extraction feature is not enabled')
      return navigateTo('/pdf-cropper')
    }
  }
  
  const navigateToReviewInterface = (questions?: any[], fileName?: string) => {
    if (featureFlags.isEnabled('review_interface')) {
      const query: Record<string, string> = {}
      
      if (questions) {
        query.questions = JSON.stringify(questions)
      }
      
      if (fileName) {
        query.fileName = fileName
      }
      
      return navigateTo({
        path: '/review-interface',
        query: Object.keys(query).length > 0 ? query : undefined
      })
    } else {
      console.warn('Review interface feature is not enabled')
      return navigateTo('/cbt/interface')
    }
  }
  
  const navigateToCBTInterface = (data?: any) => {
    const query: Record<string, string> = {}
    
    if (data) {
      query.data = JSON.stringify(data)
    }
    
    return navigateTo({
      path: '/cbt/interface',
      query: Object.keys(query).length > 0 ? query : undefined
    })
  }
  
  const getRouteTitle = (path: string): string => {
    const routeConfig = routes.find(r => r.path === path)
    return routeConfig?.title || 'Rankify'
  }
  
  const getRouteDescription = (path: string): string => {
    const routeConfig = routes.find(r => r.path === path)
    return routeConfig?.description || 'Turn PDF of Questions into CBT'
  }
  
  const isRouteEnabled = (path: string): boolean => {
    const routeConfig = routes.find(r => r.path === path)
    
    if (!routeConfig) {
      return false
    }
    
    // Check feature flag if required
    if (routeConfig.featureFlag) {
      return featureFlags.isEnabled(routeConfig.featureFlag)
    }
    
    // Check development-only routes
    if (routeConfig.meta?.developmentOnly && process.env.NODE_ENV === 'production') {
      return false
    }
    
    return true
  }
  
  const getWorkflowRoutes = () => {
    const workflow = {
      ai: {
        title: 'AI-Powered Workflow',
        description: 'Automated question extraction with AI',
        steps: [
          {
            step: 1,
            title: 'Extract Questions',
            description: 'Upload PDF and let AI extract questions automatically',
            route: '/ai-extractor',
            enabled: featureFlags.isEnabled('ai_extraction'),
            icon: 'lucide:upload'
          },
          {
            step: 2,
            title: 'Review & Edit',
            description: 'Review AI-extracted questions and make corrections',
            route: '/review-interface',
            enabled: featureFlags.isEnabled('review_interface'),
            icon: 'lucide:edit-3'
          },
          {
            step: 3,
            title: 'Take Test',
            description: 'Use the questions in CBT interface',
            route: '/cbt/interface',
            enabled: true,
            icon: 'lucide:play-circle'
          },
          {
            step: 4,
            title: 'View Results',
            description: 'Analyze your test performance',
            route: '/cbt/results',
            enabled: true,
            icon: 'lucide:bar-chart-3'
          }
        ]
      },
      traditional: {
        title: 'Traditional Workflow',
        description: 'Manual question cropping and setup',
        steps: [
          {
            step: 1,
            title: 'Crop Questions',
            description: 'Manually crop questions from PDF',
            route: '/pdf-cropper',
            enabled: true,
            icon: 'lucide:crop'
          },
          {
            step: 2,
            title: 'Generate Answer Key',
            description: 'Create answer key for evaluation',
            route: '/cbt/generate-answer-key',
            enabled: true,
            icon: 'lucide:key'
          },
          {
            step: 3,
            title: 'Take Test',
            description: 'Use the questions in CBT interface',
            route: '/cbt/interface',
            enabled: true,
            icon: 'lucide:play-circle'
          },
          {
            step: 4,
            title: 'View Results',
            description: 'Analyze your test performance',
            route: '/cbt/results',
            enabled: true,
            icon: 'lucide:bar-chart-3'
          }
        ]
      }
    }
    
    return workflow
  }
  
  const getNextStepInWorkflow = (currentPath: string) => {
    const workflows = getWorkflowRoutes()
    
    // Check AI workflow
    const aiStepIndex = workflows.ai.steps.findIndex(step => step.route === currentPath)
    if (aiStepIndex !== -1 && aiStepIndex < workflows.ai.steps.length - 1) {
      const nextStep = workflows.ai.steps[aiStepIndex + 1]
      if (nextStep.enabled) {
        return nextStep
      }
    }
    
    // Check traditional workflow
    const traditionalStepIndex = workflows.traditional.steps.findIndex(step => step.route === currentPath)
    if (traditionalStepIndex !== -1 && traditionalStepIndex < workflows.traditional.steps.length - 1) {
      const nextStep = workflows.traditional.steps[traditionalStepIndex + 1]
      if (nextStep.enabled) {
        return nextStep
      }
    }
    
    return null
  }
  
  return {
    // Computed
    currentPath,
    enabledRoutes,
    navigationMenu,
    breadcrumb,
    recommendations,
    isCurrentRouteAI,
    isCurrentRouteHybrid,
    
    // Methods
    navigateToRoute,
    navigateToAIExtractor,
    navigateToReviewInterface,
    navigateToCBTInterface,
    getRouteTitle,
    getRouteDescription,
    isRouteEnabled,
    getWorkflowRoutes,
    getNextStepInWorkflow,
    
    // Data
    routes: enabledRoutes
  }
}