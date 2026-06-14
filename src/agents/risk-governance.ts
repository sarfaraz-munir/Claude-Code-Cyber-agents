/**
 * Risk & Governance Agent
 * Maintains risk registers, scores findings with CVSS/FAIR, and recommends treatment.
 */

import type { RiskEntry, RiskSeverity, RemediationItem } from '../types.js';
import { randomUUID } from 'node:crypto';

export class RiskGovernanceAgent {
  readonly role = 'risk-governance' as const;
  readonly capabilities = [
    'risk-register',
    'cvss-scoring',
    'fair-analysis',
    'risk-treatment',
    'kpi-reporting',
    'board-reporting',
  ];

  buildRiskRegister(findings: Array<{
    title: string;
    description: string;
    category: RiskEntry['category'];
    likelihood: RiskEntry['likelihood'];
    impact: RiskEntry['impact'];
    cveIds?: string[];
    mitreAttackIds?: string[];
  }>): RiskEntry[] {
    const now = new Date().toISOString();
    return findings.map(f => {
      const riskScore = f.likelihood * f.impact;
      return {
        id: `RISK-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: f.title,
        description: f.description,
        category: f.category,
        likelihood: f.likelihood,
        impact: f.impact,
        riskScore,
        severity: this.scoreSeverity(riskScore),
        cveIds: f.cveIds,
        mitreAttackIds: f.mitreAttackIds,
        treatment: riskScore >= 16 ? 'mitigate' : riskScore >= 9 ? 'mitigate' : riskScore >= 4 ? 'transfer' : 'accept',
        owner: 'CISO',
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  private scoreSeverity(score: number): RiskSeverity {
    if (score >= 20) return 'critical';
    if (score >= 15) return 'high';
    if (score >= 9)  return 'medium';
    if (score >= 4)  return 'low';
    return 'informational';
  }

  prioritiseRisks(register: RiskEntry[]): RiskEntry[] {
    return [...register].sort((a, b) => b.riskScore - a.riskScore);
  }

  generateRoadmap(register: RiskEntry[]): RemediationItem[] {
    const now = new Date();
    return this.prioritiseRisks(register)
      .filter(r => r.treatment === 'mitigate')
      .map((r, i) => {
        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + (r.severity === 'critical' ? 30 : r.severity === 'high' ? 90 : 180));
        return {
          id: `REM-${i + 1}`,
          title: `Mitigate: ${r.title}`,
          description: r.description,
          effort: r.riskScore >= 20 ? 'high' : r.riskScore >= 12 ? 'medium' : 'low',
          impact: r.severity === 'critical' || r.severity === 'high' ? 'high' : 'medium',
          priority: r.severity === 'critical' ? 'critical' : r.severity === 'high' ? 'high' : 'normal',
          owner: r.owner,
          targetDate: deadline.toISOString().split('T')[0],
          status: 'planned' as const,
        };
      });
  }

  buildExecutiveSummary(register: RiskEntry[]): string {
    const critical = register.filter(r => r.severity === 'critical').length;
    const high = register.filter(r => r.severity === 'high').length;
    const medium = register.filter(r => r.severity === 'medium').length;
    const low = register.filter(r => r.severity === 'low' || r.severity === 'informational').length;

    return [
      `Risk Register Summary — ${new Date().toDateString()}`,
      `Total risks identified: ${register.length}`,
      `  Critical: ${critical}  |  High: ${high}  |  Medium: ${medium}  |  Low/Info: ${low}`,
      '',
      critical > 0
        ? `ACTION REQUIRED: ${critical} critical risk(s) demand immediate executive attention and remediation within 30 days.`
        : 'No critical risks identified.',
      high > 0
        ? `${high} high-severity risk(s) require remediation within 90 days.`
        : '',
    ].filter(Boolean).join('\n');
  }
}
