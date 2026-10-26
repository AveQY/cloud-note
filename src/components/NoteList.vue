<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Note } from '@/types'
import CategoryDialog from './CategoryDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'

interface Category { id: string; name: string; createdAt: number }
interface Props { selectedNote?: Note | null; searchKeyword?: string }
interface Emits {
  select: [note: Note]
  edit: [note: Note]
  'note-deleted': []
  'update:searchKeyword': [value: string]
  settings: []
  about: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const notes = ref<Note[]>([])
const categories = ref<Category[]>([])
const counts = ref<Record<string, number>>({})
const selectedCategory = ref('all')
const sortBy = ref<'updated' | 'created' | 'title'>('updated')
const loading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const showCategoryDialog = ref(false)
const noteToMove = ref<Note | null>(null)
const multiSelectMode = ref(false)
const selectedPaths = ref<Set<string>>(new Set())
const showDeleteConfirm = ref(false)
const showUploadConflict = ref(false)
const pendingUpload = ref<{ file: File; event: Event } | null>(null)
const longPressTimer = ref<number | null>(null)
const longPressTriggered = ref(false)

type ViewMode = 'grid' | 'list'
const readViewMode = (): ViewMode => {
  try { return (localStorage.getItem('noteViewMode') as ViewMode) || 'grid' } catch { return 'grid' }
}
const viewMode = ref<ViewMode>(readViewMode())
const setViewMode = (mode: ViewMode) => {
  viewMode.value = mode
  try { localStorage.setItem('noteViewMode', mode) } catch { /* ignore */ }
}

const PIN_KEY = 'pinnedNotes'
const readPins = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PIN_KEY)
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
  } catch { return new Set<string>() }
}
const pinnedPaths = ref<Set<string>>(readPins())
const savePins = () => {
  try { localStorage.setItem(PIN_KEY, JSON.stringify([...pinnedPaths.value])) } catch { /* ignore */ }
}
const isPinned = (note: Note) => pinnedPaths.value.has(note.path)
const togglePin = (note: Note) => {
  const next = new Set(pinnedPaths.value)
  if (next.has(note.path)) next.delete(note.path)
  else next.add(note.path)
  pinnedPaths.value = next
  savePins()
}

const keyword = computed({
  get: () => props.searchKeyword || '',
  set: value => emit('update:searchKeyword', value)
})

const categoryName = (id?: string | null) => categories.value.find(item => item.id === id)?.name || '未分类'
const dotPalette = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#f43f5e', '#6366f1', '#14b8a6', '#eab308', '#ec4899']
const categoryColor = (id?: string | null) => {
  if (!id) return '#94a3b8'
  const index = categories.value.findIndex(item => item.id === id)
  return index < 0 ? '#94a3b8' : dotPalette[index % dotPalette.length]
}

const totalCount = computed(() => notes.value.length)
const totalSizeKB = computed(() => Math.round(notes.value.reduce((sum, note) => sum + (note.size || 0), 0) / 1024))
const currentTitle = computed(() => selectedCategory.value === 'all' ? '全部笔记' : selectedCategory.value === 'uncategorized' ? '未分类' : categoryName(selectedCategory.value))

const visibleNotes = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  const result = notes.value.filter(note => {
    const matchCategory = selectedCategory.value === 'all' ||
      (selectedCategory.value === 'uncategorized' ? !note.categoryId : note.categoryId === selectedCategory.value)
    return matchCategory && (!key || note.title.toLowerCase().includes(key))
  })
  return [...result].sort((a, b) => {
    if (sortBy.value === 'title') return a.title.localeCompare(b.title, 'zh-CN')
    const field = sortBy.value === 'created' ? 'createdAt' : 'updatedAt'
    return new Date(b[field] || 0).getTime() - new Date(a[field] || 0).getTime()
  })
})

const visibleRatio = computed(() => totalCount.value ? Math.max(4, Math.round(visibleNotes.value.length / totalCount.value * 100)) : 0)

const timeOf = (note: Note) => new Date(note.updatedAt || note.createdAt || 0).getTime()
const pinnedVisible = computed(() => visibleNotes.value.filter(isPinned))
const featuredNotes = computed(() => {
  const recent = [...visibleNotes.value].sort((a, b) => timeOf(b) - timeOf(a))
  return [...pinnedVisible.value, ...recent.filter(note => !isPinned(note))].slice(0, 3)
})
const featuredTitle = computed(() => pinnedVisible.value.length ? '置顶与常用' : '最近更新')
const showFeatured = computed(() => !multiSelectMode.value && selectedCategory.value === 'all' && !keyword.value.trim() && featuredNotes.value.length > 0)
const sortLabel = computed(() => sortBy.value === 'created' ? '最近创建' : sortBy.value === 'title' ? '标题排序' : '最近修改')

const sizeLabel = (note: Note) => note.size ? `${Math.max(1, Math.round(note.size / 1024))} KB` : '空白'
const typeLabel = (note: Note) => note.size ? 'Markdown 笔记' : '空白文档'

