import axios from 'axios'
import { getToken, clearSession } from '../utils/storage'
import { toast } from '../utils/notice'

/**
 * axios 实例
 * 说明：原代码没有任何拦截器，每个页面都要自己判断 code === 200、
 *       自己拼 token，且错误静默失败。此处统一收口：
 *       1) 请求拦截器：自动注入 Authorization / token
 *       2) 响应拦截器：统一解包 + 401 自动登出 + 网络错误提示
 *       为保持对既有页面调用的兼容，响应仍返回完整的 axios response 对象，
 *       页面原有的 res.data.code === 200 判断逻辑不受影响。
 */
const instance = axios.create({
  baseURL: 'http://localhost:8888/api',
  timeout: 15000
})

instance.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
      config.headers.token = token
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 「无需登录态」的接口：登录 / 注册 / 查手机号。
 *
 * ⚠️ 关键：这些接口会用 **HTTP 200 + 业务码 401** 来表达业务失败
 *   （账号不存在 / 密码错误 / 该教师无此班级管理权限 …）。
 *   如果拦截器把它们一律当成「会话过期」处理，登录页就只能拿到一个
 *   被替换过的 Error（没有 .response），从而兜底显示
 *   「服务器连接失败，请确认后端已启动」—— 后端其实是通的。
 *   因此这些接口的错误必须原样交回页面处理。
 */
const AUTH_FREE_URLS = ['/login', '/register', '/check-phone', '/mobile-login', '/mobile-register']

function isAuthFree(url) {
  const path = String(url || '')
  return AUTH_FREE_URLS.some((item) => path.indexOf(item) !== -1)
}

/** 是否处于「已登录态」：只有已登录时的 401 才可能是会话过期 */
function hasSession() {
  return !!getToken()
}

instance.interceptors.response.use(
  (response) => {
    const body = response.data
    // 业务层返回 401 / 未登录
    if (body && typeof body === 'object' && (body.code === 401 || body.code === 403)) {
      // 只在「已登录态 + 非登录类接口」下才当作会话过期处理；
      // 其余情况（尤其是登录页）原样返回，由页面展示后端给出的真实原因。
      if (hasSession() && !isAuthFree(response.config?.url)) {
        handleUnauthorized(body.msg || '登录状态已过期，请重新登录')
        // 保留 response，页面仍可通过 err.response.data.msg 取到后端文案
        return Promise.reject(Object.assign(new Error(body.msg || '未授权'), { response }))
      }
      return response
    }
    return response
  },
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url
    if ((status === 401 || status === 403) && hasSession() && !isAuthFree(url)) {
      handleUnauthorized('登录状态已过期，请重新登录')
    } else if (error?.code === 'ECONNABORTED') {
      toast.error('请求超时，请检查网络后重试')
    } else if (!error?.response) {
      toast.error('无法连接服务器，请确认后端服务已启动')
    }
    return Promise.reject(error)
  }
)

let redirecting = false
function handleUnauthorized(message) {
  toast.error(message)
  clearSession()
  if (redirecting) return
  redirecting = true
  setTimeout(() => {
    redirecting = false
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
  }, 600)
}

/**
 * 统一提取后端响应体
 * 兼容后端两种返回结构：
 *   A. { code: 200, msg, data }   —— 标准结构
 *   B. { code: 200, msg, ...字段 } —— data 平铺在顶层
 * @returns {{ ok: boolean, data: any, msg: string, raw: any }}
 */
export function unwrap(res) {
  const body = res?.data ?? res ?? {}
  const ok = body.code === 200 || body.code === 0 || body.code === undefined
  const data = body.data !== undefined ? body.data : body
  return { ok, data, msg: body.msg || body.message || '', raw: body }
}

/**
 * 从响应中提取列表 + 总数
 * 兼容 data.list / data.records / data.rows / 直接数组 等多种命名
 */
export function extractList(res) {
  const { data } = unwrap(res)
  if (Array.isArray(data)) return { list: data, total: data.length }
  if (data && typeof data === 'object') {
    const list = data.list ?? data.records ?? data.rows ?? data.items ?? []
    const total = data.total ?? data.count ?? list.length ?? 0
    return { list: Array.isArray(list) ? list : [], total }
  }
  return { list: [], total: 0 }
}

