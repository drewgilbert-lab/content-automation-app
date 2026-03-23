import {
  getSkill,
  updateSkill,
  deleteSkill,
  checkSkillReferences,
  activateSkill,
  deactivateSkill,
  deprecateSkill,
  restoreSkill,
  SkillNameConflictError,
  CONTENT_TYPES,
  isValidContentType,
} from "@/lib/skills";
import type { SkillUpdateInput } from "@/lib/skill-types";
import { requireRole } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("viewer");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const skill = await getSkill(id);

    if (!skill) {
      return new Response(
        JSON.stringify({ error: "Skill not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(skill);
  } catch (error) {
    console.error("Skill detail API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch skill" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
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
      version,
      tags,
      category,
      author,
      sourceKnowledgeObjects,
    } = body;

    if (name !== undefined && !String(name).trim()) {
      return new Response(
        JSON.stringify({ error: "name cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (contentType !== undefined && !Array.isArray(contentType)) {
      return new Response(
        JSON.stringify({ error: "contentType must be an array when provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (Array.isArray(contentType)) {
      const normalizedContentTypes = contentType.map(String);
      const invalidContentTypes = normalizedContentTypes.filter(
        (ct) => !isValidContentType(ct)
      );
      if (invalidContentTypes.length > 0) {
        return new Response(
          JSON.stringify({
            error: `Invalid contentType value(s): ${invalidContentTypes.join(", ")}. Valid types: ${CONTENT_TYPES.join(", ")}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const input: SkillUpdateInput = { updatedBy: authResult.email };
    if (name !== undefined) input.name = String(name).trim();
    if (description !== undefined) input.description = String(description);
    if (content !== undefined) input.content = String(content);
    if (contentType !== undefined) {
      input.contentType = (contentType as unknown[]).map(String);
    }
    if (active !== undefined) input.active = Boolean(active);
    if (triggerConditions !== undefined) input.triggerConditions = String(triggerConditions);
    if (parameters !== undefined) input.parameters = String(parameters);
    if (outputFormat !== undefined) input.outputFormat = String(outputFormat);
    if (version !== undefined) input.version = String(version);
    if (tags !== undefined) input.tags = Array.isArray(tags) ? tags.map(String) : [];
    if (category !== undefined) input.category = String(category);
    if (author !== undefined) input.author = String(author);
    if (sourceKnowledgeObjects !== undefined) {
      if (sourceKnowledgeObjects !== null && !Array.isArray(sourceKnowledgeObjects)) {
        return new Response(
          JSON.stringify({ error: "sourceKnowledgeObjects must be an array when provided" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (Array.isArray(sourceKnowledgeObjects)) {
        for (const link of sourceKnowledgeObjects) {
          if (typeof link.id !== "string" || !link.id) {
            return new Response(
              JSON.stringify({ error: "Each sourceKnowledgeObjects item must have a non-empty string id" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
          if (typeof link.collection !== "string" || !link.collection) {
            return new Response(
              JSON.stringify({ error: "Each sourceKnowledgeObjects item must have a non-empty string collection" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
          if (typeof link.integrationPrompt !== "string" || !link.integrationPrompt.trim()) {
            return new Response(
              JSON.stringify({ error: "Each sourceKnowledgeObjects item must have a non-empty integrationPrompt" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }
        }
      }
      input.sourceKnowledgeObjects = sourceKnowledgeObjects;
    }

    await updateSkill(id, input);
    const updated = await getSkill(id);

    if (!updated) {
      return new Response(
        JSON.stringify({ error: "Skill not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof SkillNameConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Skill update API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update skill" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("editor");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const confirm = req.nextUrl.searchParams.get("confirm") === "true";

    const refCount = await checkSkillReferences(id);

    if (refCount > 0 && !confirm) {
      return Response.json({
        warning: `This skill is referenced by ${refCount} generated content item(s). Pass ?confirm=true to delete anyway.`,
        referencedByCount: refCount,
      });
    }

    const deleted = await deleteSkill(id);

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "Skill not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Skill delete API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete skill" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

const VALID_ACTIONS = ["activate", "deactivate", "deprecate", "restore"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (!VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({
          error: `action must be one of: ${VALID_ACTIONS.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let success = false;
    switch (action) {
      case "activate":
        success = await activateSkill(id);
        break;
      case "deactivate":
        success = await deactivateSkill(id);
        break;
      case "deprecate":
        success = await deprecateSkill(id);
        break;
      case "restore":
        success = await restoreSkill(id);
        break;
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Skill not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const skill = await getSkill(id);
    return Response.json({
      id,
      active: skill?.active ?? action === "activate",
      deprecated: skill?.deprecated ?? action === "deprecate",
    });
  } catch (error) {
    console.error("Skill action API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update skill" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
