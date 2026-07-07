import { describe, it, expect } from 'vitest';
import { ComplianceAuditAgent } from '../src/index.js';
import type { ComplianceControl } from '../src/index.js';

const agent = new ComplianceAuditAgent();

// NIST-CSF catalogue (7 controls): ID.AM-1 (high), ID.RA-1 (critical), PR.AC-1 (critical),
// PR.DS-1 (high), DE.CM-1 (critical), RS.RP-1 (critical), RC.RP-1 (high).
type Status = ComplianceControl['status'];
const ev = (status: Status) => ({ status });

describe('ComplianceAuditAgent scoring', () => {
  it('computes score = (compliant + partial*0.5) / applicable', () => {
    const report = agent.runGapAnalysis('NIST-CSF', {
      'ID.AM-1': ev('compliant'),
      'ID.RA-1': ev('compliant'),
      'PR.AC-1': ev('partial'),
      'PR.DS-1': ev('partial'),
      'DE.CM-1': ev('non-compliant'),
      'RS.RP-1': ev('non-compliant'),
      'RC.RP-1': ev('non-compliant'),
    });
    expect(report.complianceScore).toBe(43); // round(((2 + 2*0.5)/7)*100)
  });

  it('excludes not-applicable controls from the denominator', () => {
    const report = agent.runGapAnalysis('NIST-CSF', {
      'ID.AM-1': ev('not-applicable'),
      'ID.RA-1': ev('not-applicable'),
      'PR.AC-1': ev('not-applicable'),
      'PR.DS-1': ev('compliant'),
      'DE.CM-1': ev('compliant'),
      'RS.RP-1': ev('compliant'),
      'RC.RP-1': ev('compliant'),
    });
    expect(report.notApplicable).toBe(3);
    expect(report.complianceScore).toBe(100);
  });

  it('scores 100 when every control is not-applicable (degenerate empty-denominator case)', () => {
    const allNa = Object.fromEntries(
      ['ID.AM-1','ID.RA-1','PR.AC-1','PR.DS-1','DE.CM-1','RS.RP-1','RC.RP-1'].map(id => [id, ev('not-applicable')]),
    );
    expect(agent.runGapAnalysis('NIST-CSF', allNa).complianceScore).toBe(100);
  });

  it('defaults missing evidence to non-compliant → score 0', () => {
    const report = agent.runGapAnalysis('NIST-CSF', {});
    expect(report.nonCompliant).toBe(report.totalControls);
    expect(report.complianceScore).toBe(0);
  });

  it('lists only non-compliant/partial critical controls as critical gaps', () => {
    const report = agent.runGapAnalysis('NIST-CSF', {
      'ID.RA-1': ev('compliant'),     // critical, compliant → must NOT be a gap
      'PR.AC-1': ev('non-compliant'), // critical, non-compliant → gap
    });
    const gapIds = report.criticalGaps.map(g => g.id);
    expect(gapIds).toContain('PR.AC-1');
    expect(gapIds).not.toContain('ID.RA-1');
  });

  it('rejects unknown frameworks', () => {
    expect(() => agent.runGapAnalysis('SOC2' as never, {})).toThrow(/Unknown compliance framework/);
  });

  it('orders the remediation roadmap by priority (critical first)', () => {
    const report = agent.runGapAnalysis('NIST-CSF', {}); // all non-compliant
    const order = { critical: 0, high: 1, normal: 2, low: 3 } as const;
    const ranks = report.roadmap.map(r => order[r.priority]);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });
});
