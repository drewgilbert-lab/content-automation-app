import Anthropic from "@anthropic-ai/sdk";
import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type {
  SkillListItem,
  SkillDetail,
  SkillCreateInput,
  SkillUpdateInput,
  SkillKnowledgeLink,
} from "./skill-types";

export type {
  SkillListItem,
  SkillDetail,
  SkillCreateInput,
  SkillUpdateInput,
  SkillKnowledgeLink,
};
export {
  CONTENT_TYPES,
  SKILL_CATEGORIES,
  getContentTypeLabel,
  isValidContentType,
  getCategoryLabel,
} from "./skill-types";

const COLLECTION = "Skill";

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function parseSkillKnowledgeLinks(val: unknown): SkillKnowledgeLink[] | undefined {
  if (!val) return undefined;
  try {
    const parsed = JSON.parse(String(val));
    if (Array.isArray(parsed)) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

export class SkillNameConflictError extends Error {
  constructor(name: string) {
    super(`A skill named "${name}" already exists`);
    this.name = "SkillNameConflictError";
  }
}

export async function listSkills(filters?: {
  contentType?: string;
  active?: boolean;
  category?: string;
}): Promise<SkillListItem[]> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 1000 });

    let items: SkillListItem[] = result.objects.map((obj) => ({
      id: obj.uuid,
      name: String(obj.properties.name ?? ""),
      description: String(obj.properties.description ?? ""),
      active: obj.properties.active === true,
      contentType: (obj.properties.contentType as string[]) ?? [],
      category: String(obj.properties.category ?? ""),
      tags: (obj.properties.tags as string[]) ?? [],
      version: String(obj.properties.version ?? "1.0.0"),
      deprecated: obj.properties.deprecated === true,
      createdAt: dateToString(obj.properties.createdAt),
      updatedAt: dateToString(obj.properties.updatedAt),
    }));

    if (filters?.active !== undefined) {
      items = items.filter((s) => s.active === filters.active);
    }
    if (filters?.contentType) {
      const ct = filters.contentType;
      items = items.filter((s) => s.contentType.includes(ct));
    }
    if (filters?.category) {
      const cat = filters.category;
      items = items.filter((s) => s.category === cat);
    }

    items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return items;
  });
}

export async function getSkill(id: string): Promise<SkillDetail | null> {
  return withWeaviate(async (client) => {
    try {
      const collection = client.collections.use(COLLECTION);
      const obj = await collection.query.fetchObjectById(id);

      if (!obj) return null;

      const usageCount = await countSkillUsage(client, id);

      return {
        id: obj.uuid,
        name: String(obj.properties.name ?? ""),
        description: String(obj.properties.description ?? ""),
        content: String(obj.properties.content ?? ""),
        active: obj.properties.active === true,
        contentType: (obj.properties.contentType as string[]) ?? [],
        triggerConditions: obj.properties.triggerConditions
          ? String(obj.properties.triggerConditions)
          : undefined,
        parameters: obj.properties.parameters
          ? String(obj.properties.parameters)
          : undefined,
        outputFormat: obj.properties.outputFormat
          ? String(obj.properties.outputFormat)
          : undefined,
        version: String(obj.properties.version ?? "1.0.0"),
        previousVersionId: obj.properties.previousVersionId
          ? String(obj.properties.previousVersionId)
          : undefined,
        tags: (obj.properties.tags as string[]) ?? [],
        category: String(obj.properties.category ?? ""),
        author: String(obj.properties.author ?? ""),
        updatedBy: String(obj.properties.updatedBy ?? ""),
        sourceFile: obj.properties.sourceFile
          ? String(obj.properties.sourceFile)
          : undefined,
        sourceKnowledgeObjects: parseSkillKnowledgeLinks(obj.properties.sourceKnowledgeObjects),
        deprecated: obj.properties.deprecated === true,
        createdAt: dateToString(obj.properties.createdAt),
        updatedAt: dateToString(obj.properties.updatedAt),
        usageCount,
      };
    } catch {
      return null;
    }
  });
}

async function countSkillUsage(
  client: ReturnType<typeof weaviate.connectToWeaviateCloud> extends Promise<infer C> ? C : never,
  skillId: string
): Promise<number> {
  try {
    const gc = client.collections.use("GeneratedContent");
    const result = await gc.query.fetchObjects({
      filters: weaviate.filter.byRef("usedSkills").byId().equal(skillId),
      limit: 100,
    });
    return result.objects.length;
  } catch {
    return 0;
  }
}

export async function createSkill(input: SkillCreateInput): Promise<string> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);

    const existing = await collection.query.fetchObjects({
      filters: weaviate.filter.byProperty("name").equal(input.name),
      limit: 1,
    });

    if (existing.objects.length > 0) {
      throw new SkillNameConflictError(input.name);
    }

    const now = new Date().toISOString();
    const properties: Record<string, string | string[] | boolean> = {
      name: input.name,
      description: input.description,
      content: input.content,
      active: input.active ?? true,
      contentType: input.contentType,
      version: "1.0.0",
      tags: input.tags ?? [],
      category: input.category ?? "",
      author: input.author ?? "",
      updatedBy: "",
      deprecated: false,
      createdAt: now,
      updatedAt: now,
    };

    if (input.triggerConditions) properties.triggerConditions = input.triggerConditions;
    if (input.parameters) properties.parameters = input.parameters;
    if (input.outputFormat) properties.outputFormat = input.outputFormat;
    if (input.sourceKnowledgeObjects) {
      properties.sourceKnowledgeObjects = JSON.stringify(input.sourceKnowledgeObjects);
    }

    return await collection.data.insert(properties);
  });
}

