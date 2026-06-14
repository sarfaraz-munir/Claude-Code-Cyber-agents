/**
 * Threat Intelligence Agent
 * Maps threats to MITRE ATT&CK, profiles threat actors, builds threat scenarios.
 */

import type { ThreatActor, ThreatScenario, RiskSeverity } from '../types.js';
import { randomUUID } from 'node:crypto';

// MITRE ATT&CK tactic → technique catalogue (abbreviated — representative TTPs)
const MITRE_TACTICS: Record<string, { id: string; name: string; techniques: Array<{ id: string; name: string }> }> = {
  'initial-access': {
    id: 'TA0001', name: 'Initial Access',
    techniques: [
      { id: 'T1566', name: 'Phishing' },
      { id: 'T1190', name: 'Exploit Public-Facing Application' },
      { id: 'T1133', name: 'External Remote Services' },
      { id: 'T1078', name: 'Valid Accounts' },
      { id: 'T1195', name: 'Supply Chain Compromise' },
    ],
  },
  'execution': {
    id: 'TA0002', name: 'Execution',
    techniques: [
      { id: 'T1059', name: 'Command and Scripting Interpreter' },
      { id: 'T1204', name: 'User Execution' },
      { id: 'T1106', name: 'Native API' },
    ],
  },
  'persistence': {
    id: 'TA0003', name: 'Persistence',
    techniques: [
      { id: 'T1053', name: 'Scheduled Task/Job' },
      { id: 'T1136', name: 'Create Account' },
      { id: 'T1543', name: 'Create or Modify System Process' },
    ],
  },
  'privilege-escalation': {
    id: 'TA0004', name: 'Privilege Escalation',
    techniques: [
      { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
      { id: 'T1548', name: 'Abuse Elevation Control Mechanism' },
      { id: 'T1078', name: 'Valid Accounts' },
    ],
  },
  'defense-evasion': {
    id: 'TA0005', name: 'Defense Evasion',
    techniques: [
      { id: 'T1070', name: 'Indicator Removal' },
      { id: 'T1027', name: 'Obfuscated Files or Information' },
      { id: 'T1562', name: 'Impair Defenses' },
    ],
  },
  'credential-access': {
    id: 'TA0006', name: 'Credential Access',
    techniques: [
      { id: 'T1110', name: 'Brute Force' },
      { id: 'T1555', name: 'Credentials from Password Stores' },
      { id: 'T1040', name: 'Network Sniffing' },
    ],
  },
  'lateral-movement': {
    id: 'TA0008', name: 'Lateral Movement',
    techniques: [
      { id: 'T1021', name: 'Remote Services' },
      { id: 'T1550', name: 'Use Alternate Authentication Material' },
      { id: 'T1080', name: 'Taint Shared Content' },
    ],
  },
  'collection': {
    id: 'TA0009', name: 'Collection',
    techniques: [
      { id: 'T1005', name: 'Data from Local System' },
      { id: 'T1213', name: 'Data from Information Repositories' },
      { id: 'T1114', name: 'Email Collection' },
    ],
  },
  'exfiltration': {
    id: 'TA0010', name: 'Exfiltration',
    techniques: [
      { id: 'T1041', name: 'Exfiltration Over C2 Channel' },
      { id: 'T1048', name: 'Exfiltration Over Alternative Protocol' },
      { id: 'T1567', name: 'Exfiltration Over Web Service' },
    ],
  },
  'impact': {
    id: 'TA0040', name: 'Impact',
    techniques: [
      { id: 'T1486', name: 'Data Encrypted for Impact (Ransomware)' },
      { id: 'T1485', name: 'Data Destruction' },
      { id: 'T1498', name: 'Network Denial of Service' },
    ],
  },
};

// Common threat actor profiles
const KNOWN_ACTORS: ThreatActor[] = [
  {
    id: 'G0007',
    name: 'APT28 (Fancy Bear)',
    aliases: ['Sofacy', 'STRONTIUM', 'Tsar Team'],
    motivation: 'espionage',
    sophistication: 'advanced',
    targets: ['government', 'defence', 'aerospace', 'energy'],
    ttps: ['T1566', 'T1190', 'T1059', 'T1070', 'T1027', 'T1110', 'T1041'],
    iocs: [],
  },
  {
    id: 'G0032',
    name: 'Lazarus Group',
    aliases: ['HIDDEN COBRA', 'Guardians of Peace'],
    motivation: 'financial',
    sophistication: 'advanced',
    targets: ['financial', 'cryptocurrency', 'defence', 'media'],
    ttps: ['T1566', 'T1195', 'T1486', 'T1055', 'T1027', 'T1021'],
    iocs: [],
  },
  {
    id: 'G0085',
    name: 'FIN6',
    aliases: ['ITG08', 'Skeleton Spider'],
    motivation: 'financial',
    sophistication: 'intermediate',
    targets: ['retail', 'hospitality', 'financial', 'point-of-sale'],
    ttps: ['T1566', 'T1059', 'T1078', 'T1021', 'T1486', 'T1041'],
    iocs: [],
  },
  {
    id: 'G0016',
    name: 'APT29 (Cozy Bear)',
    aliases: ['Nobelium', 'The Dukes', 'SolarStorm'],
    motivation: 'espionage',
    sophistication: 'advanced',
    targets: ['government', 'think-tanks', 'technology', 'healthcare'],
    ttps: ['T1195', 'T1566', 'T1078', 'T1027', 'T1070', 'T1021', 'T1005'],
    iocs: [],
  },
];

export class ThreatIntelligenceAgent {
  readonly role = 'threat-intelligence' as const;
  readonly capabilities = [
    'mitre-attack-mapping',
    'threat-actor-profiling',
    'threat-scenario-modeling',
    'ioc-analysis',
    'attack-surface-analysis',
    'threat-landscape-briefing',
  ];

  mapToMitreAttack(attackVector: string, symptoms: string[]): {
    tactics: string[];
    techniques: Array<{ id: string; name: string; tactic: string }>;
    coverage: string;
  } {
    const matched: Array<{ id: string; name: string; tactic: string }> = [];
    const matchedTactics = new Set<string>();

    for (const [tacticKey, tactic] of Object.entries(MITRE_TACTICS)) {
      for (const technique of tactic.techniques) {
        const relevant = symptoms.some(s =>
          technique.name.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(technique.id.toLowerCase())
        );
        if (relevant) {
          matched.push({ id: technique.id, name: technique.name, tactic: tactic.name });
          matchedTactics.add(tacticKey);
        }
      }
    }

    return {
      tactics: Array.from(matchedTactics),
      techniques: matched,
      coverage: matched.length > 0
        ? `${matched.length} technique(s) across ${matchedTactics.size} tactic(s) mapped`
        : 'No direct ATT&CK mapping — manual analysis recommended',
    };
  }

  buildThreatScenario(params: {
    title: string;
    description: string;
    affectedAssets: string[];
    attackVector: string;
    symptoms?: string[];
    actorId?: string;
  }): ThreatScenario {
    const actor = params.actorId
      ? KNOWN_ACTORS.find(a => a.id === params.actorId)
      : undefined;

    const mapping = this.mapToMitreAttack(
      params.attackVector,
      params.symptoms ?? [params.attackVector],
    );

    return {
      id: `THREAT-${randomUUID().slice(0, 8).toUpperCase()}`,
      title: params.title,
      description: params.description,
      actor,
      attackVector: params.attackVector,
      techniques: mapping.techniques.map(t => t.id),
      affectedAssets: params.affectedAssets,
      likelihood: this.assessLikelihood(actor, mapping.techniques.length),
      impact: this.assessImpact(params.affectedAssets),
      detectionControls: this.suggestDetectionControls(mapping.techniques.map(t => t.id)),
      mitigationControls: this.suggestMitigationControls(mapping.techniques.map(t => t.id)),
    };
  }

  private assessLikelihood(actor: ThreatActor | undefined, techniqueCount: number): RiskSeverity {
    if (actor?.sophistication === 'advanced' || techniqueCount >= 5) return 'high';
    if (actor?.sophistication === 'intermediate' || techniqueCount >= 3) return 'medium';
    return 'low';
  }

  private assessImpact(assets: string[]): RiskSeverity {
    const highValueAssets = ['database', 'credential', 'customer data', 'payment', 'production', 'core'];
    const matches = assets.filter(a => highValueAssets.some(h => a.toLowerCase().includes(h)));
    if (matches.length >= 2) return 'critical';
    if (matches.length === 1) return 'high';
    return 'medium';
  }

  private suggestDetectionControls(techniques: string[]): string[] {
    const controls: string[] = [];
    if (techniques.some(t => ['T1566', 'T1204'].includes(t))) controls.push('Email gateway anti-phishing, URL sandboxing');
    if (techniques.some(t => ['T1059', 'T1106'].includes(t))) controls.push('EDR with command-line monitoring, AMSI integration');
    if (techniques.some(t => ['T1078', 'T1110'].includes(t))) controls.push('SIEM failed-login alerting, privileged account monitoring');
    if (techniques.some(t => ['T1021', 'T1080'].includes(t))) controls.push('Network segmentation monitoring, lateral movement detection');
    if (techniques.some(t => ['T1041', 'T1048', 'T1567'].includes(t))) controls.push('DLP, egress filtering, anomalous data-volume alerts');
    if (controls.length === 0) controls.push('SIEM correlation rules, anomaly detection baseline');
    return controls;
  }

  private suggestMitigationControls(techniques: string[]): string[] {
    const controls: string[] = [];
    if (techniques.some(t => ['T1566', 'T1204'].includes(t))) controls.push('Security awareness training, phishing simulation programme');
    if (techniques.some(t => ['T1190', 'T1068'].includes(t))) controls.push('Patch management SLA, vulnerability scanning, WAF');
    if (techniques.some(t => ['T1078', 'T1110'].includes(t))) controls.push('MFA enforcement, PAM solution, least-privilege IAM');
    if (techniques.some(t => ['T1059', 'T1106'].includes(t))) controls.push('Application allow-listing, script-block logging');
    if (techniques.some(t => ['T1486', 'T1485'].includes(t))) controls.push('Immutable backups, business continuity plan, offline recovery');
    if (controls.length === 0) controls.push('Zero trust network access, defence-in-depth layering');
    return controls;
  }

  getThreatActors(): ThreatActor[] {
    return KNOWN_ACTORS;
  }

  getMitreAttackCatalogue(): typeof MITRE_TACTICS {
    return MITRE_TACTICS;
  }

  buildThreatLandscapeBriefing(industry: string, scenarios: ThreatScenario[]): string {
    const critical = scenarios.filter(s => s.impact === 'critical');
    const high = scenarios.filter(s => s.impact === 'high');

    return [
      `Threat Landscape Briefing — ${industry} Sector`,
      `Generated: ${new Date().toDateString()}`,
      '',
      `${scenarios.length} threat scenarios modelled — ${critical.length} critical impact, ${high.length} high impact`,
      '',
      critical.length > 0
        ? `PRIORITY THREATS:\n${critical.map(s => `  • ${s.title}\n    Vector: ${s.attackVector}\n    Techniques: ${s.techniques.join(', ')}`).join('\n')}`
        : '',
      '',
      'TOP MITIGATIONS:',
      ...Array.from(new Set(scenarios.flatMap(s => s.mitigationControls))).slice(0, 5).map(m => `  • ${m}`),
    ].filter(Boolean).join('\n');
  }
}
