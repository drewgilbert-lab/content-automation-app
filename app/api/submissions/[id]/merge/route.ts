export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSubmission } from "@/lib/submissions";
import { getKnowledgeObject } from "@/lib/knowledge";
import { buildMergePrompt, buildDocumentAdditionPrompt } from "@/lib/merge";
import { streamMessage } from "@/lib/claude";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await getSubmission(id);

    if (!submission) {
      return Response.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.submissionType !== "update" && submission.submissionType !== "document_add") {
      return Response.json(
        { error: "Merge is only available for update and document_add submissions" },
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

    const currentObject = await getKnowledgeObject(submission.targetObjectId);
    if (!currentObject) {
      return Response.json(
        { error: "Target knowledge object not found" },
        { status: 404 }
      );
    }

    let proposedContent: { content?: string; sourceFile?: string } = {};
    try {
      proposedContent = JSON.parse(submission.proposedContent) ?? {};
    } catch {
      return Response.json(
        { error: "Invalid proposed content format" },
        { status: 400 }
      );
    }

    const { systemPrompt, userMessage } =
      submission.submissionType === "document_add"
        ? buildDocumentAdditionPrompt(
            currentObject.content,
            proposedContent.content ?? "",
            proposedContent.sourceFile
          )
        : buildMergePrompt(
            currentObject.content,
            proposedContent.content ?? ""
          );

    const stream = await streamMessage(systemPrompt, userMessage);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Merge API error:", error);
    return Response.json(
      { error: "Failed to generate merge" },
      { status: 500 }
    );
  }
}
