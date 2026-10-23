<template>
  <div class="page-scroll batch-page">
    <!-- ===================== 页头 ===================== -->
    <header class="page-header">
      <div>
        <h1 class="page-title">批量下发任务</h1>
        <p class="page-subtitle">选择模板 → 选择学生 → 设置参数 → 确认下发</p>
      </div>
      <div class="class-picker">
        <label>下发班级</label>
        <select v-model="selectedClass" class="select" @change="handleClassChange">
          <option value="" disabled>请选择班级</option>
          <option v-for="cls in classList" :key="cls.id" :value="cls.id">
            {{ cls.className }}
          </option>
        </select>
        <span class="student-count">共 {{ studentTotal }} 人</span>
      </div>
    </header>

    <!-- ===================== 步骤条 ===================== -->
    <div class="stepper">
      <div
        v-for="(step, index) in steps"
        :key="step.label"
        class="step"
        :class="{ done: currentStep > index, active: currentStep === index }"
      >
        <span class="step-dot">
          <template v-if="currentStep > index">✓</template>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="step-text">{{ step.label }}</span>
      </div>
      <div class="step-track">
        <div class="step-progress" :style="{ width: `${(currentStep / (steps.length - 1)) * 100}%` }"></div>
      </div>
    </div>

    <!-- ===================== 主内容 ===================== -->
    <section class="panel step-panel">
      <!-- 第一步：选择模板 -->
      <template v-if="currentStep === 0">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">选择任务模板</h3>
            <p class="panel-sub">点击卡片选择要下发的任务模板</p>
          </div>
          <span class="panel-badge">{{ templates.length }} 个可用模板</span>
        </div>

        <div v-if="!templates.length" class="empty-state">
          <span class="empty-icon" v-html="ICONS.emptyTemplate"></span>
          <span>暂无任务模板，请先前往「任务模板」创建</span>
        </div>

        <div v-else class="template-grid">
          <div
            v-for="tpl in templates"
            :key="tpl.id"
            class="tpl-card"
            :class="{ selected: selectedTemplate === tpl.id }"
            @click="selectTemplate(tpl)"
          >
            <div class="tpl-top">
              <span class="tag tag-info">{{ tpl.category || '未分类' }}</span>
              <span class="tpl-points">
                +{{ tpl.min_points ?? tpl.min_score ?? 0 }} 分
              </span>
            </div>
            <h4 class="tpl-name">{{ tpl.name }}</h4>
            <p class="tpl-desc">{{ tpl.description || '暂无描述' }}</p>
            <span v-if="selectedTemplate === tpl.id" class="tpl-check">✓</span>
          </div>
        </div>
      </template>

      <!-- 第二步：选择学生 -->
      <template v-else-if="currentStep === 1">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">选择下发对象</h3>
            <p class="panel-sub">已选 {{ selectedStudents.length }} / {{ studentTotal }} 人</p>
          </div>
          <div class="bulk-actions">
            <button class="btn btn-ghost btn-sm" @click="selectAllStudents(true)">全选</button>
            <button class="btn btn-ghost btn-sm" @click="selectAllStudents(false)">清空</button>
          </div>
        </div>

        <div v-if="!students.length" class="empty-state">
          <span class="empty-icon" v-html="ICONS.emptyStudent"></span>
          <span>当前班级暂无学生</span>
        </div>

        <div v-else class="student-grid">
          <label
            v-for="stu in students"
            :key="stu.student_id"
            class="student-chip"
            :class="{ selected: selectedStudents.includes(stu.student_id) }"
          >
            <input
              type="checkbox"
              :checked="selectedStudents.includes(stu.student_id)"
              @change="toggleStudent(stu.student_id)"
            />
            <span class="chip-avatar">{{ (stu.student_name || '学').charAt(0) }}</span>
            <span class="chip-name">{{ stu.student_name }}</span>
          </label>
        </div>
      </template>

      <!-- 第三步：设置参数 -->
      <template v-else-if="currentStep === 2">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">设置任务参数</h3>
            <p class="panel-sub">这些参数会随任务一起下发给学生</p>
          </div>
        </div>

        <div class="params-form">
          <div class="form-item">
            <label>任务名称 <span class="required">*</span></label>
            <input v-model="taskParams.name" class="input" placeholder="请输入任务名称" />
          </div>
          <div class="form-item">
            <label>任务积分 <span class="required">*</span></label>
            <input v-model.number="taskParams.points" class="input" type="number" min="0" />
          </div>
          <div class="form-item">
            <label>开始时间 <span class="required">*</span></label>
            <input v-model="taskParams.startTime" class="input" type="datetime-local" />
          </div>
          <div class="form-item">
            <label>截止时间 <span class="required">*</span></label>
            <input v-model="taskParams.endTime" class="input" type="datetime-local" />
          </div>
          <div class="form-item full-row">
            <label>任务说明</label>
            <textarea
              v-model="taskParams.description"
              class="textarea"
              placeholder="补充说明任务要求，可留空"
            ></textarea>
          </div>
        </div>
      </template>

      <!-- 第四步：确认下发 -->
      <template v-else>
        <div class="panel-head">
          <div>
            <h3 class="panel-title">确认下发信息</h3>
            <p class="panel-sub">请核对以下信息，确认后将立即推送给学生</p>
          </div>
        </div>

        <dl class="confirm-list">
          <div v-for="row in confirmRows" :key="row.label" class="confirm-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>

        <div class="warn-box">
          <span class="warn-icon">!</span>
          <span>下发后任务将立即推送至学生手表端，且不可批量撤回，请务必核对信息。</span>
        </div>
      </template>

      <!-- 底部操作 -->
      <footer class="step-footer">
        <button v-if="currentStep > 0" class="btn btn-ghost" @click="prevStep">
          ← 上一步
        </button>
        <div class="footer-right">
          <button
            v-if="currentStep === steps.length - 1"
            class="btn btn-primary"
            :disabled="submitting"
            @click="confirmSubmit"
          >
            {{ submitting ? '下发中...' : '确认下发任务' }}
          </button>
          <button
            v-else
            class="btn btn-primary"
            :disabled="!canProceed"
            @click="nextStep"
          >
            下一步 →
          </button>
        </div>
      </footer>
    </section>

    <!-- ===================== 下发记录 ===================== -->
    <section class="panel history-panel">
      <div class="panel-head">
        <div>
          <h3 class="panel-title">批量下发记录</h3>
          <p class="panel-sub">共 {{ historyRecords.length }} 条记录</p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="loadHistoryData">刷新</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>任务名称</th>
              <th>下发班级</th>
              <th>下发人数</th>
              <th>下发时间</th>
              <th>截止时间</th>
              <th style="width: 150px">完成进度</th>
              <th style="width: 90px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!historyRecords.length">
              <td colspan="7">
                <div class="empty-state" style="padding: 36px 0">
                  <span class="empty-icon" v-html="ICONS.emptyMail"></span>
                  <span>暂无下发记录</span>
                </div>
              </td>
            </tr>
            <tr v-for="record in historyRecords" :key="record.id">
              <td class="cell-strong">{{ record.title }}</td>
              <td>{{ record.class_name || '--' }}</td>
              <td>{{ record.student_count || 0 }} 人</td>
              <td class="text-secondary">{{ formatTime(record.created_at) }}</td>
              <td class="text-secondary">{{ formatTime(record.deadline) }}</td>
              <td>
                <div class="progress-cell">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: `${record.progress || 0}%` }"></div>
                  </div>
                  <span class="progress-text">{{ record.progress || 0 }}%</span>
                </div>
              </td>
              <td>
                <button
                  class="btn btn-danger btn-sm"
                  :disabled="record.status === 2 || record.status === 3"
                  @click="handleRecall(record)"
                >
                  撤回
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  getClassList,
  getStudentsList,
  getTemplates,
  getHistoryRecords,
  newTaskInstance,
  recallTask
} from '@/api/request'
import { unwrap, extractList } from '@/api/request'
import { getCurrentClassId, getItem, setItem, removeItem, STORAGE_KEYS } from '@/utils/storage'
import { ICONS } from '@/utils/icons'
import { toast, confirmDialog } from '@/utils/notice'

