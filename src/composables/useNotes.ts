import { ref, computed } from 'vue'
import type { Note } from '@/types'

export function useNotes() {
  const notes = ref<Note[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const hasMore = ref(true)

  const loadNotes = async (page: number = 1, append: boolean = false) => {
    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
      currentPage.value = 1
    }
    error.value = null

    try {
      const response = await fetch(`/api/files?page=${page}&pageSize=${pageSize.value}`)
      
      if (!response.ok) {
        throw new Error('获取文件列表失败')
      }
      
      const result = await response.json()
      const fileList = result.data || []
      
      console.log('loadNotes 调用:', { page, append, result })
      
      const newNotes = fileList.map((file: any) => ({
        id: file.title,
        title: file.title,
        filename: file.filename,
        path: file.path,
        size: file.size || 0,
        createdAt: new Date(file.lastModified),
        updatedAt: new Date(file.lastModified)
      }))

      if (append) {
        notes.value = [...notes.value, ...newNotes]
      } else {
        notes.value = newNotes
      }

      total.value = result.total || 0
      currentPage.value = result.page || page
      hasMore.value = result.hasMore !== undefined ? result.hasMore : false
      
      console.log('loadNotes 完成:', { total: total.value, currentPage: currentPage.value, hasMore: hasMore.value, notesCount: notes.value.length })
    } catch (e) {
      error.value = '加载笔记失败'
      console.error('加载笔记失败:', e)
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  const loadMore = async () => {
    if (loadingMore.value || !hasMore.value) return
    await loadNotes(currentPage.value + 1, true)
  }

  const reset = () => {
    notes.value = []
    currentPage.value = 1
    total.value = 0
    hasMore.value = true
    error.value = null
  }

  const sortedNotes = computed(() => {
    return notes.value
  })

  return {
    notes: sortedNotes,
    loading,
    loadingMore,
    error,
    currentPage,
    pageSize,
    total,
    hasMore,
    loadNotes,
    loadMore,
    reset
  }
}
