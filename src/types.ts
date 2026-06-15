/**
 * CISO Swarm — Type Definitions
 *
 * Hierarchical swarm of cybersecurity specialist agents supervised by a
 * CISO orchestrator (queen). Mirrors Ruflo's AgentState / TaskDefinition
 * contracts so the swarm integrates natively with UnifiedSwarmCoordinator.
 */

// ───────── CISO Agent roles ─────────────────────────────────────────────────

export type CISOAgentRole =
  | 'ciso-queen'              // Supervisor — routes tasks, synthesises reports
  | 'risk-governance'         // Risk registers, CVSS, FAIR, risk treatment
  | 'compliance-audit'        // SOC 2, ISO 27001, NIST CSF, GDPR, HIPAA gap analysis
  | 'threat-intelligence'     // Threat landscape, MITRE ATT&CK, IOC hunting
  | 'security-architecture'   // Zero trust, IAM, network segmentation, cloud posture
  | 'incident-response'       // IRP creation, tabletop design, DFIR playbooks
  | 'vulnerability-management'// CVE scanning, EPSS scoring, patch prioritisation
  | 'devsecops'               // SAST/DAST, SBOM, pipeline hardening, secrets scanning
  | 'security-awareness'      // Training programmes, phishing simulation, KPIs
  | 'ai-security'             // LLM/ML threat modeling, OWASP LLM Top 10, MITRE ATLAS, AI governance
  | 'red-team';               // Offensive security: recon, exploitation simulation, lateral movement

// ───────── Severity / priority ───────────────────────────────────────────────

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type TaskPriority  = 'critical' | 'high' | 'normal' | 'low';

// ───────── Risk register ─────────────────────────────────────────────────────

export interface RiskEntry {
  id: string;
  title: string;
  description: string;
  category: 'strategic' | 'operational' | 'technical' | 'compliance' | 'supply-chain';
  likelihood: 1 | 2 | 3 | 4 | 5;       // 1=rare, 5=almost certain
  impact: 1 | 2 | 3 | 4 | 5;            // 1=negligible, 5=catastrophic
  riskScore: number;                     // likelihood × impact
  severity: RiskSeverity;
  cvssScore?: number;
  cveIds?: string[];
  mitreAttackIds?: string[];
  treatment: 'accept' | 'mitigate' | 'transfer' | 'avoid';
  owner: string;
  dueDate?: string;
  status: 'open' | 'in-treatment' | 'closed';
  createdAt: string;
  updatedAt: string;
}

// ───────── Compliance ────────────────────────────────────────────────────────

export type ComplianceFramework =
  | 'SOC2-TypeII'
  | 'ISO-27001'
  | 'NIST-CSF'
  | 'GDPR'
  | 'HIPAA'
  | 'PCI-DSS'
  | 'CIS-Controls';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  domain: string;
  controlName: string;
  requirement: string;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
  evidence?: string;
  gaps?: string[];
  remediationSteps?: string[];
  effort: 'low' | 'medium' | 'high';
  priority: TaskPriority;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  assessmentDate: string;
  totalControls: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notApplicable: number;
  complianceScore: number;   // % of applicable controls met
  criticalGaps: ComplianceControl[];
  roadmap: RemediationItem[];
}

// ───────── Threat intelligence ───────────────────────────────────────────────

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  motivation: 'financial' | 'espionage' | 'hacktivism' | 'destructive' | 'unknown';
  sophistication: 'advanced' | 'intermediate' | 'novice';
  targets: string[];
  ttps: string[];   // MITRE ATT&CK technique IDs (T####.###)
  iocs: string[];
}

export interface ThreatScenario {
  id: string;
  title: string;
  description: string;
  actor?: ThreatActor;
  attackVector: string;
  techniques: string[];   // MITRE IDs
  affectedAssets: string[];
  likelihood: RiskSeverity;
  impact: RiskSeverity;
  detectionControls: string[];
  mitigationControls: string[];
}

// ───────── Incident response ─────────────────────────────────────────────────

export type IncidentPhase =
  | 'preparation'
  | 'identification'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'lessons-learned';

export interface PlaybookStep {
  phase: IncidentPhase;
  order: number;
  action: string;
  responsible: string;
  timeframe: string;
  tools?: string[];
  escalationCriteria?: string;
}

export interface IncidentPlaybook {
  id: string;
  name: string;
  incidentType: string;   // e.g. 'ransomware', 'data-breach', 'insider-threat'
  severity: RiskSeverity;
  steps: PlaybookStep[];
  communicationPlan: string;
  legalConsiderations: string;
  createdAt: string;
}

