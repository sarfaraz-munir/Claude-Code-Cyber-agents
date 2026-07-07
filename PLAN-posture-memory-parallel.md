# PLAN: Implement the Approved Posture-Memory + Parallel Review Spec

**Rank: 4 of 5. Prerequisite: PLAN-fix-build-and-ci. Implements the approved spec at `docs/superpowers/specs/2026-06-15-security-posture-ruflo-design.md` — the repo's only formally approved, entirely unimplemented work item.**

## Goal

Per the spec: (1) add `runSecurityPostureReviewParallel()` that fires all specialist agents via `Promise.all`, and (2) add `PostureMemoryService` that persists each run's per-agent outputs and summary to Ruflo's memory via CLI, enabling cross-session history and score trending. The existing sequential `runSecurityPostureReview()` must not change.

## Files to touch

| Action | File |
|--------|------|
| Create | `src/posture-memory.ts` |
| Modify | `src/types.ts` (add `PostureSummary`, `PostureTrend`) |
| Modify | `src/ciso-orchestrator.ts` (add `runSecurityPostureReviewParallel()`) |
| Modify | `src/index.ts` (export new service + types) |
| Create | `run-posture-swarm.ts` |
| Create | `__tests__/posture-memory.test.ts` |
| Modify | `tsconfig.typecheck.json` (add `run-posture-swarm.ts` to include) |

## Step-by-step implementation order

### Step 1 — Add the two types to `src/types.ts`

Copy verbatim from the spec (lines 100-116): `PostureSummary` and `PostureTrend`. Place them after the `CISOAgentState` interface at the end of the file.

### Step 2 — Create `src/posture-memory.ts`

```typescript
/**
 * PostureMemoryService — persists posture review runs to Ruflo memory via CLI.
 * All CLI interaction goes through an injectable executor so tests never
 * spawn real processes (spec: docs/superpowers/specs/2026-06-15-*.md).
 */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { SecurityPostureReport, PostureSummary, PostureTrend } from './types.js';

export type CommandExecutor = (command: string) => string;

const defaultExecutor: CommandExecutor = (command) =>
  execSync(command, { shell: '/bin/zsh', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

/** Wrap a string in single quotes, escaping embedded single quotes for POSIX shells. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export class PostureMemoryService {
  constructor(private readonly executor: CommandExecutor = defaultExecutor) {}

  initSwarm(namespace: string): string {
    const swarmId = `posture-${randomUUID().slice(0, 8)}`;
    const session = JSON.stringify({ swarmId, namespace, startedAt: new Date().toISOString() });
    this.store(`posture:${swarmId}:session`, session);
    return swarmId;
  }

  storeAgentResult(swarmId: string, agentRole: string, result: unknown): void {
    this.store(`posture:${swarmId}:${agentRole}`, JSON.stringify(result));
  }

  storeSummary(swarmId: string, report: SecurityPostureReport): void {
    const summary: PostureSummary = {
      swarmId,
      timestamp: report.generatedAt,
      overallScore: report.overallScore,
      maturityLevel: report.maturityLevel,
      frameworksAssessed: report.complianceReports.map(r => r.framework),
      criticalRisks: report.riskRegister.filter(r => r.severity === 'critical').length,
    };
    this.store(`posture:${swarmId}:summary`, JSON.stringify(summary));
  }

  getHistory(limit = 10): PostureSummary[] {
    let stdout: string;
    try {
      stdout = this.executor(`npx ruflo memory list --format json`);
    } catch {
      return []; // Ruflo CLI missing or daemon not running — graceful degradation per spec
    }
    try {
      const entries = JSON.parse(stdout) as Array<{ key: string; value: string }>;
      return entries
        .filter(e => /^posture:[^:]+:summary$/.test(e.key))
        .map(e => JSON.parse(e.value) as PostureSummary)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit);
    } catch {
      return []; // unparseable CLI output — treat as no history
    }
  }

  computeTrend(history: PostureSummary[]): PostureTrend {
    if (history.length === 0) {
      return { currentScore: 0, previousScore: null, delta: 0, direction: 'stable', reviewsCompared: 0 };
    }
    const [current, previous] = history;
    if (!previous) {
      return { currentScore: current.overallScore, previousScore: null, delta: 0, direction: 'stable', reviewsCompared: 1 };
    }
    const delta = current.overallScore - previous.overallScore;
    return {
      currentScore: current.overallScore,
      previousScore: previous.overallScore,
      delta,
      direction: delta > 0 ? 'improving' : delta < 0 ? 'degrading' : 'stable',
      reviewsCompared: 2,
    };
  }

  private store(key: string, value: string): void {
    this.executor(`npx ruflo memory store -k ${shellQuote(key)} -v ${shellQuote(value)}`);
  }
}
```

**If the actual Ruflo CLI syntax differs** (e.g. `ruflo` vs `npx ruflo`, `--key/--value` vs `-k/-v`, different list command): the only place to change is `store()` and the one command string in `getHistory()`. Run `npx ruflo --help 2>/dev/null` once to check; if the CLI is not installed at all, proceed anyway — the executor abstraction and graceful fallback mean everything still works and tests still pass.

