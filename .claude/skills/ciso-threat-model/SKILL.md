---
name: "CISO Threat Modeling"
description: "Build MITRE ATT&CK-mapped threat scenarios for specific assets or systems. Produces threat actors, techniques, detection controls, and mitigation recommendations. Use for architecture reviews, new system threat modeling, or threat landscape briefings."
---

# CISO Threat Modeling

Delegates to **ciso-threat-intelligence** for MITRE ATT&CK-mapped threat analysis.

## What This Skill Does

- Maps attack vectors to MITRE ATT&CK techniques
- Profiles relevant threat actors (APT groups, financially motivated, insider)
- Builds complete threat scenarios with detection and mitigation controls
- Produces threat landscape briefings per industry

## Required Inputs

- **Scope** — system name, asset list, or "full org"
- **Industry** — for actor profiling
- **Attack surface** — internet-facing? cloud? on-prem? insider risk?
- **Known symptoms/alerts** — any existing IOCs or suspicious activity?

## Execution Pattern

```
Agent(ciso-threat-intelligence, "Build threat model for:
  Assets: [list]
  Industry: [industry]
  Attack Surface: [surface description]
  Known IOCs/Symptoms: [any]
  
  Output: top 5 threat scenarios with MITRE mapping, actor profiles,
  detection controls, mitigation recommendations, and industry briefing"
)
```

## Output Structure

```
THREAT LANDSCAPE BRIEFING: [Org/System]

TOP THREAT ACTORS
[Actor] | [Type] | [Motivation] | [Sophistication] | [Relevant TTPs]

THREAT SCENARIOS
THREAT-01: [Title]
  Actor: [name/type]
  MITRE Techniques: [T#### list]
  Attack Vector: [vector]
  Affected Assets: [list]
  Likelihood: [severity]  Impact: [severity]
  Detection Controls: [list]
  Mitigation Controls: [list]

[repeat for each scenario]

DETECTION COVERAGE GAPS
[gap] — [recommended tool/control]
```
