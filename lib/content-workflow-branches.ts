import {
  createArtifact,
  getLatestArtifactForNameAndType,
  listArtifactsByRunAndType,
  type CreateArtifactInput,
} from "./content-workflow-artifacts";
import { getWorkflowRun } from "./content-workflow-store";
import {
  persistRenderedPromptArtifact,
  seedDefaultWorkflowTemplates,
} from "./content-workflow-templates";
import type {
  ArtifactType,
  BranchType,
  ExtractedEntitySetPayload,
  PillarResearchArtifact,
  PillarResearchBranch,
  PillarResearchStep,
} from "./content-workflow-types";

const COMPETITOR_CONCURRENCY_LIMIT = 5;

interface WorkflowStepHandlerInput {
  runId: string;
  branch: PillarResearchBranch;
  step: PillarResearchStep;
  attempt: number;
}

type WorkflowStepHandler = (input: WorkflowStepHandlerInput) => Promise<void>;

interface RunContext {
  theme: string;
  useCase: string;
  contextSlug: string;
  runShortId: string;
}

interface BranchDescriptor {
  label: "functionality" | "persona-messaging" | "market";
  transcriptTemplateKey?: string;
  competitorTemplateKey?: string;
}

const BRANCH_DESCRIPTORS: Record<BranchType, BranchDescriptor> = {
  competitor_functionality: {
    label: "functionality",
    transcriptTemplateKey: "branch-a-transcript-research",
    competitorTemplateKey: "branch-a-competitor-functionality",
  },
  competitor_persona_messaging: {
    label: "persona-messaging",
    transcriptTemplateKey: "branch-b-transcript-research",
    competitorTemplateKey: "branch-b-competitor-persona-messaging",
  },
  market_research: {
    label: "market",
  },
};

function toSlug(value: string): string {
  const normalized = value.trim().toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

async function getRunContext(runId: string): Promise<RunContext> {
  const run = await getWorkflowRun(runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  const theme = run.inputValue.trim();
  const useCase = run.inputType === "use_case" ? run.inputValue.trim() : "general";
  return {
    theme,
    useCase,
    contextSlug: toSlug(theme),
    runShortId: run.id.slice(0, 8),
  };
}

async function createVersionedArtifact<T extends ArtifactType>(
  input: Omit<CreateArtifactInput<T>, "version" | "previousArtifactId">
): Promise<PillarResearchArtifact<T>> {
  const latest = await getLatestArtifactForNameAndType(
    input.runId,
    input.artifactType,
    input.name
  );
  const version = latest ? latest.version + 1 : 1;
  return createArtifact({
    ...input,
    version,
    previousArtifactId: latest?.id,
  });
}

function deriveCompetitors(theme: string): string[] {
  const words = theme
    .split(/\s+/)
    .map((token) => token.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  const root = words[0] ?? "signal";
  return uniqueSorted([
    `${root} Labs`,
    `${root} Cloud`,
    "RevenueForge",
    "HG Insights",
  ]);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const safeLimit = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: safeLimit }, () => runWorker()));
  return results;
}

function getLatestBranchArtifact<T extends ArtifactType>(
  artifacts: PillarResearchArtifact<T>[],
  branchId: string,
  name?: string
): PillarResearchArtifact<T> | null {
  const candidates = artifacts
    .filter((artifact) => artifact.branchId === branchId)
    .filter((artifact) => (name ? artifact.name === name : true))
    .sort((a, b) => b.version - a.version);
  return candidates[0] ?? null;
}

