/**
 * Progress Tracking System for Long-Running Operations
 * Provides real-time progress updates and user feedback for complex operations
 */

export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  weight: number; // Relative weight for progress calculation
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  error?: Error;
  metadata?: Record<string, any>;
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
  endTime?: Date;
  status: 'not-started' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  steps: ProgressStep[];
}

export interface ProgressCallback {
  onProgress?: (state: ProgressState) => void;
  onStepStart?: (step: ProgressStep, state: ProgressState) => void;
  onStepComplete?: (step: ProgressStep, state: ProgressState) => void;
  onStepFailed?: (step: ProgressStep, error: Error, state: ProgressState) => void;
  onComplete?: (state: ProgressState) => void;
  onFailed?: (error: Error, state: ProgressState) => void;
  onCancelled?: (state: ProgressState) => void;
}

/**
 * Progress tracking system for complex operations
 */
export class ProgressTracker {
  private progressStates: Map<string, ProgressState> = new Map();
  private callbacks: Map<string, ProgressCallback> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start tracking progress for an operation
   */
  startOperation(
    operationId: string,
    operationName: string,
    steps: Omit<ProgressStep, 'status' | 'startTime' | 'endTime'>[],
    callbacks?: ProgressCallback
  ): ProgressState {
    const progressSteps: ProgressStep[] = steps.map(step => ({
      ...step,
      status: 'pending'
    }));

    const state: ProgressState = {
      operationId,
      operationName,
      totalSteps: steps.length,
      completedSteps: 0,
      overallProgress: 0,
      startTime: new Date(),
      status: 'in-progress',
      steps: progressSteps
    };

    this.progressStates.set(operationId, state);
    
    if (callbacks) {
      this.callbacks.set(operationId, callbacks);
    }

    this.notifyProgress(operationId);
    return state;
  }

  /**
   * Start a specific step
   */
  startStep(operationId: string, stepId: string): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'in-progress';
    step.startTime = new Date();
    state.currentStep = step;

    this.updateProgress(operationId);
    this.notifyStepStart(operationId, step);
  }

  /**
   * Complete a specific step
   */
  completeStep(operationId: string, stepId: string, metadata?: Record<string, any>): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'completed';
    step.endTime = new Date();
    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    state.completedSteps++;
    this.updateProgress(operationId);
    this.notifyStepComplete(operationId, step);

    // Check if all steps are completed
    if (state.completedSteps === state.totalSteps) {
      this.completeOperation(operationId);
    }
  }

  /**
   * Fail a specific step
   */
  failStep(operationId: string, stepId: string, error: Error): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'failed';
    step.endTime = new Date();
    step.error = error;

    this.updateProgress(operationId);
    this.notifyStepFailed(operationId, step, error);
  }

  /**
   * Skip a specific step
   */
  skipStep(operationId: string, stepId: string, reason?: string): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'skipped';
    step.endTime = new Date();
    if (reason) {
      step.metadata = { ...step.metadata, skipReason: reason };
    }

    state.completedSteps++;
    this.updateProgress(operationId);
    this.notifyStepComplete(operationId, step);

    // Check if all steps are completed or skipped
    const remainingSteps = state.steps.filter(s => s.status === 'pending' || s.status === 'in-progress');
    if (remainingSteps.length === 0) {
      this.completeOperation(operationId);
    }
  }

  /**
   * Update step progress (for steps with sub-progress)
   */
  updateStepProgress(operationId: string, stepId: string, progress: number, metadata?: Record<string, any>): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata, progress };
    }

    this.updateProgress(operationId);
    this.notifyProgress(operationId);
  }

  /**
   * Complete the entire operation
   */
  completeOperation(operationId: string): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    state.status = 'completed';
    state.endTime = new Date();
    state.overallProgress = 100;
    state.currentStep = undefined;

    this.clearTimer(operationId);
    this.notifyComplete(operationId);
  }

  /**
   * Fail the entire operation
   */
  failOperation(operationId: string, error: Error): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    state.status = 'failed';
    state.endTime = new Date();
    state.currentStep = undefined;

    this.clearTimer(operationId);
    this.notifyFailed(operationId, error);
  }

  /**
   * Cancel the operation
   */
  cancelOperation(operationId: string): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    state.status = 'cancelled';
    state.endTime = new Date();
    state.currentStep = undefined;

    // Mark all pending steps as skipped
    state.steps.forEach(step => {
      if (step.status === 'pending' || step.status === 'in-progress') {
        step.status = 'skipped';
        step.endTime = new Date();
        step.metadata = { ...step.metadata, skipReason: 'Operation cancelled' };
      }
    });

    this.clearTimer(operationId);
    this.notifyCancelled(operationId);
  }

  /**
   * Get current progress state
   */
  getProgress(operationId: string): ProgressState | undefined {
    return this.progressStates.get(operationId);
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): ProgressState[] {
    return Array.from(this.progressStates.values()).filter(
      state => state.status === 'in-progress'
    );
  }

  /**
   * Clean up completed operations
   */
  cleanup(operationId?: string): void {
    if (operationId) {
      this.progressStates.delete(operationId);
      this.callbacks.delete(operationId);
      this.clearTimer(operationId);
    } else {
      // Clean up all completed operations older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      for (const [id, state] of this.progressStates.entries()) {
        if (state.status !== 'in-progress' && state.endTime && state.endTime < oneHourAgo) {
          this.progressStates.delete(id);
          this.callbacks.delete(id);
          this.clearTimer(id);
        }
      }
    }
  }

  // Private methods
  private updateProgress(operationId: string): void {
    const state = this.progressStates.get(operationId);
    if (!state) return;

    // Calculate weighted progress
    const totalWeight = state.steps.reduce((sum, step) => sum + step.weight, 0);
    let completedWeight = 0;

    state.steps.forEach(step => {
      if (step.status === 'completed' || step.status === 'skipped') {
        completedWeight += step.weight;
      } else if (step.status === 'in-progress' && step.metadata?.progress) {
        completedWeight += step.weight * (step.metadata.progress / 100);
      }
    });

    state.overallProgress = Math.round((completedWeight / totalWeight) * 100);

    // Estimate time remaining
    if (state.overallProgress > 0) {
      const elapsedTime = Date.now() - state.startTime.getTime();
      const estimatedTotalTime = (elapsedTime / state.overallProgress) * 100;
      state.estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsedTime);
    }

    this.notifyProgress(operationId);
  }

  private clearTimer(operationId: string): void {
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
    }
  }

  // Notification methods
  private notifyProgress(operationId: string): void {
    const state = this.progressStates.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onProgress) {
      callbacks.onProgress(state);
    }
  }

  private notifyStepStart(operationId: string, step: ProgressStep): void {
    const state = this.progressStates.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onStepStart) {
      callbacks.onStepStart(step, state);
    }
  }

  private notifyStepComplete(operationId: string, step: ProgressStep): void {
    const state = this.progressStates.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onStepComplete) {
      callbacks.onStepComplete(step, state);
    }
  }

  private notifyStepFailed(operationId: string, step: ProgressStep, error: Error): void {
    const state = this.progressStates.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onStepFailed) {
      callbacks.onStepFailed(step, error, state);
    }
  }

  private notifyComplete(operationId: string): void {
    const state = this.progressStates.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onComplete) {
      callbacks.onComplete(state);
    }
  }

  private notifyFailed(operationId: string, error: Error): void {
    const state = this.progressStates.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onFailed) {
      callbacks.onFailed(error, state);
    }
  }

  private notifyCancelled(operationId: string): void {
    const state = this.progressStates.get(operationId);
    const callbacks = this.callbacks.get(operationId);
    
    if (state && callbacks?.onCancelled) {
      callbacks.onCancelled(state);
    }
  }
}

