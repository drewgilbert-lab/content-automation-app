import {
  getContent,
  updateContent,
  deleteContent,
  ContentStatusError,
} from "@/lib/content";
import type { ContentUpdateInput } from "@/lib/content-types";
import { requireRole } from "@/lib/auth-server";
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
    const content = await getContent(id);

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(content);
  } catch (error) {
    console.error("Content detail API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch content" }),
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
    const { title, body: contentBody, tags } = body;

    const input: ContentUpdateInput = { updatedBy: authResult.email };
    if (title !== undefined) input.title = String(title).trim();
    if (contentBody !== undefined) input.body = String(contentBody);
    if (tags !== undefined)
      input.tags = Array.isArray(tags) ? tags.map(String) : [];

    await updateContent(id, input);
    const updated = await getContent(id);

    if (!updated) {
      return new Response(
        JSON.stringify({ error: "Content not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof ContentStatusError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Content update API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update content" }),
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
    const deleted = await deleteContent(id);

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "Content not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof ContentStatusError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Content delete API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
