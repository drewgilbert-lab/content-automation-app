import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearAllArtifacts,
  _setRedisForWorkflowArtifactsTesting,
  listArtifactsByRun,
} from "@/lib/content-workflow-artifacts";
import { _clearWorkflowEvents, listWorkflowEvents } from "@/lib/content-workflow-events";
import {
  _clearWorkflowStepHandlers,
  getRunDiagnostics,
  listFailedRunsWithDiagnostics,
  registerWorkflowStepHandler,
  retryRunTarget,
  startRunOrchestration,
} from "@/lib/content-workflow-orchestrator";
import { workflowBranchStepHandlers } from "@/lib/content-workflow-branches";
import {
  _clearWorkflowStore,
  _setRedisForWorkflowStoreTesting,
  createWorkflowRun,
  getWorkflowSnapshot,
  listBranchesByRun,
  listStepsByRun,
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

describe("content workflow orchestrator", () => {
  beforeEach(async () => {
    _setRedisForWorkflowStoreTesting(null);
    _setRedisForWorkflowArtifactsTesting(null);
    _setRedisForWorkflowTemplatesTesting(null);
    await _clearWorkflowStore();
    await _clearAllArtifacts();
    await _clearAllTemplates();
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

    const artifacts = await listArtifactsByRun(run.id);
    expect(
      artifacts.some((artifact) => artifact.artifactType === "functionality_content_brief")
    ).toBe(true);
    expect(
      artifacts.some(
        (artifact) =>
          artifact.artifactType === "competitor_persona_messaging_content_brief"
      )
    ).toBe(true);
    expect(
      artifacts.some((artifact) => artifact.artifactType === "market_content_brief")
    ).toBe(true);
    const finalPackages = artifacts.filter(
      (artifact) => artifact.artifactType === "final_pillar_package"
    );
    expect(finalPackages).toHaveLength(1);
    expect(finalPackages[0].lineage.parentArtifactIds).toHaveLength(3);
    const finalPayload = finalPackages[0].payload as {
      functionalityBriefRef?: string;
      personaMessagingBriefRef?: string;
      marketBriefRef?: string;
    };
    expect(finalPayload.functionalityBriefRef).toBeTruthy();
    expect(finalPayload.personaMessagingBriefRef).toBeTruthy();
    expect(finalPayload.marketBriefRef).toBeTruthy();

    const sharedTranscriptArtifacts = artifacts.filter(
      (artifact) =>
        artifact.artifactType === "transcript_research_doc" &&
        artifact.name.includes("shared-transcript")
    );
    expect(sharedTranscriptArtifacts).toHaveLength(1);

    const marketBriefs = artifacts
      .filter((artifact) => artifact.artifactType === "market_content_brief")
      .sort((a, b) => a.version - b.version);
    expect(marketBriefs.length).toBeGreaterThanOrEqual(2);
    expect(marketBriefs[0].metadata?.stage).toBe("draft");
    expect(marketBriefs[marketBriefs.length - 1].metadata?.stage).toBe("final");
    expect(marketBriefs[marketBriefs.length - 1].lineage.parentArtifactIds).toContain(
      marketBriefs[marketBriefs.length - 2].id
    );
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

    registerWorkflowStepHandler(
      "deep_market_research",
      workflowBranchStepHandlers.deep_market_research
    );
    await retryRunTarget(run.id, { branchId: failedBranch?.id });
    await waitForTerminal(run.id);

    const retriedSnapshot = await getWorkflowSnapshot(run.id);
    expect(retriedSnapshot?.run.status).toBe("completed");
  });

  it("rejects retry requests when run is in terminal completed status", async () => {
    const { run } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "terminal retry guard",
      createdBy: "tester",
      idempotencyKey: "orchestrator-terminal-retry-guard",
    });

    await startRunOrchestration(run.id);
    await waitForTerminal(run.id);

    const snapshot = await getWorkflowSnapshot(run.id);
    expect(snapshot?.run.status).toBe("completed");

    await expect(retryRunTarget(run.id, { branchId: snapshot?.branches[0].id })).rejects.toThrow(
      "Run is not retryable in terminal status"
    );
  });

  it("keeps branch aggregate artifacts isolated by branch type", async () => {
    const { run } = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "branch isolation verification",
      createdBy: "tester",
      idempotencyKey: "orchestrator-branch-isolation",
    });

    await startRunOrchestration(run.id);
    await waitForTerminal(run.id);

    const snapshot = await getWorkflowSnapshot(run.id);
    expect(snapshot?.run.status).toBe("completed");

    const branchByType = new Map(
      (snapshot?.branches ?? []).map((branch) => [branch.branchType, branch.id])
    );
    const artifacts = await listArtifactsByRun(run.id);

    const expectedByBranchType = {
      competitor_functionality: "functionality_content_brief",
      competitor_persona_messaging: "competitor_persona_messaging_content_brief",
      market_research: "market_content_brief",
    } as const;

    for (const [branchType, expectedArtifactType] of Object.entries(expectedByBranchType)) {
      const branchId = branchByType.get(branchType as keyof typeof expectedByBranchType);
      expect(branchId).toBeTruthy();

      const artifactsForBranch = artifacts.filter((artifact) => artifact.branchId === branchId);
      expect(
        artifactsForBranch.some((artifact) => artifact.artifactType === expectedArtifactType)
      ).toBe(true);
      expect(
        artifactsForBranch.some(
          (artifact) =>
            artifact.artifactType === "functionality_content_brief" &&
            expectedArtifactType !== "functionality_content_brief"
        )
      ).toBe(false);
      expect(
        artifactsForBranch.some(
          (artifact) =>
            artifact.artifactType === "competitor_persona_messaging_content_brief" &&
            expectedArtifactType !== "competitor_persona_messaging_content_brief"
        )
      ).toBe(false);
      expect(
        artifactsForBranch.some(
          (artifact) =>
            artifact.artifactType === "market_content_brief" &&
            expectedArtifactType !== "market_content_brief"
        )
      ).toBe(false);
    }
  });

  it("supports replaying a branch from a checkpoint step", async () => {
    registerWorkflowStepHandler("deep_market_research", async () => {
      throw new Error("forced fail");
    });
    const { run } = await createWorkflowRun({
      inputType: "topic_theme",
      inputValue: "checkpoint replay",
      createdBy: "tester",
      idempotencyKey: "orchestrator-checkpoint-replay",
    });

    await startRunOrchestration(run.id);
    await waitForTerminal(run.id);
    const failed = await getWorkflowSnapshot(run.id);
    const marketBranch = failed?.branches.find((branch) => branch.branchType === "market_research");
    const marketSteps = failed?.steps.filter((step) => step.branchId === marketBranch?.id) ?? [];
    const firstStep = marketSteps.find((step) => step.stepType === "deep_market_research");

    registerWorkflowStepHandler(
      "deep_market_research",
      workflowBranchStepHandlers.deep_market_research
    );
    await retryRunTarget(run.id, {
      branchId: marketBranch?.id,
      replayFromStepId: firstStep?.id,
      reason: "checkpoint replay",
      requestedBy: "tester",
    });
    await waitForTerminal(run.id);

    const replayed = await getWorkflowSnapshot(run.id);
    expect(replayed?.run.status).toBe("completed");
    const replayedStep = replayed?.steps.find((step) => step.id === firstStep?.id);
    expect(replayedStep?.replayReason).toBe("checkpoint replay");
  });

  it("fails run during fan-in when required branch aggregate artifact is missing", async () => {
    registerWorkflowStepHandler("functionality_aggregate", async () => {
      return;
    });

    const { run } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "fan-in validation",
      createdBy: "tester",
      idempotencyKey: "orchestrator-fan-in-validation-failure",
    });

    await startRunOrchestration(run.id);
    await waitForTerminal(run.id);

    const snapshot = await getWorkflowSnapshot(run.id);
    expect(snapshot?.run.status).toBe("failed");
    expect(snapshot?.run.errorSummary).toContain("Missing required artifact");
  });

  it("returns run diagnostics and failed run summary", async () => {
    registerWorkflowStepHandler("deep_market_research", async () => {
      throw new Error("intentional failure for diagnostics");
    });
    const { run } = await createWorkflowRun({
      inputType: "use_case",
      inputValue: "diagnostics",
      createdBy: "tester",
      idempotencyKey: "orchestrator-diagnostics",
    });

    await startRunOrchestration(run.id);
    await waitForTerminal(run.id);

    const diagnostics = await getRunDiagnostics(run.id);
    expect(diagnostics.run?.status).toBe("failed");
    expect(diagnostics.logs.length).toBeGreaterThan(0);

    const failedRuns = await listFailedRunsWithDiagnostics();
    expect(failedRuns.some((entry) => entry.runId === run.id)).toBe(true);
  });
});
