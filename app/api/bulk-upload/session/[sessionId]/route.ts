import { getSerializedSession } from "@/lib/upload-session";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { sessionId } = await params;
  const state = await getSerializedSession(sessionId);

  if (!state) {
    return Response.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  return Response.json(state);
}
