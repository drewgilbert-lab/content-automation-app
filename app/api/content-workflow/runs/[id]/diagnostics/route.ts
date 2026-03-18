export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getRunDiagnostics } from "@/lib/content-workflow-orchestrator";

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
    const diagnostics = await getRunDiagnostics(id);
    if (!diagnostics.run) {
      return jsonError("Run not found", 404);
    }

    return new Response(
      JSON.stringify({
        run: diagnostics.run,
        failedBranches: diagnostics.branches.filter((branch) => branch.status === "failed"),
        failedSteps: diagnostics.steps.filter((step) => step.status === "failed"),
        logs: diagnostics.logs,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch run diagnostics";
    const status = message.includes("not found") ? 404 : 500;
    return jsonError(message, status);
  }
}
