const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'jiaxiao_task_2026_key';

// PC 端登录
router.post('/login', (req, res) => {
    const { phone, password, className } = req.body;
    if (!phone || !password || !className) {
        return res.json({ code: 400, msg: '手机号、密码、班级不能为空', data: null });
    }
    pool.query('SELECT id,phone,password,nickname,avatar,role,status FROM user WHERE phone = ?', [phone])
        .then(([userList]) => {
            if (userList.length === 0) {
                return res.json({ code: 401, msg: '该手机号账号不存在', data: null });
            }
            const user = userList[0];
            if (user.status !== 1) {
                return res.json({ code: 401, msg: '账号已被管理员禁用，无法登录', data: null });
            }
            let isPwdRight = false;
            if (user.password === password) { isPwdRight = true; }
            // 明文命中时无需再走 bcrypt，避免 bcrypt 对非哈希串抛错
            if (isPwdRight) {
                return checkClassPermission(user, className, res);
            }
            bcrypt.compare(password, user.password)
                .then(pwdResult => {
                    if (!pwdResult) { return res.json({ code: 401, msg: '登录密码错误', data: null }); }
                    checkClassPermission(user, className, res);
                })
                .catch(err => {
                    console.log('密码比对异常：', err.message);
                    res.json({ code: 500, msg: '服务器内部错误', data: null });
                });
        })
        .catch(err => {
            console.log('登录数据库查询异常：', err.message);
            res.json({ code: 500, msg: '服务器数据库异常，请稍后重试', data: null });
        });
});

// 班级权限校验。
// 兼容三端两种教师绑定方式：
//   1) user_class          —— 班主任 / 注册时写入的班级权限
//   2) teacher_subject_class —— 任课教师绑定
// 同时兼容班级名称重名：若同名班级有多个，取该教师实际有权管理的那个。
function checkClassPermission(user, className, res) {
    pool.query(
        `SELECT c.id, c.class_name
           FROM class c
          WHERE c.class_name = ?
            AND (
              EXISTS (SELECT 1 FROM user_class uc WHERE uc.class_id = c.id AND uc.user_id = ?)
              OR EXISTS (SELECT 1 FROM teacher_subject_class tsc WHERE tsc.class_id = c.id AND tsc.user_id = ?)
            )
          ORDER BY c.id
          LIMIT 1`,
        [className, user.id, user.id]
    )
        .then(([classRows]) => {
            if (classRows.length === 0) {
                return res.json({ code: 401, msg: '该教师无此班级管理权限，无法登录', data: null });
            }
            const targetClass = classRows[0];
            const token = jwt.sign({ userId: user.id, phone: user.phone, nickname: user.nickname, role: user.role, classId: targetClass.id, className: targetClass.class_name }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ code: 200, msg: '登录成功', data: { token, userInfo: { id: user.id, phone: user.phone, nickname: user.nickname, avatar: user.avatar, role: user.role }, currentClass: targetClass } });
        })
        .catch(err => {
            console.log('班级权限查询异常：', err.message);
            res.json({ code: 500, msg: '服务器数据库异常', data: null });
        });
}

// 检查手机号
router.post('/check-phone', (req, res) => {
    const { phone } = req.body;
    if (!phone) { return res.json({ code: 400, msg: '手机号不能为空', data: null }); }
    if (!/^1\d{10}$/.test(phone)) { return res.json({ code: 400, msg: '手机号格式不正确', data: null }); }
    pool.query('SELECT id FROM user WHERE phone = ?', [phone])
        .then(([rows]) => { res.json({ code: 200, msg: '查询成功', data: { exists: rows.length > 0 } }); })
        .catch(err => { console.log('查询异常：', err); res.json({ code: 500, msg: '服务器异常', data: null }); });
});

