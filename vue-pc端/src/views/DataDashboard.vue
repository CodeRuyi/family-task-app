<template>
  <div class="page-scroll">
    <!-- ===================== 页头（与其它页面统一） ===================== -->
    <header class="page-header">
      <div>
        <h1 class="page-title">数据看板</h1>
        <p class="page-subtitle">实时掌握班级任务完成情况与家校互动数据</p>
      </div>
      <button class="btn btn-ghost" :disabled="loading" @click="loadData">
        <span class="icon-svg" v-html="ICONS.refresh"></span>
        {{ loading ? '加载中…' : '刷新数据' }}
      </button>
    </header>

    <!-- ===================== 统计卡片 ===================== -->
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
          <span class="stat-num">{{ loading ? '—' : card.value }}</span>
          <span class="stat-unit">{{ card.unit }}</span>
        </div>
        <div class="stat-foot">{{ card.foot }}</div>
      </div>
    </div>

    <!-- ===================== 图表 ===================== -->
    <div class="chart-row">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">任务完成趋势</h3>
            <p class="panel-sub">近阶段班级任务完成情况</p>
          </div>
          <span class="panel-badge">趋势</span>
        </div>
        <div v-show="!loading" ref="taskChartRef" class="chart-dom"></div>
        <div v-if="loading" class="chart-skeleton"></div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">勋章发放统计</h3>
            <p class="panel-sub">各勋章类型发放数量</p>
          </div>
          <span class="panel-badge">分布</span>
        </div>
        <div v-show="!loading" ref="badgeChartRef" class="chart-dom"></div>
        <div v-if="loading" class="chart-skeleton"></div>
      </div>
    </div>

    <!-- ===================== 学生完成排行（条形图） ===================== -->
    <div class="panel rank-panel">
      <div class="panel-head">
        <div>
          <h3 class="panel-title">本周学生完成排行</h3>
          <p class="panel-sub">按本周任务完成次数排序，最多展示前 3 名</p>
        </div>
        <span class="panel-badge">排行</span>
      </div>
      <template v-if="dashboardData.top3List?.length">
        <div v-show="!loading" ref="studentRef" class="rank-chart"></div>
      </template>
      <div v-else-if="!loading" class="empty-state">
        <span class="empty-icon" v-html="ICONS.emptyChart"></span>
        <span>本周暂无可统计的完成记录</span>
      </div>
      <div v-else class="chart-skeleton"></div>
    </div>

    <!-- ===================== 底部信息卡 ===================== -->
    <div class="info-row">
      <!-- TOP3 -->
      <div class="panel info-card">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">本周完成 TOP3</h3>
            <p class="panel-sub">任务完成次数排名</p>
          </div>
          <span class="panel-badge">排行</span>
        </div>

        <div v-if="!dashboardData.top3List?.length" class="empty-state">
          <span class="empty-icon" v-html="ICONS.emptyTrophy"></span>
          <span>本周暂无完成记录</span>
        </div>
        <ul v-else class="rank-list">
          <li
            v-for="(item, index) in dashboardData.top3List"
            :key="item.child_id ?? index"
            class="rank-item"
          >
            <span class="rank-medal" :class="`rank-medal-${index + 1}`">{{ index + 1 }}</span>
            <span class="rank-name">{{ item.name }}</span>
            <span class="rank-count">{{ item.finishNum }} 次</span>
          </li>
        </ul>
      </div>

      <!-- 未完成提醒 -->
      <div class="panel info-card">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">未完成任务</h3>
            <p class="panel-sub">需要跟进提醒</p>
          </div>
        </div>
        <div class="big-number warn">
          <span class="num">{{ dashboardData.unFinishTaskCount || 0 }}</span>
          <span class="unit">条</span>
        </div>
        <p class="info-tip">建议前往「批量任务」查看并催办</p>
      </div>

      <!-- 待审核 -->
      <div class="panel info-card">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">待审核家长申请</h3>
            <p class="panel-sub">等待处理的绑定请求</p>
          </div>
        </div>
        <div class="big-number info">
          <span class="num">{{ dashboardData.auditFamilyCount || 0 }}</span>
          <span class="unit">条</span>
        </div>
        <p class="info-tip link" @click="router.push('/family')">前往「家长管理」处理 →</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getDashboardData } from '@/api/request'
