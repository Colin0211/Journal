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

      toggleFavorite(
        id: number,
      ): Promise<{
        success: boolean
        favorite?: boolean
      }>
    }
  }
}