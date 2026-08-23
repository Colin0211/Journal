import { computed, ref } from 'vue'

export interface JournalEntry {
    id: number
    title: string
    content: string
    createdAt: number
    updatedAt: number
    favorite: boolean
}

export function useJournal() {
    const entries = ref<JournalEntry[]>([])
    const selectedId = ref<number | null>(null)
    const selectedEntry = computed(() => {
        return (
            entries.value.find((entry) => entry.id === selectedId.value) ?? null
        )
    })

    const searchText = ref('')
    const showFavoritesOnly = ref(false)

    // 计算两个时间戳之间的天数差
    const getDayDifference = (timestamp: number) => {
        const date = new Date(timestamp)
        const current = new Date()

        const startOfDay = (value: Date) =>
            new Date(
                value.getFullYear(),
                value.getMonth(),
                value.getDate(),
            ).getTime()

        return Math.floor(
            (startOfDay(current) - startOfDay(date)) / 86400000,
        )
    }

    // 根据搜索关键词过滤日记，并按更新时间降序排序
    const filteredEntries = computed(() => {
        const keyword = searchText.value.trim().toLowerCase()

        let result = [...entries.value].sort(
            (a, b) => b.updatedAt - a.updatedAt,
        )

        // 只显示收藏
        if (showFavoritesOnly.value) {
            result = result.filter((entry) => entry.favorite)
        }

        // 搜索
        if (!keyword) {
            return result
        }

        return result.filter((entry) => {
            return (
                entry.title.toLowerCase().includes(keyword) ||
                entry.content.toLowerCase().includes(keyword)
            )
        })
    })

    // 今天
    const todayEntries = computed(() => {
        return filteredEntries.value.filter(
            (entry) => getDayDifference(entry.updatedAt) === 0,
        )
    })

    // 昨天
    const yesterdayEntries = computed(() => {
        return filteredEntries.value.filter(
            (entry) => getDayDifference(entry.updatedAt) === 1,
        )
    })

    // 更早
    const olderEntries = computed(() => {
        return filteredEntries.value.filter(
            (entry) => getDayDifference(entry.updatedAt) > 1,
        )
    })

    // 将 SQLite 数据转换成 Vue 使用的 JournalEntry
    const convertJournal = (journal: {
        id: number
        title: string
        content: string
        created_at: string
        updated_at: string
        favorite: number
    }): JournalEntry => {
        return {
            id: journal.id,
            title: journal.title,
            content: journal.content,
            createdAt: new Date(journal.created_at).getTime(),
            updatedAt: new Date(journal.updated_at).getTime(),
            favorite: Boolean(journal.favorite),
        }
    }

    // 从 SQLite 加载日记
    const loadEntries = async () => {
        try {
            const journals = await window.electronAPI.listJournals()

            entries.value = journals.map(convertJournal)

            selectedId.value = entries.value[0]?.id ?? null

            console.log('SQLite 日记加载成功：', entries.value)
        } catch (error) {
            console.error('加载 SQLite 日记失败：', error)
        }
    }

    // 创建新的日记条目
    const createEntry = async (): Promise<JournalEntry> => {
        const journal = await window.electronAPI.createJournal({
            title: '',
            content: '',
        })

        return {
            id: journal.id,
            title: journal.title,
            content: journal.content,
            createdAt: new Date(journal.created_at).getTime(),
            updatedAt: new Date(journal.updated_at).getTime(),
            favorite: Boolean(journal.favorite),
        }
    }

    // 删除当前选中的日记
    const deleteEntry = async () => {
        const current = selectedEntry.value

        if (!current) {
            return
        }

        // 先从 SQLite 删除
        try {
            const result = await window.electronAPI.deleteJournal(current.id)

            if (!result.success) {
                console.error('SQLite 删除失败：没有找到对应日记')
                return
            }
        } catch (error) {
            console.error('SQLite 删除失败：', error)
            return
        }

        // SQLite 删除成功后，再更新 Vue 列表
        const index = entries.value.findIndex(
            (entry) => entry.id === current.id,
        )

        entries.value = entries.value.filter(
            (entry) => entry.id !== current.id,
        )

        // 删除后已经没有日记
        if (entries.value.length === 0) {
            selectedId.value = null
            return
        }

        // 删除后选择相邻的日记
        const nextIndex = Math.min(index, entries.value.length - 1)
        const nextEntry = entries.value[nextIndex]

        if (nextEntry) {
            selectedId.value = nextEntry.id
        }
    }

    // 切换收藏状态
    const toggleFavorite = async () => {
        const current = selectedEntry.value

        if (!current) {
            return
        }

        try {
            const result = await window.electronAPI.toggleFavorite(current.id)

            if (!result.success || result.favorite === undefined) {
                console.error('SQLite 收藏状态更新失败')
                return
            }

            // SQLite 更新成功后，再更新 Vue
            current.favorite = result.favorite
        } catch (error) {
            console.error('更新收藏状态失败：', error)
        }
    }

    // 更新日记条目
    const updateEntry = async (
        id: number,
        title: string,
        content: string,
    ) => {
        try {
            const result = await window.electronAPI.updateJournal(id, {
                title,
                content,
            })

            if (!result.success) {
                console.error('SQLite 更新失败：没有找到对应日记')
                return false
            }

            const entry = entries.value.find((entry) => entry.id === id)

            if (entry) {
                entry.title = title
                entry.content = content
                entry.updatedAt = new Date(result.updated_at).getTime()
            }

            return true
        } catch (error) {
            console.error('SQLite 更新失败：', error)
            return false
        }
    }
    let saveTimer: ReturnType<typeof setTimeout> | null = null

    // 保存当前选中的日记条目
    const saveCurrentEntry = async () => {
        const entry = selectedEntry.value

        if (!entry) {
            return
        }

        await updateEntry(
            entry.id,
            entry.title,
            entry.content,
        )
    }

    // 处理内容变化，延迟保存
    const scheduleSave = () => {
        if (saveTimer) {
            clearTimeout(saveTimer)
        }

        saveTimer = setTimeout(() => {
            saveCurrentEntry()
        }, 500)
    }

    // 处理内容变化，更新更新时间并延迟保存
    const handleContentChange = () => {
        const entry = selectedEntry.value

        if (!entry) {
            return
        }

        entry.updatedAt = Date.now()

        scheduleSave()
    }


    return {
        entries,
        selectedId,
        selectedEntry,

        searchText,
        filteredEntries,
        showFavoritesOnly,
        todayEntries,
        yesterdayEntries,
        olderEntries,

        loadEntries,
        createEntry,
        updateEntry,
        deleteEntry,
        handleContentChange,
        saveCurrentEntry,
        toggleFavorite,
    }
}