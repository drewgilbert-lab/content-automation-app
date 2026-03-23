export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getLatestFinalPillarPackage } from "@/lib/content-workflow-assembler";
import { getWorkflowRun } from "@/lib/content-workflow-store";
import { requireAuth } from "@/lib/auth";

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
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const { id } = await params;
    const run = await getWorkflowRun(id);
    if (!run) {
      return jsonError("Run not found", 404);
    }

    const finalPackage = await getLatestFinalPillarPackage(id);
    if (!finalPackage) {
      return jsonError("Final package not found", 404);
    }

    return new Response(
      JSON.stringify({
        runId: id,
        packageArtifact: {
          id: finalPackage.id,
          name: finalPackage.name,
          version: finalPackage.version,
          artifactType: finalPackage.artifactType,
          contentRef: finalPackage.contentRef,
          createdAt: finalPackage.createdAt,
          lineage: finalPackage.lineage,
        },
        payload: finalPackage.payload,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Content workflow package API error:", error);
    return jsonError("Failed to fetch run package", 500);
  }
}
