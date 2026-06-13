// 浏览器运行冒烟测试（node scripts/smoke-test.js）
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
  'data.js', 'maze.js', 'chupu.js', 'board.js', 'audio.js',
  'renderer.js', 'input.js', 'ai.js', 'game.js',
];

let errors = [];
files.forEach(f => {
  try {
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
    new vm.Script(src, { filename: f });
  } catch (e) {
    errors.push(`${f}: ${e.message}`);
  }
});

if (errors.length) {
  console.error('语法错误:', errors);
  process.exit(1);
}

let code = `
global.document = { querySelectorAll: () => [], getElementById: () => null };
global.window = {
  addEventListener: () => {},
  innerWidth: 800, innerHeight: 600,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
  AudioContext: class {
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, value: 440 } }; }
    connect() {}
  },
  webkitAudioContext: null,
};
global.performance = { now: () => 0 };
global.requestAnimationFrame = () => {};
const canvas = {
  width: 800, height: 600,
  clientWidth: 800,
  clientHeight: 600,
  style: {},
  getContext: () => ({
    fillRect() {}, strokeRect() {}, fillText() {}, stroke() {}, beginPath() {},
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {},
    arc() {}, createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    fill() {}, setTransform() {}, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
    set font(v) {}, set textAlign(v) {}, set textBaseline(v) {}, set globalAlpha(v) {},
    save() {}, restore() {}, translate() {}, rotate() {}, clearRect() {},
    rect() {}, clip() {},
  }),
  addEventListener: () => {},
};
`;
code += files.map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
code += `
Audio.startGuqin = () => {};
Audio.chupuRoll = () => {};
Audio.chupuLand = () => {};
Audio.moveStep = () => {};
Audio.uiClick = () => {};
Audio.resume = () => {};
Game.init(canvas);
Game.startGame('2P', 1, 0.6);
const s = Game.state;
if (!s.board || s.phase !== 'playing') throw new Error('startGame failed');
if (s.board.size !== 32) throw new Error('board size should be 32');
// 模拟投掷后移动
const roll = Chupu.roll();
s.subPhase = 'moving';
s.stepsLeft = roll.points;
s.currentTurn = 'black';
const main = s.board.main.black;
const n = Board.getNeighbors(s.board, main.x, main.y);
if (n.length) Game.tryMoveDirection(n[0].x - main.x, n[0].y - main.y);
console.log('phase', s.phase, 'subPhase', s.subPhase, 'blackScore', s.blackScore);
console.log('方向键移动接口: OK');
console.log('冒烟测试通过');
`;

try {
  vm.runInThisContext(code);
} catch (e) {
  console.error('运行失败:', e.message);
  process.exit(1);
}
