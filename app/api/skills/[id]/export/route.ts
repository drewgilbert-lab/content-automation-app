import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth-server";
import { getSkill } from "@/lib/skills";
import {
  generateSkillMd,
  generateMetadataJson,
  toKebabCase,
} from "@/lib/skill-package";
import JSZip from "jszip";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const skill = await getSkill(id);

    if (!skill) {
      return new Response(JSON.stringify({ error: "Skill not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const skillMd = generateSkillMd(skill);
    const metadataJson = generateMetadataJson(skill);
    const folderName = toKebabCase(skill.name);

    const zip = new JSZip();
    const folder = zip.folder(folderName)!;
    folder.file("SKILL.md", skillMd);
    folder.file("metadata.json", metadataJson);

    const buffer = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
    });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${folderName}.skill"`,
      },
    });
  } catch (error) {
    console.error("Skill export API error:", error);
    return new Response(JSON.stringify({ error: "Failed to export skill" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