import { ICONS } from '@/utils/icons'
import { getCurrentClassId } from '@/utils/storage'
import { toast } from '@/utils/notice'

// ECharts 按需注册：仅引入看板用到的折线图 / 柱状图与相关组件
// 相比全量 import * as echarts from 'echarts'，可显著降低打包体积
echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
])

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const taskChartRef = ref(null)
const badgeChartRef = ref(null)
const studentRef = ref(null)
let taskChartInstance = null
let badgeChartInstance = null
let studentChartInstance = null


const dashboardData = ref({
  totalStudent: 0,
  totalTask: 0,
  totalBadge: 0,
  taskChart: { xAxis: [], series: [] },
  badgeChart: { xAxis: [], series: [] },
  top3List: [],
  unFinishTaskCount: 0,
  auditFamilyCount: 0
})

const statCards = computed(() => [
  {
    key: 'student',
    label: '班级总人数',
    value: dashboardData.value.totalStudent || 0,
    unit: '人',
    foot: '当前班级已绑定学生',
    color: 'var(--brand-600)',
    soft: 'var(--brand-50)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17.5 14.5A5.5 5.5 0 0 1 22 20"/></svg>'
  },
  {
    key: 'task',
    label: '已发布任务',
    value: dashboardData.value.totalTask || 0,
    unit: '个',
    foot: '累计下发的任务数量',
    color: 'var(--color-info)',
    soft: 'var(--info-soft)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 0 4 23z"/><path d="M9 8h6M9 12h4"/></svg>'
  },
  {
    key: 'badge',
    label: '勋章总数',
    value: dashboardData.value.totalBadge || 0,
    unit: '枚',
    foot: '已累计发放的勋章',
    color: 'var(--color-warning)',
    soft: 'var(--warning-soft)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-2 8 5.5-3 5.5 3-2-8"/></svg>'
  }
])

const AXIS_STYLE = {
  axisLine: { lineStyle: { color: '#e2e8f0' } },
  axisTick: { show: false },
  axisLabel: { color: '#94a3b8', fontSize: 12 }
}

function renderChart() {
  if (taskChartRef.value) {
    taskChartInstance?.dispose()
    taskChartInstance = echarts.init(taskChartRef.value)
    taskChartInstance.setOption({
      grid: { top: 24, left: 8, right: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a', fontSize: 12 },
        extraCssText: 'box-shadow: 0 8px 24px rgba(15,23,42,.1); border-radius: 10px;'
      },
      xAxis: { type: 'category', boundaryGap: false, data: dashboardData.value.taskChart?.xAxis || [], ...AXIS_STYLE },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, ...AXIS_STYLE },
      series: [
        {
          name: '完成任务数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          data: dashboardData.value.taskChart?.series || [],
          lineStyle: { color: '#4f46e5', width: 3 },
          itemStyle: { color: '#4f46e5', borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(79, 70, 229, 0.28)' },
                { offset: 1, color: 'rgba(79, 70, 229, 0.02)' }
              ]
            }
          }
        }
      ]
    })
  }

  if (badgeChartRef.value) {
    badgeChartInstance?.dispose()
    badgeChartInstance = echarts.init(badgeChartRef.value)
    badgeChartInstance.setOption({
      grid: { top: 24, left: 8, right: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#0f172a', fontSize: 12 },
        extraCssText: 'box-shadow: 0 8px 24px rgba(15,23,42,.1); border-radius: 10px;'
      },
      xAxis: { type: 'category', data: dashboardData.value.badgeChart?.xAxis || [], ...AXIS_STYLE },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, ...AXIS_STYLE },
      series: [
        {
          name: '发放数量',
          type: 'bar',
          data: dashboardData.value.badgeChart?.series || [],
          barWidth: '42%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#818cf8' },
                { offset: 1, color: '#4f46e5' }
              ]
            }
          }
        }
      ]
    })
  }
}

