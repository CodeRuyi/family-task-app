const express = require('express')
const router = express.Router()
const pool = require('../db/index.js')

/**
 * 统一的数据库错误处理：避免未捕获的 Promise 异常直接把整个 Node 进程打挂。
 * 三端共用同一后端，任何一个账号查询导致的进程崩溃都会让全部端不可用。
 */
function handleDbError(res, err, tag) {
  console.error(`[UserRouter] ${tag}:`, err.sqlMessage || err.message)
  return res.json({ code: 500, msg: '服务器异常', data: null })
}

// ========== 获取用户信息（含家庭名称、积分） ==========
router.get('/user/info', async (req, res) => {
  const { userId } = req.query
  if (!userId) {
    return res.json({ code: 400, msg: '缺少用户ID', data: null })
  }
  const uid = Number(userId)
  if (isNaN(uid)) {
    return res.json({ code: 400, msg: '用户ID非法', data: null })
  }

  try {
    // 注意：family_member 一个用户可能出现在多行，需去重后再取家庭名，
    // 否则 JOIN 会产生重复行，userRows[0] 虽可用但结果不稳定。
    const [userRows] = await pool.query(
      `SELECT u.id, u.phone, u.nickname, u.avatar, u.role, u.status,
              (SELECT f.family_name
                 FROM family_member fm
                 JOIN family f ON fm.family_id = f.id
                WHERE fm.user_id = u.id
                LIMIT 1) AS family_name
         FROM user u
        WHERE u.id = ?`,
      [uid]
    )

    if (userRows.length === 0) {
      return res.json({ code: 404, msg: '用户不存在', data: null })
    }
    const user = userRows[0]

    // 查询积分。
    // ⚠️ change 是 MySQL 保留字，必须用反引号包裹，否则会触发 ER_PARSE_ERROR。
    let totalPoints = 0
    try {
      const [pointsRows] = await pool.query(
        'SELECT IFNULL(SUM(`change`), 0) AS totalPoints FROM points_log WHERE child_id = ?',
        [uid]
      )
      totalPoints = Number(pointsRows[0]?.totalPoints) || 0
    } catch (e) {
      // 积分表异常不应影响用户信息主体返回
      console.error('[UserRouter] 积分查询失败:', e.sqlMessage || e.message)
    }

    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        userInfo: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar || '',
          role: user.role,
          family_name: user.family_name || '未加入家庭',
          points: totalPoints
        }
      }
    })
  } catch (err) {
    return handleDbError(res, err, '获取用户信息异常')
  }
})

// ========== 更新用户信息（昵称、头像、手机号） ==========
router.put('/user/updateSelf', async (req, res) => {
  const { userId, nickname, avatar, phone } = req.body
  if (!userId) {
    return res.json({ code: 400, msg: '缺少用户ID', data: null })
  }
  const uid = Number(userId)
  if (isNaN(uid)) {
    return res.json({ code: 400, msg: '用户ID非法', data: null })
  }

  const fields = []
  const values = []
  if (nickname !== undefined) {
    fields.push('nickname = ?')
    values.push(nickname)
  }
  if (avatar !== undefined) {
    fields.push('avatar = ?')
    values.push(avatar)
  }
  if (phone !== undefined) {
    fields.push('phone = ?')
    values.push(phone)
  }
  if (fields.length === 0) {
    return res.json({ code: 400, msg: '没有要更新的字段', data: null })
  }
  values.push(uid)

  try {
    const [result] = await pool.query(`UPDATE user SET ${fields.join(', ')} WHERE id = ?`, values)
    if (result.affectedRows > 0) {
      // 同时返回最新的用户资料，便于前端直接刷新
      const [rows] = await pool.query(
        'SELECT id, phone, nickname, avatar, role FROM user WHERE id = ?',
        [uid]
      )
      return res.json({ code: 200, msg: '更新成功', data: { userInfo: rows[0] } })
    }
    return res.json({ code: 404, msg: '用户不存在', data: null })
  } catch (err) {
    return handleDbError(res, err, '更新用户信息异常')
  }
})

// ========== 修改密码 ==========
router.put('/user/password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body
  if (!userId || !oldPassword || !newPassword) {
    return res.json({ code: 400, msg: '缺少必要参数', data: null })
  }
  const uid = Number(userId)
  if (isNaN(uid)) {
    return res.json({ code: 400, msg: '用户ID非法', data: null })
  }
  if (String(newPassword).length < 6) {
    return res.json({ code: 400, msg: '新密码长度不能少于6位', data: null })
  }

  try {
    const [rows] = await pool.query('SELECT password FROM user WHERE id = ?', [uid])
    if (rows.length === 0) {
      return res.json({ code: 404, msg: '用户不存在', data: null })
    }
    if (rows[0].password !== oldPassword) {
      return res.json({ code: 400, msg: '原密码错误', data: null })
    }
    await pool.query('UPDATE user SET password = ? WHERE id = ?', [newPassword, uid])
    // 统一使用 code:200 作为成功标识（前端拦截器按 200/0 判定）
    return res.json({ code: 200, msg: '密码修改成功', data: null })
  } catch (err) {
    return handleDbError(res, err, '修改密码异常')
  }
})

module.exports = router
