/**
 * Privacy Manager for Data Protection and User Consent
 * Manages privacy controls, data retention, and user consent
 */

export class PrivacyManager {
  constructor() {
    this.consentStatus = new Map()
    this.dataRetentionPolicies = this.initializeRetentionPolicies()
    this.privacyControls = this.initializePrivacyControls()
    this.dataProcessingLog = []
    this.userPreferences = this.initializeUserPreferences()
    this.complianceSettings = this.initializeComplianceSettings()
  }

  /**
   * Initialize data retention policies
   */
  initializeRetentionPolicies() {
    return {
      extractedQuestions: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        autoDelete: true,
        userControlled: true,
        category: 'functional'
      },
      processingMetrics: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoDelete: true,
        userControlled: false,
        category: 'analytics'
      },
      errorLogs: {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        autoDelete: true,
        userControlled: false,
        category: 'technical'
      },
      userInteractions: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        autoDelete: true,
        userControlled: true,
        category: 'behavioral'
      },
      auditLogs: {
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        autoDelete: false,
        userControlled: false,
        category: 'security'
      }
    }
  }

  /**
   * Initialize privacy controls
   */
  initializePrivacyControls() {
    return {
      dataCollection: {
        essential: {
          enabled: true,
          required: true,
          description: 'Essential data for PDF extraction functionality'
        },
        functional: {
          enabled: true,
          required: false,
          description: 'Data to improve user experience and remember preferences'
        },
        analytics: {
          enabled: false,
          required: false,
          description: 'Anonymous usage statistics to improve the service'
        },
        marketing: {
          enabled: false,
          required: false,
          description: 'Data for personalized content and recommendations'
        }
      },
      dataSharing: {
        internal: {
          enabled: false,
          description: 'Share data within our organization for service improvement'
        },
        thirdParty: {
          enabled: false,
          description: 'Share anonymized data with trusted third parties'
        },
        research: {
          enabled: false,
          description: 'Use anonymized data for research and development'
        }
      },
      dataProcessing: {
        clientSideOnly: {
          enabled: true,
          description: 'Process all data locally in your browser'
        },
        cloudProcessing: {
          enabled: false,
          description: 'Use cloud services for enhanced processing capabilities'
        },
        aiImprovement: {
          enabled: false,
          description: 'Use your data to improve AI models (anonymized)'
        }
      }
    }
  }

  /**
   * Initialize user preferences
   */
  initializeUserPreferences() {
    return {
      notifications: {
        dataRetention: true,
        privacyUpdates: true,
        securityAlerts: true
      },
      automation: {
        autoDeleteExpired: true,
        autoOptimizeStorage: true,
        autoUpdatePreferences: false
      },
      transparency: {
        showDataUsage: true,
        showProcessingDetails: true,
        showRetentionStatus: true
      }
    }
  }

  /**
   * Initialize compliance settings
   */
  initializeComplianceSettings() {
    return {
      gdpr: {
        enabled: true,
        lawfulBasis: 'consent',
        dataSubjectRights: true,
        rightToErasure: true,
        dataPortability: true
      },
      ccpa: {
        enabled: true,
        optOutRights: true,
        dataDisclosure: true,
        nonDiscrimination: true
      },
      coppa: {
        enabled: false,
        parentalConsent: false,
        ageVerification: false
      }
    }
  }

  /**
   * Request user consent for data processing
   * @param {string} purpose - Purpose of data processing
   * @param {Object} details - Details about data processing
   * @returns {Promise<boolean>} Consent granted
   */
  async requestConsent(purpose, details = {}) {
    // Check if consent already exists
    const existingConsent = this.consentStatus.get(purpose)
    if (existingConsent && !this.isConsentExpired(existingConsent)) {
      return existingConsent.granted
    }

    // Create consent request
    const consentRequest = {
      purpose: purpose,
      details: details,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    }

    // Log consent request
    this.logDataProcessing('CONSENT_REQUESTED', consentRequest)

    // In a real implementation, this would show a consent dialog
    // For now, we'll simulate based on privacy controls
    const granted = this.evaluateConsentRequest(purpose, details)

    // Store consent decision
    const consentRecord = {
      purpose: purpose,
      granted: granted,
      timestamp: Date.now(),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
      details: details,
      requestId: consentRequest.requestId
    }

    this.consentStatus.set(purpose, consentRecord)
    this.saveConsentStatus()

    this.logDataProcessing('CONSENT_RECORDED', {
      purpose: purpose,
      granted: granted,
      timestamp: Date.now()
    })

    return granted
  }

  /**
   * Evaluate consent request based on current settings
   */
  evaluateConsentRequest(purpose, details) {
    const category = details.category || 'functional'
    const control = this.privacyControls.dataCollection[category]
    
    if (!control) {
      return false
    }

    // Required purposes are automatically granted
    if (control.required) {
      return true
    }

    // Check user's privacy settings
    return control.enabled
  }

  /**
   * Check if consent is expired
   */
  isConsentExpired(consent) {
    return consent.expiresAt && Date.now() > consent.expiresAt
  }

  /**
   * Withdraw consent
   * @param {string} purpose - Purpose to withdraw consent for
   */
  async withdrawConsent(purpose) {
    const consent = this.consentStatus.get(purpose)
    if (consent) {
      consent.granted = false
      consent.withdrawnAt = Date.now()
      
      this.consentStatus.set(purpose, consent)
      this.saveConsentStatus()

      // Trigger data deletion if required
      await this.handleConsentWithdrawal(purpose)

      this.logDataProcessing('CONSENT_WITHDRAWN', {
        purpose: purpose,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Handle consent withdrawal
   */
  async handleConsentWithdrawal(purpose) {
    // Delete data associated with the withdrawn consent
    const dataTypes = this.getDataTypesForPurpose(purpose)
    
    for (const dataType of dataTypes) {
      await this.deleteDataByType(dataType)
    }

    // Notify user of data deletion
    if (this.userPreferences.notifications.dataRetention) {
      this.notifyUser('DATA_DELETED_CONSENT_WITHDRAWN', {
        purpose: purpose,
        dataTypes: dataTypes
      })
    }
  }

  /**
   * Get data types associated with a purpose
   */
  getDataTypesForPurpose(purpose) {
    const purposeMapping = {
      'pdf_extraction': ['extractedQuestions', 'processingMetrics'],
      'user_experience': ['userInteractions', 'userPreferences'],
      'analytics': ['processingMetrics', 'userInteractions'],
      'security': ['auditLogs', 'errorLogs']
    }

    return purposeMapping[purpose] || []
  }

  /**
   * Delete data by type
   */
  async deleteDataByType(dataType) {
    // This would integrate with the SecurityManager to delete encrypted data
    const securityManager = await import('./securityManager.js').then(m => m.getSecurityManager())
    
    switch (dataType) {
      case 'extractedQuestions':
        await this.deleteExtractedQuestions()
        break
      case 'processingMetrics':
        await this.deleteProcessingMetrics()
        break
      case 'userInteractions':
        await this.deleteUserInteractions()
        break
      case 'errorLogs':
        await this.deleteErrorLogs()
        break
    }

    this.logDataProcessing('DATA_DELETED', {
      dataType: dataType,
      timestamp: Date.now()
    })
  }

  /**
   * Update privacy preferences
   * @param {Object} preferences - New privacy preferences
   */
  async updatePrivacyPreferences(preferences) {
    const oldPreferences = { ...this.privacyControls }
    
    // Merge new preferences
    this.privacyControls = this.mergeDeep(this.privacyControls, preferences)
    
    // Save preferences
    this.savePrivacyPreferences()

    // Handle preference changes
    await this.handlePreferenceChanges(oldPreferences, this.privacyControls)

    this.logDataProcessing('PRIVACY_PREFERENCES_UPDATED', {
      timestamp: Date.now(),
      changes: this.getPreferenceChanges(oldPreferences, this.privacyControls)
    })
  }

  /**
   * Handle privacy preference changes
   */
  async handlePreferenceChanges(oldPrefs, newPrefs) {
    // Check for data collection changes
    Object.keys(newPrefs.dataCollection).forEach(async (category) => {
      const oldEnabled = oldPrefs.dataCollection[category]?.enabled
      const newEnabled = newPrefs.dataCollection[category]?.enabled

      if (oldEnabled && !newEnabled) {
        // Data collection disabled - delete existing data
        await this.deleteDataByCategory(category)
      }
    })

    // Check for data sharing changes
    Object.keys(newPrefs.dataSharing).forEach(async (type) => {
      const oldEnabled = oldPrefs.dataSharing[type]?.enabled
      const newEnabled = newPrefs.dataSharing[type]?.enabled

      if (oldEnabled && !newEnabled) {
        // Data sharing disabled - revoke sharing permissions
        await this.revokeDataSharing(type)
      }
    })
  }

  /**
   * Delete data by category
   */
  async deleteDataByCategory(category) {
    const dataTypes = Object.keys(this.dataRetentionPolicies).filter(
      type => this.dataRetentionPolicies[type].category === category
    )

    for (const dataType of dataTypes) {
      await this.deleteDataByType(dataType)
    }
  }

  /**
   * Apply data retention policies
   */
  async applyRetentionPolicies() {
    const now = Date.now()

    for (const [dataType, policy] of Object.entries(this.dataRetentionPolicies)) {
      if (policy.autoDelete) {
        await this.deleteExpiredData(dataType, now - policy.maxAge)
      }
    }

    this.logDataProcessing('RETENTION_POLICIES_APPLIED', {
      timestamp: now,
      policiesApplied: Object.keys(this.dataRetentionPolicies).length
    })
  }

  /**
   * Delete expired data
   */
  async deleteExpiredData(dataType, cutoffTime) {
    // This would integrate with storage systems to delete expired data
    const deletedCount = await this.performDataDeletion(dataType, cutoffTime)

    if (deletedCount > 0) {
      this.logDataProcessing('EXPIRED_DATA_DELETED', {
        dataType: dataType,
        deletedCount: deletedCount,
        cutoffTime: cutoffTime,
        timestamp: Date.now()
      })

      // Notify user if enabled
      if (this.userPreferences.notifications.dataRetention) {
        this.notifyUser('DATA_RETENTION_CLEANUP', {
          dataType: dataType,
          deletedCount: deletedCount
        })
      }
    }
  }

  /**
   * Perform actual data deletion (placeholder)
   */
  async performDataDeletion(dataType, cutoffTime) {
    // This would be implemented based on the specific storage system
    // For now, return a simulated count
    return Math.floor(Math.random() * 10)
  }

  /**
   * Get user's data summary
   */
  async getDataSummary() {
    const summary = {
      dataTypes: {},
      totalSize: 0,
      oldestData: null,
      newestData: null,
      retentionStatus: {}
    }

    // Analyze each data type
    for (const [dataType, policy] of Object.entries(this.dataRetentionPolicies)) {
      const typeData = await this.analyzeDataType(dataType)
      summary.dataTypes[dataType] = typeData
      summary.totalSize += typeData.size

      // Update oldest/newest
      if (!summary.oldestData || typeData.oldestTimestamp < summary.oldestData) {
        summary.oldestData = typeData.oldestTimestamp
      }
      if (!summary.newestData || typeData.newestTimestamp > summary.newestData) {
        summary.newestData = typeData.newestTimestamp
      }

      // Retention status
      summary.retentionStatus[dataType] = {
        policy: policy,
        itemsExpiringSoon: typeData.itemsExpiringSoon,
        nextCleanup: this.calculateNextCleanup(policy)
      }
    }

    return summary
  }

  /**
   * Analyze data type (placeholder)
   */
  async analyzeDataType(dataType) {
    // This would analyze actual stored data
    return {
      count: Math.floor(Math.random() * 100),
      size: Math.floor(Math.random() * 1024 * 1024), // Random size in bytes
      oldestTimestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      newestTimestamp: Date.now() - Math.random() * 24 * 60 * 60 * 1000,
      itemsExpiringSoon: Math.floor(Math.random() * 10)
    }
  }

  /**
   * Calculate next cleanup time
   */
  calculateNextCleanup(policy) {
    if (!policy.autoDelete) {
      return null
    }

    // Next cleanup is typically daily
    const nextMidnight = new Date()
    nextMidnight.setHours(24, 0, 0, 0)
    return nextMidnight.getTime()
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData() {
    const exportData = {
      exportTimestamp: Date.now(),
      consentRecords: Array.from(this.consentStatus.entries()),
      privacyPreferences: this.privacyControls,
      userPreferences: this.userPreferences,
      dataProcessingLog: this.dataProcessingLog,
      dataSummary: await this.getDataSummary()
    }

    // Add actual stored data
    exportData.storedData = await this.collectStoredData()

    this.logDataProcessing('DATA_EXPORTED', {
      timestamp: Date.now(),
      dataTypes: Object.keys(exportData.storedData)
    })

    return exportData
  }

  /**
   * Collect stored data for export
   */
  async collectStoredData() {
    const storedData = {}

    for (const dataType of Object.keys(this.dataRetentionPolicies)) {
      storedData[dataType] = await this.collectDataByType(dataType)
    }

    return storedData
  }

  /**
   * Collect data by type (placeholder)
   */
  async collectDataByType(dataType) {
    // This would collect actual data from storage
    return {
      type: dataType,
      count: Math.floor(Math.random() * 50),
      lastUpdated: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    }
  }

  /**
   * Delete all user data (Right to Erasure)
   */
  async deleteAllUserData() {
    // Delete all data types
    for (const dataType of Object.keys(this.dataRetentionPolicies)) {
      await this.deleteDataByType(dataType)
    }

    // Clear consent records
    this.consentStatus.clear()
    this.clearConsentStatus()

    // Reset preferences to defaults
    this.privacyControls = this.initializePrivacyControls()
    this.userPreferences = this.initializeUserPreferences()
    this.clearPrivacyPreferences()

    // Clear processing log
    this.dataProcessingLog = []

    this.logDataProcessing('ALL_USER_DATA_DELETED', {
      timestamp: Date.now(),
      reason: 'user_request'
    })

    return true
  }

  /**
   * Check compliance status
   */
  checkComplianceStatus() {
    const status = {
      gdpr: this.checkGDPRCompliance(),
      ccpa: this.checkCCPACompliance(),
      overall: 'compliant'
    }

    // Determine overall status
    const issues = [...status.gdpr.issues, ...status.ccpa.issues]
    if (issues.length > 0) {
      status.overall = issues.some(i => i.severity === 'high') ? 'non-compliant' : 'partially-compliant'
    }

    return status
  }

  /**
   * Check GDPR compliance
   */
  checkGDPRCompliance() {
    const issues = []

    // Check consent management
    if (this.consentStatus.size === 0) {
      issues.push({
        type: 'consent',
        severity: 'medium',
        message: 'No consent records found'
      })
    }

    // Check data retention
    const expiredConsents = Array.from(this.consentStatus.values())
      .filter(consent => this.isConsentExpired(consent))

    if (expiredConsents.length > 0) {
      issues.push({
        type: 'consent_expiry',
        severity: 'high',
        message: `${expiredConsents.length} expired consent records`
      })
    }

    // Check data subject rights
    if (!this.complianceSettings.gdpr.rightToErasure) {
      issues.push({
        type: 'data_rights',
        severity: 'high',
        message: 'Right to erasure not implemented'
      })
    }

    return {
      compliant: issues.length === 0,
      issues: issues,
      lastChecked: Date.now()
    }
  }

  /**
   * Check CCPA compliance
   */
  checkCCPACompliance() {
    const issues = []

    // Check opt-out rights
    if (!this.complianceSettings.ccpa.optOutRights) {
      issues.push({
        type: 'opt_out',
        severity: 'high',
        message: 'Opt-out rights not implemented'
      })
    }

    // Check data disclosure
    const sharingEnabled = Object.values(this.privacyControls.dataSharing)
      .some(setting => setting.enabled)

    if (sharingEnabled && !this.complianceSettings.ccpa.dataDisclosure) {
      issues.push({
        type: 'disclosure',
        severity: 'medium',
        message: 'Data sharing enabled without proper disclosure'
      })
    }

    return {
      compliant: issues.length === 0,
      issues: issues,
      lastChecked: Date.now()
    }
  }

  /**
   * Utility methods
   */
  generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  mergeDeep(target, source) {
    const result = { ...target }
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(result[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }

  getPreferenceChanges(oldPrefs, newPrefs) {
    const changes = []
    
    // Simple change detection (would be more sophisticated in practice)
    const oldStr = JSON.stringify(oldPrefs)
    const newStr = JSON.stringify(newPrefs)
    
    if (oldStr !== newStr) {
      changes.push('preferences_modified')
    }
    
    return changes
  }

  logDataProcessing(event, data) {
    const logEntry = {
      event: event,
      timestamp: Date.now(),
      data: data
    }

    this.dataProcessingLog.push(logEntry)

    // Limit log size
    if (this.dataProcessingLog.length > 1000) {
      this.dataProcessingLog = this.dataProcessingLog.slice(-500)
    }
  }

  notifyUser(type, data) {
    // This would integrate with a notification system
    console.log(`Privacy notification: ${type}`, data)
  }

  saveConsentStatus() {
    try {
      const consentArray = Array.from(this.consentStatus.entries())
      localStorage.setItem('privacy_consent', JSON.stringify(consentArray))
    } catch (error) {
      console.error('Failed to save consent status:', error)
    }
  }

  loadConsentStatus() {
    try {
      const stored = localStorage.getItem('privacy_consent')
      if (stored) {
        const consentArray = JSON.parse(stored)
        this.consentStatus = new Map(consentArray)
      }
    } catch (error) {
      console.error('Failed to load consent status:', error)
    }
  }

  clearConsentStatus() {
    localStorage.removeItem('privacy_consent')
  }

  savePrivacyPreferences() {
    try {
      localStorage.setItem('privacy_controls', JSON.stringify(this.privacyControls))
      localStorage.setItem('user_preferences', JSON.stringify(this.userPreferences))
    } catch (error) {
      console.error('Failed to save privacy preferences:', error)
    }
  }

  loadPrivacyPreferences() {
    try {
      const controls = localStorage.getItem('privacy_controls')
      const preferences = localStorage.getItem('user_preferences')
      
      if (controls) {
        this.privacyControls = JSON.parse(controls)
      }
      
      if (preferences) {
        this.userPreferences = JSON.parse(preferences)
      }
    } catch (error) {
      console.error('Failed to load privacy preferences:', error)
    }
  }

  clearPrivacyPreferences() {
    localStorage.removeItem('privacy_controls')
    localStorage.removeItem('user_preferences')
  }

  // Placeholder methods for data deletion
  async deleteExtractedQuestions() { /* Implementation */ }
  async deleteProcessingMetrics() { /* Implementation */ }
  async deleteUserInteractions() { /* Implementation */ }
  async deleteErrorLogs() { /* Implementation */ }
  async revokeDataSharing(type) { /* Implementation */ }
}

/**
 * Singleton instance
 */
let privacyManagerInstance = null

/**
 * Get privacy manager instance
 */
export function getPrivacyManager() {
  if (!privacyManagerInstance) {
    privacyManagerInstance = new PrivacyManager()
    privacyManagerInstance.loadConsentStatus()
    privacyManagerInstance.loadPrivacyPreferences()
  }
  return privacyManagerInstance
}

export default PrivacyManager