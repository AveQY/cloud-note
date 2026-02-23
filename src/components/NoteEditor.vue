<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TableOfContents from './TableOfContents.vue'
import type { Note } from '@/types'

interface Props {
  note: Note
  content: string
}

const props = defineProps<Props>()

interface Emits {
  'update:content': [value: string]
  save: [content: string]
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

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:content', target.value)
}

const handleTab = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    const target = event.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    const value = target.value
    
    target.value = value.substring(0, start) + '  ' + value.substring(end)
    target.selectionStart = target.selectionEnd = start + 2
    emit('update:content', target.value)
  }
}

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

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

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

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
  emit('save', props.content)
}

onMounted(() => {
  const textarea = editor.value
  if (textarea) {
    textarea.addEventListener('paste', handlePaste)
  }
})

onUnmounted(() => {
  const textarea = editor.value
  if (textarea) {
    textarea.removeEventListener('paste', handlePaste)
  }
})
</script>

<template>
  <div class="note-editor" ref="mainContainerRef">
    <div class="note-editor__header">
      <button class="note-editor__back-button" @click="emit('cancel')">
        <svg class="note-editor__back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </button>
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
        保存
      </button>
    </div>
    <textarea
      ref="editor"
      class="note-editor__textarea"
      :value="content"
      @input="handleInput"
      @keydown="handleTab"
      placeholder="开始编写你的笔记... (支持 Ctrl+V 粘贴图片)"
      spellcheck="false"
    />
    <TableOfContents 
      :content="content"
      :container="mainContainerRef"
    />
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
}

.note-editor__textarea::placeholder {
  color: #9ca3af;
}

@media (max-width: 768px) {
  .note-editor__header {
    padding: 12px 16px;
    height: auto;
    min-height: 48px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .note-editor__back-button {
    padding: 6px 12px;
    font-size: 13px;
  }

  .note-editor__back-icon {
    width: 14px;
    height: 14px;
  }

  .note-editor__info {
    flex-wrap: wrap;
    gap: 8px;
  }

  .note-editor__info-text {
    font-size: 11px;
  }

  .note-editor__info-divider {
    font-size: 11px;
  }

  .note-editor__save-button {
    padding: 6px 12px;
    font-size: 13px;
  }

  .note-editor__save-icon {
    width: 14px;
    height: 14px;
  }

  .note-editor__textarea {
    padding: 16px;
    font-size: 14px;
    line-height: 1.6;
  }
}
</style>
