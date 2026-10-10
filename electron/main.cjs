// Electron 核心模块
const { app, BrowserWindow, ipcMain, dialog } = require('electron')

// SQLite 数据库模块
const {
  initDatabase,
  getDatabase,
  getAllJournals,
  updateJournal,
  deleteJournal,
  toggleFavorite,
  getDeletedJournals,
  restoreJournal,
  permanentlyDeleteJournal,
  cleanupExpiredJournals,
  getAllJournalsWithDeleted,
  importJournals,
  getAllTags,
  getJournalTags,
  getAllJournalTags,
  addTagToJournal,
  removeTagFromJournal
} = require('./database.cjs')

// Node.js 路径模块
const path = require('path')

// Node.js 文件系统模块
const fs = require('fs')

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

//新建日记
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

// 删除日记到回收站
ipcMain.handle('journal:delete', (_event, id) => {
  return deleteJournal(id)
})

// 切换收藏状态
ipcMain.handle('journal:toggleFavorite', (_event, id) => {
  return toggleFavorite(id)
})

//读取回收站
ipcMain.handle('journal:listDeleted', () => {
  return getDeletedJournals()
})

// 恢复日记
ipcMain.handle('journal:restore', (_, id) => {
  return restoreJournal(id)
})

// 永久删除日记
ipcMain.handle('journal:permanentlyDelete', (_, id) => {
  return permanentlyDeleteJournal(id)
})

// 获取所有标签
ipcMain.handle('tag:list', () => {
  return getAllTags()
})

// 获取某篇日记的标签
ipcMain.handle('journal:getTags', (_, journalId) => {
  return getJournalTags(journalId)
})

// 获取所有日记与标签的关联关系
ipcMain.handle('tag:listJournalTags', () => {
  return getAllJournalTags()
})

// 给日记添加标签
ipcMain.handle('journal:addTag', (_, journalId, tagName) => {
  return addTagToJournal(journalId, tagName)
})

// 从日记中移除标签
ipcMain.handle('journal:removeTag', (_, journalId, tagId) => {
  return removeTagFromJournal(journalId, tagId)
})

// ================================
// 数据导出 / 备份
// ================================

// 把日期时间格式化成 2026-10-04 18:53
function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const pad = (num) => String(num).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 清理文件名中的非法字符
function sanitizeFileName(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

// 生成不重复的文件路径
function uniqueFilePath(dir, baseName, ext) {
  let index = 1
  let fileName = `${baseName}${ext}`
  let fullPath = path.join(dir, fileName)

  while (fs.existsSync(fullPath)) {
    index++
    fileName = `${baseName} (${index})${ext}`
    fullPath = path.join(dir, fileName)
  }

  return { fileName, fullPath }
}

// 整理出「日记 id -> 标签名数组」的映射
function buildTagNameMap() {
  const relations = getAllJournalTags()

  const map = new Map()

  for (const row of relations) {
    const list = map.get(row.journal_id) ?? []
    list.push(row.name)
    map.set(row.journal_id, list)
  }

  return map
}

// 导出为 Markdown（每篇日记一个文件，不含回收站）
ipcMain.handle('data:exportMarkdown', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择导出文件夹',
    properties: ['openDirectory', 'createDirectory'],
  })

  if (result.canceled || !result.filePaths[0]) {
    return { success: false, canceled: true }
  }

  const dir = result.filePaths[0]

  const journals = getAllJournals()
  const tagMap = buildTagNameMap()

  let count = 0

  for (const journal of journals) {
    const tagNames = tagMap.get(journal.id) ?? []

    const lines = []
    lines.push(`# ${journal.title || '无标题'}`)
    lines.push('')
    lines.push(`- 创建时间：${formatDateTime(journal.created_at)}`)
    lines.push(`- 更新时间：${formatDateTime(journal.updated_at)}`)

    if (journal.favorite) {
      lines.push('- 收藏：★')
    }

    if (tagNames.length) {
      lines.push(`- 标签：${tagNames.map((name) => `#${name}`).join(' ')}`)
    }

    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(journal.content || '')
    lines.push('')

    const date = String(
      journal.updated_at || journal.created_at || '',
    ).slice(0, 10)

    const title = sanitizeFileName(journal.title || '无标题')

    const { fullPath } = uniqueFilePath(dir, `${date} ${title}`, '.md')

    fs.writeFileSync(fullPath, lines.join('\n'), 'utf8')

    count++
  }

  return { success: true, count, dir }
})

// 导出 JSON 备份（包含回收站与标签）
ipcMain.handle('data:exportJson', async () => {
  const journals = getAllJournalsWithDeleted()
  const tagMap = buildTagNameMap()

  const payload = {
    app: 'journal',
    version: 1,
    exportedAt: new Date().toISOString(),
    journals: journals.map((journal) => ({
      ...journal,
      tags: tagMap.get(journal.id) ?? [],
    })),
  }

  const stamp = new Date().toISOString().slice(0, 10)

  const result = await dialog.showSaveDialog({
    title: '导出 JSON 备份',
    defaultPath: `journal-backup-${stamp}.json`,
    filters: [{ name: 'JSON 备份', extensions: ['json'] }],
  })

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true }
  }

  fs.writeFileSync(
    result.filePath,
    JSON.stringify(payload, null, 2),
    'utf8',
  )

  return {
    success: true,
    count: payload.journals.length,
    file: result.filePath,
  }
})

// 从 JSON 备份追加导入
ipcMain.handle('data:importJson', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择 JSON 备份文件',
    properties: ['openFile'],
    filters: [{ name: 'JSON 备份', extensions: ['json'] }],
  })

  if (result.canceled || !result.filePaths[0]) {
    return { success: false, canceled: true }
  }

  let payload = null

  try {
    payload = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'))
  } catch (error) {
    return { success: false, error: 'JSON 文件解析失败' }
  }

  const list = Array.isArray(payload) ? payload : payload?.journals

  if (!Array.isArray(list)) {
    return { success: false, error: '备份文件格式不正确' }
  }

  const count = importJournals(list)

  return { success: true, count }
})

// 备份数据库文件（使用 SQLite 在线备份，兼容 WAL）
ipcMain.handle('data:backupDatabase', async () => {
  const stamp = new Date().toISOString().slice(0, 10)

  const result = await dialog.showSaveDialog({
    title: '备份数据库文件',
    defaultPath: `journal-db-${stamp}.db`,
    filters: [{ name: 'SQLite 数据库', extensions: ['db'] }],
  })

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true }
  }

  try {
    await getDatabase().backup(result.filePath)
  } catch (error) {
    return { success: false, error: `备份失败：${error.message}` }
  }

  return { success: true, file: result.filePath }
})

// Electron 启动
app.whenReady().then(() => {

  // 初始化 SQLite
  // 必须在 IPC 真正使用数据库之前完成
  initDatabase()

  // 自动清理超过 30 天的回收站日记
  cleanupExpiredJournals()

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