/**
 * 统一提取错误文案（避免"后端其实正常、前端却报连接失败"的误报）
 *
 * 取值优先级：
 *   1. 后端响应体 msg / message        —— 最准确（如「该教师无此班级管理权限，无法登录」）
 *   2. HTTP 状态码                      —— 如「服务器异常（500），请稍后重试」
 *   3. 超时 / 断网                      —— 才提示网络或后端未启动
 *   4. err.message / 兜底文案
 *
 * @param {unknown} err 任意异常对象
 * @param {string} fallback 兜底文案
 */
export function errMsg(err, fallback = '操作失败，请稍后重试') {
  const data = err?.response?.data
  if (data) {
    const msg = data.msg || data.message
    if (msg) return msg
  }
  const status = err?.response?.status
  if (status) return `服务器异常（${status}），请稍后重试`
  if (err?.code === 'ECONNABORTED') return '请求超时，请检查网络后重试'
  if (!err?.response) return '无法连接服务器，请确认后端服务已启动'
  return err?.message || fallback
}

// ============================================================
// 登录 / 注册
// ============================================================
export const login = (formData) => instance.post('/login', formData)
export const register = (formData) => instance.post('/register', formData)

// ============================================================
// 数据看板
// ============================================================
export const getDashboardData = (classId) => {
  const params = {}
  if (classId !== undefined && classId !== null && classId !== '') {
    params.classId = classId
  }
  return instance.get('/dashboard/data', { params })
}

// ============================================================
// 班级管理（ClassRouter）
// ============================================================
export const getClassStats = () => instance.get('/class/stats')
export const getClassList = () => instance.get('/class/list')
export const getStudentList = (params) => instance.get('/class/studentList', { params })
export const getClassDetail = (classId) => instance.get(`/class/detail/${classId}`)
export const refreshClassInviteCode = (classId) => instance.post(`/class/refresh-code/${classId}`)
export const getClassQrcode = (classId) => instance.get(`/class/qrcode/${classId}`)
export const getClassTeacher = (classId) => instance.get(`/class/teacher/${classId}`)
export const getClassStudentAll = (classId) => instance.get(`/class/student-all/${classId}`)
export const createSingleBindCode = (userId) => instance.post(`/student/gen-code/${userId}`)
export const batchCreateBindCode = (userIds) => instance.post('/student/batch-gen-code', { userIds })
export const updateClassInfo = (classId, data) => instance.put(`/class/update/${classId}`, data)
export const addTeacherToClass = (data) => instance.post('/class/add-teacher', data)
export const removeTeacherFromClass = (data) => instance.delete('/class/remove-teacher', { data })

// ============================================================
// 家庭管理（FamilyRouter）
// ============================================================
export const getFamilyStats = () => instance.get('/family/stats')
export const getFamilyList = (params) => instance.get('/family/list', { params })
export const auditSingleFamily = (id, status) => instance.put(`/family/audit/${id}`, { status })
export const batchAuditFamily = (data) => instance.put('/family/batchAudit', data)

// ============================================================
// 批量任务（BatchTaskRouter）
// ============================================================
export const getStudentsList = (classId) => instance.get('/student/list', { params: { classId } })
export const getTemplates = () => instance.get('/template/list')
export const getHistoryRecords = (classId) =>
  instance.get('/history/list', { params: { classId } })
export const newTaskInstance = (data) => instance.post('/instance/create', data)
export const recallTask = (taskId) => instance.put(`/task/recall/${taskId}`)

// ============================================================
// 任务模板（TaskTemplateRouter）
// ============================================================
export const getTemplateList = (params) => instance.get('/template/list', { params })
export const addTemplate = (data) => instance.post('/template/add', data)
export const updateTemplate = (data) => instance.put('/template/update', data)

// ============================================================
// 勋章系统（MedalRouter）
// ============================================================
// 获取勋章统计（勋章墙）
export const getMedalStats = (classId) => instance.get('/medal/stats', { params: { classId } })
// 获取勋章获得记录（分页）
export const getMedalRecordList = (params) => instance.get('/medal/record', { params })
// 获取单条勋章详情
export const getMedalDetail = (recordId) => instance.get(`/medal/record/${recordId}`)
// 颁发勋章
export const awardMedal = (data) => instance.post('/medal/award', data)

// ============================================================
// 个人中心（UserRouter）
// ============================================================
// 获取用户信息
export const getUserProfile = (userId) => instance.get('/user/profile', { params: { userId } })
// 更新用户信息
export const updateUserProfile = (data) => instance.put('/user/profile', data)
// 修改密码
export const updatePassword = (data) => instance.put('/user/password', data)

export default instance
