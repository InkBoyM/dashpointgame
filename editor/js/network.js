/* DashPoint Network — levels/users over Firebase */
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

  let db = null;
  let user = null;
  const authListeners = [];

  function ensure() {
    if (typeof firebase === "undefined") throw new Error("Firebase did not load");
    if (!db) {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG);
      db = firebase.database();
      firebase.auth().onAuthStateChanged((u) => {
        user = u ? { uid: u.uid, name: String(u.email || "player").split("@")[0].slice(0, 16) } : null;
        for (const fn of authListeners) fn(user);
      });
    }
    return db;
  }

  function onAuth(fn) { ensure(); authListeners.push(fn); fn(user); }
  function getUser() { return user; }

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
    return firebase.auth().signOut();
  }

  async function loadLevelIndex() {
    ensure();
    const snap = await db.ref("dashpoint/levelsIndex").once("value");
    const val = snap.val() || {};
    return Object.keys(val).map((id) => Object.assign({ id: id }, val[id]));
  }

  async function fetchLevel(id) {
    ensure();
    const snap = await db.ref("dashpoint/levelsData/" + id).once("value");
    if (!snap.exists()) throw new Error("Level not found.");
    return snap.val();
  }

  async function postLevel(meta, data) {
    ensure();
    const u = getUser();
    if (!u) throw new Error("You need an account to post levels.");
    const id = db.ref("dashpoint/levelsData").push().key;
    const payload = JSON.parse(JSON.stringify({
      format: data.format,
      version: data.version,
      name: String(meta.title || data.name || "Untitled").slice(0, 48),
      cols: data.cols,
      rows: data.rows,
      tileSize: data.tileSize,
      spawn: data.spawn,
      tiles: data.tiles,
      texts: data.texts || [],
      gameplay: data.gameplay,
      theme: data.theme,
      meta: data.meta || {},
    }));
    await db.ref("dashpoint/levelsData/" + id).set(payload);
    await db.ref("dashpoint/levelsIndex/" + id).set({
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
    await db.ref("dashpoint/userLevels/" + u.uid + "/" + id).set(true);
    return id;
  }

  async function bumpPlays(id) {
    try {
      const ref = db.ref("dashpoint/levelsIndex/" + id + "/plays");
      await ref.transaction((v) => (v || 0) + 1);
    } catch (e) {}
  }

  async function loadUsersIndex() {
    ensure();
    const snap = await db.ref("dashpoint/usersIndex").once("value");
    const val = snap.val() || {};
    return Object.keys(val).map((uid) => Object.assign({ uid: uid }, val[uid]));
  }

  async function syncStats(stats) {
    ensure();
    const u = getUser();
    if (!u) return null;
    const ref = db.ref("dashpoint/usersIndex/" + u.uid);
    const cloudSnap = await ref.once("value");
    const cloud = cloudSnap.val() || {};
    const merged = {
      name: u.name,
      deaths: Math.max(cloud.deaths || 0, stats.deaths || 0),
      beatenCount: Math.max(cloud.beatenCount || 0, stats.beatenCount || 0),
      lastSeen: Date.now(),
    };
    await ref.update(merged);
    return merged;
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
    if (err && err.code === "permission_denied") return "Firebase denied writes — update Realtime Database rules.";
    return (err && err.message) || String(err);
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
    syncStats: syncStats,
    listSaves: listSaves,
    getSave: getSave,
    saveLocal: saveLocal,
    deleteSave: deleteSave,
    friendly: friendly,
  };
})();
