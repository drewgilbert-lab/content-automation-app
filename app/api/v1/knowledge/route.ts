import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-middleware";
import { listKnowledgeObjectsPaginated } from "@/lib/knowledge";
import { VALID_TYPES, type KnowledgeType } from "@/lib/knowledge-types";

export const runtime = "nodejs";

export const GET = withApiAuth(async (req: NextRequest) => {
  const url = req.nextUrl ?? new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const tagsParam = url.searchParams.get("tags") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const includeDeprecated = url.searchParams.get("include_deprecated") === "true";

  if (type && !VALID_TYPES.includes(type as KnowledgeType)) {
    return Response.json(
      { error: `Invalid type. Valid values: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500) : 100;
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;
  const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  try {
    const { items, total } = await listKnowledgeObjectsPaginated({
      type: type as KnowledgeType | undefined,
      tags,
      limit,
      offset,
      includeDeprecated,
    });

    return Response.json({
      data: items,
      meta: { total, limit, offset },
    });
  } catch {
    return Response.json(
      { error: "Failed to fetch knowledge objects" },
      { status: 500 }
    );
  }
});
