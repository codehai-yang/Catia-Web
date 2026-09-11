<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { catiaApi } from '@/api/catia'
import { isMockEnabled } from '@/api/mock'
import ModelViewport from '@/components/ModelViewport.vue'
import type { PartInfo, PartNode } from '@/types/catia'

/** 顶部菜单 */
const MENUS = ['文件', '编辑', '视图', '插入', '工具', '窗口', '帮助'] as const

/** 视口主工具（选择 / 平移 / 旋转 / 缩放 / 适配） */
const VIEW_TOOLS = [
  { key: 'select', label: '选择' },
  { key: 'pan', label: '平移' },
  { key: 'rotate', label: '旋转' },
  { key: 'zoom', label: '缩放' },
  { key: 'fit', label: '适配' },
] as const

/** 视口辅助工具（测量 / 剖切 / 爆炸 / 干涉） */
const VIEW_TOOLS_SECONDARY = ['测量', '剖切', '爆炸', '干涉'] as const

/** 右侧属性面板标签页 */
const PANEL_TABS = [
  { key: 'props', label: '属性' },
  { key: 'params', label: '参数' },
  { key: 'material', label: '材料' },
  { key: 'ai', label: 'AI 建模' },
] as const

/** 零件树节点字段映射（后端返回扁平列表，无 children 嵌套） */
const treeProps = { label: 'name' }

/** 去掉零件文件名扩展名（如 .CATPart / .CATProduct），仅用于展示 */
function displayName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

/**
 * 数值格式化（用于物理量展示）：
 * - 极小（<1e-4）或超大（>=1e6）值用科学计数法，如 4.767e-5
 * - 其余保留至多 4 位小数，去掉多余尾零
 */
function formatNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e6)) {
    return value.toExponential(3)
  }
  return Number(value.toFixed(4)).toString()
}

/** 零件列表 */
const parts = ref<PartNode[]>([])
/** 当前选中零件 */
const selectedPart = ref<PartNode | null>(null)
/** 零件属性详情 */
const partInfo = ref<PartInfo | null>(null)
/** 属性详情加载态 */
const partInfoLoading = ref(false)
/** 模型加载态 */
const viewportLoading = ref(false)
/** 列表加载态 */
const listLoading = ref(false)
/** 树搜索关键字 */
const searchKeyword = ref('')
/** 当前激活的视图工具 */
const activeTool = ref<string>('select')
/** 3D 视口组件实例 */
const viewportRef = ref<InstanceType<typeof ModelViewport> | null>(null)

/** 位置变换输入值（占位，待后端补充字段后接入真实变换） */
const transform = reactive({ x: '0.00', y: '0.00', z: '0.00' })
/** 外观透明度（占位） */
const opacity = ref(67)

/** 面板标签键 */
type PanelTabKey = (typeof PANEL_TABS)[number]['key']
/** 当前激活的属性面板标签 */
const activeTab = ref<PanelTabKey>('props')
/** 是否为 AI 建模面板 */
const isAiPanel = computed(() => activeTab.value === 'ai')
/** AI 建模需求描述 */
const aiPrompt = ref('')

/** 当前选中零件标识（以完整路径 full_name 唯一） */
const selectedId = computed(() => selectedPart.value?.full_name ?? '')

/** 按关键字过滤后的零件列表 */
const filteredParts = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return parts.value
  }
  return parts.value.filter(
    (part) =>
      part.name.toLowerCase().includes(keyword) || part.full_name.toLowerCase().includes(keyword),
  )
})

/** 拉取零件列表 */
async function fetchPartList(): Promise<void> {
  listLoading.value = true
  try {
    parts.value = await catiaApi.fetchPartList()
  } catch {
    // 错误提示由响应拦截器统一处理
  } finally {
    listLoading.value = false
  }
}

/** 拉取零件属性详情 */
async function fetchPartInfo(name: string): Promise<void> {
  partInfoLoading.value = true
  try {
    partInfo.value = await catiaApi.fetchPartInfo(name)
  } catch {
    partInfo.value = null
  } finally {
    partInfoLoading.value = false
  }
}

/** 加载指定零件的 GLB 模型到 3D 视口 */
async function loadModel(fullName: string): Promise<void> {
  viewportLoading.value = true
  try {
    const buffer = await catiaApi.getPartGlb(fullName)
    viewportRef.value?.loadModel(buffer)
  } catch {
    // 错误提示由响应拦截器统一处理
  } finally {
    viewportLoading.value = false
  }
}

