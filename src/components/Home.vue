<script setup lang="ts">
import { ref, computed } from 'vue'
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
const currentNoteContent = ref('')
const editingContent = ref('')
const initialEditContent = ref('')
const pendingNote = ref<Note | null>(null)
const showUnsavedDialog = ref(false)
const showSidebar = ref(true)
const showAboutDialog = ref(false)
const aboutContent = ref('')

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
    <aside class="home__sidebar" :class="{ 'home__sidebar--hidden': !showSidebar }">
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
}

.home__sidebar {
  width: 360px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  background-color: var(--card-bg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.home__sidebar-header {
  padding: 18px 32px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
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
    height: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .home__sidebar--hidden {
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
