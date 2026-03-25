import { submitForReview, ContentStatusError } from "@/lib/content";
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
    await submitForReview(id, authResult.email);

    return Response.json({ id, status: "submitted" });
  } catch (error) {
    if (error instanceof ContentStatusError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Content submit API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit content for review" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
