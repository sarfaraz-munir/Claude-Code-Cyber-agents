# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

---

## Reporting a Vulnerability in This Project

If you discover a vulnerability in this project's source code or configuration files, **do NOT open a public issue**.

Please report it privately through one of:

1. **GitHub Security Advisories** — [Submit a private report](https://github.com/sarfarazmunir/CISO-agents/security/advisories/new)
2. **Email** — sarfaraz.munir@gmail.com with subject line `[SECURITY] CISO-agents`

### Information to Include

- A clear description of the issue
- The affected file(s) and line numbers
- Steps to reproduce the behaviour
- The potential impact on users of this project
- A suggested remediation if you have one

### Response Commitments

| Stage | Target timeframe |
|-------|-----------------|
| Acknowledgement | Within 48 hours |
| Initial triage | Within 7 days |
| Patch — critical severity | Within 30 days |
| Patch — medium or low severity | Within 90 days |

---

## Intended Use

This project provides a cybersecurity assessment framework designed for **defensive security operations, authorized internal assessments, research, and education**.

The swarm agents produce risk registers, compliance gap reports, threat models, IR playbooks, vulnerability triage, and AI governance assessments. All outputs are advisory and intended to help security teams improve their organisation's defensive posture.

### Supported Use Cases

- Internal security posture reviews conducted by an organisation's own security team
- Compliance gap analysis against SOC2, ISO-27001, NIST CSF, GDPR, HIPAA, PCI-DSS, and CIS Controls
- Risk register construction and board-level reporting
- IR planning: playbook development and tabletop exercise design
- Vulnerability triage and patch prioritisation for assets you are responsible for
- AI/ML system security assessments for systems your organisation owns or operates
- Security awareness programme design
- CTF competitions and academic security research in controlled environments
- Penetration testing engagements where written authorisation has been obtained from the asset owner

### Requirements for All Users

Before applying any output from this swarm to a system or environment:

1. Confirm you have the authority or explicit written permission to assess that system
2. Stay within the scope defined by your organisation or your client's Rules of Engagement
3. Follow responsible disclosure practices for any vulnerabilities identified
4. Comply with applicable laws and regulations in your jurisdiction

### Out-of-Scope Uses

This project is not designed for and should not be used to assist with:

- Assessing systems without the knowledge and consent of the owner
- Generating content intended to cause harm to individuals or organisations
- Circumventing the acceptable use policies of AI model providers
- Any activity that violates applicable law

---

## Project Scope

This security policy covers:

- TypeScript source code and agent classes in `src/`
- Claude Code agent files in `.claude/agents/`
- Skill and command files in `.claude/skills/` and `.claude/commands/`
- MCP tool definitions in `src/mcp-tools.ts`

It does not cover third-party services, tools referenced in documentation, or modifications made by users after installation.

---

## AI Security Assessment Guidance

The `AISecurityAgent` produces advisory findings based on the system profile you provide. Before sharing findings with stakeholders:

- Validate findings against the actual capabilities and configuration of the system under review
- Red team plans from `buildAIRedTeamPlan()` require explicit written authorisation from the AI system owner before any testing activity begins
- Shadow AI inventory output describes general risk categories — it is not a live discovery scan of your environment

---

## Disclosure Credits

Security researchers who responsibly report vulnerabilities in this project will be credited in the release notes, unless they prefer to remain anonymous.

---

[Back to README](README.md)
