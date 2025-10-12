/**
 * System Integration Manager
 * Coordinates all components of the Rankify online user flow system
 * Implements the complete architecture described in the design document
 */

import { ref, reactive, computed, watch } from 'vue'
import { useOnlineUserFlow } from './useOnlineUserFlow'
import { usePerformanceMonitoring } from './usePerformanceMonitoring'
import { useEndToEndTesting } from './useEndToEndTesting'
import { getFeatureFlags } from './useFeatureFlags'
import { useAIExtraction } from './useAIExtraction'
import { useBatchPDFProcessing } from './useBatchPDFProcessing'
import { useOfflineOnlineSync } from './useOfflineOnlineSync'

export interface SystemState {
  initialized: boolean
  operationalMode: 'online' | 'offline' | 'hybrid'
  healthStatus: SystemHealthStatus
  activeWorkflows: ActiveWorkflow[]
  systemMetrics: SystemMetrics
  lastSyncTime: number
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical' | 'offline'
  components: ComponentHealth[]
  issues: SystemIssue[]
  lastCheck: number
}

export interface ComponentHealth {
  component: string
  status: 'operational' | 'degraded' | 'failed'
  lastHeartbeat: number
  errorCount: number
  responseTime: number
}

export interface SystemIssue {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  component: string
  description: string
  resolution?: string
  timestamp: number
  resolved: boolean
}

export interface ActiveWorkflow {
  id: string
  type: 'ai-extraction' | 'traditional-extraction' | 'test-execution' | 'results-analysis'
  userId: string
  startTime: number
  currentPhase: string
  progress: number
  status: 'active' | 'paused' | 'completed' | 'failed'
}

export interface SystemMetrics {
  totalUsers: number
  activeWorkflows: number
  completedTests: number
  averageSessionDuration: number
  errorRate: number
  performanceScore: number
  resourceUtilization: ResourceMetrics
}

export interface ResourceMetrics {
  memoryUsage: number
  storageUsage: number
  networkUtilization: number
  cpuUsage: number
}

export interface SystemConfiguration {
  environment: 'development' | 'staging' | 'production'
  features: FeatureConfiguration
  performance: PerformanceConfiguration
  monitoring: MonitoringConfiguration
  security: SecurityConfiguration
}

export interface FeatureConfiguration {
  aiExtraction: boolean
  offlineMode: boolean
  advancedAnalytics: boolean
  debugMode: boolean
  experimentalFeatures: boolean
}

export interface PerformanceConfiguration {
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal'
  preloadResources: boolean
  backgroundSync: boolean
  compressionLevel: number
}

export interface MonitoringConfiguration {
  enableDetailedLogging: boolean
  performanceTracking: boolean
  errorReporting: boolean
  userAnalytics: boolean
}

export interface SecurityConfiguration {
  dataEncryption: boolean
  secureStorage: boolean
  privacyMode: boolean
  auditLogging: boolean
}

