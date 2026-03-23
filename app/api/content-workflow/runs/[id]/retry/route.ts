export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { retryRunTarget } from "@/lib/content-workflow-orchestrator";
import { requireRole } from "@/lib/auth-server";

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;
    const { id } = await params;
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const stepId = typeof body.stepId === "string" ? body.stepId : undefined;
    const branchId = typeof body.branchId === "string" ? body.branchId : undefined;
    const replayFromStepId =
      typeof body.replayFromStepId === "string" ? body.replayFromStepId : undefined;
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const requestedBy = typeof body.requestedBy === "string" ? body.requestedBy : undefined;
    const result = await retryRunTarget(id, {
      stepId,
      branchId,
      replayFromStepId,
      reason,
      requestedBy,
    });

    return new Response(JSON.stringify(result), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retry run target";
    const status = message.includes("not found") ? 404 : 400;
    return jsonError(message, status);
  }
}
