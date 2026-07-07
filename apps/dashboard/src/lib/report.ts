// Pure helpers shared by server and client. No React, no DOM — safe to import anywhere.
import type { SecurityPostureReport } from 'ciso-agents';

const MATURITY_LABELS = ['', 'Initial', 'Developing', 'Defined', 'Managed', 'Optimising'];

export function maturityLabel(level: number): string {
  return MATURITY_LABELS[level] ?? 'Unknown';
}

/**
 * Client-side reconstruction of the posture penalty breakdown, matching the engine's
 * computePostureScore (avgCompliance − riskPenalty≤30 − archPenalty≤25 − vulnPenalty≤20).
 * Used by ScoreExplainer so executives see WHY a score is low.
 */
export function scoreBreakdown(report: SecurityPostureReport) {
  const avgCompliance = report.complianceReports.length
    ? report.complianceReports.reduce((s, r) => s + r.complianceScore, 0) / report.complianceReports.length
    : 70; // engine default when no frameworks assessed
  const criticalRisks = report.riskRegister.filter(r => r.severity === 'critical').length;
  const riskPenalty = Math.min(criticalRisks * 10, 30);
  const criticalVulns = report.vulnerabilities.filter(v => v.severity === 'critical' && v.status === 'open').length;
  const vulnPenalty = Math.min(criticalVulns * 5, 20);
  // Architecture penalty is derived from KPI "Critical Architecture Gaps" (the report doesn't
  // carry raw arch findings), capped at 25 with 8 points each.
  const archGapKpi = report.kpis.find(k => k.name === 'Critical Architecture Gaps');
  const archGaps = typeof archGapKpi?.value === 'number' ? archGapKpi.value : 0;
  const archPenalty = Math.min(archGaps * 8, 25);
  return {
    avgCompliance: Math.round(avgCompliance),
    riskPenalty,
    archPenalty,
    vulnPenalty,
    criticalRisks,
    criticalVulns,
    archGaps,
    noEvidence: report.complianceReports.some(r => r.complianceScore === 0),
  };
}

/** Board-ready Markdown briefing built from a report. */
export function reportToMarkdown(report: SecurityPostureReport, label: string): string {
  const lines: string[] = [];
  lines.push(`# Security Posture Briefing — ${label}`);
  lines.push('');
  lines.push(`Generated: ${new Date(report.generatedAt).toUTCString()}`);
  lines.push('');
  lines.push(`**Overall posture: ${report.overallScore}/100 — Maturity Level ${report.maturityLevel} (${maturityLabel(report.maturityLevel)})**`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('```');
  lines.push(report.executiveSummary);
  lines.push('```');
  lines.push('');
  lines.push('## Compliance');
  lines.push('');
  lines.push('| Framework | Score | Compliant | Partial | Non-compliant | Critical gaps |');
  lines.push('|-----------|-------|-----------|---------|---------------|---------------|');
  for (const c of report.complianceReports) {
    lines.push(`| ${c.framework} | ${c.complianceScore}% | ${c.compliant} | ${c.partial} | ${c.nonCompliant} | ${c.criticalGaps.length} |`);
  }
  lines.push('');
  lines.push('## Top Risks');
  lines.push('');
  const risks = [...report.riskRegister].sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);
  for (const r of risks) {
    lines.push(`- **[${r.severity.toUpperCase()}]** ${r.title} — score ${r.riskScore}, treatment: ${r.treatment}`);
  }
  lines.push('');
  if (report.aiSecurityFindings?.length) {
    lines.push('## AI / LLM Findings');
    lines.push('');
    for (const f of report.aiSecurityFindings) {
      lines.push(`- **[${f.severity.toUpperCase()}]** ${f.threatId} — ${f.title}`);
    }
    lines.push('');
  }
  lines.push('## Roadmap');
  lines.push('');
  for (const item of report.roadmap) {
    lines.push(`- **${item.quarter}** — ${item.initiative} _(cost: ${item.cost})_`);
  }
  lines.push('');
  return lines.join('\n');
}
