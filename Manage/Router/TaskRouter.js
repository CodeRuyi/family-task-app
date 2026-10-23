const express = require('express');
const router = express.Router();
const db = require('../db/index');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'jiaxiao_task_2026_key';

// ============================================================
// 三端共用的「当前用户」解析
// ------------------------------------------------------------
// 兼容两种传参（历史原因，三端各有习惯）：
//   1) URL/body 显式传 userId —— PC 端与小程序端主要用法；
//   2) Authorization: Bearer <jwt> —— 鸿蒙端登录后携带。
// 显式传参优先（便于 PC 端按学生维度查看），未传时回落到 token。
// ============================================================
function resolveUserId(req) {
  const raw = req.query.userId !== undefined ? req.query.userId : req.body.userId;
  const fromParam = parseInt(raw);
  if (fromParam && !isNaN(fromParam) && fromParam > 0) {
    return fromParam;
  }

  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && String(auth).startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(String(auth).slice(7), JWT_SECRET);
      const fromToken = parseInt(payload.userId);
      if (fromToken && !isNaN(fromToken) && fromToken > 0) {
        return fromToken;
      }
    } catch (err) {
      // token 失效/伪造：按未登录处理，交由调用方返回明确提示
      return 0;
    }
  }
  return 0;
}

// ================= 1. 获取任务列表 =================
// 孩子端：GET /tasks/me（userId 可由 token 推导）
router.get('/tasks/me', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }

  try {
    // 注意：列名是 created_at，不是 create_time
    const [rows] = await db.query(
      `SELECT ti.id, ti.title, ti.points, ti.done,
              ti.time_text AS timeText, ti.deadline,
              ti.description, ti.need_photo AS needPhoto,
              ti.need_location AS needLocation, ti.status,
              ti.created_at AS createTime,
              COALESCE(tt.category, '') AS category,
              COALESCE(sj.subject_name, '') AS subjectName,
              u.nickname AS childName
         FROM task_instance ti
         LEFT JOIN user u ON ti.child_id = u.id
         LEFT JOIN task_template tt ON ti.template_id = tt.id
         LEFT JOIN subject sj ON tt.subject_id = sj.id
        WHERE ti.child_id = ?
        ORDER BY ti.done ASC, ti.created_at DESC`,
      [userId]
    );
    res.json({ code: 200, msg: '获取成功', data: rows });
  } catch (err) {
    console.error('查询任务失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

// ================= 1.1 单个任务详情 =================
// 孩子端点击任务卡片时调用；原先缺失，前端只能退回列表匹配。
router.get('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  if (!taskId || isNaN(taskId)) {
    return res.json({ code: 400, msg: '任务ID无效', data: null });
  }

  try {
    const [rows] = await db.query(
      `SELECT ti.id, ti.title, ti.points, ti.done,
              ti.time_text AS timeText, ti.deadline,
              ti.description, ti.need_photo AS needPhoto,
              ti.need_location AS needLocation, ti.status,
              ti.created_at AS createTime,
              ti.family_id AS familyId, ti.child_id AS childId,
              COALESCE(tt.category, '') AS category,
              COALESCE(sj.subject_name, '') AS subjectName,
              u.nickname AS childName
         FROM task_instance ti
         LEFT JOIN user u ON ti.child_id = u.id
         LEFT JOIN task_template tt ON ti.template_id = tt.id
         LEFT JOIN subject sj ON tt.subject_id = sj.id
        WHERE ti.id = ?`,
      [taskId]
    );
    if (rows.length === 0) {
      return res.json({ code: 404, msg: '任务不存在', data: null });
    }
    const task = rows[0];
    // 单任务进度：done 即 100%，否则 0%（与列表页口径一致）
    task.percent = task.done ? 100 : 0;
    res.json({ code: 200, msg: '获取成功', data: task });
  } catch (err) {
    console.error('查询任务详情失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

// ================= 2. 完成任务 =================
router.post('/tasks/:id/submit', async (req, res) => {
  const taskId = parseInt(req.params.id);
  const userId = resolveUserId(req);

  if (!taskId || isNaN(taskId)) {
    return res.json({ code: 400, msg: '任务ID无效', data: null });
  }
  if (!userId) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }

  try {
    const [taskRows] = await db.query(
      'SELECT id, done, points, family_id FROM task_instance WHERE id = ? AND child_id = ?',
      [taskId, userId]
    );
    if (taskRows.length === 0) {
      return res.json({ code: 404, msg: '任务不存在或不属于该用户', data: null });
    }
    if (taskRows[0].done === 1) {
      // 幂等：重复提交按成功处理，前端不会因此进入错误态
      const [again] = await db.query(
        `SELECT id, title, points, done, time_text AS timeText, deadline, description
           FROM task_instance WHERE id = ?`,
        [taskId]
      );
      return res.json({
        code: 200,
        msg: '任务已完成',
        data: { task: again[0], alreadyDone: true }
      });
    }

    await db.query('UPDATE task_instance SET done = 1 WHERE id = ?', [taskId]);

    // 完成任务后写入积分流水并累加家庭积分余额（与 PC 端口径一致）
    const points = taskRows[0].points || 0;
    const familyId = taskRows[0].family_id;
    if (points > 0 && familyId) {
      try {
        await db.query('START TRANSACTION');

        const [famRows] = await db.query(
          'SELECT points_balance FROM family WHERE id = ?',
          [familyId]
        );
        const newBalance = (famRows.length > 0 ? Number(famRows[0].points_balance) : 0) + points;

        await db.query('UPDATE family SET points_balance = ? WHERE id = ?', [newBalance, familyId]);
        await db.query(
          'INSERT INTO points_log (child_id, `change`, balance, reason, related_id, type) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, points, newBalance, `完成任务：${taskRows[0].title || ''}`.slice(0, 100), taskId, 'task']
        );

        await db.query('COMMIT');
      } catch (pointErr) {
        await db.query('ROLLBACK');
        // 积分写入失败不应导致「任务完成」这一事实被回滚
        console.error('任务积分入账失败:', pointErr.message);
      }
    }

    const [updated] = await db.query(
      `SELECT id, title, points, done, time_text AS timeText, deadline, description
         FROM task_instance WHERE id = ?`,
      [taskId]
    );
    res.json({ code: 200, msg: '任务已完成', data: { task: updated[0], alreadyDone: false } });
  } catch (err) {
    console.error('完成任务失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

// ================= 3. 取消完成任务 =================
router.post('/tasks/:id/cancel', async (req, res) => {
  const taskId = parseInt(req.params.id);
  const userId = resolveUserId(req);

  if (!taskId || isNaN(taskId)) {
    return res.json({ code: 400, msg: '任务ID无效', data: null });
  }
  if (!userId) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }

  try {
    const [taskRows] = await db.query(
      'SELECT id, done, points, family_id, title FROM task_instance WHERE id = ? AND child_id = ?',
      [taskId, userId]
    );
    if (taskRows.length === 0) {
      return res.json({ code: 404, msg: '任务不存在或不属于该用户', data: null });
    }
    if (taskRows[0].done === 0) {
      const [again] = await db.query(
        `SELECT id, title, points, done, time_text AS timeText, deadline, description
           FROM task_instance WHERE id = ?`,
        [taskId]
      );
      return res.json({
        code: 200,
        msg: '任务未完成',
        data: { task: again[0], alreadyCanceled: true }
      });
    }

    await db.query('UPDATE task_instance SET done = 0 WHERE id = ?', [taskId]);

    // 撤销完成：扣回积分并写一条负向流水
    const points = taskRows[0].points || 0;
    const familyId = taskRows[0].family_id;
    if (points > 0 && familyId) {
      try {
        await db.query('START TRANSACTION');

        const [famRows] = await db.query(
          'SELECT points_balance FROM family WHERE id = ?',
          [familyId]
        );
        const newBalance = Math.max(0, (famRows.length > 0 ? Number(famRows[0].points_balance) : 0) - points);

        await db.query('UPDATE family SET points_balance = ? WHERE id = ?', [newBalance, familyId]);
        await db.query(
          'INSERT INTO points_log (child_id, `change`, balance, reason, related_id, type) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, -points, newBalance, `撤销完成：${taskRows[0].title || ''}`.slice(0, 100), taskId, 'task']
        );

        await db.query('COMMIT');
      } catch (pointErr) {
        await db.query('ROLLBACK');
        console.error('任务积分扣回失败:', pointErr.message);
      }
    }

    const [updated] = await db.query(
      `SELECT id, title, points, done, time_text AS timeText, deadline, description
         FROM task_instance WHERE id = ?`,
      [taskId]
    );
    res.json({ code: 200, msg: '已取消完成', data: { task: updated[0], alreadyCanceled: false } });
  } catch (err) {
    console.error('取消任务失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

// ================= 4. 孩子任务统计 =================
// 供孩子端「任务进度」页使用；一次返回聚合结果，省一次往返。
router.get('/tasks/stats/me', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }

  try {
    const [rows] = await db.query(
      `SELECT done, points FROM task_instance WHERE child_id = ?`,
      [userId]
    );
    const total = rows.length;
    const completed = rows.filter(r => r.done === 1 || r.done === true).length;
    const balance = rows
      .filter(r => r.done === 1 || r.done === true)
      .reduce((sum, r) => sum + (Number(r.points) || 0), 0);

    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        childId: userId,
        total,
        completed,
        pending: total - completed,
        overdue: 0,
        percent: total > 0 ? Math.round(completed * 100 / total) : 0,
        balance
      }
    });
  } catch (err) {
    console.error('查询任务统计失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

// ================= 5. 积分流水（孩子维度） =================
// 孩子端「积分流水」页；家长维度见 /redeem/points-log。
router.get('/points/log', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }
  const limit = Math.min(parseInt(req.query.limit) || 30, 200);

  try {
    const [rows] = await db.query(
      `SELECT pl.id, pl.\`change\` AS changePoints, pl.balance, pl.reason,
              pl.related_id, pl.type, pl.created_at
         FROM points_log pl
        WHERE pl.child_id = ?
        ORDER BY pl.created_at DESC, pl.id DESC
        LIMIT ?`,
      [userId, limit]
    );
    res.json({ code: 200, msg: '获取成功', data: rows, list: rows, total: rows.length });
  } catch (err) {
    console.error('获取积分流水失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

module.exports = router;
