import {
  executeWithPolicy,
  type WorkflowExecutionPolicy,
} from "./content-workflow-executor";
import { assembleFinalPillarPackage } from "./content-workflow-assembler";
import { workflowBranchStepHandlers } from "./content-workflow-branches";
import {
  enforceTextBudget,
  estimateArtifactPayloadTokens,
  resolveStepTokenBudget,
} from "./content-workflow-budget";
import { publishWorkflowEvent } from "./content-workflow-events";
import { listArtifactsByRun } from "./content-workflow-artifacts";
import {
  getBranchById,
  getStepById,
  getWorkflowRun,
  listWorkflowRuns,
  listBranchesByRun,
  listStepsByRun,
  setBranchStatus,
  setStepStatus,
  updateRunReplayMetadata,
  updateRunStatus,
  upsertBranch,
  upsertStep,
} from "./content-workflow-store";
import { logWorkflow, listWorkflowLogs } from "./content-workflow-telemetry";
import { validateBranchAggregateArtifacts } from "./content-workflow-validators";
import type {
  BranchType,
  PillarResearchBranch,
  PillarResearchStep,
  RunStatus,
  StepStatus,
} from "./content-workflow-types";

interface StepPlan {
  stepType: string;
  dependsOnStepTypes: string[];
  timeoutClass: "transcript" | "per_competitor" | "aggregation";
}

interface BranchPlan {
  branchType: BranchType;
  steps: StepPlan[];
}

export interface StartOrchestrationResult {
  started: boolean;
  deduped: boolean;
  status: RunStatus;
}

interface RetryTarget {
  branchId?: string;
  stepId?: string;
  replayFromStepId?: string;
  reason?: string;
  requestedBy?: string;
}

const BRANCH_PLANS: BranchPlan[] = [
  {
    branchType: "competitor_functionality",
    steps: [
      {
        stepType: "transcript_research",
        dependsOnStepTypes: [],
        timeoutClass: "transcript",
      },
      {
        stepType: "extract_entities",
        dependsOnStepTypes: ["transcript_research"],
        timeoutClass: "aggregation",
      },
      {
        stepType: "functionality_aggregate",
        dependsOnStepTypes: ["extract_entities"],
        timeoutClass: "per_competitor",
      },
    ],
  },
  {
    branchType: "competitor_persona_messaging",
    steps: [
      {
        stepType: "transcript_research",
        dependsOnStepTypes: [],
        timeoutClass: "transcript",
      },
      {
        stepType: "extract_entities",
        dependsOnStepTypes: ["transcript_research"],
        timeoutClass: "aggregation",
      },
      {
        stepType: "persona_messaging_aggregate",
        dependsOnStepTypes: ["extract_entities"],
        timeoutClass: "per_competitor",
      },
    ],
  },
  {
    branchType: "market_research",
    steps: [
      {
        stepType: "deep_market_research",
        dependsOnStepTypes: [],
        timeoutClass: "transcript",
      },
      {
        stepType: "market_aggregate",
        dependsOnStepTypes: ["deep_market_research"],
        timeoutClass: "aggregation",
      },
    ],
  },
];

const TIMEOUT_POLICY_MS: Record<StepPlan["timeoutClass"], number> = {
  transcript: 20 * 60 * 1000,
  per_competitor: 15 * 60 * 1000,
  aggregation: 8 * 60 * 1000,
};

const DEFAULT_EXECUTION_POLICY: Omit<WorkflowExecutionPolicy, "timeoutMs"> = {
  maxRetries: 3,
  baseDelayMs: 50,
};

type StepHandler = (input: {
  runId: string;
  branch: PillarResearchBranch;
  step: PillarResearchStep;
  attempt: number;
}) => Promise<void>;

const stepHandlers = new Map<string, StepHandler>();
const activeRuns = new Set<string>();
let defaultStepHandlersRegistered = false;

function ensureDefaultStepHandlersRegistered(): void {
  if (defaultStepHandlersRegistered) {
    return;
  }
  for (const [stepType, handler] of Object.entries(workflowBranchStepHandlers)) {
    if (!stepHandlers.has(stepType)) {
      stepHandlers.set(stepType, handler);
    }
  }
  defaultStepHandlersRegistered = true;
}

function branchSortOrder(type: BranchType): number {
  return BRANCH_PLANS.findIndex((plan) => plan.branchType === type);
}

