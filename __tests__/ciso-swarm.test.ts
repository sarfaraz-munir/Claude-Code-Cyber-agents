import { describe, it, expect } from 'vitest';
import { CISOOrchestrator } from '../src/ciso-orchestrator.js';
import { CISOSwarmPlugin }  from '../src/plugin.js';

describe('CISOSwarmPlugin', () => {
  it('initialises without errors', async () => {
    const plugin = new CISOSwarmPlugin();
    await plugin.initialize({ log: () => {} });
    expect(plugin.getMcpTools().length).toBeGreaterThan(10);
    await plugin.shutdown();
  });

  it('exposes 11 agent types (1 queen + 10 specialists)', () => {
    const plugin = new CISOSwarmPlugin();
    expect(plugin.getAgentTypes()).toHaveLength(11);
    expect(plugin.getAgentTypes().find(a => a.type === 'ciso-queen')?.role).toBe('queen');
    expect(plugin.getAgentTypes().find(a => a.type === 'ai-security')).toBeDefined();
    expect(plugin.getAgentTypes().find(a => a.type === 'red-team')).toBeDefined();
  });
});

describe('CISOOrchestrator', () => {
  const orch = new CISOOrchestrator('test');

  it('returns correct swarm topology', () => {
    const state = orch.getSwarmStatus();
    expect(state.topology).toBe('hierarchical');
    expect(state.consensus).toBe('raft');
    expect(Object.keys(state.agents)).toHaveLength(11);
  });

  it('runs a security posture review with defaults', async () => {
    const report = await orch.runSecurityPostureReview({
      orgProfile: { industry: 'technology', criticalAssets: ['production-db', 'auth-service'] },
      frameworks: ['NIST-CSF'],
      zeroTrustPosture: { mfaEnforced: true, encryptedInTransit: true, siem: false, edr: false },
      pipelinePosture:  { hasSAST: true, hasSecretsScanning: false, hasBranchProtection: true },
    });

    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.maturityLevel).toBeGreaterThanOrEqual(1);
    expect(report.maturityLevel).toBeLessThanOrEqual(5);
    expect(report.riskRegister.length).toBeGreaterThan(0);
    expect(report.complianceReports).toHaveLength(1);
    expect(report.complianceReports[0].framework).toBe('NIST-CSF');
    expect(report.executiveSummary).toContain('EXECUTIVE');
    expect(report.roadmap.length).toBeGreaterThan(0);
  }, 10_000);

  it('builds a risk register and roadmap', () => {
    const register = orch.runRiskAssessment([
      { title: 'Ransomware', description: 'Ransomware attack on production', category: 'operational', likelihood: 4, impact: 5 },
      { title: 'Phishing', description: 'BEC via phishing', category: 'operational', likelihood: 5, impact: 3 },
    ]);
    expect(register).toHaveLength(2);
    expect(register[0].riskScore).toBe(20);
    expect(register[0].severity).toBe('critical');
  });

  it('runs NIST CSF gap analysis', () => {
    const report = orch.runComplianceGapAnalysis('NIST-CSF', {
      'PR.AC-1': { status: 'compliant', evidence: 'IAM policy documented' },
      'DE.CM-1': { status: 'partial', gaps: ['Network monitoring gaps in branch offices'] },
    });
    expect(report.framework).toBe('NIST-CSF');
    expect(report.complianceScore).toBeGreaterThanOrEqual(0);
    expect(report.complianceScore).toBeLessThanOrEqual(100);
  });

  it('builds a threat scenario with MITRE mapping', () => {
    const scenario = orch.runThreatModeling({
      title: 'Ransomware via BruteForce RDP',
      description: 'Attacker brute-forces RDP then deploys ransomware',
      affectedAssets: ['production-servers'],
      attackVector: 'Remote Services',
      symptoms: ['T1110', 'T1021', 'T1486'],
    });
    expect(scenario.id).toMatch(/^THREAT-/);
    expect(scenario.techniques.length).toBeGreaterThan(0);
    expect(scenario.mitigationControls.length).toBeGreaterThan(0);
  });

  it('returns a ransomware incident playbook', () => {
    const pb = orch.getIncidentPlaybook('ransomware');
    expect(pb.incidentType).toBe('ransomware');
    expect(pb.steps.length).toBeGreaterThan(5);
    expect(pb.steps.map(s => s.phase)).toContain('containment');
  });

  it('triages vulnerabilities with patch waves', () => {
    const result = orch.runVulnerabilityTriage([
      { cveId: 'CVE-2024-1234', title: 'Critical RCE', cvssScore: 9.8, epssScore: 0.95, affectedAssets: ['web-server'], exploitAvailable: true, exploitedInWild: true, patchAvailable: true },
      { cveId: 'CVE-2024-5678', title: 'Medium XSS', cvssScore: 5.4, epssScore: 0.1, affectedAssets: ['web-app'], exploitAvailable: false, exploitedInWild: false, patchAvailable: true },
    ]);
    const kev = result.filter(v => v.exploitedInWild);
    expect(kev[0].patchDeadlineDays).toBe(7);
  });

  it('audits a DevSecOps pipeline and returns findings', () => {
    const findings = orch.auditDevSecOpsPipeline({ hasSAST: true });
    const missing = findings.filter(f => f.status !== 'present');
    expect(missing.some(f => f.control.includes('Secrets'))).toBe(true);
    expect(missing.some(f => f.control.includes('Branch Protection'))).toBe(true);
  });

  it('returns security awareness programme with 6 modules', () => {
    const modules = orch.getSecurityAwarenessProgramme();
    expect(modules.length).toBeGreaterThanOrEqual(6);
    expect(modules.some(m => m.delivery === 'simulation')).toBe(true);
  });

  it('all agents return to idle after posture review', async () => {
    await orch.runSecurityPostureReview({});
    const state = orch.getSwarmStatus();
    for (const agent of Object.values(state.agents)) {
      expect(agent.status).toBe('idle');
    }
  }, 10_000);
});

