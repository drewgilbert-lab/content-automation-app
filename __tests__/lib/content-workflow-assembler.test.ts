import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearAllArtifacts,
  _setRedisForWorkflowArtifactsTesting,
  createArtifact,
} from "@/lib/content-workflow-artifacts";
import {
  assembleFinalPillarPackage,
  buildFinalPillarPackagePayload,
  getLatestFinalPillarPackage,
} from "@/lib/content-workflow-assembler";
import type { PillarResearchArtifact } from "@/lib/content-workflow-types";

type RequiredAggregateArtifact = PillarResearchArtifact<
  | "functionality_content_brief"
  | "competitor_persona_messaging_content_brief"
  | "market_content_brief"
>;

async function seedRequiredArtifacts(
  runId: string
): Promise<Record<string, RequiredAggregateArtifact>> {
  const functionality = await createArtifact({
    runId,
    branchId: "branch-a",
    stepId: "A6",
    artifactType: "functionality_content_brief",
    name: "functionality",
    version: 1,
    contentRef: "workflow://a/brief",
    contentType: "text/markdown",
    payload: { markdown: "# A" },
    lineage: { parentArtifactIds: [], producedByRunId: runId },
  });
  const persona = await createArtifact({
    runId,
    branchId: "branch-b",
    stepId: "B6",
    artifactType: "competitor_persona_messaging_content_brief",
    name: "persona",
    version: 1,
    contentRef: "workflow://b/brief",
    contentType: "text/markdown",
    payload: { markdown: "# B" },
    lineage: { parentArtifactIds: [], producedByRunId: runId },
  });
  const market = await createArtifact({
    runId,
    branchId: "branch-c",
    stepId: "C3",
    artifactType: "market_content_brief",
    name: "market",
    version: 1,
    contentRef: "workflow://c/brief",
    contentType: "text/markdown",
    payload: { markdown: "# C" },
    lineage: { parentArtifactIds: [], producedByRunId: runId },
  });

  return {
    "branch-a": functionality,
    "branch-b": persona,
    "branch-c": market,
  };
}

describe("content workflow final package assembler", () => {
  beforeEach(async () => {
    _setRedisForWorkflowArtifactsTesting(null);
    await _clearAllArtifacts();
  });

  it("builds payload from required branch artifact refs", async () => {
    const artifactsByBranchId = await seedRequiredArtifacts("run-assembler-1");
    const payload = buildFinalPillarPackagePayload(
      artifactsByBranchId,
      "workflow://final-aggregation/run-assembler-1/v1"
    );

    expect(payload.functionalityBriefRef).toBe("workflow://a/brief");
    expect(payload.personaMessagingBriefRef).toBe("workflow://b/brief");
    expect(payload.marketBriefRef).toBe("workflow://c/brief");
    expect(payload.finalAggregationRef).toContain("run-assembler-1");
  });

  it("assembles final package and maintains lineage/version chain", async () => {
    const artifactsByBranchId = await seedRequiredArtifacts("run-assembler-2");
    const first = await assembleFinalPillarPackage(
      "run-assembler-2",
      artifactsByBranchId
    );
    const second = await assembleFinalPillarPackage(
      "run-assembler-2",
      artifactsByBranchId
    );
    const latest = await getLatestFinalPillarPackage("run-assembler-2");

    expect(first.artifactType).toBe("final_pillar_package");
    expect(first.version).toBe(1);
    expect(first.lineage.parentArtifactIds.sort()).toEqual(
      Object.values(artifactsByBranchId)
        .map((artifact) => artifact.id)
        .sort()
    );

    expect(second.version).toBe(2);
    expect(second.previousArtifactId).toBe(first.id);
    expect(latest?.id).toBe(second.id);
  });
});
