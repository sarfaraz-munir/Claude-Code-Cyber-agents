import type { ComplianceReport } from 'ciso-agents';

export default function CompliancePanel({ reports }: { reports: ComplianceReport[] }) {
  if (!reports.length) return <div className="panel"><h3>Compliance</h3><p className="muted">No frameworks assessed.</p></div>;
  return (
    <div className="panel">
      <h3>Compliance</h3>
      {reports.map(r => (
        <div key={r.framework} style={{ marginBottom: 18 }}>
          <div className="form-row" style={{ justifyContent: 'space-between' }}>
            <strong>{r.framework}</strong>
            <span className={`badge ${r.complianceScore >= 80 ? 'compliant' : r.complianceScore >= 50 ? 'partial' : 'non-compliant'}`}>{r.complianceScore}%</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            {r.compliant} compliant · {r.partial} partial · {r.nonCompliant} non-compliant · {r.notApplicable} N/A
          </div>
          {r.criticalGaps.length > 0 && (
            <table>
              <thead><tr><th>Critical gap</th><th>Control</th><th>Status</th></tr></thead>
              <tbody>
                {r.criticalGaps.map(g => (
                  <tr key={g.id}>
                    <td>{g.id}</td>
                    <td>{g.controlName}</td>
                    <td><span className={`badge ${g.status}`}>{g.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
