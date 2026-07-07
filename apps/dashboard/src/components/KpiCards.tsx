import type { SecurityKPI } from 'ciso-agents';

const arrow = { improving: '▲', degrading: '▼', stable: '▬' } as const;

export default function KpiCards({ kpis }: { kpis: SecurityKPI[] }) {
  return (
    <div className="grid cols-4">
      {kpis.map((k, i) => (
        <div className="kpi" key={i}>
          <div className="val">
            {k.value}{k.unit} <span className="muted" style={{ fontSize: 13 }}>{arrow[k.trend]}</span>
          </div>
          <div className="name">{k.name}</div>
          {k.target !== undefined && <div className="target">target: {k.target}</div>}
        </div>
      ))}
    </div>
  );
}
