<template>
  <div class="auth-wrap">
    <!-- ===================== 左侧品牌区 ===================== -->
    <section class="auth-brand">
      <div class="decor decor-1"></div>
      <div class="decor decor-2"></div>

      <div class="brand-inner">
        <div class="system-logo">
          <span class="logo-icon" v-html="ICONS.class"></span>
          <span class="logo-name">家校任务系统</span>
        </div>
        <h1 class="brand-title">加入教师团队</h1>
        <p class="brand-desc">注册教师账号，即可开始管理班级任务与家校联动</p>

        <ul class="feature-list">
          <li v-for="item in features" :key="item.text">
            <span class="feature-icon" v-html="item.icon"></span>
            <span>{{ item.text }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ===================== 右侧表单区 ===================== -->
    <section class="auth-form-side">
      <div class="auth-card">
        <header class="card-head">
          <h2 class="card-title">教师注册</h2>
          <p class="card-subtitle">填写以下信息完成账号创建</p>
        </header>

        <transition name="fade">
          <div v-if="errorMsg" class="error-tip">
            <span class="error-icon">!</span>
            <span>{{ errorMsg }}</span>
          </div>
        </transition>

        <form class="auth-form" @submit.prevent="handleRegister">
          <div class="form-item">
            <label for="reg-phone">手机号</label>
            <input
              id="reg-phone"
              v-model="regForm.phone"
              type="tel"
              maxlength="11"
              autocomplete="username"
              placeholder="请输入教师手机号"
              class="input"
            />
          </div>

          <div class="form-item">
            <label for="reg-nickname">姓名</label>
            <input
              id="reg-nickname"
              v-model="regForm.nickname"
              type="text"
              autocomplete="name"
              placeholder="请输入真实姓名"
              class="input"
            />
          </div>

          <div class="form-row">
            <div class="form-item">
              <label for="reg-password">设置密码</label>
              <input
                id="reg-password"
                v-model="regForm.password"
                type="password"
                autocomplete="new-password"
                placeholder="请设置密码"
                class="input"
              />
            </div>
            <div class="form-item">
              <label for="reg-repassword">确认密码</label>
              <input
                id="reg-repassword"
                v-model="regForm.rePassword"
                type="password"
                autocomplete="new-password"
                placeholder="请再次输入密码"
                class="input"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label for="reg-role">教师身份</label>
              <select id="reg-role" v-model="regForm.role" class="select">
                <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <label for="reg-class">所属班级</label>
              <select id="reg-class" v-model="regForm.className" class="select">
                <option v-if="!classNames.length" value="">暂无可选班级</option>
                <option v-for="name in classNames" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary submit-btn" type="submit" :disabled="loading">
            <span v-if="loading" class="btn-spinner"></span>
            {{ loading ? '注册中...' : '立即注册' }}
          </button>
        </form>

        <div class="link-bottom">
          <router-link to="/login" class="text-link">已有账号？去登录</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { register, getClassList, errMsg } from '@/api/request'
import { toast } from '@/utils/notice'
import { ICONS } from '@/utils/icons'

const router = useRouter()

const errorMsg = ref('')
const loading = ref(false)

/**
 * 教师身份选项
 * subjectName 必须与数据库 subject 表 subject_name 完全一致
 * （当前为：语文 / 数学 / 好习惯 / 英语），否则后端查不到科目导致注册失败。
 */
const roleOptions = [
  { label: '班主任', value: '3', subjectName: '' },
  { label: '语文老师', value: '5', subjectName: '语文' },
  { label: '数学老师', value: '5', subjectName: '数学' },
  { label: '英语老师', value: '5', subjectName: '英语' }
]

// 班级列表改为从后端动态获取，避免与数据库实际班级不一致
const classNames = ref([])

async function loadClassNames() {
  classLoading.value = true
  classLoadFailed.value = false
  try {
    const res = await getClassList()
    const body = res?.data ?? {}
    const raw = body.data !== undefined ? body.data : body
    const list = Array.isArray(raw) ? raw : raw?.list ?? raw?.records ?? []
    // 去重：库里存在重名班级（如两个「三年级1班」），下拉里只保留一项
    const seen = []
    list.forEach((item) => {
      const name = item.className ?? item.class_name ?? item.name ?? ''
      if (name && !seen.includes(name)) {
        seen.push(name)
      }
    })
    classNames.value = seen
    if (classNames.value.length && !classNames.value.includes(regForm.value.className)) {
      regForm.value.className = classNames.value[0]
    }
  } catch {
    classNames.value = []
    classLoadFailed.value = true
  } finally {
    classLoading.value = false
  }
}

onMounted(loadClassNames)

const regForm = ref({
  phone: '',
  nickname: '',
  password: '',
  rePassword: '',
  role: '3',
  className: ''
})

const features = [
  {
    text: '创建班级，生成专属邀请码',
    icon: ICONS.class
  },
  {
    text: '批量下发任务，自动统计完成情况',
    icon: ICONS.batch
  },
  {
    text: '勋章激励，见证每个孩子的进步',
    icon: ICONS.medal
  }
]

const handleRegister = () => {
  if (loading.value) return
  errorMsg.value = ''

  const phone = regForm.value.phone.trim()
  const nickname = regForm.value.nickname.trim()
  const { password, rePassword, role, className } = regForm.value

  if (!phone) {
    errorMsg.value = '请输入手机号'
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    errorMsg.value = '手机号格式不正确，请输入11位手机号'
    return
  }
  if (!nickname) {
    errorMsg.value = '请输入姓名'
    return
  }
  if (!password) {
    errorMsg.value = '请设置密码'
    return
  }
  if (password.length < 6) {
    errorMsg.value = '密码长度不能少于 6 位'
    return
  }
  if (!rePassword) {
    errorMsg.value = '请确认密码'
    return
  }
  if (password !== rePassword) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }
  if (!role) {
    errorMsg.value = '请选择教师身份'
    return
  }
  if (!className) {
    errorMsg.value = '请选择所属班级'
    return
  }

  // 科目直接从选中项推导，无需操作 DOM
  const subjectName = roleOptions.find((opt) => String(opt.value) === String(role))?.subjectName ?? ''

  loading.value = true
  register({
    phone,
    nickname,
    password,
    className,
    role: Number(role),
    subjectName
  })
    .then((res) => {
      const body = res?.data ?? {}
      if (body.code === 200) {
        toast.success('注册成功，即将前往登录')
        setTimeout(() => router.push('/login'), 800)
      } else {
        errorMsg.value = body.msg || '注册失败，请稍后重试'
      }
    })
    .catch((err) => {
      errorMsg.value = errMsg(err, '注册失败，请检查网络连接')
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<style scoped>
.auth-wrap {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--gray-50);
}

/* ===================== 左侧品牌区 ===================== */
.auth-brand {
  position: relative;
  flex: 1.05;
  display: flex;
  align-items: center;
  padding: 0 clamp(40px, 6vw, 88px);
  background: linear-gradient(140deg, #4f46e5 0%, #3730a3 50%, #312e81 100%);
  overflow: hidden;
}

.decor {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.08);
}

.decor-1 {
  width: 460px;
  height: 460px;
  top: -170px;
  right: -130px;
}

.decor-2 {
  width: 280px;
  height: 280px;
  bottom: -110px;
  left: -90px;
  background: rgba(255, 255, 255, 0.05);
}

.brand-inner {
  position: relative;
  z-index: 1;
  max-width: 440px;
}

.system-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}

.logo-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
}

