<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, } from 'vue'

interface JournalEntry {
  id: number
  title: string
  content: string
  createdAt: number
  updatedAt: number
  favorite: boolean
}

const STORAGE_KEY = 'journal-entries'

const now = new Date()

//测试sqlite
const test = async () => {
  console.log('① 测试按钮被点击')

  try {
    console.log('② 准备调用 Electron IPC')

    const journal = await window.electronAPI.createJournal({
      title: '测试日记',
      content: '这是一条 SQLite 测试数据。',
    })

    console.log('③ SQLite 返回成功：', journal)
  } catch (error) {
    console.error('④ SQLite 调用失败：', error)
  }
}

//测试读取
const testListSQLite = async () => {
  try {
    const journals = await window.electronAPI.listJournals()

    console.log('SQLite 日记列表：', journals)
  } catch (error) {
    console.error('读取 SQLite 失败：', error)
  }
}

const formatDateLabel = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

const formatListDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isSameDay = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const getDayDifference = (timestamp: number) => {
  const date = new Date(timestamp)
  const current = new Date()

  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()

  return Math.floor((startOfDay(current) - startOfDay(date)) / 86400000)
}

const createEntry = async (): Promise<JournalEntry> => {
  const journal = await window.electronAPI.createJournal({
    title: '',
    content: '',
  })

  return {
    id: journal.id,
    title: journal.title,
    content: journal.content,
    createdAt: new Date(journal.created_at).getTime(),
    updatedAt: new Date(journal.updated_at).getTime(),
    favorite: false,
  }
}

//SQLite 数据转换函数
function convertJournal(journal: {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}): JournalEntry {
  return {
    id: journal.id,
    title: journal.title,
    content: journal.content,
    createdAt: new Date(journal.created_at).getTime(),
    updatedAt: new Date(journal.updated_at).getTime(),
    favorite: false,
  }
}

// 从 SQLite 加载日记
async function loadJournalsFromSQLite() {
  try {
    const journals = await window.electronAPI.listJournals()

    entries.value = journals.map(convertJournal)

    console.log('SQLite 日记加载成功：', entries.value)
  } catch (error) {
    console.error('加载 SQLite 日记失败：', error)
  }
}

const initialEntry: JournalEntry = {
  id: 1,
  title: '欢迎来到 Journal',
  content:
    '这里是你的私人日记空间。\n\n记录今天发生的事情，写下此刻的想法，也可以慢慢记录那些值得留下来的生活片段。\n\nJournal 会陪你保存这些平凡而珍贵的时刻。',
  createdAt: now.getTime(),
  updatedAt: now.getTime(),
  favorite: false,
}

const storedEntries = localStorage.getItem(STORAGE_KEY)

const entries = ref<JournalEntry[]>(
  storedEntries ? JSON.parse(storedEntries) : [initialEntry],
)

const selectedId = ref<number | null>(entries.value[0]?.id ?? null)
const searchText = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)

const selectedEntry = computed(() => {
  return entries.value.find((entry) => entry.id === selectedId.value) ?? null
})

const filteredEntries = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()

  const result = [...entries.value].sort((a, b) => b.updatedAt - a.updatedAt)

  if (!keyword) {
    return result
  }

  return result.filter((entry) => {
    return (
      entry.title.toLowerCase().includes(keyword) ||
      entry.content.toLowerCase().includes(keyword)
    )
  })
})

const todayEntries = computed(() => {
  return filteredEntries.value.filter((entry) => getDayDifference(entry.updatedAt) === 0)
})

const yesterdayEntries = computed(() => {
  return filteredEntries.value.filter((entry) => getDayDifference(entry.updatedAt) === 1)
})

const olderEntries = computed(() => {
  return filteredEntries.value.filter((entry) => getDayDifference(entry.updatedAt) > 1)
})

const saveEntries = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
}

const selectEntry = async (id: number) => {
  selectedId.value = id

  await nextTick()
}

const newEntry = async () => {
  const entry = await createEntry()

  entries.value.unshift(entry)
  selectedId.value = entry.id

  await nextTick()

  titleInput.value?.focus()
}

const deleteEntry = () => {
  const current = selectedEntry.value

  if (!current) {
    return
  }

  const index = entries.value.findIndex((entry) => entry.id === current.id)

  entries.value = entries.value.filter((entry) => entry.id !== current.id)

  if (entries.value.length === 0) {
    selectedId.value = null
    return
  }

  const nextIndex = Math.min(index, entries.value.length - 1)
  const nextEntry = entries.value[nextIndex]

  if (nextEntry) {
    selectedId.value = nextEntry.id
  }
}

const toggleFavorite = () => {
  if (!selectedEntry.value) {
    return
  }

  selectedEntry.value.favorite = !selectedEntry.value.favorite
}

