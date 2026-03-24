import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/lib/skills", () => ({
  getSkill: vi.fn(),
}));

import { GET } from "@/app/api/skills/[id]/export/route";
import { requireRole } from "@/lib/auth-server";
import { getSkill } from "@/lib/skills";
import type { SkillDetail } from "@/lib/skill-types";

const mockedRequireRole = vi.mocked(requireRole);
const mockedGetSkill = vi.mocked(getSkill);

const mockUser = { email: "test@test.com", role: "admin", active: true };

function mockSkill(overrides: Partial<SkillDetail> = {}): SkillDetail {
  return {
    id: "sk-export",
    name: "Export Test Skill",
    description: "Skill used for export testing",
    content: "# Export Skill\n\nInstructions for export.",
    active: true,
    contentType: ["blog"],
    category: "content_generation",
    tags: ["export"],
    version: "1.2.0",
    author: "tester",
    deprecated: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    usageCount: 3,
    ...overrides,
  };
}

const routeParams = { params: Promise.resolve({ id: "sk-export" }) };

describe("GET /api/skills/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedRequireRole.mockResolvedValue(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const req = new Request("http://localhost/api/skills/sk-export/export");
    const res = await GET(req as any, routeParams);
    expect(res.status).toBe(401);
  });

  it("returns 404 when skill not found", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(null);

    const req = new Request("http://localhost/api/skills/sk-export/export");
    const res = await GET(req as any, routeParams);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found");
  });

  it("returns a zip file with correct headers", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());

    const req = new Request("http://localhost/api/skills/sk-export/export");
    const res = await GET(req as any, routeParams);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toContain(".skill");
    expect(res.headers.get("Content-Disposition")).toContain("export-test-skill");
  });

  it("returns non-empty response body", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());

    const req = new Request("http://localhost/api/skills/sk-export/export");
    const res = await GET(req as any, routeParams);

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