function getBranchPlan(branchType: BranchType): BranchPlan {
  const plan = BRANCH_PLANS.find((candidate) => candidate.branchType === branchType);
  if (!plan) {
    throw new Error(`No branch plan found for branch type: ${branchType}`);
  }
  return plan;
}

function stepSortOrder(branchType: BranchType, stepType: string): number {
  const steps = getBranchPlan(branchType).steps;
  const idx = steps.findIndex((step) => step.stepType === stepType);
  return idx < 0 ? Number.MAX_SAFE_INTEGER : idx;
}

function getStepPolicy(branchType: BranchType, stepType: string): WorkflowExecutionPolicy {
  const plan = getBranchPlan(branchType).steps.find((item) => item.stepType === stepType);
  const timeoutClass = plan?.timeoutClass ?? "aggregation";
  return {
    ...DEFAULT_EXECUTION_POLICY,
    timeoutMs: TIMEOUT_POLICY_MS[timeoutClass],
  };
}

function getHandler(stepType: string): StepHandler {
  return (
    stepHandlers.get(stepType) ??
    (async () => {
      return;
    })
  );
}

function sortStepsForBranch(
  branchType: BranchType,
  steps: PillarResearchStep[]
): PillarResearchStep[] {
  return [...steps].sort(
    (a, b) => stepSortOrder(branchType, a.stepType) - stepSortOrder(branchType, b.stepType)
  );
}

async function initializeStepsForRun(runId: string): Promise<void> {
  const branches = await listBranchesByRun(runId);
  const existingSteps = await listStepsByRun(runId);
  if (existingSteps.length > 0) {
    return;
  }

  for (const branch of branches) {
    const plan = getBranchPlan(branch.branchType);
    const stepIdByType = new Map<string, string>();
    for (const stepPlan of plan.steps) {
      stepIdByType.set(stepPlan.stepType, crypto.randomUUID());
    }

    for (const stepPlan of plan.steps) {
      const id = stepIdByType.get(stepPlan.stepType);
      if (!id) {
        throw new Error("Step id generation failed");
      }
      const dependsOnStepIds = stepPlan.dependsOnStepTypes
        .map((stepType) => stepIdByType.get(stepType))
        .filter((stepId): stepId is string => Boolean(stepId));

      await upsertStep({
        id,
        runId,
        branchId: branch.id,
        stepType: stepPlan.stepType,
        status: dependsOnStepIds.length > 0 ? "blocked" : "pending",
        dependsOnStepIds,
        attempt: 0,
        maxRetries: DEFAULT_EXECUTION_POLICY.maxRetries,
        startedAt: new Date().toISOString(),
        tokenBudget: resolveStepTokenBudget(stepPlan.stepType),
      });
    }
  }
}

async function reconcileStepStatuses(runId: string, branchId: string): Promise<void> {
  const steps = (await listStepsByRun(runId))
    .filter((step) => step.branchId === branchId)
    .sort((a, b) => a.stepType.localeCompare(b.stepType));

  const byId = new Map(steps.map((step) => [step.id, step]));
  for (const step of steps) {
    const dependenciesMet =
      step.dependsOnStepIds.length === 0 ||
      step.dependsOnStepIds.every((depId) => byId.get(depId)?.status === "completed");

    let nextStatus: StepStatus | null = null;
    if (dependenciesMet && step.status === "blocked") {
      nextStatus = "pending";
    } else if (!dependenciesMet && step.status === "pending") {
      nextStatus = "blocked";
    }

    if (nextStatus) {
      await setStepStatus(step.id, nextStatus);
    }
  }
}

async function getNextRunnableStep(
  runId: string,
  branch: PillarResearchBranch
): Promise<PillarResearchStep | null> {
  await reconcileStepStatuses(runId, branch.id);

  const steps = (await listStepsByRun(runId))
    .filter((step) => step.branchId === branch.id)
    .filter((step) => step.status === "pending")
    .sort(
      (a, b) =>
        stepSortOrder(branch.branchType, a.stepType) - stepSortOrder(branch.branchType, b.stepType)
    );
  return steps[0] ?? null;
}

