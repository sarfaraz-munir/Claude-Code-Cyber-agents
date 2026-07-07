# PLAN: Interactive CISO Security Posture Dashboard

**Goal:** Build a hosted, authenticated web application that runs full security posture assessments through the CISO Queen orchestrator (`CISOOrchestrator`), renders the results as an interactive executive dashboard, persists every run to a JSON file for score trending, lets users export a board briefing, and includes an interactive "what-if" layer executives can play with.

**This plan is written for a less capable executor model.** Follow the phases in order. Do not skip verification steps. Every file to create/edit is named explicitly. When a step says "run X and confirm Y," actually run it and do not proceed until Y holds. If a command fails, fix the cause named in the "Common failures" box for that phase before continuing — do not invent new approaches.

---

## Decisions already made (do NOT re-litigate)

| Area | Decision |
|------|----------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express (TypeScript, ESM) wrapping `CISOOrchestrator` directly |
| Persistence | Local JSON file (`data/history.json`) — no database |
| Auth | Session cookie + single shared password from env (`DASHBOARD_PASSWORD`), plus signed-cookie session |
| Deployment | Docker container serving built React + the API on one port; runnable on Fly.io/Render |
| Charts | `recharts` (React-native, simple API) |
| Features | Run-review forms, score trend chart, specialist drill-downs, Markdown export, interactive what-if panel |

---

## Repository facts the executor MUST rely on (verified — do not re-derive)

The app is a **new sub-package** at `apps/dashboard/` inside the existing repo. It imports the CISO engine as a local dependency.

The engine's entry point is `src/index.ts` (built to `dist/index.js`). The relevant exports:

- `CISOOrchestrator` — class. Construct with `new CISOOrchestrator(namespace?: string)`.
- Types (all from the same package): `SecurityPostureReport`, `SecurityPostureReviewParams`, `ComplianceFramework`, `AISystemProfile`, `PostureSummary`, `PostureTrend`, `RiskEntry`, `Vulnerability`, `ComplianceReport`, `RemediationItem`, `RoadmapItem`, `SecurityKPI`.
- `PostureMemoryService` — **do NOT use it** for this app (it shells out to a Ruflo CLI). Persistence here is a plain JSON file. `PostureSummary`/`PostureTrend` **types** are still reused.

`CISOOrchestrator` public methods the API will call (signatures verified in `src/ciso-orchestrator.ts`):

- `getSwarmStatus(): CISOSwarmState`
- `runSecurityPostureReview(params: SecurityPostureReviewParams): Promise<SecurityPostureReport>` — **primary method the dashboard calls.**
- `runSecurityPostureReviewParallel(params): Promise<SecurityPostureReport>` — same shape; optional "fast" toggle.
- Specialist methods for drill-downs if needed later: `runComplianceGapAnalysis`, `runVulnerabilityTriage`, `assessAISystem`, `runArchitectureReview`, `auditDevSecOpsPipeline`, `getShadowAIInventory`, `getOWASPLLMTop10`, `getMitreAtlasTechniques`. **Phase 1–6 only need `runSecurityPostureReview` and `getSwarmStatus`.**

`SecurityPostureReviewParams` shape (verified — this is the ONLY correct shape; the old `run-posture-review.ts` git history shows a WRONG shape, ignore it):