const formatDate = (date?: Date | number) => {
  if (!date) return '未知时间'
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const fetchAll = async () => {
  loading.value = true
  try {
    const [notesRes, categoriesRes] = await Promise.all([
      fetch('/api/files?page=1&pageSize=10000'),
      fetch('/api/categories')
    ])
    if (!notesRes.ok || !categoriesRes.ok) throw new Error('加载失败')
    const notesData = await notesRes.json()
    const categoryData = await categoriesRes.json()
    const rawNotes = notesData.data || notesData.files || []
    notes.value = rawNotes.map((note: Note) => ({
      ...note,
      id: note.id || note.filename,
      createdAt: note.createdAt ? new Date(note.createdAt) : undefined,
      updatedAt: note.updatedAt ? new Date(note.updatedAt) : undefined
    }))
    categories.value = categoryData.categories || []
    counts.value = categoryData.counts || {}
  } finally { loading.value = false }
}

const createCategory = async () => {
  const name = window.prompt('请输入分类名称')?.trim()
  if (!name) return
  const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  const data = await response.json()
  if (!response.ok) return alert(data.error || '创建分类失败')
  await fetchAll()
  selectedCategory.value = data.category.id
}

const manageCategory = async (category: Category) => {
  const action = window.prompt(`管理分类「${category.name}」\n输入新名称可重命名；输入 DELETE 删除分类`)?.trim()
  if (!action) return
  if (action === 'DELETE') {
    if (!confirm(`删除分类「${category.name}」？笔记会移入未分类。`)) return
    await fetch('/api/categories/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: category.id }) })
    if (selectedCategory.value === category.id) selectedCategory.value = 'all'
  } else {
    const response = await fetch('/api/categories/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: category.id, name: action }) })
    const data = await response.json()
    if (!response.ok) return alert(data.error || '重命名失败')
  }
  await fetchAll()
}

const createNote = async () => {
  const title = window.prompt('请输入笔记标题')?.trim()
  if (!title) return
  const categoryId = selectedCategory.value !== 'all' && selectedCategory.value !== 'uncategorized' ? selectedCategory.value : null
  const response = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, categoryId }) })
  const data = await response.json()
  if (!response.ok) return alert(data.error || '创建失败')
  await fetchAll()
  emit('edit', { ...data.note, categoryId })
}

const moveNote = (note: Note) => {
  noteToMove.value = note
  showCategoryDialog.value = true
}

const handleCategorySelect = async (categoryId: string | null) => {
  if (!noteToMove.value) {
    await applyBatchCategory(categoryId)
    return
  }
  const response = await fetch('/api/note-category', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: noteToMove.value.path, categoryId }) })
  if (!response.ok) {
    alert('移动分类失败')
    showCategoryDialog.value = false
    return
  }
  noteToMove.value.categoryId = categoryId
  await fetchAll()
  showCategoryDialog.value = false
}

const handleCategoryCreate = async (name: string) => {
  const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
  const data = await response.json()
  if (!response.ok) {
    alert(data.error || '创建分类失败')
    return
  }
  await fetchAll()
  if (noteToMove.value) {
    const moveResponse = await fetch('/api/note-category', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: noteToMove.value.path, categoryId: data.category.id }) })
    if (moveResponse.ok) {
      noteToMove.value.categoryId = data.category.id
      await fetchAll()
    }
    showCategoryDialog.value = false
  } else {
    await applyBatchCategory(data.category.id)
  }
}

const renameNote = async (note: Note) => {
  const newTitle = window.prompt('请输入新的笔记标题', note.title)?.trim()
  if (!newTitle || newTitle === note.title) return
  const response = await fetch('/api/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: note.path, newTitle }) })
  const data = await response.json()
  if (!response.ok) return alert(data.error || '重命名失败')
  await fetchAll()
}

const deleteNote = async (note: Note) => {
  if (!confirm(`确定删除「${note.title}」？`)) return
  const response = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: note.path }) })
  if (!response.ok) return alert('删除失败')
  await fetchAll()
  emit('note-deleted')
}

// ===== Multi-select =====
const enterMultiSelect = (note: Note) => {
  multiSelectMode.value = true
  selectedPaths.value = new Set([note.path])
}

const exitMultiSelect = () => {
  multiSelectMode.value = false
  selectedPaths.value = new Set()
}

const toggleSelect = (note: Note) => {
  const newSet = new Set(selectedPaths.value)
  if (newSet.has(note.path)) {
    newSet.delete(note.path)
  } else {
    newSet.add(note.path)
  }
  selectedPaths.value = newSet
  if (newSet.size === 0) exitMultiSelect()
}

const handleTitleClick = () => window.location.reload()
const handleCardClick = (note: Note) => {
  if (multiSelectMode.value) {
    toggleSelect(note)
  } else {
    emit('select', note)
  }
}

const selectAll = () => {
  selectedPaths.value = new Set(visibleNotes.value.map(n => n.path))
}

const selectedCount = computed(() => selectedPaths.value.size)

