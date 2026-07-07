import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SecurityPostureReviewParams, AISystemProfile } from 'ciso-agents';
import { api } from '../api.ts';

const FRAMEWORKS = ['SOC2-TypeII', 'ISO-27001', 'NIST-CSF', 'GDPR', 'HIPAA', 'PCI-DSS', 'CIS-Controls'];
const ZT_KEYS = ['mfaEnforced', 'deviceTrustEnabled', 'networkMicroSegmented', 'leastPrivilegeIam', 'continuousVerification', 'encryptedInTransit', 'encryptedAtRest', 'pam', 'siem', 'edr'];
const PIPE_KEYS = ['hasSAST', 'hasDASTStaging', 'hasSecretsScanning', 'hasDependencyReview', 'hasSBOM', 'hasContainerScanning', 'hasIACScanning', 'hasSLSAProvenance', 'hasSignedArtifacts', 'hasMinimumReviewers', 'hasBranchProtection', 'hasPinnedDependencies'];

type Tri = 'on' | 'off' | 'unset';

function TriToggle({ value, onChange }: { value: Tri; onChange: (v: Tri) => void }) {
  return (
    <div className="tri">
      <button type="button" className={value === 'on' ? 'on' : ''} onClick={() => onChange('on')}>On</button>
      <button type="button" className={value === 'off' ? 'off' : ''} onClick={() => onChange('off')}>Off</button>
      <button type="button" className={value === 'unset' ? 'unset' : ''} onClick={() => onChange('unset')}>Unset</button>
    </div>
  );
}

/** Build a boolean map from tri-state, OMITTING unset keys (unset ≠ off in scoring). */
function triMapToParams(state: Record<string, Tri>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(state)) {
    if (v === 'on') out[k] = true;
    else if (v === 'off') out[k] = false;
    // 'unset' → omit entirely
  }
  return out;
}

const emptyAi = (): AISystemProfile => ({
  name: '', type: 'llm', deployment: 'saas-api', dataClasses: [],
  internetFacing: false, usesExternalModels: false, hasAgentCapabilities: false, hasRAG: false,
  trainingDataSource: 'internal', humanOversight: 'full', regulatoryScope: [],
});

