const express = require('express');
const router = express.Router();
const db = require('../db/index');

const genBindCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const genInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let str = '';
  for (let i = 0; i < 12; i++) str += chars[Math.floor(Math.random() * chars.length)];
  return `${str.slice(0,4)}-${str.slice(4,8)}-${str.slice(8,12)}`;
};

router.get('/class/stats', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM class');
    const total = rows[0]?.total || 0;
    res.json({ code: 200, data: { total }, msg: '成功' });
  } catch (err) {
    console.error('获取班级统计失败:', err);
    res.status(500).json({ code: 500, msg: '获取班级统计失败' });
  }
});

router.get('/class/list', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, class_name AS className, grade, invite_code FROM class ORDER BY id');
    res.json({ code: 200, data: rows, msg: '成功' });
  } catch (err) {
    console.error('获取班级列表失败:', err);
    res.status(500).json({ code: 500, data: [], msg: '获取班级列表失败' });
  }
});

router.get('/class/studentList', async (req, res) => {
  const { classId, keyword, page = 1, size = 10 } = req.query;
  if (!classId) {
    return res.json({ code: 400, msg: '缺少班级ID', data: [] });
  }
  const offset = (page - 1) * size;
  let sql = `
    SELECT u.id, u.nickname, u.avatar, u.role, u.phone, sc.bind_code
    FROM user u
    INNER JOIN student_class sc ON u.id = sc.child_id
    WHERE sc.class_id = ? AND u.role = 2
  `;
  let countSql = `
    SELECT COUNT(*) AS total
    FROM user u
    INNER JOIN student_class sc ON u.id = sc.child_id
    WHERE sc.class_id = ? AND u.role = 2
  `;
  const params = [classId];
  if (keyword && keyword.trim()) {
    sql += ' AND u.nickname LIKE ?';
    countSql += ' AND u.nickname LIKE ?';
    params.push(`%${keyword.trim()}%`);
  }
  sql += ' ORDER BY u.id DESC LIMIT ? OFFSET ?';
  const countParams = [...params];
  params.push(Number(size), Number(offset));

  try {
    const [rows] = await db.query(sql, params);
    const [countRes] = await db.query(countSql, countParams);
    const total = countRes[0]?.total || 0;
    res.json({ code: 200, data: rows, total, msg: '成功' });
  } catch (err) {
    console.error('获取学生列表失败:', err);
    res.status(500).json({ code: 500, msg: '获取学生列表失败' });
  }
});

// ========== 班级详情 ==========
router.get('/class/detail/:classId', async (req, res) => {
  const { classId } = req.params;
  try {
    const classSql = 'SELECT id, class_name AS className, grade, invite_code FROM class WHERE id = ?';
    const [classRes] = await db.query(classSql, [classId]);
    if (classRes.length === 0) {
      return res.json({ code: 404, msg: '班级不存在', data: null });
    }

    const countSql = 'SELECT COUNT(*) AS student_num FROM student_class WHERE class_id = ?';
    const [countRes] = await db.query(countSql, [classId]);

    // ✅ teacher_subject_class 表中字段为 user_id（已验证）
    // ⚠️ 角色约定：1=家长 2=孩子 3=班主任 4=学校管理员 5=单科老师
    //    教师角色是 3/4/5，不能再用 role=1（那是家长）。
    //    优先取班主任，其次任取一位任课教师。
    const teacherSql = `
      SELECT u.id, u.nickname, u.phone
      FROM user u
      INNER JOIN teacher_subject_class tsc ON u.id = tsc.user_id
      WHERE tsc.class_id = ? AND u.role IN (3, 4, 5)
      ORDER BY FIELD(u.role, 3, 4, 5), u.id
      LIMIT 1
    `;
    const [teacherRes] = await db.query(teacherSql, [classId]);

    // 兜底：teacher_subject_class 无记录时，从 user_class 找班主任
    let masterTeacher = teacherRes[0] || null;
    if (!masterTeacher) {
      const [ucRes] = await db.query(
        `SELECT u.id, u.nickname, u.phone
           FROM user_class uc
           JOIN user u ON uc.user_id = u.id
          WHERE uc.class_id = ? AND u.role IN (3, 4, 5)
          ORDER BY FIELD(u.role, 3, 4, 5), u.id
          LIMIT 1`,
        [classId]
      );
      masterTeacher = ucRes[0] || null;
    }

    res.json({
      code: 200,
      data: {
        ...classRes[0],
        student_num: countRes[0]?.student_num || 0,
        master_teacher: masterTeacher
      },
      msg: '成功'
    });
  } catch (err) {
    console.error('获取班级详情失败:', err);
    res.status(500).json({ code: 500, msg: '获取班级详情失败', data: null });
  }
});

