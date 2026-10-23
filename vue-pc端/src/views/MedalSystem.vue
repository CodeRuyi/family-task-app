<template>
  <div class="page-scroll">
    <!-- ===================== 页头 ===================== -->
    <header class="page-header">
      <div>
        <h1 class="page-title">勋章系统</h1>
        <p class="page-subtitle">查看班级勋章获得情况，为表现优秀的学生颁发勋章</p>
      </div>
      <button class="btn btn-primary" @click="openAwardModal">颁发勋章</button>
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
          <span class="stat-unit">枚</span>
        </div>
      </div>
    </div>

    <!-- ===================== 勋章墙 ===================== -->
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3 class="panel-title">勋章墙</h3>
          <p class="panel-sub">共 {{ medalList.length }} 种勋章</p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="loadAllData">刷新</button>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="medal-grid">
        <div v-for="n in 6" :key="n" class="medal-card skeleton-card">
          <div class="sk-circle"></div>
          <div class="sk-line sk-md"></div>
          <div class="sk-line"></div>
        </div>
      </div>

      <div v-else-if="medalList.length" class="medal-grid">
        <article
          v-for="item in medalList"
          :key="item.medalId"
          class="medal-card"
          @click="openDetailModal(item)"
        >
          <div class="medal-emoji" v-html="getMedalIcon(item.medalName)"></div>
          <h4 class="medal-name">{{ item.medalName }}</h4>
          <p class="medal-desc">{{ item.ruleDesc || '暂无描述' }}</p>
          <span class="gain-tag">{{ item.gainCount || 0 }} 人获得</span>
        </article>
      </div>

      <div v-else class="empty-state">
        <span class="empty-icon" v-html="ICONS.emptyMedal"></span>
        <p class="empty-title">暂无勋章数据</p>
        <p class="empty-desc">当前班级还没有学生获得勋章</p>
      </div>
    </section>

    <!-- ===================== 颁发弹窗 ===================== -->
    <transition name="modal">
      <div v-if="showAwardModal" class="modal-mask" @click.self="closeAwardModal">
        <div class="modal-box">
          <header class="modal-head">
            <h3>颁发勋章</h3>
            <button class="modal-close" @click="closeAwardModal">✕</button>
          </header>

          <div class="modal-body">
            <div class="form-item">
              <label>选择学生 <span class="required">*</span></label>
              <select v-model="awardForm.student_id" class="select">
                <option value="">请选择学生</option>
                <option v-for="stu in studentList" :key="stu.id" :value="stu.id">
                  {{ stu.nickname || stu.student_name || '未知' }}
                </option>
              </select>
            </div>

            <div class="form-item">
              <label>选择勋章 <span class="required">*</span></label>
              <select v-model="awardForm.badge_id" class="select">
                <option value="">请选择勋章</option>
                <option v-for="medal in medalList" :key="medal.medalId" :value="medal.medalId">
                  {{ medal.medalName }}
                </option>
              </select>
            </div>

            <div v-if="awardPreview" class="award-preview">
              <span class="preview-emoji" v-html="getMedalIcon(awardPreview.medal)"></span>
              <div class="preview-text">
                <strong>{{ awardPreview.student }}</strong>
                <span>将获得「{{ awardPreview.medal }}」</span>
              </div>
            </div>
          </div>

          <footer class="modal-foot">
            <button class="btn btn-ghost" @click="closeAwardModal">取消</button>
            <button class="btn btn-primary" :disabled="awardLoading" @click="handleAward">
              {{ awardLoading ? '提交中...' : '确认颁发' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>

    <!-- ===================== 详情弹窗 ===================== -->
    <transition name="modal">
      <div v-if="showDetailModal" class="modal-mask" @click.self="closeDetailModal">
        <div class="modal-box">
          <header class="modal-head">
            <h3>勋章详情</h3>
            <button class="modal-close" @click="closeDetailModal">✕</button>
          </header>

          <div class="modal-body">
            <div class="detail-hero">
              <span class="detail-emoji" v-html="getMedalIcon(detailData?.medalName)"></span>
              <h4 class="detail-name">{{ detailData?.medalName }}</h4>
            </div>

            <dl class="detail-list">
              <div class="detail-row">
                <dt>获得人数</dt>
                <dd>{{ detailData?.gainCount || 0 }} 人</dd>
              </div>
              <div class="detail-row">
                <dt>规则描述</dt>
                <dd>{{ detailData?.ruleDesc || '暂无' }}</dd>
              </div>
            </dl>
          </div>

          <footer class="modal-foot">
            <button class="btn btn-ghost" @click="closeDetailModal">关闭</button>
          </footer>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getMedalStats,
  getMedalRecordList,
  awardMedal,
  getClassStudentAll
} from '@/api/request'
import { unwrap } from '@/api/request'
import { ICONS, getMedalIcon } from '@/utils/icons'
import { getCurrentClassId, getUserId } from '@/utils/storage'
import { toast } from '@/utils/notice'

const route = useRoute()

// 修复：原先硬编码为 1，现从登录态读取
const currentClassId = ref(getCurrentClassId() ?? 1)

const stats = reactive({
  totalTypes: 0,
  totalAwarded: 0,
  classAwarded: 0
})

const medalList = ref([])
const studentList = ref([])
const loading = ref(false)

const showAwardModal = ref(false)
const awardLoading = ref(false)
const awardForm = reactive({ student_id: '', badge_id: '' })

const showDetailModal = ref(false)
const detailData = ref(null)

const statCards = computed(() => [
  {
    key: 'types',
    label: '勋章种类',
    value: stats.totalTypes || 0,
    color: 'var(--color-warning)',
    soft: 'var(--warning-soft)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-2 8 5.5-3 5.5 3-2-8"/></svg>'
  },
  {
    key: 'awarded',
    label: '已颁发总量',
    value: stats.totalAwarded || 0,
    color: 'var(--brand-600)',
    soft: 'var(--brand-50)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  },
  {
    key: 'class',
    label: '班级已获得',
    value: stats.classAwarded || 0,
    color: 'var(--color-info)',
    soft: 'var(--info-soft)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17.5 14.5A5.5 5.5 0 0 1 22 20"/></svg>'
  }
])

/** 颁发预览：选了学生与勋章后给出可读的确认文案 */
const awardPreview = computed(() => {
  if (!awardForm.student_id || !awardForm.badge_id) return null
  const student = studentList.value.find((s) => String(s.id) === String(awardForm.student_id))
  const medal = medalList.value.find((m) => String(m.medalId) === String(awardForm.badge_id))
  if (!student || !medal) return null
  return {
    student: student.nickname || student.student_name || '该学生',
    medal: medal.medalName,
  }
})



async function loadAllData() {
  loading.value = true
  try {
    const classId = currentClassId.value

    const [statsRes, recordRes, stuRes] = await Promise.all([
      getMedalStats(classId),
      getMedalRecordList({ classId, page: 1, pageSize: 1 }),
      getClassStudentAll(classId)
    ])

    const medalData = unwrap(statsRes).data
    medalList.value = Array.isArray(medalData) ? medalData : medalData?.list ?? []

    stats.totalTypes = medalList.value.length
    stats.classAwarded = medalList.value.reduce((sum, item) => sum + (item.gainCount || 0), 0)

    const recordData = unwrap(recordRes).data
    stats.totalAwarded = recordData?.total ?? recordData?.count ?? medalList.value.length

    const stuData = unwrap(stuRes).data
    studentList.value = Array.isArray(stuData) ? stuData : stuData?.list ?? []
  } catch {
    medalList.value = []
    studentList.value = []
  } finally {
    loading.value = false
  }
}

function openAwardModal() {
  if (!medalList.value.length) {
    toast.warning('当前没有可颁发的勋章')
    return
  }
  awardForm.student_id = ''
  awardForm.badge_id = ''
  showAwardModal.value = true
}

const closeAwardModal = () => (showAwardModal.value = false)

async function handleAward() {
  if (!awardForm.student_id) {
    toast.warning('请选择学生')
    return
  }
  if (!awardForm.badge_id) {
    toast.warning('请选择勋章')
    return
  }

  awardLoading.value = true
  try {
    const res = await awardMedal({
      student_id: Number(awardForm.student_id),
      badge_id: Number(awardForm.badge_id),
      // 修复：原先硬编码 teacher_id: 1，现取当前登录教师
      teacher_id: Number(getUserId()) || 1,
      class_id: currentClassId.value
    })

    const { ok, msg } = unwrap(res)
    if (ok) {
      toast.success(msg || '勋章颁发成功')
      closeAwardModal()
      await loadAllData()
    } else {
      toast.error(msg || '颁发失败')
    }
  } catch {
    // 已统一提示
  } finally {
    awardLoading.value = false
  }
}

function openDetailModal(item) {
  detailData.value = item
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  detailData.value = null
}

// 顶栏切换班级后自动刷新
watch(
  () => route.query._t,
  () => {
    const latest = getCurrentClassId()
    if (latest !== null && latest !== currentClassId.value) {
      currentClassId.value = latest
      loadAllData()
    }
  }
)

onMounted(loadAllData)
</script>

<style scoped>
/* ===================== 面板 ===================== */
/* ===================== 勋章墙 ===================== */
.medal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}

.medal-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  border: 1.5px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  background: var(--gray-50);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
}

