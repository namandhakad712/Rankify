<template>
  <div class="user-feedback-system">
    <!-- Progress Indicators -->
    <div v-if="activeOperations.length > 0" class="progress-container">
      <div 
        v-for="operation in activeOperations" 
        :key="operation.operationId"
        class="progress-item"
      >
        <div class="progress-header">
          <h4>{{ operation.operationName }}</h4>
          <button 
            v-if="operation.status === 'running'"
            @click="cancelOperation(operation.operationId)"
            class="cancel-btn"
          >
            Cancel
          </button>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: `${operation.overallProgress}%` }"
            ></div>
          </div>
          <span class="progress-text">{{ operation.overallProgress }}%</span>
        </div>
        
        <div class="progress-details">
          <div v-if="operation.currentStep" class="current-step">
            <span class="step-name">{{ operation.currentStep.name }}</span>
            <span class="step-description">{{ operation.currentStep.description }}</span>
          </div>
          
          <div class="progress-stats">
            <span>{{ operation.completedSteps }} of {{ operation.totalSteps }} steps</span>
            <span v-if="operation.estimatedTimeRemaining">
              ~{{ formatTime(operation.estimatedTimeRemaining) }} remaining
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- User Feedback Messages -->
    <div class="feedback-container">
      <transition-group name="feedback" tag="div">
        <div
          v-for="feedback in visibleFeedback"
          :key="feedback.id"
          :class="[
            'feedback-item',
            `feedback-${feedback.type.toLowerCase()}`,
            { 'feedback-persistent': feedback.persistent }
          ]"
        >
          <div class="feedback-icon">
            <component :is="getFeedbackIcon(feedback.type)" />
          </div>
          
          <div class="feedback-content">
            <h4 v-if="feedback.title" class="feedback-title">
              {{ feedback.title }}
            </h4>
            <p class="feedback-message">{{ feedback.message }}</p>
            
            <div v-if="feedback.actions && feedback.actions.length > 0" class="feedback-actions">
              <button
                v-for="action in feedback.actions"
                :key="action.label"
                :class="['feedback-action', `action-${action.style}`]"
                @click="handleAction(action, feedback)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
          
          <button
            v-if="feedback.dismissible"
            @click="dismissFeedback(feedback.id)"
            class="feedback-dismiss"
          >
            ×
          </button>
        </div>
      </transition-group>
    </div>

    <!-- Error Details Modal -->
    <div v-if="showErrorDetails" class="error-details-modal" @click="closeErrorDetails">
      <div class="error-details-content" @click.stop>
        <div class="error-details-header">
          <h3>Error Details</h3>
          <button @click="closeErrorDetails" class="close-btn">×</button>
        </div>
        
        <div class="error-details-body">
          <div class="error-info">
            <div class="error-field">
              <label>Error ID:</label>
              <span>{{ selectedError?.id }}</span>
            </div>
            <div class="error-field">
              <label>Type:</label>
              <span>{{ selectedError?.type }}</span>
            </div>
            <div class="error-field">
              <label>Severity:</label>
              <span>{{ selectedError?.severity }}</span>
            </div>
            <div class="error-field">
              <label>Time:</label>
              <span>{{ formatDateTime(selectedError?.timestamp) }}</span>
            </div>
            <div class="error-field">
              <label>Component:</label>
              <span>{{ selectedError?.context?.component }}</span>
            </div>
            <div class="error-field">
              <label>Operation:</label>
              <span>{{ selectedError?.context?.operation }}</span>
            </div>
          </div>
          
          <div class="error-message">
            <label>Message:</label>
            <p>{{ selectedError?.message }}</p>
          </div>
          
          <div v-if="selectedError?.details" class="error-details">
            <label>Technical Details:</label>
            <pre>{{ JSON.stringify(selectedError.details, null, 2) }}</pre>
          </div>
        </div>
        
        <div class="error-details-actions">
          <button @click="copyErrorDetails" class="copy-btn">Copy Details</button>
          <button @click="reportError" class="report-btn">Report Error</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { systemErrorHandler, type UserFeedback, type SystemError } from '../../utils/errorHandling/systemErrorHandler'
import { progressTracker, type ProgressState } from '../../utils/errorHandling/progressTracker'

// Icons (you can replace with your preferred icon library)
import CheckCircleIcon from './icons/CheckCircleIcon.vue'
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon.vue'
import InformationCircleIcon from './icons/InformationCircleIcon.vue'
import XCircleIcon from './icons/XCircleIcon.vue'

interface FeedbackItem extends UserFeedback {
  id: string;
  timestamp: Date;
}

// Reactive state
const visibleFeedback = ref<FeedbackItem[]>([])
const activeOperations = ref<ProgressState[]>([])
const showErrorDetails = ref(false)
const selectedError = ref<SystemError | null>(null)

// Cleanup functions
let feedbackCleanup: (() => void) | null = null
let progressCleanup: (() => void) | null = null

onMounted(() => {
  // Setup feedback listener
  feedbackCleanup = systemErrorHandler.onUserFeedback((feedback) => {
    if (feedback.message) { // Only show non-empty feedback
      addFeedback(feedback)
    } else {
      // Clear feedback if empty message
      visibleFeedback.value = []
    }
  })

  // Setup progress tracking
  updateActiveOperations()
  
  // Periodically update active operations
  const progressInterval = setInterval(updateActiveOperations, 1000)
  
  progressCleanup = () => {
    clearInterval(progressInterval)
  }
})

