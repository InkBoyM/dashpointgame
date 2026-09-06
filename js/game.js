/* DashPoint shared runtime — level format + playtest engine.
   Static, no dependencies. Used by the editor now and the game later. */
(function (global) {
  const TILE = 32;
  const FORMAT = "dashpoint-level";
  const VERSION = 1;
  const MIN_COLS = 16;
  const MAX_COLS = 20000;
  const MIN_ROWS = 8;
  const MAX_ROWS = 400;

  const TILE_TYPES = {
    brick: { id: "brick", solid: true, hazard: false, rotatable: false, label: "Brick" },
    ibrick: { id: "ibrick", solid: true, hazard: false, rotatable: false, hidden: true, label: "Invis block" },
    spike: { id: "spike", solid: false, hazard: true, rotatable: true, label: "Spike" },
    ispike: { id: "ispike", solid: false, hazard: true, rotatable: true, hidden: true, label: "Invis spike" },
    goal: { id: "goal", solid: false, hazard: false, rotatable: false, label: "Goal" },
    orb: { id: "orb", solid: false, hazard: false, rotatable: false, label: "Bounce orb" },
    pad: { id: "pad", solid: false, hazard: false, rotatable: false, label: "Bounce pad" },
    dash: { id: "dash", solid: false, hazard: false, rotatable: false, label: "Dash" },
    checkpoint: { id: "checkpoint", solid: false, hazard: false, rotatable: false, label: "Checkpoint" },
  };

  function isSpikeId(id) {
    return id === "spike" || id === "ispike";
  }

  function isBrickId(id) {
    return id === "brick" || id === "ibrick";
  }

  function isInvisibleId(id) {
    return id === "ispike" || id === "ibrick";
  }

  const SKINS = window.DashPointSkins || [];

  const DEFAULT_GAMEPLAY = {
    moveSpeed: 320,
    accel: 2800,
    friction: 2400,
    airAccel: 2100,
    jumpForce: 660,
    gravity: 2100,
    maxFall: 1000,
    coyoteMs: 90,
    bufferMs: 120,
    jumpCut: 0.42,
  };

  const DEFAULT_KEYBINDS = {
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    jump: ["KeyW", "ArrowUp", "Space"],
  };

  const ASSET_PATHS = {
    background: "assets/tiles/background.png",
    brick: "assets/tiles/brick.png",
    spike: "assets/tiles/spike.png",
    goal: "assets/tiles/goal.png",
    orb: "assets/tiles/BounceOrb.png",
    pad: "assets/tiles/BouncePad.png",
    dash: "assets/tiles/DashIcon.png",
    checkpoint: "assets/tiles/checkpoint.png",
    checkpointTouched: "assets/tiles/checkpoint-touched.png",
    title: "assets/ui/title.png",
    play: "assets/ui/play.png",
    settings: "assets/ui/settings.png",
    character: "assets/ui/character.png",
    cursorHover: "assets/ui/cursor-hover.png",
    cursorSelect: "assets/ui/cursor-select.png",
  };

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function aabbOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load " + src));
      img.src = src;
    });
  }

  async function loadAssets() {
    const images = {};
    const entries = Object.entries(ASSET_PATHS);
    await Promise.all(
      entries.map(async ([key, src]) => {
        images[key] = await loadImage(src);
      })
    );
    images.skins = [];
    for (const skin of SKINS) {
      images.skins[skin.id] = await loadImage(skin.src);
    }
    return images;
  }

  function emptyGrid(cols, rows) {
    const grid = new Array(rows);
    for (let r = 0; r < rows; r++) {
      grid[r] = new Array(cols).fill(null);
    }
    return grid;
  }

  function cellKey(c, r) {
    return c + "," + r;
  }

  const TEXT_COLORS = ["#ffffff", "#2ee6ff", "#ff2a3c", "#ffd23c", "#3ee07a"];

  const DEFAULT_THEME = { top: "#040810", mid: "#0a1628", bottom: "#122a4a" };

  const SONGS = [
    { id: "", name: "No song", file: "" },
    { id: "ugh-pico", name: "Ugh Pico Mix", file: "ugh-pico.m4a" },
    { id: "bro", name: "Bro", file: "bro.m4a" },
  ];

  function sanitizeSong(raw) {
    const id = raw == null ? "" : String(raw);
    for (let i = 0; i < SONGS.length; i++) {
      if (SONGS[i].id === id) return id;
    }
    return "";
  }

  const Music = {
    audio: null,
    id: "",
    play(id) {
      id = sanitizeSong(id);
      if (!id) {
        this.stop();
        return;
      }
      if (this.audio && this.id === id) {
        try {
          this.audio.currentTime = 0;
          this.audio.play().catch(function () {});
        } catch (e) {}
        return;
      }
      this.stop();
      let file = "";
      for (let i = 0; i < SONGS.length; i++) {
        if (SONGS[i].id === id) file = SONGS[i].file;
      }
      if (!file) return;
      const a = new Audio("assets/music/" + file);
      a.loop = true;
      a.volume = 0.5;
      this.audio = a;
      this.id = id;
      a.play().catch(function () {});
    },
    stop() {
      if (this.audio) {
        try {
          this.audio.pause();
          this.audio.removeAttribute("src");
          this.audio.load();
        } catch (e) {}
      }
      this.audio = null;
      this.id = "";
    },
  };

  const THEMES = [
    { name: "Ocean", top: "#040810", mid: "#0a1628", bottom: "#122a4a" },
    { name: "Violet", top: "#070514", mid: "#150b30", bottom: "#2a1652" },
    { name: "Ember", top: "#0d0406", mid: "#2a0a12", bottom: "#48121a" },
    { name: "Jungle", top: "#03100a", mid: "#0a2618", bottom: "#144228" },
    { name: "Glacier", top: "#04090d", mid: "#0a2230", bottom: "#10445c" },
    { name: "Sandstorm", top: "#0d0904", mid: "#241708", bottom: "#443010" },
    { name: "Void", top: "#000000", mid: "#060608", bottom: "#101016" },
    { name: "Candy", top: "#12061a", mid: "#33094a", bottom: "#5c1480" },
  ];

  function isValidHex(v) {
    return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  }

  function sanitizeTheme(raw) {
    const t = raw && typeof raw === "object" ? raw : {};
    return {
      top: isValidHex(t.top) ? t.top.toLowerCase() : DEFAULT_THEME.top,
      mid: isValidHex(t.mid) ? t.mid.toLowerCase() : DEFAULT_THEME.mid,
      bottom: isValidHex(t.bottom) ? t.bottom.toLowerCase() : DEFAULT_THEME.bottom,
    };
  }

  function hexToRgba(hex, alpha) {
    const h = isValidHex(hex) ? hex : DEFAULT_THEME.mid;
    return (
      "rgba(" +
      parseInt(h.slice(1, 3), 16) +
      "," +
      parseInt(h.slice(3, 5), 16) +
      "," +
      parseInt(h.slice(5, 7), 16) +
      "," +
      alpha +
      ")"
    );
  }

  function sanitizeText(raw) {
    if (!raw || typeof raw.text !== "string") return null;
    const text = raw.text.replace(/\s+/g, " ").trim().slice(0, 64);
    if (!text) return null;
    let color = String(raw.color || "#ffffff").toLowerCase();
    if (TEXT_COLORS.indexOf(color) === -1) color = "#ffffff";
    return {
      id: String(raw.id || "tx" + Math.random().toString(36).slice(2, 9)),
      c: raw.c | 0,
      r: raw.r | 0,
      text: text,
      color: color,
      scale: clamp(raw.scale | 0, 1, 3),
    };
  }

  const measureCtx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

  function labelFont(scale) {
    return "700 " + 11 * (scale || 1) + "px Trebuchet MS, Segoe UI, sans-serif";
  }

  function labelBounds(label) {
    const px = 11 * (label.scale || 1);
    let w = px * Math.max(1, (label.text || "").length) * 0.62;
    if (measureCtx) {
      measureCtx.font = labelFont(label.scale);
      w = measureCtx.measureText(label.text || "").width;
    }
    const cx = label.c * TILE + TILE / 2;
    const cy = label.r * TILE + TILE / 2;
    const pad = 8;
    return { x: cx - w / 2 - pad, y: cy - px / 2 - pad, w: w + pad * 2, h: px + pad * 2 };
  }

  function labelHitsCell(label, c, r) {
    const b = labelBounds(label);
    const x0 = c * TILE;
    const y0 = r * TILE;
    return x0 < b.x + b.w && x0 + TILE > b.x && y0 < b.y + b.h && y0 + TILE > b.y;
  }

  function drawLevelText(ctx, label, opts) {
    opts = opts || {};
    const x = label.c * TILE + TILE / 2;
    const y = label.r * TILE + TILE / 2;
    const px = 11 * (label.scale || 1);
    ctx.save();
    ctx.font = labelFont(label.scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, px / 5);
    ctx.strokeStyle = "rgba(7, 16, 24, 0.8)";
    ctx.strokeText(label.text, x, y);
    ctx.fillStyle = label.color || "#ffffff";
    ctx.fillText(label.text, x, y);
    if (opts.showBounds) {
      const b = labelBounds(label);
      ctx.strokeStyle = opts.hot ? "rgba(255, 80, 100, 0.95)" : "rgba(255, 255, 255, 0.28)";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function sanitizeTriggers(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((t) => {
        if (!t || typeof t !== "object") return null;
        let areas = [];
        if (Array.isArray(t.areas)) {
          for (const a of t.areas.slice(0, 16)) {
            if (Array.isArray(a)) areas.push([a[0] | 0, a[1] | 0]);
          }
        }
        if (!areas.length) areas = [[t.tc | 0, t.tr | 0]];
        return {
          tc: t.tc | 0,
          tr: t.tr | 0,
          dx: Number(t.dx) || 0,
          dy: Number(t.dy) || 0,
          speed: clamp(Number(t.speed) || 3, 1, 20),
          areas: areas,
        };
      })
      .filter(Boolean);
  }

  class Level {
    constructor(opts) {
      opts = opts || {};
      this.name = opts.name || "Untitled";
      this.cols = opts.cols || 48;
      this.rows = opts.rows || 20;
      this.tileSize = TILE;
      this.spawn = opts.spawn || { c: 2, r: this.rows - 3 };
      this.gameplay = Object.assign({}, DEFAULT_GAMEPLAY, opts.gameplay || {});
      this.theme = sanitizeTheme(opts.theme);
      this.grid = opts.grid || emptyGrid(this.cols, this.rows);
      this.texts = Array.isArray(opts.texts) ? opts.texts.map(sanitizeText).filter(Boolean) : [];
      this.triggers = sanitizeTriggers(opts.triggers);
      this.song = sanitizeSong(opts.song);
      this.meta = Object.assign(
        {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          editor: "DashPoint Level Builder 0.1",
        },
        opts.meta || {}
      );
    }

    static createDefault(name) {
      const level = new Level({ name: name || "New Level", cols: 48, rows: 20 });
      for (let c = 0; c < level.cols; c++) {
        level.set(c, level.rows - 1, { id: "brick" });
        level.set(c, level.rows - 2, { id: "brick" });
      }
      level.spawn = { c: 3, r: level.rows - 3 };
      level.set(level.cols - 4, level.rows - 3, { id: "goal" });
      return level;
    }

    inBounds(c, r) {
      return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
    }

    get(c, r) {
      if (!this.inBounds(c, r)) return null;
      return this.grid[r][c];
    }

    set(c, r, tile) {
      if (!this.inBounds(c, r)) return false;
      this.grid[r][c] = tile ? { id: tile.id, rot: tile.rot || 0 } : null;
      return true;
    }

    forEachTile(fn) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const tile = this.grid[r][c];
          if (tile) fn(tile, c, r);
        }
      }
    }

    counts() {
      const out = { brick: 0, ibrick: 0, spike: 0, ispike: 0, goal: 0, orb: 0, pad: 0, dash: 0, empty: 0, labels: 0 };
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const t = this.grid[r][c];
          if (!t) out.empty++;
          else if (out[t.id] !== undefined) out[t.id]++;
        }
      }
      out.labels = this.texts.length;
      return out;
    }

    clone() {
      return Level.fromJSON(this.toJSON());
    }

    resize(pad, opts) {
      opts = opts || {};
      const left = pad.left || 0;
      const right = pad.right || 0;
      const top = pad.top || 0;
      const bottom = pad.bottom || 0;
      const oldCols = this.cols;
      const oldRows = this.rows;
      const newCols = clamp(oldCols + left + right, MIN_COLS, MAX_COLS);
      const newRows = clamp(oldRows + top + bottom, MIN_ROWS, MAX_ROWS);
      const actualLeft = Math.max(0, newCols - oldCols - Math.max(0, right));
      const actualRight = newCols - oldCols - actualLeft;
      const actualTop = Math.max(0, newRows - oldRows - Math.max(0, bottom));
      const actualBottom = newRows - oldRows - actualTop;
      const next = emptyGrid(newCols, newRows);
      for (let r = 0; r < oldRows; r++) {
        for (let c = 0; c < oldCols; c++) {
          const nc = c + (left > 0 ? actualLeft : left);
          const nr = r + (top > 0 ? actualTop : top);
          if (nc >= 0 && nr >= 0 && nc < newCols && nr < newRows) {
            next[nr][nc] = this.grid[r][c];
          }
        }
      }
      const shiftC = left > 0 ? actualLeft : Math.min(0, left);
      const shiftR = top > 0 ? actualTop : Math.min(0, top);
      if (opts.continueFloor) {
        if (actualRight > 0) {
          const srcC = oldCols - 1 + shiftC;
          for (let i = 0; i < actualRight; i++) {
            const dc = srcC + 1 + i;
            if (dc < 0 || dc >= newCols) continue;
            for (let r = 0; r < newRows; r++) {
              const src = srcC >= 0 && srcC < newCols ? next[r][srcC] : null;
              if (src && src.id === "brick") next[r][dc] = { id: "brick", rot: 0 };
            }
          }
        }
        if (actualLeft > 0) {
          const srcC = actualLeft;
          for (let c = 0; c < actualLeft; c++) {
            for (let r = 0; r < newRows; r++) {
              const src = srcC < newCols ? next[r][srcC] : null;
              if (src && src.id === "brick") next[r][c] = { id: "brick", rot: 0 };
            }
          }
        }
      }
      this.grid = next;
      this.cols = newCols;
      this.rows = newRows;
      this.spawn.c = clamp(this.spawn.c + shiftC, 0, this.cols - 1);
      this.spawn.r = clamp(this.spawn.r + shiftR, 0, this.rows - 1);
      this.texts.forEach((t) => {
        t.c += shiftC;
        t.r += shiftR;
      });
      this.texts = this.texts.filter((t) => this.inBounds(t.c, t.r));
      (this.triggers || []).forEach((t) => {
        t.tc += shiftC;
        t.tr += shiftR;
        t.areas = (t.areas || []).map((a) => [a[0] + shiftC, a[1] + shiftR]);
      });
      this.triggers = (this.triggers || []).filter((t) => this.inBounds(t.tc, t.tr));
      return {
        left: shiftC,
        right: actualRight,
        top: shiftR,
        bottom: actualBottom,
      };
    }

    toJSON() {
      const tiles = [];
      this.forEachTile((tile, c, r) => {
        const entry = { c, r, id: tile.id };
        if (TILE_TYPES[tile.id] && TILE_TYPES[tile.id].rotatable && tile.rot) entry.rot = tile.rot;
        tiles.push(entry);
      });
      return {
        format: FORMAT,
        version: VERSION,
        name: this.name,
        cols: this.cols,
        rows: this.rows,
        tileSize: TILE,
        spawn: { c: this.spawn.c, r: this.spawn.r },
        tiles,
        texts: this.texts.map((t) => ({
          id: t.id,
          c: t.c,
          r: t.r,
          text: t.text,
          color: t.color,
          scale: t.scale,
        })),
        gameplay: Object.assign({}, this.gameplay),
        triggers: JSON.parse(JSON.stringify(this.triggers)),
        song: this.song || "",
        theme: Object.assign({}, this.theme),
        meta: Object.assign({}, this.meta, { updatedAt: new Date().toISOString() }),
      };
    }

    static fromJSON(data) {
      if (!data || data.format !== FORMAT) {
        throw new Error("Not a DashPoint level file.");
      }
      if (data.version > VERSION) {
        throw new Error("Level was made with a newer editor (v" + data.version + ").");
      }
      const cols = clamp(data.cols | 0, MIN_COLS, MAX_COLS);
      const rows = clamp(data.rows | 0, MIN_ROWS, MAX_ROWS);
      const level = new Level({
        name: String(data.name || "Untitled").slice(0, 48),
        cols,
        rows,
        spawn: {
          c: clamp((data.spawn && data.spawn.c) | 0, 0, cols - 1),
          r: clamp((data.spawn && data.spawn.r) | 0, 0, rows - 1),
        },
        gameplay: data.gameplay,
        theme: data.theme,
        meta: data.meta,
        texts: Array.isArray(data.texts) ? data.texts : [],
        triggers: data.triggers,
        song: data.song,
      });
      const tiles = Array.isArray(data.tiles) ? data.tiles : [];
      for (const t of tiles) {
        if (!t || !TILE_TYPES[t.id]) continue;
        const c = t.c | 0;
        const r = t.r | 0;
        if (!level.inBounds(c, r)) continue;
        const rot = ((t.rot | 0) % 360 + 360) % 360;
        level.set(c, r, { id: t.id, rot: TILE_TYPES[t.id].rotatable ? rot : 0 });
      }
      return level;
    }

    static parse(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Invalid JSON.");
      }
      return Level.fromJSON(data);
    }
  }

  const PLAYER_W = 24;
  const PLAYER_H = 24;

  function solidBox(c, r) {
    return { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
  }

  function spikeBox(c, r, rot) {
    const x = c * TILE;
    const y = r * TILE;
    const m = 7;
    switch (rot) {
      case 90:
        return { x: x, y: y + m, w: TILE * 0.62, h: TILE - m * 2 };
      case 180:
        return { x: x + m, y: y, w: TILE - m * 2, h: TILE * 0.62 };
      case 270:
        return { x: x + TILE * 0.38, y: y + m, w: TILE * 0.62, h: TILE - m * 2 };
      default:
        return { x: x + m, y: y + TILE * 0.38, w: TILE - m * 2, h: TILE * 0.62 };
    }
  }

  function goalBox(c, r) {
    return { x: c * TILE + 5, y: r * TILE + 5, w: TILE - 10, h: TILE - 10 };
  }

  function orbBox(c, r) {
    const m = TILE * 0.14;
    return { x: c * TILE + m, y: r * TILE + m, w: TILE - m * 2, h: TILE - m * 2 };
  }

  function padBox(c, r) {
    return { x: c * TILE + 2, y: r * TILE + TILE * 0.5, w: TILE - 4, h: TILE * 0.5 };
  }

  function dashBox(c, r) {
    const m = TILE * 0.18;
    return { x: c * TILE + m, y: r * TILE + m, w: TILE - m * 2, h: TILE - m * 2 };
  }

  function spawnWorldPos(level) {
    const c = level.spawn.c;
    const r = level.spawn.r;
    return {
      x: c * TILE + (TILE - PLAYER_W) / 2,
      y: r * TILE + TILE - PLAYER_H,
    };
  }

  class Engine {
    constructor(level, opts) {
      this.source = level;
      this.skin = clamp((opts && opts.skin) | 0, 1, Math.max(1, SKINS.length));
      this.touched = new Set();
      this.checkpoint = null;
      this.pendingJumps = 0;
      this.reset();
    }

    reset() {
      this.level = this.source.clone();
      let p;
      if (this.checkpoint) {
        p = {
          x: this.checkpoint.c * TILE + (TILE - PLAYER_W) / 2,
          y: this.checkpoint.r * TILE + TILE - PLAYER_H,
        };
      } else {
        p = spawnWorldPos(this.level);
      }
      this.player = {
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        w: PLAYER_W,
        h: PLAYER_H,
        onGround: false,
        jumping: false,
        facing: 1,
        rot: 0,
      };
      this.input = { left: false, right: false, jump: false, jumpPressed: false };
      this.wasJump = false;
      this.coyote = 0;
      this.buffer = 0;
      this.dead = false;
      this.won = false;
      this.deathReason = "";
      this.time = 0;
      this.deathTimer = 0;
      this.winTimer = 0;
      this.flash = 0;
      this.orbFlash = 0;
      this.padFlash = 0;
      this.dashFlash = 0;
      this.finished = false;
      this.movers = [];
      const triggers = this.level.triggers || [];
      for (const tg of triggers) {
        let ty = tg.tr;
        let tile = this.level.get(tg.tc, ty);
        let probe = 0;
        while (!tile && probe < 6 && ty < this.level.rows) {
          ty += 1;
          tile = this.level.get(tg.tc, ty);
          probe += 1;
        }
        if (!tile) continue;
        this.movers.push({
          tg: tg,
          tile: { id: tile.id, rot: tile.rot || 0 },
          ox: tg.tc * TILE,
          oy: ty * TILE,
          x: tg.tc * TILE,
          y: ty * TILE,
          cx: tg.tc,
          cy: ty,
          dist: Math.hypot(tg.dx * TILE, tg.dy * TILE),
          traveled: 0,
          started: false,
          done: false,
        });
        this.level.set(tg.tc, ty, null);
      }
    }

    clearCheckpoint() {
      this.checkpoint = null;
      this.touched = new Set();
    }

    setInput(next) {
      this.input.left = !!next.left;
      this.input.right = !!next.right;
      this.input.jump = !!next.jump;
    }

    playerBox() {
      const p = this.player;
      return { x: p.x, y: p.y, w: p.w, h: p.h };
    }

    nearbyTiles(x, y, w, h, pad) {
      pad = pad || 0;
      const c0 = Math.floor((x - pad) / TILE);
      const r0 = Math.floor((y - pad) / TILE);
      const c1 = Math.floor((x + w + pad - 0.001) / TILE);
      const r1 = Math.floor((y + h + pad - 0.001) / TILE);
      const out = [];
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const tile = this.level.get(c, r);
          if (tile) out.push({ tile, c, r });
        }
      }
      return out;
    }

    resolveAxis(axis) {
      const p = this.player;
      const box = this.playerBox();
      const solids = [];
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 0);
      for (const { tile, c, r } of hits) {
        const type = TILE_TYPES[tile.id];
        if (!type || !type.solid) continue;
        solids.push(solidBox(c, r));
      }
      for (const m of this.movers || []) {
        if (m.done) continue;
        const type = TILE_TYPES[m.tile.id];
        if (!type || !type.solid) continue;
        solids.push({ x: m.x, y: m.y, w: TILE, h: TILE });
      }
      for (const s of solids) {
        if (!aabbOverlap(box, s)) continue;
        if (axis === "x") {
          if (p.vx > 0) p.x = s.x - p.w;
          else if (p.vx < 0) p.x = s.x + s.w;
          else {
            const dl = box.x + box.w - s.x;
            const dr = s.x + s.w - box.x;
            p.x = dl < dr ? s.x - p.w : s.x + s.w;
          }
          p.vx = 0;
          box.x = p.x;
        } else {
          if (p.vy > 0) {
            p.y = s.y - p.h;
            p.onGround = true;
          } else if (p.vy < 0) {
            p.y = s.y + s.h;
          } else {
            const dt = box.y + box.h - s.y;
            const db = s.y + s.h - box.y;
            if (dt < db) {
              p.y = s.y - p.h;
              p.onGround = true;
            } else {
              p.y = s.y + s.h;
            }
          }
          p.vy = 0;
          box.y = p.y;
        }
      }
    }

    updateMovers(dt) {
      if (!this.movers || !this.movers.length || this.dead || this.won) return;
      const p = this.player;
      const pcx = Math.floor((p.x + p.w / 2) / TILE);
      const pcy = Math.floor((p.y + p.h / 2) / TILE);
      const pfy = Math.floor((p.y + p.h + 4) / TILE);
      for (const m of this.movers) {
        if (m.started || m.done) continue;
        for (const a of m.tg.areas) {
          if ((a[0] === pcx && a[1] === pcy) || (a[0] === pcx && a[1] === pfy)) {
            m.started = true;
            break;
          }
        }
      }
      for (const m of this.movers) {
        if (!m.started || m.done) continue;
        m.traveled += dt * m.tg.speed * 120;
        const k = m.dist > 0 ? Math.min(1, m.traveled / m.dist) : 1;
        let nx = m.ox + m.tg.dx * TILE * k;
        let ny = m.oy + m.tg.dy * TILE * k;
        const nc = Math.floor((nx + TILE / 2) / TILE);
        const nr = Math.floor((ny + TILE / 2) / TILE);
        if (nc !== m.cx || nr !== m.cy) {
          if (!this.level.inBounds(nc, nr) || this.level.get(nc, nr)) {
            m.done = true;
            nx = m.cx * TILE;
            ny = m.cy * TILE;
            this.level.set(m.cx, m.cy, m.tile);
          } else {
            m.cx = nc;
            m.cy = nr;
          }
        }
        if (k >= 1 && !m.done) {
          m.done = true;
          this.level.set(m.cx, m.cy, m.tile);
          nx = m.cx * TILE;
          ny = m.cy * TILE;
        }
        const dx = nx - m.x;
        const dy = ny - m.y;
        const type = TILE_TYPES[m.tile.id];
        if (type && type.solid && (dx || dy)) {
          const prevPlat = { x: m.x, y: m.y - 6, w: TILE, h: TILE + 6 };
          if (aabbOverlap({ x: p.x, y: p.y, w: p.w, h: p.h }, prevPlat)) {
            p.x += dx;
            p.y += dy;
          }
        }
        m.x = nx;
        m.y = ny;
      }
    }

    checkTriggers() {
      const box = this.playerBox();
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 4);
      for (const { tile, c, r } of hits) {
        if (isSpikeId(tile.id)) {
          if (aabbOverlap(box, spikeBox(c, r, tile.rot || 0))) {
            this.kill("spike");
            return;
          }
        } else if (tile.id === "goal") {
          if (aabbOverlap(box, goalBox(c, r))) {
            this.win();
            return;
          }
        }
      }
      for (const m of this.movers || []) {
        if (m.done) continue;
        if (isSpikeId(m.tile.id)) {
          if (aabbOverlap(box, spikeBox(m.x / TILE, m.y / TILE, m.tile.rot || 0))) {
            this.kill("spike");
            return;
          }
        } else if (m.tile.id === "goal") {
          if (aabbOverlap(box, goalBox(m.x / TILE, m.y / TILE))) {
            this.win();
            return;
          }
        }
      }
      if (this.player.y > this.level.rows * TILE + 8) this.kill("fall");
      if (this.player.x + this.player.w < -8 || this.player.x > this.level.cols * TILE + 8) {
        this.kill("fall");
      }
    }

    checkCheckpoints() {
      if (this.dead || this.won) return;
      const box = this.playerBox();
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 2);
      for (const { tile, c, r } of hits) {
        if (tile.id === "checkpoint") {
          const key = c + "," + r;
          const cpBox = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
          if (aabbOverlap(box, cpBox)) {
            if (!this.touched.has(key)) {
              this.touched.add(key);
              this.checkpoint = { c: c, r: r };
            }
          }
        }
      }
    }

    checkOrbs() {
      const p = this.player;
      const box = this.playerBox();
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 2);
      const orbs = hits.filter(({ tile }) => tile.id === "orb").map(({ c, r }) => orbBox(c, r));
      for (const m of this.movers || []) {
        if (!m.done && m.tile.id === "orb") orbs.push(orbBox(m.x / TILE, m.y / TILE));
      }
      for (const b of orbs) {
        if (!aabbOverlap(box, b)) continue;
        this.orbTouch = 0.12;
        if (this.buffer > 0 && !this.dead && !this.won) {
          const g = this.level.gameplay;
          p.vy = -g.jumpForce * 1.15;
          p.jumping = true;
          p.onGround = false;
          this.buffer = 0;
          this.coyote = 0;
          this.orbFlash = 0.22;
        }
        return;
      }
    }

    checkPads() {
      const p = this.player;
      const box = this.playerBox();
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 2);
      const pads = hits.filter(({ tile }) => tile.id === "pad").map(({ c, r }) => padBox(c, r));
      for (const m of this.movers || []) {
        if (!m.done && m.tile.id === "pad") pads.push(padBox(m.x / TILE, m.y / TILE));
      }
      for (const b of pads) {
        if (!aabbOverlap(box, b)) continue;
        if (this.padFlash > 0 || this.dead || this.won) return;
        const g = this.level.gameplay;
        p.vy = -g.jumpForce * 1.45;
        p.vy = Math.max(p.vy, -g.maxFall * 1.6);
        p.jumping = true;
        p.onGround = false;
        this.buffer = 0;
        this.coyote = 0;
        this.padFlash = 0.25;
        return;
      }
    }

    checkDashes() {
      const p = this.player;
      const box = this.playerBox();
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 2);
      const dashes = hits.filter(({ tile }) => tile.id === "dash").map(({ c, r }) => dashBox(c, r));
      for (const m of this.movers || []) {
        if (!m.done && m.tile.id === "dash") dashes.push(dashBox(m.x / TILE, m.y / TILE));
      }
      for (const b of dashes) {
        if (!aabbOverlap(box, b)) continue;
        if (this.dashFlash > 0 || this.dead || this.won) return;
        const g = this.level.gameplay;
        let dir = 0;
        if (this.input.left) dir -= 1;
        if (this.input.right) dir += 1;
        if (dir === 0) dir = p.facing || 1;
        p.vx = dir * g.moveSpeed * 2.3;
        p.vy *= 0.3;
        p.facing = dir;
        this.dashFlash = 0.35;
        return;
      }
    }

    kill(reason) {
      if (this.dead || this.won) return;
      this.dead = true;
      this.deathReason = reason || "spike";
      this.deathTimer = 0;
      this.flash = 0.35;
      this.player.vx = 0;
      this.player.vy = 0;
    }

    win() {
      if (this.dead || this.won) return;
      this.won = true;
      this.winTimer = 0;
      this.player.vx = 0;
    }

    update(dt) {
      dt = clamp(dt, 0, 1 / 20);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
      if (this.orbFlash > 0) this.orbFlash = Math.max(0, this.orbFlash - dt);
      if (this.padFlash > 0) this.padFlash = Math.max(0, this.padFlash - dt);
      if (this.dashFlash > 0) this.dashFlash = Math.max(0, this.dashFlash - dt);

      if (this.dead) {
        this.deathTimer += dt;
        return;
      }
      if (this.won) {
        this.winTimer += dt;
        this.player.vy = Math.max(-40, this.player.vy - 400 * dt);
        this.player.y += this.player.vy * dt;
        this.player.rot += 280 * dt;
        return;
      }

      this.time += dt;
      const g = this.level.gameplay;
      const p = this.player;
      const jumpDown = this.input.jump;
      const jumpPressed = jumpDown && !this.wasJump;
      this.wasJump = jumpDown;

      if (jumpPressed) this.buffer = g.bufferMs / 1000;
      else this.buffer = Math.max(0, this.buffer - dt);

      let wish = 0;
      if (this.input.left) wish -= 1;
      if (this.input.right) wish += 1;
      if (wish !== 0) p.facing = wish;

      const accel = p.onGround ? g.accel : g.airAccel;
      if (this.dashFlash > 0.12) {
        if (wish !== 0) p.facing = wish;
      } else if (wish !== 0) {
        p.vx += wish * accel * dt;
        p.vx = clamp(p.vx, -g.moveSpeed, g.moveSpeed);
      } else if (p.onGround) {
        const mag = Math.abs(p.vx);
        const next = mag - g.friction * dt;
        p.vx = next <= 0 ? 0 : Math.sign(p.vx) * next;
      } else {
        p.vx *= 1 - Math.min(1, 1.6 * dt);
      }

      p.vy += g.gravity * dt;
      if (p.vy > g.maxFall) p.vy = g.maxFall;

      if (p.onGround) this.coyote = g.coyoteMs / 1000;
      else this.coyote = Math.max(0, this.coyote - dt);

      if (this.buffer > 0 && this.coyote > 0) {
        p.vy = -g.jumpForce;
        p.onGround = false;
        this.coyote = 0;
        this.buffer = 0;
        p.jumping = true;
        this.pendingJumps = (this.pendingJumps || 0) + 1;
      }

      if (p.jumping && !jumpDown && p.vy < 0) {
        p.vy *= g.jumpCut;
        p.jumping = false;
      }
      if (p.vy >= 0) p.jumping = false;

      p.onGround = false;
      p.x += p.vx * dt;
      this.resolveAxis("x");
      p.y += p.vy * dt;
      this.resolveAxis("y");

      if (p.x < 0) {
        p.x = 0;
        p.vx = 0;
      }
      if (p.x + p.w > this.level.cols * TILE) {
        p.x = this.level.cols * TILE - p.w;
        p.vx = 0;
      }
      if (p.y < -TILE * 4) {
        p.y = -TILE * 4;
        p.vy = 0;
      }

      p.rot += (p.vx / TILE) * 90 * dt;
      if (!p.onGround) p.rot += p.facing * 220 * dt;

      this.checkOrbs();
      this.checkPads();
      this.checkDashes();
      this.checkCheckpoints();
      this.updateMovers(dt);
      this.checkTriggers();
    }
  }

  function drawTile(ctx, images, tile, x, y, size, opts) {
    size = size || TILE;
    opts = opts || {};
    if (isInvisibleId(tile.id) && opts.hideInvisible) return;
    let img;
    if (tile.id === "checkpoint") {
      const touched = opts.touched && opts.c != null && opts.touched.has(opts.c + "," + opts.r);
      img = touched ? images.checkpointTouched : images.checkpoint;
    } else {
      img =
        isBrickId(tile.id)
          ? images.brick
          : isSpikeId(tile.id)
            ? images.spike
            : tile.id === "orb"
              ? images.orb
              : tile.id === "pad"
                ? images.pad
                : tile.id === "dash"
                  ? images.dash
                  : images.goal;
    }
    if (!img) return;
    const rot = isSpikeId(tile.id) ? tile.rot || 0 : 0;
    ctx.save();
    if (isInvisibleId(tile.id)) ctx.globalAlpha *= 0.4;
    if (rot) {
      ctx.translate(x + size / 2, y + size / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.drawImage(img, x, y, size, size);
    }
    ctx.restore();
    if (isInvisibleId(tile.id) && !opts.hideInvisible) {
      ctx.save();
      ctx.strokeStyle = "rgba(176, 92, 255, 0.95)";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = Math.max(1, size / 16);
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(220, 180, 255, 0.95)";
      ctx.font = "bold " + Math.max(7, size * 0.22) + "px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("INV", x + size / 2, y + size - 3);
      ctx.textAlign = "start";
      ctx.restore();
    }
  }

  function drawBackdrop(ctx, w, h, t, theme) {
    const th = theme || DEFAULT_THEME;
    const g = ctx.createLinearGradient(0, 0, w * 0.2, h);
    const sway = Math.sin(t * 0.1);
    g.addColorStop(0, th.top);
    g.addColorStop(clamp(0.45 + sway * 0.07, 0.25, 0.75), th.mid);
    g.addColorStop(1, th.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const glows = [
      { x: 0.24 + 0.12 * Math.sin(t * 0.05), y: 0.28 + 0.14 * Math.cos(t * 0.038), r: 0.62, c: hexToRgba(th.mid, 0.1) },
      { x: 0.78 + 0.1 * Math.cos(t * 0.033), y: 0.74 + 0.12 * Math.sin(t * 0.043), r: 0.55, c: hexToRgba(th.bottom, 0.08) },
      { x: 0.5 + 0.16 * Math.sin(t * 0.026 + 2.1), y: 0.5 + 0.2 * Math.sin(t * 0.031 + 0.7), r: 0.48, c: hexToRgba(th.mid, 0.06) },
    ];
    const R = Math.max(w, h);
    for (const gl of glows) {
      const rg = ctx.createRadialGradient(gl.x * w, gl.y * h, 0, gl.x * w, gl.y * h, gl.r * R);
      rg.addColorStop(0, gl.c);
      rg.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawWorld(ctx, level, images, cam, extras) {
    extras = extras || {};
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const zoom = cam.zoom;
    const worldW = level.cols * TILE;
    const worldH = level.rows * TILE;

    ctx.imageSmoothingEnabled = false;
    drawBackdrop(ctx, w, h, Date.now() / 1000, level.theme);

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);

    ctx.fillStyle = "rgba(255, 42, 60, 0.16)";
    ctx.fillRect(-6, worldH, worldW + 12, 10);

    const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const c1 = Math.min(level.cols - 1, Math.ceil((cam.x + w / zoom) / TILE) + 1);
    const r1 = Math.min(level.rows - 1, Math.ceil((cam.y + h / zoom) / TILE) + 1);

    const moverCells = {};
    if (extras.engine && extras.engine.movers) {
      for (const m of extras.engine.movers) {
        if (!m.done) moverCells[m.cx + "," + m.cy] = true;
      }
    }

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const tile = level.grid[r][c];
        if (tile) {
          if (extras.engine && moverCells[c + "," + r]) continue;
          drawTile(ctx, images, tile, c * TILE, r * TILE, TILE, {
            hideInvisible: !!extras.engine && !extras.hitboxes,
            c: c,
            r: r,
            touched: extras.engine ? extras.engine.touched : null,
          });
        }
      }
    }

    const movers = extras.engine && extras.engine.movers;
    if (movers && movers.length) {
      for (const m of movers) {
        if (m.done) continue;
        drawTile(ctx, images, m.tile, m.x, m.y, TILE, {
          hideInvisible: !!extras.engine && !extras.hitboxes,
        });
      }
    }

    const labels = level.texts || [];
    const hover = extras.hover;
    for (let i = 0; i < labels.length; i++) {
      const hot = !extras.engine && hover && labelHitsCell(labels[i], hover.c, hover.r);
      drawLevelText(ctx, labels[i], { showBounds: !extras.engine, hot: hot });
    }
    if (extras.ghostText && extras.ghostText.text) {
      ctx.globalAlpha = 0.55;
      drawLevelText(ctx, extras.ghostText, {});
      ctx.globalAlpha = 1;
    }

    if (extras.showGrid) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(180, 220, 255, 0.12)";
      ctx.lineWidth = 1 / zoom;
      const gc0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
      const gr0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
      const gc1 = Math.min(level.cols, Math.ceil((cam.x + w / zoom) / TILE) + 1);
      const gr1 = Math.min(level.rows, Math.ceil((cam.y + h / zoom) / TILE) + 1);
      for (let c = gc0; c <= gc1; c++) {
        ctx.moveTo(c * TILE, 0);
        ctx.lineTo(c * TILE, worldH);
      }
      for (let r = gr0; r <= gr1; r++) {
        ctx.moveTo(0, r * TILE);
        ctx.lineTo(worldW, r * TILE);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(46, 230, 255, 0.45)";
      ctx.strokeRect(0.5 / zoom, 0.5 / zoom, worldW, worldH);
    }

    if (extras.hover && extras.showHover) {
      const hc = extras.hover.c;
      const hr = extras.hover.r;
      ctx.fillStyle = "rgba(46, 230, 255, 0.12)";
      ctx.fillRect(hc * TILE, hr * TILE, TILE, TILE);
      ctx.strokeStyle = "rgba(46, 230, 255, 0.85)";
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(hc * TILE + 0.5 / zoom, hr * TILE + 0.5 / zoom, TILE, TILE);
    }

    if (extras.ghostTiles && extras.ghostTiles.length) {
      ctx.globalAlpha = 0.55;
      for (const g of extras.ghostTiles) {
        if (g.id === "erase") {
          ctx.fillStyle = "rgba(255, 50, 70, 0.35)";
          ctx.fillRect(g.c * TILE, g.r * TILE, TILE, TILE);
        } else {
          drawTile(ctx, images, g, g.c * TILE, g.r * TILE, TILE);
        }
      }
      ctx.globalAlpha = 1;
    }

    if (extras.selection) {
      const s = extras.selection;
      const x = Math.min(s.c0, s.c1) * TILE;
      const y = Math.min(s.r0, s.r1) * TILE;
      const sw = (Math.abs(s.c1 - s.c0) + 1) * TILE;
      const sh = (Math.abs(s.r1 - s.r0) + 1) * TILE;
      ctx.fillStyle = "rgba(255, 210, 60, 0.12)";
      ctx.fillRect(x, y, sw, sh);
      ctx.strokeStyle = "rgba(255, 210, 60, 0.9)";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.strokeRect(x, y, sw, sh);
      ctx.setLineDash([]);
    }

    if (extras.showSpawn !== false) {
      const sp = level.spawn;
      ctx.strokeStyle = "rgba(46, 230, 255, 0.95)";
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(sp.c * TILE + 3, sp.r * TILE + 3, TILE - 6, TILE - 6);
      const skinImg = images.skins && images.skins[extras.skin || 1];
      if (skinImg && !extras.engine) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(skinImg, sp.c * TILE, sp.r * TILE, TILE, TILE);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "rgba(46, 230, 255, 0.95)";
      ctx.font = Math.max(8, 11 / zoom) + "px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("SPAWN", sp.c * TILE + TILE / 2, sp.r * TILE - 5);
      ctx.textAlign = "start";
    }

    if (extras.hitboxes) {
      ctx.lineWidth = 1 / zoom;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const tile = level.grid[r][c];
          if (!tile) continue;
          if (isSpikeId(tile.id)) {
            const b = spikeBox(c, r, tile.rot || 0);
            ctx.strokeStyle = tile.id === "ispike" ? "rgba(176,92,255,0.95)" : "rgba(255,60,80,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (tile.id === "goal") {
            const b = goalBox(c, r);
            ctx.strokeStyle = "rgba(255,210,60,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (tile.id === "orb") {
            const b = orbBox(c, r);
            ctx.strokeStyle = "rgba(62,224,122,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (tile.id === "pad") {
            const b = padBox(c, r);
            ctx.strokeStyle = "rgba(255,157,46,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (tile.id === "dash") {
            const b = dashBox(c, r);
            ctx.strokeStyle = "rgba(46,230,255,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (isBrickId(tile.id)) {
            ctx.strokeStyle = tile.id === "ibrick" ? "rgba(176,92,255,0.7)" : "rgba(80,180,255,0.35)";
            ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
          }
        }
      }
    }

    if (extras.remoteCubes && extras.remoteCubes.length) {
      for (const rc of extras.remoteCubes) {
        const rSkinId = clamp((rc.skin | 0) || 1, 1, Math.max(1, SKINS.length));
        const rSkinImg = images.skins && images.skins[rSkinId];
        const rdx = Math.round(rc.x + PLAYER_W / 2 - TILE / 2);
        const rdy = Math.round(rc.y + PLAYER_H - TILE);
        ctx.save();
        if (rc.dead) ctx.globalAlpha = 0.45;
        if (rSkinImg) {
          ctx.translate(rdx + TILE / 2, rdy + TILE / 2);
          ctx.rotate(((rc.rot || 0) * Math.PI) / 180);
          ctx.drawImage(rSkinImg, -TILE / 2, -TILE / 2, TILE, TILE);
        } else {
          ctx.fillStyle = "#ffd23c";
          ctx.fillRect(rc.x, rc.y, PLAYER_W, PLAYER_H);
        }
        ctx.restore();
        if (rc.name) {
          ctx.save();
          ctx.font = Math.max(8, 11 / zoom) + "px Consolas, monospace";
          ctx.textAlign = "center";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(2, 3 / zoom);
          ctx.strokeStyle = "rgba(7, 16, 24, 0.85)";
          ctx.strokeText(rc.name, rdx + TILE / 2, rdy - 6);
          ctx.fillStyle = rc.dead ? "#7f93b0" : "#ffd23c";
          ctx.fillText(rc.name, rdx + TILE / 2, rdy - 6);
          ctx.textAlign = "start";
          ctx.restore();
        }
      }
    }

    const engine = extras.engine;
    if (engine) {
      const p = engine.player;
      const skinId = clamp((engine.skin | 0) || (extras.skin | 0) || 1, 1, Math.max(1, SKINS.length));
      const skinImg = images.skins && images.skins[skinId];
      const dx = Math.round(p.x + p.w / 2 - TILE / 2);
      const dy = Math.round(p.y + p.h - TILE);
      if (skinImg) {
        ctx.save();
        ctx.translate(dx + TILE / 2, dy + TILE / 2);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.drawImage(skinImg, -TILE / 2, -TILE / 2, TILE, TILE);
        ctx.restore();
      } else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
      if (extras.hitboxes) {
        ctx.strokeStyle = "#2ee6ff";
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
      if (engine.flash > 0) {
        ctx.fillStyle = "rgba(255, 30, 50, " + engine.flash * 0.55 + ")";
        ctx.fillRect(cam.x, cam.y, w / zoom, h / zoom);
      }
      if (engine.orbFlash > 0) {
        const t = 1 - engine.orbFlash / 0.22;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = "#3ee07a";
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, TILE * (0.5 + t * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (engine.padFlash > 0) {
        const t = 1 - engine.padFlash / 0.25;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = "#ff9d2e";
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, TILE * (0.5 + t * 1.1), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (engine.dashFlash > 0) {
        const t = 1 - engine.dashFlash / 0.35;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = "#2ee6ff";
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, TILE * (0.5 + t * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(46, 230, 255, 0.6)";
        ctx.lineWidth = 2 / zoom;
        for (let i = -1; i <= 1; i++) {
          const ly = p.y + p.h / 2 + i * TILE * 0.22;
          const len = TILE * (0.6 + t * 0.7);
          ctx.beginPath();
          ctx.moveTo(p.x + p.w / 2 - Math.sign(p.vx || 1) * len, ly);
          ctx.lineTo(p.x + p.w / 2 - Math.sign(p.vx || 1) * (len * 0.4), ly);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function matchesBind(code, list) {
    return list && list.indexOf(code) !== -1;
  }

  global.DashPoint = {
    TILE,
    FORMAT,
    VERSION,
    MIN_COLS,
    MAX_COLS,
    MIN_ROWS,
    MAX_ROWS,
    TILE_TYPES,
    isSpikeId,
    isBrickId,
    isInvisibleId,
    TEXT_COLORS,
    DEFAULT_THEME,
    THEMES,
    sanitizeTheme,
    hexToRgba,
    sanitizeText,
    labelBounds,
    labelHitsCell,
    SKINS,
    SONGS,
    Music,
    DEFAULT_GAMEPLAY,
    DEFAULT_KEYBINDS,
    ASSET_PATHS,
    clamp,
    aabbOverlap,
    loadAssets,
    Level,
    Engine,
    drawWorld,
    drawTile,
    spikeBox,
    goalBox,
    orbBox,
    padBox,
    dashBox,
    solidBox,
    PLAYER_W,
    PLAYER_H,
    matchesBind,
  };
})(window);
