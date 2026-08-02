<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import '@/styles/preview.css'
import type { Note } from '@/types'

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

interface Props {
  note: Note
  content: string
}

const props = defineProps<Props>()

interface Emits {
  'update:content': [value: string]
  save: [content: string, isAutoSave?: boolean]
  cancel: []
}

const emit = defineEmits<Emits>()

const editor = ref<HTMLTextAreaElement | null>(null)
const mainContainerRef = ref<HTMLElement | null>(null)
const isUploading = ref(false)

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${hours}:${minutes}`
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes}B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }
}

const fileInfo = computed(() => {
  const date = props.note.updatedAt || new Date()
  const size = new Blob([props.content]).size
  const wordCount = props.content.length
  
  return {
    date: formatDate(date),
    size: formatSize(size),
    wordCount: wordCount
  }
})

const showPreview = ref(true)
const previewHtml = computed(() => md.render(props.content))
let isSyncingScroll = false

const AUTO_SAVE_DELAY_MS = 15000
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let savedCursorPosition: { start: number; end: number } | null = null

const scheduleAutoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    // Save cursor position before auto-save
    const textarea = editor.value
    if (textarea) {
      savedCursorPosition = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      }
    }
    // Silently save in background without exiting edit mode
    emit('save', props.content, true)
  }, AUTO_SAVE_DELAY_MS)
}

const handleContentUpdate = (newContent: string) => {
  emit('update:content', newContent)
  scheduleAutoSave()
}

const saveCursorPosition = () => {
  const textarea = editor.value
  if (textarea) {
    savedCursorPosition = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    }
  }
}

const restoreCursorPosition = () => {
  const textarea = editor.value
  if (textarea && savedCursorPosition && savedCursorPosition.start !== null) {
    const newLength = textarea.value.length
    textarea.setSelectionRange(
      Math.min(savedCursorPosition.start, newLength),
      Math.min(savedCursorPosition.end, newLength)
    )
    savedCursorPosition = null
  }
}

const replaceSelection = (
  replacement: string,
  selectionStartOffset: number,
  selectionEndOffset: number = selectionStartOffset
) => {
  const textarea = editor.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const nextValue = textarea.value.slice(0, start) + replacement + textarea.value.slice(end)
  emit('update:content', nextValue)
  scheduleAutoSave()
  requestAnimationFrame(() => {
    if (!editor.value) return
    editor.value.focus()
    editor.value.setSelectionRange(start + selectionStartOffset, start + selectionEndOffset)
  })
}

const wrapSelection = (before: string, after: string, placeholder: string) => {
  const textarea = editor.value
  if (!textarea) return
  const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
  const content = selected || placeholder
  replaceSelection(`${before}${content}${after}`, before.length, before.length + content.length)
}

const prefixSelectedLines = (prefix: string, placeholder: string) => {
  const textarea = editor.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEndIndex = value.indexOf('\n', end)
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
  const selectedLines = value.slice(lineStart, lineEnd) || placeholder
  const replacement = selectedLines.split('\n').map(line => `${prefix}${line}`).join('\n')
  const nextValue = value.slice(0, lineStart) + replacement + value.slice(lineEnd)
  emit('update:content', nextValue)
  scheduleAutoSave()
  requestAnimationFrame(() => {
    if (!editor.value) return
    editor.value.focus()
    editor.value.setSelectionRange(lineStart, lineStart + replacement.length)
  })
}

const insertNumberedList = () => {
  const textarea = editor.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEndIndex = value.indexOf('\n', end)
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
  const selectedLines = value.slice(lineStart, lineEnd) || '列表项'
  const replacement = selectedLines.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n')
  const nextValue = value.slice(0, lineStart) + replacement + value.slice(lineEnd)
  emit('update:content', nextValue)
  scheduleAutoSave()
  requestAnimationFrame(() => {
    if (!editor.value) return
    editor.value.focus()
    editor.value.setSelectionRange(lineStart, lineStart + replacement.length)
  })
}

const insertBlock = (before: string, after: string, placeholder: string) => {
  const textarea = editor.value
  if (!textarea) return
  const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
  const content = selected || placeholder
  replaceSelection(`${before}${content}${after}`, before.length, before.length + content.length)
}

const formatActions = [
  { id: 'heading', label: '标题', shortLabel: 'H', title: '标题', run: () => prefixSelectedLines('## ', '标题') },
  { id: 'bold', label: '加粗', shortLabel: 'B', title: '加粗 Ctrl+B', run: () => wrapSelection('**', '**', '加粗文字') },
  { id: 'italic', label: '斜体', shortLabel: 'I', title: '斜体 Ctrl+I', run: () => wrapSelection('*', '*', '斜体文字') },
  { id: 'underline', label: '下划线', shortLabel: 'U', title: '下划线', run: () => wrapSelection('<u>', '</u>', '下划线文字') },
  { id: 'strike', label: '删除线', shortLabel: 'S', title: '删除线', run: () => wrapSelection('~~', '~~', '删除文字') },
  { id: 'inline-code', label: '行内代码', shortLabel: '</>', title: '行内代码', run: () => wrapSelection('`', '`', 'code') },
  { id: 'code-block', label: '代码块', shortLabel: '{}', title: '代码块 Ctrl+K', run: () => insertBlock('```\n', '\n```', '在此输入代码') },
  { id: 'quote', label: '引用', shortLabel: '❝', title: '引用', run: () => prefixSelectedLines('> ', '引用内容') },
  { id: 'unordered-list', label: '无序列表', shortLabel: '•', title: '无序列表', run: () => prefixSelectedLines('- ', '列表项') },
  { id: 'ordered-list', label: '有序列表', shortLabel: '1.', title: '有序列表', run: insertNumberedList },
  { id: 'task-list', label: '任务列表', shortLabel: '☑', title: '任务列表', run: () => prefixSelectedLines('- [ ] ', '待办事项') },
  { id: 'link', label: '链接', shortLabel: '↗', title: '链接 Ctrl+L', run: () => wrapSelection('[', '](https://)', '链接文字') },
  { id: 'divider', label: '分隔线', shortLabel: '—', title: '分隔线', run: () => replaceSelection('\n\n---\n\n', 5) }
]

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    const target = event.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    const value = target.value
    
    target.value = value.substring(0, start) + '  ' + value.substring(end)
    target.selectionStart = target.selectionEnd = start + 2
    emit('update:content', target.value)
    scheduleAutoSave()
    return
  }

  const textarea = editor.value
  if (!textarea) return

  if (!(event.ctrlKey || event.metaKey)) return

  const target = event.target as HTMLTextAreaElement
  const start = target.selectionStart
  const end = target.selectionEnd
  const value = target.value
  const selectedText = value.substring(start, end)
  
  let newText = ''
  let cursorOffset = 0

  switch (event.key) {
    case 'b':
      // Ctrl+B - 加粗
      event.preventDefault()
      if (selectedText) {
        newText = `**${selectedText}**`
        cursorOffset = newText.length
      } else {
        newText = '****'
        cursorOffset = 2
      }
      break
    
    case 'i':
      // Ctrl+I - 斜体
      event.preventDefault()
      if (selectedText) {
        newText = `*${selectedText}*`
        cursorOffset = newText.length
      } else {
        newText = '**'
        cursorOffset = 1
      }
      break
    
    case 'k':
      event.preventDefault()
      formatActions.find(action => action.id === 'code-block')?.run()
      return

    case 'l':
      event.preventDefault()
      formatActions.find(action => action.id === 'link')?.run()
      return

    case '>':
      // Ctrl+> - 引用
      event.preventDefault()
      if (selectedText) {
        // 处理多行选中,给每行前面添加 >
        const lines = selectedText.split('\n')
        const quotedLines = lines.map(line => `> ${line}`)
        newText = quotedLines.join('\n')
        cursorOffset = newText.length
      } else {
        newText = '> '
        cursorOffset = 2
      }
      break
  }

  if (newText) {
    const newValue = value.substring(0, start) + newText + value.substring(end)
    emit('update:content', newValue)
    scheduleAutoSave()
    
    // 设置光标位置
    const newCursorPosition = start + cursorOffset
    setTimeout(() => {
      if (editor.value) {
        editor.value.setSelectionRange(newCursorPosition, newCursorPosition)
        editor.value.focus()
      }
    }, 0)
  }
}

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

  scheduleAutoSave()
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      
      const file = item.getAsFile()
      if (!file) return

      const textarea = editor.value
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      const placeholder = `
![上传中...](/image/uploading)
`
      const newValue = value.substring(0, start) + placeholder + value.substring(end)
      emit('update:content', newValue)

      try {
        isUploading.value = true
        const formData = new FormData()
        formData.append('file', file)
        console.log('上传图片:', file.name, file.type, file.size)

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        })

        console.log('响应状态:', response.status, response.ok)
        const result = await response.json()
        console.log('响应数据:', result)

        if (result.success && result.imageUrl) {
          const imageMarkdown = `
