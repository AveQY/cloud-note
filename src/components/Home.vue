<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import NoteList from './NoteList.vue'
import NoteContent from './NoteContent.vue'
import NoteActions from './NoteActions.vue'
import InfoDialog from './InfoDialog.vue'
import DropdownMenu from './DropdownMenu.vue'
import type { Note } from '@/types'

const router = useRouter()
const selectedNote = ref<Note | null>(null)
const searchKeyword = ref('')
const isEditing = ref(false)
const saving = ref(false)
const refreshKey = ref(0)
const noteListRef = ref<InstanceType<typeof NoteList> | null>(null)
const currentNoteContent = ref('')
const showSidebar = ref(true)
const showAboutDialog = ref(false)
const aboutContent = ref('')

const handleSelectNote = (note: Note) => {
  selectedNote.value = note
  isEditing.value = false
  showSidebar.value = false
}

const handleEditNote = (note: Note) => {
  selectedNote.value = note
  isEditing.value = true
  showSidebar.value = false
}

const handleEdit = () => {
  isEditing.value = true
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

const handleSave = async (content: string) => {
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
    
    refreshKey.value++
    isEditing.value = false
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

const handleLogout = () => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('username')
  localStorage.removeItem('loginTime')
  localStorage.removeItem('expireTime')
  router.push('/login')
}

const menuItems = [
  {
    id: 'markdown',
    label: 'Markdown语法',
    icon: '<path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C7.59 4 4 7.59 4 12C4 16.41 7.59 20 12 20ZM11 7H13V9H11V7ZM13 17H11V11H13V17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: () => {
      window.open('https://www.markdown.cn/docs/cheat-sheet', '_blank')
    }
  },
  {
    id: 'logout',
    label: '退出登录',
    icon: '<path d="M9 21H5C4.46957 21 4 20.5304 4 20V4C4 3.46957 4.46957 3 5 3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 9L16 14L11 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: handleLogout
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
          返回
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
        @save="handleSave"
        @cancel="handleBackToList"
        @content-loaded="currentNoteContent = $event"
      />
    </main>
    <InfoDialog
      :show="showAboutDialog"
      title="关于"
      :content="aboutContent"
      @close="handleCloseAbout"
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
  width: 320px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  background-color: var(--card-bg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.home__sidebar-header {
  padding: 18px 24px;
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
    padding: 12px 16px;
    height: auto;
    min-height: 48px;
    gap: 12px;
  }

  .home__back-button {
    padding: 6px 12px;
    font-size: 13px;
  }

  .home__back-icon {
    width: 18px;
    height: 18px;
  }

  .home__title {
    font-size: 16px;
  }
}
</style>
