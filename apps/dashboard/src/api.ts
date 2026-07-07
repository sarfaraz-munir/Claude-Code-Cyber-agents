import type {
  SecurityPostureReport,
  SecurityPostureReviewParams,
  PostureTrend,
  ArchitectureReviewFinding,
  PipelineSecurityFinding,
} from 'ciso-agents';

export interface StoredRun {
  id: string;
  label: string;
  savedAt: string;
  report: SecurityPostureReport;
  params: SecurityPostureReviewParams;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (res.status === 401) {
    // Session expired / not logged in — bounce to login unless we're already there.
    if (!location.pathname.startsWith('/login')) location.assign('/login');
    throw new ApiError(401, 'authentication required');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async login(password: string): Promise<void> {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.status === 429) throw new ApiError(429, 'Too many attempts. Wait a few minutes and try again.');
    if (!res.ok) throw new ApiError(res.status, 'Invalid password.');
  },
  logout: () => req<{ ok: true }>('/logout', { method: 'POST' }),
  getHistory: () => req<{ runs: StoredRun[]; trend: PostureTrend }>('/history'),
  getReview: (id: string) => req<{ run: StoredRun }>(`/reviews/${id}`),
  createReview: (params: SecurityPostureReviewParams, label: string, parallel = false) =>
    req<{ run: StoredRun }>('/reviews', { method: 'POST', body: JSON.stringify({ params, label, parallel }) }),
  whatIf: (params: SecurityPostureReviewParams) =>
    req<{ report: SecurityPostureReport }>('/whatif', { method: 'POST', body: JSON.stringify({ params }) }),
  getArchitecture: (id: string) => req<{ findings: ArchitectureReviewFinding[] }>(`/reviews/${id}/architecture`),
  getPipeline: (id: string) => req<{ findings: PipelineSecurityFinding[] }>(`/reviews/${id}/pipeline`),
  getSwarm: () => req<{ agents: Record<string, { name: string; status: string }> }>('/swarm'),
  markdownUrl: (id: string) => `/api/reviews/${id}/markdown`,
};

export { ApiError };
