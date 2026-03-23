export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { listFailedRunsWithDiagnostics } from "@/lib/content-workflow-orchestrator";
import { requireRole } from "@/lib/auth";

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(_req: NextRequest) {
  try {
    const authResult = await requireRole("viewer");
    if (authResult instanceof Response) return authResult;
    const failedRuns = await listFailedRunsWithDiagnostics();
    return new Response(
      JSON.stringify({
        count: failedRuns.length,
        runs: failedRuns,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list failed runs";
    return jsonError(message, 500);
  }
}
