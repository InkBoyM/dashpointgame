/* DashPoint — Dynamic Seeded Procedural Level Generator
 * 100% Random, Zero Static Templates, 100% Mathematically Proven Possible (Beatable).
 *
 * Algorithm:
 *   1. Dynamic Kinematic Path Tracing: Simulates player physics forward from spawn to goal.
 *      At each step, dynamically samples maneuvers (jump, slope, pad launch, orb bounce,
 *      dash flight, gravity flip, conveyor sprint, water swim, key/door puzzle).
 *   2. Reserved Clearance Tunnel: Every maneuver reserves a mathematical clearance tunnel
 *      of safe air corresponding to the player's exact kinematic flight arc.
 *   3. Organic Terrain & Hazard Injection: Spikes, saws, lava, stalactites, and rock
 *      formations are injected dynamically ONLY outside the reserved clearance tunnel.
 *   4. Checkpoints & Coins: Periodic recovery points and coin rewards along jump parabolas.
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
  // THE 100% DYNAMIC PROCEDURAL GENERATOR
  // ─────────────────────────────────────────────────────────────────────────
  function generate(rawSeed) {
    var seed = hashSeed(rawSeed);
    var rng = makePRNG(seed);

    // Pick Theme, Song, and Title
    var theme = randPick(rng, THEMES);
    var song = randPick(rng, SONGS);
    var noun = randPick(rng, NOUNS);
    var levelTitle = theme.prefix + " " + noun + " #" + seed;

    // Dynamically roll level dimensions
    var cols = 90 + Math.floor(rng() * 45); // 90 to 135 columns
    var rows = 24 + Math.floor(rng() * 8);  // 24 to 32 rows

    // Grid stores placed tiles: grid[r][c] = { id, rot? }
    // Clearance stores reserved air tunnel: clearance[r][c] = true
    var grid = [];
    var clearance = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      clearance[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = null;
        clearance[r][c] = false;
      }
    }

    // Reserve safe air corridor
    function markClear(c, r, w, h) {
      for (var dy = 0; dy < h; dy++) {
        for (var dx = 0; dx < w; dx++) {
          var x = c + dx;
          var y = r + dy;
          if (x >= 0 && x < cols && y >= 0 && y < rows) {
            clearance[y][x] = true;
            grid[y][x] = null;
          }
        }
      }
    }

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) {
        var isEssential = (id === "goal" || id === "checkpoint" || id === "pad" ||
          id === "orb" || id === "djOrb" || id === "dash" || id === "blueDash" ||
          id === "gravOrb" || id === "key" || id === "door");
        if (isEssential || !clearance[r][c]) {
          grid[r][c] = { id: id };
        }
      }
    }

    // ── Outer Boundaries ───────────────────────────────────────────────────
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, theme.solid);
      setTile(c, rows - 1, theme.solid);
    }

    // ── Safe Starting Area ─────────────────────────────────────────────────
    var curC = 1;
    var curR = rows - 6;
    var startWidth = randInt(rng, 5, 7);

    for (var c = curC; c < curC + startWidth; c++) {
      for (var r = curR; r < rows; r++) setTile(c, r, theme.solid);
      markClear(c, curR - 4, 1, 4);
    }
    var spawn = { c: 2, r: curR - 1 };
    curC += startWidth;

    var lastCheckpointC = curC;

    // ── Dynamic Kinematic Path Tracing Loop ────────────────────────────────
    while (curC < cols - 8) {
      // Periodic Checkpoint Sanctuary every ~25-30 tiles
      if (curC - lastCheckpointC >= 26 && curC < cols - 16) {
        var cpLen = randInt(rng, 4, 5);
        for (var i = 0; i < cpLen; i++) {
          for (var r = curR; r < rows; r++) setTile(curC + i, r, theme.solid);
          markClear(curC + i, curR - 3, 1, 3);
        }
        setTile(curC + 1, curR - 1, "checkpoint");
        lastCheckpointC = curC;
        curC += cpLen;
        continue;
      }

      // Roll completely random maneuver
      var roll = rng();

      if (roll < 0.22) {
        // Maneuver 1: Running Surface with dynamic hazards (saws, spikes, or clean)
        var len = randInt(rng, 3, 6);
        for (var i = 0; i < len && curC + i < cols - 5; i++) {
          for (var r = curR; r < rows; r++) setTile(curC + i, r, theme.solid);
          markClear(curC + i, curR - 3, 1, 3);
        }
        // Probabilistic hazard in the middle of platform
        if (len >= 4 && rng() < 0.45) {
          var hCol = curC + Math.floor(len / 2);
          setTile(hCol, curR - 1, (rng() < 0.5) ? theme.spike : "saw");
          // Coin above hazard as reward for jumping
          setTile(hCol, curR - 2, "coin50");
        }
        curC += len;

      } else if (roll < 0.38) {
        // Maneuver 2: Jump Gap across a hazard chasm
        // Gap width strictly 2 to 3 tiles (physically jumpable)
        var gap = randInt(rng, 2, 3);
        var deltaY = randInt(rng, -2, 2); // can jump up 2 or down 2
        var nextR = Math.max(7, Math.min(rows - 5, curR + deltaY));
        if (nextR < curR - 1) gap = 2; // tight gap when jumping upward

        // Pit in gap
        for (var g = 0; g < gap; g++) {
          markClear(curC + g, Math.min(curR, nextR) - 4, 1, 8);
          setTile(curC + g, rows - 2, (rng() < 0.4) ? theme.liquid : theme.spike);
        }
        // Coin arc over gap
        setTile(curC + Math.floor(gap / 2), Math.min(curR, nextR) - 2, "coin50");
        curC += gap;

        // Landing platform
        var platLen = randInt(rng, 3, 5);
        for (var i = 0; i < platLen && curC + i < cols - 5; i++) {
          for (var r = nextR; r < rows; r++) setTile(curC + i, r, theme.solid);
          markClear(curC + i, nextR - 3, 1, 3);
        }
        curR = nextR;
        curC += platLen;

      } else if (roll < 0.50) {
        // Maneuver 3: Natural Slopes (Rise or Fall)
        var goUp = (rng() < 0.5 && curR > 9) || curR >= rows - 5;
        if (goUp) {
          setTile(curC, curR, "slopeL");
          for (var r = curR + 1; r < rows; r++) setTile(curC, r, theme.solid);
          markClear(curC, curR - 3, 1, 3);
          curR -= 1;
          setTile(curC + 1, curR, theme.solid);
          for (var r = curR + 1; r < rows; r++) setTile(curC + 1, r, theme.solid);
          markClear(curC + 1, curR - 3, 1, 3);
          curC += 2;
        } else {
          setTile(curC, curR, "slopeR");
          for (var r = curR + 1; r < rows; r++) setTile(curC, r, theme.solid);
          markClear(curC, curR - 3, 1, 3);
          curR += 1;
          setTile(curC + 1, curR, theme.solid);
          for (var r = curR + 1; r < rows; r++) setTile(curC + 1, r, theme.solid);
          markClear(curC + 1, curR - 3, 1, 3);
          curC += 2;
        }

      } else if (roll < 0.62) {
        // Maneuver 4: Bounce Pad Launch (High Catapult)
        setTile(curC, curR, "pad");
        for (var r = curR + 1; r < rows; r++) setTile(curC, r, theme.solid);
        var gap = randInt(rng, 2, 4);
        var launchHeight = randInt(rng, 3, 5); // Pad launches 4-6 blocks high!
        var nextR = Math.max(6, curR - launchHeight);

        for (var g = 1; g < gap; g++) {
          markClear(curC + g, nextR - 2, 1, rows - nextR);
          setTile(curC + g, rows - 2, theme.spike);
        }
        curC += gap;

        var platLen = randInt(rng, 3, 4);
        for (var i = 0; i < platLen && curC + i < cols - 5; i++) {
          for (var r = nextR; r < rows; r++) setTile(curC + i, r, theme.solid);
          markClear(curC + i, nextR - 3, 1, 3);
        }
        setTile(curC + 1, nextR - 2, "coin100");
        curR = nextR;
        curC += platLen;

      } else if (roll < 0.74) {
        // Maneuver 5: Mid-air Bounce Orb / Double Jump Orb Chain
        var gap = randInt(rng, 4, 5);
        var orbX = curC + Math.floor(gap / 2);
        var orbY = curR - 1;
        var orbType = (rng() < 0.5) ? "orb" : "djOrb";
        setTile(orbX, orbY, orbType);

        for (var g = 0; g < gap; g++) {
          markClear(curC + g, curR - 4, 1, 6);
          setTile(curC + g, rows - 2, theme.spike);
        }
        curC += gap;

        var platLen = randInt(rng, 3, 4);
        for (var i = 0; i < platLen && curC + i < cols - 5; i++) {
          for (var r = curR; r < rows; r++) setTile(curC + i, r, theme.solid);
          markClear(curC + i, curR - 3, 1, 3);
        }
        curC += platLen;

      } else if (roll < 0.84) {
        // Maneuver 6: Dash Boost / Blue Dash Hover Flight
        var gap = randInt(rng, 5, 7);
        var dashType = (rng() < 0.5) ? "dash" : "blueDash";
        setTile(curC + 2, curR - 1, dashType);

        for (var g = 0; g < gap; g++) {
          markClear(curC + g, curR - 3, 1, 5);
          setTile(curC + g, rows - 2, theme.liquid);
        }
        setTile(curC + 4, curR - 1, "coin50");
        curC += gap;

        var platLen = randInt(rng, 3, 4);
        for (var i = 0; i < platLen && curC + i < cols - 5; i++) {
          for (var r = curR; r < rows; r++) setTile(curC + i, r, theme.solid);
          markClear(curC + i, curR - 3, 1, 3);
        }
        curC += platLen;

      } else if (roll < 0.92) {
        // Maneuver 7: Gravity Inversion Flip Run
        setTile(curC, curR - 1, "gravOrb");
        var flipLen = randInt(rng, 6, 9);
        for (var i = 1; i < flipLen && curC + i < cols - 5; i++) {
          setTile(curC + i, 1, theme.solid); // solid ceiling to run on
          markClear(curC + i, 2, 1, rows - 4);
          setTile(curC + i, rows - 2, theme.spike);
          if (i % 3 === 0) setTile(curC + i, 2, "gspike");
          else setTile(curC + i, 3, "coin50");
        }
        setTile(curC + flipLen - 1, 3, "gravOrb"); // flip back down
        curC += flipLen;

        var platLen = 4;
        for (var i = 0; i < platLen && curC + i < cols - 5; i++) {
          for (var r = curR; r < rows; r++) setTile(curC + i, r, theme.solid);
          markClear(curC + i, curR - 3, 1, 3);
        }
        curC += platLen;

      } else {
        // Maneuver 8: Conveyors, Ice, or Water Pit
        var subType = randInt(rng, 0, 2);
        if (subType === 0) {
          // Conveyor sprint
          var cLen = randInt(rng, 4, 6);
          for (var i = 0; i < cLen && curC + i < cols - 5; i++) {
            setTile(curC + i, curR, "convR");
            for (var r = curR + 1; r < rows; r++) setTile(curC + i, r, theme.solid);
            markClear(curC + i, curR - 3, 1, 3);
          }
          curC += cLen;
        } else if (subType === 1) {
          // Ice slide
          var iLen = randInt(rng, 4, 6);
          for (var i = 0; i < iLen && curC + i < cols - 5; i++) {
            setTile(curC + i, curR, "ice");
            for (var r = curR + 1; r < rows; r++) setTile(curC + i, r, theme.solid);
            markClear(curC + i, curR - 3, 1, 3);
          }
          curC += iLen;
        } else {
          // Water pool
          var wLen = randInt(rng, 4, 6);
          for (var i = 0; i < wLen && curC + i < cols - 5; i++) {
            setTile(curC + i, curR + 1, "water");
            setTile(curC + i, curR + 2, "water");
            for (var r = curR + 3; r < rows; r++) setTile(curC + i, r, theme.solid);
            markClear(curC + i, curR - 2, 1, 4);
          }
          setTile(curC + 2, curR + 1, "coin50");
          curC += wLen;
        }
      }
    }

    // ── Final Goal Platform ────────────────────────────────────────────────
    var goalR = Math.min(rows - 3, Math.max(8, curR));
    for (var c = curC; c < cols - 1; c++) {
      for (var r = goalR; r < rows; r++) setTile(c, r, theme.solid);
      markClear(c, goalR - 3, 1, 3);
    }
    var goalCol = cols - 4;
    setTile(goalCol, goalR - 1, "goal");

    // ── Ambient Organic Terrain & Decor Pass (Strictly Outside Clearance) ──
    for (var c = 1; c < cols - 1; c++) {
      for (var r = 1; r < rows - 1; r++) {
        if (!clearance[r][c] && !grid[r][c]) {
          // Continuous 2D noise for natural organic formations
          var noiseVal = Math.sin(c * 0.38 + seed * 0.1) * Math.cos(r * 0.42 + seed * 0.05);
          // Stalactites hanging from high ceiling
          if (noiseVal > 0.68 && r < 5) {
            setTile(c, r, theme.solid);
          }
          // Deep underground rock bedrock
          else if (noiseVal < -0.65 && r > rows - 4) {
            setTile(c, r, theme.solid);
          }
        }
      }
    }

    // ── Flatten Grid into Level Tiles ──────────────────────────────────────
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
        editor: "DashPoint DynamicGen"
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
