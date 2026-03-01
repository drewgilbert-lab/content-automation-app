import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-middleware";
import { listSkills } from "@/lib/skills";

export const runtime = "nodejs";

export const GET = withApiAuth(async (req: NextRequest) => {
  const url = req.nextUrl ?? new URL(req.url);
  const contentType = url.searchParams.get("content_type") ?? undefined;
  const activeParam = url.searchParams.get("active");
  const category = url.searchParams.get("category") ?? undefined;

  const filters: { contentType?: string; active?: boolean; category?: string } = {};
  if (contentType) filters.contentType = contentType;
  if (activeParam !== null) filters.active = activeParam === "true";
  if (category) filters.category = category;

  try {
    const skills = await listSkills(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return Response.json({
      data: skills,
      meta: { total: skills.length },
    });
  } catch {
    return Response.json(
      { error: "Failed to fetch skills" },
      { status: 500 }
    );
  }
});
