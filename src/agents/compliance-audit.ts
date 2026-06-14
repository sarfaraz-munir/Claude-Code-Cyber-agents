/**
 * Compliance & Audit Agent
 * Performs gap analysis against SOC 2, ISO 27001, NIST CSF, GDPR, HIPAA, PCI-DSS.
 */

import type { ComplianceFramework, ComplianceControl, ComplianceReport } from '../types.js';

// Canonical control catalogue — representative controls per framework
const CONTROL_CATALOGUE: Record<ComplianceFramework, Omit<ComplianceControl, 'status' | 'evidence' | 'gaps' | 'remediationSteps'>[]> = {
  'SOC2-TypeII': [
    { id: 'CC1.1', framework: 'SOC2-TypeII', domain: 'Control Environment', controlName: 'Board Oversight', requirement: 'The board of directors demonstrates commitment to integrity and ethical values', effort: 'medium', priority: 'high' },
    { id: 'CC6.1', framework: 'SOC2-TypeII', domain: 'Logical Access', controlName: 'Logical Access Controls', requirement: 'Logical access security measures restrict access to systems to authorised users', effort: 'high', priority: 'critical' },
    { id: 'CC6.6', framework: 'SOC2-TypeII', domain: 'Logical Access', controlName: 'External Threats', requirement: 'Logical access measures restrict access from external threats', effort: 'high', priority: 'critical' },
    { id: 'CC7.2', framework: 'SOC2-TypeII', domain: 'System Operations', controlName: 'Monitoring', requirement: 'System components are monitored to detect anomalies', effort: 'medium', priority: 'high' },
    { id: 'CC9.1', framework: 'SOC2-TypeII', domain: 'Risk Mitigation', controlName: 'Risk Mitigation Activities', requirement: 'Risk mitigation activities are implemented to address identified risks', effort: 'high', priority: 'high' },
    { id: 'A1.2', framework: 'SOC2-TypeII', domain: 'Availability', controlName: 'Capacity Management', requirement: 'Capacity demands including system resources and volumes are managed', effort: 'medium', priority: 'normal' },
    { id: 'C1.1', framework: 'SOC2-TypeII', domain: 'Confidentiality', controlName: 'Confidential Information', requirement: 'Confidential information is protected during collection, processing, maintenance, use, retention, and disposal', effort: 'high', priority: 'high' },
  ],
  'ISO-27001': [
    { id: 'A.5.1', framework: 'ISO-27001', domain: 'Policies', controlName: 'Information Security Policies', requirement: 'Information security policy approved by management', effort: 'low', priority: 'high' },
    { id: 'A.6.1', framework: 'ISO-27001', domain: 'Organisation', controlName: 'Security Roles', requirement: 'Security responsibilities defined and allocated', effort: 'low', priority: 'high' },
    { id: 'A.8.1', framework: 'ISO-27001', domain: 'Asset Management', controlName: 'Inventory of Assets', requirement: 'Assets associated with information maintained and inventoried', effort: 'medium', priority: 'high' },
    { id: 'A.9.1', framework: 'ISO-27001', domain: 'Access Control', controlName: 'Access Control Policy', requirement: 'Access control policy based on business and security requirements', effort: 'medium', priority: 'critical' },
    { id: 'A.10.1', framework: 'ISO-27001', domain: 'Cryptography', controlName: 'Cryptographic Controls', requirement: 'Policy on use of cryptographic controls', effort: 'medium', priority: 'high' },
    { id: 'A.12.6', framework: 'ISO-27001', domain: 'Operations', controlName: 'Vulnerability Management', requirement: 'Technical vulnerabilities managed in a timely fashion', effort: 'high', priority: 'critical' },
    { id: 'A.16.1', framework: 'ISO-27001', domain: 'Incident Management', controlName: 'Incident Management', requirement: 'Consistent and effective approach to information security incidents', effort: 'high', priority: 'critical' },
    { id: 'A.17.1', framework: 'ISO-27001', domain: 'Business Continuity', controlName: 'BCP', requirement: 'Business continuity management planning', effort: 'high', priority: 'high' },
  ],
  'NIST-CSF': [
    { id: 'ID.AM-1', framework: 'NIST-CSF', domain: 'Identify', controlName: 'Asset Inventory', requirement: 'Physical devices and systems inventoried', effort: 'medium', priority: 'high' },
    { id: 'ID.RA-1', framework: 'NIST-CSF', domain: 'Identify', controlName: 'Risk Assessment', requirement: 'Asset vulnerabilities identified and documented', effort: 'high', priority: 'critical' },
    { id: 'PR.AC-1', framework: 'NIST-CSF', domain: 'Protect', controlName: 'Identity Management', requirement: 'Identities and credentials managed for authorised devices and users', effort: 'high', priority: 'critical' },
    { id: 'PR.DS-1', framework: 'NIST-CSF', domain: 'Protect', controlName: 'Data at Rest', requirement: 'Data-at-rest protected', effort: 'medium', priority: 'high' },
    { id: 'DE.CM-1', framework: 'NIST-CSF', domain: 'Detect', controlName: 'Network Monitoring', requirement: 'Network monitored to detect potential cybersecurity events', effort: 'high', priority: 'critical' },
    { id: 'RS.RP-1', framework: 'NIST-CSF', domain: 'Respond', controlName: 'Response Plan', requirement: 'Response plan is executed during or after an incident', effort: 'high', priority: 'critical' },
    { id: 'RC.RP-1', framework: 'NIST-CSF', domain: 'Recover', controlName: 'Recovery Plan', requirement: 'Recovery plan executed during or after a cybersecurity incident', effort: 'high', priority: 'high' },
  ],
  'GDPR': [
    { id: 'Art.5', framework: 'GDPR', domain: 'Principles', controlName: 'Principles of Processing', requirement: 'Personal data processed lawfully, fairly and transparently', effort: 'high', priority: 'critical' },
    { id: 'Art.25', framework: 'GDPR', domain: 'Data Protection by Design', controlName: 'Privacy by Design', requirement: 'Data protection implemented by design and by default', effort: 'high', priority: 'critical' },
    { id: 'Art.30', framework: 'GDPR', domain: 'Records', controlName: 'Records of Processing', requirement: 'Records of processing activities maintained', effort: 'medium', priority: 'high' },
    { id: 'Art.32', framework: 'GDPR', domain: 'Security', controlName: 'Security of Processing', requirement: 'Appropriate technical and organisational security measures', effort: 'high', priority: 'critical' },
    { id: 'Art.33', framework: 'GDPR', domain: 'Breach Notification', controlName: 'Breach Notification', requirement: 'Personal data breaches notified to supervisory authority within 72 hours', effort: 'medium', priority: 'critical' },
    { id: 'Art.35', framework: 'GDPR', domain: 'DPIA', controlName: 'Data Protection Impact Assessment', requirement: 'DPIA conducted for high-risk processing', effort: 'high', priority: 'high' },
  ],
  'HIPAA': [
    { id: 'HIPAA-164.308(a)(1)', framework: 'HIPAA', domain: 'Administrative', controlName: 'Security Management Process', requirement: 'Risk analysis and risk management implemented', effort: 'high', priority: 'critical' },
    { id: 'HIPAA-164.308(a)(4)', framework: 'HIPAA', domain: 'Administrative', controlName: 'Information Access Management', requirement: 'Access to ePHI limited to authorised persons', effort: 'high', priority: 'critical' },
    { id: 'HIPAA-164.310(a)(1)', framework: 'HIPAA', domain: 'Physical', controlName: 'Facility Access Controls', requirement: 'Policies limiting physical access to ePHI', effort: 'medium', priority: 'high' },
    { id: 'HIPAA-164.312(a)(1)', framework: 'HIPAA', domain: 'Technical', controlName: 'Access Control', requirement: 'Unique user identification, emergency access, automatic logoff, encryption', effort: 'high', priority: 'critical' },
    { id: 'HIPAA-164.312(e)(1)', framework: 'HIPAA', domain: 'Technical', controlName: 'Transmission Security', requirement: 'Technical security measures to guard against unauthorised access to ePHI transmitted over networks', effort: 'medium', priority: 'critical' },
  ],
  'PCI-DSS': [
    { id: 'PCI-1', framework: 'PCI-DSS', domain: 'Network Security', controlName: 'Network Security Controls', requirement: 'Install and maintain network security controls', effort: 'high', priority: 'critical' },
    { id: 'PCI-3', framework: 'PCI-DSS', domain: 'Data Protection', controlName: 'Protect Stored Account Data', requirement: 'Protect stored account data with encryption', effort: 'high', priority: 'critical' },
    { id: 'PCI-6', framework: 'PCI-DSS', domain: 'Secure Development', controlName: 'Secure Systems', requirement: 'Develop and maintain secure systems and software', effort: 'high', priority: 'critical' },
    { id: 'PCI-8', framework: 'PCI-DSS', domain: 'Access Control', controlName: 'Identify Users', requirement: 'Identify users and authenticate access to system components', effort: 'high', priority: 'critical' },
    { id: 'PCI-10', framework: 'PCI-DSS', domain: 'Logging', controlName: 'Log and Monitor', requirement: 'Log and monitor all access to network resources and cardholder data', effort: 'medium', priority: 'high' },
    { id: 'PCI-11', framework: 'PCI-DSS', domain: 'Testing', controlName: 'Test Security', requirement: 'Test security of systems and networks regularly', effort: 'medium', priority: 'high' },
  ],
  'CIS-Controls': [
    { id: 'CIS-1', framework: 'CIS-Controls', domain: 'Asset Management', controlName: 'Enterprise Asset Inventory', requirement: 'Actively manage all enterprise assets connected to infrastructure', effort: 'medium', priority: 'critical' },
    { id: 'CIS-3', framework: 'CIS-Controls', domain: 'Data Protection', controlName: 'Data Protection', requirement: 'Develop processes and controls to identify, classify, secure, and retain data', effort: 'high', priority: 'critical' },
    { id: 'CIS-5', framework: 'CIS-Controls', domain: 'Access Control', controlName: 'Account Management', requirement: 'Use processes and tools to assign and manage authorisation on user accounts', effort: 'high', priority: 'critical' },
    { id: 'CIS-6', framework: 'CIS-Controls', domain: 'Access Control', controlName: 'Access Control Management', requirement: 'Use processes and tools to create, assign, manage, and revoke access credentials', effort: 'high', priority: 'critical' },
    { id: 'CIS-12', framework: 'CIS-Controls', domain: 'Network', controlName: 'Network Infrastructure Management', requirement: 'Establish and maintain network architecture security', effort: 'high', priority: 'high' },
    { id: 'CIS-16', framework: 'CIS-Controls', domain: 'Incident Response', controlName: 'Incident Response Management', requirement: 'Establish and maintain incident response capabilities', effort: 'high', priority: 'critical' },
  ],
};

