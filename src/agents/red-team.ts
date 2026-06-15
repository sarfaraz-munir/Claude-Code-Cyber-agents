/**
 * Red Team Agent
 * Offensive security specialist: attack surface recon, exploitation simulation,
 * lateral movement planning, objective simulation, and detection gap analysis.
 * Techniques mapped to MITRE ATT&CK.
 */

import { randomUUID } from 'node:crypto';
import type {
  RedTeamScope,
  RedTeamFinding,
  RedTeamReport,
  ReconFinding,
  AttackPath,
  LateralMovementPath,
  DetectionGap,
  RemediationItem,
  RiskSeverity,
} from '../types.js';

// Attack surface signatures per asset type
const ASSET_EXPOSURES: Record<string, Array<{ exposure: string; technique: string; risk: RiskSeverity }>> = {
  'web-application': [
    { exposure: 'Unauthenticated endpoints exposed', technique: 'T1190', risk: 'high' },
    { exposure: 'Outdated framework versions detected', technique: 'T1190', risk: 'high' },
    { exposure: 'Missing security headers (CSP, HSTS)', technique: 'T1059', risk: 'medium' },
    { exposure: 'SQL injection surface in query params', technique: 'T1190', risk: 'critical' },
  ],
  'vpn-gateway': [
    { exposure: 'VPN exposed on default port 1194/443', technique: 'T1133', risk: 'medium' },
    { exposure: 'No MFA on VPN authentication', technique: 'T1078', risk: 'high' },
    { exposure: 'Split-tunnel allowing local network access', technique: 'T1021', risk: 'high' },
  ],
  'email-server': [
    { exposure: 'SMTP open relay potential', technique: 'T1566', risk: 'medium' },
    { exposure: 'Missing DMARC/DKIM/SPF enforcement', technique: 'T1566', risk: 'high' },
    { exposure: 'OWA/webmail exposed without geo-fencing', technique: 'T1078', risk: 'high' },
  ],
  'rdp': [
    { exposure: 'RDP exposed to internet on port 3389', technique: 'T1110', risk: 'critical' },
    { exposure: 'No account lockout policy', technique: 'T1110', risk: 'high' },
  ],
  'cloud-storage': [
    { exposure: 'Public S3/Blob storage buckets', technique: 'T1530', risk: 'critical' },
    { exposure: 'Overly permissive IAM roles', technique: 'T1078', risk: 'high' },
  ],
};

const DEFAULT_EXPOSURES = [
  { exposure: 'Attack surface requires manual enumeration', technique: 'T1595', risk: 'medium' as RiskSeverity },
  { exposure: 'Service fingerprinting possible', technique: 'T1592', risk: 'low' as RiskSeverity },
];

// Lateral movement pivot catalogue
const LATERAL_PIVOTS: Record<string, LateralMovementPath[]> = {
  'T1078': [
    { technique: 'T1550', description: 'Pass-the-Hash using harvested NTLM hashes', targetAssets: ['domain-controller', 'file-server'] },
    { technique: 'T1021', description: 'Remote Desktop / SMB lateral movement with stolen credentials', targetAssets: ['workstations', 'servers'] },
    { technique: 'T1558', description: 'Kerberoasting to escalate domain privileges', targetAssets: ['domain-controller'] },
  ],
  'T1110': [
    { technique: 'T1021', description: 'Lateral move via brute-forced RDP credentials', targetAssets: ['workstations', 'jump-servers'] },
    { technique: 'T1078', description: 'Reuse brute-forced credentials across services', targetAssets: ['email-server', 'vpn-gateway'] },
  ],
  'T1190': [
    { technique: 'T1059', description: 'Web shell dropped via exploited app — code execution on server', targetAssets: ['web-server', 'app-server'] },
    { technique: 'T1105', description: 'Ingress tool transfer to pivot into internal network', targetAssets: ['internal-servers'] },
  ],
  'T1133': [
    { technique: 'T1021', description: 'Internal network access via compromised VPN session', targetAssets: ['internal-servers', 'databases'] },
    { technique: 'T1078', description: 'Credential reuse across internal services from VPN foothold', targetAssets: ['file-server', 'email-server'] },
  ],
};