![图片](${result.imageUrl})
`
          const updatedValue = textarea.value.replace(placeholder, imageMarkdown)
          emit('update:content', updatedValue)
          
          const newCursorPosition = start + imageMarkdown.length
          textarea.setSelectionRange(newCursorPosition, newCursorPosition)
          textarea.focus()
        } else {
          console.error('上传失败:', result.error)
          const updatedValue = textarea.value.replace(placeholder, `
![上传失败](/image/error)
`)
          emit('update:content', updatedValue)
        }
      } catch (error) {
        console.error('上传图片失败:', error)
        const updatedValue = textarea.value.replace(placeholder, `
![上传失败](/image/error)
`)
        emit('update:content', updatedValue)
      } finally {
        isUploading.value = false
      }

      break
    } else if (item.type === 'text/html') {
      const html = item.getAsString((html) => {
        if (!html) return

        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
        const matches = html.match(imgRegex)
        
        if (matches && matches.length > 0) {
          event.preventDefault()
          
          const textarea = editor.value
          if (!textarea) return

          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const value = textarea.value

          const placeholder = `
![处理中...](/image/processing)
`
          const newValue = value.substring(0, start) + placeholder + value.substring(end)
          emit('update:content', newValue)

          const processImages = async () => {
            try {
              for (const match of matches) {
                const imgTag = match
                const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
                
                if (srcMatch) {
                  let src = srcMatch[1]
                  
                  if (src.startsWith('http://') || src.startsWith('https://')) {
                    const imageMarkdown = `
