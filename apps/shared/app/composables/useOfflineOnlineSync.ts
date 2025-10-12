/**
 * Offline/Online Mode Detection and Synchronization System
 * Manages connectivity state and seamless transitions between online and offline modes
 * Based on design document requirements for hybrid operation
 */

import { ref, reactive, computed, watch } from 'vue'
import { usePerformanceMonitoring } from './usePerformanceMonitoring'
import { useSecurityPrivacyManager } from './useSecurityPrivacyManager'

export interface ConnectivityState {
  isOnline: boolean
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  downlink: number
  rtt: number
  saveData: boolean
  lastOnlineTime: number
  lastOfflineTime: number
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
}

export interface OfflineCapabilities {
  pdfProcessing: boolean
  testExecution: boolean
  resultAnalysis: boolean
  dataStorage: boolean
  basicFunctionality: boolean
}

export interface SyncOperation {
  id: string
  type: 'upload' | 'download' | 'bidirectional'
  dataType: 'test-results' | 'user-data' | 'extracted-questions' | 'performance-metrics'
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  createdAt: number
  updatedAt: number
  data: any
  error?: string
  retryCount: number
  maxRetries: number
}

export interface SyncQueue {
  operations: SyncOperation[]
  isActive: boolean
  isPaused: boolean
  lastSyncTime: number
  nextSyncTime: number
  syncInterval: number
}

export interface OfflineStorage {
  pendingUploads: any[]
  cachedData: Map<string, any>
  userPreferences: any
  testSessions: any[]
  extractedContent: any[]
  performanceData: any[]
}

export interface SyncConflict {
  id: string
  type: 'data-mismatch' | 'version-conflict' | 'timestamp-conflict'
  localData: any
  remoteData: any
  resolvedData?: any
  resolution: 'use-local' | 'use-remote' | 'merge' | 'manual'
  timestamp: number
}

export interface NetworkQualityMetrics {
  latency: number
  bandwidth: number
  stability: number
  reliability: number
  lastMeasured: number
}

