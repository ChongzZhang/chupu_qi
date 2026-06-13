// 《樗蒲宫棋》输入 — 格点点击、相机拖拽缩放

const Input = (() => {
  let canvas = null;
  let onCellClick = null;
  let onCanvasClick = null;
  let onDirection = null;
  let dragStart = null;
  let isPanning = false;

  const DIR_KEYS = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };

  function init(c) {
    canvas = c;
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    const dir = DIR_KEYS[e.key];
    if (!dir) return;
    e.preventDefault();
    if (onDirection) onDirection(dir[0], dir[1]);
  }

  function screenToCell(sx, sy, cam) {
    const wx = (sx - cam.offX) / cam.scale + cam.x;
    const wy = (sy - cam.offY) / cam.scale + cam.y;
    return { x: Math.floor(wx), y: Math.floor(wy), wx, wy };
  }

  function isPanButton(e) {
    return e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
  }

  function onDown(e) {
    if (isPanButton(e)) {
      dragStart = { x: e.clientX, y: e.clientY };
      isPanning = true;
      return;
    }
    if (e.button !== 0) return;
    dragStart = { x: e.clientX, y: e.clientY };
    isPanning = false;
  }

  function onMove(e) {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!isPanning && Math.hypot(dx, dy) > 10) isPanning = true;
    if (!isPanning) return;
    Renderer.panCam(-dx / Renderer.cam.scale, -dy / Renderer.cam.scale);
    dragStart = { x: e.clientX, y: e.clientY };
  }

  function onUp(e) {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    const wasPan = isPanning;
    const start = dragStart;
    dragStart = null;
    isPanning = false;
    if (!start || wasPan) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 10) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cell = screenToCell(sx, sy, Renderer.cam);

    if (onCellClick) onCellClick(cell.x, cell.y, sx, sy);
    if (onCanvasClick) onCanvasClick(sx, sy);
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    Renderer.zoomAt(sx, sy, e.deltaY > 0 ? 0.9 : 1.1);
  }

  function setOnCellClick(fn) { onCellClick = fn; }
  function setOnCanvasClick(fn) { onCanvasClick = fn; }
  function setOnDirection(fn) { onDirection = fn; }

  return { init, screenToCell, setOnCellClick, setOnCanvasClick, setOnDirection };
})();
