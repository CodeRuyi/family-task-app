const express = require('express');
const router = express.Router();
const db = require('../db/index');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'jiaxiao_task_2026_key';

// 三端共用：优先 query/body 显式传参，其次从 Bearer token 推导
function resolveUserId(req) {
  const raw = req.query.userId !== undefined ? req.query.userId : req.body.userId;
  const fromParam = parseInt(raw);
  if (fromParam && !isNaN(fromParam) && fromParam > 0) return fromParam;

  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && String(auth).startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(String(auth).slice(7), JWT_SECRET);
      const fromToken = parseInt(payload.userId);
      if (fromToken && !isNaN(fromToken) && fromToken > 0) return fromToken;
    } catch (err) {
      return 0;
    }
  }
  return 0;
}

// 获取孩子的成就墙
// 本次补全原先恒为 0 的统计字段（昵称 / 积分 / 完成任务数 / 覆盖类别数），
// 使孩子端成就页能真正展示「我的成长画像」，而不只是一个空的进度条。
router.get('/achievement/list', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }

  try {
    // 1. 勋章字典（按 id 排序，只取前 9 枚原始勋章，避免重复）
    const [badges] = await db.query(
      'SELECT id, name, icon, description FROM badge WHERE id <= 9 ORDER BY id'
    );

    // 2. 该孩子已获得的勋章
    const [obtainedRows] = await db.query(
      'SELECT badge_id FROM user_badge WHERE student_id = ?',
      [userId]
    );
    const obtainedSet = new Set(obtainedRows.map(row => Number(row.badge_id)));

    // 3. 用户基本信息
    const [userRows] = await db.query(
      'SELECT nickname, avatar FROM user WHERE id = ?',
      [userId]
    );
    const nickname = userRows.length > 0 ? (userRows[0].nickname || '') : '';
    const avatar = userRows.length > 0 ? (userRows[0].avatar || '') : '';

    // 4. 积分：user 表无 points 字段，统一从 points_log 汇总（与登录接口口径一致）
    let totalPoints = 0;
    try {
      const [pointRows] = await db.query(
        'SELECT IFNULL(SUM(`change`), 0) AS points FROM points_log WHERE child_id = ?',
        [userId]
      );
      if (pointRows.length > 0 && pointRows[0].points != null) {
        totalPoints = Number(pointRows[0].points) || 0;
      }
    } catch (pointErr) {
      console.error('成就墙积分汇总失败:', pointErr.message);
    }

    // 5. 任务统计：完成任务数 + 覆盖类别数
    let taskCount = 0;
    let categoryCount = 0;
    try {
      const [taskRows] = await db.query(
        `SELECT COUNT(*) AS cnt
           FROM task_instance
          WHERE child_id = ? AND done = 1`,
        [userId]
      );
      taskCount = taskRows.length > 0 ? Number(taskRows[0].cnt) || 0 : 0;

      const [catRows] = await db.query(
        `SELECT COUNT(DISTINCT COALESCE(tt.category, '未分类')) AS cnt
           FROM task_instance ti
           LEFT JOIN task_template tt ON ti.template_id = tt.id
          WHERE ti.child_id = ? AND ti.done = 1`,
        [userId]
      );
      categoryCount = catRows.length > 0 ? Number(catRows[0].cnt) || 0 : 0;
    } catch (taskErr) {
      console.error('成就墙任务统计失败:', taskErr.message);
    }

    // 6. 组装勋章列表
    const badgeItems = badges.map(b => ({
      id: b.id,
      name: b.name,
      icon: b.icon || '',
      description: b.description || '',
      obtained: obtainedSet.has(Number(b.id)),
    }));

    const totalCount = badgeItems.length;
    const unlockedCount = badgeItems.filter(b => b.obtained).length;

    res.json({
      code: 200,
      msg: '成功',
      data: {
        childId: userId,
        nickname,
        avatar,
        totalPoints,
        taskCount,
        categoryCount,
        unlockedCount,
        totalCount,
        badges: badgeItems
      }
    });
  } catch (err) {
    console.error('获取成就列表失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

module.exports = router;
