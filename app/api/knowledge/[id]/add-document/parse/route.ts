export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { parseDocument } from "@/lib/document-parser";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "A single file is required" },
        { status: 400 }
      );
    }

    const parsed = await parseDocument(file);

    if (!parsed.content && parsed.errors.length > 0) {
      return Response.json(
        { error: `Parse failed: ${parsed.errors.join("; ")}` },
        { status: 422 }
      );
    }

    return Response.json({
      filename: parsed.filename,
      format: parsed.format,
      content: parsed.content,
      wordCount: parsed.wordCount,
      errors: parsed.errors,
    });
  } catch (error) {
    console.error("Document parse error:", error);
    return Response.json(
      { error: "Failed to parse document" },
      { status: 500 }
    );
  }
}
