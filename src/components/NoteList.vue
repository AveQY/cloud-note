<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, nextTick, watch } from 'vue'
import { useNotes } from '@/composables/useNotes'
import NoteItem from './NoteItem.vue'
import DropdownMenu from './DropdownMenu.vue'
import RenameDialog from './RenameDialog.vue'
import CreateNoteDialog from './CreateNoteDialog.vue'
import ContextMenu from './ContextMenu.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import type { Note } from '@/types'

interface Props {
  searchKeyword?: string
  selectedNote?: Note | null
}

interface Emits {
  select: [note: Note]
  'update:searchKeyword': [value: string]
  edit: [note: Note]
  notesUpdated: []
  noteDeleted: []
}

const props = withDefaults(defineProps<Props>(), {
  searchKeyword: '',
  selectedNote: null
})

const emit = defineEmits<Emits>()

const { notes, loading, loadingMore, error, hasMore, loadNotes, loadMore, reset } = useNotes()
const fileInputRef = ref<HTMLInputElement | null>(null)
const showRenameDialog = ref(false)
const renamingNote = ref<Note | null>(null)
const showCreateDialog = ref(false)
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTargetNote = ref<Note | null>(null)
const listContainerRef = ref<HTMLElement | null>(null)
const showDeleteDialog = ref(false)
const deletingNote = ref<Note | null>(null)

defineExpose({
  notes,
  loadNotes
})

const handleScroll = () => {
  if (!listContainerRef.value || loadingMore.value || !hasMore.value) return

  const container = listContainerRef.value
  const { scrollTop, scrollHeight, clientHeight } = container

  const threshold = 100
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold

  if (isNearBottom) {
    console.log('滚动到底部，加载更多...', { scrollTop, scrollHeight, clientHeight, hasMore: hasMore.value })
    loadMore()
  }
}

const bindScrollEvent = () => {
  if (listContainerRef.value) {
    listContainerRef.value.addEventListener('scroll', handleScroll)
    console.log('滚动事件已绑定')
  }
}

const unbindScrollEvent = () => {
  if (listContainerRef.value) {
    listContainerRef.value.removeEventListener('scroll', handleScroll)
  }
}

onMounted(() => {
  loadNotes()
})

watch([loading, notes], ([isLoading, currentNotes]) => {
  if (!isLoading && currentNotes.length > 0) {
    nextTick(() => {
      bindScrollEvent()
    })
  }
}, { immediate: true })

watch(() => props.searchKeyword, (newKeyword) => {
  if (!newKeyword) {
    reset()
    loadNotes()
  }
})

onUnmounted(() => {
  unbindScrollEvent()
})

const filteredNotes = computed(() => {
  if (!props.searchKeyword) {
    return notes.value
  }
  const keyword = props.searchKeyword.toLowerCase()
  return notes.value.filter(note => 
    note.title.toLowerCase().includes(keyword)
  )
})

const handleSelectNote = (note: Note) => {
  emit('select', note)
}

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:searchKeyword', target.value)
}

const handleCreateNote = () => {
  showCreateDialog.value = true
}

const handleConfirmCreateNote = async (title: string) => {
  try {
    const response = await fetch('/api/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title
      })
    })
    
    if (!response.ok) {
      throw new Error('创建失败')
    }
    
    const data = await response.json()
    loadNotes()
    
    if (data.note) {
      emit('select', data.note)
    }
    
    showCreateDialog.value = false
  } catch (e) {
    console.error('创建笔记失败:', e)
    alert('创建笔记失败，请重试')
  }
}

const handleCancelCreateNote = () => {
  showCreateDialog.value = false
}

const handleUploadNote = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  if (!file.name.endsWith('.md')) {
    alert('请上传 .md 文件')
    return
  }
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('上传失败')
    }
    
    const data = await response.json()
    loadNotes()
    
    if (data.note) {
      emit('select', data.note)
    }
    
    if (target) {
      target.value = ''
    }
  } catch (e) {
    console.error('上传笔记失败:', e)
    alert('上传笔记失败，请重试')
  }
}

const handleEditNote = (note: Note) => {
  emit('edit', note)
}

const handleRenameNote = (note: Note) => {
  renamingNote.value = note
  showRenameDialog.value = true
}

const handleConfirmRename = async (newTitle: string) => {
  if (!renamingNote.value) return
  
  try {
    const response = await fetch('/api/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: renamingNote.value.path,
        newTitle: newTitle
      })
    })
    
    if (!response.ok) {
      throw new Error('重命名失败')
    }
    
    const data = await response.json()
    loadNotes()
    
    if (data.note) {
      emit('select', data.note)
    }
    
    showRenameDialog.value = false
    renamingNote.value = null
  } catch (e) {
    console.error('重命名失败:', e)
    alert('重命名失败，请重试')
  }
}

const handleCancelRename = () => {
  showRenameDialog.value = false
  renamingNote.value = null
}

const handleDeleteNote = (note: Note) => {
  deletingNote.value = note
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!deletingNote.value) return
  
  try {
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: deletingNote.value.path
      })
    })
    
    if (!response.ok) {
      throw new Error('删除失败')
    }
    
    showDeleteDialog.value = false
    deletingNote.value = null
    loadNotes()
    emit('noteDeleted')
  } catch (e) {
    console.error('删除失败:', e)
    alert('删除失败，请重试')
  }
}

const cancelDelete = () => {
  showDeleteDialog.value = false
  deletingNote.value = null
}

const handleContextMenu = (event: MouseEvent, note: Note) => {
  event.preventDefault()
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuTargetNote.value = note
  showContextMenu.value = true
}

const closeContextMenu = () => {
  showContextMenu.value = false
  contextMenuTargetNote.value = null
}

