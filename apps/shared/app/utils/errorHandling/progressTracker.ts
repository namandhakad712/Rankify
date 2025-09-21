/**
 * Progress Tracker for Long-Running Operations
 * Provides real-time progress updates and user feedback
 */

export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  weight: number; // Relative weight for progress calculation
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  subSteps?: ProgressStep[];
}

export interface ProgressState {
  operationId: string;
  operationName: string;
  totalSteps: number;
  completedSteps: number;
  currentStep?: ProgressStep;
  overallProgress: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
  startTime: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface ProgressCallback {
  onProgress: (state: ProgressState) => void;
  onStepStart: (step: ProgressStep) => void;
  onStepComplete: (step: ProgressStep) => void;
  onStepFailed: (step: ProgressStep, error: string) => void;
  onComplete: (state: ProgressState) => void;
  onError: (state: ProgressState, error: string) => void;
}

export class ProgressTracker {
  private operations: Map<string, ProgressState> = new Map();
  private callbacks: Map<string, Partial<ProgressCallback>> = new Map();
  private stepTimings: Map<string, number[]> = new Map(); // For time estimation

  /**
   * Start tracking a new operation
   */
  startOperation(
    operationId: string,
    operationName: string,
    steps: ProgressStep[]
  ): void {
    const state: ProgressState = {
      operationId,
      operationName,
      totalSteps: this.countTotalSteps(steps),
      completedSteps: 0,
      overallProgress: 0,
      startTime: new Date(),
      status: 'running'
    };

    this.operations.set(operationId, state);
    this.notifyProgress(operationId);
  }

  /**
   * Update step status and progress
   */
  updateStep(
    operationId: string,
    stepId: string,
    status: ProgressStep['status'],
    error?: string
  ): void {
    const state = this.operations.get(operationId);
    if (!state) return;

    const step = this.findStep(state, stepId);
    if (!step) return;

    const previousStatus = step.status;
    step.status = status;
    step.error = error;

    // Update timestamps
    if (status === 'in_progress' && previousStatus === 'pending') {
      step.startTime = new Date();
      state.currentStep = step;
      this.notifyStepStart(operationId, step);
    } else if (['completed', 'failed', 'skipped'].includes(status)) {
      step.endTime = new Date();
      
      if (step.startTime) {
        const duration = step.endTime.getTime() - step.startTime.getTime();
        this.recordStepTiming(step.name, duration);
      }

      if (status === 'completed') {
        state.completedSteps++;
        this.notifyStepComplete(operationId, step);
      } else if (status === 'failed') {
        this.notifyStepFailed(operationId, step, error || 'Unknown error');
      }
    }

    // Update overall progress
    this.updateOverallProgress(operationId);
    this.notifyProgress(operationId);

    // Check if operation is complete
    if (this.isOperationComplete(state)) {
      this.completeOperation(operationId);
    }
  }

  /**
   * Add a sub-step to an existing step
   */
  addSubStep(
    operationId: string,
    parentStepId: string,
    subStep: ProgressStep
  ): void {
    const state = this.operations.get(operationId);
    if (!state) return;

    const parentStep = this.findStep(state, parentStepId);
    if (!parentStep) return;

    if (!parentStep.subSteps) {
      parentStep.subSteps = [];
    }
    parentStep.subSteps.push(subStep);

    // Update total steps count
    state.totalSteps++;
    this.updateOverallProgress(operationId);
    this.notifyProgress(operationId);
  }

  /**
   * Cancel an operation
   */
  cancelOperation(operationId: string): void {
    const state = this.operations.get(operationId);
    if (!state) return;

    state.status = 'cancelled';
    state.error = 'Operation cancelled by user';
    
    this.notifyError(operationId, 'Operation cancelled by user');
  }

  /**
   * Fail an operation
   */
  failOperation(operationId: string, error: string): void {
    const state = this.operations.get(operationId);
    if (!state) return;

    state.status = 'failed';
    state.error = error;
    
    this.notifyError(operationId, error);
  }

