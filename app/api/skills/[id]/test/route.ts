import { streamMessage } from "@/lib/claude";
import { assembleContext } from "@/lib/context-assembly";
import { requireRole } from "@/lib/auth-server";
import { getSkill } from "@/lib/skills";
import { isValidContentType } from "@/lib/skill-types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
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

    const body = await req.json();
    const {
      contentType,
      prompt,
      pinnedPersonaId,
      pinnedSegmentId,
      pinnedUseCaseId,
      withoutSkill,
    } = body;

    if (!contentType || !isValidContentType(contentType)) {
      return new Response(
        JSON.stringify({ error: "A valid contentType is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!prompt || !String(prompt).trim()) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const assembled = await assembleContext({
      contentType,
      prompt,
      skillSelectionMode: "manual",
      manualSkillIds: withoutSkill ? [] : [id],
      pinnedPersonaId,
      pinnedSegmentId,
      pinnedUseCaseId,
    });

    const stream = await streamMessage(assembled.systemPrompt, prompt);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
        "X-System-Prompt": Buffer.from(assembled.systemPrompt).toString(
          "base64"
        ),
      },
    });
  } catch (error) {
    console.error("Skill test API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process skill test" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
