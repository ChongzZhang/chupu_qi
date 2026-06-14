// 逻辑自测（node scripts/test-logic.js）

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

let code = '';
['data.js', 'maze.js', 'chupu.js', 'board.js'].forEach(f => {
  code += fs.readFileSync(path.join(root, 'js', f), 'utf8') + '\n';
});

code += `
const m = Maze.generate(0.6);
console.log('对角连通:', Maze.bfsDist(m.cells, 1, 1)[Maze.idx(30, 30)] >= 0);
const b = Board.create(m);
console.log('得分棋:', b.scorePieces.length);

let ok = 0;
for (let i = 0; i < 5000; i++) if (Chupu.roll().id) ok++;
console.log('采组覆盖率:', (ok / 50).toFixed(1) + '%');
if (ok < 5000) throw new Error('采组未全覆盖');

const lu = Chupu.resolveCai(['xuan', 'xuan', 'xuan', 'du', 'du']);
if (lu.name !== '卢' || lu.combo !== '黑黑黑犊犊' || !lu.royal) {
  throw new Error('三黑双犊应为卢贵采');
}
console.log('卢 →', lu.name, lu.combo, lu.faces, lu.points + '筴');

const notLu = Chupu.resolveCai(['xuan', 'xuan', 'zhi', 'du', 'du']);
if (notLu.name === '卢') throw new Error('黑黑犊犊雉不应判为卢');
console.log('黑黑犊犊雉 →', notLu.name, notLu.combo, notLu.faces);

const xiao = Chupu.resolveCai(['xuan', 'xuan', 'zhi', 'du', 'bai']);
if (xiao.name !== '枭' || xiao.combo !== '黑黑犊雉白' || xiao.points !== 2) {
  throw new Error('黑黑犊雉白应为枭2筴');
}
console.log('枭 →', xiao.name, xiao.combo, xiao.faces);

if (Chupu.enumerateKeys().length !== 32) throw new Error('五木组合应为32种');
if (Object.keys(Chupu.RESOLVE_MAP).length !== 32) throw new Error('映射表应为32条');

console.log('自测通过');
`;

vm.runInThisContext(code);