![图片](${src})
`
                    const updatedValue = textarea.value.replace(placeholder, imageMarkdown)
                    emit('update:content', updatedValue)
                    
                    const newCursorPosition = start + imageMarkdown.length
                    textarea.setSelectionRange(newCursorPosition, newCursorPosition)
                    textarea.focus()
                    return
                  }
                }
              }
              
              const updatedValue = textarea.value.replace(placeholder, `
![处理失败](/image/error)
`)
              emit('update:content', updatedValue)
            } catch (error) {
              console.error('处理图片失败:', error)
              const updatedValue = textarea.value.replace(placeholder, `
![处理失败](/image/error)
`)
              emit('update:content', updatedValue)
            }
          }
          
          processImages()
        }
      })
    } else if (item.type === 'text/plain') {
      const text = item.getAsString((text) => {
        if (!text) return

        const urlRegex = /(https?:\/\/[^\s]+)\.(png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?/gi
        const matches = text.match(urlRegex)
        
        if (matches && matches.length > 0) {
          event.preventDefault()
          
          const textarea = editor.value
          if (!textarea) return

          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const value = textarea.value

          const placeholder = `
![处理中...](/image/processing)
`
          const newValue = value.substring(0, start) + placeholder + value.substring(end)
          emit('update:content', newValue)

          const imageMarkdown = `
