import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearAllArtifacts,
  _setRedisForWorkflowArtifactsTesting,
  listArtifactsByRun,
} from "@/lib/content-workflow-artifacts";
import {
  __testing as branchTesting,
} from "@/lib/content-workflow-branches";
import {
  _clearWorkflowStepHandlers,
  startRunOrchestration,
} from "@/lib/content-workflow-orchestrator";
import {
  _clearWorkflowStore,
  _setRedisForWorkflowStoreTesting,
  createWorkflowRun,
  getWorkflowSnapshot,
} from "@/lib/content-workflow-store";
import {
  _clearAllTemplates,
  _setRedisForWorkflowTemplatesTesting,
} from "@/lib/content-workflow-templates";

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

describe("content workflow branch handlers", () => {
  beforeEach(async () => {
    _setRedisForWorkflowStoreTesting(null);
    _setRedisForWorkflowArtifactsTesting(null);
    _setRedisForWorkflowTemplatesTesting(null);
    await _clearWorkflowStore();
    await _clearAllArtifacts();
    await _clearAllTemplates();
    _clearWorkflowStepHandlers();
  });

  it("enforces bounded concurrency helper", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 9 }, (_, i) => i);

    await branchTesting.mapWithConcurrency(items, 3, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return item * 2;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(branchTesting.COMPETITOR_CONCURRENCY_LIMIT).toBe(5);
  });

  it("produces deterministic competitor ordering in branch aggregates", async () => {
    const competitors = branchTesting.deriveCompetitors("pipeline acceleration");
    expect(competitors).toContain("HG Insights");
    expect(competitors).toEqual([...competitors].sort((a, b) => a.localeCompare(b)));

    const { run } = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "pipeline acceleration",
      createdBy: "tester",
      idempotencyKey: "branch-order",
    });
    await startRunOrchestration(run.id);
    await waitForTerminal(run.id);

    const artifacts = await listArtifactsByRun(run.id);
    const functionalityBrief = artifacts.find(
      (artifact) => artifact.artifactType === "functionality_content_brief"
    );
    expect(functionalityBrief).toBeDefined();
    const citations = functionalityBrief?.payload.citations ?? [];
    const sorted = [...citations].sort((a, b) => a.localeCompare(b));
    expect(citations).toEqual(sorted);
  });
});
