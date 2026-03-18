import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearAllArtifacts,
  _setRedisForWorkflowArtifactsTesting,
  createArtifact,
} from "@/lib/content-workflow-artifacts";
import { validateBranchAggregateArtifacts } from "@/lib/content-workflow-validators";
import type { PillarResearchBranch } from "@/lib/content-workflow-types";

const branches: PillarResearchBranch[] = [
  {
    id: "branch-a",
    runId: "run-validator",
    branchType: "competitor_functionality",
    status: "completed",
    attemptCount: 1,
    startedAt: "2026-03-17T00:00:00.000Z",
    completedAt: "2026-03-17T00:10:00.000Z",
  },
  {
    id: "branch-b",
    runId: "run-validator",
    branchType: "competitor_persona_messaging",
    status: "completed",
    attemptCount: 1,
    startedAt: "2026-03-17T00:00:00.000Z",
    completedAt: "2026-03-17T00:10:00.000Z",
  },
  {
    id: "branch-c",
    runId: "run-validator",
    branchType: "market_research",
    status: "completed",
    attemptCount: 1,
    startedAt: "2026-03-17T00:00:00.000Z",
    completedAt: "2026-03-17T00:10:00.000Z",
  },
];

describe("content workflow branch aggregate validators", () => {
  beforeEach(async () => {
    _setRedisForWorkflowArtifactsTesting(null);
    await _clearAllArtifacts();
  });

  it("fails validation when required branch artifacts are missing", async () => {
    const result = await validateBranchAggregateArtifacts("run-validator", branches);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(Object.keys(result.artifactsByBranchId)).toHaveLength(0);
  });

  it("returns latest required artifacts for every completed branch", async () => {
    await createArtifact({
      runId: "run-validator",
      branchId: "branch-a",
      stepId: "A6",
      artifactType: "functionality_content_brief",
      name: "functionality",
      version: 1,
      contentRef: "workflow://a/v1",
      contentType: "text/markdown",
      payload: { markdown: "# Functionality" },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-validator",
      },
    });
    await createArtifact({
      runId: "run-validator",
      branchId: "branch-b",
      stepId: "B6",
      artifactType: "competitor_persona_messaging_content_brief",
      name: "persona",
      version: 1,
      contentRef: "workflow://b/v1",
      contentType: "text/markdown",
      payload: { markdown: "# Persona" },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-validator",
      },
    });
    const marketV1 = await createArtifact({
      runId: "run-validator",
      branchId: "branch-c",
      stepId: "C3",
      artifactType: "market_content_brief",
      name: "market",
      version: 1,
      contentRef: "workflow://c/v1",
      contentType: "text/markdown",
      payload: { markdown: "# Market" },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-validator",
      },
    });
    await createArtifact({
      runId: "run-validator",
      branchId: "branch-c",
      stepId: "C3",
      artifactType: "market_content_brief",
      name: "market",
      version: 2,
      previousArtifactId: marketV1.id,
      contentRef: "workflow://c/v2",
      contentType: "text/markdown",
      payload: { markdown: "# Market v2" },
      lineage: {
        parentArtifactIds: [marketV1.id],
        producedByRunId: "run-validator",
      },
    });

    const result = await validateBranchAggregateArtifacts("run-validator", branches);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(Object.keys(result.artifactsByBranchId)).toHaveLength(3);
    expect(result.artifactsByBranchId["branch-a"].artifactType).toBe(
      "functionality_content_brief"
    );
    expect(result.artifactsByBranchId["branch-b"].artifactType).toBe(
      "competitor_persona_messaging_content_brief"
    );
    expect(result.artifactsByBranchId["branch-c"].artifactType).toBe(
      "market_content_brief"
    );
    expect(result.artifactsByBranchId["branch-c"].version).toBe(2);
  });

  it("fails validation when artifacts exist but are attached to wrong branch ids", async () => {
    await createArtifact({
      runId: "run-validator",
      branchId: "branch-b",
      stepId: "A6",
      artifactType: "functionality_content_brief",
      name: "functionality-wrong-branch",
      version: 1,
      contentRef: "workflow://a/wrong",
      contentType: "text/markdown",
      payload: { markdown: "# Functionality Wrong Branch" },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-validator",
      },
    });

    const result = await validateBranchAggregateArtifacts("run-validator", branches);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((error) => error.includes("Missing required artifact"))
    ).toBe(true);
    expect(result.artifactsByBranchId["branch-a"]).toBeUndefined();
  });

  it("fails validation when wrong artifact types are present", async () => {
    await createArtifact({
      runId: "run-validator",
      branchId: "branch-a",
      stepId: "A1",
      artifactType: "prompt_rendered",
      name: "functionality-prompt",
      version: 1,
      contentRef: "workflow://a/prompt",
      contentType: "text/plain",
      payload: {
        renderedBody: "prompt",
        templateKey: "key",
        templateVersion: "1.0.0",
        renderHash: "hash",
        namingConventionKey: "pillar-research",
        variables: { theme: "x" },
      },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-validator",
      },
    });

    const result = await validateBranchAggregateArtifacts("run-validator", branches);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});
