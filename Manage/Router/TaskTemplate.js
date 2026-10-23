const express = require('express')
const db = require('../db/index')
const router = express.Router()

router.get('/template/list', async (req, res) => {
  const { category, keyword } = req.query
  let sql = 'SELECT * FROM task_template WHERE 1=1'
  let params = []
  if (category && category !== '') {
    sql += ' AND category = ?'
    params.push(category)
  }
  if (keyword && keyword !== '') {
    sql += ' AND name LIKE ?'
    params.push(`%${keyword}%`)
  }
  sql += ' ORDER BY id DESC'
  try {
    const [list] = await db.query(sql, params)
    res.json({ code: 200, data: { list }, msg: '成功' })
  } catch (e) {
    console.error('数据库异常', e)
    res.json({ code: 500, data: { list: [] }, msg: '读取失败' })
  }
})

router.post('/add', async (req, res) => {
  try {
    await db.query('INSERT INTO task_template SET ?', req.body)
    res.json({ code: 200, msg: '新增成功' })
  } catch (e) {
    res.json({ code: 500, msg: '新增失败' })
  }
})

router.put('/update', async (req, res) => {
  const body = req.body
  const id = body.id
  delete body.id
  try {
    await db.query('UPDATE task_template SET ? WHERE id = ?', [body, id])
    res.json({ code: 200, msg: '修改成功' })
  } catch (e) {
    res.json({ code: 500, msg: '修改失败' })
  }
})

module.exports = router