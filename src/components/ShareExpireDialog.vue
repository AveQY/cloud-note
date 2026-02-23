<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  show?: boolean
}

interface Emits {
  confirm: [expireDays: number | null]
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<Emits>()

const expireOptions = [
  { days: 1, label: '1天', description: '链接将在1天后失效' },
  { days: 7, label: '7天', description: '链接将在7天后失效' },
  { days: 30, label: '30天', description: '链接将在30天后失效' },
  { days: null, label: '永久', description: '链接永久有效' }
]

const selectedDays = ref<number | null>(null)

const handleSelect = (days: number | null) => {
  selectedDays.value = days
  emit('confirm', days)
}

const handleCancel = () => {
  selectedDays.value = null
  emit('cancel')
}

const handleBackdropClick = () => {
  handleCancel()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleCancel()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="show" class="share-expire-dialog-overlay" @click="handleBackdropClick">
        <Transition name="dialog-slide">
          <div v-if="show" class="share-expire-dialog" @click.stop @keydown="handleKeydown">
            <div class="share-expire-dialog__header">
              <h3 class="share-expire-dialog__title">选择分享有效期</h3>
              <p class="share-expire-dialog__subtitle">请设置分享链接的有效期</p>
            </div>
            <div class="share-expire-dialog__body">
              <div class="share-expire-dialog__options">
                <button
                  v-for="option in expireOptions"
                  :key="option.label"
                  class="share-expire-dialog__option"
                  @click="handleSelect(option.days)"
                >
                  <div class="share-expire-dialog__option-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="share-expire-dialog__option-content">
                    <div class="share-expire-dialog__option-label">{{ option.label }}</div>
                    <div class="share-expire-dialog__option-description">{{ option.description }}</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.share-expire-dialog-overlay {
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

.share-expire-dialog {
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

.share-expire-dialog__header {
  padding: 24px 24px 16px;
  text-align: center;
}

.share-expire-dialog__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.share-expire-dialog__subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.share-expire-dialog__body {
  padding: 0 24px 24px;
}

.share-expire-dialog__options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-expire-dialog__option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.share-expire-dialog__option:hover {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.share-expire-dialog__option:active {
  transform: translateY(0);
}

.share-expire-dialog__option-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-color-light);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.share-expire-dialog__option-icon svg {
  width: 24px;
  height: 24px;
}

.share-expire-dialog__option-content {
  flex: 1;
}

.share-expire-dialog__option-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.share-expire-dialog__option-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
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

@media (max-width: 768px) {
  .share-expire-dialog {
    min-width: 90vw;
  }

  .share-expire-dialog__option {
    padding: 12px;
  }

  .share-expire-dialog__option-icon {
    width: 40px;
    height: 40px;
  }

  .share-expire-dialog__option-icon svg {
    width: 20px;
    height: 20px;
  }

  .share-expire-dialog__option-label {
    font-size: 14px;
  }

  .share-expire-dialog__option-description {
    font-size: 12px;
  }
}
</style>
