# PLAN: Fix Silent Correctness Bugs in the Posture Review Pipeline

**Rank: 2 of 5. Prerequisite: PLAN-fix-build-and-ci (needs a green build so `npm run typecheck` can validate these edits).**

## Goal

The posture review produces silently wrong or incomplete output in five distinct ways. None of them throw — they just drop data or report misleading numbers, which is fatal for a security-reporting tool's credibility. This plan fixes each with a regression test.

The five bugs:

1. **AI security findings are computed and thrown away.** `src/ciso-orchestrator.ts:170-172` computes `aiFindings` but the variable is never used — it does not appear in the returned `SecurityPostureReport`. Also only `aiSystems[0]` is assessed; systems 2..n are ignored for findings (though their risk entries ARE included via `buildAIRiskEntries`).
2. **High-severity vulnerabilities with a public exploit vanish from the patch plan.** In `src/agents/vulnerability-management.ts:82-91`, the four wave filters are not exhaustive: a vuln with `severity === 'high' && exploitAvailable === true && !exploitedInWild` fails wave 2 (requires `critical`), fails wave 3 (requires `!exploitAvailable`), and fails wave 4 (requires medium/low/info). It appears in no wave and therefore in no patch plan or report.
3. **An invalid framework name yields a 100% compliance score.** `runGapAnalysis` in `src/agents/compliance-audit.ts:88` does `CONTROL_CATALOGUE[framework] ?? []`; with zero controls, `applicable.length === 0` and the score defaults to **100** (line 108-110). Calling `runSecurityPostureReview({ frameworks: ['SOC2'] })` (a plausible typo for `'SOC2-TypeII'`) reports perfect compliance.
4. **Compliance remediation items never reach `report.recommendations`.** `src/ciso-orchestrator.ts:189` merges only `archRemediations` and `riskRoadmap` into `allRemedations` (note existing typo). Each `ComplianceReport.roadmap` is computed but excluded from the top-level recommendations list.
5. **Awareness KPIs report their *target* as their *value*.** `src/ciso-orchestrator.ts:197` maps `value: k.target` — so the dashboard claims e.g. phishing click rate is `<5%` as a measured value when nothing was measured. Related: the `Average Compliance Score` KPI (line 194) has a string value `"73%"` with `unit: ''`, inconsistent with every other KPI (numeric value + unit).

Plus two one-line doc/metadata fixes (Step 7).

## Files to touch

| Action | File |
|--------|------|
| Modify | `src/ciso-orchestrator.ts` |
| Modify | `src/agents/vulnerability-management.ts` |
| Modify | `src/agents/compliance-audit.ts` |
| Modify | `src/types.ts` |
| Modify | `src/plugin.ts` |
| Modify | `README.md` |
| Modify | `__tests__/ciso-swarm.test.ts` (add regression tests) |

## Step-by-step implementation order

### Step 1 — Make the patch-plan waves exhaustive (bug 2)

In `src/agents/vulnerability-management.ts`, `buildPatchPlan`, replace the four filter lines (82-85) with a sequential partition so nothing can fall through:

```typescript
    const assigned = new Set<Vulnerability>();
    const take = (pred: (v: Vulnerability) => boolean) => {
      const group = vulns.filter(v => !assigned.has(v) && pred(v));
      group.forEach(v => assigned.add(v));
      return group;
    };

    const kev  = take(v => v.exploitedInWild);
    const eitW = take(v => v.exploitAvailable && (v.severity === 'critical' || v.severity === 'high'));
    const high = take(v => v.severity === 'critical' || v.severity === 'high');
    const rest = take(() => true);
```

Keep the existing wave labels/deadlines, but update wave 2's label from `'Critical with Public Exploit'` to `'Critical/High with Public Exploit'`. Note: this intentionally gives high+exploit a 14-day wave deadline while `patchDeadline()` assigns those vulns 30 days individually — the wave deadline is the batch SLA and may be stricter; do not "reconcile" them by loosening the wave.

### Step 2 — Reject unknown frameworks (bug 3)

In `src/agents/compliance-audit.ts`, at the top of `runGapAnalysis` (line 88), replace:

```typescript
    const catalogue = CONTROL_CATALOGUE[framework] ?? [];
```

with:

```typescript
    const catalogue = CONTROL_CATALOGUE[framework];
    if (!catalogue) {
      throw new Error(
        `Unknown compliance framework: "${framework}". Supported: ${Object.keys(CONTROL_CATALOGUE).join(', ')}`,
      );
    }
```

Then in `src/ciso-orchestrator.ts`, `runSecurityPostureReview` (line 145-147), validate before mapping so one typo'd framework fails fast with a clear message rather than mid-loop:

```typescript
    const requestedFrameworks = params.frameworks ?? ['NIST-CSF'];
    const complianceReports: ComplianceReport[] = requestedFrameworks.map(f =>
      this.complianceAgent.runGapAnalysis(f as ComplianceFramework, params.complianceEvidence?.[f] ?? {}),
    );
```

