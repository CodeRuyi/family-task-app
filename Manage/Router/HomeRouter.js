const express = require('express')
const router = express.Router()
const db = require('../db/index')

// ============================================================
// 首页数据接口
// ============================================================
router.get('/home/index', async (req, res) => {
  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ code: 400, msg: '缺少用户ID' })
  }

  try {
    const [userRows] = await db.query(
      'SELECT id, nickname, phone, role, avatar FROM user WHERE id = ?',
      [userId]
    )
    if (userRows.length === 0) {
      return res.status(404).json({ code: 404, msg: '用户不存在' })
    }
    const user = userRows[0]

    let childIds = []
    let childInfo = null
    let classInfo = null
    let childList = []

    if (user.role === 1) {
      const [childRows] = await db.query(
        `SELECT fm.user_id AS child_id, u.nickname, u.avatar
         FROM family_member fm
         JOIN user u ON fm.user_id = u.id
         WHERE fm.family_id IN (
           SELECT family_id FROM family_member WHERE user_id = ? AND relation = 'parent'
         ) AND fm.relation = 'child' AND fm.is_active = 1`,
        [userId]
      )
      childList = childRows
      childIds = childRows.map(row => row.child_id)
      if (childRows.length > 0) {
        childInfo = {
          id: childRows[0].child_id,
          nickname: childRows[0].nickname,
          avatar: childRows[0].avatar
        }
      }
    } else if (user.role === 2) {
      childIds = [userId]
      childInfo = { id: userId, nickname: user.nickname, avatar: user.avatar }
      childList = [{ child_id: userId, nickname: user.nickname, avatar: user.avatar }]
    }

    if (childIds.length > 0) {
      const [classRows] = await db.query(
        `SELECT c.id, c.class_name
         FROM student_class sc
         JOIN class c ON sc.class_id = c.id
         WHERE sc.child_id = ? LIMIT 1`,
        [childIds[0]]
      )
      if (classRows.length > 0) {
        classInfo = classRows[0]
      }
    }

    let todayTasks = { total: 0, completed: 0, list: [] }
    if (childIds.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const placeholders = childIds.map(() => '?').join(',')
      const [taskRows] = await db.query(
        `SELECT id, title, description, points, deadline, status
         FROM task_instance
         WHERE child_id IN (${placeholders})
           AND DATE(created_at) <= ?
           AND (deadline IS NULL OR DATE(deadline) >= ?)
         ORDER BY status ASC, deadline ASC
         LIMIT 20`,
        [...childIds, today, today]
      )
      const completedCount = taskRows.filter(t => t.status === 1).length
      todayTasks = { total: taskRows.length, completed: completedCount, list: taskRows }
    }

    let pendingCount = 0
    if (childIds.length > 0) {
      const placeholders = childIds.map(() => '?').join(',')
      const [pendingRows] = await db.query(
        `SELECT COUNT(*) AS count
         FROM task_submission
         WHERE child_id IN (${placeholders}) AND review_status = 0`,
        childIds
      )
      pendingCount = pendingRows[0]?.count || 0
    }

    const [commonTaskRows] = await db.query(
      `SELECT id, name, category, description, min_points
       FROM task_template
       WHERE is_enabled = 1
       ORDER BY usage_count DESC
       LIMIT 4`
    )

    let dynamics = []
    if (childIds.length > 0) {
      const placeholders = childIds.map(() => '?').join(',')
      const [taskDynamics] = await db.query(
        `SELECT 'task' AS type, ts.submitted_at AS time,
         CONCAT(u.nickname, '完成了「', ti.title, '」+', ti.points, '积分') AS content
         FROM task_submission ts
         JOIN task_instance ti ON ts.task_id = ti.id
         JOIN user u ON ts.child_id = u.id
         WHERE ts.child_id IN (${placeholders}) AND ts.review_status = 1
         ORDER BY ts.submitted_at DESC
         LIMIT 10`,
        childIds
      )
      dynamics = dynamics.concat(taskDynamics)

      const [badgeDynamics] = await db.query(
        `SELECT 'badge' AS type, ub.gain_time AS time,
         CONCAT(u.nickname, '获得「', b.name, '」勋章') AS content
         FROM user_badge ub
         JOIN user u ON ub.student_id = u.id
         JOIN badge b ON ub.badge_id = b.id
         WHERE ub.student_id IN (${placeholders})
         ORDER BY ub.gain_time DESC
         LIMIT 10`,
        childIds
      )
      dynamics = dynamics.concat(badgeDynamics)
    }
    dynamics.sort((a, b) => new Date(b.time) - new Date(a.time))
    dynamics = dynamics.slice(0, 5)

    res.json({
      code: 200,
      data: {
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          phone: user.phone
        },
        child: childInfo ? {
          id: childInfo.id,
          nickname: childInfo.nickname,
          avatar: childInfo.avatar,
          class_name: classInfo?.class_name || '未分班',
          class_id: classInfo?.id || null
        } : null,
        childList: childList,
        todayTasks: todayTasks,
        pendingCount: pendingCount,
        commonTasks: commonTaskRows.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          points: t.min_points
        })),
        dynamics: dynamics.map(d => ({
          type: d.type,
          content: d.content,
          time: d.time
        }))
      },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取首页数据失败:', err)
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// ============================================================
// 全部动态接口
// ============================================================
router.get('/home/dynamics', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.json({ code: 400, msg: '缺少用户ID' })

  try {
    const [userRows] = await db.query('SELECT id, role FROM user WHERE id = ?', [userId])
    if (userRows.length === 0) return res.json({ code: 404, msg: '用户不存在' })
    const user = userRows[0]

    let childIds = []
    if (user.role === 1) {
      const [rows] = await db.query(
        `SELECT fm.user_id AS child_id FROM family_member fm WHERE fm.family_id IN (
          SELECT family_id FROM family_member WHERE user_id = ? AND relation = 'parent'
        ) AND fm.relation = 'child' AND fm.is_active = 1`,
        [userId]
      )
      childIds = rows.map(r => r.child_id)
    } else if (user.role === 2) {
      childIds = [userId]
    }

    let dynamics = []
    if (childIds.length > 0) {
      const p = childIds.map(() => '?').join(',')
      const [task] = await db.query(
        `SELECT 'task' AS type, ts.submitted_at AS time,
         CONCAT(u.nickname, '完成了「', ti.title, '」+', ti.points, '积分') AS content,
         ts.submitted_at AS sort_time
         FROM task_submission ts
         JOIN task_instance ti ON ts.task_id = ti.id
         JOIN user u ON ts.child_id = u.id
         WHERE ts.child_id IN (${p}) AND ts.review_status = 1
         ORDER BY ts.submitted_at DESC`,
        childIds
      )
      dynamics = dynamics.concat(task)
      const [badge] = await db.query(
        `SELECT 'badge' AS type, ub.gain_time AS time,
         CONCAT(u.nickname, '获得「', b.name, '」勋章') AS content,
         ub.gain_time AS sort_time
         FROM user_badge ub
         JOIN user u ON ub.student_id = u.id
         JOIN badge b ON ub.badge_id = b.id
         WHERE ub.student_id IN (${p})
         ORDER BY ub.gain_time DESC`,
        childIds
      )
      dynamics = dynamics.concat(badge)
    }
    dynamics.sort((a, b) => new Date(b.sort_time) - new Date(a.sort_time))

    res.json({
      code: 200,
      data: dynamics.map(d => ({ type: d.type, content: d.content, time: d.time })),
      msg: 'success'
    })
  } catch (err) {
    res.json({ code: 500, msg: err.message })
  }
})

