import { CISOOrchestrator } from 'ciso-agents';
import type { SecurityPostureReport, SecurityPostureReviewParams } from 'ciso-agents';

type ZeroTrust = NonNullable<SecurityPostureReviewParams['zeroTrustPosture']>;
type Pipeline = NonNullable<SecurityPostureReviewParams['pipelinePosture']>;

// One orchestrator for the process lifetime. Swarm task state (completedTasks,
// per-agent counters) accumulates intentionally — the live "agents" strip reads it.
// Do NOT construct a fresh orchestrator per request.
const orchestrator = new CISOOrchestrator('dashboard');

export function getSwarmStatus() {
  return orchestrator.getSwarmStatus();
}

export function runReview(
  params: SecurityPostureReviewParams,
  opts: { parallel?: boolean } = {},
): Promise<SecurityPostureReport> {
  return opts.parallel
    ? orchestrator.runSecurityPostureReviewParallel(params)
    : orchestrator.runSecurityPostureReview(params);
}

// Specialist drill-downs. The posture report does not carry raw architecture /
// pipeline findings, so these re-run the relevant specialist from stored params.
export function reviewArchitecture(posture: ZeroTrust = {}) {
  return orchestrator.runArchitectureReview(posture);
}

export function auditPipeline(posture: Pipeline = {}) {
  return orchestrator.auditDevSecOpsPipeline(posture);
}
