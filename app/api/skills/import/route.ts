import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth-server";
import {
  parseSkillMd,
  packageToSkillInput,
  validateSkillPackage,
} from "@/lib/skill-package";
import type {
  SkillPackage,
  SkillPackageMetadata,
} from "@/lib/skill-package-types";
import JSZip from "jszip";

export const runtime = "nodejs";

function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".skill") ||
    name.endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

async function findFileInZip(
  zip: JSZip,
  filename: string,
): Promise<string | null> {
  const match = Object.keys(zip.files).find(
    (path) => path === filename || path.endsWith(`/${filename}`),
  );
  if (!match) return null;
  return zip.files[match].async("string");
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let pkg: SkillPackage;

    if (isZipFile(file)) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const zip = await JSZip.loadAsync(buffer);

      const skillMdContent = await findFileInZip(zip, "SKILL.md");
      if (!skillMdContent) {
        return new Response(
          JSON.stringify({ error: "No SKILL.md found in archive" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const { frontmatter, body } = parseSkillMd(skillMdContent);

      let metadata: SkillPackageMetadata | undefined;
      const metadataContent = await findFileInZip(zip, "metadata.json");
      if (metadataContent) {
        metadata = JSON.parse(metadataContent) as SkillPackageMetadata;
      }

      pkg = { frontmatter, body, ...(metadata ? { metadata } : {}) };
    } else {
      const text = await file.text();
      const { frontmatter, body } = parseSkillMd(text);
      pkg = { frontmatter, body };
    }

    const validation = validateSkillPackage(pkg);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid skill package", details: validation.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const skillInput = packageToSkillInput(pkg);

    return Response.json({
      skill: skillInput,
      validation: { valid: true, warnings: validation.warnings },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse skill file";
    console.error("Skill import API error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
