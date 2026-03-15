<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import TaskLists from 'markdown-it-task-lists'
import TableOfContents from './TableOfContents.vue'
import '@/styles/preview.css'

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
  .use(TaskLists, {
    enabled: true,
    label: true,
    labelAfter: false
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
        <div class="share-page__body preview-content" ref="contentBodyRef" v-html="content"></div>
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
}
</style>
