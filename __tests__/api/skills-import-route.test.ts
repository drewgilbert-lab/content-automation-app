import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));

import { POST } from "@/app/api/skills/import/route";
import { requireRole } from "@/lib/auth-server";
import JSZip from "jszip";

const mockedRequireRole = vi.mocked(requireRole);

const mockUser = { email: "test@test.com", role: "admin", active: true };

const validSkillMd = [
  "---",
  "name: test-skill",
  "description: A test skill for import",
  "---",
  "",
  "# Test Skill",
  "",
  "Follow these instructions to generate content.",
].join("\n");

function makeFormDataRequest(file: Blob, filename: string): Request {
  const formData = new FormData();
  formData.append("file", file, filename);
  return new Request("http://localhost/api/skills/import", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/skills/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedRequireRole.mockResolvedValue(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const req = makeFormDataRequest(
      new Blob([validSkillMd], { type: "text/markdown" }),
      "SKILL.md",
    );
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);

    const formData = new FormData();
    const req = new Request("http://localhost/api/skills/import", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("No file");
  });

  it("returns parsed skill data for valid SKILL.md upload", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);

    const req = makeFormDataRequest(
      new Blob([validSkillMd], { type: "text/markdown" }),
      "SKILL.md",
    );
    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skill).toBeDefined();
    expect(json.skill.name).toBe("test-skill");
    expect(json.skill.description).toBe("A test skill for import");
    expect(json.skill.content).toContain("# Test Skill");
    expect(json.validation.valid).toBe(true);
  });

  it("returns 400 for SKILL.md missing frontmatter", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);

    const badMd = "# No Frontmatter\n\nJust body content.";
    const req = makeFormDataRequest(
      new Blob([badMd], { type: "text/markdown" }),
      "SKILL.md",
    );
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns parsed skill data for valid .skill zip upload", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);

    const zip = new JSZip();
    const folder = zip.folder("test-skill")!;
    folder.file("SKILL.md", validSkillMd);
    folder.file(
      "metadata.json",
      JSON.stringify({
        contentType: ["email"],
        category: "content_generation",
        tags: ["imported"],
      }),
    );
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    const req = makeFormDataRequest(
      new Blob([buffer], { type: "application/zip" }),
      "test-skill.skill",
    );
    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skill).toBeDefined();
    expect(json.skill.name).toBe("test-skill");
    expect(json.skill.contentType).toEqual(["email"]);
    expect(json.skill.category).toBe("content_generation");
    expect(json.skill.tags).toEqual(["imported"]);
    expect(json.validation.valid).toBe(true);
  });

  it("returns 400 for zip without SKILL.md", async () => {
    mockedRequireRole.mockResolvedValue(mockUser as any);

    const zip = new JSZip();
    zip.file("readme.txt", "No skill here");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    const req = makeFormDataRequest(
      new Blob([buffer], { type: "application/zip" }),
      "bad-package.zip",
    );
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("SKILL.md");
  });
});
