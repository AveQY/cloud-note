<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
const showCategoryDialog = ref(false)
const noteToMove = ref<Note | null>(null)
const multiSelectMode = ref(false)
const selectedPaths = ref<Set<string>>(new Set())
const showDeleteConfirm = ref(false)
const showUploadConflict = ref(false)
const pendingUpload = ref<{ file: File; event: Event } | null>(null)
const longPressTimer = ref<number | null>(null)
const longPressTriggered = ref(false)

const keyword = computed({
  get: () => props.searchKeyword || '',
  set: value => emit('update:searchKeyword', value)
})

const categoryName = (id?: string | null) => categories.value.find(item => item.id === id)?.name || '未分类'
const totalCount = computed(() => notes.value.length)
const currentTitle = computed(() => selectedCategory.value === 'all' ? '全部笔记' : selectedCategory.value === 'uncategorized' ? '未分类' : categoryName(selectedCategory.value))

const visibleNotes = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  let result = notes.value.filter(note => {
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
    // Batch mode
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
    // Batch mode: apply new category to all selected
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

// Desktop right-click
const handleContextMenu = (event: MouseEvent, note: Note) => {
  event.preventDefault()
  if (!multiSelectMode.value) {
    enterMultiSelect(note)
  } else {
    toggleSelect(note)
  }
}

// Mobile long-press
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
    // 上传到当前选中的分类（全部/未分类不传）
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

watch(() => props.selectedNote, note => { if (!note) fetchAll() })
onMounted(fetchAll)
defineExpose({ fetchNotes: fetchAll })
</script>

<template>
  <div class="library">
    <aside class="library__categories">
      <div class="library__brand">资料库</div>
      <button class="library__category" :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'"><span>全部笔记</span><b>{{ totalCount }}</b></button>
      <button class="library__category" :class="{ active: selectedCategory === 'uncategorized' }" @click="selectedCategory = 'uncategorized'"><span>未分类</span><b>{{ counts.uncategorized || 0 }}</b></button>
      <div class="library__category-heading"><span>我的分类</span><button title="新建分类" @click="createCategory">＋</button></div>
      <button v-for="category in categories" :key="category.id" class="library__category" :class="{ active: selectedCategory === category.id }" @click="selectedCategory = category.id" @dblclick="manageCategory(category)">
        <span>{{ category.name }}</span><b>{{ counts[category.id] || 0 }}</b>
      </button>
      <p class="library__hint">双击分类可重命名或删除</p>
      <div class="library__footer">
        <button class="library__footer-btn" @click="emit('about')">关于</button>
        <button class="library__footer-btn" @click="emit('settings')">设置</button>
      </div>
    </aside>

    <section class="library__content">
      <header class="library__toolbar">
        <div><h1 @click="handleTitleClick" style="cursor:pointer">{{ currentTitle }}</h1><p>{{ visibleNotes.length }} 篇笔记</p></div>
        <div class="library__mobile-top-actions">
          <button class="library__mobile-action" @click="emit('about')" title="关于">i</button>
          <button class="library__mobile-action" @click="emit('settings')" title="设置">⚙</button>
        </div>
        <div class="library__actions">
          <input v-model="keyword" class="library__search" placeholder="搜索笔记" />
          <select v-model="sortBy" class="library__sort"><option value="updated">最近修改</option><option value="created">最近创建</option><option value="title">标题排序</option></select>
          <button class="library__secondary" @click="uploadNote">上传</button>
          <button class="library__primary" @click="createNote">新建笔记</button>
          <input ref="fileInput" hidden type="file" accept=".md" @change="handleUpload" />
        </div>
      </header>

      <div class="library__mobile-categories">
        <button :class="{ active: selectedCategory === 'all' }" @click="selectedCategory = 'all'">全部</button>
        <button :class="{ active: selectedCategory === 'uncategorized' }" @click="selectedCategory = 'uncategorized'">未分类</button>
        <button v-for="category in categories" :key="category.id" :class="{ active: selectedCategory === category.id }" @click="selectedCategory = category.id">{{ category.name }}</button>
        <button @click="createCategory">＋</button>
      </div>

      <div v-if="loading" class="library__empty">正在加载...</div>
      <div v-else-if="visibleNotes.length === 0" class="library__empty"><strong>这里还没有笔记</strong><span>新建笔记或从其他分类移动到这里</span></div>
      <div v-else>
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
        <div class="library__grid">
          <article
            v-for="note in visibleNotes"
            :key="note.filename"
            class="note-card"
            :class="{ 'note-card--selected': selectedPaths.has(note.path) }"
            @click="handleCardClick(note)"
            @contextmenu="handleContextMenu($event, note)"
            @touchstart="handleTouchStart(note)"
            @touchend="handleTouchEnd"
            @touchmove="handleTouchMove"
          >
            <div v-if="multiSelectMode" class="note-card__checkbox">
              <input type="checkbox" :checked="selectedPaths.has(note.path)" @click.stop @change="toggleSelect(note)" />
            </div>
            <div class="note-card__icon">M↓</div>
            <h2>{{ note.title }}</h2>
            <p>Markdown 笔记 · {{ note.size ? Math.max(1, Math.round(note.size / 1024)) + ' KB' : '空白文档' }}</p>
            <footer><span class="note-card__category">{{ categoryName(note.categoryId) }}</span><time>{{ formatDate(note.updatedAt) }}</time></footer>
            <div class="note-card__menu" @click.stop>
              <button @click="moveNote(note)">分类</button><button @click="renameNote(note)">重命名</button><button @click="deleteNote(note)">删除</button>
            </div>
          </article>
        </div>
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
.library{display:flex;min-height:0;height:100%;background:#f6f8fb}.library__categories{width:230px;flex:0 0 230px;padding:22px 14px;border-right:1px solid #e5e7eb;background:#fff;overflow-y:auto}.library__brand{padding:0 12px 22px;font-size:22px;font-weight:700;color:#1f2937;user-select:none}.library__category,.library__category-heading{display:flex;width:100%;align-items:center;justify-content:space-between;border:0;background:transparent}.library__category{padding:10px 12px;margin:2px 0;border-radius:8px;color:#4b5563;text-align:left;cursor:pointer;user-select:none}.library__category:hover,.library__category.active{background:#ecf8f0;color:var(--primary-dark);font-weight:600}.library__category b{font-size:12px;color:#9ca3af}.library__category-heading{padding:22px 10px 7px;color:#9ca3af;font-size:12px;font-weight:600;user-select:none}.library__category-heading button{border:0;background:transparent;font-size:20px;color:var(--primary-color);cursor:pointer}.library__hint{padding:8px 12px;color:#b0b6c0;font-size:11px}.library__content{flex:1;min-width:0;padding:28px 32px;overflow-y:auto}.library__toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.library__toolbar h1{margin:0;color:#1f2937;font-size:26px;user-select:none}.library__toolbar p{margin:6px 0 0;color:#9ca3af;font-size:13px}.library__actions{display:flex;gap:10px;align-items:center}.library__search,.library__sort{height:38px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;padding:0 12px;color:#374151}.library__search{width:220px}.library__primary,.library__secondary{height:38px;padding:0 16px;border-radius:8px;cursor:pointer}.library__primary{border:0;background:var(--primary-color);color:#fff}.library__secondary{border:1px solid #dfe3e8;background:#fff;color:#4b5563}.library__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}.note-card{position:relative;min-height:190px;padding:22px;border:1px solid #e8ebef;border-radius:12px;background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.04);cursor:pointer}.note-card:hover{border-color:#b9dec4;box-shadow:0 8px 22px rgba(15,23,42,.08)}.note-card__icon{display:flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:9px;background:#eaf7ee;color:var(--primary-dark);font-size:13px;font-weight:700}.note-card h2{margin:18px 0 8px;color:#273142;font-size:17px;line-height:1.45;overflow-wrap:anywhere}.note-card>p{margin:0;color:#9ca3af;font-size:12px}.note-card footer{position:absolute;right:22px;bottom:20px;left:22px;display:flex;align-items:center;justify-content:space-between;color:#9ca3af;font-size:11px}.note-card__category{max-width:110px;padding:4px 8px;border-radius:999px;background:#f1f5f3;color:#5c7464;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.note-card__menu{position:absolute;top:16px;right:14px;display:none;gap:3px}.note-card:hover .note-card__menu{display:flex}.note-card__menu button{padding:4px 6px;border:0;border-radius:5px;background:#f3f4f6;color:#6b7280;font-size:10px;cursor:pointer}.library__empty{display:flex;min-height:320px;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#9ca3af}.library__empty strong{color:#4b5563;font-size:18px}.library__mobile-categories{display:none}
.library__multiselect{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;margin-bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 2px 8px rgba(15,23,42,.06);user-select:none}
.library__multiselect-info{color:#4b5563;font-size:14px}.library__multiselect-info strong{color:var(--primary-dark);font-weight:700}
.library__multiselect-actions{display:flex;gap:8px}
.library__multiselect-button{padding:8px 14px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#4b5563;font-size:13px;cursor:pointer;transition:all .2s}
.library__multiselect-button:hover{border-color:var(--primary-color);color:var(--primary-dark)}
.library__multiselect-button--danger{border-color:#fecaca;color:#dc2626}.library__multiselect-button--danger:hover{background:#fef2f2;border-color:#dc2626}
.library__multiselect-button--cancel{border-color:#d1d5db;color:#6b7280}.library__multiselect-button--cancel:hover{background:#f9fafb}
.note-card--selected{border-color:var(--primary-color);background:#f0fdf4;box-shadow:0 0 0 2px rgba(81,191,111,.2)}
.note-card__checkbox{position:absolute;top:16px;left:16px;z-index:2}
.note-card__checkbox input{width:18px;height:18px;cursor:pointer;accent-color:var(--primary-color)}
.library__footer{margin-top:auto;padding:16px 12px 0;border-top:1px solid #e5e7eb;display:flex;gap:8px}
.library__footer-btn{flex:1;padding:10px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#4b5563;font-size:13px;cursor:pointer;transition:all .2s}
.library__footer-btn:hover{border-color:var(--primary-color);color:var(--primary-dark);background:#f0fdf4}
.library__mobile-action{display:none;width:38px;height:38px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#4b5563;font-size:16px;cursor:pointer;align-items:center;justify-content:center}
.library__mobile-top-actions{display:none}
@media(max-width:768px){.library{display:block;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}.library::-webkit-scrollbar{display:none}.library__categories{display:none}.library__content{padding:18px 14px;overflow:visible}.library__toolbar{display:block;position:relative}.library__toolbar h1{font-size:22px}.library__actions{display:grid;grid-template-columns:1fr auto auto;margin-top:16px}.library__search{grid-column:1/-1;width:auto}.library__sort{min-width:0}.library__mobile-top-actions{display:flex;gap:8px;position:absolute;top:0;right:0}.library__mobile-action{display:flex}.library__mobile-categories{display:flex;gap:8px;margin:0 -14px 16px;padding:0 14px 8px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}.library__mobile-categories::-webkit-scrollbar{display:none}.library__mobile-categories button{flex:0 0 auto;padding:7px 12px;border:1px solid #e0e5e8;border-radius:999px;background:#fff;color:#6b7280;user-select:none}.library__mobile-categories button.active{border-color:var(--primary-color);background:#eaf7ee;color:var(--primary-dark)}.library__grid{grid-template-columns:1fr;gap:12px}.library__multiselect{flex-direction:column;gap:12px;padding:12px;margin-bottom:12px}.library__multiselect-actions{width:100%;justify-content:space-between}.library__multiselect-button{flex:1;padding:10px 8px;font-size:12px}.note-card{min-height:160px;padding-bottom:18px}.note-card h2{padding-right:72px}.note-card footer{position:static;margin-top:20px;gap:12px}.note-card footer time{flex:0 0 auto}.note-card__category{max-width:calc(100% - 100px)}.note-card__menu{display:flex}.library__hint{display:none}}
</style>
