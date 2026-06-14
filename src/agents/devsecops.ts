/**
 * DevSecOps Agent
 * Audits CI/CD pipelines, SAST/DAST coverage, SBOM, secrets scanning.
 */

interface PipelineSecurityFinding {
  stage: string;
  control: string;
  status: 'present' | 'missing' | 'partial';
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export class DevSecOpsAgent {
  readonly role = 'devsecops' as const;
  readonly capabilities = [
    'sast-dast-review',
    'sbom-analysis',
    'secrets-scanning',
    'pipeline-hardening',
    'container-security',
    'iac-security',
    'dependency-review',
  ];

  auditPipeline(params: {
    hasSAST?: boolean;
    hasDASTStaging?: boolean;
    hasSecretsScanning?: boolean;
    hasDependencyReview?: boolean;
    hasSBOM?: boolean;
    hasContainerScanning?: boolean;
    hasIACScanning?: boolean;
    hasSLSAProvenance?: boolean;
    hasSignedArtifacts?: boolean;
    hasMinimumReviewers?: boolean;
    hasBranchProtection?: boolean;
    hasPinnedDependencies?: boolean;
  }): PipelineSecurityFinding[] {
    const checks: Array<{
      key: keyof typeof params;
      stage: string;
      control: string;
      severity: PipelineSecurityFinding['severity'];
      recommendation: string;
    }> = [
      { key: 'hasSAST', stage: 'Code Analysis', control: 'Static Application Security Testing (SAST)', severity: 'critical', recommendation: 'Integrate SAST (Semgrep, CodeQL, SonarQube) in every PR check. Block merges on high-severity findings.' },
      { key: 'hasDASTStaging', stage: 'Dynamic Testing', control: 'Dynamic Application Security Testing (DAST)', severity: 'high', recommendation: 'Run DAST (OWASP ZAP, Burp Suite Enterprise) against staging before production deployments.' },
      { key: 'hasSecretsScanning', stage: 'Code Analysis', control: 'Secrets Scanning', severity: 'critical', recommendation: 'Integrate Gitleaks or GitHub Secret Scanning. Block commits containing secrets. Rotate any found secrets immediately.' },
      { key: 'hasDependencyReview', stage: 'Supply Chain', control: 'Dependency Review / SCA', severity: 'high', recommendation: 'Use Dependabot, Snyk, or OWASP Dependency-Check. Block PRs that introduce vulnerable dependencies.' },
      { key: 'hasSBOM', stage: 'Supply Chain', control: 'Software Bill of Materials (SBOM)', severity: 'high', recommendation: 'Generate CycloneDX or SPDX SBOM for every build artefact. Store in artefact registry. Required for NTIA compliance.' },
      { key: 'hasContainerScanning', stage: 'Container', control: 'Container Image Scanning', severity: 'high', recommendation: 'Scan all container images with Trivy or Grype. Block deployment of images with critical/high CVEs.' },
      { key: 'hasIACScanning', stage: 'Infrastructure', control: 'IaC Security Scanning', severity: 'high', recommendation: 'Scan Terraform/CloudFormation/Helm charts with Checkov or tfsec. Block misconfigurations before apply.' },
      { key: 'hasSLSAProvenance', stage: 'Supply Chain', control: 'SLSA Provenance', severity: 'medium', recommendation: 'Generate and verify SLSA build provenance attestations. Target SLSA Level 2+ for production builds.' },
      { key: 'hasSignedArtifacts', stage: 'Supply Chain', control: 'Signed Artefacts (Sigstore/Cosign)', severity: 'medium', recommendation: 'Sign all container images and binaries with Cosign. Verify signatures at deploy time.' },
      { key: 'hasMinimumReviewers', stage: 'Code Review', control: 'Minimum Reviewer Policy (≥2)', severity: 'high', recommendation: 'Enforce branch protection requiring at least 2 approving reviewers before merge. Include security review for auth/crypto changes.' },
      { key: 'hasBranchProtection', stage: 'Repository', control: 'Branch Protection Rules', severity: 'critical', recommendation: 'Protect main/master branches: require PR reviews, passing CI, no force pushes, no direct commits.' },
      { key: 'hasPinnedDependencies', stage: 'Supply Chain', control: 'Pinned Action / Image Digests', severity: 'medium', recommendation: 'Pin GitHub Actions and Docker images to commit SHAs (not mutable tags). Use Dependabot to keep pins updated.' },
    ];

    return checks.map(c => ({
      stage: c.stage,
      control: c.control,
      status: params[c.key] === true ? 'present' : params[c.key] === undefined ? 'missing' : 'partial',
      severity: c.severity,
      recommendation: c.recommendation,
    }));
  }

  buildSecureDevSecOpsTemplate(): string {
    return `# Secure CI/CD Pipeline Template

## Stage 1: Pre-Commit (Developer Workstation)
- [ ] Pre-commit hooks: secrets scanning (gitleaks), lint, basic formatting
- [ ] Sign commits with GPG or SSH key

## Stage 2: Pull Request Checks (CI Gate)
- [ ] SAST: CodeQL / Semgrep — block on HIGH+
- [ ] Secrets scan: Gitleaks / GitHub Secret Scanning — block on any finding
- [ ] Dependency review: Dependabot / Snyk — block on HIGH+ CVEs in direct deps
- [ ] IaC scan: Checkov / tfsec — block on HIGH+
- [ ] Minimum 2 reviewer approvals required
- [ ] Branch protection: no force-push, dismiss stale reviews

## Stage 3: Build (CI)
- [ ] Reproducible build in hermetic environment
- [ ] SBOM generation (CycloneDX): attach to artefact
- [ ] Container scan: Trivy — block on critical
- [ ] Sign artefact: Cosign + SLSA provenance attestation
- [ ] Push to private registry with immutable tags

## Stage 4: Pre-Deploy (Staging Gate)
- [ ] DAST: OWASP ZAP baseline scan against staging
- [ ] Smoke tests + integration tests pass
- [ ] Security regression test suite passes
- [ ] Artefact signature verification before deploy

## Stage 5: Production Deploy
- [ ] Verify SLSA provenance before promotion
- [ ] Deploy via GitOps — no manual kubectl/terraform apply
- [ ] Blue/green or canary deploy with automatic rollback on error rate spike
- [ ] Runtime security policy enforced (Falco / AppArmor / Seccomp)

## Stage 6: Post-Deploy Monitoring
- [ ] SIEM ingests application and infrastructure logs
- [ ] WAF active on all public-facing endpoints
- [ ] RASP / runtime protection enabled
- [ ] Anomaly detection rules active
`;
  }

  summariseFindings(findings: PipelineSecurityFinding[]): string {
    const missing = findings.filter(f => f.status === 'missing');
    const critical = missing.filter(f => f.severity === 'critical');
    const high = missing.filter(f => f.severity === 'high');

    const lines = [
      `DevSecOps Pipeline Audit — ${new Date().toDateString()}`,
      `Controls assessed: ${findings.length} | Missing: ${missing.length} | Present: ${findings.filter(f => f.status === 'present').length}`,
      '',
    ];

    if (critical.length > 0) {
      lines.push('CRITICAL (fix immediately):');
      for (const f of critical) lines.push(`  [${f.stage}] ${f.control}\n    → ${f.recommendation}`);
      lines.push('');
    }
    if (high.length > 0) {
      lines.push('HIGH (fix within 30 days):');
      for (const f of high) lines.push(`  [${f.stage}] ${f.control}\n    → ${f.recommendation}`);
    }

    return lines.join('\n');
  }
}
