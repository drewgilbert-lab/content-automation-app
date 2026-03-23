export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { cancelRun } from "@/lib/content-workflow-store";
import { requireRole } from "@/lib/auth";

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
    const run = await cancelRun(id);
    if (!run) {
      return jsonError("Run not found", 404);
    }

    return new Response(
      JSON.stringify({
        id: run.id,
        status: run.status,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel run";
    return jsonError(message, 500);
  }
}
