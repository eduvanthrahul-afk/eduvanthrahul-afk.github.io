/* Desk layer: wood, sound, and seven secrets. */
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("desk:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("desk:" + k, JSON.stringify(v)); } catch (e) { /* private mode: fine */ } }
  };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* =========================================================
     WOOD: four walnut planks, grain that bends around knots,
     butt joints, seams, and a little grain noise. Tiles at 1000px.
     ========================================================= */
  function woodTexture(W = 1000, H = 1000) {
    const r = rng(1987);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const planks = 4, ph = H / planks;
    const tones = [[61, 42, 30], [52, 36, 26], [66, 46, 33], [48, 33, 24]];
    const wrapDx = (x, kx) => { let d = x - kx; if (d > W / 2) d -= W; if (d < -W / 2) d += W; return d; };
    for (let p = 0; p < planks; p++) {
      const y0 = p * ph, [R, G, B] = tones[p];
      const grad = g.createLinearGradient(0, y0, 0, y0 + ph);
      grad.addColorStop(0, `rgb(${R + 6},${G + 4},${B + 3})`);
      grad.addColorStop(.5, `rgb(${R},${G},${B})`);
      grad.addColorStop(1, `rgb(${R - 8},${G - 6},${B - 5})`);
      g.fillStyle = grad; g.fillRect(0, y0, W, ph);
      const knots = Array.from({ length: 1 + Math.floor(r() * 2) }, () => ({ x: r() * W, y: y0 + ph * (.3 + r() * .4), s: 18 + r() * 26 }));
      g.save(); g.beginPath(); g.rect(0, y0, W, ph); g.clip();
      const lines = 64;
      for (let i = 0; i < lines; i++) {
        const yb = y0 + (i + .5) * ph / lines;
        const k1 = 1 + Math.floor(r() * 2), k2 = 3 + Math.floor(r() * 3);
        const ph1 = r() * 6.28, ph2 = r() * 6.28, a1 = 2 + r() * 5, a2 = .6 + r() * 1.6;
        const dark = r() < .78;
        g.strokeStyle = dark ? `rgba(18,10,5,${.08 + r() * .2})` : `rgba(255,205,150,${.03 + r() * .05})`;
        g.lineWidth = .5 + r() * 1.6;
        g.beginPath();
        for (let x = 0; x <= W; x += 5) {
          let y = yb + a1 * Math.sin(6.2832 * k1 * x / W + ph1) + a2 * Math.sin(6.2832 * k2 * x / W + ph2);
          for (const k of knots) {
            const dx = wrapDx(x, k.x), dy = yb - k.y;
            const f = Math.exp(-(dx * dx) / (k.s * k.s * 9) - (dy * dy) / (k.s * k.s * 4));
            y += Math.sign(dy || 1) * k.s * 1.25 * f;
          }
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      }
      for (const k of knots) for (const ox of [-W, 0, W]) {
        for (let ring = 6; ring >= 1; ring--) {
          g.strokeStyle = `rgba(20,10,4,${.12 + (6 - ring) * .05})`; g.lineWidth = 1.1;
          g.beginPath(); g.ellipse(k.x + ox, k.y, k.s * .22 * ring, k.s * .09 * ring, 0, 0, 6.2832); g.stroke();
        }
        g.fillStyle = "rgba(18,8,3,.55)"; g.beginPath(); g.ellipse(k.x + ox, k.y, k.s * .2, k.s * .08, 0, 0, 6.2832); g.fill();
      }
      // butt joint where two boards meet end-to-end
      const jx = r() * W;
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(jx, y0, 2, ph);
      g.fillStyle = "rgba(255,220,180,.05)"; g.fillRect(jx + 2, y0, 1, ph);
      g.restore();
      // seam between planks
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, y0, W, 2);
      g.fillStyle = "rgba(255,220,180,.06)"; g.fillRect(0, y0 + 2, W, 1);
    }
    const n = g.getImageData(0, 0, W, H), d = n.data;
    for (let i = 0; i < d.length; i += 4) { const v = (r() - .5) * 14; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    g.putImageData(n, 0, 0);
    return c.toDataURL("image/jpeg", .86);
  }
  try {
    const wood = woodTexture();
    Object.assign(document.body.style, { backgroundImage: `url(${wood})`, backgroundSize: "1000px 1000px", backgroundAttachment: "scroll", backgroundRepeat: "repeat" });
  } catch (e) { /* CSS stripes remain as fallback */ }

  /* =========================================================
     SOUND: synthesized paper noises (no audio files)
     ========================================================= */
  let ctx = null, muted = store.get("muted", false);
  const soundBtn = $("#sound");
  function paintSound() { if (soundBtn) { soundBtn.textContent = muted ? "♪ off" : "♪ on"; soundBtn.setAttribute("aria-pressed", String(!muted)); } }
  paintSound();
  soundBtn && soundBtn.addEventListener("click", () => { muted = !muted; store.set("muted", muted); paintSound(); if (!muted) sfx.click(); });
  function ac() {
    if (muted) return null;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { return null; }
    return ctx;
  }
  function noise(a, dur) {
    const b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(); s.buffer = b; return s;
  }
  function burst(a, t, dur, freq, q, vol, type = "bandpass") {
    const s = noise(a, dur), f = a.createBiquadFilter(), v = a.createGain();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vol, t + .004); v.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f).connect(v).connect(a.destination); s.start(t); s.stop(t + dur);
  }
  const sfx = {
    tear() { const a = ac(); if (!a) return; const t = a.currentTime; for (let i = 0; i < 22; i++) burst(a, t + i * .018 + Math.random() * .01, .05, 1800 + Math.random() * 2600, 1.2, .16 + Math.random() * .12); },
    crumple() { const a = ac(); if (!a) return; const t = a.currentTime; for (let i = 0; i < 14; i++) burst(a, t + Math.random() * .45, .03 + Math.random() * .05, 900 + Math.random() * 3500, .9, .2, "highpass"); },
    thump() {
      const a = ac(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), v = a.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + .18);
      v.gain.setValueAtTime(.5, t); v.gain.exponentialRampToValueAtTime(.001, t + .25);
      o.connect(v).connect(a.destination); o.start(t); o.stop(t + .26); burst(a, t, .05, 500, .7, .3, "lowpass");
    },
    click() { const a = ac(); if (!a) return; burst(a, a.currentTime, .025, 3200, 2, .25); },
    key() { const a = ac(); if (!a) return; const t = a.currentTime; burst(a, t, .02, 2400, 3, .3); burst(a, t + .012, .04, 700, 1, .15, "lowpass"); },
    ding() {
      const a = ac(); if (!a) return; const t = a.currentTime;
      [1318, 1975].forEach((f, i) => { const o = a.createOscillator(), v = a.createGain(); o.type = "sine"; o.frequency.value = f; v.gain.setValueAtTime(0, t + i * .09); v.gain.linearRampToValueAtTime(.12, t + i * .09 + .01); v.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .9); o.connect(v).connect(a.destination); o.start(t + i * .09); o.stop(t + 1.2); });
    }
  };
  window.deskSfx = sfx;
  const rip = $("#rip");
  rip && rip.addEventListener("click", () => sfx.tear(), { once: true });

  /* =========================================================
     SECRETS: tracker, toast, finale
     ========================================================= */
  const ALL = ["lamp", "ball1", "ball2", "mug", "redact", "peel", "hire"];
  const LABEL = { lamp: "lights out", ball1: "draft #1", ball2: "draft #2", mug: "under the mug", redact: "declassified", peel: "under the sticker", hire: "the magic word" };
  let found = new Set(store.get("found", []).filter((s) => ALL.includes(s)));
  const tracker = $("#tracker"), tBtn = $("#tracker-btn"), tList = $("#tracker-list");

  function paintTracker() {
    $("#found-n").textContent = found.size;
    $("#tally").textContent = "|".repeat(found.size);
    tList.querySelectorAll("li").forEach((li) => li.classList.toggle("found", found.has(li.dataset.s)));
  }
  paintTracker();
  tBtn.addEventListener("click", () => {
    const open = tList.hidden;
    tList.hidden = !open; tBtn.setAttribute("aria-expanded", String(open)); sfx.click();
  });

  let toastTimer;
  function toast(html, ms = 3400) {
    const t = $("#toast"); t.innerHTML = html; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }
  function discover(id) {
    if (found.has(id)) return;
    found.add(id); store.set("found", [...found]); paintTracker();
    tracker.classList.remove("pop"); void tracker.offsetWidth; tracker.classList.add("pop");
    sfx.ding();
    if (found.size === ALL.length) setTimeout(certificate, 1600);
    else toast(`secret found: <b>${LABEL[id]}</b> · ${found.size}/${ALL.length}`);
  }

  /* ---------- modal ---------- */
  const modal = $("#modal"), mBody = $("#modal-body"), mX = $("#modal-x");
  let lastFocus = null;
  function openModal(html) {
    lastFocus = document.activeElement;
    mBody.innerHTML = html + '<span class="fold-lines" aria-hidden="true"></span>';
    modal.hidden = false;
    const p = $("#modal-paper"); p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
    mX.focus();
  }
  function closeModal() { modal.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  mX.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  function certificate() {
    openModal(`<div class="cert">
      <p class="type small">THIS DESK HEREBY AWARDS A</p>
      <p class="cert-title" id="modal-title">Certificate of Curiosity</p>
      <p class="hand" style="font-size:1.5rem;margin:6px 0">to: you, the visitor who looks under coffee mugs</p>
      <p>You found all ${ALL.length} secrets. That's the same instinct that finds bugs before users do. I'd like to work with people like that.</p>
      <p><a class="btn-tag" href="mailto:eduvanthrahul@gmail.com?subject=I%20found%20all%207%20secrets">✉ tell me you did it</a></p>
      <div class="stamp red">7 / 7 FOUND</div>
    </div>`);
    sfx.thump();
  }

  /* ---------- 1. lamp chain + UV torch ---------- */
  const chain = $("#chain"), dark = $("#dark");
  function setLights(off) {
    document.body.classList.toggle("lights-off", off);
    chain.setAttribute("aria-pressed", String(off));
    if (off) { discover("lamp"); toast("lights out. <b>sweep the torch</b> over the papers…", 3800); }
  }
  chain.addEventListener("click", () => {
    chain.classList.remove("pulled"); void chain.offsetWidth; chain.classList.add("pulled");
    sfx.click(); setTimeout(() => sfx.click(), 90);
    setLights(!document.body.classList.contains("lights-off"));
  });
  const moveTorch = (x, y) => { dark.style.setProperty("--mx", x + "px"); dark.style.setProperty("--my", y + "px"); };
  addEventListener("pointermove", (e) => moveTorch(e.clientX, e.clientY), { passive: true });
  addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) moveTorch(t.clientX, t.clientY); }, { passive: true });

  /* ---------- 2 & 3. crumpled drafts ---------- */
  const DRAFTS = {
    ball1: { title: "crumpled draft #1", body: "<p>Tagline, version 1:</p><p class=\"hand\" style=\"font-size:1.7rem\">“It works on my machine.”</p><p>Rejected. So I built TwinGuard instead, so that it works on <em>everyone's</em> machine. Even the ones with wheels.</p>" },
    ball2: { title: "crumpled draft #2", body: "<p>Portfolio, version 1: a white page with a bulleted list and a blue link.</p><p>We don't talk about portfolio version 1.</p><p class=\"hand\" style=\"font-size:1.4rem;color:var(--red)\">(this one has a desk.)</p>" }
  };
  ["ball1", "ball2"].forEach((id) => {
    const b = document.getElementById(id); if (!b) return;
    if (found.has(id)) b.classList.add("opened");
    b.addEventListener("click", () => {
      sfx.crumple();
      openModal(`<h3 id="modal-title">${DRAFTS[id].title}</h3>${DRAFTS[id].body}`);
      b.classList.add("opened"); discover(id);
    });
  });

  /* ---------- 4. coffee mug: drag it aside ---------- */
  const mug = $("#mug");
  if (mug) {
    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    const place = (x, y) => { mug.style.transform = `translate(${x}px, ${y}px)`; };
    const check = () => { if (Math.hypot(ox, oy) > 70) discover("mug"); };
    mug.addEventListener("pointerdown", (e) => { drag = true; sx = e.clientX - ox; sy = e.clientY - oy; mug.setPointerCapture(e.pointerId); mug.classList.add("dragging"); });
    mug.addEventListener("pointermove", (e) => { if (!drag) return; ox = e.clientX - sx; oy = e.clientY - sy; place(ox, oy); });
    const end = () => { if (!drag) return; drag = false; mug.classList.remove("dragging"); check(); };
    mug.addEventListener("pointerup", end); mug.addEventListener("pointercancel", end);
    mug.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ox = ox ? 0 : 120; oy = ox ? 40 : 0; place(ox, oy); check(); } });
  }

  /* ---------- 5. declassify every redaction ---------- */
  const bars = [...document.querySelectorAll(".redact")];
  const seen = new Set();
  bars.forEach((el, i) => {
    const mark = () => {
      seen.add(i); el.classList.add("peek");
      if (seen.size === bars.length) { discover("redact"); const conf = document.querySelector(".conf"); if (conf) conf.textContent = "DECLASSIFIED"; }
    };
    el.addEventListener("mouseenter", mark); el.addEventListener("focus", mark); el.addEventListener("click", mark);
  });

  /* ---------- 6. peel the sticker ---------- */
  const peel = $("#peel");
  peel && peel.addEventListener("click", () => {
    const off = peel.classList.toggle("peeled");
    if (off) { sfx.tear(); discover("peel"); }
  });

  /* ---------- 7. type h-i-r-e ---------- */
  const word = "hire"; let buf = "";
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    const tag = (e.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "textarea") return;
    buf = (buf + e.key.toLowerCase()).slice(-word.length);
    if (word.startsWith(buf.slice(-1)) || word.includes(buf)) sfx.key();
    if (buf === word) { buf = ""; hired(); }
  });
  function hired() {
    sfx.thump();
    const s = document.createElement("div");
    s.className = "big-stamp";
    s.innerHTML = 'APPROVED<small>great call. eduvanthrahul@gmail.com</small>';
    document.body.appendChild(s); setTimeout(() => s.remove(), 4400);
    if (!reduceMotion) {
      const colors = ["#f6f0e1", "#ffe680", "#ffc5a8", "#bfe6c9", "#9fc3ea", "#c69a64", "#fbfaf3"];
      for (let i = 0; i < 46; i++) {
        const p = document.createElement("i");
        p.className = "scrap";
        const w = 8 + Math.random() * 14;
        Object.assign(p.style, { left: Math.random() * 100 + "vw", width: w + "px", height: w * (1 + Math.random()) + "px", background: colors[i % colors.length], animationDuration: 2.4 + Math.random() * 2.4 + "s", animationDelay: Math.random() * .6 + "s", clipPath: `polygon(${Math.random() * 30}% 0, 100% ${Math.random() * 30}%, ${70 + Math.random() * 30}% 100%, 0 ${70 + Math.random() * 30}%)` });
        p.style.setProperty("--dx", (Math.random() - .5) * 300 + "px");
        p.style.setProperty("--rot", (Math.random() - .5) * 1440 + "deg");
        document.body.appendChild(p); setTimeout(() => p.remove(), 6000);
      }
    }
    discover("hire");
  }

  /* =========================================================
     tear-off tabs, 3D tilt, and a note for whoever opens devtools
     ========================================================= */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      sfx.tear();
      tab.style.setProperty("--spin", (Math.random() > .5 ? 1 : -1) * (40 + Math.random() * 90) + "deg");
      tab.classList.add("torn");
      setTimeout(() => { tab.classList.remove("torn"); tab.style.opacity = ""; }, 4000);
    });
  });

  if (!reduceMotion && matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".file").forEach((f) => {
      f.addEventListener("pointermove", (e) => {
        const b = f.getBoundingClientRect();
        const px = (e.clientX - b.left) / b.width - .5, py = (e.clientY - b.top) / b.height - .5;
        f.style.setProperty("--ry", (px * 7).toFixed(2) + "deg");
        f.style.setProperty("--rx", (-py * 6).toFixed(2) + "deg");
      });
      f.addEventListener("pointerleave", () => { f.style.removeProperty("--rx"); f.style.removeProperty("--ry"); });
    });
  }

  console.log("%c  you opened devtools.  ", "font:700 16px Georgia;background:#f6f0e1;color:#c4372d;padding:6px 10px;border:2px dashed #c4372d");
  console.log("%cthat's the kind of curiosity I like. there are 7 secrets on this desk; the tracker is bottom-left.\nsay hi → eduvanthrahul@gmail.com", "font:14px monospace;color:#1f4e8c");
})();
