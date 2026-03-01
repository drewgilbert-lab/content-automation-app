import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-middleware";
import { getSkill } from "@/lib/skills";

export const runtime = "nodejs";

export const GET = withApiAuth(
  async (req: NextRequest) => {
    const url = req.nextUrl ?? new URL(req.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!id) {
      return Response.json({ error: "Missing id parameter" }, { status: 400 });
    }

    try {
      const skill = await getSkill(id);
      if (!skill) {
        return Response.json(
          { error: "Skill not found" },
          { status: 404 }
        );
      }

      return Response.json({ data: skill });
    } catch {
      return Response.json(
        { error: "Failed to fetch skill" },
        { status: 500 }
      );
    }
  }
);
