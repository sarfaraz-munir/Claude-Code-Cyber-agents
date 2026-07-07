/**
 * CISO Swarm Plugin
 *
 * Implements ClaudeFlowPlugin to register the CISO orchestrator and all
 * specialist agent MCP tools with the Ruflo runtime.
 *
 * Topology: hierarchical (CISO queen → 9 specialist workers)
 * Consensus: raft
 */

import { CISOOrchestrator } from './ciso-orchestrator.js';
import { createMcpTools } from './mcp-tools.js';

export class CISOSwarmPlugin {
  readonly name = '@claude-flow/plugin-ciso-swarm';
  readonly version = '1.0.0';
  readonly description = 'CISO-grade cybersecurity swarm: hierarchical orchestrator with 9 specialist AI agents covering risk, compliance, threat intel, architecture, IR, vuln-mgmt, DevSecOps, awareness, and AI security';
  readonly author = 'Claude Flow Team';
  readonly dependencies = ['@claude-flow/security', '@claude-flow/memory'];

  private orchestrator: CISOOrchestrator | null = null;

  async initialize(context: { config?: Record<string, unknown>; log?: (msg: string) => void }) {
    const namespace = (context.config?.['namespace'] as string) ?? 'ciso-swarm';
    this.orchestrator = new CISOOrchestrator(namespace);
    context.log?.(`[CISO Swarm] Initialised — swarm ID: ${this.orchestrator.getSwarmStatus().swarmId}`);
    context.log?.(`[CISO Swarm] Topology: hierarchical | Consensus: raft | Agents: 10 (1 queen + 9 specialists)`);
  }

  getMcpTools() {
    if (!this.orchestrator) throw new Error('CISOSwarmPlugin not initialised');
    return createMcpTools(this.orchestrator);
  }

  getAgentTypes() {
    return [
      { type: 'ciso-queen',              description: 'CISO orchestrator — delegates, routes, and synthesises reports',       role: 'queen' },
      { type: 'risk-governance',         description: 'Risk registers, CVSS/FAIR scoring, risk treatment plans',              role: 'worker' },
      { type: 'compliance-audit',        description: 'SOC 2, ISO 27001, NIST CSF, GDPR, HIPAA, PCI-DSS gap analysis',       role: 'worker' },
      { type: 'threat-intelligence',     description: 'MITRE ATT&CK mapping, threat actor profiling, threat scenarios',       role: 'worker' },
      { type: 'security-architecture',   description: 'Zero trust, IAM, network segmentation, cloud posture review',          role: 'worker' },
      { type: 'incident-response',       description: 'IR playbooks, tabletop exercises, DFIR checklists',                   role: 'worker' },
      { type: 'vulnerability-management',description: 'CVE triage, EPSS scoring, patch plan generation',                     role: 'worker' },
      { type: 'devsecops',               description: 'SAST/DAST, SBOM, secrets scanning, pipeline hardening',               role: 'worker' },
      { type: 'security-awareness',      description: 'Training programmes, phishing simulations, security KPIs',            role: 'worker' },
      { type: 'ai-security',             description: 'LLM/ML threat modeling, OWASP LLM Top 10, MITRE ATLAS, AI governance', role: 'worker' },
      { type: 'red-team',                description: 'Offensive security: recon, exploitation simulation, lateral movement, detection gap analysis', role: 'worker' },
    ];
  }

  async shutdown() {
    this.orchestrator = null;
  }
}
