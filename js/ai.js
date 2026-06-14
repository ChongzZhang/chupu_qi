// 《樗蒲宫棋》AI — 四档；老者级记忆化 DFS（含路障判定与越障决策）

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

  function obstaclesKey(board) {
    return board.obstacles.map(o => `${o.x},${o.y},${o.owner}`).sort().join('|');
  }

  function hasScoreAt(board, x, y) {
    return board.scorePieces.some(p => p.x === x && p.y === y);
  }

  function applyStep(board, team, to) {
    const obs = Board.getObstacleAt(board, to.x, to.y);
    let gained = 0;
    let blocked = false;
    if (Board.collectScoreAt(board, to.x, to.y)) gained = 1;
    Board.moveMain(board, team, to.x, to.y);
    if (obs && obs.owner !== team) {
      blocked = true;
      Board.removeObstacleAt(board, to.x, to.y);
    }
    return { gained, blocked };
  }

  function evaluateState(board, team, scoreGained, blocked, stepsLeft, level) {
    const main = board.main[team];
    const enemy = team === 'black' ? 'white' : 'black';
    let v = scoreGained * 280;

    const distSafe = Board.minDistToScore(board, main.x, main.y, team, true);
    const distAny = Board.minDistToScore(board, main.x, main.y, team, false);
    if (distSafe <= stepsLeft) v += 200;
    else if (distAny <= stepsLeft) v += 120;
    v += Math.max(0, 50 - distSafe) * 5;

    if (level >= 3) {
      const enemyMain = board.main[enemy];
      const dEnemy = Board.distBetween(board, main.x, main.y, enemyMain.x, enemyMain.y, team, true);
      v += Math.max(0, 22 - dEnemy) * 3;
    }

    if (blocked) {
      v -= scoreGained > 0 ? 40 : 220;
    }
    return v;
  }

  function searchBest(board, team, stepsLeft, level, memo) {
    const main = board.main[team];
    const key = `${main.x},${main.y},${stepsLeft},${scorePiecesKey(board)},${obstaclesKey(board)}`;
    if (memo.has(key)) return memo.get(key);

    if (stepsLeft <= 0) {
      const val = evaluateState(board, team, 0, false, 0, level);
      const res = { value: val, move: null };
      memo.set(key, res);
      return res;
    }

    const moves = Board.getNeighbors(board, main.x, main.y);
    if (!moves.length) {
      const val = evaluateState(board, team, 0, false, stepsLeft, level);
      const res = { value: val, move: null };
      memo.set(key, res);
      return res;
    }

    let best = { value: -Infinity, move: moves[0] };
    for (const m of moves) {
      const nb = cloneBoard(board);
      const enemyObs = Board.isEnemyObstacle(board, m.x, m.y, team);
      const bean = hasScoreAt(board, m.x, m.y);
      const { gained, blocked } = applyStep(nb, team, m);

      if (blocked) {
        const val = evaluateState(nb, team, gained, true, 0, level);
        if (val > best.value) best = { value: val, move: m };
        continue;
      }

      const sub = searchBest(nb, team, stepsLeft - 1, level, memo);
      let val = sub.value + gained * 90;
      if (enemyObs && !bean && level >= 2) val -= 8;
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
      const safe = moves.filter(m => !Board.isEnemyObstacle(board, m.x, m.y, team));
      const pool = safe.length ? safe : moves;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    if (level === 2) {
      let best = moves[0];
      let bestScore = -Infinity;
      moves.forEach(m => {
        let s = 0;
        const bean = hasScoreAt(board, m.x, m.y);
        const enemyObs = Board.isEnemyObstacle(board, m.x, m.y, team);

        if (bean) s += 120;
        const before = Board.minDistToScore(board, main.x, main.y, team, true);
        const after = Board.minDistToScore(board, m.x, m.y, team, true);
        s += (before - after) * 10;

        if (enemyObs) {
          if (bean) s += 60;
          else s -= 180;
        }

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
        const d = Board.distBetween(board, x, y, enemyMain.x, enemyMain.y, enemy, true);
        if (d > 18) continue;
        let s = 50 - d;
        const onPath = Board.distBetween(board, enemyMain.x, enemyMain.y, x, y, enemy, false);
        if (onPath <= 6) s += 20;
        const beanDist = Board.minDistToScore(board, x, y, enemy, true);
        if (beanDist <= 5) s += 14;
        const neighbors = Board.getNeighbors(board, x, y);
        if (neighbors.length >= 3) s += 8;
        candidates.push({ x, y, s: s + (level <= 2 ? Math.random() * 5 : 0) });
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.s - a.s);
    return candidates[0];
  }

  function shouldUseSkill(level) {
    if (level === 1) return Math.random() < 0.25;
    if (level === 2) return Math.random() < 0.55;
    if (level === 3) return Math.random() < 0.8;
    return true;
  }

  function shouldPlaceObstacleMidMove(level, stepsLeft) {
    if (level <= 1) return false;
    if (level >= 4) return stepsLeft <= 5;
    return level >= 3 && stepsLeft <= 4;
  }

  return {
    pickMove,
    pickObstacleSpot,
    shouldUseSkill,
    shouldPlaceObstacleMidMove,
  };
})();