(The throw inside `runGapAnalysis` is the actual guard; the rename just keeps the code readable. `SecurityPostureReviewParams.frameworks` stays `string[]` because MCP inputs arrive as plain strings.)

### Step 3 — Include AI findings in the report (bug 1)

In `src/types.ts`, add to `SecurityPostureReport` (after `vulnerabilities`):

```typescript
  aiSecurityFindings?: import('./agents/ai-security.js').AISecurityFinding[];
```

**Alternative if that inline import creates a circular-import problem** (`types.ts` ← `ai-security.ts` already imports from `types.ts`): a type-only circular import is legal in TypeScript and compiles fine with `import type`; use a top-of-file `import type { AISecurityFinding } from './agents/ai-security.js';` instead of the inline form. Verify with `npm run typecheck`.

In `src/ciso-orchestrator.ts` (lines 170-177), assess **all** systems, not just `[0]`:

```typescript
    const aiFindings = (params.aiSystems ?? []).flatMap(s => this.aiSecAgent.assessAISystem(s));
    const aiRiskEntries = params.aiSystems?.length
      ? this.aiSecAgent.buildAIRiskEntries(params.aiSystems)
      : [];
```

Add `aiSecurityFindings: aiFindings,` to the `report` object literal (line 202-215).

### Step 4 — Merge compliance roadmaps into recommendations (bug 4)

In `src/ciso-orchestrator.ts:189`, change:

```typescript
    const allRemedations   = [...archRemediations, ...riskRoadmap];
```

to:

```typescript
    const complianceRemediations = complianceReports.flatMap(r => r.roadmap);
    const allRemediations = [...archRemediations, ...riskRoadmap, ...complianceRemediations];
```

Fix the typo (`allRemedations` → `allRemediations`) at its two other usages: line 200 (`this.buildRoadmap(allRemedations)`) and line 212 (`recommendations: allRemedations.slice(0, 20)`). Compile errors will point at any you miss.

### Step 5 — Fix the KPI semantics (bug 5)

In `src/ciso-orchestrator.ts`, in the `kpis` array (lines 191-198):

- Change the compliance KPI (line 194) to numeric-with-unit, and omit it entirely when there are no compliance reports:

```typescript
      ...(complianceReports.length > 0 ? [{
        name: 'Average Compliance Score',
        value: Math.round(complianceReports.reduce((s, r) => s + r.complianceScore, 0) / complianceReports.length),
        unit: '%',
        trend: 'stable' as const,
        target: 90,
      }] : []),
```

- Change the awareness KPI mapping (line 197) so target stays target:

```typescript
      ...awarenessKPIs.slice(0, 3).map(k => ({ name: k.metric, value: 'not yet measured', unit: '', trend: 'stable' as const, target: k.target })),
```

(`SecurityKPI.value` is typed `number | string` and `target` is `number | string | undefined` in `src/types.ts:191-197`, so both compile as-is.)

### Step 6 — Regression tests

Append to `__tests__/ciso-swarm.test.ts`:

```typescript
describe('posture review correctness regressions', () => {
  const orch = new CISOOrchestrator('regress');

  it('patch plan never drops a vulnerability (high severity + public exploit)', () => {
    const vulns = orch.runVulnerabilityTriage([
      { cveId: 'CVE-2025-0001', title: 'High RCE with exploit', cvssScore: 8.1, affectedAssets: ['api'], exploitAvailable: true, exploitedInWild: false, patchAvailable: true },
      { cveId: 'CVE-2025-0002', title: 'Critical, no exploit', cvssScore: 9.1, affectedAssets: ['db'], exploitAvailable: false, exploitedInWild: false, patchAvailable: true },
      { cveId: 'CVE-2025-0003', title: 'KEV', cvssScore: 9.8, affectedAssets: ['vpn'], exploitAvailable: true, exploitedInWild: true, patchAvailable: true },
      { cveId: 'CVE-2025-0004', title: 'Low', cvssScore: 3.1, affectedAssets: ['intranet'], exploitAvailable: false, exploitedInWild: false, patchAvailable: true },
    ]);
    const agent = new VulnerabilityManagementAgent();
    const plan = agent.buildPatchPlan(agent.prioritise(vulns));
    const planned = plan.flatMap(w => w.vulnerabilities.map(v => v.cveId));
    expect(planned.sort()).toEqual(['CVE-2025-0001', 'CVE-2025-0002', 'CVE-2025-0003', 'CVE-2025-0004']);
  });

  it('rejects unknown compliance frameworks instead of reporting 100%', () => {
    expect(() => orch.runComplianceGapAnalysis('SOC2' as never, {})).toThrow(/Unknown compliance framework/);
  });

  it('includes AI findings for every AI system in the posture report', async () => {
    const profile = (name: string) => ({
      name, type: 'llm' as const, deployment: 'saas-api' as const, dataClasses: ['PII'],
      internetFacing: true, usesExternalModels: true, hasAgentCapabilities: true, hasRAG: true,
      trainingDataSource: 'third-party' as const, humanOversight: 'partial' as const, regulatoryScope: ['GDPR'],
    });
    const report = await orch.runSecurityPostureReview({ aiSystems: [profile('A'), profile('B')] });
    const names = new Set((report.aiSecurityFindings ?? []).map(f => f.systemName));
    expect(names.has('A')).toBe(true);
    expect(names.has('B')).toBe(true);
  });

  it('merges compliance roadmap items into recommendations', async () => {
    const report = await orch.runSecurityPostureReview({ frameworks: ['NIST-CSF'] });
    expect(report.recommendations.some(r => r.id.startsWith('NIST-CSF-REM-'))).toBe(true);
  });

  it('awareness KPIs carry targets, not fabricated values', async () => {
    const report = await orch.runSecurityPostureReview({});
    const awareness = report.kpis.find(k => k.name.toLowerCase().includes('phishing'));
    expect(awareness?.value).toBe('not yet measured');
    expect(awareness?.target).toBeDefined();
  });
});
```

