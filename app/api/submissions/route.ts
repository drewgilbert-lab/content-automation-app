export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  createSubmission,
  listSubmissions,
  VALID_SUBMISSION_TYPES,
  VALID_STATUSES,
  VALID_OBJECT_TYPES,
  type SubmissionType,
  type SubmissionStatus,
  type SubmissionObjectType,
  type SourceChannel,
} from "@/lib/submissions";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole("viewer");
    if (authResult instanceof Response) return authResult;

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
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

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

    if (!VALID_OBJECT_TYPES.includes(objectType as SubmissionObjectType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid objectType "${objectType}". Valid types: ${VALID_OBJECT_TYPES.join(", ")}`,
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

    const { sourceChannel, sourceAppId, sourceDescription } = body;

    const input = {
      submitter: authResult.email || String(submitter).trim(),
      objectType: objectType as SubmissionObjectType,
      objectName: String(objectName).trim(),
      submissionType: submissionType as SubmissionType,
      proposedContent: String(proposedContent),
      targetObjectId: targetObjectId ? String(targetObjectId).trim() : undefined,
      sourceChannel: sourceChannel ? String(sourceChannel).trim() as SourceChannel : undefined,
      sourceAppId: sourceAppId ? String(sourceAppId).trim() : undefined,
      sourceDescription: sourceDescription ? String(sourceDescription).trim() : undefined,
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
