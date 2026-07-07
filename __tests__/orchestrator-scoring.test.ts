import { describe, it, expect } from 'vitest';
import { CISOOrchestrator } from '../src/index.js';

const NIST_IDS = ['ID.AM-1', 'ID.RA-1', 'PR.AC-1', 'PR.DS-1', 'DE.CM-1', 'RS.RP-1', 'RC.RP-1'];
const fullyCompliantNist = {
  'NIST-CSF': Object.fromEntries(NIST_IDS.map(id => [id, { status: 'compliant' as const }])),
};
const allZeroTrust = {
  mfaEnforced: true, deviceTrustEnabled: true, networkMicroSegmented: true, leastPrivilegeIam: true,
  continuousVerification: true, encryptedInTransit: true, encryptedAtRest: true, pam: true, siem: true, edr: true,
};
const criticalKevVulns = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    cveId: `CVE-2025-${1000 + i}`, title: 'crit', cvssScore: 9.8, affectedAssets: ['srv'],
    exploitAvailable: true, exploitedInWild: true, patchAvailable: true,
  }));

describe('CISOOrchestrator posture scoring', () => {
  it('caps the vulnerability penalty at 20 (100 − 20 = 80 with no other penalties)', async () => {
    const orch = new CISOOrchestrator('score');
    const report = await orch.runSecurityPostureReview({
      riskFindings: [],                       // no risk penalty
      zeroTrustPosture: allZeroTrust,         // no architecture penalty
      frameworks: ['NIST-CSF'],
      complianceEvidence: fullyCompliantNist, // avgCompliance = 100
      vulnerabilities: criticalKevVulns(10),  // 10 open criticals → penalty capped at 20
    });
    expect(report.overallScore).toBe(80);
    expect(report.maturityLevel).toBe(4); // 80 → level 4
  });

  it('reaches maturity level 5 for a fully compliant, penalty-free run', async () => {
    const orch = new CISOOrchestrator('maturity');
    const report = await orch.runSecurityPostureReview({
      riskFindings: [],
      zeroTrustPosture: allZeroTrust,
      frameworks: ['NIST-CSF'],
      complianceEvidence: fullyCompliantNist,
      vulnerabilities: [],
    });
    expect(report.overallScore).toBe(100);
    expect(report.maturityLevel).toBe(5);
  });

  it('omits the compliance KPI when no frameworks are assessed', async () => {
    const orch = new CISOOrchestrator('noframeworks');
    const report = await orch.runSecurityPostureReview({ frameworks: [] });
    expect(report.complianceReports).toEqual([]);
    expect(report.kpis.some(k => k.name === 'Average Compliance Score')).toBe(false);
  });

  it('always appends a Continuous Improvement roadmap item', async () => {
    const orch = new CISOOrchestrator('roadmap');
    const report = await orch.runSecurityPostureReview({});
    expect(report.roadmap[report.roadmap.length - 1].initiative).toContain('Continuous Improvement');
  });

  it('tracks completed tasks across consecutive reviews and clears active tasks', async () => {
    const orch = new CISOOrchestrator('state');
    await orch.runSecurityPostureReview({});
    await orch.runSecurityPostureReview({});
    const state = orch.getSwarmStatus();
    expect(state.completedTasks).toHaveLength(2);
    expect(state.activeTasks).toHaveLength(0);
  }, 10_000);
});
