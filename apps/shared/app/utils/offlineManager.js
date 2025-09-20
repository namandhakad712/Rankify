/**
 * Offline Manager for Complete Privacy Mode
 * Enables full offline functionality for PDF extraction and processing
 */

export class OfflineManager {
  constructor() {
    this.isOfflineMode = false
    this.offlineCapabilities = this.initializeOfflineCapabilities()
    this.offlineStorage = new Map()
    this.syncQueue = []
    this.networkStatus = navigator.onLine
    this.offlineWorkers = new Map()
    this.cacheManager = null
    this.isInitialized = false
  }

  /**
   * Initialize offline capabilities
   */
  initializeOfflineCapabilities() {
    return {
      pdfProcessing: {
        available: true,
        dependencies: ['pdf-lib', 'pdf-parse'],
        fallbackMethods: ['canvas-based', 'text-extraction']
      },
      aiExtraction: {
        available: false, // Requires local AI models
        dependencies: ['tensorflow.js', 'local-models'],
        fallbackMethods: ['rule-based-extraction', 'template-matching']
      },
      dataStorage: {
        available: true,
        methods: ['indexeddb', 'localstorage', 'memory'],
        encryption: true
      },
      userInterface: {
        available: true,
        cached: true,
        serviceWorker: true
      }
    }
  }

  /**
   * Initialize offline manager
   */
  async initialize(options = {}) {
    try {
      // Check browser capabilities
      await this.checkBrowserCapabilities()
      
      // Initialize service worker
      await this.initializeServiceWorker()
      
      // Setup offline storage
      await this.initializeOfflineStorage()
      
      // Setup network monitoring
      this.setupNetworkMonitoring()
      
      // Initialize cache manager
      await this.initializeCacheManager()
      
      // Setup offline workers
      await this.setupOfflineWorkers()
      
      this.isInitialized = true
      this.logOfflineEvent('OFFLINE_MANAGER_INITIALIZED')
      
      return true
    } catch (error) {
      console.error('Failed to initialize OfflineManager:', error)
      return false
    }
  }

  /**
   * Check browser capabilities for offline mode
   */
  async checkBrowserCapabilities() {
    const capabilities = {
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window,
      webWorkers: 'Worker' in window,
      webAssembly: 'WebAssembly' in window,
      fileAPI: 'File' in window && 'FileReader' in window,
      cryptoAPI: 'crypto' in window && 'subtle' in window.crypto
    }

    const missing = Object.entries(capabilities)
      .filter(([key, available]) => !available)
      .map(([key]) => key)

    if (missing.length > 0) {
      console.warn('Missing browser capabilities for full offline mode:', missing)
    }

    return capabilities
  }

  /**
   * Initialize service worker for offline caching
   */
  async initializeServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.register('/offline-sw.js', {
        scope: '/'
      })

      registration.addEventListener('updatefound', () => {
        this.logOfflineEvent('SERVICE_WORKER_UPDATE_FOUND')
      })

