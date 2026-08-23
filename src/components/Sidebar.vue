<script setup lang="ts">
defineProps<{
  entryCount: number
}>()

const emit = defineEmits<{
  newEntry: []
  testSQLite: []
  testListSQLite: []
}>()
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-top">
      <div class="brand">
        <div class="brand-mark">J</div>

        <div class="brand-info">
          <div class="brand-name">Journal</div>
          <div class="brand-caption">私人日记</div>
        </div>
      </div>

      <button
        class="new-button"
        @click="emit('newEntry')"
      >
        <span class="new-button-icon">＋</span>
        <span>新建日记</span>
      </button>

      <nav class="side-navigation">
        <button class="side-item active">
          <span class="side-icon">▤</span>
          <span>所有日记</span>
          <span class="side-count">{{ entryCount }}</span>
        </button>

        <button class="side-item">
          <span class="side-icon">☆</span>
          <span>收藏</span>
        </button>

        <button class="side-item">
          <span class="side-icon">⌑</span>
          <span>标签</span>
        </button>

        <button class="side-item">
          <span class="side-icon">⌫</span>
          <span>最近删除</span>
        </button>
      </nav>
    </div>

    <!-- SQLite 测试按钮，后面正式完成后可以删除 -->
    <button @click="emit('testSQLite')">
      测试 SQLite
    </button>

    <button @click="emit('testListSQLite')">
      测试读取 SQLite
    </button>

    <div class="sidebar-bottom">
      <button class="side-item">
        <span class="side-icon">⚙</span>
        <span>设置</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 224px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 28px 13px 15px;
  background: rgba(245, 245, 247, 0.94);
  border-right: 1px solid rgba(0, 0, 0, 0.07);
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 10px;
  margin-bottom: 27px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.2px;
}

.brand-caption {
  margin-top: 2px;
  color: #8e8e93;
  font-size: 11px;
}

.new-button {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.15s,
    background 0.15s;
}

.new-button:hover {
  background: #333336;
}

.new-button:active {
  transform: scale(0.98);
}

.new-button-icon {
  font-size: 18px;
  line-height: 1;
}

.side-navigation {
  margin-top: 17px;
}

.side-item {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 11px;
  margin-bottom: 3px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #5f5f63;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}

.side-item:hover {
  background: rgba(0, 0, 0, 0.045);
}

.side-item.active {
  background: #e3e3e8;
  color: #1d1d1f;
  font-weight: 500;
}

.side-icon {
  width: 18px;
  color: #666;
  text-align: center;
  font-size: 15px;
}

.side-count {
  margin-left: auto;
  color: #999;
  font-size: 11px;
}

</style>