import { addRelationship, removeRelationship } from "@/lib/knowledge";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { targetId, relationshipType } = body;

    if (!targetId || !relationshipType) {
      return new Response(
        JSON.stringify({ error: "targetId and relationshipType are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await addRelationship(id, String(targetId), String(relationshipType));

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add relationship";
    const status = message.includes("not found") || message.includes("Invalid") || message.includes("must be")
      ? 400
      : 500;
    console.error("Relationship add API error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { targetId, relationshipType } = body;

    if (!targetId || !relationshipType) {
      return new Response(
        JSON.stringify({ error: "targetId and relationshipType are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await removeRelationship(id, String(targetId), String(relationshipType));

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove relationship";
    const status = message.includes("not found") || message.includes("Invalid")
      ? 400
      : 500;
    console.error("Relationship remove API error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