export default function NewReviewPage() {
  const nav = useNavigate();
  const [label, setLabel] = useState('New review');
  const [industry, setIndustry] = useState('');
  const [cloud, setCloud] = useState('');
  const [assets, setAssets] = useState('');
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<{ framework: string; controlId: string; status: string }[]>([]);
  const [zt, setZt] = useState<Record<string, Tri>>(Object.fromEntries(ZT_KEYS.map(k => [k, 'unset'])));
  const [pipe, setPipe] = useState<Record<string, Tri>>(Object.fromEntries(PIPE_KEYS.map(k => [k, 'unset'])));
  const [ais, setAis] = useState<AISystemProfile[]>([]);
  const [parallel, setParallel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleFramework = (f: string) =>
    setFrameworks(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const build = (): SecurityPostureReviewParams => {
    const complianceEvidence: NonNullable<SecurityPostureReviewParams['complianceEvidence']> = {};
    for (const row of evidence) {
      if (!row.framework || !row.controlId) continue;
      complianceEvidence[row.framework] ??= {};
      complianceEvidence[row.framework][row.controlId] = { status: row.status as 'compliant' | 'partial' | 'non-compliant' | 'not-applicable' };
    }
    const params: SecurityPostureReviewParams = {
      orgProfile: {
        ...(industry ? { industry } : {}),
        ...(cloud ? { cloudProvider: cloud } : {}),
        ...(assets.trim() ? { criticalAssets: assets.split(',').map(s => s.trim()).filter(Boolean) } : {}),
      },
      frameworks,
      zeroTrustPosture: triMapToParams(zt),
      pipelinePosture: triMapToParams(pipe),
    };
    if (Object.keys(complianceEvidence).length) params.complianceEvidence = complianceEvidence;
    if (ais.length) params.aiSystems = ais;
    return params;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate AI cards: every field required, name non-empty.
    for (const a of ais) {
      if (!a.name.trim()) { setError('Every AI system needs a name.'); return; }
    }
    setBusy(true);
    setError('');
    try {
      await api.createReview(build(), label, parallel);
      nav('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  };

  const updateAi = (i: number, patch: Partial<AISystemProfile>) =>
    setAis(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));

  return (
    <form onSubmit={submit}>
      <h2>New Security Posture Review</h2>

      <div className="panel form-section">
        <h3>Review</h3>
        <div className="form-row"><label>Label</label><input value={label} onChange={e => setLabel(e.target.value)} /></div>
        <div className="form-row">
          <label>Execution</label>
          <label className="muted"><input type="checkbox" checked={parallel} onChange={e => setParallel(e.target.checked)} /> Run specialists in parallel (fast)</label>
        </div>
      </div>

      <div className="panel form-section">
        <h3>Organisation</h3>
        <div className="form-row"><label>Industry</label><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. fintech" /></div>
        <div className="form-row"><label>Cloud provider</label>
          <select value={cloud} onChange={e => setCloud(e.target.value)}>
            <option value="">—</option><option>AWS</option><option>GCP</option><option>Azure</option><option>multi-cloud</option>
          </select>
        </div>
        <div className="form-row"><label>Critical assets (comma-separated)</label><input value={assets} onChange={e => setAssets(e.target.value)} placeholder="payment-api, customer-db" style={{ flex: 1 }} /></div>
      </div>

      <div className="panel form-section">
        <h3>Compliance Frameworks</h3>
        <div className="form-row">
          {FRAMEWORKS.map(f => (
            <label key={f} className="muted"><input type="checkbox" checked={frameworks.includes(f)} onChange={() => toggleFramework(f)} /> {f}</label>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12 }}>Optional per-control evidence — any control you don't list defaults to non-compliant.</p>
        {evidence.map((row, i) => (
          <div className="form-row" key={i}>
            <select value={row.framework} onChange={e => setEvidence(ev => ev.map((r, idx) => idx === i ? { ...r, framework: e.target.value } : r))}>
              <option value="">framework…</option>
              {frameworks.map(f => <option key={f}>{f}</option>)}
            </select>
            <input placeholder="control id (e.g. CC6.1)" value={row.controlId} onChange={e => setEvidence(ev => ev.map((r, idx) => idx === i ? { ...r, controlId: e.target.value } : r))} />
            <select value={row.status} onChange={e => setEvidence(ev => ev.map((r, idx) => idx === i ? { ...r, status: e.target.value } : r))}>
              <option>compliant</option><option>partial</option><option>non-compliant</option><option>not-applicable</option>
            </select>
            <button type="button" onClick={() => setEvidence(ev => ev.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setEvidence(ev => [...ev, { framework: '', controlId: '', status: 'compliant' }])}>+ Add control evidence</button>
      </div>

      <div className="panel form-section">
        <h3>Zero-Trust Controls</h3>
        <p className="muted" style={{ fontSize: 12 }}>Unset = not assessed (treated as missing). Off = present but incomplete (partial).</p>
        {ZT_KEYS.map(k => (
          <div className="form-row" key={k}><label>{k}</label><TriToggle value={zt[k]} onChange={v => setZt(s => ({ ...s, [k]: v }))} /></div>
        ))}
      </div>

      <div className="panel form-section">
        <h3>CI/CD Pipeline Controls</h3>
        {PIPE_KEYS.map(k => (
          <div className="form-row" key={k}><label>{k}</label><TriToggle value={pipe[k]} onChange={v => setPipe(s => ({ ...s, [k]: v }))} /></div>
        ))}
      </div>

      <div className="panel form-section">
        <h3>AI / LLM Systems</h3>
        {ais.map((a, i) => (
          <div className="panel" style={{ marginBottom: 12, background: 'var(--panel-2)' }} key={i}>
            <div className="form-row"><label>Name</label><input value={a.name} onChange={e => updateAi(i, { name: e.target.value })} /></div>
            <div className="form-row"><label>Type</label>
              <select value={a.type} onChange={e => updateAi(i, { type: e.target.value as AISystemProfile['type'] })}>
                {['llm', 'ml-classifier', 'cv-model', 'recommendation', 'autonomous-agent', 'rag-system', 'multi-modal'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Deployment</label>
              <select value={a.deployment} onChange={e => updateAi(i, { deployment: e.target.value as AISystemProfile['deployment'] })}>
                {['saas-api', 'self-hosted', 'on-premise', 'edge'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Data classes (comma-separated)</label><input value={a.dataClasses.join(', ')} onChange={e => updateAi(i, { dataClasses: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={{ flex: 1 }} /></div>
            <div className="form-row"><label>Training data</label>
              <select value={a.trainingDataSource} onChange={e => updateAi(i, { trainingDataSource: e.target.value as AISystemProfile['trainingDataSource'] })}>
                {['internal', 'public', 'third-party', 'mixed'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Human oversight</label>
              <select value={a.humanOversight} onChange={e => updateAi(i, { humanOversight: e.target.value as AISystemProfile['humanOversight'] })}>
                {['full', 'partial', 'none'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-row"><label>Regulatory scope (comma-separated)</label><input value={a.regulatoryScope.join(', ')} onChange={e => updateAi(i, { regulatoryScope: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={{ flex: 1 }} /></div>
            <div className="form-row" style={{ gap: 16 }}>
              <label className="muted"><input type="checkbox" checked={a.internetFacing} onChange={e => updateAi(i, { internetFacing: e.target.checked })} /> internet-facing</label>
              <label className="muted"><input type="checkbox" checked={a.usesExternalModels} onChange={e => updateAi(i, { usesExternalModels: e.target.checked })} /> external model</label>
              <label className="muted"><input type="checkbox" checked={a.hasAgentCapabilities} onChange={e => updateAi(i, { hasAgentCapabilities: e.target.checked })} /> agent/tools</label>
              <label className="muted"><input type="checkbox" checked={a.hasRAG} onChange={e => updateAi(i, { hasRAG: e.target.checked })} /> RAG</label>
            </div>
            <button type="button" onClick={() => setAis(prev => prev.filter((_, idx) => idx !== i))}>Remove system</button>
          </div>
        ))}
        <button type="button" onClick={() => setAis(prev => [...prev, emptyAi()])}>+ Add AI system</button>
      </div>

      {error && <div className="callout">{error}</div>}
      <div className="form-row">
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Running review…' : 'Run posture review'}</button>
      </div>
    </form>
  );
}
