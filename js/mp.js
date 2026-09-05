/* DashPoint online rooms via Firebase — accounts required */
window.DashPointMP = (function () {
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD8Wmunm-_YNlRJChjLRiZla0cFZMjBTzs",
    authDomain: "betterpixelart.firebaseapp.com",
    databaseURL: "https://betterpixelart-default-rtdb.firebaseio.com",
    projectId: "betterpixelart",
    storageBucket: "betterpixelart.firebasestorage.app",
    messagingSenderId: "79165567652",
    appId: "1:79165567652:web:a26980df6a97adc2c52c31",
  };
  const ROOT = "dashpoint/rooms";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const PEER_TIMEOUT = 9000;
  const HEARTBEAT_MS = 3000;
  const FLUSH_MS = 50;

  let db = null;
  let roomRef = null;
  let meRef = null;
  let code = "";
  let slot = null;
  let active = false;
  let user = null;
  let cachedPlayers = null;
  let watchers = [];
  let heartbeatTimer = null;
  let flushTimer = null;
  let pendingCube = null;
  let cubeActive = false;
  let cbs = {};

  function ensureDb() {
    if (typeof firebase === "undefined") throw new Error("Firebase did not load (offline?)");
    if (!db) {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
      firebase.auth().onAuthStateChanged((u) => {
        user = u
          ? { uid: u.uid, name: String(u.email || "player").split("@")[0].slice(0, 16) }
          : null;
        if (!user && active) leave(false);
        emitState();
      });
    }
    return db;
  }

  function emitState() {
    if (cbs.onState) cbs.onState();
  }

  function watch(ref, event, cb) {
    ref.on(event, cb);
    watchers.push({ ref: ref, event: event, cb: cb });
  }

  function unwatchAll() {
    for (const w of watchers) {
      try { w.ref.off(w.event, w.cb); } catch (e) {}
    }
    watchers = [];
  }

  function otherSlot() {
    return slot === "host" ? "guest" : "host";
  }

  function makeCode() {
    let s = "";
    for (let i = 0; i < 5; i++) s += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    return s;
  }

  function requireUser() {
    ensureDb();
    if (!user) throw new Error("Log in to an account first.");
  }

  async function writeMe() {
    if (!meRef || !user) return;
    await meRef.update({
      name: user.name,
      uid: user.uid,
      ts: Date.now(),
    }).catch(() => {});
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (meRef) meRef.update({ ts: Date.now() }).catch(() => {});
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }

  function startFlush() {
    stopFlush();
    flushTimer = setInterval(flushCube, FLUSH_MS);
  }

  function stopFlush() {
    if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
  }

  function flushCube() {
    if (!active || !meRef) return;
    const b = pendingCube;
    if (b && cubeActive && (!lastSent || b.x !== lastSent.x || b.y !== lastSent.y || Math.round(b.rot) !== Math.round(lastSent.rot) || b.dead !== lastSent.dead || b.won !== lastSent.won || b.level !== lastSent.level)) {
      lastSent = { x: b.x, y: b.y, rot: b.rot, dead: b.dead, won: b.won, level: b.level };
      meRef.child("cube").set({
        x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10,
        rot: Math.round(b.rot),
        skin: b.skin | 0,
        dead: !!b.dead,
        won: !!b.won,
        level: String(b.level || ""),
        ts: Date.now(),
      }).catch(() => {});
    }
  }

  let lastSent = null;

  function teardownLocal() {
    stopHeartbeat();
    stopFlush();
    unwatchAll();
    roomRef = null;
    meRef = null;
    slot = null;
    active = false;
    code = "";
    cachedPlayers = null;
    pendingCube = null;
    cubeActive = false;
    lastSent = null;
  }

  async function host() {
    requireUser();
    await leave(true);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = makeCode();
      const ref = db.ref(ROOT + "/" + candidate);
      const snap = await ref.once("value");
      if (snap.exists()) continue;
      code = candidate;
      slot = "host";
      roomRef = ref;
      break;
    }
    if (!roomRef) throw new Error("Could not allocate a room code, try again.");
    meRef = roomRef.child("players/" + slot);
    await safeSet(roomRef.child("meta"), { createdAt: Date.now(), hostName: user.name });
    await roomRef.onDisconnect().remove();
    await writeMe();
    active = true;
    listen();
    startHeartbeat();
    startFlush();
    emitState();
  }

  async function join(joinCode) {
    requireUser();
    const clean = String(joinCode || "").trim().toUpperCase();
    if (clean.length !== 5) throw new Error("Room codes are 5 characters.");
    await leave(true);
    code = clean;
    const ref = db.ref(ROOT + "/" + clean);
    const snap = await ref.once("value");
    if (!snap.exists()) throw new Error("No room with code " + clean + ".");
    slot = "guest";
    roomRef = ref;
    meRef = roomRef.child("players/guest");
    const claim = await meRef.transaction((cur) => {
      if (cur && cur.ts && Date.now() - cur.ts < PEER_TIMEOUT) return;
      return { name: user.name, uid: user.uid, ts: Date.now() };
    });
    if (!claim.committed) {
      roomRef = null;
      slot = null;
      code = "";
      throw new Error("That room already has two players.");
    }
    await meRef.onDisconnect().remove();
    active = true;
    listen();
    startHeartbeat();
    startFlush();
    emitState();
  }

  async function leave(endSession) {
    const wasHost = slot === "host";
    const refs = { roomRef: roomRef, meRef: meRef };
    teardownLocal();
    if (refs.roomRef) {
      try {
        if (wasHost) await refs.roomRef.remove();
        else if (refs.meRef) await refs.meRef.remove();
      } catch (e) {}
    }
    emitState();
  }

  let warnedWriteError = false;

  function reportWriteError(err) {
    if (warnedWriteError) return;
    warnedWriteError = true;
    const msg = err && err.code === "permission_denied"
      ? "Firebase denied writes — set Realtime Database rules to allow the dashpoint path."
      : "Firebase write failed: " + ((err && err.message) || err);
    if (cbs.onNotice) cbs.onNotice(msg);
  }

  function safeSet(ref, value) {
    return ref.set(value).catch((err) => {
      reportWriteError(err);
      throw err;
    });
  }

  function listen() {
    watch(roomRef, "value", (snap) => {
      if (!snap.exists() && active) {
        const wasGuest = slot === "guest";
        teardownLocal();
        emitState();
        if (cbs.onKicked) cbs.onKicked(wasGuest ? "The host closed the room." : "Room closed.");
      }
    });
    watch(roomRef.child("players"), "value", (snap) => {
      cachedPlayers = snap.val() || {};
      emitState();
    });
  }

  function sendCube(data) {
    if (!active) return;
    cubeActive = true;
    pendingCube = data;
  }

  function clearCube() {
    if (!cubeActive) return;
    cubeActive = false;
    pendingCube = null;
    lastSent = null;
    if (active && meRef) meRef.child("cube").remove().catch(() => {});
  }

  function peers() {
    if (!active || !cachedPlayers) return [];
    const other = cachedPlayers[otherSlot()];
    if (!other) return [];
    const cb = other.cube;
    const fresh = !!(cb && cb.ts && Date.now() - Number(cb.ts) < 4000);
    return [
      {
        name: String(other.name || "player"),
        online: Date.now() - (Number(other.ts) || 0) < PEER_TIMEOUT,
        level: cb ? String(cb.level || "") : "",
        cube: fresh
          ? {
              x: Number(cb.x) || 0,
              y: Number(cb.y) || 0,
              rot: Number(cb.rot) || 0,
              skin: Number(cb.skin) || 1,
              dead: !!cb.dead,
              won: !!cb.won,
            }
          : null,
      },
    ];
  }

  function peerOnline() {
    if (!cachedPlayers) return false;
    const other = cachedPlayers[otherSlot()];
    return !!other && Date.now() - (Number(other.ts) || 0) < PEER_TIMEOUT;
  }

  function peerName() {
    if (!cachedPlayers) return "";
    const other = cachedPlayers[otherSlot()];
    return other ? String(other.name || "player") : "";
  }

  async function register(email, password) {
    ensureDb();
    return firebase.auth().createUserWithEmailAndPassword(email, password);
  }

  async function login(email, password) {
    ensureDb();
    return firebase.auth().signInWithEmailAndPassword(email, password);
  }

  async function logout() {
    ensureDb();
    await firebase.auth().signOut();
  }

  window.addEventListener("beforeunload", () => {
    if (active) {
      try {
        if (slot === "host" && roomRef) roomRef.remove();
        else if (meRef) meRef.remove();
      } catch (e) {}
    }
  });

  return {
    configure: (cbsIn) => { cbs = cbsIn || {}; },
    init: ensureDb,
    getUser: () => user,
    isActive: () => active,
    getCode: () => code,
    getSlot: () => slot,
    getStatusLabel: () => {
      if (!active) return user ? "Logged in — not in a room" : "Offline";
      const label = (slot === "host" ? "Hosting " : "In room ") + code;
      return label + (peerOnline() ? " · with " + peerName() : "");
    },
    host: host,
    join: join,
    leave: leave,
    sendCube: sendCube,
    clearCube: clearCube,
    peers: peers,
    peerOnline: peerOnline,
    peerName: peerName,
    register: register,
    login: login,
    logout: logout,
  };
})();
