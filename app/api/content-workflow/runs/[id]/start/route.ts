export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { startRunOrchestration } from "@/lib/content-workflow-orchestrator";
import { requireRole } from "@/lib/auth-server";

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;
    const { id } = await params;
    const result = await startRunOrchestration(id);

    return new Response(JSON.stringify(result), {
      status: result.started ? 202 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start run";
    const status = message.includes("not found") ? 404 : 400;
    return jsonError(message, status);
  }
}
