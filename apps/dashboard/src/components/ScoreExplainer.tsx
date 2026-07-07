import type { SecurityPostureReport } from 'ciso-agents';
import { scoreBreakdown } from '../lib/report.ts';

export default function ScoreExplainer({ report }: { report: SecurityPostureReport }) {
  const b = scoreBreakdown(report);
  const row = (label: string, value: number, negative = false) => (
    <div className="waterfall-row">
      <span>{label}</span>
      <span className={negative ? 'neg' : ''}>{negative ? '−' : ''}{Math.abs(value)}</span>
    </div>
  );
  return (
    <div className="panel">
      <h3>How this score was calculated</h3>
      {row('Average compliance (starting point)', b.avgCompliance)}
      {row(`Critical risks penalty (${b.criticalRisks} × 10, capped 30)`, b.riskPenalty, true)}
      {row(`Critical architecture gaps penalty (${b.archGaps} × 8, capped 25)`, b.archPenalty, true)}
      {row(`Critical open vulnerabilities penalty (${b.criticalVulns} × 5, capped 20)`, b.vulnPenalty, true)}
      <div className="waterfall-row" style={{ fontWeight: 700, borderBottom: 'none' }}>
        <span>Overall score</span>
        <span>{report.overallScore}/100</span>
      </div>
      {b.noEvidence && (
        <div className="callout">
          <strong>Low score may reflect missing evidence, not weak security.</strong> One or more
          frameworks scored 0% because no control evidence was supplied — every unlisted control
          defaults to non-compliant. Add your actual control evidence in <em>New Review</em> for a
          realistic score.
        </div>
      )}
    </div>
  );
}
