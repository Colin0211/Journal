<script setup lang="ts">
import { ref, computed } from 'vue'
import type { JournalEntry } from '../composables/useJournal'
import TagIcon from './TagIcon.vue'
import TrashIcon from './TrashIcon.vue'

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
  showTagsOnly: boolean
  tags: {
    id: number
    name: string
    count: number
  }[]
  selectedTagId: number | null
  selectedTagName: string | null
}>()

const emit = defineEmits<{
  'update:searchText': [value: string]
  selectEntry: [id: number]
  newEntry: []
  selectTag: [tagId: number]
  backToTags: []
}>()

const formatListDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}

// 处理删除时间
const formatDeletedDate = (timestamp: number | null) => {
  if (!timestamp) {
    return '未知'
  }

  return formatListDate(timestamp)
}

const getRemainingDays = (deletedAt: number) => {
  const expireTime = deletedAt + 30 * 24 * 60 * 60 * 1000
  const remaining = Math.ceil(
    (expireTime - Date.now()) / (24 * 60 * 60 * 1000),
  )

  return Math.max(remaining, 0)
}

const searchInput = ref<HTMLInputElement | null>(null)

// 标签视图：未选中具体标签，显示标签列表
const showTagList = computed(
  () => props.showTagsOnly && props.selectedTagId === null,
)

// 标签视图：已选中具体标签，显示该标签下的日记
const showTaggedEntries = computed(
  () => props.showTagsOnly && props.selectedTagId !== null,
)

defineExpose({
  searchInput,
})
</script>

<template>
  <section class="entry-panel">
    <header class="entry-header">
      <div>
        <h1>
          {{
            props.showDeletedOnly
              ? '最近删除'
              : showTagList
                ? '标签'
                : showTaggedEntries
                  ? `#${props.selectedTagName}`
                  : props.showFavoritesOnly
                    ? '收藏'
                    : '日记'
          }}
        </h1>

        <div class="entry-total">
          {{
            props.showDeletedOnly
              ? `${props.deletedEntries.length} 篇日记`
              : showTagList
                ? `${props.tags.length} 个标签`
                : showTaggedEntries
                  ? `${props.filteredEntries.length} 篇日记`
                  : props.showFavoritesOnly
                    ? `${props.filteredEntries.length} 篇收藏`
                    : `${entries.length} 篇日记`
          }}
        </div>
      </div>

      <button v-if="!props.showDeletedOnly && !props.showFavoritesOnly && !props.showTagsOnly" class="icon-button"
        title="新建日记" @click="emit('newEntry')">
        ＋
      </button>
    </header>

    <div v-if="!props.showDeletedOnly && !props.showTagsOnly" class="search-container">
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
              最后编辑于 {{ formatListDate(entry.updatedAt) }}
            </span>

            <div class="deleted-info">
              <span class="deleted-date">
                移除于 {{ formatDeletedDate(entry.deletedAt) }}
              </span>

              <span v-if="entry.deletedAt" class="remaining-days">
                · 还剩{{ getRemainingDays(entry.deletedAt) }}天
              </span>

              <span v-if="entry.favorite" class="favorite-mark">
                ★
              </span>
            </div>
          </div>

          <div class="entry-card-title">
            {{ entry.title || '无标题' }}
          </div>

          <div class="entry-card-preview">
            {{ entry.content.replace(/\n/g, ' ').slice(0, 82) || '暂无内容' }}
          </div>
        </div>

        <div v-if="props.deletedEntries.length === 0" class="no-results">
          <div class="no-results-icon"><TrashIcon /></div>
          <div>回收站为空</div>
          <small>删除的日记会在 30 天后自动永久删除</small>
        </div>
      </section>

      <!-- 标签列表视图 -->
      <section v-if="showTagList" class="tag-list">
        <button v-for="tag in props.tags" :key="tag.id" class="tag-card"
          @click="emit('selectTag', tag.id)">
          <span class="tag-icon">#</span>
          <span class="tag-name">{{ tag.name }}</span>
          <span class="tag-count">{{ tag.count }}</span>
        </button>

        <div v-if="props.tags.length === 0" class="no-results">
          <div class="no-results-icon"><TagIcon /></div>
          <div>暂无标签</div>
          <small>在日记编辑器中添加标签后会显示在这里</small>
        </div>
      </section>

      <!-- 已选中具体标签：返回按钮 + 该标签下的日记 -->
      <template v-if="showTaggedEntries">
        <button class="tag-back" @click="emit('backToTags')">
          ← 所有标签
        </button>
      </template>

      <!-- 今天 -->
      <section v-if="!props.showDeletedOnly && !showTagList && todayEntries.length" class="entry-group">
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
      <section v-if="!props.showDeletedOnly && !showTagList && yesterdayEntries.length" class="entry-group">
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
      <section v-if="!props.showDeletedOnly && !showTagList && olderEntries.length" class="entry-group">
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

      <!-- 选中标签下没有日记 -->
      <div v-if="
        showTaggedEntries &&
        filteredEntries.length === 0
      " class="no-results">
        <div class="no-results-icon">#</div>
        <div>该标签下暂无日记</div>
        <small>给日记添加这个标签后就会显示在这里</small>
      </div>

      <!-- 没有搜索结果 -->
      <div v-if="
        !props.showDeletedOnly &&
        !showTagList &&
        !showTaggedEntries &&
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

/* ================================
   标签视图
================================ */

.tag-back {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 8px 11px;
  margin-bottom: 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6d6d72;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.tag-back:hover {
  background: #f5f5f7;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tag-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: none;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.tag-card:hover {
  background: #f5f5f7;
}

.tag-icon {
  width: 20px;
  color: #8e8e93;
  font-size: 15px;
  text-align: center;
}

.tag-name {
  flex: 1;
  overflow: hidden;
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tag-count {
  color: #999;
  font-size: 11px;
}

/* ================================
   最近删除
================================ */

.deleted-entry-list .entry-card {
  padding: 13px 12px 12px;
  margin-bottom: 5px;
  border: 1px solid transparent;
}

/* 第一行：最后编辑 + 删除信息 */
.deleted-entry-list .entry-card-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 17px;
  margin-bottom: 5px;
}

.deleted-entry-list .entry-date {
  color: #8e8e93;
  font-size: 10px;
  white-space: nowrap;
}

.deleted-info {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-width: 0;
  color: #a1a1a6;
  font-size: 10px;
  white-space: nowrap;
}

.deleted-date {
  color: #8e8e93;
}

.remaining-days {
  color: #a1a1a6;
}

.deleted-entry-list .favorite-mark {
  margin-left: 5px;
  color: #777;
  font-size: 11px;
  line-height: 1;
}

/* 标题 */
.deleted-entry-list .entry-card-title {
  margin-top: 0;
  margin-bottom: 3px;
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 600;
}

/* 内容预览 */
.deleted-entry-list .entry-card-preview {
  margin-top: 0;
  color: #8e8e93;
  font-size: 11px;
  line-height: 1.45;
}

/* 回收站为空 */
.deleted-entry-list .no-results {
  padding-top: 75px;
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