// ───────── Vulnerability management ──────────────────────────────────────────

export interface Vulnerability {
  cveId: string;
  title: string;
  cvssScore: number;
  epssScore?: number;      // Exploit Prediction Scoring System 0-1
  severity: RiskSeverity;
  affectedAssets: string[];
  exploitAvailable: boolean;
  exploitedInWild: boolean;
  patchAvailable: boolean;
  patchDeadlineDays: number;
  status: 'open' | 'in-progress' | 'patched' | 'risk-accepted';
}

// ───────── Security posture ───────────────────────────────────────────────────

export interface SecurityPostureReport {
  generatedAt: string;
  overallScore: number;           // 0-100
  maturityLevel: 1 | 2 | 3 | 4 | 5;
  summary: string;
  executiveSummary: string;
  riskRegister: RiskEntry[];
  complianceReports: ComplianceReport[];
  threatScenarios: ThreatScenario[];
  vulnerabilities: Vulnerability[];
  recommendations: RemediationItem[];
  kpis: SecurityKPI[];
  roadmap: RoadmapItem[];
}

export interface RemediationItem {
  id: string;
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  priority: TaskPriority;
  owner: string;
  targetDate: string;
  status: 'planned' | 'in-progress' | 'completed';
}

export interface SecurityKPI {
  name: string;
  value: number | string;
  unit: string;
  trend: 'improving' | 'stable' | 'degrading';
  target?: number | string;
}

export interface RoadmapItem {
  quarter: string;         // e.g. 'Q3-2026'
  initiative: string;
  rationale: string;
  expectedOutcome: string;
  cost: 'low' | 'medium' | 'high';
}

// ───────── Swarm task ────────────────────────────────────────────────────────

export type CISOTaskType =
  | 'security-posture-review'
  | 'risk-assessment'
  | 'compliance-gap-analysis'
  | 'threat-modeling'
  | 'incident-response-plan'
  | 'vulnerability-scan'
  | 'architecture-review'
  | 'devsecops-audit'
  | 'awareness-program'
  | 'executive-briefing'
  | 'red-team-engagement';

export interface CISOTask {
  id: string;
  type: CISOTaskType;
  priority: TaskPriority;
  assignedTo: CISOAgentRole;
  status: 'queued' | 'running' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  parentTaskId?: string;    // Set when CISO queen delegates a sub-task
}

// ───────── Swarm state ────────────────────────────────────────────────────────

export interface CISOSwarmState {
  swarmId: string;
  namespace: string;
  topology: 'hierarchical';
  consensus: 'raft';
  queen: CISOAgentState;
  agents: Record<CISOAgentRole, CISOAgentState>;
  activeTasks: CISOTask[];
  completedTasks: CISOTask[];
  createdAt: string;
  lastActivity: string;
}

export interface CISOAgentState {
  id: string;
  role: CISOAgentRole;
  name: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  capabilities: string[];
  tasksCompleted: number;
  lastActivity: string;
}

// ───────── Red Team / Offensive Security ─────────────────────────────────────

export type RedTeamEngagementType = 'internal' | 'external' | 'assumed-breach' | 'purple-team';

export interface RedTeamScope {
  engagementType: RedTeamEngagementType;
  targetAssets: string[];
  outOfScope: string[];
  objectives: string[];
  rulesOfEngagement: string;
}

export type RedTeamPhase = 'recon' | 'initial-access' | 'exploitation' | 'lateral-movement' | 'objective';

export interface RedTeamFinding {
  title: string;
  phase: RedTeamPhase;
  technique: string;   // MITRE ATT&CK ID (T####)
  severity: RiskSeverity;
  evidence: string;
  recommendation: string;
}

export interface ReconFinding {
  asset: string;
  exposures: string[];
  riskLevel: RiskSeverity;
}

export interface AttackPath {
  entryPoint: string;
  techniques: string[];   // MITRE ATT&CK IDs
  description: string;
  likelihood: RiskSeverity;
}

export interface LateralMovementPath {
  technique: string;
  description: string;
  targetAssets: string[];
}

export interface DetectionGap {
  technique: string;
  techniqueName: string;
  detectionControl: string;
  recommendation: string;
}

export interface RedTeamReport {
  engagementId: string;
  scope: RedTeamScope;
  generatedAt: string;
  findings: RedTeamFinding[];
  chainOfAttack: string;
  detectionGaps: DetectionGap[];
  recommendations: RemediationItem[];
  purpleTeamExercises: string[];
}
