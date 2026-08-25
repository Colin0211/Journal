<script setup lang="ts">
import { ref, computed } from 'vue'
import type { JournalEntry } from '../composables/useJournal'

const props = defineProps<{
  entries: JournalEntry[]
  deletedEntries: JournalEntry[]
  selectedId: number | null
  searchText: string
  todayEntries: JournalEntry[]
  yesterdayEntries: JournalEntry[]
  olderEntries: JournalEntry[]
  filteredEntries: JournalEntry[]
  showFavoritesOnly: boolean
  showDeletedOnly: boolean
}>()

const emit = defineEmits<{
  'update:searchText': [value: string]
  selectEntry: [id: number]
  newEntry: []
}>()

const formatListDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}

const searchInput = ref<HTMLInputElement | null>(null)

const displayEntries = computed(() => {
  if (props.showDeletedOnly) {
    return props.deletedEntries
  }

  return props.filteredEntries
})

defineExpose({
  searchInput,
})
</script>

<template>
  <section class="entry-panel">
    <header class="entry-header">
      <div>
        <h1>日记</h1>
        <div class="entry-total">{{ entries.length }} 篇日记</div>
      </div>

      <button class="icon-button" title="新建日记" @click="emit('newEntry')">
        ＋
      </button>
    </header>

    <div class="search-container">
      <div class="search-field">
        <span class="search-icon">⌕</span>

        <input ref="searchInput" :value="searchText" type="text" placeholder="搜索" @input="
          emit(
            'update:searchText',
            ($event.target as HTMLInputElement).value,
          )
          " />

        <kbd v-if="!searchText">Ctrl K</kbd>

        <button v-else class="clear-search" title="清除搜索" @click="emit('update:searchText', '')">
          ×
        </button>
      </div>
    </div>

    <div class="entry-scroll">

      <!-- 最近删除 -->
      <section v-if="props.showDeletedOnly" class="deleted-entry-list">
        <div v-for="entry in props.deletedEntries" :key="entry.id" class="entry-card"
          :class="{ selected: props.selectedId === entry.id }" @click="emit('selectEntry', entry.id)">
          <div class="entry-card-top">
            <span class="entry-date">
              {{ formatListDate(entry.updatedAt) }}
            </span>
          </div>

          <div class="entry-card-title">
            {{ entry.title || '无标题' }}
          </div>

          <div class="entry-card-preview">
            {{ entry.content.replace(/\n/g, ' ').slice(0, 82) || '暂无内容' }}
          </div>
        </div>

        <div v-if="props.deletedEntries.length === 0" class="no-results">
          <div class="no-results-icon">⌫</div>
          <div>回收站为空</div>
          <small>删除的日记会在这里保留 30 天</small>
        </div>
      </section>

      <!-- 今天 -->
      <section v-if="!props.showDeletedOnly && todayEntries.length" class="entry-group">
        <div class="group-title">今天</div>

        <button v-for="entry in todayEntries" :key="entry.id" class="entry-card"
          :class="{ selected: selectedId === entry.id }" @click="emit('selectEntry', entry.id)">
          <div class="entry-card-top">
            <span class="entry-date">
              {{ formatListDate(entry.updatedAt) }}
            </span>

            <span v-if="entry.favorite" class="favorite-mark">
              ★
            </span>
          </div>

          <div class="entry-card-title">
            {{ entry.title || '无标题' }}
          </div>

          <div class="entry-card-preview">
            {{
              entry.content.replace(/\n/g, ' ').slice(0, 82) ||
              '暂无内容'
            }}
          </div>
        </button>
      </section>

      <!-- 昨天 -->
      <section v-if="!props.showDeletedOnly && yesterdayEntries.length" class="entry-group">
        <div class="group-title">昨天</div>

        <button v-for="entry in yesterdayEntries" :key="entry.id" class="entry-card"
          :class="{ selected: selectedId === entry.id }" @click="emit('selectEntry', entry.id)">
          <div class="entry-card-top">
            <span class="entry-date">
              {{ formatListDate(entry.updatedAt) }}
            </span>

            <span v-if="entry.favorite" class="favorite-mark">
              ★
            </span>
          </div>

          <div class="entry-card-title">
            {{ entry.title || '无标题' }}
          </div>

          <div class="entry-card-preview">
            {{
              entry.content.replace(/\n/g, ' ').slice(0, 82) ||
              '暂无内容'
            }}
          </div>
        </button>
      </section>

      <!-- 更早 -->
      <section v-if="!props.showDeletedOnly && olderEntries.length" class="entry-group">
        <div class="group-title">更早</div>

        <button v-for="entry in olderEntries" :key="entry.id" class="entry-card"
          :class="{ selected: selectedId === entry.id }" @click="emit('selectEntry', entry.id)">
          <div class="entry-card-top">
            <span class="entry-date">
              {{ formatListDate(entry.updatedAt) }}
            </span>

            <span v-if="entry.favorite" class="favorite-mark">
              ★
            </span>
          </div>

          <div class="entry-card-title">
            {{ entry.title || '无标题' }}
          </div>

          <div class="entry-card-preview">
            {{
              entry.content.replace(/\n/g, ' ').slice(0, 82) ||
              '暂无内容'
            }}
          </div>
        </button>
      </section>

      <!-- 没有搜索结果 -->
      <div v-if="
        !props.showDeletedOnly &&
        filteredEntries.length === 0
      " class="no-results">
        <div class="no-results-icon">⌕</div>
        <div>没有找到日记</div>
        <small>试试其他搜索关键词</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
</style>