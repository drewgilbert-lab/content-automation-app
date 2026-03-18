import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearWorkflowStore,
  _setRedisForWorkflowStoreTesting,
  createWorkflowRun,
  listBranchesByRun,
  setBranchStatus,
  upsertStep,
  updateRunStatus,
} from "@/lib/content-workflow-store";
import {
  _clearWorkflowTelemetry,
  getWorkflowMetricsSnapshot,
  listWorkflowLogs,
  logWorkflow,
} from "@/lib/content-workflow-telemetry";

describe("content workflow telemetry", () => {
  beforeEach(async () => {
    _setRedisForWorkflowStoreTesting(null);
    await _clearWorkflowStore();
    _clearWorkflowTelemetry();
  });

  it("stores structured logs by run", () => {
    logWorkflow({
      level: "info",
      event: "step.started",
      runId: "run-1",
      stepId: "step-1",
      stepType: "transcript_research",
      status: "running",
    });

    const logs = listWorkflowLogs("run-1");
    expect(logs).toHaveLength(1);
    expect(logs[0].event).toBe("step.started");
  });

  it("builds metrics snapshot from runs/branches/steps", async () => {
    const { run } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "test theme",
      createdBy: "tester",
      idempotencyKey: "metrics-test",
    });

    await updateRunStatus(run.id, "branches_running");
    const branchRecords = await listBranchesByRun(run.id);
    await setBranchStatus(branchRecords[0].id, "running");
    await setBranchStatus(branchRecords[0].id, "failed", "synthetic failure");

    await upsertStep({
      id: "step-failed-1",
      runId: run.id,
      branchId: branchRecords[0].id,
      stepType: "extract_entities",
      status: "failed",
      dependsOnStepIds: [],
      attempt: 1,
      maxRetries: 3,
      startedAt: new Date().toISOString(),
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 120,
      },
    });

    const metrics = await getWorkflowMetricsSnapshot();
    expect(metrics.totalRuns).toBeGreaterThanOrEqual(1);
    expect(metrics.topFailingSteps.some((step) => step.stepType === "extract_entities")).toBe(
      true
    );
    expect(Object.keys(metrics.branchFailureRates).length).toBeGreaterThan(0);
  });
});
