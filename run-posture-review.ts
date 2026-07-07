import { CISOOrchestrator } from './src/index.js';

const orch = new CISOOrchestrator('demo-org');

console.log('=== CISO Swarm: Initializing ===');
console.log('Agents:', Object.values(orch.getSwarmStatus().agents).map((a: any) => `${a.name} [${a.status}]`).join(', '));
console.log('');

console.log('=== Running Full Security Posture Review ===\n');

const report = await orch.runSecurityPostureReview({
  orgProfile: {
    industry: 'technology',
    employeeCount: 500,
    cloudProvider: 'AWS',
    criticalAssets: ['production-db', 'auth-service', 'payment-api'],
  },
  frameworks: ['SOC2-TypeII', 'ISO-27001', 'NIST-CSF'],
  zeroTrustPosture: { mfaEnforced: true, siem: true, edr: true },
  aiSystems: [
    {
      name: 'Internal LLM Chatbot',
      type: 'llm' as const,
      deployment: 'saas-api' as const,
      dataClasses: ['PII', 'confidential-ip'],
      internetFacing: true,
      usesExternalModels: true,
      hasAgentCapabilities: true,
      hasRAG: true,
      trainingDataSource: 'third-party' as const,
      humanOversight: 'partial' as const,
      regulatoryScope: ['GDPR', 'EU-AI-ACT-HIGH-RISK'],
    },
  ],
});

console.log('=== EXECUTIVE SUMMARY ===');
console.log(`Overall Score:     ${report.overallScore}/100`);
console.log(`Maturity Level:    ${report.maturityLevel}/5`);
console.log(`Generated At:      ${report.generatedAt}`);
console.log('');
console.log(report.executiveSummary);

console.log('\n=== TOP RISKS ===');
report.riskRegister.slice(0, 5).forEach(r => {
  console.log(`  [${r.severity.toUpperCase()}] ${r.title} — Score: ${r.riskScore}`);
});

console.log('\n=== COMPLIANCE SUMMARY ===');
report.complianceReports.forEach(cr => {
  console.log(`  ${cr.framework}: ${cr.complianceScore}% (${cr.criticalGaps?.length ?? 0} critical gaps)`);
});

console.log('\n=== TOP VULNERABILITIES ===');
report.vulnerabilities.slice(0, 5).forEach(v => {
  console.log(`  [${v.severity.toUpperCase()}] ${v.title} — CVSS ${v.cvssScore}`);
});

console.log('\n=== TOP RECOMMENDATIONS ===');
report.recommendations.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i+1}. [${r.priority}] ${r.title} — by ${r.targetDate}`);
});

console.log('\n=== ROADMAP (first 5 items) ===');
report.roadmap.slice(0, 5).forEach(item => {
  console.log(`  • [${item.quarter}] ${item.initiative} (cost: ${item.cost})`);
});

console.log('\n=== KPIs ===');
report.kpis.slice(0, 6).forEach(k => {
  console.log(`  ${k.name}: ${k.value} ${k.unit} [${k.trend}]${k.target !== undefined ? ` (target: ${k.target})` : ''}`);
});

console.log('\n=== Swarm State After Review ===');
console.log('Agents:', Object.values(orch.getSwarmStatus().agents).map((a: any) => `${a.name} [${a.status}]`).join(', '));