### Step 3 — Add `runSecurityPostureReviewParallel()` to `src/ciso-orchestrator.ts`

Add a new public method directly below `runSecurityPostureReview()`. Do **not** modify the sequential method (spec constraint: zero regression risk). The method mirrors the sequential flow but gathers agent outputs with `Promise.all`:

```typescript
  async runSecurityPostureReviewParallel(params: SecurityPostureReviewParams): Promise<SecurityPostureReport> {
    const rootTask = this.createTask('security-posture-review', 'ciso-queen', 'critical', { ...params } as Record<string, unknown>);
    this.swarmState.activeTasks.push(rootTask);

    const roles: CISOAgentRole[] = ['risk-governance','compliance-audit','threat-intelligence','security-architecture','vulnerability-management','devsecops','security-awareness','ai-security'];
    for (const role of roles) this.markAgentBusy(role);

    const [riskRegisterBase, complianceReports, threatScenarios, archFindings, vulns, , awarenessKPIs, aiRiskEntries] = await Promise.all([
      Promise.resolve().then(() => this.riskAgent.buildRiskRegister(params.riskFindings ?? this.defaultRiskFindings(params.orgProfile))),
      Promise.resolve().then(() => (params.frameworks ?? ['NIST-CSF']).map(f => this.complianceAgent.runGapAnalysis(f as ComplianceFramework, params.complianceEvidence?.[f] ?? {}))),
      Promise.resolve().then(() => (params.threatScenarios ?? this.defaultThreatScenarios(params.orgProfile)).map(ts => this.threatAgent.buildThreatScenario(ts))),
      Promise.resolve().then(() => this.archAgent.assessZeroTrust(params.zeroTrustPosture ?? {})),
      Promise.resolve().then(() => params.vulnerabilities?.length ? this.vulnAgent.triageVulnerabilities(params.vulnerabilities) : []),
      Promise.resolve().then(() => this.devSecOpsAgent.auditPipeline(params.pipelinePosture ?? {})),
      Promise.resolve().then(() => this.awarenessAgent.buildKPIDashboard()),
      Promise.resolve().then(() => params.aiSystems?.length ? this.aiSecAgent.buildAIRiskEntries(params.aiSystems) : []),
    ]);

    const riskRegister = [...riskRegisterBase, ...aiRiskEntries];
    for (const role of roles) this.markAgentIdle(role);

    // Synthesis — identical to the sequential method from here on.
    // Copy lines from `const overallScore = ...` through `return report;`
    // of runSecurityPostureReview verbatim (including completeTask + markAgentIdle('ciso-queen')).
  }
```

Copy the synthesis block from the sequential method rather than trying to share it — the spec explicitly prioritises not touching the existing method over DRY. (If PLAN-posture-review-correctness has been executed first, copy the *fixed* synthesis block, including `aiSecurityFindings` — compute it inside the `Promise.all` as a ninth element instead of the blank slot used above for pipeline findings; keep positions and destructuring consistent.)

### Step 4 — Export from `src/index.ts`

```typescript
export { PostureMemoryService } from './posture-memory.js';
export type { CommandExecutor } from './posture-memory.js';
```

(`PostureSummary`/`PostureTrend` flow through the existing `export * from './types.js'`.)

### Step 5 — Create `run-posture-swarm.ts` (repo root, beside `run-posture-review.ts`)

Wire per the spec's data-flow section:

```typescript
import { CISOOrchestrator, PostureMemoryService } from './src/index.js';

const memory = new PostureMemoryService();
const orch = new CISOOrchestrator('ciso-posture');
const swarmId = memory.initSwarm('ciso-posture');

const report = await orch.runSecurityPostureReviewParallel({
  orgProfile: { industry: 'technology', criticalAssets: ['production-db', 'auth-service'] },
  frameworks: ['NIST-CSF'],
  zeroTrustPosture: { mfaEnforced: true, encryptedInTransit: true, siem: false, edr: false },
  pipelinePosture: { hasSAST: true, hasSecretsScanning: false, hasBranchProtection: true },
});

memory.storeAgentResult(swarmId, 'risk-governance', report.riskRegister);
memory.storeAgentResult(swarmId, 'compliance-audit', report.complianceReports);
memory.storeAgentResult(swarmId, 'threat-intelligence', report.threatScenarios);
memory.storeAgentResult(swarmId, 'vulnerability-management', report.vulnerabilities);
memory.storeSummary(swarmId, report);

const history = memory.getHistory(5);
const trend = memory.computeTrend(history);

console.log(report.executiveSummary);
console.log(`\nScore: ${report.overallScore}/100 | Maturity: ${report.maturityLevel}/5`);
console.log(trend.previousScore === null
  ? 'Trend: first recorded review — no comparison available'
  : `Trend: ${trend.direction} (${trend.delta >= 0 ? '+' : ''}${trend.delta} vs previous ${trend.previousScore})`);
```

Wrap the three `memory.*` store calls and `getHistory` in try/catch? **No** — `storeAgentResult`/`storeSummary` intentionally propagate executor errors per spec (only `getHistory` degrades gracefully). Instead, at the top of the runner, probe once and fall back to a no-op executor if Ruflo is unavailable:

