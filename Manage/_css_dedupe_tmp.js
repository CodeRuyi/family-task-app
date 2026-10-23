// 临时脚本：删除各视图中与全局 main.css 重复的样式块（用完即删）
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'vue-pc端', 'src');

// 已收敛到 main.css 的全局类名（只删「行首精确匹配」的块，缩进/媒体查询内的不动）
const SELECTORS = [
  '.panel', '.panel-head', '.panel-title', '.panel-sub', '.panel-badge',
  '.modal-mask', '.modal-box', '.modal-head', '.modal-head h3',
  '.modal-body', '.modal-foot', '.modal-close', '.modal-close:hover'
];

const FILES = [
  'views/DataDashboard.vue',
  'views/BatchTask.vue',
  'views/ClassManage.vue',
  'views/MedalSystem.vue',
  'views/UserProfile.vue',
  'views/FamilyManage.vue',
  'views/TaskTemplate.vue'
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let total = 0;
for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  let removed = [];
  while (i < lines.length) {
    const line = lines[i];
    const hit = SELECTORS.find((sel) => new RegExp('^' + escapeRe(sel) + '\\s*\\{').test(line));
    if (hit) {
      // 收集到第一个「行首 }」为止
      let j = i;
      while (j < lines.length && lines[j] !== '}') j++;
      if (j < lines.length) {
        removed.push(hit);
        // 同时吃掉紧随其后的空行
        i = j + 1;
        if (lines[i] === '') i++;
        continue;
      }
    }
    out.push(line);
    i++;
  }
  if (removed.length) {
    fs.writeFileSync(file, out.join('\n'), 'utf8');
    console.log(`${rel}  删除 ${removed.length} 块: ${removed.join(', ')}`);
    total += removed.length;
  } else {
    console.log(`${rel}  无需删除`);
  }
}
console.log(`\n合计删除 ${total} 个重复样式块`);
