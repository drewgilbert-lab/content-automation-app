import { NextRequest } from "next/server";
import { parseDocument } from "@/lib/document-parser";
import { addDocumentToSession, getSession } from "@/lib/upload-session";
import { DEFAULT_LIMITS } from "@/lib/document-parser-types";
import { requireRole } from "@/lib/auth-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return Response.json({ error: "Invalid form data" }, { status: 400 });
    }

    const sessionId = formData.get("sessionId");
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return Response.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "A single file is required" },
        { status: 400 }
      );
    }

    const maxBytes = DEFAULT_LIMITS.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json(
        {
          error: `File exceeds the ${DEFAULT_LIMITS.maxFileSizeMB} MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId);
    if (!session) {
      return Response.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    if (session.documents.length >= DEFAULT_LIMITS.maxBatchCount) {
      return Response.json(
        {
          error: `Session already has ${session.documents.length} documents, exceeding the limit of ${DEFAULT_LIMITS.maxBatchCount}`,
        },
        { status: 400 }
      );
    }

    const parsed = await parseDocument(file);
    const added = await addDocumentToSession(sessionId, parsed);
    if (!added) {
      return Response.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    return Response.json({
      sessionId,
      index: added.index,
      filename: parsed.filename,
      format: parsed.format,
      wordCount: parsed.wordCount,
      parseErrors: parsed.errors,
    });
  } catch (error) {
    console.error("Parse-single error:", error);
    return Response.json(
      { error: "Failed to parse document" },
      { status: 500 }
    );
  }
}
