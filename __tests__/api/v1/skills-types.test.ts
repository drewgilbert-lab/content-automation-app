import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-middleware", () => ({
  withApiAuth: (handler: () => Promise<Response>) => handler,
}));

import { GET } from "@/app/api/v1/skills/types/route";
import { NextRequest } from "next/server";

function makeRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/skills/types", () => {
  it("returns canonical content types and categories", async () => {
    const res = await GET(makeRequest("/api/v1/skills/types", { "X-API-Key": "key" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.contentTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "email" }),
        expect.objectContaining({ type: "content_narrative" }),
        expect.objectContaining({ type: "pillar_research" }),
        expect.objectContaining({ type: "market_content_brief" }),
      ])
    );
    expect(json.data.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "content_generation" }),
      ])
    );
  });
});
