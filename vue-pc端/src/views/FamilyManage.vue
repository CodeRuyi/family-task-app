<template>
  <div class="page-scroll">
    <!-- ===================== 页头 ===================== -->
    <header class="page-header">
      <div>
        <h1 class="page-title">家长管理</h1>
        <p class="page-subtitle">审核家长绑定申请，管理已绑定的家庭台账</p>
      </div>
      <button class="btn btn-ghost" @click="reloadAll">刷新数据</button>
    </header>

    <!-- ===================== 统计卡 ===================== -->
    <div class="stat-row">
      <div
        v-for="card in statCards"
        :key="card.key"
        class="stat-card"
        :style="{ '--accent': card.color, '--accent-soft': card.soft }"
      >
        <div class="stat-head">
          <span class="stat-icon" v-html="card.icon"></span>
          <span class="stat-label">{{ card.label }}</span>
        </div>
        <div class="stat-value">
          <span class="stat-num">{{ card.value }}</span>
          <span class="stat-unit">{{ card.unit }}</span>
        </div>
      </div>
    </div>

    <!-- ===================== 主体卡片 ===================== -->
    <section class="panel">
      <!-- Tab -->
      <div class="tab-group">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab"
          :class="{ active: activeTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.value === 0 && stats.waitAuditNum" class="tab-badge">
            {{ stats.waitAuditNum }}
          </span>
        </button>
      </div>

      <!-- 操作栏 -->
      <div class="operate-row">
        <div class="batch-buttons">
          <button
            class="btn btn-primary btn-sm"
            :disabled="!checkedIds.length || activeTab !== 0"
            @click="handleBatchAudit('approved')"
          >
            批量通过
          </button>
          <button
            class="btn btn-danger btn-sm"
            :disabled="!checkedIds.length || activeTab !== 0"
            @click="handleBatchAudit('rejected')"
          >
            批量驳回
          </button>
          <span v-if="checkedIds.length" class="selected-tip">
            已选 {{ checkedIds.length }} 项
          </span>
        </div>

        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            v-model="keyword"
            placeholder="搜索学生 / 家长姓名"
            @keyup.enter="handleSearch"
          />
          <button @click="handleSearch">搜索</button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 46px">
                <input
                  type="checkbox"
                  :checked="selectAll"
                  :disabled="activeTab !== 0 || !list.length"
                  @change="handleSelectAll"
                />
              </th>
              <th>家长姓名</th>
              <th>家长手机</th>
              <th>学生姓名</th>
              <th>所在班级</th>
              <th>申请时间</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="center-cell">加载中...</td>
            </tr>
            <tr v-else-if="!list.length">
              <td colspan="7">
                <div class="empty-state" style="padding: 44px 0">
                  <span class="empty-icon" v-html="ICONS.emptyMail"></span>
                  <span>{{ keyword ? '没有匹配的记录' : activeTab === 0 ? '暂无待审核申请' : '暂无已绑定家庭' }}</span>
                </div>
              </td>
            </tr>
            <tr v-for="item in list" :key="item.id">
              <td>
                <input
                  type="checkbox"
                  v-model="checkedIds"
                  :value="item.id"
                  :disabled="activeTab !== 0"
                />
              </td>
              <td>
                <div class="cell-user">
                  <span class="avatar-mini parent">{{ (item.parent_name || '家').charAt(0) }}</span>
                  <span>{{ item.parent_name || '未知' }}</span>
                </div>
              </td>
              <td class="text-secondary">{{ item.parent_phone || '--' }}</td>
              <td>{{ item.student_name || '未关联' }}</td>
              <td>
                <span class="tag tag-gray">{{ item.class_name || '未分班' }}</span>
              </td>
              <td class="text-secondary">{{ formatTime(item.created_at) }}</td>
              <td>
                <div v-if="activeTab === 0" class="op-group">
                  <button class="link-btn success" @click="handleSingleAudit(item, 'approved')">
                    通过
                  </button>
                  <button class="link-btn danger" @click="handleSingleAudit(item, 'rejected')">
                    驳回
                  </button>
                </div>
                <span v-else class="tag tag-success">已绑定</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination-row">
        <span class="page-info">
          共 {{ total }} 条 · 第 {{ page }} / {{ totalPages }} 页
        </span>
        <div class="page-btns">
          <button class="page-btn" :disabled="page <= 1" @click="goPage(page - 1)">‹</button>
          <span class="page-current">{{ page }}</span>
          <button class="page-btn" :disabled="page >= totalPages" @click="goPage(page + 1)">›</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  getFamilyStats,
  getFamilyList,
  auditSingleFamily,
  batchAuditFamily
} from '@/api/request'
import { unwrap, extractList } from '@/api/request'
import { getCurrentClassId } from '@/utils/storage'
import { ICONS } from '@/utils/icons'
import { toast, confirmDialog } from '@/utils/notice'

const stats = reactive({
  totalBindParent: 0,
  todayNewApply: 0,
  waitAuditNum: 0
})

const tabs = [
  { label: '家长绑定审核', value: 0 },
  { label: '已绑定家庭台账', value: 1 }
]

const activeTab = ref(0)
const keyword = ref('')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const selectAll = ref(false)
const checkedIds = ref([])

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