export async function updateSkill(
  id: string,
  input: SkillUpdateInput
): Promise<SkillDetail | null> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);

    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return null;

    if (input.name) {
      const existing = await collection.query.fetchObjects({
        filters: weaviate.filter.byProperty("name").equal(input.name),
        limit: 1,
      });
      if (existing.objects.length > 0 && existing.objects[0].uuid !== id) {
        throw new SkillNameConflictError(input.name);
      }
    }

    const properties: Record<string, string | string[] | boolean> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) properties.name = input.name;
    if (input.description !== undefined) properties.description = input.description;
    if (input.content !== undefined) properties.content = input.content;
    if (input.contentType !== undefined) properties.contentType = input.contentType;
    if (input.active !== undefined) properties.active = input.active;
    if (input.triggerConditions !== undefined) properties.triggerConditions = input.triggerConditions;
    if (input.parameters !== undefined) properties.parameters = input.parameters;
    if (input.outputFormat !== undefined) properties.outputFormat = input.outputFormat;
    if (input.version !== undefined) properties.version = input.version;
    if (input.tags !== undefined) properties.tags = input.tags;
    if (input.category !== undefined) properties.category = input.category;
    if (input.author !== undefined) properties.author = input.author;
    if (input.updatedBy !== undefined) properties.updatedBy = input.updatedBy;
    if (input.sourceKnowledgeObjects !== undefined) {
      properties.sourceKnowledgeObjects = JSON.stringify(input.sourceKnowledgeObjects);
    }

    await collection.data.update({ id, properties });

    return null;
  });
}

export async function checkSkillReferences(id: string): Promise<number> {
  return withWeaviate(async (client) => {
    try {
      const gc = client.collections.use("GeneratedContent");
      const result = await gc.query.fetchObjects({
        filters: weaviate.filter.byRef("usedSkills").byId().equal(id),
        limit: 100,
      });
      return result.objects.length;
    } catch {
      return 0;
    }
  });
}

export async function deleteSkill(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.deleteById(id);
    return true;
  });
}

export async function activateSkill(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.update({
      id,
      properties: { active: true, updatedAt: new Date().toISOString() },
    });
    return true;
  });
}

export async function deactivateSkill(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.update({
      id,
      properties: { active: false, updatedAt: new Date().toISOString() },
    });
    return true;
  });
}

export async function deprecateSkill(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.update({
      id,
      properties: { deprecated: true, updatedAt: new Date().toISOString() },
    });
    return true;
  });
}

export async function restoreSkill(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.update({
      id,
      properties: { deprecated: false, updatedAt: new Date().toISOString() },
    });
    return true;
  });
}

export async function triggerSkillRefreshCheck(
  objectId: string,
  objectName: string,
  oldContent: string,
  newContent: string
): Promise<void> {
  try {
    const allSkills = await listSkills({ active: true });

    for (const skillItem of allSkills) {
      const skill = await getSkill(skillItem.id);
      if (!skill?.sourceKnowledgeObjects) continue;

      const link = skill.sourceKnowledgeObjects.find((l) => l.id === objectId);
      if (!link) continue;

      const { createSubmission, listSubmissions } = await import("./submissions");

      const existing = await listSubmissions({ status: "pending" as const });
      const hasPending = existing.some(
        (s) =>
          s.objectType === "skill" &&
          s.sourceChannel === "system" &&
          (s.status === "pending" || s.status === "deferred") &&
          s.objectName === skill.name
      );
      if (hasPending) continue;

      const result = await evaluateSkillRefreshSignificance(
        oldContent,
        newContent,
        skill.content,
        link.integrationPrompt
      );
      if (!result.significant) continue;

      await createSubmission({
        submitter: "system",
        objectType: "skill",
        objectName: skill.name,
        submissionType: "update",
        targetObjectId: skill.id,
        sourceChannel: "system",
        sourceDescription: `Auto-generated: ${objectName} updated`,
        proposedContent: JSON.stringify({
          content: newContent,
          linkedObjectId: objectId,
          linkedObjectName: objectName,
          integrationPrompt: link.integrationPrompt,
        }),
      });
    }
  } catch {
    // fire-and-forget — errors must not propagate
  }
}

const SIGNIFICANCE_SYSTEM_PROMPT = `You evaluate whether a knowledge object change is significant enough to warrant updating a linked skill. Assess whether the changes alter facts, attributes, or context that the integration prompt indicates the skill depends on. Respond with ONLY a JSON object: { "significant": boolean, "reason": string }.`;

export async function evaluateSkillRefreshSignificance(
  oldContent: string,
  newContent: string,
  skillContent: string,
  integrationPrompt: string
): Promise<{ significant: boolean; reason: string }> {
  const failed = (detail: string) => ({
    significant: false as const,
    reason: `Evaluation failed: ${detail}`,
  });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return failed("Missing ANTHROPIC_API_KEY environment variable.");
    }

    const client = new Anthropic({ apiKey });
    const userMessage = [
      "## Old knowledge content",
      oldContent,
      "",
      "## New knowledge content",
      newContent,
      "",
      "## Linked skill content",
      skillContent,
      "",
      "## Integration prompt",
      integrationPrompt,
    ].join("\n");

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 256,
      system: SIGNIFICANCE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return failed("No text response from Claude");
    }

    let cleaned = textBlock.text.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    const parsed: unknown = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return failed("Response is not a JSON object");
    }
    const o = parsed as Record<string, unknown>;
    if (typeof o.significant !== "boolean" || typeof o.reason !== "string") {
      return failed('Expected JSON with boolean "significant" and string "reason"');
    }

    return { significant: o.significant, reason: o.reason };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failed(message);
  }
}
