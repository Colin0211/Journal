<script setup lang="ts">
import { nextTick, onMounted, ref, } from 'vue'
import { useJournal } from './composables/useJournal'
import Editor from './components/Editor.vue'
import Sidebar from './components/Sidebar.vue'
import EntryList from './components/EntryList.vue'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

const {

  entries,
  deletedEntries,
  selectedId,
  selectedEntry,

  loadEntries,
  loadDeletedEntries,

  createEntry,
  deleteEntry,
  restoreEntry,
  permanentlyDeleteEntry,

  handleContentChange,
  saveCurrentEntry,
  toggleFavorite,
  filteredEntries,
  showFavoritesOnly,
  showDeletedOnly,
  todayEntries,
  yesterdayEntries,
  olderEntries,
} = useJournal()

const editorRef = ref<InstanceType<typeof Editor> | null>(null)

// 搜索关键词
const searchText = ref('')

//EntryList 组件引用
const entryListRef = ref<InstanceType<typeof EntryList> | null>(null)

// 选择某篇日记
const selectEntry = async (id: number) => {
  selectedId.value = id

  await nextTick()
}

// 新建日记
const newEntry = async () => {
  const entry = await createEntry()

  entries.value.unshift(entry)
  selectedId.value = entry.id

  await nextTick()

  editorRef.value?.focusTitle()
}

// 处理过滤器变化
const handleFilterChange = async (
  type: 'all' | 'favorites' | 'deleted',
) => {
  showFavoritesOnly.value = type === 'favorites'
  showDeletedOnly.value = type === 'deleted'

  if (type === 'deleted') {
    await loadDeletedEntries()

    selectedId.value = deletedEntries.value[0]?.id ?? null
    return
  }

  selectedId.value = null
}

// 处理键盘快捷键
useKeyboardShortcuts({
  onNewEntry: newEntry,

  onSearch: () => {
    entryListRef.value?.searchInput?.focus()
  },

  onSave: () => {
    saveCurrentEntry()
  },

  onEscape: () => {
    if (
      document.activeElement ===
      entryListRef.value?.searchInput
    ) {
      searchText.value = ''
      entryListRef.value?.searchInput?.blur()
    }
  },
})

//加载SQLite数据库
onMounted(async () => {
  await loadEntries()
})
</script>

<template>
  <div class="journal-app">

    <!-- 侧边栏 -->
    <Sidebar :entry-count="entries.length" :show-favorites-only="showFavoritesOnly" :show-deleted-only="showDeletedOnly"
      @new-entry="newEntry" @filter-change="handleFilterChange" />

    <!-- 中间日记列表 -->
    <EntryList ref="entryListRef" :entries="entries" :selected-id="selectedId" :search-text="searchText"
      :today-entries="todayEntries" :yesterday-entries="yesterdayEntries" :older-entries="olderEntries"
      :filtered-entries="filteredEntries" :deleted-entries="deletedEntries" :show-deleted-only="showDeletedOnly"
      :show-favorites-only="showFavoritesOnly" @update:search-text="searchText = $event" @select-entry="selectEntry"
      @new-entry="newEntry" />

    <!-- 编辑器 -->
    <Editor ref="editorRef" :entry="selectedEntry" :is-deleted="showDeletedOnly" @toggle-favorite="toggleFavorite"
      @delete="deleteEntry" @restore="restoreEntry" @permanently-delete="permanentlyDeleteEntry"
      @content-change="handleContentChange" @new-entry="newEntry" />
  </div>
</template>

<style scoped>
/* 整个 Journal 页面外壳 */
.journal-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
  color: #1d1d1f;
  background: #f5f5f7;
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