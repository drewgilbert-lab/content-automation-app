import {
  getConnectedSystem,
  updateConnectedSystem,
  deleteConnectedSystem,
  activateConnectedSystem,
  deactivateConnectedSystem,
  ConnectedSystemNameConflictError,
} from "@/lib/connections";
import type { ConnectedSystemUpdateInput } from "@/lib/connection-types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const system = await getConnectedSystem(id);

    if (!system) {
      return new Response(
        JSON.stringify({ error: "Connected system not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(system);
  } catch (error) {
    console.error("Connected system detail API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch connected system" }),
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
    const { name, description, subscribedTypes, rateLimitTier } = body;

    if (name !== undefined && !String(name).trim()) {
      return new Response(
        JSON.stringify({ error: "name cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input: ConnectedSystemUpdateInput = {};
    if (name !== undefined) input.name = String(name).trim();
    if (description !== undefined) input.description = String(description);
    if (subscribedTypes !== undefined)
      input.subscribedTypes = Array.isArray(subscribedTypes)
        ? subscribedTypes.map(String)
        : [];
    if (rateLimitTier !== undefined) input.rateLimitTier = String(rateLimitTier);

    const updated = await updateConnectedSystem(id, input);

    if (!updated) {
      return new Response(
        JSON.stringify({ error: "Connected system not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(updated);
  } catch (error) {
    if (error instanceof ConnectedSystemNameConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Connected system update API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update connected system" }),
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
    const deleted = await deleteConnectedSystem(id);

    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "Connected system not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Connected system delete API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete connected system" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

const VALID_ACTIONS = ["activate", "deactivate"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        success = await activateConnectedSystem(id);
        break;
      case "deactivate":
        success = await deactivateConnectedSystem(id);
        break;
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Connected system not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const system = await getConnectedSystem(id);
    return Response.json({
      id,
      active: system?.active ?? action === "activate",
    });
  } catch (error) {
    console.error("Connected system action API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update connected system" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
