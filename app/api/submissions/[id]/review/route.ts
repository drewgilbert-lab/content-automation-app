export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  reviewSubmission,
  getSubmission,
  SubmissionClosedError,
  VALID_REVIEW_ACTIONS,
} from "@/lib/submissions";
import { getKnowledgeObject } from "@/lib/knowledge";
import { triggerSkillRefreshCheck } from "@/lib/skills";
import { requireRole } from "@/lib/auth-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("editor");
    if (authResult instanceof Response) return authResult;

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

    let preAcceptContent: string | undefined;
    let preAcceptSubmission: Awaited<ReturnType<typeof getSubmission>> | undefined;
    if (action === "accept") {
      preAcceptSubmission = await getSubmission(id);
      if (
        preAcceptSubmission &&
        preAcceptSubmission.objectType !== "skill" &&
        (preAcceptSubmission.submissionType === "update" ||
          preAcceptSubmission.submissionType === "document_add") &&
        preAcceptSubmission.targetObjectId
      ) {
        const currentObj = await getKnowledgeObject(preAcceptSubmission.targetObjectId);
        preAcceptContent = currentObj?.content;
      }
    }

    const result = await reviewSubmission(
      id,
      action,
      comment ? String(comment).trim() : undefined,
      note ? String(note) : undefined,
      authResult.email
    );

    if (
      action === "accept" &&
      preAcceptContent !== undefined &&
      preAcceptSubmission?.targetObjectId
    ) {
      const proposed = JSON.parse(preAcceptSubmission.proposedContent);
      triggerSkillRefreshCheck(
        preAcceptSubmission.targetObjectId,
        preAcceptSubmission.objectName,
        preAcceptContent,
        proposed.content ?? preAcceptContent
      ).catch(() => {});
    }

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
