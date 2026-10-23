/**
 * 本地存储统一封装
 * 说明：项目原先在十余个页面中散落 localStorage.getItem / setItem，
 *       键名硬编码且容易拼错（如退出登录漏清 token）。此处统一收口。
 */

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_INFO: 'userInfo',
  USER_ID: 'userId',
  CURRENT_CLASS: 'currentClass',
  LOGIN_PHONE: 'loginPhone',
  LOGIN_NICKNAME: 'loginNickname',
  LOGIN_SELECT_CLASS: 'loginSelectClass',
  BATCH_TASK_CACHE: 'batchTaskCache'
}

/** 读取并反序列化，失败时返回兜底值 */
export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined || raw === '') return fallback
    // 兼容历史上直接存储的纯字符串（非 JSON）
    if (raw === 'undefined' || raw === 'null') return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  } catch {
    return fallback
  }
}

/** 序列化写入，对象自动 JSON.stringify */
export function setItem(key, value) {
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value)
    localStorage.setItem(key, raw)
    return true
  } catch {
    return false
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/* ---------- 鉴权相关快捷方法 ---------- */

export const getToken = () => getItem(STORAGE_KEYS.TOKEN, '')

export const getUserInfo = () => getItem(STORAGE_KEYS.USER_INFO, null)

export const getUserId = () => {
  const id = getItem(STORAGE_KEYS.USER_ID, null)
  // 兜底：部分场景只写了 userInfo
  if (id === null || id === undefined || id === '') {
    const info = getUserInfo()
    return info?.id ?? info?.userId ?? null
  }
  return id
}

export const getNickname = () => {
  const nickname = getItem(STORAGE_KEYS.LOGIN_NICKNAME, '')
  if (nickname) return nickname
  const info = getUserInfo()
  return info?.nickname ?? info?.name ?? '教师'
}

/**
 * 当前班级 ID
 * 兜底顺序：currentClass -> loginSelectClass -> userInfo.classId
 */
export const getCurrentClassId = () => {
  const candidates = [
    getItem(STORAGE_KEYS.CURRENT_CLASS, null),
    getItem(STORAGE_KEYS.LOGIN_SELECT_CLASS, null),
    getUserInfo()?.classId
  ]
  for (const item of candidates) {
    if (item === null || item === undefined || item === '') continue
    // currentClass 可能是对象 { id, name }
    const value = typeof item === 'object' ? item.id ?? item.classId ?? item.value : item
    if (value !== null && value !== undefined && value !== '') return value
  }
  return null
}

/** 当前班级名称（用于顶栏展示） */
export const getCurrentClassName = () => {
  const current = getItem(STORAGE_KEYS.CURRENT_CLASS, null)
  if (current && typeof current === 'object' && current.name) return current.name
  return getItem(STORAGE_KEYS.LOGIN_SELECT_CLASS, '') || ''
}

/** 登录成功后写入全部登录态 */
export function saveSession({ token, userInfo, classId, className, phone, nickname } = {}) {
  if (token) setItem(STORAGE_KEYS.TOKEN, token)
  if (userInfo) {
    setItem(STORAGE_KEYS.USER_INFO, userInfo)
    if (userInfo.id !== undefined && userInfo.id !== null) {
      setItem(STORAGE_KEYS.USER_ID, userInfo.id)
    }
  }
  if (classId !== undefined && classId !== null && classId !== '') {
    setItem(STORAGE_KEYS.CURRENT_CLASS, classId)
    setItem(STORAGE_KEYS.LOGIN_SELECT_CLASS, classId)
  }
  if (className) setItem(STORAGE_KEYS.LOGIN_NICKNAME, nickname || className)
  if (phone) setItem(STORAGE_KEYS.LOGIN_PHONE, phone)
  if (nickname) setItem(STORAGE_KEYS.LOGIN_NICKNAME, nickname)
}

/** 退出登录：必须清理干净，否则路由守卫会认为仍处于登录态 */
export function clearSession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key === STORAGE_KEYS.BATCH_TASK_CACHE) return // 缓存保留，便于下次继续
    removeItem(key)
  })
}
