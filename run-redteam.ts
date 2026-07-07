import { execSync } from 'node:child_process';
import { CISOOrchestrator } from './src/index.js';
import type { RedTeamScope } from './src/index.js';

const scope: RedTeamScope = {
  engagementType: 'external',
  targetAssets: ['web-application', 'vpn-gateway', 'email-server'],
  outOfScope: ['production-database', 'payment-processor'],
  objectives: ['data-exfiltration', 'persistence', 'credential-harvesting'],
  rulesOfEngagement: 'No destructive actions. Business hours only (09:00–18:00 UTC). No DoS. Written authorization obtained.',
};

const orch = new CISOOrchestrator('redteam-engagement');

console.log('=== CISO Swarm — Red Team Engagement ===');
console.log('Agents:', Object.values(orch.getSwarmStatus().agents).map((a: any) => `${a.name} [${a.status}]`).join(', '));
console.log('');
console.log('Scope:');
console.log(`  Type:          ${scope.engagementType}`);
console.log(`  Target assets: ${scope.targetAssets.join(', ')}`);
console.log(`  Out of scope:  ${scope.outOfScope.join(', ')}`);
console.log(`  Objectives:    ${scope.objectives.join(', ')}`);
console.log('');

console.log('=== Running Red Team Engagement ===\n');
const report = await orch.runRedTeamEngagement(scope);

console.log(`Engagement ID:  ${report.engagementId}`);
console.log(`Generated:      ${report.generatedAt}`);
console.log('');

console.log('=== CHAIN OF ATTACK ===');
console.log(report.chainOfAttack);
console.log('');

console.log('=== FINDINGS ===');
report.findings.forEach(f => {
  console.log(`  [${f.severity.toUpperCase()}] [${f.technique}] ${f.title}`);
  console.log(`           Phase: ${f.phase} | Evidence: ${f.evidence}`);
  console.log(`           Rec: ${f.recommendation}`);
  console.log('');
});

console.log('=== DETECTION GAPS ===');
report.detectionGaps.forEach(g => {
  console.log(`  [${g.technique}] ${g.techniqueName}`);
  console.log(`           Current control: ${g.detectionControl}`);
  console.log(`           Recommendation:  ${g.recommendation}`);
  console.log('');
});

console.log('=== TOP RECOMMENDATIONS ===');
report.recommendations.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i + 1}. [${r.priority}] ${r.title}`);
  console.log(`     By: ${r.targetDate} | Effort: ${r.effort} | Impact: ${r.impact}`);
});
console.log('');

console.log('=== PURPLE TEAM EXERCISES ===');
report.purpleTeamExercises.forEach((e, i) => {
  console.log(`  ${i + 1}. ${e}`);
});
console.log('');

// Store findings in Ruflo persistent vector memory
console.log('=== Storing in Ruflo Vector Memory ===');
try {
  const memKey = `redteam:${report.engagementId}:findings`;
  const memValue = JSON.stringify({
    engagementId: report.engagementId,
    engagementType: scope.engagementType,
    techniques: report.findings.map(f => f.technique),
    detectionGaps: report.detectionGaps.map(g => g.technique),
    chainOfAttack: report.chainOfAttack,
    generatedAt: report.generatedAt,
  });
  execSync(
    `source ~/.zshrc && cd ~/Ruflo && node bin/cli.js memory store -k "${memKey}" --value '${memValue.replace(/'/g, '"')}'`,
    { shell: '/bin/zsh', stdio: 'pipe' },
  );
  console.log(`  [OK] Findings stored in Ruflo memory under key: ${memKey}`);
  console.log('       Future engagements can query: node ~/Ruflo/bin/cli.js memory search -q "red team"');
} catch {
  console.log('  [WARN] Ruflo memory store skipped (daemon may not be running)');
}
console.log('');

console.log('=== Swarm State After Engagement ===');
console.log('Agents:', Object.values(orch.getSwarmStatus().agents).map((a: any) => `${a.name} [${a.status}]`).join(', '));
