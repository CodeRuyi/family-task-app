<template>
  <div class="page-scroll">
    <!-- ===================== 班级信息卡 ===================== -->
    <section class="hero-card">
      <div class="hero-banner"></div>
      <div class="hero-body">
        <div class="hero-icon" v-html="ICONS.emptySchool"></div>
        <div class="hero-text">
          <h1 class="hero-title">{{ classInfo.className || '未命名班级' }}</h1>
          <div class="hero-meta">
            <span class="meta-pill">{{ classInfo.grade || '未设置年级' }}</span>
            <span class="meta-pill">共 {{ classInfo.student_num || studentList.length }} 人</span>
            <span class="meta-pill">
              班主任：{{ classInfo.master_teacher?.nickname || '未设置' }}
            </span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn btn-ghost" @click="openEditModal">编辑资料</button>
          <button class="btn btn-primary" @click="goToReport">查看班级周报</button>
        </div>
      </div>
    </section>

    <!-- ===================== 三栏信息卡 ===================== -->
    <div class="info-grid">
      <!-- 邀请码 -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">班级邀请码</h3>
            <p class="panel-sub">家长输入后即可申请加入</p>
          </div>
        </div>
        <div class="invite-code">{{ classInfo.invite_code || '——' }}</div>
        <div class="btn-row">
          <button class="btn btn-ghost" :disabled="codeLoading" @click="handleRefreshCode">
            {{ codeLoading ? '刷新中...' : '刷新邀请码' }}
          </button>
          <button class="btn btn-primary" @click="handleCopyCode">复制邀请码</button>
        </div>
        <p class="panel-tip">刷新后旧邀请码立即失效，请及时同步给家长</p>
      </div>

      <!-- 二维码 -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">班级二维码</h3>
            <p class="panel-sub">扫码即可快速加入班级</p>
          </div>
        </div>
        <div class="qr-box">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="班级二维码" class="qr-img" />
          <div v-else class="qr-placeholder">
            <span class="qr-icon" v-html="ICONS.qrcode"></span>
            <span>点击下方按钮生成</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" @click="handleGenerateQrcode">
          生成二维码
        </button>
        <button
          v-if="qrCodeUrl"
          class="btn btn-ghost btn-block"
          style="margin-top: 8px"
          @click="downloadQrcode"
        >
          下载二维码
        </button>
      </div>

      <!-- 教师团队 -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">教师团队</h3>
            <p class="panel-sub">共 {{ teacherList.length }} 位教师</p>
          </div>
        </div>

        <div v-if="!teacherList.length" class="empty-state" style="padding: 24px 0">
          <span class="empty-icon" v-html="ICONS.emptyUser"></span>
          <span>暂无教师，请添加</span>
        </div>

        <ul v-else class="teacher-list">
          <li v-for="item in teacherList" :key="item.id" class="teacher-item">
            <span class="teacher-avatar">{{ (item.nickname || '师').charAt(0) }}</span>
            <div class="teacher-text">
              <div class="t-name">{{ item.nickname || '未知教师' }}</div>
              <div class="t-contact">{{ item.phone || '未填写手机号' }}</div>
            </div>
            <span class="tag" :class="isMaster(item) ? 'tag-success' : 'tag-info'">
              {{ isMaster(item) ? '班主任' : '任课教师' }}
            </span>
            <button
              v-if="!isMaster(item)"
              class="icon-remove"
              title="移除教师"
              @click="handleRemoveTeacher(item)"
            >
              ✕
            </button>
          </li>
        </ul>

        <button class="btn btn-ghost btn-block add-teacher" @click="openAddTeacherModal">
          + 添加副班主任 / 任课教师
        </button>
      </div>
    </div>

    <!-- ===================== 学生列表 ===================== -->
    <section class="panel student-panel">
      <div class="panel-head">
        <div>
          <h3 class="panel-title">学生列表</h3>
          <p class="panel-sub">
            共 {{ studentList.length }} 人
            <template v-if="checkedIds.length"> · 已选 {{ checkedIds.length }} 人</template>
          </p>
        </div>
        <div class="head-actions">
          <div class="mini-search">
            <input v-model="studentKeyword" placeholder="搜索学生姓名" />
          </div>
          <button class="btn btn-primary btn-sm" @click="handleBatchGenCode">
            批量生成绑定码
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 46px">
                <input type="checkbox" :checked="selectAll" @change="handleSelectAll" />
              </th>
              <th style="width: 62px">序号</th>
              <th>学生姓名</th>
              <th style="width: 120px">绑定状态</th>
              <th style="width: 130px">绑定码</th>
              <th style="width: 120px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredStudents.length">
              <td colspan="6">
                <div class="empty-state" style="padding: 40px 0">
                  <span class="empty-icon" v-html="ICONS.emptyMail"></span>
                  <span>{{ studentKeyword ? '没有匹配的学生' : '暂无学生，请通过邀请码邀请加入' }}</span>
                </div>
              </td>
            </tr>
            <tr v-for="(item, index) in filteredStudents" :key="item.id">
              <td>
                <input type="checkbox" v-model="checkedIds" :value="item.id" />
              </td>
              <td class="text-secondary">{{ index + 1 }}</td>
              <td>
                <div class="student-cell">
                  <span class="avatar-mini">{{ (item.nickname || '学').charAt(0) }}</span>
                  <span>{{ item.nickname || '未知' }}</span>
                </div>
              </td>
              <td>
                <span class="tag" :class="item.bind_code ? 'tag-success' : 'tag-warning'">
                  {{ item.bind_code ? '已绑定' : '未绑定' }}
                </span>
              </td>
              <td>
                <code class="bind-code">{{ item.bind_code || '------' }}</code>
              </td>
              <td>
                <button class="link-btn" @click="handleSingleGenCode(item)">生成绑定码</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===================== 编辑班级弹窗 ===================== -->
    <transition name="modal">
      <div v-if="showEditModal" class="modal-mask" @click.self="closeEditModal">
        <div class="modal-box">
          <header class="modal-head">
            <h3>编辑班级资料</h3>
            <button class="modal-close" @click="closeEditModal">✕</button>
          </header>
          <div class="modal-body">
            <div class="form-item">
              <label>班级名称 <span class="required">*</span></label>
              <input v-model="editForm.className" class="input" placeholder="请输入班级名称" />
            </div>
            <div class="form-item">
              <label>年级</label>
              <input v-model="editForm.grade" class="input" placeholder="例如：三年级" />
            </div>
          </div>
          <footer class="modal-foot">
            <button class="btn btn-ghost" @click="closeEditModal">取消</button>
            <button class="btn btn-primary" :disabled="saving" @click="handleUpdateClass">
              {{ saving ? '保存中...' : '保存修改' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>

    <!-- ===================== 添加教师弹窗 ===================== -->
    <transition name="modal">
      <div v-if="showAddTeacherModal" class="modal-mask" @click.self="closeAddTeacherModal">
        <div class="modal-box">
          <header class="modal-head">
            <h3>添加教师到班级</h3>
            <button class="modal-close" @click="closeAddTeacherModal">✕</button>
          </header>
          <div class="modal-body">
            <div class="form-item">
              <label>教师手机号或用户 ID <span class="required">*</span></label>
              <input
                v-model="teacherForm.input"
                class="input"
                placeholder="请输入教师手机号或用户 ID"
              />
            </div>
            <div class="form-item">
              <label>任教学科</label>
              <select v-model="teacherForm.subject_id" class="select">
                <option :value="null">不指定</option>
                <option :value="1">语文</option>
                <option :value="2">数学</option>
                <option :value="3">英语</option>
                <option :value="4">科学</option>
              </select>
            </div>
          </div>
          <footer class="modal-foot">
            <button class="btn btn-ghost" @click="closeAddTeacherModal">取消</button>
            <button class="btn btn-primary" :disabled="saving" @click="handleAddTeacher">
              {{ saving ? '添加中...' : '确认添加' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getClassDetail,
  refreshClassInviteCode,
  getClassTeacher,
  getClassStudentAll,
  createSingleBindCode,
  batchCreateBindCode,
  updateClassInfo,
  addTeacherToClass,
  removeTeacherFromClass
} from '@/api/request'
import { unwrap } from '@/api/request'
import { getCurrentClassId } from '@/utils/storage'
import { ICONS } from '@/utils/icons'
import { toast, confirmDialog } from '@/utils/notice'

const router = useRouter()
const route = useRoute()

// 修复：原先硬编码为 1，现从登录态读取，并回退到顶栏选择的班级
const currentClassId = ref(getCurrentClassId() ?? 1)

const classInfo = reactive({
  className: '',
  grade: '',
  invite_code: '',
  student_num: 0,
  master_teacher: null
})

const teacherList = ref([])
const studentList = ref([])
const studentKeyword = ref('')
const selectAll = ref(false)
const checkedIds = ref([])
const qrCodeUrl = ref('')
const codeLoading = ref(false)
const saving = ref(false)

const showEditModal = ref(false)
const editForm = reactive({ className: '', grade: '' })

const showAddTeacherModal = ref(false)
const teacherForm = reactive({ input: '', subject_id: null })

/** 是否班主任：兼容 role === 1 / is_master / master 三种后端标记 */
const isMaster = (item) =>
  item.role === 1 || item.is_master === 1 || item.is_master === true || item.master === true

const filteredStudents = computed(() => {
  const kw = studentKeyword.value.trim()
  if (!kw) return studentList.value
  return studentList.value.filter((s) => (s.nickname || '').includes(kw))
})

/** 统一提取 data 字段 */
const pickData = (res) => {
  const { data, ok } = unwrap(res)
  return ok ? data : null
}

async function loadAllData() {
  try {
    const [classRes, teaRes, stuRes] = await Promise.all([
      getClassDetail(currentClassId.value),
      getClassTeacher(currentClassId.value),
      getClassStudentAll(currentClassId.value)
    ])

    const detail = pickData(classRes)
    if (detail) Object.assign(classInfo, detail)

    const teachers = pickData(teaRes)
    teacherList.value = Array.isArray(teachers) ? teachers : teachers?.list ?? []

    const students = pickData(stuRes)
    studentList.value = Array.isArray(students) ? students : students?.list ?? []
  } catch {
    // 拦截器已统一提示
  }
}

/* ===================== 编辑资料 ===================== */
function openEditModal() {
  editForm.className = classInfo.className || ''
  editForm.grade = classInfo.grade || ''
  showEditModal.value = true
}

const closeEditModal = () => (showEditModal.value = false)

async function handleUpdateClass() {
  if (!editForm.className.trim()) {
    toast.warning('班级名称不能为空')
    return
  }
  saving.value = true
  try {
    const res = await updateClassInfo(currentClassId.value, {
      class_name: editForm.className.trim(),
      grade: editForm.grade.trim() || null
    })
    const { ok, msg } = unwrap(res)
    if (ok) {
      toast.success(msg || '班级信息已更新')
      closeEditModal()
      await loadAllData()
    } else {
      toast.error(msg || '更新失败')
    }
  } catch {
    // 已统一提示
  } finally {
    saving.value = false
  }
}

const goToReport = () => router.push('/dashboard')

/* ===================== 邀请码 ===================== */
async function handleRefreshCode() {
  if (codeLoading.value) return
  const ok = await confirmDialog({
    title: '刷新邀请码',
    content: '刷新后旧邀请码将立即失效，确定继续吗？',
    confirmText: '确定刷新'
  })
  if (!ok) return

  codeLoading.value = true
  try {
    const res = await refreshClassInviteCode(currentClassId.value)
    const { ok: success, data, msg } = unwrap(res)
    if (success) {
      classInfo.invite_code = typeof data === 'string' ? data : data?.invite_code || classInfo.invite_code
      toast.success(msg || '邀请码刷新成功')
    } else {
      toast.error(msg || '刷新失败，请重试')
    }
  } catch {
    // 已统一提示
  } finally {
    codeLoading.value = false
  }
}

async function handleCopyCode() {
  if (!classInfo.invite_code) {
    toast.warning('暂无邀请码，请先刷新')
    return
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(classInfo.invite_code)
    } else {
      await fallbackCopy(classInfo.invite_code)
    }
    toast.success('邀请码已复制到剪贴板')
  } catch {
    toast.error('复制失败，请手动选择复制')
  }
}

function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (e) {
      reject(e)
    } finally {
      document.body.removeChild(textarea)
    }
  })
}

