const express = require('express')
const db = require('../db/index')
const router = express.Router()

/**
 * 数据看板接口
 * GET /api/dashboard/data?classId=xxx
 *
 * 说明：
 * - task_instance / family 表都没有 class_id 字段，班级过滤统一通过
 *   student_class（child_id <-> class_id）关联完成。
 * - 每一段统计都单独 try/catch，任何一段失败只影响该段（返回 0 / 空数组），
 *   接口本身永远返回 code:200，保证三端（PC / 小程序 / 鸿蒙）拿到可用数据。
 * - 不传 classId 时保持原有全局统计行为不变。
 */

// 把任意值安全转成数字，NaN 归零
function safeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// 统一取「某天」的 MM-DD，兼容 Date 对象 / 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm:ss'
function toMonthDay(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[2]}-${match[3]}`
    return ''
  }
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${mm}-${dd}`
  } catch (err) {
    return ''
  }
}

// 本地时区的 YYYY-MM-DD（避免 toISOString 的 UTC 偏移导致差一天）
function toLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

router.get('/dashboard/data', async (req, res) => {
  const { classId } = req.query
  const hasClass = classId !== undefined && classId !== null && String(classId).trim() !== ''

  // 近 7 天（含今天）
  const dayList = []
  const dayX = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    dayList.push(toLocalDate(d))
    dayX.push(toLocalDate(d).slice(5))
  }

  // 班级子查询（复用，避免每段重复拼接）
  const classChildSub = 'SELECT child_id FROM student_class WHERE class_id = ?'

  // ---------- 1. 总学生数 ----------
  let totalStudent = 0
  try {
    let sql = `SELECT COUNT(DISTINCT u.id) cnt FROM user u LEFT JOIN student_class sc ON u.id = sc.child_id WHERE u.role = 2`
    const params = []
    if (hasClass) {
      sql += ` AND sc.class_id = ?`
      params.push(classId)
    }
    const [rows] = await db.query(sql, params)
    totalStudent = safeNumber(rows[0] && rows[0].cnt)
  } catch (e) {
    console.error('[dashboard] 总学生数查询失败:', e.sqlMessage || e.message)
  }

  // ---------- 2. 总任务数（启用中的任务模板） ----------
  let totalTask = 0
  try {
    const [rows] = await db.query(`SELECT COUNT(id) cnt FROM task_template WHERE is_enabled = 1`)
    totalTask = safeNumber(rows[0] && rows[0].cnt)
  } catch (e) {
    console.error('[dashboard] 总任务数查询失败:', e.sqlMessage || e.message)
  }

  // ---------- 3. 勋章总数 ----------
  let totalBadge = 0
  try {
    const [rows] = await db.query(`SELECT COUNT(id) cnt FROM badge`)
    totalBadge = safeNumber(rows[0] && rows[0].cnt)
  } catch (e) {
    console.error('[dashboard] 勋章总数查询失败:', e.sqlMessage || e.message)
  }

  // ---------- 4. 任务完成趋势（近 7 天） ----------
  let taskChart = { xAxis: dayX, series: dayX.map(() => 0) }
  try {
    const placeholders = dayList.map(() => '?').join(',')
    let sql = `SELECT DATE(submitted_at) day, COUNT(s.id) num
               FROM task_submission s
               LEFT JOIN task_instance ti ON s.task_id = ti.id
               WHERE DATE(submitted_at) IN (${placeholders})`
    const params = [...dayList]
    if (hasClass) {
      // task_instance 无 class_id，改由 child_id 关联 student_class
      sql += ` AND ti.child_id IN (${classChildSub})`
      params.push(classId)
    }
    sql += ` GROUP BY DATE(submitted_at)`
    const [rows] = await db.query(sql, params)
    const taskSeries = dayX.map((d) => {
      const item = rows.find((i) => toMonthDay(i.day) === d)
      return item ? safeNumber(item.num) : 0
    })
    taskChart = { xAxis: dayX, series: taskSeries }
  } catch (e) {
    console.error('[dashboard] 任务完成趋势查询失败:', e.sqlMessage || e.message)
  }

  // ---------- 5. 积分发放趋势（近 7 天） ----------
  // points_log.type 实际以 'earn' / 'consume' 为主，'badge' 可能存在历史数据，
  // 这里用 IN 同时兼容，避免漏统计。
  let badgeChart = { xAxis: dayX, series: dayX.map(() => 0) }
  try {
    const placeholders = dayList.map(() => '?').join(',')
    let sql = `SELECT DATE(created_at) day, COUNT(id) num
               FROM points_log
               WHERE type IN ('badge','earn') AND \`change\` > 0
                 AND DATE(created_at) IN (${placeholders})`
    const params = [...dayList]
    if (hasClass) {
      sql += ` AND child_id IN (${classChildSub})`
      params.push(classId)
    }
    sql += ` GROUP BY DATE(created_at)`
    const [rows] = await db.query(sql, params)
    const badgeSeries = dayX.map((d) => {
      const item = rows.find((i) => toMonthDay(i.day) === d)
      return item ? safeNumber(item.num) : 0
    })
    badgeChart = { xAxis: dayX, series: badgeSeries }
  } catch (e) {
    console.error('[dashboard] 积分发放趋势查询失败:', e.sqlMessage || e.message)
  }

  // ---------- 6. 本周完成 TOP3 学生 ----------
  let top3List = []
  try {
    let sql = `SELECT u.id child_id, u.nickname name, COUNT(s.id) finishNum
               FROM task_submission s
               LEFT JOIN user u ON s.child_id = u.id
               LEFT JOIN task_instance ti ON s.task_id = ti.id
               WHERE DATE(s.submitted_at) BETWEEN ? AND ?`
    const params = [dayList[0], dayList[6]]
    if (hasClass) {
      sql += ` AND ti.child_id IN (${classChildSub})`
      params.push(classId)
    }
    sql += ` GROUP BY u.id, u.nickname ORDER BY finishNum DESC LIMIT 3`
    const [rows] = await db.query(sql, params)
    top3List = Array.isArray(rows)
      ? rows.map((item, index) => ({
          child_id: item.child_id,
          name: item.name || '未命名学生',
          finishNum: safeNumber(item.finishNum),
          rank: index + 1
        }))
      : []
  } catch (e) {
    console.error('[dashboard] TOP3 查询失败:', e.sqlMessage || e.message)
  }

  // ---------- 7. 未完成任务数 ----------
  let unFinishTaskCount = 0
  try {
    let sql = `SELECT COUNT(id) cnt FROM task_instance WHERE status = 0`
    const params = []
    if (hasClass) {
      // 同上，走 child_id 关联
      sql += ` AND child_id IN (${classChildSub})`
      params.push(classId)
    }
    const [rows] = await db.query(sql, params)
    unFinishTaskCount = safeNumber(rows[0] && rows[0].cnt)
  } catch (e) {
    console.error('[dashboard] 未完成任务查询失败:', e.sqlMessage || e.message)
  }

  // ---------- 8. 待审核家庭数 ----------
  // family 表无 class_id，且 owner 是教师而非学生，无法可靠按班级过滤；
  // 因此这里始终返回全局待审核数（与原有「不传 classId」时的行为一致）。
  let auditFamilyCount = 0
  try {
    const [rows] = await db.query(`SELECT COUNT(id) cnt FROM family WHERE audit_status = 'wait'`)
    auditFamilyCount = safeNumber(rows[0] && rows[0].cnt)
  } catch (e) {
    console.error('[dashboard] 待审核家庭查询失败:', e.sqlMessage || e.message)
  }

  res.json({
    code: 200,
    msg: '成功',
    data: {
      totalStudent,
      totalTask,
      totalBadge,
      taskChart,
      badgeChart,
      top3List,
      unFinishTaskCount,
      auditFamilyCount
    }
  })
})

module.exports = router