router.post('/class/refresh-code/:classId', async (req, res) => {
  const { classId } = req.params;
  const newCode = genInviteCode();
  try {
    await db.query('UPDATE class SET invite_code = ? WHERE id = ?', [newCode, classId]);
    res.json({ code: 200, msg: '刷新成功', data: newCode });
  } catch (err) {
    console.error('刷新邀请码失败:', err);
    res.status(500).json({ code: 500, msg: '刷新邀请码失败' });
  }
});

router.get('/class/qrcode/:classId', async (req, res) => {
  const { classId } = req.params;
  res.json({ code: 200, msg: '成功', data: { classId, qrcodeUrl: `/qrcode/class/${classId}` } });
});

// ========== 班级教师列表 ==========
router.get('/class/teacher/:classId', async (req, res) => {
  const { classId } = req.params;
  try {
    // ✅ teacher_subject_class 表中字段为 user_id（已验证）
    // ⚠️ 教师角色是 3/4/5，role=1 是家长，不能用作教师筛选条件。
    //    合并 teacher_subject_class 与 user_class 两处绑定，按 id 去重。
    const sql = `
      SELECT u.id, u.nickname, u.phone, u.role,
             GROUP_CONCAT(DISTINCT uc.role_type) AS role_type
      FROM user u
      LEFT JOIN user_class uc ON uc.user_id = u.id AND uc.class_id = ?
      WHERE u.role IN (3, 4, 5)
        AND (
          EXISTS (SELECT 1 FROM teacher_subject_class tsc WHERE tsc.user_id = u.id AND tsc.class_id = ?)
          OR EXISTS (SELECT 1 FROM user_class uc2 WHERE uc2.user_id = u.id AND uc2.class_id = ?)
        )
      GROUP BY u.id, u.nickname, u.phone, u.role
      ORDER BY FIELD(u.role, 3, 4, 5), u.id
    `;
    const [rows] = await db.query(sql, [classId, classId, classId]);
    res.json({ code: 200, data: rows, msg: '成功' });
  } catch (err) {
    console.error('查询教师失败:', err);
    res.status(500).json({ code: 500, msg: '查询教师失败' });
  }
});

router.get('/class/student-all/:classId', async (req, res) => {
  const { classId } = req.params;
  try {
    const sql = `
      SELECT u.id, u.nickname, u.phone, u.avatar, sc.bind_code
      FROM student_class sc
      LEFT JOIN user u ON sc.child_id = u.id
      WHERE sc.class_id = ? AND u.role = 2
      ORDER BY u.id ASC
    `;
    const [rows] = await db.query(sql, [classId]);
    res.json({ code: 200, data: rows, msg: '成功' });
  } catch (err) {
    console.error('查询学生失败:', err);
    res.status(500).json({ code: 500, msg: '查询学生失败' });
  }
});