const steps = [
  { label: '选择模板' },
  { label: '选择对象' },
  { label: '设置参数' },
  { label: '确认下发' }
]

const currentStep = ref(0)
const classList = ref([])
const selectedClass = ref(getCurrentClassId() ?? '')
const students = ref([])
const templates = ref([])
const selectedTemplate = ref(null)
const selectedStudents = ref([])
const historyRecords = ref([])
const submitting = ref(false)

const studentTotal = computed(() => students.value.length)

const taskParams = reactive({
  template_id: null,
  name: '',
  points: 10,
  startTime: '',
  endTime: '',
  description: '',
  student_ids: [],
  class_id: ''
})

const confirmRows = computed(() => [
  { label: '任务模板', value: getTemplateName() || '--' },
  { label: '任务名称', value: taskParams.name || '--' },
  { label: '下发班级', value: currentClassName.value || '--' },
  { label: '下发人数', value: `${selectedStudents.value.length} 名学生` },
  { label: '任务积分', value: `${taskParams.points} 分` },
  { label: '开始时间', value: formatTime(taskParams.startTime) },
  { label: '截止时间', value: formatTime(taskParams.endTime) },
  { label: '任务说明', value: taskParams.description || '无' }
])

const currentClassName = computed(
  () => classList.value.find((c) => c.id === selectedClass.value)?.className || ''
)

