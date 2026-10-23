// 临时脚本：清理各页重复的骨架屏实现（背景/动画/本地 keyframes），保留各自的尺寸定义
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'vue-pc端', 'src');
const FILES = ['views/DataDashboard.vue', 'views/MedalSystem.vue', 'views/TaskTemplate.vue'];

// 需要删除的行（前缀匹配，trim 后）
const DROP_PREFIXES = [
  'background: linear-gradient(90deg, #',
  'background-size: 400% 100%;',
  'animation: skeleton 1.4s ease infinite;'
];

let total = 0;
for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  let removed = 0;

  while (i < lines.length) {
    const t = lines[i].trim();

    // 删除本地 @keyframes skeleton { ... } 整块
    if (t === '@keyframes skeleton {') {
      let j = i;
      while (j < lines.length && lines[j] !== '}') j++;
      i = j + 1;
      if (lines[i] === '') i++;
      removed++;
      continue;
    }

    if (DROP_PREFIXES.some((p) => t.startsWith(p))) {
      removed++;
      i++;
      continue;
    }

    out.push(lines[i]);
    i++;
  }

  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log(`${rel}  清理 ${removed} 行`);
  total += removed;
}
console.log(`\n合计清理 ${total} 行`);
