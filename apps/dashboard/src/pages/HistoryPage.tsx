import { useEffect, useState } from 'react';
import { api, type StoredRun } from '../api.ts';
import type { PostureTrend } from 'ciso-agents';
import TrendChart from '../components/TrendChart.tsx';

export default function HistoryPage() {
  const [runs, setRuns] = useState<StoredRun[]>([]);
  const [trend, setTrend] = useState<PostureTrend | null>(null);

  useEffect(() => {
    api.getHistory().then(h => { setRuns(h.runs); setTrend(h.trend); });
  }, []);

  return (
    <>
      <h2>Assessment History</h2>
      <div className="grid cols-2">
        <TrendChart runs={runs} />
        <div className="panel">
          <h3>Latest Trend</h3>
          {trend && trend.reviewsCompared >= 2 ? (
            <p>
              <span className={`delta ${trend.direction === 'improving' ? 'up' : trend.direction === 'degrading' ? 'down' : ''}`}>
                {trend.direction.toUpperCase()} {trend.delta > 0 ? '+' : ''}{trend.delta}
              </span>{' '}
              <span className="muted">(current {trend.currentScore} vs previous {trend.previousScore})</span>
            </p>
          ) : (
            <p className="muted">Need at least two reviews to compute a trend.</p>
          )}
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>All Reviews ({runs.length})</h3>
        <table>
          <thead><tr><th>Saved</th><th>Label</th><th>Score</th><th>Maturity</th><th>Frameworks</th></tr></thead>
          <tbody>
            {runs.map(r => (
              <tr key={r.id}>
                <td className="muted">{new Date(r.savedAt).toLocaleString()}</td>
                <td>{r.label}</td>
                <td>{r.report.overallScore}/100</td>
                <td>{r.report.maturityLevel}</td>
                <td className="muted">{r.report.complianceReports.map(c => c.framework).join(', ') || '—'}</td>
              </tr>
            ))}
            {runs.length === 0 && <tr><td colSpan={5} className="muted">No reviews saved yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
