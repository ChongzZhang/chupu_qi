// 《樗蒲宫棋》迷宫生成 — 32×32 多通路迷宫

const Maze = (() => {
  const SIZE = 32;
  const BASE_A = { x: 1, y: 1 };
  const BASE_B = { x: SIZE - 2, y: SIZE - 2 };
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  function idx(x, y) { return y * SIZE + x; }

  function isPass(cells, x, y) {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE && cells[idx(x, y)] === 1;
  }

  function bfsDist(cells, sx, sy) {
    const dist = new Int16Array(SIZE * SIZE);
    dist.fill(-1);
    const q = [sx, sy];
    dist[idx(sx, sy)] = 0;
    let head = 0;
    while (head < q.length) {
      const x = q[head++];
      const y = q[head++];
      const d = dist[idx(x, y)];
      for (let i = 0; i < 4; i++) {
        const nx = x + DX[i], ny = y + DY[i];
        if (!isPass(cells, nx, ny) || dist[idx(nx, ny)] >= 0) continue;
        dist[idx(nx, ny)] = d + 1;
        q.push(nx, ny);
      }
    }
    return dist;
  }

  function isConnected(cells, ax, ay, bx, by) {
    const dist = bfsDist(cells, ax, ay);
    return dist[idx(bx, by)] >= 0;
  }

  function carveBacktracker(cells) {
    cells.fill(0);
    cells[idx(BASE_A.x, BASE_A.y)] = 1;
    cells[idx(BASE_B.x, BASE_B.y)] = 1;

    const stack = [{ x: BASE_A.x, y: BASE_A.y }];
    const visited = new Uint8Array(SIZE * SIZE);
    visited[idx(BASE_A.x, BASE_A.y)] = 1;

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const neighbors = [];
      for (let i = 0; i < 4; i++) {
        const nx = cur.x + DX[i] * 2;
        const ny = cur.y + DY[i] * 2;
        if (nx <= 0 || nx >= SIZE - 1 || ny <= 0 || ny >= SIZE - 1) continue;
        if (visited[idx(nx, ny)]) continue;
        neighbors.push({ nx, ny, wx: cur.x + DX[i], wy: cur.y + DY[i] });
      }
      if (!neighbors.length) { stack.pop(); continue; }
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      cells[idx(pick.wx, pick.wy)] = 1;
      cells[idx(pick.nx, pick.ny)] = 1;
      visited[idx(pick.nx, pick.ny)] = 1;
      stack.push({ x: pick.nx, y: pick.ny });
    }
  }

  function openToDensity(cells, targetRatio) {
    const targetOpen = Math.floor(SIZE * SIZE * targetRatio);
    let openCount = 0;
    for (let i = 0; i < cells.length; i++) if (cells[i]) openCount++;

    const walls = [];
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        if (!cells[idx(x, y)]) walls.push(x, y);
      }
    }

    for (let i = walls.length - 2; i > 0; i -= 2) {
      const j = Math.floor(Math.random() * (i / 2 + 1)) * 2;
      const tx = walls[i]; walls[i] = walls[j]; walls[j] = tx;
      const ty = walls[i + 1]; walls[i + 1] = walls[j + 1]; walls[j + 1] = ty;
    }

    let wi = 0;
    while (openCount < targetOpen && wi < walls.length) {
      const x = walls[wi++];
      const y = walls[wi++];
      if (cells[idx(x, y)]) continue;
      cells[idx(x, y)] = 1;
      if (!isConnected(cells, BASE_A.x, BASE_A.y, BASE_B.x, BASE_B.y)) {
        cells[idx(x, y)] = 0;
        continue;
      }
      openCount++;
    }
  }

  function addShortcuts(cells, count) {
    const passages = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (cells[idx(x, y)]) passages.push({ x, y });
      }
    }

    for (let n = 0; n < count; n++) {
      const a = passages[Math.floor(Math.random() * passages.length)];
      const b = passages[Math.floor(Math.random() * passages.length)];
      const md = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (md < 16) continue;
      if (Math.random() > 0.3) continue;

      let x = a.x, y = a.y;
      while (x !== b.x || y !== b.y) {
        if (x !== b.x) x += x < b.x ? 1 : -1;
        else if (y !== b.y) y += y < b.y ? 1 : -1;
        if (x > 0 && x < SIZE - 1 && y > 0 && y < SIZE - 1) cells[idx(x, y)] = 1;
      }
    }
  }

  function ensureBases(cells) {
    cells[idx(BASE_A.x, BASE_A.y)] = 1;
    cells[idx(BASE_B.x, BASE_B.y)] = 1;
    if (isConnected(cells, BASE_A.x, BASE_A.y, BASE_B.x, BASE_B.y)) return;

    let x = BASE_A.x, y = BASE_A.y;
    while (x !== BASE_B.x || y !== BASE_B.y) {
      if (x !== BASE_B.x) x += x < BASE_B.x ? 1 : -1;
      else y += y < BASE_B.y ? 1 : -1;
      cells[idx(x, y)] = 1;
    }
  }

  function generate(densityRatio) {
    let cells;
    for (let attempt = 0; attempt < 8; attempt++) {
      cells = new Uint8Array(SIZE * SIZE);
      carveBacktracker(cells);
      openToDensity(cells, densityRatio);
      addShortcuts(cells, 12 + Math.floor(Math.random() * 8));
      ensureBases(cells);
      if (isConnected(cells, BASE_A.x, BASE_A.y, BASE_B.x, BASE_B.y)) break;
    }
    return {
      size: SIZE,
      cells,
      baseA: { ...BASE_A },
      baseB: { ...BASE_B },
    };
  }

  function getNeighbors(cells, x, y) {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const nx = x + DX[i], ny = y + DY[i];
      if (isPass(cells, nx, ny)) out.push({ x: nx, y: ny });
    }
    return out;
  }

  return {
    SIZE,
    BASE_A,
    BASE_B,
    idx,
    isPass,
    bfsDist,
    generate,
    getNeighbors,
  };
})();
