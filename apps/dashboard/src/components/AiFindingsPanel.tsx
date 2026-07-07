import type { AISecurityFinding } from 'ciso-agents';

export default function AiFindingsPanel({ findings }: { findings?: AISecurityFinding[] }) {
  if (!findings || findings.length === 0) {
    return <div className="panel"><h3>AI / LLM Security</h3><p className="muted">No AI systems assessed in this review.</p></div>;
  }
  return (
    <div className="panel">
      <h3>AI / LLM Security Findings ({findings.length})</h3>
      {findings.map(f => (
        <div key={f.id} style={{ marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
          <div className="form-row" style={{ justifyContent: 'space-between' }}>
            <strong>{f.threatId} · {f.title}</strong>
            <span className={`badge ${f.severity}`}>{f.severity}</span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{f.description}</div>
          {f.regulatoryImplications.length > 0 && (
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <span className="muted">Regulatory: </span>{f.regulatoryImplications.join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
