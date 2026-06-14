/**
 * CISO Swarm — MCP Tool Definitions
 *
 * Exposes all CISO swarm capabilities as MCP tools so they are available
 * to Claude Code, the web UI, and any MCP-compatible client.
 * Mirrors the pattern used by @claude-flow/plugin-agent-federation.
 */

import { CISOOrchestrator } from './ciso-orchestrator.js';
import type { ComplianceFramework } from './types.js';
import type { AISystemProfile } from './agents/ai-security.js';

export function createMcpTools(orchestrator: CISOOrchestrator) {
  return [

    // ── Swarm management ───────────────────────────────────────────────────────

    {
      name: 'ciso_swarm_status',
      description: 'Get the current status of the CISO swarm — all agent states, active tasks, and last activity.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async handler() {
        return orchestrator.getSwarmStatus();
      },
    },

    // ── Full posture review ────────────────────────────────────────────────────

    {
      name: 'ciso_security_posture_review',
      description: [
        'Run a full enterprise security posture review.',
        'The CISO queen delegates to all specialist agents in parallel:',
        '  • Risk & Governance → risk register',
        '  • Compliance & Audit → gap analysis per framework',
        '  • Threat Intelligence → MITRE ATT&CK scenarios',
        '  • Security Architecture → zero-trust assessment',
        '  • Vulnerability Management → CVE triage',
        '  • DevSecOps → pipeline audit',
        '  • Security Awareness → KPI dashboard',
        'Outputs a unified SecurityPostureReport with executive summary and roadmap.',
      ].join('\n'),
      inputSchema: {
        type: 'object',
        properties: {
          orgProfile: {
            type: 'object',
            description: 'Organisation profile',
            properties: {
              industry:       { type: 'string', description: 'e.g. technology, healthcare, finance, retail' },
              employeeCount:  { type: 'number' },
              cloudProvider:  { type: 'string', description: 'AWS | GCP | Azure | multi-cloud' },
              criticalAssets: { type: 'array', items: { type: 'string' } },
            },
          },
          frameworks: {
            type: 'array',
            items: { type: 'string', enum: ['SOC2-TypeII','ISO-27001','NIST-CSF','GDPR','HIPAA','PCI-DSS','CIS-Controls'] },
            description: 'Compliance frameworks to include in gap analysis',
          },
          zeroTrustPosture: {
            type: 'object',
            description: 'Current zero-trust control implementation status (true/false per control)',
            properties: {
              mfaEnforced:              { type: 'boolean' },
              deviceTrustEnabled:       { type: 'boolean' },
              networkMicroSegmented:    { type: 'boolean' },
              leastPrivilegeIam:        { type: 'boolean' },
              continuousVerification:   { type: 'boolean' },
              encryptedInTransit:       { type: 'boolean' },
              encryptedAtRest:          { type: 'boolean' },
              pam:                      { type: 'boolean' },
              siem:                     { type: 'boolean' },
              edr:                      { type: 'boolean' },
            },
          },
          pipelinePosture: {
            type: 'object',
            description: 'CI/CD pipeline security control implementation',
            properties: {
              hasSAST:                 { type: 'boolean' },
              hasDASTStaging:          { type: 'boolean' },
              hasSecretsScanning:      { type: 'boolean' },
              hasDependencyReview:     { type: 'boolean' },
              hasSBOM:                 { type: 'boolean' },
              hasContainerScanning:    { type: 'boolean' },
              hasIACScanning:          { type: 'boolean' },
              hasBranchProtection:     { type: 'boolean' },
              hasMinimumReviewers:     { type: 'boolean' },
              hasPinnedDependencies:   { type: 'boolean' },
            },
          },
          vulnerabilities: {
            type: 'array',
            description: 'Known vulnerabilities to triage',
            items: {
              type: 'object',
              required: ['cveId', 'title', 'cvssScore', 'affectedAssets', 'exploitAvailable', 'exploitedInWild', 'patchAvailable'],
              properties: {
                cveId:            { type: 'string' },
                title:            { type: 'string' },
                cvssScore:        { type: 'number', minimum: 0, maximum: 10 },
                epssScore:        { type: 'number', minimum: 0, maximum: 1 },
                affectedAssets:   { type: 'array', items: { type: 'string' } },
                exploitAvailable: { type: 'boolean' },
                exploitedInWild:  { type: 'boolean' },
                patchAvailable:   { type: 'boolean' },
              },
            },
          },
        },
      },
      async handler(input: Record<string, unknown>) {
        return orchestrator.runSecurityPostureReview(input as Parameters<typeof orchestrator.runSecurityPostureReview>[0]);
      },
    },

    // ── Risk management ────────────────────────────────────────────────────────

    {
      name: 'ciso_risk_assessment',
      description: 'Build a prioritised risk register from a list of findings. Scores each risk with likelihood × impact, assigns severity, and outputs a remediation roadmap.',
      inputSchema: {
        type: 'object',
        required: ['findings'],
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'description', 'category', 'likelihood', 'impact'],
              properties: {
                title:           { type: 'string' },
                description:     { type: 'string' },
                category:        { type: 'string', enum: ['strategic','operational','technical','compliance','supply-chain'] },
                likelihood:      { type: 'number', minimum: 1, maximum: 5 },
                impact:          { type: 'number', minimum: 1, maximum: 5 },
                cveIds:          { type: 'array', items: { type: 'string' } },
                mitreAttackIds:  { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      async handler(input: { findings: Parameters<CISOOrchestrator['runRiskAssessment']>[0] }) {
        const register  = orchestrator.runRiskAssessment(input.findings);
        return { riskRegister: register, roadmap: orchestrator['riskAgent'].generateRoadmap(register), executiveSummary: orchestrator['riskAgent'].buildExecutiveSummary(register) };
      },
    },

    // ── Compliance ─────────────────────────────────────────────────────────────

    {
      name: 'ciso_compliance_gap_analysis',
      description: 'Run a compliance gap analysis against a named framework. Returns control-by-control status, compliance score, critical gaps, and a remediation roadmap.',
      inputSchema: {
        type: 'object',
        required: ['framework'],
        properties: {
          framework: { type: 'string', enum: ['SOC2-TypeII','ISO-27001','NIST-CSF','GDPR','HIPAA','PCI-DSS','CIS-Controls'] },
          evidence: {
            type: 'object',
            description: 'Map of control ID → evidence. Keys are control IDs (e.g. "CC6.1"). Omit a control to default it to non-compliant.',
            additionalProperties: {
              type: 'object',
              properties: {
                status:   { type: 'string', enum: ['compliant','partial','non-compliant','not-applicable'] },
                evidence: { type: 'string' },
                gaps:     { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      async handler(input: { framework: ComplianceFramework; evidence?: Record<string, unknown> }) {
        const report = orchestrator.runComplianceGapAnalysis(input.framework, input.evidence ?? {});
        return { report, formatted: orchestrator['complianceAgent'].formatReport(report) };
      },
    },

    // ── Threat intelligence ────────────────────────────────────────────────────

    {
      name: 'ciso_threat_model',
      description: 'Build a threat scenario with MITRE ATT&CK technique mapping, detection controls, and mitigations.',
      inputSchema: {
        type: 'object',
        required: ['title', 'description', 'affectedAssets', 'attackVector'],
        properties: {
          title:          { type: 'string' },
          description:    { type: 'string' },
          affectedAssets: { type: 'array', items: { type: 'string' } },
          attackVector:   { type: 'string' },
          symptoms:       { type: 'array', items: { type: 'string' }, description: 'Known technique IDs or behaviour keywords' },
          actorId:        { type: 'string', description: 'MITRE ATT&CK group ID e.g. G0007 for APT28' },
        },
      },
      async handler(input: Parameters<CISOOrchestrator['runThreatModeling']>[0]) {
        return orchestrator.runThreatModeling(input);
      },
    },

    {
      name: 'ciso_threat_actors',
      description: 'List known threat actor profiles with motivations, targets, and TTPs.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async handler() {
        return orchestrator['threatAgent'].getThreatActors();
      },
    },

    // ── Architecture ───────────────────────────────────────────────────────────

    {
      name: 'ciso_architecture_review',
      description: 'Assess zero-trust architecture posture across Identity, Device, Network, Data, and Detection domains.',
      inputSchema: {
        type: 'object',
        properties: {
          mfaEnforced:            { type: 'boolean' },
          deviceTrustEnabled:     { type: 'boolean' },
          networkMicroSegmented:  { type: 'boolean' },
          leastPrivilegeIam:      { type: 'boolean' },
          continuousVerification: { type: 'boolean' },
          encryptedInTransit:     { type: 'boolean' },
          encryptedAtRest:        { type: 'boolean' },
          pam:                    { type: 'boolean' },
          siem:                   { type: 'boolean' },
          edr:                    { type: 'boolean' },
        },
      },
      async handler(input: Parameters<CISOOrchestrator['runArchitectureReview']>[0]) {
        const findings = orchestrator.runArchitectureReview(input);
        const remediations = orchestrator['archAgent'].generateArchitectureRemediations(findings);
        return { findings, remediations };
      },
    },

    {
      name: 'ciso_cloud_security_checklist',
      description: 'Generate a cloud security hardening checklist for AWS, GCP, Azure, or multi-cloud.',
      inputSchema: {
        type: 'object',
        required: ['cloudProvider'],
        properties: {
          cloudProvider: { type: 'string', enum: ['AWS','GCP','Azure','multi-cloud'] },
        },
      },
      async handler(input: { cloudProvider: 'AWS' | 'GCP' | 'Azure' | 'multi-cloud' }) {
        return orchestrator['archAgent'].buildCloudSecurityChecklist(input.cloudProvider);
      },
    },

    // ── Incident response ──────────────────────────────────────────────────────

    {
      name: 'ciso_incident_playbook',
      description: 'Get a step-by-step incident response playbook. Supported types: ransomware, data-breach, insider-threat.',
      inputSchema: {
        type: 'object',
        required: ['incidentType'],
        properties: {
          incidentType: { type: 'string', enum: ['ransomware','data-breach','insider-threat'] },
        },
      },
      async handler(input: { incidentType: string }) {
        const pb = orchestrator.getIncidentPlaybook(input.incidentType);
        return { playbook: pb, formatted: orchestrator['irAgent'].formatPlaybook(pb) };
      },
    },

    {
      name: 'ciso_tabletop_exercise',
      description: 'Generate a tabletop exercise script with injects, discussion questions, and objectives for a given incident scenario.',
      inputSchema: {
        type: 'object',
        required: ['scenario', 'severity'],
        properties: {
          scenario: { type: 'string', description: 'e.g. "Ransomware attack on production database"' },
          severity: { type: 'string', enum: ['critical','high','medium','low','informational'] },
        },
      },
      async handler(input: { scenario: string; severity: Parameters<CISOOrchestrator['buildTabletopExercise']>[1] }) {
        return orchestrator.buildTabletopExercise(input.scenario, input.severity);
      },
    },

    // ── Vulnerability management ───────────────────────────────────────────────

    {
      name: 'ciso_vulnerability_triage',
      description: 'Triage a list of CVEs using CVSS + EPSS scores. Returns prioritised patch plan with deadline waves.',
      inputSchema: {
        type: 'object',
        required: ['vulnerabilities'],
        properties: {
          vulnerabilities: {
            type: 'array',
            items: {
              type: 'object',
              required: ['cveId','title','cvssScore','affectedAssets','exploitAvailable','exploitedInWild','patchAvailable'],
              properties: {
                cveId:            { type: 'string' },
                title:            { type: 'string' },
                cvssScore:        { type: 'number' },
                epssScore:        { type: 'number' },
                affectedAssets:   { type: 'array', items: { type: 'string' } },
                exploitAvailable: { type: 'boolean' },
                exploitedInWild:  { type: 'boolean' },
                patchAvailable:   { type: 'boolean' },
              },
            },
          },
        },
      },
      async handler(input: { vulnerabilities: Parameters<CISOOrchestrator['runVulnerabilityTriage']>[0] }) {
        const vulns = orchestrator.runVulnerabilityTriage(input.vulnerabilities);
        const prioritised = orchestrator['vulnAgent'].prioritise(vulns);
        const patchPlan = orchestrator['vulnAgent'].buildPatchPlan(prioritised);
        return {
          prioritisedVulnerabilities: prioritised,
          patchPlan,
          report: orchestrator['vulnAgent'].buildReport(vulns),
        };
      },
    },

    // ── DevSecOps ──────────────────────────────────────────────────────────────

    {
      name: 'ciso_devsecops_audit',
      description: 'Audit CI/CD pipeline security controls. Returns findings with severity and recommendations.',
      inputSchema: {
        type: 'object',
        properties: {
          hasSAST:               { type: 'boolean' },
          hasDASTStaging:        { type: 'boolean' },
          hasSecretsScanning:    { type: 'boolean' },
          hasDependencyReview:   { type: 'boolean' },
          hasSBOM:               { type: 'boolean' },
          hasContainerScanning:  { type: 'boolean' },
          hasIACScanning:        { type: 'boolean' },
          hasSLSAProvenance:     { type: 'boolean' },
          hasSignedArtifacts:    { type: 'boolean' },
          hasMinimumReviewers:   { type: 'boolean' },
          hasBranchProtection:   { type: 'boolean' },
          hasPinnedDependencies: { type: 'boolean' },
        },
      },
      async handler(input: Parameters<CISOOrchestrator['auditDevSecOpsPipeline']>[0]) {
        const findings = orchestrator.auditDevSecOpsPipeline(input);
        return {
          findings,
          summary: orchestrator['devSecOpsAgent'].summariseFindings(findings),
          secureTemplate: orchestrator.getSecureDevSecOpsTemplate(),
        };
      },
    },

    // ── AI Security ────────────────────────────────────────────────────────────

    {
      name: 'ciso_ai_system_assessment',
      description: [
        'Assess the security posture of an AI/ML system.',
        'Maps threats to OWASP LLM Top 10 and MITRE ATLAS.',
        'Covers: prompt injection, data leakage, excessive agency, training-data poisoning, supply chain, model theft, and human-oversight gaps.',
        'Returns findings with severity, regulatory implications (GDPR, EU AI Act, HIPAA), and mitigation controls.',
      ].join('\n'),
      inputSchema: {
        type: 'object',
        required: ['name', 'type', 'deployment', 'dataClasses', 'internetFacing', 'usesExternalModels', 'hasAgentCapabilities', 'hasRAG', 'trainingDataSource', 'humanOversight', 'regulatoryScope'],
        properties: {
          name:                { type: 'string', description: 'System name, e.g. "Customer Support Chatbot"' },
          type:                { type: 'string', enum: ['llm','ml-classifier','cv-model','recommendation','autonomous-agent','rag-system','multi-modal'] },
          deployment:          { type: 'string', enum: ['saas-api','self-hosted','on-premise','edge'] },
          dataClasses:         { type: 'array', items: { type: 'string' }, description: 'e.g. ["PII","PHI","financial","confidential-ip"]' },
          internetFacing:      { type: 'boolean' },
          usesExternalModels:  { type: 'boolean', description: 'True if calling OpenAI, Anthropic, Gemini, etc.' },
          hasAgentCapabilities:{ type: 'boolean', description: 'True if AI can take actions: send email, write DB, call APIs' },
          hasRAG:              { type: 'boolean' },
          trainingDataSource:  { type: 'string', enum: ['internal','public','third-party','mixed'] },
          humanOversight:      { type: 'string', enum: ['full','partial','none'] },
          regulatoryScope:     { type: 'array', items: { type: 'string' }, description: 'e.g. ["GDPR","HIPAA","EU-AI-ACT-HIGH-RISK"]' },
        },
      },
      async handler(input: AISystemProfile) {
        const findings = orchestrator.assessAISystem(input);
        return {
          findings,
          report: orchestrator['aiSecAgent'].formatThreatReport(findings),
          remediations: orchestrator['aiSecAgent'].buildAISecurityRemediations(findings),
        };
      },
    },

    {
      name: 'ciso_ai_red_team_plan',
      description: 'Generate an AI red team exercise plan for a given AI system. Covers prompt injection, data extraction, agentic abuse, adversarial evasion, and supply chain integrity tests. Includes safety constraints and reporting requirements.',
      inputSchema: {
        type: 'object',
        required: ['name', 'type', 'deployment', 'dataClasses', 'internetFacing', 'usesExternalModels', 'hasAgentCapabilities', 'hasRAG', 'trainingDataSource', 'humanOversight', 'regulatoryScope'],
        properties: {
          name:                { type: 'string' },
          type:                { type: 'string', enum: ['llm','ml-classifier','cv-model','recommendation','autonomous-agent','rag-system','multi-modal'] },
          deployment:          { type: 'string', enum: ['saas-api','self-hosted','on-premise','edge'] },
          dataClasses:         { type: 'array', items: { type: 'string' } },
          internetFacing:      { type: 'boolean' },
          usesExternalModels:  { type: 'boolean' },
          hasAgentCapabilities:{ type: 'boolean' },
          hasRAG:              { type: 'boolean' },
          trainingDataSource:  { type: 'string', enum: ['internal','public','third-party','mixed'] },
          humanOversight:      { type: 'string', enum: ['full','partial','none'] },
          regulatoryScope:     { type: 'array', items: { type: 'string' } },
        },
      },
      async handler(input: AISystemProfile) {
        return orchestrator.buildAIRedTeamPlan(input);
      },
    },

    {
      name: 'ciso_ai_governance_assessment',
      description: 'Assess AI governance posture against NIST AI RMF, EU AI Act, and ISO/IEC 42001. Returns gap analysis with recommendations and framework citations.',
      inputSchema: {
        type: 'object',
        properties: {
          hasAIInventory:              { type: 'boolean' },
          hasAIRiskPolicy:             { type: 'boolean' },
          hasAIImpactAssessment:       { type: 'boolean' },
          hasAIIncidentResponse:       { type: 'boolean' },
          hasRedTeamProgramme:         { type: 'boolean' },
          hasDataGovernanceForAI:      { type: 'boolean' },
          hasModelVersionControl:      { type: 'boolean' },
          hasAUPForAI:                 { type: 'boolean' },
          hasVendorRiskForAI:          { type: 'boolean' },
          hasHumanOversightPolicy:     { type: 'boolean' },
          hasExplainabilityRequirements:{ type: 'boolean' },
          hasBiasMonitoring:           { type: 'boolean' },
        },
      },
      async handler(input: Parameters<CISOOrchestrator['assessAIGovernance']>[0]) {
        return orchestrator.assessAIGovernance(input);
      },
    },

    {
      name: 'ciso_shadow_ai_inventory',
      description: 'Get a categorised inventory of common shadow AI risks: consumer LLM tools, AI code assistants, browser extensions, AI in SaaS, and more. Each entry includes detection methods and remediation guidance.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async handler() {
        return orchestrator.getShadowAIInventory();
      },
    },

    {
      name: 'ciso_owasp_llm_top10',
      description: 'Get the OWASP LLM Top 10 threat catalogue with descriptions, examples, and MITRE ATLAS identifiers.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async handler() {
        return orchestrator.getOWASPLLMTop10();
      },
    },

    {
      name: 'ciso_mitre_atlas',
      description: 'Get MITRE ATLAS adversarial ML technique catalogue for AI/ML threat modeling.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async handler() {
        return orchestrator.getMitreAtlasTechniques();
      },
    },

    {
      name: 'ciso_ai_governance_frameworks',
      description: 'Get structured reference for AI governance frameworks: NIST AI RMF, EU AI Act, and ISO/IEC 42001 — controls, requirements, and risk tiers.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async handler() {
        return orchestrator.getAIGovernanceFrameworks();
      },
    },

    // ── Security awareness ─────────────────────────────────────────────────────

    {
      name: 'ciso_awareness_programme',
      description: 'Get the full security awareness training programme with modules, KPIs, and phishing simulation templates.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async handler() {
        return {
          modules: orchestrator.getSecurityAwarenessProgramme(),
          phishingSimulations: orchestrator.getPhishingSimulations(),
          kpiDashboard: orchestrator['awarenessAgent'].buildKPIDashboard(),
          programmeSummary: orchestrator['awarenessAgent'].formatProgrammeSummary(),
        };
      },
    },
  ];
}
