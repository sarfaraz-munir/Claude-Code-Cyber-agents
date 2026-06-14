# Usage Guide

This document covers all ways to activate and use the CISO Agents swarm.

---

## Table of Contents

- [How Agents and Skills Work](#how-agents-and-skills-work)
- [Activation Modes](#activation-modes)
  - [Mode 1: Claude Code Cowork (Agent Files)](#mode-1-claude-code-cowork-agent-files)
  - [Mode 2: Skill Files](#mode-2-skill-files)
  - [Mode 3: Slash Command](#mode-3-slash-command)
  - [Mode 4: TypeScript API](#mode-4-typescript-api)
  - [Mode 5: MCP Tools](#mode-5-mcp-tools)
- [Agent Reference](#agent-reference)
- [Skill Reference](#skill-reference)
- [Best Practices](#best-practices)

---

## How Agents and Skills Work

**Agent files** (`.claude/agents/ciso/ciso-*.md`) define specialist subagents that Claude Code can spawn via the `Agent` tool. Each file contains the agent's system prompt, domain expertise, methodology, and output format. The `ciso-queen` agent knows how to spawn all 9 specialists in parallel and synthesise their outputs.

**Skill files** (`.claude/skills/ciso-*/SKILL.md`) activate when explicitly invoked and provide step-by-step instructions for Claude Code to follow, including what subagents to spawn and how to format the final output.

**The slash command** (`/ciso-posture-review`) is a quick entry point that loads the full posture review workflow.

**The TypeScript API** (`CISOOrchestrator`) is a standalone class you can import directly — no Claude Code required for the computation.

---

## Activation Modes

### Mode 1: Claude Code Cowork (Agent Files)

Use this mode for interactive sessions where you want Claude Code to orchestrate the full swarm.

#### Full Posture Review (all 9 specialists)

In a Claude Code session:

```
Use the ciso-queen agent to run a full security posture review.

Context:
- Industry: financial services
- Critical assets: payment-api, customer-db, fraud-detection-service, admin-portal
- Compliance requirements: SOC2-TypeII, PCI-DSS v4.0, GDPR
- Zero trust posture: MFA enforced, encrypted in transit, no SIEM, no EDR, no microsegmentation
- CI/CD: SAST present, branch protection enabled, no secrets scanning, no SBOM, no container scanning
- Cloud: AWS multi-region
- AI systems: customer support chatbot using GPT-4 API, handles PII, internet-facing
```

Claude Code will spawn all 9 specialists concurrently and return a unified `SecurityPostureReport`.

#### Individual Specialist

```
Use the ciso-vulnerability-management agent to triage these CVEs:
CVE-2024-1234 (CVSS 9.8, exploit in wild, affects our api-gateway)
CVE-2024-5678 (CVSS 7.2, no known exploit, affects our npm dependencies)
```

#### AI Security Assessment Only

```
Use the ciso-ai-security agent to assess our customer support LLM:
- Deployed as SaaS API (OpenAI GPT-4)
- Internet-facing, handles PII and financial queries
- Has RAG with customer data
- Agentic: can look up account info and initiate refunds
- No human oversight on individual responses
- GDPR and PCI-DSS in scope
```

---

### Mode 2: Skill Files

Skills provide structured step-by-step workflows. Load a skill explicitly in your Claude Code session.

#### CISO Posture Review Skill

```
Load the ciso-posture-review skill and run a full security posture review for Ruflo v3.
```

#### AI Security Skill

```
Load the ciso-ai-security skill and assess our recommendation engine.
It's a self-hosted ML model trained on customer purchase history.
Internet-facing, no human oversight, processes PII.
```

#### Threat Model Skill

```
Load the ciso-threat-model skill and build a threat model for our new API gateway.
It handles authentication tokens for 50k users. Cloud-hosted on AWS. Internet-facing.
```

#### Incident Response Skill

```
Load the ciso-incident-response skill. We've detected ransomware on 3 servers.
Severity: critical. Affected: file-server-01, backup-server, dev-workstation.
```

---

### Mode 3: Slash Command

The `/ciso-posture-review` command is the fastest entry point.

```bash
# Basic — prompts for context interactively
/ciso-posture-review

# With scope
/ciso-posture-review Ruflo v3 AI agent platform

# Pass org context
/ciso-posture-review --industry technology --frameworks NIST-CSF,SOC2-TypeII
```

---

### Mode 4: TypeScript API

Use the `CISOOrchestrator` class directly for programmatic access.

#### Full Posture Review

```typescript
import { CISOOrchestrator } from './src/ciso-orchestrator.js';

const orch = new CISOOrchestrator('my-org');

const report = await orch.runSecurityPostureReview({
  orgProfile: {
    industry: 'healthcare',
    criticalAssets: ['ehr-system', 'patient-portal', 'lab-results-api'],
    cloudProvider: 'AWS',
  },
  frameworks: ['HIPAA', 'NIST-CSF', 'CIS-Controls'],
  zeroTrustPosture: {
    mfaEnforced: true,
    deviceCompliance: false,
    encryptedInTransit: true,
    encryptedAtRest: true,
    microsegmentation: false,
    privilegedAccessManagement: false,
    siem: true,
    edr: false,
  },
  pipelinePosture: {
    hasSAST: true,
    hasDAST: false,
    hasSecretsScanning: false,
    hasBranchProtection: true,
    hasSBOM: false,
    hasContainerScanning: false,
  },
});

console.log(`Score: ${report.overallScore}/100`);
console.log(`Maturity: ${report.maturityLevel}/5`);
console.log(report.executiveSummary);
```

#### Risk Assessment Only

```typescript
const risks = orch.runRiskAssessment([
  { title: 'Ransomware Attack', description: 'Ransomware targeting EHR backup systems',
    category: 'operational', likelihood: 4, impact: 5 },
  { title: 'PHI Data Breach', description: 'Exfiltration of patient health information',
    category: 'compliance', likelihood: 3, impact: 5 },
]);

console.table(risks.map(r => ({
  title: r.title, severity: r.severity, score: r.riskScore, treatment: r.treatment
})));
```

#### Compliance Gap Analysis

```typescript
const gap = orch.runComplianceGapAnalysis('HIPAA', {
  'Security Management Process': { status: 'compliant', evidence: 'Risk analysis documented' },
  'Audit Controls': { status: 'partial', gaps: ['Audit log retention < 6 years'] },
  'Transmission Security': { status: 'compliant', evidence: 'TLS 1.3 enforced' },
});

console.log(`HIPAA Score: ${gap.complianceScore.toFixed(1)}%`);
console.log(`Critical gaps: ${gap.criticalGaps.length}`);
```

#### Vulnerability Triage

```typescript
const vulns = orch.runVulnerabilityTriage([
  { cveId: 'CVE-2024-1234', title: 'Critical RCE in OpenSSL', cvssScore: 9.8,
    epssScore: 0.94, affectedAssets: ['ehr-api'], exploitAvailable: true,
    exploitedInWild: true, patchAvailable: true },
]);

// exploitedInWild → 7-day patch deadline (CISA KEV rule)
console.log(vulns[0].patchDeadlineDays); // 7
```

#### AI Security Assessment

```typescript
const findings = orch.assessAISystem({
  name: 'Clinical Decision Support AI',
  type: 'ml-model',
  deployment: 'self-hosted',
  dataClasses: ['PHI', 'clinical-notes'],
  internetFacing: false,
  usesExternalModels: false,
  hasAgentCapabilities: false,
  hasRAG: true,
  trainingDataSource: 'internal',
  humanOversight: 'full',
  regulatoryScope: ['HIPAA', 'EU-AI-ACT-HIGH-RISK'],
});

findings.forEach(f => console.log(`[${f.severity}] ${f.title}: ${f.description}`));
```

---

### Mode 5: MCP Tools

When the CISO swarm is registered with Ruflo or another MCP server, tools are available directly as Claude tool calls. See `examples/collection-integration.ts` for wiring instructions.

Available tools: `ciso_security_posture_review`, `ciso_risk_assessment`, `ciso_compliance_gap_analysis`, `ciso_threat_modeling`, `ciso_incident_playbook`, `ciso_vulnerability_triage`, `ciso_devsecops_audit`, `ciso_ai_system_assessment`, `ciso_ai_governance_assessment`, `ciso_swarm_status`, and 10 more in `src/mcp-tools.ts`.

---

## Agent Reference

| Agent | When to Invoke | Key Outputs |
|-------|---------------|-------------|
| `ciso-queen` | Full posture review, multi-domain assessment | SecurityPostureReport (score, risks, compliance, roadmap) |
| `ciso-risk-governance` | Risk register, treatment plans | Risk register table, roadmap |
| `ciso-compliance-audit` | Compliance gap analysis | Compliance score per framework, critical gaps, remediation |
| `ciso-threat-intelligence` | Threat modeling, landscape briefing | MITRE ATT&CK scenarios, actor profiles, detection gaps |
| `ciso-security-architecture` | Zero trust assessment, IAM review, cloud review | Control gap table, IAM findings, cloud checklist |
| `ciso-incident-response` | Active IR, playbook preparation, tabletop | Playbook with phases/steps, comms plan, legal checklist |
| `ciso-vulnerability-management` | CVE triage, patch planning | Prioritised vuln list, 4-wave patch plan |
| `ciso-devsecops` | Pipeline audit, shift-left review | 12-control findings, secure pipeline YAML template |
| `ciso-security-awareness` | Training programme, phishing planning | Module plan, phishing campaign, 8-metric KPI dashboard |
| `ciso-ai-security` | LLM/ML security, AI governance, shadow AI | OWASP LLM findings, governance gaps, red team plan |

---

## Skill Reference

| Skill | Activation Triggers | Use Case |
|-------|--------------------|-|
| `ciso-posture-review` | "full security review", "posture assessment", "board security report", `/ciso-posture-review` | Comprehensive org-level security assessment |
| `ciso-ai-security` | "LLM security", "AI assessment", "OWASP LLM", "shadow AI", "AI governance" | Assessing any AI/ML system |
| `ciso-threat-model` | "threat model", "MITRE ATT&CK", "threat scenario", "threat landscape" | Architecture review, new system threat modeling |
| `ciso-incident-response` | "ransomware", "data breach", "incident", "IR playbook", "tabletop" | Active IR or preparation |

---

## Best Practices

1. **Provide context** — the more context you give (industry, assets, compliance scope, existing controls), the more accurate and tailored the output
2. **Run specialists independently** for focused tasks rather than always running the full posture review
3. **Use the TypeScript API** for integration into existing security toolchains or CI/CD pipelines
4. **Combine with real scan data** — feed actual CVE scan output or compliance evidence into the orchestrator for precise gap analysis
5. **Verify AI system assessments** — AI security findings should be cross-checked against actual model capabilities before reporting to stakeholders
6. **Authorization** — always obtain written authorization before using any findings or recommendations against systems you don't own

---

[Back to README](README.md)
