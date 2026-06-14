// 《樗蒲宫棋》五木投掷 — 固定五筹 + 严格 32→12 采组映射
// 凡筹×1（黑|白）；雉筹×2（雉|黑）；犊筹×2（犊|白）

const Chupu = (() => {
  const FACE = { XUAN: 'xuan', BAI: 'bai', ZHI: 'zhi', DU: 'du' };

  const STICK_DEFS = [
    {
      slot: '凡', type: 'plain',
      faces: [FACE.XUAN, FACE.BAI],
      roll: () => (Math.random() < 0.5 ? FACE.XUAN : FACE.BAI),
    },
    {
      slot: '雉', type: 'zhi',
      faces: [FACE.ZHI, FACE.XUAN],
      roll: () => (Math.random() < 0.5 ? FACE.ZHI : FACE.XUAN),
    },
    {
      slot: '雉', type: 'zhi',
      faces: [FACE.ZHI, FACE.XUAN],
      roll: () => (Math.random() < 0.5 ? FACE.ZHI : FACE.XUAN),
    },
    {
      slot: '犊', type: 'du',
      faces: [FACE.DU, FACE.BAI],
      roll: () => (Math.random() < 0.5 ? FACE.DU : FACE.BAI),
    },
    {
      slot: '犊', type: 'du',
      faces: [FACE.DU, FACE.BAI],
      roll: () => (Math.random() < 0.5 ? FACE.DU : FACE.BAI),
    },
  ];

  const STICKS = STICK_DEFS;

  function enumerateKeys() {
    const keys = [];
    const n = STICK_DEFS.length;
    const idx = new Array(n).fill(0);

    function walk(i) {
      if (i >= n) {
        const faces = STICK_DEFS.map((def, j) => def.faces[idx[j]]);
        const cc = countFaces(faces);
        keys.push({ faces, cc, key: faces.join(','), phys: comboLabel(cc) });
        return;
      }
      for (let f = 0; f < STICK_DEFS[i].faces.length; f++) {
        idx[i] = f;
        walk(i + 1);
      }
    }
    walk(0);
    return keys;
  }

  function rollSticksDetailed() {
    return STICK_DEFS.map(def => ({
      slot: def.slot,
      type: def.type,
      face: def.roll(),
    }));
  }

  function rollSticks() {
    return rollSticksDetailed().map(s => s.face);
  }

  function countFaces(sticks) {
    const c = { xuan: 0, bai: 0, zhi: 0, du: 0 };
    sticks.forEach(f => { c[f]++; });
    return c;
  }

  function comboLabel(c) {
    const parts = [];
    for (let i = 0; i < c.xuan; i++) parts.push('黑');
    for (let i = 0; i < c.du; i++) parts.push('犊');
    for (let i = 0; i < c.zhi; i++) parts.push('雉');
    for (let i = 0; i < c.bai; i++) parts.push('白');
    return parts.join('');
  }

  function faceLabel(face, type) {
    if (type === 'zhi') return face === FACE.ZHI ? '雉' : '黑';
    if (type === 'du') return face === FACE.DU ? '犊' : '白';
    return face === FACE.BAI ? '白' : '黑';
  }

  /** 五筹顺序（凡·雉·雉·犊·犊）的实际朝上面 */
  function rollLabel(sticks, stickTypes) {
    const types = stickTypes || STICK_DEFS.map(d => d.type);
    return sticks.map((f, i) => faceLabel(f, types[i])).join('');
  }

  function outcomeById(id) {
    return DATA.chupuOutcomes.find(o => o.id === id);
  }

  const RESOLVE_MAP = { ...DATA.chupu32Map };

  function resolveCai(sticks, stickTypes) {
    const key = sticks.join(',');
    const id = RESOLVE_MAP[key];
    const row = outcomeById(id) || DATA.chupuOutcomes[0];
    const types = stickTypes || STICK_DEFS.map(d => d.type);
    const faces = rollLabel(sticks, types);
    return {
      id: row.id,
      name: row.name,
      points: row.points,
      royal: row.royal,
      combo: row.combo,
      faces,
      tallyText: row.combo,
      prob: row.prob,
    };
  }

  function roll() {
    const detailed = rollSticksDetailed();
    const sticks = detailed.map(s => s.face);
    const stickTypes = detailed.map(s => s.type);
    const cai = resolveCai(sticks, stickTypes);
    return {
      sticks,
      stickTypes,
      stickSlots: detailed.map(s => s.slot),
      ...cai,
    };
  }

  function stickVisual(face, stickType) {
    if (stickType === 'zhi') {
      return {
        base: '#1a1208',
        label: face === FACE.ZHI ? '雉' : '黑',
        light: false,
        ring: '#C8A040',
      };
    }
    if (stickType === 'du') {
      return {
        base: '#f0e8d8',
        label: face === FACE.DU ? '犊' : '白',
        light: true,
        ring: '#8A7040',
      };
    }
    return {
      base: face === FACE.BAI ? '#f0e8d8' : '#1a1208',
      label: face === FACE.BAI ? '白' : '黑',
      light: face === FACE.BAI,
      ring: null,
    };
  }

  function slotLabels() {
    return STICK_DEFS.map(d => d.slot);
  }

  const faceColors = {
    xuan: '#1a1208',
    bai: '#f0e8d8',
    zhi: '#1a1208',
    du: '#f0e8d8',
  };

  const faceLabels = {
    xuan: '黑',
    bai: '白',
    zhi: '雉',
    du: '犊',
  };

  return {
    FACE,
    STICKS,
    STICK_DEFS,
    RESOLVE_MAP,
    roll,
    rollSticks,
    rollSticksDetailed,
    resolveCai,
    countFaces,
    comboLabel,
    rollLabel,
    stickVisual,
    slotLabels,
    enumerateKeys,
    faceColors,
    faceLabels,
  };
})();
