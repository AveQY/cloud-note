<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const captchaCode = ref('')
const captchaId = ref('')
const captchaUrl = ref('')
const loading = ref(false)
const error = ref('')

const loadCaptcha = async () => {
  try {
    const response = await fetch('/api/captcha')
    if (response.ok) {
      captchaId.value = response.headers.get('X-Captcha-Id') || ''
      const blob = await response.blob()
      captchaUrl.value = URL.createObjectURL(blob)
    }
  } catch (e) {
    console.error('加载验证码失败:', e)
  }
}

const refreshCaptcha = () => {
  loadCaptcha()
  captchaCode.value = ''
}

const handleLogin = async () => {
  if (!username.value || !password.value || !captchaCode.value) {
    error.value = '请输入账号、密码和验证码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        captchaId: captchaId.value,
        captchaCode: captchaCode.value
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      const loginTime = Date.now()
      const expireDays = 30
      const expireTime = loginTime + (expireDays * 24 * 60 * 60 * 1000)
      
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('username', username.value)
      localStorage.setItem('loginTime', loginTime.toString())
      localStorage.setItem('expireTime', expireTime.toString())
      router.push('/')
    } else {
      error.value = data.message || '登录失败，请检查账号和密码'
      if (data.message?.includes('验证码')) {
        refreshCaptcha()
      }
    }
  } catch (e) {
    console.error('登录失败:', e)
    error.value = '登录失败，请重试'
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}

onMounted(() => {
  loadCaptcha()
})
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-card__header">
        <h1 class="login-card__title">云笔记</h1>
        <p class="login-card__subtitle">请登录以继续</p>
      </div>
      <div class="login-card__body">
        <div class="login-card__form">
          <div class="login-card__field">
            <label class="login-card__label">账号</label>
            <input
              v-model="username"
              type="text"
              class="login-card__input"
              placeholder="请输入账号"
              @keydown="handleKeydown"
              :disabled="loading"
            />
          </div>
          <div class="login-card__field">
            <label class="login-card__label">密码</label>
            <input
              v-model="password"
              type="password"
              class="login-card__input"
              placeholder="请输入密码"
              @keydown="handleKeydown"
              :disabled="loading"
            />
          </div>
          <div class="login-card__field">
            <label class="login-card__label">验证码</label>
            <div class="login-card__captcha-wrapper">
              <input
                v-model="captchaCode"
                type="text"
                class="login-card__input login-card__input--captcha"
                placeholder="请输入验证码"
                @keydown="handleKeydown"
                :disabled="loading"
                maxlength="4"
              />
              <img
                v-if="captchaUrl"
                :src="captchaUrl"
                alt="验证码"
                class="login-card__captcha-image"
                @click="refreshCaptcha"
                title="点击刷新验证码"
              />
              <div v-else class="login-card__captcha-placeholder">加载中...</div>
            </div>
          </div>
          <div v-if="error" class="login-card__error">
            {{ error }}
          </div>
          <button
            class="login-card__button"
            @click="handleLogin"
            :disabled="loading"
          >
            <svg v-if="loading" class="login-card__loading" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span v-else>登录</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8faf9 0%, #e8f5ec 100%);
}

.login-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-width: 400px;
  max-width: 90vw;
  overflow: hidden;
}

.login-card__header {
  padding: 40px 40px 30px;
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
}

.login-card__title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 8px;
}

.login-card__subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.login-card__body {
  padding: 40px;
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-card__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-card__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.login-card__input {
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
  background: var(--bg-color);
}

.login-card__input:focus {
  border-color: var(--primary-color);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(81, 191, 111, 0.1);
}

.login-card__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-card__captcha-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.login-card__input--captcha {
  flex: 1;
  min-width: 0;
}

.login-card__captcha-image {
  width: 120px;
  height: 40px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.login-card__captcha-image:hover {
  border-color: var(--primary-color);
  transform: scale(1.02);
}

.login-card__captcha-placeholder {
  width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.login-card__error {
  padding: 12px;
  background: #fee2e2;
  color: #ef4444;
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}

.login-card__button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(81, 191, 111, 0.2);
}

.login-card__button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(81, 191, 111, 0.3);
}

.login-card__button:active:not(:disabled) {
  transform: translateY(0);
}

.login-card__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-card__loading {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
