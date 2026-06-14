/**
 * Security Architecture Agent
 * Reviews zero trust posture, IAM design, network segmentation, cloud security.
 */

import type { RemediationItem } from '../types.js';

interface ArchitectureReviewFinding {
  domain: string;
  control: string;
  status: 'implemented' | 'partial' | 'missing';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
}

export class SecurityArchitectureAgent {
  readonly role = 'security-architecture' as const;
  readonly capabilities = [
    'zero-trust-assessment',
    'iam-design-review',
    'network-segmentation',
    'cloud-security-posture',
    'encryption-strategy',
    'api-security',
    'secret-management',
  ];

  assessZeroTrust(posture: {
    mfaEnforced?: boolean;
    deviceTrustEnabled?: boolean;
    networkMicroSegmented?: boolean;
    leastPrivilegeIam?: boolean;
    continuousVerification?: boolean;
    encryptedInTransit?: boolean;
    encryptedAtRest?: boolean;
    pam?: boolean;
    siem?: boolean;
    edr?: boolean;
  }): ArchitectureReviewFinding[] {
    const checks: Array<{
      key: keyof typeof posture;
      domain: string;
      control: string;
      severity: ArchitectureReviewFinding['severity'];
      description: string;
      recommendation: string;
      effort: ArchitectureReviewFinding['effort'];
    }> = [
      { key: 'mfaEnforced', domain: 'Identity', control: 'Multi-Factor Authentication', severity: 'critical', description: 'All users require a second authentication factor before accessing systems.', recommendation: 'Enforce phishing-resistant MFA (FIDO2/WebAuthn) for all accounts, especially privileged users.', effort: 'medium' },
      { key: 'deviceTrustEnabled', domain: 'Device', control: 'Device Trust & Compliance', severity: 'high', description: 'Only managed, compliant devices are permitted to access corporate resources.', recommendation: 'Implement MDM/UEM with compliance policies. Enforce device health attestation at access time.', effort: 'high' },
      { key: 'networkMicroSegmented', domain: 'Network', control: 'Micro-Segmentation', severity: 'high', description: 'Network is divided into isolated segments with least-privilege east-west traffic rules.', recommendation: 'Deploy host-based firewalls and software-defined perimeters. Eliminate flat network architecture.', effort: 'high' },
      { key: 'leastPrivilegeIam', domain: 'Identity', control: 'Least-Privilege IAM', severity: 'critical', description: 'Users and service accounts have only the permissions required for their function.', recommendation: 'Conduct access rights review. Remove standing privileged access — use JIT/JEA via PAM.', effort: 'high' },
      { key: 'continuousVerification', domain: 'Access', control: 'Continuous Verification', severity: 'high', description: 'Access is re-evaluated continuously based on risk signals rather than being implicit once authenticated.', recommendation: 'Implement Conditional Access / risk-based authentication with session re-evaluation.', effort: 'high' },
      { key: 'encryptedInTransit', domain: 'Data', control: 'Encryption in Transit', severity: 'critical', description: 'All data in transit is encrypted using TLS 1.2+ with strong cipher suites.', recommendation: 'Enforce TLS 1.3 everywhere. Disable TLS 1.0/1.1. Implement certificate pinning for critical services.', effort: 'medium' },
      { key: 'encryptedAtRest', domain: 'Data', control: 'Encryption at Rest', severity: 'high', description: 'Sensitive data at rest is encrypted with customer-managed keys.', recommendation: 'Enable full-disk encryption and database encryption. Use HSM or cloud KMS for key management.', effort: 'medium' },
      { key: 'pam', domain: 'Identity', control: 'Privileged Access Management', severity: 'critical', description: 'Privileged accounts are managed through a PAM solution with session recording and just-in-time access.', recommendation: 'Deploy CyberArk, BeyondTrust, or equivalent. Vault all privileged credentials. Record privileged sessions.', effort: 'high' },
      { key: 'siem', domain: 'Detection', control: 'SIEM / Security Monitoring', severity: 'high', description: 'Security events are centralised, correlated, and alerted on in near real-time.', recommendation: 'Deploy SIEM with curated detection rules. Integrate all log sources. Establish 24/7 monitoring.', effort: 'high' },
      { key: 'edr', domain: 'Detection', control: 'Endpoint Detection & Response', severity: 'high', description: 'All endpoints have EDR deployed for threat detection and response.', recommendation: 'Deploy EDR with behavioural detection on all servers and workstations. Integrate with SIEM.', effort: 'medium' },
    ];

    return checks.map(c => ({
      domain: c.domain,
      control: c.control,
      status: posture[c.key] === true ? 'implemented' : posture[c.key] === undefined ? 'missing' : 'partial',
      severity: c.severity,
      description: c.description,
      recommendation: c.recommendation,
      effort: c.effort,
    }));
  }