.logo-icon svg {
  width: 24px;
  height: 24px;
}

.logo-name {
  color: #fff;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 1px;
}

.brand-title {
  margin-bottom: 14px;
  color: #fff;
  font-size: clamp(30px, 3.4vw, 42px);
  font-weight: 700;
  letter-spacing: 1px;
}

.brand-desc {
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: 0.4px;
}

.feature-list {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.feature-icon {
  flex: none;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.feature-icon svg {
  width: 16px;
  height: 16px;
}

/* ===================== 右侧表单区 ===================== */
.auth-form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}

.auth-card {
  width: 460px;
  max-width: 100%;
  padding: 38px 36px 30px;
  background: #fff;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  box-shadow: 0 16px 44px rgba(15, 23, 42, 0.09);
  animation: card-in 0.45s ease both;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-head {
  margin-bottom: 24px;
  text-align: center;
}

.card-title {
  margin-bottom: 6px;
  font-size: 25px;
  font-weight: 700;
  color: var(--color-text);
}

.card-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.error-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  line-height: 1.5;
}

.error-icon {
  flex: none;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #dc2626;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 表单 */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.submit-btn {
  width: 100%;
  height: 46px;
  margin-top: 6px;
  font-size: 15px;
  letter-spacing: 1px;
}

.btn-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.link-bottom {
  margin-top: 18px;
  text-align: center;
}

.text-link {
  color: var(--color-primary);
  font-size: 13px;
  transition: color var(--transition-fast);
}

.text-link:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ===================== 响应式 ===================== */
@media (max-width: 960px) {
  .auth-brand {
    display: none;
  }
}

@media (max-width: 480px) {
  .auth-form-side {
    padding: 16px;
  }

  .auth-card {
    padding: 28px 20px 24px;
    border-radius: var(--radius-lg);
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
