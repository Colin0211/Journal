<script setup lang="ts">
import { ref } from 'vue'
import type { JournalEntry } from '../composables/useJournal'

const props = defineProps<{
  entry: JournalEntry | null
  isFavorites: boolean
  isDeleted: boolean
}>()

const emit = defineEmits<{
  toggleFavorite: []
  delete: []
  restore: [id: number]
  permanentlyDelete: [id: number]
  contentChange: []
  newEntry: []
}>()

// 标题输入框
const titleInput = ref<HTMLInputElement | null>(null)

// 暴露给 App.vue 调用
const focusTitle = () => {
  titleInput.value?.focus()
}

defineExpose({
  focusTitle,
})

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

            <button class="toolbar-button" title="删除" @click="emit('delete')">
              ⌫
            </button>
          </template>

          <!-- 回收站日记 -->
          <template v-else>
            <button class="toolbar-button" title="恢复日记" @click="emit('restore', props.entry.id)">
              ↩
            </button>

            <button class="toolbar-button" title="永久删除" @click="emit('permanentlyDelete', props.entry.id)">
              ⌫
            </button>
          </template>

          <button class="toolbar-button" title="更多">
            •••
          </button>
        </div>
      </header>

      <article class="editor-document">
        <div class="document-date">
          {{ formatDateLabel(props.entry.updatedAt) }}
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
        <div class="empty-editor-icon">⌫</div>

        <h2>最近删除为空</h2>

        <p>
          被删除的日记会显示在这里，
          <br />
          并在 30 天后自动永久删除。
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