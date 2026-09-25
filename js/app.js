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
    "Cool_Run.dashpoint.json": 3,
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

  // Release log. I decide what ships as what:
  //   MAJOR (x.0.0) — game-changing milestones (new platform, multiplayer overhauls)
  //   MINOR (x.y.0) — new features and modes
  //   PATCH (x.y.z) — fixes, tweaks, balance, shop content drops
  // Newest entry first; APP_VER is always RELEASES[0].v.
  const RELEASES = [
    { v: "1.5.0", title: "Intros, bell, what's new", items: [
      "Level intro cards show title, author and difficulty on every start",
      "Activity bell: new comments on your levels, lost leaderboard crowns",
      "Settings has a WHAT'S NEW log with a dot while unread",
      "Network rows open the level popup, so comments are one tap away",
    ] },
    { v: "1.4.0", title: "Practice, discovery, heatmaps", items: [
      "Practice mode: pause to enable, X drops checkpoints anywhere, no records",
      "Trending network tab ranked by plays and downloads",
      "Level of the day spotlight on home",
      "Death heatmaps with an ESC-menu toggle for any level",
    ] },
    { v: "1.3.0", title: "Social update", items: [
      "Spectate room members with Shift+arrows",
      "Quick chat with head bubbles (Alt menu)",
      "Level comments with reports, account ranks",
      "Room player list, name colors, profile frames",
    ] },
    { v: "1.2.0", title: "Graphics and feel", items: [
      "DLLS 5 realistic tile mode",
      "Advanced graphics menu (shadows, flashes, particles)",
      "Haptics on death, wins, orbs, pads and jumps",
    ] },
    { v: "1.1.0", title: "Mobile controls", items: [
      "Touch buttons with size and position customization",
      "Joystick mode: left-half stick, right-half tap jump",
      "Pinch zoom, deeper zoom-out on touch screens",
    ] },
    { v: "1.0.0", title: "Launch", items: [
      "Campaign and network levels, editor, rooms, shop, chests, skins, tags, trails, cloud saves",
    ] },
  ];
  const APP_VER = RELEASES[0].v;

  const REDEEM_CODES = {    rich: { coins: 5000 },
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
    "999keys": { keys: 999 },
    thebestskinever: { skin: 29 },
    discord: { skin: 35 },
    nerd: { skin: 37 },
    bibi: { skin: 39 },
    putin: { skin: 40 },
    trump: { skin: 41 },
    "67": { skin: 42 },
    skibidi: { skin: 43 },
    troll: { skin: 44 },
    sus: { skin: 46 },
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
    "Cool_Run.dashpoint.json",
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
    { id: "nolife", label: "no life", cost: 2000000000000, color: "#ff6bff" },
    { id: "no-grass", label: "This Person does not touch grass", cost: "100000000000000", color: "#6ddf4b" },
  ];

  function findShopTag(id) {
    for (let i = 0; i < SHOP_TAGS.length; i++) if (SHOP_TAGS[i].id === id) return SHOP_TAGS[i];
    return null;
  }

  const SHOP_COLORS = [
    { id: "cyan", label: "Cyan", color: "#2ee6ff", cost: 500 },
    { id: "mint", label: "Mint", color: "#3ee07a", cost: 2000 },
    { id: "tangerine", label: "Tangerine", color: "#ff9d2e", cost: 10000 },
    { id: "bubblegum", label: "Bubblegum", color: "#ff6bff", cost: 50000 },
    { id: "lavender", label: "Lavender", color: "#e8c4ff", cost: 200000 },
    { id: "ruby", label: "Ruby", color: "#ff4d62", cost: 1000000 },
    { id: "gold", label: "Gold", color: "#ffd23c", cost: 10000000 },
    { id: "ghost", label: "Ghost White", color: "#ffffff", cost: 100000000 },
  ];

  function findShopColor(id) {
    for (let i = 0; i < SHOP_COLORS.length; i++) if (SHOP_COLORS[i].id === id) return SHOP_COLORS[i];
    return null;
  }

  function ownsNameColor(id) {
    return (save_.data.nameColors || []).indexOf(id) !== -1;
  }

  function equippedNameColor() {
    return findShopColor(save_.data.nameColor);
  }

  function equippedNameColorId() {
    return findShopColor(save_.data.nameColor) ? save_.data.nameColor : "";
  }

  function nameColorForUid(uid) {
    uid = String(uid || "");
    if (!uid) return "";
    const me = (MP.getUser && MP.getUser()) || (window.DashPointMP && window.DashPointMP.getUser && window.DashPointMP.getUser());
    if (me && me.uid === uid) return equippedNameColorId();
    const u = (usersIndexCache || []).find(function (x) { return x.uid === uid; });
    return u && findShopColor(u.nameColor) ? u.nameColor : "";
  }

  const SHOP_FRAMES = [
    { id: "bronze", label: "Bronze", cls: "frame-bronze", cost: 1000 },
    { id: "silver", label: "Silver", cls: "frame-silver", cost: 10000 },
    { id: "neon", label: "Neon", cls: "frame-neon", cost: 100000 },
    { id: "royal", label: "Royal", cls: "frame-royal", cost: 1000000 },
    { id: "inferno", label: "Inferno", cls: "frame-inferno", cost: 50000000 },
    { id: "prism", label: "Prism", cls: "frame-prism", cost: 500000000 },
  ];

  function findShopFrame(id) {
    for (let i = 0; i < SHOP_FRAMES.length; i++) if (SHOP_FRAMES[i].id === id) return SHOP_FRAMES[i];
    return null;
  }

  function ownsFrame(id) {
    return (save_.data.frames || []).indexOf(id) !== -1;
  }

  function equippedFrame() {
    return findShopFrame(save_.data.frame);
  }

  function equippedFrameId() {
    return findShopFrame(save_.data.frame) ? save_.data.frame : "";
  }

  function frameForUid(uid) {
    uid = String(uid || "");
    if (!uid) return "";
    const me = (MP.getUser && MP.getUser()) || (window.DashPointMP && window.DashPointMP.getUser && window.DashPointMP.getUser());
    if (me && me.uid === uid) return equippedFrameId();
    const u = (usersIndexCache || []).find(function (x) { return x.uid === uid; });
    return u && findShopFrame(u.frame) ? u.frame : "";
  }

  const SHOP_TRAILS = [
    { id: "sparkle", label: "Sparkle", cost: 5000, dots: ["#ffffff", "#ffd23c", "#fff3c2"] },
    { id: "bubbles", label: "Bubbles", cost: 25000, dots: ["#2ee6ff", "#9beaff", "#ffffff"] },
    { id: "fire", label: "Fire", cost: 250000, dots: ["#ff5a1a", "#ff9d2e", "#ffd23c"] },
    { id: "rainbow", label: "Rainbow", cost: 2000000, dots: ["#ff5a5a", "#ffd23c", "#3ee07a", "#2ee6ff", "#b45cff"] },
  ];

  function findShopTrail(id) {
    for (let i = 0; i < SHOP_TRAILS.length; i++) if (SHOP_TRAILS[i].id === id) return SHOP_TRAILS[i];
    return null;
  }

  function ownsTrail(id) {
    return (save_.data.trails || []).indexOf(id) !== -1;
  }

  const SHOP_PACKS = [
    { id: "drawing", label: "Drawing", cost: 100000, blurb: "B&W ink redraw" },
    { id: "neon", label: "Neon", cost: 250000, blurb: "Dark glass + glow" },
  ];

  function findShopPack(id) {
    for (let i = 0; i < SHOP_PACKS.length; i++) if (SHOP_PACKS[i].id === id) return SHOP_PACKS[i];
    return null;
  }

  function ownsPack(id) {
    return (save_.data.packs || []).indexOf(id) !== -1;
  }

  function equippedTrailId() {
    return findShopTrail(save_.data.trail) ? save_.data.trail : "";
  }

  const SHOP_PETS = [
    { id: "ghost", label: "Ghost", cost: 10000, src: "assets/pets/pet-ghost.png" },
    { id: "bat", label: "Bat", cost: 5000000, src: "assets/pets/pet-bat.png" },
  ];

  function findShopPet(id) {
    for (let i = 0; i < SHOP_PETS.length; i++) if (SHOP_PETS[i].id === id) return SHOP_PETS[i];
    return null;
  }

  function ownsPet(id) {
    return (save_.data.pets || []).indexOf(id) !== -1;
  }

  function equippedPetId() {
    return findShopPet(save_.data.pet) ? save_.data.pet : "";
  }

  function loadPetImages() {
    try {
      if (!state.images) return;
      state.images.pets = state.images.pets || {};
      SHOP_PETS.forEach(function (p) {
        if (state.images.pets[p.id]) return;
        var img = new Image();
        img.onload = function () {
          try {
            state.images.pets[p.id] = img;
            if (el("modalShop") && el("modalShop").classList.contains("visible")) renderShop();
          } catch (e) {}
        };
        img.src = p.src;
      });
    } catch (e) {}
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

  const RANKS = [
    { min: 0, label: "Rookie", color: "#9db4d8" },
    { min: 1, label: "Player", color: "#3ee07a" },
    { min: 5, label: "Skilled", color: "#2ee6ff" },
    { min: 15, label: "Veteran", color: "#ff9d2e" },
    { min: 30, label: "Expert", color: "#ffd23c" },
    { min: 60, label: "Master", color: "#e8c4ff" },
    { min: 100, label: "Legend", color: "#ff4d62" },
    { min: 200, label: "Mythic", color: "#ffffff" },
  ];

  function rankForClears(n) {
    n = Math.max(0, n | 0);
    let idx = 0;
    for (let i = 0; i < RANKS.length; i++) {
      if (n >= RANKS[i].min) idx = i;
    }
    return { rank: RANKS[idx], next: idx + 1 < RANKS.length ? RANKS[idx + 1] : null, clears: n };
  }

  function rankChipHtml(rank) {
    if (!rank) return "";
    return '<span class="rank-chip" style="color:' + rank.color + ";border-color:" + rank.color + '">[' + escapeHtml(rank.label) + "]</span>";
  }

  function clearsForUid(uid) {
    uid = String(uid || "");
    if (!uid) return -1;
    const me = (MP.getUser && MP.getUser()) || (window.DashPointMP && window.DashPointMP.getUser && window.DashPointMP.getUser());
    if (me && me.uid === uid) return Object.keys(save_.data.beaten || {}).length;
    const u = (usersIndexCache || []).find(function (x) { return x.uid === uid; });
    if (u && u.beatenCount != null) return u.beatenCount | 0;
    return -1;
  }

  function rankChipForUid(uid, clearsHint) {
    let c = clearsHint != null ? clearsHint | 0 : clearsForUid(uid);
    if (c < 0) return "";
    return rankChipHtml(rankForClears(c).rank);
  }

  function frameAvatarHtml(skinId, frameId, imgCls) {
    const fr = findShopFrame(frameId);
    const n = (skinId | 0) - 1;
    const src = (window.DashPointSkins && window.DashPointSkins[n] ? window.DashPointSkins[n].src : "assets/skins/skin-1.png");
    const img = '<img class="' + (imgCls || "lb-skin") + '" src="' + src + '" alt="" />';
    return fr ? '<span class="avatar-frame ' + fr.cls + '">' + img + "</span>" : img;
  }

  function taggedNameHtml(name, tagId, extra, colorId) {
    const tag = findShopTag(tagId);
    const color = findShopColor(colorId);
    const shown = escapeHtml(name || "player") + (extra || "");
    const colored = color ? '<span style="color:' + color.color + '">' + shown + "</span>" : shown;
    return colored + (tag ? " " + tagChipHtml(tag) : "");
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
      if (mp && mp.setNameColor) mp.setNameColor(equippedNameColorId());
    } catch (e) {}
    const net = window.DPNet;
    const loggedIn = !!(net && net.getUser && net.getUser());
    if (!loggedIn || !net.syncStats) return;
    const payload = { tag: id, nameColor: equippedNameColorId(), frame: equippedFrameId() };
    const key = id + "|" + payload.nameColor + "|" + payload.frame;
    if (lastPublishedTag === key) return;
    net.syncStats(payload).then(function () { lastPublishedTag = key; }).catch(function () {});
  }

  function syncAccountTagUI() {
    const tag = equippedTag();
    const color = equippedNameColor();
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
        home.innerHTML = "<b>" + (color ? '<span style="color:' + color.color + '">' + escapeHtml(u.name || "player") + "</span>" : escapeHtml(u.name || "player")) + "</b>" + (tag ? ' <span class="acct-tag-wrap">Tag: ' + tagChipHtml(tag) + "</span>" : "");
      }
    }
    publishPublicTag();
  }

  function clampGhostOpacity(n) {
    n = Number(n);
    if (!isFinite(n)) return 100;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return Math.round(n);
  }

  function ghostOpacityPct() {
    return clampGhostOpacity(save_.data && save_.data.ghostOpacity);
  }

  function defaultSave() {
    return { deaths: 0, jumps: 0, playtime: 0, coins: "0", coinPaid: {}, coinMigrated: false, codes: {}, skin: 1, unlocked: [1, 2, 3, 4, 5], beaten: {}, best: {}, attempts: {}, hitboxes: false, debugFps: false, autoRespawn: true, spaceMenu: false, graphics: "normal", ghostOpacity: 100, tags: [], tag: "", nameColors: [], nameColor: "", frames: [], frame: "",     trails: [], trail: "", packs: [], touchUI: { size: 72, lx: 14, ly: 14, rx: 14, ry: 14 }, touchMode: "buttons", showHeat: false, seenVer: "", bellSeen: {}, follows: {}, chestFree: { basic: 0, gold: 0, diamond: 0, king: 0 }, championKeys: 0 };
  }

  function touchUIDefaults() {
    return { size: 72, lx: 14, ly: 14, rx: 14, ry: 14 };
  }

  function touchUI() {
    const d = touchUIDefaults();
    const t = (save_ && save_.data && save_.data.touchUI) || {};
    function num(v, lo, hi, fb) {
      v = Number(v);
      if (!isFinite(v)) return fb;
      return Math.max(lo, Math.min(hi, Math.round(v)));
    }
    return {
      size: num(t.size, 56, 112, d.size),
      lx: num(t.lx, 0, 120, d.lx),
      ly: num(t.ly, 0, 200, d.ly),
      rx: num(t.rx, 0, 120, d.rx),
      ry: num(t.ry, 0, 200, d.ry),
    };
  }

  function applyTouchUI() {
    const box = el("touchControls");
    if (!box) return;
    const t = touchUI();
    box.style.setProperty("--tc-size", t.size + "px");
    box.style.setProperty("--tc-lx", t.lx + "px");
    box.style.setProperty("--tc-ly", t.ly + "px");
    box.style.setProperty("--tc-rx", t.rx + "px");
    box.style.setProperty("--tc-ry", t.ry + "px");
  }

  function syncTouchUI() {
    const t = touchUI();
    const pairs = [["tcSize", "size", "tcSizeVal"], ["tcLx", "lx", "tcLxVal"], ["tcLy", "ly", "tcLyVal"], ["tcRx", "rx", "tcRxVal"], ["tcRy", "ry", "tcRyVal"]];
    for (const pair of pairs) {
      const inp = el(pair[0]);
      const val = el(pair[2]);
      if (inp) inp.value = String(t[pair[1]]);
      if (val) val.textContent = String(t[pair[1]]);
    }
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
      s.claimedGifts = s.claimedGifts && typeof s.claimedGifts === "object" && !Array.isArray(s.claimedGifts) ? s.claimedGifts : {};
      s.coinMigrated = !!s.coinMigrated;
      s.codes = s.codes && typeof s.codes === "object" ? s.codes : {};
      s.tags = Array.isArray(s.tags) ? s.tags.filter(function (id) { return !!findShopTag(id); }) : [];
      s.tag = findShopTag(s.tag) ? s.tag : "";
      s.nameColors = Array.isArray(s.nameColors) ? s.nameColors.filter(function (id) { return !!findShopColor(id); }) : [];
      s.nameColor = findShopColor(s.nameColor) ? s.nameColor : "";
      s.frames = Array.isArray(s.frames) ? s.frames.filter(function (id) { return !!findShopFrame(id); }) : [];
      s.frame = findShopFrame(s.frame) ? s.frame : "";
      s.trails = Array.isArray(s.trails) ? s.trails.filter(function (id) { return !!findShopTrail(id); }) : [];
      s.trail = findShopTrail(s.trail) ? s.trail : "";
      // migrate: wisp was renamed to ghost; bot/chick were removed
      if (Array.isArray(s.pets) && s.pets.indexOf("wisp") !== -1 && s.pets.indexOf("ghost") === -1) s.pets.push("ghost");
      if (s.pet === "wisp") s.pet = "ghost";
      s.pets = Array.isArray(s.pets) ? s.pets.filter(function (id) { return !!findShopPet(id); }) : [];
      s.pet = findShopPet(s.pet) ? s.pet : "";
      s.packs = Array.isArray(s.packs) ? s.packs.filter(function (id) { return !!findShopPack(id); }) : [];
      // grandfather: anyone already running a pack keeps it
      if ((s.graphics === "drawing" || s.graphics === "neon") && s.packs.indexOf(s.graphics) === -1) s.packs.push(s.graphics);
      s.touchUI = Object.assign(touchUIDefaults(), (s.touchUI && typeof s.touchUI === "object") ? s.touchUI : {});
      s.touchMode = s.touchMode === "joystick" ? "joystick" : "buttons";
      s.sharePresence = s.sharePresence === false ? false : true;
      s.customBg = typeof s.customBg === "string" ? s.customBg : "";
      s.customBgOn = !!s.customBgOn;
      if (s.customBg && s.customBg.length > 2000000) { s.customBg = ""; s.customBgOn = false; }
      var _blur = Number(s.blur);
      s.blur = isFinite(_blur) ? Math.max(0, Math.min(24, _blur)) : 12;
      s.tag = findShopTag(s.tag) && s.tags.indexOf(s.tag) !== -1 ? s.tag : "";
      const cf = s.chestFree && typeof s.chestFree === "object" ? s.chestFree : {};
      s.chestFree = {
        basic: Number(cf.basic) || 0,
        gold: Number(cf.gold) || 0,
        diamond: Number(cf.diamond) || 0,
        king: Number(cf.king) || 0,
      };
      s.graphics = s.graphics === "good" || s.graphics === "simple" || s.graphics === "dlls5" || s.graphics === "ultra" || s.graphics === "drawing" || s.graphics === "neon" || s.graphics === "revamped" ? (s.graphics === "revamped" ? "neon" : s.graphics) : "normal";
      if ((s.graphics === "drawing" || s.graphics === "neon") && s.packs.indexOf(s.graphics) === -1) s.graphics = "normal";
      s.ghostOpacity = clampGhostOpacity(s.ghostOpacity);
      s.follows = s.follows && typeof s.follows === "object" && !Array.isArray(s.follows) ? s.follows : {};
      s.bellSeen = s.bellSeen && typeof s.bellSeen === "object" ? s.bellSeen : {};
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
    practice: false,
    heatmap: null,
    deaths: 0,
    paused: false,
    shake: 0,
    spectateUid: null,
    qcOpen: false,
    qcSel: 0,
    keys: new Set(),
    touch: { left: false, right: false, jump: false },
    lastFrame: 0,
  };

  // ---- Touch controls (phones/tablets) + pinch zoom ----
  const pinch = { ids: [], dist: 0, joy: false };
  const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  let joyJumpId = null;
  const JOY_DEAD = 22;
  const JOY_RADIUS = 52;
  // Pinch arbitration in joystick mode: a held stick plus a jump tap must not
  // read as a pinch. Pinch engages only once both fingers moved and spread.
  const JOY_PINCH_MOVE = 14;
  const JOY_PINCH_SPREAD = 48;
  const joyPts = {};
  let joyPinch = null;

  function touchMode() {
    return save_.data.touchMode === "joystick" ? "joystick" : "buttons";
  }

  function syncCtlUI() {
    document.querySelectorAll(".ctl-opt").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-ctl") === touchMode());
    });
    document.body.classList.toggle("joystick", touchMode() === "joystick");
  }

  function setTouchBtn(btn, action, on) {
    state.touch[action] = !!on;
    if (btn) btn.classList.toggle("on", !!on);
  }

  function bindTouchBtn(id, action) {
    const btn = el(id);
    if (!btn) return;
    const release = (ev) => {
      if (ev && ev.pointerId !== undefined && btn.hasPointerCapture && ev.pointerId !== null) {
        try { if (btn.hasPointerCapture(ev.pointerId)) btn.releasePointerCapture(ev.pointerId); } catch (e) {}
      }
      setTouchBtn(btn, action, false);
    };
    btn.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      try { btn.setPointerCapture(ev.pointerId); } catch (e) {}
      setTouchBtn(btn, action, true);
      if (action === "jump") haptic("tick");
    });
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", () => setTouchBtn(btn, action, false));
    btn.addEventListener("contextmenu", (ev) => ev.preventDefault());
  }

  function pinchDist() {
    if (pinch.ids.length < 2) return 0;
    const a = pinch.ids[0], b = pinch.ids[1];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pinchTrackMove(ev) {
    let found = false;
    for (const p of pinch.ids) {
      if (p.id === ev.pointerId) { p.x = ev.clientX; p.y = ev.clientY; found = true; break; }
    }
    if (!found) return;
    if (state.screen !== "game") { pinch.dist = pinchDist(); return; }
    const d = pinchDist();
    if (pinch.dist > 0 && d > 0) pinchZoomBy(d / pinch.dist);
    pinch.dist = d;
  }

  function pinchZoomBy(factor) {
    if (!(factor > 0) || !isFinite(factor)) return;
    cam.zoom = clampZoom(cam.zoom * factor);
  }

  function isTouchMode() {
    return !!(document.body && document.body.classList.contains("touch"));
  }

  function clampZoom(z) {
    if (!isFinite(z)) return cam.zoom;
    if (gfxMode() === "good") {
      const lo = isTouchMode() ? 1.5 : 2;
      return Math.max(lo, Math.min(4, Math.round(z * 100) / 100));
    }
    const lo = isTouchMode() ? 1 : 1.5;
    return Math.max(lo, Math.min(9, Math.round(z * 100) / 100));
  }

  function bindPinchZoom() {
    const c = el("view");
    if (!c) return;
    c.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "touch" || touchMode() !== "buttons") return;
      pinch.ids.push({ id: ev.pointerId, x: ev.clientX, y: ev.clientY });
      if (pinch.ids.length > 2) pinch.ids.shift();
      pinch.dist = pinchDist();
    });
    const move = (ev) => {
      if (ev.pointerType !== "touch" || touchMode() !== "buttons") return;
      pinchTrackMove(ev);
    };
    const up = (ev) => {
      pinch.ids = pinch.ids.filter((p) => p.id !== ev.pointerId);
      pinch.dist = pinchDist();
    };
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
  }

  function showJoy(ox, oy, dx, dy) {
    const base = el("joyBase"), knob = el("joyKnob");
    if (!base || !knob) return;
    base.style.display = "block";
    knob.style.display = "block";
    base.style.left = ox + "px";
    base.style.top = oy + "px";
    const m = Math.hypot(dx, dy) || 1;
    const cl = Math.min(m, JOY_RADIUS);
    knob.style.left = ox + (dx / m) * cl + "px";
    knob.style.top = oy + (dy / m) * cl + "px";
  }

  function hideJoy() {
    const base = el("joyBase"), knob = el("joyKnob");
    if (base) base.style.display = "none";
    if (knob) knob.style.display = "none";
  }

  function joyPinchCheck() {
    if (pinch.joy || joyPinch) return;
    const ids = Object.keys(joyPts).map(Number);
    if (ids.length !== 2) return;
    const a = joyPts[ids[0]], b = joyPts[ids[1]];
    if (!a || !b) return;
    joyPinch = { a: ids[0], b: ids[1], d0: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  function joyPinchTrack(ev) {
    if (!joyPinch) return;
    const rec = joyPts[ev.pointerId];
    if (!rec || (ev.pointerId !== joyPinch.a && ev.pointerId !== joyPinch.b)) return;
    rec.moved += Math.hypot(ev.clientX - rec.x, ev.clientY - rec.y);
    rec.x = ev.clientX;
    rec.y = ev.clientY;
    const a = joyPts[joyPinch.a], b = joyPts[joyPinch.b];
    if (!a || !b) { joyPinch = null; return; }
    if (a.moved > JOY_PINCH_MOVE && b.moved > JOY_PINCH_MOVE &&
        Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - joyPinch.d0) > JOY_PINCH_SPREAD) {
      const qa = joyPinch.a, qb = joyPinch.b;
      const pa = joyPts[qa], pb = joyPts[qb];
      joyPinch = null;
      pinch.joy = true;
      // Release gameplay bindings; the gesture is now a zoom.
      joy.id = null;
      joyJumpId = null;
      state.touch.left = state.touch.right = state.touch.jump = false;
      hideJoy();
      pinch.ids = [
        { id: qa, x: pa ? pa.x : 0, y: pa ? pa.y : 0 },
        { id: qb, x: pb ? pb.x : 0, y: pb ? pb.y : 0 },
      ];
      pinch.dist = pinchDist();
    }
  }

  function joyPinchEnd(ev) {
    delete joyPts[ev.pointerId];
    if (joyPinch && (ev.pointerId === joyPinch.a || ev.pointerId === joyPinch.b)) joyPinch = null;
    if (pinch.joy) {
      pinch.ids = pinch.ids.filter((p) => p.id !== ev.pointerId);
      if (pinch.ids.length < 2) {
        pinch.joy = false;
        pinch.ids = [];
        pinch.dist = 0;
      } else {
        pinch.dist = pinchDist();
      }
    }
  }

  function bindJoystick() {
    const c = el("view");
    if (!c) return;
    c.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "touch" || touchMode() !== "joystick") return;
      if (state.screen !== "game" || state.paused) return;
      if (pinch.joy) return;
      joyPts[ev.pointerId] = { x: ev.clientX, y: ev.clientY, moved: 0 };
      if (ev.clientX < window.innerWidth / 2) {
        if (joy.id !== null) { joyPinchCheck(); return; }
        joy.id = ev.pointerId;
        joy.ox = ev.clientX;
        joy.oy = ev.clientY;
        joy.dx = 0;
        joy.dy = 0;
        state.touch.left = state.touch.right = false;
        showJoy(joy.ox, joy.oy, 0, 0);
      } else {
        if (joyJumpId !== null) { joyPinchCheck(); return; }
        joyJumpId = ev.pointerId;
        setTouchBtn(null, "jump", true);
        haptic("tick");
      }
      joyPinchCheck();
    });
    const move = (ev) => {
      if (pinch.joy) { pinchTrackMove(ev); return; }
      joyPinchTrack(ev);
      if (pinch.joy) { pinchTrackMove(ev); return; }
      if (ev.pointerId !== joy.id) return;
      joy.dx = ev.clientX - joy.ox;
      joy.dy = ev.clientY - joy.oy;
      state.touch.left = joy.dx < -JOY_DEAD;
      state.touch.right = joy.dx > JOY_DEAD;
      showJoy(joy.ox, joy.oy, joy.dx, joy.dy);
    };
    const up = (ev) => {
      joyPinchEnd(ev);
      if (pinch.joy) return;
      if (ev.pointerId === joy.id) {
        joy.id = null;
        state.touch.left = state.touch.right = false;
        hideJoy();
      }
      if (ev.pointerId === joyJumpId) {
        joyJumpId = null;
        setTouchBtn(null, "jump", false);
      }
    };
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
  }

  function clearTouch() {
    state.touch.left = state.touch.right = state.touch.jump = false;
    pinch.ids = [];
    pinch.dist = 0;
    pinch.joy = false;
    joyPinch = null;
    for (const k in joyPts) delete joyPts[k];
    joy.id = null;
    joyJumpId = null;
    hideJoy();
    ["touchLeft", "touchRight", "touchJump"].forEach(function (id) {
      const b = el(id);
      if (b) b.classList.remove("on");
    });
  }

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
  // ---- Tuff edits: 20s win-recap video (tracking zooms, shake,
  // grayscale pause gags with skull/trollface, random song slice) ----
  var TUFF_LEN = 20;
  var TUFF_SONGS = [
    "assets/music/song1.m4a",
    "assets/music/song2.m4a",
    "assets/music/song3.m4a",
    "assets/music/song4.m4a"
  ];
  var TUFF_TROLLS = [
    "https://preview.redd.it/hated-designs-these-trollfaces-that-some-people-use-in-v0-xek4eqfgo6md1.png?width=453&format=png&auto=webp&s=d3925260d7279a137ac3aa38d8178feee9526ac7",
    "https://media.tenor.com/gtKQ-V66IhUAAAAe/tuff-troll-face.png",
    "https://media.tenor.com/oGrBWUWwyOkAAAAm/troll-face.webp",
    "https://transfer.inkboym.org/file/vp-AV5xOpzML/raw",
    "https://i.ytimg.com/vi/UjSS3DUyTn8/maxresdefault.jpg",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmrZopUttzsDpEKQtUb54giTn3ENzAEEGqUtjTjH92wQ&s=10"
  ];
  var tuff = { rec: null, chunks: [], first: null, track: [], deaths: [], recording: false, vw: 0, vh: 0, runStart: 0, winStamp: 0, winEng: 0, winDeaths: 0, levelName: "" };
  function tuffMime() {
    var cands = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    try {
      if (!window.MediaRecorder) return "";
      for (var i = 0; i < cands.length; i++) {
        try { if (MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch (e) {}
      }
    } catch (e) {}
    return "";
  }
  function tuffStop() {
    try { if (tuff.rec && tuff.rec.state !== "inactive") tuff.rec.stop(); } catch (e) {}
    tuff.rec = null;
    tuff.recording = false;
  }
  function tuffDiscard() {
    tuffStop();
    tuff.chunks = []; tuff.first = null; tuff.track = []; tuff.deaths = [];
  }
  function tuffStartRun() {
    tuffDiscard();
    try {
      var view = el("view");
      if (!view || !view.captureStream || !window.MediaRecorder) return;
      var stream = view.captureStream(30);
      var mime = tuffMime();
      var rec = mime ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1500000 }) : new MediaRecorder(stream);
      tuff.vw = view.width; tuff.vh = view.height;
      tuff.runStart = performance.now();
      tuff.recording = true;
      rec.ondataavailable = function (ev) {
        try {
          if (!ev.data || !ev.data.size) return;
          var now = performance.now();
          if (!tuff.first) tuff.first = { blob: ev.data, t: now };
          tuff.chunks.push({ blob: ev.data, t: now });
          while (tuff.chunks.length > 2 && tuff.chunks[1].t < now - 22000) tuff.chunks.splice(1, 1);
        } catch (e) {}
      };
      rec.start(500);
      tuff.rec = rec;
    } catch (e) { tuff.recording = false; tuff.rec = null; }
  }
  function tuffSample() {
    if (!tuff.recording) return;
    try {
      if (!state.playing || !state.engine) return;
      var v = el("view");
      if (!v || !v.width || !v.height) return;
      var p = state.engine.player;
      var pr = 0;
      try {
        var lw = state.engine.level && state.engine.level.cols ? state.engine.level.cols * TILE : 1;
        pr = Math.max(0, Math.min(1, p.x / lw));
      } catch (e) {}
      tuff.track.push({
        t: state.engine.time,
        fx: (p.x + p.w / 2 - cam.x) * cam.zoom / v.width,
        fy: (p.y + p.h / 2 - cam.y) * cam.zoom / v.height,
        pw: p.w * cam.zoom / v.width,
        ph: p.h * cam.zoom / v.height,
        pr: pr
      });
      while (tuff.track.length > 2 && tuff.track[0].t < state.engine.time - 35) tuff.track.shift();
    } catch (e) {}
  }
  function tuffLogDeath() {
    try {
      if (!state.playing || !state.engine) return;
      var v = el("view");
      if (!v || !v.width || !v.height) return;
      var p = state.engine.player;
      tuff.deaths.push({
        e: state.engine.time,
        fx: (p.x + p.w / 2 - cam.x) * cam.zoom / v.width,
        fy: (p.y + p.h / 2 - cam.y) * cam.zoom / v.height
      });
      if (tuff.deaths.length > 200) tuff.deaths.shift();
    } catch (e) {}
  }
  function tuffFinishRun() {
    try {
      tuff.winStamp = performance.now();
      tuff.winEng = state.engine ? state.engine.time : 0;
      tuff.winDeaths = state.deaths | 0;
      try {
        var entry = state.netEntry || state.levels[state.current];
        tuff.levelName = (entry && entry.level && entry.level.name) || (entry && entry.meta && entry.meta.title) || "LEVEL";
      } catch (e) { tuff.levelName = "LEVEL"; }
      if (tuff.rec) { try { tuff.rec.requestData(); } catch (e) {} }
    } catch (e) {}
    tuffStop();
  }
  function tuffTimeout(promise, ms) {
    return Promise.race([promise, new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); })]);
  }
  function tuffTrackAt(runT) {
    var tr = tuff.track;
    if (!tr.length) return { x: 0.5, y: 0.5, pw: 0.06, ph: 0.1, pr: 0 };
    function full(p) { return { x: p.fx, y: p.fy, pw: p.pw || 0.06, ph: p.ph || 0.1, pr: (p.pr == null ? 0 : p.pr) }; }
    if (runT <= tr[0].t) return full(tr[0]);
    var last = tr[tr.length - 1];
    if (runT >= last.t) return full(last);
    for (var i = 1; i < tr.length; i++) {
      if (tr[i].t >= runT) {
        var a = tr[i - 1], b = tr[i], k = (runT - a.t) / Math.max(1e-6, b.t - a.t);
        var apw = a.pw || 0.06, bpw = b.pw || 0.06, aph = a.ph || 0.1, bph = b.ph || 0.1;
        var apr = (a.pr == null ? 0 : a.pr), bpr = (b.pr == null ? 0 : b.pr);
        return {
          x: a.fx + (b.fx - a.fx) * k, y: a.fy + (b.fy - a.fy) * k,
          pw: apw + (bpw - apw) * k, ph: aph + (bph - aph) * k, pr: apr + (bpr - apr) * k
        };
      }
    }
    return full(last);
  }
  function tuffLoadImage(url, ms) {
    return new Promise(function (res, rej) {
      var to = setTimeout(function () { rej(new Error("timeout")); }, ms || 6000);
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { clearTimeout(to); res(img); };
      img.onerror = function () { clearTimeout(to); rej(new Error("img")); };
      img.src = url;
    });
  }
  function tuffBuildEdit() {
    openModal("modalEdit");
    var status = el("editStatus"), prev = el("editPreview"), dl = el("btnEditDownload");
    if (prev) { try { prev.pause(); } catch (e) {} prev.removeAttribute("src"); prev.style.display = "none"; }
    if (dl) dl.style.display = "none";
    function fail(msg) {
      if (status) status.textContent = msg;
      try { showNotice(msg, true); } catch (e) {}
    }
    // Create/resume audio routing inside the click gesture so the song
    // is allowed to play and be captured (same-origin files, no CORS issue).
    var actx = null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        actx = new AC();
        if (actx.resume) { try { var arp = actx.resume(); if (arp && arp.catch) arp.catch(function () {}); } catch (e) {} }
      }
    } catch (e) { actx = null; }
    if (!tuff.chunks.length || !tuff.first) { fail("No footage recorded — finish a level first."); return; }
    if (status) status.textContent = "Cooking your edit…";
    var sel = [];
    try {
      for (var i = 0; i < tuff.chunks.length; i++) {
        if (tuff.chunks[i].t >= tuff.winStamp - (TUFF_LEN * 1000 + 500)) sel.push(tuff.chunks[i].blob);
      }
      if (!sel.length) sel = tuff.chunks.slice(-40).map(function (c) { return c.blob; });
    } catch (e) {}
    if (!sel.length) { fail("No footage recorded — finish a level first."); return; }
    var clipUrl;
    try { clipUrl = URL.createObjectURL(new Blob([tuff.first.blob].concat(sel), { type: "video/webm" })); }
    catch (e) { fail("Couldn't cut the footage."); return; }
    var video = document.createElement("video");
    video.playsInline = true; video.preload = "auto"; video.src = clipUrl;
    function meta(el2, ms) {
      return tuffTimeout(new Promise(function (res, rej) {
        el2.onloadedmetadata = function () { res(); };
        el2.onerror = function () { rej(new Error("meta")); };
      }), ms);
    }
    meta(video, 8000).then(function () {
      var vw = video.videoWidth || tuff.vw || 640, vh = video.videoHeight || tuff.vh || 360;
      var songUrl = TUFF_SONGS[Math.floor(Math.random() * TUFF_SONGS.length)];
      var song = new Audio();
      var songOk = false, songOff = 0;
      try { song.preload = "auto"; song.src = songUrl; } catch (e) { song = null; }
      var songReady = song ? meta(song, 8000).then(function () {
        var d = song.duration;
        songOk = isFinite(d) && d > 0;
        songOff = (songOk && d > TUFF_LEN + 0.5) ? Math.random() * (d - TUFF_LEN) : 0;
      }).catch(function () { songOk = false; song = null; }) : Promise.resolve();
      var trollUrls = TUFF_TROLLS.slice().sort(function () { return Math.random() - 0.5; });
      var trollReady = Promise.all(trollUrls.map(function (u) { return tuffLoadImage(u, 6000).catch(function () { return null; }); }));
      return Promise.all([songReady, trollReady]).then(function (arr) {
        var trollImgs = (arr[1] || []).filter(function (x) { return !!x; });
        tuffRenderEdit(video, vw, vh, songOk ? song : null, songOff, trollImgs, status, prev, dl, clipUrl, actx);
      });
    }).catch(function () {
      try { URL.revokeObjectURL(clipUrl); } catch (e) {}
      fail("Couldn't cut the footage.");
    });
  }
  function tuffRenderEdit(video, vw, vh, song, songOff, trollImgs, status, prev, dl, clipUrl, actx) {
    var OW = 540, OH = 960;
    var out = document.createElement("canvas");
    out.width = OW; out.height = OH;
    var ctx = out.getContext("2d");
    // Route the song ONLY into the recording (never to the speakers), so
    // playback is silent and the browser lets it play without a gesture.
    var ctx2 = actx || null, dest = null, an = null;
    try {
      if (song && ctx2) {
        if (ctx2.resume) { try { var rp2 = ctx2.resume(); if (rp2 && rp2.catch) rp2.catch(function () {}); } catch (e) {} }
        var src = ctx2.createMediaElementSource(song);
        var g = ctx2.createGain(); g.gain.value = 0.9;
        dest = ctx2.createMediaStreamDestination();
        src.connect(g); g.connect(dest);
        try { an = ctx2.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.75; g.connect(an); } catch (e) { an = null; }
      }
    } catch (e) { ctx2 = null; dest = null; }
    var vstream;
    try { vstream = out.captureStream(30); } catch (e) { fail2("This browser can't export video."); return; }
    function fail2(msg) {
      if (status) status.textContent = msg;
      try { showNotice(msg, true); } catch (e) {}
      try { URL.revokeObjectURL(clipUrl); } catch (e) {}
      try { if (ctx2) ctx2.close(); } catch (e) {}
    }
    var tracks = vstream.getVideoTracks().slice();
    if (dest) { try { tracks = tracks.concat(dest.stream.getAudioTracks()); } catch (e) {} }
    var mime = tuffMime(), rec2;
    try { rec2 = mime ? new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 2500000 }) : new MediaRecorder(new MediaStream(tracks)); }
    catch (e) { fail2("This browser can't export video."); return; }
    var parts = [];
    rec2.ondataavailable = function (ev) { if (ev.data && ev.data.size) parts.push(ev.data); };
    // timeline: pauses + zoom keys + shake impulses
    var pauses = [];
    (function () {
      var n = 2 + Math.floor(Math.random() * 3), last = -10;
      for (var i = 0; i < 8 && pauses.length < n; i++) {
        var at = 2 + Math.random() * 15.5;
        if (at - last < 1.6) continue;
        last = at;
        // Lock ONE face per pause so they never strobe/flash through all of them.
        var tim = trollImgs.length ? trollImgs[Math.floor(Math.random() * trollImgs.length)] : null;
        var kd = (tim && Math.random() < 0.6) ? "troll" : "skull";
        pauses.push({ at: Math.min(at, TUFF_LEN - 1.5), dur: 0.4 + Math.random() * 0.5, kind: kd, img: tim });
      }
      pauses.sort(function (a, b) { return a.at - b.at; });
    })();
    var keys = [{ t: 0, s: 1.3 }];
    (function () {
      var t = 0;
      while (t < TUFF_LEN) { t += 1.2 + Math.random() * 1.3; keys.push({ t: Math.min(t, TUFF_LEN), s: 1.6 + Math.random() * 0.9 }); }
    })();
    // Deaths mapped to export time, slow-mo + boring windows, shared FX state
    var clipDur = TUFF_LEN, dEvents = [], slowWins = [], boreWins = [];
    var curPr = 0, ccx = 0, ccy = 0, cdw = 1, cdh = 1;
    var hitstop = 0, flash = 0, parts = [], deathPtr = 0, deathsShown = 0, lastRate = 1;
    var beatCool = 0, bassHist = [], freqBuf = null;
    (function () {
      try {
        if (video.duration && isFinite(video.duration)) clipDur = video.duration;
        var i, at;
        for (i = 0; i < tuff.deaths.length; i++) {
          // video-time of the death inside the clip, so FX fire on the footage even during ramps
          var vt = clipDur - (tuff.winEng - tuff.deaths[i].e);
          if (vt < -0.5 || vt > clipDur) continue;
          dEvents.push({ vt: Math.max(0, vt), at: TUFF_LEN - (tuff.winEng - tuff.deaths[i].e), fx: tuff.deaths[i].fx, fy: tuff.deaths[i].fy });
        }
        dEvents.sort(function (a, b) { return a.vt - b.vt; });
        var base = 0;
        for (i = 0; i < tuff.deaths.length; i++) { if (tuff.winEng - tuff.deaths[i].e > clipDur) base++; }
        deathsShown = base;
        for (i = 0; i < dEvents.length; i++) slowWins.push({ at: dEvents[i].at - 0.7, dur: 0.8, rate: 0.35 });
        for (i = 0; i < 2; i++) slowWins.push({ at: 2 + Math.random() * 15, dur: 0.6, rate: 0.6 });
        var bStart = -1;
        for (var t = 0; t <= TUFF_LEN; t += 0.5) {
          var r0 = tuff.winEng - (TUFF_LEN - t);
          var pa = tuffTrackAt(r0 - 0.3), pb = tuffTrackAt(r0 + 0.3);
          var spd = Math.sqrt(Math.pow(pb.x - pa.x, 2) + Math.pow(pb.y - pa.y, 2)) / 0.6;
          if (spd < 0.06) { if (bStart < 0) bStart = t; }
          else { if (bStart >= 0 && t - bStart >= 1.5) boreWins.push({ at: bStart, dur: t - bStart }); bStart = -1; }
        }
        if (bStart >= 0 && TUFF_LEN - bStart >= 1.5) boreWins.push({ at: bStart, dur: TUFF_LEN - bStart });
      } catch (e) {}
    })();
    function inWin(wins, et) {
      for (var i = 0; i < wins.length; i++) {
        if (et >= wins[i].at && et < wins[i].at + wins[i].dur) return wins[i];
      }
      return null;
    }
    function inPause(et) {
      for (var i = 0; i < pauses.length; i++) {
        if (et >= pauses[i].at && et < pauses[i].at + pauses[i].dur) return pauses[i];
      }
      return null;
    }
    var px = 0.5, py = 0.5, sc = 1.3, boost = 0, trauma = 0, nextShake = 0.4 + Math.random() * 0.6, ki = 0;
    var lvx = 0, lvy = 0, ptx = 0.5, pty = 0.5;
    var lastT = performance.now(), t0 = lastT, done = false, finUrl = null;
    function draw(et, dt, hold) {
      var runT = tuff.winEng - (TUFF_LEN - et);
      var tgt = tuffTrackAt(runT);
      curPr = tgt.pr || 0;
      // Velocity lead: aim slightly ahead of the player so fast moves at
      // high zoom don't outrun the smoothed camera.
      if (dt > 0) {
        var ivx = (tgt.x - ptx) / dt, ivy = (tgt.y - pty) / dt;
        var lk = Math.min(1, dt * 8);
        lvx += (ivx - lvx) * lk; lvy += (ivy - lvy) * lk;
      }
      ptx = tgt.x; pty = tgt.y;
      var ax = tgt.x + lvx * 0.12, ay = tgt.y + lvy * 0.12;
      var ck = Math.min(1, dt * 10);
      px += (ax - px) * ck;
      py += (ay - py) * ck;
      while (ki + 1 < keys.length && keys[ki + 1].t <= et) { ki++; trauma = Math.min(1, trauma + 0.6); }
      var goal = keys[ki].s + boost;
      sc += (goal - sc) * Math.min(1, dt * 3);
      boost = Math.max(0, boost - dt * 1.2);
      if (et >= nextShake) { trauma = Math.min(1, trauma + 0.7 + Math.random() * 0.5); nextShake = et + 0.5 + Math.random() * 1.0; }
      trauma = Math.max(0, trauma - dt * 0.9);
      var shx = 0, shy = 0, rot = 0;
      if (trauma > 0.01) {
        var a = 30 * trauma * trauma;
        shx = (Math.random() * 2 - 1) * a; shy = (Math.random() * 2 - 1) * a;
        rot = (Math.random() * 2 - 1) * 0.03 * trauma;
      }
      var p = inPause(et);
      if (p) {
        try { if (!video.paused) video.pause(); } catch (e) {}
        try {
          ctx.save();
          ctx.filter = "grayscale(1)";
          ctx.drawImage(video, 0, 0, vw, vh, 0, 0, OW, OH);
          ctx.restore();
        } catch (e) {}
        try {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(0, 0, OW, OH);
          if (p.kind === "troll" && p.img) {
            var im = p.img;
            var h = OH * 0.5, w = h * (im.width / Math.max(1, im.height));
            ctx.drawImage(im, (OW - w) / 2, (OH - h) / 2, w, h);
          } else {
            ctx.font = "200px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("💀", OW / 2, OH / 2 - 10);
          }
          ctx.restore();
        } catch (e) {}
        return p;
      }
      if (!hold) { try { if (video.paused && !video.ended) video.play().catch(function () {}); } catch (e) {} }
      try {
        ctx.save();
        ctx.filter = "none";
        var sEff = Math.max(1.0, sc);
        var dw = vw / sEff, dh = vh / sEff;
        if (dw / dh > OW / OH) dw = dh * OW / OH; else dh = dw * OH / OW;
        // Never crop tighter than ~2.4x the player size, so the character
        // plus a margin always stays in frame no matter the zoom.
        var needW = (tgt.pw || 0.06) * vw * 2.4, needH = (tgt.ph || 0.1) * vh * 2.4;
        if (dw < needW || dh < needH) {
          var kk = Math.max(needW / dw, needH / dh);
          dw *= kk; dh *= kk;
        }
        var cx = Math.min(Math.max(px * vw + shx, dw / 2), vw - dw / 2);
        var cy = Math.min(Math.max(py * vh + shy, dh / 2), vh - dh / 2);
        if (dw >= vw) cx = vw / 2;
        if (dh >= vh) cy = vh / 2;
        ccx = cx; ccy = cy; cdw = dw; cdh = dh;
        if (rot) { ctx.translate(OW / 2, OH / 2); ctx.rotate(rot); ctx.translate(-OW / 2, -OH / 2); }
        ctx.drawImage(video, cx - dw / 2, cy - dh / 2, dw, dh, -40, -40, OW + 80, OH + 80);
        ctx.restore();
      } catch (e) {}
      return null;
    }
    var wasPause = false;
    function boom() {
      try {
        if (!ctx2 || !dest) return;
        var t = ctx2.currentTime;
        var o = ctx2.createOscillator(), bg = ctx2.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(70, t);
        o.frequency.exponentialRampToValueAtTime(28, t + 0.35);
        bg.gain.setValueAtTime(0.9, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.connect(bg); bg.connect(dest);
        o.start(t); o.stop(t + 0.45);
      } catch (e) {}
    }
    function fireDeath(d) {
      deathsShown++;
      flash = 1; hitstop = 0.12; trauma = 1;
      try {
        var ox = -40 + ((d.fx * vw - (ccx - cdw / 2)) / cdw) * (OW + 80);
        var oy = -40 + ((d.fy * vh - (ccy - cdh / 2)) / cdh) * (OH + 80);
        if (ox > -30 && ox < OW + 30 && oy > -30 && oy < OH + 30) {
          for (var i = 0; i < 46; i++) {
            var a2 = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 380;
            var lf = 0.5 + Math.random() * 0.4;
            parts.push({ x: ox, y: oy, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp - 160, life: lf, max: lf, sz: 3 + Math.random() * 5, col: ["#ffffff", "#ffd23f", "#ff4b4b", "#ff9f1c"][i % 4] });
          }
        }
      } catch (e) {}
      boom();
    }
    function drawParts(dt) {
      if (!parts.length) return;
      try {
        ctx.save();
        for (var i = parts.length - 1; i >= 0; i--) {
          var q = parts[i];
          q.life -= dt;
          if (q.life <= 0) { parts.splice(i, 1); continue; }
          q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
          ctx.globalAlpha = Math.max(0, q.life / q.max);
          ctx.fillStyle = q.col;
          ctx.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
        }
        ctx.restore();
      } catch (e) {}
    }
    function tuffFmtT(t) {
      t = Math.max(0, t);
      var m = Math.floor(t / 60), s = t - m * 60;
      return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2);
    }
    function drawHud(et, runT) {
      try {
        ctx.save();
        ctx.textBaseline = "top";
        ctx.font = "bold 30px monospace"; ctx.textAlign = "left";
        ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,0.8)";
        var ts = tuffFmtT(runT);
        ctx.strokeText(ts, 16, 14); ctx.fillStyle = "#fff"; ctx.fillText(ts, 16, 14);
        ctx.textAlign = "right";
        var ds = "💀 " + deathsShown;
        ctx.strokeText(ds, OW - 16, 14); ctx.fillText(ds, OW - 16, 14);
        if (et < 2.5) {
          var ba = et < 2 ? 1 : 1 - (et - 2) / 0.5;
          ctx.globalAlpha = Math.max(0, ba);
          ctx.textAlign = "center";
          ctx.font = "bold 26px monospace";
          ctx.strokeText("TUFF EDIT", OW / 2, 64); ctx.fillStyle = "#ffd23f"; ctx.fillText("TUFF EDIT", OW / 2, 64);
          ctx.font = "bold 40px monospace"; ctx.fillStyle = "#fff";
          var nm = String(tuff.levelName || "LEVEL").toUpperCase().slice(0, 24);
          ctx.strokeText(nm, OW / 2, 100); ctx.fillText(nm, OW / 2, 100);
          ctx.globalAlpha = 1;
        }
        var bw2 = OW - 120, bx = 30, by = OH - 40;
        var prc = Math.max(0, Math.min(1, curPr));
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 4, by - 4, bw2 + 8, 22);
        ctx.fillStyle = "#3a3a3a"; ctx.fillRect(bx, by, bw2, 14);
        ctx.fillStyle = "#ffd23f"; ctx.fillRect(bx, by, bw2 * prc, 14);
        ctx.font = "24px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("💀", bx + bw2 * prc - 12, by + 7);
        ctx.font = "bold 22px monospace"; ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillStyle = "#fff";
        ctx.fillText(Math.floor(prc * 100) + "%", OW - 16, by - 4);
        ctx.restore();
      } catch (e) { try { ctx.restore(); } catch (e2) {} }
    }
    function frame() {
      if (done) return;
      var now = performance.now();
      var dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      var et = (now - t0) / 1000;
      if (et >= TUFF_LEN) { finish(); return; }
      var runT = tuff.winEng - (TUFF_LEN - et);
      var vNow = -1;
      try { vNow = video.currentTime; } catch (e) {}
      // Track/HUD follow the FOOTAGE (video time), not export time, so ramps stay in sync.
      if (vNow >= 0) runT = tuff.winEng - (clipDur - vNow);
      // Speed ramps: slow-mo into kills, fast-forward boring bits,
      // debt catch-up so the edit still lands exactly on the win.
      var gz = inPause(et);
      var rate = 1;
      try {
        var expV = clipDur - (TUFF_LEN - et);
        if (expV < 0) expV = 0;
        var debt = expV - video.currentTime;
        var sw = inWin(slowWins, et), bw = inWin(boreWins, et);
        if (sw) rate = sw.rate;
        else if (bw) rate = 1.6;
        else rate = Math.max(0.9, Math.min(1.8, 1 + debt * 1.5));
      } catch (e) { rate = 1; }
      while (deathPtr < dEvents.length && vNow >= 0 && dEvents[deathPtr].vt <= vNow) { fireDeath(dEvents[deathPtr]); deathPtr++; }
      if (hitstop > 0) { hitstop -= dt; try { video.pause(); } catch (e) {} }
      else {
        try { if (Math.abs(video.playbackRate - rate) > 0.05) video.playbackRate = rate; } catch (e) {}
        if (!gz) { try { if (video.paused && !video.ended) video.play().catch(function () {}); } catch (e) {} }
      }
      lastRate = rate;
      // Beat-synced punches off the song's live bass energy.
      beatCool -= dt;
      if (an && beatCool <= 0) {
        try {
          if (!freqBuf || freqBuf.length !== an.frequencyBinCount) freqBuf = new Uint8Array(an.frequencyBinCount);
          an.getByteFrequencyData(freqBuf);
          var bb = 0, bn = 0;
          for (var bi = 1; bi < 5 && bi < freqBuf.length; bi++) { bb += freqBuf[bi]; bn++; }
          bb = bn ? bb / bn : 0;
          bassHist.push(bb); if (bassHist.length > 24) bassHist.shift();
          var av = 0;
          for (var hi = 0; hi < bassHist.length; hi++) av += bassHist[hi];
          av = bassHist.length ? av / bassHist.length : 0;
          if (bb > 45 && bb > av * 1.35) {
            boost = Math.min(0.5, boost + 0.28); trauma = Math.min(1, trauma + 0.5); beatCool = 0.28;
          }
        } catch (e) {}
      }
      var p = draw(et, dt, hitstop > 0);
      if (wasPause && !p) { boost = 0.35; trauma = Math.min(1, trauma + 1.0); }
      wasPause = !!p;
      drawParts(dt);
      if (flash > 0) {
        flash = Math.max(0, flash - dt * 3);
        try { ctx.save(); ctx.fillStyle = "rgba(255,30,30," + (flash * 0.45).toFixed(3) + ")"; ctx.fillRect(0, 0, OW, OH); ctx.restore(); } catch (e) {}
      }
      drawHud(et, runT);
      requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return; done = true;
      try { if (song) song.pause(); } catch (e) {}
      try { video.pause(); } catch (e) {}
      try { rec2.stop(); } catch (e) { fail2("Couldn't finish the video."); return; }
    }
    rec2.onstop = function () {
      try {
        finUrl = URL.createObjectURL(new Blob(parts, { type: "video/webm" }));
        if (prev) { prev.src = finUrl; prev.style.display = ""; }
        if (dl) {
          var nm = "dashpoint-edit";
          try { nm += "-" + String(state.currentFile || "level").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase(); } catch (e) {}
          dl.href = finUrl; dl.download = nm + ".webm"; dl.style.display = "";
        }
        if (status) status.textContent = "Your 20s tuff edit is ready. It always ends on the win.";
      } catch (e) { fail2("Couldn't finish the video."); }
      try { URL.revokeObjectURL(clipUrl); } catch (e) {}
      try { vstream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { if (ctx2) ctx2.close(); } catch (e) {}
    };
    try {
      if (song) { try { song.currentTime = songOff; } catch (e) {} }
      var pr = video.play();
      if (pr && pr.then) pr.catch(function () { fail2("Couldn't play the footage."); });
    } catch (e) { fail2("Couldn't play the footage."); return; }
    if (song) { try { var sp = song.play(); if (sp && sp.catch) sp.catch(function () {}); } catch (e) {} }
    try { rec2.start(250); } catch (e) { fail2("This browser can't export video."); return; }
    if (status) status.textContent = "Rendering your 20s edit…";
    requestAnimationFrame(frame);
  }
  function getGhostForLevel(file){    try {
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
      html += '<div class="lb-row' + (isMe ? " lb-me" : race ? " lb-race" : "") + '"' + attr + '><span class="lb-rank">#' + (i + 1) + '</span>' + frameAvatarHtml(row.skin, isMe ? equippedFrameId() : (row.frame || frameForUid(row.uid))) + '<span class="lb-name">' + taggedNameHtml(row.name, row.tag || (isMe ? equippedTagId() : tagIdForUid(row.uid)), isMe ? " (you)" : "", row.nameColor || (isMe ? equippedNameColorId() : nameColorForUid(row.uid))) + '</span><span class="lb-time">' + fmtTime(row.time) + "</span>" + (race ? '<span class="lb-race-hint">RACE ▶</span>' : "") + "</div>";
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

  /* ---------------- GLOBAL LEADERBOARDS ---------------- */
  const BOARD_CATS = [
    { id: "deaths", label: "Deaths" },
    { id: "coins", label: "Coins" },
    { id: "jumps", label: "Jumps" },
    { id: "skins", label: "Skins" },
    { id: "beaten", label: "Beaten" },
    { id: "crowns", label: "Crowns" },
    { id: "playtime", label: "Playtime" },
    { id: "made", label: "Made" },
  ];
  let boardCat = "deaths";
  let boardsCache = { at: 0, users: null };
  let crownsCache = { at: 0, map: null };

  function boardVal(u, cat) {
    if (!u) return 0;
    if (cat === "coins") return parseFloat(u.coins) || 0;
    if (cat === "skins") return u.skins | 0;
    if (cat === "beaten") return u.beatenCount | 0;
    if (cat === "playtime") return u.playtime | 0;
    if (cat === "made") return u.made | 0;
    if (cat === "crowns") return (crownsCache.map && crownsCache.map[u.uid]) || 0;
    if (cat === "jumps") return u.jumps | 0;
    return u.deaths | 0;
  }

  function boardFmt(cat, u) {
    if (cat === "coins") return fmtCoins(u.coins || "0");
    if (cat === "playtime") return fmtPlaytime(u.playtime || 0);
    if (cat === "skins") return (u.skins | 0) + "/" + SKINS.length;
    return String(boardVal(u, cat));
  }

  function boardTitle(cat) {
    for (let i = 0; i < BOARD_CATS.length; i++) {
      if (BOARD_CATS[i].id === cat) return "TOP 50 — " + BOARD_CATS[i].label.toUpperCase();
    }
    return "TOP 50";
  }

  async function computeCrowns() {
    if (crownsCache.map && Date.now() - crownsCache.at < 5 * 60 * 1000) return crownsCache.map;
    const map = {};
    for (const f of LEVEL_FILES) {
      try {
        const list = await NET.getLeaderboard(f, 1);
        if (list && list.length && list[0].uid) map[list[0].uid] = (map[list[0].uid] || 0) + 1;
      } catch (e) {}
    }
    crownsCache = { at: Date.now(), map: map };
    return map;
  }

  async function renderBoards() {
    const box = el("netBoardsList");
    if (!box) return;
    document.querySelectorAll("#screen-netboards .chip[data-board]").forEach(function (x) {
      x.classList.toggle("active", x.dataset.board === boardCat);
    });
    box.innerHTML = '<p class="loading-note">Loading leaderboard…</p>';
    try {
      // push my latest numbers first so "you" is current
      try {
        const me0 = NET.getUser && NET.getUser();
        if (me0 && NET.syncStats) {
          await NET.syncStats({
            deaths: save_.data.deaths | 0,
            jumps: save_.data.jumps | 0,
            coins: save_.data.coins,
            beatenCount: Object.keys(save_.data.beaten || {}).length,
            skins: (save_.data.unlocked || []).length,
            playtime: Number(save_.data.playtime) || 0,
          });
          boardsCache.at = 0;
        }
      } catch (e) {}
      if (boardCat === "crowns") await computeCrowns();
      let users = null;
      if (boardsCache.users && Date.now() - boardsCache.at < 120000) {
        users = boardsCache.users;
      } else {
        users = await NET.loadUsersIndex();
        boardsCache = { at: Date.now(), users: users };
      }
      const me = NET.getUser ? NET.getUser() : null;
      const rows = (users || [])
        .map(function (u) { return { u: u, v: boardVal(u, boardCat) }; })
        .filter(function (r) { return r.v > 0; })
        .sort(function (a, b) { return b.v - a.v; })
        .slice(0, 50);
      if (!rows.length) {
        box.innerHTML = '<p class="loading-note">No scores yet. Go play!</p>';
        return;
      }
      let html = '<div class="lb-title">' + escapeHtml(boardTitle(boardCat)) + "</div>";
      for (let i = 0; i < rows.length; i++) {
        const u = rows[i].u;
        const isMe = me && u.uid === me.uid;
        html += '<div class="lb-row' + (isMe ? " lb-me" : "") + '"><span class="lb-rank">#' + (i + 1) + "</span>" +
          frameAvatarHtml(u.skin, isMe ? equippedFrameId() : u.frame) +
          '<span class="lb-name">' + taggedNameHtml(u.name, u.tag || (isMe ? equippedTagId() : ""), isMe ? " (you)" : "", u.nameColor || (isMe ? equippedNameColorId() : "")) + "</span>" +
          '<span class="lb-time">' + escapeHtml(boardFmt(boardCat, u)) + "</span></div>";
      }
      box.innerHTML = html;
    } catch (e) {
      box.innerHTML = '<p class="loading-note">Could not reach the network.<br />' + escapeHtml((e && e.message) || String(e)) + "</p>";
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
        try { res = await DPNet.submitLeaderboard(file, time, save_.data.skin, equippedTagId(), equippedNameColorId(), equippedFrameId()); } catch(e){}
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
    if (preview && equipped) {
      preview.src = equipped.src;
      const fr = equippedFrame();
      preview.className = "home-skin" + (fr ? " avatar-frame " + fr.cls : "");
    }
    syncAccountTagUI();
  }

  function show(name) {
    if (state.qcOpen) closeQuickChat();
    state.screen = name;
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("visible"));
    el("screen-" + name).classList.add("visible");
    if (name === "levels") renderLevels();
    if (name === "game") resizeCanvas();
    if (name === "home") renderLotd();
    if (name === "network" || name === "netsaved" || name === "netsearch" || name === "netboards") state.netBack = name;
  }

  function lotdDateStr(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function lotdHash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function lotdPick(levels, dateStr) {
    if (!levels || !levels.length) return null;
    const sorted = levels.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return sorted[lotdHash("lotd:" + dateStr) % sorted.length];
  }

  function showLotd(meta) {
    const card = el("lotdCard");
    if (!card || !meta) return;
    el("lotdTitle").textContent = meta.title || "Untitled";
    el("lotdBy").textContent = "by " + (meta.authorName || "?");
    card.classList.remove("hidden");
    card.onclick = function () { try { playNetworkLevel(meta); } catch (e) {} };
  }

  async function renderLotd() {
    const card = el("lotdCard");
    if (!card) return;
    card.classList.add("hidden");
    const today = lotdDateStr();
    try {
      const raw = localStorage.getItem("dashpoint.lotd");
      if (raw) {
        const c = JSON.parse(raw);
        if (c && c.date === today && c.meta && c.meta.id) {
          showLotd(c.meta);
          return;
        }
      }
    } catch (e) {}
    try {
      await ensureIndexes();
    } catch (e) {
      return;
    }
    const pick = lotdPick(levelIndexCache, today);
    if (!pick) return;
    try { localStorage.setItem("dashpoint.lotd", JSON.stringify({ date: today, meta: pick })); } catch (e) {}
    showLotd(pick);
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
    try {
      var customSec = document.createElement("div"); customSec.className = "skin-section";
      customSec.innerHTML = '<div class="skin-section-title">CUSTOM <span class="line"></span></div>';
      var cg = document.createElement("div"); cg.className = "skin-grid";
      cg.appendChild(makeCustomTile());
      customSec.appendChild(cg);
      if (isUnlocked(CUSTOM_SKIN_ID)) {
        var pb = document.createElement("button");
        pb.className = "px-btn small gold";
        pb.textContent = "PAINT YOUR SKIN";
        pb.addEventListener("click", openPaint);
        var prow = document.createElement("div");
        prow.className = "row-gap";
        prow.style.marginTop = "8px";
        prow.appendChild(pb);
        customSec.appendChild(prow);
      }
      grid.appendChild(customSec);
    } catch (e) {}
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
        let have = save_.data.deaths; let maxNeed=100;
        skins.forEach(function(s){ const u=s.unlock||{}; const n=u.n||u.deaths||0; if(n>maxNeed)maxNeed=n; }); let pct=Math.min(100, Math.floor(have/maxNeed*100));
        let prog=document.createElement("div"); prog.className="skin-progress";
        let fill=document.createElement("div"); fill.className="skin-progress-fill"; fill.style.width=pct+"%"; prog.appendChild(fill); sec.appendChild(prog);
        let txt=document.createElement("div"); txt.className="skin-progress-text"; txt.textContent=have + " / " + maxNeed + " deaths (" + pct + "%)"; sec.appendChild(txt);
      }
      if (titleText.indexOf("JUMPS") !== -1) {
        let have = save_.data.jumps | 0; let maxNeed=100;
        skins.forEach(function(s){ const u=s.unlock||{}; const n=u.n||u.jumps||0; if(n>maxNeed)maxNeed=n; }); let pct=Math.min(100, Math.floor(have/maxNeed*100));
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
    const irl = SKINS.filter(function(s){ return !!s.irl; });
    if (irl.length) addSection("IRL — real people", irl, 'Codes: "bibi" / "putin" / "trump"');
    const shopOwned = SKINS.filter(function(s){ return isShopSkin(s) && isUnlocked(s.id) && !(s.unlock && s.unlock.deaths); });
    if (shopOwned.length) addSection("SHOP", shopOwned, "Bought with coins");
    const codeOwned = SKINS.filter(function(s){ return isCodeSkin(s) && isUnlocked(s.id) && !s.irl; });
    if (codeOwned.length) addSection("CODES", codeOwned, "Unlocked with a code");
    syncCoinUI();
  }

  // ---- Custom skin slot: 1T coins, then paint your own 16x16 cube ----
  var CUSTOM_SKIN_ID = "custom";
  var CUSTOM_SLOT_COST = "1000000000000";
  var customBuyArm = 0;
  function customSkinEntry() {
    for (var i = 0; i < SKINS.length; i++) {
      if (SKINS[i].id === CUSTOM_SKIN_ID) return SKINS[i];
    }
    return null;
  }
  function ensureCustomSkin() {
    try {
      var url = save_.data.customSkin;
      if (!url) return;
      var ex = customSkinEntry();
      if (ex) ex.src = url;
      // code-type lock: checkUnlocks() skips code skins, so the slot can
      // never auto-unlock — only the 1T purchase grants it
      else SKINS.push({ id: CUSTOM_SKIN_ID, name: "Custom", src: url, unlock: { type: "code" } });
      try {
        if (typeof DP !== "undefined" && DP.registerSkin) DP.registerSkin({ id: CUSTOM_SKIN_ID, name: "Custom", src: url });
      } catch (e) {}
      if (!state.images || !state.images.skins) return;
      var cur = state.images.skins[CUSTOM_SKIN_ID];
      if (cur && cur.src === url) return;
      var img = new Image();
      img.onload = function () {
        try {
          state.images.skins[CUSTOM_SKIN_ID] = img;
          if (el("modalSkins").classList.contains("visible")) renderSkins();
        } catch (e) {}
      };
      img.src = url;
    } catch (e) {}
  }
  function makeCustomTile() {
    var owned = isUnlocked(CUSTOM_SKIN_ID);
    var art = save_.data.customSkin;
    var b = document.createElement("button");
    var equipped = save_.data.skin === CUSTOM_SKIN_ID;
    b.className = "skin-tile" + (owned ? "" : " locked") + (equipped ? " selected" : "");
    var hint, inner;
    if (owned) {
      hint = equipped ? "EQUIPPED" : "TAP TO EQUIP";
      inner = art ? '<img src="' + art + '" alt="" />' : '<span class="skin-name">?</span>';
    } else {
      var can = hasCoins(coinAmount(CUSTOM_SLOT_COST));
      hint = can ? "TAP TO BUY THE SLOT" : "NEED " + fmtCoins(CUSTOM_SLOT_COST);
      if (!can) b.classList.add("cant");
      inner = '<span class="skin-name">?</span>';
    }
    b.innerHTML = inner + '<span class="skin-name">Custom slot</span>' +
      '<span class="shop-cost">' + coinIcon() + fmtCoins(CUSTOM_SLOT_COST) + "</span>" +
      '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
    b.addEventListener("click", function () {
      if (!isUnlocked(CUSTOM_SKIN_ID)) {
        if (!hasCoins(coinAmount(CUSTOM_SLOT_COST))) {
          showNotice("Need " + fmtCoins(CUSTOM_SLOT_COST) + " coins", true);
          return;
        }
        var now = Date.now();
        if (now - customBuyArm > 3000) {
          customBuyArm = now;
          showNotice("Tap again to unlock the custom slot for " + fmtCoins(CUSTOM_SLOT_COST), false);
          return;
        }
        customBuyArm = 0;
        subCoins(coinAmount(CUSTOM_SLOT_COST));
        save_.data.unlocked.push(CUSTOM_SKIN_ID);
        save();
        syncCoinUI();
        syncHomeStats();
        renderSkins();
        openPaint();
        return;
      }
      // owned: tap equips like every other skin (paint via the button below)
      save_.data.skin = CUSTOM_SKIN_ID;
      save();
      renderSkins();
      syncHomeStats();
    });
    return b;
  }
  // ---- Pixel painter (16x16) ----
  var PAINT_N = 16;
  var paintGrid = [];
  var paintColor = "#ff2a3c";
  var paintTool = "brush";
  var paintMirror = false;
  var paintUndo = [];
  var paintPainting = false;
  var PAINT_SWATCHES = ["#000000", "#ffffff", "#ff2a3c", "#ff9d2e", "#ffd23c", "#3ee07a",
    "#2ee6ff", "#2e7bff", "#b45cff", "#ff6bff", "#8a5a2b", "#9db4d8"];
  function paintBlank() {
    paintGrid = [];
    for (var y = 0; y < PAINT_N; y++) {
      paintGrid.push([]);
      for (var x = 0; x < PAINT_N; x++) paintGrid[y].push(null);
    }
  }
  function paintPushUndo() {
    try {
      paintUndo.push(JSON.stringify(paintGrid));
      if (paintUndo.length > 40) paintUndo.shift();
    } catch (e) {}
  }
  function paintCellFromEvent(ev) {
    var cv = el("paintGrid");
    if (!cv) return null;
    var r = cv.getBoundingClientRect();
    var px = (ev.clientX !== undefined ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0)) - r.left;
    var py = (ev.clientY !== undefined ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0)) - r.top;
    var x = Math.floor(px / r.width * PAINT_N), y = Math.floor(py / r.height * PAINT_N);
    if (x < 0 || y < 0 || x >= PAINT_N || y >= PAINT_N) return null;
    return { x: x, y: y };
  }
  function paintApply(x, y) {
    if (paintTool === "brush") {
      paintGrid[y][x] = paintColor;
      if (paintMirror) paintGrid[y][PAINT_N - 1 - x] = paintColor;
    } else if (paintTool === "eraser") {
      paintGrid[y][x] = null;
      if (paintMirror) paintGrid[y][PAINT_N - 1 - x] = null;
    } else if (paintTool === "fill") {
      paintFlood(x, y, paintColor);
    } else if (paintTool === "picker") {
      var c = paintGrid[y][x];
      if (c) {
        paintColor = c;
        var inp = el("paintColor");
        if (inp) inp.value = c;
      }
    }
  }
  function paintFlood(x, y, color) {
    var target = paintGrid[y][x];
    if (target === color) return;
    var stack = [[x, y]];
    var seen = {};
    var guard = PAINT_N * PAINT_N * 4 + 10;
    while (stack.length && guard-- > 0) {
      var p = stack.pop();
      var cx = p[0], cy = p[1];
      if (cx < 0 || cy < 0 || cx >= PAINT_N || cy >= PAINT_N) continue;
      var k = cy * PAINT_N + cx;
      if (seen[k]) continue;
      seen[k] = 1;
      if (paintGrid[cy][cx] !== target) continue;
      paintGrid[cy][cx] = color;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    if (paintMirror) {
      for (var yy = 0; yy < PAINT_N; yy++) {
        for (var xx = 0; xx < PAINT_N / 2; xx++) paintGrid[yy][PAINT_N - 1 - xx] = paintGrid[yy][xx];
      }
    }
  }
  function paintRender() {
    var cv = el("paintGrid");
    if (!cv) return;
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var cell = cv.width / PAINT_N;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (var y = 0; y < PAINT_N; y++) {
      for (var x = 0; x < PAINT_N; x++) {
        if ((x + y) % 2 === 0) { ctx.fillStyle = "#2a2f3a"; }
        else { ctx.fillStyle = "#22262f"; }
        ctx.fillRect(x * cell, y * cell, cell, cell);
        var c = paintGrid[y] && paintGrid[y][x];
        if (c) { ctx.fillStyle = c; ctx.fillRect(x * cell, y * cell, cell, cell); }
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (var i = 1; i < PAINT_N; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, cv.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(cv.width, i * cell); ctx.stroke();
    }
    var pv = el("paintPreview");
    if (pv) {
      var pctx = pv.getContext("2d");
      if (pctx) {
        pctx.imageSmoothingEnabled = false;
        pctx.clearRect(0, 0, pv.width, pv.height);
        pctx.drawImage(cv, 0, 0, pv.width, pv.height);
      }
    }
  }
  function paintSyncTools() {
    try {
      var btns = document.querySelectorAll("[data-ptool]");
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle("prize", btns[i].getAttribute("data-ptool") === paintTool);
      }
      var m = el("btnPaintMirror");
      if (m) m.textContent = paintMirror ? "MIRROR: ON" : "MIRROR: OFF";
    } catch (e) {}
  }
  function paintLoadFromSave() {
    paintBlank();
    paintUndo = [];
    var url = save_.data.customSkin;
    if (!url) { paintRender(); return; }
    try {
      var img = new Image();
      img.onload = function () {
        try {
          var off = document.createElement("canvas");
          off.width = PAINT_N; off.height = PAINT_N;
          var octx = off.getContext("2d");
          octx.clearRect(0, 0, PAINT_N, PAINT_N);
          octx.drawImage(img, 0, 0, PAINT_N, PAINT_N);
          var d = octx.getImageData(0, 0, PAINT_N, PAINT_N).data;
          for (var y = 0; y < PAINT_N; y++) {
            for (var x = 0; x < PAINT_N; x++) {
              var k = (y * PAINT_N + x) * 4;
              if (d[k + 3] < 128) { paintGrid[y][x] = null; continue; }
              var r = d[k], g = d[k + 1], b = d[k + 2];
              paintGrid[y][x] = "#" + (r < 16 ? "0" : "") + r.toString(16) + (g < 16 ? "0" : "") + g.toString(16) + (b < 16 ? "0" : "") + b.toString(16);
            }
          }
          paintRender();
        } catch (e) {}
      };
      img.src = url;
    } catch (e) {}
    paintRender();
  }
  function openPaint() {
    paintLoadFromSave();
    paintSyncTools();
    openModal("modalPaint");
    setTimeout(paintRender, 50);
  }
  function paintSave() {
    try {
      var off = document.createElement("canvas");
      off.width = PAINT_N; off.height = PAINT_N;
      var octx = off.getContext("2d");
      octx.clearRect(0, 0, PAINT_N, PAINT_N);
      for (var y = 0; y < PAINT_N; y++) {
        for (var x = 0; x < PAINT_N; x++) {
          var c = paintGrid[y] && paintGrid[y][x];
          if (!c) continue;
          octx.fillStyle = c;
          octx.fillRect(x, y, 1, 1);
        }
      }
      var url = off.toDataURL("image/png");
      if (!url || url.length > 200000) {
        showNotice("Couldn't save that painting", true);
        return;
      }
      save_.data.customSkin = url;
      if (!isUnlocked(CUSTOM_SKIN_ID)) save_.data.unlocked.push(CUSTOM_SKIN_ID);
      save_.data.skin = CUSTOM_SKIN_ID;
      save();
      ensureCustomSkin();
      renderSkins();
      syncHomeStats();
      showNotice("Custom skin saved & equipped!", false);
    } catch (e) {
      showNotice("Couldn't save that painting", true);
    }
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
    renderShopColors();
    renderShopFrames();
    renderShopTrails();
    renderShopPets();
    renderShopBg();
    renderShopPacks();
    syncCoinUI();
  }

  function renderReleases() {
    const tag = el("verTag");
    if (tag) tag.textContent = "v" + APP_VER;
    const box = el("releaseLog");
    if (!box) return;
    box.innerHTML = "";
    RELEASES.forEach(function (r) {
      const wrap = document.createElement("div");
      wrap.className = "release" + (r.v === APP_VER ? " latest" : "");
      const head = document.createElement("div");
      head.className = "release-head";
      head.innerHTML = "<b>v" + escapeHtml(r.v) + "</b><span>" + escapeHtml(r.title) + "</span>" +
        (r.v === APP_VER ? '<span class="release-new">NEW</span>' : "");
      wrap.appendChild(head);
      const ul = document.createElement("ul");
      ul.className = "release-items";
      r.items.forEach(function (it) {
        const li = document.createElement("li");
        li.textContent = it;
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      box.appendChild(wrap);
    });
  }

  function syncNewVerDot() {
    const unseen = (save_.data.seenVer || "") !== APP_VER;
    document.body.classList.toggle("has-newver", unseen);
  }

  function renderShopColors() {
    const box = el("shopColorGrid");
    if (!box) return;
    box.innerHTML = "";
    SHOP_COLORS.forEach(function (c) {
      const owned = ownsNameColor(c.id);
      const equipped = save_.data.nameColor === c.id;
      const cost = coinAmount(c.cost);
      const can = hasCoins(cost);
      const b = document.createElement("button");
      b.className = "skin-tile" + (equipped ? " selected" : "") + (!owned && !can ? " cant" : "");
      const hint = owned ? (equipped ? "EQUIPPED" : "TAP TO EQUIP") : can ? "TAP TO BUY" : "NEED " + fmtCoins(cost);
      b.innerHTML =
        '<span class="tag-preview" style="color:' + c.color + '">ABC</span>' +
        '<span class="skin-name">' + escapeHtml(c.label) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
        '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      b.addEventListener("click", function () {
        if (owned) {
          save_.data.nameColor = equipped ? "" : c.id;
          save();
          lastPublishedTag = undefined;
          renderShopColors();
          syncAccountTagUI();
          syncHomeStats();
          return;
        }
        buyShopColor(c);
      });
      box.appendChild(b);
    });
  }

  function buyShopColor(c) {
    if (!c || ownsNameColor(c.id)) return;
    const cost = coinAmount(c.cost);
    if (!hasCoins(cost)) {
      showNotice("Not enough coins", true);
      return;
    }
    subCoins(cost);
    save_.data.nameColors = save_.data.nameColors || [];
    save_.data.nameColors.push(c.id);
    save_.data.nameColor = c.id;
    save();
    lastPublishedTag = undefined;
    showNotice("Name color unlocked!", false);
    renderShop();
    syncHomeStats();
    syncCoinUI();
    syncAccountTagUI();
  }

  function renderShopFrames() {
    const box = el("shopFrameGrid");
    if (!box) return;
    box.innerHTML = "";
    const equippedSkin = SKINS.find(function (s) { return s.id === save_.data.skin; }) || SKINS[0];
    SHOP_FRAMES.forEach(function (f) {
      const owned = ownsFrame(f.id);
      const equipped = save_.data.frame === f.id;
      const cost = coinAmount(f.cost);
      const can = hasCoins(cost);
      const b = document.createElement("button");
      b.className = "skin-tile" + (equipped ? " selected" : "") + (!owned && !can ? " cant" : "");
      const hint = owned ? (equipped ? "EQUIPPED" : "TAP TO EQUIP") : can ? "TAP TO BUY" : "NEED " + fmtCoins(cost);
      b.innerHTML =
        '<span class="avatar-frame ' + f.cls + '"><img class="lb-skin" src="' + (equippedSkin ? equippedSkin.src : "assets/skins/skin-1.png") + '" alt="" /></span>' +
        '<span class="skin-name">' + escapeHtml(f.label) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
        '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      b.addEventListener("click", function () {
        if (owned) {
          save_.data.frame = equipped ? "" : f.id;
          save();
          lastPublishedTag = undefined;
          renderShopFrames();
          syncHomeStats();
          return;
        }
        buyShopFrame(f);
      });
      box.appendChild(b);
    });
  }

  function buyShopFrame(f) {
    if (!f || ownsFrame(f.id)) return;
    const cost = coinAmount(f.cost);
    if (!hasCoins(cost)) {
      showNotice("Not enough coins", true);
      return;
    }
    subCoins(cost);
    save_.data.frames = save_.data.frames || [];
    save_.data.frames.push(f.id);
    save_.data.frame = f.id;
    save();
    lastPublishedTag = undefined;
    showNotice("Profile frame unlocked!", false);
    renderShop();
    syncHomeStats();
    syncCoinUI();
  }

  function renderShopTrails() {
    const box = el("shopTrailGrid");
    if (!box) return;
    box.innerHTML = "";
    SHOP_TRAILS.forEach(function (t) {
      const owned = ownsTrail(t.id);
      const equipped = save_.data.trail === t.id;
      const cost = coinAmount(t.cost);
      const can = hasCoins(cost);
      const b = document.createElement("button");
      b.className = "skin-tile" + (equipped ? " selected" : "") + (!owned && !can ? " cant" : "");
      const hint = owned ? (equipped ? "EQUIPPED" : "TAP TO EQUIP") : can ? "TAP TO BUY" : "NEED " + fmtCoins(cost);
      const dots = (t.dots || []).map(function (c) {
        return '<span class="trail-dot" style="background:' + c + ";box-shadow:0 0 6px " + c + '"></span>';
      }).join("");
      b.innerHTML =
        '<span class="trail-preview">' + dots + "</span>" +
        '<span class="skin-name">' + escapeHtml(t.label) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
        '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      b.addEventListener("click", function () {
        if (owned) {
          save_.data.trail = equipped ? "" : t.id;
          save();
          renderShopTrails();
          return;
        }
        buyShopTrail(t);
      });
      box.appendChild(b);
    });
  }

  function buyShopTrail(t) {
    if (!t || ownsTrail(t.id)) return;
    const cost = coinAmount(t.cost);
    if (!hasCoins(cost)) {
      showNotice("Not enough coins", true);
      return;
    }
    subCoins(cost);
    save_.data.trails = save_.data.trails || [];
    save_.data.trails.push(t.id);
    save_.data.trail = t.id;
    save();
    showNotice("Trail unlocked!", false);
    renderShop();
    syncHomeStats();
    syncCoinUI();
  }

  function renderShopPets() {
    const box = el("shopPetGrid");
    if (!box) return;
    box.innerHTML = "";
    SHOP_PETS.forEach(function (t) {
      const owned = ownsPet(t.id);
      const equipped = save_.data.pet === t.id;
      const cost = coinAmount(t.cost);
      const can = hasCoins(cost);
      const b = document.createElement("button");
      b.className = "skin-tile" + (equipped ? " selected" : "") + (!owned && !can ? " cant" : "");
      const hint = owned ? (equipped ? "EQUIPPED" : "TAP TO EQUIP") : can ? "TAP TO BUY" : "NEED " + fmtCoins(cost);
      b.innerHTML =
        '<img src="' + t.src + '" alt="" />' +
        '<span class="skin-name">' + escapeHtml(t.label) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
        '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      b.addEventListener("click", function () {
        if (owned) {
          save_.data.pet = equipped ? "" : t.id;
          save();
          renderShopPets();
          return;
        }
        buyShopPet(t);
      });
      box.appendChild(b);
    });
  }

  function buyShopPet(t) {
    if (!t || ownsPet(t.id)) return;
    const cost = coinAmount(t.cost);
    if (!hasCoins(cost)) {
      showNotice("Not enough coins", true);
      return;
    }
    subCoins(cost);
    save_.data.pets = save_.data.pets || [];
    save_.data.pets.push(t.id);
    save_.data.pet = t.id;
    save();
    showNotice(t.label + " joined you!", false);
    renderShop();
    syncHomeStats();
    syncCoinUI();
  }

  // ---- Custom background: 10B shop slot, upload your own image ----
  // Shows behind menus + levels; panels go frosted via --blur-amount.
  var CUSTOM_BG_COST = "10000000000";
  var customBgImg = null;
  var customBgArm = 0;
  function ownsCustomBg() { return !!save_.data.customBg; }
  function customBgEquipped() { return !!(save_.data.customBg && save_.data.customBgOn); }
  function loadCustomBg() {
    customBgImg = null;
    try {
      var url = save_.data.customBg;
      if (!url || !save_.data.customBgOn) { syncHomeBg(); return; }
      var img = new Image();
      img.onload = function () {
        try {
          customBgImg = img;
          syncHomeBg();
        } catch (e) {}
      };
      img.src = url;
    } catch (e) {}
    syncHomeBg();
  }
  function syncHomeBg() {
    try {
      var on = !!(save_.data.customBg && save_.data.customBgOn);
      if (document.body) document.body.classList.toggle("custom-bg", on);
      var hb = el("homeBg");
      if (hb) hb.style.backgroundImage = on ? 'url("' + save_.data.customBg.replace(/"/g, "") + '")' : "";
    } catch (e) {}
  }
  function bgBlurPx() {
    var v = Number(save_.data.blur);
    if (!isFinite(v)) v = 12;
    return Math.max(0, Math.min(24, v));
  }
  function applyBlur() {
    try {
      // Slider blurs the background IMAGE itself (menu + levels).
      // Panels keep a fixed 12px frost via the --blur-amount CSS default.
      var v = bgBlurPx();
      document.documentElement.style.setProperty("--bg-blur", v + "px");
      var s = el("setBlur"), lb = el("setBlurVal");
      if (s) s.value = v;
      if (lb) lb.textContent = v + "px";
    } catch (e) {}
  }
  function renderShopBg() {
    const box = el("shopBgGrid");
    if (!box) return;
    box.innerHTML = "";
    if (!box.dataset.wired) {
      box.dataset.wired = "1";
      var ub = el("btnBgUpload");
      if (ub) ub.addEventListener("click", pickBgImage);
      var fi = el("bgUpload");
      if (fi) fi.addEventListener("change", function () {
        try {
          if (fi.files && fi.files[0]) handleBgFile(fi.files[0]);
        } catch (e) {}
      });
    }
    const owned = ownsCustomBg();
    const equipped = customBgEquipped();
    const cost = coinAmount(CUSTOM_BG_COST);
    const can = hasCoins(cost);
    const b = document.createElement("button");
    b.className = "skin-tile" + (equipped ? " selected" : "") + (!owned && !can ? " cant" : "");
    const hint = !owned
      ? (can ? "TAP TO BUY" : "NEED " + fmtCoins(cost))
      : (equipped ? "EQUIPPED" : "TAP TO EQUIP");
    b.innerHTML =
      (owned && save_.data.customBg
        ? '<img src="' + save_.data.customBg + '" alt="" />'
        : '<span class="skin-name">?</span>') +
      '<span class="skin-name">Custom background</span>' +
      '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
      '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
    b.addEventListener("click", function () {
      if (!ownsCustomBg()) {
        if (!hasCoins(coinAmount(CUSTOM_BG_COST))) {
          showNotice("Need " + fmtCoins(CUSTOM_BG_COST) + " coins", true);
          return;
        }
        var now = Date.now();
        if (now - customBgArm > 3000) {
          customBgArm = now;
          showNotice("Tap again to buy the custom background slot for " + fmtCoins(CUSTOM_BG_COST), false);
          return;
        }
        customBgArm = 0;
        subCoins(coinAmount(CUSTOM_BG_COST));
        save();
        syncCoinUI();
        syncHomeStats();
        renderShop();
        pickBgImage();
        return;
      }
      save_.data.customBgOn = !customBgEquipped();
      save();
      loadCustomBg();
      renderShop();
      showNotice(customBgEquipped() ? "Custom background ON" : "Custom background OFF", false);
    });
    box.appendChild(b);
    var uw = el("bgUploadRow");
    if (uw) uw.style.display = owned ? "" : "none";
  }
  function pickBgImage() {
    try {
      var inp = el("bgUpload");
      if (!inp) return;
      inp.value = "";
      inp.click();
    } catch (e) {}
  }
  function handleBgFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type || "")) {
      showNotice("Pick an image file", true);
      return;
    }
    try {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          URL.revokeObjectURL(url);
          var maxDim = 1600;
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          if (!w || !h) { showNotice("Couldn't read that image", true); return; }
          var s = Math.min(1, maxDim / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
          var off = document.createElement("canvas");
          off.width = cw; off.height = ch;
          var octx = off.getContext("2d");
          octx.drawImage(img, 0, 0, cw, ch);
          var out = off.toDataURL("image/jpeg", 0.85);
          if (!out || out.length > 1500000) {
            showNotice("Image too big — try a smaller one", true);
            return;
          }
          save_.data.customBg = out;
          save_.data.customBgOn = true;
          save();
          loadCustomBg();
          renderShop();
          syncHomeStats();
          showNotice("Background set!", false);
        } catch (e) {
          showNotice("Couldn't read that image", true);
        }
      };
      img.onerror = function () {
        try { URL.revokeObjectURL(url); } catch (e) {}
        showNotice("Couldn't read that image", true);
      };
      img.src = url;
    } catch (e) {
      showNotice("Couldn't read that image", true);
    }
  }
  function renderShopPacks() {
    const box = el("shopPackGrid");
    if (!box) return;
    box.innerHTML = "";
    SHOP_PACKS.forEach(function (p) {
      const owned = ownsPack(p.id);
      const active = save_.data.graphics === p.id;
      const cost = coinAmount(p.cost);
      const can = hasCoins(cost);
      const b = document.createElement("button");
      b.className = "skin-tile" + (active ? " selected" : "") + (!owned && !can ? " cant" : "");
      const hint = owned ? (active ? "EQUIPPED" : "TAP TO EQUIP") : can ? "TAP TO BUY" : "NEED " + fmtCoins(cost);
      b.innerHTML =
        '<img src="assets/' + p.id + '/tiles/brick.png" alt="" />' +
        '<span class="skin-name">' + escapeHtml(p.label) + "</span>" +
        '<span class="skin-hint">' + escapeHtml(p.blurb) + "</span>" +
        '<span class="shop-cost">' + coinIcon() + fmtCoins(cost) + "</span>" +
        '<span class="skin-hint">' + escapeHtml(hint) + "</span>";
      b.addEventListener("click", function () {
        if (owned) {
          save_.data.graphics = active ? "normal" : p.id;
          save();
          applyGraphics();
          syncGfxUI();
          renderShopPacks();
          return;
        }
        buyShopPack(p);
      });
      box.appendChild(b);
    });
  }

  function buyShopPack(p) {
    if (!p || ownsPack(p.id)) return;
    const cost = coinAmount(p.cost);
    if (!hasCoins(cost)) {
      showNotice("Not enough coins", true);
      return;
    }
    subCoins(cost);
    save_.data.packs = save_.data.packs || [];
    save_.data.packs.push(p.id);
    save_.data.graphics = p.id;
    save();
    applyGraphics();
    syncGfxUI();
    showNotice(p.label + " pack unlocked!", false);
    renderShop();
    syncHomeStats();
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
    if (id === "modalDownload") syncInstallUI();
    if (id === "modalSettings") {
      el("setHitbox").checked = !!save_.data.hitboxes;
      el("setFps").checked = !!save_.data.debugFps;
      el("setAuto").checked = save_.data.autoRespawn !== false;
      el("setHaptics").checked = save_.data.haptics !== false;
      renderReleases();
      save_.data.seenVer = APP_VER;
      save();
      syncNewVerDot();
      syncGhostOpUI();
      syncGfxUI();
      syncFxUI();
      syncTouchUI();
      syncCtlUI();
      syncInstallUI();
      el("advFx").style.display = "none";
      el("btnAdvFx").innerHTML = "ADVANCED &#9656;";
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
    if (g === "good" || g === "simple" || g === "dlls5" || g === "ultra" || g === "drawing" || g === "neon" || g === "revamped") {
      const mode = g === "revamped" ? "neon" : g;
      if ((mode === "drawing" || mode === "neon") && !ownsPack(mode)) return "normal";
      return mode;
    }
    return "normal";
  }

  function gfxFlags() {
    return {
      shadows: save_.data.fxShadows !== false,
      flashes: save_.data.fxFlashes !== false,
      particles: save_.data.fxParticles !== false,
    };
  }

  function syncFxUI() {
    const pairs = [["fxShadows", "setFxShadows"], ["fxFlashes", "setFxFlashes"], ["fxParticles", "setFxParticles"]];
    for (const pair of pairs) {
      const box = el(pair[1]);
      if (box) box.checked = save_.data[pair[0]] !== false;
    }
  }

  function syncGhostOpUI() {
    const pct = ghostOpacityPct();
    const slider = el("setGhostOp");
    const val = el("setGhostOpVal");
    if (slider) slider.value = String(pct);
    if (val) val.textContent = pct + "%";
  }

  function applyGraphics() {
    document.body.classList.toggle("gfx-good", gfxMode() === "good");
    document.body.classList.toggle("gfx-simple", gfxMode() === "simple");
    document.body.classList.toggle("gfx-ultra", gfxMode() === "ultra");
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
    else if (mode === "dlls5") hint.textContent = "Realistic tiles: stone, metal, glass and gold. Skins stay the same.";
    else if (mode === "ultra") hint.textContent = "Photoreal tiles and a photo backdrop.";
    else if (mode === "drawing") hint.textContent = ownsPack("drawing") ? "Drawing pack: the whole game redrawn in black-and-white ink." : "Drawing pack: unlock it in the SHOP.";
    else if (mode === "neon") hint.textContent = ownsPack("neon") ? "Neon pack: dark glass tiles with glowing edges." : "Neon pack: unlock it in the SHOP.";
    else hint.textContent = "Default look.";
    document.querySelectorAll(".gfx-opt").forEach(function (b) {
      const id = b.getAttribute("data-gfx");
      b.classList.toggle("cant", (id === "drawing" || id === "neon") && !ownsPack(id));
    });
  }

  function playZoom() {
    const mode = gfxMode();
    let tiles = 14;
    let lo = 3;
    let hi = 5;
    if (mode === "good" || mode === "ultra") {
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
    state.engine = new DP.Engine(entry.level.clone(), { skin: save_.data.skin, trail: equippedTrailId(), pet: equippedPetId() });
    if (DP.Music) DP.Music.play(entry.level.song);
    state.playing = true;
    state.deaths = 0;
    state.winShown = false;
    state.paused = false;
    state.practice = false;
    state.slowmo = false;
    state.heatmap = null;
    heatLocal = {};
    heatPending = 0;
    heatFile = state.currentFile || "";
    if (save_.data.showHeat === true) fetchHeat();
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
    showIntro(entry);
    tuffStartRun();
    presenceTick();
  }

  let introTimer = null;

  function showIntro(entry) {
    const card = el("introCard");
    if (!card || !entry) return;
    const meta = entry.meta || null;
    const file = entry.file || "";
    el("introTitle").textContent = (entry.level && entry.level.name) || meta?.title || "LEVEL";
    el("introAuthor").textContent = "by " + (meta?.authorName || (entry.level ? "DashPoint" : "?"));
    let tier = 2;
    try {
      tier = fileDiff(file, meta);
    } catch (e) {}
    el("introDiff").innerHTML = diffFaceImg(tier);
    card.classList.remove("hidden");
    if (introTimer) clearTimeout(introTimer);
    introTimer = setTimeout(function () {
      introTimer = null;
      card.classList.add("hidden");
    }, 2200);
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
    el("hudPractice").classList.toggle("hidden", !state.practice && !state.slowmo);
    if (state.slowmo) el("hudPractice").textContent = "SLOW-MO";
    else el("hudPractice").textContent = "PRACTICE";
  }

  function syncPracticeUI() {
    const b = el("btnPausePractice");
    if (b) b.textContent = state.practice ? "PRACTICE: ON" : "PRACTICE: OFF";
    const s = el("btnPauseSlow");
    if (s) s.textContent = state.slowmo ? "SLOW-MO: ON" : "SLOW-MO: OFF";
    setStatusHud();
  }

  function toggleSlowmo() {
    if (!state.engine || !state.playing) return;
    if (!state.practice && !state.slowmo) {
      showNotice("Slow-mo is practice-only — turn practice on first", true);
      return;
    }
    state.slowmo = !state.slowmo;
    showNotice(state.slowmo ? "Slow-mo ON — half-speed physics, no records" : "Slow-mo OFF", false);
    syncPracticeUI();
  }

  function togglePractice() {
    if (!state.engine || !state.playing) return;
    state.practice = !state.practice;
    if (!state.practice) {
      state.slowmo = false;
      if (state.engine.checkpoint && state.engine.checkpoint.practice) {
        state.engine.checkpoint = null;
      }
    }
    if (state.practice) showNotice("Practice ON — press X (or tap PRACTICE) to drop checkpoints, no records", false);
    else showNotice("Practice OFF", false);
    syncPracticeUI();
  }

  function placePracticeCheckpoint() {
    if (!state.engine || !state.playing || state.paused) return;
    if (state.engine.dead || state.engine.won) return;
    const lvl = state.engine.level;
    const p = state.engine.player;
    const cx = p.x + p.w / 2, cy = p.y + p.h;
    let c = Math.max(0, Math.min(lvl.cols - 1, Math.floor(cx / TILE)));
    let r = Math.max(0, Math.min(lvl.rows - 1, Math.floor(cy / TILE)));
    let ox = Math.round(cx - (c * TILE + TILE / 2));
    let oy = Math.round(cy - (r * TILE + TILE));
    while (ox > 24 && c < lvl.cols - 1) { c++; ox -= TILE; }
    while (ox < -24 && c > 0) { c--; ox += TILE; }
    while (oy > 24 && r < lvl.rows - 1) { r++; oy -= TILE; }
    while (oy < -24 && r > 0) { r--; oy += TILE; }
    state.engine.checkpoint = {
      c: c, r: r,
      ox: Math.max(-24, Math.min(24, ox)),
      oy: Math.max(-24, Math.min(24, oy)),
      practice: true,
    };
    showNotice("Checkpoint set", false);
    try { haptic("tick"); } catch (e) {}
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
    tuffStartRun();
  }

  function restartToCheckpoint() {
    if (!state.engine) return;
    if (state.engine.won || el("winCard").classList.contains("visible")) {
      restartLevel();
      return;
    }
    state.engine.reset({ keepTime: true });
    if (DP.Music) DP.Music.play(state.engine.level.song);
    el("winCard").classList.remove("visible");
    el("pauseCard").classList.remove("visible");
    state.paused = false;
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
    syncPracticeUI();
    syncHeatUI();
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
    try { flushHeat(); } catch (e) {}
    setSpectate(null);
    closeQuickChatFor();
    try { el("widgetLayer").innerHTML = ""; } catch (e) {}
    state.playing = false;
    state.engine = null;
    state.paused = false;
    state.practice = false;
    state.slowmo = false;
    tuffDiscard();
    presenceTick();
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
    tuffFinishRun();
    const entry = state.netEntry || state.levels[state.current];
    if (!entry) return;
    flushPlaytime();
    try { flushHeat(); } catch (e) {}
    const t = state.engine.time;
    if (state.practice) {
      el("winText").textContent = "PRACTICE CLEAR in " + fmtTime(t) + " — no records saved.";
      el("winCard").classList.add("visible");
      return;
    }
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

  // ---- Death heatmaps (aggregate, anonymous) ----
  let heatLocal = {};
  let heatFile = "";
  let heatPending = 0;

  function heatKey() {
    return state.currentFile || "";
  }

  function recordHeatDeath() {
    try {
      if (!state.engine || !state.currentFile) return;
      if (heatFile !== state.currentFile) {
        heatLocal = {};
        heatPending = 0;
        heatFile = state.currentFile;
      }
      const p = state.engine.player;
      const lvl = state.engine.level;
      const c = Math.max(0, Math.min(lvl.cols - 1, Math.floor((p.x + p.w / 2) / TILE)));
      const r = Math.max(0, Math.min(lvl.rows - 1, Math.floor((p.y + p.h / 2) / TILE)));
      const k = c + "," + r;
      heatLocal[k] = (heatLocal[k] || 0) + 1;
      heatPending++;
      if (heatPending >= 10) flushHeat();
    } catch (e) {}
  }

  async function flushHeat() {
    const file = heatFile || state.currentFile;
    const keys = Object.keys(heatLocal);
    if (!file || !keys.length) return;
    if (!window.DPNet) return;
    const payload = heatLocal;
    heatLocal = {};
    heatPending = 0;
    try {
      const ok = await DPNet.submitHeatmap(file, payload);
      if (!ok) {
        for (const k in payload) heatLocal[k] = (heatLocal[k] || 0) + (payload[k] || 0);
        heatPending = Object.keys(heatLocal).length;
      }
    } catch (e) {
      for (const k in payload) heatLocal[k] = (heatLocal[k] || 0) + (payload[k] || 0);
      heatPending = Object.keys(heatLocal).length;
    }
  }

  async function fetchHeat() {
    state.heatmap = null;
    try {
      if (!window.DPNet || !DPNet.getHeatmap || !state.currentFile) return;
      const u = (DPNet.getUser && DPNet.getUser()) || null;
      if (!u) return;
      const cells = await DPNet.getHeatmap(state.currentFile);
      if (!cells || state.screen !== "game" || !state.playing) return;
      const list = Object.keys(cells)
        .map((k) => {
          const parts = String(k).split(",");
          return { c: parseInt(parts[0], 10) || 0, r: parseInt(parts[1], 10) || 0, n: Math.floor(Number(cells[k]) || 0) };
        })
        .filter((h) => h.n > 0);
      list.sort((a, b) => b.n - a.n);
      state.heatmap = list.slice(0, 800);
    } catch (e) {}
  }

  function toggleHeat() {
    save_.data.showHeat = !(save_.data.showHeat === true);
    save();
    if (save_.data.showHeat) {
      showNotice("Death heatmap ON", false);
      fetchHeat();
    } else {
      state.heatmap = null;
      showNotice("Death heatmap OFF", false);
    }
    syncHeatUI();
  }

  function syncHeatUI() {
    const b = el("btnPauseHeat");
    if (b) b.textContent = save_.data.showHeat === true ? "HEATMAP: ON" : "HEATMAP: OFF";
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
  function addFeedMsg(text, name, self, color) {
    const feed = el("chatFeed");
    if (!feed) return;
    const d = document.createElement("div");
    d.className = "feed-item" + (self ? " feed-self" : "");
    const b = document.createElement("b");
    b.textContent = self ? "You" : (name || "player");
    const nc = self ? equippedNameColor() : findShopColor(color);
    if (nc) b.style.color = nc.color;
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
      addFeedMsg(c.text, peer.name, false, peer.nameColor);
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

  // ---- Haptics (Android bridge, else navigator.vibrate) ----
  function haptic(kind) {
    if (save_.data.haptics === false) return;
    try {
      const b = window.DashPointAndroidBridge || window.DashPointBridge;
      if (b) {
        if (kind === "death" && b.hapticDeath) { b.hapticDeath(); return; }
        if (kind === "win" && b.hapticWin) { b.hapticWin(); return; }
        if (kind === "orb" && b.hapticOrb) { b.hapticOrb(); return; }
        if (kind === "pad" && b.hapticPad) { b.hapticPad(); return; }
        if (kind === "dash" && b.hapticHeavy) { b.hapticHeavy(); return; }
        if (b.hapticTick) { b.hapticTick(); return; }
      }
    } catch (e) {}
    try {
      if (navigator.vibrate) {
        if (kind === "death") navigator.vibrate([50, 40, 60]);
        else if (kind === "win") navigator.vibrate([30, 50, 30, 50, 90]);
        else if (kind === "dash") navigator.vibrate(35);
        else if (kind === "orb" || kind === "pad") navigator.vibrate(20);
        else navigator.vibrate(12);
      }
    } catch (e) {}
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
        left: bindPressed("left") || !!(pad && pad.left) || state.touch.left,
        right: bindPressed("right") || !!(pad && pad.right) || state.touch.right,
        jump: bindPressed("jump") || !!(pad && pad.jump) || state.touch.jump,
      });
    if (pad && pad.startEdge && state.screen === "game" && !el("winCard").classList.contains("visible")) {
      restartLevel();
    }
    const wasDead = state.engine.dead;
    const wasOrb = state.engine.orbFlash > 0;
    const wasPad = state.engine.padFlash > 0;
    const wasDash = state.engine.dashFlash > 0;
    const hadCheckpoint = !!state.engine.checkpoint;
    // slow-mo: half-rate physics steps in practice only (records impossible:
    // practice saves nothing, and leaving practice kills slow-mo)
    const edt = (state.slowmo && state.practice) ? dt * 0.5 : dt;
    state.engine.update(edt);
    if (state.engine.orbFlash > 0 && !wasOrb) haptic("orb");
    if (state.engine.padFlash > 0 && !wasPad) haptic("pad");
    if (state.engine.dashFlash > 0 && !wasDash) haptic("dash");
    if (!hadCheckpoint && state.engine.checkpoint) haptic("tick");
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
      if (n > 0 && !state.practice) {
        const got = grantCoins(n);
        if (got) {
          save();
          syncCoinUI();
          showNotice("+" + got + " coins", false);
          haptic("tick");
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
      haptic("death");
      recordHeatDeath();
      try { tuffLogDeath(); } catch (e) {}
    }
    if (state.engine.dead && save_.data.autoRespawn && state.engine.deathTimer > 0.55) respawn();
    if (state.engine.won && !state.winShown) {
      state.winShown = true;
      haptic("win");
      onWin();
    }
    if (!state.engine.won) state.winShown = false;

    followPlayer();
    if (!state.practice) { try{ recordGhost(edt); }catch(e){} }
    try { tuffSample(); } catch (e) {} // runs in practice too, so EDIT always has tracking
    tickShake(dt);
    trackPlaytime(dt);
    setStatusHud();

    if (MP.isActive() && state.engine) {
      MP.sendCube({
        x: state.engine.player.x,
        y: state.engine.player.y,
        rot: state.engine.player.rot,
        skin: save_.data.skin,
        pet: equippedPetId(),
        petX: state.engine.petInit ? Math.round(state.engine.petX) : undefined,
        petY: state.engine.petInit ? Math.round(state.engine.petY) : undefined,
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
          const pColor = findShopColor(p.nameColor);
          remoteCubes.push(Object.assign({
            name: p.name,
            tagLabel: pTag ? pTag.label : "",
            tagColor: pTag ? pTag.color : "",
            nameColor: pColor ? pColor.color : "",
          }, p.cube));
        }
      }
    }

        // Ghost playback as remote cube
    if (ghostMode && ghostPlayback && state.engine) {
      var gpos = getGhostPos(state.engine.time);
      if (gpos) {
        if (!remoteCubes) remoteCubes = [];
        remoteCubes.push({ x: gpos.x, y: gpos.y, rot: gpos.rot, skin: gpos.skin, name: "Ghost", level: state.currentFile, ghost: true, alpha: ghostOpacityPct() / 100 });
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
      heat: state.heatmap,
      fx: gfxFlags(),
      customBg: customBgImg,
      customBgBlur: bgBlurPx(),
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

  let bioLoadedFor = "";
  function syncAccountUI() {
    const u = MP.getUser();
    const name = u ? u.name : "";
    const guest = !!(u && u.guest);
    // profile modal (account moved here)
    const plo = el("profLoggedOut"); if (plo) plo.style.display = u ? "none" : "";
    const pli = el("profLoggedIn"); if (pli) pli.style.display = u ? "" : "none";
    const pn = el("profName");
    if (pn) {
      pn.textContent = name;
      const nc = equippedNameColor();
      pn.style.color = nc ? nc.color : "";
    }
    const pr = el("profRank");
    if (pr) {
      if (u) {
        const info = rankForClears(Object.keys(save_.data.beaten || {}).length);
        pr.innerHTML = rankChipHtml(info.rank);
        const nx = el("profRankNext");
        if (nx) nx.textContent = info.next ? (info.next.min - info.clears) + " clears to " + info.next.label : "max rank!";
      } else {
        pr.innerHTML = "";
        const nx = el("profRankNext");
        if (nx) nx.textContent = "";
      }
    }
    const tagEl = el("profGuestTag"); if (tagEl) tagEl.style.display = guest ? "" : "none";
    const pass = el("profPassSection"); if (pass) pass.style.display = u && !guest ? "" : "none";
    syncAccountTagUI();
    try {
      if (!u) { bioLoadedFor = ""; }
      else if (!guest && bioLoadedFor !== u.uid && window.DPNet && DPNet.getUserProfile) {
        bioLoadedFor = u.uid;
        DPNet.getUserProfile(u.uid).then(function (p) {
          try {
            var inp = el("profBio");
            if (p && p.bio && inp && !inp.value) inp.value = String(p.bio).slice(0, 140);
          } catch (e) {}
        }).catch(function () {});
      }
    } catch (e) {}
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
          const colorId = q.nameColor || (q.me ? equippedNameColorId() : nameColorForUid(q.uid));
          nm.innerHTML = taggedNameHtml(q.name + (q.me ? " (you)" : "") + (q.slot === "host" ? " [host]" : ""), tagId, "", colorId) + " " + rankChipForUid(q.uid);
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

  let inviteShown = {};

  function inviteKey(inv) {
    return String((inv && inv.fromUid) || "") + ":" + String((inv && inv.code) || "") + ":" + String((inv && inv.ts) || 0);
  }

  function removeInviteToast(key) {
    const host = el("inviteToasts");
    if (!host) return;
    const row = host.querySelector('[data-invite="' + String(key).replace(/"/g, "") + '"]');
    if (!row) return;
    row.classList.remove("show");
    setTimeout(function () { if (row.parentNode) row.remove(); }, 280);
  }

  async function acceptInvite(inv) {
    if (!inv || !inv.code) return;
    showNotice("Joining " + (inv.fromName || "player") + "'s room…", false);
    try {
      if (!MP.isActive() || String(MP.getCode()) !== String(inv.code)) {
        await Promise.race([MP.join(inv.code), new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error("Couldn't join (network?). The room may be gone — ask for a fresh invite.")); }, 12000);
        })]);
      }
      try { await NET.clearInvite(inv.fromUid); } catch (e) {}
      showNotice("Joined " + (inv.fromName || "player") + "'s room", false);
      try { syncMpUI(); } catch (e) {}
      removeInviteToast(inviteKey(inv));
    } catch (err) {
      showNotice(String(err.message || err), true);
    }
  }

  function showInviteToast(inv) {
    if (!inv || !inv.code) return;
    const key = inviteKey(inv);
    if (inviteShown[key]) return;
    if (MP.isActive() && String(MP.getCode()) === String(inv.code)) return;
    const host = el("inviteToasts");
    if (!host) return;
    inviteShown[key] = true;
    const box = document.createElement("div");
    box.className = "invite-toast";
    box.setAttribute("data-invite", key);
    box.innerHTML =
      '<div class="invite-toast-text"><div class="invite-toast-title">ROOM INVITE</div>' +
      '<div class="invite-toast-name">' + escapeHtml(inv.fromName || "player") + " invited you — tap to join " + escapeHtml(inv.code) + "</div></div>" +
      '<button class="px-btn small good invite-toast-join" type="button">JOIN</button>' +
      '<button class="invite-toast-x" type="button" aria-label="Dismiss">×</button>';
    box.querySelector(".invite-toast-join").addEventListener("click", function (ev) {
      ev.stopPropagation();
      acceptInvite(inv);
    });
    box.querySelector(".invite-toast-x").addEventListener("click", function (ev) {
      ev.stopPropagation();
      removeInviteToast(key);
    });
    box.addEventListener("click", function () { acceptInvite(inv); });
    host.appendChild(box);
    requestAnimationFrame(function () { box.classList.add("show"); });
  }

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
    else if (which === "boards") show("netboards");
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
    row.style.cursor = "pointer";
    row.addEventListener("click", () => openLevelInfo({ id: meta.id, meta: meta }));
    const info = document.createElement("div");
    info.className = "n-main";
    info.innerHTML =
      '<div class="n-title">' + escapeHtml(meta.title || "Untitled") + "</div>" +
      '<div class="n-sub">by <b class="n-author" style="cursor:pointer">' + taggedNameHtml(meta.authorName || "?", tagIdForUid(meta.authorUid), "", nameColorForUid(meta.authorUid)) + "</b></div>" +
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
    const like = document.createElement("button");
    like.className = "n-like";
    like.title = "Like";
    const paintRowLike = (liked, count) => {
      like.innerHTML = '<img src="assets/ui/heart-full.png" alt="" /><span>' + count + "</span>";
      like.classList.toggle("liked", !!liked);
    };
    paintRowLike(false, (meta.likes | 0));
    try {
      if (NET.hasLiked) {
        NET.hasLiked(meta.id).then(function (v) { paintRowLike(!!v, (meta.likes | 0)); }).catch(function () {});
      }
    } catch (e) {}
    like.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      try {
        const st = await toggleLike(meta.id);
        if (st) {
          meta.likes = st.count;
          paintRowLike(st.liked, st.count);
        }
      } catch (err) {
        showNotice(NET.friendly(err), true);
      }
    });
    info.querySelector(".n-author").addEventListener("click", (ev) => { ev.stopPropagation(); openAccount(meta.authorUid); });
    row.appendChild(diff);
    row.appendChild(info);
    row.appendChild(like);
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
    } else if (netTab === "trending") {
      const scored = levelIndexCache
        .filter(
          (l) =>
            !q ||
            String(l.title).toLowerCase().indexOf(q) !== -1 ||
            String(l.authorName).toLowerCase().indexOf(q) !== -1 ||
            String(l.desc || "").toLowerCase().indexOf(q) !== -1 ||
            String((l.tags || []).join(" ")).toLowerCase().indexOf(q) !== -1
        )
        .map((l) => ({ meta: l, score: (Number(l.plays) || 0) + (Number(l.downloads) || 0) * 3 }));
      if (!scored.length) {
        box.innerHTML = '<p class="loading-note">No levels match.</p>';
        return;
      }
      scored.sort((a, b) => b.score - a.score);
      scored.slice(0, 25).forEach((s, i) => {
        const row = levelRow(s.meta);
        const rank = document.createElement("span");
        rank.className = "lb-rank";
        rank.textContent = "#" + (i + 1);
        row.insertBefore(rank, row.firstChild);
        const info = row.querySelector(".n-main");
        if (info) {
          const d = document.createElement("div");
          d.className = "n-sub";
          d.textContent = (Number(s.meta.plays) || 0) + " plays · " + (Number(s.meta.downloads) || 0) + " downloads · " + (Number(s.meta.likes) || 0) + " likes";
          info.appendChild(d);
        }
        box.appendChild(row);
      });
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
                if (title) title.innerHTML = taggedNameHtml(u.name, u.tag, "", u.nameColor || nameColorForUid(u.uid));
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
          frameAvatarHtml(1, frameForUid(u.uid), "n-avatar") +
          '<span class="n-main"><span class="n-title">' + taggedNameHtml(u.name, u.tag || tagIdForUid(u.uid), "", u.nameColor || nameColorForUid(u.uid)) + "</span>" +
          '<div class="n-sub">' + made + " level" + (made === 1 ? "" : "s") + " made</div></span>" +
          '<span class="n-play">VIEW</span>';
        (function(uid){ row.addEventListener("click", function(){ openAccount(uid); }); })(u.uid);
        box.appendChild(row);
      }
    }
  }

  let bellEvents = [];
  let bellChecking = false;
  let accountView = null;

  function currentMe() {
    try {
      return (NET.getEffectiveUser && NET.getEffectiveUser()) || (NET.getUser && NET.getUser());
    } catch (e) {
      return null;
    }
  }

  function followMap() {
    const f = save_.data.follows;
    return f && typeof f === "object" && !Array.isArray(f) ? f : {};
  }

  function isFollowingLocal(uid) {
    return !!followMap()[uid];
  }

  function setFollowLocal(uid, name, on) {
    if (!save_.data.follows || typeof save_.data.follows !== "object" || Array.isArray(save_.data.follows)) {
      save_.data.follows = {};
    }
    if (on) save_.data.follows[uid] = { name: String(name || "player").slice(0, 24), ts: Date.now() };
    else delete save_.data.follows[uid];
    save();
  }

  async function refreshFollows() {
    try {
      const cloud = await NET.listFollows();
      if (!cloud || typeof cloud !== "object") return;
      const merged = followMap();
      const seen = bellSeen();
      Object.keys(cloud).forEach(function (uid) {
        if (!merged[uid] && seen["f:" + uid] == null) seen["f:" + uid] = Date.now();
        merged[uid] = cloud[uid] && typeof cloud[uid] === "object" ? cloud[uid] : (merged[uid] || { ts: Date.now() });
      });
      save_.data.follows = merged;
      save_.data.bellSeen = seen;
      save();
    } catch (e) {}
  }

  function syncAcctActions() {
    const actions = el("acctActions");
    const followBtn = el("btnAcctFollow");
    if (!actions || !accountView) return;
    const me = currentMe();
    if (me && me.uid === accountView.uid) {
      actions.style.display = "none";
      return;
    }
    actions.style.display = "flex";
    const on = isFollowingLocal(accountView.uid);
    if (followBtn) {
      followBtn.textContent = on ? "UNFOLLOW" : "FOLLOW";
      followBtn.classList.toggle("good", !on);
    }
  }

  async function toggleFollow() {
    if (!accountView) return;
    const me = currentMe();
    if (!me) { showNotice("Log in to follow players.", true); return; }
    const uid = accountView.uid;
    const name = accountView.name || "player";
    const on = isFollowingLocal(uid);
    try {
      if (on) {
        try { await NET.unfollowUser(uid); } catch (e) {}
        setFollowLocal(uid, name, false);
        showNotice("Unfollowed " + name, false);
      } else {
        try { await NET.followUser(uid, name); } catch (e) {}
        setFollowLocal(uid, name, true);
        const seen = bellSeen();
        seen["f:" + uid] = Date.now();
        save_.data.bellSeen = seen;
        save();
        showNotice("Following " + name, false);
      }
      syncAcctActions();
    } catch (e) {
      showNotice(NET.friendly(e), true);
    }
  }

  var giftArm = 0, giftArmAmt = "";
  function giftFromProfile() {
    var row = el("giftRow");
    if (!row) return;
    if (row.style.display !== "none") {
      row.style.display = "none";
      return;
    }
    const me = currentMe();
    if (!me) { showNotice("Log in to send gifts.", true); return; }
    if (!accountView) { showNotice("Open a player's profile first.", true); return; }
    row.style.display = "";
    var inp = el("giftAmount");
    if (inp) {
      inp.value = "";
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50);
    }
    giftArm = 0;
  }
  async function sendGiftConfirm() {
    if (!accountView) { showNotice("Open a player's profile first.", true); return; }
    const me = currentMe();
    if (!me) { showNotice("Log in to send gifts.", true); return; }
    var amt = 0n;
    try {
      var raw = String(el("giftAmount") ? el("giftAmount").value : "").replace(/[,_\s]/g, "");
      amt = BigInt(raw || "0");
    } catch (e) { amt = 0n; }
    if (amt <= 0n) { showNotice("Enter an amount above 0.", true); return; }
    if (!hasCoins(amt)) {
      showNotice("Not enough coins (you have " + fmtCoins(save_.data.coins) + ")", true);
      return;
    }
    var now = Date.now();
    if (now - giftArm > 5000 || giftArmAmt !== amt.toString()) {
      giftArm = now; giftArmAmt = amt.toString();
      showNotice("Tap SEND again to confirm " + fmtCoins(amt) + " to " + (accountView.name || "player"), false);
      return;
    }
    giftArm = 0;
    var btn = el("btnGiftSend");
    if (btn) btn.disabled = true;
    showNotice("Sending gift…", false);
    subCoins(amt);
    save();
    syncCoinUI();
    syncHomeStats();
    try {
      await NET.sendGift(accountView.uid, amt.toString());
      showNotice("Sent " + fmtCoins(amt) + " to " + (accountView.name || "player") + "!", false);
      var row = el("giftRow");
      if (row) row.style.display = "none";
    } catch (e) {
      addCoins(amt);
      save();
      syncCoinUI();
      showNotice(String((e && e.message) || e), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }
    // ---- Friend presence: heartbeat (level/room) + friends list ----
  function presenceTick() {
    try {
      if (save_.data.sharePresence === false) return;
      if (!window.DPNet || !DPNet.updatePresence) return;
      const playing = (state.screen === "game" && state.playing && state.engine) ? (state.currentFile || "") : "";
      let room = "";
      try { room = (MP.isActive() && MP.getCode) ? (MP.getCode() || "") : ""; } catch (e) {}
      DPNet.updatePresence(playing, room).catch(function () {});
    } catch (e) {}
  }
  async function renderFriendList() {
    const box = el("friendList");
    if (!box) return;
    let follows = {};
    try { follows = followMap(); } catch (e) {}
    try {
      const cb = el("profSharePresence");
      if (cb && !cb.dataset.done) {
        cb.dataset.done = "1";
        cb.checked = save_.data.sharePresence !== false;
        cb.addEventListener("change", function () {
          save_.data.sharePresence = !!cb.checked;
          save();
          presenceTick();
        });
      } else if (cb) {
        cb.checked = save_.data.sharePresence !== false;
      }
    } catch (e) {}
    const ids = Object.keys(follows);
    if (!ids.length) {
      box.innerHTML = '<p class="loading-note">No follows yet — open a player profile and FOLLOW them.</p>';
      return;
    }
    box.innerHTML = '<p class="loading-note">Loading presence…</p>';
    const rows = [];
    for (const uid of ids.slice(0, 30)) {
      let u = null;
      try { u = window.DPNet && DPNet.getUserProfile ? await DPNet.getUserProfile(uid) : null; } catch (e) { u = null; }
      const local = follows[uid] || {};
      rows.push({ uid: uid, u: u, name: (u && u.name) || local.name || "player" });
    }
    box.innerHTML = "";
    const now = Date.now();
    rows.forEach(function (r) {
      const u = r.u || {};
      const lastSeen = Number(u.lastSeen) || 0;
      const online = !!(lastSeen && now - lastSeen < 5 * 60 * 1000);
      let room = "";
      let playing = "";
      try { room = String(u.room || ""); } catch (e) {}
      try { playing = String(u.playing || ""); } catch (e) {}
      let act = online ? "online" : (lastSeen ? "last seen " + fmtWait(now - lastSeen) : "offline");
      if (online && (room || playing)) {
        act = (room ? "room " + room : "online") + (playing ? " · " + levelNameOf(playing) : "");
      }
      const row = document.createElement("div");
      row.className = "row-gap";
      row.style.justifyContent = "space-between";
      row.innerHTML = "<span><span style=\"color:" + (online ? "var(--good)" : "#9db4d8") + "\">●</span> " +
        "<b>" + escapeHtml(r.name) + "</b> <span class='hint'>" + escapeHtml(act) + "</span></span>";
      const wrap = document.createElement("span");
      wrap.className = "row-gap";
      if (online && room && room.length === 5) {
        const jb = document.createElement("button");
        jb.className = "px-btn tiny good";
        jb.textContent = "JOIN";
        jb.addEventListener("click", function (ev) {
          ev.stopPropagation();
          joinFriendRoom(room, r.name);
        });
        wrap.appendChild(jb);
      }
      const vb = document.createElement("button");
      vb.className = "px-btn tiny";
      vb.textContent = "VIEW";
      vb.addEventListener("click", function (ev) { ev.stopPropagation(); openAccount(r.uid); });
      wrap.appendChild(vb);
      row.appendChild(wrap);
      box.appendChild(row);
    });
    if (!rows.length) box.innerHTML = '<p class="loading-note">No follows yet.</p>';
  }
  async function joinFriendRoom(code, name) {
    showNotice("Joining " + (name || "player") + "'s room…", false);
    try {
      if (!MP.isActive() || String(MP.getCode()) !== code) {
        await Promise.race([MP.join(code), new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error("Couldn't join (network?). The room may be gone.")); }, 12000);
        })]);
      }
      showNotice("Joined " + (name || "player") + "'s room", false);
      try { syncMpUI(); } catch (e) {}
      presenceTick();
    } catch (err) {
      showNotice(String((err && err.message) || err), true);
    }
  }
  async function inviteFromProfile() {    if (!accountView) { showNotice("Open a player's profile first.", true); return; }
    const me = currentMe();
    if (!me) { showNotice("Log in to invite players.", true); return; }
    const btn = el("btnAcctInvite");
    const oldLabel = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "HOSTING…"; }
    showNotice("Starting room…", false);
    function hostTimeout(ms) {
      return new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error("Couldn't start a room (network?). Check connection and try again.")); }, ms);
      });
    }
    try {
      if (!MP.isActive()) {
        // Firebase can stall without resolving when offline — never hang silently
        await Promise.race([MP.host(), hostTimeout(12000)]);
        try { syncMpUI(); } catch (e) {}
      }
      const code = String(MP.getCode() || "").trim().toUpperCase();
      if (code.length !== 5) throw new Error("Could not start a room.");
      await NET.sendInvite(accountView.uid, code);
      showNotice("Invited " + (accountView.name || "player") + " to " + code, false);
    } catch (e) {
      showNotice(NET.friendly ? NET.friendly(e) : String(e.message || e), true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldLabel || "INVITE"; }
    }
  }

  function levelNameOf(file) {
    try {
      if (String(file).indexOf("net:") === 0) {
        const m = (levelIndexCache || []).find((l) => l.id === String(file).slice(4));
        if (m) return m.title || "a level";
      } else {
        const e = (state.levels || []).find((x) => x.file === file);
        if (e && e.level) return e.level.name || file;
      }
    } catch (e) {}
    return "a level";
  }

  function bellSeen() {
    const s = save_.data.bellSeen;
    return s && typeof s === "object" ? s : {};
  }

  function bellUnread() {
    const seen = bellSeen();
    return bellEvents.filter(function (ev) {
      if (ev.kind === "comment") return (seen["c:" + ev.levelId] || 0) < ev.ts;
      if (ev.kind === "crown") return seen["b:" + ev.file] !== ev.holder + ev.time;
      if (ev.kind === "follow") return (seen["f:" + ev.authorUid] || 0) < ev.ts;
      if (ev.kind === "invite") return (seen["i:" + ev.fromUid] || 0) < ev.ts;
      if (ev.kind === "gift") {
        try {
          if (save_.data.claimedGifts && save_.data.claimedGifts[ev.id]) return false;
        } catch (e) {}
        return (seen["gift:" + ev.id] || 0) < ev.ts;
      }
      return false;
    }).length;
  }

  function syncBellUI() {
    const b = el("bellCount");
    if (!b) return;
    const n = bellUnread();
    b.textContent = n > 9 ? "9+" : String(n);
    b.classList.toggle("hidden", n <= 0);
  }

  async function checkBell() {
    if (bellChecking) return;
    let me = null;
    try {
      me = (NET.getEffectiveUser && NET.getEffectiveUser()) || (NET.getUser && NET.getUser());
    } catch (e) {}
    if (!me) return;
    bellChecking = true;
    try {
      const events = [];
      try {
        await ensureIndexes();
      } catch (e) {}
      const mine = (levelIndexCache || []).filter((l) => l.authorUid === me.uid).slice(0, 10);
      for (const m of mine) {
        let list = [];
        try {
          list = await NET.getComments(m.id);
        } catch (e) {}
        list
          .filter((c) => c.uid !== me.uid)
          .slice(0, 3)
          .forEach((c) =>
            events.push({
              kind: "comment",
              ts: c.ts || 0,
              levelId: m.id,
              text: c.name + " commented on " + (m.title || "your level") + ": " + String(c.text || "").slice(0, 60),
            })
          );
      }
      const bests = save_.data.best || {};
      const files = Object.keys(bests).slice(0, 10);
      for (const f of files) {
        let lb = [];
        try {
          lb = await NET.getLeaderboard(f, 3);
        } catch (e) {}
        if (lb.length && lb[0].uid !== me.uid && lb[0].time < bests[f]) {
          events.push({
            kind: "crown",
            ts: Date.now(),
            file: f,
            holder: lb[0].uid,
            time: lb[0].time,
            text: lb[0].name + " beat your best on " + levelNameOf(f) + "!",
          });
        }
      }
      try { await refreshFollows(); } catch (e) {}
      const follows = followMap();
      const followIds = Object.keys(follows);
      if (followIds.length) {
        const levels = levelIndexCache || [];
        followIds.forEach(function (uid) {
          const info = follows[uid] && typeof follows[uid] === "object" ? follows[uid] : {};
          const theirs = levels.filter(function (l) { return l.authorUid === uid; });
          theirs.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
          theirs.slice(0, 3).forEach(function (m) {
            events.push({
              kind: "follow",
              ts: m.createdAt || 0,
              authorUid: uid,
              levelId: m.id,
              title: m.title || "Untitled",
              text: (m.authorName || info.name || "player") + " posted a new level: " + (m.title || "Untitled"),
            });
          });
        });
      }
      try {
        const invites = await NET.listInvites();
        invites.forEach(function (inv) {
          events.push({
            kind: "invite",
            ts: inv.ts || 0,
            fromUid: inv.fromUid,
            fromName: inv.fromName,
            code: inv.code,
            text: (inv.fromName || "player") + " invited you to room " + inv.code,
          });
          try { showInviteToast(inv); } catch (e) {}
        });
      } catch (e) {}
      try {
        if (NET.listGifts) {
          const gifts = await NET.listGifts();
          gifts.forEach(function (g) {
            events.push({
              kind: "gift",
              ts: g.ts || 0,
              id: g.id,
              fromUid: g.fromUid,
              fromName: g.fromName,
              amount: g.amount,
              text: (g.fromName || "player") + " sent you " + fmtCoins(g.amount) + " coins",
            });
          });
        }
      } catch (e) {}
      events.sort((a, b) => b.ts - a.ts);
      bellEvents = events.slice(0, 20);
      syncBellUI();
    } finally {
      bellChecking = false;
    }
    startInviteWatch();
  }

  let inviteWatchOn = false;
  let inviteBaselineTs = 0;
  let inviteBaselined = false;
  // Realtime invites: bell only polled at boot before, so invites arriving
  // later were invisible. The listener pushes a notice the moment one lands.
  function startInviteWatch() {
    try {
      if (inviteWatchOn) return;
      const NET = window.DPNet;
      if (!NET || !NET.onInvites) return;
      const attached = NET.onInvites(function (list) {
        try {
          list = Array.isArray(list) ? list : [];
          let maxTs = inviteBaselineTs;
          const fresh = [];
          for (const inv of list) {
            const ts = (inv && inv.ts) || 0;
            if (ts > maxTs) maxTs = ts;
            if (ts > inviteBaselineTs) fresh.push(inv);
          }
          const first = !inviteBaselined;
          inviteBaselined = true;
          inviteBaselineTs = maxTs;
          const toShow = first ? list : fresh;
          toShow.forEach(function (inv) { try { showInviteToast(inv); } catch (e) {} });
          checkBell().then(function () {
            try {
              if (el("modalBell") && el("modalBell").classList.contains("visible")) renderBell();
            } catch (e) {}
          }).catch(function () {});
        } catch (e) {}
      });
      if (attached) inviteWatchOn = true;
    } catch (e) {}
  }

  function renderBell() {
    const box = el("bellList");
    if (!box) return;
    box.innerHTML = "";
    if (!bellEvents.length) {
      box.innerHTML = '<p class="loading-note">All caught up! Nothing new.</p>';
      return;
    }
    const seen = bellSeen();
    bellEvents.forEach((ev) => {
      const row = document.createElement("div");
      row.className = "bell-row";
      if (ev.kind === "follow" || ev.kind === "invite" || ev.kind === "gift") {
        row.classList.add("bell-act");
        const msg = document.createElement("span");
        msg.textContent = ev.text;
        const go = document.createElement("span");
        go.className = "bell-go";
        go.textContent = ev.kind === "invite" ? "JOIN" : ev.kind === "gift" ? "CLAIM" : "VIEW";
        row.appendChild(msg);
        row.appendChild(go);
        if (ev.kind === "follow") {
          row.addEventListener("click", function () {
            closeModal("modalBell");
            const meta = (levelIndexCache || []).find(function (l) { return l.id === ev.levelId; });
            if (meta) openLevelInfo({ id: meta.id, meta: meta });
            else if (ev.authorUid) openAccount(ev.authorUid);
          });
          seen["f:" + ev.authorUid] = Math.max(seen["f:" + ev.authorUid] || 0, ev.ts);
        } else if (ev.kind === "gift") {
          row.addEventListener("click", async function () {
            var claimed = {};
            try { claimed = save_.data.claimedGifts && typeof save_.data.claimedGifts === "object" ? save_.data.claimedGifts : {}; } catch (e) { claimed = {}; }
            if (claimed[ev.id]) { showNotice("Already claimed", false); return; }
            showNotice("Claiming gift…", false);
            try {
              var g = await NET.claimGift(ev.id);
              var amt = 0n;
              try { amt = BigInt(String((g && g.amount) || "0")); } catch (e) { amt = 0n; }
              if (amt <= 0n) throw new Error("Gift is empty.");
              addCoins(amt);
              claimed[ev.id] = true;
              save_.data.claimedGifts = claimed;
              save();
              syncCoinUI();
              syncHomeStats();
              showNotice("Claimed " + fmtCoins(amt) + " from " + (ev.fromName || "player") + "!", false);
              checkBell().then(function () { try { renderBell(); } catch (e) {} }).catch(function () {});
            } catch (err) {
              showNotice(String((err && err.message) || err), true);
            }
          });
          seen["gift:" + ev.id] = Math.max(seen["gift:" + ev.id] || 0, ev.ts);
        } else {
          row.addEventListener("click", async function () {
            closeModal("modalBell");
            await acceptInvite(ev);
          });
          seen["i:" + ev.fromUid] = Math.max(seen["i:" + ev.fromUid] || 0, ev.ts);
        }
      } else {
        row.textContent = ev.text;
      }
      box.appendChild(row);
      if (ev.kind === "comment") seen["c:" + ev.levelId] = Math.max(seen["c:" + ev.levelId] || 0, ev.ts);
      if (ev.kind === "crown") seen["b:" + ev.file] = ev.holder + ev.time;
    });
    save_.data.bellSeen = seen;
    save();
    syncBellUI();
  }

  // ---- Profile social links (usernames; links build themselves) ----
  const SOCIALS = [
    { id: "discord", label: "Discord", icon: "assets/social/social-discord.png", url: null },
    { id: "youtube", label: "YouTube", icon: "assets/social/social-youtube.png", url: function (h) { return "https://youtube.com/@" + h; } },
    { id: "twitch", label: "Twitch", icon: "assets/social/social-twitch.png", url: function (h) { return "https://twitch.tv/" + h; } },
    { id: "x", label: "X", icon: "assets/social/social-x.png", url: function (h) { return "https://x.com/" + h; } },
    { id: "tiktok", label: "TikTok", icon: "assets/social/social-tiktok.png", url: function (h) { return "https://tiktok.com/@" + h; } },
    { id: "instagram", label: "Instagram", icon: "assets/social/social-instagram.png", url: function (h) { return "https://instagram.com/" + h; } },
  ];
  function cleanSocialHandle(v) {
    return String(v || "").trim().replace(/^@+/, "").replace(/\s+/g, "").slice(0, 32);
  }
  function cleanCustomUrl(v) {
    var s = String(v || "").trim().replace(/\s+/g, "");
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/+$/, "");
    return s.slice(0, 128);
  }
  function customUrlDomain(url) {
    var s = cleanCustomUrl(url).split("/")[0].split(":")[0].toLowerCase();
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) ? s : "";
  }
  function faviconUrl(url) {
    var d = customUrlDomain(url);
    return d ? "https://" + d + "/favicon.ico" : "";
  }
  function linkHref(url) {
    var s = cleanCustomUrl(url);
    if (!s) return "";
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(String(url || "")) ? String(url).trim() : "https://" + s;
  }
  // up to 5 custom sites; reads the array form, falls back to the legacy
  // single socialLink.url saved by older versions
  function customLinkList(u) {
    try {
      if (u && Array.isArray(u.socialLinks)) {
        return u.socialLinks.map(function (v) { return cleanCustomUrl(v); }).filter(function (v, i, a) { return !!v && a.indexOf(v) === i; }).slice(0, 5);
      }
      var one = cleanCustomUrl(u && u.socialLink && u.socialLink.url);
      return one ? [one] : [];
    } catch (e) { return []; }
  }
  function socialUrl(def, handle) {
    try {
      if (!def || !def.url || !handle) return "";
      return def.url(encodeURIComponent(handle));
    } catch (e) { return ""; }
  }
  let socialsLoadedFor = "";
  function renderSocialInputs() {
    const box = el("profSocials");
    if (!box || box.dataset.done) return;
    box.dataset.done = "1";
    SOCIALS.forEach(function (s) {
      const row = document.createElement("div");
      row.className = "row-gap";
      row.style.alignItems = "center";
      const img = document.createElement("img");
      img.src = s.icon;
      img.alt = s.label;
      img.style.width = "24px";
      img.style.height = "24px";
      img.style.imageRendering = "pixelated";
      const inp = document.createElement("input");
      inp.className = "px-input";
      inp.id = "soc-" + s.id;
      inp.maxLength = 32;
      inp.placeholder = s.label + " username";
      inp.style.flex = "1";
      row.appendChild(img);
      row.appendChild(inp);
      box.appendChild(row);
    });
    for (var ci = 0; ci < 5; ci++) {
      (function (idx) {
        var crow = document.createElement("div");
        crow.className = "row-gap";
        crow.style.alignItems = "center";
        var cimg = document.createElement("img");
        cimg.src = "assets/social/social-globe.png";
        cimg.alt = "Website";
        cimg.style.width = "24px";
        cimg.style.height = "24px";
        cimg.style.imageRendering = "pixelated";
        var cinp = document.createElement("input");
        cinp.className = "px-input";
        cinp.id = "soc-custom-" + idx;
        cinp.maxLength = 128;
        cinp.placeholder = "website " + (idx + 1) + " (optional)";
        cinp.style.flex = "1";
        crow.appendChild(cimg);
        crow.appendChild(cinp);
        box.appendChild(crow);
      })(ci);
    }
  }
  function prefillSocials() {
    try {
      renderSocialInputs();
      const me = MP.getUser && MP.getUser();
      if (!me || me.guest || !window.DPNet || !DPNet.getUserProfile) return;
      if (socialsLoadedFor === me.uid) return;
      socialsLoadedFor = me.uid;
      DPNet.getUserProfile(me.uid).then(function (p) {
        try {
          const cur = (p && p.socials) || (me && me.socials) || {};
          SOCIALS.forEach(function (s) {
            const inp = el("soc-" + s.id);
            if (inp && !inp.value && cur[s.id]) inp.value = String(cur[s.id]).slice(0, 32);
          });
          var curl = customLinkList(p);
          if (!curl.length) {
            try {
              var me2 = (MP.getUser && MP.getUser()) || null;
              curl = customLinkList(me2);
            } catch (e) {}
          }
          for (var qi = 0; qi < 5; qi++) {
            const cinp = el("soc-custom-" + qi);
            if (cinp && !cinp.value && curl[qi]) cinp.value = curl[qi];
          }
        } catch (e) {}
      }).catch(function () {});
    } catch (e) {}
  }
  function renderAcctSocials(u) {
    try {
      const box = el("acctSocials");
      if (!box) return;
      box.innerHTML = "";
      const cur = (u && u.socials) || {};
      let n = 0;
      SOCIALS.forEach(function (s) {
        const h = cleanSocialHandle(cur[s.id]);
        if (!h) return;
        n++;
        const url = socialUrl(s, h);
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener";
          a.title = s.label + ": " + h;
          const img = document.createElement("img");
          img.src = s.icon;
          img.alt = s.label;
          img.style.width = "28px";
          img.style.height = "28px";
          img.style.imageRendering = "pixelated";
          a.appendChild(img);
          box.appendChild(a);
        } else {
          const chip = document.createElement("button");
          chip.className = "px-btn tiny";
          chip.title = "Tap to copy";
          chip.innerHTML = '<img src="' + s.icon + '" alt="" style="width:16px;height:16px;image-rendering:pixelated;vertical-align:middle" /> ' + escapeHtml(h);
          chip.addEventListener("click", function (ev) {
            ev.stopPropagation();
            try {
              if (navigator.clipboard) navigator.clipboard.writeText(h).catch(function () {});
              showNotice("Copied " + h, false);
            } catch (e) {}
          });
          box.appendChild(chip);
        }
      });
      box.style.display = n ? "" : "none";
      try {
        const curls = customLinkList(u);
        for (const curl of curls) {
          n++;
          const fav = faviconUrl(curl);
          const href = linkHref(curl);
          const a = document.createElement("a");
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener";
          a.title = curl;
          const fimg = document.createElement("img");
          // pixel filter: site favicon rendered chunky; gray globe if missing
          fimg.src = fav || "assets/social/social-globe.png";
          fimg.alt = "website";
          fimg.style.width = "28px";
          fimg.style.height = "28px";
          fimg.style.imageRendering = "pixelated";
          fimg.onerror = function () {
            try { fimg.onerror = null; fimg.src = "assets/social/social-globe.png"; } catch (e) {}
          };
          a.appendChild(fimg);
          box.appendChild(a);
          box.style.display = "";
        }
      } catch (e) {}
    } catch (e) {}
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
    accountView = { uid: uid, name: u.name || "player" };
    el("acctTitle").innerHTML = taggedNameHtml(String(u.name || "player").toUpperCase(), u.tag || tagIdForUid(u.uid), "", u.nameColor || nameColorForUid(u.uid)) + (u.beatenCount != null ? " " + rankChipHtml(rankForClears(u.beatenCount).rank) : "");
    el("acctMade").textContent = theirs.length;
    el("acctBeaten").textContent = u.beatenCount || 0;
    el("acctDeaths").textContent = u.deaths || 0;
    try {
      var bb = el("acctBio");
      var bioTxt = String((u && u.bio) || "").slice(0, 140);
      if (bb) {
        if (bioTxt) { bb.textContent = bioTxt; bb.style.display = ""; }
        else { bb.textContent = ""; bb.style.display = "none"; }
      }
    } catch (e) {}
    renderAcctSocials(u);
    syncAcctActions();
    refreshFollows().then(syncAcctActions).catch(function () {});
    try {
      var gr = el("giftRow");
      if (gr) gr.style.display = "none";
      giftArm = 0;
    } catch (e) {}
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
        '<div class="n-sub">by ' + taggedNameHtml(sv.meta.authorName || "?", tagIdForUid(sv.meta.authorUid), "", nameColorForUid(sv.meta.authorUid)) + " · offline ready</div></span>";
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
  let commentLevelId = "";

  function openLevelInfo(sv) {
    levelInfoMeta = sv;
    const key = "net:" + (sv.id || sv.meta.id);
    const meta = sv.meta;    el("liName").textContent = meta.title || "Untitled";
    el("liDiff").innerHTML = diffFaceImg(netDiff(meta));
    el("liAuthor").innerHTML = taggedNameHtml(meta.authorName || "—", tagIdForUid(meta.authorUid), "", nameColorForUid(meta.authorUid));
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
    commentLevelId = sv.id || (sv.meta && sv.meta.id) || "";
    renderComments();
    renderLike();
    el("modalLevelInfo").classList.add("visible");
  }

  function timeAgo(ts) {
    const s = Math.max(0, Math.floor((Date.now() - (ts || 0)) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  async function renderComments() {
    const box = el("liComments");
    if (!box) return;
    if (!commentLevelId) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = '<p class="loading-note">Loading comments…</p>';
    let list = [];
    try {
      list = await NET.getComments(commentLevelId);
    } catch (e) {
      list = [];
    }
    if (commentLevelId !== (levelInfoMeta && (levelInfoMeta.id || (levelInfoMeta.meta && levelInfoMeta.meta.id)))) return;
    box.innerHTML = "";
    const shown = list.filter((c) => (c.flags | 0) < 3);
    if (!shown.length) {
      box.innerHTML = '<p class="loading-note">No comments yet. Be nice!</p>';
      return;
    }
    let me = null;
    try { me = (NET.getEffectiveUser && NET.getEffectiveUser()) || (NET.getUser && NET.getUser()); } catch (e) {}
    const admin = !!(NET.isAdmin && NET.isAdmin());
    shown.forEach((c) => {
      const row = document.createElement("div");
      row.className = "comment-row";
      const head = document.createElement("div");
      head.className = "comment-head";
      head.innerHTML = taggedNameHtml(c.name || "player", tagIdForUid(c.uid), "", nameColorForUid(c.uid)) +
        '<span class="comment-time">' + escapeHtml(timeAgo(c.ts)) + "</span>";
      const body = document.createElement("div");
      body.className = "comment-body";
      body.textContent = c.text || "";
      row.appendChild(head);
      row.appendChild(body);
      const acts = document.createElement("div");
      acts.className = "comment-acts";
      if ((me && me.uid && me.uid === c.uid) || admin) {
        const del = document.createElement("button");
        del.className = "px-btn tiny danger";
        del.textContent = "DELETE";
        del.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          if (!confirm("Delete this comment?")) return;
          try {
            await NET.deleteComment(commentLevelId, c.id, c.uid);
            renderComments();
          } catch (err) {
            showNotice(NET.friendly(err), true);
          }
        });
        acts.appendChild(del);
      } else if (me) {
        const rep = document.createElement("button");
        rep.className = "px-btn tiny";
        rep.textContent = "REPORT";
        rep.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          try {
            await NET.reportComment(commentLevelId, c.id);
            showNotice("Reported. Thanks!", false);
            renderComments();
          } catch (err) {
            showNotice(NET.friendly(err), true);
          }
        });
        acts.appendChild(rep);
      }
      if (acts.children.length) row.appendChild(acts);
      box.appendChild(row);
    });
  }

  /* ---------------- LEVEL LIKES ---------------- */
  let likeState = { id: "", liked: false, count: 0 };

  function paintLike() {
    const btn = el("btnLiLike");
    const img = el("liLikeImg");
    const n = el("liLikeCount");
    if (!btn || !img || !n) return;
    img.src = "assets/ui/heart-full.png";
    n.textContent = likeState.count;
    btn.classList.toggle("liked", !!likeState.liked);
  }

  async function toggleLike(id) {
    const me = (NET.getEffectiveUser && NET.getEffectiveUser()) || (NET.getUser && NET.getUser());
    if (!me) {
      showNotice("Log in to like levels.", true);
      return null;
    }
    const cur = likeState.id === id ? likeState.liked : false;
    const n = await NET.setLike(id, !cur);
    likeState = { id: id, liked: !cur, count: n | 0 };
    try {
      const hit = (levelIndexCache || []).find(function (l) { return l.id === id; });
      if (hit) hit.likes = n | 0;
    } catch (e) {}
    return likeState;
  }

  async function renderLike() {
    const id = commentLevelId;
    if (!id || !el("btnLiLike")) return;
    const meta = levelInfoMeta && levelInfoMeta.meta;
    likeState = { id: id, liked: false, count: (meta && meta.likes) | 0 };
    paintLike();
    try {
      const liked = await NET.hasLiked(id);
      if (likeState.id !== id) return;
      likeState.liked = !!liked;
      paintLike();
    } catch (e) {}
  }

  async function postLevelComment() {
    const inp = el("liCommentInput");
    const text = inp ? inp.value : "";
    if (!commentLevelId) return;
    try {
      await NET.postComment(commentLevelId, text);
      if (inp) inp.value = "";
      renderComments();
    } catch (err) {
      showNotice(NET.friendly(err), true);
    }
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
      chip.innerHTML = "by " + taggedNameHtml(m.authorName, tagIdForUid(m.authorUid), "", nameColorForUid(m.authorUid));
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
    el("btnNetBackBoards").addEventListener("click", () => show("network"));
    el("netBoards").addEventListener("click", () => {
      showPanel("boards");
      renderBoards();
    });
    document.querySelectorAll("#screen-netboards .chip[data-board]").forEach((b) => {
      b.addEventListener("click", () => {
        boardCat = b.dataset.board;
        renderBoards();
      });
    });
    el("btnBell").addEventListener("click", () => {
      openModal("modalBell");
      renderBell();
      checkBell().then(renderBell).catch(() => {});
    });
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
    if (el("btnAcctFollow")) el("btnAcctFollow").addEventListener("click", function (ev) {
      ev.stopPropagation();
      toggleFollow();
    });
    if (el("btnAcctInvite")) el("btnAcctInvite").addEventListener("click", function (ev) {
      ev.stopPropagation();
      inviteFromProfile();
    });
    if (el("btnAcctGift")) el("btnAcctGift").addEventListener("click", function (ev) {
      ev.stopPropagation();
      giftFromProfile();
    });
    if (el("btnGiftSend")) el("btnGiftSend").addEventListener("click", function (ev) {
      ev.stopPropagation();
      sendGiftConfirm();
    });
    if (el("btnGiftCancel")) el("btnGiftCancel").addEventListener("click", function (ev) {
      ev.stopPropagation();
      var row = el("giftRow");
      if (row) row.style.display = "none";
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
    if (document.querySelector(".modal-root.visible")) return;
    if (ev.code === "KeyT" && state.screen === "game" && !el("winCard").classList.contains("visible")) { ev.preventDefault(); startGhostRace(); return; }
    if (ev.code === "KeyX" && !ev.repeat && state.screen === "game" && state.playing && state.practice && !state.paused && !el("winCard").classList.contains("visible")) { ev.preventDefault(); placePracticeCheckpoint(); return; }
    if (ev.code === "Space") ev.preventDefault();
    if (state.screen === "game" && ev.code === "KeyR") {
      ev.preventDefault();
      restartToCheckpoint();
    }
  }

  function onKeyUp(ev) {
    state.keys.delete(ev.code);
  }

  function boot() {
    document.addEventListener("click", function () { closeAllOpts(); });
    bindNetworkUI();
    bindTouchBtn("touchLeft", "left");
    bindTouchBtn("touchRight", "right");
    bindTouchBtn("touchJump", "jump");
    bindPinchZoom();
    bindJoystick();
    document.querySelectorAll(".ctl-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        save_.data.touchMode = b.getAttribute("data-ctl") === "joystick" ? "joystick" : "buttons";
        save();
        clearTouch();
        syncCtlUI();
      });
    });
    syncCtlUI();
    if ((window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || ("ontouchstart" in window)) {
      document.body.classList.add("touch");
    }
    window.addEventListener("touchstart", function () {
      document.body.classList.add("touch");
    }, { passive: true });
    el("btnPlay").addEventListener("click", () => show("levels"));
    el("btnSkinsHome").addEventListener("click", () => openModal("modalSkins"));
    const btnDownloadHome = el("btnDownloadHome");
    if (btnDownloadHome) btnDownloadHome.addEventListener("click", () => openModal("modalDownload"));
    el("btnOpenShop").addEventListener("click", () => openModal("modalShop"));
    (function initPainter() {
      var pal = el("paintPalette");
      if (pal && !pal.dataset.done) {
        pal.dataset.done = "1";
        PAINT_SWATCHES.forEach(function (c) {
          var s = document.createElement("button");
          s.className = "px-btn tiny";
          s.style.background = c;
          s.style.minWidth = "28px";
          s.textContent = " ";
          s.setAttribute("aria-label", "color " + c);
          s.addEventListener("click", function () {
            paintColor = c;
            var inp = el("paintColor");
            if (inp) inp.value = c;
          });
          pal.appendChild(s);
        });
      }
      var cv = el("paintGrid");
      if (cv && !cv.dataset.done) {
        cv.dataset.done = "1";
        cv.addEventListener("pointerdown", function (ev) {
          ev.preventDefault();
          var cell = paintCellFromEvent(ev);
          if (!cell) return;
          paintPushUndo();
          paintPainting = true;
          paintApply(cell.x, cell.y);
          paintRender();
          try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
        });
        cv.addEventListener("pointermove", function (ev) {
          if (!paintPainting || paintTool === "fill" || paintTool === "picker") return;
          ev.preventDefault();
          var cell = paintCellFromEvent(ev);
          if (!cell) return;
          paintApply(cell.x, cell.y);
          paintRender();
        });
        const endStroke = function () { paintPainting = false; };
        cv.addEventListener("pointerup", endStroke);
        cv.addEventListener("pointercancel", endStroke);
        cv.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
      }
      var tools = document.querySelectorAll("[data-ptool]");
      for (var i = 0; i < tools.length; i++) {
        (function (btn) {
          if (btn.dataset.done) return;
          btn.dataset.done = "1";
          btn.addEventListener("click", function () {
            paintTool = btn.getAttribute("data-ptool");
            paintSyncTools();
          });
        })(tools[i]);
      }
      var ci = el("paintColor");
      if (ci && !ci.dataset.done) {
        ci.dataset.done = "1";
        ci.addEventListener("input", function () { paintColor = ci.value || paintColor; });
      }
      var mb = el("btnPaintMirror");
      if (mb && !mb.dataset.done) {
        mb.dataset.done = "1";
        mb.addEventListener("click", function () { paintMirror = !paintMirror; paintSyncTools(); });
      }
      var ub = el("btnPaintUndo");
      if (ub && !ub.dataset.done) {
        ub.dataset.done = "1";
        ub.addEventListener("click", function () {
          try {
            var prev = paintUndo.pop();
            if (prev) paintGrid = JSON.parse(prev);
            paintRender();
          } catch (e) {}
        });
      }
      var cb = el("btnPaintClear");
      if (cb && !cb.dataset.done) {
        cb.dataset.done = "1";
        cb.addEventListener("click", function () { paintPushUndo(); paintBlank(); paintRender(); });
      }
      var sb = el("btnPaintSave");
      if (sb && !sb.dataset.done) {
        sb.dataset.done = "1";
        sb.addEventListener("click", paintSave);
      }
    })();
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
    el("btnRestart").addEventListener("click", restartToCheckpoint);
    el("btnQuit").addEventListener("click", togglePause);
    el("btnPauseResume").addEventListener("click", resumeGame);
    el("btnPauseRestart").addEventListener("click", () => { resumeGame(); restartLevel(); });
    el("btnPausePractice").addEventListener("click", togglePractice);
    el("btnPauseSlow").addEventListener("click", toggleSlowmo);
    el("btnPauseHeat").addEventListener("click", toggleHeat);
    el("hudPractice").addEventListener("click", () => {
      if (state.practice && state.playing && !state.paused) placePracticeCheckpoint();
    });
    el("btnPauseSettings").addEventListener("click", () => openModal("modalSettings"));
    el("btnPauseQuit").addEventListener("click", quitToLevels);
    el("btnLiPlay").addEventListener("click", liPlay);
    el("btnLiComment").addEventListener("click", postLevelComment);
    el("btnLiLike").addEventListener("click", async function () {
      if (!likeState.id) return;
      try {
        const st = await toggleLike(likeState.id);
        if (st) paintLike();
      } catch (err) {
        showNotice(NET.friendly(err), true);
      }
    });
    el("liCommentInput").addEventListener("keydown", function (ev) {
      ev.stopPropagation();
      if (ev.code === "Enter" || ev.key === "Enter") {
        ev.preventDefault();
        postLevelComment();
      }
    });
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
    el("btnWinEdit").addEventListener("click", tuffBuildEdit);
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
    el("setHaptics").addEventListener("change", (ev) => {
      save_.data.haptics = ev.target.checked;
      save();
      if (ev.target.checked) haptic("tick");
    });
    el("setGhostOp").addEventListener("input", (ev) => {
      save_.data.ghostOpacity = clampGhostOpacity(ev.target.value);
      save();
      syncGhostOpUI();
    });
    el("setBlur").addEventListener("input", (ev) => {
      var v = Number(ev.target.value);
      save_.data.blur = isFinite(v) ? Math.max(0, Math.min(24, v)) : 12;
      save();
      applyBlur();
    });
    document.querySelectorAll(".gfx-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        const next = b.getAttribute("data-gfx");
        if ((next === "drawing" || next === "neon") && !ownsPack(next)) {
          showNotice("Unlock " + next + " in the SHOP first", true);
          return;
        }
        save_.data.graphics = next === "good" || next === "simple" || next === "dlls5" || next === "ultra" || next === "drawing" || next === "neon" ? next : "normal";
        save();
        applyGraphics();
        syncGfxUI();
      });
    });
    el("btnAdvFx").addEventListener("click", () => {
      const box = el("advFx");
      const open = box.style.display !== "none";
      box.style.display = open ? "none" : "";
      el("btnAdvFx").innerHTML = open ? "ADVANCED &#9656;" : "ADVANCED &#9662;";
    });
    [["setFxShadows", "fxShadows"], ["setFxFlashes", "fxFlashes"], ["setFxParticles", "fxParticles"]].forEach(function (pair) {
      el(pair[0]).addEventListener("change", (ev) => {
        save_.data[pair[1]] = ev.target.checked;
        save();
      });
    });
    [["tcSize", "size", "tcSizeVal"], ["tcLx", "lx", "tcLxVal"], ["tcLy", "ly", "tcLyVal"], ["tcRx", "rx", "tcRxVal"], ["tcRy", "ry", "tcRyVal"]].forEach(function (tri) {
      el(tri[0]).addEventListener("input", (ev) => {
        save_.data.touchUI = save_.data.touchUI || {};
        save_.data.touchUI[tri[1]] = Number(ev.target.value) || 0;
        save();
        applyTouchUI();
        syncTouchUI();
      });
    });
    el("btnTouchReset").addEventListener("click", () => {
      save_.data.touchUI = touchUIDefaults();
      save();
      applyTouchUI();
      syncTouchUI();
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
    if (pb) pb.addEventListener("click", () => { openModal("modalProfile"); renderFriendList(); prefillSocials(); });

    function profileMsg(t) { var m = el("profMsg"); if (m) m.textContent = t || ""; }

    el("btnProfLogin").addEventListener("click", () => {
      profileMsg("");
      MP.login(el("profEmail").value.trim(), el("profPass").value)
        .then(() => { profileMsg(""); syncAccountUI(); syncMpUI(); startInviteWatch(); checkBell().catch(() => {}); })
        .catch((e) => profileMsg(friendlyAuthError(e)));
    });
    el("btnProfRegister").addEventListener("click", () => {
      profileMsg("");
      MP.register(el("profEmail").value.trim(), el("profPass").value)
        .then(() => { profileMsg(""); syncAccountUI(); syncMpUI(); startInviteWatch(); checkBell().catch(() => {}); })
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
            startInviteWatch();
            checkBell().catch(() => {});
          })
          .catch((e) => profileMsg(friendlyAuthError(e, "guest")));
      });
    }
    el("btnProfLogout").addEventListener("click", async () => {
      if (MP.isActive()) await MP.leave(false);
      inviteWatchOn = false;
      inviteBaselineTs = 0;
      inviteBaselined = false;
      try { if (window.DPNet && window.DPNet.offInvites) window.DPNet.offInvites(); } catch (e) {}
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

    el("btnProfBio").addEventListener("click", async () => {
      try {
        const bio = await NET.updateBio(el("profBio").value);
        el("profBio").value = bio;
        profileMsg(bio ? "Bio saved" : "Bio cleared");
      } catch (e) { profileMsg(e.message || String(e)); }
    });

    el("btnProfSocials").addEventListener("click", async () => {
      try {
        const obj = {};
        SOCIALS.forEach(function (s) {
          const inp = el("soc-" + s.id);
          obj[s.id] = cleanSocialHandle(inp ? inp.value : "");
        });
        const customs = [];
        for (var qi = 0; qi < 5; qi++) {
          const cinp = el("soc-custom-" + qi);
          const c = cleanCustomUrl(cinp ? cinp.value : "");
          if (c && customs.indexOf(c) === -1) customs.push(c);
        }
        obj.custom = customs;
        await NET.updateSocials(obj);
        profileMsg("Socials saved");
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
      presenceTick();
    });
    el("btnProfJoin").addEventListener("click", async () => {
      try { await MP.join(el("profCode").value.trim().toUpperCase()); showNotice("Joined " + MP.peerName() + "'s room", false); }
      catch (e) { showNotice(String(e.message || e), true); }
      syncMpUI();
      presenceTick();
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
      presenceTick();
    });
    el("btnProfStats").addEventListener("click", () => openModal("modalStats"));

    el("btnProfSync").addEventListener("click", async () => {
      const cu = (typeof firebase !== 'undefined' && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
      const u = (NET.getUser && NET.getUser()) || (MP.getUser && MP.getUser()) || (cu ? {uid: cu.uid} : null);
      if (!u) { profileMsg("Not logged in"); return; }
      const st = el("profCloudStatus"); if (st) st.textContent = "Uploading…";
      try {
        const saved = await NET.syncCloud({ deaths: save_.data.deaths, jumps: save_.data.jumps, playtime: Number(save_.data.playtime) || 0, coins: save_.data.coins, coinPaid: save_.data.coinPaid, coinMigrated: !!save_.data.coinMigrated, codes: save_.data.codes, skin: save_.data.skin, unlocked: save_.data.unlocked, beaten: save_.data.beaten, best: save_.data.best, secretA: !!save_.data.secretA, spaceMenu: !!save_.data.spaceMenu, tags: save_.data.tags, tag: save_.data.tag, nameColors: save_.data.nameColors, nameColor: save_.data.nameColor, frames: save_.data.frames, frame: save_.data.frame, trails: save_.data.trails, trail: save_.data.trail, chestFree: save_.data.chestFree, championKeys: save_.data.championKeys });
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
        if (Array.isArray(cloud.nameColors)) {
          const cs = {};
          (save_.data.nameColors || []).forEach(function (id) { cs[id] = true; });
          cloud.nameColors.forEach(function (id) { if (findShopColor(id)) cs[id] = true; });
          save_.data.nameColors = Object.keys(cs);
        }
        if (cloud.nameColor && !save_.data.nameColor && findShopColor(cloud.nameColor) && ownsNameColor(cloud.nameColor)) save_.data.nameColor = cloud.nameColor;
        if (Array.isArray(cloud.frames)) {
          const fs = {};
          (save_.data.frames || []).forEach(function (id) { fs[id] = true; });
          cloud.frames.forEach(function (id) { if (findShopFrame(id)) fs[id] = true; });
          save_.data.frames = Object.keys(fs);
        }
        if (cloud.frame && !save_.data.frame && findShopFrame(cloud.frame) && ownsFrame(cloud.frame)) save_.data.frame = cloud.frame;
        if (Array.isArray(cloud.trails)) {
          const tr = {};
          (save_.data.trails || []).forEach(function (id) { tr[id] = true; });
          cloud.trails.forEach(function (id) { if (findShopTrail(id)) tr[id] = true; });
          save_.data.trails = Object.keys(tr);
        }
        if (cloud.trail && !save_.data.trail && findShopTrail(cloud.trail) && ownsTrail(cloud.trail)) save_.data.trail = cloud.trail;
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
    window.addEventListener("blur", () => { state.keys.clear(); clearTouch(); });
    window.addEventListener(
      "wheel",
      (ev) => {
        if (state.screen !== "game") return;
        ev.preventDefault();
        if (gfxMode() === "good" || gfxMode() === "ultra") {
          const step = ev.deltaY > 0 ? -1 : 1;
          cam.zoom = clampZoom(cam.zoom + step);
        } else {
          const step = ev.deltaY > 0 ? -0.25 : 0.25;
          cam.zoom = clampZoom(cam.zoom + step);
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
        ensureCustomSkin();
        loadPetImages();
        loadCustomBg();
        applyBlur();
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
    applyTouchUI();
    syncNewVerDot();
    syncHomeStats();
    syncCoinUI();
    syncFpsVis();
    show("home");
    requestAnimationFrame(frame);
    setTimeout(function () { try { checkBell(); } catch (e) {} }, 12000);
    // Presence heartbeat: refresh what-I'm-playing every minute so friends
    // see accurate activity (joins/leaves/levels also tick it immediately).
    setInterval(function () { try { presenceTick(); } catch (e) {} }, 60000);
    // Bell polling fallback: invites arriving after boot were invisible until
    // the bell was opened manually. The realtime listener above covers it;
    // this catches anything it misses (dropped socket, late login, etc.).
    setInterval(function () {
      try {
        checkBell().then(function () {
          try {
            if (el("modalBell") && el("modalBell").classList.contains("visible")) renderBell();
          } catch (e) {}
        }).catch(function () {});
      } catch (e) {}
    }, 45000);
    try {
      if ("serviceWorker" in navigator && (/^https:$/.test(window.location.protocol) || /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("sw.js").catch(function () {});
        });
      }
    } catch (e) {}

    // ---- PWA install: home DOWNLOAD + Settings INSTALL APP (phone and PC) ----
    var deferredInstallPrompt = null;
    function isMobileDevice() {
      try {
        if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
      } catch (e) {}
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    }
    function isIosDevice() {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
        (/Macintosh/i.test(navigator.userAgent || "") && navigator.maxTouchPoints > 1);
    }
    function isAppInstalled() {
      try {
        if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      } catch (e) {}
      return !!window.navigator.standalone;
    }
    function installHelpText() {
      if (isAppInstalled()) return "Installed — launch DashPoint from your home screen or apps list.";
      if (isIosDevice()) return "On iPhone/iPad: tap Share, then Add to Home Screen.";
      if (deferredInstallPrompt) return "Tap INSTALL APP to add DashPoint to your phone or PC.";
      if (isMobileDevice()) return "Open this page in Chrome, then tap INSTALL APP or Chrome menu → Install app.";
      return "Open this page in Chrome or Edge, then tap INSTALL APP or the install icon in the address bar.";
    }
    function syncInstallUI() {
      var installed = isAppInstalled();
      var showIos = !installed && isIosDevice();
      var hint = installHelpText();
      var sec = el("appSection");
      if (sec) sec.style.display = "";
      var btn = el("btnInstallApp");
      if (btn) btn.style.display = installed ? "none" : "";
      var ios = el("installIosHint");
      if (ios) ios.style.display = showIos ? "" : "none";
      var installHint = el("installHint");
      if (installHint) installHint.textContent = hint;
      var downBtn = el("btnDownloadInstall");
      if (downBtn) downBtn.style.display = installed ? "none" : "";
      var downIos = el("downloadIosHint");
      if (downIos) downIos.style.display = showIos ? "" : "none";
      var downHint = el("downloadHint");
      if (downHint) downHint.textContent = hint;
      var homeBtn = el("btnDownloadHome");
      if (homeBtn) homeBtn.style.display = installed ? "none" : "";
    }
    function promptInstall() {
      var p = deferredInstallPrompt;
      if (!p) {
        syncInstallUI();
        try { showNotice(installHelpText()); } catch (e) {}
        return;
      }
      deferredInstallPrompt = null;
      syncInstallUI();
      try {
        var pr = p.prompt();
        var done = function () { deferredInstallPrompt = null; syncInstallUI(); };
        if (pr && typeof pr.then === "function") {
          pr.then(function () {
            if (p.userChoice && typeof p.userChoice.then === "function") {
              p.userChoice.then(function () { done(); }, function () { done(); });
            } else done();
          }, function () { done(); });
        } else done();
      } catch (e) {
        deferredInstallPrompt = p;
        syncInstallUI();
      }
    }
    window.addEventListener("beforeinstallprompt", function (ev) {
      ev.preventDefault();
      deferredInstallPrompt = ev;
      syncInstallUI();
    });
    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      try { showNotice("DashPoint installed — find it on your home screen or apps list"); } catch (e) {}
      syncInstallUI();
    });
    try {
      var dmm = window.matchMedia && window.matchMedia("(display-mode: standalone)");
      if (dmm && dmm.addEventListener) dmm.addEventListener("change", syncInstallUI);
      else if (dmm && dmm.addListener) dmm.addListener(syncInstallUI);
    } catch (e) {}
    ["btnInstallApp", "btnDownloadInstall"].forEach(function (id) {
      var b = el(id);
      if (b) b.addEventListener("click", promptInstall);
    });
    syncInstallUI();
  }

boot();

  // Splash screen hide after animation (1.6s total)
  setTimeout(() => {
    const splash = document.getElementById("splashRoot");
    if (splash) splash.classList.add("hidden");
  }, 1600);
  })();
