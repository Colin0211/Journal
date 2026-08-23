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
})