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

    mustPlaceObstacle: false,

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

    state.mustPlaceObstacle = false;

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

    state.mustPlaceObstacle = false;

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

      if (state.placingObstacle && state.mustPlaceObstacle) {

        autoPlaceObstacle();

        return;

      }

      endTurn();

    } else if (state.subPhase === 'waiting') {

      doRoll();

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

      Renderer.showFlash(`${result.name} · ${result.faces} · ${result.points}筴`);



      if (result.royal) {

        Audio.royalCai();

        beginRoyalMove();

      } else {

        startMoving();

      }

    }, result.stickTypes, result.stickSlots);

  }



  /** 王采：须先投放路障，放完再走剩余步数 */

  function beginRoyalMove() {

    state.subPhase = 'moving';

    state.mustPlaceObstacle = true;

    state.placingObstacle = true;

    state.promptText = `贵采「${state.lastCai.name}」· 须先投放路障`;

    state.promptSub = '点击通路格放置，放完后再行完本回合全部步数';



    const main = state.board.main[state.currentTurn];

    Renderer.exitOverview();

    Renderer.focusOn(main.x, main.y, true);

    updateObstacleHighlights();



    if (isAIturn()) scheduleAIMove();

  }



  function startMoving() {

    state.subPhase = 'moving';

    const main = state.board.main[state.currentTurn];

    Renderer.exitOverview();

    Renderer.focusOn(main.x, main.y, true);

    updateMoveHighlights();



    if (isAIturn()) scheduleAIMove();

  }



  function firstObstacleSpot() {

    for (let y = 0; y < state.board.size; y++) {

      for (let x = 0; x < state.board.size; x++) {

        if (Board.canPlaceObstacle(state.board, x, y, state.currentTurn)) {

          return { x, y };

        }

      }

    }

    return null;

  }



  function autoPlaceObstacle() {

    const team = state.currentTurn;

    const spot = AI.pickObstacleSpot(state.board, team, state.aiLevel) || firstObstacleSpot();

    if (spot) tryPlaceObstacle(spot.x, spot.y);

    else finishObstaclePlacement();

  }



  function finishObstaclePlacement() {

    state.mustPlaceObstacle = false;

    state.placingObstacle = false;

    state.obstacleHighlight = [];

    if (state.stepsLeft > 0) {

      state.promptText = `余 ${state.stepsLeft} 步`;

      state.promptSub = null;

      updateMoveHighlights();

      if (!state.timerActive) startTimer();

      if (isAIturn()) scheduleAIMove();

    } else {

      state.promptText = null;

      state.promptSub = null;

      endTurn();

    }

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

    if (state.stepsLeft <= 0 && !state.placingObstacle) { endTurn(); return; }



    state._moveDelay = setTimeout(() => {

      if (state.placingObstacle && state.mustPlaceObstacle) {

        autoPlaceObstacle();

        return;

      }



      const move = AI.pickMove(state.board, state.currentTurn, state.aiLevel, state.stepsLeft);

      if (!move) { endTurn(); return; }

      executeMove(move.x, move.y);

    }, 350);

  }



  function executeMove(x, y) {

    if (state.placingObstacle) return;



    const team = state.currentTurn;

    const main = state.board.main[team];

    const valid = Board.getNeighbors(state.board, main.x, main.y);

    if (!valid.some(c => c.x === x && c.y === y)) return;



    Board.moveMain(state.board, team, x, y);

    state.stepsLeft--;

    Audio.moveStep();



    const obs = Board.getObstacleAt(state.board, x, y);

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



    if (obs && obs.owner !== team) {

      Board.removeObstacleAt(state.board, x, y);

      Audio.blocked();

      state.skipTurn[team] = true;

      state.stepsLeft = 0;

      endTurn();

      return;

    }



    if (state.stepsLeft <= 0) {

      endTurn();

      return;

    }



    state.promptText = `余 ${state.stepsLeft} 步`;

    state.promptSub = null;

    updateMoveHighlights();

    if (isAIturn()) scheduleAIMove();

  }



  function tryPlaceObstacle(x, y) {

    const team = state.currentTurn;

    if (!Board.canPlaceObstacle(state.board, x, y, team)) return false;

    Board.placeObstacle(state.board, x, y, team);

    Audio.obstaclePlace();

    finishObstaclePlacement();

    return true;

  }



  function endTurn() {

    stopTimer();

    state.subPhase = 'waiting';

    state.highlightCells = [];

    state.obstacleHighlight = [];

    state.overlayButtons = null;

    state.placingObstacle = false;

    state.mustPlaceObstacle = false;

    state.promptText = null;

    state.promptSub = null;



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


