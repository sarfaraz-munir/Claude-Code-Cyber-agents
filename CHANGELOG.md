# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] — 2025-06-14

### Initial Release — CISO Agents Swarm

Production-ready hierarchical cybersecurity swarm with a CISO queen orchestrator and 9 specialist AI agents, built for Claude Code.

#### Added

**Core Swarm**
- `CISOOrchestrator` — hierarchical queen that delegates to all 9 specialists concurrently and synthesises a unified `SecurityPostureReport`
- `runSecurityPostureReview()` — full posture review: risk register, compliance reports, threat scenarios, recommendations, KPIs, and 4-quarter roadmap
- Swarm topology: hierarchical with raft consensus, mirroring Ruflo's `UnifiedSwarmCoordinator` (ADR-003)
- 20 MCP tool definitions in `src/mcp-tools.ts` for Claude Code and MCP-compatible clients

**Specialist Agents (9 workers)**
- `RiskGovernanceAgent` — risk registers using likelihood × impact scoring (CVSS/FAIR), treatment assignment, severity thresholds (critical ≥20, high ≥15, medium ≥9, low ≥4), roadmap deadlines (30d/90d/180d)
- `ComplianceAuditAgent` — full control catalogues for SOC2-TypeII, ISO-27001, NIST-CSF, GDPR, HIPAA, PCI-DSS, and CIS-Controls; gap analysis with compliance scoring formula
- `ThreatIntelligenceAgent` — MITRE ATT&CK catalogue (10 tactics, 30+ techniques), 4 APT actor profiles, threat scenario construction, `buildThreatLandscapeBriefing()`
- `SecurityArchitectureAgent` — 10-domain zero trust assessment (NIST SP 800-207), IAM design review, cloud security checklists (AWS/GCP/Azure), architecture remediations
- `IncidentResponseAgent` — 3 built-in playbooks (ransomware 10 steps, data-breach 6 steps, insider-threat 5 steps), tabletop exercise generator, `buildCustomPlaybook()`
- `VulnerabilityManagementAgent` — CVSS+EPSS triage, CISA KEV detection (7d deadline), exploit-aware patch waves (7d/14d/30d/60d/90d), `buildPatchPlan()` with 4 waves
- `DevSecOpsAgent` — 12-control pipeline audit (SAST/DAST/SBOM/secrets/container/IaC/branch-protection/PR-review/signed-commits/license/security-tests), secure CI/CD template
- `SecurityAwarenessAgent` — 6 training modules (Fundamentals/Phishing/Secure Dev/Privileged/Data Protection/AI-GenAI), 4 phishing simulation templates, 8-metric KPI dashboard
- `AISecurityAgent` — OWASP LLM Top 10 (LLM01–LLM10) threat assessment, MITRE ATLAS adversarial ML techniques, NIST AI RMF 1.0 / EU AI Act 2024 / ISO-42001 governance gap analysis, AI red team plans, shadow AI inventory (6 categories)

**Claude Code Integration**
- 10 agent files in `.claude/agents/ciso/` — CISO queen + 9 specialists with system prompts, domain expertise, and output templates
- 4 skill files in `.claude/skills/` — `ciso-posture-review`, `ciso-ai-security`, `ciso-threat-model`, `ciso-incident-response`
- `/ciso-posture-review` slash command in `.claude/commands/`

**Type System**
- `CISOAgentRole` union (10 roles), `RiskEntry`, `RiskSeverity`, `ComplianceFramework`, `ComplianceControl`, `ComplianceReport`, `ThreatActor`, `ThreatScenario`, `IncidentPlaybook`, `PlaybookStep`, `Vulnerability`, `SecurityPostureReport`, `RemediationItem`, `SecurityKPI`, `RoadmapItem`
- `AISystemProfile`, `AISecurityFinding`, `AIRedTeamPlan`, `AIShadowInventory` for AI security domain

**Testing**
- 21 tests passing across 3 suites: `CISOSwarmPlugin` (2), `CISOOrchestrator` (10), `AISecurityAgent` (9)
- Standalone test setup — no monorepo or workspace dependencies

**Documentation**
- `README.md` — overview, architecture diagram, agent table, skill table, MCP tool table, quick start, installation
- `INSTALL.md` — 4 installation methods (global, project-scoped, TypeScript API, symlinked), platform notes, verification, uninstall
- `USAGE.md` — 5 activation modes, agent reference, skill reference, TypeScript API examples, best practices
- `CONTRIBUTING.md` — agent template, skill template, TypeScript standards, PR process
- `CHANGELOG.md` — this file
- `SECURITY.md` — vulnerability reporting SLAs, responsible use policy, authorized/prohibited use cases
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `LICENSE` — MIT
- `examples/collection-integration.ts` — how to wire into `@claude-flow/plugins`

---

[1.0.0]: https://github.com/sarfarazmunir/CISO-agents/releases/tag/v1.0.0