async function ensureSharedTranscriptArtifact(
  input: WorkflowStepHandlerInput
): Promise<PillarResearchArtifact<"transcript_research_doc">> {
  const descriptor = BRANCH_DESCRIPTORS[input.branch.branchType];
  if (!descriptor.transcriptTemplateKey) {
    throw new Error("Transcript template not configured for branch");
  }
  const context = await getRunContext(input.runId);
  const name = `pillar-research.shared-transcript.${context.contextSlug}.${context.runShortId}`;
  const latest = await getLatestArtifactForNameAndType(
    input.runId,
    "transcript_research_doc",
    name
  );
  if (latest) {
    return latest as PillarResearchArtifact<"transcript_research_doc">;
  }

  const promptArtifact = await persistRenderedPromptArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    templateKey: descriptor.transcriptTemplateKey,
    variables: {
      theme: context.theme,
      use_case: context.useCase,
    },
    namingConventionKey: "pillar-research.transcript-shared",
    branch: descriptor.label,
    contextSlug: context.contextSlug,
    metadata: {
      stepType: input.step.stepType,
      attempt: input.attempt,
    },
  });

  const markdown = [
    `# Shared Transcript Research`,
    ``,
    `Theme: ${context.theme}`,
    `Use case: ${context.useCase}`,
    ``,
    `This shared upstream transcript synthesis is reused by Branch A and Branch B.`,
    `Prompt artifact: ${promptArtifact.id}`,
  ].join("\n");

  return createVersionedArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    artifactType: "transcript_research_doc",
    name,
    contentType: "text/markdown",
    contentRef: `workflow://transcript/${input.runId}/${input.step.id}`,
    payload: { markdown },
    lineage: {
      parentArtifactIds: [promptArtifact.id],
      producedByRunId: input.runId,
      producedByBranchId: input.branch.id,
      producedByStepId: input.step.id,
    },
    metadata: {
      sharedAcrossBranches: true,
      sourceBranchType: input.branch.branchType,
    },
  });
}

async function handleTranscriptResearch(input: WorkflowStepHandlerInput): Promise<void> {
  await seedDefaultWorkflowTemplates();
  if (
    input.branch.branchType !== "competitor_functionality" &&
    input.branch.branchType !== "competitor_persona_messaging"
  ) {
    return;
  }
  await ensureSharedTranscriptArtifact(input);
}

async function handleExtractEntities(input: WorkflowStepHandlerInput): Promise<void> {
  const context = await getRunContext(input.runId);
  const transcriptArtifact = await ensureSharedTranscriptArtifact(input);
  const descriptor = BRANCH_DESCRIPTORS[input.branch.branchType];
  const competitors = deriveCompetitors(context.theme);
  const payload: ExtractedEntitySetPayload = {
    competitors,
    personas: uniqueSorted(["Demand Gen Lead", "Product Marketing Manager"]),
    titles: uniqueSorted(["VP Marketing", "Revenue Operations Director"]),
    confidence: 0.82,
    sourceArtifactId: transcriptArtifact.id,
  };

  await createVersionedArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    artifactType: "extracted_entity_set",
    name: `pillar-research.${descriptor.label}.entities.${context.contextSlug}.${context.runShortId}`,
    contentType: "application/json",
    contentRef: `workflow://entities/${input.runId}/${input.branch.id}/${input.step.id}`,
    payload,
    lineage: {
      parentArtifactIds: [transcriptArtifact.id],
      producedByRunId: input.runId,
      producedByBranchId: input.branch.id,
      producedByStepId: input.step.id,
    },
    metadata: {
      sharedTranscriptArtifactId: transcriptArtifact.id,
    },
  });
}

