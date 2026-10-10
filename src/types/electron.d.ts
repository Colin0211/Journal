export { }

interface JournalData {
  title: string
  content: string
}

interface Journal {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
  favorite: number
  deleted_at: string | null
}

declare global {
  interface Window {
    electronAPI: {
      createJournal(data: JournalData): Promise<Journal>

      listJournals(): Promise<Journal[]>

      updateJournal(
        id: number,
        data: {
          title: string
          content: string
        },
      ): Promise<{
        success: boolean
        updated_at: string
      }>

      deleteJournal(
        id: number,
      ): Promise<{
        success: boolean
      }>

      listDeletedJournals(): Promise<Journal[]>

      restoreJournal(
        id: number,
      ): Promise<{
        success: boolean
      }>

      permanentlyDeleteJournal(
        id: number,
      ): Promise<{
        success: boolean
      }>

      toggleFavorite(
        id: number,
      ): Promise<{
        success: boolean
        favorite?: boolean
      }>

      // 获取所有标签
      getAllTags(): Promise<{
        id: number
        name: string
      }[]>

      // 获取某篇日记的标签
      getJournalTags(
        journalId: number,
      ): Promise<{
        id: number
        name: string
      }[]>

      // 获取所有日记与标签的关联关系
      listAllJournalTags(): Promise<{
        journal_id: number
        tag_id: number
        name: string
      }[]>

      // 给日记添加标签
      addTagToJournal(
        journalId: number,
        tagName: string,
      ): Promise<{
        id: number
        name: string
      } | null>

      // 从日记中移除标签
      removeTagFromJournal(
        journalId: number,
        tagId: number,
      ): Promise<boolean>

      // 导出为 Markdown
      exportMarkdown(): Promise<{
        success: boolean
        canceled?: boolean
        count?: number
        dir?: string
        error?: string
      }>

      // 导出 JSON 备份
      exportJson(): Promise<{
        success: boolean
        canceled?: boolean
        count?: number
        file?: string
        error?: string
      }>

      // 从 JSON 备份导入
      importJson(): Promise<{
        success: boolean
        canceled?: boolean
        count?: number
        error?: string
      }>

      // 备份数据库文件
      backupDatabase(): Promise<{
        success: boolean
        canceled?: boolean
        file?: string
        error?: string
      }>
    }
  }
}