```typescript
{
  orgProfile?: { industry?: string; employeeCount?: number; cloudProvider?: string; criticalAssets?: string[] };
  frameworks?: string[];  // e.g. ['SOC2-TypeII','PCI-DSS','NIST-CSF','ISO-27001','GDPR','HIPAA','CIS-Controls']
  complianceEvidence?: Record<string, Record<string, { status: 'compliant'|'partial'|'non-compliant'|'not-applicable'; evidence?: string; gaps?: string[] }>>;
  riskFindings?: Array<{ title; description; category; likelihood; impact; cveIds?; mitreAttackIds? }>;
  threatScenarios?: Array<{ title; description; affectedAssets; attackVector; symptoms?; actorId? }>;
  zeroTrustPosture?: { mfaEnforced?; deviceTrustEnabled?; networkMicroSegmented?; leastPrivilegeIam?; continuousVerification?; encryptedInTransit?; encryptedAtRest?; pam?; siem?; edr?: boolean };
  pipelinePosture?: { hasSAST?; hasDASTStaging?; hasSecretsScanning?; hasDependencyReview?; hasSBOM?; hasContainerScanning?; hasIACScanning?; hasSLSAProvenance?; hasSignedArtifacts?; hasMinimumReviewers?; hasBranchProtection?; hasPinnedDependencies?: boolean };
  aiSystems?: AISystemProfile[];
}
```

`AISystemProfile` shape (all fields REQUIRED — verified in `src/agents/ai-security.ts`):

```typescript
{
  name: string;
  type: 'llm'|'ml-classifier'|'cv-model'|'recommendation'|'autonomous-agent'|'rag-system'|'multi-modal';
  deployment: 'saas-api'|'self-hosted'|'on-premise'|'edge';
  dataClasses: string[];
  internetFacing: boolean;
  usesExternalModels: boolean;
  hasAgentCapabilities: boolean;
  hasRAG: boolean;
  trainingDataSource: 'internal'|'public'|'third-party'|'mixed';
  humanOversight: 'full'|'partial'|'none';
  regulatoryScope: string[];
}
```

`SecurityPostureReport` shape the UI renders (verified in `src/types.ts`):

```typescript
{
  generatedAt: string; overallScore: number; maturityLevel: 1|2|3|4|5;
  summary: string; executiveSummary: string;
  riskRegister: RiskEntry[]; complianceReports: ComplianceReport[];
  threatScenarios: ThreatScenario[]; vulnerabilities: Vulnerability[];
  recommendations: RemediationItem[]; kpis: SecurityKPI[]; roadmap: RoadmapItem[];
  aiSecurityFindings?: AISecurityFinding[];
}
```

**Scoring facts the UI must communicate (verified against `computePostureScore`):** score = `avgCompliance − riskPenalty(≤30) − archPenalty(≤25) − vulnPenalty(≤20)`, clamped 0–100. Compliance controls with NO evidence default to `non-compliant`; zero-trust/pipeline controls left unset default to `missing`. **A low score often means "no evidence supplied," not "insecure."** The UI MUST surface this (see Phase 4, `ScoreExplainer`), or executives will misread a 0.

---

## Target file tree (create exactly this)

```
apps/dashboard/
  package.json
  tsconfig.json
  vite.config.ts
  .env.example
  Dockerfile
  .dockerignore
  data/
    .gitkeep                 # history.json is created at runtime, gitignored
  server/
    index.ts                 # Express app entry
    auth.ts                  # login/session middleware
    orchestrator.ts          # singleton CISOOrchestrator + run wrapper
    history.ts               # JSON-file read/append/trend
    routes.ts                # /api/* handlers
    validate.ts              # request body validation (zod)
  src/                       # React app
    main.tsx
    App.tsx
    api.ts                   # typed fetch client
    auth/LoginPage.tsx
    components/
      ScoreGauge.tsx
      ScoreExplainer.tsx
      TrendChart.tsx
      KpiCards.tsx
      RiskTable.tsx
      CompliancePanel.tsx
      VulnPanel.tsx
      ArchitecturePanel.tsx
      PipelinePanel.tsx
      AiFindingsPanel.tsx
      RoadmapTimeline.tsx
      WhatIfPanel.tsx
      ExportButton.tsx
    pages/
      DashboardPage.tsx
      NewReviewPage.tsx
      HistoryPage.tsx
    lib/
      report.ts              # shared report types (import from engine) + markdown builder
    styles.css
  README.md
```

---

## Phase 0 — Scaffold and wire the engine dependency

**Do this first and verify before writing any feature code.**

