// 《樗蒲宫棋》主游戏控制器

const Game = (() => {
  const state = {
    phase: 'menu',
    subPhase: 'waiting',
    mode: '2P',
    aiLevel: 1,
    aiTeam: 'white',
    mazeDensity: 0.6,

    currentTurn: 'black',
    blackScore: 0,
    whiteScore: 0,
    winner: null,

    board: null,
    stepsLeft: 0,
    lastCai: null,
    lastRoll: [],
    lastStickTypes: [],
    lastStickSlots: [],
    skillArmed: false,
    skillFromBank: false,
    skillUsedThisTurn: false,
    skillBank: { black: 0, white: 0 },
    placingObstacle: false,
    skipTurn: { black: false, white: false },

    timer: DATA.timerMax,
    timerActive: false,
    _timerInterval: null,

    highlightCells: [],
    highlightColor: 'rgba(200,160,64,0.45)',
    obstacleHighlight: [],

    overlayButtons: null,
    uiPanel: null,
    promptText: null,
    promptSub: null,
    gameoverButtons: null,

    _aiTimeout: null,
    _moveDelay: null,
  };

  let canvas;

  function init(c) {
    canvas = c;
    Renderer.init(c);
    Input.init(c);
    Audio.init();
    window.addEventListener('resize', onResize);
    onResize();

    Input.setOnCellClick(onCellClick);
    Input.setOnCanvasClick(onCanvasClick);
    Input.setOnDirection(tryMoveDirection);
  }

  function getViewportSize() {
    if (canvas) return Renderer.measureCanvas();
    const screen = document.getElementById('game-screen');
    if (screen && !screen.classList.contains('hidden') && screen.clientWidth > 0) {
      return { w: screen.clientWidth, h: screen.clientHeight };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function onResize() {
    if (!canvas) return;
    Renderer.resize();
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    if (id === 'game-screen') {
      requestAnimationFrame(() => {
        onResize();
        requestAnimationFrame(onResize);
      });
    }
  }

  function clearTimers() {
    if (state._timerInterval) { clearInterval(state._timerInterval); state._timerInterval = null; }
    if (state._aiTimeout) { clearTimeout(state._aiTimeout); state._aiTimeout = null; }
    if (state._moveDelay) { clearTimeout(state._moveDelay); state._moveDelay = null; }
    state.timerActive = false;
  }

  function startGame(mode, aiLevel, densityRatio) {
    clearTimers();
    state.phase = 'playing';
    state.subPhase = 'waiting';
    state.mode = mode;
    state.aiLevel = aiLevel || 1;
    state.aiTeam = 'white';
    state.mazeDensity = densityRatio || 0.6;
    state.currentTurn = 'black';
    state.blackScore = 0;
    state.whiteScore = 0;
    state.winner = null;
    state.stepsLeft = 0;
    state.lastCai = null;
    state.lastRoll = [];
    state.lastStickTypes = [];
    state.lastStickSlots = [];
    state.skillArmed = false;
    state.skillFromBank = false;
    state.skillUsedThisTurn = false;
    state.skillBank = { black: 0, white: 0 };
    state.placingObstacle = false;
    state.skipTurn = { black: false, white: false };
    state.highlightCells = [];
    state.obstacleHighlight = [];
    state.overlayButtons = null;
    state.uiPanel = null;
    state.promptText = null;
    state.promptSub = null;
    state.gameoverButtons = null;

    const maze = Maze.generate(state.mazeDensity);
    state.board = Board.create(maze);
    Renderer.resetCamera(maze.size);
    onResize();
    Renderer.fitEntireBoard();

    Audio.startGuqin();
    beginTurn();
  }

  function isAIturn() {
    return state.mode === '1P' && state.currentTurn === state.aiTeam;
  }

  function beginTurn() {
    state.subPhase = 'waiting';
    state.stepsLeft = 0;
    state.skillArmed = false;
    state.skillFromBank = false;
    state.skillUsedThisTurn = false;
    state.placingObstacle = false;
    state.highlightCells = [];
    state.obstacleHighlight = [];
    state.overlayButtons = null;
    state.uiPanel = null;
    state.promptText = null;
    state.promptSub = null;

    if (state.skipTurn[state.currentTurn]) {
      state.skipTurn[state.currentTurn] = false;
      endTurn();
      return;
    }

    startTimer();
    Renderer.fitEntireBoard();

    if (isAIturn()) {
      state._aiTimeout = setTimeout(() => doRoll(), 600);
    } else {
      showRollButton();
    }
  }

  function showRollButton() {
    state.uiPanel = 'roll';
    state.overlayButtons = null;
    state.promptText = null;
    state.promptSub = null;
  }

  function startTimer() {
    state.timer = DATA.timerMax;
    state.timerActive = true;
    if (state._timerInterval) clearInterval(state._timerInterval);
    state._timerInterval = setInterval(() => {
      state.timer -= 0.1;
      if (state.timer <= 0) {
        state.timer = 0;
        Audio.timeoutBeep();
        onTimeout();
      }
    }, 100);
  }

  function stopTimer() {
    state.timerActive = false;
    if (state._timerInterval) { clearInterval(state._timerInterval); state._timerInterval = null; }
  }

  function onTimeout() {
    stopTimer();
    if (state.subPhase === 'moving') {
      endTurn();
    } else if (state.subPhase === 'waiting') {
      doRoll();
    } else if (state.subPhase === 'skillPrompt') {
      confirmSkill(false);
    }
  }

  function doRoll() {
    state.uiPanel = null;
    state.overlayButtons = null;
    state.promptText = null;
    state.promptSub = null;

    const result = Chupu.roll();
    state.lastRoll = result.sticks;
    state.lastStickTypes = result.stickTypes;
    state.lastStickSlots = result.stickSlots;
    state.subPhase = 'rolling';

    Renderer.startRollAnim(result.sticks, () => {
      state.lastCai = result;
      state.stepsLeft = result.points;
      Renderer.showFlash(`${result.name} · ${result.combo} · ${result.points}筴`);

      if (result.royal) {
        Audio.royalCai();
        showSkillPrompt();
      } else {
        startMoving();
      }
    }, result.stickTypes, result.stickSlots);
  }

  function showSkillPrompt() {
    state.subPhase = 'skillPrompt';
    state.uiPanel = 'skill';
    state.promptText = `贵采「${state.lastCai.name}」· ${state.lastCai.points}筴`;
    state.promptSub = '王采可启用障碍道具：途中投放路障，己方通行，敌方踩之停一回合（每方最多3个）';
    state.overlayButtons = [
      { id: 'skillYes', label: '本回合启用', primary: true },
      { id: 'skillNo', label: '暂存技能', primary: false },
    ];

    if (isAIturn()) {
      state._aiTimeout = setTimeout(() => {
        confirmSkill(AI.shouldUseSkill(state.aiLevel));
      }, 800);
    }
  }

  function canPlaceSkill(team) {
    return Board.countObstacles(state.board, team) < DATA.maxObstacles;
  }

  function hasSkillOption() {
    const team = state.currentTurn;
    if (!canPlaceSkill(team)) return false;
    if (state.skillArmed && !state.skillUsedThisTurn) return true;
    return state.skillBank[team] > 0 && !state.skillUsedThisTurn;
  }

  function confirmSkill(use) {
    state.uiPanel = null;
    state.overlayButtons = null;
    state.promptText = null;
    state.promptSub = null;
    const team = state.currentTurn;
    if (use && canPlaceSkill(team)) {
      state.skillArmed = true;
      state.skillFromBank = false;
    } else if (!use) {
      state.skillBank[team]++;
      state.skillArmed = false;
      state.skillFromBank = false;
    }
    startMoving();
  }

  function startMoving() {
    state.subPhase = 'moving';
    const main = state.board.main[state.currentTurn];
    Renderer.exitOverview();
    Renderer.focusOn(main.x, main.y, true);
    updateMoveHighlights();

    if (isAIturn()) {
      scheduleAIMove();
    } else if (hasSkillOption()) {
      showPlaceObstacleOption();
    }
  }

  function showPlaceObstacleOption() {
    const team = state.currentTurn;
    const banked = state.skillBank[team];
    const label = state.skillArmed
      ? '投放障碍'
      : (banked > 1 ? `王采技能×${banked}` : '王采技能');
    const { W } = Renderer.playAreaSize();
    state.overlayButtons = [{
      id: 'placeObs', label, x: 16, y: 60, w: 112, h: 36, primary: false,
    }];
  }

  function updateMoveHighlights() {
    if (state.placingObstacle) {
      updateObstacleHighlights();
      return;
    }
    const main = state.board.main[state.currentTurn];
    state.highlightCells = Board.getNeighbors(state.board, main.x, main.y);
    state.obstacleHighlight = [];
  }

  function updateObstacleHighlights() {
    const team = state.currentTurn;
    const cells = [];
    for (let y = 0; y < state.board.size; y++) {
      for (let x = 0; x < state.board.size; x++) {
        if (Board.canPlaceObstacle(state.board, x, y, team)) cells.push({ x, y });
      }
    }
    state.obstacleHighlight = cells;
    state.highlightCells = [];
  }

  function scheduleAIMove() {
    if (state.stepsLeft <= 0) { endTurn(); return; }

    state._moveDelay = setTimeout(() => {
      if (state.placingObstacle) {
        const spot = AI.pickObstacleSpot(state.board, state.currentTurn, state.aiLevel);
        if (spot) {
          Board.placeObstacle(state.board, spot.x, spot.y, state.currentTurn);
          Audio.obstaclePlace();
        }
        state.placingObstacle = false;
        state.skillUsedThisTurn = true;
        state.skillArmed = false;
        if (state.skillFromBank) {
          state.skillBank[state.currentTurn] = Math.max(0, state.skillBank[state.currentTurn] - 1);
          state.skillFromBank = false;
        }
        state.overlayButtons = null;
        updateMoveHighlights();
        scheduleAIMove();
        return;
      }

      if (!state.skillUsedThisTurn && hasSkillOption()
        && AI.shouldPlaceObstacleMidMove(state.aiLevel, state.stepsLeft)) {
        if (!state.skillArmed && state.skillBank[state.currentTurn] > 0) {
          state.skillArmed = true;
          state.skillFromBank = true;
        }
        state.placingObstacle = true;
        updateObstacleHighlights();
        scheduleAIMove();
        return;
      }

      const move = AI.pickMove(state.board, state.currentTurn, state.aiLevel, state.stepsLeft);
      if (!move) { endTurn(); return; }
      executeMove(move.x, move.y);
    }, 350);
  }

  function executeMove(x, y) {
    const team = state.currentTurn;
    const main = state.board.main[team];
    const valid = Board.getNeighbors(state.board, main.x, main.y);
    if (!valid.some(c => c.x === x && c.y === y)) return;

    Board.moveMain(state.board, team, x, y);
    state.stepsLeft--;
    Audio.moveStep();

    const obs = Board.getObstacleAt(state.board, x, y);
    if (obs && obs.owner !== team) {
      Audio.blocked();
      state.skipTurn[team] = true;
      state.stepsLeft = 0;
      endTurn();
      return;
    }

    if (Board.collectScoreAt(state.board, x, y)) {
      if (team === 'black') state.blackScore++;
      else state.whiteScore++;
      Audio.scorePoint();
      Renderer.showFlash('+1');

      if (state.blackScore >= DATA.winScore || state.whiteScore >= DATA.winScore) {
        state.winner = state.blackScore >= DATA.winScore ? 'black' : 'white';
        gameOver();
        return;
      }
    }

    if (state.stepsLeft <= 0) {
      endTurn();
      return;
    }

    updateMoveHighlights();
    if (isAIturn()) scheduleAIMove();
    else if (hasSkillOption()) showPlaceObstacleOption();
  }

  function tryPlaceObstacle(x, y) {
    const team = state.currentTurn;
    if (!Board.canPlaceObstacle(state.board, x, y, team)) return false;
    Board.placeObstacle(state.board, x, y, team);
    Audio.obstaclePlace();
    state.placingObstacle = false;
    state.skillUsedThisTurn = true;
    state.skillArmed = false;
    if (state.skillFromBank) {
      state.skillBank[team] = Math.max(0, state.skillBank[team] - 1);
      state.skillFromBank = false;
    }
    state.overlayButtons = null;
    state.promptText = null;
    state.promptSub = null;
    updateMoveHighlights();
    if (isAIturn()) scheduleAIMove();
    else if (hasSkillOption() && state.stepsLeft > 0) showPlaceObstacleOption();
    return true;
  }

  function endTurn() {
    stopTimer();
    state.subPhase = 'waiting';
    state.highlightCells = [];
    state.obstacleHighlight = [];
    state.overlayButtons = null;
    state.placingObstacle = false;

    state.currentTurn = state.currentTurn === 'black' ? 'white' : 'black';
    beginTurn();
  }

  function gameOver() {
    stopTimer();
    clearTimers();
    state.phase = 'gameover';
    state.subPhase = 'done';
    Audio.victory();

    const { W, H } = Renderer.playAreaSize();
    state.gameoverButtons = [
      { id: 'retry', label: '再来一局', x: W / 2 - 150, y: H / 2 + 50, w: 130, h: 44, primary: true },
      { id: 'menu', label: '返回菜单', x: W / 2 + 20, y: H / 2 + 50, w: 130, h: 44, primary: false },
    ];
  }

  function tryMoveDirection(dx, dy) {
    if (state.phase !== 'playing') return;
    if (Renderer.isRolling()) return;
    if (state.subPhase === 'rolling') return;
    if (state.subPhase !== 'moving') return;
    if (isAIturn()) return;
    if (state.placingObstacle) return;
    if (!state.board) return;

    const main = state.board.main[state.currentTurn];
    executeMove(main.x + dx, main.y + dy);
  }

  function onCellClick(x, y) {
    if (state.phase !== 'playing') return;
    if (Renderer.isRolling()) return;
    if (state.subPhase === 'rolling') return;
    if (isAIturn()) return;

    if (state.placingObstacle) {
      tryPlaceObstacle(x, y);
      return;
    }

    if (state.subPhase === 'moving') {
      executeMove(x, y);
    }
  }

  function onCanvasClick(sx, sy) {
    if (Renderer.isRolling()) return;
    if (state.subPhase === 'rolling') return;

    if (state.phase === 'gameover') {
      const hit = Renderer.hitTestButtons(sx, sy, state.gameoverButtons);
      if (hit?.id === 'retry') {
        Audio.uiClick();
        startGame(state.mode, state.aiLevel, state.mazeDensity);
      } else if (hit?.id === 'menu') {
        Audio.uiClick();
        Audio.stopGuqin();
        clearTimers();
        state.phase = 'menu';
        state.board = null;
        showScreen('main-menu');
      }
      return;
    }

    const btns = state.overlayButtons;
    if (!btns) return;
    const hit = Renderer.hitTestButtons(sx, sy, btns);
    if (!hit) return;

    Audio.uiClick();
    if (hit.id === 'roll') doRoll();
    else if (hit.id === 'skillYes') confirmSkill(true);
    else if (hit.id === 'skillNo') confirmSkill(false);
    else if (hit.id === 'placeObs') {
      const team = state.currentTurn;
      if (!canPlaceSkill(team)) return;
      if (!state.skillArmed && state.skillBank[team] > 0) {
        state.skillArmed = true;
        state.skillFromBank = true;
      }
      state.placingObstacle = true;
      state.overlayButtons = null;
      updateObstacleHighlights();
      state.promptText = '选择格点投放障碍';
      state.promptSub = '点击通路格放置，放置后可继续行走';
    }
  }

  function update(ts) {
    if (state.phase !== 'playing' && state.phase !== 'gameover') return;
    Renderer.updateFlash(1 / 60);
  }

  function render() {
    Renderer.render(state);
  }

  return {
    init,
    update,
    render,
    showScreen,
    startGame,
    tryMoveDirection,
    state,
  };
})();
