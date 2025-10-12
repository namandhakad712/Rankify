/**
 * Performance Monitoring and Optimization System
 * Tracks user interactions, system performance, and provides optimization insights
 * Based on design document requirements for performance optimization
 */

import { ref, reactive, computed } from 'vue'

export interface PerformanceMetrics {
  userInteractions: UserInteractionMetrics
  systemPerformance: SystemPerformanceMetrics
  aiProcessing: AIProcessingMetrics
  testExecution: TestExecutionMetrics
  errorTracking: ErrorTrackingMetrics
}

export interface UserInteractionMetrics {
  sessionDuration: number
  clickCount: number
  navigationEvents: number
  featureUsage: Record<string, number>
  workflowCompletionRate: number
  userEfficiencyScore: number
}

export interface SystemPerformanceMetrics {
  memoryUsage: MemoryUsageData
  loadTimes: LoadTimeData
  networkPerformance: NetworkPerformanceData
  browserCompatibility: BrowserCompatibilityData
  resourceUtilization: ResourceUtilizationData
}

export interface AIProcessingMetrics {
  extractionTimes: number[]
  confidenceScores: number[]
  successRate: number
  retryAttempts: number
  apiResponseTimes: number[]
  errorRate: number
}

export interface TestExecutionMetrics {
  testDurations: number[]
  questionNavigationTimes: number[]
  saveOperationTimes: number[]
  uiResponseTimes: number[]
  autoSavePerformance: AutoSavePerformanceData
}

export interface ErrorTrackingMetrics {
  totalErrors: number
  errorsByCategory: Record<string, number>
  recoverySuccessRate: number
  criticalErrors: number
  userImpactScore: number
}

export interface MemoryUsageData {
  heapUsed: number
  heapTotal: number
  heapLimit: number
  timestamp: number
}

export interface LoadTimeData {
  domContentLoaded: number
  firstPaint: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
}

export interface NetworkPerformanceData {
  connectionType: string
  downlink: number
  effectiveType: string
  rtt: number
  saveData: boolean
}

export interface BrowserCompatibilityData {
  userAgent: string
  browserName: string
  browserVersion: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  screenResolution: string
  supportedFeatures: string[]
}

export interface ResourceUtilizationData {
  cpuUsage: number
  storageUsed: number
  storageQuota: number
  activeConnections: number
}

export interface AutoSavePerformanceData {
  averageSaveTime: number
  saveSuccessRate: number
  lastSaveTimestamp: number
  pendingSaves: number
}

export interface PerformanceInsight {
  category: 'performance' | 'user-experience' | 'error' | 'optimization'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  impact: string
  timestamp: number
}

