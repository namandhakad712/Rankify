/**
 * Comprehensive Error Handling and User Feedback System
 * Integration file that ties all error handling components together
 */

import { systemErrorHandler, type SystemError, type UserFeedback } from './systemErrorHandler'
import { progressTracker, type ProgressStep, type ProgressState } from './progressTracker'
import { retryMechanism, retryConfigs, type RetryConfig } from './retryMechanism'
import { gracefulDegradation, degradationConfigs, type ServiceStatus } from './gracefulDegradation'

// Initialize services with degradation monitoring
gracefulDegradation.registerService(degradationConfigs.geminiAPI)
gracefulDegradation.registerService(degradationConfigs.databaseService)
gracefulDegradation.registerService(degradationConfigs.networkService)

/**
 * Enhanced error handling wrapper for API operations
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    component: string;
    operation: string;
    serviceName?: string;
    retryConfig?: Partial<RetryConfig>;
    progressId?: string;
    stepId?: string;
  }
): Promise<T> {
  const { component, operation: operationName, serviceName, retryConfig, progressId, stepId } = context;

  try {
    // Update progress if tracking
    if (progressId && stepId) {
      progressTracker.updateStep(progressId, stepId, 'in_progress');
    }

    let result: T;

    if (serviceName) {
      // Execute with graceful degradation
      result = await gracefulDegradation.executeWithDegradation(
        serviceName,
        async () => {
          // Execute with retry mechanism
          const retryResult = await retryMechanism.executeWithRetry(operation, {
            ...retryConfigs.apiCall,
            ...retryConfig,
            onRetry: (attempt, error) => {
              systemErrorHandler.showUserFeedback({
                type: 'INFO',
                title: 'Retrying Operation',
                message: `Attempt ${attempt} of ${retryConfig?.maxRetries || 3}...`,
                dismissible: false,
                duration: 2000
              });
            }
          });

          if (!retryResult.success) {
            throw retryResult.error;
          }

          return retryResult.result!;
        }
      );
    } else {
      // Execute with retry only
      const retryResult = await retryMechanism.executeWithRetry(operation, {
        ...retryConfigs.apiCall,
        ...retryConfig
      });

      if (!retryResult.success) {
        throw retryResult.error;
      }

      result = retryResult.result!;
    }

    // Update progress on success
    if (progressId && stepId) {
      progressTracker.updateStep(progressId, stepId, 'completed');
    }

    return result;

  } catch (error: any) {
    // Create system error
    const systemError = systemErrorHandler.createError(
      'API_ERROR',
      error.message || 'Operation failed',
      { component, operation: operationName },
      error,
      'MEDIUM'
    );

    // Update progress on failure
    if (progressId && stepId) {
      progressTracker.updateStep(progressId, stepId, 'failed', error.message);
    }

    // Handle the error (this will show user feedback)
    const recovered = await systemErrorHandler.handleError(systemError);
    
    if (!recovered) {
      throw error;
    }

    // If recovered, try operation one more time
    return await operation();
  }
}

/**
 * Start a tracked operation with progress monitoring
 */
export function startTrackedOperation(
  operationId: string,
  operationName: string,
  steps: ProgressStep[]
): void {
  progressTracker.startOperation(operationId, operationName, steps);
}

/**
 * Update operation progress
 */
export function updateOperationProgress(
  operationId: string,
  stepId: string,
  status: ProgressStep['status'],
  error?: string
): void {
  progressTracker.updateStep(operationId, stepId, status, error);
}

/**
 * Show user feedback message
 */
export function showUserMessage(feedback: Omit<UserFeedback, 'dismissible'>): void {
  systemErrorHandler.showUserFeedback({
    dismissible: true,
    ...feedback
  });
}

/**
 * Show success message
 */
export function showSuccess(title: string, message: string, duration = 5000): void {
  showUserMessage({
    type: 'SUCCESS',
    title,
    message,
    duration
  });
}

/**
 * Show error message
 */
