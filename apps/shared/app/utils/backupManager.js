/**
 * Backup and Restore Manager
 * Provides automatic backup and restore mechanisms for data protection
 */

export class BackupManager {
  constructor() {
    this.backupPolicies = this.initializeBackupPolicies()
    this.backupStorage = new Map()
    this.backupHistory = []
    this.restorePoints = new Map()
    this.isInitialized = false
    this.backupDB = null
  }

  /**
   * Initialize backup policies
   */
  initializeBackupPolicies() {
    return {
      extractedData: {
        frequency: 'immediate', // immediate, periodic, manual
        retention: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxBackups: 10,
        compression: true,
        encryption: true,
        priority: 'high'
      },
      
      userPreferences: {
        frequency: 'onChange',
        retention: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxBackups: 5,
        compression: false,
        encryption: true,
        priority: 'medium'
      },
      
      processingState: {
        frequency: 'periodic',
        interval: 5 * 60 * 1000, // 5 minutes
        retention: 24 * 60 * 60 * 1000, // 24 hours
        maxBackups: 20,
        compression: true,
        encryption: false,
        priority: 'low'
      },
      
      apiKeys: {
        frequency: 'immediate',
        retention: 24 * 60 * 60 * 1000, // 24 hours
        maxBackups: 3,
        compression: false,
        encryption: true,
        priority: 'critical'
      },
      
      errorLogs: {
        frequency: 'periodic',
        interval: 15 * 60 * 1000, // 15 minutes
        retention: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxBackups: 50,
        compression: true,
        encryption: false,
        priority: 'low'
      }
    }
  }

  /**
   * Initialize backup manager
   */
  async initialize(options = {}) {
    try {
      // Initialize backup storage
      await this.initializeBackupStorage()
      
      // Setup periodic backups
      this.setupPeriodicBackups()
      
      // Setup cleanup intervals
      this.setupCleanupIntervals()
      
      // Load existing backups
      await this.loadExistingBackups()
      
      this.isInitialized = true
      this.logBackupEvent('BACKUP_MANAGER_INITIALIZED')
      
      return true
    } catch (error) {
      console.error('Failed to initialize BackupManager:', error)
      return false
    }
  }

