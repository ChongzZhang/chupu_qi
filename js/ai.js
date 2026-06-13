// 《樗蒲宫棋》AI — 四档；老者级记忆化 DFS 最优路径

const AI = (() => {
  function cloneBoard(board) {
    return {
      maze: board.maze,
      size: board.size,
      cells: board.cells,
      main: {
        black: { ...board.main.black },
        white: { ...board.main.white },
      },
      bases: board.bases,
      scorePieces: board.scorePieces.map(p => ({ ...p })),
      obstacles: board.obstacles.map(o => ({ ...o })),
    };
  }

  function scorePiecesKey(board) {
    return board.scorePieces.map(p => `${p.x},${p.y}`).sort().join('|');
  }

  function applyStep(board, team, to) {
    const obs = Board.getObstacleAt(board, to.x, to.y);
    let gained = 0;
    let blocked = false;
    if (Board.collectScoreAt(board, to.x, to.y)) gained = 1;
    Board.moveMain(board, team, to.x, to.y);
    if (obs && obs.owner !== team) blocked = true;
    return { gained, blocked };
  }

  function evaluateState(board, team, stepsUsed, scoreGained, blocked, stepsLeft, level) {
    const main = board.main[team];
    const enemy = team === 'black' ? 'white' : 'black';
    let v = scoreGained * 250;

    const dist = Board.minDistToScore(board, main.x, main.y);
    if (dist <= stepsLeft) v += 180;
    v += Math.max(0, 50 - dist) * 4;

    const enemyMain = board.main[enemy];
    const dEnemy = Board.distBetween(board, main.x, main.y, enemyMain.x, enemyMain.y);
    if (level >= 3) v += Math.max(0, 24 - dEnemy) * 2;

    v -= stepsUsed * 3;
    if (blocked) v -= 200;
    return v;
  }

  function searchBest(board, team, stepsLeft, level, memo) {
    const main = board.main[team];
    const key = `${main.x},${main.y},${stepsLeft},${scorePiecesKey(board)}`;
    if (memo.has(key)) return memo.get(key);

    if (stepsLeft <= 0) {
      const val = evaluateState(board, team, 0, 0, false, 0, level);
      const res = { value: val, move: null };
      memo.set(key, res);
      return res;
    }

    const moves = Board.getNeighbors(board, main.x, main.y);
    if (!moves.length) {
      const val = evaluateState(board, team, 0, 0, false, stepsLeft, level);
      const res = { value: val, move: null };
      memo.set(key, res);
      return res;
    }

    let best = { value: -Infinity, move: moves[0] };
    for (const m of moves) {
      const nb = cloneBoard(board);
      const { gained, blocked } = applyStep(nb, team, m);
      if (blocked) {
        const val = evaluateState(nb, team, 1, gained, true, stepsLeft - 1, level);
        if (val > best.value) best = { value: val, move: m };
        continue;
      }
      const sub = searchBest(nb, team, stepsLeft - 1, level, memo);
      const val = sub.value + gained * 80;
      if (val > best.value) best = { value: val, move: m };
    }
    memo.set(key, best);
    return best;
  }

  function pickMove(board, team, level, stepsLeft) {
    const main = board.main[team];
    const moves = Board.getNeighbors(board, main.x, main.y);
    if (!moves.length) return null;

    if (level === 1) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    if (level === 2) {
      let best = moves[0];
      let bestScore = -Infinity;
      moves.forEach(m => {
        let s = 0;
        if (board.scorePieces.some(p => p.x === m.x && p.y === m.y)) s += 100;
        const before = Board.minDistToScore(board, main.x, main.y);
        const after = Board.minDistToScore(board, m.x, m.y);
        s += (before - after) * 8;
        const obs = Board.getObstacleAt(board, m.x, m.y);
        if (obs && obs.owner !== team) s -= 150;
        if (s > bestScore) { bestScore = s; best = m; }
      });
      return best;
    }

    const depth = Math.min(stepsLeft || 1, level >= 4 ? 16 : 12);
    const memo = new Map();
    const { move } = searchBest(board, team, depth, level, memo);
    return move || moves[0];
  }

  function pickObstacleSpot(board, team, level) {
    const enemy = team === 'black' ? 'white' : 'black';
    const enemyMain = board.main[enemy];
    const candidates = [];

    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        if (!Board.canPlaceObstacle(board, x, y, team)) continue;
        const d = Board.distBetween(board, x, y, enemyMain.x, enemyMain.y);
        if (d > 16) continue;
        let s = 40 - d;
        const beanDist = Board.minDistToScore(board, x, y);
        if (beanDist <= 4) s += 12;
        const neighbors = Board.getNeighbors(board, x, y);
        if (neighbors.length >= 3) s += 6;
        candidates.push({ x, y, s: s + (level <= 2 ? Math.random() * 6 : 0) });
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.s - a.s);
    return candidates[0];
  }

  function shouldUseSkill(level) {
    if (level === 1) return Math.random() < 0.2;
    if (level === 2) return Math.random() < 0.5;
    if (level === 3) return Math.random() < 0.75;
    return true;
  }

  function shouldPlaceObstacleMidMove(level, stepsLeft) {
    if (level <= 1) return false;
    if (level >= 4) return stepsLeft <= 4;
    return level >= 3 && stepsLeft <= 3;
  }

  return {
    pickMove,
    pickObstacleSpot,
    shouldUseSkill,
    shouldPlaceObstacleMidMove,
  };
})();