/* ===================== 数据加载 ===================== */
async function loadBasePageData() {
  try {
    const [classRes, templateRes] = await Promise.all([getClassList(), getTemplates()])

    const classData = unwrap(classRes).data
    const rawClasses = Array.isArray(classData) ? classData : classData?.list ?? []
    classList.value = rawClasses
      .map((item) => ({
        id: item.id ?? item.classId,
        className: item.className ?? item.name ?? item.class_name ?? '未命名班级'
      }))
      .filter((item) => item.id !== undefined && item.id !== null)

    const { list: tplList } = extractList(templateRes)
    templates.value = tplList.map((item) => ({
      ...item,
      min_points: item.min_points ?? item.min_score ?? 0
    }))

    // 未指定班级时，默认选中第一个
    if (!selectedClass.value && classList.value.length) {
      selectedClass.value = classList.value[0].id
      taskParams.class_id = selectedClass.value
    }

    if (selectedClass.value) {
      await Promise.all([loadStudentData(), loadHistoryData()])
    }
  } catch {
    classList.value = []
    templates.value = []
  }
}

async function loadStudentData() {
  if (!selectedClass.value) return
  try {
    const res = await getStudentsList(selectedClass.value)
    const { list } = extractList(res)
    students.value = list.map((item) => ({
      // 字段归一化：兼容 student_id/student_name 与 id/nickname 两种命名
      student_id: item.student_id ?? item.id,
      student_name: item.student_name ?? item.nickname ?? item.name ?? '未知'
    }))
  } catch {
    students.value = []
  }
  selectedStudents.value = []
}

async function loadHistoryData() {
  if (!selectedClass.value) {
    historyRecords.value = []
    return
  }
  try {
    const res = await getHistoryRecords(selectedClass.value)
    const { list } = extractList(res)
    historyRecords.value = list
  } catch {
    historyRecords.value = []
  }
}

/* ===================== 步骤流转 ===================== */
function selectTemplate(tpl) {
  selectedTemplate.value = tpl.id
  taskParams.template_id = tpl.id
  taskParams.name = tpl.name || ''
  taskParams.points = tpl.min_points ?? tpl.min_score ?? 10
}

const getTemplateName = () =>
  templates.value.find((item) => item.id === selectedTemplate.value)?.name || ''

function selectAllStudents(checked) {
  selectedStudents.value = checked
    ? students.value.map((s) => s.student_id)
    : []
  taskParams.student_ids = [...selectedStudents.value]
}

function toggleStudent(sid) {
  const idx = selectedStudents.value.indexOf(sid)
  if (idx > -1) selectedStudents.value.splice(idx, 1)
  else selectedStudents.value.push(sid)
  taskParams.student_ids = [...selectedStudents.value]
}

const canProceed = computed(() => {
  if (currentStep.value === 0) return !!selectedTemplate.value
  if (currentStep.value === 1) return selectedStudents.value.length > 0
  if (currentStep.value === 2) {
    const { name, startTime, endTime, points } = taskParams
    return !!name?.trim() && !!startTime && !!endTime && Number(points) > 0
  }
  return true
})

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

