<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AlertDialog from './AlertDialog.vue'
import ShareExpireDialog from './ShareExpireDialog.vue'
import ShareLinkDialog from './ShareLinkDialog.vue'
import type { Note } from '@/types'

interface Props {
  isEditing?: boolean
  note?: Note | null
  content?: string
}

interface Emits {
  edit: []
  save: []
  delete: []
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  note: null,
  content: ''
})

const emit = defineEmits<Emits>()
const router = useRouter()
const showAlert = ref(false)
const alertMessage = ref('')
const showShareExpireDialog = ref(false)
const showShareLinkDialog = ref(false)
const shareUrl = ref('')

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
  if (!props.note) return null
  
  const date = props.note.updatedAt || new Date()
  const size = props.note.size || 0
  const wordCount = props.content?.length || 0
  
  return {
    title: props.note.title,
    date: formatDate(date),
    size: formatSize(size),
    wordCount: wordCount
  }
})

const handleShare = () => {
  if (!props.note) return
  showShareExpireDialog.value = true
}

const handleShareWithExpire = async (expireDays: number | null) => {
  if (!props.note) return
  
  try {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: props.note.path,
        expireDays
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      shareUrl.value = data.shareUrl || `${window.location.origin}/share/${data.shareId}`
      showShareLinkDialog.value = true
    } else {
      alertMessage.value = data.error || '生成分享链接失败'
      showAlert.value = true
    }
  } catch (e) {
    console.error('生成分享链接失败:', e)
    alertMessage.value = '生成分享链接失败，请重试'
    showAlert.value = true
  }
}

const handleShareLinkClose = () => {
  showShareLinkDialog.value = false
}

const handleAlertClose = () => {
  showAlert.value = false
}
</script>

<template>
  <div class="note-actions">
    <div v-if="!isEditing && fileInfo" class="note-actions__info">
      <div class="note-actions__title">{{ fileInfo.title }}</div>
      <div class="note-actions__meta">
        <span class="note-actions__meta-item">上次编辑于 {{ fileInfo.date }}</span>
        <span class="note-actions__meta-divider">|</span>
        <span class="note-actions__meta-item">字数：{{ fileInfo.wordCount }}</span>
        <span class="note-actions__meta-divider">|</span>
        <span class="note-actions__meta-item">大小：{{ fileInfo.size }}</span>
      </div>
    </div>
    <div v-if="!isEditing" class="note-actions__buttons">
      <button class="note-actions__button note-actions__button--share" @click="handleShare">
        <svg class="note-actions__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 6L12 2L8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 2V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        分享
      </button>
    </div>
    <ShareExpireDialog
      :show="showShareExpireDialog"
      @confirm="handleShareWithExpire"
      @cancel="showShareExpireDialog = false"
    />
    <ShareLinkDialog
      :show="showShareLinkDialog"
      :share-url="shareUrl"
      @close="handleShareLinkClose"
    />
    <AlertDialog
      :show="showAlert"
      title="提示"
      :message="alertMessage"
      confirm-text="确定"
      type="success"
      @confirm="handleAlertClose"
    />
  </div>
</template>

<style scoped>
.note-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.note-actions__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-actions__title {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  line-height: 1.3;
}

.note-actions__meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.note-actions__meta-item {
  font-size: 13px;
  color: #6b7280;
}

.note-actions__meta-divider {
  font-size: 13px;
  color: #d1d5db;
}

.note-actions__buttons {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.note-actions__button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.note-actions__icon {
  width: 16px;
  height: 16px;
}

.note-actions__button--edit {
  background-color: var(--primary-color);
  color: #ffffff;
}

.note-actions__button--edit:hover {
  background-color: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.note-actions__button--save {
  background-color: #10b981;
  color: #ffffff;
}

.note-actions__button--save:hover {
  background-color: #059669;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.note-actions__button--delete {
  background-color: #ef4444;
  color: #ffffff;
}

.note-actions__button--delete:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.note-actions__button--share {
  background-color: #3b82f6;
  color: #ffffff;
}

.note-actions__button--share:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

@media (max-width: 768px) {
  .note-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .note-actions__title {
    font-size: 14px;
  }

  .note-actions__meta {
    flex-wrap: wrap;
    gap: 8px;
  }

  .note-actions__meta-item {
    font-size: 11px;
  }

  .note-actions__meta-divider {
    font-size: 11px;
  }
}
</style>
