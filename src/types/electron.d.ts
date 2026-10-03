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

      // 给日记添加标签
      addTagToJournal(
        journalId: number,
        tagName: string,
      ): Promise<boolean>

      // 从日记中移除标签
      removeTagFromJournal(
        journalId: number,
        tagId: number,
      ): Promise<boolean>
    }
  }
}