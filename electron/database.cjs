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

  // 开启 SQLite 外键约束
  db.pragma('foreign_keys = ON')

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

  // 检查数据库字段
  const columns = db
    .prepare(`PRAGMA table_info(journals)`)
    .all()

  // favorite 字段
  const hasFavorite = columns.some(
    (column) => column.name === 'favorite',
  )

  if (!hasFavorite) {
    db.exec(`
    ALTER TABLE journals
    ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0
  `)

    console.log('SQLite: added favorite column')
  }

  // deleted 字段
  const hasDeleted = columns.some(
    (column) => column.name === 'deleted',
  )

  if (!hasDeleted) {
    db.exec(`
    ALTER TABLE journals
    ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0
  `)

    console.log('SQLite: added deleted column')
  }

  // deleted_at 字段
  const hasDeletedAt = columns.some(
    (column) => column.name === 'deleted_at',
  )

  if (!hasDeletedAt) {
    db.exec(`
    ALTER TABLE journals
    ADD COLUMN deleted_at TEXT
  `)

    console.log('SQLite: added deleted_at column')
  }

  // 创建标签表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT
    )
  `)

  // 兼容旧版本数据库：检查 tags 表是否有 created_at 字段
  const tagColumns = db.prepare(`PRAGMA table_info(tags)`).all()

  const hasTagCreatedAt = tagColumns.some(
    (column) => column.name === 'created_at',
  )

  if (!hasTagCreatedAt) {
    db.exec(`
      ALTER TABLE tags
      ADD COLUMN created_at TEXT
    `)

    console.log('SQLite: added tags.created_at column')
  }

  // 创建日记-标签关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_tags (
      journal_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (journal_id, tag_id),
      FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)
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
      updated_at,
      favorite,
      deleted,
      deleted_at
    FROM journals
    WHERE deleted = 0
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

// 将日记移动到回收站
function deleteJournal(id) {
  const db = getDatabase()

  const deletedAt = new Date().toISOString()

  const stmt = db.prepare(`
    UPDATE journals
    SET
      deleted = 1,
      deleted_at = ?
    WHERE id = ?
      AND deleted = 0
  `)

  const result = stmt.run(
    deletedAt,
    id,
  )

  return {
    success: result.changes > 0,
  }
}

// 获取回收站中的日记
function getDeletedJournals() {
  const db = getDatabase()

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      content,
      created_at,
      updated_at,
      favorite,
      deleted,
      deleted_at
    FROM journals
    WHERE deleted = 1
    ORDER BY deleted_at DESC
  `)

  return stmt.all()
}

// 从回收站恢复日记
function restoreJournal(id) {
  const db = getDatabase()

  const stmt = db.prepare(`
    UPDATE journals
    SET
      deleted = 0,
      deleted_at = NULL
    WHERE id = ?
      AND deleted = 1
  `)

  const result = stmt.run(id)

  return {
    success: result.changes > 0,
  }
}

// 永久删除回收站中的日记
function permanentlyDeleteJournal(id) {
  const db = getDatabase()

  const stmt = db.prepare(`
    DELETE FROM journals
    WHERE id = ?
      AND deleted = 1
  `)

  const result = stmt.run(id)

  return {
    success: result.changes > 0,
  }
}

// 自动清理超过 30 天的回收站日记
function cleanupExpiredJournals() {
  const db = getDatabase()

  const stmt = db.prepare(`
    DELETE FROM journals
    WHERE deleted = 1
      AND deleted_at IS NOT NULL
      AND deleted_at <= datetime('now', '-30 days')
  `)

  const result = stmt.run()

  console.log(
    `SQLite: 自动清理了 ${result.changes} 条超过 30 天的日记`,
  )

  return result.changes
}

//收藏日记
function toggleFavorite(id) {
  const db = getDatabase()

  const stmt = db.prepare(`
    UPDATE journals
    SET favorite = CASE
      WHEN favorite = 0 THEN 1
      ELSE 0
    END
    WHERE id = ?
  `)

  const result = stmt.run(id)

  if (result.changes === 0) {
    return {
      success: false,
    }
  }

  const row = db
    .prepare(`
      SELECT favorite
      FROM journals
      WHERE id = ?
    `)
    .get(id)

  return {
    success: true,
    favorite: Boolean(row.favorite),
  }
}

// ================================
// 标签相关操作
// ================================

// 获取所有标签
function getAllTags() {
  const db = getDatabase()

  return db.prepare(`
    SELECT id, name
    FROM tags
    ORDER BY name ASC
  `).all()
}


// 获取某篇日记的所有标签
function getJournalTags(journalId) {
  const db = getDatabase()

  return db.prepare(`
    SELECT tags.id, tags.name
    FROM tags
    INNER JOIN journal_tags
      ON tags.id = journal_tags.tag_id
    WHERE journal_tags.journal_id = ?
    ORDER BY tags.name ASC
  `).all(journalId)
}

// 一次性获取所有日记与标签的关联关系
function getAllJournalTags() {
  const db = getDatabase()

  return db.prepare(`
    SELECT
      journal_tags.journal_id,
      tags.id AS tag_id,
      tags.name
    FROM journal_tags
    INNER JOIN tags
      ON tags.id = journal_tags.tag_id
    ORDER BY tags.name ASC
  `).all()
}


// 给日记添加标签，返回新建或已存在的标签对象
function addTagToJournal(journalId, tagName) {
  const db = getDatabase()

  const name = tagName.trim()

  if (!name) {
    return null
  }

  // 如果标签不存在，就创建（补上 created_at，兼容旧表 NOT NULL 约束）
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (name, created_at)
    VALUES (?, ?)
  `)

  insertTag.run(name, new Date().toISOString())

  // 获取标签
  const tag = db.prepare(`
    SELECT id, name
    FROM tags
    WHERE name = ?
  `).get(name)

  if (!tag) {
    return null
  }

  // 建立日记和标签之间的关系
  db.prepare(`
    INSERT OR IGNORE INTO journal_tags (
      journal_id,
      tag_id
    )
    VALUES (?, ?)
  `).run(journalId, tag.id)

  return tag
}


// 从日记中移除标签
function removeTagFromJournal(journalId, tagId) {
  const db = getDatabase()

  const result = db.prepare(`
    DELETE FROM journal_tags
    WHERE journal_id = ?
      AND tag_id = ?
  `).run(journalId, tagId)

  // 如果这个标签已经没有任何日记使用了，就删除标签本身
  db.prepare(`
    DELETE FROM tags
    WHERE id = ?
      AND NOT EXISTS (
        SELECT 1
        FROM journal_tags
        WHERE tag_id = ?
      )
  `).run(tagId, tagId)

  return result.changes > 0
}

module.exports = {
  initDatabase,
  getDatabase,
  getAllJournals,
  getDeletedJournals,
  updateJournal,
  deleteJournal,
  restoreJournal,
  permanentlyDeleteJournal,
  toggleFavorite,
  cleanupExpiredJournals,
  getAllTags,
  getJournalTags,
  getAllJournalTags,
  addTagToJournal,
  removeTagFromJournal,
}
