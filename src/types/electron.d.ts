export {}

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
}

declare global {
  interface Window {
    electronAPI: {
      createJournal(data: JournalData): Promise<Journal>

        listJournals(): Promise<Journal[]>

    }
  }
}