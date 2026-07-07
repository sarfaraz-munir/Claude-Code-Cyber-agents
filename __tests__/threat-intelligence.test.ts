import { describe, it, expect } from 'vitest';
import { ThreatIntelligenceAgent } from '../src/index.js';

const agent = new ThreatIntelligenceAgent();

const base = { title: 't', description: 'd', affectedAssets: ['x'], attackVector: 'v' };

describe('ThreatIntelligenceAgent MITRE mapping', () => {
  it('matches a technique by its ID symptom', () => {
    const s = agent.buildThreatScenario({ ...base, symptoms: ['T1566'] });
    expect(s.techniques).toContain('T1566');
  });

  it('matches a technique by keyword in its name', () => {
    const s = agent.buildThreatScenario({ ...base, symptoms: ['ransomware'] });
    expect(s.techniques).toContain('T1486');
  });

  it('falls back to generic controls when nothing maps', () => {
    const s = agent.buildThreatScenario({ ...base, symptoms: ['zzz-nonexistent'] });
    expect(s.techniques).toHaveLength(0);
    expect(s.detectionControls).toHaveLength(1);
    expect(s.mitigationControls).toHaveLength(1);
  });

  it('deduplicates a technique that appears under multiple tactics', () => {
    // T1078 (Valid Accounts) is listed under both initial-access and privilege-escalation.
    const s = agent.buildThreatScenario({ ...base, symptoms: ['T1078'] });
    expect(s.techniques.filter(t => t === 'T1078')).toHaveLength(1);
  });

  it('leaves actor undefined for an unknown actorId (no throw)', () => {
    const s = agent.buildThreatScenario({ ...base, actorId: 'G9999' });
    expect(s.actor).toBeUndefined();
  });
});

describe('ThreatIntelligenceAgent impact and likelihood', () => {
  it('rates impact critical for two high-value assets, medium for none', () => {
    expect(agent.buildThreatScenario({ ...base, affectedAssets: ['customer database', 'production systems'] }).impact).toBe('critical');
    expect(agent.buildThreatScenario({ ...base, affectedAssets: ['printer'] }).impact).toBe('medium');
  });

  it('rates likelihood high when a known advanced actor is attributed', () => {
    const s = agent.buildThreatScenario({ ...base, actorId: 'G0007' }); // APT28 — advanced
    expect(s.likelihood).toBe('high');
    expect(s.id).toMatch(/^THREAT-[0-9A-F]{8}$/);
  });
});
