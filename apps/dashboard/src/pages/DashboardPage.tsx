import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StoredRun } from '../api.ts';
import ScoreGauge from '../components/ScoreGauge.tsx';
import ScoreExplainer from '../components/ScoreExplainer.tsx';
import KpiCards from '../components/KpiCards.tsx';
import RiskTable from '../components/RiskTable.tsx';
import CompliancePanel from '../components/CompliancePanel.tsx';
import VulnPanel from '../components/VulnPanel.tsx';
import ArchitecturePanel from '../components/ArchitecturePanel.tsx';
import PipelinePanel from '../components/PipelinePanel.tsx';
import AiFindingsPanel from '../components/AiFindingsPanel.tsx';
import RoadmapTimeline from '../components/RoadmapTimeline.tsx';
import WhatIfPanel from '../components/WhatIfPanel.tsx';
import ExportButton from '../components/ExportButton.tsx';

const TABS = ['Overview', 'Compliance', 'Risks', 'Vulnerabilities', 'Architecture', 'Pipeline', 'AI/LLM', 'Roadmap', 'What-If'] as const;
type Tab = typeof TABS[number];

export default function DashboardPage() {
  const [run, setRun] = useState<StoredRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Overview');

  const load = () => {
    setLoading(true);
    api.getHistory().then(h => setRun(h.runs[0] ?? null)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <p className="muted">Loading…</p>;
  if (!run) {
    return (
      <div className="panel">
        <h3>No reviews yet</h3>
        <p className="muted">Run your first security posture review to populate the dashboard.</p>
        <Link to="/new"><button className="primary">+ New Review</button></Link>
      </div>
    );
  }

  const report = run.report;
  return (
    <>
      <div className="form-row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{run.label}</h2>
        <ExportButton runId={run.id} />
      </div>
      <p className="muted">Generated {new Date(report.generatedAt).toLocaleString()}</p>

      <div className="tabs no-print">
        {TABS.map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid" style={{ gap: 16 }}>
          <div className="grid cols-2">
            <ScoreGauge score={report.overallScore} maturityLevel={report.maturityLevel} />
            <ScoreExplainer report={report} />
          </div>
          <KpiCards kpis={report.kpis} />
          <RoadmapTimeline roadmap={report.roadmap} />
        </div>
      )}
      {tab === 'Compliance' && <CompliancePanel reports={report.complianceReports} />}
      {tab === 'Risks' && <RiskTable risks={report.riskRegister} />}
      {tab === 'Vulnerabilities' && <VulnPanel vulns={report.vulnerabilities} />}
      {tab === 'Architecture' && <ArchitecturePanel runId={run.id} />}
      {tab === 'Pipeline' && <PipelinePanel runId={run.id} />}
      {tab === 'AI/LLM' && <AiFindingsPanel findings={report.aiSecurityFindings} />}
      {tab === 'Roadmap' && <RoadmapTimeline roadmap={report.roadmap} />}
      {tab === 'What-If' && <WhatIfPanel baseline={run} onSaved={load} />}
    </>
  );
}
