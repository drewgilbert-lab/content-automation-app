export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getWorkflowSnapshot } from "@/lib/content-workflow-store";
import { listArtifactsByRun } from "@/lib/content-workflow-artifacts";
import { requireRole } from "@/lib/auth-server";

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
    const authResult = await requireRole("viewer");
    if (authResult instanceof Response) return authResult;
    const { id } = await params;
    const snapshot = await getWorkflowSnapshot(id);
    if (!snapshot) {
      return jsonError("Run not found", 404);
    }

    const artifacts = await listArtifactsByRun(id);
    return new Response(
      JSON.stringify({
        ...snapshot,
        artifacts,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Content workflow run detail API error:", error);
    return jsonError("Failed to fetch run", 500);
  }
}
