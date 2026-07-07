import { describe, it, expect } from 'vitest';
import { RedTeamAgent } from '../src/agents/red-team.js';
import { CISOOrchestrator } from '../src/ciso-orchestrator.js';
import type { RedTeamScope, RedTeamFinding } from '../src/types.js';

const SAMPLE_SCOPE: RedTeamScope = {
  engagementType: 'external',
  targetAssets: ['web-application', 'vpn-gateway', 'email-server'],
  outOfScope: ['production-database'],
  objectives: ['data-exfiltration', 'persistence'],
  rulesOfEngagement: 'No destructive actions. Business hours only.',
};

describe('RedTeamAgent', () => {
  const agent = new RedTeamAgent();

  it('has expected capabilities', () => {
    expect(agent.capabilities).toContain('attack-surface-recon');
    expect(agent.capabilities).toContain('exploitation-simulation');
    expect(agent.capabilities).toContain('lateral-movement-planning');
    expect(agent.capabilities).toContain('detection-gap-analysis');
  });

  it('runRecon returns findings for each target asset', () => {
    const findings = agent.runRecon(SAMPLE_SCOPE);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every(f => f.asset && f.exposures.length > 0)).toBe(true);
  });

  it('simulateExploitation returns attack paths with MITRE techniques', () => {
    const reconFindings = agent.runRecon(SAMPLE_SCOPE);
    const paths = agent.simulateExploitation(reconFindings);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every(p => p.techniques.length > 0)).toBe(true);
    expect(paths.some(p => p.techniques.some(t => t.startsWith('T')))).toBe(true);
  });

  it('planLateralMovement returns pivot paths from an initial technique', () => {
    const paths = agent.planLateralMovement('T1078');
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every(p => p.technique && p.description)).toBe(true);
  });

  it('simulateObjective returns findings for data-exfiltration', () => {
    const findings = agent.simulateObjective('data-exfiltration');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every(f => f.title && f.technique)).toBe(true);
  });

  it('simulateObjective returns findings for persistence', () => {
    const findings = agent.simulateObjective('persistence');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some(f => ['T1053', 'T1543', 'T1136'].includes(f.technique))).toBe(true);
  });

  it('analyzeDetectionGaps flags techniques without detection coverage', () => {
    const findings: RedTeamFinding[] = [
      {
        title: 'RDP Brute Force',
        phase: 'initial-access',
        technique: 'T1110',
        severity: 'high',
        evidence: 'Port 3389 exposed to internet',
        recommendation: 'Block external RDP, enforce MFA',
      },
    ];
    const gaps = agent.analyzeDetectionGaps(findings);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every(g => g.technique && g.detectionControl)).toBe(true);
  });

  it('buildRedTeamReport returns a complete structured report', () => {
    const reconFindings = agent.runRecon(SAMPLE_SCOPE);
    const exploitPaths = agent.simulateExploitation(reconFindings);
    const report = agent.buildRedTeamReport(SAMPLE_SCOPE, reconFindings, exploitPaths);

    expect(report.engagementId).toMatch(/^RT-/);
    expect(report.scope).toEqual(SAMPLE_SCOPE);
    expect(report.generatedAt).toBeTruthy();
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.chainOfAttack).toContain('→');
    expect(report.detectionGaps.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.purpleTeamExercises.length).toBeGreaterThan(0);
  });
});

describe('CISOOrchestrator — Red Team', () => {
  const orch = new CISOOrchestrator('test-redteam');

  it('swarm has 11 agents including red-team', () => {
    const state = orch.getSwarmStatus();
    expect(Object.keys(state.agents)).toHaveLength(11);
    expect(state.agents['red-team']).toBeDefined();
    expect(state.agents['red-team'].role).toBe('red-team');
  });

  it('runRedTeamEngagement returns a full RedTeamReport', async () => {
    const report = await orch.runRedTeamEngagement(SAMPLE_SCOPE);
    expect(report.engagementId).toMatch(/^RT-/);
    expect(report.scope).toEqual(SAMPLE_SCOPE);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.chainOfAttack).toBeTruthy();
    expect(report.detectionGaps.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
  }, 10_000);

  it('red-team agent returns to idle after engagement', async () => {
    await orch.runRedTeamEngagement(SAMPLE_SCOPE);
    expect(orch.getSwarmStatus().agents['red-team'].status).toBe('idle');
  }, 10_000);
});
