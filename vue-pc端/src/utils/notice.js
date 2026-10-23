import { reactive } from 'vue'

/**
 * 全局轻提示 / 确认弹窗状态总线
 * 说明：项目原先大量使用原生 alert / confirm，样式无法统一且阻塞主线程。
 *       这里用一份响应式状态驱动 AppNotice.vue 渲染，调用方只需 import { toast, confirmDialog }。
 */

export const noticeState = reactive({
  toasts: [],
  dialog: null // { title, content, confirmText, cancelText, resolve }
})

let toastSeq = 0

/**
 * 弹出轻提示
 * @param {string} message 提示内容
 * @param {'success'|'error'|'warning'|'info'} type 提示类型
 * @param {number} duration 自动关闭时长（毫秒），传 0 则不自动关闭
 */
export function toast(message, type = 'info', duration = 2600) {
  if (!message) return
  const id = ++toastSeq
  const item = { id, message: String(message), type, leaving: false }
  noticeState.toasts.push(item)

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration)
  }
  return id
}

/** 关闭指定轻提示（带离场动画） */
export function dismissToast(id) {
  const index = noticeState.toasts.findIndex((t) => t.id === id)
  if (index === -1) return
  const item = noticeState.toasts[index]
  item.leaving = true
  setTimeout(() => {
    const i = noticeState.toasts.findIndex((t) => t.id === id)
    if (i !== -1) noticeState.toasts.splice(i, 1)
  }, 200)
}

/* ---------- 语义化快捷方法 ---------- */
toast.success = (message, duration) => toast(message, 'success', duration)
toast.error = (message, duration) => toast(message, 'error', duration)
toast.warning = (message, duration) => toast(message, 'warning', duration)
toast.info = (message, duration) => toast(message, 'info', duration)

/**
 * 弹出确认框（Promise 化）
 * @returns {Promise<boolean>} 点击确认返回 true，取消返回 false
 */
export function confirmDialog(options = {}) {
  const {
    title = '操作确认',
    content = '',
    confirmText = '确定',
    cancelText = '取消',
    danger = false
  } = typeof options === 'string' ? { content: options } : options

  return new Promise((resolve) => {
    noticeState.dialog = {
      title,
      content,
      confirmText,
      cancelText,
      danger,
      resolve: (result) => {
        noticeState.dialog = null
        resolve(result)
      }
    }
  })
}

/** 供响应式丢失场景使用（如 request.js 拦截器） */
export default { toast, confirmDialog, noticeState }
