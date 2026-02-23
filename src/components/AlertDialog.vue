<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show?: boolean
  title?: string
  message?: string
  confirmText?: string
  type?: 'success' | 'info' | 'warning' | 'error'
}

interface Emits {
  confirm: []
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '提示',
  message: '',
  confirmText: '确定',
  type: 'success'
})

const emit = defineEmits<Emits>()

const handleConfirm = () => {
  emit('confirm')
}

const handleBackdropClick = () => {
  emit('confirm')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === 'Escape') {
    handleConfirm()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="show" class="alert-dialog-overlay" @click="handleBackdropClick">
        <Transition name="dialog-slide">
          <div v-if="show" class="alert-dialog" @click.stop @keydown="handleKeydown">
            <div class="alert-dialog__header">
              <div class="alert-dialog__icon" :class="`alert-dialog__icon--${type}`">
                <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="type === 'info'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 17V17.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M15 9L9 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3 class="alert-dialog__title">{{ title }}</h3>
            </div>
            <div class="alert-dialog__body">
              <p class="alert-dialog__message">{{ message }}</p>
            </div>
            <div class="alert-dialog__footer">
              <button 
                class="alert-dialog__button"
                :class="`alert-dialog__button--${type}`"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.alert-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.alert-dialog {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-width: 400px;
  max-width: 90vw;
  overflow: hidden;
  animation: dialogSlideIn 0.3s ease;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.alert-dialog__header {
  padding: 24px 24px 16px;
  text-align: center;
}

.alert-dialog__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-dialog__icon--success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.alert-dialog__icon--info {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.alert-dialog__icon--warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #f59e0b;
}

.alert-dialog__icon--error {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #ef4444;
}

.alert-dialog__icon svg {
  width: 32px;
  height: 32px;
}

.alert-dialog__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.alert-dialog__body {
  padding: 0 24px 24px;
  text-align: center;
}

.alert-dialog__message {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.alert-dialog__footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

.alert-dialog__button {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.alert-dialog__button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.alert-dialog__button:active {
  transform: translateY(0);
}

.alert-dialog__button--success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.alert-dialog__button--info {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
}

.alert-dialog__button--warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.alert-dialog__button--error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-slide-enter-active,
.dialog-slide-leave-active {
  transition: all 0.3s ease;
}

.dialog-slide-enter-from,
.dialog-slide-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}
</style>
