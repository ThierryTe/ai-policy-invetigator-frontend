/** Wire contracts inspected against backend Phase 4 controllers, 2026-10-27. */
export type Role = 'VIEWER' | 'ANALYST' | 'REVIEWER' | 'ADMIN';
export interface Identity {
  user: { id: string; organizationId: string; email: string };
  memberships: { department_id: string; department_name: string; role: Role }[];
}
export interface LoginResponse {
  token: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
export interface Policy {
  id: string;
  organizationId: string;
  departmentId: string;
  title: string;
  kind: 'POLICY' | 'PROCEDURE';
  externalProcessingAllowed: boolean;
}
export interface Version {
  id: string;
  policy_id: string;
  sequence: number;
  previous_id: string | null;
  effective_date: string;
  filename: string;
  sha256: string;
  status: string;
  created_at: string;
  job_id: string;
  job_status: string;
  stage: string;
  error_code: string | null;
}
export interface Upload {
  policyId: string;
  versionId: string;
  jobId: string;
  status: string;
}
export interface IngestionJob {
  id: string;
  version_id: string;
  policy_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  stage: string;
  error_code: string | null;
  attempts: number;
}
export type JobState = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
export interface Progress {
  id: string;
  state: JobState;
  stage: string;
  error_code: string | null;
  attempts: number;
  calls: number;
  metered_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
}
export type Classification = 'CONTRADICTION' | 'MISSING_REQUIREMENT' | 'AMBIGUITY' | 'NO_CONFLICT';
export interface Reference {
  sourceId: string;
  quote: string;
}
export interface Requirement {
  id: string;
  actor: string | null;
  action: string | null;
  obligation: string | null;
  condition: string | null;
  scope: string | null;
  deadline: string | null;
  exceptions: string[] | null;
  effectiveDate: string | null;
  unknownFields: string[];
  sourceReferences: Reference[];
}
export interface Extraction {
  version_id: string;
  payload: {
    requirements: Requirement[];
    processedSourceIds: string[];
    complete: boolean;
    limitations: string[];
  };
  model: string;
  prompt_version: string;
  schema_version: string;
}
export interface Finding {
  id: string;
  policyRequirementId: string;
  procedureVersionId: string;
  relatedProcedureRequirementIds: string[];
  classification: Classification;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  rationale: string;
  suggestedAction: string | null;
  scopeExplanation: string;
  sourceReferences: Reference[];
  reviewStatus: 'PENDING_REVIEW' | 'NOT_REQUIRED';
}
export type ReviewAction = 'CONFIRM' | 'DISMISS' | 'ADD_NOTE';
export interface ReviewEvent {
  id: string;
  findingId: string;
  reviewerId: string;
  action: ReviewAction;
  note: string | null;
  createdAt: string;
}
export interface ReviewState {
  findingId: string;
  status: 'PENDING_REVIEW' | 'NOT_REQUIRED' | 'CONFIRMED' | 'DISMISSED';
  history: ReviewEvent[];
}
export interface Change {
  baselineRequirementId: string | null;
  replacementRequirementId: string | null;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  reason: string;
  sourceReferences: Reference[];
}
export interface Findings {
  payload?: { changes: Change[]; assessments: Finding[]; complete: boolean; limitations: string[] };
  complete?: false;
  changes?: [];
  assessments?: [];
  progress?: Progress;
  model?: string;
  prompt_version?: string;
  schema_version?: string;
  canReview: boolean;
  reviews: ReviewState[];
}
export type NodeType = 'BASELINE' | 'REPLACEMENT' | 'PROCEDURE' | 'REQUIREMENT' | 'FINDING';
export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  versionId: string;
  classification: Classification | null;
  severity: string | null;
}
export interface GraphEdge {
  source: string;
  target: string;
  type:
    | 'REPLACED_BY'
    | 'CONTAINS'
    | 'MODIFIED'
    | 'UNCHANGED'
    | 'ASSESSED_AS'
    | 'AFFECTS'
    | 'SUPPORTED_BY';
}
export interface ImpactGraph {
  investigationId: string;
  complete: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
export interface Evidence {
  id: string;
  version_id: string;
  policy_id: string;
  page_number: number;
  start_offset: number;
  end_offset: number;
  excerpt: string;
}
export interface InvestigationCreate {
  baselineVersionId: string;
  replacementVersionId: string;
  procedureVersionIds: string[];
  analysisDate: string;
}
export interface Bundle {
  progress: Progress;
  findings: Findings | null;
  graph: ImpactGraph | null;
  extractions: Extraction[];
}
export const terminal = (state: JobState) => ['COMPLETED', 'PARTIAL', 'FAILED'].includes(state);
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
