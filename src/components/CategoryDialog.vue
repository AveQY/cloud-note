<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Category { id: string; name: string; createdAt: number }

interface Props {
  show?: boolean
  categories?: Category[]
  currentCategoryId?: string | null
  noteTitle?: string
}

interface Emits {
  select: [categoryId: string | null]
  create: [name: string]
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  categories: () => [],
  currentCategoryId: null,
  noteTitle: ''
})

const emit = defineEmits<Emits>()

const newCategoryName = ref('')
const showCreateInput = ref(false)

watch(() => props.show, (newShow) => {
  if (newShow) {
    newCategoryName.value = ''
    showCreateInput.value = false
  }
})

const handleSelect = (categoryId: string | null) => {
  emit('select', categoryId)
}

const handleCreate = () => {
  const name = newCategoryName.value.trim()
  if (name) {
    emit('create', name)
    newCategoryName.value = ''
    showCreateInput.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleCancel()
  } else if (event.key === 'Enter' && showCreateInput.value) {
    handleCreate()
  }
}

const currentCategoryName = computed(() => {
  if (!props.currentCategoryId) return '未分类'
  return props.categories.find(c => c.id === props.currentCategoryId)?.name || '未分类'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="show" class="category-dialog-overlay" @click="handleCancel">
        <Transition name="dialog-slide">
          <div v-if="show" class="category-dialog" @click.stop @keydown="handleKeydown">
            <div class="category-dialog__header">
              <h3 class="category-dialog__title">选择分类</h3>
              <p class="category-dialog__subtitle">将「{{ noteTitle }}」移动到：</p>
            </div>
            <div class="category-dialog__body">
              <div class="category-dialog__current">
                <span>当前分类：</span>
                <strong>{{ currentCategoryName }}</strong>
              </div>
              <div class="category-dialog__list">
                <button
                  class="category-dialog__item"
                  :class="{ active: !currentCategoryId }"
                  @click="handleSelect(null)"
                >
                  <span>未分类</span>
                  <span class="category-dialog__check" v-if="!currentCategoryId">✓</span>
                </button>
                <button
                  v-for="category in categories"
                  :key="category.id"
                  class="category-dialog__item"
                  :class="{ active: currentCategoryId === category.id }"
                  @click="handleSelect(category.id)"
                >
                  <span>{{ category.name }}</span>
                  <span class="category-dialog__check" v-if="currentCategoryId === category.id">✓</span>
                </button>
              </div>
              <div class="category-dialog__create">
                <button
                  v-if="!showCreateInput"
                  class="category-dialog__create-button"
                  @click="showCreateInput = true"
                >
                  ＋ 新建分类
                </button>
                <div v-else class="category-dialog__create-form">
                  <input
                    v-model="newCategoryName"
                    type="text"
                    class="category-dialog__input"
                    placeholder="输入分类名称"
                    maxlength="20"
                    autofocus
                  />
                  <div class="category-dialog__create-actions">
                    <button class="category-dialog__mini-button" @click="showCreateInput = false">取消</button>
                    <button class="category-dialog__mini-button category-dialog__mini-button--primary" @click="handleCreate">创建</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="category-dialog__footer">
              <button class="category-dialog__button category-dialog__button--cancel" @click="handleCancel">
                取消
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.category-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.category-dialog {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-width: 420px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: dialogSlideIn 0.3s ease;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.category-dialog__header {
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--border-color);
}

.category-dialog__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.category-dialog__subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.category-dialog__body {
  padding: 16px 24px;
  overflow-y: auto;
  flex: 1;
}

.category-dialog__current {
  padding: 10px 14px;
  background: #f6f8fb;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.category-dialog__current strong {
  color: var(--primary-dark);
  font-weight: 600;
}

.category-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.category-dialog__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: var(--text-primary);
  text-align: left;
}

.category-dialog__item:hover {
  border-color: var(--primary-color);
  background: #f6f8fb;
}

.category-dialog__item.active {
  border-color: var(--primary-color);
  background: #ecf8f0;
  color: var(--primary-dark);
  font-weight: 600;
}

.category-dialog__check {
  color: var(--primary-color);
  font-weight: 700;
  font-size: 16px;
}

.category-dialog__create {
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.category-dialog__create-button {
  width: 100%;
  padding: 10px 14px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-dialog__create-button:hover {
  border-color: var(--primary-color);
  background: #f6f8fb;
}

.category-dialog__create-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-dialog__input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background: var(--bg-color);
}

.category-dialog__input:focus {
  border-color: var(--primary-color);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(81, 191, 111, 0.1);
}

.category-dialog__input::placeholder {
  color: var(--text-secondary);
}

.category-dialog__create-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.category-dialog__mini-button {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-dialog__mini-button:hover {
  background: var(--bg-color);
  color: var(--text-primary);
}

.category-dialog__mini-button--primary {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  border: none;
  box-shadow: 0 2px 4px rgba(81, 191, 111, 0.2);
}

.category-dialog__mini-button--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(81, 191, 111, 0.3);
}

.category-dialog__footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

.category-dialog__button {
  flex: 1;
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-dialog__button--cancel {
  background: #ffffff;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.category-dialog__button--cancel:hover {
  background: var(--bg-color);
  color: var(--text-primary);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-slide-enter-active,
.dialog-slide-leave-active {
  transition: all 0.3s ease;
}

.dialog-slide-enter-from,
.dialog-slide-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

@media (max-width: 768px) {
  .category-dialog {
    min-width: unset;
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
    max-height: 85vh;
    margin: 0 16px;
  }
  .category-dialog__header {
    padding: 16px 16px 10px;
  }
  .category-dialog__body {
    padding: 12px 16px;
  }
  .category-dialog__footer {
    padding: 12px 16px;
  }
}
</style>
