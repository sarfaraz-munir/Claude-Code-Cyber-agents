---
name: "CISO Security Posture Review"
description: "Full enterprise security posture review using the CISO swarm (10 agents: queen + 9 specialists). Covers risk, compliance, threats, architecture, IR, vuln-mgmt, DevSecOps, awareness, and AI security. Use for comprehensive security assessments, board reporting, or pre-audit preparation."
---

# CISO Security Posture Review

Orchestrates all 9 CISO specialist agents in parallel and synthesises a unified SecurityPostureReport.

## What This Skill Does

1. Collects org context (industry, critical assets, frameworks, CI/CD posture, AI systems)
2. Spawns all 9 specialist subagents concurrently via the Agent tool (subagent_type matches agent names)
3. Synthesises outputs into: executive summary, risk register, compliance scores, recommendations, roadmap, KPIs

## Required Inputs

Ask the user for (or infer from context):
- **Industry** — e.g. fintech, healthcare, technology, retail
- **Critical assets** — e.g. payment-api, customer-db, auth-service
- **Compliance frameworks** — e.g. SOC2-TypeII, NIST-CSF, GDPR, PCI-DSS
- **Zero trust posture** — MFA enforced? SIEM? EDR? Encryption at rest/transit?
- **CI/CD posture** — SAST? Secrets scanning? Branch protection? Container scanning?
- **AI systems deployed** — Any LLMs, ML models, or AI-powered tools?

## Execution Pattern

```
Phase 1 — Gather context (1 agent or direct questions)

Phase 2 — Parallel specialist delegation:
  Agent(ciso-risk-governance,        "Build risk register for [org context]")
  Agent(ciso-compliance-audit,       "Gap analysis: [frameworks] for [org]")
  Agent(ciso-threat-intelligence,    "Threat model for [assets] in [industry]")
  Agent(ciso-security-architecture,  "Zero trust assessment: [posture details]")
  Agent(ciso-incident-response,      "IR playbooks for [top 3 threat scenarios]")
  Agent(ciso-vulnerability-management, "Patch plan for [known CVEs or typical exposure]")
  Agent(ciso-devsecops,              "Pipeline audit: [CI/CD posture details]")
  Agent(ciso-security-awareness,     "Programme assessment for [industry/org size]")
  Agent(ciso-ai-security,            "AI assessment for [AI systems deployed]")

Phase 3 — Synthesise into unified report
```

## Output Structure

```
═══════════════════════════════════════════════
CISO SECURITY POSTURE REPORT
Generated: [date]
═══════════════════════════════════════════════

EXECUTIVE SUMMARY
[3-5 sentences, board-level language]

OVERALL SCORE: [n]/100   MATURITY: [n]/5

RISK REGISTER
[table: severity-sorted, deduplicated]

COMPLIANCE SCORES
[table: framework | score% | critical gaps]

TOP 10 RECOMMENDATIONS
[numbered, priority-ordered with owner and deadline]

ROADMAP
[Q1-Q4 initiatives with cost and expected outcome]

KEY SECURITY KPIs
[8 metrics with current/target/trend]
```

## Ruflo TypeScript API

The CISO orchestrator is also available programmatically:

```bash
npx tsx -e "
import { CISOOrchestrator } from './v3/@claude-flow/plugin-ciso-swarm/src/ciso-orchestrator.js';
const orch = new CISOOrchestrator('ruflo');
const report = await orch.runSecurityPostureReview({
  orgProfile: { industry: 'technology', criticalAssets: ['mcp-bridge', 'agent-orchestration'] },
  frameworks: ['NIST-CSF', 'SOC2-TypeII'],
  zeroTrustPosture: { encryptedInTransit: true, hasBranchProtection: true },
});
console.log(report.executiveSummary);
"
```
