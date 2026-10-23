# 家校共育管理系统（PC 教师端）

基于 **Vue 3 + Express + MySQL** 的家校共育/儿童成长管理平台。本仓库为 **PC 教师端**及配套的**后端服务**，后端同时为小程序端、鸿蒙端共用。

## ✨ 功能模块

| 模块 | 说明 |
|------|------|
| 用户登录 / 注册 | JWT 鉴权，密码 bcrypt 加密 |
| 班级管理 | 班级信息维护、学生管理 |
| 家庭管理 | 家庭成员与家长账号管理 |
| 任务模板 | 任务模板的创建与复用 |
| 批量发布任务 | 按班级/学生批量下发成长任务 |
| 勋章系统 | 按条件（连续打卡、累计积分、任务次数等）自动颁发勋章 |
| 积分兑换 | 积分规则与兑换管理 |
| 数据看板 | 基于 ECharts / Chart.js 的成长数据可视化 |
| 成长报告 | 学生成长情况汇总报表 |

## 🛠 技术栈

**前端（vue-pc端）**
- Vue 3 + Vite 7
- Pinia 状态管理
- Vue Router 5
- Axios
- ECharts / Chart.js
- Less

**后端（Manage）**
- Node.js + Express 4
- MySQL 8（mysql2 连接池）
- JWT（jsonwebtoken）
- bcrypt 密码加密
- CORS 跨域支持

## 📁 项目结构

```
family-task-app
├── db/                        # 数据库初始化 SQL
│   └── child_grow_manage_db.sql
├── Manage/                    # Express 后端服务
│   ├── server.js              # 服务入口（端口 8888）
│   ├── db/index.js            # MySQL 连接池配置
│   └── Router/                # 业务路由（登录/班级/家庭/任务/勋章/报告等）
└── vue-pc端/                   # Vue 3 前端（教师端 PC）
    └── src/
        ├── views/             # 页面（登录、班级、家庭、任务、勋章、看板等）
        ├── api/               # 接口封装
        ├── stores/            # Pinia 状态
        └── router/            # 前端路由
```

## 🚀 快速开始

### 环境要求

- Node.js ≥ 20.19（或 ≥ 22.12）
- MySQL ≥ 8.0

### 1. 初始化数据库

使用 Navicat 或命令行导入 `db/child_grow_manage_db.sql`：

```bash
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS child_grow_manage_db DEFAULT CHARSET utf8mb4;"
mysql -uroot -p child_grow_manage_db < db/child_grow_manage_db.sql
```

### 2. 启动后端服务

```bash
cd Manage
npm install
# 修改数据库连接配置（Manage/db/index.js）：host / user / password / database
node server.js
```

服务默认运行在 `http://localhost:8888`，接口统一前缀 `/api`。

### 3. 启动前端

```bash
cd vue-pc端
npm install
npm run dev
```

### 4. 构建

```bash
npm run build
```

## 🔌 接口约定

- 统一前缀：`/api`
- 统一响应格式：`{ code, msg, data }`
- `code = 200` 表示成功；`401` 未登录/令牌失效；`404` 接口不存在；`500` 服务器异常
- 主要路由模块：登录注册、用户、班级、家庭、任务、任务模板、批量任务、勋章、成就、兑换、报告、看板、设置

## ⚠️ 注意事项

- `Manage/db/index.js` 中目前为本地开发用的数据库配置，部署前请修改为生产环境的账号密码，或改为读取环境变量。
- 修改后端代码后需重启 `node server.js` 生效。

## 📌 TODO

- [ ] 数据库配置改为环境变量（.env）
- [ ] 补充接口文档
- [ ] 前端打包产物部署方案

## 📄 License

[MIT](LICENSE)
