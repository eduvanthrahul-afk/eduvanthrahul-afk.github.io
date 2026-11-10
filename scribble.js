/* Scribble layer: a pen tray so visitors can draw and stamp on the desk (saved in their browser),
   plus a few chalk doodles that draw themselves when scrolled into view. */
(() => {
  const root = document.documentElement, NS = "http://www.w3.org/2000/svg";
  const $ = (s, el = document) => el.querySelector(s);
  const sfx = (n) => { if (window.deskSfx && window.deskSfx[n]) window.deskSfx[n](); };
  const KEY = "desk:scribble", MAX = 500;
  const PEN = { pencil: { c: "#3b3b3b", w: 2.2, o: .85 }, marker: { c: "#f7e26b", w: 18, o: .55 }, red: { c: "#c4372d", w: 3.4, o: .9 } };
  const WORDS = ["HIRED", "APPROVED", "SHIP IT", "LGTM"];

  let items = [];
  try { const saved = JSON.parse(localStorage.getItem(KEY) || "[]"); if (Array.isArray(saved)) items = saved.slice(-MAX); } catch (e) { /* start clean */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX))); } catch (e) { /* private mode: drawing still works */ } };

  /* ---------- surfaces: highlighter multiplies into the paper, pens sit on top ---------- */
  const mkLayer = (cls) => { const s = document.createElementNS(NS, "svg"); s.setAttribute("class", "sc-layer " + cls); s.setAttribute("aria-hidden", "true"); const g = document.createElementNS(NS, "g"); s.appendChild(g); document.body.appendChild(s); return [s, g]; };
  const [hiSvg, hiG] = mkLayer("hi"), [penSvg, penG] = mkLayer("pen");
  const stamps = document.createElement("div"); stamps.className = "sc-stamps"; stamps.setAttribute("aria-hidden", "true"); document.body.appendChild(stamps);

  // x is stored relative to the page's centre line, so drawings stay on their paper when the window is resized
  const centre = () => root.clientWidth / 2;
  function fit() {
    hiSvg.style.height = penSvg.style.height = "0px";
    const h = root.scrollHeight + "px"; hiSvg.style.height = penSvg.style.height = h;
    const t = `translate(${centre()} 0)`; hiG.setAttribute("transform", t); penG.setAttribute("transform", t);
  }
  function pathD(p) {
    if (p.length < 4) return `M${p[0]} ${p[1]}l.1 .1`;
    let d = `M${p[0]} ${p[1]}`;
    for (let i = 2; i < p.length - 2; i += 2) d += `Q${p[i]} ${p[i + 1]} ${(p[i] + p[i + 2]) / 2} ${(p[i + 1] + p[i + 3]) / 2}`;
    return d + `L${p[p.length - 2]} ${p[p.length - 1]}`;
  }
  function addStroke(it) {
    const s = PEN[it.t] || PEN.pencil, el = document.createElementNS(NS, "path");
    el.setAttribute("d", pathD(it.p)); el.setAttribute("stroke", s.c); el.setAttribute("stroke-width", s.w); el.setAttribute("opacity", s.o);
    (it.t === "marker" ? hiG : penG).appendChild(el); it.el = el; return el;
  }
  function addStamp(it, fresh) {
    const el = document.createElement("span");
    el.className = "stamp red sc-stamp" + (fresh ? " new" : ""); el.textContent = it.w;
    el.style.left = it.x + "px"; el.style.top = it.y + "px"; el.style.rotate = it.r + "deg";
    stamps.appendChild(el); it.el = el;
  }
  const toJSON = (it) => it.k === "s" ? { k: "s", t: it.t, p: it.p } : { k: "t", x: it.x, y: it.y, r: it.r, w: it.w };
  const persist = () => { const live = items; items = items.map(toJSON); save(); items = live; };
  items.forEach((it) => it.k === "s" ? addStroke(it) : addStamp(it, false));
  fit();
  addEventListener("resize", fit);
  if ("ResizeObserver" in window) new ResizeObserver(fit).observe($("main") || document.body);

  /* ---------- pen tray ---------- */
  const tray = document.createElement("aside");
  tray.className = "sc-tray"; tray.setAttribute("aria-label", "Draw on the desk");
  tray.innerHTML = `
    <div class="sc-tools" id="sc-tools" hidden>
      <button class="sc-tool" data-tool="pencil" aria-pressed="true" style="--i:0">pencil</button>
      <button class="sc-tool" data-tool="marker" aria-pressed="false" style="--i:1">highlighter</button>
      <button class="sc-tool" data-tool="red" aria-pressed="false" style="--i:2">red pen</button>
      <button class="sc-tool" data-tool="stamp" aria-pressed="false" style="--i:3">stamp</button>
      <button class="sc-tool" data-act="undo" style="--i:4">undo</button>
      <button class="sc-tool" data-act="wipe" style="--i:5">wipe the desk</button>
    </div>
    <button class="sc-toggle hand" id="sc-toggle" aria-expanded="false" aria-controls="sc-tools">✎ draw on my desk</button>`;
  document.body.appendChild(tray);
  const toggle = $("#sc-toggle", tray), tools = $("#sc-tools", tray);
  let on = false, tool = "pencil", word = 0;

  function say(html) { const t = $("#toast"); if (!t) return; t.innerHTML = html; t.classList.add("show"); clearTimeout(say.timer); say.timer = setTimeout(() => t.classList.remove("show"), 3600); }
  function setMode(next) {
    on = next; root.classList.toggle("sc-on", on); tools.hidden = !on;
    toggle.setAttribute("aria-expanded", String(on)); toggle.textContent = on ? "✓ done drawing" : "✎ draw on my desk";
    sfx("click");
    if (on) { fit(); say("go on, <b>scribble anywhere</b>. it stays here for your next visit."); }
  }
  function setTool(t) {
    tool = t; root.classList.toggle("sc-stamping", t === "stamp");
    tools.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
  }
  toggle.addEventListener("click", () => setMode(!on));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && on) setMode(false); });
  tools.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tool) { setTool(b.dataset.tool); sfx("click"); return; }
    if (b.dataset.act === "undo") { const it = items.pop(); if (it && it.el) it.el.remove(); persist(); sfx("click"); }
    if (b.dataset.act === "wipe") { items.forEach((it) => it.el && it.el.remove()); items = []; persist(); sfx("crumple"); say("desk wiped. clean slate."); }
  });

  /* ---------- drawing ---------- */
  let cur = null;
  const pt = (e) => [Math.round((e.pageX - centre()) * 10) / 10, Math.round(e.pageY * 10) / 10];
  penSvg.addEventListener("pointerdown", (e) => {
    if (!on || e.button > 0) return;
    e.preventDefault();
    const [x, y] = pt(e);
    if (tool === "stamp") {
      const it = { k: "t", x, y, r: Math.round((Math.random() - .5) * 26), w: WORDS[word++ % WORDS.length] };
      addStamp(it, true); items.push(it); persist(); setTimeout(() => sfx("thump"), 230);
      return;
    }
    cur = { k: "s", t: tool, p: [x, y] }; addStroke(cur);
    try { penSvg.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ }
  });
  penSvg.addEventListener("pointermove", (e) => {
    if (!cur) return;
    const [x, y] = pt(e), p = cur.p, n = p.length;
    if (Math.hypot(x - p[n - 2], y - p[n - 1]) < 2.5) return;
    p.push(x, y); cur.el.setAttribute("d", pathD(p));
  });
  const end = () => { if (!cur) return; items.push(cur); cur = null; persist(); };
  penSvg.addEventListener("pointerup", end); penSvg.addEventListener("pointercancel", end);

  /* ---------- chalk doodles on the wood ---------- */
  const DOODLES = [
    [".hero", "sc-d-ok", `<span style="--d:3.6">200 OK</span><svg viewBox="0 0 170 60" style="margin-top:-52px"><ellipse cx="85" cy="30" rx="78" ry="26" pathLength="1" style="--d:4.4"/><path d="M128 66l8 16 4-10 12-2-10-7 2-12-9 8z" pathLength="1" style="--d:5" transform="translate(-6 8)"/></svg>`],
    [".about", "sc-d-rules", `<span style="--d:.1">five rules.</span><span style="--d:.8">zero exceptions.</span><svg viewBox="0 0 200 70" width="200"><path d="M12 22C60 60 130 58 182 30" pathLength="1" style="--d:1.5"/><path d="M164 22l19 8-12 16" pathLength="1" style="--d:2"/></svg>`],
    [".work", "sc-d-ttt", `<svg viewBox="0 0 90 90"><path d="M30 6V84M60 6V84M6 30H84M6 60H84" pathLength="1" style="--d:0"/><path d="M11 11l12 12m0-12L11 23" pathLength="1" style="--d:.7"/><circle cx="45" cy="45" r="8" pathLength="1" style="--d:1"/><path d="M41 11l12 12m0-12L41 23" pathLength="1" style="--d:1.3"/><circle cx="17" cy="75" r="8" pathLength="1" style="--d:1.6"/><path d="M71 11l12 12m0-12L71 23" pathLength="1" style="--d:1.9"/><path class="win" d="M4 17H88" pathLength="1" style="--d:2.4"/></svg>`],
    [".stack", "sc-d-coffee", `<span style="--d:.1">(yes, coffee counts)</span><svg viewBox="0 0 60 40" width="60" style="position:absolute;right:-62px;top:-26px"><path d="M6 36C24 32 42 22 50 6M37 9l13-5 4 14" pathLength="1" style="--d:.9"/></svg>`],
    [".contact", "sc-d-draw", `<span style="--d:.2">psst. pick up a pen</span><svg viewBox="0 0 80 50" width="80" style="margin-left:auto"><path d="M6 6C20 34 44 42 70 40M56 30l15 10-14 8" pathLength="1" style="--d:1"/></svg>`]
  ];
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("on"); io.unobserve(en.target); }
  }), { threshold: .5 }) : null;
  DOODLES.forEach(([host, cls, html]) => {
    const sec = $(host); if (!sec) return;
    const d = document.createElement("div"); d.className = "sc-doodle " + cls; d.setAttribute("aria-hidden", "true"); d.innerHTML = html;
    sec.appendChild(d);
    io ? io.observe(d) : d.classList.add("on");
  });
})();
