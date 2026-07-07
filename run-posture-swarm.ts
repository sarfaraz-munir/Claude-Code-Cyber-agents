import { CISOOrchestrator, PostureMemoryService } from './src/index.js';

// Probe Ruflo once. If the CLI is unavailable, fall back to a stub executor
// (returns '[]') so persistence becomes a no-op and the review still runs.
let memory = new PostureMemoryService();
let swarmId: string;
try {
  swarmId = memory.initSwarm('ciso-posture');
} catch {
  console.error('[warn] Ruflo memory unavailable — running without persistence');
  memory = new PostureMemoryService(() => '[]');
  swarmId = memory.initSwarm('ciso-posture');
}

const orch = new CISOOrchestrator('ciso-posture');

const report = await orch.runSecurityPostureReviewParallel({
  orgProfile: { industry: 'technology', criticalAssets: ['production-db', 'auth-service'] },
  frameworks: ['NIST-CSF'],
  zeroTrustPosture: { mfaEnforced: true, encryptedInTransit: true, siem: false, edr: false },
  pipelinePosture: { hasSAST: true, hasSecretsScanning: false, hasBranchProtection: true },
});

memory.storeAgentResult(swarmId, 'risk-governance', report.riskRegister);
memory.storeAgentResult(swarmId, 'compliance-audit', report.complianceReports);
memory.storeAgentResult(swarmId, 'threat-intelligence', report.threatScenarios);
memory.storeAgentResult(swarmId, 'vulnerability-management', report.vulnerabilities);
memory.storeSummary(swarmId, report);

const history = memory.getHistory(5);
const trend = memory.computeTrend(history);

console.log(report.executiveSummary);
console.log(`\nScore: ${report.overallScore}/100 | Maturity: ${report.maturityLevel}/5`);
console.log(trend.previousScore === null
  ? 'Trend: first recorded review — no comparison available'
  : `Trend: ${trend.direction} (${trend.delta >= 0 ? '+' : ''}${trend.delta} vs previous ${trend.previousScore})`);