async function runStep(
  runId: string,
  branch: PillarResearchBranch,
  step: PillarResearchStep
): Promise<void> {
  const startedAt = Date.now();
  await setStepStatus(step.id, "running");
  publishWorkflowEvent(runId, "step.started", {
    branchId: branch.id,
    stepId: step.id,
    stepType: step.stepType,
  });
  logWorkflow({
    level: "info",
    event: "step.started",
    runId,
    branchId: branch.id,
    branchType: branch.branchType,
    stepId: step.id,
    stepType: step.stepType,
    status: "running",
  });

  await upsertBranch({
    ...branch,
    currentStep: step.id,
    status: branch.status === "retrying" ? "running" : branch.status,
  });

  const policy = getStepPolicy(branch.branchType, step.stepType);
  const handler = getHandler(step.stepType);
  const run = await getWorkflowRun(runId);
  const budget = step.tokenBudget ?? resolveStepTokenBudget(step.stepType);
  const result = await executeWithPolicy(
    {
      runId,
      branchId: branch.id,
      step,
    },
    policy,
    async ({ attempt }) => {
      const inputText = [run?.inputValue ?? "", branch.branchType, step.stepType].join("\n");
      const inputBudget = enforceTextBudget(inputText, budget.maxInputTokens, budget.onExceed);
      const beforeIds = new Set((await listArtifactsByRun(runId)).map((artifact) => artifact.id));

      await upsertStep({
        ...step,
        status: "running",
        attempt,
        tokenBudget: budget,
      });

      await handler({
        runId,
        branch,
        step,
        attempt,
      });

      const stepArtifacts = (await listArtifactsByRun(runId)).filter(
        (artifact) => artifact.stepId === step.id && !beforeIds.has(artifact.id)
      );
      const outputTokens = stepArtifacts.reduce(
        (acc, artifact) => acc + estimateArtifactPayloadTokens(artifact),
        0
      );
      if (budget.onExceed === "fail" && outputTokens > budget.maxOutputTokens) {
        throw new Error(
          `Token budget exceeded for step output: ${outputTokens} > ${budget.maxOutputTokens}`
        );
      }

      return {
        inputTokens: inputBudget.tokenCount,
        outputTokens,
        outputAdjusted: stepArtifacts.some((artifact) => Boolean(artifact.metadata?.outputAdjusted)),
      };
    }
  );

  if (result.success) {
    await upsertStep({
      ...step,
      status: "completed",
      attempt: result.attempts,
      completedAt: new Date().toISOString(),
      lastError: undefined,
      tokenUsage: {
        inputTokens: Number(result.metrics?.inputTokens ?? 0),
        outputTokens: Number(result.metrics?.outputTokens ?? 0),
        outputTokensOriginal: Number(result.metrics?.outputTokens ?? 0),
        budgetAdjustedOutput: Boolean(result.metrics?.outputAdjusted ?? false),
      },
    });
    publishWorkflowEvent(runId, "step.completed", {
      branchId: branch.id,
      stepId: step.id,
      stepType: step.stepType,
      attempts: result.attempts,
      metrics: result.metrics ?? {},
    });
    logWorkflow({
      level: "info",
      event: "step.completed",
      runId,
      branchId: branch.id,
      branchType: branch.branchType,
      stepId: step.id,
      stepType: step.stepType,
      attempt: result.attempts,
      durationMs: Date.now() - startedAt,
      status: "completed",
      metrics: result.metrics,
    });
    return;
  }

  const nextStatus: StepStatus = result.errorClass === "retryable" ? "retrying" : "failed";
  await upsertStep({
    ...step,
    status: nextStatus,
    attempt: result.attempts,
    lastError: result.errorMessage,
  });

  if (nextStatus === "retrying") {
    await setStepStatus(step.id, "failed", result.errorMessage);
  }

  publishWorkflowEvent(runId, "step.failed", {
    branchId: branch.id,
    stepId: step.id,
    stepType: step.stepType,
    attempts: result.attempts,
    errorClass: result.errorClass,
    errorMessage: result.errorMessage,
  });
  logWorkflow({
    level: "error",
    event: "step.failed",
    runId,
    branchId: branch.id,
    branchType: branch.branchType,
    stepId: step.id,
    stepType: step.stepType,
    attempt: result.attempts,
    durationMs: Date.now() - startedAt,
    status: nextStatus,
    failureClass: result.errorClass,
    message: result.errorMessage,
    metrics: result.metrics,
  });

  throw new Error(result.errorMessage ?? "Step failed");
}

