import { requireRole } from "@/lib/auth-server";
import { getSkill } from "@/lib/skills";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const skill = await getSkill(id);

    if (!skill) {
      return new Response(
        JSON.stringify({ error: "Skill not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const [personas, segments, useCases] = await Promise.all([
      listKnowledgeObjects("persona"),
      listKnowledgeObjects("segment"),
      listKnowledgeObjects("use_case"),
    ]);

    return Response.json({
      personas: personas.map(({ id, name }) => ({ id, name })),
      segments: segments.map(({ id, name }) => ({ id, name })),
      useCases: useCases.map(({ id, name }) => ({ id, name })),
    });
  } catch (error) {
    console.error("Skill test context API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch test context" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
