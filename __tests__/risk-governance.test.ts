import { describe, it, expect } from 'vitest';
import { RiskGovernanceAgent } from '../src/index.js';

const agent = new RiskGovernanceAgent();

/** Build a single-entry register with the given likelihood × impact. */
function one(likelihood: number, impact: number) {
  return agent.buildRiskRegister([
    { title: 't', description: 'd', category: 'technical', likelihood: likelihood as 1|2|3|4|5, impact: impact as 1|2|3|4|5 },
  ])[0];
}

/** Date string N days from today, computed the same way the agent does. */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('RiskGovernanceAgent scoreSeverity boundaries', () => {
  it('maps risk scores to severities at each threshold', () => {
    expect(one(5, 5).severity).toBe('critical');   // 25
    expect(one(4, 5).severity).toBe('critical');   // 20
    expect(one(4, 4).severity).toBe('high');       // 16
    expect(one(3, 5).severity).toBe('high');       // 15
    expect(one(3, 4).severity).toBe('medium');     // 12
    expect(one(3, 3).severity).toBe('medium');     // 9
    expect(one(2, 4).severity).toBe('low');        // 8
    expect(one(2, 2).severity).toBe('low');        // 4
    expect(one(1, 3).severity).toBe('informational'); // 3
  });
});

describe('RiskGovernanceAgent treatment mapping', () => {
  it('assigns treatment by score band (documented behaviour, incl. transfer for low technical risk)', () => {
    expect(one(4, 5).treatment).toBe('mitigate');  // 20
    expect(one(3, 4).treatment).toBe('mitigate');  // 12
    expect(one(3, 3).treatment).toBe('mitigate');  // 9
    expect(one(2, 4).treatment).toBe('transfer');  // 8
    expect(one(2, 2).treatment).toBe('transfer');  // 4
    expect(one(1, 2).treatment).toBe('accept');    // 2
  });
});

describe('RiskGovernanceAgent roadmap', () => {
  it('excludes non-mitigate risks from the roadmap', () => {
    const register = agent.buildRiskRegister([
      { title: 'accept-me', description: 'd', category: 'technical', likelihood: 1, impact: 2 }, // score 2 → accept
    ]);
    expect(agent.generateRoadmap(register)).toHaveLength(0);
  });

  it('sets deadlines by severity (critical +30, high +90, medium +180)', () => {
    const register = agent.buildRiskRegister([
      { title: 'crit', description: 'd', category: 'technical', likelihood: 5, impact: 5 }, // 25 critical
      { title: 'high', description: 'd', category: 'technical', likelihood: 3, impact: 5 }, // 15 high
      { title: 'med',  description: 'd', category: 'technical', likelihood: 3, impact: 3 }, // 9 medium (mitigate)
    ]);
    const roadmap = agent.generateRoadmap(register);
    const byTitle = (t: string) => roadmap.find(r => r.title.includes(t))!;
    expect(byTitle('crit').targetDate).toBe(daysFromNow(30));
    expect(byTitle('high').targetDate).toBe(daysFromNow(90));
    expect(byTitle('med').targetDate).toBe(daysFromNow(180));
  });

  it('handles empty inputs gracefully', () => {
    expect(agent.generateRoadmap([])).toEqual([]);
    expect(agent.buildExecutiveSummary([])).toContain('No critical risks identified');
  });

  it('generates well-formed risk IDs', () => {
    expect(one(3, 3).id).toMatch(/^RISK-[0-9A-F]{8}$/);
  });
});
