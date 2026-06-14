/**
 * Incident Response Agent
 * Creates playbooks, tabletop exercise scripts, and DFIR checklists.
 */

import type { IncidentPlaybook, PlaybookStep, IncidentPhase, RiskSeverity } from '../types.js';
import { randomUUID } from 'node:crypto';

const PLAYBOOK_TEMPLATES: Record<string, Omit<IncidentPlaybook, 'id' | 'createdAt'>> = {
  ransomware: {
    name: 'Ransomware Incident Response Playbook',
    incidentType: 'ransomware',
    severity: 'critical',
    communicationPlan: 'Immediate notification to: CISO, CEO, Legal, PR/Comms, Cyber Insurance. External: Law enforcement (if required), CISA (US) / NCSC (UK). Internal: All-staff advisory within 2h.',
    legalConsiderations: 'Preserve all evidence. Consult legal before ransom payment decision (sanctions risk). Check regulatory notification obligations (72h GDPR, 30-day SEC). Document all decisions with timestamps.',
    steps: [
      { phase: 'preparation', order: 1, action: 'Maintain offline encrypted backups tested weekly. Maintain contact list for IR team, law enforcement, and cyber insurer.', responsible: 'IT Ops', timeframe: 'Ongoing', tools: ['Backup solution', 'IR contact list'] },
      { phase: 'identification', order: 2, action: 'Detect ransom note / encrypted files. Isolate affected endpoint(s) from network immediately. Capture memory image if safe to do so.', responsible: 'SOC Analyst', timeframe: '0–15 min', tools: ['EDR', 'SIEM alert', 'Volatility'] },
      { phase: 'identification', order: 3, action: 'Determine blast radius: which systems, data, and backups are affected. Identify patient-zero via EDR telemetry.', responsible: 'IR Lead', timeframe: '15–60 min', tools: ['EDR', 'Network flow data', 'SIEM'] },
      { phase: 'containment', order: 4, action: 'Hard-isolate affected network segments. Disable compromised accounts. Block C2 IPs/domains at perimeter.', responsible: 'Network Ops', timeframe: '1–2h', tools: ['Firewall', 'AD', 'Threat intel feed'], escalationCriteria: 'Spread to domain controller → escalate to CISO immediately' },
      { phase: 'containment', order: 5, action: 'Preserve forensic copies of affected systems (disk images). Do NOT attempt decryption until after imaging.', responsible: 'DFIR Team', timeframe: '2–4h', tools: ['FTK Imager', 'dd', 'Write blockers'] },
      { phase: 'eradication', order: 6, action: 'Identify and remove all malware components, persistence mechanisms, and attacker footholds. Rebuild from known-good images.', responsible: 'DFIR Team', timeframe: '24–72h', tools: ['EDR', 'AV', 'Known-good baseline'] },
      { phase: 'eradication', order: 7, action: 'Reset all privileged credentials. Rotate service account passwords. Review and revoke suspicious OAuth grants.', responsible: 'IAM Team', timeframe: '24h', tools: ['AD', 'Azure AD', 'PAM'] },
      { phase: 'recovery', order: 8, action: 'Restore from last known-good backup. Verify data integrity before reconnecting to production network.', responsible: 'IT Ops', timeframe: '24–168h', tools: ['Backup solution', 'Integrity checker'] },
      { phase: 'recovery', order: 9, action: 'Monitor restored systems intensively for 30 days for re-infection indicators.', responsible: 'SOC', timeframe: '30 days', tools: ['EDR', 'SIEM', 'NDR'] },
      { phase: 'lessons-learned', order: 10, action: 'Conduct post-incident review within 2 weeks. Document root cause, timeline, impact, and improvement actions.', responsible: 'CISO', timeframe: '14 days post-recovery', tools: ['PIR template'] },
    ],
  },
  'data-breach': {
    name: 'Data Breach Incident Response Playbook',
    incidentType: 'data-breach',
    severity: 'critical',
    communicationPlan: 'Legal, DPO, CISO, CEO notified immediately. Regulatory notifications per jurisdiction (GDPR 72h, state breach laws). Customer notification per legal advice. No public statement without legal/PR approval.',
    legalConsiderations: 'Engage DPO immediately. Document what data was accessed, whose, and since when. Assess notification obligations per GDPR Art.33/34, CCPA, state laws. Privilege legal communications. Preserve chain of custody for evidence.',
    steps: [
      { phase: 'identification', order: 1, action: 'Confirm breach via SIEM, DLP alerts, or external notification. Classify data types affected (PII, PHI, financial, IP).', responsible: 'SOC Analyst', timeframe: '0–30 min', tools: ['DLP', 'SIEM', 'Data classification tool'] },
      { phase: 'identification', order: 2, action: 'Scope the breach: volume of records, affected individuals, data categories, geographic jurisdictions.', responsible: 'DPO / IR Lead', timeframe: '1–4h', tools: ['Data inventory', 'Log analysis'] },
      { phase: 'containment', order: 3, action: 'Revoke compromised credentials. Block exfiltration vector. Patch exploited vulnerability if applicable.', responsible: 'Security Ops', timeframe: '1–2h', tools: ['IAM', 'Firewall', 'WAF'] },
      { phase: 'eradication', order: 4, action: 'Remove attacker persistence. Audit all data access logs for the compromise window.', responsible: 'DFIR Team', timeframe: '24–48h', tools: ['SIEM', 'EDR', 'Database audit logs'] },
      { phase: 'recovery', order: 5, action: 'Restore affected systems. Harden access controls. Implement additional monitoring.', responsible: 'IT Ops', timeframe: '24–72h', tools: ['SIEM', 'MFA', 'CASB'] },
      { phase: 'lessons-learned', order: 6, action: 'Regulatory notifications filed. PIR completed. DPO records updated. Security controls improved.', responsible: 'CISO / DPO', timeframe: '72h–30 days', tools: ['Regulatory portal', 'PIR template'] },
    ],
  },
  'insider-threat': {
    name: 'Insider Threat Incident Response Playbook',
    incidentType: 'insider-threat',
    severity: 'high',
    communicationPlan: 'HR, Legal, and CISO notified. Limit awareness to need-to-know to preserve investigation integrity. No notification to suspect.',
    legalConsiderations: 'HR and Legal must co-lead. Employment law governs evidence collection and monitoring. Preserve chain of custody. Do not access personal devices without legal authorisation. Document all actions.',
    steps: [
      { phase: 'identification', order: 1, action: 'UEBA alert or tip received. Assign confidential investigation identifier. Notify HR and Legal immediately.', responsible: 'CISO', timeframe: '0–1h', tools: ['UEBA', 'DLP', 'Investigation log'] },
      { phase: 'containment', order: 2, action: 'Scope access rights of subject. Place access under enhanced monitoring. Do NOT revoke without HR/Legal sign-off.', responsible: 'IAM Team', timeframe: '1–4h', tools: ['IAM', 'SIEM', 'UEBA'] },
      { phase: 'eradication', order: 3, action: 'Upon HR decision — revoke all access simultaneously across all systems. Recover assets.', responsible: 'IT Ops / HR', timeframe: 'Per HR timeline', tools: ['AD', 'MDM', 'Asset tracker'] },
      { phase: 'recovery', order: 4, action: 'Assess and remediate any data exfiltration or sabotage. Notify affected parties per legal guidance.', responsible: 'DFIR / Legal', timeframe: '24–72h', tools: ['DLP', 'Backup'] },
      { phase: 'lessons-learned', order: 5, action: 'Review insider threat programme. Update acceptable-use policy. Improve UEBA baselines.', responsible: 'CISO', timeframe: '30 days', tools: ['UEBA', 'Policy management'] },
    ],
  },
};

