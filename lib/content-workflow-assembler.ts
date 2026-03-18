import {
  createArtifact,
  getLatestArtifactForNameAndType,
  listArtifactsByRunAndType,
} from "./content-workflow-artifacts";
import type {
  BranchType,
  FinalPillarPackagePayload,
  PillarResearchArtifact,
} from "./content-workflow-types";
import { BRANCH_AGGREGATE_ARTIFACT_TYPES } from "./content-workflow-types";

type RequiredAggregateArtifact = PillarResearchArtifact<
  | "functionality_content_brief"
  | "competitor_persona_messaging_content_brief"
  | "market_content_brief"
>;

const FINAL_PACKAGE_ARTIFACT_NAME_PREFIX = "pillar-research.final-pillar-package";

function artifactForBranchType(
  branchType: BranchType,
  artifactsByBranchId: Record<string, RequiredAggregateArtifact>
): RequiredAggregateArtifact | null {
  const expectedType = BRANCH_AGGREGATE_ARTIFACT_TYPES[branchType];
  const candidate = Object.values(artifactsByBranchId).find(
    (artifact) => artifact.artifactType === expectedType
  );
  return candidate ?? null;
}

export function buildFinalPillarPackagePayload(
  artifactsByBranchId: Record<string, RequiredAggregateArtifact>,
  finalAggregationRef?: string
): FinalPillarPackagePayload {
  const functionality = artifactForBranchType(
    "competitor_functionality",
    artifactsByBranchId
  );
  const personaMessaging = artifactForBranchType(
    "competitor_persona_messaging",
    artifactsByBranchId
  );
  const market = artifactForBranchType("market_research", artifactsByBranchId);

  if (!functionality || !personaMessaging || !market) {
    throw new Error("Cannot assemble final package: missing one or more branch aggregate artifacts");
  }

  return {
    functionalityBriefRef: functionality.contentRef,
    personaMessagingBriefRef: personaMessaging.contentRef,
    marketBriefRef: market.contentRef,
    finalAggregationRef,
  };
}

export async function assembleFinalPillarPackage(
  runId: string,
  artifactsByBranchId: Record<string, RequiredAggregateArtifact>
): Promise<PillarResearchArtifact<"final_pillar_package">> {
  const name = `${FINAL_PACKAGE_ARTIFACT_NAME_PREFIX}.${runId.slice(0, 8)}`;
  const latest = await getLatestArtifactForNameAndType(
    runId,
    "final_pillar_package",
    name
  );
  const nextVersion = latest ? latest.version + 1 : 1;
  const finalAggregationRef = `workflow://final-aggregation/${runId}/v${nextVersion}`;

  const payload = buildFinalPillarPackagePayload(
    artifactsByBranchId,
    finalAggregationRef
  );

  return createArtifact({
    runId,
    artifactType: "final_pillar_package",
    name,
    version: nextVersion,
    previousArtifactId: latest?.id,
    contentType: "application/json",
    contentRef: `workflow://final-package/${runId}/v${nextVersion}`,
    payload,
    lineage: {
      parentArtifactIds: Object.values(artifactsByBranchId).map(
        (artifact) => artifact.id
      ),
      producedByRunId: runId,
    },
    metadata: {
      branchArtifactCount: Object.keys(artifactsByBranchId).length,
      strictFanIn: true,
    },
  });
}

export async function getLatestFinalPillarPackage(
  runId: string
): Promise<PillarResearchArtifact<"final_pillar_package"> | null> {
  const artifacts = await listArtifactsByRunAndType(runId, "final_pillar_package");
  const sorted = artifacts.sort((a, b) => b.version - a.version);
  return sorted[0] ?? null;
}
