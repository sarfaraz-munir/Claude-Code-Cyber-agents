# CISO Agents — Cybersecurity Swarm for Claude Code

A production-ready hierarchical swarm of 10 AI agents (1 CISO queen orchestrator + 9 specialist workers) built for Claude Code. Covers the full enterprise CISO skill set: risk governance, compliance audit, threat intelligence, security architecture, incident response, vulnerability management, DevSecOps, security awareness, and AI security.


## Key Features

This repo provides structured agent files, skill files, a slash command, and 20 MCP tools that activate contextually based on security domain. Each agent contains domain expertise, methodology, frameworks, and output templates for consistent, professional-grade security deliverables.

- **Hierarchical orchestration** — CISO queen spawns all 9 specialists in parallel and synthesises a unified `SecurityPostureReport`
- **Full CISO skill set** — risk, compliance, threat intelligence, architecture, IR, vuln-mgmt, DevSecOps, awareness, and AI/LLM security
- **Multiple integration modes** — Claude Code agents (cowork), skill files, `/ciso-posture-review` command, and 20 MCP tools
- **AI security coverage** — OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF 1.0, EU AI Act 2024, ISO/IEC 42001, shadow AI inventory
- **Standards-based** — MITRE ATT&CK, CVSS v3.1, EPSS, CISA KEV, NIST CSF, SOC2, ISO-27001, GDPR, PCI-DSS, CIS Controls
- **TypeScript API** — `CISOOrchestrator` class usable standalone with zero external dependencies
- **21 tests passing** — full unit test coverage, standalone (no monorepo required)

## CISO Cyber Agents Architecture

<div align="center">
    <img src="assets/agentarchitecture%20.png" alt="CISO Agents Architecture" width="900">
  </div>

```
┌─────────────────────────────────────────────────────┐
│                   CISO Queen                        │
│         (ciso-queen — orchestrator)                 │
│   Topology: hierarchical  │  Consensus: raft        │
└──────────────────┬──────────────────────────────────┘
                   │ delegates in parallel
       ┌───────────┼───────────┐───────────┐
       ▼           ▼           ▼           ▼
 risk-governance  compliance  threat-intel  security-arch
 vuln-management  devsecops   incident-response
 security-awareness            ai-security
```

## Agent Coverage

| # | Agent | Domain | Key Frameworks |
|---|-------|--------|----------------|
| 1 | `ciso-queen` | Orchestration | Hierarchical swarm, raft consensus |
| 2 | `ciso-risk-governance` | Risk Management | CVSS v3.1, FAIR, risk registers |
| 3 | `ciso-compliance-audit` | Compliance | SOC2-TypeII, ISO-27001, NIST-CSF, GDPR, HIPAA, PCI-DSS, CIS Controls |
| 4 | `ciso-threat-intelligence` | Threat Intel | MITRE ATT&CK (14 tactics, 200+ techniques), APT profiling |
| 5 | `ciso-security-architecture` | Architecture | NIST SP 800-207 Zero Trust, IAM, cloud posture |
| 6 | `ciso-incident-response` | IR / DFIR | NIST SP 800-61, ransomware, data-breach, insider-threat playbooks |
| 7 | `ciso-vulnerability-management` | Vuln Mgmt | CVSS+EPSS triage, CISA KEV, 4-wave patch plans |
| 8 | `ciso-devsecops` | DevSecOps | SAST, DAST, SBOM, secrets scanning, 12-control pipeline audit |
| 9 | `ciso-security-awareness` | Awareness | 6 training modules, phishing sims, 8-metric KPI dashboard |
| 10 | `ciso-ai-security` | AI Security | OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF 1.0, EU AI Act 2024 |

## Skill Coverage

| Skill | Invocation | What It Does |
|-------|-----------|--------------|
| `ciso-posture-review` | `/ciso-posture-review` | Full enterprise posture review — all 9 specialists in parallel |
| `ciso-ai-security` | Load skill | AI/LLM threat assessment + governance gap analysis |
| `ciso-threat-model` | Load skill | MITRE ATT&CK–mapped threat scenarios per asset |
| `ciso-incident-response` | Load skill | IR playbooks, tabletop exercises, DFIR checklists |

## MCP Tools

20 MCP tools exposed for use in Claude Code and MCP-compatible clients:

| Tool | Description |
|------|-------------|
| `ciso_security_posture_review` | Full posture review — delegates to all 9 specialists |
| `ciso_risk_assessment` | Build risk register with CVSS scoring and treatment |
| `ciso_compliance_gap_analysis` | Gap analysis for any supported compliance framework |
| `ciso_threat_modeling` | MITRE ATT&CK–mapped threat scenario construction |
| `ciso_incident_playbook` | Fetch IR playbook (ransomware / data-breach / insider-threat) |
| `ciso_vulnerability_triage` | CVSS+EPSS triage with CISA KEV patch deadline assignment |
| `ciso_devsecops_audit` | 12-control CI/CD pipeline security audit |
| `ciso_ai_system_assessment` | OWASP LLM Top 10 assessment for an AI system |
| `ciso_ai_governance_assessment` | AI governance gaps (NIST AI RMF / EU AI Act / ISO-42001) |
| `ciso_swarm_status` | Query live swarm agent states |
| + 10 more | (see `src/mcp-tools.ts` for full list) |

