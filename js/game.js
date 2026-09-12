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
  const MAX_OFF = 24;

  const TILE_TYPES = {
    brick: { id: "brick", solid: true, hazard: false, rotatable: false, label: "Brick" },
    ibrick: { id: "ibrick", solid: true, hazard: false, rotatable: false, hidden: true, label: "Invis block" },
    fbrick: { id: "fbrick", solid: false, hazard: false, rotatable: false, fake: true, label: "Fake brick" },
    spike: { id: "spike", solid: false, hazard: true, rotatable: true, label: "Spike" },
    ispike: { id: "ispike", solid: false, hazard: true, rotatable: true, hidden: true, label: "Invis spike" },
    fspike: { id: "fspike", solid: false, hazard: false, rotatable: true, fake: true, label: "Fake spike" },
    goal: { id: "goal", solid: false, hazard: false, rotatable: false, label: "Goal" },
    igoal: { id: "igoal", solid: false, hazard: false, rotatable: false, hidden: true, label: "Invis goal" },
    orb: { id: "orb", solid: false, hazard: false, rotatable: false, label: "Bounce orb" },
    iorb: { id: "iorb", solid: false, hazard: false, rotatable: false, hidden: true, label: "Invis orb" },
    pad: { id: "pad", solid: false, hazard: false, rotatable: false, label: "Bounce pad" },
    dash: { id: "dash", solid: false, hazard: false, rotatable: false, label: "Dash" },
    checkpoint: { id: "checkpoint", solid: false, hazard: false, rotatable: false, label: "Checkpoint" },
    coin10: { id: "coin10", solid: false, hazard: false, rotatable: false, label: "Coin +10" },
    coin50: { id: "coin50", solid: false, hazard: false, rotatable: false, label: "Coin +50" },
    coin100: { id: "coin100", solid: false, hazard: false, rotatable: false, label: "Coin +100" },
    coin500: { id: "coin500", solid: false, hazard: false, rotatable: false, label: "Coin +500" },
  };

  const COIN_VALUES = { coin10: 10, coin50: 50, coin100: 100, coin500: 500 };

  function isSpikeId(id) {
    return id === "spike" || id === "ispike" || id === "fspike";
  }

  function isBrickId(id) {
    return id === "brick" || id === "ibrick" || id === "fbrick";
  }

  function isGoalId(id) {
    return id === "goal" || id === "igoal";
  }

  function isOrbId(id) {
    return id === "orb" || id === "iorb";
  }

  function isFakeId(id) {
    return id === "fspike" || id === "fbrick";
  }

  function isInvisibleId(id) {
    return id === "ispike" || id === "ibrick" || id === "iorb" || id === "igoal";
  }

  function isCoinId(id) {
    return !!COIN_VALUES[id];
  }

  function coinValue(id) {
    return COIN_VALUES[id] || 0;
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
    coin10: "assets/tiles/coin10.png",
    coin50: "assets/tiles/coin50.png",
    coin100: "assets/tiles/coin100.png",
    coin500: "assets/tiles/coin500.png",
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

  function tileOx(tile) {
    return tile ? clamp(tile.ox | 0, -MAX_OFF, MAX_OFF) : 0;
  }

  function tileOy(tile) {
    return tile ? clamp(tile.oy | 0, -MAX_OFF, MAX_OFF) : 0;
  }

  function packTile(tile) {
    if (!tile) return null;
    const t = { id: tile.id, rot: tile.rot || 0 };
    const ox = tileOx(tile);
    const oy = tileOy(tile);
    if (ox) t.ox = ox;
    if (oy) t.oy = oy;
    return t;
  }

  function cellX(c, tile) {
    return c * TILE + tileOx(tile);
  }

  function cellY(r, tile) {
    return r * TILE + tileOy(tile);
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
    ["coin10", "coin50", "coin100", "coin500"].forEach(function (k) {
      if (images[k]) images[k] = knockOutBlack(images[k]);
    });
    return images;
  }

  function knockOutBlack(img) {
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      if (!c.width || !c.height) return img;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      x.drawImage(img, 0, 0);
      const data = x.getImageData(0, 0, c.width, c.height);
      const p = data.data;
      for (let i = 0; i < p.length; i += 4) {
        if (p[i] < 22 && p[i + 1] < 22 && p[i + 2] < 22) p[i + 3] = 0;
      }
      x.putImageData(data, 0, 0);
      return c;
    } catch (e) {
      return img;
    }
  }

  function drawCoinGraphic(ctx, images, tile, x, y, size, bob) {
    const img = images && images[tile.id];
    const dy = y + (bob || 0);
    if (img) {
      ctx.drawImage(img, x, dy, size, size);
      return;
    }
    const cx = x + size / 2;
    const cy = dy + size / 2;
    ctx.save();
    ctx.fillStyle = "rgba(255, 210, 60, 0.28)";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd23c";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a00";
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();
    ctx.fillStyle = "#12203a";
    ctx.font = "bold " + Math.max(8, size * 0.34) + "px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(coinValue(tile.id)), cx, cy + 0.5);
    ctx.restore();
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

  const MAX_PICTURES = 8;
  const PIC_MIN = 16;
  const PIC_MAX_DIM = 4096;
  const PIC_MAX_SRC = 1000000;
  const pictureImgs = {};

  function asList(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      return Object.keys(v).map(function (k) { return v[k]; }).filter(Boolean);
    }
    return [];
  }

  function sanitizePicture(raw) {
    if (!raw || typeof raw !== "object") return null;
    let src = String(raw.src || "").replace(/\s+/g, "");
    if (!src && raw.data) {
      src = "data:" + (raw.mime || "image/jpeg") + ";base64," + String(raw.data).replace(/\s+/g, "");
    }
    if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(src)) return null;
    if (src.length > PIC_MAX_SRC) return null;
    const w = clamp(Number(raw.w) || 0, PIC_MIN, PIC_MAX_DIM);
    const h = clamp(Number(raw.h) || 0, PIC_MIN, PIC_MAX_DIM);
    const x = Number(raw.x);
    const y = Number(raw.y);
    if (!isFinite(x) || !isFinite(y)) return null;
    return {
      id: String(raw.id || "im" + Math.random().toString(36).slice(2, 9)),
      src: src,
      x: x,
      y: y,
      w: w,
      h: h,
    };
  }

  function pictureImage(pic) {
    if (!pic || !pic.src) return null;
    const key = pic.id || pic.src.slice(0, 64);
    let rec = pictureImgs[key];
    if (!rec || rec.src !== pic.src) {
      rec = { src: pic.src, img: new Image() };
      rec.img.src = pic.src;
      pictureImgs[key] = rec;
    }
    return rec.img;
  }

  function pictureHandles(pic) {
    return [
      { id: "nw", x: pic.x, y: pic.y },
      { id: "n", x: pic.x + pic.w / 2, y: pic.y },
      { id: "ne", x: pic.x + pic.w, y: pic.y },
      { id: "e", x: pic.x + pic.w, y: pic.y + pic.h / 2 },
      { id: "se", x: pic.x + pic.w, y: pic.y + pic.h },
      { id: "s", x: pic.x + pic.w / 2, y: pic.y + pic.h },
      { id: "sw", x: pic.x, y: pic.y + pic.h },
      { id: "w", x: pic.x, y: pic.y + pic.h / 2 },
    ];
  }

  function pictureContains(pic, x, y) {
    return x >= pic.x && y >= pic.y && x <= pic.x + pic.w && y <= pic.y + pic.h;
  }

  function pictureHandleAt(pic, x, y, zoom) {
    const hit = 8 / Math.max(0.5, zoom || 1);
    const hs = pictureHandles(pic);
    for (let i = 0; i < hs.length; i++) {
      if (Math.abs(x - hs[i].x) <= hit && Math.abs(y - hs[i].y) <= hit) return hs[i].id;
    }
    return null;
  }

  // ---- HTML widgets (rich-text/deco blocks) ----
  // layer 0 = behind tiles: rasterized into the canvas (static, truly behind).
  // layer 1 = in front: live DOM overlay (clickable links), synced via syncWidgetDom.
  const MAX_WIDGETS = 8;
  const WIDGET_MIN = 16;
  const WIDGET_MAX_DIM = 4096;
  const WIDGET_MAX_HTML = 20000;
  const widgetImgs = {};

  function sanitizeWidgetHtml(raw) {
    let html = String(raw == null ? "" : raw).slice(0, WIDGET_MAX_HTML);
    if (!html.trim()) return "";
    let doc = null;
    try {
      // Parse as a document so full-page pastes work too: fragments land in
      // body, full pages keep their body content, and <style> is rescued from
      // head. Content renders inside a shadow root, so kept styles apply to
      // the block only and can never leak onto the game page.
      doc = new DOMParser().parseFromString(html, "text/html");
    } catch (e) {
      return "";
    }
    if (!doc || !doc.body) return "";
    const root = doc.createElement("div");
    try {
      const headStyles = doc.head ? doc.head.querySelectorAll("style") : [];
      for (let i = 0; i < headStyles.length; i++) root.appendChild(headStyles[i]);
      while (doc.body.firstChild) root.appendChild(doc.body.firstChild);
    } catch (e) {
      return "";
    }
    const BAD = {
      SCRIPT: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1,
      FORM: 1, INPUT: 1, BUTTON: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1,
      CANVAS: 1, APPLET: 1, TRACK: 1,
      BASE: 1, FRAME: 1, FRAMESET: 1, NOFRAMES: 1, NOSCRIPT: 1, TEMPLATE: 1, SLOT: 1,
      TITLE: 1, NOEMBED: 1,
    };
    const nodes = [root];
    try {
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
      let n = null;
      while ((n = walker.nextNode())) nodes.push(n);
    } catch (e) {
      return "";
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const tag = String((node.tagName || "").toUpperCase());
      if (tag === "IFRAME") {
        // Video embeds: rebuild locked-down. https src only, no srcdoc, forced
        // sandbox (no top-navigation/popups/modals), safe feature allow-list.
        const src = String(node.getAttribute("src") || "").trim();
        if (!/^https:\/\/[^\s"'<>]+$/i.test(src) || src.length > 2000) {
          if (node.parentNode) node.parentNode.removeChild(node);
          continue;
        }
        const clean = doc.createElement("iframe");
        clean.setAttribute("src", src);
        clean.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
        clean.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; encrypted-media");
        clean.setAttribute("allowfullscreen", "");
        clean.setAttribute("loading", "lazy");
        const t = node.getAttribute("title");
        if (t && String(t).trim()) clean.setAttribute("title", String(t).slice(0, 120));
        clean.setAttribute("style", "width:100%;height:100%;border:0;");
        // Empty text child forces an explicit </iframe> close tag: a self-closed
        // "<iframe/>" would swallow following siblings when used as innerHTML.
        clean.appendChild(doc.createTextNode(""));
        if (node.parentNode) node.parentNode.replaceChild(clean, node);
        continue;
      }
      if (tag === "VIDEO" || tag === "AUDIO") {
        // Media files: rebuild with https sources only. No scripts can run
        // from these tags; playback is governed by browser autoplay policy.
        const clean = doc.createElement(tag.toLowerCase());
        let hasSrc = false;
        const src = String(node.getAttribute("src") || "").trim();
        if (/^https:\/\/[^\s"'<>]+$/i.test(src) && src.length <= 2000) {
          clean.setAttribute("src", src);
          hasSrc = true;
        }
        const parts = node.getElementsByTagName("source");
        for (let s = 0; s < parts.length; s++) {
          const psrc = String(parts[s].getAttribute("src") || "").trim();
          if (!/^https:\/\/[^\s"'<>]+$/i.test(psrc) || psrc.length > 2000) continue;
          const sc = doc.createElement("source");
          sc.setAttribute("src", psrc);
          const ptype = String(parts[s].getAttribute("type") || "").trim().slice(0, 64);
          if (/^[\w\-.]+\/[\w\-.+]+$/.test(ptype)) sc.setAttribute("type", ptype);
          sc.appendChild(doc.createTextNode(""));
          clean.appendChild(sc);
          hasSrc = true;
        }
        if (!hasSrc) {
          if (node.parentNode) node.parentNode.removeChild(node);
          continue;
        }
        clean.setAttribute("controls", "");
        clean.setAttribute("preload", "metadata");
        const flags = ["muted", "loop", "playsinline", "autoplay"];
        for (let f = 0; f < flags.length; f++) {
          if (node.hasAttribute(flags[f])) clean.setAttribute(flags[f], "");
        }
        const poster = String(node.getAttribute("poster") || "").trim();
        if (/^https:\/\/[^\s"'<>]+$/i.test(poster) && poster.length <= 2000) clean.setAttribute("poster", poster);
        clean.setAttribute("style", "width:100%;height:100%;background:#000;");
        clean.appendChild(doc.createTextNode(""));
        if (node.parentNode) node.parentNode.replaceChild(clean, node);
        continue;
      }
      if (tag === "SOURCE") {
        // Stray <source> outside a media tag is meaningless — drop it. (Loop
        // runs innermost-first, so sources still inside their original
        // <video>/<audio> are kept for the media rebuild below.)
        let p = node.parentNode;
        let inside = false;
        while (p && p !== root) {
          const pt = String((p.tagName || "").toUpperCase());
          if (pt === "VIDEO" || pt === "AUDIO") {
            inside = true;
            break;
          }
          p = p.parentNode;
        }
        if (!inside && node.parentNode) node.parentNode.removeChild(node);
        continue;
      }
      if (BAD[tag]) {
        if (node.parentNode) node.parentNode.removeChild(node);
        continue;
      }
      const attrs = node.attributes ? Array.prototype.slice.call(node.attributes) : [];
      for (let a = 0; a < attrs.length; a++) {
        const an = String(attrs[a].name || "").toLowerCase();
        const av = String(attrs[a].value || "");
        if (an.indexOf("on") === 0) node.removeAttribute(attrs[a].name);
        else if ((an === "href" || an === "src") && /^\s*javascript:/i.test(av)) node.removeAttribute(attrs[a].name);
      }
    }
    let out = "";
    try {
      // Fully stripped input (e.g. only a dropped iframe) leaves an empty
      // wrapper — reject it so callers can report "stripped to nothing".
      const innerText = String(root.textContent || "").trim();
      let anyEl = false;
      try {
        anyEl = !!root.querySelector("*");
      } catch (e) {}
      if (!innerText && !anyEl) return "";
      out = new XMLSerializer().serializeToString(root);
    } catch (e) {
      return "";
    }
    if (!out) return "";
    return out.slice(0, WIDGET_MAX_HTML * 3);
  }

  function sanitizeWidget(raw) {
    if (!raw || typeof raw !== "object") return null;
    const app = raw.app === true || raw.app === 1 ? 1 : 0;
    let html = "";
    if (app) {
      // Interactive widgets run inside a locked-down sandboxed frame
      // (sandbox="allow-scripts" only: opaque origin, no parent access, no
      // top navigation, no popups, no form posts, no dialogs), so the raw
      // source is kept as-is — the sandbox is the boundary, not the filter.
      html = String(raw.html == null ? "" : raw.html).slice(0, WIDGET_MAX_HTML);
      if (!html.trim()) return null;
    } else {
      html = sanitizeWidgetHtml(raw.html);
      if (!html) return null;
    }
    const w = clamp(Math.round(Number(raw.w) || 0), WIDGET_MIN, WIDGET_MAX_DIM);
    const h = clamp(Math.round(Number(raw.h) || 0), WIDGET_MIN, WIDGET_MAX_DIM);
    const x = Number(raw.x);
    const y = Number(raw.y);
    if (!isFinite(x) || !isFinite(y)) return null;
    return {
      id: String(raw.id || "ht" + Math.random().toString(36).slice(2, 9)),
      html: html,
      x: x,
      y: y,
      w: w,
      h: h,
      layer: Number(raw.layer) === 1 ? 1 : 0,
      app: app,
    };
  }

  function widgetHash(s) {
    let h2 = 5381;
    for (let i = 0; i < s.length; i++) h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) | 0;
    return (h2 >>> 0).toString(36);
  }

  function widgetSvg(wd) {
    const span = Math.max(wd.w, wd.h);
    const s = span > 1024 ? 1 : 2;
    const rw = Math.max(1, Math.round(wd.w * s));
    const rh = Math.max(1, Math.round(wd.h * s));
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + rw + '" height="' + rh + '" viewBox="0 0 ' + rw + " " + rh + '">' +
      '<foreignObject x="0" y="0" width="' + rw + '" height="' + rh + '">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0;width:' + wd.w + "px;height:" + wd.h + "px;overflow:hidden;transform:scale(" + s + ");transform-origin:top left;\">" +
      wd.html +
      "</div></foreignObject></svg>"
    );
  }

  function widgetImage(wd) {
    if (!wd || !wd.html) return null;
    const key = wd.id + "|" + wd.w + "x" + wd.h + "|" + widgetHash(wd.html);
    let rec = widgetImgs[wd.id];
    if (!rec || rec.key !== key) {
      rec = { key: key, img: new Image() };
      rec.img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(widgetSvg(wd));
      widgetImgs[wd.id] = rec;
    }
    return rec.img;
  }

  function drawWidgets(ctx, level, layer) {
    const list = level.widgets || [];
    if (!list.length) return;
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (let i = 0; i < list.length; i++) {
      const wd = list[i];
      if ((wd.layer | 0) !== layer) continue;
      const img = widgetImage(wd);
      if (img && img.naturalWidth) ctx.drawImage(img, wd.x, wd.y, wd.w, wd.h);
      else {
        ctx.fillStyle = "rgba(176, 92, 255, 0.18)";
        ctx.fillRect(wd.x, wd.y, wd.w, wd.h);
        ctx.strokeStyle = "rgba(176, 92, 255, 0.55)";
        ctx.strokeRect(wd.x, wd.y, wd.w, wd.h);
      }
    }
    ctx.imageSmoothingEnabled = prevSmooth;
  }

  function widgetDomKey(wd) {
    return wd.w + "x" + wd.h + "|" + (wd.app | 0) + "|" + widgetHash(wd.html);
  }

  // Live DOM overlay for front-layer (layer 1) widgets. Call every frame with
  // the overlay container and camera: keeps one div per widget, positioned and
  // scaled to world units, and removes stale ones. Content is re-sanitized
  // whenever it changes and renders inside a shadow root, so author <style>
  // applies to the block only. Only interactive content captures clicks, all
  // else passes through to the canvas/HUD below.
  function syncWidgetDom(box, widgets, cam) {
    if (!box || !box.children) return;
    if (!cam) {
      box.innerHTML = "";
      return;
    }
    const seen = {};
    const list = widgets || [];
    const zoom = cam.zoom || 1;
    for (let i = 0; i < list.length; i++) {
      const wd = list[i];
      if (!wd || (wd.layer | 0) !== 1) continue;
      seen[wd.id] = true;
      let el = null;
      const kids = box.children;
      for (let k = 0; k < kids.length; k++) {
        if (kids[k].dataset && kids[k].dataset.wid === wd.id) {
          el = kids[k];
          break;
        }
      }
      const key = widgetDomKey(wd);
      if (!el) {
        el = document.createElement("div");
        el.className = "dp-widget";
        el.dataset.wid = wd.id;
        box.appendChild(el);
      }
      if (el.dataset.wkey !== key) {
        el.dataset.wkey = key;
        el.innerHTML = "";
        if (el.shadowRoot) el.shadowRoot.innerHTML = "";
        if (wd.app) {
          // Interactive widget: full source (scripts included) inside a
          // sandboxed frame. sandbox="allow-scripts" alone means an opaque
          // origin with no parent access, no top navigation, no popups, no
          // form posts and no dialogs — it can only show and play things.
          const fr = document.createElement("iframe");
          fr.className = "app-frame";
          fr.setAttribute("sandbox", "allow-scripts");
          fr.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; encrypted-media");
          fr.setAttribute("allowfullscreen", "");
          fr.setAttribute("loading", "lazy");
          fr.setAttribute("style", "width:100%;height:100%;border:0;");
          fr.setAttribute("srcdoc", wd.html);
          el.appendChild(fr);
        } else {
          let host = el.shadowRoot;
          if (!host) {
            try {
              host = el.attachShadow({ mode: "open" });
            } catch (e) {
              host = null;
            }
          }
          if (!host) host = el;
          host.innerHTML = sanitizeWidgetHtml(wd.html);
          const links = host.querySelectorAll("a");
          for (let a = 0; a < links.length; a++) {
            links[a].target = "_blank";
            links[a].rel = "noopener noreferrer";
          }
        }
      }
      el.style.width = wd.w + "px";
      el.style.height = wd.h + "px";
      el.style.transform =
        "translate(" + ((wd.x - cam.x) * zoom) + "px," + ((wd.y - cam.y) * zoom) + "px) scale(" + zoom + ")";
    }
    for (let k = box.children.length - 1; k >= 0; k--) {
      const stale = box.children[k];
      if (!stale.dataset || !seen[stale.dataset.wid]) box.removeChild(stale);
    }
  }

  function drawPictures(ctx, level) {
    const list = level.pictures || [];
    if (!list.length) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const img = pictureImage(p);
      if (img && img.naturalWidth) ctx.drawImage(img, p.x, p.y, p.w, p.h);
      else {
        ctx.fillStyle = "rgba(46, 230, 255, 0.18)";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = "rgba(46, 230, 255, 0.55)";
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
    }
    ctx.imageSmoothingEnabled = false;
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
      this.pictures = asList(opts.pictures).map(sanitizePicture).filter(Boolean).slice(0, MAX_PICTURES);
      this.widgets = asList(opts.widgets).map(sanitizeWidget).filter(Boolean).slice(0, MAX_WIDGETS);
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
      this.grid[r][c] = packTile(tile);
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
      const out = { brick: 0, ibrick: 0, fbrick: 0, spike: 0, ispike: 0, fspike: 0, goal: 0, igoal: 0, orb: 0, iorb: 0, pad: 0, dash: 0, coin10: 0, coin50: 0, coin100: 0, coin500: 0, empty: 0, labels: 0, pictures: 0, widgets: 0 };
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const t = this.grid[r][c];
          if (!t) out.empty++;
          else if (out[t.id] !== undefined) out[t.id]++;
        }
      }
      out.labels = this.texts.length;
      out.pictures = this.pictures.length;
      out.widgets = (this.widgets || []).length;
      out.goals = (out.goal || 0) + (out.igoal || 0);
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
      (this.pictures || []).forEach((p) => {
        p.x += shiftC * TILE;
        p.y += shiftR * TILE;
      });
      (this.widgets || []).forEach((wd) => {
        wd.x += shiftC * TILE;
        wd.y += shiftR * TILE;
      });
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
        if (tile.ox) entry.ox = tile.ox;
        if (tile.oy) entry.oy = tile.oy;
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
          id: t.id || "tx" + Math.random().toString(36).slice(2, 9),
          c: t.c,
          r: t.r,
          text: t.text,
          color: t.color,
          scale: t.scale,
        })),
        pictures: (this.pictures || []).map((p) => ({
          id: p.id,
          src: p.src,
          x: p.x,
          y: p.y,
          w: p.w,
          h: p.h,
        })),
        widgets: (this.widgets || []).slice(0, MAX_WIDGETS).map((wd) => ({
          id: wd.id,
          html: wd.html,
          x: wd.x,
          y: wd.y,
          w: wd.w,
          h: wd.h,
          layer: wd.layer | 0,
          app: wd.app | 0,
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
        pictures: asList(data.pictures),
        widgets: asList(data.widgets),
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
        level.set(c, r, {
          id: t.id,
          rot: TILE_TYPES[t.id].rotatable ? rot : 0,
          ox: t.ox | 0,
          oy: t.oy | 0,
        });
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

  const TRAILS = {
    sparkle: { rate: 40, life: [0.3, 0.6], size: [2, 4], vx: [-20, 20], vy: [-30, -70], colors: ["#ffffff", "#ffd23c", "#fff3c2"], grav: 60, drag: 1.5 },
    bubbles: { rate: 22, life: [0.5, 1.0], size: [2, 5], vx: [-15, 15], vy: [-60, -110], colors: ["#2ee6ff", "#9beaff", "#ffffff"], grav: -40, drag: 1.2, ring: true },
    fire: { rate: 55, life: [0.25, 0.5], size: [3, 6], vx: [-25, 25], vy: [-40, -100], colors: ["#ff5a1a", "#ff9d2e", "#ffd23c"], grav: -120, drag: 1.8 },
    rainbow: { rate: 50, life: [0.35, 0.7], size: [2, 5], vx: [-30, 30], vy: [-20, -60], colors: ["#ffffff"], grav: 30, drag: 1.5, rainbow: true },
  };

  function solidBox(c, r, tile) {
    return { x: cellX(c, tile), y: cellY(r, tile), w: TILE, h: TILE };
  }

  function spikeBox(c, r, rot, tile) {
    const x = cellX(c, tile);
    const y = cellY(r, tile);
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

  function goalBox(c, r, tile) {
    return { x: cellX(c, tile) + 5, y: cellY(r, tile) + 5, w: TILE - 10, h: TILE - 10 };
  }

  function orbBox(c, r, tile) {
    const m = TILE * 0.14;
    return { x: cellX(c, tile) + m, y: cellY(r, tile) + m, w: TILE - m * 2, h: TILE - m * 2 };
  }

  function padBox(c, r, tile) {
    return { x: cellX(c, tile) + 2, y: cellY(r, tile) + TILE * 0.5, w: TILE - 4, h: TILE * 0.5 };
  }

  function dashBox(c, r, tile) {
    const m = TILE * 0.18;
    return { x: cellX(c, tile) + m, y: cellY(r, tile) + m, w: TILE - m * 2, h: TILE - m * 2 };
  }

  function coinBox(c, r, tile) {
    const m = TILE * 0.16;
    return { x: cellX(c, tile) + m, y: cellY(r, tile) + m, w: TILE - m * 2, h: TILE - m * 2 };
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
      this.trail = (opts && opts.trail) || "";
      if (!TRAILS[this.trail]) this.trail = "";
      this.trailParts = [];
      this.trailTick = 0;
      this.trailHue = 0;
      this.touched = new Set();
      this.collected = new Set();
      this.checkpoint = null;
      this.pendingJumps = 0;
      this.pendingCoinGrant = 0;
      this.reset();
    }

    reset(opts) {
      const keepTime = ((opts && opts.keepTime) || this.checkpoint) ? (this.time || 0) : 0;
      this.level = this.source.clone();
      let p;
      if (this.checkpoint) {
        p = {
          x: this.checkpoint.c * TILE + (TILE - PLAYER_W) / 2 + (this.checkpoint.ox || 0),
          y: this.checkpoint.r * TILE + TILE - PLAYER_H + (this.checkpoint.oy || 0),
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
      this.time = keepTime;
      this.deathTimer = 0;
      this.winTimer = 0;
      this.flash = 0;
      this.orbFlash = 0;
      this.padFlash = 0;
      this.dashFlash = 0;
      this.finished = false;
      this.movers = [];
      this.trailParts = [];
      this.trailTick = 0;
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
          tile: packTile(tile),
          ox: tg.tc * TILE + tileOx(tile),
          oy: ty * TILE + tileOy(tile),
          x: tg.tc * TILE + tileOx(tile),
          y: ty * TILE + tileOy(tile),
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
      pad = (pad || 0) + MAX_OFF;
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
        solids.push(solidBox(c, r, tile));
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
        const type = TILE_TYPES[tile.id];
        if (type && type.hazard) {
          if (aabbOverlap(box, spikeBox(c, r, tile.rot || 0, tile))) {
            this.kill("spike");
            return;
          }
        } else if (isGoalId(tile.id)) {
          if (aabbOverlap(box, goalBox(c, r, tile))) {
            this.win();
            return;
          }
        }
      }
      for (const m of this.movers || []) {
        if (m.done) continue;
        const mType = TILE_TYPES[m.tile.id];
        if (mType && mType.hazard) {
          if (aabbOverlap(box, spikeBox(m.x / TILE, m.y / TILE, m.tile.rot || 0))) {
            this.kill("spike");
            return;
          }
        } else if (isGoalId(m.tile.id)) {
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
          const cpBox = { x: cellX(c, tile), y: cellY(r, tile), w: TILE, h: TILE };
          if (aabbOverlap(box, cpBox)) {
            if (!this.touched.has(key)) {
              this.touched.add(key);
              this.checkpoint = { c: c, r: r, ox: tileOx(tile), oy: tileOy(tile) };
            }
          }
        }
      }
    }

    checkCoins() {
      if (this.dead || this.won) return;
      const box = this.playerBox();
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 2);
      const tryCollect = (id, key, cbox) => {
        if (!isCoinId(id) || this.collected.has(key)) return;
        if (!aabbOverlap(box, cbox)) return;
        this.collected.add(key);
        this.pendingCoinGrant = (this.pendingCoinGrant | 0) + coinValue(id);
      };
      for (const { tile, c, r } of hits) {
        tryCollect(tile.id, c + "," + r, coinBox(c, r, tile));
      }
      for (const m of this.movers || []) {
        if (m.done || !isCoinId(m.tile.id)) continue;
        tryCollect(m.tile.id, "m:" + m.cx + "," + m.cy, coinBox(m.x / TILE, m.y / TILE));
      }
    }

    checkOrbs() {
      const p = this.player;
      const box = this.playerBox();
      const hits = this.nearbyTiles(box.x, box.y, box.w, box.h, 2);
      const orbs = hits.filter(({ tile }) => isOrbId(tile.id)).map(({ c, r, tile }) => orbBox(c, r, tile));
      for (const m of this.movers || []) {
        if (!m.done && isOrbId(m.tile.id)) orbs.push(orbBox(m.x / TILE, m.y / TILE));
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
      const pads = hits.filter(({ tile }) => tile.id === "pad").map(({ c, r, tile }) => padBox(c, r, tile));
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
      const dashes = hits.filter(({ tile }) => tile.id === "dash").map(({ c, r, tile }) => dashBox(c, r, tile));
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
      this.checkCoins();
      this.updateMovers(dt);
      this.checkTriggers();
      this.tickTrail(dt);
    }

    tickTrail(dt) {
      const parts = this.trailParts;
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life -= dt;
        if (q.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        q.vy += (q.grav || 0) * dt;
        const dr = Math.max(0, 1 - (q.drag || 0) * dt);
        q.vx *= dr;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      }
      const spec = TRAILS[this.trail];
      if (!spec) return;
      const p = this.player;
      const moving = Math.abs(p.vx) > 30 || Math.abs(p.vy) > 60 || !p.onGround;
      if (!moving) return;
      this.trailTick += dt;
      const interval = 1 / (spec.rate || 30);
      while (this.trailTick >= interval) {
        this.trailTick -= interval;
        if (parts.length >= 220) return;
        const r = Math.random;
        const life = spec.life[0] + r() * (spec.life[1] - spec.life[0]);
        let color = spec.colors[(r() * spec.colors.length) | 0];
        if (spec.rainbow) {
          this.trailHue = (this.trailHue + 24) % 360;
          color = "hsl(" + ((this.trailHue | 0) % 360) + ",100%,62%)";
        }
        parts.push({
          x: p.x + p.w / 2 - Math.sign(p.vx || p.facing || 1) * 8 + (r() - 0.5) * p.w,
          y: p.y + p.h - r() * 8,
          vx: (spec.vx ? spec.vx[0] + r() * (spec.vx[1] - spec.vx[0]) : 0) - (p.vx || 0) * 0.15,
          vy: spec.vy ? spec.vy[0] + r() * (spec.vy[1] - spec.vy[0]) : 0,
          life: life,
          max: life,
          size: spec.size[0] + r() * (spec.size[1] - spec.size[0]),
          color: color,
          grav: spec.grav || 0,
          drag: spec.drag || 0,
          ring: !!spec.ring,
        });
      }
    }
  }

  function spikePoly(ctx, x, y, size, rot) {
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(((rot || 0) * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.46);
    ctx.lineTo(size * 0.44, size * 0.42);
    ctx.lineTo(-size * 0.44, size * 0.42);
    ctx.closePath();
  }

  function simpleTileColor(tile) {
    if (isSpikeId(tile.id)) return "#ff4d62";
    if (isOrbId(tile.id)) return "#3ee07a";
    if (tile.id === "pad") return "#2ee6ff";
    if (tile.id === "dash") return "#ff9a1f";
    if (isGoalId(tile.id)) return "#ffd23c";
    if (tile.id === "checkpoint") return "#3ee07a";
    if (isBrickId(tile.id)) return "#6b86b0";
    return "#9db4d8";
  }

  function drawSimpleTile(ctx, tile, x, y, size, opts) {
    opts = opts || {};
    const rot = isSpikeId(tile.id) ? tile.rot || 0 : 0;
    ctx.save();
    if (isInvisibleId(tile.id)) ctx.globalAlpha *= 0.35;
    ctx.fillStyle = simpleTileColor(tile);
    if (isSpikeId(tile.id)) {
      spikePoly(ctx, x, y, size, rot);
      ctx.fill();
    } else if (isOrbId(tile.id) || isCoinId(tile.id)) {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else if (tile.id === "pad") {
      ctx.fillRect(x + 2, y + size * 0.58, size - 4, size * 0.32);
    } else {
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    }
    ctx.restore();
  }

  // ---- DLLS 5 realistic tile textures (pre-rendered once, cached) ----
  const REAL_SS = 4;
  const realTileCache = {};

  function realHash(i, s) {
    let h = (Math.imul(i + 1, 374761393) + Math.imul(s, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function realSpeckle(g, S, n, seed) {
    for (let i = 0; i < n; i++) {
      const rx = realHash(i, seed) * S;
      const ry = realHash(i, seed + 101) * S;
      const r = realHash(i, seed + 202);
      g.fillStyle = r > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)";
      const s2 = 1 + ((r * 3) | 0);
      g.fillRect(rx, ry, s2, s2);
    }
  }

  // Fine photographic grain over a rect.
  function realGrain(g, x, y, w, h, n, seed, alpha) {
    for (let i = 0; i < n; i++) {
      const r = realHash(i, seed);
      const r2 = realHash(i, seed + 311);
      g.fillStyle = r > 0.5 ? "rgba(255,255,255," + alpha + ")" : "rgba(0,0,0," + alpha * 1.6 + ")";
      g.fillRect(x + r2 * w, y + realHash(i, seed + 512) * h, 1.5, 1.5);
    }
  }

  // Soft darkened corners for depth.
  function realVignette(g, S, alpha) {
    const v = g.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0," + alpha + ")");
    g.fillStyle = v;
    g.fillRect(0, 0, S, S);
  }

  function realRivet(g, x, y, r) {
    const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    rg.addColorStop(0, "#e8eef6");
    rg.addColorStop(0.6, "#8a95a8");
    rg.addColorStop(1, "#2b3342");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  const REAL_PAINT = {
    brick(g, S) {
      const u = S / 32;
      // Four stone blocks with individual tones.
      const courses = [
        { x: 0, w: S / 2, tone: 0 },
        { x: S / 2, w: S / 2, tone: 1 },
        { x: -S / 4, w: S / 2, tone: 2 },
        { x: S / 4, w: S / 2, tone: 3 },
        { x: (3 * S) / 4, w: S / 2, tone: 0 },
      ];
      const tones = [
        ["#525f82", "#3d4763", "#252c42"],
        ["#49536f", "#37415c", "#20263a"],
        ["#565f7e", "#404a66", "#262d44"],
      ];
      g.fillStyle = "#10141f";
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < courses.length; i++) {
        const c = courses[i];
        const y0 = i < 2 ? 0 : S / 2;
        const t = tones[(c.tone + i) % 3];
        const bg = g.createLinearGradient(0, y0, 0, y0 + S / 2);
        bg.addColorStop(0, t[0]);
        bg.addColorStop(0.55, t[1]);
        bg.addColorStop(1, t[2]);
        g.fillStyle = bg;
        const bx = Math.max(2, c.x + 2), bw = Math.min(S - 2, c.x + c.w - 2) - bx;
        if (bw <= 0) continue;
        g.fillRect(bx, y0 + 2, bw, S / 2 - 4);
        // top bevel light, bottom inner shade
        g.fillStyle = "rgba(255,255,255,0.20)";
        g.fillRect(bx, y0 + 2, bw, 2 * u);
        g.fillStyle = "rgba(0,0,0,0.30)";
        g.fillRect(bx, y0 + S / 2 - 2 - 3 * u, bw, 3 * u);
      }
      // mortar cross lines
      g.fillStyle = "#0d1119";
      g.fillRect(0, S / 2 - u, S, 2 * u);
      // cracks
      g.strokeStyle = "rgba(8,10,16,0.8)";
      g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        let cx = realHash(i, 77) * S, cy = realHash(i, 78) * S;
        g.beginPath();
        g.moveTo(cx, cy);
        for (let k = 0; k < 3; k++) {
          cx += (realHash(i * 3 + k, 79) - 0.5) * S * 0.16;
          cy += realHash(i * 3 + k, 80) * S * 0.1;
          g.lineTo(cx, cy);
        }
        g.stroke();
      }
      realSpeckle(g, S, 130, 7);
      realGrain(g, 0, 0, S, S, 130, 707, 0.05);
      realVignette(g, S, 0.22);
      g.strokeStyle = "#0b0e16";
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, S - 3, S - 3);
    },
    spike(g, S) {
      // base plate with brushed streaks
      const plate = g.createLinearGradient(0, S * 0.74, 0, S);
      plate.addColorStop(0, "#646f82");
      plate.addColorStop(0.5, "#3d4657");
      plate.addColorStop(1, "#232a38");
      g.fillStyle = plate;
      g.fillRect(S * 0.05, S * 0.76, S * 0.9, S * 0.2);
      for (let i = 0; i < 8; i++) {
        const yy = S * 0.78 + realHash(i, 91) * S * 0.16;
        g.fillStyle = i % 2 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.14)";
        g.fillRect(S * 0.06, yy, S * 0.88, 1.5);
      }
      g.strokeStyle = "#121722";
      g.lineWidth = 2.5;
      g.strokeRect(S * 0.05, S * 0.76, S * 0.9, S * 0.2);
      realRivet(g, S * 0.2, S * 0.86, S * 0.045);
      realRivet(g, S * 0.8, S * 0.86, S * 0.045);
      // blade shadow on plate
      g.fillStyle = "rgba(0,0,0,0.4)";
      g.beginPath();
      g.moveTo(S * 0.3, S * 0.78);
      g.lineTo(S * 0.5, S * 0.7);
      g.lineTo(S * 0.7, S * 0.78);
      g.closePath();
      g.fill();
      // blade: polished steel bands
      const bx0 = S * 0.14, bx1 = S * 0.86, by = S * 0.78, apex = S * 0.05;
      const steel = g.createLinearGradient(bx0, 0, bx1, 0);
      steel.addColorStop(0, "#4e5a70");
      steel.addColorStop(0.3, "#9aa5b8");
      steel.addColorStop(0.46, "#eef3f9");
      steel.addColorStop(0.54, "#fbfdff");
      steel.addColorStop(0.7, "#98a3b6");
      steel.addColorStop(1, "#495364");
      g.fillStyle = steel;
      g.beginPath();
      g.moveTo(bx0, by);
      g.lineTo(S * 0.5, apex);
      g.lineTo(bx1, by);
      g.closePath();
      g.fill();
      // brushed vertical streaks clipped to blade
      g.save();
      g.clip();
      for (let i = 0; i < 12; i++) {
        const sx = bx0 + (i / 11) * (bx1 - bx0);
        g.fillStyle = i % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
        g.fillRect(sx, apex, (bx1 - bx0) / 12, by - apex);
      }
      // diagonal specular sweep
      const spec = g.createLinearGradient(bx0, by, S * 0.55, apex);
      spec.addColorStop(0, "rgba(255,255,255,0)");
      spec.addColorStop(0.5, "rgba(255,255,255,0.5)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = spec;
      g.beginPath();
      g.moveTo(bx0 + S * 0.04, by);
      g.lineTo(S * 0.5, apex);
      g.lineTo(S * 0.5 + S * 0.1, apex + S * 0.1);
      g.lineTo(bx0 + S * 0.14, by);
      g.closePath();
      g.fill();
      g.restore();
      g.strokeStyle = "#161c28";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(bx0, by);
      g.lineTo(S * 0.5, apex);
      g.lineTo(bx1, by);
      g.stroke();
      // apex glint
      g.fillStyle = "rgba(255,255,255,0.95)";
      g.beginPath();
      g.arc(S * 0.5, apex + S * 0.02, S * 0.018, 0, Math.PI * 2);
      g.fill();
    },
    orb(g, S) {
      const cx = S / 2, cy = S / 2, r = S * 0.3;
      // halo
      const glow = g.createRadialGradient(cx, cy, r * 0.3, cx, cy, S * 0.52);
      glow.addColorStop(0, "rgba(62,224,122,0.45)");
      glow.addColorStop(0.6, "rgba(62,224,122,0.14)");
      glow.addColorStop(1, "rgba(62,224,122,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, S, S);
      // glass body
      const glass = g.createRadialGradient(cx - r * 0.35, cy - r * 0.42, r * 0.08, cx, cy, r);
      glass.addColorStop(0, "#f4fff8");
      glass.addColorStop(0.35, "#8ff0b4");
      glass.addColorStop(0.72, "#1d9e52");
      glass.addColorStop(1, "#07381b");
      g.fillStyle = glass;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      // inner swirl
      g.strokeStyle = "rgba(234,255,246,0.5)";
      g.lineWidth = S * 0.02;
      g.beginPath();
      g.arc(cx + r * 0.08, cy + r * 0.1, r * 0.52, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
      // rim light: bright upper-left, dark lower-right
      g.strokeStyle = "rgba(240,255,246,0.85)";
      g.lineWidth = S * 0.022;
      g.beginPath();
      g.arc(cx, cy, r - S * 0.012, Math.PI * 0.95, Math.PI * 1.7);
      g.stroke();
      g.strokeStyle = "rgba(4,30,15,0.9)";
      g.lineWidth = S * 0.03;
      g.beginPath();
      g.arc(cx, cy, r - S * 0.015, Math.PI * 0.1, Math.PI * 0.6);
      g.stroke();
      // speculars
      g.fillStyle = "rgba(255,255,255,0.95)";
      g.beginPath();
      g.ellipse(cx - r * 0.36, cy - r * 0.42, r * 0.15, r * 0.1, -0.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.beginPath();
      g.arc(cx + r * 0.3, cy + r * 0.34, r * 0.06, 0, Math.PI * 2);
      g.fill();
      // micro bubbles trapped inside
      g.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 4; i++) {
        const a = realHash(i, 121) * Math.PI * 2;
        const d = r * (0.3 + realHash(i, 122) * 0.4);
        g.beginPath();
        g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + realHash(i, 123) * 2, 0, Math.PI * 2);
        g.fill();
      }
    },
    pad(g, S) {
      // steel base with brushed streaks
      const base = g.createLinearGradient(0, S * 0.5, 0, S);
      base.addColorStop(0, "#525c70");
      base.addColorStop(0.5, "#333b4c");
      base.addColorStop(1, "#1d2330");
      g.fillStyle = base;
      g.fillRect(S * 0.08, S * 0.52, S * 0.84, S * 0.42);
      for (let i = 0; i < 6; i++) {
        const yy = S * 0.55 + realHash(i, 131) * S * 0.36;
        g.fillStyle = i % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.16)";
        g.fillRect(S * 0.09, yy, S * 0.82, 1.5);
      }
      g.strokeStyle = "#10141d";
      g.lineWidth = 2.5;
      g.strokeRect(S * 0.08, S * 0.52, S * 0.84, S * 0.42);
      realRivet(g, S * 0.15, S * 0.88, S * 0.04);
      realRivet(g, S * 0.85, S * 0.88, S * 0.04);
      // glowing side slits
      g.fillStyle = "rgba(255,157,46,0.85)";
      g.fillRect(S * 0.08, S * 0.62, S * 0.03, S * 0.2);
      g.fillRect(S * 0.89, S * 0.62, S * 0.03, S * 0.2);
      // springboard
      const board = g.createLinearGradient(0, S * 0.2, 0, S * 0.5);
      board.addColorStop(0, "#ffd98c");
      board.addColorStop(0.45, "#ff9d2e");
      board.addColorStop(1, "#a84a08");
      g.fillStyle = board;
      g.fillRect(S * 0.05, S * 0.24, S * 0.9, S * 0.26);
      // chevrons with dark outline
      for (let i = 0; i < 3; i++) {
        const cxp = S * (0.25 + i * 0.25);
        g.beginPath();
        g.moveTo(cxp - S * 0.075, S * 0.455);
        g.lineTo(cxp, S * 0.295);
        g.lineTo(cxp + S * 0.075, S * 0.455);
        g.lineTo(cxp + S * 0.075, S * 0.4);
        g.lineTo(cxp, S * 0.25);
        g.lineTo(cxp - S * 0.075, S * 0.4);
        g.closePath();
        g.fillStyle = "#5e2c05";
        g.fill();
        g.save();
        g.translate(0, -S * 0.012);
        g.fillStyle = "#ffe27a";
        g.fill();
        g.restore();
      }
      // glass top strip
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fillRect(S * 0.05, S * 0.24, S * 0.9, S * 0.035);
      g.strokeStyle = "#4a2204";
      g.lineWidth = 2.5;
      g.strokeRect(S * 0.05, S * 0.24, S * 0.9, S * 0.26);
    },
    dash(g, S) {
      // dark plate with circuit traces
      const plate = g.createLinearGradient(0, 0, 0, S);
      plate.addColorStop(0, "#1e2a46");
      plate.addColorStop(1, "#090f22");
      g.fillStyle = plate;
      const m = S * 0.06;
      g.beginPath();
      if (g.roundRect) g.roundRect(m, m, S - 2 * m, S - 2 * m, S * 0.12);
      else g.rect(m, m, S - 2 * m, S - 2 * m);
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = "rgba(46,230,255,0.16)";
      g.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const yy = S * (0.14 + i * 0.2);
        g.beginPath();
        g.moveTo(m, yy);
        g.lineTo(m + S * 0.2, yy);
        g.lineTo(m + S * 0.26, yy + S * 0.06);
        g.lineTo(m + S * 0.5, yy + S * 0.06);
        g.stroke();
      }
      realGrain(g, m, m, S - 2 * m, S - 2 * m, 60, 909, 0.05);
      g.restore();
      g.strokeStyle = "#0e3a44";
      g.lineWidth = 2.5;
      g.beginPath();
      if (g.roundRect) g.roundRect(m, m, S - 2 * m, S - 2 * m, S * 0.12);
      else g.rect(m, m, S - 2 * m, S - 2 * m);
      g.stroke();
      // energy chevrons: halo + core
      function chev(ox, alpha, lw, col) {
        g.strokeStyle = col.replace("A", alpha);
        g.lineWidth = lw;
        g.lineCap = "round";
        g.lineJoin = "round";
        g.beginPath();
        g.moveTo(S * 0.3 + ox, S * 0.26);
        g.lineTo(S * 0.62 + ox, S * 0.5);
        g.lineTo(S * 0.3 + ox, S * 0.74);
        g.stroke();
      }
      chev(-S * 0.13, "0.35", S * 0.06, "rgba(46,230,255,A)");
      chev(0, 0.3, S * 0.15, "rgba(46,230,255,A)");
      chev(0, 0.9, S * 0.07, "rgba(160,245,255,A)");
      g.strokeStyle = "#f2feff";
      g.lineWidth = S * 0.032;
      g.beginPath();
      g.moveTo(S * 0.3, S * 0.26);
      g.lineTo(S * 0.62, S * 0.5);
      g.lineTo(S * 0.3, S * 0.74);
      g.stroke();
    },
    goal(g, S) {
      // chiseled stone frame
      const frame = g.createLinearGradient(0, 0, S, S);
      frame.addColorStop(0, "#5e687e");
      frame.addColorStop(0.5, "#3a4358");
      frame.addColorStop(1, "#222839");
      g.fillStyle = frame;
      g.fillRect(0, 0, S, S);
      g.fillStyle = "rgba(255,255,255,0.14)";
      g.fillRect(0, 0, S, S * 0.05);
      g.fillRect(0, 0, S * 0.05, S);
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(0, S * 0.95, S, S * 0.05);
      g.fillRect(S * 0.95, 0, S * 0.05, S);
      realSpeckle(g, S, 60, 31);
      // portal with swirling light
      const px = S * 0.17, py = S * 0.09, pw = S * 0.66, ph = S * 0.82;
      const portal = g.createLinearGradient(0, py, 0, py + ph);
      portal.addColorStop(0, "#fff8dc");
      portal.addColorStop(0.4, "#ffdf6b");
      portal.addColorStop(0.75, "#e09c08");
      portal.addColorStop(1, "#6e4400");
      g.fillStyle = portal;
      g.fillRect(px, py, pw, ph);
      g.save();
      g.beginPath();
      g.rect(px, py, pw, ph);
      g.clip();
      for (let i = 0; i < 4; i++) {
        const yy = py + ph * (0.12 + i * 0.22);
        g.fillStyle = i % 2 ? "rgba(255,255,255,0.28)" : "rgba(120,70,0,0.22)";
        g.beginPath();
        g.moveTo(px, yy);
        for (let x = 0; x <= pw; x += pw / 8) {
          g.lineTo(px + x, yy + Math.sin(x / pw * Math.PI * 2 + i) * ph * 0.03);
        }
        for (let x = pw; x >= 0; x -= pw / 8) {
          g.lineTo(px + x, yy + ph * 0.05 + Math.sin(x / pw * Math.PI * 2 + i) * ph * 0.03);
        }
        g.closePath();
        g.fill();
      }
      // bright core
      const core = g.createRadialGradient(px + pw / 2, py + ph * 0.42, 1, px + pw / 2, py + ph * 0.42, pw * 0.42);
      core.addColorStop(0, "rgba(255,255,255,0.85)");
      core.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = core;
      g.fillRect(px, py, pw, ph);
      g.restore();
      g.strokeStyle = "#2e2004";
      g.lineWidth = 3;
      g.strokeRect(px, py, pw, ph);
      g.strokeStyle = "rgba(255,240,190,0.7)";
      g.lineWidth = 1.5;
      g.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
      // rising embers
      for (let i = 0; i < 7; i++) {
        const sx = px + realHash(i, 51) * pw;
        const sy = py + realHash(i, 77) * ph;
        const a = 0.4 + realHash(i, 78) * 0.5;
        g.fillStyle = "rgba(255,252,240," + a.toFixed(2) + ")";
        const sz = 1.5 + realHash(i, 79) * 2.5;
        g.fillRect(sx, sy, sz, sz);
      }
    },
    checkpoint(g, S) {
      realCheckpoint(g, S, false);
    },
    checkpoint_touched(g, S) {
      realCheckpoint(g, S, true);
    },
  };

  function realCheckpoint(g, S, lit) {
    // ground socket
    const sock = g.createLinearGradient(0, S * 0.84, 0, S);
    sock.addColorStop(0, "#5a6478");
    sock.addColorStop(1, "#232a38");
    g.fillStyle = sock;
    g.fillRect(S * 0.32, S * 0.84, S * 0.36, S * 0.13);
    g.strokeStyle = "#11151d";
    g.lineWidth = 2;
    g.strokeRect(S * 0.32, S * 0.84, S * 0.36, S * 0.13);
    // pole with machined bands
    const pole = g.createLinearGradient(S * 0.44, 0, S * 0.56, 0);
    pole.addColorStop(0, "#697386");
    pole.addColorStop(0.35, "#e6ecf4");
    pole.addColorStop(0.6, "#aeb7c6");
    pole.addColorStop(1, "#3d4658");
    g.fillStyle = pole;
    g.fillRect(S * 0.44, S * 0.12, S * 0.12, S * 0.74);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < 4; i++) {
      g.fillRect(S * 0.44, S * (0.2 + i * 0.17), S * 0.12, S * 0.02);
    }
    // lamp
    if (lit) {
      const halo = g.createRadialGradient(S * 0.5, S * 0.08, 1, S * 0.5, S * 0.08, S * 0.17);
      halo.addColorStop(0, "rgba(62,224,122,0.85)");
      halo.addColorStop(1, "rgba(62,224,122,0)");
      g.fillStyle = halo;
      g.fillRect(S * 0.3, 0, S * 0.4, S * 0.3);
    }
    const lamp = g.createRadialGradient(S * 0.48, S * 0.06, 0.5, S * 0.5, S * 0.08, S * 0.06);
    lamp.addColorStop(0, lit ? "#eafff2" : "#c3cad6");
    lamp.addColorStop(1, lit ? "#1d9e52" : "#4a5468");
    g.fillStyle = lamp;
    g.beginPath();
    g.arc(S * 0.5, S * 0.08, S * 0.055, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = lit ? "#0a3a1e" : "#222a38";
    g.lineWidth = 1.5;
    g.stroke();
    // flag with fold shading
    const fy0 = S * 0.2, fy1 = S * 0.44, fx1 = S * 0.88;
    const flag = g.createLinearGradient(0, fy0, 0, fy1);
    if (lit) {
      flag.addColorStop(0, "#8ff0b4");
      flag.addColorStop(0.5, "#3ee07a");
      flag.addColorStop(1, "#147a3c");
    } else {
      flag.addColorStop(0, "#aab3c4");
      flag.addColorStop(0.5, "#7e889c");
      flag.addColorStop(1, "#4c5568");
    }
    g.fillStyle = flag;
    g.beginPath();
    g.moveTo(S * 0.56, fy0);
    g.lineTo(fx1, (fy0 + fy1) / 2);
    g.lineTo(S * 0.56, fy1);
    g.closePath();
    g.fill();
    g.strokeStyle = lit ? "#0a3a1e" : "#2a3140";
    g.lineWidth = 2;
    g.stroke();
    // fold crease
    g.strokeStyle = lit ? "rgba(6,45,22,0.55)" : "rgba(20,26,38,0.55)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(S * 0.68, fy0 + S * 0.02);
    g.lineTo(S * 0.68, fy1 - S * 0.02);
    g.stroke();
    if (lit) {
      g.strokeStyle = "rgba(234,255,246,0.85)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(S * 0.58, fy0 + S * 0.015);
      g.lineTo(S * 0.82, (fy0 + fy1) / 2);
      g.stroke();
    }
  }

  function realTileImage(kind) {
    if (realTileCache[kind] !== undefined) return realTileCache[kind];
    let c = null;
    try {
      const S = TILE * REAL_SS;
      c = document.createElement("canvas");
      c.width = S;
      c.height = S;
      const g = c.getContext("2d");
      if (!g || !REAL_PAINT[kind]) c = null;
      else REAL_PAINT[kind](g, S);
    } catch (e) {
      c = null;
    }
    realTileCache[kind] = c;
    return c;
  }

  function realCoinRim(value) {
    if (value >= 500) return "#e8ecf4";
    if (value >= 100) return "#ffd23c";
    if (value >= 50) return "#cfd8e6";
    return "#b0783c";
  }

  function drawRealCoin(ctx, tile, x, y, size, bob) {
    const dy = y + (bob || 0);
    const cx = x + size / 2;
    const cy = dy + size / 2;
    const r = size * 0.42;
    const value = coinValue(tile.id);
    const rim = realCoinRim(value);
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    // drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.95, r * 0.7, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    // face
    const face = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    face.addColorStop(0, "#fff8de");
    face.addColorStop(0.55, "#f7c416");
    face.addColorStop(0.85, "#c88d06");
    face.addColorStop(1, "#7a5200");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // reeded edge
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const x0 = cx + Math.cos(a) * r * 0.97;
      const y0 = cy + Math.sin(a) * r * 0.97;
      ctx.strokeStyle = i % 2 ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
      ctx.lineTo(x0, y0);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1.5, size * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    // embossed inner ring
    ctx.strokeStyle = "rgba(122,82,0,0.8)";
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = Math.max(1, size * 0.015);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.68 - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    // embossed value
    const label = String(value);
    ctx.font = "900 " + Math.max(8, size * (label.length > 2 ? 0.26 : 0.34)) + "px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(122,82,0,0.9)";
    ctx.fillText(label, cx + 1, cy + 1.5);
    ctx.fillStyle = "#ffe98c";
    ctx.fillText(label, cx, cy);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    // shine sweep
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(1.5, size * 0.06);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, Math.PI * 1.02, Math.PI * 1.42);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.34, cy - r * 0.4, Math.max(1, size * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.imageSmoothingEnabled = prevSmooth;
  }

  function drawTile(ctx, images, tile, x, y, size, opts) {
    size = size || TILE;
    opts = opts || {};
    if (isInvisibleId(tile.id) && opts.hideInvisible) return;
    if (isCoinId(tile.id)) {
      if (opts.collected) {
        const key = opts.collectedKey || (opts.c != null ? opts.c + "," + opts.r : "");
        if (key && opts.collected.has(key)) return;
      }
      const bob = opts.graphics !== "simple" && opts.bob ? Math.sin(Date.now() / 220 + (opts.c || 0) * 1.7 + (opts.r || 0) * 2.1) * 2.5 : 0;
      if (opts.graphics === "simple") {
        drawSimpleTile(ctx, tile, x, y + bob, size, opts);
        return;
      }
      if (opts.real) {
        drawRealCoin(ctx, tile, x, y, size, bob);
        return;
      }
      drawCoinGraphic(ctx, images, tile, x, y, size, bob);
      return;
    }
    if (opts.graphics === "simple") {
      drawSimpleTile(ctx, tile, x, y, size, opts);
      return;
    }
    let img;
    let realImg = null;
    if (opts.real) {
      if (tile.id === "checkpoint") {
        const touched = opts.touched && opts.c != null && opts.touched.has(opts.c + "," + opts.r);
        realImg = realTileImage(touched ? "checkpoint_touched" : "checkpoint");
      } else if (isBrickId(tile.id)) realImg = realTileImage("brick");
      else if (isSpikeId(tile.id)) realImg = realTileImage("spike");
      else if (isOrbId(tile.id)) realImg = realTileImage("orb");
      else if (tile.id === "pad") realImg = realTileImage("pad");
      else if (tile.id === "dash") realImg = realTileImage("dash");
      else if (isGoalId(tile.id)) realImg = realTileImage("goal");
    }
    if (!realImg) {
      if (tile.id === "checkpoint") {
        const touched = opts.touched && opts.c != null && opts.touched.has(opts.c + "," + opts.r);
        img = touched ? images.checkpointTouched : images.checkpoint;
      } else if (isBrickId(tile.id)) {
        img = images.brick;
      } else if (isSpikeId(tile.id)) {
        img = images.spike;
      } else if (isOrbId(tile.id)) {
        img = images.orb;
      } else if (tile.id === "pad") {
        img = images.pad;
      } else if (tile.id === "dash") {
        img = images.dash;
      } else if (isGoalId(tile.id)) {
        img = images.goal;
      }
    } else {
      img = realImg;
    }
    if (!img) return;
    const rot = isSpikeId(tile.id) ? tile.rot || 0 : 0;
    ctx.save();
    if (isInvisibleId(tile.id)) ctx.globalAlpha *= 0.4;
    const prevSmooth = ctx.imageSmoothingEnabled;
    if (realImg) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    if (rot) {
      ctx.translate(x + size / 2, y + size / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.drawImage(img, x, y, size, size);
    }
    if (realImg) ctx.imageSmoothingEnabled = prevSmooth;
    ctx.restore();
    if (!opts.hideInvisible && isInvisibleId(tile.id)) {
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
    } else if (!opts.hideInvisible && isFakeId(tile.id)) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 210, 60, 0.95)";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = Math.max(1, size / 16);
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 220, 90, 0.95)";
      ctx.font = "bold " + Math.max(7, size * 0.2) + "px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("FAKE", x + size / 2, y + size - 3);
      ctx.textAlign = "start";
      ctx.restore();
    }
  }

  function drawBackdrop(ctx, w, h, t, theme, simple) {
    const th = theme || DEFAULT_THEME;
    if (simple) {
      ctx.fillStyle = th.mid || "#0a1628";
      ctx.fillRect(0, 0, w, h);
      return;
    }
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
    const gfx = extras.graphics === "good" || extras.graphics === "simple" || extras.graphics === "dlls5" ? extras.graphics : "normal";
    const real = gfx === "dlls5";
    const fx = Object.assign({ shadows: true, flashes: true, particles: true }, extras.fx || {});
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const zoom = cam.zoom;
    const worldW = level.cols * TILE;
    const worldH = level.rows * TILE;

    ctx.imageSmoothingEnabled = false;
    drawBackdrop(ctx, w, h, Date.now() / 1000, level.theme, gfx === "simple");

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);

    if (gfx !== "simple") {
      drawPictures(ctx, level);
      drawWidgets(ctx, level, 0);
      ctx.imageSmoothingEnabled = false;
    }

    ctx.fillStyle = "rgba(255, 42, 60, 0.16)";
    ctx.fillRect(-6, worldH, worldW + 12, 10);

    const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const c1 = Math.min(level.cols - 1, Math.ceil((cam.x + w / zoom) / TILE) + 1);
    const r1 = Math.min(level.rows - 1, Math.ceil((cam.y + h / zoom) / TILE) + 1);

    if (fx.shadows && gfx !== "simple") {
      const hideInv = !!extras.engine && !extras.hitboxes;
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const tile = level.grid[r][c];
          // All brick looks (including fakes, so they stay hidden) cast a shadow —
          // except invisible ones while playing, which must stay secret.
          if (tile && isBrickId(tile.id) && !(hideInv && isInvisibleId(tile.id))) {
            ctx.fillRect(cellX(c, tile) + 3, cellY(r, tile) + 4, TILE, TILE);
          }
        }
      }
    }

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
          drawTile(ctx, images, tile, cellX(c, tile), cellY(r, tile), TILE, {
            hideInvisible: !!extras.engine && !extras.hitboxes,
            c: c,
            r: r,
            touched: extras.engine ? extras.engine.touched : null,
            collected: extras.engine ? extras.engine.collected : null,
            bob: !!extras.engine,
            graphics: gfx,
            real: real,
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
          collected: extras.engine ? extras.engine.collected : null,
          collectedKey: "m:" + m.cx + "," + m.cy,
          c: m.cx,
          r: m.cy,
          bob: !!extras.engine,
          graphics: gfx,
          real: real,
        });
      }
    }

    if (extras.heat && extras.heat.length && gfx !== "simple") {
      let drawn = 0;
      for (const h of extras.heat) {
        if (drawn++ > 900) break;
        const n = h.n | 0;
        if (n <= 0) continue;
        const hx = (h.c + 0.5) * TILE;
        const hy = (h.r + 0.5) * TILE;
        const glow = Math.log10(n + 1);
        const a = Math.min(0.5, 0.1 + 0.12 * glow);
        const rad = TILE * (0.42 + 0.1 * Math.min(3, glow));
        const hg = ctx.createRadialGradient(hx, hy, 1, hx, hy, rad);
        hg.addColorStop(0, "rgba(255,60,80," + a.toFixed(3) + ")");
        hg.addColorStop(1, "rgba(255,60,80,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(hx - rad, hy - rad, rad * 2, rad * 2);
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
          ctx.fillRect(cellX(g.c, g), cellY(g.r, g), TILE, TILE);
        } else {
          drawTile(ctx, images, g, cellX(g.c, g), cellY(g.r, g), TILE);
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

    if (extras.engine && extras.engine.checkpoint && extras.engine.checkpoint.practice) {
      const cp = extras.engine.checkpoint;
      const px = cp.c * TILE + (cp.ox || 0) + TILE / 2;
      const py = cp.r * TILE + (cp.oy || 0) + TILE / 2;
      ctx.save();
      ctx.strokeStyle = "rgba(62, 224, 122, 0.95)";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.beginPath();
      ctx.arc(px, py, TILE * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(62, 224, 122, 0.95)";
      ctx.font = Math.max(8, 11 / zoom) + "px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("CP", px, py - TILE * 0.55);
      ctx.textAlign = "start";
      ctx.restore();
    }

    if (extras.hitboxes) {
      ctx.lineWidth = 1 / zoom;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const tile = level.grid[r][c];
          if (!tile) continue;
          if (isSpikeId(tile.id) && TILE_TYPES[tile.id] && TILE_TYPES[tile.id].hazard) {
            const b = spikeBox(c, r, tile.rot || 0, tile);
            ctx.strokeStyle = tile.id === "ispike" ? "rgba(176,92,255,0.95)" : "rgba(255,60,80,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (isGoalId(tile.id)) {
            const b = goalBox(c, r, tile);
            ctx.strokeStyle = "rgba(255,210,60,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (isOrbId(tile.id)) {
            const b = orbBox(c, r, tile);
            ctx.strokeStyle = "rgba(62,224,122,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (tile.id === "pad") {
            const b = padBox(c, r, tile);
            ctx.strokeStyle = "rgba(255,157,46,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (tile.id === "dash") {
            const b = dashBox(c, r, tile);
            ctx.strokeStyle = "rgba(46,230,255,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (isCoinId(tile.id)) {
            const b = coinBox(c, r, tile);
            ctx.strokeStyle = "rgba(255,210,60,0.9)";
            ctx.strokeRect(b.x, b.y, b.w, b.h);
          } else if (isBrickId(tile.id) && TILE_TYPES[tile.id] && TILE_TYPES[tile.id].solid) {
            ctx.strokeStyle = tile.id === "ibrick" ? "rgba(176,92,255,0.7)" : "rgba(80,180,255,0.35)";
            ctx.strokeRect(cellX(c, tile), cellY(r, tile), TILE, TILE);
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
        if (typeof rc.alpha === "number") ctx.globalAlpha = rc.alpha;
        else if (rc.dead) ctx.globalAlpha = 0.45;
        if (rSkinImg) {
          ctx.translate(rdx + TILE / 2, rdy + TILE / 2);
          ctx.rotate(((rc.rot || 0) * Math.PI) / 180);
          ctx.drawImage(rSkinImg, -TILE / 2, -TILE / 2, TILE, TILE);
        } else {
          ctx.fillStyle = "#ffd23c";
          ctx.fillRect(rc.x, rc.y, PLAYER_W, PLAYER_H);
        }
        ctx.restore();
        if (rc.name && gfx !== "simple") {
          ctx.save();
          if (typeof rc.alpha === "number") ctx.globalAlpha = rc.alpha;
          ctx.font = Math.max(8, 11 / zoom) + "px Consolas, monospace";
          ctx.textAlign = "left";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(2, 3 / zoom);
          ctx.strokeStyle = "rgba(7, 16, 24, 0.85)";
          const tagTxt = rc.tagLabel ? "{" + rc.tagLabel + "}" : "";
          const nameW = ctx.measureText(rc.name).width;
          const gap = tagTxt ? ctx.measureText(" ").width : 0;
          const tagW = tagTxt ? ctx.measureText(tagTxt).width : 0;
          const x0 = rdx + TILE / 2 - (nameW + gap + tagW) / 2;
          const ny = rdy - 6;
          ctx.strokeText(rc.name, x0, ny);
          ctx.fillStyle = rc.dead ? "#7f93b0" : (rc.nameColor || "#ffd23c");
          ctx.fillText(rc.name, x0, ny);
          if (tagTxt) {
            ctx.strokeText(tagTxt, x0 + nameW + gap, ny);
            ctx.fillStyle = rc.dead ? "#7f93b0" : (rc.tagColor || "#ffd23c");
            ctx.fillText(tagTxt, x0 + nameW + gap, ny);
          }
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
      if (fx.shadows && gfx !== "simple" && p.onGround && !engine.dead && !engine.won) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(p.x + p.w / 2, p.y + p.h + 5, p.w * 0.42, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (fx.particles && gfx !== "simple" && engine.trailParts && engine.trailParts.length) {
        for (const q of engine.trailParts) {
          const a = Math.max(0, q.life / q.max);
          const s = Math.max(1, q.size * (0.4 + 0.6 * a));
          if (q.ring) {
            ctx.globalAlpha = a * 0.85;
            ctx.strokeStyle = q.color;
            ctx.lineWidth = Math.max(1, 1.5 / zoom);
            ctx.beginPath();
            ctx.arc(q.x, q.y, s / 2, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.globalAlpha = a * 0.9;
            ctx.fillStyle = q.color;
            ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
          }
        }
        ctx.globalAlpha = 1;
      }
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
      if (fx.flashes && engine.flash > 0) {
        ctx.fillStyle = "rgba(255, 30, 50, " + engine.flash * 0.55 + ")";
        ctx.fillRect(cam.x, cam.y, w / zoom, h / zoom);
      }
      if (fx.flashes && gfx !== "simple" && engine.orbFlash > 0) {
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
      if (fx.flashes && gfx !== "simple" && engine.padFlash > 0) {
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
      if (fx.flashes && gfx !== "simple" && engine.dashFlash > 0) {
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

    // NOTE: front-layer (layer 1) widgets are NOT drawn here — they render as
    // live DOM via DP.syncWidgetDom so links stay clickable.

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
    MAX_OFF,
    packTile,
    tileOx,
    tileOy,
    cellX,
    cellY,
    TILE_TYPES,
    isSpikeId,
    isBrickId,
    isGoalId,
    isOrbId,
    isFakeId,
    isInvisibleId,
    isCoinId,
    coinValue,
    COIN_VALUES,
    TEXT_COLORS,
    DEFAULT_THEME,
    THEMES,
    sanitizeTheme,
    hexToRgba,
    sanitizeText,
    sanitizePicture,
    sanitizeWidget,
    syncWidgetDom,
    labelBounds,
    labelHitsCell,
    pictureHandles,
    pictureContains,
    pictureHandleAt,
    MAX_PICTURES,
    MAX_WIDGETS,
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
    coinBox,
    solidBox,
    PLAYER_W,
    PLAYER_H,
    TRAILS,
    matchesBind,
  };
})(window);
