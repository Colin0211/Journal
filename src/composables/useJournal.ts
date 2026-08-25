import { computed, ref } from 'vue'

export interface JournalEntry {
    id: number
    title: string
    content: string
    createdAt: number
    updatedAt: number
    favorite: boolean
    deletedAt: number | null
}

export function useJournal() {
    const entries = ref<JournalEntry[]>([])
    const deletedEntries = ref<JournalEntry[]>([])
    const selectedId = ref<number | null>(null)


    const searchText = ref('')
    const showFavoritesOnly = ref(false)
    const showDeletedOnly = ref(false)

    // 计算当前选中的日记条目
    const selectedEntry = computed(() => {
        if (showDeletedOnly.value) {
            return (
                deletedEntries.value.find(
                    (entry) => entry.id === selectedId.value,
                ) ?? null
            )
        }

        return (
            entries.value.find(
                (entry) => entry.id === selectedId.value,
            ) ?? null
        )
    })

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
        deleted_at: string | null
    }): JournalEntry => {
        return {
            id: journal.id,
            title: journal.title,
            content: journal.content,
            createdAt: new Date(journal.created_at).getTime(),
            updatedAt: new Date(journal.updated_at).getTime(),
            favorite: Boolean(journal.favorite),
            deletedAt: journal.deleted_at
                ? new Date(journal.deleted_at).getTime()
                : null,
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

    // 从 SQLite 加载回收站日记
    const loadDeletedEntries = async () => {
        try {
            const journals = await window.electronAPI.listDeletedJournals()

            deletedEntries.value = journals.map(convertJournal)
        } catch (error) {
            console.error('加载回收站日记失败：', error)
            return []
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
            deletedAt: null,
        }
    }

    // 删除当前选中的日记到回收站
    const deleteEntry = async () => {
        const current = selectedEntry.value

        if (!current) {
            return
        }

        // 如果当前在收藏夹，记录当前日记在收藏列表中的位置
        const currentId = current.id

        const favoriteIndex = showFavoritesOnly.value
            ? filteredEntries.value.findIndex(
                (entry) => entry.id === currentId,
            )
            : -1


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

        // SQLite 删除成功后，加入回收站列表
        deletedEntries.value.unshift(current)

        // SQLite 删除成功后，再更新 Vue 列表
        const index = entries.value.findIndex(
            (entry) => entry.id === current.id,
        )

        entries.value = entries.value.filter(
            (entry) => entry.id !== current.id,
        )

        // 当前在收藏夹
        if (showFavoritesOnly.value) {
            const remainingEntries = filteredEntries.value

            if (remainingEntries.length === 0) {
                selectedId.value = null
            } else if (remainingEntries[favoriteIndex]) {
                // 优先选择当前日记后面的下一篇收藏
                selectedId.value = remainingEntries[favoriteIndex].id
            } else {
                // 当前已经是最后一篇，选择上一篇
                selectedId.value =
                    remainingEntries[remainingEntries.length - 1]?.id ?? null
            }

            return
        }

        // 当前在所有日记
        if (entries.value.length === 0) {
            selectedId.value = null
        } else if (entries.value[index]) {
            // 优先选择当前日记后面的下一篇
            selectedId.value = entries.value[index].id
        } else {
            // 当前已经是最后一篇，选择上一篇
            selectedId.value =
                entries.value[entries.value.length - 1]?.id ?? null
        }
    }

    // 恢复回收站中的日记条目
    const restoreEntry = async (id: number) => {
        try {
            const result = await window.electronAPI.restoreJournal(id)

            if (!result.success) {
                console.error('恢复日记失败')
                return false
            }

            const entry = deletedEntries.value.find(
                (entry) => entry.id === id,
            )

            if (!entry) {
                return false
            }

            // 记录当前日记在回收站中的位置
            const currentIndex = deletedEntries.value.findIndex(
                (entry) => entry.id === id,
            )

            // 从回收站移除
            deletedEntries.value = deletedEntries.value.filter(
                (entry) => entry.id !== id,
            )

            // 放回正常日记列表
            entries.value.unshift(entry)

            // 恢复后自动选择回收站中的相邻日记
            const remainingEntries = deletedEntries.value

            if (remainingEntries.length === 0) {
                selectedId.value = null
            } else if (remainingEntries[currentIndex]) {
                // 优先选择原来位置后面的下一篇
                selectedId.value = remainingEntries[currentIndex].id
            } else {
                // 如果当前已经是最后一篇，就选择上一篇
                selectedId.value =
                    remainingEntries[remainingEntries.length - 1]?.id ?? null
            }

            return true
        } catch (error) {
            console.error('恢复日记失败：', error)
            return false
        }
    }

    // 永久删除回收站中的日记条目
    const permanentlyDeleteEntry = async (id: number) => {
        try {
            const result =
                await window.electronAPI.permanentlyDeleteJournal(id)

            if (!result.success) {
                console.error('永久删除日记失败')
                return false
            }

            // 记录当前日记在回收站中的位置
            const currentIndex = deletedEntries.value.findIndex(
                (entry) => entry.id === id,
            )

            // 从回收站列表中移除
            deletedEntries.value = deletedEntries.value.filter(
                (entry) => entry.id !== id,
            )

            const remainingEntries = deletedEntries.value

            // 如果当前选中的正好是被永久删除的日记
            if (selectedId.value === id) {
                if (remainingEntries.length === 0) {
                    selectedId.value = null
                } else if (remainingEntries[currentIndex]) {
                    // 优先选择原来位置后面的下一篇
                    selectedId.value = remainingEntries[currentIndex].id
                } else {
                    // 如果当前已经是最后一篇，就选择上一篇
                    selectedId.value =
                        remainingEntries[remainingEntries.length - 1]?.id ?? null
                }
            }

            return true
        } catch (error) {
            console.error('永久删除日记失败：', error)
            return false
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

            const currentIndex = filteredEntries.value.findIndex(
                (entry) => entry.id === current.id,
            )

            // SQLite 更新成功后，再更新 Vue
            current.favorite = result.favorite

            // 如果当前处于收藏夹，并且刚刚取消了收藏
            if (showFavoritesOnly.value && !current.favorite) {
                const remainingEntries = filteredEntries.value

                // 优先选择当前日记后面的下一篇
                if (remainingEntries[currentIndex]) {
                    selectedId.value = remainingEntries[currentIndex].id
                } else {
                    // 如果当前已经是最后一篇，就选择上一页最后一篇
                    selectedId.value =
                        remainingEntries[remainingEntries.length - 1]?.id ?? null
                }
            }

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
        deletedEntries,
        selectedId,
        selectedEntry,

        searchText,
        filteredEntries,
        showFavoritesOnly,
        showDeletedOnly,
        todayEntries,
        yesterdayEntries,
        olderEntries,

        loadEntries,
        createEntry,
        updateEntry,
        deleteEntry,
        loadDeletedEntries,
        restoreEntry,
        permanentlyDeleteEntry,
        handleContentChange,
        saveCurrentEntry,
        toggleFavorite,
    }
}