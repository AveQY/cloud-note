<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import MarkdownIt from 'markdown-it'

interface Props {
  show?: boolean
  title?: string
  content?: string
}

interface Emits {
  close: []
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '关于',
  content: ''
})

const emit = defineEmits<Emits>()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const renderedContent = computed(() => {
  const rendered = md.render(props.content || '')
  return rendered
})

const handleClose = () => {
  emit('close')
}

const handleBackdropClick = () => {
  emit('close')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="show" class="info-dialog-overlay" @click="handleBackdropClick">
        <Transition name="dialog-slide">
          <div v-if="show" class="info-dialog" @click.stop @keydown="handleKeydown">
            <div class="info-dialog__header">
              <h3 class="info-dialog__title">{{ title }}</h3>
              <button class="info-dialog__close" @click="handleClose">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            <div class="info-dialog__body">
              <div class="info-dialog__content" v-html="renderedContent"></div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.info-dialog-overlay {
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

.info-dialog {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  animation: dialogSlideIn 0.3s ease;
  display: flex;
  flex-direction: column;
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

.info-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.info-dialog__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.info-dialog__close {
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.info-dialog__close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

.info-dialog__close svg {
  width: 20px;
  height: 20px;
}

.info-dialog__body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.info-dialog__content {
  line-height: 1.8;
  color: var(--text-primary);
  font-size: 15px;
}

.info-dialog__content :deep(h1),
.info-dialog__content :deep(h2),
.info-dialog__content :deep(h3),
.info-dialog__content :deep(h4),
.info-dialog__content :deep(h5),
.info-dialog__content :deep(h6) {
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-dialog__content :deep(h1) {
  font-size: 24px;
}

.info-dialog__content :deep(h2) {
  font-size: 20px;
}

.info-dialog__content :deep(h3) {
  font-size: 18px;
}

.info-dialog__content :deep(p) {
  margin-bottom: 12px;
}

.info-dialog__content :deep(a) {
  color: var(--primary-color);
  text-decoration: none;
}

.info-dialog__content :deep(a:hover) {
  text-decoration: underline;
}

.info-dialog__content :deep(ul),
.info-dialog__content :deep(ol) {
  padding-left: 24px;
  margin-bottom: 12px;
}

.info-dialog__content :deep(li) {
  margin-bottom: 6px;
}

.info-dialog__content :deep(code) {
  background: var(--bg-color);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
}

.info-dialog__content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
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
