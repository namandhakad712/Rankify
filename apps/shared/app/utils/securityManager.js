/**
 * Security Manager for Client-Side Privacy and Security
 * Handles secure API key management, data encryption, and privacy controls
 */

export class SecurityManager {
  constructor() {
    this.encryptionKey = null
    this.apiKeys = new Map()
    this.securityPolicies = this.initializeSecurityPolicies()
    this.privacySettings = this.initializePrivacySettings()
    this.auditLog = []
    this.isInitialized = false
  }

  /**
   * Initialize security policies
   */
  initializeSecurityPolicies() {
    return {
      encryption: {
        algorithm: 'AES-GCM',
        keyLength: 256,
        ivLength: 12,
        tagLength: 16
      },
      apiKeys: {
        storage: 'memory', // 'memory', 'encrypted-storage', 'session'
        rotation: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        autoExpire: true
      },
      dataRetention: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoCleanup: true,
        userControlled: true
      },
      privacy: {
        offlineMode: true,
        dataMinimization: true,
        consentRequired: true,
        auditTrail: true
      }
    }
  }

  /**
   * Initialize privacy settings
   */
  initializePrivacySettings() {
    return {
      dataCollection: {
        extractedText: true,
        processingMetrics: false,
        errorLogs: false,
        userInteractions: false
      },
      dataSharing: {
        analytics: false,
        improvement: false,
        thirdParty: false
      },
      storage: {
        local: true,
        cloud: false,
        persistent: false
      },
      processing: {
        clientSideOnly: true,
        offlineCapable: true,
        encryptInTransit: true,
        encryptAtRest: true
      }
    }
  }

  /**
   * Initialize security manager
   * @param {Object} options - Initialization options
   * @returns {Promise<boolean>} Success status
   */
  async initialize(options = {}) {
    try {
      // Generate or load encryption key
      await this.initializeEncryption(options.encryptionKey)
      
      // Setup secure storage
      await this.initializeSecureStorage()
      
      // Load privacy preferences
      await this.loadPrivacyPreferences()
      
      // Initialize audit logging
      this.initializeAuditLogging()
      
      this.isInitialized = true
      this.logSecurityEvent('SECURITY_MANAGER_INITIALIZED', { timestamp: new Date().toISOString() })
      
      return true
    } catch (error) {
      console.error('Failed to initialize SecurityManager:', error)
      return false
    }
  }

  /**
   * Initialize encryption system
   */
  async initializeEncryption(providedKey = null) {
    if (providedKey) {
      this.encryptionKey = await this.importKey(providedKey)
    } else {
      // Generate new encryption key
      this.encryptionKey = await this.generateEncryptionKey()
    }
    
    // Test encryption/decryption
    const testData = 'security-test'
    const encrypted = await this.encrypt(testData)
    const decrypted = await this.decrypt(encrypted)
    
    if (decrypted !== testData) {
      throw new Error('Encryption system validation failed')
    }
  }

  /**
   * Generate encryption key
   */
  async generateEncryptionKey() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not available')
    }

    return await window.crypto.subtle.generateKey(
      {
        name: this.securityPolicies.encryption.algorithm,
        length: this.securityPolicies.encryption.keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Import encryption key
   */
  async importKey(keyData) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not available')
    }

    return await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.securityPolicies.encryption.algorithm },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @returns {Promise<Object>} Encrypted data with IV
   */
  async encrypt(data) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized')
    }

    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    
    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(this.securityPolicies.encryption.ivLength))
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: this.securityPolicies.encryption.algorithm,
        iv: iv
      },
      this.encryptionKey,
      dataBuffer
    )

    return {
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      algorithm: this.securityPolicies.encryption.algorithm,
      timestamp: Date.now()
    }
  }

  /**
   * Decrypt data
   * @param {Object} encryptedData - Encrypted data object
   * @returns {Promise<string>} Decrypted data
   */
  async decrypt(encryptedData) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized')
    }

    const dataArray = new Uint8Array(encryptedData.data)
    const ivArray = new Uint8Array(encryptedData.iv)

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: encryptedData.algorithm || this.securityPolicies.encryption.algorithm,
        iv: ivArray
      },
      this.encryptionKey,
      dataArray
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  /**
   * Secure API key management
   */
  async storeAPIKey(service, apiKey, options = {}) {
    if (!this.isInitialized) {
      throw new Error('SecurityManager not initialized')
    }

    const keyData = {
      key: apiKey,
      service: service,
      createdAt: Date.now(),
      expiresAt: options.expiresAt || (Date.now() + this.securityPolicies.apiKeys.maxAge),
      permissions: options.permissions || [],
      metadata: options.metadata || {}
    }

    // Encrypt the API key
    const encryptedKey = await this.encrypt(JSON.stringify(keyData))
    
    // Store based on policy
    switch (this.securityPolicies.apiKeys.storage) {
      case 'memory':
        this.apiKeys.set(service, encryptedKey)
        break
      case 'session':
        sessionStorage.setItem(`sec_key_${service}`, JSON.stringify(encryptedKey))
        break
      case 'encrypted-storage':
        await this.storeInSecureStorage(`api_key_${service}`, encryptedKey)
        break
    }

    this.logSecurityEvent('API_KEY_STORED', { service, timestamp: Date.now() })
    
    // Setup auto-expiration if enabled
    if (this.securityPolicies.apiKeys.autoExpire) {
      setTimeout(() => {
        this.removeAPIKey(service)
      }, keyData.expiresAt - Date.now())
    }
  }

  /**
   * Retrieve API key
   */
  async getAPIKey(service) {
    if (!this.isInitialized) {
      throw new Error('SecurityManager not initialized')
    }

    let encryptedKey = null

    // Retrieve based on storage policy
    switch (this.securityPolicies.apiKeys.storage) {
      case 'memory':
        encryptedKey = this.apiKeys.get(service)
        break
      case 'session':
        const sessionData = sessionStorage.getItem(`sec_key_${service}`)
        encryptedKey = sessionData ? JSON.parse(sessionData) : null
        break
      case 'encrypted-storage':
        encryptedKey = await this.getFromSecureStorage(`api_key_${service}`)
        break
    }

    if (!encryptedKey) {
      return null
    }

    // Decrypt and validate
    const decryptedData = await this.decrypt(encryptedKey)
    const keyData = JSON.parse(decryptedData)

    // Check expiration
    if (keyData.expiresAt && Date.now() > keyData.expiresAt) {
      await this.removeAPIKey(service)
      this.logSecurityEvent('API_KEY_EXPIRED', { service, timestamp: Date.now() })
      return null
    }

    this.logSecurityEvent('API_KEY_ACCESSED', { service, timestamp: Date.now() })
    return keyData.key
  }

  /**
   * Remove API key
   */
  async removeAPIKey(service) {
    switch (this.securityPolicies.apiKeys.storage) {
      case 'memory':
        this.apiKeys.delete(service)
        break
      case 'session':
        sessionStorage.removeItem(`sec_key_${service}`)
        break
      case 'encrypted-storage':
        await this.removeFromSecureStorage(`api_key_${service}`)
        break
    }

    this.logSecurityEvent('API_KEY_REMOVED', { service, timestamp: Date.now() })
  }

  /**
   * Initialize secure storage
   */
  async initializeSecureStorage() {
    // Check for IndexedDB support
    if (!window.indexedDB) {
      console.warn('IndexedDB not available, falling back to memory storage')
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SecureStorage', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.secureDB = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create object stores
        if (!db.objectStoreNames.contains('encrypted_data')) {
          const store = db.createObjectStore('encrypted_data', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('audit_log')) {
          const auditStore = db.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true })
          auditStore.createIndex('timestamp', 'timestamp', { unique: false })
          auditStore.createIndex('event', 'event', { unique: false })
        }
      }
    })
  }

  /**
   * Store data in secure storage
   */
  async storeInSecureStorage(key, data) {
    if (!this.secureDB) {
      throw new Error('Secure storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.secureDB.transaction(['encrypted_data'], 'readwrite')
      const store = transaction.objectStore('encrypted_data')
      
      const request = store.put({
        id: key,
        data: data,
        timestamp: Date.now()
      })
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get data from secure storage
   */
  async getFromSecureStorage(key) {
    if (!this.secureDB) {
      return null
    }

    return new Promise((resolve, reject) => {
      const transaction = this.secureDB.transaction(['encrypted_data'], 'readonly')
      const store = transaction.objectStore('encrypted_data')
      
      const request = store.get(key)
      
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.data : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove data from secure storage
   */
  async removeFromSecureStorage(key) {
    if (!this.secureDB) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.secureDB.transaction(['encrypted_data'], 'readwrite')
      const store = transaction.objectStore('encrypted_data')
      
      const request = store.delete(key)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Encrypt and store sensitive test data
   */
  async storeTestData(testId, testData, options = {}) {
    if (!this.privacySettings.storage.local) {
      throw new Error('Local storage disabled by privacy settings')
    }

    const dataToStore = {
      testId: testId,
      data: testData,
      timestamp: Date.now(),
      expiresAt: options.expiresAt || (Date.now() + this.securityPolicies.dataRetention.maxAge),
      metadata: options.metadata || {}
    }

    // Apply data minimization
    if (this.privacySettings.processing.clientSideOnly) {
      dataToStore.data = this.minimizeData(testData)
    }

    const encryptedData = await this.encrypt(JSON.stringify(dataToStore))
    await this.storeInSecureStorage(`test_data_${testId}`, encryptedData)

    this.logSecurityEvent('TEST_DATA_STORED', { testId, timestamp: Date.now() })

    // Setup auto-cleanup
    if (this.securityPolicies.dataRetention.autoCleanup) {
      setTimeout(() => {
        this.removeTestData(testId)
      }, dataToStore.expiresAt - Date.now())
    }
  }

  /**
   * Retrieve and decrypt test data
   */
  async getTestData(testId) {
    const encryptedData = await this.getFromSecureStorage(`test_data_${testId}`)
    
    if (!encryptedData) {
      return null
    }

    const decryptedData = await this.decrypt(encryptedData)
    const testData = JSON.parse(decryptedData)

    // Check expiration
    if (testData.expiresAt && Date.now() > testData.expiresAt) {
      await this.removeTestData(testId)
      this.logSecurityEvent('TEST_DATA_EXPIRED', { testId, timestamp: Date.now() })
      return null
    }

    this.logSecurityEvent('TEST_DATA_ACCESSED', { testId, timestamp: Date.now() })
    return testData.data
  }

  /**
   * Remove test data
   */
  async removeTestData(testId) {
    await this.removeFromSecureStorage(`test_data_${testId}`)
    this.logSecurityEvent('TEST_DATA_REMOVED', { testId, timestamp: Date.now() })
  }

  /**
   * Data minimization - remove unnecessary data
   */
  minimizeData(data) {
    if (!this.privacySettings.dataCollection.processingMetrics) {
      // Remove processing metrics
      const minimized = { ...data }
      delete minimized.processingTime
      delete minimized.extractionMetadata
      delete minimized.confidence
      return minimized
    }
    return data
  }

  /**
   * Content sanitization
   */
  sanitizeContent(content) {
    if (typeof content !== 'string') {
      return content
    }

    // Remove potential XSS vectors
    const sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')

    // Remove potential data leakage patterns
    const patterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email addresses
    ]

    let cleaned = sanitized
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '[REDACTED]')
    })

    return cleaned
  }

  /**
   * Initialize audit logging
   */
  initializeAuditLogging() {
    if (!this.securityPolicies.privacy.auditTrail) {
      return
    }

    // Setup periodic audit log cleanup
    setInterval(() => {
      this.cleanupAuditLog()
    }, 60 * 60 * 1000) // Every hour
  }

  /**
   * Log security events
   */
  logSecurityEvent(event, data = {}) {
    if (!this.securityPolicies.privacy.auditTrail) {
      return
    }

    const logEntry = {
      event: event,
      timestamp: Date.now(),
      data: data,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    this.auditLog.push(logEntry)

    // Store in secure storage if available
    if (this.secureDB) {
      this.storeAuditLogEntry(logEntry)
    }

    // Limit in-memory log size
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500)
    }
  }

  /**
   * Store audit log entry
   */
  async storeAuditLogEntry(entry) {
    if (!this.secureDB) {
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.secureDB.transaction(['audit_log'], 'readwrite')
      const store = transaction.objectStore('audit_log')
      
      const request = store.add(entry)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Cleanup old audit log entries
   */
  async cleanupAuditLog() {
    const cutoffTime = Date.now() - this.securityPolicies.dataRetention.maxAge

    // Clean in-memory log
    this.auditLog = this.auditLog.filter(entry => entry.timestamp > cutoffTime)

    // Clean stored log
    if (this.secureDB) {
      const transaction = this.secureDB.transaction(['audit_log'], 'readwrite')
      const store = transaction.objectStore('audit_log')
      const index = store.index('timestamp')
      
      const range = IDBKeyRange.upperBound(cutoffTime)
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
    }
  }

  /**
   * Load privacy preferences
   */
  async loadPrivacyPreferences() {
    try {
      const stored = localStorage.getItem('privacy_preferences')
      if (stored) {
        const preferences = JSON.parse(stored)
        this.privacySettings = { ...this.privacySettings, ...preferences }
      }
    } catch (error) {
      console.warn('Failed to load privacy preferences:', error)
    }
  }

  /**
   * Update privacy preferences
   */
  async updatePrivacyPreferences(preferences) {
    this.privacySettings = { ...this.privacySettings, ...preferences }
    
    try {
      localStorage.setItem('privacy_preferences', JSON.stringify(this.privacySettings))
      this.logSecurityEvent('PRIVACY_PREFERENCES_UPDATED', { timestamp: Date.now() })
    } catch (error) {
      console.error('Failed to save privacy preferences:', error)
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData() {
    // Clear API keys
    this.apiKeys.clear()
    
    // Clear session storage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sec_key_')) {
        sessionStorage.removeItem(key)
      }
    })

    // Clear secure storage
    if (this.secureDB) {
      const transaction = this.secureDB.transaction(['encrypted_data', 'audit_log'], 'readwrite')
      
      transaction.objectStore('encrypted_data').clear()
      transaction.objectStore('audit_log').clear()
    }

    // Clear audit log
    this.auditLog = []

    this.logSecurityEvent('ALL_DATA_CLEARED', { timestamp: Date.now() })
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      initialized: this.isInitialized,
      encryptionEnabled: !!this.encryptionKey,
      secureStorageAvailable: !!this.secureDB,
      apiKeysStored: this.apiKeys.size,
      auditLogEntries: this.auditLog.length,
      privacySettings: this.privacySettings,
      securityPolicies: this.securityPolicies
    }
  }

  /**
   * Export audit log
   */
  exportAuditLog() {
    return {
      entries: this.auditLog,
      exportTime: Date.now(),
      totalEntries: this.auditLog.length
    }
  }

  /**
   * Validate security configuration
   */
  validateSecurityConfiguration() {
    const issues = []

    if (!window.crypto || !window.crypto.subtle) {
      issues.push('Web Crypto API not available - encryption disabled')
    }

    if (!window.indexedDB) {
      issues.push('IndexedDB not available - secure storage limited')
    }

    if (!this.encryptionKey) {
      issues.push('Encryption key not initialized')
    }

    if (this.privacySettings.storage.cloud && !this.privacySettings.processing.encryptInTransit) {
      issues.push('Cloud storage enabled without encryption in transit')
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      recommendations: this.generateSecurityRecommendations(issues)
    }
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations(issues) {
    const recommendations = []

    if (issues.some(i => i.includes('Web Crypto API'))) {
      recommendations.push('Use a modern browser that supports Web Crypto API')
    }

    if (issues.some(i => i.includes('IndexedDB'))) {
      recommendations.push('Enable IndexedDB for secure local storage')
    }

    if (issues.some(i => i.includes('encryption key'))) {
      recommendations.push('Initialize encryption system before storing sensitive data')
    }

    return recommendations
  }
}

/**
 * Singleton instance
 */
let securityManagerInstance = null

/**
 * Get security manager instance
 */
export function getSecurityManager() {
  if (!securityManagerInstance) {
    securityManagerInstance = new SecurityManager()
  }
  return securityManagerInstance
}

/**
 * Initialize security manager
 */
export async function initializeSecurity(options = {}) {
  const manager = getSecurityManager()
  return await manager.initialize(options)
}

export default SecurityManager