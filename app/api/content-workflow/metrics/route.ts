export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getWorkflowMetricsSnapshot } from "@/lib/content-workflow-telemetry";
import { requireAuth } from "@/lib/auth";

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(_req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const metrics = await getWorkflowMetricsSnapshot();
    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch workflow metrics";
    return jsonError(message, 500);
  }
}