const handleContentChange = () => {
  if (!selectedEntry.value) {
    return
  }

  selectedEntry.value.updatedAt = Date.now()

  scheduleSave()
}

//500ms防抖自动保存函数
let saveTimer: ReturnType<typeof setTimeout> | null = null

const saveCurrentEntryToSQLite = () => {
  if (!selectedEntry.value) {
    return
  }

  const entry = selectedEntry.value

  window.electronAPI
    .updateJournal(entry.id, {
      title: entry.title,
      content: entry.content,
    })
    .then((result) => {
      if (result.success) {
        entry.updatedAt = new Date(result.updated_at).getTime()
      }
    })
    .catch((error) => {
      console.error('保存日记到 SQLite 失败：', error)
    })
}

const scheduleSave = () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  saveTimer = setTimeout(() => {
    saveCurrentEntryToSQLite()
  }, 500)
}

const handleKeydown = (event: KeyboardEvent) => {
  const modifier = event.ctrlKey || event.metaKey

  if (!modifier) {
    return
  }

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    newEntry()
  }

  if (event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
  }

  //Ctrl + S = 立即保存 SQLite
if (event.key.toLowerCase() === 's') {
  event.preventDefault()

  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  saveCurrentEntryToSQLite()
}

  if (event.key === 'Escape' && document.activeElement === searchInput.value) {
    searchText.value = ''
    searchInput.value?.blur()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  await loadJournalsFromSQLite()

  selectedId.value = entries.value[0]?.id ?? null
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)

  if (saveTimer) {
    clearTimeout(saveTimer)
  }
})
</script>

<template>
  <div class="journal-app">
    <!-- 左侧导航 -->
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="brand">
          <div class="brand-mark">J</div>

          <div class="brand-info">
            <div class="brand-name">Journal</div>
            <div class="brand-caption">私人日记</div>
          </div>
        </div>

        <button class="new-button" @click="newEntry">
          <span class="new-button-icon">＋</span>
          <span>新建日记</span>
        </button>

        <nav class="side-navigation">
          <button class="side-item active">
            <span class="side-icon">▤</span>
            <span>所有日记</span>
            <span class="side-count">{{ entries.length }}</span>
          </button>

          <button class="side-item">
            <span class="side-icon">☆</span>
            <span>收藏</span>
          </button>

          <button class="side-item">
            <span class="side-icon">⌑</span>
            <span>标签</span>
          </button>

          <button class="side-item">
            <span class="side-icon">⌫</span>
            <span>最近删除</span>
          </button>
        </nav>
      </div>

      <button @click="test">
        测试 SQLite
      </button>

      <button @click="testListSQLite">
        测试读取 SQLite
      </button>

      <div class="sidebar-bottom">
        <button class="side-item">
          <span class="side-icon">⚙</span>
          <span>设置</span>
        </button>
      </div>
    </aside>

    <!-- 中间日记列表 -->
    <section class="entry-panel">
      <header class="entry-header">
        <div>
          <h1>日记</h1>
          <div class="entry-total">{{ entries.length }} 篇日记</div>
        </div>

        <button class="icon-button" title="新建日记" @click="newEntry">
          ＋
        </button>
      </header>

      <div class="search-container">
        <div class="search-field">
          <span class="search-icon">⌕</span>

          <input ref="searchInput" v-model="searchText" type="text" placeholder="搜索" />

          <kbd v-if="!searchText">Ctrl K</kbd>

          <button v-else class="clear-search" title="清除搜索" @click="searchText = ''">
            ×
          </button>
        </div>
      </div>

      <div class="entry-scroll">
        <!-- 今天 -->
        <section v-if="todayEntries.length" class="entry-group">
          <div class="group-title">今天</div>

          <button v-for="entry in todayEntries" :key="entry.id" class="entry-card"
            :class="{ selected: selectedId === entry.id }" @click="selectEntry(entry.id)">
            <div class="entry-card-top">
              <span class="entry-date">
                {{ formatListDate(entry.updatedAt) }}
              </span>

              <span v-if="entry.favorite" class="favorite-mark">★</span>
            </div>

            <div class="entry-card-title">
              {{ entry.title || '无标题' }}
            </div>

            <div class="entry-card-preview">
              {{ entry.content.replace(/\n/g, ' ').slice(0, 82) || '暂无内容' }}
            </div>
          </button>
        </section>

        <!-- 昨天 -->
        <section v-if="yesterdayEntries.length" class="entry-group">
          <div class="group-title">昨天</div>

          <button v-for="entry in yesterdayEntries" :key="entry.id" class="entry-card"
            :class="{ selected: selectedId === entry.id }" @click="selectEntry(entry.id)">
            <div class="entry-card-top">
              <span class="entry-date">
                {{ formatListDate(entry.updatedAt) }}
              </span>

              <span v-if="entry.favorite" class="favorite-mark">★</span>
            </div>

            <div class="entry-card-title">
              {{ entry.title || '无标题' }}
            </div>

            <div class="entry-card-preview">
              {{ entry.content.replace(/\n/g, ' ').slice(0, 82) || '暂无内容' }}
            </div>
          </button>
        </section>

        <!-- 更早 -->
        <section v-if="olderEntries.length" class="entry-group">
          <div class="group-title">更早</div>

          <button v-for="entry in olderEntries" :key="entry.id" class="entry-card"
            :class="{ selected: selectedId === entry.id }" @click="selectEntry(entry.id)">
            <div class="entry-card-top">
              <span class="entry-date">
                {{ formatListDate(entry.updatedAt) }}
              </span>

              <span v-if="entry.favorite" class="favorite-mark">★</span>
            </div>

            <div class="entry-card-title">
              {{ entry.title || '无标题' }}
            </div>

            <div class="entry-card-preview">
              {{ entry.content.replace(/\n/g, ' ').slice(0, 82) || '暂无内容' }}
            </div>
          </button>
        </section>

        <div v-if="filteredEntries.length === 0" class="no-results">
          <div class="no-results-icon">⌕</div>
          <div>没有找到日记</div>
          <small>试试其他搜索关键词</small>
        </div>
      </div>
    </section>

    <!-- 编辑器 -->
    <main class="editor">
      <template v-if="selectedEntry">
        <header class="editor-toolbar">
          <div class="editor-toolbar-left">
            <span class="saved-indicator">
              <span class="saved-dot"></span>
              已保存
            </span>
          </div>

          <div class="editor-toolbar-right">
            <button class="toolbar-button" :class="{ favorite: selectedEntry.favorite }" title="收藏"
              @click="toggleFavorite">
              {{ selectedEntry.favorite ? '★' : '☆' }}
            </button>

            <button class="toolbar-button" title="删除" @click="deleteEntry">
              ⌫
            </button>

            <button class="toolbar-button" title="更多">
              •••
            </button>
          </div>
        </header>

        <article class="editor-document">
          <div class="document-date">
            {{ formatDateLabel(selectedEntry.updatedAt) }}
          </div>

          <input ref="titleInput" v-model="selectedEntry.title" class="document-title" type="text" placeholder="无标题"
            @input="handleContentChange" />

          <textarea v-model="selectedEntry.content" class="document-body" placeholder="今天发生了什么？"
            @input="handleContentChange"></textarea>

          <div class="document-meta">
            最后编辑于 {{ formatTime(selectedEntry.updatedAt) }}
          </div>
        </article>
      </template>

      <!-- 没有选择日记 -->
      <div v-else class="empty-editor">
        <div class="empty-editor-icon">✎</div>

        <h2>开始记录</h2>

        <p>
          写下今天的故事，
          <br />
          留住那些值得记住的瞬间。
        </p>

        <button class="empty-editor-button" @click="newEntry">
          新建日记
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
}

