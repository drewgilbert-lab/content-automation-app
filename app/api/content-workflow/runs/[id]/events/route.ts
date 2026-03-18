export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getWorkflowRun } from "@/lib/content-workflow-store";
import { listWorkflowEvents } from "@/lib/content-workflow-events";

function serializeEvent(event: {
  id: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}): string {
  return [
    `id: ${event.id}`,
    `event: ${event.type}`,
    `data: ${JSON.stringify({ timestamp: event.timestamp, ...event.payload })}`,
    "",
  ].join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await getWorkflowRun(id);
    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const after = req.nextUrl.searchParams.get("after") ?? undefined;
    const events = listWorkflowEvents(id, after);
    const payload = events.map(serializeEvent).join("\n");

    return new Response(payload, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stream events";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
