import { onMounted, onUnmounted } from 'vue'

interface KeyboardShortcutOptions {
  onNewEntry: () => void
  onSearch: () => void
  onSave: () => void
  onEscape: () => void
}

export function useKeyboardShortcuts({
  onNewEntry,
  onSearch,
  onSave,
  onEscape,
}: KeyboardShortcutOptions) {
  const handleKeydown = (event: KeyboardEvent) => {
    // Esc = 清空搜索框并失去焦点
    if (event.key === 'Escape') {
      onEscape()
      return
    }

    const modifier = event.ctrlKey || event.metaKey

    if (!modifier) {
      return
    }

    // Ctrl + N = 新建日记
    if (event.key.toLowerCase() === 'n') {
      event.preventDefault()
      onNewEntry()
    }

    // Ctrl + K = 聚焦搜索框
    if (event.key.toLowerCase() === 'k') {
      event.preventDefault()
      onSearch()
    }

    // Ctrl + S = 立即保存 SQLite
    if (event.key.toLowerCase() === 's') {
      event.preventDefault()
      onSave()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}