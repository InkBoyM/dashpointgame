/* DashPoint Network — levels/users over Firebase (REST-based, WebView-friendly) */
window.DPNet = (function () {
  const CFG = {
    apiKey: "AIzaSyD8Wmunm-_YNlRJChjLRiZla0cFZMjBTzs",
    authDomain: "betterpixelart.firebaseapp.com",
    databaseURL: "https://betterpixelart-default-rtdb.firebaseio.com",
    projectId: "betterpixelart",
    storageBucket: "betterpixelart.firebasestorage.app",
    messagingSenderId: "79165567652",
    appId: "1:79165567652:web:a26980df6a97adc2c52c31",
  };
  const SAVES_KEY = "dashpoint.net.saves";

  function sanitizeFirebaseKey(key) {
    return String(key).replace(/\./g, "_DOT_").replace(/#/g, "_HASH_").replace(/\$/g, "_DOLLAR_").replace(/\[/g, "_LB_").replace(/\]/g, "_RB_").replace(/\//g, "_SLASH_").replace(/\u0000/g, "");
  }
  function desanitizeFirebaseKey(key) {
    return String(key).replace(/_DOT_/g, ".").replace(/_HASH_/g, "#").replace(/_DOLLAR_/g, "$").replace(/_LB_/g, "[").replace(/_RB_/g, "]").replace(/_SLASH_/g, "/");
  }
  function sanitizeObjectKeys(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    const res = {};
    for (var k in obj) {
      if (!k) continue;
      const sk = sanitizeFirebaseKey(k);
      if (!sk) continue;
      // Firebase also disallows empty string keys and keys with . # $ [ ] /
      if (sk !== k && k.indexOf(".") !== -1) {
        // keep original value but with sanitized key
      }
      res[sk] = obj[k];
    }
    return res;
  }
  function desanitizeObjectKeys(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    const res = {};
    for (var k in obj) {
      const dk = desanitizeFirebaseKey(k);
      res[dk] = obj[k];
    }
    return res;
  }

  function coinsValue(n) {
    if (typeof n === "bigint") return n > 0n ? n : 0n;
    if (typeof n === "number") {
      if (!isFinite(n) || n <= 0) return 0n;
      if (n <= Number.MAX_SAFE_INTEGER) return BigInt(Math.floor(n));
    }
    var s = String(n == null ? "0" : n).trim().replace(/[,_\s]/g, "");
    var sci = /^([0-9]+)(?:\.([0-9]+))?e\+?([0-9]+)$/i.exec(s);
    if (sci) {
      var digits = sci[1] + (sci[2] || "");
      var zeros = (parseInt(sci[3], 10) || 0) - (sci[2] ? sci[2].length : 0);
      s = zeros >= 0 ? digits + Array(zeros + 1).join("0") : digits;
    }
    if (!/^\d+$/.test(s)) return 0n;
    try {
      var v = BigInt(s);
      return v > 0n ? v : 0n;
    } catch (e) { return 0n; }
  }

  function coinsMaxStr(a, b) {
    var x = coinsValue(a), y = coinsValue(b);
    return (x > y ? x : y).toString();
  }

  let db = null;
  let auth = null;
  let user = null;
  const authListeners = [];

  function ensure() {
    if (typeof firebase === "undefined") throw new Error("Firebase did not load");
    if (!db) {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG);
      db = firebase.database();
      auth = firebase.auth();
      firebase.auth().onAuthStateChanged((u) => {
        user = makeAuthUser(u);
        for (const fn of authListeners) fn(user);
      });
    }
    return db;
  }

  function guestStoredName() {
    try {
      const n = localStorage.getItem("dashpoint.guestName");
      if (n) return String(n).replace(/\s+/g, " ").trim().slice(0, 16);
    } catch (e) {}
    return "";
  }

  function makeAuthUser(u) {
    if (!u) return null;
    const guest = !!u.isAnonymous;
    let name = guest ? guestStoredName() : String(u.email || u.displayName || "player").split("@")[0];
    if (!name) name = guest ? "Guest" : "player";
    return { uid: u.uid, email: u.email || "", name: String(name).slice(0, 16), guest: guest };
  }

  function onAuth(fn) { ensure(); authListeners.push(fn); fn(user); }
  function getUser() {
    if (user) return user;
    try {
      const cu = firebase.auth().currentUser;
      if (cu) return makeAuthUser(cu);
    } catch(e){}
    try {
      const mp = window.DashPointMP && window.DashPointMP.getUser && window.DashPointMP.getUser();
      if (mp && mp.uid) return mp;
    } catch(e){}
    return user;
  }
  function getEffectiveUser() {
    const u = getUser();
    if (u) return u;
    try {
      const cu = firebase.auth().currentUser;
      if (cu) return makeAuthUser(cu);
    } catch(e){}
    return null;
  }

  async function register(email, pass) {
    ensure();
    return firebase.auth().createUserWithEmailAndPassword(email, pass);
  }
  async function login(email, pass) {
    ensure();
    return firebase.auth().signInWithEmailAndPassword(email, pass);
  }
  async function logout() {
    ensure();
    await firebase.auth().signOut();
  }

  function rtURL(path) {
    return CFG.databaseURL + path + ".json";
  }

  async function getAuthToken() {
    try {
      const cu = firebase.auth().currentUser;
      if (cu) return await cu.getIdToken();
    } catch(e){}
    return null;
  }

  async function getJSON(path) {
    let url = rtURL(path);
    try {
      const tok = await getAuthToken();
      if (tok) url += (url.indexOf("?") === -1 ? "?" : "&") + "auth=" + encodeURIComponent(tok);
    } catch(e){}
    const res = await fetch(url);
    if (!res.ok) {
      let extra = res.status;
      try {
        const j = await res.json();
        if (j && j.error) extra = j.error;
      } catch (e) {}
      throw new Error("Network error (" + extra + ")");
    }
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  }

  async function putJSON(path, value) {
    let url = rtURL(path);
    try {
      const tok = await getAuthToken();
      if (tok) url += (url.indexOf("?") === -1 ? "?" : "&") + "auth=" + encodeURIComponent(tok);
    } catch(e){}
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      let extra = res.status;
      try {
        const j = await res.json();
        if (j && j.error) extra = j.error;
      } catch (e) {
        try { const t = await res.text(); if (t) extra = t.slice(0, 200); } catch(e2){}
      }
      throw new Error("Write failed (" + extra + ")");
    }
    return true;
  }

  async function deleteJSON(path) {
    let url = rtURL(path);
    try {
      const tok = await getAuthToken();
      if (tok) url += (url.indexOf("?") === -1 ? "?" : "&") + "auth=" + encodeURIComponent(tok);
    } catch(e){}
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      let extra = res.status;
      try {
        const j = await res.json();
        if (j && j.error) extra = j.error;
      } catch (e) {
        try { const t = await res.text(); if (t) extra = t.slice(0, 200); } catch(e2){}
      }
      throw new Error("Delete failed (" + extra + ")");
    }
    return true;
  }

  async function patchJSON(path, value) {
    let url = rtURL(path);
    try {
      const tok = await getAuthToken();
      if (tok) url += (url.indexOf("?") === -1 ? "?" : "&") + "auth=" + encodeURIComponent(tok);
    } catch(e){}
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      let extra = res.status;
      try {
        const j = await res.json();
        if (j && j.error) extra = j.error;
      } catch (e) {
        try { const t = await res.text(); if (t) extra = t.slice(0, 200); } catch(e2){}
      }
      throw new Error("Write failed (" + extra + ")");
    }
    return true;
  }

  async function postJSON(path, value) {
    const res = await fetch(rtURL(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error("Write failed (" + res.status + ")");
    return (await res.json()).name;
  }

  async function loadLevelIndex() {
    ensure();
    const val = await getJSON("/dashpoint/levelsIndex");
    return Object.keys(val || {}).map((id) => Object.assign({ id: id }, val[id]));
  }

  async function fetchLevel(id) {
    ensure();
    const data = await getJSON("/dashpoint/levelsData/" + id);
    if (!data) throw new Error("Level not found.");
    return data;
  }

  async function postLevel(meta, data) {
    const u = getUser();
    if (!u) throw new Error("You need an account to post levels.");
    data.name = String(meta.title || "Untitled").slice(0, 48);
    const id = await postJSON("/dashpoint/levelsData", data);
    await putJSON("/dashpoint/levelsIndex/" + id, {
      title: String(meta.title || "Untitled").slice(0, 48),
      desc: String(meta.desc || "").slice(0, 300),
      difficulty: Math.max(1, Math.min(5, meta.difficulty | 0)),
      diffV: 2,
      authorUid: u.uid,
      authorName: u.name,
      createdAt: Date.now(),
      plays: 0,
      downloads: 0,
      tags: Array.isArray(meta.tags) ? meta.tags.map(function (t) { return String(t).slice(0, 32); }).filter(Boolean).slice(0, 8) : [],
    });
    await putJSON("/dashpoint/userLevels/" + u.uid + "/" + id, true);
    return id;
  }

  async function updateLevel(id, meta, data) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("You need an account to post levels.");
    id = String(id || "").trim();
    if (!id) throw new Error("Missing level id.");
    let entry = null;
    try { entry = await getJSON("/dashpoint/levelsIndex/" + encodeURIComponent(id)); } catch (e) {}
    if (!entry) throw new Error("Level not found.");
    if (entry.authorUid !== u.uid && !isAdmin()) throw new Error("You can only edit your own levels.");
    data.name = String(meta.title || "Untitled").slice(0, 48);
    await putJSON("/dashpoint/levelsData/" + encodeURIComponent(id), data);
    await patchJSON("/dashpoint/levelsIndex/" + encodeURIComponent(id), {
      title: String(meta.title || "Untitled").slice(0, 48),
      desc: String(meta.desc || "").slice(0, 300),
      difficulty: Math.max(1, Math.min(5, meta.difficulty | 0)),
      diffV: 2,
      authorName: u.name || entry.authorName || "player",
      updatedAt: Date.now(),
      tags: Array.isArray(meta.tags) ? meta.tags.map(function (t) { return String(t).slice(0, 32); }).filter(Boolean).slice(0, 8) : (entry.tags || []),
    });
    return id;
  }

  async function bumpPlays(id) {
    try {
      const cur = (await getJSON("/dashpoint/levelsIndex/" + id + "/plays")) || 0;
      await putJSON("/dashpoint/levelsIndex/" + id + "/plays", cur + 1);
    } catch (e) {}
  }

  // Likes: one per user. Dashpoint/levelLikes/<levelId>/<uid> = true tracks
  // who liked; levelsIndex/<id>/likes mirrors the count for sorting.
  function likeKey() { return "dashpoint.net.likes"; }
  function likedLocal() {
    try { return JSON.parse(localStorage.getItem(likeKey()) || "{}"); } catch (e) { return {}; }
  }
  function setLikedLocal(id, on) {
    try {
      const all = likedLocal();
      if (on) all[id] = 1; else delete all[id];
      localStorage.setItem(likeKey(), JSON.stringify(all));
    } catch (e) {}
  }
  async function hasLiked(id) {
    id = String(id || "");
    if (!id) return false;
    if (likedLocal()[id]) return true;
    const u = getEffectiveUser() || getUser();
    if (!u) return false;
    try {
      const v = await getJSON("/dashpoint/levelLikes/" + encodeURIComponent(id) + "/" + encodeURIComponent(u.uid));
      if (v) setLikedLocal(id, true);
      return !!v;
    } catch (e) { return false; }
  }
  async function setLike(id, on) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in to like levels.");
    id = String(id || "").trim();
    if (!id) throw new Error("Missing level id.");
    const markPath = "/dashpoint/levelLikes/" + encodeURIComponent(id) + "/" + encodeURIComponent(u.uid);
    const countPath = "/dashpoint/levelsIndex/" + encodeURIComponent(id) + "/likes";
    let cur = null;
    try { cur = await getJSON(markPath); } catch (e) {}
    if (!!cur === !!on) {
      setLikedLocal(id, !!on);
      try { return (await getJSON(countPath)) || 0; } catch (e) { return 0; }
    }
    if (on) await putJSON(markPath, true);
    else await putJSON(markPath, null);
    let n = 0;
    try {
      const c = (await getJSON(countPath)) || 0;
      n = Math.max(0, (c | 0) + (on ? 1 : -1));
      await putJSON(countPath, n);
    } catch (e) {}
    setLikedLocal(id, !!on);
    return n;
  }

  async function bumpDownloads(id) {
    try {
      const cur = (await getJSON("/dashpoint/levelsIndex/" + id + "/downloads")) || 0;
      await putJSON("/dashpoint/levelsIndex/" + id + "/downloads", cur + 1);
    } catch (e) {}
  }

  async function loadUsersIndex() {
    ensure();
    const val = await getJSON("/dashpoint/usersIndex");
    return Object.keys(val || {}).map((uid) => Object.assign({ uid: uid }, val[uid]));
  }

  async function getUserProfile(uid) {
    ensure();
    uid = String(uid || "").trim();
    if (!uid) return null;
    try {
      const val = await getJSON("/dashpoint/usersIndex/" + encodeURIComponent(uid));
      return val ? Object.assign({ uid: uid }, val) : null;
    } catch (e) {
      // Re-throw to let caller decide fallback
      throw e;
    }
  }

  async function syncStats(stats) {
    const u = getEffectiveUser() || getUser();
    if (!u) return null;
    const refPath = "/dashpoint/usersIndex/" + u.uid;
    // Use PATCH so we don't delete cloudSave child
    const patch = {
      name: u.name,
      lastSeen: Date.now(),
    };
    if (stats && Object.prototype.hasOwnProperty.call(stats, "tag")) {
      patch.tag = String(stats.tag || "").slice(0, 32);
    }
    if (stats && Object.prototype.hasOwnProperty.call(stats, "nameColor")) {
      patch.nameColor = String(stats.nameColor || "").slice(0, 32);
    }
    if (stats && Object.prototype.hasOwnProperty.call(stats, "frame")) {
      patch.frame = String(stats.frame || "").slice(0, 32);
    }
    if (stats && Object.prototype.hasOwnProperty.call(stats, "skin")) {
      patch.skin = stats.skin | 0 || 1;
    }
    // Merge public stats via read-modify-patch to preserve cloudSave
    try {
      const cloud = (await getJSON(refPath)) || {};
      patch.deaths = Math.max(cloud.deaths || 0, (stats && stats.deaths) || 0);
      patch.beatenCount = Math.max(cloud.beatenCount || 0, (stats && stats.beatenCount) || 0);
      patch.jumps = Math.max(cloud.jumps || 0, (stats && stats.jumps) || 0);
      patch.coins = coinsMaxStr(cloud.coins, stats && stats.coins);
      patch.skins = Math.max(cloud.skins || 0, (stats && stats.skins) || 0);
      patch.playtime = Math.max(cloud.playtime || 0, (stats && stats.playtime) || 0);
      try {
        const mine = await getJSON("/dashpoint/userLevels/" + u.uid);
        patch.made = mine ? Object.keys(mine).length : (cloud.made || 0);
      } catch (e2) { patch.made = cloud.made || 0; }
      if (!Object.prototype.hasOwnProperty.call(patch, "skin") && cloud.skin) patch.skin = cloud.skin | 0;
    } catch(e){
      patch.deaths = (stats && stats.deaths) || 0;
      patch.beatenCount = (stats && stats.beatenCount) || 0;
      patch.jumps = (stats && stats.jumps) || 0;
      patch.coins = coinsMaxStr("0", stats && stats.coins);
      patch.skins = (stats && stats.skins) || 0;
      patch.playtime = (stats && stats.playtime) || 0;
      patch.made = 0;
    }
    await patchJSON(refPath, patch);
    return patch;
  }

  async function updateBio(text) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in");
    const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 140);
    await patchJSON("/dashpoint/usersIndex/" + u.uid, { bio: clean, lastSeen: Date.now() });
    if (user && user.uid === u.uid) user.bio = clean;
    return clean;
  }

  const SOCIAL_IDS = ["discord", "youtube", "twitch", "x", "tiktok", "instagram"];
  function cleanHandle(v) {
    return String(v || "").trim().replace(/^@+/, "").replace(/\s+/g, "").slice(0, 32);
  }
  function cleanCustomUrl(v) {
    var s = String(v || "").trim().replace(/\s+/g, "");
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/+$/, "");
    return s.slice(0, 128);
  }
  async function updateSocials(obj) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in");
    const clean = {};
    for (const id of SOCIAL_IDS) {
      const h = cleanHandle(obj && obj[id]);
      if (h) clean[id] = h;
    }
    // up to 5 custom websites (accept legacy single string too)
    let customs = [];
    try {
      const raw = obj && obj.custom !== undefined ? obj.custom : obj.customLinks;
      const list = Array.isArray(raw) ? raw : [raw];
      for (const v of list) {
        const c = cleanCustomUrl(v);
        if (c && customs.indexOf(c) === -1) customs.push(c);
        if (customs.length >= 5) break;
      }
    } catch (e) { customs = []; }
    await patchJSON("/dashpoint/usersIndex/" + u.uid, {
      socials: clean,
      socialLinks: customs,
      lastSeen: Date.now(),
    });
    if (user && user.uid === u.uid) {
      user.socials = clean;
      user.socialLinks = customs.slice();
    }
    return { socials: clean, customs: customs };
  }

  async function updateUsername(name) {    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in");
    const clean = String(name || "").replace(/\s+/g, " ").trim().slice(0, 24);
    if (!clean) throw new Error("Enter a username");
    await patchJSON("/dashpoint/usersIndex/" + u.uid, { name: clean, lastSeen: Date.now() });
    // update local user object too
    if (user && user.uid === u.uid) user.name = clean;
    try { localStorage.setItem("dashpoint.guestName", clean.slice(0, 16)); } catch (e) {}
    return clean;
  }

  async function syncCloud(fullSave) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in — please log in again via Multiplayer → Log in");
    // Use usersIndex/<uid>/cloudSave so it inherits the per-user write rule (auth.uid === $uid)
    const path = "/dashpoint/usersIndex/" + u.uid + "/cloudSave";
    let cloud = null;
    try { cloud = await getJSON(path); } catch(e) { cloud = null; }
    // Fallback: try old path for migration
    if (!cloud) { try { const old = await getJSON("/dashpoint/cloudSaves/" + u.uid); if (old) cloud = old; } catch(e){} }
    cloud = cloud || {};
    // Sanitize beaten/best keys for Firebase (dots etc. not allowed)
    const rawBeaten = fullSave.beaten ? JSON.parse(JSON.stringify(fullSave.beaten)) : {};
    const rawBest = fullSave.best ? JSON.parse(JSON.stringify(fullSave.best)) : {};
    // Desanitize cloud's already-sanitized keys for merging
    const cloudBeatenDes = desanitizeObjectKeys(cloud.beaten || {});
    const cloudBestDes = desanitizeObjectKeys(cloud.best || {});
    const rawPaid = fullSave.coinPaid ? JSON.parse(JSON.stringify(fullSave.coinPaid)) : {};
    const toSave = {
      deaths: fullSave.deaths | 0,
      jumps: fullSave.jumps | 0,
      playtime: Math.max(Number(cloud.playtime) || 0, Number(fullSave.playtime) || 0),
      coins: coinsMaxStr(fullSave.coins, cloud.coins),
      coinPaid: sanitizeObjectKeys(rawPaid),
      coinMigrated: !!fullSave.coinMigrated,
      codes: sanitizeObjectKeys(fullSave.codes || {}),
      skin: fullSave.skin | 0,
      unlocked: Array.isArray(fullSave.unlocked) ? fullSave.unlocked.slice() : [],
      tags: Array.isArray(fullSave.tags) ? fullSave.tags.slice() : [],
      tag: String(fullSave.tag || ""),
      nameColors: Array.isArray(fullSave.nameColors) ? fullSave.nameColors.slice() : [],
      nameColor: String(fullSave.nameColor || ""),
      frames: Array.isArray(fullSave.frames) ? fullSave.frames.slice() : [],
      frame: String(fullSave.frame || ""),
      trails: Array.isArray(fullSave.trails) ? fullSave.trails.slice() : [],
      trail: String(fullSave.trail || ""),
      championKeys: Math.max(0, Math.floor(Number(fullSave.championKeys) || 0)),
      chestFree: {
        basic: Math.max(0, Number(fullSave.chestFree && fullSave.chestFree.basic) || 0),
        gold: Math.max(0, Number(fullSave.chestFree && fullSave.chestFree.gold) || 0),
        diamond: Math.max(0, Number(fullSave.chestFree && fullSave.chestFree.diamond) || 0),
        king: Math.max(0, Number(fullSave.chestFree && fullSave.chestFree.king) || 0),
      },
      beaten: sanitizeObjectKeys(rawBeaten),
      best: sanitizeObjectKeys(rawBest),
      secretA: !!fullSave.secretA,
      spaceMenu: !!fullSave.spaceMenu,
      updatedAt: Date.now(),
      name: u.name
    };
    if (Array.isArray(cloud.unlocked)) {
      const set = {};
      cloud.unlocked.forEach(function(id){ set[id]=true; });
      // toSave.unlocked is already array, but desanitize not needed
      const localDes = desanitizeObjectKeys({}); // dummy to keep pattern
      toSave.unlocked.forEach(function(id){ set[id]=true; });
      toSave.unlocked = Object.keys(set).map(function(k){ return parseInt(k,10); }).sort(function(a,b){return a-b;});
    }
    if (cloudBeatenDes && Object.keys(cloudBeatenDes).length) {
      const mergedBeaten = {};
      for (var k in cloudBeatenDes) mergedBeaten[sanitizeFirebaseKey(k)]=true;
      for (var k in rawBeaten) mergedBeaten[sanitizeFirebaseKey(k)]=true;
      toSave.beaten = mergedBeaten;
    }
    if (cloudBestDes && Object.keys(cloudBestDes).length) {
      const mergedBest = {};
      for (var k in cloudBestDes) mergedBest[sanitizeFirebaseKey(k)]=cloudBestDes[k];
      for (var k in rawBest) {
        const sk = sanitizeFirebaseKey(k);
        if (mergedBest[sk]==null || rawBest[k] < mergedBest[sk]) mergedBest[sk]=rawBest[k];
      }
      toSave.best = mergedBest;
    }
    if (cloud.deaths) toSave.deaths = Math.max(cloud.deaths|0, toSave.deaths|0);
    if (cloud.jumps) toSave.jumps = Math.max(cloud.jumps|0, toSave.jumps|0);
    if (cloud.coins) toSave.coins = coinsMaxStr(cloud.coins, toSave.coins);
    if (cloud.championKeys) toSave.championKeys = Math.max(toSave.championKeys | 0, cloud.championKeys | 0);
    if (cloud.coinMigrated) toSave.coinMigrated = true;
    if (cloud.coinPaid) {
      const mergedPaid = sanitizeObjectKeys(desanitizeObjectKeys(cloud.coinPaid));
      const localPaid = sanitizeObjectKeys(rawPaid);
      for (var pk in localPaid) mergedPaid[pk] = true;
      toSave.coinPaid = mergedPaid;
    }
    if (cloud.codes) {
      const mergedCodes = sanitizeObjectKeys(desanitizeObjectKeys(cloud.codes));
      const localCodes = sanitizeObjectKeys(fullSave.codes || {});
      for (var ck in localCodes) mergedCodes[ck] = true;
      toSave.codes = mergedCodes;
    }
    if (cloud.skin && toSave.skin === 1 && cloud.skin !== 1) toSave.skin = cloud.skin;
    if (cloud.secretA) toSave.secretA = true;
    if (cloud.spaceMenu) toSave.spaceMenu = true;
    if (Array.isArray(cloud.tags)) {
      const set = {};
      (toSave.tags || []).forEach(function (id) { set[id] = true; });
      cloud.tags.forEach(function (id) { if (id) set[id] = true; });
      toSave.tags = Object.keys(set);
    }
    if (cloud.tag && !toSave.tag) toSave.tag = String(cloud.tag);
    if (Array.isArray(cloud.nameColors)) {
      const set = {};
      (toSave.nameColors || []).forEach(function (id) { set[id] = true; });
      cloud.nameColors.forEach(function (id) { if (id) set[id] = true; });
      toSave.nameColors = Object.keys(set);
    }
    if (cloud.nameColor && !toSave.nameColor) toSave.nameColor = String(cloud.nameColor);
    if (Array.isArray(cloud.frames)) {
      const set = {};
      (toSave.frames || []).forEach(function (id) { set[id] = true; });
      cloud.frames.forEach(function (id) { if (id) set[id] = true; });
      toSave.frames = Object.keys(set);
    }
    if (cloud.frame && !toSave.frame) toSave.frame = String(cloud.frame);
    if (Array.isArray(cloud.trails)) {
      const set = {};
      (toSave.trails || []).forEach(function (id) { set[id] = true; });
      cloud.trails.forEach(function (id) { if (id) set[id] = true; });
      toSave.trails = Object.keys(set);
    }
    if (cloud.trail && !toSave.trail) toSave.trail = String(cloud.trail);
    if (cloud.chestFree && typeof cloud.chestFree === "object") {
      toSave.chestFree = {
        basic: Math.max(toSave.chestFree.basic, Number(cloud.chestFree.basic) || 0),
        gold: Math.max(toSave.chestFree.gold, Number(cloud.chestFree.gold) || 0),
        diamond: Math.max(toSave.chestFree.diamond, Number(cloud.chestFree.diamond) || 0),
        king: Math.max(toSave.chestFree.king, Number(cloud.chestFree.king) || 0),
      };
    }
    await putJSON(path, toSave);
    await syncStats({
      deaths: toSave.deaths,
      jumps: toSave.jumps,
      beatenCount: Object.keys(toSave.beaten || {}).length,
      coins: toSave.coins,
      skins: (toSave.unlocked || []).length,
      playtime: Number(toSave.playtime) || 0,
      skin: toSave.skin,
      tag: String(fullSave.tag || toSave.tag || ""),
      nameColor: String(fullSave.nameColor || toSave.nameColor || ""),
      frame: String(fullSave.frame || toSave.frame || ""),
    });
    return toSave;
  }

  async function downloadCloud() {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in — please log in again via Multiplayer → Log in");
    let cloud = null;
    try { cloud = await getJSON("/dashpoint/usersIndex/" + u.uid + "/cloudSave"); } catch(e){}
    if (!cloud) { try { cloud = await getJSON("/dashpoint/cloudSaves/" + u.uid); } catch(e){} }
    if (!cloud) throw new Error("No cloud save found — sync to cloud first");
    // Desanitize beaten/best keys for local use
    if (cloud.beaten) cloud.beaten = desanitizeObjectKeys(cloud.beaten);
    if (cloud.best) cloud.best = desanitizeObjectKeys(cloud.best);
    if (cloud.coinPaid) cloud.coinPaid = desanitizeObjectKeys(cloud.coinPaid);
    if (cloud.codes) cloud.codes = desanitizeObjectKeys(cloud.codes);
    return cloud;
  }

  async function submitLeaderboard(levelFile, time, skin, tag, nameColor, frame) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in");
    const lbPath = "/dashpoint/leaderboards/" + sanitizeFirebaseKey(levelFile);
    const publicTag = String(tag || "").slice(0, 32);
    const publicColor = String(nameColor || "").slice(0, 32);
    const publicFrame = String(frame || "").slice(0, 32);
    let existing = null;
    try { const all = await getJSON(lbPath); if (all && all[u.uid]) existing = all[u.uid]; } catch(e){}
    if (existing && existing.time != null && time >= existing.time) {
      if (publicTag !== String(existing.tag || "") || publicColor !== String(existing.nameColor || "") || publicFrame !== String(existing.frame || "") || u.name !== existing.name) {
        try { await patchJSON(lbPath + "/" + u.uid, { name: u.name, tag: publicTag, nameColor: publicColor, frame: publicFrame }); } catch (e) {}
      }
      const list = await getLeaderboard(levelFile);
      let rank=-1; for(let i=0;i<list.length;i++) if(list[i].uid===u.uid) rank=i+1;
      return { rank: rank, list: list, improved:false };
    }
    const entry = { time: time, name: u.name, skin: skin|0, tag: publicTag, nameColor: publicColor, frame: publicFrame, updatedAt: Date.now() };
    await putJSON(lbPath + "/" + u.uid, entry);
    const list = await getLeaderboard(levelFile);
    let rank=-1; for(let i=0;i<list.length;i++) if(list[i].uid===u.uid) rank=i+1;
    return { rank: rank, list: list, improved:true };
  }

  async function getLeaderboard(levelFile, limit) {
    limit = limit || 10;
    try {
      const val = await getJSON("/dashpoint/leaderboards/" + sanitizeFirebaseKey(levelFile));
      if (!val) return [];
      const list = Object.keys(val).map(function(uid){ var v=val[uid]; return { uid:uid, time:v.time, name:v.name, skin:v.skin, tag: v.tag || "", nameColor: v.nameColor || "", frame: v.frame || "", updatedAt:v.updatedAt, edited: !!v.edited, origTime: v.origTime }; });
      list.sort(function(a,b){ return a.time - b.time; });
      return list.slice(0, limit);
    } catch(e){ return []; }
  }

  async function getLeaderboardEntry(levelFile, uid) {
    uid = String(uid || "").trim();
    if (!uid) return null;
    try {
      const v = await getJSON("/dashpoint/leaderboards/" + sanitizeFirebaseKey(levelFile) + "/" + encodeURIComponent(uid));
      if (!v) return null;
      return { uid: uid, time: v.time, name: v.name, skin: v.skin, tag: v.tag || "", nameColor: v.nameColor || "", frame: v.frame || "", updatedAt: v.updatedAt, edited: !!v.edited, origTime: v.origTime };
    } catch (e) {
      return null;
    }
  }

  async function adminSetLeaderboardTime(levelFile, uid, time) {
    if (!isAdmin()) throw new Error("Admins only.");
    uid = String(uid || "").trim();
    if (!uid) throw new Error("Missing player.");
    time = Number(time);
    if (!isFinite(time) || time < 0) throw new Error("That time isn't valid.");
    const path = "/dashpoint/leaderboards/" + sanitizeFirebaseKey(levelFile) + "/" + encodeURIComponent(uid);
    const cur = await getJSON(path);
    if (!cur) throw new Error("No time on this board.");
    const orig = cur.origTime != null ? cur.origTime : cur.time;
    await putJSON(path, {
      time: time,
      name: cur.name || "player",
      skin: cur.skin | 0,
      tag: cur.tag || "",
      nameColor: cur.nameColor || "",
      frame: cur.frame || "",
      updatedAt: Date.now(),
      edited: true,
      origTime: orig,
      editedAt: Date.now(),
    });
    return true;
  }

  async function adminRemoveLeaderboardTime(levelFile, uid) {
    if (!isAdmin()) throw new Error("Admins only.");
    uid = String(uid || "").trim();
    if (!uid) throw new Error("Missing player.");
    await deleteJSON("/dashpoint/leaderboards/" + sanitizeFirebaseKey(levelFile) + "/" + encodeURIComponent(uid));
    try {
      await deleteJSON("/dashpoint/ghosts/" + sanitizeFirebaseKey(levelFile) + "/" + encodeURIComponent(uid));
    } catch (e) {}
    return true;
  }

  async function getComments(levelId, limit) {
    limit = limit || 30;
    try {
      const val = await getJSON("/dashpoint/comments/" + sanitizeFirebaseKey(levelId));
      if (!val) return [];
      const list = Object.keys(val).map(function (cid) {
        const v = val[cid] || {};
        return { id: cid, uid: v.uid || "", name: v.name || "player", text: String(v.text || "").slice(0, 200), ts: v.ts || 0, flags: v.flags | 0 };
      });
      list.sort(function (a, b) { return b.ts - a.ts; });
      return list.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  async function postComment(levelId, text) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in to comment.");
    text = String(text || "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!text) throw new Error("Write something first.");
    return await postJSON("/dashpoint/comments/" + sanitizeFirebaseKey(levelId), {
      uid: u.uid,
      name: u.name,
      text: text,
      ts: Date.now(),
      flags: 0,
    });
  }

  async function deleteComment(levelId, commentId, commentUid) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in first.");
    if ((!commentUid || u.uid !== commentUid) && !isAdmin()) {
      throw new Error("You can only delete your own comments.");
    }
    await deleteJSON("/dashpoint/comments/" + sanitizeFirebaseKey(levelId) + "/" + encodeURIComponent(commentId));
    return true;
  }

  async function reportComment(levelId, commentId) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in to report.");
    const path = "/dashpoint/comments/" + sanitizeFirebaseKey(levelId) + "/" + encodeURIComponent(commentId);
    const cur = await getJSON(path);
    if (!cur) throw new Error("Comment is gone.");
    await patchJSON(path, { flags: (cur.flags | 0) + 1 });
    return true;
  }

  var HEAT_MAX_CELLS = 3000;
  var HEAT_MAX_COUNT = 9999;

  function heatCellKey(c, r) {
    return (c | 0) + "," + (r | 0);
  }

  // Pure merge: sums local deaths into cloud counts, capped. No network here.
  function mergeHeatCells(cloud, local) {
    const out = {};
    if (cloud && typeof cloud === "object") {
      for (var k in cloud) {
        if (!Object.prototype.hasOwnProperty.call(cloud, k)) continue;
        const v = Math.floor(Number(cloud[k]) || 0);
        if (v > 0) out[k] = Math.min(HEAT_MAX_COUNT, v);
      }
    }
    if (local && typeof local === "object") {
      for (var k2 in local) {
        if (!Object.prototype.hasOwnProperty.call(local, k2)) continue;
        const v2 = Math.floor(Number(local[k2]) || 0);
        if (v2 > 0) out[k2] = Math.min(HEAT_MAX_COUNT, (out[k2] || 0) + v2);
      }
    }
    const keys = Object.keys(out);
    if (keys.length > HEAT_MAX_CELLS) {
      keys.sort(function (a, b) { return out[b] - out[a]; });
      const keep = {};
      for (var i = 0; i < HEAT_MAX_CELLS; i++) keep[keys[i]] = out[keys[i]];
      return keep;
    }
    return out;
  }

  async function getHeatmap(levelFile) {
    try {
      const val = await getJSON("/dashpoint/heatmaps/" + sanitizeFirebaseKey(levelFile));
      if (!val || typeof val !== "object") return null;
      return val.cells && typeof val.cells === "object" ? val.cells : null;
    } catch (e) {
      return null;
    }
  }

  async function submitHeatmap(levelFile, localCells) {
    const u = getEffectiveUser() || getUser();
    if (!u || !localCells) return false;
    if (!Object.keys(localCells).length) return false;
    try {
      const path = "/dashpoint/heatmaps/" + sanitizeFirebaseKey(levelFile);
      const cur = await getJSON(path);
      const merged = mergeHeatCells(cur && cur.cells, localCells);
      await putJSON(path, { cells: merged, updatedAt: Date.now() });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function getCategoryLeaderboard(category, limit) {
    limit = limit || 25;
    const key = category === "beaten" ? "beatenCount" : category;
    const users = await loadUsersIndex();
    const list = [];
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      if (!u || !u.uid) continue;
      let raw;
      if (category === "coins") {
        raw = coinsValue(u.coins);
        if (raw <= 0n) continue;
      } else {
        raw = Number(u[key]) || 0;
        if (raw <= 0) continue;
      }
      list.push({
        uid: u.uid,
        name: u.name || "player",
        tag: String(u.tag || "").slice(0, 32),
        skin: (u.skin | 0) || 1,
        value: category === "coins" ? raw.toString() : raw,
      });
    }
    list.sort(function (a, b) {
      if (category === "coins") {
        const av = coinsValue(a.value);
        const bv = coinsValue(b.value);
        if (av === bv) return String(a.name || "").localeCompare(String(b.name || ""));
        return av > bv ? -1 : 1;
      }
      const d = (b.value | 0) - (a.value | 0);
      return d || String(a.name || "").localeCompare(String(b.name || ""));
    });
    return list.slice(0, limit);
  }

  const GHOST_KEY = "dashpoint.ghosts";
  function saveGhostLocal(levelFile, ghost) {
    try {
      const all = JSON.parse(localStorage.getItem(GHOST_KEY) || "{}");
      all[levelFile] = ghost;
      localStorage.setItem(GHOST_KEY, JSON.stringify(all));
    } catch(e){}
  }
  function getGhostLocal(levelFile) {
    try {
      const all = JSON.parse(localStorage.getItem(GHOST_KEY) || "{}");
      return all[levelFile] || null;
    } catch(e){ return null; }
  }
  async function saveGhostCloud(levelFile, ghost) {
    const u = getEffectiveUser() || getUser();
    if (!u) return;
    try {
      await putJSON("/dashpoint/ghosts/" + sanitizeFirebaseKey(levelFile) + "/" + u.uid, { ghost: ghost, name: u.name, skin: ghost.skin || 1, time: ghost.time, updatedAt: Date.now() });
    } catch(e){}
  }
  async function getGhostCloud(levelFile, uid) {
    try {
      const val = await getJSON("/dashpoint/ghosts/" + sanitizeFirebaseKey(levelFile) + "/" + encodeURIComponent(uid));
      return val ? val.ghost : null;
    } catch(e){ return null; }
  }

  function listSaves() {
    try {
      const v = JSON.parse(localStorage.getItem(SAVES_KEY) || "{}");
      return Object.keys(v).map((id) => v[id]);
    } catch (e) {
      return [];
    }
  }
  function getSave(id) {
    try {
      return JSON.parse(localStorage.getItem(SAVES_KEY) || "{}")[id] || null;
    } catch (e) {
      return null;
    }
  }
  function saveLocal(id, meta, json) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(SAVES_KEY) || "{}"); } catch (e) {}
    all[id] = { id: id, meta: meta, json: json, savedAt: Date.now() };
    try {
      localStorage.setItem(SAVES_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function deleteSave(id) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(SAVES_KEY) || "{}"); } catch (e) {}
    delete all[id];
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  }

  function friendly(err) {
    const code = String((err && err.code) || "");
    if (code === "auth/operation-not-allowed") return "Enable Email/Password sign-in in your Firebase console first.";
    if (code === "auth/email-already-in-use") return "That email already has an account — try logging in.";
    if (code === "auth/weak-password") return "Password must be at least 6 characters.";
    if (code === "auth/invalid-email") return "That email doesn't look right.";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Wrong email or password.";
    if (String(err && err.message).indexOf("Permission denied") !== -1) return "Firebase denied access — check Realtime Database rules.";
    return (err && err.message) || String(err);
  }

  // ---- Admin ----
  const ADMIN_EMAILS = ["inkboym@inkboym.org", "inkboym@gmail.com", "ilyadafirebro99312@gmail.com"];
  function getUserEmail() {
    const u = getUser() || getEffectiveUser();
    if (u && u.email) return String(u.email).toLowerCase();
    try { const cu = firebase.auth().currentUser; if (cu && cu.email) return String(cu.email).toLowerCase(); } catch(e){}
    return "";
  }
  function isAdmin() {
    const e = getUserEmail();
    return ADMIN_EMAILS.indexOf(e) !== -1;
  }

  function canDeleteLevel(meta) {
    if (!meta) return false;
    if (isAdmin()) return true;
    const u = getEffectiveUser() || getUser();
    return !!(u && u.uid && meta.authorUid && u.uid === meta.authorUid);
  }

  async function deleteNetworkLevel(id, reason) {
    ensure();
    let entry = null;
    try { entry = await getJSON("/dashpoint/levelsIndex/" + encodeURIComponent(id)); } catch(e) {}
    const authorUid = entry && entry.authorUid ? entry.authorUid : null;
    const title = entry && entry.title ? entry.title : String(id).slice(0, 24);
    const me = getEffectiveUser() || getUser();
    const mine = !!(me && me.uid && authorUid && me.uid === authorUid);
    if (!isAdmin() && !mine) throw new Error("You can only delete your own levels.");
    const notifyAuthor = isAdmin() && !mine;
    reason = String(reason || "").trim() || (notifyAuthor ? "Removed by an admin." : "Removed by the author.");

    // 1) delete level data + index entry + author's userLevels mapping
    await deleteJSON("/dashpoint/levelsData/" + encodeURIComponent(id));
    await deleteJSON("/dashpoint/levelsIndex/" + encodeURIComponent(id));
    if (authorUid) {
      try { await deleteJSON("/dashpoint/userLevels/" + encodeURIComponent(authorUid) + "/" + encodeURIComponent(id)); } catch(e) {}
    }

    // 2) write a deletion notice for the author (so they see a popup next login)
    if (authorUid && notifyAuthor) {
      const notice = {
        title: title,
        reason: reason,
        adminEmail: getUserEmail(),
        deletedAt: Date.now(),
      };
      try {
        const path = "/dashpoint/deletionNotices/" + encodeURIComponent(authorUid);
        let list = [];
        try { list = await getJSON(path); } catch(e){ list = null; }
        if (!Array.isArray(list)) list = [];
        list.push(notice);
        while (list.length > 20) list.shift();
        await putJSON(path, list);
      } catch(e){}
    }
    return { title: title, authorUid: authorUid };
  }

  async function getDeletionNotices(uid) {
    if (!uid) return [];
    try {
      const v = await getJSON("/dashpoint/deletionNotices/" + encodeURIComponent(uid));
      return Array.isArray(v) ? v : [];
    } catch(e){ return []; }
  }

  async function clearDeletionNotices(uid) {
    if (!uid) return;
    try {
      await fetch(rtURL("/dashpoint/deletionNotices/" + encodeURIComponent(uid)) + (await getAuthToken() ? "?auth=" + encodeURIComponent(await getAuthToken()) : ""), { method: "DELETE" });
    } catch(e){}
  }

  async function followUser(targetUid, targetName) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in to follow players.");
    targetUid = String(targetUid || "").trim();
    if (!targetUid) throw new Error("Player not found.");
    if (targetUid === u.uid) throw new Error("You can't follow yourself.");
    await putJSON("/dashpoint/follows/" + encodeURIComponent(u.uid) + "/" + encodeURIComponent(targetUid), {
      name: String(targetName || "player").slice(0, 24),
      ts: Date.now(),
    });
    return true;
  }

  async function unfollowUser(targetUid) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in to unfollow players.");
    targetUid = String(targetUid || "").trim();
    if (!targetUid) return false;
    await deleteJSON("/dashpoint/follows/" + encodeURIComponent(u.uid) + "/" + encodeURIComponent(targetUid));
    return true;
  }

  async function listFollows(uid) {
    const u = uid || ((getEffectiveUser() && getEffectiveUser().uid) || (getUser() && getUser().uid));
    if (!u) return {};
    try {
      const val = await getJSON("/dashpoint/follows/" + encodeURIComponent(u));
      return val && typeof val === "object" ? val : {};
    } catch (e) {
      return {};
    }
  }

  async function sendInvite(targetUid, code) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in to invite players.");
    targetUid = String(targetUid || "").trim();
    if (!targetUid) throw new Error("Player not found.");
    if (targetUid === u.uid) throw new Error("You can't invite yourself.");
    code = String(code || "").trim().toUpperCase();
    if (code.length !== 5) throw new Error("No room to invite to.");
    await putJSON("/dashpoint/invites/" + encodeURIComponent(targetUid) + "/" + encodeURIComponent(u.uid), {
      fromUid: u.uid,
      fromName: String(u.name || "player").slice(0, 24),
      code: code,
      ts: Date.now(),
    });
    return true;
  }

  async function listInvites() {
    const u = getEffectiveUser() || getUser();
    if (!u) return [];
    try {
      const val = await getJSON("/dashpoint/invites/" + encodeURIComponent(u.uid));
      if (!val || typeof val !== "object") return [];
      return Object.keys(val).map(function (id) {
        const inv = val[id] || {};
        return {
          id: id,
          fromUid: inv.fromUid || id,
          fromName: inv.fromName || "player",
          code: String(inv.code || "").toUpperCase(),
          ts: inv.ts || 0,
        };
      }).filter(function (inv) { return inv.code.length === 5; });
    } catch (e) {
      return [];
    }
  }

  async function clearInvite(fromUid) {
    const u = getEffectiveUser() || getUser();
    if (!u || !fromUid) return;
    try {
      await deleteJSON("/dashpoint/invites/" + encodeURIComponent(u.uid) + "/" + encodeURIComponent(fromUid));
    } catch (e) {}
  }

  // Presence heartbeat: what I'm playing + which room, so friends can see it.
  // Same per-user write rule as the rest of the profile (own entry only).
  async function updatePresence(playing, room) {
    try {
      const u = getEffectiveUser() || getUser();
      if (!u) return false;
      await patchJSON("/dashpoint/usersIndex/" + u.uid, {
        lastSeen: Date.now(),
        playing: String(playing || ""),
        room: String(room || ""),
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function giftId() {
    return Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  }

  // Coin gifts: sender-paid inbox entries. Mirrors the invite pattern
  // (cross-user inbox writes). Amounts travel as decimal strings (BigInt).
  async function sendGift(targetUid, amount) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Log in to send gifts.");
    targetUid = String(targetUid || "").trim();
    if (!targetUid) throw new Error("Player not found.");
    if (targetUid === u.uid) throw new Error("You can't gift yourself.");
    let amt = 0n;
    try { amt = BigInt(String(amount).replace(/[,_\s]/g, "")); } catch (e) { amt = 0n; }
    if (amt <= 0n) throw new Error("Enter an amount above 0.");
    const id = giftId();
    await putJSON("/dashpoint/gifts/" + encodeURIComponent(targetUid) + "/" + encodeURIComponent(id), {
      fromUid: u.uid,
      fromName: String(u.name || "player").slice(0, 24),
      amount: amt.toString(),
      ts: Date.now(),
    });
    return { id: id, amount: amt.toString() };
  }

  async function listGifts() {
    const u = getEffectiveUser() || getUser();
    if (!u) return [];
    try {
      const val = await getJSON("/dashpoint/gifts/" + encodeURIComponent(u.uid));
      if (!val || typeof val !== "object") return [];
      return Object.keys(val).map(function (id) {
        const g = val[id] || {};
        return {
          id: id,
          fromUid: g.fromUid || "",
          fromName: g.fromName || "player",
          amount: String(g.amount || "0"),
          ts: g.ts || 0,
        };
      }).filter(function (g) {
        try { return BigInt(g.amount) > 0n; } catch (e) { return false; }
      }).slice(0, 20);
    } catch (e) {
      return [];
    }
  }

  // Claim = read + delete, returns the entry so the caller can credit it.
  async function claimGift(id) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in");
    id = String(id || "").trim();
    if (!id) throw new Error("Gift not found.");
    const g = await getJSON("/dashpoint/gifts/" + encodeURIComponent(u.uid) + "/" + encodeURIComponent(id));
    if (!g || typeof g !== "object") throw new Error("Gift is gone.");
    await deleteJSON("/dashpoint/gifts/" + encodeURIComponent(u.uid) + "/" + encodeURIComponent(id));
    return {
      id: id,
      fromUid: g.fromUid || "",
      fromName: g.fromName || "player",
      amount: String(g.amount || "0"),
      ts: g.ts || 0,
    };
  }

  let inviteWatchRef = null;
  let inviteWatchUid = null;
  // Realtime invite listener. cb(list) fires on every change (including the
  // initial snapshot — callers must baseline first to avoid old-invite spam).
  // Returns true when attached.
  function onInvites(cb) {
    try {
      const u = (getEffectiveUser && getEffectiveUser()) || (getUser && getUser());
      const db = ensure();
      if (!u || !db || !db.ref) return false;
      if (inviteWatchRef && inviteWatchUid === u.uid) return true;
      try { if (inviteWatchRef) inviteWatchRef.off("value"); } catch (e) {}
      inviteWatchUid = u.uid;
      inviteWatchRef = db.ref("/dashpoint/invites/" + encodeURIComponent(u.uid));
      inviteWatchRef.on("value", function (snap) {
        let list = [];
        try {
          const val = snap.val();
          if (val && typeof val === "object") {
            list = Object.keys(val).map(function (id) {
              const inv = val[id] || {};
              return {
                id: id,
                fromUid: inv.fromUid || id,
                fromName: inv.fromName || "player",
                code: String(inv.code || "").toUpperCase(),
                ts: inv.ts || 0,
              };
            }).filter(function (inv) { return inv.code.length === 5; });
          }
        } catch (e) {}
        try { cb(list); } catch (e) {}
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function offInvites() {
    try { if (inviteWatchRef) inviteWatchRef.off("value"); } catch (e) {}
    inviteWatchRef = null;
    inviteWatchUid = null;
  }

  return {
    init: ensure,
    onAuth: onAuth,
    getUser: getUser,
    getEffectiveUser: getEffectiveUser,
    register: register,
    login: login,
    logout: logout,
    loadLevelIndex: loadLevelIndex,
    fetchLevel: fetchLevel,
    postLevel: postLevel,
    updateLevel: updateLevel,
    bumpPlays: bumpPlays,
    bumpDownloads: bumpDownloads,
    setLike: setLike,
    hasLiked: hasLiked,
    loadUsersIndex: loadUsersIndex,
    getUserProfile: getUserProfile,
    syncStats: syncStats,
    updateUsername: updateUsername,
    updateBio: updateBio,
    updateSocials: updateSocials,
    syncCloud: syncCloud,
    downloadCloud: downloadCloud,
    submitLeaderboard: submitLeaderboard,
    getLeaderboard: getLeaderboard,
    getLeaderboardEntry: getLeaderboardEntry,
    adminSetLeaderboardTime: adminSetLeaderboardTime,
    adminRemoveLeaderboardTime: adminRemoveLeaderboardTime,
    getComments: getComments,
    postComment: postComment,
    deleteComment: deleteComment,
    reportComment: reportComment,
    heatCellKey: heatCellKey,
    mergeHeatCells: mergeHeatCells,
    getHeatmap: getHeatmap,
    submitHeatmap: submitHeatmap,
    getCategoryLeaderboard: getCategoryLeaderboard,
    saveGhostLocal: saveGhostLocal,
    getGhostLocal: getGhostLocal,
    saveGhostCloud: saveGhostCloud,
    getGhostCloud: getGhostCloud,
    listSaves: listSaves,
    getSave: getSave,
    saveLocal: saveLocal,
    deleteSave: deleteSave,
    isAdmin: isAdmin,
    canDeleteLevel: canDeleteLevel,
    deleteNetworkLevel: deleteNetworkLevel,
    getDeletionNotices: getDeletionNotices,
    clearDeletionNotices: clearDeletionNotices,
    followUser: followUser,
    unfollowUser: unfollowUser,
    listFollows: listFollows,
    sendInvite: sendInvite,
    listInvites: listInvites,
    clearInvite: clearInvite,
    sendGift: sendGift,
    listGifts: listGifts,
    claimGift: claimGift,
    updatePresence: updatePresence,
    onInvites: onInvites,
    offInvites: offInvites,
    friendly: friendly,
  };
})();