describe('AISecurityAgent', () => {
  const orch = new CISOOrchestrator('test-ai');

  const llmProfile = {
    name: 'Customer Support LLM',
    type: 'llm' as const,
    deployment: 'saas-api' as const,
    dataClasses: ['PII', 'confidential-ip'],
    internetFacing: true,
    usesExternalModels: true,
    hasAgentCapabilities: true,
    hasRAG: true,
    trainingDataSource: 'third-party' as const,
    humanOversight: 'partial' as const,
    regulatoryScope: ['GDPR', 'EU-AI-ACT-HIGH-RISK'],
  };

  it('identifies critical threats for an internet-facing LLM with agent capabilities', () => {
    const findings = orch.assessAISystem(llmProfile);
    expect(findings.length).toBeGreaterThanOrEqual(4);
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    expect(criticalFindings.length).toBeGreaterThan(0);
    // Must flag prompt injection, data disclosure, and excessive agency
    expect(findings.some(f => f.threatId === 'LLM01')).toBe(true);
    expect(findings.some(f => f.threatId === 'LLM06')).toBe(true);
    expect(findings.some(f => f.threatId === 'LLM07')).toBe(true);
  });

  it('includes regulatory implications for GDPR and EU AI Act', () => {
    const findings = orch.assessAISystem(llmProfile);
    const allImplications = findings.flatMap(f => f.regulatoryImplications);
    expect(allImplications.some(i => i.includes('EU AI Act') || i.includes('GDPR'))).toBe(true);
  });

  it('builds a red team plan with prompt injection category', () => {
    const plan = orch.buildAIRedTeamPlan(llmProfile);
    expect(plan.systemName).toBe('Customer Support LLM');
    expect(plan.attackCategories.length).toBeGreaterThan(2);
    expect(plan.attackCategories.some(c => c.category.includes('Prompt Injection'))).toBe(true);
    expect(plan.safetyConstraints.length).toBeGreaterThan(0);
    expect(plan.objectives.length).toBeGreaterThan(0);
  });

  it('identifies all AI governance gaps when posture is empty', () => {
    const gaps = orch.assessAIGovernance({});
    const missing = gaps.filter(g => g.status === 'missing');
    expect(missing.length).toBe(gaps.length);
    expect(missing.some(g => g.priority === 'critical')).toBe(true);
  });

  it('recognises implemented AI governance controls', () => {
    const gaps = orch.assessAIGovernance({
      hasAIInventory: true,
      hasAIRiskPolicy: true,
      hasAIImpactAssessment: true,
    });
    const implemented = gaps.filter(g => g.status === 'implemented');
    expect(implemented).toHaveLength(3);
  });

  it('returns shadow AI inventory with browser extension as critical risk', () => {
    const inventory = orch.getShadowAIInventory();
    expect(inventory.length).toBeGreaterThan(4);
    const browserExtRisk = inventory.find(i => i.category.includes('Browser Extension'));
    expect(browserExtRisk?.riskRating).toBe('critical');
  });

  it('returns OWASP LLM Top 10 with 10 entries', () => {
    const top10 = orch.getOWASPLLMTop10();
    expect(top10.length).toBe(10);
    expect(top10.some(t => t.id === 'LLM01')).toBe(true);
    expect(top10.some(t => t.id === 'LLM10')).toBe(true);
  });

  it('returns MITRE ATLAS techniques', () => {
    const atlas = orch.getMitreAtlasTechniques();
    expect(atlas.length).toBeGreaterThan(0);
    expect(atlas.every(t => t.mitreAtlas.startsWith('AML.'))).toBe(true);
  });

  it('AI security agent is idle after posture review with AI systems', async () => {
    await orch.runSecurityPostureReview({ aiSystems: [llmProfile] });
    expect(orch.getSwarmStatus().agents['ai-security'].status).toBe('idle');
  }, 10_000);
});