export class IncidentResponseAgent {
  readonly role = 'incident-response' as const;
  readonly capabilities = [
    'playbook-generation',
    'tabletop-exercise-design',
    'dfir-checklists',
    'irp-creation',
    'communication-plan',
    'post-incident-review',
  ];

  getPlaybook(incidentType: string): IncidentPlaybook {
    const template = PLAYBOOK_TEMPLATES[incidentType] ?? PLAYBOOK_TEMPLATES['data-breach'];
    return {
      id: `PB-${randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      ...template,
    };
  }

  buildCustomPlaybook(params: {
    name: string;
    incidentType: string;
    severity: RiskSeverity;
    affectedSystems: string[];
    regulatoryFrameworks: string[];
  }): IncidentPlaybook {
    const steps: PlaybookStep[] = [
      { phase: 'identification', order: 1, action: `Confirm ${params.incidentType} incident on ${params.affectedSystems.join(', ')}. Activate incident bridge.`, responsible: 'SOC Lead', timeframe: '0–30 min', tools: ['SIEM', 'Ticketing system'] },
      { phase: 'containment', order: 2, action: 'Isolate affected systems. Block IOCs at perimeter. Revoke implicated credentials.', responsible: 'Security Ops', timeframe: '30–120 min', tools: ['EDR', 'Firewall', 'IAM'] },
      { phase: 'eradication', order: 3, action: 'Remove malware / unauthorised access paths. Patch exploited vulnerability.', responsible: 'DFIR Team', timeframe: '2–24h', tools: ['EDR', 'Vulnerability scanner'] },
      { phase: 'recovery', order: 4, action: 'Restore from clean backup. Validate integrity. Reconnect to production under monitoring.', responsible: 'IT Ops', timeframe: '24–72h', tools: ['Backup solution', 'EDR'] },
      { phase: 'lessons-learned', order: 5, action: `PIR completed. Regulatory notifications filed (${params.regulatoryFrameworks.join(', ')}). Controls updated.`, responsible: 'CISO', timeframe: '14–30 days', tools: ['PIR template', 'GRC platform'] },
    ];

    return {
      id: `PB-${randomUUID().slice(0, 8).toUpperCase()}`,
      name: params.name,
      incidentType: params.incidentType,
      severity: params.severity,
      communicationPlan: `Notify CISO, Legal, and PR immediately. File regulatory notifications per ${params.regulatoryFrameworks.join(', ')} deadlines.`,
      legalConsiderations: `Preserve evidence. Consult legal before external communications. Document all decisions.`,
      createdAt: new Date().toISOString(),
      steps,
    };
  }

  buildTabletopExercise(scenario: string, severity: RiskSeverity): {
    scenario: string;
    objectives: string[];
    injects: Array<{ time: string; description: string; expectedActions: string[] }>;
    discussionQuestions: string[];
  } {
    return {
      scenario,
      objectives: [
        'Validate incident response plan and decision-making process',
        'Test communication and escalation paths',
        'Identify gaps in tools, processes, and skills',
        'Exercise regulatory notification procedures',
        'Build team muscle memory for crisis conditions',
      ],
      injects: [
        { time: 'T+0', description: `SIEM alert: anomalous activity consistent with ${scenario}`, expectedActions: ['Analyst triages alert', 'Incident bridge activated', 'IR Lead notified'] },
        { time: 'T+30m', description: 'Scope confirmed — multiple systems affected', expectedActions: ['Containment initiated', 'CISO briefed', 'Legal notified', 'Blast-radius scoped'] },
        { time: 'T+2h', description: 'Media enquiry received about potential incident', expectedActions: ['PR/Comms activated', 'Holding statement prepared', 'No premature disclosure'] },
        { time: 'T+4h', description: `Regulatory notification deadline approaching (${severity === 'critical' ? '72h GDPR clock started' : 'Board briefing required'})`, expectedActions: ['DPO/Legal drafts notification', 'Evidence preserved', 'Timeline documented'] },
        { time: 'T+24h', description: 'Recovery path confirmed. Attacker may still be present in backup systems.', expectedActions: ['Backup integrity validation', 'Re-infection prevention controls', 'Monitoring uplift'] },
      ],
      discussionQuestions: [
        'Who has authority to declare a major incident and activate the full IRP?',
        'How do we ensure forensic evidence is preserved while containing the threat?',
        'What is our ransomware payment decision-making process and who has authority?',
        'How do we communicate with affected customers without triggering further liability?',
        'What single control improvement would have prevented or detected this earlier?',
        'How does our cyber insurance policy interact with our response decisions?',
      ],
    };
  }

  formatPlaybook(pb: IncidentPlaybook): string {
    const phases: IncidentPhase[] = ['preparation', 'identification', 'containment', 'eradication', 'recovery', 'lessons-learned'];
    const lines = [
      `═══ ${pb.name} ═══`,
      `ID: ${pb.id}  |  Type: ${pb.incidentType}  |  Severity: ${pb.severity.toUpperCase()}`,
      `Created: ${new Date(pb.createdAt).toDateString()}`,
      '',
      '📢 COMMUNICATION PLAN',
      pb.communicationPlan,
      '',
      '⚖ LEGAL CONSIDERATIONS',
      pb.legalConsiderations,
      '',
    ];

    for (const phase of phases) {
      const phaseSteps = pb.steps.filter(s => s.phase === phase);
      if (phaseSteps.length === 0) continue;
      lines.push(`── ${phase.toUpperCase()} ──`);
      for (const step of phaseSteps.sort((a, b) => a.order - b.order)) {
        lines.push(`  [${step.order}] ${step.action}`);
        lines.push(`      Owner: ${step.responsible}  |  Timeframe: ${step.timeframe}`);
        if (step.tools?.length) lines.push(`      Tools: ${step.tools.join(', ')}`);
        if (step.escalationCriteria) lines.push(`      ⚠ Escalate if: ${step.escalationCriteria}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