Add `VulnerabilityManagementAgent` to the imports at the top of the test file (`import { VulnerabilityManagementAgent } from '../src/index.js';`).

**Note:** the merged-recommendations test relies on `recommendations` being `allRemediations.slice(0, 20)`. With NIST-CSF's default all-non-compliant roadmap (7 items) plus 8 default risk items plus 10 arch items, the slice may cut compliance items off the end. If the test fails for that reason, sort `allRemediations` by priority (`critical` first) before slicing — that is the correct behaviour anyway — using the same `{ critical: 0, high: 1, normal: 2, low: 3 }` ordering used in `compliance-audit.ts:118`.

### Step 7 — Doc/metadata one-liners

- `src/plugin.ts:7` (comment) and `src/plugin.ts:17` (description string): "8 specialist" → "9 specialist".
- `README.md:71`: tool name `ciso_threat_modeling` → `ciso_threat_model` (the actual registered name in `src/mcp-tools.ts:184`).
- `README.md:10` claims the queen "spawns all 9 specialists in parallel" — the current implementation is sequential and the incident-response agent does not participate in the posture review at all (nothing ever calls `markAgentBusy('incident-response')` and no IR output feeds the report). Soften to: "delegates to 8 specialists (incident-response playbooks are invoked on demand)" — or leave as-is if PLAN-posture-memory-parallel will be executed, and note it there.

## Edge cases a weaker model would miss

- **Bug 2 is invisible in existing tests** because the current test (`__tests__/ciso-swarm.test.ts:90-97`) only uses a KEV vuln and a medium vuln — neither hits the dropped partition. The dropped class is exactly `high && exploitAvailable && !exploitedInWild`.
- **Sequential partition, not independent filters.** If you fix wave filters as independent predicates you risk the dual bug: a vuln matching two waves gets patched twice. The `Set`-based `take()` approach guarantees each vuln lands in exactly one wave.
- **`runGapAnalysis` throwing changes the MCP handler contract** in `src/mcp-tools.ts:175-178` — an invalid `framework` now propagates an error to the MCP client instead of returning a fake-perfect report. That is desired. The JSON schema `enum` already prevents valid clients from sending bad values.
- **Type-only circular imports are fine** (`types.ts` ↔ `agents/ai-security.ts`) as long as you use `import type`. A runtime circular import would not be fine — do not move `AISecurityFinding`'s definition.
- **`aiSecurityFindings` must be optional** in `SecurityPostureReport` — existing consumers (tests, README examples) build/read reports without it.
- **Don't dedupe `aiRiskEntries` against `aiFindings`** — they are different artifacts (risk register entries vs. findings) and both belong in the report.
- **`orch` reuse across tests mutates swarm state** (`tasksCompleted` counters). None of the new assertions depend on those counters — keep it that way.

## Acceptance criteria

1. `npm run typecheck && npm run build` exit 0.
2. `npm test` reports **26 passed** (21 existing + 5 new), zero failures.
3. `npx tsx run-posture-review.ts` output shows AI findings present: add nothing to the script — instead verify via `node -e` one-liner:
   `npx tsx -e "import('./src/index.js').then(async m => { const o = new m.CISOOrchestrator(); const r = await o.runSecurityPostureReview({ aiSystems: [{ name: 'X', type: 'llm', deployment: 'saas-api', dataClasses: ['PII'], internetFacing: true, usesExternalModels: true, hasAgentCapabilities: true, hasRAG: true, trainingDataSource: 'mixed', humanOversight: 'partial', regulatoryScope: ['GDPR'] }] }); console.log(r.aiSecurityFindings.length > 0 ? 'PASS' : 'FAIL'); })"` prints `PASS`.
4. `grep -n 'allRemedations' src/` returns no matches (typo eradicated).
5. `grep -n '8 specialist' src/plugin.ts` returns no matches.
