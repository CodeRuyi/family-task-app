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
        <h1 class="brand-title">教师管理后台</h1>
        <p class="brand-desc">家校联动管理平台 · 让每一次任务都成为成长的见证</p>

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
          <h2 class="card-title">教师登录</h2>
          <p class="card-subtitle">欢迎回来，请登录您的账号</p>
        </header>

        <transition name="fade">
          <div v-if="errorMsg" class="error-tip">
            <span class="error-icon">!</span>
            <span>{{ errorMsg }}</span>
          </div>
        </transition>

        <form class="auth-form" @submit.prevent="handleLogin">
          <div class="form-item">
            <label for="login-phone">手机号</label>
            <input
              id="login-phone"
              v-model="loginForm.phone"
              type="tel"
              maxlength="11"
              autocomplete="username"
              placeholder="请输入教师登录手机号"
              class="input"
            />
          </div>

          <div class="form-item">
            <label for="login-password">登录密码</label>
            <input
              id="login-password"
              v-model="loginForm.password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              class="input"
            />
          </div>

          <div class="form-item">
            <label for="login-class">选择班级</label>
            <select
              id="login-class"
              v-model="loginForm.className"
              class="select"
              :disabled="classLoading || classNames.length === 0"
            >
              <option v-if="classNames.length === 0" value="">
                {{ classLoading ? '加载班级中…' : '暂无可选班级' }}
              </option>
              <option v-for="name in classNames" :key="name" :value="name">{{ name }}</option>
            </select>
            <p v-if="classLoadFailed" class="field-hint is-error">
              班级列表加载失败，请确认后端已启动
              <span class="retry-link" @click="loadClassNames">重新加载</span>
            </p>
            <p v-else class="field-hint">请选择您任教的班级，登录后进入该班级</p>
          </div>

          <button class="btn btn-primary submit-btn" type="submit" :disabled="loading">
            <span v-if="loading" class="btn-spinner"></span>
            {{ loading ? '登录中...' : '登录系统' }}
          </button>
        </form>

        <div class="link-row">
          <span class="text-link" @click="handleForget">忘记密码？</span>
          <router-link to="/register" class="text-link">注册账号</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, getClassList, errMsg } from '@/api/request'
import { saveSession } from '@/utils/storage'
import { toast } from '@/utils/notice'
import { ICONS } from '@/utils/icons'

const router = useRouter()
const route = useRoute()

const errorMsg = ref('')
const loading = ref(false)

// 修复：登录只需要手机号、密码、班级，昵称在登录后从 userInfo 取
const loginForm = ref({
  phone: '',
  password: '',
  className: ''
})

const classNames = ref([])

// 班级列表：字典里存在重名班级（如两个「三年级1班」），下拉里要去重
const classLoading = ref(false)
const classLoadFailed = ref(false)

async function loadClassNames() {
  classLoading.value = true
  classLoadFailed.value = false
  try {
    const res = await getClassList()
    const body = res?.data ?? {}
    const raw = body.data !== undefined ? body.data : body
    const list = Array.isArray(raw) ? raw : raw?.list ?? raw?.records ?? []
    // 去重：同一班级名只保留一项，避免下拉里出现两个一模一样的选项
    const seen = []
    list.forEach((item) => {
      const name = item.className ?? item.class_name ?? item.name ?? ''
      if (name && !seen.includes(name)) {
        seen.push(name)
      }
    })
    classNames.value = seen
    if (classNames.value.length && !classNames.value.includes(loginForm.value.className)) {
      loginForm.value.className = classNames.value[0]
    }
  } catch {
    classNames.value = []
    classLoadFailed.value = true
  } finally {
    classLoading.value = false
  }
}

onMounted(loadClassNames)

const features = [
  {
    text: '任务一键下发，全班同步接收',
    icon: ICONS.send
  },
  {
    text: '勋章激励体系，实时记录成长',
    icon: ICONS.medal
  },
  {
    text: '家校协同审核，数据一目了然',
    icon: ICONS.trend
  }
]

const handleLogin = () => {
  if (loading.value) return
  errorMsg.value = ''

  const phone = loginForm.value.phone.trim()
  const password = loginForm.value.password

  if (!phone) {
    errorMsg.value = '请输入手机号'
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    errorMsg.value = '手机号格式不正确，请输入11位手机号'
    return
  }
  if (!password) {
    errorMsg.value = '请输入密码'
    return
  }
  if (!loginForm.value.className) {
    errorMsg.value = '请选择班级'
    return
  }

  loading.value = true
  login({ phone, password, className: loginForm.value.className })
    .then((res) => {
      const body = res?.data ?? {}
      if (body.code === 200) {
        const payload = body.data ?? {}
        const nickname = payload.userInfo?.nickname ?? phone
        saveSession({
          token: payload.token,
          userInfo: payload.userInfo,
          classId: payload.currentClass?.id,
          className: payload.currentClass?.name,
          phone,
          nickname
        })
        toast.success(`欢迎回来，${nickname}`)
        // 登录后回到来源页
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
        router.replace(redirect)
      } else {
        errorMsg.value = body.msg || '登录失败，请检查账号与密码'
      }
    })
    .catch((err) => {
      // errMsg 优先取后端真实原因（如「该教师无此班级管理权限，无法登录」），
      // 只有真的连不上 / 超时时才提示网络问题，避免误报「后端未启动」
      errorMsg.value = errMsg(err, '服务器连接失败，请确认后端已启动')
    })
    .finally(() => {
      loading.value = false
    })
}

const handleForget = () => {
  toast.info('忘记密码请联系班级管理员重置')
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
  max-width: 460px;
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
  font-size: clamp(32px, 3.6vw, 44px);
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
  background: var(--gray-50);
}

.auth-card {
  width: 404px;
  max-width: 100%;
  padding: 42px 38px 34px;
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
  margin-bottom: 26px;
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

/* 错误提示 */
.error-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
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
  gap: 18px;
}

/* 字段下方辅助说明 / 错误提示 */
.field-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-placeholder);
}

.field-hint.is-error {
  color: var(--color-danger);
}

.retry-link {
  margin-left: 6px;
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.retry-link:hover {
  color: var(--color-primary-dark);
}

.submit-btn {
  width: 100%;
  height: 46px;
  margin-top: 4px;
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

/* 链接 */
.link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
}

.text-link {
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
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
    padding: 30px 22px 26px;
    border-radius: var(--radius-lg);
  }

  .card-title {
    font-size: 22px;
  }
}
</style>