/** 选中零件变化时拉取详情并加载 3D 模型 */
watch(selectedPart, (part) => {
  if (part) {
    fetchPartInfo(part.name)
    loadModel(part.full_name)
  } else {
    partInfo.value = null
    viewportRef.value?.clear()
    viewportLoading.value = false
  }
})

/** 树节点点击：切换选中 */
function handleNodeClick(data: PartNode): void {
  selectedPart.value = data
}

/** 切换激活的视图工具 */
function selectTool(key: string): void {
  activeTool.value = key
}

/** 应用位置变换（占位，待后端补充字段后开放） */
function handleApplyTransform(): void {
  ElMessage.info('位置变换待后端补充字段后开放')
}

/** 生成 AI 模型（占位，待接入 Agent 自动建模后调用后端） */
function handleGenerate(): void {
  if (!aiPrompt.value.trim()) {
    ElMessage.warning('请先描述建模需求')
    return
  }
  ElMessage.info('AI 建模待接入 Agent 能力')
}

onMounted(fetchPartList)
</script>

<template>
  <div class="catia-page">
    <!-- ===== 顶栏 ===== -->
    <header class="topbar">
      <div class="topbar__left">
        <span class="brand-mark"><i class="brand-mark__dot"></i></span>
        <span class="brand-name">CATIA Web Studio</span>
        <nav class="topbar__menu">
          <span v-for="menu in MENUS" :key="menu" class="menu-item">{{ menu }}</span>
        </nav>
      </div>
      <div class="topbar__right">
        <span class="conn-status"><i class="conn-status__dot"></i>已连接 CATIA</span>
        <button class="icon-btn" type="button" aria-label="设置"></button>
        <button class="icon-btn" type="button" aria-label="通知"></button>
        <span class="avatar">Z</span>
      </div>
    </header>

    <div class="catia-body">
      <!-- ===== 左侧结构树 ===== -->
      <aside class="tree-panel">
        <div class="panel-title">
          <span>结构树</span>
          <button
            class="panel-title__btn"
            type="button"
            :aria-label="'刷新零件列表'"
            @click="fetchPartList"
          >
            <el-icon><Refresh /></el-icon>
          </button>
        </div>

        <div class="tree-search">
          <el-input
            v-model="searchKeyword"
            :prefix-icon="Search"
            placeholder="搜索特征 / 参数"
            clearable
          />
        </div>

        <div class="tree-list">
          <el-tree
            v-loading="listLoading"
            :data="filteredParts"
            :props="treeProps"
            node-key="full_name"
            highlight-current
            :expand-on-click-node="false"
            :current-node-key="selectedId"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <span class="tree-node__mark"></span>
                <span class="tree-node__name">{{ displayName(data.name) }}</span>
              </div>
            </template>
          </el-tree>
        </div>

        <div class="tree-panel__footer">
          <el-tag v-if="isMockEnabled" size="small" type="warning" effect="plain">Mock 模式</el-tag>
        </div>
      </aside>

      <!-- ===== 中间视口 ===== -->
      <section class="viewport">
        <div class="viewport-toolbar">
          <div class="tool-group">
            <button
              v-for="tool in VIEW_TOOLS"
              :key="tool.key"
              type="button"
              class="tool-btn"
              :class="{ 'is-active': activeTool === tool.key }"
              @click="selectTool(tool.key)"
            >
              {{ tool.label }}
            </button>
          </div>
          <span class="toolbar-sep"></span>
          <div class="tool-group">
            <button v-for="tool in VIEW_TOOLS_SECONDARY" :key="tool" type="button" class="tool-btn">
              {{ tool }}
            </button>
          </div>
          <div class="toolbar-spacer"></div>
          <button type="button" class="tool-btn tool-btn--display">
            着色显示<i class="tool-btn__caret"></i>
          </button>
        </div>

        <div class="viewport-canvas">
          <ModelViewport ref="viewportRef" class="viewport-canvas__scene" />

          <span class="viewport-canvas__badge">{{ selectedPart?.name ?? '未选择零件' }}</span>

          <!-- 视图立方体 -->
          <svg class="view-cube" viewBox="0 0 80 80" aria-hidden="true">
            <polygon points="40,8 72,26 40,44 8,26" fill="#2f3a4a" stroke="#4a5a70" />
            <polygon points="40,44 72,26 72,62 40,80" fill="#1c232c" stroke="#4a5a70" />
            <polygon points="40,44 8,26 8,62 40,80" fill="#232b36" stroke="#4a5a70" />
          </svg>

          <div class="viewport-canvas__hint">左键旋转 · 中键平移 · 滚轮缩放</div>
        </div>
      </section>

      <!-- ===== 右侧属性面板 ===== -->
      <aside class="props-panel">
        <div class="props-tabs">
          <span
            v-for="tab in PANEL_TABS"
            :key="tab.key"
            class="props-tabs__item"
            :class="{ 'is-active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </span>
        </div>

        <div class="props-body">
          <!-- AI 建模面板（占位，待接入 Agent 自动建模） -->
          <div v-if="isAiPanel" class="ai-panel">
            <div class="ai-panel__intro">
              <p class="ai-panel__title">AI 建模</p>
              <p class="ai-panel__desc">描述需求，由 Agent 自动生成 CATIA 模型</p>
            </div>
            <el-input
              v-model="aiPrompt"
              type="textarea"
              :rows="6"
              class="ai-panel__input"
              placeholder="例：生成一个长 100mm、宽 60mm、高 10mm 的钢板，中心开一个直径 20mm 的圆孔"
            />
            <el-button type="primary" class="ai-panel__generate" @click="handleGenerate">生成</el-button>
          </div>

          <!-- 常规属性面板 -->
          <template v-else-if="selectedPart">
            <!-- 零件属性（PartInfo） -->
            <section v-loading="partInfoLoading" class="props-section">
              <div class="props-section__title">零件属性</div>
              <template v-if="partInfo">
                <div class="prop-row"><span class="prop-row__label">名称</span><span class="prop-row__value">{{ partInfo.name }}</span></div>
                <div class="prop-row"><span class="prop-row__label">零件号</span><span class="prop-row__value">{{ partInfo.part_number }}</span></div>
                <div class="prop-row"><span class="prop-row__label">密度</span><span class="prop-row__value">{{ formatNumber(partInfo.density) }} kg/m³</span></div>
                <div class="prop-row"><span class="prop-row__label">体积</span><span class="prop-row__value">{{ formatNumber(partInfo.volume) }} m³</span></div>
                <div class="prop-row"><span class="prop-row__label">质量</span><span class="prop-row__value">{{ formatNumber(partInfo.mass) }} kg</span></div>
                <div class="prop-row"><span class="prop-row__label">已保存</span><span class="prop-row__value">{{ partInfo.saved ? '是' : '否' }}</span></div>
                <div class="prop-row"><span class="prop-row__label">只读</span><span class="prop-row__value">{{ partInfo.read_only ? '是' : '否' }}</span></div>
                <div class="prop-row prop-row--stack">
                  <span class="prop-row__label">路径</span>
                  <span class="prop-row__value prop-row__value--wrap">{{ partInfo.path }}</span>
                </div>
                <div class="prop-row prop-row--stack">
                  <span class="prop-row__label">完整名称</span>
                  <span class="prop-row__value prop-row__value--wrap">{{ partInfo.full_name }}</span>
                </div>
              </template>
              <el-empty v-else description="暂无属性信息" :image-size="60" />
            </section>

            <!-- 位置变换 -->
            <section class="props-section">
              <div class="props-section__title">位置变换</div>
              <div class="axis-row">
                <span class="axis-row__label">X</span>
                <span class="axis-row__label">Y</span>
                <span class="axis-row__label">Z</span>
              </div>
              <div class="axis-row">
                <el-input v-model="transform.x" class="axis-row__input" />
                <el-input v-model="transform.y" class="axis-row__input" />
                <el-input v-model="transform.z" class="axis-row__input" />
              </div>
            </section>

            <!-- 外观 -->
            <section class="props-section">
              <div class="props-section__title">外观</div>
              <div class="appearance-row">
                <span class="appearance-row__swatch"></span>
                <span class="appearance-row__text">钢 · 哑光灰</span>
              </div>
              <el-slider v-model="opacity" class="appearance-slider" />
            </section>

            <!-- 参数表 -->
            <section class="props-section">
              <div class="props-section__title">参数表</div>
              <div class="param-table">
                <div class="param-table__head"><span>名称</span><span>值</span><span class="param-table__unit">单位</span></div>
                <div class="param-table__row"><span>高度</span><span>40</span><span class="param-table__unit">mm</span></div>
                <div class="param-table__row"><span>孔半径</span><span>12</span><span class="param-table__unit">mm</span></div>
                <div class="param-table__row"><span>深度</span><span>25</span><span class="param-table__unit">mm</span></div>
              </div>
            </section>
          </template>

          <el-empty v-else class="props-empty" description="请选择零件" />
        </div>

        <div v-if="!isAiPanel" class="props-actions">
          <button type="button" class="props-actions__apply" @click="handleApplyTransform">应用</button>
          <button type="button" class="props-actions__reset">重置</button>
        </div>
      </aside>
    </div>

    <!-- ===== 底部状态栏 ===== -->
    <footer class="statusbar">
      <span class="statusbar__item statusbar__item--ready"><i class="statusbar__dot"></i>就绪</span>
      <span class="statusbar__item">X: 0.00&nbsp;&nbsp;Y: 0.00&nbsp;&nbsp;Z: 0.00</span>
      <span class="statusbar__spacer"></span>
      <span class="statusbar__item">已选 {{ selectedPart ? 1 : 0 }} 个零件</span>
      <span class="statusbar__item">同步 12 ms</span>
      <span class="statusbar__item statusbar__item--accent">60 FPS</span>
    </footer>
  </div>
