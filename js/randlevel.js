/* DashPoint — Seeded Procedural Level Generator
 * Creates unique, beatable platformer levels with a deterministic seed (like Minecraft).
 *
 * URL Support:
 *   /random            -> Generates a new random level and updates URL with seed
 *   /random?seed       -> Generates a new random level and updates URL with seed
 *   /random?seed=123   -> Deterministically generates level for seed 123
 *   /random?seed=name  -> Deterministically hashes string seed (e.g. "minecraft")
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
    // FNV-1a 32-bit hash for string seeds
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 1;
  }

  // ── Mulberry32 PRNG (Deterministic 32-bit PRNG) ──────────────────────────
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

  // ── Themes and Songs Available in Engine ────────────────────────────────
  var THEMES = [
    { name: "Ocean", top: "#040810", mid: "#0a1628", bottom: "#122a4a", bg: "", solid: "brick", spike: "spike" },
    { name: "Violet", top: "#070514", mid: "#150b30", bottom: "#2a1652", bg: "cave", solid: "brick", spike: "spike" },
    { name: "Ember", top: "#0d0406", mid: "#2a0a12", bottom: "#48121a", bg: "volcano", solid: "brick", spike: "spike" },
    { name: "Jungle", top: "#03100a", mid: "#0a2618", bottom: "#144228", bg: "meadow", solid: "grass", spike: "gspike" },
    { name: "Glacier", top: "#04090d", mid: "#0a2230", bottom: "#10445c", bg: "glacier", solid: "ice", spike: "spike" },
    { name: "Sandstorm", top: "#0d0904", mid: "#241708", bottom: "#443010", bg: "desert", solid: "brick", spike: "spike" },
    { name: "Void", top: "#000000", mid: "#060608", bottom: "#101016", bg: "", solid: "brick", spike: "spike" },
    { name: "Candy", top: "#12061a", mid: "#33094a", bottom: "#5c1480", bg: "", solid: "brick", spike: "spike" },
    { name: "Nebula", top: "#05030f", mid: "#140b33", bottom: "#2a1652", bg: "space", solid: "brick", spike: "spike" },
    { name: "Sunset", top: "#1c0b2e", mid: "#7a2d52", bottom: "#ff8c3c", bg: "sunset", solid: "brick", spike: "spike" },
  ];

  var SONGS = ["welcome", "hill", "orb", "spike", "cool"];

  // ── Procedural Level Generator ───────────────────────────────────────────
  function generate(rawSeed) {
    var seed = hashSeed(rawSeed);
    var rng = makePRNG(seed);

    var cols = 100;
    var rows = 20;

    var themeChoice = randPick(rng, THEMES);
    var songChoice = randPick(rng, SONGS);
    var solidTile = themeChoice.solid;
    var spikeTile = themeChoice.spike;

    // Grid representation: row -> col -> tileObj
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) grid[r][c] = null;
    }

    function setTile(c, r, id, extra) {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      var t = { id: id };
      if (extra) {
        if (extra.rot) t.rot = extra.rot;
      }
      grid[r][c] = t;
    }

    function getTile(c, r) {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return null;
      return grid[r][c];
    }

    // ── Build Boundary Walls ────────────────────────────────────────────────
    // Top border ceiling
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, solidTile);
    }
    // Left and right boundary walls
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solidTile);
      setTile(cols - 1, r, solidTile);
    }

    // Bottom pit: row 19 has solid ground; row 18 has hazard/spikes in pits
    for (var c = 0; c < cols; c++) {
      setTile(c, rows - 1, solidTile);
    }

    // ── Safe Starting Area ──────────────────────────────────────────────────
    var curC = 1;
    var curR = 15; // Starting platform surface height (r=15 means walk on top of 15)
    var startWidth = 6;
    for (var c = curC; c < curC + startWidth; c++) {
      for (var r = curR; r < rows; r++) {
        setTile(c, r, solidTile);
      }
    }

    var spawnCol = 2;
    var spawnRow = curR - 1;

    curC += startWidth; // Points to first gap column

    var lastCheckpointC = curC;

    // ── Main Platform Generation Loop ───────────────────────────────────────
    // Connect platforms via reachable jumps until near the goal
    while (curC < cols - 10) {
      var progress = curC / cols; // 0.0 -> 1.0

      // Checkpoint placement every ~25-30 tiles
      var placeCheckpoint = (curC - lastCheckpointC >= 25 && curC < cols - 20);

      // Select segment type based on RNG and progress
      // Types:
      // 0: Normal jump with optional spike
      // 1: Stepping stones
      // 2: Bounce Pad ascent
      // 3: Mid-air Bounce Orb gap
      // 4: Dash Orb leap
      // 5: Double jump orb challenge
      var roll = rng();
      var type = 0;
      if (placeCheckpoint) {
        type = 99; // Checkpoint rest platform
      } else if (roll < 0.35) {
        type = 0; // standard jump
      } else if (roll < 0.52) {
        type = 1; // stepping stones
      } else if (roll < 0.68) {
        type = 2; // bounce pad
      } else if (roll < 0.82) {
        type = 3; // bounce orb
      } else if (roll < 0.92) {
        type = 4; // dash orb
      } else {
        type = 5; // double jump orb
      }

      if (type === 99) {
        // Safe Checkpoint rest platform
        var gap = randInt(rng, 1, 2);
        // Fill pit in gap
        for (var gc = curC; gc < curC + gap; gc++) {
          setTile(gc, rows - 2, spikeTile);
        }
        curC += gap;
        var platLen = 4;
        curR = Math.max(10, Math.min(16, curR));
        for (var pc = curC; pc < curC + platLen && pc < cols - 5; pc++) {
          for (var pr = curR; pr < rows; pr++) {
            setTile(pc, pr, solidTile);
          }
        }
        // Place checkpoint on top of platform
        setTile(curC + 1, curR - 1, "checkpoint");
        lastCheckpointC = curC;
        curC += platLen;

      } else if (type === 0) {
        // Standard Jump:
        // Gap of 2 to 3 tiles. Height change between -2 and +2.
        var gap = randInt(rng, 2, 3);
        var deltaR = randInt(rng, -2, 2);
        var nextR = Math.max(9, Math.min(16, curR + deltaR));
        // If jumping up 2 tiles, keep gap strictly 2
        if (nextR < curR - 1) gap = 2;

        // Pit spikes
        for (var gc = curC; gc < curC + gap; gc++) {
          setTile(gc, rows - 2, spikeTile);
        }
        curC += gap;

        var platLen = randInt(rng, 3, 5);
        for (var pc = curC; pc < curC + platLen && pc < cols - 5; pc++) {
          for (var pr = nextR; pr < rows; pr++) {
            setTile(pc, pr, solidTile);
          }
        }

        // On platform hazard: single spike in center if platform length >= 4
        if (platLen >= 4 && rng() < (0.2 + progress * 0.3)) {
          var spikeC = curC + 2;
          setTile(spikeC, nextR - 1, spikeTile);
        }

        // Optional coin arc over gap or above platform
        if (rng() < 0.45) {
          var coinKind = rng() < 0.6 ? "coin10" : (rng() < 0.85 ? "coin50" : "coin100");
          setTile(curC + 1, nextR - 2, coinKind);
        }

        curR = nextR;
        curC += platLen;

      } else if (type === 1) {
        // Stepping stones: 2 small pillars
        var stones = randInt(rng, 2, 3);
        for (var s = 0; s < stones; s++) {
          var gap = 2;
          for (var gc = curC; gc < curC + gap; gc++) {
            setTile(gc, rows - 2, spikeTile);
          }
          curC += gap;
          if (curC >= cols - 8) break;

          var stoneR = Math.max(10, Math.min(16, curR + randInt(rng, -1, 1)));
          var stoneW = 2;
          for (var pc = curC; pc < curC + stoneW && pc < cols - 5; pc++) {
            for (var pr = stoneR; pr < rows; pr++) {
              setTile(pc, pr, solidTile);
            }
          }
          // Reward on top of stone
          setTile(curC, stoneR - 2, "coin10");
          curR = stoneR;
          curC += stoneW;
        }

      } else if (type === 2) {
        // Bounce Pad Ascent: launches player up to a higher ledge
        // Place pad at the edge of current platform
        setTile(curC - 1, curR - 1, "pad");

        var gap = randInt(rng, 2, 3);
        // Pit under
        for (var gc = curC; gc < curC + gap; gc++) {
          setTile(gc, rows - 2, spikeTile);
        }
        curC += gap;

        // Target platform is 3 to 4 tiles HIGHER
        var nextR = Math.max(7, curR - randInt(rng, 3, 4));
        var platLen = randInt(rng, 3, 4);
        for (var pc = curC; pc < curC + platLen && pc < cols - 5; pc++) {
          for (var pr = nextR; pr < rows; pr++) {
            setTile(pc, pr, solidTile);
          }
        }
        // Coin reward for making the high jump
        setTile(curC + 1, nextR - 2, "coin50");

        curR = nextR;
        curC += platLen;

      } else if (type === 3) {
        // Bounce Orb Gap:
        // Wide gap of 4 to 5 tiles with a bounce orb in the middle
        var gap = 4;
        for (var gc = curC; gc < curC + gap; gc++) {
          setTile(gc, rows - 2, spikeTile);
        }
        // Place orb mid-gap at height curR - 1
        setTile(curC + 2, curR - 1, "orb");

        curC += gap;
        var nextR = Math.max(8, Math.min(16, curR + randInt(rng, -1, 1)));
        var platLen = randInt(rng, 3, 5);
        for (var pc = curC; pc < curC + platLen && pc < cols - 5; pc++) {
          for (var pr = nextR; pr < rows; pr++) {
            setTile(pc, pr, solidTile);
          }
        }

        curR = nextR;
        curC += platLen;

      } else if (type === 4) {
        // Dash Orb Flight: wide gap of 5-6 tiles with a dash orb
        var gap = 5;
        for (var gc = curC; gc < curC + gap; gc++) {
          setTile(gc, rows - 2, spikeTile);
        }
        var dashType = (rng() < 0.5) ? "dash" : "blueDash";
        setTile(curC + 2, curR - 1, dashType);

        curC += gap;
        var nextR = curR;
        var platLen = randInt(rng, 3, 4);
        for (var pc = curC; pc < curC + platLen && pc < cols - 5; pc++) {
          for (var pr = nextR; pr < rows; pr++) {
            setTile(pc, pr, solidTile);
          }
        }

        curR = nextR;
        curC += platLen;

      } else {
        // Double Jump Orb: gap of 4 tiles with djOrb
        var gap = 4;
        for (var gc = curC; gc < curC + gap; gc++) {
          setTile(gc, rows - 2, spikeTile);
        }
        setTile(curC + 2, curR - 1, "djOrb");

        curC += gap;
        var nextR = Math.max(9, Math.min(16, curR + randInt(rng, -2, 1)));
        var platLen = randInt(rng, 3, 4);
        for (var pc = curC; pc < curC + platLen && pc < cols - 5; pc++) {
          for (var pr = nextR; pr < rows; pr++) {
            setTile(pc, pr, solidTile);
          }
        }

        curR = nextR;
        curC += platLen;
      }
    }

    // ── Goal Area ───────────────────────────────────────────────────────────
    // Fill from curC to cols-1 with solid floor at height 15
    var goalR = 15;
    for (var c = curC; c < cols - 1; c++) {
      for (var r = goalR; r < rows; r++) {
        setTile(c, r, solidTile);
      }
    }
    // Place goal at cols - 4, on top of goalR
    var goalCol = cols - 4;
    setTile(goalCol, goalR - 1, "goal");

    // Clear any obstacles around goal
    setTile(goalCol, goalR - 2, null);
    setTile(goalCol - 1, goalR - 1, null);
    setTile(goalCol + 1, goalR - 1, null);

    // ── Build Tiles Array ───────────────────────────────────────────────────
    var tiles = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var t = grid[r][c];
        if (t && t.id) {
          var entry = { c: c, r: r, id: t.id };
          if (t.rot) entry.rot = t.rot;
          tiles.push(entry);
        }
      }
    }

    return {
      format: "dashpoint-level",
      version: 1,
      name: "Seed #" + seed,
      cols: cols,
      rows: rows,
      tileSize: 48,
      spawn: { c: spawnCol, r: spawnRow },
      tiles: tiles,
      texts: [
        {
          id: "tx_seed",
          c: spawnCol + 1,
          r: spawnRow - 2,
          text: "SEED: " + seed,
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
      song: songChoice,
      theme: {
        top: themeChoice.top,
        mid: themeChoice.mid,
        bottom: themeChoice.bottom,
        bg: themeChoice.bg,
        weather: ""
      },
      meta: {
        title: "Seed #" + seed,
        authorName: "World Gen",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editor: "DashPoint RandGen 1.0"
      }
    };
  }

  // ── Route & Seed Detection ───────────────────────────────────────────────
  function parseSeedParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has("seed")) {
        var s = params.get("seed");
        // If empty ?seed (e.g. /random?seed), generate fresh random seed
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
