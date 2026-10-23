const express = require('express')
const router = express.Router()
const db = require('../db/index')

// ============================================================
// 1. 获取顶部勋章统计卡片
// ============================================================
router.get('/medal/stats', async (req, res) => {
  const { classId } = req.query

  if (!classId) {
    return res.status(400).json({ code: 400, msg: '缺少班级ID参数', data: [] })
  }

  try {
    const sql = `
      SELECT 
        b.id AS medalId,
        b.name AS medalName,
        b.icon,
        b.description AS ruleDesc,
        COUNT(ub.id) AS gainCount
      FROM badge b
      LEFT JOIN user_badge ub ON b.id = ub.badge_id AND ub.class_id = ?
      GROUP BY b.id
      ORDER BY b.id
    `
    const [rows] = await db.query(sql, [classId])
    res.json({ code: 200, data: rows, msg: 'success' })
  } catch (err) {
    console.error('获取勋章统计失败:', err)
    res.status(500).json({ code: 500, msg: err.message, data: [] })
  }
})

// ============================================================
// 2. 分页查询勋章获得记录
// ============================================================
router.get('/medal/record', async (req, res) => {
  const { classId, page = 1, pageSize = 10 } = req.query

  if (!classId) {
    return res.status(400).json({ code: 400, msg: '缺少班级ID参数', data: { total: 0, list: [] } })
  }

  const offset = (page - 1) * pageSize

  try {
    // 查询总条数
    const [totalRes] = await db.query(
      'SELECT COUNT(*) AS total FROM user_badge WHERE class_id = ?',
      [classId]
    )
    const total = totalRes[0]?.total || 0

    // 🔥 修正：使用 student_id 和 gain_time
    const listSql = `
      SELECT 
        ub.id AS recordId,
        u_student.nickname AS studentName,
        b.name AS medalName,
        b.icon AS medalIcon,
        DATE_FORMAT(ub.gain_time, '%Y-%m-%d') AS getTime,
        u_teacher.nickname AS teacherName
      FROM user_badge ub
      LEFT JOIN user u_student ON ub.student_id = u_student.id
      LEFT JOIN user u_teacher ON ub.teacher_id = u_teacher.id
      LEFT JOIN badge b ON ub.badge_id = b.id
      WHERE ub.class_id = ?
      ORDER BY ub.gain_time DESC
      LIMIT ? OFFSET ?
    `
    const [list] = await db.query(listSql, [classId, Number(pageSize), Number(offset)])

    res.json({
      code: 200,
      data: { total, list },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取勋章记录失败:', err)
    res.status(500).json({ code: 500, msg: err.message, data: { total: 0, list: [] } })
  }
})

// ============================================================
// 3. 单条勋章详情
// ============================================================
router.get('/medal/record/:recordId', async (req, res) => {
  const { recordId } = req.params

  if (!recordId) {
    return res.status(400).json({ code: 400, msg: '缺少记录ID参数' })
  }

  try {
    const sql = `
      SELECT 
        ub.id,
        ub.student_id,
        ub.badge_id,
        ub.teacher_id,
        ub.class_id,
        DATE_FORMAT(ub.gain_time, '%Y-%m-%d %H:%i') AS gainTime,
        u_student.nickname AS studentName,
        b.name AS badge_name,
        b.description AS rule_text,
        u_teacher.nickname AS teacherName
      FROM user_badge ub
      LEFT JOIN user u_student ON ub.student_id = u_student.id
      LEFT JOIN user u_teacher ON ub.teacher_id = u_teacher.id
      LEFT JOIN badge b ON ub.badge_id = b.id
      WHERE ub.id = ?
    `
    const [rows] = await db.query(sql, [recordId])

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, msg: '记录不存在' })
    }

    res.json({ code: 200, data: rows[0], msg: 'success' })
  } catch (err) {
    console.error('获取勋章详情失败:', err)
    res.status(500).json({ code: 500, msg: err.message })
  }
})
// ============================================================
// 4. 颁发勋章（新增）
// ============================================================
router.post('/medal/award', async (req, res) => {
  const { student_id, badge_id, teacher_id, class_id } = req.body

  // 参数校验
  if (!student_id || !badge_id || !teacher_id || !class_id) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' })
  }

  try {
    // 检查是否已拥有该勋章
    const [existCheck] = await db.query(
      'SELECT id FROM user_badge WHERE student_id = ? AND badge_id = ?',
      [student_id, badge_id]
    )
    if (existCheck.length > 0) {
      return res.status(400).json({ code: 400, msg: '该学生已拥有此勋章' })
    }

    // 插入颁发记录
    const sql = `
      INSERT INTO user_badge (student_id, badge_id, teacher_id, class_id, gain_time)
      VALUES (?, ?, ?, ?, NOW())
    `
    await db.query(sql, [student_id, badge_id, teacher_id, class_id])

    res.json({ code: 200, msg: '颁发成功' })
  } catch (err) {
    console.error('颁发勋章失败:', err)
    res.status(500).json({ code: 500, msg: err.message })
  }
})
module.exports = router