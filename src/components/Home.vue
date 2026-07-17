<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import NoteList from './NoteList.vue'
import NoteContent from './NoteContent.vue'
import NoteActions from './NoteActions.vue'
import InfoDialog from './InfoDialog.vue'
import DropdownMenu from './DropdownMenu.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import type { Note } from '@/types'

const router = useRouter()
const selectedNote = ref<Note | null>(null)
const searchKeyword = ref('')
const isEditing = ref(false)
const saving = ref(false)
const refreshKey = ref(0)
const noteListRef = ref<InstanceType<typeof NoteList> | null>(null)
const noteContentRef = ref<InstanceType<typeof NoteContent> | null>(null)
const currentNoteContent = ref('')
const editingContent = ref('')
const initialEditContent = ref('')
const pendingNote = ref<Note | null>(null)
const showUnsavedDialog = ref(false)
const showSidebar = ref(true)
const showAboutDialog = ref(false)
const aboutContent = ref('')
const activeHeadingId = ref('')

interface HeadingItem {
  id: string
  text: string
  level: number
}

const createUniqueHeadingId = (text: string, counts: Map<string, number>) => {
  const baseId = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-') || 'heading'
  const occurrence = (counts.get(baseId) || 0) + 1
  counts.set(baseId, occurrence)
  return occurrence === 1 ? baseId : `${baseId}-${occurrence}`
}

const headings = computed(() => {
  const content = isEditing.value ? editingContent.value : currentNoteContent.value
  if (!content) return []
  const lines = content.split(/[\r\n]+/)
  const result: HeadingItem[] = []
  const counts = new Map<string, number>()
  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = createUniqueHeadingId(text, counts)
      result.push({ id, text, level })
    }
  })
  return result
})

