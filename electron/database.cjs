const Database = require('better-sqlite3')
const { app } = require('electron')
const path = require('path')

let db = null

// 初始化 SQLite 数据库
function initDatabase() {
  // 数据库放在 Electron 的用户数据目录
  const dbPath = path.join(app.getPath('userData'), 'journal.db')

  db = new Database(dbPath)

  // 开启 WAL 模式，提高数据库读写性能
  db.pragma('journal_mode = WAL')

  // 创建日记表（如果还不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS journals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  console.log('SQLite database:', dbPath)
}

// 获取数据库实例
function getDatabase() {
  if (!db) {
    throw new Error('Database has not been initialized')
  }

  return db
}

// 获取所有日记
function getAllJournals() {
  const db = getDatabase()

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      content,
      created_at,
      updated_at
    FROM journals
    ORDER BY updated_at DESC
  `)

  return stmt.all()
}

// 更新日记
function updateJournal(id, data) {
  const db = getDatabase()

  const now = new Date().toISOString()

  const stmt = db.prepare(`
    UPDATE journals
    SET
      title = ?,
      content = ?,
      updated_at = ?
    WHERE id = ?
  `)

  const result = stmt.run(
    data.title ?? '',
    data.content ?? '',
    now,
    id,
  )

  return {
    success: result.changes > 0,
    updated_at: now,
  }
}

// 删除日记
function deleteJournal(id) {
  const db = getDatabase()

  const stmt = db.prepare(`
    DELETE FROM journals
    WHERE id = ?
  `)

  const result = stmt.run(id)

  return {
    success: result.changes > 0,
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  getAllJournals,
  updateJournal,
  deleteJournal,
}