1. Ensure the engine is built: from repo root run `npm run build` and confirm `dist/index.js` exists.
2. Create `apps/dashboard/` and its `package.json`. Set `"type": "module"`. The dashboard depends on the engine via a **file link**: add `"ciso-agents": "file:../.."` to `dependencies`. Then from `apps/dashboard/` run `npm install`.
   - **Why file link, not a relative import:** the engine's `package.json` `exports` map resolves `import { CISOOrchestrator } from 'ciso-agents'` to `dist/index.js`. Relative `../../dist` imports also work but break the type surface; use the package name.
3. Dependencies to install in `apps/dashboard/package.json`:
   - runtime: `express`, `cookie-session`, `zod`, `ciso-agents` (file link)
   - dev: `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `@types/express`, `typescript`, `tsx`, `concurrently`, `recharts`, `react-router-dom`
4. `vite.config.ts`: React plugin; dev server proxy so `/api` → `http://localhost:8787` (the Express port). Build output to `dist-web/`.
5. `tsconfig.json`: extend the root style (ES2022, NodeNext for server; but Vite handles the client). Simplest: one tsconfig with `"jsx": "react-jsx"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"skipLibCheck": true`.
6. Scripts in `apps/dashboard/package.json`:
   - `"dev": "concurrently \"npm:dev:api\" \"npm:dev:web\""`
   - `"dev:api": "tsx watch server/index.ts"`
   - `"dev:web": "vite"`
   - `"build": "vite build"`
   - `"start": "node --loader tsx server/index.ts"` (serves built `dist-web/` + API on one port for production)
   - `"typecheck": "tsc --noEmit"`

**Verify Phase 0:** create a throwaway `server/smoke.ts` that does `import { CISOOrchestrator } from 'ciso-agents'; const r = await new CISOOrchestrator().runSecurityPostureReview({ frameworks: ['NIST-CSF'] }); console.log(r.overallScore);` and run `npx tsx server/smoke.ts`. It MUST print a number 0–100. Delete `smoke.ts` after. **If this fails, do not proceed** — the dependency link is wrong; re-check step 2.

> **Common failures (Phase 0):** (a) `ERR_MODULE_NOT_FOUND 'ciso-agents'` → the file link didn't install; run `npm install` in `apps/dashboard/` and confirm `node_modules/ciso-agents` is a symlink. (b) engine not built → run `npm run build` in repo root. (c) ESM/CJS error → the dashboard `package.json` must have `"type": "module"`.

---

## Phase 1 — Backend: orchestrator singleton + history store

1. `server/orchestrator.ts`: export a module-level singleton `const orchestrator = new CISOOrchestrator('dashboard')` and an async `runReview(params: SecurityPostureReviewParams, opts?: { parallel?: boolean }): Promise<SecurityPostureReport>` that calls `runSecurityPostureReviewParallel` when `opts.parallel`, else `runSecurityPostureReview`. **One singleton for the process** — swarm task state accumulates intentionally; do not construct per request.
2. `server/history.ts`:
   - File path: `data/history.json`. On read, if the file is missing return `[]` (do NOT throw). Wrap all reads/writes in try/catch and treat corruption as empty (log to `console.error`).
   - `appendRun(report: SecurityPostureReport, label: string): StoredRun` — build a record `{ id: crypto.randomUUID(), label, savedAt: new Date().toISOString(), report }`, append, write atomically (write to `data/history.json.tmp` then `fs.rename`).
   - `listRuns(): StoredRun[]` — newest first (sort by `savedAt` descending).
   - `getRun(id): StoredRun | undefined`.
   - `computeTrend(): PostureTrend` — reuse the SAME logic as `PostureMemoryService.computeTrend` (see `src/posture-memory.ts`): from the two newest summaries, `delta = current − previous`, direction `improving|degrading|stable`. Derive `PostureSummary` from each stored `report` (`overallScore`, `maturityLevel`, `generatedAt`→timestamp, `complianceReports.map(r=>r.framework)`, count of critical risks).
   - **Concurrency note:** requests are serialized by Node's single thread, but the atomic tmp+rename write prevents a half-written file if the process is killed mid-write. Do not add file locking.

