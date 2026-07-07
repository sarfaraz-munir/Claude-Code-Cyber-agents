/**
 * PostureMemoryService — persists posture review runs to Ruflo memory via CLI.
 * All CLI interaction goes through an injectable executor so tests never
 * spawn real processes (spec: docs/superpowers/specs/2026-06-15-*.md).
 *
 * The CLI is invoked as a bare `ruflo` binary (present on PATH in a Ruflo
 * environment). It is intentionally NOT `npx ruflo`: npx would auto-install an
 * unrelated namesquatting package. When `ruflo` is absent, execSync throws
 * ENOENT and read paths degrade gracefully to empty history.
 */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { SecurityPostureReport, PostureSummary, PostureTrend } from './types.js';

export type CommandExecutor = (command: string) => string;

const defaultExecutor: CommandExecutor = (command) =>
  execSync(command, { shell: '/bin/zsh', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

/** Wrap a string in single quotes, escaping embedded single quotes for POSIX shells. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export class PostureMemoryService {
  constructor(private readonly executor: CommandExecutor = defaultExecutor) {}

  initSwarm(namespace: string): string {
    const swarmId = `posture-${randomUUID().slice(0, 8)}`;
    const session = JSON.stringify({ swarmId, namespace, startedAt: new Date().toISOString() });
    this.store(`posture:${swarmId}:session`, session);
    return swarmId;
  }

  storeAgentResult(swarmId: string, agentRole: string, result: unknown): void {
    this.store(`posture:${swarmId}:${agentRole}`, JSON.stringify(result));
  }

  storeSummary(swarmId: string, report: SecurityPostureReport): void {
    const summary: PostureSummary = {
      swarmId,
      timestamp: report.generatedAt,
      overallScore: report.overallScore,
      maturityLevel: report.maturityLevel,
      frameworksAssessed: report.complianceReports.map(r => r.framework),
      criticalRisks: report.riskRegister.filter(r => r.severity === 'critical').length,
    };
    this.store(`posture:${swarmId}:summary`, JSON.stringify(summary));
  }

  getHistory(limit = 10): PostureSummary[] {
    let stdout: string;
    try {
      stdout = this.executor(`ruflo memory list --format json`);
    } catch {
      return []; // Ruflo CLI missing or daemon not running — graceful degradation per spec
    }
    try {
      const entries = JSON.parse(stdout) as Array<{ key: string; value: string }>;
      return entries
        .filter(e => /^posture:[^:]+:summary$/.test(e.key))
        .map(e => JSON.parse(e.value) as PostureSummary)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit);
    } catch {
      return []; // unparseable CLI output — treat as no history
    }
  }

  computeTrend(history: PostureSummary[]): PostureTrend {
    if (history.length === 0) {
      return { currentScore: 0, previousScore: null, delta: 0, direction: 'stable', reviewsCompared: 0 };
    }
    const [current, previous] = history;
    if (!previous) {
      return { currentScore: current.overallScore, previousScore: null, delta: 0, direction: 'stable', reviewsCompared: 1 };
    }
    const delta = current.overallScore - previous.overallScore;
    return {
      currentScore: current.overallScore,
      previousScore: previous.overallScore,
      delta,
      direction: delta > 0 ? 'improving' : delta < 0 ? 'degrading' : 'stable',
      reviewsCompared: 2,
    };
  }

  private store(key: string, value: string): void {
    this.executor(`ruflo memory store -k ${shellQuote(key)} -v ${shellQuote(value)}`);
  }
}
