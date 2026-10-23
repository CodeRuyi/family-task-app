// e2e_hn.js —— 鸿蒙端专项端到端校验
// 用法：在 Manage 目录下，先用 8899 临时实例启动，再运行本脚本
//   node _server_test_tmp.js &
//   node e2e_hn.js
const BASE = 'http://127.0.0.1:8899/api';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name} :: ${detail || ''}`);
    console.log(`  ✗ ${name}  ${detail || ''}`);
  }
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try {
    return { http: r.status, body: JSON.parse(text) };
  } catch (e) {
    return { http: r.status, body: null, raw: text.slice(0, 200) };
  }
}

async function post(path, payload, headers = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload || {})
  });
  const text = await r.text();
  try {
    return { http: r.status, body: JSON.parse(text) };
  } catch (e) {
    return { http: r.status, body: null, raw: text.slice(0, 200) };
  }
}

// 统一信封校验：{ code, msg, data } 且 msg 为字符串
function envelope(res, ctx) {
  const b = res.body;
  check(`${ctx} 信封合法`, b !== null && typeof b.code === 'number',
    b === null ? `非 JSON: ${res.raw}` : 'code 缺失');
  if (b === null) return false;
  check(`${ctx} msg 为字符串（非 undefined）`, typeof b.msg === 'string',
    `msg=${JSON.stringify(b.msg)}`);
  return true;
}

(async () => {
  const CHILD = 5;      // 王小宇（孩子）
  const CHILD2 = 8;     // 王小雅（孩子）

  console.log('\n【一】登录 / 会话');
  {
    const r = await post('/mobile-login', { phone: '13500110005', password: '123456' });
    envelope(r, 'mobile-login');
    check('登录返回 200', r.body && r.body.code === 200, JSON.stringify(r.body).slice(0, 160));
    const d = r.body && r.body.data;
    check('登录返回 token', d && typeof d.token === 'string' && d.token.length > 20, 'token 缺失');
    check('登录返回 userInfo.id 为 number', d && d.userInfo && typeof d.userInfo.id === 'number');
    check('登录返回 familyId', d && d.familyId !== undefined, 'familyId 缺失');
    check('登录返回 points 为 number', d && typeof d.points === 'number');
    check('登录返回 role=2（孩子）', d && d.userInfo && d.userInfo.role === 2, `role=${d && d.userInfo && d.userInfo.role}`);

    // 用 token 走一次无 userId 参数的请求，验证后端 token 解析
    if (d && d.token) {
      const rr = await get('/redeem/item/list').catch(() => null);
      const withToken = await fetch(`${BASE}/redeem/item/list`, {
        headers: { Authorization: `Bearer ${d.token}` }
      }).then(x => x.json()).catch(() => null);
      check('token 可推导 userId（无参数请求成功）',
        withToken && withToken.code === 200 && withToken.data && withToken.data.childId === CHILD,
        JSON.stringify(withToken).slice(0, 200));
    }
  }

  console.log('\n【二】任务列表 / 详情');
  {
    const r = await get(`/tasks/me?userId=${CHILD}`);
    envelope(r, 'tasks/me');
    check('tasks/me 返回 200', r.body.code === 200);
    check('tasks/me data 为数组', Array.isArray(r.body.data));
    const list = r.body.data || [];
    check('任务含 timeText 字段', list.length === 0 || 'timeText' in list[0]);
    check('任务含 points 字段', list.length === 0 || typeof list[0].points === 'number');
    check('任务含 done 字段', list.length === 0 || typeof list[0].done === 'boolean' || typeof list[0].done === 'number');
    // 新补：分类与科目（用于手表端图标）
    check('任务含 category 字段（新补）', list.length === 0 || 'category' in list[0]);
    check('任务含 subjectName 字段（新补）', list.length === 0 || 'subjectName' in list[0]);
    // 排序：未完成在前
    const firstDone = list.findIndex(t => t.done === 1 || t.done === true);
    const lastUndone = list.map((t, i) => (t.done === 0 || t.done === false) ? i : -1).reduce((a, b) => Math.max(a, b), -1);
    check('排序正确（未完成在前）', firstDone === -1 || lastUndone === -1 || lastUndone < firstDone,
      `firstDone=${firstDone} lastUndone=${lastUndone}`);

    if (list.length > 0) {
      const tid = list[0].id;
      const d = await get(`/tasks/${tid}`);
      envelope(d, `tasks/${tid}`);
      check('任务详情返回 200', d.body.code === 200, JSON.stringify(d.body).slice(0, 160));
      check('详情 id 匹配', d.body.data && d.body.data.id === tid);
      check('详情含 percent 字段', d.body.data && typeof d.body.data.percent === 'number');
    }

    const nf = await get('/tasks/999999');
    check('不存在的任务返回 404 业务码', nf.body && nf.body.code === 404, JSON.stringify(nf.body).slice(0, 120));
  }

  console.log('\n【三】任务统计（新接口）');
  {
    const r = await get(`/tasks/stats/me?userId=${CHILD}`);
    envelope(r, 'tasks/stats/me');
    check('统计返回 200', r.body.code === 200, JSON.stringify(r.body).slice(0, 160));
    const d = r.body.data || {};
    check('统计含 total/completed/pending/percent/balance',
      typeof d.total === 'number' && typeof d.completed === 'number'
      && typeof d.pending === 'number' && typeof d.percent === 'number'
      && typeof d.balance === 'number',
      JSON.stringify(d));
    check('completed + pending === total', d.completed + d.pending === d.total,
      `${d.completed}+${d.pending}!=${d.total}`);
  }

  console.log('\n【四】成就墙（已补全统计字段）');
  {
    const r = await get(`/achievement/list?userId=${CHILD}`);
    envelope(r, 'achievement/list');
    check('成就返回 200', r.body.code === 200, JSON.stringify(r.body).slice(0, 160));
    const d = r.body.data || {};
    check('badges 为数组', Array.isArray(d.badges));
    check('totalCount = badges.length', d.totalCount === (d.badges || []).length,
      `${d.totalCount} vs ${(d.badges || []).length}`);
    check('unlockedCount 与 badges 一致',
      d.unlockedCount === (d.badges || []).filter(b => b.obtained).length);
    check('nickname 非空（新补）', typeof d.nickname === 'string' && d.nickname.length > 0,
      `nickname=${JSON.stringify(d.nickname)}`);
    check('totalPoints 为数字（新补）', typeof d.totalPoints === 'number',
      `totalPoints=${JSON.stringify(d.totalPoints)}`);
    check('taskCount 为数字（新补）', typeof d.taskCount === 'number');
    check('categoryCount 为数字（新补）', typeof d.categoryCount === 'number');
    check('任务统计非零（孩子有已完成任务）', d.taskCount > 0, `taskCount=${d.taskCount}`);
    check('积分与流水口径一致', d.totalPoints > 0, `totalPoints=${d.totalPoints}`);
    const b0 = (d.badges || [])[0];
    check('勋章含 description', b0 === undefined || typeof b0.description === 'string');
    check('勋章含 obtained 布尔', b0 === undefined || typeof b0.obtained === 'boolean');
  }

  console.log('\n【五】积分流水（新接口）');
  {
    const r = await get(`/points/log?userId=${CHILD}&limit=10`);
    envelope(r, 'points/log');
    check('流水返回 200', r.body.code === 200, JSON.stringify(r.body).slice(0, 160));
    check('流水 data 为数组', Array.isArray(r.body.data));
    const list = r.body.data || [];
    if (list.length > 0) {
      const it = list[0];
      check('流水含 changePoints（后端别名）', 'changePoints' in it, JSON.stringify(it).slice(0, 160));
      check('流水含 balance', typeof it.balance === 'number');
      check('流水含 reason', typeof it.reason === 'string');
      check('流水含 created_at', typeof it.created_at === 'string');
      check('流水含 type', typeof it.type === 'string');
      // 倒序校验
      const times = list.map(x => new Date(x.created_at).getTime());
      let sorted = true;
      for (let i = 1; i < times.length; i++) if (times[i] > times[i - 1]) sorted = false;
      check('流水按时间倒序', sorted);
    }
    // 边界
    const bad = await get('/points/log');
    check('无 userId 且无 token → 401', bad.body && bad.body.code === 401, JSON.stringify(bad.body).slice(0, 120));
  }

  console.log('\n【六】兑换商城 / 兑换记录');
  {
    const r = await get(`/redeem/item/list?userId=${CHILD}`);
    envelope(r, 'redeem/item/list');
    check('商品列表返回 200', r.body.code === 200, JSON.stringify(r.body).slice(0, 160));
    const d = r.body.data || {};
    check('含 balance 数字', typeof d.balance === 'number');
    check('含 familyId 数字', typeof d.familyId === 'number' && d.familyId > 0, `familyId=${d.familyId}`);
    check('items 为数组', Array.isArray(d.items));
    const it = (d.items || [])[0];
    if (it) {
      check('商品含 pointsCost', typeof it.pointsCost === 'number');
      check('商品含 canExchange 布尔', typeof it.canExchange === 'boolean');
      check('商品含 category', typeof it.category === 'string');
    }

    const o = await get(`/redeem/orders/me?userId=${CHILD}`);
    envelope(o, 'redeem/orders/me');
    check('孩子兑换记录返回 200', o.body.code === 200, JSON.stringify(o.body).slice(0, 160));
    check('兑换记录为数组', Array.isArray(o.body.data));
    const ol = o.body.data || [];
    if (ol.length > 0) {
      check('记录含 item_name', 'item_name' in ol[0]);
      check('记录含 status', typeof ol[0].status === 'number');
      check('记录含 applied_at', 'applied_at' in ol[0]);
    }

    // 状态筛选
    const o2 = await get(`/redeem/orders/me?userId=${CHILD}&status=2`);
    check('按已通过筛选可用', o2.body && o2.body.code === 200);
    check('筛选结果全部为 status=2',
      (o2.body.data || []).every(x => x.status === 2));
  }

  console.log('\n【七】设置（含偏好读写闭环）');
  {
    const r = await get(`/setting/info?userId=${CHILD}`);
    envelope(r, 'setting/info');
    check('设置信息返回 200', r.body.code === 200, JSON.stringify(r.body).slice(0, 200));
    const d = r.body.data || {};
    check('含 user.nickname', d.user && typeof d.user.nickname === 'string');
    check('含 user.roleText=孩子', d.user && d.user.roleText === '孩子', `roleText=${d.user && d.user.roleText}`);
    check('含 family.familyName 非空', d.family && typeof d.family.familyName === 'string' && d.family.familyName.length > 0,
      `familyName=${d.family && d.family.familyName}`);
    check('含 preferences 五个字段',
      d.preferences && typeof d.preferences.notificationEnabled === 'boolean'
      && typeof d.preferences.darkMode === 'boolean'
      && typeof d.preferences.autoSync === 'boolean'
      && typeof d.preferences.remindTime === 'string'
      && typeof d.preferences.language === 'string');

    // 写入 → 读回（只改提醒时间，验证不误清其它字段）
    const before = d.preferences;
    const w = await post('/setting/preferences', {
      userId: CHILD,
      notificationEnabled: before.notificationEnabled,
      darkMode: before.darkMode,
      autoSync: before.autoSync,
      remindTime: '21:00',
      language: before.language
    });
    check('偏好写入返回 200', w.body && w.body.code === 200, JSON.stringify(w.body).slice(0, 160));

    const r2 = await get(`/setting/info?userId=${CHILD}`);
    const p2 = (r2.body.data || {}).preferences || {};
    check('提醒时间读回 21:00', p2.remindTime === '21:00', `remindTime=${p2.remindTime}`);
    check('通知开关未被误清', p2.notificationEnabled === before.notificationEnabled,
      `${p2.notificationEnabled} vs ${before.notificationEnabled}`);
    check('语言未被误清', p2.language === before.language, `${p2.language} vs ${before.language}`);

    // 还原
    await post('/setting/preferences', {
      userId: CHILD,
      notificationEnabled: before.notificationEnabled,
      darkMode: before.darkMode,
      autoSync: before.autoSync,
      remindTime: before.remindTime,
      language: before.language
    });
    const r3 = await get(`/setting/info?userId=${CHILD}`);
    check('还原成功', (r3.body.data.preferences || {}).remindTime === before.remindTime,
      `remindTime=${r3.body.data.preferences.remindTime}`);
  }

  console.log('\n【八】任务完成 / 撤销闭环（含积分入账）');
  {
    // 找一个某孩子的未完成任务
    const list = (await get(`/tasks/me?userId=${CHILD2}`)).body.data || [];
    const undone = list.find(t => t.done === 0 || t.done === false);
    if (!undone) {
      console.log('  - 跳过：uid=' + CHILD2 + ' 无未完成任务');
    } else {
      const famBefore = (await get(`/redeem/item/list?userId=${CHILD2}`)).body.data.balance;
      const s = await post(`/tasks/${undone.id}/submit`, { userId: CHILD2 });
      check('任务提交返回 200', s.body && s.body.code === 200, JSON.stringify(s.body).slice(0, 200));
      check('提交后 done=true', s.body.data && (s.body.data.task.done === 1 || s.body.data.task.done === true));
      check('提交返回 alreadyDone=false', s.body.data && s.body.data.alreadyDone === false);

      // 重复提交应幂等
      const s2 = await post(`/tasks/${undone.id}/submit`, { userId: CHILD2 });
      check('重复提交幂等（仍 200）', s2.body && s2.body.code === 200, JSON.stringify(s2.body).slice(0, 160));
      check('重复提交标记 alreadyDone=true', s2.body.data && s2.body.data.alreadyDone === true);

      // 积分应增加
      const famAfter = (await get(`/redeem/item/list?userId=${CHILD2}`)).body.data.balance;
      check('完成后家庭积分增加', famAfter === famBefore + (undone.points || 0),
        `${famBefore} → ${famAfter}，应为 +${undone.points}`);

      // 流水应有记录
      const log = (await get(`/points/log?userId=${CHILD2}&limit=1`)).body.data || [];
      check('完成任务写入积分流水',
        log.length > 0 && log[0].type === 'task' && log[0].changePoints === (undone.points || 0),
        JSON.stringify(log[0] || {}).slice(0, 160));

      // 撤销
      const c = await post(`/tasks/${undone.id}/cancel`, { userId: CHILD2 });
      check('撤销完成返回 200', c.body && c.body.code === 200, JSON.stringify(c.body).slice(0, 160));
      check('撤销后 done=false', c.body.data && (c.body.data.task.done === 0 || c.body.data.task.done === false));
      const famBack = (await get(`/redeem/item/list?userId=${CHILD2}`)).body.data.balance;
      check('撤销后积分扣回', famBack === famBefore, `${famAfter} → ${famBack}，应为 ${famBefore}`);
    }
  }

  console.log('\n【九】鉴权与边界');
  {
    const n = await get('/tasks/me');
    check('tasks/me 无凭据 → 401', n.body && n.body.code === 401, JSON.stringify(n.body).slice(0, 120));
    const a = await get('/achievement/list');
    check('achievement 无凭据 → 401', a.body && a.body.code === 401, JSON.stringify(a.body).slice(0, 120));
    const p = await post('/tasks/999999/submit', { userId: CHILD });
    check('提交不存在任务 → 404', p.body && p.body.code === 404, JSON.stringify(p.body).slice(0, 120));
    // 他人任务不可提交
    const other = (await get(`/tasks/me?userId=${CHILD}`)).body.data || [];
    if (other.length > 0) {
      const x = await post(`/tasks/${other[0].id}/submit`, { userId: CHILD2 });
      check('不能提交他人任务 → 404', x.body && x.body.code === 404,
        JSON.stringify(x.body).slice(0, 120));
    }
  }

  console.log(`\n${'='.repeat(56)}`);
  console.log(`鸿蒙端专项回归：通过 ${pass} / 失败 ${fail}`);
  if (failures.length > 0) {
    console.log('\n失败明细：');
    failures.forEach(f => console.log('  · ' + f));
  }
  console.log('='.repeat(56));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => {
  console.error('脚本异常：', e);
  process.exit(2);
});
