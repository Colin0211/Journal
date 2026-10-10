import { computed, ref, watch } from 'vue'

export interface Tag {
    id: number
    name: string
}

export interface JournalEntry {
    id: number
    title: string
    content: string
    createdAt: number
    updatedAt: number
    favorite: boolean
    deletedAt: number | null
    tags: Tag[]
}

export function useJournal() {
    const entries = ref<JournalEntry[]>([])
    const deletedEntries = ref<JournalEntry[]>([])
    const selectedId = ref<number | null>(null)

    const searchText = ref('')
    const showFavoritesOnly = ref(false)
    const showDeletedOnly = ref(false)
    const showTagsOnly = ref(false)

    // 标签相关状态
    const tags = ref<Tag[]>([])
    const selectedTagId = ref<number | null>(null)

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

        // 支持用 #标签 的形式搜索标签
        const tagKeyword = keyword.startsWith('#')
            ? keyword.slice(1)
            : keyword

        let result = [...entries.value].sort(
            (a, b) => b.updatedAt - a.updatedAt,
        )

        // 只显示收藏
        if (showFavoritesOnly.value) {
            result = result.filter((entry) => entry.favorite)
        }

        // 只显示包含选中标签的日记
        if (selectedTagId.value !== null) {
            result = result.filter((entry) =>
                entry.tags.some((tag) => tag.id === selectedTagId.value),
            )
        }

        // 搜索：标题、正文、标签
        if (!keyword) {
            return result
        }

        return result.filter((entry) => {
            return (
                entry.title.toLowerCase().includes(keyword) ||
                entry.content.toLowerCase().includes(keyword) ||
                entry.tags.some((tag) =>
                    tag.name.toLowerCase().includes(tagKeyword),
                )
            )
        })
    })

    // 搜索或过滤条件变化时，保证编辑器与列表保持一致：
    // 当前日记仍符合条件就保持不动，否则自动切到第一条结果。
    // 只监听筛选条件（不监听 filteredEntries），
    // 避免用户正在编辑正文时被"切换走"。
    watch(
        [
            searchText,
            showFavoritesOnly,
            showDeletedOnly,
            showTagsOnly,
            selectedTagId,
        ],
        () => {
            // 回收站使用独立列表
            if (showDeletedOnly.value) {
                return
            }

            // 标签列表视图（未选中具体标签）刻意不选中任何日记
            if (showTagsOnly.value && selectedTagId.value === null) {
                return
            }

            const list = filteredEntries.value

            const stillVisible =
                selectedId.value !== null &&
                list.some((entry) => entry.id === selectedId.value)

            if (stillVisible) {
                return
            }

            selectedId.value = list[0]?.id ?? null
        },
    )

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

    // 当前选中的标签
    const selectedTag = computed(() => {
        return (
            tags.value.find((tag) => tag.id === selectedTagId.value) ?? null
        )
    })

    // 所有标签及其对应的日记数量
    const tagsWithCount = computed(() => {
        return tags.value.map((tag) => ({
            id: tag.id,
            name: tag.name,
            count: entries.value.filter((entry) =>
                entry.tags.some((t) => t.id === tag.id),
            ).length,
        }))
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
            tags: [],
        }
    }

    // 从 SQLite 加载日记
    const loadEntries = async () => {
        try {
            const journals = await window.electronAPI.listJournals()

            // 一次性加载所有日记与标签的关联关系；
            // 单独隔离，避免标签查询失败导致整个日记列表加载失败
            let relations: {
                journal_id: number
                tag_id: number
                name: string
            }[] = []

            try {
                relations = await window.electronAPI.listAllJournalTags()
            } catch (error) {
                console.warn('加载标签关联失败（可能是主进程未重启）：', error)
            }

            const tagMap = new Map<number, Tag[]>()
            for (const row of relations) {
                const list = tagMap.get(row.journal_id) ?? []
                list.push({ id: row.tag_id, name: row.name })
                tagMap.set(row.journal_id, list)
            }

            entries.value = journals.map((journal) => ({
                ...convertJournal(journal),
                tags: tagMap.get(journal.id) ?? [],
            }))

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

    // 加载所有标签
    const loadTags = async () => {
        try {
            tags.value = await window.electronAPI.getAllTags()
        } catch (error) {
            console.error('加载标签失败：', error)
        }
    }

    // 加载某篇日记的标签，并同步到对应的 entry
    const loadJournalTags = async (journalId: number): Promise<Tag[]> => {
        try {
            const tagList = await window.electronAPI.getJournalTags(journalId)

            const entry =
                entries.value.find((e) => e.id === journalId) ??
                deletedEntries.value.find((e) => e.id === journalId)

            if (entry) {
                entry.tags = tagList
            }

            return tagList
        } catch (error) {
            console.error('加载日记标签失败：', error)
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
            tags: [],
        }
    }

    // 删除当前选中的日记到回收站
    const deleteEntry = async () => {
        const current = selectedEntry.value

        if (!current) {
            return
        }

        // 过滤视图（收藏或标签过滤）下，记录当前日记在过滤结果中的位置
        const currentId = current.id

        const isFilteredView = showFavoritesOnly.value || showTagsOnly.value

        const filteredIndex = isFilteredView
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

        // 当前在过滤视图（收藏或标签）
        if (isFilteredView) {
            const remainingEntries = filteredEntries.value

            if (remainingEntries.length === 0) {
                selectedId.value = null
            } else if (remainingEntries[filteredIndex]) {
                // 优先选择当前日记后面的下一篇
                selectedId.value = remainingEntries[filteredIndex].id
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

    // 给日记添加标签
    const addTagToEntry = async (journalId: number, tagName: string) => {
        try {
            const tag = await window.electronAPI.addTagToJournal(
                journalId,
                tagName,
            )

            if (!tag) {
                return false
            }

            // 本地直接更新当前日记的标签，确保 UI 立即刷新
            const entry =
                entries.value.find((e) => e.id === journalId) ??
                deletedEntries.value.find((e) => e.id === journalId)

            if (entry && !entry.tags.some((t) => t.id === tag.id)) {
                entry.tags = [...entry.tags, tag]
            }

            // 刷新标签全列表（可能新建了标签）
            await loadTags()

            return true
        } catch (error) {
            console.error('添加标签失败：', error)
            return false
        }
    }

    // 从日记中移除标签
    const removeTagFromEntry = async (journalId: number, tagId: number) => {
        try {
            const ok = await window.electronAPI.removeTagFromJournal(
                journalId,
                tagId,
            )

            if (!ok) {
                return false
            }

            // 本地直接移除当前日记的标签，确保 UI 立即刷新
            const entry =
                entries.value.find((e) => e.id === journalId) ??
                deletedEntries.value.find((e) => e.id === journalId)

            if (entry) {
                entry.tags = entry.tags.filter((t) => t.id !== tagId)
            }

            // 刷新标签全列表（无日记使用的标签会被后端删除）
            await loadTags()

            // 如果被移除的标签已经没有任何日记使用，标签会被删除，
            // 此时清除当前选中状态
            const stillExists = tags.value.some((tag) => tag.id === tagId)

            if (selectedTagId.value === tagId && !stillExists) {
                selectedTagId.value = null
            }

            return true
        } catch (error) {
            console.error('移除标签失败：', error)
            return false
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

    // 记录哪篇日记还有未落盘的改动。
    // 不依赖"当前选中项"，避免切换日记后把改动写到错误的日记上。
    let pendingEntryId: number | null = null

    // 立即写入待保存的改动
    const flushPendingSave = async () => {
        if (saveTimer) {
            clearTimeout(saveTimer)
            saveTimer = null
        }

        if (pendingEntryId === null) {
            return
        }

        const id = pendingEntryId
        pendingEntryId = null

        const entry = entries.value.find((item) => item.id === id)

        if (entry) {
            await updateEntry(entry.id, entry.title, entry.content)
        }
    }

    // 保存当前选中的日记条目
    const saveCurrentEntry = async () => {
        // 先把挂起的改动落盘，再保存当前条目
        await flushPendingSave()

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
            flushPendingSave()
        }, 500)
    }

    // 处理内容变化，更新更新时间并延迟保存
    const handleContentChange = () => {
        const entry = selectedEntry.value

        if (!entry) {
            return
        }

        entry.updatedAt = Date.now()
        pendingEntryId = entry.id

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
        showTagsOnly,
        todayEntries,
        yesterdayEntries,
        olderEntries,

        tags,
        selectedTagId,
        selectedTag,
        tagsWithCount,

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
        loadTags,
        loadJournalTags,
        addTagToEntry,
        removeTagFromEntry,
    }
}
