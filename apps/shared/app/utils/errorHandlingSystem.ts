/**
 * Comprehensive Error Handling System for Advanced Diagram Detection
 * Provides centralized error management, user feedback, and recovery mechanisms
 */

export interface ErrorContext {
  operation: string;
  component: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'api' | 'validation' | 'processing' | 'storage' | 'network' | 'user';
  recoverable: boolean;
  context: ErrorContext;
  originalError?: Error;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'skip' | 'manual' | 'reload';
  label: string;
  description: string;
  action: () => Promise<void>;
  priority: number;
}

export interface UserFeedback {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  details?: string;
  actions?: RecoveryAction[];
  dismissible: boolean;
  autoHide?: number;
}

/**
 * Centralized error handling system
 */
export class ErrorHandlingSystem {
  private errorLog: ErrorDetails[] = [];
  private feedbackCallbacks: ((feedback: UserFeedback) => void)[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts = 3;

  /**
   * Register callback for user feedback notifications
   */
  onFeedback(callback: (feedback: UserFeedback) => void): void {
    this.feedbackCallbacks.push(callback);
  }

  /**
   * Handle error with comprehensive processing and user feedback
   */
  async handleError(error: Error | ErrorDetails, context: ErrorContext): Promise<void> {
    const errorDetails = this.processError(error, context);
    this.logError(errorDetails);
    
    const feedback = this.generateUserFeedback(errorDetails);
    this.notifyUser(feedback);

    // Attempt automatic recovery if possible
    if (errorDetails.recoverable) {
      await this.attemptRecovery(errorDetails);
    }
  }

  /**
   * Process raw error into structured ErrorDetails
   */
  private processError(error: Error | ErrorDetails, context: ErrorContext): ErrorDetails {
    if ('code' in error) {
      return error as ErrorDetails;
    }

    // Categorize and structure the error
    const errorDetails: ErrorDetails = {
      code: this.generateErrorCode(error, context),
      message: error.message || 'An unexpected error occurred',
      severity: this.determineSeverity(error, context),
      category: this.categorizeError(error, context),
      recoverable: this.isRecoverable(error, context),
      context,
      originalError: error
    };

    return errorDetails;
  }

  /**
   * Generate user-friendly feedback from error details
   */
  private generateUserFeedback(error: ErrorDetails): UserFeedback {
    const feedback: UserFeedback = {
      type: this.mapSeverityToFeedbackType(error.severity),
      title: this.generateUserTitle(error),
      message: this.generateUserMessage(error),
      details: this.generateUserDetails(error),
      actions: this.generateRecoveryActions(error),
      dismissible: error.severity !== 'critical',
      autoHide: error.severity === 'low' ? 5000 : undefined
    };

    return feedback;
  }

  /**
   * Generate recovery actions based on error type
   */
  private generateRecoveryActions(error: ErrorDetails): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.category) {
      case 'api':
        actions.push({
          type: 'retry',
          label: 'Retry Request',
          description: 'Attempt the API request again',
          action: () => this.retryApiRequest(error),
          priority: 1
        });
        
        if (error.code.includes('GEMINI')) {
          actions.push({
            type: 'fallback',
            label: 'Use Local Detection',
            description: 'Switch to local diagram detection',
            action: () => this.fallbackToLocalDetection(error),
            priority: 2
          });
        }
        break;

      case 'processing':
        actions.push({
          type: 'retry',
          label: 'Retry Processing',
          description: 'Attempt to process the file again',
          action: () => this.retryProcessing(error),
          priority: 1
        });
        
        actions.push({
          type: 'skip',
          label: 'Skip This Step',
          description: 'Continue without this processing step',
          action: () => this.skipProcessingStep(error),
          priority: 3
        });
        break;

      case 'validation':
        actions.push({
          type: 'manual',
          label: 'Manual Review',
          description: 'Review and correct the data manually',
          action: () => this.openManualReview(error),
          priority: 1
        });
        break;

      case 'storage':
        actions.push({
          type: 'retry',
          label: 'Retry Save',
          description: 'Attempt to save the data again',
          action: () => this.retryStorage(error),
          priority: 1
        });
        break;

      case 'network':
        actions.push({
          type: 'retry',
          label: 'Check Connection',
          description: 'Verify network connection and retry',
          action: () => this.retryWithNetworkCheck(error),
          priority: 1
        });
        break;
    }

