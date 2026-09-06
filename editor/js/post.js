/* DashPoint Network posting for the editor */
(function () {
  const DPNet = window.DPNet;

  const STYLE = document.createElement("style");
  STYLE.textContent = [
    "#modalPost .modal{width:min(540px,calc(100vw - 32px))}",
    "#modalPost label{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:10px 0 4px}",
    "#postTitle,#postDesc{width:100%;background:var(--inset);border:1px solid var(--line);color:var(--text);border-radius:6px;padding:8px 10px;font-family:var(--font);font-size:13px}",
    "#postDesc{resize:vertical;min-height:70px}",
    ".face-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 2px; }",
    ".face-row button { background: none; border: 3px solid transparent; padding: 4px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 3px; }",
    ".face-row button img { width: 46px; height: auto; image-rendering: pixelated; opacity: 0.35; }",
    ".face-row button span { font-family: var(--mono); font-size: 9px; letter-spacing: 1px; color: var(--muted); }",
    ".face-row button.on { border-color: var(--cyan); background: rgba(46,230,255,.08); }",
    ".face-row button.on img { opacity: 1; filter: drop-shadow(0 0 8px rgba(46,230,255,.7)); }",
    "#postMsg{min-height:18px;font-size:12px;color:var(--muted);margin:8px 0 0}",
    "#postAuthBox input{margin-bottom:6px}",
    ".post-note{font-size:11px;color:var(--muted);margin:6px 0 0}",
  ].join("\n");
  document.head.appendChild(STYLE);

  const MODAL = [
    '<div class="modal-root" id="modalPost"><div class="modal">',
    "<h2>POST TO DASHPOINT NETWORK</h2>",
    '<div id="postAuthBox">',
    '<p class="post-note">You need an account to post levels. Searching and playing are account-free.</p>',
    '<label>Email</label><input type="email" id="postEmail" maxlength="64" placeholder="email" />',
    '<label>Password</label><input type="password" id="postPass" maxlength="64" placeholder="password" />',
    '<div class="row" style="margin-top:8px"><button class="text-btn good grow" id="postLoginBtn">Log in</button><button class="text-btn gold grow" id="postRegBtn">Register</button></div>',
    "</div>",
    '<div id="postForm" style="display:none">',
    '<label>Title</label><input type="text" id="postTitle" maxlength="48" placeholder="Level title" />',
    "<label>Description</label><textarea id=\"postDesc\" maxlength=\"300\" placeholder=\"What makes this level special?\"></textarea>",
    "<label>Difficulty (how hard you think it is)</label>",
    '<div class="face-row" id="postFaces"></div>',
    '<p class="post-note" id="postWho"></p>',
    '<div class="row" style="margin-top:12px;justify-content:flex-end"><button class="text-btn good" id="postSend">POST LEVEL</button></div>',
    "</div>",
    '<p id="postMsg"></p>',
    '<div class="row" style="margin-top:10px;justify-content:flex-end"><button class="text-btn" data-close="modalPost">Close</button></div>',
    "</div></div>",
  ].join("");

  let difficulty = 2;
  const FACES = [
    { src: "assets/ui/diff-easy.png", name: "EASY" },
    { src: "assets/ui/diff-normal.png", name: "NORMAL" },
    { src: "assets/ui/diff-hard.png", name: "HARD" },
    { src: "assets/ui/diff-harder.png", name: "HARDER" },
    { src: "assets/ui/diff-torture.png", name: "TORTURE" },
  ];
  let currentUser = null;
  let busy = false;

  function el(id) { return document.getElementById(id); }

  function msg(text) { el("postMsg").textContent = text || ""; }

  function renderFaces() {
    const row = el("postFaces");
    row.innerHTML = "";
    FACES.forEach((f, i) => {
      const b = document.createElement("button");
      if (i + 1 === difficulty) b.className = "on";
      b.innerHTML = '<img src="' + f.src + '" alt="" /><span>' + f.name + "</span>";
      b.addEventListener("click", () => { difficulty = i + 1; renderFaces(); });
      row.appendChild(b);
    });
  }

  function syncAuth() {
    const logged = !!currentUser;
    el("postAuthBox").style.display = logged ? "none" : "";
    el("postForm").style.display = logged ? "" : "none";
    if (logged) {
      el("postWho").textContent = "Posting as " + currentUser.name;
      const st = window.DashPointEditor && window.DashPointEditor.getState();
      if (st && !el("postTitle").value) el("postTitle").value = String(st.level.name || "Untitled");
    }
  }

  function open() {
    if (!el("modalPost")) return;
    document.getElementById("modalPost").classList.add("visible");
    const st = window.DashPointEditor && window.DashPointEditor.getState();
    el("postTitle").value = st ? String(st.level.name || "") : "";
    el("postDesc").value = "";
    difficulty = 2;
    renderFaces();
    syncAuth();
    msg("");
  }

  function close() {
    const m = el("modalPost");
    if (m) m.classList.remove("visible");
  }

  async function act(fn) {
    if (busy) return;
    busy = true;
    msg("…");
    try {
      await fn();
      msg("");
    } catch (err) {
      msg(DPNet.friendly(err));
    }
    busy = false;
  }

  function boot() {
    const holder = document.createElement("div");
    holder.innerHTML = MODAL;
    const modalEl = holder.firstElementChild;
    document.body.appendChild(modalEl);

    DPNet.onAuth((u) => { currentUser = u; syncAuth(); });

    modalEl.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-close]")) close();
    });

    document.getElementById("btnPost").addEventListener("click", open);
    el("postLoginBtn").addEventListener("click", () => act(() => DPNet.login(el("postEmail").value.trim(), el("postPass").value)));
    el("postRegBtn").addEventListener("click", () => act(() => DPNet.register(el("postEmail").value.trim(), el("postPass").value)));
    el("postSend").addEventListener("click", () =>
      act(async () => {
        const title = el("postTitle").value.trim();
        if (!title) { throw new Error("Give your level a title."); }
        const ed = window.DashPointEditor;
        const json = ed.exportJSON();
        const v = ed.getLevel().counts();
        if (v.goal < 1) throw new Error("Your level needs a goal before posting.");
        const tags = json.meta && Array.isArray(json.meta.tags) ? json.meta.tags.slice(0, 8) : [];
        const id = await DPNet.postLevel(
          { title: title, desc: el("postDesc").value.trim(), difficulty: difficulty, tags: tags },
          json
        );
        msg("");
        close();
        const status = document.getElementById("statusMain");
        if (status) status.textContent = "Posted to network as " + id;
      })
    );
    el("modalPost").addEventListener("click", (ev) => {
      if (ev.target === el("modalPost")) close();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.code === "Escape" && el("modalPost").classList.contains("visible")) {
        ev.stopPropagation();
        close();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
