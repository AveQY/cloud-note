<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show?: boolean
  title?: string
}

interface Emits {
  confirm: [title: string]
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: ''
})

const emit = defineEmits<Emits>()

const inputTitle = ref(props.title)

watch(() => props.show, (newShow) => {
  if (newShow) {
    inputTitle.value = props.title
  }
})

const handleConfirm = () => {
  if (inputTitle.value.trim()) {
    emit('confirm', inputTitle.value.trim())
  }
}

const handleCancel = () => {
  emit('cancel')
}

const handleBackdropClick = () => {
  emit('cancel')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleConfirm()
  } else if (event.key === 'Escape') {
    handleCancel()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="show" class="rename-dialog-overlay" @click="handleBackdropClick">
        <Transition name="dialog-slide">
          <div v-if="show" class="rename-dialog" @click.stop @keydown="handleKeydown">
            <div class="rename-dialog__header">
              <h3 class="rename-dialog__title">重命名笔记</h3>
            </div>
            <div class="rename-dialog__body">
              <input
                ref="inputRef"
                v-model="inputTitle"
                type="text"
                class="rename-dialog__input"
                placeholder="请输入笔记名称"
                maxlength="50"
              />
            </div>
            <div class="rename-dialog__footer">
              <button class="rename-dialog__button rename-dialog__button--cancel" @click="handleCancel">
                取消
              </button>
              <button class="rename-dialog__button rename-dialog__button--confirm" @click="handleConfirm">
                确定
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rename-dialog-overlay {
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

.rename-dialog {
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

.rename-dialog__header {
  padding: 20px 24px 16px;
}

.rename-dialog__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.rename-dialog__body {
  padding: 0 24px 20px;
}

.rename-dialog__input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
  background: var(--bg-color);
}

.rename-dialog__input:focus {
  border-color: var(--primary-color);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(81, 191, 111, 0.1);
}

.rename-dialog__input::placeholder {
  color: var(--text-secondary);
}

.rename-dialog__footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

.rename-dialog__button {
  flex: 1;
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rename-dialog__button--cancel {
  background: #ffffff;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.rename-dialog__button--cancel:hover {
  background: var(--bg-color);
  color: var(--text-primary);
}

.rename-dialog__button--confirm {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(81, 191, 111, 0.2);
}

.rename-dialog__button--confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(81, 191, 111, 0.3);
}

.rename-dialog__button--confirm:active {
  transform: translateY(0);
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
