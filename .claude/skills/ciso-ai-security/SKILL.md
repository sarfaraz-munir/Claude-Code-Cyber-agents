---
name: "CISO AI Security Assessment"
description: "Assess AI/LLM systems against OWASP LLM Top 10 and MITRE ATLAS. Evaluate AI governance against NIST AI RMF 1.0, EU AI Act 2024, and ISO/IEC 42001. Build AI red team plans and shadow AI inventory. Use whenever an AI system, LLM integration, or agentic workflow needs security review."
---

# CISO AI Security Assessment

Delegates to the **ciso-ai-security** specialist agent for focused AI/ML security analysis.

## What This Skill Does

- OWASP LLM Top 10 threat assessment per AI system
- MITRE ATLAS adversarial technique mapping
- AI governance gap analysis (NIST AI RMF / EU AI Act / ISO-42001)
- AI red team plan generation
- Shadow AI inventory with risk ratings

## Required Inputs

For each AI system under assessment:
- **Name** — what is the system called?
- **Type** — llm | ml-model | agent-system | recommendation-engine
- **Deployment** — saas-api | self-hosted | cloud-managed | on-premise
- **Data classes** — PII? Financial? Health? Confidential IP?
- **Internet-facing?** — yes/no
- **Uses external models?** — OpenAI, Anthropic, etc.?
- **Agentic capabilities?** — can it take actions, call tools, browse the web?
- **RAG?** — retrieval-augmented generation?
- **Human oversight** — full | partial | none
- **Regulatory scope** — GDPR, EU-AI-Act-High-Risk, HIPAA, etc.?

## Execution Pattern

```
Agent(ciso-ai-security, "Assess [system name]:
  type: [type]
  deployment: [deployment]
  dataClasses: [list]
  internetFacing: [bool]
  usesExternalModels: [bool]
  hasAgentCapabilities: [bool]
  hasRAG: [bool]
  humanOversight: [level]
  regulatoryScope: [list]
  
  Produce: threat findings, governance gaps, red team plan, shadow AI inventory"
)
```

## Critical Findings to Flag

- Prompt injection on internet-facing systems → always **critical**
- Sensitive data disclosure with PII → **critical**
- Excessive agency without human oversight → **critical**
- No AI governance policy → **high** (EU AI Act compliance risk)
- Shadow AI in browser extensions → **critical**

## Output Structure

```
AI SECURITY ASSESSMENT: [System Name]

THREAT FINDINGS (OWASP LLM Top 10)
[ID] | [Threat] | [Severity] | [Evidence] | [Controls] | [Regulatory Impact]

AI GOVERNANCE GAPS
[Control] | [Status] | [Framework] | [Priority] | [Remediation]

RED TEAM PLAN
Objectives: [list]
Attack Categories:
  [Category] — [Techniques] — [Success Criteria]
Safety Constraints: [list]
Reporting Requirements: [list]

SHADOW AI INVENTORY
[Category] | [Risk] | [Data Exposure] | [Controls Required]
```
