// 统计各视图中「被 2 个以上文件重复定义」的顶层样式块
const fs = require('fs');
const path = require('path');

const DIR = 'D:/harmony_subject/vue-pc端/src/views';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.vue'));

function topBlocks(css) {
  const lines = css.split('\n');
  const res = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[.#a-zA-Z\[].*\{\s*$/.test(line)) {
      const start = i;
      let depth = 0;
      let j = i;
      const chunk = [];
      for (; j < lines.length; j++) {
        chunk.push(lines[j]);
        depth += (lines[j].match(/\{/g) || []).length;
        depth -= (lines[j].match(/\}/g) || []).length;
        if (depth <= 0 && j > start) break;
      }
      res.push({
        selector: lines[start].replace(/\s*\{\s*$/, ''),
        body: chunk.slice(1, -1).map((s) => s.trim()).filter(Boolean).join(' ')
      });
      i = j + 1;
    } else i++;
  }
  return res;
}

const global = topBlocks(
  fs.readFileSync('D:/harmony_subject/vue-pc端/src/assets/main.css', 'utf8')
).map((b) => b.selector);
const globalSet = new Set(global);

const map = new Map(); // selector -> { body -> [files] }
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const idx = src.indexOf('<style');
  if (idx < 0) continue;
  for (const b of topBlocks(src.slice(idx))) {
    if (!map.has(b.selector)) map.set(b.selector, new Map());
    const m = map.get(b.selector);
    if (!m.has(b.body)) m.set(b.body, []);
    m.get(b.body).push(f);
  }
}

const rows = [];
for (const [sel, bodies] of map) {
  const fileSet = new Set();
  for (const arr of bodies.values()) arr.forEach((f) => fileSet.add(f));
  if (fileSet.size >= 2) {
    const variants = bodies.size;
    const inGlobal = globalSet.has(sel);
    rows.push({ sel, files: fileSet.size, variants, inGlobal, where: [...fileSet].join(',') });
  }
}
rows.sort((a, b) => b.files - a.files || b.variants - a.variants);

console.log('重复定义的选择器（≥2 个视图）：\n');
for (const r of rows) {
  const flag = r.inGlobal ? '[全局已有]' : '[仅页面]  ';
  const drift = r.variants > 1 ? ` ⚠${r.variants}种写法` : '';
  console.log(`${flag} ${r.sel}  ×${r.files}${drift}  ${r.where}`);
}
console.log(`\n合计 ${rows.length} 个`);