async function runBranch(runId: string, branch: PillarResearchBranch): Promise<void> {
  const startedAt = Date.now();
  if (branch.status === "completed" || branch.status === "cancelled") {
    return;
  }
  if (branch.status !== "running") {
    await setBranchStatus(branch.id, "running");
  }
  await upsertBranch({
    ...branch,
    status: "running",
    attemptCount: branch.attemptCount + 1,
  });
  publishWorkflowEvent(runId, "branch.started", {
    branchId: branch.id,
    branchType: branch.branchType,
  });
  logWorkflow({
    level: "info",
    event: "branch.started",
    runId,
    branchId: branch.id,
    branchType: branch.branchType,
    status: "running",
  });

  while (true) {
    const next = await getNextRunnableStep(runId, branch);
    if (!next) {
      const branchSteps = (await listStepsByRun(runId)).filter(
        (step) => step.branchId === branch.id
      );
      if (branchSteps.some((step) => step.status === "failed")) {
        await setBranchStatus(branch.id, "failed", "One or more steps failed");
        publishWorkflowEvent(runId, "branch.failed", {
          branchId: branch.id,
          branchType: branch.branchType,
        });
        logWorkflow({
          level: "error",
          event: "branch.failed",
          runId,
          branchId: branch.id,
          branchType: branch.branchType,
          status: "failed",
          durationMs: Date.now() - startedAt,
          message: "One or more steps failed",
        });
        throw new Error(`Branch ${branch.id} failed`);
      }

      if (branchSteps.every((step) => step.status === "completed")) {
        await setBranchStatus(branch.id, "completed");
        publishWorkflowEvent(runId, "branch.completed", {
          branchId: branch.id,
          branchType: branch.branchType,
        });
        logWorkflow({
          level: "info",
          event: "branch.completed",
          runId,
          branchId: branch.id,
          branchType: branch.branchType,
          status: "completed",
          durationMs: Date.now() - startedAt,
        });
        return;
      }
      return;
    }

    const latestBranch = await getBranchById(branch.id);
    if (!latestBranch || latestBranch.status === "cancelled") {
      throw new Error(`Branch ${branch.id} cancelled`);
    }
    try {
      await runStep(runId, latestBranch, next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Branch step failed";
      await setBranchStatus(branch.id, "failed", message);
      publishWorkflowEvent(runId, "branch.failed", {
        branchId: branch.id,
        branchType: branch.branchType,
        error: message,
      });
      logWorkflow({
        level: "error",
        event: "branch.failed",
        runId,
        branchId: branch.id,
        branchType: branch.branchType,
        status: "failed",
        durationMs: Date.now() - startedAt,
        message,
      });
      throw error;
    }
  }
}

async function finalizeRun(runId: string): Promise<void> {
  const startedAt = Date.now();
  const branches = await listBranchesByRun(runId);
  const allCompleted = branches.every((branch) => branch.status === "completed");
  const anyFailed = branches.some((branch) => branch.status === "failed");
  const anyCancelled = branches.some((branch) => branch.status === "cancelled");

  if (allCompleted) {
    await updateRunStatus(runId, "fan_in_pending");
    publishWorkflowEvent(runId, "run.fan_in_pending", {});

    const validation = await validateBranchAggregateArtifacts(runId, branches);
    if (!validation.valid) {
      const errorSummary = validation.errors.join("; ");
      await updateRunStatus(runId, "failed", errorSummary || "Fan-in validation failed");
      publishWorkflowEvent(runId, "run.failed", {
        error: errorSummary || "Fan-in validation failed",
      });
      logWorkflow({
        level: "error",
        event: "run.failed",
        runId,
        status: "failed",
        durationMs: Date.now() - startedAt,
        message: errorSummary || "Fan-in validation failed",
      });
      return;
    }

    try {
      const finalPackage = await assembleFinalPillarPackage(runId, validation.artifactsByBranchId);
      publishWorkflowEvent(runId, "run.package_assembled", {
        artifactId: finalPackage.id,
      });
    } catch (error) {
      const errorSummary = error instanceof Error ? error.message : "Final package assembly failed";
      await updateRunStatus(runId, "failed", errorSummary);
      publishWorkflowEvent(runId, "run.failed", { error: errorSummary });
      logWorkflow({
        level: "error",
        event: "run.failed",
        runId,
        status: "failed",
        durationMs: Date.now() - startedAt,
        message: errorSummary,
      });
      return;
    }

    await updateRunStatus(runId, "completed");
    publishWorkflowEvent(runId, "run.completed", {});
    logWorkflow({
      level: "info",
      event: "run.completed",
      runId,
      status: "completed",
      durationMs: Date.now() - startedAt,
    });
    return;
  }

  if (anyCancelled) {
    await updateRunStatus(runId, "cancelled");
    publishWorkflowEvent(runId, "run.cancelled", {});
    logWorkflow({
      level: "warn",
      event: "run.cancelled",
      runId,
      status: "cancelled",
      durationMs: Date.now() - startedAt,
    });
    return;
  }

  if (anyFailed) {
    await updateRunStatus(runId, "failed", "At least one branch failed");
    publishWorkflowEvent(runId, "run.failed", {});
    logWorkflow({
      level: "error",
      event: "run.failed",
      runId,
      status: "failed",
      durationMs: Date.now() - startedAt,
      message: "At least one branch failed",
    });
  }
}

async function orchestrateRun(runId: string): Promise<void> {
  if (activeRuns.has(runId)) {
    return;
  }
  activeRuns.add(runId);
  try {
    await initializeStepsForRun(runId);
    const run = await getWorkflowRun(runId);
    if (!run) {
      throw new Error("Run not found");
    }

    const branches = (await listBranchesByRun(runId)).sort(
      (a, b) => branchSortOrder(a.branchType) - branchSortOrder(b.branchType)
    );
    for (const branch of branches) {
      if (branch.status === "completed" || branch.status === "cancelled") {
        continue;
      }
      await runBranch(runId, branch);
    }
    await finalizeRun(runId);
  } finally {
    activeRuns.delete(runId);
  }
}

async function resetBranchStepsForReplay(
  runId: string,
  branch: PillarResearchBranch,
  replayFromStepId?: string,
  reason?: string
): Promise<void> {
  const steps = sortStepsForBranch(
    branch.branchType,
    (await listStepsByRun(runId)).filter((step) => step.branchId === branch.id)
  );
  if (steps.length === 0) {
    return;
  }
  const replayFromIndex = replayFromStepId
    ? steps.findIndex((step) => step.id === replayFromStepId)
    : 0;
  if (replayFromStepId && replayFromIndex < 0) {
    throw new Error("Replay start step not found in branch");
  }
  const from = Math.max(0, replayFromIndex);
  for (let idx = from; idx < steps.length; idx += 1) {
    const step = steps[idx];
    const dependencyInReplayWindow = step.dependsOnStepIds.some((depId) => {
      const depIndex = steps.findIndex((candidate) => candidate.id === depId);
      return depIndex >= from;
    });
    await upsertStep({
      ...step,
      status: dependencyInReplayWindow ? "blocked" : "pending",
      attempt: 0,
      completedAt: undefined,
      lastError: undefined,
      tokenUsage: undefined,
      replayedFromStepId: replayFromStepId,
      replayReason: reason,
    });
  }
}

export async function startRunOrchestration(runId: string): Promise<StartOrchestrationResult> {
  ensureDefaultStepHandlersRegistered();
  const run = await getWorkflowRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }

  if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
    return {
      started: false,
      deduped: true,
      status: run.status,
    };
  }

  if (run.status === "created") {
    await updateRunStatus(runId, "branches_running");
    publishWorkflowEvent(runId, "run.started", {});
    logWorkflow({
      level: "info",
      event: "run.started",
      runId,
      status: "branches_running",
    });
  }

  queueMicrotask(() => {
    void orchestrateRun(runId).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Orchestration failed";
      await updateRunStatus(runId, "failed", message);
      publishWorkflowEvent(runId, "run.failed", {
        error: message,
      });
      logWorkflow({
        level: "error",
        event: "run.failed",
        runId,
        status: "failed",
        message,
      });
    });
  });

  const latest = await getWorkflowRun(runId);
  return {
    started: true,
    deduped: run.status !== "created",
    status: latest?.status ?? run.status,
  };
}

