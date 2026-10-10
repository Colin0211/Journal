<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  close: []
  imported: []
}>()

// 是否正在执行操作
const busy = ref(false)

// 结果提示
const message = ref('')
const messageType = ref<'info' | 'error'>('info')

const setMessage = (text: string, type: 'info' | 'error' = 'info') => {
  message.value = text
  messageType.value = type
}

// 导出为 Markdown
const exportMarkdown = async () => {
  if (busy.value) {
    return
  }

  busy.value = true
  message.value = ''

  try {
    const result = await window.electronAPI.exportMarkdown()

    if (!result.canceled) {
      if (result.success) {
        setMessage(`已导出 ${result.count ?? 0} 篇日记到：${result.dir ?? ''}`)
      } else {
        setMessage(result.error ?? '导出失败', 'error')
      }
    }
  } catch (error) {
    setMessage(`导出失败：${(error as Error).message}`, 'error')
  } finally {
    busy.value = false
  }
}

// 导出 JSON 备份
const exportJson = async () => {
  if (busy.value) {
    return
  }

  busy.value = true
  message.value = ''

  try {
    const result = await window.electronAPI.exportJson()

    if (!result.canceled) {
      if (result.success) {
        setMessage(`已导出 ${result.count ?? 0} 条记录到：${result.file ?? ''}`)
      } else {
        setMessage(result.error ?? '导出失败', 'error')
      }
    }
  } catch (error) {
    setMessage(`导出失败：${(error as Error).message}`, 'error')
  } finally {
    busy.value = false
  }
}

// 从 JSON 备份导入
const importJson = async () => {
  if (busy.value) {
    return
  }

  busy.value = true
  message.value = ''

  try {
    const result = await window.electronAPI.importJson()

    if (!result.canceled) {
      if (result.success) {
        setMessage(`已导入 ${result.count ?? 0} 篇日记`)
        emit('imported')
      } else {
        setMessage(result.error ?? '导入失败', 'error')
      }
    }
  } catch (error) {
    setMessage(`导入失败：${(error as Error).message}`, 'error')
  } finally {
    busy.value = false
  }
}

// 备份数据库文件
const backupDatabase = async () => {
  if (busy.value) {
    return
  }

  busy.value = true
  message.value = ''

  try {
    const result = await window.electronAPI.backupDatabase()

    if (!result.canceled) {
      if (result.success) {
        setMessage(`数据库已备份到：${result.file ?? ''}`)
      } else {
        setMessage(result.error ?? '备份失败', 'error')
      }
    }
  } catch (error) {
    setMessage(`备份失败：${(error as Error).message}`, 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h2>数据与备份</h2>

        <button class="modal-close" title="关闭" @click="emit('close')">
          ×
        </button>
      </header>

      <div class="modal-body">
        <!-- 导出 -->
        <section class="data-group">
          <h3>导出</h3>

          <p class="data-desc">
            把日记导出成通用格式，方便阅读、迁移与长期保存。
          </p>

          <div class="data-actions">
            <button class="data-button" :disabled="busy" @click="exportMarkdown">
              <span class="data-button-title">导出为 Markdown</span>
              <span class="data-button-desc">每篇日记一个 .md 文件，含时间与标签</span>
            </button>

            <button class="data-button" :disabled="busy" @click="exportJson">
              <span class="data-button-title">导出 JSON 备份</span>
              <span class="data-button-desc">完整数据（含回收站与标签），可再次导入</span>
            </button>

            <button class="data-button" :disabled="busy" @click="backupDatabase">
              <span class="data-button-title">备份数据库文件</span>
              <span class="data-button-desc">直接复制 SQLite 数据库文件，适合整体存档</span>
            </button>
          </div>
        </section>

        <!-- 恢复 -->
        <section class="data-group">
          <h3>恢复</h3>

          <p class="data-desc">
            从 JSON 备份导入日记，会<strong>追加</strong>到现有数据，不会覆盖已有日记。
          </p>

          <div class="data-actions">
            <button class="data-button" :disabled="busy" @click="importJson">
              <span class="data-button-title">从 JSON 备份导入</span>
              <span class="data-button-desc">重复导入同一份备份会产生重复日记</span>
            </button>
          </div>
        </section>

        <div v-if="message" class="data-message" :class="messageType">
          {{ message }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.28);
}

.modal {
  width: min(560px, calc(100vw - 60px));
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #f0f0f2;
}

.modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8e8e93;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  background: #f2f2f7;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 20px;
}

.data-group + .data-group {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f2;
}

.data-group h3 {
  margin: 0 0 6px;
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 600;
}

.data-desc {
  margin: 0 0 12px;
  color: #8e8e93;
  font-size: 12px;
  line-height: 1.6;
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 14px;
  border: 1px solid #e5e5e7;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.data-button:hover:not(:disabled) {
  background: #f5f5f7;
  border-color: #d2d2d7;
}

.data-button:disabled {
  opacity: 0.55;
  cursor: default;
}

.data-button-title {
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 600;
}

.data-button-desc {
  color: #8e8e93;
  font-size: 11px;
  line-height: 1.5;
}

.data-message {
  margin-top: 18px;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.data-message.info {
  background: #f0f7f0;
  color: #2f6b3a;
}

.data-message.error {
  background: #fdf0f0;
  color: #a33;
}
</style>
