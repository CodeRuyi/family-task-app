// 数据库
// 引入数据库
const mysql = require('mysql2/promise')
// 设置数据连接池
const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'child_grow_manage_db'
})
// 把数据库导出
module.exports = db