const statCards = computed(() => [
  {
    key: 'bind',
    label: '总绑定家长数',
    value: stats.totalBindParent || 0,
    unit: '人',
    color: 'var(--color-info)',
    soft: 'var(--info-soft)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17.5 14.5A5.5 5.5 0 0 1 22 20"/></svg>'
  },
  {
    key: 'today',
    label: '今日新增申请',
    value: stats.todayNewApply || 0,
    unit: '人',
    color: 'var(--brand-600)',
    soft: 'var(--brand-50)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>'
  },
  {
    key: 'wait',
    label: '待审核申请',
    value: stats.waitAuditNum || 0,
    unit: '条',
    color: 'var(--color-warning)',
    soft: 'var(--warning-soft)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  }
])

async function loadStats() {
  try {
    const res = await getFamilyStats()
    const { data, ok } = unwrap(res)
    if (ok && data && typeof data === 'object') Object.assign(stats, data)
  } catch {
    // 已统一提示
  }
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      type: activeTab.value,
      page: page.value,
      pageSize: pageSize.value
    }
    const classId = getCurrentClassId()
    if (classId !== null) params.classId = classId
    if (keyword.value.trim()) params.keyword = keyword.value.trim()

    const res = await getFamilyList(params)
    const { list: dataList, total: totalCount } = extractList(res)
    list.value = dataList
    total.value = totalCount
    checkedIds.value = []
    selectAll.value = false
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const reloadAll = () => Promise.all([loadStats(), loadList()])

function switchTab(tab) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  page.value = 1
  keyword.value = ''
  loadList()
}

function handleSearch() {
  page.value = 1
  loadList()
}

function goPage(target) {
  if (target < 1 || target > totalPages.value) return
  page.value = target
  loadList()
}

function handleSelectAll(e) {
  selectAll.value = e.target.checked
  checkedIds.value = e.target.checked ? list.value.map((item) => item.id) : []
}

watch(checkedIds, (val) => {
  selectAll.value = list.value.length > 0 && val.length === list.value.length
})

async function handleSingleAudit(item, status) {
  const action = status === 'approved' ? '通过' : '驳回'
  const ok = await confirmDialog({
    title: `${action}绑定申请`,
    content: `确定要${action}「${item.parent_name || '该家长'}」绑定「${item.student_name || '该学生'}」的申请吗？`,
    confirmText: `确认${action}`,
    danger: status === 'rejected'
  })
  if (!ok) return

  try {
    const res = await auditSingleFamily(item.id, status)
    const { ok: success, msg } = unwrap(res)
    if (success) {
      toast.success(msg || `${action}成功`)
      await reloadAll()
    } else {
      toast.error(msg || `${action}失败`)
    }
  } catch {
    // 已统一提示
  }
}

async function handleBatchAudit(status) {
  if (!checkedIds.value.length) {
    toast.warning('请先选择要审核的申请')
    return
  }
  const action = status === 'approved' ? '通过' : '驳回'
  const ok = await confirmDialog({
    title: `批量${action}`,
    content: `确定要${action}选中的 ${checkedIds.value.length} 条申请吗？`,
    confirmText: `确认${action}`,
    danger: status === 'rejected'
  })
  if (!ok) return

  try {
    const res = await batchAuditFamily({ ids: checkedIds.value, status })
    const { ok: success, msg } = unwrap(res)
    if (success) {
      toast.success(msg || `批量${action}成功`)
      checkedIds.value = []
      selectAll.value = false
      await reloadAll()
    } else {
      toast.error(msg || `批量${action}失败`)
    }
  } catch {
    // 已统一提示
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

onMounted(reloadAll)
</script>

<style scoped>
/* ===================== 统计卡 ===================== */
/* ===================== 主体 ===================== */
.tab-group {
  display: flex;
  gap: 28px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 18px;
}

.tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 2px 13px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-primary);
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-primary);
}

.tab-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: #fef3c7;
  color: #b45309;
  font-size: 11px;
  font-weight: 600;
}

/* ===================== 操作栏 ===================== */
.operate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.batch-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.search-box input {
  width: 190px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text);
}

.search-box button {
  height: 100%;
  padding: 0 14px;
  border: none;
  border-left: 1px solid var(--color-border-light);
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 500;
}

.search-box button:hover {
  background: var(--brand-50);
}

/* ===================== 表格 ===================== */
.cell-user {
  display: flex;
  align-items: center;
  gap: 9px;
}

.avatar-mini.parent {
  background: linear-gradient(135deg, #93c5fd, #3b82f6);
}

.center-cell {
  padding: 40px 0 !important;
  text-align: center;
  color: var(--color-text-placeholder);
}

.op-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.link-btn.success {
  color: var(--color-primary);
}

.link-btn.success:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.link-btn.danger {
  color: var(--color-danger);
}

.link-btn.danger:hover {
  color: #b91c1c;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.data-table input[type='checkbox'] {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
  vertical-align: middle;
}

.data-table input[type='checkbox']:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* ===================== 分页 ===================== */
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}

.page-info {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.page-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--color-text-regular);
  font-size: 15px;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--brand-50);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-current {
  min-width: 32px;
  text-align: center;
  font-weight: 600;
  color: var(--color-text);
}
</style>
