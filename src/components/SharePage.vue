<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import TableOfContents from './TableOfContents.vue'

interface Props {
  shareId: string
}

const props = defineProps<Props>()

const loading = ref(true)
const error = ref('')
const markdownContent = ref('')
const content = ref('')
const contentBodyRef = ref<HTMLElement | null>(null)
const mainContainerRef = ref<HTMLElement | null>(null)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const loadNote = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await fetch(`/api/share/${props.shareId}`)
    
    if (!response.ok) {
      throw new Error('加载笔记失败')
    }
    
    const data = await response.json()
    let markdown = data.content
    
    markdown = markdown.replace(/!\s*`([^`]+)`/g, '![图片]($1)')
    
    markdownContent.value = markdown
    const rendered = md.render(markdown)
    content.value = rendered
  } catch (e) {
    console.error('加载笔记失败:', e)
    error.value = '分享链接不存在或已失效'
  } finally {
    loading.value = false
  }
}

const addCopyButtons = () => {
  if (!contentBodyRef.value) return
  
  const preElements = contentBodyRef.value.querySelectorAll('pre')
  
  preElements.forEach((pre) => {
    if (pre.querySelector('.copy-button')) return
    
    const codeElement = pre.querySelector('code')
    if (!codeElement) return
    
    const copyButton = document.createElement('button')
    copyButton.className = 'copy-button'
    copyButton.innerHTML = `<img src="/img/copy.svg" alt="复制" class="copy-icon">`
    copyButton.title = '复制代码'
    
    copyButton.addEventListener('click', async () => {
      const code = codeElement.textContent || ''
      try {
        await navigator.clipboard.writeText(code)
        copyButton.classList.add('copied')
        copyButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>已复制</span>`
        setTimeout(() => {
          copyButton.classList.remove('copied')
          copyButton.innerHTML = `<img src="/img/copy.svg" alt="复制" class="copy-icon">`
        }, 2000)
      } catch (err) {
        console.error('复制失败:', err)
      }
    })
    
    pre.style.position = 'relative'
    pre.appendChild(copyButton)
  })
}

watch(content, () => {
  nextTick(() => {
    addCopyButtons()
  })
})

onMounted(() => {
  loadNote()
})
</script>

<template>
  <div class="share-page" ref="mainContainerRef">
    <div v-if="loading" class="share-page__loading">
      <svg class="share-page__loading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="error" class="share-page__error">
      <svg class="share-page__error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 16V16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="share-page__content">
      <TableOfContents 
        v-if="!loading && !error"
        :content="markdownContent"
        :container="mainContainerRef"
        showLeftToggle
      />
      <div class="share-page__wrapper">
        <div class="share-page__body" ref="contentBodyRef" v-html="content"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-page {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.share-page__loading,
.share-page__error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #9ca3af;
}

.share-page__loading-icon,
.share-page__error-icon {
  width: 80px;
  height: 80px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.share-page__loading-icon {
  animation: rotate 1s linear infinite;
  color: var(--primary-color);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.share-page__error-icon {
  color: #ef4444;
  animation: none;
}

.share-page__loading p,
.share-page__error p {
  font-size: 18px;
  margin: 0;
  color: #6b7280;
}

.share-page__content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.share-page__wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  padding: 60px 80px;
  animation: fadeIn 0.3s ease;
  box-sizing: border-box;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.share-page__wrapper::-webkit-scrollbar {
  display: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.share-page__body {
  line-height: 1.9;
  color: #000000;
  font-size: 16px;
  min-height: 100%;
}

.share-page__body :deep(h1),
.share-page__body :deep(h2),
.share-page__body :deep(h3),
.share-page__body :deep(h4),
.share-page__body :deep(h5),
.share-page__body :deep(h6) {
  margin-top: 32px;
  margin-bottom: 16px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.share-page__body :deep(h1) {
  font-size: 30px;
  color: #000000;
  border-bottom: 2px solid var(--primary-light);
  padding-bottom: 8px;
}

.share-page__body :deep(h2) {
  font-size: 26px;
  color: #000000;
}

.share-page__body :deep(h3) {
  font-size: 22px;
  color: #000000;
}

.share-page__body :deep(h4) {
  font-size: 20px;
  color: #000000;
}

.share-page__body :deep(p) {
  margin-bottom: 16px;
  color: #000000;
}

.share-page__body :deep(ul),
.share-page__body :deep(ol) {
  margin-bottom: 20px;
  padding-left: 28px;
}

.share-page__body :deep(li) {
  margin-bottom: 10px;
  line-height: 1.8;
  color: #000000;
}

.share-page__body :deep(code) {
  background: linear-gradient(135deg, var(--primary-light) 0%, #f0f9f4 100%);
  color: var(--primary-dark);
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'Courier New', 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 500;
}

.share-page__body :deep(pre) {
  background: #1a1a1a;
  color: #e8f5ec;
  padding: 20px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid #333;
  position: relative;
}

.share-page__body :deep(pre code) {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: 14px;
}

.share-page__body :deep(.copy-button) {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 32px;
  height: 32px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
  color: #e8f5ec;
  font-size: 12px;
}

.share-page__body :deep(.copy-button:hover) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.share-page__body :deep(.copy-button:active) {
  transform: scale(0.95);
}

.share-page__body :deep(.copy-icon) {
  width: 18px;
  height: 18px;
}

.share-page__body :deep(.copy-button span) {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.share-page__body :deep(.copy-button.copied) {
  background: rgba(81, 191, 111, 0.3);
  border-color: rgba(81, 191, 111, 0.5);
  color: #51bf6f;
}

.share-page__body :deep(blockquote) {
  border-left: 4px solid var(--primary-color);
  padding-left: 20px;
  margin: 20px 0;
  color: var(--text-secondary);
  background: var(--primary-light);
  padding: 16px 20px;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-style: italic;
}

.share-page__body :deep(a) {
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px solid var(--primary-color);
  transition: all 0.2s ease;
}

.share-page__body :deep(a:hover) {
  color: var(--primary-dark);
  border-bottom-color: var(--primary-dark);
}

.share-page__body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.share-page__body :deep(th),
.share-page__body :deep(td) {
  border: 1px solid var(--border-color);
  padding: 12px 16px;
  text-align: left;
}

.share-page__body :deep(th) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  font-weight: 600;
}

.share-page__body :deep(tr:nth-child(even)) {
  background-color: var(--bg-color);
}

.share-page__body :deep(tr:hover) {
  background-color: var(--primary-light);
}

.share-page__body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.5em 0;
}

.share-page__body :deep(hr) {
  border: none;
  border-top: 2px solid var(--border-color);
  margin: 2em 0;
}

@media (max-width: 1024px) {
  .share-page__wrapper {
    padding-left: 280px;
  }
}

@media (max-width: 768px) {
  .share-page__wrapper {
    padding: 40px 24px;
    padding-left: 24px;
  }

  .share-page__body :deep(h1) {
    font-size: 1.75em;
  }

  .share-page__body :deep(h2) {
    font-size: 1.5em;
  }

  .share-page__body :deep(h3) {
    font-size: 1.25em;
  }
}
</style>
