<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { JournalEntry, Tag } from '../composables/useJournal'
import TagIcon from './TagIcon.vue'
import TrashIcon from './TrashIcon.vue'

const props = defineProps<{
  entry: JournalEntry | null
  isFavorites: boolean
  isDeleted: boolean
  isTags: boolean
  isSearching: boolean
  allTags: Tag[]
}>()

const emit = defineEmits<{
  toggleFavorite: []
  delete: []
  restore: [id: number]
  permanentlyDelete: [id: number]
  contentChange: []
  newEntry: []
  addTag: [name: string]
  removeTag: [tagId: number]
}>()

// 标题输入框
const titleInput = ref<HTMLInputElement | null>(null)

// 标签面板是否展开
const showTagPanel = ref(false)

// 标签输入框
const tagInput = ref<HTMLInputElement | null>(null)

// 新增标签名
const newTagName = ref('')

// 暴露给 App.vue 调用
const focusTitle = () => {
  titleInput.value?.focus()
}

defineExpose({
  focusTitle,
})

// 切换标签面板
const toggleTagPanel = () => {
  showTagPanel.value = !showTagPanel.value

  if (showTagPanel.value) {
    nextTick(() => tagInput.value?.focus())
  }
}

// 提交新增标签
const submitTag = () => {
  const name = newTagName.value.trim()

  if (!name) {
    return
  }

  emit('addTag', name)
  newTagName.value = ''
  showTagPanel.value = false
}

// 判断某个标签是否已在当前日记上
const isTagOnEntry = (tagId: number) => {
  return props.entry?.tags.some((tag) => tag.id === tagId) ?? false
}

// 快捷切换标签：已添加则移除，未添加则添加
const toggleTag = (tag: Tag) => {
  if (isTagOnEntry(tag.id)) {
    emit('removeTag', tag.id)
  } else {
    emit('addTag', tag.name)
  }
}

// 切换日记时关闭标签面板
watch(
  () => props.entry?.id,
  () => {
    showTagPanel.value = false
  },
)

const formatDateLabel = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 计算删除日期
const formatDeleteDate = (timestamp: number | null) => {
  if (!timestamp) {
    return ''
  }

  const deleteDate = new Date(timestamp)

  deleteDate.setDate(deleteDate.getDate() + 30)

  return deleteDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

</script>

<template>
  <main class="editor">
    <template v-if="props.entry">
      <header class="editor-toolbar">
        <div class="editor-toolbar-left">
          <span v-if="!props.isDeleted" class="saved-indicator">
            <span class="saved-dot"></span>
            已保存
          </span>

          <span v-else class="deleted-indicator">
            <span class="deleted-dot"></span>
            已移至最近删除
          </span>
        </div>

        <div class="editor-toolbar-right">
          <!-- 正常日记 -->
          <template v-if="!props.isDeleted">
            <button class="toolbar-button" :class="{ favorite: props.entry.favorite }" title="收藏"
              @click="emit('toggleFavorite')">
              {{ props.entry.favorite ? '★' : '☆' }}
            </button>

            <button class="toolbar-button" :class="{ active: showTagPanel }" title="添加标签"
              @click="toggleTagPanel">
              <TagIcon />
            </button>

            <button class="toolbar-button" title="删除" @click="emit('delete')">
              <TrashIcon />
            </button>
          </template>

          <!-- 回收站日记 -->
          <template v-else>
            <button class="toolbar-button" title="恢复日记" @click="emit('restore', props.entry.id)">
              ↩
            </button>

            <button class="toolbar-button" title="永久删除" @click="emit('permanentlyDelete', props.entry.id)">
              <TrashIcon />
            </button>
          </template>
        </div>

        <!-- 标签面板 -->
        <div v-if="showTagPanel && !props.isDeleted" class="tag-panel">
          <div class="tag-panel-header">标签</div>

          <div class="tags-list">
            <span v-for="tag in props.entry.tags" :key="tag.id" class="tag-chip">
              #{{ tag.name }}
              <button class="tag-remove" title="移除标签" @click="emit('removeTag', tag.id)">
                ×
              </button>
            </span>

            <span v-if="props.entry.tags.length === 0" class="tags-empty">
              暂无标签
            </span>
          </div>

          <div class="tag-input-row">
            <input ref="tagInput" v-model="newTagName" class="tag-input" type="text" placeholder="输入标签名"
              @keydown.enter="submitTag" @keydown.esc="showTagPanel = false" />

            <button class="tag-add-button" title="添加标签" @click="submitTag">
              添加
            </button>
          </div>

          <!-- 已有标签快捷选择 -->
          <div class="tag-suggestions">
            <div class="tag-panel-subheader">已有标签，点击快捷选择</div>

            <div class="tags-list">
              <button v-for="tag in props.allTags" :key="tag.id" class="tag-chip tag-chip-clickable"
                :class="{ selected: isTagOnEntry(tag.id) }" @click="toggleTag(tag)">
                #{{ tag.name }}
              </button>

              <span v-if="props.allTags.length === 0" class="tags-empty">
                暂无已有标签
              </span>
            </div>
          </div>
        </div>
      </header>

      <article class="editor-document">
        <div class="document-date">
          {{ formatDateLabel(props.entry.updatedAt) }}
        </div>

        <!-- 文档中的标签（只读展示） -->
        <div v-if="!props.isDeleted && props.entry.tags.length" class="document-tags">
          <span v-for="tag in props.entry.tags" :key="tag.id" class="doc-tag">
            #{{ tag.name }}
          </span>
        </div>

        <div v-if="props.isDeleted" class="deleted-notice">
          此日记已移至最近删除，将于
          {{ formatDeleteDate(props.entry.deletedAt) }}
          自动永久删除
        </div>

        <input :value="props.entry.title" class="document-title" type="text" placeholder="无标题"
          :readonly="props.isDeleted" @input="
            props.entry.title = ($event.target as HTMLInputElement).value,
            emit('contentChange')
            " />

        <textarea :value="props.entry.content" class="document-body" placeholder="今天发生了什么？" :readonly="props.isDeleted"
          @input="
            props.entry.content = ($event.target as HTMLTextAreaElement).value,
            emit('contentChange')
            "></textarea>

        <div class="document-meta">
          最后编辑于 {{ formatTime(props.entry.updatedAt) }}
        </div>
      </article>
    </template>

    <div v-else class="empty-editor">
      <!-- 最近删除为空 -->
      <template v-if="props.isDeleted">
        <div class="empty-editor-icon"><TrashIcon /></div>

        <h2>最近删除为空</h2>

        <p>
          被删除的日记会显示在这里，
          <br />
          并在 30 天后自动永久删除。
        </p>
      </template>

      <!-- 搜索无结果 -->
      <template v-else-if="props.isSearching">
        <div class="empty-editor-icon">⌕</div>

        <h2>没有找到日记</h2>

        <p>
          没有符合当前关键词的日记，
          <br />
          试试其他关键词。
        </p>
      </template>

      <!-- 收藏夹为空 -->
      <template v-else-if="props.isFavorites">
        <div class="empty-editor-icon">☆</div>

        <h2>暂无收藏</h2>

        <p>
          收藏你喜欢的日记，
          <br />
          它们会显示在这里。
        </p>
      </template>

      <!-- 标签视图空状态 -->
      <template v-else-if="props.isTags">
        <div class="empty-editor-icon"><TagIcon /></div>

        <h2>标签</h2>

        <p>
          在左侧选择一个标签，
          <br />
          查看属于它的日记。
        </p>
      </template>

      <!-- 正常状态没有选中日记 -->
      <template v-else>
        <div class="empty-editor-icon">✎</div>

        <h2>开始记录</h2>

        <p>
          写下今天的故事，
          <br />
          留住那些值得记住的瞬间。
        </p>

        <button class="empty-editor-button" @click="emit('newEntry')">
          新建日记
        </button>
      </template>
    </div>
  </main>
</template>

<style scoped>
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
  position: relative;
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

.deleted-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #999;
  font-size: 10px;
}

