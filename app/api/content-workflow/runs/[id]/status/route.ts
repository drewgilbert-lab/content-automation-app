export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getWorkflowSnapshot } from "@/lib/content-workflow-store";
import { listArtifactsByRun } from "@/lib/content-workflow-artifacts";

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snapshot = await getWorkflowSnapshot(id);
    if (!snapshot) {
      return jsonError("Run not found", 404);
    }

    const artifacts = await listArtifactsByRun(id);
    const branchesByStatus = snapshot.branches.reduce<Record<string, number>>(
      (acc, branch) => {
        acc[branch.status] = (acc[branch.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const stepsByStatus = snapshot.steps.reduce<Record<string, number>>(
      (acc, step) => {
        acc[step.status] = (acc[step.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return new Response(
      JSON.stringify({
        runId: snapshot.run.id,
        status: snapshot.run.status,
        branchCount: snapshot.branches.length,
        stepCount: snapshot.steps.length,
        artifactCount: artifacts.length,
        branchesByStatus,
        stepsByStatus,
        updatedAt:
          snapshot.run.completedAt ??
          snapshot.run.startedAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Content workflow run status API error:", error);
    return jsonError("Failed to fetch run status", 500);
  }
}
