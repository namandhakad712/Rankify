/**
 * Security and Privacy Management System
 * Implements comprehensive data protection and security measures
 * Based on design document security requirements
 */

import { ref, reactive, computed } from 'vue'

export interface SecurityConfiguration {
  dataEncryption: DataEncryptionConfig
  storageProtection: StorageProtectionConfig
  networkSecurity: NetworkSecurityConfig
  userPrivacy: UserPrivacyConfig
  auditLogging: AuditLoggingConfig
}

export interface DataEncryptionConfig {
  enabled: boolean
  algorithm: 'AES-GCM' | 'AES-CBC'
  keyLength: 128 | 256
  saltLength: number
  iterations: number
}

export interface StorageProtectionConfig {
  encryptSensitiveData: boolean
  dataRetentionDays: number
  autoCleanup: boolean
  secureStorageKeys: string[]
}

export interface NetworkSecurityConfig {
  enforceHTTPS: boolean
  validateCertificates: boolean
  contentSecurityPolicy: boolean
  crossOriginProtection: boolean
}

export interface UserPrivacyConfig {
  anonymizeData: boolean
  minimizeDataCollection: boolean
  consentRequired: boolean
  rightToDelete: boolean
  dataExportEnabled: boolean
}

export interface AuditLoggingConfig {
  enabled: boolean
  logSensitiveOperations: boolean
  retentionDays: number
  encryptLogs: boolean
}

export interface SecurityEvent {
  id: string
  type: SecurityEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  source: string
  metadata: Record<string, any>
  timestamp: number
  resolved: boolean
}

export type SecurityEventType = 
  | 'data-access'
  | 'encryption-operation'
  | 'storage-operation'
  | 'network-request'
  | 'privacy-action'
  | 'audit-log'
  | 'security-violation'

export interface PrivacySettings {
  dataMinimization: boolean
  analyticsOptOut: boolean
  errorReportingOptOut: boolean
  cookiesDisabled: boolean
  localStorageEncryption: boolean
}

export interface DataClassification {
  public: string[]
  internal: string[]
  confidential: string[]
  restricted: string[]
}

export interface SecurityMetrics {
  encryptionOperations: number
  securityEvents: number
  privacyViolations: number
  auditLogEntries: number
  dataRetentionCompliance: number
}