export function showError(title: string, message: string, actions?: UserFeedback['actions']): void {
  showUserMessage({
    type: 'ERROR',
    title,
    message,
    actions,
    persistent: true
  });
}

/**
 * Show warning message
 */
export function showWarning(title: string, message: string, duration = 8000): void {
  showUserMessage({
    type: 'WARNING',
    title,
    message,
    duration
  });
}

/**
 * Show info message
 */
export function showInfo(title: string, message: string, duration = 5000): void {
  showUserMessage({
    type: 'INFO',
    title,
    message,
    duration
  });
}

/**
 * Get service health status
 */
export function getServiceStatus(serviceName: string): ServiceStatus | undefined {
  return gracefulDegradation.getServiceStatus(serviceName);
}

/**
 * Get all service statuses
 */
export function getAllServiceStatuses(): ServiceStatus[] {
  return gracefulDegradation.getAllServiceStatuses();
}

/**
 * Check if a service is available
 */
export function isServiceAvailable(serviceName: string): boolean {
  const status = getServiceStatus(serviceName);
  return status?.available ?? false;
}

/**
 * Force refresh service status
 */
export async function refreshServiceStatus(serviceName: string): Promise<boolean> {
  return await gracefulDegradation.checkServiceHealth(serviceName);
}

/**
 * Get error statistics for monitoring
 */
export function getErrorStatistics() {
  return systemErrorHandler.getErrorStatistics();
}

/**
 * Register error callback
 */
export function onError(errorType: string, callback: (error: SystemError) => void): () => void {
  return systemErrorHandler.onError(errorType, callback);
}

/**
 * Register user feedback callback
 */
export function onUserFeedback(callback: (feedback: UserFeedback) => void): () => void {
  return systemErrorHandler.onUserFeedback(callback);
}

/**
 * Cleanup all error handling resources
 */
export function cleanup(): void {
  gracefulDegradation.cleanup();
  progressTracker.cleanup();
}

// Export all types and classes for advanced usage
export {
  systemErrorHandler,
  progressTracker,
  retryMechanism,
  gracefulDegradation,
  retryConfigs,
  degradationConfigs
};

export type {
  SystemError,
  UserFeedback,
  ProgressStep,
  ProgressState,
  RetryConfig,
  ServiceStatus
};

// Common error handling patterns
export const errorPatterns = {
  /**
   * Handle PDF processing errors
   */
  async handlePDFProcessing<T>(
    operation: () => Promise<T>,
    progressId?: string
  ): Promise<T> {
    return executeWithErrorHandling(operation, {
      component: 'PDFProcessor',
      operation: 'processPDF',
      serviceName: 'network',
      retryConfig: retryConfigs.fileOperation,
      progressId,
      stepId: 'pdf-processing'
    });
  },

  /**
   * Handle Gemini API calls
   */
  async handleGeminiAPI<T>(
    operation: () => Promise<T>,
    progressId?: string
  ): Promise<T> {
    return executeWithErrorHandling(operation, {
      component: 'GeminiClient',
      operation: 'detectDiagrams',
      serviceName: 'gemini-api',
      retryConfig: retryConfigs.apiCall,
      progressId,
      stepId: 'diagram-detection'
    });
  },

  /**
   * Handle database operations
   */
  async handleDatabase<T>(
    operation: () => Promise<T>,
    progressId?: string
  ): Promise<T> {
    return executeWithErrorHandling(operation, {
      component: 'Database',
      operation: 'storeData',
      serviceName: 'database',
      retryConfig: retryConfigs.databaseOperation,
      progressId,
      stepId: 'data-storage'
    });
  },

  /**
   * Handle coordinate validation
   */
  async handleValidation<T>(
    operation: () => Promise<T>,
    progressId?: string
  ): Promise<T> {
    return executeWithErrorHandling(operation, {
      component: 'Validator',
      operation: 'validateCoordinates',
      retryConfig: { maxRetries: 1 },
      progressId,
      stepId: 'validation'
    });
  }
};

// Initialize error handling system
console.log('Error handling system initialized with comprehensive coverage');