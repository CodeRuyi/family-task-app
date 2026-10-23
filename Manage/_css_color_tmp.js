// 统计卡色值改为引用设计令牌（仅改缩进 4 空格的 color/soft 字段，避开 echarts 配置）
const fs = require('fs');
const path = require('path');

const MAP = {
  '#4f46e5': 'var(--brand-600)',
  '#eef2ff': 'var(--brand-50)',
  '#3b82f6': 'var(--color-info)',
  '#eff6ff': 'var(--info-soft)',
  '#f59e0b': 'var(--color-warning)',
  '#fffbeb': 'var(--warning-soft)'
};

const files = [
  'D:/harmony_subject/vue-pc端/src/views/DataDashboard.vue',
  'D:/harmony_subject/vue-pc端/src/views/MedalSystem.vue',
  'D:/harmony_subject/vue-pc端/src/views/FamilyManage.vue'
];

let total = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let n = 0;
  const out = lines.map((ln) => {
    const m = ln.match(/^(\s{4})(color|soft): '(#[0-9a-fA-F]{6})',$/);
    if (!m) return ln;
    const rep = MAP[m[3].toLowerCase()];
    if (!rep) return ln;
    n++;
    return `${m[1]}${m[2]}: '${rep}',`;
  });
  fs.writeFileSync(f, out.join('\n'), 'utf8');
  total += n;
  console.log(`[ok] ${path.basename(f)} 替换 ${n} 处`);
}
console.log(`\n合计 ${total} 处色值改为引用令牌`);
