// 《樗蒲宫棋》数据与文案

const DATA = {
  winScore: 10,
  timerMax: 30,
  scorePieceCount: 6,

  mazeDensities: [
    { id: '50', label: '幽径', ratio: 0.50, desc: '墙垣密布，曲折幽深。' },
    { id: '60', label: '回廊', ratio: 0.60, desc: '通路适中，岔路纵横。' },
    { id: '70', label: '广庭', ratio: 0.70, desc: '敞亮通达，纵横交错。' },
  ],

  aiLevels: [
    { name: '垂髫', title: '总角小儿', desc: '随机择路，偶有拾得，尚不懂布局。' },
    { name: '后生', title: '少年游侠', desc: '朝最近玉豆而行，能避路障，欠长远考量。' },
    { name: '公子', title: '王孙公子', desc: '多步预判，权衡取豆与截击，善设路障。' },
    { name: '老者', title: '隐逸棋叟', desc: '穷举本回合最优路径，取豆、截敌、控场兼施。' },
  ],

  chupuIntro: '固定五筹：凡筹一枚（黑|白）；雉筹两枚（雉|黑）；犊筹两枚（犊|白）。每枚独立投掷，雉仅黑面、犊仅白面。',

  rollHint: '掷定采组 · 筴数即步数 · 王采须先投放路障',

  chupuSticks: [
    { type: 'plain', count: 1, faces: ['xuan', 'bai'], tag: '黑|白' },
    { type: 'zhi', count: 2, faces: ['zhi', 'xuan'], tag: '雉|黑' },
    { type: 'du', count: 2, faces: ['du', 'bai'], tag: '犊|白' },
  ],

  /** 十二采组 — 与标准 32 组合表一致；q 为 32 组合中的出现次数 */
  chupuOutcomes: [
    { id: 'lu', combo: '黑黑黑犊犊', xuan: 3, du: 2, bai: 0, zhi: 0, name: '卢', points: 16, royal: true, prob: '1/32', q: 1 },
    { id: 'sai', combo: '黑黑黑犊雉', xuan: 3, du: 1, bai: 0, zhi: 1, name: '塞', points: 11, royal: false, prob: '2/32', q: 2 },
    { id: 'tu', combo: '黑黑犊犊白', xuan: 2, du: 2, bai: 1, zhi: 0, name: '秃', points: 4, royal: false, prob: '3/32', q: 3 },
    { id: 'zhi', combo: '黑黑黑雉雉', xuan: 3, du: 0, bai: 0, zhi: 2, name: '雉', points: 14, royal: true, prob: '1/32', q: 1 },
    { id: 'xiao_a', combo: '黑黑犊雉白', xuan: 2, du: 1, bai: 1, zhi: 1, name: '枭', points: 2, royal: false, prob: '6/32', q: 6 },
    { id: 'xiao_b', combo: '黑犊犊白白', xuan: 1, du: 2, bai: 2, zhi: 0, name: '枭', points: 2, royal: false, prob: '3/32', q: 3 },
    { id: 'jue_a', combo: '黑黑雉雉白', xuan: 2, du: 0, bai: 1, zhi: 2, name: '撅', points: 3, royal: false, prob: '3/32', q: 3 },
    { id: 'jue_b', combo: '黑犊雉白白', xuan: 1, du: 1, bai: 2, zhi: 1, name: '撅', points: 3, royal: false, prob: '6/32', q: 6 },
    { id: 'du', combo: '犊犊白白白', xuan: 0, du: 2, bai: 3, zhi: 0, name: '犊', points: 10, royal: true, prob: '1/32', q: 1 },
    { id: 'ta', combo: '黑雉雉白白', xuan: 1, du: 0, bai: 2, zhi: 2, name: '塔', points: 5, royal: false, prob: '3/32', q: 3 },
    { id: 'kai', combo: '犊雉白白白', xuan: 0, du: 1, bai: 3, zhi: 1, name: '开', points: 12, royal: false, prob: '2/32', q: 2 },
    { id: 'bai', combo: '雉雉白白白', xuan: 0, du: 0, bai: 3, zhi: 2, name: '白', points: 8, royal: true, prob: '1/32', q: 1 },
  ],

  /** 32 种物理掷面 → 采组 id（固定，勿运行时生成） */
  chupu32Map: {
    'bai,xuan,xuan,bai,bai': 'zhi',
    'bai,xuan,xuan,bai,du': 'du',
    'bai,xuan,xuan,du,bai': 'kai',
    'bai,xuan,xuan,du,du': 'tu',
    'bai,xuan,zhi,bai,bai': 'kai',
    'bai,xuan,zhi,bai,du': 'jue_b',
    'bai,xuan,zhi,du,bai': 'jue_b',
    'bai,xuan,zhi,du,du': 'ta',
    'bai,zhi,xuan,bai,bai': 'ta',
    'bai,zhi,xuan,bai,du': 'jue_b',
    'bai,zhi,xuan,du,bai': 'jue_b',
    'bai,zhi,xuan,du,du': 'jue_a',
    'bai,zhi,zhi,bai,bai': 'bai',
    'bai,zhi,zhi,bai,du': 'jue_b',
    'bai,zhi,zhi,du,bai': 'jue_b',
    'bai,zhi,zhi,du,du': 'xiao_b',
    'xuan,xuan,xuan,bai,bai': 'xiao_b',
    'xuan,xuan,xuan,bai,du': 'xiao_b',
    'xuan,xuan,xuan,du,bai': 'tu',
    'xuan,xuan,xuan,du,du': 'lu',
    'xuan,xuan,zhi,bai,bai': 'jue_a',
    'xuan,xuan,zhi,bai,du': 'xiao_a',
    'xuan,xuan,zhi,du,bai': 'xiao_a',
    'xuan,xuan,zhi,du,du': 'tu',
    'xuan,zhi,xuan,bai,bai': 'jue_a',
    'xuan,zhi,xuan,bai,du': 'xiao_a',
    'xuan,zhi,xuan,du,bai': 'xiao_a',
    'xuan,zhi,xuan,du,du': 'sai',
    'xuan,zhi,zhi,bai,bai': 'ta',
    'xuan,zhi,zhi,bai,du': 'xiao_a',
    'xuan,zhi,zhi,du,bai': 'xiao_a',
    'xuan,zhi,zhi,du,du': 'sai',
  },

  chupuTable: [
    { name: '卢', points: 16, royal: true, desc: '五筹尽玄，至尊之采。' },
    { name: '白', points: 8, royal: true, desc: '五筹尽白，贵采之一。' },
    { name: '雉', points: 14, royal: true, desc: '二雉三玄，猛禽之采。' },
    { name: '犊', points: 10, royal: true, desc: '二犊三白，牛犊之采。' },
    { name: '开', points: 12, royal: false, desc: '一犊四白，甿采。' },
    { name: '塞', points: 11, royal: false, desc: '一雉四玄，甿采。' },
    { name: '塔', points: 5, royal: false, desc: '二雉二白一玄，甿采。' },
    { name: '秃', points: 4, royal: false, desc: '二犊二玄一白，甿采。' },
    { name: '撅', points: 3, royal: false, desc: '三白二玄，甿采。' },
    { name: '枭', points: 2, royal: false, desc: '三玄二白，甿采。' },
  ],

  quotes: [
    { text: '樗蒲，五木，玄白判。王采四：卢、白、雉、牛。', source: '唐·李翱《五木经》' },
    { text: '投有五，故自呼为五木。以木为之，因谓之木。', source: '《五木经》' },
    { text: '二人对局，先列棋相当，下呼上击之。', source: '晋·徐广《弹棋经》' },
    { text: '寂处园林，手谈一局，忘却尘俗，此乐何极。', source: '文人雅集记' },
  ],

  history: [
    { era: '汉代', desc: '樗蒲源于军中，以樗木为筹，五枚一组，称五木之戏。' },
    { era: '魏晋', desc: '樗蒲与宫棋并传，名士雅集，投采行棋，风行一时。' },
    { era: '唐代', desc: '李翱著《五木经》，详述卢雉犊白等十采名堂。' },
    { era: '宋代', desc: '《宋史》载樗蒲行棋之法，与飞行棋相类，追吃夺子。' },
  ],

  teamNames: {
    black: { label: '玄方', color: '#1E0E04' },
    white: { label: '白方', color: '#F5F0E0' },
  },

  modeDesc: {
    '2P': { title: '双人对弈', desc: '两位玩家同机轮流操作，投五木定步、迷宫择路，先至十分者胜。' },
    '1P': { title: '人机对弈', desc: '与 AI 对弈。请在左侧选择对手等级，右侧可查看其棋风说明。' },
  },
};