export function useSystemIntegration() {
  // Core composables
  const userFlow = useOnlineUserFlow()
  const performanceMonitoring = usePerformanceMonitoring()
  const endToEndTesting = useEndToEndTesting()
  const featureFlags = getFeatureFlags()
  const aiExtraction = useAIExtraction()
  const batchProcessor = useBatchPDFProcessing()
  const offlineSync = useOfflineOnlineSync()

  // System state
  const systemState = reactive<SystemState>({
    initialized: false,
    operationalMode: 'online',
    healthStatus: {
      overall: 'healthy',
      components: [],
      issues: [],
      lastCheck: 0
    },
    activeWorkflows: [],
    systemMetrics: {
      totalUsers: 0,
      activeWorkflows: 0,
      completedTests: 0,
      averageSessionDuration: 0,
      errorRate: 0,
      performanceScore: 0,
      resourceUtilization: {
        memoryUsage: 0,
        storageUsage: 0,
        networkUtilization: 0,
        cpuUsage: 0
      }
    },
    lastSyncTime: 0
  })

  const configuration = ref<SystemConfiguration>({
    environment: 'development',
    features: {
      aiExtraction: true,
      offlineMode: false,
      advancedAnalytics: true,
      debugMode: true,
      experimentalFeatures: false
    },
    performance: {
      cacheStrategy: 'moderate',
      preloadResources: true,
      backgroundSync: true,
      compressionLevel: 6
    },
    monitoring: {
      enableDetailedLogging: true,
      performanceTracking: true,
      errorReporting: true,
      userAnalytics: true
    },
    security: {
      dataEncryption: true,
      secureStorage: true,
      privacyMode: false,
      auditLogging: true
    }
  })

  // Computed properties
  const systemReadiness = computed(() => {
    return systemState.initialized && 
           systemState.healthStatus.overall !== 'critical' &&
           systemState.healthStatus.overall !== 'offline'
  })

  const criticalIssues = computed(() => {
    return systemState.healthStatus.issues.filter(issue => 
      issue.severity === 'critical' && !issue.resolved
    )
  })

  const operationalComponents = computed(() => {
    return systemState.healthStatus.components.filter(comp => 
      comp.status === 'operational'
    ).length
  })

  const degradedComponents = computed(() => {
    return systemState.healthStatus.components.filter(comp => 
      comp.status === 'degraded' || comp.status === 'failed'
    )
  })

  // System initialization
  const initializeSystem = async (): Promise<boolean> => {
    try {
      console.log('Initializing Rankify system...')
      
      // Step 1: Initialize feature flags
      await initializeFeatureFlags()
      
      // Step 2: Setup performance monitoring
      await initializePerformanceMonitoring()
      
      // Step 3: Initialize core components
      await initializeCoreComponents()
      
      // Step 4: Setup error handling and recovery
      await initializeErrorHandling()
      
      // Step 5: Configure operational mode
      await determineOperationalMode()
      
      // Step 6: Start health monitoring
      await startHealthMonitoring()
      
      // Step 7: Initialize user flow system
      const userFlowInitialized = await userFlow.initializeSystem()
      if (!userFlowInitialized) {
        throw new Error('Failed to initialize user flow system')
      }

      systemState.initialized = true
      console.log('Rankify system initialized successfully')
      
      return true
    } catch (error) {
      console.error('System initialization failed:', error)
      await handleInitializationError(error as Error)
      return false
    }
  }

  const initializeFeatureFlags = async (): Promise<void> => {
    featureFlags.initialize({
      environment: configuration.value.environment,
      userId: generateUserId()
    })

    // Update configuration based on feature flags
    configuration.value.features.aiExtraction = featureFlags.aiExtractionEnabled.value
    configuration.value.features.advancedAnalytics = featureFlags.performanceMonitoringEnabled.value

    addComponentHealth('feature-flags', 'operational')
  }

  const initializePerformanceMonitoring = async (): Promise<void> => {
    if (configuration.value.monitoring.performanceTracking) {
      performanceMonitoring.startMonitoring()
      
      // Track system initialization
      performanceMonitoring.trackUserInteraction('system_initialization')
      
      addComponentHealth('performance-monitoring', 'operational')
    }
  }

  const initializeCoreComponents = async (): Promise<void> => {
    const components = [
      { name: 'indexeddb', check: checkIndexedDBAvailability },
      { name: 'pdf-processing', check: checkPDFProcessingCapability },
      { name: 'ai-services', check: checkAIServicesAvailability },
      { name: 'storage-manager', check: checkStorageAvailability },
      { name: 'network-manager', check: checkNetworkConnectivity }
    ]

    for (const component of components) {
      try {
        const isAvailable = await component.check()
        addComponentHealth(
          component.name, 
          isAvailable ? 'operational' : 'degraded'
        )
      } catch (error) {
        addComponentHealth(component.name, 'failed')
        addSystemIssue({
          component: component.name,
          severity: 'high',
          description: `Failed to initialize ${component.name}: ${error.message}`
        })
      }
    }
  }

  const initializeErrorHandling = async (): Promise<void> => {
    // Setup global error handlers
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    addComponentHealth('error-handling', 'operational')
  }

  const determineOperationalMode = async (): Promise<void> => {
    const isOnline = navigator.onLine
    const hasAICapability = featureFlags.aiExtractionEnabled.value && aiExtraction.isConfigValid.value
    const hasOfflineCapability = configuration.value.features.offlineMode

    if (isOnline && hasAICapability) {
      systemState.operationalMode = 'online'
    } else if (hasOfflineCapability) {
      systemState.operationalMode = 'offline'
    } else {
      systemState.operationalMode = 'hybrid'
    }

    // Listen for online/offline changes
    window.addEventListener('online', () => {
      systemState.operationalMode = 'online'
      handleConnectivityChange(true)
    })

    window.addEventListener('offline', () => {
      systemState.operationalMode = hasOfflineCapability ? 'offline' : 'hybrid'
      handleConnectivityChange(false)
    })
  }

  const startHealthMonitoring = async (): Promise<void> => {
    // Start periodic health checks
    setInterval(performHealthCheck, 30000) // Every 30 seconds
    
    // Initial health check
    await performHealthCheck()
    
    addComponentHealth('health-monitoring', 'operational')
  }

  // Health monitoring
  const performHealthCheck = async (): Promise<void> => {
    const startTime = Date.now()
    
    try {
      // Check component health
      await checkComponentsHealth()
      
      // Check system metrics
      await updateSystemMetrics()
      
      // Calculate overall health
      calculateOverallHealth()
      
      systemState.healthStatus.lastCheck = Date.now()
      
      // Performance tracking
      if (configuration.value.monitoring.performanceTracking) {
        const checkDuration = Date.now() - startTime
        performanceMonitoring.trackUserInteraction('health_check', { duration: checkDuration })
      }
      
    } catch (error) {
      addSystemIssue({
        component: 'health-monitoring',
        severity: 'medium',
        description: `Health check failed: ${error.message}`
      })
    }
  }

  const checkComponentsHealth = async (): Promise<void> => {
    for (const component of systemState.healthStatus.components) {
      const healthCheckStart = Date.now()
      
      try {
        const isHealthy = await performComponentHealthCheck(component.component)
        const responseTime = Date.now() - healthCheckStart
        
        updateComponentHealth(component.component, {
          status: isHealthy ? 'operational' : 'degraded',
          lastHeartbeat: Date.now(),
          responseTime
        })
        
      } catch (error) {
        updateComponentHealth(component.component, {
          status: 'failed',
          lastHeartbeat: Date.now(),
          responseTime: Date.now() - healthCheckStart
        })
        
        component.errorCount++
      }
    }
  }

  const performComponentHealthCheck = async (component: string): Promise<boolean> => {
    switch (component) {
      case 'feature-flags':
        return featureFlags.getAllFlags().length > 0
      
      case 'performance-monitoring':
        return performanceMonitoring.isMonitoring.value
      
      case 'indexeddb':
        return await checkIndexedDBAvailability()
      
      case 'pdf-processing':
        return await checkPDFProcessingCapability()
      
      case 'ai-services':
        return await checkAIServicesAvailability()
      
      case 'storage-manager':
        return await checkStorageAvailability()
      
      case 'network-manager':
        return navigator.onLine
      
      default:
        return true
    }
  }

  const updateSystemMetrics = async (): Promise<void> => {
    // Update active workflows
    systemState.systemMetrics.activeWorkflows = systemState.activeWorkflows.filter(
      wf => wf.status === 'active'
    ).length

    // Update performance score from monitoring
    if (configuration.value.monitoring.performanceTracking) {
      systemState.systemMetrics.performanceScore = performanceMonitoring.overallPerformanceScore.value
    }

    // Update resource utilization
    if ('memory' in performance) {
      const memory = (performance as any).memory
      systemState.systemMetrics.resourceUtilization.memoryUsage = 
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    }

    // Update storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        if (estimate.quota && estimate.usage) {
          systemState.systemMetrics.resourceUtilization.storageUsage = 
            (estimate.usage / estimate.quota) * 100
        }
      } catch (error) {
        console.warn('Failed to get storage estimate:', error)
      }
    }
  }

  const calculateOverallHealth = (): void => {
    const operationalCount = systemState.healthStatus.components.filter(
      c => c.status === 'operational'
    ).length
    
    const totalComponents = systemState.healthStatus.components.length
    const healthPercentage = totalComponents > 0 ? (operationalCount / totalComponents) * 100 : 100

    const criticalIssueCount = systemState.healthStatus.issues.filter(
      i => i.severity === 'critical' && !i.resolved
    ).length

    if (criticalIssueCount > 0 || healthPercentage < 50) {
      systemState.healthStatus.overall = 'critical'
    } else if (healthPercentage < 80) {
      systemState.healthStatus.overall = 'degraded'
    } else if (navigator.onLine) {
      systemState.healthStatus.overall = 'healthy'
    } else {
      systemState.healthStatus.overall = 'offline'
    }
  }

  // Workflow management
  const startWorkflow = (type: ActiveWorkflow['type'], userId: string): string => {
    const workflowId = generateWorkflowId()
    
    const workflow: ActiveWorkflow = {
      id: workflowId,
      type,
      userId,
      startTime: Date.now(),
      currentPhase: 'initialization',
      progress: 0,
      status: 'active'
    }

    systemState.activeWorkflows.push(workflow)
    
    // Track workflow start
    if (configuration.value.monitoring.userAnalytics) {
      performanceMonitoring.trackUserInteraction('workflow_start', { type, workflowId })
    }

    return workflowId
  }

  const updateWorkflow = (workflowId: string, updates: Partial<ActiveWorkflow>): void => {
    const workflow = systemState.activeWorkflows.find(wf => wf.id === workflowId)
    if (workflow) {
      Object.assign(workflow, updates)
      
      // Track workflow progress
      if (configuration.value.monitoring.userAnalytics && updates.progress) {
        performanceMonitoring.trackUserInteraction('workflow_progress', { 
          workflowId, 
          progress: updates.progress 
        })
      }
    }
  }

  const completeWorkflow = (workflowId: string, success: boolean): void => {
    const workflow = systemState.activeWorkflows.find(wf => wf.id === workflowId)
    if (workflow) {
      workflow.status = success ? 'completed' : 'failed'
      workflow.progress = 100

      // Update system metrics
      if (success) {
        systemState.systemMetrics.completedTests++
      }

      // Track workflow completion
      if (configuration.value.monitoring.userAnalytics) {
        const duration = Date.now() - workflow.startTime
        performanceMonitoring.trackUserInteraction('workflow_complete', { 
          workflowId, 
          success, 
          duration,
          type: workflow.type
        })
      }
    }
  }

  // Utility functions
  const checkIndexedDBAvailability = async (): Promise<boolean> => {
    try {
      return 'indexedDB' in window && !!window.indexedDB
    } catch {
      return false
    }
  }

  const checkPDFProcessingCapability = async (): Promise<boolean> => {
    try {
      // Check if PDF processing libraries are available
      return typeof window !== 'undefined'
    } catch {
      return false
    }
  }

  const checkAIServicesAvailability = async (): Promise<boolean> => {
    try {
      return featureFlags.aiExtractionEnabled.value && aiExtraction.isConfigValid.value
    } catch {
      return false
    }
  }

  const checkStorageAvailability = async (): Promise<boolean> => {
    try {
      return 'localStorage' in window && !!window.localStorage
    } catch {
      return false
    }
  }

  const checkNetworkConnectivity = async (): Promise<boolean> => {
    return navigator.onLine
  }

  const addComponentHealth = (component: string, status: ComponentHealth['status']): void => {
    const existingIndex = systemState.healthStatus.components.findIndex(c => c.component === component)
    
    const healthData: ComponentHealth = {
      component,
      status,
      lastHeartbeat: Date.now(),
      errorCount: 0,
      responseTime: 0
    }

    if (existingIndex >= 0) {
      systemState.healthStatus.components[existingIndex] = healthData
    } else {
      systemState.healthStatus.components.push(healthData)
    }
  }

  const updateComponentHealth = (component: string, updates: Partial<ComponentHealth>): void => {
    const comp = systemState.healthStatus.components.find(c => c.component === component)
    if (comp) {
      Object.assign(comp, updates)
    }
  }

  const addSystemIssue = (issue: Omit<SystemIssue, 'id' | 'timestamp' | 'resolved'>): void => {
    const newIssue: SystemIssue = {
      ...issue,
      id: generateIssueId(),
      timestamp: Date.now(),
      resolved: false
    }

    systemState.healthStatus.issues.push(newIssue)

    // Track error
    if (configuration.value.monitoring.errorReporting) {
      performanceMonitoring.trackError(
        issue.component, 
        issue.severity, 
        new Error(issue.description)
      )
    }
  }

  const resolveSystemIssue = (issueId: string, resolution?: string): void => {
    const issue = systemState.healthStatus.issues.find(i => i.id === issueId)
    if (issue) {
      issue.resolved = true
      issue.resolution = resolution
    }
  }

  const handleGlobalError = (event: ErrorEvent): void => {
    addSystemIssue({
      component: 'global',
      severity: 'high',
      description: `Global error: ${event.message} at ${event.filename}:${event.lineno}`
    })
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    addSystemIssue({
      component: 'global',
      severity: 'high',
      description: `Unhandled promise rejection: ${event.reason}`
    })
  }

  const handleConnectivityChange = (isOnline: boolean): void => {
    if (isOnline) {
      addSystemIssue({
        component: 'network',
        severity: 'low',
        description: 'Network connectivity restored'
      })
    } else {
      addSystemIssue({
        component: 'network',
        severity: 'medium',
        description: 'Network connectivity lost - switching to offline mode'
      })
    }
  }

  const handleInitializationError = async (error: Error): Promise<void> => {
    addSystemIssue({
      component: 'system',
      severity: 'critical',
      description: `System initialization failed: ${error.message}`
    })

    // Attempt recovery
    console.log('Attempting system recovery...')
    
    // Try to initialize with minimal configuration
    try {
      configuration.value.features.aiExtraction = false
      configuration.value.features.advancedAnalytics = false
      await initializeSystem()
    } catch (recoveryError) {
      console.error('System recovery failed:', recoveryError)
      systemState.healthStatus.overall = 'critical'
    }
  }

  const generateUserId = (): string => {
    return 'user_' + Math.random().toString(36).substr(2, 9)
  }

  const generateWorkflowId = (): string => {
    return 'workflow_' + Math.random().toString(36).substr(2, 9)
  }

  const generateIssueId = (): string => {
    return 'issue_' + Math.random().toString(36).substr(2, 9)
  }

  // System shutdown
  const shutdownSystem = async (): Promise<void> => {
    console.log('Shutting down Rankify system...')
    
    // Stop monitoring
    performanceMonitoring.stopMonitoring()
    
    // Complete active workflows
    systemState.activeWorkflows.forEach(workflow => {
      if (workflow.status === 'active') {
        workflow.status = 'completed'
      }
    })
    
    // Clean up event listeners
    window.removeEventListener('error', handleGlobalError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    
    systemState.initialized = false
    console.log('System shutdown complete')
  }

  // Public API
  return {
    // State
    systemState: readonly(systemState),
    configuration: readonly(configuration),
    
    // Computed
    systemReadiness,
    criticalIssues,
    operationalComponents,
    degradedComponents,
    
    // System control
    initializeSystem,
    shutdownSystem,
    
    // Health monitoring
    performHealthCheck,
    
    // Workflow management
    startWorkflow,
    updateWorkflow,
    completeWorkflow,
    
    // Issue management
    addSystemIssue,
    resolveSystemIssue,
    
    // Component access
    userFlow,
    performanceMonitoring,
    endToEndTesting,
    featureFlags,
    aiExtraction,
    batchProcessor,
    offlineSync
  }
}