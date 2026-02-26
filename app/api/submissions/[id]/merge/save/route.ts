export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSubmission } from "@/lib/submissions";
import { updateKnowledgeObject } from "@/lib/knowledge";
import { withWeaviate } from "@/lib/weaviate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { mergedContent } = body;

    if (!mergedContent || typeof mergedContent !== "string") {
      return Response.json(
        { error: "mergedContent is required and must be a string" },
        { status: 400 }
      );
    }

    const submission = await getSubmission(id);

    if (!submission) {
      return Response.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.submissionType !== "update" && submission.submissionType !== "document_add") {
      return Response.json(
        { error: "Merge save is only available for update and document_add submissions" },
        { status: 400 }
      );
    }

    if (submission.status !== "pending" && submission.status !== "deferred") {
      return Response.json(
        { error: "Submission is already closed" },
        { status: 409 }
      );
    }

    if (!submission.targetObjectId) {
      return Response.json(
        { error: "Submission has no target object" },
        { status: 400 }
      );
    }

    await updateKnowledgeObject(submission.targetObjectId, {
      content: mergedContent,
    });

    const now = new Date().toISOString();
    await withWeaviate(async (client) => {
      const collection = client.collections.use("Submission");
      await collection.data.update({
        id,
        properties: { status: "accepted", reviewedAt: now },
      });
    });

    return Response.json({
      id,
      status: "accepted",
      objectId: submission.targetObjectId,
    });
  } catch (error) {
    console.error("Merge save error:", error);
    return Response.json(
      { error: "Failed to save merged content" },
      { status: 500 }
    );
  }
}
