const express = require('express')
const router = express.Router()
const db = require('../db/index')

// 1. 获取孩子基本信息
router.get('/report/child-info', async (req, res) => {
  const { childId } = req.query
  if (!childId) return res.json({ code: 400, msg: '缺少孩子ID', data: null })

  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nickname, u.avatar, c.class_name
       FROM user u
       LEFT JOIN student_class sc ON u.id = sc.child_id
       LEFT JOIN class c ON sc.class_id = c.id
       WHERE u.id = ? AND u.role = 2`,
      [childId]
    )
    if (rows.length === 0) return res.json({ code: 404, msg: '孩子不存在', data: null })
    res.json({ code: 200, data: rows[0], msg: 'success' })
  } catch (err) {
    console.error('获取孩子信息失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

// 2. 获取月度统计数据
router.get('/report/monthly-stats', async (req, res) => {
  const { childId, year, month } = req.query
  if (!childId || !year || !month) return res.json({ code: 400, msg: '缺少必要参数', data: null })

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

  try {
    const [taskRows] = await db.query(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS completed
       FROM task_instance
       WHERE child_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ? AND status IN (0, 1)`,
      [childId, startDate, endDate]
    )
    const total = taskRows[0]?.total || 0
    const completed = taskRows[0]?.completed || 0
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const [badgeRows] = await db.query(
      `SELECT COUNT(*) AS count FROM user_badge WHERE student_id = ? AND DATE(gain_time) >= ? AND DATE(gain_time) <= ?`,
      [childId, startDate, endDate]
    )
    const newBadges = badgeRows[0]?.count || 0

    const [totalBadgeRows] = await db.query(
      `SELECT COUNT(*) AS count FROM user_badge WHERE student_id = ?`,
      [childId]
    )
    const totalBadges = totalBadgeRows[0]?.count || 0

    const [continuousRows] = await db.query(
      `SELECT DATE(submitted_at) AS date FROM task_submission WHERE child_id = ? AND review_status = 1 ORDER BY submitted_at DESC`,
      [childId]
    )
    let continuousDays = 0
    if (continuousRows.length > 0) {
      let count = 1
      for (let i = 1; i < continuousRows.length; i++) {
        const prevDate = new Date(continuousRows[i - 1].date)
        const currDate = new Date(continuousRows[i].date)
        if (Math.floor((prevDate - currDate) / 86400000) <= 1) count++
        else break
      }
      continuousDays = count
    }

    res.json({
      code: 200,
      data: { totalTasks: total, completedTasks: completed, completionRate, newBadges, totalBadges, continuousDays },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取月度统计失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

// 3. 获取月度积分趋势
router.get('/report/points-trend', async (req, res) => {
  const { childId, year, month } = req.query
  if (!childId || !year || !month) return res.json({ code: 400, msg: '缺少必要参数', data: null })

  const yearNum = parseInt(year)
  const monthNum = parseInt(month)
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate()

  try {
    const [rows] = await db.query(
      `SELECT DATE(created_at) AS date, COALESCE(SUM(\`change\`), 0) AS points
       FROM points_log
       WHERE child_id = ? AND type = 'earn'
         AND DATE(created_at) >= ? AND DATE(created_at) <= ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [childId, `${yearNum}-${String(monthNum).padStart(2, '0')}-01`,
       `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`]
    )

    const dateMap = {}
    rows.forEach(row => { dateMap[row.date] = row.points })

    const dates = [], values = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dates.push(String(d))
      values.push(dateMap[dateStr] || 0)
    }

    res.json({
      code: 200,
      data: { dates, values, maxValue: Math.max(...values, 1) },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取积分趋势失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

// 4. 获取月度任务趋势（每周）
router.get('/report/weekly-trend-chart', async (req, res) => {
  const { childId, year, month } = req.query
  if (!childId || !year || !month) return res.json({ code: 400, msg: '缺少必要参数', data: null })

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

  try {
    const [rows] = await db.query(
      `SELECT WEEK(DATE(created_at), 1) AS week_num,
              COUNT(*) AS total,
              SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS completed
       FROM task_instance
       WHERE child_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ? AND status IN (0, 1)
       GROUP BY WEEK(DATE(created_at), 1)
       ORDER BY week_num ASC`,
      [childId, startDate, endDate]
    )

    const weekData = {}
    rows.forEach(row => { weekData[row.week_num] = { total: row.total, completed: row.completed } })

    const weekLabels = ['第1周', '第2周', '第3周', '第4周', '第5周']
    const weekKeys = [1, 2, 3, 4, 5]
    const weekTotal = weekKeys.map(key => weekData[key]?.total || 0)
    const weekCompleted = weekKeys.map(key => weekData[key]?.completed || 0)

    let maxWeeks = 1
    for (let i = 0; i < weekKeys.length; i++) {
      if (weekTotal[i] > 0 || weekCompleted[i] > 0) maxWeeks = i + 1
    }
    maxWeeks = Math.max(maxWeeks, 1)

    res.json({
      code: 200,
      data: {
        labels: weekLabels.slice(0, maxWeeks),
        total: weekTotal.slice(0, maxWeeks),
        completed: weekCompleted.slice(0, maxWeeks),
        maxValue: Math.max(...weekTotal.slice(0, maxWeeks), 1)
      },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取周趋势失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

// 5. 获取勋章详情
router.get('/report/badge-details', async (req, res) => {
  const { childId, year, month } = req.query
  if (!childId || !year || !month) return res.json({ code: 400, msg: '缺少必要参数', data: null })

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

  try {
    const [rows] = await db.query(
      `SELECT b.id, b.name, b.icon, b.description, ub.gain_time
       FROM user_badge ub
       JOIN badge b ON ub.badge_id = b.id
       WHERE ub.student_id = ? AND DATE(ub.gain_time) >= ? AND DATE(ub.gain_time) <= ?
       ORDER BY ub.gain_time DESC`,
      [childId, startDate, endDate]
    )

    res.json({
      code: 200,
      data: rows.map(r => ({ id: r.id, name: r.name, icon: r.icon || '🏅', description: r.description || '', gainTime: r.gain_time })),
      msg: 'success'
    })
  } catch (err) {
    console.error('获取勋章详情失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

// 6. 获取任务详情
router.get('/report/task-details', async (req, res) => {
  const { childId, year, month } = req.query
  if (!childId || !year || !month) return res.json({ code: 400, msg: '缺少必要参数', data: null })

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

  try {
    const [rows] = await db.query(
      `SELECT ti.id, ti.title, ti.points, ti.status, ti.created_at,
              ts.submitted_at, ts.review_status, u.nickname AS teacher_name
       FROM task_instance ti
       LEFT JOIN task_submission ts ON ti.id = ts.task_id
       LEFT JOIN user u ON ti.created_by = u.id
       WHERE ti.child_id = ? AND DATE(ti.created_at) >= ? AND DATE(ti.created_at) <= ?
       ORDER BY ti.created_at DESC
       LIMIT 50`,
      [childId, startDate, endDate]
    )

    const statusMap = { 0: '待完成', 1: '已完成' }
    const reviewMap = { 0: '待审核', 1: '已通过', 2: '已驳回' }
    const result = rows.map(r => ({
      id: r.id,
      title: r.title,
      points: r.points,
      status: r.status,
      statusText: statusMap[r.status] || '未知',
      createdAt: r.created_at,
      submittedAt: r.submitted_at,
      reviewStatus: r.review_status,
      reviewText: r.review_status !== null ? reviewMap[r.review_status] || '未知' : '未提交',
      teacherName: r.teacher_name || '系统'
    }))

    res.json({ code: 200, data: result, msg: 'success' })
  } catch (err) {
    console.error('获取任务详情失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

// 7. 周报统计
router.get('/report/weekly-stats', async (req, res) => {
  const { childId } = req.query
  if (!childId) return res.json({ code: 400, msg: '缺少孩子ID', data: null })

  try {
    const today = new Date()
    const dayOfWeek = today.getDay() || 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + 1)
    const mondayStr = monday.toISOString().split('T')[0]
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const sundayStr = sunday.toISOString().split('T')[0]

    const [taskRows] = await db.query(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS completed
       FROM task_instance
       WHERE child_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ? AND status IN (0, 1)`,
      [childId, mondayStr, sundayStr]
    )
    const total = taskRows[0]?.total || 0
    const completed = taskRows[0]?.completed || 0
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const [pointsRows] = await db.query(
      `SELECT COALESCE(SUM(\`change\`), 0) AS points
       FROM points_log
       WHERE child_id = ? AND type = 'earn' AND DATE(created_at) >= ? AND DATE(created_at) <= ?`,
      [childId, mondayStr, sundayStr]
    )
    const weekPoints = pointsRows[0]?.points || 0

    res.json({
      code: 200,
      data: { totalTasks: total, completedTasks: completed, completionRate, weekPoints },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取周报统计失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

// 8. 周报每日趋势
router.get('/report/weekly-trend', async (req, res) => {
  const { childId } = req.query
  if (!childId) return res.json({ code: 400, msg: '缺少孩子ID', data: null })

  try {
    const today = new Date()
    const dayOfWeek = today.getDay() || 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + 1)

    const weekDays = ['一', '二', '三', '四', '五', '六', '日']
    const points = []
    const tasks = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const [pRows] = await db.query(
        `SELECT COALESCE(SUM(\`change\`), 0) AS points FROM points_log WHERE child_id = ? AND type = 'earn' AND DATE(created_at) = ?`,
        [childId, dateStr]
      )
      points.push(pRows[0]?.points || 0)

      const [tRows] = await db.query(
        `SELECT COUNT(*) AS count FROM task_instance WHERE child_id = ? AND status = 1 AND DATE(created_at) = ?`,
        [childId, dateStr]
      )
      tasks.push(tRows[0]?.count || 0)
    }

    res.json({
      code: 200,
      data: {
        days: weekDays,
        points: points,
        tasks: tasks,
        maxPoints: Math.max(...points, 1),
        maxTasks: Math.max(...tasks, 1)
      },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取周报趋势失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

module.exports = router