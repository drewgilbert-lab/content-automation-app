import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearAllArtifacts,
  _setRedisForWorkflowArtifactsTesting,
  createArtifact,
  getLatestArtifactForNameAndType,
  listArtifactsByRun,
  listArtifactsByRunAndType,
} from "@/lib/content-workflow-artifacts";

describe("content workflow artifact contract", () => {
  beforeEach(async () => {
    _setRedisForWorkflowArtifactsTesting(null);
    await _clearAllArtifacts();
  });

  it("creates immutable artifact version 1", async () => {
    const artifact = await createArtifact({
      runId: "run-1",
      branchId: "branch-a",
      stepId: "A1",
      artifactType: "prompt_rendered",
      name: "pillar-research.functionality.theme.v1.run-1",
      version: 1,
      contentRef: "object://prompts/run-1",
      payload: {
        renderedBody: "Prompt body",
        templateKey: "branch-a-transcript",
        templateVersion: "1.0.0",
        renderHash: "hash-1",
        namingConventionKey: "pillar-research",
        variables: { theme: "win loss" },
      },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-1",
        producedByBranchId: "branch-a",
        producedByStepId: "A1",
      },
    });

    expect(artifact.id).toBeTruthy();
    expect(artifact.version).toBe(1);
  });

  it("requires matching previous artifact for version chain", async () => {
    const v1 = await createArtifact({
      runId: "run-2",
      branchId: "branch-a",
      stepId: "A2",
      artifactType: "transcript_research_doc",
      name: "transcript-output",
      version: 1,
      contentRef: "object://docs/run-2-v1",
      payload: { markdown: "# v1" },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-2",
      },
    });

    const v2 = await createArtifact({
      runId: "run-2",
      branchId: "branch-a",
      stepId: "A2",
      artifactType: "transcript_research_doc",
      name: "transcript-output",
      version: 2,
      previousArtifactId: v1.id,
      contentRef: "object://docs/run-2-v2",
      payload: { markdown: "# v2" },
      lineage: {
        parentArtifactIds: [v1.id],
        producedByRunId: "run-2",
      },
    });

    expect(v2.version).toBe(2);

    await expect(
      createArtifact({
        runId: "run-2",
        branchId: "branch-a",
        stepId: "A2",
        artifactType: "transcript_research_doc",
        name: "transcript-output",
        version: 2,
        previousArtifactId: v1.id,
        contentRef: "object://docs/run-2-v2-dup",
        payload: { markdown: "# invalid" },
        lineage: {
          parentArtifactIds: [v1.id],
          producedByRunId: "run-2",
        },
      })
    ).rejects.toThrow("artifact version already exists");
  });

  it("lists artifacts by run and type", async () => {
    await createArtifact({
      runId: "run-3",
      artifactType: "market_content_brief",
      name: "market-brief",
      version: 1,
      contentRef: "object://market/1",
      payload: { markdown: "market" },
      lineage: { parentArtifactIds: [], producedByRunId: "run-3" },
    });
    await createArtifact({
      runId: "run-3",
      artifactType: "final_pillar_package",
      name: "final-package",
      version: 1,
      contentRef: "object://final/1",
      payload: {
        functionalityBriefRef: "a",
        personaMessagingBriefRef: "b",
        marketBriefRef: "c",
      },
      lineage: { parentArtifactIds: [], producedByRunId: "run-3" },
    });

    const all = await listArtifactsByRun("run-3");
    const marketOnly = await listArtifactsByRunAndType("run-3", "market_content_brief");
    const latest = await getLatestArtifactForNameAndType(
      "run-3",
      "market_content_brief",
      "market-brief"
    );

    expect(all).toHaveLength(2);
    expect(marketOnly).toHaveLength(1);
    expect(latest?.artifactType).toBe("market_content_brief");
  });
});
