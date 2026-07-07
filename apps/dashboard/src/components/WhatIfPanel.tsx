import { useEffect, useMemo, useState } from 'react';
import type { SecurityPostureReport, SecurityPostureReviewParams } from 'ciso-agents';
import type { StoredRun } from '../api.ts';
import { api } from '../api.ts';
import ScoreGauge from './ScoreGauge.tsx';

const ZT_LEVERS: { key: string; label: string }[] = [
  { key: 'siem', label: 'Deploy SIEM' },
  { key: 'edr', label: 'Deploy EDR' },
  { key: 'leastPrivilegeIam', label: 'Least-privilege IAM' },
  { key: 'encryptedInTransit', label: 'Encryption in transit' },
  { key: 'pam', label: 'Privileged Access Mgmt' },
];
const PIPE_LEVERS: { key: string; label: string }[] = [
  { key: 'hasSecretsScanning', label: 'Secrets scanning' },
  { key: 'hasContainerScanning', label: 'Container scanning' },
];

/** Rebuild riskFindings from a report's register so the slider can trim critical risks. */
function findingsFromReport(report: SecurityPostureReport) {
  return report.riskRegister.map(r => ({
    title: r.title,
    description: r.description,
    category: r.category,
    likelihood: r.likelihood,
    impact: r.impact,
  }));
}

export default function WhatIfPanel({ baseline, onSaved }: { baseline: StoredRun; onSaved: () => void }) {
  const baseFindings = useMemo(() => findingsFromReport(baseline.report), [baseline]);
  const criticalCount = baseline.report.riskRegister.filter(r => r.severity === 'critical').length;

  const [zt, setZt] = useState<Record<string, boolean>>({});
  const [pipe, setPipe] = useState<Record<string, boolean>>({});
  const [mitigated, setMitigated] = useState(0);
  const [projected, setProjected] = useState<SecurityPostureReport>(baseline.report);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState(`${baseline.label} — scenario`);

  // Build the modified params from the baseline plus lever overrides.
  const scenarioParams: SecurityPostureReviewParams = useMemo(() => {
    // Drop the top N critical risk findings (sorted by score desc) to model remediation.
    const sorted = [...baseline.report.riskRegister].sort((a, b) => b.riskScore - a.riskScore);
    const dropTitles = new Set(sorted.filter(r => r.severity === 'critical').slice(0, mitigated).map(r => r.title));
    const riskFindings = baseFindings.filter(f => !dropTitles.has(f.title));
    return {
      ...baseline.params,
      riskFindings,
      zeroTrustPosture: { ...baseline.params.zeroTrustPosture, ...zt },
      pipelinePosture: { ...baseline.params.pipelinePosture, ...pipe },
    };
  }, [baseline, baseFindings, zt, pipe, mitigated]);

  // Debounced projection.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusy(true);
      api.whatIf(scenarioParams)
        .then(r => setProjected(r.report))
        .catch(() => {})
        .finally(() => setBusy(false));
    }, 400);
    return () => clearTimeout(t);
  }, [scenarioParams]);

  const delta = projected.overallScore - baseline.report.overallScore;
  const toggle = (set: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, key: string) =>
    set(prev => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    await api.createReview(scenarioParams, label);
    onSaved();
  };

  return (
    <div className="panel">
      <h3>Interactive What-If {busy && <span className="muted" style={{ fontSize: 12 }}>· projecting…</span>}</h3>
      <div className="grid cols-2">
        <div>
          <p className="muted" style={{ fontSize: 12 }}>Toggle controls to project their impact. Nothing is saved until you click Save.</p>
          <div className="form-section">
            <strong style={{ fontSize: 13 }}>Architecture</strong>
            {ZT_LEVERS.map(l => (
              <div className="form-row" key={l.key}>
                <label>{l.label}</label>
                <button className={zt[l.key] ? 'primary' : ''} onClick={() => toggle(setZt, l.key)}>
                  {zt[l.key] ? 'Enabled' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
          <div className="form-section">
            <strong style={{ fontSize: 13 }}>Pipeline</strong>
            {PIPE_LEVERS.map(l => (
              <div className="form-row" key={l.key}>
                <label>{l.label}</label>
                <button className={pipe[l.key] ? 'primary' : ''} onClick={() => toggle(setPipe, l.key)}>
                  {pipe[l.key] ? 'Enabled' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
          <div className="form-section">
            <strong style={{ fontSize: 13 }}>Critical risks mitigated: {mitigated} / {criticalCount}</strong>
            <input
              className="slider"
              type="range"
              min={0}
              max={criticalCount}
              value={mitigated}
              onChange={e => setMitigated(Number(e.target.value))}
              style={{ display: 'block', marginTop: 6 }}
            />
          </div>
        </div>
        <div>
          <ScoreGauge score={projected.overallScore} maturityLevel={projected.maturityLevel} />
          <div className="panel" style={{ textAlign: 'center', marginTop: 12 }}>
            <span className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
              {delta > 0 ? '+' : ''}{delta} vs baseline ({baseline.report.overallScore})
            </span>
          </div>
          <div className="form-row no-print" style={{ marginTop: 12 }}>
            <input value={label} onChange={e => setLabel(e.target.value)} style={{ flex: 1 }} />
            <button className="primary" onClick={save}>Save scenario</button>
          </div>
        </div>
      </div>
    </div>
  );
}