</template>

<style scoped>
/* ---- 页面级深色主题变量（仅作用于本页面） ---- */
.catia-page {
  /* 主色 */
  --el-color-primary: #3b82f6;
  --el-color-primary-light-3: #6cb0ff;
  --el-color-primary-light-5: #3b82f6;
  --el-color-primary-light-7: #1f2a3d;
  --el-color-primary-light-8: #1f2a3d;
  --el-color-primary-light-9: #1a2433;
  --el-color-primary-dark-2: #2f6fd6;

  /* 背景 */
  --el-bg-color: #1a1e26;
  --el-bg-color-page: #0f1216;
  --el-bg-color-overlay: #20252e;

  /* 文本 */
  --el-text-color-primary: #e1e6ed;
  --el-text-color-regular: #c9d1d9;
  --el-text-color-secondary: #8b95a5;
  --el-text-color-placeholder: #5c6675;
  --el-text-color-disabled: #4a5260;

  /* 边框 */
  --el-border-color: #2a3039;
  --el-border-color-light: #2a3039;
  --el-border-color-lighter: #2a3039;
  --el-border-color-extra-light: #232830;
  --el-border-color-dark: #2a3039;

  /* 填充 */
  --el-fill-color: #20252e;
  --el-fill-color-light: #20252e;
  --el-fill-color-lighter: #1a1e26;
  --el-fill-color-extra-light: #1a1e26;
  --el-fill-color-blank: #141820;
  --el-fill-color-dark: #20252e;

  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #0f1216;
  color: var(--el-text-color-primary);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
}

