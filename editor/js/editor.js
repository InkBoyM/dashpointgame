/* DashPoint developer level builder */
(function () {
  const DP = window.DashPoint;
  const TILE = DP.TILE;
  const STORAGE_LEVEL = "dashpoint.editor.autosave";
  const STORAGE_LIB = "dashpoint.editor.library";
  const STORAGE_SET = "dashpoint.settings";
  const STORAGE_NET_EDIT = "dashpoint.editor.networkEdit";
  let networkEdit = null;

  function B(c, r) {
    return { c: c, r: r, id: "brick" };
  }
  function IB(c, r) {
    return { c: c, r: r, id: "ibrick" };
  }
  function S(c, r, rot) {
    return { c: c, r: r, id: "spike", rot: rot || 0 };
  }
  function I(c, r, rot) {
    return { c: c, r: r, id: "ispike", rot: rot || 0 };
  }
  function Goal(c, r) {
    return { c: c, r: r, id: "goal" };
  }
  function hstrip(c0, r, n, make) {
    const tiles = [];
    for (let i = 0; i < n; i++) tiles.push(make(c0 + i, r));
    return tiles;
  }
  function vstrip(c, r0, n, make) {
    const tiles = [];
    for (let i = 0; i < n; i++) tiles.push(make(c, r0 + i));
    return tiles;
  }
  function block(c0, r0, w, h, make) {
    const tiles = [];
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) tiles.push(make(c0 + c, r0 + r));
    }
    return tiles;
  }
  function stairs(width, dir) {
    const tiles = [];
    for (let i = 0; i < width; i++) {
      const height = dir > 0 ? i + 1 : width - i;
      const top = width - height;
      for (let k = 0; k < height; k++) tiles.push(B(i, top + k));
    }
    return tiles;
  }

  const PREFABS = {
    plat2: { name: "Plat 2", tiles: hstrip(0, 0, 2, B) },
    platform: { name: "Plat 4", tiles: hstrip(0, 0, 4, B) },
    plat6: { name: "Plat 6", tiles: hstrip(0, 0, 6, B) },
    floor8: { name: "Floor 8", tiles: hstrip(0, 0, 8, B) },
    floor16: { name: "Floor 16", tiles: hstrip(0, 0, 16, B) },
    block2: { name: "Block 2×2", tiles: block(0, 0, 2, 2, B) },
    block3: { name: "Block 3×3", tiles: block(0, 0, 3, 3, B) },
    pillar: { name: "Pillar", tiles: vstrip(0, 0, 4, B) },
    tower: { name: "Tower", tiles: vstrip(0, 0, 8, B) },
    wall: { name: "Wall 2×6", tiles: block(0, 0, 2, 6, B) },
    stairsR: { name: "Stairs →", tiles: stairs(4, 1) },
    stairsL: { name: "Stairs ←", tiles: stairs(4, -1) },
    stairsR6: { name: "Stairs 6 →", tiles: stairs(6, 1) },
    stairsL6: { name: "Stairs 6 ←", tiles: stairs(6, -1) },
    gap: {
      name: "Gap",
      tiles: [B(0, 1), B(1, 1), B(4, 1), B(5, 1), B(0, 0), B(5, 0)],
    },
    longGap: {
      name: "Long gap",
      tiles: [B(0, 1), B(1, 1), B(7, 1), B(8, 1), B(0, 0), B(8, 0)],
    },
    pit: {
      name: "Spike pit",
      tiles: []
        .concat(hstrip(0, 1, 6, B))
        .concat([B(0, 0), B(5, 0)])
        .concat(hstrip(1, 0, 4, function (c, r) { return S(c, r, 0); })),
    },
    widePit: {
      name: "Wide pit",
      tiles: []
        .concat(hstrip(0, 1, 10, B))
        .concat([B(0, 0), B(9, 0)])
        .concat(hstrip(1, 0, 8, function (c, r) { return S(c, r, 0); })),
    },
    deepPit: {
      name: "Deep pit",
      tiles: []
        .concat(vstrip(0, 0, 5, B))
        .concat(vstrip(5, 0, 5, B))
        .concat(hstrip(0, 5, 6, B))
        .concat(hstrip(1, 4, 4, function (c, r) { return S(c, r, 0); })),
    },
    spikeRow: { name: "Spikes 8", tiles: hstrip(0, 0, 8, function (c, r) { return S(c, r, 0); }) },
    spike3: { name: "Spikes 3", tiles: hstrip(0, 0, 3, function (c, r) { return S(c, r, 0); }) },
    invis3: { name: "Invis 3", tiles: hstrip(0, 0, 3, function (c, r) { return I(c, r, 0); }) },
    invis8: { name: "Invis 8", tiles: hstrip(0, 0, 8, function (c, r) { return I(c, r, 0); }) },
    hiddenPit: {
      name: "Hidden pit",
      tiles: [B(0, 1), B(1, 1), B(6, 1), B(7, 1), I(2, 1, 0), I(3, 1, 0), I(4, 1, 0), I(5, 1, 0)],
    },
    skipWall: {
      name: "Skip wall",
      tiles: vstrip(0, 0, 5, function (c, r) { return I(c, r, 0); }),
    },
    fakeFloor: {
      name: "Fake floor",
      tiles: hstrip(0, 0, 6, function (c, r) { return I(c, r, 0); }),
    },
    iblk4: { name: "I-Blk 4", tiles: hstrip(0, 0, 4, IB) },
    iblk8: { name: "I-Blk 8", tiles: hstrip(0, 0, 8, IB) },
    hiddenWall: { name: "I-Blk wall", tiles: vstrip(0, 0, 4, IB) },
    hang: {
      name: "Hang 4",
      tiles: hstrip(0, 0, 4, B).concat(hstrip(0, 1, 4, function (c, r) { return S(c, r, 180); })),
    },
    hang8: {
      name: "Hang 8",
      tiles: hstrip(0, 0, 8, B).concat(hstrip(0, 1, 8, function (c, r) { return S(c, r, 180); })),
    },
    tunnel: {
      name: "Tunnel",
      tiles: hstrip(0, 4, 8, B).concat(hstrip(0, 0, 8, B)),
    },
    crush: {
      name: "Crush run",
      tiles: hstrip(0, 4, 8, B)
        .concat(hstrip(0, 0, 8, B))
        .concat(hstrip(0, 1, 8, function (c, r) { return S(c, r, 180); })),
    },
    sandwich: {
      name: "Spike sandwich",
      tiles: hstrip(0, 5, 8, B)
        .concat(hstrip(0, 4, 8, function (c, r) { return S(c, r, 0); }))
        .concat(hstrip(0, 0, 8, B))
        .concat(hstrip(0, 1, 8, function (c, r) { return S(c, r, 180); })),
    },
    wallL: {
      name: "Spikes ←",
      tiles: vstrip(1, 0, 4, B).concat(vstrip(0, 0, 4, function (c, r) { return S(c, r, 270); })),
    },
    wallR: {
      name: "Spikes →",
      tiles: vstrip(0, 0, 4, B).concat(vstrip(1, 0, 4, function (c, r) { return S(c, r, 90); })),
    },
    spikeGap: {
      name: "Spiked gap",
      tiles: [B(0, 1), B(1, 1), B(5, 1), B(6, 1), S(2, 1, 0), S(3, 1, 0), S(4, 1, 0)],
    },
    arch: {
      name: "Arch",
      tiles: vstrip(0, 1, 3, B).concat(vstrip(4, 1, 3, B)).concat(hstrip(0, 0, 5, B)),
    },
    box: {
      name: "Box",
      tiles: hstrip(0, 4, 6, B)
        .concat(hstrip(0, 0, 6, B))
        .concat(vstrip(0, 1, 3, B))
        .concat(vstrip(5, 1, 3, B)),
    },
    island: {
      name: "Island",
      tiles: hstrip(0, 0, 5, B).concat([B(1, 1), B(2, 1), B(3, 1), B(2, 2)]),
    },
    decks: {
      name: "Double deck",
      tiles: hstrip(0, 0, 6, B).concat(hstrip(0, 4, 6, B)),
    },
    ledge: {
      name: "Ledge",
      tiles: vstrip(0, 0, 4, B).concat(hstrip(1, 0, 4, B)),
    },
    uCatch: {
      name: "U catch",
      tiles: vstrip(0, 0, 3, B).concat(vstrip(4, 0, 3, B)).concat(hstrip(0, 3, 5, B)),
    },
    bump: {
      name: "Bump",
      tiles: [B(0, 2), B(1, 2), B(2, 2), B(3, 2), B(4, 2), B(1, 1), B(2, 1), B(3, 1), B(2, 0)],
    },
    bridge: {
      name: "Bridge",
      tiles: hstrip(0, 0, 8, B).concat(hstrip(1, 2, 6, function (c, r) { return S(c, r, 0); })),
    },
    startPad: {
      name: "Start pad",
      tiles: hstrip(0, 1, 6, B).concat(hstrip(0, 2, 6, B)),
    },
    goalPad: {
      name: "Goal pad",
      tiles: hstrip(0, 1, 5, B).concat([Goal(2, 0)]),
    },
    underSpikes: {
      name: "Underhang",
      tiles: hstrip(0, 0, 6, B).concat(hstrip(1, 1, 4, function (c, r) { return S(c, r, 180); })),
    },
    Tblock: {
      name: "T block",
      tiles: hstrip(0, 0, 5, B).concat(vstrip(2, 1, 3, B)),
    },
  };

  const state = {
    images: null,
    level: null,
    tool: "paint",
    tile: "brick",
    rot: 0,
    prefab: "platform",
    cam: { x: 0, y: 0, zoom: 2 },
    growAmount: 32,
    textDraft: "JUMP!",
    textColor: "#ffffff",
    textScale: 1,
    hover: { c: 0, r: 0, inside: false },
    showGrid: true,
    dirty: false,
    undo: [],
    redo: [],
    playing: false,
    engine: null,
    deaths: 0,
    playFrom: null,
    keys: new Set(),
    pan: { on: false, lastX: 0, lastY: 0, space: false },
    stroke: null,
    selection: null,
    clipboard: null,
    settings: loadSettings(),
    listening: null,
    lastFrame: 0,
    statsTick: 0,
  };

  const els = {
    app: document.getElementById("app"),
    canvas: document.getElementById("view"),
    wrap: document.getElementById("viewportWrap"),
    minimap: document.getElementById("minimap"),
    name: document.getElementById("levelName"),
    cols: document.getElementById("cols"),
    rows: document.getElementById("rows"),
    play: document.getElementById("btnPlay"),
    playLabel: document.getElementById("playLabel"),
    playHud: document.getElementById("playHud"),
    winCard: document.getElementById("winCard"),
    hudTime: document.getElementById("hudTime"),
    hudDeaths: document.getElementById("hudDeaths"),
    hudState: document.getElementById("hudState"),
    dirty: document.getElementById("dirtyDot"),
    statusMain: document.getElementById("statusMain"),
    statusCell: document.getElementById("statusCell"),
    statusZoom: document.getElementById("statusZoom"),
    file: document.getElementById("fileInput"),
    spikeIcon: document.getElementById("spikeIcon"),
  };

  const ctx = els.canvas.getContext("2d");
  const mctx = els.minimap.getContext("2d");

  function loadSettings() {
    const fallback = {
      username: "",
      skin: 1,
      keybinds: JSON.parse(JSON.stringify(DP.DEFAULT_KEYBINDS)),
      hitboxes: false,
      autoRespawn: true,
    };
    try {
      const raw = localStorage.getItem(STORAGE_SET);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        username: String(parsed.username || ""),
        skin: DP.clamp(parsed.skin | 0, 1, 5),
        keybinds: Object.assign({}, DP.DEFAULT_KEYBINDS, parsed.keybinds || {}),
        hitboxes: !!parsed.hitboxes,
        autoRespawn: parsed.autoRespawn !== false,
      };
    } catch (e) {
      return fallback;
    }
  }

  function currentSkin() {
    return DP.clamp(state.settings.skin | 0, 1, 5);
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_SET, JSON.stringify(state.settings));
  }

  function markDirty(yes) {
    state.dirty = yes !== false;
    els.dirty.classList.toggle("saved", !state.dirty);
  }

  function snapshot() {
    return JSON.stringify(state.level.toJSON());
  }

  function pushUndo() {
    state.undo.push(snapshot());
    if (state.undo.length > 120) state.undo.shift();
    state.redo.length = 0;
    markDirty(true);
  }

  function restoreSnap(json) {
    state.level = DP.Level.fromJSON(JSON.parse(json));
    syncInspector();
    markDirty(true);
  }

  function undo() {
    if (state.playing || !state.undo.length) return;
    state.redo.push(snapshot());
    restoreSnap(state.undo.pop());
    setStatus("Undo");
  }

  function redo() {
    if (state.playing || !state.redo.length) return;
    state.undo.push(snapshot());
    restoreSnap(state.redo.pop());
    setStatus("Redo");
  }

  function autosave() {
    try {
      const data = state.level.toJSON();
      data.meta.autosave = true;
      localStorage.setItem(STORAGE_LEVEL, JSON.stringify(data));
      markDirty(false);
    } catch (e) {
      setStatus("Autosave failed (storage full?)");
    }
  }

  function setStatus(text) {
    els.statusMain.textContent = text;
  }

  function currentTile() {
    return { id: state.tile, rot: DP.isSpikeId(state.tile) ? state.rot : 0 };
  }

  function tilesEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.id === b.id && (a.rot || 0) === (b.rot || 0);
  }

  function resizeCanvas() {
    const rect = els.wrap.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (els.canvas.width !== w || els.canvas.height !== h) {
      els.canvas.width = w;
      els.canvas.height = h;
    }
    const mw = Math.max(1, Math.floor(els.minimap.clientWidth || 268));
    const mh = 92;
    if (els.minimap.width !== mw || els.minimap.height !== mh) {
      els.minimap.width = mw;
      els.minimap.height = mh;
    }
  }

  function screenToWorld(sx, sy) {
    const rect = els.canvas.getBoundingClientRect();
    const x = (sx - rect.left) / state.cam.zoom + state.cam.x;
    const y = (sy - rect.top) / state.cam.zoom + state.cam.y;
    return { x, y };
  }

  function worldToCell(x, y) {
    return { c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
  }

  function eventCell(ev) {
    const w = screenToWorld(ev.clientX, ev.clientY);
    const cell = worldToCell(w.x, w.y);
    cell.inside = state.level.inBounds(cell.c, cell.r);
    return cell;
  }

  function editorZoom() {
    return 2;
  }

  function playZoom() {
    resizeCanvas();
    const w = Math.max(1, els.canvas.width);
    const z = Math.round(w / (14 * TILE));
    return DP.clamp(z, 3, 5);
  }

  function fitCamera() {
    resizeCanvas();
    const w = els.canvas.width;
    const h = els.canvas.height;
    const worldW = state.level.cols * TILE;
    const worldH = state.level.rows * TILE;
    const pad = 24;
    const zoom = Math.max(1, Math.min((w - pad) / worldW, (h - pad) / worldH, 8));
    state.cam.zoom = snapZoom(zoom);
    state.cam.x = (worldW - w / state.cam.zoom) / 2;
    state.cam.y = (worldH - h / state.cam.zoom) / 2;
  }

  function snapZoom(z) {
    return DP.clamp(Math.round(z), 1, 8);
  }

  function focusOn(c, r, zoom) {
    resizeCanvas();
    state.cam.zoom = snapZoom(zoom || editorZoom());
    const viewW = els.canvas.width / state.cam.zoom;
    const viewH = els.canvas.height / state.cam.zoom;
    state.cam.x = c * TILE + TILE / 2 - viewW / 2;
    state.cam.y = r * TILE + TILE / 2 - viewH / 2;
    clampCam();
  }

  function clampCam() {
    const viewW = els.canvas.width / state.cam.zoom;
    const viewH = els.canvas.height / state.cam.zoom;
    const worldW = state.level.cols * TILE;
    const worldH = state.level.rows * TILE;
    const margin = 80;
    state.cam.x = DP.clamp(state.cam.x, -margin, worldW - viewW + margin);
    state.cam.y = DP.clamp(state.cam.y, -margin, worldH - viewH + margin);
  }

  function zoomAt(sx, sy, nextZoom) {
    const before = screenToWorld(sx, sy);
    state.cam.zoom = snapZoom(nextZoom);
    const after = screenToWorld(sx, sy);
    state.cam.x += before.x - after.x;
    state.cam.y += before.y - after.y;
    clampCam();
  }

  function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll(".tool").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    });
    if (tool !== "select") state.selection = null;
    setStatus(tool.charAt(0).toUpperCase() + tool.slice(1));
  }

  function setTile(id) {
    state.tile = id;
    document.querySelectorAll(".tile-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tile === id);
    });
    if (state.tool === "spawn" || state.tool === "select" || state.tool === "picker") setTool("paint");
  }

  function setRot(rot) {
    state.rot = ((rot % 360) + 360) % 360;
    updateRotUI();
  }

  function updateRotUI() {
    document.querySelectorAll("#rotations button").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.rot) === state.rot);
    });
    if (els.spikeIcon) els.spikeIcon.style.transform = "rotate(" + state.rot + "deg)";
    const invisIcon = document.getElementById("ispikeIcon");
    if (invisIcon) invisIcon.style.transform = "rotate(" + state.rot + "deg)";
  }

  function bresenham(c0, r0, c1, r1) {
    const pts = [];
    let x = c0;
    let y = r0;
    const dx = Math.abs(c1 - c0);
    const dy = Math.abs(r1 - r0);
    const sx = c0 < c1 ? 1 : -1;
    const sy = r0 < r1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      pts.push({ c: x, r: y });
      if (x === c1 && y === r1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return pts;
  }

  function rectCells(c0, r0, c1, r1) {
    const x0 = Math.min(c0, c1);
    const x1 = Math.max(c0, c1);
    const y0 = Math.min(r0, r1);
    const y1 = Math.max(r0, r1);
    const pts = [];
    for (let r = y0; r <= y1; r++) {
      for (let c = x0; c <= x1; c++) pts.push({ c, r });
    }
    return pts;
  }

  function applyTile(c, r, tile) {
    if (!state.level.inBounds(c, r)) return false;
    if (tile && !DP.TILE_TYPES[tile.id]) return false;
    const prev = state.level.get(c, r);
    if (tile === null) {
      if (!prev) return false;
      state.level.set(c, r, null);
      return true;
    }
    if (tilesEqual(prev, tile)) return false;
    state.level.set(c, r, tile);
    return true;
  }

  function stampPrefab(origin, list) {
    let changed = false;
    for (const t of list) {
      changed = applyTile(origin.c + t.c, origin.r + t.r, { id: t.id, rot: t.rot || 0 }) || changed;
    }
    return changed;
  }

  function floodFill(c, r, replacement) {
    const target = state.level.get(c, r);
    if (replacement && tilesEqual(target, replacement)) return false;
    if (!replacement && !target) return false;
    const stack = [{ c, r }];
    const seen = new Set();
    let n = 0;
    const match = (cc, rr) => tilesEqual(state.level.get(cc, rr), target);
    while (stack.length && n < 8000) {
      const cur = stack.pop();
      const key = cur.c + "," + cur.r;
      if (seen.has(key) || !state.level.inBounds(cur.c, cur.r) || !match(cur.c, cur.r)) continue;
      seen.add(key);
      applyTile(cur.c, cur.r, replacement);
      n++;
      stack.push({ c: cur.c + 1, r: cur.r });
      stack.push({ c: cur.c - 1, r: cur.r });
      stack.push({ c: cur.c, r: cur.r + 1 });
      stack.push({ c: cur.c, r: cur.r - 1 });
    }
    return n > 0;
  }

  function ghostForStroke() {
    if (!state.stroke) return null;
    const s = state.stroke;
    if (s.kind === "rect") {
      return rectCells(s.c0, s.r0, s.c1, s.r1).map((p) => Object.assign({ id: s.erase ? "erase" : state.tile, rot: state.rot }, p));
    }
    if (s.kind === "line") {
      return bresenham(s.c0, s.r0, s.c1, s.r1).map((p) => Object.assign({ id: s.erase ? "erase" : state.tile, rot: state.rot }, p));
    }
    return null;
  }

  function prefabGhost(cell) {
    const def = PREFABS[state.prefab];
    if (!def) return [];
    return def.tiles.map((t) => ({
      c: cell.c + t.c,
      r: cell.r + t.r,
      id: t.id,
      rot: t.rot || 0,
    }));
  }

  function ensureContains(c, r) {
    const pad = { left: 0, right: 0, top: 0, bottom: 0 };
    if (c < 0) pad.left = -c;
    else if (c >= state.level.cols) pad.right = c - state.level.cols + 1;
    if (r < 0) pad.top = -r;
    else if (r >= state.level.rows) pad.bottom = r - state.level.rows + 1;
    if (!pad.left && !pad.right && !pad.top && !pad.bottom) return { c, r };
    if (state.level.cols + pad.left + pad.right > DP.MAX_COLS) {
      pad.right = Math.max(0, DP.MAX_COLS - state.level.cols - pad.left);
      pad.left = Math.max(0, Math.min(pad.left, DP.MAX_COLS - state.level.cols));
    }
    if (state.level.rows + pad.top + pad.bottom > DP.MAX_ROWS) {
      pad.bottom = Math.max(0, DP.MAX_ROWS - state.level.rows - pad.top);
      pad.top = Math.max(0, Math.min(pad.top, DP.MAX_ROWS - state.level.rows));
    }
    const res = state.level.resize(pad, { continueFloor: true });
    if (res.left) state.cam.x += res.left * TILE;
    if (res.top) state.cam.y += res.top * TILE;
    return { c: c + (res.left || 0), r: r + (res.top || 0) };
  }

  function paintAt(cell, erase) {
    const pos = erase ? cell : ensureContains(cell.c, cell.r);
    if (erase || state.tool === "erase") {
      applyTile(pos.c, pos.r, null);
      removeTextAt(pos.c, pos.r);
      return;
    }
    if (state.tool === "text") {
      stampText(pos, erase);
      return;
    }
    if (state.tool === "spawn") {
      const p = ensureContains(cell.c, cell.r);
      state.level.spawn = {
        c: DP.clamp(p.c, 0, state.level.cols - 1),
        r: DP.clamp(p.r, 0, state.level.rows - 1),
      };
      return;
    }
    if (state.tool === "fill") {
      if (!state.level.inBounds(cell.c, cell.r)) return;
      floodFill(cell.c, cell.r, currentTile());
      return;
    }
    if (state.tool === "prefab") {
      const origin = ensureContains(cell.c, cell.r);
      const def = PREFABS[state.prefab];
      let maxC = origin.c;
      let maxR = origin.r;
      for (const t of def.tiles) {
        maxC = Math.max(maxC, origin.c + t.c);
        maxR = Math.max(maxR, origin.r + t.r);
      }
      ensureContains(maxC, maxR);
      stampPrefab(origin, def.tiles);
      return;
    }
    applyTile(pos.c, pos.r, currentTile());
  }

  function textAt(c, r) {
    const list = state.level.texts || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (DP.labelHitsCell(list[i], c, r)) return list[i];
    }
    return null;
  }

  function removeTextAt(c, r) {
    const before = (state.level.texts || []).length;
    state.level.texts = (state.level.texts || []).filter((t) => !DP.labelHitsCell(t, c, r));
    return state.level.texts.length !== before;
  }

  function stampText(pos, erase) {
    if (erase) {
      removeTextAt(pos.c, pos.r);
      return;
    }
    const inp = document.getElementById("textDraft");
    const raw = inp ? inp.value : state.textDraft;
    const text = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 64);
    if (!text) {
      setStatus("Type the label first");
      if (inp) inp.focus();
      return;
    }
    state.textDraft = text;
    if (inp && inp.value !== text) inp.value = text;
    const existing = (state.level.texts || []).find((t) => t.c === pos.c && t.r === pos.r);
    if (existing) {
      existing.text = text;
      existing.color = state.textColor;
      existing.scale = state.textScale;
    } else {
      state.level.texts.push({
        id: "tx" + Math.random().toString(36).slice(2, 9),
        c: pos.c,
        r: pos.r,
        text: text,
        color: state.textColor,
        scale: state.textScale,
      });
    }
  }

  function pickAt(cell) {
    if (!cell.inside) return;
    const label = textAt(cell.c, cell.r);
    if (label) {
      state.textDraft = label.text;
      state.textColor = label.color;
      state.textScale = label.scale;
      const inp = document.getElementById("textDraft");
      if (inp) inp.value = label.text;
      syncTextUI();
      setTool("text");
      return;
    }
    const t = state.level.get(cell.c, cell.r);
    if (!t) {
      setTool("erase");
      return;
    }
    setTile(t.id);
    if (DP.isSpikeId(t.id)) setRot(t.rot || 0);
    setTool("paint");
  }

  function selectionBounds() {
    const s = state.selection;
    if (!s) return null;
    return {
      c0: Math.min(s.c0, s.c1),
      r0: Math.min(s.r0, s.r1),
      c1: Math.max(s.c0, s.c1),
      r1: Math.max(s.r0, s.r1),
    };
  }

  function copySelection(cut) {
    const b = selectionBounds();
    if (!b) return;
    const tiles = [];
    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) {
        const t = state.level.get(c, r);
        if (t) tiles.push({ c: c - b.c0, r: r - b.r0, id: t.id, rot: t.rot || 0 });
      }
    }
    state.clipboard = { w: b.c1 - b.c0 + 1, h: b.r1 - b.r0 + 1, tiles };
    if (cut) {
      pushUndo();
      for (let r = b.r0; r <= b.r1; r++) {
        for (let c = b.c0; c <= b.c1; c++) {
          applyTile(c, r, null);
          removeTextAt(c, r);
        }
      }
    }
    setStatus((cut ? "Cut" : "Copied") + " " + tiles.length + " tiles");
  }

  function pasteAt(cell) {
    if (!state.clipboard) return;
    pushUndo();
    stampPrefab(cell, state.clipboard.tiles);
    state.selection = {
      c0: cell.c,
      r0: cell.r,
      c1: cell.c + state.clipboard.w - 1,
      r1: cell.r + state.clipboard.h - 1,
    };
  }

  function deleteSelection() {
    const b = selectionBounds();
    if (!b) return;
    pushUndo();
    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) {
        applyTile(c, r, null);
        removeTextAt(c, r);
      }
    }
  }

  function transformSelection(mode) {
    const b = selectionBounds();
    if (!b) return;
    const w = b.c1 - b.c0 + 1;
    const h = b.r1 - b.r0 + 1;
    const harvested = [];
    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) {
        const t = state.level.get(c, r);
        if (t) harvested.push({ c: c - b.c0, r: r - b.r0, id: t.id, rot: t.rot || 0 });
      }
    }
    pushUndo();
    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) applyTile(c, r, null);
    }
    const mapped = harvested.map((t) => {
      let c = t.c;
      let r = t.r;
      let rot = t.rot || 0;
      if (mode === "flipH") {
        c = w - 1 - t.c;
        if (DP.isSpikeId(t.id)) rot = rot === 90 ? 270 : rot === 270 ? 90 : rot;
      } else if (mode === "flipV") {
        r = h - 1 - t.r;
        if (DP.isSpikeId(t.id)) rot = rot === 0 ? 180 : rot === 180 ? 0 : rot;
      } else if (mode === "rot90") {
        const nc = h - 1 - t.r;
        const nr = t.c;
        c = nc;
        r = nr;
        if (DP.isSpikeId(t.id)) rot = (rot + 90) % 360;
      }
      return { c, r, id: t.id, rot };
    });
    stampPrefab({ c: b.c0, r: b.r0 }, mapped);
    if (mode === "rot90") {
      state.selection = { c0: b.c0, r0: b.r0, c1: b.c0 + h - 1, r1: b.r0 + w - 1 };
    }
  }

  function moveSelection(dc, dr, copy) {
    const b = selectionBounds();
    if (!b) return;
    const harvested = [];
    for (let r = b.r0; r <= b.r1; r++) {
      for (let c = b.c0; c <= b.c1; c++) {
        const t = state.level.get(c, r);
        if (t) harvested.push({ c: c - b.c0, r: r - b.r0, id: t.id, rot: t.rot || 0 });
      }
    }
    const movingLabels = (state.level.texts || []).filter(
      (t) => t.c >= b.c0 && t.c <= b.c1 && t.r >= b.r0 && t.r <= b.r1
    );
    pushUndo();
    if (!copy) {
      for (let r = b.r0; r <= b.r1; r++) {
        for (let c = b.c0; c <= b.c1; c++) applyTile(c, r, null);
      }
      movingLabels.forEach((t) => removeTextAt(t.c, t.r));
    }
    stampPrefab({ c: b.c0 + dc, r: b.r0 + dr }, harvested);
    movingLabels.forEach((t) => {
      state.level.texts.push({
        id: "tx" + Math.random().toString(36).slice(2, 9),
        c: t.c + dc,
        r: t.r + dr,
        text: t.text,
        color: t.color,
        scale: t.scale,
      });
    });
    state.selection = {
      c0: b.c0 + dc,
      r0: b.r0 + dr,
      c1: b.c1 + dc,
      r1: b.r1 + dr,
    };
  }

  function beginStroke(ev) {
    if (state.playing) return;
    const cell = eventCell(ev);
    state.hover = cell;
    if (ev.button === 1 || state.pan.space) {
      state.pan.on = true;
      state.pan.lastX = ev.clientX;
      state.pan.lastY = ev.clientY;
      return;
    }
    if (ev.button === 2 && !ev.ctrlKey) {
      if (ev.shiftKey) {
        pickAt(cell);
        return;
      }
      pushUndo();
      state.stroke = { kind: "paint", erase: true };
      paintAt(cell, true);
      els.canvas.classList.add("painting");
      return;
    }
    if (state.tool === "picker" || ev.ctrlKey) {
      pickAt(cell);
      return;
    }
    if (state.tool === "text") {
      pushUndo();
      const pos = ev.button === 2 ? cell : ensureContains(cell.c, cell.r);
      stampText(pos, ev.button === 2);
      return;
    }
    if (state.tool === "select") {
      state.selection = { c0: cell.c, r0: cell.r, c1: cell.c, r1: cell.r, dragging: true };
      els.canvas.classList.add("selecting");
      return;
    }
    if (state.tool === "rect" || state.tool === "line") {
      pushUndo();
      state.stroke = {
        kind: state.tool,
        c0: cell.c,
        r0: cell.r,
        c1: cell.c,
        r1: cell.r,
        erase: ev.button === 2,
      };
      els.canvas.classList.add("painting");
      return;
    }
    pushUndo();
    state.stroke = { kind: "paint", erase: state.tool === "erase" };
    paintAt(cell, state.tool === "erase");
    els.canvas.classList.add("painting");
  }

  function moveStroke(ev) {
    if (state.pan.on) {
      const dx = (ev.clientX - state.pan.lastX) / state.cam.zoom;
      const dy = (ev.clientY - state.pan.lastY) / state.cam.zoom;
      state.cam.x -= dx;
      state.cam.y -= dy;
      state.pan.lastX = ev.clientX;
      state.pan.lastY = ev.clientY;
      clampCam();
      return;
    }
    const cell = eventCell(ev);
    state.hover = cell;
    if (state.selection && state.selection.dragging) {
      state.selection.c1 = cell.c;
      state.selection.r1 = cell.r;
      return;
    }
    if (!state.stroke) return;
    if (state.stroke.kind === "rect" || state.stroke.kind === "line") {
      let c1 = cell.c;
      let r1 = cell.r;
      if (ev.shiftKey && state.stroke.kind === "rect") {
        const side = Math.max(Math.abs(c1 - state.stroke.c0), Math.abs(r1 - state.stroke.r0));
        c1 = state.stroke.c0 + Math.sign(c1 - state.stroke.c0 || 1) * side;
        r1 = state.stroke.r0 + Math.sign(r1 - state.stroke.r0 || 1) * side;
      }
      if (ev.shiftKey && state.stroke.kind === "line") {
        if (Math.abs(c1 - state.stroke.c0) > Math.abs(r1 - state.stroke.r0)) r1 = state.stroke.r0;
        else c1 = state.stroke.c0;
      }
      state.stroke.c1 = c1;
      state.stroke.r1 = r1;
      return;
    }
    paintAt(cell, state.stroke.erase);
  }

  function endStroke() {
    if (state.selection) state.selection.dragging = false;
    if (state.stroke && (state.stroke.kind === "rect" || state.stroke.kind === "line")) {
      const pts =
        state.stroke.kind === "rect"
          ? rectCells(state.stroke.c0, state.stroke.r0, state.stroke.c1, state.stroke.r1)
          : bresenham(state.stroke.c0, state.stroke.r0, state.stroke.c1, state.stroke.r1);
      const tile = state.stroke.erase ? null : currentTile();
      for (const p of pts) {
        if (tile) {
          const q = ensureContains(p.c, p.r);
          applyTile(q.c, q.r, tile);
        } else {
          applyTile(p.c, p.r, null);
        }
      }
    }
    state.stroke = null;
    state.pan.on = false;
    els.canvas.classList.remove("painting", "selecting");
    syncInspector();
  }

  function validate() {
    const counts = state.level.counts();
    const spawnTile = state.level.get(state.level.spawn.c, state.level.spawn.r);
    const issues = [];
    if (counts.goal < 1) issues.push("needs a goal");
    if (spawnTile && DP.isSpikeId(spawnTile.id)) issues.push("spawn on spike");
    if (spawnTile && DP.isBrickId(spawnTile.id)) issues.push("spawn inside brick");
    return { counts, issues, ok: issues.length === 0 && counts.goal > 0 };
  }

  function syncInspector() {
    els.name.value = state.level.name;
    els.cols.value = state.level.cols;
    els.rows.value = state.level.rows;
    document.getElementById("gSpeed").value = state.level.gameplay.moveSpeed;
    document.getElementById("gJump").value = state.level.gameplay.jumpForce;
    document.getElementById("gGrav").value = state.level.gameplay.gravity;
    const songSel = document.getElementById("gSong");
    if (songSel) songSel.value = state.level.song || "";
    document.getElementById("vSpeed").textContent = state.level.gameplay.moveSpeed;
    document.getElementById("vJump").textContent = state.level.gameplay.jumpForce;
    document.getElementById("vGrav").textContent = state.level.gameplay.gravity;
    const v = validate();
    document.getElementById("cBrick").textContent = v.counts.brick;
    document.getElementById("cIBrick").textContent = v.counts.ibrick;
    document.getElementById("cSpike").textContent = v.counts.spike;
    document.getElementById("cInvis").textContent = v.counts.ispike;
    document.getElementById("cOrb").textContent = v.counts.orb;
    document.getElementById("cPad").textContent = v.counts.pad;
    document.getElementById("cDash").textContent = v.counts.dash;
    document.getElementById("cGoal").textContent = v.counts.goal;
    syncThemeUI();
    document.getElementById("cText").textContent = v.counts.labels;
    document.getElementById("cSpawn").textContent = state.level.spawn.c + "," + state.level.spawn.r;
    const validEl = document.getElementById("cValid");
    if (v.ok) {
      validEl.textContent = "OK";
      validEl.style.color = "var(--good)";
    } else {
      validEl.textContent = v.issues.join(" · ") || "needs a goal";
      validEl.style.color = "var(--gold)";
    }
    const tags = (state.level.meta && Array.isArray(state.level.meta.tags)) ? state.level.meta.tags : [];
    const tagEl = document.getElementById("cTags");
    if (tagEl) tagEl.textContent = tags.length ? tags.join(", ") : "—";
  }

  function exportLevel() {
    const data = state.level.toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const safe = (state.level.name || "level").replace(/[^\w\-]+/g, "_").slice(0, 40);
    a.href = URL.createObjectURL(blob);
    a.download = safe + ".dashpoint.json";
    a.click();
    URL.revokeObjectURL(a.href);
    saveToLibrary(true);
    markDirty(false);
    setStatus("Exported " + a.download);
  }

  async function copyJSON() {
    const text = JSON.stringify(state.level.toJSON(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("JSON copied");
    } catch (e) {
      setStatus("Clipboard blocked — use Export");
    }
  }

  function importText(text) {
    const level = DP.Level.parse(text);
    pushUndo();
    state.level = level;
    state.selection = null;
    syncInspector();
    focusOn(level.spawn.c, level.spawn.r, editorZoom());
    markDirty(true);
    setStatus("Imported “" + level.name + "”");
  }

  function clearNetworkEdit() {
    networkEdit = null;
    try { localStorage.removeItem(STORAGE_NET_EDIT); } catch (e) {}
    syncPostButton();
  }

  function syncPostButton() {
    const btn = document.getElementById("btnPost");
    if (!btn) return;
    if (networkEdit) {
      btn.textContent = "Update";
      btn.title = "Update your Network level";
    } else {
      btn.textContent = "Post";
      btn.title = "Post to DashPoint Network";
    }
  }

  function readNetworkEdit() {
    try {
      const raw = localStorage.getItem(STORAGE_NET_EDIT);
      if (!raw) return null;
      const packet = JSON.parse(raw);
      if (!packet || !packet.id || !packet.json) return null;
      return packet;
    } catch (e) {
      return null;
    }
  }

  function newLevel(force) {
    if (!force && state.dirty && !confirm("Discard unsaved changes?")) return;
    clearNetworkEdit();
    state.level = DP.Level.createDefault("New Level");
    state.undo = [];
    state.redo = [];
    state.selection = null;
    stopPlay();
    syncInspector();
    focusOn(state.level.spawn.c, state.level.spawn.r, editorZoom());
    markDirty(true);
    setStatus("New level");
  }

  function generateLevel(force) {
    if (!force && state.dirty && !confirm("Replace the current level with a random AI course?")) return;
    if (!window.DashPointGenerate) {
      setStatus("AI generator failed to load");
      return;
    }
    state.level = window.DashPointGenerate.generate(DP);
    state.undo = [];
    state.redo = [];
    state.selection = null;
    stopPlay();
    syncInspector();
    focusOn(state.level.spawn.c, state.level.spawn.r, editorZoom());
    markDirty(true);
    setStatus("AI built “" + state.level.name + "” — playtest it");
  }

  function library() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_LIB) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveToLibrary(quiet) {
    const list = library();
    const json = state.level.toJSON();
    const existing = list.findIndex((x) => x.name === json.name);
    const entry = { name: json.name, updatedAt: json.meta.updatedAt, data: json };
    if (existing >= 0) list[existing] = entry;
    else list.unshift(entry);
    while (list.length > 24) list.pop();
    localStorage.setItem(STORAGE_LIB, JSON.stringify(list));
    autosave();
    if (!quiet) setStatus("Saved “" + json.name + "”");
  }

  function renderLibrary() {
    const box = document.getElementById("libraryList");
    const list = library();
    if (!list.length) {
      box.innerHTML = "<p class='hint'>No drafts yet. Ctrl+S saves the current level here.</p>";
      return;
    }
    box.innerHTML = "";
    list.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.className = "lib-item";
      btn.innerHTML =
        "<div><b>" +
        escapeHtml(item.name) +
        "</b><div class='hint' style='margin:0'>" +
        (item.data.cols || "?") +
        "×" +
        (item.data.rows || "?") +
        "</div></div><div class='meta'>" +
        escapeHtml(String(item.updatedAt || "").replace("T", " ").slice(0, 16)) +
        "</div>";
      btn.addEventListener("click", () => {
        importText(JSON.stringify(item.data));
        closeModal("modalLibrary");
      });
      const del = document.createElement("button");
      del.className = "mini";
      del.textContent = "×";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        list.splice(i, 1);
        localStorage.setItem(STORAGE_LIB, JSON.stringify(list));
        renderLibrary();
      });
      btn.appendChild(del);
      box.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function startPlay(fromHover) {
    const v = validate();
    if (!v.ok && !confirm("Level has issues: " + v.issues.join(", ") + "\nPlay anyway?")) return;
    const live = state.level.clone();
    if (fromHover && state.hover.inside) {
      live.spawn = { c: state.hover.c, r: state.hover.r };
    }
    state.savedCam = { x: state.cam.x, y: state.cam.y, zoom: state.cam.zoom };
    state.engine = new DP.Engine(live, { skin: currentSkin() });
    if (DP.Music) DP.Music.play(live.song);
    focusOn(live.spawn.c, live.spawn.r, playZoom());
    state.playing = true;
    state.deaths = 0;
    els.app.classList.add("playing");
    els.playHud.classList.add("visible");
    els.winCard.classList.remove("visible");
    els.playLabel.textContent = "Stop";
    els.hudState.textContent = "PLAY";
    setStatus("Playtest");
  }

  function stopPlay() {
    if (DP.Music) DP.Music.stop();
    state.playing = false;
    state.engine = null;
    if (state.savedCam) {
      state.cam.x = state.savedCam.x;
      state.cam.y = state.savedCam.y;
      state.cam.zoom = state.savedCam.zoom;
    }
    els.app.classList.remove("playing");
    els.playHud.classList.remove("visible");
    els.winCard.classList.remove("visible");
    els.playLabel.textContent = "Playtest";
    setStatus("Editing");
  }

  function restartPlay() {
    if (!state.playing || !state.engine) return;
    state.engine.reset();
    if (DP.Music) DP.Music.play(state.engine.level.song);
    els.winCard.classList.remove("visible");
    els.hudState.textContent = "PLAY";
  }


  function bindPressed(action) {
    const list = state.settings.keybinds[action] || [];
    for (const code of list) {
      if (state.keys.has(code)) return true;
    }
    return false;
  }

  function followPlayer() {
    if (!state.engine) return;
    const p = state.engine.player;
    const viewW = els.canvas.width / state.cam.zoom;
    const viewH = els.canvas.height / state.cam.zoom;
    const tx = p.x + p.w / 2 - viewW / 2;
    const ty = p.y + p.h / 2 - viewH / 2;
    state.cam.x += (tx - state.cam.x) * 0.18;
    state.cam.y += (ty - state.cam.y) * 0.18;
    clampCam();
    const z = state.cam.zoom;
    state.cam.x = Math.round(state.cam.x * z) / z;
    state.cam.y = Math.round(state.cam.y * z) / z;
  }

  function drawMinimap() {
    const c = mctx;
    const w = els.minimap.width;
    const h = els.minimap.height;
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#05080d";
    c.fillRect(0, 0, w, h);
    const sx = w / (state.level.cols * TILE);
    const sy = h / (state.level.rows * TILE);
    const s = Math.min(sx, sy);
    const ox = (w - state.level.cols * TILE * s) / 2;
    const oy = (h - state.level.rows * TILE * s) / 2;
    c.fillStyle = "#102030";
    c.fillRect(ox, oy, state.level.cols * TILE * s, state.level.rows * TILE * s);
    state.level.forEachTile((tile, col, row) => {
      if (tile.id === "brick") c.fillStyle = "#3aa0ff";
      else if (tile.id === "ibrick") c.fillStyle = "#6e9cff";
      else if (tile.id === "spike") c.fillStyle = "#ff4d62";
      else if (tile.id === "ispike") c.fillStyle = "#b45cff";
      else if (tile.id === "orb") c.fillStyle = "#3ee07a";
      else if (tile.id === "pad") c.fillStyle = "#ff9d2e";
      else if (tile.id === "dash") c.fillStyle = "#2ee6ff";
      else c.fillStyle = "#ffd23c";
      c.fillRect(ox + col * TILE * s, oy + row * TILE * s, Math.max(1, TILE * s), Math.max(1, TILE * s));
    });
    c.fillStyle = "#2ee6ff";
    c.fillRect(ox + state.level.spawn.c * TILE * s, oy + state.level.spawn.r * TILE * s, Math.max(2, TILE * s), Math.max(2, TILE * s));
    c.strokeStyle = "rgba(255,255,255,0.7)";
    c.lineWidth = 1;
    c.strokeRect(
      ox + state.cam.x * s,
      oy + state.cam.y * s,
      (els.canvas.width / state.cam.zoom) * s,
      (els.canvas.height / state.cam.zoom) * s
    );
  }

  function render(ts) {
    requestAnimationFrame(render);
    const dt = Math.min(0.05, (ts - state.lastFrame) / 1000 || 0.016);
    state.lastFrame = ts;
    resizeCanvas();

    if (state.playing && state.engine) {
      state.engine.setInput({
        left: bindPressed("left"),
        right: bindPressed("right"),
        jump: bindPressed("jump"),
      });
      const wasDead = state.engine.dead;
      state.engine.update(dt);
      if (state.engine.dead && !wasDead) {
        state.deaths += 1;
        els.hudState.textContent = "DEAD";
      }
      if (state.engine.dead && state.settings.autoRespawn && state.engine.deathTimer > 0.55) {
        restartPlay();
      }
      if (state.engine.won) {
        els.hudState.textContent = "GOAL";
        document.getElementById("winText").textContent =
          "Time " + state.engine.time.toFixed(2) + "s  ·  deaths " + state.deaths;
        els.winCard.classList.add("visible");
      }
      followPlayer();
      els.hudTime.textContent = state.engine.time.toFixed(2) + "s";
      els.hudDeaths.textContent = "deaths " + state.deaths;
    }

    let ghost = ghostForStroke();
    if (!ghost && !state.playing && state.hover.inside) {
      if (state.tool === "prefab") ghost = prefabGhost(state.hover);
      else if (state.tool === "paint") ghost = [{ c: state.hover.c, r: state.hover.r, id: state.tile, rot: state.rot }];
      else if (state.tool === "erase") ghost = [{ c: state.hover.c, r: state.hover.r, id: "erase" }];
      else if (state.tool === "spawn") ghost = [];
    }

    DP.drawWorld(ctx, state.engine ? state.engine.level : state.level, state.images, state.cam, {
      showGrid: state.showGrid && !state.playing,
      showHover: !state.playing && state.tool !== "prefab",
      hover: state.hover,
      ghostTiles: state.playing ? null : ghost,
      selection: state.playing ? null : state.selection,
      engine: state.playing ? state.engine : null,
      skin: currentSkin(),
      hitboxes: state.settings.hitboxes,
      showSpawn: !state.playing,
      ghostText:
        !state.playing && state.tool === "text" && state.textDraft
          ? {
              c: state.hover.c,
              r: state.hover.r,
              text: state.textDraft,
              color: state.textColor,
              scale: state.textScale,
            }
          : null,
    });

    drawMinimap();
    els.statusZoom.textContent = Math.round(state.cam.zoom * 100) + "%";
    if (state.hover.inside) {
      const t = state.level.get(state.hover.c, state.hover.r);
      els.statusCell.textContent =
        "tile " + state.hover.c + "," + state.hover.r + (t ? " · " + t.id : "");
    } else {
      els.statusCell.textContent = "extend " + state.hover.c + "," + state.hover.r;
    }

    state.statsTick += dt;
    if (state.statsTick > 0.4) {
      state.statsTick = 0;
      if (!state.playing) syncInspector();
    }
  }

  function openModal(id) {
    document.getElementById(id).classList.add("visible");
    if (id === "modalLibrary") renderLibrary();
    if (id === "modalSettings") syncSettingsUI();
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove("visible");
    state.listening = null;
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-root.visible").forEach((m) => closeModal(m.id));
    state.listening = null;
  }

  function anyModal() {
    return !!document.querySelector(".modal-root.visible");
  }

  function prettyCode(code) {
    return code.replace(/^Key/, "").replace(/^Arrow/, "Arrow ").replace(/^Digit/, "");
  }

  function renderBinds() {
    ["left", "right", "jump"].forEach((k) => {
      const el = document.getElementById("bind" + k.charAt(0).toUpperCase() + k.slice(1));
      el.textContent = (state.settings.keybinds[k] || []).map(prettyCode).join(" / ");
    });
    document.querySelectorAll("[data-bind]").forEach((b) => {
      b.classList.remove("listening");
      b.textContent = "Change";
    });
  }

  function syncTextUI() {
    const inp = document.getElementById("textDraft");
    if (inp && document.activeElement !== inp) inp.value = state.textDraft;
    document.querySelectorAll("#textColors .chip").forEach((b) => {
      b.classList.toggle("active", b.dataset.color === state.textColor);
    });
    document.querySelectorAll("#textSizes .chip").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.scale) === state.textScale);
    });
  }

  function syncSettingsUI() {
    document.getElementById("setUser").value = state.settings.username;
    document.getElementById("setHitbox").checked = state.settings.hitboxes;
    document.getElementById("setAuto").checked = state.settings.autoRespawn;
    renderBinds();
  }

  function themeMatchesPreset(th) {
    return DP.THEMES.find((t) => t.top === th.top && t.mid === th.mid && t.bottom === th.bottom) || null;
  }

  function syncThemeUI() {
    const th = state.level.theme;
    document.querySelectorAll("#themeChips .theme-chip").forEach((b) => {
      b.classList.toggle("active", !!themeMatchesPreset(th));
    });
    ["Top", "Mid", "Bottom"].forEach((k) => {
      const inp = document.getElementById("th" + k);
      if (inp && document.activeElement !== inp && !inp.dataset.editing) {
        inp.value = th[k.toLowerCase()];
      }
    });
  }

  function applyTheme(theme, undoable) {
    if (undoable) pushUndo();
    state.level.theme = DP.sanitizeTheme(theme);
    markDirty(true);
    syncInspector();
  }

  function buildUI() {
    const rotBox = document.getElementById("rotations");
    [0, 90, 180, 270].forEach((rot) => {
      const b = document.createElement("button");
      b.className = "mini";
      b.dataset.rot = String(rot);
      const img = document.createElement("img");
      img.src = "assets/tiles/spike.png";
      img.alt = String(rot);
      img.style.transform = "rotate(" + rot + "deg)";
      b.appendChild(img);
      b.addEventListener("click", () => {
        setRot(rot);
        if (!DP.isSpikeId(state.tile)) setTile("spike");
      });
      rotBox.appendChild(b);
    });
    updateRotUI();

    const pref = document.getElementById("prefabs");
    Object.keys(PREFABS).forEach((id) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.dataset.prefab = id;
      b.textContent = PREFABS[id].name;
      b.addEventListener("click", () => {
        state.prefab = id;
        setTool("prefab");
        document.querySelectorAll("#prefabs .chip").forEach((x) => x.classList.toggle("active", x.dataset.prefab === id));
      });
      pref.appendChild(b);
    });
    pref.querySelector(".chip").classList.add("active");

    const colorBox = document.getElementById("textColors");
    DP.TEXT_COLORS.forEach((col) => {
      const b = document.createElement("button");
      b.className = "chip color-chip" + (state.textColor === col ? " active" : "");
      b.dataset.color = col;
      b.style.background = col;
      b.title = col;
      b.addEventListener("click", () => {
        state.textColor = col;
        setTool("text");
        syncTextUI();
      });
      colorBox.appendChild(b);
    });
    document.getElementById("textSizes").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-scale]");
      if (!btn) return;
      state.textScale = DP.clamp(parseInt(btn.dataset.scale, 10) || 1, 1, 3);
      setTool("text");
      syncTextUI();
    });
    const draft = document.getElementById("textDraft");
    draft.addEventListener("input", () => {
      state.textDraft = draft.value.slice(0, 64);
    });
    draft.addEventListener("focus", () => setTool("text"));

    const skins = document.getElementById("skinGrid");

    const chipBox = document.getElementById("themeChips");
    DP.THEMES.forEach((t) => {
      const b = document.createElement("button");
      b.className = "chip theme-chip";
      b.title = t.name;
      b.style.background = "linear-gradient(135deg, " + t.top + ", " + t.mid + ", " + t.bottom + ")";
      b.addEventListener("click", () => {
        applyTheme(t, true);
        setStatus("Theme: " + t.name);
      });
      chipBox.appendChild(b);
    });
    ["Top", "Mid", "Bottom"].forEach((k) => {
      const inp = document.getElementById("th" + k);
      inp.addEventListener("input", () => {
        applyTheme({ top: document.getElementById("thTop").value, mid: document.getElementById("thMid").value, bottom: document.getElementById("thBottom").value }, false);
        syncThemeUI();
      });
      inp.addEventListener("focus", () => {
        inp.dataset.editing = "1";
        pushUndo();
      });
      inp.addEventListener("blur", () => delete inp.dataset.editing);
    });

    DP.SKINS.forEach((s) => {
      const b = document.createElement("button");
      b.className = "skin-btn" + (state.settings.skin === s.id ? " active" : "");
      b.title = s.name;
      b.innerHTML = '<img src="' + s.src + '" alt="' + s.name + '" />';
      b.addEventListener("click", () => {
        state.settings.skin = s.id;
        saveSettings();
        if (state.engine) state.engine.skin = s.id;
        skins.querySelectorAll(".skin-btn").forEach((x, i) => x.classList.toggle("active", i === s.id - 1));
      });
      skins.appendChild(b);
    });
  }

  function isTyping(ev) {
    const t = ev.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  function onKeyDown(ev) {
    if (state.listening) {
      ev.preventDefault();
      if (ev.code === "Escape") {
        state.listening = null;
        renderBinds();
        return;
      }
      const action = state.listening;
      const list = state.settings.keybinds[action].slice();
      if (list.indexOf(ev.code) === -1) list.push(ev.code);
      state.settings.keybinds[action] = list.slice(-3);
      saveSettings();
      state.listening = null;
      renderBinds();
      return;
    }

    if (ev.code === "Space") {
      state.pan.space = true;
      if (!isTyping(ev)) ev.preventDefault();
    }
    state.keys.add(ev.code);

    if (ev.code === "Escape") {
      if (anyModal()) {
        closeAllModals();
        return;
      }
      if (state.playing) {
        ev.preventDefault();
        stopPlay();
      }
      return;
    }

    if (anyModal() || isTyping(ev)) return;

    if (ev.code === "Enter") {
      ev.preventDefault();
      if (state.playing) stopPlay();
      else startPlay(ev.altKey);
      return;
    }

    if (state.playing) {
      if (ev.code === "KeyR") {
        ev.preventDefault();
        restartPlay();
      }
      if (ev.code === "Space") ev.preventDefault();
      return;
    }

    const ctrl = ev.ctrlKey || ev.metaKey;
    if (ctrl && ev.code === "KeyZ") {
      ev.preventDefault();
      if (ev.shiftKey) redo();
      else undo();
      return;
    }
    if (ctrl && ev.code === "KeyY") {
      ev.preventDefault();
      redo();
      return;
    }
    if (ctrl && ev.code === "KeyS") {
      ev.preventDefault();
      saveToLibrary();
      return;
    }
    if (ctrl && ev.code === "KeyE") {
      ev.preventDefault();
      exportLevel();
      return;
    }
    if (ctrl && ev.code === "KeyO") {
      ev.preventDefault();
      els.file.click();
      return;
    }
    if (ctrl && ev.code === "KeyN") {
      ev.preventDefault();
      newLevel();
      return;
    }
    if (ctrl && ev.code === "KeyG") {
      ev.preventDefault();
      generateLevel();
      return;
    }
    if (ctrl && ev.code === "KeyC") {
      ev.preventDefault();
      copySelection(false);
      return;
    }
    if (ctrl && ev.code === "KeyX") {
      ev.preventDefault();
      copySelection(true);
      return;
    }
    if (ctrl && ev.code === "KeyV") {
      ev.preventDefault();
      pasteAt(state.hover.inside ? state.hover : { c: 0, r: 0 });
      return;
    }

    if (ev.code === "KeyB") setTool("paint");
    if (ev.code === "KeyE" && !ctrl) setTool("erase");
    if (ev.code === "KeyF") setTool("fill");
    if (ev.code === "KeyR" && !ctrl) setTool("rect");
    if (ev.code === "KeyL") setTool("line");
    if (ev.code === "KeyV" && !ctrl) setTool("select");
    if (ev.code === "KeyI") setTool("picker");
    if (ev.code === "KeyP") setTool("spawn");
    if (ev.code === "KeyG") setTool("prefab");
    if (ev.code === "KeyT") setTool("text");
    if (ev.code === "Digit1") setTile("brick");
    if (ev.code === "Digit2") setTile("spike");
    if (ev.code === "Digit4") setTile("ispike");
    if (ev.code === "Digit5") setTile("orb");
    if (ev.code === "Digit6") setTile("pad");
    if (ev.code === "Digit7") setTile("dash");
    if (ev.code === "Digit8") setTile("ibrick");
    if (ev.code === "Digit9") setTile("checkpoint");
    if (ev.code === "Digit3") setTile("goal");
    if (ev.code === "BracketLeft") setRot(state.rot - 90);
    if (ev.code === "BracketRight") setRot(state.rot + 90);
    if (ev.code === "Delete" || ev.code === "Backspace") {
      ev.preventDefault();
      if (state.selection) deleteSelection();
      else if (textAt(state.hover.c, state.hover.r)) {
        pushUndo();
        removeTextAt(state.hover.c, state.hover.r);
        setStatus("Deleted text");
      } else {
        deleteSelection();
      }
    }
    if (ev.code === "KeyH") transformSelection(ev.shiftKey ? "flipV" : "flipH");
    if (ev.code === "KeyQ") transformSelection("rot90");
    if (ev.code === "Slash" && ev.shiftKey) openModal("modalHelp");
    if (ev.code === "F1") {
      ev.preventDefault();
      openModal("modalHelp");
    }

    if (state.selection && !ctrl) {
      if (ev.code === "ArrowLeft") {
        ev.preventDefault();
        moveSelection(-1, 0, ev.altKey);
      }
      if (ev.code === "ArrowRight") {
        ev.preventDefault();
        moveSelection(1, 0, ev.altKey);
      }
      if (ev.code === "ArrowUp") {
        ev.preventDefault();
        moveSelection(0, -1, ev.altKey);
      }
      if (ev.code === "ArrowDown") {
        ev.preventDefault();
        moveSelection(0, 1, ev.altKey);
      }
    }
  }

  function onKeyUp(ev) {
    state.keys.delete(ev.code);
    if (ev.code === "Space") state.pan.space = false;
  }

  function grow(edge, dir) {
    const amt = dir < 0 ? -Math.max(1, state.growAmount) : state.growAmount;
    const pad = { left: 0, right: 0, top: 0, bottom: 0 };
    pad[edge] = amt;
    pushUndo();
    const res = state.level.resize(pad, { continueFloor: dir > 0 });
    if (res.left) state.cam.x += res.left * TILE;
    if (res.top) state.cam.y += res.top * TILE;
    syncInspector();
    setStatus("Size " + state.level.cols + "×" + state.level.rows);
  }

  function applySizeInputs() {
    const cols = DP.clamp(parseInt(els.cols.value, 10) || state.level.cols, DP.MIN_COLS, DP.MAX_COLS);
    const rows = DP.clamp(parseInt(els.rows.value, 10) || state.level.rows, DP.MIN_ROWS, DP.MAX_ROWS);
    const dc = cols - state.level.cols;
    const dr = rows - state.level.rows;
    if (dc === 0 && dr === 0) return;
    pushUndo();
    state.level.resize({ right: dc, bottom: dr }, { continueFloor: dc > 0 || dr > 0 });
    syncInspector();
    setStatus("Size " + state.level.cols + "×" + state.level.rows);
  }

  function bindEvents() {
    window.addEventListener("resize", () => {
      resizeCanvas();
      clampCam();
    });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => {
      state.keys.clear();
      state.pan.space = false;
    });

    els.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    els.canvas.addEventListener("pointerdown", (ev) => {
      els.canvas.setPointerCapture(ev.pointerId);
      beginStroke(ev);
    });
    els.canvas.addEventListener("pointermove", (ev) => {
      state.hover = eventCell(ev);
      moveStroke(ev);
    });
    els.canvas.addEventListener("pointerup", endStroke);
    els.canvas.addEventListener("pointercancel", endStroke);
    els.canvas.addEventListener("pointerleave", () => {
      if (!state.stroke) state.hover.inside = false;
    });
    els.canvas.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        if (ev.altKey || ev.ctrlKey) {
          setRot(state.rot + (ev.deltaY > 0 ? 90 : -90));
          return;
        }
        const dir = ev.deltaY > 0 ? -1 : 1;
        zoomAt(ev.clientX, ev.clientY, state.cam.zoom + dir);
      },
      { passive: false }
    );

    els.minimap.addEventListener("pointerdown", jumpMinimap);
    els.minimap.addEventListener("pointermove", (ev) => {
      if (ev.buttons) jumpMinimap(ev);
    });

    document.getElementById("tools").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-tool]");
      if (btn) setTool(btn.dataset.tool);
    });
    document.querySelectorAll(".tile-btn").forEach((btn) => {
      btn.addEventListener("click", () => setTile(btn.dataset.tile));
    });

    els.name.addEventListener("input", () => {
      state.level.name = els.name.value.slice(0, 48);
      markDirty(true);
    });
    els.cols.addEventListener("change", applySizeInputs);
    els.rows.addEventListener("change", applySizeInputs);

    document.querySelectorAll("[data-grow]").forEach((b) => b.addEventListener("click", () => grow(b.dataset.grow, 1)));
    document.querySelectorAll("[data-shrink]").forEach((b) => b.addEventListener("click", () => grow(b.dataset.shrink, -1)));
    document.getElementById("growAmounts").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-amt]");
      if (!btn) return;
      state.growAmount = parseInt(btn.dataset.amt, 10) || 32;
      document.querySelectorAll("#growAmounts .chip").forEach((x) => {
        x.classList.toggle("active", x === btn);
      });
    });

    document.getElementById("btnZoomIn").addEventListener("click", () => {
      state.cam.zoom = snapZoom(state.cam.zoom + 1);
    });
    document.getElementById("btnZoomOut").addEventListener("click", () => {
      state.cam.zoom = snapZoom(state.cam.zoom - 1);
    });
    document.getElementById("btnZoomFit").addEventListener("click", fitCamera);
    document.getElementById("btnGrid").addEventListener("click", () => {
      state.showGrid = !state.showGrid;
    });

    const bindRange = (id, key, label) => {
      document.getElementById(id).addEventListener("input", (ev) => {
        state.level.gameplay[key] = Number(ev.target.value);
        document.getElementById(label).textContent = ev.target.value;
        markDirty(true);
      });
    };
    bindRange("gSpeed", "moveSpeed", "vSpeed");
    bindRange("gJump", "jumpForce", "vJump");
    bindRange("gGrav", "gravity", "vGrav");
    const songSel = document.getElementById("gSong");
    if (songSel) {
      songSel.innerHTML = "";
      (DP.SONGS || []).forEach((s) => {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = s.name;
        songSel.appendChild(o);
      });
      songSel.addEventListener("change", () => {
        state.level.song = songSel.value || "";
        markDirty(true);
      });
    }

    document.getElementById("btnNew").addEventListener("click", () => newLevel());
    document.getElementById("btnAi").addEventListener("click", () => generateLevel());
    document.getElementById("btnLibrary").addEventListener("click", () => openModal("modalLibrary"));
    document.getElementById("btnImport").addEventListener("click", () => els.file.click());
    document.getElementById("btnExport").addEventListener("click", exportLevel);
    document.getElementById("btnCopy").addEventListener("click", copyJSON);
    document.getElementById("btnClear").addEventListener("click", () => {
      if (!confirm("Clear all tiles? Spawn stays.")) return;
      pushUndo();
      for (let r = 0; r < state.level.rows; r++) {
        for (let c = 0; c < state.level.cols; c++) state.level.grid[r][c] = null;
      }
      state.level.triggers = [];
      syncInspector();
    });
    document.getElementById("btnHelp").addEventListener("click", () => openModal("modalHelp"));
    document.getElementById("btnSettings").addEventListener("click", () => openModal("modalSettings"));
    document.getElementById("btnSkins").addEventListener("click", () => openModal("modalSkins"));
    els.play.addEventListener("click", (ev) => {
      if (state.playing) stopPlay();
      else startPlay(ev.altKey);
    });
    document.getElementById("btnRestart").addEventListener("click", restartPlay);
    document.getElementById("btnStop").addEventListener("click", stopPlay);
    document.getElementById("btnWinRestart").addEventListener("click", restartPlay);
    document.getElementById("btnWinEdit").addEventListener("click", stopPlay);

    els.file.addEventListener("change", async () => {
      const file = els.file.files && els.file.files[0];
      els.file.value = "";
      if (!file) return;
      try {
        importText(await file.text());
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    window.addEventListener("dragover", (ev) => ev.preventDefault());
    window.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (!file) return;
      try {
        importText(await file.text());
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    document.querySelectorAll("[data-close]").forEach((b) => {
      b.addEventListener("click", () => closeModal(b.dataset.close));
    });
    document.querySelectorAll(".modal-root").forEach((m) => {
      m.addEventListener("click", (ev) => {
        if (ev.target === m) closeModal(m.id);
      });
    });

    document.getElementById("setUser").addEventListener("input", (ev) => {
      state.settings.username = ev.target.value.slice(0, 24);
      saveSettings();
    });
    document.getElementById("setHitbox").addEventListener("change", (ev) => {
      state.settings.hitboxes = ev.target.checked;
      saveSettings();
    });
    document.getElementById("setAuto").addEventListener("change", (ev) => {
      state.settings.autoRespawn = ev.target.checked;
      saveSettings();
    });
    document.querySelectorAll("[data-bind]").forEach((b) => {
      b.addEventListener("click", () => {
        state.listening = b.dataset.bind;
        b.classList.add("listening");
        b.textContent = "Press key";
      });
    });
    document.getElementById("btnResetBinds").addEventListener("click", () => {
      state.settings.keybinds = JSON.parse(JSON.stringify(DP.DEFAULT_KEYBINDS));
      saveSettings();
      renderBinds();
    });

    window.addEventListener("beforeunload", () => autosave());
    setInterval(() => {
      if (state.dirty) autosave();
    }, 8000);
  }

  function jumpMinimap(ev) {
    const rect = els.minimap.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const w = els.minimap.width;
    const h = els.minimap.height;
    const sx = w / (state.level.cols * TILE);
    const sy = h / (state.level.rows * TILE);
    const s = Math.min(sx, sy);
    const ox = (w - state.level.cols * TILE * s) / 2;
    const oy = (h - state.level.rows * TILE * s) / 2;
    const wx = (x - ox) / s;
    const wy = (y - oy) / s;
    state.cam.x = wx - els.canvas.width / state.cam.zoom / 2;
    state.cam.y = wy - els.canvas.height / state.cam.zoom / 2;
    clampCam();
  }

  async function boot() {
    buildUI();
    bindEvents();
    try {
      state.images = await DP.loadAssets();
    } catch (err) {
      alert("Could not load sprites. Serve this folder over http if opening as a file fails.\n" + err.message);
      throw err;
    }

    let loaded = false;
    let loadedNet = false;
    try {
      const packet = readNetworkEdit();
      if (packet) {
        state.level = DP.Level.fromJSON(packet.json);
        if (packet.meta && packet.meta.title) state.level.name = String(packet.meta.title).slice(0, 48);
        networkEdit = { id: packet.id, meta: packet.meta || {} };
        loaded = true;
        loadedNet = true;
      }
    } catch (e) {
      networkEdit = null;
      loaded = false;
    }
    if (!loaded) {
      try {
        const raw = localStorage.getItem(STORAGE_LEVEL);
        if (raw) {
          state.level = DP.Level.fromJSON(JSON.parse(raw));
          loaded = true;
        }
      } catch (e) {
        loaded = false;
      }
    }
    if (!loaded) state.level = DP.Level.createDefault("New Level");

    syncInspector();
    syncSettingsUI();
    syncTextUI();
    syncPostButton();
    focusOn(state.level.spawn.c, state.level.spawn.r, editorZoom());
    markDirty(false);
    setStatus(loadedNet
      ? "Editing Network level “" + (state.level.name || "Untitled") + "” — Update when you're done"
      : (loaded ? "Restored autosave" : "New level — paint bricks, place a goal, hit Playtest"));
    window.DashPointEditor = {
      getLevel: () => state.level,
      getState: () => state,
      exportJSON: () => state.level.toJSON(),
      pushUndo: pushUndo,
      markDirty: () => markDirty(true),
      getNetworkEdit: () => networkEdit,
      clearNetworkEdit: clearNetworkEdit,
    };
    requestAnimationFrame(render);
  }

  boot();
})();
