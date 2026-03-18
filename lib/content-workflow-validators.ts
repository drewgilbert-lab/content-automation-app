import { listArtifactsByRunAndType } from "./content-workflow-artifacts";
import type { PillarResearchBranch, PillarResearchArtifact } from "./content-workflow-types";
import { BRANCH_AGGREGATE_ARTIFACT_TYPES } from "./content-workflow-types";

type RequiredAggregateArtifact = PillarResearchArtifact<
  | "functionality_content_brief"
  | "competitor_persona_messaging_content_brief"
  | "market_content_brief"
>;

export interface BranchAggregateValidationResult {
  valid: boolean;
  errors: string[];
  artifactsByBranchId: Record<string, RequiredAggregateArtifact>;
}

function getLatestByVersion<T extends RequiredAggregateArtifact>(
  artifacts: T[]
): T | null {
  if (artifacts.length === 0) {
    return null;
  }
  return [...artifacts].sort((a, b) => b.version - a.version)[0];
}

export async function validateBranchAggregateArtifacts(
  runId: string,
  branches: PillarResearchBranch[]
): Promise<BranchAggregateValidationResult> {
  const errors: string[] = [];
  const artifactsByBranchId: Record<string, RequiredAggregateArtifact> = {};

  await Promise.all(
    branches.map(async (branch) => {
      const requiredType = BRANCH_AGGREGATE_ARTIFACT_TYPES[branch.branchType];
      const byType = await listArtifactsByRunAndType(runId, requiredType);
      const latestForBranch = getLatestByVersion(
        byType.filter((artifact) => artifact.branchId === branch.id)
      );

      if (!latestForBranch) {
        errors.push(
          `Missing required artifact "${requiredType}" for branch "${branch.branchType}" (${branch.id})`
        );
        return;
      }

      artifactsByBranchId[branch.id] = latestForBranch;
    })
  );

  return {
    valid: errors.length === 0,
    errors,
    artifactsByBranchId,
  };
}
