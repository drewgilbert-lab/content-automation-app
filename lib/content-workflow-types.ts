export const ARTIFACT_TYPES = [
  "transcript_research_doc",
  "extracted_entity_set",
  "prompt_rendered",
  "competitor_functionality_doc",
  "competitor_persona_messaging_doc",
  "functionality_content_brief",
  "competitor_persona_messaging_content_brief",
  "market_content_brief",
  "final_pillar_package",
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const RUN_STATUSES = [
  "created",
  "branches_running",
  "fan_in_pending",
  "completed",
  "failed",
  "cancelled",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export const BRANCH_TYPES = [
  "competitor_functionality",
  "competitor_persona_messaging",
  "market_research",
] as const;

export type BranchType = (typeof BRANCH_TYPES)[number];

export const BRANCH_STATUSES = [
  "pending",
  "running",
  "retrying",
  "completed",
  "failed",
  "cancelled",
] as const;

export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export const STEP_STATUSES = [
  "pending",
  "blocked",
  "running",
  "retrying",
  "completed",
  "failed",
  "cancelled",
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

export const INPUT_TYPES = ["use_case", "topic_theme"] as const;
export type InputType = (typeof INPUT_TYPES)[number];

export interface PillarResearchRun {
  id: string;
  status: RunStatus;
  inputType: InputType;
  inputValue: string;
  createdBy: string;
  startedAt: string;
  completedAt?: string;
  idempotencyKey: string;
  errorSummary?: string;
}

export interface PillarResearchBranch {
  id: string;
  runId: string;
  branchType: BranchType;
  status: BranchStatus;
  currentStep?: string;
  attemptCount: number;
  startedAt: string;
  completedAt?: string;
  lastError?: string;
}

export interface PillarResearchStep {
  id: string;
  runId: string;
  branchId: string;
  stepType: string;
  status: StepStatus;
  dependsOnStepIds: string[];
  attempt: number;
  maxRetries: number;
  startedAt: string;
  completedAt?: string;
  lastError?: string;
}

export interface ExtractedEntitySetPayload {
  competitors: string[];
  personas: string[];
  titles: string[];
  confidence: number;
  sourceArtifactId: string;
}

export interface PromptRenderedPayload {
  renderedBody: string;
  templateKey: string;
  templateVersion: string;
  renderHash: string;
  namingConventionKey: string;
  variables: Record<string, string>;
}

export interface MarkdownArtifactPayload {
  markdown: string;
  citations?: string[];
}

export interface FinalPillarPackagePayload {
  functionalityBriefRef: string;
  personaMessagingBriefRef: string;
  marketBriefRef: string;
  finalAggregationRef?: string;
}

export interface ArtifactLineage {
  parentArtifactIds: string[];
  producedByRunId: string;
  producedByBranchId?: string;
  producedByStepId?: string;
}

export type ArtifactPayloadMap = {
  transcript_research_doc: MarkdownArtifactPayload;
  extracted_entity_set: ExtractedEntitySetPayload;
  prompt_rendered: PromptRenderedPayload;
  competitor_functionality_doc: MarkdownArtifactPayload;
  competitor_persona_messaging_doc: MarkdownArtifactPayload;
  functionality_content_brief: MarkdownArtifactPayload;
  competitor_persona_messaging_content_brief: MarkdownArtifactPayload;
  market_content_brief: MarkdownArtifactPayload;
  final_pillar_package: FinalPillarPackagePayload;
};

export interface PillarResearchArtifact<T extends ArtifactType = ArtifactType> {
  id: string;
  runId: string;
  branchId?: string;
  stepId?: string;
  artifactType: T;
  name: string;
  version: number;
  previousArtifactId?: string;
  contentRef: string;
  contentType?: string;
  payload: ArtifactPayloadMap[T];
  lineage: ArtifactLineage;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface CreateRunInput {
  inputType: InputType;
  inputValue: string;
  createdBy: string;
  idempotencyKey?: string;
}

const RUN_TRANSITIONS: Record<RunStatus, ReadonlyArray<RunStatus>> = {
  created: ["branches_running", "cancelled", "failed"],
  branches_running: ["fan_in_pending", "failed", "cancelled"],
  fan_in_pending: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

const BRANCH_TRANSITIONS: Record<BranchStatus, ReadonlyArray<BranchStatus>> = {
  pending: ["running", "cancelled"],
  running: ["retrying", "completed", "failed", "cancelled"],
  retrying: ["running", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

const STEP_TRANSITIONS: Record<StepStatus, ReadonlyArray<StepStatus>> = {
  pending: ["blocked", "running", "cancelled"],
  blocked: ["pending", "running", "cancelled"],
  running: ["retrying", "completed", "failed", "cancelled"],
  retrying: ["running", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function isTerminalRunStatus(status: RunStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function isTerminalBranchStatus(status: BranchStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function isTerminalStepStatus(status: StepStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function canTransitionRunStatus(from: RunStatus, to: RunStatus): boolean {
  return RUN_TRANSITIONS[from].includes(to);
}

export function canTransitionBranchStatus(
  from: BranchStatus,
  to: BranchStatus
): boolean {
  return BRANCH_TRANSITIONS[from].includes(to);
}

export function canTransitionStepStatus(from: StepStatus, to: StepStatus): boolean {
  return STEP_TRANSITIONS[from].includes(to);
}

export function isArtifactType(value: string): value is ArtifactType {
  return ARTIFACT_TYPES.includes(value as ArtifactType);
}

export function isInputType(value: string): value is InputType {
  return INPUT_TYPES.includes(value as InputType);
}

export function validateCreateRunInput(
  input: Partial<CreateRunInput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.inputType || !isInputType(input.inputType)) {
    errors.push(`inputType must be one of: ${INPUT_TYPES.join(", ")}`);
  }
  if (!input.inputValue || !input.inputValue.trim()) {
    errors.push("inputValue is required");
  }
  if (!input.createdBy || !input.createdBy.trim()) {
    errors.push("createdBy is required");
  }

  return { valid: errors.length === 0, errors };
}

export function validateArtifactFields(
  artifact: Partial<PillarResearchArtifact>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!artifact.artifactType || !isArtifactType(artifact.artifactType)) {
    errors.push(`artifactType must be one of: ${ARTIFACT_TYPES.join(", ")}`);
  }
  if (!artifact.name || !artifact.name.trim()) {
    errors.push("name is required");
  }
  if (!artifact.contentRef || !artifact.contentRef.trim()) {
    errors.push("contentRef is required");
  }
  if (typeof artifact.version !== "number" || artifact.version < 1) {
    errors.push("version must be a positive integer");
  }
  if (!artifact.lineage) {
    errors.push("lineage is required");
  } else {
    if (!artifact.lineage.producedByRunId) {
      errors.push("lineage.producedByRunId is required");
    }
    if (!Array.isArray(artifact.lineage.parentArtifactIds)) {
      errors.push("lineage.parentArtifactIds must be an array");
    }
  }

  if (artifact.artifactType === "prompt_rendered") {
    const payload = artifact.payload as Partial<PromptRenderedPayload> | undefined;
    if (!payload || typeof payload !== "object") {
      errors.push("prompt_rendered payload is required");
    } else {
      if (!payload.renderedBody?.trim()) {
        errors.push("prompt_rendered.payload.renderedBody is required");
      }
      if (!payload.templateKey?.trim()) {
        errors.push("prompt_rendered.payload.templateKey is required");
      }
      if (!payload.templateVersion?.trim()) {
        errors.push("prompt_rendered.payload.templateVersion is required");
      }
      if (!payload.renderHash?.trim()) {
        errors.push("prompt_rendered.payload.renderHash is required");
      }
      if (!payload.namingConventionKey?.trim()) {
        errors.push("prompt_rendered.payload.namingConventionKey is required");
      }
      if (
        !payload.variables ||
        typeof payload.variables !== "object" ||
        Array.isArray(payload.variables)
      ) {
        errors.push("prompt_rendered.payload.variables must be an object");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
