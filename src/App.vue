<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface JournalEntry {
  id: number
  title: string
  content: string
  date: string
  updatedAt: number
}

const today = new Date()

const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

const formatShortDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

const createDefaultEntry = (): JournalEntry => ({
  id: Date.now(),
  title: '',
  content: '',
  date: formatDate(today),
  updatedAt: Date.now(),
})

const savedEntries = localStorage.getItem('journal-entries')

const entries = ref<JournalEntry[]>(
  savedEntries
    ? JSON.parse(savedEntries)
    : [
        {
          id: 1,
          title: '欢迎来到 Journal',
          content:
            '这是你的第一篇日记。\n\n你可以在这里记录每天发生的事情、想法、照片和生活中的点点滴滴。\n\nJournal 会逐渐变成属于你的私人空间。',
          date: formatDate(today),
          updatedAt: Date.now(),
        },
      ],
)

const selectedId = ref(entries.value[0]?.id ?? null)
const searchText = ref('')

const selectedEntry = computed(() => {
  return entries.value.find((entry) => entry.id === selectedId.value) ?? null
})

const filteredEntries = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()

  if (!keyword) {
    return entries.value
  }

  return entries.value.filter(
    (entry) =>
      entry.title.toLowerCase().includes(keyword) ||
      entry.content.toLowerCase().includes(keyword),
  )
})

const selectEntry = (id: number) => {
  selectedId.value = id
}

const createEntry = () => {
  const entry = createDefaultEntry()

  entries.value.unshift(entry)
  selectedId.value = entry.id
}

const deleteEntry = () => {
  if (!selectedEntry.value) return

  const deletedId = selectedEntry.value.id
  const index = entries.value.findIndex((entry) => entry.id === deletedId)

  entries.value = entries.value.filter((entry) => entry.id !== deletedId)

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

watch(
  entries,
  (value) => {
    localStorage.setItem('journal-entries', JSON.stringify(value))
  },
  { deep: true },
)
</script>

<template>
  <div class="journal-app">
    <!-- 左侧导航 -->
    <aside class="sidebar">
      <div class="app-title">
        <div class="app-icon">J</div>
        <div>
          <div class="app-name">Journal</div>
          <div class="app-subtitle">我的日记</div>
        </div>
      </div>

      <button class="new-entry-button" @click="createEntry">
        <span class="plus">＋</span>
        新建日记
      </button>

      <nav class="navigation">
        <div class="nav-item active">
          <span class="nav-icon">▤</span>
          <span>所有日记</span>
          <span class="nav-count">{{ entries.length }}</span>
        </div>

        <div class="nav-item">
          <span class="nav-icon">★</span>
          <span>收藏</span>
        </div>

        <div class="nav-item">
          <span class="nav-icon">▣</span>
          <span>标签</span>
        </div>

        <div class="nav-item">
          <span class="nav-icon">⌫</span>
          <span>最近删除</span>
        </div>
      </nav>

      <div class="sidebar-bottom">
        <div class="nav-item">
          <span class="nav-icon">⚙</span>
          <span>设置</span>
        </div>
      </div>
    </aside>

    <!-- 日记列表 -->
    <section class="entry-list">
      <div class="list-header">
        <div>
          <h2>日记</h2>
          <span>{{ entries.length }} 篇日记</span>
        </div>

        <button class="small-new-button" title="新建日记" @click="createEntry">＋</button>
      </div>

      <div class="search-box">
        <span>⌕</span>
        <input v-model="searchText" type="text" placeholder="搜索日记" />
        <kbd>Ctrl K</kbd>
      </div>

      <div class="entries">
        <button
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="entry-item"
          :class="{ selected: selectedId === entry.id }"
          @click="selectEntry(entry.id)"
        >
          <div class="entry-date">
            {{ formatShortDate(new Date(entry.updatedAt)) }}
          </div>

          <div class="entry-title">
            {{ entry.title || '无标题' }}
          </div>

          <div class="entry-preview">
            {{ entry.content.replace(/\n/g, ' ').slice(0, 70) || '暂无内容' }}
          </div>
        </button>

        <div v-if="filteredEntries.length === 0" class="empty-search">
          没有找到相关日记
        </div>
      </div>
    </section>

    <!-- 编辑区域 -->
    <main class="editor">
      <template v-if="selectedEntry">
        <header class="editor-header">
          <div class="editor-date">
            {{ selectedEntry.date }}
          </div>

          <div class="editor-actions">
            <button title="收藏">☆</button>
            <button title="删除" @click="deleteEntry">⌫</button>
            <button title="更多">•••</button>
          </div>
        </header>

        <article class="editor-content">
          <input
            v-model="selectedEntry.title"
            class="title-input"
            type="text"
            placeholder="日记标题"
          />

          <textarea
            v-model="selectedEntry.content"
            class="content-input"
            placeholder="今天发生了什么？"
          ></textarea>
        </article>

        <footer class="editor-footer">
          <span>已自动保存</span>
          <span>·</span>
          <span>{{ selectedEntry.content.length }} 个字符</span>
        </footer>
      </template>

      <div v-else class="empty-editor">
        <div class="empty-icon">✎</div>
        <h2>开始记录</h2>
        <p>创建一篇新的日记，记录此刻的想法。</p>
        <button class="empty-button" @click="createEntry">新建日记</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.journal-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: #f5f5f7;
  color: #1d1d1f;
  font-family:
    -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
    "Segoe UI", "Microsoft YaHei", sans-serif;
}

