import {
  getKnowledgeObject,
  updateKnowledgeObject,
  deleteKnowledgeObject,
  checkGeneratedContentReferences,
  deprecateKnowledgeObject,
  restoreKnowledgeObject,
  NameConflictError,
} from "@/lib/knowledge";
import type { KnowledgeUpdateInput } from "@/lib/knowledge-types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const object = await getKnowledgeObject(id);

    if (!object) {
      return new Response(
        JSON.stringify({ error: "Knowledge object not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(object);
  } catch (error) {
    console.error("Knowledge detail API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch knowledge object" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, content, tags, subType, revenueRange, employeeRange } = body;

    if (name !== undefined && !String(name).trim()) {
      return new Response(
        JSON.stringify({ error: "name cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input: KnowledgeUpdateInput = {};
    if (name !== undefined) input.name = String(name).trim();
    if (content !== undefined) input.content = String(content);
    if (tags !== undefined) input.tags = Array.isArray(tags) ? tags.map(String) : [];
    if (subType !== undefined) input.subType = String(subType);
    if (revenueRange !== undefined) input.revenueRange = String(revenueRange);
    if (employeeRange !== undefined) input.employeeRange = String(employeeRange);

    await updateKnowledgeObject(id, input);
    const updated = await getKnowledgeObject(id);

    if (!updated) {
      return new Response(
        JSON.stringify({ error: "Knowledge object not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof NameConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Knowledge update API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update knowledge object" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const confirm = req.nextUrl.searchParams.get("confirm") === "true";

    const refCount = await checkGeneratedContentReferences(id);

    if (refCount > 0 && !confirm) {
      return Response.json({
        warning: `This object is referenced by ${refCount} generated content item(s). Pass ?confirm=true to delete anyway.`,
        referencedByCount: refCount,
      });
    }

    const deleted = await deleteKnowledgeObject(id);

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "Knowledge object not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Knowledge delete API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete knowledge object" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (action !== "deprecate" && action !== "restore") {
      return new Response(
        JSON.stringify({ error: 'action must be "deprecate" or "restore"' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const success =
      action === "deprecate"
        ? await deprecateKnowledgeObject(id)
        : await restoreKnowledgeObject(id);

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Knowledge object not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json({ id, deprecated: action === "deprecate" });
  } catch (error) {
    console.error("Knowledge deprecation API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update deprecation status" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
