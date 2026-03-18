import { withApiAuth } from "@/lib/api-middleware";
import {
  CONTENT_TYPES,
  SKILL_CATEGORIES,
  getContentTypeLabel,
  getCategoryLabel,
} from "@/lib/skills";

export const runtime = "nodejs";

export const GET = withApiAuth(async () => {
  try {
    return Response.json({
      data: {
        contentTypes: CONTENT_TYPES.map((type) => ({
          type,
          displayName: getContentTypeLabel(type),
        })),
        categories: SKILL_CATEGORIES.map((category) => ({
          category,
          displayName: getCategoryLabel(category),
        })),
        notes: [
          "Use these canonical values when creating or updating skills.",
          "Values are shared across UI, API, and MCP contracts.",
        ],
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to fetch skill type metadata" },
      { status: 500 }
    );
  }
});
