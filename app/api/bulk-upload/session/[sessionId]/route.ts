import { getSerializedSession } from "@/lib/upload-session";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const state = getSerializedSession(sessionId);

  if (!state) {
    return Response.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  return Response.json(state);
}
