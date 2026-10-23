const express = require('express');
const router = express.Router();
const db = require('../db/index.js');

// ==================== PC端 - 1. 获取任务模板列表 ====================
router.get('/template/list', async (req, res) => {
  try {
    const sql = 'SELECT * FROM task_template WHERE is_enabled = 1 ORDER BY id DESC';
    const [results] = await db.query(sql);
    res.json({
      code: 200,
      message: 'success',
      data: results.map(item => ({
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        min_score: item.min_points,
        max_score: item.max_points,
        need_photo: item.need_photo,
        need_location: item.need_location,
        is_enabled: item.is_enabled
      }))
    });
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ code: 500, error: 'Internal server error', msg: err.message });
  }
});

// ==================== PC端 - 2. 获取班级学生列表 ====================
router.get('/student/list', async (req, res) => {
  try {
    const classId = req.query.classId || req.query.classld;
    if (!classId) {
      return res.json({ code: 400, msg: '缺少班级ID参数', data: [] });
    }
    const sql = `
      SELECT u.id AS student_id, u.nickname AS student_name
      FROM user u
      INNER JOIN student_class sc ON u.id = sc.child_id
      WHERE sc.class_id = ? AND u.role = 2
    `;
    const [results] = await db.query(sql, [classId]);
    res.json({ code: 200, msg: 'success', data: results });
  } catch (err) {
    console.error('Error fetching student list:', err);
    res.status(500).json({ code: 500, msg: 'Internal server error', error: err.message });
  }
});

// ==================== PC端 - 3. 批量下发任务 ====================
// task_instance.deadline 是 NOT NULL 且无默认值，未指定截止时间时
// 默认取「今天 23:59:59」，避免 Column 'deadline' cannot be null。
function normalizeDeadline(value) {
  if (value === undefined || value === null || value === '') {
    const end = new Date()
    end.setHours(23, 59, 59, 0)
    return end
  }
  const d = new Date(value)
  if (isNaN(d.getTime())) {
    const end = new Date()
    end.setHours(23, 59, 59, 0)
    return end
  }
  return d
}

router.post('/instance/create', async (req, res) => {
  const { template_id, class_id, student_ids, title, points, deadline, description, created_by } = req.body;
  if (!template_id || !class_id || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.json({ code: 400, msg: '模板ID、班级ID、下发学生列表不能为空' });
  }
  try {
    const familyIdMap = {};
    const missingStudents = [];
    for (const sid of student_ids) {
      const studentId = Number(sid);
      const [rows] = await db.query(
        'SELECT family_id FROM family_member WHERE user_id = ? AND is_active = 1 LIMIT 1',
        [studentId]
      );
      if (rows.length === 0) {
        missingStudents.push(studentId);
      } else {
        familyIdMap[studentId] = rows[0].family_id;
      }
    }
    if (missingStudents.length > 0) {
      return res.json({
        code: 400,
        msg: `以下学生未找到有效的家庭信息：${missingStudents.join(', ')}。请先为学生创建家庭并关联。`,
        data: { missingStudents }
      });
    }
    const finalDeadline = normalizeDeadline(deadline);
    const insertData = student_ids.map(sid => {
      const studentId = Number(sid);
      return [
        template_id,
        familyIdMap[studentId],
        studentId,
        title || '未命名任务',
        description || '',
        points || 10,
        finalDeadline,
        0, 0, 0, 0,
        created_by || 1,
        new Date()
      ];
    });
    const insertSql = `
      INSERT INTO task_instance 
      (template_id, family_id, child_id, title, description, points, deadline, 
       need_photo, need_location, repeat_type, status, created_by, created_at)
      VALUES ?
    `;
    const [result] = await db.query(insertSql, [insertData]);
    res.json({
      code: 200,
      msg: '批量任务下发成功',
      data: { affectedRows: result.affectedRows, insertedCount: student_ids.length }
    });
  } catch (err) {
    console.error('批量下发失败:', err);
    res.status(500).json({ code: 500, msg: '批量下发失败', error: err.message });
  }
});

