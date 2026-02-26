export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSession, setClassification } from "@/lib/upload-session";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { classifyDocument } from "@/lib/classifier";

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

  const sessionId = body.sessionId;
  const documentIndex = body.documentIndex;

  if (typeof sessionId !== "string" || !sessionId) {
    return new Response(
      JSON.stringify({ error: "sessionId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (typeof documentIndex !== "number" || !Number.isInteger(documentIndex)) {
    return new Response(
      JSON.stringify({ error: "documentIndex is required and must be an integer" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return new Response(
      JSON.stringify({ error: "Session not found or expired" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (documentIndex < 0 || documentIndex >= session.documents.length) {
    return new Response(
      JSON.stringify({ error: "Invalid document index" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const doc = session.documents[documentIndex];
  if (!doc.content.trim()) {
    return new Response(
      JSON.stringify({ error: "Document has no extractable content" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let existingObjects;
  try {
    existingObjects = await listKnowledgeObjects();
  } catch (err) {
    console.error("Failed to fetch knowledge objects for reclassification:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch existing knowledge objects" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let classification;
  try {
    classification = await classifyDocument(doc, existingObjects);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `Classification failed: ${msg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  setClassification(sessionId, documentIndex, classification);
  session.userEdits.delete(documentIndex);

  return new Response(JSON.stringify(classification), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