// 小程序端注册
// 修复：原实现只写 user 表，不建家庭关系 → 新注册用户 familyId 恒为 null，
//       导致任务列表 / 兑换商城全部空数据。现按 role 自动落家庭归属。
router.post('/mobile-register', async (req, res) => {
    const { phone, password, nickname, avatar, role, familyName } = req.body;
    if (!phone || !password) { return res.json({ code: 400, msg: '手机号和密码不能为空', data: null }); }
    if (!/^1\d{10}$/.test(phone)) { return res.json({ code: 400, msg: '手机号格式不正确', data: null }); }
    if (password.length < 6) { return res.json({ code: 400, msg: '密码至少6位', data: null }); }

    const finalRole = Number(role) || 1;
    if (finalRole !== 1 && finalRole !== 2) {
        return res.json({ code: 400, msg: '角色参数不合法（1=家长 2=孩子）', data: null });
    }

    let conn = null;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [rows] = await conn.query('SELECT id FROM user WHERE phone = ?', [phone]);
        if (rows.length > 0) {
            await conn.rollback();
            return res.json({ code: 400, msg: '手机号已注册，请直接登录', data: null });
        }

        const finalNickname = nickname && nickname.trim() ? nickname.trim() : '用户' + phone.slice(-4);
        // 密码统一 bcrypt 存储（兼容登录接口的「明文或 bcrypt」双读）
        const hashed = (password.length < 60) ? bcrypt.hashSync(password, 10) : password;

        const [result] = await conn.query(
            'INSERT INTO user (phone, password, nickname, avatar, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [phone, hashed, finalNickname, avatar || '', finalRole, 1]
        );
        const newUserId = result.insertId;

        // 自动建立家庭归属：家长建新家庭，孩子加入（若同手机号家庭不存在则一并新建）
        // 注意 family.owner_id 为 NOT NULL 无默认值；audit_status 默认 'wait' 会挡住业务，这里显式置为通过。
        const NEW_FAMILY_SQL = 'INSERT INTO family (family_name, owner_id, points_balance, audit_status) VALUES (?, ?, ?, ?)';
        let familyId = null;
        if (finalRole === 1) {
            const famNick = (familyName && String(familyName).trim()) ? String(familyName).trim() : (finalNickname + '的家庭');
            const [famRes] = await conn.query(NEW_FAMILY_SQL, [famNick, newUserId, 0, 'approved']);
            familyId = famRes.insertId;
            await conn.query('INSERT INTO family_member (family_id, user_id, relation, is_active) VALUES (?, ?, ?, ?)', [familyId, newUserId, 'parent', 1]);
        } else {
            // 孩子：优先加入同 family_name 的家庭，没有则新建一个以待家长后续绑定
            const famNick = (familyName && String(familyName).trim()) ? String(familyName).trim() : (finalNickname + '的家庭');
            const [existFam] = await conn.query('SELECT id FROM family WHERE family_name = ? LIMIT 1', [famNick]);
            if (existFam.length > 0) {
                familyId = existFam[0].id;
            } else {
                const [famRes] = await conn.query(NEW_FAMILY_SQL, [famNick, newUserId, 0, 'approved']);
                familyId = famRes.insertId;
            }
            await conn.query('INSERT INTO family_member (family_id, user_id, relation, is_active) VALUES (?, ?, ?, ?)', [familyId, newUserId, 'child', 1]);
        }

        await conn.commit();
        res.json({ code: 200, msg: '注册成功', data: { userId: newUserId, familyId: familyId, role: finalRole } });
    } catch (err) {
        if (conn) { try { await conn.rollback(); } catch (e) { /* rollback 失败忽略 */ } }
        console.log('注册异常：', err.message);
        res.json({ code: 500, msg: '注册失败，请稍后重试', data: null });
    } finally {
        if (conn) { conn.release(); }
    }
});

