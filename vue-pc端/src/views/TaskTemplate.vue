<template>
  <div class="page-scroll">
    <!-- ===================== 页头 ===================== -->
    <header class="page-header">
      <div>
        <h1 class="page-title">任务模板库</h1>
        <p class="page-subtitle">统一管理可复用的任务模板，一键批量下发到学生</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索任务模板名称"
            @keyup.enter="loadList"
          />
          <button v-if="keyword" class="search-clear" @click="clearSearch">✕</button>
        </div>
        <button class="btn btn-primary" @click="openModal">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建模板
        </button>
      </div>
    </header>

    <!-- ===================== 分类筛选 ===================== -->
    <div class="filter-bar">
      <button
        v-for="tab in tabArr"
        :key="tab.value"
        class="tab-btn"
        :class="{ active: activeCat === tab.value }"
        @click="switchCategory(tab.value)"
      >
        {{ tab.label }}
        <span v-if="activeCat === tab.value" class="tab-dot"></span>
      </button>

      <div class="result-count">
        共 <strong>{{ list.length }}</strong> 个模板
      </div>
    </div>

    <!-- ===================== 加载骨架 ===================== -->
    <div v-if="loading" class="card-grid">
      <div v-for="n in 6" :key="n" class="card skeleton-card">
        <div class="sk-line sk-sm"></div>
        <div class="sk-line sk-lg"></div>
        <div class="sk-line"></div>
        <div class="sk-line sk-md"></div>
      </div>
    </div>

    <!-- ===================== 模板卡片 ===================== -->
    <div v-else-if="list.length" class="card-grid">
      <article v-for="item in list" :key="item.id" class="tpl-card">
        <div class="tpl-head">
          <span class="tag" :class="getTagClass(item.category)">
            {{ item.category || '未分类' }}
          </span>
          <span class="tag" :class="item.is_enabled === 1 ? 'tag-success' : 'tag-gray'">
            {{ item.is_enabled === 1 ? '已启用' : '已禁用' }}
          </span>
        </div>

        <h3 class="tpl-title">{{ item.name }}</h3>
        <p class="tpl-desc">{{ item.description || '暂无描述' }}</p>

        <div class="tpl-meta">
          <span class="meta-item">
            <span class="meta-label">积分</span>
            <span class="meta-value">{{ item.min_points ?? 0 }} - {{ item.max_points ?? 0 }}</span>
          </span>
          <span v-if="item.need_photo === 1" class="meta-chip">需拍照</span>
          <span v-if="item.need_location === 1" class="meta-chip">需定位</span>
        </div>

        <div class="tpl-actions">
          <button class="btn btn-ghost btn-sm" @click="editItem(item)">编辑</button>
          <button class="btn btn-primary btn-sm" @click="batchSend(item)">批量下发</button>
        </div>
      </article>
    </div>

    <!-- ===================== 空状态 ===================== -->
    <div v-else class="panel empty-state">
      <span class="empty-icon" v-html="ICONS.emptyTemplate"></span>
      <p class="empty-title">暂无任务模板</p>
      <p class="empty-desc">{{ keyword || activeCat ? '换个条件试试，或新建一个模板' : '创建第一个模板，开始管理班级任务' }}</p>
      <button class="btn btn-primary" @click="openModal">新建模板</button>
    </div>

    <!-- ===================== 新增 / 编辑弹窗 ===================== -->
    <transition name="modal">
      <div v-if="showModal" class="modal-mask" @click.self="closeModal">
        <div class="modal-box">
          <header class="modal-head">
            <h3>{{ isEdit ? '修改任务模板' : '新建任务模板' }}</h3>
            <button class="modal-close" @click="closeModal">✕</button>
          </header>

          <form class="modal-body" @submit.prevent="submitForm">
            <div class="form-item">
              <label>任务名称 <span class="required">*</span></label>
              <input v-model="form.name" class="input" placeholder="例如：每日课外阅读30分钟" required />
            </div>

            <div class="form-row">
              <div class="form-item">
                <label>任务分类 <span class="required">*</span></label>
                <select v-model="form.category" class="select" required>
                  <option value="">请选择分类</option>
                  <option value="学习">学习任务</option>
                  <option value="家务">家务任务</option>
                  <option value="习惯">习惯养成</option>
                  <option value="团队">团队协作</option>
                </select>
              </div>
              <div class="form-item">
                <label>关联学科</label>
                <select v-model="form.subject_id" class="select">
                  <option :value="null">无</option>
                  <option :value="1">语文</option>
                  <option :value="2">数学</option>
                  <option :value="3">英语</option>
                  <option :value="4">科学</option>
                </select>
              </div>
            </div>

            <div class="form-item">
              <label>任务描述</label>
              <textarea
                v-model="form.description"
                class="textarea"
                placeholder="描述任务要求与完成标准，学生端会展示这段内容"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-item">
                <label>最低积分</label>
                <input v-model.number="form.min_points" class="input" type="number" min="0" />
              </div>
              <div class="form-item">
                <label>最高积分</label>
                <input v-model.number="form.max_points" class="input" type="number" min="0" />
              </div>
            </div>

            <div class="form-item">
              <label>完成要求</label>
              <div class="switch-row">
                <label class="switch-item">
                  <input v-model="form.need_photo" type="checkbox" />
                  <span>需要拍照上传</span>
                </label>
                <label class="switch-item">
                  <input v-model="form.need_location" type="checkbox" />
                  <span>需要定位打卡</span>
                </label>
              </div>
            </div>
          </form>

          <footer class="modal-foot">
            <button class="btn btn-ghost" @click="closeModal">取消</button>
            <button class="btn btn-primary" :disabled="submitting" @click="submitForm">
              {{ submitting ? '提交中...' : isEdit ? '确认修改' : '确认新增' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTemplateList, addTemplate, updateTemplate } from '@/api/request'
import { extractList, unwrap } from '@/api/request'
import { ICONS } from '@/utils/icons'
import { setItem } from '@/utils/storage'
import { toast } from '@/utils/notice'

const router = useRouter()

const tabArr = [
  { label: '全部分类', value: '' },
  { label: '学习任务', value: '学习' },
  { label: '家务任务', value: '家务' },
  { label: '习惯养成', value: '习惯' },
  { label: '团队协作', value: '团队' }
]

const activeCat = ref('')
const keyword = ref('')
const list = ref([])
const showModal = ref(false)
const isEdit = ref(false)
const loading = ref(false)
const submitting = ref(false)

const form = reactive({
  id: null,
  name: '',
  category: '',
  subject_id: null,
  description: '',
  example_media: '',
  min_points: 5,
  max_points: 10,
  need_photo: false,
  need_location: false
})

/** 分类标签样式映射 */
const TAG_CLASS_MAP = {
  学习: 'tag-info',
  家务: 'tag-warning',
  习惯: 'tag-purple',
  团队: 'tag-success'
}

const getTagClass = (category) => TAG_CLASS_MAP[category] || 'tag-gray'

const switchCategory = (value) => {
  activeCat.value = value
  loadList()
}

const clearSearch = () => {
  keyword.value = ''
  loadList()
}

async function loadList() {
  loading.value = true
  const params = {}
  if (activeCat.value.trim()) params.category = activeCat.value
  if (keyword.value.trim()) params.keyword = keyword.value.trim()

  try {
    const res = await getTemplateList(params)
    // 统一从响应中提取列表，兼容多种返回结构
    const { list: dataList } = extractList(res)
    list.value = dataList.map((item) => ({
      // 字段归一化：兼容 min_points / min_score 两种后端命名
      min_points: item.min_points ?? item.min_score ?? 0,
      max_points: item.max_points ?? item.max_score ?? 0,
      ...item
    }))
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function openModal() {
  isEdit.value = false
  Object.assign(form, {
    id: null,
    name: '',
    category: '',
    subject_id: null,
    description: '',
    min_points: 5,
    max_points: 10,
    need_photo: false,
    need_location: false
  })
  showModal.value = true
}

function editItem(item) {
  isEdit.value = true
  Object.assign(form, {
    id: item.id,
    name: item.name || '',
    category: item.category || '',
    subject_id: item.subject_id ?? null,
    description: item.description || '',
    min_points: item.min_points ?? 5,
    max_points: item.max_points ?? 10,
    need_photo: item.need_photo === 1,
    need_location: item.need_location === 1
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

async function submitForm() {
  if (submitting.value) return

  if (!form.name?.trim()) {
    toast.warning('请填写任务名称')
    return
  }
  if (!form.category) {
    toast.warning('请选择任务分类')
    return
  }
  if (Number(form.min_points) > Number(form.max_points)) {
    toast.warning('最低积分不能大于最高积分')
    return
  }

  const submitData = {
    name: form.name.trim(),
    category: form.category,
    subject_id: form.subject_id || null,
    description: form.description || '',
    example_media: form.example_media || '',
    min_points: Number(form.min_points) || 0,
    max_points: Number(form.max_points) || 0,
    need_photo: form.need_photo ? 1 : 0,
    need_location: form.need_location ? 1 : 0
  }

  submitting.value = true
  try {
    const res = isEdit.value
      ? await updateTemplate({ ...submitData, id: form.id })
      : await addTemplate(submitData)

    const { ok, msg } = unwrap(res)
    if (ok) {
      toast.success(msg || (isEdit.value ? '模板修改成功' : '模板创建成功'))
      closeModal()
      loadList()
    } else {
      toast.error(msg || '操作失败')
    }
  } catch {
    // 拦截器已统一提示
  } finally {
    submitting.value = false
  }
}

/** 批量下发：把模板写入缓存后跳转到批量任务页并预选 */
function batchSend(item) {
  setItem('batchTaskCache', { templateId: item.id, templateName: item.name })
  toast.success(`已选择「${item.name}」，请继续选择下发对象`)
  router.push('/batch')
}

onMounted(loadList)
</script>

<style scoped>
/* ===================== 页头 ===================== */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 220px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text);
}

.search-input::placeholder {
  color: var(--color-text-placeholder);
}

.search-clear {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: var(--gray-200);
  color: var(--gray-500);
  font-size: 10px;
}

.search-clear:hover {
  background: var(--gray-300);
}

/* ===================== 筛选栏 ===================== */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.tab-btn {
  position: relative;
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: #fff;
  color: var(--color-text-secondary);
  font-size: 13px;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-primary);
  border-color: var(--brand-300);
  background: var(--brand-50);
}

.tab-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 500;
}

.tab-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-left: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  vertical-align: middle;
}

.result-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.result-count strong {
  color: var(--color-primary);
  font-weight: 600;
}

/* ===================== 卡片网格 ===================== */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.tpl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.tpl-title {
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 14px 0;
  padding: 11px 0 0;
  border-top: 1px dashed var(--color-border-light);
  font-size: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.meta-label {
  color: var(--color-text-placeholder);
}

.meta-value {
  color: var(--color-primary);
  font-weight: 600;
}

.meta-chip {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--gray-100);
  color: var(--gray-600);
}

.tpl-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 补充 tag 变体（tag-purple 未在全局定义） */
:deep(.tag-purple) {
  color: #6d28d9;
  background: #f5f3ff;
}

/* ===================== 骨架屏 ===================== */
.sk-sm {
  width: 40%;
  height: 20px;
}

.sk-lg {
  width: 80%;
  height: 18px;
}

/* ===================== 空状态 ===================== */
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

.switch-row {
  display: flex;
  gap: 22px;
}

.switch-item {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-regular);
}

.switch-item input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

@media (max-width: 560px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .search-input {
    width: 140px;
  }
}
</style>
