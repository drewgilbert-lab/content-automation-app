import {
  listContent,
  createContent,
  VALID_CONTENT_STATUSES,
  VALID_CONTENT_SOURCE_CHANNELS,
  ContentStatusError,
} from "@/lib/content";
import type {
  ContentCreateInput,
  ContentStatus,
  ContentSourceChannel,
} from "@/lib/content-types";
import { isValidContentType } from "@/lib/skill-types";
import { requireRole } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const contentType =
      req.nextUrl.searchParams.get("contentType") ?? undefined;
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const sourceChannel =
      req.nextUrl.searchParams.get("sourceChannel") ?? undefined;
    const tagsParam = req.nextUrl.searchParams.get("tags") ?? undefined;
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const limitParam = req.nextUrl.searchParams.get("limit");
    const offsetParam = req.nextUrl.searchParams.get("offset");
    const createdBy = req.nextUrl.searchParams.get("createdBy") ?? undefined;

    if (contentType && !isValidContentType(contentType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid contentType "${contentType}".`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (status && !VALID_CONTENT_STATUSES.includes(status as ContentStatus)) {
      return new Response(
        JSON.stringify({
          error: `Invalid status "${status}". Valid statuses: ${VALID_CONTENT_STATUSES.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (
      sourceChannel &&
      !VALID_CONTENT_SOURCE_CHANNELS.includes(
        sourceChannel as ContentSourceChannel
      )
    ) {
      return new Response(
        JSON.stringify({
          error: `Invalid sourceChannel "${sourceChannel}". Valid channels: ${VALID_CONTENT_SOURCE_CHANNELS.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const tags = tagsParam
      ? tagsParam.split(",").map((t) => t.trim())
      : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    const content = await listContent({
      contentType,
      status: status as ContentStatus | undefined,
      sourceChannel: sourceChannel as ContentSourceChannel | undefined,
      tags,
      search,
      limit,
      offset,
      createdBy,
    });

    return Response.json({ content });
  } catch (error) {
    console.error("Content list API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const body = await req.json();
    const {
      title,
      contentType,
      body: contentBody,
      prompt,
      tags,
      sourceChannel,
      sourceAppId,
      sourceDescription,
      personaId,
      segmentId,
      useCaseIds,
      businessRuleIds,
      skillIds,
    } = body;

    if (!title || !contentType || !contentBody) {
      return new Response(
        JSON.stringify({
          error: "title, contentType, and body are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isValidContentType(contentType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid contentType "${contentType}".`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const input: ContentCreateInput = {
      title: String(title).trim(),
      contentType: String(contentType),
      body: String(contentBody),
      prompt: prompt ? String(prompt) : undefined,
      tags: Array.isArray(tags) ? tags.map(String) : undefined,
      sourceChannel: sourceChannel ? String(sourceChannel) as ContentSourceChannel : undefined,
      sourceAppId: sourceAppId ? String(sourceAppId) : undefined,
      sourceDescription: sourceDescription
        ? String(sourceDescription)
        : undefined,
      createdBy: authResult.email,
      personaId: personaId ? String(personaId) : undefined,
      segmentId: segmentId ? String(segmentId) : undefined,
      useCaseIds: Array.isArray(useCaseIds) ? useCaseIds.map(String) : undefined,
      businessRuleIds: Array.isArray(businessRuleIds)
        ? businessRuleIds.map(String)
        : undefined,
      skillIds: Array.isArray(skillIds) ? skillIds.map(String) : undefined,
    };

    const id = await createContent(input);

    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ContentStatusError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Content create API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
