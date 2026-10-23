<template>
  <div class="layout-wrap">
    <!-- ===================== 左侧侧边栏 ===================== -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="logo-bar">
        <div class="logo-icon">
          <span class="icon-svg" v-html="ICONS.class"></span>
        </div>
        <transition name="logo-fade">
          <div v-show="!isCollapsed" class="logo-text">
            <strong>家校任务系统</strong>
            <small>教师管理后台</small>
          </div>
        </transition>
      </div>

      <nav class="menu-list">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          :title="isCollapsed ? item.label : ''"
        >
          <span class="menu-icon" v-html="item.icon"></span>
          <transition name="logo-fade">
            <span v-show="!isCollapsed" class="menu-label">{{ item.label }}</span>
          </transition>
        </router-link>
      </nav>

      <!-- 侧边栏底部：校园卡片 -->
      <div v-show="!isCollapsed" class="sidebar-footer">
        <div class="footer-card">
          <p class="footer-title">家校共育</p>
          <p class="footer-desc">让每一次任务都成为成长的见证</p>
        </div>
      </div>
    </aside>

    <!-- ===================== 右侧主区域 ===================== -->
    <div class="main-right">
      <!-- 顶栏 -->
      <header class="top-header">
        <div class="header-left">
          <button class="icon-btn" title="展开/收起菜单" @click="isCollapsed = !isCollapsed">
            <span class="icon-svg" v-html="ICONS.menu"></span>
          </button>
          <div class="crumb">
            <span class="crumb-parent">教师管理后台</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">{{ currentTitle }}</span>
          </div>
        </div>

        <div class="header-right">
          <!-- 班级切换 -->
          <div v-if="classOptions.length" class="class-switch">
            <span class="switch-label">当前班级</span>
            <select v-model="activeClassId" class="switch-select" @change="handleClassChange">
              <option v-for="cls in classOptions" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </option>
            </select>
          </div>

          <!-- 用户信息 -->
          <div class="user-block" @click="toggleUserMenu">
            <div class="avatar">{{ avatarText }}</div>
            <div class="user-meta">
              <span class="user-name">{{ nickname }}</span>
              <span class="user-role">任课教师</span>
            </div>
            <span class="icon-svg chev" v-html="ICONS.chevronDown"></span>

            <!-- 下拉菜单 -->
            <transition name="dropdown">
              <div v-if="userMenuOpen" class="user-dropdown" @click.stop>
                <div class="dropdown-item" @click="goProfile">
                  <span class="icon-svg" v-html="ICONS.profile"></span>
                  <span>个人中心</span>
                </div>
                <div class="dropdown-item" @click="goClass">
                  <span class="icon-svg" v-html="ICONS.class"></span>
                  <span>班级管理</span>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item danger" @click="handleLogout">
                  <span class="icon-svg" v-html="ICONS.logout"></span>
                  <span>退出登录</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </header>

      <!-- 点击空白处收起下拉 -->
      <div v-if="userMenuOpen" class="menu-mask" @click="userMenuOpen = false"></div>

      <!-- 子页面路由 -->
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ICONS } from '../utils/icons'
import { getClassList } from '../api/request'
import {
  getNickname,
  getCurrentClassId,
  setItem,
  clearSession,
  STORAGE_KEYS
} from '../utils/storage'
import { toast, confirmDialog } from '../utils/notice'

const route = useRoute()
const router = useRouter()

const isCollapsed = ref(false)
const userMenuOpen = ref(false)
const classOptions = ref([])
const nickname = ref(getNickname())

/**
 * 归一化班级 ID。
 * 历史版本可能把 currentClass 存成 { id, name } 对象，
 * 直接绑定到 <select> 会因匹配不到 <option> 而在界面上渲染成 "[object Object]"。
 * 这里统一取出数字/字符串形式的 id。
 */
function normalizeClassId(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'object') return value.id ?? value.classId ?? value.class_id ?? ''
  return value
}

const activeClassId = ref(normalizeClassId(getCurrentClassId()))

const avatarText = computed(() => (nickname.value || '教').charAt(0))
const currentTitle = computed(() => route.meta?.title || '工作台')

const menus = [
  {
    path: '/dashboard',
    label: '数据看板',
    icon: ICONS.dashboard
  },
  {
    path: '/template',
    label: '任务模板',
    icon: ICONS.template
  },
  {
    path: '/batch',
    label: '批量任务',
    icon: ICONS.batch
  },
  {
    path: '/class',
    label: '班级管理',
    icon: ICONS.class
  },
  {
    path: '/family',
    label: '家长管理',
    icon: ICONS.family
  },
  {
    path: '/medal',
    label: '勋章系统',
    icon: ICONS.medal
  },
  {
    path: '/profile',
    label: '个人中心',
    icon: ICONS.profile
  }
]

