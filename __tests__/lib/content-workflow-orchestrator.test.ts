import { beforeEach, describe, expect, it } from "vitest";
import { _clearWorkflowEvents, listWorkflowEvents } from "@/lib/content-workflow-events";
import {
  _clearWorkflowStepHandlers,
  registerWorkflowStepHandler,
  retryRunTarget,
  startRunOrchestration,
} from "@/lib/content-workflow-orchestrator";
import {
  _clearWorkflowStore,
  _setRedisForWorkflowStoreTesting,
  createWorkflowRun,
  getWorkflowSnapshot,
  listBranchesByRun,
  listStepsByRun,
} from "@/lib/content-workflow-store";

async function waitForTerminal(runId: string): Promise<void> {
  for (let i = 0; i < 150; i += 1) {
    const snapshot = await getWorkflowSnapshot(runId);
    const status = snapshot?.run.status;
    if (status === "completed" || status === "failed" || status === "cancelled") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for terminal run status");
}

describe("content workflow orchestrator", () => {
  beforeEach(async () => {
    _setRedisForWorkflowStoreTesting(null);
    await _clearWorkflowStore();
    _clearWorkflowEvents();
    _clearWorkflowStepHandlers();
  });

  it("starts orchestration and completes fan-out/fan-in lifecycle", async () => {
    const { run } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "competitive positioning",
      createdBy: "tester",
      idempotencyKey: "orchestrator-success",
    });

    const result = await startRunOrchestration(run.id);
    expect(result.started).toBe(true);
    expect(result.status).toBe("branches_running");

    await waitForTerminal(run.id);
    const snapshot = await getWorkflowSnapshot(run.id);
    expect(snapshot?.run.status).toBe("completed");

    const branches = await listBranchesByRun(run.id);
    expect(branches.every((branch) => branch.status === "completed")).toBe(true);

    const steps = await listStepsByRun(run.id);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((step) => step.status === "completed")).toBe(true);
    expect(steps.some((step) => step.dependsOnStepIds.length > 0)).toBe(true);

    const events = listWorkflowEvents(run.id);
    expect(events.some((event) => event.type === "run.started")).toBe(true);
    expect(events.some((event) => event.type === "run.completed")).toBe(true);
  });

  it("supports retrying failed branches", async () => {
    registerWorkflowStepHandler("deep_market_research", async () => {
      throw new Error("validation failed: bad prompt");
    });

    const { run } = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "pipeline acceleration",
      createdBy: "tester",
      idempotencyKey: "orchestrator-retry",
    });

    await startRunOrchestration(run.id);
    await waitForTerminal(run.id);

    const failedSnapshot = await getWorkflowSnapshot(run.id);
    expect(failedSnapshot?.run.status).toBe("failed");

    const failedBranch = failedSnapshot?.branches.find(
      (branch) => branch.branchType === "market_research"
    );
    expect(failedBranch?.status).toBe("failed");

    registerWorkflowStepHandler("deep_market_research", async () => {
      return;
    });
    await retryRunTarget(run.id, { branchId: failedBranch?.id });
    await waitForTerminal(run.id);

    const retriedSnapshot = await getWorkflowSnapshot(run.id);
    expect(retriedSnapshot?.run.status).toBe("completed");
  });
});
