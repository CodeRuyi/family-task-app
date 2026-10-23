const express = require('express');
const router = express.Router();
const db = require('../db/index');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'jiaxiao_task_2026_key';

// ================= 辅助函数 =================

// 通过「孩子」的 user_id 反查所属家庭。
// 兼容两种绑定来源，避免只认 one 种导致返回 null：
//   1) family_member.relation = 'child'
//   2) family_member 里该 user 的任意一条记录（兜底）
async function getFamilyId(userId) {
  try {
    const [rows] = await db.query(
      'SELECT family_id FROM family_member WHERE user_id = ? AND relation = "child" LIMIT 1',
      [userId]
    );
    if (rows.length > 0) {
      return rows[0].family_id;
    }
    const [fallback] = await db.query(
      'SELECT family_id FROM family_member WHERE user_id = ? AND family_id IS NOT NULL ORDER BY is_active DESC LIMIT 1',
      [userId]
    );
    return fallback.length > 0 ? fallback[0].family_id : null;
  } catch (err) {
    console.error('[getFamilyId] 查询失败:', err.message);
    return null;
  }
}

// 统一解析 familyId：优先用入参，未传则按 userId 反查。
// 小程序端两处接口分别传 familyId / userId，这里做兼容，
// 以免出现「缺少 familyId」而白屏。
async function resolveFamilyId(familyId, userId) {
  const fid = parseInt(familyId);
  if (fid && !isNaN(fid)) return fid;
  const uid = parseInt(userId);
  if (uid && !isNaN(uid)) return await getFamilyId(uid);
  return null;
}

// 三端共用的当前用户解析：优先显式传参，其次 Bearer token（鸿蒙端）
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

// ================= 鸿蒙端原有接口 =================