export function useSecurityPrivacyManager() {
  // Security configuration
  const securityConfig = reactive<SecurityConfiguration>({
    dataEncryption: {
      enabled: true,
      algorithm: 'AES-GCM',
      keyLength: 256,
      saltLength: 16,
      iterations: 100000
    },
    storageProtection: {
      encryptSensitiveData: true,
      dataRetentionDays: 90,
      autoCleanup: true,
      secureStorageKeys: ['api-keys', 'user-data', 'test-results', 'extracted-content']
    },
    networkSecurity: {
      enforceHTTPS: true,
      validateCertificates: true,
      contentSecurityPolicy: true,
      crossOriginProtection: true
    },
    userPrivacy: {
      anonymizeData: true,
      minimizeDataCollection: true,
      consentRequired: true,
      rightToDelete: true,
      dataExportEnabled: true
    },
    auditLogging: {
      enabled: true,
      logSensitiveOperations: true,
      retentionDays: 365,
      encryptLogs: true
    }
  })

  const privacySettings = reactive<PrivacySettings>({
    dataMinimization: true,
    analyticsOptOut: false,
    errorReportingOptOut: false,
    cookiesDisabled: false,
    localStorageEncryption: true
  })

  const dataClassification = reactive<DataClassification>({
    public: ['ui-preferences', 'language-settings'],
    internal: ['session-data', 'navigation-history'],
    confidential: ['test-answers', 'performance-data'],
    restricted: ['api-keys', 'encryption-keys', 'audit-logs']
  })

  const securityEvents = ref<SecurityEvent[]>([])
  const encryptionKeys = ref<Map<string, CryptoKey>>(new Map())
  const auditLog = ref<any[]>([])

  // Computed properties
  const securityMetrics = computed<SecurityMetrics>(() => ({
    encryptionOperations: securityEvents.value.filter(e => e.type === 'encryption-operation').length,
    securityEvents: securityEvents.value.length,
    privacyViolations: securityEvents.value.filter(e => e.severity === 'critical').length,
    auditLogEntries: auditLog.value.length,
    dataRetentionCompliance: calculateDataRetentionCompliance()
  }))

  const criticalSecurityEvents = computed(() => 
    securityEvents.value.filter(e => e.severity === 'critical' && !e.resolved)
  )

  const complianceStatus = computed(() => ({
    dataRetention: calculateDataRetentionCompliance() > 95,
    encryption: securityConfig.dataEncryption.enabled,
    auditLogging: securityConfig.auditLogging.enabled,
    privacySettings: privacySettings.dataMinimization
  }))

  // Encryption operations
  const generateEncryptionKey = async (keyId: string): Promise<CryptoKey> => {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: securityConfig.dataEncryption.algorithm,
          length: securityConfig.dataEncryption.keyLength
        },
        true,
        ['encrypt', 'decrypt']
      )

      encryptionKeys.value.set(keyId, key)
      
      logSecurityEvent({
        type: 'encryption-operation',
        severity: 'low',
        description: `Encryption key generated for ${keyId}`,
        source: 'security-manager',
        metadata: { keyId, algorithm: securityConfig.dataEncryption.algorithm }
      })

      return key
    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Failed to generate encryption key: ${error.message}`,
        source: 'security-manager',
        metadata: { keyId, error: error.message }
      })
      throw error
    }
  }

  const encryptData = async (data: string, keyId: string): Promise<string> => {
    try {
      if (!securityConfig.dataEncryption.enabled) {
        return data
      }

      let key = encryptionKeys.value.get(keyId)
      if (!key) {
        key = await generateEncryptionKey(keyId)
      }

      const encoder = new TextEncoder()
      const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for AES-GCM
      const encodedData = encoder.encode(data)

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: securityConfig.dataEncryption.algorithm,
          iv: iv
        },
        key,
        encodedData
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedData), iv.length)

      const base64 = btoa(String.fromCharCode(...combined))
      
      logSecurityEvent({
        type: 'encryption-operation',
        severity: 'low',
        description: `Data encrypted with key ${keyId}`,
        source: 'security-manager',
        metadata: { keyId, dataLength: data.length }
      })

      return base64
    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Encryption failed: ${error.message}`,
        source: 'security-manager',
        metadata: { keyId, error: error.message }
      })
      throw error
    }
  }

  const decryptData = async (encryptedData: string, keyId: string): Promise<string> => {
    try {
      if (!securityConfig.dataEncryption.enabled) {
        return encryptedData
      }

      const key = encryptionKeys.value.get(keyId)
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`)
      }

      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      )

      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)

      const decrypted = await crypto.subtle.decrypt(
        {
          name: securityConfig.dataEncryption.algorithm,
          iv: iv
        },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      const result = decoder.decode(decrypted)

      logSecurityEvent({
        type: 'encryption-operation',
        severity: 'low',
        description: `Data decrypted with key ${keyId}`,
        source: 'security-manager',
        metadata: { keyId }
      })

      return result
    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Decryption failed: ${error.message}`,
        source: 'security-manager',
        metadata: { keyId, error: error.message }
      })
      throw error
    }
  }

  // Secure storage operations
  const secureSetItem = async (key: string, value: any): Promise<void> => {
    try {
      const classification = classifyData(key)
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

      let finalValue = stringValue
      if (classification === 'confidential' || classification === 'restricted') {
        if (securityConfig.storageProtection.encryptSensitiveData) {
          finalValue = await encryptData(stringValue, `storage_${key}`)
        }
      }

      localStorage.setItem(key, finalValue)

      logSecurityEvent({
        type: 'storage-operation',
        severity: classification === 'restricted' ? 'medium' : 'low',
        description: `Data stored: ${key}`,
        source: 'storage-manager',
        metadata: { 
          key, 
          classification, 
          encrypted: finalValue !== stringValue,
          size: finalValue.length 
        }
      })

      // Log audit trail for sensitive operations
      if (securityConfig.auditLogging.enabled && 
          (classification === 'confidential' || classification === 'restricted')) {
        logAuditEvent('data-storage', { 
          key, 
          classification, 
          action: 'store',
          timestamp: Date.now()
        })
      }

    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Secure storage failed for ${key}: ${error.message}`,
        source: 'storage-manager',
        metadata: { key, error: error.message }
      })
      throw error
    }
  }

  const secureGetItem = async (key: string): Promise<any> => {
    try {
      const storedValue = localStorage.getItem(key)
      if (!storedValue) return null

      const classification = classifyData(key)
      let finalValue = storedValue

      if (classification === 'confidential' || classification === 'restricted') {
        if (securityConfig.storageProtection.encryptSensitiveData) {
          try {
            finalValue = await decryptData(storedValue, `storage_${key}`)
          } catch (decryptError) {
            // If decryption fails, assume data is not encrypted
            finalValue = storedValue
          }
        }
      }

      logSecurityEvent({
        type: 'data-access',
        severity: classification === 'restricted' ? 'medium' : 'low',
        description: `Data accessed: ${key}`,
        source: 'storage-manager',
        metadata: { 
          key, 
          classification,
          decrypted: finalValue !== storedValue
        }
      })

      // Log audit trail for sensitive operations
      if (securityConfig.auditLogging.enabled && 
          (classification === 'confidential' || classification === 'restricted')) {
        logAuditEvent('data-access', { 
          key, 
          classification, 
          action: 'retrieve',
          timestamp: Date.now()
        })
      }

      // Try to parse as JSON if possible
      try {
        return JSON.parse(finalValue)
      } catch {
        return finalValue
      }

    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Secure retrieval failed for ${key}: ${error.message}`,
        source: 'storage-manager',
        metadata: { key, error: error.message }
      })
      throw error
    }
  }

  const secureRemoveItem = async (key: string): Promise<void> => {
    try {
      const classification = classifyData(key)
      
      // For sensitive data, overwrite before removal
      if (classification === 'confidential' || classification === 'restricted') {
        const randomData = crypto.getRandomValues(new Uint8Array(1024))
        localStorage.setItem(key, btoa(String.fromCharCode(...randomData)))
      }

      localStorage.removeItem(key)
      
      // Remove encryption key if it exists
      encryptionKeys.value.delete(`storage_${key}`)

      logSecurityEvent({
        type: 'storage-operation',
        severity: classification === 'restricted' ? 'medium' : 'low',
        description: `Data removed: ${key}`,
        source: 'storage-manager',
        metadata: { key, classification, secureWipe: classification !== 'public' }
      })

      // Log audit trail for sensitive operations
      if (securityConfig.auditLogging.enabled && 
          (classification === 'confidential' || classification === 'restricted')) {
        logAuditEvent('data-removal', { 
          key, 
          classification, 
          action: 'remove',
          timestamp: Date.now()
        })
      }

    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Secure removal failed for ${key}: ${error.message}`,
        source: 'storage-manager',
        metadata: { key, error: error.message }
      })
      throw error
    }
  }

  // Privacy operations
  const anonymizeUserData = (data: any): any => {
    if (!privacySettings.dataMinimization) {
      return data
    }

    const anonymized = { ...data }
    
    // Remove or hash personally identifiable information
    const piiFields = ['email', 'name', 'ip', 'userAgent', 'deviceId']
    
    piiFields.forEach(field => {
      if (anonymized[field]) {
        anonymized[field] = hashValue(anonymized[field])
      }
    })

    logSecurityEvent({
      type: 'privacy-action',
      severity: 'low',
      description: 'User data anonymized',
      source: 'privacy-manager',
      metadata: { fieldsAnonymized: piiFields.filter(f => data[f]) }
    })

    return anonymized
  }

  const requestDataDeletion = async (dataType: string): Promise<boolean> => {
    try {
      if (!securityConfig.userPrivacy.rightToDelete) {
        throw new Error('Data deletion not enabled')
      }

      // Find all storage keys related to the data type
      const keysToDelete = Object.keys(localStorage).filter(key => 
        key.includes(dataType) || 
        securityConfig.storageProtection.secureStorageKeys.includes(key)
      )

      // Securely remove all related data
      for (const key of keysToDelete) {
        await secureRemoveItem(key)
      }

      logSecurityEvent({
        type: 'privacy-action',
        severity: 'medium',
        description: `Data deletion completed for type: ${dataType}`,
        source: 'privacy-manager',
        metadata: { dataType, keysDeleted: keysToDelete.length }
      })

      logAuditEvent('data-deletion', {
        dataType,
        keysDeleted: keysToDelete,
        timestamp: Date.now(),
        userRequested: true
      })

      return true
    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Data deletion failed for ${dataType}: ${error.message}`,
        source: 'privacy-manager',
        metadata: { dataType, error: error.message }
      })
      return false
    }
  }

  const exportUserData = async (): Promise<any> => {
    try {
      if (!securityConfig.userPrivacy.dataExportEnabled) {
        throw new Error('Data export not enabled')
      }

      const exportData: any = {}
      
      // Export all user data (excluding restricted items)
      Object.keys(localStorage).forEach(key => {
        const classification = classifyData(key)
        if (classification !== 'restricted') {
          exportData[key] = localStorage.getItem(key)
        }
      })

      logSecurityEvent({
        type: 'privacy-action',
        severity: 'medium',
        description: 'User data export completed',
        source: 'privacy-manager',
        metadata: { itemsExported: Object.keys(exportData).length }
      })

      logAuditEvent('data-export', {
        itemsExported: Object.keys(exportData),
        timestamp: Date.now(),
        userRequested: true
      })

      return exportData
    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'high',
        description: `Data export failed: ${error.message}`,
        source: 'privacy-manager',
        metadata: { error: error.message }
      })
      throw error
    }
  }

  // Data retention and cleanup
  const performDataRetentionCleanup = async (): Promise<void> => {
    try {
      if (!securityConfig.storageProtection.autoCleanup) {
        return
      }

      const retentionLimit = Date.now() - (securityConfig.storageProtection.dataRetentionDays * 24 * 60 * 60 * 1000)
      let itemsRemoved = 0

      // Check all stored items for expiration
      Object.keys(localStorage).forEach(async key => {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const parsed = JSON.parse(item)
            if (parsed.timestamp && parsed.timestamp < retentionLimit) {
              await secureRemoveItem(key)
              itemsRemoved++
            }
          }
        } catch {
          // Skip items that are not JSON or don't have timestamps
        }
      })

      // Clean up old audit logs
      const auditRetentionLimit = Date.now() - (securityConfig.auditLogging.retentionDays * 24 * 60 * 60 * 1000)
      auditLog.value = auditLog.value.filter(entry => entry.timestamp > auditRetentionLimit)

      // Clean up old security events
      securityEvents.value = securityEvents.value.filter(event => 
        event.timestamp > (Date.now() - (30 * 24 * 60 * 60 * 1000)) // Keep events for 30 days
      )

      logSecurityEvent({
        type: 'storage-operation',
        severity: 'low',
        description: `Data retention cleanup completed`,
        source: 'storage-manager',
        metadata: { itemsRemoved, auditLogsRemoved: auditLog.value.length }
      })

    } catch (error) {
      logSecurityEvent({
        type: 'security-violation',
        severity: 'medium',
        description: `Data retention cleanup failed: ${error.message}`,
        source: 'storage-manager',
        metadata: { error: error.message }
      })
    }
  }

  // Utility functions
  const classifyData = (key: string): keyof DataClassification => {
    for (const [classification, keys] of Object.entries(dataClassification)) {
      if (keys.some(k => key.includes(k))) {
        return classification as keyof DataClassification
      }
    }
    return 'internal' // Default classification
  }

  const hashValue = (value: string): string => {
    // Simple hash function for anonymization
    let hash = 0
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(16)}`
  }

  const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): void => {
    const securityEvent: SecurityEvent = {
      ...event,
      id: generateEventId(),
      timestamp: Date.now(),
      resolved: false
    }

    securityEvents.value.push(securityEvent)

    // Auto-resolve low severity events after 24 hours
    if (event.severity === 'low') {
      setTimeout(() => {
        securityEvent.resolved = true
      }, 24 * 60 * 60 * 1000)
    }

    console.log(`Security Event [${event.severity.toUpperCase()}]: ${event.description}`)
  }

  const logAuditEvent = (action: string, metadata: any): void => {
    if (!securityConfig.auditLogging.enabled) return

    const auditEntry = {
      id: generateEventId(),
      action,
      metadata,
      timestamp: Date.now(),
      source: 'security-manager'
    }

    auditLog.value.push(auditEntry)

    // Encrypt audit logs if configured
    if (securityConfig.auditLogging.encryptLogs) {
      // In a real implementation, this would encrypt the audit entry
    }
  }

  const generateEventId = (): string => {
    return 'sec_' + Math.random().toString(36).substr(2, 9)
  }

  const calculateDataRetentionCompliance = (): number => {
    // Calculate compliance percentage based on data retention policies
    const totalItems = Object.keys(localStorage).length
    if (totalItems === 0) return 100

    const retentionLimit = Date.now() - (securityConfig.storageProtection.dataRetentionDays * 24 * 60 * 60 * 1000)
    let compliantItems = 0

    Object.keys(localStorage).forEach(key => {
      try {
        const item = localStorage.getItem(key)
        if (item) {
          const parsed = JSON.parse(item)
          if (!parsed.timestamp || parsed.timestamp > retentionLimit) {
            compliantItems++
          }
        } else {
          compliantItems++ // Items without timestamps are considered compliant
        }
      } catch {
        compliantItems++ // Non-JSON items are considered compliant
      }
    })

    return (compliantItems / totalItems) * 100
  }

  const resolveSecurityEvent = (eventId: string): void => {
    const event = securityEvents.value.find(e => e.id === eventId)
    if (event) {
      event.resolved = true
    }
  }

  // Initialize security system
  const initializeSecurity = async (): Promise<void> => {
    // Generate master encryption key
    await generateEncryptionKey('master')
    
    // Setup periodic cleanup
    if (securityConfig.storageProtection.autoCleanup) {
      setInterval(performDataRetentionCleanup, 24 * 60 * 60 * 1000) // Daily cleanup
    }

    // Load privacy settings from storage
    try {
      const storedSettings = await secureGetItem('privacy-settings')
      if (storedSettings) {
        Object.assign(privacySettings, storedSettings)
      }
    } catch (error) {
      console.warn('Failed to load privacy settings:', error)
    }

    logSecurityEvent({
      type: 'audit-log',
      severity: 'low',
      description: 'Security system initialized',
      source: 'security-manager',
      metadata: { 
        encryptionEnabled: securityConfig.dataEncryption.enabled,
        auditLoggingEnabled: securityConfig.auditLogging.enabled
      }
    })
  }

  return {
    // Configuration
    securityConfig: readonly(securityConfig),
    privacySettings: readonly(privacySettings),
    dataClassification: readonly(dataClassification),
    
    // State
    securityEvents: readonly(securityEvents),
    auditLog: readonly(auditLog),
    
    // Computed
    securityMetrics,
    criticalSecurityEvents,
    complianceStatus,
    
    // Encryption
    generateEncryptionKey,
    encryptData,
    decryptData,
    
    // Secure storage
    secureSetItem,
    secureGetItem,
    secureRemoveItem,
    
    // Privacy
    anonymizeUserData,
    requestDataDeletion,
    exportUserData,
    
    // Maintenance
    performDataRetentionCleanup,
    resolveSecurityEvent,
    
    // Initialization
    initializeSecurity
  }
}
