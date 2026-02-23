<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  show?: boolean
  shareUrl?: string
}

interface Emits {
  close: []
  copy: []
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  shareUrl: ''
})

const emit = defineEmits<Emits>()

const copied = ref(false)

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.shareUrl)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    console.error('复制失败:', e)
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="show" class="share-link-dialog-overlay" @click="handleClose">
        <Transition name="dialog-slide">
          <div v-if="show" class="share-link-dialog" @click.stop>
            <div class="share-link-dialog__header">
              <h3 class="share-link-dialog__title">分享链接</h3>
              <button class="share-link-dialog__close" @click="handleClose">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            <div class="share-link-dialog__body">
              <div class="share-link-dialog__url-wrapper">
                <input
                  :value="shareUrl"
                  readonly
                  class="share-link-dialog__url-input"
                />
                <button
                  class="share-link-dialog__copy-button"
                  @click="handleCopy"
                  :class="{ 'share-link-dialog__copy-button--copied': copied }"
                >
                  <svg v-if="!copied" class="share-link-dialog__copy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 1H4C3.46957 1 3 1.53043 3 2C3 2.46957 3.46957 2 4 2V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V4C20 3.46957 19.7893 2.96086 19.4142 2 18 2H16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <svg v-else class="share-link-dialog__copy-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
              <p class="share-link-dialog__tip">点击复制按钮或直接复制链接</p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.share-link-dialog-overlay {
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

.share-link-dialog {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-width: 500px;
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

.share-link-dialog__header {
  padding: 24px 24px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.share-link-dialog__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.share-link-dialog__close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.share-link-dialog__close:hover {
  background: var(--bg-color);
  color: var(--text-primary);
}

.share-link-dialog__body {
  padding: 32px 24px;
}

.share-link-dialog__url-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.share-link-dialog__url-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--bg-color);
  color: var(--text-primary);
  outline: none;
}

.share-link-dialog__copy-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(81, 191, 111, 0.2);
}

.share-link-dialog__copy-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(81, 191, 111, 0.3);
}

.share-link-dialog__copy-button:active {
  transform: translateY(0);
}

.share-link-dialog__copy-button--copied {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.share-link-dialog__copy-icon {
  width: 18px;
  height: 18px;
}

.share-link-dialog__tip {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
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
  .share-link-dialog {
    min-width: 90vw;
  }

  .share-link-dialog__url-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .share-link-dialog__copy-button {
    width: 100%;
  }
}
</style>
