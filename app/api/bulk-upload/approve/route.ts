export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSession } from "@/lib/upload-session";
import { createSubmission } from "@/lib/submissions";
import type { ClassificationResult } from "@/lib/classification-types";
import type { KnowledgeType } from "@/lib/knowledge-types";
import { VALID_TYPES } from "@/lib/knowledge-types";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const sessionId = body.sessionId;
  const documentIndexes = body.documentIndexes;
  const submitter = body.submitter;
  const overrides = body.overrides as Record<string, Partial<ClassificationResult>> | undefined;

  if (typeof sessionId !== "string" || !sessionId) {
    return Response.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(documentIndexes) || documentIndexes.length === 0) {
    return Response.json(
      { error: "documentIndexes is required and must be a non-empty array" },
      { status: 400 }
    );
  }

  if (typeof submitter !== "string" || !submitter.trim()) {
    return Response.json(
      { error: "submitter is required" },
      { status: 400 }
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return Response.json(
      { error: "Session not found or expired" },
      { status: 404 }
    );
  }

  const submissions: { documentIndex: number; submissionId: string }[] = [];
  const errors: { documentIndex: number; error: string }[] = [];

  for (const idx of documentIndexes) {
    const index = typeof idx === "number" ? idx : parseInt(String(idx), 10);
    if (!Number.isInteger(index) || index < 0 || index >= session.documents.length) {
      errors.push({ documentIndex: index, error: "Invalid document index" });
      continue;
    }

    const doc = session.documents[index];
    let classification: ClassificationResult | null = session.classifications.get(index) ?? null;
    if (classification && overrides?.[String(index)]) {
      classification = { ...classification, ...overrides[String(index)] };
    }

    if (!classification) {
      errors.push({ documentIndex: index, error: "No classification for document" });
      continue;
    }

    if (!VALID_TYPES.includes(classification.objectType as KnowledgeType)) {
      errors.push({ documentIndex: index, error: `Invalid objectType: ${classification.objectType}` });
      continue;
    }

    const proposedBody: Record<string, unknown> = {
      name: classification.objectName,
      content: doc.content,
      tags: classification.tags ?? [],
      sourceFile: doc.filename,
    };

    if (classification.objectType === "icp" && classification.suggestedRelationships?.length) {
      const persona = classification.suggestedRelationships.find(
        (r) => r.targetType === "persona"
      );
      const segment = classification.suggestedRelationships.find(
        (r) => r.targetType === "segment"
      );
      if (persona?.targetId) proposedBody.personaId = persona.targetId;
      if (segment?.targetId) proposedBody.segmentId = segment.targetId;
    }

    try {
      const { id } = await createSubmission({
        submitter: submitter.trim(),
        objectType: classification.objectType as KnowledgeType,
        objectName: classification.objectName,
        submissionType: "new",
        proposedContent: JSON.stringify(proposedBody),
      });
      submissions.push({ documentIndex: index, submissionId: id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ documentIndex: index, error: msg });
    }
  }

  return Response.json(
    { submissions, errors },
    { status: 201 }
  );
}