const handleContextMenu = (event: MouseEvent, note: Note) => {
  event.preventDefault()
  if (!multiSelectMode.value) {
    enterMultiSelect(note)
  } else {
    toggleSelect(note)
  }
}

const handleTouchStart = (note: Note) => {
  longPressTriggered.value = false
  longPressTimer.value = window.setTimeout(() => {
    longPressTriggered.value = true
    if (navigator.vibrate) navigator.vibrate(50)
    if (!multiSelectMode.value) {
      enterMultiSelect(note)
    } else {
      toggleSelect(note)
    }
  }, 500)
}

const handleTouchEnd = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

const handleTouchMove = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// Batch delete
const requestBatchDelete = () => {
  if (selectedPaths.value.size === 0) return
  showDeleteConfirm.value = true
}

const confirmBatchDelete = async () => {
  showDeleteConfirm.value = false
  const paths = Array.from(selectedPaths.value)
  let failed = 0
  for (const path of paths) {
    try {
      const response = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
      if (!response.ok) failed++
    } catch {
      failed++
    }
  }
  exitMultiSelect()
  await fetchAll()
  emit('note-deleted')
  if (failed > 0) alert(`${failed} 篇笔记删除失败`)
}

// Batch category
const requestBatchCategory = () => {
  if (selectedPaths.value.size === 0) return
  noteToMove.value = null
  showCategoryDialog.value = true
}

const applyBatchCategory = async (categoryId: string | null) => {
  const paths = Array.from(selectedPaths.value)
  let failed = 0
  for (const path of paths) {
    try {
      const response = await fetch('/api/note-category', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, categoryId }) })
      if (!response.ok) failed++
    } catch {
      failed++
    }
  }
  exitMultiSelect()
  await fetchAll()
  showCategoryDialog.value = false
  if (failed > 0) alert(`${failed} 篇笔记移动分类失败`)
}

const uploadNote = () => fileInput.value?.click()
const handleUpload = async (event: Event, overwrite = false) => {
  const input = event.target as HTMLInputElement
  const pending = pendingUpload.value
  const file = overwrite ? pending?.file : input.files?.[0]
  if (!file) return

  const form = new FormData()
  form.append('file', file)
  if (selectedCategory.value && selectedCategory.value !== 'all' && selectedCategory.value !== 'uncategorized') {
    form.append('categoryId', selectedCategory.value)
  }
  if (overwrite) form.append('overwrite', 'true')
  const response = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await response.json()

  if (response.status === 409 && data.code === 'NOTE_CONFLICT') {
    pendingUpload.value = { file, event }
    showUploadConflict.value = true
    return
  }
  if (!response.ok) {
    alert(data.error || '上传失败')
    return
  }
  pendingUpload.value = null
  await fetchAll()
  input.value = ''
}

const confirmUploadOverwrite = async () => {
  showUploadConflict.value = false
  if (pendingUpload.value) await handleUpload(pendingUpload.value.event, true)
}

const cancelUploadOverwrite = () => {
  showUploadConflict.value = false
  pendingUpload.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const handleShortcut = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
  }
}

watch(() => props.selectedNote, note => { if (!note) fetchAll() })
onMounted(() => {
  window.addEventListener('keydown', handleShortcut)
  fetchAll()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
})
defineExpose({ fetchNotes: fetchAll })
</script>