const scrollToHeading = (id: string) => {
  const container = noteContentRef.value?.mainContainerRef
  if (!container) return

  if (isEditing.value) {
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement | null
    if (!textarea) return
    const content = editingContent.value
    const lines = content.split(/[\r\n]+/)
    const counts = new Map<string, number>()
    let offset = 0
    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const headingId = createUniqueHeadingId(match[2].trim(), counts)
        if (headingId === id) {
          textarea.focus()
          textarea.setSelectionRange(offset, offset + line.length)
          const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24
          const lineIndex = content.slice(0, offset).split(/[\r\n]+/).length - 1
          textarea.scrollTo({ top: Math.max(0, lineIndex * lineHeight - 80), behavior: 'smooth' })
          activeHeadingId.value = id
          return
        }
      }
      offset += line.length + 1
    }
    return
  }

  const element = container.querySelector(`[data-heading="${id}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  // Fallback: rebuild the same unique IDs in document order
  const headingElements = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  const counts = new Map<string, number>()
  for (const el of headingElements) {
    const text = el.textContent?.trim() || ''
    const headingId = createUniqueHeadingId(text, counts)
    if (headingId === id) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      break
    }
  }
}

const updateActiveHeading = () => {
  const container = noteContentRef.value?.mainContainerRef
  if (!container) return
  const headingElements = Array.from(container.querySelectorAll('[data-heading]'))
  const containerRect = container.getBoundingClientRect()
  const offset = 100
  let activeId = ''
  for (let i = headingElements.length - 1; i >= 0; i--) {
    const el = headingElements[i]
    const rect = el.getBoundingClientRect()
    if (rect.top <= containerRect.top + offset) {
      activeId = el.getAttribute('data-heading') || ''
      break
    }
  }
  activeHeadingId.value = activeId
}

let tocScrollHandler: (() => void) | null = null

watch(() => selectedNote.value, (note) => {
  if (note) {
    // Attach scroll listener to content area after a tick
    setTimeout(() => {
      const container = noteContentRef.value?.mainContainerRef
      if (container) {
        tocScrollHandler = () => requestAnimationFrame(updateActiveHeading)
        container.addEventListener('scroll', tocScrollHandler)
        // Trigger initial active heading
        setTimeout(updateActiveHeading, 100)
      }
    }, 100)
  } else {
    // Clean up listener when leaving a note
    if (tocScrollHandler) {
      const container = noteContentRef.value?.mainContainerRef
      if (container) {
        container.removeEventListener('scroll', tocScrollHandler)
      }
      tocScrollHandler = null
    }
    activeHeadingId.value = ''
  }
})

const isDirty = computed(() => isEditing.value && editingContent.value !== initialEditContent.value)

const handleSelectNote = (note: Note) => {
  if (isEditing.value && isDirty.value) {
    pendingNote.value = note
    showUnsavedDialog.value = true
    return
  }
  selectedNote.value = note
  isEditing.value = false
  showSidebar.value = false
}

const handleEditNote = (note: Note) => {
  selectedNote.value = note
  initialEditContent.value = currentNoteContent.value
  isEditing.value = true
  showSidebar.value = false
}

const handleEdit = () => {
  initialEditContent.value = currentNoteContent.value
  isEditing.value = true
}

const applyPendingNote = () => {
  if (pendingNote.value) {
    selectedNote.value = pendingNote.value
    pendingNote.value = null
  }
  isEditing.value = false
  showUnsavedDialog.value = false
  showSidebar.value = false
}

const handleUnsavedSave = async () => {
  await handleSave(editingContent.value)
  applyPendingNote()
}

const handleUnsavedDiscard = () => {
  applyPendingNote()
}

const handleUnsavedCancel = () => {
  showUnsavedDialog.value = false
  pendingNote.value = null
}

const handleBackToList = () => {
  showSidebar.value = true
  selectedNote.value = null
  isEditing.value = false
}

const handleNoteDeleted = () => {
  if (selectedNote.value) {
    selectedNote.value = null
    isEditing.value = false
    showSidebar.value = true
  }
}

const handleSave = async (content: string, isAutoSave: boolean = false) => {
  if (!selectedNote.value) return

  saving.value = true
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: selectedNote.value.path,
        content: content
      })
    })

    if (!response.ok) {
      throw new Error('保存失败')
    }

    const savedAt = new Date()
    if (selectedNote.value) {
      selectedNote.value.updatedAt = savedAt
    }

    // Only refresh key on manual save, not auto-save
    if (!isAutoSave && !showUnsavedDialog.value) {
      refreshKey.value++
    }

    // Only exit edit mode if this is not an auto-save
    if (!isAutoSave && !showUnsavedDialog.value) {
      isEditing.value = false
    }
  } catch (e) {
    console.error('保存失败:', e)
    alert('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  isEditing.value = false
}

const handleShowAbout = async () => {
  try {
    const response = await fetch('/log/about.md')
    if (response.ok) {
      aboutContent.value = await response.text()
      showAboutDialog.value = true
    } else {
      console.error('加载关于信息失败')
    }
  } catch (e) {
    console.error('加载关于信息失败:', e)
  }
}

const handleCloseAbout = () => {
  showAboutDialog.value = false
}

const menuItems = [
  {
    id: 'markdown',
    label: 'Markdown 语法',
    icon: '<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C7.59 4 4 7.59 4 12C4 16.41 7.59 20 12 20ZM11 7H13V9H11V7ZM13 17H11V11H13V17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: () => {
      window.open('https://www.markdown.cn/docs/cheat-sheet', '_blank')
    }
  },
  {
    id: 'settings',
    label: '设置',
    icon: '<path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15A1.65 1.65 0 0020 12a1.65 1.65 0 00-.6-3l2.1-1.6c.2-.15.25-.4.15-.6l-2-3.4a.5.5 0 00-.6-.2l-2.4 1a1.65 1.65 0 00-1.6-1L12 1h-2l-.5 3.1a1.65 1.65 0 00-1.6 1l-2.4-1a.5.5 0 00-.6.2l-2 3.4c-.1.2-.05.45.15.6L4.6 9A1.65 1.65 0 004 12a1.65 1.65 0 00.6 3l-2.1 1.6c-.2.15-.25.4-.15.6l2 3.4c.1.2.35.25.55.15l2.5-1a1.65 1.65 0 001.6 1L12 21h2l.5-3.1a1.65 1.65 0 001.6-1l2.4 1c.2.1.45 0 .55-.15l2-3.4c.1-.2.05-.45-.15-.6L19.4 15z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: () => router.push('/settings')
  }
]
</script>

<template>
  <div class="home">
    <aside
      class="home__sidebar"
      :class="{
        'home__sidebar--hidden': !showSidebar && !selectedNote,
        'home__sidebar--content-active': !showSidebar && !!selectedNote
      }"
    >
      <!-- Note list view -->
      <template v-if="showSidebar || !selectedNote">
        <div class="home__sidebar-header">
          <div class="home__title" @click="handleShowAbout">云笔记</div>
          <DropdownMenu :items="menuItems" icon-type="dots" />
        </div>
        <NoteList
          ref="noteListRef"
          v-model:search-keyword="searchKeyword"
          :selected-note="selectedNote"
          @select="handleSelectNote"
          @edit="handleEditNote"
          @note-deleted="handleNoteDeleted"
        />
      </template>
      <!-- Table of contents view (when a note is selected) -->
      <template v-else>
        <div class="home__sidebar-header home__sidebar-header--toc">
          <button class="home__sidebar-back" @click="handleBackToList">
            <svg class="home__sidebar-back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span class="home__sidebar-toc-title">目录</span>
        </div>
        <div class="home__toc-list">
          <div v-if="headings.length === 0" class="home__toc-empty">暂无目录</div>
          <template v-for="(heading, index) in headings" :key="index">
            <div
              v-if="heading.level <= 3"
              class="home__toc-item"
              :class="{
                'home__toc-item--h2': heading.level === 2,
                'home__toc-item--h3': heading.level === 3,
                'home__toc-item--active': activeHeadingId === heading.id
              }"
              @click="scrollToHeading(heading.id)"
            >
              {{ heading.text }}
            </div>
          </template>
        </div>
      </template>
    </aside>
    <main class="home__main" :class="{ 'home__main--hidden': showSidebar }">
      <div v-if="selectedNote && !isEditing" class="home__main-header">
        <button class="home__back-button" @click="handleBackToList">
          <svg class="home__back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="home__back-text">返回</span>
        </button>
        <NoteActions
          :is-editing="isEditing"
          :note="selectedNote"
          :content="currentNoteContent"
          @edit="handleEdit"
        />
      </div>
      <NoteContent
        ref="noteContentRef"
        :note="selectedNote"
        :is-editing="isEditing"
        :refresh-key="refreshKey"
        @save="(content, isAutoSave) => handleSave(content, isAutoSave || false)"
        @cancel="handleBackToList"
        @content-loaded="currentNoteContent = $event"
        @update:editing-content="editingContent = $event"
      />
    </main>
    <InfoDialog
      :show="showAboutDialog"
      title="关于"
      :content="aboutContent"
      @close="handleCloseAbout"
    />
    <ConfirmDialog
      :show="showUnsavedDialog"
      title="未保存的更改"
      message="当前笔记有未保存的更改，是否保存后再切换？"
      confirm-text="保存"
      cancel-text="取消"
      discard-text="不保存"
      type="warning"
      @confirm="handleUnsavedSave"
      @cancel="handleUnsavedCancel"
      @discard="handleUnsavedDiscard"
    />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.home__sidebar {
  width: 360px;
  min-height: 0;
  flex: 0 0 360px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  background-color: var(--card-bg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.home__sidebar-header {
  flex-shrink: 0;
  padding: 18px 32px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home__sidebar-header--toc {
  padding: 12px 16px;
  gap: 8px;
  justify-content: flex-start;
}

.home__sidebar-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.home__sidebar-back:hover {
  background: rgba(255,255,255,0.3);
}

.home__sidebar-back-icon {
  width: 18px;
  height: 18px;
}

.home__sidebar-toc-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.home__toc-list {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 8px 0;
}

.home__toc-empty {
  text-align: center;
  color: #9ca3af;
  padding: 32px 16px;
  font-size: 14px;
}

.home__toc-item {
  padding: 8px 16px 8px 20px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  line-height: 1.6;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home__toc-item:hover {
  background: #f3f4f6;
  color: var(--primary-color);
}

.home__toc-item--h2 {
  padding-left: 20px;
  font-weight: 500;
  font-size: 14px;
}

.home__toc-item--h3 {
  padding-left: 36px;
  font-size: 13px;
  color: #9ca3af;
}

.home__toc-item--active {
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  background: #f0f7ff;
  font-weight: 500;
}

.home__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home__title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.home__title:hover {
  opacity: 0.9;
}

.home__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--card-bg);
}

.home__main-header {
  flex-shrink: 0;
  width: 100%;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: auto;
  min-height: 64px;
}

.home__back-button {
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
  margin-right: 16px;
}

.home__back-button:hover {
  background: #e5e7eb;
}

.home__back-button:active {
  background: #d1d5db;
}

.home__back-icon {
  width: 16px;
  height: 16px;
}

@media (max-width: 768px) {
  .home {
    flex-direction: column;
  }

  .home__sidebar {
    width: 100%;
    min-height: 0;
    flex-basis: 100%;
    height: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .home__sidebar--hidden,
  .home__sidebar--content-active {
    display: none;
  }

  .home__main {
    width: 100%;
    height: 100%;
  }

  .home__main--hidden {
    display: none;
  }

  .home__main-header {
    padding: 10px 12px;
    min-height: 48px;
    gap: 8px;
    flex-wrap: nowrap;
    align-items: center;
  }

  .home__back-button {
    padding: 8px 10px;
    font-size: 0;
    flex-shrink: 0;
    margin-right: 4px;
  }

  .home__back-text {
    display: none;
  }

  .home__back-button .home__back-icon {
    margin: 0;
  }

  .home__back-icon {
    width: 20px;
    height: 20px;
  }

  .home__title {
    font-size: 16px;
  }
}
</style>
