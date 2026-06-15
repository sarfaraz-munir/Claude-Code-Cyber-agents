/**
 * CISO Queen Orchestrator
 *
 * Hierarchical supervisor agent. Receives high-level security objectives,
 * delegates to specialist agents, collects findings, synthesises the
 * SecurityPostureReport, and routes inter-agent messages.
 *
 * Mirrors Ruflo's UnifiedSwarmCoordinator queen-coordinator pattern
 * (ADR-003) with raft consensus for leadership stability.
 */

import { randomUUID } from 'node:crypto';
import type {
  CISOSwarmState,
  CISOAgentState,
  CISOAgentRole,
  CISOTask,
  CISOTaskType,
  SecurityPostureReport,
  RiskEntry,
  ComplianceReport,
  ThreatScenario,
  Vulnerability,
  SecurityKPI,
  RoadmapItem,
  ComplianceFramework,
} from './types.js';

import { RiskGovernanceAgent }         from './agents/risk-governance.js';
import { ComplianceAuditAgent }        from './agents/compliance-audit.js';
import { ThreatIntelligenceAgent }     from './agents/threat-intelligence.js';
import { SecurityArchitectureAgent }   from './agents/security-architecture.js';
import { IncidentResponseAgent }       from './agents/incident-response.js';
import { VulnerabilityManagementAgent } from './agents/vulnerability-management.js';
import { DevSecOpsAgent }              from './agents/devsecops.js';
import { SecurityAwarenessAgent }      from './agents/security-awareness.js';
import { AISecurityAgent }            from './agents/ai-security.js';
import type { AISystemProfile }       from './agents/ai-security.js';
import { RedTeamAgent }               from './agents/red-team.js';
import type { RedTeamScope, RedTeamReport } from './types.js';

// ─── Agent registry ───────────────────────────────────────────────────────────

function makeAgentState(role: CISOAgentRole, name: string, capabilities: string[]): CISOAgentState {
  return {
    id: `agent-${randomUUID().slice(0, 8)}`,
    role,
    name,
    status: 'idle',
    capabilities,
    tasksCompleted: 0,
    lastActivity: new Date().toISOString(),
  };
}

// ─── CISO Queen ───────────────────────────────────────────────────────────────

export class CISOOrchestrator {
  readonly role: CISOAgentRole = 'ciso-queen';
  readonly name = 'CISO Queen Orchestrator';

  // Specialist agents
  private readonly riskAgent       = new RiskGovernanceAgent();
  private readonly complianceAgent = new ComplianceAuditAgent();
  private readonly threatAgent     = new ThreatIntelligenceAgent();
  private readonly archAgent       = new SecurityArchitectureAgent();
  private readonly irAgent         = new IncidentResponseAgent();
  private readonly vulnAgent       = new VulnerabilityManagementAgent();
  private readonly devSecOpsAgent  = new DevSecOpsAgent();
  private readonly awarenessAgent  = new SecurityAwarenessAgent();
  private readonly aiSecAgent      = new AISecurityAgent();
  private readonly redTeamAgent    = new RedTeamAgent();

  private swarmState: CISOSwarmState;