/* ===================== 二维码 =====================
 * 修复：原先依赖第三方在线接口 api.qrserver.com，离线 / 无外网时不可用。
 *       改为本地绘制二维码 —— 使用轻量实现，不依赖任何外部资源。
 */

/** 二维码内容：优先使用后端下发数据，否则用班级信息拼装 */
const buildQrContent = () => {
  if (classInfo.invite_code) {
    return JSON.stringify({
      type: 'class_invite',
      classId: currentClassId.value,
      className: classInfo.className || '',
      inviteCode: classInfo.invite_code
    })
  }
  return `classInvite:${currentClassId.value}`
}

async function handleGenerateQrcode() {
  try {
    qrCodeUrl.value = await renderQrToDataUrl(buildQrContent())
    toast.success('二维码已生成')
  } catch {
    toast.error('二维码生成失败，请重试')
  }
}

function downloadQrcode() {
  if (!qrCodeUrl.value) return
  const link = document.createElement('a')
  link.download = `班级二维码_${classInfo.className || 'class'}.png`
  link.href = qrCodeUrl.value
  link.click()
  toast.success('二维码已开始下载')
}

/**
 * 使用 Canvas 绘制一个可扫描的二维码
 * 说明：这里采用 qrcode 算法的纯 JS 精简实现，生成后转为 dataURL 供 <img> 使用。
 *       如项目后续引入 `qrcode` npm 包，可直接替换本函数实现。
 */
