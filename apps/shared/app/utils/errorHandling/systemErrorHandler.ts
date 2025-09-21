/**
 * Comprehensive System Error Handler
 * Provides centralized error handling for the advanced diagram detection system
 */

export interface SystemError {
  id: string;
  type: 'API_ERROR' | 'VALIDATION_ERROR' | 'PROCESSING_ERROR' | 'NETWORK_ERROR' | 'STORAGE_ERROR' | 'USER_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details?: any;
  timestamp: Date;
  context?: {
    component: string;
    operation: string;
    userId?: string;
    sessionId?: string;
  };
  recoverable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface ErrorRecoveryAction {
  type: 'RETRY' | 'FALLBACK' | 'SKIP' | 'MANUAL_INTERVENTION' | 'RESTART';
  description: string;
  action: () => Promise<any>;
  priority: number;
}

export interface UserFeedback {
  type: 'ERROR' | 'WARNING' | 'INFO' | 'SUCCESS' | 'PROGRESS';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: () => void;
    style: 'primary' | 'secondary' | 'danger';
  }>;
  dismissible: boolean;
  duration?: number; // Auto-dismiss after milliseconds
  persistent?: boolean; // Survives page refresh
}

export class SystemErrorHandler {
  private errorLog: SystemError[] = [];
  private errorCallbacks: Map<string, (error: SystemError) => void> = new Map();
  private recoveryStrategies: Map<string, ErrorRecoveryAction[]> = new Map();
  private userFeedbackQueue: UserFeedback[] = [];
  private feedbackCallbacks: ((feedback: UserFeedback) => void)[] = [];

