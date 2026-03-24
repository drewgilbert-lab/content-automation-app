import { requireRole } from "@/lib/auth-server";
import { listAuditEvents } from "@/lib/audit";
import { isValidAuditEventType } from "@/lib/audit-types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole("admin");
    if (authResult instanceof Response) return authResult;

    const url = new URL(req.url);
    const eventType = url.searchParams.get("type") ?? undefined;
    const actorEmail = url.searchParams.get("actor") ?? undefined;
    const limitStr = url.searchParams.get("limit");
    const offsetStr = url.searchParams.get("offset");

    if (eventType && !isValidAuditEventType(eventType)) {
      return Response.json(
        { error: `Invalid event type: ${eventType}` },
        { status: 400 }
      );
    }

    const limit = limitStr ? Math.max(1, Math.min(200, parseInt(limitStr, 10) || 50)) : 50;
    const offset = offsetStr ? Math.max(0, parseInt(offsetStr, 10) || 0) : 0;

    const { events, total } = await listAuditEvents({
      eventType,
      actorEmail,
      limit,
      offset,
    });

    return Response.json({ events, total, limit, offset });
  } catch (error) {
    console.error("Admin audit list API error:", error);
    return Response.json(
      { error: "Failed to list audit events" },
      { status: 500 }
    );
  }
}