// 1. 获取商品列表（通过 userId）
router.get('/redeem/item/list', async (req, res) => {
  // 兼容：未显式传 userId 时从 token 推导（鸿蒙端登录后只带 token 的场景）
  const userId = parseInt(req.query.userId) || resolveUserId(req);
  if (!userId || isNaN(userId)) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }

  const familyId = await getFamilyId(userId);
  if (!familyId) {
    return res.json({ code: 400, msg: '该用户未绑定家庭' });
  }

  try {
    const [familyRows] = await db.query(
      'SELECT points_balance FROM family WHERE id = ?',
      [familyId]
    );
    const balance = familyRows.length > 0 ? familyRows[0].points_balance : 0;

    const [rows] = await db.query(
      `SELECT id, name, points_cost AS pointsCost, stock, description,
              expiry_date AS expiryDate, is_enabled AS isEnabled, category, '' AS iconText
       FROM redeem_item 
       WHERE family_id = ? AND is_enabled = 1 AND (stock IS NULL OR stock > 0)
       ORDER BY created_at DESC`,
      [familyId]
    );

    const items = rows.map(item => ({
      ...item,
      canExchange: balance >= item.pointsCost && (item.stock === null || item.stock > 0)
    }));

    res.json({
      code: 200,
      msg: '成功',
      data: {
        childId: userId,
        familyId: familyId,
        balance: balance,
        items: items
      }
    });
  } catch (err) {
    console.error('获取商品列表失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

// 2. 兑换商品
router.post('/redeem/order/apply', async (req, res) => {
  const { userId, itemId } = req.body;
  if (!userId || !itemId) {
    return res.json({ code: 400, msg: '缺少 userId 或 itemId' });
  }

  const familyId = await getFamilyId(userId);
  if (!familyId) {
    return res.json({ code: 400, msg: '该用户未绑定家庭' });
  }

  try {
    await db.query('START TRANSACTION');

    const [items] = await db.query(
      'SELECT id, name, points_cost, stock FROM redeem_item WHERE id = ? AND family_id = ? AND is_enabled = 1',
      [itemId, familyId]
    );
    if (items.length === 0) {
      await db.query('ROLLBACK');
      return res.json({ code: 404, msg: '商品不存在或已下架' });
    }
    const item = items[0];
    if (item.stock !== null && item.stock <= 0) {
      await db.query('ROLLBACK');
      return res.json({ code: 400, msg: '库存不足' });
    }

    const [familyRows] = await db.query(
      'SELECT points_balance FROM family WHERE id = ?',
      [familyId]
    );
    const balance = familyRows[0].points_balance;
    if (balance < item.points_cost) {
      await db.query('ROLLBACK');
      return res.json({ code: 400, msg: '积分不足' });
    }

    await db.query(
      'UPDATE family SET points_balance = points_balance - ? WHERE id = ?',
      [item.points_cost, familyId]
    );

    if (item.stock !== null) {
      await db.query('UPDATE redeem_item SET stock = stock - 1 WHERE id = ?', [itemId]);
    }

    const [orderResult] = await db.query(
      `INSERT INTO redeem_order (child_id, item_id, points_cost, status, family_id, applied_at)
       VALUES (?, ?, ?, 1, ?, NOW())`,
      [userId, itemId, item.points_cost, familyId]
    );
    const orderId = orderResult.insertId;

    await db.query('COMMIT');

    const [newFamily] = await db.query(
      'SELECT points_balance FROM family WHERE id = ?',
      [familyId]
    );
    res.json({
      code: 200,
      msg: '兑换成功',
      data: {
        orderId: orderId,
        itemId: item.id,
        itemName: item.name,
        pointsCost: item.points_cost,
        balance: newFamily[0].points_balance,
        status: 1
      }
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('兑换失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

// ================= 孩子端接口（鸿蒙手表） =================

// 2.1 我的兑换记录（孩子维度）
// 孩子端「兑换记录」页；按 child_id 过滤，与家长维度 /redeem/orders 区分。
// status：不传=全部；0=待处理(0/1)；2=已通过；3=已驳回
router.get('/redeem/orders/me', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.json({ code: 401, msg: '登录已失效，请重新登录', data: null });
  }

  const statusRaw = req.query.status;
  const status = statusRaw === undefined || statusRaw === '' ? NaN : parseInt(statusRaw);

  let sql = `
    SELECT ro.id, ro.item_id, ro.points_cost, ro.status,
           ro.applied_at, ro.processed_at, ro.review_comment,
           ri.name AS item_name, ri.category
      FROM redeem_order ro
      JOIN redeem_item ri ON ro.item_id = ri.id
     WHERE ro.child_id = ?
  `;
  const params = [userId];

  if (!isNaN(status)) {
    if (status === 0) {
      sql += ' AND ro.status IN (0, 1)';
    } else {
      sql += ' AND ro.status = ?';
      params.push(status);
    }
  }
  sql += ' ORDER BY ro.applied_at DESC, ro.id DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ code: 200, msg: '获取成功', data: rows, list: rows, total: rows.length });
  } catch (err) {
    console.error('获取孩子兑换记录失败:', err);
    res.json({ code: 500, msg: '服务器异常', data: null });
  }
});

// ================= 小程序端接口（新增） =================

// 3. 获取家庭积分（通过 familyId，或退化为 userId）
// 返回体同时给出 points / available 两个字段，兼容新旧前端取值。
router.get('/redeem/points', async (req, res) => {
  const familyId = await resolveFamilyId(req.query.familyId, req.query.userId);
  if (!familyId) {
    return res.json({ code: 400, msg: '缺少有效的 familyId 或 userId 参数', data: null });
  }

  try {
    const [rows] = await db.query(
      'SELECT points_balance FROM family WHERE id = ?',
      [familyId]
    );
    if (rows.length === 0) {
      return res.json({ code: 404, msg: '家庭不存在', data: null });
    }
    const points = Number(rows[0].points_balance) || 0;
    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        familyId: familyId,
        points: points,
        available: points,
        balance: points
      }
    });
  } catch (err) {
    console.error('获取家庭积分失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常', data: null });
  }
});

// 4. 获取商品列表（通过 familyId，或退化为 userId）
router.get('/redeem/items', async (req, res) => {
  const familyId = await resolveFamilyId(req.query.familyId, req.query.userId);
  if (!familyId) {
    return res.json({ code: 400, msg: '缺少有效的 familyId 或 userId 参数', data: null });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, name, points_cost AS pointsCost, points_cost, stock, description,
              expiry_date AS expiryDate, is_enabled AS isEnabled, is_enabled, category, created_at
       FROM redeem_item 
       WHERE family_id = ? AND is_enabled = 1 AND (stock IS NULL OR stock > 0)
       ORDER BY created_at DESC`,
      [familyId]
    );

    res.json({
      code: 200,
      msg: '获取成功',
      data: rows
    });
  } catch (err) {
    console.error('获取商品列表失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常', data: null });
  }
});

// 5. 获取订单列表（通过 familyId，或退化为 userId）
// status 支持：
//   不传        → 全部
//   0           → 待处理（status IN (0,1)，兼容未初始化与已申请）
//   1 / 2 / 3   → 精确匹配
// 返回体同时给出「数组本身」与 list 字段，兼容新旧前端取值。
router.get('/redeem/orders', async (req, res) => {
  const familyId = await resolveFamilyId(req.query.familyId, req.query.userId);
  if (!familyId) {
    return res.json({ code: 400, msg: '缺少有效的 familyId 或 userId 参数', data: null });
  }
  const statusRaw = req.query.status;
  const status = statusRaw === undefined || statusRaw === '' ? NaN : parseInt(statusRaw);

  let sql = `
    SELECT ro.id, ro.child_id, ro.item_id, ro.points_cost, ro.status, ro.applied_at,
           ro.processed_at, ro.review_comment,
           ri.name AS item_name, ri.description, ri.category,
           u.nickname AS child_name
    FROM redeem_order ro
    JOIN redeem_item ri ON ro.item_id = ri.id
    JOIN user u ON ro.child_id = u.id
    WHERE ro.family_id = ?
  `;
  const params = [familyId];

  if (!isNaN(status)) {
    // 前端传 0 表示「待确认」，数据库实际可能是 0 或 1，一并取出
    if (status === 0) {
      sql += ' AND ro.status IN (0, 1)';
    } else {
      sql += ' AND ro.status = ?';
      params.push(status);
    }
  }

  sql += ' ORDER BY ro.applied_at DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json({
      code: 200,
      msg: '获取成功',
      data: rows,
      list: rows,
      total: rows.length
    });
  } catch (err) {
    console.error('获取订单列表失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常', data: null });
  }
});

// 6. 获取家庭孩子列表（小程序端原有）
router.get('/redeem/children', async (req, res) => {
  const familyId = parseInt(req.query.familyId);
  if (!familyId || isNaN(familyId)) {
    return res.json({ code: 400, msg: '缺少有效的 familyId 参数' });
  }

  try {
    const [rows] = await db.query(
      `SELECT u.id AS userId, u.nickname, u.avatar, u.role,
              fm.relation
       FROM family_member fm
       JOIN user u ON fm.user_id = u.id
       WHERE fm.family_id = ? AND fm.relation = 'child'
       ORDER BY u.id`,
      [familyId]
    );

    if (rows.length === 0) {
      return res.json({ code: 404, msg: '该家庭暂无孩子', data: [] });
    }

    res.json({
      code: 200,
      msg: '获取成功',
      data: rows
    });
  } catch (err) {
    console.error('获取家庭孩子列表失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

// ================= 兑换项目 / 订单管理（小程序端家长操作） =================
// 以下三个接口原先后端缺失，导致小程序端点击「添加/删除兑换项目」「审核兑换申请」
// 直接 404。这里按三端统一响应结构 { code, msg, data } 补齐。

// 7. 新增兑换项目
router.post('/redeem/item', async (req, res) => {
  const familyId = await resolveFamilyId(req.body.family_id, req.body.userId);
  const { name, points_cost, pointsCost, stock, description, category, expiry_date, is_enabled } = req.body;

  if (!familyId) {
    return res.json({ code: 400, msg: '缺少有效的家庭ID', data: null });
  }
  if (!name || !String(name).trim()) {
    return res.json({ code: 400, msg: '请输入项目名称', data: null });
  }
  const finalCost = Number(points_cost !== undefined ? points_cost : pointsCost);
  if (!finalCost || finalCost <= 0) {
    return res.json({ code: 400, msg: '请输入有效的积分', data: null });
  }

  try {
    const [familyRows] = await db.query('SELECT id FROM family WHERE id = ?', [familyId]);
    if (familyRows.length === 0) {
      return res.json({ code: 404, msg: '家庭不存在', data: null });
    }

    // stock 允许为空（表示不限量）
    let finalStock = null;
    if (stock !== undefined && stock !== null && stock !== '') {
      const s = Number(stock);
      finalStock = isNaN(s) ? null : Math.max(0, Math.floor(s));
    }

    const [result] = await db.query(
      `INSERT INTO redeem_item
       (family_id, name, points_cost, stock, description, category, expiry_date, is_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        familyId,
        String(name).trim(),
        finalCost,
        finalStock,
        description || '',
        category || '其他',
        expiry_date || null,
        is_enabled === 0 ? 0 : 1
      ]
    );

    res.json({
      code: 200,
      msg: '添加成功',
      data: { id: result.insertId, familyId, name: String(name).trim(), pointsCost: finalCost, stock: finalStock }
    });
  } catch (err) {
    console.error('新增兑换项目失败:', err);
    res.json({ code: 500, msg: err.sqlMessage || '服务器异常', data: null });
  }
});

// 8. 删除兑换项目（软删除：置 is_enabled = 0，保留历史订单关联）
router.delete('/redeem/item/:id', async (req, res) => {
  const itemId = parseInt(req.params.id);
  if (!itemId || isNaN(itemId)) {
    return res.json({ code: 400, msg: '缺少有效的项目ID', data: null });
  }

  try {
    const [rows] = await db.query('SELECT id, name FROM redeem_item WHERE id = ?', [itemId]);
    if (rows.length === 0) {
      return res.json({ code: 404, msg: '兑换项目不存在', data: null });
    }

    await db.query('UPDATE redeem_item SET is_enabled = 0 WHERE id = ?', [itemId]);

    res.json({
      code: 200,
      msg: '删除成功',
      data: { id: itemId, name: rows[0].name }
    });
  } catch (err) {
    console.error('删除兑换项目失败:', err);
    res.json({ code: 500, msg: err.sqlMessage || '服务器异常', data: null });
  }
});

// 9. 审核兑换申请（家长确认 / 驳回）
// status: 1 = 通过，2 = 驳回
// 驳回时需要把已扣除的积分退回家庭，并回补库存。
router.put('/redeem/order/:id', async (req, res) => {
  const orderId = parseInt(req.params.id);
  const status = parseInt(req.body.status !== undefined ? req.body.status : req.query.status);
  const comment = req.body.review_comment || req.body.comment || '';

  if (!orderId || isNaN(orderId)) {
    return res.json({ code: 400, msg: '缺少有效的订单ID', data: null });
  }
  if (![1, 2].includes(status)) {
    return res.json({ code: 400, msg: 'status 只能为 1（通过）或 2（驳回）', data: null });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = await conn.query(
      'SELECT id, item_id, child_id, points_cost, status, family_id FROM redeem_order WHERE id = ? FOR UPDATE',
      [orderId]
    );
    if (orders.length === 0) {
      await conn.rollback();
      return res.json({ code: 404, msg: '兑换申请不存在', data: null });
    }
    const order = orders[0];

    // 已处理过（2/3）不允许重复处理
    if (order.status === 2 || order.status === 3) {
      await conn.rollback();
      return res.json({ code: 400, msg: '该申请已处理，请勿重复操作', data: null });
    }

    if (status === 2) {
      // 驳回：退积分 + 回补库存
      if (order.family_id) {
        await conn.query(
          'UPDATE family SET points_balance = points_balance + ? WHERE id = ?',
          [order.points_cost, order.family_id]
        );
      }
      await conn.query(
        'UPDATE redeem_item SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL',
        [order.item_id]
      );
    }

    await conn.query(
      'UPDATE redeem_order SET status = ?, processed_at = NOW(), review_comment = ? WHERE id = ?',
      [status, comment, orderId]
    );

    await conn.commit();

    let balance = null;
    if (order.family_id) {
      const [familyRows] = await conn.query('SELECT points_balance FROM family WHERE id = ?', [order.family_id]);
      balance = familyRows.length > 0 ? Number(familyRows[0].points_balance) : null;
    }

    res.json({
      code: 200,
      msg: status === 1 ? '已确认兑换' : '已驳回申请',
      data: { orderId: orderId, status: status, balance: balance }
    });
  } catch (err) {
    try { await conn.rollback(); } catch (e) { /* 忽略回滚异常 */ }
    console.error('审核兑换申请失败:', err);
    res.json({ code: 500, msg: err.sqlMessage || '服务器异常', data: null });
  } finally {
    conn.release();
  }
});

// 10. 积分流水（家长端「积分流水」页）
// 按家庭下所有孩子的积分变动倒序返回。
router.get('/redeem/points-log', async (req, res) => {
  const familyId = await resolveFamilyId(req.query.familyId, req.query.userId);
  if (!familyId) {
    return res.json({ code: 400, msg: '缺少有效的 familyId 或 userId 参数', data: null });
  }
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  try {
    const [rows] = await db.query(
      `SELECT pl.id, pl.child_id, pl.\`change\` AS changePoints, pl.balance, pl.reason,
              pl.related_id, pl.type, pl.created_at,
              u.nickname AS child_name, u.avatar AS child_avatar
       FROM points_log pl
       JOIN user u ON pl.child_id = u.id
       WHERE pl.child_id IN (
         SELECT user_id FROM family_member WHERE family_id = ? AND relation = 'child'
       )
       ORDER BY pl.created_at DESC
       LIMIT ?`,
      [familyId, limit]
    );
    res.json({ code: 200, msg: '获取成功', data: rows, list: rows, total: rows.length });
  } catch (err) {
    console.error('获取积分流水失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常', data: null });
  }
});