/* ---- 顶栏 ---- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: #1a1e26;
  border-bottom: 1px solid #2a3039;
}

.topbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #3b82f6;
}

.brand-mark__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #fff;
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  color: #e1e6ed;
}

.topbar__menu {
  display: flex;
  gap: 20px;
  margin-left: 28px;
}

.menu-item {
  font-size: 13px;
  color: #8b95a5;
  cursor: pointer;
}

.menu-item:hover {
  color: #c9d1d9;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.conn-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8b95a5;
}

.conn-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid #2a3039;
  background: transparent;
  cursor: pointer;
}

.icon-btn:hover {
  border-color: #3a4250;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #2a3039;
  border: 1px solid #3a4250;
  font-size: 12px;
  color: #8b95a5;
}

/* ---- 主体三栏 ---- */
.catia-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ---- 左侧结构树 ---- */
.tree-panel {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  background: #1a1e26;
  border-right: 1px solid #2a3039;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px 0 16px;
  font-size: 13px;
  font-weight: 500;
  color: #e1e6ed;
  border-bottom: 1px solid #2a3039;
}

.panel-title__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #8b95a5;
  cursor: pointer;
}

.panel-title__btn:hover {
  color: #c9d1d9;
}

.tree-search {
  padding: 12px;
}

.tree-list {
  flex: 1;
  min-height: 0;
  padding: 0 8px;
  overflow: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tree-node__mark {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  background: #3b82f6;
}

.tree-node__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.tree-panel__footer {
  padding: 8px 16px;
  border-top: 1px solid #2a3039;
}

/* el-tree 深色微调 */
.tree-panel :deep(.el-tree) {
  background: transparent;
  --el-tree-node-hover-bg-color: #20252e;
}

.tree-panel :deep(.el-tree-node__content) {
  height: 26px;
  border-radius: 4px;
}

.tree-panel :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(59, 130, 246, 0.14);
}

/* ---- 中间视口 ---- */
.viewport {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.viewport-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 12px;
  background: #1a1e26;
  border-bottom: 1px solid #2a3039;
}

.tool-group {
  display: flex;
  gap: 4px;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: #2a3039;
}

.toolbar-spacer {
  flex: 1;
}

