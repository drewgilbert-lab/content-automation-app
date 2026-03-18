import type { BranchType, RunStatus } from "./content-workflow-types";
import {
  listBranchesByRun,
  listStepsByRun,
  listWorkflowRuns,
} from "./content-workflow-store";

export interface WorkflowLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  runId: string;
  branchId?: string;
  branchType?: BranchType;
  stepId?: string;
  stepType?: string;
  attempt?: number;
  status?: string;
  durationMs?: number;
  failureClass?: string;
  message?: string;
  metrics?: Record<string, number | string | boolean>;
}

const MAX_LOGS_PER_RUN = 1000;

const g = globalThis as unknown as {
  __contentWorkflowTelemetry?: Map<string, WorkflowLogEntry[]>;
};

if (!g.__contentWorkflowTelemetry) {
  g.__contentWorkflowTelemetry = new Map<string, WorkflowLogEntry[]>();
}

const fallback = g.__contentWorkflowTelemetry;

export function logWorkflow(entry: Omit<WorkflowLogEntry, "id" | "timestamp">): WorkflowLogEntry {
  const record: WorkflowLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const existing = fallback.get(record.runId) ?? [];
  fallback.set(record.runId, [...existing, record].slice(-MAX_LOGS_PER_RUN));
  console.log(
    JSON.stringify({
      scope: "content-workflow",
      ...record,
    })
  );
  return record;
}

export function listWorkflowLogs(runId: string): WorkflowLogEntry[] {
  return fallback.get(runId) ?? [];
}

export function _clearWorkflowTelemetry(): void {
  fallback.clear();
}

export interface WorkflowMetricsSnapshot {
  activeRunsByStatus: Partial<Record<RunStatus, number>>;
  averageRunDurationMs: number;
  branchFailureRates: Record<string, number>;
  topFailingSteps: Array<{ stepType: string; failureCount: number }>;
  tokenUsageByBranch: Record<string, number>;
  failedRuns: number;
  totalRuns: number;
}

export async function getWorkflowMetricsSnapshot(): Promise<WorkflowMetricsSnapshot> {
  const runs = await listWorkflowRuns();
  const activeRunsByStatus: Partial<Record<RunStatus, number>> = {};
  const branchFailureAccumulator = new Map<string, { failed: number; total: number }>();
  const stepFailureAccumulator = new Map<string, number>();
  const tokenUsageByBranch: Record<string, number> = {};
  let completedDurationsMs = 0;
  let completedCount = 0;

  for (const run of runs) {
    activeRunsByStatus[run.status] = (activeRunsByStatus[run.status] ?? 0) + 1;
    if (run.status === "completed" && run.completedAt) {
      completedDurationsMs +=
        new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime();
      completedCount += 1;
    }

    const [branches, steps] = await Promise.all([
      listBranchesByRun(run.id),
      listStepsByRun(run.id),
    ]);

    for (const branch of branches) {
      const current = branchFailureAccumulator.get(branch.branchType) ?? {
        failed: 0,
        total: 0,
      };
      current.total += 1;
      if (branch.status === "failed") {
        current.failed += 1;
      }
      branchFailureAccumulator.set(branch.branchType, current);
    }

    for (const step of steps) {
      if (step.status === "failed") {
        stepFailureAccumulator.set(
          step.stepType,
          (stepFailureAccumulator.get(step.stepType) ?? 0) + 1
        );
      }
      const branchTokenKey = `${step.branchId}`;
      tokenUsageByBranch[branchTokenKey] =
        (tokenUsageByBranch[branchTokenKey] ?? 0) + (step.tokenUsage?.outputTokens ?? 0);
    }
  }

  const branchFailureRates = Array.from(branchFailureAccumulator.entries()).reduce<
    Record<string, number>
  >((acc, [branchType, stats]) => {
    acc[branchType] = stats.total > 0 ? Number((stats.failed / stats.total).toFixed(4)) : 0;
    return acc;
  }, {});

  const topFailingSteps = Array.from(stepFailureAccumulator.entries())
    .map(([stepType, failureCount]) => ({ stepType, failureCount }))
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 10);

  return {
    activeRunsByStatus,
    averageRunDurationMs: completedCount > 0 ? Math.round(completedDurationsMs / completedCount) : 0,
    branchFailureRates,
    topFailingSteps,
    tokenUsageByBranch,
    failedRuns: runs.filter((run) => run.status === "failed").length,
    totalRuns: runs.length,
  };
}
