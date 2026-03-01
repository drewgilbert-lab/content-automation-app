import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api-middleware";
import { getKnowledgeObject } from "@/lib/knowledge";

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
      const obj = await getKnowledgeObject(id);
      if (!obj) {
        return Response.json(
          { error: "Knowledge object not found" },
          { status: 404 }
        );
      }

      return Response.json({ data: obj });
    } catch {
      return Response.json(
        { error: "Failed to fetch knowledge object" },
        { status: 500 }
      );
    }
  }
);