export class ComplianceAuditAgent {
  readonly role = 'compliance-audit' as const;
  readonly capabilities = [
    'soc2-gap-analysis',
    'iso27001-gap-analysis',
    'nist-csf-assessment',
    'gdpr-audit',
    'hipaa-audit',
    'pci-dss-audit',
    'cis-controls',
    'remediation-roadmap',
  ];

  runGapAnalysis(
    framework: ComplianceFramework,
    evidenceMap: Record<string, { status: ComplianceControl['status']; evidence?: string; gaps?: string[] }>,
  ): ComplianceReport {
    const catalogue = CONTROL_CATALOGUE[framework] ?? [];
    const controls: ComplianceControl[] = catalogue.map(c => {
      const e = evidenceMap[c.id];
      return {
        ...c,
        status: e?.status ?? 'non-compliant',
        evidence: e?.evidence,
        gaps: e?.gaps,
        remediationSteps: e?.status === 'non-compliant' || e?.status === 'partial'
          ? [`Review and implement ${c.controlName} per ${framework} requirements`, `Document evidence and test effectiveness`]
          : undefined,
      };
    });

    const applicable = controls.filter(c => c.status !== 'not-applicable');
    const compliant = controls.filter(c => c.status === 'compliant').length;
    const partial = controls.filter(c => c.status === 'partial').length;
    const nonCompliant = controls.filter(c => c.status === 'non-compliant').length;
    const notApplicable = controls.filter(c => c.status === 'not-applicable').length;

    const complianceScore = applicable.length > 0
      ? Math.round(((compliant + partial * 0.5) / applicable.length) * 100)
      : 100;

    const criticalGaps = controls
      .filter(c => (c.status === 'non-compliant' || c.status === 'partial') && c.priority === 'critical');

    const roadmap = controls
      .filter(c => c.status !== 'compliant' && c.status !== 'not-applicable')
      .sort((a, b) => {
        const order = { critical: 0, high: 1, normal: 2, low: 3 };
        return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      })
      .map((c, i) => ({
        id: `${framework}-REM-${i + 1}`,
        title: `Remediate ${c.id}: ${c.controlName}`,
        description: c.remediationSteps?.join('. ') ?? '',
        effort: c.effort,
        impact: c.priority === 'critical' || c.priority === 'high' ? 'high' : 'medium' as const,
        priority: c.priority,
        owner: 'Security Team',
        targetDate: this.targetDate(c.priority),
        status: 'planned' as const,
      }));

    return {
      framework,
      assessmentDate: new Date().toISOString(),
      totalControls: controls.length,
      compliant,
      partial,
      nonCompliant,
      notApplicable,
      complianceScore,
      criticalGaps,
      roadmap,
    };
  }

  private targetDate(priority: ComplianceControl['priority']): string {
    const d = new Date();
    const days = priority === 'critical' ? 30 : priority === 'high' ? 90 : 180;
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  formatReport(report: ComplianceReport): string {
    const lines = [
      `═══ ${report.framework} Compliance Gap Analysis ═══`,
      `Assessment Date: ${new Date(report.assessmentDate).toDateString()}`,
      `Overall Compliance Score: ${report.complianceScore}%`,
      '',
      `Controls: ${report.totalControls} total | ${report.compliant} compliant | ${report.partial} partial | ${report.nonCompliant} non-compliant | ${report.notApplicable} N/A`,
      '',
    ];

    if (report.criticalGaps.length > 0) {
      lines.push('⚠ CRITICAL GAPS (immediate action required):');
      for (const gap of report.criticalGaps) {
        lines.push(`  [${gap.id}] ${gap.controlName} — ${gap.status.toUpperCase()}`);
        if (gap.gaps?.length) lines.push(`    Gaps: ${gap.gaps.join('; ')}`);
      }
      lines.push('');
    }

    lines.push(`Remediation roadmap: ${report.roadmap.length} items (${report.roadmap.filter(r => r.priority === 'critical').length} critical)`);
    return lines.join('\n');
  }
}
