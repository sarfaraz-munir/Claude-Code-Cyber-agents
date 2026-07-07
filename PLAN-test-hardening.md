# PLAN: Test Hardening — Boundary Coverage and Coverage Gates

**Rank: 5 of 5. Prerequisites: PLAN-fix-build-and-ci (CI exists, typecheck covers `__tests__`). Best done after PLAN-posture-review-correctness so tests assert the fixed behaviour, not the buggy one.**

## Goal

The suite is 21 tests for ~3,500 lines and almost entirely happy-path: every scoring boundary, fallback branch, and formatter is untested (that's how the patch-plan drop bug and the invalid-framework-scores-100% bug survived). This plan adds targeted boundary tests per agent, adds coverage reporting with a CI threshold, and locks in the scoring semantics that the whole product's numbers depend on.

## Files to touch

| Action | File |
|--------|------|
| Modify | `package.json` (coverage dep + script) |
| Modify | `vitest.config.ts` (coverage config) |
| Modify | `.github/workflows/ci.yml` (coverage step) |
| Create | `__tests__/risk-governance.test.ts` |
| Create | `__tests__/vulnerability-management.test.ts` |
| Create | `__tests__/compliance-audit.test.ts` |
| Create | `__tests__/threat-intelligence.test.ts` |
| Create | `__tests__/orchestrator-scoring.test.ts` |

## Step-by-step implementation order

### Step 1 — Coverage tooling

```bash
npm install --save-dev @vitest/coverage-v8
```

`vitest.config.ts` currently (140 bytes) just sets test config; extend it:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: { lines: 75, functions: 75 },
    },
  },
});
```

Add script: `"test:coverage": "vitest run --coverage"`. In `.github/workflows/ci.yml`, change the `npm test` step to `npm run test:coverage`. Start thresholds at 75 (raise later); if the initial run comes in below 75, set thresholds 5 points below actual and note it — never delete the gate to make CI pass.

### Step 2 — `__tests__/risk-governance.test.ts`

Import `RiskGovernanceAgent` from `../src/index.js`. Cases (each is one `it`):

1. **Severity boundaries** (`scoreSeverity` via `buildRiskRegister`): likelihood×impact of 20 → `critical`; 16 → `high` (wait — verify: thresholds are ≥20 critical, ≥15 high, ≥9 medium, ≥4 low, else informational). Test exactly: 25→critical, 20→critical, 16→high, 15→high, 12→medium, 9→medium, 8→low, 4→low, 3 (1×3)→informational. Use `likelihood`/`impact` pairs that produce these products (e.g. 4×4=16, 3×5=15, 3×4=12, 3×3=9, 2×4=8, 2×2=4, 1×3=3).
2. **Treatment mapping**: score 20 → `mitigate`; 12 → `mitigate`; 9 → `mitigate`; 8 → `transfer`; 4 → `transfer`; 2 → `accept`. (Yes, `transfer` for low technical risks is odd policy, but it is the implemented and documented behaviour at `src/agents/risk-governance.ts:43` — assert it so any future change is deliberate.)
3. **Roadmap excludes non-mitigate risks**: register with one `accept`-level risk (score 2) → `generateRoadmap` returns 0 items.
4. **Roadmap deadlines**: critical risk → targetDate ≈ today+30d; high → +90d; medium → +180d. Compare date strings computed the same way in the test (`d.setDate(d.getDate()+30)`), not hard-coded dates.
5. **Empty register**: `generateRoadmap([])` → `[]`; `buildExecutiveSummary([])` contains `No critical risks identified`.

### Step 3 — `__tests__/vulnerability-management.test.ts`

1. **CVSS severity boundaries**: 10.0/9.0 → critical; 8.9/7.0 → high; 6.9/4.0 → medium; 3.9/0.1 → low; 0 → informational (note: `if (cvss > 0)` — exactly 0 is informational).
2. **Patch deadline matrix** (`patchDeadlineDays` after triage): exploitedInWild (any severity) → 7; exploitAvailable+critical → 14; exploitAvailable+high → 30; critical no-exploit → 30; high no-exploit → 60; medium → 90; low → 180.
3. **Prioritise ordering**: KEV before exploit-available before high-EPSS before high-CVSS. Include two vulns differing only in `epssScore` where one is `undefined` (treated as 0 — assert the defined one sorts first).
4. **Patch plan exhaustiveness** (regression from PLAN-posture-review-correctness, keep both): sum of `wave.vulnerabilities.length` across waves === input length, for a mixed input of ≥6 vulns covering every branch.
5. **Empty input**: `buildPatchPlan([])` → `[]`; `buildReport([])` returns a string containing `Total: 0`.

### Step 4 — `__tests__/compliance-audit.test.ts`

1. **Score arithmetic**: NIST-CSF has 7 controls. Evidence: 2 compliant + 2 partial + 3 non-compliant → score = round(((2 + 2×0.5)/7)×100) = **43**. Assert exactly 43.
2. **not-applicable exclusion**: mark 3 of 7 `not-applicable`, 4 compliant → applicable = 4, score 100, `notApplicable === 3`.
3. **All controls not-applicable** → score 100 (documented degenerate case: `applicable.length === 0` branch — with the guard from PLAN-posture-review-correctness this only happens via all-N/A evidence, which is legal).
4. **Missing evidence defaults to non-compliant**: empty evidence map → `nonCompliant === totalControls`, score 0.
5. **criticalGaps** contains only `priority === 'critical'` controls that are non-compliant/partial; a compliant critical control must not appear.
6. **Unknown framework throws** (if PLAN-posture-review-correctness landed) — otherwise skip with a TODO comment referencing that plan.
7. **Roadmap ordering**: critical remediation items come before high before normal (assert the priority sequence is non-decreasing in `{critical:0,high:1,normal:2,low:3}` order).

### Step 5 — `__tests__/threat-intelligence.test.ts`

1. **Technique-ID symptom matching**: symptoms `['T1566']` maps to Phishing; assert `techniques` contains `'T1566'`.
2. **Keyword symptom matching**: symptoms `['ransomware']` matches `'Data Encrypted for Impact (Ransomware)'` → contains `'T1486'`.
3. **No-match fallback**: symptoms `['zzz-nonexistent']` → `techniques` empty, and detection/mitigation controls fall back to the generic entries (`SIEM correlation rules...`, `Zero trust network access...`) — assert both arrays have length 1.
4. **Duplicate technique across tactics**: `T1078` (Valid Accounts) exists under both initial-access and privilege-escalation; symptoms `['T1078']` → `techniques` contains `'T1078'` **twice** in current implementation. Assert current behaviour with a comment — or if this is judged a bug, dedupe with `[...new Set()]` in `buildThreatScenario` and assert once. Choose dedupe; it's a one-line fix and scenario consumers treat `techniques` as a set.
5. **Unknown actorId**: `actorId: 'G9999'` → `scenario.actor` is `undefined`, no throw.
6. **Impact assessment**: assets `['customer database', 'production systems']` (2 high-value matches) → `impact: 'critical'`; `['printer']` → `'medium'`.
7. **Likelihood**: known advanced actor (`G0007`) → `'high'` regardless of technique count.

### Step 6 — `__tests__/orchestrator-scoring.test.ts`

Exercise `computePostureScore` and report assembly through the public API:

1. **Clamping**: params engineered for max penalties (8 default critical-ish risks + empty zeroTrust + a KEV vuln list of 5 criticals) → `overallScore >= 0` and `<= 100` and specifically that penalties cap (risk ≤30, arch ≤25, vuln ≤20): construct a case with 10 critical risks and assert score is no lower than the same case with 3 critical risks minus 30 — simpler concrete assertion: with avgCompliance forced to 100 (all controls compliant via full evidence map) and 10 open critical KEV vulns and no other penalties, score === 100 − min(10×5,20) − riskPenalty; compute expected in the test from the same formula and assert equality.
2. **`frameworks: []`**: report has `complianceReports: []`, posture score uses the 70 default, and (post PLAN-posture-review-correctness) no `Average Compliance Score` KPI is present.
3. **Maturity boundaries**: force scores near 85/70/55/35 via evidence maps and assert `maturityLevel` 5/4/3/2 transitions — at minimum assert `computeMaturityLevel` indirectly: a fully-compliant, penalty-free run yields maturity 5.
4. **Roadmap always has the continuous-improvement item**: any run → `roadmap[roadmap.length-1].initiative` contains `'Continuous Improvement'`.
5. **Swarm state hygiene**: after two consecutive reviews on one orchestrator, `completedTasks` has length 2 and `activeTasks` is empty.

## Edge cases a weaker model would miss

- **Test the implemented policy, not your intuition.** Several behaviours look like bugs but are decisions (transfer-treatment for low risks; all-N/A → 100%; wave deadline stricter than per-vuln deadline). Assert them as-is with a brief comment; changing policy belongs in its own reviewed change, not a test PR.
- **Never hard-code computed dates.** `targetDate`/deadlines derive from `new Date()` at run time; recompute expected values inside the test with the identical arithmetic, or tests fail the day they run past midnight boundaries. Do not mock timers unless a test needs sub-day precision (none here does).
- **Random IDs**: `RISK-*/THREAT-*/PB-*` contain `randomUUID()` fragments — match with regexes (`/^RISK-[0-9A-F]{8}$/`), never equality.
- **The `epssScore: undefined` sort case** matters because `(a.epssScore ?? 0) !== (b.epssScore ?? 0)` — two undefined EPSS vulns must fall through to CVSS comparison; cover that too (equal-EPSS pair ordered by CVSS descending).
- **Coverage `exclude` for `src/index.ts`** (pure re-exports) keeps the threshold honest; do not exclude agent files to hit the number.
- **`ai-security.ts` is already the best-covered agent** (9 tests) — don't duplicate; spend the budget on the five files above, which currently have near-zero direct coverage of formatters and boundaries.
- **vitest `--no-coverage` in the existing `test` script**: keep `npm test` fast/coverage-free for local dev; only `test:coverage` (and CI) pays the instrumentation cost.

## Acceptance criteria

1. `npm test` passes with ≥ 55 tests total (21 existing + 5 from PLAN-posture-review-correctness if done + ~30 new), zero skips other than the explicitly conditional unknown-framework test.
2. `npm run test:coverage` exits 0 and prints a coverage table with lines ≥ 75% for `src/` overall.
3. CI workflow runs `npm run test:coverage` and fails if thresholds are unmet (verify by temporarily setting `lines: 99` locally and observing failure, then restoring).
4. `npm run typecheck` still exits 0 (all new test files are typechecked via `tsconfig.typecheck.json`).
5. Every numbered case in Steps 2–6 exists as an individually named `it(...)` — spot-check with `grep -c "it(" __tests__/*.test.ts` ≥ 55 total.