.deleted-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c7c7cc;
}

.editor-toolbar-right {
  display: flex;
  gap: 3px;
}

.toolbar-button {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.toolbar-button.active {
  background: #e8e8ed;
  color: #1d1d1f;
}

/* ================================
   标签面板
================================ */

.tag-panel {
  position: absolute;
  top: 52px;
  right: 27px;
  z-index: 20;
  width: 260px;
  padding: 13px;
  border: 1px solid #e5e5e7;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}

.tag-panel-header {
  margin-bottom: 10px;
  color: #8e8e93;
  font-size: 11px;
  font-weight: 600;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  background: #f2f2f7;
  color: #5f5f63;
  font-size: 12px;
}

.tag-remove {
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #c7c7cc;
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.tag-remove:hover {
  background: #9a9a9f;
}

.tags-empty {
  color: #b1b1b6;
  font-size: 12px;
}

.tag-input-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 11px;
}

.tag-input {
  height: 30px;
  min-width: 0;
  flex: 1;
  padding: 0 10px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  outline: none;
  background: #fff;
  color: #1d1d1f;
  font-size: 12px;
}

.tag-input:focus {
  border-color: #c7c7cc;
}

.tag-input::placeholder {
  color: #b1b1b6;
}

.tag-add-button {
  height: 30px;
  padding: 0 12px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: #1d1d1f;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.tag-add-button:hover {
  background: #333336;
}

.tag-suggestions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f2;
}

.tag-panel-subheader {
  margin-bottom: 8px;
  color: #b1b1b6;
  font-size: 10px;
  font-weight: 600;
}

.tag-chip-clickable {
  border: none;
  cursor: pointer;
}

.tag-chip-clickable:hover {
  background: #e8e8ed;
}

.tag-chip-clickable.selected {
  background: #1d1d1f;
  color: #fff;
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

/* 文档中的标签展示 */
.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
}

.doc-tag {
  padding: 3px 10px;
  border-radius: 999px;
  background: #f2f2f7;
  color: #6d6d72;
  font-size: 12px;
}

.deleted-notice {
  margin-bottom: 20px;
  padding: 9px 12px;
  border-radius: 8px;
  background: #f5f5f7;
  color: #8e8e93;
  font-size: 11px;
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
</style>
