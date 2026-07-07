import type { RoadmapItem } from 'ciso-agents';

export default function RoadmapTimeline({ roadmap }: { roadmap: RoadmapItem[] }) {
  return (
    <div className="panel">
      <h3>Remediation Roadmap</h3>
      <div className="timeline">
        {roadmap.map((item, i) => (
          <div key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
            <div className="q">{item.quarter} <span className={`badge ${item.cost === 'high' ? 'high' : 'low'}`}>cost: {item.cost}</span></div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{item.initiative}</div>
            <div className="muted" style={{ fontSize: 12 }}>{item.rationale}</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>→ {item.expectedOutcome}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