export async function retryRunTarget(
  runId: string,
  target: RetryTarget
): Promise<{ accepted: boolean }> {
  ensureDefaultStepHandlersRegistered();
  const run = await getWorkflowRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }
  if (run.status === "cancelled" || run.status === "completed") {
    throw new Error("Run is not retryable in terminal status");
  }

  if (!target.stepId && !target.branchId) {
    throw new Error("Either stepId or branchId is required");
  }

  const replayAt = new Date().toISOString();
  if (target.stepId) {
    const step = await getStepById(target.stepId);
    if (!step || step.runId !== runId) {
      throw new Error("Step not found");
    }
    if (step.status !== "failed") {
      throw new Error("Only failed steps can be retried");
    }

    await upsertStep({
      ...step,
      status: "pending",
      attempt: 0,
      completedAt: undefined,
      lastError: undefined,
      replayReason: target.reason,
      replayedFromStepId: target.replayFromStepId,
      tokenUsage: undefined,
    });
    const branch = await getBranchById(step.branchId);
    if (branch && (branch.status === "failed" || branch.status === "retrying")) {
      await upsertBranch({
        ...branch,
        status: "running",
        lastError: undefined,
        lastReplayAt: replayAt,
        replayFromStepId: target.replayFromStepId ?? step.id,
      });
    }
    await updateRunStatus(runId, "branches_running");
    await updateRunReplayMetadata(runId, {
      lastReplayAt: replayAt,
      lastReplayReason: target.reason,
    });
    publishWorkflowEvent(runId, "retry.accepted", {
      stepId: target.stepId,
      reason: target.reason,
      requestedBy: target.requestedBy,
    });
    logWorkflow({
      level: "warn",
      event: "retry.accepted",
      runId,
      branchId: step.branchId,
      stepId: target.stepId,
      status: "accepted",
      message: target.reason,
      metrics: {
        requestedBy: target.requestedBy ?? "",
      },
    });
  } else if (target.branchId) {
    const branch = await getBranchById(target.branchId);
    if (!branch || branch.runId !== runId) {
      throw new Error("Branch not found");
    }
    if (branch.status !== "failed" && branch.status !== "retrying") {
      throw new Error("Only failed branches can be retried");
    }

    await resetBranchStepsForReplay(runId, branch, target.replayFromStepId, target.reason);
    await upsertBranch({
      ...branch,
      status: "running",
      lastError: undefined,
      lastReplayAt: replayAt,
      replayFromStepId: target.replayFromStepId,
    });
    await updateRunStatus(runId, "branches_running");
    await updateRunReplayMetadata(runId, {
      lastReplayAt: replayAt,
      lastReplayReason: target.reason,
    });
    publishWorkflowEvent(runId, "retry.accepted", {
      branchId: target.branchId,
      replayFromStepId: target.replayFromStepId,
      reason: target.reason,
      requestedBy: target.requestedBy,
    });
    logWorkflow({
      level: "warn",
      event: "retry.accepted",
      runId,
      branchId: target.branchId,
      status: "accepted",
      message: target.reason,
      metrics: {
        replayFromStepId: target.replayFromStepId ?? "",
        requestedBy: target.requestedBy ?? "",
      },
    });
  }

  await updateRunStatus(runId, "branches_running", undefined);

  queueMicrotask(() => {
    void orchestrateRun(runId).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Retry failed";
      await updateRunStatus(runId, "failed", message);
      publishWorkflowEvent(runId, "run.failed", {
        error: message,
      });
      logWorkflow({
        level: "error",
        event: "run.failed",
        runId,
        status: "failed",
        message,
      });
    });
  });

  return { accepted: true };
}

