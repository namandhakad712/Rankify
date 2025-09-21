<template>
  <div class="error-feedback-system">
    <!-- Toast Notifications -->
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="feedback in visibleFeedbacks"
          :key="feedback.id"
          :class="[
            'toast',
            `toast-${feedback.type}`,
            { 'toast-dismissible': feedback.dismissible }
          ]"
        >
          <div class="toast-header">
            <Icon :name="getIconName(feedback.type)" class="toast-icon" />
            <h4 class="toast-title">{{ feedback.title }}</h4>
            <button
              v-if="feedback.dismissible"
              @click="dismissFeedback(feedback.id)"
              class="toast-dismiss"
              aria-label="Dismiss"
            >
              <Icon name="x" />
            </button>
          </div>
          
          <div class="toast-body">
            <p class="toast-message">{{ feedback.message }}</p>
            
            <!-- Details (collapsible) -->
            <div v-if="feedback.details" class="toast-details">
              <button
                @click="toggleDetails(feedback.id)"
                class="details-toggle"
              >
                <Icon :name="expandedDetails.has(feedback.id) ? 'chevron-up' : 'chevron-down'" />
                {{ expandedDetails.has(feedback.id) ? 'Hide' : 'Show' }} Details
              </button>
              
              <div v-if="expandedDetails.has(feedback.id)" class="details-content">
                <pre>{{ feedback.details }}</pre>
              </div>
            </div>
            
            <!-- Recovery Actions -->
            <div v-if="feedback.actions && feedback.actions.length > 0" class="toast-actions">
              <button
                v-for="action in feedback.actions"
                :key="action.type"
                @click="executeAction(action, feedback.id)"
                :class="[
                  'action-button',
                  `action-${action.type}`,
                  { 'action-loading': loadingActions.has(`${feedback.id}-${action.type}`) }
                ]"
                :disabled="loadingActions.has(`${feedback.id}-${action.type}`)"
              >
                <Icon v-if="loadingActions.has(`${feedback.id}-${action.type}`)" name="loader" class="spinning" />
                <Icon v-else :name="getActionIcon(action.type)" />
                {{ action.label }}
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Error Statistics Modal -->
    <Modal v-if="showStatistics" @close="showStatistics = false">
      <template #header>
        <h3>Error Statistics</h3>
      </template>
      
      <template #body>
        <div class="error-statistics">
          <div class="stats-summary">
            <div class="stat-item">
              <span class="stat-label">Total Errors:</span>
              <span class="stat-value">{{ statistics.totalErrors }}</span>
            </div>
          </div>
          
          <div class="stats-charts">
            <div class="chart-section">
              <h4>Errors by Category</h4>
              <div class="chart-bars">
                <div
                  v-for="(count, category) in statistics.errorsByCategory"
                  :key="category"
                  class="chart-bar"
                >
                  <span class="bar-label">{{ category }}</span>
                  <div class="bar-container">
                    <div
                      class="bar-fill"
                      :style="{ width: `${(count / statistics.totalErrors) * 100}%` }"
                    ></div>
                    <span class="bar-value">{{ count }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="chart-section">
              <h4>Errors by Severity</h4>
              <div class="chart-bars">
                <div
                  v-for="(count, severity) in statistics.errorsBySeverity"
                  :key="severity"
                  class="chart-bar"
                >
                  <span class="bar-label">{{ severity }}</span>
                  <div class="bar-container">
                    <div
                      :class="['bar-fill', `severity-${severity}`]"
                      :style="{ width: `${(count / statistics.totalErrors) * 100}%` }"
                    ></div>
                    <span class="bar-value">{{ count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="recent-errors">
            <h4>Recent Errors</h4>
            <div class="error-list">
              <div
                v-for="error in statistics.recentErrors"
                :key="error.code"
                class="error-item"
              >
                <div class="error-header">
                  <span :class="['error-severity', `severity-${error.severity}`]">
                    {{ error.severity }}
                  </span>
                  <span class="error-code">{{ error.code }}</span>
                  <span class="error-time">{{ formatTime(error.context.timestamp) }}</span>
                </div>
                <div class="error-message">{{ error.message }}</div>
                <div class="error-operation">{{ error.context.operation }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <template #footer>
        <button @click="clearErrorLog" class="btn btn-danger">Clear Error Log</button>
        <button @click="showStatistics = false" class="btn btn-secondary">Close</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { errorHandler, type UserFeedback, type RecoveryAction } from '../utils/errorHandlingSystem'

interface FeedbackWithId extends UserFeedback {
  id: string;
  timestamp: Date;
}

// Reactive state
const visibleFeedbacks = ref<FeedbackWithId[]>([])
const expandedDetails = reactive(new Set<string>())
const loadingActions = reactive(new Set<string>())
const showStatistics = ref(false)
const statistics = ref(errorHandler.getErrorStatistics())

// Auto-hide timers
const autoHideTimers = new Map<string, NodeJS.Timeout>()

// Setup error handler callback
onMounted(() => {
  errorHandler.onFeedback(handleFeedback)
})

onUnmounted(() => {
  // Clear all timers
  autoHideTimers.forEach(timer => clearTimeout(timer))
  autoHideTimers.clear()
})

/**
 * Handle new feedback from error handler
 */
function handleFeedback(feedback: UserFeedback): void {
  const feedbackWithId: FeedbackWithId = {
    ...feedback,
    id: generateId(),
    timestamp: new Date()
  }
  
  visibleFeedbacks.value.push(feedbackWithId)
  
  // Set up auto-hide timer if specified
  if (feedback.autoHide) {
    const timer = setTimeout(() => {
      dismissFeedback(feedbackWithId.id)
    }, feedback.autoHide)
    
    autoHideTimers.set(feedbackWithId.id, timer)
  }
  
  // Limit number of visible feedbacks
  if (visibleFeedbacks.value.length > 5) {
    const oldest = visibleFeedbacks.value.shift()
    if (oldest) {
      const timer = autoHideTimers.get(oldest.id)
      if (timer) {
        clearTimeout(timer)
        autoHideTimers.delete(oldest.id)
      }
    }
  }
}

/**
 * Dismiss a feedback notification
 */
function dismissFeedback(id: string): void {
  const index = visibleFeedbacks.value.findIndex(f => f.id === id)
  if (index !== -1) {
    visibleFeedbacks.value.splice(index, 1)
    expandedDetails.delete(id)
    
    // Clear timer
    const timer = autoHideTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      autoHideTimers.delete(id)
    }
  }
}

/**
 * Toggle details visibility
 */
function toggleDetails(id: string): void {
  if (expandedDetails.has(id)) {
    expandedDetails.delete(id)
  } else {
    expandedDetails.add(id)
  }
}

/**
 * Execute recovery action
 */
async function executeAction(action: RecoveryAction, feedbackId: string): Promise<void> {
  const actionKey = `${feedbackId}-${action.type}`
  loadingActions.add(actionKey)
  
  try {
    await action.action()
    
    // Dismiss feedback after successful action (except for manual actions)
    if (action.type !== 'manual') {
      dismissFeedback(feedbackId)
    }
  } catch (error) {
    console.error('Recovery action failed:', error)
    // The error handler will create a new feedback for this failure
  } finally {
    loadingActions.delete(actionKey)
  }
}

/**
 * Get icon name for feedback type
 */
function getIconName(type: UserFeedback['type']): string {
  switch (type) {
    case 'error': return 'alert-circle'
    case 'warning': return 'alert-triangle'
    case 'info': return 'info'
    case 'success': return 'check-circle'
    default: return 'info'
  }
}

/**
 * Get icon name for action type
 */
function getActionIcon(type: RecoveryAction['type']): string {
  switch (type) {
    case 'retry': return 'refresh-cw'
    case 'fallback': return 'shield'
    case 'skip': return 'skip-forward'
    case 'manual': return 'edit'
    case 'reload': return 'rotate-ccw'
    default: return 'arrow-right'
  }
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString()
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Show error statistics
 */
function showErrorStatistics(): void {
  statistics.value = errorHandler.getErrorStatistics()
  showStatistics.value = true
}

/**
 * Clear error log
 */
function clearErrorLog(): void {
  errorHandler.clearErrorLog()
  statistics.value = errorHandler.getErrorStatistics()
  showStatistics.value = false
}

// Expose methods for parent components
defineExpose({
  showErrorStatistics,
  clearErrorLog
})
</script>

<style scoped>
.error-feedback-system {
  position: relative;
  z-index: 9999;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  z-index: 10000;
}

.toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 12px;
  overflow: hidden;
  border-left: 4px solid;
}

.toast-error {
  border-left-color: #ef4444;
}

.toast-warning {
  border-left-color: #f59e0b;
}

.toast-info {
  border-left-color: #3b82f6;
}

.toast-success {
  border-left-color: #10b981;
}

.toast-header {
  display: flex;
  align-items: center;
  padding: 12px 16px 8px;
  background: rgba(0, 0, 0, 0.02);
}

.toast-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  flex-shrink: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.toast-dismiss {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-dismiss:hover {
  background: rgba(0, 0, 0, 0.1);
}

.toast-body {
  padding: 0 16px 12px;
}

.toast-message {
  font-size: 13px;
  line-height: 1.4;
  margin: 0 0 8px;
  color: #374151;
}

.toast-details {
  margin-top: 8px;
}

.details-toggle {
  background: none;
  border: none;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.details-toggle:hover {
  color: #374151;
}

.details-content {
  margin-top: 8px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.details-content pre {
  font-size: 11px;
  line-height: 1.3;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.toast-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-retry {
  border-color: #3b82f6;
  color: #3b82f6;
}

.action-retry:hover:not(:disabled) {
  background: #eff6ff;
}

.action-fallback {
  border-color: #f59e0b;
  color: #f59e0b;
}

.action-fallback:hover:not(:disabled) {
  background: #fffbeb;
}

.action-manual {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.action-manual:hover:not(:disabled) {
  background: #f5f3ff;
}

.action-reload {
  border-color: #ef4444;
  color: #ef4444;
}

.action-reload:hover:not(:disabled) {
  background: #fef2f2;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Toast transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Error Statistics Modal Styles */
.error-statistics {
  max-height: 70vh;
  overflow-y: auto;
}

.stats-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.stats-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  font-size: 12px;
  min-width: 80px;
  text-transform: capitalize;
}

.bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 20px;
}

.bar-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  min-width: 2px;
}

.severity-low { background: #10b981; }
.severity-medium { background: #f59e0b; }
.severity-high { background: #ef4444; }
.severity-critical { background: #7c2d12; }

.bar-value {
  font-size: 11px;
  color: #6b7280;
  min-width: 20px;
}

.recent-errors {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.recent-errors h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.error-item {
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.error-severity {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

.error-code {
  font-size: 11px;
  font-family: monospace;
  color: #6b7280;
}

.error-time {
  font-size: 11px;
  color: #9ca3af;
  margin-left: auto;
}

.error-message {
  font-size: 12px;
  color: #374151;
  margin-bottom: 2px;
}

.error-operation {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
}

/* Responsive design */
@media (max-width: 768px) {
  .toast-container {
    left: 20px;
    right: 20px;
    max-width: none;
  }
  
  .stats-charts {
    grid-template-columns: 1fr;
  }
}
</style>