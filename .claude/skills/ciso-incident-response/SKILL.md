---
name: "CISO Incident Response"
description: "Generate IR playbooks, tabletop exercise scenarios, and DFIR checklists for ransomware, data breach, insider threat, BEC, and DDoS incidents. Use when responding to or preparing for security incidents."
---

# CISO Incident Response

Delegates to **ciso-incident-response** for IR planning and active incident support.

## What This Skill Does

- Retrieves pre-built playbooks for common incident types
- Builds custom playbooks for specific scenarios
- Designs tabletop exercise scenarios
- Produces communication plans and legal consideration checklists

## Built-in Playbook Types

| Type | Description |
|------|-------------|
| `ransomware` | Isolation → backup validation → decryption → comms → LE notification |
| `data-breach` | Scope → legal (72h GDPR) → regulatory → customer comms → remediation |
| `insider-threat` | HR coordination → evidence preservation → access revocation → investigation |
| `bec-phishing` | Email quarantine → credential reset → financial fraud containment |
| `ddos` | Scrubbing → ISP → failover → capacity scaling |

## Required Inputs

- **Incident type** — one of the above or describe a custom scenario
- **Severity** — critical / high / medium / low
- **Affected systems** — what's impacted?
- **Current status** — active incident or preparation/tabletop?

## Execution Pattern

```
Agent(ciso-incident-response, "Generate [type] playbook:
  Severity: [severity]
  Affected Systems: [list]
  Mode: [active-response | tabletop-preparation | plan-review]
  Special considerations: [regulatory requirements, business context]
  
  Output: full playbook with steps, communication plan, legal checklist"
)
```

## Output Structure

```
INCIDENT PLAYBOOK: [Type] — [Severity]
ID: [id]   Created: [date]

COMMUNICATION PLAN
[who to notify, when, via what channel]

LEGAL CONSIDERATIONS
[notification obligations, evidence preservation, law enforcement]

RESPONSE STEPS
Phase | Order | Action | Responsible | Timeframe | Tools | Escalation

TABLETOP EXERCISE (if requested)
Objectives: [list]
Injects:
  T+0: [initial scenario]
  T+[n]: [inject description]  Discussion: [questions]
Debrief Guide: [key lessons to extract]
```