**Verify Phase 1:** unit-test `history.ts` with a temp file (inject the path). Confirm: empty file → `[]`; append two runs → `listRuns()` returns 2 newest-first; `computeTrend()` returns `improving` when the newer run's score is higher. Use vitest (the repo already has it) or a plain `tsx` assertion script.

---

## Phase 2 — Backend: auth

1. `server/auth.ts`:
   - Use `cookie-session` with `secret: process.env.SESSION_SECRET` (required; throw at startup if unset).
   - `POST /api/login` body `{ password }`: compare against `process.env.DASHBOARD_PASSWORD` using a **constant-time compare** (`crypto.timingSafeEqual` over equal-length buffers; if lengths differ, still run a dummy compare then fail — do not early-return on length, it leaks). On success set `req.session.authed = true`. On failure return 401.
   - `POST /api/logout`: clear the session.
   - `requireAuth` middleware: if `!req.session?.authed` return 401. Apply to ALL `/api/*` routes EXCEPT `/api/login`.
2. Rate-limit `/api/login`: allow N=10 attempts per IP per 15 min (simple in-memory map of `ip -> {count, resetAt}`; reset when `resetAt` passes). Return 429 when exceeded. This is a shared-password app — brute-force protection is mandatory.

**Security constraints (do not violate):**
- `DASHBOARD_PASSWORD` and `SESSION_SECRET` come ONLY from env. Never hardcode, never commit, never log them. `.env.example` lists the names with empty/placeholder values.
- Cookies: `httpOnly: true`, `sameSite: 'lax'`, and `secure: true` when `NODE_ENV==='production'`.
- Never send the password back in any response. Login response is `{ ok: true }` or 401 `{ error: 'invalid credentials' }`.

**Verify Phase 2:** with the server running, `curl` `/api/history` without a cookie → 401. `curl -X POST /api/login` with wrong password → 401; correct password → 200 and a `Set-Cookie`. Re-request `/api/history` with the cookie → 200.

---

## Phase 3 — Backend: routes + validation

1. `server/validate.ts`: zod schemas mirroring `SecurityPostureReviewParams` and `AISystemProfile` (shapes above). Reject unknown frameworks NOT in the enum before calling the engine, with 400 + a clear message — **but note the engine ALSO throws on unknown frameworks** (`runComplianceGapAnalysis`), so wrap the engine call in try/catch and map thrown errors to 400 with `{ error: err.message }`.
2. `server/routes.ts` (all under `requireAuth` except login):
   - `POST /api/reviews` body `{ params, label, parallel? }` → validate, `runReview`, `appendRun`, respond `{ run: StoredRun }`.
   - `GET /api/history` → `{ runs: StoredRun[], trend: PostureTrend }`.
   - `GET /api/reviews/:id` → `{ run }` or 404.
   - `GET /api/reviews/:id/markdown` → `text/markdown` body built by `lib/report.ts` markdown builder (Content-Disposition attachment).
   - `GET /api/swarm` → `orchestrator.getSwarmStatus()` (for a live "agents" strip in the UI).
   - `POST /api/whatif` body `{ params }` → runs a review but does **NOT** persist (used by the interactive panel). Respond `{ report }`.
3. `server/index.ts`: create Express app, `express.json({ limit: '1mb' })`, mount auth + routes, and in production `express.static('dist-web')` with a SPA fallback (`app.get('*', ...sendFile index.html)`) so client routes work. Listen on `process.env.PORT ?? 8787`.

**Verify Phase 3:** `POST /api/reviews` with the fintech example params (below) returns a run whose `report.overallScore` is a number and `report.complianceReports` has entries. `GET /api/history` then returns that run and a `trend`. `GET /api/reviews/:id/markdown` returns markdown text containing `EXECUTIVE SECURITY BRIEFING`.

