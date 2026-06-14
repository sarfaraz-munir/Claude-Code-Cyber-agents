/**
 * Example: Wiring the CISO Swarm into @claude-flow/plugins official collection
 *
 * Add this to:
 *   @claude-flow/plugins/src/collections/official/index.ts
 *
 * And add as optional peer dependency in @claude-flow/plugins/package.json:
 *   "ciso-agents": "^1.0.0"
 */

// ── Lazy singleton orchestrator ───────────────────────────────────────────────
let _cisoOrch: unknown = null;
async function getCISOOrch() {
  if (!_cisoOrch) {
    const { CISOOrchestrator } = await import('ciso-agents');
    _cisoOrch = new CISOOrchestrator('default');
  }
  return _cisoOrch as import('ciso-agents').CISOOrchestrator;
}

// ── PluginBuilder entry (add to securityCollection) ───────────────────────────
// const cisoSwarmPlugin = new PluginBuilder('ciso-swarm', '1.0.0')
//   .withDescription('CISO swarm: queen + 9 specialists')
//   .withMCPTools([
//     {
//       name: 'ciso_security_posture_review',
//       description: 'Full enterprise security posture review',
//       inputSchema: { type: 'object', properties: {} },
//       handler: async (input) => {
//         const orch = await getCISOOrch();
//         const report = await orch.runSecurityPostureReview(input);
//         return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
//       },
//     },
//     // ... add remaining tools from src/mcp-tools.ts
//   ])
//   .build();

// ── Direct TypeScript usage ───────────────────────────────────────────────────

import { CISOOrchestrator } from '../src/ciso-orchestrator.js';

async function example() {
  const orch = new CISOOrchestrator('my-org');

  // Full posture review
  const report = await orch.runSecurityPostureReview({
    orgProfile: {
      industry: 'fintech',
      criticalAssets: ['payment-api', 'customer-db', 'auth-service'],
    },
    frameworks: ['SOC2-TypeII', 'PCI-DSS', 'NIST-CSF'],
    zeroTrustPosture: {
      mfaEnforced: true,
      encryptedInTransit: true,
      siem: false,
      edr: false,
    },
    pipelinePosture: {
      hasSAST: true,
      hasSecretsScanning: false,
      hasBranchProtection: true,
    },
    aiSystems: [{
      name: 'Customer Support LLM',
      type: 'llm' as const,
      deployment: 'saas-api' as const,
      dataClasses: ['PII', 'financial'],
      internetFacing: true,
      usesExternalModels: true,
      hasAgentCapabilities: false,
      hasRAG: true,
      trainingDataSource: 'third-party' as const,
      humanOversight: 'partial' as const,
      regulatoryScope: ['GDPR', 'PCI-DSS'],
    }],
  });

  console.log(report.executiveSummary);
  console.log(`Score: ${report.overallScore}/100  Maturity: ${report.maturityLevel}/5`);
  console.log(`Risks: ${report.riskRegister.length}  Recommendations: ${report.recommendations.length}`);
}

example().catch(console.error);