  constructor(namespace = 'ciso-swarm') {
    const now = new Date().toISOString();

    const queen: CISOAgentState = {
      id: `queen-${randomUUID().slice(0, 8)}`,
      role: 'ciso-queen',
      name: this.name,
      status: 'idle',
      capabilities: [
        'orchestration', 'routing', 'synthesis',
        'executive-reporting', 'risk-governance',
        'consensus-raft', 'task-delegation',
      ],
      tasksCompleted: 0,
      lastActivity: now,
    };

    this.swarmState = {
      swarmId: `ciso-${randomUUID().slice(0, 8)}`,
      namespace,
      topology: 'hierarchical',
      consensus: 'raft',
      queen,
      agents: {
        'ciso-queen':               queen,
        'risk-governance':          makeAgentState('risk-governance',          'Risk & Governance Analyst',         this.riskAgent.capabilities),
        'compliance-audit':         makeAgentState('compliance-audit',         'Compliance & Audit Specialist',     this.complianceAgent.capabilities),
        'threat-intelligence':      makeAgentState('threat-intelligence',      'Threat Intelligence Analyst',       this.threatAgent.capabilities),
        'security-architecture':    makeAgentState('security-architecture',    'Security Architecture Reviewer',    this.archAgent.capabilities),
        'incident-response':        makeAgentState('incident-response',        'Incident Response Planner',         this.irAgent.capabilities),
        'vulnerability-management': makeAgentState('vulnerability-management', 'Vulnerability Management Engineer', this.vulnAgent.capabilities),
        'devsecops':                makeAgentState('devsecops',                'DevSecOps Engineer',                this.devSecOpsAgent.capabilities),
        'security-awareness':       makeAgentState('security-awareness',       'Security Awareness Coordinator',    this.awarenessAgent.capabilities),
        'ai-security':              makeAgentState('ai-security',              'AI Security Specialist',            this.aiSecAgent.capabilities),
        'red-team':                 makeAgentState('red-team',                 'Red Team Operator',                 this.redTeamAgent.capabilities),
      },
      activeTasks: [],
      completedTasks: [],
      createdAt: now,
      lastActivity: now,
    };
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  getSwarmStatus(): CISOSwarmState {
    return this.swarmState;
  }

  /**
   * Run a full security posture review.
   * Queen delegates sub-tasks concurrently to all specialist agents,
   * collects their outputs, and synthesises a unified report.
   */
  async runSecurityPostureReview(params: SecurityPostureReviewParams): Promise<SecurityPostureReport> {
    const rootTask = this.createTask('security-posture-review', 'ciso-queen', 'critical', params);
    this.swarmState.activeTasks.push(rootTask);

    // ── Delegate concurrently (simulated parallel execution) ──────────────────
    this.markAgentBusy('risk-governance');
    this.markAgentBusy('compliance-audit');
    this.markAgentBusy('threat-intelligence');
    this.markAgentBusy('security-architecture');
    this.markAgentBusy('vulnerability-management');
    this.markAgentBusy('devsecops');
    this.markAgentBusy('security-awareness');

    // ── Risk & Governance ─────────────────────────────────────────────────────
    const riskRegister = this.riskAgent.buildRiskRegister(
      params.riskFindings ?? this.defaultRiskFindings(params.orgProfile),
    );

    // ── Compliance ────────────────────────────────────────────────────────────
    const complianceReports: ComplianceReport[] = (params.frameworks ?? ['NIST-CSF']).map(f =>
      this.complianceAgent.runGapAnalysis(f as ComplianceFramework, params.complianceEvidence?.[f] ?? {}),
    );

    // ── Threat Intelligence ───────────────────────────────────────────────────
    const threatScenarios: ThreatScenario[] = (params.threatScenarios ?? this.defaultThreatScenarios(params.orgProfile)).map(ts =>
      this.threatAgent.buildThreatScenario(ts),
    );

    // ── Architecture ──────────────────────────────────────────────────────────
    const archFindings = this.archAgent.assessZeroTrust(params.zeroTrustPosture ?? {});

    // ── Vulnerabilities ───────────────────────────────────────────────────────
    const vulns: Vulnerability[] = params.vulnerabilities?.length
      ? this.vulnAgent.triageVulnerabilities(params.vulnerabilities)
      : [];

    // ── DevSecOps ─────────────────────────────────────────────────────────────
    const pipelineFindings = this.devSecOpsAgent.auditPipeline(params.pipelinePosture ?? {});

    // ── Security Awareness ────────────────────────────────────────────────────
    const awarenessKPIs = this.awarenessAgent.buildKPIDashboard();

    // ── AI Security ───────────────────────────────────────────────────────────
    this.markAgentBusy('ai-security');
    const aiFindings = params.aiSystems?.length
      ? this.aiSecAgent.assessAISystem(params.aiSystems[0])
      : [];
    const aiRiskEntries = params.aiSystems?.length
      ? this.aiSecAgent.buildAIRiskEntries(params.aiSystems)
      : [];
    if (aiRiskEntries.length > 0) riskRegister.push(...aiRiskEntries);
    this.markAgentIdle('ai-security');

    // ── Mark all agents idle (tasks complete) ─────────────────────────────────
    const roles: CISOAgentRole[] = ['risk-governance','compliance-audit','threat-intelligence','security-architecture','vulnerability-management','devsecops','security-awareness'];
    for (const role of roles) this.markAgentIdle(role);

    // ── CISO Queen synthesises ────────────────────────────────────────────────
    const overallScore  = this.computePostureScore(riskRegister, complianceReports, archFindings, vulns);
    const maturityLevel = this.computeMaturityLevel(overallScore) as SecurityPostureReport['maturityLevel'];

    const archRemediations = this.archAgent.generateArchitectureRemediations(archFindings);
    const riskRoadmap      = this.riskAgent.generateRoadmap(riskRegister);
    const allRemedations   = [...archRemediations, ...riskRoadmap];

    const kpis: SecurityKPI[] = [
      { name: 'Overall Security Posture Score', value: overallScore, unit: '/100', trend: overallScore >= 70 ? 'stable' : 'degrading', target: 80 },
      { name: 'Critical Risks Open', value: riskRegister.filter(r => r.severity === 'critical').length, unit: 'count', trend: 'stable', target: 0 },
      { name: 'Average Compliance Score', value: `${Math.round(complianceReports.reduce((s, r) => s + r.complianceScore, 0) / Math.max(complianceReports.length, 1))}%`, unit: '', trend: 'stable' },
      { name: 'Critical CVEs Unpatched', value: vulns.filter(v => v.severity === 'critical' && v.status === 'open').length, unit: 'count', trend: 'stable', target: 0 },
      { name: 'Critical Architecture Gaps', value: archFindings.filter(f => f.status !== 'implemented' && f.severity === 'critical').length, unit: 'count', trend: 'stable', target: 0 },
      ...awarenessKPIs.slice(0, 3).map(k => ({ name: k.metric, value: k.target, unit: '', trend: 'stable' as const })),
    ];

    const roadmap: RoadmapItem[] = this.buildRoadmap(allRemedations);

    const report: SecurityPostureReport = {
      generatedAt: new Date().toISOString(),
      overallScore,
      maturityLevel,
      summary: this.buildSummary(overallScore, riskRegister, complianceReports),
      executiveSummary: this.buildExecutiveSummary(overallScore, maturityLevel, riskRegister, complianceReports, vulns),
      riskRegister,
      complianceReports,
      threatScenarios,
      vulnerabilities: vulns,
      recommendations: allRemedations.slice(0, 20),
      kpis,
      roadmap,
    };

    this.completeTask(rootTask);
    this.markAgentIdle('ciso-queen');

    return report;
  }

  // ─── Specialist delegates (callable individually) ─────────────────────────

  runRiskAssessment(findings: Parameters<RiskGovernanceAgent['buildRiskRegister']>[0]) {
    return this.riskAgent.buildRiskRegister(findings);
  }

  runComplianceGapAnalysis(framework: ComplianceFramework, evidence: Record<string, unknown>) {
    return this.complianceAgent.runGapAnalysis(framework, evidence as Parameters<ComplianceAuditAgent['runGapAnalysis']>[1]);
  }

  runThreatModeling(params: Parameters<ThreatIntelligenceAgent['buildThreatScenario']>[0]) {
    return this.threatAgent.buildThreatScenario(params);
  }

  runArchitectureReview(posture: Parameters<SecurityArchitectureAgent['assessZeroTrust']>[0]) {
    return this.archAgent.assessZeroTrust(posture);
  }

  getIncidentPlaybook(type: string) {
    return this.irAgent.getPlaybook(type);
  }

  async runRedTeamEngagement(scope: RedTeamScope): Promise<RedTeamReport> {
    const task = this.createTask('red-team-engagement', 'red-team', 'high', scope as unknown as Record<string, unknown>);
    this.swarmState.activeTasks.push(task);
    this.markAgentBusy('red-team');

    const reconFindings   = this.redTeamAgent.runRecon(scope);
    const attackPaths     = this.redTeamAgent.simulateExploitation(reconFindings);
    const report          = this.redTeamAgent.buildRedTeamReport(scope, reconFindings, attackPaths);

    this.completeTask(task);
    this.markAgentIdle('red-team');
    return report;
  }

  buildTabletopExercise(scenario: string, severity: Parameters<IncidentResponseAgent['buildTabletopExercise']>[1]) {
    return this.irAgent.buildTabletopExercise(scenario, severity);
  }

  runVulnerabilityTriage(raw: Parameters<VulnerabilityManagementAgent['triageVulnerabilities']>[0]) {
    return this.vulnAgent.triageVulnerabilities(raw);
  }

  auditDevSecOpsPipeline(posture: Parameters<DevSecOpsAgent['auditPipeline']>[0]) {
    return this.devSecOpsAgent.auditPipeline(posture);
  }

  getSecureDevSecOpsTemplate() {
    return this.devSecOpsAgent.buildSecureDevSecOpsTemplate();
  }

  getSecurityAwarenessProgramme() {
    return this.awarenessAgent.buildTrainingProgramme();
  }

  getPhishingSimulations() {
    return this.awarenessAgent.buildPhishingSimulations();
  }

  // ── AI Security delegates ───────────────────────────────────────────────────

  assessAISystem(profile: AISystemProfile) {
    return this.aiSecAgent.assessAISystem(profile);
  }

  buildAIRedTeamPlan(profile: AISystemProfile) {
    return this.aiSecAgent.buildRedTeamPlan(profile);
  }

  assessAIGovernance(posture: Parameters<AISecurityAgent['assessAIGovernance']>[0]) {
    return this.aiSecAgent.assessAIGovernance(posture);
  }

  getShadowAIInventory() {
    return this.aiSecAgent.buildShadowAIInventory();
  }

  getOWASPLLMTop10() {
    return this.aiSecAgent.getOWASPLLMTop10();
  }

  getMitreAtlasTechniques() {
    return this.aiSecAgent.getMitreAtlasTechniques();
  }

  getAIGovernanceFrameworks() {
    return this.aiSecAgent.getGovernanceFrameworks();
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private createTask(type: CISOTaskType, assignedTo: CISOAgentRole, priority: CISOTask['priority'], input: Record<string, unknown>): CISOTask {
    return {
      id: `task-${randomUUID().slice(0, 8)}`,
      type,
      priority,
      assignedTo,
      status: 'running',
      input,
      createdAt: new Date().toISOString(),
    };
  }

  private completeTask(task: CISOTask) {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    this.swarmState.activeTasks = this.swarmState.activeTasks.filter(t => t.id !== task.id);
    this.swarmState.completedTasks.push(task);
    this.swarmState.lastActivity = task.completedAt;
  }

  private markAgentBusy(role: CISOAgentRole) {
    if (this.swarmState.agents[role]) {
      this.swarmState.agents[role].status = 'busy';
    }
  }

  private markAgentIdle(role: CISOAgentRole) {
    if (this.swarmState.agents[role]) {
      this.swarmState.agents[role].status = 'idle';
      this.swarmState.agents[role].tasksCompleted++;
      this.swarmState.agents[role].lastActivity = new Date().toISOString();
    }
  }

  private computePostureScore(
    risks: RiskEntry[],
    compliance: ComplianceReport[],
    archFindings: ReturnType<SecurityArchitectureAgent['assessZeroTrust']>,
    vulns: Vulnerability[],
  ): number {
    const criticalRisks = risks.filter(r => r.severity === 'critical').length;
    const riskPenalty = Math.min(criticalRisks * 10, 30);

    const avgCompliance = compliance.length > 0
      ? compliance.reduce((s, r) => s + r.complianceScore, 0) / compliance.length
      : 70;

    const archMissing = archFindings.filter(f => f.status !== 'implemented' && f.severity === 'critical').length;
    const archPenalty = Math.min(archMissing * 8, 25);

    const criticalVulns = vulns.filter(v => v.severity === 'critical' && v.status === 'open').length;
    const vulnPenalty = Math.min(criticalVulns * 5, 20);

    return Math.max(0, Math.min(100, Math.round(avgCompliance - riskPenalty - archPenalty - vulnPenalty)));
  }

  private computeMaturityLevel(score: number): number {
    if (score >= 85) return 5;
    if (score >= 70) return 4;
    if (score >= 55) return 3;
    if (score >= 35) return 2;
    return 1;
  }

  private buildSummary(score: number, risks: RiskEntry[], compliance: ComplianceReport[]): string {
    const critical = risks.filter(r => r.severity === 'critical').length;
    const high = risks.filter(r => r.severity === 'high').length;
    const avgComp = compliance.length
      ? Math.round(compliance.reduce((s, r) => s + r.complianceScore, 0) / compliance.length)
      : 0;
    return `Security posture score: ${score}/100. ${critical} critical and ${high} high risks identified. Average compliance score across ${compliance.length} framework(s): ${avgComp}%.`;
  }

  private buildExecutiveSummary(
    score: number,
    maturity: number,
    risks: RiskEntry[],
    compliance: ComplianceReport[],
    vulns: Vulnerability[],
  ): string {
    const critical = risks.filter(r => r.severity === 'critical').length;
    const exploitedVulns = vulns.filter(v => v.exploitedInWild).length;
    const level = ['', 'Initial', 'Developing', 'Defined', 'Managed', 'Optimising'][maturity];

    return [
      `EXECUTIVE SECURITY BRIEFING`,
      `Generated: ${new Date().toDateString()}`,
      '',
      `Overall Security Posture: ${score}/100 (Maturity Level ${maturity} — ${level})`,
      '',
      critical > 0
        ? `⚠ CRITICAL ATTENTION REQUIRED: ${critical} critical risk(s) pose immediate threat to business operations and must be escalated to the board.`
        : '✓ No critical risks identified in this assessment.',
      exploitedVulns > 0
        ? `⚠ ${exploitedVulns} vulnerability(ies) are actively exploited in the wild — emergency patching required within 7 days.`
        : '',
      '',
      `Compliance: ${compliance.map(r => `${r.framework} ${r.complianceScore}%`).join(' | ')}`,
      '',
      'RECOMMENDED BOARD ACTIONS:',
      '  1. Approve security investment roadmap',
      '  2. Mandate critical risk remediation deadlines',
      '  3. Confirm cyber insurance coverage is current',
      '  4. Schedule next tabletop exercise',
    ].filter(Boolean).join('\n');
  }

  private buildRoadmap(remediations: ReturnType<SecurityArchitectureAgent['generateArchitectureRemediations']>): RoadmapItem[] {
    const now = new Date();
    const q = (offsetMonths: number) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() + offsetMonths);
      return `Q${Math.ceil((d.getMonth() + 1) / 3)}-${d.getFullYear()}`;
    };

    const critical = remediations.filter(r => r.priority === 'critical').slice(0, 5);
    const high     = remediations.filter(r => r.priority === 'high').slice(0, 5);
    const medium   = remediations.filter(r => r.priority === 'normal').slice(0, 5);

    const items: RoadmapItem[] = [];

    if (critical.length > 0) {
      items.push({
        quarter: q(0),
        initiative: `Emergency: ${critical.map(r => r.title).join(', ')}`,
        rationale: 'Critical risks require immediate remediation to prevent breach or regulatory action',
        expectedOutcome: 'Critical risk exposure reduced to zero',
        cost: 'high',
      });
    }
    if (high.length > 0) {
      items.push({
        quarter: q(3),
        initiative: `High-Priority Hardening: ${high.map(r => r.title.split(':')[0]).join(', ')}`,
        rationale: 'High-severity controls reduce attack surface for the most likely threat scenarios',
        expectedOutcome: 'Security maturity level increase by 1 level',
        cost: 'medium',
      });
    }
    if (medium.length > 0) {
      items.push({
        quarter: q(6),
        initiative: 'Programme Maturity: Compliance automation, awareness uplift, DevSecOps integration',
        rationale: 'Systematic process improvements reduce human-error-driven risk',
        expectedOutcome: 'Security posture score improvement of 10-15 points',
        cost: 'medium',
      });
    }
    items.push({
      quarter: q(9),
      initiative: 'Continuous Improvement: Penetration test, red team exercise, IR rehearsal',
      rationale: 'External validation ensures controls work under adversarial conditions',
      expectedOutcome: 'Confirmed security effectiveness; residual risk accepted by board',
      cost: 'medium',
    });

    return items;
  }