const DEFAULT_PIVOTS: LateralMovementPath[] = [
  { technique: 'T1021', description: 'Remote service exploitation for lateral movement', targetAssets: ['internal-servers'] },
  { technique: 'T1550', description: 'Use alternate authentication material (tokens, hashes)', targetAssets: ['domain-controller'] },
];

// Objective technique catalogue
const OBJECTIVE_TECHNIQUES: Record<string, RedTeamFinding[]> = {
  'data-exfiltration': [
    { title: 'Staged data in temp directory for exfil', phase: 'objective', technique: 'T1074', severity: 'high', evidence: 'Data staged in %TEMP% prior to transfer', recommendation: 'Monitor large file writes to temp locations; DLP on removable media' },
    { title: 'Exfiltration over HTTPS to cloud storage', phase: 'objective', technique: 'T1567', severity: 'critical', evidence: 'Bulk upload to attacker-controlled cloud bucket', recommendation: 'Egress filtering, CASB, anomalous data-volume alerts' },
    { title: 'Email forwarding rule for continuous exfil', phase: 'objective', technique: 'T1114', severity: 'high', evidence: 'Inbox rule forwarding to external address', recommendation: 'Monitor mailbox rule creation; alert on external auto-forwarding' },
  ],
  'persistence': [
    { title: 'Scheduled task for persistent backdoor', phase: 'objective', technique: 'T1053', severity: 'high', evidence: 'Schtask registered under SYSTEM context', recommendation: 'Monitor scheduled task creation; baseline trusted tasks' },
    { title: 'Registry run key implant', phase: 'objective', technique: 'T1547', severity: 'high', evidence: 'HKCU\\Run key modified with malicious binary', recommendation: 'Registry monitoring; application allow-listing' },
    { title: 'New local admin account created', phase: 'objective', technique: 'T1136', severity: 'critical', evidence: 'Hidden admin account created post-exploitation', recommendation: 'Alert on new privileged account creation; PAM solution' },
  ],
  'ransomware': [
    { title: 'Shadow copy deletion to prevent recovery', phase: 'objective', technique: 'T1490', severity: 'critical', evidence: 'vssadmin delete shadows executed', recommendation: 'Immutable backups; restrict vssadmin to admins only' },
    { title: 'Ransomware payload deployed via GPO', phase: 'objective', technique: 'T1486', severity: 'critical', evidence: 'Group Policy used to deploy encryption binary', recommendation: 'GPO change monitoring; privileged access workstations' },
  ],
  'credential-harvesting': [
    { title: 'LSASS memory dump for credential harvest', phase: 'objective', technique: 'T1003', severity: 'critical', evidence: 'Mimikatz / Task Manager used to dump LSASS', recommendation: 'Credential Guard; EDR blocking LSASS access' },
    { title: 'Browser saved-password extraction', phase: 'objective', technique: 'T1555', severity: 'high', evidence: 'Browser credential store accessed', recommendation: 'Password manager policy; browser lockdown' },
  ],
};

