<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Heading {
  id: string
  text: string
  level: number
  children: Heading[]
}

interface Props {
  content: string
  container?: HTMLElement | null
  fixedLeft?: boolean
  showLeftToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  container: null,
  fixedLeft: false,
  showLeftToggle: false
})

const isOpen = ref(false)
const activeId = ref('')
const headings = ref<Heading[]>([])

const createUniqueHeadingId = (text: string, counts: Map<string, number>) => {
  const baseId = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-') || 'heading'
  const occurrence = (counts.get(baseId) || 0) + 1
  counts.set(baseId, occurrence)
  return occurrence === 1 ? baseId : `${baseId}-${occurrence}`
}

const parseHeadings = (markdown: string): Heading[] => {
  const lines = markdown.split(/[\r\n]+/)
  const result: Heading[] = []
  const stack: { heading: Heading; level: number }[] = []
  const counts = new Map<string, number>()

  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = createUniqueHeadingId(text, counts)

      const heading: Heading = {
        id,
        text,
        level,
        children: []
      }

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      if (stack.length === 0) {
        result.push(heading)
      } else {
        stack[stack.length - 1].heading.children.push(heading)
      }

      stack.push({ heading, level })
    }
  })

  return result
}

const updateHeadings = () => {
  headings.value = parseHeadings(props.content)
}