// ==================== PC端 - 4. 获取班级下发历史 ====================
router.get('/history/list', async (req, res) => {
  try {
    const classId = req.query.classId || req.query.classld;
    if (!classId) {
      return res.json({ code: 400, msg: '缺少班级ID参数', data: [] });
    }
    const sql = `
      SELECT 
        ti.id,
        ti.template_id,
        ti.title,
        ti.description,
        ti.points,
        ti.deadline,
        ti.status,
        ti.created_at,
        ti.created_by,
        u.nickname AS created_by_name,
        (SELECT COUNT(DISTINCT ti2.child_id) 
         FROM task_instance ti2 
         WHERE ti2.template_id = ti.template_id 
           AND ti2.title = ti.title) AS student_count,
        (SELECT COUNT(DISTINCT ti3.child_id) 
         FROM task_instance ti3 
         WHERE ti3.template_id = ti.template_id 
           AND ti3.title = ti.title 
           AND ti3.status = 1) AS completed_count,
        (SELECT c.class_name 
         FROM class c 
         WHERE c.id = ?) AS class_name
      FROM task_instance ti
      LEFT JOIN user u ON ti.created_by = u.id
      WHERE ti.child_id IN (SELECT sc.child_id FROM student_class sc WHERE sc.class_id = ?)
      GROUP BY ti.id, ti.template_id, ti.title, ti.description, ti.points, 
               ti.deadline, ti.status, ti.created_at, ti.created_by, u.nickname
      ORDER BY ti.created_at DESC
      LIMIT 100
    `;
    const [results] = await db.query(sql, [classId, classId]);
    const statusMap = { 0: '待完成', 1: '已完成', 2: '已过期', 3: '已取消' };
    const formattedResults = results.map(item => ({
      id: item.id,
      template_id: item.template_id,
      title: item.title,
      description: item.description,
      points: item.points,
      deadline: item.deadline,
      status: item.status,
      status_text: statusMap[item.status] || '未知',
      created_at: item.created_at,
      created_by: item.created_by,
      created_by_name: item.created_by_name || '未知',
      student_count: item.student_count || 0,
      completed_count: item.completed_count || 0,
      class_name: item.class_name || '未知班级',
      progress: item.student_count > 0 ? Math.round((item.completed_count || 0) / item.student_count * 100) : 0
    }));
    res.json({ code: 200, msg: 'success', data: formattedResults });
  } catch (err) {
    console.error('Error fetching history records:', err);
    res.status(500).json({ code: 500, msg: 'Internal server error', error: err.message });
  }
});

// ==================== PC端 - 5. 撤回任务 ====================
router.put('/task/recall/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [check] = await db.query('SELECT status FROM task_instance WHERE id = ?', [id]);
    if (check.length === 0) return res.json({ code: 404, msg: '任务不存在' });
    if (check[0].status === 2 || check[0].status === 3) {
      return res.json({ code: 400, msg: '该任务已完成或已截止，无法撤回' });
    }
    await db.query('UPDATE task_instance SET status = 4 WHERE id = ?', [id]);
    res.json({ code: 200, msg: '撤回成功' });
  } catch (err) {
    console.error('撤回失败:', err);
    res.status(500).json({ code: 500, msg: '撤回失败', error: err.message });
  }
});

// ============================================================
// 小程序端 - 任务审核模块（家长审核孩子提交的任务）
// ============================================================

