export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { classifyDocument } from "@/lib/classifier";
import type { ParsedDocument } from "@/lib/document-parser-types";
import { DEFAULT_LIMITS } from "@/lib/document-parser-types";
import type {
  ClassificationProgressEvent,
  ClassificationResultEvent,
  ClassificationErrorEvent,
  ClassificationDoneEvent,
} from "@/lib/classification-types";

function validateDocuments(
  docs: unknown
): { valid: ParsedDocument[]; error?: string } {
  if (!Array.isArray(docs)) {
    return { valid: [], error: '"documents" must be an array' };
  }
  if (docs.length === 0) {
    return { valid: [], error: '"documents" array must not be empty' };
  }
  if (docs.length > DEFAULT_LIMITS.maxBatchCount) {
    return {
      valid: [],
      error: `Batch contains ${docs.length} documents, exceeding the limit of ${DEFAULT_LIMITS.maxBatchCount}`,
    };
  }

  const validated: ParsedDocument[] = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (!d || typeof d !== "object") {
      return { valid: [], error: `documents[${i}] is not an object` };
    }
    if (typeof d.filename !== "string" || !d.filename) {
      return { valid: [], error: `documents[${i}].filename is required` };
    }
    if (typeof d.content !== "string") {
      return { valid: [], error: `documents[${i}].content must be a string` };
    }
    validated.push({
      filename: d.filename,
      format: d.format ?? "txt",
      content: d.content,
      wordCount: d.wordCount ?? 0,
      errors: Array.isArray(d.errors) ? d.errors : [],
    });
  }

  return { valid: validated };
}

function sseEncode(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { valid: documents, error: validationError } = validateDocuments(
    body.documents
  );
  if (validationError) {
    return new Response(
      JSON.stringify({ error: validationError }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let existingObjects;
  try {
    existingObjects = await listKnowledgeObjects();
  } catch (err) {
    console.error("Failed to fetch knowledge objects for classification:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch existing knowledge objects" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const total = documents.length;

  const stream = new ReadableStream({
    async start(controller) {
      let classified = 0;
      let failed = 0;

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];

        const progress: ClassificationProgressEvent = {
          index: i,
          total,
          filename: doc.filename,
          status: "classifying",
        };
        controller.enqueue(encoder.encode(sseEncode("progress", progress)));

        if (!doc.content.trim()) {
          const errorEvent: ClassificationErrorEvent = {
            index: i,
            filename: doc.filename,
            error: "Document has no extractable content",
          };
          controller.enqueue(encoder.encode(sseEncode("error", errorEvent)));
          failed++;
          continue;
        }

        try {
          const classification = await classifyDocument(doc, existingObjects);
          const result: ClassificationResultEvent = {
            index: i,
            filename: doc.filename,
            classification,
          };
          controller.enqueue(encoder.encode(sseEncode("result", result)));
          classified++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const errorEvent: ClassificationErrorEvent = {
            index: i,
            filename: doc.filename,
            error: `Classification failed: ${msg}`,
          };
          controller.enqueue(encoder.encode(sseEncode("error", errorEvent)));
          failed++;
        }
      }

      const done: ClassificationDoneEvent = { total, classified, failed };
      controller.enqueue(encoder.encode(sseEncode("done", done)));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