Reference params for testing (the fintech scenario):
```json
{ "params": { "orgProfile": { "industry": "fintech", "cloudProvider": "AWS", "criticalAssets": ["payment-api","customer-db","auth-service"] },
  "frameworks": ["SOC2-TypeII","PCI-DSS"],
  "zeroTrustPosture": { "mfaEnforced": true, "siem": false, "edr": false },
  "pipelinePosture": { "hasSAST": true, "hasBranchProtection": true, "hasSecretsScanning": false, "hasContainerScanning": false },
  "aiSystems": [{ "name":"Customer Chatbot","type":"llm","deployment":"saas-api","dataClasses":["PII","financial"],"internetFacing":true,"usesExternalModels":true,"hasAgentCapabilities":false,"hasRAG":false,"trainingDataSource":"third-party","humanOversight":"partial","regulatoryScope":["PCI-DSS","GDPR"] }] },
  "label": "Fintech baseline" }
```

---

## Phase 4 — Frontend: shell, auth, dashboard render

1. `src/api.ts`: typed fetch wrapper. Every call uses `credentials: 'include'`. On any 401 response, redirect to `/login`. Export functions: `login`, `logout`, `createReview`, `getHistory`, `getReview`, `whatIf`, `markdownUrl(id)`.
2. `src/auth/LoginPage.tsx`: single password field → `login()` → on success navigate to `/`. Show a friendly error on 401 and a "too many attempts" message on 429.
3. `src/App.tsx`: `react-router-dom` routes: `/login`, `/` (DashboardPage — latest run), `/new` (NewReviewPage), `/history` (HistoryPage). A top nav with the org name, a live agents strip (from `/api/swarm`), and logout.
4. `DashboardPage.tsx` renders the latest run using these components:
   - `ScoreGauge` — big animated 0–100 gauge (recharts radial or a simple SVG arc) with maturity label (`1 Initial…5 Optimising`).
   - **`ScoreExplainer`** — REQUIRED. Renders the penalty breakdown as a waterfall: start at avgCompliance, subtract risk/arch/vuln penalties. If any compliance framework has 0 supplied evidence, show a prominent callout: "Low score reflects missing control evidence, not necessarily weak security — supply evidence in New Review." Recompute the breakdown client-side from the report fields (critical-risk count, critical arch gaps, critical open vulns) using the caps 30/25/20.
   - `KpiCards` — one card per `report.kpis` entry (value, unit, target, trend arrow).
   - `RoadmapTimeline` — the `report.roadmap` items across quarters.

**Verify Phase 4:** log in, land on dashboard, see the latest run's gauge, KPIs, and — for a no-evidence run — the ScoreExplainer callout. Confirm a 0 score shows the "missing evidence" explanation, not a bare zero.

---

## Phase 5 — Frontend: New Review form + specialist drill-downs

1. `NewReviewPage.tsx` — a multi-section form producing `SecurityPostureReviewParams`:
   - Org profile (industry text, employee count, cloud provider select, critical assets tag input).
   - Frameworks multi-select; when a framework is selected, reveal an **evidence editor**: a row per control is NOT required — instead offer a compact table where the user can add `{ controlId, status }` rows (status select). Leave it optional; empty = engine defaults. Add helper text: "No evidence = control treated as non-compliant."
   - Zero-trust: 10 labelled toggles (tri-state: on / off / unset — because unset ≠ off in scoring; unset→missing, off→partial). Represent tri-state explicitly; do NOT collapse to a boolean.
   - Pipeline: 12 labelled toggles (same tri-state rule).
   - AI systems: repeatable card; every field from `AISystemProfile` (all required — validate before submit).
   - Submit → `createReview` → navigate to dashboard showing the new run. A "Run in parallel (fast)" checkbox sets `parallel: true`.
