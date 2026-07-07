# PLAN: Fix the Broken Build and Add CI

**Rank: 1 of 5 (do this first — every other plan depends on a green `npm run build`)**

## Goal

`npm run build` currently fails with ~20 TypeScript errors. Tests pass only because vitest transpiles with esbuild, which skips type-checking entirely — so the type errors are invisible to `npm test`. This plan makes `tsc` compile cleanly, adds a `typecheck` script that also covers tests and the runner script, and adds a GitHub Actions workflow so the build can never silently break again.

## Files to touch

| Action | File |
|--------|------|
| Modify | `package.json` |
| Modify | `src/agents/compliance-audit.ts` |
| Modify | `src/agents/security-architecture.ts` |
| Modify | `src/agents/devsecops.ts` |
| Modify | `src/agents/security-awareness.ts` |
| Modify | `src/ciso-orchestrator.ts` |
| Modify | `src/index.ts` |
| Modify | `run-posture-review.ts` |
| Create | `tsconfig.typecheck.json` |
| Create | `.github/workflows/ci.yml` |

## Step-by-step implementation order

### Step 1 — Install `@types/node`

```bash
cd /Users/smuneer/CISO-agents
npm install --save-dev @types/node@^20
```

This fixes all five `TS2307: Cannot find module 'node:crypto'` errors (in `src/ciso-orchestrator.ts`, `src/agents/ai-security.ts`, `src/agents/incident-response.ts`, `src/agents/risk-governance.ts`, `src/agents/threat-intelligence.ts`). Do **not** edit those import statements — they are correct; only the type declarations were missing.

### Step 2 — Export the four private interfaces used in public signatures

These interfaces are returned by public methods of exported classes, so `tsc --declaration` fails with TS4053/TS4058 ("has or is using name ... but cannot be named"). The fix is to add the `export` keyword — nothing else:

1. `src/agents/security-architecture.ts:8` — change `interface ArchitectureReviewFinding {` to `export interface ArchitectureReviewFinding {`
2. `src/agents/devsecops.ts:6` — change `interface PipelineSecurityFinding {` to `export interface PipelineSecurityFinding {`
3. `src/agents/security-awareness.ts:6` — change `interface AwarenessModule {` to `export interface AwarenessModule {`
4. `src/agents/security-awareness.ts:17` — change `interface PhishingSimulation {` to `export interface PhishingSimulation {`

Then add these to the public API in `src/index.ts` (after the existing `export type` line for ai-security):

```typescript
export type { ArchitectureReviewFinding } from './agents/security-architecture.js';
export type { PipelineSecurityFinding } from './agents/devsecops.js';
export type { AwarenessModule, PhishingSimulation } from './agents/security-awareness.js';
```

### Step 3 — Fix the literal-widening error in `compliance-audit.ts`

In `src/agents/compliance-audit.ts` (around line 115), the `roadmap` intermediate const loses literal types. **Why this errors here but not in the visually identical code in `risk-governance.ts:76` and `security-architecture.ts:128`:** those two build the array directly inside a method with a declared return type of `RemediationItem[]`, so contextual typing narrows `'high' : 'medium'` to literals. In `compliance-audit.ts` the array is assigned to an untyped intermediate `const roadmap = ...` first, so the ternary widens to `string` (the trailing `as const` in `'high' : 'medium' as const` binds only to `'medium'`, not the whole ternary — a precedence trap).

Fix by annotating the const. Change:

```typescript
    const roadmap = controls
```

to:

```typescript
    const roadmap: RemediationItem[] = controls
```

`RemediationItem` must be imported. The file currently imports only `ComplianceFramework, ComplianceControl, ComplianceReport` from `../types.js` — add `RemediationItem` to that import.

### Step 4 — Fix the `createTask` argument error in `ciso-orchestrator.ts`

`src/ciso-orchestrator.ts:127` passes `params` (type `SecurityPostureReviewParams`) where `Record<string, unknown>` is expected. Interfaces have no implicit index signature in strict mode. Change line 127 from:

```typescript
    const rootTask = this.createTask('security-posture-review', 'ciso-queen', 'critical', params);
```

to:

```typescript
    const rootTask = this.createTask('security-posture-review', 'ciso-queen', 'critical', { ...params } as Record<string, unknown>);
```

Do not change `SecurityPostureReviewParams` to a `type` alias or add an index signature to it — that would weaken type safety for callers.

### Step 5 — Fix `run-posture-review.ts` (wrong parameter shape)

The runner passes keys that do not exist on `SecurityPostureReviewParams` (`orgName`, `industry` at top level, `cloudProviders`, `complianceFrameworks`, `existingControls`, `recentIncidents`). They are all **silently ignored** today — only `aiSystems` takes effect. It also uses `'SOC2'` which is not a valid `ComplianceFramework` (must be `'SOC2-TypeII'`). Replace the params object (lines 11–34) with:

```typescript
const report = await orch.runSecurityPostureReview({
  orgProfile: {
    industry: 'technology',
    employeeCount: 500,
    cloudProvider: 'AWS',
    criticalAssets: ['production-db', 'auth-service', 'payment-api'],
  },
  frameworks: ['SOC2-TypeII', 'ISO-27001', 'NIST-CSF'],
  zeroTrustPosture: { mfaEnforced: true, siem: true, edr: true },
  aiSystems: [
    {
      name: 'Internal LLM Chatbot',
      type: 'llm' as const,
      deployment: 'saas-api' as const,
      dataClasses: ['PII', 'confidential-ip'],
      internetFacing: true,
      usesExternalModels: true,
      hasAgentCapabilities: true,
      hasRAG: true,
      trainingDataSource: 'third-party' as const,
      humanOversight: 'partial' as const,
      regulatoryScope: ['GDPR', 'EU-AI-ACT-HIGH-RISK'],
    },
  ],
});
```

(The old `existingControls: ['MFA', 'SIEM', 'EDR', 'WAF']` maps to the `zeroTrustPosture` booleans above; WAF has no corresponding field — drop it.)

### Step 6 — Add a typecheck tsconfig and script

Create `tsconfig.typecheck.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "__tests__/**/*.ts", "run-posture-review.ts"]
}
```

**Deliberately excluded:** `examples/collection-integration.ts` — it contains `await import('ciso-agents')` (the package importing itself by name), which cannot resolve without the package being installed into its own node_modules. Do not add `examples/` to the include list; do not "fix" the example's import.

In `package.json` scripts, add:

```json
"typecheck": "tsc -p tsconfig.typecheck.json"
```

### Step 7 — Fix package.json metadata

- `repository.url` says `https://github.com/smuneer/CISO-agents` but the actual remote is `https://github.com/sarfaraz-munir/Claude-Code-Cyber-agents.git`. Update it.
- Add `"engines": { "node": ">=20" }`.
- Add `"files": ["dist", "README.md", "LICENSE"]` so an eventual `npm publish` ships only build output.

### Step 8 — Verify `.gitignore` covers `dist/`

Read `.gitignore`. If `dist/` (or `dist`) is not listed, add it on its own line. Do not remove existing entries.

### Step 9 — Create the CI workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

## Edge cases a weaker model would miss

- **Tests passing ≠ build working.** vitest uses esbuild transform, which strips types without checking them. Never conclude "tests pass, so types are fine" in this repo. That is exactly how these 20 errors accumulated.
- **`'high' : 'medium' as const`** — `as const` binds tighter than the ternary, so it only narrows the `'medium'` branch. Do not "fix" this by sprinkling more `as const`; annotate the destination (`const roadmap: RemediationItem[]`).
- **TS4053 is fixed by `export`, not by changing types.** The interfaces are structurally correct; the compiler just can't *name* them in emitted `.d.ts` files.
- **Do not switch `mcp-tools.ts` bracket accesses** (`orchestrator['riskAgent']`) to dot access while in that file — dot access to `private` members is a TS error; bracket access is TypeScript's intentional escape hatch. Leave them alone.
- **`run-posture-review.ts` and `examples/` were never typechecked** (tsconfig `include` is `src/**` only), which is why the runner's wrong param shape survived. The new `tsconfig.typecheck.json` closes this gap for the runner but must exclude `examples/` (see Step 6).
- **`rootDir` conflict:** the base tsconfig sets `rootDir: "src"`. Including `__tests__` and root-level files without overriding `rootDir` to `"."` makes tsc error with TS6059. The override in Step 6 handles this; don't remove it.

## Acceptance criteria

Run these from `/Users/smuneer/CISO-agents`; all must hold:

1. `npm run build` exits 0 with no output errors, and `dist/index.js`, `dist/index.d.ts`, `dist/ciso-orchestrator.js` exist.
2. `npm run typecheck` exits 0.
3. `npm test` still reports **21 passed** (no test regressions).
4. `npx tsx run-posture-review.ts` runs to completion and prints an executive summary containing `EXECUTIVE SECURITY BRIEFING`, and the `=== COMPLIANCE SUMMARY ===` section now lists **three** frameworks (SOC2-TypeII, ISO-27001, NIST-CSF) instead of one.
5. `git status` shows no changes under `dist/` tracked (i.e. `dist/` is gitignored).
6. `.github/workflows/ci.yml` exists and `npx yaml-lint` is NOT required — just verify the YAML parses by running `node -e "require('js-yaml')"` is unnecessary; instead confirm the workflow file matches Step 9 verbatim.
7. `grep -c '"typecheck"' package.json` returns 1; `grep -c 'sarfaraz-munir/Claude-Code-Cyber-agents' package.json` returns 1.
