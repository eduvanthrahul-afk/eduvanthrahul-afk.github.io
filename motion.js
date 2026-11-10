/* Motion layer: timing and physics for the paper desk. Adds to the page, replaces nothing. */
(() => {
  const root = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.classList.add("m-js");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // sounds only after the visitor has touched the page, so nothing thumps unprompted
  let touched = false;
  ["pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => { touched = true; }, { once: true, capture: true }));
  const sfx = (name) => { if (touched && window.deskSfx && window.deskSfx[name]) window.deskSfx[name](); };

  /* run a callback the moment script.js marks a .reveal as .in */
  const onIn = new Map();
  const mo = new MutationObserver((list) => list.forEach((m) => {
    const el = m.target;
    if (el.classList.contains("in") && onIn.has(el)) { const fns = onIn.get(el); onIn.delete(el); fns.forEach((f) => f(el)); }
  }));
  function whenIn(el, fn) {
    if (!el) return;
    if (el.classList.contains("in")) return fn(el);
    if (!onIn.has(el)) { onIn.set(el, []); mo.observe(el, { attributes: true, attributeFilter: ["class"] }); }
    onIn.get(el).push(fn);
  }

  /* ---------- the cover sheet sheds fibres when it tears ---------- */
  const rip = $("#rip");
  if (rip && rip.animate) {
    const ripMo = new MutationObserver(() => {
      if (!rip.classList.contains("open")) return;
      ripMo.disconnect();
      for (let i = 0; i < 34; i++) {
        const f = document.createElement("i");
        f.className = "m-fleck";
        const w = 4 + Math.random() * 12, y = Math.random() * innerHeight, dir = Math.random() < .5 ? -1 : 1;
        Object.assign(f.style, {
          left: innerWidth / 2 + (Math.random() - .5) * 40 + "px", top: y + "px", width: w + "px", height: w * (.4 + Math.random()) + "px",
          background: ["#c69a64", "#a97b45", "#e3c79a", "#f3e6c8"][i % 4],
          clipPath: `polygon(${Math.random() * 30}% 0, 100% ${Math.random() * 40}%, ${60 + Math.random() * 40}% 100%, 0 ${60 + Math.random() * 40}%)`
        });
        document.body.appendChild(f);
        const dx = dir * (60 + Math.random() * 320), up = -(30 + Math.random() * 160);
        f.animate([
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx * .55}px, ${up}px) rotate(${dir * 200}deg)`, opacity: 1, offset: .35 },
          { transform: `translate(${dx}px, ${innerHeight - y + 60}px) rotate(${dir * (500 + Math.random() * 500)}deg)`, opacity: .9 }
        ], { duration: 1100 + Math.random() * 900, delay: Math.random() * 180, easing: "cubic-bezier(.3,.2,.7,1)", fill: "backwards" }).onfinish = () => f.remove();
      }
    });
    ripMo.observe(rip, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------- stamps land with weight: ink ring, a jolt through the paper, a thump ---------- */
  function impact(stamp) {
    const paper = stamp.closest(".paper, .envelope") || stamp.parentElement;
    if (!paper || !stamp.offsetParent) return;
    const s = stamp.getBoundingClientRect(), p = paper.getBoundingClientRect();
    const ring = document.createElement("i");
    ring.className = "m-ink";
    const d = Math.max(s.width, s.height) * .9;
    Object.assign(ring.style, { width: d + "px", height: d + "px", left: s.left - p.left + s.width / 2 - d / 2 + "px", top: s.top - p.top + s.height / 2 - d / 2 + "px", color: getComputedStyle(stamp).color });
    paper.appendChild(ring); setTimeout(() => ring.remove(), 800);
    paper.animate([
      { transform: "translate(0,0)" }, { transform: "translate(2px,4px) rotate(.25deg)" },
      { transform: "translate(-2px,-1px) rotate(-.15deg)" }, { transform: "translate(1px,1px)" }, { transform: "translate(0,0)" }
    ], { duration: 260, easing: "ease-out" });
    sfx("thump");
  }
  $$(".reveal").forEach((rev) => {
    $$(".stamp, .postmark", rev).forEach((st) => whenIn(rev, () => {
      const delay = st.classList.contains("postmark") ? 1700 : (parseFloat(getComputedStyle(st).getPropertyValue("--sd")) || 1) * 1000;
      setTimeout(() => impact(st), delay + 260);
    }));
  });
  const hero = $(".hero-sheet"); if (hero) $(".hero-stamp", hero).style.setProperty("--sd", "3.3s");

  /* ---------- numbers count up when their paper lands ---------- */
  function countUp(el) {
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.nodeValue));
    if (!node) return;
    const m = node.nodeValue.match(/^(\s*)(\d+(?:\.\d+)?)(.*)$/s);
    if (!m || +m[2] === 0) return;
    const end = +m[2], dec = (m[2].split(".")[1] || "").length, t0 = performance.now(), dur = 1500;
    el.style.fontVariantNumeric = "tabular-nums";
    const tick = (now) => {
      const u = clamp((now - t0) / dur, 0, 1), e = u === 1 ? 1 : 1 - Math.pow(2, -10 * u);
      node.nodeValue = m[1] + (end * e).toFixed(dec) + m[3];
      if (u < 1) requestAnimationFrame(tick);
    };
    node.nodeValue = m[1] + (0).toFixed(dec) + m[3];
    requestAnimationFrame(tick);
  }
  $$(".figures dd, .ticket-num").forEach((el) => whenIn(el.closest(".reveal"), () => setTimeout(() => countUp(el), 850)));

  /* ---------- hand-drawn arrow needs a unit path length to be drawn by CSS ---------- */
  $$(".doodle-arrow path").forEach((p) => p.setAttribute("pathLength", "1"));

  /* ---------- things that are not .reveal get their own trigger ---------- */
  const wall = $(".dymo-wall"), title = $(".section-title");
  if (wall) $$(".dymo", wall).forEach((d, i) => d.style.setProperty("--i", i));
  const waiters = [wall, title].filter(Boolean);
  waiters.forEach((el) => el.classList.add("m-wait"));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.replace("m-wait", "m-go"); io.unobserve(en.target);
  }), { threshold: .3 });
  waiters.forEach((el) => io.observe(el));

  /* ---------- TwinGuard: plot both traces live; the stamp falls when v2 crosses the obstacle ---------- */
  (function chart() {
    const svg = $(".tg-chart"); if (!svg) return;
    const v1 = $(".trace.v1", svg), v2 = $(".trace.v2", svg), obst = $(".obst", svg), file = svg.closest(".reveal");
    const stamp = $(".tg-stamp", file);
    const NS = "http://www.w3.org/2000/svg", L1 = v1.getTotalLength(), L2 = v2.getTotalLength();
    const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const clip = mk("clipPath", { id: "m-v2-clip" }), rect = mk("rect", { x: 0, y: 0, width: 0, height: 170 });
    clip.appendChild(rect); svg.appendChild(clip); v2.setAttribute("clip-path", "url(#m-v2-clip)");
    v1.style.strokeDasharray = L1; v1.style.strokeDashoffset = L1;
    const h1 = mk("circle", { r: 5.5, class: "m-head", fill: "#1f4e8c" }), h2 = mk("circle", { r: 5.5, class: "m-head", fill: "#c9741c" });
    svg.append(h1, h2);
    // where along v2 does it pass the obstacle (x = 330)?
    let lo = 0, hi = L2; for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; v2.getPointAtLength(mid).x < 330 ? (lo = mid) : (hi = mid); }
    const START = 1000, T = 2100, crossAt = START + (lo / L2) * T;
    if (stamp) stamp.style.setProperty("--sd", ((crossAt - 270) / 1000).toFixed(2) + "s");
    whenIn(file, () => setTimeout(() => {
      const t0 = performance.now(); let hit = false;
      h1.classList.add("on"); h2.classList.add("on");
      const tick = (now) => {
        const u = clamp((now - t0) / T, 0, 1);
        const e1 = 1 - Math.pow(1 - clamp(u / .82, 0, 1), 3);        // v1 brakes to a stop
        const p1 = v1.getPointAtLength(e1 * L1), p2 = v2.getPointAtLength(u * L2);   // v2 just keeps going
        v1.style.strokeDashoffset = L1 * (1 - e1);
        h1.setAttribute("cx", p1.x); h1.setAttribute("cy", p1.y);
        h2.setAttribute("cx", p2.x); h2.setAttribute("cy", p2.y);
        rect.setAttribute("width", p2.x + 5);
        if (!hit && p2.x >= 330) { hit = true; h2.setAttribute("fill", "#c4372d"); obst.classList.add("m-hit"); }
        if (u < 1) requestAnimationFrame(tick); else rect.setAttribute("width", 440);
      };
      requestAnimationFrame(tick);
    }, START));
  })();

  /* ---------- red string: pinned to every case file, pulled along as you scroll ---------- */
  (function string() {
    const files = $(".files"); if (!files) return;
    const cards = $$(":scope > .file", files); if (cards.length < 2) return;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "m-string"); svg.setAttribute("aria-hidden", "true");
    const shade = document.createElementNS(NS, "path"), path = document.createElementNS(NS, "path"), fibre = document.createElementNS(NS, "path");
    shade.setAttribute("class", "shade"); fibre.setAttribute("class", "fibre");
    svg.append(shade, path, fibre); files.appendChild(svg);
    const pins = cards.map((c) => { const p = document.createElement("i"); p.className = "m-pin"; p.setAttribute("aria-hidden", "true"); c.appendChild(p); return p; });
    let total = 0, marks = [], drawn = -1;

    function layout() {
      if (getComputedStyle(svg).display === "none") return;
      // resting positions from layout boxes, so papers still mid-flight don't throw the string off
      const pts = cards.map((c, i) => {
        const pin = pins[i], r = (parseFloat(c.style.getPropertyValue("--r")) || 0) * Math.PI / 180;
        const cx = c.offsetWidth / 2, cy = c.offsetHeight / 2, x = pin.offsetLeft + 10 - cx, y = pin.offsetTop + 10 - cy;
        return [c.offsetLeft + cx + x * Math.cos(r) - y * Math.sin(r), c.offsetTop + cy + x * Math.sin(r) + y * Math.cos(r)];
      });
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      marks = [0];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], sag = clamp(Math.hypot(bx - ax, by - ay) * .22, 24, 110);
        d += ` Q${((ax + bx) / 2).toFixed(1)} ${((ay + by) / 2 + sag).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
        path.setAttribute("d", d); marks.push(path.getTotalLength());
      }
      fibre.setAttribute("d", d); shade.setAttribute("d", d);
      total = marks[marks.length - 1];
      path.style.strokeDasharray = shade.style.strokeDasharray = total;
      drawn = -1; draw();
    }
    function draw() {
      if (!total) return;
      const b = files.getBoundingClientRect();
      const p = clamp((innerHeight * .72 - b.top) / b.height, 0, 1), len = p * total;
      if (Math.abs(len - drawn) < .5) return;
      drawn = len;
      path.style.strokeDashoffset = shade.style.strokeDashoffset = total - len;
      fibre.style.display = p >= 1 ? "" : "none";   // twine highlight once the whole string is up
      pins.forEach((pin, i) => pin.classList.toggle("on", len > 2 && len >= marks[i] - 2));
    }
    let queued = false;
    addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; draw(); }); } }, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(layout).observe(files); else addEventListener("resize", layout);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(layout);
  })();

  /* ---------- dust in the lamplight: a small canvas in the lamp's corner only ---------- */
  let lastY = scrollY, vel = 0;
  const cv = document.createElement("canvas"); cv.className = "m-dust"; cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  const g = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const motes = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), z: .3 + Math.random() * .7, vx: 0, vy: 0, ph: Math.random() * 6.28 }));
  function size() { dpr = Math.min(devicePixelRatio || 1, 1.5); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; }
  size(); addEventListener("resize", size);
  const mouse = { x: -1e4, y: -1e4 };
  addEventListener("pointermove", (e) => { mouse.x = e.clientX - (innerWidth - W); mouse.y = e.clientY; }, { passive: true });

  let t = 0, skip = false;
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden || document.body.classList.contains("lights-off")) return;
    const y = scrollY; vel += ((y - lastY) - vel) * .3; lastY = y;
    skip = !skip; if (skip) return;            // 30fps is plenty for drifting dust
    t += 1 / 30;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const lx = W * .78, ly = H * .05, reach = Math.max(W, H) * .85;
    g.fillStyle = "#ffe2b0";
    for (const m of motes) {
      m.vx += Math.sin(t * .4 + m.ph) * .00006 * m.z; m.vy += (Math.cos(t * .3 + m.ph * 1.7) * .00006 - .00002) * m.z;
      m.vy -= vel * .00004 * m.z;
      const dx = m.x * W - mouse.x, dy = m.y * H - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 14000) { const f = (1 - d2 / 14000) * .0009; m.vx += dx * f / W * 8; m.vy += dy * f / H * 8; }
      m.vx *= .93; m.vy *= .93; m.x += m.vx; m.y += m.vy;
      if (m.x < -.02) m.x = 1.02; if (m.x > 1.02) m.x = -.02; if (m.y < -.02) m.y = 1.02; if (m.y > 1.02) m.y = -.02;
      const px = m.x * W, py = m.y * H, lit = clamp(1 - Math.hypot(px - lx, py - ly) / reach, 0, 1);
      if (lit <= 0) continue;
      g.globalAlpha = lit * lit * (.25 + .45 * m.z) * (.7 + .3 * Math.sin(t * 1.3 + m.ph));
      g.beginPath(); g.arc(px, py, .6 + m.z * 1.5, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;
  }

  /* ---------- inertial wheel scrolling: a mouse wheel glides instead of stepping ---------- */
  (function glide() {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let target = 0, cur = 0, active = false, last = 0;
    const max = () => root.scrollHeight - innerHeight;
    const scrollable = (el) => {
      for (; el && el !== document.body && el !== root; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
      }
      return false;
    };
    function step(now) {
      if (!active) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      cur += (target - cur) * (1 - Math.exp(-dt * 8.5));
      if (Math.abs(target - cur) < .4) { cur = target; active = false; }
      scrollTo({ top: cur, behavior: "instant" });
      if (active) requestAnimationFrame(step);
    }
    addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (root.classList.contains("dossier-open") || scrollable(e.target)) return;
      if (e.deltaMode === 0 && Math.abs(e.deltaY) < 50) { active = false; return; }   // trackpads are already smooth
      e.preventDefault();
      const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
      if (!active) { cur = target = scrollY; last = performance.now(); }
      target = clamp(target + d, 0, max());
      if (!active) { active = true; requestAnimationFrame(step); }
    }, { passive: false });
    // anything else that scrolls (keys, scrollbar, nav links, touch) takes over immediately
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, () => { active = false; }, { passive: true, capture: true }));
  })();

  /* ---------- nav: a red pen mark glides to whichever section you are reading ---------- */
  (function navInk() {
    const nav = $(".nav"); if (!nav) return;
    const links = $$('a[href^="#"]', nav).filter((a) => a.getAttribute("href").length > 1 && a.getAttribute("href") !== "#top");
    const secs = links.map((a) => $(a.getAttribute("href")));
    if (!links.length || secs.some((x) => !x)) return;
    const ink = document.createElement("span"); ink.className = "m-nav-ink"; ink.setAttribute("aria-hidden", "true"); nav.appendChild(ink);
    let at = -2, queued = false;
    function place() {
      queued = false;
      let i = -1; secs.forEach((sec, k) => { if (sec.getBoundingClientRect().top < innerHeight * .45) i = k; });
      if (i === at) return; at = i;
      if (i < 0) { ink.style.opacity = 0; return; }
      const a = links[i];
      ink.style.opacity = 1; ink.style.width = a.offsetWidth + 10 + "px";
      ink.style.transform = `translate(${a.offsetLeft - 5}px, ${a.offsetTop + a.offsetHeight - 1}px) rotate(-1.2deg)`;
    }
    addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(place); } }, { passive: true });
    addEventListener("resize", () => { at = -2; place(); });
    place();
  })();

  requestAnimationFrame(frame);
})();
