const express = require('express');
const router = express.Router();
const db = require('../db/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'jiaxiao_task_2026_key';

// 三端共用：优先显式传参，其次从 Bearer token 推导（鸿蒙端登录后场景）
function getUserId(req) {
  const raw = req.body.userId || req.query.userId;
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

router.get('/setting/info', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ code: 400, msg: '缺少 userId 参数' });

  try {
    const [userRows] = await db.query(
      'SELECT id, nickname, avatar, phone, role FROM user WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) return res.json({ code: 404, msg: '用户不存在' });
    const user = userRows[0];

    const roleMap = { 1: '家长', 2: '孩子', 3: '班主任', 4: '学校管理员', 5: '单科老师' };
    const roleText = roleMap[user.role] || '未知';

    // 家庭成员一律可查到所属家庭名（原来限定 relation='child'，导致家长查不到）
    const [familyRows] = await db.query(
      `SELECT f.family_name 
       FROM family_member fm 
       JOIN family f ON fm.family_id = f.id 
       WHERE fm.user_id = ? AND fm.is_active = 1 LIMIT 1`,
      [userId]
    );
    const familyName = familyRows.length > 0 ? familyRows[0].family_name : '';

    const [settingRows] = await db.query(
      'SELECT notification_enabled, dark_mode, auto_sync, remind_time, language FROM user_setting WHERE user_id = ?',
      [userId]
    );
    let preferences;
    if (settingRows.length > 0) {
      preferences = settingRows[0];
    } else {
      preferences = {
        notification_enabled: 1,
        dark_mode: 0,
        auto_sync: 1,
        remind_time: '20:00',
        language: 'zh-CN'
      };
    }

    res.json({
      code: 200,
      msg: '成功',
      data: {
        user: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar || '',
          phone: user.phone,
          roleText: roleText
        },
        family: { familyName: familyName },
        preferences: {
          notificationEnabled: !!preferences.notification_enabled,
          darkMode: !!preferences.dark_mode,
          autoSync: !!preferences.auto_sync,
          remindTime: preferences.remind_time,
          language: preferences.language
        }
      }
    });
  } catch (err) {
    console.error('获取设置信息失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

router.post('/setting/profile', async (req, res) => {
  const { userId, nickname, avatar } = req.body;
  if (!userId) return res.json({ code: 400, msg: '缺少 userId' });

  try {
    await db.query('UPDATE user SET nickname = ?, avatar = ? WHERE id = ?', [nickname, avatar, userId]);
    res.json({ code: 200, msg: '资料更新成功' });
  } catch (err) {
    console.error('更新资料失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

router.post('/setting/password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId) return res.json({ code: 400, msg: '缺少 userId' });

  try {
    const [rows] = await db.query('SELECT password FROM user WHERE id = ?', [userId]);
    if (rows.length === 0) return res.json({ code: 404, msg: '用户不存在' });

    // 兼容两种库存形态：明文（历史数据 / 演示账号）与 bcrypt 哈希。
    // 明文命中即视为通过，避免 bcrypt.compare 对非哈希串抛错或被拒。
    const stored = rows[0].password;
    let isMatch = false;
    if (stored === oldPassword) {
      isMatch = true;
    } else {
      try {
        isMatch = await bcrypt.compare(oldPassword, stored);
      } catch (cmpErr) {
        isMatch = false;
      }
    }
    if (!isMatch) return res.json({ code: 400, msg: '旧密码错误' });

    // 新密码统一存哈希；输入为纯 ASCII 时才走 bcrypt，避免编码异常
    const isPlainAscii = /^[\x20-\x7E]+$/.test(newPassword);
    const nextPwd = isPlainAscii ? await bcrypt.hash(newPassword, 10) : newPassword;
    await db.query('UPDATE user SET password = ? WHERE id = ?', [nextPwd, userId]);
    res.json({ code: 200, msg: '密码修改成功' });
  } catch (err) {
    console.error('修改密码失败:', err);
    res.json({ code: 500, msg: '服务器异常' });
  }
});

router.post('/setting/preferences', async (req, res) => {
  // 三端共用：同时兼容 camelCase 与 snake_case 入参
  const b = req.body || {};
  const userId = b.userId || b.user_id;
  const notificationEnabled = b.notificationEnabled !== undefined ? b.notificationEnabled : b.notification_enabled;
  const darkMode = b.darkMode !== undefined ? b.darkMode : b.dark_mode;
  const autoSync = b.autoSync !== undefined ? b.autoSync : b.auto_sync;
  const remindTime = b.remindTime !== undefined ? b.remindTime : b.remind_time;
  const language = b.language;

  if (!userId) return res.json({ code: 400, msg: '缺少 userId' });

  try {
    const [rows] = await db.query('SELECT id FROM user_setting WHERE user_id = ?', [userId]);
    if (rows.length > 0) {
      await db.query(
        `UPDATE user_setting 
         SET notification_enabled = ?, dark_mode = ?, auto_sync = ?, remind_time = ?, language = ? 
         WHERE user_id = ?`,
        [notificationEnabled ? 1 : 0, darkMode ? 1 : 0, autoSync ? 1 : 0,
          remindTime || '20:00', language || 'zh-CN', userId]
      );
    } else {
      await db.query(
        `INSERT INTO user_setting (user_id, notification_enabled, dark_mode, auto_sync, remind_time, language)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, notificationEnabled ? 1 : 0, darkMode ? 1 : 0, autoSync ? 1 : 0,
          remindTime || '20:00', language || 'zh-CN']
      );
    }
    res.json({ code: 200, msg: '设置保存成功' });
  } catch (err) {
    console.error('保存设置失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

router.post('/setting/preferences/reset', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ code: 400, msg: '缺少 userId' });

  const defaults = {
    notification_enabled: 1,
    dark_mode: 0,
    auto_sync: 1,
    remind_time: '20:00',
    language: 'zh-CN'
  };

  try {
    await db.query(
      `UPDATE user_setting 
       SET notification_enabled = ?, dark_mode = ?, auto_sync = ?, remind_time = ?, language = ? 
       WHERE user_id = ?`,
      [defaults.notification_enabled, defaults.dark_mode, defaults.auto_sync, defaults.remind_time, defaults.language, userId]
    );
    res.json({ code: 200, msg: '已恢复默认设置' });
  } catch (err) {
    console.error('重置设置失败:', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

module.exports = router;