export async function getRunDiagnostics(runId: string): Promise<{
  run: Awaited<ReturnType<typeof getWorkflowRun>>;
  branches: Awaited<ReturnType<typeof listBranchesByRun>>;
  steps: Awaited<ReturnType<typeof listStepsByRun>>;
  logs: ReturnType<typeof listWorkflowLogs>;
}> {
  const run = await getWorkflowRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }
  const [branches, steps] = await Promise.all([
    listBranchesByRun(runId),
    listStepsByRun(runId),
  ]);
  return {
    run,
    branches,
    steps,
    logs: listWorkflowLogs(runId),
  };
}

export async function listFailedRunsWithDiagnostics(): Promise<
  Array<{
    runId: string;
    startedAt: string;
    errorSummary?: string;
    failedBranchCount: number;
    failedStepCount: number;
    lastReplayAt?: string;
  }>
> {
  const runs = await listWorkflowRuns("failed");
  const entries = await Promise.all(
    runs.map(async (run) => {
      const [branches, steps] = await Promise.all([
        listBranchesByRun(run.id),
        listStepsByRun(run.id),
      ]);
      return {
        runId: run.id,
        startedAt: run.startedAt,
        errorSummary: run.errorSummary,
        failedBranchCount: branches.filter((branch) => branch.status === "failed").length,
        failedStepCount: steps.filter((step) => step.status === "failed").length,
        lastReplayAt: run.lastReplayAt,
      };
    })
  );
  return entries.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function registerWorkflowStepHandler(stepType: string, handler: StepHandler): void {
  stepHandlers.set(stepType, handler);
}

export function _clearWorkflowStepHandlers(): void {
  stepHandlers.clear();
  defaultStepHandlersRegistered = false;
}
