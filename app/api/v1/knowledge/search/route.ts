import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-middleware";
import { semanticSearchKnowledge } from "@/lib/knowledge";
import { VALID_TYPES, type KnowledgeType } from "@/lib/knowledge-types";

export const runtime = "nodejs";

export const GET = withApiAuth(async (req: NextRequest) => {
  const url = req.nextUrl ?? new URL(req.url);
  const q = url.searchParams.get("q");
  const type = url.searchParams.get("type") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const certaintyParam = url.searchParams.get("certainty");

  if (!q || !q.trim()) {
    return Response.json(
      { error: "Missing required parameter: q" },
      { status: 400 }
    );
  }

  if (type && !VALID_TYPES.includes(type as KnowledgeType)) {
    return Response.json(
      { error: `Invalid type. Valid values: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10;
  const certainty = certaintyParam ? Math.min(Math.max(parseFloat(certaintyParam) || 0.7, 0), 1) : 0.7;

  try {
    const results = await semanticSearchKnowledge({
      q: q.trim(),
      type: type as KnowledgeType | undefined,
      limit,
      certainty,
    });

    return Response.json({ data: results });
  } catch {
    return Response.json(
      { error: "Failed to perform semantic search" },
      { status: 500 }
    );
  }
});
