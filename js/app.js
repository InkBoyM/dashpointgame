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
    "The_Rush.dashpoint.json": 3,
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
    iwanttoberichbutimbrokesoimadeacodethatwouldgivemeatrillioncoins: { coins: 1000000000000 },
    lucky: { coins: 777 },
    please: { coins: 5000 },
    gimmecoins: { coins: 10000 },
    dashpoint: { coins: 25000 },
    imstillbroke: { coins: 100000 },
    jackpot: { coins: 1000000 },
    notatrillionbutclose: { coins: 100000000 },
    championkey: { keys: 1 },
    superkey: { keys: 1 },
    goldensmile: { keys: 1 },
    k7q2xm9p: { keys: 1 },
    r4nd0mk3y: { keys: 1 },
    openthechampionchest: { keys: 1 },
    triplekey: { keys: 3 },
    thebestskinever: { skin: 29 },
  };

  function coinIcon(cls) {
    return '<img class="' + (cls || "coin-icon") + '" src="assets/ui/coin.png" alt="" />';
  }

  function keyIcon(cls) {
    return '<img class="' + (cls || "coin-icon key-icon") + '" src="assets/ui/champion-key.png" alt="" />';
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

  function coinAmount(n) {
    if (typeof n === "bigint") return n > 0n ? n : 0n;
    if (typeof n === "number") {
      if (!isFinite(n) || n <= 0) return 0n;
      if (n <= Number.MAX_SAFE_INTEGER) return BigInt(Math.floor(n));
    }
    let s = String(n == null ? "0" : n).trim().replace(/[,_\s]/g, "");
    const sci = /^([0-9]+)(?:\.([0-9]+))?e\+?([0-9]+)$/i.exec(s);
    if (sci) {
      const digits = sci[1] + (sci[2] || "");
      const zeros = (parseInt(sci[3], 10) || 0) - (sci[2] ? sci[2].length : 0);
      s = zeros >= 0 ? digits + Array(zeros + 1).join("0") : digits;
    }
    if (!/^\d+$/.test(s)) return 0n;
    try {
      const v = BigInt(s);
      return v > 0n ? v : 0n;
    } catch (e) {
      return 0n;
    }
  }

  function coinsString(n) {
    return coinAmount(n).toString();
  }

  function coinsMax(a, b) {
    a = coinAmount(a);
    b = coinAmount(b);
    return (a > b ? a : b).toString();
  }

  function hasCoins(n) {
    return coinAmount(save_.data.coins) >= coinAmount(n);
  }

  function addCoins(n) {
    save_.data.coins = (coinAmount(save_.data.coins) + coinAmount(n)).toString();
  }

  function subCoins(n) {
    const next = coinAmount(save_.data.coins) - coinAmount(n);
    save_.data.coins = (next > 0n ? next : 0n).toString();
  }

  function keyAmount(n) {
    const v = Math.floor(Number(n) || 0);
    return v > 0 ? v : 0;
  }

  function grantCoins(n, key) {
    n = coinAmount(n);
    if (n <= 0n) return 0n;
    save_.data.coinPaid = save_.data.coinPaid || {};
    if (key && save_.data.coinPaid[key]) return 0n;
    if (key) save_.data.coinPaid[key] = true;
    addCoins(n);
    return n;
  }

  function migrateCoins() {
    save_.data.coins = coinsString(save_.data.coins);
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
    const html = coinIcon() + "<b>" + fmtCoins(save_.data.coins) + "</b>";
    const a = el("skinsCoins");
    if (a) a.innerHTML = html;
    const b = el("shopCoins");
    if (b) b.innerHTML = html;
    const c = el("codesCoins");
    if (c) c.innerHTML = html;
    const d = el("chestCoins");
    if (d) d.innerHTML = html;
    const w = el("wheelCoins");
    if (w) w.innerHTML = html;
    const keys = keyIcon() + "<b>" + keyAmount(save_.data.championKeys) + "</b>";
    const ck = el("chestKeys");
    if (ck) ck.innerHTML = keys;
    const cd = el("codesKeys");
    if (cd) cd.innerHTML = keys;
  }

  const CHEST_LOOT = [
    { coins: 100, chance: 60 },
    { coins: 500, chance: 50 },
    { coins: 1000, chance: 20 },
    { coins: 5000, chance: 10 },
    { coins: 10000, chance: 5 },
    { coins: 1000000, chance: 1 },
    { coins: 5000000, chance: 0.5 },
  ];

  const GOLD_CHEST_LOOT = [
    { coins: 500, chance: 70 },
    { coins: 1000, chance: 50 },
    { coins: 5000, chance: 30 },
    { coins: 10000, chance: 20 },
    { coins: 50000, chance: 20 },
    { coins: 1000000, chance: 10 },
    { coins: 5000000, chance: 5 },
    { coins: 10000000, chance: 1 },
    { coins: 100000000, chance: 0.5 },
    { coins: 1000000000000, chance: 0.1 },
  ];

  const DIAMOND_CHEST_LOOT = [
    { coins: 1000, chance: 60 },
    { coins: 5000, chance: 50 },
    { coins: 10000, chance: 45 },
    { coins: 100000, chance: 30 },
    { coins: 500000, chance: 25 },
    { coins: 1000000, chance: 20 },
    { coins: 5000000, chance: 15 },
    { coins: 10000000, chance: 10 },
    { coins: 100000000, chance: 5 },
    { coins: 1000000000, chance: 1 },
    { coins: 5000000000, chance: 0.5 },
    { coins: 10000000000, chance: 0.1 },
  ];

  const KING_CHEST_LOOT = [
    { coins: 100000, chance: 50 },
    { coins: 500000, chance: 45 },
    { coins: 1000000, chance: 40 },
    { coins: 5000000, chance: 35 },
    { coins: 10000000, chance: 30 },
    { coins: 100000000, chance: 25 },
    { coins: 500000000, chance: 20 },
    { coins: 1000000000, chance: 15 },
    { coins: 5000000000, chance: 10 },
    { coins: 10000000000, chance: 5 },
    { coins: 100000000000, chance: 1 },
    { coins: 1000000000000, chance: 0.5 },
    { coins: 5000000000000, chance: 0.1 },
  ];

  const CHAMPION_CHEST_LOOT = [
    { coins: "1000000000000", chance: 60 },
    { coins: "5000000000000", chance: 55 },
    { coins: "10000000000000", chance: 50 },
    { coins: "100000000000000", chance: 45 },
    { coins: "1000000000000000", chance: 40 },
    { coins: "1000000000000000000", chance: 35 },
    { coins: "10000000000000000", chance: 30 },
    { coins: "50000000000000000", chance: 25 },
    { coins: "1000000000000000000", chance: 20 },
    { coins: "1000000000000000000000", chance: 10 },
  ];

  function fmtCoins(n) {
    return coinsString(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function rollChestLoot(table) {
    table = table || CHEST_LOOT;
    let total = 0;
    for (let i = 0; i < table.length; i++) total += table[i].chance;
    let r = Math.random() * total;
    for (let i = 0; i < table.length; i++) {
      r -= table[i].chance;
      if (r <= 0) return table[i];
    }
    return table[table.length - 1];
  }

  function fmtWait(ms) {
    if (ms <= 0) return "now";
    const s = Math.ceil(ms / 1000);
    if (s < 3600) return Math.max(1, Math.ceil(s / 60)) + "m";
    if (s < 86400) return Math.max(1, Math.ceil(s / 3600)) + "h";
    return Math.max(1, Math.ceil(s / 86400)) + "d";
  }

  function nextChestFreeAt(kind, last) {
    last = Number(last) || 0;
    if (!last) return 0;
    const prev = new Date(last);
    if (kind === "basic") {
      const n = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      return n.getTime();
    }
    if (kind === "gold") {
      const n = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
      const day = (n.getDay() + 6) % 7;
      n.setDate(n.getDate() - day + 7);
      return n.getTime();
    }
    return 0;
  }

  function chestKindSpec(kind) {
    const map = {
      basic: { loot: CHEST_LOOT, btn: "btnUnlockChest", priceEl: "chestPriceBasic", label: "chest", opening: "Opening…", cost: 100, freeLabel: "daily" },
      gold: { loot: GOLD_CHEST_LOOT, btn: "btnUnlockGoldChest", priceEl: "chestPriceGold", label: "gold chest", opening: "Opening gold chest…", cost: 10000, freeLabel: "weekly" },
      diamond: { loot: DIAMOND_CHEST_LOOT, btn: "btnUnlockDiamondChest", priceEl: "chestPriceDiamond", label: "diamond chest", opening: "Opening diamond chest…", cost: 100000, freeLabel: "" },
      king: { loot: KING_CHEST_LOOT, btn: "btnUnlockKingChest", priceEl: "chestPriceKing", label: "king's chest", opening: "Opening The king's chest…", cost: 1000000000, freeLabel: "" },
      champion: { loot: CHAMPION_CHEST_LOOT, btn: "btnUnlockChampionChest", priceEl: "chestPriceChampion", label: "Champion Chest", opening: "Opening The Champion Chest…", cost: 0, freeLabel: "", keyCost: 1 },
    };
    return map[kind] || map.basic;
  }

  function chestFreeReady(kind) {
    const spec = chestKindSpec(kind);
    if (!spec.freeLabel) return false;
    const last = save_.data.chestFree && save_.data.chestFree[kind];
    const next = nextChestFreeAt(kind, last);
    return !next || Date.now() >= next;
  }

  function syncChestPrices() {
    ["basic", "gold", "diamond", "king", "champion"].forEach(function (kind) {
      const spec = chestKindSpec(kind);
      const node = el(spec.priceEl);
      if (!node) return;
      if (spec.keyCost) {
        node.classList.add("paid");
        node.innerHTML = '<img class="chest-key-icon" src="assets/ui/champion-key.png" alt="" /> 1 KEY';
        return;
      }
      if (chestFreeReady(kind)) {
        node.classList.remove("paid");
        node.textContent = "FREE " + spec.freeLabel;
        return;
      }
      node.classList.add("paid");
      if (!spec.freeLabel) {
        node.textContent = fmtCoins(spec.cost);
        return;
      }
      const last = save_.data.chestFree && save_.data.chestFree[kind];
      const wait = fmtWait(nextChestFreeAt(kind, last) - Date.now());
      node.textContent = fmtCoins(spec.cost) + " · free in " + wait;
    });
  }

  let chestBusy = false;
  function unlockChest(kind) {
    if (chestBusy) return;
    const spec = chestKindSpec(kind);
    const free = chestFreeReady(kind);
    if (spec.keyCost) {
      if (keyAmount(save_.data.championKeys) < spec.keyCost) {
        showNotice("Need a Champion Key to open this chest", true);
        const msg = el("chestMsg");
        if (msg) {
          msg.style.color = "var(--red)";
          msg.textContent = "Need a Champion Key. Redeem codes to get keys.";
        }
        return;
      }
      save_.data.championKeys = keyAmount(save_.data.championKeys) - spec.keyCost;
      save();
      syncCoinUI();
    } else if (!free) {
      if (!hasCoins(spec.cost)) {
        showNotice("Need " + fmtCoins(spec.cost) + " coins to open this chest", true);
        const msg = el("chestMsg");
        if (msg) {
          msg.style.color = "var(--red)";
          msg.textContent = spec.freeLabel
            ? "Need " + fmtCoins(spec.cost) + " coins, or wait for the free " + spec.freeLabel + " open."
            : "Need " + fmtCoins(spec.cost) + " coins to open this chest.";
        }
        return;
      }
      subCoins(spec.cost);
      save();
      syncCoinUI();
    }
    const btn = el(spec.btn);
    const msg = el("chestMsg");
    chestBusy = true;
    if (btn) {
      btn.classList.remove("prize");
      btn.classList.add("opening");
    }
    if (msg) {
      msg.style.color = "";
      msg.textContent = spec.opening;
    }
    setTimeout(function () {
      const prize = rollChestLoot(spec.loot);
      const got = grantCoins(prize.coins);
      if (free) {
        save_.data.chestFree = save_.data.chestFree || {};
        save_.data.chestFree[kind] = Date.now();
      }
      save();
      syncCoinUI();
      syncHomeStats();
      syncChestPrices();
      if (btn) {
        btn.classList.remove("opening");
        btn.classList.add("prize");
      }
      if (msg) {
        msg.style.color = coinAmount(prize.coins) >= 1000000n ? "var(--cyan)" : "var(--gold)";
        const spent = spec.keyCost
          ? " (−" + spec.keyCost + " key)"
          : (free ? "" : " (−" + fmtCoins(spec.cost) + ")");
        msg.textContent = "+" + fmtCoins(got) + " coins!" + spent;
      }
      showNotice("+" + fmtCoins(got) + " coins from a " + spec.label, false);
      setTimeout(function () {
        if (btn) btn.classList.remove("prize");
        chestBusy = false;
      }, 360);
    }, 560);
  }

  const LEVEL_FILES = [
    "00_Welcome.dashpoint.json",
    "Orb_run.dashpoint.json",
    "spike_run.dashpoint.json",
    "the_climb.dashpoint.json",
    "The_Rush.dashpoint.json",
    "Agony.dashpoint.json",
    "The_Tower_of_Torture.dashpoint.json",
    "The_Tunnel.dashpoint.json",
  ];

  const SKINS = window.DashPointSkins || [];
  const DEFAULT_KEYS = { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], jump: ["KeyW", "ArrowUp", "Space"] };

  const CLIMB_FILE = "the_climb.dashpoint.json";

  const SHOP_TAGS = [
    { id: "cool", label: "cool", cost: 100, color: "#2ee6ff" },
    { id: "noob", label: "noob", cost: 250, color: "#9db4d8" },
    { id: "pro", label: "pro", cost: 500, color: "#3ee07a" },
    { id: "gamer", label: "gamer", cost: 750, color: "#ff9d2e" },
    { id: "og", label: "og", cost: 5000, color: "#ffd23c" },
    { id: "vip", label: "vip", cost: 25000, color: "#e8c4ff" },
    { id: "dash", label: "dash", cost: 50000, color: "#2ee6ff" },
    { id: "speed", label: "speed", cost: 100000, color: "#ff4d62" },
    { id: "legend", label: "legend", cost: 500000, color: "#ffd23c" },
    { id: "rich", label: "rich", cost: 1000000, color: "#ffd23c" },
    { id: "king", label: "king", cost: 2500000, color: "#e8c4ff" },
    { id: "god", label: "god", cost: 5000000, color: "#ff4d62" },
    { id: "super-rich", label: "Super Rich", cost: 10000000, color: "#ffe27a" },
    { id: "billionare", label: "Billionare", cost: 1000000000, color: "#2ee6ff" },
    { id: "trillionare", label: "Trillionare", cost: 1000000000000, color: "#ffffff" },
  ];

  function findShopTag(id) {
    for (let i = 0; i < SHOP_TAGS.length; i++) if (SHOP_TAGS[i].id === id) return SHOP_TAGS[i];
    return null;
  }

  function ownsTag(id) {
    return (save_.data.tags || []).indexOf(id) !== -1;
  }

  function equippedTag() {
    return findShopTag(save_.data.tag);
  }

  function equippedTagId() {
    return findShopTag(save_.data.tag) ? save_.data.tag : "";
  }

  function tagChipHtml(tag) {
    if (!tag) return "";
    return '<span class="acct-tag" style="color:' + tag.color + ";border-color:" + tag.color + '">{' + escapeHtml(tag.label) + "}</span>";
  }

  function taggedNameHtml(name, tagId, extra) {
    const tag = findShopTag(tagId);
    return escapeHtml(name || "player") + (extra || "") + (tag ? " " + tagChipHtml(tag) : "");
  }

  function tagIdForUid(uid) {
    uid = String(uid || "");
    if (!uid) return "";
    const net = window.DPNet;
    const mp = window.DashPointMP;
    const me = (mp && mp.getUser && mp.getUser()) || (net && net.getUser && net.getUser());
    if (me && me.uid === uid) return equippedTagId();
    const u = (usersIndexCache || []).find(function (x) { return x.uid === uid; });
    return u && findShopTag(u.tag) ? u.tag : "";
  }

  let lastPublishedTag = undefined;
  function publishPublicTag() {
    const id = equippedTagId();
    try {
      const mp = window.DashPointMP;
      if (mp && mp.setTag) mp.setTag(id);
    } catch (e) {}
    const net = window.DPNet;
    const loggedIn = !!(net && net.getUser && net.getUser());
    if (!loggedIn || lastPublishedTag === id || !net.syncStats) return;
    net.syncStats({ tag: id }).then(function () { lastPublishedTag = id; }).catch(function () {});
  }

  function syncAccountTagUI() {
    const tag = equippedTag();
    const wrap = el("profTagWrap");
    const chip = el("profAcctTag");
    if (wrap) wrap.classList.toggle("hidden", !tag);
    if (chip) chip.innerHTML = tag ? tagChipHtml(tag) : "";
    const home = el("homeAccount");
    if (home) {
      const u = (typeof MP !== "undefined" && MP.getUser) ? MP.getUser() : (window.DashPointMP && window.DashPointMP.getUser && window.DashPointMP.getUser());
      if (!u) {
        home.classList.add("hidden");
        home.innerHTML = "";
      } else {
        home.classList.remove("hidden");
        home.innerHTML = "<b>" + escapeHtml(u.name || "player") + "</b>" + (tag ? ' <span class="acct-tag-wrap">Tag: ' + tagChipHtml(tag) + "</span>" : "");
      }
    }
    publishPublicTag();
  }

  function defaultSave() {
    return { deaths: 0, jumps: 0, playtime: 0, coins: "0", coinPaid: {}, coinMigrated: false, codes: {}, skin: 1, unlocked: [1, 2, 3, 4, 5], beaten: {}, best: {}, attempts: {}, hitboxes: false, debugFps: false, autoRespawn: true, spaceMenu: false, graphics: "normal", tags: [], tag: "", chestFree: { basic: 0, gold: 0, diamond: 0, king: 0 }, championKeys: 0 };
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
      s.playtime = Number(s.playtime) || 0;
      s.coins = coinsString(s.coins);
      s.championKeys = keyAmount(s.championKeys);
      s.coinPaid = s.coinPaid && typeof s.coinPaid === "object" ? s.coinPaid : {};
      s.coinMigrated = !!s.coinMigrated;
      s.codes = s.codes && typeof s.codes === "object" ? s.codes : {};
      s.tags = Array.isArray(s.tags) ? s.tags.filter(function (id) { return !!findShopTag(id); }) : [];
      s.tag = findShopTag(s.tag) && s.tags.indexOf(s.tag) !== -1 ? s.tag : "";
      const cf = s.chestFree && typeof s.chestFree === "object" ? s.chestFree : {};
      s.chestFree = {
        basic: Number(cf.basic) || 0,
        gold: Number(cf.gold) || 0,
        diamond: Number(cf.diamond) || 0,
        king: Number(cf.king) || 0,
      };
      s.graphics = s.graphics === "good" || s.graphics === "simple" ? s.graphics : "normal";
      return s;
    } catch (e) {
      return defaultSave();
    }
  }

  function save() {
    try {
      save_.data.coins = coinsString(save_.data.coins);
      save_.data.championKeys = keyAmount(save_.data.championKeys);
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
    spectateUid: null,
    qcOpen: false,
    qcSel: 0,
    keys: new Set(),
    lastFrame: 0,
  };

  // ---- Quick chat state ----
  const QC_FIXED = ["Hi", "Hello", "Where are you", "Nice", "Tuff", "Bye", "Dashpoint is the best game ever made", "\uD83D\uDD25", "\uD83D\uDE00"];
  let qbubbles = [];
  let lastChatSeen = {};

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
  function paintLeaderboard(box, list, opts) {
    opts = opts || {};
    var u = opts.user || null;
    var canRace = !!opts.canRace;
    var html = '<div class="lb-title">' + (opts.title || "TOP 10") + "</div>";
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      var isMe = u && row.uid === u.uid;
      var skinSrc = (window.DashPointSkins && window.DashPointSkins[row.skin - 1] ? window.DashPointSkins[row.skin - 1].src : "assets/skins/skin-1.png");
      var race = canRace && !isMe;
      var attr = race ? (' data-uid="' + escapeHtml(row.uid) + '" data-name="' + escapeHtml(row.name) + '"') : "";
      html += '<div class="lb-row' + (isMe ? " lb-me" : race ? " lb-race" : "") + '"' + attr + '><span class="lb-rank">#' + (i + 1) + '</span><img class="lb-skin" src="' + skinSrc + '" alt="" /><span class="lb-name">' + taggedNameHtml(row.name, row.tag || (isMe ? equippedTagId() : tagIdForUid(row.uid)), isMe ? " (you)" : "") + '</span><span class="lb-time">' + fmtTime(row.time) + "</span>" + (race ? '<span class="lb-race-hint">RACE ▶</span>' : "") + "</div>";
    }
    if (opts.extraRow) html += opts.extraRow;
    box.innerHTML = html;
    if (canRace) {
      box.querySelectorAll(".lb-race").forEach(function (r) {
        r.addEventListener("click", function () { raceGhost(r.dataset.uid, r.dataset.name); });
      });
    }
  }

  async function fetchLevelLeaderboard(box, entry, opts) {
    opts = opts || {};
    if (!box) return [];
    box.innerHTML = '<p class="loading-note">Loading leaderboard…</p>';
    var file = entry.file || entry.id || "unknown";
    var name = entry.level ? entry.level.name : file;
    if (!window.DPNet || !DPNet.getLeaderboard) {
      box.innerHTML = '<p class="loading-note">Online leaderboard is unavailable.</p>';
      return [];
    }
    try {
      var list = await DPNet.getLeaderboard(file, 10);
      if (!list.length) {
        box.innerHTML = '<p class="loading-note">' + (opts.empty || "No times yet. Be the first!") + "</p>";
        return [];
      }
      var u = opts.user !== undefined ? opts.user : (DPNet.getUser ? DPNet.getUser() : null);
      paintLeaderboard(box, list, {
        user: u,
        canRace: !!opts.canRace,
        title: "TOP 10 — " + escapeHtml(name) + (opts.titleExtra || ""),
        extraRow: opts.extraRow || "",
      });
      return list;
    } catch (e) {
      box.innerHTML = '<p class="loading-note">Leaderboard failed: ' + escapeHtml(e.message || String(e)) + "</p>";
      return [];
    }
  }

  let mainLbPlayIndex = -1;
  async function showMainLevelLeaderboard(entry, index) {
    mainLbPlayIndex = index;
    openModal("modalMainLb");
    el("mainLbTitle").textContent = (entry.level && entry.level.name ? entry.level.name : "LEVEL").toUpperCase();
    await fetchLevelLeaderboard(el("mainLbBox"), entry, { canRace: false });
  }

  async function showLeaderboardAfterWin(entry, time){
    var box = el("leaderboardBox");
    if (!box) return;
    var file = entry.file || entry.id || "unknown";
    try {
      var u = (window.DPNet && DPNet.getUser) ? DPNet.getUser() : null;
      var res = null;
      if (u) {
        try { res = await DPNet.submitLeaderboard(file, time, save_.data.skin, equippedTagId()); } catch(e){}
      }
      var extra = "";
      if (res && res.rank && res.rank > 10) {
        extra = '<div class="lb-row lb-me"><span class="lb-rank">#' + res.rank + '</span><span class="lb-name">You</span><span class="lb-time">' + fmtTime(time) + "</span></div>";
      } else if (!u) {
        extra = '<div class="lb-row lb-me"><span class="lb-rank">—</span><span class="lb-name">You (not submitted)</span><span class="lb-time">' + fmtTime(time) + "</span></div>";
      }
      var list = await fetchLevelLeaderboard(box, entry, {
        user: u,
        canRace: true,
        titleExtra: u ? " · tap a player to race" : "",
        empty: (u ? "No leaderboard yet — you are #1!" : "No times yet.") + "<br>Your time: " + fmtTime(time),
        extraRow: extra,
      });
      if (u && list.length && !list.find(function (x) { return x.uid === u.uid; }) && !(res && res.rank > 10)) {
        box.insertAdjacentHTML("beforeend", '<div class="lb-row lb-me"><span class="lb-rank">—</span><span class="lb-name">You</span><span class="lb-time">' + fmtTime(time) + "</span></div>");
      }
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
    if (u.type === "shop") return (u.deaths | 0) > 0 && save_.data.deaths >= u.deaths;
    if (u.type === "code") return false;
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
      if (isCodeSkin(s)) continue;
      if (isShopSkin(s) && !((s.unlock && s.unlock.deaths) | 0)) continue;
      if (!isUnlocked(s.id) && meetsUnlock(s.unlock)) {
        save_.data.unlocked.push(s.id);
        if (!isShopSkin(s)) grantCoins(COIN_PER_SKIN, "skin:" + s.id);
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
          '<span class="hs-chip">COINS <b>' + fmtCoins(save_.data.coins) + "</b></span>";
      } else {
        stats.textContent =
          "LEVELS " + beaten + "/" + state.levels.length + " CLEARED · DEATHS " + save_.data.deaths + " · SKINS " + got + "/" + total + " · COINS " + fmtCoins(save_.data.coins);
      }
    }
    const preview = el("homeSkinPreview");
    const equipped = SKINS.find((s) => s.id === save_.data.skin) || SKINS[0];
    if (preview && equipped) preview.src = equipped.src;
    syncAccountTagUI();
  }

  function show(name) {
    if (state.qcOpen) closeQuickChat();
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
      const b = document.createElement("div");
      const done = save_.data.beaten[entry.file] !== undefined;
      const best = save_.data.best[entry.file];
      const diff = diffTier(localDiff(entry.file));
      b.className = "level-card diff-" + diff + (done ? " cleared" : "");
      b.setAttribute("role", "button");
      b.tabIndex = 0;
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
      const lbBtn = document.createElement("button");
      lbBtn.type = "button";
      lbBtn.className = "px-btn tiny level-lb";
      lbBtn.textContent = "TOP 10";
      lbBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        showMainLevelLeaderboard(entry, i);
      });
      b.appendChild(lbBtn);
      b.addEventListener("click", function () { startLevel(i); });
      b.addEventListener("keydown", function (ev) {
        if (ev.target !== b) return;
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          startLevel(i);
        }
      });
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
        } else if (s.unlock && s.unlock.type === "shop" && (s.unlock.deaths | 0) > 0) {
          let need = s.unlock.deaths | 0; let have = save_.data.deaths | 0;
          hint = have + "/" + need + " deaths or " + ((s.unlock.cost | 0)) + " coins";
        } else hint = s.hint || "LOCKED";
      }
      b.innerHTML = '<img src="' + s.src + '" alt="" />' + '<span class="skin-name">' + escapeHtml(s.name) + "</span>" + '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      if (!unlocked && s.unlock && (s.unlock.type === "deaths" || s.unlock.type === "jumps" || s.unlock.type === "either" || (s.unlock.type === "shop" && (s.unlock.deaths | 0) > 0))) {
        let pct = 0;
        if (s.unlock.type === "either") {
          let jp = s.unlock.jumps ? Math.min(100, Math.floor((save_.data.jumps | 0) / s.unlock.jumps * 100)) : 0;
          let dp = s.unlock.deaths ? Math.min(100, Math.floor(save_.data.deaths / s.unlock.deaths * 100)) : 0;
          pct = Math.max(jp, dp);
        } else if (s.unlock.type === "shop") {
          pct = Math.min(100, Math.floor((save_.data.deaths | 0) / s.unlock.deaths * 100));
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
    const deaths = SKINS.filter(function(s){ return s.unlock && (s.unlock.type==="deaths" || (s.unlock.type==="either" && s.unlock.deaths) || (s.unlock.type==="shop" && s.unlock.deaths)); }).sort(function(a,b){ return (a.unlock.n || a.unlock.deaths || 0) - (b.unlock.n || b.unlock.deaths || 0); });
    const jumps = SKINS.filter(function(s){ return s.unlock && (s.unlock.type==="jumps" || (s.unlock.type==="either" && s.unlock.jumps)); }).sort(function(a,b){ return (a.unlock.n || a.unlock.jumps || 0) - (b.unlock.n || b.unlock.jumps || 0); });
    const victory = SKINS.filter(function(s){ return s.unlock && (s.unlock.type==="beat" || s.unlock.type==="diff"); });
    const secret = SKINS.filter(function(s){ return s.unlock && s.unlock.type==="secreta"; });
    addSection("STARTER", starter, "Always unlocked");
    addSection("DEATHS — die to unlock", deaths, "Progress shown per skin");
    addSection("JUMPS", jumps, "Jump to unlock");
    addSection("VICTORY — beat levels", victory, "");
    addSection("SECRET", secret, "Hidden — tap the SKINS title 7 times or press Alt+A");
    const shopOwned = SKINS.filter(function(s){ return isShopSkin(s) && isUnlocked(s.id) && !(s.unlock && s.unlock.deaths); });
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
      box.innerHTML = '<p class="loading-note">No skins in the shop.</p>';
    } else {
    items.forEach(function (s) {
      const owned = isUnlocked(s.id);
      const cost = coinAmount(s.unlock && s.unlock.cost);
      const can = hasCoins(cost);
      const b = document.createElement("button");
      b.className = "skin-tile" + (owned && save_.data.skin === s.id ? " selected" : "") + (!owned && !can ? " cant" : "");
      const deathNeed = (s.unlock && s.unlock.deaths) | 0;
      const hint = owned
        ? (save_.data.skin === s.id ? "EQUIPPED" : "TAP TO EQUIP")
        : can
          ? "TAP TO BUY"
          : deathNeed
            ? "NEED " + fmtCoins(cost) + " OR DIE " + deathNeed
            : "NEED " + fmtCoins(cost);
      b.innerHTML =
        '<img src="' + s.src + '" alt="" />' +
        '<span class="skin-name">' + escapeHtml(s.name) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
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
    }
    renderShopTags();
    syncCoinUI();
  }

  function renderShopTags() {
    const box = el("shopTagGrid");
    if (!box) return;
    box.innerHTML = "";
    SHOP_TAGS.forEach(function (tag) {
      const owned = ownsTag(tag.id);
      const equipped = save_.data.tag === tag.id;
      const cost = coinAmount(tag.cost);
      const can = hasCoins(cost);
      const b = document.createElement("button");
      b.className = "skin-tile" + (equipped ? " selected" : "") + (!owned && !can ? " cant" : "");
      const hint = owned ? (equipped ? "EQUIPPED" : "TAP TO EQUIP") : can ? "TAP TO BUY" : "NEED " + fmtCoins(cost);
      b.innerHTML =
        '<span class="tag-preview" style="color:' + tag.color + '">{' + escapeHtml(tag.label) + "}</span>" +
        '<span class="skin-name">' + escapeHtml(tag.label) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
        '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      b.addEventListener("click", function () {
        if (owned) {
          save_.data.tag = equipped ? "" : tag.id;
          save();
          lastPublishedTag = undefined;
          renderShopTags();
          syncAccountTagUI();
          return;
        }
        buyShopTag(tag);
      });
      box.appendChild(b);
    });
  }

  function buyShopTag(tag) {
    if (!tag || ownsTag(tag.id)) return;
    const cost = coinAmount(tag.cost);
    if (!hasCoins(cost)) {
      showNotice("Not enough coins", true);
      return;
    }
    subCoins(cost);
    save_.data.tags = save_.data.tags || [];
    save_.data.tags.push(tag.id);
    save_.data.tag = tag.id;
    save();
    lastPublishedTag = undefined;
    showNotice("Tag {" + tag.label + "} unlocked!", false);
    renderShop();
    syncHomeStats();
    syncCoinUI();
    syncAccountTagUI();
  }

  function buyShopSkin(s) {
    if (!isShopSkin(s) || isUnlocked(s.id)) return;
    const cost = coinAmount(s.unlock && s.unlock.cost);
    if (!hasCoins(cost)) {
      showNotice("Not enough coins", true);
      return;
    }
    subCoins(cost);
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
      const got = coinAmount(reward.coins);
      addCoins(got);
      say("+" + fmtCoins(got) + " coins!", false);
      showNotice("+" + fmtCoins(got) + " coins", false);
    }
    if (reward.keys) {
      const keys = keyAmount(reward.keys);
      save_.data.championKeys = keyAmount(save_.data.championKeys) + keys;
      const keyText = "+" + keys + (keys === 1 ? " Champion Key!" : " Champion Keys!");
      say(keyText, false);
      showNotice(keyText, false);
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

  let wheelBusy = false;
  let wheelRot = 0;
  let wheelTimer = null;

  function wheelSay(text, bad) {
    const msg = el("wheelMsg");
    if (!msg) return;
    msg.textContent = text || "";
    msg.style.color = bad ? "var(--red)" : (text && /BLUE|2×|2x/i.test(text) ? "var(--cyan)" : "");
  }

  function parseWheelWager() {
    const inp = el("wheelWager");
    const raw = inp ? String(inp.value || "").replace(/,/g, "").trim() : "";
    return coinAmount(raw);
  }

  function setWheelWager(n) {
    const inp = el("wheelWager");
    if (!inp) return;
    const v = coinAmount(n);
    inp.value = v > 0n ? v.toString() : "";
  }

  function finishWheelSpin(blue, wager) {
    wheelTimer = null;
    if (blue) {
      const got = coinAmount(wager) * 2n;
      addCoins(got);
      save();
      syncCoinUI();
      syncHomeStats();
      wheelSay("BLUE! +" + fmtCoins(got) + " coins", false);
      showNotice("Wheel: BLUE! +" + fmtCoins(got), false);
    } else {
      wheelSay("RED! Lost " + fmtCoins(wager) + " coins", true);
      showNotice("Wheel: RED! −" + fmtCoins(wager), true);
    }
    wheelBusy = false;
    const btn = el("btnWheelSpin");
    if (btn) btn.disabled = false;
  }

  function spinWheel() {
    if (wheelBusy) return;
    const wager = parseWheelWager();
    if (wager <= 0n) { wheelSay("Enter a wager first.", true); return; }
    if (!hasCoins(wager)) {
      wheelSay("Not enough coins.", true);
      showNotice("Not enough coins", true);
      return;
    }
    wheelBusy = true;
    const btn = el("btnWheelSpin");
    if (btn) btn.disabled = true;
    subCoins(wager);
    save();
    syncCoinUI();
    syncHomeStats();
    wheelSay("Spinning…", false);

    const blue = Math.random() < 0.5;
    const centers = blue ? [135, 315] : [45, 225];
    const land = centers[(Math.random() * centers.length) | 0] + (Math.random() * 50 - 25);
    const extraSpins = 6 + ((Math.random() * 3) | 0);
    const img = el("wheelDisc");
    const cur = wheelRot;
    const curMod = ((cur % 360) + 360) % 360;
    const wantMod = ((360 - land) % 360 + 360) % 360;
    let delta = (wantMod - curMod + 360) % 360;
    if (delta < 80) delta += 360;
    delta += extraSpins * 360;
    wheelRot = cur + delta;
    if (img) {
      img.style.transition = "none";
      img.style.transform = "rotate(" + cur + "deg)";
      void img.offsetWidth;
      img.style.transition = "transform 4.2s cubic-bezier(0.12, 0.7, 0.08, 1)";
      img.style.transform = "rotate(" + wheelRot + "deg)";
    }
    if (wheelTimer) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { finishWheelSpin(blue, wager); }, 4300);
  }

  function openModal(id) {
    el(id).classList.add("visible");
    if (id === "modalSkins") renderSkins();
    if (id === "modalStats") renderStats();
    if (id === "modalShop") renderShop();
    if (id === "modalChest") {
      const msg = el("chestMsg");
      if (msg) {
        msg.textContent = "";
        msg.style.color = "";
      }
      syncCoinUI();
      syncChestPrices();
    }
    if (id === "modalCodes") {
      syncCoinUI();
      const msg = el("codeMsg");
      const inp = el("codeInput");
      if (msg) msg.textContent = "";
      if (inp) { inp.value = ""; setTimeout(function () { inp.focus(); }, 50); }
    }
    if (id === "modalWheel") {
      syncCoinUI();
      if (!wheelBusy) {
        wheelSay("", false);
        const inp = el("wheelWager");
        if (inp && !inp.value) setTimeout(function () { inp.focus(); }, 50);
      }
    }
    if (id === "modalSettings") {
      el("setHitbox").checked = !!save_.data.hitboxes;
      el("setFps").checked = !!save_.data.debugFps;
      el("setAuto").checked = save_.data.autoRespawn !== false;
      syncGfxUI();
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

  function gfxMode() {
    const g = save_.data && save_.data.graphics;
    if (g === "good" || g === "simple") return g;
    return "normal";
  }

  function applyGraphics() {
    document.body.classList.toggle("gfx-good", gfxMode() === "good");
    document.body.classList.toggle("gfx-simple", gfxMode() === "simple");
    if (state.screen === "game") cam.zoom = playZoom();
  }

  function syncGfxUI() {
    const mode = gfxMode();
    document.querySelectorAll(".gfx-opt").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-gfx") === mode);
    });
    const hint = el("gfxHint");
    if (!hint) return;
    if (mode === "good") hint.textContent = "Same crisp sprites as Normal, with a wider view.";
    else if (mode === "simple") hint.textContent = "Faster. Solid colors and fewer effects.";
    else hint.textContent = "Default look.";
  }

  function playZoom() {
    const mode = gfxMode();
    let tiles = 14;
    let lo = 3;
    let hi = 5;
    if (mode === "good") {
      const z = Math.round(el("view").width / (20 * TILE));
      return Math.max(2, Math.min(3, z));
    } else if (mode === "simple") {
      tiles = 12;
      lo = 3.2;
      hi = 5.5;
    }
    const z = el("view").width / (tiles * TILE);
    return Math.max(lo, Math.min(hi, Math.round(z * 100) / 100));
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
    setSpectate(null);
    clearChatBubbles();
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
    state.engine.collected = new Set();
    state.engine.pendingCoinGrant = 0;
    if (state.engine.clearCheckpoint) state.engine.clearCheckpoint();
    state.engine.reset();
    if (DP.Music) DP.Music.play(state.engine.level.song);
    el("winCard").classList.remove("visible");
    el("pauseCard").classList.remove("visible");
    state.paused = false;
    if (!ghostMode) resetGhostTrail();
  }

  function respawn() {
    if (!state.engine) return;
    state.engine.reset(); // checkpoint spawn keeps the run time
    if (DP.Music) DP.Music.play(state.engine.level.song);
    el("winCard").classList.remove("visible");
    state.paused = false;
   }

  function pauseGame() {
    if (!state.engine || state.screen !== "game" || !state.playing) return;
    if (el("winCard").classList.contains("visible")) return;
    flushPlaytime();
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
    flushPlaytime();
    setSpectate(null);
    closeQuickChatFor();
    try { el("widgetLayer").innerHTML = ""; } catch (e) {}
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
    flushPlaytime();
    const t = state.engine.time;
    const firstClear = save_.data.beaten[entry.file] === undefined;
    save_.data.beaten[entry.file] = true;
    if (save_.data.best[entry.file] === undefined || t < save_.data.best[entry.file]) {
      save_.data.best[entry.file] = t;
    }
    let gained = 0;
    if (firstClear) gained = grantCoins(coinsForFile(entry.file, entry.meta), "level:" + entry.file);
    save();
    el("winText").textContent = "Time " + fmtTime(t) + " · deaths " + state.deaths + (firstClear ? " · FIRST CLEAR!" : "") + (gained ? " · +" + fmtCoins(gained) + " coins" : "");
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

  function spectateTarget() {
    if (!state.spectateUid || !state.engine) return null;
    for (const p of MP.peers()) {
      if (p.uid === state.spectateUid && p.online && p.cube && p.level === state.currentFile) {
        return { x: p.cube.x, y: p.cube.y, w: state.engine.player.w, h: state.engine.player.h };
      }
    }
    return null;
  }
  function followPlayer() {
    const tgt = spectateTarget();
    const p = tgt || state.engine.player;
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

  // ---- Playtime tracking ----
  let playAccum = 0;
  function trackPlaytime(dt) {
    playAccum += dt;
    if (playAccum >= 10) {
      save_.data.playtime = (Number(save_.data.playtime) || 0) + playAccum;
      playAccum = 0;
      save();
    }
  }
  function flushPlaytime() {
    if (playAccum > 0) {
      save_.data.playtime = (Number(save_.data.playtime) || 0) + playAccum;
      playAccum = 0;
      save();
    }
  }
  function fmtPlaytime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const mm = (h > 0 && m < 10 ? "0" : "") + m, ss = (s < 10 ? "0" : "") + s;
    return h > 0 ? h + ":" + mm + ":" + ss : m + ":" + ss;
  }

  // ---- Stats screen ----
  function levelDisplayName(file) {
    if (!file) return "—";
    if (String(file).indexOf("net:") === 0) return "NET " + String(file).slice(4, 10);
    for (const e of state.levels) {
      if (e.file === file && e.level) return e.level.name || file;
    }
    return String(file).replace(".dashpoint.json", "").replace(/_/g, " ");
  }
  function renderStats() {
    const d = save_.data;
    const elT = (id, v) => { const n = el(id); if (n) n.textContent = v; };
    elT("statDeaths", d.deaths | 0);
    elT("statJumps", d.jumps | 0);
    elT("statClears", Object.keys(d.beaten || {}).length);
    elT("statAttempts", Object.keys(d.attempts || {}).length);
    elT("statPlaytime", fmtPlaytime(d.playtime));
    elT("statSkins", SKINS.filter((s) => isUnlocked(s.id)).length + "/" + SKINS.length);
    const box = el("statBest");
    if (box) {
      box.innerHTML = "";
      const keys = Object.keys(d.best || {});
      if (!keys.length) box.innerHTML = '<p class="loading-note">No clears yet.</p>';
      keys.sort((a, b) => (d.best[a] || 0) - (d.best[b] || 0)).slice(0, 20).forEach((k) => {
        const row = document.createElement("div");
        row.className = "stat-row";
        const nm = document.createElement("span"); nm.textContent = levelDisplayName(k);
        const tm = document.createElement("b"); tm.textContent = fmtTime(d.best[k]);
        row.appendChild(nm); row.appendChild(tm);
        box.appendChild(row);
      });
    }
  }

  // ---- Spectate / follow cam ----
  function spectateCandidates() {
    if (!MP.isActive()) return [];
    return MP.peers().filter((p) => p.online && p.cube && p.level === state.currentFile && p.uid);
  }
  function spectateName() {
    if (!state.spectateUid) return "";
    for (const p of MP.peers()) if (p.uid === state.spectateUid) return p.name;
    return "";
  }
  function setSpectate(uid) {
    state.spectateUid = uid || null;
    try {
      if (uid) {
        let nm = "";
        for (const p of MP.peers()) if (p.uid === uid) nm = p.name;
        MP.setWatching(uid, nm);
      } else MP.setWatching(null);
    } catch (e) {}
    const hud = el("hudSpectate");
    if (hud) {
      if (uid) { hud.textContent = "WATCHING " + (spectateName() || "player").toUpperCase(); hud.classList.remove("hidden"); }
      else { hud.classList.add("hidden"); }
    }
  }
  function cycleSpectate(dir) {
    if (state.screen !== "game" || !state.playing || !state.engine) return;
    if (!MP.isActive()) { showNotice("Join a room to spectate", true); return; }
    const cands = spectateCandidates();
    const order = [null].concat(cands.map((p) => p.uid));
    let idx = order.indexOf(state.spectateUid || null);
    if (idx < 0) idx = 0;
    idx = (idx + dir + order.length) % order.length;
    const next = order[idx];
    setSpectate(next);
    if (next) showNotice("Spectating " + (spectateName() || "player"), false);
  }
  let lastSpectateWatchers = [];
  function checkSpectateNotices() {
    if (!MP.isActive()) { lastSpectateWatchers = []; return; }
    let cur = [];
    try { cur = MP.watchersOfMe() || []; } catch (e) {}
    for (const n of cur) {
      if (lastSpectateWatchers.indexOf(n) === -1) showNotice(n + " is spectating you", false);
    }
    lastSpectateWatchers = cur.slice();
  }

  // ---- Quick chat ----
  function qcMessages() {
    const skin = SKINS.find((s) => s.id === save_.data.skin) || SKINS[0];
    const skinTxt = skin && skin.name ? skin.name : "Cube";
    return QC_FIXED.concat(["Using " + skinTxt]);
  }
  function openQuickChat() {
    if (!MP.isActive()) { showNotice("Join a room to chat", true); return; }
    if (state.qcOpen) return;
    state.qcOpen = true;
    renderQuickChat();
    el("qcPopup").classList.add("open");
  }
  function closeQuickChat() {
    state.qcOpen = false;
    el("qcPopup").classList.remove("open");
  }
  function toggleQuickChat() {
    if (state.qcOpen) closeQuickChat();
    else openQuickChat();
  }
  function renderQuickChat() {
    const grid = el("qcGrid");
    if (!grid) return;
    const msgs = qcMessages();
    if (state.qcSel >= msgs.length) state.qcSel = msgs.length - 1;
    if (state.qcSel < 0) state.qcSel = 0;
    grid.innerHTML = "";
    msgs.forEach((m, i) => {
      const d = document.createElement("div");
      d.className = "qc-msg" + (i === state.qcSel ? " sel" : "");
      d.textContent = m;
      d.addEventListener("click", () => { state.qcSel = i; sendQuickChat(); });
      d.addEventListener("mouseenter", () => { if (state.qcSel !== i) { state.qcSel = i; renderQuickChat(); } });
      grid.appendChild(d);
    });
  }
  function moveQcSel(delta) {
    if (!MP.isActive()) { showNotice("Join a room to chat", true); return; }
    const msgs = qcMessages();
    state.qcSel = (state.qcSel + delta + msgs.length) % msgs.length;
    if (!state.qcOpen) { state.qcOpen = true; renderQuickChat(); el("qcPopup").classList.add("open"); }
    else renderQuickChat();
  }
  function sendQuickChat() {
    if (!MP.isActive()) { showNotice("Join a room to chat", true); return; }
    const msgs = qcMessages();
    if (state.qcSel >= msgs.length) state.qcSel = msgs.length - 1;
    const text = msgs[state.qcSel];
    closeQuickChat();
    sendChatText(text);
  }
  function sendChatText(text) {
    const ok = MP.sendChat(text);
    if (!ok) { showNotice("Not in a room", true); return; }
    const u = MP.getUser();
    if (state.screen === "game" && state.playing && state.engine && !state.engine.dead) {
      spawnBubble(text, state.engine.player.x, state.engine.player.y, state.currentFile);
    } else {
      addFeedMsg(text, u && u.name ? u.name : "You", true);
    }
  }
  function spawnBubble(text, worldX, worldY, level) {
    qbubbles.push({
      el: null,
      uid: "",
      name: "",
      text: text,
      worldX: worldX,
      worldY: worldY,
      level: level,
      born: Date.now(),
      dur: 3400,
    });
    const host = el("chatBubbles");
    if (host) {
      const b = document.createElement("div");
      b.className = "chat-bubble";
      b.textContent = text;
      host.appendChild(b);
      qbubbles[qbubbles.length - 1].el = b;
    }
  }
  function addFeedMsg(text, name, self) {
    const feed = el("chatFeed");
    if (!feed) return;
    const d = document.createElement("div");
    d.className = "feed-item" + (self ? " feed-self" : "");
    const b = document.createElement("b");
    b.textContent = self ? "You" : (name || "player");
    const s = document.createElement("span");
    s.textContent = text;
    d.appendChild(b); d.appendChild(s);
    feed.appendChild(d);
    while (feed.children.length > 4) feed.removeChild(feed.firstChild);
    setTimeout(() => { try { d.classList.add("fade"); } catch (e) {} }, 3200);
    setTimeout(() => { try { feed.removeChild(d); } catch (e) {} }, 3800);
  }
  function pickChatDisplay(peer) {
    const sameLevel = state.screen === "game" && state.playing && state.engine && peer.level === state.currentFile;
    const onScreen = sameLevel && peer.cube && peer.cube.x != null;
    if (onScreen) {
      const sc = shakeCam();
      const w = el("view").width, h = el("view").height;
      const sx = (peer.cube.x - sc.x) * sc.zoom;
      const sy = (peer.cube.y - sc.y) * sc.zoom;
      if (sx > -80 && sx < w + 80 && sy > -80 && sy < h + 80) return true;
    }
    return false;
  }
  function spawnChat(peer) {
    const c = peer.chat;
    if (!c || !c.ts) return;
    const prev = lastChatSeen[peer.uid] || 0;
    if (c.ts <= prev) return;
    lastChatSeen[peer.uid] = c.ts;
    const age = Date.now() - c.ts;
    if (age > 8000) return;
    const near = pickChatDisplay(peer);
    if (near && peer.cube) {
      spawnBubble(c.text, peer.cube.x, peer.cube.y, peer.level);
    } else {
      addFeedMsg(c.text, peer.name, false);
    }
  }
  function pollChat() {
    if (!MP.isActive()) { lastChatSeen = {}; return; }
    for (const p of MP.peers()) {
      try { spawnChat(p); } catch (e) {}
    }
  }
  function tickChatBubbles() {
    const host = el("chatBubbles");
    const sc = shakeCam();
    const now = Date.now();
    for (let i = qbubbles.length - 1; i >= 0; i--) {
      const b = qbubbles[i];
      const alive = now - b.born < b.dur;
      if (!alive || !b.el || (host && b.el.parentNode !== host)) {
        try { if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el); } catch (e) {}
        qbubbles.splice(i, 1);
        continue;
      }
      const sameLevel = state.screen === "game" && b.level === state.currentFile;
      if (sameLevel) {
        b.el.style.display = "";
        b.el.style.left = ((b.worldX - sc.x) * sc.zoom) + "px";
        b.el.style.top = ((b.worldY - 18 - sc.y) * sc.zoom) + "px";
        const remain = b.dur - (now - b.born);
        b.el.style.opacity = remain < 450 ? String(Math.max(0, remain / 450)) : "1";
      } else {
        b.el.style.display = "none";
      }
    }
  }
  function clearChatBubbles() {
    const host = el("chatBubbles");
    if (host) host.innerHTML = "";
    qbubbles = [];
  }
  function closeQuickChatFor() {
    if (state.qcOpen) closeQuickChat();
    clearChatBubbles();
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
    if (state.engine.pendingCoinGrant) {
      const n = state.engine.pendingCoinGrant | 0;
      state.engine.pendingCoinGrant = 0;
      if (n > 0) {
        const got = grantCoins(n);
        if (got) {
          save();
          syncCoinUI();
          showNotice("+" + got + " coins", false);
        }
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
    trackPlaytime(dt);
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
          const pTag = findShopTag(p.tag);
          remoteCubes.push(Object.assign({
            name: p.name,
            tagLabel: pTag ? pTag.label : "",
            tagColor: pTag ? pTag.color : "",
          }, p.cube));
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
      graphics: gfxMode(),
    });
    try {
      if (gfxMode() === "simple") DP.syncWidgetDom(el("widgetLayer"), [], null);
      else DP.syncWidgetDom(el("widgetLayer"), state.engine.level.widgets, shakeCam());
    } catch (e) {}
    pollChat();
    tickChatBubbles();
  }

  function isTyping(ev) {
    const t = ev.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  const MP = window.DashPointMP;

  function friendlyAuthError(err, kind) {
    const code = String((err && err.code) || "");
    if (code === "auth/operation-not-allowed") {
      return kind === "guest"
        ? "Guest play is not turned on yet — use email, or ask the owner to enable Anonymous sign-in."
        : "Enable Email/Password sign-in in your Firebase console first.";
    }
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
    const guest = !!(u && u.guest);
    // profile modal (account moved here)
    const plo = el("profLoggedOut"); if (plo) plo.style.display = u ? "none" : "";
    const pli = el("profLoggedIn"); if (pli) pli.style.display = u ? "" : "none";
    const pn = el("profName"); if (pn) pn.textContent = name;
    const tagEl = el("profGuestTag"); if (tagEl) tagEl.style.display = guest ? "" : "none";
    const pass = el("profPassSection"); if (pass) pass.style.display = u && !guest ? "" : "none";
    syncAccountTagUI();
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
    const plist = el("profPlayerList");
    if (plist) {
      plist.innerHTML = "";
      if (!active) plist.innerHTML = '<p class="loading-note" style="padding:8px">Not in a room.</p>';
      else {
        let players = [];
        try { players = MP.roomPlayers() || []; } catch (e) {}
        if (!players.length) plist.innerHTML = '<p class="loading-note" style="padding:8px">Waiting…</p>';
        for (const q of players) {
          const row = document.createElement("div");
          row.className = "stat-row";
          const dot = document.createElement("span");
          dot.textContent = q.online ? "● " : "○ ";
          dot.style.color = q.online ? "var(--good)" : "#9db4d8";
          const nm = document.createElement("span");
          const tagId = q.tag || (q.me ? equippedTagId() : tagIdForUid(q.uid));
          nm.innerHTML = taggedNameHtml(q.name + (q.me ? " (you)" : "") + (q.slot === "host" ? " [host]" : ""), tagId);
          nm.style.flex = "1";
          row.appendChild(dot); row.appendChild(nm);
          if (!q.me && q.online) {
            const wb = document.createElement("button");
            wb.className = "px-btn tiny";
            wb.textContent = (state.spectateUid === q.uid) ? "WATCHING" : "WATCH";
            wb.addEventListener("click", function () {
              if (state.screen !== "game" || !state.playing) { showNotice("Start a level to spectate", true); return; }
              if (state.spectateUid === q.uid) setSpectate(null);
              else { setSpectate(q.uid); showNotice("Spectating " + q.name, false); }
              renderPlayerListOnly();
            });
            row.appendChild(wb);
          }
          plist.appendChild(row);
        }
      }
    }
  }
  function renderPlayerListOnly() { try { syncMpUI(); } catch (e) {} }

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

  function closeAllOpts(except) {
    document.querySelectorAll(".n-opts.open").forEach(function (el) {
      if (el !== except) el.classList.remove("open");
    });
  }

  function makeOptsMenu(items) {
    const wrap = document.createElement("div");
    wrap.className = "n-opts";
    const btn = document.createElement("button");
    btn.className = "n-play n-opts-btn";
    btn.textContent = "OPTIONS";
    btn.title = "Options";
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      const wasOpen = wrap.classList.contains("open");
      closeAllOpts();
      if (!wasOpen) {
        wrap.classList.add("open");
        const menu = wrap.querySelector(".n-opts-menu");
        const r = btn.getBoundingClientRect();
        menu.style.top = Math.min(r.bottom + 4, window.innerHeight - 8) + "px";
        menu.style.right = Math.max(8, window.innerWidth - r.right) + "px";
      }
    });
    const menu = document.createElement("div");
    menu.className = "n-opts-menu";
    items.forEach(function (it) {
      const b = document.createElement("button");
      b.textContent = it.label;
      if (it.danger) b.classList.add("danger");
      if (it.gold) b.classList.add("gold");
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        wrap.classList.remove("open");
        it.onClick();
      });
      menu.appendChild(b);
    });
    wrap.appendChild(btn);
    wrap.appendChild(menu);
    wrap.addEventListener("click", function (ev) { ev.stopPropagation(); });
    return wrap;
  }

  function downloadBlob(name, json) {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const safe = String(name || "level").replace(/[^\w\-]+/g, "_").slice(0, 40);
    a.href = URL.createObjectURL(blob);
    a.download = safe + ".dashpoint.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  function openEditorWithJson(json, name) {
    if (isTouch) {
      showNotice("Downloaded. Open the editor on PC to edit it.", false);
      return;
    }
    try {
      localStorage.setItem("dashpoint.editor.openCopy", JSON.stringify({
        json: json,
        name: name || (json && json.name) || "Untitled",
      }));
    } catch (e) {}
    window.open("editor/index.html", "_blank");
  }

  async function downloadNetworkLevel(meta) {
    if (!meta) return;
    try {
      showNotice("Downloading…", false);
      let json = null;
      try {
        json = await NET.fetchLevel(meta.id);
      } catch (e) {
        const sv = NET.getSave && NET.getSave(meta.id);
        if (sv) json = sv.json;
        else throw e;
      }
      if (!json) throw new Error("Level not found.");
      try { NET.saveLocal(meta.id, meta, json); } catch (e) {}
      try { if (NET.bumpDownloads) NET.bumpDownloads(meta.id); } catch (e) {}
      downloadBlob(meta.title || json.name, json);
      openEditorWithJson(json, meta.title || json.name);
    } catch (err) {
      showNotice(NET.friendly ? NET.friendly(err) : String(err && err.message || err), true);
    }
  }

  function makeDownloadBtn(onClick) {
    const dl = document.createElement("button");
    dl.className = "n-play n-dl";
    dl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/></svg>';
    dl.title = "Download and edit in the editor";
    dl.setAttribute("aria-label", "Download and edit in the editor");
    dl.addEventListener("click", function (ev) {
      ev.stopPropagation();
      onClick();
    });
    return dl;
  }

  function levelRow(meta) {
    const row = document.createElement("div");
    row.className = "net-row";
    const info = document.createElement("div");
    info.className = "n-main";
    info.innerHTML =
      '<div class="n-title">' + escapeHtml(meta.title || "Untitled") + "</div>" +
      '<div class="n-sub">by <b class="n-author" style="cursor:pointer">' + taggedNameHtml(meta.authorName || "?", tagIdForUid(meta.authorUid)) + "</b></div>" +
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
    row.appendChild(makeDownloadBtn(function () { downloadNetworkLevel(meta); }));
    const optItems = [];
    try {
      if (isMyLevel(meta)) {
        optItems.push({
          label: "EDIT",
          gold: true,
          onClick: function () { startEditLevel(meta); },
        });
      }
    } catch (e) {}
    try {
      if (NET.canDeleteLevel && NET.canDeleteLevel(meta)) {
        optItems.push({
          label: "DELETE",
          danger: true,
          onClick: function () { startDeleteLevel(meta); },
        });
      }
    } catch (e) {}
    if (optItems.length) row.appendChild(makeOptsMenu(optItems));
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
            if (!real) return;
            for (var k in real) u[k] = real[k];
            delete u._fromLevel;
            if (usersIndexCache && !usersIndexCache.find(function(x){ return x.uid===u.uid; })) usersIndexCache.push(u);
            var nodes = box.querySelectorAll(".net-row.user");
            for (var ri = 0; ri < nodes.length; ri++) {
              if (nodes[ri].getAttribute("data-uid") === u.uid) {
                var title = nodes[ri].querySelector(".n-title");
                if (title) title.innerHTML = taggedNameHtml(u.name, u.tag);
                break;
              }
            }
          }).catch(function(){});
        }
      });
      hits.sort(function(a,b){ return String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase()); });
      for (var i=0;i<hits.length;i++) {
        var u = hits[i];
        var made = levelIndexCache.filter(function(l){ return l.authorUid === u.uid; }).length;
        var row = document.createElement("button");
        row.className = "net-row user";
        row.setAttribute("data-uid", u.uid);
        row.innerHTML =
          '<img class="n-avatar" src="assets/skins/skin-1.png" alt="" />' +
          '<span class="n-main"><span class="n-title">' + taggedNameHtml(u.name, u.tag || tagIdForUid(u.uid)) + "</span>" +
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
    el("acctTitle").innerHTML = taggedNameHtml(String(u.name || "player").toUpperCase(), u.tag || tagIdForUid(u.uid));
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
        '<div class="n-sub">by ' + taggedNameHtml(sv.meta.authorName || "?", tagIdForUid(sv.meta.authorUid)) + " · offline ready</div></span>";
      row.addEventListener("click", () => openLevelInfo(sv));
      const play = document.createElement("button");
      play.className = "n-play";
      play.textContent = "▶";
      play.title = "View level";
      play.addEventListener("click", (ev) => { ev.stopPropagation(); openLevelInfo(sv); });
      row.appendChild(play);
      row.appendChild(makeDownloadBtn(function () {
        downloadBlob(sv.meta.title || (sv.json && sv.json.name) || "level", sv.json);
        openEditorWithJson(sv.json, sv.meta.title);
      }));
      row.appendChild(makeOptsMenu([{
        label: "DELETE",
        danger: true,
        onClick: function () {
          NET.deleteSave(sv.id);
          renderSavedList();
          renderNetworkHome();
        },
      }]));
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
    el("liAuthor").innerHTML = taggedNameHtml(meta.authorName || "—", tagIdForUid(meta.authorUid));
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
      chip.innerHTML = "by " + taggedNameHtml(m.authorName, tagIdForUid(m.authorUid));
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
    if (!isTyping(ev) && ev.shiftKey && !ev.repeat && (ev.code === "ArrowLeft" || ev.code === "ArrowRight" || ev.code === "ArrowUp" || ev.code === "ArrowDown")) {
      ev.preventDefault();
      if (ev.code === "ArrowDown") { setSpectate(null); }
      else cycleSpectate(ev.code === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (!isTyping(ev)) {
      const kq = ev.code;
      if (MP.isActive()) {
        if (kq === "AltLeft" || kq === "AltRight") {
          ev.preventDefault();
          if (!ev.repeat) toggleQuickChat();
          return;
        }
        if (ev.altKey && !ev.repeat && (kq === "ArrowDown" || kq === "ArrowRight")) { ev.preventDefault(); moveQcSel(1); return; }
        if (ev.altKey && !ev.repeat && (kq === "ArrowUp" || kq === "ArrowLeft")) { ev.preventDefault(); moveQcSel(-1); return; }
        if (ev.altKey && !ev.repeat && (kq === "Enter" || kq === "Space")) { ev.preventDefault(); sendQuickChat(); return; }
        if (state.qcOpen && (kq === "ArrowDown" || kq === "ArrowRight")) { ev.preventDefault(); moveQcSel(1); return; }
        if (state.qcOpen && (kq === "ArrowUp" || kq === "ArrowLeft")) { ev.preventDefault(); moveQcSel(-1); return; }
        if (state.qcOpen && kq === "Enter") { ev.preventDefault(); sendQuickChat(); return; }
        if (state.qcOpen && kq === "Escape") { ev.preventDefault(); closeQuickChat(); return; }
      }
      state.keys.add(ev.code);
    }
    if (ev.code === "KeyA" && ev.altKey && el("modalSkins").classList.contains("visible")) {
      ev.preventDefault();
      unlockSecretA();
      return;
    }
    if (ev.code === "Escape") {
      if (document.querySelector(".n-opts.open")) {
        ev.preventDefault();
        closeAllOpts();
        return;
      }
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
    document.addEventListener("click", function () { closeAllOpts(); });
    bindNetworkUI();
    el("btnPlay").addEventListener("click", () => show("levels"));
    el("btnSkinsHome").addEventListener("click", () => openModal("modalSkins"));
    el("btnOpenShop").addEventListener("click", () => openModal("modalShop"));
    el("btnOpenChest").addEventListener("click", () => openModal("modalChest"));
    el("btnOpenWheel").addEventListener("click", () => openModal("modalWheel"));
    el("btnWheelSpin").addEventListener("click", spinWheel);
    el("wheelWager").addEventListener("keydown", function (ev) {
      if (ev.code === "Enter" || ev.key === "Enter") {
        ev.preventDefault();
        spinWheel();
      }
    });
    document.querySelectorAll("[data-wheel-wager]").forEach(function (b) {
      b.addEventListener("click", function () {
        const v = b.getAttribute("data-wheel-wager");
        if (v === "max") setWheelWager(save_.data.coins);
        else setWheelWager(v);
      });
    });
    el("btnUnlockChest").addEventListener("click", function () { unlockChest("basic"); });
    el("btnUnlockGoldChest").addEventListener("click", function () { unlockChest("gold"); });
    el("btnUnlockDiamondChest").addEventListener("click", function () { unlockChest("diamond"); });
    el("btnUnlockKingChest").addEventListener("click", function () { unlockChest("king"); });
    el("btnUnlockChampionChest").addEventListener("click", function () { unlockChest("champion"); });
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
    el("btnLiDownload").addEventListener("click", function () {
      const m = levelInfoMeta;
      if (!m) return;
      el("modalLevelInfo").classList.remove("visible");
      if (m.json) {
        downloadBlob(m.meta.title || m.json.name || "level", m.json);
        openEditorWithJson(m.json, m.meta.title);
      } else {
        downloadNetworkLevel(m.meta);
      }
    });
    el("btnLiEdit").addEventListener("click", function(){ const m = levelInfoMeta; if (m) { el("modalLevelInfo").classList.remove("visible"); startEditLevel(m.meta); } });
    el("btnLiDelete").addEventListener("click", function(){ const m = levelInfoMeta; if (m) { el("modalLevelInfo").classList.remove("visible"); startDeleteLevel(m.meta); } });
    el("btnAdCancel").addEventListener("click", function(){ el("modalAdminDelete").classList.remove("visible"); pendingDeleteMeta = null; });
    el("btnAdConfirm").addEventListener("click", adminDeleteLevel);
    el("btnWinRestart").addEventListener("click", restartLevel);
    el("btnWinMenu").addEventListener("click", quitToLevels);
    el("btnMainLbPlay").addEventListener("click", function () {
      closeModal("modalMainLb");
      if (mainLbPlayIndex >= 0) startLevel(mainLbPlayIndex);
    });
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
    document.querySelectorAll(".gfx-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        const next = b.getAttribute("data-gfx");
        save_.data.graphics = next === "good" || next === "simple" ? next : "normal";
        save();
        applyGraphics();
        syncGfxUI();
      });
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
      lastPublishedTag = undefined;
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
        checkSpectateNotices();
        pollChat();
      },
      onKicked: (msg) => {
        MP.clearCube();
        closeQuickChatFor();
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
    const guestBtn = el("btnProfGuest");
    if (guestBtn) {
      guestBtn.addEventListener("click", () => {
        profileMsg("");
        MP.loginGuest()
          .then(() => {
            profileMsg("");
            showNotice("Playing as guest", false);
            syncAccountUI();
            syncMpUI();
          })
          .catch((e) => profileMsg(friendlyAuthError(e, "guest")));
      });
    }
    el("btnProfLogout").addEventListener("click", async () => {
      if (MP.isActive()) await MP.leave(false);
      MP.logout().then(() => { syncAccountUI(); syncMpUI(); }).catch((e) => profileMsg(friendlyAuthError(e)));
    });

    el("btnProfUser").addEventListener("click", async () => {
      try {
        const nm = await NET.updateUsername(el("profUser").value.trim());
        el("profUser").value = "";
        if (MP.setDisplayName) MP.setDisplayName(nm);
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
      closeQuickChatFor();
      try { MP.setWatching(null); } catch (e) {}
      state.spectateUid = null;
      const hud = el("hudSpectate"); if (hud) hud.classList.add("hidden");
      const wasHost = MP.getSlot() === "host";
      await MP.leave(true);
      showNotice(wasHost ? "Room closed" : "Left the room", false);
      syncMpUI();
    });
    el("btnProfStats").addEventListener("click", () => openModal("modalStats"));

    el("btnProfSync").addEventListener("click", async () => {
      const cu = (typeof firebase !== 'undefined' && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
      const u = (NET.getUser && NET.getUser()) || (MP.getUser && MP.getUser()) || (cu ? {uid: cu.uid} : null);
      if (!u) { profileMsg("Not logged in"); return; }
      const st = el("profCloudStatus"); if (st) st.textContent = "Uploading…";
      try {
        const saved = await NET.syncCloud({ deaths: save_.data.deaths, jumps: save_.data.jumps, playtime: Number(save_.data.playtime) || 0, coins: save_.data.coins, coinPaid: save_.data.coinPaid, coinMigrated: !!save_.data.coinMigrated, codes: save_.data.codes, skin: save_.data.skin, unlocked: save_.data.unlocked, beaten: save_.data.beaten, best: save_.data.best, secretA: !!save_.data.secretA, spaceMenu: !!save_.data.spaceMenu, tags: save_.data.tags, tag: save_.data.tag, chestFree: save_.data.chestFree, championKeys: save_.data.championKeys });
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
        save_.data.playtime = Math.max(Number(save_.data.playtime) || 0, Number(cloud.playtime) || 0);
        save_.data.coins = coinsMax(save_.data.coins, cloud.coins);
        save_.data.championKeys = Math.max(keyAmount(save_.data.championKeys), keyAmount(cloud.championKeys));
        if (cloud.coinMigrated) save_.data.coinMigrated = true;
        if (cloud.coinPaid) { save_.data.coinPaid = save_.data.coinPaid || {}; for (var ck in cloud.coinPaid) save_.data.coinPaid[ck] = true; }
        if (cloud.codes) { save_.data.codes = save_.data.codes || {}; for (var cd in cloud.codes) save_.data.codes[cd] = true; }
        if (Array.isArray(cloud.unlocked)) { const s2 = {}; save_.data.unlocked.forEach(function(id){s2[id]=true;}); cloud.unlocked.forEach(function(id){s2[id]=true;}); save_.data.unlocked = Object.keys(s2).map(function(k){return parseInt(k,10);}).sort(function(a,b){return a-b;}); }
        if (Array.isArray(cloud.tags)) {
          const ts = {};
          (save_.data.tags || []).forEach(function (id) { ts[id] = true; });
          cloud.tags.forEach(function (id) { if (findShopTag(id)) ts[id] = true; });
          save_.data.tags = Object.keys(ts);
        }
        if (cloud.tag && !save_.data.tag && findShopTag(cloud.tag) && ownsTag(cloud.tag)) save_.data.tag = cloud.tag;
        lastPublishedTag = undefined;
        if (cloud.chestFree && typeof cloud.chestFree === "object") {
          save_.data.chestFree = save_.data.chestFree || {};
          ["basic", "gold", "diamond", "king"].forEach(function (ck) {
            save_.data.chestFree[ck] = Math.max(Number(save_.data.chestFree[ck]) || 0, Number(cloud.chestFree[ck]) || 0);
          });
        }
        if (cloud.beaten) { for (var k in cloud.beaten) save_.data.beaten[k]=true; }
        if (cloud.best) { for (var k2 in cloud.best) { if (save_.data.best[k2]==null || cloud.best[k2] < save_.data.best[k2]) save_.data.best[k2]=cloud.best[k2]; } }
        if (cloud.skin) save_.data.skin = cloud.skin;
        if (cloud.secretA) save_.data.secretA = true;
        if (cloud.spaceMenu) save_.data.spaceMenu = true;
        save(); syncHomeStats(); renderLevels();
        profileMsg("Downloaded from cloud");
        checkUnlocks();
        syncAccountTagUI();
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
        if (gfxMode() === "good") {
          const step = ev.deltaY > 0 ? -1 : 1;
          cam.zoom = Math.max(2, Math.min(4, Math.round(cam.zoom + step)));
        } else {
          const step = ev.deltaY > 0 ? -0.25 : 0.25;
          cam.zoom = Math.max(1.5, Math.min(9, Math.round((cam.zoom + step) * 100) / 100));
        }
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
    applyGraphics();
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