  private defaultRiskFindings(org: Record<string, unknown> = {}): Parameters<RiskGovernanceAgent['buildRiskRegister']>[0] {
    const industry = (org['industry'] as string) ?? 'technology';
    return [
      { title: 'Ransomware / Destructive Malware', description: `${industry} organisations are primary targets for ransomware. Successful attack could halt operations.`, category: 'operational', likelihood: 4, impact: 5 },
      { title: 'Phishing / Business Email Compromise', description: 'Social engineering leading to credential theft or fraudulent wire transfers.', category: 'operational', likelihood: 5, impact: 4 },
      { title: 'Insider Threat (Malicious or Accidental)', description: 'Employee exfiltrates data or inadvertently exposes sensitive information.', category: 'operational', likelihood: 3, impact: 4 },
      { title: 'Supply Chain Compromise', description: 'Third-party software or service compromised, affecting organisation downstream.', category: 'supply-chain', likelihood: 3, impact: 5 },
      { title: 'Unpatched Critical Vulnerability Exploitation', description: 'Public-facing systems exploited via known CVE before patch applied.', category: 'technical', likelihood: 4, impact: 4 },
      { title: 'Data Breach / Regulatory Non-Compliance', description: 'Unauthorised access to customer or employee PII leading to regulatory action.', category: 'compliance', likelihood: 3, impact: 5 },
      { title: 'Cloud Misconfiguration Exposure', description: 'Publicly accessible storage or overly permissive IAM roles leading to data exposure.', category: 'technical', likelihood: 4, impact: 3 },
      { title: 'Third-Party / Vendor Risk', description: 'Critical vendor suffers breach with access to organisation\'s data or systems.', category: 'supply-chain', likelihood: 3, impact: 4 },
    ];
  }

