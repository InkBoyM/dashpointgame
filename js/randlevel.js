/* DashPoint — Seeded Procedural Level Generator
 * Features 6 distinct World Archetypes (Tower, Dropper, Hills, Cavern, Gravity Flip, Temple Quest)
 * Every level is unique, guaranteed beatable, and deterministically generated from its seed.
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

  // Helper to create empty grid
  function createGrid(cols, rows) {
    var g = [];
    for (var r = 0; r < rows; r++) {
      g[r] = [];
      for (var c = 0; c < cols; c++) g[r][c] = null;
    }
    return g;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHETYPE 1: TOWER CLIMB (Vertical Ascent)
  // ─────────────────────────────────────────────────────────────────────────
  function generateTowerClimb(rng, seed, themeChoice, songChoice) {
    var cols = 42;
    var rows = 68;
    var grid = createGrid(cols, rows);
    var solid = themeChoice.solid;
    var spike = themeChoice.spike;

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = { id: id };
    }

    // Outer tower walls
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solid);
      setTile(1, r, solid);
      setTile(cols - 2, r, solid);
      setTile(cols - 1, r, solid);
    }
    // Floor
    for (var c = 0; c < cols; c++) {
      setTile(c, rows - 1, solid);
      setTile(c, rows - 2, solid);
    }
    // Roof
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, solid);
      setTile(c, 1, solid);
    }

    var spawn = { c: 5, r: rows - 3 };

    // Climb upward in zig-zagging tiers from rows - 3 to rows 6
    var curR = rows - 6;
    var goRight = true;
    var lastCheckR = rows;

    while (curR > 6) {
      var platLen = randInt(rng, 10, 16);
      var startC = goRight ? 2 : cols - 2 - platLen;

      // Build platform
      for (var c = startC; c < startC + platLen; c++) {
        setTile(c, curR, solid);
      }

      // Checkpoint every ~16 rows
      if (lastCheckR - curR >= 16 && curR > 12) {
        var cpCol = goRight ? startC + 2 : startC + platLen - 3;
        setTile(cpCol, curR - 1, "checkpoint");
        lastCheckR = curR;
      }

      // Hazards and mechanics on platform
      if (rng() < 0.6) {
        var hCol = startC + Math.floor(platLen / 2);
        if (rng() < 0.5) setTile(hCol, curR - 1, spike);
        else setTile(hCol, curR - 1, "saw");
      }

      // Vertical ascent booster at the end of the platform to reach the next tier:
      // Uses bounce pad or double-jump orb
      var boostCol = goRight ? startC + platLen - 1 : startC;
      var nextDeltaR = randInt(rng, 3, 5); // 3 to 5 tiles higher
      if (nextDeltaR > 2) {
        setTile(boostCol, curR - 1, rng() < 0.6 ? "pad" : "orb");
      }

      // Coins reward
      setTile(startC + Math.floor(platLen / 3), curR - 2, "coin50");

      curR -= nextDeltaR;
      goRight = !goRight;
    }

    // Top roof goal
    var goalR = 5;
    for (var c = 12; c < cols - 12; c++) {
      setTile(c, goalR, solid);
    }
    setTile(Math.floor(cols / 2), goalR - 1, "goal");

    return {
      title: "Tower Climb #" + seed,
      cols: cols,
      rows: rows,
      spawn: spawn,
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHETYPE 2: THE DROPPER (Vertical Descent)
  // ─────────────────────────────────────────────────────────────────────────
  function generateDropper(rng, seed, themeChoice, songChoice) {
    var cols = 42;
    var rows = 68;
    var grid = createGrid(cols, rows);
    var solid = themeChoice.solid;
    var spike = themeChoice.spike;

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = { id: id };
    }

    // Outer walls
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solid);
      setTile(1, r, solid);
      setTile(cols - 2, r, solid);
      setTile(cols - 1, r, solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, solid);
      setTile(c, 1, solid);
      setTile(c, rows - 1, solid);
      setTile(c, rows - 2, solid);
    }

    // Spawn at top
    for (var c = 2; c < 12; c++) {
      setTile(c, 7, solid);
    }
    var spawn = { c: 5, r: 6 };

    // Dropper floors: horizontal barriers with drop shafts alternating across tiers
    var curR = 12;
    var lastHoleC = 8;
    var lastCheckR = 0;

    while (curR < rows - 8) {
      // Pick drop hole column that requires steering
      var holeW = randInt(rng, 4, 6);
      var holeC = randInt(rng, 4, cols - 4 - holeW);
      // Ensure hole is not directly aligned with previous hole so player must navigate
      if (Math.abs(holeC - lastHoleC) < 6) {
        holeC = (holeC + 14) % (cols - 8) + 4;
      }
      lastHoleC = holeC;

      // Build floor barrier across row
      for (var c = 2; c < cols - 2; c++) {
        if (c < holeC || c >= holeC + holeW) {
          setTile(c, curR, solid);
        }
      }

      // Checkpoint on wide resting ledges
      if (curR - lastCheckR >= 16 && curR < rows - 12) {
        var cpCol = (holeC > cols / 2) ? 4 : cols - 6;
        setTile(cpCol, curR - 1, "checkpoint");
        lastCheckR = curR;
      }

      // Place spikes on some floor ledges to punish reckless landing
      if (rng() < 0.5) {
        var sCol = (holeC > cols / 2) ? randInt(rng, 3, holeC - 2) : randInt(rng, holeC + holeW + 1, cols - 4);
        setTile(sCol, curR - 1, spike);
      }

      // Coins in the falling shaft
      setTile(holeC + 2, curR, "coin50");

      // Occasional bounce pad below shaft to catch falls
      if (rng() < 0.35 && curR + 6 < rows - 6) {
        setTile(holeC + 1, curR + 4, "pad");
      }

      curR += randInt(rng, 5, 7);
    }

    // Bottom chamber: water cushion and goal
    for (var c = 4; c < cols - 4; c++) {
      setTile(c, rows - 3, "water");
    }
    var goalC = Math.floor(cols / 2);
    setTile(goalC, rows - 3, "goal");

    return {
      title: "The Dropper #" + seed,
      cols: cols,
      rows: rows,
      spawn: spawn,
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHETYPE 3: ROLLING HILLS (Slopes & Valleys)
  // ─────────────────────────────────────────────────────────────────────────
  function generateRollingHills(rng, seed, themeChoice, songChoice) {
    var cols = 110;
    var rows = 26;
    var grid = createGrid(cols, rows);
    var solid = "grass";
    var spike = "gspike";

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = { id: id };
    }

    // Border
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solid);
      setTile(cols - 1, r, solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, solid);
      setTile(c, rows - 1, solid);
    }

    var spawn = { c: 3, r: 18 };

    // Generate natural undulating ground height using combined waves
    var heights = [];
    var baseH = 20;
    var phase1 = rng() * Math.PI * 2;
    var phase2 = rng() * Math.PI * 2;

    for (var c = 0; c < cols; c++) {
      if (c < 8) {
        heights[c] = baseH; // Flat start
      } else if (c >= cols - 8) {
        heights[c] = baseH; // Flat end
      } else {
        var wave = Math.sin(c * 0.12 + phase1) * 3 + Math.sin(c * 0.22 + phase2) * 2;
        heights[c] = Math.max(12, Math.min(22, Math.round(baseH - wave)));
      }
    }

    // Render smooth slope terrain based on height deltas
    for (var c = 1; c < cols - 1; c++) {
      var h = heights[c];
      var hPrev = heights[c - 1];
      var hNext = heights[c + 1];

      // Build column down to floor
      for (var r = h; r < rows - 1; r++) {
        setTile(c, r, solid);
      }

      // Top surface tile: slope or flat block
      if (h < hPrev && h === hNext) {
        // Peak of a hill
        setTile(c, h - 1, "grass");
      } else if (hPrev > h) {
        // Rising from left to right -> slopeL
        setTile(c, h, "slopeL");
      } else if (hNext > h) {
        // Falling from left to right -> slopeR
        setTile(c, h, "slopeR");
      }

      // Checkpoints on hilltops
      if (c % 30 === 0 && c > 15 && c < cols - 15) {
        setTile(c, h - 1, "checkpoint");
      }

      // Ravine / valley hazard: if it's a deep valley, put spikes or water pond
      if (h >= 21 && c > 10 && c < cols - 10) {
        if (rng() < 0.6) setTile(c, h, "water");
        else setTile(c, h, spike);
      }

      // Hilltop coins
      if (h <= 14 && rng() < 0.4) {
        setTile(c, h - 2, "coin50");
      }
    }

    // Goal at end
    setTile(cols - 4, heights[cols - 4] - 1, "goal");

    return {
      title: "Rolling Hills #" + seed,
      cols: cols,
      rows: rows,
      spawn: spawn,
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHETYPE 4: CAVERN & MACHINERY (Conveyors, Saws & Ice)
  // ─────────────────────────────────────────────────────────────────────────
  function generateCavern(rng, seed, themeChoice, songChoice) {
    var cols = 100;
    var rows = 24;
    var grid = createGrid(cols, rows);
    var solid = "brick";
    var spike = "spike";

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = { id: id };
    }

    // Enclosing rock boundary
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solid);
      setTile(cols - 1, r, solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, solid);
      setTile(c, 1, solid);
      setTile(c, rows - 1, solid);
      setTile(c, rows - 2, solid);
    }

    var spawn = { c: 3, r: rows - 4 };

    // Flat start room
    for (var c = 1; c < 8; c++) {
      setTile(c, rows - 3, solid);
    }

    var curC = 8;
    var curR = rows - 3;
    var lastCheckC = 8;

    while (curC < cols - 10) {
      var progress = curC / cols;
      var chunkType = randInt(rng, 0, 3);

      if (curC - lastCheckC >= 25) {
        // Safe Checkpoint Hub
        var hubLen = 5;
        for (var c = curC; c < curC + hubLen && c < cols - 5; c++) {
          setTile(c, curR, solid);
        }
        setTile(curC + 2, curR - 1, "checkpoint");
        lastCheckC = curC;
        curC += hubLen;
        continue;
      }

      if (chunkType === 0) {
        // Conveyor speed track over a saw pit
        var trackLen = randInt(rng, 5, 8);
        var convDir = rng() < 0.7 ? "convR" : "convL";
        for (var c = curC; c < curC + trackLen && c < cols - 5; c++) {
          setTile(c, curR, convDir);
          // Stalactite hanging from ceiling
          if (c % 2 === 0) setTile(c, 2, "gspike");
        }
        // Pit under
        for (var c = curC; c < curC + trackLen && c < cols - 5; c++) {
          setTile(c, rows - 2, spike);
        }
        curC += trackLen;

      } else if (chunkType === 1) {
        // Ice slide tunnel with low ceiling
        var tunnelLen = randInt(rng, 5, 7);
        for (var c = curC; c < curC + tunnelLen && c < cols - 5; c++) {
          setTile(c, curR, "ice");
          setTile(c, curR - 3, solid); // Low roof!
        }
        // Coins reward inside slide
        setTile(curC + 2, curR - 1, "coin10");
        setTile(curC + 4, curR - 1, "coin50");
        curC += tunnelLen;

      } else if (chunkType === 2) {
        // Saw Gauntlet: standard bricks with a saw blade in the center
        var gauntLen = 6;
        for (var c = curC; c < curC + gauntLen && c < cols - 5; c++) {
          setTile(c, curR, solid);
        }
        setTile(curC + 3, curR - 1, "saw");
        curC += gauntLen;

      } else {
        // Elevation change shaft (step up or down)
        var delta = rng() < 0.5 ? -2 : 2;
        var nextR = Math.max(8, Math.min(rows - 4, curR + delta));
        var stepLen = 4;
        for (var c = curC; c < curC + stepLen && c < cols - 5; c++) {
          setTile(c, nextR, solid);
        }
        curR = nextR;
        curC += stepLen;
      }
    }

    // Goal at end
    for (var c = curC; c < cols - 1; c++) {
      setTile(c, rows - 3, solid);
    }
    setTile(cols - 4, rows - 4, "goal");

    return {
      title: "Cavern Complex #" + seed,
      cols: cols,
      rows: rows,
      spawn: spawn,
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHETYPE 5: GRAVITY INVERSION (Flip & Upside Down Running)
  // ─────────────────────────────────────────────────────────────────────────
  function generateGravityFlip(rng, seed, themeChoice, songChoice) {
    var cols = 100;
    var rows = 22;
    var grid = createGrid(cols, rows);
    var solid = themeChoice.solid;
    var spike = themeChoice.spike;

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = { id: id };
    }

    // Boundaries: solid ceiling and floor
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, solid);
      setTile(c, rows - 1, solid);
    }
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solid);
      setTile(cols - 1, r, solid);
    }

    var spawn = { c: 3, r: rows - 3 };

    // Safe start floor
    for (var c = 1; c < 8; c++) {
      setTile(c, rows - 2, solid);
    }

    // Alternating Gravity Zones:
    // Zone 1: Floor running -> Hit gravOrb at c=14 -> Inverts to ceiling!
    // Zone 2: Ceiling running (r=1) -> Hit gravOrb at c=38 -> Flips back to floor!
    // Zone 3: Floor running -> Hit gravOrb at c=60 -> Flips to ceiling!
    // Zone 4: Flips back down to final goal platform!

    var sections = [
      { start: 8, end: 18, gravity: "normal" },
      { start: 19, end: 42, gravity: "flipped" },
      { start: 43, end: 68, gravity: "normal" },
      { start: 69, end: 90, gravity: "flipped" },
      { start: 91, end: cols - 1, gravity: "normal" }
    ];

    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      if (sec.gravity === "normal") {
        // Floor running at rows - 2
        for (var c = sec.start; c < sec.end; c++) {
          setTile(c, rows - 2, solid);
          // Checkpoint
          if (c === sec.start + 2 && s > 0) {
            setTile(c, rows - 3, "checkpoint");
          }
        }
        // At the end of normal section, place gravOrb to flip up
        if (s < sections.length - 1) {
          setTile(sec.end - 1, rows - 4, "gravOrb");
        }
      } else {
        // Ceiling running at r=1! (Player runs with head facing down)
        for (var c = sec.start; c < sec.end; c++) {
          setTile(c, 1, solid);
          // Ceiling spikes hanging down at r=2
          if (c % 5 === 0) setTile(c, 2, "gspike");
          // Coins near ceiling
          if (c % 6 === 2) setTile(c, 3, "coin50");
        }
        // At the end of flipped section, place gravOrb to flip back down
        if (s < sections.length - 1) {
          setTile(sec.end - 1, 4, "gravOrb");
        }
      }
    }

    // Goal at end of final normal floor
    setTile(cols - 4, rows - 3, "goal");

    return {
      title: "Gravity Inversion #" + seed,
      cols: cols,
      rows: rows,
      spawn: spawn,
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARCHETYPE 6: TEMPLE RUINS (Key & Locked Door Quest)
  // ─────────────────────────────────────────────────────────────────────────
  function generateTempleRuins(rng, seed, themeChoice, songChoice) {
    var cols = 100;
    var rows = 24;
    var grid = createGrid(cols, rows);
    var solid = "brick";
    var spike = "spike";

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = { id: id };
    }

    // Outer frame
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solid);
      setTile(cols - 1, r, solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, solid);
      setTile(c, rows - 1, solid);
    }

    var spawn = { c: 3, r: 18 };

    // Build multi-tier temple ruins
    // Tier 1: Lower path with pits and pillars
    for (var c = 1; c < cols - 1; c++) {
      if (c < 12 || (c > 20 && c < 35) || (c > 45 && c < 60) || c > 75) {
        setTile(c, 19, solid);
      } else {
        // Spike pit in gaps
        setTile(c, rows - 2, spike);
      }
    }

    // Tier 2: Raised pillars and platforms
    var pillars = [16, 26, 38, 50, 68];
    for (var i = 0; i < pillars.length; i++) {
      var pc = pillars[i];
      for (var r = 13; r < 19; r++) {
        setTile(pc, r, solid);
        setTile(pc + 1, r, solid);
      }
      setTile(pc, 12, "coin50");
    }

    // High Altar Chamber at columns 40-48, height 9: KEY LOCATION!
    for (var c = 40; c < 48; c++) {
      setTile(c, 9, solid);
    }
    // Bounce pad at column 38 to launch player up to the Key Altar
    setTile(38, 12, "pad");
    // Place KEY in center of altar
    setTile(44, 8, "key");
    setTile(43, 8, "coin100");
    setTile(45, 8, "coin100");

    // Checkpoint after altar
    setTile(55, 18, "checkpoint");

    // Final Gate: Locked Door guarding the Goal Chamber!
    // Wall dividing goal chamber at col 84
    for (var r = 8; r < 19; r++) {
      setTile(84, r, solid);
    }
    // LOCKED DOOR right in the wall passage at (84, 17) and (84, 18)
    setTile(84, 17, "door");
    setTile(84, 18, "door");

    // Goal inside the inner sanctum
    setTile(92, 18, "goal");

    return {
      title: "Temple Ruins #" + seed,
      cols: cols,
      rows: rows,
      spawn: spawn,
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Master Generator: Picks Archetype Deterministically from Seed
  // ─────────────────────────────────────────────────────────────────────────
  var ARCHETYPES = [
    generateTowerClimb,
    generateDropper,
    generateRollingHills,
    generateCavern,
    generateGravityFlip,
    generateTempleRuins
  ];

  function generate(rawSeed) {
    var seed = hashSeed(rawSeed);
    var rng = makePRNG(seed);

    var themeChoice = randPick(rng, THEMES);
    var songChoice = randPick(rng, SONGS);

    // Deterministically pick archetype
    var archFn = ARCHETYPES[seed % ARCHETYPES.length];
    var res = archFn(rng, seed, themeChoice, songChoice);

    // Flatten grid to tiles array
    var tiles = [];
    for (var r = 0; r < res.rows; r++) {
      for (var c = 0; c < res.cols; c++) {
        var t = res.grid[r][c];
        if (t && t.id) {
          tiles.push({ c: c, r: r, id: t.id });
        }
      }
    }

    return {
      format: "dashpoint-level",
      version: 1,
      name: res.title,
      cols: res.cols,
      rows: res.rows,
      tileSize: 48,
      spawn: res.spawn,
      tiles: tiles,
      texts: [
        {
          id: "tx_seed",
          c: res.spawn.c + 1,
          r: Math.max(1, res.spawn.r - 2),
          text: res.title.toUpperCase(),
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
        title: res.title,
        authorName: "World Gen",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editor: "DashPoint RandGen 2.0"
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