async function createCompetitorDocArtifacts(
  input: WorkflowStepHandlerInput,
  entitySetArtifact: PillarResearchArtifact<"extracted_entity_set">
): Promise<PillarResearchArtifact<"competitor_functionality_doc" | "competitor_persona_messaging_doc">[]> {
  const context = await getRunContext(input.runId);
  const descriptor = BRANCH_DESCRIPTORS[input.branch.branchType];
  if (!descriptor.competitorTemplateKey) {
    throw new Error("Competitor template key is missing");
  }

  const competitors = uniqueSorted([
    ...(entitySetArtifact.payload.competitors ?? []),
    "HG Insights",
  ]);
  const artifactType =
    input.branch.branchType === "competitor_functionality"
      ? "competitor_functionality_doc"
      : "competitor_persona_messaging_doc";

  const created = await mapWithConcurrency(
    competitors,
    COMPETITOR_CONCURRENCY_LIMIT,
    async (competitor) => {
      const competitorSlug = toSlug(competitor);
      const promptArtifact = await persistRenderedPromptArtifact({
        runId: input.runId,
        branchId: input.branch.id,
        stepId: input.step.id,
        templateKey: descriptor.competitorTemplateKey ?? "",
        variables: {
          competitor,
          theme: context.theme,
        },
        namingConventionKey: "pillar-research.competitor",
        branch: descriptor.label,
        contextSlug: `${context.contextSlug}-${competitorSlug}`,
        parentArtifactIds: [entitySetArtifact.id],
      });

      const sectionHeader =
        artifactType === "competitor_functionality_doc"
          ? "Functionality Highlights"
          : "Persona and Messaging Highlights";
      const markdown = [
        `# ${competitor}`,
        ``,
        `Theme: ${context.theme}`,
        ``,
        `## ${sectionHeader}`,
        `- Deterministic output generated for ${competitor}.`,
        `- Analysis generated under ${input.branch.branchType}.`,
      ].join("\n");

      return createVersionedArtifact({
        runId: input.runId,
        branchId: input.branch.id,
        stepId: input.step.id,
        artifactType,
        name: `pillar-research.${descriptor.label}.competitor.${competitorSlug}.${context.runShortId}`,
        contentType: "text/markdown",
        contentRef: `workflow://competitor/${input.runId}/${input.branch.id}/${competitorSlug}`,
        payload: { markdown },
        lineage: {
          parentArtifactIds: [entitySetArtifact.id, promptArtifact.id],
          producedByRunId: input.runId,
          producedByBranchId: input.branch.id,
          producedByStepId: input.step.id,
        },
        metadata: {
          competitor,
          concurrencyLimit: COMPETITOR_CONCURRENCY_LIMIT,
        },
      });
    }
  );

  return created.sort((a, b) => a.name.localeCompare(b.name));
}

async function handleFunctionalityAggregate(input: WorkflowStepHandlerInput): Promise<void> {
  if (input.branch.branchType !== "competitor_functionality") {
    return;
  }
  const context = await getRunContext(input.runId);
  const entities = await listArtifactsByRunAndType(input.runId, "extracted_entity_set");
  const entitySet = getLatestBranchArtifact(entities, input.branch.id);
  if (!entitySet) {
    throw new Error("Missing extracted entity set for functionality branch");
  }

  const competitorDocs = await createCompetitorDocArtifacts(input, entitySet);
  const markdown = [
    `# Functionality Content Brief`,
    ``,
    `Theme: ${context.theme}`,
    ``,
    ...competitorDocs.map((artifact) => `- ${artifact.name}`),
  ].join("\n");

  await createVersionedArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    artifactType: "functionality_content_brief",
    name: `pillar-research.functionality-content-brief.${context.contextSlug}.${context.runShortId}`,
    contentType: "text/markdown",
    contentRef: `workflow://brief/functionality/${input.runId}/${input.branch.id}`,
    payload: {
      markdown,
      citations: competitorDocs.map((artifact) => artifact.contentRef),
    },
    lineage: {
      parentArtifactIds: competitorDocs.map((artifact) => artifact.id),
      producedByRunId: input.runId,
      producedByBranchId: input.branch.id,
      producedByStepId: input.step.id,
    },
    metadata: {
      competitorCount: competitorDocs.length,
      concurrencyLimit: COMPETITOR_CONCURRENCY_LIMIT,
    },
  });
}

