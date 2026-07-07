import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { StoredRun } from '../api.ts';

export default function TrendChart({ runs }: { runs: StoredRun[] }) {
  // Oldest → newest for a left-to-right timeline.
  const data = [...runs].reverse().map(r => ({
    label: r.label.slice(0, 16),
    score: r.report.overallScore,
    maturity: r.report.maturityLevel,
  }));

  if (data.length < 2) {
    return (
      <div className="panel">
        <h3>Score Trend</h3>
        <p className="muted">Save at least two reviews to see a trend.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Score Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#26324f" />
          <XAxis dataKey="label" stroke="#93a1c0" fontSize={11} />
          <YAxis domain={[0, 100]} stroke="#93a1c0" fontSize={11} />
          <Tooltip contentStyle={{ background: '#131c31', border: '1px solid #26324f', borderRadius: 8, color: '#e6ecf7' }} />
          <Line type="monotone" dataKey="score" stroke="#4f8cff" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
