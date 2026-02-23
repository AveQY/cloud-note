<script setup lang="ts">
import type { Note } from '@/types'

interface Props {
  note: Note
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false
})

const emit = defineEmits<{
  select: [note: Note]
  contextmenu: [event: MouseEvent, note: Note]
}>()

const handleClick = () => {
  emit('select', props.note)
}

const handleContextMenu = (event: MouseEvent) => {
  emit('contextmenu', event, props.note)
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}
</script>

<template>
  <div 
    class="note-item"
    :class="{ 'note-item--selected': selected }"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <svg class="note-item__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="note-item__content">
      <div class="note-item__title">{{ note.title }}</div>
      <div v-if="note.updatedAt" class="note-item__date">
        {{ formatDate(note.updatedAt) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 14px 16px;
  background: var(--card-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
  border: 2px solid transparent;
}

.note-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.note-item--selected {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.note-item__icon {
  width: 28px;
  height: 28px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.note-item--selected .note-item__icon {
  color: var(--primary-dark);
}

.note-item__content {
  flex: 1;
  min-width: 0;
}

.note-item__title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item--selected .note-item__title {
  color: var(--primary-dark);
  font-weight: 600;
}

.note-item__date {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .note-item {
    padding: 12px 14px;
  }

  .note-item__icon {
    width: 24px;
    height: 24px;
  }

  .note-item__title {
    font-size: 15px;
  }

  .note-item__date {
    font-size: 12px;
  }
}
</style>