async function handlePersonaMessagingAggregate(input: WorkflowStepHandlerInput): Promise<void> {
  if (input.branch.branchType !== "competitor_persona_messaging") {
    return;
  }
  const context = await getRunContext(input.runId);
  const entities = await listArtifactsByRunAndType(input.runId, "extracted_entity_set");
  const entitySet = getLatestBranchArtifact(entities, input.branch.id);
  if (!entitySet) {
    throw new Error("Missing extracted entity set for persona messaging branch");
  }

  const competitorDocs = await createCompetitorDocArtifacts(input, entitySet);
  const markdown = [
    `# Competitor Persona Messaging Content Brief`,
    ``,
    `Theme: ${context.theme}`,
    ``,
    ...competitorDocs.map((artifact) => `- ${artifact.name}`),
  ].join("\n");

  await createVersionedArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    artifactType: "competitor_persona_messaging_content_brief",
    name: `pillar-research.persona-messaging-content-brief.${context.contextSlug}.${context.runShortId}`,
    contentType: "text/markdown",
    contentRef: `workflow://brief/persona-messaging/${input.runId}/${input.branch.id}`,
    payload: {
      markdown,
      citations: competitorDocs.map((artifact) => artifact.contentRef),
    },
    lineage: {
      parentArtifactIds: competitorDocs.map((artifact) => artifact.id),
      producedByRunId: input.runId,
      producedByBranchId: input.branch.id,
      producedByStepId: input.step.id,
    },
    metadata: {
      competitorCount: competitorDocs.length,
      concurrencyLimit: COMPETITOR_CONCURRENCY_LIMIT,
    },
  });
}

async function handleDeepMarketResearch(input: WorkflowStepHandlerInput): Promise<void> {
  if (input.branch.branchType !== "market_research") {
    return;
  }
  await seedDefaultWorkflowTemplates();
  const context = await getRunContext(input.runId);
  const promptArtifact = await persistRenderedPromptArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    templateKey: "branch-c-market-research",
    variables: { theme: context.theme },
    namingConventionKey: "pillar-research.market",
    branch: "market",
    contextSlug: context.contextSlug,
  });

  await createVersionedArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    artifactType: "market_content_brief",
    name: `pillar-research.market-content-brief.${context.contextSlug}.${context.runShortId}`,
    contentType: "text/markdown",
    contentRef: `workflow://market/${input.runId}/${input.branch.id}`,
    payload: {
      markdown: `# Market Research Draft\n\nTheme: ${context.theme}\n\nInitial market synthesis.`,
    },
    lineage: {
      parentArtifactIds: [promptArtifact.id],
      producedByRunId: input.runId,
      producedByBranchId: input.branch.id,
      producedByStepId: input.step.id,
    },
    metadata: { stage: "draft" },
  });
}

async function handleMarketAggregate(input: WorkflowStepHandlerInput): Promise<void> {
  if (input.branch.branchType !== "market_research") {
    return;
  }
  const context = await getRunContext(input.runId);
  const name = `pillar-research.market-content-brief.${context.contextSlug}.${context.runShortId}`;
  const marketArtifacts = await listArtifactsByRunAndType(input.runId, "market_content_brief");
  const latestDraft = getLatestBranchArtifact(marketArtifacts, input.branch.id, name);
  if (!latestDraft) {
    throw new Error("Missing market research draft artifact");
  }

  await createVersionedArtifact({
    runId: input.runId,
    branchId: input.branch.id,
    stepId: input.step.id,
    artifactType: "market_content_brief",
    name,
    contentType: "text/markdown",
    contentRef: `workflow://market/${input.runId}/${input.branch.id}/final`,
    payload: {
      markdown: `${latestDraft.payload.markdown}\n\n## Finalized Market Brief\n- Consolidated into CW13 market aggregate.`,
    },
    lineage: {
      parentArtifactIds: [latestDraft.id],
      producedByRunId: input.runId,
      producedByBranchId: input.branch.id,
      producedByStepId: input.step.id,
    },
    metadata: { stage: "final" },
  });
}

export const workflowBranchStepHandlers: Record<string, WorkflowStepHandler> = {
  transcript_research: handleTranscriptResearch,
  extract_entities: handleExtractEntities,
  functionality_aggregate: handleFunctionalityAggregate,
  persona_messaging_aggregate: handlePersonaMessagingAggregate,
  deep_market_research: handleDeepMarketResearch,
  market_aggregate: handleMarketAggregate,
};

export const __testing = {
  mapWithConcurrency,
  deriveCompetitors,
  COMPETITOR_CONCURRENCY_LIMIT,
};
