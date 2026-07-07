import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { api } from './api.ts';
import LoginPage from './auth/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import NewReviewPage from './pages/NewReviewPage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';

function AgentsStrip() {
  const [agents, setAgents] = useState<Record<string, { name: string; status: string }>>({});
  useEffect(() => {
    api.getSwarm().then(s => setAgents(s.agents)).catch(() => {});
  }, []);
  const entries = Object.values(agents);
  if (!entries.length) return null;
  return (
    <div className="agents">
      {entries.map(a => (
        <span className="chip" key={a.name}>
          <span className={`dot ${a.status === 'busy' ? 'busy' : 'idle'}`} />
          {a.name}
        </span>
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const doLogout = async () => {
    await api.logout().catch(() => {});
    nav('/login');
  };
  return (
    <>
      <div className="nav">
        <span className="brand">🛡 CISO Posture</span>
        <Link to="/">Dashboard</Link>
        <Link to="/new">New Review</Link>
        <Link to="/history">History</Link>
        <span className="spacer" />
        <AgentsStrip />
        <button onClick={doLogout} className="no-print">Log out</button>
      </div>
      <div className="container">{children}</div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Shell><DashboardPage /></Shell>} />
      <Route path="/new" element={<Shell><NewReviewPage /></Shell>} />
      <Route path="/history" element={<Shell><HistoryPage /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
