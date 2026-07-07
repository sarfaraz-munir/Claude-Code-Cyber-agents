import { z } from 'zod';

const FRAMEWORKS = ['SOC2-TypeII', 'ISO-27001', 'NIST-CSF', 'GDPR', 'HIPAA', 'PCI-DSS', 'CIS-Controls'] as const;

const evidenceEntry = z.object({
  status: z.enum(['compliant', 'partial', 'non-compliant', 'not-applicable']),
  evidence: z.string().optional(),
  gaps: z.array(z.string()).optional(),
});

const aiSystem = z.object({
  name: z.string().min(1),
  type: z.enum(['llm', 'ml-classifier', 'cv-model', 'recommendation', 'autonomous-agent', 'rag-system', 'multi-modal']),
  deployment: z.enum(['saas-api', 'self-hosted', 'on-premise', 'edge']),
  dataClasses: z.array(z.string()),
  internetFacing: z.boolean(),
  usesExternalModels: z.boolean(),
  hasAgentCapabilities: z.boolean(),
  hasRAG: z.boolean(),
  trainingDataSource: z.enum(['internal', 'public', 'third-party', 'mixed']),
  humanOversight: z.enum(['full', 'partial', 'none']),
  regulatoryScope: z.array(z.string()),
});

const riskFinding = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['strategic', 'operational', 'technical', 'compliance', 'supply-chain']),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  cveIds: z.array(z.string()).optional(),
  mitreAttackIds: z.array(z.string()).optional(),
});

// Zero-trust / pipeline controls: each key OPTIONAL. Omitted key = engine treats as "missing"
// (distinct from false = "partial"). The client must OMIT unset toggles, not send false.
const boolMap = (keys: string[]) =>
  z.object(Object.fromEntries(keys.map(k => [k, z.boolean().optional()]))).partial();

const zeroTrust = boolMap([
  'mfaEnforced', 'deviceTrustEnabled', 'networkMicroSegmented', 'leastPrivilegeIam',
  'continuousVerification', 'encryptedInTransit', 'encryptedAtRest', 'pam', 'siem', 'edr',
]);

const pipeline = boolMap([
  'hasSAST', 'hasDASTStaging', 'hasSecretsScanning', 'hasDependencyReview', 'hasSBOM',
  'hasContainerScanning', 'hasIACScanning', 'hasSLSAProvenance', 'hasSignedArtifacts',
  'hasMinimumReviewers', 'hasBranchProtection', 'hasPinnedDependencies',
]);

export const reviewParamsSchema = z.object({
  orgProfile: z.object({
    industry: z.string().optional(),
    employeeCount: z.number().optional(),
    cloudProvider: z.string().optional(),
    criticalAssets: z.array(z.string()).optional(),
  }).optional(),
  frameworks: z.array(z.enum(FRAMEWORKS)).optional(),
  complianceEvidence: z.record(z.record(evidenceEntry)).optional(),
  riskFindings: z.array(riskFinding).optional(),
  zeroTrustPosture: zeroTrust.optional(),
  pipelinePosture: pipeline.optional(),
  aiSystems: z.array(aiSystem).optional(),
});

export const createReviewSchema = z.object({
  params: reviewParamsSchema,
  label: z.string().default('Untitled review'),
  parallel: z.boolean().optional(),
});

export const whatIfSchema = z.object({
  params: reviewParamsSchema,
});