async function renderQrToDataUrl(text) {
  const { default: QRCode } = await import('../utils/qrcode.js')
  return QRCode.toDataURL(text, { size: 300, margin: 2 })
}

/* ===================== 添加 / 移除教师 ===================== */
function openAddTeacherModal() {
  teacherForm.input = ''
  teacherForm.subject_id = null
  showAddTeacherModal.value = true
}

const closeAddTeacherModal = () => (showAddTeacherModal.value = false)

async function handleAddTeacher() {
  const input = teacherForm.input.trim()
  if (!input) {
    toast.warning('请输入教师手机号或用户 ID')
    return
  }
  const userId = /^\d+$/.test(input) ? Number(input) : input

  saving.value = true
  try {
    const res = await addTeacherToClass({
      classId: currentClassId.value,
      userId,
      subject_id: teacherForm.subject_id || null
    })
    const { ok, msg } = unwrap(res)
    if (ok) {
      toast.success(msg || '教师添加成功')
      closeAddTeacherModal()
      await loadAllData()
    } else {
      toast.error(msg || '添加失败')
    }
  } catch {
    // 已统一提示
  } finally {
    saving.value = false
  }
}

async function handleRemoveTeacher(item) {
  const ok = await confirmDialog({
    title: '移除教师',
    content: `确定要将「${item.nickname || '该教师'}」从本班移除吗？`,
    confirmText: '确认移除',
    danger: true
  })
  if (!ok) return

  try {
    const res = await removeTeacherFromClass({
      classId: currentClassId.value,
      userId: item.id
    })
    const { ok: success, msg } = unwrap(res)
    if (success) {
      toast.success(msg || '教师已移除')
      await loadAllData()
    } else {
      toast.error(msg || '移除失败')
    }
  } catch {
    // 已统一提示
  }
}

