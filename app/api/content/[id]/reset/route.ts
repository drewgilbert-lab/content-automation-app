import { resetToDraft, ContentStatusError } from "@/lib/content";
import { requireRole } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    await resetToDraft(id, authResult.email);

    return Response.json({ reset: true });
  } catch (error) {
    if (error instanceof ContentStatusError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof Error && error.message === "Content not found") {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Content reset API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reset content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