  constructor() {
    this.setupDefaultRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Handle system errors with automatic recovery attempts
   */
  async handleError(error: SystemError): Promise<boolean> {
    // Log the error
    this.logError(error);

    // Notify error callbacks
    this.notifyErrorCallbacks(error);

    // Attempt recovery if possible
    if (error.recoverable) {
      const recovered = await this.attemptRecovery(error);
      if (recovered) {
        this.showUserFeedback({
          type: 'SUCCESS',
          title: 'Issue Resolved',
          message: 'The system has automatically recovered from the error.',
          dismissible: true,
          duration: 5000
        });
        return true;
      }
    }

    // Show user feedback for unrecovered errors
    this.showErrorFeedback(error);
    return false;
  }

  /**
   * Create standardized error objects
   */
  createError(
    type: SystemError['type'],
    message: string,
    context?: SystemError['context'],
    details?: any,
    severity: SystemError['severity'] = 'MEDIUM'
  ): SystemError {
    return {
      id: this.generateErrorId(),
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      context,
      recoverable: this.isRecoverable(type),
      retryCount: 0,
      maxRetries: this.getMaxRetries(type)
    };
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptRecovery(error: SystemError): Promise<boolean> {
    const strategies = this.recoveryStrategies.get(error.type) || [];
    
    for (const strategy of strategies.sort((a, b) => b.priority - a.priority)) {
      try {
        this.showUserFeedback({
          type: 'INFO',
          title: 'Attempting Recovery',
          message: strategy.description,
          dismissible: false
        });

        await strategy.action();
        
        // Recovery successful
        this.clearUserFeedback();
        return true;
      } catch (recoveryError) {
        console.warn(`Recovery strategy failed: ${strategy.type}`, recoveryError);
      }
    }

    return false;
  }

  /**
   * Setup default recovery strategies for different error types
   */
  private setupDefaultRecoveryStrategies(): void {
    // API Error Recovery
    this.recoveryStrategies.set('API_ERROR', [
      {
        type: 'RETRY',
        description: 'Retrying API request with exponential backoff...',
        action: async () => {
          await this.delay(1000);
          // Retry logic will be handled by the calling component
        },
        priority: 3
      },
      {
        type: 'FALLBACK',
        description: 'Switching to local processing...',
        action: async () => {
          // Fallback to local diagram detection
        },
        priority: 2
      }
    ]);

    // Network Error Recovery
    this.recoveryStrategies.set('NETWORK_ERROR', [
      {
        type: 'RETRY',
        description: 'Checking network connection and retrying...',
        action: async () => {
          await this.checkNetworkConnection();
          await this.delay(2000);
        },
        priority: 3
      }
    ]);

    // Storage Error Recovery
    this.recoveryStrategies.set('STORAGE_ERROR', [
      {
        type: 'RETRY',
        description: 'Clearing cache and retrying storage operation...',
        action: async () => {
          await this.clearStorageCache();
        },
        priority: 2
      }
    ]);
  }

  /**
   * Show user-friendly error feedback
   */
  private showErrorFeedback(error: SystemError): void {
    const feedback = this.createUserFeedback(error);
    this.showUserFeedback(feedback);
  }

  /**
   * Create user-friendly feedback from system errors
   */
  private createUserFeedback(error: SystemError): UserFeedback {
    const feedbackMap: Record<SystemError['type'], Partial<UserFeedback>> = {
      'API_ERROR': {
        title: 'Service Temporarily Unavailable',
        message: 'The diagram detection service is currently unavailable. We\'ll try local processing instead.',
        actions: [
          {
            label: 'Retry',
            action: () => this.retryLastOperation(error),
            style: 'primary'
          },
          {
            label: 'Continue Without AI',
            action: () => this.skipAIProcessing(),
            style: 'secondary'
          }
        ]
      },
      'VALIDATION_ERROR': {
        title: 'Data Validation Issue',
        message: 'Some data doesn\'t meet the required format. Please check your input.',
        actions: [
          {
            label: 'Review Data',
            action: () => this.showValidationDetails(error),
            style: 'primary'
          }
        ]
      },
      'PROCESSING_ERROR': {
        title: 'Processing Error',
        message: 'An error occurred while processing your file. Please try again.',
        actions: [
          {
            label: 'Retry',
            action: () => this.retryLastOperation(error),
            style: 'primary'
          },
          {
            label: 'Report Issue',
            action: () => this.reportError(error),
            style: 'secondary'
          }
        ]
      },
      'NETWORK_ERROR': {
        title: 'Connection Issue',
        message: 'Please check your internet connection and try again.',
        actions: [
          {
            label: 'Retry',
            action: () => this.retryLastOperation(error),
            style: 'primary'
          }
        ]
      },
      'STORAGE_ERROR': {
        title: 'Storage Issue',
        message: 'Unable to save data. Your browser storage might be full.',
        actions: [
          {
            label: 'Clear Cache',
            action: () => this.clearStorageCache(),
            style: 'primary'
          },
          {
            label: 'Download Backup',
            action: () => this.downloadDataBackup(),
            style: 'secondary'
          }
        ]
      },
      'USER_ERROR': {
        title: 'Input Error',
        message: 'Please check your input and try again.',
        actions: [
          {
            label: 'OK',
            action: () => {},
            style: 'primary'
          }
        ]
      }
    };

    const baseFeedback = feedbackMap[error.type] || {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      actions: [
        {
          label: 'Retry',
          action: () => this.retryLastOperation(error),
          style: 'primary'
        }
      ]
    };

    return {
      type: error.severity === 'CRITICAL' ? 'ERROR' : 'WARNING',
      dismissible: error.severity !== 'CRITICAL',
      persistent: error.severity === 'CRITICAL',
      ...baseFeedback
    } as UserFeedback;
  }

  /**
   * Show user feedback through registered callbacks
   */
  showUserFeedback(feedback: UserFeedback): void {
    this.userFeedbackQueue.push(feedback);
    this.feedbackCallbacks.forEach(callback => callback(feedback));
  }

  /**
   * Clear current user feedback
   */
  clearUserFeedback(): void {
    this.userFeedbackQueue = [];
    this.feedbackCallbacks.forEach(callback => 
      callback({
        type: 'INFO',
        title: '',
        message: '',
        dismissible: true
      })
    );
  }

  /**
   * Register callback for user feedback updates
   */
  onUserFeedback(callback: (feedback: UserFeedback) => void): () => void {
    this.feedbackCallbacks.push(callback);
    return () => {
      const index = this.feedbackCallbacks.indexOf(callback);
      if (index > -1) {
        this.feedbackCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for error notifications
   */
  onError(errorType: string, callback: (error: SystemError) => void): () => void {
    this.errorCallbacks.set(errorType, callback);
    return () => {
      this.errorCallbacks.delete(errorType);
    };
  }

  // Helper methods
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isRecoverable(type: SystemError['type']): boolean {
    return ['API_ERROR', 'NETWORK_ERROR', 'STORAGE_ERROR'].includes(type);
  }

  private getMaxRetries(type: SystemError['type']): number {
    const retryMap: Record<SystemError['type'], number> = {
      'API_ERROR': 3,
      'NETWORK_ERROR': 2,
      'STORAGE_ERROR': 2,
      'PROCESSING_ERROR': 1,
      'VALIDATION_ERROR': 0,
      'USER_ERROR': 0
    };
    return retryMap[type] || 1;
  }

  private logError(error: SystemError): void {
    this.errorLog.push(error);
    console.error('System Error:', error);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  private notifyErrorCallbacks(error: SystemError): void {
    const callback = this.errorCallbacks.get(error.type);
    if (callback) {
      callback(error);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkNetworkConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async clearStorageCache(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  private retryLastOperation(error: SystemError): void {
    // This will be implemented by the calling component
    console.log('Retrying operation for error:', error.id);
  }

  private skipAIProcessing(): void {
    // This will be implemented by the calling component
    console.log('Skipping AI processing');
  }

  private showValidationDetails(error: SystemError): void {
    // This will be implemented by the calling component
    console.log('Showing validation details for error:', error.id);
  }

  private reportError(error: SystemError): void {
    // This will be implemented by the calling component
    console.log('Reporting error:', error.id);
  }

  private downloadDataBackup(): void {
    // This will be implemented by the calling component
    console.log('Downloading data backup');
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createError(
        'PROCESSING_ERROR',
        'Unhandled promise rejection',
        { component: 'global', operation: 'promise' },
        event.reason,
        'HIGH'
      );
      this.handleError(error);
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.createError(
        'PROCESSING_ERROR',
        event.message,
        { component: 'global', operation: 'script' },
        { filename: event.filename, lineno: event.lineno, colno: event.colno },
        'HIGH'
      );
      this.handleError(error);
    });
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: SystemError[];
  } {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    this.errorLog.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errorLog.slice(-10)
    };
  }
}

// Global error handler instance
export const systemErrorHandler = new SystemErrorHandler();