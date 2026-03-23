import type { ArtifactType, PillarResearchArtifact } from "./content-workflow-types";

export type BudgetExceedPolicy = "truncate" | "summarize" | "fail";

export interface TokenBudgetPolicy {
  maxInputTokens: number;
  maxOutputTokens: number;
  onExceed: BudgetExceedPolicy;
}

export interface BudgetedTextResult {
  text: string;
  tokenCount: number;
  originalTokenCount: number;
  adjusted: boolean;
  policyApplied?: BudgetExceedPolicy;
}

export class BudgetExceededError extends Error {
  readonly retryable = false;
  readonly code = "token_budget_exceeded";
}

const DEFAULT_STEP_BUDGETS: Record<string, TokenBudgetPolicy> = {
  transcript_research: {
    maxInputTokens: 2500,
    maxOutputTokens: 4500,
    onExceed: "summarize",
  },
  extract_entities: {
    maxInputTokens: 1800,
    maxOutputTokens: 1200,
    onExceed: "fail",
  },
  functionality_aggregate: {
    maxInputTokens: 2800,
    maxOutputTokens: 4200,
    onExceed: "truncate",
  },
  persona_messaging_aggregate: {
    maxInputTokens: 2800,
    maxOutputTokens: 4200,
    onExceed: "truncate",
  },
  deep_market_research: {
    maxInputTokens: 2500,
    maxOutputTokens: 4200,
    onExceed: "summarize",
  },
  market_aggregate: {
    maxInputTokens: 1800,
    maxOutputTokens: 2800,
    onExceed: "truncate",
  },
};

const DEFAULT_ARTIFACT_BUDGET_POLICY: Record<
  ArtifactType,
  Pick<TokenBudgetPolicy, "maxOutputTokens" | "onExceed">
> = {
  transcript_research_doc: { maxOutputTokens: 4500, onExceed: "summarize" },
  extracted_entity_set: { maxOutputTokens: 1200, onExceed: "fail" },
  prompt_rendered: { maxOutputTokens: 2400, onExceed: "truncate" },
  competitor_functionality_doc: { maxOutputTokens: 2000, onExceed: "truncate" },
  competitor_persona_messaging_doc: { maxOutputTokens: 2000, onExceed: "truncate" },
  functionality_content_brief: { maxOutputTokens: 4200, onExceed: "truncate" },
  competitor_persona_messaging_content_brief: {
    maxOutputTokens: 4200,
    onExceed: "truncate",
  },
  market_content_brief: { maxOutputTokens: 3600, onExceed: "summarize" },
  final_pillar_package: { maxOutputTokens: 1200, onExceed: "fail" },
};

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function resolveStepTokenBudget(stepType: string): TokenBudgetPolicy {
  return (
    DEFAULT_STEP_BUDGETS[stepType] ?? {
      maxInputTokens: 2000,
      maxOutputTokens: 3000,
      onExceed: "truncate",
    }
  );
}

export function resolveArtifactOutputBudgetPolicy(
  artifactType: ArtifactType
): Pick<TokenBudgetPolicy, "maxOutputTokens" | "onExceed"> {
  return DEFAULT_ARTIFACT_BUDGET_POLICY[artifactType];
}

function summarizeText(text: string, maxTokens: number): string {
  const maxChars = Math.max(80, maxTokens * 4);
  if (text.length <= maxChars) {
    return text;
  }
  const headLength = Math.max(30, Math.floor(maxChars * 0.65));
  const tailLength = Math.max(20, maxChars - headLength - 30);
  const head = text.slice(0, headLength).trimEnd();
  const tail = text.slice(-tailLength).trimStart();
  return `${head}\n\n[summary: middle content omitted to fit token budget]\n\n${tail}`;
}

export function enforceTextBudget(
  text: string,
  maxTokens: number,
  policy: BudgetExceedPolicy
): BudgetedTextResult {
  const originalTokenCount = estimateTokenCount(text);
  if (originalTokenCount <= maxTokens) {
    return {
      text,
      tokenCount: originalTokenCount,
      originalTokenCount,
      adjusted: false,
    };
  }

  if (policy === "fail") {
    throw new BudgetExceededError(
      `Token budget exceeded: ${originalTokenCount} > ${maxTokens}`
    );
  }

  const adjustedText =
    policy === "truncate" ? text.slice(0, Math.max(0, maxTokens * 4)) : summarizeText(text, maxTokens);
  return {
    text: adjustedText,
    tokenCount: estimateTokenCount(adjustedText),
    originalTokenCount,
    adjusted: true,
    policyApplied: policy,
  };
}

type TextPayloadCarrier = {
  markdown?: string;
  renderedBody?: string;
};

function getTextFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidate = payload as TextPayloadCarrier;
  if (typeof candidate.markdown === "string") {
    return candidate.markdown;
  }
  if (typeof candidate.renderedBody === "string") {
    return candidate.renderedBody;
  }
  return null;
}

function setTextOnPayload<T extends Record<string, unknown>>(
  payload: T,
  nextText: string
): T {
  if ("markdown" in payload && typeof payload.markdown === "string") {
    return {
      ...payload,
      markdown: nextText,
    };
  }
  if ("renderedBody" in payload && typeof payload.renderedBody === "string") {
    return {
      ...payload,
      renderedBody: nextText,
    };
  }
  return payload;
}

export function enforceArtifactOutputBudget<T extends ArtifactType>(
  artifact: PillarResearchArtifact<T>
): {
  artifact: PillarResearchArtifact<T>;
  outputTokens: number;
  outputTokensOriginal: number;
  adjusted: boolean;
  policyApplied?: BudgetExceedPolicy;
} {
  const budget = resolveArtifactOutputBudgetPolicy(artifact.artifactType);
  const payloadText = getTextFromPayload(artifact.payload);
  if (!payloadText) {
    return {
      artifact,
      outputTokens: 0,
      outputTokensOriginal: 0,
      adjusted: false,
    };
  }

  const budgeted = enforceTextBudget(payloadText, budget.maxOutputTokens, budget.onExceed);
  const payload = setTextOnPayload(artifact.payload as unknown as Record<string, unknown>, budgeted.text);
  return {
    artifact: {
      ...artifact,
      payload: payload as unknown as PillarResearchArtifact<T>["payload"],
      metadata: {
        ...(artifact.metadata ?? {}),
        outputTokenBudget: budget.maxOutputTokens,
        outputTokenPolicy: budget.onExceed,
        outputTokens: budgeted.tokenCount,
        outputTokensOriginal: budgeted.originalTokenCount,
        outputAdjusted: budgeted.adjusted,
      },
    },
    outputTokens: budgeted.tokenCount,
    outputTokensOriginal: budgeted.originalTokenCount,
    adjusted: budgeted.adjusted,
    policyApplied: budgeted.policyApplied,
  };
}

export function estimateArtifactPayloadTokens(artifact: PillarResearchArtifact): number {
  const text = getTextFromPayload(artifact.payload);
  if (!text) {
    return 0;
  }
  return estimateTokenCount(text);
}