router.post('/student/gen-code/:userId', async (req, res) => {
  const { userId } = req.params;
  const code = genBindCode();
  try {
    const [result] = await db.query('UPDATE student_class SET bind_code = ? WHERE child_id = ?', [code, userId]);
    if (result.affectedRows === 0) {
      return res.json({ code: 404, msg: '学生不存在或未关联班级' });
    }
    res.json({ code: 200, msg: '生成成功', data: code });
  } catch (err) {
    console.error('生成绑定码失败:', err);
    res.status(500).json({ code: 500, msg: '生成绑定码失败' });
  }
});

router.post('/student/batch-gen-code', async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.json({ code: 400, msg: '请选择学生' });
  }
  try {
    const results = [];
    for (const id of userIds) {
      const code = genBindCode();
      const [result] = await db.query('UPDATE student_class SET bind_code = ? WHERE child_id = ?', [code, id]);
      results.push({ userId: id, success: result.affectedRows > 0, code });
    }
    const successCount = results.filter(r => r.success).length;
    res.json({
      code: 200,
      msg: `批量生成成功，成功 ${successCount} 个，失败 ${userIds.length - successCount} 个`,
      data: results
    });
  } catch (err) {
    console.error('批量生成绑定码失败:', err);
    res.status(500).json({ code: 500, msg: '批量生成绑定码失败' });
  }
});
// ========== 更新班级信息 ==========
router.put('/class/update/:classId', async (req, res) => {
  const { classId } = req.params
  const { class_name, grade } = req.body
  if (!class_name || !class_name.trim()) {
    return res.json({ code: 400, msg: '班级名称不能为空' })
  }
  try {
    await db.query(
      'UPDATE class SET class_name = ?, grade = ? WHERE id = ?',
      [class_name.trim(), grade || null, classId]
    )
    res.json({ code: 200, msg: '更新成功' })
  } catch (err) {
    console.error('更新班级信息失败:', err)
    res.status(500).json({ code: 500, msg: '更新失败' })
  }
})

// ========== 添加教师到班级 ==========
router.post('/class/add-teacher', async (req, res) => {
  const { classId, userId, subject_id } = req.body
  if (!classId || !userId) {
    return res.json({ code: 400, msg: '班级ID和教师ID不能为空' })
  }
  try {
    // 检查教师是否存在且角色为教师
    const [userCheck] = await db.query('SELECT id, role FROM user WHERE id = ?', [userId])
    if (userCheck.length === 0) {
      return res.json({ code: 404, msg: '用户不存在' })
    }
    // 教师角色为 3(班主任) / 4(学校管理员) / 5(单科老师)
    if (![3, 4, 5].includes(Number(userCheck[0].role))) {
      return res.json({ code: 400, msg: '该用户不是教师' })
    }
    // 检查是否已关联
    const [existCheck] = await db.query(
      'SELECT id FROM teacher_subject_class WHERE user_id = ? AND class_id = ?',
      [userId, classId]
    )
    if (existCheck.length > 0) {
      return res.json({ code: 400, msg: '该教师已在本班任教' })
    }
    await db.query(
      'INSERT INTO teacher_subject_class (user_id, class_id, subject_id) VALUES (?, ?, ?)',
      [userId, classId, subject_id || null]
    )
    res.json({ code: 200, msg: '添加教师成功' })
  } catch (err) {
    console.error('添加教师失败:', err)
    res.status(500).json({ code: 500, msg: '添加失败' })
  }
})

// ========== 移除教师 ==========
router.delete('/class/remove-teacher', async (req, res) => {
  const { classId, userId } = req.body
  if (!classId || !userId) {
    return res.json({ code: 400, msg: '班级ID和教师ID不能为空' })
  }
  try {
    const [result] = await db.query(
      'DELETE FROM teacher_subject_class WHERE user_id = ? AND class_id = ?',
      [userId, classId]
    )
    if (result.affectedRows === 0) {
      return res.json({ code: 404, msg: '未找到该教师关联' })
    }
    res.json({ code: 200, msg: '移除教师成功' })
  } catch (err) {
    console.error('移除教师失败:', err)
    res.status(500).json({ code: 500, msg: '移除失败' })
  }
})

module.exports = router;