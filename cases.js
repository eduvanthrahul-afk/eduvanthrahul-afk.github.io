/* Case-file contents. Every fact here comes from the project's own README, docs or code.
   The "field notes" are drafted from those docs — rewrite them in your own voice. */
window.CASES = [
  {
    id: "twinguard", no: "01", name: "TwinGuard", kind: "SAFETY",
    repo: "https://github.com/eduvanthrahul-afk/twinguard",
    blueprint: {
      dwg: "TG-ARCH-01",
      nodes: [
        { id: "rel", x: 20, y: 24, t: "release package", s: "JSON: what v2 changes" },
        { id: "v1", x: 20, y: 140, t: "v1 · approved", s: "the known-good software" },
        { id: "v2", x: 20, y: 240, t: "v2 · candidate", s: "the OTA update" },
        { id: "search", x: 250, y: 24, w: 175, t: "change-aware search", s: "hunts near-misses" },
        { id: "sim", x: 255, y: 150, w: 180, h: 74, t: "closed-loop simulator", s: "physics · radar · gateway · noise" },
        { id: "trust", x: 255, y: 280, t: "trust meter", s: "plants bugs on purpose" },
        { id: "oracle", x: 500, y: 24, t: "oracle", s: "rules + v1/v2 diff" },
        { id: "shrink", x: 500, y: 140, t: "confirm & shrink", s: "repeat, then minimise" },
        { id: "verdict", x: 500, y: 266, t: "verdict", s: "exit codes 0 · 1 · 2" }
      ],
      edges: [
        ["rel", "search", "diff"], ["search", "sim", "scenarios"], ["v1", "sim", ""], ["v2", "sim", ""],
        ["sim", "oracle", "traces"], ["oracle", "shrink", "findings"], ["shrink", "verdict", ""],
        ["trust", "verdict", "measures", "dash"]
      ],
      flowTitle: "the guided check",
      flow: ["choose update", "review change", "shadow test", "verdict", "trust & ship"]
    },
    evidence: {
      shots: [
        ["assets/cases/twinguard/1-choose-update.jpg", "step 1 · pick the OTA candidate"],
        ["assets/cases/twinguard/3-shadow-test.jpg", "step 3 · shadow test + coverage map"],
        ["assets/cases/twinguard/4-verdict.jpg", "step 4 · blocked, each finding shrunk"],
        ["assets/cases/twinguard/5-trust.jpg", "step 5 · how many real bugs it catches"]
      ]
    },
    notes: [
      ["the bug that passed every test", "A media-player update changed no braking code and passed all 48 conventional tests. But it gave audio traffic the same network priority as radar. Under heavy media load the radar data reached the braking computer late, and the simulated car hit an obstacle that the approved software stopped for. A fixed test suite would have shipped it to the whole fleet."],
      ["what I built", "Instead of asking \"do the tests pass?\", TwinGuard runs v1 and v2 through the same scenarios with the same sensor noise, so any difference is the update's fault. A failure has to repeat on more than one noise seed, and is then shrunk to the simplest scenario that still fails. To measure the gate itself, it plants bugs (a tool rewrites the compiled logic, e.g. <code>&lt;</code> into <code>&lt;=</code>) and counts how many it catches."],
      ["what the real data said", "Fitting the battery model to NASA cell recordings showed that the original settings couldn't charge a real cell past 88%, and broke the 4.25 V limit themselves near freezing. Calibrating against data found problems the simulation alone never would have."],
      ["what I'd tell you in an interview", "Change-aware search finds braking bugs <em>sooner</em> than random testing, but not <em>more</em> of them at the same budget. That's written in the README. An honest number is more useful than an impressive one."]
    ],
    specs: {
      stack: ["Java 17", "Spring Boot 3", "React 18", "FMI 2.0", "CARLA 0.9.16", "H2", "GitHub Actions"],
      facts: [["real mutants caught", "203 / 314"], ["designed faults caught", "155 / 179"], ["false alarms", "0 in 104,000"], ["ACC gap error", "16.7 → 4.4 m"], ["battery voltage error", "320 → 72 mV"], ["CARLA replays reproduced", "9 of 12"]],
      run: "powershell -File .\\start.ps1 -Rebuild"
    }
  },
  {
    id: "keyvault", no: "02", name: "KeyVault", kind: "SECURITY",
    repo: "https://github.com/eduvanthrahul-afk/keyvault-secrets-manager",
    blueprint: {
      dwg: "KV-ARCH-01",
      zones: [{ x: 8, y: 8, w: 400, h: 344, label: "client · browser or CLI" }, { x: 452, y: 8, w: 220, h: 344, label: "server" }],
      trustLine: { x: 430, label: "plaintext never crosses this line" },
      nodes: [
        { id: "pw", x: 28, y: 34, t: "master password", s: "never leaves the device" },
        { id: "auth", x: 28, y: 146, t: "Auth_Hash", s: "PBKDF2 · 100k · SHA-256" },
        { id: "mk", x: 244, y: 160, w: 150, t: "Master_Key", s: "kept in memory only" },
        { id: "aes", x: 244, y: 274, w: 150, t: "AES-256-GCM", s: "fresh 96-bit IV per write" },
        { id: "cli", x: 28, y: 274, t: "kv-cli run", s: "machine token · no .env" },
        { id: "api", x: 472, y: 34, w: 180, t: "Spring Boot API", s: "JWT · RBAC · rate limits" },
        { id: "bc", x: 472, y: 146, w: 180, t: "BCrypt(Auth_Hash)", s: "all the server can check" },
        { id: "db", x: 472, y: 262, w: 180, t: "MySQL", s: "ciphertext · IV · versions" }
      ],
      edges: [
        ["pw", "auth", "stage 1"], ["auth", "mk", ""], ["mk", "aes", ""], ["auth", "api", "login"],
        ["api", "bc", ""], ["aes", "db", ""], ["cli", "aes", "", "dash"]
      ],
      flowTitle: "life of a secret",
      flow: ["unlock vault", "derive keys locally", "encrypt, new IV", "store ciphertext", "rollback = move pointer"]
    },
    evidence: { code: "keyvault" },
    notes: [
      ["the problem", "Most secrets managers decrypt on the server. If that server or its database is compromised, every secret goes with it. I wanted a design where a full database dump is useless without the user's master password."],
      ["what I built", "Two-stage key derivation in the browser. Stage one turns the master password into <code>Auth_Hash</code> (PBKDF2, 100k rounds); only a BCrypt hash of that reaches the server, so login still works. Stage two derives the encryption key from <code>Auth_Hash</code> and keeps it in memory. Every write is encrypted with AES-256-GCM and a fresh 96-bit IV."],
      ["the tricky part", "Version history: how do you roll back a secret the server can't read? Each update stores the previous ciphertext and IV as an immutable version row, so rollback only moves a pointer. The server never has to decrypt anything."],
      ["what I'd tell you in an interview", "Security is mostly about what the server is <em>unable</em> to do. \"We promise not to look\" is a policy. \"We can't look\" is an architecture."]
    ],
    specs: {
      stack: ["Spring Boot 3.2", "Java 17", "MySQL 8", "Web Crypto API", "Node CLI", "Bucket4j"],
      facts: [["key derivation", "PBKDF2 · 100k · ×2"], ["cipher", "AES-256-GCM"], ["roles", "owner · admin · member · viewer"], ["CI access", "scoped mct_ tokens"], ["audit events", "create · decrypt · rollback · invite"]],
      run: "kv-cli run --env prod -- npm start"
    }
  },
  {
    id: "farme", no: "03", name: "Farm-E", kind: "MARKETPLACE",
    repo: "https://github.com/eduvanthrahul-afk/Farm-E",
    blueprint: {
      dwg: "FE-ARCH-01",
      nodes: [
        { id: "web", x: 20, y: 150, t: "React 19 app", s: "Vite single-page app" },
        { id: "api", x: 255, y: 40, w: 180, t: "Express API", s: "modular monolith · 5 modules" },
        { id: "io", x: 255, y: 170, w: 180, t: "Socket.IO", s: "chat + auction rooms" },
        { id: "r2", x: 255, y: 290, w: 180, t: "object storage", s: "photos + private evidence" },
        { id: "db", x: 505, y: 40, t: "MongoDB replica set", s: "multi-doc transactions" },
        { id: "wk", x: 505, y: 170, t: "SMS outbox worker", s: "lease · backoff · 8 tries" },
        { id: "sms", x: 505, y: 290, t: "SMS provider", s: "mock by default · Twilio" }
      ],
      edges: [
        ["web", "api", "REST + cookie"], ["web", "io", "events"], ["api", "db", ""], ["api", "r2", ""],
        ["wk", "db", "claims jobs"], ["wk", "sms", ""]
      ],
      flowTitle: "order lifecycle (→ DISPUTED possible after delivery)",
      flow: ["pending", "confirmed", "harvesting", "ready", "in transit", "delivered", "weight verified", "settled", "completed"]
    },
    evidence: { code: "farme" },
    notes: [
      ["the problem", "Accepting a bid touches four things at once: the stock reservation, the bid, the order and its contract, and the notification outbox. If one of those writes fails halfway, a farmer could end up selling the same harvest twice."],
      ["what I built", "All of them go through one MongoDB multi-document transaction. Transactions need a replica set (a standalone MongoDB can't run them), so for demos the server can start a temporary one-node replica set in memory. If transactions are unavailable, it falls back to conditional writes and logs a warning instead of failing silently."],
      ["the tricky part", "An SMS can't be part of a database transaction. So notifications go through an outbox: a worker claims each job with a lease, retries temporary failures with exponential backoff, and gives up after 8 attempts, recording QUEUED, SENT, MOCKED, RETRY or FAILED."],
      ["what I'd tell you in an interview", "The matching evaluation scored 0.889 precision@3. It also showed an over-budget listing ranking in the top three. I wrote that up as a product decision (price affects ranking but doesn't disqualify) instead of hiding it."]
    ],
    specs: {
      stack: ["React 19", "Vite", "Express", "MongoDB", "Socket.IO", "Cloudflare R2", "Google sign-in"],
      facts: [["matching precision@3", "0.889"], ["matching MRR", "1.000"], ["SMS retries", "≤ 8, exponential"], ["photos per listing", "up to 5"], ["trace passport", "SHA-256 fingerprint"]],
      run: "cd server && npm run dev"
    }
  },
  {
    id: "decisiontwin", no: "04", name: "DecisionTwin", kind: "SIMULATION",
    repo: "https://github.com/eduvanthrahul-afk/oiho",
    blueprint: {
      dwg: "DT-ARCH-01",
      zones: [{ x: 228, y: 18, w: 444, h: 330, label: "docker compose" }],
      nodes: [
        { id: "web", x: 20, y: 150, t: "vanilla JS client", s: "capture · watch · compare" },
        { id: "api", x: 248, y: 50, w: 180, t: "Spring Boot", s: "Java 21 · JWT · per-tenant" },
        { id: "eng", x: 248, y: 250, w: 180, t: "Python engine", s: "synthetic scorecard" },
        { id: "pg", x: 490, y: 50, t: "PostgreSQL", s: "Flyway · runs persisted" },
        { id: "ghost", x: 490, y: 150, t: "Kafka · Redis", s: "deferred until needed", ghost: true },
        { id: "llm", x: 490, y: 250, t: "Groq LLM", s: "1 call per run" }
      ],
      edges: [
        ["web", "api", "REST · SSE progress"], ["api", "eng", "@Async job"], ["api", "pg", ""], ["eng", "llm", ""]
      ],
      flowTitle: "a run",
      flow: ["register", "create decision", "pick 2–3 prices", "run · SSE", "compare scenarios"]
    },
    evidence: { code: "decisiontwin" },
    notes: [
      ["the problem", "A simulation run calls a Python engine and then an LLM. Both are slow and both can fail. I didn't want to hold an HTTP request open for that, or to let a failed run look like a successful one."],
      ["what I built", "Starting a run saves a job and returns straight away. An <code>@Async</code> worker in its own transaction calls the engine, saves the result and attaches it to the decision, while the browser follows progress over Server-Sent Events. Each provider failure (missing key, rate limit, rejected request, incomplete discussion) maps to a message telling the user exactly what to fix."],
      ["the tricky part", "Without an API key the run fails clearly. It never falls back to canned dialogue or a fake recommendation, and every result is labelled as a synthetic estimate rather than real customer data."],
      ["what I'd tell you in an interview", "Kafka and Redis are deliberately not there yet. One API, one engine and one database are enough until the job volume says otherwise."]
    ],
    specs: {
      stack: ["Java 21", "Spring Boot", "Python 3.12", "PostgreSQL", "Flyway", "Docker Compose", "GitHub Actions"],
      facts: [["LLM calls", "1 per run, not per customer"], ["progress", "Server-Sent Events"], ["auth", "BCrypt + hashed refresh tokens"], ["data", "synthetic, clearly labelled"]],
      run: "docker compose up --build"
    }
  },
  {
    id: "crm", no: "05", name: "Verdant CRM", kind: "OPERATIONS",
    repo: "https://github.com/eduvanthrahul-afk/CRM_DEV",
    blueprint: {
      dwg: "VC-ARCH-01",
      nodes: [
        { id: "web", x: 20, y: 150, t: "vanilla JS app", s: "⌘K search · 360° drawer" },
        { id: "api", x: 255, y: 50, w: 180, t: "Spring Boot 3 REST", s: "JWT · Bean Validation" },
        { id: "job", x: 255, y: 262, w: 180, t: "@Scheduled refresher", s: "every 5 minutes" },
        { id: "pg", x: 505, y: 50, t: "PostgreSQL 16", s: "Flyway V1 → V3" },
        { id: "mv", x: 505, y: 262, t: "materialized view", s: "revenue at risk · 1 row" }
      ],
      edges: [
        ["web", "api", "paged REST · 20/page"], ["api", "pg", "writes"], ["pg", "mv", "aggregates"],
        ["job", "mv", "REFRESH"], ["api", "mv", "dashboard read", "dash"]
      ],
      flowTitle: "the pipeline it runs",
      flow: ["lead", "site survey", "quote · margin check", "project", "payment", "service"]
    },
    evidence: { code: "crm" },
    notes: [
      ["the problem", "The dashboard's headline number, <em>revenue asking for attention</em>, adds up unfollowed quotes, overdue payments, delayed project budgets and low-margin proposals. Working that out live on every page load means a stack of COUNT and SUM queries across four tables, competing with the writes the business depends on."],
      ["what I built", "The aggregates live in one PostgreSQL materialized view, created by a Flyway migration, with a unique index on its single row. A <code>@Scheduled</code> job refreshes it every five minutes, so the dashboard reads one row instead of scanning tables."],
      ["the other half", "Customer and lead lists use server-side pagination (Spring Data <code>Pageable</code>, 20 records a page), so pages stay fast and memory stays flat as the tables grow."],
      ["what I'd tell you in an interview", "Not everything has to be real-time. Five-minute-old KPIs are fine for a dashboard, and that trade-off removes a whole class of load problems."]
    ],
    specs: {
      stack: ["Spring Boot 3.2", "Java 17", "PostgreSQL 16", "Flyway", "JJWT", "vanilla JS"],
      facts: [["dashboard query", "1-row lookup"], ["refresh", "every 5 min"], ["page size", "20 records"], ["low-margin flag", "< 15%"]],
      run: "cd backend && mvn spring-boot:run"
    }
  },
  {
    id: "pomelo", no: "06", name: "Pomelo", kind: "SHIPPED PRODUCT",
    repo: "https://github.com/eduvanthrahul-afk/pomelo",
    blueprint: {
      dwg: "PM-ARCH-01",
      zones: [{ x: 8, y: 8, w: 664, h: 344, label: "your PC · no network path" }],
      nodes: [
        { id: "hook", x: 28, y: 50, t: "key hook", s: "Shift · Ctrl · Alt mid-drag" },
        { id: "dial", x: 28, y: 236, t: "radial dial", s: "opens under the cursor" },
        { id: "rt", x: 255, y: 143, w: 180, t: "engine router", s: "offers only what works" },
        { id: "ff", x: 500, y: 34, t: "FFmpeg", s: "audio · video · images" },
        { id: "pd", x: 500, y: 143, t: "Pandoc", s: "documents" },
        { id: "out", x: 500, y: 262, t: "new file", s: "lands beside the original" }
      ],
      edges: [["hook", "dial", "drag + key"], ["dial", "rt", "dropped on a format"], ["rt", "ff", ""], ["rt", "pd", ""], ["ff", "out", ""], ["pd", "out", ""]],
      flowTitle: "what a user does",
      flow: ["drag a file", "tap a key", "dial opens", "drop on a format", "file appears"]
    },
    evidence: {
      shots: [
        ["assets/cases/pomelo/redact.png", "redact · black out anything, permanently"],
        ["assets/cases/pomelo/trim.png", "trim · cut audio and video in place"],
        ["assets/cases/pomelo/settings.png", "settings · small, on purpose"]
      ]
    },
    notes: [
      ["the problem", "Converting a file usually means opening an app, finding a menu, picking a format and then hunting for the output. I wanted conversion to happen in the middle of a drag, with nothing uploaded."],
      ["what I built", "Pomelo listens for Shift, Ctrl or Alt while a file is being dragged and opens a dial of formats, tools or actions right under the cursor. Windows only hands the file to an app once the drag enters its window, so the dial has to appear where the cursor already is."],
      ["the tricky part", "No program can convert every format into every other one, so the dial only offers what the local engines (FFmpeg and Pandoc) can actually do. It started as OrbitConvert, a C#/WPF prototype that's also on my GitHub."],
      ["what I'd tell you in an interview", "Shipping something strangers download is its own job: unsigned-build warnings, licences, third-party notices, a website and a privacy page all come with it."]
    ],
    specs: {
      stack: ["Windows 11", ".NET", "FFmpeg", "Pandoc"],
      facts: [["uploads", "none, ever"], ["Shift", "convert"], ["Ctrl", "compress · crop · trim · merge"], ["Alt", "share · pin · copy · move"], ["status", "released + live website"]],
      run: "download → unzip → Pomelo.exe",
      extra: [["website", "https://pomelo-website-three.vercel.app"], ["releases", "https://github.com/eduvanthrahul-afk/pomelo/releases/latest"]]
    }
  }
];