2. Specialist drill-down components rendered as tabs on the dashboard (or a `/run/:id` detail route):
   - `CompliancePanel` — per framework: score, compliant/partial/non-compliant counts, and a table of `criticalGaps` (id, controlName, status). Color by status.
   - `RiskTable` — sortable by `riskScore`; columns severity, title, category, likelihood×impact, treatment. Filter by severity.
   - `VulnPanel` — `report.vulnerabilities` grouped into the patch-plan waves (KEV/Emergency, exploit, high, rest) with deadlines; empty state if none.
   - `ArchitecturePanel` — zero-trust findings by domain (Identity/Device/Network/Data/Detection), status badges.
   - `PipelinePanel` — DevSecOps findings, missing vs present, severity.
   - `AiFindingsPanel` — `report.aiSecurityFindings` mapped to OWASP LLM IDs with severity and regulatory implications.
   - **Tri-state → params mapping (critical, verify):** on = `true`, off = `false`, unset = OMIT the key entirely (so the engine sees `undefined` → "missing"). A weaker model will be tempted to send `false` for unset — that produces "partial," a DIFFERENT score. Send `undefined`/omit for unset.

**Verify Phase 5:** build the fintech scenario through the form, submit, and confirm the rendered numbers match the API's (spot-check overallScore and SOC2 %). Toggle a zero-trust control from unset to on and confirm the score changes on re-run.

---

## Phase 6 — Interactive what-if panel + export

1. `WhatIfPanel.tsx` — the "executives love it" feature. Starts from the current run's params. Presents the highest-leverage levers as live controls:
   - Toggles for SIEM, EDR, secrets scanning, container scanning, least-privilege IAM, encryption in transit, PAM.
   - A "critical risks mitigated" slider (0..N) that trims `riskFindings` mitigate-items to model remediation.
   - On any change (debounced 400ms) call `POST /api/whatif` (non-persisted) and animate the `ScoreGauge` + `ScoreExplainer` to the projected score. Show a delta badge vs the saved baseline ("+24 → Maturity 3").
   - A "Save this scenario" button that promotes the current what-if params to a real `createReview` with a label.
   - **Must be read-only against history:** what-if NEVER writes to `data/history.json`. Only explicit "Save scenario" persists.
2. `ExportButton.tsx` — downloads `GET /api/reviews/:id/markdown`. The markdown builder in `lib/report.ts` produces a board-ready doc: title, generated date, score + maturity, the `executiveSummary` verbatim, compliance table, top-10 risks, AI findings, and the roadmap. Also offer "Print" (`window.print()`) with a print stylesheet for a clean PDF via the browser.

**Verify Phase 6:** move the SIEM/EDR toggles on in what-if and watch the gauge rise without a new history entry; confirm `data/history.json` length is unchanged. Click Save scenario → history gains one entry. Export markdown → file contains the executive summary and compliance table.

---

## Phase 7 — Docker + hosting + docs

1. `Dockerfile` (multi-stage):
   - Stage 1 (builder): copy the WHOLE repo (the dashboard needs the engine). Run `npm ci && npm run build` at root (builds engine `dist/`), then `cd apps/dashboard && npm ci && npm run build` (builds `dist-web/`).
   - Stage 2 (runtime): `node:20-slim`, copy repo `dist/`, `apps/dashboard` (server + `dist-web/` + node_modules), set `WORKDIR apps/dashboard`, `CMD ["npm","run","start"]`, `EXPOSE 8787`.
   - `.dockerignore`: `node_modules`, `**/dist`, `**/dist-web`, `.git`, `data/history.json`.
