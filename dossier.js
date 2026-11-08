/* Case-file folders: blueprint, evidence, field notes, specs. */
(() => {
  const CASES = window.CASES || [];
  const CODE = window.CASE_CODE || {};
  if (!CASES.length) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sfx = () => window.deskSfx || {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- build the shell once ---------- */
  const root = document.createElement("div");
  root.className = "dossier";
  root.id = "dossier";
  root.hidden = true;
  root.innerHTML = `
    <div class="dossier-scrim" data-close></div>
    <div class="folder" role="dialog" aria-modal="true" aria-labelledby="d-title">
      <div class="folder-inside crumpled">
        <header class="d-head">
          <div>
            <p class="type small d-kicker" id="d-kicker"></p>
            <h2 class="d-title" id="d-title"></h2>
          </div>
          <div class="d-actions">
            <a class="file-link" id="d-repo" target="_blank" rel="noopener">open repo ↗</a>
            <button class="d-close" data-close aria-label="Close the folder">✕</button>
          </div>
        </header>
        <div class="d-tabs" role="tablist" aria-label="Folder sections">
          <button role="tab" class="d-tab t-blue" data-tab="blueprint">blueprint</button>
          <button role="tab" class="d-tab t-kraft" data-tab="evidence">evidence</button>
          <button role="tab" class="d-tab t-yellow" data-tab="notes">field notes</button>
          <button role="tab" class="d-tab t-white" data-tab="specs">specs</button>
        </div>
        <div class="d-panel" id="d-panel" role="tabpanel" tabindex="0"></div>
        <footer class="d-foot">
          <button class="d-step" id="d-prev"></button>
          <span class="hand d-count" id="d-count"></span>
          <button class="d-step" id="d-next"></button>
        </footer>
      </div>
      <div class="folder-cover" aria-hidden="true"><span class="type" id="d-cover-no"></span><b id="d-cover-name"></b><i class="stamp red">FILED</i></div>
    </div>
    <div class="zoom" id="d-zoom" hidden><img alt=""><p class="hand"></p></div>`;
  document.body.appendChild(root);

  const $ = (id) => root.querySelector("#" + id);
  const panel = $("d-panel");
  let current = 0, tab = "blueprint", lastFocus = null;

  /* ---------- blueprint renderer ---------- */
  function blueprint(c) {
    const b = c.blueprint;
    const N = Object.fromEntries(b.nodes.map((n) => [n.id, { w: 150, h: 58, ...n }]));
    const ctr = (n) => [n.x + n.w / 2, n.y + n.h / 2];
    const exitPt = (n, tx, ty, pad) => {
      const [cx, cy] = ctr(n), dx = tx - cx, dy = ty - cy;
      const t = Math.min(dx ? (n.w / 2 + pad) / Math.abs(dx) : 1e9, dy ? (n.h / 2 + pad) / Math.abs(dy) : 1e9);
      return [cx + dx * t, cy + dy * t];
    };
    let svg = "", labels = "", i = 0;
    (b.zones || []).forEach((z) => {
      svg += `<rect class="bp-zone" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10"/>`;
      labels += `<text class="bp-zone-l" x="${z.x + 12}" y="${z.y + z.h - 10}">${esc(z.label)}</text>`;
    });
    if (b.trustLine) {
      svg += `<path class="bp-trust" d="M${b.trustLine.x} 14V346"/>`;
      labels += `<text class="bp-trust-l" transform="translate(${b.trustLine.x - 6} 180) rotate(-90)" text-anchor="middle">${esc(b.trustLine.label)}</text>`;
    }
    b.edges.forEach(([a, z, label, style]) => {
      const A = N[a], Z = N[z];
      const [zx, zy] = ctr(Z), [ax, ay] = ctr(A);
      const p1 = exitPt(A, zx, zy, 3), p2 = exitPt(Z, ax, ay, 7);
      const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
      const bend = (i++ % 2 ? 1 : -1) * Math.min(14, len * .08);
      const cx = mx - (p2[1] - p1[1]) / len * bend, cy = my + (p2[0] - p1[0]) / len * bend;
      const cls = style === "dash" ? "bp-edge dash" : "bp-edge bp-draw";
      svg += `<path class="${cls}" style="--d:${.25 + i * .12}s" pathLength="1" d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" marker-end="url(#bp-arrow)"/>`;
      if (label) {
        const lx = .25 * p1[0] + .5 * cx + .25 * p2[0], ly = .25 * p1[1] + .5 * cy + .25 * p2[1];
        const w = label.length * 6.6 + 12;
        labels += `<rect class="bp-lbg" x="${(lx - w / 2).toFixed(1)}" y="${(ly - 10).toFixed(1)}" width="${w.toFixed(1)}" height="18" rx="3"/><text class="bp-elabel" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle">${esc(label)}</text>`;
      }
    });
    b.nodes.forEach((n0, k) => {
      const n = N[n0.id];
      svg += `<rect class="bp-node ${n.ghost ? "ghost" : "bp-draw"}" style="--d:${k * .08}s" pathLength="1" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="5"/>`;
      labels += `<text class="bp-t" x="${n.x + n.w / 2}" y="${n.y + 25}" text-anchor="middle">${esc(n.t)}</text><text class="bp-s" x="${n.x + n.w / 2}" y="${n.y + 45}" text-anchor="middle">${esc(n.s)}</text>`;
    });
    const flow = b.flow.map((f, k) => `<li style="--d:${.6 + k * .08}s"><span>${k + 1}</span>${esc(f)}</li>`).join("");
    return `<div class="bp">
      <div class="bp-scroll"><svg class="bp-svg" viewBox="0 0 680 360" role="img" aria-label="Architecture of ${esc(c.name)}: ${b.nodes.map((n) => esc(n.t)).join(", ")}">
        <defs><marker id="bp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#eaf4ff"/></marker></defs>
        <g class="bp-lines">${svg}</g><g>${labels}</g>
      </svg></div>
      <p class="bp-flow-title type small">${esc(b.flowTitle)}</p>
      <ol class="bp-flow">${flow}</ol>
      <div class="bp-tb type"><span>DWG ${esc(b.dwg)}</span><span>DRAWN FROM THE REPO</span><span>R.E. · 2026</span></div>
    </div>`;
  }

  /* ---------- evidence ---------- */
  function evidence(c) {
    if (c.evidence.shots) {
      const shots = c.evidence.shots.map(([src, cap], k) => `
        <figure class="shot" style="--r:${[-3, 2.4, -1.6, 3][k % 4]}deg">
          <span class="tape"></span>
          <button class="shot-btn" data-zoom="${esc(src)}" data-cap="${esc(cap)}" aria-label="Enlarge: ${esc(cap)}"><img src="${esc(src)}" alt="${esc(cap)}" loading="lazy"></button>
          <figcaption class="hand">${esc(cap)}</figcaption>
        </figure>`).join("");
      return `<div class="board"><p class="hand board-hint">real screenshots · click to enlarge</p><div class="shots">${shots}</div></div>`;
    }
    const x = CODE[c.evidence.code];
    if (!x) return "<p>No evidence on file.</p>";
    const body = x.parts.map((p, k) => {
      const rows = p.code.split("\n").map((ln, j) => `<span class="ln"><i>${p.start + j}</i>${esc(ln) || " "}</span>`).join("");
      return (k ? '<span class="ln gap"><i>⋮</i></span>' : "") + rows;
    }).join("");
    return `<div class="printout">
      <div class="feed l" aria-hidden="true"></div>
      <div class="paper-code">
        <div class="pc-head type"><span>${esc(x.file)}</span><span>LISTING · REAL CODE, UNEDITED</span></div>
        <pre><code>${body}</code></pre>
        <a class="file-link" href="${esc(x.url)}" target="_blank" rel="noopener">read it on GitHub ↗</a>
      </div>
      <div class="feed r" aria-hidden="true"></div>
    </div>`;
  }

  /* ---------- field notes ---------- */
  function notes(c) {
    return `<div class="legal">${c.notes.map(([h, p], k) => `<section style="--d:${k * .12}s"><h3 class="hand">${esc(h)}</h3><p>${p}</p></section>`).join("")}
      <p class="hand legal-sign">— Rahul</p></div>`;
  }

  /* ---------- specs ---------- */
  function specs(c) {
    const s = c.specs;
    const extra = (s.extra || []).map(([l, u]) => `<a class="file-link" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join("");
    return `<div class="spec-card">
      <p class="type small">SPEC SHEET · CASE ${esc(c.no)}</p>
      <ul class="chips">${s.stack.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <dl class="spec-facts">${s.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      <p class="type small">TO RUN IT</p>
      <p><code class="run">${esc(s.run)}</code></p>
      <a class="file-link" href="${esc(c.repo)}" target="_blank" rel="noopener">repository ↗</a>${extra}
    </div>`;
  }

  const RENDER = { blueprint, evidence, notes, specs };

  function show(t) {
    tab = t;
    root.querySelectorAll(".d-tab").forEach((b) => {
      const on = b.dataset.tab === t;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    panel.className = "d-panel p-" + t;
    panel.innerHTML = RENDER[t](CASES[current]);
    panel.scrollTop = 0;
  }

  function fill(i) {
    current = (i + CASES.length) % CASES.length;
    const c = CASES[current], prev = CASES[(current - 1 + CASES.length) % CASES.length], next = CASES[(current + 1) % CASES.length];
    $("d-kicker").textContent = `CASE ${c.no} · ${c.kind}`;
    $("d-title").textContent = c.name;
    $("d-repo").href = c.repo;
    $("d-cover-no").textContent = `CASE ${c.no}`;
    $("d-cover-name").textContent = c.name;
    $("d-prev").textContent = `← ${prev.name}`;
    $("d-next").textContent = `${next.name} →`;
    $("d-count").textContent = `file ${current + 1} of ${CASES.length}`;
    try { history.replaceState(null, "", "#case-" + c.id); } catch (e) { /* file:// */ }
    show(tab);
  }

  function open(id) {
    const i = Math.max(0, CASES.findIndex((c) => c.id === id));
    lastFocus = document.activeElement;
    tab = "blueprint";
    root.hidden = false;
    document.documentElement.classList.add("dossier-open");
    root.classList.remove("opened"); void root.offsetWidth;
    fill(i);
    requestAnimationFrame(() => root.classList.add("opened"));
    (sfx().crumple || (() => {}))();
    root.querySelector('.d-tab[aria-selected="true"]').focus({ preventScroll: true });
  }
  function close() {
    root.hidden = true;
    root.classList.remove("opened");
    document.documentElement.classList.remove("dossier-open");
    $("d-zoom").hidden = true;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function step(d) {
    (sfx().tear || (() => {}))();
    const f = root.querySelector(".folder");
    f.classList.remove("flip"); void f.offsetWidth; f.classList.add("flip");
    fill(current + d);
  }

  /* ---------- events ---------- */
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-close], .d-tab, #d-prev, #d-next, .shot-btn, #d-zoom");
    if (!t) return;
    if (t.matches("[data-close]")) close();
    else if (t.matches(".d-tab")) { (sfx().click || (() => {}))(); show(t.dataset.tab); }
    else if (t.id === "d-prev") step(-1);
    else if (t.id === "d-next") step(1);
    else if (t.matches(".shot-btn")) {
      const z = $("d-zoom");
      z.querySelector("img").src = t.dataset.zoom;
      z.querySelector("img").alt = t.dataset.cap;
      z.querySelector("p").textContent = t.dataset.cap;
      z.hidden = false;
    } else if (t.id === "d-zoom") t.hidden = true;
  });
  root.querySelector(".d-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const tabs = [...root.querySelectorAll(".d-tab")];
    const k = tabs.findIndex((b) => b.dataset.tab === tab);
    const n = tabs[(k + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    show(n.dataset.tab); n.focus();
  });
  addEventListener("keydown", (e) => {
    if (root.hidden) return;
    if (e.key === "Escape") { if (!$("d-zoom").hidden) $("d-zoom").hidden = true; else close(); }
    if (e.key === "Tab") {
      const f = [...root.querySelectorAll("button, a[href], [tabindex='0']")].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  document.querySelectorAll("[data-case]").forEach((b) => b.addEventListener("click", () => open(b.dataset.case)));

  const m = location.hash.match(/^#case-([\w-]+)$/);
  if (m) setTimeout(() => open(m[1]), reduceMotion ? 0 : 1500);
})();
