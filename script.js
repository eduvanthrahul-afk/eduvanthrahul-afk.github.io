/* Paper desk portfolio — generated textures and small interactions. */
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Small seeded PRNG so torn edges look the same on every visit.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- crumpled paper: a tileable texture of folded facets + creases + grain ---------- */
  function crumpleTexture(size = 760, seed = 9) {
    const r = rng(seed);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const n = 8, cell = size / n;
    // jittered lattice; jitter is shared across opposite edges so the tile wraps seamlessly
    const jit = Array.from({ length: n }, () => Array.from({ length: n }, () => [(r() - .5) * cell * .9, (r() - .5) * cell * .9]));
    const P = (i, j) => [i * cell + jit[((i % n) + n) % n][((j % n) + n) % n][0], j * cell + jit[((i % n) + n) % n][((j % n) + n) % n][1]];
    const tris = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const a = P(i, j), b = P(i + 1, j), d = P(i, j + 1), e = P(i + 1, j + 1);
      if (r() < .5) tris.push([a, b, e], [a, e, d]); else tris.push([a, b, d], [b, e, d]);
    }
    const offs = [-size, 0, size];
    for (const t of tris) {
      const light = r() < .5, alpha = light ? r() * .22 : r() * .1;
      g.fillStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(60,40,20,${alpha})`;
      for (const ox of offs) for (const oy of offs) {
        g.beginPath();
        g.moveTo(t[0][0] + ox, t[0][1] + oy); g.lineTo(t[1][0] + ox, t[1][1] + oy); g.lineTo(t[2][0] + ox, t[2][1] + oy);
        g.closePath(); g.fill();
      }
    }
    // creases: a dark hairline with a bright lip beside it, along some facet edges
    g.lineCap = "round";
    for (const t of tris) {
      if (r() < .45) continue;
      const [p, q] = [t[0], t[1 + Math.floor(r() * 2)]];
      for (const ox of offs) for (const oy of offs) {
        g.strokeStyle = `rgba(50,30,10,${.09 + r() * .1})`; g.lineWidth = 1;
        g.beginPath(); g.moveTo(p[0] + ox, p[1] + oy); g.lineTo(q[0] + ox, q[1] + oy); g.stroke();
        g.strokeStyle = `rgba(255,255,255,${.25 + r() * .25})`; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(p[0] + ox + 1.2, p[1] + oy + 1); g.lineTo(q[0] + ox + 1.2, q[1] + oy + 1); g.stroke();
      }
    }
    // paper grain
    const nc = document.createElement("canvas");
    nc.width = nc.height = size;
    const ng = nc.getContext("2d"), img = ng.createImageData(size, size);
    for (let k = 0; k < img.data.length; k += 4) {
      const v = r();
      const dark = v < .5;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = dark ? 60 : 255;
      img.data[k + 3] = (dark ? v : 1 - v) * 34;
    }
    ng.putImageData(img, 0, 0);
    g.drawImage(nc, 0, 0);
    return c.toDataURL("image/png");
  }

  try {
    document.documentElement.style.setProperty("--crumple", `url(${crumpleTexture()})`);
  } catch (e) { /* flat paper is a fine fallback */ }

  /* ---------- torn edges ---------- */
  function tear(el) {
    const sides = el.dataset.torn || "";
    const r = rng(+(el.dataset.seed || 1) * 7919);
    const depth = +(el.dataset.depth || 7);
    const step = () => 1 + r() * 2.4;
    const d = () => (r() * depth).toFixed(1);
    const pts = [];
    if (sides.includes("t")) for (let x = 0; x < 100; x += step()) pts.push(`${x.toFixed(2)}% ${d()}px`);
    else pts.push("0 0");
    if (sides.includes("r")) for (let y = 0; y < 100; y += step() * 2) pts.push(`calc(100% - ${d()}px) ${y.toFixed(2)}%`);
    else pts.push("100% 0");
    if (sides.includes("b")) for (let x = 100; x > 0; x -= step()) pts.push(`${x.toFixed(2)}% calc(100% - ${d()}px)`);
    else pts.push("100% 100%");
    if (sides.includes("l")) for (let y = 100; y > 0; y -= step() * 2) pts.push(`${d()}px ${y.toFixed(2)}%`);
    else pts.push("0 100%");
    el.style.clipPath = `polygon(${pts.join(",")})`;
  }
  document.querySelectorAll("[data-torn]").forEach(tear);

  /* ---------- receipt print order ---------- */
  document.querySelectorAll(".receipt .row").forEach((row, i) => row.style.setProperty("--i", i));

  /* ---------- typewriter on the name ---------- */
  const typed = document.querySelector(".typed");
  const h1 = typed && typed.closest("h1");
  function typeName() {
    if (!typed || reduceMotion) return;
    const text = typed.dataset.text;
    h1.setAttribute("aria-label", text);
    typed.textContent = "";
    let i = 0;
    const tick = () => {
      typed.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, 90 + Math.random() * 110);
    };
    setTimeout(tick, 250);
  }

  /* ---------- scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }, { threshold: .14, rootMargin: "0px 0px -6% 0px" });
  function startReveals() { document.querySelectorAll(".reveal").forEach((el) => io.observe(el)); }

  /* ---------- intro: tear the cover sheet ---------- */
  const rip = document.getElementById("rip");
  function finishIntro() { startReveals(); typeName(); }
  if (!rip || reduceMotion) {
    if (rip) rip.classList.add("gone");
    finishIntro();
  } else {
    const r = rng(2026);
    const jag = [];
    for (let y = 0; y <= 100; y += 1.5 + r() * 2) jag.push([(r() - .5) * 46, y]);
    jag.push([(r() - .5) * 20, 100]);
    const line = jag.map(([dx, y]) => `calc(50% + ${dx.toFixed(1)}px) ${y.toFixed(2)}%`);
    rip.querySelector(".rip-l").style.clipPath = `polygon(0 0, ${line.join(",")}, 0 100%)`;
    rip.querySelector(".rip-r").style.clipPath = `polygon(${line.join(",")}, 100% 100%, 100% 0)`;
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      rip.classList.add("open");
      setTimeout(finishIntro, 450);
      setTimeout(() => rip.classList.add("gone"), 1350);
    };
    rip.addEventListener("click", open);
    const ready = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([ready, new Promise((res) => setTimeout(res, 1200))]).then(() => setTimeout(open, 650));
  }

  /* ---------- redactions: tap to decrypt on touch screens ---------- */
  document.querySelectorAll(".redact").forEach((el) => el.addEventListener("click", () => el.classList.toggle("peek")));

  /* ---------- paper plane carries the email ---------- */
  const btn = document.getElementById("plane-btn");
  const plane = document.getElementById("plane");
  if (btn && plane && !reduceMotion && plane.animate) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const b = btn.getBoundingClientRect();
      const x0 = b.left + b.width / 2 - 30, y0 = b.top - 20;
      const w = innerWidth, h = innerHeight;
      plane.animate([
        { opacity: 0, transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(.6)` },
        { opacity: 1, transform: `translate(${x0 + 40}px, ${y0 - 60}px) rotate(-18deg) scale(1)`, offset: .15 },
        { opacity: 1, transform: `translate(${w * .3}px, ${h * .25}px) rotate(12deg) scale(1.1)`, offset: .5 },
        { opacity: 1, transform: `translate(${w * .6}px, ${h * .45}px) rotate(-30deg) scale(1)`, offset: .75 },
        { opacity: 0, transform: `translate(${w + 80}px, ${-80}px) rotate(-40deg) scale(.7)` }
      ], { duration: 1500, easing: "cubic-bezier(.4,0,.3,1)" }).onfinish = () => { location.href = btn.href; };
    });
  }
})();
