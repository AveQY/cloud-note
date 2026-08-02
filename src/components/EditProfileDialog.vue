<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show?: boolean
  currentUsername?: string
}

interface Emits {
  close: []
  're-login': []
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  currentUsername: ''
})

const emit = defineEmits<Emits>()

const currentPassword = ref('')
const newUsername = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

watch(() => props.show, (v) => {
  if (v) {
    newUsername.value = props.currentUsername
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    error.value = ''
    successMessage.value = ''
  }
})

const handleSubmit = async () => {
  error.value = ''
  if (!currentPassword.value) {
    error.value = '请输入当前密码'
    return
  }
  if (!newUsername.value.trim()) {
    error.value = '请输入新账号'
    return
  }
  if (!newPassword.value) {
    error.value = '请输入新密码'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致'
    return
  }

  loading.value = true
  try {
    const response = await fetch('/api/update-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newUsername: newUsername.value.trim(),
        newPassword: newPassword.value
      })
    })
    const data = await response.json()
    if (response.ok && data.success) {
      successMessage.value = data.message || '修改成功，请重新登录'
      setTimeout(() => {
        emit('re-login')
      }, 1500)
    } else {
      error.value = data.message || '修改失败'
    }
  } catch (e) {
    error.value = '网络错误，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Transition name="dialog-fade">
    <div v-if="show" class="edit-profile-overlay" @click.stop>
      <Transition name="dialog-slide">
        <div v-if="show" class="edit-profile-dialog" @click.stop>
          <div class="edit-profile-dialog__header">
            <h3 class="edit-profile-dialog__title">修改登录信息</h3>
          </div>
          <div class="edit-profile-dialog__body">
            <p v-if="successMessage" class="edit-profile-dialog__success">{{ successMessage }}</p>
            <template v-else>
              <div class="edit-profile-dialog__field">
                <label class="edit-profile-dialog__label">当前账号</label>
                <input
                  type="text"
                  class="edit-profile-dialog__input"
                  :value="currentUsername"
                  disabled
                />
              </div>
              <div class="edit-profile-dialog__field">
                <label class="edit-profile-dialog__label">当前密码</label>
                <input
                  v-model="currentPassword"
                  type="password"
                  class="edit-profile-dialog__input"
                  placeholder="请输入当前密码"
                  :disabled="loading"
                />
              </div>
              <div class="edit-profile-dialog__field">
                <label class="edit-profile-dialog__label">新账号</label>
                <input
                  v-model="newUsername"
                  type="text"
                  class="edit-profile-dialog__input"
                  placeholder="请输入新账号"
                  :disabled="loading"
                />
              </div>
              <div class="edit-profile-dialog__field">
                <label class="edit-profile-dialog__label">新密码</label>
                <input
                  v-model="newPassword"
                  type="password"
                  class="edit-profile-dialog__input"
                  placeholder="请输入新密码"
                  :disabled="loading"
                />
              </div>
              <div class="edit-profile-dialog__field">
                <label class="edit-profile-dialog__label">确认新密码</label>
                <input
                  v-model="confirmPassword"
                  type="password"
                  class="edit-profile-dialog__input"
                  placeholder="请再次输入新密码"
                  :disabled="loading"
                />
              </div>
              <p v-if="error" class="edit-profile-dialog__error">{{ error }}</p>
            </template>
          </div>
          <div v-if="!successMessage" class="edit-profile-dialog__footer">
            <button class="edit-profile-dialog__btn edit-profile-dialog__btn--cancel" @click="emit('close')">
              取消
            </button>
            <button
              class="edit-profile-dialog__btn edit-profile-dialog__btn--confirm"
              :disabled="loading"
              @click="handleSubmit"
            >
              {{ loading ? '提交中...' : '确定' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.edit-profile-overlay {
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

.edit-profile-dialog {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.edit-profile-dialog__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.edit-profile-dialog__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.edit-profile-dialog__body {
  padding: 20px 24px;
  overflow-y: auto;
}

.edit-profile-dialog__field {
  margin-bottom: 16px;
}

.edit-profile-dialog__label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.edit-profile-dialog__input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.edit-profile-dialog__input:focus {
  border-color: var(--primary-color);
}

.edit-profile-dialog__input:disabled {
  background: var(--bg-color);
  color: var(--text-secondary);
}

.edit-profile-dialog__error {
  color: #ef4444;
  font-size: 14px;
  margin: 12px 0 0;
}

.edit-profile-dialog__success {
  color: var(--primary-dark);
  font-size: 14px;
  margin: 0;
}

.edit-profile-dialog__footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.edit-profile-dialog__btn {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-profile-dialog__btn--cancel {
  background: #f3f4f6;
  color: var(--text-primary);
}

.edit-profile-dialog__btn--confirm {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #fff;
}

.edit-profile-dialog__btn--confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  transform: scale(0.95) translateY(-10px);
}

@media (max-width: 768px) {
  .edit-profile-dialog {
    min-width: unset;
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
    max-height: 85vh;
    margin: 0 16px;
  }
}
</style>