<template>
  <div class="library">
    <aside class="library__categories">
      <div class="brand">
        <div class="brand__mark">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H11a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 20.5v-16Z" fill="currentColor" opacity=".9"/>
            <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H13a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h5.5a1.5 1.5 0 0 0 1.5-1.5v-16Z" fill="currentColor" opacity=".55"/>
          </svg>
        </div>
        <div class="brand__meta">
          <div class="brand__name">云笔记<span class="brand__badge">资料库</span></div>
          <div class="brand__sub">个人知识空间</div>
        </div>
      </div>

      <nav class="nav">
        <div class="nav__label">视图导航</div>
        <button class="nav__item" :class="{ 'nav__item--active': selectedCategory === 'all' }" @click="selectedCategory = 'all'">
          <span class="nav__icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h3.2l1.8 2H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          </span>
          <span class="nav__text">全部笔记</span>
          <span class="nav__count nav__count--solid">{{ totalCount }}</span>
        </button>
        <button class="nav__item" :class="{ 'nav__item--active': selectedCategory === 'uncategorized' }" @click="selectedCategory = 'uncategorized'">
          <span class="nav__icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </span>
          <span class="nav__text">未分类</span>
          <span class="nav__count">{{ counts.uncategorized || 0 }}</span>
        </button>
      </nav>

      <div class="cats">
        <div class="cats__head">
          <span class="cats__head-label">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h6v6H4zM14 6h6v6h-6zM4 16h6v4H4zM14 16h6v4h-6z" stroke="currentColor" stroke-width="1.6"/></svg>
            我的分类
          </span>
          <button class="cats__add" type="button" title="新建分类" @click="createCategory">+</button>
        </div>
        <ul class="cats__list">
          <li v-for="category in categories" :key="category.id">
            <button
              class="cats__item"
              :class="{ 'cats__item--active': selectedCategory === category.id }"
              type="button"
              title="双击可重命名或删除"
              @click="selectedCategory = category.id"
              @dblclick="manageCategory(category)"
            >
              <span class="cats__dot" :style="{ backgroundColor: categoryColor(category.id) }"></span>
              <span class="cats__name">{{ category.name }}</span>
              <span class="cats__count">{{ counts[category.id] || 0 }}</span>
            </button>
          </li>
        </ul>
        <p class="cats__hint">双击分类可重命名或删除</p>
      </div>

      <div class="storage">
        <div class="storage__row">
          <span class="storage__label">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17a4 4 0 0 1-.4-7.97 5.5 5.5 0 0 1 10.6-1.5A3.75 3.75 0 0 1 18 17H7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 13.6l2 2 3.6-3.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            云端已同步
          </span>
          <span class="storage__value">{{ totalCount }} 篇 · {{ totalSizeKB }} KB</span>
        </div>
        <div class="storage__bar"><span class="storage__fill" :style="{ width: visibleRatio + '%' }"></span></div>
      </div>

      <div class="side-foot">
        <div class="side-foot__grid">
          <button class="ghost-btn" type="button" @click="emit('about')">关于</button>
          <button class="ghost-btn" type="button" @click="emit('settings')">设置</button>
        </div>
        <div class="profile">
          <span class="profile__avatar">U</span>
          <span class="profile__meta">
            <span class="profile__name">本地工作区</span>
            <span class="profile__sub">本地存储 · 已同步</span>
          </span>
          <span class="profile__dot"></span>
        </div>
      </div>
    </aside>

    <section class="library__content">
      <header class="topbar">
        <div class="topbar__title">
          <div class="crumbs"><span>工作空间</span><span class="crumbs__sep">/</span><span class="crumbs__current">知识资料库</span></div>
          <div class="topbar__heading">
            <h1 @click="handleTitleClick">{{ currentTitle }}</h1>
            <span class="pill">共 {{ visibleNotes.length }} 篇笔记</span>
          </div>
        </div>

        <div class="topbar__actions">
          <div class="search">
            <svg class="search__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <input ref="searchInputRef" v-model="keyword" class="search__input" placeholder="快速搜索笔记或内容..." />
            <kbd class="search__kbd">⌘K</kbd>
          </div>

          <div class="viewtoggle">
            <button type="button" class="viewtoggle__btn" :class="{ 'viewtoggle__btn--active': viewMode === 'grid' }" title="网格视图" @click="setViewMode('grid')">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" stroke-width="1.7"/></svg>
            </button>
            <button type="button" class="viewtoggle__btn" :class="{ 'viewtoggle__btn--active': viewMode === 'list' }" title="列表视图" @click="setViewMode('list')">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
            </button>
          </div>

          <div class="select">
            <select v-model="sortBy" class="select__input" aria-label="排序方式">
              <option value="updated">最近修改</option>
              <option value="created">最近创建</option>
              <option value="title">标题排序</option>
            </select>
            <svg class="select__chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <button class="btn" type="button" @click="uploadNote">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V5M12 5l-4 4M12 5l4 4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            上传
          </button>
          <button class="btn btn--primary" type="button" @click="createNote">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            新建笔记
          </button>
          <input ref="fileInput" hidden type="file" accept=".md" @change="handleUpload" />
        </div>

        <div class="topbar__mobile">
          <button class="icon-btn" type="button" title="关于" @click="emit('about')">i</button>
          <button class="icon-btn" type="button" title="设置" @click="emit('settings')">⚙</button>
        </div>
      </header>

      <div class="library__mobile-categories">
        <button :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'">全部</button>
        <button :class="{ active: selectedCategory === 'uncategorized' }" @click="selectedCategory = 'uncategorized'">未分类</button>
        <button v-for="category in categories" :key="category.id" :class="{ active: selectedCategory === category.id }" @click="selectedCategory = category.id">{{ category.name }}</button>
        <button @click="createCategory">＋</button>
      </div>

      <div class="library__scroll">
        <div v-if="loading" class="library__empty">正在加载...</div>
        <div v-else-if="visibleNotes.length === 0" class="library__empty">
          <strong>这里还没有笔记</strong>
          <span>新建笔记或从其他分类移动到这里</span>
        </div>
        <template v-else>
          <div v-if="multiSelectMode" class="library__multiselect">
            <div class="library__multiselect-info">
              <span>已选择 <strong>{{ selectedCount }}</strong> 篇笔记</span>
            </div>
            <div class="library__multiselect-actions">
              <button class="library__multiselect-button" @click="selectAll">全选</button>
              <button class="library__multiselect-button" @click="requestBatchCategory">分类</button>
              <button class="library__multiselect-button library__multiselect-button--danger" @click="requestBatchDelete">删除</button>
              <button class="library__multiselect-button library__multiselect-button--cancel" @click="exitMultiSelect">取消</button>
            </div>
          </div>

          <section v-if="showFeatured" class="section">
            <div class="section__head">
              <h3 class="section__title">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 4h5l-.7 7.3 2.7 2.7v1.5H14V21h-4v-5.5H7.5V14l2.7-2.7L9.5 4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
                {{ featuredTitle }}
              </h3>
              <span class="section__meta">{{ pinnedVisible.length ? `已置顶 ${pinnedVisible.length} 篇` : '按最近修改排列' }}</span>
            </div>
            <div class="featured__grid">
              <article
                v-for="note in featuredNotes"
                :key="'featured-' + note.filename"
                class="fcard"
                @click="handleCardClick(note)"
              >
                <div class="fcard__top">
                  <span class="tag" :style="{ color: categoryColor(note.categoryId) }">
                    <span class="tag__dot" :style="{ backgroundColor: categoryColor(note.categoryId) }"></span>
                    {{ categoryName(note.categoryId) }}
                  </span>
                  <button
                    class="pin-btn"
                    :class="{ 'pin-btn--on': isPinned(note) }"
                    type="button"
                    :title="isPinned(note) ? '取消置顶' : '置顶'"
                    @click.stop="togglePin(note)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 4h5l-.7 7.3 2.7 2.7v1.5H14V21h-4v-5.5H7.5V14l2.7-2.7L9.5 4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
                  </button>
                </div>
                <h4 class="fcard__title">{{ note.title }}</h4>
                <p class="fcard__desc">{{ typeLabel(note) }} · {{ sizeLabel(note) }}</p>
                <div class="fcard__foot">
                  <span>{{ formatDate(note.updatedAt) }}</span>
                  <span class="fcard__chevron">→</span>
                </div>
              </article>
            </div>
          </section>

          <section class="section">
            <div class="section__head">
              <h3 class="section__title">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h8l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                所有文档
              </h3>
              <span class="section__meta">按{{ sortLabel }}排列</span>
            </div>

            <div :class="viewMode === 'grid' ? 'note-grid' : 'note-rows'">
              <article
                v-for="note in visibleNotes"
                :key="note.filename"
                class="note-card"
                :class="{ 'note-card--selected': selectedPaths.has(note.path), 'note-card--row': viewMode === 'list' }"
                @click="handleCardClick(note)"
                @contextmenu="handleContextMenu($event, note)"
                @touchstart="handleTouchStart(note)"
                @touchend="handleTouchEnd"
                @touchmove="handleTouchMove"
              >
                <div v-if="multiSelectMode" class="note-card__checkbox">
                  <input type="checkbox" :checked="selectedPaths.has(note.path)" @click.stop @change="toggleSelect(note)" />
                </div>
                <div class="note-card__top">
                  <span class="note-card__icon">M↓</span>
                  <span class="note-card__size">{{ sizeLabel(note) }}</span>
                  <div class="note-card__menu" @click.stop>
                    <button type="button" :class="{ on: isPinned(note) }" :title="isPinned(note) ? '取消置顶' : '置顶'" @click="togglePin(note)">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 4h5l-.7 7.3 2.7 2.7v1.5H14V21h-4v-5.5H7.5V14l2.7-2.7L9.5 4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
                    </button>
                    <button type="button" title="分类" @click="moveNote(note)">分类</button>
                    <button type="button" title="重命名" @click="renameNote(note)">重命名</button>
                    <button type="button" title="删除" @click="deleteNote(note)">删除</button>
                  </div>
                </div>
                <h2>{{ note.title }}</h2>
                <p>{{ typeLabel(note) }}</p>
                <footer>
                  <span class="note-card__category" :style="{ color: categoryColor(note.categoryId) }">
                    <span class="tag__dot" :style="{ backgroundColor: categoryColor(note.categoryId) }"></span>
                    {{ categoryName(note.categoryId) }}
                  </span>
                  <time>{{ formatDate(note.updatedAt) }}</time>
                </footer>
              </article>
            </div>
          </section>
        </template>
      </div>
    </section>
  </div>
  <CategoryDialog
    :show="showCategoryDialog"
    :categories="categories"
    :current-category-id="null"
    :note-title="noteToMove ? noteToMove.title : `已选 ${selectedCount} 篇笔记`"
    @select="handleCategorySelect"
    @create="handleCategoryCreate"
    @cancel="showCategoryDialog = false"
  />
  <ConfirmDialog
    :show="showUploadConflict"
    title="笔记已存在"
    message="同名笔记已经存在，是否覆盖本机已有笔记？"
    confirm-text="覆盖上传"
    cancel-text="取消"
    type="warning"
    @confirm="confirmUploadOverwrite"
    @cancel="cancelUploadOverwrite"
  />
  <ConfirmDialog
    :show="showDeleteConfirm"
    title="批量删除"
    :message="`确定删除 ${selectedCount} 篇笔记吗？此操作不可撤销。`"
    type="danger"
    confirm-text="删除"
    @confirm="confirmBatchDelete"
    @cancel="showDeleteConfirm = false"
  />