// 1. 获取待审核任务列表（支持 familyId 或 userId）
router.get('/review/list', async (req, res) => {
  const { userId, familyId } = req.query;

  // ===== 优先使用 familyId（小程序家长端使用） =====
  if (familyId) {
    try {
      // 查询该家庭下所有孩子
      const [childRows] = await db.query(
        `SELECT user_id FROM family_member WHERE family_id = ? AND relation = 'child' AND is_active = 1`,
        [familyId]
      );
      const childIds = childRows.map(row => row.user_id);
      if (childIds.length === 0) {
        return res.json({ code: 200, data: [], msg: '该家庭暂无孩子' });
      }

      const placeholders = childIds.map(() => '?').join(',');
      const sql = `
        SELECT 
          ts.id,
          ts.task_id,
          ts.child_id,
          ts.submitted_at,
          ts.review_status,
          ts.media_url,
          u.nickname AS student_name,
          ti.title AS task_title,
          ti.points
        FROM task_submission ts
        JOIN user u ON ts.child_id = u.id
        JOIN task_instance ti ON ts.task_id = ti.id
        WHERE ts.child_id IN (${placeholders}) AND ts.review_status = 0
        ORDER BY ts.submitted_at DESC
      `;
      const [rows] = await db.query(sql, childIds);
      return res.json({ code: 200, data: rows, msg: 'success' });
    } catch (err) {
      console.error('按家庭查询待审核任务失败:', err);
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }

  // ===== 备选：按用户ID查询（PC端/其他场景） =====
  if (!userId) {
    return res.status(400).json({ code: 400, msg: '缺少用户ID或家庭ID' });
  }

  try {
    const [userRows] = await db.query('SELECT id, role FROM user WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ code: 404, msg: '用户不存在' });
    }

    const userRole = userRows[0].role;

    // ⚠️ 角色约定：1=家长 2=孩子 3=班主任 4=学校管理员 5=单科老师
    //    教师是 3/4/5。原先用 1 判断教师是错的（1 其实是家长），
    //    会导致教师身份走到下面「教师：查班级学生」分支以外的错误逻辑。
    if ([3, 4, 5].includes(Number(userRole))) {
      const [studentRows] = await db.query(
        `SELECT DISTINCT sc.child_id
           FROM student_class sc
          WHERE sc.class_id IN (
            SELECT class_id FROM teacher_subject_class WHERE user_id = ?
            UNION
            SELECT class_id FROM user_class WHERE user_id = ?
          )`,
        [userId, userId]
      );
      const childIds = studentRows.map(row => row.child_id);
      if (childIds.length === 0) {
        return res.json({ code: 200, data: [], msg: '暂无待审核任务' });
      }
      const placeholders = childIds.map(() => '?').join(',');
      const sql = `
        SELECT 
          ts.id,
          ts.task_id,
          ts.child_id,
          ts.submitted_at,
          ts.review_status,
          ts.media_url,
          u.nickname AS student_name,
          ti.title AS task_title,
          ti.points
        FROM task_submission ts
        JOIN user u ON ts.child_id = u.id
        JOIN task_instance ti ON ts.task_id = ti.id
        WHERE ts.child_id IN (${placeholders}) AND ts.review_status = 0
        ORDER BY ts.submitted_at DESC
      `;
      const [rows] = await db.query(sql, childIds);
      return res.json({ code: 200, data: rows, msg: 'success' });
    }

    // 家长：查自己孩子
    if (Number(userRole) === 1) {
      const [childRows] = await db.query(
        `SELECT fm.user_id AS child_id
         FROM family_member fm
         WHERE fm.family_id IN (
           SELECT family_id FROM family_member WHERE user_id = ? AND relation = 'parent'
         ) AND fm.relation = 'child'`,
        [userId]
      );
      const childIds = childRows.map(row => row.child_id);
      if (childIds.length === 0) {
        return res.json({ code: 200, data: [], msg: '暂无待审核任务' });
      }
      const placeholders = childIds.map(() => '?').join(',');
      const sql = `
        SELECT 
          ts.id,
          ts.task_id,
          ts.child_id,
          ts.submitted_at,
          ts.review_status,
          ts.media_url,
          u.nickname AS student_name,
          ti.title AS task_title,
          ti.points
        FROM task_submission ts
        JOIN user u ON ts.child_id = u.id
        JOIN task_instance ti ON ts.task_id = ti.id
        WHERE ts.child_id IN (${placeholders}) AND ts.review_status = 0
        ORDER BY ts.submitted_at DESC
      `;
      const [rows] = await db.query(sql, childIds);
      return res.json({ code: 200, data: rows, msg: 'success' });
    }

    // 学生：只查自己
    if (Number(userRole) === 2) {
      const sql = `
        SELECT 
          ts.id,
          ts.task_id,
          ts.child_id,
          ts.submitted_at,
          ts.review_status,
          ts.media_url,
          u.nickname AS student_name,
          ti.title AS task_title,
          ti.points
        FROM task_submission ts
        JOIN user u ON ts.child_id = u.id
        JOIN task_instance ti ON ts.task_id = ti.id
        WHERE ts.child_id = ? AND ts.review_status = 0
        ORDER BY ts.submitted_at DESC
      `;
      const [rows] = await db.query(sql, [userId]);
      return res.json({ code: 200, data: rows, msg: 'success' });
    }

    // 学校管理员/其他管理角色：查看全部
    const [allRows] = await db.query(
      `SELECT 
         ts.id, ts.task_id, ts.child_id, ts.submitted_at, ts.review_status,
         ts.media_url, u.nickname AS student_name, ti.title AS task_title, ti.points
       FROM task_submission ts
       JOIN user u ON ts.child_id = u.id
       JOIN task_instance ti ON ts.task_id = ti.id
       WHERE ts.review_status = 0
       ORDER BY ts.submitted_at DESC`
    );
    res.json({ code: 200, data: allRows, msg: 'success' });

  } catch (err) {
    console.error('获取待审核列表失败:', err);
    res.status(500).json({ code: 500, msg: err.message });
  }
});

// 2. 单条审核（批准/驳回）
router.put('/review/audit', async (req, res) => {
  const { submissionId, status } = req.body;

  if (!submissionId || status === undefined) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  }
  if (![1, 2].includes(status)) {
    return res.status(400).json({ code: 400, msg: '状态值无效，请使用 1(通过) 或 2(驳回)' });
  }

  try {
    const [checkRows] = await db.query(
      'SELECT id, review_status, task_id FROM task_submission WHERE id = ?',
      [submissionId]
    );
    if (checkRows.length === 0) {
      return res.status(404).json({ code: 404, msg: '记录不存在' });
    }
    if (checkRows[0].review_status !== 0) {
      return res.status(400).json({ code: 400, msg: '该任务已审核' });
    }

    await db.query(
      'UPDATE task_submission SET review_status = ? WHERE id = ?',
      [status, submissionId]
    );

    if (status === 1) {
      await db.query(
        'UPDATE task_instance SET status = 1 WHERE id = ?',
        [checkRows[0].task_id]
      );
    }

    res.json({ code: 200, msg: status === 1 ? '审核通过' : '已驳回' });
  } catch (err) {
    console.error('审核操作失败:', err);
    res.status(500).json({ code: 500, msg: err.message });
  }
});