  /**
   * Register progress callbacks
   */
  onProgress(operationId: string, callbacks: Partial<ProgressCallback>): () => void {
    this.callbacks.set(operationId, callbacks);
    
    return () => {
      this.callbacks.delete(operationId);
    };
  }

  /**
   * Get current operation state
   */
  getOperationState(operationId: string): ProgressState | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): ProgressState[] {
    return Array.from(this.operations.values()).filter(
      state => state.status === 'running'
    );
  }

  /**
   * Clean up completed operations
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [operationId, state] of this.operations.entries()) {
      if (state.status !== 'running' && state.startTime < cutoff) {
        this.operations.delete(operationId);
        this.callbacks.delete(operationId);
      }
    }
  }

  // Private methods

  private countTotalSteps(steps: ProgressStep[]): number {
    return steps.reduce((total, step) => {
      return total + 1 + (step.subSteps ? this.countTotalSteps(step.subSteps) : 0);
    }, 0);
  }

  private findStep(state: ProgressState, stepId: string): ProgressStep | undefined {
    // This would need to be implemented based on how steps are stored
    // For now, assuming steps are stored in the state
    return undefined; // Placeholder
  }

  private updateOverallProgress(operationId: string): void {
    const state = this.operations.get(operationId);
    if (!state) return;

    state.overallProgress = Math.round((state.completedSteps / state.totalSteps) * 100);
    
    // Estimate time remaining
    if (state.completedSteps > 0) {
      const elapsed = new Date().getTime() - state.startTime.getTime();
      const avgTimePerStep = elapsed / state.completedSteps;
      const remainingSteps = state.totalSteps - state.completedSteps;
      state.estimatedTimeRemaining = Math.round(avgTimePerStep * remainingSteps);
    }
  }

  private isOperationComplete(state: ProgressState): boolean {
    return state.completedSteps >= state.totalSteps;
  }

  private completeOperation(operationId: string): void {
    const state = this.operations.get(operationId);
    if (!state) return;

    state.status = 'completed';
    state.overallProgress = 100;
    state.estimatedTimeRemaining = 0;
    
    this.notifyComplete(operationId);
  }

  private recordStepTiming(stepName: string, duration: number): void {
    if (!this.stepTimings.has(stepName)) {
      this.stepTimings.set(stepName, []);
    }
    
    const timings = this.stepTimings.get(stepName)!;
    timings.push(duration);
    
    // Keep only last 10 timings for each step
    if (timings.length > 10) {
      timings.splice(0, timings.length - 10);
    }
  }

  private getEstimatedStepDuration(stepName: string): number {
    const timings = this.stepTimings.get(stepName);
    if (!timings || timings.length === 0) {
      return 5000; // Default 5 seconds
    }
    
    // Return average of recorded timings
    return timings.reduce((sum, time) => sum + time, 0) / timings.length;
  }

  // Notification methods

  private notifyProgress(operationId: string): void {
    const state = this.operations.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onProgress) {
      callbacks.onProgress(state);
    }
  }

  private notifyStepStart(operationId: string, step: ProgressStep): void {
    const callbacks = this.callbacks.get(operationId);
    if (callbacks?.onStepStart) {
      callbacks.onStepStart(step);
    }
  }

  private notifyStepComplete(operationId: string, step: ProgressStep): void {
    const callbacks = this.callbacks.get(operationId);
    if (callbacks?.onStepComplete) {
      callbacks.onStepComplete(step);
    }
  }

  private notifyStepFailed(operationId: string, step: ProgressStep, error: string): void {
    const callbacks = this.callbacks.get(operationId);
    if (callbacks?.onStepFailed) {
      callbacks.onStepFailed(step, error);
    }
  }

  private notifyComplete(operationId: string): void {
    const state = this.operations.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onComplete) {
      callbacks.onComplete(state);
    }
  }

  private notifyError(operationId: string, error: string): void {
    const state = this.operations.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onError) {
      callbacks.onError(state, error);
    }
  }
}

// Global progress tracker instance
export const progressTracker = new ProgressTracker();