// 小程序端 / 鸿蒙端登录（返回 token + familyId + points）
router.post('/mobile-login', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) { return res.json({ code: 400, msg: '手机号和密码不能为空', data: null }); }
    try {
        const [userList] = await pool.query('SELECT id,phone,password,nickname,avatar,role,status FROM user WHERE phone = ?', [phone]);
        if (userList.length === 0) { return res.json({ code: 401, msg: '用户不存在，请先注册', data: null }); }
        const user = userList[0];
        if (user.status !== 1) { return res.json({ code: 401, msg: '账号已被禁用', data: null }); }
        let isMatch = false;
        if (user.password === password) { isMatch = true; }
        else { isMatch = bcrypt.compareSync(password, user.password); }
        if (!isMatch) { return res.json({ code: 401, msg: '密码错误', data: null }); }

        let familyId = null;
        let points = 0;
        // 家长(1) / 孩子(2) 都挂在家庭下；班主任(3) 历史上也建了 child 关系，保留兼容
        if (user.role === 1 || user.role === 2 || user.role === 3) {
            const relation = user.role === 1 ? 'parent' : 'child';
            try {
                const [familyRows] = await pool.query('SELECT family_id FROM family_member WHERE user_id = ? AND relation = ? LIMIT 1', [user.id, relation]);
                if (familyRows.length > 0) { familyId = familyRows[0].family_id; }
            } catch (err) { console.log('查询家庭ID失败：', err); }
        }
        // 孩子(2)：积分从 points_log 汇总（user 表无 points 字段）
        //         同时若其家庭存在共享积分池，则与兑换商城口径对齐取较大者，避免「手表显示 0 但商城能兑换」
        if (user.role === 2) {
            try {
                const [pointRows] = await pool.query(
                    'SELECT IFNULL(SUM(`change`), 0) AS points FROM points_log WHERE child_id = ?',
                    [user.id]
                );
                if (pointRows.length > 0 && pointRows[0].points != null) { points = Number(pointRows[0].points) || 0; }
                if (familyId != null) {
                    const [famRows] = await pool.query('SELECT points_balance FROM family WHERE id = ? LIMIT 1', [familyId]);
                    if (famRows.length > 0 && famRows[0].points_balance != null) {
                        const poolBalance = Number(famRows[0].points_balance) || 0;
                        if (poolBalance > points) { points = poolBalance; }
                    }
                }
            } catch (err) { console.log('查询积分失败：', err.message); }
        }
        if (user.role === 3) {
            try {
                // user 表没有 points 字段，积分统一从 points_log 汇总
                const [pointRows] = await pool.query(
                    'SELECT IFNULL(SUM(`change`), 0) AS points FROM points_log WHERE child_id = ?',
                    [user.id]
                );
                if (pointRows.length > 0 && pointRows[0].points != null) { points = Number(pointRows[0].points) || 0; }
            } catch (err) { console.log('查询积分失败：', err.message); }
        }

        const token = jwt.sign({ userId: user.id, phone: user.phone, nickname: user.nickname, role: user.role, familyId: familyId }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ code: 200, msg: '登录成功', data: { token, userInfo: { id: user.id, phone: user.phone, nickname: user.nickname, avatar: user.avatar, role: user.role }, familyId: familyId, points: points } });
    } catch (err) {
        console.log('登录异常：', err);
        res.json({ code: 500, msg: '服务器异常', data: null });
    }
});

// 微信模拟登录
router.post('/wechat-mock-login', (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) { return res.json({ code: 400, msg: '手机号格式错误', data: null }); }
    pool.query('SELECT * FROM user WHERE phone = ?', [phone])
        .then(([userList]) => {
            if (userList.length > 0) {
                const user = userList[0];
                if (user.status !== 1) { return res.json({ code: 401, msg: '账号已被禁用', data: null }); }
                return res.json({ code: 200, msg: '登录成功', data: { userInfo: { id: user.id, phone: user.phone, nickname: user.nickname, avatar: user.avatar, role: user.role } } });
            }
            const defaultNickname = '微信用户' + phone.slice(-4);
            pool.query('INSERT INTO user (phone, password, nickname, role, status) VALUES (?, ?, ?, ?, ?)', [phone, 'wx_mock', defaultNickname, 1, 1])
                .then(([insertResult]) => {
                    pool.query('SELECT id,phone,nickname,avatar,role,status FROM user WHERE id = ?', [insertResult.insertId])
                        .then(([newUserList]) => { res.json({ code: 200, msg: '注册并登录成功', data: { userInfo: newUserList[0] } }); })
                        .catch(err => { console.log('查询新用户异常：', err); res.json({ code: 500, msg: '服务器异常', data: null }); });
                })
                .catch(err => { console.log('微信注册插入异常：', err); res.json({ code: 500, msg: '注册失败', data: null }); });
        })
        .catch(err => { console.log('微信登录异常：', err); res.json({ code: 500, msg: '服务器异常', data: null }); });
});

module.exports = router;
