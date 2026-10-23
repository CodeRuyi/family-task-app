<template>
  <div class="page-scroll">
    <header class="page-header">
      <div>
        <h1 class="page-title">个人中心</h1>
        <p class="page-subtitle">管理你的账号信息与安全设置</p>
      </div>
    </header>

    <div class="profile-grid">
      <!-- ===================== 左列 ===================== -->
      <div class="left-col">
        <!-- 基础信息 -->
        <section class="panel">
          <div class="panel-head">
            <div>
              <h3 class="panel-title">基础信息</h3>
              <p class="panel-sub">这些信息会展示给家长与学生</p>
            </div>
            <span class="tag tag-success">{{ roleLabel }}</span>
          </div>

          <!-- 头像 -->
          <div class="avatar-row">
            <div class="avatar" :style="avatarStyle">
              <span v-if="!userInfo.avatar">{{ initial }}</span>
            </div>
            <div class="avatar-desc">
              <div class="avatar-actions">
                <button class="btn btn-ghost btn-sm" @click="triggerAvatarPick">更换头像</button>
                <button
                  v-if="userInfo.avatar"
                  class="btn btn-ghost btn-sm"
                  @click="removeAvatar"
                >
                  移除
                </button>
              </div>
              <p class="tip-text">支持 JPG / PNG，建议 200×200px，大小不超过 2MB</p>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/png,image/jpeg"
                class="hidden-input"
                @change="handleAvatarChange"
              />
            </div>
          </div>

          <!-- 表单 -->
          <div class="form-grid">
            <div class="form-item">
              <label>姓名</label>
              <input
                v-model="editForm.nickname"
                class="input"
                placeholder="请输入姓名"
                :disabled="!isEditing"
              />
            </div>
            <div class="form-item">
              <label>手机号</label>
              <input
                v-model="editForm.phone"
                class="input"
                maxlength="11"
                placeholder="请输入手机号"
                :disabled="!isEditing"
              />
            </div>
            <div class="form-item full">
              <label>邮箱</label>
              <input
                v-model="editForm.email"
                class="input"
                type="email"
                placeholder="请输入邮箱"
                :disabled="!isEditing"
              />
            </div>
          </div>

          <div class="btn-wrap">
            <template v-if="!isEditing">
              <button class="btn btn-primary" @click="toggleEdit">修改资料</button>
            </template>
            <template v-else>
              <button class="btn btn-ghost" @click="cancelEdit">取消</button>
              <button class="btn btn-primary" :disabled="saving" @click="handleSave">
                {{ saving ? '保存中...' : '保存修改' }}
              </button>
            </template>
          </div>
        </section>

        <!-- 安全设置 -->
        <section class="panel">
          <div class="panel-head">
            <div>
              <h3 class="panel-title">安全设置</h3>
              <p class="panel-sub">保障账号安全</p>
            </div>
          </div>

          <div class="safe-item">
            <div class="safe-text">
              <div class="safe-title">修改登录密码</div>
              <div class="safe-tip">建议定期更换密码以保障账号安全</div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="openPasswordModal">修改</button>
          </div>
        </section>
      </div>

      <!-- ===================== 右列 ===================== -->
      <div class="right-col">
        <!-- 概览卡 -->
        <section class="panel overview-card">
          <div class="overview-avatar" :style="avatarStyle">
            <span v-if="!userInfo.avatar">{{ initial }}</span>
          </div>
          <h3 class="overview-name">{{ userInfo.nickname || '教师' }}</h3>
          <p class="overview-desc">{{ roleLabel }} · 已加入 {{ daysCount }} 天</p>

          <div class="overview-stats">
            <div class="ov-item">
              <div class="ov-num">{{ taskCount }}</div>
              <div class="ov-label">累计下发任务</div>
            </div>
            <div class="ov-item">
              <div class="ov-num accent">{{ medalCount }}</div>
              <div class="ov-label">累计颁发勋章</div>
            </div>
          </div>
        </section>

        <button class="logout-btn" @click="handleLogout">退出当前登录</button>
      </div>
    </div>

    <!-- ===================== 修改密码弹窗 ===================== -->
    <transition name="modal">
      <div v-if="showPasswordModal" class="modal-mask" @click.self="closePasswordModal">
        <div class="modal-box">
          <header class="modal-head">
            <h3>修改密码</h3>
            <button class="modal-close" @click="closePasswordModal">✕</button>
          </header>

          <div class="modal-body">
            <div class="form-item">
              <label>当前密码 <span class="required">*</span></label>
              <input
                v-model="passwordForm.oldPassword"
                class="input"
                type="password"
                autocomplete="current-password"
                placeholder="请输入当前密码"
              />
            </div>
            <div class="form-item">
              <label>新密码 <span class="required">*</span></label>
              <input
                v-model="passwordForm.newPassword"
                class="input"
                type="password"
                autocomplete="new-password"
                placeholder="至少 6 位"
              />
            </div>
            <div class="form-item">
              <label>确认新密码 <span class="required">*</span></label>
              <input
                v-model="passwordForm.confirmPassword"
                class="input"
                type="password"
                autocomplete="new-password"
                placeholder="请再次输入新密码"
              />
            </div>
          </div>

          <footer class="modal-foot">
            <button class="btn btn-ghost" @click="closePasswordModal">取消</button>
            <button class="btn btn-primary" :disabled="pwdLoading" @click="handleChangePassword">
              {{ pwdLoading ? '提交中...' : '确认修改' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserProfile, updateUserProfile, updatePassword } from '@/api/request'
import { getDashboardData, getMedalRecordList } from '@/api/request'
import { unwrap } from '@/api/request'
import {
  getUserId,
  getUserInfo,
  getCurrentClassId,
  setItem,
  clearSession,
  STORAGE_KEYS
} from '@/utils/storage'
import { toast, confirmDialog } from '@/utils/notice'

const router = useRouter()

const userId = ref(getUserId() ?? 1)
const cachedInfo = getUserInfo() ?? {}

const userInfo = reactive({
  id: cachedInfo.id ?? null,
  nickname: cachedInfo.nickname ?? '',
  phone: cachedInfo.phone ?? '',
  email: cachedInfo.email ?? '',
  role: cachedInfo.role ?? 1,
  avatar: cachedInfo.avatar ?? '',
  created_at: cachedInfo.created_at ?? null
})

const isEditing = ref(false)
const saving = ref(false)
const fileInputRef = ref(null)

const editForm = reactive({
  nickname: userInfo.nickname,
  phone: userInfo.phone,
  email: userInfo.email
})

const backupData = reactive({ ...editForm })

// 修复：原先为写死的假数据（1250 / 86 / 328），现改为接口真实数据
const taskCount = ref(0)
const medalCount = ref(0)

/** 加入天数：优先按注册时间计算，无注册时间时回退到本地首次登录记录 */
const daysCount = computed(() => {
  const start = userInfo.created_at ? new Date(userInfo.created_at) : getFirstLoginDate()
  if (!start || Number.isNaN(start.getTime())) return 1
  const diff = Date.now() - start.getTime()
  return Math.max(1, Math.floor(diff / 86400000) + 1)
})

const initial = computed(() => (userInfo.nickname || '师').charAt(0))

const avatarStyle = computed(() =>
  userInfo.avatar ? { backgroundImage: `url(${userInfo.avatar})` } : {}
)

const roleLabel = computed(() => {
  const map = { 1: '教师', 3: '管理员', 5: '任课教师' }
  return map[userInfo.role] || '用户'
})

/** 首次登录时间戳（存在本地，用于计算加入天数） */
function getFirstLoginDate() {
  const key = 'firstLoginAt'
  const saved = localStorage.getItem(key)
  if (saved) return new Date(Number(saved))
  const now = Date.now()
  localStorage.setItem(key, String(now))
  return new Date(now)
}

/* ===================== 加载资料 ===================== */
async function loadUserInfo() {
  try {
    const res = await getUserProfile(userId.value)
    const data = unwrap(res).data
    if (!data) return

    const next = {
      id: data.id ?? userId.value,
      nickname: data.nickname ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      role: data.role ?? 1,
      avatar: data.avatar ?? '',
      created_at: data.created_at ?? data.createdAt ?? null
    }
    Object.assign(userInfo, next)
    Object.assign(editForm, { nickname: next.nickname, phone: next.phone, email: next.email })
    Object.assign(backupData, { nickname: next.nickname, phone: next.phone, email: next.email })
    setItem(STORAGE_KEYS.USER_INFO, next)
  } catch {
    // 已有缓存，静默降级
  }
}

/** 拉取真实统计：任务数取看板，勋章数取发放记录总数 */
async function loadStats() {
  const classId = getCurrentClassId()
  try {
    const [dashRes, medalRes] = await Promise.all([
      getDashboardData(classId),
      getMedalRecordList({ classId, page: 1, pageSize: 1 })
    ])

    const dash = unwrap(dashRes).data
    if (dash) taskCount.value = dash.totalTask ?? 0

    const medal = unwrap(medalRes).data
    medalCount.value = medal?.total ?? medal?.count ?? 0
  } catch {
    // 统计失败不影响页面主体
  }
}

/* ===================== 编辑资料 ===================== */
const toggleEdit = () => (isEditing.value = true)

function cancelEdit() {
  Object.assign(editForm, backupData)
  isEditing.value = false
}

async function handleSave() {
  if (!editForm.nickname?.trim()) {
    toast.warning('姓名不能为空')
    return
  }
  if (editForm.phone && !/^1[3-9]\d{9}$/.test(editForm.phone)) {
    toast.warning('手机号格式不正确')
    return
  }
  if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
    toast.warning('邮箱格式不正确')
    return
  }

  saving.value = true
  try {
    const res = await updateUserProfile({
      userId: userId.value,
      nickname: editForm.nickname.trim(),
      phone: editForm.phone,
      email: editForm.email
    })
    const { ok, msg } = unwrap(res)
    if (ok) {
      toast.success(msg || '资料更新成功')
      Object.assign(userInfo, { ...editForm })
      Object.assign(backupData, { ...editForm })
      setItem(STORAGE_KEYS.USER_INFO, { ...userInfo })
      isEditing.value = false
    } else {
      toast.error(msg || '更新失败')
    }
  } catch {
    // 已统一提示
  } finally {
    saving.value = false
  }
}