:global(body) {
  overflow: hidden;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "SF Pro Text",
    "Segoe UI",
    "Microsoft YaHei",
    sans-serif;
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea {
  font: inherit;
}

button {
  -webkit-app-region: no-drag;
}

.journal-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
  color: #1d1d1f;
  background: #f5f5f7;
}

/* ================================
   左侧 Sidebar
================================ */

.sidebar {
  width: 224px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 28px 13px 15px;
  background: rgba(245, 245, 247, 0.94);
  border-right: 1px solid rgba(0, 0, 0, 0.07);
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 10px;
  margin-bottom: 27px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.brand-caption {
  margin-top: 2px;
  color: #8e8e93;
  font-size: 11px;
}

.new-button {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.15s,
    background 0.15s;
}

.new-button:hover {
  background: #333336;
}

.new-button:active {
  transform: scale(0.98);
}

.new-button-icon {
  font-size: 18px;
  line-height: 1;
}

.side-navigation {
  margin-top: 17px;
}

.side-item {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 11px;
  margin-bottom: 3px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #5f5f63;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}

.side-item:hover {
  background: rgba(0, 0, 0, 0.045);
}

.side-item.active {
  background: #e3e3e8;
  color: #1d1d1f;
  font-weight: 500;
}

.side-icon {
  width: 18px;
  color: #666;
  text-align: center;
  font-size: 15px;
}

.side-count {
  margin-left: auto;
  color: #999;
  font-size: 11px;
}

/* ================================
   日记列表
================================ */

.entry-panel {
  width: 310px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e5e5e7;
}

.entry-header {
  height: 86px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 9px;
}

.entry-header h1 {
  margin: 0;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.7px;
}

.entry-total {
  margin-top: 4px;
  color: #8e8e93;
  font-size: 11px;
}

.icon-button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 9px;
  background: #f2f2f7;
  color: #333;
  font-size: 19px;
  cursor: pointer;
}

.icon-button:hover {
  background: #e7e7ec;
}

.search-container {
  padding: 0 13px 11px;
}

.search-field {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 9px;
  border-radius: 8px;
  background: #f2f2f7;
}

.search-icon {
  color: #8e8e93;
  font-size: 19px;
  line-height: 1;
}

.search-field input {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: #1d1d1f;
  font-size: 13px;
}

.search-field input::placeholder {
  color: #9a9a9f;
}

.search-field kbd {
  color: #999;
  font-size: 9px;
  white-space: nowrap;
}

.clear-search {
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #b8b8bd;
  color: white;
  line-height: 16px;
  cursor: pointer;
}

.entry-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 20px;
}