  private defaultThreatScenarios(org: Record<string, unknown> = {}): Parameters<ThreatIntelligenceAgent['buildThreatScenario']>[0][] {
    const assets = (org['criticalAssets'] as string[]) ?? ['production systems', 'customer database'];
    return [
      { title: 'Phishing → Credential Theft → Lateral Movement', description: 'Targeted phishing delivers credential stealer; attacker pivots to privileged systems.', affectedAssets: assets, attackVector: 'Phishing', symptoms: ['T1566', 'T1078', 'T1021'] },
      { title: 'Public-Facing App Exploitation → Data Exfiltration', description: 'Attacker exploits unpatched web application vulnerability to access backend database.', affectedAssets: ['web-application', 'customer database'], attackVector: 'Web Application Attack', symptoms: ['T1190', 'T1005', 'T1041'] },
      { title: 'Ransomware via RDP / VPN Brute Force', description: 'Attacker brute-forces exposed RDP or VPN, deploys ransomware.', affectedAssets: assets, attackVector: 'Remote Services', symptoms: ['T1110', 'T1021', 'T1486'] },
    ];
  }
}

// ─── Input parameter types ────────────────────────────────────────────────────

export interface SecurityPostureReviewParams {
  orgProfile?: {
    industry?: string;
    employeeCount?: number;
    cloudProvider?: string;
    criticalAssets?: string[];
  };
  frameworks?: string[];
  complianceEvidence?: Record<string, Record<string, { status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable'; evidence?: string; gaps?: string[] }>>;
  riskFindings?: Parameters<RiskGovernanceAgent['buildRiskRegister']>[0];
  threatScenarios?: Parameters<ThreatIntelligenceAgent['buildThreatScenario']>[0][];
  zeroTrustPosture?: Parameters<SecurityArchitectureAgent['assessZeroTrust']>[0];
  vulnerabilities?: Parameters<VulnerabilityManagementAgent['triageVulnerabilities']>[0];
  pipelinePosture?: Parameters<DevSecOpsAgent['auditPipeline']>[0];
  aiSystems?: AISystemProfile[];
}
