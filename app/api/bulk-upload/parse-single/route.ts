import { NextRequest } from "next/server";
import { parseDocument } from "@/lib/document-parser";
import { addDocumentToSession, getSession } from "@/lib/upload-session";
import { DEFAULT_LIMITS } from "@/lib/document-parser-types";
import { requireRole } from "@/lib/auth-server";
import { asUploadBlob } from "@/lib/upload-blob";

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

    const rawFile = asUploadBlob(formData.get("file"));
    if (!rawFile) {
      return Response.json(
        { error: "A single file is required" },
        { status: 400 }
      );
    }

    // Next.js FormData may yield Blob rather than File; preserve filename when present.
    const filename =
      rawFile instanceof File && rawFile.name
        ? rawFile.name
        : "upload.bin";
    const file =
      rawFile instanceof File
        ? rawFile
        : new File([rawFile], filename, {
            type: rawFile.type || "application/octet-stream",
          });

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
      content: parsed.content,
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