.medal-card:hover {
  transform: translateY(-4px);
  border-color: var(--brand-300);
  background: var(--brand-50);
  box-shadow: var(--shadow-md);
}

.medal-emoji {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--brand-50);
  color: var(--brand-600);
  filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.1));
}

.medal-card:hover .medal-emoji {
  background: #fff;
}

.medal-emoji svg {
  width: 30px;
  height: 30px;
}

.medal-name {
  margin-bottom: 5px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.medal-desc {
  min-height: 34px;
  margin-bottom: 12px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gain-tag {
  padding: 3px 14px;
  border-radius: var(--radius-full);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 600;
}

/* 骨架屏 */
.sk-circle {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}

/* 空状态 */
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

.award-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--brand-50);
  border: 1px dashed var(--brand-300);
}

.preview-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-600);
}

.preview-emoji svg {
  width: 28px;
  height: 28px;
}

.preview-text {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--color-text-regular);
}

.preview-text strong {
  color: var(--color-text);
}

/* 详情 */
.detail-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0 16px;
}

.detail-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: var(--brand-50);
  color: var(--brand-600);
  filter: drop-shadow(0 6px 12px rgba(15, 23, 42, 0.12));
}

.detail-emoji svg {
  width: 42px;
  height: 42px;
}

.detail-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
}

.detail-list {
  margin: 0;
}

.detail-row {
  display: flex;
  gap: 16px;
  padding: 11px 0;
  border-top: 1px dashed var(--color-border);
}

.detail-row dt {
  flex: none;
  width: 76px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.detail-row dd {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.6;
}

</style>
