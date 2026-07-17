<template>
  <div class="settings-page">
    <header class="settings-page__header">
      <div class="settings-page__header-content">
        <button class="settings-page__back" @click="router.push('/')">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h1 class="settings-page__title">设置</h1>
      </div>
    </header>
    <main class="settings-page__main">
      <div class="settings-page__list-container">
        <section class="settings-page__section">
          <h2 class="settings-page__section-title">备份与还原</h2>
          <p class="settings-page__section-desc">管理您的笔记和数据备份</p>
        </section>
        <div class="settings-page__list-item" @click="backupNotes('notes')">
          <div class="settings-page__list-item-left">
            <div class="settings-page__list-item-icon-wrapper settings-page__list-item-icon-wrapper--blue">
              <svg class="settings-page__list-item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5C4.46957 21 4 20.5304 4 20V4C4 3.46957 4.46957 3 5 3H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 3H20L22 5V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 12L12 7L17 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 7V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="settings-page__list-item-label">备份笔记</span>
          </div>
          <svg class="settings-page__list-item-arrow" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="settings-page__list-item" @click="openFilePicker">
          <div class="settings-page__list-item-left">
            <div class="settings-page__list-item-icon-wrapper settings-page__list-item-icon-wrapper--green">
              <svg class="settings-page__list-item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5C4.46957 21 4 20.5304 4 20V4C4 3.46957 4.46957 3 5 3H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 3H20L22 5V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17 12L12 17L7 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 17V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="settings-page__list-item-label">从文件还原</span>
          </div>
          <svg class="settings-page__list-item-arrow" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="settings-page__list-container">
        <section class="settings-page__section">
          <h2 class="settings-page__section-title">账户安全</h2>
        </section>
        <div class="settings-page__list-item" @click="showResetPassword = true">
          <div class="settings-page__list-item-left">
            <div class="settings-page__list-item-icon-wrapper settings-page__list-item-icon-wrapper--red">
              <svg class="settings-page__list-item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="settings-page__list-item-label">修改账号密码</span>
          </div>
          <svg class="settings-page__list-item-arrow" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="settings-page__list-item settings-page__list-item--logout" @click="confirmLogout">
          <div class="settings-page__list-item-left">
            <div class="settings-page__list-item-icon-wrapper settings-page__list-item-icon-wrapper--danger">
              <svg class="settings-page__list-item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 4 20.5304 4 20V4C4 3.46957 4.46957 3 5 3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 17V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 9L16 14L11 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="settings-page__list-item-label settings-page__list-item-label--danger">退出登录</span>
          </div>
          <svg class="settings-page__list-item-arrow" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </main>
    <input ref="fileInputRef" type="file" accept=".zip" class="settings-page__file-input" @change="handleFileRestore" />
    <ConfirmDialog
      :show="showRestoreSuccess"
      title="数据已恢复"
      message="备份中包含登录等数据文件，请重新登录后使用。"
      confirm-text="去登录"
      cancel-text="取消"
      type="warning"
      @confirm="handleRestoreSuccessConfirm"
      @cancel="showRestoreSuccess = false"
    />
    <ConfirmDialog
      :show="showLogoutConfirm"
      title="确认退出登录"
      message="确定要退出登录吗？"
      confirm-text="退出"
      cancel-text="取消"
      type="warning"
      @confirm="handleLogoutConfirm"
      @cancel="showLogoutConfirm = false"
    />
    <AlertDialog
      :show="showAlert"
      :title="alertTitle"
      :message="alertMessage"
      confirm-text="确定"
      type="info"
      @confirm="showAlert = false"
    />
    <Transition name="dialog-fade">
      <div v-if="showResetPassword" class="reset-password-overlay">
        <div class="reset-password-dialog" @click.stop>
          <div class="reset-password__header">
            <h2 class="reset-password__title">修改账号密码</h2>
            <button class="reset-password__close" @click="closeResetPassword">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="reset-password__content">
            <p v-if="resetSuccessMsg" class="reset-password__success">{{ resetSuccessMsg }}</p>
            <p v-if="resetErrorMsg" class="reset-password__error">{{ resetErrorMsg }}</p>
            <div class="reset-password__field">
              <label class="reset-password__label">新密码</label>
              <input v-model="newPassword" type="password" class="reset-password__input" placeholder="请输入新密码" :disabled="isResetting" />
            </div>
            <div class="reset-password__field">
              <label class="reset-password__label">确认新密码</label>
              <input v-model="confirmPassword" type="password" class="reset-password__input" placeholder="请再次输入新密码" :disabled="isResetting" />
            </div>
            <div class="reset-password__actions">
              <button class="reset-password__btn reset-password__btn--cancel" :disabled="isResetting" @click="closeResetPassword">取消</button>
              <button class="reset-password__btn reset-password__btn--confirm" :disabled="isResetting" @click="submitResetPassword">{{ isResetting ? '提交中...' : '保存' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from './ConfirmDialog.vue'
import AlertDialog from './AlertDialog.vue'

const router = useRouter()

const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showResetPassword = ref(false)
const resetErrorMsg = ref('')
const resetSuccessMsg = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isResetting = ref(false)
const showAlert = ref(false)
const alertTitle = ref('提示')
const alertMessage = ref('')
const showRestoreSuccess = ref(false)
const showLogoutConfirm = ref(false)

const backupNotes = async (type: string) => {
  try {
    const response = await fetch(`/api/backup?type=${type}`)
    if (!response.ok) {
      let errorMsg = '备份失败'
      try {
        const errData = await response.json()
        if (errData.error) errorMsg = errData.error
      } catch {}
      throw new Error(errorMsg)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-${type}-${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('备份失败:', error)
    alertTitle.value = '错误'
    alertMessage.value = error instanceof Error ? error.message : '备份失败，请重试'
    showAlert.value = true
  }
}

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const handleFileRestore = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isUploading.value = true
  showRestoreSuccess.value = false

  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/restore', { method: 'POST', body: formData })
    const data = await response.json()
    if (response.ok && data.success) {
      if (data.dataRestored) {
        showRestoreSuccess.value = true
      } else {
        alertTitle.value = '成功'
        alertMessage.value = '恢复成功'
        showAlert.value = true
        setTimeout(() => router.push('/'), 1500)
      }
    } else {
      alertTitle.value = '错误'
      alertMessage.value = data.message || '恢复失败'
      showAlert.value = true
    }
  } catch {
    alertTitle.value = '错误'
    alertMessage.value = '恢复失败，请重试'
    showAlert.value = true
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

const handleRestoreSuccessConfirm = async () => {
  showRestoreSuccess.value = false
  try {
    await fetch('/api/logout', { method: 'POST' })
  } catch {}
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('username')
  localStorage.removeItem('loginTime')
  localStorage.removeItem('expireTime')
  router.push('/login')
}

const confirmLogout = () => {
  showLogoutConfirm.value = true
}

const handleLogoutConfirm = async () => {
  showLogoutConfirm.value = false
  try {
    await fetch('/api/logout', { method: 'POST' })
  } catch {}
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('username')
  localStorage.removeItem('loginTime')
  localStorage.removeItem('expireTime')
  router.push('/login')
}

const submitResetPassword = async () => {
  resetErrorMsg.value = ''
  resetSuccessMsg.value = ''

  if (!newPassword.value) {
    resetErrorMsg.value = '请输入新密码'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    resetErrorMsg.value = '两次输入的新密码不一致'
    return
  }

  isResetting.value = true
  try {
    const response = await fetch('/api/update-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPassword.value })
    })
    const data = await response.json()
    if (response.ok && data.success) {
      resetSuccessMsg.value = data.message || '修改成功，请重新登录'
      setTimeout(() => {
        handleLogoutConfirm()
      }, 1500)
    } else {
      resetErrorMsg.value = data.message || '修改失败'
    }
  } catch {
    resetErrorMsg.value = '网络错误，请重试'
  } finally {
    isResetting.value = false
  }
}

const closeResetPassword = () => {
  showResetPassword.value = false
  resetErrorMsg.value = ''
  resetSuccessMsg.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}
</script>

<style scoped>
.settings-page {
  width: 100%;
  height: 100%;
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-page__header {
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #fff;
  flex-shrink: 0;
}

.settings-page__header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.settings-page__back {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.settings-page__back svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.settings-page__back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.settings-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.settings-page__main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  -webkit-overflow-scrolling: touch;
}

.settings-page__list-container {
  background: #fff;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.settings-page__section {
  padding: 20px 20px 12px;
}

.settings-page__section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-page__section-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.settings-page__list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-top: 1px solid var(--border-color);
}

.settings-page__list-item:hover {
  background: var(--bg-color);
}

.settings-page__list-item-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.settings-page__list-item-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-page__list-item-icon-wrapper--blue {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #3b82f6;
}

.settings-page__list-item-icon-wrapper--green {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #10b981;
}

.settings-page__list-item-icon-wrapper--red {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #ef4444;
}

.settings-page__list-item-icon-wrapper--danger {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #ef4444;
}

.settings-page__list-item-icon {
  width: 20px;
  height: 20px;
}

.settings-page__list-item-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.settings-page__list-item-label--danger {
  color: #ef4444;
}

.settings-page__list-item-arrow {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.settings-page__list-item--logout {
  border-top: 1px solid var(--border-color);
}

.settings-page__file-input {
  display: none;
}

.reset-password-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.reset-password-dialog {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: dialog-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dialog-slide-up {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.reset-password__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
}

.reset-password__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.reset-password__close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.reset-password__close svg {
  width: 18px;
  height: 18px;
}

.reset-password__close:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.95);
}

.reset-password__content {
  padding: 20px;
}

.reset-password__success {
  color: #56ab2f;
  font-size: 14px;
  margin: 0 0 16px;
  padding: 12px;
  background: rgba(86, 171, 47, 0.1);
  border-radius: 8px;
  text-align: center;
}

.reset-password__error {
  color: #ff6b6b;
  font-size: 14px;
  margin: 0 0 16px;
  padding: 12px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
  text-align: center;
}

.reset-password__field {
  margin-bottom: 16px;
}

.reset-password__field:last-of-type {
  margin-bottom: 20px;
}

.reset-password__label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.reset-password__input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: all 0.3s ease;
  background: #fafafa;
  box-sizing: border-box;
}

.reset-password__input:focus {
  border-color: var(--primary-color);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(81, 191, 111, 0.1);
}

.reset-password__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-password__actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.reset-password__btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-password__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-password__btn--cancel {
  background: #f5f5f5;
  color: #666;
}

.reset-password__btn--cancel:active:not(:disabled) {
  background: #e8e8e8;
  transform: scale(0.98);
}

.reset-password__btn--confirm {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(81, 191, 111, 0.3);
}

.reset-password__btn--confirm:active:not(:disabled) {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(81, 191, 111, 0.2);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

@media (max-width: 768px) {
  .settings-page__header {
    padding: 16px 20px;
  }

  .settings-page__main {
    padding: 20px 16px;
  }

  .settings-page__section {
    padding: 16px 16px 8px;
  }

  .settings-page__list-item {
    padding: 14px 16px;
  }

  .reset-password-dialog {
    max-width: 100%;
  }
}
</style>
