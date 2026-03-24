import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/lib/skills", () => ({
  getSkill: vi.fn(),
}));
vi.mock("@/lib/context-assembly", () => ({
  assembleContext: vi.fn(),
}));
vi.mock("@/lib/claude", () => ({
  streamMessage: vi.fn(),
}));
vi.mock("@/lib/skill-types", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as Record<string, unknown>) };
});

import { POST } from "@/app/api/skills/[id]/test/route";
import { requireRole } from "@/lib/auth-server";
import { getSkill } from "@/lib/skills";
import { assembleContext } from "@/lib/context-assembly";
import { streamMessage } from "@/lib/claude";
import type { SkillDetail } from "@/lib/skill-types";

const mockedRequireRole = vi.mocked(requireRole);
const mockedGetSkill = vi.mocked(getSkill);
const mockedAssembleContext = vi.mocked(assembleContext);
const mockedStreamMessage = vi.mocked(streamMessage);

const mockUser = { email: "test@test.com", role: "admin", active: true };

function mockSkill(overrides: Partial<SkillDetail> = {}): SkillDetail {
  return {
    id: "test-id",
    name: "Test Skill",
    description: "A test skill",
    content: "# Instructions\n\nGenerate content.",
    active: true,
    contentType: ["email"],
    category: "content_generation",
    tags: ["test"],
    version: "1.0.0",
    author: "tester",
    deprecated: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    usageCount: 0,
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/skills/test-id/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const routeParams = { params: Promise.resolve({ id: "test-id" }) };

describe("POST /api/skills/[id]/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedRequireRole.mockResolvedValue(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const res = await POST(
      makeRequest({ contentType: "email", prompt: "test" }) as any,
      routeParams,
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when skill not found", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ contentType: "email", prompt: "test" }) as any,
      routeParams,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found");
  });

  it("returns 400 when contentType is missing", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());

    const res = await POST(
      makeRequest({ prompt: "test" }) as any,
      routeParams,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("contentType");
  });

  it("returns 400 when contentType is invalid", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());

    const res = await POST(
      makeRequest({ contentType: "invalid_type", prompt: "test" }) as any,
      routeParams,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when prompt is missing", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());

    const res = await POST(
      makeRequest({ contentType: "email" }) as any,
      routeParams,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("prompt");
  });

  it("returns 400 when prompt is empty string", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());

    const res = await POST(
      makeRequest({ contentType: "email", prompt: "   " }) as any,
      routeParams,
    );
    expect(res.status).toBe(400);
  });

  it("calls assembleContext and returns streaming response on success", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());

    const assembledResult = {
      systemPrompt: "You are a helpful assistant.",
      skills: [],
      persona: null,
      segment: null,
      useCase: null,
      businessRules: [],
    };
    mockedAssembleContext.mockResolvedValue(assembledResult);

    const testStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("Hello"));
        controller.close();
      },
    });
    mockedStreamMessage.mockResolvedValue(testStream);

    const res = await POST(
      makeRequest({ contentType: "email", prompt: "Write a campaign brief" }) as any,
      routeParams,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");

    const systemPromptHeader = res.headers.get("X-System-Prompt");
    expect(systemPromptHeader).toBeTruthy();
    const decoded = Buffer.from(systemPromptHeader!, "base64").toString("utf-8");
    expect(decoded).toBe("You are a helpful assistant.");

    expect(mockedAssembleContext).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "email",
        prompt: "Write a campaign brief",
        skillSelectionMode: "manual",
        manualSkillIds: ["test-id"],
      }),
    );
    expect(mockedStreamMessage).toHaveBeenCalledWith(
      "You are a helpful assistant.",
      "Write a campaign brief",
    );
  });

  it("passes empty manualSkillIds when withoutSkill is true", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);
    mockedGetSkill.mockResolvedValue(mockSkill());
    mockedAssembleContext.mockResolvedValue({
      systemPrompt: "prompt",
      skills: [],
      persona: null,
      segment: null,
      useCase: null,
      businessRules: [],
    });
    mockedStreamMessage.mockResolvedValue(new ReadableStream());

    await POST(
      makeRequest({
        contentType: "email",
        prompt: "test",
        withoutSkill: true,
      }) as any,
      routeParams,
    );

    expect(mockedAssembleContext).toHaveBeenCalledWith(
      expect.objectContaining({ manualSkillIds: [] }),
    );
  });
});
