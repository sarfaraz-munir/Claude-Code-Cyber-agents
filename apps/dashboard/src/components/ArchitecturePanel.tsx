import { useEffect, useState } from 'react';
import type { ArchitectureReviewFinding } from 'ciso-agents';
import { api } from '../api.ts';

export default function ArchitecturePanel({ runId }: { runId: string }) {
  const [findings, setFindings] = useState<ArchitectureReviewFinding[] | null>(null);
  useEffect(() => {
    api.getArchitecture(runId).then(r => setFindings(r.findings)).catch(() => setFindings([]));
  }, [runId]);

  if (!findings) return <div className="panel"><h3>Zero-Trust Architecture</h3><p className="muted">Loading…</p></div>;
  return (
    <div className="panel">
      <h3>Zero-Trust Architecture</h3>
      <table>
        <thead><tr><th>Domain</th><th>Control</th><th>Status</th><th>Severity</th></tr></thead>
        <tbody>
          {findings.map((f, i) => (
            <tr key={i}>
              <td className="muted">{f.domain}</td>
              <td>{f.control}</td>
              <td><span className={`badge ${f.status}`}>{f.status}</span></td>
              <td><span className={`badge ${f.severity}`}>{f.severity}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
