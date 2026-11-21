/* Sketchpad — an offline drawing app on an infinite, zoomable canvas.
 *
 * Coordinate system
 *   screen (css px) = world * zoom + view offset
 *   device px       = screen * dpr
 *
 * Everything is stored in world units, so panning/zooming never loses detail.
 */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- config */

  const THEMES = {
    light: { paper: '#f4f5f7', dot: '#c9ced9', ink: '#1f2430' },
    dark: { paper: '#15181f', dot: '#2c3444', ink: '#e8edf5' },
  };
  const palette = { ...THEMES.light }; // updated by applyTheme()

  const GRID = 40;            // world units between grid dots (base)
  const MIN_ZOOM = 0.08;
  const MAX_ZOOM = 12;
  const HISTORY_LIMIT = 100;
  const THEME_KEY = 'sketchpad.theme';

  /* ------------------------------------------------------------------ dom */

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const inkCanvas = document.createElement('canvas'); // committed strokes live here
  const ink = inkCanvas.getContext('2d');

  const ui = {
    zoomIn: document.getElementById('zoomIn'),
    zoomOut: document.getElementById('zoomOut'),
    zoomReset: document.getElementById('zoomReset'),
    theme: document.getElementById('theme'),
    themeIcon: document.getElementById('themeIcon'),
    color: document.getElementById('color'),
    size: document.getElementById('size'),
    undo: document.getElementById('undo'),
    redo: document.getElementById('redo'),
    clear: document.getElementById('clear'),
    save: document.getElementById('save'),
    hint: document.getElementById('hint'),
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),
    tools: Array.from(document.querySelectorAll('[data-tool]')),
  };

  /* ---------------------------------------------------------------- state */

  const view = { x: 0, y: 0, z: 1 };
  const tool = { name: 'pen', color: '#1f2430', size: 4 };

  let strokes = [];       // [{ tool, color, size, points: [{x,y}], mid }]
  let history = [];       // snapshots of `strokes` (arrays of refs, cheap)
  let future = [];
  let live = null;        // stroke currently being drawn
  let pendingBefore = null; // snapshot captured at stroke start (for undo)

  const pointers = new Map();
  let gesture = null;     // { type: 'pan' | 'pinch', ... }
  let spaceDown = false;
  const cursor = { x: 0, y: 0, on: false };

  let dpr = 1;
  let W = 0;
  let H = 0;
  let frame = 0;
  let inkDirty = true;
  let centered = false;
  let themeName = 'light';
  let colorTouched = false; // true once the user picks a colour themselves

  /* -------------------------------------------------------------- helpers */

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const clampZoom = (z) => clamp(z, MIN_ZOOM, MAX_ZOOM);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const eraserSize = () => Math.max(10, tool.size * 4);

  const toWorld = (sx, sy) => ({
    x: (sx - view.x) / view.z,
    y: (sy - view.y) / view.z,
  });

  function brushWidth() {
    return tool.name === 'eraser' ? eraserSize() : tool.size;
  }

  /* ------------------------------------------------------------- transform */

  // world -> device pixels for the on-screen ink layer
  function screenTransform() {
    return { a: dpr * view.z, e: dpr * view.x, f: dpr * view.y };
  }

  /* -------------------------------------------------------------- painting */

  function applyStyle(c, s) {
    c.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
    c.strokeStyle = s.color;
    c.fillStyle = s.color;
    c.lineWidth = s.size;
    c.lineCap = 'round';
    c.lineJoin = 'round';
  }

  // Draw a whole stroke. tx maps world -> context device pixels.
  function drawStroke(c, s, tx) {
    const pts = s.points;
    const n = pts.length;
    if (!n) return;

    c.setTransform(tx.a, 0, 0, tx.a, tx.e, tx.f);
    applyStyle(c, s);

    if (n === 1) {
      c.beginPath();
      c.arc(pts[0].x, pts[0].y, s.size / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }

    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n - 1; i++) {
      const m = mid(pts[i], pts[i + 1]);
      c.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
    }
    c.lineTo(pts[n - 1].x, pts[n - 1].y);
    c.stroke();
  }

  // Full rebuild of the ink layer (after pan/zoom/undo/camera change).
  function rebuildInk() {
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
    const tx = screenTransform();
    for (let i = 0; i < strokes.length; i++) drawStroke(ink, strokes[i], tx);
  }

  // Incremental tail while the pointer is down (avoids redrawing everything).
  function appendLiveTail(s) {
    const pts = s.points;
    const n = pts.length;
    const tx = screenTransform();
    ink.setTransform(tx.a, 0, 0, tx.a, tx.e, tx.f);
    applyStyle(ink, s);

    if (n === 1) {
      ink.beginPath();
      ink.arc(pts[0].x, pts[0].y, s.size / 2, 0, Math.PI * 2);
      ink.fill();
      return;
    }

    const prev = pts[n - 2];
    const cur = pts[n - 1];
    const m = mid(prev, cur);
    const from = s.mid || pts[0];

    ink.beginPath();
    ink.moveTo(from.x, from.y);
    ink.quadraticCurveTo(prev.x, prev.y, m.x, m.y);
    ink.stroke();
    s.mid = m;
  }

  function finishLiveTail(s) {
    const pts = s.points;
    const n = pts.length;
    if (n < 2) return;
    const tx = screenTransform();
    ink.setTransform(tx.a, 0, 0, tx.a, tx.e, tx.f);
    applyStyle(ink, s);
    const from = s.mid || pts[n - 2];
    ink.beginPath();
    ink.moveTo(from.x, from.y);
    ink.lineTo(pts[n - 1].x, pts[n - 1].y);
    ink.stroke();
  }

  function drawGrid() {
    const z = view.z;
    let step = GRID;
    while (step * z < 26) step *= 2;
    while (step * z > 104) step /= 2;

    const x0 = Math.floor((0 - view.x) / z / step) * step;
    const y0 = Math.floor((0 - view.y) / z / step) * step;
    const x1 = (W - view.x) / z;
    const y1 = (H - view.y) / z;

    const d = 1.6;
    ctx.fillStyle = palette.dot;
    for (let wy = y0; wy <= y1; wy += step) {
      const sy = wy * z + view.y;
      for (let wx = x0; wx <= x1; wx += step) {
        const sx = wx * z + view.x;
        ctx.fillRect(sx - d / 2, sy - d / 2, d, d);
      }
    }
  }

  function drawBrushCursor() {
    if (!cursor.on || tool.name === 'hand' || gesture) return;

    const dark = themeName === 'dark';
    const r = Math.max(3, (brushWidth() * view.z) / 2);

    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, r, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = dark ? 'rgba(8,10,14,0.85)' : 'rgba(255,255,255,0.9)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, r, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = dark
      ? (tool.name === 'eraser' ? 'rgba(232,237,245,0.9)' : 'rgba(232,237,245,0.6)')
      : (tool.name === 'eraser' ? 'rgba(17,24,39,0.8)' : 'rgba(17,24,39,0.45)');
    ctx.stroke();
  }

  function paint() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(inkCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBrushCursor();
  }

  function requestRender(rebuild = false) {
    if (rebuild) inkDirty = true;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (inkDirty) {
        rebuildInk();
        inkDirty = false;
      }
      paint();
    });
  }

  /* ------------------------------------------------------------- viewport */

  function updateZoomLabel() {
    ui.zoomReset.textContent = Math.round(view.z * 100) + '%';
  }

  function zoomAt(sx, sy, factor) {
    const z = clampZoom(view.z * factor);
    if (z === view.z) return;
    const k = z / view.z;
    view.x = sx - (sx - view.x) * k;
    view.y = sy - (sy - view.y) * k;
    view.z = z;
    updateZoomLabel();
    requestRender(true);
  }

  function resetView() {
    view.x = W / 2;
    view.y = H / 2;
    view.z = 1;
    updateZoomLabel();
    requestRender(true);
  }

  /* -------------------------------------------------------------- history */

  function commit(before) {
    history.push(before);
    if (history.length > HISTORY_LIMIT) history.shift();
    future = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    ui.undo.disabled = history.length === 0;
    ui.redo.disabled = future.length === 0;
  }

  function undo() {
    if (!history.length) return;
    if (live) endStroke();
    future.push(strokes);
    strokes = history.pop();
    updateHistoryButtons();
    requestRender(true);
  }

  function redo() {
    if (!future.length) return;
    if (live) endStroke();
    history.push(strokes);
    strokes = future.pop();
    updateHistoryButtons();
    requestRender(true);
  }

  function clearCanvas() {
    if (!strokes.length) return;
    if (live) endStroke();
    commit(strokes);
    strokes = [];
    requestRender(true);
  }

  /* ---------------------------------------------------------------- tools */

  function setTool(name) {
    if (live) endStroke();
    tool.name = name;
    for (const b of ui.tools) b.classList.toggle('active', b.dataset.tool === name);
    document.body.classList.toggle('tool-hand', name === 'hand');
    requestRender();
  }

  function setSize(value) {
    const v = clamp(Math.round(value), 1, 48);
    tool.size = v;
    ui.size.value = String(v);
    requestRender();
  }

  for (const b of ui.tools) {
    b.addEventListener('click', () => setTool(b.dataset.tool));
  }

  ui.color.addEventListener('input', () => {
    tool.color = ui.color.value;
    colorTouched = true;
    if (tool.name === 'eraser') setTool('pen');
  });

  ui.size.addEventListener('input', () => {
    tool.size = clamp(Number(ui.size.value) || 1, 1, 48);
    if (tool.name === 'hand') setTool('pen');
    requestRender();
  });

  ui.zoomIn.addEventListener('click', () => zoomAt(W / 2, H / 2, 1.25));
  ui.zoomOut.addEventListener('click', () => zoomAt(W / 2, H / 2, 1 / 1.25));
  ui.zoomReset.addEventListener('click', resetView);
  ui.undo.addEventListener('click', undo);
  ui.redo.addEventListener('click', redo);
  ui.clear.addEventListener('click', clearCanvas);
  ui.save.addEventListener('click', exportPNG);

  /* -------------------------------------------------------------- drawing */

  function beginStroke(e) {
    const p = toWorld(e.clientX, e.clientY);
    pendingBefore = strokes.slice();
    live = {
      tool: tool.name,
      color: tool.name === 'eraser' ? '#000000' : tool.color,
      size: tool.name === 'eraser' ? eraserSize() : tool.size,
      points: [p],
      mid: null,
    };
    strokes.push(live);
    appendLiveTail(live);
    ui.hint.classList.add('hide');
    requestRender();
  }

  function endStroke() {
    if (!live) return;
    finishLiveTail(live);
    commit(pendingBefore || []);
    pendingBefore = null;
    live = null;
    requestRender();
  }

  function abortStroke() {
    if (!live) return;
    strokes.pop();
    pendingBefore = null;
    live = null;
    requestRender(true);
  }

  /* ------------------------------------------------------------- gestures */

  function beginPan(point) {
    gesture = { type: 'pan', last: { x: point.x, y: point.y } };
    document.body.classList.add('panning');
  }

  function beginPinch() {
    const [a, b] = [...pointers.values()];
    const m = mid(a, b);
    gesture = {
      type: 'pinch',
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      z: view.z,
      wx: (m.x - view.x) / view.z,
      wy: (m.y - view.y) / view.z,
    };
    document.body.classList.add('panning');
  }

  function updatePinch() {
    const pts = [...pointers.values()];
    if (pts.length < 2 || gesture.type !== 'pinch') return;
    const [a, b] = pts;
    const d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const m = mid(a, b);
    const z = clampZoom(gesture.z * (d / gesture.dist));
    view.z = z;
    view.x = m.x - gesture.wx * z;
    view.y = m.y - gesture.wy * z;
    updateZoomLabel();
    requestRender(true);
  }

  function trackPoint(e) {
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    const list = events && events.length ? events : [e];
    let added = false;

    for (const ev of list) {
      const w = toWorld(ev.clientX, ev.clientY);
      const pts = live.points;
      const last = pts[pts.length - 1];
      if (last && Math.hypot(w.x - last.x, w.y - last.y) < 0.6 / view.z) continue;
      pts.push(w);
      appendLiveTail(live);
      added = true;
    }
    return added;
  }

  /* ---------------------------------------------------------- pointer I/O */

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button > 2) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    cursor.on = e.pointerType !== 'touch';

    if (pointers.size === 2) {
      abortStroke();
      beginPinch();
      return;
    }
    if (pointers.size > 2) return;

    const wantsPan = spaceDown || tool.name === 'hand' || e.button === 1 || e.button === 2;
    if (wantsPan) {
      beginPan(e);
      return;
    }
    if (e.button !== 0) return;

    beginStroke(e);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.on = true;
    }

    if (!pointers.has(e.pointerId)) {
      requestRender();
      return;
    }

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (gesture && gesture.type === 'pinch') {
      updatePinch();
      return;
    }

    if (gesture && gesture.type === 'pan') {
      const dx = e.clientX - gesture.last.x;
      const dy = e.clientY - gesture.last.y;
      gesture.last = { x: e.clientX, y: e.clientY };
      view.x += dx;
      view.y += dy;
      requestRender(true);
      return;
    }

    if (live) {
      trackPoint(e);
      requestRender();
    } else {
      requestRender();
    }
  });

  function releasePointer(e) {
    pointers.delete(e.pointerId);

    if (live && pointers.size === 0) endStroke();

    if (gesture && gesture.type === 'pinch') {
      if (pointers.size === 1) {
        const p = [...pointers.values()][0];
        beginPan(p);
      } else {
        gesture = null;
        document.body.classList.remove('panning');
      }
    } else if (gesture && gesture.type === 'pan' && pointers.size === 0) {
      gesture = null;
      document.body.classList.remove('panning');
    }

    if (e.pointerType === 'touch') cursor.on = false;
    requestRender();
  }

  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch') {
      cursor.on = false;
      requestRender();
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // wheel: ctrl/cmd (or trackpad pinch) = zoom at pointer, otherwise pan
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0025));
    } else {
      view.x -= e.deltaX;
      view.y -= e.deltaY;
      requestRender(true);
    }
  }, { passive: false });

  document.addEventListener('gesturestart', (e) => e.preventDefault());

  /* ------------------------------------------------------------- keyboard */

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    const mod = e.ctrlKey || e.metaKey;
    const k = (e.key || '').toLowerCase();

    if (e.code === 'Space' && !spaceDown) {
      spaceDown = true;
      document.body.classList.add('space');
      e.preventDefault();
      return;
    }

    if (mod && k === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if (mod && k === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (mod) return;

    if (k === 'b') setTool('pen');
    else if (k === 'e') setTool('eraser');
    else if (k === 'h') setTool('hand');
    else if (k === 't') applyTheme(themeName === 'dark' ? 'light' : 'dark', true);
    else if (k === '+' || k === '=') zoomAt(W / 2, H / 2, 1.25);
    else if (k === '-' || k === '_') zoomAt(W / 2, H / 2, 1 / 1.25);
    else if (k === '0') resetView();
    else if (k === '[') setSize(tool.size - 1);
    else if (k === ']') setSize(tool.size + 1);
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceDown = false;
      document.body.classList.remove('space');
    }
  });

  window.addEventListener('blur', () => {
    spaceDown = false;
    document.body.classList.remove('space');
  });

  /* ---------------------------------------------------------------- export */

  function exportPNG() {
    if (!strokes.length) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const s of strokes) {
      const r = s.size / 2;
      for (const p of s.points) {
        if (p.x - r < minX) minX = p.x - r;
        if (p.y - r < minY) minY = p.y - r;
        if (p.x + r > maxX) maxX = p.x + r;
        if (p.y + r > maxY) maxY = p.y + r;
      }
    }
    if (!isFinite(minX)) return;

    const pad = 32;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;

    const w = maxX - minX;
    const h = maxY - minY;
    const scale = Math.min(2, 8192 / Math.max(w, h));

    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    const octx = out.getContext('2d');

    // ink on a transparent layer first so the eraser only removes ink
    const layer = document.createElement('canvas');
    layer.width = out.width;
    layer.height = out.height;
    const lctx = layer.getContext('2d');

    const tx = { a: scale, e: -minX * scale, f: -minY * scale };
    for (const s of strokes) drawStroke(lctx, s, tx);

    octx.fillStyle = palette.paper;
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(layer, 0, 0);

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sketch-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  }

  /* ----------------------------------------------------------------- theme */

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function storedTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return t === 'dark' || t === 'light' ? t : null;
    } catch (_) {
      return null;
    }
  }

  function applyTheme(name, remember) {
    const next = name === 'dark' ? 'dark' : 'light';
    themeName = next;
    Object.assign(palette, THEMES[next]);

    document.documentElement.setAttribute('data-theme', next);
    if (ui.themeColorMeta) ui.themeColorMeta.setAttribute('content', palette.paper);
    if (ui.themeIcon) ui.themeIcon.setAttribute('href', next === 'dark' ? '#i-sun' : '#i-moon');
    ui.theme.setAttribute(
      'aria-label',
      next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );

    // keep the default pen colour readable on the current paper
    if (!colorTouched) {
      tool.color = THEMES[next].ink;
      ui.color.value = tool.color;
    }

    if (remember) {
      try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* ignore */ }
    }

    requestRender();
  }

  ui.theme.addEventListener('click', () => {
    applyTheme(themeName === 'dark' ? 'light' : 'dark', true);
  });

  // follow the OS while the user has not picked a theme manually
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!storedTheme()) applyTheme(systemTheme(), false);
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else if (typeof mq.addListener === 'function') mq.addListener(onChange);
  }

  /* ----------------------------------------------------------------- boot */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    inkCanvas.width = canvas.width;
    inkCanvas.height = canvas.height;

    if (!centered) {
      view.x = W / 2;
      view.y = H / 2;
      centered = true;
    }

    rebuildInk();
    paint();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));

  resize();
  applyTheme(storedTheme() || systemTheme(), false);
  updateZoomLabel();
  updateHistoryButtons();

  setTimeout(() => ui.hint.classList.add('hide'), 9000);

  // small debug hook (handy while testing inside a webview)
  window.Sketchpad = { view, strokes: () => strokes, reset: resetView };
})();