// 11. 家庭成员列表（家长端「家庭管理」页）
router.get('/redeem/family-members', async (req, res) => {
  const familyId = await resolveFamilyId(req.query.familyId, req.query.userId);
  if (!familyId) {
    return res.json({ code: 400, msg: '缺少有效的 familyId 或 userId 参数', data: null });
  }

  try {
    const [familyRows] = await db.query(
      'SELECT id, family_name, owner_id, points_balance, created_at FROM family WHERE id = ?',
      [familyId]
    );
    if (familyRows.length === 0) {
      return res.json({ code: 404, msg: '家庭不存在', data: null });
    }

    const [members] = await db.query(
      `SELECT fm.id, fm.user_id, fm.relation, fm.is_active,
              u.nickname, u.avatar, u.phone, u.role
       FROM family_member fm
       JOIN user u ON fm.user_id = u.id
       WHERE fm.family_id = ?
       ORDER BY FIELD(fm.relation, 'parent', 'child'), u.id`,
      [familyId]
    );

    const [classRows] = await db.query(
      `SELECT sc.child_id, c.class_name, c.grade
       FROM student_class sc
       JOIN class c ON sc.class_id = c.id
       WHERE sc.child_id IN (
         SELECT user_id FROM family_member WHERE family_id = ? AND relation = 'child'
       )`,
      [familyId]
    );
    const classMap = {};
    classRows.forEach(c => { classMap[c.child_id] = c.class_name; });

    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        family: familyRows[0],
        members: members.map(m => ({
          ...m,
          role_name: m.relation === 'parent' ? '家长' : '孩子',
          class_name: classMap[m.user_id] || null
        }))
      }
    });
  } catch (err) {
    console.error('获取家庭成员失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常', data: null });
  }
});

module.exports = router;