function nextStep() {
  if (!canProceed.value) {
    const tips = ['请先选择一个任务模板', '请至少选择一名学生', '请完整填写任务名称、积分与起止时间']
    toast.warning(tips[currentStep.value] || '请完善当前步骤信息')
    return
  }
  // 时间合法性校验
  if (currentStep.value === 2) {
    if (new Date(taskParams.endTime) <= new Date(taskParams.startTime)) {
      toast.warning('截止时间必须晚于开始时间')
      return
    }
  }
  if (currentStep.value < steps.length - 1) currentStep.value++
}

/* ===================== 切换班级 ===================== */
function handleClassChange() {
  taskParams.class_id = selectedClass.value
  resetForm()
  loadStudentData()
  loadHistoryData()
}

function resetForm() {
  currentStep.value = 0
  selectedTemplate.value = null
  selectedStudents.value = []
  Object.assign(taskParams, {
    template_id: null,
    name: '',
    points: 10,
    startTime: '',
    endTime: '',
    description: '',
    student_ids: []
  })
  removeItem(STORAGE_KEYS.BATCH_TASK_CACHE)
}

/* ===================== 提交下发 ===================== */
async function confirmSubmit() {
  if (submitting.value) return
  if (!selectedStudents.value.length) {
    toast.warning('请至少选择一名学生')
    return
  }

  const ok = await confirmDialog({
    title: '确认下发任务',
    content: `将向 ${selectedStudents.value.length} 名学生下发「${taskParams.name}」，确认继续吗？`,
    confirmText: '确认下发'
  })
  if (!ok) return

  const payload = {
    class_id: Number(taskParams.class_id || selectedClass.value),
    template_id: Number(taskParams.template_id),
    student_ids: taskParams.student_ids.map(Number),
    title: taskParams.name,
    points: Number(taskParams.points),
    start_time: taskParams.startTime,
    deadline: taskParams.endTime,
    description: taskParams.description || ''
  }

  submitting.value = true
  try {
    const res = await newTaskInstance(payload)
    const { ok: success, msg } = unwrap(res)
    if (success) {
      toast.success(msg || `已成功下发给 ${payload.student_ids.length} 名学生`)
      resetForm()
      await loadHistoryData()
    } else {
      toast.error(msg || '任务下发失败，请检查参数后重试')
    }
  } catch {
    // 已统一提示
  } finally {
    submitting.value = false
  }
}

/* ===================== 撤回 ===================== */
async function handleRecall(record) {
  const ok = await confirmDialog({
    title: '撤回任务',
    content: `确定要撤回「${record.title}」吗？撤回后不可恢复。`,
    confirmText: '确认撤回',
    danger: true
  })
  if (!ok) return

  try {
    const res = await recallTask(record.id)
    const { ok: success, msg } = unwrap(res)
    if (success) {
      toast.success(msg || '任务已撤回')
      await loadHistoryData()
    } else {
      toast.error(msg || '撤回失败')
    }
  } catch {
    // 已统一提示
  }
}

/* ===================== 工具 ===================== */
function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ')
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/* ===================== 缓存 ===================== */
onMounted(() => {
  // 从「任务模板」页跳转过来时，自动预选模板
  const cached = getItem(STORAGE_KEYS.BATCH_TASK_CACHE, null)
  if (cached?.templateId) {
    selectedTemplate.value = cached.templateId
    taskParams.template_id = cached.templateId
    taskParams.name = cached.templateName || ''
  }

  // 恢复上次未完成的填写内容
  const draft = getItem('batchTaskDraft', null)
  if (draft) {
    Object.assign(taskParams, draft.taskParams || {})
    currentStep.value = draft.step || 0
    selectedTemplate.value = draft.templateId ?? selectedTemplate.value
    selectedStudents.value = draft.studentIds || []
  }

  loadBasePageData()
})

// 自动保存草稿，避免误刷新丢失填写
watch(
  [currentStep, taskParams, selectedTemplate, selectedStudents, selectedClass],
  () => {
    setItem('batchTaskDraft', {
      step: currentStep.value,
      classId: selectedClass.value,
      templateId: selectedTemplate.value,
      studentIds: [...selectedStudents.value],
      taskParams: { ...taskParams }
    })
  },
  { deep: true }
)
</script>

<style scoped>
.batch-page {
  display: block;
}