</template>

<style scoped>
.library {
  --ink: #0f172a;
  --ink-soft: #64748b;
  --ink-faint: #94a3b8;
  --line: #e7ebef;
  --line-soft: #eef2f5;
  --surface: #ffffff;
  --canvas: #f6f8fa;
  --accent: var(--primary-color, #51bf6f);
  --accent-deep: var(--primary-dark, #3da358);
  --accent-wash: #ecfdf5;
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--canvas);
  color: var(--ink);
  font-family: "Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ---------- sidebar ---------- */
.library__categories {
  width: 268px;
  flex: 0 0 268px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 18px 14px 14px;
  border-right: 1px solid rgba(226, 232, 240, .7);
  background: rgba(255, 255, 255, .82);
  backdrop-filter: blur(18px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 6px 8px 18px;
  border-bottom: 1px solid var(--line-soft);
}
.brand__mark {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, var(--accent-deep), var(--accent) 60%, #34d399);
  box-shadow: 0 6px 16px -6px rgba(16, 185, 129, .65);
}
.brand__mark svg { width: 21px; height: 21px; }
.brand__meta { min-width: 0; }
.brand__name {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: #0b1220;
}
.brand__badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--accent-deep);
  background: var(--accent-wash);
  border: 1px solid rgba(16, 185, 129, .18);
}
.brand__sub {
  margin-top: 3px;
  font-size: 11px;
  color: var(--ink-faint);
}

.nav { padding-top: 16px; }
.nav__label,
.cats__head-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.nav__label { padding-left: 10px; }
.nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 2px 0;
  padding: 9px 11px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background .18s ease, color .18s ease, border-color .18s ease;
}
.nav__item:hover { background: #f1f5f4; color: #1e293b; }
.nav__item--active {
  background: var(--accent-wash);
  border-color: rgba(16, 185, 129, .14);
  color: #065f46;
  font-weight: 650;
}
.nav__icon {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: var(--ink-faint);
  background: #f1f5f4;
}
.nav__item--active .nav__icon { color: var(--accent-deep); background: rgba(16, 185, 129, .12); }
.nav__icon svg { width: 14px; height: 14px; }
.nav__text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav__count {
  min-width: 22px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 600;
  text-align: center;
}
.nav__count--solid { background: var(--accent-deep); color: #fff; }

.cats { padding-top: 4px; }
.cats__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 6px;
}
.cats__head svg { width: 12px; height: 12px; }
.cats__add {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px dashed rgba(16, 185, 129, .45);
  border-radius: 7px;
  background: transparent;
  color: var(--accent-deep);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: background .18s ease;
}
.cats__add:hover { background: var(--accent-wash); }
.cats__list { list-style: none; margin: 0; padding: 0; }
.cats__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  margin: 1px 0;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}
.cats__item:hover { background: #f1f5f4; color: #1e293b; }
.cats__item--active { background: #f0fdf4; color: #065f46; font-weight: 600; }
.cats__dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 999px; }
.cats__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cats__count { color: var(--ink-faint); font-size: 10.5px; }
.cats__hint {
  margin: 6px 0 0;
  padding: 0 10px;
  font-size: 10.5px;
  color: #b6bfca;
}

.storage {
  margin-top: auto;
  padding: 12px;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: #fafcfb;
}
.storage__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10.5px;
  color: var(--ink-soft);
}
.storage__label { display: inline-flex; align-items: center; gap: 5px; }
.storage__label svg { width: 13px; height: 13px; color: var(--accent-deep); }
.storage__value { color: var(--ink-faint); font-variant-numeric: tabular-nums; }
.storage__bar {
  height: 5px;
  margin-top: 9px;
  border-radius: 999px;
  background: #e8eef0;
  overflow: hidden;
}
.storage__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-deep), #34d399);
  transition: width .35s ease;
}

