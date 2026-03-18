import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearWorkflowStore,
  _setRedisForWorkflowStoreTesting,
  cancelRun,
  createWorkflowRun,
  getRunByIdempotencyKey,
  getWorkflowSnapshot,
  listBranchesByRun,
  listWorkflowRuns,
  setBranchStatus,
  setStepStatus,
  updateRunReplayMetadata,
  updateRunStatus,
  upsertStep,
} from "@/lib/content-workflow-store";

describe("content workflow store", () => {
  beforeEach(async () => {
    _setRedisForWorkflowStoreTesting(null);
    await _clearWorkflowStore();
  });

  it("creates a run with default branches", async () => {
    const { run, deduped } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "win-loss analysis",
      createdBy: "tester",
      idempotencyKey: "run-key-1",
    });

    expect(deduped).toBe(false);
    expect(run.status).toBe("created");

    const branches = await listBranchesByRun(run.id);
    expect(branches).toHaveLength(3);
  });

  it("dedupes by idempotency key", async () => {
    const first = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "messaging framework",
      createdBy: "tester",
      idempotencyKey: "same-key",
    });
    const second = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "messaging framework",
      createdBy: "tester",
      idempotencyKey: "same-key",
    });

    expect(first.run.id).toBe(second.run.id);
    expect(second.deduped).toBe(true);
    const lookup = await getRunByIdempotencyKey("same-key");
    expect(lookup?.id).toBe(first.run.id);
  });

  it("enforces transition validity", async () => {
    const { run } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "pricing objection research",
      createdBy: "tester",
    });

    await updateRunStatus(run.id, "branches_running");
    await updateRunStatus(run.id, "fan_in_pending");
    await updateRunStatus(run.id, "completed");

    await expect(updateRunStatus(run.id, "failed")).rejects.toThrow(
      "Invalid run status transition"
    );
  });

  it("supports retry transition from failed to branches_running", async () => {
    const { run } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "retry path",
      createdBy: "tester",
    });

    await updateRunStatus(run.id, "failed", "forced failure");
    const retried = await updateRunStatus(run.id, "branches_running");

    expect(retried?.status).toBe("branches_running");
  });

  it("enforces branch and step transition validity", async () => {
    const { run } = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "transition rails",
      createdBy: "tester",
    });

    const [branch] = await listBranchesByRun(run.id);
    expect(branch).toBeTruthy();

    await setBranchStatus(branch.id, "running");
    await setBranchStatus(branch.id, "failed", "forced failure");
    await setBranchStatus(branch.id, "retrying");
    await setBranchStatus(branch.id, "running");

    await expect(setBranchStatus(branch.id, "pending")).rejects.toThrow(
      "Invalid branch status transition"
    );

    const step = await upsertStep({
      id: "step-transition-1",
      runId: run.id,
      branchId: branch.id,
      stepType: "A1",
      status: "blocked",
      dependsOnStepIds: [],
      attempt: 0,
      maxRetries: 3,
      startedAt: new Date().toISOString(),
    });

    await setStepStatus(step.id, "pending");
    await setStepStatus(step.id, "running");
    await setStepStatus(step.id, "completed");

    await expect(setStepStatus(step.id, "retrying")).rejects.toThrow(
      "Invalid step status transition"
    );
  });

  it("cancels active branches and steps", async () => {
    const { run } = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "category positioning",
      createdBy: "tester",
    });

    const branches = await listBranchesByRun(run.id);
    await setBranchStatus(branches[0].id, "running");
    await upsertStep({
      id: "step-1",
      runId: run.id,
      branchId: branches[0].id,
      stepType: "A1",
      status: "running",
      dependsOnStepIds: [],
      attempt: 1,
      maxRetries: 3,
      startedAt: new Date().toISOString(),
    });

    const cancelled = await cancelRun(run.id);
    expect(cancelled?.status).toBe("cancelled");

    const snapshot = await getWorkflowSnapshot(run.id);
    expect(snapshot?.run.status).toBe("cancelled");
    expect(snapshot?.branches.some((b) => b.status === "cancelled")).toBe(true);
    expect(snapshot?.steps.some((s) => s.status === "cancelled")).toBe(true);
  });

  it("lists runs and updates replay metadata", async () => {
    const first = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "theme 1",
      createdBy: "tester",
      idempotencyKey: "list-runs-1",
    });
    const second = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "theme 2",
      createdBy: "tester",
      idempotencyKey: "list-runs-2",
    });
    await updateRunStatus(second.run.id, "branches_running");
    await updateRunReplayMetadata(second.run.id, {
      lastReplayAt: "2026-03-17T00:00:00.000Z",
      lastReplayReason: "manual replay",
    });

    const allRuns = await listWorkflowRuns();
    expect(allRuns.length).toBeGreaterThanOrEqual(2);
    const replayed = allRuns.find((run) => run.id === second.run.id);
    expect(replayed?.lastReplayReason).toBe("manual replay");
    const createdRuns = await listWorkflowRuns("created");
    expect(createdRuns.some((run) => run.id === first.run.id)).toBe(true);
  });
});