/* ===================== 头像 ===================== */
const triggerAvatarPick = () => fileInputRef.value?.click()

function handleAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    toast.warning('图片大小不能超过 2MB')
    e.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    userInfo.avatar = String(reader.result)
    setItem(STORAGE_KEYS.USER_INFO, { ...userInfo })
    toast.success('头像已更新（本地预览）')
  }
  reader.onerror = () => toast.error('头像读取失败，请重试')
  reader.readAsDataURL(file)
  e.target.value = ''
}

function removeAvatar() {
  userInfo.avatar = ''
  setItem(STORAGE_KEYS.USER_INFO, { ...userInfo })
  toast.success('头像已移除')
}

/* ===================== 修改密码 ===================== */
const showPasswordModal = ref(false)
const pwdLoading = ref(false)
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

function openPasswordModal() {
  Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
  showPasswordModal.value = true
}

const closePasswordModal = () => (showPasswordModal.value = false)

async function handleChangePassword() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm
  if (!oldPassword) {
    toast.warning('请输入当前密码')
    return
  }
  if (newPassword.length < 6) {
    toast.warning('新密码至少 6 位')
    return
  }
  if (newPassword !== confirmPassword) {
    toast.warning('两次输入的新密码不一致')
    return
  }
  if (newPassword === oldPassword) {
    toast.warning('新密码不能与当前密码相同')
    return
  }

  pwdLoading.value = true
  try {
    const res = await updatePassword({
      userId: userId.value,
      oldPassword,
      newPassword
    })
    const { ok, msg } = unwrap(res)
    if (ok) {
      toast.success(msg || '密码修改成功，请重新登录')
      closePasswordModal()
      // 修复：原实现漏清 token，导致路由守卫仍认为已登录
      clearSession()
      setTimeout(() => router.push('/login'), 800)
    } else {
      toast.error(msg || '修改失败')
    }
  } catch {
    // 已统一提示
  } finally {
    pwdLoading.value = false
  }
}

