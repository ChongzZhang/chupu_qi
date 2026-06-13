// 《樗蒲宫棋》棋盘逻辑

const Board = (() => {
  function create(mazeData) {
    const board = {
      maze: mazeData,
      size: mazeData.size,
      cells: mazeData.cells,
      main: {
        black: { x: mazeData.baseA.x, y: mazeData.baseA.y },
        white: { x: mazeData.baseB.x, y: mazeData.baseB.y },
      },
      bases: {
        black: { ...mazeData.baseA },
        white: { ...mazeData.baseB },
      },
      scorePieces: [],
      obstacles: [],
    };
    spawnInitialScorePieces(board, DATA.scorePieceCount);
    return board;
  }

  function isOccupied(board, x, y, ignoreTeam) {
    if (board.main.black.x === x && board.main.black.y === y && ignoreTeam !== 'black') return true;
    if (board.main.white.x === x && board.main.white.y === y && ignoreTeam !== 'white') return true;
    return false;
  }

  function randomPassageCell(board, exclude) {
    const ex = new Set(exclude.map(p => `${p.x},${p.y}`));
    const candidates = [];
    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        if (!Maze.isPass(board.cells, x, y)) continue;
        if (ex.has(`${x},${y}`)) continue;
        candidates.push({ x, y });
      }
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function getExcludeSet(board) {
    const ex = [
      board.main.black,
      board.main.white,
      board.bases.black,
      board.bases.white,
      ...board.scorePieces,
    ];
    return ex;
  }

  function spawnInitialScorePieces(board, count) {
    board.scorePieces = [];
    for (let i = 0; i < count; i++) spawnScorePiece(board);
  }

  function spawnScorePiece(board) {
    if (board.scorePieces.length >= DATA.scorePieceCount) return null;
    const ex = getExcludeSet(board);
    const cell = randomPassageCell(board, ex);
    if (!cell) return null;
    board.scorePieces.push(cell);
    return cell;
  }

  function getNeighbors(board, x, y) {
    return Maze.getNeighbors(board.cells, x, y);
  }

  function getObstacleAt(board, x, y) {
    return board.obstacles.find(o => o.x === x && o.y === y) || null;
  }

  function countObstacles(board, team) {
    return board.obstacles.filter(o => o.owner === team).length;
  }

  function canPlaceObstacle(board, x, y, team) {
    if (!Maze.isPass(board.cells, x, y)) return false;
    if (getObstacleAt(board, x, y)) return false;
    if (countObstacles(board, team) >= DATA.maxObstacles) return false;
    if (board.main.black.x === x && board.main.black.y === y) return false;
    if (board.main.white.x === x && board.main.white.y === y) return false;
    return true;
  }

  function placeObstacle(board, x, y, team) {
    if (!canPlaceObstacle(board, x, y, team)) return false;
    board.obstacles.push({ x, y, owner: team });
    return true;
  }

  function collectScoreAt(board, x, y) {
    const i = board.scorePieces.findIndex(p => p.x === x && p.y === y);
    if (i < 0) return false;
    board.scorePieces.splice(i, 1);
    spawnScorePiece(board);
    return true;
  }

  function moveMain(board, team, x, y) {
    board.main[team] = { x, y };
  }

  function distToNearestScore(board, x, y) {
    if (!board.scorePieces.length) return 9999;
    let min = 9999;
    board.scorePieces.forEach(p => {
      const d = Math.abs(p.x - x) + Math.abs(p.y - y);
      if (d < min) min = d;
    });
    return min;
  }

  function minDistToScore(board, x, y) {
    if (!board.scorePieces.length) return 9999;
    const dist = Maze.bfsDist(board.cells, x, y);
    let min = 9999;
    board.scorePieces.forEach(p => {
      const d = dist[Maze.idx(p.x, p.y)];
      if (d >= 0 && d < min) min = d;
    });
    return min;
  }

  function distBetween(board, x1, y1, x2, y2) {
    const dist = Maze.bfsDist(board.cells, x1, y1);
    const d = dist[Maze.idx(x2, y2)];
    return d >= 0 ? d : 9999;
  }

  return {
    create,
    getNeighbors,
    getObstacleAt,
    canPlaceObstacle,
    placeObstacle,
    collectScoreAt,
    moveMain,
    distToNearestScore,
    minDistToScore,
    distBetween,
    countObstacles,
    spawnScorePiece,
  };
})();
