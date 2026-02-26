import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type { KnowledgeDetail } from "./knowledge-types";
import type { SkillDetail } from "./skill-types";
import { listSkills, getSkill } from "./skills";
import { getKnowledgeObject, listKnowledgeObjects } from "./knowledge";

const MAX_SKILLS_PER_GENERATION = 5;
const COMPANY_NAME = "HG Insights";

export type SkillSelectionMode = "automatic" | "manual" | "hybrid";

export interface ContextAssemblyInput {
  contentType: string;
  prompt: string;
  skillSelectionMode?: SkillSelectionMode;
  manualSkillIds?: string[];
  pinnedPersonaId?: string;
  pinnedSegmentId?: string;
  pinnedUseCaseId?: string;
}

export interface AssembledContext {
  systemPrompt: string;
  skills: Array<{ id: string; name: string; version: string }>;
  persona: { id: string; name: string } | null;
  segment: { id: string; name: string } | null;
  useCase: { id: string; name: string } | null;
  businessRules: Array<{ id: string; name: string }>;
}

export async function assembleContext(
  input: ContextAssemblyInput
): Promise<AssembledContext> {
  const mode = input.skillSelectionMode ?? "automatic";

  const [selectedSkills, persona, segment, useCase, businessRules] =
    await Promise.all([
      selectSkills(mode, input.contentType, input.manualSkillIds),
      resolvePersona(input.pinnedPersonaId, input.prompt),
      resolveSegment(input.pinnedSegmentId, input.prompt),
      resolveUseCase(input.pinnedUseCaseId, input.prompt),
      resolveBusinessRules(),
    ]);

  const sections: string[] = [];

  sections.push(
    `You are a B2B content writer creating ${formatContentType(input.contentType)} for ${COMPANY_NAME}.`
  );

  if (selectedSkills.length > 0) {
    sections.push("## Active Skills");
    for (const skill of selectedSkills) {
      sections.push(`### Skill: ${skill.name} (v${skill.version})`);
      sections.push(skill.content);
    }
  }

  if (persona) {
    sections.push("## Target Persona");
    sections.push(persona.content);
  }

  if (segment) {
    sections.push("## Target Account Segment");
    sections.push(segment.content);
  }

  if (useCase) {
    sections.push("## Use Case / Topic");
    sections.push(useCase.content);
  }

  if (businessRules.length > 0) {
    sections.push("## Business Rules (Constraints)");
    for (const rule of businessRules) {
      sections.push(`### ${rule.name}`);
      sections.push(rule.content);
    }
  }

  if (selectedSkills.length > 0) {
    sections.push(
      "Follow the Active Skills above to structure and format your output."
    );
    sections.push("Respect all Business Rules for tone and constraints.");
  }
  sections.push(
    "Use the Persona, Segment, and Use Case context to inform your content."
  );

  return {
    systemPrompt: sections.join("\n\n"),
    skills: selectedSkills.map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version,
    })),
    persona: persona ? { id: persona.id, name: persona.name } : null,
    segment: segment ? { id: segment.id, name: segment.name } : null,
    useCase: useCase ? { id: useCase.id, name: useCase.name } : null,
    businessRules: businessRules.map((r) => ({ id: r.id, name: r.name })),
  };
}

async function selectSkills(
  mode: SkillSelectionMode,
  contentType: string,
  manualSkillIds?: string[]
): Promise<SkillDetail[]> {
  const results: SkillDetail[] = [];

  if (mode === "automatic" || mode === "hybrid") {
    const autoSkills = await listSkills({
      contentType,
      active: true,
    });

    const nonDeprecated = autoSkills.filter((s) => !s.deprecated);

    for (const item of nonDeprecated.slice(0, MAX_SKILLS_PER_GENERATION)) {
      const detail = await getSkill(item.id);
      if (detail) results.push(detail);
    }
  }

  if ((mode === "manual" || mode === "hybrid") && manualSkillIds?.length) {
    const existingIds = new Set(results.map((s) => s.id));
    for (const skillId of manualSkillIds) {
      if (existingIds.has(skillId)) continue;
      if (results.length >= MAX_SKILLS_PER_GENERATION) break;
      const skill = await getSkill(skillId);
      if (skill && skill.active && !skill.deprecated) {
        results.push(skill);
        existingIds.add(skill.id);
      }
    }
  }

  return results.slice(0, MAX_SKILLS_PER_GENERATION);
}

async function resolvePersona(
  pinnedId: string | undefined,
  prompt: string
): Promise<KnowledgeDetail | null> {
  if (pinnedId) {
    return getKnowledgeObject(pinnedId);
  }
  return semanticSearchFirst("Persona", prompt);
}

async function resolveSegment(
  pinnedId: string | undefined,
  prompt: string
): Promise<KnowledgeDetail | null> {
  if (pinnedId) {
    return getKnowledgeObject(pinnedId);
  }
  return semanticSearchFirst("Segment", prompt);
}

async function resolveUseCase(
  pinnedId: string | undefined,
  prompt: string
): Promise<KnowledgeDetail | null> {
  if (pinnedId) {
    return getKnowledgeObject(pinnedId);
  }
  return semanticSearchFirst("UseCase", prompt);
}

async function resolveBusinessRules(): Promise<KnowledgeDetail[]> {
  const rules = await listKnowledgeObjects("business_rule");
  const active = rules.filter((r) => !r.deprecated);
  const details: KnowledgeDetail[] = [];
  for (const rule of active) {
    const detail = await getKnowledgeObject(rule.id);
    if (detail && detail.subType !== "instruction_template") {
      details.push(detail);
    }
  }
  return details;
}

async function semanticSearchFirst(
  collectionName: string,
  query: string
): Promise<KnowledgeDetail | null> {
  return withWeaviate(async (client) => {
    try {
      const collection = client.collections.use(collectionName);
      const result = await collection.query.nearText(query, {
        limit: 1,
        returnProperties: ["name"],
      });
      if (result.objects.length === 0) return null;
      const topId = result.objects[0].uuid;
      return getKnowledgeObject(topId);
    } catch {
      return null;
    }
  });
}

function formatContentType(ct: string): string {
  const labels: Record<string, string> = {
    email: "an email",
    blog: "a blog post",
    social: "a social post",
    thought_leadership: "a thought leadership piece",
    internal_doc: "an internal document",
  };
  return labels[ct] || ct;
}
