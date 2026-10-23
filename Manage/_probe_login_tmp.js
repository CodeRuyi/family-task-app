// 临时诊断：查教师账号与其实际有权限的班级（用完即删）
const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '1234', database: 'child_grow_manage_db'
  });

  const [teachers] = await db.query(
    `SELECT id, phone, password, nickname, role, status FROM user WHERE role IN (3,4,5) ORDER BY id`
  );
  console.log('=== 教师账号 ===');
  teachers.forEach(t => console.log(JSON.stringify(t)));

  console.log('\n=== 班级列表（登录页下拉用 /class/list）===');
  const [classes] = await db.query(`SELECT id, class_name FROM class ORDER BY id`);
  console.log(classes.map(c => `${c.id}:${c.class_name}`).join(' | '));

  console.log('\n=== 教师 ↔ 班级 绑定（user_class）===');
  const [uc] = await db.query(
    `SELECT uc.user_id, u.nickname, uc.class_id, c.class_name, uc.role_type
       FROM user_class uc
       LEFT JOIN user u ON u.id = uc.user_id
       LEFT JOIN class c ON c.id = uc.class_id
      ORDER BY uc.user_id`
  );
  uc.forEach(r => console.log(JSON.stringify(r)));

  console.log('\n=== 教师 ↔ 班级 绑定（teacher_subject_class）===');
  const [tsc] = await db.query(
    `SELECT tsc.user_id, u.nickname, tsc.class_id, c.class_name
       FROM teacher_subject_class tsc
       LEFT JOIN user u ON u.id = tsc.user_id
       LEFT JOIN class c ON c.id = tsc.class_id
      ORDER BY tsc.user_id`
  );
  tsc.forEach(r => console.log(JSON.stringify(r)));

  await db.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
