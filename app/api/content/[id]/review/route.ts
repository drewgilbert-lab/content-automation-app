import {
  beginReview,
  approveContent,
  rejectContent,
  ContentStatusError,
} from "@/lib/content";
import { requireRole } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("editor");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const body = await req.json();
    const { action, comment } = body;

    if (action !== "approve" && action !== "reject") {
      return new Response(
        JSON.stringify({ error: 'action must be "approve" or "reject"' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "reject" && (!comment || !String(comment).trim())) {
      return new Response(
        JSON.stringify({ error: "comment is required when rejecting content" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await beginReview(id, authResult.email);

    let status: string;
    if (action === "approve") {
      await approveContent(id, authResult.email, comment);
      status = "approved";
    } else {
      await rejectContent(id, authResult.email, comment);
      status = "draft";
    }

    return Response.json({ id, status });
  } catch (error) {
    if (error instanceof ContentStatusError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Content review API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to review content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
