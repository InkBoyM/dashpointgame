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
        user = u ? { uid: u.uid, email: u.email || "", name: String(u.email || "player").split("@")[0].slice(0, 16) } : null;
        for (const fn of authListeners) fn(user);
      });
    }
    return db;
  }

  function onAuth(fn) { ensure(); authListeners.push(fn); fn(user); }
  function getUser() {
    if (user) return user;
    try {
      const cu = firebase.auth().currentUser;
      if (cu) return { uid: cu.uid, email: cu.email || "", name: String(cu.email || "player").split("@")[0].slice(0, 16) };
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
      if (cu) return { uid: cu.uid, email: cu.email || "", name: String(cu.email || "player").split("@")[0].slice(0, 16) };
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
    });
    await putJSON("/dashpoint/userLevels/" + u.uid + "/" + id, true);
    return id;
  }

  async function bumpPlays(id) {
    try {
      const cur = (await getJSON("/dashpoint/levelsIndex/" + id + "/plays")) || 0;
      await putJSON("/dashpoint/levelsIndex/" + id + "/plays", cur + 1);
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
    // Merge deaths/beatenCount via read-modify-patch to preserve cloudSave
    try {
      const cloud = (await getJSON(refPath)) || {};
      patch.deaths = Math.max(cloud.deaths || 0, stats.deaths || 0);
      patch.beatenCount = Math.max(cloud.beatenCount || 0, stats.beatenCount || 0);
    } catch(e){
      patch.deaths = stats.deaths || 0;
      patch.beatenCount = stats.beatenCount || 0;
    }
    await patchJSON(refPath, patch);
    return patch;
  }

  async function updateUsername(name) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in");
    const clean = String(name || "").replace(/\s+/g, " ").trim().slice(0, 24);
    if (!clean) throw new Error("Enter a username");
    await patchJSON("/dashpoint/usersIndex/" + u.uid, { name: clean, lastSeen: Date.now() });
    // update local user object too
    if (user && user.uid === u.uid) user.name = clean;
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
      coins: fullSave.coins | 0,
      coinPaid: sanitizeObjectKeys(rawPaid),
      coinMigrated: !!fullSave.coinMigrated,
      skin: fullSave.skin | 0,
      unlocked: Array.isArray(fullSave.unlocked) ? fullSave.unlocked.slice() : [],
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
    if (cloud.coins) toSave.coins = Math.max(cloud.coins|0, toSave.coins|0);
    if (cloud.coinMigrated) toSave.coinMigrated = true;
    if (cloud.coinPaid) {
      const mergedPaid = sanitizeObjectKeys(desanitizeObjectKeys(cloud.coinPaid));
      const localPaid = sanitizeObjectKeys(rawPaid);
      for (var pk in localPaid) mergedPaid[pk] = true;
      toSave.coinPaid = mergedPaid;
    }
    if (cloud.skin && toSave.skin === 1 && cloud.skin !== 1) toSave.skin = cloud.skin;
    if (cloud.secretA) toSave.secretA = true;
    if (cloud.spaceMenu) toSave.spaceMenu = true;
    await putJSON(path, toSave);
    await syncStats({ deaths: toSave.deaths, beatenCount: Object.keys(toSave.beaten).length });
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
    return cloud;
  }

  async function submitLeaderboard(levelFile, time, skin) {
    const u = getEffectiveUser() || getUser();
    if (!u) throw new Error("Not logged in");
    const lbPath = "/dashpoint/leaderboards/" + sanitizeFirebaseKey(levelFile);
    let existing = null;
    try { const all = await getJSON(lbPath); if (all && all[u.uid]) existing = all[u.uid]; } catch(e){}
    if (existing && existing.time != null && time >= existing.time) {
      const list = await getLeaderboard(levelFile);
      let rank=-1; for(let i=0;i<list.length;i++) if(list[i].uid===u.uid) rank=i+1;
      return { rank: rank, list: list, improved:false };
    }
    const entry = { time: time, name: u.name, skin: skin|0, updatedAt: Date.now() };
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
      const list = Object.keys(val).map(function(uid){ var v=val[uid]; return { uid:uid, time:v.time, name:v.name, skin:v.skin, updatedAt:v.updatedAt }; });
      list.sort(function(a,b){ return a.time - b.time; });
      return list.slice(0, limit);
    } catch(e){ return []; }
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
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
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
  const ADMIN_EMAILS = ["inkboym@inkboym.org"];
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

  async function deleteNetworkLevel(id, reason) {
    ensure();
    if (!isAdmin()) throw new Error("Only an admin can delete levels.");
    reason = String(reason || "").trim() || "Removed by an admin.";
    // fetch level entry to learn who authored it
    let entry = null;
    try { entry = await getJSON("/dashpoint/levelsIndex/" + encodeURIComponent(id)); } catch(e) {}
    const authorUid = entry && entry.authorUid ? entry.authorUid : null;
    const title = entry && entry.title ? entry.title : String(id).slice(0, 24);

    // 1) delete level data + index entry + author's userLevels mapping
    try { await fetch(rtURL("/dashpoint/levelsData/" + encodeURIComponent(id)) + (await getAuthToken() ? "?auth=" + encodeURIComponent(await getAuthToken()) : ""), { method: "DELETE" }); } catch(e) {}
    try { await fetch(rtURL("/dashpoint/levelsIndex/" + encodeURIComponent(id)) + (await getAuthToken() ? "?auth=" + encodeURIComponent(await getAuthToken()) : ""), { method: "DELETE" }); } catch(e) {}
    if (authorUid) {
      try { await fetch(rtURL("/dashpoint/userLevels/" + encodeURIComponent(authorUid) + "/" + encodeURIComponent(id)) + (await getAuthToken() ? "?auth=" + encodeURIComponent(await getAuthToken()) : ""), { method: "DELETE" }); } catch(e) {}
    }

    // 2) write a deletion notice for the author (so they see a popup next login)
    if (authorUid) {
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

  return {
    init: ensure,
    onAuth: onAuth,
    getUser: getUser,
    register: register,
    login: login,
    logout: logout,
    loadLevelIndex: loadLevelIndex,
    fetchLevel: fetchLevel,
    postLevel: postLevel,
    bumpPlays: bumpPlays,
    loadUsersIndex: loadUsersIndex,
    getUserProfile: getUserProfile,
    syncStats: syncStats,
    updateUsername: updateUsername,
    syncCloud: syncCloud,
    downloadCloud: downloadCloud,
    submitLeaderboard: submitLeaderboard,
    getLeaderboard: getLeaderboard,
    saveGhostLocal: saveGhostLocal,
    getGhostLocal: getGhostLocal,
    saveGhostCloud: saveGhostCloud,
    getGhostCloud: getGhostCloud,
    listSaves: listSaves,
    getSave: getSave,
    saveLocal: saveLocal,
    deleteSave: deleteSave,
    isAdmin: isAdmin,
    deleteNetworkLevel: deleteNetworkLevel,
    getDeletionNotices: getDeletionNotices,
    clearDeletionNotices: clearDeletionNotices,
    friendly: friendly,
  };
})();