.entry-scroll::-webkit-scrollbar {
  width: 5px;
}

.entry-scroll::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: #d2d2d7;
}

.entry-group {
  margin-bottom: 17px;
}

.group-title {
  padding: 6px 11px 7px;
  color: #8e8e93;
  font-size: 11px;
  font-weight: 600;
}

.entry-card {
  width: 100%;
  display: block;
  padding: 12px 12px 11px;
  margin-bottom: 3px;
  border: none;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.entry-card:hover {
  background: #f5f5f7;
}

.entry-card.selected {
  background: #e8e8ed;
}

.entry-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entry-date {
  color: #8e8e93;
  font-size: 10px;
}

.favorite-mark {
  color: #777;
  font-size: 11px;
}

.entry-card-title {
  margin-top: 4px;
  overflow: hidden;
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.entry-card-preview {
  margin-top: 4px;
  overflow: hidden;
  color: #8e8e93;
  font-size: 11px;
  line-height: 1.45;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 75px;
  color: #777;
  font-size: 13px;
  text-align: center;
}

.no-results-icon {
  margin-bottom: 12px;
  color: #aaa;
  font-size: 28px;
}

.no-results small {
  margin-top: 5px;
  color: #aaa;
  font-size: 11px;
}

/* ================================
   编辑器
================================ */

.editor {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.editor-toolbar {
  height: 62px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 27px;
  border-bottom: 1px solid #f0f0f2;
}

.saved-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #999;
  font-size: 10px;
}

.saved-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b7b7bd;
}

.editor-toolbar-right {
  display: flex;
  gap: 3px;
}

.toolbar-button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6d6d72;
  font-size: 16px;
  cursor: pointer;
}

.toolbar-button:hover {
  background: #f2f2f7;
}

.toolbar-button.favorite {
  color: #555;
}

.editor-document {
  width: min(860px, calc(100% - 120px));
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  padding: 58px 0 24px;
}

.document-date {
  margin-bottom: 17px;
  color: #8e8e93;
  font-size: 12px;
}

.document-title {
  width: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #1d1d1f;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -1.3px;
}

.document-title::placeholder {
  color: #d1d1d6;
}

.document-body {
  width: 100%;
  flex: 1;
  min-height: 250px;
  margin-top: 27px;
  padding: 0;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: #343437;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.95;
}

.document-body::placeholder {
  color: #b7b7bc;
}

.document-meta {
  padding-top: 15px;
  color: #b1b1b6;
  font-size: 10px;
  text-align: center;
}

.empty-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-editor-icon {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  border-radius: 17px;
  background: #f2f2f7;
  color: #777;
  font-size: 30px;
}

.empty-editor h2 {
  margin: 0;
  color: #333;
  font-size: 21px;
}

.empty-editor p {
  margin: 10px 0 20px;
  color: #999;
  font-size: 13px;
  line-height: 1.7;
}

.empty-editor-button {
  height: 36px;
  padding: 0 17px;
  border: none;
  border-radius: 9px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.empty-editor-button:hover {
  background: #333336;
}

/* ================================
   窗口尺寸较小时
================================ */

@media (max-width: 1000px) {
  .sidebar {
    width: 190px;
  }

  .entry-panel {
    width: 270px;
  }

  .editor-document {
    width: calc(100% - 70px);
  }
}

@media (max-width: 800px) {
  .sidebar {
    width: 65px;
    padding-left: 8px;
    padding-right: 8px;
  }

  .brand-info,
  .new-button span:last-child,
  .side-item span:not(.side-icon),
  .side-count {
    display: none;
  }

  .brand {
    justify-content: center;
    padding: 0;
  }

  .new-button {
    justify-content: center;
  }

  .side-item {
    justify-content: center;
    padding: 0;
  }

  .entry-panel {
    width: 260px;
  }
}
</style>