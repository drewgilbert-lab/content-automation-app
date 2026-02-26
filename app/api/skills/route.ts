import {
  listSkills,
  createSkill,
  SkillNameConflictError,
  CONTENT_TYPES,
} from "@/lib/skills";
import type { SkillCreateInput } from "@/lib/skill-types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const contentType = req.nextUrl.searchParams.get("contentType") ?? undefined;
    const activeParam = req.nextUrl.searchParams.get("active");
    const category = req.nextUrl.searchParams.get("category") ?? undefined;

    if (contentType && !CONTENT_TYPES.includes(contentType as typeof CONTENT_TYPES[number])) {
      return new Response(
        JSON.stringify({
          error: `Invalid contentType "${contentType}". Valid types: ${CONTENT_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const active =
      activeParam === "true" ? true : activeParam === "false" ? false : undefined;

    const skills = await listSkills({ contentType, active, category });

    return Response.json({ skills });
  } catch (error) {
    console.error("Skills list API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch skills" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      content,
      contentType,
      active,
      triggerConditions,
      parameters,
      outputFormat,
      tags,
      category,
      author,
    } = body;

    if (!name || !description || !content) {
      return new Response(
        JSON.stringify({ error: "name, description, and content are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(contentType) || contentType.length === 0) {
      return new Response(
        JSON.stringify({ error: "contentType must be a non-empty array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input: SkillCreateInput = {
      name: String(name).trim(),
      description: String(description),
      content: String(content),
      contentType: contentType.map(String),
      active: active !== undefined ? Boolean(active) : undefined,
      triggerConditions: triggerConditions ? String(triggerConditions) : undefined,
      parameters: parameters ? String(parameters) : undefined,
      outputFormat: outputFormat ? String(outputFormat) : undefined,
      tags: Array.isArray(tags) ? tags.map(String) : [],
      category: category ? String(category) : undefined,
      author: author ? String(author) : undefined,
    };

    const id = await createSkill(input);

    return new Response(
      JSON.stringify({ id, name: input.name, version: "1.0.0" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof SkillNameConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Skill create API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create skill" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
