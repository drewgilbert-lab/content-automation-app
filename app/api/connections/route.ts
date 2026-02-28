import {
  listConnectedSystems,
  createConnectedSystem,
  ConnectedSystemNameConflictError,
} from "@/lib/connections";
import type { ConnectedSystemCreateInput } from "@/lib/connection-types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const activeParam = req.nextUrl.searchParams.get("active");
    const active =
      activeParam === "true" ? true : activeParam === "false" ? false : undefined;

    const systems = await listConnectedSystems({ active });

    return Response.json({ systems });
  } catch (error) {
    console.error("Connected systems list API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch connected systems" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, subscribedTypes, rateLimitTier } = body;

    if (!name || !description) {
      return new Response(
        JSON.stringify({ error: "name and description are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (subscribedTypes !== undefined && !Array.isArray(subscribedTypes)) {
      return new Response(
        JSON.stringify({ error: "subscribedTypes must be an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input: ConnectedSystemCreateInput = {
      name: String(name).trim(),
      description: String(description),
      subscribedTypes: Array.isArray(subscribedTypes)
        ? subscribedTypes.map(String)
        : undefined,
      rateLimitTier: rateLimitTier ? String(rateLimitTier) : undefined,
    };

    const { id, plaintextKey } = await createConnectedSystem(input);

    return new Response(
      JSON.stringify({ id, name: input.name, apiKey: plaintextKey }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof ConnectedSystemNameConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Connected system create API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create connected system" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