      await navigator.serviceWorker.ready
      this.logOfflineEvent('SERVICE_WORKER_READY')
      
      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  /**
   * Initialize offline storage
   */
  async initializeOfflineStorage() {
    if (!window.indexedDB) {
      console.warn('IndexedDB not available, using fallback storage')
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineStorage', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.offlineDB = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create object stores
        if (!db.objectStoreNames.contains('pdf_files')) {
          const pdfStore = db.createObjectStore('pdf_files', { keyPath: 'id' })
          pdfStore.createIndex('timestamp', 'timestamp', { unique: false })
          pdfStore.createIndex('size', 'size', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('extracted_data')) {
          const dataStore = db.createObjectStore('extracted_data', { keyPath: 'id' })
          dataStore.createIndex('pdfId', 'pdfId', { unique: false })
          dataStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('processing_cache')) {
          const cacheStore = db.createObjectStore('processing_cache', { keyPath: 'key' })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
          cacheStore.createIndex('type', 'type', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true })
          queueStore.createIndex('timestamp', 'timestamp', { unique: false })
          queueStore.createIndex('priority', 'priority', { unique: false })
        }
      }
    })
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    const updateNetworkStatus = () => {
      const wasOnline = this.networkStatus
      this.networkStatus = navigator.onLine
      
      if (wasOnline !== this.networkStatus) {
        this.handleNetworkChange(this.networkStatus)
      }
    }

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
    
    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Handle network status changes
   */
  handleNetworkChange(isOnline) {
    if (isOnline) {
      this.logOfflineEvent('NETWORK_ONLINE')
      this.processSyncQueue()
    } else {
      this.logOfflineEvent('NETWORK_OFFLINE')
      if (!this.isOfflineMode) {
        this.enableOfflineMode()
      }
    }
  }

  /**
   * Check connectivity with actual network request
   */
  async checkConnectivity() {
    try {
      const response = await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      })
      
      const isConnected = response.ok
      if (isConnected !== this.networkStatus) {
        this.networkStatus = isConnected
        this.handleNetworkChange(isConnected)
      }
    } catch (error) {
      if (this.networkStatus) {
        this.networkStatus = false
        this.handleNetworkChange(false)
      }
    }
  }

  /**
   * Initialize cache manager
   */
  async initializeCacheManager() {
    if (!('caches' in window)) {
      console.warn('Cache API not available')
      return
    }

    this.cacheManager = {
      staticCache: await caches.open('static-v1'),
      dynamicCache: await caches.open('dynamic-v1'),
      pdfCache: await caches.open('pdf-cache-v1')
    }

    // Pre-cache essential resources
    await this.preCacheEssentialResources()
  }

  /**
   * Pre-cache essential resources
   */
  async preCacheEssentialResources() {
    const essentialResources = [
      '/',
      '/offline.html',
      '/css/app.css',
      '/js/app.js',
      '/js/pdf-worker.js',
      '/js/extraction-worker.js'
    ]

    try {
      await this.cacheManager.staticCache.addAll(essentialResources)
      this.logOfflineEvent('ESSENTIAL_RESOURCES_CACHED')
    } catch (error) {
      console.error('Failed to cache essential resources:', error)
    }
  }

  /**
   * Setup offline workers
   */
  async setupOfflineWorkers() {
    if (!('Worker' in window)) {
      console.warn('Web Workers not supported')
      return
    }

    try {
      // PDF processing worker
      this.offlineWorkers.set('pdf', new Worker('/js/pdf-worker.js'))
      
      // Text extraction worker
      this.offlineWorkers.set('extraction', new Worker('/js/extraction-worker.js'))
      
      // Setup worker message handlers
      this.setupWorkerHandlers()
      
      this.logOfflineEvent('OFFLINE_WORKERS_INITIALIZED')
    } catch (error) {
      console.error('Failed to setup offline workers:', error)
    }
  }

  /**
   * Setup worker message handlers
   */
  setupWorkerHandlers() {
    this.offlineWorkers.forEach((worker, type) => {
      worker.onmessage = (event) => {
        this.handleWorkerMessage(type, event.data)
      }
      
      worker.onerror = (error) => {
        console.error(`Worker error (${type}):`, error)
        this.logOfflineEvent('WORKER_ERROR', { type, error: error.message })
      }
    })
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(workerType, data) {
    const { taskId, result, error } = data
    
    if (error) {
      this.logOfflineEvent('WORKER_TASK_ERROR', { workerType, taskId, error })
      return
    }

    // Process worker result
    this.processWorkerResult(workerType, taskId, result)
  }

  /**
   * Process worker result
   */
  async processWorkerResult(workerType, taskId, result) {
    try {
      // Store result in offline storage
      await this.storeProcessingResult(taskId, result)
      
      // Notify completion
      this.notifyTaskCompletion(taskId, result)
      
      this.logOfflineEvent('WORKER_TASK_COMPLETED', { workerType, taskId })
    } catch (error) {
      console.error('Failed to process worker result:', error)
    }
  }

  /**
   * Enable offline mode
   */
  async enableOfflineMode() {
    this.isOfflineMode = true
    
    // Switch to offline-capable components
    await this.switchToOfflineComponents()
    
    // Disable network-dependent features
    this.disableNetworkFeatures()
    
    // Show offline indicator
    this.showOfflineIndicator()
    
    this.logOfflineEvent('OFFLINE_MODE_ENABLED')
  }

  /**
   * Disable offline mode
   */
  async disableOfflineMode() {
    this.isOfflineMode = false
    
    // Re-enable network features
    this.enableNetworkFeatures()
    
    // Hide offline indicator
    this.hideOfflineIndicator()
    
    // Process sync queue
    await this.processSyncQueue()
    
    this.logOfflineEvent('OFFLINE_MODE_DISABLED')
  }

  /**
   * Switch to offline-capable components
   */
  async switchToOfflineComponents() {
    // Replace AI extraction with rule-based extraction
    await this.loadRuleBasedExtraction()
    
    // Use local PDF processing
    await this.initializeLocalPDFProcessing()
    
    // Switch to offline UI components
    this.switchToOfflineUI()
  }

  /**
   * Load rule-based extraction for offline mode
   */
  async loadRuleBasedExtraction() {
    // This would load a rule-based extraction system
    // that doesn't require AI models
    this.ruleBasedExtractor = {
      extractQuestions: this.extractQuestionsOffline.bind(this),
      detectQuestionTypes: this.detectQuestionTypesOffline.bind(this),
      parseOptions: this.parseOptionsOffline.bind(this)
    }
  }

  /**
   * Initialize local PDF processing
   */
  async initializeLocalPDFProcessing() {
    // Load PDF processing libraries for offline use
    if (!this.localPDFProcessor) {
      this.localPDFProcessor = {
        parseText: this.parseTextOffline.bind(this),
        extractImages: this.extractImagesOffline.bind(this),
        getMetadata: this.getMetadataOffline.bind(this)
      }
    }
  }

  /**
   * Process PDF file in offline mode
   * @param {File} pdfFile - PDF file to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processPDFOffline(pdfFile, options = {}) {
    if (!this.isInitialized) {
      throw new Error('OfflineManager not initialized')
    }

    const processingId = this.generateProcessingId()
    
    try {
      // Store PDF file for offline access
      await this.storePDFFile(processingId, pdfFile)
      
      // Extract text using offline methods
      const textContent = await this.extractTextOffline(pdfFile)
      
      // Process questions using rule-based extraction
      const questions = await this.extractQuestionsOffline(textContent, options)
      
      // Store results
      const result = {
        id: processingId,
        pdfFile: {
          name: pdfFile.name,
          size: pdfFile.size,
          type: pdfFile.type
        },
        extractedText: textContent,
        questions: questions,
        processingTime: Date.now(),
        offlineMode: true,
        method: 'rule-based'
      }

      await this.storeExtractionResult(processingId, result)
      
      this.logOfflineEvent('PDF_PROCESSED_OFFLINE', { processingId, questionCount: questions.length })
      
      return result
    } catch (error) {
      this.logOfflineEvent('PDF_PROCESSING_ERROR', { processingId, error: error.message })
      throw error
    }
  }

  /**
   * Extract text from PDF offline
   */
  async extractTextOffline(pdfFile) {
    return new Promise((resolve, reject) => {
      const worker = this.offlineWorkers.get('pdf')
      if (!worker) {
        reject(new Error('PDF worker not available'))
        return
      }

      const taskId = this.generateTaskId()
      
      // Setup one-time message handler
      const handleMessage = (event) => {
        if (event.data.taskId === taskId) {
          worker.removeEventListener('message', handleMessage)
          if (event.data.error) {
            reject(new Error(event.data.error))
          } else {
            resolve(event.data.result)
          }
        }
      }
      
      worker.addEventListener('message', handleMessage)
      
      // Send task to worker
      worker.postMessage({
        taskId: taskId,
        type: 'extractText',
        file: pdfFile
      })
    })
  }

  /**
   * Extract questions using rule-based approach
   */
  async extractQuestionsOffline(textContent, options = {}) {
    const questions = []
    
    // Simple rule-based question detection
    const questionPatterns = [
      /^\s*\d+[\.)]\s*(.+?)(?=^\s*\d+[\.)]|\n\s*[A-D][\.)]\s*|$)/gms,
      /^Q\d*[\.):]?\s*(.+?)(?=^Q\d*[\.):]?|\n\s*[A-D][\.)]\s*|$)/gims
    ]

    for (const pattern of questionPatterns) {
      const matches = textContent.match(pattern)
      if (matches) {
        matches.forEach((match, index) => {
          const question = this.parseQuestionOffline(match, index)
          if (question) {
            questions.push(question)
          }
        })
        break // Use first successful pattern
      }
    }

    return questions
  }

  /**
   * Parse individual question offline
   */
  parseQuestionOffline(questionText, index) {
    const lines = questionText.trim().split('\n')
    const questionLine = lines[0].replace(/^\s*\d+[\.)]\s*/, '').trim()
    
    if (questionLine.length < 10) {
      return null // Too short to be a valid question
    }

    // Extract options
    const options = []
    const optionPattern = /^\s*[A-D][\.)]\s*(.+)/
    
    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(optionPattern)
      if (match) {
        options.push(match[1].trim())
      }
    }

    // Determine question type
    let queType = 'nat' // Default to numerical
    if (options.length >= 2) {
      queType = 'mcq'
      if (questionText.toLowerCase().includes('select all') || 
          questionText.toLowerCase().includes('choose all')) {
        queType = 'msq'
      }
    }

    return {
      queId: `offline_q_${index + 1}`,
      queText: questionLine,
      queType: queType,
      options: options.length > 0 ? options : undefined,
      confidence: 2.5, // Medium confidence for rule-based extraction
      extractionMethod: 'rule-based',
      pageNumber: 1,
      subject: options.subject || 'General'
    }
  }

  /**
   * Store PDF file in offline storage
   */
  async storePDFFile(id, pdfFile) {
    if (!this.offlineDB) {
      throw new Error('Offline storage not available')
    }

    const fileData = {
      id: id,
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type,
      data: await this.fileToArrayBuffer(pdfFile),
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['pdf_files'], 'readwrite')
      const store = transaction.objectStore('pdf_files')
      
      const request = store.put(fileData)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Store extraction result
   */
  async storeExtractionResult(id, result) {
    if (!this.offlineDB) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['extracted_data'], 'readwrite')
      const store = transaction.objectStore('extracted_data')
      
      const request = store.put({
        id: id,
        pdfId: id,
        result: result,
        timestamp: Date.now()
      })
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get stored extraction results
   */
  async getStoredResults() {
    if (!this.offlineDB) {
      return []
    }

    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['extracted_data'], 'readonly')
      const store = transaction.objectStore('extracted_data')
      
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item) {
    if (!this.offlineDB) {
      this.syncQueue.push(item)
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      
      const request = store.add({
        ...item,
        timestamp: Date.now(),
        priority: item.priority || 1
      })
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Process sync queue when online
   */
  async processSyncQueue() {
    if (!this.networkStatus) {
      return
    }

    // Get items from database
    const queueItems = await this.getSyncQueueItems()
    
    for (const item of queueItems) {
      try {
        await this.syncItem(item)
        await this.removeSyncQueueItem(item.id)
        this.logOfflineEvent('SYNC_ITEM_PROCESSED', { itemId: item.id })
      } catch (error) {
        console.error('Failed to sync item:', error)
        this.logOfflineEvent('SYNC_ITEM_ERROR', { itemId: item.id, error: error.message })
      }
    }
  }

  /**
   * Get sync queue items
   */
  async getSyncQueueItems() {
    if (!this.offlineDB) {
      return this.syncQueue
    }

    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['offline_queue'], 'readonly')
      const store = transaction.objectStore('offline_queue')
      
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Sync individual item
   */
  async syncItem(item) {
    // This would sync the item with the server
    // For now, just simulate the sync
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * Remove item from sync queue
   */
  async removeSyncQueueItem(itemId) {
    if (!this.offlineDB) {
      this.syncQueue = this.syncQueue.filter(item => item.id !== itemId)
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.offlineDB.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      
      const request = store.delete(itemId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Utility methods
   */
  generateProcessingId() {
    return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  logOfflineEvent(event, data = {}) {
    console.log(`[OfflineManager] ${event}:`, data)
  }

  // UI methods (placeholders)
  disableNetworkFeatures() { /* Implementation */ }
  enableNetworkFeatures() { /* Implementation */ }
  showOfflineIndicator() { /* Implementation */ }
  hideOfflineIndicator() { /* Implementation */ }
  switchToOfflineUI() { /* Implementation */ }
  notifyTaskCompletion(taskId, result) { /* Implementation */ }
  storeProcessingResult(taskId, result) { /* Implementation */ }
  
  // Offline processing methods (placeholders)
  detectQuestionTypesOffline(text) { return 'mcq' }
  parseOptionsOffline(text) { return [] }
  parseTextOffline(file) { return '' }
  extractImagesOffline(file) { return [] }
  getMetadataOffline(file) { return {} }
}

/**
 * Singleton instance
 */
let offlineManagerInstance = null

/**
 * Get offline manager instance
 */
export function getOfflineManager() {
  if (!offlineManagerInstance) {
    offlineManagerInstance = new OfflineManager()
  }
  return offlineManagerInstance
}

/**
 * Initialize offline capabilities
 */
export async function initializeOfflineMode(options = {}) {
  const manager = getOfflineManager()
  return await manager.initialize(options)
}

export default OfflineManager