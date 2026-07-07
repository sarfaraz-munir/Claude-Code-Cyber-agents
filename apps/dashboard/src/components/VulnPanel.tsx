import type { Vulnerability } from 'ciso-agents';

// Mirror the engine's buildPatchPlan partition (sequential, no double-counting).
function waves(vulns: Vulnerability[]) {
  const assigned = new Set<Vulnerability>();
  const take = (pred: (v: Vulnerability) => boolean) => {
    const g = vulns.filter(v => !assigned.has(v) && pred(v));
    g.forEach(v => assigned.add(v));
    return g;
  };
  return [
    { label: 'Emergency — Actively Exploited (KEV)', items: take(v => v.exploitedInWild) },
    { label: 'Critical/High with Public Exploit', items: take(v => v.exploitAvailable && (v.severity === 'critical' || v.severity === 'high')) },
    { label: 'Critical/High — No Known Exploit', items: take(v => v.severity === 'critical' || v.severity === 'high') },
    { label: 'Medium / Low', items: take(() => true) },
  ].filter(w => w.items.length > 0);
}

export default function VulnPanel({ vulns }: { vulns: Vulnerability[] }) {
  if (!vulns.length) return <div className="panel"><h3>Vulnerabilities</h3><p className="muted">No vulnerabilities supplied for this review.</p></div>;
  return (
    <div className="panel">
      <h3>Vulnerability Patch Plan ({vulns.length})</h3>
      {waves(vulns).map(w => (
        <div key={w.label} style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 13 }}>{w.label}</strong>
          <table>
            <tbody>
              {w.items.map(v => (
                <tr key={v.cveId}>
                  <td><span className={`badge ${v.severity}`}>{v.severity}</span></td>
                  <td>{v.cveId}</td>
                  <td>CVSS {v.cvssScore}</td>
                  <td className="muted">{v.title}</td>
                  <td>{v.patchDeadlineDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
