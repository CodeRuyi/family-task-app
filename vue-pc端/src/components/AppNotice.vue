<template>
  <div class="notice-layer">
    <!-- 轻提示 -->
    <TransitionGroup name="toast-list">
      <div
        v-for="item in state.toasts"
        :key="item.id"
        class="notice-toast"
        :class="{ 'is-leave': item.leaving }"
        @click="dismissToast(item.id)"
      >
        <span
          class="toast-icon"
          :style="{ background: iconStyle(item.type).bg, color: iconStyle(item.type).color }"
        >
          {{ iconStyle(item.type).icon }}
        </span>
        <span class="toast-text">{{ item.message }}</span>
      </div>
    </TransitionGroup>

    <!-- 确认弹窗 -->
    <div v-if="state.dialog" class="notice-mask" @click.self="handleCancel">
      <div class="notice-dialog" role="dialog">
        <h3>{{ state.dialog.title }}</h3>
        <p v-if="state.dialog.content">{{ state.dialog.content }}</p>
        <div class="notice-dialog-actions">
          <button class="btn btn-ghost" @click="handleCancel">
            {{ state.dialog.cancelText }}
          </button>
          <button
            class="btn"
            :class="state.dialog.danger ? 'btn-danger' : 'btn-primary'"
            @click="handleConfirm"
          >
            {{ state.dialog.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { noticeState as state, dismissToast } from '../utils/notice'

const ICONS = {
  success: { icon: '✓', bg: '#f0fdf4', color: '#16a34a' },
  error: { icon: '✕', bg: '#fef2f2', color: '#ef4444' },
  warning: { icon: '!', bg: '#fffbeb', color: '#f59e0b' },
  info: { icon: 'i', bg: '#eff6ff', color: '#3b82f6' }
}

const iconStyle = (type) => ICONS[type] || ICONS.info

const handleConfirm = () => state.dialog?.resolve(true)
const handleCancel = () => state.dialog?.resolve(false)
</script>

<style scoped>
.toast-icon {
  flex: none;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
}

.toast-text {
  line-height: 1.5;
}

.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.22s ease;
}

.toast-list-enter-from,
.toast-list-leave-to {
  opacity: 0;
  transform: translate(-50%, -14px);
}

/* 多条提示纵向排开 */
.notice-toast + .notice-toast {
  margin-top: 60px;
}
</style>