// ============================================================
// 快速发布任务（支持自定义任务，也支持模板）
// ============================================================
// task_instance.deadline 为 NOT NULL 且无默认值，未传截止时间时
// 统一兜底为「今天 23:59:59」，否则会报 Column 'deadline' cannot be null。
function normalizeDeadline(value) {
  const fallback = () => {
    const d = new Date()
    d.setHours(23, 59, 59, 0)
    return d
  }
  if (value === undefined || value === null || value === '') return fallback()
  const d = new Date(value)
  return isNaN(d.getTime()) ? fallback() : d
}

router.post('/task/quick-publish', async (req, res) => {
  let { template_id, family_id, child_id, title, points, deadline, description, created_by } = req.body

  // 参数校验
  if (!family_id) {
    return res.json({ code: 400, msg: '缺少家庭ID', data: null })
  }
  if (!child_id) {
    return res.json({ code: 400, msg: '请选择孩子', data: null })
  }
  if (!title || !title.trim()) {
    return res.json({ code: 400, msg: '请输入任务标题', data: null })
  }
  if (!points || points <= 0) {
    return res.json({ code: 400, msg: '请输入有效积分', data: null })
  }

  try {
    let finalTitle = title.trim()
    let finalPoints = Number(points)
    let finalDescription = description || ''
    let finalDeadline = normalizeDeadline(deadline)
    let finalCreatedBy = created_by || 1
    let finalTemplateId = null

    // 如果传了 template_id，且模板存在，则使用模板的默认值作为补充
    if (template_id) {
      const [templateRows] = await db.query(
        'SELECT name, min_points, description FROM task_template WHERE id = ? AND is_enabled = 1',
        [template_id]
      )
      if (templateRows.length > 0) {
        const template = templateRows[0]
        // 如果用户没有自定义标题，使用模板名称
        if (!title || !title.trim()) {
          finalTitle = template.name
        }
        // 如果用户没有自定义积分，使用模板积分
        if (!points || points <= 0) {
          finalPoints = template.min_points
        }
        // 如果用户没有自定义描述，使用模板描述
        if (!description) {
          finalDescription = template.description || ''
        }
        finalTemplateId = template_id
        // 更新模板使用次数
        await db.query(
          'UPDATE task_template SET usage_count = usage_count + 1 WHERE id = ?',
          [template_id]
        )
      }
    }

    // 插入任务实例
    const [result] = await db.query(
      `INSERT INTO task_instance 
       (template_id, family_id, child_id, title, description, points, deadline, 
        need_photo, need_location, repeat_type, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, NOW())`,
      [
        finalTemplateId,
        family_id,
        child_id,
        finalTitle,
        finalDescription,
        finalPoints,
        finalDeadline,
        finalCreatedBy
      ]
    )

    res.json({
      code: 200,
      msg: '任务发布成功',
      data: { taskId: result.insertId }
    })
  } catch (err) {
    console.error('快速发布任务失败:', err)
    res.json({ code: 500, msg: err.message, data: null })
  }
})

module.exports = router