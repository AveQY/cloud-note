<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface MenuItem {
  id: string
  label: string
  icon: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  items: MenuItem[]
  x?: number
  y?: number
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  x: 0,
  y: 0,
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

const handleItemClick = (item: MenuItem) => {
  item.onClick()
  emit('close')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="show"
        ref="menuRef"
        class="context-menu"
        :style="{ left: `${x}px`, top: `${y}px` }"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="context-menu__item"
          :class="{ 'context-menu__item--danger': item.danger }"
          @click="handleItemClick(item)"
        >
          <svg class="context-menu__item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" v-html="item.icon"/>
          <span class="context-menu__item-label">{{ item.label }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: #ffffff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 160px;
  overflow: hidden;
  z-index: 1000;
  animation: contextMenuSlideIn 0.15s ease;
}

@keyframes contextMenuSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
  color: var(--text-primary);
}

.context-menu__item:hover {
  background: var(--primary-light);
}

.context-menu__item--danger {
  color: #ef4444;
}

.context-menu__item--danger:hover {
  background: #fee2e2;
}

.context-menu__item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.context-menu__item-label {
  font-weight: 500;
}

.context-menu-enter-active,
.context-menu-leave-active {
  transition: all 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
