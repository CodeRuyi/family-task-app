// 修复：删除去重脚本截断分组选择器后遗留的悬空行
const fs = require('fs');
const path = require('path');

const DIR = 'D:/harmony_subject/vue-pc端/src/views';
// 这些是全局 main.css 已提供的过渡类，页面残留的悬空选择器行应删除
const DANGLING = [
  '.modal-enter-active,',
  '.modal-enter-from,',
  '.modal-leave-active,',
  '.modal-leave-to,'
];
const ORPHAN_COMMENTS = ['/* 弹窗过渡 */'];

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.vue'));
let fixed = 0;

for (const f of files) {
  const full = path.join(DIR, f);
  const src = fs.readFileSync(full, 'utf8');
  const idx = src.indexOf('<style');
  if (idx < 0) continue;

  const head = src.slice(0, idx);
  const lines = src.slice(idx).split('\n');

  const drop = new Set();
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (DANGLING.includes(t)) {
      drop.add(i);
      // 连带删除紧随其后的空行
      let n = i + 1;
      while (n < lines.length && lines[n].trim() === '') drop.add(n++);
    }
    if (ORPHAN_COMMENTS.includes(t)) {
      // 仅当下一非空行不是合法声明时才删（避免误删正常注释）
      let n = i + 1;
      while (n < lines.length && lines[n].trim() === '') n++;
      if (n >= lines.length || /^<\/style>/.test(lines[n].trim()) || /^[.#a-zA-Z@]/.test(lines[n].trim())) {
        drop.add(i);
      }
    }
  }
  if (!drop.size) continue;

  const kept = lines.filter((_, i) => !drop.has(i)).join('\n');
  fs.writeFileSync(full, head + kept, 'utf8');
  fixed += drop.size;
  console.log(`[fix] ${f} 删除 ${drop.size} 行悬空选择器`);
}

console.log(`\n合计清理 ${fixed} 行`);

// ---- 审计：顶层悬空选择器（以逗号结尾却不在块内）----
console.log('\n=== 残留审计：样式区中以逗号结尾的顶层行 ===');
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const idx = src.indexOf('<style');
  if (idx < 0) continue;
  const lines = src.slice(idx).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^[.#a-zA-Z\[][^{}]*,\s*$/.test(t)) {
      // 下一非空行必须同属选择器组（缩进 0 且以逗号结尾或含 {）
      let n = i + 1;
      while (n < lines.length && lines[n].trim() === '') n++;
      const ok = n < lines.length && (/^[.#a-zA-Z\[]/.test(lines[n]) || lines[n].trim().endsWith(','));
      if (!ok) {
        console.log(`  ⚠ ${f}:${i + 1}  ${t}`);
        bad++;
      }
    }
  }
}
console.log(bad === 0 ? '  无残留损伤' : `  发现 ${bad} 处，需人工确认`);
