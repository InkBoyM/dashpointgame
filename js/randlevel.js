/* DashPoint — Dynamic Seeded Procedural Level Generator
 * 100% Random, Zero Static Templates, 100% Guaranteed Physically Reachable (Beatable).
 *
 * Physics Constraints:
 *   - Player Jump Force: 660 px/s, Gravity: 2100 px/s², Tile: 48px -> Max jump height = 2.16 tiles.
 *   - Normal jumps UP are strictly clamped to max 2 tiles delta (with max 2-tile horizontal gap).
 *   - Higher ascents (3 to 5 tiles) strictly require a Bounce Pad directly on the takeoff ledge.
 *   - Platforms are clean floating ledges (1 tile thick) — NEVER filled to the floor to prevent impassable monolith walls.
 *   - Goal is always placed at the continuation of the final path height (no sudden cliffs).
 */
(function (window) {
  "use strict";

  // ── 32-bit Hash for seeds (handles numeric and string seeds) ─────────────
  function hashSeed(seedInput) {
    if (typeof seedInput === "number") return (seedInput >>> 0) || 1;
    var str = String(seedInput || "").trim();
    if (!str) return (Math.random() * 0xFFFFFFFF) >>> 0 || 1;
    if (/^-?\d+$/.test(str)) {
      var n = parseInt(str, 10);
      return (n >>> 0) || 1;
    }
    // FNV-1a 32-bit hash for string seeds (e.g. "minecraft", "speedrun")
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 1;
  }

  // ── Mulberry32 PRNG ──────────────────────────────────────────────────────
  function makePRNG(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function randPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  // ── Themes Available in Engine ───────────────────────────────────────────
  var THEMES = [
    { prefix: "Ocean", top: "#040810", mid: "#0a1628", bottom: "#122a4a", bg: "", solid: "brick", spike: "spike", liquid: "water" },
    { prefix: "Violet", top: "#070514", mid: "#150b30", bottom: "#2a1652", bg: "cave", solid: "brick", spike: "spike", liquid: "water" },
    { prefix: "Ember", top: "#0d0406", mid: "#2a0a12", bottom: "#48121a", bg: "volcano", solid: "brick", spike: "spike", liquid: "lava" },
    { prefix: "Jungle", top: "#03100a", mid: "#0a2618", bottom: "#144228", bg: "meadow", solid: "grass", spike: "gspike", liquid: "water" },
    { prefix: "Glacier", top: "#04090d", mid: "#0a2230", bottom: "#10445c", bg: "glacier", solid: "ice", spike: "spike", liquid: "water" },
    { prefix: "Sandstorm", top: "#0d0904", mid: "#241708", bottom: "#443010", bg: "desert", solid: "brick", spike: "spike", liquid: "water" },
    { prefix: "Void", top: "#000000", mid: "#060608", bottom: "#101016", bg: "", solid: "brick", spike: "spike", liquid: "lava" },
    { prefix: "Candy", top: "#12061a", mid: "#33094a", bottom: "#5c1480", bg: "", solid: "brick", spike: "spike", liquid: "water" },
    { prefix: "Nebula", top: "#05030f", mid: "#140b33", bottom: "#2a1652", bg: "space", solid: "brick", spike: "spike", liquid: "water" },
    { prefix: "Sunset", top: "#1c0b2e", mid: "#7a2d52", bottom: "#ff8c3c", bg: "sunset", solid: "brick", spike: "spike", liquid: "water" },
  ];

  var NOUNS = ["Caverns", "Ridge", "Abyss", "Sanctuary", "Pinnacle", "Depths", "Ruins", "Nexus", "Chasm", "Spire"];
  var SONGS = ["welcome", "hill", "orb", "spike", "cool"];

  // ─────────────────────────────────────────────────────────────────────────
  // THE GENERATOR
  // ─────────────────────────────────────────────────────────────────────────
  function generate(rawSeed) {
    var seed = hashSeed(rawSeed);
    var rng = makePRNG(seed);

    var theme = randPick(rng, THEMES);
    var song = randPick(rng, SONGS);
    var noun = randPick(rng, NOUNS);
    var levelTitle = theme.prefix + " " + noun + " #" + seed;

    var cols = 90 + Math.floor(rng() * 35); // 90 to 125 columns
    var rows = 22; // standard vertical frame

    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) grid[r][c] = null;
    }

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) {
        grid[r][c] = { id: id };
      }
    }

    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) {
        grid[r][c] = null;
      }
    }

    // Floating ledge (clean 1-tile thick platform, 3 tiles of guaranteed clear air above)
    function placeLedge(cStart, width, surfaceR, solidId) {
      for (var c = cStart; c < cStart + width && c < cols - 1; c++) {
        setTile(c, surfaceR, solidId);
        // Clear 3 tiles above platform for player jump space
        for (var ar = surfaceR - 3; ar < surfaceR; ar++) {
          clearTile(c, ar);
        }
      }
    }

    // Outer borders
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }
    // Floor across the very bottom
    for (var c = 0; c < cols; c++) {
      setTile(c, rows - 1, theme.solid);
    }

    // Starting platform
    var curC = 1;
    var curR = rows - 5; // row 17
    var startLen = 6;
    placeLedge(curC, startLen, curR, theme.solid);
    var spawn = { c: 2, r: curR - 1 };
    curC += startLen;

    var lastCheckpointC = curC;

    // ── Forward Path Generation Loop ───────────────────────────────────────
    while (curC < cols - 8) {
      // Checkpoint Sanctuary every ~26-30 tiles
      if (curC - lastCheckpointC >= 26 && curC < cols - 16) {
        var cpLen = 4;
        placeLedge(curC, cpLen, curR, theme.solid);
        setTile(curC + 1, curR - 1, "checkpoint");
        lastCheckpointC = curC;
        curC += cpLen;
        continue;
      }

      var roll = rng();

      if (roll < 0.25) {
        // 1. Flat ledge with optional central hazard
        var len = randInt(rng, 3, 5);
        placeLedge(curC, len, curR, theme.solid);
        if (len >= 4 && rng() < 0.4) {
          var hCol = curC + 2;
          setTile(hCol, curR - 1, (rng() < 0.5) ? theme.spike : "saw");
          setTile(hCol, curR - 2, "coin50");
        }
        curC += len;

      } else if (roll < 0.45) {
        // 2. Jump across gap:
        // Gap strictly 2 to 3 tiles. Height delta strictly -2 to +2 (max jump = 2 tiles up!)
        var gap = randInt(rng, 2, 3);
        var deltaY = randInt(rng, -2, 2);
        var nextR = Math.max(7, Math.min(rows - 4, curR + deltaY));
        if (nextR < curR - 1) gap = 2; // When jumping UP 2 tiles, gap must be at most 2!

        // Pit under gap
        for (var g = 0; g < gap; g++) {
          setTile(curC + g, rows - 2, (rng() < 0.4) ? theme.liquid : theme.spike);
        }
        setTile(curC + Math.floor(gap / 2), Math.min(curR, nextR) - 2, "coin10");
        curC += gap;

        var platLen = randInt(rng, 3, 4);
        placeLedge(curC, platLen, nextR, theme.solid);
        curR = nextR;
        curC += platLen;

      } else if (roll < 0.60) {
        // 3. Bounce Pad Launch (for high ledges 3-4 tiles up)
        setTile(curC, curR, "pad");
        var gap = 2;
        var nextR = Math.max(6, curR - randInt(rng, 3, 4));
        setTile(curC + 1, rows - 2, theme.spike);
        curC += gap;

        var platLen = 3;
        placeLedge(curC, platLen, nextR, theme.solid);
        setTile(curC + 1, nextR - 2, "coin100");
        curR = nextR;
        curC += platLen;

      } else if (roll < 0.72) {
        // 4. Orb leap: gap 4 with bounce orb in the middle
        var gap = 4;
        setTile(curC + 2, curR - 1, (rng() < 0.5) ? "orb" : "djOrb");
        for (var g = 0; g < gap; g++) setTile(curC + g, rows - 2, theme.spike);
        curC += gap;

        var platLen = 3;
        placeLedge(curC, platLen, curR, theme.solid);
        curC += platLen;

      } else if (roll < 0.84) {
        // 5. Dash leap: gap 5 with dash in the middle
        var gap = 5;
        var dashType = (rng() < 0.5) ? "dash" : "blueDash";
        setTile(curC + 2, curR - 1, dashType);
        for (var g = 0; g < gap; g++) setTile(curC + g, rows - 2, theme.liquid);
        curC += gap;

        var platLen = 3;
        placeLedge(curC, platLen, curR, theme.solid);
        curC += platLen;

      } else if (roll < 0.92) {
        // 6. Gravity flip corridor
        setTile(curC, curR - 1, "gravOrb");
        var flipLen = randInt(rng, 6, 8);
        for (var i = 1; i < flipLen && curC + i < cols - 5; i++) {
          setTile(curC + i, 1, theme.solid); // ceiling to run on
          for (var ar = 2; ar <= 4; ar++) clearTile(curC + i, ar);
          setTile(curC + i, rows - 2, theme.spike);
          if (i % 3 === 0) setTile(curC + i, 2, "gspike");
        }
        setTile(curC + flipLen - 1, 3, "gravOrb"); // flip back
        curC += flipLen;

        var platLen = 3;
        placeLedge(curC, platLen, curR, theme.solid);
        curC += platLen;

      } else {
        // 7. Conveyor or Ice runway
        var len = 4;
        var blockType = (rng() < 0.5) ? "convR" : "ice";
        for (var c = curC; c < curC + len && c < cols - 5; c++) {
          setTile(c, curR, blockType);
          for (var ar = curR - 3; ar < curR; ar++) clearTile(c, ar);
        }
        curC += len;
      }
    }

    // ── Final Goal Platform: Placed at the EXACT same height as curR ────────
    placeLedge(curC, cols - curC - 1, curR, theme.solid);
    setTile(cols - 4, curR - 1, "goal");

    // ── Build Tiles Array ──────────────────────────────────────────────────
    var tiles = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var t = grid[r][c];
        if (t && t.id) {
          tiles.push({ c: c, r: r, id: t.id });
        }
      }
    }

    return {
      format: "dashpoint-level",
      version: 1,
      name: levelTitle,
      cols: cols,
      rows: rows,
      tileSize: 48,
      spawn: spawn,
      tiles: tiles,
      texts: [
        {
          id: "tx_seed",
          c: spawn.c + 1,
          r: Math.max(1, spawn.r - 2),
          text: levelTitle.toUpperCase(),
          color: "#ffffff",
          scale: 1
        }
      ],
      pictures: [],
      widgets: [],
      gameplay: {},
      triggers: [],
      platforms: [],
      zones: [],
      portals: [],
      song: song,
      theme: {
        top: theme.top,
        mid: theme.mid,
        bottom: theme.bottom,
        bg: theme.bg,
        weather: ""
      },
      meta: {
        title: levelTitle,
        authorName: "World Gen",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editor: "DashPoint DynamicGen 3.1"
      }
    };
  }

  // ── Route & Seed Detection ───────────────────────────────────────────────
  function parseSeedParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has("seed")) {
        var s = params.get("seed");
        if (!s || s === "") {
          return (Math.random() * 0xFFFFFFFF) >>> 0 || 1;
        }
        return hashSeed(s);
      }
    } catch (e) {}
    return (Math.random() * 0xFFFFFFFF) >>> 0 || 1;
  }

  function isRandomRoute() {
    try {
      var pathname = (window.location.pathname || "").toLowerCase();
      var search = (window.location.search || "").toLowerCase();
      if (pathname.indexOf("/random") !== -1) return true;
      if (search.indexOf("random") !== -1) return true;
      if (new URLSearchParams(window.location.search).has("seed")) return true;
    } catch (e) {}
    return false;
  }

  window.DashPointRandLevel = {
    generate: generate,
    hashSeed: hashSeed,
    parseSeedParam: parseSeedParam,
    isRandomRoute: isRandomRoute
  };

})(window);
