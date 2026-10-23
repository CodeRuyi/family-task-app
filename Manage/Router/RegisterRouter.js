const express = require('express')
const router = express.Router()
const pool = require('../db/index')
const bcrypt = require('bcrypt')

/**
 * 教师注册接口
 *
 * 角色约定（与小程序端 complete-info 页面保持一致）：
 *   1 = 家长, 2 = 孩子, 3 = 班主任, 4 = 学校管理员, 5 = 单科老师
 *
 * 说明：user_class / teacher_subject_class 的写入放在事务中，
 * 任一步失败整体回滚，避免出现「用户已建但未绑定班级」的脏数据。
 */
router.post('/register', async (req, res) => {
  const { phone, nickname, password, className, role, subjectName } = req.body

  // 非空校验
  if (!phone || !nickname || !password || !className || !role) {
    return res.json({ code: 400, msg: '信息不能为空，请完整填写注册信息', data: null })
  }
  if (!/^1\d{10}$/.test(phone)) {
    return res.json({ code: 400, msg: '手机号格式不正确', data: null })
  }
  if (String(password).length < 6) {
    return res.json({ code: 400, msg: '密码长度不能少于6位', data: null })
  }

  const conn = await pool.getConnection()
  try {
    // 手机号查重
    const [userList] = await conn.query('SELECT id FROM user WHERE phone = ?', [phone])
    if (userList.length > 0) {
      return res.json({ code: 400, msg: '该手机号已注册', data: null })
    }

    // 根据班级名称查班级id
    const [classInfo] = await conn.query('SELECT id FROM class WHERE class_name = ? ORDER BY id LIMIT 1', [className])
    if (classInfo.length === 0) {
      return res.json({ code: 400, msg: '该班级不存在，请选择正确班级', data: null })
    }
    const classId = classInfo[0].id

    // 单科老师需要校验科目
    let subjectId = null
    if (Number(role) === 5) {
      if (!subjectName) {
        return res.json({ code: 400, msg: '请选择任教学科', data: null })
      }
      const [subjectRow] = await conn.query('SELECT id FROM subject WHERE subject_name = ?', [subjectName])
      if (subjectRow.length === 0) {
        return res.json({ code: 400, msg: '所选科目不存在', data: null })
      }
      subjectId = subjectRow[0].id
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10)
    const hashPwd = await bcrypt.hash(password, salt)

    await conn.beginTransaction()

    // 插入 user 表
    const [insertRes] = await conn.query(
      'INSERT INTO user(phone, nickname, password, status, role, avatar) VALUES (?,?,?,1,?,?)',
      [phone, nickname, hashPwd, role, '']
    )
    const newUserId = insertRes.insertId

    // 班主任 / 单科老师都要写入 user_class 作为班级权限依据
    const roleType = Number(role) === 3 ? 'class_teacher' : 'subject_teacher'
    await conn.query(
      'INSERT INTO user_class(user_id, class_id, role_type) VALUES (?,?,?)',
      [newUserId, classId, roleType]
    )

    // 单科老师额外写入 teacher_subject_class
    if (Number(role) === 5) {
      await conn.query(
        'INSERT INTO teacher_subject_class(user_id, subject_id, class_id) VALUES (?,?,?)',
        [newUserId, subjectId, classId]
      )
    }

    await conn.commit()
    res.json({ code: 200, msg: '注册成功', data: { userId: newUserId, classId } })
  } catch (err) {
    try {
      await conn.rollback()
    } catch (rollbackErr) {
      console.error('注册回滚失败:', rollbackErr.message)
    }
    console.error('注册失败:', err.sqlMessage || err.message)
    res.json({ code: 500, msg: '注册失败，请稍后重试', data: null })
  } finally {
    conn.release()
  }
})

module.exports = router
