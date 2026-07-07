import { useEffect, useState } from 'react';
import type { PipelineSecurityFinding } from 'ciso-agents';
import { api } from '../api.ts';

export default function PipelinePanel({ runId }: { runId: string }) {
  const [findings, setFindings] = useState<PipelineSecurityFinding[] | null>(null);
  useEffect(() => {
    api.getPipeline(runId).then(r => setFindings(r.findings)).catch(() => setFindings([]));
  }, [runId]);

  if (!findings) return <div className="panel"><h3>DevSecOps Pipeline</h3><p className="muted">Loading…</p></div>;
  return (
    <div className="panel">
      <h3>DevSecOps Pipeline</h3>
      <table>
        <thead><tr><th>Stage</th><th>Control</th><th>Status</th><th>Severity</th></tr></thead>
        <tbody>
          {findings.map((f, i) => (
            <tr key={i}>
              <td className="muted">{f.stage}</td>
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