    // Always provide reload option for critical errors
    if (error.severity === 'critical') {
      actions.push({
        type: 'reload',
        label: 'Reload Application',
        description: 'Reload the application to recover',
        action: () => this.reloadApplication(),
        priority: 10
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Attempt automatic recovery based on error type
   */
  private async attemptRecovery(error: ErrorDetails): Promise<void> {
    const retryKey = `${error.code}-${error.context.operation}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts >= this.maxRetryAttempts) {
      console.warn(`Max retry attempts reached for ${retryKey}`);
      return;
    }

    this.retryAttempts.set(retryKey, attempts + 1);

    try {
      switch (error.category) {
        case 'api':
          await this.autoRetryApiRequest(error);
          break;
        case 'processing':
          await this.autoRetryProcessing(error);
          break;
        case 'storage':
          await this.autoRetryStorage(error);
          break;
      }
      
      // Clear retry count on success
      this.retryAttempts.delete(retryKey);
    } catch (retryError) {
      console.error(`Auto-recovery failed for ${retryKey}:`, retryError);
    }
  }

  // Error categorization methods
  private generateErrorCode(error: Error, context: ErrorContext): string {
    const prefix = context.component.toUpperCase();
    const operation = context.operation.toUpperCase().replace(/\s+/g, '_');
    const timestamp = Date.now().toString().slice(-6);
    
    return `${prefix}_${operation}_${timestamp}`;
  }

  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // API quota errors are medium severity
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return 'medium';
    }
    
    // Network errors are medium severity
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'medium';
    }
    
    // Validation errors are low severity
    if (context.operation.includes('validation')) {
      return 'low';
    }
    
    // Storage errors are high severity
    if (context.operation.includes('storage') || context.operation.includes('database')) {
      return 'high';
    }
    
    // Processing errors are medium severity
    if (context.operation.includes('processing')) {
      return 'medium';
    }
    
    // Default to medium severity
    return 'medium';
  }

  private categorizeError(error: Error, context: ErrorContext): ErrorDetails['category'] {
    const message = error.message.toLowerCase();
    const operation = context.operation.toLowerCase();
    
    if (message.includes('api') || message.includes('gemini') || message.includes('fetch')) {
      return 'api';
    }
    
    if (operation.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    if (operation.includes('processing') || operation.includes('pdf')) {
      return 'processing';
    }
    
    if (operation.includes('storage') || operation.includes('database')) {
      return 'storage';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'network';
    }
    
    return 'user';
  }

  private isRecoverable(error: Error, context: ErrorContext): boolean {
    const message = error.message.toLowerCase();
    
    // Network and API errors are usually recoverable
    if (message.includes('network') || message.includes('api') || message.includes('fetch')) {
      return true;
    }
    
    // Processing errors are often recoverable
    if (context.operation.includes('processing')) {
      return true;
    }
    
    // Storage errors might be recoverable
    if (context.operation.includes('storage')) {
      return true;
    }
    
    // Validation errors are recoverable through manual intervention
    if (context.operation.includes('validation')) {
      return true;
    }
    
    return false;
  }

  // User feedback generation methods
  private mapSeverityToFeedbackType(severity: ErrorDetails['severity']): UserFeedback['type'] {
    switch (severity) {
      case 'low': return 'warning';
      case 'medium': return 'error';
      case 'high': return 'error';
      case 'critical': return 'error';
    }
  }

  private generateUserTitle(error: ErrorDetails): string {
    switch (error.category) {
      case 'api':
        return 'API Service Error';
      case 'processing':
        return 'Processing Error';
      case 'validation':
        return 'Validation Error';
      case 'storage':
        return 'Storage Error';
      case 'network':
        return 'Network Error';
      default:
        return 'Application Error';
    }
  }

  private generateUserMessage(error: ErrorDetails): string {
    switch (error.category) {
      case 'api':
        if (error.code.includes('GEMINI')) {
          return 'Unable to connect to the diagram detection service. This may be due to network issues or service availability.';
        }
        return 'There was a problem connecting to external services. Please check your internet connection.';
        
      case 'processing':
        return 'There was an issue processing your file. The file may be corrupted or in an unsupported format.';
        
      case 'validation':
        return 'Some data validation checks failed. Please review and correct the highlighted issues.';
        
      case 'storage':
        return 'Unable to save your data. This may be due to insufficient storage space or browser limitations.';
        
      case 'network':
        return 'Network connection issues detected. Please check your internet connection and try again.';
        
      default:
        return 'An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.';
    }
  }

  private generateUserDetails(error: ErrorDetails): string {
    let details = `Error Code: ${error.code}\n`;
    details += `Time: ${error.context.timestamp.toLocaleString()}\n`;
    details += `Operation: ${error.context.operation}\n`;
    
    if (error.originalError) {
      details += `Technical Details: ${error.originalError.message}`;
    }
    
    return details;
  }

  // Recovery action implementations
  private async retryApiRequest(error: ErrorDetails): Promise<void> {
    // Implementation would depend on the specific API request
    console.log('Retrying API request for:', error.context.operation);
  }

  private async fallbackToLocalDetection(error: ErrorDetails): Promise<void> {
    // Switch to local diagram detection
    console.log('Falling back to local detection for:', error.context.operation);
  }

  private async retryProcessing(error: ErrorDetails): Promise<void> {
    // Retry the processing operation
    console.log('Retrying processing for:', error.context.operation);
  }

  private async skipProcessingStep(error: ErrorDetails): Promise<void> {
    // Skip the current processing step
    console.log('Skipping processing step for:', error.context.operation);
  }

  private async openManualReview(error: ErrorDetails): Promise<void> {
    // Open manual review interface
    console.log('Opening manual review for:', error.context.operation);
  }

  private async retryStorage(error: ErrorDetails): Promise<void> {
    // Retry storage operation
    console.log('Retrying storage for:', error.context.operation);
  }

  private async retryWithNetworkCheck(error: ErrorDetails): Promise<void> {
    // Check network and retry
    console.log('Checking network and retrying for:', error.context.operation);
  }

  private async reloadApplication(): Promise<void> {
    window.location.reload();
  }

  // Auto-recovery implementations
  private async autoRetryApiRequest(error: ErrorDetails): Promise<void> {
    // Implement exponential backoff for API retries
    const delay = Math.pow(2, this.retryAttempts.get(`${error.code}-${error.context.operation}`) || 0) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // The actual retry would be handled by the calling component
    console.log(`Auto-retrying API request after ${delay}ms delay`);
  }

  private async autoRetryProcessing(error: ErrorDetails): Promise<void> {
    // Auto-retry processing with a short delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Auto-retrying processing operation');
  }

  private async autoRetryStorage(error: ErrorDetails): Promise<void> {
    // Auto-retry storage operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Auto-retrying storage operation');
  }

  // Utility methods
  private logError(error: ErrorDetails): void {
    this.errorLog.push(error);
    
    // Keep only last 100 errors to prevent memory issues
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
    
    // Log to console for debugging
    console.error('Error logged:', error);
  }

  private notifyUser(feedback: UserFeedback): void {
    this.feedbackCallbacks.forEach(callback => {
      try {
        callback(feedback);
      } catch (error) {
        console.error('Error in feedback callback:', error);
      }
    });
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorDetails[];
  } {
    const stats = {
      totalErrors: this.errorLog.length,
      errorsByCategory: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      recentErrors: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(error => {
      stats.errorsByCategory[error.category] = (stats.errorsByCategory[error.category] || 0) + 1;
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.retryAttempts.clear();
  }
}

// Global error handling system instance
export const errorHandler = new ErrorHandlingSystem();