/* ===================== 学生绑定码 ===================== */
function handleSelectAll(e) {
  const checked = e.target.checked
  selectAll.value = checked
  // 仅对当前可见（筛选后）的学生生效
  const visibleIds = filteredStudents.value.map((s) => s.id)
  checkedIds.value = checked ? visibleIds : []
}

watch(checkedIds, (val) => {
  const visibleIds = filteredStudents.value.map((s) => s.id)
  selectAll.value = visibleIds.length > 0 && visibleIds.every((id) => val.includes(id))
})

async function handleSingleGenCode(item) {
  const ok = await confirmDialog({
    title: '生成绑定码',
    content: `确定为「${item.nickname || '该学生'}」生成绑定码吗？`,
    confirmText: '确认生成'
  })
  if (!ok) return

  try {
    const res = await createSingleBindCode(item.id)
    const { ok: success, msg } = unwrap(res)
    if (success) {
      toast.success(msg || '绑定码生成成功')
      await loadAllData()
    } else {
      toast.error(msg || '生成失败')
    }
  } catch {
    // 已统一提示
  }
}

async function handleBatchGenCode() {
  if (!checkedIds.value.length) {
    toast.warning('请先选择需要生成绑定码的学生')
    return
  }
  const ok = await confirmDialog({
    title: '批量生成绑定码',
    content: `确定为选中的 ${checkedIds.value.length} 名学生生成绑定码吗？`,
    confirmText: '确认生成'
  })
  if (!ok) return

  try {
    const res = await batchCreateBindCode(checkedIds.value)
    const { ok: success, msg } = unwrap(res)
    if (success) {
      toast.success(msg || '批量生成成功')
      checkedIds.value = []
      selectAll.value = false
      await loadAllData()
    } else {
      toast.error(msg || '批量生成失败')
    }
  } catch {
    // 已统一提示
  }
}