// Detection gap mapping per technique
const DETECTION_GAPS: Record<string, { name: string; control: string; recommendation: string }> = {
  'T1110': { name: 'Brute Force', control: 'SIEM failed-login alerting', recommendation: 'Enable account lockout, alert on >5 failures/minute, deploy MFA' },
  'T1078': { name: 'Valid Accounts', control: 'Privileged account monitoring', recommendation: 'Impossible-travel alerting, PAM solution, quarterly access reviews' },
  'T1190': { name: 'Exploit Public-Facing Application', control: 'WAF and vulnerability scanning', recommendation: 'WAF rule updates, patch within 24h for critical CVEs, runtime RASP' },
  'T1133': { name: 'External Remote Services', control: 'VPN anomaly detection', recommendation: 'Geo-anomaly alerting, device certificate enforcement, MFA on VPN' },
  'T1566': { name: 'Phishing', control: 'Email gateway anti-phishing', recommendation: 'DMARC enforcement, URL detonation sandbox, security awareness training' },
  'T1021': { name: 'Remote Services', control: 'Lateral movement detection', recommendation: 'Network segmentation, SMB/RDP monitoring, zero-trust micro-segmentation' },
  'T1059': { name: 'Command and Scripting Interpreter', control: 'EDR command-line monitoring', recommendation: 'Script-block logging, PowerShell constrained language mode, application allow-listing' },
  'T1550': { name: 'Use Alternate Authentication Material', control: 'Kerberos / NTLM anomaly detection', recommendation: 'Credential Guard, NTLM audit logging, silver/golden ticket detection' },
  'T1567': { name: 'Exfiltration Over Web Service', control: 'DLP / CASB', recommendation: 'Egress filtering on cloud storage domains, data-volume baseline, CASB integration' },
  'T1053': { name: 'Scheduled Task/Job', control: 'Scheduled task creation monitoring', recommendation: 'Alert on new scheduled tasks; allowlist trusted task names' },
  'T1074': { name: 'Data Staged', control: 'DLP large-file write monitoring', recommendation: 'Alert on bulk file copy to temp locations; endpoint DLP' },
  'T1486': { name: 'Data Encrypted for Impact', control: 'Ransomware behavioral detection', recommendation: 'EDR ransomware kill-switch, honeypot files, immutable backups' },
  'T1003': { name: 'OS Credential Dumping', control: 'LSASS protection / EDR', recommendation: 'Windows Credential Guard, EDR LSASS access blocking, alert on procdump usage' },
  'T1530': { name: 'Data from Cloud Storage', control: 'Cloud CSPM / CASB', recommendation: 'Enforce S3 Block Public Access, bucket policy review, CASB data classification' },
};

export class RedTeamAgent {
  readonly role = 'red-team' as const;
  readonly capabilities = [
    'attack-surface-recon',
    'exploitation-simulation',
    'lateral-movement-planning',
    'objective-simulation',
    'detection-gap-analysis',
    'red-team-reporting',
    'purple-team-planning',
  ];

  runRecon(scope: RedTeamScope): ReconFinding[] {
    return scope.targetAssets.map(asset => {
      const assetKey = Object.keys(ASSET_EXPOSURES).find(k =>
        asset.toLowerCase().includes(k) || k.includes(asset.toLowerCase())
      );
      const exposureList = assetKey ? ASSET_EXPOSURES[assetKey] : DEFAULT_EXPOSURES;
      const topRisk = exposureList.reduce<RiskSeverity>((max, e) => {
        const order: RiskSeverity[] = ['critical', 'high', 'medium', 'low', 'informational'];
        return order.indexOf(e.risk) < order.indexOf(max) ? e.risk : max;
      }, 'informational');

      return {
        asset,
        exposures: exposureList.map(e => e.exposure),
        riskLevel: topRisk,
      };
    });
  }

  simulateExploitation(reconFindings: ReconFinding[]): AttackPath[] {
    return reconFindings
      .filter(f => f.riskLevel === 'critical' || f.riskLevel === 'high')
      .map(f => {
        const assetKey = Object.keys(ASSET_EXPOSURES).find(k =>
          f.asset.toLowerCase().includes(k) || k.includes(f.asset.toLowerCase())
        );
        const exposureList = assetKey ? ASSET_EXPOSURES[assetKey] : DEFAULT_EXPOSURES;
        const techniques = [...new Set(exposureList.map(e => e.technique))];

        return {
          entryPoint: f.asset,
          techniques,
          description: `Exploit ${f.riskLevel}-risk exposures on ${f.asset}: ${f.exposures[0]}`,
          likelihood: f.riskLevel,
        };
      });
  }

  planLateralMovement(initialTechnique: string): LateralMovementPath[] {
    return LATERAL_PIVOTS[initialTechnique] ?? DEFAULT_PIVOTS;
  }

