<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface MenuItem {
  id: string
  label: string
  icon: string
  onClick: () => void
}

interface Props {
  items: MenuItem[]
  iconType?: 'plus' | 'dots'
}

const props = withDefaults(defineProps<Props>(), {
  iconType: 'plus'
})

const show = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const toggle = () => {
  show.value = !show.value
}

const close = () => {
  show.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    close()
  }
}

const handleItemClick = (item: MenuItem) => {
  item.onClick()
  close()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="dropdown">
    <button class="dropdown__trigger" @click="toggle">
      <svg v-if="iconType === 'plus'" class="dropdown__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else class="dropdown__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
      </svg>
    </button>
    <Transition name="dropdown">
      <div v-if="show" class="dropdown__menu">
        <div
          v-for="item in items"
          :key="item.id"
          class="dropdown__item"
          @click="handleItemClick(item)"
        >
          <svg class="dropdown__item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" v-html="item.icon"/>
          <span class="dropdown__item-label">{{ item.label }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown__trigger {
  width: 32px;
  height: 32px;
  border: none;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(81, 191, 111, 0.2);
}

.dropdown__trigger:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(81, 191, 111, 0.3);
}

.dropdown__trigger:active {
  transform: scale(0.95);
}

.dropdown__icon {
  width: 20px;
  height: 20px;
  color: #ffffff;
}

.dropdown__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #ffffff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 160px;
  overflow: hidden;
  z-index: 100;
  animation: dropdownSlideIn 0.2s ease;
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-color);
}

.dropdown__item:last-child {
  border-bottom: none;
}

.dropdown__item:hover {
  background: var(--primary-light);
}

.dropdown__item-icon {
  width: 18px;
  height: 18px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.dropdown__item-label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
