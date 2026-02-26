import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type {
  SkillListItem,
  SkillDetail,
  SkillCreateInput,
  SkillUpdateInput,
} from "./skill-types";

export type {
  SkillListItem,
  SkillDetail,
  SkillCreateInput,
  SkillUpdateInput,
};
export {
  CONTENT_TYPES,
  SKILL_CATEGORIES,
  getContentTypeLabel,
  getCategoryLabel,
} from "./skill-types";

const COLLECTION = "Skill";

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
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
        sourceFile: obj.properties.sourceFile
          ? String(obj.properties.sourceFile)
          : undefined,
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
      deprecated: false,
      createdAt: now,
      updatedAt: now,
    };

    if (input.triggerConditions) properties.triggerConditions = input.triggerConditions;
    if (input.parameters) properties.parameters = input.parameters;
    if (input.outputFormat) properties.outputFormat = input.outputFormat;

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
