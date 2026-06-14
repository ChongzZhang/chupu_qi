// 生成严格 32→12 映射（node scripts/gen-chupu-map.js）
const outcomes = [
  { id: 'lu', combo: '黑黑黑犊犊', xuan: 3, du: 2, bai: 0, zhi: 0, q: 1 },
  { id: 'sai', combo: '黑黑黑犊雉', xuan: 3, du: 1, bai: 0, zhi: 1, q: 2 },
  { id: 'tu', combo: '黑黑犊犊白', xuan: 2, du: 2, bai: 1, zhi: 0, q: 3 },
  { id: 'zhi', combo: '黑黑黑雉雉', xuan: 3, du: 0, bai: 0, zhi: 2, q: 1 },
  { id: 'xiao_a', combo: '黑黑犊雉白', xuan: 2, du: 1, bai: 1, zhi: 1, q: 6 },
  { id: 'xiao_b', combo: '黑犊犊白白', xuan: 1, du: 2, bai: 2, zhi: 0, q: 3 },
  { id: 'jue_a', combo: '黑黑雉雉白', xuan: 2, du: 0, bai: 1, zhi: 2, q: 3 },
  { id: 'jue_b', combo: '黑犊雉白白', xuan: 1, du: 1, bai: 2, zhi: 1, q: 6 },
  { id: 'du', combo: '犊犊白白白', xuan: 0, du: 2, bai: 3, zhi: 0, q: 1 },
  { id: 'ta', combo: '黑雉雉白白', xuan: 1, du: 0, bai: 2, zhi: 2, q: 3 },
  { id: 'kai', combo: '犊雉白白白', xuan: 0, du: 1, bai: 3, zhi: 1, q: 2 },
  { id: 'bai', combo: '雉雉白白白', xuan: 0, du: 0, bai: 3, zhi: 2, q: 1 },
];

const STICK_DEFS = [
  { faces: ['xuan', 'bai'] },
  { faces: ['zhi', 'xuan'] },
  { faces: ['zhi', 'xuan'] },
  { faces: ['du', 'bai'] },
  { faces: ['du', 'bai'] },
];

function countFaces(st) {
  const c = { xuan: 0, bai: 0, zhi: 0, du: 0 };
  st.forEach(f => { c[f]++; });
  return c;
}

function comboLabel(c) {
  const p = [];
  for (let i = 0; i < c.xuan; i++) p.push('黑');
  for (let i = 0; i < c.du; i++) p.push('犊');
  for (let i = 0; i < c.zhi; i++) p.push('雉');
  for (let i = 0; i < c.bai; i++) p.push('白');
  return p.join('');
}

function match(c, o) {
  return c.xuan === o.xuan && c.bai === o.bai && c.zhi === o.zhi && c.du === o.du;
}

function dist(c, o) {
  return Math.abs(c.xuan - o.xuan) + Math.abs(c.bai - o.bai)
    + Math.abs(c.zhi - o.zhi) + Math.abs(c.du - o.du);
}

const keys = [];
const n = 5;
const idx = new Array(n).fill(0);

(function walk(i) {
  if (i >= n) {
    const faces = STICK_DEFS.map((d, j) => d.faces[idx[j]]);
    const cc = countFaces(faces);
    keys.push({ faces, key: faces.join(','), phys: comboLabel(cc), cc });
    return;
  }
  for (let f = 0; f < 2; f++) {
    idx[i] = f;
    walk(i + 1);
  }
})(0);

const rem = {};
outcomes.forEach(o => { rem[o.id] = o.q; });
const map = {};
const SINGLE = new Set(['lu', 'zhi', 'du', 'bai']);

function takeKey(k, rowId) {
  if (map[k.key]) return false;
  if (rem[rowId] <= 0) return false;
  rem[rowId]--;
  map[k.key] = rowId;
  return true;
}

// 贵采：优先精确采组字面
['lu', 'zhi', 'du', 'bai'].forEach(id => {
  const row = outcomes.find(o => o.id === id);
  const hit = keys.find(k => !map[k.key] && k.phys === row.combo);
  if (hit) takeKey(hit, id);
});

// 其余：精确采组 → 精确面数 → 配额 + 最近面数（贵采不再占用）
keys.filter(k => !map[k.key] && outcomes.some(o => o.combo === k.phys && rem[o.id] > 0)).forEach(k => {
  takeKey(k, outcomes.find(o => o.combo === k.phys && rem[o.id] > 0).id);
});

keys.filter(k => !map[k.key]).forEach(k => {
  const row = outcomes.find(o => match(k.cc, o) && rem[o.id] > 0);
  if (row) takeKey(k, row.id);
});

keys.filter(k => !map[k.key]).sort((a, b) => {
  const ea = outcomes.find(o => match(a.cc, o));
  const eb = outcomes.find(o => match(b.cc, o));
  return (eb ? 0 : 1) - (ea ? 0 : 1);
}).forEach(k => {
  let pool = outcomes.filter(o => rem[o.id] > 0 && !SINGLE.has(o.id));
  if (!pool.length) pool = outcomes.filter(o => rem[o.id] > 0);
  let best = null;
  let bd = 999;
  pool.forEach(o => {
    const d = dist(k.cc, o);
    if (d < bd) { bd = d; best = o; }
  });
  if (best) takeKey(k, best.id);
});

// 贵采若仍未分配：取与表内面数最近的一枚
SINGLE.forEach(id => {
  if (rem[id] <= 0) return;
  const row = outcomes.find(o => o.id === id);
  let bestK = null;
  let bd = 999;
  keys.filter(k => !map[k.key]).forEach(k => {
    const d = dist(k.cc, row);
    if (d < bd) { bd = d; bestK = k; }
  });
  if (bestK) takeKey(bestK, id);
});

console.log('remaining', rem);
Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => {
  console.log(`    '${k}': '${v}',`);
});