export function usePerformanceMonitoring() {
  // Reactive state
  const metrics = reactive<PerformanceMetrics>({
    userInteractions: {
      sessionDuration: 0,
      clickCount: 0,
      navigationEvents: 0,
      featureUsage: {},
      workflowCompletionRate: 0,
      userEfficiencyScore: 0
    },
    systemPerformance: {
      memoryUsage: { heapUsed: 0, heapTotal: 0, heapLimit: 0, timestamp: 0 },
      loadTimes: { domContentLoaded: 0, firstPaint: 0, firstContentfulPaint: 0, largestContentfulPaint: 0, cumulativeLayoutShift: 0 },
      networkPerformance: { connectionType: '', downlink: 0, effectiveType: '', rtt: 0, saveData: false },
      browserCompatibility: { userAgent: '', browserName: '', browserVersion: '', deviceType: 'desktop', screenResolution: '', supportedFeatures: [] },
      resourceUtilization: { cpuUsage: 0, storageUsed: 0, storageQuota: 0, activeConnections: 0 }
    },
    aiProcessing: {
      extractionTimes: [],
      confidenceScores: [],
      successRate: 0,
      retryAttempts: 0,
      apiResponseTimes: [],
      errorRate: 0
    },
    testExecution: {
      testDurations: [],
      questionNavigationTimes: [],
      saveOperationTimes: [],
      uiResponseTimes: [],
      autoSavePerformance: { averageSaveTime: 0, saveSuccessRate: 0, lastSaveTimestamp: 0, pendingSaves: 0 }
    },
    errorTracking: {
      totalErrors: 0,
      errorsByCategory: {},
      recoverySuccessRate: 0,
      criticalErrors: 0,
      userImpactScore: 0
    }
  })

  const insights = ref<PerformanceInsight[]>([])
  const isMonitoring = ref(false)
  const sessionStart = ref(Date.now())

  // Computed performance scores
  const overallPerformanceScore = computed(() => {
    const scores = [
      calculateUserExperienceScore(),
      calculateSystemPerformanceScore(),
      calculateAIProcessingScore(),
      calculateErrorScore()
    ]
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  })

  const performanceTrends = computed(() => {
    return {
      improving: calculateTrendDirection(metrics.systemPerformance.loadTimes),
      userEngagement: metrics.userInteractions.userEfficiencyScore > 70,
      systemStability: metrics.errorTracking.errorRate < 0.05,
      aiEfficiency: metrics.aiProcessing.successRate > 0.90
    }
  })

  // Initialize monitoring
  const startMonitoring = (): void => {
    if (isMonitoring.value) return

    isMonitoring.value = true
    sessionStart.value = Date.now()

    // Initialize browser performance observers
    initializePerformanceObservers()
    
    // Start periodic system monitoring
    startPeriodicMonitoring()
    
    // Setup event listeners
    setupEventListeners()
    
    console.log('Performance monitoring started')
  }

  const stopMonitoring = (): void => {
    isMonitoring.value = false
    console.log('Performance monitoring stopped')
  }

  // User Interaction Tracking
  const trackUserInteraction = (interaction: string, data?: any): void => {
    metrics.userInteractions.clickCount++
    
    if (metrics.userInteractions.featureUsage[interaction]) {
      metrics.userInteractions.featureUsage[interaction]++
    } else {
      metrics.userInteractions.featureUsage[interaction] = 1
    }

    updateUserEfficiencyScore()
  }

  const trackNavigation = (from: string, to: string, duration: number): void => {
    metrics.userInteractions.navigationEvents++
    
    // Record navigation performance
    if (duration > 0) {
      metrics.testExecution.uiResponseTimes.push(duration)
    }

    generateNavigationInsight(from, to, duration)
  }

  // AI Processing Performance
  const trackAIExtraction = (duration: number, confidence: number, success: boolean): void => {
    metrics.aiProcessing.extractionTimes.push(duration)
    metrics.aiProcessing.confidenceScores.push(confidence)
    
    if (success) {
      updateAISuccessRate(true)
    } else {
      updateAISuccessRate(false)
      metrics.aiProcessing.retryAttempts++
    }

    generateAIPerformanceInsight(duration, confidence, success)
  }

  const trackAPIResponse = (duration: number, success: boolean): void => {
    metrics.aiProcessing.apiResponseTimes.push(duration)
    
    if (!success) {
      metrics.aiProcessing.errorRate = calculateErrorRate(metrics.aiProcessing.apiResponseTimes.length, metrics.aiProcessing.retryAttempts)
    }

    if (duration > 10000) { // 10 seconds
      insights.value.push({
        category: 'performance',
        severity: 'medium',
        title: 'Slow API Response',
        description: `API response took ${Math.round(duration / 1000)}s`,
        recommendation: 'Check network connection or consider offline mode',
        impact: 'Delayed user workflow progression',
        timestamp: Date.now()
      })
    }
  }

  // Test Execution Performance
  const trackTestDuration = (duration: number): void => {
    metrics.testExecution.testDurations.push(duration)
    
    generateTestPerformanceInsight(duration)
  }

  const trackQuestionNavigation = (duration: number): void => {
    metrics.testExecution.questionNavigationTimes.push(duration)
    
    if (duration > 2000) { // 2 seconds
      insights.value.push({
        category: 'user-experience',
        severity: 'low',
        title: 'Slow Question Navigation',
        description: `Question navigation took ${Math.round(duration / 1000)}s`,
        recommendation: 'Consider enabling performance mode',
        impact: 'Reduced test-taking efficiency',
        timestamp: Date.now()
      })
    }
  }

  const trackAutoSave = (duration: number, success: boolean): void => {
    const autoSave = metrics.testExecution.autoSavePerformance
    
    if (success) {
      autoSave.averageSaveTime = calculateMovingAverage(
        autoSave.averageSaveTime, 
        duration, 
        metrics.testExecution.saveOperationTimes.length
      )
      autoSave.lastSaveTimestamp = Date.now()
    }
    
    metrics.testExecution.saveOperationTimes.push(duration)
    autoSave.saveSuccessRate = calculateSaveSuccessRate()
    
    if (duration > 5000 || !success) {
      generateAutoSaveInsight(duration, success)
    }
  }

  // Error Tracking
  const trackError = (category: string, severity: 'low' | 'medium' | 'high' | 'critical', error: Error): void => {
    metrics.errorTracking.totalErrors++
    
    if (metrics.errorTracking.errorsByCategory[category]) {
      metrics.errorTracking.errorsByCategory[category]++
    } else {
      metrics.errorTracking.errorsByCategory[category] = 1
    }

    if (severity === 'critical') {
      metrics.errorTracking.criticalErrors++
    }

    updateUserImpactScore(severity)
    
    insights.value.push({
      category: 'error',
      severity,
      title: `${category} Error`,
      description: error.message,
      recommendation: getErrorRecommendation(category, error),
      impact: calculateErrorImpact(severity),
      timestamp: Date.now()
    })
  }

  const trackErrorRecovery = (success: boolean): void => {
    const totalRecoveries = metrics.errorTracking.totalErrors
    if (totalRecoveries > 0) {
      const successfulRecoveries = success ? 1 : 0
      metrics.errorTracking.recoverySuccessRate = 
        (metrics.errorTracking.recoverySuccessRate * (totalRecoveries - 1) + successfulRecoveries) / totalRecoveries
    }
  }

  // System Performance Monitoring
  const updateMemoryUsage = (): void => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      metrics.systemPerformance.memoryUsage = {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      }

      // Check for memory issues
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      if (usagePercentage > 80) {
        insights.value.push({
          category: 'performance',
          severity: 'high',
          title: 'High Memory Usage',
          description: `Memory usage at ${Math.round(usagePercentage)}%`,
          recommendation: 'Consider refreshing the page or clearing data',
          impact: 'Potential browser slowdown or crashes',
          timestamp: Date.now()
        })
      }
    }
  }

  const updateNetworkInfo = (): void => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      metrics.systemPerformance.networkPerformance = {
        connectionType: connection.type || 'unknown',
        downlink: connection.downlink || 0,
        effectiveType: connection.effectiveType || 'unknown',
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      }

      // Generate network insights
      if (connection.saveData) {
        insights.value.push({
          category: 'optimization',
          severity: 'medium',
          title: 'Data Saver Mode Detected',
          description: 'User has data saver mode enabled',
          recommendation: 'Enable lightweight mode for better experience',
          impact: 'Optimized data usage',
          timestamp: Date.now()
        })
      }
    }
  }

  // Performance Analysis
  const generatePerformanceReport = (): any => {
    return {
      summary: {
        overallScore: overallPerformanceScore.value,
        sessionDuration: Date.now() - sessionStart.value,
        userInteractions: metrics.userInteractions.clickCount,
        errorsEncountered: metrics.errorTracking.totalErrors,
        criticalIssues: insights.value.filter(i => i.severity === 'critical').length
      },
      userExperience: {
        efficiencyScore: metrics.userInteractions.userEfficiencyScore,
        navigationPerformance: calculateAverageNavigationTime(),
        workflowCompletion: metrics.userInteractions.workflowCompletionRate
      },
      systemPerformance: {
        memoryUsage: metrics.systemPerformance.memoryUsage,
        loadTimes: metrics.systemPerformance.loadTimes,
        networkPerformance: metrics.systemPerformance.networkPerformance
      },
      aiPerformance: {
        averageExtractionTime: calculateAverage(metrics.aiProcessing.extractionTimes),
        averageConfidence: calculateAverage(metrics.aiProcessing.confidenceScores),
        successRate: metrics.aiProcessing.successRate,
        errorRate: metrics.aiProcessing.errorRate
      },
      insights: insights.value.slice(-20), // Last 20 insights
      recommendations: generateOptimizationRecommendations()
    }
  }

  // Helper functions
  const initializePerformanceObservers = (): void => {
    // Web Vitals tracking
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            metrics.systemPerformance.loadTimes.largestContentfulPaint = entries[entries.length - 1].startTime
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value
            }
          }
          metrics.systemPerformance.loadTimes.cumulativeLayoutShift = cls
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

      } catch (error) {
        console.warn('Performance observers not fully supported:', error)
      }
    }
  }

  const startPeriodicMonitoring = (): void => {
    setInterval(() => {
      if (isMonitoring.value) {
        updateMemoryUsage()
        updateNetworkInfo()
        metrics.userInteractions.sessionDuration = Date.now() - sessionStart.value
      }
    }, 30000) // Every 30 seconds
  }

  const setupEventListeners = (): void => {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopMonitoring()
      } else {
        startMonitoring()
      }
    })
  }

  const calculateUserExperienceScore = (): number => {
    const navigationScore = calculateAverageNavigationTime() < 1000 ? 100 : 50
    const errorScore = Math.max(0, 100 - (metrics.errorTracking.totalErrors * 10))
    const efficiencyScore = metrics.userInteractions.userEfficiencyScore || 50
    
    return Math.round((navigationScore + errorScore + efficiencyScore) / 3)
  }

  const calculateSystemPerformanceScore = (): number => {
    const memoryScore = calculateMemoryScore()
    const loadTimeScore = calculateLoadTimeScore()
    const networkScore = calculateNetworkScore()
    
    return Math.round((memoryScore + loadTimeScore + networkScore) / 3)
  }

  const calculateAIProcessingScore = (): number => {
    if (metrics.aiProcessing.extractionTimes.length === 0) return 100
    
    const timeScore = calculateAverage(metrics.aiProcessing.extractionTimes) < 10000 ? 100 : 50
    const confidenceScore = calculateAverage(metrics.aiProcessing.confidenceScores) * 20
    const successScore = metrics.aiProcessing.successRate * 100
    
    return Math.round((timeScore + confidenceScore + successScore) / 3)
  }

  const calculateErrorScore = (): number => {
    return Math.max(0, 100 - (metrics.errorTracking.errorRate * 100))
  }

  const calculateMemoryScore = (): number => {
    const usage = metrics.systemPerformance.memoryUsage
    if (usage.heapLimit === 0) return 100
    
    const usagePercentage = (usage.heapUsed / usage.heapLimit) * 100
    return Math.max(0, 100 - usagePercentage)
  }

  const calculateLoadTimeScore = (): number => {
    const lcp = metrics.systemPerformance.loadTimes.largestContentfulPaint
    if (lcp === 0) return 100
    
    return lcp < 2500 ? 100 : lcp < 4000 ? 75 : 50
  }

  const calculateNetworkScore = (): number => {
    const network = metrics.systemPerformance.networkPerformance
    const rttScore = network.rtt < 100 ? 100 : network.rtt < 300 ? 75 : 50
    const downlinkScore = network.downlink > 1.5 ? 100 : network.downlink > 0.5 ? 75 : 50
    
    return Math.round((rttScore + downlinkScore) / 2)
  }

  const updateUserEfficiencyScore = (): void => {
    const totalInteractions = metrics.userInteractions.clickCount
    const sessionTime = (Date.now() - sessionStart.value) / 1000 / 60 // minutes
    
    if (sessionTime > 0) {
      const interactionsPerMinute = totalInteractions / sessionTime
      metrics.userInteractions.userEfficiencyScore = Math.min(100, interactionsPerMinute * 10)
    }
  }

  const updateAISuccessRate = (success: boolean): void => {
    const total = metrics.aiProcessing.extractionTimes.length
    const current = metrics.aiProcessing.successRate * (total - 1)
    metrics.aiProcessing.successRate = (current + (success ? 1 : 0)) / total
  }

  const calculateMovingAverage = (current: number, newValue: number, count: number): number => {
    return (current * (count - 1) + newValue) / count
  }

  const calculateAverage = (values: number[]): number => {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  const calculateErrorRate = (totalRequests: number, errors: number): number => {
    return totalRequests > 0 ? errors / totalRequests : 0
  }

  const calculateSaveSuccessRate = (): number => {
    // This would be calculated based on actual save operations
    return 0.95 // Default 95% success rate
  }

  const calculateAverageNavigationTime = (): number => {
    return calculateAverage(metrics.testExecution.uiResponseTimes)
  }

  const calculateTrendDirection = (data: any): 'improving' | 'stable' | 'declining' => {
    // Simple trend calculation
    return 'stable'
  }

  const updateUserImpactScore = (severity: 'low' | 'medium' | 'high' | 'critical'): void => {
    const impactValues = { low: 1, medium: 3, high: 5, critical: 10 }
    metrics.errorTracking.userImpactScore += impactValues[severity]
  }

  const generateNavigationInsight = (from: string, to: string, duration: number): void => {
    if (duration > 3000) {
      insights.value.push({
        category: 'performance',
        severity: 'medium',
        title: 'Slow Page Navigation',
        description: `Navigation from ${from} to ${to} took ${Math.round(duration / 1000)}s`,
        recommendation: 'Consider optimizing page loading or using progressive loading',
        impact: 'Delayed user experience',
        timestamp: Date.now()
      })
    }
  }

  const generateAIPerformanceInsight = (duration: number, confidence: number, success: boolean): void => {
    if (!success) {
      insights.value.push({
        category: 'error',
        severity: 'high',
        title: 'AI Extraction Failed',
        description: 'AI extraction did not complete successfully',
        recommendation: 'Check API connectivity or try traditional extraction method',
        impact: 'Workflow blocked',
        timestamp: Date.now()
      })
    } else if (confidence < 2.5) {
      insights.value.push({
        category: 'user-experience',
        severity: 'medium',
        title: 'Low AI Confidence',
        description: `AI extraction confidence is ${confidence}/5`,
        recommendation: 'Manual review recommended for extracted questions',
        impact: 'May require additional user intervention',
        timestamp: Date.now()
      })
    }
  }

  const generateTestPerformanceInsight = (duration: number): void => {
    const averageTestTime = 30 * 60 * 1000 // 30 minutes expected
    
    if (duration < averageTestTime * 0.3) {
      insights.value.push({
        category: 'user-experience',
        severity: 'low',
        title: 'Unusually Fast Test Completion',
        description: `Test completed in ${Math.round(duration / 60000)} minutes`,
        recommendation: 'Consider if test was too easy or user needs more time',
        impact: 'Potential accuracy concerns',
        timestamp: Date.now()
      })
    }
  }

  const generateAutoSaveInsight = (duration: number, success: boolean): void => {
    if (!success) {
      insights.value.push({
        category: 'error',
        severity: 'high',
        title: 'Auto-save Failed',
        description: 'Failed to save test progress automatically',
        recommendation: 'Check storage space and browser settings',
        impact: 'Risk of data loss',
        timestamp: Date.now()
      })
    }
  }

  const getErrorRecommendation = (category: string, error: Error): string => {
    const recommendations = {
      network: 'Check internet connection and try again',
      storage: 'Clear browser data or check available storage space',
      ai: 'Verify API key and try again, or use traditional extraction',
      file: 'Check file format and size, ensure PDF is not corrupted',
      default: 'Refresh the page and try again'
    }
    return recommendations[category as keyof typeof recommendations] || recommendations.default
  }

  const calculateErrorImpact = (severity: 'low' | 'medium' | 'high' | 'critical'): string => {
    const impacts = {
      low: 'Minor inconvenience',
      medium: 'Workflow delay',
      high: 'Significant disruption',
      critical: 'System unusable'
    }
    return impacts[severity]
  }

  const generateOptimizationRecommendations = (): string[] => {
    const recommendations: string[] = []
    
    if (metrics.systemPerformance.memoryUsage.heapUsed > metrics.systemPerformance.memoryUsage.heapLimit * 0.8) {
      recommendations.push('Consider clearing browser cache to free up memory')
    }
    
    if (calculateAverage(metrics.aiProcessing.extractionTimes) > 15000) {
      recommendations.push('Enable caching for AI extraction results to improve performance')
    }
    
    if (metrics.errorTracking.errorRate > 0.1) {
      recommendations.push('Review error logs and implement additional error handling')
    }
    
    return recommendations
  }

  return {
    // State
    metrics: readonly(metrics),
    insights: readonly(insights),
    isMonitoring: readonly(isMonitoring),
    
    // Computed
    overallPerformanceScore,
    performanceTrends,
    
    // Control
    startMonitoring,
    stopMonitoring,
    
    // Tracking methods
    trackUserInteraction,
    trackNavigation,
    trackAIExtraction,
    trackAPIResponse,
    trackTestDuration,
    trackQuestionNavigation,
    trackAutoSave,
    trackError,
    trackErrorRecovery,
    
    // Analysis
    generatePerformanceReport
  }
}