.side-foot { padding-top: 12px; }
.side-foot__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ghost-btn {
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font: inherit;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all .18s ease;
}
.ghost-btn:hover { border-color: rgba(16, 185, 129, .4); color: var(--accent-deep); background: #f6fdf9; }
.profile {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 10px;
  padding: 7px 8px;
  border-radius: 10px;
  transition: background .18s ease;
}
.profile:hover { background: #f4f8f6; }
.profile__avatar {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #e6f7ec;
  color: #0f6b46;
  font-size: 11px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(16, 185, 129, .22);
}
.profile__meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.profile__name { font-size: 11.5px; font-weight: 600; color: #334155; }
.profile__sub { font-size: 10px; color: var(--ink-faint); }
.profile__dot { width: 7px; height: 7px; border-radius: 999px; background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, .16); }

/* ---------- content ---------- */
.library__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--canvas);
}

.topbar {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 30px 15px;
  border-bottom: 1px solid rgba(226, 232, 240, .75);
  background: rgba(255, 255, 255, .72);
  backdrop-filter: blur(14px);
}
.crumbs {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  font-size: 11px;
  color: var(--ink-faint);
}
.crumbs__sep { color: #cbd5e1; }
.crumbs__current { color: var(--accent-deep); font-weight: 600; }
.topbar__heading { display: flex; align-items: baseline; gap: 10px; }
.topbar__heading h1 {
  margin: 0;
  font-size: 21px;
  font-weight: 750;
  letter-spacing: -.02em;
  color: #0b1220;
  cursor: pointer;
  user-select: none;
}
.pill {
  padding: 2px 8px;
  border-radius: 7px;
  background: #eef2f5;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
}

.topbar__actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

.search { position: relative; display: flex; align-items: center; }
.search__icon {
  position: absolute;
  left: 10px;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
  pointer-events: none;
}
.search__input {
  width: 220px;
  height: 36px;
  padding: 0 48px 0 32px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #f8fafc;
  color: #334155;
  font: inherit;
  font-size: 12px;
  outline: none;
  transition: all .18s ease;
}
.search__input::placeholder { color: #a5b0bd; }
.search__input:focus {
  background: #fff;
  border-color: rgba(16, 185, 129, .5);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, .12);
}
.search__kbd {
  position: absolute;
  right: 8px;
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
  color: #a5b0bd;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9.5px;
}

.viewtoggle {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #f1f5f9;
}
.viewtoggle__btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all .18s ease;
}
.viewtoggle__btn svg { width: 14px; height: 14px; }
.viewtoggle__btn:hover { color: #475569; }
.viewtoggle__btn--active { background: #fff; color: var(--accent-deep); box-shadow: 0 1px 3px rgba(15, 23, 42, .1); }

.select { position: relative; display: flex; align-items: center; }
.select__input {
  height: 36px;
  padding: 0 30px 0 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  color: #475569;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  appearance: none;
  cursor: pointer;
  outline: none;
}
.select__input:focus { border-color: rgba(16, 185, 129, .5); box-shadow: 0 0 0 3px rgba(16, 185, 129, .1); }
.select__chevron {
  position: absolute;
  right: 9px;
  width: 13px;
  height: 13px;
  color: var(--ink-faint);
  pointer-events: none;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 13px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  color: #475569;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all .18s ease;
}
.btn svg { width: 14px; height: 14px; }
.btn:hover { border-color: #cbd5e1; background: #f8fafc; }
.btn--primary {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(135deg, var(--accent-deep), #10b981);
  box-shadow: 0 6px 14px -6px rgba(16, 185, 129, .7);
}
.btn--primary:hover { filter: brightness(1.04); background: linear-gradient(135deg, var(--accent-deep), #10b981); }
.btn--primary:active { transform: scale(.98); }

.topbar__mobile { display: none; }
.icon-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-size: 14px;
  cursor: pointer;
}

.library__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 30px 34px;
}
.library__scroll::-webkit-scrollbar { width: 6px; }
.library__scroll::-webkit-scrollbar-thumb { background: #dbe3e8; border-radius: 999px; }

.section { margin-bottom: 26px; }
.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
}
.section__title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: #64748b;
}
.section__title svg { width: 14px; height: 14px; color: var(--accent-deep); }
.section__meta { font-size: 10.5px; color: var(--ink-faint); }

.featured__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}
.fcard {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, .03);
  cursor: pointer;
  transition: all .2s ease;
}
.fcard:hover {
  border-color: rgba(16, 185, 129, .45);
  box-shadow: 0 12px 24px -12px rgba(16, 185, 129, .35), 0 2px 6px rgba(15, 23, 42, .04);
  transform: translateY(-1px);
}
.fcard__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: calc(100% - 30px);
  padding: 3px 8px;
  border-radius: 7px;
  background: #f6faf8;
  border: 1px solid rgba(16, 185, 129, .13);
  font-size: 10px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag__dot { width: 5px; height: 5px; flex: 0 0 5px; border-radius: 999px; }
.pin-btn {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  transition: all .18s ease;
}
.pin-btn svg { width: 14px; height: 14px; }
.pin-btn:hover { background: #fff7ed; color: #f59e0b; }
.pin-btn--on { color: #f59e0b; }
.fcard__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.45;
  color: #111c2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fcard:hover .fcard__title { color: var(--accent-deep); }
.fcard__desc {
  margin: 5px 0 0;
  font-size: 11px;
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fcard__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 9px;
  border-top: 1px solid var(--line-soft);
  font-size: 10.5px;
  color: var(--ink-faint);
}
.fcard__chevron { color: #cbd5e1; transition: transform .18s ease, color .18s ease; }
.fcard:hover .fcard__chevron { transform: translateX(2px); color: var(--accent-deep); }

.note-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.note-rows { display: flex; flex-direction: column; gap: 8px; }

.note-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 168px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, .03);
  cursor: pointer;
  transition: all .2s ease;
}
.note-card:hover {
  border-color: rgba(16, 185, 129, .45);
  box-shadow: 0 14px 26px -14px rgba(16, 185, 129, .38), 0 2px 6px rgba(15, 23, 42, .04);
  transform: translateY(-1px);
}
.note-card--selected {
  border-color: var(--accent);
  background: #f4fdf7;
  box-shadow: 0 0 0 2px rgba(81, 191, 111, .22);
}
.note-card__top { display: flex; align-items: center; gap: 8px; }
.note-card__icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(140deg, #eaf9ef, #f4fbf6);
  border: 1px solid rgba(16, 185, 129, .16);
  color: var(--accent-deep);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
  font-weight: 700;
}
.note-card__size { font-size: 10px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
.note-card__menu {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  opacity: 0;
  transition: opacity .16s ease;
}
.note-card:hover .note-card__menu,
.note-card--selected .note-card__menu { opacity: 1; }
.note-card__menu button {
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border: 0;
  border-radius: 6px;
  background: #f4f7f9;
  color: #64748b;
  font: inherit;
  font-size: 9.5px;
  cursor: pointer;
  transition: all .16s ease;
}
.note-card__menu button svg { width: 12px; height: 12px; }
.note-card__menu button:hover { background: #e9f8ee; color: var(--accent-deep); }
.note-card__menu button.on { color: #f59e0b; background: #fff7ed; }
.note-card h2 {
  margin: 13px 0 5px;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.45;
  color: #111c2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-card:hover h2 { color: var(--accent-deep); }
.note-card > p { margin: 0; font-size: 11px; color: var(--ink-faint); }
.note-card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
}
.note-card__category {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 55%;
  padding: 3px 7px;
  border-radius: 999px;
  background: #f5f8f6;
  font-size: 9.5px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-card footer time { font-size: 10px; color: var(--ink-faint); white-space: nowrap; }

/* list mode */
.note-card.note-card--row {
  min-height: 0;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 12px;
}
.note-card--row .note-card__top { flex: 0 0 auto; }
.note-card--row .note-card__size { display: none; }
.note-card--row h2 {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
.note-card--row > p { display: none; }
.note-card--row footer { margin: 0; padding: 0; flex: 0 0 auto; gap: 12px; }
.note-card--row .note-card__category { max-width: 130px; }

.note-card__checkbox { position: absolute; top: 13px; left: 13px; z-index: 2; }
.note-card__checkbox input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent); }
.note-card--selected .note-card__icon { margin-left: 22px; }

.library__empty {
  display: flex;
  min-height: 300px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: var(--ink-faint);
  font-size: 12px;
}
.library__empty strong { color: #475569; font-size: 16px; font-weight: 700; }

.library__multiselect {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 13px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, .05);
  user-select: none;
}
.library__multiselect-info { color: #475569; font-size: 12px; }
.library__multiselect-info strong { color: var(--accent-deep); font-weight: 700; }
.library__multiselect-actions { display: flex; gap: 7px; }
.library__multiselect-button {
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fff;
  color: #475569;
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
  transition: all .18s ease;
}
.library__multiselect-button:hover { border-color: rgba(16, 185, 129, .5); color: var(--accent-deep); }
.library__multiselect-button--danger { border-color: #fecaca; color: #dc2626; }
.library__multiselect-button--danger:hover { background: #fef2f2; border-color: #dc2626; }
.library__multiselect-button--cancel { color: #64748b; }

.library__mobile-categories { display: none; }

@media (max-width: 1180px) {
  .search__input { width: 170px; }
  .topbar { padding: 16px 20px 13px; }
  .library__scroll { padding: 18px 20px 28px; }
}

@media (max-width: 860px) {
  .library { display: block; overflow-y: auto; }
  .library__categories { display: none; }
  .library__content { min-height: 100%; }
  .topbar {
    display: block;
    position: relative;
    padding: 15px 14px 12px;
  }
  .topbar__heading h1 { font-size: 20px; }
  .topbar__actions {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px;
    margin-top: 14px;
  }
  .search { grid-column: 1 / -1; }
  .search__input { width: 100%; }
  .search__kbd { display: none; }
  .topbar__mobile { display: flex; gap: 7px; position: absolute; top: 14px; right: 14px; }
  .topbar__actions .select { display: none; }
  .btn { justify-content: center; }
  .library__scroll { padding: 16px 14px 28px; overflow: visible; }
  .library__mobile-categories {
    display: flex;
    gap: 7px;
    margin: 0;
    padding: 10px 14px 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .library__mobile-categories::-webkit-scrollbar { display: none; }
  .library__mobile-categories button {
    flex: 0 0 auto;
    padding: 6px 11px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #fff;
    color: #64748b;
    font: inherit;
    font-size: 11.5px;
    user-select: none;
  }
  .library__mobile-categories button.active {
    border-color: rgba(16, 185, 129, .55);
    background: var(--accent-wash);
    color: #047857;
    font-weight: 600;
  }
  .note-grid { grid-template-columns: 1fr; gap: 10px; }
  .featured__grid { grid-template-columns: 1fr; }
  .note-card { min-height: 0; }
  .note-card__menu { opacity: 1; }
  .note-card--row { flex-wrap: wrap; }
  .note-card--row h2 { flex: 1 1 100%; order: 3; }
  .library__multiselect { flex-direction: column; align-items: stretch; }
  .library__multiselect-actions { justify-content: space-between; }
  .library__multiselect-button { flex: 1; }
}
</style>
