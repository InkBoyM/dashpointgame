/* DashPoint — the game */
(function () {
  const DP = window.DashPoint;
  const TILE = DP.TILE;
  const STORAGE = "dashpoint.game";
  const DIFF_FACES = ["diff-easy", "diff-normal", "diff-hard", "diff-harder", "diff-torture"];
  const DIFF_NAMES = ["Easy", "Normal", "Hard", "Harder", "Torture"];
  const LEVEL_DIFF = {
    "00_Welcome.dashpoint.json": 1,
    "Orb_run.dashpoint.json": 2,
    "spike_run.dashpoint.json": 3,
    "the_climb.dashpoint.json": 3,
    "The_Tunnel.dashpoint.json": 4,
    "Agony.dashpoint.json": 5,
    "The_Tower_of_Torture.dashpoint.json": 5,
  };

  function diffTier(d) {
    return Math.max(1, Math.min(5, d | 0 || 1));
  }

  function netDiff(meta) {
    let n = (meta && meta.difficulty) | 0 || 1;
    if (!meta || (meta.diffV | 0) < 2) {
      if (n >= 4) n = 5;
      else if (n >= 3) n = 4;
    }
    return diffTier(n);
  }

  function diffFaceImg(d, cls) {
    return '<img class="' + (cls || "n-diff-face") + '" src="assets/ui/' + DIFF_FACES[diffTier(d) - 1] + '.png" alt="" />';
  }

  function localDiff(file) {
    return LEVEL_DIFF[file] || 2;
  }

  const COIN_BY_TIER = [0, 10, 50, 100, 500, 1000];
  const COIN_PER_SKIN = 50;

  function isShopSkin(s) {
    return !!(s && s.unlock && s.unlock.type === "shop");
  }

  function isCodeSkin(s) {
    return !!(s && s.unlock && s.unlock.type === "code");
  }

  const REDEEM_CODES = {
    rich: { coins: 5000 },
    noob: { skin: 19 },
    imbad: { coins: 1000 },
    "did you just say your name was burger? do you come with fries? ahahahahahahaha": { skin: 20 },
  };

  function coinIcon(cls) {
    return '<img class="' + (cls || "coin-icon") + '" src="assets/ui/coin.png" alt="" />';
  }

  function coinsForFile(file, meta) {
    return COIN_BY_TIER[diffTier(fileDiff(file, meta))] || 0;
  }

  function fileDiff(file, meta) {
    if (meta) return netDiff(meta);
    if (file && String(file).indexOf("net:") === 0) {
      const id = String(file).slice(4);
      try {
        const net = window.DPNet;
        const sv = net && net.getSave && net.getSave(id);
        if (sv && sv.meta) return netDiff(sv.meta);
      } catch (e) {}
      try {
        if (levelIndexCache) {
          const m = levelIndexCache.find(function (l) { return l.id === id; });
          if (m) return netDiff(m);
        }
      } catch (e) {}
      return 0;
    }
    if (file) return localDiff(file);
    return 2;
  }

  function hasBeatenDiff(n) {
    n = diffTier(n);
    const beaten = save_.data.beaten || {};
    for (const file in beaten) {
      if (!Object.prototype.hasOwnProperty.call(beaten, file)) continue;
      if (fileDiff(file) === n) return true;
    }
    return false;
  }

  function grantCoins(n, key) {
    n = n | 0;
    if (n <= 0) return 0;
    save_.data.coinPaid = save_.data.coinPaid || {};
    if (key && save_.data.coinPaid[key]) return 0;
    if (key) save_.data.coinPaid[key] = true;
    save_.data.coins = (save_.data.coins | 0) + n;
    return n;
  }

  function migrateCoins() {
    save_.data.coins = save_.data.coins | 0;
    save_.data.coinPaid = save_.data.coinPaid || {};
    if (save_.data.coinMigrated) return;
    const beaten = save_.data.beaten || {};
    for (const file in beaten) {
      if (!Object.prototype.hasOwnProperty.call(beaten, file)) continue;
      grantCoins(coinsForFile(file), "level:" + file);
    }
    for (const s of SKINS) {
      if (isShopSkin(s) || isCodeSkin(s) || !s.unlock) continue;
      if (isUnlocked(s.id)) grantCoins(COIN_PER_SKIN, "skin:" + s.id);
    }
    save_.data.coinMigrated = true;
    save();
  }

  function syncCoinUI() {
    const html = coinIcon() + "<b>" + (save_.data.coins | 0) + "</b>";
    const a = el("skinsCoins");
    if (a) a.innerHTML = html;
    const b = el("shopCoins");
    if (b) b.innerHTML = html;
    const c = el("codesCoins");
    if (c) c.innerHTML = html;
  }

  const LEVEL_FILES = [
    "00_Welcome.dashpoint.json",
    "Orb_run.dashpoint.json",
    "spike_run.dashpoint.json",
    "the_climb.dashpoint.json",
    "Agony.dashpoint.json",
    "The_Tower_of_Torture.dashpoint.json",
    "The_Tunnel.dashpoint.json",
  ];

  const SKINS = window.DashPointSkins || [];
  const DEFAULT_KEYS = { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], jump: ["KeyW", "ArrowUp", "Space"] };

  const CLIMB_FILE = "the_climb.dashpoint.json";

  function defaultSave() {
    return { deaths: 0, jumps: 0, coins: 0, coinPaid: {}, coinMigrated: false, codes: {}, skin: 1, unlocked: [1, 2, 3, 4, 5], beaten: {}, best: {}, attempts: {}, hitboxes: false, debugFps: false, autoRespawn: true, spaceMenu: false };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return defaultSave();
      const s = Object.assign(defaultSave(), JSON.parse(raw));
      s.unlocked = Array.isArray(s.unlocked) ? s.unlocked : defaultSave().unlocked;
      s.beaten = s.beaten || {};
      s.best = s.best || {};
      s.attempts = s.attempts || {};
      s.spaceMenu = !!(s.spaceMenu || s.arcadeMenu);
      s.jumps = s.jumps | 0;
      s.coins = s.coins | 0;
      s.coinPaid = s.coinPaid && typeof s.coinPaid === "object" ? s.coinPaid : {};
      s.coinMigrated = !!s.coinMigrated;
      s.codes = s.codes && typeof s.codes === "object" ? s.codes : {};
      return s;
    } catch (e) {
      return defaultSave();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(save_.data));
    } catch (e) {}
  }

  let fpsFrames = 0;
  let fpsAcc = 0;
  function syncFpsVis() {
    const n = el("hudFps");
    if (!n) return;
    n.classList.toggle("hidden", !save_.data.debugFps);
  }
  function tickFps(dt) {
    if (!save_.data.debugFps) return;
    fpsFrames++;
    fpsAcc += dt;
    if (fpsAcc >= 0.25) {
      const fps = Math.round(fpsFrames / fpsAcc);
      fpsFrames = 0;
      fpsAcc = 0;
      const n = el("hudFps");
      if (n) n.textContent = "FPS " + fps;
    }
  }

  const save_ = { data: load() };

  const state = {
    screen: "home",
    images: null,
    levels: [],
    current: -1,
    netEntry: null,
    netBack: "network",
    engine: null,
    playing: false,
    deaths: 0,
    paused: false,
    shake: 0,
    keys: new Set(),
    lastFrame: 0,
  };

  // ---- Ghost + Online leaderboard ----
  let ghostTrail = [];
  let ghostPlayback = null;
  let ghostMode = false;
  let ghostStartTime = 0;
  let ghostCountdownTimer = null;
  let lastGhostPoint = 0;

  function resetGhostTrail(){ ghostTrail = []; ghostPlayback = null; lastGhostPoint = 0; }
  function recordGhost(dt){
    if (!state.playing || !state.engine || state.engine.dead || state.engine.won) return;
    lastGhostPoint += dt;
    if (lastGhostPoint < 0.05) return;
    lastGhostPoint = 0;
    ghostTrail.push({ x: state.engine.player.x, y: state.engine.player.y, rot: state.engine.player.rot, t: state.engine.time });
    if (ghostTrail.length > 4000) ghostTrail.shift();
  }
  function getGhostForLevel(file){
    try {
      var local = null;
      if (window.DPNet && DPNet.getGhostLocal) local = DPNet.getGhostLocal(file);
      return local;
    } catch(e){ return null; }
  }
  async function startGhostRace(){
    if (state.screen !== "game") return;
    if (!state.levels.length && !state.netEntry) return;
    var entry = state.netEntry || state.levels[state.current];
    var file = entry ? entry.file : (state.currentFile || "unknown");
    var ghost = getGhostForLevel(file);
    if (!ghost || !ghost.points || !ghost.points.length) {
      showNotice("No ghost for this level yet — finish once to create one", true);
      return;
    }
    runGhostRace(ghost);
  }
  function runGhostRace(ghost) {
    ghostPlayback = ghost;
    ghostMode = true;
    restartLevel();
    var cdEl = el("ghostCountdown");
    var count = 3;
    if (cdEl) { cdEl.textContent = count; cdEl.classList.remove("hidden"); }
    state.playing = false;
    if (ghostCountdownTimer) clearInterval(ghostCountdownTimer);
    ghostCountdownTimer = setInterval(function(){
      count--;
      if (cdEl) cdEl.textContent = count > 0 ? count : "GO!";
      if (count <= 0) {
        clearInterval(ghostCountdownTimer); ghostCountdownTimer = null;
        if (cdEl) setTimeout(function(){ cdEl.classList.add("hidden"); }, 600);
        state.playing = true;
        ghostStartTime = state.engine ? state.engine.time : 0;
        // ensure engine time is 0
        if (state.engine) { state.engine.time = 0; ghostTrail = []; }
      } else if (count>0 && cdEl) {
        try{ var b = (window.DashPointAndroidBridge||window.DashPointBridge); if(b&&b.hapticTick) b.hapticTick(); }catch(e){}
      }
    }, 700);
  }
  async function raceGhost(uid, name) {
    if (state.screen !== "game") return;
    var entry = state.netEntry || state.levels[state.current];
    if (!entry) return;
    var file = entry.file || entry.id || entry.currentFile || "unknown";
    try {
      var ghost = await DPNet.getGhostCloud(file, uid);
      if (!ghost || !ghost.points || !ghost.points.length) {
        showNotice("No ghost available for " + (name||"this player") + " on this level", true);
        return;
      }
      ghost.skin = ghost.skin || 1;
      showNotice("Racing " + (name||"player") + "'s ghost!", false);
      runGhostRace(ghost);
    } catch(e){
      showNotice("Couldn't load ghost: " + (e.message||e), true);
    }
  }
  function getGhostPos(t){
    if (!ghostPlayback || !ghostPlayback.points || !ghostPlayback.points.length) return null;
    var pts = ghostPlayback.points;
    // find segment
    for (var i=0;i<pts.length-1;i++){
      if (t >= pts[i].t && t < pts[i+1].t) {
        var a = pts[i], b = pts[i+1];
        var k = (t - a.t) / (b.t - a.t || 0.05);
        return { x: a.x + (b.x-a.x)*k, y: a.y + (b.y-a.y)*k, rot: a.rot + (b.rot-a.rot)*k, skin: ghostPlayback.skin || 1 };
      }
    }
    if (t >= pts[pts.length-1].t) {
      var p = pts[pts.length-1];
      return { x:p.x, y:p.y, rot:p.rot, skin: ghostPlayback.skin||1 };
    }
    return null;
  }
  async function showLeaderboardAfterWin(entry, time){
    var box = el("leaderboardBox");
    if (!box) return;
    box.innerHTML = '<p class="loading-note">Loading leaderboard…</p>';
    var file = entry.file || entry.id || "unknown";
    try {
      var u = (window.DPNet && DPNet.getUser) ? DPNet.getUser() : null;
      if (!u) {
        box.innerHTML = '<p class="loading-note" style="color:var(--gold)">Log in to submit & see online top 10<br>Your time: ' + fmtTime(time) + '</p>';
        return;
      }
      // submit first
      var res = null;
      try { res = await DPNet.submitLeaderboard(file, time, save_.data.skin); } catch(e){}
      var list = [];
      try { list = await DPNet.getLeaderboard(file, 10); } catch(e){}
      if (!list.length) {
        box.innerHTML = '<p class="loading-note">No leaderboard yet — you are #1!<br>Time: ' + fmtTime(time) + '</p>';
        return;
      }
      var html = '<div class="lb-title">TOP 10 — ' + escapeHtml(entry.level ? entry.level.name : file) + (u ? ' · tap a player to race' : '') + '</div>';
      for (var i=0;i<list.length;i++){
        var row = list[i];
        var isMe = u && row.uid === u.uid;
        var skinSrc = (window.DashPointSkins && window.DashPointSkins[row.skin-1] ? window.DashPointSkins[row.skin-1].src : "assets/skins/skin-1.png");
        var attr = isMe ? '' : (' data-uid="' + escapeHtml(row.uid) + '" data-name="' + escapeHtml(row.name) + '"');
        html += '<div class="lb-row' + (isMe ? ' lb-me' : ' lb-race') + '"' + attr + '><span class="lb-rank">#' + (i+1) + '</span><img class="lb-skin" src="' + skinSrc + '" alt="" /><span class="lb-name">' + escapeHtml(row.name) + (isMe ? ' (you)' : '') + '</span><span class="lb-time">' + fmtTime(row.time) + '</span>' + (isMe ? '' : '<span class="lb-race-hint">RACE ▶</span>') + '</div>';
      }
      // if not in top10 but has rank beyond, show yours
      if (res && res.rank && res.rank > 10) {
        html += '<div class="lb-row lb-me"><span class="lb-rank">#' + res.rank + '</span><span class="lb-name">You</span><span class="lb-time">' + fmtTime(time) + '</span></div>';
      } else if (u && !list.find(function(x){ return x.uid===u.uid; })) {
        // show your time at bottom if not in list
        html += '<div class="lb-row lb-me"><span class="lb-rank">—</span><span class="lb-name">You</span><span class="lb-time">' + fmtTime(time) + '</span></div>';
      }
      box.innerHTML = html;
      // click to race a player's ghost
      box.querySelectorAll('.lb-race').forEach(function(r){
        r.addEventListener('click', function(){ raceGhost(r.dataset.uid, r.dataset.name); });
      });
    } catch(e){
      box.innerHTML = '<p class="loading-note">Leaderboard failed: ' + escapeHtml(e.message||String(e)) + '</p>';
    }
  }



  const els = {};
  function el(id) {
    if (!els[id]) els[id] = document.getElementById(id);
    return els[id];
  }

  function isUnlocked(id) {
    return save_.data.unlocked.indexOf(id) !== -1;
  }

  function meetsUnlock(u) {
    if (!u) return true;
    if (u.type === "deaths") return save_.data.deaths >= u.n;
    if (u.type === "jumps") return (save_.data.jumps | 0) >= u.n;
    if (u.type === "either") return (save_.data.jumps | 0) >= (u.jumps | 0) || save_.data.deaths >= (u.deaths | 0);
    if (u.type === "beat") return Object.keys(save_.data.beaten).length > 0;
    if (u.type === "diff") return hasBeatenDiff(u.n);
    if (u.type === "secreta") return save_.data.secretA === true;
    if (u.type === "shop" || u.type === "code") return false;
    return false;
  }

  let achvQueue = [];
  let achvBusy = false;

  function queueAchievement(skin) {
    achvQueue.push(skin);
    pumpAchievements();
  }

  function pumpAchievements() {
    if (achvBusy || !achvQueue.length) return;
    achvBusy = true;
    const skin = achvQueue.shift();
    const box = document.createElement("div");
    box.className = "achv";
    box.innerHTML =
      '<img src="' + skin.src + '" alt="" /><div><div class="achv-title">SKIN UNLOCKED!</div><div class="achv-name">' +
      escapeHtml(skin.name) +
      "</div></div>";
    el("achievements").appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    setTimeout(() => {
      box.classList.remove("show");
      setTimeout(() => {
        box.remove();
        achvBusy = false;
        pumpAchievements();
      }, 320);
    }, 3400);
  }

  function checkUnlocks() {
    for (const s of SKINS) {
      if (isShopSkin(s) || isCodeSkin(s)) continue;
      if (!isUnlocked(s.id) && meetsUnlock(s.unlock)) {
        save_.data.unlocked.push(s.id);
        grantCoins(COIN_PER_SKIN, "skin:" + s.id);
        queueAchievement(s);
      }
    }
    save();
    syncHomeStats();
    syncCoinUI();
    if (el("modalSkins").classList.contains("visible")) renderSkins();
    if (el("modalShop") && el("modalShop").classList.contains("visible")) renderShop();
  }

  function unlockSecretA() {
    if (save_.data.secretA) return;
    save_.data.secretA = true;
    save();
    checkUnlocks();
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function fmtTime(t) {
    return Number(t).toFixed(2) + "s";
  }

  function hasSpaceUnlock() {
    return !!save_.data.beaten[CLIMB_FILE];
  }

  function isSpaceOn() {
    return hasSpaceUnlock() && !!save_.data.spaceMenu;
  }

  function syncSpaceSettings() {
    const unlocked = hasSpaceUnlock();
    const box = el("setSpace");
    const hint = el("spaceHint");
    const row = el("spaceRow");
    if (box) {
      box.disabled = !unlocked;
      box.checked = isSpaceOn();
    }
    if (row) row.classList.toggle("locked-opt", !unlocked);
    if (hint) {
      hint.textContent = unlocked ? "" : "Beat The Climb to unlock this menu theme.";
      hint.style.display = unlocked ? "none" : "";
    }
  }

  function applySpaceTheme() {
    document.body.classList.toggle("ui-space", isSpaceOn());
    syncSpaceSettings();
  }

  function syncHomeStats() {
    const total = SKINS.length;
    const got = SKINS.filter((s) => isUnlocked(s.id)).length;
    const beaten = state.levels.filter((e) => save_.data.beaten[e.file] !== undefined).length;
    const stats = el("homeStats");
    if (stats) {
      if (isSpaceOn()) {
        stats.innerHTML =
          '<span class="hs-chip">LEVELS <b>' + beaten + "/" + state.levels.length + "</b></span>" +
          '<span class="hs-chip">DEATHS <b>' + save_.data.deaths + "</b></span>" +
          '<span class="hs-chip">SKINS <b>' + got + "/" + total + "</b></span>" +
          '<span class="hs-chip">COINS <b>' + (save_.data.coins | 0) + "</b></span>";
      } else {
        stats.textContent =
          "LEVELS " + beaten + "/" + state.levels.length + " CLEARED · DEATHS " + save_.data.deaths + " · SKINS " + got + "/" + total + " · COINS " + (save_.data.coins | 0);
      }
    }
    const preview = el("homeSkinPreview");
    const equipped = SKINS.find((s) => s.id === save_.data.skin) || SKINS[0];
    if (preview && equipped) preview.src = equipped.src;
  }

  function show(name) {
    state.screen = name;
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("visible"));
    el("screen-" + name).classList.add("visible");
    if (name === "levels") renderLevels();
    if (name === "game") resizeCanvas();
    if (name === "network" || name === "netsaved" || name === "netsearch") state.netBack = name;
  }

  async function fetchCampaignLevel(file) {
    const urls = ["Levels/" + file, "levels/" + file];
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i], { cache: "reload" });
        if (!res.ok) continue;
        return DP.Level.parse(await res.text());
      } catch (e) {}
    }
    return null;
  }

  async function loadLevels() {
    const box = el("levelList");
    box.innerHTML = '<p class="loading-note">LOADING…</p>';
    const loaded = [];
    const seen = {};

    const embedded = Array.isArray(window.DashPointLevelData) ? window.DashPointLevelData : [];
    const embedByFile = {};
    for (const entry of embedded) {
      if (entry && entry.file) embedByFile[entry.file] = entry;
    }

    for (const f of LEVEL_FILES) {
      const live = await fetchCampaignLevel(f);
      if (live) {
        loaded.push({ file: f, level: live });
        seen[f] = true;
        continue;
      }
      const entry = embedByFile[f];
      if (!entry) continue;
      try {
        loaded.push({ file: entry.file, level: DP.Level.parse(JSON.stringify(entry.json)) });
        seen[f] = true;
      } catch (e) {}
    }

    for (const entry of embedded) {
      if (!entry || seen[entry.file]) continue;
      try {
        loaded.push({ file: entry.file, level: DP.Level.parse(JSON.stringify(entry.json)) });
        seen[entry.file] = true;
      } catch (e) {}
    }

    if (!loaded.length) {
      box.innerHTML =
        '<p class="loading-note">No levels found.<br />Put .dashpoint.json files in <b>levels/</b>, then run <b>node levels/build-levels.mjs</b> or serve the game with <b>node serve.mjs</b>.</p>';
      return;
    }
    state.levels = loaded;
    renderLevels();
    syncHomeStats();
  }

  function renderLevels() {
    const box = el("levelList");
    box.innerHTML = "";
    if (!state.levels.length) {
      box.innerHTML = '<p class="loading-note">NO LEVELS FOUND</p>';
      return;
    }
    const order = state.levels
      .map((entry, i) => ({ entry: entry, i: i }))
      .sort(function (a, b) {
        return (LEVEL_DIFF[a.entry.file] || 2) - (LEVEL_DIFF[b.entry.file] || 2);
      });
    order.forEach(function (pair, n) {
      const entry = pair.entry;
      const i = pair.i;
      const b = document.createElement("button");
      const done = save_.data.beaten[entry.file] !== undefined;
      const best = save_.data.best[entry.file];
      const diff = diffTier(localDiff(entry.file));
      b.className = "level-card diff-" + diff + (done ? " cleared" : "");
      b.style.animationDelay = n * 0.04 + "s";
      b.innerHTML =
        '<span class="level-num">' + (n + 1) + "</span>" +
        '<span class="lc-face">' + diffFaceImg(localDiff(entry.file)) + "</span>" +
        '<span class="level-info"><span class="level-name">' + escapeHtml(entry.level.name) + "</span>" +
        '<span class="level-meta">' + entry.level.cols + "\u00d7" + entry.level.rows +
        (entry.level.meta && entry.level.meta.tags && entry.level.meta.tags.length ? ' · <span class="level-tag">' + escapeHtml(entry.level.meta.tags.join(" · ")) + "</span>" : "") +
        "</span></span>" +
        (done ? '<span class="level-done">\u2713 CLEARED</span>' : "") +
        (best ? '<span class="level-best">BEST ' + fmtTime(best) + "</span>" : "");
      b.addEventListener("click", () => startLevel(i));
      box.appendChild(b);
    });
  }

  let bobTaps = 0;
  function renderSkins() {
    const grid = el("skinGrid");
    grid.innerHTML = "";
    grid.className = "skin-tree";
    const title = document.querySelector("#modalSkins h2");
    if (title && !title.dataset.bob) {
      title.dataset.bob = "1";
      title.style.cursor = "pointer";
      title.addEventListener("click", function(){
        bobTaps += 1;
        if (bobTaps >= 7) { bobTaps = 0; unlockSecretA(); renderSkins(); }
      });
    }
    function makeTile(s){
      const unlocked = isUnlocked(s.id);
      const b = document.createElement("button");
      b.className = "skin-tile" + (unlocked ? "" : " locked") + (save_.data.skin === s.id ? " selected" : "");
      let hint = "";
      if (unlocked) hint = save_.data.skin === s.id ? "EQUIPPED" : "TAP TO EQUIP";
      else {
        if (s.unlock && s.unlock.type === "secreta") hint = "Tap the SKINS title 7 times";
        else if (s.unlock && s.unlock.type === "deaths") {
          let need = s.unlock.n; let have = save_.data.deaths; let pct = Math.min(100, Math.floor(have/need*100));
          hint = have + "/" + need + " deaths" + (pct < 100 ? " (" + pct + "%)" : "");
        } else if (s.unlock && s.unlock.type === "jumps") {
          let need = s.unlock.n; let have = save_.data.jumps | 0; let pct = Math.min(100, Math.floor(have/need*100));
          hint = have + "/" + need + " jumps" + (pct < 100 ? " (" + pct + "%)" : "");
        } else if (s.unlock && s.unlock.type === "either") {
          let jNeed = s.unlock.jumps | 0; let jHave = save_.data.jumps | 0;
          let dNeed = s.unlock.deaths | 0; let dHave = save_.data.deaths | 0;
          hint = jHave + "/" + jNeed + " jumps or " + dHave + "/" + dNeed + " deaths";
        } else hint = s.hint || "LOCKED";
      }
      b.innerHTML = '<img src="' + s.src + '" alt="" />' + '<span class="skin-name">' + escapeHtml(s.name) + "</span>" + '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      if (!unlocked && s.unlock && (s.unlock.type === "deaths" || s.unlock.type === "jumps" || s.unlock.type === "either")) {
        let pct = 0;
        if (s.unlock.type === "either") {
          let jp = s.unlock.jumps ? Math.min(100, Math.floor((save_.data.jumps | 0) / s.unlock.jumps * 100)) : 0;
          let dp = s.unlock.deaths ? Math.min(100, Math.floor(save_.data.deaths / s.unlock.deaths * 100)) : 0;
          pct = Math.max(jp, dp);
        } else {
          let need = s.unlock.n; let have = s.unlock.type === "jumps" ? (save_.data.jumps | 0) : save_.data.deaths;
          pct = Math.min(100, Math.floor(have/need*100));
        }
        let bar = document.createElement("div"); bar.className = "skin-progress";
        let fill = document.createElement("div"); fill.className = "skin-progress-fill"; fill.style.width = pct + "%";
        bar.appendChild(fill); b.appendChild(bar);
      }
      if (unlocked) {
        b.addEventListener("click", function(){
          save_.data.skin = s.id; save(); renderSkins(); syncHomeStats();
        });
      }
      return b;
    }
    function addSection(titleText, skins, extra){
      const sec = document.createElement("div"); sec.className = "skin-section";
      const h = document.createElement("div"); h.className = "skin-section-title"; h.innerHTML = escapeHtml(titleText) + '<span class="line"></span>'; sec.appendChild(h);
      if (extra) { const p=document.createElement("div"); p.className="hint"; p.textContent=extra; sec.appendChild(p); }
      if (titleText.indexOf("DEATHS") !== -1) {
        let have = save_.data.deaths; let maxNeed=100; let pct=Math.min(100, Math.floor(have/maxNeed*100));
        let prog=document.createElement("div"); prog.className="skin-progress";
        let fill=document.createElement("div"); fill.className="skin-progress-fill"; fill.style.width=pct+"%"; prog.appendChild(fill); sec.appendChild(prog);
        let txt=document.createElement("div"); txt.className="skin-progress-text"; txt.textContent=have + " / " + maxNeed + " deaths (" + pct + "%)"; sec.appendChild(txt);
      }
      if (titleText.indexOf("JUMPS") !== -1) {
        let have = save_.data.jumps | 0; let maxNeed=100; let pct=Math.min(100, Math.floor(have/maxNeed*100));
        let prog=document.createElement("div"); prog.className="skin-progress";
        let fill=document.createElement("div"); fill.className="skin-progress-fill"; fill.style.width=pct+"%"; prog.appendChild(fill); sec.appendChild(prog);
        let txt=document.createElement("div"); txt.className="skin-progress-text"; txt.textContent=have + " / " + maxNeed + " jumps (" + pct + "%)"; sec.appendChild(txt);
      }
      const g=document.createElement("div"); g.className="skin-grid";
      skins.forEach(function(s){ g.appendChild(makeTile(s)); });
      sec.appendChild(g); grid.appendChild(sec);
    }
    const starter = SKINS.filter(function(s){ return [1,2,3,4,5].indexOf(s.id)!==-1; });
    const deaths = SKINS.filter(function(s){ return s.unlock && (s.unlock.type==="deaths" || (s.unlock.type==="either" && s.unlock.deaths)); }).sort(function(a,b){ return (a.unlock.n || a.unlock.deaths || 0) - (b.unlock.n || b.unlock.deaths || 0); });
    const jumps = SKINS.filter(function(s){ return s.unlock && (s.unlock.type==="jumps" || (s.unlock.type==="either" && s.unlock.jumps)); }).sort(function(a,b){ return (a.unlock.n || a.unlock.jumps || 0) - (b.unlock.n || b.unlock.jumps || 0); });
    const victory = SKINS.filter(function(s){ return s.unlock && (s.unlock.type==="beat" || s.unlock.type==="diff"); });
    const secret = SKINS.filter(function(s){ return s.unlock && s.unlock.type==="secreta"; });
    addSection("STARTER", starter, "Always unlocked");
    addSection("DEATHS — die to unlock", deaths, "Progress shown per skin");
    addSection("JUMPS", jumps, "Jump to unlock");
    addSection("VICTORY — beat levels", victory, "");
    addSection("SECRET", secret, "Hidden — tap the SKINS title 7 times or press Alt+A");
    const shopOwned = SKINS.filter(function(s){ return isShopSkin(s) && isUnlocked(s.id); });
    if (shopOwned.length) addSection("SHOP", shopOwned, "Bought with coins");
    const codeOwned = SKINS.filter(function(s){ return isCodeSkin(s) && isUnlocked(s.id); });
    if (codeOwned.length) addSection("CODES", codeOwned, "Unlocked with a code");
    syncCoinUI();
  }

  function renderShop() {
    const box = el("shopGrid");
    if (!box) return;
    box.innerHTML = "";
    const items = SKINS.filter(isShopSkin);
    if (!items.length) {
      box.innerHTML = '<p class="loading-note">The shop is empty.</p>';
      syncCoinUI();
      return;
    }
    items.forEach(function (s) {
      const owned = isUnlocked(s.id);
      const cost = (s.unlock && s.unlock.cost) | 0;
      const can = (save_.data.coins | 0) >= cost;
      const b = document.createElement("button");
      b.className = "skin-tile" + (owned && save_.data.skin === s.id ? " selected" : "") + (!owned && !can ? " cant" : "");
      const hint = owned ? (save_.data.skin === s.id ? "EQUIPPED" : "TAP TO EQUIP") : can ? "TAP TO BUY" : "NEED " + cost;
      b.innerHTML =
        '<img src="' + s.src + '" alt="" />' +
        '<span class="skin-name">' + escapeHtml(s.name) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + cost + "</span>" +
        '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      b.addEventListener("click", function () {
        if (owned) {
          save_.data.skin = s.id;
          save();
          renderShop();
          renderSkins();
          syncHomeStats();
          return;
        }
        buyShopSkin(s);
      });
      box.appendChild(b);
    });
    syncCoinUI();
  }

  function buyShopSkin(s) {
    if (!isShopSkin(s) || isUnlocked(s.id)) return;
    const cost = (s.unlock && s.unlock.cost) | 0;
    if ((save_.data.coins | 0) < cost) {
      showNotice("Not enough coins", true);
      return;
    }
    save_.data.coins = (save_.data.coins | 0) - cost;
    save_.data.unlocked.push(s.id);
    save();
    queueAchievement(s);
    renderShop();
    if (el("modalSkins").classList.contains("visible")) renderSkins();
    syncHomeStats();
    syncCoinUI();
  }

  function redeemCode() {
    const inp = el("codeInput");
    const msg = el("codeMsg");
    const raw = inp ? String(inp.value || "").trim().toLowerCase().replace(/\s+/g, " ") : "";
    function say(text, bad) {
      if (msg) {
        msg.textContent = text || "";
        msg.style.color = bad ? "var(--red)" : "var(--good)";
      }
    }
    if (!raw) { say("Type a code first.", true); return; }
    const reward = REDEEM_CODES[raw];
    if (!reward) { say("Invalid code.", true); return; }
    save_.data.codes = save_.data.codes || {};
    if (save_.data.codes[raw]) { say("Already used.", true); return; }
    save_.data.codes[raw] = true;
    if (reward.coins) {
      save_.data.coins = (save_.data.coins | 0) + (reward.coins | 0);
      say("+" + reward.coins + " coins!", false);
      showNotice("+" + reward.coins + " coins", false);
    }
    if (reward.skin) {
      const skin = SKINS.find(function (s) { return s.id === reward.skin; });
      if (skin && !isUnlocked(skin.id)) {
        save_.data.unlocked.push(skin.id);
        queueAchievement(skin);
      }
      say(skin ? "Unlocked " + skin.name + "!" : "Code redeemed.", false);
    }
    if (inp) inp.value = "";
    save();
    syncHomeStats();
    syncCoinUI();
    if (el("modalSkins").classList.contains("visible")) renderSkins();
  }

  function openModal(id) {
    el(id).classList.add("visible");
    if (id === "modalSkins") renderSkins();
    if (id === "modalShop") renderShop();
    if (id === "modalCodes") {
      syncCoinUI();
      const msg = el("codeMsg");
      const inp = el("codeInput");
      if (msg) msg.textContent = "";
      if (inp) { inp.value = ""; setTimeout(function () { inp.focus(); }, 50); }
    }
    if (id === "modalSettings") {
      el("setHitbox").checked = !!save_.data.hitboxes;
      el("setFps").checked = !!save_.data.debugFps;
      el("setAuto").checked = save_.data.autoRespawn !== false;
      syncSpaceSettings();
    }
  }

  function closeModal(id) {
    el(id).classList.remove("visible");
  }

  function resizeCanvas() {
    const c = el("view");
    const w = Math.max(1, Math.floor(window.innerWidth));
    const h = Math.max(1, Math.floor(window.innerHeight));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }

  function playZoom() {
    const z = Math.round(el("view").width / (14 * TILE));
    return Math.max(3, Math.min(5, z));
  }

  function bindPressed(action) {
    for (const code of DEFAULT_KEYS[action]) {
      if (state.keys.has(code)) return true;
    }
    return false;
  }

  let padStartPrev = false;

  function padState() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const ax = p.axes.length > 0 ? p.axes[0] : 0;
      const btn = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
      const start = btn(9);
      const result = {
        left: ax < -0.35 || btn(14),
        right: ax > 0.35 || btn(15),
        jump: btn(0) || btn(1),
        startEdge: start && !padStartPrev,
      };
      padStartPrev = start;
      return result;
    }
    padStartPrev = false;
    return null;
  }

  const cam = { x: 0, y: 0, zoom: 4 };
  const ctx = () => el("view").getContext("2d");

  function beginPlay(entry) {
    if (!entry) return;
    state.currentFile = entry.id ? "net:" + entry.id : entry.file;
    state.currentMeta = entry.meta || null;
    state.engine = new DP.Engine(entry.level.clone(), { skin: save_.data.skin });
    if (DP.Music) DP.Music.play(entry.level.song);
    state.playing = true;
    state.deaths = 0;
    state.winShown = false;
    state.paused = false;
    el("pauseCard").classList.remove("visible");
    // track attempts per level (lightweight)
    try {
      if (!save_.data.attempts[state.currentFile]) save_.data.attempts[state.currentFile] = { attempts: 0, deaths: 0 };
      save_.data.attempts[state.currentFile].attempts += 1;
      save();
    } catch(e) {}
    cam.zoom = playZoom();
    cam.x = state.engine.player.x + state.engine.player.w / 2 - el("view").width / cam.zoom / 2;
    cam.y = state.engine.player.y + state.engine.player.h / 2 - el("view").height / cam.zoom / 2;
    el("winCard").classList.remove("visible");
    el("btnWinMenu").textContent = state.netEntry ? "NETWORK" : "LEVELS";
    el("btnWinNext").textContent = state.netEntry ? "BACK" : "NEXT \u9654";
    show("game");
    syncAuthorChip();
    setStatusHud();
  }

  function startLevel(index) {
    const entry = state.levels[index];
    if (!entry) return;
    state.current = index;
    state.netEntry = null;
    beginPlay(entry);
  }

  function setStatusHud() {
    el("hudTime").textContent = (state.engine ? state.engine.time : 0).toFixed(2);
    el("hudDeaths").textContent = "deaths " + state.deaths;
  }

  function restartLevel() {
    if (!state.engine) return;
    state.engine.reset();
    if (DP.Music) DP.Music.play(state.engine.level.song);
    el("winCard").classList.remove("visible");
    el("pauseCard").classList.remove("visible");
    state.paused = false;
    if (!ghostMode) resetGhostTrail();
  }

  function respawn() {
    if (!state.engine) return;
    state.engine.reset(); // keeps checkpoint -> spawns there
    if (DP.Music) DP.Music.play(state.engine.level.song);
    el("winCard").classList.remove("visible");
    state.paused = false;
   }

  function pauseGame() {
    if (!state.engine || state.screen !== "game" || !state.playing) return;
    if (el("winCard").classList.contains("visible")) return;
    state.paused = true;
    el("pauseCard").classList.add("visible");
  }

  function resumeGame() {
    state.paused = false;
    el("pauseCard").classList.remove("visible");
  }

  function togglePause() {
    if (state.paused) resumeGame();
    else pauseGame();
  }

  function quitToLevels() {
    if (DP.Music) DP.Music.stop();
    state.playing = false;
    state.engine = null;
    state.paused = false;
    el("pauseCard").classList.remove("visible");
    ghostMode = false; ghostPlayback = null; if (ghostCountdownTimer){ clearInterval(ghostCountdownTimer); ghostCountdownTimer=null; var cd=el("ghostCountdown"); if(cd) cd.classList.add("hidden"); }
    MP.clearCube();
    el("winCard").classList.remove("visible");
    if (state.netEntry) {
      state.netEntry = null;
      const back = state.netBack || "network";
      show(back);
      if (back === "network") renderNetworkHome();
      if (back === "netsaved") renderSavedList();
      return;
    }
    show("levels");
  }

  function onWin() {
    const entry = state.netEntry || state.levels[state.current];
    if (!entry) return;
    const t = state.engine.time;
    const firstClear = save_.data.beaten[entry.file] === undefined;
    save_.data.beaten[entry.file] = true;
    if (save_.data.best[entry.file] === undefined || t < save_.data.best[entry.file]) {
      save_.data.best[entry.file] = t;
    }
    let gained = 0;
    if (firstClear) gained = grantCoins(coinsForFile(entry.file, entry.meta), "level:" + entry.file);
    save();
    el("winText").textContent = "Time " + fmtTime(t) + " · deaths " + state.deaths + (firstClear ? " · FIRST CLEAR!" : "") + (gained ? " · +" + gained + " coins" : "");
    el("winCard").classList.add("visible");
    checkUnlocks();

    // Ghost save + leaderboard submit
    try {
      var lvlFile = entry.file || entry.id || "unknown";
      var ghostToSave = { points: ghostTrail.slice(), time: t, skin: save_.data.skin, name: (window.DPNet && DPNet.getUser && DPNet.getUser() ? DPNet.getUser().name : "player") };
      if (ghostTrail.length) { DPNet.saveGhostLocal(lvlFile, ghostToSave); DPNet.saveGhostCloud(lvlFile, ghostToSave); }
    } catch(e){}
    try { showLeaderboardAfterWin(entry, t); } catch(e){}    if (firstClear && entry.file === CLIMB_FILE) {
      showNotice("Space mode unlocked — turn it on in Settings!", false);
      syncSpaceSettings();
    }
  }

  function followPlayer() {
    const p = state.engine.player;
    const viewW = el("view").width / cam.zoom;
    const viewH = el("view").height / cam.zoom;
    cam.x += (p.x + p.w / 2 - viewW / 2 - cam.x) * 0.18;
    cam.y += (p.y + p.h / 2 - viewH / 2 - cam.y) * 0.18;
    const worldW = state.engine.level.cols * TILE;
    const worldH = state.engine.level.rows * TILE;
    if (worldW < viewW) cam.x = (worldW - viewW) / 2;
    else cam.x = Math.max(-80, Math.min(worldW - viewW + 80, cam.x));
    if (worldH < viewH) cam.y = (worldH - viewH) / 2;
    else cam.y = Math.max(-80, Math.min(worldH - viewH + 80, cam.y));
    cam.x = Math.round(cam.x * cam.zoom) / cam.zoom;
    cam.y = Math.round(cam.y * cam.zoom) / cam.zoom;
  }

  // ---- Screen shake (death juice) ----
  function addShake(amount) {
    state.shake = Math.max(state.shake, amount || 0);
  }
  function tickShake(dt) {
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - (state.shake * 8 + 24) * dt);
    }
  }
  function shakeCam() {
    const s = state.shake;
    if (s <= 0) return cam;
    const m = s * 0.6;
    const dx = (Math.random() * 2 - 1) * m;
    const dy = (Math.random() * 2 - 1) * m;
    return { x: cam.x + dx, y: cam.y + dy, zoom: cam.zoom };
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const rawDt = Math.max(0.001, (ts - state.lastFrame) / 1000 || 0.016);
    const dt = Math.min(0.05, rawDt);
    state.lastFrame = ts;
    tickFps(rawDt);
    if (state.screen !== "game" || !state.playing || !state.engine) return;
    resizeCanvas();

    // Pause: freeze gameplay, keep rendering the frozen frame + shake decay
    if (state.paused) {
      try { tickShake(dt); } catch(e){}
      el("pauseCard").classList.add("visible");
      return;
    }

    const pad = padState();
    state.engine.setInput({
      left: bindPressed("left") || !!(pad && pad.left),
      right: bindPressed("right") || !!(pad && pad.right),
      jump: bindPressed("jump") || !!(pad && pad.jump),
    });
    if (pad && pad.startEdge && state.screen === "game" && !el("winCard").classList.contains("visible")) {
      restartLevel();
    }
    const wasDead = state.engine.dead;
    state.engine.update(dt);
    if (state.engine.pendingJumps) {
      const n = state.engine.pendingJumps | 0;
      state.engine.pendingJumps = 0;
      if (n > 0) {
        save_.data.jumps = (save_.data.jumps | 0) + n;
        save();
        checkUnlocks();
      }
    }
    if (state.engine.dead && !wasDead) {
      state.deaths += 1;
      save_.data.deaths += 1;
      try { if (save_.data.attempts[state.currentFile]) save_.data.attempts[state.currentFile].deaths += 1; } catch(e){}
      save();
      checkUnlocks();
      addShake(12); // death juice
    }
    if (state.engine.dead && save_.data.autoRespawn && state.engine.deathTimer > 0.55) respawn();
    if (state.engine.won && !state.winShown) {
      state.winShown = true;
      onWin();
    }
    if (!state.engine.won) state.winShown = false;

    followPlayer();
    try{ recordGhost(dt); }catch(e){}
    tickShake(dt);
    setStatusHud();

    if (MP.isActive() && state.engine) {
      MP.sendCube({
        x: state.engine.player.x,
        y: state.engine.player.y,
        rot: state.engine.player.rot,
        skin: save_.data.skin,
        dead: state.engine.dead,
        won: state.engine.won,
        level: state.currentFile || "",
      });
    }

    let remoteCubes = null;
    if (MP.isActive()) {
      remoteCubes = [];
      for (const p of MP.peers()) {
        if (p.cube && p.level === state.currentFile) {
          remoteCubes.push(Object.assign({ name: p.name }, p.cube));
        }
      }
    }

        // Ghost playback as remote cube
    if (ghostMode && ghostPlayback && state.engine) {
      var gpos = getGhostPos(state.engine.time);
      if (gpos) {
        if (!remoteCubes) remoteCubes = [];
        remoteCubes.push({ x: gpos.x, y: gpos.y, rot: gpos.rot, skin: gpos.skin, name: "Ghost", level: state.currentFile });
      }
    }
DP.drawWorld(ctx(), state.engine.level, state.images, shakeCam(), {
      showGrid: false,
      showHover: false,
      ghostTiles: null,
      selection: null,
      engine: state.engine,
      skin: save_.data.skin,
      hitboxes: !!save_.data.hitboxes,
      showSpawn: false,
      remoteCubes: remoteCubes || [],
    });
  }

  function isTyping(ev) {
    const t = ev.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  const MP = window.DashPointMP;

  function friendlyAuthError(err) {
    const code = String((err && err.code) || "");
    if (code === "auth/operation-not-allowed") return "Enable Email/Password sign-in in your Firebase console first.";
    if (code === "auth/email-already-in-use") return "That email already has an account — try logging in.";
    if (code === "auth/weak-password") return "Password must be at least 6 characters.";
    if (code === "auth/invalid-email") return "That email doesn't look right.";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "Wrong email or password.";
    }
    if (code.indexOf("network") !== -1) return "Network error — check your connection.";
    return (err && err.message) || String(err);
  }

  function setAcctMsg(text) {
    el("acctMsg").textContent = text || "";
  }

  function syncAccountUI() {
    const u = MP.getUser();
    const name = u ? u.name : "";
    // profile modal (account moved here)
    const plo = el("profLoggedOut"); if (plo) plo.style.display = u ? "none" : "";
    const pli = el("profLoggedIn"); if (pli) pli.style.display = u ? "" : "none";
    const pn = el("profName"); if (pn) pn.textContent = name;
  }

  function syncMpUI() {
    const active = MP.isActive();
    const loggedIn = !!MP.getUser();
    const online = MP.peerOnline();
    const status = MP.getStatusLabel() + (active && !online ? " · waiting…" : "");
    const statusColor = active ? (online ? "var(--good)" : "var(--gold)") : "#9db4d8";
    // profile modal mirror
    const ps = el("profMpState"); if (ps) { ps.textContent = status; ps.style.color = statusColor; }
    const pbh = el("btnProfHost"); if (pbh) pbh.disabled = !loggedIn;
    const pbj = el("btnProfJoin"); if (pbj) pbj.disabled = !loggedIn;
    const pidle = el("profMpIdleRow"); if (pidle) pidle.style.display = active ? "none" : "flex";
    const pact = el("profMpActiveRow"); if (pact) pact.style.display = active ? "flex" : "none";
    const pl = el("btnProfLeave"); if (pl) pl.textContent = MP.getSlot() === "host" ? "CLOSE ROOM" : "LEAVE";
  }

  const NET = window.DPNet;
  const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  let levelIndexCache = null;
  let usersIndexCache = null;
  let netTab = "levels";
  let netCurrentId = null;

  function showNotice(msg, bad) {
    const box = document.createElement("div");
    box.className = "achv" + (bad ? " notice-bad" : " notice");
    box.innerHTML =
      '<img src="assets/ui/settings.png" alt="" /><div><div class="achv-title">' +
      (bad ? "PROBLEM" : "NETWORK") +
      '</div><div class="achv-name">' +
      escapeHtml(String(msg).slice(0, 90)) +
      "</div></div>";
    el("achievements").appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    setTimeout(() => {
      box.classList.remove("show");
      setTimeout(() => box.remove(), 320);
    }, 4200);
  }

  let _noticesChecked = false;
  async function checkDeletionNotices() {
    const u = NET.getUser && NET.getUser();
    if (!u || !u.uid) return;
    if (!NET.getDeletionNotices) return;
    try {
      const notices = await NET.getDeletionNotices(u.uid);
      if (!notices || !notices.length) return;
      for (const n of notices) {
        var m = "Admin deleted your level \"" + (n.title || "Untitled") + "\" — " + (n.reason || "no reason given");
        var b = document.createElement("div");
        b.className = "achv notice-bad";
        b.innerHTML = '<img src="assets/ui/settings.png" alt="" /><div><div class="achv-title">MODERATION</div><div class="achv-name">' + escapeHtml(m.slice(0, 180)) + '</div></div>';
        el("achievements").appendChild(b);
        requestAnimationFrame(function(){ b.classList.add("show"); });
        setTimeout(function(){ b.classList.remove("show"); setTimeout(function(){ b.remove(); }, 320); }, 6000);
      }
      try { await NET.clearDeletionNotices(u.uid); } catch(e){}
    } catch(e){}
  }

  async function acctAction(fn) {
    setAcctMsg("…");
    try {
      await fn();
      setAcctMsg("");
      syncAccountUI();
      syncMpUI();
    } catch (err) {
      setAcctMsg(friendlyAuthError(err));
    }
  }

  /* ---------------- DASHPOINT NETWORK ---------------- */

  async function ensureIndexes() {
    levelIndexCache = await NET.loadLevelIndex();
    usersIndexCache = await NET.loadUsersIndex();
    return levelIndexCache;
  }

  function renderNetworkHome() {
    el("netSavedCount").textContent = NET.listSaves().length + " downloaded · offline ready";
    const u = MP.getUser();
    el("netAcct").textContent = u ? "logged in as " + u.name : "not logged in";
    showPanel(null);
  }

  function showPanel(which) {
    if (which === "saved") show("netsaved");
    else if (which === "search") show("netsearch");
  }

  function starString(n) {
    let s = "";
    for (let i = 0; i < 5; i++) s += i < n ? "\u2605" : "\u2606";
    return s;
  }

  function levelRow(meta) {
    const row = document.createElement("div");
    row.className = "net-row";
    const info = document.createElement("div");
    info.className = "n-main";
    info.innerHTML =
      '<div class="n-title">' + escapeHtml(meta.title || "Untitled") + "</div>" +
      '<div class="n-sub">by <b class="n-author" style="cursor:pointer">' + escapeHtml(meta.authorName || "?") + "</b></div>" +
      (meta.tags && meta.tags.length ? '<div class="n-sub"><span class="level-tag">' + escapeHtml(meta.tags.join(" · ")) + "</span></div>" : "") +
      '<div class="n-sub">' + escapeHtml((meta.desc || "").slice(0, 90)) + "</div>";
    const diff = document.createElement("div");
    diff.innerHTML = diffFaceImg(netDiff(meta));
    diff.title = "Difficulty: " + DIFF_NAMES[netDiff(meta) - 1];
    const play = document.createElement("button");
    play.className = "n-play";
    play.textContent = "PLAY";
    play.addEventListener("click", (ev) => {
      ev.stopPropagation();
      playNetworkLevel(meta);
    });
    info.querySelector(".n-author").addEventListener("click", () => openAccount(meta.authorUid));
    row.appendChild(diff);
    row.appendChild(info);
    row.appendChild(play);
    try {
      if (isMyLevel(meta)) {
        const edit = document.createElement("button");
        edit.className = "n-play";
        edit.style.background = "var(--gold)";
        edit.style.color = "#2a1a06";
        edit.textContent = "EDIT";
        edit.title = "Edit and update this level";
        edit.addEventListener("click", (ev) => {
          ev.stopPropagation();
          startEditLevel(meta);
        });
        row.appendChild(edit);
      }
    } catch(e) {}
    try {
      if (NET.canDeleteLevel && NET.canDeleteLevel(meta)) {
        const del = document.createElement("button");
        del.className = "n-play";
        del.style.background = "var(--red)";
        del.style.color = "#33060c";
        del.textContent = "DELETE";
        del.title = (NET.isAdmin && NET.isAdmin() && !isMyLevel(meta)) ? "Admin: delete this level" : "Delete your level";
        del.addEventListener("click", (ev) => {
          ev.stopPropagation();
          startDeleteLevel(meta);
        });
        row.appendChild(del);
      }
    } catch(e) {}
    return row;
  }

  function isMyLevel(meta) {
    try {
      const u = (NET.getEffectiveUser && NET.getEffectiveUser()) || (NET.getUser && NET.getUser());
      return !!(u && u.uid && meta && meta.authorUid && u.uid === meta.authorUid);
    } catch (e) {
      return false;
    }
  }

  async function startEditLevel(meta) {
    if (!meta) return;
    if (isTouch) {
      showNotice("Get on PC to edit levels — editing is desktop-only.", true);
      return;
    }
    if (!isMyLevel(meta)) {
      showNotice("You can only edit your own levels.", true);
      return;
    }
    try {
      showNotice("Opening editor…", false);
      const json = await NET.fetchLevel(meta.id);
      localStorage.setItem("dashpoint.editor.networkEdit", JSON.stringify({
        id: meta.id,
        meta: meta,
        json: json,
      }));
      window.open("editor/index.html", "_blank");
    } catch (err) {
      showNotice(NET.friendly(err), true);
    }
  }

  function startDeleteLevel(meta) {
    if (!meta) return;
    if (NET.isAdmin && NET.isAdmin() && !isMyLevel(meta)) {
      openAdminDelete(meta);
      return;
    }
    if (!confirm("Delete \"" + (meta.title || "this level") + "\" from the Network? This cannot be undone.")) return;
    ownerDeleteLevel(meta);
  }

  async function ownerDeleteLevel(meta) {
    try {
      const res = await NET.deleteNetworkLevel(meta.id);
      showNotice("Deleted \"" + (res.title || meta.id) + "\"", false);
      try { NET.deleteSave(meta.id); } catch (e) {}
      try { levelIndexCache = await NET.loadLevelIndex(); } catch (e) {}
      if (netTab === "levels") renderResults();
      if (typeof renderSavedList === "function") renderSavedList();
      if (typeof renderNetworkHome === "function") renderNetworkHome();
      try {
        if (el("modalAccount").classList.contains("visible") && meta.authorUid) openAccount(meta.authorUid);
      } catch (e) {}
    } catch (err) {
      showNotice(NET.friendly(err), true);
    }
  }

  let pendingDeleteMeta = null;
  function openAdminDelete(meta) {
    pendingDeleteMeta = meta;
    el("adTitle").textContent = meta.title || "Untitled";
    el("adReason").value = "";
    el("modalAdminDelete").classList.add("visible");
  }

  async function adminDeleteLevel() {
    if (!pendingDeleteMeta) return;
    const meta = pendingDeleteMeta;
    const reason = el("adReason").value.trim();
    if (!reason) { showNotice("Enter a reason", true); return; }
    try {
      const res = await NET.deleteNetworkLevel(meta.id, reason);
      showNotice("Deleted \"" + (res.title || meta.id) + "\"", false);
      el("modalAdminDelete").classList.remove("visible");
      pendingDeleteMeta = null;
      try { NET.deleteSave(meta.id); } catch(e){}
      try { levelIndexCache = await NET.loadLevelIndex(); } catch(e){}
      if (netTab === "levels") renderResults();
      if (typeof renderSavedList === "function") renderSavedList();
      if (typeof renderNetworkHome === "function") renderNetworkHome();
      try {
        if (el("modalAccount").classList.contains("visible") && meta.authorUid) openAccount(meta.authorUid);
      } catch (e) {}
    } catch (err) {
      showNotice(NET.friendly(err), true);
    }
  }

  function renderResults() {
    const q = el("netQuery").value.trim().toLowerCase();
    const box = el("netResults");
    box.innerHTML = "";
    if (!levelIndexCache) {
      box.innerHTML = '<p class="loading-note">LOADING…</p>';
      return;
    }
    if (netTab === "levels") {
      const hits = levelIndexCache.filter(
        (l) =>
          !q ||
          String(l.title).toLowerCase().indexOf(q) !== -1 ||
          String(l.authorName).toLowerCase().indexOf(q) !== -1 ||
          String(l.desc || "").toLowerCase().indexOf(q) !== -1 ||
          String((l.tags || []).join(" ")).toLowerCase().indexOf(q) !== -1
      );
      if (!hits.length) {
        box.innerHTML = '<p class="loading-note">No levels match.</p>';
        return;
      }
      hits.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      hits.forEach((m) => box.appendChild(levelRow(m)));
    } else {
      // Players tab: combine cached users + authors from levels so it works even when usersIndex is stale/restricted
      var combinedMap = {};
      (usersIndexCache || []).forEach(function(u){ combinedMap[u.uid] = u; });
      (levelIndexCache || []).forEach(function(l){
        if (!combinedMap[l.authorUid]) {
          combinedMap[l.authorUid] = { uid: l.authorUid, name: l.authorName || "player", beatenCount: 0, deaths: 0, _fromLevel: true };
        }
      });
      var allUsers = Object.keys(combinedMap).map(function(k){ return combinedMap[k]; });
      var hits = allUsers.filter(function(u){ return !q || String(u.name).toLowerCase().indexOf(q) !== -1; });
      if (!hits.length) {
        box.innerHTML = '<p class="loading-note">No players match.</p>';
        return;
      }
      // Enrich _fromLevel entries in background (fetch real stats)
      hits.forEach(function(u){
        if (u._fromLevel && NET.getUserProfile) {
          NET.getUserProfile(u.uid).then(function(real){
            if (real) { for (var k in real) u[k] = real[k]; delete u._fromLevel; if (usersIndexCache && !usersIndexCache.find(function(x){ return x.uid===u.uid; })) usersIndexCache.push(u); }
          }).catch(function(){});
        }
      });
      hits.sort(function(a,b){ return String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase()); });
      for (var i=0;i<hits.length;i++) {
        var u = hits[i];
        var made = levelIndexCache.filter(function(l){ return l.authorUid === u.uid; }).length;
        var row = document.createElement("button");
        row.className = "net-row user";
        row.innerHTML =
          '<img class="n-avatar" src="assets/skins/skin-1.png" alt="" />' +
          '<span class="n-main"><span class="n-title">' + escapeHtml(u.name) + "</span>" +
          '<div class="n-sub">' + made + " level" + (made === 1 ? "" : "s") + " made</div></span>" +
          '<span class="n-play">VIEW</span>';
        (function(uid){ row.addEventListener("click", function(){ openAccount(uid); }); })(u.uid);
        box.appendChild(row);
      }
    }
  }

  async function openAccount(uid) {
    uid = String(uid || "").trim();
    if (!uid) { showNotice("Player not found.", true); return; }
    try {
      if (!usersIndexCache) usersIndexCache = await NET.loadUsersIndex();
      if (!levelIndexCache) levelIndexCache = await NET.loadLevelIndex();
    } catch (err) {
      showNotice(NET.friendly(err), true);
      return;
    }
    let u = (usersIndexCache || []).find(function(x){ return x.uid === uid; });
    if (!u) {
      try {
        var direct = await NET.getUserProfile(uid);
        if (direct) {
          u = direct;
          if (!usersIndexCache) usersIndexCache = [];
          if (!usersIndexCache.find(function(x){ return x.uid === uid; })) usersIndexCache.push(u);
        }
      } catch (e) {}
    }
    if (!u) {
      var m = state.currentMeta;
      if (m && m.authorUid === uid) {
        u = { uid: uid, name: m.authorName || "player", beatenCount: 0, deaths: 0 };
      } else {
        var anyLevel = (levelIndexCache || []).find(function(l){ return l.authorUid === uid; });
        if (anyLevel) u = { uid: uid, name: anyLevel.authorName || "player", beatenCount: 0, deaths: 0 };
      }
    }
    if (!u) {
      showNotice("Player not found.", true);
      return;
    }
    var theirs = (levelIndexCache || []).filter(function(l){ return l.authorUid === uid; });
    el("acctTitle").textContent = String(u.name || "player").toUpperCase();
    el("acctMade").textContent = theirs.length;
    el("acctBeaten").textContent = u.beatenCount || 0;
    el("acctDeaths").textContent = u.deaths || 0;
    var box = el("acctLevels");
    box.innerHTML = "";
    if (!theirs.length) box.innerHTML = '<p class="loading-note">No levels posted yet.</p>';
    else theirs.forEach(function(m){ box.appendChild(levelRow(m)); });
    el("modalAccount").classList.add("visible");
  }

  function renderSavedList() {
    const box = el("savedList");
    const saves = NET.listSaves();
    box.innerHTML = "";
    if (!saves.length) {
      box.innerHTML = '<p class="loading-note">Nothing saved yet — play any network level and it downloads here.</p>';
      return;
    }
    saves.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    for (const sv of saves) {
      const row = document.createElement("div");
      row.className = "net-row";
      row.style.cursor = "pointer";
      row.innerHTML =
        '<span class="lc-face">' + diffFaceImg(netDiff(sv.meta)) + "</span>" +
        '<span class="n-main"><span class="n-title">' + escapeHtml(sv.meta.title || "Untitled") + "</span>" +
        '<div class="n-sub">by ' + escapeHtml(sv.meta.authorName || "?") + " · offline ready</div></span>";
      row.addEventListener("click", () => openLevelInfo(sv));
      const play = document.createElement("button");
      play.className = "n-play";
      play.textContent = "▶";
      play.title = "View level";
      play.addEventListener("click", (ev) => { ev.stopPropagation(); openLevelInfo(sv); });
      const del = document.createElement("button");
      del.className = "n-play";
      del.style.background = "var(--red)";
      del.style.color = "#33060c";
      del.textContent = "✕";
      del.title = "Delete saved copy";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        NET.deleteSave(sv.id);
        renderSavedList();
        renderNetworkHome();
      });
      row.appendChild(play);
      row.appendChild(del);
      box.appendChild(row);
    }
  }

  let levelInfoMeta = null;
  function openLevelInfo(sv) {
    levelInfoMeta = sv;
    const key = "net:" + (sv.id || sv.meta.id);
    const meta = sv.meta;
    el("liName").textContent = meta.title || "Untitled";
    el("liDiff").innerHTML = diffFaceImg(netDiff(meta));
    el("liAuthor").textContent = meta.authorName || "—";
    const best = save_.data.best[key];
    el("liBest").textContent = best !== undefined ? fmtTime(best) : "—";
    const a = save_.data.attempts[key] || { attempts: 0, deaths: 0 };
    el("liAttempts").textContent = a.attempts || 0;
    el("liDeaths").textContent = a.deaths || 0;
    try {
      el("btnLiEdit").style.display = isMyLevel(meta) ? "" : "none";
    } catch(e){ el("btnLiEdit").style.display = "none"; }
    try {
      el("btnLiDelete").style.display = (NET.canDeleteLevel && NET.canDeleteLevel(meta)) ? "" : "none";
    } catch(e){ el("btnLiDelete").style.display = "none"; }
    el("modalLevelInfo").classList.add("visible");
  }
  function liPlay() {
    if (!levelInfoMeta) return;
    const sv = levelInfoMeta;
    el("modalLevelInfo").classList.remove("visible");
    playNetworkLevel(sv.meta, true);
  }

  async function playNetworkLevel(meta, fromLocal) {
    let json = null;
    try {
      json = await NET.fetchLevel(meta.id);
    } catch (err) {
      if (fromLocal) {
        const sv = NET.getSave(meta.id);
        if (sv) json = sv.json;
      }
      if (!json) {
        showNotice(NET.friendly(err), true);
        return;
      }
    }
    try { NET.saveLocal(meta.id, meta, json); } catch (e) {}
    if (!fromLocal) NET.bumpPlays(meta.id);
    let level;
    try {
      level = DP.Level.parse(JSON.stringify(json));
    } catch (err) {
      showNotice("That level failed to load: " + err.message, true);
      return;
    }
    const entry = {
      file: "net:" + meta.id,
      id: meta.id,
      meta: meta,
      level: level,
    };
    state.netEntry = entry;
    state.current = -1;
    beginPlay(entry);
  }

  function syncAuthorChip() {
    const chip = el("hudAuthor");
    const m = state.currentMeta;
    if (m && m.authorName) {
      chip.textContent = "by " + m.authorName;
      chip.classList.remove("hidden");
      chip.onclick = () => openAccount(m.authorUid);
    } else {
      chip.classList.add("hidden");
      chip.onclick = null;
    }
  }

  function bindNetworkUI() {
    el("btnNetwork").addEventListener("click", () => {
      show("network");
      renderNetworkHome();
    });
    el("btnNetBack").addEventListener("click", () => show("home"));
    el("netEditor").addEventListener("click", () => {
      if (isTouch) {
        showNotice("Get on PC to create levels — editing is desktop-only.", true);
        return;
      }
      window.open("editor/index.html", "_blank");
    });
    el("netSaved").addEventListener("click", () => {
      showPanel("saved");
      renderSavedList();
    });
    el("netSearch").addEventListener("click", async () => {
      showPanel("search");
      el("netResults").innerHTML = '<p class="loading-note">LOADING…</p>';
      try {
        await ensureIndexes();
      } catch (err) {
        el("netResults").innerHTML =
          '<p class="loading-note">Could not reach the network.<br />' + escapeHtml(NET.friendly(err)) + "</p>";
        return;
      }
      renderResults();
    });
    el("btnNetBackSaved").addEventListener("click", () => show("network"));
    el("btnNetBackSearch").addEventListener("click", () => show("network"));
    el("netQuery").addEventListener("input", renderResults);
    el("netQuery").addEventListener("keydown", (ev) => ev.stopPropagation());
    document.querySelectorAll("#screen-netsearch .chip[data-tab]").forEach((b) => {
      b.addEventListener("click", () => {
        netTab = b.dataset.tab;
        document.querySelectorAll("#screen-netsearch .chip[data-tab]").forEach((x) =>
          x.classList.toggle("active", x === b)
        );
        renderResults();
      });
    });
    el("hudAuthor").addEventListener("click", () => {
      if (state.currentMeta) openAccount(state.currentMeta.authorUid);
    });
    el("modalAccount").addEventListener("click", (ev) => {
      if (ev.target === el("modalAccount")) el("modalAccount").classList.remove("visible");
    });
    el("modalAccount").querySelector("[data-close]").addEventListener("click", () => {
      el("modalAccount").classList.remove("visible");
    });
  }

  /* ---------------- /DASHPOINT NETWORK ---------------- */

  function onKeyDown(ev) {
    state.keys.add(ev.code);
    if (ev.code === "KeyA" && ev.altKey && el("modalSkins").classList.contains("visible")) {
      ev.preventDefault();
      unlockSecretA();
      return;
    }
    if (ev.code === "Escape") {
      if (document.querySelector(".modal-root.visible")) {
        document.querySelectorAll(".modal-root.visible").forEach((m) => m.classList.remove("visible"));
        return;
      }
      if (state.screen === "game") { ev.preventDefault(); if (state.paused) quitToLevels(); else pauseGame(); }
      else if (state.screen === "network") show("home");
      else if (state.screen === "netsaved" || state.screen === "netsearch") show("network");
      else if (state.screen === "levels") show("home");
      return;
    }
    if (isTyping(ev)) return;
    if (ev.code === "KeyT" && state.screen === "game" && !el("winCard").classList.contains("visible")) { ev.preventDefault(); startGhostRace(); return; }
    if (ev.code === "Space") ev.preventDefault();
    if (state.screen === "game" && ev.code === "KeyR") {
      ev.preventDefault();
      restartLevel();
    }
  }

  function onKeyUp(ev) {
    state.keys.delete(ev.code);
  }

  function boot() {
    bindNetworkUI();
    el("btnPlay").addEventListener("click", () => show("levels"));
    el("btnSkinsHome").addEventListener("click", () => openModal("modalSkins"));
    el("btnOpenShop").addEventListener("click", () => openModal("modalShop"));
    el("btnOpenCodes").addEventListener("click", () => openModal("modalCodes"));
    el("btnRedeemCode").addEventListener("click", redeemCode);
    el("codeInput").addEventListener("keydown", function (ev) {
      if (ev.code === "Enter" || ev.key === "Enter") {
        ev.preventDefault();
        redeemCode();
      }
    });
    el("btnSettingsHome").addEventListener("click", () => openModal("modalSettings"));
    el("btnBackHome").addEventListener("click", () => show("home"));
    el("btnRestart").addEventListener("click", restartLevel);
    el("btnQuit").addEventListener("click", togglePause);
    el("btnPauseResume").addEventListener("click", resumeGame);
    el("btnPauseRestart").addEventListener("click", () => { resumeGame(); restartLevel(); });
    el("btnPauseQuit").addEventListener("click", quitToLevels);
    el("btnLiPlay").addEventListener("click", liPlay);
    el("btnLiEdit").addEventListener("click", function(){ const m = levelInfoMeta; if (m) { el("modalLevelInfo").classList.remove("visible"); startEditLevel(m.meta); } });
    el("btnLiDelete").addEventListener("click", function(){ const m = levelInfoMeta; if (m) { el("modalLevelInfo").classList.remove("visible"); startDeleteLevel(m.meta); } });
    el("btnAdCancel").addEventListener("click", function(){ el("modalAdminDelete").classList.remove("visible"); pendingDeleteMeta = null; });
    el("btnAdConfirm").addEventListener("click", adminDeleteLevel);
    el("btnWinRestart").addEventListener("click", restartLevel);
    el("btnWinMenu").addEventListener("click", quitToLevels);
    el("btnWinNext").addEventListener("click", () => {
      if (state.netEntry) {
        quitToLevels();
        return;
      }
      const order = state.levels
        .map((entry, i) => ({ entry: entry, i: i }))
        .sort(function (a, b) {
          return localDiff(a.entry.file) - localDiff(b.entry.file);
        });
      const pos = order.findIndex((p) => p.i === state.current);
      if (pos >= 0 && pos + 1 < order.length) startLevel(order[pos + 1].i);
      else quitToLevels();
    });
    document.querySelectorAll("[data-close]").forEach((b) => {
      b.addEventListener("click", () => closeModal(b.dataset.close));
    });
    document.querySelectorAll(".modal-root").forEach((m) => {
      m.addEventListener("click", (ev) => {
        if (ev.target === m) closeModal(m.id);
      });
    });

    el("setHitbox").addEventListener("change", (ev) => {
      save_.data.hitboxes = ev.target.checked;
      save();
    });
    el("setFps").addEventListener("change", (ev) => {
      save_.data.debugFps = ev.target.checked;
      save();
      syncFpsVis();
    });
    el("setAuto").addEventListener("change", (ev) => {
      save_.data.autoRespawn = ev.target.checked;
      save();
    });
    el("setSpace").addEventListener("change", (ev) => {
      if (!hasSpaceUnlock()) {
        ev.target.checked = false;
        return;
      }
      save_.data.spaceMenu = ev.target.checked;
      save();
      applySpaceTheme();
      syncHomeStats();
    });
    el("btnResetProgress").addEventListener("click", () => {
      if (!confirm("Wipe all progress? Deaths, cleared levels and unlocked skins will be lost.")) return;
      save_.data = defaultSave();
      save();
      closeModal("modalSettings");
      applySpaceTheme();
      syncHomeStats();
    });

    MP.configure({
      onState: () => {
        syncAccountUI();
        syncMpUI();
        if (state.screen === "home") syncHomeStats();
        checkDeletionNotices();
      },
      onKicked: (msg) => {
        MP.clearCube();
        showNotice(msg, true);
        syncMpUI();
      },
      onNotice: (msg) => showNotice(msg, true),
    });
    MP.init();

    // ---- Profile modal ----
    const pb = el("btnProfileHome");
    if (pb) pb.addEventListener("click", () => openModal("modalProfile"));

    function profileMsg(t) { var m = el("profMsg"); if (m) m.textContent = t || ""; }

    el("btnProfLogin").addEventListener("click", () => {
      profileMsg("");
      MP.login(el("profEmail").value.trim(), el("profPass").value)
        .then(() => { profileMsg(""); syncAccountUI(); syncMpUI(); })
        .catch((e) => profileMsg(friendlyAuthError(e)));
    });
    el("btnProfRegister").addEventListener("click", () => {
      profileMsg("");
      MP.register(el("profEmail").value.trim(), el("profPass").value)
        .then(() => { profileMsg(""); syncAccountUI(); syncMpUI(); })
        .catch((e) => profileMsg(friendlyAuthError(e)));
    });
    el("btnProfLogout").addEventListener("click", async () => {
      if (MP.isActive()) await MP.leave(false);
      MP.logout().then(() => { syncAccountUI(); syncMpUI(); }).catch((e) => profileMsg(friendlyAuthError(e)));
    });

    el("btnProfUser").addEventListener("click", async () => {
      try {
        const nm = await NET.updateUsername(el("profUser").value.trim());
        el("profUser").value = "";
        profileMsg("Username set to " + nm);
        syncAccountUI();
      } catch (e) { profileMsg(e.message || String(e)); }
    });

    el("btnProfPass").addEventListener("click", async () => {
      const oldP = el("profOldPass").value;
      const newP = el("profNewPass").value;
      if (!newP || newP.length < 6) { profileMsg("New password must be 6+ chars"); return; }
      try {
        const cu = firebase.auth().currentUser;
        if (!cu) { profileMsg("Not logged in"); return; }
        const EmailAuthProvider = firebase.auth.EmailAuthProvider;
        await cu.reauthenticateWithCredential(EmailAuthProvider.credential(cu.email, oldP));
        await cu.updatePassword(newP);
        el("profOldPass").value = ""; el("profNewPass").value = "";
        profileMsg("Password changed");
      } catch (e) { profileMsg(friendlyAuthError(e)); }
    });

    el("btnProfHost").addEventListener("click", async () => {
      try { await MP.host(); showNotice("Room " + MP.getCode() + " created — send the code!", false); }
      catch (e) { showNotice(String(e.message || e), true); }
      syncMpUI();
    });
    el("btnProfJoin").addEventListener("click", async () => {
      try { await MP.join(el("profCode").value.trim().toUpperCase()); showNotice("Joined " + MP.peerName() + "'s room", false); }
      catch (e) { showNotice(String(e.message || e), true); }
      syncMpUI();
    });
    el("btnProfCopy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(MP.getCode()); } catch (e) {}
      showNotice("Code " + MP.getCode() + " copied", false);
    });
    el("btnProfLeave").addEventListener("click", async () => {
      MP.clearCube();
      const wasHost = MP.getSlot() === "host";
      await MP.leave(true);
      showNotice(wasHost ? "Room closed" : "Left the room", false);
      syncMpUI();
    });

    el("btnProfSync").addEventListener("click", async () => {
      const cu = (typeof firebase !== 'undefined' && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
      const u = (NET.getUser && NET.getUser()) || (MP.getUser && MP.getUser()) || (cu ? {uid: cu.uid} : null);
      if (!u) { profileMsg("Not logged in"); return; }
      const st = el("profCloudStatus"); if (st) st.textContent = "Uploading…";
      try {
        const saved = await NET.syncCloud({ deaths: save_.data.deaths, jumps: save_.data.jumps, coins: save_.data.coins, coinPaid: save_.data.coinPaid, coinMigrated: !!save_.data.coinMigrated, codes: save_.data.codes, skin: save_.data.skin, unlocked: save_.data.unlocked, beaten: save_.data.beaten, best: save_.data.best, secretA: !!save_.data.secretA, spaceMenu: !!save_.data.spaceMenu });
        if (st) st.textContent = "Cloud updated " + new Date(saved.updatedAt).toLocaleTimeString();
        profileMsg("Synced to cloud");
        syncHomeStats();
      } catch (e) { if (st) st.textContent = ""; profileMsg(e.message || String(e)); }
    });
    el("btnProfDownload").addEventListener("click", async () => {
      const cu = (typeof firebase !== 'undefined' && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
      const u = (NET.getUser && NET.getUser()) || (MP.getUser && MP.getUser()) || (cu ? {uid: cu.uid} : null);
      if (!u) { profileMsg("Not logged in"); return; }
      if (!confirm("Download from cloud? This merges cloud progress into this device.")) return;
      try {
        const cloud = await NET.downloadCloud();
        save_.data.deaths = Math.max(save_.data.deaths|0, cloud.deaths|0);
        save_.data.jumps = Math.max(save_.data.jumps|0, cloud.jumps|0);
        save_.data.coins = Math.max(save_.data.coins|0, cloud.coins|0);
        if (cloud.coinMigrated) save_.data.coinMigrated = true;
        if (cloud.coinPaid) { save_.data.coinPaid = save_.data.coinPaid || {}; for (var ck in cloud.coinPaid) save_.data.coinPaid[ck] = true; }
        if (cloud.codes) { save_.data.codes = save_.data.codes || {}; for (var cd in cloud.codes) save_.data.codes[cd] = true; }
        if (Array.isArray(cloud.unlocked)) { const s2 = {}; save_.data.unlocked.forEach(function(id){s2[id]=true;}); cloud.unlocked.forEach(function(id){s2[id]=true;}); save_.data.unlocked = Object.keys(s2).map(function(k){return parseInt(k,10);}).sort(function(a,b){return a-b;}); }
        if (cloud.beaten) { for (var k in cloud.beaten) save_.data.beaten[k]=true; }
        if (cloud.best) { for (var k2 in cloud.best) { if (save_.data.best[k2]==null || cloud.best[k2] < save_.data.best[k2]) save_.data.best[k2]=cloud.best[k2]; } }
        if (cloud.skin) save_.data.skin = cloud.skin;
        if (cloud.secretA) save_.data.secretA = true;
        if (cloud.spaceMenu) save_.data.spaceMenu = true;
        save(); syncHomeStats(); renderLevels();
        profileMsg("Downloaded from cloud");
        checkUnlocks();
      } catch (e) { profileMsg(e.message || String(e)); }
    });

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => state.keys.clear());
    window.addEventListener(
      "wheel",
      (ev) => {
        if (state.screen !== "game") return;
        ev.preventDefault();
        const step = ev.deltaY > 0 ? -0.25 : 0.25;
        cam.zoom = Math.max(1.5, Math.min(9, Math.round((cam.zoom + step) * 100) / 100));
      },
      { passive: false }
    );
    window.addEventListener("gamepadconnected", (ev) => {
      showNotice("Controller connected: " + (ev.gamepad && ev.gamepad.id ? ev.gamepad.id.slice(0, 40) : "gamepad"), false);
    });
    window.addEventListener("gamepaddisconnected", () => {
      showNotice("Controller disconnected", false);
    });

    DP.loadAssets()
      .then((images) => {
        state.images = images;
        loadLevels();
      })
      .catch((err) => {
        el("levelList").innerHTML =
          '<p class="loading-note">Failed to load sprites.<br />' +
          escapeHtml(err.message || String(err)) +
          "</p>";
      });
    migrateCoins();
    checkUnlocks();
    applySpaceTheme();
    syncHomeStats();
    syncCoinUI();
    syncFpsVis();
    show("home");
    requestAnimationFrame(frame);
  }

boot();

  // Splash screen hide after animation (1.6s total)
  setTimeout(() => {
    const splash = document.getElementById("splashRoot");
    if (splash) splash.classList.add("hidden");
  }, 1600);
  })();
