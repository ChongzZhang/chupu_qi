// 《樗蒲宫棋》五木投掷 — 固定五筹独立投掷
// 凡筹×1（黑|白）；雉筹×2（雉|黑，仅黑面）；犊筹×2（犊|白，仅白面）

const Chupu = (() => {
  const FACE = { XUAN: 'xuan', BAI: 'bai', ZHI: 'zhi', DU: 'du' };

  /** 固定五筹：每枚仅两向朝面，独立投掷 */
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

  function distCounts(c, o) {
    let d = Math.abs(c.xuan - o.xuan) + Math.abs(c.bai - o.bai)
      + Math.abs(c.zhi - o.zhi) + Math.abs(c.du - o.du);
    if (o.zhi > c.zhi) d += (o.zhi - c.zhi) * 4;
    if (o.du > c.du) d += (o.du - c.du) * 4;
    return d;
  }

  function resolveCai(sticks) {
    const c = countFaces(sticks);
    const physicalCombo = comboLabel(c);

    let row = DATA.chupuOutcomes.find(o => o.combo === physicalCombo);
    if (!row) {
      row = DATA.chupuOutcomes.find(o => o.xuan === c.xuan && o.bai === c.bai
        && o.zhi === c.zhi && o.du === c.du);
    }
    if (!row) {
      let best = null;
      let bd = 999;
      DATA.chupuOutcomes.forEach(o => {
        const d = distCounts(c, o);
        if (d < bd) { bd = d; best = o; }
      });
      row = best || DATA.chupuOutcomes[0];
    }

    return {
      id: row.id,
      name: row.name,
      points: row.points,
      royal: row.royal,
      combo: physicalCombo,
      tallyText: physicalCombo,
      prob: row.prob,
    };
  }

  function roll() {
    const detailed = rollSticksDetailed();
    const sticks = detailed.map(s => s.face);
    const cai = resolveCai(sticks);
    return {
      sticks,
      stickTypes: detailed.map(s => s.type),
      stickSlots: detailed.map(s => s.slot),
      ...cai,
    };
  }

  /** 雉筹仅黑面、犊筹仅白面；标记面写雉/犊 */
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
    roll,
    rollSticks,
    rollSticksDetailed,
    resolveCai,
    countFaces,
    comboLabel,
    stickVisual,
    slotLabels,
    enumerateKeys,
    faceColors,
    faceLabels,
  };
})();
