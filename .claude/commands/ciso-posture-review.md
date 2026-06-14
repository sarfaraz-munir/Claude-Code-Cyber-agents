---
name: ciso-posture-review
description: Run a full CISO security posture review using the 10-agent CISO swarm (queen + 9 specialists). Accepts optional arguments for industry, frameworks, and scope.
---

# CISO Security Posture Review

Run a comprehensive security posture review using the CISO swarm.

## Usage

```
/ciso-posture-review [scope]
```

Examples:
- `/ciso-posture-review` — full review, gather context interactively
- `/ciso-posture-review Ruflo v3 platform` — scoped to Ruflo
- `/ciso-posture-review --frameworks NIST-CSF,SOC2-TypeII --industry fintech`

## What Happens

1. Context collection (industry, assets, CI/CD posture, AI systems, compliance needs)
2. Parallel delegation to all 9 CISO specialist subagents:
   - ciso-risk-governance → risk register + roadmap
   - ciso-compliance-audit → gap analysis per framework
   - ciso-threat-intelligence → MITRE ATT&CK threat scenarios
   - ciso-security-architecture → zero trust + IAM + cloud posture
   - ciso-incident-response → IR playbooks for top threats
   - ciso-vulnerability-management → CVE triage + patch waves
   - ciso-devsecops → pipeline security audit
   - ciso-security-awareness → training programme assessment
   - ciso-ai-security → OWASP LLM Top 10 + governance gaps
3. Synthesis into a unified SecurityPostureReport

## Arguments (optional)

$ARGUMENTS — pass scope, org name, or flags like `--industry fintech --frameworks SOC2-TypeII,GDPR`

## Execution

Use the `ciso-posture-review` skill by invoking the ciso-queen agent with full context.
Spawn all 9 specialist subagents in parallel, collect outputs, and synthesise the report.

The review covers:
- Risk register with CVSS scoring
- Compliance gap analysis
- Threat landscape with MITRE ATT&CK mapping
- Zero trust maturity assessment
- IR playbook recommendations
- Vulnerability patch wave plan
- DevSecOps pipeline findings
- Security awareness programme gaps
- AI/LLM security findings (OWASP LLM Top 10)