/* ===================== 退出登录 ===================== */
async function handleLogout() {
  const ok = await confirmDialog({
    title: '退出登录',
    content: '确定要退出当前教师账号吗？',
    confirmText: '退出登录',
    danger: true
  })
  if (!ok) return
  // 修复：必须清理 token，否则登录态残留
  clearSession()
  toast.success('已安全退出')
  router.push('/login')
}

onMounted(() => {
  loadUserInfo()
  loadStats()
})
</script>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===================== 面板 ===================== */
/* ===================== 头像 ===================== */
.avatar-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.avatar {
  flex: none;
  width: 78px;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #34d399, #16a34a);
  background-size: cover;
  background-position: center;
  color: #fff;
  font-size: 30px;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.25);
}

.avatar-desc {
  min-width: 0;
}

.avatar-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 7px;
}

.tip-text {
  font-size: 12px;
  color: var(--color-text-placeholder);
  line-height: 1.6;
}

.hidden-input {
  display: none;
}

/* ===================== 表单 ===================== */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-item.full {
  grid-column: 1 / -1;
}

.input:disabled {
  background: var(--gray-50);
  color: var(--color-text-regular);
  cursor: not-allowed;
}

.btn-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}

/* ===================== 安全设置 ===================== */
.safe-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: var(--gray-50);
}

.safe-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.safe-tip {
  margin-top: 3px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ===================== 概览卡 ===================== */
.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.overview-avatar {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #34d399, #16a34a);
  background-size: cover;
  background-position: center;
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 12px;
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.22);
}

.overview-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
}

.overview-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.overview-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border-light);
}

.ov-item {
  padding: 12px 6px;
  border-radius: var(--radius-md);
  background: var(--gray-50);
}

.ov-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.ov-num.accent {
  color: var(--color-primary);
}

.ov-label {
  margin-top: 3px;
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* ===================== 退出按钮 ===================== */
.logout-btn {
  width: 100%;
  height: 44px;
  border: 1px solid #fecaca;
  border-radius: var(--radius-lg);
  background: #fff;
  color: var(--color-danger);
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.logout-btn:hover {
  background: #fef2f2;
  border-color: var(--color-danger);
}

/* ===================== 弹窗 ===================== */
@keyframes modal-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===================== 响应式 ===================== */
@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