  simulateObjective(objective: string): RedTeamFinding[] {
    return OBJECTIVE_TECHNIQUES[objective] ?? [
      {
        title: `Objective achieved: ${objective}`,
        phase: 'objective',
        technique: 'T1041',
        severity: 'high',
        evidence: `Simulated ${objective} objective completed`,
        recommendation: 'Implement monitoring and controls for this objective type',
      },
    ];
  }

  analyzeDetectionGaps(findings: RedTeamFinding[]): DetectionGap[] {
    const techniques = [...new Set(findings.map(f => f.technique))];
    return techniques
      .filter(t => t in DETECTION_GAPS)
      .map(t => {
        const gap = DETECTION_GAPS[t];
        return {
          technique: t,
          techniqueName: gap.name,
          detectionControl: gap.control,
          recommendation: gap.recommendation,
        };
      });
  }

  buildRedTeamReport(
    scope: RedTeamScope,
    reconFindings: ReconFinding[],
    attackPaths: AttackPath[],
  ): RedTeamReport {
    // Derive findings from recon + exploitation
    const reconPhaseFindings: RedTeamFinding[] = reconFindings
      .filter(f => f.riskLevel === 'critical' || f.riskLevel === 'high')
      .map(f => ({
        title: `${f.riskLevel.toUpperCase()} exposure on ${f.asset}: ${f.exposures[0]}`,
        phase: 'recon' as const,
        technique: 'T1595',
        severity: f.riskLevel,
        evidence: f.exposures.join('; '),
        recommendation: `Harden ${f.asset}: restrict external exposure, patch, enforce MFA`,
      }));

    const exploitFindings: RedTeamFinding[] = attackPaths.map(p => ({
      title: `Exploitation path via ${p.entryPoint}`,
      phase: 'initial-access' as const,
      technique: p.techniques[0] ?? 'T1190',
      severity: p.likelihood,
      evidence: p.description,
      recommendation: DETECTION_GAPS[p.techniques[0]]?.recommendation ?? 'Apply vendor patches and restrict access',
    }));

    const objectiveFindings: RedTeamFinding[] = scope.objectives.flatMap(o =>
      this.simulateObjective(o)
    );

    const allFindings = [...reconPhaseFindings, ...exploitFindings, ...objectiveFindings];

    const detectionGaps = this.analyzeDetectionGaps(allFindings);

    // Build chain-of-attack narrative
    const entryPoints = attackPaths.map(p => p.entryPoint).join(', ') || scope.targetAssets[0];
    const techniques = [...new Set(allFindings.map(f => f.technique))];
    const chainOfAttack = [
      `Recon → ${entryPoints}`,
      `Initial Access → ${techniques.slice(0, 3).join(', ')}`,
      `Lateral Movement → ${this.planLateralMovement(techniques[0] ?? 'T1078').map(p => p.technique).join(', ')}`,
      `Objective → ${scope.objectives.join(', ')}`,
    ].join(' → ');

    const recommendations: RemediationItem[] = detectionGaps.map((g, i) => ({
      id: `RT-REM-${String(i + 1).padStart(3, '0')}`,
      title: `Close detection gap: ${g.techniqueName} (${g.technique})`,
      description: g.recommendation,
      effort: 'medium' as const,
      impact: 'high' as const,
      priority: 'high' as const,
      owner: 'Security Operations',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'planned' as const,
    }));

    const purpleTeamExercises = [
      `Purple team: simulate ${attackPaths[0]?.entryPoint ?? entryPoints} compromise chain end-to-end`,
      `Detection test: verify SIEM alerts fire for ${techniques.slice(0, 2).join(' and ')}`,
      `Tabletop: incident response to ${scope.objectives[0]} scenario`,
      ...detectionGaps.slice(0, 3).map(g => `Control validation: ${g.techniqueName} detection coverage`),
    ];

    return {
      engagementId: `RT-${randomUUID().slice(0, 8).toUpperCase()}`,
      scope,
      generatedAt: new Date().toISOString(),
      findings: allFindings,
      chainOfAttack,
      detectionGaps,
      recommendations,
      purpleTeamExercises,
    };
  }
}