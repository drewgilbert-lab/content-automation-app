import {
  executeWithPolicy,
  type WorkflowExecutionPolicy,
} from "./content-workflow-executor";
import { publishWorkflowEvent } from "./content-workflow-events";
import {
  getBranchById,
  getStepById,
  getWorkflowRun,
  listBranchesByRun,
  listStepsByRun,
  setBranchStatus,
  setStepStatus,
  updateRunStatus,
  upsertBranch,
  upsertStep,
} from "./content-workflow-store";
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
    .sort((a, b) => stepSortOrder(branch.branchType, a.stepType) - stepSortOrder(branch.branchType, b.stepType));
  return steps[0] ?? null;
}

async function runStep(
  runId: string,
  branch: PillarResearchBranch,
  step: PillarResearchStep
): Promise<void> {
  await setStepStatus(step.id, "running");
  publishWorkflowEvent(runId, "step.started", {
    branchId: branch.id,
    stepId: step.id,
    stepType: step.stepType,
  });

  await upsertBranch({
    ...branch,
    currentStep: step.id,
    status: branch.status === "retrying" ? "running" : branch.status,
  });

  const policy = getStepPolicy(branch.branchType, step.stepType);
  const handler = getHandler(step.stepType);
  const result = await executeWithPolicy(
    {
      runId,
      branchId: branch.id,
      step,
    },
    policy,
    async ({ attempt }) => {
      await upsertStep({
        ...step,
        status: "running",
        attempt,
      });

      await handler({
        runId,
        branch,
        step,
        attempt,
      });
    }
  );

  if (result.success) {
    await upsertStep({
      ...step,
      status: "completed",
      attempt: result.attempts,
      completedAt: new Date().toISOString(),
      lastError: undefined,
    });
    publishWorkflowEvent(runId, "step.completed", {
      branchId: branch.id,
      stepId: step.id,
      stepType: step.stepType,
      attempts: result.attempts,
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

  throw new Error(result.errorMessage ?? "Step failed");
}

async function runBranch(runId: string, branch: PillarResearchBranch): Promise<void> {
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
        throw new Error(`Branch ${branch.id} failed`);
      }

      if (branchSteps.every((step) => step.status === "completed")) {
        await setBranchStatus(branch.id, "completed");
        publishWorkflowEvent(runId, "branch.completed", {
          branchId: branch.id,
          branchType: branch.branchType,
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
      throw error;
    }
  }
}

async function finalizeRun(runId: string): Promise<void> {
  const branches = await listBranchesByRun(runId);
  const allCompleted = branches.every((branch) => branch.status === "completed");
  const anyFailed = branches.some((branch) => branch.status === "failed");
  const anyCancelled = branches.some((branch) => branch.status === "cancelled");

  if (allCompleted) {
    await updateRunStatus(runId, "fan_in_pending");
    publishWorkflowEvent(runId, "run.fan_in_pending", {});
    await updateRunStatus(runId, "completed");
    publishWorkflowEvent(runId, "run.completed", {});
    return;
  }

  if (anyCancelled) {
    await updateRunStatus(runId, "cancelled");
    publishWorkflowEvent(runId, "run.cancelled", {});
    return;
  }

  if (anyFailed) {
    await updateRunStatus(runId, "failed", "At least one branch failed");
    publishWorkflowEvent(runId, "run.failed", {});
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

export async function startRunOrchestration(runId: string): Promise<StartOrchestrationResult> {
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
  }

  queueMicrotask(() => {
    void orchestrateRun(runId).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Orchestration failed";
      await updateRunStatus(runId, "failed", message);
      publishWorkflowEvent(runId, "run.failed", {
        error: message,
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
      lastError: undefined,
    });
    const branch = await getBranchById(step.branchId);
    if (branch && branch.status === "failed") {
      await setBranchStatus(branch.id, "retrying");
      await setBranchStatus(branch.id, "running");
    }
    await updateRunStatus(runId, "branches_running");
    publishWorkflowEvent(runId, "retry.accepted", {
      stepId: target.stepId,
    });
  } else if (target.branchId) {
    const branch = await getBranchById(target.branchId);
    if (!branch || branch.runId !== runId) {
      throw new Error("Branch not found");
    }
    if (branch.status !== "failed") {
      throw new Error("Only failed branches can be retried");
    }
    await setBranchStatus(branch.id, "retrying");

    const steps = (await listStepsByRun(runId)).filter((step) => step.branchId === branch.id);
    for (const step of steps) {
      if (step.status === "failed" || step.status === "blocked") {
        await upsertStep({
          ...step,
          status: step.dependsOnStepIds.length > 0 ? "blocked" : "pending",
          lastError: undefined,
        });
      }
    }
    await setBranchStatus(branch.id, "running");
    await updateRunStatus(runId, "branches_running");
    publishWorkflowEvent(runId, "retry.accepted", {
      branchId: target.branchId,
    });
  }

  queueMicrotask(() => {
    void orchestrateRun(runId).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Retry failed";
      await updateRunStatus(runId, "failed", message);
      publishWorkflowEvent(runId, "run.failed", {
        error: message,
      });
    });
  });

  return { accepted: true };
}

export function registerWorkflowStepHandler(stepType: string, handler: StepHandler): void {
  stepHandlers.set(stepType, handler);
}

export function _clearWorkflowStepHandlers(): void {
  stepHandlers.clear();
}
