import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { SecurityPostureReport, SecurityPostureReviewParams, PostureSummary, PostureTrend } from 'ciso-agents';

export interface StoredRun {
  id: string;
  label: string;
  savedAt: string;      // ISO 8601
  report: SecurityPostureReport;
  params: SecurityPostureReviewParams; // stored so architecture/pipeline drill-downs can re-run specialists
}

const DEFAULT_FILE =
  process.env['HISTORY_FILE'] ??
  fileURLToPath(new URL('../data/history.json', import.meta.url));

/** Derive a compact summary from a stored report (reuses the engine's PostureSummary shape). */
function toSummary(run: StoredRun): PostureSummary {
  const r = run.report;
  return {
    swarmId: run.id,
    timestamp: r.generatedAt,
    overallScore: r.overallScore,
    maturityLevel: r.maturityLevel,
    frameworksAssessed: r.complianceReports.map(c => c.framework),
    criticalRisks: r.riskRegister.filter(x => x.severity === 'critical').length,
  };
}

export class HistoryStore {
  constructor(private readonly filePath: string = DEFAULT_FILE) {}

  /** Read all runs. Missing or corrupt file → [] (never throws). */
  private readAll(): StoredRun[] {
    if (!existsSync(this.filePath)) return [];
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8'));
      return Array.isArray(parsed) ? (parsed as StoredRun[]) : [];
    } catch (err) {
      console.error(`[history] failed to read ${this.filePath}:`, err);
      return [];
    }
  }

  /** Atomic write: tmp file then rename, so an interrupted write can't corrupt the store. */
  private writeAll(runs: StoredRun[]): void {
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(runs, null, 2), 'utf8');
    renameSync(tmp, this.filePath);
  }

  appendRun(report: SecurityPostureReport, label: string, params: SecurityPostureReviewParams = {}): StoredRun {
    const run: StoredRun = {
      id: randomUUID(),
      label: label || 'Untitled review',
      savedAt: new Date().toISOString(),
      report,
      params,
    };
    const runs = this.readAll();
    runs.push(run);
    this.writeAll(runs);
    return run;
  }

  /** Newest first. */
  listRuns(): StoredRun[] {
    return this.readAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  getRun(id: string): StoredRun | undefined {
    return this.readAll().find(r => r.id === id);
  }

  /** Trend of the two newest runs (same logic as PostureMemoryService.computeTrend). */
  computeTrend(): PostureTrend {
    const summaries = this.listRuns().map(toSummary); // already newest-first
    if (summaries.length === 0) {
      return { currentScore: 0, previousScore: null, delta: 0, direction: 'stable', reviewsCompared: 0 };
    }
    const [current, previous] = summaries;
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
}

export const history = new HistoryStore();
