// Electron 核心模块
const { app, BrowserWindow, ipcMain } = require('electron')

// SQLite 数据库模块
const {
  initDatabase,
  getDatabase,
  getAllJournals,
  updateJournal,
  deleteJournal,
} = require('./database.cjs')

// Node.js 路径模块
const path = require('path')

// 主窗口
let mainWindow = null

// 创建 Electron 窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,

    // 窗口允许缩小到的最小尺寸
    minWidth: 900,
    minHeight: 600,

    webPreferences: {
      // 开启上下文隔离
      // 防止网页环境直接访问 Electron 内部 API
      contextIsolation: true,

      // 禁止 Vue 页面直接使用 Node.js API
      nodeIntegration: false,

      // 指定 preload 脚本
      // Vue 与 Electron 之间的安全桥梁
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // 加载 Vue / Vite 开发服务器
  mainWindow.loadURL('http://localhost:5173')
}

// IPC：创建一篇日记
// Vue 以后可以通过：
// window.electronAPI.createJournal({
//   title: '今天',
//   content: '今天发生了很多事情'
// })
// 来调用这里。
ipcMain.handle('journal:create', (_event, data) => {

  // 获取已经初始化好的 SQLite 数据库
  const db = getDatabase()

  // 当前时间
  const now = new Date().toISOString()

  // 准备 SQL 插入语句
  const stmt = db.prepare(`
    INSERT INTO journals (
      title,
      content,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?)
  `)

  // 执行 INSERT
  const result = stmt.run(
    data.title ?? '',
    data.content ?? '',
    now,
    now
  )

  // 将刚刚创建的日记返回给 Vue
  return {
    id: result.lastInsertRowid,
    title: data.title ?? '',
    content: data.content ?? '',
    created_at: now,
    updated_at: now,
  }
})

// 获取所有日记
ipcMain.handle('journal:list', () => {
  return getAllJournals()
})

// 更新日记
ipcMain.handle('journal:update', (_event, id, data) => {
  return updateJournal(id, data)
})

// 删除日记
ipcMain.handle('journal:delete', (_event, id) => {
  return deleteJournal(id)
})

// Electron 启动
app.whenReady().then(() => {

  // 初始化 SQLite
  // 必须在 IPC 真正使用数据库之前完成
  initDatabase()

  // 创建窗口
  createWindow()

  // macOS 下点击 Dock 图标时，
  // 如果没有窗口，就重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭后的处理
app.on('window-all-closed', () => {

  // Windows / Linux：
  // 关闭窗口后退出 Electron
  // macOS：
  // 通常保持应用继续运行
  if (process.platform !== 'darwin') {
    app.quit()
  }
})