<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import NoteEditor from './NoteEditor.vue'
import TableOfContents from './TableOfContents.vue'
import type { Note } from '@/types'

interface Props {
  note: Note | null
  isEditing?: boolean
  refreshKey?: number
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  refreshKey: 0
})

interface Emits {
  save: [content: string]
  cancel: []
  contentLoaded: [content: string]
  edit: []
}

const emit = defineEmits<Emits>()

const content = ref('')
const markdownContent = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const contentBodyRef = ref<HTMLElement | null>(null)
const mainContainerRef = ref<HTMLElement | null>(null)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
  xhtmlOut: false
})

md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  const src = token.attrGet('src')
  const alt = token.attrGet('alt') || ''
  
  if (src) {
    const cleanSrc = src.trim().replace(/^`|`$/g, '').replace(/^["']|["']$/g, '').trim()
    return `<img src="${cleanSrc}" alt="${alt}">`
  }
  
  return self.renderToken(tokens, idx, options)
}

const loadNoteContent = async () => {
  if (!props.note) {
    content.value = ''
    markdownContent.value = ''
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await fetch(props.note.path)
    if (!response.ok) {
      throw new Error('加载笔记失败')
    }
    const markdown = await response.text()
    markdownContent.value = markdown
    const rendered = md.render(markdown)
    content.value = rendered
    
    emit('contentLoaded', markdown)
  } catch (e) {
    error.value = '加载笔记内容失败'
    console.error('加载笔记内容失败:', e)
  } finally {
    loading.value = false
  }
}

const addCopyButtons = () => {
  if (!contentBodyRef.value) return
  
  const preElements = contentBodyRef.value.querySelectorAll('pre')
  
  preElements.forEach((pre, index) => {
    if (pre.querySelector('.copy-button')) return
    
    const codeElement = pre.querySelector('code')
    if (!codeElement) return
    
    const copyButton = document.createElement('button')
    copyButton.className = 'copy-button'
    copyButton.innerHTML = `<img src="/img/copy.svg" alt="复制" class="copy-icon">`
    copyButton.title = '复制代码'
    
    copyButton.addEventListener('click', async () => {
      const code = codeElement.textContent || ''
      try {
        await navigator.clipboard.writeText(code)
        copyButton.classList.add('copied')
        copyButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>已复制</span>`
        setTimeout(() => {
          copyButton.classList.remove('copied')
          copyButton.innerHTML = `<img src="/img/copy.svg" alt="复制" class="copy-icon">`
        }, 2000)
      } catch (err) {
        console.error('复制失败:', err)
      }
    })
    
    pre.style.position = 'relative'
    pre.appendChild(copyButton)
  })
}

watch(content, () => {
  nextTick(() => {
    addCopyButtons()
  })
})

watch(() => props.note, loadNoteContent, { immediate: true })
watch(() => props.refreshKey, loadNoteContent)
</script>

<template>
  <div class="note-content" ref="mainContainerRef">
    <div v-if="loading" class="note-content__loading">
      <svg class="note-content__loading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>加载中...</p>
    </div>
    <div v-else-if="error" class="note-content__error">
      <svg class="note-content__error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 16V16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>{{ error }}</p>
    </div>
    <div v-else-if="!note" class="note-content__placeholder">
      <svg class="note-content__placeholder-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>选择一个笔记开始阅读</p>
    </div>
    <NoteEditor
      v-else-if="isEditing && note"
      :note="note"
      :content="markdownContent"
      @update:content="markdownContent = $event"
      @save="(content) => emit('save', content)"
      @cancel="emit('cancel')"
    />
    <div v-else class="note-content__wrapper">
      <div class="note-content__body" ref="contentBodyRef" v-html="content"></div>
    </div>
    <TableOfContents 
      v-if="!isEditing && note && !loading && !error"
      :content="markdownContent"
      :container="mainContainerRef"
    />
  </div>
</template>

<style scoped>
.note-content {
  height: 100%;
  overflow-y: auto;
  padding: 0;
}

.note-content__loading,
.note-content__error,
.note-content__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.note-content__loading-icon,
.note-content__error-icon,
.note-content__placeholder-icon {
  width: 80px;
  height: 80px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.note-content__loading-icon {
  animation: rotate 1s linear infinite;
  color: var(--primary-color);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.note-content__error-icon {
  color: #ef4444;
}

.note-content__placeholder-icon {
  color: var(--primary-color);
}

.note-content__loading p,
.note-content__error p,
.note-content__placeholder p {
  font-size: 18px;
  margin: 0;
}

.note-content__wrapper {
  max-width: 960px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.note-content__body {
  line-height: 1.9;
  color: #000000;
  font-size: 16px;
}

.note-content__body :deep(h1),
.note-content__body :deep(h2),
.note-content__body :deep(h3),
.note-content__body :deep(h4),
.note-content__body :deep(h5),
.note-content__body :deep(h6) {
  margin-top: 32px;
  margin-bottom: 16px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.note-content__body :deep(h1) {
  font-size: 30px;
  color: #000000;
  border-bottom: 2px solid var(--primary-light);
  padding-bottom: 8px;
}

.note-content__body :deep(h2) {
  font-size: 26px;
  color: #000000;
}

.note-content__body :deep(h3) {
  font-size: 22px;
  color: #000000;
}

.note-content__body :deep(h4) {
  font-size: 20px;
  color: #000000;
}

.note-content__body :deep(p) {
  margin-bottom: 16px;
  color: #000000;
}

.note-content__body :deep(ul),
.note-content__body :deep(ol) {
  margin-bottom: 20px;
  padding-left: 28px;
}

.note-content__body :deep(li) {
  margin-bottom: 10px;
  line-height: 1.8;
  color: #000000;
}

.note-content__body :deep(code) {
  background: linear-gradient(135deg, var(--primary-light) 0%, #f0f9f4 100%);
  color: var(--primary-dark);
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Courier New', 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 500;
}

.note-content__body :deep(pre) {
  background: #1a1a1a;
  color: #e8f5ec;
  padding: 20px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid #333;
  position: relative;
}

.note-content__body :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: 14px;
}

.note-content__body :deep(.copy-button) {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 32px;
  height: 32px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
  color: #e8f5ec;
  font-size: 12px;
}

.note-content__body :deep(.copy-button:hover) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.note-content__body :deep(.copy-button:active) {
  transform: scale(0.95);
}

.note-content__body :deep(.copy-icon) {
  width: 18px;
  height: 18px;
}

.note-content__body :deep(.copy-button span) {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.note-content__body :deep(.copy-button.copied) {
  background: rgba(81, 191, 111, 0.3);
  border-color: rgba(81, 191, 111, 0.5);
  color: #51bf6f;
}

.note-content__body :deep(blockquote) {
  border-left: 4px solid var(--primary-color);
  padding-left: 20px;
  margin: 20px 0;
  color: var(--text-secondary);
  background: var(--primary-light);
  padding: 16px 20px;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-style: italic;
}

.note-content__body :deep(a) {
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px solid var(--primary-color);
  transition: all 0.2s ease;
}

.note-content__body :deep(a:hover) {
  color: var(--primary-dark);
  border-bottom-color: var(--primary-dark);
}

.note-content__body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.note-content__body :deep(th),
.note-content__body :deep(td) {
  border: 1px solid var(--border-color);
  padding: 12px 16px;
  text-align: left;
}

.note-content__body :deep(th) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  font-weight: 600;
}

.note-content__body :deep(tr:nth-child(even)) {
  background-color: var(--bg-color);
}

.note-content__body :deep(tr:hover) {
  background-color: var(--primary-light);
}

.note-content__body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.5em 0;
}
</style>
