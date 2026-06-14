# Contributing Guide

Thank you for your interest in contributing to the **CISO Agents Swarm**.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Adding a New Agent](#adding-a-new-agent)
- [Improving Existing Agents](#improving-existing-agents)
- [Adding or Updating Skills](#adding-or-updating-skills)
- [TypeScript Standards](#typescript-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## How to Contribute

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/CISO-agents.git`
3. **Create a branch**: `git checkout -b feature/my-improvement`
4. **Make your changes** following the standards below
5. **Run tests**: `npm test` (all 21 must pass, plus any new ones you add)
6. **Submit a Pull Request**

---

## Adding a New Agent

### Directory Structure

```
.claude/agents/ciso/
└── ciso-<domain>.md          # Required — agent system prompt file
```

Optionally add an example under:

```
examples/agents/
└── ciso-<domain>/
    └── example_usage.md      # Example prompts and expected outputs
```

### Agent File Template

Every agent file must follow this structure:

```markdown
---
name: ciso-<domain>
description: One-line description of when to invoke this agent and what it specialises in.
---

You are the <Domain> specialist in the Ruflo CISO swarm.

## Your Domain

[Bullet list of capabilities this agent covers]

## Key Frameworks / Standards

[List the standards, frameworks, or scoring systems this agent uses]

## Methodology

[Step-by-step process the agent follows, with scoring rules, thresholds, or decision criteria]

## Output Format

[Exact format the agent uses for its output — tables, code blocks, sections]
```

### Requirements

- The `description` frontmatter must clearly state when Claude Code should choose this agent over others
- Include explicit scoring/thresholds wherever quantitative judgement is applied (e.g., risk scores, compliance percentages, CVSS thresholds)
- Output format section must show exactly what structured output the agent produces
- Register the new agent in `CISOOrchestrator` (`src/ciso-orchestrator.ts`) and add it to `getAgentTypes()` in `src/plugin.ts`
- Add a corresponding TypeScript agent class in `src/agents/ciso-<domain>.ts`
- Add tests in `__tests__/ciso-swarm.test.ts`

---

## Improving Existing Agents

Focus areas where contributions are most valuable:

- **Framework updates** — new compliance controls, updated MITRE ATT&CK techniques, OWASP revisions
- **Methodology improvements** — better scoring formulas, additional decision criteria, new output templates
- **Domain expansion** — adding new threat actors to threat intelligence, new incident playbook types, additional cloud providers
- **Output template refinement** — clearer formatting, additional fields, executive-ready language

Do NOT:
- Remove the output format section from any agent
- Reduce domain coverage without discussion
- Change scoring thresholds without updating corresponding tests

---

## Adding or Updating Skills

### Skill File Template (v2.0 Format)

```markdown
---
name: "CISO Skill Name"
description: "One-line description. Use for X when Y."
---

# CISO Skill Name

## What This Skill Does

[2-3 sentences describing the skill's purpose and what it produces]

## Required Inputs

[Bullet list of what context Claude should gather before delegating to agents]

## Execution Pattern

\`\`\`
Phase 1 — [Preparation step]

Phase 2 — Parallel delegation:
  Agent(ciso-<agent-1>, "Prompt with [context placeholders]")
  Agent(ciso-<agent-2>, "Prompt with [context placeholders]")
  [...]

Phase 3 — Synthesise into [output type]
\`\`\`

## Output Structure

\`\`\`
[Exact output format with section headers and field names]
\`\`\`

## [Optional] TypeScript API

[Show the equivalent TypeScript API call for programmatic use]
```

---

## TypeScript Standards

### Language Requirements

- **TypeScript** — strict mode enforced via `tsconfig.json`
- **ESM modules** — `"type": "module"` in `package.json`, use `.js` extensions in import paths
- **Node.js 20+** minimum

### Code Style

- No external runtime dependencies — the orchestrator and all agents must work with zero `npm install` beyond `devDependencies`
- Type hints on all public method signatures
- No `any` types on public API surfaces — use proper interfaces from `src/types.ts`
- Maximum line length: 120 characters
- One short comment per non-obvious algorithm or constant (explain **why**, not what)

### Agent Class Pattern

```typescript
export class MyDomainAgent {
  // Public methods only — no internal state exposed
  
  assessSomething(input: MyInput): MyOutput[] {
    // Implementation
    return results;
  }
}
```

### Adding to the Orchestrator

1. Add the new `CISOAgentRole` union member to `src/types.ts`
2. Create the agent class in `src/agents/ciso-<domain>.ts`
3. Import and instantiate in `CISOOrchestrator` (`src/ciso-orchestrator.ts`)
4. Add delegation block in `runSecurityPostureReview()`
5. Add public delegate methods
6. Add MCP tool definitions to `src/mcp-tools.ts`
7. Add agent type to `getAgentTypes()` in `src/plugin.ts`
8. Export from `src/index.ts`
9. Add tests to `__tests__/ciso-swarm.test.ts`

### Testing Requirements

```bash
# All existing tests must pass
npm test

# New agents must have tests covering:
# - At least 3 distinct input scenarios
# - Output structure (required fields present)
# - Edge cases (empty input, minimal input)
# - Integration with orchestrator (agent returns to idle after use)
```

---

## Pull Request Process

1. Ensure `npm test` passes with 0 failures
2. Update `CHANGELOG.md` under `[Unreleased]`
3. Update `USAGE.md` if you add or change agent/skill behaviour
4. Write a clear PR description:
   - What changed and why
   - How to test it
   - Any breaking changes to the public API or agent interfaces

### PR Title Format

```
[domain] Brief description
```

Examples:

```
[ciso-threat-intelligence] Add TA0043 Resource Development tactic coverage
[ciso-ai-security] Add MITRE ATLAS AML.T0051 LLM prompt injection technique
[docs] Update USAGE.md with healthcare compliance examples
[tests] Add tabletop exercise generation test cases
```

---

## Reporting Issues

Open an issue at [https://github.com/sarfarazmunir/CISO-agents/issues](https://github.com/sarfarazmunir/CISO-agents/issues) with:

1. **Description** — What happened?
2. **Expected behaviour** — What should have happened?
3. **Steps to reproduce** — Exact prompts or API calls that trigger the issue
4. **Environment** — OS, Node.js version (`node --version`), Claude Code version (`claude --version`)
5. **Output** — Paste the unexpected output or error

---

## Code of Conduct

Please read our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

---

[Back to README](README.md)
