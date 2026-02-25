import {
  listKnowledgeObjects,
  createKnowledgeObject,
  NameConflictError,
  VALID_TYPES,
  type KnowledgeType,
} from "@/lib/knowledge";
import type { KnowledgeCreateInput } from "@/lib/knowledge-types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? undefined;

    if (type && !VALID_TYPES.includes(type as KnowledgeType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid type "${type}". Valid types: ${VALID_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const objects = await listKnowledgeObjects(type as KnowledgeType | undefined);

    return Response.json({ objects });
  } catch (error) {
    console.error("Knowledge list API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch knowledge objects" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, content, tags, subType, revenueRange, employeeRange, website, customerName, industry, personaId, segmentId } = body;

    if (!type || !name || !content) {
      return new Response(
        JSON.stringify({ error: "type, name, and content are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!VALID_TYPES.includes(type as KnowledgeType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid type "${type}". Valid types: ${VALID_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input: KnowledgeCreateInput = {
      type: type as KnowledgeType,
      name: String(name).trim(),
      content: String(content),
      tags: Array.isArray(tags) ? tags.map(String) : [],
      subType: subType ? String(subType) : undefined,
      revenueRange: revenueRange ? String(revenueRange) : undefined,
      employeeRange: employeeRange ? String(employeeRange) : undefined,
      website: website ? String(website) : undefined,
      customerName: customerName ? String(customerName) : undefined,
      industry: industry ? String(industry) : undefined,
      personaId: personaId ? String(personaId) : undefined,
      segmentId: segmentId ? String(segmentId) : undefined,
    };

    const id = await createKnowledgeObject(input);

    return new Response(
      JSON.stringify({ id, name: input.name, type: input.type }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof NameConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Knowledge create API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create knowledge object" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
