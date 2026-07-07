import { Router } from 'express';
import type { SecurityPostureReviewParams } from 'ciso-agents';
import { runReview, getSwarmStatus, reviewArchitecture, auditPipeline } from './orchestrator.ts';
import { history } from './history.ts';
import { createReviewSchema, whatIfSchema } from './validate.ts';
import { reportToMarkdown } from '../src/lib/report.ts';

export const api = Router();

// Create + persist a review.
api.post('/reviews', async (req, res) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid request', details: parsed.error.flatten() });
    return;
  }
  try {
    const params = parsed.data.params as SecurityPostureReviewParams;
    const report = await runReview(params, { parallel: parsed.data.parallel });
    const run = history.appendRun(report, parsed.data.label, params);
    res.json({ run });
  } catch (err) {
    // Engine throws e.g. on unknown framework — surface as 400, never 500.
    res.status(400).json({ error: err instanceof Error ? err.message : 'review failed' });
  }
});

// Non-persisted projection for the interactive what-if panel.
api.post('/whatif', async (req, res) => {
  const parsed = whatIfSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid request', details: parsed.error.flatten() });
    return;
  }
  try {
    const report = await runReview(parsed.data.params as SecurityPostureReviewParams, { parallel: true });
    res.json({ report });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'projection failed' });
  }
});

api.get('/history', (_req, res) => {
  res.json({ runs: history.listRuns(), trend: history.computeTrend() });
});

api.get('/reviews/:id', (req, res) => {
  const run = history.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json({ run });
});

api.get('/reviews/:id/markdown', (req, res) => {
  const run = history.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const md = reportToMarkdown(run.report, run.label);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="posture-${run.id}.md"`);
  res.send(md);
});

api.get('/reviews/:id/architecture', (req, res) => {
  const run = history.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json({ findings: reviewArchitecture(run.params.zeroTrustPosture ?? {}) });
});

api.get('/reviews/:id/pipeline', (req, res) => {
  const run = history.getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json({ findings: auditPipeline(run.params.pipelinePosture ?? {}) });
});

api.get('/swarm', (_req, res) => {
  res.json(getSwarmStatus());
});