// 子路由高亮：兼容 /class 及其子路径
const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`)

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

const goProfile = () => {
  userMenuOpen.value = false
  router.push('/profile')
}

const goClass = () => {
  userMenuOpen.value = false
  router.push('/class')
}

async function handleLogout() {
  userMenuOpen.value = false
  const ok = await confirmDialog({
    title: '退出登录',
    content: '确定要退出当前教师账号吗？',
    confirmText: '退出登录',
    danger: true
  })
  if (!ok) return
  clearSession()
  toast.success('已安全退出')
  router.push('/login')
}

async function loadClassOptions() {
  try {
    const res = await getClassList()
    const body = res?.data ?? {}
    const raw = body.data !== undefined ? body.data : body
    const list = Array.isArray(raw) ? raw : raw?.list ?? raw?.records ?? []
    classOptions.value = (Array.isArray(list) ? list : [])
      .map((item) => ({
        id: normalizeClassId(item),
        name: item.name ?? item.className ?? item.class_name ?? '未命名班级'
      }))
      .filter((item) => item.id !== undefined && item.id !== null && item.id !== '')

    // 本地记录的班级若已不在可选项中（如被删除），回退到第一个
    const exists = classOptions.value.some((c) => String(c.id) === String(activeClassId.value))
    if (!exists && classOptions.value.length) {
      activeClassId.value = classOptions.value[0].id
      setItem(STORAGE_KEYS.CURRENT_CLASS, classOptions.value[0].id)
    }
  } catch {
    // 静默失败：顶栏班级切换不可用时不影响主流程
  }
}

function handleClassChange() {
  activeClassId.value = normalizeClassId(activeClassId.value)
  setItem(STORAGE_KEYS.CURRENT_CLASS, activeClassId.value)
  const target = classOptions.value.find((c) => String(c.id) === String(activeClassId.value))
  toast.success(`已切换到 ${target?.name ?? '所选班级'}`)
  // 重新加载当前页面数据
  router.replace({ path: route.path, query: { ...route.query, _t: Date.now() } })
}

onMounted(() => {
  loadClassOptions()
  document.addEventListener('click', () => (userMenuOpen.value = false))
})

onBeforeUnmount(() => {
  document.removeEventListener('click', () => (userMenuOpen.value = false))
})
</script>

<style scoped>
.layout-wrap {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--color-background);
}

/* ===================== 侧边栏 ===================== */
.sidebar {
  display: flex;
  flex-direction: column;
  flex: none;
  width: var(--sidebar-width);
  padding: 16px 12px;
  background: linear-gradient(180deg, #1e1b4b 0%, #312e81 100%);
  transition: width var(--transition-base);
}

.sidebar.collapsed {
  width: var(--sidebar-width-collapsed);
  padding: 16px 10px;
}

.logo-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 20px;
}

.logo-icon {
  flex: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #818cf8, #4f46e5);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
  color: #fff;
}

.logo-icon .icon-svg svg {
  width: 20px;
  height: 20px;
}

.logo-text {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
  overflow: hidden;
}

.logo-text strong {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.logo-text small {
  color: #a5b4fc;
  font-size: 11px;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: var(--radius-md);
  color: #c7d2fe;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.menu-item.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(79, 70, 229, 0.14));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(129, 140, 248, 0.25);
}

.menu-icon {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.menu-label {
  overflow: hidden;
}

.sidebar-footer {
  padding-top: 12px;
}

.footer-card {
  padding: 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.footer-title {
  color: #e0e7ff;
  font-size: 13px;
  font-weight: 600;
}

.footer-desc {
  margin-top: 4px;
  color: #a5b4fc;
  font-size: 11px;
  line-height: 1.55;
}

/* ===================== 右侧主区 ===================== */
.main-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-header {
  position: relative;
  z-index: 20;
  flex: none;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-xs);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.icon-btn:hover {
  background: var(--gray-100);
  color: var(--color-primary);
}

.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.crumb-parent {
  color: var(--color-text-secondary);
}

.crumb-sep {
  color: var(--gray-300);
}

.crumb-current {
  color: var(--color-text);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 班级切换 */
.class-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--gray-50);
}

.switch-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.switch-select {
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  max-width: 150px;
}

/* 用户区 */
.user-block {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.user-block:hover {
  background: var(--gray-100);
}

.avatar {
  width: 34px;
  height: 34px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #818cf8, #4f46e5);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.user-role {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.chev {
  color: var(--gray-400);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 170px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 40;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-regular);
  transition: all var(--transition-fast);
}

.dropdown-item .icon-svg {
  color: var(--color-text-secondary);
}

.dropdown-item:hover {
  background: var(--brand-50);
  color: var(--color-primary);
}

.dropdown-item:hover .icon-svg {
  color: var(--color-primary);
}

.dropdown-item.danger:hover {
  background: #fef2f2;
  color: var(--color-danger);
}

.dropdown-item.danger:hover .icon-svg {
  color: var(--color-danger);
}

.dropdown-divider {
  height: 1px;
  margin: 5px 8px;
  background: var(--color-border-light);
}

.menu-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
}

/* ===================== 动画 ===================== */
.logo-fade-enter-active,
.logo-fade-leave-active {
  transition: opacity 0.18s ease;
}

.logo-fade-enter-from,
.logo-fade-leave-to {
  opacity: 0;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.16s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
