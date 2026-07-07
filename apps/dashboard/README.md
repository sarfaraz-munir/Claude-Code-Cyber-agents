# CISO Security Posture Dashboard

An interactive, authenticated web app that runs full security posture assessments
through the CISO Queen orchestrator (`CISOOrchestrator`) and renders them as an
executive dashboard: overall score gauge, KPI cards, compliance / risk / vuln /
architecture / pipeline / AI drill-downs, a score-trend chart, a Markdown/print
export, and a live **What-If** panel for modelling remediations.

## Architecture

- **Backend:** Express (TypeScript, ESM) in `server/`, wrapping the `ciso-agents`
  engine directly. Assessment history is a local JSON file (`data/history.json`).
- **Frontend:** React 18 + Vite in `src/`, built to `dist-web/`.
- In development the two run separately (Vite proxies `/api` to the API). In
  production the Express server serves the built SPA and the API on one port.

## Local development

```bash
# from repo root — build the engine once so the dashboard can import it
npm install && npm run build

# then, in this directory
cd apps/dashboard
npm install
cp .env.example .env      # fill in DASHBOARD_PASSWORD and SESSION_SECRET
npm run dev               # API on :8787, Vite UI on :5173
```

Open the Vite URL, log in with `DASHBOARD_PASSWORD`, and click **New Review**.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | no (default 8787) | Port the server listens on |
| `NODE_ENV` | no | `production` enables secure cookies + serves the built SPA |
| `DASHBOARD_PASSWORD` | **yes** | Shared login password |
| `SESSION_SECRET` | **yes** | Secret used to sign session cookies (long random string) |
| `HISTORY_FILE` | no | Override the history JSON path (used in tests) |

The server refuses to start if `DASHBOARD_PASSWORD` or `SESSION_SECRET` is unset.
Never commit `.env`.

## Docker

Build from the **repo root** (the image needs the engine source):

```bash
docker build -f apps/dashboard/Dockerfile -t ciso-dash .

docker run -p 8787:8787 \
  -e DASHBOARD_PASSWORD=change-me \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e NODE_ENV=production \
  -v "$(pwd)/apps/dashboard/data:/app/apps/dashboard/data" \
  ciso-dash
```

**The `data/` directory must be a mounted volume** (shown above) or assessment
history is lost when the container is replaced. On Fly.io/Render, attach a
persistent volume/disk at `/app/apps/dashboard/data`.

## First run (walkthrough)

After logging in, create a review with these inputs to reproduce the fintech
baseline:

- Industry `fintech`, cloud `AWS`, critical assets `payment-api, customer-db, auth-service`
- Frameworks: `SOC2-TypeII`, `PCI-DSS`
- Zero-trust: `mfaEnforced` On; `siem` and `edr` Off; leave the rest **Unset**
- Pipeline: `hasSAST` and `hasBranchProtection` On; `hasSecretsScanning` and
  `hasContainerScanning` Off; leave the rest Unset
- One AI system: an internet-facing `llm` using an external model, data classes
  `PII, financial`

> **Note on scoring:** controls left **Unset** are treated as *missing*; setting
> a control **Off** marks it *partial* — these produce different scores. And a
> low score usually means "no compliance evidence supplied," not "insecure" — the
> **How this score was calculated** panel explains the breakdown. Supply control
> evidence for a realistic number.

## What-If panel

The What-If tab starts from the current run and lets you toggle high-leverage
controls (SIEM, EDR, secrets/container scanning, IAM, encryption, PAM) and a
"critical risks mitigated" slider, projecting the score live **without saving**.
Click **Save scenario** to persist a projection as a new review.
