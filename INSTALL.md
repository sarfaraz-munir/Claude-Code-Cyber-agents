# Installation Guide

This document covers all supported installation methods for the CISO Agents swarm.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Method 1: Global (all sessions)](#method-1-global-all-sessions)
  - [Method 2: Project-scoped](#method-2-project-scoped)
  - [Method 3: TypeScript API](#method-3-typescript-api)
  - [Method 4: Symlinked (contributors)](#method-4-symlinked-contributors)
- [Verification](#verification)
- [Platform Notes](#platform-notes)
- [Uninstall](#uninstall)

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Claude Code | Latest | `claude --version` |
| Git | 2.x+ | `git --version` |
| Node.js | 20.x+ | `node --version` (TypeScript API only) |
| npm | 9.x+ | `npm --version` (TypeScript API only) |

No external security tools are required. All domain knowledge is built into the agents and TypeScript orchestrator.

---

## Installation Methods

### Method 1: Global (all sessions)

Installs agents, skills, and command globally so they are available in every Claude Code session on your machine.

```bash
git clone https://github.com/sarfarazmunir/CISO-agents.git
cd CISO-agents

# Create target directories if they don't exist
mkdir -p ~/.claude/agents ~/.claude/skills ~/.claude/commands

# Copy agent files (10 agents)
cp -r .claude/agents/ciso ~/.claude/agents/

# Copy skill files (4 skills)
cp -r .claude/skills/ciso-posture-review ~/.claude/skills/
cp -r .claude/skills/ciso-ai-security ~/.claude/skills/
cp -r .claude/skills/ciso-threat-model ~/.claude/skills/
cp -r .claude/skills/ciso-incident-response ~/.claude/skills/

# Copy slash command
cp .claude/commands/ciso-posture-review.md ~/.claude/commands/
```

---

### Method 2: Project-scoped

Installs agents and skills only for a specific project. Files are placed in the project's `.claude/` directory.

```bash
git clone https://github.com/sarfarazmunir/CISO-agents.git
cd CISO-agents

# Replace /path/to/your/project with your actual project root
TARGET=/path/to/your/project

mkdir -p "$TARGET/.claude/agents" "$TARGET/.claude/skills" "$TARGET/.claude/commands"

cp -r .claude/agents/ciso "$TARGET/.claude/agents/"
cp -r .claude/skills/ciso-* "$TARGET/.claude/skills/"
cp .claude/commands/ciso-posture-review.md "$TARGET/.claude/commands/"
```

---

### Method 3: TypeScript API

Install as a local package for direct programmatic use.

```bash
git clone https://github.com/sarfarazmunir/CISO-agents.git
cd CISO-agents
npm install
```

Run tests to confirm everything works:

```bash
npm test
# Expected: 21 passed (21)
```

Run the example:

```bash
npx tsx examples/collection-integration.ts
```

---

### Method 4: Symlinked (contributors)

Symlink instead of copy so local edits are reflected immediately without re-copying.

```bash
git clone https://github.com/sarfarazmunir/CISO-agents.git
cd CISO-agents

REPO="$(pwd)"
mkdir -p ~/.claude/agents ~/.claude/skills ~/.claude/commands

# Symlink agent directory
ln -sfn "$REPO/.claude/agents/ciso" ~/.claude/agents/ciso

# Symlink skill directories
ln -sfn "$REPO/.claude/skills/ciso-posture-review"    ~/.claude/skills/ciso-posture-review
ln -sfn "$REPO/.claude/skills/ciso-ai-security"       ~/.claude/skills/ciso-ai-security
ln -sfn "$REPO/.claude/skills/ciso-threat-model"      ~/.claude/skills/ciso-threat-model
ln -sfn "$REPO/.claude/skills/ciso-incident-response" ~/.claude/skills/ciso-incident-response

# Symlink command
ln -sfn "$REPO/.claude/commands/ciso-posture-review.md" ~/.claude/commands/ciso-posture-review.md
```

---

## Verification

After installation, verify the agents and skills are in place:

```bash
# Check agent files (should list 10 .md files)
ls ~/.claude/agents/ciso/

# Check skill files (should list 4 directories)
ls ~/.claude/skills/ | grep ciso

# Check command
ls ~/.claude/commands/ciso-posture-review.md
```

Expected output:

```
# Agents:
ciso-queen.md                  ciso-risk-governance.md
ciso-compliance-audit.md       ciso-threat-intelligence.md
ciso-security-architecture.md  ciso-incident-response.md
ciso-vulnerability-management.md  ciso-devsecops.md
ciso-security-awareness.md     ciso-ai-security.md

# Skills:
ciso-posture-review
ciso-ai-security
ciso-threat-model
ciso-incident-response
```

Start a new Claude Code session and confirm:

```
/ciso-posture-review --help
```

---

## Platform Notes

### macOS

All methods work as documented. If you use Homebrew Node.js:

```bash
brew install node git
```

### Linux (Ubuntu / Debian)

```bash
sudo apt update && sudo apt install -y git nodejs npm
```

### Linux (RHEL / CentOS / Fedora)

```bash
sudo dnf install -y git nodejs npm
```

### Windows

Use **WSL2** (Windows Subsystem for Linux) with Ubuntu. Follow the Linux instructions above inside your WSL terminal. Native Windows PowerShell is not supported.

---

## Uninstall

### Remove global install

```bash
rm -rf ~/.claude/agents/ciso
rm -rf ~/.claude/skills/ciso-posture-review
rm -rf ~/.claude/skills/ciso-ai-security
rm -rf ~/.claude/skills/ciso-threat-model
rm -rf ~/.claude/skills/ciso-incident-response
rm -f  ~/.claude/commands/ciso-posture-review.md
```

### Remove symlinks

```bash
unlink ~/.claude/agents/ciso
unlink ~/.claude/skills/ciso-posture-review
unlink ~/.claude/skills/ciso-ai-security
unlink ~/.claude/skills/ciso-threat-model
unlink ~/.claude/skills/ciso-incident-response
unlink ~/.claude/commands/ciso-posture-review.md
```

---

[Back to README](README.md)