2. Runtime env (document in `apps/dashboard/README.md` and `.env.example`): `PORT`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`. **The `data/` directory must be a mounted volume** on the host (Fly volume / Render disk) or history is lost on redeploy — call this out explicitly.
3. `apps/dashboard/README.md`: local dev (`npm run dev`), env vars, Docker build/run, and the volume requirement. Include the fintech example params as a "first run" walkthrough.
4. `.gitignore` (repo root): add `apps/dashboard/data/history.json`, `apps/dashboard/dist-web`, `apps/dashboard/.env`.

**Verify Phase 7:** `docker build -t ciso-dash .` from repo root succeeds. `docker run -p 8787:8787 -e DASHBOARD_PASSWORD=test -e SESSION_SECRET=xyz -e NODE_ENV=production -v $(pwd)/apps/dashboard/data:/app/apps/dashboard/data ciso-dash` starts; browsing `localhost:8787` shows the login page; logging in and running the fintech scenario works and persists across a container restart.

---

## Edge cases a weaker model WILL miss (call-outs)

1. **Unset ≠ off in scoring.** Zero-trust/pipeline toggles are tri-state. Sending `false` for a control the user didn't touch yields "partial"; omitting it yields "missing." These give different scores. The form must distinguish and the params builder must OMIT unset keys.
2. **A 0/low score is usually "no evidence," not "insecure."** Without the `ScoreExplainer` callout, executives will panic at a 0. This is the single most important UX requirement — it is why `ScoreExplainer` is mandatory, not optional.
3. **Unknown framework throws.** The engine's `runGapAnalysis` throws for a framework outside the 7-value enum. Validate client + server, and catch engine throws → 400. Never let it 500.
4. **`AISystemProfile` has NO optional fields.** Every one of its 11 fields is required. A half-filled AI card will fail engine typing at runtime (zod must enforce before the call).
5. **Singleton orchestrator, accumulating state.** `getSwarmStatus()` reflects cumulative `completedTasks`. That's intended for the live agents strip. Do NOT reset it per request or per run.
6. **What-if must never persist.** It calls `/api/whatif`, which does not write history. Only explicit save persists. Getting this wrong pollutes the trend chart with throwaway experiments.
7. **Atomic history writes.** Write to `history.json.tmp` then rename. A naive `writeFile` interrupted mid-write corrupts the only data store.
8. **Constant-time password compare + login rate limit.** Shared-password auth without these is trivially brute-forceable. Both are required, not nice-to-haves.
9. **Money/PII stays local.** The report can contain sensitive org data. Nothing in this app should send report contents to any third-party service, analytics, or CDN. All assets are self-hosted/bundled by Vite.
10. **SPA fallback in production.** Without `app.get('*')` → `index.html`, deep links like `/history` 404 on refresh in the container.

---

## Acceptance criteria (the executor must demonstrate ALL)

1. `cd apps/dashboard && npm run typecheck` exits 0.
2. `npm run dev` starts API (8787) + Vite; browsing the Vite URL redirects an unauthenticated user to `/login`.
3. Wrong password → 401 with a visible error; after 10 rapid wrong attempts → 429. Correct password → dashboard.
4. Running the fintech reference scenario via the New Review form produces a dashboard whose `overallScore`, SOC2 %, and PCI %, match a direct API `POST /api/reviews` with the same params (spot-check equality).
5. A run with `frameworks: ['SOC2-TypeII']` and NO evidence shows a low score AND the ScoreExplainer "missing evidence" callout.
6. The what-if panel changes the projected score live (e.g. enabling SIEM+EDR+secrets+container scanning raises it) WITHOUT adding a history entry; "Save scenario" adds exactly one.
7. Score trend chart shows ≥2 saved runs with a correct delta/direction matching `computeTrend`.
8. Markdown export downloads a file containing `EXECUTIVE SECURITY BRIEFING`, a compliance table, and the roadmap.
9. `docker build` succeeds and the container serves the app on 8787 with history persisting across a restart (volume mounted).
10. No secret (`DASHBOARD_PASSWORD`, `SESSION_SECRET`) appears in any committed file, log line, or HTTP response. `grep -ri "DASHBOARD_PASSWORD" apps/dashboard/src server` returns only variable references, never a value.

---

## Suggested execution order for the weaker model

Phase 0 → 1 → 2 → 3 (backend fully working + curl-verified) **before** any React. Then 4 → 5 → 6 (frontend). Then 7 (Docker/host). Verify at the end of every phase; do not batch verification to the end. If any phase's verify step fails, fix within that phase's "Common failures" guidance before moving on.
