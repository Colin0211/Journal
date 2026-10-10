const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全 API 给 Vue
// Vue 页面不能直接访问 Electron 的 ipcRenderer。
// 这里通过 contextBridge，只暴露我们明确允许使用的功能。
contextBridge.exposeInMainWorld('electronAPI', {
  // 创建一篇日记
  // 最终通过 IPC 发送到 main.cjs
  createJournal: (data) => {
    return ipcRenderer.invoke('journal:create', data)
  },

  // 获取全部日记
  listJournals: () => {
    return ipcRenderer.invoke('journal:list')
  },

  // 更新日记
  updateJournal: (id, data) => {
    return ipcRenderer.invoke('journal:update', id, data)
  },

  // 删除日记
  deleteJournal: (id) => {
    return ipcRenderer.invoke('journal:delete', id)
  },

  // 获取回收站中的日记
  listDeletedJournals: () => {
    return ipcRenderer.invoke('journal:listDeleted')
  },

  // 恢复日记
  restoreJournal: (id) => {
    return ipcRenderer.invoke('journal:restore', id)
  },

  // 永久删除日记
  permanentlyDeleteJournal: (id) => {
    return ipcRenderer.invoke('journal:permanentlyDelete', id)
  },

  // 切换收藏状态
  toggleFavorite: (id) => {
    return ipcRenderer.invoke('journal:toggleFavorite', id)
  },

  // 获取所有标签
  getAllTags: () => {
    return ipcRenderer.invoke('tag:list')
  },

  // 获取某篇日记的标签
  getJournalTags: (journalId) => {
    return ipcRenderer.invoke('journal:getTags', journalId)
  },

  // 获取所有日记与标签的关联关系
  listAllJournalTags: () => {
    return ipcRenderer.invoke('tag:listJournalTags')
  },

  // 给日记添加标签
  addTagToJournal: (journalId, tagName) => {
    return ipcRenderer.invoke(
      'journal:addTag',
      journalId,
      tagName,
    )
  },

  // 从日记中移除标签
  removeTagFromJournal: (journalId, tagId) => {
    return ipcRenderer.invoke(
      'journal:removeTag',
      journalId,
      tagId,
    )
  },

  // 导出为 Markdown
  exportMarkdown: () => {
    return ipcRenderer.invoke('data:exportMarkdown')
  },

  // 导出 JSON 备份
  exportJson: () => {
    return ipcRenderer.invoke('data:exportJson')
  },

  // 从 JSON 备份导入
  importJson: () => {
    return ipcRenderer.invoke('data:importJson')
  },

  // 备份数据库文件
  backupDatabase: () => {
    return ipcRenderer.invoke('data:backupDatabase')
  },
})
