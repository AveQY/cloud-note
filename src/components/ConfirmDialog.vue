<script setup lang="ts">
interface Props {
  show?: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

interface Emits {
  confirm: []
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '确认',
  message: '确定要执行此操作吗？',
  confirmText: '确定',
  cancelText: '取消',
  type: 'danger'
})

const emit = defineEmits<Emits>()

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}

const handleBackdropClick = () => {
  emit('cancel')
}
</script>

<template>
  <Transition name="dialog-fade">
    <div v-if="show" class="confirm-dialog-overlay" @click="handleBackdropClick">
      <Transition name="dialog-slide">
        <div v-if="show" class="confirm-dialog" @click.stop>
          <div class="confirm-dialog__header">
            <div class="confirm-dialog__icon" :class="`confirm-dialog__icon--${type}`">
              <svg v-if="type === 'danger'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 16V16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 17V17.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="confirm-dialog__title">{{ title }}</h3>
          </div>
          <div class="confirm-dialog__body">
            <p class="confirm-dialog__message">{{ message }}</p>
          </div>
          <div class="confirm-dialog__footer">
            <button class="confirm-dialog__button confirm-dialog__button--cancel" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button 
              class="confirm-dialog__button confirm-dialog__button--confirm"
              :class="`confirm-dialog__button--${type}`"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-dialog-overlay {
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

.confirm-dialog {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-width: 400px;
  max-width: 90vw;
  overflow: hidden;
  animation: dialogSlideIn 0.3s ease;
}

.confirm-dialog__header {
  padding: 24px 24px 16px;
  text-align: center;
}

.confirm-dialog__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog__icon--danger {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #ef4444;
}

.confirm-dialog__icon--warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #f59e0b;
}

.confirm-dialog__icon--info {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #3b82f6;
}

.confirm-dialog__icon svg {
  width: 32px;
  height: 32px;
}

.confirm-dialog__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.confirm-dialog__body {
  padding: 0 24px 24px;
  text-align: center;
}

.confirm-dialog__message {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.confirm-dialog__footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

.confirm-dialog__button {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-dialog__button--cancel {
  background: #ffffff;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.confirm-dialog__button--cancel:hover {
  background: var(--bg-color);
  color: var(--text-primary);
}

.confirm-dialog__button--confirm {
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.confirm-dialog__button--confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.confirm-dialog__button--confirm:active {
  transform: translateY(0);
}

.confirm-dialog__button--danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.confirm-dialog__button--warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.confirm-dialog__button--info {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
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
</style>
