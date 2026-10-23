const express = require('express')
const router = express.Router()
const db = require('../db/index')  // 使用 db 而不是 pool，保持统一

// ============================================================
// 1. 获取顶部统计数字
// ============================================================
router.get('/family/stats', async (req, res) => {
  try {
    // 总绑定家长数（审核通过）
    const [totalBind] = await db.query(
      `SELECT COUNT(*) AS total FROM family WHERE audit_status = 'approved'`
    )
    // 今日新增申请（今天创建且待审核）
    const [todayAdd] = await db.query(
      `SELECT COUNT(*) AS count FROM family 
       WHERE DATE(created_at) = CURDATE() AND audit_status = 'wait'`
    )
    // 待审核申请数
    const [waitAudit] = await db.query(
      `SELECT COUNT(*) AS count FROM family WHERE audit_status = 'wait'`
    )

    res.json({
      code: 200,
      data: {
        totalBindParent: totalBind[0]?.total || 0,
        todayNewApply: todayAdd[0]?.count || 0,
        waitAuditNum: waitAudit[0]?.count || 0
      },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取家庭统计失败:', err)
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// ============================================================
// 2. 家庭列表分页（待审核/已绑定）
//    type: 0 待审核 (audit_status='wait')
//          1 已绑定 (audit_status='approved')
// ============================================================
router.get('/family/list', async (req, res) => {
  const { page = 1, pageSize = 10, type = 0, keyword = '' } = req.query
  const offset = (page - 1) * pageSize

  // 根据 type 决定状态
  const status = type == 0 ? 'wait' : 'approved'

  try {
    // 主查询：关联 user（家长）、family_member（学生）、user（学生）、student_class、class
    let sql = `
      SELECT 
        f.id,
        u_parent.nickname AS parent_name,
        u_parent.phone AS parent_phone,
        u_student.nickname AS student_name,
        c.class_name,
        f.created_at,
        f.audit_status
      FROM family f
      LEFT JOIN user u_parent ON f.owner_id = u_parent.id
      LEFT JOIN family_member fm ON f.id = fm.family_id AND fm.relation = 'child'
      LEFT JOIN user u_student ON fm.user_id = u_student.id
      LEFT JOIN student_class sc ON u_student.id = sc.child_id
      LEFT JOIN class c ON sc.class_id = c.id
      WHERE f.audit_status = ?
    `
    const params = [status]

    // 关键词搜索（家长姓名/手机号/学生姓名）
    if (keyword && keyword.trim()) {
      sql += ` AND (
        u_parent.nickname LIKE ? OR 
        u_parent.phone LIKE ? OR 
        u_student.nickname LIKE ?
      )`
      const kw = `%${keyword.trim()}%`
      params.push(kw, kw, kw)
    }

    sql += ` ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
    params.push(Number(pageSize), Number(offset))

    const [list] = await db.query(sql, params)

    // 统计总条数（同样条件）
    let countSql = `
      SELECT COUNT(*) AS total
      FROM family f
      LEFT JOIN user u_parent ON f.owner_id = u_parent.id
      LEFT JOIN family_member fm ON f.id = fm.family_id AND fm.relation = 'child'
      LEFT JOIN user u_student ON fm.user_id = u_student.id
      WHERE f.audit_status = ?
    `
    const countParams = [status]
    if (keyword && keyword.trim()) {
      countSql += ` AND (
        u_parent.nickname LIKE ? OR 
        u_parent.phone LIKE ? OR 
        u_student.nickname LIKE ?
      )`
      const kw = `%${keyword.trim()}%`
      countParams.push(kw, kw, kw)
    }
    const [totalRow] = await db.query(countSql, countParams)

    res.json({
      code: 200,
      data: {
        list,
        total: totalRow[0]?.total || 0,
        page: Number(page),
        pageSize: Number(pageSize)
      },
      msg: 'success'
    })
  } catch (err) {
    console.error('获取家庭列表失败:', err)
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// ============================================================
// 3. 单条审核（通过/驳回）
//    前端传 status: 'approved' 或 'rejected'
//    也兼容数字：1=>approved, 2=>rejected
// ============================================================
router.put('/family/audit/:id', async (req, res) => {
  const { id } = req.params
  let { status } = req.body

  // 兼容数字参数
  if (status === 1 || status === '1') status = 'approved'
  else if (status === 2 || status === '2') status = 'rejected'

  // 验证状态值
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ code: 400, msg: '状态值无效，必须为 approved 或 rejected' })
  }

  try {
    const [result] = await db.query(
      'UPDATE family SET audit_status = ? WHERE id = ?',
      [status, id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, msg: '记录不存在' })
    }
    res.json({ code: 200, msg: '操作成功' })
  } catch (err) {
    console.error('审核操作失败:', err)
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// ============================================================
// 4. 批量审核
//    前端传 ids 数组和 status: 'approved' 或 'rejected'
// ============================================================
router.put('/family/batchAudit', async (req, res) => {
  const { ids, status } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ code: 400, msg: '请选择要审核的记录' })
  }

  let finalStatus = status
  if (status === 1 || status === '1') finalStatus = 'approved'
  else if (status === 2 || status === '2') finalStatus = 'rejected'

  if (!['approved', 'rejected'].includes(finalStatus)) {
    return res.status(400).json({ code: 400, msg: '状态值无效，必须为 approved 或 rejected' })
  }

  try {
    // 使用参数化查询防止注入
    const placeholders = ids.map(() => '?').join(',')
    const sql = `UPDATE family SET audit_status = ? WHERE id IN (${placeholders})`
    await db.query(sql, [finalStatus, ...ids])
    res.json({ code: 200, msg: '批量操作完成' })
  } catch (err) {
    console.error('批量审核失败:', err)
    res.status(500).json({ code: 500, msg: err.message })
  }
})

module.exports = router