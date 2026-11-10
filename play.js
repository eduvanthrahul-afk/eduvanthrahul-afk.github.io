/* Play layer: small working models on three case files. Each is a toy with made-up constants
   (and says so on the paper); the mechanism it shows is the real one. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const sfx = (n) => { if (window.deskSfx && window.deskSfx[n]) window.deskSfx[n](); };
  const add = (html, where, ref) => { const t = document.createElement("template"); t.innerHTML = html.trim(); const n = t.content.firstElementChild; ref.insertAdjacentElement(where, n); return n; };
  function slam(stamp) { stamp.classList.remove("pl-slam"); void stamp.offsetWidth; stamp.classList.add("pl-slam"); }

  /* ================= TwinGuard: drag the media load, the chart re-plots ================= */
  (function twinguard() {
    const svg = $(".tg-chart"); if (!svg) return;
    const v2 = $(".trace.v2", svg), stamp = $(".tg-stamp"), label = $(".lbl.orange", svg);
    const ui = add(`<div class="pl-tg">
        <label for="pl-load"><span>try it. media traffic on the car's network:</span><b id="pl-load-o">70%</b></label>
        <input class="pl-range" id="pl-load" type="range" min="0" max="100" value="70">
        <p class="pl-out" id="pl-tg-out" role="status"></p>
        <p class="pl-fine">toy model, made-up constants. the real gate simulates physics, radar, the gateway and sensor noise.</p>
      </div>`, "afterend", svg);
    const range = $("#pl-load", ui), out = $("#pl-tg-out", ui), pct = $("#pl-load-o", ui);
    // chart space: v1 starts braking at x=200 and needs 118px to stop (318). The obstacle is at 330.
    const X0 = 32, BRAKE = 200, STOP = 118, OBST = 330, END = 395, TOP = 36, BASE = 148, KMH = 90, M_PER_PX = .33;
    let was = null, first = true;
    function plot() {
      const load = range.value / 100, start = BRAKE + load * 100;     // late radar = late braking
      const speed = (x) => x <= start ? 1 : Math.sqrt(Math.max(0, 1 - (x - start) / STOP));
      const stopAt = start + STOP, last = Math.min(stopAt, END);
      let d = `M${X0} ${TOP}`;
      for (let x = X0 + 6; x < last; x += 6) d += `L${x} ${(BASE - (BASE - TOP) * speed(x)).toFixed(1)}`;
      d += `L${last.toFixed(1)} ${(BASE - (BASE - TOP) * speed(last)).toFixed(1)}`;
      v2.setAttribute("d", d);
      const head = svg.querySelectorAll(".m-head")[1];
      if (head && head.classList.contains("on")) { head.setAttribute("cx", last); head.setAttribute("cy", BASE - (BASE - TOP) * speed(last)); head.setAttribute("fill", stopAt >= OBST ? "#c4372d" : "#c9741c"); }
      pct.textContent = range.value + "%";
      const hit = stopAt >= OBST, delay = Math.round(20 + load * 600);
      if (hit) {
        out.className = "pl-out bad";
        out.textContent = `radar arrives ${delay} ms late. v2 hits the obstacle at ${Math.round(KMH * speed(OBST))} km/h. all 48 tests still pass.`;
      } else {
        out.className = "pl-out good";
        out.textContent = `radar arrives ${delay} ms late. v2 stops ${((OBST - stopAt) * M_PER_PX).toFixed(1)} m short. a fixed test suite stops looking here.`;
      }
      if (label) { label.textContent = hit ? "v2 runs past" : "v2 stops"; label.setAttribute("x", hit ? 338 : 250); label.setAttribute("y", hit ? 128 : 140); }
      if (stamp && hit !== was) {
        stamp.textContent = hit ? "BLOCKED" : "PASSED"; stamp.classList.toggle("pl-pass", !hit); stamp.classList.toggle("red", hit);
        if (!first) { slam(stamp); setTimeout(() => sfx("thump"), 230); }
      }
      was = hit; first = false;
    }
    range.addEventListener("input", plot);
    plot();
  })();

  /* ================= KeyVault: real Web Crypto, in this tab ================= */
  (function keyvault() {
    const para = $(".manila .typewritten"); if (!para) return;
    const ui = add(`<div class="pl-kv">
        <label class="pl-try" for="pl-secret">try it. type a secret:</label>
        <input class="pl-type" id="pl-secret" type="text" value="DB_PASSWORD=hunter2" maxlength="60" autocomplete="off" spellcheck="false">
        <p class="type small pl-kv-l">ALL THE SERVER EVER STORES</p>
        <p class="pl-cipher" id="pl-cipher" aria-live="polite">…</p>
        <p class="pl-fine" id="pl-kv-fine">real PBKDF2 (100k rounds) + AES-256-GCM, run by your browser just now with a throwaway master password. nothing is sent anywhere.</p>
      </div>`, "afterend", para);
    const input = $("#pl-secret", ui), box = $("#pl-cipher", ui);
    const S = window.crypto && crypto.subtle;
    if (!S) { box.textContent = "Web Crypto needs https or localhost. open the live site to run this."; return; }
    const enc = new TextEncoder(), hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
    const pbkdf = (salt) => ({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" });
    let keyP = null, seq = 0;
    const key = () => keyP || (keyP = (async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16)), salt2 = crypto.getRandomValues(new Uint8Array(16));
      const base = await S.importKey("raw", enc.encode("correct horse battery staple"), "PBKDF2", false, ["deriveBits"]);
      const authHash = await S.deriveBits(pbkdf(salt), base, 256);                       // stage 1: what login is checked against
      const base2 = await S.importKey("raw", authHash, "PBKDF2", false, ["deriveKey"]);
      return S.deriveKey(pbkdf(salt2), base2, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);   // stage 2: never leaves memory
    })());
    async function run() {
      const mine = ++seq;
      try {
        const k = await key(), iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await S.encrypt({ name: "AES-GCM", iv }, k, enc.encode(input.value));
        if (mine === seq) box.innerHTML = `<b>iv</b> ${hex(iv)}<br><b>ciphertext</b> ${hex(ct)}`;
      } catch (e) { box.textContent = "this browser refused to run Web Crypto here."; }
    }
    input.addEventListener("input", () => { sfx("key"); run(); });
    // derive the key only when the folder is actually on screen
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); run(); } }); io.observe(ui); } else run();
  })();

  /* ================= Farm-E: stop the Dutch clock ================= */
  (function farme() {
    const clock = $(".dutch"), price = $(".kraft .price"), list = $(".kraft .ticks"); if (!clock || !price || !list) return;
    const tick = $(".tick", clock), HI = 40, LO = 18, START = price.innerHTML;
    clock.classList.add("pl-live"); clock.removeAttribute("aria-hidden");
    clock.setAttribute("role", "button"); clock.setAttribute("tabindex", "0"); clock.setAttribute("aria-label", "Dutch auction clock. Press to stop the falling price and bid.");
    const out = add(`<p class="pl-out" role="status">try it: the price is falling from ₹40. click the clock to bid ↗</p>`, "afterend", list);
    let stopped = false;
    function press() {
      if (stopped) {
        stopped = false; clock.classList.remove("pl-stopped"); price.innerHTML = START; sfx("click");
        out.className = "pl-out"; out.textContent = "new lot. the price is falling again. click the clock to bid ↗"; return;
      }
      const anim = tick.getAnimations ? tick.getAnimations()[0] : null;
      const frac = anim && anim.currentTime != null ? (anim.currentTime % 9000) / 9000 : Math.random();
      const bid = Math.round(HI - (HI - LO) * frac), rival = 22 + Math.floor(Math.random() * 10);
      stopped = true; clock.classList.add("pl-stopped");
      price.innerHTML = `₹${bid}<small>/kg</small>`; slam(price); setTimeout(() => sfx("thump"), 230);
      if (bid < rival) { out.className = "pl-out bad"; out.textContent = `too slow. another buyer stopped it at ₹${rival} while you waited for ₹${bid}. click to try again.`; }
      else { out.className = "pl-out good"; out.textContent = `yours at ₹${bid}/kg. the other buyer was holding out for ₹${rival}. click for another lot.`; }
    }
    clock.addEventListener("click", press);
    clock.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(); } });
  })();
})();
