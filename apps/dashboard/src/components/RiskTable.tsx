import { useState } from 'react';
import type { RiskEntry, RiskSeverity } from 'ciso-agents';

const SEVERITIES: (RiskSeverity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'informational'];

export default function RiskTable({ risks }: { risks: RiskEntry[] }) {
  const [filter, setFilter] = useState<RiskSeverity | 'all'>('all');
  const rows = [...risks]
    .filter(r => filter === 'all' || r.severity === filter)
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="panel">
      <h3>Risk Register ({risks.length})</h3>
      <div className="form-row">
        <span className="muted">Filter:</span>
        {SEVERITIES.map(s => (
          <button key={s} className={filter === s ? 'primary' : ''} onClick={() => setFilter(s)} style={{ padding: '4px 10px' }}>{s}</button>
        ))}
      </div>
      <table>
        <thead>
          <tr><th>Severity</th><th>Title</th><th>Category</th><th>L×I</th><th>Score</th><th>Treatment</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td><span className={`badge ${r.severity}`}>{r.severity}</span></td>
              <td>{r.title}</td>
              <td className="muted">{r.category}</td>
              <td>{r.likelihood}×{r.impact}</td>
              <td>{r.riskScore}</td>
              <td>{r.treatment}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">No risks at this severity.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
