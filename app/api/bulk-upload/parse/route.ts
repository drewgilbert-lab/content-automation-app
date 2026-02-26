import { NextRequest } from "next/server";
import { parseDocuments } from "@/lib/document-parser";
import { createSession, updateSessionStatus } from "@/lib/upload-session";
import { DEFAULT_LIMITS } from "@/lib/document-parser-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const fileEntries = formData.getAll("files");
  const files = fileEntries.filter((e): e is File => e instanceof File);

  if (files.length === 0) {
    return Response.json(
      { error: "No files provided" },
      { status: 400 }
    );
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const totalMB = totalBytes / 1024 / 1024;
  if (files.length > DEFAULT_LIMITS.maxBatchCount) {
    return Response.json(
      {
        error: `Batch contains ${files.length} files, exceeding the limit of ${DEFAULT_LIMITS.maxBatchCount}`,
      },
      { status: 400 }
    );
  }
  if (totalMB > DEFAULT_LIMITS.maxBatchSizeMB) {
    return Response.json(
      {
        error: `Batch total size ${totalMB.toFixed(1)} MB exceeds the limit of ${DEFAULT_LIMITS.maxBatchSizeMB} MB`,
      },
      { status: 400 }
    );
  }

  const { documents, errors } = await parseDocuments(files);

  const session = createSession(documents);
  updateSessionStatus(session.id, "reviewing");

  return Response.json({
    sessionId: session.id,
    documents: documents.map((doc, index) => ({
      index,
      filename: doc.filename,
      format: doc.format,
      wordCount: doc.wordCount,
      parseErrors: doc.errors,
    })),
    errors,
  });
}
