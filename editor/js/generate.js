/* DashPoint editor — procedural “AI” course generator */
window.DashPointGenerate = {
  generate: function (DP) {
    function ri(a, b) {
      return a + Math.floor(Math.random() * (b - a + 1));
    }
    function pick(arr) {
      return arr[(Math.random() * arr.length) | 0];
    }
    function chance(p) {
      return Math.random() < p;
    }

    const NAMES = ["AI Run", "Circuit", "Spark", "Dashline", "Forge", "Pulse", "Rivet", "Vector", "Glitch Course", "Auto Parkour"];
    const cols = ri(68, 104);
    const rows = ri(18, 22);
    const theme = pick(DP.THEMES || [{ top: "#040810", mid: "#0a1628", bottom: "#122a4a" }]);
    const level = new DP.Level({
      name: pick(NAMES) + " " + ri(10, 99),
      cols: cols,
      rows: rows,
      theme: theme,
    });

    function inb(c, r) {
      return c >= 0 && r >= 0 && c < cols && r < rows;
    }
    function set(c, r, id, rot) {
      if (!inb(c, r)) return;
      level.set(c, r, { id: id, rot: rot || 0 });
    }
    function brick(c, r) {
      set(c, r, "brick");
    }
    function hazard(c, r, rot) {
      set(c, r, chance(0.12) ? "ispike" : "spike", rot || 0);
    }
    function plat(c0, c1, surface, depth) {
      depth = depth || 2;
      if (c1 < c0) {
        const t = c0;
        c0 = c1;
        c1 = t;
      }
      for (let c = c0; c <= c1; c++) {
        for (let d = 0; d < depth; d++) brick(c, surface + d);
      }
    }
    function clampSurf(s) {
      return Math.max(5, Math.min(rows - 3, s));
    }

    const startSurf = rows - 2;
    plat(0, 7, startSurf, 2);
    level.spawn = { c: 2, r: startSurf - 1 };
    level.texts = [
      { c: 2, r: Math.max(2, startSurf - 5), text: "AI COURSE", color: "#ffffff", scale: 2 },
    ];

    let x = 8;
    let surf = startSurf;
    let sinceCp = 0;
    let lastKind = "start";

    function land(width, nextSurf, extras) {
      extras = extras || {};
      nextSurf = clampSurf(nextSurf);
      width = Math.max(3, width);
      const end = Math.min(cols - 9, x + width - 1);
      plat(x, end, nextSurf, extras.depth || 2);
      if (extras.spikes && end - x >= 4) {
        const a = x + 1;
        const b = end - 1;
        for (let c = a; c <= b; c += extras.spikeStep || 2) {
          if (c === a && extras.keepFirstClear) continue;
          hazard(c, nextSurf - 1, 0);
        }
      }
      if (extras.hang && end - x >= 3) {
        const hangR = Math.max(1, nextSurf - 4);
        for (let c = x + 1; c <= end - 1; c++) {
          if (chance(0.55)) hazard(c, hangR, 180);
        }
      }
      if (extras.pad && inb(end, nextSurf - 1)) set(end, nextSurf - 1, "pad");
      surf = nextSurf;
      sinceCp += end - x + 1;
      x = end + 1;
    }

    while (x < cols - 12) {
      const kinds = ["run", "run", "gap", "gap", "stairs", "float", "spikes", "orb", "pad", "ceil"];
      if (lastKind === "orb" || lastKind === "pad") kinds.push("run", "gap");
      let kind = pick(kinds);
      if (x < 14 && (kind === "orb" || kind === "pad")) kind = "run";

      if (kind === "run") {
        land(ri(4, 8), surf, { hang: chance(0.25) });
      } else if (kind === "gap") {
        x += ri(2, 4);
        land(ri(4, 7), surf + ri(-1, 1), { hang: chance(0.2) });
      } else if (kind === "stairs") {
        const dir = chance(0.55) ? -1 : 1;
        const steps = ri(3, 4);
        for (let i = 0; i < steps && x < cols - 12; i++) {
          land(2, surf + dir, { depth: 3 });
        }
      } else if (kind === "float") {
        x += ri(2, 3);
        land(ri(3, 5), surf + ri(-2, 1));
      } else if (kind === "spikes") {
        land(ri(6, 9), surf, { spikes: true, spikeStep: chance(0.4) ? 2 : 3, keepFirstClear: true });
      } else if (kind === "orb") {
        const gap = ri(4, 6);
        const mid = x + Math.floor(gap / 2);
        set(mid, clampSurf(surf - 2), "orb");
        x += gap;
        land(ri(4, 6), surf + ri(-1, 1));
      } else if (kind === "pad") {
        land(ri(3, 4), surf, { pad: true });
        x += ri(4, 6);
        land(ri(4, 6), clampSurf(surf - ri(1, 2)));
      } else if (kind === "ceil") {
        land(ri(5, 8), surf, { hang: true });
      }

      lastKind = kind;
      if (sinceCp >= ri(18, 26) && x < cols - 16) {
        const c0 = x;
        land(4, surf);
        const cc = c0 + 1;
        if (inb(cc, surf - 1) && !level.get(cc, surf - 1)) set(cc, surf - 1, "checkpoint");
        sinceCp = 0;
      }
    }

    plat(x, cols - 1, rows - 2, 2);
    const goalC = cols - 3;
    const goalR = rows - 3;
    set(goalC, goalR, "goal");
    level.spawn = { c: 2, r: startSurf - 1 };
    return level;
  },
};
