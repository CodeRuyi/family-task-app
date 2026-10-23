// 删除各视图中与全局 main.css 重复的 .stat-* 样式块
const fs = require('fs');
const path = require('path');

const SRC = 'D:/harmony_subject/vue-pc端/src/views';

// 已抽到全局的选择器（必须整块完全匹配才删，避免误删页面自定义）
const TARGETS = [
  '.stat-row',
  '.stat-card',
  '.stat-card::after',
  '.stat-card:hover',
  '.stat-head',
  '.stat-icon',
  '.stat-label',
  '.stat-value',
  '.stat-num',
  '.stat-unit',
  '.stat-foot'
];

function splitBlocks(css) {
  // 按顶层块切分（选择器在行首、以 { 开始、以行首 } 结束）
  const blocks = [];
  const lines = css.split('\n');
  let i = 0;
  let buf = [];
  while (i < lines.length) {
    const line = lines[i];
    if (/^\S.*\{\s*$/.test(line) && buf.length === 0) {
      // 可能进入一个块
      const start = i;
      let depth = 0;
      let j = i;
      let chunk = [];
      for (; j < lines.length; j++) {
        chunk.push(lines[j]);
        depth += (lines[j].match(/\{/g) || []).length;
        depth -= (lines[j].match(/\}/g) || []).length;
        if (depth <= 0 && j > start) break;
      }
      blocks.push({ start, end: j, text: chunk.join('\n'), selector: lines[start].replace(/\s*\{\s*$/, '') });
      i = j + 1;
    } else {
      buf = [];
      i++;
    }
  }
  return blocks;
}

const files = ['DataDashboard.vue', 'MedalSystem.vue', 'FamilyManage.vue'];
let totalRemoved = 0;

for (const f of files) {
  const full = path.join(SRC, f);
  const src = fs.readFileSync(full, 'utf8');
  const styleIdx = src.indexOf('<style');
  if (styleIdx < 0) { console.log(`[skip] ${f} 无 style`); continue; }
  const head = src.slice(0, styleIdx);
  const stylePart = src.slice(styleIdx);

  const blocks = splitBlocks(stylePart);
  const drop = blocks.filter((b) => TARGETS.includes(b.selector));
  if (!drop.length) { console.log(`[none] ${f}`); continue; }

  // 从后往前删，避免行号偏移
  const lines = stylePart.split('\n');
  const dropSet = new Set();
  for (const b of drop) {
    for (let k = b.start; k <= b.end; k++) dropSet.add(k);
    // 顺带删掉紧随其后的空行
    let nxt = b.end + 1;
    while (nxt < lines.length && lines[nxt].trim() === '') dropSet.add(nxt++);
  }
  const kept = lines.filter((_, idx) => !dropSet.has(idx)).join('\n');

  fs.writeFileSync(full, head + kept, 'utf8');
  totalRemoved += drop.length;
  console.log(`[ok] ${f} 删除 ${drop.length} 块 -> ${drop.map((b) => b.selector).join(', ')}`);
}

console.log(`\n合计删除 ${totalRemoved} 个重复样式块`);