onUnmounted(() => {
  feedbackCleanup?.()
  progressCleanup?.()
})

// Methods
function addFeedback(feedback: UserFeedback): void {
  const feedbackItem: FeedbackItem = {
    ...feedback,
    id: generateFeedbackId(),
    timestamp: new Date()
  }
  
  visibleFeedback.value.push(feedbackItem)
  
  // Auto-dismiss if duration is set
  if (feedback.duration && feedback.dismissible) {
    setTimeout(() => {
      dismissFeedback(feedbackItem.id)
    }, feedback.duration)
  }
}

function dismissFeedback(feedbackId: string): void {
  const index = visibleFeedback.value.findIndex(f => f.id === feedbackId)
  if (index > -1) {
    visibleFeedback.value.splice(index, 1)
  }
}

function handleAction(action: any, feedback: FeedbackItem): void {
  action.action()
  
  // Dismiss feedback after action unless it's persistent
  if (!feedback.persistent) {
    dismissFeedback(feedback.id)
  }
}

function cancelOperation(operationId: string): void {
  progressTracker.cancelOperation(operationId)
  updateActiveOperations()
}

function updateActiveOperations(): void {
  activeOperations.value = progressTracker.getActiveOperations()
}

function showErrorDetailsModal(error: SystemError): void {
  selectedError.value = error
  showErrorDetails.value = true
}

function closeErrorDetails(): void {
  showErrorDetails.value = false
  selectedError.value = null
}

function copyErrorDetails(): void {
  if (selectedError.value) {
    const details = JSON.stringify(selectedError.value, null, 2)
    navigator.clipboard.writeText(details)
    
    systemErrorHandler.showUserFeedback({
      type: 'SUCCESS',
      title: 'Copied',
      message: 'Error details copied to clipboard',
      dismissible: true,
      duration: 3000
    })
  }
}

function reportError(): void {
  if (selectedError.value) {
    // Implement error reporting logic
    console.log('Reporting error:', selectedError.value.id)
    
    systemErrorHandler.showUserFeedback({
      type: 'INFO',
      title: 'Error Reported',
      message: 'Thank you for reporting this error. We\'ll investigate it.',
      dismissible: true,
      duration: 5000
    })
  }
  closeErrorDetails()
}

function getFeedbackIcon(type: string) {
  const iconMap = {
    'SUCCESS': CheckCircleIcon,
    'ERROR': XCircleIcon,
    'WARNING': ExclamationTriangleIcon,
    'INFO': InformationCircleIcon,
    'PROGRESS': InformationCircleIcon
  }
  return iconMap[type as keyof typeof iconMap] || InformationCircleIcon
}

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

function formatDateTime(date?: Date): string {
  if (!date) return ''
  return date.toLocaleString()
}

function generateFeedbackId(): string {
  return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
</script>

<style scoped>
.user-feedback-system {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  pointer-events: none;
}

.progress-container,
.feedback-container {
  pointer-events: auto;
}

.progress-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3b82f6;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.cancel-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  min-width: 35px;
}

.progress-details {
  font-size: 12px;
  color: #6b7280;
}

.current-step {
  margin-bottom: 4px;
}

.step-name {
  font-weight: 600;
  margin-right: 8px;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
}

.feedback-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: white;
  position: relative;
}

.feedback-success {
  border-left: 4px solid #10b981;
}

.feedback-error {
  border-left: 4px solid #ef4444;
}

.feedback-warning {
  border-left: 4px solid #f59e0b;
}

.feedback-info {
  border-left: 4px solid #3b82f6;
}

.feedback-progress {
  border-left: 4px solid #8b5cf6;
}

.feedback-persistent {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.feedback-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.feedback-content {
  flex: 1;
}

.feedback-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.feedback-message {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
}

.feedback-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.feedback-action {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.action-primary {
  background: #3b82f6;
  color: white;
}

.action-primary:hover {
  background: #2563eb;
}

.action-secondary {
  background: #e5e7eb;
  color: #374151;
}

.action-secondary:hover {
  background: #d1d5db;
}

.action-danger {
  background: #ef4444;
  color: white;
}

.action-danger:hover {
  background: #dc2626;
}

.feedback-dismiss {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.feedback-dismiss:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.error-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.error-details-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.error-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.error-details-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.error-details-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.error-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.error-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-field label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.error-field span {
  font-size: 14px;
  color: #1f2937;
}

.error-message,
.error-details {
  margin-bottom: 20px;
}

.error-message label,
.error-details label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.error-message p {
  margin: 0;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
}

.error-details pre {
  background: #f9fafb;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
  overflow-x: auto;
  margin: 0;
}

.error-details-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

.copy-btn,
.report-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.copy-btn {
  background: #e5e7eb;
  color: #374151;
}

.copy-btn:hover {
  background: #d1d5db;
}

.report-btn {
  background: #3b82f6;
  color: white;
}

.report-btn:hover {
  background: #2563eb;
}

/* Transitions */
.feedback-enter-active,
.feedback-leave-active {
  transition: all 0.3s ease;
}

.feedback-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.feedback-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Responsive */
@media (max-width: 640px) {
  .user-feedback-system {
    left: 20px;
    right: 20px;
    max-width: none;
  }
  
  .error-details-content {
    margin: 20px;
    max-width: none;
  }
  
  .error-info {
    grid-template-columns: 1fr;
  }
}
</style>