## Installation

### Option 1 — Claude Code Agents & Skills (recommended)

```bash
git clone https://github.com/sarfarazmunir/CISO-agents.git
cd CISO-agents

# Global — available in all Claude Code sessions
cp -r .claude/agents/ciso ~/.claude/agents/
cp -r .claude/skills/ciso-* ~/.claude/skills/
cp .claude/commands/ciso-posture-review.md ~/.claude/commands/

# Or project-scoped — available only in this project
cp -r .claude/agents/ciso /your/project/.claude/agents/
cp -r .claude/skills/ciso-* /your/project/.claude/skills/
```

### Option 2 — TypeScript API

```bash
git clone https://github.com/sarfarazmunir/CISO-agents.git
cd CISO-agents
npm install
```

```typescript
import { CISOOrchestrator } from './src/ciso-orchestrator.js';

const orch = new CISOOrchestrator('my-org');
const report = await orch.runSecurityPostureReview({
  orgProfile: { industry: 'fintech', criticalAssets: ['payment-api'] },
  frameworks: ['SOC2-TypeII', 'PCI-DSS'],
});
console.log(report.executiveSummary);
```

### Option 3 — Symlinked (for contributors)

```bash
git clone https://github.com/sarfarazmunir/CISO-agents.git
cd CISO-agents

ln -s "$(pwd)/.claude/agents/ciso" ~/.claude/agents/ciso
ln -s "$(pwd)/.claude/skills/ciso-posture-review" ~/.claude/skills/ciso-posture-review
ln -s "$(pwd)/.claude/skills/ciso-ai-security" ~/.claude/skills/ciso-ai-security
ln -s "$(pwd)/.claude/skills/ciso-threat-model" ~/.claude/skills/ciso-threat-model
ln -s "$(pwd)/.claude/skills/ciso-incident-response" ~/.claude/skills/ciso-incident-response
```

See [INSTALL.md](INSTALL.md) for platform-specific instructions and verification steps.

## Quick Start

### Full security posture review (Claude Code agent cowork)

In any Claude Code session with the agents installed:

```
Use ciso-queen to run a full security posture review for a fintech company.
Critical assets: payment-api, customer-db, auth-service.
Compliance: SOC2-TypeII and PCI-DSS.
The CI/CD pipeline has SAST and branch protection but no secrets scanning or container scanning.
We deploy on AWS. MFA is enforced but we have no SIEM or EDR.
We have a customer-facing LLM chatbot integrated with GPT-4 via API.
```

### Slash command

```
/ciso-posture-review 
```

### TypeScript API

```bash
npx tsx examples/collection-integration.ts
```

See [USAGE.md](USAGE.md) for detailed usage patterns and examples for every agent and skill.

## Requirements

- **Claude Code** — latest version (`claude --version`)
- **Node.js** — 20.x or higher (for TypeScript API only)
- **npm** — 9.x or higher (for TypeScript API only)
- **Git** — 2.x or higher

No external security tools required. All agents and skills operate via Claude's reasoning capabilities and the TypeScript orchestrator's built-in domain knowledge.

## Testing

```bash
npm install
npm test
# 21 tests passing across 3 suites:
#   CISOSwarmPlugin (2), CISOOrchestrator (10), AISecurityAgent (9)
```

## Repository Structure

```
CISO-agents/
├── src/                          # TypeScript orchestrator source
│   ├── agents/                   # 9 specialist agent classes
│   ├── ciso-orchestrator.ts      # Queen — coordinates all agents
│   ├── mcp-tools.ts              # 20 MCP tool definitions
│   ├── types.ts                  # Shared type definitions
│   ├── plugin.ts                 # ClaudeFlow plugin wrapper
│   └── index.ts                  # Public exports
├── __tests__/                    # 21-test suite
├── .claude/
│   ├── agents/ciso/              # 10 Claude Code agent files
│   ├── skills/                   # 4 CISO skill files
│   └── commands/                 # /ciso-posture-review command
└── examples/                     # Usage examples
```

## Legal Notice

This swarm is intended for **authorized security testing, research, and educational purposes only**. Before using any capability against systems you do not own, you must obtain written authorization from the system owner.

See [SECURITY.md](SECURITY.md) for the full responsible use policy.

## License

[MIT](LICENSE) © 2026 Sarfaraz Muneer
