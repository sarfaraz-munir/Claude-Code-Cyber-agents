# Security Posture Use Case — Ruflo-Native Swarm + Persistent Memory

**Date:** 2026-06-15  
**Status:** Approved  
**Project:** CISO-agents

---

## Context

The existing `runSecurityPostureReview()` method in `CISOOrchestrator` runs 9 specialist agents sequentially (simulated parallelism via `markAgentBusy`/`markAgentIdle`). Each run is stateless — results are not persisted anywhere, so there is no cross-session memory, no historical trending, and no true concurrent execution.

This spec adds two things:
1. **Ruflo-native parallel execution** — all 9 agents run concurrently via `Promise.all`
2. **Persistent vector memory** — each run's per-agent outputs and final summary are stored in Ruflo's hybrid SQLite+HNSW memory, enabling historical trend analysis across sessions

---

## Architecture

### New: `PostureMemoryService` (`src/posture-memory.ts`)

Single-responsibility class that owns all Ruflo CLI interactions. Accepts an optional `executor` function in its constructor (defaults to `execSync`) so tests can inject a mock without hitting real Ruflo processes.

Methods:
- `initSwarm(namespace)` → `string` — generates a `swarmId`, stores session metadata in Ruflo memory, returns `swarmId`
- `storeAgentResult(swarmId, agentRole, result)` → `void` — writes per-agent JSON output under key `posture:<swarmId>:<agentRole>`
- `storeSummary(swarmId, report)` → `void` — writes synthesized report summary (score, maturity, timestamp, swarmId) under key `posture:<swarmId>:summary`
- `getHistory(limit?)` → `PostureSummary[]` — reads past summaries from Ruflo memory, sorted by timestamp descending
- `computeTrend(history)` → `PostureTrend` — computes score delta and direction vs. the previous entry

### Modified: `CISOOrchestrator` (`src/ciso-orchestrator.ts`)

New method `runSecurityPostureReviewParallel(params)` added alongside the existing sequential method (which is preserved unchanged). The parallel method:
1. Marks all 9 agents busy
2. Fires all agent calls concurrently via `Promise.all`
3. Collects results, marks agents idle
4. Synthesizes `SecurityPostureReport` using existing private helpers
5. Returns the same `SecurityPostureReport` shape — drop-in compatible with the existing method

The existing `runSecurityPostureReview()` is not modified, ensuring zero regression risk.

### New: `run-posture-swarm.ts`

End-to-end runner that wires `PostureMemoryService` + `runSecurityPostureReviewParallel()`:

```
init swarm session (Ruflo memory)
  → Promise.all([9 agents])
  → store each agent result (Ruflo memory)
  → synthesize SecurityPostureReport
  → store summary (Ruflo memory)
  → retrieve history (Ruflo memory)
  → print report + trend vs. last run
```

---

## Data Flow

```
run-posture-swarm.ts
  PostureMemoryService.initSwarm('ciso-posture')
    → Ruflo CLI: memory store -k "posture:<swarmId>:session" ...
  
  Promise.all([
    riskAgent.buildRiskRegister(),
    complianceAgent.runGapAnalysis(),
    threatAgent.buildThreatScenario(),
    archAgent.assessZeroTrust(),
    vulnAgent.triageVulnerabilities(),
    devSecOpsAgent.auditPipeline(),
    awarenessAgent.buildKPIDashboard(),
    aiSecAgent.assessAISystem(),
    (incident / awareness placeholders)
  ])
  
  for each result:
    PostureMemoryService.storeAgentResult(swarmId, role, result)
      → Ruflo CLI: memory store -k "posture:<swarmId>:<role>" ...
  
  orchestrator.synthesize(results) → SecurityPostureReport
  
  PostureMemoryService.storeSummary(swarmId, report)
    → Ruflo CLI: memory store -k "posture:<swarmId>:summary" ...
  
  PostureMemoryService.getHistory(5)
    → Ruflo CLI: memory list (filtered by prefix "posture:*:summary")
  
  computeTrend(history) → { delta: +3, direction: 'improving' }
  
  print report + trend
```

---

## New Types (`src/types.ts`)

```typescript
export interface PostureSummary {
  swarmId: string;
  timestamp: string;
  overallScore: number;
  maturityLevel: 1 | 2 | 3 | 4 | 5;
  frameworksAssessed: string[];
  criticalRisks: number;
}

export interface PostureTrend {
  currentScore: number;
  previousScore: number | null;
  delta: number;
  direction: 'improving' | 'stable' | 'degrading';
  reviewsCompared: number;
}
```

---

## Files

| Action | File | What |
|--------|------|------|
| Create | `src/posture-memory.ts` | `PostureMemoryService` with injected executor |
| Modify | `src/types.ts` | Add `PostureSummary`, `PostureTrend` interfaces |
| Modify | `src/ciso-orchestrator.ts` | Add `runSecurityPostureReviewParallel()` |
| Modify | `src/index.ts` | Export `PostureMemoryService` |
| Create | `run-posture-swarm.ts` | Ruflo-native swarm runner |
| Create | `__tests__/posture-memory.test.ts` | TDD tests for `PostureMemoryService` |

---

## Testing

`PostureMemoryService` is tested with a mock executor injected via constructor — no real Ruflo CLI calls in tests. Tests verify:
- `initSwarm` calls executor with correct key format
- `storeAgentResult` calls executor with correct key/value
- `storeSummary` stores expected fields
- `getHistory` parses CLI output into `PostureSummary[]`
- `computeTrend` returns correct delta and direction for improving/stable/degrading cases

`runSecurityPostureReviewParallel()` is tested to confirm:
- Returns the same `SecurityPostureReport` shape as the sequential method
- All agents return to idle after the call

---

## Constraints

- The existing `runSecurityPostureReview()` is not touched — zero regression risk
- Ruflo CLI calls use `execSync` with `shell: '/bin/zsh'` (same pattern as `run-redteam.ts`)
- `PostureMemoryService` has no dependency on `CISOOrchestrator` — clean separation
- `getHistory` gracefully returns `[]` if Ruflo CLI returns no results (daemon not running)
