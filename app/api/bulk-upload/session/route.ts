import { createSession } from "@/lib/upload-session";
import { requireRole } from "@/lib/auth-server";

export const runtime = "nodejs";

/** Creates an empty upload session for incremental per-file parsing (G6). */
export async function POST() {
  const authResult = await requireRole("contributor");
  if (authResult instanceof Response) return authResult;

  try {
    const session = await createSession([]);
    return Response.json({ sessionId: session.id });
  } catch (error) {
    console.error("Failed to create upload session:", error);
    return Response.json(
      { error: "Failed to create upload session" },
      { status: 500 }
    );
  }
}
