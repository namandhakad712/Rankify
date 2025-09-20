/**
 * Route Configuration
 * Centralized route management for AI features and traditional workflows
 */

export interface RouteConfig {
  path: string
  name: string
  title: string
  description: string
  icon: string
  category: 'ai' | 'traditional' | 'cbt' | 'dev'
  featureFlag?: string
  middleware?: string[]
  meta?: Record<string, any>
}

export const routes: RouteConfig[] = [
  // AI-Powered Routes
  {
    path: '/ai-extractor',
    name: 'ai-extractor',
    title: 'AI PDF Extractor',
    description: 'Extract questions from PDF using AI-powered analysis with confidence scoring',
    icon: 'lucide:sparkles',
    category: 'ai',
    featureFlag: 'ai_extraction',
    middleware: ['ai-features'],
    meta: {
      aiPowered: true,
      requiresGeminiAPI: true
    }
  },
  {
    path: '/review-interface',
    name: 'review-interface',
    title: 'Review Interface',
    description: 'Review and edit AI-extracted questions with confidence scoring and validation',
    icon: 'lucide:edit-3',
    category: 'ai',
    featureFlag: 'review_interface',
    middleware: ['ai-features'],
    meta: {
      aiPowered: true,
      dependsOn: ['ai-extractor']
    }
  },
  
  // Traditional Routes
  {
    path: '/pdf-cropper',
    name: 'pdf-cropper',
    title: 'PDF Cropper',
    description: 'Manually crop questions from PDF files',
    icon: 'lucide:crop',
    category: 'traditional',
    meta: {
      traditional: true
    }
  },
  
  // CBT Routes
  {
    path: '/cbt/interface',
    name: 'cbt-interface',
    title: 'Test Interface',
    description: 'Take practice tests with AI-generated or manually cropped questions',
    icon: 'lucide:play-circle',
    category: 'cbt',
    meta: {
      supportsAI: true,
      supportsTraditional: true
    }
  },
  {
    path: '/cbt/results',
    name: 'cbt-results',
    title: 'Test Results',
    description: 'View detailed test performance analytics and results',
    icon: 'lucide:bar-chart-3',
    category: 'cbt'
  },
  {
    path: '/cbt/generate-answer-key',
    name: 'generate-answer-key',
    title: 'Generate Answer Key',
    description: 'Create answer keys for test evaluation',
    icon: 'lucide:key',
    category: 'cbt'
  },
  
  // Development Routes
  {
    path: '/dev/feature-flags',
    name: 'feature-flags',
    title: 'Feature Flags',
    description: 'Manage AI feature flags and rollout configuration',
    icon: 'lucide:flag',
    category: 'dev',
    meta: {
      developmentOnly: true
    }
  }
]

/**
 * Get routes by category
 */
export function getRoutesByCategory(category: RouteConfig['category']): RouteConfig[] {
  return routes.filter(route => route.category === category)
}

/**
 * Get AI-powered routes
 */
export function getAIRoutes(): RouteConfig[] {
  return getRoutesByCategory('ai')
}

/**
 * Get traditional routes
 */
export function getTraditionalRoutes(): RouteConfig[] {
  return getRoutesByCategory('traditional')
}

/**
 * Get CBT routes
 */
export function getCBTRoutes(): RouteConfig[] {
  return getRoutesByCategory('cbt')
}

/**
 * Get development routes
 */
export function getDevRoutes(): RouteConfig[] {
  return getRoutesByCategory('dev')
}

/**
 * Get route by path
 */
export function getRouteByPath(path: string): RouteConfig | undefined {
  return routes.find(route => route.path === path)
}

/**
 * Get enabled routes based on feature flags
 */
export function getEnabledRoutes(isFeatureEnabled: (flag: string) => boolean): RouteConfig[] {
  return routes.filter(route => {
    // Always include routes without feature flags
    if (!route.featureFlag) {
      return true
    }
    
    // Check if feature flag is enabled
    return isFeatureEnabled(route.featureFlag)
  })
}

/**
 * Get navigation menu structure
 */
