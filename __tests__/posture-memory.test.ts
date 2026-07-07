import { describe, it, expect } from 'vitest';
import { PostureMemoryService } from '../src/posture-memory.js';
import { CISOOrchestrator } from '../src/ciso-orchestrator.js';
import type { PostureSummary, SecurityPostureReport } from '../src/types.js';

/** Extract the value passed after `-v ` from a recorded `ruflo memory store` command. */
function extractStoredValue(command: string): string {
  const marker = " -v '";
  const start = command.indexOf(marker) + marker.length;
  const raw = command.slice(start, command.length - 1); // drop trailing quote
  return raw.replace(/'\\''/g, "'"); // un-escape shell-quoted single quotes
}

function makeReport(overrides: Partial<SecurityPostureReport> = {}): SecurityPostureReport {
  return {
    generatedAt: '2026-07-07T00:00:00.000Z',
    overallScore: 72,
    maturityLevel: 4,
    summary: '',
    executiveSummary: '',
    riskRegister: [],
    complianceReports: [{ framework: 'NIST-CSF' } as SecurityPostureReport['complianceReports'][number]],
    threatScenarios: [],
    vulnerabilities: [],
    recommendations: [],
    kpis: [],
    roadmap: [],
    ...overrides,
  };
}

describe('PostureMemoryService', () => {
  it('initSwarm stores a session under a well-formed key and returns the swarmId', () => {
    const calls: string[] = [];
    const svc = new PostureMemoryService((c) => { calls.push(c); return ''; });
    const swarmId = svc.initSwarm('ns');
    expect(swarmId).toMatch(/^posture-[0-9a-f]{8}$/);
    expect(calls[0]).toContain(`posture:${swarmId}:session`);
  });

  it('storeAgentResult stores under posture:<swarmId>:<role> with the JSON payload', () => {
    const calls: string[] = [];
    const svc = new PostureMemoryService((c) => { calls.push(c); return ''; });
    svc.storeAgentResult('s1', 'risk-governance', { a: 1 });
    expect(calls[0]).toContain('posture:s1:risk-governance');
    expect(extractStoredValue(calls[0])).toBe(JSON.stringify({ a: 1 }));
  });

  it('storeSummary persists exactly the six PostureSummary fields', () => {
    const calls: string[] = [];
    const svc = new PostureMemoryService((c) => { calls.push(c); return ''; });
    svc.storeSummary('s1', makeReport({
      overallScore: 80,
      maturityLevel: 4,
      riskRegister: [
        { severity: 'critical' } as never,
        { severity: 'high' } as never,
      ],
    }));
    const stored = JSON.parse(extractStoredValue(calls[0])) as PostureSummary;
    expect(Object.keys(stored).sort()).toEqual(
      ['criticalRisks', 'frameworksAssessed', 'maturityLevel', 'overallScore', 'swarmId', 'timestamp'],
    );
    expect(stored.overallScore).toBe(80);
    expect(stored.criticalRisks).toBe(1);
    expect(stored.frameworksAssessed).toEqual(['NIST-CSF']);
  });

  it('getHistory parses summaries, sorts newest-first, respects limit, excludes non-summary keys', () => {
    const entries = [
      { key: 'posture:a:summary', value: JSON.stringify({ swarmId: 'a', timestamp: '2026-01-01T00:00:00.000Z', overallScore: 50, maturityLevel: 3, frameworksAssessed: [], criticalRisks: 0 }) },
      { key: 'posture:b:summary', value: JSON.stringify({ swarmId: 'b', timestamp: '2026-03-01T00:00:00.000Z', overallScore: 70, maturityLevel: 4, frameworksAssessed: [], criticalRisks: 0 }) },
      { key: 'posture:b:risk-governance', value: '[]' },
      { key: 'posture:b:session', value: '{}' },
    ];
    const svc = new PostureMemoryService(() => JSON.stringify(entries));
    const history = svc.getHistory(5);
    expect(history.map(h => h.swarmId)).toEqual(['b', 'a']); // newest first
    expect(svc.getHistory(1).map(h => h.swarmId)).toEqual(['b']);
  });

  it('getHistory returns [] when the executor throws (CLI missing)', () => {
    const svc = new PostureMemoryService(() => { throw new Error('ENOENT'); });
    expect(svc.getHistory()).toEqual([]);
  });

  it('getHistory returns [] when stdout is not JSON', () => {
    const svc = new PostureMemoryService(() => 'daemon not running\n');
    expect(svc.getHistory()).toEqual([]);
  });

  it('computeTrend covers empty, single, improving, degrading, and stable histories', () => {
    const svc = new PostureMemoryService(() => '');
    const s = (score: number, ts: string): PostureSummary => ({ swarmId: ts, timestamp: ts, overallScore: score, maturityLevel: 3, frameworksAssessed: [], criticalRisks: 0 });

    expect(svc.computeTrend([])).toMatchObject({ reviewsCompared: 0, previousScore: null, direction: 'stable' });
    expect(svc.computeTrend([s(60, 'x')])).toMatchObject({ reviewsCompared: 1, previousScore: null, direction: 'stable' });
    expect(svc.computeTrend([s(80, 'b'), s(70, 'a')])).toMatchObject({ delta: 10, direction: 'improving', reviewsCompared: 2 });
    expect(svc.computeTrend([s(60, 'b'), s(70, 'a')])).toMatchObject({ delta: -10, direction: 'degrading' });
    expect(svc.computeTrend([s(70, 'b'), s(70, 'a')])).toMatchObject({ delta: 0, direction: 'stable' });
  });

  it('shell-quotes values containing single quotes so the command round-trips', () => {
    const calls: string[] = [];
    const svc = new PostureMemoryService((c) => { calls.push(c); return ''; });
    svc.storeAgentResult('s1', 'risk-governance', { title: "It's bad" });
    expect(calls[0]).toContain(`'\\''`); // escaped single quote present
    expect(extractStoredValue(calls[0])).toBe(JSON.stringify({ title: "It's bad" }));
  });
});

describe('runSecurityPostureReviewParallel', () => {
  it('returns the same report shape as the sequential method', async () => {
    const orch = new CISOOrchestrator('parallel');
    const [seq, par] = await Promise.all([
      orch.runSecurityPostureReview({ frameworks: ['NIST-CSF'] }),
      orch.runSecurityPostureReviewParallel({ frameworks: ['NIST-CSF'] }),
    ]);
    expect(Object.keys(par).sort()).toEqual(Object.keys(seq).sort());
  });

  it('leaves all agents idle after the parallel review', async () => {
    const orch = new CISOOrchestrator('parallel-idle');
    await orch.runSecurityPostureReviewParallel({ frameworks: ['NIST-CSF'], aiSystems: [{
      name: 'A', type: 'llm', deployment: 'saas-api', dataClasses: ['PII'],
      internetFacing: true, usesExternalModels: true, hasAgentCapabilities: true, hasRAG: true,
      trainingDataSource: 'mixed', humanOversight: 'partial', regulatoryScope: ['GDPR'],
    }] });
    for (const agent of Object.values(orch.getSwarmStatus().agents)) {
      expect(agent.status).toBe('idle');
    }
  }, 10_000);
});