// 3. 批量审核
router.put('/review/batch', async (req, res) => {
  const { ids, status } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ code: 400, msg: '请选择要审核的记录' });
  }
  if (![1, 2].includes(status)) {
    return res.status(400).json({ code: 400, msg: '状态值无效，请使用 1(通过) 或 2(驳回)' });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');
    const [taskIdRows] = await db.query(
      `SELECT task_id FROM task_submission WHERE id IN (${placeholders}) AND review_status = 0`,
      [...ids]
    );

    const sql = `UPDATE task_submission SET review_status = ? WHERE id IN (${placeholders}) AND review_status = 0`;
    const [result] = await db.query(sql, [status, ...ids]);

    if (status === 1 && taskIdRows.length > 0) {
      const taskIds = taskIdRows.map(row => row.task_id);
      const taskPlaceholders = taskIds.map(() => '?').join(',');
      await db.query(
        `UPDATE task_instance SET status = 1 WHERE id IN (${taskPlaceholders})`,
        taskIds
      );
    }

    res.json({
      code: 200,
      msg: `批量${status === 1 ? '通过' : '驳回'}成功，共 ${result.affectedRows} 条`,
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error('批量审核失败:', err);
    res.status(500).json({ code: 500, msg: err.message });
  }
});

module.exports = router;