// Global progress tracker instance
export const progressTracker = new ProgressTracker();

/**
 * Predefined progress steps for common operations
 */
export const ProgressSteps = {
  PDF_PROCESSING: [
    { id: 'pdf-validation', name: 'Validating PDF', description: 'Checking file format and integrity', weight: 10 },
    { id: 'pdf-loading', name: 'Loading PDF', description: 'Loading PDF document', weight: 15 },
    { id: 'page-extraction', name: 'Extracting Pages', description: 'Converting pages to images', weight: 25 },
    { id: 'diagram-detection', name: 'Detecting Diagrams', description: 'Analyzing pages for diagrams', weight: 30 },
    { id: 'coordinate-validation', name: 'Validating Coordinates', description: 'Checking diagram coordinates', weight: 10 },
    { id: 'data-storage', name: 'Saving Data', description: 'Storing questions and coordinates', weight: 10 }
  ],

  MANUAL_REVIEW: [
    { id: 'data-loading', name: 'Loading Data', description: 'Loading questions and diagrams', weight: 20 },
    { id: 'interface-setup', name: 'Setting Up Interface', description: 'Preparing review interface', weight: 15 },
    { id: 'diagram-rendering', name: 'Rendering Diagrams', description: 'Displaying diagram overlays', weight: 25 },
    { id: 'validation-checks', name: 'Running Validation', description: 'Checking data integrity', weight: 20 },
    { id: 'interface-ready', name: 'Interface Ready', description: 'Review interface is ready', weight: 20 }
  ],

  TEST_CONFIGURATION: [
    { id: 'preset-loading', name: 'Loading Presets', description: 'Loading CBT presets', weight: 15 },
    { id: 'compatibility-check', name: 'Checking Compatibility', description: 'Validating preset compatibility', weight: 20 },
    { id: 'question-assignment', name: 'Assigning Questions', description: 'Organizing questions by sections', weight: 30 },
    { id: 'configuration-validation', name: 'Validating Configuration', description: 'Checking test configuration', weight: 20 },
    { id: 'test-generation', name: 'Generating Test', description: 'Creating final test package', weight: 15 }
  ],

  DATA_MIGRATION: [
    { id: 'data-analysis', name: 'Analyzing Data', description: 'Analyzing existing data format', weight: 15 },
    { id: 'backup-creation', name: 'Creating Backup', description: 'Backing up existing data', weight: 10 },
    { id: 'coordinate-conversion', name: 'Converting Coordinates', description: 'Converting to coordinate format', weight: 40 },
    { id: 'data-validation', name: 'Validating Migration', description: 'Checking migrated data', weight: 20 },
    { id: 'cleanup', name: 'Cleaning Up', description: 'Finalizing migration', weight: 15 }
  ]
};