![图片](${matches[0]})
`
          const updatedValue = textarea.value.replace(placeholder, imageMarkdown)
          emit('update:content', updatedValue)
          
          const newCursorPosition = start + imageMarkdown.length
          textarea.setSelectionRange(newCursorPosition, newCursorPosition)
          textarea.focus()
        }
      })
    }
  }
}

const handleSave = () => {
  emit('save', props.content, false)
}

onMounted(() => {
  const textarea = editor.value
  if (textarea) {
    textarea.addEventListener('paste', handlePaste)
    textarea.addEventListener('scroll', syncTextareaScroll)
  }
  
  const preview = document.querySelector('.note-editor__preview')
  if (preview) {
    preview.addEventListener('scroll', syncPreviewScroll)
  }
})

onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
  const textarea = editor.value
  if (textarea) {
    textarea.removeEventListener('paste', handlePaste)
    textarea.removeEventListener('scroll', syncTextareaScroll)
  }
  
  const preview = document.querySelector('.note-editor__preview')
  if (preview) {
    preview.removeEventListener('scroll', syncPreviewScroll)
  }
})

const syncPreviewScroll = () => {
  if (isSyncingScroll) return
  isSyncingScroll = true
  
  try {
    const textarea = editor.value
    const preview = document.querySelector('.note-editor__preview')
    if (!textarea || !preview) return

    const textareaScrollTop = textarea.scrollTop
    const textareaScrollHeight = textarea.scrollHeight
    const textareaClientHeight = textarea.clientHeight

    const previewScrollTop = preview.scrollTop
    const previewScrollHeight = preview.scrollHeight
    const previewClientHeight = preview.clientHeight

    const textareaScrollable = textareaScrollHeight - textareaClientHeight
    const previewScrollable = previewScrollHeight - previewClientHeight

    if (previewScrollable > 0 && textareaScrollable > 0) {
      const scrollTopRatio = previewScrollTop / previewScrollable
      const targetTextareaScrollTop = scrollTopRatio * textareaScrollable

      if (Math.abs(textarea.scrollTop - targetTextareaScrollTop) > 1) {
        textarea.scrollTo({
          top: targetTextareaScrollTop,
          behavior: 'auto'
        })
      }
    }
  } finally {
    isSyncingScroll = false
  }
}

const syncTextareaScroll = () => {
  if (isSyncingScroll) return
  isSyncingScroll = true
  
  try {
    const textarea = editor.value
    const preview = document.querySelector('.note-editor__preview')
    if (!textarea || !preview) return

    const textareaScrollTop = textarea.scrollTop
    const textareaScrollHeight = textarea.scrollHeight
    const textareaClientHeight = textarea.clientHeight

    const previewScrollTop = preview.scrollTop
    const previewScrollHeight = preview.scrollHeight
    const previewClientHeight = preview.clientHeight

    const textareaScrollable = textareaScrollHeight - textareaClientHeight
    const previewScrollable = previewScrollHeight - previewClientHeight

    if (textareaScrollable > 0 && previewScrollable > 0) {
      const scrollTopRatio = textareaScrollTop / textareaScrollable
      const targetPreviewScrollTop = scrollTopRatio * previewScrollable

      if (Math.abs(preview.scrollTop - targetPreviewScrollTop) > 1) {
        preview.scrollTo({
          top: targetPreviewScrollTop,
          behavior: 'auto'
        })
      }
    }
  } finally {
    isSyncingScroll = false
  }
}

</script>

<template>
  <div class="note-editor" ref="mainContainerRef">
    <div class="note-editor__header">
      <div class="note-editor__header-left">
        <button class="note-editor__back-button" @click="emit('cancel')">
          <svg class="note-editor__back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="note-editor__back-text">返回</span>
        </button>
        <button
          type="button"
          class="note-editor__preview-toggle"
          :class="{ 'note-editor__preview-toggle--active': showPreview }"
          @click="showPreview = !showPreview"
          title="切换预览"
        >
          <svg class="note-editor__preview-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="note-editor__preview-text">预览</span>
        </button>
      </div>
      <div class="note-editor__info">
        <span class="note-editor__info-text">上次编辑于 {{ fileInfo.date }}</span>
        <span class="note-editor__info-divider">|</span>
        <span class="note-editor__info-text">字数：{{ fileInfo.wordCount }}</span>
        <span class="note-editor__info-divider">|</span>
        <span class="note-editor__info-text">大小：{{ fileInfo.size }}</span>
        <span v-if="isUploading" class="note-editor__upload-status">上传中...</span>
      </div>
      <button class="note-editor__save-button" @click="handleSave">
        <svg class="note-editor__save-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L19 9V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 21V13H7V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="note-editor__save-text">保存</span>
      </button>
    </div>
    <div class="note-editor__body" :class="{ 'note-editor__body--preview-on': showPreview }">
      <textarea
        ref="editor"
        class="note-editor__textarea"
        :value="content"
        @input="handleContentUpdate(($event.target as HTMLTextAreaElement).value)"
        @focus="saveCursorPosition"
        @keydown="handleKeyDown"
        placeholder="开始编写你的笔记…支持 Markdown、粘贴图片与常用快捷键"
        spellcheck="false"
      />
      <div v-show="showPreview" class="note-editor__preview preview-content" v-html="previewHtml"></div>
    </div>
    <div class="note-editor__toolbar" role="toolbar" aria-label="Markdown 格式工具栏">
      <div class="note-editor__toolbar-title">
        <span class="note-editor__toolbar-dot"></span>
        <span>格式</span>
      </div>
      <div class="note-editor__toolbar-actions">
        <button
          v-for="action in formatActions"
          :key="action.id"
          type="button"
          class="note-editor__tool-button"
          :class="`note-editor__tool-button--${action.id}`"
          :title="action.title"
          :aria-label="action.label"
          @mousedown.prevent
          @click="action.run"
        >
          <span class="note-editor__tool-icon">{{ action.shortLabel }}</span>
          <span class="note-editor__tool-label">{{ action.label }}</span>
        </button>
      </div>
      <div class="note-editor__toolbar-hint">Ctrl/⌘ + B 加粗 · Ctrl/⌘ + I 斜体 · Ctrl/⌘ + K 代码块</div>
    </div>
  </div>
</template>

<style scoped>
.note-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.note-editor__header {
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: auto;
  min-height: 64px;
  gap: 12px;
}

.note-editor__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.note-editor__back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.note-editor__back-button:hover {
  background: #e5e7eb;
}

.note-editor__back-button:active {
  background: #d1d5db;
}

.note-editor__back-icon {
  width: 16px;
  height: 16px;
}

.note-editor__preview-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.note-editor__preview-toggle:hover {
  background: #e5e7eb;
}

.note-editor__preview-toggle--active {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
}

.note-editor__preview-icon {
  width: 16px;
  height: 16px;
}

.note-editor__info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.note-editor__info-text {
  font-size: 13px;
  color: #6b7280;
}

.note-editor__info-divider {
  font-size: 13px;
  color: #d1d5db;
}

.note-editor__upload-status {
  font-size: 13px;
  color: #10b981;
  font-weight: 500;
}

.note-editor__save-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
}

.note-editor__save-button:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
}

.note-editor__save-button:active {
  transform: translateY(0);
}

.note-editor__save-icon {
  width: 16px;
  height: 16px;
}

.note-editor__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.note-editor__body--preview-on {
  display: flex;
}

.note-editor__body--preview-on .note-editor__textarea {
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--border-color);
}

.note-editor__textarea {
  flex: 1;
  width: 100%;
  padding: 24px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Courier New', 'Fira Code', 'Monaco', 'Menlo', monospace;
  font-size: 15px;
  line-height: 1.8;
  color: #000000;
  background: #ffffff;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.note-editor__textarea::-webkit-scrollbar {
  display: none;
}

.note-editor__textarea::placeholder {
  color: #9ca3af;
}

:deep(.note-editor__preview) {
  flex: 1;
  min-width: 0;
  padding: 24px;
  overflow-y: auto;
  background: #ffffff;
  font-size: 16px;
  line-height: 1.9;
  color: #000000;
}

.note-editor__toolbar {
  flex-shrink: 0;
  min-height: 66px;
  padding: 10px 16px;
  border-top: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.04);
}

.note-editor__toolbar-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.note-editor__toolbar-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.note-editor__toolbar-actions {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 2px 0 4px;
}

.note-editor__toolbar-actions::-webkit-scrollbar {
  display: none;
}

.note-editor__tool-button {
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.note-editor__tool-button:hover,
.note-editor__tool-button:focus-visible {
  color: var(--primary-color);
  border-color: rgba(59, 130, 246, 0.45);
  background: #eff6ff;
  outline: none;
}

.note-editor__tool-button:active {
  background: #dbeafe;
}

.note-editor__tool-icon {
  min-width: 18px;
  font-family: Inter, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1;
  font-weight: 700;
  text-align: center;
}

.note-editor__tool-button--italic .note-editor__tool-icon {
  font-style: italic;
}

.note-editor__tool-button--underline .note-editor__tool-icon {
  text-decoration: underline;
}

.note-editor__tool-button--strike .note-editor__tool-icon {
  text-decoration: line-through;
}

.note-editor__tool-label {
  font-size: 12px;
  font-weight: 500;
}

.note-editor__toolbar-hint {
  color: #94a3b8;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 1180px) {
  .note-editor__tool-label,
  .note-editor__toolbar-hint {
    display: none;
  }

  .note-editor__tool-button {
    width: 36px;
    padding: 0;
  }
}

@media (max-width: 768px) {
  .note-editor__header {
    padding: 10px 12px;
    min-height: 48px;
    flex-wrap: nowrap;
    gap: 8px;
  }

  .note-editor__header-left {
    gap: 6px;
    flex-shrink: 0;
  }

  .note-editor__back-button {
    padding: 8px 10px;
    font-size: 0;
  }

  .note-editor__back-text {
    display: none;
  }

  .note-editor__back-icon {
    width: 20px;
    height: 20px;
    margin: 0;
  }

  .note-editor__preview-toggle {
    padding: 8px 10px;
    font-size: 0;
  }

  .note-editor__preview-text {
    display: none;
  }

  .note-editor__preview-icon {
    width: 18px;
    height: 18px;
  }

  .note-editor__info {
    flex: 1;
    min-width: 0;
    justify-content: flex-end;
    gap: 6px;
  }

  .note-editor__info-text {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 72px;
  }

  .note-editor__info-text:first-child {
    max-width: 90px;
  }

  .note-editor__info-divider {
    font-size: 10px;
    flex-shrink: 0;
  }

  .note-editor__save-button {
    padding: 8px 10px;
    font-size: 0;
    flex-shrink: 0;
  }

  .note-editor__save-text {
    display: none;
  }

  .note-editor__save-icon {
    width: 20px;
    height: 20px;
  }

  .note-editor__body {
    flex-direction: column;
  }

  .note-editor__body--preview-on .note-editor__textarea,
  .note-editor__body--preview-on .note-editor__preview {
    min-width: 100%;
    flex: 1;
  }

  .note-editor__textarea {
    padding: 12px;
    font-size: 14px;
    line-height: 1.6;
  }

  .note-editor__preview {
    padding: 12px;
    font-size: 14px;
  }

  .note-editor__toolbar {
    min-height: 58px;
    padding: 8px 10px;
    gap: 10px;
  }

  .note-editor__toolbar-title {
    display: none;
  }

  .note-editor__toolbar-actions {
    gap: 5px;
  }

  .note-editor__tool-button {
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 7px;
  }
}
</style>