```typescript
function ruflowAvailable(): boolean {
  try { new PostureMemoryService().getHistory(1); return true; } catch { return false; }
}
```

Actually `getHistory` never throws — simpler: try the `initSwarm` call in a try/catch; on failure, print `[warn] Ruflo memory unavailable — running without persistence` to stderr and construct `new PostureMemoryService(() => '[]')` (a stub executor) so the rest of the script proceeds unchanged.

### Step 6 — Create `__tests__/posture-memory.test.ts`

Test with a recording mock executor — no real processes:

```typescript
const calls: string[] = [];
const mockExec = (cmd: string) => { calls.push(cmd); return mockStdout; };
```

Required cases (from the spec's Testing section, plus edge cases below):

1. `initSwarm` issues a store command whose key matches `/^posture:posture-[0-9a-f]{8}:session$/` and returns that swarmId.
2. `storeAgentResult('s1', 'risk-governance', {a: 1})` issues a command containing `posture:s1:risk-governance` and the JSON payload.
3. `storeSummary` stores exactly the six `PostureSummary` fields (parse the `-v` payload out of the recorded command and `JSON.parse` it).
4. `getHistory` parses `[{"key":"posture:x:summary","value":"{...}"}]` stdout into `PostureSummary[]`, sorted newest-first, respecting `limit`, and **excluding** non-summary keys like `posture:x:risk-governance` and `posture:x:session`.
5. `getHistory` returns `[]` when the executor throws (CLI missing) and when stdout is not JSON (`'daemon not running\n'`).
6. `computeTrend`: empty history → `reviewsCompared: 0`, `previousScore: null`, `stable`; single entry → `reviewsCompared: 1`, `stable`; `[{score:80},{score:70}]` → `+10 improving`; `[{score:60},{score:70}]` → `-10 degrading`; equal scores → `stable`.
7. Shell-quoting: store a value containing a single quote (`It's bad`) and assert the recorded command round-trips (no unescaped `'` breaking the quoting) — assert the command contains `'\''`.
8. `runSecurityPostureReviewParallel`: returns a report with the same top-level keys as `runSecurityPostureReview` (compare `Object.keys(...).sort()`), and all agents are `idle` afterwards.

## Edge cases a weaker model would miss

- **`Promise.all` over synchronous methods is not real parallelism.** Every agent method is synchronous CPU work; `Promise.resolve().then(...)` just defers each to a microtask. That is *exactly what the spec asks for* (API shape + drop-in report compatibility) — do not try to add worker threads, and do not claim a performance win in docs.
- **Shell injection through report content.** Risk titles/descriptions flow into `execSync` command strings. A title containing `'; rm -rf ~'` must not execute. The `shellQuote` helper (single-quote wrapping with `'\''` escaping) is mandatory — do not switch to double quotes (zsh expands `$`, backticks) and do not interpolate raw JSON.
- **`getHistory` must survive three distinct failure shapes**: executor throws (binary missing → ENOENT), executor returns non-JSON (daemon banner text), executor returns JSON without the expected `{key, value}` shape. All three → `[]`, never a throw. `storeAgentResult`/`storeSummary` are the opposite: they *should* throw, so callers know persistence failed (the runner handles this with the stub-executor fallback).
- **Spec drift:** the spec references `run-redteam.ts` "same pattern" — that file does not exist in this repo. Ignore the reference; the pattern is fully described in Step 2.
- **Sorting by ISO-8601 strings** (`localeCompare`) is correct only because `generatedAt` is always `new Date().toISOString()` (UTC, fixed width). Don't convert to `Date` objects — unnecessary and introduces TZ-parsing edge cases.
- **Destructuring with a blank slot** (`, ,` in Step 3) keeps `Promise.all` positions aligned when a result (pipeline findings) is unused in synthesis. If you add `aiFindings` as a ninth call, re-check every position — an off-by-one here compiles fine and silently swaps datasets.
- **The queen's `markAgentIdle('ciso-queen')`** increments `tasksCompleted` without a matching `markAgentBusy` — same as the sequential method. Keep it identical (state parity between both methods matters more than tidiness).
- **`tsconfig.typecheck.json`** must gain `run-posture-swarm.ts` in `include`, or the new runner is invisible to typechecking (the exact gap that let `run-posture-review.ts` rot).

## Acceptance criteria

1. `npm run typecheck && npm run build && npm test` all exit 0; new test file contributes at least 10 passing tests.
2. `npx tsx run-posture-swarm.ts` runs to completion **on a machine without Ruflo installed**, printing the report plus either a trend line or `first recorded review` / the stderr warning — it must not crash or hang.
3. With a mock executor, two consecutive `storeSummary` + `getHistory` + `computeTrend` cycles produce `direction: 'improving'` when the second score is higher (covered by test 6).
4. `git diff src/ciso-orchestrator.ts` shows the sequential `runSecurityPostureReview()` body unchanged (only the new method added).
5. `node -e "import('./dist/index.js').then(m => console.log(typeof m.PostureMemoryService))"` prints `function`.
