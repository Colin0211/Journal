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
  showTagsOnly,
  todayEntries,
  yesterdayEntries,
  olderEntries,

  tags,
  selectedTagId,
  selectedTag,
  tagsWithCount,

  loadTags,
  addTagToEntry,
  removeTagFromEntry,
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
  type: 'all' | 'favorites' | 'deleted' | 'tags',
) => {
  showFavoritesOnly.value = type === 'favorites'
  showDeletedOnly.value = type === 'deleted'
  showTagsOnly.value = type === 'tags'
  selectedTagId.value = null

  if (type === 'favorites') {
    selectedId.value = filteredEntries.value[0]?.id ?? null

    return
  }

  if (type === 'deleted') {
    await loadDeletedEntries()

    selectedId.value = deletedEntries.value[0]?.id ?? null

    return
  }

  if (type === 'tags') {
    await loadTags()

    // 标签列表视图：中间列表显示所有标签，编辑器显示空状态
    selectedId.value = null

    return
  }

  selectedId.value = entries.value[0]?.id ?? null
}

// 选中某个标签，过滤出该标签下的日记
const selectTag = (tagId: number) => {
  selectedTagId.value = tagId

  selectedId.value = filteredEntries.value[0]?.id ?? null
}

// 从具体标签返回标签列表
const backToTags = () => {
  selectedTagId.value = null
  selectedId.value = null
}

// 给当前日记添加标签
const handleAddTag = async (name: string) => {
  const entry = selectedEntry.value

  if (!entry) {
    return
  }

  await addTagToEntry(entry.id, name)
}

// 从当前日记移除标签
const handleRemoveTag = async (tagId: number) => {
  const entry = selectedEntry.value

  if (!entry) {
    return
  }

  await removeTagFromEntry(entry.id, tagId)
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
  await loadTags()
})
</script>

<template>
  <div class="journal-app">

    <!-- 侧边栏 -->
    <Sidebar :entry-count="entries.length" :show-favorites-only="showFavoritesOnly" :show-deleted-only="showDeletedOnly"
      :show-tags-only="showTagsOnly" @new-entry="newEntry" @filter-change="handleFilterChange" />

    <!-- 中间日记列表 -->
    <EntryList ref="entryListRef" :entries="entries" :selected-id="selectedId" :search-text="searchText"
      :today-entries="todayEntries" :yesterday-entries="yesterdayEntries" :older-entries="olderEntries"
      :filtered-entries="filteredEntries" :deleted-entries="deletedEntries" :show-deleted-only="showDeletedOnly"
      :show-favorites-only="showFavoritesOnly" :show-tags-only="showTagsOnly" :tags="tagsWithCount"
      :selected-tag-id="selectedTagId" :selected-tag-name="selectedTag?.name ?? null" @update:search-text="searchText = $event"
      @select-entry="selectEntry" @new-entry="newEntry" @select-tag="selectTag" @back-to-tags="backToTags" />

    <!-- 编辑器 -->
    <Editor ref="editorRef" :entry="selectedEntry" :is-deleted="showDeletedOnly" :is-favorites="showFavoritesOnly"
      :is-tags="showTagsOnly" :all-tags="tags" @toggle-favorite="toggleFavorite" @delete="deleteEntry" @restore="restoreEntry"
      @permanently-delete="permanentlyDeleteEntry" @content-change="handleContentChange" @new-entry="newEntry"
      @add-tag="handleAddTag" @remove-tag="handleRemoveTag" />
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