/* =========================
   左侧导航
========================= */

.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 14px;
  background: rgba(245, 245, 247, 0.92);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 10px;
  margin-bottom: 25px;
}

.app-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1d1d1f;
  color: white;
  font-size: 20px;
  font-weight: 600;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
}

.app-subtitle {
  margin-top: 2px;
  color: #86868b;
  font-size: 12px;
}

.new-entry-button {
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #1d1d1f;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}

.new-entry-button:hover {
  background: #333336;
}

.plus {
  margin-right: 5px;
  font-size: 18px;
}

.navigation {
  margin-top: 18px;
}

.nav-item {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 11px;
  margin-bottom: 3px;
  border-radius: 9px;
  color: #555;
  font-size: 14px;
}

.nav-item.active {
  background: #e3e3e8;
  color: #1d1d1f;
  font-weight: 500;
}

.nav-icon {
  width: 18px;
  text-align: center;
  color: #666;
}

.nav-count {
  margin-left: auto;
  color: #999;
  font-size: 12px;
}

.sidebar-bottom {
  margin-top: auto;
}

/* =========================
   日记列表
========================= */

.entry-list {
  width: 290px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e5e5e7;
  display: flex;
  flex-direction: column;
}

.list-header {
  height: 86px;
  padding: 20px 18px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-header h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.5px;
}

.list-header span {
  display: block;
  margin-top: 4px;
  color: #8e8e93;
  font-size: 12px;
}

.small-new-button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 9px;
  background: #f2f2f7;
  color: #1d1d1f;
  font-size: 20px;
  cursor: pointer;
}

.small-new-button:hover {
  background: #e5e5ea;
}

.search-box {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 4px 14px 12px;
  padding: 0 9px;
  border-radius: 8px;
  background: #f2f2f7;
  color: #8e8e93;
}

.search-box input {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: #1d1d1f;
  font-size: 13px;
}

.search-box kbd {
  color: #999;
  font-size: 9px;
}

.entries {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 15px;
}

.entry-item {
  width: 100%;
  padding: 13px 12px;
  margin-bottom: 3px;
  text-align: left;
  border: none;
  border-radius: 9px;
  background: transparent;
  cursor: pointer;
  color: #1d1d1f;
}

.entry-item:hover {
  background: #f5f5f7;
}

.entry-item.selected {
  background: #e9e9ed;
}

.entry-date {
  margin-bottom: 4px;
  color: #8e8e93;
  font-size: 11px;
}

.entry-title {
  margin-bottom: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
}

.entry-preview {
  overflow: hidden;
  color: #8e8e93;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.empty-search {
  padding: 30px 10px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

/* =========================
   编辑区域
========================= */

.editor {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.editor-header {
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 34px;
  border-bottom: 1px solid #f0f0f0;
}

.editor-date {
  color: #8e8e93;
  font-size: 13px;
}

.editor-actions {
  display: flex;
  gap: 5px;
}

.editor-actions button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
  font-size: 17px;
  cursor: pointer;
}

.editor-actions button:hover {
  background: #f2f2f7;
}

.editor-content {
  width: min(850px, calc(100% - 100px));
  flex: 1;
  margin: 0 auto;
  padding: 70px 0 30px;
}

.title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #1d1d1f;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -1px;
}

.title-input::placeholder {
  color: #d1d1d6;
}

.content-input {
  width: 100%;
  height: calc(100% - 70px);
  margin-top: 25px;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: #333;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.9;
}

.content-input::placeholder {
  color: #b0b0b5;
}

.editor-footer {
  height: 38px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  color: #aaa;
  font-size: 11px;
}

.empty-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
}

.empty-icon {
  width: 65px;
  height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  border-radius: 16px;
  background: #f2f2f7;
  font-size: 30px;
}

.empty-editor h2 {
  margin: 0 0 8px;
  color: #333;
}

.empty-editor p {
  margin: 0 0 20px;
  font-size: 14px;
}

.empty-button {
  padding: 9px 18px;
  border: none;
  border-radius: 9px;
  background: #1d1d1f;
  color: white;
  cursor: pointer;
}
</style>
