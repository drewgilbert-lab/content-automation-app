import { createSession, requiresDurableSessionStore, isRedisConfigured } from "@/lib/upload-session";
import { requireRole } from "@/lib/auth-server";

export const runtime = "nodejs";

/** Creates an empty upload session for incremental per-file parsing (G6). */
export async function POST() {
  const authResult = await requireRole("contributor");
  if (authResult instanceof Response) return authResult;

  if (requiresDurableSessionStore() && !isRedisConfigured()) {
    return Response.json(
      {
        error:
          "Upload sessions require Redis in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      },
      { status: 503 }
    );
  }

  try {
    const session = await createSession([]);
    return Response.json({ sessionId: session.id });
  } catch (error) {
    console.error("Failed to create upload session:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create upload session";
    return Response.json({ error: message }, { status: 500 });
  }
}