.tool-btn {
  height: 30px;
  min-width: 52px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #2a3039;
  background: #20252e;
  color: #8b95a5;
  font-size: 12px;
  cursor: pointer;
}

.tool-btn:hover {
  color: #c9d1d9;
}

.tool-btn.is-active {
  background: #1f2a3d;
  border-color: #3b82f6;
  color: #6cb0ff;
}

.tool-btn--display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tool-btn__caret {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #8b95a5;
}

.viewport-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  background-color: #0d1116;
  background-image:
    radial-gradient(circle, #252c37 1px, transparent 1px),
    linear-gradient(180deg, #1b212a 0%, #0d1116 100%);
  background-size:
    26px 26px,
    100% 100%;
}

.viewport-canvas__scene {
  position: absolute;
  inset: 0;
}

.viewport-canvas__badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #1a1e26;
  border: 1px solid #2a3039;
  font-size: 11px;
  color: #8b95a5;
}

.view-cube {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 64px;
  height: 64px;
}

.viewport-canvas__hint {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 6px;
  background: rgba(26, 30, 38, 0.9);
  border: 1px solid #2a3039;
  font-size: 11px;
  color: #5c6675;
}

/* ---- 右侧属性面板 ---- */
.props-panel {
  display: flex;
  flex-direction: column;
  width: 300px;
  flex-shrink: 0;
  background: #1a1e26;
  border-left: 1px solid #2a3039;
}

.props-tabs {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid #2a3039;
}

.props-tabs__item {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #5c6675;
  cursor: pointer;
}

.props-tabs__item.is-active {
  color: #e1e6ed;
  font-weight: 500;
}

.props-tabs__item.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: #3b82f6;
}

.props-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 16px;
}

.props-section {
  padding: 16px 0;
  border-bottom: 1px solid #232830;
}

.props-section__title {
  margin-bottom: 12px;
  font-size: 11px;
  letter-spacing: 1px;
  color: #5c6675;
}

.prop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 11px;
}

.prop-row__label {
  color: #8b95a5;
}

.prop-row__value {
  color: #e1e6ed;
}

.prop-row__value--muted {
  color: #4a5260;
}

.prop-row--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.prop-row__value--wrap {
  word-break: break-all;
  white-space: normal;
}

.axis-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.axis-row__label {
  flex: 1;
  font-size: 10px;
  color: #5c6675;
}

.axis-row__input {
  flex: 1;
}

.appearance-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.appearance-row__swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #6b8cae;
  border: 1px solid #2a3039;
}

.appearance-row__text {
  font-size: 11px;
  color: #c9d1d9;
}

.appearance-slider {
  height: 20px;
}

.param-table {
  font-size: 11px;
}

.param-table__head,
.param-table__row {
  display: flex;
  padding: 6px 0;
}

.param-table__head {
  font-size: 11px;
  color: #5c6675;
  border-bottom: 1px solid #232830;
}

.param-table__head span:first-child,
.param-table__row span:first-child {
  flex: 1;
}

.param-table__head span:nth-child(2),
.param-table__row span:nth-child(2) {
  width: 80px;
  color: #e1e6ed;
}

.param-table__row span:first-child {
  color: #c9d1d9;
}

.param-table__unit {
  color: #5c6675;
}

.props-empty {
  height: 100%;
  justify-content: center;
}

.ai-panel {
  padding-top: 16px;
}

.ai-panel__intro {
  margin-bottom: 16px;
}

.ai-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #e1e6ed;
}

.ai-panel__desc {
  margin: 6px 0 0;
  font-size: 12px;
  color: #5c6675;
}

.ai-panel__input {
  margin-bottom: 16px;
}

.ai-panel__generate {
  width: 100%;
}

.props-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #2a3039;
}

.props-actions__apply,
.props-actions__reset {
  flex: 1;
  height: 34px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.props-actions__apply {
  border: none;
  background: #3b82f6;
  color: #fff;
}

.props-actions__reset {
  border: 1px solid #2a3039;
  background: #20252e;
  color: #8b95a5;
}

/* ---- 底部状态栏 ---- */
.statusbar {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 36px;
  padding: 0 16px;
  background: #1a1e26;
  border-top: 1px solid #2a3039;
  font-size: 11px;
  color: #5c6675;
}

.statusbar__item {
  display: inline-flex;
  align-items: center;
}

.statusbar__item--ready {
  color: #8b95a5;
}

.statusbar__dot {
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.statusbar__spacer {
  flex: 1;
}

.statusbar__item--accent {
  color: #22c55e;
}
</style>