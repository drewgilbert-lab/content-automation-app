export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  reviewSubmission,
  SubmissionClosedError,
  VALID_REVIEW_ACTIONS,
} from "@/lib/submissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, comment, note } = body;

    if (!action || !VALID_REVIEW_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({
          error: `Invalid action. Must be one of: ${VALID_REVIEW_ACTIONS.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "reject" && (!comment || !String(comment).trim())) {
      return new Response(
        JSON.stringify({ error: "Comment is required when rejecting a submission" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await reviewSubmission(
      id,
      action,
      comment ? String(comment).trim() : undefined,
      note ? String(note) : undefined
    );

    return Response.json(result);
  } catch (error) {
    if (error instanceof SubmissionClosedError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to review submission" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
