export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSkill } from "@/lib/skills";
import { withWeaviate } from "@/lib/weaviate";

const KNOWLEDGE_COLLECTIONS = [
  "Persona",
  "Segment",
  "UseCase",
  "BusinessRule",
  "ICP",
  "Competitor",
  "CustomerEvidence",
] as const;

const COLLECTION_TO_TYPE: Record<string, string> = {
  Persona: "persona",
  Segment: "segment",
  UseCase: "use_case",
  BusinessRule: "business_rule",
  ICP: "icp",
  Competitor: "competitor",
  CustomerEvidence: "customer_evidence",
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skill = await getSkill(id);

    if (!skill) {
      return Response.json({ error: "Skill not found" }, { status: 404 });
    }

    const searchText = `${skill.name} ${skill.description} ${skill.content}`.slice(0, 2000);
    const existingIds = new Set(
      (skill.sourceKnowledgeObjects ?? []).map((l) => l.id)
    );

    const suggestions = await withWeaviate(async (client) => {
      const results: Array<{
        id: string;
        name: string;
        type: string;
        collection: string;
        score: number;
      }> = [];

      for (const collectionName of KNOWLEDGE_COLLECTIONS) {
        try {
          const collection = client.collections.use(collectionName);
          const result = await collection.query.nearText(searchText, {
            limit: 5,
            returnMetadata: ["distance"],
          });

          for (const obj of result.objects) {
            if (existingIds.has(obj.uuid)) continue;
            const distance = obj.metadata?.distance ?? 1;
            const score = Math.max(0, 1 - distance);
            results.push({
              id: obj.uuid,
              name: String(obj.properties.name ?? ""),
              type: COLLECTION_TO_TYPE[collectionName] ?? collectionName.toLowerCase(),
              collection: COLLECTION_TO_TYPE[collectionName] ?? collectionName.toLowerCase(),
              score: Math.round(score * 1000) / 1000,
            });
          }
        } catch {
          // skip collections that fail
        }
      }

      results.sort((a, b) => b.score - a.score);
      return results.slice(0, 15);
    });

    return Response.json({ suggestions });
  } catch (error) {
    console.error("Suggest links error:", error);
    return Response.json(
      { error: "Failed to suggest links" },
      { status: 500 }
    );
  }
}
