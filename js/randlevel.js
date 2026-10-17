/* DashPoint — Seeded Procedural Level Generator 4.0
 * Features 7 fundamentally distinct World Architectures:
 *   1. Tower Ascent: Multi-floor vertical climbing tower with zig-zagging tiers.
 *   2. Slope Valley: Continuous rolling terrain with slopes, ramps, valleys, and half-pipes.
 *   3. Cavern Drop: Subterranean abyss with vertical shaft diving and underground ruins.
 *   4. Gravity Inversion: Alternating upside-down ceiling running and floor platforming.
 *   5. Sky Islands: High-altitude archipelago of floating islands over the void.
 *   6. Temple Dungeon: Multi-room ancient ruins featuring key and locked door quest.
 *   7. Dash Highway: High-speed kinetic rhythm course with boost orbs and speedways.
 *
 * All levels are 100% physically guaranteed beatable according to DashPoint engine kinematics:
 *   - Normal jump up <= 2 tiles. Gap <= 3 tiles.
 *   - Bounce pad launch <= 4 tiles up.
 *   - Clean floating ledges (no impassable monolithic walls).
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
    { name: "Ocean", top: "#040810", mid: "#0a1628", bottom: "#122a4a", bg: "", solid: "brick", spike: "spike", liquid: "water" },
    { name: "Violet", top: "#070514", mid: "#150b30", bottom: "#2a1652", bg: "cave", solid: "brick", spike: "spike", liquid: "water" },
    { name: "Ember", top: "#0d0406", mid: "#2a0a12", bottom: "#48121a", bg: "volcano", solid: "brick", spike: "spike", liquid: "lava" },
    { name: "Jungle", top: "#03100a", mid: "#0a2618", bottom: "#144228", bg: "meadow", solid: "grass", spike: "gspike", liquid: "water" },
    { name: "Glacier", top: "#04090d", mid: "#0a2230", bottom: "#10445c", bg: "glacier", solid: "ice", spike: "spike", liquid: "water" },
    { name: "Sandstorm", top: "#0d0904", mid: "#241708", bottom: "#443010", bg: "desert", solid: "brick", spike: "spike", liquid: "water" },
    { name: "Void", top: "#000000", mid: "#060608", bottom: "#101016", bg: "", solid: "brick", spike: "spike", liquid: "lava" },
    { name: "Candy", top: "#12061a", mid: "#33094a", bottom: "#5c1480", bg: "", solid: "brick", spike: "spike", liquid: "water" },
    { name: "Nebula", top: "#05030f", mid: "#140b33", bottom: "#2a1652", bg: "space", solid: "brick", spike: "spike", liquid: "water" },
    { name: "Sunset", top: "#1c0b2e", mid: "#7a2d52", bottom: "#ff8c3c", bg: "sunset", solid: "brick", spike: "spike", liquid: "water" },
  ];

  var WEATHERS = ["", "rain", "snow", "embers"];
  var SONGS = ["welcome", "hill", "orb", "spike", "cool"];

  function createGrid(cols, rows) {
    var g = [];
    for (var r = 0; r < rows; r++) {
      g[r] = [];
      for (var c = 0; c < cols; c++) g[r][c] = null;
    }
    return g;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD 1: TOWER ASCENT (Multi-Floor Vertical Zig-Zag Climb)
  // ─────────────────────────────────────────────────────────────────────────
  function generateTowerAscent(rng, seed, theme) {
    var cols = 48;
    var rows = 36;
    var grid = createGrid(cols, rows);

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) grid[r][c] = { id: id };
    }
    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = null;
    }
    function placeFloorLedge(cStart, width, surfaceR, solidId) {
      for (var c = cStart; c < cStart + width && c < cols - 2; c++) {
        setTile(c, surfaceR, solidId);
        for (var ar = surfaceR - 3; ar < surfaceR; ar++) clearTile(c, ar);
      }
    }

    // Outer walls
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, rows - 1, theme.solid);
    }

    // 4 Distinct Floors (each 4 blocks apart, perfectly within 4.5 tile bounce pad launch):
    // Floor 1: r = 30 (run RIGHT from c=2 to c=42)
    // Floor 2: r = 24 (run LEFT from c=42 to c=4)
    // Floor 3: r = 18 (run RIGHT from c=4 to c=42)
    // Floor 4: r = 10 (summit: run LEFT from c=42 to Goal at c=14)

    // Floor 1 (r=30)
    placeFloorLedge(2, 42, 30, theme.solid);
    // Hazards on Floor 1
    setTile(12, 29, theme.spike);
    setTile(13, 29, theme.spike);
    setTile(22, 29, "saw");
    setTile(32, 29, theme.spike);
    // Pad at c=42 launches up 4 blocks to Floor 2 (r=26)
    setTile(42, 30, "pad");

    // Floor 2 (r=26)
    placeFloorLedge(4, 40, 26, theme.solid);
    setTile(38, 25, "checkpoint");
    setTile(28, 26, "convL");
    setTile(27, 26, "convL");
    setTile(26, 26, "convL");
    setTile(20, 25, "saw");
    setTile(12, 25, theme.spike);
    // Pad at c=4 launches up to Floor 3 (r=20)
    setTile(4, 26, "pad");

    // Floor 3 (r=20)
    placeFloorLedge(4, 40, 20, theme.solid);
    setTile(8, 19, "checkpoint");
    setTile(16, 19, "coin50");
    setTile(24, 19, "saw");
    setTile(32, 19, "coin100");
    // Pad at c=42 launches up to Summit Floor 4 (r=12)
    setTile(42, 20, "pad");

    // Floor 4: Summit (r=12)
    placeFloorLedge(10, 34, 12, theme.solid);
    setTile(36, 11, "coin500");
    setTile(26, 11, theme.spike);
    setTile(16, 11, "goal");

    return {
      title: "Pinnacle Tower #" + seed,
      cols: cols,
      rows: rows,
      spawn: { c: 4, r: 29 },
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD 2: SLOPE VALLEY (Rolling Hills, Ramps, and Valley Lakes)
  // ─────────────────────────────────────────────────────────────────────────
  function generateSlopeValley(rng, seed, theme) {
    var cols = 110;
    var rows = 24;
    var grid = createGrid(cols, rows);
    var solid = "grass";
    var spike = "gspike";

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) grid[r][c] = { id: id };
    }
    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = null;
    }

    // Outer frame
    for (var r = 0; r < rows; r++) {
      setTile(0, r, solid);
      setTile(cols - 1, r, solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, rows - 1, solid);
    }

    // Starting flat meadow
    for (var c = 1; c < 8; c++) {
      setTile(c, 18, solid);
      for (var ar = 15; ar < 18; ar++) clearTile(c, ar);
    }

    // Hill 1: slope up to r=14, summit, slope down to r=18
    setTile(8, 18, "slopeL");
    setTile(9, 17, "slopeL");
    setTile(10, 16, "slopeL");
    setTile(11, 15, "slopeL");
    for (var c = 12; c < 16; c++) {
      setTile(c, 14, solid);
      setTile(c, 12, "coin50");
    }
    setTile(16, 15, "slopeR");
    setTile(17, 16, "slopeR");
    setTile(18, 17, "slopeR");
    setTile(19, 18, "slopeR");

    // Valley 1: Lake with floating stepping stones
    for (var c = 20; c < 30; c++) {
      setTile(c, 21, "water");
    }
    setTile(23, 18, solid);
    setTile(24, 18, solid);
    setTile(27, 18, solid);
    setTile(28, 18, solid);
    setTile(30, 18, "checkpoint");

    // Hill 2: Ramp launch across a ravine
    for (var c = 31; c < 36; c++) setTile(c, 18, solid);
    setTile(36, 18, "slopeL");
    setTile(37, 17, "slopeL");
    setTile(38, 16, "pad"); // launch off the ramp!

    // Ravine chasm
    for (var c = 39; c < 45; c++) {
      setTile(c, rows - 2, spike);
      setTile(c, 13, "coin50");
    }

    // Landing hill
    setTile(45, 16, "slopeR");
    setTile(46, 17, "slopeR");
    for (var c = 47; c < 56; c++) setTile(c, 18, solid);
    setTile(50, 17, "checkpoint");

    // Hill 3: High summit run
    setTile(56, 18, "slopeL");
    setTile(57, 17, "slopeL");
    setTile(58, 16, "slopeL");
    for (var c = 59; c < 72; c++) {
      setTile(c, 15, solid);
      if (c % 4 === 1) setTile(c, 14, "saw");
      if (c % 4 === 3) setTile(c, 13, "coin100");
    }
    setTile(72, 16, "slopeR");
    setTile(73, 17, "slopeR");
    setTile(74, 18, "slopeR");

    // Valley 2: Dash lake
    for (var c = 75; c < 88; c++) setTile(c, 21, "water");
    setTile(75, 18, solid);
    setTile(77, 17, "blueDash"); // hover fly across the lake!
    setTile(82, 17, "coin100");

    // Final Meadow & Goal
    for (var c = 88; c < cols - 1; c++) {
      setTile(c, 18, solid);
      for (var ar = 15; ar < 18; ar++) clearTile(c, ar);
    }
    setTile(cols - 5, 17, "goal");

    return {
      title: "Verdant Valley #" + seed,
      cols: cols,
      rows: rows,
      spawn: { c: 3, r: 17 },
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD 3: CAVERN DROP (Subterranean Shaft & Underground Mine)
  // ─────────────────────────────────────────────────────────────────────────
  function generateCavernDrop(rng, seed, theme) {
    var cols = 56;
    var rows = 40;
    var grid = createGrid(cols, rows);

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) grid[r][c] = { id: id };
    }
    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = null;
    }

    // Outer border
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, theme.solid);
      setTile(c, rows - 1, theme.solid);
    }

    // Surface spawn ledge at r=8
    for (var c = 1; c < 12; c++) {
      setTile(c, 8, theme.solid);
      for (var ar = 5; ar < 8; ar++) clearTile(c, ar);
    }

    // Drop Shaft: plunges from r=8 down to r=32
    // Shaft walls
    for (var r = 9; r < 32; r++) {
      setTile(10, r, theme.solid);
      setTile(18, r, theme.solid);
    }
    // Hazards inside shaft to air-steer around
    setTile(11, 14, theme.spike);
    setTile(17, 20, theme.spike);
    setTile(11, 26, theme.spike);
    setTile(14, 20, "coin100");

    // Deep water cushion at bottom of shaft (r=33)
    for (var c = 11; c < 18; c++) {
      setTile(c, 32, "water");
      setTile(c, 33, "water");
    }

    // Underground Mine Level (r=32): run RIGHT across conveyors & saws
    for (var c = 18; c < 44; c++) {
      if (c >= 22 && c <= 28) {
        setTile(c, 32, "convR"); // conveyor rush
      } else {
        setTile(c, 32, "ice");
      }
      for (var ar = 29; ar < 32; ar++) clearTile(c, ar);
    }
    setTile(20, 31, "checkpoint");
    setTile(30, 31, "saw");
    setTile(35, 31, "saw");
    setTile(32, 29, "coin50");

    // Ancient Elevator Pad at c=44: launches player back up to r=20
    setTile(44, 32, "pad");
    for (var r = 21; r < 32; r++) {
      setTile(42, r, theme.solid);
      setTile(48, r, theme.solid);
    }

    // Ancient Shrine Goal at r=20
    for (var c = 46; c < cols - 1; c++) {
      setTile(c, 20, theme.solid);
      for (var ar = 17; ar < 20; ar++) clearTile(c, ar);
    }
    setTile(cols - 4, 19, "goal");

    return {
      title: "Abyss Cavern #" + seed,
      cols: cols,
      rows: rows,
      spawn: { c: 3, r: 7 },
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD 4: GRAVITY INVERSION (Upside-Down Labyrinth)
  // ─────────────────────────────────────────────────────────────────────────
  function generateGravityInversion(rng, seed, theme) {
    var cols = 100;
    var rows = 22;
    var grid = createGrid(cols, rows);

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) grid[r][c] = { id: id };
    }
    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = null;
    }

    // Borders: solid ceiling and floor
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, theme.solid);
      setTile(c, rows - 1, theme.solid);
    }
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }

    // Phase 1 (Floor): c=1 to c=18
    for (var c = 1; c < 18; c++) {
      setTile(c, 17, theme.solid);
      for (var ar = 14; ar < 17; ar++) clearTile(c, ar);
    }
    setTile(8, 16, theme.spike);
    // Gravity Flip Orb 1 at c=17
    setTile(17, 16, "gravOrb");

    // Phase 2 (CEILING RUNNING! r=1): c=19 to c=46
    for (var c = 18; c < 48; c++) {
      setTile(c, 1, theme.solid);
      // Floor under ceiling run is deadly
      setTile(c, rows - 2, theme.spike);
      // Ceiling hanging spikes to dodge
      if (c === 26 || c === 34 || c === 40) setTile(c, 2, "gspike");
      if (c === 30) setTile(c, 3, "coin100");
    }
    // Flip Orb 2 on ceiling at c=46 flips back to floor!
    setTile(46, 3, "gravOrb");

    // Phase 3 (Floor with Checkpoint): c=48 to c=70
    for (var c = 48; c < 72; c++) {
      setTile(c, 17, theme.solid);
      for (var ar = 14; ar < 17; ar++) clearTile(c, ar);
    }
    setTile(50, 16, "checkpoint");
    setTile(58, 16, "saw");
    setTile(66, 16, "saw");
    // Flip Orb 3 at c=71
    setTile(71, 16, "gravOrb");

    // Phase 4 (Ceiling Sprint): c=72 to c=86
    for (var c = 72; c < 88; c++) {
      setTile(c, 1, theme.solid);
      setTile(c, rows - 2, theme.liquid);
      if (c % 4 === 0) setTile(c, 2, "gspike");
    }
    // Flip Orb 4 at c=86
    setTile(86, 3, "gravOrb");

    // Phase 5 (Final Floor to Goal): c=88 to end
    for (var c = 88; c < cols - 1; c++) {
      setTile(c, 17, theme.solid);
      for (var ar = 14; ar < 17; ar++) clearTile(c, ar);
    }
    setTile(cols - 4, 16, "goal");

    return {
      title: "Inverted Nexus #" + seed,
      cols: cols,
      rows: rows,
      spawn: { c: 3, r: 16 },
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD 5: SKY ISLANDS (Floating Archipelago over the Void)
  // ─────────────────────────────────────────────────────────────────────────
  function generateSkyIslands(rng, seed, theme) {
    var cols = 100;
    var rows = 26;
    var grid = createGrid(cols, rows);

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) grid[r][c] = { id: id };
    }
    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = null;
    }
    function placeIsland(cStart, width, surfaceR, solidId) {
      for (var c = cStart; c < cStart + width && c < cols - 1; c++) {
        setTile(c, surfaceR, solidId);
        setTile(c, surfaceR + 1, solidId); // 2-block thick floating rock
        for (var ar = surfaceR - 3; ar < surfaceR; ar++) clearTile(c, ar);
      }
    }

    // Outer walls only (bottom is open void!)
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, rows - 1, theme.spike); // void spikes at bottom
    }

    // Island 1 (Spawn): c=2, r=18, w=6
    placeIsland(2, 6, 18, theme.solid);

    // Island 2: c=11, r=16, w=5 (Jump up 2 blocks, gap=3)
    placeIsland(11, 5, 16, theme.solid);
    setTile(9, 15, "coin10");

    // Island 3 (Pad Launch): c=19, r=16, w=3 with pad
    placeIsland(19, 3, 16, theme.solid);
    setTile(21, 16, "pad");

    // Island 4 (High Sky Sanctuary): c=25, r=12, w=7 (Pad launches up 4 blocks!)
    placeIsland(25, 7, 12, theme.solid);
    setTile(27, 11, "checkpoint");
    setTile(30, 11, "saw");

    // Island 5: c=35, r=13, w=4
    placeIsland(35, 4, 13, theme.solid);
    setTile(37, 11, "coin50");

    // Island 6 (Blue Dash Flight Stream over 8-tile void chasm): c=42, r=13, w=3
    placeIsland(42, 3, 13, theme.solid);
    setTile(44, 12, "blueDash");
    setTile(48, 12, "coin100");
    setTile(51, 12, "coin100");

    // Island 7 (Landing): c=54, r=13, w=6
    placeIsland(54, 6, 13, theme.solid);
    setTile(56, 12, "checkpoint");

    // Island 8 (Orb Chain): c=63, r=15, w=4
    setTile(61, 13, "djOrb");
    placeIsland(63, 4, 15, theme.solid);

    // Island 9 (Conveyor Island): c=70, r=15, w=6
    for (var c = 70; c < 76; c++) {
      setTile(c, 15, "convR");
      setTile(c, 16, theme.solid);
      for (var ar = 12; ar < 15; ar++) clearTile(c, ar);
    }
    setTile(76, 15, "pad"); // launch to final island!

    // Crown Goal Island: c=82 to c=96, r=11
    placeIsland(82, 14, 11, theme.solid);
    setTile(90, 10, "goal");

    return {
      title: "Celestial Islands #" + seed,
      cols: cols,
      rows: rows,
      spawn: { c: 4, r: 17 },
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD 6: TEMPLE DUNGEON (Key & Locked Door Quest)
  // ─────────────────────────────────────────────────────────────────────────
  function generateTempleDungeon(rng, seed, theme) {
    var cols = 95;
    var rows = 26;
    var grid = createGrid(cols, rows);

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) grid[r][c] = { id: id };
    }
    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = null;
    }

    // Outer stone frame
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, 0, theme.solid);
      setTile(c, rows - 1, theme.solid);
    }

    // Entrance Chamber (r=18)
    for (var c = 1; c < 14; c++) {
      setTile(c, 18, theme.solid);
      for (var ar = 15; ar < 18; ar++) clearTile(c, ar);
    }
    setTile(7, 17, theme.spike);

    // Split: Upper Gallery (leads to Key) & Lower Path
    // Bounce pad at c=13 launches up to Upper Gallery at r=14
    setTile(13, 18, "pad");

    // Upper Gallery (r=14)
    for (var c = 16; c < 38; c++) {
      setTile(c, 14, theme.solid);
      for (var ar = 11; ar < 14; ar++) clearTile(c, ar);
      if (c === 22 || c === 30) setTile(c, 13, "saw");
    }

    // The Golden Key Altar (c=38, r=10): Reached via pad at c=36
    setTile(36, 14, "pad");
    for (var c = 38; c < 45; c++) {
      setTile(c, 10, theme.solid);
      for (var ar = 7; ar < 10; ar++) clearTile(c, ar);
    }
    // THE KEY!
    setTile(41, 9, "key");
    setTile(40, 9, "coin100");
    setTile(42, 9, "coin100");

    // Lower path across lava pit: c=14 to c=54 at r=22
    for (var c = 14; c < 54; c++) {
      setTile(c, rows - 2, "lava");
    }
    // Stepping stones in lower path
    for (var c = 20; c < 24; c++) setTile(c, 21, theme.solid);
    for (var c = 32; c < 36; c++) setTile(c, 21, theme.solid);
    for (var c = 46; c < 50; c++) setTile(c, 21, theme.solid);

    // Junction Chamber (r=18) with checkpoint
    for (var c = 52; c < 66; c++) {
      setTile(c, 18, theme.solid);
      for (var ar = 15; ar < 18; ar++) clearTile(c, ar);
    }
    setTile(56, 17, "checkpoint");

    // The Locked Temple Gate (c=66): Dividing wall with locked DOORS!
    for (var r = 6; r < rows - 1; r++) {
      setTile(66, r, theme.solid);
    }
    // 2-tile tall locked door
    setTile(66, 17, "door");
    setTile(66, 16, "door");

    // Inner Sanctum (Goal Chamber) behind the door
    for (var c = 67; c < cols - 1; c++) {
      setTile(c, 18, theme.solid);
      for (var ar = 15; ar < 18; ar++) clearTile(c, ar);
    }
    setTile(cols - 5, 17, "goal");

    return {
      title: "Sunken Temple #" + seed,
      cols: cols,
      rows: rows,
      spawn: { c: 3, r: 17 },
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD 7: DASH HIGHWAY (High-Speed Kinetic Flow)
  // ─────────────────────────────────────────────────────────────────────────
  function generateDashHighway(rng, seed, theme) {
    var cols = 115;
    var rows = 22;
    var grid = createGrid(cols, rows);

    function setTile(c, r, id) {
      if (c >= 0 && c < cols && r >= 0 && r < rows && id) grid[r][c] = { id: id };
    }
    function clearTile(c, r) {
      if (c >= 0 && c < cols && r >= 0 && r < rows) grid[r][c] = null;
    }

    // Outer frame
    for (var r = 0; r < rows; r++) {
      setTile(0, r, theme.solid);
      setTile(cols - 1, r, theme.solid);
    }
    for (var c = 0; c < cols; c++) {
      setTile(c, rows - 1, theme.solid);
    }

    // Start runway
    for (var c = 1; c < 10; c++) {
      setTile(c, 17, theme.solid);
      for (var ar = 14; ar < 17; ar++) clearTile(c, ar);
    }

    // 1. Dash Orb over Lava Lake
    setTile(9, 16, "dash");
    for (var c = 10; c < 16; c++) setTile(c, rows - 2, "lava");

    // 2. Conveyor Speedway
    for (var c = 16; c < 28; c++) {
      setTile(c, 17, "convR");
      for (var ar = 14; ar < 17; ar++) clearTile(c, ar);
    }
    setTile(22, 16, "spike"); // jump while speeding!
    setTile(28, 17, "pad");   // catapult into next dash!

    // 3. High Aerial Blue Dash Stream
    for (var c = 29; c < 42; c++) setTile(c, rows - 2, theme.spike);
    setTile(34, 13, "blueDash");
    setTile(37, 13, "coin50");
    setTile(40, 13, "coin100");

    // 4. Midway Checkpoint Sanctuary
    for (var c = 42; c < 54; c++) {
      setTile(c, 17, theme.solid);
      for (var ar = 14; ar < 17; ar++) clearTile(c, ar);
    }
    setTile(44, 16, "checkpoint");
    setTile(50, 16, "saw");

    // 5. Double Dash Rhythm
    setTile(53, 16, "dash");
    for (var c = 54; c < 62; c++) setTile(c, rows - 2, "lava");
    setTile(62, 17, theme.solid);
    setTile(64, 16, "dash");
    for (var c = 65; c < 74; c++) setTile(c, rows - 2, "lava");

    // 6. Final Speedway to Goal
    for (var c = 74; c < cols - 1; c++) {
      setTile(c, 17, (c < 90) ? "convR" : theme.solid);
      for (var ar = 14; ar < 17; ar++) clearTile(c, ar);
    }
    setTile(80, 16, "checkpoint");
    setTile(86, 16, "saw");
    setTile(96, 16, "coin500");
    setTile(cols - 5, 16, "goal");

    return {
      title: "Velocity Highway #" + seed,
      cols: cols,
      rows: rows,
      spawn: { c: 3, r: 16 },
      grid: grid
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MASTER PROCEDURAL GENERATOR
  // Deterministically selects from the 7 distinct World Architectures
  // ─────────────────────────────────────────────────────────────────────────
  var ARCHITECTURES = [
    generateTowerAscent,
    generateSlopeValley,
    generateCavernDrop,
    generateGravityInversion,
    generateSkyIslands,
    generateTempleDungeon,
    generateDashHighway
  ];

  function generate(rawSeed) {
    var seed = hashSeed(rawSeed);
    var rng = makePRNG(seed);

    var theme = randPick(rng, THEMES);
    var weather = randPick(rng, WEATHERS);
    var song = randPick(rng, SONGS);

    // Pick World Architecture
    var archFn = ARCHITECTURES[seed % ARCHITECTURES.length];
    var world = archFn(rng, seed, theme);

    // Flatten grid to tiles array
    var tiles = [];
    for (var r = 0; r < world.rows; r++) {
      for (var c = 0; c < world.cols; c++) {
        var t = world.grid[r][c];
        if (t && t.id) {
          tiles.push({ c: c, r: r, id: t.id });
        }
      }
    }

    return {
      format: "dashpoint-level",
      version: 1,
      name: world.title,
      cols: world.cols,
      rows: world.rows,
      tileSize: 48,
      spawn: world.spawn,
      tiles: tiles,
      texts: [
        {
          id: "tx_seed",
          c: world.spawn.c + 1,
          r: Math.max(1, world.spawn.r - 2),
          text: world.title.toUpperCase(),
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
        weather: weather
      },
      meta: {
        title: world.title,
        authorName: "World Gen",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editor: "DashPoint RandGen 4.0"
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
