import { maturityLabel } from '../lib/report.ts';

function colorFor(score: number): string {
  if (score >= 80) return 'var(--ok)';
  if (score >= 55) return 'var(--med)';
  if (score >= 35) return 'var(--high)';
  return 'var(--crit)';
}

export default function ScoreGauge({ score, maturityLevel }: { score: number; maturityLevel: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 80;
  const circ = Math.PI * radius; // half circle
  const dash = (clamped / 100) * circ;
  const color = colorFor(clamped);
  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <h3>Overall Security Posture</h3>
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M20 110 A80 80 0 0 1 180 110"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.4s' }}
        />
      </svg>
      <div className="gauge-score" style={{ color }}>{clamped}<span style={{ fontSize: 20, color: 'var(--muted)' }}>/100</span></div>
      <div className="gauge-sub">Maturity Level {maturityLevel} — {maturityLabel(maturityLevel)}</div>
    </div>
  );
}