  /**
   * Initialize backup storage
   */
  async initializeBackupStorage() {
    if (!window.indexedDB) {
      console.warn('IndexedDB not available, using memory storage for backups')
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BackupStorage', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.backupDB = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create backup store
        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'id' })
          backupStore.createIndex('dataType', 'dataType', { unique: false })
          backupStore.createIndex('timestamp', 'timestamp', { unique: false })
          backupStore.createIndex('priority', 'priority', { unique: false })
        }
        
        // Create restore points store
        if (!db.objectStoreNames.contains('restore_points')) {
          const restoreStore = db.createObjectStore('restore_points', { keyPath: 'id' })
          restoreStore.createIndex('timestamp', 'timestamp', { unique: false })
          restoreStore.createIndex('type', 'type', { unique: false })
        }
      }
    })
  }

  /**
   * Create backup of data
   * @param {string} dataType - Type of data being backed up
   * @param {any} data - Data to backup
   * @param {Object} options - Backup options
   * @returns {Promise<string>} Backup ID
   */
  async createBackup(dataType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('BackupManager not initialized')
    }

    const policy = this.backupPolicies[dataType] || this.backupPolicies.extractedData
    const backupId = this.generateBackupId(dataType)
    
    try {
      // Prepare backup data
      let backupData = data
      
      // Apply compression if enabled
      if (policy.compression) {
        backupData = await this.compressData(backupData)
      }
      
      // Apply encryption if enabled
      if (policy.encryption) {
        backupData = await this.encryptBackupData(backupData)
      }
      
      const backup = {
        id: backupId,
        dataType: dataType,
        data: backupData,
        timestamp: Date.now(),
        size: this.calculateDataSize(backupData),
        compressed: policy.compression,
        encrypted: policy.encryption,
        priority: policy.priority,
        metadata: {
          originalSize: this.calculateDataSize(data),
          version: options.version || '1.0',
          description: options.description || `Backup of ${dataType}`,
          tags: options.tags || []
        }
      }

      // Store backup
      await this.storeBackup(backup)
      
      // Cleanup old backups if necessary
      await this.cleanupOldBackups(dataType, policy)
      
      this.logBackupEvent('BACKUP_CREATED', { 
        backupId, 
        dataType, 
        size: backup.size,
        compressed: backup.compressed,
        encrypted: backup.encrypted
      })
      
      return backupId
    } catch (error) {
      this.logBackupEvent('BACKUP_FAILED', { 
        dataType, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Restore data from backup
   * @param {string} backupId - ID of backup to restore
   * @returns {Promise<any>} Restored data
   */
  async restoreFromBackup(backupId) {
    if (!this.isInitialized) {
      throw new Error('BackupManager not initialized')
    }

    try {
      // Get backup
      const backup = await this.getBackup(backupId)
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`)
      }

      let restoredData = backup.data

      // Decrypt if encrypted
      if (backup.encrypted) {
        restoredData = await this.decryptBackupData(restoredData)
      }

      // Decompress if compressed
      if (backup.compressed) {
        restoredData = await this.decompressData(restoredData)
      }

      this.logBackupEvent('BACKUP_RESTORED', { 
        backupId, 
        dataType: backup.dataType,
        timestamp: backup.timestamp
      })

      return restoredData
    } catch (error) {
      this.logBackupEvent('RESTORE_FAILED', { 
        backupId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Create restore point
   * @param {string} type - Type of restore point
   * @param {Object} state - Current application state
   * @param {Object} options - Restore point options
   * @returns {Promise<string>} Restore point ID
   */
  async createRestorePoint(type, state, options = {}) {
    const restorePointId = this.generateRestorePointId(type)
    
    const restorePoint = {
      id: restorePointId,
      type: type,
      state: state,
      timestamp: Date.now(),
      description: options.description || `Restore point for ${type}`,
      automatic: options.automatic || false,
      metadata: options.metadata || {}
    }

    await this.storeRestorePoint(restorePoint)
    
    // Limit restore points
    await this.cleanupOldRestorePoints(type)
    
    this.logBackupEvent('RESTORE_POINT_CREATED', { 
      restorePointId, 
      type, 
      automatic: restorePoint.automatic 
    })
    
    return restorePointId
  }

  /**
   * Restore to restore point
   * @param {string} restorePointId - ID of restore point
   * @returns {Promise<Object>} Restored state
   */
  async restoreToPoint(restorePointId) {
    try {
      const restorePoint = await this.getRestorePoint(restorePointId)
      if (!restorePoint) {
        throw new Error(`Restore point not found: ${restorePointId}`)
      }

      this.logBackupEvent('RESTORE_POINT_USED', { 
        restorePointId, 
        type: restorePoint.type,
        timestamp: restorePoint.timestamp
      })

      return restorePoint.state
    } catch (error) {
      this.logBackupEvent('RESTORE_POINT_FAILED', { 
        restorePointId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Store backup in database
   */
  async storeBackup(backup) {
    if (!this.backupDB) {
      // Fallback to memory storage
      this.backupStorage.set(backup.id, backup)
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['backups'], 'readwrite')
      const store = transaction.objectStore('backups')
      
      const request = store.put(backup)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get backup from storage
   */
  async getBackup(backupId) {
    if (!this.backupDB) {
      return this.backupStorage.get(backupId) || null
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['backups'], 'readonly')
      const store = transaction.objectStore('backups')
      
      const request = store.get(backupId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Store restore point
   */
  async storeRestorePoint(restorePoint) {
    if (!this.backupDB) {
      this.restorePoints.set(restorePoint.id, restorePoint)
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['restore_points'], 'readwrite')
      const store = transaction.objectStore('restore_points')
      
      const request = store.put(restorePoint)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get restore point
   */
  async getRestorePoint(restorePointId) {
    if (!this.backupDB) {
      return this.restorePoints.get(restorePointId) || null
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['restore_points'], 'readonly')
      const store = transaction.objectStore('restore_points')
      
      const request = store.get(restorePointId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Setup periodic backups
   */
  setupPeriodicBackups() {
    Object.entries(this.backupPolicies).forEach(([dataType, policy]) => {
      if (policy.frequency === 'periodic' && policy.interval) {
        setInterval(async () => {
          try {
            await this.performPeriodicBackup(dataType)
          } catch (error) {
            console.error(`Periodic backup failed for ${dataType}:`, error)
          }
        }, policy.interval)
      }
    })
  }

  /**
   * Perform periodic backup
   */
  async performPeriodicBackup(dataType) {
    // This would get current data from the appropriate source
    const currentData = await this.getCurrentData(dataType)
    
    if (currentData) {
      await this.createBackup(dataType, currentData, { 
        automatic: true,
        description: `Automatic periodic backup of ${dataType}`
      })
    }
  }

  /**
   * Setup cleanup intervals
   */
  setupCleanupIntervals() {
    // Clean up expired backups every hour
    setInterval(async () => {
      await this.cleanupExpiredBackups()
    }, 60 * 60 * 1000)
  }

  /**
   * Cleanup old backups based on policy
   */
  async cleanupOldBackups(dataType, policy) {
    const backups = await this.getBackupsByType(dataType)
    
    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp)
    
    // Remove excess backups
    if (backups.length > policy.maxBackups) {
      const toDelete = backups.slice(policy.maxBackups)
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id)
      }
    }
  }

  /**
   * Cleanup expired backups
   */
  async cleanupExpiredBackups() {
    const now = Date.now()
    
    for (const [dataType, policy] of Object.entries(this.backupPolicies)) {
      const backups = await this.getBackupsByType(dataType)
      const expiredBackups = backups.filter(backup => 
        now - backup.timestamp > policy.retention
      )
      
      for (const backup of expiredBackups) {
        await this.deleteBackup(backup.id)
        this.logBackupEvent('BACKUP_EXPIRED', { 
          backupId: backup.id, 
          dataType: backup.dataType 
        })
      }
    }
  }

  /**
   * Get backups by type
   */
  async getBackupsByType(dataType) {
    if (!this.backupDB) {
      return Array.from(this.backupStorage.values()).filter(b => b.dataType === dataType)
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['backups'], 'readonly')
      const store = transaction.objectStore('backups')
      const index = store.index('dataType')
      
      const request = index.getAll(dataType)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId) {
    if (!this.backupDB) {
      this.backupStorage.delete(backupId)
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['backups'], 'readwrite')
      const store = transaction.objectStore('backups')
      
      const request = store.delete(backupId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Load existing backups
   */
  async loadExistingBackups() {
    if (!this.backupDB) {
      return
    }

    try {
      const transaction = this.backupDB.transaction(['backups'], 'readonly')
      const store = transaction.objectStore('backups')
      
      const request = store.getAll()
      request.onsuccess = () => {
        const backups = request.result || []
        this.logBackupEvent('BACKUPS_LOADED', { count: backups.length })
      }
    } catch (error) {
      console.error('Failed to load existing backups:', error)
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStatistics() {
    const stats = {
      totalBackups: 0,
      backupsByType: {},
      totalSize: 0,
      oldestBackup: null,
      newestBackup: null,
      compressionRatio: 0,
      encryptedBackups: 0
    }

    // Get all backups
    const allBackups = await this.getAllBackups()
    
    stats.totalBackups = allBackups.length
    
    allBackups.forEach(backup => {
      // Count by type
      if (!stats.backupsByType[backup.dataType]) {
        stats.backupsByType[backup.dataType] = {
          count: 0,
          totalSize: 0,
          encrypted: 0,
          compressed: 0
        }
      }
      
      const typeStats = stats.backupsByType[backup.dataType]
      typeStats.count++
      typeStats.totalSize += backup.size
      
      if (backup.encrypted) {
        typeStats.encrypted++
        stats.encryptedBackups++
      }
      
      if (backup.compressed) {
        typeStats.compressed++
      }
      
      // Update total size
      stats.totalSize += backup.size
      
      // Update oldest/newest
      if (!stats.oldestBackup || backup.timestamp < stats.oldestBackup) {
        stats.oldestBackup = backup.timestamp
      }
      
      if (!stats.newestBackup || backup.timestamp > stats.newestBackup) {
        stats.newestBackup = backup.timestamp
      }
      
      // Calculate compression ratio
      if (backup.compressed && backup.metadata.originalSize) {
        const ratio = backup.size / backup.metadata.originalSize
        stats.compressionRatio = (stats.compressionRatio + ratio) / 2
      }
    })

    return stats
  }

  /**
   * Get all backups
   */
  async getAllBackups() {
    if (!this.backupDB) {
      return Array.from(this.backupStorage.values())
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['backups'], 'readonly')
      const store = transaction.objectStore('backups')
      
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Export all backups
   */
  async exportBackups() {
    const backups = await this.getAllBackups()
    const restorePoints = await this.getAllRestorePoints()
    
    return {
      backups: backups,
      restorePoints: restorePoints,
      statistics: await this.getBackupStatistics(),
      exportTime: Date.now(),
      version: '1.0'
    }
  }

  /**
   * Import backups
   */
  async importBackups(backupData) {
    if (!backupData.backups) {
      throw new Error('Invalid backup data format')
    }

    let importedCount = 0
    
    for (const backup of backupData.backups) {
      try {
        await this.storeBackup(backup)
        importedCount++
      } catch (error) {
        console.error(`Failed to import backup ${backup.id}:`, error)
      }
    }

    // Import restore points if available
    if (backupData.restorePoints) {
      for (const restorePoint of backupData.restorePoints) {
        try {
          await this.storeRestorePoint(restorePoint)
        } catch (error) {
          console.error(`Failed to import restore point ${restorePoint.id}:`, error)
        }
      }
    }

    this.logBackupEvent('BACKUPS_IMPORTED', { 
      importedCount, 
      totalCount: backupData.backups.length 
    })

    return importedCount
  }

  /**
   * Utility methods
   */
  generateBackupId(dataType) {
    return `backup_${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateRestorePointId(type) {
    return `restore_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  calculateDataSize(data) {
    return new Blob([JSON.stringify(data)]).size
  }

  logBackupEvent(event, data = {}) {
    const logEntry = {
      event: event,
      timestamp: Date.now(),
      data: data
    }

    this.backupHistory.push(logEntry)
    
    // Limit history size
    if (this.backupHistory.length > 500) {
      this.backupHistory = this.backupHistory.slice(-250)
    }

    console.log(`[BackupManager] ${event}:`, data)
  }

  // Placeholder methods for data operations
  async getCurrentData(dataType) {
    // This would get current data from the appropriate source
    return null
  }

  async getAllRestorePoints() {
    if (!this.backupDB) {
      return Array.from(this.restorePoints.values())
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['restore_points'], 'readonly')
      const store = transaction.objectStore('restore_points')
      
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async cleanupOldRestorePoints(type) {
    const restorePoints = await this.getAllRestorePoints()
    const typePoints = restorePoints.filter(rp => rp.type === type)
    
    // Keep only the 10 most recent restore points per type
    if (typePoints.length > 10) {
      typePoints.sort((a, b) => b.timestamp - a.timestamp)
      const toDelete = typePoints.slice(10)
      
      for (const point of toDelete) {
        await this.deleteRestorePoint(point.id)
      }
    }
  }

  async deleteRestorePoint(restorePointId) {
    if (!this.backupDB) {
      this.restorePoints.delete(restorePointId)
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.backupDB.transaction(['restore_points'], 'readwrite')
      const store = transaction.objectStore('restore_points')
      
      const request = store.delete(restorePointId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Compression and encryption methods (placeholders)
  async compressData(data) {
    // Simple JSON compression (in practice, would use a compression library)
    return JSON.stringify(data)
  }

  async decompressData(compressedData) {
    return JSON.parse(compressedData)
  }

  async encryptBackupData(data) {
    // This would use the SecurityManager for encryption
    return data // Placeholder
  }

  async decryptBackupData(encryptedData) {
    // This would use the SecurityManager for decryption
    return encryptedData // Placeholder
  }
}

/**
 * Singleton instance
 */
let backupManagerInstance = null

/**
 * Get backup manager instance
 */
export function getBackupManager() {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager()
  }
  return backupManagerInstance
}

/**
 * Initialize backup manager
 */
export async function initializeBackupManager(options = {}) {
  const manager = getBackupManager()
  return await manager.initialize(options)
}

/**
 * Create backup
 */
export async function createBackup(dataType, data, options = {}) {
  const manager = getBackupManager()
  return await manager.createBackup(dataType, data, options)
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(backupId) {
  const manager = getBackupManager()
  return await manager.restoreFromBackup(backupId)
}

export default BackupManager