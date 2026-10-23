const express = require('express');
const cors = require('cors');

// 引入路由
const TaskTemplate = require('./Router/TaskTemplate');
const RegisterRouter = require('./Router/RegisterRouter');
const LoginRouter = require('./Router/LoginRouter');
const DashboardRouter = require('./Router/dashboard');
const ClassRouter = require('./Router/ClassRouter');
const FamilyRouter = require('./Router/FamilyRouter');
const MedalRouter = require('./Router/MedalRouter');
const BatchTaskRouter = require('./Router/BatchTaskRouter');
const HomeRouter = require('./Router/HomeRouter');
const UserRouter = require('./Router/UserRouter');
const RedeemRouter = require('./Router/RedeemRouter');
const ReportRouter = require('./Router/ReportRouter');
const TaskRouter = require('./Router/TaskRouter');

const server = express();

// ✅ 中间件必须放在路由之前
server.use(cors());
server.use(express.json());              // 解析 JSON 请求体
server.use(express.urlencoded({ extended: true })); // 解析表单数据（可选）
const AchievementRouter = require('./Router/AchievementRouter');
server.use('/api', AchievementRouter);
// ✅ 挂载路由（在中间件之后）
const SettingRouter = require('./Router/SettingRouter');
// ...
server.use('/api', SettingRouter);
server.use('/api', ReportRouter);
server.use('/api', RedeemRouter);
server.use('/api', UserRouter);
server.use('/api', TaskRouter);
server.use('/api', TaskTemplate);
server.use('/api', RegisterRouter);
server.use('/api', LoginRouter);
server.use('/api', DashboardRouter);
server.use('/api', ClassRouter);
server.use('/api', FamilyRouter);
server.use('/api', MedalRouter);
server.use('/api', BatchTaskRouter);
server.use('/api', HomeRouter);

// ============================================================
// 统一兜底错误处理
// ------------------------------------------------------------
// 该后端由 PC 端 / 小程序端 / 鸿蒙端三端共用，任何一次未捕获异常
// 都会导致整个进程退出，进而三端同时不可用。这里做两件事：
//   1. 兜住所有路由抛出的同步异常，统一返回 JSON 而非 HTML 错误页；
//   2. 监听未处理的 Promise 异常与未捕获异常，只记录日志、不退出进程。
// ============================================================
server.use((err, req, res, next) => {
  console.error('[未捕获的路由异常]', req.method, req.originalUrl, err && (err.sqlMessage || err.message));
  if (res.headersSent) return next(err);
  res.status(500).json({ code: 500, msg: '服务器异常', data: null });
});

// 404 兜底：保持 JSON 格式，避免三端拿到 HTML
server.use((req, res) => {
  res.status(404).json({ code: 404, msg: '接口不存在', data: null });
});

process.on('unhandledRejection', (reason) => {
  console.error('[未处理的 Promise 异常]', reason && (reason.sqlMessage || reason.message) || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[未捕获的异常]', err && (err.sqlMessage || err.message) || err);
});

server.listen(8888, () => {
  console.log('服务启动 8888');
});