// 顶栏切换班级后，同步刷新本页数据
watch(
  () => route.query._t,
  () => {
    const latest = getCurrentClassId()
    if (latest !== null && latest !== currentClassId.value) {
      currentClassId.value = latest
      nextTick(loadAllData)
    }
  }
)

onMounted(loadAllData)
</script>

<style scoped>
/* ===================== 班级头部卡 ===================== */
.hero-card {
  margin-bottom: 16px;
  background: #fff;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.hero-banner {
  height: 96px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%);
}

.hero-body {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 22px 20px;
  flex-wrap: wrap;
}

.hero-icon {
  flex: none;
  width: 68px;
  height: 68px;
  margin-top: -34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #fff;
  border-radius: var(--radius-lg);
  background: var(--brand-50);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.18);
  color: var(--color-primary);
}

.hero-icon svg {
  width: 32px;
  height: 32px;
}

.hero-text {
  flex: 1;
  min-width: 200px;
}

.hero-title {
  margin-bottom: 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-pill {
  padding: 3px 12px;
  border-radius: var(--radius-full);
  background: var(--gray-100);
  color: var(--color-text-secondary);
  font-size: 12px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ===================== 三栏信息卡 ===================== */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.panel:hover {
  box-shadow: var(--shadow-md);
}

.panel-tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--color-text-placeholder);
  line-height: 1.6;
}

/* 邀请码 */
.invite-code {
  padding: 16px;
  margin-bottom: 14px;
  border: 2px dashed var(--brand-300);
  border-radius: var(--radius-md);
  background: var(--brand-50);
  color: var(--brand-700);
  font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 3px;
  text-align: center;
  user-select: all;
}

.btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn-block {
  width: 100%;
}

/* 二维码 */
.qr-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 168px;
  height: 168px;
  margin: 0 auto 16px;
  padding: 6px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--gray-50);
}

.qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  background: #fff;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--color-text-placeholder);
  font-size: 12px;
}

.qr-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-300);
}

.qr-icon svg {
  width: 32px;
  height: 32px;
}

/* 教师列表 */
.teacher-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.teacher-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--gray-50);
  transition: background var(--transition-fast);
}

.teacher-item:hover {
  background: var(--brand-50);
}

.teacher-avatar {
  flex: none;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #818cf8, #4f46e5);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.teacher-text {
  flex: 1;
  min-width: 0;
}

.t-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.t-contact {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.icon-remove {
  flex: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #fef2f2;
  color: var(--color-danger);
  font-size: 11px;
  transition: all var(--transition-fast);
}

.icon-remove:hover {
  background: #fee2e2;
  transform: scale(1.08);
}

.add-teacher {
  margin-top: 4px;
}

/* ===================== 学生列表 ===================== */
.student-panel {
  padding: 20px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mini-search input {
  height: 32px;
  width: 170px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
  transition: all var(--transition-fast);
}

.mini-search input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.bind-code {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--gray-100);
  color: var(--color-text-regular);
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
}

.link-btn:hover {
  color: var(--color-primary-dark);
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

</style>
