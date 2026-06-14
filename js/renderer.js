// 《樗蒲宫棋》渲染 — 视口裁剪、五木、小地图

const Renderer = (() => {
  let canvas, ctx;
  let boardSize = 32;
  const HUD_H = 52;
  const cam = { x: 16, y: 16, scale: 12, offX: 0, offY: 0, zoom: 1, manualUntil: 0 };
  let overviewMode = false;

  let rollAnim = null;
  let flashText = null;
  let flashTimer = 0;
  let logicalW = 800;
  let logicalH = 600;
  let dpr = 1;
  /** 当前帧游戏状态，供 playAreaSize 在行走阶段收起手机底栏 */
  let frameState = null;

  function getDpr() {
    return Math.min(window.devicePixelRatio || 1, 2.5);
  }

  function applyCtxTransform() {
    dpr = getDpr();
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function init(c) {
    canvas = c;
    ctx = c.getContext('2d');
    logicalW = canvas.clientWidth || window.innerWidth;
    logicalH = canvas.clientHeight || window.innerHeight;
    updateTransform();
  }

  const MOBILE_BOTTOM = 128;
  const MOBILE_BOTTOM_MOVING = 76;
  const MOBILE_DPAD_W = 144;

  function isMobileLayout() {
    return window.matchMedia('(hover: none), (max-width: 768px)').matches;
  }

  /** 行走 / 投放路障阶段：棋盘上不叠任何 UI */
  function isBoardClearMode(state) {
    return !!(state && state.subPhase === 'moving');
  }

  function playAreaSize() {
    const mobile = isMobileLayout();
    const moving = isBoardClearMode(frameState);
    const bottomChrome = mobile ? (moving ? MOBILE_BOTTOM_MOVING : MOBILE_BOTTOM) : 0;
    const playH = Math.max(logicalH - HUD_H - bottomChrome, 100);
    return {
      W: logicalW,
      H: logicalH,
      playW: logicalW,
      playH,
      bottomChrome,
      isMobile: mobile,
    };
  }

  function defaultCellsVisible() {
    return Math.max(14, Math.min(26, boardSize * 0.38));
  }

  function clampCamPosition() {
    const { W, playH } = playAreaSize();
    const halfW = W / cam.scale / 2;
    const halfH = playH / cam.scale / 2;
    if (halfW * 2 >= boardSize) cam.x = boardSize / 2;
    else cam.x = Math.max(halfW, Math.min(boardSize - halfW, cam.x));
    if (halfH * 2 >= boardSize) cam.y = boardSize / 2;
    else cam.y = Math.max(halfH, Math.min(boardSize - halfH, cam.y));
  }

  function updateTransform() {
    const { W, playH } = playAreaSize();
    const padding = 2;
    const cellsVisible = overviewMode
      ? boardSize + padding
      : defaultCellsVisible();
    const baseScale = Math.min(W, playH) / cellsVisible;
    cam.scale = baseScale * cam.zoom;
    clampCamPosition();
    cam.offX = W / 2;
    cam.offY = HUD_H + playH / 2;
  }

  function fitEntireBoard() {
    overviewMode = true;
    cam.x = boardSize / 2;
    cam.y = boardSize / 2;
    cam.zoom = 1;
    cam.manualUntil = 0;
    updateTransform();
  }

  function exitOverview() {
    overviewMode = false;
    cam.zoom = 1;
    updateTransform();
  }

  function isOverview() { return overviewMode; }

  function resetCamera(size) {
    boardSize = size || boardSize;
    cam.zoom = 1;
    cam.manualUntil = 0;
    updateTransform();
  }

  function focusOn(x, y, force) {
    if (force) overviewMode = false;
    cam.x = x + 0.5;
    cam.y = y + 0.5;
    if (force) cam.manualUntil = 0;
    updateTransform();
  }

  function setFollow(x, y) {
    if (overviewMode) return;
    if (performance.now() < cam.manualUntil) return;
    cam.x = x + 0.5;
    cam.y = y + 0.5;
    updateTransform();
  }

  function panCam(dx, dy) {
    overviewMode = false;
    cam.x += dx;
    cam.y += dy;
    cam.manualUntil = performance.now() + 4000;
    updateTransform();
  }

  function zoomAt(sx, sy, factor) {
    overviewMode = false;
    const wx = (sx - cam.offX) / cam.scale + cam.x;
    const wy = (sy - cam.offY) / cam.scale + cam.y;
    cam.zoom = Math.max(0.4, Math.min(3, cam.zoom * factor));
    cam.manualUntil = performance.now() + 4000;
    updateTransform();
    cam.x = wx - (sx - cam.offX) / cam.scale;
    cam.y = wy - (sy - cam.offY) / cam.scale;
    updateTransform();
  }

  function worldToScreen(wx, wy) {
    return {
      x: cam.offX + (wx - cam.x) * cam.scale,
      y: cam.offY + (wy - cam.y) * cam.scale,
    };
  }

  function getVisibleBounds() {
    const { W, playH } = playAreaSize();
    const x0 = Math.floor(cam.x - W / cam.scale / 2) - 1;
    const y0 = Math.floor(cam.y - playH / cam.scale / 2) - 1;
    const x1 = Math.ceil(cam.x + W / cam.scale / 2) + 1;
    const y1 = Math.ceil(cam.y + playH / cam.scale / 2) + 1;
    return { x0, y0, x1, y1 };
  }

  function drawBackground() {
    const { W, H } = playAreaSize();
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#3d2817');
    g.addColorStop(0.5, '#4a3220');
    g.addColorStop(1, '#352418');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawMaze(board) {
    const { x0, y0, x1, y1 } = getVisibleBounds();
    const cs = cam.scale;

    for (let y = Math.max(0, y0); y < Math.min(board.size, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(board.size, x1); x++) {
        const pass = Maze.isPass(board.cells, x, y);
        const p = worldToScreen(x, y);
        if (pass) {
          ctx.fillStyle = '#c9a86c';
          ctx.fillRect(p.x, p.y, cs + 0.5, cs + 0.5);
          ctx.strokeStyle = 'rgba(60,40,20,0.15)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(p.x, p.y, cs, cs);
        } else {
          ctx.fillStyle = '#1a1008';
          ctx.fillRect(p.x, p.y, cs + 0.5, cs + 0.5);
        }
      }
    }
  }

  function drawHighlights(cells, color) {
    const cs = cam.scale;
    ctx.fillStyle = color || 'rgba(200,160,64,0.45)';
    cells.forEach(c => {
      const p = worldToScreen(c.x, c.y);
      ctx.fillRect(p.x + 1, p.y + 1, cs - 2, cs - 2);
    });
  }

  function drawBase(board) {
    const cs = cam.scale;
    ['black', 'white'].forEach(team => {
      const b = board.bases[team];
      const p = worldToScreen(b.x, b.y);
      ctx.fillStyle = team === 'black' ? 'rgba(30,14,4,0.35)' : 'rgba(245,240,224,0.35)';
      ctx.fillRect(p.x + 2, p.y + 2, cs - 4, cs - 4);
      ctx.strokeStyle = team === 'black' ? '#1E0E04' : '#E8DCC0';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 2, p.y + 2, cs - 4, cs - 4);
    });
  }

  function drawScorePieces(board) {
    const cs = cam.scale;
    board.scorePieces.forEach(p => {
      const s = worldToScreen(p.x + 0.5, p.y + 0.5);
      const r = cs * 0.22;
      const grd = ctx.createRadialGradient(s.x - r * 0.3, s.y - r * 0.3, 0, s.x, s.y, r);
      grd.addColorStop(0, '#f0d878');
      grd.addColorStop(1, '#b8860b');
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawObstacles(board, viewerTeam) {
    const cs = cam.scale;
    board.obstacles.forEach(o => {
      const p = worldToScreen(o.x + 0.5, o.y + 0.5);
      const w = cs * 0.7, h = cs * 0.35;
      ctx.fillStyle = o.owner === viewerTeam ? 'rgba(120,90,50,0.7)' : 'rgba(80,40,30,0.85)';
      ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
      ctx.strokeStyle = '#3d2817';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
    });
  }

  function drawMainPiece(x, y, team) {
    const cs = cam.scale;
    const p = worldToScreen(x + 0.5, y + 0.5);
    const r = cs * 0.38;
    const grd = ctx.createRadialGradient(p.x - r * 0.25, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
    if (team === 'black') {
      grd.addColorStop(0, '#4a3828');
      grd.addColorStop(1, '#1a0e04');
    } else {
      grd.addColorStop(0, '#fff8e8');
      grd.addColorStop(1, '#d8ccb0');
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = team === 'black' ? '#0a0604' : '#a89878';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawStick3D(x, y, face, size, rot, stickType) {
    const w = size, h = size * 1.6;
    const vis = Chupu.stickVisual(face, stickType);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);

    const grd = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grd.addColorStop(0, shade(vis.base, vis.light ? -15 : -25));
    grd.addColorStop(0.45, vis.base);
    grd.addColorStop(1, shade(vis.base, vis.light ? -35 : -45));

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = vis.ring || (vis.light ? 'rgba(60,40,20,0.35)' : 'rgba(255,255,255,0.12)');
    ctx.lineWidth = vis.ring ? 1.6 : 0.8;
    ctx.stroke();

    ctx.fillStyle = vis.light ? '#1E0E04' : '#F5EBDA';
    const fontSize = Math.max(10, Math.round(size * (face === 'zhi' || face === 'du' ? 0.62 : 0.52)));
    ctx.font = `bold ${fontSize}px "Noto Serif SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vis.label, 0, 0);
    ctx.restore();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }

  function drawChupuSideTable(state) {
    if (isBoardClearMode(state)) return;
    if (isMobileLayout()) {
      if (state.subPhase === 'waiting') return;
      drawChupuMobileTable(state);
      return;
    }
    const { W, playH } = playAreaSize();
    const tw = Math.min(168, Math.max(128, W * 0.12));
    const rowH = 17;
    const headerH = 36;
    const th = Math.min(headerH + DATA.chupuOutcomes.length * rowH + 8, playH - 16);
    const tx = W - tw - 6;
    const ty = HUD_H + 6;

    ctx.fillStyle = 'rgba(20,10,4,0.9)';
    ctx.strokeStyle = '#C8A040';
    ctx.lineWidth = 1;
    roundRect(tx, ty, tw, th, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C8A040';
    ctx.font = 'bold 11px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('十采表', tx + tw / 2, ty + 14);

    ctx.font = '9px "Noto Serif SC", serif';
    ctx.fillStyle = '#8A7040';
    ctx.fillText('采组 · 名 · 筴', tx + tw / 2, ty + 28);

    const hiId = state.lastCai?.id;

    DATA.chupuOutcomes.forEach((row, i) => {
      const ry = ty + headerH + i * rowH;
      const matched = hiId && row.id === hiId;

      if (matched) {
        ctx.fillStyle = 'rgba(200,160,64,0.45)';
        ctx.fillRect(tx + 2, ry - 11, tw - 4, rowH - 1);
        ctx.strokeStyle = '#E0C060';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 2, ry - 11, tw - 4, rowH - 1);
      }

      ctx.textAlign = 'left';
      ctx.font = `${matched ? 'bold' : ''} 9px "Noto Serif SC", serif`;
      ctx.fillStyle = matched ? '#F5EBDA' : '#A89878';
      // 十采表采组列始终显示表内固定字面，不随投掷变化
      ctx.fillText(row.combo, tx + 4, ry);

      ctx.textAlign = 'center';
      ctx.fillStyle = row.royal ? (matched ? '#FFB080' : '#C87050') : (matched ? '#D8C8A8' : '#7A6848');
      ctx.fillText(row.name, tx + tw * 0.62, ry);

      ctx.textAlign = 'right';
      ctx.fillStyle = matched ? '#F5EBDA' : '#8A7040';
      ctx.fillText(String(row.points), tx + tw - 6, ry);

      if (row.royal) {
        ctx.fillStyle = '#A23A24';
        ctx.font = '8px "Noto Serif SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText('贵', tx + tw - 18, ry - 8);
      }
    });
  }

  /** 手机端：十采表置于底部（方向键右侧），名·筴两列避免重叠 */
  function drawChupuMobileTable(state) {
    const { W, H, bottomChrome } = playAreaSize();
    const tx = MOBILE_DPAD_W + 4;
    const ty = H - bottomChrome + 4;
    const tw = W - tx - 6;
    const th = bottomChrome - 8;
    const cols = 2;
    const rows = Math.ceil(DATA.chupuOutcomes.length / cols);
    const headerH = 18;
    const bodyH = th - headerH;
    const rowH = bodyH / rows;
    const colW = tw / cols;
    const hiId = state.lastCai?.id;

    ctx.fillStyle = 'rgba(20,10,4,0.92)';
    ctx.strokeStyle = '#C8A040';
    ctx.lineWidth = 1;
    roundRect(tx, ty, tw, th, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C8A040';
    ctx.font = 'bold 9px "Noto Serif SC", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('十采表', tx + 8, ty + 10);

    DATA.chupuOutcomes.forEach((row, i) => {
      const col = i % cols;
      const rowIdx = Math.floor(i / cols);
      const cx = tx + col * colW + 4;
      const cw = colW - 8;
      const midY = ty + headerH + rowIdx * rowH + rowH / 2;
      const matched = hiId && row.id === hiId;

      if (matched) {
        ctx.fillStyle = 'rgba(200,160,64,0.45)';
        ctx.fillRect(cx - 2, midY - rowH / 2 + 1, cw, rowH - 2);
        ctx.strokeStyle = '#E0C060';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 2, midY - rowH / 2 + 1, cw, rowH - 2);
      }

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `${matched ? 'bold' : ''} 9px "Noto Serif SC", serif`;
      ctx.fillStyle = row.royal
        ? (matched ? '#FFB080' : '#C87050')
        : (matched ? '#D8C8A8' : '#7A6848');
      ctx.fillText(row.name, cx + 2, midY);

      ctx.textAlign = 'right';
      ctx.fillStyle = matched ? '#F5EBDA' : '#8A7040';
      ctx.font = `${matched ? 'bold' : ''} 9px "Noto Serif SC", serif`;
      ctx.fillText(`${row.points}筴`, cx + cw - 2, midY);
    });
  }

  function drawMobileBottomChrome() {
    if (!isMobileLayout()) return;
    const { W, H, bottomChrome } = playAreaSize();
    ctx.fillStyle = 'rgba(30,18,8,0.55)';
    ctx.fillRect(0, H - bottomChrome, W, bottomChrome);
    ctx.strokeStyle = 'rgba(200,160,64,0.25)';
    ctx.beginPath();
    ctx.moveTo(0, H - bottomChrome);
    ctx.lineTo(W, H - bottomChrome);
    ctx.stroke();
  }

  function drawChupuTray(sticks, animT, stickTypes, stickSlots) {
    const { W } = playAreaSize();
    const baseX = W / 2 - 70;
    const baseY = HUD_H + 38;
    ctx.fillStyle = 'rgba(30,14,4,0.75)';
    ctx.strokeStyle = '#C8A040';
    ctx.lineWidth = 1.5;
    roundRect(baseX - 20, baseY - 30, 170, 108, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ECDCB4';
    ctx.font = '14px "Noto Serif SC", serif';
    ctx.textAlign = 'left';
    ctx.fillText('五木', baseX - 8, baseY - 12);

    const types = stickTypes || Chupu.STICK_DEFS.map(s => s.type);
    const slots = stickSlots || Chupu.slotLabels();
    (sticks || []).forEach((face, i) => {
      const rot = animT ? Math.sin(animT * 20 + i * 2) * 0.5 : 0;
      const bounce = animT ? Math.abs(Math.sin(animT * 15 + i)) * 8 : 0;
      const cx = baseX + i * 28 + 14;
      drawStick3D(cx, baseY + 35 - bounce, face, 18, rot, types[i]);
      ctx.fillStyle = '#8A7040';
      ctx.font = '9px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText(slots[i] || '', cx, baseY + 58);
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawMinimap(board, currentTeam) {
    const { W, H } = playAreaSize();
    const mmSize = Math.min(100, Math.max(72, W * 0.14));
    const mx = W - mmSize - 12;
    const my = H - mmSize - 12;
    const scale = mmSize / board.size;

    ctx.fillStyle = 'rgba(20,10,4,0.85)';
    ctx.strokeStyle = '#C8A040';
    ctx.lineWidth = 1;
    ctx.fillRect(mx - 4, my - 4, mmSize + 8, mmSize + 8);
    ctx.strokeRect(mx - 4, my - 4, mmSize + 8, mmSize + 8);

    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, mmSize, mmSize);
    ctx.clip();

    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        if (!Maze.isPass(board.cells, x, y)) continue;
        ctx.fillStyle = '#8a7040';
        ctx.fillRect(mx + x * scale, my + y * scale, Math.max(scale, 0.5), Math.max(scale, 0.5));
      }
    }

    board.scorePieces.forEach(p => {
      ctx.fillStyle = '#f0d040';
      ctx.fillRect(mx + p.x * scale, my + p.y * scale, Math.max(scale, 1), Math.max(scale, 1));
    });

    ctx.fillStyle = '#1E0E04';
    ctx.fillRect(mx + board.main.black.x * scale, my + board.main.black.y * scale, Math.max(scale, 1.2), Math.max(scale, 1.2));
    ctx.fillStyle = '#f5f0e0';
    ctx.fillRect(mx + board.main.white.x * scale, my + board.main.white.y * scale, Math.max(scale, 1.2), Math.max(scale, 1.2));

    const vw = Math.min(mmSize, (W / cam.scale) * scale);
    const vh = Math.min(mmSize, (playAreaSize().playH / cam.scale) * scale);
    let vx = mx + cam.x * scale - vw / 2;
    let vy = my + cam.y * scale - vh / 2;
    vx = Math.max(mx, Math.min(mx + mmSize - vw, vx));
    vy = Math.max(my, Math.min(my + mmSize - vh, vy));

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.restore();
  }

  function drawHUD(state) {
    const { W, H } = playAreaSize();
    const fontMain = Math.max(13, Math.min(16, W * 0.014));
    const fontSub = Math.max(11, Math.min(13, W * 0.012));
    ctx.fillStyle = 'rgba(245,235,218,0.92)';
    ctx.fillRect(0, 0, W, 52);
    ctx.strokeStyle = 'rgba(90,48,16,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(W, 52);
    ctx.stroke();

    ctx.fillStyle = '#1E0E04';
    ctx.font = `bold ${fontMain}px "Noto Serif SC", serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`玄方 ${state.blackScore}`, 20, 32);
    ctx.textAlign = 'right';
    ctx.fillText(`${state.whiteScore} 白方`, W - 20, 32);

    ctx.textAlign = 'center';
    ctx.font = `${fontMain}px "Noto Serif SC", serif`;
    const turnLabel = state.currentTurn === 'black' ? '玄方行棋' : '白方行棋';
    ctx.fillText(turnLabel, W / 2, 22);

    if (state.subPhase === 'moving' && state.stepsLeft > 0) {
      ctx.font = `${fontSub}px "Noto Serif SC", serif`;
      ctx.fillStyle = '#5A3010';
      ctx.fillText(`余 ${state.stepsLeft} 步`, W / 2, 40);
    }

    const mobile = isMobileLayout();
    if (state.lastCai && !mobile) {
      ctx.fillStyle = state.lastCai.royal ? '#A23A24' : '#5A3010';
      ctx.font = `${fontSub}px "Noto Serif SC", serif`;
      const rollTxt = state.lastCai.faces || state.lastCai.combo;
      ctx.fillText(`${state.lastCai.name} · ${rollTxt} · ${state.lastCai.points}筴`, W / 2 - 120, 32);
    }

    if (state.mustPlaceObstacle && state.placingObstacle) {
      ctx.fillStyle = mobile ? '#5A3010' : '#A23A24';
      ctx.font = `${mobile ? fontSub : 12}px "Noto Serif SC", serif`;
      ctx.textAlign = mobile ? 'center' : 'right';
      const obstacleY = mobile ? 40 : 48;
      const obstacleX = mobile ? W / 2 : W - 20;
      ctx.fillText('须投放路障', obstacleX, obstacleY);
    }

    const timerPct = state.timer / DATA.timerMax;
    ctx.fillStyle = 'rgba(90,48,16,0.2)';
    ctx.fillRect(W / 2 - 40, 38, 80, 4);
    ctx.fillStyle = timerPct < 0.25 ? '#A23A24' : '#C8A040';
    ctx.fillRect(W / 2 - 40, 38, 80 * timerPct, 4);

    if (!mobile) {
      ctx.fillStyle = 'rgba(90,48,16,0.55)';
      ctx.font = '11px "Noto Serif SC", serif';
      ctx.textAlign = 'left';
      ctx.fillText('方向键行走 · 滚轮缩放 · 拖拽平移', 12, H - 10);
    }
  }

  function drawOverlayButtons(buttons) {
    if (!buttons) return [];
    buttons.forEach(b => {
      ctx.fillStyle = b.primary ? 'rgba(46,28,14,0.92)' : 'rgba(249,243,229,0.9)';
      ctx.strokeStyle = '#C8A040';
      ctx.lineWidth = 1.5;
      roundRect(b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = b.primary ? '#ECDCB4' : '#1E0E04';
      ctx.font = `${b.fontSize || 15}px "Noto Serif SC", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
      b._rect = { x: b.x, y: b.y, w: b.w, h: b.h };
    });
    return buttons;
  }

  function wrapText(text, maxW, font) {
    ctx.font = font;
    const chars = text.split('');
    const lines = [];
    let line = '';
    chars.forEach(ch => {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = ch;
      } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawStickPair(x, y, faceA, faceB, size, stickType) {
    drawStick3D(x - size * 0.35, y, faceA, size * 0.85, -0.35, stickType);
    drawStick3D(x + size * 0.35, y, faceB, size * 0.85, 0.35, stickType);
  }

  function drawCompactStickLegend(x, y) {
    let cx = x;
    DATA.chupuSticks.forEach(spec => {
      drawStickPair(cx + 14, y, spec.faces[0], spec.faces[1], 11, spec.type);
      ctx.fillStyle = '#C8A040';
      ctx.font = '10px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      const tag = spec.count > 1 ? `${spec.tag} ×${spec.count}` : spec.tag;
      ctx.fillText(tag, cx + 14, y + 20);
      cx += 72;
    });
  }

  function drawRollPanel(state) {
    const { W, H, bottomChrome, isMobile } = playAreaSize();

    if (isMobile) {
      const btnH = 44;
      const px = MOBILE_DPAD_W + 8;
      const py = H - bottomChrome + (bottomChrome - btnH) / 2;
      const btn = {
        id: 'roll',
        label: '投五木',
        x: px,
        y: py,
        w: W - px - 10,
        h: btnH,
        primary: true,
        fontSize: 15,
      };
      drawOverlayButtons([btn]);
      return [btn];
    }

    const panelW = Math.min(520, W - 24);
    const panelH = 86;
    const px = (W - panelW) / 2;
    const py = H - panelH - 10;

    ctx.fillStyle = 'rgba(20,10,4,0.92)';
    ctx.strokeStyle = '#C8A040';
    ctx.lineWidth = 1.5;
    roundRect(px, py, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    const turnLabel = state.currentTurn === 'black' ? '玄方' : '白方';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#F5EBDA';
    ctx.font = 'bold 15px "Noto Serif SC", serif';
    ctx.fillText(`${turnLabel} · 投五木`, px + 14, py + 22);

    drawCompactStickLegend(px + 14, py + 38);

    ctx.fillStyle = '#7A6848';
    ctx.font = '11px "Noto Serif SC", serif';
    ctx.fillText(DATA.rollHint, px + 14, py + 74);

    const btnW = 112;
    const btnH = 42;
    const btn = {
      id: 'roll',
      label: '投五木',
      x: px + panelW - btnW - 12,
      y: py + (panelH - btnH) / 2,
      w: btnW,
      h: btnH,
      primary: true,
      fontSize: 16,
    };
    drawOverlayButtons([btn]);
    return [btn];
  }

  function drawSkillPanel(text, sub, buttons) {
    const { W, H } = playAreaSize();
    const panelW = Math.min(440, W - 32);
    const panelH = 130;
    const px = (W - panelW) / 2;
    const py = H - panelH - 16;

    ctx.fillStyle = 'rgba(20,10,4,0.9)';
    ctx.strokeStyle = '#A23A24';
    ctx.lineWidth = 1.5;
    roundRect(px, py, panelW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F5EBDA';
    ctx.font = 'bold 17px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, px + panelW / 2, py + 28);

    const subLines = wrapText(sub, panelW - 32, '13px "Noto Serif SC", serif');
    ctx.fillStyle = '#D8C8A8';
    ctx.font = '13px "Noto Serif SC", serif';
    subLines.forEach((ln, i) => {
      ctx.fillText(ln, px + panelW / 2, py + 50 + i * 18);
    });

    const btns = buttons.map((b, i) => ({
      ...b,
      x: px + panelW / 2 - 135 + i * 145,
      y: py + panelH - 52,
      w: 130,
      h: 40,
    }));
    drawOverlayButtons(btns);
    return btns;
  }

  function drawHintBanner(text, sub) {
    const { W } = playAreaSize();
    const bw = Math.min(360, W - 24);
    const bx = (W - bw) / 2;
    const by = HUD_H + 6;

    ctx.fillStyle = 'rgba(20,10,4,0.82)';
    ctx.strokeStyle = '#C8A040';
    ctx.lineWidth = 1;
    roundRect(bx, by, bw, sub ? 52 : 34, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F5EBDA';
    ctx.font = 'bold 14px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, bx + bw / 2, by + (sub ? 20 : 22));
    if (sub) {
      ctx.fillStyle = '#D8C8A8';
      ctx.font = '12px "Noto Serif SC", serif';
      ctx.fillText(sub, bx + bw / 2, by + 38);
    }
  }

  function drawPrompt(text, sub) {
    const { W, H } = playAreaSize();
    ctx.fillStyle = 'rgba(20,10,4,0.55)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#F5EBDA';
    ctx.font = 'bold 22px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H / 2 - 20);
    if (sub) {
      ctx.font = '15px "Noto Serif SC", serif';
      ctx.fillStyle = '#D8C8A8';
      ctx.fillText(sub, W / 2, H / 2 + 14);
    }
  }

  function drawGameOver(winner, blackScore, whiteScore) {
    const { W, H } = playAreaSize();
    ctx.fillStyle = 'rgba(20,10,4,0.7)';
    ctx.fillRect(0, 0, W, H);

    const label = winner === 'black' ? '玄方胜出' : '白方胜出';
    ctx.fillStyle = '#F5EBDA';
    ctx.font = 'bold 32px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, H / 2 - 30);
    ctx.font = '18px "Noto Serif SC", serif';
    ctx.fillText(`${blackScore} : ${whiteScore}`, W / 2, H / 2 + 10);
  }

  function showFlash(text, duration) {
    flashText = text;
    flashTimer = duration || 1.5;
  }

  function updateFlash(dt) {
    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) flashText = null;
    }
    if (rollAnim) rollAnim.t += dt;
  }

  function startRollAnim(sticks, onDone, stickTypes, stickSlots) {
    rollAnim = {
      sticks: [...sticks],
      stickTypes: stickTypes || Chupu.STICK_DEFS.map(s => s.type),
      stickSlots: stickSlots || Chupu.slotLabels(),
      t: 0,
      duration: 0.8,
      onDone,
      rolling: true,
    };
    Audio.chupuRoll();
  }

  function isRolling() { return !!rollAnim; }

  function drawFlash(state) {
    if (!flashText || isBoardClearMode(state)) return;
    const { W } = playAreaSize();
    const alpha = Math.min(1, flashTimer * 2);
    ctx.globalAlpha = alpha;

    if (isMobileLayout()) {
      const fontSize = Math.max(11, Math.min(13, W * 0.032));
      ctx.font = `bold ${fontSize}px "Noto Serif SC", serif`;
      const maxW = W - 20;
      let text = flashText;
      while (ctx.measureText(text).width > maxW - 16 && text.length > 4) {
        text = text.slice(0, -2) + '…';
      }
      const tw = ctx.measureText(text).width;
      const padH = 7;
      const padW = 10;
      const bh = fontSize + padH * 2;
      const bw = Math.min(maxW, tw + padW * 2);
      const bx = (W - bw) / 2;
      const by = HUD_H + 3;
      ctx.fillStyle = 'rgba(20,10,4,0.78)';
      roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#F5EBDA';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, W / 2, by + bh / 2);
    } else {
      ctx.fillStyle = '#A23A24';
      ctx.font = 'bold 36px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(flashText, W / 2, playAreaSize().H / 2);
    }

    ctx.globalAlpha = 1;
  }

  function syncCanvasSize() {
    const m = measureCanvas();
    const nextDpr = getDpr();
    if (m.w !== logicalW || m.h !== logicalH || nextDpr !== dpr) resize(m.w, m.h);
  }

  function render(state) {
    if (!ctx) return;
    frameState = state;
    syncCanvasSize();
    applyCtxTransform();
    ctx.clearRect(0, 0, logicalW, logicalH);

    if (state.phase !== 'playing' && state.phase !== 'gameover') return;

    drawBackground();
    if (state.board) {
      if (!isMobileLayout() && !overviewMode && state.subPhase === 'moving') {
        setFollow(state.board.main[state.currentTurn].x, state.board.main[state.currentTurn].y);
      }
      if (isMobileLayout() && state.phase === 'playing' && !overviewMode) {
        fitEntireBoard();
      }

      drawMaze(state.board);
      drawBase(state.board);
      drawObstacles(state.board, state.currentTurn);
      drawScorePieces(state.board);
      drawMainPiece(state.board.main.black.x, state.board.main.black.y, 'black');
      drawMainPiece(state.board.main.white.x, state.board.main.white.y, 'white');

      if (state.highlightCells && state.highlightCells.length) {
        drawHighlights(state.highlightCells, state.highlightColor);
      }
      if (state.obstacleHighlight && state.obstacleHighlight.length) {
        drawHighlights(state.obstacleHighlight, 'rgba(162,58,36,0.5)');
      }

      if (!overviewMode && !isBoardClearMode(state)) {
        drawMinimap(state.board, state.currentTurn);
      }
    }

    if (!isBoardClearMode(state)) {
      drawMobileBottomChrome();
    }
    if (state.board) {
      drawChupuSideTable(state);
    }

    drawHUD(state);

    const displaySticks = rollAnim ? rollAnim.sticks : (state.lastRoll || []);
    const displayTypes = rollAnim ? rollAnim.stickTypes : (state.lastStickTypes || []);
    const displaySlots = rollAnim ? rollAnim.stickSlots : (state.lastStickSlots || []);
    const animT = rollAnim ? rollAnim.t : 0;
    const showTray = displaySticks.length && state.subPhase !== 'waiting'
      && !isBoardClearMode(state)
      && (!isMobileLayout() || state.subPhase === 'rolling' || rollAnim);
    if (showTray) {
      drawChupuTray(displaySticks, rollAnim ? animT : 0, displayTypes, displaySlots);
    }

    if (rollAnim && rollAnim.t >= rollAnim.duration) {
      rollAnim.rolling = false;
      Audio.chupuLand();
      if (rollAnim.onDone) rollAnim.onDone();
      rollAnim = null;
    }

    let panelButtons = null;
    if (state.uiPanel === 'roll' && state.subPhase === 'waiting') {
      panelButtons = drawRollPanel(state);
    } else if (state.promptText && !isBoardClearMode(state) && (state.subPhase === 'moving' || state.placingObstacle)) {
      drawHintBanner(state.promptText, state.promptSub);
    } else if (state.promptText && !state.uiPanel && !isBoardClearMode(state)) {
      drawPrompt(state.promptText, state.promptSub);
    }

    if (panelButtons) {
      state.overlayButtons = panelButtons;
    } else if (state.overlayButtons && !isBoardClearMode(state)) {
      drawOverlayButtons(state.overlayButtons);
    }

    if (state.phase === 'gameover') {
      drawGameOver(state.winner, state.blackScore, state.whiteScore);
      if (state.gameoverButtons) drawOverlayButtons(state.gameoverButtons);
    }

    drawFlash(state);
  }

  function measureCanvas() {
    if (!canvas) return { w: window.innerWidth, h: window.innerHeight };
    const rect = canvas.getBoundingClientRect();
    let w = Math.round(rect.width);
    let h = Math.round(rect.height);
    if (w <= 0 || h <= 0) {
      const screen = document.getElementById('game-screen');
      if (screen && !screen.classList.contains('hidden')) {
        w = Math.round(screen.clientWidth) || window.innerWidth;
        h = Math.round(screen.clientHeight) || window.innerHeight;
      } else {
        w = window.innerWidth;
        h = window.innerHeight;
      }
    }
    return { w: Math.max(w, 1), h: Math.max(h, 1) };
  }

  function resize(w, h) {
    if (!canvas || !ctx) return;
    if (w == null || h == null) {
      const m = measureCanvas();
      w = m.w;
      h = m.h;
    }
    if (w <= 0 || h <= 0) return;
    logicalW = w;
    logicalH = h;
    dpr = getDpr();
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    applyCtxTransform();
    updateTransform();
  }

  function hitTestButtons(sx, sy, buttons) {
    if (!buttons) return null;
    for (const b of buttons) {
      const r = b._rect || b;
      if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return b;
    }
    return null;
  }

  return {
    init, render, resize, resetCamera, focusOn, fitEntireBoard, exitOverview, isOverview, isMobileLayout,
    cam, setFollow, panCam, zoomAt,
    startRollAnim, showFlash, updateFlash, hitTestButtons, worldToScreen, isRolling,
    playAreaSize, measureCanvas,
  };
})();