const handleContextMenuRename = () => {
  if (contextMenuTargetNote.value) {
    handleRenameNote(contextMenuTargetNote.value)
  }
  closeContextMenu()
}

const handleContextMenuEdit = () => {
  if (contextMenuTargetNote.value) {
    handleEditNote(contextMenuTargetNote.value)
  }
  closeContextMenu()
}

const handleContextMenuDelete = () => {
  if (contextMenuTargetNote.value) {
    handleDeleteNote(contextMenuTargetNote.value)
  }
  closeContextMenu()
}

const contextMenuItems = [
  {
    id: 'rename',
    label: '重命名',
    icon: '<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13.8822L19.7071 14.1751C19.3166 14.5656 18.6834 14.5656 18.2929 14.1751L11 7.88218V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 7.88218L18.2929 10.6751" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: handleContextMenuRename
  },
  {
    id: 'edit',
    label: '编辑',
    icon: '<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13.8822L19.7071 14.1751C19.3166 14.5656 18.6834 14.5656 18.2929 14.1751L11 7.88218V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 7.88218L18.2929 10.6751" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: handleContextMenuEdit
  },
  {
    id: 'delete',
    label: '删除',
    icon: '<path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.7893 5 20.5304 5 20V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: handleContextMenuDelete,
    danger: true
  }
]

const menuItems = [
  {
    id: 'create',
    label: '新增笔记',
    icon: '<path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 18H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 10H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: handleCreateNote
  },
  {
    id: 'upload',
    label: '上传笔记',
    icon: '<path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    onClick: handleUploadNote
  }
]
</script>

<template>
  <div class="note-list">
    <div class="note-list__search">
      <div class="note-list__search-wrapper">
        <svg class="note-list__search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <input
          type="text"
          class="note-list__search-input"
          placeholder="搜索笔记..."
          :value="searchKeyword"
          @input="handleSearch"
        />
      </div>
      <DropdownMenu :items="menuItems" />
    </div>
    <input
      ref="fileInputRef"
      type="file"
      accept=".md"
      style="display: none"
      @change="handleFileChange"
    />
    <div v-if="loading" class="note-list__loading">
      <svg class="note-list__loading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>加载中...</p>
    </div>
    <div v-else-if="error" class="note-list__error">
      <svg class="note-list__error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 16V16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>{{ error }}</p>
    </div>
    <div v-else-if="filteredNotes.length === 0" class="note-list__empty">
      <svg class="note-list__empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>{{ searchKeyword ? '未找到匹配的笔记' : '暂无笔记' }}</p>
    </div>
    <div v-else class="note-list__items" ref="listContainerRef">
      <NoteItem
        v-for="note in filteredNotes"
        :key="note.id"
        :note="note"
        :selected="selectedNote?.id === note.id"
        @select="handleSelectNote"
        @contextmenu="handleContextMenu"
      />
      <div v-if="loadingMore" class="note-list__loading-more">
        <svg class="note-list__loading-more-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>加载中...</p>
      </div>
      <div v-else-if="!hasMore && filteredNotes.length > 0" class="note-list__no-more">
        <p>没有更多了</p>
      </div>
    </div>
    <RenameDialog
      :show="showRenameDialog"
      :title="renamingNote?.title || ''"
      @confirm="handleConfirmRename"
      @cancel="handleCancelRename"
    />
    <CreateNoteDialog
      :show="showCreateDialog"
      @confirm="handleConfirmCreateNote"
      @cancel="handleCancelCreateNote"
    />
    <ContextMenu
      :items="contextMenuItems"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      :show="showContextMenu"
      @close="closeContextMenu"
    />
    <ConfirmDialog
      :show="showDeleteDialog"
      title="删除笔记"
      message="确定要删除这个笔记吗？删除后将无法恢复。"
      confirm-text="删除"
      cancel-text="取消"
      type="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.note-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.note-list__search {
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: #ffffff;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-list__search-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.note-list__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  pointer-events: none;
}

.note-list__search-input {
  width: 100%;
  padding: 8px 12px 8px 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background: var(--bg-color);
}

.note-list__search-input:focus {
  border-color: var(--primary-color);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(81, 191, 111, 0.1);
}

.note-list__search-input::placeholder {
  color: var(--text-secondary);
}

.note-list__loading,
.note-list__error,
.note-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
  flex: 1;
}

.note-list__loading-icon,
.note-list__error-icon,
.note-list__empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.note-list__loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.note-list__error-icon {
  color: #ef4444;
}

.note-list__empty-icon {
  color: var(--primary-color);
}

.note-list__loading p,
.note-list__error p,
.note-list__empty p {
  font-size: 16px;
  margin: 0;
}

.note-list__items {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
}

.note-list__loading-more,
.note-list__no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-secondary);
  gap: 8px;
}

.note-list__loading-more-icon {
  width: 16px;
  height: 16px;
  animation: rotate 1s linear infinite;
}

.note-list__loading-more p,
.note-list__no-more p {
  font-size: 14px;
  margin: 0;
}

@media (max-width: 768px) {
  .note-list__search {
    padding: 12px;
  }

  .note-list__search-input {
    padding: 10px 12px 10px 36px;
    font-size: 14px;
  }

  .note-list__search-icon {
    left: 10px;
    width: 14px;
    height: 14px;
  }

  .note-list__items {
    padding: 12px;
    gap: 8px;
  }

  .note-list__loading p,
  .note-list__error p,
  .note-list__empty p {
    font-size: 14px;
  }

  .note-list__loading-icon,
  .note-list__error-icon,
  .note-list__empty-icon {
    width: 48px;
    height: 48px;
  }
}
</style>
