// 删除各视图中已上提到全局 main.css 的重复样式块
const fs = require('fs');
const path = require('path');

const DIR = 'D:/harmony_subject/vue-pc端/src/views';

const TARGETS = [
  '.form-item label',
  '.required',
  '.form-row',
  '.tpl-card',
  '.tpl-card:hover',
  '.tpl-desc',
  '.avatar-mini',
  '.link-btn',
  '.modal-leave-active',
  '.modal-leave-to',
  '.empty-state',
  '.empty-title',
  '.empty-desc',
  '.sk-line',
  '.sk-md',
  '.skeleton-card',
  '.search-box',
  '.search-box:focus-within',
  '.search-icon'
];

function splitBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[.#a-zA-Z\[].*\{\s*$/.test(line)) {
      const start = i;
      let depth = 0;
      let j = i;
      for (; j < lines.length; j++) {
        depth += (lines[j].match(/\{/g) || []).length;
        depth -= (lines[j].match(/\}/g) || []).length;
        if (depth <= 0 && j > start) break;
      }
      blocks.push({
        start,
        end: j,
        selector: lines[start].replace(/\s*\{\s*$/, '')
      });
      i = j + 1;
    } else i++;
  }
  return blocks;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.vue'));
let total = 0;

for (const f of files) {
  const full = path.join(DIR, f);
  const src = fs.readFileSync(full, 'utf8');
  const idx = src.indexOf('<style');
  if (idx < 0) continue;
  const head = src.slice(0, idx);
  const stylePart = src.slice(idx);

  const blocks = splitBlocks(stylePart);
  const drop = blocks.filter((b) => TARGETS.includes(b.selector));
  if (!drop.length) continue;

  const lines = stylePart.split('\n');
  const dropSet = new Set();
  for (const b of drop) {
    for (let k = b.start; k <= b.end; k++) dropSet.add(k);
    let nxt = b.end + 1;
    while (nxt < lines.length && lines[nxt].trim() === '') dropSet.add(nxt++);
  }
  const kept = lines.filter((_, i) => !dropSet.has(i)).join('\n');
  fs.writeFileSync(full, head + kept, 'utf8');
  total += drop.length;
  console.log(`[ok] ${f} -${drop.length}  ${drop.map((b) => b.selector).join(', ')}`);
}

console.log(`\n合计删除 ${total} 个重复样式块`);