export function getNavigationMenu(isFeatureEnabled: (flag: string) => boolean) {
  const enabledRoutes = getEnabledRoutes(isFeatureEnabled)
  
  const menu = {
    ai: {
      title: 'AI Extraction',
      icon: 'lucide:sparkles',
      description: 'AI-powered PDF processing',
      routes: enabledRoutes.filter(route => route.category === 'ai')
    },
    traditional: {
      title: 'Traditional Tools',
      icon: 'lucide:tools',
      description: 'Manual PDF processing tools',
      routes: enabledRoutes.filter(route => route.category === 'traditional')
    },
    cbt: {
      title: 'CBT Interface',
      icon: 'lucide:monitor',
      description: 'Computer-based testing',
      routes: enabledRoutes.filter(route => route.category === 'cbt')
    }
  }
  
  // Remove empty categories
  Object.keys(menu).forEach(key => {
    if (menu[key as keyof typeof menu].routes.length === 0) {
      delete menu[key as keyof typeof menu]
    }
  })
  
  return menu
}

/**
 * Get breadcrumb for current route
 */
export function getBreadcrumb(currentPath: string): { name: string; path: string }[] {
  const route = getRouteByPath(currentPath)
  if (!route) {
    return [{ name: 'Home', path: '/' }]
  }
  
  const breadcrumb = [{ name: 'Home', path: '/' }]
  
  // Add category breadcrumb
  switch (route.category) {
    case 'ai':
      breadcrumb.push({ name: 'AI Features', path: '/ai-extractor' })
      break
    case 'traditional':
      breadcrumb.push({ name: 'Traditional Tools', path: '/pdf-cropper' })
      break
    case 'cbt':
      breadcrumb.push({ name: 'CBT', path: '/cbt/interface' })
      break
    case 'dev':
      breadcrumb.push({ name: 'Development', path: '/dev/feature-flags' })
      break
  }
  
  // Add current route if it's not the category root
  if (route.path !== breadcrumb[breadcrumb.length - 1].path) {
    breadcrumb.push({ name: route.title, path: route.path })
  }
  
  return breadcrumb
}

/**
 * Check if route requires AI features
 */
export function isAIRoute(path: string): boolean {
  const route = getRouteByPath(path)
  return route?.category === 'ai' || route?.meta?.aiPowered === true
}

/**
 * Check if route supports both AI and traditional workflows
 */
export function isHybridRoute(path: string): boolean {
  const route = getRouteByPath(path)
  return route?.meta?.supportsAI === true && route?.meta?.supportsTraditional === true
}

/**
 * Get route recommendations based on current route
 */
export function getRouteRecommendations(currentPath: string, isFeatureEnabled: (flag: string) => boolean): RouteConfig[] {
  const currentRoute = getRouteByPath(currentPath)
  if (!currentRoute) {
    return []
  }
  
  const enabledRoutes = getEnabledRoutes(isFeatureEnabled)
  const recommendations: RouteConfig[] = []
  
  // Recommend based on current route category
  switch (currentRoute.category) {
    case 'ai':
      // If on AI extractor, recommend review interface
      if (currentPath === '/ai-extractor') {
        const reviewRoute = enabledRoutes.find(r => r.path === '/review-interface')
        if (reviewRoute) recommendations.push(reviewRoute)
      }
      // Always recommend CBT interface for AI routes
      const cbtRoute = enabledRoutes.find(r => r.path === '/cbt/interface')
      if (cbtRoute) recommendations.push(cbtRoute)
      break
      
    case 'traditional':
      // Recommend CBT interface and answer key generation
      const cbtInterfaceRoute = enabledRoutes.find(r => r.path === '/cbt/interface')
      const answerKeyRoute = enabledRoutes.find(r => r.path === '/cbt/generate-answer-key')
      if (cbtInterfaceRoute) recommendations.push(cbtInterfaceRoute)
      if (answerKeyRoute) recommendations.push(answerKeyRoute)
      break
      
    case 'cbt':
      // Recommend other CBT routes
      const otherCBTRoutes = enabledRoutes.filter(r => 
        r.category === 'cbt' && r.path !== currentPath
      )
      recommendations.push(...otherCBTRoutes)
      break
  }
  
  return recommendations.slice(0, 3) // Limit to 3 recommendations
}