<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import NoteEditor from './NoteEditor.vue'
import '@/styles/preview.css'
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
  save: [content: string, isAutoSave?: boolean]
  cancel: []
  contentLoaded: [content: string]
  edit: []
  'update:editingContent': [content: string]
}

const emit = defineEmits<Emits>()

const content = ref('')
const markdownContent = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const contentBodyRef = ref<HTMLElement | null>(null)
const mainContainerRef = ref<HTMLElement | null>(null)
const editorRef = ref<InstanceType<typeof NoteEditor> | null>(null)
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
  xhtmlOut: false
})
  .use(TaskLists, {
    enabled: true,
    label: true,
    labelAfter: false
  })

// Add a stable unique data-heading attribute so duplicate titles remain distinguishable
const headingId = (text: string) => text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-') || 'heading'

interface MarkdownRenderEnv {
  headingSlugCounts?: Map<string, number>
}

const uniqueHeadingId = (text: string, env: MarkdownRenderEnv) => {
  const baseId = headingId(text)
  const counts = env.headingSlugCounts || (env.headingSlugCounts = new Map<string, number>())
  const occurrence = (counts.get(baseId) || 0) + 1
  counts.set(baseId, occurrence)
  return occurrence === 1 ? baseId : `${baseId}-${occurrence}`
}

const defaultHeadingRender = md.renderer.rules.heading_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.heading_open = function (tokens, idx, options, env: MarkdownRenderEnv, self) {
  const token = tokens[idx]
  const nextToken = tokens[idx + 1]
  if (nextToken && nextToken.type === 'inline') {
    token.attrSet('data-heading', uniqueHeadingId(nextToken.content, env))
  }
  return defaultHeadingRender(tokens, idx, options, env, self)
}

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
    const rendered = md.render(markdown, { headingSlugCounts: new Map<string, number>() })
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

watch(
  () => [props.isEditing, markdownContent.value] as const,
  async () => {
    if (props.isEditing && !markdownContent.value && props.note) {
      await loadNoteContent()
    }
    if (props.isEditing) {
      emit('update:editingContent', markdownContent.value)
    }
  },
  { immediate: true }
)

const scrollToHeading = (id: string) => {
  if (props.isEditing) {
    return editorRef.value?.scrollToHeading?.(id) ?? false
  }

  const element = mainContainerRef.value?.querySelector(`[data-heading="${id}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }
  return false
}
defineExpose({
  mainContainerRef,
  editorRef,
  scrollToHeading
})
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
      ref="editorRef"
      v-else-if="isEditing && note"
      :key="`editor-${note.path}`"
      :note="note"
      :content="markdownContent"
      @update:content="(v) => { markdownContent = v; emit('update:editingContent', v) }"
      @save="(content, isAutoSave) => emit('save', content, isAutoSave)"
      @cancel="emit('cancel')"
    />
    <div v-else class="note-content__wrapper">
      <div class="note-content__body preview-content" ref="contentBodyRef" v-html="content"></div>
    </div>
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
</style>
