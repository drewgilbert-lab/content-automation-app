export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  createSubmission,
  listSubmissions,
  VALID_SUBMISSION_TYPES,
  VALID_STATUSES,
  type SubmissionType,
  type SubmissionStatus,
} from "@/lib/submissions";
import { VALID_TYPES, type KnowledgeType } from "@/lib/knowledge-types";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    if (type && !VALID_SUBMISSION_TYPES.includes(type as SubmissionType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid type "${type}". Valid types: ${VALID_SUBMISSION_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (status && !VALID_STATUSES.includes(status as SubmissionStatus)) {
      return new Response(
        JSON.stringify({
          error: `Invalid status "${status}". Valid statuses: ${VALID_STATUSES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const filters: { submissionType?: SubmissionType; status?: SubmissionStatus } = {};
    if (type) filters.submissionType = type as SubmissionType;
    if (status) filters.status = status as SubmissionStatus;

    const submissions = await listSubmissions(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return new Response(
      JSON.stringify({ submissions }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Submissions list API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list submissions" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      submitter,
      objectType,
      objectName,
      submissionType,
      proposedContent,
      targetObjectId,
    } = body;

    if (!submitter || !objectType || !objectName || !submissionType || !proposedContent) {
      return new Response(
        JSON.stringify({
          error:
            "submitter, objectType, objectName, submissionType, and proposedContent are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!VALID_TYPES.includes(objectType as KnowledgeType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid objectType "${objectType}". Valid types: ${VALID_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!VALID_SUBMISSION_TYPES.includes(submissionType as SubmissionType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid submissionType "${submissionType}". Valid types: ${VALID_SUBMISSION_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if ((submissionType === "update" || submissionType === "document_add") && !targetObjectId) {
      return new Response(
        JSON.stringify({
          error: `targetObjectId is required when submissionType is '${submissionType}'`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input = {
      submitter: String(submitter).trim(),
      objectType: objectType as KnowledgeType,
      objectName: String(objectName).trim(),
      submissionType: submissionType as SubmissionType,
      proposedContent: String(proposedContent),
      targetObjectId: targetObjectId ? String(targetObjectId).trim() : undefined,
    };

    const { id, status } = await createSubmission(input);

    return new Response(JSON.stringify({ id, status }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Submissions create API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create submission" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