  reviewIAMDesign(params: {
    identityProvider: string;
    mfa: boolean;
    ssoEnabled: boolean;
    roleBasedAccess: boolean;
    privilegedAccountsVaulted: boolean;
    serviceAccountsAudited: boolean;
    accessReviewsScheduled: boolean;
  }): string[] {
    const gaps: string[] = [];
    if (!params.mfa) gaps.push('MFA not enforced — critical gap; phishing defeats password-only auth');
    if (!params.ssoEnabled) gaps.push('SSO not enabled — scattered credentials increase breach surface');
    if (!params.roleBasedAccess) gaps.push('RBAC not implemented — excessive permissions likely; run access rights review');
    if (!params.privilegedAccountsVaulted) gaps.push('Privileged credentials not vaulted — PAM solution required immediately');
    if (!params.serviceAccountsAudited) gaps.push('Service accounts not audited — stale/over-privileged accounts are high-value attacker targets');
    if (!params.accessReviewsScheduled) gaps.push('No scheduled access reviews — dormant accounts accumulate over time');
    return gaps;
  }

  buildCloudSecurityChecklist(cloudProvider: 'AWS' | 'GCP' | 'Azure' | 'multi-cloud'): Array<{
    category: string;
    check: string;
    risk: string;
    remediation: string;
  }> {
    const common = [
      { category: 'Identity', check: 'Root/super-admin account MFA enabled', risk: 'Account takeover → full cloud compromise', remediation: 'Enable MFA on root account; lock root credentials in secure vault; do not use root for day-to-day operations' },
      { category: 'Identity', check: 'No long-lived access keys for users', risk: 'Leaked keys enable persistent unauthorized access', remediation: 'Replace user access keys with SSO + role assumption. Rotate existing keys. Set expiry policies.' },
      { category: 'Storage', check: 'No publicly accessible storage buckets / blobs', risk: 'Data exposure to internet', remediation: 'Audit all storage objects for public ACLs. Enable SCPs/policies to prevent public buckets. Enable Macie / DLP.' },
      { category: 'Logging', check: 'CloudTrail / Cloud Audit Logs enabled for all regions', risk: 'No audit trail for forensics or compliance', remediation: 'Enable audit logging in all regions. Ship to immutable log storage. Alert on CloudTrail disabling.' },
      { category: 'Network', check: 'Security groups / firewall rules follow least-privilege', risk: '0.0.0.0/0 inbound rules expose services to internet', remediation: 'Audit all security groups. Remove 0.0.0.0/0 rules. Use private endpoints for internal services.' },
      { category: 'Encryption', check: 'Customer-managed keys for sensitive data', risk: 'CSP key access to customer data', remediation: 'Use CMK via KMS/HSM for sensitive workloads. Enforce key rotation.' },
      { category: 'Monitoring', check: 'GuardDuty / Security Command Center / Defender enabled', risk: 'No native threat detection', remediation: `Enable ${cloudProvider === 'AWS' ? 'GuardDuty + Security Hub' : cloudProvider === 'GCP' ? 'Security Command Center' : 'Microsoft Defender for Cloud'} across all accounts/projects.` },
      { category: 'Compliance', check: 'Resource tagging policy enforced', risk: 'Untagged resources evade security review and cost tracking', remediation: 'Enforce mandatory tags via policy. Run periodic tagging compliance checks.' },
    ];
    return common;
  }

  generateArchitectureRemediations(findings: ArchitectureReviewFinding[]): RemediationItem[] {
    const now = new Date();
    return findings
      .filter(f => f.status !== 'implemented')
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.severity] - order[b.severity];
      })
      .map((f, i) => {
        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + (f.severity === 'critical' ? 30 : f.severity === 'high' ? 90 : 180));
        return {
          id: `ARCH-REM-${i + 1}`,
          title: `${f.domain}: ${f.control}`,
          description: f.recommendation,
          effort: f.effort,
          impact: f.severity === 'critical' || f.severity === 'high' ? 'high' : 'medium' as const,
          priority: f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'high' : 'normal' as const,
          owner: 'Security Architecture',
          targetDate: deadline.toISOString().split('T')[0],
          status: 'planned' as const,
        };
      });
  }
}