export function useOfflineOnlineSync() {
  const performanceMonitoring = usePerformanceMonitoring()
  const securityManager = useSecurityPrivacyManager()

  // Connectivity state
  const connectivityState = reactive<ConnectivityState>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
    lastOnlineTime: navigator.onLine ? Date.now() : 0,
    lastOfflineTime: navigator.onLine ? 0 : Date.now(),
    connectionQuality: 'offline'
  })

  const offlineCapabilities = reactive<OfflineCapabilities>({
    pdfProcessing: true,  // Rule-based processing works offline
    testExecution: true,   // CBT interface works offline
    resultAnalysis: true,  // Basic analysis works offline
    dataStorage: true,     // IndexedDB works offline
    basicFunctionality: true // Core features work offline
  })

  const syncQueue = reactive<SyncQueue>({
    operations: [],
    isActive: false,
    isPaused: false,
    lastSyncTime: 0,
    nextSyncTime: 0,
    syncInterval: 30000 // 30 seconds
  })

  const offlineStorage = reactive<OfflineStorage>({
    pendingUploads: [],
    cachedData: new Map(),
    userPreferences: {},
    testSessions: [],
    extractedContent: [],
    performanceData: []
  })

  const syncConflicts = ref<SyncConflict[]>([])
  const networkQuality = reactive<NetworkQualityMetrics>({
    latency: 0,
    bandwidth: 0,
    stability: 0,
    reliability: 0,
    lastMeasured: 0
  })

  // Computed properties
  const operationalMode = computed(() => {
    if (!connectivityState.isOnline) return 'offline'
    if (connectivityState.connectionQuality === 'poor') return 'hybrid'
    return 'online'
  })

  const canSync = computed(() => 
    connectivityState.isOnline && 
    connectivityState.connectionQuality !== 'offline' &&
    !syncQueue.isPaused
  )

  const pendingSyncOperations = computed(() => 
    syncQueue.operations.filter(op => op.status === 'pending')
  )

  const activeSyncOperations = computed(() => 
    syncQueue.operations.filter(op => op.status === 'syncing')
  )

  const failedSyncOperations = computed(() => 
    syncQueue.operations.filter(op => op.status === 'failed')
  )

  const syncProgress = computed(() => {
    if (syncQueue.operations.length === 0) return 100
    const totalProgress = syncQueue.operations.reduce((sum, op) => sum + op.progress, 0)
    return Math.round(totalProgress / syncQueue.operations.length)
  })

  // Initialize connectivity monitoring
  const initializeConnectivityMonitoring = (): void => {
    // Monitor online/offline events
    window.addEventListener('online', handleOnlineEvent)
    window.addEventListener('offline', handleOfflineEvent)

    // Monitor connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', handleConnectionChange)
      updateConnectionInfo()
    }

    // Start periodic connectivity checks
    startConnectivityChecks()

    // Initialize network quality monitoring
    startNetworkQualityMonitoring()

    console.log('Connectivity monitoring initialized')
  }

  const handleOnlineEvent = (): void => {
    connectivityState.isOnline = true
    connectivityState.lastOnlineTime = Date.now()
    
    updateConnectionQuality()
    
    performanceMonitoring.trackUserInteraction('connectivity_online')
    
    // Start syncing when coming back online
    if (canSync.value && pendingSyncOperations.value.length > 0) {
      startSyncProcess()
    }

    console.log('🌐 Network connection restored')
  }

  const handleOfflineEvent = (): void => {
    connectivityState.isOnline = false
    connectivityState.lastOfflineTime = Date.now()
    connectivityState.connectionQuality = 'offline'
    
    // Pause ongoing sync operations
    pauseSyncOperations()
    
    performanceMonitoring.trackUserInteraction('connectivity_offline')
    
    console.log('📴 Network connection lost - switching to offline mode')
  }

  const handleConnectionChange = (): void => {
    updateConnectionInfo()
    updateConnectionQuality()
    
    performanceMonitoring.trackUserInteraction('connectivity_change', {
      connectionType: connectivityState.connectionType,
      effectiveType: connectivityState.effectiveType,
      quality: connectivityState.connectionQuality
    })
  }

  const updateConnectionInfo = (): void => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connectivityState.connectionType = connection.type || 'unknown'
      connectivityState.effectiveType = connection.effectiveType || 'unknown'
      connectivityState.downlink = connection.downlink || 0
      connectivityState.rtt = connection.rtt || 0
      connectivityState.saveData = connection.saveData || false
    }
  }

  const updateConnectionQuality = (): void => {
    if (!connectivityState.isOnline) {
      connectivityState.connectionQuality = 'offline'
      return
    }

    const { effectiveType, downlink, rtt } = connectivityState

    if (effectiveType === '4g' && downlink > 1.5 && rtt < 150) {
      connectivityState.connectionQuality = 'excellent'
    } else if ((effectiveType === '4g' || effectiveType === '3g') && downlink > 0.5 && rtt < 300) {
      connectivityState.connectionQuality = 'good'
    } else {
      connectivityState.connectionQuality = 'poor'
    }
  }

  const startConnectivityChecks = (): void => {
    setInterval(async () => {
      try {
        const isOnline = await checkInternetConnectivity()
        if (isOnline !== connectivityState.isOnline) {
          if (isOnline) {
            handleOnlineEvent()
          } else {
            handleOfflineEvent()
          }
        }
      } catch (error) {
        console.warn('Connectivity check failed:', error)
      }
    }, 10000) // Check every 10 seconds
  }

  const checkInternetConnectivity = async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource with a timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  const startNetworkQualityMonitoring = (): void => {
    setInterval(async () => {
      if (connectivityState.isOnline) {
        await measureNetworkQuality()
      }
    }, 60000) // Measure every minute
  }

  const measureNetworkQuality = async (): Promise<void> => {
    try {
      const startTime = performance.now()
      
      // Measure latency with a small request
      await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      const latency = performance.now() - startTime
      
      // Update network quality metrics
      networkQuality.latency = latency
      networkQuality.bandwidth = connectivityState.downlink
      networkQuality.lastMeasured = Date.now()
      
      // Calculate stability and reliability based on historical data
      updateNetworkStability(latency)
      
    } catch (error) {
      networkQuality.reliability = Math.max(0, networkQuality.reliability - 10)
    }
  }

  const updateNetworkStability = (currentLatency: number): void => {
    // Simple stability calculation based on latency variance
    const previousLatency = networkQuality.latency
    if (previousLatency > 0) {
      const variance = Math.abs(currentLatency - previousLatency)
      const stability = Math.max(0, 100 - (variance / 10))
      networkQuality.stability = (networkQuality.stability * 0.8) + (stability * 0.2)
    }
    
    // Update reliability based on successful measurements
    networkQuality.reliability = Math.min(100, networkQuality.reliability + 1)
  }

  // Sync operations management
  const addSyncOperation = (
    type: SyncOperation['type'],
    dataType: SyncOperation['dataType'],
    data: any,
    priority: SyncOperation['priority'] = 'medium'
  ): string => {
    const operationId = generateSyncOperationId()
    
    const operation: SyncOperation = {
      id: operationId,
      type,
      dataType,
      priority,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data,
      retryCount: 0,
      maxRetries: 3
    }

    syncQueue.operations.push(operation)
    
    // Sort by priority
    syncQueue.operations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    performanceMonitoring.trackUserInteraction('sync_operation_added', {
      operationId,
      type,
      dataType,
      priority
    })

    // Start sync if online and not already running
    if (canSync.value && !syncQueue.isActive) {
      startSyncProcess()
    }

    return operationId
  }

  const startSyncProcess = async (): Promise<void> => {
    if (!canSync.value || syncQueue.isActive) return

    syncQueue.isActive = true
    console.log('🔄 Starting sync process...')

    try {
      while (pendingSyncOperations.value.length > 0 && canSync.value) {
        const operation = pendingSyncOperations.value[0]
        await processSyncOperation(operation)
      }
    } catch (error) {
      console.error('Sync process error:', error)
    } finally {
      syncQueue.isActive = false
      syncQueue.lastSyncTime = Date.now()
      syncQueue.nextSyncTime = Date.now() + syncQueue.syncInterval
    }

    console.log('✅ Sync process completed')
  }

  const processSyncOperation = async (operation: SyncOperation): Promise<void> => {
    operation.status = 'syncing'
    operation.updatedAt = Date.now()

    try {
      switch (operation.type) {
        case 'upload':
          await performUpload(operation)
          break
        case 'download':
          await performDownload(operation)
          break
        case 'bidirectional':
          await performBidirectionalSync(operation)
          break
      }

      operation.status = 'completed'
      operation.progress = 100

      performanceMonitoring.trackUserInteraction('sync_operation_completed', {
        operationId: operation.id,
        type: operation.type,
        dataType: operation.dataType,
        duration: Date.now() - operation.createdAt
      })

    } catch (error) {
      operation.status = 'failed'
      operation.error = error.message
      operation.retryCount++

      performanceMonitoring.trackError('sync-operation', 'medium', error)

      // Schedule retry if under limit
      if (operation.retryCount < operation.maxRetries) {
        setTimeout(() => {
          operation.status = 'pending'
          operation.updatedAt = Date.now()
        }, Math.pow(2, operation.retryCount) * 1000) // Exponential backoff
      }
    }
  }

  const performUpload = async (operation: SyncOperation): Promise<void> => {
    // Simulate upload process
    operation.progress = 25
    
    // Encrypt sensitive data before upload
    let uploadData = operation.data
    if (operation.dataType === 'user-data' || operation.dataType === 'test-results') {
      uploadData = await securityManager.encryptData(
        JSON.stringify(operation.data), 
        `upload_${operation.id}`
      )
    }

    operation.progress = 50

    // Store in secure storage as "uploaded"
    await securityManager.secureSetItem(`uploaded_${operation.id}`, {
      operationId: operation.id,
      dataType: operation.dataType,
      data: uploadData,
      timestamp: Date.now()
    })

    operation.progress = 100
  }

  const performDownload = async (operation: SyncOperation): Promise<void> => {
    // Simulate download process
    operation.progress = 25

    // Check for available data to download
    const downloadKey = `download_${operation.dataType}`
    const downloadData = await securityManager.secureGetItem(downloadKey)

    operation.progress = 50

    if (downloadData) {
      // Decrypt if necessary
      let finalData = downloadData
      if (operation.dataType === 'user-data' || operation.dataType === 'test-results') {
        try {
          finalData = JSON.parse(await securityManager.decryptData(
            downloadData, 
            `download_${operation.id}`
          ))
        } catch {
          // Data might not be encrypted
          finalData = downloadData
        }
      }

      // Store downloaded data
      operation.data = finalData
      await storeOfflineData(operation.dataType, finalData)
    }

    operation.progress = 100
  }

  const performBidirectionalSync = async (operation: SyncOperation): Promise<void> => {
    // First download to check for conflicts
    await performDownload(operation)

    // Check for conflicts
    const conflicts = await detectSyncConflicts(operation)
    if (conflicts.length > 0) {
      await handleSyncConflicts(conflicts)
    }

    // Then upload local changes
    await performUpload(operation)
  }

  const detectSyncConflicts = async (operation: SyncOperation): Promise<SyncConflict[]> => {
    const conflicts: SyncConflict[] = []
    
    // Get local data
    const localData = await getOfflineData(operation.dataType)
    const remoteData = operation.data

    if (localData && remoteData) {
      // Simple timestamp-based conflict detection
      const localTimestamp = localData.timestamp || 0
      const remoteTimestamp = remoteData.timestamp || 0

      if (localTimestamp !== remoteTimestamp) {
        conflicts.push({
          id: generateConflictId(),
          type: 'timestamp-conflict',
          localData,
          remoteData,
          resolution: 'use-local', // Default resolution
          timestamp: Date.now()
        })
      }
    }

    return conflicts
  }

  const handleSyncConflicts = async (conflicts: SyncConflict[]): Promise<void> => {
    for (const conflict of conflicts) {
      // Add to conflicts list for user review
      syncConflicts.value.push(conflict)

      // Auto-resolve based on strategy
      switch (conflict.resolution) {
        case 'use-local':
          conflict.resolvedData = conflict.localData
          break
        case 'use-remote':
          conflict.resolvedData = conflict.remoteData
          break
        case 'merge':
          conflict.resolvedData = await mergeConflictData(conflict.localData, conflict.remoteData)
          break
        default:
          // Manual resolution required
          continue
      }

      // Apply resolution
      await storeOfflineData('resolved-conflict', conflict.resolvedData)
    }
  }

  const mergeConflictData = async (localData: any, remoteData: any): Promise<any> => {
    // Simple merge strategy - combine properties
    return {
      ...remoteData,
      ...localData,
      mergedAt: Date.now()
    }
  }

  // Offline data management
  const storeOfflineData = async (dataType: string, data: any): Promise<void> => {
    await securityManager.secureSetItem(`offline_${dataType}`, {
      data,
      timestamp: Date.now(),
      type: dataType
    })

    // Update offline storage cache
    switch (dataType) {
      case 'test-results':
        offlineStorage.testSessions.push(data)
        break
      case 'extracted-questions':
        offlineStorage.extractedContent.push(data)
        break
      case 'performance-metrics':
        offlineStorage.performanceData.push(data)
        break
      default:
        offlineStorage.cachedData.set(dataType, data)
    }
  }

  const getOfflineData = async (dataType: string): Promise<any> => {
    try {
      const stored = await securityManager.secureGetItem(`offline_${dataType}`)
      return stored?.data || null
    } catch {
      return null
    }
  }

  const clearOfflineData = async (dataType?: string): Promise<void> => {
    if (dataType) {
      await securityManager.secureRemoveItem(`offline_${dataType}`)
      offlineStorage.cachedData.delete(dataType)
    } else {
      // Clear all offline data
      const keysToRemove = [
        'test-results',
        'extracted-questions', 
        'performance-metrics',
        'user-data'
      ]

      for (const key of keysToRemove) {
        await securityManager.secureRemoveItem(`offline_${key}`)
      }

      offlineStorage.cachedData.clear()
      offlineStorage.testSessions = []
      offlineStorage.extractedContent = []
      offlineStorage.performanceData = []
    }

    performanceMonitoring.trackUserInteraction('offline_data_cleared', { dataType })
  }

  // Sync queue management
  const pauseSyncOperations = (): void => {
    syncQueue.isPaused = true
    performanceMonitoring.trackUserInteraction('sync_paused')
  }

  const resumeSyncOperations = (): void => {
    syncQueue.isPaused = false
    performanceMonitoring.trackUserInteraction('sync_resumed')
    
    if (canSync.value && pendingSyncOperations.value.length > 0) {
      startSyncProcess()
    }
  }

  const cancelSyncOperation = (operationId: string): boolean => {
    const operation = syncQueue.operations.find(op => op.id === operationId)
    if (!operation || operation.status === 'completed') return false

    operation.status = 'cancelled'
    operation.updatedAt = Date.now()

    performanceMonitoring.trackUserInteraction('sync_operation_cancelled', { operationId })
    return true
  }

  const retrySyncOperation = (operationId: string): boolean => {
    const operation = syncQueue.operations.find(op => op.id === operationId)
    if (!operation || operation.status !== 'failed') return false

    operation.status = 'pending'
    operation.retryCount = 0
    operation.error = undefined
    operation.updatedAt = Date.now()

    if (canSync.value && !syncQueue.isActive) {
      startSyncProcess()
    }

    performanceMonitoring.trackUserInteraction('sync_operation_retried', { operationId })
    return true
  }

  const clearCompletedOperations = (): void => {
    const completedCount = syncQueue.operations.filter(op => op.status === 'completed').length
    syncQueue.operations = syncQueue.operations.filter(op => op.status !== 'completed')
    
    performanceMonitoring.trackUserInteraction('sync_operations_cleared', { count: completedCount })
  }

  // Utility functions
  const generateSyncOperationId = (): string => {
    return 'sync_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }

  const generateConflictId = (): string => {
    return 'conflict_' + Math.random().toString(36).substr(2, 9)
  }

  const isOfflineModeCapable = (feature: keyof OfflineCapabilities): boolean => {
    return offlineCapabilities[feature]
  }

  const getOfflineStorageUsage = async (): Promise<{used: number, available: number}> => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        }
      } catch {
        return { used: 0, available: 0 }
      }
    }
    return { used: 0, available: 0 }
  }

  // Initialize the system
  const initialize = (): void => {
    initializeConnectivityMonitoring()
    
    // Load offline data
    loadOfflineStorageState()
    
    // Start automatic sync if online
    if (canSync.value) {
      syncQueue.nextSyncTime = Date.now() + syncQueue.syncInterval
      setTimeout(startSyncProcess, 1000)
    }
  }

  const loadOfflineStorageState = async (): Promise<void> => {
    try {
      const storedState = await securityManager.secureGetItem('offline_storage_state')
      if (storedState) {
        Object.assign(offlineStorage, storedState)
      }
    } catch (error) {
      console.warn('Failed to load offline storage state:', error)
    }
  }

  const saveOfflineStorageState = async (): Promise<void> => {
    try {
      await securityManager.secureSetItem('offline_storage_state', {
        ...offlineStorage,
        cachedData: Array.from(offlineStorage.cachedData.entries())
      })
    } catch (error) {
      console.warn('Failed to save offline storage state:', error)
    }
  }

  // Watch for changes to save state
  watch(() => offlineStorage, saveOfflineStorageState, { deep: true })

  return {
    // State
    connectivityState: readonly(connectivityState),
    offlineCapabilities: readonly(offlineCapabilities),
    syncQueue: readonly(syncQueue),
    offlineStorage: readonly(offlineStorage),
    syncConflicts: readonly(syncConflicts),
    networkQuality: readonly(networkQuality),

    // Computed
    operationalMode,
    canSync,
    pendingSyncOperations,
    activeSyncOperations,
    failedSyncOperations,
    syncProgress,

    // Connectivity
    initializeConnectivityMonitoring,
    checkInternetConnectivity,
    measureNetworkQuality,

    // Sync operations
    addSyncOperation,
    startSyncProcess,
    pauseSyncOperations,
    resumeSyncOperations,
    cancelSyncOperation,
    retrySyncOperation,
    clearCompletedOperations,

    // Offline data
    storeOfflineData,
    getOfflineData,
    clearOfflineData,
    getOfflineStorageUsage,

    // Conflict resolution
    handleSyncConflicts,

    // Utilities
    isOfflineModeCapable,
    initialize
  }
}