async function loadData() {
  loading.value = true
  try {
    // 传入当前班级 ID，看板数据随顶栏班级切换而变化
    const res = await getDashboardData(getCurrentClassId())
    const body = res?.data ?? {}
    // 严格判定：只有 code 为 200 / 0 才算成功。
    // 注意：不能把 code === undefined 当作成功，否则会掩盖后端返回的 500，
    // 导致页面显示全 0 却"看起来正常"，问题被静默吞掉。
    if (body.code === 200 || body.code === 0) {
      dashboardData.value = { ...dashboardData.value, ...(body.data ?? {}) }
      await nextTick()
      renderChart()
      if (studentRef.value) {
        studentChartInstance?.dispose()
        studentChartInstance = echarts.init(studentRef.value)
        studentChartInstance.setOption({
          grid: { top: 16, left: 8, right: 18, bottom: 8, containLabel: true },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: '#fff',
            borderColor: '#e2e8f0',
            textStyle: { color: '#0f172a', fontSize: 12 },
            extraCssText: 'box-shadow: 0 8px 24px rgba(15,23,42,.1); border-radius: 10px;'
          },
          xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, ...AXIS_STYLE },
          yAxis: {
            type: 'category',
            data: (dashboardData.value.top3List || []).map((i) => i.name).reverse(),
            ...AXIS_STYLE
          },
          series: [
            {
              name: '完成任务数',
              type: 'bar',
              data: (dashboardData.value.top3List || []).map((i) => i.finishNum).reverse(),
              barWidth: '48%',
              itemStyle: {
                borderRadius: [0, 6, 6, 0],
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: '#818cf8' },
                    { offset: 1, color: '#4f46e5' }
                  ]
                }
              }
            }
          ]
        })
      }
    } else {
      toast.error(body.msg || '看板数据加载失败')
    }
  } catch {
    // 拦截器已统一提示网络错误
  } finally {
    loading.value = false
  }
}

function handleResize() {
  taskChartInstance?.resize()
  badgeChartInstance?.resize()
  studentChartInstance?.resize()
}

// 顶栏切换班级后（路由 query 变化）自动刷新
watch(
  () => route.query._t,
  (val) => {
    if (val) loadData()
  }
)

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  taskChartInstance?.dispose()
  badgeChartInstance?.dispose()
  studentChartInstance?.dispose()
})
</script>

<style scoped>
/* ===================== 面板通用 ===================== */
.panel:hover {
  box-shadow: var(--shadow-md);
}

/* ===================== 图表区 ===================== */
.chart-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.chart-dom {
  width: 100%;
  height: 268px;
}

/* 学生排行条形图 */
.rank-panel {
  margin-bottom: 16px;
}

.rank-chart {
  width: 100%;
  height: 180px;
}

.chart-skeleton {
  width: 100%;
  height: 268px;
  border-radius: var(--radius-md);
}

/* ===================== 底部信息区 ===================== */
.info-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.info-card {
  display: flex;
  flex-direction: column;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--gray-50);
  transition: all var(--transition-fast);
}

.rank-item:hover {
  background: var(--brand-50);
  transform: translateX(3px);
}

.rank-medal {
  flex: none;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--gray-200);
  color: var(--gray-600);
  font-size: 12px;
  font-weight: 700;
}

.rank-medal-1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
}

.rank-medal-2 {
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  color: #fff;
}

.rank-medal-3 {
  background: linear-gradient(135deg, #fcd9b6, #d97706);
  color: #fff;
}

.rank-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-count {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 600;
}

.big-number {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 4px 0 10px;
}

.big-number .num {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.big-number.warn .num {
  color: var(--color-warning);
}

.big-number.info .num {
  color: var(--color-primary);
}

.big-number .unit {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.info-tip {
  margin-top: auto;
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.info-tip.link {
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
}

.info-tip.link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