/* ===================== 班级选择 ===================== */
.class-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 16px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.class-picker label {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.class-picker .select {
  width: auto;
  min-width: 140px;
  height: 30px;
  padding: 0 28px 0 0;
  border: none;
  background-color: transparent;
  font-weight: 600;
  font-size: 14px;
}

.class-picker .select:focus {
  box-shadow: none;
}

.student-count {
  padding-left: 10px;
  border-left: 1px solid var(--color-border-light);
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 600;
  white-space: nowrap;
}

/* ===================== 步骤条 ===================== */
.stepper {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  padding: 18px 26px 0;
  background: #fff;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  flex: 1;
  padding-bottom: 16px;
}

.step-dot {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--gray-100);
  color: var(--gray-400);
  font-size: 14px;
  font-weight: 600;
  transition: all var(--transition-base);
}

.step-text {
  font-size: 12px;
  color: var(--color-text-placeholder);
  white-space: nowrap;
  transition: color var(--transition-base);
}

.step.active .step-dot {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 0 0 5px rgba(22, 163, 74, 0.13);
}

.step.active .step-text {
  color: var(--color-primary);
  font-weight: 600;
}

.step.done .step-dot {
  background: var(--brand-100);
  color: var(--brand-700);
}

.step.done .step-text {
  color: var(--color-text-regular);
}

.step-track {
  position: absolute;
  top: 35px;
  left: calc(12.5% + 26px);
  right: calc(12.5% + 26px);
  height: 2px;
  background: var(--gray-200);
  border-radius: 2px;
}

.step-progress {
  height: 100%;
  border-radius: 2px;
  background: var(--color-primary);
  transition: width var(--transition-base);
}

/* ===================== 面板 ===================== */
/* 基础外观沿用全局 .panel；此处只补「本页多面板纵向堆叠」的间距 */
.panel {
  margin-bottom: 16px;
}

.panel:last-child {
  margin-bottom: 0;
}

.step-panel {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.bulk-actions {
  display: flex;
  gap: 8px;
}

/* ===================== 模板选择 ===================== */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}

.tpl-card.selected {
  border-color: var(--color-primary);
  background: var(--brand-50);
  /* 原为绿色 rgba(22,163,74,.12)，与全站靛蓝主色不一致，已统一 */
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.tpl-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
}

.tpl-points {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
}

.tpl-name {
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.tpl-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 11px;
}

/* ===================== 学生选择 ===================== */
.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.student-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}

.student-chip:hover {
  border-color: var(--brand-300);
  background: var(--brand-50);
}

.student-chip.selected {
  border-color: var(--color-primary);
  background: var(--brand-50);
}

.student-chip input {
  display: none;
}

.chip-avatar {
  flex: none;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #86efac, #16a34a);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.student-chip.selected .chip-avatar {
  background: linear-gradient(135deg, #34d399, #15803d);
}

.chip-name {
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===================== 参数表单 ===================== */
.params-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-item.full-row {
  grid-column: 1 / -1;
}

/* ===================== 确认面板 ===================== */
.confirm-list {
  margin: 0 0 16px;
  padding: 4px 18px;
  border-radius: var(--radius-md);
  background: var(--gray-50);
}

.confirm-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 11px 0;
  border-bottom: 1px dashed var(--color-border);
}

.confirm-row:last-child {
  border-bottom: none;
}

.confirm-row dt {
  flex: none;
  width: 88px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.confirm-row dd {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  word-break: break-all;
}

.warn-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  background: #fffbeb;
  color: #b45309;
  font-size: 13px;
  line-height: 1.6;
}

.warn-icon {
  flex: none;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-warning);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

/* ===================== 步骤底部 ===================== */
.step-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid var(--color-border-light);
}

/* ===================== 历史记录 ===================== */
.history-panel {
  margin-bottom: 0;
}

.cell-strong {
  font-weight: 500;
  color: var(--color-text);
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.progress-track {
  flex: 1;
  min-width: 64px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--gray-200);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, #34d399, #16a34a);
  transition: width var(--transition-base);
}

.progress-text {
  flex: none;
  min-width: 34px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
}

/* ===================== 响应式 ===================== */
@media (max-width: 720px) {
  .params-form {
    grid-template-columns: 1fr;
  }

  .step-track {
    display: none;
  }

  .class-picker {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
