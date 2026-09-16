/* DashPoint co-op building — two (or more) editors, one level.
   Host shares a 5-letter room code; guests join and paint together.
   Sync model: debounced full-level snapshots (last writer wins) +
   live cursors + presence. Tiles, paths, zones, spawn, theme all ride
   the snapshot, so every feature stays in sync with no op protocol. */
(function () {
  const DPNet = window.DPNet;
  const CODE_ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const COLORS = ["#ffd23c", "#2ee6ff", "#3ee07a", "#ff5a6e", "#b45cff", "#ff9d2e", "#7db4ff", "#ff8cc6"];
  const PUSH_DEBOUNCE = 1500;
  const CHECK_MS = 700;
  const CURSOR_MS = 120;

  const S = {
    room: null, // room code
    uid: null,
    name: "",
    color: "#ffd23c",
    isHost: false,
    rev: 0,
    lastSeenRev: "",
    lastSnap: null,
    pending: null, // snapshot received mid-playtest, applied on stop
    pushTimer: 0,
    lastCheck: 0,
    lastCursor: 0,
    users: {},
    cursors: {},
    timer: 0,
    refs: null,
  };

  function bridge() { return window.DashPointEditor || null; }

  function db() {
    if (typeof firebase === "undefined" || !firebase.database) throw new Error("Network not ready — reload the editor.");
    if (DPNet && DPNet.init) DPNet.init();
    return firebase.database();
  }

  function me() {
    if (DPNet && DPNet.getUser) return DPNet.getUser();
    return null;
  }

  function myColor(uid) {
    let h = 0;
    const s = String(uid || "?");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  function genCode() {
    let c = "";
    for (let i = 0; i < 5; i++) c += CODE_ABC[(Math.random() * CODE_ABC.length) | 0];
    return c;
  }

  function roomRef(code) { return db().ref("dashpoint/coopRooms/" + code); }
  function setStatus(t) {
    const el = document.getElementById("coopStatus");
    if (el) el.textContent = t;
    const ed = bridge();
    if (ed && ed.setStatus) { try { ed.setStatus(t); } catch (e) {} }
  }

  function syncUserUI() {
    const box = document.getElementById("coopUsers");
    if (!box) return;
    const ids = Object.keys(S.users);
    if (!ids.length) {
      box.innerHTML = '<p class="hint">Nobody else here yet.</p>';
      return;
    }
    box.innerHTML = ids.map(function (id) {
      const u = S.users[id] || {};
      const you = id === S.uid ? " (you)" : "";
      return '<div class="stat"><span><span style="display:inline-block;width:10px;height:10px;background:' +
        escapeHtml(String(u.color || "#fff")) + ';margin-right:6px"></span>' +
        escapeHtml(String(u.name || "player")) + escapeHtml(you) + "</span><b>" + (u.host ? "HOST" : "GUEST") + "</b></div>";
    }).join("");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function updateCodeUI() {
    const big = document.getElementById("coopCode");
    if (big) big.textContent = S.room || "—";
    const dot = document.getElementById("coopDot");
    if (dot) dot.classList.toggle("saved", !S.room);
  }

  function isPlaying() {
    try {
      const ed = bridge();
      const st = ed && ed.getState ? ed.getState() : null;
      return !!(st && st.playing);
    } catch (e) { return false; }
  }

  function applyRemote(v) {
    S.lastSeenRev = v.rev;
    S.lastSnap = v.json;
    const ed = bridge();
    if (ed && ed.loadSnapshot) ed.loadSnapshot(v.json, v.byName || "partner");
  }

  function subscribe() {
    const ref = roomRef(S.room);
    S.refs = { ref: ref };
    ref.child("level").on("value", function (snap) {
      const v = snap.val();
      if (!v || !v.json || v.rev === S.lastSeenRev) return;
      if (v.by === S.uid) return;
      if (isPlaying()) {
        // never yank the level mid-playtest — apply on stop
        S.pending = v;
        return;
      }
      applyRemote(v);
    });
    ref.child("cursors").on("value", function (snap) {
      S.cursors = snap.val() || {};
    });
    ref.child("users").on("value", function (snap) {
      S.users = snap.val() || {};
      syncUserUI();
    });
  }

  function unsubscribe() {
    try {
      if (S.refs && S.refs.ref) {
        S.refs.ref.child("level").off();
        S.refs.ref.child("cursors").off();
        S.refs.ref.child("users").off();
      }
    } catch (e) {}
    S.refs = null;
  }

  function heartbeat() {
    if (!S.room || !S.uid) return;
    try {
      roomRef(S.room).child("users").child(S.uid).update({ t: Date.now() });
    } catch (e) {}
  }

  function pushSnapshot(force) {
    if (!S.room) return;
    const ed = bridge();
    if (!ed) return;
    let snap = null;
    try {
      snap = ed.snapshot();
    } catch (e) { return; }
    const rev = S.uid + ":" + (++S.rev) + ":" + Date.now();
    S.lastSeenRev = rev;
    S.lastSnap = snap;
    const meU = me();
    roomRef(S.room).child("level").set({
      rev: rev,
      json: snap,
      by: S.uid,
      byName: (meU && meU.name) || S.name,
      at: Date.now(),
    }).catch(function () {});
    if (force) setStatus("Synced to room " + S.room);
  }

  function schedulePush() {
    if (!S.room) return;
    if (S.pushTimer) return;
    S.pushTimer = setTimeout(function () {
      S.pushTimer = 0;
      pushSnapshot(false);
    }, PUSH_DEBOUNCE);
  }

  function tick() {
    if (!S.room) return;
    const now = Date.now();
    const ed = bridge();
    if (ed) {
      try {
        const st = ed.getState ? ed.getState() : null;
        if (st && !st.playing && S.pending) {
          // playtest ended: apply the edit that landed mid-run
          const v = S.pending;
          S.pending = null;
          if (v.rev !== S.lastSeenRev && v.by !== S.uid) applyRemote(v);
        }
        if (st && !st.playing && now - S.lastCheck > CHECK_MS) {
          S.lastCheck = now;
          let snap = null;
          try { snap = ed.snapshot(); } catch (e) {}
          if (snap && snap !== S.lastSnap) {
            S.lastSnap = snap;
            schedulePush();
          }
        }
        if (st && !st.playing && now - S.lastCursor > CURSOR_MS) {
          S.lastCursor = now;
          const h = st.hover;
          if (h && h.inside) {
            roomRef(S.room).child("cursors").child(S.uid).set({
              name: S.name, color: S.color, c: h.c, r: h.r,
              tool: st.tool || "", t: now,
            }).catch(function () {});
          }
        }
      } catch (e) {}
    }
    heartbeat();
  }

  function draw(ctx) {
    const ed = bridge();
    if (!ed || !S.room) return;
    const st = ed.getState ? ed.getState() : null;
    if (!st || !st.cam) return;
    const TILE = ed.TILE || 32;
    const ids = Object.keys(S.cursors);
    if (!ids.length) return;
    ctx.save();
    ctx.scale(st.cam.zoom, st.cam.zoom);
    ctx.translate(-st.cam.x, -st.cam.y);
    ctx.font = "bold 11px Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    const now = Date.now();
    for (const id of ids) {
      if (id === S.uid) continue;
      const cur = S.cursors[id];
      if (!cur || now - (cur.t || 0) > 8000) continue;
      const x = cur.c * TILE;
      const y = cur.r * TILE;
      const col = cur.color || "#fff";
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 2 / st.cam.zoom;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 2);
      ctx.lineTo(x + 3, y + 22);
      ctx.lineTo(x + 16, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(7,16,24,0.85)";
      const label = String(cur.name || "player").slice(0, 14);
      const wpx = ctx.measureText(label).width + 10;
      ctx.fillRect(x + 16, y - 4, wpx, 16);
      ctx.fillStyle = col;
      ctx.fillText(label, x + 21, y + 9);
    }
    ctx.restore();
  }

  async function host() {
    const u = me();
    if (!u) { setStatus("Log in first (Post tab) to host a co-op room."); return; }
    if (S.room) { setStatus("Already in room " + S.room + " — leave first."); return; }
    S.name = String(u.name || "player").slice(0, 16);
    S.uid = u.uid;
    S.color = myColor(u.uid);
    let code = genCode();
    for (let i = 0; i < 5; i++) {
      try {
        const snap = await roomRef(code).once("value");
        if (!snap.exists()) break;
      } catch (e) { break; }
      code = genCode();
    }
    const ed = bridge();
    if (!ed) { setStatus("Editor not ready."); return; }
    S.room = code;
    S.isHost = true;
    S.rev = 0;
    S.lastSeenRev = "";
    S.lastSnap = null;
    const ref = roomRef(code);
    await ref.set({
      meta: { host: u.uid, hostName: S.name, createdAt: Date.now(), expires: Date.now() + 6 * 3600 * 1000 },
      users: {},
      cursors: {},
    });
    try {
      ref.child("users").child(u.uid).onDisconnect().remove();
      ref.child("cursors").child(u.uid).onDisconnect().remove();
    } catch (e) {}
    await ref.child("users").child(u.uid).set({ name: S.name, color: S.color, host: true, t: Date.now() });
    subscribe();
    S.lastSnap = ed.snapshot();
    pushSnapshot(true);
    startLoop();
    updateCodeUI();
    openModal();
    setStatus("Hosting co-op room " + code + " — share the code!");
  }

  async function join() {
    const u = me();
    if (!u) { setStatus("Log in first (Post tab) to join a co-op room."); return; }
    if (S.room) { setStatus("Already in room " + S.room + " — leave first."); return; }
    if (isPlaying()) { setStatus("Stop the playtest first, then join."); return; }
    const inp = document.getElementById("coopJoin");
    const code = String((inp && inp.value) || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (!code) { setStatus("Type the room code first."); return; }
    let snap = null;
    try {
      snap = await roomRef(code).once("value");
    } catch (e) {
      setStatus("Could not reach the network.");
      return;
    }
    const room = snap.val();
    if (!room || !room.meta) { setStatus("Room " + code + " not found."); return; }
    if (room.meta.expires && room.meta.expires < Date.now()) { setStatus("Room " + code + " expired."); return; }
    const ed = bridge();
    if (!ed) { setStatus("Editor not ready."); return; }
    if (!room.level || !room.level.json) { setStatus("Room is empty — host opens it first."); return; }
    if (!confirm("Replace your current level with the room's level?")) return;
    S.name = String(u.name || "player").slice(0, 16);
    S.uid = u.uid;
    S.color = myColor(u.uid);
    S.room = code;
    S.isHost = false;
    S.rev = 0;
    S.lastSeenRev = room.level.rev || "";
    S.lastSnap = room.level.json;
    ed.loadSnapshot(room.level.json, (room.level.byName || "host"));
    const ref = roomRef(code);
    try {
      ref.child("users").child(u.uid).onDisconnect().remove();
      ref.child("cursors").child(u.uid).onDisconnect().remove();
    } catch (e) {}
    await ref.child("users").child(u.uid).set({ name: S.name, color: S.color, host: false, t: Date.now() });
    subscribe();
    startLoop();
    updateCodeUI();
    setStatus("Joined room " + code + " — happy building!");
  }

  async function leave() {
    if (!S.room) return;
    const code = S.room;
    try {
      const ref = roomRef(code);
      if (S.uid) {
        await ref.child("users").child(S.uid).remove().catch(function () {});
        await ref.child("cursors").child(S.uid).remove().catch(function () {});
      }
      try {
        const snap = await ref.child("users").once("value");
        if (!snap.exists()) await ref.remove().catch(function () {});
      } catch (e) {}
    } catch (e) {}
    stopLoop();
    unsubscribe();
    S.room = null;
    S.uid = null;
    S.pending = null;
    S.users = {};
    S.cursors = {};
    updateCodeUI();
    syncUserUI();
    setStatus("Left co-op room " + code + ".");
  }

  function startLoop() {
    stopLoop();
    S.timer = setInterval(tick, 400);
  }
  function stopLoop() {
    if (S.timer) { try { clearInterval(S.timer); } catch (e) {} }
    S.timer = 0;
    if (S.pushTimer) { try { clearTimeout(S.pushTimer); } catch (e) {} }
    S.pushTimer = 0;
  }

  function openModal() {
    const m = document.getElementById("modalCoop");
    if (m) m.classList.add("visible");
    syncUserUI();
    updateCodeUI();
  }

  function inRoom() { return !!S.room; }

  window.DashPointCoop = {
    host: host, join: join, leave: leave, draw: draw,
    inRoom: inRoom, syncNow: function () { pushSnapshot(true); },
    open: openModal,
  };

  document.addEventListener("DOMContentLoaded", function () {
    const b = document.getElementById("btnCoopHost");
    if (b) b.addEventListener("click", function () { host().catch(function (e) { setStatus(String((e && e.message) || e)); }); });
    const j = document.getElementById("btnCoopJoin");
    if (j) j.addEventListener("click", function () { join().catch(function (e) { setStatus(String((e && e.message) || e)); }); });
    const l = document.getElementById("btnCoopLeave");
    if (l) l.addEventListener("click", function () { leave().catch(function () {}); });
    const s = document.getElementById("btnCoopSync");
    if (s) s.addEventListener("click", function () { pushSnapshot(true); });
  });
})();