const scrollToHeading = (id: string) => {
  if (!props.container) return

  // Try to find heading in rendered content first
  const element = props.container.querySelector(`[data-heading="${id}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  // For editing mode, find the heading in textarea
  const textarea = props.container.querySelector('textarea')
  if (textarea) {
    const lines = props.content.split(/[\r\n]+/)
    let targetLine = -1
    let targetText = ''

    const counts = new Map<string, number>()
    // Find the target heading line using the same duplicate-aware IDs
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const text = match[2].trim()
        const headingId = createUniqueHeadingId(text, counts)
        if (headingId === id) {
          targetLine = i
          targetText = text
          break
        }
      }
    }

    if (targetLine === -1) return

    // Create a temporary element to calculate the exact position
    const tempElement = document.createElement('div')
    tempElement.style.position = 'absolute'
    tempElement.style.visibility = 'hidden'
    tempElement.style.whiteSpace = 'pre-wrap'
    tempElement.style.wordBreak = 'break-all'
    tempElement.style.font = window.getComputedStyle(textarea).font
    tempElement.textContent = targetText
    
    // Prepend the heading markers
    const lineContent = lines[targetLine]
    const match = lineContent.match(/^(#{1,6})\s+/)
    if (match) {
      tempElement.textContent = lineContent
    }
    
    textarea.appendChild(tempElement)
    
    // Calculate the position
    const rect = tempElement.getBoundingClientRect()
    const textareaRect = textarea.getBoundingClientRect()
    const targetScrollTop = rect.top - textareaRect.top - 50 // 50px offset from top
    
    textarea.removeChild(tempElement)
    
    textarea.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
    textarea.focus()
    return
  }

  // For viewing mode, use scrollIntoView with container
  if (!element && props.container) {
    const headingElements = Array.from(props.container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    const counts = new Map<string, number>()
    for (const el of headingElements) {
      const text = el.textContent?.trim() || ''
      const headingId = createUniqueHeadingId(text, counts)
      if (headingId === id) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }
}

const updateActiveHeading = () => {
  if (!props.container) return

  const textarea = props.container.querySelector('textarea')
  if (textarea) {
    const lines = props.content.split(/[\r\n]+/)
    const computedStyle = window.getComputedStyle(textarea)
    const lineHeightPx = computedStyle.lineHeight
    const fontSizePx = computedStyle.fontSize
    const lineHeight = lineHeightPx !== 'normal' ? parseFloat(lineHeightPx) : parseFloat(fontSizePx) * 1.8
    const scrollTop = textarea.scrollTop
    const currentLine = Math.min(Math.floor(scrollTop / lineHeight), lines.length - 1)
    
    let activeHeadingId = ''
    const counts = new Map<string, number>()
    for (let i = 0; i <= currentLine; i++) {
      const line = lines[i]
      if (line == null) continue
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const text = match[2].trim()
        activeHeadingId = createUniqueHeadingId(text, counts)
      }
    }
    
    activeId.value = activeHeadingId
    return
  }

  const headingElements = Array.from(
    props.container.querySelectorAll('[data-heading]')
  )

  const containerRect = props.container.getBoundingClientRect()
  const offset = 100

  for (let i = headingElements.length - 1; i >= 0; i--) {
    const element = headingElements[i]
    const rect = element.getBoundingClientRect()
    
    if (rect.top <= containerRect.top + offset) {
      activeId.value = element.getAttribute('data-heading') || ''
      break
    }
  }
}

let scrollHandler: (() => void) | null = null

watch(() => props.content, updateHeadings, { immediate: true })

onMounted(() => {
  if (props.container) {
    scrollHandler = () => {
      requestAnimationFrame(updateActiveHeading)
    }
    
    const textarea = props.container.querySelector('textarea')
    if (textarea) {
      textarea.addEventListener('scroll', scrollHandler)
    } else {
      props.container.addEventListener('scroll', scrollHandler)
    }
  }
})

onUnmounted(() => {
  if (props.container && scrollHandler) {
    const textarea = props.container.querySelector('textarea')
    if (textarea) {
      textarea.removeEventListener('scroll', scrollHandler)
    } else {
      props.container.removeEventListener('scroll', scrollHandler)
    }
  }
})

const toggleExpand = () => {
  isOpen.value = !isOpen.value
}

const renderHeadingItem = (heading: Heading, index: number) => {
  const paddingLeft = (heading.level - 1) * 16
  const isActive = activeId.value === heading.id
  
  return `
    <div class="toc-item" style="padding-left: ${paddingLeft}px">
      <div 
        class="toc-item__link ${isActive ? 'toc-item__link--active' : ''}" 
        data-id="${heading.id}"
        style="padding-left: ${paddingLeft}px"
      >
        ${heading.text}
      </div>
      ${heading.children.length > 0 ? heading.children.map((child, childIndex) => renderHeadingItem(child, childIndex)).join('') : ''}
    </div>
  `
}
</script>

<template>
  <div class="toc" :class="{ 'toc--fixed-left': fixedLeft, 'toc--left-toggle': showLeftToggle }">
    <button v-if="showLeftToggle" class="toc__left-toggle-btn" @click="toggleExpand" :class="{ 'toc__left-toggle-btn--active': isOpen }">
      <svg v-if="!isOpen" class="toc__toggle-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <svg v-else class="toc__toggle-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button v-if="!fixedLeft && !showLeftToggle" class="toc__toggle-btn" @click="toggleExpand" :class="{ 'toc__toggle-btn--hidden': isOpen }">
      <svg class="toc__toggle-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="toc__sidebar" :class="{ 'toc__sidebar--open': isOpen || fixedLeft, 'toc__sidebar--fixed-left': fixedLeft, 'toc__sidebar--left-toggle': showLeftToggle }">
      <div v-if="!fixedLeft" class="toc__header">
        <span class="toc__title">目录</span>
        <button class="toc__close" @click="toggleExpand">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="toc__content">
        <div class="toc__list" v-if="headings.length > 0">
          <div 
            v-for="(heading, index) in headings" 
            :key="index"
            class="toc-item"
          >
            <div 
              class="toc-item__link" 
              :class="{ 'toc-item__link--active': activeId === heading.id }"
              @click="scrollToHeading(heading.id)"
            >
              {{ heading.text }}
            </div>
            <div 
              v-for="(child, childIndex) in heading.children" 
              :key="childIndex"
              class="toc-item toc-item--child"
            >
              <div 
                class="toc-item__link" 
                :class="{ 'toc-item__link--active': activeId === child.id }"
                @click="scrollToHeading(child.id)"
              >
                {{ child.text }}
              </div>
              <div 
                v-for="(grandchild, grandchildIndex) in child.children" 
                :key="grandchildIndex"
                class="toc-item toc-item--grandchild"
              >
                <div 
                  class="toc-item__link" 
                  :class="{ 'toc-item__link--active': activeId === grandchild.id }"
                  @click="scrollToHeading(grandchild.id)"
                >
                  {{ grandchild.text }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="toc__empty" v-else>
          暂无目录
        </div>
      </div>
    </div>
    <div v-if="!fixedLeft && !showLeftToggle" class="toc__overlay" :class="{ 'toc__overlay--visible': isOpen }" @click="toggleExpand"></div>
  </div>
</template>

<style scoped>
.toc {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.toc--fixed-left {
  pointer-events: none;
}

.toc--fixed-left .toc__sidebar {
  pointer-events: auto;
}

.toc--left-toggle {
  pointer-events: none;
}

.toc--left-toggle .toc__sidebar {
  pointer-events: auto;
}

.toc__left-toggle-btn {
  position: fixed;
  left: 0;
  top: 24px;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: none;
  border-radius: 0 20px 20px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  pointer-events: auto;
  z-index: 1001;
  box-shadow: var(--shadow-md);
}

.toc__left-toggle-btn svg {
  color: #000000;
}

.toc__left-toggle-btn .toc__toggle-icon {
  width: 16px;
  height: 16px;
}

.toc__left-toggle-btn--active {
  background: #ffffff;
  left: 320px;
  border-radius: 20px;
}

.toc__left-toggle-btn:hover {
  transform: scale(1.1);
}

.toc__toggle-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  pointer-events: auto;
  z-index: 1001;
}

.toc__toggle-btn--hidden {
  opacity: 0;
  visibility: hidden;
  transform: scale(0.8);
}

.toc__toggle-btn:hover {
  transform: scale(1.1);
}

.toc__toggle-icon {
  width: 20px;
  height: 20px;
  color: #ffffff;
}

.toc__sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: #ffffff;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  z-index: 1002;
}

.toc__sidebar--fixed-left {
  left: 0;
  right: auto;
  transform: translateX(0);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1);
}

.toc__sidebar--left-toggle {
  left: 0;
  right: auto;
  transform: translateX(-100%);
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1);
}

.toc__sidebar--left-toggle.toc__sidebar--open {
  transform: translateX(0);
}

.toc__sidebar--open {
  transform: translateX(0);
}

.toc__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: #ffffff;
  flex-shrink: 0;
}

.toc--fixed-left .toc__sidebar {
  background: #ffffff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.toc--fixed-left .toc__content {
  padding: 16px 0;
}

.toc--fixed-left .toc-item__link {
  padding: 10px 20px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  line-height: 1.6;
  user-select: none;
}

.toc--fixed-left .toc-item__link:hover {
  background: #f3f4f6;
  color: var(--primary-color);
}

.toc--fixed-left .toc-item__link--active {
  background: #ffffff;
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  font-weight: 500;
}

.toc--left-toggle .toc__sidebar {
  background: #ffffff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.toc--left-toggle .toc__header {
  display: none;
}

.toc--left-toggle .toc__content {
  padding: 16px 0;
}

.toc--left-toggle .toc-item__link {
  padding: 10px 20px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  line-height: 1.6;
  user-select: none;
}

.toc--left-toggle .toc-item__link:hover {
  background: #f3f4f6;
  color: var(--primary-color);
}

.toc--left-toggle .toc-item__link--active {
  background: #ffffff;
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  font-weight: 500;
}

.toc__title {
  font-size: 16px;
  font-weight: 600;
}

.toc__close {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #ffffff;
}

.toc__close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.toc__close svg {
  width: 20px;
  height: 20px;
}

.toc__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 0;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
  /* Prevent scroll from propagating to parent containers */
  pointer-events: auto;
}

.toc__content::-webkit-scrollbar {
  width: 6px;
}

.toc__content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.toc__content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.toc__content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.toc__list {
  display: flex;
  flex-direction: column;
}

.toc-item {
  display: flex;
  flex-direction: column;
}

.toc-item--child {
  padding-left: 16px;
}

.toc-item--grandchild {
  padding-left: 32px;
}

.toc-item__link {
  padding: 10px 20px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  line-height: 1.6;
  user-select: none;
}

.toc-item__link:hover {
  background: #f3f4f6;
  color: var(--primary-color);
}

.toc-item__link--active {
  background: #f0fdf4;
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  font-weight: 500;
}

.toc__empty {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.toc__overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  pointer-events: none;
  z-index: 1000;
}

.toc__overlay--visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

@media (max-width: 1024px) {
  .toc__sidebar {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .toc__toggle-btn {
    right: 16px;
    bottom: 16px;
    width: 48px;
    height: 48px;
  }
  
  .toc__sidebar {
    width: 100%;
    max-width: 280px;
  }
  
  .toc__header {
    padding: 14px 16px;
  }
  
  .toc__title {
    font-size: 15px;
  }
  
  .toc-item__link {
    padding: 8px 16px;
    font-size: 13px;
  }
}
</style>